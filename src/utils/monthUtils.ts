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
