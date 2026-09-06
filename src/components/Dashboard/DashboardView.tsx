import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { MultiSelectFilter } from '../Registros/MultiSelectFilter';
import { parseCurrencyValue, formatBRL } from '../../utils/currency';
import { getRegistroCarteira } from '../../types';
import {
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  UserCheck,
  Search,
  X,
  Database,
  ChevronDown,
  ChevronUp,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { RegistrosFilterPayload } from '../../types';

export interface DashboardViewProps {
  onNavigateToRegistros?: (filters: RegistrosFilterPayload) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToRegistros }) => {
  const { registros, lastImportInfo, loadingRegistros } = useData();

  // 1. Search by DC
  const [searchDC, setSearchDC] = useState('');

  // 2. Filters (10 Multi-Selects aligned with RegistrosView)
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

  // Accordion for status details
  const [isStatusExpanded, setIsStatusExpanded] = useState(false);
  // Filter panel collapse on smaller screens
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  // Helper to match subset for correlated options
  const matchesFilterSubset = (
    item: any,
    excludeKey?:
      | 'REG'
      | 'UF'
      | 'CARTEIRA'
      | 'AGING'
      | 'STATUS_ATUAL'
      | 'STATUS_INFORME'
      | 'RESPONSAVEL'
      | 'TIPO_PROJETO'
      | 'STATUS_MED_PARCIAL'
      | 'STATUS_MED_FINAL'
  ) => {
    if (searchDC.trim()) {
      const q = searchDC.trim().toLowerCase();
      const dcMatch = (item.DC || '').toLowerCase().includes(q);
      const descMatch = (item['Descrição da DC'] || item.Descricao || '')
        .toLowerCase()
        .includes(q);
      if (!dcMatch && !descMatch) return false;
    }

    if (excludeKey !== 'REG' && filterRegional.length > 0) {
      if (!item.REG || !filterRegional.includes(item.REG.trim().toUpperCase())) return false;
    }
    if (excludeKey !== 'UF' && filterUF.length > 0) {
      if (!item.UF || !filterUF.includes(item.UF.trim().toUpperCase())) return false;
    }
    if (excludeKey !== 'CARTEIRA' && filterCarteira.length > 0) {
      const cartVal = getRegistroCarteira(item);
      if (!filterCarteira.includes(cartVal)) return false;
    }
    if (excludeKey !== 'AGING' && filterAging.length > 0) {
      if (!item.AGING || !filterAging.includes(item.AGING.trim())) return false;
    }
    if (excludeKey !== 'STATUS_ATUAL' && filterStatusAtual.length > 0) {
      if (!item['Status da DC (Atual)'] || !filterStatusAtual.includes(item['Status da DC (Atual)'].trim()))
        return false;
    }
    if (excludeKey !== 'STATUS_INFORME' && filterStatusInforme.length > 0) {
      if (!item['Status Informe (Campo)'] || !filterStatusInforme.includes(item['Status Informe (Campo)'].trim()))
        return false;
    }
    if (excludeKey !== 'RESPONSAVEL' && filterResponsavel.length > 0) {
      if (!item.Responsavel || !filterResponsavel.includes(item.Responsavel.trim())) return false;
    }
    if (excludeKey !== 'TIPO_PROJETO' && filterTipoProjeto.length > 0) {
      if (!item['Tipo de Projeto'] || !filterTipoProjeto.includes(item['Tipo de Projeto'].trim())) return false;
    }
    if (excludeKey !== 'STATUS_MED_PARCIAL' && filterStatusMedParcial.length > 0) {
      const val = (item['Status Med. Parcial'] || '').trim();
      if (!val || !filterStatusMedParcial.includes(val)) return false;
    }
    if (excludeKey !== 'STATUS_MED_FINAL' && filterStatusMedFinal.length > 0) {
      const val = (item['Status Med. Final'] || '').trim();
      if (!val || !filterStatusMedFinal.includes(val)) return false;
    }
    return true;
  };

  // Unique options & counts for filters
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

    registros.forEach((r) => {
      if (r.REG) {
        const val = r.REG.trim().toUpperCase();
        if (matchesFilterSubset(r, 'REG')) regCounts[val] = (regCounts[val] || 0) + 1;
        else if (filterRegional.includes(val) && !regCounts[val]) regCounts[val] = 0;
      }
      if (r.UF) {
        const val = r.UF.trim().toUpperCase();
        if (matchesFilterSubset(r, 'UF')) uCounts[val] = (uCounts[val] || 0) + 1;
        else if (filterUF.includes(val) && !uCounts[val]) uCounts[val] = 0;
      }
      const cartVal = getRegistroCarteira(r);
      if (cartVal) {
        if (matchesFilterSubset(r, 'CARTEIRA')) cartCounts[cartVal] = (cartCounts[cartVal] || 0) + 1;
        else if (filterCarteira.includes(cartVal) && !cartCounts[cartVal]) cartCounts[cartVal] = 0;
      }
      if (r.AGING) {
        const val = r.AGING.trim();
        if (matchesFilterSubset(r, 'AGING')) agCounts[val] = (agCounts[val] || 0) + 1;
        else if (filterAging.includes(val) && !agCounts[val]) agCounts[val] = 0;
      }
      if (r['Status da DC (Atual)']) {
        const val = r['Status da DC (Atual)'].trim();
        if (matchesFilterSubset(r, 'STATUS_ATUAL')) stAtualCounts[val] = (stAtualCounts[val] || 0) + 1;
        else if (filterStatusAtual.includes(val) && !stAtualCounts[val]) stAtualCounts[val] = 0;
      }
      if (r['Status Informe (Campo)']) {
        const val = r['Status Informe (Campo)'].trim();
        if (matchesFilterSubset(r, 'STATUS_INFORME')) stInfCounts[val] = (stInfCounts[val] || 0) + 1;
        else if (filterStatusInforme.includes(val) && !stInfCounts[val]) stInfCounts[val] = 0;
      }
      if (r.Responsavel) {
        const val = r.Responsavel.trim();
        if (matchesFilterSubset(r, 'RESPONSAVEL')) respCounts[val] = (respCounts[val] || 0) + 1;
        else if (filterResponsavel.includes(val) && !respCounts[val]) respCounts[val] = 0;
      }
      if (r['Tipo de Projeto']) {
        const val = r['Tipo de Projeto'].trim();
        if (matchesFilterSubset(r, 'TIPO_PROJETO')) projCounts[val] = (projCounts[val] || 0) + 1;
        else if (filterTipoProjeto.includes(val) && !projCounts[val]) projCounts[val] = 0;
      }
      if (r['Status Med. Parcial']) {
        const val = r['Status Med. Parcial'].trim();
        if (matchesFilterSubset(r, 'STATUS_MED_PARCIAL')) stMedParcCounts[val] = (stMedParcCounts[val] || 0) + 1;
        else if (filterStatusMedParcial.includes(val) && !stMedParcCounts[val]) stMedParcCounts[val] = 0;
      }
      if (r['Status Med. Final']) {
        const val = r['Status Med. Final'].trim();
        if (matchesFilterSubset(r, 'STATUS_MED_FINAL')) stMedFinCounts[val] = (stMedFinCounts[val] || 0) + 1;
        else if (filterStatusMedFinal.includes(val) && !stMedFinCounts[val]) stMedFinCounts[val] = 0;
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
    };
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
  ]);

  // Filtered dataset
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
  ]);

  // Active filters count
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
    filterStatusMedFinal.length;

  const handleClearFilters = () => {
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
  };

  // Aggregated calculations
  const {
    totalDcs,
    totalOrcamento,
    totalParcial,
    totalFinal,
    totalMedido,
    pctMedido,
    concluidasCount,
    emExecucaoCount,
    aIniciarCount,
    pendentesCount,
    regionalStats,
    responsavelStats,
    regionalRespStats,
    regionalGroups,
    telemontGroup,
    ufStats,
    macroStatusStats,
    rawStatusStats,
  } = useMemo(() => {
    let orc = 0;
    let parc = 0;
    let fin = 0;

    let concl = 0;
    let exec = 0;
    let aInic = 0;
    let pend = 0;

    const regMap: Record<
      string,
      { count: number; orcamento: number; parcial: number; final: number; medido: number; concluidas: number }
    > = {};

    const respMap: Record<
      string,
      {
        count: number;
        orcamento: number;
        parcial: number;
        final: number;
        medido: number;
        concluidas: number;
        rawNames: Set<string>;
      }
    > = {};

    const uMap: Record<
      string,
      { count: number; orcamento: number; medido: number }
    > = {};

    const rawStatusMap: Record<string, { count: number; orcamento: number; medido: number }> = {};
    const regRespComboMap: Record<
      string,
      { regional: string; responsavel: string; count: number; orcamento: number; parcial: number; final: number }
    > = {};

    filteredRegistros.forEach((r) => {
      const o = parseCurrencyValue(r.Orçamento);
      const p = parseCurrencyValue(r['Valor Parcial R$']);
      const f = parseCurrencyValue(r['Valor Final R$']);
      const m = p + f;

      orc += o;
      parc += p;
      fin += f;

      // Status classification into 4 macro categories
      const stInf = (r['Status Informe (Campo)'] || 'NÃO INFORMADO').trim().toUpperCase();

      const isConcl =
        stInf.includes('CONCLU') ||
        stInf.includes('FINALIZ') ||
        stInf.includes('ENTREG') ||
        stInf === 'OK' ||
        stInf === 'APROVADO';

      const isExec =
        stInf.includes('EXECU') ||
        stInf.includes('ANDAMENTO') ||
        stInf.includes('ANÁLISE') ||
        stInf.includes('ANALISE') ||
        stInf.includes('CAMPO') ||
        stInf.includes('INICIAD');

      const isAIniciar =
        stInf.includes('INICIAR') ||
        stInf.includes('AGENDAD') ||
        stInf.includes('BACKLOG') ||
        stInf.includes('PROGRAMAD') ||
        stInf.includes('AGUARDANDO');

      if (isConcl) {
        concl++;
      } else if (isExec) {
        exec++;
      } else if (isAIniciar) {
        aInic++;
      } else {
        pend++;
      }

      // Raw Status counter for detailed breakdown
      if (!rawStatusMap[stInf]) {
        rawStatusMap[stInf] = { count: 0, orcamento: 0, medido: 0 };
      }
      rawStatusMap[stInf].count++;
      rawStatusMap[stInf].orcamento += o;
      rawStatusMap[stInf].medido += m;

      // Regional Grouping
      const reg = (r.REG || 'SEM REGIONAL').trim().toUpperCase();
      if (!regMap[reg]) {
        regMap[reg] = { count: 0, orcamento: 0, parcial: 0, final: 0, medido: 0, concluidas: 0 };
      }
      regMap[reg].count++;
      regMap[reg].orcamento += o;
      regMap[reg].parcial += p;
      regMap[reg].final += f;
      regMap[reg].medido += m;
      if (isConcl) regMap[reg].concluidas++;

      // Responsável Grouping (Normalized: Implantação, Projeto, etc.)
      let respRaw = (r.Responsavel || 'NÃO ATRIBUÍDO').trim();
      let respNorm = respRaw.toUpperCase();
      if (respNorm.includes('IMPLANT')) {
        respNorm = 'IMPLANTAÇÃO';
      } else if (respNorm.includes('PROJETO')) {
        respNorm = 'PROJETO';
      } else if (respNorm.includes('NÃO') || respNorm === '' || respNorm === '-' || respNorm.includes('SEM')) {
        respNorm = 'NÃO ATRIBUÍDO';
      }

      if (!respMap[respNorm]) {
        respMap[respNorm] = {
          count: 0,
          orcamento: 0,
          parcial: 0,
          final: 0,
          medido: 0,
          concluidas: 0,
          rawNames: new Set<string>(),
        };
      }
      respMap[respNorm].count++;
      respMap[respNorm].orcamento += o;
      respMap[respNorm].parcial += p;
      respMap[respNorm].final += f;
      respMap[respNorm].medido += m;
      if (r.Responsavel && r.Responsavel.trim()) {
        respMap[respNorm].rawNames.add(r.Responsavel.trim());
      }
      if (isConcl) respMap[respNorm].concluidas++;

      // Regional x Responsável Breakdown for Ponto 1
      const respCategory = (r.Responsavel || 'Não Atribuído').trim();
      const comboKey = `${reg}___${respCategory}`;
      if (!regRespComboMap[comboKey]) {
        regRespComboMap[comboKey] = {
          regional: reg,
          responsavel: respCategory,
          count: 0,
          orcamento: 0,
          parcial: 0,
          final: 0,
        };
      }
      regRespComboMap[comboKey].count++;
      regRespComboMap[comboKey].orcamento += o;
      regRespComboMap[comboKey].parcial += p;
      regRespComboMap[comboKey].final += f;

      // UF Grouping
      const uf = (r.UF || 'OUTRO').trim().toUpperCase();
      if (!uMap[uf]) {
        uMap[uf] = { count: 0, orcamento: 0, medido: 0 };
      }
      uMap[uf].count++;
      uMap[uf].orcamento += o;
      uMap[uf].medido += m;
    });

    const totMed = parc + fin;
    const pMed = orc > 0 ? ((totMed / orc) * 100).toFixed(1) : '0.0';

    // Regional Stats ordered (Prioritize standard RCO, RMG, RSUL then others)
    const regionalStats = Object.entries(regMap)
      .map(([key, data]) => ({ regional: key, ...data }))
      .sort((a, b) => b.count - a.count);

    // Responsável Stats
    const responsavelStats = Object.entries(respMap)
      .map(([key, data]) => ({
        responsavel: key,
        count: data.count,
        orcamento: data.orcamento,
        parcial: data.parcial,
        final: data.final,
        medido: data.medido,
        concluidas: data.concluidas,
        rawNames: Array.from(data.rawNames),
      }))
      .sort((a, b) => b.count - a.count);

    // UF Stats
    const ufStats = Object.entries(uMap)
      .map(([key, data]) => ({ uf: key, ...data }))
      .sort((a, b) => b.count - a.count);

    // Macro status items
    const totalCount = filteredRegistros.length || 1;
    const macroStatusStats = [
      {
        id: 'concluido',
        label: 'Concluído / Entregue',
        count: concl,
        pct: ((concl / totalCount) * 100).toFixed(1),
        color: '#10B981', // emerald-500
        bgClass: 'bg-emerald-500',
        textClass: 'text-emerald-700',
        badgeBg: 'bg-emerald-50 border-emerald-200',
      },
      {
        id: 'execucao',
        label: 'Em Execução / Andamento',
        count: exec,
        pct: ((exec / totalCount) * 100).toFixed(1),
        color: '#2563EB', // blue-600
        bgClass: 'bg-blue-600',
        textClass: 'text-blue-700',
        badgeBg: 'bg-blue-50 border-blue-200',
      },
      {
        id: 'a_iniciar',
        label: 'A Iniciar / Aguardando',
        count: aInic,
        pct: ((aInic / totalCount) * 100).toFixed(1),
        color: '#F59E0B', // amber-500
        bgClass: 'bg-amber-500',
        textClass: 'text-amber-700',
        badgeBg: 'bg-amber-50 border-amber-200',
      },
      {
        id: 'pendencia',
        label: 'Pendência / Paralisado',
        count: pend,
        pct: ((pend / totalCount) * 100).toFixed(1),
        color: '#EF4444', // red-500
        bgClass: 'bg-red-500',
        textClass: 'text-red-700',
        badgeBg: 'bg-red-50 border-red-200',
      },
    ];

    const rawStatusStats = Object.entries(rawStatusMap)
      .map(([key, data]) => ({ status: key, ...data }))
      .sort((a, b) => b.count - a.count);

    // Sorted Regional x Responsavel for Ponto 1 table
    const regionalRespStats = Object.values(regRespComboMap).sort((a, b) => {
      if (a.regional !== b.regional) {
        return a.regional.localeCompare(b.regional);
      }
      return b.orcamento - a.orcamento;
    });

    // Group regionalRespStats by regional for distinct blocks/cards with subtotal
    const regionalGroupsMap: Record<
      string,
      {
        regional: string;
        items: typeof regionalRespStats;
        subtotal: {
          count: number;
          orcamento: number;
          parcial: number;
          final: number;
          totalMedido: number;
        };
      }
    > = {};

    regionalRespStats.forEach((row) => {
      const reg = row.regional || 'N/D';
      if (!regionalGroupsMap[reg]) {
        regionalGroupsMap[reg] = {
          regional: reg,
          items: [],
          subtotal: { count: 0, orcamento: 0, parcial: 0, final: 0, totalMedido: 0 },
        };
      }
      regionalGroupsMap[reg].items.push(row);
      regionalGroupsMap[reg].subtotal.count += row.count;
      regionalGroupsMap[reg].subtotal.orcamento += row.orcamento;
      regionalGroupsMap[reg].subtotal.parcial += row.parcial;
      regionalGroupsMap[reg].subtotal.final += row.final;
      regionalGroupsMap[reg].subtotal.totalMedido += row.parcial + row.final;
    });

    const regionalGroups = Object.values(regionalGroupsMap).sort((a, b) =>
      a.regional.localeCompare(b.regional)
    );

    // Consolidated TELEMONT group (aggregating all regionals by Responsável)
    const telemontItemsMap: Record<
      string,
      {
        regional: string;
        responsavel: string;
        count: number;
        orcamento: number;
        parcial: number;
        final: number;
      }
    > = {};

    filteredRegistros.forEach((r) => {
      const respCategory = (r.Responsavel || 'Não Atribuído').trim();
      const o = parseFloat(r['Orçamento'] || '0') || 0;
      const p = parseFloat(r['Valor Parcial R$'] || '0') || 0;
      const f = parseFloat(r['Valor Final R$'] || '0') || 0;

      if (!telemontItemsMap[respCategory]) {
        telemontItemsMap[respCategory] = {
          regional: 'TELEMONT',
          responsavel: respCategory,
          count: 0,
          orcamento: 0,
          parcial: 0,
          final: 0,
        };
      }
      telemontItemsMap[respCategory].count++;
      telemontItemsMap[respCategory].orcamento += o;
      telemontItemsMap[respCategory].parcial += p;
      telemontItemsMap[respCategory].final += f;
    });

    const telemontItems = Object.values(telemontItemsMap).sort((a, b) => b.orcamento - a.orcamento);

    const telemontSubtotal = telemontItems.reduce(
      (acc, cur) => {
        acc.count += cur.count;
        acc.orcamento += cur.orcamento;
        acc.parcial += cur.parcial;
        acc.final += cur.final;
        acc.totalMedido += cur.parcial + cur.final;
        return acc;
      },
      { count: 0, orcamento: 0, parcial: 0, final: 0, totalMedido: 0 }
    );

    const telemontGroup = {
      regional: 'TELEMONT',
      items: telemontItems,
      subtotal: telemontSubtotal,
    };

    return {
      totalDcs: filteredRegistros.length,
      totalOrcamento: orc,
      totalParcial: parc,
      totalFinal: fin,
      totalMedido: totMed,
      pctMedido: pMed,
      concluidasCount: concl,
      emExecucaoCount: exec,
      aIniciarCount: aInic,
      pendentesCount: pend,
      regionalStats,
      responsavelStats,
      regionalRespStats,
      regionalGroups,
      telemontGroup,
      ufStats,
      macroStatusStats,
      rawStatusStats,
    };
  }, [filteredRegistros]);

  // TELEMONT aggregate table shows when all 3 regionals are in view (either unfiltered or when 3+ regionals selected)
  // If a single regional is filtered, it hides leaving only that filtered regional
  const showTelemontTable =
    (filterRegional.length === 0 || filterRegional.length >= 3) &&
    telemontGroup.items.length > 0;

  return (
    <div className="space-y-6 font-sans pb-10 bg-[#F8FAFC]">
      {/* 1. TOP STICKY FILTER BAR (Clean, high contrast, non-intrusive) */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs py-2.5 px-4 rounded-b-2xl transition-all">
        <div className="flex flex-col gap-2">
          {/* Row 1: Quick status indicator & Search & Clear */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-xs text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-extrabold text-slate-900 text-sm">
                {totalDcs.toLocaleString('pt-BR')}
              </span>
              <span className="text-slate-500 font-medium">
                obras filtradas {registros.length > 0 && `(de ${registros.length.toLocaleString('pt-BR')} totais)`}
              </span>
              {lastImportInfo && (
                <span className="hidden md:inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 rounded-md text-[11px] text-slate-600 border border-slate-200 ml-2">
                  <Database className="w-3 h-3 text-[#002855]" />
                  <span>Matriz: {lastImportInfo.dataHoraFormatada}</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Limpar {activeFiltersCount} filtro(s)</span>
                </button>
              )}

              <button
                onClick={() => setIsFiltersOpen((prev) => !prev)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-2 items-end">
                {/* Search DC */}
                <div className="w-full">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5 truncate">
                    Buscar DC
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <input
                      id="search-dc-dashboard"
                      type="text"
                      placeholder="Buscar..."
                      value={searchDC}
                      onChange={(e) => setSearchDC(e.target.value)}
                      className="block w-full pl-8 pr-6 py-1 bg-slate-50 border border-slate-300 rounded-md text-[11px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002855] h-[28px]"
                    />
                    {searchDC && (
                      <button
                        onClick={() => setSearchDC('')}
                        className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
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
                  onChange={setFilterRegional}
                  optionCounts={regionalCounts}
                  placeholder="Todas"
                />

                {/* 2. UF */}
                <MultiSelectFilter
                  label="UF"
                  columnRefName="UF"
                  options={ufOptions}
                  selected={filterUF}
                  onChange={setFilterUF}
                  optionCounts={ufCounts}
                  placeholder="Todas"
                />

                {/* 3. Carteira */}
                <MultiSelectFilter
                  label="Carteira"
                  columnRefName="TIPO"
                  options={carteiraOptions}
                  selected={filterCarteira}
                  onChange={setFilterCarteira}
                  optionCounts={carteiraCounts}
                  placeholder="Todas"
                />

                {/* 4. Status DC */}
                <MultiSelectFilter
                  label="Status DC"
                  columnRefName="Atual"
                  options={statusAtualOptions}
                  selected={filterStatusAtual}
                  onChange={setFilterStatusAtual}
                  optionCounts={statusAtualCounts}
                  placeholder="Todos"
                />

                {/* 6. Status Informe */}
                <MultiSelectFilter
                  label="Status Informe"
                  columnRefName="Campo"
                  options={statusInformeOptions}
                  selected={filterStatusInforme}
                  onChange={setFilterStatusInforme}
                  optionCounts={statusInformeCounts}
                  placeholder="Todos"
                />

                {/* 7. Responsável */}
                <MultiSelectFilter
                  label="Responsável"
                  columnRefName="Área"
                  options={responsavelOptions}
                  selected={filterResponsavel}
                  onChange={setFilterResponsavel}
                  optionCounts={responsavelCounts}
                  placeholder="Todos"
                />

                {/* 8. Tipo Projeto */}
                <MultiSelectFilter
                  label="Tipo Projeto"
                  columnRefName="Projeto"
                  options={tipoProjetoOptions}
                  selected={filterTipoProjeto}
                  onChange={setFilterTipoProjeto}
                  optionCounts={tipoProjetoCounts}
                  placeholder="Todos"
                />

                {/* 9. Status Med. Parcial (Ponto 5) */}
                <MultiSelectFilter
                  label="Status Med. Parcial"
                  columnRefName="Parcial"
                  options={statusMedParcialOptions}
                  selected={filterStatusMedParcial}
                  onChange={setFilterStatusMedParcial}
                  optionCounts={statusMedParcialCounts}
                  placeholder="Todos"
                />

                {/* 10. Status Med. Final (Ponto 5) */}
                <MultiSelectFilter
                  label="Status Med. Final"
                  columnRefName="Final"
                  options={statusMedFinalOptions}
                  selected={filterStatusMedFinal}
                  onChange={setFilterStatusMedFinal}
                  optionCounts={statusMedFinalCounts}
                  placeholder="Todos"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. KPI TOP ROW: 4 Clean, Balanced Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-1">
        {/* Card 1: Total de DCs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total de DCs
              </span>
              <span className="text-3xl font-black text-slate-900 mt-1 block">
                {totalDcs.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#002855] flex items-center justify-center font-bold shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            {regionalStats.slice(0, 3).map((reg) => (
              <span key={reg.regional} className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-700">
                {reg.regional}: {reg.count}
              </span>
            ))}
            {regionalStats.length > 3 && (
              <span className="text-slate-400">+{regionalStats.length - 3} reg.</span>
            )}
          </div>
        </div>

        {/* Card 2: Orçamento Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Orçamento Total
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block truncate" title={formatBRL(totalOrcamento)}>
                {formatBRL(totalOrcamento)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#002855] flex items-center justify-center font-bold shrink-0">
              <DollarSign className="w-5 h-5 text-[#002855]" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Média por obra:</span>
            <span className="font-bold text-slate-800">
              {totalDcs > 0 ? formatBRL(totalOrcamento / totalDcs) : 'R$ 0,00'}
            </span>
          </div>
        </div>

        {/* Card 3: Valor Medido Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Valor Medido Total
              </span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block truncate" title={formatBRL(totalMedido)}>
                {formatBRL(totalMedido)}
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
              {pctMedido}%
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Parcial: <strong className="text-slate-700 font-semibold">{formatBRL(totalParcial)}</strong></span>
            <span>Final: <strong className="text-emerald-700 font-bold">{formatBRL(totalFinal)}</strong></span>
          </div>
        </div>

        {/* Card 4: % de DCs Concluídas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Conclusão de Obras
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-3xl font-black text-slate-900">
                  {totalDcs > 0 ? ((concluidasCount / totalDcs) * 100).toFixed(1) : '0.0'}%
                </span>
                <span className="text-xs text-slate-400 font-medium">concluídas</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${totalDcs > 0 ? Math.min(100, (concluidasCount / totalDcs) * 100) : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{concluidasCount.toLocaleString('pt-BR')} de {totalDcs.toLocaleString('pt-BR')} DCs</span>
              <span className="text-slate-400">{emExecucaoCount} em execução</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CENTRAL HERO BLOCK: Medição x Orçamento por Regional e Responsável (Ponto 1 & Ajustes Visuais/Interatividade) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-[#002855]" />
              <span>Medição vs. Orçamento por Regional e Responsável</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Acompanhamento financeiro detalhado por Regional e Responsável com valores orçados, parciais, finais e total medido acumulado.
            </p>
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50/80 border border-blue-200/80 rounded-lg text-xs text-[#002855] font-semibold self-start sm:self-auto shadow-2xs">
            <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Clique nos valores ou quantidades para ver os registros detalhados</span>
          </div>
        </div>

        {/* Regional Groups List */}
        <div className="p-6 space-y-6">
          {regionalGroups.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              Nenhum registro encontrado para os filtros atuais.
            </div>
          ) : (
            regionalGroups.map((regGroup) => (
              <div
                key={regGroup.regional}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all hover:border-slate-300"
              >
                {/* Regional Block Header */}
                <div className="bg-slate-50/90 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#002855] text-white text-xs font-black tracking-wide shadow-2xs">
                      {regGroup.regional}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Regional {regGroup.regional}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      ({regGroup.items.length} {regGroup.items.length === 1 ? 'responsável' : 'responsáveis'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateToRegistros?.({
                        regional: [regGroup.regional],
                      })
                    }
                    className="inline-flex items-center space-x-1 text-[11px] font-bold text-[#002855] hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                    title={`Ver todas as obras da Regional ${regGroup.regional} na aba Registros`}
                  >
                    <span>Ver todas as obras ({regGroup.subtotal.count})</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </button>
                </div>

                {/* Table for this Regional */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-600 uppercase text-[11px] font-bold tracking-wider select-none border-b border-slate-200">
                        <th className="py-2.5 px-4 text-left font-semibold border-r border-slate-200 w-[120px]">
                          Regional
                        </th>
                        <th className="py-2.5 px-4 text-left font-semibold border-r border-slate-200">
                          Responsável
                        </th>
                        <th className="py-2.5 px-4 text-center font-semibold border-r border-slate-200 w-[110px]">
                          DC's
                        </th>
                        <th className="py-2.5 px-4 text-center font-semibold border-r border-slate-200 w-[160px]">
                          Orçamento
                        </th>
                        <th className="py-2.5 px-4 text-center font-semibold border-r border-slate-200 w-[160px]">
                          Valor Parcial R$
                        </th>
                        <th className="py-2.5 px-4 text-center font-semibold border-r border-slate-200 w-[160px]">
                          Valor Final R$
                        </th>
                        <th className="py-2.5 px-4 text-center font-semibold text-emerald-800 w-[180px]">
                          Valor Total Medido R$
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80 text-slate-700">
                      {regGroup.items.map((row, idx) => {
                        const totalMedidoLinha = row.parcial + row.final;
                        const isZebra = idx % 2 === 1;

                        return (
                          <tr
                            key={`${row.regional}_${row.responsavel}_${idx}`}
                            className={`transition-colors ${
                              isZebra ? 'bg-[#FAFAFA]' : 'bg-white'
                            } hover:bg-blue-50/40`}
                          >
                            {/* Regional */}
                            <td className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap border-b border-r border-slate-200/80 text-left">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-extrabold border border-slate-200">
                                {row.regional}
                              </span>
                            </td>

                            {/* Responsável */}
                            <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap border-b border-r border-slate-200/80 text-left">
                              <button
                                type="button"
                                onClick={() =>
                                  onNavigateToRegistros?.({
                                    regional: [row.regional],
                                    responsavel: [row.responsavel],
                                  })
                                }
                                className="text-left hover:text-[#002855] hover:underline cursor-pointer font-semibold transition-colors flex items-center space-x-1.5 group"
                                title={`Ver obras de ${row.responsavel} (${row.regional}) na aba Registros`}
                              >
                                <span>{row.responsavel}</span>
                                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#002855] opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </td>

                            {/* DC's (centered & clickable) */}
                            <td
                              onClick={() =>
                                onNavigateToRegistros?.({
                                  regional: [row.regional],
                                  responsavel: [row.responsavel],
                                  sortBy: 'DC',
                                  sortDirection: 'asc',
                                })
                              }
                              className="py-2.5 px-4 text-center font-bold text-slate-800 tabular-nums whitespace-nowrap border-b border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 hover:text-[#002855] transition-colors group"
                              title={`Clique para ver as ${row.count} DC's de ${row.responsavel} (${row.regional}) na aba Registros`}
                            >
                              <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                                {row.count.toLocaleString('pt-BR')}
                              </span>
                            </td>

                            {/* Orçamento (centered & clickable) */}
                            <td
                              onClick={() =>
                                onNavigateToRegistros?.({
                                  regional: [row.regional],
                                  responsavel: [row.responsavel],
                                  sortBy: 'Orçamento',
                                  sortDirection: 'desc',
                                })
                              }
                              className="py-2.5 px-4 text-center font-bold text-slate-900 tabular-nums whitespace-nowrap border-b border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 hover:text-[#002855] transition-colors group"
                              title={`Clique para ver as obras de ${row.responsavel} (${row.regional}) com orçamento na aba Registros`}
                            >
                              <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                                {formatBRL(row.orcamento)}
                              </span>
                            </td>

                            {/* Valor Parcial R$ (centered & clickable) */}
                            <td
                              onClick={() =>
                                onNavigateToRegistros?.({
                                  regional: [row.regional],
                                  responsavel: [row.responsavel],
                                  onlyWithParcial: row.parcial > 0,
                                  sortBy: 'Valor Parcial R$',
                                  sortDirection: 'desc',
                                })
                              }
                              className="py-2.5 px-4 text-center font-medium text-slate-800 tabular-nums whitespace-nowrap border-b border-r border-slate-200/80 cursor-pointer hover:bg-emerald-100/70 hover:text-emerald-950 transition-colors group"
                              title={`Clique para ver as obras com medição parcial de ${row.responsavel} (${row.regional}) na aba Registros`}
                            >
                              <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                                {formatBRL(row.parcial)}
                              </span>
                            </td>

                            {/* Valor Final R$ (centered & clickable) */}
                            <td
                              onClick={() =>
                                onNavigateToRegistros?.({
                                  regional: [row.regional],
                                  responsavel: [row.responsavel],
                                  onlyWithFinal: row.final > 0,
                                  sortBy: 'Valor Final R$',
                                  sortDirection: 'desc',
                                })
                              }
                              className="py-2.5 px-4 text-center font-medium text-slate-800 tabular-nums whitespace-nowrap border-b border-r border-slate-200/80 cursor-pointer hover:bg-emerald-100/70 hover:text-emerald-950 transition-colors group"
                              title={`Clique para ver as obras com medição final de ${row.responsavel} (${row.regional}) na aba Registros`}
                            >
                              <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                                {formatBRL(row.final)}
                              </span>
                            </td>

                            {/* Valor Total Medido R$ (centered & clickable) */}
                            <td
                              onClick={() =>
                                onNavigateToRegistros?.({
                                  regional: [row.regional],
                                  responsavel: [row.responsavel],
                                  onlyWithMedido: totalMedidoLinha > 0,
                                  sortBy: 'Valor Final R$',
                                  sortDirection: 'desc',
                                })
                              }
                              className="py-2.5 px-4 text-center font-extrabold text-emerald-800 tabular-nums whitespace-nowrap border-b border-slate-200/80 cursor-pointer hover:bg-emerald-200/70 hover:text-emerald-950 transition-colors group"
                              title={`Clique para ver as obras medidas de ${row.responsavel} (${row.regional}) na aba Registros`}
                            >
                              <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-black">
                                {formatBRL(totalMedidoLinha)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Subtotal da Regional */}
                    <tfoot>
                      <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                        <td
                          colSpan={2}
                          className="py-2.5 px-4 text-left border-r border-slate-200/80 uppercase text-[11px] font-black tracking-wider text-slate-800"
                        >
                          Subtotal {regGroup.regional}
                        </td>
                        <td
                          onClick={() =>
                            onNavigateToRegistros?.({
                              regional: [regGroup.regional],
                              sortBy: 'DC',
                              sortDirection: 'asc',
                            })
                          }
                          className="py-2.5 px-4 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 text-slate-900 transition-colors group"
                          title={`Clique para ver todas as ${regGroup.subtotal.count} DC's da ${regGroup.regional} na aba Registros`}
                        >
                          <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-black">
                            {regGroup.subtotal.count.toLocaleString('pt-BR')}
                          </span>
                        </td>
                        <td
                          onClick={() =>
                            onNavigateToRegistros?.({
                              regional: [regGroup.regional],
                              sortBy: 'Orçamento',
                              sortDirection: 'desc',
                            })
                          }
                          className="py-2.5 px-4 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 text-[#002855] font-black transition-colors group"
                          title={`Clique para ver as obras orçadas da ${regGroup.regional} na aba Registros`}
                        >
                          <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-black">
                            {formatBRL(regGroup.subtotal.orcamento)}
                          </span>
                        </td>
                        <td
                          onClick={() =>
                            onNavigateToRegistros?.({
                              regional: [regGroup.regional],
                              onlyWithParcial: regGroup.subtotal.parcial > 0,
                              sortBy: 'Valor Parcial R$',
                              sortDirection: 'desc',
                            })
                          }
                          className="py-2.5 px-4 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-emerald-100/70 font-bold text-slate-900 transition-colors group"
                          title={`Clique para ver as obras com medição parcial da ${regGroup.regional} na aba Registros`}
                        >
                          <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-bold">
                            {formatBRL(regGroup.subtotal.parcial)}
                          </span>
                        </td>
                        <td
                          onClick={() =>
                            onNavigateToRegistros?.({
                              regional: [regGroup.regional],
                              onlyWithFinal: regGroup.subtotal.final > 0,
                              sortBy: 'Valor Final R$',
                              sortDirection: 'desc',
                            })
                          }
                          className="py-2.5 px-4 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-emerald-100/70 font-bold text-slate-900 transition-colors group"
                          title={`Clique para ver as obras com medição final da ${regGroup.regional} na aba Registros`}
                        >
                          <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-bold">
                            {formatBRL(regGroup.subtotal.final)}
                          </span>
                        </td>
                        <td
                          onClick={() =>
                            onNavigateToRegistros?.({
                              regional: [regGroup.regional],
                              onlyWithMedido: regGroup.subtotal.totalMedido > 0,
                              sortBy: 'Valor Final R$',
                              sortDirection: 'desc',
                            })
                          }
                          className="py-2.5 px-4 text-center tabular-nums cursor-pointer hover:bg-emerald-200/70 font-black text-emerald-900 transition-colors group"
                          title={`Clique para ver as obras medidas da ${regGroup.regional} na aba Registros`}
                        >
                          <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-black">
                            {formatBRL(regGroup.subtotal.totalMedido)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))
          )}

          {/* Tabela Consolidada TELEMONT (RCO, RSUL, RMG juntas no mesmo formato) */}
          {showTelemontTable && (
            <div className="rounded-xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs transition-all hover:border-blue-400">
              {/* TELEMONT Block Header */}
              <div className="bg-slate-50/90 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#002855] text-white text-xs font-bold tracking-wide shadow-2xs">
                    TELEMONT
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    TELEMONT (Consolidado - Todas as Regionais)
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    ({telemontGroup.items.length} {telemontGroup.items.length === 1 ? 'responsável' : 'responsáveis'})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onNavigateToRegistros?.({
                      regional: filterRegional.length > 0 ? filterRegional : undefined,
                    })
                  }
                  className="inline-flex items-center space-x-1 text-[11px] font-bold text-[#002855] hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                  title="Ver todas as obras TELEMONT na aba Registros"
                >
                  <span>Ver todas as obras ({telemontGroup.subtotal.count})</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-50/90 text-slate-600 uppercase text-[11px] font-bold tracking-wider select-none border-b border-slate-200">
                      <th className="py-2.5 px-4 text-left font-semibold border-r border-slate-200 w-[120px]">
                        Regional
                      </th>
                      <th className="py-2.5 px-4 text-left font-semibold border-r border-slate-200">
                        Responsável
                      </th>
                      <th className="py-2.5 px-4 text-center font-semibold border-r border-slate-200 w-[110px]">
                        DC's
                      </th>
                      <th className="py-2.5 px-4 text-center font-semibold border-r border-slate-200 w-[160px]">
                        Orçamento
                      </th>
                      <th className="py-2.5 px-4 text-center font-semibold border-r border-slate-200 w-[160px]">
                        Valor Parcial R$
                      </th>
                      <th className="py-2.5 px-4 text-center font-semibold border-r border-slate-200 w-[160px]">
                        Valor Final R$
                      </th>
                      <th className="py-2.5 px-4 text-center font-semibold text-emerald-800 w-[180px]">
                        Valor Total Medido R$
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {telemontGroup.items.map((row) => {
                      const totalMedidoLinha = row.parcial + row.final;
                      return (
                        <tr
                          key={`telemont-${row.responsavel}`}
                          className="hover:bg-blue-50/40 transition-colors group/row"
                        >
                          {/* Coluna Regional com Badge TELEMONT */}
                          <td className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap border-b border-r border-slate-200/80 text-left">
                            <span className="px-2 py-0.5 rounded-md bg-[#002855] text-white text-[11px] font-bold border border-blue-950/40 shadow-2xs">
                              TELEMONT
                            </span>
                          </td>

                          {/* Responsável */}
                          <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap border-b border-r border-slate-200/80 text-left">
                            <button
                              type="button"
                              onClick={() =>
                                onNavigateToRegistros?.({
                                  regional: filterRegional.length > 0 ? filterRegional : undefined,
                                  responsavel: [row.responsavel],
                                })
                              }
                              className="text-left hover:text-[#002855] hover:underline cursor-pointer font-semibold transition-colors flex items-center space-x-1.5 group"
                              title={`Ver obras de ${row.responsavel} (TELEMONT) na aba Registros`}
                            >
                              <span>{row.responsavel}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#002855] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </td>

                          {/* DC's */}
                          <td
                            onClick={() =>
                              onNavigateToRegistros?.({
                                regional: filterRegional.length > 0 ? filterRegional : undefined,
                                responsavel: [row.responsavel],
                                sortBy: 'DC',
                                sortDirection: 'asc',
                              })
                            }
                            className="py-2.5 px-4 text-center font-bold text-slate-800 tabular-nums whitespace-nowrap border-b border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 hover:text-[#002855] transition-colors group"
                            title={`Clique para ver as ${row.count} DC's de ${row.responsavel} na aba Registros`}
                          >
                            <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                              {row.count.toLocaleString('pt-BR')}
                            </span>
                          </td>

                          {/* Orçamento */}
                          <td
                            onClick={() =>
                              onNavigateToRegistros?.({
                                regional: filterRegional.length > 0 ? filterRegional : undefined,
                                responsavel: [row.responsavel],
                                sortBy: 'Orçamento',
                                sortDirection: 'desc',
                              })
                            }
                            className="py-2.5 px-4 text-center font-bold text-slate-900 tabular-nums whitespace-nowrap border-b border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 hover:text-[#002855] transition-colors group"
                            title={`Clique para ver as obras de ${row.responsavel} com orçamento na aba Registros`}
                          >
                            <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                              {formatBRL(row.orcamento)}
                            </span>
                          </td>

                          {/* Valor Parcial R$ */}
                          <td
                            onClick={() =>
                              onNavigateToRegistros?.({
                                regional: filterRegional.length > 0 ? filterRegional : undefined,
                                responsavel: [row.responsavel],
                                onlyWithParcial: row.parcial > 0,
                                sortBy: 'Valor Parcial R$',
                                sortDirection: 'desc',
                              })
                            }
                            className="py-2.5 px-4 text-center font-medium text-slate-800 tabular-nums whitespace-nowrap border-b border-r border-slate-200/80 cursor-pointer hover:bg-emerald-100/70 hover:text-emerald-950 transition-colors group"
                            title={`Clique para ver as obras com medição parcial de ${row.responsavel} na aba Registros`}
                          >
                            <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                              {formatBRL(row.parcial)}
                            </span>
                          </td>

                          {/* Valor Final R$ */}
                          <td
                            onClick={() =>
                              onNavigateToRegistros?.({
                                regional: filterRegional.length > 0 ? filterRegional : undefined,
                                responsavel: [row.responsavel],
                                onlyWithFinal: row.final > 0,
                                sortBy: 'Valor Final R$',
                                sortDirection: 'desc',
                              })
                            }
                            className="py-2.5 px-4 text-center font-medium text-slate-800 tabular-nums whitespace-nowrap border-b border-r border-slate-200/80 cursor-pointer hover:bg-emerald-100/70 hover:text-emerald-950 transition-colors group"
                            title={`Clique para ver as obras com medição final de ${row.responsavel} na aba Registros`}
                          >
                            <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                              {formatBRL(row.final)}
                            </span>
                          </td>

                          {/* Valor Total Medido R$ */}
                          <td
                            onClick={() =>
                              onNavigateToRegistros?.({
                                regional: filterRegional.length > 0 ? filterRegional : undefined,
                                responsavel: [row.responsavel],
                                onlyWithMedido: totalMedidoLinha > 0,
                                sortBy: 'Valor Final R$',
                                sortDirection: 'desc',
                              })
                            }
                            className="py-2.5 px-4 text-center font-extrabold text-emerald-800 tabular-nums whitespace-nowrap border-b border-slate-200/80 cursor-pointer hover:bg-emerald-200/70 hover:text-emerald-950 transition-colors group"
                            title={`Clique para ver as obras medidas de ${row.responsavel} (TELEMONT) na aba Registros`}
                          >
                            <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-black">
                              {formatBRL(totalMedidoLinha)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Subtotal TELEMONT */}
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                      <td
                        colSpan={2}
                        className="py-2.5 px-4 text-left border-r border-slate-200/80 uppercase text-[11px] font-black tracking-wider text-[#002855]"
                      >
                        Subtotal TELEMONT
                      </td>
                      <td
                        onClick={() =>
                          onNavigateToRegistros?.({
                            regional: filterRegional.length > 0 ? filterRegional : undefined,
                            sortBy: 'DC',
                            sortDirection: 'asc',
                          })
                        }
                        className="py-2.5 px-4 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 text-slate-900 transition-colors group"
                        title={`Clique para ver todas as ${telemontGroup.subtotal.count} DC's da TELEMONT na aba Registros`}
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-black">
                          {telemontGroup.subtotal.count.toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td
                        onClick={() =>
                          onNavigateToRegistros?.({
                            regional: filterRegional.length > 0 ? filterRegional : undefined,
                            sortBy: 'Orçamento',
                            sortDirection: 'desc',
                          })
                        }
                        className="py-2.5 px-4 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 text-[#002855] font-black transition-colors group"
                        title="Clique para ver as obras orçadas da TELEMONT na aba Registros"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-black">
                          {formatBRL(telemontGroup.subtotal.orcamento)}
                        </span>
                      </td>
                      <td
                        onClick={() =>
                          onNavigateToRegistros?.({
                            regional: filterRegional.length > 0 ? filterRegional : undefined,
                            onlyWithParcial: telemontGroup.subtotal.parcial > 0,
                            sortBy: 'Valor Parcial R$',
                            sortDirection: 'desc',
                          })
                        }
                        className="py-2.5 px-4 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-emerald-100/70 font-bold text-slate-900 transition-colors group"
                        title="Clique para ver as obras com medição parcial da TELEMONT na aba Registros"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-bold">
                          {formatBRL(telemontGroup.subtotal.parcial)}
                        </span>
                      </td>
                      <td
                        onClick={() =>
                          onNavigateToRegistros?.({
                            regional: filterRegional.length > 0 ? filterRegional : undefined,
                            onlyWithFinal: telemontGroup.subtotal.final > 0,
                            sortBy: 'Valor Final R$',
                            sortDirection: 'desc',
                          })
                        }
                        className="py-2.5 px-4 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-emerald-100/70 font-bold text-slate-900 transition-colors group"
                        title="Clique para ver as obras com medição final da TELEMONT na aba Registros"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-bold">
                          {formatBRL(telemontGroup.subtotal.final)}
                        </span>
                      </td>
                      <td
                        onClick={() =>
                          onNavigateToRegistros?.({
                            regional: filterRegional.length > 0 ? filterRegional : undefined,
                            onlyWithMedido: telemontGroup.subtotal.totalMedido > 0,
                            sortBy: 'Valor Final R$',
                            sortDirection: 'desc',
                          })
                        }
                        className="py-2.5 px-4 text-center tabular-nums cursor-pointer hover:bg-emerald-200/70 font-black text-emerald-900 transition-colors group"
                        title="Clique para ver as obras medidas da TELEMONT na aba Registros"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-black">
                          {formatBRL(telemontGroup.subtotal.totalMedido)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Card Consolidado: Exibido caso TELEMONT não esteja ativo mas haja mais de 1 regional (ex: 2 regionais) */}
          {!showTelemontTable && regionalGroups.length > 1 && (
            <div className="rounded-xl border-2 border-slate-300 bg-slate-100/90 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-200/80 text-slate-700 uppercase text-[11px] font-black tracking-wider select-none border-b border-slate-300">
                      <th colSpan={2} className="py-3 px-4 text-left font-black border-r border-slate-300">
                        Total Geral Consolidado ({regionalGroups.length} Regionais)
                      </th>
                      <th className="py-3 px-4 text-center font-black border-r border-slate-300 w-[110px]">
                        DC's
                      </th>
                      <th className="py-3 px-4 text-center font-black border-r border-slate-300 w-[160px]">
                        Orçamento
                      </th>
                      <th className="py-3 px-4 text-center font-black border-r border-slate-300 w-[160px]">
                        Valor Parcial R$
                      </th>
                      <th className="py-3 px-4 text-center font-black border-r border-slate-300 w-[160px]">
                        Valor Final R$
                      </th>
                      <th className="py-3 px-4 text-center font-black text-emerald-900 w-[180px]">
                        Valor Total Medido R$
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white font-bold text-slate-900">
                      <td
                        colSpan={2}
                        className="py-3 px-4 text-left border-r border-slate-300 uppercase text-[11px] font-black tracking-wider text-[#002855]"
                      >
                        Soma das Regionais Filtradas
                      </td>
                      <td
                        onClick={() => onNavigateToRegistros?.({ sortBy: 'DC', sortDirection: 'asc' })}
                        className="py-3 px-4 text-center tabular-nums border-r border-slate-300 cursor-pointer hover:bg-blue-100/80 text-slate-900 font-black transition-colors group"
                        title="Clique para ver todas as obras filtradas na aba Registros"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                          {totalDcs.toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td
                        onClick={() => onNavigateToRegistros?.({ sortBy: 'Orçamento', sortDirection: 'desc' })}
                        className="py-3 px-4 text-center tabular-nums border-r border-slate-300 cursor-pointer hover:bg-blue-100/80 text-[#002855] font-black transition-colors group"
                        title="Clique para ver todas as obras ordenadas por orçamento"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                          {formatBRL(totalOrcamento)}
                        </span>
                      </td>
                      <td
                        onClick={() =>
                          onNavigateToRegistros?.({
                            onlyWithParcial: true,
                            sortBy: 'Valor Parcial R$',
                            sortDirection: 'desc',
                          })
                        }
                        className="py-3 px-4 text-center tabular-nums border-r border-slate-300 cursor-pointer hover:bg-emerald-100/80 font-black text-slate-900 transition-colors group"
                        title="Clique para ver todas as obras com medição parcial na aba Registros"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                          {formatBRL(totalParcial)}
                        </span>
                      </td>
                      <td
                        onClick={() =>
                          onNavigateToRegistros?.({
                            onlyWithFinal: true,
                            sortBy: 'Valor Final R$',
                            sortDirection: 'desc',
                          })
                        }
                        className="py-3 px-4 text-center tabular-nums border-r border-slate-300 cursor-pointer hover:bg-emerald-100/80 font-black text-slate-900 transition-colors group"
                        title="Clique para ver todas as obras com medição final na aba Registros"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                          {formatBRL(totalFinal)}
                        </span>
                      </td>
                      <td
                        onClick={() =>
                          onNavigateToRegistros?.({
                            onlyWithMedido: true,
                            sortBy: 'Valor Final R$',
                            sortDirection: 'desc',
                          })
                        }
                        className="py-3 px-4 text-center tabular-nums cursor-pointer hover:bg-emerald-200/80 font-black text-emerald-900 transition-colors group"
                        title="Clique para ver todas as obras com medições (parcial ou final) na aba Registros"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                          {formatBRL(totalParcial + totalFinal)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. DUAL COLUMN: Responsável (Donut) & Status Operacional (Macro) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bloco 4: Distribuição por Responsável (Donut + Legend) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-[#002855]" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Distribuição por Responsável
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {responsavelStats.length} Áreas
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* SVG Donut Chart */}
            <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <path
                  className="text-slate-100"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />

                {(() => {
                  let accumulatedPct = 0;
                  const colors = ['#002855', '#2563EB', '#0D9488', '#94A3B8', '#64748B'];
                  const total = totalDcs || 1;

                  return responsavelStats.slice(0, 5).map((item, idx) => {
                    const pct = (item.count / total) * 100;
                    const strokeDasharray = `${pct} ${100 - pct}`;
                    const strokeDashoffset = -accumulatedPct;
                    accumulatedPct += pct;

                    return (
                      <circle
                        key={item.responsavel}
                        r="15.9155"
                        cx="18"
                        cy="18"
                        fill="transparent"
                        stroke={colors[idx % colors.length]}
                        strokeWidth="3.8"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                      />
                    );
                  });
                })()}
              </svg>

              {/* Donut Center Counter */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
                  DCs
                </span>
                <span className="text-xl font-black text-slate-900 mt-0.5">
                  {totalDcs.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Structured Legend: Responsável com Orçado e Total Medido */}
            <div className="flex-1 space-y-3 w-full">
              {responsavelStats.slice(0, 5).map((item, idx) => {
                const dotColors = ['bg-[#002855]', 'bg-blue-600', 'bg-teal-600', 'bg-amber-600', 'bg-slate-400'];

                return (
                  <div
                    key={item.responsavel}
                    className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5 transition-colors hover:bg-slate-100/70"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 truncate max-w-[65%]">
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]} shrink-0`} />
                        <button
                          type="button"
                          onClick={() =>
                            onNavigateToRegistros?.({
                              responsavel: item.rawNames && item.rawNames.length > 0 ? item.rawNames : [item.responsavel],
                              sortBy: 'Orçamento',
                              sortDirection: 'desc',
                            })
                          }
                          className="font-bold text-slate-800 hover:text-[#002855] hover:underline cursor-pointer truncate text-left transition-colors"
                          title={`Ver registros de ${item.responsavel} na aba Registros`}
                        >
                          {item.responsavel}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToRegistros?.({
                            responsavel: item.rawNames && item.rawNames.length > 0 ? item.rawNames : [item.responsavel],
                            sortBy: 'DC',
                            sortDirection: 'asc',
                          })
                        }
                        className="text-right shrink-0 font-extrabold text-slate-900 hover:text-[#002855] hover:underline cursor-pointer transition-colors"
                        title={`Ver as ${item.count} DC's de ${item.responsavel} na aba Registros`}
                      >
                        {item.count.toLocaleString('pt-BR')} DCs
                      </button>
                    </div>

                    <div className="pl-4.5 space-y-0.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-500 font-medium">Orçado:</span>
                        <span className="font-semibold text-slate-800 tabular-nums">
                          {formatBRL(item.orcamento)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-800">
                        <span className="text-slate-500 font-medium">Total Medido:</span>
                        <span className="font-extrabold text-emerald-700 tabular-nums">
                          {formatBRL(item.medido)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bloco 5: Status Operacional (Macro Agrupado) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Status Operacional Macro
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsStatusExpanded((prev) => !prev)}
              className="text-xs font-bold text-[#002855] hover:text-[#001e40] flex items-center space-x-1 cursor-pointer"
            >
              <span>{isStatusExpanded ? 'Recolher' : 'Ver todos os 24 status'}</span>
              {isStatusExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* 4 Macro Bars */}
          <div className="space-y-3.5">
            {macroStatusStats.map((st) => (
              <div key={st.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${st.bgClass}`} />
                    <span className="font-bold text-slate-800">{st.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900">{st.count} DCs</span>
                    <span className="text-slate-400 text-[11px] ml-1.5">({st.pct}%)</span>
                  </div>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${st.bgClass} transition-all duration-500`}
                    style={{ width: `${Math.min(100, parseFloat(st.pct))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Breakdown (Accordion) */}
          {isStatusExpanded && (
            <div className="pt-3 border-t border-slate-100 space-y-2 max-h-[220px] overflow-y-auto pr-1 animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Detalhamento dos status individuais de campo:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rawStatusStats.map((item) => (
                  <div key={item.status} className="p-2 bg-slate-50 border border-slate-200/80 rounded-lg text-xs flex items-center justify-between">
                    <span className="font-medium text-slate-700 truncate max-w-[70%]" title={item.status}>
                      {item.status}
                    </span>
                    <span className="font-bold text-slate-900 shrink-0">
                      {item.count} DCs
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
