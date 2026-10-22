import { supabase, isSupabaseConnected, localStore } from '../lib/supabase.ts';
import { LicenseItem, LicenseStatus } from '../types/index.ts';
import { generateLicenseKey, validateLicenseKeyChecksum, generateOfflineLeaseToken } from '../utils/license.ts';

export const LicensesService = {
  async getAll(): Promise<LicenseItem[]> {
    if (isSupabaseConnected) {
      const { data, error } = await supabase
        .from('licenses')
        .select('*, customers(trade_name, corporate_name), systems(name)');
      if (error) throw error;
      return (data || []).map((l: any) => ({
        ...l,
        customer_name: l.customers?.trade_name || l.customers?.corporate_name,
        system_name: l.systems?.name,
        checksum_valid: validateLicenseKeyChecksum(l.license_key),
      }));
    }
    return localStore.getLicenses().map((l) => ({
      ...l,
      checksum_valid: validateLicenseKeyChecksum(l.license_key),
    }));
  },

  async issue(params: {
    customer_id: string;
    customer_name: string;
    system_id: string;
    system_name: string;
    contract_id: string;
    system_code_prefix?: string;
    max_instances: number;
    offline_lease_days: number;
    duration_months?: number;
  }): Promise<LicenseItem> {
    const key = generateLicenseKey(params.system_code_prefix || 'ERP');
    const months = params.duration_months || 12;
    const expires = new Date();
    expires.setMonth(expires.getMonth() + months);

    const newLic: LicenseItem = {
      id: `lic-${Date.now().toString().slice(-4)}`,
      license_key: key,
      customer_id: params.customer_id,
      customer_name: params.customer_name,
      system_id: params.system_id,
      system_name: params.system_name,
      contract_id: params.contract_id,
      status: 'active',
      max_instances: params.max_instances,
      active_instances: 0,
      hardware_fingerprints: [],
      offline_lease_days: params.offline_lease_days,
      issued_at: new Date().toISOString(),
      expires_at: expires.toISOString(),
      last_heartbeat_at: new Date().toISOString(),
      feature_flags: { advanced_reports: true, cloud_backup: true },
      checksum_valid: true,
    };

    if (isSupabaseConnected) {
      const { data, error } = await supabase.from('licenses').insert([newLic]).select().single();
      if (error) throw error;
      return { ...data, checksum_valid: true };
    }

    const current = localStore.getLicenses();
    localStore.setLicenses([newLic, ...current]);
    localStore.logAudit('LICENSE_ISSUED', 'license', newLic.id, {
      license_key: key,
      customer: params.customer_name,
      max_instances: params.max_instances,
    });
    return newLic;
  },

  async setStatus(id: string, newStatus: LicenseStatus, reason?: string): Promise<LicenseItem> {
    // Panel suspensions are manual: paying an invoice must not lift them automatically
    const suspension =
      newStatus === 'suspended'
        ? { suspension_reason: 'manual' as const, suspended_at: new Date().toISOString() }
        : { suspension_reason: null, suspended_at: null };

    if (isSupabaseConnected) {
      const { data, error } = await supabase
        .from('licenses')
        .update({ status: newStatus, ...suspension })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, checksum_valid: validateLicenseKeyChecksum(data.license_key) };
    }

    const list = localStore.getLicenses();
    const idx = list.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error('Licença não encontrada');

    list[idx] = { ...list[idx], status: newStatus, ...suspension };
    localStore.setLicenses([...list]);
    localStore.logAudit(
      newStatus === 'suspended' ? 'LICENSE_SUSPENDED' : 'LICENSE_REACTIVATED',
      'license',
      id,
      { newStatus, reason: reason || 'Ação operacional autorizada' }
    );
    return list[idx];
  },

  async resetHardwareFingerprints(id: string): Promise<LicenseItem> {
    if (isSupabaseConnected) {
      const { data, error } = await supabase
        .from('licenses')
        .update({ hardware_fingerprints: [], active_instances: 0 })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const list = localStore.getLicenses();
    const idx = list.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error('Licença não encontrada');

    const previousCount = list[idx].hardware_fingerprints.length;
    list[idx] = { ...list[idx], hardware_fingerprints: [], active_instances: 0 };
    localStore.setLicenses([...list]);
    localStore.logAudit('HARDWARE_BINDINGS_CLEARED', 'license', id, {
      cleared_instances: previousCount,
      reason: 'Liberação de troca de servidor pelo Suporte',
    });
    return list[idx];
  },

  generateOfflineToken(license: LicenseItem, hardwareId: string) {
    return generateOfflineLeaseToken(
      license.license_key,
      hardwareId,
      license.offline_lease_days
    );
  },
};
