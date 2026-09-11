import * as XLSX from 'xlsx';
import {
  Registro,
  BLOCO_1_KEYS,
  BLOCO_2_KEYS,
  ALL_COLUMNS,
  RegistroBloco1,
  RegistroBloco2,
  HistoricoEdicaoItem,
} from '../types';
import { parseCurrencyValue, formatDecimalBR } from './currency';

/**
 * Matches a raw Excel header to our official system column names
 */
export function matchCanonicalColumn(rawHeader: string): string | null {
  if (!rawHeader) return null;
  const rawTrimmed = String(rawHeader).trim();
  if (!rawTrimmed) return null;

  // Direct exact match
  const directMatch = ALL_COLUMNS.find(
    (col) => col.toLowerCase() === rawTrimmed.toLowerCase()
  );
  if (directMatch) return directMatch;

  const clean = rawTrimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[º°ª#?:.\-_/\\()\[\]{}|;,+*!&]/g, ' ') // replace symbols and punctuation
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  // 1. DC (Identifier)
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
    // Avoid false positives like "STATUS DA DC"
    if (!clean.includes('STATUS') && !clean.includes('SIMUL') && !clean.includes('MATERIAL')) {
      return 'DC';
    }
  }

  // 2. Base Matriz Columns (Bloco 1)
  if (clean === 'REG' || clean === 'REGIONAL' || clean === 'REGIAO') return 'REG';
  
  if (
    clean.includes('CARTEIRA') ||
    clean.includes('CATEIRA') ||
    (clean.startsWith('TIPO') && (clean.includes('CART') || clean.includes('CATE')))
  ) {
    return 'TIPO (Cateira)';
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

  // Pedido
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

  // Valor Faturado
  if (
    clean.includes('FATURAD') ||
    clean.includes('FATURAMENTO') ||
    clean === 'VALOR FATURADO' ||
    clean === 'FATURADO R$' ||
    clean === 'VALOR FATURADO R$'
  ) {
    return 'Valor Faturado';
  }

  // Saldo
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

  // Plan. Estruturante / Backlog/Input? (Base Matriz Header Mapping)
  if (
    clean === 'BACKLOG INPUT' ||
    clean === 'BACKLOG INPUT?' ||
    clean === 'BACKLOG/INPUT' ||
    clean === 'BACKLOG/INPUT?' ||
    clean === 'PLAN ESTRUTURANTE' ||
    clean === 'PLANEJAMENTO ESTRUTURANTE' ||
    clean.includes('ESTRUTURANTE') ||
    clean.includes('BACKLOG') ||
    clean.includes('INPUT')
  ) {
    return 'Backlog/Input?';
  }

  // 3. Bloco 2 Tracking Columns (Colunas Equipe)
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
 * Parses raw CSV/TSV text into a 2D array of cells
 */
function parseDelimitedText(text: string): string[][] {
  if (!text) return [];
  const rawLines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) return [];

  // Determine delimiter from the first 5 lines
  const sample = rawLines.slice(0, 5).join('\n');
  const countSemicolons = (sample.match(/;/g) || []).length;
  const countTabs = (sample.match(/\t/g) || []).length;
  const countCommas = (sample.match(/,/g) || []).length;

  let delimiter = ';';
  if (countTabs > countSemicolons && countTabs > countCommas) {
    delimiter = '\t';
  } else if (countCommas > countSemicolons && countCommas > countTabs) {
    delimiter = ',';
  } else {
    delimiter = ';';
  }

  const rows: string[][] = [];

  for (const line of rawLines) {
    const row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cell += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delimiter && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else {
        cell += c;
      }
    }
    row.push(cell.trim());

    if (row.some((val) => val !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Parses uploaded .xlsx, .xls or .csv file into an array of objects with canonical keys
 */
export async function readExcelFile(file: File): Promise<{
  sheetName: string;
  data: Record<string, any>[];
  detectedColumns: string[];
  rawHeaders: string[];
}> {
  return new Promise(async (resolve, reject) => {
    const isCsvOrText =
      file.name.toLowerCase().endsWith('.csv') ||
      file.name.toLowerCase().endsWith('.txt') ||
      file.type.includes('csv') ||
      file.type.includes('text');

    try {
      let rows2D: any[][] = [];
      let bestSheetName = isCsvOrText ? 'CSV' : 'Planilha1';

      if (isCsvOrText) {
        // Read CSV directly as text with fallback to latin-1 / windows-1252
        const text = await new Promise<string>((resTxt, rejTxt) => {
          const r = new FileReader();
          r.onload = () => {
            let str = r.result as string;
            // If UTF-8 decode produced lots of replacement chars, try Latin1
            if (str.includes('\uFFFD')) {
              const rLatin = new FileReader();
              rLatin.onload = () => resTxt(rLatin.result as string);
              rLatin.onerror = () => resTxt(str);
              rLatin.readAsText(file, 'ISO-8859-1');
            } else {
              resTxt(str);
            }
          };
          r.onerror = () => rejTxt(new Error('Erro ao ler arquivo CSV.'));
          r.readAsText(file, 'UTF-8');
        });

        rows2D = parseDelimitedText(text);
      } else {
        // Read as XLSX / XLS workbook
        const dataBuffer = await new Promise<Uint8Array>((resBuf, rejBuf) => {
          const r = new FileReader();
          r.onload = (e) => resBuf(new Uint8Array(e.target?.result as ArrayBuffer));
          r.onerror = () => rejBuf(new Error('Erro ao ler arquivo Excel.'));
          r.readAsArrayBuffer(file);
        });

        const workbook = XLSX.read(dataBuffer, {
          type: 'array',
          cellDates: true,
          cellText: false,
        });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Nenhuma planilha encontrada no arquivo.');
        }

        // Smart Sheet & Header Detection:
        let bestHeaderRowIndex = 0;
        let bestScore = -1;

        workbook.SheetNames.forEach((sheetName) => {
          const ws = workbook.Sheets[sheetName];
          if (!ws || !ws['!ref']) return;

          const sheetRows: any[][] = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: '',
            blankrows: false,
          });

          if (sheetRows.length === 0) return;

          const maxSearchRows = Math.min(sheetRows.length, 25);
          for (let r = 0; r < maxSearchRows; r++) {
            const row = sheetRows[r];
            if (!Array.isArray(row) || row.length === 0) continue;

            // If the row has 1 single string containing semicolons, it was a CSV imported without splitting
            let effectiveCells = row;
            if (row.length === 1 && typeof row[0] === 'string' && row[0].includes(';')) {
              effectiveCells = row[0].split(';');
            }

            let score = 0;
            let hasDC = false;

            effectiveCells.forEach((cell) => {
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
            score += Math.min(sheetRows.length, 50);

            if (score > bestScore) {
              bestScore = score;
              bestSheetName = sheetName;
              bestHeaderRowIndex = r;
            }
          }
        });

        const worksheet = workbook.Sheets[bestSheetName];
        if (!worksheet) {
          throw new Error(`Não foi possível ler a aba "${bestSheetName}".`);
        }

        rows2D = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          blankrows: false,
          dateNF: 'dd/mm/yyyy',
        });

        // Check if the entire sheet was read as single column with semicolons
        const isSingleColumnDelimited = rows2D.every(
          (r) => r.length <= 1 || (r.length === 2 && r[1] === '')
        ) && rows2D.some((r) => typeof r[0] === 'string' && r[0].includes(';'));

        if (isSingleColumnDelimited) {
          const rawText = rows2D.map((r) => String(r[0] || '')).join('\n');
          rows2D = parseDelimitedText(rawText);
        }
      }

      if (rows2D.length === 0) {
        throw new Error('A planilha está vazia ou sem linhas de dados.');
      }

      // Find the row with the headers
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

      // Convert data rows (from bestHeaderRowIndex + 1 onwards)
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
            if (rawVal instanceof Date) {
              const d = rawVal.getDate().toString().padStart(2, '0');
              const m = (rawVal.getMonth() + 1).toString().padStart(2, '0');
              const y = rawVal.getFullYear();
              formattedVal = `${d}/${m}/${y}`;
            } else if (typeof rawVal === 'number') {
              formattedVal = String(rawVal);
            } else {
              formattedVal = String(rawVal).trim();
            }
          }

          cleanRow[canonical] = formattedVal;
          if (formattedVal !== '') {
            hasAnyValue = true;
          }

          // Normalize financial values to formatted Brazilian real with 2 decimals
          if (
            canonical === 'Valor Parcial R$' ||
            canonical === 'Valor Final R$' ||
            canonical === 'Orçamento' ||
            canonical === 'Valor Faturado' ||
            canonical === 'Saldo'
          ) {
            if (formattedVal !== '') {
              const parsed = parseCurrencyValue(rawVal !== undefined ? rawVal : formattedVal);
              cleanRow[canonical] = formatDecimalBR(parsed);
            }
          }
        });

        // Check if this row has a valid DC and some data
        const dcValue = cleanRow['DC'] ? String(cleanRow['DC']).trim() : '';
        if (hasAnyValue && dcValue) {
          cleanRow['DC'] = dcValue;
          cleanedData.push(cleanRow);
        }
      }

      if (cleanedData.length === 0) {
        throw new Error(
          'Coluna "DC" não encontrada na planilha ou sem valores preenchidos. Verifique se o cabeçalho possui a coluna "DC".'
        );
      }

      resolve({
        sheetName: bestSheetName,
        data: cleanedData,
        detectedColumns: Array.from(detectedColumnsSet),
        rawHeaders,
      });
    } catch (err: any) {
      reject(
        new Error('Erro ao processar o arquivo: ' + (err.message || 'Formato de planilha inválido'))
      );
    }
  });
}

/**
 * Downloads standard Base Matriz (Bloco 1) Template
 */
export function downloadModeloImportacaoPadrao() {
  const headers = BLOCO_1_KEYS.map((k) => (k === 'Backlog/Input?' ? 'Plan. Estruturante' : k));
  const sampleRow1: Record<string, string> = {
    'DC': 'DC-100201',
    'REG': 'SUL',
    'TIPO (Cateira)': 'FTTH EXPANSÃO',
    'DR': 'PR',
    'Seq': '1',
    'Dc Simulação': 'SIM-100201',
    'Orçamento': 'ORC-2024-101',
    'Status Med. Parcial': 'APROVADA',
    'Valor Parcial R$': '15.200,00',
    'Status Med. Final': 'EM ANÁLISE',
    'Valor Final R$': '38.500,00',
    'Pedido': 'PED-100201',
    'Valor Faturado': '38.500,00',
    'Saldo': '0,00',
    'Tempo': '35',
    'AGING': '10',
    'Data Status': '15/08/2024',
    'UF': 'PR',
    'Localidade': 'CURITIBA',
    'Tipo de Projeto': 'EXPANSÃO PON',
    'Descricao': 'OBRA FIBRA BAIRRO CENTRO',
    'Status da DC (Atual)': 'EM ANDAMENTO',
    'Plan. Estruturante': 'INPUT',
  };

  const sampleRow2: Record<string, string> = {
    'DC': 'DC-100202',
    'REG': 'SUL',
    'TIPO (Cateira)': 'REDE PRIMÁRIA',
    'DR': 'SC',
    'Seq': '2',
    'Dc Simulação': 'SIM-100202',
    'Orçamento': 'ORC-2024-102',
    'Status Med. Parcial': 'PENDENTE',
    'Valor Parcial R$': '0,00',
    'Status Med. Final': 'NÃO INICIADA',
    'Valor Final R$': '22.100,00',
    'Pedido': 'PED-100202',
    'Valor Faturado': '0,00',
    'Saldo': '22.100,00',
    'Tempo': '40',
    'AGING': '18',
    'Data Status': '20/08/2024',
    'UF': 'SC',
    'Localidade': 'FLORIANÓPOLIS',
    'Tipo de Projeto': 'ANEL DEDICADO',
    'Descricao': 'LANÇAMENTO DE CABO 36 FO',
    'Status da DC (Atual)': 'PENDÊNCIA DOC',
    'Plan. Estruturante': 'BACKLOG',
  };

  const worksheet = XLSX.utils.json_to_sheet([sampleRow1, sampleRow2], { header: headers });
  
  // Set column widths for readability
  worksheet['!cols'] = headers.map(() => ({ wch: 22 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tabela1');

  XLSX.writeFile(workbook, 'Modelo_Importacao_Padrao_Base_Matriz_VTAL.xlsx');
}

/**
 * Downloads massive update (Bloco 2) Template
 */
export function downloadModeloImportacaoMassiva() {
  const headers = ['DC', ...BLOCO_2_KEYS];
  const sampleRow1: Record<string, string> = {
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
    'OBS (Medição)': 'Aguardando apenas validação da nota.',
  };

  const sampleRow2: Record<string, string> = {
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
    'OBS (Medição)': 'Pendente envio de relatório fotográfico de campo.',
  };

  const worksheet = XLSX.utils.json_to_sheet([sampleRow1, sampleRow2], { header: headers });
  worksheet['!cols'] = headers.map(() => ({ wch: 24 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tabela1');

  XLSX.writeFile(workbook, 'Modelo_Importacao_Massiva_Acompanhamento_VTAL.xlsx');
}

/**
 * Sets for specific column formatting in Excel
 */
export const DATE_COLUMNS = new Set([
  'Data Status',
  'Data Previsão Entrega (Medição)',
  'Data Previsão Entrega (Projeto)',
  'Data Tratativa',
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

/**
 * Parses diverse date inputs (BR format DD/MM/YYYY, ISO, timestamps, Excel serials) into a true JS Date
 */
export function parseDateForExcel(val?: any): Date | null {
  if (val === undefined || val === null) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'number') {
    if (val > 20000 && val < 60000) {
      // Excel epoch serial
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return isNaN(date.getTime()) ? null : date;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(val).trim();
  if (!str || str === '—' || str === '-' || str === 'N/I' || str === 'null') return null;

  // DD/MM/YYYY or DD-MM-YYYY
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    let year = parseInt(brMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Parses currency and numeric strings with the decimal rule:
 * - If number already has decimals (e.g., 190271.68 or 190271,68), keep it.
 * - If it's a pure integer of 3+ digits (e.g. 1275630), divide by 100 -> 12756.30.
 */
export function parseCurrencyWithDecimalCorrection(val?: any): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') {
    if (isNaN(val)) return null;
    return val;
  }
  const str = String(val).trim();
  if (!str || str === '—' || str === '-' || str === 'N/I' || str === 'null') return null;

  const clean = str.replace(/[R$\s]/g, '').trim();
  if (!clean) return null;

  const hasComma = clean.includes(',');
  const hasDot = clean.includes('.');

  if (hasComma && hasDot) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Brazilian format 12.756,30
      const num = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
      return isNaN(num) ? null : num;
    } else {
      // US format 12,756.30
      const num = parseFloat(clean.replace(/,/g, ''));
      return isNaN(num) ? null : num;
    }
  }

  if (hasComma) {
    const num = parseFloat(clean.replace(',', '.'));
    return isNaN(num) ? null : num;
  }

  if (hasDot) {
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  }

  // Pure integer without decimal delimiter, e.g. "1275630"
  const intVal = parseInt(clean, 10);
  if (!isNaN(intVal)) {
    if (clean.length >= 3 && Math.abs(intVal) >= 100) {
      return intVal / 100;
    }
    return intVal;
  }

  return null;
}

export function formatCurrencyBRL(val?: any): string {
  const num = typeof val === 'number' ? val : parseCurrencyWithDecimalCorrection(val);
  if (num === null || isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parses currency and numeric strings (e.g. "R$ 15.200,50", "15200.50", "35") into a JS float number
 */
export function parseNumberForExcel(val?: any, isCurrencyCol = false): number | null {
  if (isCurrencyCol) {
    return parseCurrencyWithDecimalCorrection(val);
  }
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).trim();
  if (!str || str === '—' || str === '-' || str === 'N/I' || str === 'null') return null;

  // Remove currency symbol, spaces, non-numeric except , and . and -
  const clean = str.replace(/[R$\s]/g, '').trim();
  if (clean.includes(',') && clean.includes('.')) {
    // Brazilian format 15.200,50
    const num = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    return isNaN(num) ? null : num;
  }
  if (clean.includes(',')) {
    const num = parseFloat(clean.replace(',', '.'));
    return isNaN(num) ? null : num;
  }
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * Exports records list to Excel with native Date and Number cell types
 */
export function exportarRegistrosParaExcel(registros: Registro[], nomeArquivo = 'VTAL_OBRAS_Registros') {
  const exportHeaders = ALL_COLUMNS.map((col) =>
    col === 'Backlog/Input?' ? 'Plan. Estruturante' : col
  );

  const exportData = registros.map((item) => {
    const row: Record<string, any> = {};
    ALL_COLUMNS.forEach((col) => {
      const headerKey = col === 'Backlog/Input?' ? 'Plan. Estruturante' : col;
      const rawVal = (item as any)[col];
      if (rawVal === undefined || rawVal === null || rawVal === '') {
        row[headerKey] = '';
        return;
      }

      if (DATE_COLUMNS.has(col)) {
        const parsedDate = parseDateForExcel(rawVal);
        row[headerKey] = parsedDate ? parsedDate : (rawVal ? String(rawVal).trim() : '');
      } else if (CURRENCY_COLUMNS.has(col)) {
        const parsedNum = parseNumberForExcel(rawVal, true);
        row[headerKey] = parsedNum !== null ? parsedNum : (rawVal ? String(rawVal).trim() : '');
      } else if (INTEGER_COLUMNS.has(col)) {
        const parsedInt = parseNumberForExcel(rawVal, false);
        row[headerKey] = parsedInt !== null ? Math.round(parsedInt) : (rawVal ? String(rawVal).trim() : '');
      } else {
        row[headerKey] = String(rawVal).trim();
      }
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData, {
    header: exportHeaders,
    cellDates: true,
    dateNF: 'dd/mm/yyyy',
  });

  // Apply explicit cell types and number formats to worksheet cells
  if (worksheet['!ref']) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const colName = ALL_COLUMNS[C];
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (!cell) continue;

        if (DATE_COLUMNS.has(colName)) {
          if (cell.v instanceof Date) {
            cell.t = 'd';
            cell.z = 'dd/mm/yyyy';
          } else if (typeof cell.v === 'string' && cell.v.trim()) {
            const d = parseDateForExcel(cell.v);
            if (d) {
              cell.t = 'd';
              cell.v = d;
              cell.z = 'dd/mm/yyyy';
            }
          }
        } else if (CURRENCY_COLUMNS.has(colName)) {
          if (typeof cell.v === 'number') {
            cell.t = 'n';
            cell.z = '#,##0.00';
          } else if (typeof cell.v === 'string' && cell.v.trim()) {
            const num = parseNumberForExcel(cell.v, true);
            if (num !== null) {
              cell.t = 'n';
              cell.v = num;
              cell.z = '#,##0.00';
            }
          }
        } else if (INTEGER_COLUMNS.has(colName)) {
          if (typeof cell.v === 'number') {
            cell.t = 'n';
            cell.z = '#,##0';
          } else if (typeof cell.v === 'string' && cell.v.trim()) {
            const num = parseNumberForExcel(cell.v, false);
            if (num !== null) {
              cell.t = 'n';
              cell.v = Math.round(num);
              cell.z = '#,##0';
            }
          }
        }
      }
    }
  }

  worksheet['!cols'] = ALL_COLUMNS.map(() => ({ wch: 22 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros');

  const dataAtual = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${nomeArquivo}_${dataAtual}.xlsx`, {
    cellDates: true,
  });
}

/**
 * Exports history audit log to Excel
 */
export function exportarRelatorioHistoricoParaExcel(
  historico: HistoricoEdicaoItem[],
  nomeArquivo = 'VTAL_OBRAS_Historico_Edicoes'
) {
  const exportData = historico.map((item) => ({
    'DC (Obra)': item.dc,
    'Usuário que editou': item.userName ? `${item.userName} (${item.userEmail})` : item.userEmail,
    'Coluna editada': item.colunaEditada,
    'Data/Hora da edição': item.timestamp
      ? new Date(item.timestamp).toLocaleString('pt-BR')
      : item.dataHora,
    'Valor Anterior': item.valorAnterior || '—',
    'Valor Novo': item.valorNovo || '—',
  }));

  const headers = [
    'DC (Obra)',
    'Usuário que editou',
    'Coluna editada',
    'Data/Hora da edição',
    'Valor Anterior',
    'Valor Novo',
  ];

  const worksheet = XLSX.utils.json_to_sheet(exportData, { header: headers });
  worksheet['!cols'] = [
    { wch: 18 }, // DC
    { wch: 32 }, // Usuário
    { wch: 30 }, // Coluna editada
    { wch: 22 }, // Data/Hora
    { wch: 30 }, // Valor Anterior
    { wch: 30 }, // Valor Novo
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Historico_Auditoria');

  const dataAtual = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${nomeArquivo}_${dataAtual}.xlsx`);
}

/**
 * Exports unlocated DCs from massive import
 */
export function exportarRelatorioDcsNaoEncontradas(notFoundRows: { dc: string; rowData: any }[]) {
  const exportData = notFoundRows.map((item) => ({
    'DC Informada': item.dc,
    'Status': 'Não encontrada na base de dados (Ignorada)',
    ...item.rowData,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DCs_Nao_Encontradas');

  const dataAtual = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `Relatorio_DCs_Nao_Encontradas_${dataAtual}.xlsx`);
}
