import React, { useMemo } from 'react';
import {
  Registro,
  RegistrosFilterPayload,
  getRegistroMesInput,
  getRegistroProducaoBI,
  normalizeResponsavel,
  sortResponsaveis,
} from '../../types';
import { parseMesAnoSortKey, isValidMesInput } from '../../utils/monthUtils';
import { parseCurrencyValue, formatBRL } from '../../utils/currency';
import { CalendarRange, ExternalLink, AlertTriangle } from 'lucide-react';

interface ObrasInputVolumeTableProps {
  registros: Registro[];
  onNavigate?: (extraFilters: RegistrosFilterPayload) => void;
}

export const ObrasInputVolumeTable: React.FC<ObrasInputVolumeTableProps> = ({
  registros,
  onNavigate,
}) => {
  const {
    responsaveis,
    meses,
    matriz,
    totaisLinha,
    totaisColuna,
    totalGeral,
    temEmBranco,
    totalEmBranco,
    maxCellCount,
  } = useMemo(() => {
    const setMes = new Set<string>();
    const setResp = new Set<string>();
    const m = new Map<string, Map<string, { count: number; valor: number }>>();
    const tLinha = new Map<string, { count: number; valor: number }>();
    const tColuna = new Map<string, { count: number; valor: number }>();
    let grandTotalCount = 0;
    let grandTotalValor = 0;
    let hasBlank = false;
    let maxCount = 0;

    registros.forEach((r) => {
      const mesRaw = getRegistroMesInput(r);
      if (!isValidMesInput(mesRaw)) {
        return; // Corte estrito: só entram DCs com mês e ano válidos (formato mmm/aaaa)
      }

      const mes = mesRaw.trim();
      setMes.add(mes);

      const respKey = normalizeResponsavel(r.Responsavel);
      if (respKey === '(EM BRANCO)') {
        hasBlank = true;
      } else {
        setResp.add(respKey);
      }

      const valBI = parseCurrencyValue(getRegistroProducaoBI(r));

      if (!m.has(respKey)) {
        m.set(respKey, new Map());
      }
      const respMap = m.get(respKey)!;
      const prevCell = respMap.get(mes) || { count: 0, valor: 0 };
      const newCount = prevCell.count + 1;
      const newValor = prevCell.valor + valBI;
      respMap.set(mes, { count: newCount, valor: newValor });

      if (newCount > maxCount) {
        maxCount = newCount;
      }

      const prevLinha = tLinha.get(respKey) || { count: 0, valor: 0 };
      tLinha.set(respKey, { count: prevLinha.count + 1, valor: prevLinha.valor + valBI });

      const prevColuna = tColuna.get(mes) || { count: 0, valor: 0 };
      tColuna.set(mes, { count: prevColuna.count + 1, valor: prevColuna.valor + valBI });

      grandTotalCount += 1;
      grandTotalValor += valBI;
    });

    // Colunas de mês em ordem CRONOLÓGICA (nunca alfabética)
    const sortedMeses = Array.from(setMes).sort((a, b) => {
      const keyA = parseMesAnoSortKey(a);
      const keyB = parseMesAnoSortKey(b);
      if (keyA !== keyB) return keyA - keyB;
      return a.localeCompare(b, 'pt-BR');
    });

    // Linhas em ordem alfabética; (EM BRANCO) logo antes do Total Geral
    const sortedResp = Array.from(setResp).sort(sortResponsaveis);
    if (hasBlank) {
      sortedResp.push('(EM BRANCO)');
    }

    const blankCount = tLinha.get('(EM BRANCO)')?.count || 0;

    return {
      responsaveis: sortedResp,
      meses: sortedMeses,
      matriz: m,
      totaisLinha: tLinha,
      totaisColuna: tColuna,
      totalGeral: { count: grandTotalCount, valor: grandTotalValor },
      temEmBranco: hasBlank,
      totalEmBranco: blankCount,
      maxCellCount: maxCount,
    };
  }, [registros]);

  const handleCellClick = (resp: string, mes: string, count: number) => {
    if (!onNavigate || count === 0) return;
    const respFilter = resp === '(EM BRANCO)' ? ['(EM BRANCO)'] : [resp];
    onNavigate({
      responsavel: respFilter,
      mesInput: [mes],
    });
  };

  const handleRowTotalClick = (resp: string, count: number) => {
    if (!onNavigate || count === 0) return;
    const respFilter = resp === '(EM BRANCO)' ? ['(EM BRANCO)'] : [resp];
    onNavigate({
      responsavel: respFilter,
      mesInput: meses,
    });
  };

  const handleColTotalClick = (mes: string, count: number) => {
    if (!onNavigate || count === 0) return;
    onNavigate({
      mesInput: [mes],
    });
  };

  const handleGrandTotalClick = () => {
    if (!onNavigate || totalGeral.count === 0) return;
    onNavigate({
      mesInput: meses,
    });
  };

  // Mapa de calor com Azul Médio #1F4E8C: quanto maior o valor, mais escura a célula
  const getHeatmapStyle = (
    count: number,
    isBlankRow: boolean
  ): { className: string; style?: React.CSSProperties; isWhiteText?: boolean } => {
    if (count === 0) {
      return {
        className: isBlankRow ? 'text-[#E0A526]/40 font-normal' : 'text-slate-300 font-normal',
        isWhiteText: false,
      };
    }

    // Âmbar #E0A526: só um toque na linha "(EM BRANCO)"
    if (isBlankRow) {
      return {
        className:
          'font-black cursor-pointer group transition-all hover:ring-1 hover:ring-[#E0A526]',
        style: {
          backgroundColor: 'rgba(224, 165, 38, 0.22)',
          color: '#7A4E00',
        },
        isWhiteText: false,
      };
    }

    // Azul Médio #1F4E8C (rgb: 31, 78, 140)
    const ratio = maxCellCount > 0 ? count / maxCellCount : 0;

    if (ratio >= 0.75) {
      // Valores mais altos (destaque imediato, como Medição e Implantação em agosto)
      return {
        className:
          'font-black text-white cursor-pointer group transition-all hover:brightness-110 hover:ring-2 hover:ring-[#0B2545]',
        style: {
          backgroundColor: '#1F4E8C',
          color: '#FFFFFF',
        },
        isWhiteText: true,
      };
    }
    if (ratio >= 0.5) {
      return {
        className:
          'font-extrabold text-white cursor-pointer group transition-all hover:brightness-110 hover:ring-2 hover:ring-[#0B2545]',
        style: {
          backgroundColor: 'rgba(31, 78, 140, 0.78)',
          color: '#FFFFFF',
        },
        isWhiteText: true,
      };
    }
    if (ratio >= 0.3) {
      return {
        className:
          'font-bold text-white cursor-pointer group transition-all hover:brightness-105 hover:ring-1 hover:ring-[#0B2545]',
        style: {
          backgroundColor: 'rgba(31, 78, 140, 0.55)',
          color: '#FFFFFF',
        },
        isWhiteText: true,
      };
    }
    if (ratio >= 0.15) {
      return {
        className:
          'font-bold cursor-pointer group transition-all hover:brightness-95 hover:ring-1 hover:ring-[#1F4E8C]',
        style: {
          backgroundColor: 'rgba(31, 78, 140, 0.28)',
          color: '#0B2545',
        },
        isWhiteText: false,
      };
    }
    return {
      className:
        'font-semibold cursor-pointer group transition-all hover:brightness-95 hover:ring-1 hover:ring-[#1F4E8C]',
      style: {
        backgroundColor: 'rgba(31, 78, 140, 0.12)',
        color: '#0B2545',
      },
      isWhiteText: false,
    };
  };

  return (
    <div className="rounded-xl border border-[#DCE3EC] bg-white shadow-xs overflow-hidden">
      {/* Header do Bloco: Azul Marinho #0B2545 + Detalhes secundários em Azul Claro #8DA9C4 e Card Âmbar #E0A526 */}
      <div className="bg-[#F7F8FA] border-b border-[#DCE3EC] px-3.5 py-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-lg bg-[#0B2545] text-white shadow-2xs">
            <CalendarRange className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3
              style={{ fontSize: 'var(--fs-dash-panel-title)' }}
              className="font-black text-[#0B2545] tracking-tight"
            >
              OBRAS INPUT (VOLUME)
            </h3>
            <p
              style={{ fontSize: 'var(--fs-dash-panel-subtitle)' }}
              className="text-slate-500 font-medium"
            >
              Quantidade total de DCs por Responsável e Mês Input cronológico com mapa de calor
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Card correspondente em Âmbar #E0A526 para responsável (EM BRANCO) */}
          {temEmBranco && totalEmBranco > 0 && (
            <div
              onClick={() => handleRowTotalClick('(EM BRANCO)', totalEmBranco)}
              className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-[#E0A526]/12 border border-[#E0A526] rounded-md text-[10.5px] font-bold text-[#855800] cursor-pointer hover:bg-[#E0A526]/22 transition-all shadow-2xs group"
              title="Clique para filtrar as obras com responsável (EM BRANCO) na aba Registros"
            >
              <AlertTriangle className="w-3 h-3 text-[#E0A526] shrink-0 group-hover:scale-110 transition-transform" />
              <span>
                Atenção: <strong>{totalEmBranco}</strong> {totalEmBranco === 1 ? 'obra' : 'obras'} com responsável <strong>(EM BRANCO)</strong>
              </span>
              <ExternalLink className="w-2.5 h-2.5 text-[#855800]/70 group-hover:text-[#855800]" />
            </div>
          )}

          {/* Badge Informativo de Interatividade em Azul Claro #8DA9C4 e Azul Marinho #0B2545 */}
          <div className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-[#8DA9C4]/15 border border-[#8DA9C4]/40 rounded-md text-[10.5px] text-[#0B2545] font-semibold shadow-2xs">
            <ExternalLink className="w-2.5 h-2.5 text-[#1F4E8C] shrink-0" />
            <span>Clique nas quantidades para filtrar na aba Registros</span>
          </div>
        </div>
      </div>

      {/* Tabela de Dados com Paleta Padronizada */}
      <div className="p-2.5 sm:p-3">
        {meses.length === 0 || responsaveis.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs bg-[#F7F8FA] rounded-xl border border-dashed border-[#DCE3EC] font-medium">
            Nenhuma DC com Mês Input válido para os filtros atuais.
          </div>
        ) : (
          <div className="rounded-xl border border-[#DCE3EC] bg-white overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-w-full">
              <table className="w-full border-collapse font-sans">
                {/* Cabeçalho da tabela: Toda linha do cabeçalho na cor Cinza azulado #DCE3EC com textos em Azul Marinho #0B2545 */}
                <thead>
                  <tr className="bg-[#DCE3EC] text-[#0B2545] uppercase font-black tracking-wider border-b border-[#8DA9C4]/50 whitespace-nowrap">
                    <th
                      style={{
                        fontSize: 'var(--fs-dash-table-header)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      className="px-2.5 text-left font-black border-r border-[#8DA9C4]/30 min-w-[120px]"
                    >
                      RESPONSÁVEL
                    </th>
                    {meses.map((mes) => (
                      <th
                        key={mes}
                        onClick={() => handleColTotalClick(mes, totaisColuna.get(mes)?.count || 0)}
                        style={{
                          fontSize: 'var(--fs-dash-table-header)',
                          paddingTop: 'var(--dash-table-row-py)',
                          paddingBottom: 'var(--dash-table-row-py)',
                        }}
                        className="px-2 text-center font-black border-r border-[#8DA9C4]/30 min-w-[75px] cursor-pointer hover:bg-[#8DA9C4]/30 transition-colors"
                        title={`Filtrar mês "${mes}" na aba Registros`}
                      >
                        {mes}
                      </th>
                    ))}
                    {/* Coluna do Total Geral: Cabeçalho em Cinza azulado #DCE3EC uniforme */}
                    <th
                      onClick={handleGrandTotalClick}
                      style={{
                        fontSize: 'var(--fs-dash-table-header)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      className="px-2 text-center font-black text-[#0B2545] min-w-[85px] border-l border-[#8DA9C4]/40 cursor-pointer hover:bg-[#8DA9C4]/30 transition-colors"
                      title="Filtrar todas as DCs com meses válidos na aba Registros"
                    >
                      Total Geral
                    </th>
                  </tr>
                </thead>

                {/* Linhas de Dados: Fundo branco sem alternância de cores, com mapa de calor preservado */}
                <tbody className="divide-y divide-[#DCE3EC]">
                  {responsaveis.map((resp) => {
                    const respMap = matriz.get(resp);
                    const rowTotal = totaisLinha.get(resp) || { count: 0, valor: 0 };
                    const isBlank = resp === '(EM BRANCO)';

                    return (
                      <tr
                        key={resp}
                        className={`transition-colors whitespace-nowrap bg-white ${
                          isBlank
                            ? 'border-l-4 border-l-[#E0A526]'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Coluna de Responsável: Fundo branco com textos em Azul Marinho #0B2545 */}
                        <td
                          style={{
                            fontSize: 'var(--fs-dash-table-cell)',
                            paddingTop: 'var(--dash-table-row-py)',
                            paddingBottom: 'var(--dash-table-row-py)',
                          }}
                          className="px-2.5 text-left font-bold text-[#0B2545] border-r border-[#DCE3EC] bg-white"
                        >
                          {isBlank ? (
                            <span
                              style={{ fontSize: 'var(--fs-dash-table-badge)' }}
                              className="inline-flex items-center gap-1 px-1 py-0.2 rounded bg-[#E0A526]/20 border border-[#E0A526]/40 text-[#855800] font-black italic"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-[#E0A526]" />
                              (EM BRANCO)
                            </span>
                          ) : (
                            <span className="text-[#0B2545]">{resp}</span>
                          )}
                        </td>

                        {/* Células Mensais: Quantidade e R$ Produção BI. com Mapa de Calor */}
                        {meses.map((mes) => {
                          const cellData = respMap?.get(mes) || { count: 0, valor: 0 };
                          const count = cellData.count;
                          const valor = cellData.valor;
                          const heat = getHeatmapStyle(count, isBlank);

                          return (
                            <td
                              key={mes}
                              onClick={() => handleCellClick(resp, mes, count)}
                              style={{
                                ...heat.style,
                                fontSize: 'var(--fs-dash-table-cell)',
                                paddingTop: 'var(--dash-table-row-py)',
                                paddingBottom: 'var(--dash-table-row-py)',
                              }}
                              className={`px-2 text-center tabular-nums border-r border-[#DCE3EC] transition-all ${heat.className}`}
                              title={
                                count > 0
                                  ? `Ver ${count} DC(s) (${formatBRL(valor)}) de ${resp} em ${mes} na aba Registros`
                                  : undefined
                              }
                            >
                              {count > 0 ? (
                                <div className="flex flex-col items-center justify-center py-0.5 leading-tight">
                                  <span className="inline-block px-1 rounded group-hover:underline font-bold">
                                    {count}
                                  </span>
                                  <span
                                    className={`text-[9.5px] tabular-nums mt-0.5 tracking-tight font-normal ${
                                      heat.isWhiteText
                                        ? 'text-white/80'
                                        : isBlank
                                        ? 'text-[#7A4E00]/85'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    {formatBRL(valor)}
                                  </span>
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>
                          );
                        })}

                        {/* Coluna do Total Linha: Quantidade e R$ Produção BI. */}
                        <td
                          onClick={() => handleRowTotalClick(resp, rowTotal.count)}
                          style={{
                            fontSize: 'var(--fs-dash-table-cell)',
                            paddingTop: 'var(--dash-table-row-py)',
                            paddingBottom: 'var(--dash-table-row-py)',
                          }}
                          className={`px-2 text-center tabular-nums font-black border-l border-[#DCE3EC] bg-white transition-colors ${
                            isBlank
                              ? 'text-[#855800] hover:bg-amber-50 cursor-pointer'
                              : rowTotal.count > 0
                              ? 'text-[#0B2545] hover:bg-slate-100 cursor-pointer group'
                              : 'text-slate-400'
                          }`}
                          title={
                            rowTotal.count > 0
                              ? `Ver todas as ${rowTotal.count} DC(s) (${formatBRL(rowTotal.valor)}) de ${resp} na aba Registros`
                              : undefined
                          }
                        >
                          {rowTotal.count > 0 ? (
                            <div className="flex flex-col items-center justify-center py-0.5 leading-tight">
                              <span className="inline-block px-1 rounded group-hover:underline font-black">
                                {rowTotal.count}
                              </span>
                              <span
                                className={`text-[9.5px] tabular-nums mt-0.5 tracking-tight font-normal ${
                                  isBlank ? 'text-[#855800]/85' : 'text-slate-500'
                                }`}
                              >
                                {formatBRL(rowTotal.valor)}
                              </span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Linha de Total Geral: Toda a linha na cor #0B2545 com texto em branco */}
                <tfoot>
                  <tr className="bg-[#0B2545] text-white border-t-2 border-[#0B2545] font-black whitespace-nowrap">
                    <td
                      style={{
                        fontSize: 'var(--fs-dash-table-header)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      className="px-2.5 text-left uppercase tracking-wider text-white border-r border-[#1F4E8C] font-black"
                    >
                      Total Geral
                    </td>
                    {meses.map((mes) => {
                      const colTotal = totaisColuna.get(mes) || { count: 0, valor: 0 };
                      return (
                        <td
                          key={mes}
                          onClick={() => handleColTotalClick(mes, colTotal.count)}
                          style={{
                            fontSize: 'var(--fs-dash-table-cell)',
                            paddingTop: 'var(--dash-table-row-py)',
                            paddingBottom: 'var(--dash-table-row-py)',
                          }}
                          className={`px-2 text-center tabular-nums font-black border-r border-[#1F4E8C] transition-colors ${
                            colTotal.count > 0
                              ? 'cursor-pointer hover:bg-[#1F4E8C] text-white group'
                              : 'text-white/60'
                          }`}
                          title={
                            colTotal.count > 0
                              ? `Ver todas as ${colTotal.count} DC(s) (${formatBRL(colTotal.valor)}) de ${mes} na aba Registros`
                              : undefined
                          }
                        >
                          {colTotal.count > 0 ? (
                            <div className="flex flex-col items-center justify-center py-0.5 leading-tight">
                              <span className="inline-block px-1 rounded group-hover:underline font-black">
                                {colTotal.count}
                              </span>
                              <span className="text-[9.5px] tabular-nums mt-0.5 tracking-tight font-normal text-white/80">
                                {formatBRL(colTotal.valor)}
                              </span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      );
                    })}
                    {/* Célula final de Total Geral: também na cor #0B2545 com texto branco */}
                    <td
                      onClick={handleGrandTotalClick}
                      style={{
                        fontSize: 'var(--fs-dash-table-cell)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      className="px-2 text-center tabular-nums font-black text-white border-l border-[#1F4E8C] cursor-pointer hover:bg-[#1F4E8C] hover:underline transition-colors"
                      title={`Ver todas as ${totalGeral.count} DC(s) (${formatBRL(totalGeral.valor)}) da tabela na aba Registros`}
                    >
                      {totalGeral.count > 0 ? (
                        <div className="flex flex-col items-center justify-center py-0.5 leading-tight">
                          <span className="font-black text-white">{totalGeral.count}</span>
                          <span className="text-[9.5px] tabular-nums mt-0.5 tracking-tight font-normal text-white/80">
                            {formatBRL(totalGeral.valor)}
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
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
