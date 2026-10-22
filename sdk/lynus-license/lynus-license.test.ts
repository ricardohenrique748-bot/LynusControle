// End-to-end check of the lease format: signed by the Edge Function helper, verified by the client SDK.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLicenseClient, LicenseStorage } from './lynus-license.ts';
import { generateSigningKeys, signLease, LeasePayload } from '../../supabase/functions/_shared/lease-token.ts';
import type { AccessStage } from '../../supabase/functions/_shared/access-policy.ts';

const KEY = 'LYNUS-FROX-ABCD-EFGH-00';
const SYS = 'LYN-FROTA';
const NOW = new Date('2026-10-20T12:00:00Z');

function memory(): LicenseStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

async function setup() {
  const { privateJwk, publicJwk } = await generateSigningKeys();
  const storage = memory();
  let server: (fp: string) => Promise<Response> = async () => {
    throw new Error('offline');
  };
  const client = createLicenseClient({
    endpoint: 'https://example.test/functions/v1/license-check',
    licenseKey: KEY,
    systemCode: SYS,
    publicKey: publicJwk,
    storage,
    now: () => NOW,
    fetch: (async (_url: string, init: RequestInit) => server(JSON.parse(String(init.body)).fingerprint)) as typeof fetch,
  });
  const lease = (fp: string, stage: AccessStage, overrides: Partial<LeasePayload> = {}) =>
    signLease(
      {
        v: 1,
        key: KEY,
        sys: SYS,
        fp,
        stage,
        reason: stage === 'active' ? 'ok' : 'overdue',
        msg: stage === 'active' ? '' : 'Fatura em atraso',
        days: stage === 'active' ? 0 : 7,
        next: null,
        iat: NOW.toISOString(),
        exp: '2026-11-04T12:00:00.000Z',
        ...overrides,
      },
      privateJwk
    );
  const respondWith = (make: (fp: string) => Promise<string>) => {
    server = async (fp) => new Response(JSON.stringify({ lease: await make(fp) }), { status: 200 });
  };
  const goOffline = () => {
    server = async () => {
      throw new Error('offline');
    };
  };
  return { client, storage, lease, respondWith, goOffline };
}

test('online answer is verified, applied and cached for offline use', async () => {
  const { client, lease, respondWith, goOffline } = await setup();
  respondWith((fp) => lease(fp, 'active'));
  const online = await client.check();
  assert.equal(online.stage, 'active');
  assert.equal(online.source, 'online');
  assert.equal(online.canWrite, true);

  goOffline();
  const offline = await client.check();
  assert.equal(offline.stage, 'active');
  assert.equal(offline.source, 'cache');
});

test('read-only stage disables writing', async () => {
  const { client, lease, respondWith } = await setup();
  respondWith((fp) => lease(fp, 'read_only'));
  const s = await client.check();
  assert.equal(s.stage, 'read_only');
  assert.equal(s.canWrite, false);
});

test('first run without connection blocks until it can validate', async () => {
  const { client } = await setup();
  const s = await client.check();
  assert.equal(s.stage, 'blocked');
  assert.equal(s.reason, 'offline_expired');
});

test('cached lease past its offline validity blocks', async () => {
  const { client, lease, respondWith, goOffline } = await setup();
  respondWith((fp) => lease(fp, 'active', { exp: '2026-10-20T11:00:00.000Z' }));
  await client.check();
  goOffline();
  const s = await client.check();
  assert.equal(s.stage, 'blocked');
  assert.equal(s.reason, 'offline_expired');
});

test('edited cached lease is rejected (cannot unblock by editing storage)', async () => {
  const { client, storage, lease, respondWith, goOffline } = await setup();
  respondWith((fp) => lease(fp, 'blocked'));
  await client.check();
  const k = `lynus_license:${SYS}:lease`;
  const [body, sig] = storage.data.get(k)!.split('.');
  const json = JSON.parse(Buffer.from(body, 'base64url').toString());
  const forged = Buffer.from(JSON.stringify({ ...json, stage: 'active' })).toString('base64url');
  storage.data.set(k, `${forged}.${sig}`);
  goOffline();
  const s = await client.check();
  assert.equal(s.stage, 'blocked');
  assert.equal(s.reason, 'offline_expired');
});

test('lease signed for another installation or with another key is ignored', async () => {
  const { client, lease, respondWith } = await setup();
  respondWith(() => lease('other-device', 'active'));
  assert.equal((await client.check()).stage, 'blocked');

  const other = await setup();
  respondWith(async (fp) => other.lease(fp, 'active')); // different private key
  assert.equal((await client.check()).stage, 'blocked');
});
