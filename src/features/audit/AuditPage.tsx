import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Search, Filter, History, Key, FileText, DollarSign, Database } from 'lucide-react';
import { AuditService } from '../../services/notifications.service.ts';
import { Badge } from '../../components/ui/badge.tsx';

export function AuditPage() {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: () => AuditService.getAll(),
  });

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      log.action.toLowerCase().includes(term) ||
      log.actor_name.toLowerCase().includes(term) ||
      log.entity_id.toLowerCase().includes(term) ||
      JSON.stringify(log.details).toLowerCase().includes(term);
    const matchType = filterType === 'all' || log.entity_type === filterType;
    return matchSearch && matchType;
  });

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'license':
        return <Key className="w-3.5 h-3.5 text-cyan-400" />;
      case 'invoice':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-400" />;
      case 'fiscal':
        return <FileText className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Database className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Auditoria de Operações & RLS
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Trilha imutável de eventos sensíveis: suspensões de licença, conciliações financeiras e reset de hardware.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por ação, operador ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-md">
          {['all', 'license', 'invoice', 'fiscal', 'customer'].map((ent) => (
            <button
              key={ent}
              onClick={() => setFilterType(ent)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer capitalize ${
                filterType === ent
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {ent === 'all' ? 'Todos os Eventos' : ent}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Timeline */}
      <div className="rounded-lg bg-slate-900 border border-slate-800 divide-y divide-slate-800/80 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Carregando trilha de auditoria...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Nenhum evento registrado com os filtros atuais.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-850/40 transition-colors text-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                    {getEntityIcon(log.entity_type)}
                  </div>
                  <span className="font-mono font-semibold text-cyan-300">
                    {log.action}
                  </span>
                  <Badge variant="outline" className="capitalize">
                    {log.entity_type}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                  <span>IP: {log.ip_address}</span>
                  <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              <div className="pl-8 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500">Operador: </span>
                  <span className="font-medium text-slate-200">{log.actor_name}</span>{' '}
                  <span className="text-slate-500 font-mono">({log.actor_email})</span>
                  <span className="ml-2">
                    <Badge variant="default" className="text-[10px]">
                      {log.actor_role}
                    </Badge>
                  </span>
                </div>
                <div className="text-slate-400 font-mono text-[11px]">
                  ID Alvo: <span className="text-slate-300">{log.entity_id}</span>
                </div>
              </div>

              {/* JSON Details */}
              <div className="ml-8 p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 break-all">
                {JSON.stringify(log.details, null, 2)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
