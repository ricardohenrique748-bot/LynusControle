// Supabase Edge Function: license-check
// Public endpoint called by the customer systems (web and Android) at login and periodically.
// Answers whether the installation may run normally, with a warning, read-only, or blocked,
// and returns a signed lease the client can rely on while offline.
//
// POST { license_key, system_code, fingerprint, app_version? }
// 200  { stage, reason, message, days_overdue, next_stage_at, offline_until, lease }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { adminClient, corsHeaders, handleError, HttpError, json } from '../_shared/security.ts';
import { evaluateAccess, blockedMessage, AccessDecision, AccessReason } from '../_shared/access-policy.ts';
import { signLease, LeasePayload } from '../_shared/lease-token.ts';
import { validateLicenseKeyChecksum } from '../_shared/license-key.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

function isValidText(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const privateJwkRaw = Deno.env.get('LICENSE_SIGNING_PRIVATE_KEY');
    if (!privateJwkRaw) throw new HttpError(500, 'Secret LICENSE_SIGNING_PRIVATE_KEY não configurado');
    const privateJwk = JSON.parse(privateJwkRaw) as JsonWebKey;

    const body = await req.json().catch(() => ({}));
    const { license_key, system_code, fingerprint, app_version } = body as Record<string, unknown>;
    if (!isValidText(license_key, 64) || !isValidText(system_code, 32) || !isValidText(fingerprint, 128)) {
      throw new HttpError(400, 'Parâmetros inválidos');
    }
    const key = license_key.trim().toUpperCase();
    const now = new Date();

    const respond = async (decision: AccessDecision, offlineDays: number) => {
      // Offline validity never outlives the next stage change, so offline clients re-check in time
      let offlineUntil = new Date(now.getTime() + offlineDays * DAY_MS);
      if (decision.next_stage_at && new Date(decision.next_stage_at) < offlineUntil) {
        offlineUntil = new Date(decision.next_stage_at);
      }
      const payload: LeasePayload = {
        v: 1,
        key,
        sys: system_code,
        fp: fingerprint,
        stage: decision.stage,
        reason: decision.reason,
        msg: decision.message,
        days: decision.days_overdue,
        next: decision.next_stage_at,
        iat: now.toISOString(),
        exp: offlineUntil.toISOString(),
      };
      return json({
        stage: decision.stage,
        reason: decision.reason,
        message: decision.message,
        days_overdue: decision.days_overdue,
        next_stage_at: decision.next_stage_at,
        offline_until: payload.exp,
        lease: await signLease(payload, privateJwk),
      });
    };
    const reject = (reason: AccessReason) =>
      respond({ stage: 'blocked', reason, days_overdue: 0, next_stage_at: null, message: blockedMessage(reason) }, 1);

    // Cheap rejection of malformed keys before touching the database
    if (!validateLicenseKeyChecksum(key)) return reject('invalid_license');

    const supabase = adminClient();
    const { data: license } = await supabase
      .from('licenses')
      .select(
        'id, status, expires_at, contract_id, max_instances, hardware_fingerprints, offline_lease_days, systems(code), contracts(grace_period_days, block_after_days)'
      )
      .eq('license_key', key)
      .maybeSingle();

    if (!license) return reject('invalid_license');
    // deno-lint-ignore no-explicit-any
    const lic = license as any;
    if (lic.systems?.code !== system_code) return reject('wrong_system');

    // Bind this installation, respecting the instance limit
    const fingerprints: string[] = Array.isArray(lic.hardware_fingerprints) ? lic.hardware_fingerprints : [];
    const update: Record<string, unknown> = { last_heartbeat_at: now.toISOString() };
    if (!fingerprints.includes(fingerprint)) {
      if (fingerprints.length >= lic.max_instances) return reject('instance_limit');
      update.hardware_fingerprints = [...fingerprints, fingerprint];
      update.active_instances = fingerprints.length + 1;
    }
    await supabase.from('licenses').update(update).eq('id', lic.id);

    const { data: unpaid } = await supabase
      .from('invoices')
      .select('due_date')
      .eq('contract_id', lic.contract_id)
      .in('status', ['pending', 'overdue'])
      .lt('due_date', now.toISOString().slice(0, 10))
      .order('due_date', { ascending: true })
      .limit(1);

    const decision = evaluateAccess(
      {
        license_status: lic.status,
        expires_at: lic.expires_at,
        oldest_unpaid_due_date: unpaid?.[0]?.due_date ?? null,
        policy: {
          read_only_after_days: lic.contracts?.grace_period_days ?? undefined,
          block_after_days: lic.contracts?.block_after_days ?? undefined,
        },
      },
      now
    );

    if (app_version !== undefined && !isValidText(app_version, 32)) throw new HttpError(400, 'app_version inválido');
    return respond(decision, decision.stage === 'blocked' ? 1 : lic.offline_lease_days ?? 15);
  } catch (error) {
    return handleError(error);
  }
});
