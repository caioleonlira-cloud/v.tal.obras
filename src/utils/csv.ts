import Papa from 'papaparse';
import {
  Registro,
  BLOCO_1_KEYS,
  BLOCO_2_KEYS,
  ALL_COLUMNS,
  HistoricoEdicaoItem,
  FRRegistro,
  FR_COLUMNS,
  getRegistroRegional,
  SegmentacaoKey,
  COLUNAS_SEGMENTADAS_MASSIVA,
  ColunaSegmentadaMassiva,
  MAPA_COLUNA_SEGMENTACAO_KEY,
  SegmentacaoDivergencia,
  DEFAULT_SEGMENTATIONS,
} from '../types';
import { parseCurrencyValue, parseFRValor, formatDecimalBR, formatBRL, formatCurrency } from './currency';
import { normalizeMesFR } from './monthUtils';

export {
  parseCurrencyValue,
  parseFRValor,
  normalizeMesFR,
  formatDecimalBR,
  formatBRL,
  formatCurrency,
  COLUNAS_SEGMENTADAS_MASSIVA,
  MAPA_COLUNA_SEGMENTACAO_KEY,
};
export type { ColunaSegmentadaMassiva, SegmentacaoDivergencia };


/**
 * Normaliza e valida o identificador da DC.
 */
export function cleanDC(raw: any): string {
  if (raw === undefined || raw === null) return '';
  const str = String(raw)
    .replace(/[\u200B-\u200D\uFEFF\u00A0\r\n\t]/g, '')
    .trim();
  if (!str) return '';
  if (
    str === '-' ||
    str === '—' ||
    str === '–' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined' ||
    str.toLowerCase() === 'n/a' ||
    str.toLowerCase() === 'none'
  ) {
    return '';
  }
  if (!/[a-zA-Z0-9]/.test(str)) {
    return '';
  }
  return str;
}

export function isValidDC(raw: any): boolean {
  return cleanDC(raw).length > 0;
}

/**
 * Mapeia cabeçalho bruto para nome canônico do sistema
 */
export function matchCanonicalColumn(rawHeader: string): string | null {
  if (!rawHeader) return null;
  const rawTrimmed = String(rawHeader).trim();
  if (!rawTrimmed) return null;

  const directMatch = ALL_COLUMNS.find(
    (col) => col.toLowerCase() === rawTrimmed.toLowerCase()
  );
  if (directMatch) return directMatch;

  const clean = rawTrimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[º°ª#?:.\-_/\\()\[\]{}|;,+*!&]/g, ' ') // remove pontuações
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  // 1. DC (Identificador)
  if (
    clean === 'DC' ||
    clean === 'D C' ||
    clean === 'NUMERO DC' ||
    clean === 'NUMERO DA DC' ||
    clean === 'NUMERO DE DC' ||
    clean === 'N DC' ||
    clean === 'NO DC' ||
    clean === 'NR DC' ||
    clean === 'CODIGO DC' ||
    clean === 'COD DC' ||
    clean === 'ID DC' ||
    clean === 'DC ID' ||
    clean === 'IDENTIFICADOR DC' ||
    clean.startsWith('DC ') ||
    clean.endsWith(' DC')
  ) {
    if (!clean.includes('STATUS') && !clean.includes('SIMUL') && !clean.includes('MATERIAL')) {
      return 'DC';
    }
  }

  // 2. Base Matriz Columns (Bloco 1)
  if (
    clean === 'REG' ||
    clean === 'REGIONAL' ||
    clean === 'REGIAO' ||
    clean === 'REG.' ||
    clean === 'REGIAO.' ||
    clean === 'REG UF' ||
    clean === 'REGIONAL UF' ||
    clean === 'REG/UF' ||
    clean === 'REGIONAL/UF' ||
    clean === 'REGIONAL / UF' ||
    clean === 'REG / UF' ||
    clean.startsWith('REGIONAL') ||
    clean.startsWith('REGIAO')
  ) {
    if (!clean.includes('DIRETORIA') && !clean.includes('DIR')) {
      return 'REG';
    }
  }

  if (
    clean === 'TIPO DE DC' ||
    clean === 'TIPO DC' ||
    clean === 'TIPODC' ||
    clean === 'TIPO_DE_DC' ||
    clean === 'TIPO_DC'
  ) {
    return 'Tipo de DC';
  }

  if (
    clean.includes('CARTEIRA') ||
    clean.includes('CATEIRA') ||
    (clean.startsWith('TIPO') && (clean.includes('CART') || clean.includes('CATE')))
  ) {
    return 'TIPO (Carteira)';
  }

  if (clean === 'DR' || clean === 'DIRETORIA REGIONAL' || clean === 'DIR REGIONAL') return 'DR';

  if (clean === 'SEQ' || clean === 'SEQUENCIA' || clean === 'SEQUENCIAL' || clean === 'N SEQUENCIA') return 'Seq';

  if (clean.includes('SIMULA') || clean.includes('SIMULACAO') || clean.includes('SIMUL')) return 'Dc Simulação';

  if (
    clean === 'ORCAMENTO' ||
    clean === 'VALOR ORCAMENTO' ||
    clean === 'ORC' ||
    clean === 'ORCAMENTO R$' ||
    clean.includes('ORCAMENTO') ||
    clean.includes('ORCA') ||
    clean.includes('ORC') ||
    (clean.startsWith('OR') && clean.includes('AMENTO'))
  ) {
    if (!clean.includes('PROJETO')) {
      return 'Orçamento';
    }
  }

  if (clean.includes('PARCIAL')) {
    if (clean.includes('VALOR') || clean.includes('R$') || clean.includes('VAL')) {
      return 'Valor Parcial R$';
    }
    return 'Status Med. Parcial';
  }

  if (clean.includes('FINAL')) {
    if (clean.includes('VALOR') || clean.includes('R$') || clean.includes('VAL')) {
      return 'Valor Final R$';
    }
    return 'Status Med. Final';
  }

  if (
    clean === 'PEDIDO' ||
    clean === 'N PEDIDO' ||
    clean === 'NR PEDIDO' ||
    clean === 'NUM PEDIDO' ||
    clean === 'NUMERO PEDIDO' ||
    clean === 'COD PEDIDO' ||
    clean.includes('PEDIDO')
  ) {
    return 'Pedido';
  }

  if (
    clean.includes('FATURAD') ||
    clean.includes('FATURAMENTO') ||
    clean === 'VALOR FATURADO' ||
    clean === 'FATURADO R$' ||
    clean === 'VALOR FATURADO R$'
  ) {
    return 'Valor Faturado';
  }

  if (
    clean === 'SALDO' ||
    clean === 'SALDO R$' ||
    clean === 'VALOR SALDO' ||
    clean === 'SALDO DISPONIVEL' ||
    clean.includes('SALDO')
  ) {
    return 'Saldo';
  }

  if (clean === 'TEMPO' || clean === 'TEMPO DIAS' || clean === 'DIAS') return 'Tempo';

  if (clean === 'AGING' || clean === 'AGING DIAS' || clean === 'AGING TEMPO') return 'AGING';

  if ((clean.includes('DATA') || clean.includes('DT')) && clean.includes('STATUS')) return 'Data Status';

  if (clean === 'UF' || clean === 'ESTADO' || clean === 'SIGLA UF') return 'UF';

  if (clean === 'LOCALIDADE' || clean === 'CIDADE' || clean === 'MUNICIPIO') return 'Localidade';

  if (
    (clean.includes('TIPO') && (clean.includes('PROJETO') || clean.includes('PROJ'))) ||
    clean === 'PROJETO TIPO'
  ) {
    return 'Tipo de Projeto';
  }

  if (
    clean.includes('DESCR') ||
    clean.includes('TITULO') ||
    clean.includes('NOME DA OBRA')
  ) {
    return 'Descricao';
  }

  if (
    clean.includes('STATUS') &&
    (clean.includes('ATUAL') || clean.includes('DC') || clean.includes('OBRA')) &&
    !clean.includes('INFORME') &&
    !clean.includes('CAMPO') &&
    !clean.includes('MED')
  ) {
    return 'Status da DC (Atual)';
  }

  if (
    clean === 'MES INPUT' ||
    clean === 'MÊS INPUT' ||
    clean === 'MES_INPUT' ||
    clean === 'MÊS_INPUT' ||
    clean === 'MESINPUT' ||
    clean === 'MÊSINPUT' ||
    (clean.includes('MES') && clean.includes('INPUT')) ||
    (clean.includes('MÊS') && clean.includes('INPUT'))
  ) {
    return 'Mês Input';
  }

  if (
    clean === 'BACKLOG INPUT' ||
    clean === 'BACKLOG INPUT?' ||
    clean === 'BACKLOG/INPUT' ||
    clean === 'BACKLOG/INPUT?' ||
    clean === 'PLAN ESTRUTURANTE' ||
    clean === 'PLAN. ESTRUTURANTE' ||
    clean === 'PLANEJAMENTO ESTRUTURANTE' ||
    clean.includes('ESTRUTURANTE') ||
    clean.includes('BACKLOG') ||
    clean === 'INPUT'
  ) {
    return 'Plan. Estruturante';
  }

  // 3. Bloco 2 Tracking Columns
  if (
    clean.includes('INFORME') ||
    clean.includes('STATUS INFORME') ||
    clean.includes('STATUS CAMPO') ||
    clean === 'STATUS DE OBRA' ||
    clean === 'STATUS OBRA CAMPO'
  ) {
    return 'Status Informe (Campo)';
  }

  if (
    clean.includes('RESP') &&
    (clean.includes('MED') || clean.includes('MEDICAO') || clean.includes('SUL'))
  ) {
    return 'Resp.Medição';
  }

  if (clean.includes('PEND') && (clean.includes('IMPLANT') || clean.includes('OBRA'))) {
    return 'Pendência (Implantação)';
  }

  if (clean.includes('PEND') && (clean.includes('SAP') || clean.includes('CELULA'))) {
    return 'Pendência (Celula Sap)';
  }

  if (clean.includes('PEND') && (clean.includes('PROJET') || clean.includes('PROJ'))) {
    return 'Pendência (Projetos)';
  }

  if (clean.includes('PREV') && (clean.includes('MED') || clean.includes('MEDICAO'))) {
    return 'Data Previsão Entrega (Medição)';
  }

  if (clean.includes('PREV') && (clean.includes('PROJET') || clean.includes('PROJ'))) {
    return 'Data Previsão Entrega (Projeto)';
  }

  if (
    clean === 'RESPONSAVEL' ||
    clean === 'RESP' ||
    clean === 'AREA RESPONSAVEL' ||
    clean === 'RESPONSAVEL AREA' ||
    clean === 'CELULA RESPONSAVEL' ||
    clean === 'RESPONSAVEIS'
  ) {
    return 'Responsavel';
  }

  if (
    clean.includes('TRATATIVA') ||
    clean === 'DATA TRATATIVA' ||
    clean === 'DT TRATATIVA'
  ) {
    return 'Data Tratativa';
  }

  if (
    clean.includes('OBS') ||
    clean.includes('OBSERVACAO') ||
    clean.includes('OBSERVACOES') ||
    clean.includes('OBS MEDICAO') ||
    clean.includes('NOTAS')
  ) {
    return 'OBS (Medição)';
  }

  return null;
}

/**
 * Colunas especiais
 */
export const DATE_COLUMNS = new Set([
  'Data Status',
  'Data Previsão Entrega (Medição)',
  'Data Previsão Entrega (Projeto)',
  'Data Tratativa',
]);

export const NUMERIC_COLUMNS = new Set([
  'Orçamento',
  'Valor Parcial R$',
  'Valor Final R$',
  'Valor Faturado',
  'Saldo',
  'Tempo',
  'VALOR FR',
]);

export const CURRENCY_COLUMNS = new Set([
  'Orçamento',
  'Valor Parcial R$',
  'Valor Final R$',
  'Valor Faturado',
  'Saldo',
]);

export const INTEGER_COLUMNS = new Set([
  'Seq',
  'Tempo',
  'AGING',
]);

export const TEXT_ONLY_COLUMNS = new Set([
  'DC',
  'DR',
  'Seq',
  'Dc Simulação',
  'Pedido',
  'AGING',
  'Mês Input',
  'Mês',
  'FR',
  'Nº MEDIÇÃO',
  'Nº PEDIDO',
  'ITEM DO PEDIDO',
  'UF',
  'REG',
  'TIPO (Carteira)',
  'Tipo de DC',
  'Status Med. Parcial',
  'Status Med. Final',
  'Localidade',
  'Tipo de Projeto',
  'Descricao',
  'Status da DC (Atual)',
  'Plan. Estruturante',
  'Status Informe (Campo)',
  'Resp.Medição',
  'Pendência (Implantação)',
  'Pendência (Celula Sap)',
  'Pendência (Projetos)',
  'Responsavel',
  'OBS (Medição)',
  'CENTRO',
  'LOCALIDADE DE PRESTAÇÃO',
  'DC MIGRADA/OPERAÇÃO',
]);

export const IDENTIFIER_COLUMNS = new Set([
  'DC',
  'Pedido',
  'Dc Simulação',
  'DR',
  'FR',
  'Nº MEDIÇÃO',
  'Nº PEDIDO',
  'ITEM DO PEDIDO',
]);

/**
 * 4) DR EM NOTAÇÃO CIENTÍFICA (o Excel corrompe ao salvar o CSV)
 * Se o DR vier como 1,215E+11 ou 1.215E+11 (ou qualquer valor com "E+"),
 * recupera o DR a partir do DC, pegando a parte antes da "/" (ex.: DC 121500000001/2753 -> DR 121500000001).
 * Se o DC não tiver "/" e o DR estiver corrompido, trata a linha como erro.
 * Aplica a mesma proteção em qualquer coluna de identificação que chegue em notação científica.
 */
export function recoverIdentifierFromDC(
  val: any,
  dcVal?: any,
  colName = 'DR',
  rowIndex?: number
): string {
  const str = String(val !== undefined && val !== null ? val : '').trim();
  if (!str) return '';

  const isScientific = /^[+-]?\d+([.,]\d+)?e[+-]?\d+$/i.test(str.replace(/\s+/g, ''));
  if (isScientific) {
    const dcClean = String(dcVal || '').trim();
    if (dcClean.includes('/')) {
      const recovered = dcClean.split('/')[0].trim();
      if (recovered) return recovered;
    }
    const rowInfo = rowIndex !== undefined ? ` na linha ${rowIndex}` : '';
    throw new Error(
      `Coluna "${colName}" corrompida em notação científica ("${str}")${rowInfo} e não foi possível recuperar a partir da DC ("${dcClean || 'vazio'}"). A DC deve conter a barra separadora "/" (ex.: 121500000001/2753).`
    );
  }

  return str;
}

/**
 * 1) COLUNAS DE DATA:
 * - Registros / Matriz: Data Status
 * - Acompanhamento: Data Previsão Entrega (Medição), Data Previsão Entrega (Projeto), Data Tratativa
 * - FR: DATA DA SOLICITAÇÃO (pode ter hora)
 * Aceita:
 * - dd/mm/aaaa, d/m/aaaa e dd/mm/aa
 * - dd/mm/aaaa HH:mm e dd/mm/aaaa HH:mm:ss
 * - aaaa-mm-dd (ISO)
 * - número serial do Excel (ex.: 46125 = 13/04/2026). Converter com base 30/12/1899.
 * - "-", vazio ou "N/A" = sem data
 * Monta sem erro de fuso e valida dias reais do calendário.
 */
export function normalizeDateValue(
  val: any,
  colName = 'Data',
  includeTimeIfPresent = false,
  rowIndex?: number
): string {
  if (val === undefined || val === null) return '';

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    if (includeTimeIfPresent && (val.getHours() !== 0 || val.getMinutes() !== 0 || val.getSeconds() !== 0)) {
      const h = String(val.getHours()).padStart(2, '0');
      const m = String(val.getMinutes()).padStart(2, '0');
      const s = String(val.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} ${h}:${m}:${s}`;
    }
    return `${day}/${month}/${year}`;
  }

  const str = String(val).trim();
  if (
    !str ||
    str === '—' ||
    str === '-' ||
    str === '–' ||
    str.toUpperCase() === 'N/A' ||
    str.toUpperCase() === 'N/I' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined'
  ) {
    return '';
  }

  // 1. Número serial do Excel (ex: 46125 ou 46125.5 ou em string "46125" / "46125,5")
  const numSerialCandidate = typeof val === 'number' ? val : parseFloat(str.replace(',', '.'));
  if (
    !isNaN(numSerialCandidate) &&
    numSerialCandidate >= 20000 &&
    numSerialCandidate <= 90000 &&
    /^\d+([.,]\d+)?$/.test(str)
  ) {
    const days = Math.floor(numSerialCandidate);
    const frac = numSerialCandidate - days;
    const ms = Math.round(frac * 86400 * 1000);
    const base = Date.UTC(1899, 11, 30);
    const targetUtc = new Date(base + days * 86400 * 1000 + ms);
    if (!isNaN(targetUtc.getTime())) {
      const day = String(targetUtc.getUTCDate()).padStart(2, '0');
      const month = String(targetUtc.getUTCMonth() + 1).padStart(2, '0');
      const year = targetUtc.getUTCFullYear();
      if (includeTimeIfPresent && frac > 0) {
        const h = String(targetUtc.getUTCHours()).padStart(2, '0');
        const m = String(targetUtc.getUTCMinutes()).padStart(2, '0');
        const s = String(targetUtc.getUTCSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${h}:${m}:${s}`;
      }
      return `${day}/${month}/${year}`;
    }
  }

  // 2. dd/mm/aaaa, d/m/aaaa, dd/mm/aa com opcional HH:mm ou HH:mm:ss
  const brMatch = str.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10);
    let year = parseInt(brMatch[3], 10);
    if (year < 100) year += 2000;
    const hasTime = brMatch[4] !== undefined;
    const hours = hasTime ? parseInt(brMatch[4], 10) : 0;
    const minutes = brMatch[5] ? parseInt(brMatch[5], 10) : 0;
    const seconds = brMatch[6] ? parseInt(brMatch[6], 10) : 0;

    const rowInfo = rowIndex !== undefined ? ` na linha ${rowIndex}` : '';
    if (month < 1 || month > 12) {
      throw new Error(`Data inválida na coluna "${colName}"${rowInfo}: "${val}" possui mês inválido.`);
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      throw new Error(`Data inválida na coluna "${colName}"${rowInfo}: "${val}" não é um dia válido para o calendário.`);
    }

    const dStr = String(day).padStart(2, '0');
    const mStr = String(month).padStart(2, '0');
    if (includeTimeIfPresent && hasTime) {
      const hStr = String(hours).padStart(2, '0');
      const minStr = String(minutes).padStart(2, '0');
      const secStr = String(seconds).padStart(2, '0');
      return `${dStr}/${mStr}/${year} ${hStr}:${minStr}:${secStr}`;
    }
    return `${dStr}/${mStr}/${year}`;
  }

  // 3. aaaa-mm-dd (ISO) com opcional HH:mm ou HH:mm:ss
  const isoMatch = str.match(
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const hasTime = isoMatch[4] !== undefined;
    const hours = hasTime ? parseInt(isoMatch[4], 10) : 0;
    const minutes = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
    const seconds = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;

    const rowInfo = rowIndex !== undefined ? ` na linha ${rowIndex}` : '';
    if (month < 1 || month > 12) {
      throw new Error(`Data inválida na coluna "${colName}"${rowInfo}: "${val}" possui mês inválido.`);
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      throw new Error(`Data inválida na coluna "${colName}"${rowInfo}: "${val}" não é um dia válido para o calendário.`);
    }

    const dStr = String(day).padStart(2, '0');
    const mStr = String(month).padStart(2, '0');
    if (includeTimeIfPresent && hasTime) {
      const hStr = String(hours).padStart(2, '0');
      const minStr = String(minutes).padStart(2, '0');
      const secStr = String(seconds).padStart(2, '0');
      return `${dStr}/${mStr}/${year} ${hStr}:${minStr}:${secStr}`;
    }
    return `${dStr}/${mStr}/${year}`;
  }

  const rowInfo = rowIndex !== undefined ? ` na linha ${rowIndex}` : '';
  throw new Error(`Formato de data inválido na coluna "${colName}"${rowInfo}: "${val}".`);
}

/**
 * 2) COLUNAS NUMÉRICAS:
 * Orçamento, Valor Parcial R$, Valor Final R$, Valor Faturado, Saldo, Tempo e VALOR FR.
 * Aceita:
 * - 1309,6 | 1309.6 | 1.309,60 | 1,309.60 | R$ 1.309,60 | -1309,6 | (1.309,60)
 * - Regra: se tiver ponto e vírgula, o ÚLTIMO separador é o decimal.
 * - Só vírgula = decimal.
 * - Só ponto = decimal, exceto quando for padrão de milhar (ex.: 1.309 ou 12.345.678, grupos de 3 dígitos) = milhar.
 * - "-" ou vazio = o mesmo que o app já grava hoje para vazio (retorna fallback: "" ou 0).
 * - Texto que não vira número (ex.: "abc") NÃO pode virar 0 em silêncio: lança erro.
 */
export function normalizeNumericValue(
  val: any,
  colName = 'Valor',
  rowIndex?: number,
  fallbackEmpty: number | '' = ''
): number | '' {
  if (val === undefined || val === null) return fallbackEmpty;
  if (typeof val === 'number') {
    if (isNaN(val)) return fallbackEmpty;
    return val;
  }

  let str = String(val).trim();
  if (
    !str ||
    str === '—' ||
    str === '-' ||
    str === '–' ||
    str.toUpperCase() === 'N/A' ||
    str.toUpperCase() === 'N/I' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined'
  ) {
    return fallbackEmpty;
  }

  // Remove prefixos R$, espaços comuns e não-quebráveis, aspas
  str = str.replace(/R\s*\$/gi, '').replace(/[\s\u00A0"'`]/g, '').trim();
  if (!str || str === '-' || str === '—') return fallbackEmpty;

  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  let num: number;

  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Padrão brasileiro: 1.309,60
      const clean = str.replace(/\./g, '').replace(',', '.');
      num = parseFloat(clean);
    } else {
      // Padrão US: 1,309.60
      const clean = str.replace(/,/g, '');
      num = parseFloat(clean);
    }
  } else if (hasComma) {
    const commaCount = (str.match(/,/g) || []).length;
    if (commaCount === 1) {
      num = parseFloat(str.replace(',', '.'));
    } else {
      num = parseFloat(str.replace(/,/g, ''));
    }
  } else if (hasDot) {
    const parts = str.split('.');
    if (
      parts.length > 1 &&
      parts.every((p, idx) => (idx === 0 ? p.length >= 1 && p.length <= 3 : p.length === 3))
    ) {
      // Padrão de milhar brasileiro ex.: 1.309 ou 12.345.678
      num = parseFloat(str.replace(/\./g, ''));
    } else {
      num = parseFloat(str);
    }
  } else {
    num = parseFloat(str);
  }

  if (isNaN(num)) {
    const rowInfo = rowIndex !== undefined ? ` na linha ${rowIndex}` : '';
    throw new Error(
      `Valor numérico inválido na coluna "${colName}"${rowInfo}: "${val}" não é um número válido.`
    );
  }

  const finalVal = isNegative ? -num : num;
  return finalVal;
}

/**
 * Parse flexível de datas que retorna Date object ou null
 */
export function parseDateForCSV(val?: any): Date | null {
  if (val === undefined || val === null) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  try {
    const norm = normalizeDateValue(val, 'data', true);
    if (!norm) return null;
    const parts = norm.split(' ');
    const dateParts = parts[0].split('/');
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);
    let hours = 12;
    let minutes = 0;
    let seconds = 0;
    if (parts[1]) {
      const timeParts = parts[1].split(':');
      hours = parseInt(timeParts[0], 10) || 0;
      minutes = parseInt(timeParts[1], 10) || 0;
      seconds = parseInt(timeParts[2], 10) || 0;
    }
    const d = new Date(year, month, day, hours, minutes, seconds);
    return isNaN(d.getTime()) ? null : d;
  } catch (_) {
    return null;
  }
}

export const parseDateForExcel = parseDateForCSV;

/**
 * Converte valores numéricos e monetários
 */
export function parseNumberForCSV(val?: any, isCurrencyCol = false): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  try {
    const norm = normalizeNumericValue(val, isCurrencyCol ? 'valor' : 'numero');
    return norm === '' ? null : norm;
  } catch (_) {
    return null;
  }
}

export const parseNumberForExcel = parseNumberForCSV;
export const parseCurrencyWithDecimalCorrection = parseNumberForCSV;

export function formatCurrencyBRL(val?: any): string {
  const num = typeof val === 'number' ? val : parseNumberForCSV(val, true);
  if (num === null || isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Normaliza textos para exportação CSV em linha única:
 * - Substitui qualquer quebra de linha (\r\n, \r ou \n) por " | " (espaço, barra vertical, espaço)
 * - Reduz múltiplos separadores de barra consecutivos para um único " | "
 * - Remove espaços duplicados
 * - Remove separadores/barras e espaços no início e no fim
 */
export function sanitizeTextForCSV(val: any): string {
  if (val === undefined || val === null) return '';
  let str = String(val);
  if (!str) return '';

  // Substitui qualquer quebra de linha (\r\n, \r ou \n) por " | "
  str = str.replace(/(\r\n|\r|\n)+/g, ' | ');

  // Se houver múltiplas barras com espaços em sequência, reduz para " | "
  str = str.replace(/(?:\s*\|\s*)+/g, ' | ');

  // Remove espaços duplicados
  str = str.replace(/[ \t]+/g, ' ');

  // Remove separadores e espaços no início e no final
  str = str.replace(/^(\s*\|\s*)+/, '').replace(/(\s*\|\s*)+$/, '').trim();

  return str;
}

/**
 * Escapa uma célula individual para CSV conforme especificação RFC 4180:
 * - Delimitador ponto e vírgula (;)
 * - Qualquer quebra de linha interna é convertida para " | " em linha única
 * - Células contendo ponto e vírgula (;) ou aspas duplas (") são envolvidas
 *   por aspas duplas, com aspas internas duplicadas ("").
 */
export function escapeCSVCell(val: any): string {
  if (val === undefined || val === null) return '';
  const str = sanitizeTextForCSV(val);
  if (str.includes(';') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formata valores de data para texto em dd/mm/aaaa para exportação CSV.
 */
export function formatDateForCSV(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return `${day}/${month}/${year}`;
  }
  if (typeof val === 'object' && typeof (val as any).toDate === 'function') {
    const d = (val as any).toDate();
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const str = String(val).trim();
  if (!str || str === '-' || str === '—') return '';
  try {
    const norm = normalizeDateValue(str, 'Data', false);
    if (norm) {
      return norm.split(' ')[0];
    }
  } catch (_) {
    // Caso ocorra exceção na normalização, fallback para string limpa
  }
  return str;
}

/**
 * Formata valores de data e hora para texto em dd/mm/aaaa HH:mm:ss para exportação CSV.
 */
export function formatDateTimeForCSV(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  let d: Date | null = null;
  if (val instanceof Date) {
    d = isNaN(val.getTime()) ? null : val;
  } else if (typeof val === 'object' && typeof (val as any).toDate === 'function') {
    const parsed = (val as any).toDate();
    d = isNaN(parsed.getTime()) ? null : parsed;
  } else if (typeof val === 'number') {
    const parsed = new Date(val > 1e11 ? val : val * 1000);
    d = isNaN(parsed.getTime()) ? null : parsed;
  } else if (typeof val === 'string') {
    const str = val.trim();
    if (!str || str === '—' || str === '-') return '';
    try {
      const norm = normalizeDateValue(str, 'Data/Hora', true);
      if (norm) {
        if (norm.includes(' ')) {
          const [dPart, tPart] = norm.split(' ');
          const tSegments = tPart.split(':');
          const hh = (tSegments[0] || '00').padStart(2, '0');
          const mm = (tSegments[1] || '00').padStart(2, '0');
          const ss = (tSegments[2] || '00').padStart(2, '0');
          return `${dPart} ${hh}:${mm}:${ss}`;
        }
        return `${norm} 00:00:00`;
      }
    } catch (_) {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) d = parsed;
    }
  }

  if (d && !isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
  return String(val).trim();
}

/**
 * Formata valores monetários/numéricos para CSV:
 * Vírgula decimal e SEM separador de milhar (ex.: 53700,00)
 */
export function formatNumberForCSV(val: any, isCurrency = false): string {
  if (val === undefined || val === null || val === '') return '';
  let num: number | null = null;
  if (typeof val === 'number') {
    num = isNaN(val) ? null : val;
  } else {
    try {
      const norm = normalizeNumericValue(val, isCurrency ? 'Valor' : 'Numero', undefined, '');
      num = typeof norm === 'number' && !isNaN(norm) ? norm : null;
    } catch (_) {
      num = null;
    }
  }
  if (num === null || isNaN(num)) return '';
  return num.toFixed(2).replace('.', ',');
}

/**
 * Formata valores inteiros para CSV (ex.: Tempo = 35)
 */
export function formatIntegerForCSV(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  let num: number | null = null;
  if (typeof val === 'number') {
    num = isNaN(val) ? null : Math.round(val);
  } else {
    try {
      const norm = normalizeNumericValue(val, 'Numero', undefined, '');
      num = typeof norm === 'number' && !isNaN(norm) ? Math.round(norm) : null;
    } catch (_) {
      num = null;
    }
  }
  if (num === null || isNaN(num)) return String(val).trim();
  return String(num);
}


/**
 * Distância de Levenshtein entre duas strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix: number[][] = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;
  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i - 1] + 1, // substitution
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1      // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Localiza a opção cadastrada na Segmentação mais parecida com o valor informado
 * para apresentar como sugestão na mensagem de erro (sem aplicar automaticamente).
 */
export function findBestSuggestion(val: string, options: string[]): string | null {
  if (!val || !Array.isArray(options) || options.length === 0) return null;
  const cleanVal = val.trim().toUpperCase();
  const normVal = cleanVal
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');

  let bestMatch: string | null = null;
  let highestScore = 0;

  for (const opt of options) {
    if (!opt) continue;
    const cleanOpt = String(opt).trim().toUpperCase();
    const normOpt = cleanOpt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '');

    // 1. Casamento direto normalizado (ignora pontos, hífens, espaços, acentos)
    if (normVal && normVal === normOpt) {
      return opt;
    }

    // 2. Pontuação por proximidade de Levenshtein
    const maxLen = Math.max(cleanVal.length, cleanOpt.length);
    if (maxLen === 0) continue;
    const dist = levenshteinDistance(cleanVal, cleanOpt);
    const score = 1 - dist / maxLen;

    if (score > highestScore && score >= 0.4) {
      highestScore = score;
      bestMatch = opt;
    }
  }

  return bestMatch;
}

/**
 * Obtém as opções válidas cadastradas na Segmentação para uma coluna específica.
 */
export function getOpcoesSegmentacaoParaColuna(
  coluna: ColunaSegmentadaMassiva,
  segmentacoes?: Record<SegmentacaoKey, string[]>
): string[] {
  const keys = MAPA_COLUNA_SEGMENTACAO_KEY[coluna];
  if (!keys) return [];
  const optionsSet = new Set<string>();
  keys.forEach((k) => {
    const list =
      segmentacoes && Array.isArray(segmentacoes[k]) && segmentacoes[k].length > 0
        ? segmentacoes[k]
        : DEFAULT_SEGMENTATIONS[k];
    if (Array.isArray(list)) {
      list.forEach((opt) => {
        if (opt !== undefined && opt !== null) {
          const trimmed = String(opt).trim();
          if (trimmed) optionsSet.add(trimmed);
        }
      });
    }
  });
  return Array.from(optionsSet);
}

/**
 * 1) Validação das colunas segmentadas na importação massiva:
 * - Colunas: Status Informe (Campo), Resp.Medição, Pendência (Implantação), Pendência (Celula Sap), Pendência (Projetos), Responsavel
 * - Para cada célula preenchida, o valor precisa existir na aba "Segmentação" EXATAMENTE como está cadastrado
 *   (mesma grafia, mesma pontuação, mesmos espaços e hífens). Comparação por texto exato, sem corrigir nem aproximar.
 * - Células vazias são permitidas.
 * - Retorna array com todas as divergências identificadas.
 */
export function validarColunasSegmentadas(
  linhas: Record<string, any>[],
  segmentacoes?: Record<SegmentacaoKey, string[]>
): SegmentacaoDivergencia[] {
  const divergencias: SegmentacaoDivergencia[] = [];

  linhas.forEach((linha, idx) => {
    const numLinha = typeof linha._rowNumber === 'number' ? linha._rowNumber : idx + 2;

    COLUNAS_SEGMENTADAS_MASSIVA.forEach((colName) => {
      let rawVal: any = undefined;
      for (const k of Object.keys(linha)) {
        if (k === '_rowNumber') continue;
        const matched = matchCanonicalColumn(k);
        if (matched === colName || k.trim().toLowerCase() === colName.toLowerCase()) {
          rawVal = linha[k];
          break;
        }
      }

      if (rawVal === undefined || rawVal === null) return;
      const strVal = String(rawVal).trim();
      if (!strVal) return; // Células vazias são permitidas

      const opcoesValidas = getOpcoesSegmentacaoParaColuna(colName, segmentacoes);

      // Regra estrita: Comparação por texto exato, sem corrigir nem aproximar
      const existeExato = opcoesValidas.includes(strVal);

      if (!existeExato) {
        const sugestao = findBestSuggestion(strVal, opcoesValidas);
        divergencias.push({
          linha: numLinha,
          coluna: colName,
          valorInformado: strVal,
          mensagem: 'Valor não cadastrado na Segmentação',
          sugestao,
        });
      }
    });
  });

  return divergencias;
}

/**
 * 2) Verificação das colunas de Leitura para atualização da Base Matriz:
 * - Todas as 25 colunas de Leitura da aba "Registros" (BLOCO_1_KEYS) devem ser identificadas na planilha com os nomes corretos.
 * - Retorna se todas estão presentes e a lista de ausentes/divergentes.
 */
export function verificarColunasLeituraMatriz(detectedColumns: string[]): {
  todasPresentes: boolean;
  ausentes: string[];
} {
  const ausentes = BLOCO_1_KEYS.filter((col) => !detectedColumns.includes(col));
  return {
    todasPresentes: ausentes.length === 0,
    ausentes,
  };
}

/**
 * Gera e dispara download de arquivo CSV com BOM UTF-8 (\uFEFF)
 */
export function downloadCSVFile(content: string, filename: string) {
  const finalName = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Lê o conteúdo do arquivo com fallback inteligente de encoding (UTF-8 e ISO-8859-1)
 */
async function readTextFileWithEncodingFallback(file: File): Promise<string> {
  if (typeof FileReader === 'undefined' && typeof (file as any).text === 'function') {
    return (file as any).text();
  }
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const text = (r.result as string) || '';
      // Se aparecer caractere de substituição , relê com ISO-8859-1
      if (text.includes('\uFFFD')) {
        const rLatin = new FileReader();
        rLatin.onload = () => resolve((rLatin.result as string) || '');
        rLatin.onerror = () => resolve(text);
        rLatin.readAsText(file, 'ISO-8859-1');
      } else {
        resolve(text);
      }
    };
    r.onerror = () => reject(new Error('Erro ao ler arquivo CSV.'));
    r.readAsText(file, 'UTF-8');
  });
}

/**
 * Lê e analisa arquivo CSV para Importação Padrão e Massiva
 */
export async function readCSVFile(file: File): Promise<{
  sheetName: string;
  data: Record<string, any>[];
  detectedColumns: string[];
  rawHeaders: string[];
}> {
  const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv');
  if (!isCsv) {
    throw new Error('Formato inválido. Envie um arquivo .csv (use o modelo)');
  }

  const rawText = await readTextFileWithEncodingFallback(file);
  const cleanText = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    throw new Error('O arquivo CSV selecionado está vazio.');
  }

  // Parse com PapaParse preservando quebras de linha e aspas internas RFC 4180
  const parsed = Papa.parse<string[]>(cleanText, {
    header: false,
    skipEmptyLines: 'greedy',
    delimitersToGuess: [';', ',', '\t', '|'],
  });

  const rows2D = parsed.data;
  if (!rows2D || rows2D.length === 0) {
    throw new Error('O arquivo CSV está vazio ou sem linhas de dados.');
  }

  // Localiza a linha de cabeçalho (busca nas primeiras 25 linhas)
  let bestHeaderRowIndex = 0;
  let highestScore = -1;
  const maxSearch = Math.min(rows2D.length, 25);

  for (let r = 0; r < maxSearch; r++) {
    const row = rows2D[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let score = 0;
    let hasDC = false;

    row.forEach((cell) => {
      const cellStr = String(cell || '').trim();
      if (cellStr) {
        const canonical = matchCanonicalColumn(cellStr);
        if (canonical) {
          score += 10;
          if (canonical === 'DC') {
            hasDC = true;
            score += 100;
          }
        }
      }
    });

    if (hasDC) score += 500;
    if (score > highestScore) {
      highestScore = score;
      bestHeaderRowIndex = r;
    }
  }

  const rawHeaderRow: any[] = rows2D[bestHeaderRowIndex] || [];
  const headerMap: Record<number, { raw: string; canonical: string }> = {};
  const detectedColumnsSet = new Set<string>();
  const rawHeaders: string[] = [];

  rawHeaderRow.forEach((colVal, colIdx) => {
    const raw = String(colVal || '').trim();
    if (raw) {
      rawHeaders.push(raw);
      const canonical = matchCanonicalColumn(raw) || raw;
      headerMap[colIdx] = { raw, canonical };
      if (matchCanonicalColumn(raw)) {
        detectedColumnsSet.add(canonical);
      }
    }
  });

  // Converte linhas de dados
  const cleanedData: Record<string, any>[] = [];

  for (let r = bestHeaderRowIndex + 1; r < rows2D.length; r++) {
    const rowData = rows2D[r];
    if (!Array.isArray(rowData) || rowData.length === 0) continue;

    const cleanRow: Record<string, any> = {};
    let hasAnyValue = false;

    // 1ª passada: extrai os valores brutos mapeados
    Object.keys(headerMap).forEach((colIdxStr) => {
      const colIdx = Number(colIdxStr);
      const { canonical } = headerMap[colIdx];
      const rawVal = rowData[colIdx];

      let formattedVal = '';
      if (rawVal !== undefined && rawVal !== null) {
        formattedVal = String(rawVal).trim();
      }

      cleanRow[canonical] = formattedVal;
      if (formattedVal !== '') {
        hasAnyValue = true;
      }
    });

    const dcValue = cleanDC(cleanRow['DC']);
    if (hasAnyValue && dcValue) {
      cleanRow['DC'] = dcValue;
      cleanRow['_rowNumber'] = r + 1;

      // 4) DR em Notação Científica: recupera a partir da DC
      if (cleanRow['DR'] !== undefined) {
        cleanRow['DR'] = recoverIdentifierFromDC(cleanRow['DR'], dcValue, 'DR', r + 1);
      }

      // Aplica verificação de notação científica em outras colunas de identificação
      IDENTIFIER_COLUMNS.forEach((idCol) => {
        if (idCol !== 'DC' && cleanRow[idCol] !== undefined && cleanRow[idCol] !== '') {
          cleanRow[idCol] = recoverIdentifierFromDC(cleanRow[idCol], dcValue, idCol, r + 1);
        }
      });

      // 1) e 2) Normalização por tipo de coluna
      Object.keys(cleanRow).forEach((colName) => {
        const val = cleanRow[colName];

        // COLUNAS DE DATA
        if (DATE_COLUMNS.has(colName)) {
          cleanRow[colName] = normalizeDateValue(val, colName, false, r + 1);
        }
        // COLUNAS NUMÉRICAS
        else if (NUMERIC_COLUMNS.has(colName)) {
          if (colName === 'Tempo') {
            const num = normalizeNumericValue(val, colName, r + 1, '');
            cleanRow[colName] = num === '' ? '' : String(Math.round(num as number));
          } else {
            // Orçamento, Valor Parcial R$, Valor Final R$, Valor Faturado, Saldo
            const num = normalizeNumericValue(val, colName, r + 1, '');
            cleanRow[colName] = num === '' ? '' : formatDecimalBR(num as number);
          }
        }
        // COLUNAS DE TEXTO (DC, DR, Seq, Dc Simulação, Pedido, AGING, Mês Input, etc.)
        // Mantêm o valor exatamente como veio em string, sem conversão numérica
        else {
          cleanRow[colName] = val !== undefined && val !== null ? String(val).trim() : '';
        }
      });

      const regResolved = getRegistroRegional(cleanRow);
      if (regResolved) {
        cleanRow['REG'] = regResolved;
      }
      cleanedData.push(cleanRow);
    }
  }

  if (cleanedData.length === 0) {
    throw new Error(
      'Coluna "DC" não encontrada no CSV ou sem valores preenchidos. Verifique se o cabeçalho possui a coluna "DC".'
    );
  }

  return {
    sheetName: 'CSV',
    data: cleanedData,
    detectedColumns: Array.from(detectedColumnsSet),
    rawHeaders,
  };
}

export const readExcelFile = readCSVFile;

/**
 * 1) MODELO A: Modelo_Importacao_Padrao_Base_Matriz_VTAL.csv
 */
export function downloadModeloImportacaoPadrao() {
  const headers = [...BLOCO_1_KEYS];
  const sampleRows: Record<string, string>[] = [
    {
      'DC': '121500000001/2753',
      'REG': 'RSUL',
      'TIPO (Carteira)': 'FTTH EXPANSÃO',
      'Tipo de DC': 'PROJETO REDE',
      'DR': '121500000001',
      'Seq': '0020',
      'Dc Simulação': 'SIM-100201',
      'Orçamento': '53700,00',
      'Status Med. Parcial': 'APROVADA',
      'Valor Parcial R$': '15200,00',
      'Status Med. Final': 'EM ANÁLISE',
      'Valor Final R$': '38500,00',
      'Pedido': '4500123456',
      'Valor Faturado': '53700,00',
      'Saldo': '0,00',
      'Tempo': '35',
      'AGING': '10',
      'Data Status': '13/04/2026',
      'UF': 'PR',
      'Localidade': 'CURITIBA',
      'Tipo de Projeto': 'EXPANSÃO PON',
      'Descricao': 'IMPLANTAÇÃO REDE ÓPTICA BAIRRO CENTRO',
      'Status da DC (Atual)': 'EM EXECUÇÃO',
      'Plan. Estruturante': 'INPUT',
      'Mês Input': 'mai/2026',
    },
    {
      'DC': '121500000002/2754',
      'REG': 'RMG',
      'TIPO (Carteira)': 'REDE PRIMÁRIA',
      'Tipo de DC': 'MANUTENÇÃO',
      'DR': '121500000002',
      'Seq': '07.26',
      'Dc Simulação': 'SIM-100202',
      'Orçamento': '85400,00',
      'Status Med. Parcial': 'PENDENTE',
      'Valor Parcial R$': '0,00',
      'Status Med. Final': 'NÃO INICIADA',
      'Valor Final R$': '0,00',
      'Pedido': '4500123457',
      'Valor Faturado': '0,00',
      'Saldo': '85400,00',
      'Tempo': '40',
      'AGING': '18',
      'Data Status': '20/04/2026',
      'UF': 'MG',
      'Localidade': 'BELO HORIZONTE',
      'Tipo de Projeto': 'ANEL DEDICADO',
      'Descricao': 'LANÇAMENTO DE CABO 36 FO',
      'Status da DC (Atual)': 'EM ANDAMENTO',
      'Plan. Estruturante': 'BACKLOG',
      'Mês Input': 'jun/2026',
    },
    {
      'DC': '121500000003/2755',
      'REG': 'RCO',
      'TIPO (Carteira)': 'CLIENTES CORPORATIVOS',
      'Tipo de DC': 'PROJETO ESPECIAL',
      'DR': '121500000003',
      'Seq': 'AERE',
      'Dc Simulação': 'SIM-100203',
      'Orçamento': '124800,00',
      'Status Med. Parcial': 'APROVADA',
      'Valor Parcial R$': '60000,00',
      'Status Med. Final': 'APROVADA',
      'Valor Final R$': '64800,00',
      'Pedido': '4500123458',
      'Valor Faturado': '124800,00',
      'Saldo': '0,00',
      'Tempo': '55',
      'AGING': '5',
      'Data Status': '22/04/2026',
      'UF': 'GO',
      'Localidade': 'GOIÂNIA',
      'Tipo de Projeto': 'INTERLIGAÇÃO BACKBONE',
      'Descricao': 'AMPLIAÇÃO ROTA ÓPTICA GOIÂNIA-ANÁPOLIS',
      'Status da DC (Atual)': 'OBRA CONCLUÍDA',
      'Plan. Estruturante': 'INPUT',
      'Mês Input': 'jul/2026',
    },
  ];

  const headerLine = headers.map(escapeCSVCell).join(';');
  const dataLines = sampleRows.map((r) => headers.map((h) => escapeCSVCell(r[h] || '')).join(';'));
  const csvContent = [headerLine, ...dataLines].join('\r\n') + '\r\n';

  downloadCSVFile(csvContent, 'Modelo_Importacao_Padrao_Base_Matriz_VTAL.csv');
}

/**
 * 1) MODELO B: Modelo_Importacao_Massiva_Acompanhamento_VTAL.csv
 */
export function downloadModeloImportacaoMassiva() {
  const headers = ['DC', ...BLOCO_2_KEYS];
  const sampleRows: Record<string, string>[] = [
    {
      'DC': 'DC-100201',
      'Status Informe (Campo)': 'EM EXECUÇÃO',
      'Resp.Medição': 'PATRICK',
      'Pendência (Implantação)': 'OK',
      'Pendência (Celula Sap)': 'OK',
      'Pendência (Projetos)': 'OK',
      'Data Previsão Entrega (Medição)': '15/09/2024',
      'Data Previsão Entrega (Projeto)': '10/09/2024',
      'Responsavel': 'MEDIÇÃO',
      'Data Tratativa': '30/08/2024',
      'OBS (Medição)': 'Aguardando validação da medição em campo.',
    },
    {
      'DC': 'DC-100202',
      'Status Informe (Campo)': 'PARALISADA',
      'Resp.Medição': 'SHEILA',
      'Pendência (Implantação)': 'FOTOS',
      'Pendência (Celula Sap)': 'BAIXA PARCIAL',
      'Pendência (Projetos)': 'ASBUILT',
      'Data Previsão Entrega (Medição)': '25/09/2024',
      'Data Previsão Entrega (Projeto)': '20/09/2024',
      'Responsavel': 'IMPLANTAÇÃO',
      'Data Tratativa': '28/08/2024',
      'OBS (Medição)': 'Pendente envio de fotos complementares.',
    },
  ];

  const headerLine = headers.map(escapeCSVCell).join(';');
  const dataLines = sampleRows.map((r) => headers.map((h) => escapeCSVCell(r[h] || '')).join(';'));
  const csvContent = [headerLine, ...dataLines].join('\r\n') + '\r\n';

  downloadCSVFile(csvContent, 'Modelo_Importacao_Massiva_Acompanhamento_VTAL.csv');
}

/**
 * 1) MODELO C: Modelo_Importacao_FR.csv
 */
export function downloadModeloImportacaoFR() {
  const headers = [...FR_COLUMNS];
  const sampleRows: Record<string, string>[] = [
    {
      'UF': 'PR',
      'DC-M': 'DC-100201',
      'REG': 'RSUL',
      'Mês': 'MAI/2026',
      'CENTRO': 'C100',
      'LOCALIDADE DE PRESTAÇÃO': 'CURITIBA',
      'DATA DA SOLICITAÇÃO': '10/05/2026',
      'DC MIGRADA/OPERAÇÃO': 'NÃO',
      'Nº MEDIÇÃO': 'MED-01',
      'Nº PEDIDO': '4500123456',
      'ITEM DO PEDIDO': '10',
      'VALOR FR': '15200,00',
      'FR': 'FR-99881',
    },
    {
      'UF': 'MG',
      'DC-M': 'DC-100202',
      'REG': 'RMG',
      'Mês': 'JUN/2026',
      'CENTRO': 'C200',
      'LOCALIDADE DE PRESTAÇÃO': 'BELO HORIZONTE',
      'DATA DA SOLICITAÇÃO': '15/06/2026',
      'DC MIGRADA/OPERAÇÃO': 'NÃO',
      'Nº MEDIÇÃO': 'MED-02',
      'Nº PEDIDO': '4500123457',
      'ITEM DO PEDIDO': '20',
      'VALOR FR': '85400,00',
      'FR': 'FR-99882',
    },
  ];

  const headerLine = headers.map(escapeCSVCell).join(';');
  const dataLines = sampleRows.map((r) => headers.map((h) => escapeCSVCell(r[h] || '')).join(';'));
  const csvContent = [headerLine, ...dataLines].join('\r\n') + '\r\n';

  downloadCSVFile(csvContent, 'Modelo_Importacao_FR.csv');
}

/**
 * 2) EXPORTAÇÃO A: VTAL_OBRAS_Export_AAAA-MM-DD.csv (aba Registros)
 * Colunas na ordem exata: 25 colunas do Bloco 1 + 10 colunas do Bloco 2 (sem DC duplicada)
 */
export function exportarRegistrosParaCSV(registros: Registro[], nomeArquivo = 'VTAL_OBRAS_Export') {
  const exportHeaders = ALL_COLUMNS.map((col) =>
    (col as string) === 'Backlog/Input?' ? 'Plan. Estruturante' : col
  );

  const headerLine = exportHeaders.map(escapeCSVCell).join(';');

  const dataLines = registros.map((item) => {
    return exportHeaders
      .map((colName) => {
        const rawVal = (item as any)[colName];
        if (rawVal === undefined || rawVal === null || rawVal === '') return '';

        if (IDENTIFIER_COLUMNS.has(colName)) {
          return escapeCSVCell(String(rawVal).trim());
        }
        if (DATE_COLUMNS.has(colName)) {
          return escapeCSVCell(formatDateForCSV(rawVal));
        }
        if (CURRENCY_COLUMNS.has(colName)) {
          return escapeCSVCell(formatNumberForCSV(rawVal, true));
        }
        if (INTEGER_COLUMNS.has(colName)) {
          return escapeCSVCell(formatIntegerForCSV(rawVal));
        }
        return escapeCSVCell(String(rawVal).trim());
      })
      .join(';');
  });

  const csvContent = [headerLine, ...dataLines].join('\r\n') + '\r\n';
  const dataAtual = new Date().toISOString().split('T')[0];
  const finalFilename = `${nomeArquivo}_${dataAtual}.csv`;

  downloadCSVFile(csvContent, finalFilename);
}

export const exportarRegistrosParaExcel = exportarRegistrosParaCSV;

/**
 * 2) EXPORTAÇÃO B: Base_FR_Filtrada_AAAA-MM-DD.csv (aba FR)
 */
export function exportarFRParaCSV(frs: FRRegistro[], nomeArquivo = 'Base_FR_Filtrada') {
  const exportHeaders = [...FR_COLUMNS];
  const headerLine = exportHeaders.map(escapeCSVCell).join(';');

  const dataLines = frs.map((item) => {
    return exportHeaders
      .map((colName) => {
        const rawVal = (item as any)[colName];
        if (rawVal === undefined || rawVal === null || rawVal === '') return '';

        if (IDENTIFIER_COLUMNS.has(colName)) {
          return escapeCSVCell(String(rawVal).trim());
        }
        if (colName === 'DATA DA SOLICITAÇÃO') {
          return escapeCSVCell(formatDateForCSV(rawVal));
        }
        if (colName === 'VALOR FR') {
          return escapeCSVCell(formatNumberForCSV(rawVal, true));
        }
        return escapeCSVCell(String(rawVal).trim());
      })
      .join(';');
  });

  const csvContent = [headerLine, ...dataLines].join('\r\n') + '\r\n';
  const dataAtual = new Date().toISOString().split('T')[0];
  const finalFilename = nomeArquivo.toLowerCase().endsWith('.csv')
    ? nomeArquivo
    : `${nomeArquivo}_${dataAtual}.csv`;

  downloadCSVFile(csvContent, finalFilename);
}

export const exportarFRParaExcel = exportarFRParaCSV;

/**
 * 2) EXPORTAÇÃO C: VTAL_Relatorio_Auditoria_Edicoes_AAAA-MM-DD.csv (histórico de edições)
 */
export function exportarRelatorioHistoricoParaCSV(
  historico: HistoricoEdicaoItem[],
  nomeArquivo = 'VTAL_Relatorio_Auditoria_Edicoes'
) {
  const headers = [
    'DC (Obra)',
    'Usuário que editou',
    'Coluna editada',
    'Data/Hora da edição',
    'Valor Anterior',
    'Valor Novo',
  ];

  const headerLine = headers.map(escapeCSVCell).join(';');

  const dataLines = historico.map((item) => {
    const dc = item.dc || '';
    const user = item.userName ? `${item.userName} (${item.userEmail})` : item.userEmail || '';
    const col = item.colunaEditada || item.coluna || '';
    const dt = item.timestamp
      ? formatDateTimeForCSV(item.timestamp)
      : formatDateTimeForCSV(item.dataHora);
    const ant = item.valorAnterior || '—';
    const nov = item.valorNovo || '—';

    return [dc, user, col, dt, ant, nov].map(escapeCSVCell).join(';');
  });

  const csvContent = [headerLine, ...dataLines].join('\r\n') + '\r\n';
  const dataAtual = new Date().toISOString().split('T')[0];
  const finalFilename = `${nomeArquivo}_${dataAtual}.csv`;

  downloadCSVFile(csvContent, finalFilename);
}

export const exportarRelatorioHistoricoParaExcel = exportarRelatorioHistoricoParaCSV;

/**
 * 2) EXPORTAÇÃO D: Relatorio_DCs_Nao_Encontradas_AAAA-MM-DD.csv
 */
export function exportarRelatorioDcsNaoEncontradas(notFoundRows: { dc: string; rowData: any }[]) {
  if (notFoundRows.length === 0) return;
  const sampleDataKeys = Object.keys(notFoundRows[0]?.rowData || {});
  const headers = ['DC Informada', 'Status', ...sampleDataKeys];
  const headerLine = headers.map(escapeCSVCell).join(';');

  const dataLines = notFoundRows.map((item) => {
    const rowValues = [
      item.dc,
      'Não encontrada na base de dados (Ignorada)',
      ...sampleDataKeys.map((k) => item.rowData?.[k] || ''),
    ];
    return rowValues.map(escapeCSVCell).join(';');
  });

  const csvContent = [headerLine, ...dataLines].join('\r\n') + '\r\n';
  const dataAtual = new Date().toISOString().split('T')[0];
  downloadCSVFile(csvContent, `Relatorio_DCs_Nao_Encontradas_${dataAtual}.csv`);
}

/**
 * Validação e correspondência de cabeçalhos de FR
 */
export function matchFRColumn(rawHeader: string): string | null {
  if (!rawHeader) return null;
  const rawTrimmed = String(rawHeader).trim();
  if (!rawTrimmed) return null;

  const directMatch = FR_COLUMNS.find(
    (col) => col.toLowerCase() === rawTrimmed.toLowerCase()
  );
  if (directMatch) return directMatch;

  const clean = rawTrimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[º°ª#?:.\-_/\\()\[\]{}|;,+*!&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  if (clean === 'UF' || clean === 'ESTADO' || clean === 'SIGLA UF') return 'UF';
  if (
    clean === 'DC M' ||
    clean === 'DCM' ||
    clean === 'DC_M' ||
    clean === 'DC MEDICAO' ||
    clean === 'DCMEDICAO'
  ) return 'DC-M';
  if (clean === 'REG' || clean === 'REGIONAL' || clean === 'REGIAO') return 'REG';
  if (
    clean === 'MES' ||
    clean === 'MES REF' ||
    clean === 'MES REFERENCIA' ||
    clean === 'MES DE REFERENCIA' ||
    clean === 'MES ANO' ||
    clean === 'MES/ANO' ||
    clean === 'MES SOLICITACAO' ||
    clean === 'MES DA SOLICITACAO' ||
    clean === 'MES BASE' ||
    clean === 'COMPETENCIA' ||
    clean === 'MES COMPETENCIA' ||
    clean === 'PERIODO' ||
    (clean.includes('MES') && !clean.includes('INPUT')) ||
    clean.includes('COMPETENCIA')
  ) return 'Mês';
  if (clean === 'CENTRO' || clean === 'CENTRO DE CUSTO' || clean === 'CC') return 'CENTRO';
  if (
    clean === 'LOCALIDADE DE PRESTACAO' ||
    clean === 'LOCALIDADE PRESTACAO' ||
    clean.includes('PRESTACAO') ||
    clean === 'LOCALIDADE'
  ) return 'LOCALIDADE DE PRESTAÇÃO';
  if (clean.includes('DATA') && (clean.includes('SOLICIT') || clean.includes('SOLICITACAO'))) return 'DATA DA SOLICITAÇÃO';
  if (clean.includes('MIGRADA') || clean.includes('OPERACAO') || clean.includes('MIGRADA OPERACAO')) return 'DC MIGRADA/OPERAÇÃO';
  if (
    (clean.includes('MEDICAO') || clean.includes('MED')) &&
    (clean.includes('N') || clean.includes('NUM') || clean.includes('NR'))
  ) return 'Nº MEDIÇÃO';
  if (
    (clean.includes('PEDIDO') || clean.includes('PED')) &&
    (clean.includes('N') || clean.includes('NUM') || clean.includes('NR'))
  ) return 'Nº PEDIDO';
  if (clean.includes('ITEM') && clean.includes('PEDIDO')) return 'ITEM DO PEDIDO';
  if (clean === 'ITEM') return 'ITEM DO PEDIDO';
  if (
    clean === 'VALOR FR' ||
    clean === 'VALOR FR R$' ||
    clean === 'VLR FR' ||
    clean === 'VALOR' ||
    clean === 'VALOR R$' ||
    clean === 'VLR' ||
    clean === 'VALOR TOTAL' ||
    clean === 'VALOR FATURADO' ||
    clean === 'VALOR DA FR' ||
    clean === 'VLR DA FR' ||
    clean === 'VALOR DA MEDICAO' ||
    clean === 'VALOR LIQUIDO' ||
    clean === 'VALOR BRUTO' ||
    clean === 'FATURAMENTO' ||
    (clean.includes('VALOR') && (clean.includes('FR') || clean.includes('FATUR') || clean.includes('MEDIC') || clean.includes('TOTAL'))) ||
    clean.includes('VALOR FR')
  ) return 'VALOR FR';
  if (clean === 'FR' || clean === 'NUMERO FR' || clean === 'N FR' || clean === 'NR FR') return 'FR';

  return null;
}

export interface ParseFRResult {
  valid: boolean;
  missingColumns: string[];
  data: Omit<FRRegistro, 'id'>[];
  totalRows: number;
  error?: string;
}

/**
 * Lê e analisa arquivo CSV de FR
 */
export async function parseFRFile(file: File): Promise<ParseFRResult> {
  const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv');
  if (!isCsv) {
    return {
      valid: false,
      missingColumns: [],
      data: [],
      totalRows: 0,
      error: 'Formato inválido. Envie um arquivo .csv (use o modelo)',
    };
  }

  try {
    const rawText = await readTextFileWithEncodingFallback(file);
    const cleanText = rawText.replace(/^\uFEFF/, '').trim();
    if (!cleanText) {
      throw new Error('O arquivo CSV selecionado está vazio.');
    }

    const parsed = Papa.parse<string[]>(cleanText, {
      header: false,
      skipEmptyLines: 'greedy',
      delimitersToGuess: [';', ',', '\t', '|'],
    });

    const rawJson = parsed.data;
    if (!rawJson || rawJson.length < 2) {
      throw new Error('O arquivo CSV precisa ter ao menos uma linha de cabeçalho e uma de dados.');
    }

    const headerRow = rawJson[0] || [];
    const columnMap = new Map<number, keyof Omit<FRRegistro, 'id' | '_updatedAt' | '_updatedBy'>>();
    const detectedColSet = new Set<string>();

    headerRow.forEach((col: any, idx: number) => {
      if (col !== undefined && col !== null && String(col).trim()) {
        const matched = matchFRColumn(String(col));
        if (matched) {
          columnMap.set(idx, matched as any);
          detectedColSet.add(matched);
        }
      }
    });

    // Valida se as 13 colunas obrigatórias estão presentes
    const missingColumns = FR_COLUMNS.filter((col) => !detectedColSet.has(col));
    if (missingColumns.length > 0) {
      return {
        valid: false,
        missingColumns,
        data: [],
        totalRows: 0,
        error: `Colunas obrigatórias ausentes no CSV: ${missingColumns.join(', ')}.`,
      };
    }

    // Processa linhas de dados
    const cleanedRows: Omit<FRRegistro, 'id'>[] = [];
    for (let i = 1; i < rawJson.length; i++) {
      const row = rawJson[i];
      if (!row || !Array.isArray(row)) continue;

      const hasAnyValue = row.some((val) => val !== undefined && val !== null && String(val).trim() !== '');
      if (!hasAnyValue) continue;

      const rowData: any = {};
      columnMap.forEach((colKey, colIdx) => {
        const rawVal = row[colIdx];
        if (rawVal === undefined || rawVal === null) {
          rowData[colKey] = colKey === 'VALOR FR' ? 0 : '';
          return;
        }

        if (colKey === 'DATA DA SOLICITAÇÃO') {
          rowData[colKey] = normalizeDateValue(rawVal, 'DATA DA SOLICITAÇÃO', true, i + 1);
        } else if (colKey === 'VALOR FR') {
          const num = normalizeNumericValue(rawVal, 'VALOR FR', i + 1, 0);
          rowData[colKey] = typeof num === 'number' ? num : 0;
        } else if (colKey === 'Mês') {
          rowData[colKey] = normalizeMesFR(rawVal, rowData['DATA DA SOLICITAÇÃO']);
        } else {
          rowData[colKey] = String(rawVal).trim();
        }
      });

      // Proteção contra notação científica nas colunas de identificação de FR
      const dcmVal = rowData['DC-M'] || '';
      IDENTIFIER_COLUMNS.forEach((idCol) => {
        if (rowData[idCol] !== undefined && rowData[idCol] !== '') {
          rowData[idCol] = recoverIdentifierFromDC(rowData[idCol], dcmVal, idCol, i + 1);
        }
      });

      FR_COLUMNS.forEach((col) => {
        if (rowData[col] === undefined) {
          rowData[col] = col === 'VALOR FR' ? 0 : '';
        }
      });

      if (!rowData['Mês'] || rowData['Mês'] === '-' || rowData['Mês'] === '—') {
        const mesFromDate = normalizeMesFR('', rowData['DATA DA SOLICITAÇÃO']);
        if (mesFromDate && mesFromDate !== '-') {
          rowData['Mês'] = mesFromDate;
        }
      }

      cleanedRows.push(rowData as Omit<FRRegistro, 'id'>);
    }

    return {
      valid: true,
      missingColumns: [],
      data: cleanedRows,
      totalRows: cleanedRows.length,
    };
  } catch (err: any) {
    return {
      valid: false,
      missingColumns: [],
      data: [],
      totalRows: 0,
      error: err.message || 'Erro ao processar o arquivo CSV de FR.',
    };
  }
}
