import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { MultiSelectFilter } from '../Registros/MultiSelectFilter';
import { parseCurrencyValue, formatBRL } from '../../utils/currency';
import {
  RegistroVivo,
  RegistrosVivoFilterPayload,
  isValidVivoID,
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
  CheckCircle2,
  TrendingUp,
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
      const val = (item.REF || '').trim() || '(Em branco)';
      if (!filterREF.includes(val)) return false;
    }
    if (excludeKey !== 'REG' && filterREG.length > 0) {
      const val = (item.REG || '').trim() || '(Em branco)';
      if (!filterREG.includes(val)) return false;
    }
    if (excludeKey !== 'UF' && filterUF.length > 0) {
      const val = (item.UF || '').trim() || '(Em branco)';
      if (!filterUF.includes(val)) return false;
    }
    if (excludeKey !== 'Status Draft' && filterStatusDraft.length > 0) {
      const val = (item['Status Draft'] || '').trim() || '(Em branco)';
      if (!filterStatusDraft.includes(val)) return false;
    }
    if (excludeKey !== 'Status Medição Final' && filterStatusMedFinal.length > 0) {
      const val = (item['Status Medição Final'] || '').trim() || '(Em branco)';
      if (!filterStatusMedFinal.includes(val)) return false;
    }
    if (excludeKey !== 'STATUS IMPL' && filterStatusImpl.length > 0) {
      const val = (item['STATUS IMPL'] || '').trim() || '(Em branco)';
      if (!filterStatusImpl.includes(val)) return false;
    }
    if (excludeKey !== 'RESPONSÁVEL PENDENCIA' && filterRespPendencia.length > 0) {
      const val = (item['RESPONSÁVEL PENDENCIA'] || '').trim() || '(Em branco)';
      if (!filterRespPendencia.includes(val)) return false;
    }
    if (excludeKey !== 'RESPONSÁVEL MEDIÇÃO' && filterRespMedicao.length > 0) {
      const val = (item['RESPONSÁVEL MEDIÇÃO'] || '').trim() || '(Em branco)';
      if (!filterRespMedicao.includes(val)) return false;
    }

    return true;
  };

  // Options & counts
  const {
    refOptions,
    refCounts,
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
    const cReg: Record<string, number> = {};
    const cUf: Record<string, number> = {};
    const cDraft: Record<string, number> = {};
    const cMedFin: Record<string, number> = {};
    const cImpl: Record<string, number> = {};
    const cRespPend: Record<string, number> = {};
    const cRespMed: Record<string, number> = {};

    registrosVivo.forEach((r) => {
      if (!r || !isValidVivoID(r.ID)) return;

      const rRef = (r.REF || '').trim() || '(Em branco)';
      if (matchesFilterSubset(r, 'REF')) cRef[rRef] = (cRef[rRef] || 0) + 1;

      const rReg = (r.REG || '').trim() || '(Em branco)';
      if (matchesFilterSubset(r, 'REG')) cReg[rReg] = (cReg[rReg] || 0) + 1;

      const rUf = (r.UF || '').trim() || '(Em branco)';
      if (matchesFilterSubset(r, 'UF')) cUf[rUf] = (cUf[rUf] || 0) + 1;

      const rDraft = (r['Status Draft'] || '').trim() || '(Em branco)';
      if (matchesFilterSubset(r, 'Status Draft')) cDraft[rDraft] = (cDraft[rDraft] || 0) + 1;

      const rMedFin = (r['Status Medição Final'] || '').trim() || '(Em branco)';
      if (matchesFilterSubset(r, 'Status Medição Final')) cMedFin[rMedFin] = (cMedFin[rMedFin] || 0) + 1;

      const rImpl = (r['STATUS IMPL'] || '').trim() || '(Em branco)';
      if (matchesFilterSubset(r, 'STATUS IMPL')) cImpl[rImpl] = (cImpl[rImpl] || 0) + 1;

      const rRespPend = (r['RESPONSÁVEL PENDENCIA'] || '').trim() || '(Em branco)';
      if (matchesFilterSubset(r, 'RESPONSÁVEL PENDENCIA')) cRespPend[rRespPend] = (cRespPend[rRespPend] || 0) + 1;

      const rRespMed = (r['RESPONSÁVEL MEDIÇÃO'] || '').trim() || '(Em branco)';
      if (matchesFilterSubset(r, 'RESPONSÁVEL MEDIÇÃO')) cRespMed[rRespMed] = (cRespMed[rRespMed] || 0) + 1;
    });

    const sortFn = (a: string, b: string) => {
      if (a === '(Em branco)') return 1;
      if (b === '(Em branco)') return -1;
      return a.localeCompare(b, 'pt-BR');
    };

    return {
      refOptions: Object.keys(cRef).sort(sortFn),
      refCounts: cRef,
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
    setFilterREG([]);
    setFilterUF([]);
    setFilterStatusDraft([]);
    setFilterStatusMedFinal([]);
    setFilterStatusImpl([]);
    setFilterRespPendencia([]);
    setFilterRespMedicao([]);
  };

  // Aggregated calculations for VIVO
  const {
    totalOrcamento,
    totalMedido,
    totalFaturado,
    totalProducaoBi,
    pctMedido,
    regionalStats,
    regionalGroups,
  } = useMemo(() => {
    let orc = 0;
    let med = 0;
    let fat = 0;
    let prod = 0;

    const regCountMap: Record<string, number> = {};

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
      const p = parseCurrencyValue(r['Produção Bi R$']);

      orc += o;
      med += m;
      fat += f;
      prod += p;

      const reg = (r.REG || '').trim() || 'SEM REGIONAL';
      regCountMap[reg] = (regCountMap[reg] || 0) + 1;

      const resp = (r['RESPONSÁVEL PENDENCIA'] || '').trim() || '(EM BRANCO)';

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
          if (a.responsavel === '(EM BRANCO)') return 1;
          if (b.responsavel === '(EM BRANCO)') return -1;
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

    const regStats = Object.entries(regCountMap)
      .map(([regional, count]) => ({ regional, count }))
      .sort((a, b) => b.count - a.count);

    const pct = orc > 0 ? ((med / orc) * 100).toFixed(1) : '0.0';

    return {
      totalOrcamento: orc,
      totalMedido: med,
      totalFaturado: fat,
      totalProducaoBi: prod,
      pctMedido: pct,
      regionalStats: regStats,
      regionalGroups: sortedRegionalGroups,
    };
  }, [filteredRegistrosVivo]);

  // Helper to drilldown preserving active VIVO filters
  const handleNavigateVivo = (extraFilters: Partial<RegistrosVivoFilterPayload>) => {
    if (!onNavigateToRegistrosVivo) return;

    const payload: RegistrosVivoFilterPayload = {};
    if (searchID.trim()) payload.searchID = searchID.trim();
    if (filterREF.length > 0) payload.ref = [...filterREF];
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-1.5 items-end">
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

      {/* 2. KPI TOP ROW: 4 Clean, Balanced Cards (Igual à V.TAL, sem Saldo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-0.5">
        {/* Card 1: TOTAL DE OBRAS */}
        <div
          onClick={() => handleNavigateVivo({ sortBy: 'ID', sortDirection: 'asc' })}
          className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all group"
          title="Clique para ver todos os registros filtrados na aba Registro - (VIVO OBRAS)"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block group-hover:text-blue-700 transition-colors">
                Total de Obras
              </span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {filteredRegistrosVivo.length.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#002855] flex items-center justify-center font-bold shrink-0 group-hover:bg-blue-50 transition-colors">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            {regionalStats.slice(0, 3).map((reg) => (
              <span key={reg.regional} className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-700 text-[10px]">
                {reg.regional}: {reg.count}
              </span>
            ))}
            {regionalStats.length > 3 && (
              <span className="text-slate-400 text-[10px]">+{regionalStats.length - 3} reg.</span>
            )}
          </div>
        </div>

        {/* Card 2: OSP ORÇAMENTO TOTAL (Rodapé: Faturado, sem Saldo) */}
        <div
          onClick={() => handleNavigateVivo({ sortBy: 'OSP ORÇAMENTO', sortDirection: 'desc' })}
          className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all group"
          title="Clique para ver registros ordenados por orçamento na aba Registro - (VIVO OBRAS)"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block group-hover:text-blue-700 transition-colors">
                OSP Orçamento Total
              </span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block truncate" title={formatBRL(totalOrcamento)}>
                {formatBRL(totalOrcamento)}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#002855] flex items-center justify-center font-bold shrink-0">
              <DollarSign className="w-4 h-4 text-[#002855]" />
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Faturado: <strong className="text-blue-700 font-bold">{formatBRL(totalFaturado)}</strong></span>
          </div>
        </div>

        {/* Card 3: OSP MEDIDO TOTAL (Selo com % em relação ao orçamento) */}
        <div
          onClick={() => handleNavigateVivo({ sortBy: 'OSP MEDIDO', sortDirection: 'desc' })}
          className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-emerald-400 hover:shadow-sm cursor-pointer transition-all group"
          title="Clique para ver obras ordenadas por valor medido na aba Registro - (VIVO OBRAS)"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                OSP Medido Total
              </span>
              <span className="text-xl font-black text-emerald-700 mt-0.5 block truncate" title={formatBRL(totalMedido)}>
                {formatBRL(totalMedido)}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
              {pctMedido}%
            </span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Base VIVO Medição</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        </div>

        {/* Card 4: PRODUÇÃO BI R$ */}
        <div
          onClick={() => handleNavigateVivo({ sortBy: 'Produção Bi R$', sortDirection: 'desc' })}
          className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-400 hover:shadow-sm cursor-pointer transition-all group"
          title="Clique para ver registros ordenados por Produção BI R$"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Produção BI R$
              </span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block truncate" title={formatBRL(totalProducaoBi)}>
                {formatBRL(totalProducaoBi)}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#002855] flex items-center justify-center font-bold shrink-0">
              <TrendingUp className="w-4 h-4 text-[#002855]" />
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Base VIVO</span>
          </div>
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
                        const isBlank = row.responsavel === '(EM BRANCO)';
                        const isZebra = idx % 2 === 1;
                        const respFilter = isBlank ? ['(EM BRANCO)'] : [row.responsavel];
                        const respLabel = isBlank ? '(EM BRANCO)' : row.responsavel;

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
                                    (EM BRANCO)
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
    </div>
  );
};
