export const MONTH_NAMES_PT: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  março: 3,
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

export const MONTH_SHORT_PT: Record<string, number> = {
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
};

/**
 * Normalizes month text to lowercase without accents.
 */
export function normalizeMonthText(monthStr: string): string {
  if (!monthStr) return '';
  return monthStr
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Returns month number (1-12) from month name (e.g., "Agosto", "setembro", "ago").
 */
export function getMonthNumberFromText(monthStr: string): number | null {
  if (!monthStr) return null;
  const clean = normalizeMonthText(monthStr);
  if (MONTH_NAMES_PT[clean]) return MONTH_NAMES_PT[clean];
  if (MONTH_SHORT_PT[clean]) return MONTH_SHORT_PT[clean];
  
  // Try 3-char prefix
  const prefix3 = clean.slice(0, 3);
  if (MONTH_SHORT_PT[prefix3]) return MONTH_SHORT_PT[prefix3];

  return null;
}

/**
 * PONTO 1.2: Ordem dos meses (Janeiro -> Dezembro), nunca alfabética.
 * "Reconheça o nome do mês ignorando maiúsculas/minúsculas, acentos e espaços extras.
 * Se os meses atravessarem a virada do ano (ex.: Novembro, Dezembro, Janeiro),
 * Janeiro vem depois de Dezembro. Para isso, comece a ordem logo depois do maior intervalo
 * vazio entre os meses presentes."
 */
export function sortMonthsCircular(months: string[]): string[] {
  if (!months || months.length <= 1) return [...(months || [])];

  const unique = Array.from(new Set(months.map((m) => m.trim()))).filter(Boolean);
  const parsed = unique.map((m) => ({
    original: m,
    num: getMonthNumberFromText(m),
  }));

  const standard = parsed.filter((p): p is { original: string; num: number } => p.num !== null);
  const unknown = parsed.filter((p) => p.num === null);

  if (standard.length === 0) {
    return unknown.map((u) => u.original).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  // Deduplicate present month numbers
  const presentNums = Array.from(new Set(standard.map((s) => s.num))).sort((a, b) => a - b);

  let startMonth = 1;
  if (presentNums.length > 1 && presentNums.length < 12) {
    let maxGap = -1;
    let monthAfterMaxGap = presentNums[0];

    for (let i = 0; i < presentNums.length; i++) {
      const curr = presentNums[i];
      const next = presentNums[(i + 1) % presentNums.length];
      const gap = (next - curr - 1 + 12) % 12;
      if (gap > maxGap) {
        maxGap = gap;
        monthAfterMaxGap = next;
      }
    }
    startMonth = monthAfterMaxGap;
  }

  // Sort standard months starting after the largest gap
  standard.sort((a, b) => {
    const orderA = (a.num - startMonth + 12) % 12;
    const orderB = (b.num - startMonth + 12) % 12;
    if (orderA !== orderB) return orderA - orderB;
    return a.original.localeCompare(b.original, 'pt-BR');
  });

  unknown.sort((a, b) => a.original.localeCompare(b.original, 'pt-BR'));

  return [...standard.map((s) => s.original), ...unknown.map((u) => u.original)];
}

/**
 * PONTO 3 e 4: Ordenação cronológica para Mês Input no formato mmm/aaaa (ex: mai/2026, mar/2026).
 * Valores vazios ou '-' ordenam por último.
 */
export function getMesInputChronologicalKey(str?: string): number {
  if (!str) return 99999999;
  const clean = str.trim();
  if (clean === '-' || clean === '') return 99999999;

  const parts = clean.split(/[/ -]+/);
  if (parts.length >= 2) {
    const mesText = normalizeMonthText(parts[0]);
    const anoNum = parseInt(parts[1], 10);
    const mesNum = MONTH_SHORT_PT[mesText] || MONTH_NAMES_PT[mesText] || (
      mesText.startsWith('jan') ? 1 :
      mesText.startsWith('fev') ? 2 :
      mesText.startsWith('mar') ? 3 :
      mesText.startsWith('abr') ? 4 :
      mesText.startsWith('mai') ? 5 :
      mesText.startsWith('jun') ? 6 :
      mesText.startsWith('jul') ? 7 :
      mesText.startsWith('ago') ? 8 :
      mesText.startsWith('set') ? 9 :
      mesText.startsWith('out') ? 10 :
      mesText.startsWith('nov') ? 11 :
      mesText.startsWith('dez') ? 12 : 0
    );

    if (mesNum > 0 && !isNaN(anoNum) && anoNum >= 2000 && anoNum <= 2100) {
      return anoNum * 100 + mesNum;
    }
  }

  return 88888888;
}

export function isValidMesInput(str?: string): boolean {
  if (!str) return false;
  const key = getMesInputChronologicalKey(str);
  return key < 88888888;
}

export function sortMesInputChronological(meses: string[]): string[] {
  return [...meses].sort((a, b) => {
    const keyA = getMesInputChronologicalKey(a);
    const keyB = getMesInputChronologicalKey(b);
    if (keyA !== keyB) return keyA - keyB;
    return a.localeCompare(b, 'pt-BR');
  });
}
