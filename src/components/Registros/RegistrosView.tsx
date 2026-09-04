import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Registro,
  BLOCO_1_KEYS,
  BLOCO_2_KEYS,
  ALL_COLUMNS,
} from '../../types';
import {
  exportarRegistrosParaExcel,
  exportarRelatorioHistoricoParaExcel,
} from '../../utils/excel';
import { parseCurrencyValue, formatBRL } from '../../utils/currency';
import { RegistroEditModal } from './RegistroEditModal';
import { HistoricoModal } from './HistoricoModal';
import { MultiSelectFilter } from './MultiSelectFilter';
import {
  Search,
  Download,
  Edit3,
  History,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Database,
  Sparkles,
  Pin,
  FileSpreadsheet,
  RefreshCw,
  Filter,
  ChevronDown,
  Clock,
  CheckCircle2,
  Archive,
} from 'lucide-react';
import { useAutoExportADM } from '../../hooks/useAutoExportADM';

export const RegistrosView: React.FC = () => {
  const { isAdmin, user, profile } = useAuth();
  const {
    registros,
    lastImportInfo,
    loadingRegistros,
    refreshRegistros,
    popularDadosExemplo,
    segmentacoes,
    exportarAuditoriaGeral,
    arquivarELimparHistorico,
  } = useData();

  // Automatic Excel download for ADM profile (08:15 and 16:00 local time)
  const {
    hasExported0815,
    hasExported1600,
    lastMessage: autoExportMessage,
    clearLastMessage: clearAutoExportMessage,
  } = useAutoExportADM({
    isAdmin,
    userEmail: user?.email || profile?.email,
    userId: user?.uid || profile?.uid,
    registros,
    loadingRegistros,
  });

  const [isExportingAudit, setIsExportingAudit] = useState(false);

  // 1. Search by DC and Descricao
  const [searchDC, setSearchDC] = useState('');

  // 2. 8 Multi-Select Filters
  const [filterRegional, setFilterRegional] = useState<string[]>([]);
  const [filterUF, setFilterUF] = useState<string[]>([]);
  const [filterCarteira, setFilterCarteira] = useState<string[]>([]);
  const [filterAging, setFilterAging] = useState<string[]>([]);
  const [filterStatusAtual, setFilterStatusAtual] = useState<string[]>([]);
  const [filterStatusInforme, setFilterStatusInforme] = useState<string[]>([]);
  const [filterResponsavel, setFilterResponsavel] = useState<string[]>([]);
  const [filterTipoProjeto, setFilterTipoProjeto] = useState<string[]>([]);

  // 3. Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('vtal_registros_rows_per_page');
      if (saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && [25, 50, 100, 200, 500].includes(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    return 25;
  });
  const [sortColumn, setSortColumn] = useState<string>('DC');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [freezeDcColumn, setFreezeDcColumn] = useState(true);

  // Controls for collapsible panels
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [isIndicatorsExpanded, setIsIndicatorsExpanded] = useState(true);

  // Sticky header state
  const [isSticky, setIsSticky] = useState(false);
  const [stickyTop, setStickyTop] = useState(78);
  const [tableRect, setTableRect] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [tableWidth, setTableWidth] = useState<number>(0);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const originalTheadRef = useRef<HTMLTableSectionElement>(null);
  const floatingHeaderScrollRef = useRef<HTMLDivElement>(null);

  // Selected row for Edit/View Modal
  const [selectedRegistro, setSelectedRegistro] = useState<Registro | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Selected row for History Modal
  const [historyDc, setHistoryDc] = useState<string | null>(null);

  // Helper to extract TIPO (CARTEIRA) value reliably
  const getRegistroCarteira = (r: Registro): string => {
    return (
      r['TIPO (Cateira)'] ||
      (r as any)['TIPO (CARTEIRA)'] ||
      (r as any)['TIPO (Carteira)'] ||
      (r as any)['Tipo (Carteira)'] ||
      (r as any)['CARTEIRA'] ||
      (r as any)['Carteira'] ||
      ''
    ).trim();
  };

  // Helper to test if an item matches search and all other filters (correlated filters)
  const matchesFilterSubset = (item: Registro, excludeKey?: string) => {
    // 1. Search in DC or Descricao
    if (searchDC.trim()) {
      const term = searchDC.toLowerCase().trim();
      const dcVal = (item.DC || '').toLowerCase();
      const descVal = (item.Descricao || '').toLowerCase();
      if (!dcVal.includes(term) && !descVal.includes(term)) {
        return false;
      }
    }

    if (excludeKey !== 'REG' && filterRegional.length > 0) {
      if (!item.REG || !filterRegional.includes(item.REG.trim().toUpperCase())) return false;
    }
    if (excludeKey !== 'UF' && filterUF.length > 0) {
      if (!item.UF || !filterUF.includes(item.UF.trim().toUpperCase())) return false;
    }
    if (excludeKey !== 'CARTEIRA' && filterCarteira.length > 0) {
      const cartVal = getRegistroCarteira(item);
      if (!cartVal || !filterCarteira.includes(cartVal)) return false;
    }
    if (excludeKey !== 'AGING' && filterAging.length > 0) {
      if (!item.AGING || !filterAging.includes(item.AGING.trim())) return false;
    }
    if (excludeKey !== 'STATUS_ATUAL' && filterStatusAtual.length > 0) {
      if (
        !item['Status da DC (Atual)'] ||
        !filterStatusAtual.includes(item['Status da DC (Atual)'].trim())
      )
        return false;
    }
    if (excludeKey !== 'STATUS_INFORME' && filterStatusInforme.length > 0) {
      if (
        !item['Status Informe (Campo)'] ||
        !filterStatusInforme.includes(item['Status Informe (Campo)'].trim())
      )
        return false;
    }
    if (excludeKey !== 'RESPONSAVEL' && filterResponsavel.length > 0) {
      if (!item.Responsavel || !filterResponsavel.includes(item.Responsavel.trim()))
        return false;
    }
    if (excludeKey !== 'TIPO_PROJETO' && filterTipoProjeto.length > 0) {
      if (!item['Tipo de Projeto'] || !filterTipoProjeto.includes(item['Tipo de Projeto'].trim()))
        return false;
    }
    return true;
  };

  // Derive correlated unique options & counts for the 8 multiselect filters
  const {
    regionalOptions,
    regionalCounts,
    ufOptions,
    ufCounts,
    carteiraOptions,
    carteiraCounts,
    agingOptions,
    agingCounts,
    statusAtualOptions,
    statusAtualCounts,
    statusInformeOptions,
    statusInformeCounts,
    responsavelOptions,
    responsavelCounts,
    tipoProjetoOptions,
    tipoProjetoCounts,
  } = useMemo(() => {
    const regCounts: Record<string, number> = {};
    const uCounts: Record<string, number> = {};
    const cartCounts: Record<string, number> = {};
    const agCounts: Record<string, number> = {};
    const stAtualCounts: Record<string, number> = {};
    const stInfCounts: Record<string, number> = {};
    const respCounts: Record<string, number> = {};
    const projCounts: Record<string, number> = {};

    registros.forEach((r) => {
      // 1. REGIONAL
      if (r.REG) {
        const val = r.REG.trim().toUpperCase();
        if (matchesFilterSubset(r, 'REG')) {
          regCounts[val] = (regCounts[val] || 0) + 1;
        } else if (filterRegional.includes(val) && !regCounts[val]) {
          regCounts[val] = 0;
        }
      }

      // 2. UF
      if (r.UF) {
        const val = r.UF.trim().toUpperCase();
        if (matchesFilterSubset(r, 'UF')) {
          uCounts[val] = (uCounts[val] || 0) + 1;
        } else if (filterUF.includes(val) && !uCounts[val]) {
          uCounts[val] = 0;
        }
      }

      // 3. TIPO (CARTEIRA)
      const cartVal = getRegistroCarteira(r);
      if (cartVal) {
        if (matchesFilterSubset(r, 'CARTEIRA')) {
          cartCounts[cartVal] = (cartCounts[cartVal] || 0) + 1;
        } else if (filterCarteira.includes(cartVal) && !cartCounts[cartVal]) {
          cartCounts[cartVal] = 0;
        }
      }

      // 4. AGING
      if (r.AGING) {
        const val = r.AGING.trim();
        if (matchesFilterSubset(r, 'AGING')) {
          agCounts[val] = (agCounts[val] || 0) + 1;
        } else if (filterAging.includes(val) && !agCounts[val]) {
          agCounts[val] = 0;
        }
      }

      // 5. Status da DC (Atual)
      if (r['Status da DC (Atual)']) {
        const val = r['Status da DC (Atual)'].trim();
        if (matchesFilterSubset(r, 'STATUS_ATUAL')) {
          stAtualCounts[val] = (stAtualCounts[val] || 0) + 1;
        } else if (filterStatusAtual.includes(val) && !stAtualCounts[val]) {
          stAtualCounts[val] = 0;
        }
      }

      // 6. Status Informe (Campo)
      if (r['Status Informe (Campo)']) {
        const val = r['Status Informe (Campo)'].trim();
        if (matchesFilterSubset(r, 'STATUS_INFORME')) {
          stInfCounts[val] = (stInfCounts[val] || 0) + 1;
        } else if (filterStatusInforme.includes(val) && !stInfCounts[val]) {
          stInfCounts[val] = 0;
        }
      }

      // 7. Responsável
      if (r.Responsavel) {
        const val = r.Responsavel.trim();
        if (matchesFilterSubset(r, 'RESPONSAVEL')) {
          respCounts[val] = (respCounts[val] || 0) + 1;
        } else if (filterResponsavel.includes(val) && !respCounts[val]) {
          respCounts[val] = 0;
        }
      }

      // 8. Tipo de Projeto
      if (r['Tipo de Projeto']) {
        const val = r['Tipo de Projeto'].trim();
        if (matchesFilterSubset(r, 'TIPO_PROJETO')) {
          projCounts[val] = (projCounts[val] || 0) + 1;
        } else if (filterTipoProjeto.includes(val) && !projCounts[val]) {
          projCounts[val] = 0;
        }
      }
    });

    // Ensure configured segmentations are present
    (segmentacoes['STATUS DE OBRA'] || []).forEach((st) => {
      if (stInfCounts[st] === undefined && filterStatusInforme.includes(st)) {
        stInfCounts[st] = 0;
      }
    });
    (segmentacoes['RESP.'] || []).forEach((resp) => {
      if (respCounts[resp] === undefined && filterResponsavel.includes(resp)) {
        respCounts[resp] = 0;
      }
    });

    const sortNumericOrAlpha = (arr: string[]) => {
      return [...arr].sort((a, b) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });
    };

    return {
      regionalOptions: Object.keys(regCounts).sort(),
      regionalCounts: regCounts,
      ufOptions: Object.keys(uCounts).sort(),
      ufCounts: uCounts,
      carteiraOptions: Object.keys(cartCounts).sort(),
      carteiraCounts: cartCounts,
      agingOptions: sortNumericOrAlpha(Object.keys(agCounts)),
      agingCounts: agCounts,
      statusAtualOptions: Object.keys(stAtualCounts).sort(),
      statusAtualCounts: stAtualCounts,
      statusInformeOptions: Object.keys(stInfCounts).sort(),
      statusInformeCounts: stInfCounts,
      responsavelOptions: Object.keys(respCounts).sort(),
      responsavelCounts: respCounts,
      tipoProjetoOptions: Object.keys(projCounts).sort(),
      tipoProjetoCounts: projCounts,
    };
  }, [
    registros,
    segmentacoes,
    searchDC,
    filterRegional,
    filterUF,
    filterCarteira,
    filterAging,
    filterStatusAtual,
    filterStatusInforme,
    filterResponsavel,
    filterTipoProjeto,
  ]);

  // Filter Registros (Search in DC or Descricao + 8 Multiselects)
  const filteredRegistros = useMemo(() => {
    return registros.filter((item) => matchesFilterSubset(item));
  }, [
    registros,
    searchDC,
    filterRegional,
    filterUF,
    filterCarteira,
    filterAging,
    filterStatusAtual,
    filterStatusInforme,
    filterResponsavel,
    filterTipoProjeto,
  ]);

  // Calculate Summary Totals from filtered rows
  const { totalOrcamento, totalParcial, totalFinal, totalMedidoTotal } = useMemo(() => {
    let orc = 0;
    let parc = 0;
    let fin = 0;

    filteredRegistros.forEach((r) => {
      orc += parseCurrencyValue(r.Orçamento);
      parc += parseCurrencyValue(r['Valor Parcial R$']);
      fin += parseCurrencyValue(r['Valor Final R$']);
    });

    return {
      totalOrcamento: formatBRL(orc),
      totalParcial: formatBRL(parc),
      totalFinal: formatBRL(fin),
      totalMedidoTotal: formatBRL(parc + fin),
    };
  }, [filteredRegistros]);

  // Sort Registros
  const sortedRegistros = useMemo(() => {
    const list = [...filteredRegistros];
    if (!sortColumn) return list;

    list.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortColumn === 'TIPO (Cateira)' || sortColumn === 'TIPO (CARTEIRA)') {
        valA = getRegistroCarteira(a).toLowerCase();
        valB = getRegistroCarteira(b).toLowerCase();
      } else {
        valA = ((a as any)[sortColumn] || '').toString().toLowerCase();
        valB = ((b as any)[sortColumn] || '').toString().toLowerCase();
      }

      // Numeric comparison
      const numA = parseFloat(valA.replace(/[^\d.-]/g, ''));
      const numB = parseFloat(valB.replace(/[^\d.-]/g, ''));
      if (!isNaN(numA) && !isNaN(numB) && !valA.includes('/') && !valB.includes('/')) {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [filteredRegistros, sortColumn, sortDirection]);

  // Paginated Slices
  const totalPages = Math.max(1, Math.ceil(sortedRegistros.length / rowsPerPage));
  const paginatedRegistros = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedRegistros.slice(start, start + rowsPerPage);
  }, [sortedRegistros, currentPage, rowsPerPage]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const handleOpenEdit = (reg: Registro) => {
    setSelectedRegistro(reg);
    setIsModalOpen(true);
  };

  const handleOpenHistory = (dc: string) => {
    setHistoryDc(dc);
  };

  const clearAllFilters = () => {
    setSearchDC('');
    setFilterRegional([]);
    setFilterUF([]);
    setFilterCarteira([]);
    setFilterAging([]);
    setFilterStatusAtual([]);
    setFilterStatusInforme([]);
    setFilterResponsavel([]);
    setFilterTipoProjeto([]);
    setCurrentPage(1);
  };

  const activeFiltersCount =
    (searchDC ? 1 : 0) +
    filterRegional.length +
    filterUF.length +
    filterCarteira.length +
    filterAging.length +
    filterStatusAtual.length +
    filterStatusInforme.length +
    filterResponsavel.length +
    filterTipoProjeto.length;

  // Status badge styling helper
  const getStatusBadgeClass = (status?: string) => {
    const st = (status || '').toUpperCase();
    if (st.includes('CONCLUÍDO') || st.includes('APROVAD') || st === 'OK') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold';
    }
    if (st.includes('EXECUÇÃO') || st.includes('ANDAMENTO')) {
      return 'bg-blue-50 text-blue-700 border-blue-300 font-bold';
    }
    if (st.includes('PARALISAD') || st.includes('CANCELAD') || st.includes('FALTA')) {
      return 'bg-red-50 text-red-700 border-red-300 font-bold';
    }
    if (st.includes('PENDÊNCIA') || st.includes('AVALIAR') || st.includes('AGUARD')) {
      return 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
    }
    return 'bg-slate-100 text-slate-700 border-slate-300 font-medium';
  };

  // Separation of columns:
  // 1. Base Matriz Imported Columns (All Bloco 1 except DC which is sticky)
  const baseMatrizColumns = BLOCO_1_KEYS.filter((k) => k !== 'DC');

  // 2. Team Editable Columns (All Bloco 2)
  const equipeEditableColumns = BLOCO_2_KEYS;

  // Measure column widths from the original thead so the sticky header aligns 100%
  const measureColumns = useCallback(() => {
    if (!originalTheadRef.current || !tableContainerRef.current) return;
    const ths = originalTheadRef.current.querySelectorAll('th');
    if (ths.length === 0) return;
    const widths: number[] = [];
    ths.forEach((th) => {
      widths.push(th.getBoundingClientRect().width);
    });
    setColumnWidths(widths);

    const tableEl = tableContainerRef.current.querySelector('table');
    if (tableEl) {
      setTableWidth(tableEl.getBoundingClientRect().width);
    }
  }, []);

  // Update sticky state on window scroll & window resize
  const updateStickyState = useCallback(() => {
    if (!tableContainerRef.current) return;
    const headerEl = document.querySelector('header');
    const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 78;
    const containerRect = tableContainerRef.current.getBoundingClientRect();

    setStickyTop(headerBottom);
    setTableRect({ left: containerRect.left, width: containerRect.width });

    // Table header should stick when top of table scrolls past headerBottom
    // and bottom of table is still below headerBottom + 60px
    const shouldStick = containerRect.top <= headerBottom && containerRect.bottom > (headerBottom + 60);
    setIsSticky(shouldStick);

    // Sync horizontal scroll
    if (floatingHeaderScrollRef.current && tableContainerRef.current) {
      floatingHeaderScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  }, []);

  useEffect(() => {
    measureColumns();
  }, [measureColumns, sortedRegistros, freezeDcColumn]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateStickyState();
          ticking = false;
        });
        ticking = true;
      }
    };

    const onResize = () => {
      measureColumns();
      updateStickyState();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    let ro: ResizeObserver | null = null;
    if (tableContainerRef.current && typeof window !== 'undefined' && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => {
        measureColumns();
        updateStickyState();
      });
      ro.observe(tableContainerRef.current);
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
    };
  }, [measureColumns, updateStickyState]);

  const handleHorizontalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    if (floatingHeaderScrollRef.current && floatingHeaderScrollRef.current.scrollLeft !== scrollLeft) {
      floatingHeaderScrollRef.current.scrollLeft = scrollLeft;
    }
  };

  const handleFloatingScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    if (tableContainerRef.current && tableContainerRef.current.scrollLeft !== scrollLeft) {
      tableContainerRef.current.scrollLeft = scrollLeft;
    }
  };

  // Render header row for both the natural thead and the floating sticky header
  const renderHeaderRow = (isFloating: boolean = false) => {
    let colIndex = 0;
    const getColStyle = () => {
      const idx = colIndex++;
      if (isFloating && columnWidths[idx]) {
        const w = `${columnWidths[idx]}px`;
        return { width: w, minWidth: w, maxWidth: w };
      }
      return undefined;
    };

    return (
      <tr className="text-white text-[11px] font-bold uppercase tracking-wider">
        {/* Sticky Action Column */}
        <th
          style={getColStyle()}
          className="py-2 px-2.5 bg-[#001e40] border-r border-slate-700 sticky left-0 z-30 min-w-[80px] text-center"
        >
          Ações
        </th>

        {/* Sticky / Regular DC Identifier */}
        <th
          style={getColStyle()}
          onClick={() => handleSort('DC')}
          className={`py-2 px-3 bg-[#001e40] border-r border-slate-700 z-30 min-w-[130px] cursor-pointer hover:bg-[#00142b] transition-colors ${
            freezeDcColumn
              ? 'sticky left-[80px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]'
              : ''
          }`}
        >
          <div className="flex items-center justify-between space-x-1.5">
            <span className="flex items-center space-x-1 text-cyan-300 font-extrabold">
              <span>DC</span>
              {freezeDcColumn && <Pin className="w-3 h-3 text-cyan-400 rotate-45" />}
            </span>
            {sortColumn === 'DC' ? (
              sortDirection === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
            )}
          </div>
        </th>

        {/* --- GROUP 1: ALL IMPORTED BASE MATRIZ COLUMNS (First - Read-only) --- */}
        {baseMatrizColumns.map((colKey) => {
          const isSorted = sortColumn === colKey;
          return (
            <th
              key={colKey}
              style={getColStyle()}
              onClick={() => handleSort(colKey)}
              className={`py-2 px-3 bg-[#002855] hover:bg-[#002046] transition-colors border-r border-slate-700/80 whitespace-nowrap min-w-[110px] cursor-pointer ${
                colKey === 'REG' || colKey === 'UF' || colKey === 'AGING'
                  ? 'min-w-[80px]'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between space-x-1.5">
                <span className="truncate text-slate-100">
                  {colKey === 'TIPO (Cateira)' ? 'TIPO (CARTEIRA)' : colKey}
                </span>
                {isSorted ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-emerald-400 shrink-0" />
                  )
                ) : (
                  <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 shrink-0 opacity-60" />
                )}
              </div>
            </th>
          );
        })}

        {/* --- GROUP 2: ALL TEAM EDITABLE COLUMNS (Centered) --- */}
        {equipeEditableColumns.map((colKey) => {
          const isSorted = sortColumn === colKey;
          return (
            <th
              key={colKey}
              style={getColStyle()}
              onClick={() => handleSort(colKey)}
              className="py-2 px-3 bg-[#003875] hover:bg-[#002f66] transition-colors border-r border-slate-700/80 whitespace-nowrap min-w-[130px] cursor-pointer text-cyan-100 font-bold text-center"
            >
              <div className="flex items-center justify-center space-x-1.5">
                <span className="truncate">{colKey}</span>
                {isSorted ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="w-3 h-3 text-cyan-300 shrink-0" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-cyan-300 shrink-0" />
                  )
                ) : (
                  <ArrowUpDown className="w-2.5 h-2.5 text-cyan-400/60 shrink-0 opacity-60" />
                )}
              </div>
            </th>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="space-y-2.5 font-sans">
      {/* Toast Informativo de Download Automático ADM */}
      {autoExportMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1 select-none">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{autoExportMessage}</span>
          </div>
          <button
            onClick={clearAutoExportMessage}
            className="text-emerald-700 hover:text-emerald-950 p-1 rounded-md hover:bg-emerald-200/50 cursor-pointer transition-colors"
            title="Fechar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header de Resumo & Ações (Linha Única Compacta: Resumo + Matriz + Auditoria + Exportar + Toggle Filtros) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-600 shadow-2xs">
        {/* Esquerda: Total de Obras + Matriz + Sync */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shrink-0" />
            <span>
              {registros.length > 0 ? (
                <>
                  <strong className="text-slate-900 font-bold">
                    {registros.length.toLocaleString('pt-BR')}
                  </strong>{' '}
                  obras registradas
                </>
              ) : (
                'Nenhuma importação da BASE realizada'
              )}
            </span>
          </div>

          {lastImportInfo && (
            <div className="flex items-center space-x-1 px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-[10px]">
              <Database className="w-3 h-3 text-[#1a56db] shrink-0" />
              <span>
                Última Matriz:{' '}
                <strong className="text-slate-900 font-semibold">
                  {lastImportInfo.dataHoraFormatada}
                </strong>
              </span>
            </div>
          )}

          {loadingRegistros && (
            <div className="flex items-center space-x-1 text-slate-500 text-[10px]">
              <RefreshCw className="w-3 h-3 animate-spin text-[#002855]" />
              <span>Sincronizando...</span>
            </div>
          )}

          {isAdmin && registros.length === 0 && (
            <button
              onClick={popularDadosExemplo}
              className="text-[#002855] hover:text-cyan-700 font-bold flex items-center space-x-1 cursor-pointer text-[11px]"
            >
              <Sparkles className="w-3 h-3 text-cyan-600" />
              <span>Carregar Base Demonstrativa</span>
            </button>
          )}

          <button
            onClick={() => refreshRegistros()}
            title="Atualizar lista"
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Direita: Auto ADM + Auditoria + Exportar Excel + Botão Retrátil de Filtros */}
        <div className="flex items-center space-x-2">
          {/* Status dos Downloads Automáticos ADM (08:15 e 16:00) */}
          {isAdmin && (
            <div
              className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/90 rounded-lg text-[11px] text-slate-600 select-none shadow-2xs"
              title="Downloads automáticos diários da aba Registros para ADM nos horários 08:15 e 16:00 (horário local)"
            >
              <Clock className="w-3 h-3 text-cyan-700 shrink-0" />
              <span className="font-semibold text-slate-700">Auto ADM:</span>
              <span
                className={`flex items-center space-x-0.5 font-bold ${
                  hasExported0815 ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                <span>08:15</span>
                <span>{hasExported0815 ? '✓' : '⏳'}</span>
              </span>
              <span className="text-slate-300">|</span>
              <span
                className={`flex items-center space-x-0.5 font-bold ${
                  hasExported1600 ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                <span>16:00</span>
                <span>{hasExported1600 ? '✓' : '⏳'}</span>
              </span>
            </div>
          )}
          {/* Botão Auditoria */}
          <div className="flex items-center space-x-1">
            <button
              id="btn-export-audit"
              onClick={async () => {
                try {
                  setIsExportingAudit(true);
                  await exportarAuditoriaGeral(1000);
                } finally {
                  setIsExportingAudit(false);
                }
              }}
              disabled={isExportingAudit}
              title="Exportar relatório de histórico e auditoria de edições"
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-[#002855] border border-slate-300 rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
            >
              {isExportingAudit ? (
                <RefreshCw className="w-3 h-3 text-cyan-600 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600" />
              )}
              <span>{isExportingAudit ? 'Gerando...' : 'Auditoria'}</span>
            </button>

            {isAdmin && (
              <button
                id="btn-archive-history"
                onClick={async () => {
                  if (
                    window.confirm(
                      'Deseja exportar e arquivar o histórico de auditoria com mais de 90 dias?\n\nIsso baixará uma planilha Excel de backup e liberará espaço no banco de dados Firestore.'
                    )
                  ) {
                    try {
                      setIsExportingAudit(true);
                      const res = await arquivarELimparHistorico(90);
                      alert(`Histórico arquivado com sucesso!\nItens exportados e liberados do Firestore: ${res.removidos}`);
                    } catch (e: any) {
                      alert('Erro ao arquivar histórico: ' + e?.message);
                    } finally {
                      setIsExportingAudit(false);
                    }
                  }
                }}
                disabled={isExportingAudit}
                title="Arquivar e limpar histórico com mais de 90 dias (baixa backup Excel e libera espaço no Firestore)"
                className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold shadow-2xs transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                <Archive className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden xl:inline">Arquivar &gt;90d</span>
              </button>
            )}
          </div>

          {/* Botão Exportar Excel */}
          <button
            id="btn-export-excel"
            onClick={() => exportarRegistrosParaExcel(filteredRegistros, 'VTAL_OBRAS_Export')}
            disabled={filteredRegistros.length === 0}
            className="px-3 py-1 bg-[#002855] hover:bg-[#001e40] text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer border border-[#002855]"
            title="Exportar registros filtrados para Excel"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Exportar Excel</span>
          </button>

          {/* Botão Retrátil de Filtros */}
          <button
            type="button"
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 border cursor-pointer ${
              isFiltersExpanded
                ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                : 'bg-cyan-50 text-[#002855] border-cyan-300 hover:bg-cyan-100'
            }`}
            title={isFiltersExpanded ? 'Ocultar painel de filtros para ganhar espaço' : 'Expandir painel de filtros'}
          >
            <Filter className="w-3.5 h-3.5 text-cyan-700" />
            <span>{isFiltersExpanded ? 'Recolher Filtros' : 'Filtros'}</span>
            {activeFiltersCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-cyan-700 text-white rounded-full text-[10px] font-bold">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isFiltersExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2. Painel Retrátil de Busca e 8 Filtros (Compacto e Responsivo) */}
      {isFiltersExpanded && (
        <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-200/90 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2 items-end">
            {/* Campo de Busca por DC ou Descrição */}
            <div className="xl:col-span-1">
              <label className="block text-[10px] font-bold text-slate-700 tracking-tight mb-0.5 truncate leading-tight">
                Buscar DC/Descrição
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </div>
                <input
                  id="input-search-dc"
                  type="text"
                  value={searchDC}
                  onChange={(e) => {
                    setSearchDC(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar..."
                  className="block w-full pl-8 pr-6 py-1 bg-slate-50/70 border border-slate-300 rounded-md text-[11px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002855] transition-all shadow-2xs h-[28px]"
                />
                {searchDC && (
                  <button
                    onClick={() => {
                      setSearchDC('');
                      setCurrentPage(1);
                    }}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* 1. Regional -> Coluna REG */}
            <MultiSelectFilter
              label="Regional"
              columnRefName="REG"
              options={regionalOptions}
              selected={filterRegional}
              onChange={(sel) => {
                setFilterRegional(sel);
                setCurrentPage(1);
              }}
              optionCounts={regionalCounts}
              placeholder="Todas"
            />

            {/* 2. UF -> Coluna UF */}
            <MultiSelectFilter
              label="UF"
              columnRefName="UF"
              options={ufOptions}
              selected={filterUF}
              onChange={(sel) => {
                setFilterUF(sel);
                setCurrentPage(1);
              }}
              optionCounts={ufCounts}
              placeholder="Todas"
            />

            {/* 3. Carteira -> Coluna TIPO (CARTEIRA) */}
            <MultiSelectFilter
              label="Carteira"
              columnRefName="TIPO (CARTEIRA)"
              options={carteiraOptions}
              selected={filterCarteira}
              onChange={(sel) => {
                setFilterCarteira(sel);
                setCurrentPage(1);
              }}
              optionCounts={carteiraCounts}
              placeholder="Todas"
            />

            {/* 4. AGING -> Coluna AGING */}
            <MultiSelectFilter
              label="AGING"
              columnRefName="AGING"
              options={agingOptions}
              selected={filterAging}
              onChange={(sel) => {
                setFilterAging(sel);
                setCurrentPage(1);
              }}
              optionCounts={agingCounts}
              placeholder="Todos"
            />

            {/* 5. Status da DC (Atual) -> Coluna Status da DC (Atual) */}
            <MultiSelectFilter
              label="Status DC"
              columnRefName="Atual"
              options={statusAtualOptions}
              selected={filterStatusAtual}
              onChange={(sel) => {
                setFilterStatusAtual(sel);
                setCurrentPage(1);
              }}
              optionCounts={statusAtualCounts}
              placeholder="Todos"
            />

            {/* 6. Status Informe (Campo) -> Coluna Status Informe (Campo) */}
            <MultiSelectFilter
              label="Status Informe"
              columnRefName="Campo"
              options={statusInformeOptions}
              selected={filterStatusInforme}
              onChange={(sel) => {
                setFilterStatusInforme(sel);
                setCurrentPage(1);
              }}
              optionCounts={statusInformeCounts}
              placeholder="Todos"
            />

            {/* 7. Responsável -> Coluna Responsavel */}
            <MultiSelectFilter
              label="Responsável"
              columnRefName="Área"
              options={responsavelOptions}
              selected={filterResponsavel}
              onChange={(sel) => {
                setFilterResponsavel(sel);
                setCurrentPage(1);
              }}
              optionCounts={responsavelCounts}
              placeholder="Todos"
            />

            {/* 8. Tipo de Projeto -> Coluna Tipo de Projeto */}
            <MultiSelectFilter
              label="Tipo Projeto"
              columnRefName="Projeto"
              options={tipoProjetoOptions}
              selected={filterTipoProjeto}
              onChange={(sel) => {
                setFilterTipoProjeto(sel);
                setCurrentPage(1);
              }}
              optionCounts={tipoProjetoCounts}
              placeholder="Todos"
            />
          </div>
        </div>
      )}

      {/* 3. Linha Única de Indicadores & Legendas (Accordion / Retrátil) */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1.5 bg-slate-50/90 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 shadow-2xs">
        {/* Esquerda: Exibindo X obras + KPIs em formato horizontal */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <span className="font-semibold text-slate-800">
            Exibindo <strong className="text-[#002855] font-extrabold">{filteredRegistros.length.toLocaleString('pt-BR')}</strong> obras
          </span>

          {isIndicatorsExpanded ? (
            <>
              <span className="text-slate-300">•</span>
              <span>
                Orçamento: <strong className="text-slate-900 font-bold">{totalOrcamento}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Med. Parcial: <strong className="text-emerald-700 font-bold">{totalParcial}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Med. Final: <strong className="text-emerald-700 font-bold">{totalFinal}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Total Medido: <strong className="text-cyan-800 font-extrabold">{totalMedidoTotal}</strong>
              </span>
            </>
          ) : (
            <>
              <span className="text-slate-300">•</span>
              <span>
                Total Medido: <strong className="text-cyan-800 font-extrabold">{totalMedidoTotal}</strong>
              </span>
            </>
          )}

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="ml-1 inline-flex items-center space-x-1 px-1.5 py-0.2 rounded bg-red-50 text-red-700 hover:bg-red-100 text-[10px] font-bold transition-colors cursor-pointer border border-red-200"
              title="Limpar todos os filtros aplicados"
            >
              <X className="w-2.5 h-2.5" />
              <span>Limpar {activeFiltersCount}</span>
            </button>
          )}
        </div>

        {/* Direita: Tags de Legenda + DC Congelado + Toggle Indicadores */}
        <div className="flex items-center space-x-2 shrink-0 text-[10px]">
          <div className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Base: Leitura</span>
          </div>

          <div className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
            <span>Equipe: Edição</span>
          </div>

          <button
            type="button"
            onClick={() => setFreezeDcColumn(!freezeDcColumn)}
            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded font-semibold shadow-2xs transition-colors cursor-pointer ${
              freezeDcColumn
                ? 'bg-[#002855] text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
            }`}
            title={
              freezeDcColumn
                ? 'Coluna DC está congelada (clique para descongelar)'
                : 'Clique para congelar a coluna DC'
            }
          >
            <Pin className="w-2.5 h-2.5 text-cyan-400 rotate-45" />
            <span>{freezeDcColumn ? 'DC Congelado' : 'Congelar DC'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsIndicatorsExpanded(!isIndicatorsExpanded)}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-colors cursor-pointer"
            title={isIndicatorsExpanded ? 'Recolher métricas de valores' : 'Expandir todas as métricas de valores'}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isIndicatorsExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Floating Sticky Header (Ativado na rolagem vertical da página para manter cabeçalho fixo) */}
      {isSticky && (
        <div
          id="floating-sticky-header"
          style={{
            position: 'fixed',
            top: `${stickyTop}px`,
            left: `${tableRect.left}px`,
            width: `${tableRect.width}px`,
            zIndex: 35,
          }}
          className="overflow-hidden bg-[#001e40] shadow-md border-b border-slate-700 select-none rounded-t-xl"
        >
          <div
            ref={floatingHeaderScrollRef}
            onScroll={handleFloatingScroll}
            className="overflow-x-hidden"
          >
            <table
              style={{
                width: tableWidth > 0 ? `${tableWidth}px` : '100%',
                minWidth: tableWidth > 0 ? `${tableWidth}px` : '100%',
              }}
              className="text-left text-xs border-collapse"
            >
              <thead>{renderHeaderRow(true)}</thead>
            </table>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden relative">
        {/* Scrollable Data Table - Rolagem Horizontal preservada, rolagem vertical conduzida pela página */}
        <div
          ref={tableContainerRef}
          onScroll={handleHorizontalScroll}
          className="overflow-x-auto relative custom-scrollbar"
        >
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header original */}
            <thead ref={originalTheadRef} className="select-none">
              {renderHeaderRow(false)}
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200/80 bg-white">
              {paginatedRegistros.length === 0 ? (
                <tr>
                  <td
                    colSpan={ALL_COLUMNS.length + 1}
                    className="py-14 text-center text-slate-500 bg-slate-50/50"
                  >
                    <Database className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-slate-700">Nenhum registro encontrado</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {searchDC || activeFiltersCount > 0
                        ? 'Nenhuma DC corresponde aos filtros selecionados. Tente ajustar os parâmetros de busca.'
                        : 'Utilize a aba Importação para enviar a planilha matriz ou adicione dados demonstrativos.'}
                    </p>
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="mt-3 px-3 py-1.5 bg-[#002855] text-white rounded-lg text-xs font-bold hover:bg-[#001e40] transition-colors"
                      >
                        Limpar todos os filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedRegistros.map((item, idx) => (
                  <tr
                    key={`${item.DC || 'dc'}_${idx}`}
                    className="hover:bg-slate-50/90 transition-colors group"
                  >
                    {/* Sticky Action Column - Reduced Edit Button + History Button */}
                    <td
                      className="py-2 px-2 sticky left-0 z-20 bg-white group-hover:bg-slate-50 border-r border-slate-200 text-center shadow-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg bg-[#002855] hover:bg-[#001e40] text-cyan-300 hover:text-white shadow-2xs transition-all cursor-pointer"
                          title="Editar colunas da equipe"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenHistory(item.DC)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs transition-all cursor-pointer"
                          title="Ver histórico de edições desta DC"
                        >
                          <History className="w-3.5 h-3.5 text-[#1a56db]" />
                        </button>
                      </div>
                    </td>

                    {/* Sticky / Regular DC Identifier Column */}
                    <td
                      className={`py-2 px-3 font-extrabold text-[#002855] bg-white group-hover:bg-slate-50 border-r border-slate-200 whitespace-nowrap select-text ${
                        freezeDcColumn
                          ? 'sticky left-[80px] z-20 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]'
                          : 'z-10'
                      }`}
                    >
                      {item.DC}
                    </td>

                    {/* 1. ALL BASE MATRIZ (IMPORTED) VALUES - Read-only (Non-clickable) */}
                    {baseMatrizColumns.map((colKey) => {
                      const val = colKey === 'TIPO (Cateira)' ? getRegistroCarteira(item) : (item as any)[colKey];

                      // Status da DC (Atual) - Clean neutral rendering
                      if (colKey === 'Status da DC (Atual)') {
                        return (
                          <td
                            key={colKey}
                            className="py-2 px-3 border-r border-slate-100 font-medium text-slate-700 whitespace-nowrap bg-slate-50/30 cursor-default select-text"
                            title={val}
                          >
                            {val || <span className="text-slate-300">—</span>}
                          </td>
                        );
                      }

                      // Regional & UF
                      if (colKey === 'REG' || colKey === 'UF') {
                        return (
                          <td
                            key={colKey}
                            className="py-2 px-3 border-r border-slate-100 font-semibold text-slate-800 whitespace-nowrap bg-slate-50/30 cursor-default select-text"
                          >
                            {val || <span className="text-slate-300">—</span>}
                          </td>
                        );
                      }

                      // AGING
                      if (colKey === 'AGING') {
                        const num = parseInt(val, 10);
                        const isHigh = !isNaN(num) && num > 30;
                        return (
                          <td
                            key={colKey}
                            className="py-2 px-3 border-r border-slate-100 whitespace-nowrap bg-slate-50/30 cursor-default select-text"
                          >
                            {val ? (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                  isHigh
                                    ? 'bg-amber-100 text-amber-800 font-extrabold'
                                    : 'text-slate-700'
                                }`}
                              >
                                {val}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      }

                      // Standard Base Matriz cell
                      return (
                        <td
                          key={colKey}
                          className="py-2 px-3 border-r border-slate-100 text-slate-600 whitespace-nowrap max-w-xs truncate bg-slate-50/20 cursor-default select-text"
                          title={val}
                        >
                          {val || <span className="text-slate-300">—</span>}
                        </td>
                      );
                    })}

                    {/* 2. ALL TEAM EDITABLE VALUES - Clickable, Centered, Highlights on Hover */}
                    {equipeEditableColumns.map((colKey) => {
                      const val = (item as any)[colKey];

                      // Status Informe (Campo) Badge
                      if (colKey === 'Status Informe (Campo)') {
                        return (
                          <td
                            key={colKey}
                            onClick={() => handleOpenEdit(item)}
                            className="py-2 px-3 border-r border-slate-100 whitespace-nowrap bg-blue-50/20 text-center cursor-pointer hover:bg-blue-100/50 transition-colors"
                            title="Clique para editar este registro"
                          >
                            {val ? (
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border shadow-2xs ${getStatusBadgeClass(
                                  val
                                )}`}
                              >
                                {val}
                              </span>
                            ) : (
                              <span className="text-slate-300 italic text-[10px]">Não informado</span>
                            )}
                          </td>
                        );
                      }

                      // Resp.Medição & Responsavel
                      if (colKey === 'Resp.Medição' || colKey === 'Responsavel') {
                        return (
                          <td
                            key={colKey}
                            onClick={() => handleOpenEdit(item)}
                            className="py-2 px-3 border-r border-slate-100 font-bold text-slate-800 whitespace-nowrap bg-blue-50/20 text-center cursor-pointer hover:bg-blue-100/50 transition-colors"
                            title="Clique para editar este registro"
                          >
                            {val || <span className="text-slate-300">—</span>}
                          </td>
                        );
                      }

                      // OBS (Medição)
                      if (colKey === 'OBS (Medição)') {
                        return (
                          <td
                            key={colKey}
                            onClick={() => handleOpenEdit(item)}
                            className="py-2 px-3 border-r border-slate-100 text-slate-700 max-w-xs truncate bg-blue-50/20 text-center cursor-pointer hover:bg-blue-100/50 transition-colors"
                            title={val || 'Clique para adicionar observação'}
                          >
                            {val || <span className="text-slate-300">—</span>}
                          </td>
                        );
                      }

                      // Other team editable fields (Pendências, Datas, etc.)
                      return (
                        <td
                          key={colKey}
                          onClick={() => handleOpenEdit(item)}
                          className="py-2 px-3 border-r border-slate-100 text-slate-700 whitespace-nowrap bg-blue-50/20 text-center cursor-pointer hover:bg-blue-100/50 transition-colors"
                          title="Clique para editar este registro"
                        >
                          {val ? (
                            <span className="font-medium text-[11px]">{val}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Bottom Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Row count info */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-slate-600">
              <span className="text-[11px]">Linhas por página:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setRowsPerPage(val);
                  try {
                    localStorage.setItem('vtal_registros_rows_per_page', String(val));
                  } catch (err) {
                    // ignore
                  }
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002855]"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>

            <span className="text-slate-300">|</span>

            <span className="text-slate-600 font-medium">
              Mostrando{' '}
              <strong className="text-slate-900 font-bold">
                {paginatedRegistros.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}
              </strong>{' '}
              a{' '}
              <strong className="text-slate-900 font-bold">
                {Math.min(currentPage * rowsPerPage, sortedRegistros.length)}
              </strong>{' '}
              de{' '}
              <strong className="text-slate-900 font-bold">
                {sortedRegistros.length.toLocaleString('pt-BR')}
              </strong>{' '}
              registros
            </span>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
              title="Primeira Página"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
              title="Página Anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-3 py-1 font-bold text-slate-800 text-xs bg-white border border-slate-200 rounded-lg shadow-2xs">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
              title="Próxima Página"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors cursor-pointer"
              title="Última Página"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit / View Modal */}
      <RegistroEditModal
        registro={selectedRegistro}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRegistro(null);
        }}
      />

      {/* History Modal */}
      {historyDc && (
        <HistoricoModal
          dc={historyDc}
          isOpen={!!historyDc}
          onClose={() => setHistoryDc(null)}
        />
      )}
    </div>
  );
};
