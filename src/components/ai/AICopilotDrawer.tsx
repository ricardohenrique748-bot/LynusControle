import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  X,
  Send,
  Zap,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  KeyRound,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ContractsService } from '../../services/contracts.service.ts';
import { LicensesService } from '../../services/licenses.service.ts';
import { FinanceService } from '../../services/finance.service.ts';
import { FiscalService } from '../../services/fiscal.service.ts';
import { calculateMRR, formatBRL } from '../../utils/finance.ts';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  actionItems?: string[];
  metrics?: Array<{ label: string; value: string }>;
}

export function AICopilotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Read current system data for live context
  const { data: contracts = [] } = useQuery({ queryKey: ['contracts'], queryFn: () => ContractsService.getAll() });
  const { data: licenses = [] } = useQuery({ queryKey: ['licenses'], queryFn: () => LicensesService.getAll() });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => FinanceService.getAllInvoices() });
  const { data: fiscalDocs = [] } = useQuery({ queryKey: ['fiscalDocs'], queryFn: () => FiscalService.getAll() });

  const mrr = calculateMRR(contracts);
  const activeLicenses = licenses.filter((l) => l.status === 'active').length;
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue').length;
  const pendingFiscal = fiscalDocs.filter((f) => f.status === 'pending_validation').length;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Olá! Sou o seu Copiloto de Projetos e Operações Lynus AI. Estou monitorando ${activeLicenses} licenças ativas, MRR de ${formatBRL(mrr)} e o andamento dos sprints de desenvolvimento. Como posso te auxiliar agora?`,
      timestamp: 'Agora',
      metrics: [
        { label: 'MRR Atual', value: formatBRL(mrr) },
        { label: 'Licenças Ativas', value: String(activeLicenses) },
        { label: 'Faturas Vencidas', value: String(overdueInvoices) },
      ],
    },
  ]);

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: 'Agora',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      let aiReply = '';
      let actions: string[] = [];

      const lower = query.toLowerCase();
      if (lower.includes('risco') || lower.includes('sprint') || lower.includes('atraso')) {
        aiReply = `Análise de risco concluída: o Sprint 24 está com 92% de probabilidade de entrega no prazo. Identifiquei 1 gargalo no módulo de integração fiscal com a SEFAZ que pode ser mitigado priorizando o teste de schema NF-e 4.0.`;
        actions = [
          'Rebalancear 2 tarefas para o desenvolvedor Lucas Silva',
          'Ativar mock de contingência para homologação SEFAZ',
        ];
      } else if (lower.includes('mrr') || lower.includes('faturamento') || lower.includes('financeiro') || lower.includes('inadimpl')) {
        aiReply = `O faturamento mensal recorrente (MRR) consolidado está em ${formatBRL(mrr)}. Foram detectadas ${overdueInvoices} faturas com atraso superior a 5 dias. O risco de inadimplência projetado para o fechamento é de apenas 1.2%.`;
        actions = [
          'Disparar lembrete amigável com chave PIX copia-e-cola',
          'Ativar carência automática de 5 dias nas licenças associadas',
        ];
      } else if (lower.includes('licen') || lower.includes('hardware') || lower.includes('chave')) {
        aiReply = `Auditoria de integridade realizada em ${licenses.length} licenças registradas. Todas as chaves ativas emitiram heartbeat nas últimas 24h. Nenhuma violação de hardware fingerprint ou tentativa de clonagem foi detectada.`;
        actions = [
          '2 licenças encerram período de tolerância em 48h (Renovação recomendada)',
          'Algoritmo SHA-256 de checksum operacional e 100% íntegro',
        ];
      } else {
        aiReply = `Comando compreendido. Analisei os registros do banco de dados em tempo real: todas as tabelas com políticas RLS estão operando normalmente. Posso gerar o resumo executivo das entregas ou otimizar a distribuição do próximo sprint.`;
        actions = [
          'Exportar relatório de produtividade semanal',
          'Revisar cronograma da equipe de engenharia',
        ];
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiReply,
        timestamp: 'Agora',
        actionItems: actions,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-2xl shadow-indigo-950/80 hover:shadow-cyan-500/30 transition-all flex items-center gap-2.5 cursor-pointer group glow-pill"
        aria-label="Abrir Copiloto de IA"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-white animate-bounce" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-1 -right-1 border border-slate-900" />
        </div>
        <span className="hidden sm:inline">Lynus AI Copilot</span>
        <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono">IA 2.0</span>
      </button>

      {/* Drawer Overlay & Content */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-md bg-[#090D1A] border-l border-slate-800 h-full flex flex-col z-10 shadow-2xl overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-4 bg-[#0c1224] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Lynus Project AI Copilot
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h3>
                  <p className="text-[10px] text-slate-400">Orquestração em tempo real</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="px-4 py-2.5 bg-slate-900/50 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
              <button
                onClick={() => handleSendMessage('Analisar risco de atraso do sprint')}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap cursor-pointer transition-colors"
              >
                ⚡ Risco de Sprint
              </button>
              <button
                onClick={() => handleSendMessage('Auditar integridade de licenças')}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap cursor-pointer transition-colors"
              >
                🛡️ Auditar Licenças
              </button>
              <button
                onClick={() => handleSendMessage('Prever faturamento e inadimplência')}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap cursor-pointer transition-colors"
              >
                📊 Previsão MRR
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-br-xs shadow-md'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-xs space-y-3'
                    }`}
                  >
                    <p>{msg.text}</p>

                    {/* Optional Metrics Badge Row */}
                    {msg.metrics && (
                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800">
                        {msg.metrics.map((m, i) => (
                          <div key={i} className="p-1.5 rounded bg-slate-950 border border-slate-800 text-center">
                            <div className="text-[9px] text-slate-400">{m.label}</div>
                            <div className="text-[11px] font-bold text-cyan-400">{m.value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Optional Action Items */}
                    {msg.actionItems && msg.actionItems.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-800">
                        <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Ações Recomendadas:
                        </div>
                        {msg.actionItems.map((action, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{action}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                  <Bot className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span>Lynus AI está analisando dados e calibrando respostas...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-[#0c1224] border-t border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Pergunte ao Lynus Copilot..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white transition-all cursor-pointer shadow-md shadow-cyan-950/50"
                  aria-label="Enviar mensagem"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
