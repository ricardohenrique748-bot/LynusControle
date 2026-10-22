// Request authentication helpers shared by the Edge Functions.
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-signature',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
}

/** Constant-time string comparison */
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

function requiredSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(500, `Secret ${name} não configurado`);
  return value;
}

/** Scheduled jobs (pg_cron / external scheduler) must send the shared CRON_SECRET */
export function requireCronSecret(req: Request) {
  const expected = requiredSecret('CRON_SECRET');
  const given = req.headers.get('x-cron-secret') ?? '';
  if (!safeEqual(given, expected)) throw new HttpError(401, 'Não autorizado');
}

type Role = 'admin' | 'finance' | 'fiscal' | 'support';

/** Panel calls: valid Supabase user session whose profile has one of the given roles */
export async function requireStaff(req: Request, supabase: SupabaseClient, roles: Role[]) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Não autenticado');

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData.user) throw new HttpError(401, 'Sessão inválida');

  const { data: profile } = await supabase.from('profiles').select('role, full_name, email').eq('id', userData.user.id).single();
  if (!profile || !roles.includes(profile.role)) throw new HttpError(403, 'Permissão insuficiente');

  return { id: userData.user.id, role: profile.role as Role, name: profile.full_name as string, email: profile.email as string };
}

/** Payment provider callbacks: hex HMAC-SHA256 of the raw body with PAYMENT_WEBHOOK_SECRET */
export async function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = requiredSecret('PAYMENT_WEBHOOK_SECRET');
  if (!signature) throw new HttpError(401, 'Assinatura ausente');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  const expected = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
  if (!safeEqual(signature.replace(/^sha256=/, '').toLowerCase(), expected)) {
    throw new HttpError(401, 'Assinatura inválida');
  }
}

export function handleError(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  console.error(error);
  return json({ error: 'Erro interno' }, 500);
}
