import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Registro,
  BLOCO_1_KEYS,
  BLOCO_2_KEYS,
  ALL_COLUMNS,
  RegistrosFilterPayload,
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

export interface RegistrosViewProps {
  initialFilters?: RegistrosFilterPayload | null;
  onClearInitialFilters?: () => void;
}

export const RegistrosView: React.FC<RegistrosViewProps> = ({
  initialFilters,
  onClearInitialFilters,
}) => {
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

  // 2. Multi-Select Filters (including Ponto 5: Novos filtros)
  const [filterRegional, setFilterRegional] = useState<string[]>([]);
  const [filterUF, setFilterUF] = useState<string[]>([]);
  const [filterCarteira, setFilterCarteira] = useState<string[]>([]);
  const [filterAging, setFilterAging] = useState<string[]>([]);
  const [filterStatusAtual, setFilterStatusAtual] = useState<string[]>([]);
  const [filterStatusInforme, setFilterStatusInforme] = useState<string[]>([]);
  const [filterResponsavel, setFilterResponsavel] = useState<string[]>([]);
  const [filterTipoProjeto, setFilterTipoProjeto] = useState<string[]>([]);
  const [filterStatusMedParcial, setFilterStatusMedParcial] = useState<string[]>([]);
  const [filterStatusMedFinal, setFilterStatusMedFinal] = useState<string[]>([]);
  const [filterBacklogInput, setFilterBacklogInput] = useState<string[]>([]);

  // Interactive filters triggered by Dashboard clicks
  const [filterOnlyWithParcial, setFilterOnlyWithParcial] = useState(false);
  const [filterOnlyWithFinal, setFilterOnlyWithFinal] = useState(false);
  const [filterOnlyWithMedido, setFilterOnlyWithMedido] = useState(false);

  // 3. Pagination & Sorting (Ponto 3: Persistir ordenação personalizada)
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
  const [sortColumn, setSortColumn] = useState<string>(() => {
    try {
      return localStorage.getItem('vtal_registros_sort_col') || 'DC';
    } catch {
      return 'DC';
    }
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    try {
      const saved = localStorage.getItem('vtal_registros_sort_dir');
      return saved === 'desc' ? 'desc' : 'asc';
    } catch {
      return 'asc';
    }
  });
  const [freezeDcColumn, setFreezeDcColumn] = useState(true);

  // Controls for collapsible panels
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [isIndicatorsExpanded, setIsIndicatorsExpanded] = useState(true);

  // Handle initial filters passed from Dashboard
  useEffect(() => {
    if (initialFilters) {
      // 1. Search DC
      if (initialFilters.searchDC !== undefined) {
        setSearchDC(initialFilters.searchDC);
      } else {
        setSearchDC('');
      }

      // 2. Regional
      if (initialFilters.regional !== undefined) {
        const validRegionais = initialFilters.regional.filter(
          (r) => r && r.trim().toUpperCase() !== 'TELEMONT'
        );
        setFilterRegional(validRegionais);
      } else {
        setFilterRegional([]);
      }

      // 3. UF
      if (initialFilters.uf !== undefined) {
        setFilterUF(initialFilters.uf);
      } else {
        setFilterUF([]);
      }

      // 4. Carteira
      if (initialFilters.carteira !== undefined) {
        setFilterCarteira(initialFilters.carteira);
      } else {
        setFilterCarteira([]);
      }

      // 5. Aging
      if (initialFilters.aging !== undefined) {
        setFilterAging(initialFilters.aging);
      } else {
        setFilterAging([]);
      }

      // 6. Status Atual
      if (initialFilters.statusAtual !== undefined) {
        setFilterStatusAtual(initialFilters.statusAtual);
      } else {
        setFilterStatusAtual([]);
      }

      // 7. Status Informe
      if (initialFilters.statusInforme !== undefined) {
        setFilterStatusInforme(initialFilters.statusInforme);
      } else {
        setFilterStatusInforme([]);
      }

      // 8. Responsável
      if (initialFilters.responsavel !== undefined) {
        setFilterResponsavel(initialFilters.responsavel);
      } else {
        setFilterResponsavel([]);
      }

      // 9. Tipo de Projeto
      if (initialFilters.tipoProjeto !== undefined) {
        setFilterTipoProjeto(initialFilters.tipoProjeto);
      } else {
        setFilterTipoProjeto([]);
      }

      // 10. Status Med. Parcial
      if (initialFilters.statusMedParcial !== undefined) {
        setFilterStatusMedParcial(initialFilters.statusMedParcial);
      } else {
        setFilterStatusMedParcial([]);
      }

      // 11. Status Med. Final
      if (initialFilters.statusMedFinal !== undefined) {
        setFilterStatusMedFinal(initialFilters.statusMedFinal);
      } else {
        setFilterStatusMedFinal([]);
      }

      // 12. Backlog / Input
      if (initialFilters.backlogInput !== undefined) {
        setFilterBacklogInput(initialFilters.backlogInput);
      } else {
        setFilterBacklogInput([]);
      }

      // 13. Interactive Flags
      setFilterOnlyWithParcial(!!initialFilters.onlyWithParcial);
      setFilterOnlyWithFinal(!!initialFilters.onlyWithFinal);
      setFilterOnlyWithMedido(!!initialFilters.onlyWithMedido);

      // 14. Sorting
      if (initialFilters.sortBy) {
        setSortColumn(initialFilters.sortBy);
        if (initialFilters.sortDirection) {
          setSortDirection(initialFilters.sortDirection);
        }
      }
      setCurrentPage(1);
      setIsFiltersExpanded(true);

      // Consume the initial drill-down filter immediately so it is not re-applied when switching tabs
      if (onClearInitialFilters) {
        onClearInitialFilters();
      }
    }
  }, [initialFilters, onClearInitialFilters]);

  const tableContainerRef = useRef<HTMLDivElement>(null);

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
      const resp = (item.Responsavel || '').trim();
      const match = filterResponsavel.some((fr) => {
        if (fr === 'Não Atribuído' || fr === 'NÃO ATRIBUÍDO') {
          return !resp || resp === '-' || resp === 'Não Atribuído' || resp === 'NÃO ATRIBUÍDO';
        }
        return resp.toLowerCase() === fr.toLowerCase();
      });
      if (!match) return false;
    }
    if (excludeKey !== 'TIPO_PROJETO' && filterTipoProjeto.length > 0) {
      if (!item['Tipo de Projeto'] || !filterTipoProjeto.includes(item['Tipo de Projeto'].trim()))
        return false;
    }
    // Ponto 5: Novos filtros Status Med. Parcial e Status Med. Final
    if (excludeKey !== 'STATUS_MED_PARCIAL' && filterStatusMedParcial.length > 0) {
      const val = (item['Status Med. Parcial'] || '').trim();
      if (!val || !filterStatusMedParcial.includes(val)) return false;
    }
    if (excludeKey !== 'STATUS_MED_FINAL' && filterStatusMedFinal.length > 0) {
      const val = (item['Status Med. Final'] || '').trim();
      if (!val || !filterStatusMedFinal.includes(val)) return false;
    }
    if (excludeKey !== 'BACKLOG_INPUT' && filterBacklogInput.length > 0) {
      const val = (item['Backlog/Input?'] || '').trim();
      if (!val || !filterBacklogInput.includes(val)) return false;
    }
    // Interactive Value Filters from Dashboard
    if (filterOnlyWithParcial) {
      const p = parseCurrencyValue(item['Valor Parcial R$']);
      if (p <= 0) return false;
    }
    if (filterOnlyWithFinal) {
      const f = parseCurrencyValue(item['Valor Final R$']);
      if (f <= 0) return false;
    }
    if (filterOnlyWithMedido) {
      const p = parseCurrencyValue(item['Valor Parcial R$']);
      const f = parseCurrencyValue(item['Valor Final R$']);
      if (p + f <= 0) return false;
    }
    return true;
  };

  // Derive correlated unique options & counts for the multiselect filters
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
    statusMedParcialOptions,
    statusMedParcialCounts,
    statusMedFinalOptions,
    statusMedFinalCounts,
    backlogInputOptions,
    backlogInputCounts,
  } = useMemo(() => {
    const regCounts: Record<string, number> = {};
    const uCounts: Record<string, number> = {};
    const cartCounts: Record<string, number> = {};
    const agCounts: Record<string, number> = {};
    const stAtualCounts: Record<string, number> = {};
    const stInfCounts: Record<string, number> = {};
    const respCounts: Record<string, number> = {};
    const projCounts: Record<string, number> = {};
    const stMedParcCounts: Record<string, number> = {};
    const stMedFinCounts: Record<string, number> = {};
    const backlogInpCounts: Record<string, number> = {};

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

      // 9. Status Med. Parcial
      if (r['Status Med. Parcial']) {
        const val = r['Status Med. Parcial'].trim();
        if (matchesFilterSubset(r, 'STATUS_MED_PARCIAL')) {
          stMedParcCounts[val] = (stMedParcCounts[val] || 0) + 1;
        } else if (filterStatusMedParcial.includes(val) && !stMedParcCounts[val]) {
          stMedParcCounts[val] = 0;
        }
      }

      // 10. Status Med. Final
      if (r['Status Med. Final']) {
        const val = r['Status Med. Final'].trim();
        if (matchesFilterSubset(r, 'STATUS_MED_FINAL')) {
          stMedFinCounts[val] = (stMedFinCounts[val] || 0) + 1;
        } else if (filterStatusMedFinal.includes(val) && !stMedFinCounts[val]) {
          stMedFinCounts[val] = 0;
        }
      }

      // 11. Backlog/Input?
      if (r['Backlog/Input?']) {
        const val = r['Backlog/Input?'].trim();
        if (matchesFilterSubset(r, 'BACKLOG_INPUT')) {
          backlogInpCounts[val] = (backlogInpCounts[val] || 0) + 1;
        } else if (filterBacklogInput.includes(val) && !backlogInpCounts[val]) {
          backlogInpCounts[val] = 0;
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
      statusMedParcialOptions: Object.keys(stMedParcCounts).sort(),
      statusMedParcialCounts: stMedParcCounts,
      statusMedFinalOptions: Object.keys(stMedFinCounts).sort(),
      statusMedFinalCounts: stMedFinCounts,
      backlogInputOptions: Object.keys(backlogInpCounts).sort(),
      backlogInputCounts: backlogInpCounts,
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
    filterStatusMedParcial,
    filterStatusMedFinal,
    filterBacklogInput,
  ]);

  // Filter Registros (Search in DC or Descricao + Multiselects + Value filters)
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
    filterStatusMedParcial,
    filterStatusMedFinal,
    filterBacklogInput,
    filterOnlyWithParcial,
    filterOnlyWithFinal,
    filterOnlyWithMedido,
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
    let nextDir: 'asc' | 'desc' = 'asc';
    if (sortColumn === col) {
      nextDir = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(nextDir);
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
    try {
      localStorage.setItem('vtal_registros_sort_col', col);
      localStorage.setItem('vtal_registros_sort_dir', nextDir);
    } catch {
      // ignore
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
    setFilterStatusMedParcial([]);
    setFilterStatusMedFinal([]);
    setFilterBacklogInput([]);
    setFilterOnlyWithParcial(false);
    setFilterOnlyWithFinal(false);
    setFilterOnlyWithMedido(false);
    if (onClearInitialFilters) {
      onClearInitialFilters();
    }
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
    filterTipoProjeto.length +
    filterStatusMedParcial.length +
    filterStatusMedFinal.length +
    filterBacklogInput.length +
    (filterOnlyWithParcial ? 1 : 0) +
    (filterOnlyWithFinal ? 1 : 0) +
    (filterOnlyWithMedido ? 1 : 0);

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

  // Helper to check if a pendência cell should have its entire square painted green ("quadrado inteiro")
  const getPendenciaCellClass = (colKey: string, val?: string) => {
    if (!val) return null;
    const v = val.trim().toUpperCase();
    const isOkOrNa =
      v === 'OK' ||
      v === 'N/A' ||
      v === 'NA' ||
      v === 'N / A' ||
      v === 'N-A' ||
      v === 'CONCLUÍDO' ||
      v === 'CONCLUIDO';

    if (colKey === 'Pendência (Implantação)') {
      if (isOkOrNa) {
        return 'bg-emerald-100/80 text-emerald-900 border-l border-r border-b border-slate-100 hover:bg-emerald-200/80 font-bold';
      }
    }

    if (colKey === 'Pendência (Celula Sap)') {
      if (
        isOkOrNa ||
        v.includes('MAT. NO DEPOSITO - NA BAIXA V.TAL') ||
        v.includes('MAT. NO DEPOSITO') ||
        v.includes('MAT NO DEPOSITO') ||
        (v.includes('DEPOSITO') && v.includes('BAIXA'))
      ) {
        return 'bg-emerald-100/80 text-emerald-900 border-l border-r border-b border-slate-100 hover:bg-emerald-200/80 font-bold';
      }
    }

    if (colKey === 'Pendência (Projetos)') {
      if (isOkOrNa) {
        return 'bg-emerald-100/80 text-emerald-900 border-l border-r border-b border-slate-100 hover:bg-emerald-200/80 font-bold';
      }
    }

    return null;
  };

  // Separation of columns:
  // 1. Base Matriz Imported Columns (All Bloco 1 except DC which is sticky)
  const baseMatrizColumns = BLOCO_1_KEYS.filter((k) => k !== 'DC');

  // 2. Team Editable Columns (All Bloco 2)
  const equipeEditableColumns = BLOCO_2_KEYS;

  // Scroll table container back to top when page changes
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  // Altura máxima calculada para o container de rolagem próprio da tabela (relativo ao viewport)
  const tableMaxHeight = useMemo(() => {
    let offset = 245;
    if (isFiltersExpanded) offset += 105;
    if (isIndicatorsExpanded) offset += 45;
    return `calc(100vh - ${offset}px)`;
  }, [isFiltersExpanded, isIndicatorsExpanded]);

  // Render header row com position: sticky nativo relativo ao container de rolagem
  const renderHeaderRow = () => {
    return (
      <tr className="text-white text-[11px] font-bold uppercase tracking-wider">
        {/* Sticky Action Column (100% opaco, fixo no topo e na esquerda) */}
        <th
          style={{
            backgroundColor: '#001e40',
            position: 'sticky',
            top: 0,
            left: 0,
            zIndex: 40,
            opacity: 1,
          }}
          className="py-2.5 px-2 border-r border-b border-slate-700 w-[84px] min-w-[84px] max-w-[84px] text-center"
        >
          Ações
        </th>

        {/* Sticky / Regular DC Identifier (100% opaco, fixo no topo e na esquerda quando congelado) */}
        <th
          style={{
            backgroundColor: '#001e40',
            position: 'sticky',
            top: 0,
            zIndex: freezeDcColumn ? 35 : 30,
            opacity: 1,
            ...(freezeDcColumn ? { left: 84 } : {}),
          }}
          onClick={() => handleSort('DC')}
          className={`py-2.5 px-3 border-r border-b border-slate-700 min-w-[130px] cursor-pointer hover:bg-[#00142b] transition-colors ${
            freezeDcColumn
              ? 'shadow-[4px_0_10px_-2px_rgba(0,0,0,0.4)] border-r-2 border-slate-600'
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

        {/* --- GROUP 1: ALL IMPORTED BASE MATRIZ COLUMNS (Sticky Top, Read-only) --- */}
        {baseMatrizColumns.map((colKey) => {
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
              }}
              onClick={() => handleSort(colKey)}
              className={`py-2.5 px-3 hover:bg-[#002046] transition-colors border-r border-b border-slate-700/80 whitespace-nowrap min-w-[110px] cursor-pointer ${
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

        {/* --- GROUP 2: ALL TEAM EDITABLE COLUMNS (Sticky Top, Centered) --- */}
        {equipeEditableColumns.map((colKey) => {
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
              }}
              onClick={() => handleSort(colKey)}
              className="py-2.5 px-3 hover:bg-[#002f66] transition-colors border-r border-b border-slate-700/80 whitespace-nowrap min-w-[130px] cursor-pointer text-cyan-100 font-bold text-center"
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
          {/* Botão Auditoria (Ponto 2: Apenas perfil ADM) */}
          {isAdmin && (
            <div className="flex items-center space-x-1">
              <button
                id="btn-export-audit"
                onClick={async () => {
                  try {
                    setIsExportingAudit(true);
                    await exportarAuditoriaGeral(1000);
                  } catch (err: any) {
                    console.error('Erro ao exportar auditoria:', err);
                    alert(err?.message || 'Erro ao exportar relatório de auditoria.');
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
            </div>
          )}

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

      {/* 2. Painel Retrátil de Busca e Filtros (Compacto e Responsivo) */}
      {isFiltersExpanded && (
        <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-200/90 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-11 gap-2 items-end">
            {/* Campo de Busca por DC ou Descrição */}
            <div className="w-full">
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

            {/* 4. Status da DC (Atual) -> Coluna Status da DC (Atual) */}
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

            {/* 9. Status Med. Parcial (Ponto 5) */}
            <MultiSelectFilter
              label="Status Med. Parcial"
              columnRefName="Parcial"
              options={statusMedParcialOptions}
              selected={filterStatusMedParcial}
              onChange={(sel) => {
                setFilterStatusMedParcial(sel);
                setCurrentPage(1);
              }}
              optionCounts={statusMedParcialCounts}
              placeholder="Todos"
            />

            {/* 10. Status Med. Final (Ponto 5) */}
            <MultiSelectFilter
              label="Status Med. Final"
              columnRefName="Final"
              options={statusMedFinalOptions}
              selected={filterStatusMedFinal}
              onChange={(sel) => {
                setFilterStatusMedFinal(sel);
                setCurrentPage(1);
              }}
              optionCounts={statusMedFinalCounts}
              placeholder="Todos"
            />

            {/* 11. Backlog/Input? (Ponto 3) */}
            <MultiSelectFilter
              label="Backlog/Input"
              columnRefName="Tipo"
              options={backlogInputOptions}
              selected={filterBacklogInput}
              onChange={(sel) => {
                setFilterBacklogInput(sel);
                setCurrentPage(1);
              }}
              optionCounts={backlogInputCounts}
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

          {filterOnlyWithParcial && (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300">
              <span>Parcial &gt; R$ 0</span>
              <button
                type="button"
                onClick={() => setFilterOnlyWithParcial(false)}
                className="hover:text-emerald-950 ml-0.5 cursor-pointer"
                title="Remover filtro"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          {filterOnlyWithFinal && (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300">
              <span>Final &gt; R$ 0</span>
              <button
                type="button"
                onClick={() => setFilterOnlyWithFinal(false)}
                className="hover:text-emerald-950 ml-0.5 cursor-pointer"
                title="Remover filtro"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          {filterOnlyWithMedido && (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300">
              <span>Total Medido &gt; R$ 0</span>
              <button
                type="button"
                onClick={() => setFilterOnlyWithMedido(false)}
                className="hover:text-emerald-950 ml-0.5 cursor-pointer"
                title="Remover filtro"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
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

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden relative">
        {/* Scrollable Data Table - Rolagem Horizontal e Vertical próprias com cabeçalho sticky top: 0 */}
        <div
          ref={tableContainerRef}
          style={{
            maxHeight: tableMaxHeight,
            minHeight: '400px',
          }}
          className="overflow-y-auto overflow-x-auto relative custom-scrollbar"
        >
          <table className="w-full text-left text-xs border-separate border-spacing-0">
            {/* Table Header original com sticky nativo */}
            <thead className="sticky top-0 z-30 select-none">
              {renderHeaderRow()}
            </thead>

            {/* Table Body */}
            <tbody className="bg-white">
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
                    {/* Sticky Action Column (100% opaco, fixo na esquerda) */}
                    <td
                      className="py-2 px-2 border-r border-b border-slate-200 text-center w-[84px] min-w-[84px] max-w-[84px]"
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 20,
                        backgroundColor: '#ffffff',
                        opacity: 1,
                      }}
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

                    {/* Sticky / Regular DC Identifier Column (100% sólido, z-index superior a outras células) */}
                    <td
                      style={
                        freezeDcColumn
                          ? {
                              position: 'sticky',
                              left: 84,
                              zIndex: 15,
                              backgroundColor: '#ffffff',
                              opacity: 1,
                            }
                          : {
                              backgroundColor: '#ffffff',
                            }
                      }
                      className={`py-2 px-3 font-extrabold text-[#002855] border-r border-b whitespace-nowrap select-text min-w-[130px] ${
                        freezeDcColumn
                          ? 'shadow-[4px_0_10px_-2px_rgba(0,0,0,0.18)] border-r-2 border-slate-300'
                          : 'border-slate-200'
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
                            className="py-2 px-3 border-r border-b border-slate-100 font-medium text-slate-700 whitespace-nowrap bg-slate-50/30 cursor-default select-text"
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
                            className="py-2 px-3 border-r border-b border-slate-100 font-semibold text-slate-800 whitespace-nowrap bg-slate-50/30 cursor-default select-text"
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
                            className="py-2 px-3 border-r border-b border-slate-100 whitespace-nowrap bg-slate-50/30 cursor-default select-text"
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
                          className="py-2 px-3 border-r border-b border-slate-100 text-slate-600 whitespace-nowrap max-w-xs truncate bg-slate-50/20 cursor-default select-text"
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
                            className="py-2 px-3 border-r border-b border-slate-100 whitespace-nowrap bg-blue-50/20 text-center cursor-pointer hover:bg-blue-100/50 transition-colors"
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
                            className="py-2 px-3 border-r border-b border-slate-100 font-bold text-slate-800 whitespace-nowrap bg-blue-50/20 text-center cursor-pointer hover:bg-blue-100/50 transition-colors"
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
                            className="py-2 px-3 border-r border-b border-slate-100 text-slate-700 max-w-xs truncate bg-blue-50/20 text-center cursor-pointer hover:bg-blue-100/50 transition-colors"
                            title={val || 'Clique para adicionar observação'}
                          >
                            {val || <span className="text-slate-300">—</span>}
                          </td>
                        );
                      }

                      // Pendência columns with whole square painted ("quadrado inteiro")
                      const pendenciaHighlightClass = getPendenciaCellClass(colKey, val);
                      if (pendenciaHighlightClass) {
                        return (
                          <td
                            key={colKey}
                            onClick={() => handleOpenEdit(item)}
                            className={`py-2 px-3 whitespace-nowrap text-center cursor-pointer transition-colors ${pendenciaHighlightClass}`}
                            title={`Clique para editar este registro (${colKey}: ${val})`}
                          >
                            <span className="font-bold text-[11px]">{val}</span>
                          </td>
                        );
                      }

                      // Other team editable fields (Pendências não preenchidas, Datas, etc.)
                      return (
                        <td
                          key={colKey}
                          onClick={() => handleOpenEdit(item)}
                          className="py-2 px-3 border-r border-b border-slate-100 text-slate-700 whitespace-nowrap bg-blue-50/20 text-center cursor-pointer hover:bg-blue-100/50 transition-colors"
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
