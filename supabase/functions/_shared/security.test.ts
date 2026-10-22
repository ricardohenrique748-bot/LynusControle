// deno test --allow-env supabase/functions/_shared/security.test.ts
import { assertEquals, assertRejects, assertThrows } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { HttpError, requireCronSecret, safeEqual, verifyWebhookSignature } from './security.ts';

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.test('safeEqual compares exactly', () => {
  assertEquals(safeEqual('abc', 'abc'), true);
  assertEquals(safeEqual('abc', 'abd'), false);
  assertEquals(safeEqual('abc', 'abcd'), false);
  assertEquals(safeEqual('', ''), true);
});

Deno.test('cron secret is required', () => {
  Deno.env.set('CRON_SECRET', 's3cret-value');
  const req = (h?: string) => new Request('http://x', { headers: h ? { 'x-cron-secret': h } : {} });
  requireCronSecret(req('s3cret-value'));
  assertThrows(() => requireCronSecret(req('wrong')), HttpError);
  assertThrows(() => requireCronSecret(req()), HttpError);
});

Deno.test('webhook accepts only bodies signed with the shared secret', async () => {
  Deno.env.set('PAYMENT_WEBHOOK_SECRET', 'whsec_test');
  const body = JSON.stringify({ event: 'payment.confirmed', invoice_id: 'inv-1' });
  const good = await hmacHex('whsec_test', body);

  await verifyWebhookSignature(body, good);
  await verifyWebhookSignature(body, `sha256=${good}`);
  await assertRejects(() => verifyWebhookSignature(body, null), HttpError);
  const wrongSecret = await hmacHex('other', body);
  await assertRejects(() => verifyWebhookSignature(body, wrongSecret), HttpError);
  // Same signature, tampered body (e.g. another invoice) must fail
  await assertRejects(() => verifyWebhookSignature(body.replace('inv-1', 'inv-2'), good), HttpError);
});

Deno.test('missing secret fails closed', async () => {
  Deno.env.delete('PAYMENT_WEBHOOK_SECRET');
  await assertRejects(() => verifyWebhookSignature('{}', 'abc'), HttpError, 'não configurado');
});
