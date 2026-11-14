import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { MultiSelectFilter } from '../Registros/MultiSelectFilter';
import { parseCurrencyValue, formatBRL } from '../../utils/currency';
import { parseMesAnoSortKey, normalizeMesInputValue } from '../../utils/monthUtils';
import { ObrasInputVivoTable } from './ObrasInputVivoTable';
import {
  RegistroVivo,
  RegistrosVivoFilterPayload,
  isValidVivoID,
  VIVO_BLANK_LABEL,
  isVivoBlank,
  getVivoDisplayOrBlank,
  sortVivoResponsaveis,
} from '../../types';
import {
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  Database,
  DollarSign,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';

export interface DashboardVivoSectionProps {
  onNavigateToRegistrosVivo?: (filters: RegistrosVivoFilterPayload) => void;
}

export const DashboardVivoSection: React.FC<DashboardVivoSectionProps> = ({
  onNavigateToRegistrosVivo,
}) => {
  const { registrosVivo, loadingRegistrosVivo, lastImportInfoVivo, subscribeVivoData } = useData();

  // Lazy subscription while mounted
  useEffect(() => {
    const unsubscribe = subscribeVivoData();
    return () => {
      unsubscribe();
    };
  }, [subscribeVivoData]);

  // Search input
  const [searchID, setSearchID] = useState('');

  // Multi-select filters
  const [filterREF, setFilterREF] = useState<string[]>([]);
  const [filterAno, setFilterAno] = useState<string[]>([]);
  const [filterMesInput, setFilterMesInput] = useState<string[]>([]);
  const [filterREG, setFilterREG] = useState<string[]>([]);
  const [filterUF, setFilterUF] = useState<string[]>([]);
  const [filterStatusDraft, setFilterStatusDraft] = useState<string[]>([]);
  const [filterStatusMedFinal, setFilterStatusMedFinal] = useState<string[]>([]);
  const [filterStatusImpl, setFilterStatusImpl] = useState<string[]>([]);
  const [filterRespPendencia, setFilterRespPendencia] = useState<string[]>([]);
  const [filterRespMedicao, setFilterRespMedicao] = useState<string[]>([]);

  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  // Filter check
  const matchesFilterSubset = (item: RegistroVivo, excludeKey?: string) => {
    if (!item || !isValidVivoID(item.ID)) return false;

    if (searchID.trim()) {
      const q = searchID.trim().toLowerCase();
      const idMatch = (item.ID || '').toLowerCase().includes(q);
      const descMatch = (item['Desc.'] || '').toLowerCase().includes(q);
      if (!idMatch && !descMatch) return false;
    }

    if (excludeKey !== 'REF' && filterREF.length > 0) {
      const val = getVivoDisplayOrBlank(item.REF);
      if (!filterREF.includes(val)) return false;
    }
    if (excludeKey !== 'Ano' && filterAno.length > 0) {
      const val = getVivoDisplayOrBlank(item.Ano);
      if (!filterAno.includes(val)) return false;
    }
    if (excludeKey !== 'Mês Input' && filterMesInput.length > 0) {
      const val = normalizeMesInputValue(item['Mês Input']) || VIVO_BLANK_LABEL;
      if (!filterMesInput.includes(val)) return false;
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

  // Options & counts
  const {
    refOptions,
    refCounts,
    anoOptions,
    anoCounts,
    mesInputOptions,
    mesInputCounts,
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
    const cMesInput: Record<string, number> = {};
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

      const rMesInput = normalizeMesInputValue(r['Mês Input']) || VIVO_BLANK_LABEL;
      if (matchesFilterSubset(r, 'Mês Input')) cMesInput[rMesInput] = (cMesInput[rMesInput] || 0) + 1;

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

    const sortMesInputFn = (a: string, b: string) => {
      if (a === VIVO_BLANK_LABEL) return 1;
      if (b === VIVO_BLANK_LABEL) return -1;
      const keyA = parseMesAnoSortKey(a);
      const keyB = parseMesAnoSortKey(b);
      if (keyA !== keyB) return keyA - keyB;
      return a.localeCompare(b, 'pt-BR');
    };

    return {
      refOptions: Object.keys(cRef).sort(sortFn),
      refCounts: cRef,
      anoOptions: Object.keys(cAno).sort(sortAnoFn),
      anoCounts: cAno,
      mesInputOptions: Object.keys(cMesInput).sort(sortMesInputFn),
      mesInputCounts: cMesInput,
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
    filterMesInput,
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
    filterMesInput,
    filterREG,
    filterUF,
    filterStatusDraft,
    filterStatusMedFinal,
    filterStatusImpl,
    filterRespPendencia,
    filterRespMedicao,
  ]);

  const totalValidosBase = useMemo(() => {
    return registrosVivo.filter((r) => r && isValidVivoID(r.ID)).length;
  }, [registrosVivo]);

  const activeFiltersCount =
    (searchID ? 1 : 0) +
    filterREF.length +
    filterAno.length +
    filterMesInput.length +
    filterREG.length +
    filterUF.length +
    filterStatusDraft.length +
    filterStatusMedFinal.length +
    filterStatusImpl.length +
    filterRespPendencia.length +
    filterRespMedicao.length;

  const handleClearFilters = () => {
    setSearchID('');
    setFilterREF([]);
    setFilterAno([]);
    setFilterMesInput([]);
    setFilterREG([]);
    setFilterUF([]);
    setFilterStatusDraft([]);
    setFilterStatusMedFinal([]);
    setFilterStatusImpl([]);
    setFilterRespPendencia([]);
    setFilterRespMedicao([]);
  };

  // Aggregated calculations for VIVO
  const { regionalGroups } = useMemo(() => {
    // Grouping: REG -> RESPONSÁVEL PENDENCIA -> Aggregates
    const groupsMap: Record<
      string,
      Record<
        string,
        {
          regional: string;
          responsavel: string;
          count: number;
          orcamento: number;
          medido: number;
          faturado: number;
        }
      >
    > = {};

    filteredRegistrosVivo.forEach((r) => {
      const o = parseCurrencyValue(r['OSP ORÇAMENTO']);
      const m = parseCurrencyValue(r['OSP MEDIDO']);
      const f = parseCurrencyValue(r['Faturado']);

      const reg = (r.REG || '').trim() || 'SEM REGIONAL';
      const resp = getVivoDisplayOrBlank(r['RESPONSÁVEL PENDENCIA']);

      if (!groupsMap[reg]) {
        groupsMap[reg] = {};
      }
      if (!groupsMap[reg][resp]) {
        groupsMap[reg][resp] = {
          regional: reg,
          responsavel: resp,
          count: 0,
          orcamento: 0,
          medido: 0,
          faturado: 0,
        };
      }

      groupsMap[reg][resp].count++;
      groupsMap[reg][resp].orcamento += o;
      groupsMap[reg][resp].medido += m;
      groupsMap[reg][resp].faturado += f;
    });

    const sortedRegionalGroups = Object.keys(groupsMap)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((reg) => {
        const items = Object.values(groupsMap[reg]).sort((a, b) => {
          if (a.responsavel === VIVO_BLANK_LABEL) return 1;
          if (b.responsavel === VIVO_BLANK_LABEL) return -1;
          return a.responsavel.localeCompare(b.responsavel, 'pt-BR');
        });

        const subtotal = items.reduce(
          (acc, cur) => {
            acc.count += cur.count;
            acc.orcamento += cur.orcamento;
            acc.medido += cur.medido;
            acc.faturado += cur.faturado;
            return acc;
          },
          { count: 0, orcamento: 0, medido: 0, faturado: 0 }
        );

        return {
          regional: reg,
          items,
          subtotal,
        };
      });

    return {
      regionalGroups: sortedRegionalGroups,
    };
  }, [filteredRegistrosVivo]);

  // Helper to drilldown preserving active VIVO filters
  const handleNavigateVivo = (extraFilters: Partial<RegistrosVivoFilterPayload>) => {
    if (!onNavigateToRegistrosVivo) return;

    const payload: RegistrosVivoFilterPayload = {};
    if (searchID.trim()) payload.searchID = searchID.trim();
    if (filterREF.length > 0) payload.ref = [...filterREF];
    if (filterAno.length > 0) payload.ano = [...filterAno];
    if (filterMesInput.length > 0) payload.mesInput = [...filterMesInput];
    if (filterREG.length > 0) payload.reg = [...filterREG];
    if (filterUF.length > 0) payload.uf = [...filterUF];
    if (filterStatusDraft.length > 0) payload.statusDraft = [...filterStatusDraft];
    if (filterStatusMedFinal.length > 0) payload.statusMedFinal = [...filterStatusMedFinal];
    if (filterStatusImpl.length > 0) payload.statusImpl = [...filterStatusImpl];
    if (filterRespPendencia.length > 0) payload.respPendencia = [...filterRespPendencia];
    if (filterRespMedicao.length > 0) payload.respMedicao = [...filterRespMedicao];

    // Merge extra filters
    Object.assign(payload, extraFilters);

    onNavigateToRegistrosVivo(payload);
  };

  const formatBRLNoCents = (val: number): string => {
    return `R$ ${Math.round(val).toLocaleString('pt-BR')}`;
  };

  // Matrix Calculations for Table A & Table B
  const {
    matrixAnos,
    matrixResponsaveis,
    matrixValuesA,
    matrixValuesB,
    rowTotalsA,
    colTotalsA,
    grandTotalA,
    rowTotalsB,
    colTotalsB,
    grandTotalB,
  } = useMemo(() => {
    const anosSet = new Set<string>();
    const respSet = new Set<string>();

    const matA: Record<string, Record<string, number>> = {};
    const matB: Record<string, Record<string, number>> = {};

    const rTotA: Record<string, number> = {};
    const cTotA: Record<string, number> = {};
    let gTotA = 0;

    const rTotB: Record<string, number> = {};
    const cTotB: Record<string, number> = {};
    let gTotB = 0;

    filteredRegistrosVivo.forEach((r) => {
      if (!r || !isValidVivoID(r.ID)) return;

      const ano = getVivoDisplayOrBlank(r.Ano);
      const resp = getVivoDisplayOrBlank(r['RESPONSÁVEL PENDENCIA']);

      anosSet.add(ano);
      respSet.add(resp);

      // Tabela A: OSP MEDIDO quando > 0; se zero ou vazio, OSP ORÇAMENTO
      const medido = parseCurrencyValue(r['OSP MEDIDO']);
      const orcamento = parseCurrencyValue(r['OSP ORÇAMENTO']);
      const valA = medido > 0 ? medido : orcamento;

      if (!matA[ano]) matA[ano] = {};
      matA[ano][resp] = (matA[ano][resp] || 0) + valA;
      rTotA[ano] = (rTotA[ano] || 0) + valA;
      cTotA[resp] = (cTotA[resp] || 0) + valA;
      gTotA += valA;

      // Tabela B: Volumetria de IDs (1 por registro)
      if (!matB[ano]) matB[ano] = {};
      matB[ano][resp] = (matB[ano][resp] || 0) + 1;
      rTotB[ano] = (rTotB[ano] || 0) + 1;
      cTotB[resp] = (cTotB[resp] || 0) + 1;
      gTotB += 1;
    });

    const sortAno = (a: string, b: string) => {
      if (a === VIVO_BLANK_LABEL) return 1;
      if (b === VIVO_BLANK_LABEL) return -1;
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b, 'pt-BR');
    };

    const sortedAnos = Array.from(anosSet).sort(sortAno);
    const sortedResponsaveis = Array.from(respSet).sort(sortVivoResponsaveis);

    return {
      matrixAnos: sortedAnos,
      matrixResponsaveis: sortedResponsaveis,
      matrixValuesA: matA,
      matrixValuesB: matB,
      rowTotalsA: rTotA,
      colTotalsA: cTotA,
      grandTotalA: gTotA,
      rowTotalsB: rTotB,
      colTotalsB: cTotB,
      grandTotalB: gTotB,
    };
  }, [filteredRegistrosVivo]);

  const thStyle: React.CSSProperties = {
    fontSize: 'var(--fs-dash-table-header)',
    paddingTop: 'var(--dash-table-row-py)',
    paddingBottom: 'var(--dash-table-row-py)',
  };

  const tdStyle: React.CSSProperties = {
    fontSize: 'var(--fs-dash-table-cell)',
    paddingTop: 'var(--dash-table-row-py)',
    paddingBottom: 'var(--dash-table-row-py)',
  };

  const badgeStyle: React.CSSProperties = {
    fontSize: 'var(--fs-dash-table-badge)',
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: 'var(--fs-dash-card-title)',
  };

  return (
    <div className="space-y-3.5 font-sans pb-10 min-w-0 max-w-full">
      {/* 1. Painel de Filtros (Estilo idêntico ao da V.TAL) */}
      <div className="bg-white border border-slate-200 shadow-xs py-2.5 px-3.5 rounded-xl transition-all relative">
        <div className="flex flex-col gap-2">
          {/* Row 1: Quick status indicator & Search & Clear */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-xs text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-extrabold text-slate-900 text-sm">
                {filteredRegistrosVivo.length.toLocaleString('pt-BR')}
              </span>
              <span className="text-slate-500 font-medium">
                obras filtradas {totalValidosBase > 0 && `(de ${totalValidosBase.toLocaleString('pt-BR')} totais)`}
              </span>
              {lastImportInfoVivo && (
                <span className="hidden md:inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 rounded-md text-[11px] text-slate-600 border border-slate-200 ml-2">
                  <Database className="w-3 h-3 text-[#002855]" />
                  <span>Matriz: {lastImportInfoVivo.dataHoraFormatada}</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Limpar {activeFiltersCount} filtro(s)</span>
                </button>
              )}

              <button
                onClick={() => setIsFiltersOpen((prev) => !prev)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <Filter className="w-3 h-3 text-slate-500" />
                <span>Filtros</span>
                {isFiltersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Row 2: Collapsible Filters */}
          {isFiltersOpen && (
            <div className="pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-1.5 items-end">
                {/* Search ID/Desc */}
                <div className="w-full min-w-0">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5 truncate">
                    Buscar ID/Descrição
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400">
                      <Search className="h-3 w-3" />
                    </div>
                    <input
                      type="text"
                      placeholder="ID, Descrição..."
                      value={searchID}
                      onChange={(e) => setSearchID(e.target.value)}
                      className="block w-full pl-6 pr-5 py-1 bg-slate-50 border border-slate-300 rounded-md text-[11px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002855] h-[28px]"
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

                <MultiSelectFilter
                  label="REF"
                  options={refOptions}
                  selected={filterREF}
                  optionCounts={refCounts}
                  onChange={setFilterREF}
                  placeholder="Todas"
                />

                <MultiSelectFilter
                  label="Ano"
                  options={anoOptions}
                  selected={filterAno}
                  optionCounts={anoCounts}
                  onChange={setFilterAno}
                  placeholder="Todos"
                />

                <MultiSelectFilter
                  label="Mês Input"
                  options={mesInputOptions}
                  selected={filterMesInput}
                  optionCounts={mesInputCounts}
                  onChange={setFilterMesInput}
                  placeholder="Todos"
                />

                <MultiSelectFilter
                  label="REG"
                  options={regOptions}
                  selected={filterREG}
                  optionCounts={regCounts}
                  onChange={setFilterREG}
                  placeholder="Todas"
                />

                <MultiSelectFilter
                  label="UF"
                  options={ufOptions}
                  selected={filterUF}
                  optionCounts={ufCounts}
                  onChange={setFilterUF}
                  placeholder="Todas"
                />

                <MultiSelectFilter
                  label="Status Draft"
                  options={statusDraftOptions}
                  selected={filterStatusDraft}
                  optionCounts={statusDraftCounts}
                  onChange={setFilterStatusDraft}
                  placeholder="Todos"
                />

                <MultiSelectFilter
                  label="Status Med. Final"
                  options={statusMedFinalOptions}
                  selected={filterStatusMedFinal}
                  optionCounts={statusMedFinalCounts}
                  onChange={setFilterStatusMedFinal}
                  placeholder="Todos"
                />

                <MultiSelectFilter
                  label="STATUS IMPL"
                  options={statusImplOptions}
                  selected={filterStatusImpl}
                  optionCounts={statusImplCounts}
                  onChange={setFilterStatusImpl}
                  placeholder="Todos"
                />

                <MultiSelectFilter
                  label="Resp. Pendência"
                  options={respPendenciaOptions}
                  selected={filterRespPendencia}
                  optionCounts={respPendenciaCounts}
                  onChange={setFilterRespPendencia}
                  placeholder="Todos"
                />

                <MultiSelectFilter
                  label="Resp. Medição"
                  options={respMedicaoOptions}
                  selected={filterRespMedicao}
                  optionCounts={respMedicaoCounts}
                  onChange={setFilterRespMedicao}
                  placeholder="Todos"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. CENTRAL HERO BLOCK: Medição vs. Orçamento por Regional e Responsável (Igual à V.TAL) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100">
          <div>
            <h3
              style={{ fontSize: 'var(--fs-dash-panel-title)' }}
              className="font-extrabold text-slate-900 flex items-center space-x-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#002855]" />
              <span>Medição vs. Orçamento por Regional e Responsável</span>
            </h3>
            <p
              style={{ fontSize: 'var(--fs-dash-panel-subtitle)' }}
              className="text-slate-500 mt-0.5"
            >
              Acompanhamento financeiro detalhado por Regional e Responsável com valores orçados, medidos e faturados.
            </p>
          </div>

          <span
            style={{ fontSize: 'var(--fs-dash-panel-subtitle)' }}
            className="text-slate-500 font-medium"
          >
            Clique nos valores ou quantidades para ver os registros detalhados
          </span>
        </div>

        {/* Content list by Regional */}
        <div className="p-3 space-y-3">
          {regionalGroups.length === 0 ? (
            <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              {loadingRegistrosVivo ? (
                <span>Carregando dados da VIVO...</span>
              ) : totalValidosBase === 0 ? (
                <span>Nenhuma obra cadastrada na base VIVO. Realize a importação na aba "Importação".</span>
              ) : (
                <span>Nenhum dado encontrado para os filtros selecionados.</span>
              )}
            </div>
          ) : (
            regionalGroups.map((group) => (
              <div
                key={group.regional}
                className="rounded-xl border border-slate-200 hover:border-slate-300 bg-white overflow-hidden shadow-2xs transition-all"
              >
                {/* Block Header */}
                <div className="bg-slate-50/90 border-b border-slate-200 px-2.5 py-1 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span
                      style={badgeStyle}
                      className="px-1 py-0.2 rounded bg-[#002855] text-white font-black tracking-wide shadow-2xs"
                    >
                      {group.regional}
                    </span>
                    <span
                      style={cardTitleStyle}
                      className="font-bold text-slate-800"
                    >
                      Regional {group.regional}
                    </span>
                    <span
                      style={{ fontSize: 'var(--fs-dash-panel-subtitle)' }}
                      className="text-slate-500 font-medium"
                    >
                      ({group.items.length} {group.items.length === 1 ? 'responsável' : 'responsáveis'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNavigateVivo({ reg: [group.regional] })}
                    style={cardTitleStyle}
                    className="inline-flex items-center space-x-1 font-bold text-[#002855] hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                    title={`Ver todas as obras da Regional ${group.regional} na aba Registro - (VIVO OBRAS)`}
                  >
                    <span>Ver todas as obras ({group.subtotal.count})</span>
                    <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-left border-collapse font-sans">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-600 uppercase font-bold tracking-wider select-none border-b border-slate-200 whitespace-nowrap">
                        <th style={thStyle} className="px-2.5 text-left font-semibold border-r border-slate-200 w-[100px] whitespace-nowrap">
                          Regional
                        </th>
                        <th style={thStyle} className="px-2.5 text-left font-semibold border-r border-slate-200 min-w-[160px] whitespace-nowrap">
                          Responsável
                        </th>
                        <th style={thStyle} className="px-2.5 text-center font-semibold border-r border-slate-200 w-[90px] whitespace-nowrap">
                          Casos (IDs)
                        </th>
                        <th style={thStyle} className="px-2.5 text-center font-semibold border-r border-slate-200 min-w-[140px] w-[140px] whitespace-nowrap">
                          OSP Orçamento
                        </th>
                        <th style={thStyle} className="px-2.5 text-center font-semibold border-r border-slate-200 min-w-[160px] w-[160px] whitespace-nowrap">
                          Valor Total Medido R$
                        </th>
                        <th style={thStyle} className="px-2.5 text-center font-semibold min-w-[140px] w-[140px] whitespace-nowrap">
                          Valor Faturado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80 text-slate-700">
                      {group.items.map((row, idx) => {
                        const isBlank = isVivoBlank(row.responsavel);
                        const isZebra = idx % 2 === 1;
                        const respFilter = isBlank ? [VIVO_BLANK_LABEL] : [row.responsavel];
                        const respLabel = isBlank ? VIVO_BLANK_LABEL : row.responsavel;

                        return (
                          <tr
                            key={`${row.regional}_${row.responsavel}_${idx}`}
                            className={`transition-colors ${
                              isBlank
                                ? 'bg-[#E0A526]/10 border-l-4 border-l-[#E0A526] font-semibold'
                                : isZebra
                                ? 'bg-[#FAFAFA]'
                                : 'bg-white'
                            } hover:bg-blue-50/40`}
                          >
                            {/* Regional */}
                            <td style={tdStyle} className="px-2.5 font-bold text-slate-900 whitespace-nowrap border-b border-r border-slate-200/80 text-left">
                              <span
                                style={badgeStyle}
                                className="px-1 py-0.2 rounded bg-slate-100 text-slate-800 font-extrabold border border-slate-200"
                              >
                                {row.regional}
                              </span>
                            </td>

                            {/* Responsável */}
                            <td style={tdStyle} className="px-2.5 border-b border-r border-slate-200/80">
                              <div className="flex items-center justify-between">
                                {isBlank ? (
                                  <span
                                    style={badgeStyle}
                                    className="inline-flex items-center gap-1 px-1 py-0.2 rounded bg-[#E0A526]/20 border border-[#E0A526]/40 text-[#855800] font-black italic"
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5 text-[#E0A526]" />
                                    {VIVO_BLANK_LABEL}
                                  </span>
                                ) : (
                                  <span
                                    style={{ fontSize: 'var(--fs-dash-table-cell)' }}
                                    className="font-bold text-slate-900 truncate"
                                  >
                                    {row.responsavel}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleNavigateVivo({
                                      reg: [row.regional],
                                      respPendencia: respFilter,
                                    })
                                  }
                                  className="opacity-0 group-hover:opacity-100 text-[#002855] hover:text-blue-700 p-0.5 rounded transition-opacity cursor-pointer"
                                  title={`Filtrar ${respLabel} (${row.regional}) na aba Registro - (VIVO OBRAS)`}
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </td>

                            {/* Casos (IDs) */}
                            <td
                              onClick={() =>
                                handleNavigateVivo({
                                  reg: [row.regional],
                                  respPendencia: respFilter,
                                  sortBy: 'ID',
                                  sortDirection: 'asc',
                                })
                              }
                              style={tdStyle}
                              className="px-2.5 text-center tabular-nums border-b border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 text-slate-900 font-black transition-colors group"
                              title={`Clique para ver as ${row.count} obras de ${respLabel} (${row.regional}) na aba Registro - (VIVO OBRAS)`}
                            >
                              <span className="inline-block py-0.2 px-1 rounded group-hover:underline">
                                {row.count.toLocaleString('pt-BR')}
                              </span>
                            </td>

                            {/* OSP Orçamento */}
                            <td
                              onClick={() =>
                                handleNavigateVivo({
                                  reg: [row.regional],
                                  respPendencia: respFilter,
                                  sortBy: 'OSP ORÇAMENTO',
                                  sortDirection: 'desc',
                                })
                              }
                              style={tdStyle}
                              className="px-2.5 text-center tabular-nums border-b border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 text-[#002855] font-black transition-colors group"
                              title={`Clique para ver as obras de ${respLabel} (${row.regional}) ordenadas por orçamento`}
                            >
                              <span className="inline-block py-0.2 px-1 rounded group-hover:underline font-black">
                                {formatBRL(row.orcamento)}
                              </span>
                            </td>

                            {/* Valor Total Medido R$ */}
                            <td
                              onClick={() =>
                                handleNavigateVivo({
                                  reg: [row.regional],
                                  respPendencia: respFilter,
                                  sortBy: 'OSP MEDIDO',
                                  sortDirection: 'desc',
                                })
                              }
                              style={tdStyle}
                              className={`px-2.5 text-center tabular-nums border-b border-r border-slate-200/80 transition-colors group ${
                                row.medido > 0
                                  ? 'cursor-pointer hover:bg-emerald-200/70 font-black text-emerald-900'
                                  : 'text-slate-400 font-normal'
                              }`}
                              title={
                                row.medido > 0
                                  ? `Clique para ver as obras medidas de ${respLabel} (${row.regional}) na aba Registro - (VIVO OBRAS)`
                                  : undefined
                              }
                            >
                              <span className={`inline-block py-0.2 px-1 rounded font-black ${row.medido > 0 ? 'group-hover:underline' : ''}`}>
                                {formatBRL(row.medido)}
                              </span>
                            </td>

                            {/* Valor Faturado */}
                            <td
                              onClick={() =>
                                handleNavigateVivo({
                                  reg: [row.regional],
                                  respPendencia: respFilter,
                                  sortBy: 'Faturado',
                                  sortDirection: 'desc',
                                })
                              }
                              style={tdStyle}
                              className={`px-2.5 text-center tabular-nums border-b border-slate-200/80 transition-colors group ${
                                (row.faturado || 0) > 0
                                  ? 'cursor-pointer hover:bg-blue-100/70 font-bold text-slate-900'
                                  : 'text-slate-400 font-normal'
                              }`}
                              title={
                                (row.faturado || 0) > 0
                                  ? `Clique para ver as obras faturadas de ${respLabel} (${row.regional}) na aba Registro - (VIVO OBRAS)`
                                  : undefined
                              }
                            >
                              <span className={`inline-block py-0.2 px-1 rounded ${(row.faturado || 0) > 0 ? 'group-hover:underline' : ''}`}>
                                {formatBRL(row.faturado || 0)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Subtotal Footer */}
                    <tfoot>
                      <tr className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300">
                        <td
                          colSpan={2}
                          style={{
                            fontSize: 'var(--fs-dash-table-header)',
                            paddingTop: 'var(--dash-table-row-py)',
                            paddingBottom: 'var(--dash-table-row-py)',
                          }}
                          className="px-2.5 text-left border-r border-slate-200/80 uppercase font-black tracking-wider text-[#002855]"
                        >
                          Subtotal {group.regional}
                        </td>
                        <td
                          onClick={() =>
                            handleNavigateVivo({
                              reg: [group.regional],
                              sortBy: 'ID',
                              sortDirection: 'asc',
                            })
                          }
                          style={tdStyle}
                          className="px-2.5 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 text-slate-900 font-black transition-colors group"
                          title={`Clique para ver todas as obras da ${group.regional} na aba Registro - (VIVO OBRAS)`}
                        >
                          <span className="inline-block py-0.2 px-1 rounded group-hover:underline font-black">
                            {group.subtotal.count.toLocaleString('pt-BR')}
                          </span>
                        </td>
                        <td
                          onClick={() =>
                            handleNavigateVivo({
                              reg: [group.regional],
                              sortBy: 'OSP ORÇAMENTO',
                              sortDirection: 'desc',
                            })
                          }
                          style={tdStyle}
                          className="px-2.5 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 text-[#002855] font-black transition-colors group"
                          title={`Clique para ver as obras orçadas da ${group.regional} na aba Registro - (VIVO OBRAS)`}
                        >
                          <span className="inline-block py-0.2 px-1 rounded group-hover:underline font-black">
                            {formatBRL(group.subtotal.orcamento)}
                          </span>
                        </td>
                        <td
                          onClick={() =>
                            handleNavigateVivo({
                              reg: [group.regional],
                              sortBy: 'OSP MEDIDO',
                              sortDirection: 'desc',
                            })
                          }
                          style={tdStyle}
                          className="px-2.5 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-emerald-200/70 font-black text-emerald-900 transition-colors group"
                          title={`Clique para ver as obras medidas da ${group.regional} na aba Registro - (VIVO OBRAS)`}
                        >
                          <span className="inline-block py-0.2 px-1 rounded group-hover:underline font-black">
                            {formatBRL(group.subtotal.medido)}
                          </span>
                        </td>
                        <td
                          onClick={() =>
                            handleNavigateVivo({
                              reg: [group.regional],
                              sortBy: 'Faturado',
                              sortDirection: 'desc',
                            })
                          }
                          style={tdStyle}
                          className="px-2.5 text-center tabular-nums cursor-pointer hover:bg-blue-100/70 font-black text-blue-900 transition-colors group"
                          title={`Clique para ver as obras faturadas da ${group.regional} na aba Registro - (VIVO OBRAS)`}
                        >
                          <span className="inline-block py-0.2 px-1 rounded group-hover:underline font-black">
                            {formatBRL(group.subtotal.faturado)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. TABELA A: Valor por Ano e Responsável (OSP Medido; se zero, OSP Orçamento) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100">
          <div>
            <h3
              style={{ fontSize: 'var(--fs-dash-panel-title)' }}
              className="font-extrabold text-slate-900 flex items-center space-x-1.5"
            >
              <DollarSign className="w-3.5 h-3.5 text-[#002855]" />
              <span>Valor por Ano e Responsável (OSP Medido; se zero, OSP Orçamento)</span>
            </h3>
            <p
              style={{ fontSize: 'var(--fs-dash-panel-subtitle)' }}
              className="text-slate-500 mt-0.5"
            >
              Soma do OSP Medido quando maior que zero; se for zero ou vazio, contribui com OSP Orçamento.
            </p>
          </div>

          <span
            style={{ fontSize: 'var(--fs-dash-panel-subtitle)' }}
            className="text-slate-500 font-medium"
          >
            Clique nas células para detalhar as obras na aba Registro
          </span>
        </div>

        <div className="p-3">
          {matrixAnos.length === 0 ? (
            <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              Nenhum dado encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto max-w-full rounded-lg border border-slate-200 custom-scrollbar">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-[#002855] text-white text-[11px] font-bold uppercase tracking-wider select-none border-b border-[#001e40] whitespace-nowrap">
                    {/* Coluna Ano fixa à esquerda */}
                    <th
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 20,
                        backgroundColor: '#002855',
                        whiteSpace: 'nowrap',
                        fontSize: 'var(--fs-dash-table-header)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      className="px-3 text-center align-middle font-bold border-r border-[#001e40] min-w-[130px] w-[130px] whitespace-nowrap shadow-xs"
                    >
                      Ano
                    </th>
                    {matrixResponsaveis.map((resp) => (
                      <th
                        key={resp}
                        style={{
                          fontSize: 'var(--fs-dash-table-header)',
                          paddingTop: 'var(--dash-table-row-py)',
                          paddingBottom: 'var(--dash-table-row-py)',
                        }}
                        className="px-3 text-center align-middle font-bold border-r border-[#001e40] min-w-[130px] whitespace-nowrap"
                        title={resp}
                      >
                        {resp}
                      </th>
                    ))}
                    <th
                      style={{
                        whiteSpace: 'nowrap',
                        fontSize: 'var(--fs-dash-table-header)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      className="px-3 text-center align-middle font-black min-w-[130px] whitespace-nowrap bg-[#001e40] text-cyan-300"
                    >
                      Total Geral
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                  {matrixAnos.map((ano) => {
                    const rowTot = rowTotalsA[ano] || 0;
                    return (
                      <tr key={ano} className="hover:bg-blue-50/30 transition-colors">
                        {/* Ano (sticky left) */}
                        <td
                          style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 10,
                            backgroundColor: '#ffffff',
                            whiteSpace: 'nowrap',
                            fontSize: 'var(--fs-dash-table-cell)',
                            paddingTop: 'var(--dash-table-row-py)',
                            paddingBottom: 'var(--dash-table-row-py)',
                          }}
                          onClick={() => handleNavigateVivo({ ano: [ano] })}
                          className="px-3 text-center align-middle font-extrabold text-[#002855] border-r border-slate-100 min-w-[130px] w-[130px] whitespace-nowrap shadow-2xs cursor-pointer hover:underline bg-white"
                          title={`Filtrar obras do ano ${ano}`}
                        >
                          {ano}
                        </td>

                        {/* Colunas Responsáveis */}
                        {matrixResponsaveis.map((resp) => {
                          const val = matrixValuesA[ano]?.[resp] || 0;
                          return (
                            <td
                              key={resp}
                              style={{
                                fontSize: 'var(--fs-dash-table-cell)',
                                paddingTop: 'var(--dash-table-row-py)',
                                paddingBottom: 'var(--dash-table-row-py)',
                              }}
                              onClick={() => {
                                if (val > 0) {
                                  handleNavigateVivo({ ano: [ano], respPendencia: [resp] });
                                }
                              }}
                              className={`px-3 text-center align-middle tabular-nums border-r border-slate-100 min-w-[130px] whitespace-nowrap ${
                                val > 0
                                  ? 'cursor-pointer hover:bg-blue-100/70 font-semibold text-slate-800 hover:text-[#002855] transition-colors'
                                  : 'text-slate-300 font-normal select-none'
                              }`}
                              title={
                                val > 0
                                  ? `Filtrar obras de ${resp} no ano ${ano}: ${formatBRLNoCents(val)}`
                                  : undefined
                              }
                            >
                              {val > 0 ? formatBRLNoCents(val) : '—'}
                            </td>
                          );
                        })}

                        {/* Total Geral da Linha */}
                        <td
                          style={{
                            whiteSpace: 'nowrap',
                            fontSize: 'var(--fs-dash-table-cell)',
                            paddingTop: 'var(--dash-table-row-py)',
                            paddingBottom: 'var(--dash-table-row-py)',
                          }}
                          onClick={() => {
                            if (rowTot > 0) {
                              handleNavigateVivo({ ano: [ano] });
                            }
                          }}
                          className={`px-3 text-center align-middle tabular-nums font-bold min-w-[130px] whitespace-nowrap bg-slate-50 ${
                            rowTot > 0
                              ? 'cursor-pointer hover:bg-blue-100/70 text-slate-900 transition-colors'
                              : 'text-slate-400'
                          }`}
                          title={rowTot > 0 ? `Filtrar todas as obras do ano ${ano}` : undefined}
                        >
                          {rowTot > 0 ? formatBRLNoCents(rowTot) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                    {/* Total Geral Cabeçalho Linha Footer (sticky left) */}
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 10,
                        backgroundColor: '#f8fafc',
                        whiteSpace: 'nowrap',
                        fontSize: 'var(--fs-dash-table-header)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      onClick={() => handleNavigateVivo({})}
                      className="px-3 text-center align-middle font-black text-[#002855] border-r border-slate-200 uppercase tracking-wider bg-slate-50 min-w-[130px] w-[130px] whitespace-nowrap shadow-2xs cursor-pointer hover:underline"
                      title="Clique para ver todas as obras filtradas"
                    >
                      Total Geral
                    </td>

                    {/* Totais de Cada Coluna Responsável */}
                    {matrixResponsaveis.map((resp) => {
                      const colTot = colTotalsA[resp] || 0;
                      return (
                        <td
                          key={resp}
                          style={{
                            fontSize: 'var(--fs-dash-table-cell)',
                            paddingTop: 'var(--dash-table-row-py)',
                            paddingBottom: 'var(--dash-table-row-py)',
                          }}
                          onClick={() => {
                            if (colTot > 0) {
                              handleNavigateVivo({ respPendencia: [resp] });
                            }
                          }}
                          className={`px-3 text-center align-middle tabular-nums font-bold border-r border-slate-200 min-w-[130px] whitespace-nowrap ${
                            colTot > 0
                              ? 'cursor-pointer hover:bg-blue-100/70 text-slate-900 transition-colors'
                              : 'text-slate-400'
                          }`}
                          title={colTot > 0 ? `Filtrar todas as obras de ${resp}` : undefined}
                        >
                          {colTot > 0 ? formatBRLNoCents(colTot) : '—'}
                        </td>
                      );
                    })}

                    {/* Total Geral do Footer */}
                    <td
                      style={{
                        whiteSpace: 'nowrap',
                        fontSize: 'var(--fs-dash-table-cell)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      onClick={() => handleNavigateVivo({})}
                      className="px-3 text-center align-middle tabular-nums font-black text-[#002855] bg-slate-100 min-w-[130px] whitespace-nowrap cursor-pointer hover:bg-blue-200/70 transition-colors"
                      title="Ver todas as obras com os filtros atuais"
                    >
                      {formatBRLNoCents(grandTotalA)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 5. TABELA B: Volumetria de IDs por Ano e Responsável */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100">
          <div>
            <h3
              style={{ fontSize: 'var(--fs-dash-panel-title)' }}
              className="font-extrabold text-slate-900 flex items-center space-x-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-[#002855]" />
              <span>Volumetria de IDs por Ano e Responsável</span>
            </h3>
            <p
              style={{ fontSize: 'var(--fs-dash-panel-subtitle)' }}
              className="text-slate-500 mt-0.5"
            >
              Contagem total de obras (IDs) distribuídas por Ano e Responsável.
            </p>
          </div>

          <span
            style={{ fontSize: 'var(--fs-dash-panel-subtitle)' }}
            className="text-slate-500 font-medium"
          >
            Clique nas células para detalhar as obras na aba Registro
          </span>
        </div>

        <div className="p-3">
          {matrixAnos.length === 0 ? (
            <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              Nenhum dado encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto max-w-full rounded-lg border border-slate-200 custom-scrollbar">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-[#002855] text-white text-[11px] font-bold uppercase tracking-wider select-none border-b border-[#001e40] whitespace-nowrap">
                    {/* Coluna Ano fixa à esquerda */}
                    <th
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 20,
                        backgroundColor: '#002855',
                        whiteSpace: 'nowrap',
                        fontSize: 'var(--fs-dash-table-header)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      className="px-3 text-center align-middle font-bold border-r border-[#001e40] min-w-[130px] w-[130px] whitespace-nowrap shadow-xs"
                    >
                      Ano
                    </th>
                    {matrixResponsaveis.map((resp) => (
                      <th
                        key={resp}
                        style={{
                          fontSize: 'var(--fs-dash-table-header)',
                          paddingTop: 'var(--dash-table-row-py)',
                          paddingBottom: 'var(--dash-table-row-py)',
                        }}
                        className="px-3 text-center align-middle font-bold border-r border-[#001e40] min-w-[130px] whitespace-nowrap"
                        title={resp}
                      >
                        {resp}
                      </th>
                    ))}
                    <th
                      style={{
                        whiteSpace: 'nowrap',
                        fontSize: 'var(--fs-dash-table-header)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      className="px-3 text-center align-middle font-black min-w-[130px] whitespace-nowrap bg-[#001e40] text-cyan-300"
                    >
                      Total Geral
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                  {matrixAnos.map((ano) => {
                    const rowTot = rowTotalsB[ano] || 0;
                    return (
                      <tr key={ano} className="hover:bg-blue-50/30 transition-colors">
                        {/* Ano (sticky left) */}
                        <td
                          style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 10,
                            backgroundColor: '#ffffff',
                            whiteSpace: 'nowrap',
                            fontSize: 'var(--fs-dash-table-cell)',
                            paddingTop: 'var(--dash-table-row-py)',
                            paddingBottom: 'var(--dash-table-row-py)',
                          }}
                          onClick={() => handleNavigateVivo({ ano: [ano] })}
                          className="px-3 text-center align-middle font-extrabold text-[#002855] border-r border-slate-100 min-w-[130px] w-[130px] whitespace-nowrap shadow-2xs cursor-pointer hover:underline bg-white"
                          title={`Filtrar obras do ano ${ano}`}
                        >
                          {ano}
                        </td>

                        {/* Colunas Responsáveis */}
                        {matrixResponsaveis.map((resp) => {
                          const count = matrixValuesB[ano]?.[resp] || 0;
                          return (
                            <td
                              key={resp}
                              style={{
                                fontSize: 'var(--fs-dash-table-cell)',
                                paddingTop: 'var(--dash-table-row-py)',
                                paddingBottom: 'var(--dash-table-row-py)',
                              }}
                              onClick={() => {
                                if (count > 0) {
                                  handleNavigateVivo({ ano: [ano], respPendencia: [resp] });
                                }
                              }}
                              className={`px-3 text-center align-middle tabular-nums border-r border-slate-100 min-w-[130px] whitespace-nowrap ${
                                count > 0
                                  ? 'cursor-pointer hover:bg-blue-100/70 font-bold text-slate-800 hover:text-[#002855] transition-colors'
                                  : 'text-slate-300 font-normal select-none'
                              }`}
                              title={
                                count > 0
                                  ? `Filtrar ${count} obra(s) de ${resp} no ano ${ano}`
                                  : undefined
                              }
                            >
                              {count > 0 ? count.toLocaleString('pt-BR') : '—'}
                            </td>
                          );
                        })}

                        {/* Total Geral da Linha */}
                        <td
                          style={{
                            whiteSpace: 'nowrap',
                            fontSize: 'var(--fs-dash-table-cell)',
                            paddingTop: 'var(--dash-table-row-py)',
                            paddingBottom: 'var(--dash-table-row-py)',
                          }}
                          onClick={() => {
                            if (rowTot > 0) {
                              handleNavigateVivo({ ano: [ano] });
                            }
                          }}
                          className={`px-3 text-center align-middle tabular-nums font-black min-w-[130px] whitespace-nowrap bg-slate-50 ${
                            rowTot > 0
                              ? 'cursor-pointer hover:bg-blue-100/70 text-slate-900 transition-colors'
                              : 'text-slate-400'
                          }`}
                          title={rowTot > 0 ? `Filtrar todas as ${rowTot} obras do ano ${ano}` : undefined}
                        >
                          {rowTot > 0 ? rowTot.toLocaleString('pt-BR') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                    {/* Total Geral Cabeçalho Linha Footer (sticky left) */}
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 10,
                        backgroundColor: '#f8fafc',
                        whiteSpace: 'nowrap',
                        fontSize: 'var(--fs-dash-table-header)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      onClick={() => handleNavigateVivo({})}
                      className="px-3 text-center align-middle font-black text-[#002855] border-r border-slate-200 uppercase tracking-wider bg-slate-50 min-w-[130px] w-[130px] whitespace-nowrap shadow-2xs cursor-pointer hover:underline"
                      title="Clique para ver todas as obras filtradas"
                    >
                      Total Geral
                    </td>

                    {/* Totais de Cada Coluna Responsável */}
                    {matrixResponsaveis.map((resp) => {
                      const colTot = colTotalsB[resp] || 0;
                      return (
                        <td
                          key={resp}
                          style={{
                            fontSize: 'var(--fs-dash-table-cell)',
                            paddingTop: 'var(--dash-table-row-py)',
                            paddingBottom: 'var(--dash-table-row-py)',
                          }}
                          onClick={() => {
                            if (colTot > 0) {
                              handleNavigateVivo({ respPendencia: [resp] });
                            }
                          }}
                          className={`px-3 text-center align-middle tabular-nums font-black border-r border-slate-200 min-w-[130px] whitespace-nowrap ${
                            colTot > 0
                              ? 'cursor-pointer hover:bg-blue-100/70 text-slate-900 transition-colors'
                              : 'text-slate-400'
                          }`}
                          title={colTot > 0 ? `Filtrar todas as ${colTot} obras de ${resp}` : undefined}
                        >
                          {colTot > 0 ? colTot.toLocaleString('pt-BR') : '—'}
                        </td>
                      );
                    })}

                    {/* Total Geral do Footer */}
                    <td
                      style={{
                        whiteSpace: 'nowrap',
                        fontSize: 'var(--fs-dash-table-cell)',
                        paddingTop: 'var(--dash-table-row-py)',
                        paddingBottom: 'var(--dash-table-row-py)',
                      }}
                      onClick={() => handleNavigateVivo({})}
                      className="px-3 text-center align-middle tabular-nums font-black text-[#002855] bg-slate-100 min-w-[130px] whitespace-nowrap cursor-pointer hover:bg-blue-200/70 transition-colors"
                      title="Ver todas as obras com os filtros atuais"
                    >
                      {grandTotalB.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 6. TABELA OBRAS INPUT (VOLUME) - VIVO */}
      <ObrasInputVivoTable
        registros={filteredRegistrosVivo}
        onNavigate={handleNavigateVivo}
      />
    </div>
  );
};
