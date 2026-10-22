import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateLicenseKey,
  validateLicenseKeyChecksum,
  evaluateLicenseStatus,
  calculateLicenseChecksum,
  generateOfflineLeaseToken,
} from './license.ts';

test('generates valid license key with correct checksum', () => {
  const key = generateLicenseKey('ERP');
  assert.equal(typeof key, 'string');
  assert.match(key, /^LYNUS-ERP[X0-9A-Z]-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-F0-9]{2}$/);
  assert.equal(validateLicenseKeyChecksum(key), true);
});

test('detects tampered or malformed license key checksum', () => {
  // Fixed key: with a random one, the 8-bit checksum of the tampered key collides ~1 in 256 runs
  const body = 'LYNUS-PDVX-ABCD-EFGH';
  const validKey = `${body}-${calculateLicenseChecksum(body)}`;
  assert.equal(validateLicenseKeyChecksum(validKey), true);

  // Tamper with one block (reversed)
  const parts = validKey.split('-');
  const tamperedKey = `${parts[0]}-${parts[1]}-DCBA-${parts[3]}-${parts[4]}`;
  assert.equal(validateLicenseKeyChecksum(tamperedKey), false);

  // Malformed lengths
  assert.equal(validateLicenseKeyChecksum('INVALID-KEY'), false);
  assert.equal(validateLicenseKeyChecksum(''), false);
});

test('evaluates license status active, grace_period, and expired correctly', () => {
  const now = new Date('2026-10-18T12:00:00Z');

  // Active license (expires in future)
  const activeStatus = evaluateLicenseStatus(
    {
      status: 'active',
      expires_at: '2026-11-01T00:00:00Z',
      grace_period_days: 7,
    },
    now
  );
  assert.equal(activeStatus, 'active');

  // Within grace period (expired 3 days ago, 7 days grace)
  const graceStatus = evaluateLicenseStatus(
    {
      status: 'active',
      expires_at: '2026-10-15T00:00:00Z',
      grace_period_days: 7,
    },
    now
  );
  assert.equal(graceStatus, 'grace_period');

  // Expired beyond grace period (expired 15 days ago, 7 days grace)
  const expiredStatus = evaluateLicenseStatus(
    {
      status: 'active',
      expires_at: '2026-10-01T00:00:00Z',
      grace_period_days: 7,
    },
    now
  );
  assert.equal(expiredStatus, 'expired');

  // Suspended status is preserved regardless of date
  const suspendedStatus = evaluateLicenseStatus(
    {
      status: 'suspended',
      expires_at: '2026-12-01T00:00:00Z',
      grace_period_days: 7,
    },
    now
  );
  assert.equal(suspendedStatus, 'suspended');
});

test('generates decodable offline lease token', () => {
  const key = 'LYNUS-ERPX-A1B2-C3D4-9F';
  const hwId = 'HWID-MAC-7C8B';
  const baseDate = new Date('2026-10-18T12:00:00Z');
  const result = generateOfflineLeaseToken(key, hwId, 15, baseDate);

  assert.equal(result.token.startsWith('LYN-LEASE.'), true);
  const rawBase64 = result.token.replace('LYN-LEASE.', '');
  const decoded = Buffer.from(rawBase64, 'base64').toString('utf-8');
  assert.equal(decoded.includes(key), true);
  assert.equal(decoded.includes(hwId), true);
});
