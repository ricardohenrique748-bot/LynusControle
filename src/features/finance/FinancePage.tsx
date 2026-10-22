import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DollarSign,
  Plus,
  QrCode,
  Barcode,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Copy,
  Check,
} from 'lucide-react';
import { FinanceService } from '../../services/finance.service.ts';
import { CustomersService } from '../../services/customers.service.ts';
import { ContractsService } from '../../services/contracts.service.ts';
import { InvoiceItem } from '../../types/index.ts';
import { chargeSchema, ChargeFormData } from '../../lib/validations/index.ts';
import { formatBRL } from '../../utils/finance.ts';
import { Button } from '../../components/ui/button.tsx';
import { Input, Select } from '../../components/ui/input.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { useAuth } from '../../app/auth-context.tsx';

export function FinancePage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [reconciliationNotice, setReconciliationNotice] = useState<string | null>(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => FinanceService.getAllInvoices(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => CustomersService.getAll(),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => ContractsService.getAll(),
  });

  const createChargeMutation = useMutation({
    mutationFn: (data: ChargeFormData) => {
      const cust = customers.find((c) => c.id === data.customer_id);
      return FinanceService.createCharge({
        customer_id: data.customer_id,
        customer_name: cust?.trade_name || cust?.corporate_name || 'Cliente',
        contract_id: data.contract_id,
        amount_brl: data.amount_brl,
        due_date: data.due_date,
        payment_method: data.payment_method,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsChargeModalOpen(false);
      reset();
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: (id: string) => FinanceService.reconcilePayment(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      setSelectedInvoice(null);
      setReconciliationNotice(
        `Fatura ${data.invoice.invoice_number} liquidada com sucesso via Webhook Simulator! ${
          data.reactivatedLicensesCount > 0
            ? `${data.reactivatedLicensesCount} licença(s) reativada(s) automaticamente.`
            : 'Licenças mantidas ativas.'
        }`
      );
      setTimeout(() => setReconciliationNotice(null), 6000);
    },
  });

  const cronReconcileMutation = useMutation({
    mutationFn: () => FinanceService.triggerAutomatedReconciliationCron(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      setReconciliationNotice(
        `Cron de Conciliação finalizado: ${res.processed} faturas analisadas, ${res.suspended} licenças bloqueadas por inadimplência.`
      );
      setTimeout(() => setReconciliationNotice(null), 6000);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChargeFormData>({
    resolver: zodResolver(chargeSchema),
    defaultValues: {
      payment_method: 'pix',
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount_brl: 1850.0,
    },
  });

  const copyToClipboard = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedText(txt);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((acc, curr) => acc + curr.amount_brl, 0);
  const totalPending = invoices
    .filter((i) => i.status === 'pending')
    .reduce((acc, curr) => acc + curr.amount_brl, 0);
  const totalOverdue = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((acc, curr) => acc + curr.amount_brl, 0);

  const filteredInvoices = invoices.filter((i) => {
    if (filterStatus === 'all') return true;
    return i.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Gestão Financeira & Cobranças
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Faturamento recorrente, liquidação bancária via PIX/Boleto e conciliação por Edge Functions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can('reconcile_finance') && (
            <Button
              onClick={() => cronReconcileMutation.mutate()}
              size="sm"
              variant="outline"
              isLoading={cronReconcileMutation.isPending}
            >
              <RotateCw className="w-3.5 h-3.5 mr-1.5" />
              Executar Cron Reconciler
            </Button>
          )}
          {can('create_charge') && (
            <Button onClick={() => setIsChargeModalOpen(true)} size="sm" variant="primary">
              <Plus className="w-4 h-4 mr-1.5" />
              Nova Cobrança
            </Button>
          )}
        </div>
      </div>

      {/* Notice feedback banner */}
      {reconciliationNotice && (
        <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{reconciliationNotice}</span>
          </div>
          <button
            onClick={() => setReconciliationNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs cursor-pointer"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Liquidado no Período</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-white font-mono tabular-nums">
            {formatBRL(totalPaid)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            {invoices.filter((i) => i.status === 'paid').length} faturas recebidas
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Aguardando Pagamento</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-white font-mono tabular-nums">
            {formatBRL(totalPending)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            {invoices.filter((i) => i.status === 'pending').length} faturas a vencer
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Inadimplente / Vencido</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-rose-400 font-mono tabular-nums">
            {formatBRL(totalOverdue)}
          </div>
          <div className="mt-1 text-[11px] text-rose-400/80 font-mono">
            {invoices.filter((i) => i.status === 'overdue').length} faturas atrasadas
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit">
        {['all', 'pending', 'paid', 'overdue'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer capitalize ${
              filterStatus === st
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {st === 'all'
              ? 'Todas as Cobranças'
              : st === 'pending'
              ? 'Pendentes'
              : st === 'paid'
              ? 'Liquidadas'
              : 'Em Atraso'}
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="rounded-lg bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3 px-4">Fatura</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Carregando cobranças...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Nenhuma fatura encontrada.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-medium text-slate-200">{inv.invoice_number}</div>
                      {inv.reconciled_by_edge_function && (
                        <div className="text-[10px] text-cyan-400 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Conciliado por Edge
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{inv.customer_name}</div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-300">
                      {new Date(inv.due_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 uppercase font-mono text-slate-300">
                      {inv.payment_method}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-100">
                      {formatBRL(inv.amount_brl)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {inv.status === 'paid' && <Badge variant="success">Pago</Badge>}
                      {inv.status === 'pending' && <Badge variant="info">Pendente</Badge>}
                      {inv.status === 'overdue' && <Badge variant="danger">Vencido</Badge>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedInvoice(inv)}
                      >
                        {inv.status === 'paid' ? 'Comprovante' : 'Pagar / Conciliar'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pagamento & Conciliação */}
      {selectedInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedInvoice(null)}
          title={`Cobrança: ${selectedInvoice.invoice_number}`}
          description={`Cliente: ${selectedInvoice.customer_name} · Valor: ${formatBRL(selectedInvoice.amount_brl)}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Vencimento Original:</span>
                <span className="font-mono text-slate-200">{new Date(selectedInvoice.due_date).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Forma de Pagamento:</span>
                <span className="font-mono text-slate-200 uppercase">{selectedInvoice.payment_method}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Situação Atual:</span>
                <span>
                  {selectedInvoice.status === 'paid' && <Badge variant="success">Liquidado</Badge>}
                  {selectedInvoice.status === 'pending' && <Badge variant="info">Pendente</Badge>}
                  {selectedInvoice.status === 'overdue' && <Badge variant="danger">Em Atraso</Badge>}
                </span>
              </div>
            </div>

            {/* PIX QR / Barcode display */}
            {selectedInvoice.status !== 'paid' && (
              <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-200">
                  {selectedInvoice.payment_method === 'pix' ? (
                    <>
                      <QrCode className="w-4 h-4 text-cyan-400" />
                      <span>Código PIX Copia e Cola</span>
                    </>
                  ) : (
                    <>
                      <Barcode className="w-4 h-4 text-amber-400" />
                      <span>Linha Digitável do Boleto</span>
                    </>
                  )}
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 break-all select-all flex items-center justify-between gap-2">
                  <span className="truncate">
                    {selectedInvoice.pix_code || selectedInvoice.boleto_barcode || 'Código bancário gerado pelo backend'}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(selectedInvoice.pix_code || selectedInvoice.boleto_barcode || '')
                    }
                    className="p-1 hover:text-white transition-colors cursor-pointer text-slate-400"
                  >
                    {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Reconciliation Trigger Button */}
            {can('reconcile_finance') && selectedInvoice.status !== 'paid' && (
              <div className="p-3 rounded bg-cyan-950/30 border border-cyan-800/60 space-y-2">
                <h4 className="font-semibold text-cyan-200">
                  Simulação de Confirmação Bancária (Edge Webhook)
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Confirma o recebimento no banco de dados e dispara a Edge Function para reativar qualquer terminal ou licença bloqueada deste cliente.
                </p>
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full"
                  isLoading={reconcileMutation.isPending}
                  onClick={() => reconcileMutation.mutate(selectedInvoice.id)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Confirmar Pagamento & Reativar Licenças
                </Button>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedInvoice(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Nova Cobrança */}
      <Modal
        isOpen={isChargeModalOpen}
        onClose={() => setIsChargeModalOpen(false)}
        title="Gerar Nova Cobrança Avulsa / Mensalidade"
        description="Emite fatura e registra payload para liquidação automatizada."
      >
        <form onSubmit={handleSubmit((d) => createChargeMutation.mutate(d))} className="space-y-4">
          <Select
            label="Cliente Devedor"
            {...register('customer_id')}
            error={errors.customer_id?.message}
          >
            <option value="">Selecione o cliente...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.trade_name} ({c.cnpj_cpf})
              </option>
            ))}
          </Select>

          <Select
            label="Contrato Base"
            {...register('contract_id')}
            error={errors.contract_id?.message}
          >
            <option value="">Selecione o contrato...</option>
            {contracts.map((cnt) => (
              <option key={cnt.id} value={cnt.id}>
                {cnt.contract_number} - {cnt.customer_name} ({formatBRL(cnt.value_brl)})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Valor Total (R$)"
              type="number"
              step="0.01"
              {...register('amount_brl', { valueAsNumber: true })}
              error={errors.amount_brl?.message}
            />
            <Input
              label="Data de Vencimento"
              type="date"
              {...register('due_date')}
              error={errors.due_date?.message}
            />
          </div>

          <Select
            label="Método de Pagamento"
            {...register('payment_method')}
            error={errors.payment_method?.message}
          >
            <option value="pix">PIX (Confirmação Imediata)</option>
            <option value="boleto">Boleto Bancário Registrado</option>
            <option value="credit_card">Cartão de Crédito Corporativo</option>
          </Select>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsChargeModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting || createChargeMutation.isPending}
            >
              Gerar Fatura
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
