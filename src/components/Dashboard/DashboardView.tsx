import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { MultiSelectFilter } from '../Registros/MultiSelectFilter';
import { parseCurrencyValue, formatBRL } from '../../utils/currency';
import {
  LayoutDashboard,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  MapPin,
  DollarSign,
  UserCheck,
  Search,
  X,
  Database,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Building2,
  FileCheck,
  Sparkles,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { registros, lastImportInfo, loadingRegistros } = useData();

  // 1. Search by DC
  const [searchDC, setSearchDC] = useState('');

  // 2. 7 Multi-Select Filters (identical to RegistrosView)
  const [filterRegional, setFilterRegional] = useState<string[]>([]);
  const [filterUF, setFilterUF] = useState<string[]>([]);
  const [filterAging, setFilterAging] = useState<string[]>([]);
  const [filterStatusAtual, setFilterStatusAtual] = useState<string[]>([]);
  const [filterStatusInforme, setFilterStatusInforme] = useState<string[]>([]);
  const [filterResponsavel, setFilterResponsavel] = useState<string[]>([]);
  const [filterTipoProjeto, setFilterTipoProjeto] = useState<string[]>([]);

  // Unique options & counts for filters
  const {
    regionalOptions,
    regionalCounts,
    ufOptions,
    ufCounts,
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
    const agCounts: Record<string, number> = {};
    const stAtualCounts: Record<string, number> = {};
    const stInfCounts: Record<string, number> = {};
    const respCounts: Record<string, number> = {};
    const projCounts: Record<string, number> = {};

    registros.forEach((r) => {
      if (r.REG) {
        const val = r.REG.trim().toUpperCase();
        regCounts[val] = (regCounts[val] || 0) + 1;
      }
      if (r.UF) {
        const val = r.UF.trim().toUpperCase();
        uCounts[val] = (uCounts[val] || 0) + 1;
      }
      if (r.AGING) {
        const val = r.AGING.trim().toUpperCase();
        agCounts[val] = (agCounts[val] || 0) + 1;
      }
      if (r['Status da DC (Atual)']) {
        const val = r['Status da DC (Atual)'].trim().toUpperCase();
        stAtualCounts[val] = (stAtualCounts[val] || 0) + 1;
      }
      if (r['Status Informe (Campo)']) {
        const val = r['Status Informe (Campo)'].trim().toUpperCase();
        stInfCounts[val] = (stInfCounts[val] || 0) + 1;
      }
      if (r.Responsavel) {
        const val = r.Responsavel.trim().toUpperCase();
        respCounts[val] = (respCounts[val] || 0) + 1;
      }
      if (r['Tipo de Projeto']) {
        const val = r['Tipo de Projeto'].trim();
        projCounts[val] = (projCounts[val] || 0) + 1;
      }
    });

    return {
      regionalOptions: Object.keys(regCounts).sort(),
      regionalCounts: regCounts,
      ufOptions: Object.keys(uCounts).sort(),
      ufCounts: uCounts,
      agingOptions: Object.keys(agCounts).sort(),
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
  }, [registros]);

  // Filter registros based on the 8 filter criteria
  const filteredRegistros = useMemo(() => {
    return registros.filter((item) => {
      // 1. Search DC / Descrição
      if (searchDC.trim()) {
        const term = searchDC.trim().toLowerCase();
        const itemDC = (item.DC || '').toString().toLowerCase();
        const itemDesc = (item.Descricao || '').toString().toLowerCase();
        if (!itemDC.includes(term) && !itemDesc.includes(term)) return false;
      }

      // 2. Regional
      if (
        filterRegional.length > 0 &&
        (!item.REG || !filterRegional.includes(item.REG.trim().toUpperCase()))
      ) {
        return false;
      }

      // 3. UF
      if (
        filterUF.length > 0 &&
        (!item.UF || !filterUF.includes(item.UF.trim().toUpperCase()))
      ) {
        return false;
      }

      // 4. AGING
      if (
        filterAging.length > 0 &&
        (!item.AGING || !filterAging.includes(item.AGING.trim().toUpperCase()))
      ) {
        return false;
      }

      // 5. Status DC Atual
      if (
        filterStatusAtual.length > 0 &&
        (!item['Status da DC (Atual)'] ||
          !filterStatusAtual.includes(item['Status da DC (Atual)'].trim().toUpperCase()))
      ) {
        return false;
      }

      // 6. Status Informe (Campo)
      if (
        filterStatusInforme.length > 0 &&
        (!item['Status Informe (Campo)'] ||
          !filterStatusInforme.includes(item['Status Informe (Campo)'].trim().toUpperCase()))
      ) {
        return false;
      }

      // 7. Responsável
      if (
        filterResponsavel.length > 0 &&
        (!item.Responsavel ||
          !filterResponsavel.includes(item.Responsavel.trim().toUpperCase()))
      ) {
        return false;
      }

      // 8. Tipo de Projeto
      if (
        filterTipoProjeto.length > 0 &&
        (!item['Tipo de Projeto'] ||
          !filterTipoProjeto.includes(item['Tipo de Projeto'].trim()))
      ) {
        return false;
      }

      return true;
    });
  }, [
    registros,
    searchDC,
    filterRegional,
    filterUF,
    filterAging,
    filterStatusAtual,
    filterStatusInforme,
    filterResponsavel,
    filterTipoProjeto,
  ]);

  const handleClearFilters = () => {
    setSearchDC('');
    setFilterRegional([]);
    setFilterUF([]);
    setFilterAging([]);
    setFilterStatusAtual([]);
    setFilterStatusInforme([]);
    setFilterResponsavel([]);
    setFilterTipoProjeto([]);
  };

  const activeFiltersCount =
    (searchDC ? 1 : 0) +
    filterRegional.length +
    filterUF.length +
    filterAging.length +
    filterStatusAtual.length +
    filterStatusInforme.length +
    filterResponsavel.length +
    filterTipoProjeto.length;

  // Calculate Metrics & Aggregations
  const {
    totalDcs,
    totalOrcamento,
    totalParcial,
    totalFinal,
    totalMedido,
    pctMedido,
    concluidasCount,
    emExecucaoCount,
    pendentesCount,
    regionalStats,
    statusInformeStats,
    responsavelStats,
    ufStats,
    medicaoStatusStats,
  } = useMemo(() => {
    let orc = 0;
    let parc = 0;
    let fin = 0;
    let concl = 0;
    let exec = 0;
    let pend = 0;

    const regMap: Record<
      string,
      { count: number; orcamento: number; medido: number; concluidas: number }
    > = {};
    const stInfMap: Record<
      string,
      { count: number; orcamento: number; medido: number }
    > = {};
    const respMap: Record<
      string,
      { count: number; orcamento: number; medido: number; concluidas: number }
    > = {};
    const uMap: Record<
      string,
      { count: number; orcamento: number; medido: number }
    > = {};
    const medStatusMap: Record<string, number> = {};

    filteredRegistros.forEach((r) => {
      const o = parseCurrencyValue(r.Orçamento);
      const p = parseCurrencyValue(r['Valor Parcial R$']);
      const f = parseCurrencyValue(r['Valor Final R$']);
      const m = p + f;

      orc += o;
      parc += p;
      fin += f;

      // Status Informe (Campo) - Concluída / Execução / Pendência
      const stInf = (r['Status Informe (Campo)'] || 'NÃO INFORMADO').trim().toUpperCase();
      const isConcl = stInf.includes('CONCLU') || stInf.includes('FINALIZ') || stInf === 'OK';
      const isExec = stInf.includes('EXECU') || stInf.includes('ANDAMENTO') || stInf.includes('INICIAD');

      if (isConcl) {
        concl++;
      } else if (isExec) {
        exec++;
      } else {
        pend++;
      }

      // Group Regional
      const reg = (r.REG || 'SEM REGIONAL').trim().toUpperCase();
      if (!regMap[reg]) {
        regMap[reg] = { count: 0, orcamento: 0, medido: 0, concluidas: 0 };
      }
      regMap[reg].count++;
      regMap[reg].orcamento += o;
      regMap[reg].medido += m;
      if (isConcl) regMap[reg].concluidas++;

      // Group Status Informe
      if (!stInfMap[stInf]) {
        stInfMap[stInf] = { count: 0, orcamento: 0, medido: 0 };
      }
      stInfMap[stInf].count++;
      stInfMap[stInf].orcamento += o;
      stInfMap[stInf].medido += m;

      // Group Responsável
      const resp = (r.Responsavel || 'NÃO ATRIBUÍDO').trim().toUpperCase();
      if (!respMap[resp]) {
        respMap[resp] = { count: 0, orcamento: 0, medido: 0, concluidas: 0 };
      }
      respMap[resp].count++;
      respMap[resp].orcamento += o;
      respMap[resp].medido += m;
      if (isConcl) respMap[resp].concluidas++;

      // Group UF
      const uf = (r.UF || 'OUTRO').trim().toUpperCase();
      if (!uMap[uf]) {
        uMap[uf] = { count: 0, orcamento: 0, medido: 0 };
      }
      uMap[uf].count++;
      uMap[uf].orcamento += o;
      uMap[uf].medido += m;

      // Group Status Medição Parcial / Final
      const stMedParc = r['Status Med. Parcial'] || 'N/I';
      medStatusMap[stMedParc] = (medStatusMap[stMedParc] || 0) + 1;
    });

    const totMed = parc + fin;
    const pMed = orc > 0 ? ((totMed / orc) * 100).toFixed(1) : '0.0';

    return {
      totalDcs: filteredRegistros.length,
      totalOrcamento: orc,
      totalParcial: parc,
      totalFinal: fin,
      totalMedido: totMed,
      pctMedido: pMed,
      concluidasCount: concl,
      emExecucaoCount: exec,
      pendentesCount: pend,
      regionalStats: Object.entries(regMap)
        .map(([key, data]) => ({ regional: key, ...data }))
        .sort((a, b) => b.orcamento - a.orcamento),
      statusInformeStats: Object.entries(stInfMap)
        .map(([key, data]) => ({ status: key, ...data }))
        .sort((a, b) => b.count - a.count),
      responsavelStats: Object.entries(respMap)
        .map(([key, data]) => ({ responsavel: key, ...data }))
        .sort((a, b) => b.count - a.count),
      ufStats: Object.entries(uMap)
        .map(([key, data]) => ({ uf: key, ...data }))
        .sort((a, b) => b.count - a.count),
      medicaoStatusStats: medStatusMap,
    };
  }, [filteredRegistros]);

  return (
    <div className="space-y-4 font-sans">
      {/* Top Banner Status with Last Import info */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-600 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span>
              <strong className="text-slate-900 font-semibold">
                {totalDcs.toLocaleString('pt-BR')}
              </strong>{' '}
              obras exibidas no painel {activeFiltersCount > 0 && `(de ${registros.length.toLocaleString('pt-BR')} totais)`}
            </span>
          </div>

          {lastImportInfo && (
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-[11px]">
              <Database className="w-3 h-3 text-[#1a56db]" />
              <span>
                Última Matriz:{' '}
                <strong className="text-slate-900 font-semibold">
                  {lastImportInfo.dataHoraFormatada}
                </strong>
              </span>
            </div>
          )}
        </div>

        {activeFiltersCount > 0 && (
          <button
            onClick={handleClearFilters}
            className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpar {activeFiltersCount} Filtro(s)</span>
          </button>
        )}
      </div>

      {/* Main Filter & Search Control Panel (Identical to RegistrosView) */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/90 space-y-3.5">
        {/* Row 1: Search by DC */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              id="search-dc-dashboard"
              type="text"
              placeholder="Buscar por DC específica (ex: DC12345)..."
              value={searchDC}
              onChange={(e) => setSearchDC(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002855] focus:border-transparent uppercase transition-all"
            />
            {searchDC && (
              <button
                onClick={() => setSearchDC('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: 7 Multi-Select Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-slate-100">
          <MultiSelectFilter
            label="REGIONAL"
            options={regionalOptions}
            selected={filterRegional}
            onChange={setFilterRegional}
            optionCounts={regionalCounts}
            placeholder="Todas"
          />

          <MultiSelectFilter
            label="UF"
            options={ufOptions}
            selected={filterUF}
            onChange={setFilterUF}
            optionCounts={ufCounts}
            placeholder="Todos"
          />

          <MultiSelectFilter
            label="AGING"
            options={agingOptions}
            selected={filterAging}
            onChange={setFilterAging}
            optionCounts={agingCounts}
            placeholder="Todos"
          />

          <MultiSelectFilter
            label="STATUS DC"
            columnRefName="Status da DC (Atual)"
            options={statusAtualOptions}
            selected={filterStatusAtual}
            onChange={setFilterStatusAtual}
            optionCounts={statusAtualCounts}
            placeholder="Todos"
          />

          <MultiSelectFilter
            label="STATUS INFORME"
            columnRefName="Status Informe (Campo)"
            options={statusInformeOptions}
            selected={filterStatusInforme}
            onChange={setFilterStatusInforme}
            optionCounts={statusInformeCounts}
            placeholder="Todos"
          />

          <MultiSelectFilter
            label="RESPONSÁVEL"
            columnRefName="Responsavel"
            options={responsavelOptions}
            selected={filterResponsavel}
            onChange={setFilterResponsavel}
            optionCounts={responsavelCounts}
            placeholder="Todos"
          />

          <MultiSelectFilter
            label="TIPO PROJETO"
            columnRefName="Tipo de Projeto"
            options={tipoProjetoOptions}
            selected={filterTipoProjeto}
            onChange={setFilterTipoProjeto}
            optionCounts={tipoProjetoCounts}
            placeholder="Todos"
          />
        </div>
      </div>

      {/* Main KPI Cards: Quantidade, Orçado, Medido e Conclusão */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Quantidade de DCs */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Quantidade de DCs
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {totalDcs.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-semibold text-slate-500">obras</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {activeFiltersCount > 0
                ? `${Math.round((totalDcs / (registros.length || 1)) * 100)}% da base total`
                : '100% da base ativa'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1a56db] flex items-center justify-center font-bold shrink-0">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Valor Orçado Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Valor Orçado Total
            </span>
            <div className="mt-1">
              <span className="text-xl font-black text-slate-900 block truncate">
                {formatBRL(totalOrcamento)}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Orçamento de implantação
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Valor Medido Total (Parcial + Final) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Valor Medido Total
            </span>
            <div className="mt-1">
              <span className="text-xl font-black text-emerald-800 block truncate">
                {formatBRL(totalMedido)}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-[11px] font-bold text-emerald-600">
                {pctMedido}% do orçado
              </span>
              <span className="text-[10px] text-slate-500">
                (Parc: {formatBRL(totalParcial)} | Fin: {formatBRL(totalFinal)})
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Obras Concluídas (Status Informe) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Status Informe: Concluídas
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-emerald-700">
                {concluidasCount.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                ({totalDcs > 0 ? Math.round((concluidasCount / totalDcs) * 100) : 0}%)
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
              <span>Execução: <strong className="text-slate-600">{emExecucaoCount}</strong></span>
              <span>•</span>
              <span>Outros: <strong className="text-slate-600">{pendentesCount}</strong></span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid: Regional & Status Informe (Campo) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Painel 1: Distribuição por Regional (REG) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-[#1a56db]" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Distribuição e Medição por Regional (REG)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {regionalStats.length} Regionais
            </span>
          </div>

          <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
            {regionalStats.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Nenhum registro encontrado para os filtros selecionados.
              </div>
            ) : (
              regionalStats.map((item) => {
                const pctOfTotal = totalDcs > 0 ? Math.round((item.count / totalDcs) * 100) : 0;
                const pctMed = item.orcamento > 0 ? Math.round((item.medido / item.orcamento) * 100) : 0;

                return (
                  <div key={item.regional} className="p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-xl space-y-2 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-[#002855] text-cyan-300 font-black text-xs rounded-md">
                          {item.regional}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {item.count.toLocaleString('pt-BR')} DCs ({pctOfTotal}%)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-slate-900 block">
                          {formatBRL(item.orcamento)}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold">
                          Medido: {formatBRL(item.medido)} ({pctMed}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar of Completion / Medição */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>Concluídas: {item.concluidas} DCs</span>
                        <span>Medição: {pctMed}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#1a56db] transition-all duration-500"
                          style={{ width: `${Math.min(100, pctMed)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Painel 2: Status Informe (Campo) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Acompanhamento por Status Informe (Campo)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {statusInformeStats.length} Status
            </span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {statusInformeStats.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Nenhum registro encontrado para os filtros selecionados.
              </div>
            ) : (
              statusInformeStats.map((item) => {
                const pct = totalDcs > 0 ? Math.round((item.count / totalDcs) * 100) : 0;
                const isConcl = item.status.includes('CONCLU') || item.status === 'OK';
                const isExec = item.status.includes('EXECU') || item.status.includes('ANDAMENTO');
                const isParal = item.status.includes('PARALIS') || item.status.includes('CANCEL');

                let badgeColor = 'bg-slate-100 text-slate-800 border-slate-200';
                let barColor = 'bg-slate-500';

                if (isConcl) {
                  badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
                  barColor = 'bg-emerald-600';
                } else if (isExec) {
                  badgeColor = 'bg-blue-50 text-blue-800 border-blue-300 font-bold';
                  barColor = 'bg-blue-600';
                } else if (isParal) {
                  badgeColor = 'bg-red-50 text-red-800 border-red-300 font-bold';
                  barColor = 'bg-red-600';
                }

                return (
                  <div key={item.status} className="p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-xl space-y-1.5 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs border ${badgeColor} truncate max-w-[65%]`}>
                        {item.status}
                      </span>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-slate-900 block">
                          {item.count.toLocaleString('pt-BR')} DCs ({pct}%)
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Orçado: {formatBRL(item.orcamento)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Grid: Responsável & Distribuição por UF */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Painel 3: Responsabilidade (Coluna RESPONSAVEL) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-[#002855]" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Distribuição por Responsável (Área / Célula)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {responsavelStats.length} Responsáveis
            </span>
          </div>

          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {responsavelStats.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Nenhum registro com responsável definido.
              </div>
            ) : (
              responsavelStats.map((item) => {
                const pct = totalDcs > 0 ? Math.round((item.count / totalDcs) * 100) : 0;
                return (
                  <div
                    key={item.responsavel}
                    className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#002855]/5 border border-[#002855]/10 text-[#002855] font-bold text-xs flex items-center justify-center shrink-0">
                        {item.responsavel.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {item.responsavel}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {item.concluidas} concluídas • Orçado: {formatBRL(item.orcamento)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-slate-900">
                        {item.count.toLocaleString('pt-BR')} DCs
                      </span>
                      <span className="text-[10px] text-slate-400 block">{pct}% do total</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Painel 4: Ranking Geográfico por UF */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-[#1a56db]" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Distribuição Geográfica por UF (Estado)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">{ufStats.length} Estados</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
            {ufStats.length === 0 ? (
              <div className="col-span-full text-center py-8 text-slate-400 text-xs">
                Nenhuma UF encontrada para os filtros.
              </div>
            ) : (
              ufStats.map((item) => (
                <div
                  key={item.uf}
                  className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-1 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-[#002855] text-white font-black text-xs rounded-md">
                      {item.uf}
                    </span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {item.count} DCs
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold block truncate">
                    {formatBRL(item.orcamento)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
