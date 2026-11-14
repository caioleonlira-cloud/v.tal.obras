export const MESES_MAP: Record<string, number> = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  out: 10,
  nov: 11,
  dez: 12,
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  'março': 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

/**
 * Converte uma string de mês/ano em chave numérica para ordenação cronológica (ex: mai/2026 -> 202605).
 * Valores vazios, nulos ou '-' recebem chave máxima (99999999) para ficarem por último.
 */
export function parseMesAnoSortKey(val: string | undefined | null): number {
  if (!val) return 99999999;
  const clean = val.trim().toLowerCase();
  if (clean === '' || clean === '-' || clean === 'n/a' || clean === 'null') {
    return 99999999;
  }

  // Tenta quebrar por barra, hífen ou espaço: ex "mai/2026", "08/2024", "Agosto", "mai-2026"
  const parts = clean.split(/[\/\-\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    let mesNum = 0;
    let anoNum = 0;

    const p0Num = parseInt(parts[0], 10);
    const p1Num = parseInt(parts[1], 10);

    if (!isNaN(p0Num) && !isNaN(p1Num)) {
      if (p0Num <= 12 && p1Num > 100) {
        mesNum = p0Num;
        anoNum = p1Num;
      } else if (p1Num <= 12 && p0Num > 100) {
        mesNum = p1Num;
        anoNum = p0Num;
      } else if (p0Num <= 12 && p1Num <= 99) {
        mesNum = p0Num;
        anoNum = 2000 + p1Num;
      }
    } else {
      const mMatch0 = MESES_MAP[parts[0]] || MESES_MAP[parts[0].slice(0, 3)];
      if (mMatch0) {
        mesNum = mMatch0;
        anoNum = !isNaN(p1Num) ? (p1Num < 100 ? 2000 + p1Num : p1Num) : 2026;
      } else {
        const mMatch1 = MESES_MAP[parts[1]] || MESES_MAP[parts[1].slice(0, 3)];
        if (mMatch1) {
          mesNum = mMatch1;
          anoNum = !isNaN(p0Num) ? (p0Num < 100 ? 2000 + p0Num : p0Num) : 2026;
        }
      }
    }

    if (mesNum > 0 && anoNum > 0) {
      return anoNum * 100 + mesNum;
    }
  } else if (parts.length === 1) {
    // Apenas nome de mês ex "Agosto", "Setembro"
    const mMatch = MESES_MAP[parts[0]] || MESES_MAP[parts[0].slice(0, 3)];
    if (mMatch) {
      return 2026 * 100 + mMatch;
    }
  }

  return 99999990;
}

/**
 * Validação estrita para o bloco OBRAS INPUT (VOLUME):
 * Só entram DCs com mês e ano válidos (formato mmm/aaaa, como mai/2026).
 * Vazio ou '-' ficam de fora.
 */
export function isValidMesInput(val: string | undefined | null): boolean {
  if (!val) return false;
  const clean = val.trim().toLowerCase();
  if (clean === '' || clean === '-' || clean === 'n/a' || clean === 'null') {
    return false;
  }

  const parts = clean.split(/[\/\-\s]+/).filter(Boolean);
  if (parts.length !== 2) return false;

  const p0 = parts[0];
  const p1 = parts[1];

  const isM0 = !!(MESES_MAP[p0] || MESES_MAP[p0.slice(0, 3)]);
  const isM1 = !!(MESES_MAP[p1] || MESES_MAP[p1.slice(0, 3)]);

  const isY0 = /^\d{4}$/.test(p0) || /^\d{2}$/.test(p0);
  const isY1 = /^\d{4}$/.test(p1) || /^\d{2}$/.test(p1);

  if ((isM0 && isY1) || (isM1 && isY0)) {
    return true;
  }

  // Também tolera numérico mm/aaaa (ex 05/2026)
  const n0 = parseInt(p0, 10);
  const n1 = parseInt(p1, 10);
  if (!isNaN(n0) && !isNaN(n1)) {
    if (n0 >= 1 && n0 <= 12 && n1 >= 2000) return true;
    if (n1 >= 1 && n1 <= 12 && n0 >= 2000) return true;
  }

  return false;
}

const MONTH_ABBR_PT: Record<number, string> = {
  1: 'jan',
  2: 'fev',
  3: 'mar',
  4: 'abr',
  5: 'mai',
  6: 'jun',
  7: 'jul',
  8: 'ago',
  9: 'set',
  10: 'out',
  11: 'nov',
  12: 'dez',
};

const EXTRA_MONTH_ALIASES: Record<string, number> = {
  ...MESES_MAP,
  january: 1,
  february: 2,
  feb: 2,
  march: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  december: 12,
  dec: 12,
};

function resolveMonthNumber(token: string): number {
  const clean = token
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!clean) return 0;
  if (EXTRA_MONTH_ALIASES[clean]) return EXTRA_MONTH_ALIASES[clean];
  const prefix3 = clean.slice(0, 3);
  return EXTRA_MONTH_ALIASES[prefix3] || 0;
}

function normalizeYear(rawYear: number): number {
  if (isNaN(rawYear)) return 0;
  if (rawYear >= 0 && rawYear <= 99) return 2000 + rawYear;
  if (rawYear >= 2000 && rawYear <= 2100) return rawYear;
  return 0;
}

/**
 * Normaliza valores de "Mês Input" (ex.: "MAR/2026", "10/2026", "01/03/2026",
 * "2026-03-01", número serial do Excel) para o padrão mmm/aaaa (ex.: "mar/2026").
 * Retorna string vazia se o valor for vazio ou inválido (sem mês e ano válidos).
 */
export function normalizeMesInputValue(val: unknown): string {
  if (val === undefined || val === null) return '';

  if (val instanceof Date && !isNaN(val.getTime())) {
    const year = val.getFullYear();
    const month = val.getMonth() + 1;
    if (year >= 2000 && year <= 2100 && MONTH_ABBR_PT[month]) {
      return `${MONTH_ABBR_PT[month]}/${year}`;
    }
    return '';
  }

  // Número serial do Excel (ex.: 46082 -> mar/2026)
  if (typeof val === 'number' && isFinite(val)) {
    if (val >= 25000 && val <= 75000) {
      const utcMs = Date.UTC(1899, 11, 30) + Math.floor(val) * 86400000;
      const d = new Date(utcMs);
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1;
      if (year >= 2000 && year <= 2100 && MONTH_ABBR_PT[month]) {
        return `${MONTH_ABBR_PT[month]}/${year}`;
      }
    }
    return '';
  }

  const raw = String(val).trim();
  if (!raw) return '';

  const lower = raw.toLowerCase();
  if (
    lower === '-' ||
    lower === '—' ||
    lower === '–' ||
    lower === 'n/a' ||
    lower === 'n/d' ||
    lower === 'nd' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower === '(em branco)' ||
    lower === 'em branco'
  ) {
    return '';
  }

  // String numérica que representa serial do Excel (ex.: "46082")
  if (/^\d{5}(?:\.\d+)?$/.test(raw)) {
    const serial = parseFloat(raw);
    if (serial >= 25000 && serial <= 75000) {
      const utcMs = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000;
      const d = new Date(utcMs);
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1;
      if (year >= 2000 && year <= 2100 && MONTH_ABBR_PT[month]) {
        return `${MONTH_ABBR_PT[month]}/${year}`;
      }
    }
    return '';
  }

  // Formato ISO: YYYY-MM-DD ou YYYY/MM/DD (com ou sem hora)
  const isoMatch = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s].*)?$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) {
      return `${MONTH_ABBR_PT[month]}/${year}`;
    }
    return '';
  }

  // Formato BR completo: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY ou DD/MM/YY
  const brDateMatch = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2}|\d{4})$/);
  if (brDateMatch) {
    const day = parseInt(brDateMatch[1], 10);
    const month = parseInt(brDateMatch[2], 10);
    const year = normalizeYear(parseInt(brDateMatch[3], 10));
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year > 0) {
      return `${MONTH_ABBR_PT[month]}/${year}`;
    }
    return '';
  }

  // Formato data com mês textual: DD/mmm/YYYY ou "01 de mar de 2026"
  const parts = lower
    .replace(/\bde\b/g, ' ')
    .split(/[\/\-\.\s]+/)
    .filter(Boolean);

  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const mNum = resolveMonthNumber(parts[1]);
    const yRaw = /^\d{2,4}$/.test(parts[2]) ? parseInt(parts[2], 10) : NaN;
    const year = normalizeYear(yRaw);
    if (!isNaN(day) && day >= 1 && day <= 31 && mNum > 0 && year > 0) {
      return `${MONTH_ABBR_PT[mNum]}/${year}`;
    }
    return '';
  }

  if (parts.length === 2) {
    const [p0, p1] = parts;
    const m0 = resolveMonthNumber(p0);
    const m1 = resolveMonthNumber(p1);
    const isNum0 = /^\d{1,4}$/.test(p0);
    const isNum1 = /^\d{1,4}$/.test(p1);

    if (m0 > 0 && isNum1) {
      const year = normalizeYear(parseInt(p1, 10));
      if (year > 0) return `${MONTH_ABBR_PT[m0]}/${year}`;
    }
    if (m1 > 0 && isNum0) {
      const year = normalizeYear(parseInt(p0, 10));
      if (year > 0) return `${MONTH_ABBR_PT[m1]}/${year}`;
    }
    if (isNum0 && isNum1) {
      const n0 = parseInt(p0, 10);
      const n1 = parseInt(p1, 10);
      if (n0 >= 1 && n0 <= 12 && (p1.length === 4 || p1.length === 2)) {
        const year = normalizeYear(n1);
        if (year > 0) return `${MONTH_ABBR_PT[n0]}/${year}`;
      }
      if (n1 >= 1 && n1 <= 12 && p0.length === 4) {
        const year = normalizeYear(n0);
        if (year > 0) return `${MONTH_ABBR_PT[n1]}/${year}`;
      }
    }
  }

  return '';
}

