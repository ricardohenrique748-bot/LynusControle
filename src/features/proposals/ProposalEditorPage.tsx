import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Eye,
  FileDown,
  PencilLine,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import { ProposalsService } from '../../services/proposals.service.ts';
import { CustomersService } from '../../services/customers.service.ts';
import { ProposalItem, ProposalSection, ProposalStatus } from '../../types/index.ts';
import { Button } from '../../components/ui/button.tsx';
import { Input, Select } from '../../components/ui/input.tsx';
import { useAuth } from '../../app/auth-context.tsx';
import { ProposalDocument, LETTERHEAD_SRC } from './ProposalDocument.tsx';
import { PROPOSAL_STATUS } from './ProposalsPage.tsx';
import { newId, DEFAULT_SUSPENSION_CLAUSE } from './proposal-template.ts';

const textareaClass =
  'w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 resize-y';

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-300 mb-1.5">{label}</span>
      <textarea className={textareaClass} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

function Group({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-lg bg-slate-900 border border-slate-800">
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none text-sm font-semibold text-slate-200 list-none">
        {title}
        <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4 space-y-3 border-t border-slate-800 pt-3">{children}</div>
    </details>
  );
}

function SectionFields({
  section,
  onChange,
  withTitle = true,
}: {
  section: ProposalSection;
  onChange: (s: ProposalSection) => void;
  withTitle?: boolean;
}) {
  return (
    <div className="space-y-3">
      {withTitle && (
        <Input label="Título" value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} />
      )}
      <TextArea
        label="Texto antes da lista"
        rows={3}
        value={section.before}
        onChange={(before) => onChange({ ...section, before })}
        hint="Cada linha vira um parágrafo."
      />
      <TextArea
        label="Itens da lista"
        rows={5}
        value={section.items.join('\n')}
        onChange={(v) => onChange({ ...section, items: v.split('\n') })}
        hint="Um item por linha."
      />
      <TextArea
        label="Texto depois da lista"
        rows={2}
        value={section.after}
        onChange={(after) => onChange({ ...section, after })}
      />
    </div>
  );
}

function parseMoney(v: string): number | null {
  const clean = v.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (!clean.trim()) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

function MoneyInput({
  label,
  value,
  onChange,
  allowEmpty,
}: {
  label?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  allowEmpty?: boolean;
}) {
  const format = (n: number | null) =>
    n === null ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [text, setText] = useState(format(value));
  useEffect(() => setText(format(value)), [value]);

  return (
    <Input
      label={label}
      inputMode="decimal"
      placeholder={allowEmpty ? '-------- (em branco)' : '0,00'}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const parsed = parseMoney(text);
        const next = parsed === null && !allowEmpty ? 0 : parsed;
        onChange(next);
        setText(format(next));
      }}
    />
  );
}

/** Scales the 210mm preview sheets to fit the available width */
function useFitZoom(ref: React.RefObject<HTMLDivElement | null>, ready: boolean) {
  const [zoom, setZoom] = useState(0.6);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sheetPx = (210 / 25.4) * 96;
    const update = () => {
      // Hidden panel (mobile "Editar" tab) reports 0 width; keep the last zoom
      if (el.clientWidth > 0) setZoom(Math.min(1, (el.clientWidth - 16) / sheetPx));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, ready]);
  return zoom;
}

export function ProposalEditorPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const canEdit = can('create_contract');
  const queryClient = useQueryClient();

  const { data: loaded, isLoading } = useQuery({
    queryKey: ['proposals', id],
    queryFn: () => ProposalsService.getById(id),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => CustomersService.getAll(),
  });

  const [draft, setDraft] = useState<ProposalItem | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'pending'>('saved');
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const previewRef = useRef<HTMLDivElement>(null);
  const zoom = useFitZoom(previewRef, !!draft);

  useEffect(() => {
    if (loaded && draft?.id !== loaded.id) setDraft(loaded);
  }, [loaded, draft?.id]);

  // Autosave shortly after the last change
  useEffect(() => {
    if (!draft || saveState !== 'pending') return;
    const t = window.setTimeout(async () => {
      await ProposalsService.save(draft);
      queryClient.invalidateQueries({ queryKey: ['proposals'], exact: true });
      setSaveState('saved');
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, saveState, queryClient]);

  // Warm the letterhead so it is ready when the print dialog opens
  useEffect(() => {
    const img = new Image();
    img.src = LETTERHEAD_SRC;
  }, []);

  if (isLoading || (loaded && !draft)) {
    return <div className="py-16 text-center text-sm text-slate-500">Carregando proposta...</div>;
  }
  if (!draft) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-slate-400">Proposta não encontrada.</p>
        <Link to="/proposals" className="text-sm text-cyan-400 hover:underline">
          Voltar para propostas
        </Link>
      </div>
    );
  }

  const p = draft;
  const update = (patch: Partial<ProposalItem>) => {
    if (!canEdit) return;
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaveState('pending');
  };
  const updateModule = (idx: number, m: ProposalSection) =>
    update({ modules: p.modules.map((x, i) => (i === idx ? m : x)) });
  const moveModule = (idx: number, dir: -1 | 1) => {
    const next = [...p.modules];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    update({ modules: next });
  };

  const handlePrint = () => {
    const previousTitle = document.title;
    const client = p.client_company.trim() || 'Cliente';
    document.title = `Proposta ${p.number} - ${client}`;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            to="/proposals"
            className="mt-0.5 p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Voltar para propostas"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Proposta N.º {p.number}
              <span className="ml-2 text-slate-400 font-medium">{p.client_company || 'Sem cliente'}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              {saveState === 'pending' ? (
                'Salvando...'
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Alterações salvas
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-36">
            <Select
              aria-label="Status da proposta"
              value={p.status}
              disabled={!canEdit}
              onChange={(e) => update({ status: e.target.value as ProposalStatus })}
              options={Object.entries(PROPOSAL_STATUS).map(([value, s]) => ({ value, label: s.label }))}
            />
          </div>
          <Button onClick={handlePrint} size="md" variant="primary">
            <FileDown className="w-4 h-4" />
            Gerar PDF
          </Button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="xl:hidden flex rounded-md bg-slate-900 border border-slate-800 p-1 text-sm">
        {(
          [
            ['edit', 'Editar', PencilLine],
            ['preview', 'Visualizar', Eye],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setMobileTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded cursor-pointer ${
              mobileTab === key ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)] gap-6 items-start">
        {/* Form */}
        <fieldset
          disabled={!canEdit}
          className={`space-y-3 min-w-0 ${mobileTab === 'edit' ? '' : 'hidden xl:block'}`}
        >
          <Group title="Cliente e capa" defaultOpen>
            {customers.length > 0 && (
              <Select
                label="Preencher com cliente cadastrado"
                value={p.customer_id ?? ''}
                onChange={(e) => {
                  const c = customers.find((x) => x.id === e.target.value);
                  update({
                    customer_id: c?.id,
                    client_company: c ? c.trade_name || c.corporate_name : p.client_company,
                  });
                }}
                options={[
                  { value: '', label: '— Digitar manualmente —' },
                  ...customers.map((c) => ({ value: c.id, label: c.trade_name || c.corporate_name })),
                ]}
              />
            )}
            <Input
              label="Empresa cliente"
              value={p.client_company}
              onChange={(e) => update({ client_company: e.target.value, customer_id: undefined })}
            />
            <Input
              label="Contato (Sr.(a))"
              value={p.client_contact}
              onChange={(e) => update({ client_contact: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="N.º da proposta" value={p.number} onChange={(e) => update({ number: e.target.value })} />
              <Input
                label="Mês de emissão"
                type="month"
                value={p.issue_month}
                onChange={(e) => update({ issue_month: e.target.value })}
              />
            </div>
            <Input label="Cidade" value={p.city} onChange={(e) => update({ city: e.target.value })} />
            <Input label="Sistema" value={p.system_name} onChange={(e) => update({ system_name: e.target.value })} />
            <Input
              label="Plataforma"
              value={p.platform_name}
              onChange={(e) => update({ platform_name: e.target.value })}
            />
            <Input label="Subtítulo" value={p.subtitle} onChange={(e) => update({ subtitle: e.target.value })} />
          </Group>

          <Group title="Carta de apresentação">
            <TextArea
              label="Texto da carta"
              rows={6}
              value={p.letter_body}
              onChange={(letter_body) => update({ letter_body })}
              hint="Cada linha vira um parágrafo."
            />
          </Group>

          <Group title="Sobre e objetivo">
            <TextArea label="Sobre a Lynus Tech" rows={4} value={p.about} onChange={(about) => update({ about })} />
            <SectionFields section={p.objective} onChange={(objective) => update({ objective })} />
          </Group>

          <Group title={`Escopo — ${p.modules.length} módulos`}>
            <TextArea
              label="Introdução do escopo"
              rows={3}
              value={p.scope_intro}
              onChange={(scope_intro) => update({ scope_intro })}
            />
            {p.modules.map((m, i) => (
              <details key={m.id} className="rounded-md border border-slate-800 bg-slate-950/60">
                <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer text-xs font-medium text-slate-200 list-none">
                  <span className="text-slate-500 font-mono w-5">{i + 1}.</span>
                  <span className="flex-1 truncate">{m.title || 'Sem título'}</span>
                  <span className="flex items-center gap-0.5" onClick={(e) => e.preventDefault()}>
                    <button
                      type="button"
                      onClick={() => moveModule(i, -1)}
                      disabled={i === 0}
                      className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-30 cursor-pointer"
                      aria-label="Mover para cima"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveModule(i, 1)}
                      disabled={i === p.modules.length - 1}
                      className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-30 cursor-pointer"
                      aria-label="Mover para baixo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remover o módulo "${m.title}"?`)) {
                          update({ modules: p.modules.filter((_, j) => j !== i) });
                        }
                      }}
                      className="p-1 rounded text-slate-500 hover:text-rose-300 cursor-pointer"
                      aria-label="Remover módulo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </summary>
                <div className="px-3 pb-3 pt-1">
                  <SectionFields section={m} onChange={(next) => updateModule(i, next)} />
                </div>
              </details>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                update({
                  modules: [...p.modules, { id: newId('sec'), title: 'Novo módulo', before: '', items: [], after: '' }],
                })
              }
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar módulo
            </Button>
          </Group>

          <Group title="Investimento e condições">
            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-300">Tabela de investimento</span>
              {p.investment_rows.map((r, i) => (
                <div key={r.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      aria-label="Descrição"
                      value={r.description}
                      onChange={(e) =>
                        update({
                          investment_rows: p.investment_rows.map((x, j) =>
                            j === i ? { ...x, description: e.target.value } : x
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="w-36">
                    <MoneyInput
                      allowEmpty
                      value={r.value}
                      onChange={(value) =>
                        update({
                          investment_rows: p.investment_rows.map((x, j) => (j === i ? { ...x, value } : x)),
                        })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => update({ investment_rows: p.investment_rows.filter((_, j) => j !== i) })}
                    className="mt-1.5 p-1.5 rounded text-slate-500 hover:text-rose-300 cursor-pointer"
                    aria-label="Remover linha"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  update({
                    investment_rows: [...p.investment_rows, { id: newId('inv'), description: '', value: null }],
                  })
                }
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar linha
              </Button>
              <p className="text-[11px] text-slate-500">
                Valor em branco aparece como "--------". O TOTAL soma as linhas com valor.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MoneyInput
                label="Licença (R$)"
                value={p.license_value}
                onChange={(v) => update({ license_value: v ?? 0 })}
              />
              <MoneyInput
                label="Mensalidade (R$)"
                value={p.monthly_value}
                onChange={(v) => update({ monthly_value: v ?? 0 })}
              />
            </div>
            <Input
              label="Duração do contrato (meses)"
              type="number"
              min={1}
              value={p.contract_months}
              onChange={(e) => update({ contract_months: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            />
            <TextArea
              label="Cláusula de reajuste anual"
              rows={5}
              value={p.adjustment_clause}
              onChange={(adjustment_clause) => update({ adjustment_clause })}
            />
            <TextArea
              label="Inadimplência e suspensão do acesso"
              rows={7}
              value={p.suspension_clause ?? DEFAULT_SUSPENSION_CLAUSE}
              onChange={(suspension_clause) => update({ suspension_clause })}
              hint="Linhas terminadas em ';' viram itens de lista. Mantenha os prazos iguais aos do contrato."
            />
          </Group>

          <Group title="Empresa, banco e representante">
            <Input
              label="Razão social"
              value={p.company.legal_name}
              onChange={(e) => update({ company: { ...p.company, legal_name: e.target.value } })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="CNPJ"
                value={p.company.cnpj}
                onChange={(e) => update({ company: { ...p.company, cnpj: e.target.value } })}
              />
              <Input
                label="Cidade"
                value={p.company.city}
                onChange={(e) => update({ company: { ...p.company, city: e.target.value } })}
              />
              <Input
                label="Estado"
                value={p.company.state}
                onChange={(e) => update({ company: { ...p.company, state: e.target.value } })}
              />
              <Input
                label="Banco"
                value={p.bank.bank}
                onChange={(e) => update({ bank: { ...p.bank, bank: e.target.value } })}
              />
              <Input
                label="Agência"
                value={p.bank.agency}
                onChange={(e) => update({ bank: { ...p.bank, agency: e.target.value } })}
              />
              <Input
                label="Conta corrente"
                value={p.bank.account}
                onChange={(e) => update({ bank: { ...p.bank, account: e.target.value } })}
              />
            </div>
            <Input
              label="Chave Pix"
              value={p.bank.pix}
              onChange={(e) => update({ bank: { ...p.bank, pix: e.target.value } })}
            />
            <Input
              label="Representante"
              value={p.representative.name}
              onChange={(e) => update({ representative: { ...p.representative, name: e.target.value } })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="E-mail"
                type="email"
                value={p.representative.email}
                onChange={(e) => update({ representative: { ...p.representative, email: e.target.value } })}
              />
              <Input
                label="Telefone"
                value={p.representative.phone}
                onChange={(e) => update({ representative: { ...p.representative, phone: e.target.value } })}
              />
            </div>
          </Group>
        </fieldset>

        {/* Live preview */}
        <div
          ref={previewRef}
          className={`min-w-0 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg bg-slate-800/40 border border-slate-800 py-4 ${
            mobileTab === 'preview' ? '' : 'hidden xl:block'
          }`}
        >
          <div style={{ zoom }}>
            <ProposalDocument proposal={p} mode="preview" />
          </div>
        </div>
      </div>

      {createPortal(
        <div className="pd-print-root">
          <ProposalDocument proposal={p} mode="print" />
        </div>,
        document.body
      )}
    </div>
  );
}
