import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  KeyRound,
  DollarSign,
  FileText,
  Layers,
  FileCheck2,
  ScrollText,
  ShieldCheck,
  Settings,
  BellRing,
} from 'lucide-react';
import { useAuth } from '../../app/auth-context.tsx';

export function Sidebar() {
  const { user } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Painel Executivo', icon: LayoutDashboard },
    { to: '/agenda', label: 'Agenda de Visitas', icon: CalendarDays },
    { to: '/customers', label: 'Clientes', icon: Users },
    { to: '/licenses', label: 'Licenças de Software', icon: KeyRound },
    { to: '/finance', label: 'Faturamento & Cobrança', icon: DollarSign },
    { to: '/fiscal', label: 'Governança Fiscal', icon: FileText },
    { to: '/systems', label: 'Sistemas & Planos', icon: Layers },
    { to: '/proposals', label: 'Propostas', icon: ScrollText },
    { to: '/contracts', label: 'Contratos', icon: FileCheck2 },
    { to: '/audit', label: 'Auditoria & RLS', icon: ShieldCheck },
    { to: '/settings', label: 'Configuração Supabase', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-57px)]">
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Ambiente B2B</span>
          <span className="font-mono text-cyan-400">v4.8</span>
        </div>
        <div className="mt-2 text-xs font-semibold text-slate-200 truncate">
          {user.name}
        </div>
        <div className="text-[11px] text-slate-500 font-mono capitalize">
          Perfil: {user.role}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors select-none ${
                  isActive
                    ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800/80 bg-slate-900/30">
        <div className="text-[11px] text-slate-500 leading-relaxed">
          <p className="font-semibold text-slate-400">Segurança Lynus</p>
          <p className="mt-0.5">RLS ativo em 10 tabelas com validação em Edge Functions.</p>
        </div>
      </div>
    </aside>
  );
}
