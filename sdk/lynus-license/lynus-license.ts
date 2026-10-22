/**
 * Lynus License Client — copy this file into each customer system (web or React Native/Expo).
 * No dependencies: uses fetch + Web Crypto (browsers, Node 20+, Deno; RN needs a crypto.subtle polyfill).
 *
 * Asks Lynus Control (`license-check`) whether this installation may run and keeps the last
 * signed answer, so the system keeps working offline until the lease expires.
 */

export type AccessStage = 'active' | 'warning' | 'read_only' | 'blocked';

export interface LicenseState {
  stage: AccessStage;
  reason: string; // ok | overdue | suspended | revoked | expired | invalid_license | wrong_system | instance_limit | offline_expired
  message: string;
  daysOverdue: number;
  nextStageAt: string | null;
  offlineUntil: string | null;
  /** online = fresh answer from Lynus Control; cache = last signed answer (offline) */
  source: 'online' | 'cache';
  checkedAt: string;
  /** false when the system must not create/edit data (read-only or blocked) */
  canWrite: boolean;
}

export interface LicenseClientOptions {
  /** https://<PROJECT_REF>.supabase.co/functions/v1/license-check */
  endpoint: string;
  licenseKey: string;
  /** Code of the system registered in Lynus Control, e.g. "LYN-FROTA" */
  systemCode: string;
  /** Public JWK printed by scripts/generate-license-keys.mjs */
  publicKey: JsonWebKey;
  appVersion?: string;
  /** Defaults to localStorage (browser). Pass AsyncStorage-like adapter on mobile. */
  storage?: LicenseStorage;
  /** Extra request headers (e.g. { apikey: '<anon key>' } if the function keeps JWT verification on) */
  headers?: Record<string, string>;
  timeoutMs?: number;
  fetch?: typeof fetch;
  now?: () => Date;
}

export interface LicenseStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
}

interface LeasePayload {
  v: 1;
  key: string;
  sys: string;
  fp: string;
  stage: AccessStage;
  reason: string;
  msg: string;
  days: number;
  next: string | null;
  iat: string;
  exp: string;
}

function fromB64Url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function memoryStorage(): LicenseStorage {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

function defaultStorage(): LicenseStorage {
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__lynus_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return localStorage;
    }
  } catch {
    // private mode / blocked storage
  }
  return memoryStorage();
}

const OFFLINE_EXPIRED_MESSAGE =
  'Não foi possível validar a licença há muito tempo. Conecte-se à internet para continuar.';

export function createLicenseClient(options: LicenseClientOptions) {
  const storage = options.storage ?? defaultStorage();
  const doFetch = options.fetch ?? fetch.bind(globalThis);
  const now = options.now ?? (() => new Date());
  const keyPrefix = `lynus_license:${options.systemCode}`;
  const licenseKey = options.licenseKey.trim().toUpperCase();
  let publicKeyPromise: Promise<CryptoKey> | null = null;

  const publicKey = () =>
    (publicKeyPromise ??= crypto.subtle.importKey(
      'jwk',
      { kty: options.publicKey.kty, crv: options.publicKey.crv, x: options.publicKey.x, y: options.publicKey.y },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    ));

  /** Stable id of this installation (one per browser / device) */
  async function getFingerprint(): Promise<string> {
    const k = `${keyPrefix}:fp`;
    const existing = await storage.getItem(k);
    if (existing) return existing;
    const fp = crypto.randomUUID();
    await storage.setItem(k, fp);
    return fp;
  }

  /** Returns the payload only if the signature is valid and the lease belongs to this installation */
  async function verifyLease(lease: string, fp: string): Promise<LeasePayload | null> {
    const [body, sig] = lease.split('.');
    if (!body || !sig) return null;
    try {
      const ok = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        await publicKey(),
        fromB64Url(sig),
        new TextEncoder().encode(body)
      );
      if (!ok) return null;
      const payload = JSON.parse(new TextDecoder().decode(fromB64Url(body))) as LeasePayload;
      if (payload.v !== 1 || payload.key !== licenseKey || payload.sys !== options.systemCode || payload.fp !== fp) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  function toState(p: LeasePayload, source: LicenseState['source']): LicenseState {
    return {
      stage: p.stage,
      reason: p.reason,
      message: p.msg,
      daysOverdue: p.days,
      nextStageAt: p.next,
      offlineUntil: p.exp,
      source,
      checkedAt: p.iat,
      canWrite: p.stage === 'active' || p.stage === 'warning',
    };
  }

  /** Last signed answer, if still within its offline validity */
  async function fromCache(fp: string): Promise<LicenseState> {
    const lease = await storage.getItem(`${keyPrefix}:lease`);
    const payload = lease ? await verifyLease(lease, fp) : null;
    if (payload && now().getTime() <= new Date(payload.exp).getTime()) {
      return toState(payload, 'cache');
    }
    return {
      stage: 'blocked',
      reason: 'offline_expired',
      message: OFFLINE_EXPIRED_MESSAGE,
      daysOverdue: payload?.days ?? 0,
      nextStageAt: null,
      offlineUntil: payload?.exp ?? null,
      source: 'cache',
      checkedAt: payload?.iat ?? now().toISOString(),
      canWrite: false,
    };
  }

  /** Asks Lynus Control; falls back to the cached lease when offline or the server is unreachable */
  async function check(): Promise<LicenseState> {
    const fp = await getFingerprint();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
    try {
      const res = await doFetch(options.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        body: JSON.stringify({
          license_key: licenseKey,
          system_code: options.systemCode,
          fingerprint: fp,
          app_version: options.appVersion,
        }),
        signal: controller.signal,
      });
      if (!res.ok) return fromCache(fp);
      const data = (await res.json()) as { lease?: string };
      const payload = data.lease ? await verifyLease(data.lease, fp) : null;
      if (!payload) return fromCache(fp);
      await storage.setItem(`${keyPrefix}:lease`, data.lease!);
      return toState(payload, 'online');
    } catch {
      return fromCache(fp);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Checks now and then every `intervalMs` (default 30 min), plus when the app regains
   * connectivity or focus. Returns a function that stops watching.
   */
  function watch(onChange: (state: LicenseState) => void, intervalMs = 30 * 60 * 1000) {
    let stopped = false;
    let last = '';
    const run = async () => {
      const state = await check();
      const signature = `${state.stage}|${state.reason}|${state.message}|${state.source}`;
      if (!stopped && signature !== last) {
        last = signature;
        onChange(state);
      }
    };
    run();
    const id = setInterval(run, intervalMs);
    const onWake = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') run();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onWake);
      document.addEventListener('visibilitychange', onWake);
    }
    return () => {
      stopped = true;
      clearInterval(id);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onWake);
        document.removeEventListener('visibilitychange', onWake);
      }
    };
  }

  return { check, watch, getFingerprint };
}

export type LicenseClient = ReturnType<typeof createLicenseClient>;
