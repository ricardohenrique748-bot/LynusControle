import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { SystemsService } from '../../services/systems.service.ts';
import { formatBRL } from '../../utils/finance.ts';
import { Badge } from '../../components/ui/badge.tsx';

export function SystemsPage() {
  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => SystemsService.getPlans(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Sistemas & Planos de Assinatura
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Catálogo de softwares gerenciados pelo Lynus Control, versionamento de release e tabelas de preços.
        </p>
      </div>

      {/* Plans Section */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">
          Planos Comerciais & Cotas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-100 text-sm">{plan.name}</h4>
                <Badge variant="outline">{plan.code}</Badge>
              </div>
              <div className="text-xl font-bold font-mono text-white tabular-nums">
                {formatBRL(plan.price_brl)}
                <span className="text-xs font-normal text-slate-500 ml-1">
                  / {plan.billing_cycle === 'monthly' ? 'mês' : 'ano'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Até {plan.max_terminals} terminais simultâneos e {plan.max_users} usuários.
              </p>
              <div className="space-y-1 pt-2 border-t border-slate-800">
                {plan.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
