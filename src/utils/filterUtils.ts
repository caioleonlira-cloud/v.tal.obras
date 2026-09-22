import {
  Registro,
  FRRegistro,
  getRegistroCarteira,
  getRegistroTipoDC,
  getRegistroMesInput,
  getRegistroPlanEstruturante,
  getRegistroRegional,
  normalizeResponsavel,
} from '../types';

export const BLANK_FILTER_OPTION = '(EM BRANCO)';

/**
 * Verifica se um valor é vazio, nulo, sem preenchimento ou equivale a em branco/vazio.
 */
export function isBlankValue(val: any): boolean {
  if (val === undefined || val === null) return true;
  const s = String(val).trim();
  if (
    s === '' ||
    s === '-' ||
    s === '—' ||
    s === '–' ||
    s === 'N/A' ||
    s === 'N/D' ||
    s === 'ND' ||
    s === 'NÃO ATRIBUÍDO' ||
    s === 'NAO ATRIBUIDO' ||
    s === 'SEM REGIONAL' ||
    s === 'SEM RESPONSÁVEL' ||
    s === 'SEM RESPONSAVEL' ||
    s === 'SEM STATUS' ||
    s === 'SEM VALOR' ||
    s === 'SEM UF' ||
    s === 'UNDEFINED' ||
    s === 'NULL' ||
    s === '(EM BRANCO)' ||
    s === '(Em branco)' ||
    s === '(Vazio)' ||
    s === 'EM BRANCO'
  ) {
    return true;
  }
  return false;
}

export type RegistroFilterType =
  | 'REG'
  | 'UF'
  | 'CARTEIRA'
  | 'TIPO_DC'
  | 'AGING'
  | 'STATUS_ATUAL'
  | 'STATUS_INFORME'
  | 'RESPONSAVEL'
  | 'RESP_MEDICAO'
  | 'MES_INPUT'
  | 'BACKLOG_INPUT'
  | 'STATUS_MED_FINAL'
  | 'STATUS_MED_PARCIAL'
  | 'TIPO_PROJETO';

/**
 * Extrai e normaliza o valor de filtro para um registro.
 * Retorna '(EM BRANCO)' para casos sem preenchimento na planilha.
 */
export function getRegistroFilterValue(
  item: Registro,
  filterType: RegistroFilterType
): string {
  if (!item) return BLANK_FILTER_OPTION;

  switch (filterType) {
    case 'REG': {
      const rawReg = (item.REG || (item as any).Regional || (item as any).REGIONAL || '').toString().trim();
      const resolved = rawReg ? rawReg.toUpperCase() : (getRegistroRegional(item) || '').trim().toUpperCase();
      if (isBlankValue(resolved) || resolved === 'SEM REGIONAL') return BLANK_FILTER_OPTION;
      return resolved;
    }
    case 'UF': {
      const uf = (item.UF || '').toString().trim().toUpperCase();
      if (isBlankValue(uf) || uf === 'SEM UF') return BLANK_FILTER_OPTION;
      return uf;
    }
    case 'CARTEIRA': {
      const cart = getRegistroCarteira(item);
      if (isBlankValue(cart)) return BLANK_FILTER_OPTION;
      return cart;
    }
    case 'TIPO_DC': {
      const tdc = getRegistroTipoDC(item);
      if (isBlankValue(tdc)) return BLANK_FILTER_OPTION;
      return tdc;
    }
    case 'AGING': {
      const ag = (item.AGING || '').toString().trim();
      if (isBlankValue(ag)) return BLANK_FILTER_OPTION;
      return ag;
    }
    case 'STATUS_ATUAL': {
      const st = (item['Status da DC (Atual)'] || '').toString().trim();
      if (isBlankValue(st)) return BLANK_FILTER_OPTION;
      return st;
    }
    case 'STATUS_INFORME': {
      const st = (item['Status Informe (Campo)'] || '').toString().trim();
      if (isBlankValue(st)) return BLANK_FILTER_OPTION;
      return st;
    }
    case 'RESPONSAVEL': {
      const resp = normalizeResponsavel(item.Responsavel);
      if (isBlankValue(resp)) return BLANK_FILTER_OPTION;
      return resp;
    }
    case 'RESP_MEDICAO': {
      const resp = (item['Resp.Medição'] || '').toString().trim();
      if (isBlankValue(resp)) return BLANK_FILTER_OPTION;
      return resp;
    }
    case 'MES_INPUT': {
      const mi = getRegistroMesInput(item);
      if (isBlankValue(mi)) return BLANK_FILTER_OPTION;
      return mi;
    }
    case 'BACKLOG_INPUT': {
      const pe = getRegistroPlanEstruturante(item);
      if (isBlankValue(pe)) return BLANK_FILTER_OPTION;
      return pe;
    }
    case 'STATUS_MED_FINAL': {
      const st = (item['Status Med. Final'] || '').toString().trim();
      if (isBlankValue(st)) return BLANK_FILTER_OPTION;
      return st;
    }
    case 'STATUS_MED_PARCIAL': {
      const st = (item['Status Med. Parcial'] || '').toString().trim();
      if (isBlankValue(st)) return BLANK_FILTER_OPTION;
      return st;
    }
    case 'TIPO_PROJETO': {
      const tp = (item['Tipo de Projeto'] || '').toString().trim();
      if (isBlankValue(tp)) return BLANK_FILTER_OPTION;
      return tp;
    }
    default:
      return BLANK_FILTER_OPTION;
  }
}

/**
 * Verifica se um registro atende a um array de opções selecionadas no filtro.
 */
export function matchesRegistroFilter(
  item: Registro,
  filterType: RegistroFilterType,
  selected: string[]
): boolean {
  if (!selected || selected.length === 0) return true;
  const value = getRegistroFilterValue(item, filterType);

  if (value === BLANK_FILTER_OPTION) {
    return selected.includes(BLANK_FILTER_OPTION);
  }

  const valLower = value.toLowerCase();
  return selected.some((sel) => {
    if (sel === BLANK_FILTER_OPTION) return false;
    return sel.toLowerCase() === valLower;
  });
}

export type FRFilterType = 'UF' | 'REG' | 'MES' | 'OPERACAO';

/**
 * Extrai e normaliza o valor de filtro para um registro de FR.
 */
export function getFRFilterValue(
  item: FRRegistro,
  filterType: FRFilterType
): string {
  if (!item) return BLANK_FILTER_OPTION;

  switch (filterType) {
    case 'UF': {
      const uf = (item.UF || '').toString().trim().toUpperCase();
      if (isBlankValue(uf)) return BLANK_FILTER_OPTION;
      return uf;
    }
    case 'REG': {
      const reg = (item.REG || '').toString().trim().toUpperCase();
      if (isBlankValue(reg)) return BLANK_FILTER_OPTION;
      return reg;
    }
    case 'MES': {
      const mes = (item.Mês || '').toString().trim();
      if (isBlankValue(mes)) return BLANK_FILTER_OPTION;
      return mes;
    }
    case 'OPERACAO': {
      const op = (item['DC MIGRADA/OPERAÇÃO'] || '').toString().trim();
      if (isBlankValue(op)) return BLANK_FILTER_OPTION;
      return op;
    }
    default:
      return BLANK_FILTER_OPTION;
  }
}

/**
 * Verifica se um registro de FR atende a um filtro selecionado.
 */
export function matchesFRFilter(
  item: FRRegistro,
  filterType: FRFilterType,
  selected: string[]
): boolean {
  if (!selected || selected.length === 0) return true;
  const val = getFRFilterValue(item, filterType);

  if (val === BLANK_FILTER_OPTION) {
    return selected.includes(BLANK_FILTER_OPTION);
  }

  const valLower = val.toLowerCase();
  return selected.some((sel) => {
    if (sel === BLANK_FILTER_OPTION) return false;
    return sel.toLowerCase() === valLower;
  });
}

/**
 * Ordena as opções de filtro colocando '(EM BRANCO)' sempre na primeira posição.
 */
export function sortFilterOptions(
  options: string[],
  customSort?: (a: string, b: string) => number
): string[] {
  const nonBlank = options.filter((opt) => opt !== BLANK_FILTER_OPTION);
  const hasBlank = options.includes(BLANK_FILTER_OPTION);

  if (customSort) {
    nonBlank.sort(customSort);
  } else {
    nonBlank.sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b, 'pt-BR');
    });
  }

  return hasBlank ? [BLANK_FILTER_OPTION, ...nonBlank] : nonBlank;
}
