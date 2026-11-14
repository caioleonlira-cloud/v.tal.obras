import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Registro, RegistrosFilterPayload } from '../../types';
import { BLANK_FILTER_OPTION, getRegistroFilterValue } from '../../utils/filterUtils';
import { ArrowDownWideNarrow, ArrowUpAZ, Check, ChevronDown, Filter, Layers, Search, X } from 'lucide-react';

interface VolumetriaStatusAgingTableProps {
  registros: Registro[];
  onNavigate?: (extraFilters: RegistrosFilterPayload) => void;
}

const FIXED_AGING_COLUMNS = [
  'DE 0 A 3 DIAS',
  'DE 4 A 6 DIAS',
  'DE 7 A 15 DIAS',
  'DE 16 A 30 DIAS',
  'ACIMA 30 DIAS',
] as const;

const FIXED_AGING_ACCENTS: Record<string, string> = {
  'DE 0 A 3 DIAS': 'border-t-[3px] border-t-emerald-400',
  'DE 4 A 6 DIAS': 'border-t-[3px] border-t-teal-400',
  'DE 7 A 15 DIAS': 'border-t-[3px] border-t-amber-400',
  'DE 16 A 30 DIAS': 'border-t-[3px] border-t-orange-400',
  'ACIMA 30 DIAS': 'border-t-[3px] border-t-rose-500',
};

const STORAGE_KEY = 'vtal_dashboard_status_aging_prefs';

type SortMode = 'alpha' | 'total';

interface SavedPrefs {
  sortMode?: SortMode;
  selectedStatuses?: string[] | null;
}

interface PanelCoords {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
  listMaxHeight: number;
}

const loadPrefs = (): SavedPrefs => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
};

const normalizeAgingBucket = (rawValue: string): string => {
  if (rawValue === BLANK_FILTER_OPTION) return BLANK_FILTER_OPTION;
  const collapsed = rawValue.replace(/\s+/g, ' ').trim();
  const upper = collapsed.toUpperCase();
  const matchedFixed = FIXED_AGING_COLUMNS.find((col) => col === upper);
  return matchedFixed ?? collapsed;
};

const formatDisplayLabel = (key: string): string =>
  key === BLANK_FILTER_OPTION ? '(Em branco)' : key;

export const VolumetriaStatusAgingTable: React.FC<VolumetriaStatusAgingTableProps> = ({
  registros,
  onNavigate,
}) => {
  const initialPrefs = useMemo(() => loadPrefs(), []);
  const [sortMode, setSortMode] = useState<SortMode>(
    initialPrefs.sortMode === 'total' ? 'total' : 'alpha'
  );
  // null = todos os status selecionados por padrão
  const [selectedStatuses, setSelectedStatuses] = useState<string[] | null>(
    Array.isArray(initialPrefs.selectedStatuses) ? initialPrefs.selectedStatuses : null
  );

  // Dropdown state for "Filtrar status"
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [draftSelection, setDraftSelection] = useState<Set<string>>(new Set());
  const [panelCoords, setPanelCoords] = useState<PanelCoords>({
    left: 16,
    width: 320,
    top: 80,
    maxHeight: 440,
    listMaxHeight: 300,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ sortMode, selectedStatuses })
      );
    } catch {
      // ignore
    }
  }, [sortMode, selectedStatuses]);

  const updatePanelPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const panelWidth = Math.min(320, viewportW - 16);

    // Alinhado à direita do botão, garantindo que não saia da tela
    const left = Math.max(8, Math.min(rect.right - panelWidth, viewportW - panelWidth - 8));

    const margin = 10;
    const gap = 6;
    const spaceBelow = viewportH - rect.bottom - margin - gap;
    const spaceAbove = rect.top - margin - gap;

    const openBelow = spaceBelow >= 280 || spaceBelow >= spaceAbove;
    const availableHeight = Math.max(180, Math.floor(openBelow ? spaceBelow : spaceAbove));
    // Cabeçalho (~86px) + rodapé (~46px) ≈ 132px; lista limitada a ~320px e à janela
    const listMaxHeight = Math.min(320, Math.max(100, availableHeight - 134));

    if (openBelow) {
      setPanelCoords({
        left: Math.round(left),
        width: Math.round(panelWidth),
        top: Math.round(rect.bottom + gap),
        maxHeight: availableHeight,
        listMaxHeight,
      });
    } else {
      setPanelCoords({
        left: Math.round(left),
        width: Math.round(panelWidth),
        bottom: Math.round(viewportH - rect.top + gap),
        maxHeight: availableHeight,
        listMaxHeight,
      });
    }
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (!isFilterOpen) return;
    const timer = setTimeout(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    }, 10);
    return () => clearTimeout(timer);
  }, [isFilterOpen]);

  // Close on click outside or Esc, and keep aligned on scroll/resize
  useEffect(() => {
    if (!isFilterOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setIsFilterOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterOpen(false);
      }
    };

    const handleScrollOrResize = (event: Event) => {
      const target = event.target;
      if (panelRef.current && target instanceof Node && panelRef.current.contains(target)) {
        return;
      }
      if (!triggerRef.current) {
        setIsFilterOpen(false);
        return;
      }
      const rect = triggerRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setIsFilterOpen(false);
        return;
      }
      updatePanelPosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isFilterOpen, updatePanelPosition]);

  // Build full matrix strictly in memory from Dashboard's filteredRegistros
  const {
    allStatuses,
    statusTotalsAll,
    agingColumns,
    matrix,
  } = useMemo(() => {
    const statusSet = new Set<string>();
    const extraAgingSet = new Set<string>();
    const mat = new Map<string, Map<string, number>>();
    const totalsByStatus = new Map<string, number>();

    registros.forEach((r) => {
      const statusKey = getRegistroFilterValue(r, 'STATUS_ATUAL');
      const rawAging = getRegistroFilterValue(r, 'AGING');
      const agingKey = normalizeAgingBucket(rawAging);

      statusSet.add(statusKey);
      if (!FIXED_AGING_COLUMNS.includes(agingKey as (typeof FIXED_AGING_COLUMNS)[number])) {
        extraAgingSet.add(agingKey);
      }

      if (!mat.has(statusKey)) {
        mat.set(statusKey, new Map<string, number>());
      }
      const rowMap = mat.get(statusKey)!;
      rowMap.set(agingKey, (rowMap.get(agingKey) || 0) + 1);
      totalsByStatus.set(statusKey, (totalsByStatus.get(statusKey) || 0) + 1);
    });

    // Ordem alfabética com "(Em branco)" sempre por último
    const sortedStatuses = Array.from(statusSet).sort((a, b) => {
      if (a === BLANK_FILTER_OPTION) return 1;
      if (b === BLANK_FILTER_OPTION) return -1;
      return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
    });

    // Colunas extras de Aging (caso existam além das 5 faixas fixas), "(Em branco)" por último antes do Total Geral
    const sortedExtraAgings = Array.from(extraAgingSet).sort((a, b) => {
      if (a === BLANK_FILTER_OPTION) return 1;
      if (b === BLANK_FILTER_OPTION) return -1;
      return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
    });

    const columns = [...FIXED_AGING_COLUMNS, ...sortedExtraAgings];

    return {
      allStatuses: sortedStatuses,
      statusTotalsAll: totalsByStatus,
      agingColumns: columns,
      matrix: mat,
    };
  }, [registros]);

  // Active statuses after applying local "Filtrar status"
  const activeStatusSet = useMemo(() => {
    if (selectedStatuses === null) {
      return new Set(allStatuses);
    }
    const chosen = new Set(selectedStatuses);
    return new Set(allStatuses.filter((s) => chosen.has(s)));
  }, [allStatuses, selectedStatuses]);

  const isPartialFilter =
    selectedStatuses !== null && activeStatusSet.size < allStatuses.length;

  // Ordered visible rows + column totals + grand total + max cell count for shading
  const {
    visibleRows,
    columnTotals,
    grandTotal,
    maxCellCount,
  } = useMemo(() => {
    const rows = allStatuses.filter((s) => activeStatusSet.has(s));

    if (sortMode === 'total') {
      rows.sort((a, b) => {
        const diff = (statusTotalsAll.get(b) || 0) - (statusTotalsAll.get(a) || 0);
        if (diff !== 0) return diff;
        if (a === BLANK_FILTER_OPTION) return 1;
        if (b === BLANK_FILTER_OPTION) return -1;
        return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
      });
    } else {
      rows.sort((a, b) => {
        if (a === BLANK_FILTER_OPTION) return 1;
        if (b === BLANK_FILTER_OPTION) return -1;
        return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
      });
    }

    const colTotals = new Map<string, number>();
    agingColumns.forEach((col) => colTotals.set(col, 0));

    let total = 0;
    let maxVal = 0;

    rows.forEach((statusKey) => {
      const rowMap = matrix.get(statusKey);
      if (!rowMap) return;
      agingColumns.forEach((col) => {
        const val = rowMap.get(col) || 0;
        if (val > 0) {
          colTotals.set(col, (colTotals.get(col) || 0) + val);
          total += val;
          if (val > maxVal) maxVal = val;
        }
      });
    });

    return {
      visibleRows: rows,
      columnTotals: colTotals,
      grandTotal: total,
      maxCellCount: maxVal,
    };
  }, [allStatuses, activeStatusSet, sortMode, statusTotalsAll, agingColumns, matrix]);

  // Dropdown helpers
  const handleToggleDropdown = () => {
    if (!isFilterOpen) {
      setDraftSelection(new Set(activeStatusSet));
      setSearchTerm('');
      updatePanelPosition();
      setIsFilterOpen(true);
    } else {
      setIsFilterOpen(false);
    }
  };

  const handleToggleDraftItem = (statusKey: string) => {
    setDraftSelection((prev) => {
      const next = new Set(prev);
      if (next.has(statusKey)) {
        next.delete(statusKey);
      } else {
        next.add(statusKey);
      }
      return next;
    });
  };

  const handleSelectAllDraft = () => {
    setDraftSelection(new Set(allStatuses));
  };

  const handleClearDraft = () => {
    setDraftSelection(new Set());
  };

  const handleApplyFilter = () => {
    if (draftSelection.size >= allStatuses.length && allStatuses.every((s) => draftSelection.has(s))) {
      setSelectedStatuses(null);
    } else {
      setSelectedStatuses(Array.from(draftSelection));
    }
    setIsFilterOpen(false);
  };

  const handleClearLocalFilter = () => {
    setSelectedStatuses(null);
    setDraftSelection(new Set(allStatuses));
  };

  const filteredDropdownStatuses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allStatuses;
    return allStatuses.filter((s) => formatDisplayLabel(s).toLowerCase().includes(q));
  }, [allStatuses, searchTerm]);

  // Click navigation handlers
  const handleCellClick = (statusKey: string, agingKey: string, count: number) => {
    if (!onNavigate || count <= 0) return;
    onNavigate({
      statusAtual: [statusKey],
      aging: [agingKey],
      sortBy: 'DC',
      sortDirection: 'asc',
    });
  };

  const handleRowTotalClick = (statusKey: string, count: number) => {
    if (!onNavigate || count <= 0) return;
    onNavigate({
      statusAtual: [statusKey],
      sortBy: 'DC',
      sortDirection: 'asc',
    });
  };

  const handleColTotalClick = (agingKey: string, count: number) => {
    if (!onNavigate || count <= 0) return;
    onNavigate({
      aging: [agingKey],
      sortBy: 'DC',
      sortDirection: 'asc',
    });
  };

  const handleGrandTotalClick = () => {
    if (!onNavigate || grandTotal <= 0) return;
    if (isPartialFilter) {
      onNavigate({
        statusAtual: Array.from(activeStatusSet),
        sortBy: 'DC',
        sortDirection: 'asc',
      });
    } else {
      onNavigate({
        sortBy: 'DC',
        sortDirection: 'asc',
      });
    }
  };

  const getCellStyle = (count: number): { style?: React.CSSProperties; className: string } => {
    if (count === 0) {
      return {
        className: 'text-slate-300 font-normal select-none',
      };
    }

    const ratio = maxCellCount > 0 ? count / maxCellCount : 0;
    // Leve sombreado azul claro proporcional ao volume (mantendo contraste AA com texto #002855)
    const alpha = Math.min(0.28, 0.04 + ratio * 0.24);
    return {
      style: {
        backgroundColor: `rgba(37, 99, 235, ${alpha.toFixed(3)})`,
      },
      className:
        'text-[#002855] font-bold cursor-pointer transition-all hover:bg-blue-100/80 hover:ring-1 hover:ring-inset hover:ring-[#002855]/35 group',
    };
  };

  const thBaseStyle: React.CSSProperties = {
    fontSize: 'var(--fs-dash-table-header)',
  };

  const tdBaseStyle: React.CSSProperties = {
    fontSize: 'var(--fs-dash-table-cell)',
    paddingTop: 'var(--dash-table-row-py)',
    paddingBottom: 'var(--dash-table-row-py)',
  };

  const filterPortalPanel =
    isFilterOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Filtrar status"
            onScroll={(e) => {
              if (e.currentTarget.scrollTop !== 0) {
                e.currentTarget.scrollTop = 0;
              }
            }}
            style={{
              position: 'fixed',
              left: `${panelCoords.left}px`,
              width: `${panelCoords.width}px`,
              ...(panelCoords.top !== undefined
                ? { top: `${panelCoords.top}px` }
                : { bottom: `${panelCoords.bottom}px` }),
              maxHeight: `${panelCoords.maxHeight}px`,
              zIndex: 9999,
            }}
            className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden font-sans"
          >
            {/* Topo fixo: busca + ações rápidas */}
            <div className="shrink-0 p-2.5 border-b border-slate-100 bg-slate-50/90">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar status..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Limpar busca"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 px-0.5">
                <button
                  type="button"
                  onClick={handleSelectAllDraft}
                  className="text-[11px] font-bold text-[#002855] hover:underline cursor-pointer"
                >
                  Selecionar todos
                </button>
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="text-[11px] font-bold text-slate-500 hover:text-red-600 hover:underline cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Meio rolável: lista de status (altura ajustada ao conteúdo até o máximo permitido) */}
            <div
              style={{ maxHeight: `${panelCoords.listMaxHeight}px` }}
              className="overflow-y-auto divide-y divide-slate-100 p-1 bg-white"
            >
              {filteredDropdownStatuses.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Nenhum status encontrado.
                </div>
              ) : (
                filteredDropdownStatuses.map((statusKey) => {
                  const isChecked = draftSelection.has(statusKey);
                  const count = statusTotalsAll.get(statusKey) || 0;
                  const label = formatDisplayLabel(statusKey);
                  const isBlank = statusKey === BLANK_FILTER_OPTION;

                  return (
                    <button
                      key={statusKey}
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      onClick={() => handleToggleDraftItem(statusKey)}
                      className="w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-[#002855] border-[#002855] text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <span
                          className={`text-xs truncate ${
                            isBlank
                              ? 'italic font-semibold text-amber-700'
                              : 'font-semibold text-slate-800'
                          }`}
                          title={label}
                        >
                          {label}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold tabular-nums text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                        {count.toLocaleString('pt-BR')}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Rodapé fixo: contador em edição + Aplicar */}
            <div className="shrink-0 p-2 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 font-medium tabular-nums">
                {draftSelection.size} de {allStatuses.length} selecionados
              </span>
              <button
                type="button"
                onClick={handleApplyFilter}
                className="px-3 py-1.5 rounded-lg bg-[#002855] hover:bg-[#003a75] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header do Cartão */}
      <div className="bg-slate-50/70 border-b border-slate-100 px-3.5 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-[#002855] text-white shadow-2xs shrink-0">
            <Layers className="w-4 h-4 text-cyan-300" />
          </div>
          <div className="min-w-0">
            <h3
              style={{ fontSize: 'var(--fs-dash-panel-title)' }}
              className="font-black text-[#002855] tracking-tight"
            >
              Volumetria de DC&apos;s por Status e Aging
            </h3>
            <p
              style={{ fontSize: 'var(--fs-dash-panel-subtitle)' }}
              className="text-slate-500 font-medium"
            >
              Quantidade de DC&apos;s por Status DC (Atual) e faixa de Aging. Clique nos números para ver as obras na aba Registro.
            </p>
          </div>
        </div>

        {/* Controles do Cabeçalho */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isPartialFilter && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[11px] font-bold text-[#002855] whitespace-nowrap">
              <span className="tabular-nums">
                {activeStatusSet.size} de {allStatuses.length} status
              </span>
              <span className="text-blue-300">|</span>
              <button
                type="button"
                onClick={handleClearLocalFilter}
                className="text-blue-700 hover:text-blue-900 underline font-bold cursor-pointer"
              >
                Limpar filtro
              </button>
            </div>
          )}

          {/* Botão do Filtro Local (painel renderizado via Portal no body) */}
          <button
            ref={triggerRef}
            type="button"
            onClick={handleToggleDropdown}
            aria-expanded={isFilterOpen}
            aria-haspopup="dialog"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              isPartialFilter || isFilterOpen
                ? 'bg-[#002855] text-white border-[#002855] shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar status</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Alternador de Ordenação: A-Z / Maior total */}
          <div
            className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200"
            role="group"
            aria-label="Ordenação das linhas"
          >
            <button
              type="button"
              onClick={() => setSortMode('alpha')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                sortMode === 'alpha'
                  ? 'bg-white text-[#002855] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ordenar status em ordem alfabética (A–Z)"
            >
              <ArrowUpAZ className="w-3.5 h-3.5" />
              <span>A–Z</span>
            </button>
            <button
              type="button"
              onClick={() => setSortMode('total')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                sortMode === 'total'
                  ? 'bg-white text-[#002855] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ordenar status pelo maior Total Geral"
            >
              <ArrowDownWideNarrow className="w-3.5 h-3.5" />
              <span>Maior total</span>
            </button>
          </div>
        </div>
      </div>

      {/* Área da Tabela com Cantos Arredondados e Recorte Igual às Demais Tabelas */}
      <div className="p-3">
        {visibleRows.length === 0 ? (
          <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-sm font-bold text-slate-600">
              {allStatuses.length === 0
                ? 'Nenhuma DC encontrada para os filtros atuais do Dashboard.'
                : 'Nenhum status selecionado no filtro desta tabela.'}
            </p>
            {isPartialFilter && allStatuses.length > 0 && (
              <button
                type="button"
                onClick={handleClearLocalFilter}
                className="mt-2.5 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#002855] text-white text-xs font-bold hover:bg-[#003a75] cursor-pointer"
              >
                Restaurar todos os status
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="overflow-auto max-h-[520px] custom-scrollbar">
              <table className="w-full border-collapse font-sans">
                <thead>
                  <tr className="bg-[#002855] text-white uppercase font-bold tracking-wider select-none">
                    <th
                      style={thBaseStyle}
                      className="sticky top-0 left-0 z-30 bg-[#002855] rounded-tl-xl px-3 py-2.5 text-left font-bold min-w-[230px] whitespace-nowrap"
                    >
                      Status da DC (Atual)
                    </th>
                    {agingColumns.map((col) => {
                      const accentClass =
                        FIXED_AGING_ACCENTS[col] || 'border-t-[3px] border-t-slate-400';
                      const displayCol = formatDisplayLabel(col);

                      return (
                        <th
                          key={col}
                          style={thBaseStyle}
                          className={`sticky top-0 z-20 bg-[#002855] px-3 py-2.5 text-center font-bold min-w-[125px] whitespace-nowrap ${accentClass}`}
                        >
                          {displayCol}
                        </th>
                      );
                    })}
                    <th
                      style={thBaseStyle}
                      className="sticky top-0 z-20 bg-[#001e42] rounded-tr-xl px-3.5 py-2.5 text-center font-black min-w-[125px] whitespace-nowrap"
                    >
                      Total Geral
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-slate-100">
                  {visibleRows.map((statusKey) => {
                    const rowMap = matrix.get(statusKey);
                    const isBlankRow = statusKey === BLANK_FILTER_OPTION;
                    const displayStatus = formatDisplayLabel(statusKey);
                    let rowTotal = 0;
                    agingColumns.forEach((col) => {
                      rowTotal += rowMap?.get(col) || 0;
                    });

                    return (
                      <tr
                        key={statusKey}
                        className="bg-white hover:bg-slate-50/70 transition-colors"
                      >
                        <td
                          style={tdBaseStyle}
                          className={`sticky left-0 z-10 px-3 text-left border-r border-slate-200/80 whitespace-nowrap ${
                            isBlankRow
                              ? 'bg-amber-50/70 text-amber-800 italic font-bold'
                              : 'bg-white text-[#002855] font-bold'
                          }`}
                        >
                          {displayStatus}
                        </td>

                        {agingColumns.map((col) => {
                          const count = rowMap?.get(col) || 0;
                          const cell = getCellStyle(count);
                          const displayCol = formatDisplayLabel(col);

                          return (
                            <td
                              key={col}
                              onClick={
                                count > 0
                                  ? () => handleCellClick(statusKey, col, count)
                                  : undefined
                              }
                              style={{ ...tdBaseStyle, ...cell.style }}
                              className={`px-3 text-center tabular-nums border-r border-slate-100 whitespace-nowrap ${cell.className}`}
                              title={
                                count > 0
                                  ? `${count.toLocaleString('pt-BR')} DC(s) em "${displayStatus}" (${displayCol}). Clique para abrir na aba Registro.`
                                  : undefined
                              }
                            >
                              {count > 0 ? (
                                <span className="inline-block group-hover:underline">
                                  {count.toLocaleString('pt-BR')}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          );
                        })}

                        <td
                          onClick={
                            rowTotal > 0
                              ? () => handleRowTotalClick(statusKey, rowTotal)
                              : undefined
                          }
                          style={tdBaseStyle}
                          className={`px-3.5 text-center tabular-nums bg-slate-50 border-l-2 border-slate-200 whitespace-nowrap ${
                            rowTotal > 0
                              ? 'font-black text-[#002855] cursor-pointer hover:bg-blue-100/70 transition-colors group'
                              : 'font-normal text-slate-300'
                          }`}
                          title={
                            rowTotal > 0
                              ? `${rowTotal.toLocaleString('pt-BR')} DC(s) em "${displayStatus}". Clique para abrir na aba Registro.`
                              : undefined
                          }
                        >
                          {rowTotal > 0 ? (
                            <span className="inline-block group-hover:underline">
                              {rowTotal.toLocaleString('pt-BR')}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-300 font-black text-[#002855]">
                    <td
                      style={tdBaseStyle}
                      className="sticky bottom-0 left-0 z-30 bg-slate-100 rounded-bl-xl px-3 text-left uppercase tracking-wider border-r border-slate-200 whitespace-nowrap font-black text-[#002855]"
                    >
                      Total Geral
                    </td>

                    {agingColumns.map((col) => {
                      const colCount = columnTotals.get(col) || 0;
                      const displayCol = formatDisplayLabel(col);

                      return (
                        <td
                          key={col}
                          onClick={
                            colCount > 0
                              ? () => handleColTotalClick(col, colCount)
                              : undefined
                          }
                          style={tdBaseStyle}
                          className={`sticky bottom-0 z-20 bg-slate-50 px-3 text-center tabular-nums border-r border-slate-200/80 whitespace-nowrap ${
                            colCount > 0
                              ? 'cursor-pointer hover:bg-blue-100/80 text-[#002855] font-black transition-colors group'
                              : 'text-slate-300 font-normal'
                          }`}
                          title={
                            colCount > 0
                              ? `${colCount.toLocaleString('pt-BR')} DC(s) na faixa "${displayCol}". Clique para abrir na aba Registro.`
                              : undefined
                          }
                        >
                          {colCount > 0 ? (
                            <span className="inline-block group-hover:underline">
                              {colCount.toLocaleString('pt-BR')}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      );
                    })}

                    <td
                      onClick={grandTotal > 0 ? handleGrandTotalClick : undefined}
                      style={tdBaseStyle}
                      className={`sticky bottom-0 z-20 bg-slate-100 rounded-br-xl px-3.5 text-center tabular-nums border-l-2 border-slate-200 whitespace-nowrap ${
                        grandTotal > 0
                          ? 'cursor-pointer hover:bg-blue-100/90 text-[#002855] font-black transition-colors group'
                          : 'text-slate-300 font-normal'
                      }`}
                      title={
                        grandTotal > 0
                          ? `Total Geral: ${grandTotal.toLocaleString('pt-BR')} DC(s). Clique para abrir na aba Registro.`
                          : undefined
                      }
                    >
                      {grandTotal > 0 ? (
                        <span className="inline-block group-hover:underline">
                          {grandTotal.toLocaleString('pt-BR')}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {filterPortalPanel}
    </div>
  );
};
