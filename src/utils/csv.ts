import Papa from 'papaparse';
import {
  Registro,
  BLOCO_1_KEYS,
  BLOCO_2_KEYS,
  ALL_COLUMNS,
  HistoricoEdicaoItem,
  getRegistroRegional,
  SegmentacaoKey,
  COLUNAS_SEGMENTADAS_MASSIVA,
  ColunaSegmentadaMassiva,
  MAPA_COLUNA_SEGMENTACAO_KEY,
  SegmentacaoDivergencia,
  DEFAULT_SEGMENTATIONS,
  RegistroVivo,
  RegistroVivoBloco1,
  RegistroVivoBloco2,
  VIVO_BLOCO_1_KEYS,
  VIVO_BLOCO_2_KEYS,
  VIVO_ALL_COLUMNS,
  SegmentacaoVivoKey,
  VIVO_SEGMENTATION_KEYS,
  COLUNAS_SEGMENTADAS_MASSIVA_VIVO,
  ColunaSegmentadaMassivaVivo,
  MAPA_COLUNA_SEGMENTACAO_KEY_VIVO,
  cleanVivoID,
  isValidVivoID,
  getSafeVivoDocId,
} from '../types';
import { parseCurrencyValue, formatDecimalBR, formatBRL, formatCurrency } from './currency';

export {
  parseCurrencyValue,
  formatDecimalBR,
  formatBRL,
  formatCurrency,
  COLUNAS_SEGMENTADAS_MASSIVA,
  MAPA_COLUNA_SEGMENTACAO_KEY,
  COLUNAS_SEGMENTADAS_MASSIVA_VIVO,
  MAPA_COLUNA_SEGMENTACAO_KEY_VIVO,
};
export type { ColunaSegmentadaMassiva, SegmentacaoDivergencia, ColunaSegmentadaMassivaVivo };


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
    clean === 'R$ PRODUCAO BI.' ||
    clean === 'R$ PRODUÇÃO BI.' ||
    clean === 'R$ PRODUCAO BI' ||
    clean === 'R$ PRODUÇÃO BI' ||
    clean === 'RS PRODUCAO BI.' ||
    clean === 'RS PRODUÇÃO BI.' ||
    clean === 'RS PRODUCAO BI' ||
    clean === 'RS PRODUÇÃO BI' ||
    clean === 'PRODUCAO BI.' ||
    clean === 'PRODUÇÃO BI.' ||
    clean === 'PRODUCAO BI' ||
    clean === 'PRODUÇÃO BI' ||
    clean === 'PRODUCAO_BI' ||
    clean === 'PRODUÇÃO_BI' ||
    clean === 'R$_PRODUCAO_BI' ||
    clean === 'VALOR PRODUCAO BI' ||
    clean === 'VALOR PRODUÇÃO BI' ||
    (clean.includes('PRODUC') && clean.includes('BI')) ||
    (clean.includes('PRODUÇ') && clean.includes('BI'))
  ) {
    return 'R$ Produção BI.';
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
  'R$ Produção BI.',
]);

export const CURRENCY_COLUMNS = new Set([
  'Orçamento',
  'Valor Parcial R$',
  'Valor Final R$',
  'Valor Faturado',
  'Saldo',
  'R$ Produção BI.',
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
]);

export const IDENTIFIER_COLUMNS = new Set([
  'DC',
  'Pedido',
  'Dc Simulação',
  'DR',
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
 * Orçamento, Valor Parcial R$, Valor Final R$, Valor Faturado, Saldo e Tempo.
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
 * - Todas as 26 colunas de Leitura da aba "Registros" (BLOCO_1_KEYS) devem ser identificadas na planilha com os nomes corretos.
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

      if (detectedColumnsSet.has('REG')) {
        const regResolved = getRegistroRegional(cleanRow);
        if (regResolved && !cleanRow['REG']) {
          cleanRow['REG'] = regResolved;
        }
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
      'R$ Produção BI.': '53700,00',
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
      'R$ Produção BI.': '85400,00',
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
      'R$ Produção BI.': '124800,00',
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

/* =========================================================================
   VIVO: CANONICAL MATCHING, VALIDATION, PARSING & TEMPLATES
   ========================================================================= */

const VIVO_NUMERIC_COLUMNS = new Set([
  'OSP ORÇAMENTO',
  'OSP MEDIDO',
  'Faturado',
  'Produção Bi R$',
]);

const VIVO_DATE_COLUMNS = new Set([
  'Data Status',
  'Data Medição',
  'PRAZO DE MEDIÇÃO',
  'PRAZO PROJETO',
  'DATA TRATATIVA',
]);

/**
 * Mapeia cabeçalho bruto para nome canônico da VIVO
 */
export function matchCanonicalVivoColumn(rawHeader: string): string | null {
  if (!rawHeader) return null;
  const rawTrimmed = String(rawHeader).trim();
  if (!rawTrimmed) return null;

  const directMatch = VIVO_ALL_COLUMNS.find(
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

  // 1. ID (Identificador VIVO)
  if (
    clean === 'ID' ||
    clean === 'ID OBRA' ||
    clean === 'ID PROJETO' ||
    clean === 'CODIGO ID' ||
    clean === 'NUMERO ID' ||
    clean === 'N ID' ||
    clean === 'NO ID' ||
    clean === 'NR ID' ||
    clean === 'ID DA OBRA' ||
    clean === 'IDENTIFICADOR' ||
    clean === 'IDENTIFICADOR ID'
  ) {
    return 'ID';
  }

  // 2. Base: Leitura
  if (clean === 'REF' || clean === 'REFERENCIA' || clean === 'REF.' || clean.startsWith('REF ')) return 'REF';
  if (clean === 'REG' || clean === 'REGIONAL' || clean === 'REGIAO') return 'REG';
  if (clean === 'UF' || clean === 'ESTADO' || clean === 'SIGLA UF') return 'UF';
  if (clean === 'LOCALIDADE' || clean === 'CIDADE' || clean === 'MUNICIPIO') return 'Localidade';
  if (clean === 'ANO' || clean === 'EXERCICIO') return 'Ano';
  if (clean === 'PEDIDO' || clean === 'N PEDIDO' || clean === 'NUM PEDIDO' || clean === 'NUMERO PEDIDO' || clean === 'ORDEM') return 'Pedido';
  if (clean === 'DESC' || clean === 'DESC.' || clean === 'DESCRICAO' || clean === 'DESCRICAO DO PROJETO') return 'Desc.';
  if (clean === 'STATUS DRAFT' || clean === 'DRAFT' || clean === 'STATUS DO DRAFT') return 'Status Draft';
  if (clean === 'TIPO DE PROJETO' || clean === 'TIPO PROJETO' || clean === 'TIPO DO PROJETO') return 'Tipo de Projeto';
  if (clean === 'CONTRATO' || clean === 'NUMERO CONTRATO' || clean === 'N CONTRATO') return 'Contrato';
  if (clean === 'DATA STATUS' || clean === 'DT STATUS' || clean === 'DATA DO STATUS') return 'Data Status';
  if (clean === 'FAIXA STATUS' || clean === 'FAIXA DO STATUS') return 'Faixa Status';
  if (
    clean === 'STATUS MEDICAO FINAL' ||
    clean === 'STATUS MED FINAL' ||
    clean === 'MEDICAO FINAL STATUS' ||
    clean === 'STATUS DA MEDICAO FINAL'
  ) return 'Status Medição Final';
  if (clean === 'DATA MEDICAO' || clean === 'DT MEDICAO' || clean === 'DATA DA MEDICAO') return 'Data Medição';
  if (clean === 'FAIXA MEDICAO' || clean === 'FAIXA DA MEDICAO') return 'Faixa Medição';
  if (
    clean === 'OSP ORCAMENTO' ||
    clean === 'OSP ORCAMENTO R$' ||
    clean === 'ORCAMENTO OSP' ||
    clean === 'ORCAMENTO' ||
    clean === 'VALOR ORCAMENTO'
  ) return 'OSP ORÇAMENTO';
  if (
    clean === 'OSP MEDIDO' ||
    clean === 'OSP MEDIDO R$' ||
    clean === 'MEDIDO OSP' ||
    clean === 'MEDIDO' ||
    clean === 'VALOR MEDIDO'
  ) return 'OSP MEDIDO';
  if (
    clean === 'FATURADO' ||
    clean === 'VALOR FATURADO' ||
    clean === 'FATURAMENTO' ||
    clean === 'FATURADO R$'
  ) return 'Faturado';
  if (
    clean.includes('PRODUCAO BI') ||
    clean.includes('PRODUCAO BI R$') ||
    clean.includes('PROD BI') ||
    clean === 'R$ PRODUCAO BI' ||
    clean === 'R$ PRODUCAO BI.'
  ) return 'Produção Bi R$';
  if (
    clean === 'MES INPUT' ||
    clean === 'MES DE INPUT' ||
    clean === 'INPUT MES' ||
    clean.includes('MES INPUT')
  ) return 'Mês Input';

  // 3. Equipe: Edição
  if (
    clean === 'STATUS IMPL' ||
    clean === 'STATUS IMPLANTACAO' ||
    clean === 'STATUS DA IMPLANTACAO' ||
    clean.startsWith('STATUS IMPL')
  ) return 'STATUS IMPL';
  if (clean === 'PENDENCIA' || clean === 'TIPO PENDENCIA' || clean === 'PENDENCIAS') return 'PENDENCIA';
  if (
    clean === 'RESPONSAVEL PENDENCIA' ||
    clean === 'RESP PENDENCIA' ||
    clean === 'RESPONSAVEL PELA PENDENCIA'
  ) return 'RESPONSÁVEL PENDENCIA';
  if (
    clean === 'PRAZO DE MEDICAO' ||
    clean === 'PRAZO MEDICAO' ||
    clean === 'PRAZO DA MEDICAO'
  ) return 'PRAZO DE MEDIÇÃO';
  if (clean === 'PRAZO PROJETO' || clean === 'PRAZO DO PROJETO') return 'PRAZO PROJETO';
  if (
    clean === 'RESPONSAVEL MEDICAO' ||
    clean === 'RESP MEDICAO' ||
    clean === 'RESPONSAVEL PELA MEDICAO'
  ) return 'RESPONSÁVEL MEDIÇÃO';
  if (
    clean === 'OBS MEDICAO' ||
    clean === 'OBSERVACAO MEDICAO' ||
    clean === 'OBS DA MEDICAO' ||
    clean === 'OBSERVACOES MEDICAO'
  ) return 'OBS MEDIÇÃO';
  if (clean === 'DATA TRATATIVA' || clean === 'DT TRATATIVA' || clean === 'TRATATIVA DATA') return 'DATA TRATATIVA';
  if (
    clean === 'ID NOVO ANTIGO' ||
    clean === 'ID NOVO/ANTIGO' ||
    clean === 'ID ANTIGO NOVO' ||
    clean === 'ID NOVO OU ANTIGO'
  ) return 'ID NOVO/ANTIGO';

  return null;
}

/**
 * Reconhece automaticamente para qual base a planilha vai:
 * - Se o cabeçalho tiver a coluna "DC" é V.TAL.
 * - Se tiver a coluna "ID" é VIVO.
 * - Se não bater com nenhum dos dois, retorna "UNKNOWN".
 */
export function detectCSVClient(rawHeaders: string[]): 'VTAL' | 'VIVO' | 'UNKNOWN' {
  if (!Array.isArray(rawHeaders) || rawHeaders.length === 0) return 'UNKNOWN';

  let hasDC = false;
  let hasID = false;

  for (const h of rawHeaders) {
    if (!h) continue;
    const clean = String(h)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[º°ª#?:.\-_/\\()\[\]{}|;,+*!&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    // DC detection
    if (
      clean === 'DC' ||
      clean === 'NUMERO DC' ||
      clean === 'N DC' ||
      clean === 'CODIGO DC' ||
      clean === 'COD DC'
    ) {
      hasDC = true;
    }

    // ID detection
    if (
      clean === 'ID' ||
      clean === 'ID OBRA' ||
      clean === 'ID PROJETO' ||
      clean === 'CODIGO ID' ||
      clean === 'NUMERO ID' ||
      clean === 'N ID'
    ) {
      hasID = true;
    }
  }

  if (hasDC && !hasID) return 'VTAL';
  if (hasID && !hasDC) return 'VIVO';

  if (hasDC && hasID) {
    // If both tokens appear, check client-specific columns
    const hasVtalSpecific = rawHeaders.some((h) => {
      const c = String(h).toUpperCase();
      return c.includes('DR') || c.includes('CARTEIRA') || c.includes('DC SIMULA');
    });
    if (hasVtalSpecific) return 'VTAL';
    return 'VIVO';
  }

  return 'UNKNOWN';
}

/**
 * Lê os primeiros bytes de um arquivo para detectar o cliente (VTAL ou VIVO)
 */
export async function detectFileClient(file: File): Promise<'VTAL' | 'VIVO' | 'UNKNOWN'> {
  try {
    const textSample = await file.slice(0, 8192).text();
    const lines = textSample.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
    for (const line of lines.slice(0, 5)) {
      const delimiter = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ',';
      const tokens = line.split(delimiter).map((t) => t.replace(/^["']|["']$/g, '').trim());
      const detected = detectCSVClient(tokens);
      if (detected !== 'UNKNOWN') return detected;
    }
  } catch (err) {
    // ignore
  }
  return 'UNKNOWN';
}

/**
 * Verifica as 21 colunas de Leitura para atualização da Base Matriz VIVO
 */
export function verificarColunasLeituraMatrizVivo(detectedColumns: string[]): {
  todasPresentes: boolean;
  ausentes: string[];
} {
  const ausentes = VIVO_BLOCO_1_KEYS.filter((col) => !detectedColumns.includes(col));
  return {
    todasPresentes: ausentes.length === 0,
    ausentes,
  };
}

/**
 * Obtém as opções válidas cadastradas na Segmentação da VIVO para uma coluna específica.
 */
export function getOpcoesSegmentacaoVivoParaColuna(
  coluna: ColunaSegmentadaMassivaVivo,
  segmentacoesVivo?: Record<SegmentacaoVivoKey, string[]>
): string[] {
  const key = MAPA_COLUNA_SEGMENTACAO_KEY_VIVO[coluna];
  if (!key) return [];
  const list = segmentacoesVivo?.[key];
  if (Array.isArray(list)) {
    return list.map((opt) => String(opt || '').trim()).filter(Boolean);
  }
  return [];
}

/**
 * Validação das colunas segmentadas na importação massiva da VIVO:
 * - Colunas: STATUS IMPL, PENDENCIA, RESPONSÁVEL PENDENCIA, RESPONSÁVEL MEDIÇÃO
 * - Comparação por texto exato, sem aproximar. Células vazias são permitidas.
 */
export function validarColunasSegmentadasVivo(
  linhas: Record<string, any>[],
  segmentacoesVivo?: Record<SegmentacaoVivoKey, string[]>
): SegmentacaoDivergencia[] {
  const divergencias: SegmentacaoDivergencia[] = [];

  linhas.forEach((linha, idx) => {
    const numLinha = typeof linha._rowNumber === 'number' ? linha._rowNumber : idx + 2;

    COLUNAS_SEGMENTADAS_MASSIVA_VIVO.forEach((colName) => {
      let rawVal: any = undefined;
      for (const k of Object.keys(linha)) {
        if (k === '_rowNumber') continue;
        const matched = matchCanonicalVivoColumn(k);
        if (matched === colName || k.trim().toLowerCase() === colName.toLowerCase()) {
          rawVal = linha[k];
          break;
        }
      }

      if (rawVal === undefined || rawVal === null) return;
      const strVal = String(rawVal).trim();
      if (!strVal) return; // Vazio é permitido

      const opcoesValidas = getOpcoesSegmentacaoVivoParaColuna(colName, segmentacoesVivo);
      const existeExato = opcoesValidas.includes(strVal);

      if (!existeExato) {
        const sugestao = findBestSuggestion(strVal, opcoesValidas);
        divergencias.push({
          linha: numLinha,
          coluna: colName,
          valorInformado: strVal,
          mensagem: 'Valor não cadastrado na Segmentação da VIVO',
          sugestao,
        });
      }
    });
  });

  return divergencias;
}

/**
 * Lê e analisa arquivo CSV para VIVO (Padrão ou Massiva)
 */
export async function readCSVFileVivo(file: File): Promise<{
  sheetName: string;
  data: Record<string, any>[];
  detectedColumns: string[];
  rawHeaders: string[];
}> {
  const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv');
  if (!isCsv) {
    throw new Error('Formato inválido. Envie um arquivo .csv (use o modelo da VIVO)');
  }

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

  const rows2D = parsed.data;
  if (!rows2D || rows2D.length === 0) {
    throw new Error('O arquivo CSV está vazio ou sem linhas de dados.');
  }

  // Localiza cabeçalho com ID
  let bestHeaderRowIndex = 0;
  let highestScore = -1;
  const maxSearch = Math.min(rows2D.length, 25);

  for (let r = 0; r < maxSearch; r++) {
    const row = rows2D[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let score = 0;
    let hasID = false;

    row.forEach((cell) => {
      const cellStr = String(cell || '').trim();
      if (cellStr) {
        const canonical = matchCanonicalVivoColumn(cellStr);
        if (canonical) {
          score += 10;
          if (canonical === 'ID') {
            hasID = true;
            score += 100;
          }
        }
      }
    });

    if (hasID) score += 500;
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
      const canonical = matchCanonicalVivoColumn(raw) || raw;
      headerMap[colIdx] = { raw, canonical };
      if (matchCanonicalVivoColumn(raw)) {
        detectedColumnsSet.add(canonical);
      }
    }
  });

  const cleanedData: Record<string, any>[] = [];

  for (let r = bestHeaderRowIndex + 1; r < rows2D.length; r++) {
    const rowData = rows2D[r];
    if (!Array.isArray(rowData) || rowData.length === 0) continue;

    const cleanRow: Record<string, any> = {};
    let hasAnyValue = false;

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

    if (hasAnyValue) {
      cleanRow['_rowNumber'] = r + 1;

      Object.keys(cleanRow).forEach((colName) => {
        if (colName === '_rowNumber') return;
        const val = cleanRow[colName];

        if (VIVO_DATE_COLUMNS.has(colName)) {
          cleanRow[colName] = normalizeDateValue(val, colName, false, r + 1);
        } else if (VIVO_NUMERIC_COLUMNS.has(colName)) {
          const num = normalizeNumericValue(val, colName, r + 1, '');
          cleanRow[colName] = num === '' ? '' : formatDecimalBR(num as number);
        } else {
          cleanRow[colName] = val !== undefined && val !== null ? String(val).trim() : '';
        }
      });

      cleanedData.push(cleanRow);
    }
  }

  if (cleanedData.length === 0) {
    throw new Error(
      'Arquivo CSV da VIVO sem dados. Verifique se o arquivo possui linhas preenchidas.'
    );
  }

  return {
    sheetName: 'CSV_VIVO',
    data: cleanedData,
    detectedColumns: Array.from(detectedColumnsSet),
    rawHeaders,
  };
}

export interface VivoPreImportReport {
  totalLinhasLidas: number;
  linhasIgnoradas: {
    linha: number;
    idOriginal: string;
    motivo: string;
  }[];
  idsRepetidos: {
    linha: number;
    id: string;
    primeiraLinha: number;
  }[];
  idsColididos: {
    linha: number;
    id: string;
    docId: string;
    linhaConflitante: number;
    idConflitante: string;
  }[];
  totalIdsUnicosAGravar: number;
  deduplicatedRows: Record<string, any>[];
}

/**
 * Análise pré-importação da VIVO (Padrão e Massiva)
 * Identifica linhas ignoradas por ID inválido, IDs repetidos e colisões de docId.
 * Deduplica em memória mantendo a última ocorrência de cada ID.
 */
export function analisarPreImportacaoVivo(planilhaLinhas: Record<string, any>[]): VivoPreImportReport {
  const totalLinhasLidas = planilhaLinhas.length;
  const linhasIgnoradas: { linha: number; idOriginal: string; motivo: string }[] = [];
  const idsRepetidos: { linha: number; id: string; primeiraLinha: number }[] = [];
  const idsColididos: {
    linha: number;
    id: string;
    docId: string;
    linhaConflitante: number;
    idConflitante: string;
  }[] = [];

  const seenIdMap = new Map<string, number>();
  const seenDocIdMap = new Map<string, { id: string; linha: number }>();
  const lastRowByIdMap = new Map<string, Record<string, any>>();

  planilhaLinhas.forEach((row, idx) => {
    const linhaNum = row._rowNumber ?? idx + 2;

    let rawId = row['ID'];
    if (rawId === undefined || rawId === null) {
      for (const k of Object.keys(row)) {
        if (k === '_rowNumber') continue;
        if (matchCanonicalVivoColumn(k) === 'ID') {
          rawId = row[k];
          break;
        }
      }
    }

    const cleaned = cleanVivoID(rawId);
    if (!cleaned) {
      const displayVal = rawId !== undefined && rawId !== null ? String(rawId).trim() : '';
      linhasIgnoradas.push({
        linha: linhaNum,
        idOriginal: displayVal || '(vazio)',
        motivo: !displayVal ? 'ID vazio' : `ID inválido ("${displayVal}")`,
      });
      return;
    }

    const upperId = cleaned.toUpperCase();
    const docId = getSafeVivoDocId(cleaned);

    // 1. Checagem de ID repetido (iguais ignorando maiúsculas/minúsculas e espaços)
    if (seenIdMap.has(upperId)) {
      idsRepetidos.push({
        linha: linhaNum,
        id: cleaned,
        primeiraLinha: seenIdMap.get(upperId)!,
      });
    } else {
      seenIdMap.set(upperId, linhaNum);
    }

    // 2. Checagem de colisão de getSafeVivoDocId entre IDs diferentes
    if (seenDocIdMap.has(docId)) {
      const prev = seenDocIdMap.get(docId)!;
      if (prev.id.toUpperCase() !== upperId) {
        idsColididos.push({
          linha: linhaNum,
          id: cleaned,
          docId,
          linhaConflitante: prev.linha,
          idConflitante: prev.id,
        });
      }
    } else {
      seenDocIdMap.set(docId, { id: cleaned, linha: linhaNum });
    }

    // Deduplicação em memória: mantém a última linha de cada ID
    const rowNormalized = { ...row, ID: cleaned };
    lastRowByIdMap.set(upperId, rowNormalized);
  });

  const deduplicatedRows = Array.from(lastRowByIdMap.values());

  return {
    totalLinhasLidas,
    linhasIgnoradas,
    idsRepetidos,
    idsColididos,
    totalIdsUnicosAGravar: deduplicatedRows.length,
    deduplicatedRows,
  };
}

/**
 * Baixar Modelo Padrão - VIVO (21 colunas do Bloco 1)
 */
export function downloadModeloImportacaoPadraoVivo() {
  const headers = [...VIVO_BLOCO_1_KEYS];
  const sampleRows: Record<string, string>[] = [
    {
      'REF': 'REF-2026-001',
      'REG': 'RCO',
      'UF': 'GO',
      'Localidade': 'GOIÂNIA',
      'ID': 'VIVO-GO-1001',
      'Ano': '2026',
      'Pedido': '4600123001',
      'Desc.': 'IMPLANTAÇÃO REDE FTTH SETOR BUENO',
      'Status Draft': 'APROVADO',
      'Tipo de Projeto': 'FTTH EXPANSÃO',
      'Contrato': 'CT-VIVO-2026/01',
      'Data Status': '10/05/2026',
      'Faixa Status': 'NO PRAZO',
      'Status Medição Final': 'EM ANÁLISE',
      'Data Medição': '12/05/2026',
      'Faixa Medição': 'FAIXA 1',
      'OSP ORÇAMENTO': '45200,00',
      'OSP MEDIDO': '45200,00',
      'Faturado': '0,00',
      'Produção Bi R$': '45200,00',
      'Mês Input': 'mai/2026',
    },
    {
      'REF': 'REF-2026-002',
      'REG': 'RSUL',
      'UF': 'PR',
      'Localidade': 'CURITIBA',
      'ID': 'VIVO-PR-1002',
      'Ano': '2026',
      'Pedido': '4600123002',
      'Desc.': 'AMPLIAÇÃO ROTA ÓPTICA CABRAL',
      'Status Draft': 'EM ANÁLISE',
      'Tipo de Projeto': 'ANEL DEDICADO',
      'Contrato': 'CT-VIVO-2026/02',
      'Data Status': '15/05/2026',
      'Faixa Status': 'NO PRAZO',
      'Status Medição Final': 'APROVADA',
      'Data Medição': '18/05/2026',
      'Faixa Medição': 'FAIXA 2',
      'OSP ORÇAMENTO': '78900,00',
      'OSP MEDIDO': '78900,00',
      'Faturado': '78900,00',
      'Produção Bi R$': '78900,00',
      'Mês Input': 'jun/2026',
    },
  ];

  const headerLine = headers.map(escapeCSVCell).join(';');
  const dataLines = sampleRows.map((r) => headers.map((h) => escapeCSVCell(r[h] || '')).join(';'));
  const csvContent = [headerLine, ...dataLines].join('\r\n') + '\r\n';

  downloadCSVFile(csvContent, 'Modelo_Importacao_Padrao_Base_Matriz_VIVO.csv');
}

/**
 * Baixar Modelo Massiva - VIVO (ID + 9 colunas editáveis do Bloco 2)
 */
export function downloadModeloImportacaoMassivaVivo() {
  const headers = ['ID', ...VIVO_BLOCO_2_KEYS];
  const sampleRows: Record<string, string>[] = [
    {
      'ID': 'VIVO-GO-1001',
      'STATUS IMPL': 'EM ANDAMENTO',
      'PENDENCIA': 'DOCUMENTAÇÃO',
      'RESPONSÁVEL PENDENCIA': 'IMPLANTAÇÃO',
      'PRAZO DE MEDIÇÃO': '25/05/2026',
      'PRAZO PROJETO': '20/05/2026',
      'RESPONSÁVEL MEDIÇÃO': 'CARLOS SILVA',
      'OBS MEDIÇÃO': 'Aguardando validação técnica de campo.',
      'DATA TRATATIVA': '15/05/2026',
      'ID NOVO/ANTIGO': 'ANT-GO-089',
    },
    {
      'ID': 'VIVO-PR-1002',
      'STATUS IMPL': 'CONCLUÍDO',
      'PENDENCIA': 'OK',
      'RESPONSÁVEL PENDENCIA': 'FINALIZADO',
      'PRAZO DE MEDIÇÃO': '28/05/2026',
      'PRAZO PROJETO': '25/05/2026',
      'RESPONSÁVEL MEDIÇÃO': 'MARIA SOUZA',
      'OBS MEDIÇÃO': 'Obra concluída e aprovada sem pendências.',
      'DATA TRATATIVA': '18/05/2026',
      'ID NOVO/ANTIGO': '',
    },
  ];

  const headerLine = headers.map(escapeCSVCell).join(';');
  const dataLines = sampleRows.map((r) => headers.map((h) => escapeCSVCell(r[h] || '')).join(';'));
  const csvContent = [headerLine, ...dataLines].join('\r\n') + '\r\n';

  downloadCSVFile(csvContent, 'Modelo_Importacao_Massiva_Acompanhamento_VIVO.csv');
}

/**
 * Exportar Registros VIVO para CSV/Excel (30 colunas)
 */
export function exportarRegistrosVivoParaCSV(
  registros: RegistroVivo[],
  nomeArquivo = 'VIVO_OBRAS_Export'
) {
  const exportHeaders = [...VIVO_ALL_COLUMNS];
  const headerLine = exportHeaders.map(escapeCSVCell).join(';');

  const dataLines = registros.map((item) => {
    return exportHeaders
      .map((colName) => {
        const rawVal = (item as any)[colName];
        if (rawVal === undefined || rawVal === null || rawVal === '') return '';

        if (colName === 'ID' || colName === 'Pedido' || colName === 'REF' || colName === 'Contrato') {
          return escapeCSVCell(String(rawVal).trim());
        }
        if (VIVO_DATE_COLUMNS.has(colName)) {
          return escapeCSVCell(formatDateForCSV(rawVal));
        }
        if (VIVO_NUMERIC_COLUMNS.has(colName)) {
          return escapeCSVCell(formatNumberForCSV(rawVal, true));
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

export const exportarRegistrosVivoParaExcel = exportarRegistrosVivoParaCSV;

