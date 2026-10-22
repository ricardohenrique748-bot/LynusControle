/**
 * Delinquency access policy — single source of truth for what a customer's system may do.
 * Pure (no Deno/Node APIs) so it runs in Edge Functions, in the Lynus Control panel and in tests.
 *
 *   day 0 ............ due date
 *   1..readOnlyAfter   "warning"   → system works, shows a payment banner
 *   ..blockAfter       "read_only" → can view data, cannot create/edit
 *   > blockAfter       "blocked"   → access suspended (data is kept)
 */

export type AccessStage = 'active' | 'warning' | 'read_only' | 'blocked';

export type AccessReason =
  | 'ok'
  | 'overdue'
  | 'suspended'
  | 'revoked'
  | 'expired'
  | 'invalid_license'
  | 'wrong_system'
  | 'instance_limit'
  | 'offline_expired';

export interface AccessPolicy {
  /** Days after the due date during which the system keeps working with a warning */
  read_only_after_days: number;
  /** Days after the due date after which access is blocked */
  block_after_days: number;
}

export const DEFAULT_ACCESS_POLICY: AccessPolicy = {
  read_only_after_days: 5,
  block_after_days: 15,
};

export interface AccessInput {
  license_status: 'active' | 'grace_period' | 'suspended' | 'expired' | 'revoked';
  expires_at: string; // ISO
  /** Due date (YYYY-MM-DD or ISO) of the oldest unpaid invoice, or null if nothing is overdue */
  oldest_unpaid_due_date: string | null;
  policy?: Partial<AccessPolicy>;
}

export interface AccessDecision {
  stage: AccessStage;
  reason: AccessReason;
  days_overdue: number;
  /** When the next harsher stage starts (ISO), if any */
  next_stage_at: string | null;
  message: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDayUtc(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function daysOverdue(dueDate: string, now: Date): number {
  const due = new Date(dueDate.length === 10 ? `${dueDate}T00:00:00Z` : dueDate);
  return Math.max(0, Math.floor((startOfDayUtc(now) - startOfDayUtc(due)) / DAY_MS));
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function blockedMessage(reason: AccessReason): string {
  switch (reason) {
    case 'overdue':
      return 'Acesso suspenso por pendência financeira. Regularize o pagamento para liberar o sistema — seus dados estão preservados.';
    case 'suspended':
      return 'Acesso suspenso temporariamente. Entre em contato com a Lynus Tech.';
    case 'revoked':
      return 'Esta licença foi cancelada. Entre em contato com a Lynus Tech.';
    case 'expired':
      return 'A licença deste sistema expirou. Entre em contato com a Lynus Tech para renovar.';
    case 'invalid_license':
      return 'Licença não reconhecida. Verifique a chave de licença configurada.';
    case 'wrong_system':
      return 'Esta licença não pertence a este sistema.';
    case 'instance_limit':
      return 'Limite de instalações desta licença atingido. Entre em contato com a Lynus Tech.';
    case 'offline_expired':
      return 'Não foi possível validar a licença há muito tempo. Conecte-se à internet para continuar.';
    default:
      return 'Acesso indisponível.';
  }
}

export function evaluateAccess(input: AccessInput, now: Date = new Date()): AccessDecision {
  const policy = { ...DEFAULT_ACCESS_POLICY, ...input.policy };
  const blocked = (reason: AccessReason, days = 0): AccessDecision => ({
    stage: 'blocked',
    reason,
    days_overdue: days,
    next_stage_at: null,
    message: blockedMessage(reason),
  });

  if (input.license_status === 'revoked') return blocked('revoked');
  if (input.license_status === 'expired' || new Date(input.expires_at).getTime() < now.getTime()) {
    return blocked('expired');
  }

  const overdue = input.oldest_unpaid_due_date ? daysOverdue(input.oldest_unpaid_due_date, now) : 0;

  // A suspension (manual or by the nightly job) always blocks, even if nothing is overdue
  if (input.license_status === 'suspended') return blocked(overdue > 0 ? 'overdue' : 'suspended', overdue);

  if (overdue === 0 || !input.oldest_unpaid_due_date) {
    return { stage: 'active', reason: 'ok', days_overdue: 0, next_stage_at: null, message: '' };
  }

  const due = new Date(
    input.oldest_unpaid_due_date.length === 10 ? `${input.oldest_unpaid_due_date}T00:00:00Z` : input.oldest_unpaid_due_date
  );
  const dayAfter = (n: number) => new Date(startOfDayUtc(due) + (n + 1) * DAY_MS).toISOString();

  if (overdue > policy.block_after_days) return blocked('overdue', overdue);

  if (overdue > policy.read_only_after_days) {
    const left = policy.block_after_days - overdue + 1;
    return {
      stage: 'read_only',
      reason: 'overdue',
      days_overdue: overdue,
      next_stage_at: dayAfter(policy.block_after_days),
      message: `Fatura em atraso há ${plural(overdue, 'dia', 'dias')}. O sistema está em modo somente leitura e será suspenso em ${plural(left, 'dia', 'dias')}.`,
    };
  }

  const left = policy.read_only_after_days - overdue + 1;
  return {
    stage: 'warning',
    reason: 'overdue',
    days_overdue: overdue,
    next_stage_at: dayAfter(policy.read_only_after_days),
    message: `Existe uma fatura em atraso há ${plural(overdue, 'dia', 'dias')}. Regularize para evitar restrições em ${plural(left, 'dia', 'dias')}.`,
  };
}
