/**
 * AI Project Management Assistant Service
 * Provides intelligent simulation and data analysis for project planning,
 * license health, risk anticipation, and team capacity.
 */

export interface AISimulationPreset {
  id: string;
  category: 'sprint' | 'risk' | 'finance' | 'license';
  label: string;
  iconName: string;
  prompt: string;
  response: {
    title: string;
    summary: string;
    confidence: number;
    metrics: Array<{ label: string; value: string; change?: string; positive?: boolean }>;
    tasks: Array<{ title: string; assignee: string; priority: 'P1' | 'P2' | 'P3'; status: string; risk: string }>;
    insights: string[];
  };
}

export const AI_PRESETS: AISimulationPreset[] = [
  {
    id: 'sprint-auto',
    category: 'sprint',
    label: 'Planejamento Preditivo de Sprint',
    iconName: 'Sparkles',
    prompt: 'Otimizar distribuição do Sprint 24 considerando a entrega do módulo SPED Fiscal e lançamento WMS',
    response: {
      title: 'Plano do Sprint 24 Otimizado por IA',
      summary: 'Baseado na velocidade média dos últimos 4 sprints (48 pts/semana), a IA rebalanceou 6 tarefas críticas, eliminando 14 horas de retrabalho potencial.',
      confidence: 98.4,
      metrics: [
        { label: 'Capacidade Alocada', value: '92%', change: '+8% eficiência', positive: true },
        { label: 'Risco de Atraso', value: '4.2%', change: '-18% vs anterior', positive: true },
        { label: 'Previsão de Conclusão', value: '28 Out 2026', change: '2 dias adiantado', positive: true },
      ],
      tasks: [
        { title: 'Validação de Schema NF-e 4.0 & Assinatura Digital', assignee: 'Lucas Silva', priority: 'P1', status: 'Em Análise', risk: 'Baixo' },
        { title: 'Conector de Sincronismo Offline WMS com Edge DB', assignee: 'Mariana Costa', priority: 'P1', status: 'Distribuída', risk: 'Moderado' },
        { title: 'Auditoria de Chaves de Licença com Hardware Fingerprint', assignee: 'Felipe Rocha', priority: 'P2', status: 'Pronta p/ Dev', risk: 'Muito Baixo' },
        { title: 'Migração de Queries de Faturamento para RLS Supabase', assignee: 'Beatriz Lima', priority: 'P2', status: 'Otimizada', risk: 'Baixo' },
      ],
      insights: [
        'A dependência técnica do módulo fiscal foi resolvida com mock de homologação.',
        'Recomendado manter Mariana Costa focada exclusivamente no conector offline durante as primeiras 48h.',
        'Gargalo potencial na aprovação de homologação SEFAZ mitigado com fila assíncrona.',
      ],
    },
  },
  {
    id: 'risk-prevention',
    category: 'risk',
    label: 'Detecção Antecipada de Gargalos',
    iconName: 'ShieldAlert',
    prompt: 'Identificar riscos de sobrecarga de desenvolvedores e atrasos em contratos enterprise no trimestre',
    response: {
      title: 'Diagnóstico Preditivo de Riscos Operacionais',
      summary: 'Detectamos que 2 engenheiros sêniores estão com 114% de alocação de capacidade para a próxima semana devido a 3 licenças customizadas simultâneas.',
      confidence: 96.2,
      metrics: [
        { label: 'Gargalos Críticos', value: '2 detectados', change: 'Ação imediata recomendada', positive: false },
        { label: 'Tempo Poupado c/ IA', value: '18.5 hrs', change: '+35%', positive: true },
        { label: 'Taxa de Retenção', value: '99.1%', change: 'Estável', positive: true },
      ],
      tasks: [
        { title: 'Desmembrar customização PDV Atacadão em 2 entregas parciais', assignee: 'IA Co-pilot', priority: 'P1', status: 'Ação Sugerida', risk: 'Crítico' },
        { title: 'Ativar fallback automático de licença em modo carência 5 dias', assignee: 'DevOps / Suporte', priority: 'P2', status: 'Automatizado', risk: 'Mitigado' },
        { title: 'Reequilíbrio de chamados técnicos de nível 3', assignee: 'Gestor Técnico', priority: 'P2', status: 'Sugerido', risk: 'Médio' },
      ],
      insights: [
        'Ao dividir a entrega do PDV Atacadão, o risco de atraso cai de 42% para apenas 6%.',
        'Contrato #LNC-2026-089 possui cláusula de SLA com risco mitigado após ajuste de carência.',
      ],
    },
  },
  {
    id: 'finance-predict',
    category: 'finance',
    label: 'Previsão de Receita & Inadimplência',
    iconName: 'TrendingUp',
    prompt: 'Projetar MRR e fluxo de caixa dos próximos 90 dias com base em renovações contratuais e carências ativas',
    response: {
      title: 'Projeção Financeira & Churn Preventivo',
      summary: 'Previsão de crescimento de MRR de R$ 36.200 para R$ 44.500 no próximo trimestre, impulsionado por 8 renovações de planos Enterprise e 14 novos PDVs.',
      confidence: 95.8,
      metrics: [
        { label: 'MRR Projetado', value: 'R$ 44.500', change: '+22.9%', positive: true },
        { label: 'Inadimplência Projetada', value: '1.4%', change: '-0.8% histórico', positive: true },
        { label: 'LTV Médio por Cliente', value: 'R$ 18.900', change: '+12%', positive: true },
      ],
      tasks: [
        { title: 'Disparo de aviso prévio PIX para 4 faturas com vencimento em D-3', assignee: 'Automação Financeira', priority: 'P1', status: 'Agendado', risk: 'Baixo' },
        { title: 'Negociação automática de parcelamento para cliente Metalúrgica Vale', assignee: 'Assistente Financeiro', priority: 'P2', status: 'Em Curso', risk: 'Controlado' },
      ],
      insights: [
        '88% dos pagantes em dia utilizam conciliação automática via PIX estático com webhook instantâneo.',
        'A antecipação de faturas anuais com 10% de desconto gerou injeção de liquidez imediata.',
      ],
    },
  },
  {
    id: 'license-audit',
    category: 'license',
    label: 'Auditoria Inteligente de Hardware & Ativações',
    iconName: 'KeyRound',
    prompt: 'Escanear 120 chaves criptográficas ativas e detectar possíveis clonagens de terminal',
    response: {
      title: 'Auditoria Automatizada de Licenciamento',
      summary: 'Todas as 120 chaves de ativação foram verificadas. 118 licenças íntegras, 1 em período de tolerância legítima e 1 suspeita de duplo fingerprint bloqueada.',
      confidence: 99.7,
      metrics: [
        { label: 'Integridade Global', value: '99.2%', change: 'Conforme', positive: true },
        { label: 'Heartbeats 24h', value: '98.9%', change: 'Excelente', positive: true },
        { label: 'Bloqueios Preventivos', value: '1 terminal', change: 'Risco zero', positive: true },
      ],
      tasks: [
        { title: 'Requisitar confirmação biométrica/token para terminal duplicado', assignee: 'Segurança B2B', priority: 'P1', status: 'Bloqueado', risk: 'Seguro' },
        { title: 'Emitir extensão de lease offline 7 dias para filial remota', assignee: 'Suporte N2', priority: 'P3', status: 'Concluído', risk: 'Zero' },
      ],
      insights: [
        'Nenhum vazamento de chave de API ou bypass de RLS foi detectado nos logs de auditoria.',
        'Algoritmo SHA-256 de verificação de payload local reduziu consultas de heartbeat em 64%.',
      ],
    },
  },
];
