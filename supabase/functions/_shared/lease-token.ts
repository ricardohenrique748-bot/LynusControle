/**
 * Signed access lease returned to customer systems by `license-check`.
 * Format: base64url(JSON payload) + "." + base64url(ECDSA P-256 / SHA-256 signature)
 *
 * The private key (JWK) lives only in the Edge Function secret LICENSE_SIGNING_PRIVATE_KEY.
 * Customer systems embed the matching public key and verify the lease (see sdk/lynus-license).
 * Uses only Web Crypto, so it runs on Deno, Node 20+ and browsers.
 */
import type { AccessReason, AccessStage } from './access-policy.ts';

export interface LeasePayload {
  v: 1;
  key: string; // license key
  sys: string; // system code
  fp: string; // installation fingerprint
  stage: AccessStage;
  reason: AccessReason;
  msg: string;
  days: number; // days overdue
  next: string | null; // when the next stage starts
  iat: string; // issued at (ISO)
  exp: string; // offline validity (ISO): after this the client must re-check online
}

const ALG = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;

function toB64Url(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function signLease(payload: LeasePayload, privateJwk: JsonWebKey): Promise<string> {
  const key = await crypto.subtle.importKey('jwk', privateJwk, ALG, false, ['sign']);
  const body = toB64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign(SIGN, key, new TextEncoder().encode(body)));
  return `${body}.${toB64Url(sig)}`;
}

export async function generateSigningKeys(): Promise<{ privateJwk: JsonWebKey; publicJwk: JsonWebKey }> {
  const pair = (await crypto.subtle.generateKey(ALG, true, ['sign', 'verify'])) as CryptoKeyPair;
  return {
    privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey),
    publicJwk: await crypto.subtle.exportKey('jwk', pair.publicKey),
  };
}
