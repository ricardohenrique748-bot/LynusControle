import { supabase, isSupabaseConnected, localStore } from '../lib/supabase.ts';
import { InvoiceItem } from '../types/index.ts';

export const FinanceService = {
  async getAllInvoices(): Promise<InvoiceItem[]> {
    if (isSupabaseConnected) {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(trade_name, corporate_name)')
        .order('due_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((i: any) => ({
        ...i,
        customer_name: i.customers?.trade_name || i.customers?.corporate_name,
      }));
    }
    return localStore.getInvoices();
  },

  async createCharge(params: {
    customer_id: string;
    customer_name: string;
    contract_id: string;
    amount_brl: number;
    due_date: string;
    payment_method: 'pix' | 'boleto' | 'credit_card';
  }): Promise<InvoiceItem> {
    const invNumber = `FAT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const pixCode = `00020126580014BR.GOV.BCB.PIX0136pix-${params.customer_id}-${Date.now()}`;
    const barcode = `34191.79001 01043.510047 91020.150008 8 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const newInvoice: InvoiceItem = {
      id: `inv-${Date.now().toString().slice(-4)}`,
      invoice_number: invNumber,
      customer_id: params.customer_id,
      customer_name: params.customer_name,
      contract_id: params.contract_id,
      amount_brl: params.amount_brl,
      due_date: params.due_date,
      status: 'pending',
      payment_method: params.payment_method,
      pix_code: pixCode,
      boleto_barcode: barcode,
      reconciled_by_edge_function: false,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConnected) {
      const { data, error } = await supabase.from('invoices').insert([newInvoice]).select().single();
      if (error) throw error;
      return data;
    }

    const current = localStore.getInvoices();
    localStore.setInvoices([newInvoice, ...current]);
    localStore.logAudit('CHARGE_CREATED', 'invoice', newInvoice.id, {
      invoice_number: invNumber,
      amount: params.amount_brl,
      payment_method: params.payment_method,
    });
    return newInvoice;
  },

  async reconcilePayment(id: string): Promise<{ invoice: InvoiceItem; reactivatedLicensesCount: number }> {
    const list = localStore.getInvoices();
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Fatura não encontrada');

    const inv = list[idx];
    inv.status = 'paid';
    inv.paid_at = new Date().toISOString();
    inv.reconciled_by_edge_function = true;
    list[idx] = inv;
    localStore.setInvoices([...list]);

    // Automatically reactivate any suspended licenses under this contract or customer!
    const licenses = localStore.getLicenses();
    let reactivated = 0;
    const updatedLicenses = licenses.map((lic) => {
      if (
        (lic.contract_id === inv.contract_id || lic.customer_id === inv.customer_id) &&
        (lic.status === 'suspended' || lic.status === 'grace_period')
      ) {
        reactivated++;
        return {
          ...lic,
          status: 'active' as const,
        };
      }
      return lic;
    });

    if (reactivated > 0) {
      localStore.setLicenses(updatedLicenses);
    }

    localStore.logAudit('PAYMENT_RECONCILED', 'invoice', id, {
      invoice_number: inv.invoice_number,
      amount: inv.amount_brl,
      reactivated_licenses: reactivated,
      engine: 'Supabase Edge Simulator',
    });

    return { invoice: inv, reactivatedLicensesCount: reactivated };
  },

  async triggerAutomatedReconciliationCron(): Promise<{ processed: number; suspended: number }> {
    const invoices = localStore.getInvoices();
    const now = new Date();
    let suspended = 0;
    const licenses = localStore.getLicenses();

    for (const inv of invoices) {
      if (inv.status === 'pending') {
        const dueTime = new Date(inv.due_date).getTime();
        if (dueTime < now.getTime()) {
          inv.status = 'overdue';
          // Check if overdue by > 5 days
          const diffDays = (now.getTime() - dueTime) / (1000 * 60 * 60 * 24);
          if (diffDays > 5) {
            for (const lic of licenses) {
              if (lic.contract_id === inv.contract_id && lic.status === 'active') {
                lic.status = 'suspended';
                suspended++;
              }
            }
          }
        }
      }
    }

    localStore.setInvoices([...invoices]);
    localStore.setLicenses([...licenses]);
    localStore.logAudit('RECONCILE_CRON_TRIGGERED', 'invoice', 'cron-batch', {
      processed: invoices.length,
      suspended_licenses: suspended,
    });

    return { processed: invoices.length, suspended };
  },
};
