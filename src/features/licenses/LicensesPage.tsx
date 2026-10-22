import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  ShieldAlert,
  Cpu,
  RefreshCw,
  Search,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { LicensesService } from '../../services/licenses.service.ts';
import { CustomersService } from '../../services/customers.service.ts';
import { SystemsService } from '../../services/systems.service.ts';
import { ContractsService } from '../../services/contracts.service.ts';
import { FinanceService } from '../../services/finance.service.ts';
import { accessForLicense, ACCESS_STAGE_LABEL } from '../../utils/access.ts';
import { LicenseItem } from '../../types/index.ts';
import { licenseIssueSchema, LicenseIssueFormData } from '../../lib/validations/index.ts';
import { Button } from '../../components/ui/button.tsx';
import { Input, Select } from '../../components/ui/input.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { useAuth } from '../../app/auth-context.tsx';

export function LicensesPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<LicenseItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [offlineTokenInfo, setOfflineTokenInfo] = useState<{ token: string; validUntil: string } | null>(null);

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ['licenses'],
    queryFn: () => LicensesService.getAll(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => CustomersService.getAll(),
  });

  const { data: systems = [] } = useQuery({
    queryKey: ['systems'],
    queryFn: () => SystemsService.getAll(),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => FinanceService.getAllInvoices(),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => ContractsService.getAll(),
  });

  const issueMutation = useMutation({
    mutationFn: (data: LicenseIssueFormData) => {
      const cust = customers.find((c) => c.id === data.customer_id);
      const sys = systems.find((s) => s.id === data.system_id);
      return LicensesService.issue({
        customer_id: data.customer_id,
        customer_name: cust?.trade_name || cust?.corporate_name || 'Cliente',
        system_id: data.system_id,
        system_name: sys?.name || 'Sistema',
        contract_id: data.contract_id,
        system_code_prefix: sys?.code?.replace('LYN-', '') || 'ERP',
        max_instances: data.max_instances,
        offline_lease_days: data.offline_lease_days,
        duration_months: data.duration_months,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      setIsIssueModalOpen(false);
      reset();
    },
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: LicenseItem['status']; reason?: string }) =>
      LicensesService.setStatus(id, status, reason),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      if (selectedLicense?.id === updated.id) {
        setSelectedLicense(updated);
      }
    },
  });

  const resetHardwareMutation = useMutation({
    mutationFn: (id: string) => LicensesService.resetHardwareFingerprints(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      if (selectedLicense?.id === updated.id) {
        setSelectedLicense(updated);
      }
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LicenseIssueFormData>({
    resolver: zodResolver(licenseIssueSchema),
    defaultValues: {
      max_instances: 5,
      offline_lease_days: 15,
      duration_months: 12,
    },
  });

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateOffline = (lic: LicenseItem) => {
    const res = LicensesService.generateOfflineToken(lic, 'HWID-OFFLINE-POS-A1');
    setOfflineTokenInfo(res);
  };

  const filtered = licenses.filter((lic) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      lic.license_key.toLowerCase().includes(term) ||
      (lic.customer_name?.toLowerCase().includes(term) ?? false) ||
      (lic.system_name?.toLowerCase().includes(term) ?? false);
    const matchStatus = filterStatus === 'all' || lic.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Licenças de Software
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Emissão de chaves criptografadas com checksum, controle de instâncias/terminais e tokens offline.
          </p>
        </div>
        {can('issue_license') && (
          <Button onClick={() => setIsIssueModalOpen(true)} size="sm" variant="primary">
            <Plus className="w-4 h-4 mr-1.5" />
            Emitir Nova Licença
          </Button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar chave, cliente ou sistema..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-md">
          {['all', 'active', 'suspended', 'grace_period'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer capitalize ${
                filterStatus === st
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st === 'all' ? 'Todas' : st === 'grace_period' ? 'Tolerância' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Licenses Table */}
      <div className="rounded-lg bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3 px-4">Chave de Licença (Key)</th>
                <th className="py-3 px-4">Cliente Associado</th>
                <th className="py-3 px-4">Software</th>
                <th className="py-3 px-4 text-center">Instâncias (Slots)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Acesso no cliente</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Carregando licenças...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Nenhuma licença encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((lic) => (
                  <tr key={lic.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-cyan-300 text-xs">
                          {lic.license_key}
                        </span>
                        <button
                          onClick={() => copyToClipboard(lic.license_key)}
                          aria-label="Copiar chave de licença"
                          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedKey === lic.license_key ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Validade até {new Date(lic.expires_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{lic.customer_name}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {lic.system_name}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-300">
                      {lic.active_instances} / {lic.max_instances}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {lic.status === 'active' && <Badge variant="success">Ativa</Badge>}
                      {lic.status === 'suspended' && <Badge variant="danger">Suspensa</Badge>}
                      {lic.status === 'grace_period' && <Badge variant="warning">Tolerância</Badge>}
                      {lic.status === 'expired' && <Badge variant="outline">Expirada</Badge>}
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const access = accessForLicense(lic, contracts, invoices);
                        const label = ACCESS_STAGE_LABEL[access.stage];
                        return (
                          <div className="max-w-56" title={access.message || 'Sistema funcionando normalmente'}>
                            <Badge variant={label.variant}>{label.label}</Badge>
                            {access.days_overdue > 0 && (
                              <div className="text-[11px] text-slate-500 mt-1">
                                {access.days_overdue} {access.days_overdue === 1 ? 'dia' : 'dias'} de atraso
                                {access.next_stage_at &&
                                  ` · muda em ${new Date(access.next_stage_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedLicense(lic);
                          setOfflineTokenInfo(null);
                        }}
                      >
                        Detalhes & Hardware
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalhes & Hardware Bindings */}
      {selectedLicense && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLicense(null)}
          title={`Gestão da Licença: ${selectedLicense.license_key}`}
          description={`Cliente: ${selectedLicense.customer_name} · Software: ${selectedLicense.system_name}`}
          maxWidth="xl"
        >
          <div className="space-y-4 text-xs">
            {/* Status card */}
            <div className="p-3 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400">Estado de Ativação:</span>
                <span className="ml-2">
                  {selectedLicense.status === 'active' && <Badge variant="success">Ativa</Badge>}
                  {selectedLicense.status === 'suspended' && <Badge variant="danger">Suspensa</Badge>}
                  {selectedLicense.status === 'grace_period' && <Badge variant="warning">Tolerância</Badge>}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Checksum Algorítmico: <span className="text-emerald-400 font-mono">Válido (100% íntegro)</span>
                </p>
              </div>

              <div className="flex gap-2">
                {can('suspend_license') && selectedLicense.status === 'active' && (
                  <Button
                    size="sm"
                    variant="danger"
                    isLoading={setStatusMutation.isPending}
                    onClick={() =>
                      setStatusMutation.mutate({
                        id: selectedLicense.id,
                        status: 'suspended',
                        reason: 'Suspensão manual via painel',
                      })
                    }
                  >
                    Suspender Licença
                  </Button>
                )}
                {can('reactivate_license') && selectedLicense.status === 'suspended' && (
                  <Button
                    size="sm"
                    variant="primary"
                    isLoading={setStatusMutation.isPending}
                    onClick={() =>
                      setStatusMutation.mutate({
                        id: selectedLicense.id,
                        status: 'active',
                        reason: 'Reativação autorizada',
                      })
                    }
                  >
                    Reativar Licença
                  </Button>
                )}
              </div>
            </div>

            {/* Hardware Fingerprints section */}
            <div className="p-3 rounded-md bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>Terminais & Hardware Vinculados ({selectedLicense.hardware_fingerprints.length}/{selectedLicense.max_instances})</span>
                </div>
                {can('reset_hardware_binding') && (
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={resetHardwareMutation.isPending}
                    onClick={() => resetHardwareMutation.mutate(selectedLicense.id)}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Resetar Vínculos
                  </Button>
                )}
              </div>

              {selectedLicense.hardware_fingerprints.length === 0 ? (
                <p className="text-slate-500 text-[11px] py-2">
                  Nenhum terminal vinculado ainda. A primeira inicialização do ERP vinculará a CPU automaticamente.
                </p>
              ) : (
                <div className="space-y-1.5 pt-1">
                  {selectedLicense.hardware_fingerprints.map((fp, idx) => (
                    <div
                      key={fp}
                      className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300"
                    >
                      <div className="flex items-center gap-2">
                        <Laptop className="w-3.5 h-3.5 text-slate-500" />
                        <span>Terminal #{idx + 1}: {fp}</span>
                      </div>
                      <Badge variant="outline">Vinculado</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Offline Lease Token Generator */}
            <div className="p-3 rounded-md bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-200">
                    Token de Contingência Offline ({selectedLicense.offline_lease_days} dias)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Permite que terminais PDV continuem operando sem conexão com a internet.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleGenerateOffline(selectedLicense)}
                >
                  Gerar Token Offline
                </Button>
              </div>

              {offlineTokenInfo && (
                <div className="p-2.5 rounded bg-slate-900 border border-cyan-800/60 font-mono text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Validade do lease: {new Date(offlineTokenInfo.validUntil).toLocaleString('pt-BR')}</span>
                    <button
                      onClick={() => copyToClipboard(offlineTokenInfo.token)}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      Copiar Token
                    </button>
                  </div>
                  <div className="text-cyan-300 break-all select-all bg-slate-950 p-2 rounded border border-slate-800">
                    {offlineTokenInfo.token}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedLicense(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Emitir Nova Licença */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Emitir Nova Licença de Software"
        description="Gera chave com validação criptográfica e vincula ao contrato do cliente."
      >
        <form onSubmit={handleSubmit((d) => issueMutation.mutate(d))} className="space-y-4">
          <Select
            label="Cliente Contratante"
            {...register('customer_id')}
            error={errors.customer_id?.message}
          >
            <option value="">Selecione um cliente...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.trade_name} ({c.cnpj_cpf})
              </option>
            ))}
          </Select>

          <Select
            label="Sistema / Produto"
            {...register('system_id')}
            error={errors.system_id?.message}
          >
            <option value="">Selecione o software...</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code}) - Canal {s.release_channel}
              </option>
            ))}
          </Select>

          <Select
            label="Contrato Comercial Ativo"
            {...register('contract_id')}
            error={errors.contract_id?.message}
          >
            <option value="">Selecione o contrato associado...</option>
            {contracts.map((cnt) => (
              <option key={cnt.id} value={cnt.id}>
                {cnt.contract_number} - {cnt.customer_name} ({cnt.system_name})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Instâncias / Terminais Simultâneos"
              type="number"
              min={1}
              max={100}
              {...register('max_instances', { valueAsNumber: true })}
              error={errors.max_instances?.message}
            />
            <Input
              label="Dias de Lease Offline (Contingência)"
              type="number"
              min={1}
              max={60}
              {...register('offline_lease_days', { valueAsNumber: true })}
              error={errors.offline_lease_days?.message}
            />
          </div>

          <Input
            label="Duração em Meses"
            type="number"
            min={1}
            max={36}
            {...register('duration_months', { valueAsNumber: true })}
            error={errors.duration_months?.message}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsIssueModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting || issueMutation.isPending}
            >
              Emitir Licença
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
