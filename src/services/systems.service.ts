import { supabase, isSupabaseConnected, localStore } from '../lib/supabase.ts';
import { SystemItem, PlanItem } from '../types/index.ts';

export const SystemsService = {
  async getAll(): Promise<SystemItem[]> {
    if (isSupabaseConnected) {
      const { data, error } = await supabase.from('systems').select('*').order('name');
      if (error) throw error;
      return data || [];
    }
    return localStore.getSystems();
  },

  async getPlans(): Promise<PlanItem[]> {
    if (isSupabaseConnected) {
      const { data, error } = await supabase.from('plans').select('*, systems(name)');
      if (error) throw error;
      return data || [];
    }
    return localStore.getPlans();
  },

  async updateVersion(id: string, version: string, releaseChannel: SystemItem['release_channel']): Promise<SystemItem> {
    if (isSupabaseConnected) {
      const { data, error } = await supabase
        .from('systems')
        .update({ latest_version: version, release_channel: releaseChannel })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const list = localStore.getSystems();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Sistema não encontrado');
    list[idx] = { ...list[idx], latest_version: version, release_channel: releaseChannel };
    localStore.setSystems([...list]);
    localStore.logAudit('SYSTEM_VERSION_UPDATED', 'system', id, { version, releaseChannel });
    return list[idx];
  },
};
