import { ProposalItem, ProposalSection } from '../../types/index.ts';

// Default content of a new proposal, taken from the commercial proposal model
// "Proposta comercial Plataforma de Gestão Logística (A5Lu Transporte e Logística)".

let seq = 0;
export function newId(prefix: string) {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

function section(title: string, items: string[], before = '', after = ''): ProposalSection {
  return { id: newId('sec'), title, before, items, after };
}

export const DEFAULT_ABOUT = [
  'A LYNUS é uma empresa de tecnologia focada no desenvolvimento de soluções digitais para gestão operacional, com ênfase em manutenção, frota e processos industriais.',
  'Com experiência prática no setor operacional, a LYNUS nasce com o propósito de transformar a gestão tradicional em uma operação orientada por dados, automação e inteligência.',
].join('\n');

export const DEFAULT_ADJUSTMENT_CLAUSE = [
  'Os valores referentes à mensalidade de suporte, manutenção e atualização do sistema serão reajustados anualmente, a cada período de 12 (doze) meses, contados a partir da data de início do contrato.',
  'O reajuste será realizado com base na variação do IPCA (Índice Nacional de Preços ao Consumidor Amplo), divulgado pelo IBGE, ou por outro índice oficial que venha a substituí-lo.',
  'Na ausência de índice substituto, as partes poderão negociar um novo critério de reajuste, visando a manutenção do equilíbrio econômico-financeiro do contrato.',
].join('\n');

// Mirrors the default access policy (supabase/functions/_shared/access-policy.ts): warning up to 5 days, read-only up to 15, then blocked
export const DEFAULT_SUSPENSION_CLAUSE = [
  'O não pagamento da mensalidade na data de vencimento sujeitará a CONTRATANTE às seguintes medidas, comunicadas por aviso exibido no próprio sistema:',
  'Do 1º ao 5º dia de atraso: o sistema permanecerá em funcionamento normal, com aviso de pendência financeira;',
  'Do 6º ao 15º dia de atraso: o acesso passará ao modo somente leitura, permitindo a consulta das informações, mas não novos lançamentos;',
  'A partir do 16º dia de atraso: o acesso ao sistema e ao aplicativo será suspenso temporariamente.',
  'A suspensão não implica perda ou exclusão de dados, que permanecerão armazenados com segurança. O acesso será restabelecido automaticamente após a confirmação do pagamento dos valores em aberto.',
  'A suspensão do acesso não isenta a CONTRATANTE do pagamento dos valores devidos, acrescidos de multa de 2% (dois por cento) e juros de mora de 1% (um por cento) ao mês.',
].join('\n');

function defaultModules(): ProposalSection[] {
  return [
    section('Gestão de Empresas e Operação', [
      'Cadastro da transportadora;',
      'Cadastro das unidades e centros de custo;',
      'Cadastro dos postos atendidos;',
      'Cadastro de fornecedores e prestadores de serviços;',
      'Configuração de categorias de despesas;',
      'Parametrização dos custos e regras de cálculo.',
    ]),
    section('Gestão de Frota', [
      'Cadastro de caminhões;',
      'Cadastro de carretas;',
      'Cadastro de outros veículos e equipamentos;',
      'Controle por placa;',
      'Quilometragem e histórico de utilização;',
      'Status operacional dos veículos;',
      'Associação entre caminhão e carreta;',
      'Histórico completo por ativo.',
    ]),
    section('Gestão de Motoristas', [
      'Cadastro de motoristas;',
      'Documentação;',
      'Associação do motorista ao veículo;',
      'Histórico de viagens;',
      'Registro de ocorrências;',
      'Controle de atividades realizadas.',
    ]),
    section('Gestão de Viagens e Operação Logística', [
      'Programação de viagens;',
      'Origem e destino;',
      'Posto atendido;',
      'Veículo e carreta utilizados;',
      'Motorista responsável;',
      'Quilometragem inicial e final;',
      'Quilômetros percorridos;',
      'Registro de despesas da viagem;',
      'Pedágios;',
      'Abastecimentos;',
      'Ocorrências;',
      'Histórico das viagens.',
    ]),
    section('Gestão de Manutenção', [
      'Abertura de ordens de serviço;',
      'Manutenção preventiva;',
      'Manutenção corretiva;',
      'Controle de serviços;',
      'Registro de peças utilizadas;',
      'Registro de mão de obra;',
      'Registro de serviços terceirizados;',
      'Histórico de manutenção por placa;',
      'Controle de veículos parados;',
      'Custos por ordem de serviço.',
    ]),
    section('Gestão de Pneus', [
      'Cadastro individual dos pneus;',
      'Controle por número de identificação;',
      'Registro de instalação e retirada;',
      'Posição do pneu no veículo;',
      'Quilometragem;',
      'Custo de aquisição;',
      'Recapagem;',
      'Vida útil;',
      'Motivo da retirada;',
      'Custo por quilômetro;',
      'Histórico por veículo.',
    ]),
    section('Gestão de Peças e Estoque', [
      'Cadastro de peças;',
      'Controle de estoque;',
      'Entrada e saída de materiais;',
      'Fornecedores;',
      'Custo de aquisição;',
      'Aplicação da peça por veículo;',
      'Vinculação com ordens de serviço;',
      'Estoque mínimo;',
      'Histórico de movimentações.',
    ]),
    section(
      'Gestão de Custos',
      [
        'Combustível;',
        'Pneus;',
        'Peças;',
        'Mão de obra;',
        'Manutenção;',
        'Serviços terceirizados;',
        'Pedágios;',
        'Seguros;',
        'Licenciamento;',
        'Depreciação;',
        'Despesas administrativas;',
        'Outras despesas operacionais.',
      ],
      'O sistema permitirá classificar e acompanhar os custos da operação, incluindo:',
      'Os custos poderão ser vinculados diretamente à placa, viagem, conjunto, centro de custo ou posto atendido.'
    ),
    section(
      'Cálculo de Custo por Quilômetro',
      [
        'Custo de combustível por km;',
        'Custo de pneus por km;',
        'Custo de manutenção por km;',
        'Custo de peças por km;',
        'Custo de mão de obra por km;',
        'Custo total por km.',
      ],
      [
        'Um dos principais componentes da solução será o cálculo do custo operacional por quilômetro.',
        'O sistema permitirá parametrizar diferentes componentes de custo e calcular indicadores como: Custo total ÷ quilômetros rodados = custo médio por km.',
        'Também será possível analisar separadamente componentes como:',
      ].join('\n'),
      'Os parâmetros poderão ser ajustados conforme as regras de negócio definidas pela empresa.'
    ),
    section(
      'Aplicativo Android',
      [
        'Login do usuário;',
        'Identificação do motorista;',
        'Visualização de viagens;',
        'Início e encerramento de viagem;',
        'Registro de quilometragem;',
        'Checklists;',
        'Registro de abastecimentos;',
        'Registro de despesas;',
        'Registro de ocorrências;',
        'Solicitação de manutenção;',
        'Registro de fotos;',
        'Envio de comprovantes;',
        'Sincronização com a plataforma.',
      ],
      'O aplicativo será integrado ao sistema web e permitirá o registro das informações diretamente em campo.\nFuncionalidades previstas:',
      'Quando previsto no fluxo da funcionalidade, o aplicativo poderá armazenar informações localmente para posterior sincronização quando houver conexão com a internet.'
    ),
    section(
      'Dashboard e Indicadores',
      [
        'Custo total da frota;',
        'Custo por km;',
        'Km rodados;',
        'Custo por veículo;',
        'Custo por conjunto;',
        'Custo por viagem;',
        'Custo por posto;',
        'Custo de manutenção;',
        'Custo de pneus;',
        'Custo de peças;',
        'Custo de mão de obra;',
        'Consumo de combustível;',
        'Veículos disponíveis;',
        'Veículos parados;',
        'Manutenções preventivas;',
        'Manutenções corretivas.',
      ],
      'O sistema contará com painéis gerenciais para acompanhamento da operação.\nEntre os principais indicadores:'
    ),
    section(
      'Relatórios',
      [
        'Custos por veículo;',
        'Custos por km;',
        'Custos por viagem;',
        'Custos por posto;',
        'Histórico de manutenção;',
        'Pneus;',
        'Peças;',
        'Despesas;',
        'Abastecimentos;',
        'Quilometragem;',
        'Indicadores operacionais.',
      ],
      'Serão disponibilizados relatórios operacionais e gerenciais, permitindo filtros por período, placa, veículo, motorista, posto, categoria de custo, centro de custo e demais parâmetros disponíveis.\nOs relatórios poderão contemplar:'
    ),
    section(
      'Usuários e Permissões',
      ['Administrador;', 'Gestor;', 'Operação;', 'Manutenção;', 'Financeiro;', 'Motorista.'],
      'O sistema contará com controle de acesso por usuário e perfil.\nPoderão ser configurados diferentes níveis de acesso, como:',
      'Cada perfil terá acesso somente às funcionalidades e informações necessárias para sua atividade, conforme parametrização definida pela empresa.'
    ),
    section(
      'Banco de Dados e Infraestrutura',
      [
        'Banco de dados;',
        'Armazenamento de informações;',
        'Controle de acesso;',
        'Backups conforme infraestrutura contratada;',
        'Hospedagem da aplicação;',
        'Comunicação entre sistema web e aplicativo;',
        'Estrutura preparada para evolução da plataforma.',
      ],
      'A solução contará com banco de dados centralizado para armazenamento das informações da operação.\nA infraestrutura contemplará:'
    ),
    section(
      'Histórico e Rastreabilidade',
      [],
      [
        'O sistema manterá o histórico das informações operacionais cadastradas, permitindo consultar a evolução dos custos, manutenções, pneus, peças, viagens e demais registros.',
        'O objetivo é proporcionar rastreabilidade desde o lançamento da informação até sua utilização nos indicadores gerenciais.',
      ].join('\n')
    ),
    section(
      'Integração entre os Módulos',
      [],
      'Os módulos serão integrados entre si.\nPor exemplo:\nManutenção → Peça utilizada → Ordem de serviço → Placa → Quilometragem → Custo do veículo → Custo por km'
    ),
  ];
}

type NewProposalInput = Pick<ProposalItem, 'number'> & Partial<ProposalItem>;

/** Builds a full proposal from the model, overriding any given fields */
export function buildProposalFromTemplate(input: NewProposalInput): ProposalItem {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nowIso = now.toISOString();

  return {
    id: newId('prp'),
    status: 'draft',
    city: 'São José do Rio Preto - SP',
    issue_month: month,
    client_company: '',
    client_contact: '',
    system_name: 'Sistema Lynus',
    platform_name: 'Plataforma LYNUS TECH',
    subtitle: 'Plataforma de Gestão Logística, Frota e Custos Operacionais.',
    letter_body: [
      'Após análise das necessidades operacionais e alinhamento das demandas apresentadas, apresentamos a proposta para fornecimento do LYNUS TECH, uma plataforma digital desenvolvida para gestão completa de operações, com foco em eficiência, controle e tomada de decisão baseada em dados.',
      'Nos colocamos à disposição para quaisquer esclarecimentos adicionais.',
    ].join('\n'),
    about: DEFAULT_ABOUT,
    objective: section(
      'Objetivo da solução',
      [
        'Custo real por quilômetro rodado;',
        'Custo por veículo e por conjunto caminhão + carreta;',
        'Custo por viagem;',
        'Custo por posto atendido;',
        'Custo de manutenção por placa;',
        'Custo e desempenho dos pneus;',
        'Custo de peças e serviços;',
        'Custo de mão de obra;',
        'Quilometragem percorrida;',
        'Consumo de combustível;',
        'Evolução dos custos operacionais.',
      ],
      [
        'Desenvolver e implantar uma plataforma integrada para gestão da operação logística e dos custos da frota, proporcionando à empresa maior controle, rastreabilidade e visibilidade sobre todos os recursos envolvidos no transporte de combustíveis.',
        'A solução terá como principal objetivo identificar e mensurar o custo real da operação, permitindo acompanhar de forma individualizada os gastos com veículos, carretas, pneus, peças, manutenção, mão de obra, combustível, serviços terceirizados, viagens e demais despesas operacionais.',
        'Por meio da integração entre o sistema web e o aplicativo Android, as informações serão registradas diretamente na operação e centralizadas em um único ambiente, possibilitando a geração de indicadores como:',
      ].join('\n'),
      [
        'Dessa forma, a empresa terá uma visão consolidada da operação logística, permitindo identificar onde os recursos estão sendo consumidos, acompanhar desvios de custos, comparar o desempenho dos veículos e utilizar informações confiáveis para apoiar decisões operacionais e financeiras.',
        'A proposta não se limita ao registro de despesas: o objetivo é transformar os dados da operação em informações gerenciais capazes de demonstrar quanto custa efetivamente manter e operar cada veículo, conjunto, viagem e rota da transportadora.',
      ].join('\n')
    ),
    scope_intro: [
      'A solução será composta por uma plataforma integrada de gestão operacional, logística, manutenção e custos, disponibilizada por meio de sistema web e aplicativo Android, com informações centralizadas em banco de dados único.',
      'O sistema será estruturado nos seguintes módulos:',
    ].join('\n'),
    modules: defaultModules(),
    investment_rows: [
      { id: newId('inv'), description: 'Desenvolvimento do Sistema', value: 16000 },
      { id: newId('inv'), description: 'Suporte Mensal (Opcional)', value: null },
      { id: newId('inv'), description: 'Hospedagem Mensal (Opcional)', value: null },
      { id: newId('inv'), description: 'Mensalidade Mensal', value: null },
    ],
    license_value: 16000,
    monthly_value: 8000,
    contract_months: 12,
    adjustment_clause: DEFAULT_ADJUSTMENT_CLAUSE,
    suspension_clause: DEFAULT_SUSPENSION_CLAUSE,
    company: {
      legal_name: 'LYNUS TECNOLOGIA LTDA.',
      cnpj: '68.200.725/0001-67',
      city: 'São José do Rio Preto',
      state: 'São Paulo',
    },
    bank: { bank: 'Nubank', agency: '0001', account: '4012463-3', pix: '68.200.725/0001-67' },
    representative: {
      name: 'Ricardo Henrique Pereira da Luz',
      email: 'ricardoluz@lynustech.com.br',
      phone: '+55 (99) 99175-4230',
    },
    created_at: nowIso,
    updated_at: nowIso,
    ...input,
  };
}

/** Proposal Nº 01 from the original model, used to seed the list */
export function seedProposals(): ProposalItem[] {
  return [
    buildProposalFromTemplate({
      id: 'prp-a5lu-01',
      number: '01',
      status: 'sent',
      issue_month: '2026-09',
      client_company: 'A5Lu Transporte e Logística',
      client_contact: 'Ludmila',
      created_at: '2026-09-15T12:00:00.000Z',
      updated_at: '2026-09-15T12:00:00.000Z',
    }),
  ];
}
