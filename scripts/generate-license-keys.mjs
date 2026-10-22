// Generates the ECDSA P-256 key pair used to sign license leases.
//   node scripts/generate-license-keys.mjs
// - PRIVATE key -> Supabase secret LICENSE_SIGNING_PRIVATE_KEY (never commit it, never put it in a client app)
// - PUBLIC key  -> `publicKey` option of the license client in each customer system
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);

console.log('\n=== CHAVE PRIVADA (secret LICENSE_SIGNING_PRIVATE_KEY no Supabase — NÃO compartilhe) ===\n');
console.log(JSON.stringify(privateJwk));
console.log('\nComando:');
console.log(`supabase secrets set LICENSE_SIGNING_PRIVATE_KEY='${JSON.stringify(privateJwk)}'`);
console.log('\n=== CHAVE PÚBLICA (vai dentro dos sistemas dos clientes) ===\n');
console.log(JSON.stringify({ kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x, y: publicJwk.y }, null, 2));
