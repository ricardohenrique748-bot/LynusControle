import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield,
  Menu,
  X,
  LogOut,
  Users,
  FileCheck2,
  ScrollText,
  Layers,
  DollarSign,
  FileText,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../app/auth-context.tsx';
import { DropdownNavigation, DropdownNavItem } from '../ui/dropdown-navigation.tsx';
import { LynusLogo } from '../ui/lynus-logo.tsx';

const NAV_ITEMS: DropdownNavItem[] = [
  { id: 1, label: 'Painel Executivo', link: '/dashboard' },
  { id: 6, label: 'Agenda', link: '/agenda' },
  {
    id: 2,
    label: 'Comercial',
    subMenus: [
      {
        title: 'Carteira',
        items: [
          { label: 'Clientes', description: 'Cadastro e status da carteira B2B', icon: Users, link: '/customers' },
          { label: 'Propostas', description: 'Propostas comerciais em PDF', icon: ScrollText, link: '/proposals' },
          { label: 'Contratos', description: 'Vigência, reajustes e SLAs', icon: FileCheck2, link: '/contracts' },
        ],
      },
      {
        title: 'Catálogo',
        items: [
          { label: 'Sistemas & Planos', description: 'Produtos, módulos e preços', icon: Layers, link: '/systems' },
        ],
      },
    ],
  },
  { id: 3, label: 'Licenças', link: '/licenses' },
  {
    id: 4,
    label: 'Financeiro',
    subMenus: [
      {
        title: 'Receita',
        items: [
          { label: 'Faturamento & Cobrança', description: 'Faturas, PIX, boletos e conciliação', icon: DollarSign, link: '/finance' },
        ],
      },
      {
        title: 'Fiscal',
        items: [
          { label: 'Fiscal & SPED', description: 'NF-e, NFS-e e obrigações acessórias', icon: FileText, link: '/fiscal' },
        ],
      },
    ],
  },
  {
    id: 5,
    label: 'Administração',
    subMenus: [
      {
        title: 'Governança',
        items: [
          { label: 'Auditoria & RLS', description: 'Trilha de ações e permissões', icon: ShieldCheck, link: '/audit' },
          { label: 'Configuração Supabase', description: 'Conexão, Edge Functions e migrações', icon: Settings, link: '/settings' },
        ],
      },
    ],
  },
];

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export function Navbar({ onToggleMobileMenu, isMobileMenuOpen }: NavbarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
      <div className="flex items-center justify-between gap-4 md:gap-8 px-4 sm:px-6 py-3 max-w-7xl mx-auto">
        {/* Mobile menu button + Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
              aria-label={isMobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <NavLink
            to="/dashboard"
            className="flex items-center shrink-0"
            aria-label="Lynus Control — Painel Executivo"
          >
            <LynusLogo className="h-8 w-auto" />
          </NavLink>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden lg:flex items-center font-medium">
          <DropdownNavigation navItems={NAV_ITEMS} />
        </nav>

        {/* Zone 3: 1 primary action / Role switcher */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 relative">
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              aria-label="Menu do usuário"
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span className="capitalize">{user.role}</span>
              <span className="text-slate-500 text-[10px]">▼</span>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-md bg-slate-900 border border-slate-700 shadow-xl py-1 z-50">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-medium text-slate-100">{user.name}</p>
                  <p className="text-xs text-slate-300 mt-0.5">{user.email}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Admin Global · acesso irrestrito</p>
                </div>
                <div className="mt-1 pt-1">
                  <button
                    onClick={async () => {
                      setShowRoleMenu(false);
                      await signOut();
                      navigate('/login', { replace: true });
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs font-medium text-rose-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
