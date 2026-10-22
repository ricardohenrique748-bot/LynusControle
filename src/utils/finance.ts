/**
 * Financial Calculation Utilities
 * Decoupled logic for MRR, delinquency, and Brazilian currency formatting.
 */

export interface ContractForMRR {
  status: string;
  value_brl: number;
  billing_cycle: 'monthly' | 'quarterly' | 'annual';
}

export interface InvoiceForDelinquency {
  id: string;
  amount_brl: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
}

/**
 * Formats a number to Brazilian Real (BRL)
 * Example: 14500 -> "R$ 14.500,00"
 */
export function formatBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculates Monthly Recurring Revenue (MRR)
 * Normalizes quarterly (/3) and annual (/12) contracts
 */
export function calculateMRR(contracts: ContractForMRR[]): number {
  return contracts.reduce((acc, contract) => {
    if (contract.status !== 'active') return acc;
    if (contract.billing_cycle === 'monthly') {
      return acc + contract.value_brl;
    } else if (contract.billing_cycle === 'quarterly') {
      return acc + (contract.value_brl / 3);
    } else if (contract.billing_cycle === 'annual') {
      return acc + (contract.value_brl / 12);
    }
    return acc;
  }, 0);
}

/**
 * Evaluates delinquency status for invoices
 */
export function evaluateDelinquency(
  invoices: InvoiceForDelinquency[],
  gracePeriodDays: number = 5,
  referenceDate: Date = new Date()
): {
  isDelinquent: boolean;
  totalOverdueBRL: number;
  overdueCount: number;
  requiresSuspension: boolean;
} {
  const refTime = referenceDate.getTime();
  let totalOverdue = 0;
  let overdueCount = 0;
  let requiresSuspension = false;

  const graceMs = gracePeriodDays * 24 * 60 * 60 * 1000;

  for (const inv of invoices) {
    if (inv.status === 'paid' || inv.status === 'cancelled') continue;

    const dueTime = new Date(inv.due_date).getTime();
    if (dueTime < refTime) {
      overdueCount++;
      totalOverdue += inv.amount_brl;

      // If beyond grace period, flag for automated license suspension
      if (refTime - dueTime > graceMs) {
        requiresSuspension = true;
      }
    }
  }

  return {
    isDelinquent: overdueCount > 0,
    totalOverdueBRL: totalOverdue,
    overdueCount,
    requiresSuspension,
  };
}
