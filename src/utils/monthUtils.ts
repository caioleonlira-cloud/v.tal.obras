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

function extractDateSafe(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'number' && val >= 30000 && val <= 60000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(val).trim();
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (match) {
    const dia = parseInt(match[1], 10);
    const mes = parseInt(match[2], 10) - 1;
    let ano = parseInt(match[3], 10);
    if (ano < 100) ano += 2000;
    const d = new Date(ano, mes, dia);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Normaliza qualquer formato de mês de FR para o formato canônico 'MM/AAAA' (ex: '08/2024').
 * Aceita:
 * - Date objects (do SheetJS com cellDates: true)
 * - Serial number de data do Excel (ex: 45505)
 * - Strings como '08/2024', '8/2024', 'ago/24', 'ago/2024', 'Agosto/2024', 'Agosto', '2024-08'
 * - Fallback inteligente para a coluna 'DATA DA SOLICITAÇÃO' se 'Mês' estiver vazio ou '-'
 */
export function normalizeMesFR(rawMes: any, dataSolicitacao?: any): string {
  // 1. Se já for um Date object (ex: SheetJS com cellDates: true)
  if (rawMes instanceof Date && !isNaN(rawMes.getTime())) {
    const m = String(rawMes.getMonth() + 1).padStart(2, '0');
    const y = rawMes.getFullYear();
    return `${m}/${y}`;
  }

  // 2. Se for número (serial date do Excel ou número do mês 1..12)
  if (typeof rawMes === 'number' && !isNaN(rawMes)) {
    if (rawMes >= 30000 && rawMes <= 60000) {
      const d = new Date(Math.round((rawMes - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) {
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const y = d.getUTCFullYear();
        return `${m}/${y}`;
      }
    }
    if (rawMes >= 1 && rawMes <= 12) {
      let y = new Date().getFullYear();
      if (dataSolicitacao) {
        const pDate = extractDateSafe(dataSolicitacao);
        if (pDate) y = pDate.getFullYear();
      }
      return `${String(rawMes).padStart(2, '0')}/${y}`;
    }
  }

  const str = String(rawMes || '').trim();
  const clean = str.toLowerCase().replace(/[\u0300-\u036f]/g, '');

  // Se vazio ou inválido, tenta extrair da data de solicitação
  if (!clean || clean === '-' || clean === '—' || clean === 'n/a' || clean === 'null' || clean === 'undefined') {
    if (dataSolicitacao) {
      const pDate = extractDateSafe(dataSolicitacao);
      if (pDate) {
        const m = String(pDate.getMonth() + 1).padStart(2, '0');
        const y = pDate.getFullYear();
        return `${m}/${y}`;
      }
    }
    return '-';
  }

  // Padrão YYYY-MM ou YYYY/MM (ex: 2024-08 ou 2024/08)
  const yyyymmMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})/);
  if (yyyymmMatch) {
    const y = yyyymmMatch[1];
    const m = String(parseInt(yyyymmMatch[2], 10)).padStart(2, '0');
    return `${m}/${y}`;
  }

  // Padrão completo DD/MM/YYYY (ex: 15/08/2024)
  const fullDateMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (fullDateMatch) {
    const m = String(parseInt(fullDateMatch[2], 10)).padStart(2, '0');
    let y = parseInt(fullDateMatch[3], 10);
    if (y < 100) y += 2000;
    return `${m}/${y}`;
  }

  // Padrão MM/YYYY (ex: 08/2024 ou 8/2024 ou 08-2024)
  const mmYyyyMatch = clean.match(/^(\d{1,2})[\/\-](\d{2,4})$/);
  if (mmYyyyMatch) {
    const m = String(parseInt(mmYyyyMatch[1], 10)).padStart(2, '0');
    let y = parseInt(mmYyyyMatch[2], 10);
    if (y < 100) y += 2000;
    return `${m}/${y}`;
  }

  // Padrão textual com mês abreviado ou por extenso (ex: "ago/24", "ago/2024", "Agosto/2024", "AGO-24")
  const parts = clean.split(/[\/\-\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    const m0 = MESES_MAP[parts[0]] || MESES_MAP[parts[0].slice(0, 3)];
    if (m0) {
      let y = parseInt(parts[1], 10);
      if (isNaN(y)) y = new Date().getFullYear();
      else if (y < 100) y += 2000;
      return `${String(m0).padStart(2, '0')}/${y}`;
    }
    const m1 = MESES_MAP[parts[1]] || MESES_MAP[parts[1].slice(0, 3)];
    if (m1) {
      let y = parseInt(parts[0], 10);
      if (isNaN(y)) y = new Date().getFullYear();
      else if (y < 100) y += 2000;
      return `${String(m1).padStart(2, '0')}/${y}`;
    }
  } else if (parts.length === 1) {
    const m0 = MESES_MAP[parts[0]] || MESES_MAP[parts[0].slice(0, 3)];
    if (m0) {
      let y = new Date().getFullYear();
      if (dataSolicitacao) {
        const pDate = extractDateSafe(dataSolicitacao);
        if (pDate) y = pDate.getFullYear();
      }
      return `${String(m0).padStart(2, '0')}/${y}`;
    }
  }

  // Se não reconheceu mas tem data de solicitação
  if (dataSolicitacao) {
    const pDate = extractDateSafe(dataSolicitacao);
    if (pDate) {
      const m = String(pDate.getMonth() + 1).padStart(2, '0');
      const y = pDate.getFullYear();
      return `${m}/${y}`;
    }
  }

  return str;
}
