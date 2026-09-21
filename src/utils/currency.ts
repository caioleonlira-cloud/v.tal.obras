/**
 * Currency parsing and formatting utilities for Matriz VTAL
 *
 * Rules:
 * - "Valor Medido Total = Valor Parcial R$ + Valor Final R$"
 * - "Se o número já possui casas decimais (ex: 190271.68 ou 190.271,68), manter."
 * - "Se é inteiro puro (ex: 1275630), dividir por 100."
 * - "Os valores dessa coluna devem subir com até duas casas decimais."
 */

export function parseCurrencyValue(val: any): number {
  if (val === undefined || val === null || val === '') return 0;

  if (typeof val === 'number') {
    if (isNaN(val)) return 0;
    return Number(val.toFixed(2));
  }

  let str = String(val).trim();
  if (!str || str === '—' || str === '-' || str === 'N/A' || str === 'null') return 0;

  // Remover prefixos R$, espaços e caracteres não numéricos exceto ., - e ,
  str = str.replace(/R\$/gi, '').replace(/\s+/g, '').trim();

  // Caso 1: Padrão brasileiro "190.271,68" ou "1.234.567,89"
  if (str.includes('.') && str.includes(',')) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Padrão brasileiro: 12.529.457,79
      const clean = str.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : Number(num.toFixed(2));
    } else {
      // Padrão US/Internacional: 12,529,457.79
      const clean = str.replace(/,/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : Number(num.toFixed(2));
    }
  }

  // Caso 2: Padrão com vírgula decimal "190271,68" ou "12529457,79"
  if (str.includes(',')) {
    const commaCount = (str.match(/,/g) || []).length;
    if (commaCount === 1) {
      const clean = str.replace(',', '.');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : Number(num.toFixed(2));
    } else {
      const clean = str.replace(/,/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : Number(num.toFixed(2));
    }
  }

  // Caso 3: Padrão com ponto
  if (str.includes('.')) {
    const parts = str.split('.');
    // Mais de um ponto (ex: 1.000.000 ou 12.529.457) -> pontos de milhares
    if (parts.length > 2) {
      const clean = str.replace(/\./g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : Number(num.toFixed(2));
    }

    const decimalPart = parts[1];
    // Se tem 1 ou 2 dígitos após o ponto (ex: 190271.68 ou 12529457.79), é decimal puro
    if (decimalPart.length === 1 || decimalPart.length === 2) {
      const num = parseFloat(str);
      return isNaN(num) ? 0 : Number(num.toFixed(2));
    } else if (decimalPart.length === 3 && parts[0].length <= 3) {
      // Ex: 100.000 -> 100000
      const clean = str.replace(/\./g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : Number(num.toFixed(2));
    } else {
      const num = parseFloat(str);
      return isNaN(num) ? 0 : Number(num.toFixed(2));
    }
  }

  // Caso 4: Inteiro puro
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return Number(num.toFixed(2));
}

/**
 * Parser de alta precisão para valores de faturamento de FR (VALOR FR).
 * Suporta formatos numéricos brutos, formatação brasileira com milhar/vírgula ('12.529.457,79' ou '12529457,79'),
 * formatação internacional ('12,529,457.79'), espaços, símbolos monetários R$ e valores negativos.
 * NUNCA divide valores inteiros por 100 (valores de FR são expressos em Reais inteiros ou com centavos).
 */
export function parseFRValor(val: any): number {
  if (val === undefined || val === null || val === '') return 0;

  if (typeof val === 'number') {
    if (isNaN(val)) return 0;
    return Number(val.toFixed(2));
  }

  let str = String(val).trim();
  if (!str || str === '—' || str === '-' || str === 'N/A' || str === 'N/I' || str === 'null' || str === 'undefined') {
    return 0;
  }

  // Remover prefixos monetários R$, espaços comuns e não-quebráveis, e aspas
  str = str.replace(/R\$/gi, '').replace(/[\s\u00A0"']/g, '').trim();
  if (!str) return 0;

  // Suporte a números negativos formatados com parênteses ex: (1250,50) ou -1250,50
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

  let num = 0;

  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Padrão brasileiro: 12.529.457,79 -> 12529457.79
      const clean = str.replace(/\./g, '').replace(',', '.');
      num = parseFloat(clean);
    } else {
      // Padrão US/Internacional: 12,529,457.79 -> 12529457.79
      const clean = str.replace(/,/g, '');
      num = parseFloat(clean);
    }
  } else if (hasComma) {
    const commaCount = (str.match(/,/g) || []).length;
    if (commaCount === 1) {
      // Apenas uma vírgula: decimal padrão brasileiro "12529457,79" ou "1500,50"
      num = parseFloat(str.replace(',', '.'));
    } else {
      // Múltiplas vírgulas: separador de milhar US sem centavos "12,529,457"
      num = parseFloat(str.replace(/,/g, ''));
    }
  } else if (hasDot) {
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount === 1) {
      const parts = str.split('.');
      // Se exatamente 3 dígitos após o ponto e parte inteira tem 1 a 3 dígitos (ex: 100.000 ou 15.000) -> milhar brasileiro
      if (parts[1].length === 3 && parts[0].length >= 1 && parts[0].length <= 3) {
        num = parseFloat(str.replace(/\./g, ''));
      } else {
        // Decimal padrão com ponto: "12529457.79" ou "1500.5"
        num = parseFloat(str);
      }
    } else {
      // Múltiplos pontos: milhares brasileiros "12.529.457"
      num = parseFloat(str.replace(/\./g, ''));
    }
  } else {
    // Apenas dígitos sem pontuação: "12529457" -> valor exato em Reais
    num = parseFloat(str);
  }

  if (isNaN(num)) return 0;
  if (isNegative) num = -num;

  return Number(num.toFixed(2));
}

export function formatBRL(v: number): string {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const formatCurrency = formatBRL;

export function formatDecimalBR(v: number): string {
  return (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
