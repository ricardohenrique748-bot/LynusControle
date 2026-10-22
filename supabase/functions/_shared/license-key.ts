/**
 * License key format: LYNUS-XXXX-YYYY-ZZZZ-CC (CC = checksum).
 * Pure + Web Crypto only, shared by the Edge Functions and the Lynus Control panel.
 */

const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous 0, O, 1, I

/**
 * Calculates a 2-hex-character checksum for a license key body
 */
export function calculateLicenseChecksum(body: string): string {
  const clean = body.replace(/[^A-Z0-9]/g, '');
  let sum = 0;
  for (let i = 0; i < clean.length; i++) {
    sum = (sum + clean.charCodeAt(i) * (i + 1)) % 256;
  }
  return sum.toString(16).toUpperCase().padStart(2, '0');
}

function randomBlock(len: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  // 256 is a multiple of 32, so the modulo introduces no bias
  return Array.from(bytes, (b) => KEY_ALPHABET[b % KEY_ALPHABET.length]).join('');
}

/**
 * Generates a formatted license key with format: LYNUS-XXXX-YYYY-ZZZZ-CC
 */
export function generateLicenseKey(prefixCode: string = 'ERP'): string {
  const block1 = prefixCode.slice(0, 3).padEnd(4, 'X').toUpperCase();
  const rawBody = `LYNUS-${block1}-${randomBlock(4)}-${randomBlock(4)}`;
  return `${rawBody}-${calculateLicenseChecksum(rawBody)}`;
}

/**
 * Validates the checksum of a given license key
 */
export function validateLicenseKeyChecksum(key: string): boolean {
  if (!key) return false;
  const parts = key.trim().split('-');
  if (parts.length !== 5) return false;
  if (parts[0] !== 'LYNUS') return false;

  const rawBody = `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}`;
  const expectedChecksum = calculateLicenseChecksum(rawBody);
  return parts[4].toUpperCase() === expectedChecksum;
}
