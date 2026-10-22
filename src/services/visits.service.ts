import { localStore } from '../lib/supabase.ts';
import { VisitItem } from '../types/index.ts';

// Visits are kept in the browser for now (there is no `visits` table in the Supabase schema yet)
const STORAGE_KEY = 'lynus_visits';

function read(): VisitItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VisitItem[]) : [];
  } catch {
    return [];
  }
}

function write(list: VisitItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
}

export type VisitInput = Omit<VisitItem, 'id' | 'status' | 'outcome' | 'created_at' | 'updated_at'>;

export const VisitsService = {
  async getAll(): Promise<VisitItem[]> {
    return read();
  },

  async create(input: VisitInput): Promise<VisitItem> {
    const now = new Date().toISOString();
    const item: VisitItem = {
      ...input,
      id: `vis-${Date.now().toString(36)}`,
      status: 'scheduled',
      outcome: '',
      created_at: now,
      updated_at: now,
    };
    write([...read(), item]);
    localStore.logAudit('VISIT_SCHEDULED', 'customer', item.id, {
      client: item.client_name,
      date: item.date,
      time: item.start_time,
    });
    return item;
  },

  async update(id: string, patch: Partial<VisitItem>): Promise<VisitItem> {
    const list = read();
    const idx = list.findIndex((v) => v.id === id);
    if (idx === -1) throw new Error('Visita não encontrada');
    list[idx] = { ...list[idx], ...patch, id, updated_at: new Date().toISOString() };
    write(list);
    if (patch.status && patch.status !== 'scheduled') {
      localStore.logAudit(patch.status === 'done' ? 'VISIT_DONE' : 'VISIT_CANCELLED', 'customer', id, {
        client: list[idx].client_name,
      });
    }
    return list[idx];
  },

  async remove(id: string): Promise<void> {
    write(read().filter((v) => v.id !== id));
  },
};
