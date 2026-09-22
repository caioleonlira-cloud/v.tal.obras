import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Registro,
  BLOCO_1_KEYS,
  BLOCO_2_KEYS,
  ALL_COLUMNS,
  RegistrosFilterPayload,
  getRegistroCarteira,
  getRegistroPlanEstruturante,
  getRegistroTipoDC,
  getRegistroMesInput,
  getRegistroRegional,
  normalizeResponsavel,
  sortResponsaveis,
} from '../../types';
import {
  exportarRegistrosParaExcel,
  exportarRelatorioHistoricoParaExcel,
  isValidDC,
} from '../../utils/excel';
import { parseCurrencyValue, formatBRL } from '../../utils/currency';
import {
  getRegistroFilterValue,
  matchesRegistroFilter,
  sortFilterOptions,
  BLANK_FILTER_OPTION,
  isBlankValue,
} from '../../utils/filterUtils';
import { parseMesAnoSortKey } from '../../utils/monthUtils';
import { RegistroEditModal } from './RegistroEditModal';
import { HistoricoModal } from './HistoricoModal';
import { MultiSelectFilter } from './MultiSelectFilter';
import { ColumnVisibilityDropdown } from './ColumnVisibilityDropdown';
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
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
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
  const [isManageAuditOpen, setIsManageAuditOpen] = useState(false);

  // Lock body scroll when audit management modal is open
  useEffect(() => {
    if (!isManageAuditOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isManageAuditOpen]);

  // 1. Search by DC and Descricao
  const [searchDC, setSearchDC] = useState('');

  // 2. Multi-Select Filters (including Ponto 5: Novos filtros)
  const [filterRegional, setFilterRegional] = useState<string[]>([]);
  const [filterUF, setFilterUF] = useState<string[]>([]);
  const [filterCarteira, setFilterCarteira] = useState<string[]>([]);
  const [filterTipoDC, setFilterTipoDC] = useState<string[]>([]);
  const [filterAging, setFilterAging] = useState<string[]>([]);
  const [filterStatusAtual, setFilterStatusAtual] = useState<string[]>([]);
  const [filterStatusInforme, setFilterStatusInforme] = useState<string[]>([]);
  const [filterResponsavel, setFilterResponsavel] = useState<string[]>([]);
  const [filterTipoProjeto, setFilterTipoProjeto] = useState<string[]>([]);
  const [filterStatusMedParcial, setFilterStatusMedParcial] = useState<string[]>([]);
  const [filterStatusMedFinal, setFilterStatusMedFinal] = useState<string[]>([]);
  const [filterBacklogInput, setFilterBacklogInput] = useState<string[]>([]);
  const [filterMesInput, setFilterMesInput] = useState<string[]>([]);
  const [filterRespMedicao, setFilterRespMedicao] = useState<string[]>([]);

  // Interactive filters triggered by Dashboard clicks
  const [filterOnlyWithParcial, setFilterOnlyWithParcial] = useState(false);
  const [filterOnlyWithFinal, setFilterOnlyWithFinal] = useState(false);
  const [filterOnlyWithMedido, setFilterOnlyWithMedido] = useState(false);
  const [filterOnlyWithFaturado, setFilterOnlyWithFaturado] = useState(false);
  const [filterOnlyWithSaldo, setFilterOnlyWithSaldo] = useState(false);

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

      // 4.1 Tipo de DC
      if (initialFilters.tipoDC !== undefined) {
        setFilterTipoDC(initialFilters.tipoDC);
      } else {
        setFilterTipoDC([]);
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

      // 12. Plan. Estruturante (Backlog / Input)
      if (initialFilters.backlogInput !== undefined) {
        setFilterBacklogInput(initialFilters.backlogInput);
      } else {
        setFilterBacklogInput([]);
      }

      // 12.1 Mês Input
      if (initialFilters.mesInput !== undefined) {
        setFilterMesInput(initialFilters.mesInput);
      } else {
        setFilterMesInput([]);
      }

      // 13. Resp. Medição (Ponto 3)
      if (initialFilters.respMedicao !== undefined) {
        setFilterRespMedicao(initialFilters.respMedicao);
      } else {
        setFilterRespMedicao([]);
      }

      // 14. Interactive Flags
      setFilterOnlyWithParcial(!!initialFilters.onlyWithParcial);
      setFilterOnlyWithFinal(!!initialFilters.onlyWithFinal);
      setFilterOnlyWithMedido(!!initialFilters.onlyWithMedido);
      setFilterOnlyWithFaturado(!!initialFilters.onlyWithFaturado);
      setFilterOnlyWithSaldo(!!initialFilters.onlyWithSaldo);

      // 15. Sorting
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
    // 0. Strict check: An item MUST have a valid alphanumeric DC to be displayed or considered a valid obra
    if (!item || !isValidDC(item.DC)) {
      return false;
    }

    // 1. Search in DC or Descricao
    if (searchDC.trim()) {
      const term = searchDC.toLowerCase().trim();
      const dcVal = (item.DC || '').toLowerCase();
      const descVal = (item['Descrição da DC'] || item.Descricao || '').toLowerCase();
      if (!dcVal.includes(term) && !descVal.includes(term)) {
        return false;
      }
    }

    if (excludeKey !== 'REG' && filterRegional.length > 0) {
      if (!matchesRegistroFilter(item, 'REG', filterRegional)) return false;
    }
    if (excludeKey !== 'UF' && filterUF.length > 0) {
      if (!matchesRegistroFilter(item, 'UF', filterUF)) return false;
    }
    if (excludeKey !== 'CARTEIRA' && filterCarteira.length > 0) {
      if (!matchesRegistroFilter(item, 'CARTEIRA', filterCarteira)) return false;
    }
    if (excludeKey !== 'TIPO_DC' && filterTipoDC.length > 0) {
      if (!matchesRegistroFilter(item, 'TIPO_DC', filterTipoDC)) return false;
    }
    if (excludeKey !== 'AGING' && filterAging.length > 0) {
      if (!matchesRegistroFilter(item, 'AGING', filterAging)) return false;
    }
    if (excludeKey !== 'STATUS_ATUAL' && filterStatusAtual.length > 0) {
      if (!matchesRegistroFilter(item, 'STATUS_ATUAL', filterStatusAtual)) return false;
    }
    if (excludeKey !== 'STATUS_INFORME' && filterStatusInforme.length > 0) {
      if (!matchesRegistroFilter(item, 'STATUS_INFORME', filterStatusInforme)) return false;
    }
    if (excludeKey !== 'RESPONSAVEL' && filterResponsavel.length > 0) {
      if (!matchesRegistroFilter(item, 'RESPONSAVEL', filterResponsavel)) return false;
    }
    if (excludeKey !== 'TIPO_PROJETO' && filterTipoProjeto.length > 0) {
      if (!matchesRegistroFilter(item, 'TIPO_PROJETO', filterTipoProjeto)) return false;
    }
    // Ponto 5: Novos filtros Status Med. Parcial e Status Med. Final
    if (excludeKey !== 'STATUS_MED_PARCIAL' && filterStatusMedParcial.length > 0) {
      if (!matchesRegistroFilter(item, 'STATUS_MED_PARCIAL', filterStatusMedParcial)) return false;
    }
    if (excludeKey !== 'STATUS_MED_FINAL' && filterStatusMedFinal.length > 0) {
      if (!matchesRegistroFilter(item, 'STATUS_MED_FINAL', filterStatusMedFinal)) return false;
    }
    if (excludeKey !== 'BACKLOG_INPUT' && filterBacklogInput.length > 0) {
      if (!matchesRegistroFilter(item, 'BACKLOG_INPUT', filterBacklogInput)) return false;
    }
    if (excludeKey !== 'MES_INPUT' && filterMesInput.length > 0) {
      if (!matchesRegistroFilter(item, 'MES_INPUT', filterMesInput)) return false;
    }
    // Ponto 3: Novo filtro Resp. Medição
    if (excludeKey !== 'RESP_MEDICAO' && filterRespMedicao.length > 0) {
      if (!matchesRegistroFilter(item, 'RESP_MEDICAO', filterRespMedicao)) return false;
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
    if (filterOnlyWithFaturado) {
      const fat = parseCurrencyValue(item['Valor Faturado']);
      if (fat <= 0) return false;
    }
    if (filterOnlyWithSaldo) {
      const sal = parseCurrencyValue(item['Saldo']);
      if (sal <= 0) return false;
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
    tipoDCOptions,
    tipoDCCounts,
    mesInputOptions,
    mesInputCounts,
    respMedicaoOptions,
    respMedicaoCounts,
  } = useMemo(() => {
    const regCounts: Record<string, number> = {};
    const uCounts: Record<string, number> = {};
    const cartCounts: Record<string, number> = {};
    const tipoDcCounts: Record<string, number> = {};
    const mesInpCounts: Record<string, number> = {};
    const agCounts: Record<string, number> = {};
    const stAtualCounts: Record<string, number> = {};
    const stInfCounts: Record<string, number> = {};
    const respCounts: Record<string, number> = {};
    const projCounts: Record<string, number> = {};
    const stMedParcCounts: Record<string, number> = {};
    const stMedFinCounts: Record<string, number> = {};
    const backlogInpCounts: Record<string, number> = {};
    const respMedCounts: Record<string, number> = {};

    let hasBlankReg = false;
    let hasBlankUF = false;
    let hasBlankCart = false;
    let hasBlankAg = false;
    let hasBlankStAtual = false;
    let hasBlankStInf = false;
    let hasBlankResp = false;
    let hasBlankProj = false;
    let hasBlankStMedParc = false;
    let hasBlankStMedFin = false;
    let hasBlankTipoDc = false;
    let hasBlankMesInp = false;
    let hasBlankBacklog = false;
    let hasBlankRespMed = false;

    registros.forEach((r) => {
      if (!r || !isValidDC(r.DC)) return;

      // 1. REGIONAL
      const regVal = getRegistroFilterValue(r, 'REG');
      if (regVal === BLANK_FILTER_OPTION) hasBlankReg = true;
      if (matchesFilterSubset(r, 'REG')) {
        regCounts[regVal] = (regCounts[regVal] || 0) + 1;
      } else if (filterRegional.includes(regVal) && !regCounts[regVal]) {
        regCounts[regVal] = 0;
      }

      // 2. UF
      const ufVal = getRegistroFilterValue(r, 'UF');
      if (ufVal === BLANK_FILTER_OPTION) hasBlankUF = true;
      if (matchesFilterSubset(r, 'UF')) {
        uCounts[ufVal] = (uCounts[ufVal] || 0) + 1;
      } else if (filterUF.includes(ufVal) && !uCounts[ufVal]) {
        uCounts[ufVal] = 0;
      }

      // 3. TIPO (CARTEIRA)
      const cartVal = getRegistroFilterValue(r, 'CARTEIRA');
      if (cartVal === BLANK_FILTER_OPTION) hasBlankCart = true;
      if (matchesFilterSubset(r, 'CARTEIRA')) {
        cartCounts[cartVal] = (cartCounts[cartVal] || 0) + 1;
      } else if (filterCarteira.includes(cartVal) && !cartCounts[cartVal]) {
        cartCounts[cartVal] = 0;
      }

      // 4. AGING
      const agVal = getRegistroFilterValue(r, 'AGING');
      if (agVal === BLANK_FILTER_OPTION) hasBlankAg = true;
      if (matchesFilterSubset(r, 'AGING')) {
        agCounts[agVal] = (agCounts[agVal] || 0) + 1;
      } else if (filterAging.includes(agVal) && !agCounts[agVal]) {
        agCounts[agVal] = 0;
      }

      // 5. Status da DC (Atual)
      const stAtualVal = getRegistroFilterValue(r, 'STATUS_ATUAL');
      if (stAtualVal === BLANK_FILTER_OPTION) hasBlankStAtual = true;
      if (matchesFilterSubset(r, 'STATUS_ATUAL')) {
        stAtualCounts[stAtualVal] = (stAtualCounts[stAtualVal] || 0) + 1;
      } else if (filterStatusAtual.includes(stAtualVal) && !stAtualCounts[stAtualVal]) {
        stAtualCounts[stAtualVal] = 0;
      }

      // 6. Status Informe (Campo)
      const stInfVal = getRegistroFilterValue(r, 'STATUS_INFORME');
      if (stInfVal === BLANK_FILTER_OPTION) hasBlankStInf = true;
      if (matchesFilterSubset(r, 'STATUS_INFORME')) {
        stInfCounts[stInfVal] = (stInfCounts[stInfVal] || 0) + 1;
      } else if (filterStatusInforme.includes(stInfVal) && !stInfCounts[stInfVal]) {
        stInfCounts[stInfVal] = 0;
      }

      // 7. Responsável
      const respVal = getRegistroFilterValue(r, 'RESPONSAVEL');
      if (respVal === BLANK_FILTER_OPTION) hasBlankResp = true;
      if (matchesFilterSubset(r, 'RESPONSAVEL')) {
        respCounts[respVal] = (respCounts[respVal] || 0) + 1;
      } else if (filterResponsavel.includes(respVal) && !respCounts[respVal]) {
        respCounts[respVal] = 0;
      }

      // 8. Tipo de Projeto
      const projVal = getRegistroFilterValue(r, 'TIPO_PROJETO');
      if (projVal === BLANK_FILTER_OPTION) hasBlankProj = true;
      if (matchesFilterSubset(r, 'TIPO_PROJETO')) {
        projCounts[projVal] = (projCounts[projVal] || 0) + 1;
      } else if (filterTipoProjeto.includes(projVal) && !projCounts[projVal]) {
        projCounts[projVal] = 0;
      }

      // 9. Status Med. Parcial
      const stMedParcVal = getRegistroFilterValue(r, 'STATUS_MED_PARCIAL');
      if (stMedParcVal === BLANK_FILTER_OPTION) hasBlankStMedParc = true;
      if (matchesFilterSubset(r, 'STATUS_MED_PARCIAL')) {
        stMedParcCounts[stMedParcVal] = (stMedParcCounts[stMedParcVal] || 0) + 1;
      } else if (filterStatusMedParcial.includes(stMedParcVal) && !stMedParcCounts[stMedParcVal]) {
        stMedParcCounts[stMedParcVal] = 0;
      }

      // 10. Status Med. Final
      const stMedFinVal = getRegistroFilterValue(r, 'STATUS_MED_FINAL');
      if (stMedFinVal === BLANK_FILTER_OPTION) hasBlankStMedFin = true;
      if (matchesFilterSubset(r, 'STATUS_MED_FINAL')) {
        stMedFinCounts[stMedFinVal] = (stMedFinCounts[stMedFinVal] || 0) + 1;
      } else if (filterStatusMedFinal.includes(stMedFinVal) && !stMedFinCounts[stMedFinVal]) {
        stMedFinCounts[stMedFinVal] = 0;
      }

      // 10.1 Tipo de DC
      const tdc = getRegistroFilterValue(r, 'TIPO_DC');
      if (tdc === BLANK_FILTER_OPTION) hasBlankTipoDc = true;
      if (matchesFilterSubset(r, 'TIPO_DC')) {
        tipoDcCounts[tdc] = (tipoDcCounts[tdc] || 0) + 1;
      } else if (filterTipoDC.includes(tdc) && !tipoDcCounts[tdc]) {
        tipoDcCounts[tdc] = 0;
      }

      // 10.2 Mês Input
      const mi = getRegistroFilterValue(r, 'MES_INPUT');
      if (mi === BLANK_FILTER_OPTION) hasBlankMesInp = true;
      if (matchesFilterSubset(r, 'MES_INPUT')) {
        mesInpCounts[mi] = (mesInpCounts[mi] || 0) + 1;
      } else if (filterMesInput.includes(mi) && !mesInpCounts[mi]) {
        mesInpCounts[mi] = 0;
      }

      // 11. Plan. Estruturante (Backlog/Input?)
      const pe = getRegistroFilterValue(r, 'BACKLOG_INPUT');
      if (pe === BLANK_FILTER_OPTION) hasBlankBacklog = true;
      if (matchesFilterSubset(r, 'BACKLOG_INPUT')) {
        backlogInpCounts[pe] = (backlogInpCounts[pe] || 0) + 1;
      } else if (filterBacklogInput.includes(pe) && !backlogInpCounts[pe]) {
        backlogInpCounts[pe] = 0;
      }

      // 12. Resp. Medição (Ponto 3)
      const rm = getRegistroFilterValue(r, 'RESP_MEDICAO');
      if (rm === BLANK_FILTER_OPTION) hasBlankRespMed = true;
      if (matchesFilterSubset(r, 'RESP_MEDICAO')) {
        respMedCounts[rm] = (respMedCounts[rm] || 0) + 1;
      } else if (filterRespMedicao.includes(rm) && !respMedCounts[rm]) {
        respMedCounts[rm] = 0;
      }
    });

    // Ensure (EM BRANCO) stays available as an option if any records in the base dataset are empty
    if (hasBlankReg && regCounts[BLANK_FILTER_OPTION] === undefined) regCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankUF && uCounts[BLANK_FILTER_OPTION] === undefined) uCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankCart && cartCounts[BLANK_FILTER_OPTION] === undefined) cartCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankAg && agCounts[BLANK_FILTER_OPTION] === undefined) agCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankStAtual && stAtualCounts[BLANK_FILTER_OPTION] === undefined) stAtualCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankStInf && stInfCounts[BLANK_FILTER_OPTION] === undefined) stInfCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankResp && respCounts[BLANK_FILTER_OPTION] === undefined) respCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankProj && projCounts[BLANK_FILTER_OPTION] === undefined) projCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankStMedParc && stMedParcCounts[BLANK_FILTER_OPTION] === undefined) stMedParcCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankStMedFin && stMedFinCounts[BLANK_FILTER_OPTION] === undefined) stMedFinCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankTipoDc && tipoDcCounts[BLANK_FILTER_OPTION] === undefined) tipoDcCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankMesInp && mesInpCounts[BLANK_FILTER_OPTION] === undefined) mesInpCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankBacklog && backlogInpCounts[BLANK_FILTER_OPTION] === undefined) backlogInpCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankRespMed && respMedCounts[BLANK_FILTER_OPTION] === undefined) respMedCounts[BLANK_FILTER_OPTION] = 0;

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

    const sortNumericOrAlpha = (a: string, b: string) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b, 'pt-BR');
    };

    return {
      regionalOptions: sortFilterOptions(Object.keys(regCounts)),
      regionalCounts: regCounts,
      ufOptions: sortFilterOptions(Object.keys(uCounts)),
      ufCounts: uCounts,
      carteiraOptions: sortFilterOptions(Object.keys(cartCounts)),
      carteiraCounts: cartCounts,
      agingOptions: sortFilterOptions(Object.keys(agCounts), sortNumericOrAlpha),
      agingCounts: agCounts,
      statusAtualOptions: sortFilterOptions(Object.keys(stAtualCounts)),
      statusAtualCounts: stAtualCounts,
      statusInformeOptions: sortFilterOptions(Object.keys(stInfCounts)),
      statusInformeCounts: stInfCounts,
      responsavelOptions: sortFilterOptions(Object.keys(respCounts), sortResponsaveis),
      responsavelCounts: respCounts,
      tipoProjetoOptions: sortFilterOptions(Object.keys(projCounts)),
      tipoProjetoCounts: projCounts,
      statusMedParcialOptions: sortFilterOptions(Object.keys(stMedParcCounts)),
      statusMedParcialCounts: stMedParcCounts,
      statusMedFinalOptions: sortFilterOptions(Object.keys(stMedFinCounts)),
      statusMedFinalCounts: stMedFinCounts,
      backlogInputOptions: sortFilterOptions(Object.keys(backlogInpCounts)),
      backlogInputCounts: backlogInpCounts,
      tipoDCOptions: sortFilterOptions(Object.keys(tipoDcCounts)),
      tipoDCCounts: tipoDcCounts,
      mesInputOptions: sortFilterOptions(Object.keys(mesInpCounts), (a, b) => parseMesAnoSortKey(a) - parseMesAnoSortKey(b)),
      mesInputCounts: mesInpCounts,
      respMedicaoOptions: sortFilterOptions(Object.keys(respMedCounts)),
      respMedicaoCounts: respMedCounts,
    };
  }, [
    registros,
    segmentacoes,
    searchDC,
    filterRegional,
    filterUF,
    filterCarteira,
    filterTipoDC,
    filterAging,
    filterStatusAtual,
    filterStatusInforme,
    filterResponsavel,
    filterTipoProjeto,
    filterStatusMedParcial,
    filterStatusMedFinal,
    filterBacklogInput,
    filterMesInput,
    filterRespMedicao,
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
    filterTipoDC,
    filterAging,
    filterStatusAtual,
    filterStatusInforme,
    filterResponsavel,
    filterTipoProjeto,
    filterStatusMedParcial,
    filterStatusMedFinal,
    filterBacklogInput,
    filterMesInput,
    filterRespMedicao,
    filterOnlyWithParcial,
    filterOnlyWithFinal,
    filterOnlyWithMedido,
    filterOnlyWithFaturado,
    filterOnlyWithSaldo,
  ]);

  // Total of valid base records (excluding any ghost or empty lines)
  const totalObrasBase = useMemo(() => {
    return registros.filter((r) => r && isValidDC(r.DC)).length;
  }, [registros]);

  // Calculate Summary Totals from filtered rows
  const { totalOrcamento, totalParcial, totalFinal, totalMedidoTotal, totalFaturado, totalSaldo } = useMemo(() => {
    let orc = 0;
    let parc = 0;
    let fin = 0;
    let fat = 0;
    let sal = 0;

    filteredRegistros.forEach((r) => {
      orc += parseCurrencyValue(r.Orçamento);
      parc += parseCurrencyValue(r['Valor Parcial R$']);
      fin += parseCurrencyValue(r['Valor Final R$']);
      fat += parseCurrencyValue(r['Valor Faturado']);
      sal += parseCurrencyValue(r['Saldo']);
    });

    return {
      totalOrcamento: formatBRL(orc),
      totalParcial: formatBRL(parc),
      totalFinal: formatBRL(fin),
      totalMedidoTotal: formatBRL(parc + fin),
      totalFaturado: formatBRL(fat),
      totalSaldo: formatBRL(sal),
    };
  }, [filteredRegistros]);

  // Sort Registros
  const sortedRegistros = useMemo(() => {
    const list = [...filteredRegistros];
    if (!sortColumn) return list;

    list.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortColumn === 'TIPO (Cateira)' || sortColumn === 'TIPO (Carteira)' || sortColumn === 'TIPO (CARTEIRA)') {
        valA = getRegistroCarteira(a).toLowerCase();
        valB = getRegistroCarteira(b).toLowerCase();
      } else if (sortColumn === 'Plan. Estruturante' || sortColumn === 'Backlog/Input?' || sortColumn === 'Backlog/Input') {
        valA = getRegistroPlanEstruturante(a).toLowerCase();
        valB = getRegistroPlanEstruturante(b).toLowerCase();
      } else if (sortColumn === 'Tipo de DC') {
        valA = getRegistroTipoDC(a).toLowerCase();
        valB = getRegistroTipoDC(b).toLowerCase();
      } else if (sortColumn === 'Mês Input') {
        valA = getRegistroMesInput(a).toLowerCase();
        valB = getRegistroMesInput(b).toLowerCase();
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
    setFilterTipoDC([]);
    setFilterAging([]);
    setFilterStatusAtual([]);
    setFilterStatusInforme([]);
    setFilterResponsavel([]);
    setFilterTipoProjeto([]);
    setFilterStatusMedParcial([]);
    setFilterStatusMedFinal([]);
    setFilterBacklogInput([]);
    setFilterMesInput([]);
    setFilterRespMedicao([]);
    setFilterOnlyWithParcial(false);
    setFilterOnlyWithFinal(false);
    setFilterOnlyWithMedido(false);
    setFilterOnlyWithFaturado(false);
    setFilterOnlyWithSaldo(false);
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
    filterTipoDC.length +
    filterAging.length +
    filterStatusAtual.length +
    filterStatusInforme.length +
    filterResponsavel.length +
    filterTipoProjeto.length +
    filterStatusMedParcial.length +
    filterStatusMedFinal.length +
    filterBacklogInput.length +
    filterMesInput.length +
    filterRespMedicao.length +
    (filterOnlyWithParcial ? 1 : 0) +
    (filterOnlyWithFinal ? 1 : 0) +
    (filterOnlyWithMedido ? 1 : 0) +
    (filterOnlyWithFaturado ? 1 : 0) +
    (filterOnlyWithSaldo ? 1 : 0);

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

  // Persistência local da visibilidade de colunas (chave por usuário logado)
  const userIdentifier = user?.uid || user?.email || profile?.uid || profile?.email || 'default';

  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(`vtal_registros_hidden_cols_${userIdentifier}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((k) => typeof k === 'string' && k !== 'DC');
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Sincroniza se o usuário logado mudar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`vtal_registros_hidden_cols_${userIdentifier}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHiddenColumns(parsed.filter((k) => typeof k === 'string' && k !== 'DC'));
        }
      }
    } catch {
      // fallback
    }
  }, [userIdentifier]);

  const updateHiddenColumns = useCallback(
    (newHidden: string[]) => {
      setHiddenColumns(newHidden);
      try {
        localStorage.setItem(
          `vtal_registros_hidden_cols_${userIdentifier}`,
          JSON.stringify(newHidden)
        );
      } catch {
        // ignore
      }
    },
    [userIdentifier]
  );

  const hiddenColumnsSet = useMemo(() => new Set(hiddenColumns), [hiddenColumns]);

  // Colunas visíveis em cada grupo
  const visibleBaseColumns = useMemo(
    () => baseMatrizColumns.filter((colKey) => !hiddenColumnsSet.has(colKey)),
    [baseMatrizColumns, hiddenColumnsSet]
  );

  const visibleEquipeColumns = useMemo(
    () => equipeEditableColumns.filter((colKey) => !hiddenColumnsSet.has(colKey)),
    [equipeEditableColumns, hiddenColumnsSet]
  );

  // Status dos grupos
  const isBaseGroupHidden = useMemo(
    () => baseMatrizColumns.length > 0 && baseMatrizColumns.every((c) => hiddenColumnsSet.has(c)),
    [baseMatrizColumns, hiddenColumnsSet]
  );

  const isEquipeGroupHidden = useMemo(
    () => equipeEditableColumns.length > 0 && equipeEditableColumns.every((c) => hiddenColumnsSet.has(c)),
    [equipeEditableColumns, hiddenColumnsSet]
  );

  const baseHiddenCount = useMemo(
    () => baseMatrizColumns.filter((c) => hiddenColumnsSet.has(c)).length,
    [baseMatrizColumns, hiddenColumnsSet]
  );

  const equipeHiddenCount = useMemo(
    () => equipeEditableColumns.filter((c) => hiddenColumnsSet.has(c)).length,
    [equipeEditableColumns, hiddenColumnsSet]
  );

  // Alternar coluna individual
  const handleToggleColumn = useCallback(
    (colKey: string) => {
      setHiddenColumns((prev) => {
        const updated = prev.includes(colKey)
          ? prev.filter((k) => k !== colKey)
          : [...prev, colKey];
        try {
          localStorage.setItem(
            `vtal_registros_hidden_cols_${userIdentifier}`,
            JSON.stringify(updated)
          );
        } catch {
          // ignore
        }
        return updated;
      });
    },
    [userIdentifier]
  );

  const baseColsSet = useMemo(() => new Set<string>(baseMatrizColumns), [baseMatrizColumns]);
  const equipeColsSet = useMemo(() => new Set<string>(equipeEditableColumns), [equipeEditableColumns]);

  // Alternar grupo Base: Leitura
  const handleToggleBaseGroup = useCallback(() => {
    setHiddenColumns((prev) => {
      const allBaseHidden = baseMatrizColumns.every((c) => prev.includes(c));
      let updated: string[];
      if (allBaseHidden) {
        // Mostrar todas da base
        updated = prev.filter((c) => !baseColsSet.has(c));
      } else {
        // Ocultar todas da base
        const nonBase = prev.filter((c) => !baseColsSet.has(c));
        updated = [...nonBase, ...baseMatrizColumns];
      }
      try {
        localStorage.setItem(
          `vtal_registros_hidden_cols_${userIdentifier}`,
          JSON.stringify(updated)
        );
      } catch {
        // ignore
      }
      return updated;
    });
  }, [baseMatrizColumns, baseColsSet, userIdentifier]);

  // Alternar grupo Equipe: Edição
  const handleToggleEquipeGroup = useCallback(() => {
    setHiddenColumns((prev) => {
      const allEquipeHidden = equipeEditableColumns.every((c) => prev.includes(c));
      let updated: string[];
      if (allEquipeHidden) {
        // Mostrar todas de equipe
        updated = prev.filter((c) => !equipeColsSet.has(c));
      } else {
        // Ocultar todas de equipe
        const nonEquipe = prev.filter((c) => !equipeColsSet.has(c));
        updated = [...nonEquipe, ...equipeEditableColumns];
      }
      try {
        localStorage.setItem(
          `vtal_registros_hidden_cols_${userIdentifier}`,
          JSON.stringify(updated)
        );
      } catch {
        // ignore
      }
      return updated;
    });
  }, [equipeEditableColumns, equipeColsSet, userIdentifier]);

  // Atalho: Mostrar todas
  const handleShowAllColumns = useCallback(() => {
    updateHiddenColumns([]);
  }, [updateHiddenColumns]);

  // Atalho: Só edição (oculta base, mostra edição)
  const handleShowOnlyEdicao = useCallback(() => {
    updateHiddenColumns([...baseMatrizColumns]);
  }, [baseMatrizColumns, updateHiddenColumns]);

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
          className={`py-2.5 px-3 border-r border-b border-slate-700 min-w-[130px] cursor-pointer hover:bg-[#00142b] transition-colors text-center ${
            freezeDcColumn
              ? 'shadow-[4px_0_10px_-2px_rgba(0,0,0,0.4)] border-r-2 border-slate-600'
              : ''
          }`}
        >
          <div className="flex items-center justify-center space-x-1.5 text-center">
            <span className="flex items-center space-x-1 text-cyan-300 font-extrabold">
              <span>DC</span>
              {freezeDcColumn && <Pin className="w-3 h-3 text-cyan-400 rotate-45" />}
            </span>
            {sortColumn === 'DC' ? (
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

        {/* --- GROUP 1: ALL IMPORTED BASE MATRIZ COLUMNS (Sticky Top, Read-only) --- */}
        {visibleBaseColumns.map((colKey) => {
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
              className={`py-2.5 px-3 hover:bg-[#002046] transition-colors border-r border-b border-slate-700/80 whitespace-nowrap min-w-[110px] cursor-pointer text-center ${
                colKey === 'REG' || colKey === 'UF' || colKey === 'AGING'
                  ? 'min-w-[80px]'
                  : ''
              }`}
            >
              <div className="flex items-center justify-center space-x-1.5 text-center">
                <span className="truncate text-slate-100">
                  {(colKey as string) === 'TIPO (Cateira)' || colKey === 'TIPO (Carteira)'
                    ? 'TIPO (Carteira)'
                    : (colKey as string) === 'Backlog/Input?' || colKey === 'Plan. Estruturante'
                    ? 'Plan. Estruturante'
                    : colKey}
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

      {/* Controles, Filtros e Indicadores em fluxo normal (rolam junto com a página) */}
      <div className="space-y-2 relative">
        {/* 1. Header de Resumo & Ações (Linha Única Compacta: Resumo + Matriz + Auditoria + Exportar + Toggle Filtros) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-600 shadow-2xs">
        {/* Esquerda: Total de Obras + Matriz + Sync */}
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
                id="btn-clean-history"
                onClick={() => setIsManageAuditOpen(true)}
                disabled={isExportingAudit}
                title="Opções para limpar ou arquivar o histórico de auditoria"
                className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 rounded-lg text-xs font-semibold shadow-2xs transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden xl:inline">Limpar Histórico</span>
                <span className="xl:hidden">Limpar</span>
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

      {/* 2. Painel Retrátil de Busca e Filtros (Linha Única em Telas Desktop) */}
      {isFiltersExpanded && (
        <div className="bg-white p-2 sm:p-2.5 rounded-xl shadow-xs border border-slate-200/90 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 xl:grid-cols-12 2xl:grid-cols-12 gap-1.5 items-end">
            {/* Campo de Busca por DC ou Descrição */}
            <div className="w-full min-w-0">
              <label className="block text-[10px] font-bold text-slate-700 tracking-tight mb-0.5 truncate leading-tight">
                Buscar DC/Descrição
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-3 w-3" />
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
                  className="block w-full pl-6 pr-5 py-1 bg-slate-50/70 border border-slate-300 rounded-md text-[11px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002855] transition-all shadow-2xs h-[28px]"
                />
                {searchDC && (
                  <button
                    onClick={() => {
                      setSearchDC('');
                      setCurrentPage(1);
                    }}
                    className="absolute inset-y-0 right-0 pr-1.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* 1. Regional */}
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

            {/* 2. UF */}
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

            {/* 3. TIPO (Carteira) */}
            <MultiSelectFilter
              label="TIPO (Carteira)"
              columnRefName="TIPO (Carteira)"
              options={carteiraOptions}
              selected={filterCarteira}
              onChange={(sel) => {
                setFilterCarteira(sel);
                setCurrentPage(1);
              }}
              optionCounts={carteiraCounts}
              placeholder="Todas"
            />

            {/* 4. Tipo de DC */}
            <MultiSelectFilter
              label="Tipo de DC"
              columnRefName="Tipo de DC"
              options={tipoDCOptions}
              selected={filterTipoDC}
              onChange={(sel) => {
                setFilterTipoDC(sel);
                setCurrentPage(1);
              }}
              optionCounts={tipoDCCounts}
              placeholder="Todos"
            />

            {/* 5. Plan. Estruturante */}
            <MultiSelectFilter
              label="Plan. Estruturante"
              columnRefName="Plan. Estruturante"
              options={backlogInputOptions}
              selected={filterBacklogInput}
              onChange={(sel) => {
                setFilterBacklogInput(sel);
                setCurrentPage(1);
              }}
              optionCounts={backlogInputCounts}
              placeholder="Todos"
            />

            {/* 6. Mês Input */}
            <MultiSelectFilter
              label="Mês Input"
              columnRefName="Mês Input"
              options={mesInputOptions}
              selected={filterMesInput}
              onChange={(sel) => {
                setFilterMesInput(sel);
                setCurrentPage(1);
              }}
              optionCounts={mesInputCounts}
              placeholder="Todos"
            />

            {/* 7. Status Atual */}
            <MultiSelectFilter
              label="Status Atual"
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

            {/* 8. Status Informe */}
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
              align="right"
            />

            {/* 9. Responsável */}
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
              align="right"
            />

            {/* 10. Resp. Medição */}
            <MultiSelectFilter
              label="Resp. Medição"
              columnRefName="Resp.Medição"
              options={respMedicaoOptions}
              selected={filterRespMedicao}
              onChange={(sel) => {
                setFilterRespMedicao(sel);
                setCurrentPage(1);
              }}
              optionCounts={respMedicaoCounts}
              placeholder="Todos"
              align="right"
            />

            {/* 11. Status Med. Final */}
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
              align="right"
            />
          </div>
        </div>
      )}

      {/* 3. Linha Única de Indicadores & Legendas (Accordion / Retrátil) */}
      <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-1.5 bg-slate-50/90 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 shadow-2xs">
        {/* Esquerda: Exibindo X obras + Orçamento, Faturado e Saldo */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-2.5 gap-y-1 min-w-0">
          <span className="font-semibold text-slate-800 whitespace-nowrap">
            Exibindo <strong className="text-[#002855] font-extrabold">{filteredRegistros.length.toLocaleString('pt-BR')}</strong> obras
          </span>

          {isIndicatorsExpanded && (
            <>
              <span className="text-slate-300 select-none">•</span>
              <span className="whitespace-nowrap">
                Orçamento: <strong className="text-slate-900 font-bold">{totalOrcamento}</strong>
              </span>
              <span className="text-slate-300 select-none">•</span>
              <span className="whitespace-nowrap">
                Faturado: <strong className="text-blue-700 font-bold">{totalFaturado}</strong>
              </span>
              <span className="text-slate-300 select-none">•</span>
              <span className="whitespace-nowrap">
                Saldo: <strong className="text-indigo-700 font-bold">{totalSaldo}</strong>
              </span>
            </>
          )}

          {filterOnlyWithParcial && (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300 whitespace-nowrap">
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
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300 whitespace-nowrap">
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
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300 whitespace-nowrap">
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
          {filterOnlyWithFaturado && (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-bold border border-blue-300 whitespace-nowrap">
              <span>Faturado &gt; R$ 0</span>
              <button
                type="button"
                onClick={() => setFilterOnlyWithFaturado(false)}
                className="hover:text-blue-950 ml-0.5 cursor-pointer"
                title="Remover filtro"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          {filterOnlyWithSaldo && (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 text-[10px] font-bold border border-indigo-300 whitespace-nowrap">
              <span>Saldo &gt; R$ 0</span>
              <button
                type="button"
                onClick={() => setFilterOnlyWithSaldo(false)}
                className="hover:text-indigo-950 ml-0.5 cursor-pointer"
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
              className="ml-1 inline-flex items-center space-x-1 px-1.5 py-0.2 rounded bg-red-50 text-red-700 hover:bg-red-100 text-[10px] font-bold transition-colors cursor-pointer border border-red-200 whitespace-nowrap"
              title="Limpar todos os filtros aplicados"
            >
              <X className="w-2.5 h-2.5" />
              <span>Limpar {activeFiltersCount}</span>
            </button>
          )}
        </div>

        {/* Direita: Tags de Legenda (Botões de Alternar) + Colunas + DC Congelado + Toggle Indicadores */}
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
            baseColumns={baseMatrizColumns}
            equipeColumns={equipeEditableColumns}
            hiddenColumns={hiddenColumns}
            onToggleColumn={handleToggleColumn}
            onShowAll={handleShowAllColumns}
            onShowOnlyEdicao={handleShowOnlyEdicao}
          />

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
                    colSpan={visibleBaseColumns.length + visibleEquipeColumns.length + 2}
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
                    {visibleBaseColumns.map((colKey) => {
                      const val =
                        (colKey as string) === 'TIPO (Cateira)' || colKey === 'TIPO (Carteira)'
                          ? getRegistroCarteira(item)
                          : (colKey as string) === 'Backlog/Input?' || colKey === 'Plan. Estruturante'
                          ? getRegistroPlanEstruturante(item)
                          : colKey === 'Tipo de DC'
                          ? getRegistroTipoDC(item)
                          : colKey === 'Mês Input'
                          ? getRegistroMesInput(item)
                          : (item as any)[colKey];

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

                      // Regional & UF (UF é centralizada conforme solicitado)
                      if (colKey === 'REG' || colKey === 'UF') {
                        const cellVal = colKey === 'REG' ? (getRegistroRegional(item) || val || '') : val;
                        return (
                          <td
                            key={colKey}
                            className={`py-2 px-3 border-r border-b border-slate-100 font-semibold text-slate-800 whitespace-nowrap bg-slate-50/30 cursor-default select-text ${
                              colKey === 'UF' ? 'text-center' : ''
                            }`}
                          >
                            {cellVal || <span className="text-slate-300">—</span>}
                          </td>
                        );
                      }

                      // AGING & TEMPO (Centralizadas)
                      if (colKey === 'AGING' || colKey === 'Tempo') {
                        const num = parseInt(val, 10);
                        const isHigh = !isNaN(num) && num > 30;
                        return (
                          <td
                            key={colKey}
                            className="py-2 px-3 border-r border-b border-slate-100 whitespace-nowrap bg-slate-50/30 cursor-default select-text text-center"
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

                      // Pedido (Centralizado), Valor Faturado, Saldo
                      if (colKey === 'Valor Faturado' || colKey === 'Saldo') {
                        const numVal = parseCurrencyValue(val);
                        return (
                          <td
                            key={colKey}
                            className="py-2 px-3 border-r border-b border-slate-100 text-slate-800 font-semibold tabular-nums whitespace-nowrap bg-slate-50/20 cursor-default select-text"
                            title={val}
                          >
                            {numVal > 0 ? (
                              formatBRL(numVal)
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      }

                      if (colKey === 'Pedido') {
                        return (
                          <td
                            key={colKey}
                            className="py-2 px-3 border-r border-b border-slate-100 text-slate-800 font-semibold whitespace-nowrap bg-slate-50/20 cursor-default select-text text-center"
                            title={val}
                          >
                            {val || <span className="text-slate-300">—</span>}
                          </td>
                        );
                      }

                      // PLAN. ESTRUTURANTE (Centralizada)
                      if (colKey === 'Plan. Estruturante' || (colKey as string) === 'Backlog/Input?') {
                        return (
                          <td
                            key={colKey}
                            className="py-2 px-3 border-r border-b border-slate-100 text-slate-700 font-medium whitespace-nowrap bg-slate-50/20 cursor-default select-text text-center"
                            title={val}
                          >
                            {val || <span className="text-slate-300">—</span>}
                          </td>
                        );
                      }

                      // MÊS INPUT (Centralizada)
                      if (colKey === 'Mês Input') {
                        return (
                          <td
                            key={colKey}
                            className="py-2 px-3 border-r border-b border-slate-100 text-slate-700 font-medium whitespace-nowrap bg-slate-50/20 cursor-default select-text text-center"
                            title={val}
                          >
                            {val || <span className="text-slate-300">—</span>}
                          </td>
                        );
                      }

                      // TIPO(CARTEIRA) (Centralizada)
                      if (
                        colKey === 'TIPO (Carteira)' ||
                        (colKey as string) === 'TIPO (Cateira)' ||
                        (colKey as string) === 'TIPO(CARTEIRA)'
                      ) {
                        return (
                          <td
                            key={colKey}
                            className="py-2 px-3 border-r border-b border-slate-100 text-slate-800 font-semibold whitespace-nowrap bg-slate-50/20 cursor-default select-text text-center"
                            title={val}
                          >
                            {val || <span className="text-slate-300">—</span>}
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
                    {visibleEquipeColumns.map((colKey) => {
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

      {/* Modal: Gerenciamento e Limpeza do Histórico de Auditoria */}
      {isManageAuditOpen &&
        createPortal(
          <div
            id="modal-manage-audit"
            style={{ zIndex: 2000 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="bg-[#002855] text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <History className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Limpar / Arquivar Histórico de Auditoria</h3>
                    <p className="text-xs text-cyan-200">Exportação de backup e limpeza de logs de edição</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isExportingAudit && setIsManageAuditOpen(false)}
                  disabled={isExportingAudit}
                  className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">Segurança de Dados:</p>
                    <p className="mt-0.5 text-slate-600 leading-relaxed">
                      Antes de qualquer exclusão, o sistema <strong>sempre faz o download automático de uma planilha Excel de backup</strong> com todos os registros afetados.
                    </p>
                  </div>
                </div>

                {/* Opção 1: Limpeza Total */}
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50/70 transition-colors">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-rose-900 uppercase tracking-wider block">
                      Opção 1: Limpar TODO o Histórico (Reset Completo)
                    </span>
                    <p className="text-xs text-rose-800 leading-relaxed">
                      Baixa uma planilha Excel com <strong>todas as edições registradas</strong> e em seguida apaga 100% dos dados (do Firestore e do cache local).
                    </p>
                    <p className="text-[11px] font-semibold text-rose-900">
                      ✓ Após esta limpeza, clicar em "Auditoria" gerará um Excel zerado (apenas os cabeçalhos das colunas).
                    </p>
                  </div>
                  <div className="mt-3.5 pt-3 border-t border-rose-200/80 flex justify-end">
                    <button
                      type="button"
                      disabled={isExportingAudit}
                      onClick={async () => {
                        if (
                          window.confirm(
                            'Atenção: Deseja realmente LIMPAR TODO O HISTÓRICO de edições?\n\nO sistema fará o download de uma planilha Excel de backup com todas as alterações e depois apagará todo o histórico do banco de dados.\n\nO relatório de auditoria ficará zerado.'
                          )
                        ) {
                          try {
                            setIsExportingAudit(true);
                            const res = await arquivarELimparHistorico(0);
                            if (res.removidos > 0) {
                              alert(
                                `Histórico zerado com sucesso!\n\n${res.removidos} registro(s) de edições foram salvos na planilha de backup baixada e removidos do sistema.\n\nAgora o histórico de auditoria está totalmente limpo.`
                              );
                            } else {
                              alert('O histórico de edições já estava vazio. Nenhuma exclusão necessária.');
                            }
                            setIsManageAuditOpen(false);
                          } catch (err: any) {
                            alert('Erro ao limpar histórico: ' + (err?.message || err));
                          } finally {
                            setIsExportingAudit(false);
                          }
                        }
                      }}
                      className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isExportingAudit ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>{isExportingAudit ? 'Processando...' : 'Limpar Todo o Histórico'}</span>
                    </button>
                  </div>
                </div>

                {/* Opção 2: Arquivar > 90 dias */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      Opção 2: Arquivar apenas anteriores a 90 dias
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Baixa um backup em Excel apenas das edições com mais de 3 meses e as remove do Firestore para liberar espaço, preservando as edições recentes dos últimos 90 dias.
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200 flex justify-end">
                    <button
                      type="button"
                      disabled={isExportingAudit}
                      onClick={async () => {
                        if (
                          window.confirm(
                            'Deseja exportar e arquivar o histórico de auditoria com mais de 90 dias?\n\nIsso baixará uma planilha Excel de backup e liberará espaço no Firestore mantendo as alterações recentes.'
                          )
                        ) {
                          try {
                            setIsExportingAudit(true);
                            const res = await arquivarELimparHistorico(90);
                            if (res.removidos > 0) {
                              alert(
                                `Histórico arquivado com sucesso!\n\n${res.removidos} registro(s) com mais de 90 dias foram exportados para o backup e liberados do Firestore.`
                              );
                            } else {
                              alert('Nenhum registro com mais de 90 dias encontrado para arquivar.');
                            }
                            setIsManageAuditOpen(false);
                          } catch (err: any) {
                            alert('Erro ao arquivar histórico: ' + (err?.message || err));
                          } finally {
                            setIsExportingAudit(false);
                          }
                        }
                      }}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Archive className="w-3.5 h-3.5 text-slate-500" />
                      <span>Arquivar &gt;90d</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsManageAuditOpen(false)}
                  disabled={isExportingAudit}
                  className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
