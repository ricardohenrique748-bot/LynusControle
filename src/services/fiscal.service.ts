import { supabase, isSupabaseConnected, localStore } from '../lib/supabase.ts';
import { FiscalDocumentItem } from '../types/index.ts';

export const FiscalService = {
  async getAll(): Promise<FiscalDocumentItem[]> {
    if (isSupabaseConnected) {
      const { data, error } = await supabase
        .from('fiscal_documents')
        .select('*, customers(trade_name, corporate_name)')
        .order('issue_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((f: any) => ({
        ...f,
        customer_name: f.customers?.trade_name || f.customers?.corporate_name,
      }));
    }
    return localStore.getFiscalDocs();
  },

  async registerDocument(params: {
    doc_number: string;
    doc_type: FiscalDocumentItem['doc_type'];
    customer_id: string;
    customer_name: string;
    competence_period: string;
    file_size_kb: number;
    hash_sha256?: string;
  }): Promise<FiscalDocumentItem> {
    const fakeHash =
      params.hash_sha256 ||
      Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newDoc: FiscalDocumentItem = {
      id: `fisc-${Date.now().toString().slice(-4)}`,
      doc_number: params.doc_number,
      doc_type: params.doc_type,
      customer_id: params.customer_id,
      customer_name: params.customer_name,
      issue_date: new Date().toISOString().split('T')[0],
      competence_period: params.competence_period,
      status: 'authorized',
      storage_path: `fiscal-documents-private/${params.customer_id}/${params.competence_period}/${params.doc_type}-${Date.now()}.xml`,
      hash_sha256: fakeHash,
      file_size_kb: params.file_size_kb,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConnected) {
      const { data, error } = await supabase.from('fiscal_documents').insert([newDoc]).select().single();
      if (error) throw error;
      return data;
    }

    const current = localStore.getFiscalDocs();
    localStore.setFiscalDocs([newDoc, ...current]);
    localStore.logAudit('FISCAL_DOC_REGISTERED', 'fiscal', newDoc.id, {
      doc_number: newDoc.doc_number,
      type: newDoc.doc_type,
      customer: newDoc.customer_name,
      sha256: newDoc.hash_sha256,
    });
    return newDoc;
  },

  async updateStatus(
    id: string,
    status: FiscalDocumentItem['status'],
    rejection_reason?: string
  ): Promise<FiscalDocumentItem> {
    const list = localStore.getFiscalDocs();
    const idx = list.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Documento fiscal não encontrado');

    list[idx] = { ...list[idx], status, rejection_reason };
    localStore.setFiscalDocs([...list]);
    localStore.logAudit('FISCAL_DOC_VALIDATION_STATUS', 'fiscal', id, {
      status,
      rejection_reason,
    });
    return list[idx];
  },
};
