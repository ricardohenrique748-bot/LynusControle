import { supabase, isSupabaseConnected, localStore } from '../lib/supabase.ts';
import { CustomerItem } from '../types/index.ts';

export const CustomersService = {
  async getAll(): Promise<CustomerItem[]> {
    if (isSupabaseConnected) {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('corporate_name', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return localStore.getCustomers();
  },

  async getById(id: string): Promise<CustomerItem | null> {
    const list = await this.getAll();
    return list.find((c) => c.id === id) || null;
  },

  async create(customer: Omit<CustomerItem, 'id' | 'created_at'>): Promise<CustomerItem> {
    const newItem: CustomerItem = {
      ...customer,
      id: `cust-${Date.now().toString().slice(-4)}`,
      created_at: new Date().toISOString(),
      active_contracts_count: 0,
      active_licenses_count: 0,
    };

    if (isSupabaseConnected) {
      const { data, error } = await supabase.from('customers').insert([newItem]).select().single();
      if (error) throw error;
      return data;
    }

    const current = localStore.getCustomers();
    localStore.setCustomers([newItem, ...current]);
    localStore.logAudit(
      'CUSTOMER_CREATED',
      'customer',
      newItem.id,
      { corporate_name: newItem.corporate_name, cnpj: newItem.cnpj_cpf }
    );
    return newItem;
  },

  async update(id: string, updates: Partial<CustomerItem>): Promise<CustomerItem> {
    if (isSupabaseConnected) {
      const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }

    const list = localStore.getCustomers();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Cliente não encontrado');

    const updated = { ...list[index], ...updates };
    list[index] = updated;
    localStore.setCustomers([...list]);
    localStore.logAudit('CUSTOMER_UPDATED', 'customer', id, updates);
    return updated;
  },

  async toggleStatus(id: string, newStatus: CustomerItem['status']): Promise<CustomerItem> {
    return this.update(id, { status: newStatus });
  },
};
