/**
 * Types for Lynus Control Platform
 */

export type UserRole = 'admin' | 'finance' | 'fiscal' | 'support';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export type LicenseStatus = 'active' | 'grace_period' | 'suspended' | 'expired' | 'revoked';

export interface SystemItem {
  id: string;
  name: string;
  code: string;
  category: 'erp' | 'pdv' | 'wms' | 'bi' | 'fiscal';
  latest_version: string;
  min_supported_version: string;
  release_channel: 'stable' | 'beta' | 'lts';
  description: string;
  is_active: boolean;
  feature_flags: string[];
  created_at: string;
}

export interface PlanItem {
  id: string;
  system_id: string;
  system_name?: string;
  name: string;
  code: string;
  billing_cycle: 'monthly' | 'quarterly' | 'annual';
  price_brl: number;
  max_terminals: number;
  max_users: number;
  features: string[];
  is_active: boolean;
}

export interface CustomerItem {
  id: string;
  cnpj_cpf: string;
  corporate_name: string; // Razão Social
  trade_name: string;     // Nome Fantasia
  email: string;
  phone: string;
  city: string;
  state: string;
  status: 'active' | 'pending' | 'suspended' | 'cancelled';
  active_contracts_count?: number;
  active_licenses_count?: number;
  created_at: string;
}

export interface ContractItem {
  id: string;
  contract_number: string;
  customer_id: string;
  customer_name?: string;
  system_id: string;
  system_name?: string;
  plan_id: string;
  plan_name?: string;
  value_brl: number;
  billing_cycle: 'monthly' | 'quarterly' | 'annual';
  due_day: number;
  /** Days overdue the customer system keeps working with a warning; read-only after that */
  grace_period_days: number;
  /** Days overdue after which access is blocked (defaults to 15) */
  block_after_days?: number;
  start_date: string;
  renewal_date: string;
  payment_method: 'pix' | 'boleto' | 'credit_card';
  status: 'active' | 'trial' | 'past_due' | 'suspended' | 'cancelled';
  notes?: string;
}

export interface LicenseItem {
  id: string;
  license_key: string;
  customer_id: string;
  customer_name?: string;
  system_id: string;
  system_name?: string;
  contract_id: string;
  status: LicenseStatus;
  max_instances: number;
  active_instances: number;
  hardware_fingerprints: string[];
  offline_lease_days: number;
  issued_at: string;
  expires_at: string;
  last_heartbeat_at?: string;
  /** Only "delinquency" suspensions are lifted automatically when the invoice is paid */
  suspension_reason?: 'delinquency' | 'manual' | null;
  suspended_at?: string | null;
  feature_flags: Record<string, boolean>;
  checksum_valid: boolean;
}

export interface InvoiceItem {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name?: string;
  contract_id: string;
  amount_brl: number;
  due_date: string;
  paid_at?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_method: 'pix' | 'boleto' | 'credit_card';
  pix_code?: string;
  boleto_barcode?: string;
  pdf_url?: string;
  reconciled_by_edge_function: boolean;
  created_at: string;
}

export interface FiscalDocumentItem {
  id: string;
  doc_number: string;
  doc_type: 'nfe' | 'nfse' | 'cte' | 'sped_fiscal' | 'sped_contribuicoes';
  customer_id: string;
  customer_name?: string;
  issue_date: string;
  competence_period: string; // YYYY-MM
  status: 'authorized' | 'pending_validation' | 'rejected' | 'storage_archived';
  storage_path: string;
  hash_sha256: string;
  file_size_kb: number;
  rejection_reason?: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entity_type: 'license' | 'contract' | 'invoice' | 'customer' | 'fiscal' | 'system' | 'auth';
  entity_id: string;
  actor_name: string;
  actor_email: string;
  actor_role: UserRole;
  details: Record<string, unknown>;
  ip_address: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'fiscal' | 'finance' | 'license' | 'security';
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  created_at: string;
}

export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

/** A titled block of the proposal: paragraphs, an optional bullet list, then closing paragraphs */
export interface ProposalSection {
  id: string;
  title: string;
  before: string; // one paragraph per line
  items: string[];
  after: string; // one paragraph per line
}

export interface ProposalInvestmentRow {
  id: string;
  description: string;
  value: number | null; // null renders as "--------"
}

export interface ProposalItem {
  id: string;
  number: string;
  status: ProposalStatus;
  city: string;
  issue_month: string; // YYYY-MM
  customer_id?: string;
  client_company: string;
  client_contact: string;
  system_name: string;
  platform_name: string;
  subtitle: string;
  letter_body: string; // one paragraph per line
  about: string; // one paragraph per line
  objective: ProposalSection;
  scope_intro: string; // one paragraph per line
  modules: ProposalSection[];
  investment_rows: ProposalInvestmentRow[];
  license_value: number;
  monthly_value: number;
  contract_months: number;
  adjustment_clause: string; // one paragraph per line
  /** Late payment / access suspension clause; missing on proposals saved before it existed */
  suspension_clause?: string; // one paragraph per line
  company: { legal_name: string; cnpj: string; city: string; state: string };
  bank: { bank: string; agency: string; account: string; pix: string };
  representative: { name: string; email: string; phone: string };
  created_at: string;
  updated_at: string;
}

export type VisitType = 'commercial' | 'onboarding' | 'support' | 'training' | 'other';
export type VisitStatus = 'scheduled' | 'done' | 'cancelled';

export interface VisitItem {
  id: string;
  date: string; // YYYY-MM-DD (local)
  start_time: string; // HH:mm
  duration_min: number;
  type: VisitType;
  status: VisitStatus;
  customer_id?: string;
  client_name: string; // customer trade name or a prospect typed manually
  contact_name: string;
  phone: string;
  address: string;
  notes: string;
  outcome: string; // filled when the visit is marked as done
  created_at: string;
  updated_at: string;
}
