import React, { useMemo } from 'react';
import { FRRegistro } from '../../types';
import { parseFRValor, formatBRL } from '../../utils/currency';
import { parseMesAnoSortKey, normalizeMesFR } from '../../utils/monthUtils';
import { Receipt, Info } from 'lucide-react';

interface FRsGeradasTableProps {
  frRegistros: FRRegistro[];
}

export const FRsGeradasTable: React.FC<FRsGeradasTableProps> = ({ frRegistros }) => {
  const { regionais, meses, matriz, totaisLinha, totaisColuna, totalGeral } = useMemo(() => {
    if (!frRegistros || frRegistros.length === 0) {
      return {
        regionais: [],
        meses: [],
        matriz: new Map<string, Map<string, number>>(),
        totaisLinha: new Map<string, number>(),
        totaisColuna: new Map<string, number>(),
        totalGeral: 0,
      };
    }

    const setReg = new Set<string>();
    const setMes = new Set<string>();
    const m = new Map<string, Map<string, number>>();
    const tLinha = new Map<string, number>();
    const tColuna = new Map<string, number>();
    let grandTotal = 0;

    frRegistros.forEach((row) => {
      const reg = (row.REG ? String(row.REG).trim().toUpperCase() : '') || (row.UF ? String(row.UF).trim().toUpperCase() : '') || '-';
      const mes = normalizeMesFR(row.Mês, row['DATA DA SOLICITAÇÃO']);
      const val = parseFRValor(row['VALOR FR']);

      setReg.add(reg);
      setMes.add(mes);

      if (!m.has(reg)) {
        m.set(reg, new Map());
      }
      const regMap = m.get(reg)!;
      const currentVal = regMap.get(mes) || 0;
      regMap.set(mes, currentVal + val);

      tLinha.set(reg, (tLinha.get(reg) || 0) + val);
      tColuna.set(mes, (tColuna.get(mes) || 0) + val);
      grandTotal += val;
    });

    // Linhas = valores únicos de REG em ordem alfabética (colocando '-' por último se existir)
    const sortedReg = Array.from(setReg).sort((a, b) => {
      if (a === '-') return 1;
      if (b === '-') return -1;
      return a.localeCompare(b, 'pt-BR');
    });

    // Colunas = valores únicos de Mês em ordem cronológica (colocando '-' por último se existir)
    const sortedMes = Array.from(setMes).sort((a, b) => {
      if (a === '-') return 1;
      if (b === '-') return -1;
      const keyA = parseMesAnoSortKey(a);
      const keyB = parseMesAnoSortKey(b);
      if (keyA !== keyB) return keyA - keyB;
      return a.localeCompare(b, 'pt-BR');
    });

    return {
      regionais: sortedReg,
      meses: sortedMes,
      matriz: m,
      totaisLinha: tLinha,
      totaisColuna: tColuna,
      totalGeral: grandTotal,
    };
  }, [frRegistros]);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
      {/* Header do Quadro */}
      <div className="bg-slate-50/90 border-b border-slate-200 px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-lg bg-[#002855] text-white shadow-2xs">
            <Receipt className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3
              style={{ fontSize: 'var(--fs-dash-panel-title)' }}
              className="font-extrabold text-slate-900 tracking-tight"
            >
              FR's GERADAS
            </h3>
            <p
              style={{ fontSize: 'var(--fs-dash-panel-subtitle)' }}
              className="text-slate-500 font-medium"
            >
              Consolidado de valores faturados por Regional e Mês de solicitação
            </p>
          </div>
        </div>

        {/* Legenda Fixo / Não Afetado */}
        <div className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-amber-50/80 border border-amber-200/80 rounded-md text-[10.5px] text-amber-900 font-semibold self-start sm:self-auto shadow-2xs">
          <Info className="w-3 h-3 text-amber-700 shrink-0" />
          <span>Não é afetado pelos filtros do Dashboard</span>
        </div>
      </div>

      {/* Conteúdo da Tabela */}
      <div className="p-2.5 sm:p-3">
        {regionais.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200 font-medium">
            Nenhuma FR importada
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-w-full">
              <table className="w-full border-collapse font-sans select-none">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 uppercase font-black tracking-wider border-b border-slate-200 whitespace-nowrap">
                    <th
                      style={{
                        fontSize: 'var(--fs-dash-table-header)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      className="px-2.5 text-center font-black border-r border-slate-200 min-w-[110px]"
                    >
                      REGIONAL
                    </th>
                    {meses.map((mes) => (
                      <th
                        key={mes}
                        style={{
                          fontSize: 'var(--fs-dash-table-header)',
                          paddingTop: 'var(--dash-table-row-py)',
                          paddingBottom: 'var(--dash-table-row-py)',
                        }}
                        className="px-2.5 text-center font-black border-r border-slate-200 min-w-[120px]"
                      >
                        {mes}
                      </th>
                    ))}
                    <th
                      style={{
                        fontSize: 'var(--fs-dash-table-header)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      className="px-2.5 text-center font-black bg-slate-200/60 text-slate-900 min-w-[130px]"
                    >
                      Total Geral
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {regionais.map((reg, idx) => {
                    const regMap = matriz.get(reg);
                    const rowTotal = totaisLinha.get(reg) || 0;
                    return (
                      <tr
                        key={reg}
                        className={`transition-colors whitespace-nowrap ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        }`}
                      >
                        <td
                          style={{
                            paddingTop: 'var(--dash-table-row-py)',
                            paddingBottom: 'var(--dash-table-row-py)',
                          }}
                          className="px-2.5 text-center font-bold text-slate-800 border-r border-slate-200"
                        >
                          <span
                            style={{ fontSize: 'var(--fs-dash-table-badge)' }}
                            className="inline-block px-1 py-0.2 rounded bg-slate-100 text-slate-800 font-extrabold border border-slate-200"
                          >
                            {reg}
                          </span>
                        </td>
                        {meses.map((mes) => {
                          const cellVal = regMap?.get(mes) || 0;
                          return (
                            <td
                              key={mes}
                              style={{
                                fontSize: 'var(--fs-dash-table-cell)',
                                paddingTop: 'var(--dash-table-row-py)',
                                paddingBottom: 'var(--dash-table-row-py)',
                              }}
                              className="px-2.5 text-center tabular-nums text-slate-700 border-r border-slate-200 font-medium"
                            >
                              {cellVal > 0 ? formatBRL(cellVal) : '-'}
                            </td>
                          );
                        })}
                        <td
                          style={{
                            fontSize: 'var(--fs-dash-table-cell)',
                            paddingTop: 'var(--dash-table-row-py)',
                            paddingBottom: 'var(--dash-table-row-py)',
                          }}
                          className="px-2.5 text-center tabular-nums font-black text-slate-900 bg-slate-50/60"
                        >
                          {rowTotal > 0 ? formatBRL(rowTotal) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900 whitespace-nowrap">
                    <td
                      style={{
                        fontSize: 'var(--fs-dash-table-header)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      className="px-2.5 text-center uppercase tracking-wider text-[#002855] border-r border-slate-200 font-black"
                    >
                      Total Geral
                    </td>
                    {meses.map((mes) => {
                      const colTotal = totaisColuna.get(mes) || 0;
                      return (
                        <td
                          key={mes}
                          style={{
                            fontSize: 'var(--fs-dash-table-cell)',
                            paddingTop: 'var(--dash-table-row-py)',
                            paddingBottom: 'var(--dash-table-row-py)',
                          }}
                          className="px-2.5 text-center tabular-nums font-black text-slate-900 border-r border-slate-200"
                        >
                          {colTotal > 0 ? formatBRL(colTotal) : '-'}
                        </td>
                      );
                    })}
                    <td
                      style={{
                        fontSize: 'var(--fs-dash-table-cell)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      className="px-2.5 text-center tabular-nums font-black text-emerald-800 bg-slate-200/80"
                    >
                      {totalGeral > 0 ? formatBRL(totalGeral) : '-'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
