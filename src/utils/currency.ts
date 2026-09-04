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
    // Se é inteiro puro com mais de 3 dígitos (ex: centavos brutos de planilha 1275630)
    if (Number.isInteger(val) && Math.abs(val) >= 1000) {
      return Math.round(val) / 100;
    }
    return Number(val.toFixed(2));
  }

  let str = String(val).trim();
  if (!str || str === '—' || str === '-' || str === 'N/A' || str === 'null') return 0;

  // Remover prefixos R$, espaços e caracteres não numéricos exceto ., - e ,
  str = str.replace(/R\$/gi, '').replace(/\s+/g, '').trim();

  // Caso 1: Padrão brasileiro "190.271,68" ou "1.234.567,89"
  if (str.includes('.') && str.includes(',')) {
    const clean = str.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Number(num.toFixed(2));
  }

  // Caso 2: Padrão com vírgula decimal "190271,68" ou "15200,5"
  if (str.includes(',')) {
    const clean = str.replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Number(num.toFixed(2));
  }

  // Caso 3: Padrão com ponto
  if (str.includes('.')) {
    const parts = str.split('.');
    // Mais de um ponto (ex: 1.000.000) -> pontos de milhares
    if (parts.length > 2) {
      const clean = str.replace(/\./g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : Number(num.toFixed(2));
    }

    const decimalPart = parts[1];
    // Se tem 1 ou 2 dígitos após o ponto (ex: 190271.68 ou 1500.5), é decimal puro
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

  // Caso 4: Inteiro puro (ex: "1275630")
  // "Se é inteiro puro (ex: 1275630), dividir por 100"
  const cleanDigits = str.replace(/[^\d-]/g, '');
  const num = parseFloat(cleanDigits);
  if (isNaN(num)) return 0;

  if (cleanDigits.length > 3) {
    return Number((num / 100).toFixed(2));
  }
  return Number(num.toFixed(2));
}

export function formatBRL(v: number): string {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDecimalBR(v: number): string {
  return (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
