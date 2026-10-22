import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign,
  KeyRound,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { CustomersService } from '../../services/customers.service.ts';
import { ContractsService } from '../../services/contracts.service.ts';
import { LicensesService } from '../../services/licenses.service.ts';
import { FinanceService } from '../../services/finance.service.ts';
import { FiscalService } from '../../services/fiscal.service.ts';
import { calculateMRR, formatBRL, evaluateDelinquency } from '../../utils/finance.ts';
import { Badge } from '../../components/ui/badge.tsx';
import { Button } from '../../components/ui/button.tsx';
import KpiCard from '../../components/ui/course-design-cards.tsx';
import { useAuth } from '../../app/auth-context.tsx';

const REVENUE_DATA = [
  { month: 'Mai/26', faturamento: 24500, mrr: 22800 },
  { month: 'Jun/26', faturamento: 26800, mrr: 24100 },
  { month: 'Jul/26', faturamento: 28400, mrr: 25900 },
  { month: 'Ago/26', faturamento: 31200, mrr: 27500 },
  { month: 'Set/26', faturamento: 33900, mrr: 29800 },
  { month: 'Out/26', faturamento: 36200, mrr: 31800 },
];

const pct = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0);

export function DashboardPage() {
  const { can } = useAuth();
  const navigate = useNavigate();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => CustomersService.getAll(),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => ContractsService.getAll(),
  });

  const { data: licenses = [] } = useQuery({
    queryKey: ['licenses'],
    queryFn: () => LicensesService.getAll(),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => FinanceService.getAllInvoices(),
  });

  const { data: fiscalDocs = [] } = useQuery({
    queryKey: ['fiscalDocs'],
    queryFn: () => FiscalService.getAll(),
  });

  const mrr = calculateMRR(contracts);
  const delinquency = evaluateDelinquency(invoices, 5);
  const activeContracts = contracts.filter((c) => c.status === 'active');
  const activeLicenses = licenses.filter((l) => l.status === 'active');
  const suspendedLicenses = licenses.filter((l) => l.status === 'suspended');
  const pendingFiscal = fiscalDocs.filter((d) => d.status === 'pending_validation');

  const systemDistribution = [
    { name: 'ERP Enterprise', count: licenses.filter((l) => l.system_name?.includes('ERP')).length },
    { name: 'PDV Fiscal', count: licenses.filter((l) => l.system_name?.includes('PDV')).length },
    { name: 'WMS Logistics', count: licenses.filter((l) => l.system_name?.includes('WMS')).length },
    { name: 'Analytics BI', count: licenses.filter((l) => l.system_name?.includes('BI')).length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Painel Executivo Lynus Control
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas consolidadas de contratos, chaves de ativação, faturamento e conformidade fiscal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can('issue_license') && (
            <Link to="/licenses">
              <Button size="sm" variant="primary">
                Emitir Licença
              </Button>
            </Link>
          )}
          {can('create_charge') && (
            <Link to="/finance">
              <Button size="sm" variant="secondary">
                Nova Cobrança
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          data={{
            id: 'mrr',
            color: 'green',
            date: 'MRR Recorrente',
            title: <span className="text-2xl font-mono tabular-nums">{formatBRL(mrr)}</span>,
            description: `${activeContracts.length} contratos ativos`,
            progress: pct(activeContracts.length, contracts.length),
            progressCaption: 'Ativos',
            footerText: (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                +14.2% vs mês anterior
              </span>
            ),
            countdownText: 'Contratos',
          }}
          menu={<DollarSign className="w-5 h-5 text-white/85" />}
          onCountdownClick={() => navigate('/contracts')}
        />

        <KpiCard
          data={{
            id: 'licenses',
            color: 'blue',
            date: 'Licenças em Operação',
            title: (
              <span className="text-2xl font-mono tabular-nums">
                {activeLicenses.length}
                <span className="text-sm font-normal text-white/70 ml-1">/ {licenses.length} total</span>
              </span>
            ),
            description: `${suspendedLicenses.length} suspensas por bloqueio`,
            progress: pct(activeLicenses.length, licenses.length),
            progressCaption: 'Ativas',
            countdownText: 'Ver licenças',
          }}
          menu={<KeyRound className="w-5 h-5 text-white/85" />}
          onCountdownClick={() => navigate('/licenses')}
        />

        <KpiCard
          data={{
            id: 'overdue',
            color: 'orange',
            date: 'Faturas Vencidas',
            title: <span className="text-2xl font-mono tabular-nums">{formatBRL(delinquency.totalOverdueBRL)}</span>,
            description: `${delinquency.overdueCount} títulos em aberto`,
            progress: pct(delinquency.overdueCount, invoices.length),
            progressCaption: 'Do total',
            countdownText: 'Cobranças',
          }}
          menu={<AlertTriangle className="w-5 h-5 text-white/85" />}
          onCountdownClick={() => navigate('/finance')}
        />

        <KpiCard
          data={{
            id: 'fiscal',
            color: 'red',
            date: 'Validações Fiscais',
            title: (
              <span className="text-2xl font-mono tabular-nums">
                {fiscalDocs.length}
                <span className="text-sm font-normal text-white/70 ml-1">arquivos</span>
              </span>
            ),
            description: `${pendingFiscal.length} aguardando homologação`,
            progress: pct(fiscalDocs.length - pendingFiscal.length, fiscalDocs.length),
            progressCaption: 'Validados',
            countdownText: 'Fiscal',
          }}
          menu={<FileText className="w-5 h-5 text-white/85" />}
          onCountdownClick={() => navigate('/fiscal')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolution Chart */}
        <div className="lg:col-span-2 p-5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Evolução de Faturamento & MRR
              </h2>
              <p className="text-xs text-slate-400">Histórico semestral em Reais (BRL)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500" /> Faturamento
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" /> MRR Base
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} width={60} tickFormatter={(v) => `R$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 6, fontSize: 12 }}
                  formatter={(value: any) => [formatBRL(Number(value)), 'Valor']}
                />
                <Area type="monotone" dataKey="faturamento" stroke="#06b6d4" fillOpacity={1} fill="url(#colorFat)" />
                <Area type="monotone" dataKey="mrr" stroke="#6366f1" fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Systems Distribution */}
        <div className="p-5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Instalações por Sistema
            </h2>
            <p className="text-xs text-slate-400">Distribuição de licenças ativas</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={systemDistribution} layout="vertical" margin={{ top: 10, right: 15, left: 15, bottom: 0 }}>
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 6, fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Critical Operational Attention Items */}
      <div className="p-5 rounded-lg bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Fila de Ações Críticas & Auditoria Automática
            </h2>
          </div>
          <Link to="/audit" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
            Ver Trilha Completa
          </Link>
        </div>

        <div className="space-y-2.5">
          {suspendedLicenses.length > 0 && (
            <div className="flex items-center justify-between p-3 rounded-md bg-rose-950/20 border border-rose-900/40 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <p className="font-semibold text-rose-200">
                    {suspendedLicenses.length} licença(s) em bloqueio de inadimplência
                  </p>
                  <p className="text-rose-400 text-[11px] mt-0.5">
                    Cliente Metal Valença com fatura pendente há mais de 5 dias.
                  </p>
                </div>
              </div>
              <Link to="/licenses">
                <Button size="sm" variant="danger">
                  Gerenciar Licença
                </Button>
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-md bg-slate-950 border border-slate-800 text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-medium text-slate-200">
                  Conciliação automática PIX e Boleto em execução
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Webhook do gateway processando retornos com unblocking imediato de terminais.
                </p>
              </div>
            </div>
            <Link to="/finance">
              <Button size="sm" variant="outline">
                Painel Financeiro
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
