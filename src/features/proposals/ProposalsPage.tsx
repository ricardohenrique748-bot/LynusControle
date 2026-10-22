import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, Trash2, PencilLine } from 'lucide-react';
import { ProposalsService } from '../../services/proposals.service.ts';
import { ProposalStatus } from '../../types/index.ts';
import { formatBRL } from '../../utils/finance.ts';
import { Button } from '../../components/ui/button.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { useAuth } from '../../app/auth-context.tsx';
import { formatIssueMonth } from './ProposalDocument.tsx';

export const PROPOSAL_STATUS: Record<
  ProposalStatus,
  { label: string; variant: 'default' | 'info' | 'success' | 'danger' }
> = {
  draft: { label: 'Rascunho', variant: 'default' },
  sent: { label: 'Enviada', variant: 'info' },
  accepted: { label: 'Aceita', variant: 'success' },
  rejected: { label: 'Recusada', variant: 'danger' },
};

export function ProposalsPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canEdit = can('create_contract');

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => ProposalsService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: () => ProposalsService.create(),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      navigate(`/proposals/${item.id}`);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => ProposalsService.duplicate(id),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      navigate(`/proposals/${item.id}`);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => ProposalsService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proposals'] }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Propostas Comerciais</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monte propostas a partir do modelo Lynus e gere o PDF pronto para enviar ao cliente.
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => createMutation.mutate()}
            size="sm"
            variant="primary"
            isLoading={createMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Proposta
          </Button>
        )}
      </div>

      {/* Proposals Table */}
      <div className="rounded-lg bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3 px-4">Proposta</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Sistema</th>
                <th className="py-3 px-4 text-right">Licença</th>
                <th className="py-3 px-4 text-right">Mensal</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Carregando propostas...
                  </td>
                </tr>
              ) : proposals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Nenhuma proposta criada.
                  </td>
                </tr>
              ) : (
                proposals.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/proposals/${p.id}`)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-medium text-slate-200">N.º {p.number}</div>
                      <div className="text-[10px] text-slate-500 uppercase mt-0.5">
                        {formatIssueMonth(p.issue_month)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">
                        {p.client_company || <span className="text-amber-400/80 font-normal">Sem cliente</span>}
                      </div>
                      {p.client_contact && (
                        <div className="text-[11px] text-slate-400">Sr.(a) {p.client_contact}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{p.system_name}</div>
                      <div className="text-[11px] text-slate-500 max-w-64 truncate">{p.subtitle}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-white">
                      {formatBRL(p.license_value)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      {formatBRL(p.monthly_value)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={PROPOSAL_STATUS[p.status].variant}>{PROPOSAL_STATUS[p.status].label}</Badge>
                    </td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/proposals/${p.id}`)}
                          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                          title="Abrir"
                          aria-label={`Abrir proposta ${p.number}`}
                        >
                          <PencilLine className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => duplicateMutation.mutate(p.id)}
                              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                              title="Duplicar"
                              aria-label={`Duplicar proposta ${p.number}`}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Excluir a proposta N.º ${p.number}? Esta ação não pode ser desfeita.`)) {
                                  removeMutation.mutate(p.id);
                                }
                              }}
                              className="p-1.5 rounded text-slate-400 hover:text-rose-300 hover:bg-slate-800 cursor-pointer"
                              title="Excluir"
                              aria-label={`Excluir proposta ${p.number}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
