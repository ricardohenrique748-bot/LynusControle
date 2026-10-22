import { ContractItem, InvoiceItem, LicenseItem } from '../types/index.ts';
import { evaluateAccess, AccessDecision } from '../../supabase/functions/_shared/access-policy.ts';

export type { AccessDecision, AccessStage } from '../../supabase/functions/_shared/access-policy.ts';

/**
 * What the customer's system is showing right now for this license — the same rule the
 * `license-check` Edge Function applies (oldest unpaid past-due invoice of the contract).
 */
export function accessForLicense(
  license: LicenseItem,
  contracts: ContractItem[],
  invoices: InvoiceItem[],
  now: Date = new Date()
): AccessDecision {
  const contract = contracts.find((c) => c.id === license.contract_id);
  const today = now.toISOString().slice(0, 10);
  const oldestUnpaid = invoices
    .filter(
      (i) => i.contract_id === license.contract_id && (i.status === 'pending' || i.status === 'overdue') && i.due_date < today
    )
    .map((i) => i.due_date)
    .sort()[0];

  return evaluateAccess(
    {
      license_status: license.status,
      expires_at: license.expires_at,
      oldest_unpaid_due_date: oldestUnpaid ?? null,
      policy: {
        read_only_after_days: contract?.grace_period_days,
        block_after_days: contract?.block_after_days,
      },
    },
    now
  );
}

export const ACCESS_STAGE_LABEL: Record<
  AccessDecision['stage'],
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }
> = {
  active: { label: 'Liberado', variant: 'success' },
  warning: { label: 'Aviso', variant: 'warning' },
  read_only: { label: 'Somente leitura', variant: 'info' },
  blocked: { label: 'Bloqueado', variant: 'danger' },
};
