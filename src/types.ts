export interface RegistroBloco1 {
  'DC': string;
  'REG': string;
  'TIPO (Cateira)': string;
  'DR': string;
  'Seq': string;
  'Dc Simulação': string;
  'Orçamento': string;
  'Status Med. Parcial': string;
  'Valor Parcial R$': string;
  'Status Med. Final': string;
  'Valor Final R$': string;
  'Tempo': string;
  'AGING': string;
  'Data Status': string;
  'UF': string;
  'Localidade': string;
  'Tipo de Projeto': string;
  'Descricao': string;
  'Status da DC (Atual)': string;
  'Backlog/Input?': string;
}

export interface RegistroBloco2 {
  'Status Informe (Campo)': string;
  'Resp.Medição': string;
  'Pendência (Implantação)': string;
  'Pendência (Celula Sap)': string;
  'Pendência (Projetos)': string;
  'Data Previsão Entrega (Medição)': string;
  'Data Previsão Entrega (Projeto)': string;
  'Responsavel': string;
  'Data Tratativa': string;
  'OBS (Medição)': string;
}

export interface Registro extends RegistroBloco1, RegistroBloco2 {
  _id?: string;
  _updatedAt?: string;
  _updatedBy?: string;
}

export interface ImportMetadata {
  dataHora: string;
  dataHoraFormatada: string;
  totalRegistros: number;
  tipo?: 'padrao' | 'massiva';
  usuario?: string;
  novas?: number;
  atualizadas?: number;
  removidas?: number;
}

export interface HistoricoEdicaoItem {
  id?: string;
  dc: string;
  userEmail?: string;
  userName?: string;
  usuario?: string;
  usuarioNome?: string;
  colunaEditada?: string;
  coluna?: string;
  valorAnterior: string;
  valorNovo: string;
  dataHora: string;
  timestamp?: number;
}

export type UserRole = 'ADM' | 'PADRAO';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'inactive';
  password?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SegmentacaoKey =
  | 'STATUS DE OBRA'
  | 'IMPLANTAÇÃO'
  | 'CELULA SAP'
  | 'PROJETOS'
  | 'Resp.Medição (Sul)'
  | 'RESP.';

export interface Segmentacao {
  id: SegmentacaoKey;
  nome: string;
  opcoes: string[];
}

export const BLOCO_1_KEYS: (keyof RegistroBloco1)[] = [
  'DC',
  'REG',
  'TIPO (Cateira)',
  'DR',
  'Seq',
  'Dc Simulação',
  'Orçamento',
  'Status Med. Parcial',
  'Valor Parcial R$',
  'Status Med. Final',
  'Valor Final R$',
  'Tempo',
  'AGING',
  'Data Status',
  'UF',
  'Localidade',
  'Tipo de Projeto',
  'Descricao',
  'Status da DC (Atual)',
  'Backlog/Input?',
];

export const BLOCO_2_KEYS: (keyof RegistroBloco2)[] = [
  'Status Informe (Campo)',
  'Resp.Medição',
  'Pendência (Implantação)',
  'Pendência (Celula Sap)',
  'Pendência (Projetos)',
  'Data Previsão Entrega (Medição)',
  'Data Previsão Entrega (Projeto)',
  'Responsavel',
  'Data Tratativa',
  'OBS (Medição)',
];

export const ALL_COLUMNS = [...BLOCO_1_KEYS, ...BLOCO_2_KEYS];

export const BLOCO_2_SEGMENTATION_MAP: Record<string, SegmentacaoKey | 'date' | 'text'> = {
  'Status Informe (Campo)': 'STATUS DE OBRA',
  'Resp.Medição': 'Resp.Medição (Sul)',
  'Pendência (Implantação)': 'IMPLANTAÇÃO',
  'Pendência (Celula Sap)': 'CELULA SAP',
  'Pendência (Projetos)': 'PROJETOS',
  'Data Previsão Entrega (Medição)': 'date',
  'Data Previsão Entrega (Projeto)': 'date',
  'Responsavel': 'RESP.',
  'Data Tratativa': 'date',
  'OBS (Medição)': 'text',
};

export const DEFAULT_SEGMENTATIONS: Record<SegmentacaoKey, string[]> = {
  'STATUS DE OBRA': [
    'AVALIAR',
    'CANCELADA',
    'APENAS PROJETO',
    'NÃO INICIADO',
    'EM EXECUÇÃO',
    'PARALISADA',
    'CONCLUÍDO',
    'DC DE MATERIAL',
  ],
  'IMPLANTAÇÃO': [
    'OK',
    'N/A',
    'TODAS EVIDÊNCIAS',
    'FOTOS',
    'DIARIO',
    'TESTE',
    'PLANILHA DE POTÊNCIA',
    'FOTOS/PLANILHA DE POTÊNCIA',
    'FOTOS/DIARIO',
    'FOTOS/TESTE',
    'DIARIO/TESTE',
    'DIARIO/PLANILHA DE POTÊNCIA',
    'TESTE/PLANILHA DE POTÊNCIA',
    'VALIDAÇÃO APP DE OBRAS',
    'OK - CARTA DE OCORRENCIA',
    'AGUARD. DE ACORDO FECHAMENTO',
    'DOCUMENTAÇÃO',
    'IMPLANTAÇÃO - GESTECH',
  ],
  'CELULA SAP': [
    'OK',
    'N/A',
    'APORTE DE VERBA',
    'BAIXA DE CABO',
    'BAIXA PARCIAL',
    'EXCLUSÃO DE CABO',
    'LIMPEZA',
    'MATERIAL SEM ESTOQUE',
    'SEM BAIXA',
    'AG. RETORNO GESTECH',
    'TRATATIVA SAP HANNA',
    'VALIDAÇÃO CELULA CCM',
    'AJUSTE DE RESERVA',
    'BAIXA EM BOLSÃO',
    'MAT. NO DEPOSITO - NA BAIXA V.TAL',
  ],
  'PROJETOS': [
    'OK',
    'N/A',
    'TODAS EVIDÊNCIAS',
    'ASBUILT',
    'ICOF/ICAB',
    'CADASTRO GEOPLEX',
    'FALTA ANEXO (DOC)',
    'CADASTRO NETWIN',
    'NETWIN',
    'ORÇAMENTO',
    'PROJETO',
    'ORÇAMENTO/PROJETO',
    'ASBUILT/ICOF ICAB',
    'CONTR. COMPLEMENTAR',
  ],
  'Resp.Medição (Sul)': [
    'PATRICK',
    'SHEILA',
    'LEANDRO',
    'MARIANA',
    'VAGNER',
    'EVERTON',
    'ADRIELLI',
    'DOUGLAS',
    'BRUNO',
    'ERICA',
    'PETERSON',
    'WESLEY',
  ],
  'RESP.': [
    'IMPLANTAÇÃO',
    'IMPLANTAÇÃO - GESTECH',
    'PROJETO',
    'MEDIÇÃO',
    'CELULA SAP',
    'FINALIZADO',
    'ASBUILT',
    'GERENCIA',
    'PROJETO - V.TAL',
    'EST. DE EXECUÇÃO',
    'V.TAL - DOC ENTREGUE',
    'V.TAL - PENDENCIAS',
    'V.TAL - ACEITE DE SERV.',
    'V.TAL/CELULA SAP',
    'OPERAÇÃO/MANUT.',
    'MEDIÇÃO - BOLSÃO',
  ],
};

export const INITIAL_ADMIN_EMAIL = 'caio.lira@telemontrms.com.br';
export const ADMIN_EMAILS: string[] = [
  'caio.lira@telemontrms.com.br',
  'caioleonlira@gmail.com',
];

export function isSystemAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === clean);
}

export function getRegistroCarteira(r: Partial<Registro> | any): string {
  if (!r) return '';
  return (
    r['TIPO (Cateira)'] ||
    r['TIPO (CARTEIRA)'] ||
    r['TIPO (Carteira)'] ||
    r['Tipo (Carteira)'] ||
    r['CARTEIRA'] ||
    r['Carteira'] ||
    ''
  ).trim();
}

export interface RegistrosFilterPayload {
  searchDC?: string;
  regional?: string[];
  uf?: string[];
  carteira?: string[];
  aging?: string[];
  statusAtual?: string[];
  statusInforme?: string[];
  responsavel?: string[];
  tipoProjeto?: string[];
  statusMedParcial?: string[];
  statusMedFinal?: string[];
  backlogInput?: string[];
  onlyWithParcial?: boolean;
  onlyWithFinal?: boolean;
  onlyWithMedido?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

