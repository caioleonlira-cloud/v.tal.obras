export interface RegistroBloco1 {
  'DC': string;
  'REG': string;
  'TIPO (Carteira)': string;
  'Tipo de DC'?: string;
  'DR': string;
  'Seq': string;
  'Dc Simulação': string;
  'Orçamento': string;
  'Status Med. Parcial': string;
  'Valor Parcial R$': string;
  'Status Med. Final': string;
  'Valor Final R$': string;
  'Pedido'?: string;
  'Valor Faturado'?: string;
  'Saldo'?: string;
  'Tempo': string;
  'AGING': string;
  'Data Status': string;
  'UF': string;
  'Localidade': string;
  'Tipo de Projeto': string;
  'Descricao': string;
  'Status da DC (Atual)': string;
  'Plan. Estruturante': string;
  'Mês Input'?: string;
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
  'TIPO (Carteira)',
  'Tipo de DC',
  'DR',
  'Seq',
  'Dc Simulação',
  'Orçamento',
  'Status Med. Parcial',
  'Valor Parcial R$',
  'Status Med. Final',
  'Valor Final R$',
  'Pedido',
  'Valor Faturado',
  'Saldo',
  'Tempo',
  'AGING',
  'Data Status',
  'UF',
  'Localidade',
  'Tipo de Projeto',
  'Descricao',
  'Status da DC (Atual)',
  'Plan. Estruturante',
  'Mês Input',
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
    r['TIPO (Carteira)'] ||
    r['TIPO (Cateira)'] ||
    r['TIPO (CARTEIRA)'] ||
    r['Tipo (Carteira)'] ||
    r['CARTEIRA'] ||
    r['Carteira'] ||
    ''
  ).trim();
}

export function getRegistroPlanEstruturante(r: Partial<Registro> | any): string {
  if (!r) return '';
  return (
    r['Plan. Estruturante'] ||
    r['Backlog/Input?'] ||
    r['Backlog/Input'] ||
    r['Plan Estruturante'] ||
    ''
  ).trim();
}

export function getRegistroTipoDC(r: Partial<Registro> | any): string {
  if (!r) return '';
  return (r['Tipo de DC'] || r['Tipo DC'] || '').trim();
}

export function getRegistroMesInput(r: Partial<Registro> | any): string {
  if (!r) return '';
  return (r['Mês Input'] || r['Mes Input'] || '').trim();
}

export function getRegistroRegional(r: Partial<Registro> | any): string {
  if (!r) return '';

  // 1. Direct field REG and known aliases
  const rawReg = (
    r.REG ??
    r.Regional ??
    r.REGIONAL ??
    r.Reg ??
    r.reg ??
    r.Regiao ??
    r.REGIAO ??
    r['REGIONAL / UF'] ??
    r['REGIONAL/UF'] ??
    r['REG/UF'] ??
    r['Regional UF'] ??
    ''
  )
    .toString()
    .trim()
    .toUpperCase();

  if (
    rawReg &&
    rawReg !== 'SEM REGIONAL' &&
    rawReg !== '-' &&
    rawReg !== '—' &&
    rawReg !== 'N/D' &&
    rawReg !== 'N/A' &&
    rawReg !== 'UNDEFINED' &&
    rawReg !== 'NULL'
  ) {
    if (rawReg === 'RSUL' || rawReg === 'SUL' || rawReg.includes('RSUL')) return 'RSUL';
    if (
      rawReg === 'RMG' ||
      rawReg === 'MG' ||
      rawReg.includes('RMG') ||
      rawReg === 'MINAS' ||
      rawReg === 'MINAS GERAIS'
    )
      return 'RMG';
    if (
      rawReg === 'RCO' ||
      rawReg === 'CO' ||
      rawReg.includes('RCO') ||
      rawReg === 'CENTRO OESTE' ||
      rawReg === 'CENTRO-OESTE'
    )
      return 'RCO';
    if (rawReg === 'RNE' || rawReg === 'NE' || rawReg.includes('RNE')) return 'RNE';
    if (rawReg.startsWith('R') && rawReg.length <= 5) return rawReg;
    return rawReg;
  }

  // 2. Check DR (Diretoria Regional)
  const rawDr = (
    r.DR ??
    r['Diretoria Regional'] ??
    r['DIR REGIONAL'] ??
    r['Diretoria'] ??
    ''
  )
    .toString()
    .trim()
    .toUpperCase();

  if (rawDr) {
    if (['RSUL', 'SUL', 'PR', 'SC', 'RS'].includes(rawDr) || rawDr.includes('SUL')) return 'RSUL';
    if (['RMG', 'MG', 'MINAS', 'MINAS GERAIS'].includes(rawDr) || rawDr.includes('MINAS')) return 'RMG';
    if (['RCO', 'CO', 'GO', 'DF', 'MT', 'MS', 'CENTRO OESTE', 'CENTRO-OESTE'].includes(rawDr) || rawDr.includes('CENTRO')) return 'RCO';
    if (['RNE', 'NE', 'BA', 'PE', 'CE'].includes(rawDr) || rawDr.includes('NORDESTE')) return 'RNE';
    if (rawDr.startsWith('R') && rawDr.length <= 5) return rawDr;
  }

  // 3. Check UF (Estado)
  const rawUf = (r.UF ?? '').toString().trim().toUpperCase();
  if (rawUf) {
    if (['PR', 'SC', 'RS'].includes(rawUf)) return 'RSUL';
    if (['MG'].includes(rawUf)) return 'RMG';
    if (['GO', 'DF', 'MT', 'MS', 'TO', 'RO', 'AC', 'PA', 'AM', 'AP', 'RR'].includes(rawUf)) return 'RCO';
    if (['BA', 'PE', 'CE', 'RN', 'PB', 'AL', 'SE', 'PI', 'MA'].includes(rawUf)) return 'RNE';
    if (['RJ', 'ES'].includes(rawUf)) return 'RJ/ES';
    if (['SP'].includes(rawUf)) return 'SP';
  }

  // 4. Check Localidade / Município / Descrição
  const loc = (r.Localidade ?? r.Descricao ?? '').toString().toUpperCase();
  if (loc) {
    if (
      loc.includes('BELO HORIZONTE') ||
      loc.includes('CONTAGEM') ||
      loc.includes('UBERLANDIA') ||
      loc.includes('JUIZ DE FORA') ||
      loc.includes('BETIM') ||
      loc.includes('MONTES CLAROS') ||
      loc.includes('UBERABA')
    ) {
      return 'RMG';
    }
    if (
      loc.includes('CURITIBA') ||
      loc.includes('LONDRINA') ||
      loc.includes('MARINGA') ||
      loc.includes('PORTO ALEGRE') ||
      loc.includes('FLORIANOPOLIS') ||
      loc.includes('JOINVILLE') ||
      loc.includes('CAXIAS DO SUL') ||
      loc.includes('BLUMENAU') ||
      loc.includes('CASCAVEL') ||
      loc.includes('FOZ DO IGUACU')
    ) {
      return 'RSUL';
    }
    if (
      loc.includes('GOIANIA') ||
      loc.includes('BRASILIA') ||
      loc.includes('CUIABA') ||
      loc.includes('CAMPO GRANDE') ||
      loc.includes('ANAPOLIS') ||
      loc.includes('PALMAS') ||
      loc.includes('PORTO VELHO') ||
      loc.includes('RIO BRANCO')
    ) {
      return 'RCO';
    }
  }

  // 5. Check DC identifier or simulation prefix
  const dcStr = `${r.DC || ''} ${r['Dc Simulação'] || ''}`.toUpperCase();
  if (dcStr) {
    if (dcStr.includes('PR') || dcStr.includes('RS') || dcStr.includes('SC') || dcStr.includes('SUL')) return 'RSUL';
    if (dcStr.includes('MG') || dcStr.includes('MINAS')) return 'RMG';
    if (dcStr.includes('GO') || dcStr.includes('DF') || dcStr.includes('MT') || dcStr.includes('MS') || dcStr.includes('RCO')) return 'RCO';
  }

  return '';
}

/**
 * Normaliza o valor do campo Responsável.
 * Valores vazios, nulos, traços, "Não Atribuído", "SEM RESPONSÁVEL", etc. são convertidos para "(EM BRANCO)".
 */
export function normalizeResponsavel(resp?: string | null): string {
  if (!resp) return '(EM BRANCO)';
  const trimmed = resp.trim();
  const upper = trimmed.toUpperCase();
  if (
    !trimmed ||
    trimmed === '-' ||
    trimmed === '—' ||
    upper === 'NÃO ATRIBUÍDO' ||
    upper === 'NAO ATRIBUIDO' ||
    upper === 'NÃO ATRIBUIDO' ||
    upper === 'NAO ATRIBUÍDO' ||
    upper === 'SEM RESPONSÁVEL' ||
    upper === 'SEM RESPONSAVEL' ||
    upper === 'N/D' ||
    upper === 'N/A' ||
    upper === '(EM BRANCO)' ||
    upper === 'EM BRANCO'
  ) {
    return '(EM BRANCO)';
  }
  return trimmed;
}

/**
 * Ordena responsáveis em ordem alfabética (pt-BR), mantendo "(EM BRANCO)" sempre na última posição.
 */
export function sortResponsaveis(a: string, b: string): number {
  const isBlankA = a === '(EM BRANCO)';
  const isBlankB = b === '(EM BRANCO)';
  if (isBlankA && !isBlankB) return 1;
  if (!isBlankA && isBlankB) return -1;
  return a.localeCompare(b, 'pt-BR');
}

export interface RegistrosFilterPayload {
  searchDC?: string;
  regional?: string[];
  uf?: string[];
  carteira?: string[];
  tipoDC?: string[];
  aging?: string[];
  statusAtual?: string[];
  statusInforme?: string[];
  responsavel?: string[];
  respMedicao?: string[];
  tipoProjeto?: string[];
  statusMedParcial?: string[];
  statusMedFinal?: string[];
  mesInput?: string[];
  backlogInput?: string[];
  onlyWithParcial?: boolean;
  onlyWithFinal?: boolean;
  onlyWithMedido?: boolean;
  onlyWithFaturado?: boolean;
  onlyWithSaldo?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface FRRegistro {
  id: string;
  UF: string;
  'DC-M': string;
  REG: string;
  Mês: string;
  CENTRO: string;
  'LOCALIDADE DE PRESTAÇÃO': string;
  'DATA DA SOLICITAÇÃO': string;
  'DC MIGRADA/OPERAÇÃO': string;
  'Nº MEDIÇÃO': string;
  'Nº PEDIDO': string;
  'ITEM DO PEDIDO': string;
  'VALOR FR': string | number;
  FR: string;
  _updatedAt?: string;
  _updatedBy?: string;
}

export const FR_COLUMNS: (keyof Omit<FRRegistro, 'id' | '_updatedAt' | '_updatedBy'>)[] = [
  'UF',
  'DC-M',
  'REG',
  'Mês',
  'CENTRO',
  'LOCALIDADE DE PRESTAÇÃO',
  'DATA DA SOLICITAÇÃO',
  'DC MIGRADA/OPERAÇÃO',
  'Nº MEDIÇÃO',
  'Nº PEDIDO',
  'ITEM DO PEDIDO',
  'VALOR FR',
  'FR',
];

export interface ImportInfoFR {
  fileName: string;
  importedAt: string;
  importedBy: string;
  totalLinhas: number;
}

export type NavTabType =
  | 'dashboard'
  | 'registros'
  | 'fr'
  | 'importacao'
  | 'segmentacoes'
  | 'usuarios';


