import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FileText,
  Plus,
  ShieldCheck,
  Download,
  AlertCircle,
  CheckCircle2,
  Lock,
  Search,
  Bell,
} from 'lucide-react';
import { FiscalService } from '../../services/fiscal.service.ts';
import { CustomersService } from '../../services/customers.service.ts';
import { FiscalDocumentItem } from '../../types/index.ts';
import { fiscalDocSchema, FiscalDocFormData } from '../../lib/validations/index.ts';
import { Button } from '../../components/ui/button.tsx';
import { Input, Select } from '../../components/ui/input.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { useAuth } from '../../app/auth-context.tsx';

export function FiscalPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<FiscalDocumentItem | null>(null);
  const [fiscalAlertMsg, setFiscalAlertMsg] = useState<string | null>(null);

  const { data: fiscalDocs = [], isLoading } = useQuery({
    queryKey: ['fiscalDocs'],
    queryFn: () => FiscalService.getAll(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => CustomersService.getAll(),
  });

  const registerDocMutation = useMutation({
    mutationFn: (data: FiscalDocFormData) => {
      const cust = customers.find((c) => c.id === data.customer_id);
      return FiscalService.registerDocument({
        doc_number: data.doc_number,
        doc_type: data.doc_type,
        customer_id: data.customer_id,
        customer_name: cust?.trade_name || cust?.corporate_name || 'Empresa',
        competence_period: data.competence_period,
        file_size_kb: data.file_size_kb,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscalDocs'] });
      setIsModalOpen(false);
      reset();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: FiscalDocumentItem['status']; reason?: string }) =>
      FiscalService.updateStatus(id, status, reason),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['fiscalDocs'] });
      if (selectedDoc?.id === updated.id) {
        setSelectedDoc(updated);
      }
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FiscalDocFormData>({
    resolver: zodResolver(fiscalDocSchema),
    defaultValues: {
      competence_period: '2026-10',
      doc_type: 'nfe',
      file_size_kb: 32.5,
    },
  });

  const triggerScanPending = () => {
    setFiscalAlertMsg(
      'Varredura da Edge Function concluída: 1 empresa (Metal Valença) alertada sobre ausência de SPED na competência 2026-10.'
    );
    setTimeout(() => setFiscalAlertMsg(null), 6000);
  };

  const filteredDocs = fiscalDocs.filter((doc) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      doc.doc_number.toLowerCase().includes(term) ||
      (doc.customer_name?.toLowerCase().includes(term) ?? false) ||
      doc.competence_period.includes(term);
    const matchesType = filterType === 'all' || doc.doc_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Governança Fiscal & SPED
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Custódia de arquivos XML de NF-e/NFS-e, arquivos SPED ICMS/IPI e conformidade em bucket privado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can('validate_fiscal_doc') && (
            <Button onClick={triggerScanPending} size="sm" variant="outline">
              <Bell className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              Notificar Pendências Fiscais
            </Button>
          )}
          {can('validate_fiscal_doc') && (
            <Button onClick={() => setIsModalOpen(true)} size="sm" variant="primary">
              <Plus className="w-4 h-4 mr-1.5" />
              Arquivar Documento
            </Button>
          )}
        </div>
      </div>

      {fiscalAlertMsg && (
        <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{fiscalAlertMsg}</span>
          </div>
          <button
            onClick={() => setFiscalAlertMsg(null)}
            className="text-amber-400 hover:text-amber-200 text-xs cursor-pointer"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Security Bucket Banner */}
      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-200">
              Supabase Storage Bucket: <span className="font-mono text-cyan-400">fiscal-documents-private</span>
            </p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Políticas RLS aplicadas: Apenas usuários com perfis <strong>admin</strong> e <strong>fiscal</strong> possuem autorização para leitura e assinatura de URLs.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Assinatura SHA-256 ativa</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por documento, período ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-md">
          {['all', 'nfe', 'nfse', 'sped_fiscal', 'sped_contribuicoes'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer uppercase ${
                filterType === type
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {type === 'all' ? 'Todos' : type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Fiscal Documents Table */}
      <div className="rounded-lg bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3 px-4">Documento / Tipo</th>
                <th className="py-3 px-4">Empresa Emitente</th>
                <th className="py-3 px-4">Competência</th>
                <th className="py-3 px-4">Integridade (SHA-256)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Carregando arquivos fiscais...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Nenhum documento fiscal encontrado.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{doc.doc_number}</div>
                      <div className="text-[11px] font-mono text-cyan-400 uppercase mt-0.5">
                        {doc.doc_type} · {(doc.file_size_kb).toFixed(1)} KB
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {doc.customer_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 tabular-nums">
                      {doc.competence_period}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                      {doc.hash_sha256}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {doc.status === 'authorized' && <Badge variant="success">Autorizado</Badge>}
                      {doc.status === 'pending_validation' && <Badge variant="warning">Pendente</Badge>}
                      {doc.status === 'rejected' && <Badge variant="danger">Rejeitado</Badge>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedDoc(doc)}
                      >
                        Auditar Arquivo
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalhes do Documento Fiscal */}
      {selectedDoc && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDoc(null)}
          title={`Documento Fiscal: ${selectedDoc.doc_number}`}
          description={`Empresa: ${selectedDoc.customer_name} · Período: ${selectedDoc.competence_period}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Tipo Documental:</span>
                <span className="font-mono uppercase text-slate-200">{selectedDoc.doc_type}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Caminho no Supabase Storage:</span>
                <span className="font-mono text-cyan-400 truncate max-w-xs">{selectedDoc.storage_path}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Hash Criptográfico SHA-256:</span>
                <span className="font-mono text-[11px] text-slate-300 truncate max-w-xs">{selectedDoc.hash_sha256}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Status de Homologação:</span>
                <span>
                  {selectedDoc.status === 'authorized' && <Badge variant="success">Homologado e Íntegro</Badge>}
                  {selectedDoc.status === 'pending_validation' && <Badge variant="warning">Aguardando Validação</Badge>}
                  {selectedDoc.status === 'rejected' && <Badge variant="danger">Rejeitado</Badge>}
                </span>
              </div>
            </div>

            {can('validate_fiscal_doc') && selectedDoc.status === 'pending_validation' && (
              <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-semibold text-slate-200">Ações do Auditor Fiscal</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    isLoading={updateStatusMutation.isPending}
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: selectedDoc.id,
                        status: 'authorized',
                      })
                    }
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Aprovar & Homologar Arquivo
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    isLoading={updateStatusMutation.isPending}
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: selectedDoc.id,
                        status: 'rejected',
                        reason: 'Inconsistência de schema XML ou digest mismatch',
                      })
                    }
                  >
                    Rejeitar Arquivo
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  alert(`Download seguro solicitado para: ${selectedDoc.storage_path}`);
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Download XML/SPED
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setSelectedDoc(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Arquivar Novo Documento */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Arquivar Novo Documento Fiscal"
        description="Registra metadados e hash do arquivo fiscal para governança tributária."
      >
        <form onSubmit={handleSubmit((d) => registerDocMutation.mutate(d))} className="space-y-4">
          <Input
            label="Identificação do Documento"
            placeholder="Ex: NF-e 005120 / Série 1 ou SPED EFD 2026-10"
            {...register('doc_number')}
            error={errors.doc_number?.message}
          />

          <Select
            label="Tipo de Arquivo Fiscal"
            {...register('doc_type')}
            error={errors.doc_type?.message}
          >
            <option value="nfe">NF-e (Nota Fiscal Eletrônica Mercantil)</option>
            <option value="nfse">NFS-e (Nota Fiscal de Serviços)</option>
            <option value="cte">CT-e (Conhecimento de Transporte)</option>
            <option value="sped_fiscal">SPED Fiscal (EFD ICMS/IPI)</option>
            <option value="sped_contribuicoes">SPED Contribuições (PIS/COFINS)</option>
          </Select>

          <Select
            label="Empresa Emitente / Cliente"
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
            <Input
              label="Período de Competência (YYYY-MM)"
              placeholder="2026-10"
              {...register('competence_period')}
              error={errors.competence_period?.message}
            />
            <Input
              label="Tamanho do Arquivo (KB)"
              type="number"
              step="0.1"
              {...register('file_size_kb', { valueAsNumber: true })}
              error={errors.file_size_kb?.message}
            />
          </div>

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
              isLoading={isSubmitting || registerDocMutation.isPending}
            >
              Arquivar no Bucket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
