import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileCheck2, Plus, Calendar, DollarSign, Clock, ShieldAlert, LayoutGrid, List } from 'lucide-react';
import { ContractsService } from '../../services/contracts.service.ts';
import { CustomersService } from '../../services/customers.service.ts';
import { SystemsService } from '../../services/systems.service.ts';
import { ContractItem } from '../../types/index.ts';
import { contractSchema, ContractFormData } from '../../lib/validations/index.ts';
import { formatBRL } from '../../utils/finance.ts';
import { Button } from '../../components/ui/button.tsx';
import { Input, Select } from '../../components/ui/input.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import ContractCard, { CardColor } from '../../components/ui/course-design-cards.tsx';
import { useAuth } from '../../app/auth-context.tsx';

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_COLOR: Record<ContractItem['status'], CardColor> = {
  active: 'green',
  trial: 'blue',
  past_due: 'orange',
  suspended: 'red',
  cancelled: 'red',
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// Share of the contract term already elapsed (start_date → renewal_date)
function termProgress(cnt: ContractItem) {
  const start = new Date(cnt.start_date).getTime();
  const end = new Date(cnt.renewal_date).getTime();
  if (!(end > start)) return 0;
  return ((Date.now() - start) / (end - start)) * 100;
}

function renewalCountdown(cnt: ContractItem) {
  const days = Math.ceil((new Date(cnt.renewal_date).getTime() - Date.now()) / DAY_MS);
  if (days < 0) return `Venceu há ${-days} ${-days === 1 ? 'dia' : 'dias'}`;
  if (days === 0) return 'Renova hoje';
  return `Renova em ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

export function ContractsPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<'cards' | 'table'>('cards');

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => ContractsService.getAll(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => CustomersService.getAll(),
  });

  const { data: systems = [] } = useQuery({
    queryKey: ['systems'],
    queryFn: () => SystemsService.getAll(),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => SystemsService.getPlans(),
  });

  const createContractMutation = useMutation({
    mutationFn: (data: ContractFormData) => {
      const cust = customers.find((c) => c.id === data.customer_id);
      const sys = systems.find((s) => s.id === data.system_id);
      const pl = plans.find((p) => p.id === data.plan_id);
      return ContractsService.create({
        contract_number: data.contract_number,
        customer_id: data.customer_id,
        customer_name: cust?.trade_name || cust?.corporate_name || 'Cliente',
        system_id: data.system_id,
        system_name: sys?.name || 'Sistema',
        plan_id: data.plan_id,
        plan_name: pl?.name || 'Plano',
        value_brl: data.value_brl,
        billing_cycle: data.billing_cycle,
        due_day: data.due_day,
        grace_period_days: data.grace_period_days,
        block_after_days: data.block_after_days,
        start_date: new Date().toISOString().split('T')[0],
        renewal_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_method: data.payment_method,
        status: 'active',
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setIsModalOpen(false);
      reset();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContractItem['status'] }) =>
      ContractsService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contract_number: `CTR-2026-${Math.floor(100 + Math.random() * 900)}`,
      billing_cycle: 'monthly',
      due_day: 10,
      grace_period_days: 5,
      block_after_days: 15,
      payment_method: 'pix',
      value_brl: 1850.0,
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Contratos Comerciais
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Acordos contratuais ativos, termos de renovação, vencimento e prazos de carência por cliente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-slate-700 bg-slate-900 p-0.5">
            {([
              { id: 'cards', label: 'Cards', icon: LayoutGrid },
              { id: 'table', label: 'Tabela', icon: List },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                aria-pressed={view === id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  view === id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          {can('create_contract') && (
            <Button onClick={() => setIsModalOpen(true)} size="sm" variant="primary">
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Contrato
            </Button>
          )}
        </div>
      </div>

      {view === 'cards' && (
        isLoading ? (
          <p className="py-8 text-center text-xs text-slate-500">Carregando contratos...</p>
        ) : contracts.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">Nenhum contrato cadastrado.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {contracts.map((cnt) => {
              const customer = cnt.customer_name || 'Cliente';
              const system = cnt.system_name || 'Sistema';
              return (
                <ContractCard
                  key={cnt.id}
                  data={{
                    id: cnt.id,
                    color: STATUS_COLOR[cnt.status],
                    date: `${cnt.contract_number} · ${new Date(cnt.start_date).toLocaleDateString('pt-BR')}`,
                    title: customer,
                    description: `${system} · ${cnt.plan_name || 'Plano'} · ${formatBRL(cnt.value_brl)}${
                      cnt.billing_cycle === 'monthly' ? '/mês' : cnt.billing_cycle === 'annual' ? '/ano' : '/trim.'
                    }`,
                    progress: termProgress(cnt),
                    avatars: [
                      { alt: customer, initials: initials(customer) },
                      { alt: system, initials: initials(system) },
                    ],
                    countdownText: renewalCountdown(cnt),
                  }}
                  menu={
                    can('create_contract') && (cnt.status === 'active' || cnt.status === 'suspended') ? (
                      <button
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: cnt.id,
                            status: cnt.status === 'active' ? 'suspended' : 'active',
                          })
                        }
                        className="px-2 py-0.5 rounded-full bg-black/20 hover:bg-black/30 text-[11px] font-medium text-white transition-colors cursor-pointer"
                      >
                        {cnt.status === 'active' ? 'Suspender' : 'Reativar'}
                      </button>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        )
      )}

      {/* Contracts Table */}
      {view === 'table' && (
      <div className="rounded-lg bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3 px-4">Contrato</th>
                <th className="py-3 px-4">Cliente Contratante</th>
                <th className="py-3 px-4">Software / Plano</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4">Vencimento / Tolerância</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Carregando contratos...
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Nenhum contrato cadastrado.
                  </td>
                </tr>
              ) : (
                contracts.map((cnt) => (
                  <tr key={cnt.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-medium text-slate-200">{cnt.contract_number}</div>
                      <div className="text-[10px] text-slate-500 uppercase mt-0.5">
                        Início {new Date(cnt.start_date).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {cnt.customer_name}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{cnt.system_name}</div>
                      <div className="text-[11px] text-slate-400">{cnt.plan_name}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-white">
                      {formatBRL(cnt.value_brl)}
                      <span className="text-[10px] text-slate-500 block font-normal">
                        {cnt.billing_cycle === 'monthly' ? '/mês' : '/ano'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>Dia {cnt.due_day} de cada mês</div>
                      <div className="text-[11px] text-slate-500">
                        Aviso até {cnt.grace_period_days}d · bloqueio após {cnt.block_after_days ?? 15}d de atraso
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {cnt.status === 'active' && <Badge variant="success">Ativo</Badge>}
                      {cnt.status === 'past_due' && <Badge variant="danger">Em Atraso</Badge>}
                      {cnt.status === 'trial' && <Badge variant="warning">Em Degustação</Badge>}
                      {cnt.status === 'suspended' && <Badge variant="outline">Suspenso</Badge>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {can('create_contract') && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: cnt.id,
                              status: cnt.status === 'active' ? 'suspended' : 'active',
                            })
                          }
                          className="px-2 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                        >
                          {cnt.status === 'active' ? 'Suspender' : 'Reativar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Modal Novo Contrato */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Formalizar Novo Contrato Comercial"
        description="Associa cliente a um sistema e plano com regras de tolerância financeira."
      >
        <form onSubmit={handleSubmit((d) => createContractMutation.mutate(d))} className="space-y-4">
          <Input
            label="Número do Contrato"
            placeholder="CTR-2026-0001"
            {...register('contract_number')}
            error={errors.contract_number?.message}
          />

          <Select
            label="Cliente Contratante"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Sistema Contratado"
              {...register('system_id')}
              error={errors.system_id?.message}
            >
              <option value="">Selecione o software...</option>
              {systems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>

            <Select
              label="Plano Escolhido"
              {...register('plan_id')}
              error={errors.plan_id?.message}
            >
              <option value="">Selecione o plano...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatBRL(p.price_brl)})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Valor BRL"
              type="number"
              step="0.01"
              {...register('value_brl', { valueAsNumber: true })}
              error={errors.value_brl?.message}
            />
            <Input
              label="Dia do Vencimento"
              type="number"
              min={1}
              max={28}
              {...register('due_day', { valueAsNumber: true })}
              error={errors.due_day?.message}
            />
            <Input
              label="Aviso até (dias de atraso)"
              type="number"
              min={0}
              max={30}
              {...register('grace_period_days', { valueAsNumber: true })}
              error={errors.grace_period_days?.message}
            />
          </div>

          <div>
            <Input
              label="Bloquear após (dias de atraso)"
              type="number"
              min={1}
              max={90}
              {...register('block_after_days', { valueAsNumber: true })}
              error={errors.block_after_days?.message}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Entre o aviso e o bloqueio, o sistema do cliente fica em modo somente leitura.
            </p>
          </div>

          <Select
            label="Forma de Pagamento Padrão"
            {...register('payment_method')}
            error={errors.payment_method?.message}
          >
            <option value="pix">PIX Automático</option>
            <option value="boleto">Boleto Bancário</option>
            <option value="credit_card">Cartão de Crédito</option>
          </Select>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting || createContractMutation.isPending}
            >
              Emitir Contrato
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
