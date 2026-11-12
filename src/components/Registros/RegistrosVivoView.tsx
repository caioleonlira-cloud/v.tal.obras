import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  RegistroVivo,
  VIVO_BLOCO_1_KEYS,
  VIVO_BLOCO_2_KEYS,
  RegistrosVivoFilterPayload,
  isValidVivoID,
  VIVO_BLANK_LABEL,
  isVivoBlank,
  getVivoDisplayOrBlank,
} from '../../types';
import { exportarRegistrosVivoParaExcel } from '../../utils/excel';
import { parseCurrencyValue, formatBRL } from '../../utils/currency';
import { MultiSelectFilter } from './MultiSelectFilter';
import { ColumnVisibilityDropdown } from './ColumnVisibilityDropdown';
import { RegistroVivoEditModal } from './RegistroVivoEditModal';
import {
  Search,
  Download,
  Edit3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Database,
  Pin,
  Filter,
  ChevronDown,
  EyeOff,
} from 'lucide-react';

export interface RegistrosVivoViewProps {
  initialFilters?: RegistrosVivoFilterPayload | null;
  onClearInitialFilters?: () => void;
}

export const RegistrosVivoView: React.FC<RegistrosVivoViewProps> = ({
  initialFilters,
  onClearInitialFilters,
}) => {
  const { user, profile } = useAuth();
  const {
    registrosVivo,
    lastImportInfoVivo,
    subscribeVivoData,
  } = useData();

  // Lazy subscription: only keep Firestore listener active while this view is mounted
  useEffect(() => {
    const unsubscribe = subscribeVivoData();
    return () => {
      unsubscribe();
    };
  }, [subscribeVivoData]);

  // Search input: ID or Desc.
  const [searchID, setSearchID] = useState('');

  // Multi-select filters
  const [filterREF, setFilterREF] = useState<string[]>([]);
  const [filterAno, setFilterAno] = useState<string[]>([]);
  const [filterREG, setFilterREG] = useState<string[]>([]);
  const [filterUF, setFilterUF] = useState<string[]>([]);
  const [filterStatusDraft, setFilterStatusDraft] = useState<string[]>([]);
  const [filterStatusMedFinal, setFilterStatusMedFinal] = useState<string[]>([]);
  const [filterStatusImpl, setFilterStatusImpl] = useState<string[]>([]);
  const [filterRespPendencia, setFilterRespPendencia] = useState<string[]>([]);
  const [filterRespMedicao, setFilterRespMedicao] = useState<string[]>([]);

  // Sorting & Column Freezing
  const [sortColumn, setSortColumn] = useState<string>('ID');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [freezeIdUfColumn, setFreezeIdUfColumn] = useState(true);

  // Table Height Mode (Padrão, Expandida, Máxima)
  const [tableHeightMode, setTableHeightMode] = useState<'padrao' | 'expandida' | 'maxima'>(() => {
    try {
      const saved = localStorage.getItem('vivo_registros_table_height_mode');
      if (saved === 'expandida' || saved === 'maxima' || saved === 'padrao') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'padrao';
  });

  // Filters and Indicators Accordion
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [isIndicatorsExpanded, setIsIndicatorsExpanded] = useState(true);

  // Modal editing
  const [selectedRegistro, setSelectedRegistro] = useState<RegistroVivo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenEdit = useCallback((registro: RegistroVivo) => {
    setSelectedRegistro(registro);
    setIsModalOpen(true);
  }, []);

  // Sync initial filters passed from Dashboard
  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.searchID !== undefined) setSearchID(initialFilters.searchID);
      if (initialFilters.ref !== undefined) setFilterREF(initialFilters.ref);
      if (initialFilters.ano !== undefined) setFilterAno(initialFilters.ano);
      if (initialFilters.reg !== undefined) setFilterREG(initialFilters.reg);
      else if (initialFilters.regional !== undefined) setFilterREG(initialFilters.regional);
      if (initialFilters.uf !== undefined) setFilterUF(initialFilters.uf);
      if (initialFilters.statusDraft !== undefined) setFilterStatusDraft(initialFilters.statusDraft);
      if (initialFilters.statusMedFinal !== undefined) setFilterStatusMedFinal(initialFilters.statusMedFinal);
      if (initialFilters.statusImpl !== undefined) setFilterStatusImpl(initialFilters.statusImpl);
      if (initialFilters.respPendencia !== undefined) setFilterRespPendencia(initialFilters.respPendencia);
      if (initialFilters.respMedicao !== undefined) setFilterRespMedicao(initialFilters.respMedicao);
      if (initialFilters.sortBy) {
        setSortColumn(initialFilters.sortBy);
        if (initialFilters.sortDirection) setSortDirection(initialFilters.sortDirection);
      }
      setIsFiltersExpanded(true);

      if (onClearInitialFilters) {
        onClearInitialFilters();
      }
    }
  }, [initialFilters, onClearInitialFilters]);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Helper filter check
  const matchesFilterSubset = (item: RegistroVivo, excludeKey?: string) => {
    if (!item || !isValidVivoID(item.ID)) return false;

    if (searchID.trim()) {
      const term = searchID.toLowerCase().trim();
      const idVal = (item.ID || '').toLowerCase();
      const descVal = (item['Desc.'] || '').toLowerCase();
      if (!idVal.includes(term) && !descVal.includes(term)) return false;
    }

    if (excludeKey !== 'REF' && filterREF.length > 0) {
      const val = getVivoDisplayOrBlank(item.REF);
      if (!filterREF.includes(val)) return false;
    }
    if (excludeKey !== 'Ano' && filterAno.length > 0) {
      const val = getVivoDisplayOrBlank(item.Ano);
      if (!filterAno.includes(val)) return false;
    }
    if (excludeKey !== 'REG' && filterREG.length > 0) {
      const val = getVivoDisplayOrBlank(item.REG);
      if (!filterREG.includes(val)) return false;
    }
    if (excludeKey !== 'UF' && filterUF.length > 0) {
      const val = getVivoDisplayOrBlank(item.UF);
      if (!filterUF.includes(val)) return false;
    }
    if (excludeKey !== 'Status Draft' && filterStatusDraft.length > 0) {
      const val = getVivoDisplayOrBlank(item['Status Draft']);
      if (!filterStatusDraft.includes(val)) return false;
    }
    if (excludeKey !== 'Status Medição Final' && filterStatusMedFinal.length > 0) {
      const val = getVivoDisplayOrBlank(item['Status Medição Final']);
      if (!filterStatusMedFinal.includes(val)) return false;
    }
    if (excludeKey !== 'STATUS IMPL' && filterStatusImpl.length > 0) {
      const val = getVivoDisplayOrBlank(item['STATUS IMPL']);
      if (!filterStatusImpl.includes(val)) return false;
    }
    if (excludeKey !== 'RESPONSÁVEL PENDENCIA' && filterRespPendencia.length > 0) {
      const val = getVivoDisplayOrBlank(item['RESPONSÁVEL PENDENCIA']);
      if (!filterRespPendencia.includes(val)) return false;
    }
    if (excludeKey !== 'RESPONSÁVEL MEDIÇÃO' && filterRespMedicao.length > 0) {
      const val = getVivoDisplayOrBlank(item['RESPONSÁVEL MEDIÇÃO']);
      if (!filterRespMedicao.includes(val)) return false;
    }

    return true;
  };

  // Derive filter options & counts
  const {
    refOptions,
    refCounts,
    anoOptions,
    anoCounts,
    regOptions,
    regCounts,
    ufOptions,
    ufCounts,
    statusDraftOptions,
    statusDraftCounts,
    statusMedFinalOptions,
    statusMedFinalCounts,
    statusImplOptions,
    statusImplCounts,
    respPendenciaOptions,
    respPendenciaCounts,
    respMedicaoOptions,
    respMedicaoCounts,
  } = useMemo(() => {
    const cRef: Record<string, number> = {};
    const cAno: Record<string, number> = {};
    const cReg: Record<string, number> = {};
    const cUf: Record<string, number> = {};
    const cDraft: Record<string, number> = {};
    const cMedFin: Record<string, number> = {};
    const cImpl: Record<string, number> = {};
    const cRespPend: Record<string, number> = {};
    const cRespMed: Record<string, number> = {};

    registrosVivo.forEach((r) => {
      if (!r || !isValidVivoID(r.ID)) return;

      const rRef = getVivoDisplayOrBlank(r.REF);
      if (matchesFilterSubset(r, 'REF')) cRef[rRef] = (cRef[rRef] || 0) + 1;

      const rAno = getVivoDisplayOrBlank(r.Ano);
      if (matchesFilterSubset(r, 'Ano')) cAno[rAno] = (cAno[rAno] || 0) + 1;

      const rReg = getVivoDisplayOrBlank(r.REG);
      if (matchesFilterSubset(r, 'REG')) cReg[rReg] = (cReg[rReg] || 0) + 1;

      const rUf = getVivoDisplayOrBlank(r.UF);
      if (matchesFilterSubset(r, 'UF')) cUf[rUf] = (cUf[rUf] || 0) + 1;

      const rDraft = getVivoDisplayOrBlank(r['Status Draft']);
      if (matchesFilterSubset(r, 'Status Draft')) cDraft[rDraft] = (cDraft[rDraft] || 0) + 1;

      const rMedFin = getVivoDisplayOrBlank(r['Status Medição Final']);
      if (matchesFilterSubset(r, 'Status Medição Final')) cMedFin[rMedFin] = (cMedFin[rMedFin] || 0) + 1;

      const rImpl = getVivoDisplayOrBlank(r['STATUS IMPL']);
      if (matchesFilterSubset(r, 'STATUS IMPL')) cImpl[rImpl] = (cImpl[rImpl] || 0) + 1;

      const rRespPend = getVivoDisplayOrBlank(r['RESPONSÁVEL PENDENCIA']);
      if (matchesFilterSubset(r, 'RESPONSÁVEL PENDENCIA')) cRespPend[rRespPend] = (cRespPend[rRespPend] || 0) + 1;

      const rRespMed = getVivoDisplayOrBlank(r['RESPONSÁVEL MEDIÇÃO']);
      if (matchesFilterSubset(r, 'RESPONSÁVEL MEDIÇÃO')) cRespMed[rRespMed] = (cRespMed[rRespMed] || 0) + 1;
    });

    const sortFn = (a: string, b: string) => {
      if (a === VIVO_BLANK_LABEL) return 1;
      if (b === VIVO_BLANK_LABEL) return -1;
      return a.localeCompare(b, 'pt-BR');
    };

    const sortAnoFn = (a: string, b: string) => {
      if (a === VIVO_BLANK_LABEL) return 1;
      if (b === VIVO_BLANK_LABEL) return -1;
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b, 'pt-BR');
    };

    return {
      refOptions: Object.keys(cRef).sort(sortFn),
      refCounts: cRef,
      anoOptions: Object.keys(cAno).sort(sortAnoFn),
      anoCounts: cAno,
      regOptions: Object.keys(cReg).sort(sortFn),
      regCounts: cReg,
      ufOptions: Object.keys(cUf).sort(sortFn),
      ufCounts: cUf,
      statusDraftOptions: Object.keys(cDraft).sort(sortFn),
      statusDraftCounts: cDraft,
      statusMedFinalOptions: Object.keys(cMedFin).sort(sortFn),
      statusMedFinalCounts: cMedFin,
      statusImplOptions: Object.keys(cImpl).sort(sortFn),
      statusImplCounts: cImpl,
      respPendenciaOptions: Object.keys(cRespPend).sort(sortFn),
      respPendenciaCounts: cRespPend,
      respMedicaoOptions: Object.keys(cRespMed).sort(sortFn),
      respMedicaoCounts: cRespMed,
    };
  }, [
    registrosVivo,
    searchID,
    filterREF,
    filterAno,
    filterREG,
    filterUF,
    filterStatusDraft,
    filterStatusMedFinal,
    filterStatusImpl,
    filterRespPendencia,
    filterRespMedicao,
  ]);

  // Filtered dataset
  const filteredRegistrosVivo = useMemo(() => {
    return registrosVivo.filter((item) => matchesFilterSubset(item));
  }, [
    registrosVivo,
    searchID,
    filterREF,
    filterAno,
    filterREG,
    filterUF,
    filterStatusDraft,
    filterStatusMedFinal,
    filterStatusImpl,
    filterRespPendencia,
    filterRespMedicao,
  ]);

  const totalObrasBase = useMemo(() => {
    return registrosVivo.filter((r) => r && isValidVivoID(r.ID)).length;
  }, [registrosVivo]);

  // Indicator Totals
  const { totalOrcamento, totalMedido, totalFaturado } = useMemo(() => {
    let orc = 0;
    let med = 0;
    let fat = 0;

    filteredRegistrosVivo.forEach((r) => {
      orc += parseCurrencyValue(r['OSP ORÇAMENTO']);
      med += parseCurrencyValue(r['OSP MEDIDO']);
      fat += parseCurrencyValue(r['Faturado']);
    });

    return {
      totalOrcamento: formatBRL(orc),
      totalMedido: formatBRL(med),
      totalFaturado: formatBRL(fat),
    };
  }, [filteredRegistrosVivo]);

  // Sorting
  const sortedRegistrosVivo = useMemo(() => {
    const list = [...filteredRegistrosVivo];
    if (!sortColumn) return list;

    list.sort((a, b) => {
      const valA = ((a as any)[sortColumn] || '').toString().toLowerCase();
      const valB = ((b as any)[sortColumn] || '').toString().toLowerCase();

      if (
        sortColumn === 'OSP ORÇAMENTO' ||
        sortColumn === 'OSP MEDIDO' ||
        sortColumn === 'Faturado' ||
        sortColumn === 'Produção Bi R$'
      ) {
        const numA = parseCurrencyValue((a as any)[sortColumn]);
        const numB = parseCurrencyValue((b as any)[sortColumn]);
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

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
  }, [filteredRegistrosVivo, sortColumn, sortDirection]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const clearAllFilters = () => {
    setSearchID('');
    setFilterREF([]);
    setFilterAno([]);
    setFilterREG([]);
    setFilterUF([]);
    setFilterStatusDraft([]);
    setFilterStatusMedFinal([]);
    setFilterStatusImpl([]);
    setFilterRespPendencia([]);
    setFilterRespMedicao([]);
    if (onClearInitialFilters) {
      onClearInitialFilters();
    }
  };

  const activeFiltersCount =
    (searchID ? 1 : 0) +
    filterREF.length +
    filterAno.length +
    filterREG.length +
    filterUF.length +
    filterStatusDraft.length +
    filterStatusMedFinal.length +
    filterStatusImpl.length +
    filterRespPendencia.length +
    filterRespMedicao.length;

  // Status badge styling helper (mesma função da V.TAL)
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

  // Columns partition:
  // Base Leitura: all VIVO_BLOCO_1_KEYS except 'ID' (ID is always positioned right after Ações)
  const baseLeituraColumns = useMemo(() => VIVO_BLOCO_1_KEYS.filter((k) => k !== 'ID'), []);
  const equipeEdicaoColumns = useMemo(() => [...VIVO_BLOCO_2_KEYS], []);

  // Hidden columns persistence
  const userIdentifier = user?.uid || user?.email || profile?.uid || profile?.email || 'default';
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(`vivo_registros_hidden_cols_${userIdentifier}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((k) => typeof k === 'string' && k !== 'ID');
      }
    } catch {
      // ignore
    }
    return [];
  });

  const hiddenColumnsSet = useMemo(() => new Set(hiddenColumns), [hiddenColumns]);

  const updateHiddenColumns = useCallback(
    (newHidden: string[]) => {
      setHiddenColumns(newHidden);
      try {
        localStorage.setItem(`vivo_registros_hidden_cols_${userIdentifier}`, JSON.stringify(newHidden));
      } catch {
        // ignore
      }
    },
    [userIdentifier]
  );

  const visibleBaseColumns = useMemo(() => {
    return baseLeituraColumns.filter((colKey) => !hiddenColumnsSet.has(colKey));
  }, [baseLeituraColumns, hiddenColumnsSet]);

  const isUfVisible = useMemo(() => !hiddenColumnsSet.has('UF'), [hiddenColumnsSet]);

  // When freezeIdUfColumn is active: ID and UF are pinned at left, remaining base columns roll
  const rollingBaseColumns = useMemo(() => {
    return visibleBaseColumns.filter((colKey) => colKey !== 'UF');
  }, [visibleBaseColumns]);

  const visibleEquipeColumns = useMemo(() => {
    return equipeEdicaoColumns.filter((colKey) => !hiddenColumnsSet.has(colKey));
  }, [equipeEdicaoColumns, hiddenColumnsSet]);

  // Dropdown base columns is baseLeituraColumns (already excludes ID)
  const baseColumnsForDropdown = baseLeituraColumns;

  const handleToggleColumn = useCallback(
    (colKey: string) => {
      setHiddenColumns((prev) => {
        const updated = prev.includes(colKey) ? prev.filter((k) => k !== colKey) : [...prev, colKey];
        try {
          localStorage.setItem(`vivo_registros_hidden_cols_${userIdentifier}`, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    },
    [userIdentifier]
  );

  const isBaseGroupHidden = useMemo(
    () => baseColumnsForDropdown.length > 0 && baseColumnsForDropdown.every((c) => hiddenColumnsSet.has(c)),
    [baseColumnsForDropdown, hiddenColumnsSet]
  );

  const isEquipeGroupHidden = useMemo(
    () => equipeEdicaoColumns.length > 0 && equipeEdicaoColumns.every((c) => hiddenColumnsSet.has(c)),
    [equipeEdicaoColumns, hiddenColumnsSet]
  );

  const baseHiddenCount = useMemo(
    () => baseColumnsForDropdown.filter((c) => hiddenColumnsSet.has(c)).length,
    [baseColumnsForDropdown, hiddenColumnsSet]
  );

  const equipeHiddenCount = useMemo(
    () => equipeEdicaoColumns.filter((c) => hiddenColumnsSet.has(c)).length,
    [equipeEdicaoColumns, hiddenColumnsSet]
  );

  const handleToggleBaseGroup = useCallback(() => {
    setHiddenColumns((prev) => {
      const allBaseHidden = baseColumnsForDropdown.every((c) => prev.includes(c));
      const baseSet = new Set<string>(baseColumnsForDropdown);
      let updated: string[];
      if (allBaseHidden) {
        updated = prev.filter((c) => !baseSet.has(c));
      } else {
        const nonBase = prev.filter((c) => !baseSet.has(c));
        updated = [...nonBase, ...baseColumnsForDropdown];
      }
      try {
        localStorage.setItem(`vivo_registros_hidden_cols_${userIdentifier}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, [baseColumnsForDropdown, userIdentifier]);

  const handleToggleEquipeGroup = useCallback(() => {
    setHiddenColumns((prev) => {
      const allEquipeHidden = equipeEdicaoColumns.every((c) => prev.includes(c));
      const eqSet = new Set<string>(equipeEdicaoColumns);
      let updated: string[];
      if (allEquipeHidden) {
        updated = prev.filter((c) => !eqSet.has(c));
      } else {
        const nonEq = prev.filter((c) => !eqSet.has(c));
        updated = [...nonEq, ...equipeEdicaoColumns];
      }
      try {
        localStorage.setItem(`vivo_registros_hidden_cols_${userIdentifier}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, [equipeEdicaoColumns, userIdentifier]);

  // Table Height Dynamic Styles based on tableHeightMode (Igual à V.TAL)
  const tableHeightStyles = useMemo(() => {
    switch (tableHeightMode) {
      case 'expandida':
        return {
          maxHeight: 'calc(100vh - 160px)',
          minHeight: '580px',
        };
      case 'maxima':
        return {
          maxHeight: 'calc(100vh - 85px)',
          minHeight: '680px',
        };
      case 'padrao':
      default:
        return {
          maxHeight: 'calc(100vh - 240px)',
          minHeight: '460px',
        };
    }
  }, [tableHeightMode]);

  // Virtualization windowing state: calculates visible slice based on scrollTop
  const ROW_HEIGHT = 33; // precise row height in px
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500);

  const handleContainerScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  useEffect(() => {
    if (tableContainerRef.current) {
      setContainerHeight(tableContainerRef.current.clientHeight || 500);
    }
  }, [tableHeightMode]);

  const totalRowCount = sortedRegistrosVivo.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 15);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 30;
  const endIndex = Math.min(totalRowCount, startIndex + visibleCount);

  const visibleRows = useMemo(() => {
    return sortedRegistrosVivo.slice(startIndex, endIndex);
  }, [sortedRegistrosVivo, startIndex, endIndex]);

  const topSpacerHeight = startIndex * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (totalRowCount - endIndex) * ROW_HEIGHT);

  const totalColsCount = 2 + visibleBaseColumns.length + visibleEquipeColumns.length;

  return (
    <div className="space-y-2.5 font-sans">
      {/* Controles, Filtros e Indicadores em fluxo normal (rolam junto com a página) */}
      <div className="space-y-2 relative">
        {/* 1. Header de Resumo & Ações (Linha Única Compacta: Total Obras + Última Matriz + Exportar CSV + Toggle Filtros) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-600 shadow-2xs">
          {/* Esquerda: Total de Obras VIVO + Última Matriz VIVO */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shrink-0" />
              <span>
                {totalObrasBase > 0 ? (
                  <>
                    <strong className="text-slate-900 font-bold">
                      {totalObrasBase.toLocaleString('pt-BR')}
                    </strong>{' '}
                    obras registradas
                  </>
                ) : (
                  'Nenhuma importação da BASE realizada'
                )}
              </span>
            </div>

            {lastImportInfoVivo && (
              <div className="flex items-center space-x-1 px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-[10px]">
                <Database className="w-3 h-3 text-[#1a56db] shrink-0" />
                <span>
                  Última Matriz VIVO:{' '}
                  <strong className="text-slate-900 font-semibold">
                    {lastImportInfoVivo.dataHoraFormatada}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Direita: Exportar CSV + Botão Retrátil de Filtros */}
          <div className="flex items-center space-x-2">
            {/* Botão Exportar .CSV */}
            <button
              id="btn-export-csv-vivo"
              onClick={() => exportarRegistrosVivoParaExcel(filteredRegistrosVivo, 'VIVO_OBRAS_Export')}
              disabled={filteredRegistrosVivo.length === 0}
              className="px-3 py-1 bg-[#002855] hover:bg-[#001e40] text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer border border-[#002855]"
              title="Exportar registros filtrados para .CSV"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exportar .CSV</span>
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

        {/* 2. Painel Retrátil de Busca e Filtros (Linha Única em Telas Desktop) */}
        {isFiltersExpanded && (
          <div className="bg-white p-2 sm:p-2.5 rounded-xl shadow-xs border border-slate-200/90 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-1.5 items-end">
              {/* Campo de Busca por ID ou Descrição */}
              <div className="w-full min-w-0">
                <label className="block text-[10px] font-bold text-slate-700 tracking-tight mb-0.5 truncate leading-tight">
                  Buscar ID/Descrição
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400">
                    <Search className="h-3 w-3" />
                  </div>
                  <input
                    id="input-search-id-vivo"
                    type="text"
                    value={searchID}
                    onChange={(e) => setSearchID(e.target.value)}
                    placeholder="ID, Descrição..."
                    title="Buscar por ID ou Descrição da Obra"
                    className="block w-full pl-6 pr-5 py-1 bg-slate-50/70 border border-slate-300 rounded-md text-[11px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002855] transition-all shadow-2xs h-[28px]"
                  />
                  {searchID && (
                    <button
                      onClick={() => setSearchID('')}
                      className="absolute inset-y-0 right-0 pr-1.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* 1. REF */}
              <MultiSelectFilter
                label="REF"
                options={refOptions}
                selected={filterREF}
                onChange={setFilterREF}
                optionCounts={refCounts}
                placeholder="Todas"
              />

              {/* 2. ANO */}
              <MultiSelectFilter
                label="Ano"
                options={anoOptions}
                selected={filterAno}
                onChange={setFilterAno}
                optionCounts={anoCounts}
                placeholder="Todos"
              />

              {/* 2. REG */}
              <MultiSelectFilter
                label="REG"
                options={regOptions}
                selected={filterREG}
                onChange={setFilterREG}
                optionCounts={regCounts}
                placeholder="Todas"
              />

              {/* 3. UF */}
              <MultiSelectFilter
                label="UF"
                options={ufOptions}
                selected={filterUF}
                onChange={setFilterUF}
                optionCounts={ufCounts}
                placeholder="Todas"
              />

              {/* 4. Status Draft */}
              <MultiSelectFilter
                label="Status Draft"
                options={statusDraftOptions}
                selected={filterStatusDraft}
                onChange={setFilterStatusDraft}
                optionCounts={statusDraftCounts}
                placeholder="Todos"
              />

              {/* 5. Status Med. Final */}
              <MultiSelectFilter
                label="Status Med. Final"
                options={statusMedFinalOptions}
                selected={filterStatusMedFinal}
                onChange={setFilterStatusMedFinal}
                optionCounts={statusMedFinalCounts}
                placeholder="Todos"
              />

              {/* 6. STATUS IMPL */}
              <MultiSelectFilter
                label="STATUS IMPL"
                options={statusImplOptions}
                selected={filterStatusImpl}
                onChange={setFilterStatusImpl}
                optionCounts={statusImplCounts}
                placeholder="Todos"
              />

              {/* 7. Resp. Pendência */}
              <MultiSelectFilter
                label="Resp. Pendência"
                options={respPendenciaOptions}
                selected={filterRespPendencia}
                onChange={setFilterRespPendencia}
                optionCounts={respPendenciaCounts}
                placeholder="Todos"
              />

              {/* 8. Resp. Medição */}
              <MultiSelectFilter
                label="Resp. Medição"
                options={respMedicaoOptions}
                selected={filterRespMedicao}
                onChange={setFilterRespMedicao}
                optionCounts={respMedicaoCounts}
                placeholder="Todos"
              />
            </div>
          </div>
        )}

        {/* 3. Linha Compacta de Totais & Controles */}
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-1.5 bg-slate-50/90 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 shadow-2xs">
          {/* Esquerda: Exibindo X obras + OSP Orçamento, OSP Medido e Faturado */}
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-2.5 gap-y-1 min-w-0">
            <span className="font-semibold text-slate-800 whitespace-nowrap">
              Exibindo <strong className="text-[#002855] font-extrabold">{filteredRegistrosVivo.length.toLocaleString('pt-BR')}</strong> obras
            </span>

            {isIndicatorsExpanded && (
              <>
                <span className="text-slate-300 select-none">•</span>
                <span className="whitespace-nowrap">
                  OSP Orçamento: <strong className="text-slate-900 font-bold">{totalOrcamento}</strong>
                </span>
                <span className="text-slate-300 select-none">•</span>
                <span className="whitespace-nowrap">
                  OSP Medido: <strong className="text-emerald-700 font-bold">{totalMedido}</strong>
                </span>
                <span className="text-slate-300 select-none">•</span>
                <span className="whitespace-nowrap">
                  Faturado: <strong className="text-blue-700 font-bold">{totalFaturado}</strong>
                </span>
              </>
            )}

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-1 inline-flex items-center space-x-1 px-1.5 py-0.2 rounded bg-red-50 text-red-700 hover:bg-red-100 text-[10px] font-bold transition-colors cursor-pointer border border-red-200 whitespace-nowrap"
                title="Limpar todos os filtros aplicados"
              >
                <X className="w-2.5 h-2.5" />
                <span>Limpar {activeFiltersCount}</span>
              </button>
            )}
          </div>

          {/* Direita: Tags Base Leitura + Equipe Edição + Colunas + Ver Altura + ID Congelado + Toggle Indicadores */}
          <div className="flex items-center space-x-1.5 shrink-0 text-[10px] ml-auto">
            {/* 1. Botão/Chip Base: Leitura */}
            <button
              type="button"
              onClick={handleToggleBaseGroup}
              className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded font-semibold transition-all cursor-pointer border ${
                isBaseGroupHidden
                  ? 'bg-slate-100 border-slate-300 text-slate-400 opacity-80 hover:bg-slate-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              }`}
              title="Clique para ocultar/mostrar colunas de leitura"
            >
              {isBaseGroupHidden ? (
                <EyeOff className="w-3 h-3 text-slate-400 shrink-0" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
              <span>Base: Leitura</span>
              {isBaseGroupHidden ? (
                <span className="text-[9px] text-slate-400 font-normal">(oculto)</span>
              ) : baseHiddenCount > 0 ? (
                <span className="text-[9px] px-1 rounded bg-emerald-200/80 text-emerald-900 font-bold">
                  {baseHiddenCount} ocultas
                </span>
              ) : null}
            </button>

            {/* 2. Botão/Chip Equipe: Edição */}
            <button
              type="button"
              onClick={handleToggleEquipeGroup}
              className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded font-semibold transition-all cursor-pointer border ${
                isEquipeGroupHidden
                  ? 'bg-slate-100 border-slate-300 text-slate-400 opacity-80 hover:bg-slate-200'
                  : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
              }`}
              title="Clique para ocultar/mostrar colunas de edição"
            >
              {isEquipeGroupHidden ? (
                <EyeOff className="w-3 h-3 text-slate-400 shrink-0" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
              )}
              <span>Equipe: Edição</span>
              {isEquipeGroupHidden ? (
                <span className="text-[9px] text-slate-400 font-normal">(oculto)</span>
              ) : equipeHiddenCount > 0 ? (
                <span className="text-[9px] px-1 rounded bg-blue-200/80 text-blue-900 font-bold">
                  {equipeHiddenCount} ocultas
                </span>
              ) : null}
            </button>

            {/* 3. Botão Dropdown "Colunas" */}
            <ColumnVisibilityDropdown
              baseColumns={baseColumnsForDropdown}
              equipeColumns={equipeEdicaoColumns}
              hiddenColumns={hiddenColumns}
              onToggleColumn={handleToggleColumn}
              onShowAll={() => updateHiddenColumns([])}
              onShowOnlyEdicao={() => updateHiddenColumns([...baseColumnsForDropdown])}
            />

            {/* Seletor de Altura da Tabela */}
            <div className="flex items-center space-x-0.5 bg-slate-100 border border-slate-300/80 rounded p-0.5 text-[10px]">
              <span className="text-slate-500 font-semibold px-1 hidden md:inline">Ver:</span>
              <button
                type="button"
                onClick={() => {
                  setTableHeightMode('padrao');
                  try { localStorage.setItem('vivo_registros_table_height_mode', 'padrao'); } catch {}
                }}
                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                  tableHeightMode === 'padrao'
                    ? 'bg-[#002855] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
                title="Altura padrão"
              >
                Padrão
              </button>
              <button
                type="button"
                onClick={() => {
                  setTableHeightMode('expandida');
                  try { localStorage.setItem('vivo_registros_table_height_mode', 'expandida'); } catch {}
                }}
                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                  tableHeightMode === 'expandida'
                    ? 'bg-[#002855] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
                title="Altura expandida"
              >
                Expandida
              </button>
              <button
                type="button"
                onClick={() => {
                  setTableHeightMode('maxima');
                  try { localStorage.setItem('vivo_registros_table_height_mode', 'maxima'); } catch {}
                }}
                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                  tableHeightMode === 'maxima'
                    ? 'bg-[#002855] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
                title="Altura máxima"
              >
                Máxima
              </button>
            </div>

            {/* Botão Congelar ID + UF (Igual à V.TAL) */}
            <button
              type="button"
              onClick={() => setFreezeIdUfColumn(!freezeIdUfColumn)}
              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded font-semibold shadow-2xs transition-colors cursor-pointer ${
                freezeIdUfColumn
                  ? 'bg-[#002855] text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
              }`}
              title={
                freezeIdUfColumn
                  ? 'Colunas ID e UF estão congeladas (clique para descongelar)'
                  : 'Clique para congelar as colunas ID e UF juntas'
              }
            >
              <Pin className="w-2.5 h-2.5 text-cyan-400 rotate-45" />
              <span>{freezeIdUfColumn ? 'ID + UF Congelados' : 'Congelar ID + UF'}</span>
            </button>

            {/* Toggle de Métricas */}
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
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden relative">
        <div
          ref={tableContainerRef}
          onScroll={handleContainerScroll}
          style={{
            maxHeight: tableHeightStyles.maxHeight,
            minHeight: tableHeightStyles.minHeight,
          }}
          className="overflow-y-auto overflow-x-auto relative custom-scrollbar transition-all duration-200"
        >
          <table className="w-full text-left text-xs border-separate border-spacing-0">
            {/* Table Header: Linha Única com Sticky Nativo e var(--fs-table-header) */}
            <thead className="sticky top-0 z-30 select-none bg-[#001e40]">
              <tr className="text-white text-[11px] font-bold uppercase tracking-wider bg-[#001e40]">
                {/* Ações (fixo no topo e na esquerda) */}
                <th
                  style={{
                    backgroundColor: '#001e40',
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    zIndex: 40,
                    opacity: 1,
                    fontSize: 'var(--fs-table-header)',
                  }}
                  className="py-1.5 px-2 border-r border-b border-[#001428] w-[84px] min-w-[84px] max-w-[84px] text-center"
                >
                  Ações
                </th>

                {/* ID Header: Sempre na coluna 2 logo após Ações (fixo se congelado, fluxo normal se descongelado) */}
                <th
                  style={{
                    backgroundColor: '#001e40',
                    position: 'sticky',
                    top: 0,
                    zIndex: freezeIdUfColumn ? 36 : 30,
                    opacity: 1,
                    fontSize: 'var(--fs-table-header)',
                    ...(freezeIdUfColumn ? { left: 84 } : {}),
                  }}
                  onClick={() => handleSort('ID')}
                  className="py-1.5 px-2.5 border-r border-b border-[#001428] w-[110px] min-w-[110px] max-w-[110px] cursor-pointer hover:bg-[#00142b] transition-colors text-center"
                >
                  <div className="flex items-center justify-center space-x-1.5 text-center">
                    <span className="flex items-center space-x-1 text-cyan-300 font-extrabold">
                      <span>ID</span>
                      {freezeIdUfColumn && <Pin className="w-3 h-3 text-cyan-400 rotate-45" />}
                    </span>
                    {sortColumn === 'ID' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                    )}
                  </div>
                </th>

                {/* Se congelamento ativo: UF fica fixo ao lado do ID (left = 84 + 110 = 194) */}
                {freezeIdUfColumn && isUfVisible && (
                  <th
                    style={{
                      backgroundColor: '#002855',
                      position: 'sticky',
                      top: 0,
                      left: 194,
                      zIndex: 35,
                      opacity: 1,
                      fontSize: 'var(--fs-table-header)',
                    }}
                    onClick={() => handleSort('UF')}
                    className="py-1.5 px-2.5 hover:bg-[#002046] transition-colors border-r border-b border-[#001c3d] whitespace-nowrap cursor-pointer text-center w-[75px] min-w-[75px] max-w-[75px]"
                  >
                    <div className="flex items-center justify-center space-x-1.5 text-center">
                      <span className="truncate text-slate-100">UF</span>
                      {sortColumn === 'UF' ? (
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
                )}

                {/* Demais Colunas Base: Leitura */}
                {(freezeIdUfColumn ? rollingBaseColumns : visibleBaseColumns).map((colKey) => {
                  const isSorted = sortColumn === colKey;
                  return (
                    <th
                      key={colKey}
                      style={{
                        backgroundColor: '#002855',
                        position: 'sticky',
                        top: 0,
                        zIndex: 30,
                        opacity: 1,
                        fontSize: 'var(--fs-table-header)',
                      }}
                      onClick={() => handleSort(colKey)}
                      className={`py-1.5 px-2.5 hover:bg-[#002046] transition-colors border-r border-b border-[#001c3d] whitespace-nowrap cursor-pointer text-center ${
                        colKey === 'UF'
                          ? 'w-[75px] min-w-[75px] max-w-[75px]'
                          : colKey === 'REG' || colKey === 'REF'
                          ? 'min-w-[80px]'
                          : colKey.includes('OSP') || colKey.includes('Produção') || colKey === 'Faturado'
                          ? 'min-w-[130px]'
                          : 'min-w-[110px]'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-1.5 text-center">
                        <span className="truncate text-slate-100">{colKey}</span>
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

                {/* Colunas Equipe: Edição (todas com cabeçalho centralizado) */}
                {visibleEquipeColumns.map((colKey) => {
                  const isSorted = sortColumn === colKey;
                  return (
                    <th
                      key={colKey}
                      style={{
                        backgroundColor: '#003875',
                        position: 'sticky',
                        top: 0,
                        zIndex: 30,
                        opacity: 1,
                        fontSize: 'var(--fs-table-header)',
                      }}
                      onClick={() => handleSort(colKey)}
                      className="py-1.5 px-2.5 hover:bg-[#002f66] transition-colors border-r border-b border-[#002952] whitespace-nowrap min-w-[140px] cursor-pointer text-cyan-100 font-bold text-center"
                    >
                      <div className="flex items-center justify-center space-x-1.5 text-center">
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
            </thead>

            {/* Table Body */}
            <tbody className="bg-white">
              {totalRowCount === 0 ? (
                <tr>
                  <td
                    colSpan={totalColsCount}
                    className="py-14 text-center text-slate-500 bg-slate-50/50"
                  >
                    <Database className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-slate-700">Nenhum registro encontrado</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {searchID || activeFiltersCount > 0
                        ? 'Nenhuma obra da VIVO corresponde aos filtros selecionados. Tente ajustar os parâmetros de busca.'
                        : 'Utilize a aba Importação para enviar a planilha matriz da VIVO.'}
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
                <>
                  {/* Top Virtualization Spacer */}
                  {topSpacerHeight > 0 && (
                    <tr>
                      <td
                        colSpan={totalColsCount}
                        style={{ height: `${topSpacerHeight}px`, padding: 0, border: 'none' }}
                      />
                    </tr>
                  )}

                  {/* Rendered Visible Rows */}
                  {visibleRows.map((item, localIdx) => {
                    const rowGlobalIdx = startIndex + localIdx;

                    // Helper para renderizar célula de Base: Leitura (idêntico à V.TAL)
                    const renderBaseCell = (colKey: string) => {
                      if (colKey === 'ID') {
                        return (
                          <td
                            key={colKey}
                            style={{
                              backgroundColor: '#ffffff',
                              fontSize: 'var(--fs-table)',
                            }}
                            className="py-1.5 px-2.5 font-extrabold text-[#002855] border-r border-b border-slate-200 whitespace-nowrap select-text w-[110px] min-w-[110px] max-w-[110px] overflow-hidden text-left"
                            title={item.ID}
                          >
                            <span className="truncate block font-bold text-left" title={item.ID}>
                              {item.ID}
                            </span>
                          </td>
                        );
                      }

                      if (colKey === 'UF') {
                        return (
                          <td
                            key={colKey}
                            style={{
                              fontSize: 'var(--fs-table)',
                            }}
                            className="py-1.5 px-2.5 border-r border-b border-slate-100 font-semibold text-slate-800 whitespace-nowrap bg-slate-50/20 cursor-default select-text text-center w-[75px] min-w-[75px] max-w-[75px]"
                            title={item.UF}
                          >
                            {item.UF || <span className="text-slate-300">—</span>}
                          </td>
                        );
                      }

                      const rawVal = (item as any)[colKey];
                      const isCurrency =
                        colKey === 'OSP ORÇAMENTO' ||
                        colKey === 'OSP MEDIDO' ||
                        colKey === 'Faturado' ||
                        colKey === 'Produção Bi R$';

                      // Valores monetários: text-slate-800 font-semibold tabular-nums text-center
                      if (isCurrency) {
                        const numVal = parseCurrencyValue(rawVal);
                        return (
                          <td
                            key={colKey}
                            style={{ fontSize: 'var(--fs-table)' }}
                            className="py-1.5 px-2.5 border-r border-b border-slate-100 text-slate-800 font-semibold tabular-nums whitespace-nowrap bg-slate-50/20 cursor-default select-text text-center"
                            title={numVal > 0 ? formatBRL(numVal) : rawVal}
                          >
                            {numVal > 0 ? (
                              formatBRL(numVal)
                            ) : rawVal !== '' && rawVal !== undefined && rawVal !== null && numVal === 0 ? (
                              <span className="text-slate-400 font-normal">R$ 0,00</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      }

                      // REG (Centralizada, text-slate-800 font-semibold)
                      if (colKey === 'REG') {
                        return (
                          <td
                            key={colKey}
                            style={{ fontSize: 'var(--fs-table)' }}
                            className="py-1.5 px-2.5 border-r border-b border-slate-100 font-semibold text-slate-800 whitespace-nowrap bg-slate-50/20 cursor-default select-text text-center"
                          >
                            {rawVal || <span className="text-slate-300">—</span>}
                          </td>
                        );
                      }

                      // Campos centralizados da base (REF, Ano, Mês Input, Data Status, Data Medição, Faixa Status, Faixa Medição)
                      const isCenteredText =
                        colKey === 'REF' ||
                        colKey === 'Ano' ||
                        colKey === 'Mês Input' ||
                        colKey === 'Data Status' ||
                        colKey === 'Data Medição' ||
                        colKey === 'Faixa Status' ||
                        colKey === 'Faixa Medição';

                      if (isCenteredText) {
                        return (
                          <td
                            key={colKey}
                            style={{ fontSize: 'var(--fs-table)' }}
                            className="py-1.5 px-2.5 border-r border-b border-slate-100 text-slate-700 font-medium whitespace-nowrap bg-slate-50/20 cursor-default select-text text-center"
                          >
                            {rawVal || <span className="text-slate-300">—</span>}
                          </td>
                        );
                      }

                      // Demais textos da base (Localidade, Tipo de Projeto, Contrato, Desc., Pedido, Status Draft, Status Medição Final)
                      // Usa exatamente o padrão da V.TAL: text-slate-600 max-w-xs truncate bg-slate-50/20
                      return (
                        <td
                          key={colKey}
                          style={{ fontSize: 'var(--fs-table)' }}
                          className="py-1.5 px-2.5 border-r border-b border-slate-100 text-slate-600 whitespace-nowrap max-w-xs truncate bg-slate-50/20 cursor-default select-text text-left"
                          title={String(rawVal || '')}
                        >
                          {rawVal || <span className="text-slate-300">—</span>}
                        </td>
                      );
                    };

                    // Helper para renderizar célula de Equipe: Edição (idêntico à V.TAL)
                    const renderEquipeCell = (colKey: string) => {
                      const val = (item as any)[colKey];

                      // 1. STATUS IMPL: Selo arredondado com getStatusBadgeClass da V.TAL
                      if (colKey === 'STATUS IMPL') {
                        return (
                          <td
                            key={colKey}
                            onClick={() => handleOpenEdit(item)}
                            style={{ fontSize: 'var(--fs-table)' }}
                            className="py-1.5 px-2.5 border-r border-b border-slate-100 whitespace-nowrap bg-blue-50/20 text-center cursor-pointer hover:bg-blue-100/50 transition-colors"
                            title="Clique para editar este registro"
                          >
                            {val ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] border shadow-2xs ${getStatusBadgeClass(
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

                      // 2. Demais colunas de Equipe: Edição (Centralizadas horizontal e verticalmente, padrão V.TAL)
                      // (PENDENCIA, RESPONSÁVEL PENDENCIA, PRAZO DE MEDIÇÃO, PRAZO PROJETO, RESPONSÁVEL MEDIÇÃO, OBS MEDIÇÃO, DATA TRATATIVA, ID NOVO/ANTIGO)
                      return (
                        <td
                          key={colKey}
                          onClick={() => handleOpenEdit(item)}
                          style={{ fontSize: 'var(--fs-table)' }}
                          className="py-1.5 px-2.5 border-r border-b border-slate-100 text-slate-700 whitespace-nowrap bg-blue-50/20 text-center cursor-pointer hover:bg-blue-100/50 transition-colors"
                          title={`Clique para editar: ${colKey}`}
                        >
                          {val ? (
                            colKey === 'OBS MEDIÇÃO' ? (
                              <span
                                className="font-medium text-[11px] max-w-xs truncate block mx-auto text-slate-700 text-center"
                                title={val}
                              >
                                {val}
                              </span>
                            ) : (
                              <span className="font-medium text-[11px] text-slate-700 text-center block">
                                {val}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    };

                    return (
                      <tr
                        key={`${item.ID}_${rowGlobalIdx}`}
                        className="hover:bg-slate-50/90 transition-colors group"
                        style={{ height: `${ROW_HEIGHT}px` }}
                      >
                        {/* Ação: apenas botão de edição (lápis) - fundo branco sólido */}
                        <td
                          className="py-1.5 px-2 border-r border-b border-slate-200 text-center w-[84px] min-w-[84px] max-w-[84px] bg-white"
                          style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 20,
                            backgroundColor: '#ffffff',
                            opacity: 1,
                            fontSize: 'var(--fs-table)',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg bg-[#002855] hover:bg-[#001e40] text-cyan-300 hover:text-white shadow-2xs transition-all cursor-pointer"
                              title="Editar colunas da equipe"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* ID Célula: Sempre na coluna 2 logo após Ações (fixo se congelado, fluxo normal se descongelado) */}
                        <td
                          style={{
                            fontSize: 'var(--fs-table)',
                            backgroundColor: '#ffffff',
                            opacity: 1,
                            ...(freezeIdUfColumn ? { position: 'sticky', left: 84, zIndex: 16 } : {}),
                          }}
                          className="py-1.5 px-2.5 font-extrabold text-[#002855] border-r border-b border-slate-200 whitespace-nowrap select-text w-[110px] min-w-[110px] max-w-[110px] overflow-hidden text-left bg-white"
                          title={item.ID}
                        >
                          <span className="truncate block font-bold text-left" title={item.ID}>
                            {item.ID}
                          </span>
                        </td>

                        {/* Se congelamento ativo: UF fica fixo ao lado do ID (left = 84 + 110 = 194) */}
                        {freezeIdUfColumn && isUfVisible && (
                          <td
                            style={{
                              position: 'sticky',
                              left: 194,
                              zIndex: 15,
                              backgroundColor: '#ffffff',
                              opacity: 1,
                              fontSize: 'var(--fs-table)',
                            }}
                            className="py-1.5 px-2.5 border-r border-b border-slate-100 font-semibold text-slate-800 whitespace-nowrap cursor-default select-text text-center w-[75px] min-w-[75px] max-w-[75px] bg-white"
                            title={item.UF}
                          >
                            {item.UF || <span className="text-slate-300">—</span>}
                          </td>
                        )}

                        {/* Demais Colunas Base: Leitura */}
                        {(freezeIdUfColumn ? rollingBaseColumns : visibleBaseColumns).map((colKey) => renderBaseCell(colKey))}

                        {/* Colunas Equipe: Edição (todas centralizadas horizontal e verticalmente) */}
                        {visibleEquipeColumns.map((colKey) => renderEquipeCell(colKey))}
                      </tr>
                    );
                  })}

                  {/* Bottom Virtualization Spacer */}
                  {bottomSpacerHeight > 0 && (
                    <tr>
                      <td
                        colSpan={totalColsCount}
                        style={{ height: `${bottomSpacerHeight}px`, padding: 0, border: 'none' }}
                      />
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edição (Idêntico ao da V.TAL) */}
      {isModalOpen && selectedRegistro && (
        <RegistroVivoEditModal
          registro={selectedRegistro}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRegistro(null);
          }}
        />
      )}
    </div>
  );
};
