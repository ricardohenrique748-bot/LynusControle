import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  INITIAL_CUSTOMERS,
  INITIAL_SYSTEMS,
  INITIAL_PLANS,
  INITIAL_CONTRACTS,
  INITIAL_LICENSES,
  INITIAL_INVOICES,
  INITIAL_FISCAL_DOCS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from './seed-data.ts';
import {
  CustomerItem,
  SystemItem,
  PlanItem,
  ContractItem,
  LicenseItem,
  InvoiceItem,
  FiscalDocumentItem,
  AuditLogItem,
  NotificationItem,
  UserRole,
} from '../types/index.ts';

// Read public environment variables only
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isRealConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('placeholder');

// Initialize public Supabase client
export const supabase: SupabaseClient = createClient(
  isRealConfigured ? supabaseUrl : 'https://mock.supabase.co',
  isRealConfigured ? supabaseAnonKey : 'mock-anon-key'
);

export const isSupabaseConnected = isRealConfigured;

/**
 * Local Resilient Reactive Storage Engine
 * Keeps the SPA fully functional and interactive even before external cloud database provisioning.
 */
class LocalDataStore {
  private get<T>(key: string, defaultVal: T): T {
    try {
      const data = localStorage.getItem(`lynus_${key}`);
      return data ? JSON.parse(data) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`lynus_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  getCustomers(): CustomerItem[] {
    return this.get<CustomerItem[]>('customers', INITIAL_CUSTOMERS);
  }
  setCustomers(val: CustomerItem[]) {
    this.set('customers', val);
  }

  getSystems(): SystemItem[] {
    return this.get<SystemItem[]>('systems', INITIAL_SYSTEMS);
  }
  setSystems(val: SystemItem[]) {
    this.set('systems', val);
  }

  getPlans(): PlanItem[] {
    return this.get<PlanItem[]>('plans', INITIAL_PLANS);
  }
  setPlans(val: PlanItem[]) {
    this.set('plans', val);
  }

  getContracts(): ContractItem[] {
    return this.get<ContractItem[]>('contracts', INITIAL_CONTRACTS);
  }
  setContracts(val: ContractItem[]) {
    this.set('contracts', val);
  }

  getLicenses(): LicenseItem[] {
    return this.get<LicenseItem[]>('licenses', INITIAL_LICENSES);
  }
  setLicenses(val: LicenseItem[]) {
    this.set('licenses', val);
  }

  getInvoices(): InvoiceItem[] {
    return this.get<InvoiceItem[]>('invoices', INITIAL_INVOICES);
  }
  setInvoices(val: InvoiceItem[]) {
    this.set('invoices', val);
  }

  getFiscalDocs(): FiscalDocumentItem[] {
    return this.get<FiscalDocumentItem[]>('fiscal_docs', INITIAL_FISCAL_DOCS);
  }
  setFiscalDocs(val: FiscalDocumentItem[]) {
    this.set('fiscal_docs', val);
  }

  getAuditLogs(): AuditLogItem[] {
    return this.get<AuditLogItem[]>('audit_logs', INITIAL_AUDIT_LOGS);
  }
  setAuditLogs(val: AuditLogItem[]) {
    this.set('audit_logs', val);
  }

  getNotifications(): NotificationItem[] {
    return this.get<NotificationItem[]>('notifications', INITIAL_NOTIFICATIONS);
  }
  setNotifications(val: NotificationItem[]) {
    this.set('notifications', val);
  }

  resetToDefault(): void {
    localStorage.removeItem('lynus_customers');
    localStorage.removeItem('lynus_systems');
    localStorage.removeItem('lynus_plans');
    localStorage.removeItem('lynus_contracts');
    localStorage.removeItem('lynus_licenses');
    localStorage.removeItem('lynus_invoices');
    localStorage.removeItem('lynus_fiscal_docs');
    localStorage.removeItem('lynus_audit_logs');
    localStorage.removeItem('lynus_notifications');
  }

  logAudit(
    action: string,
    entity_type: AuditLogItem['entity_type'],
    entity_id: string,
    details: Record<string, unknown>,
    role: UserRole = 'admin',
    userName: string = 'Ricardo H. (Admin)'
  ) {
    const logs = this.getAuditLogs();
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      action,
      entity_type,
      entity_id,
      actor_name: userName,
      actor_email: 'ricardohenrique748@gmail.com',
      actor_role: role,
      details,
      ip_address: '187.54.120.14',
      timestamp: new Date().toISOString(),
    };
    this.setAuditLogs([newLog, ...logs]);
  }
}

export const localStore = new LocalDataStore();
