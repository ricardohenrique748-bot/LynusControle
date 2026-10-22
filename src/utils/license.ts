/**
 * Pure License Domain Logic
 * Decoupled for unit testing and deterministic verification.
 */

export interface LicenseEvalInput {
  status: 'active' | 'grace_period' | 'suspended' | 'expired' | 'revoked';
  expires_at: string; // ISO date
  grace_period_days: number;
}

export {
  calculateLicenseChecksum,
  generateLicenseKey,
  validateLicenseKeyChecksum,
} from '../../supabase/functions/_shared/license-key.ts';

/**
 * Evaluates license state against the current date, accounting for grace periods
 */
export function evaluateLicenseStatus(
  input: LicenseEvalInput,
  currentDate: Date = new Date()
): 'active' | 'grace_period' | 'suspended' | 'expired' | 'revoked' {
  if (input.status === 'suspended' || input.status === 'revoked') {
    return input.status;
  }

  const expiry = new Date(input.expires_at);
  const now = currentDate.getTime();
  const expiryTime = expiry.getTime();

  if (now <= expiryTime) {
    return 'active';
  }

  // Check grace period window
  const graceWindowMs = (input.grace_period_days || 0) * 24 * 60 * 60 * 1000;
  if (now <= expiryTime + graceWindowMs) {
    return 'grace_period';
  }

  return 'expired';
}

/**
 * Generates an offline lease token representation
 */
export function generateOfflineLeaseToken(
  licenseKey: string,
  hardwareFingerprint: string,
  leaseDays: number,
  baseDate: Date = new Date()
): { token: string; validUntil: string } {
  const validUntil = new Date(baseDate.getTime() + leaseDays * 24 * 60 * 60 * 1000);
  const rawPayload = `${licenseKey}#${hardwareFingerprint}#${validUntil.toISOString()}`;
  // btoa over UTF-8 bytes works in both the browser and Node (Buffer is Node-only)
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(rawPayload)));
  return {
    token: `LYN-LEASE.${encoded}`,
    validUntil: validUntil.toISOString(),
  };
}
