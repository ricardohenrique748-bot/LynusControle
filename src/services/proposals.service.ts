import { localStore } from '../lib/supabase.ts';
import { ProposalItem } from '../types/index.ts';
import { buildProposalFromTemplate, newId, seedProposals } from '../features/proposals/proposal-template.ts';

// Proposals are kept in the browser for now (there is no `proposals` table in the Supabase schema yet)
const STORAGE_KEY = 'lynus_proposals';

function read(): ProposalItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProposalItem[]) : seedProposals();
  } catch {
    return seedProposals();
  }
}

function write(list: ProposalItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
}

function nextNumber(list: ProposalItem[]): string {
  const max = list.reduce((m, p) => Math.max(m, parseInt(p.number, 10) || 0), 0);
  return String(max + 1).padStart(2, '0');
}

export const ProposalsService = {
  async getAll(): Promise<ProposalItem[]> {
    return read().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },

  async getById(id: string): Promise<ProposalItem | null> {
    return read().find((p) => p.id === id) ?? null;
  },

  async create(): Promise<ProposalItem> {
    const list = read();
    const item = buildProposalFromTemplate({ number: nextNumber(list) });
    write([item, ...list]);
    localStore.logAudit('PROPOSAL_CREATED', 'contract', item.id, { number: item.number });
    return item;
  },

  async duplicate(id: string): Promise<ProposalItem> {
    const list = read();
    const source = list.find((p) => p.id === id);
    if (!source) throw new Error('Proposta não encontrada');
    const now = new Date().toISOString();
    const copy: ProposalItem = {
      ...structuredClone(source),
      id: newId('prp'),
      number: nextNumber(list),
      status: 'draft',
      created_at: now,
      updated_at: now,
    };
    write([copy, ...list]);
    localStore.logAudit('PROPOSAL_DUPLICATED', 'contract', copy.id, { from: source.number, number: copy.number });
    return copy;
  },

  async save(item: ProposalItem): Promise<ProposalItem> {
    const list = read();
    const saved = { ...item, updated_at: new Date().toISOString() };
    const idx = list.findIndex((p) => p.id === item.id);
    if (idx === -1) list.unshift(saved);
    else list[idx] = saved;
    write(list);
    return saved;
  },

  async remove(id: string): Promise<void> {
    const list = read();
    const target = list.find((p) => p.id === id);
    write(list.filter((p) => p.id !== id));
    if (target) localStore.logAudit('PROPOSAL_DELETED', 'contract', id, { number: target.number });
  },
};
