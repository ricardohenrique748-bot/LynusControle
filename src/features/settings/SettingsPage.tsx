import React, { useState } from 'react';
import { Database, ShieldCheck, Zap, Server, Terminal, RotateCcw, CheckCircle2, Lock } from 'lucide-react';
import { isSupabaseConnected, localStore } from '../../lib/supabase.ts';
import { Button } from '../../components/ui/button.tsx';
import { Badge } from '../../components/ui/badge.tsx';

export function SettingsPage() {
  const [resetDone, setResetDone] = useState(false);

  const edgeFunctions = [
    {
      name: 'license-check',
      route: '/functions/v1/license-check',
      purpose: 'Consultado pelos sistemas dos clientes: libera, avisa, deixa somente leitura ou bloqueia por inadimplência (resposta assinada).',
      status: 'active',
    },
    {
      name: 'payment-webhook',
      route: '/functions/v1/payment-webhook',
      purpose: 'Recebe a confirmação de pagamento do banco (assinatura HMAC obrigatória) e reativa licenças suspensas por inadimplência.',
      status: 'active',
    },
    {
      name: 'create-charge',
      route: '/functions/v1/create-charge',
      purpose: 'Emissão de cobranças PIX/Boleto. Restrita a usuários Admin e Financeiro.',
      status: 'active',
    },
    {
      name: 'reconcile-payments',
      route: '/functions/v1/reconcile-payments',
      purpose: 'Job diário (protegido por CRON_SECRET): marca faturas vencidas e suspende licenças após o prazo de bloqueio do contrato.',
      status: 'active',
    },
    {
      name: 'manage-license',
      route: '/functions/v1/manage-license',
      purpose: 'Emissão, suspensão/reativação manual e reset de instalações. Restrita a Admin, Suporte e Financeiro.',
      status: 'active',
    },
    {
      name: 'notify-fiscal-pending',
      route: '/functions/v1/notify-fiscal-pending',
      purpose: 'Job (protegido por CRON_SECRET) que avisa clientes sem entrega de SPED Fiscal antes do fechamento SEFAZ.',
      status: 'active',
    },
  ];

  const handleReset = () => {
    if (confirm('Deseja restaurar os dados de demonstração iniciais do Lynus Control?')) {
      localStore.resetToDefault();
      setResetDone(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Configurações de Infraestrutura & Supabase
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Diagnóstico de conexão, Edge Functions ativas, esquemas de migração SQL e governança RLS.
        </p>
      </div>

      {/* Connection Card */}
      <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Supabase Backend Engine
              </h3>
              <p className="text-xs text-slate-400">
                {isSupabaseConnected
                  ? 'Conectado à instância em nuvem do Supabase'
                  : 'Modo Sandbox Resiliente Ativo (Dados persistidos com segurança local)'}
              </p>
            </div>
          </div>
          <div>
            {isSupabaseConnected ? (
              <Badge variant="success">Produção / Conectado</Badge>
            ) : (
              <Badge variant="info">Sandbox Demonstrativo</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-500 block text-[11px]">VITE_SUPABASE_URL</span>
            <span className="font-mono text-slate-300 break-all">
              {import.meta.env.VITE_SUPABASE_URL || 'https://mock.supabase.co (preencha no .env)'}
            </span>
          </div>
          <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-500 block text-[11px]">VITE_SUPABASE_ANON_KEY (Chave Pública)</span>
            <span className="font-mono text-slate-300 truncate block">
              {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'eyJhbGciOiJIUzI1Ni... (Configurada)' : 'Anon Key pública segura'}
            </span>
          </div>
        </div>
      </div>

      {/* Edge Functions Directory */}
      <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-100">
            Supabase Edge Functions Configuradas
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Operações privilegiadas e tarefas agendadas em Deno / TypeScript isoladas do frontend Vite:
        </p>

        <div className="space-y-2">
          {edgeFunctions.map((fn) => (
            <div
              key={fn.name}
              className="p-3 rounded bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-cyan-300">{fn.name}</span>
                  <span className="font-mono text-[10px] text-slate-500">{fn.route}</span>
                </div>
                <p className="text-[11px] text-slate-400">{fn.purpose}</p>
              </div>
              <Badge variant="success">Deploy Pronto</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* SQL Migration Blueprint */}
      <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Esquema de Migração SQL Supabase
            </h3>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            supabase/migrations/20261018000001_initial_lynus_schema.sql
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Tabelas criadas com Row Level Security (RLS) mandatória: <code>profiles</code>, <code>systems</code>, <code>plans</code>, <code>customers</code>, <code>contracts</code>, <code>licenses</code>, <code>invoices</code>, <code>fiscal_documents</code>, <code>audit_logs</code>, <code>notifications</code>.
        </p>

        <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5 font-mono text-[11px]">
          <p className="text-emerald-400">-- RLS Security Rule Summary:</p>
          <p className="text-slate-400">CREATE POLICY "Admin e Financeiro gerenciam faturamento" ON public.invoices FOR ALL USING (public.current_user_role() IN ('admin', 'finance'));</p>
          <p className="text-slate-400">CREATE POLICY "Admin e Suporte emitem licenças" ON public.licenses FOR INSERT WITH CHECK (public.current_user_role() IN ('admin', 'support'));</p>
          <p className="text-slate-400">CREATE POLICY "Acesso a documentos fiscais apenas por admin e fiscal" ON storage.objects ...</p>
        </div>
      </div>

      {/* Maintenance & Reset */}
      <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-100">
            Restaurar Dados de Teste
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Volta todas as licenças, faturas, contratos e clientes ao estado inicial pré-configurado.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleReset}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Restaurar Demonstração
        </Button>
      </div>
    </div>
  );
}
