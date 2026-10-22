import { supabase, isSupabaseConnected, localStore } from '../lib/supabase.ts';
import { ContractItem } from '../types/index.ts';

export const ContractsService = {
  async getAll(): Promise<ContractItem[]> {
    if (isSupabaseConnected) {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, customers(trade_name, corporate_name), systems(name), plans(name)');
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        customer_name: c.customers?.trade_name || c.customers?.corporate_name,
        system_name: c.systems?.name,
        plan_name: c.plans?.name,
      }));
    }
    return localStore.getContracts();
  },

  async create(contract: Omit<ContractItem, 'id'>): Promise<ContractItem> {
    const newItem: ContractItem = {
      ...contract,
      id: `cnt-${Date.now().toString().slice(-4)}`,
    };

    if (isSupabaseConnected) {
      const { data, error } = await supabase.from('contracts').insert([newItem]).select().single();
      if (error) throw error;
      return data;
    }

    const current = localStore.getContracts();
    localStore.setContracts([newItem, ...current]);
    localStore.logAudit('CONTRACT_CREATED', 'contract', newItem.id, {
      contract_number: newItem.contract_number,
      value: newItem.value_brl,
    });
    return newItem;
  },

  async updateStatus(id: string, status: ContractItem['status']): Promise<ContractItem> {
    if (isSupabaseConnected) {
      const { data, error } = await supabase.from('contracts').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }

    const list = localStore.getContracts();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Contrato não encontrado');
    list[idx] = { ...list[idx], status };
    localStore.setContracts([...list]);
    localStore.logAudit('CONTRACT_STATUS_CHANGED', 'contract', id, { new_status: status });
    return list[idx];
  },
};
