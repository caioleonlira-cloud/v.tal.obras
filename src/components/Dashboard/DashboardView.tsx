import React, { useState, useMemo, useEffect } from 'react';
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

const DASHBOARD_STORAGE_KEY = 'vtal_dashboard_filters';

interface SavedDashboardFilters {
  searchDC?: string;
  filterRegional?: string[];
  filterUF?: string[];
  filterCarteira?: string[];
  filterAging?: string[];
  filterStatusAtual?: string[];
  filterStatusInforme?: string[];
  filterResponsavel?: string[];
  filterTipoProjeto?: string[];
  filterStatusMedParcial?: string[];
  filterStatusMedFinal?: string[];
  filterBacklogInput?: string[];
  filterRespMedicao?: string[];
}

const loadSavedDashboardFilters = (): SavedDashboardFilters => {
  try {
    const raw = sessionStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return {};
};

interface MedicaoGroupTableProps {
  isTelemont?: boolean;
  group: {
    regional: string;
    items: Array<{
      regional: string;
      responsavel: string;
      count: number;
      orcamento: number;
      parcial: number;
      final: number;
      faturado?: number;
      saldo?: number;
      totalMedido?: number;
      concluidas?: number;
    }>;
    subtotal: {
      count: number;
      orcamento: number;
      parcial: number;
      final: number;
      faturado?: number;
      saldo?: number;
      totalMedido: number;
      concluidas?: number;
    };
  };
  filterRegional: string[];
  onNavigateToRegistros?: (filters: RegistrosFilterPayload) => void;
}

const MedicaoGroupTable: React.FC<MedicaoGroupTableProps> = ({
  isTelemont = false,
  group,
  filterRegional,
  onNavigateToRegistros,
}) => {
  // Regionais ativas do dashboard (excluindo qualquer menção a 'TELEMONT')
  const activeDashboardRegionais = (filterRegional || []).filter(
    (r) => r && r.trim().toUpperCase() !== 'TELEMONT'
  );

  // Se for TELEMONT, não tem filtro de regional (ou apenas as regionais válidas selecionadas no dashboard).
  // Nunca deve enviar 'TELEMONT' como filtro de regional pois essa regional não existe no banco.
  const isTelemontTable = isTelemont || group.regional.toUpperCase() === 'TELEMONT';

  const targetGroupRegional = isTelemontTable
    ? (activeDashboardRegionais.length > 0 ? activeDashboardRegionais : undefined)
    : [group.regional];

  const getRowRegional = (rowRegional: string) => {
    if (isTelemontTable || rowRegional.toUpperCase() === 'TELEMONT') {
      return activeDashboardRegionais.length > 0 ? activeDashboardRegionais : undefined;
    }
    return [rowRegional];
  };

  const groupLabel = isTelemontTable
    ? 'TELEMONT (Consolidado - Todas as Regionais)'
    : `Regional ${group.regional}`;

  return (
    <div
      className={`rounded-xl border ${
        isTelemontTable ? 'border-blue-200/90 hover:border-blue-400' : 'border-slate-200 hover:border-slate-300'
      } bg-white overflow-hidden shadow-2xs transition-all`}
    >
      {/* Block Header */}
      <div className="bg-slate-50/90 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <span className="px-2.5 py-0.5 rounded-md bg-[#002855] text-white text-xs font-black tracking-wide shadow-2xs">
            {group.regional}
          </span>
          <span className="text-xs font-bold text-slate-800">
            {groupLabel}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            ({group.items.length} {group.items.length === 1 ? 'responsável' : 'responsáveis'})
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            onNavigateToRegistros?.({
              regional: targetGroupRegional,
            })
          }
          className="inline-flex items-center space-x-1 text-[11px] font-bold text-[#002855] hover:text-blue-700 hover:underline cursor-pointer transition-colors"
          title={isTelemontTable ? 'Ver todas as obras na aba Registros' : `Ver todas as obras da Regional ${group.regional} na aba Registros`}
        >
          <span>Ver todas as obras ({group.subtotal.count})</span>
          <ExternalLink className="w-3 h-3 ml-0.5" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead>
            <tr className="bg-slate-50/90 text-slate-600 uppercase text-[11px] font-bold tracking-wider select-none border-b border-slate-200 whitespace-nowrap">
              <th className="py-2.5 px-4 text-left font-semibold border-r border-slate-200 w-[120px] whitespace-nowrap">
                Regional
              </th>
              <th className="py-2.5 px-4 text-left font-semibold border-r border-slate-200 min-w-[160px] whitespace-nowrap">
                Responsável
              </th>
              <th className="py-2.5 px-4 text-center font-semibold border-r border-slate-200 w-[100px] whitespace-nowrap">
                DC's
              </th>
              <th className="py-2.5 px-4 text-center font-semibold border-r border-slate-200 min-w-[150px] w-[150px] whitespace-nowrap">
                Orçamento
              </th>
              <th className="py-2.5 px-4 text-center font-semibold border-r border-slate-200 min-w-[150px] w-[150px] whitespace-nowrap">
                Valor Parcial R$
              </th>
              <th className="py-2.5 px-4 text-center font-semibold border-r border-slate-200 min-w-[150px] w-[150px] whitespace-nowrap">
                Valor Final R$
              </th>
              <th className="py-2.5 px-4 text-center font-semibold border-r border-slate-200 min-w-[185px] w-[185px] whitespace-nowrap">
                Valor Total Medido R$
              </th>
              <th className="py-2.5 px-4 text-center font-semibold border-r border-slate-200 min-w-[150px] w-[150px] whitespace-nowrap">
                Valor Faturado
              </th>
              <th className="py-2.5 px-4 text-center font-semibold min-w-[140px] w-[140px] whitespace-nowrap">
                Saldo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 text-slate-700">
            {group.items.map((row, idx) => {
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
                  <td className="py-2.5 px-4 border-b border-r border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 truncate">
                        {row.responsavel}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToRegistros?.({
                            regional: getRowRegional(row.regional),
                            responsavel: [row.responsavel],
                          })
                        }
                        className="opacity-0 group-hover:opacity-100 text-[#002855] hover:text-blue-700 p-0.5 rounded transition-opacity"
                        title={
                          isTelemontTable
                            ? `Filtrar ${row.responsavel} na aba Registros`
                            : `Filtrar ${row.responsavel} (${row.regional}) na aba Registros`
                        }
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  {/* DC's */}
                  <td
                    onClick={() =>
                      onNavigateToRegistros?.({
                        regional: getRowRegional(row.regional),
                        responsavel: [row.responsavel],
                        sortBy: 'DC',
                        sortDirection: 'asc',
                      })
                    }
                    className="py-2.5 px-4 text-center tabular-nums border-b border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 text-slate-900 font-black transition-colors group"
                    title={
                      isTelemontTable
                        ? `Clique para ver as ${row.count} obras de ${row.responsavel} na aba Registros`
                        : `Clique para ver as ${row.count} obras de ${row.responsavel} (${row.regional}) na aba Registros`
                    }
                  >
                    <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                      {row.count.toLocaleString('pt-BR')}
                    </span>
                  </td>

                  {/* Orçamento */}
                  <td
                    onClick={() =>
                      onNavigateToRegistros?.({
                        regional: getRowRegional(row.regional),
                        responsavel: [row.responsavel],
                        sortBy: 'Orçamento',
                        sortDirection: 'desc',
                      })
                    }
                    className="py-2.5 px-4 text-center tabular-nums border-b border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 text-[#002855] font-black transition-colors group"
                    title={
                      isTelemontTable
                        ? `Clique para ver as obras de ${row.responsavel} ordenadas por orçamento`
                        : `Clique para ver as obras de ${row.responsavel} (${row.regional}) ordenadas por orçamento`
                    }
                  >
                    <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-black">
                      {formatBRL(row.orcamento)}
                    </span>
                  </td>

                  {/* Valor Parcial R$ */}
                  <td
                    onClick={() =>
                      onNavigateToRegistros?.({
                        regional: getRowRegional(row.regional),
                        responsavel: [row.responsavel],
                        onlyWithParcial: row.parcial > 0,
                        sortBy: 'Valor Parcial R$',
                        sortDirection: 'desc',
                      })
                    }
                    className={`py-2.5 px-4 text-center tabular-nums border-b border-r border-slate-200/80 transition-colors group ${
                      row.parcial > 0
                        ? 'cursor-pointer hover:bg-emerald-100/70 font-bold text-slate-900'
                        : 'text-slate-400 font-normal'
                    }`}
                    title={
                      row.parcial > 0
                        ? isTelemontTable
                          ? `Clique para ver as obras com medição parcial de ${row.responsavel} na aba Registros`
                          : `Clique para ver as obras com medição parcial de ${row.responsavel} (${row.regional}) na aba Registros`
                        : undefined
                    }
                  >
                    <span className={`inline-block py-0.5 px-2 rounded ${row.parcial > 0 ? 'group-hover:underline' : ''}`}>
                      {formatBRL(row.parcial)}
                    </span>
                  </td>

                  {/* Valor Final R$ */}
                  <td
                    onClick={() =>
                      onNavigateToRegistros?.({
                        regional: getRowRegional(row.regional),
                        responsavel: [row.responsavel],
                        onlyWithFinal: row.final > 0,
                        sortBy: 'Valor Final R$',
                        sortDirection: 'desc',
                      })
                    }
                    className={`py-2.5 px-4 text-center tabular-nums border-b border-r border-slate-200/80 transition-colors group ${
                      row.final > 0
                        ? 'cursor-pointer hover:bg-emerald-100/70 font-bold text-slate-900'
                        : 'text-slate-400 font-normal'
                    }`}
                    title={
                      row.final > 0
                        ? isTelemontTable
                          ? `Clique para ver as obras com medição final de ${row.responsavel} na aba Registros`
                          : `Clique para ver as obras com medição final de ${row.responsavel} (${row.regional}) na aba Registros`
                        : undefined
                    }
                  >
                    <span className={`inline-block py-0.5 px-2 rounded ${row.final > 0 ? 'group-hover:underline' : ''}`}>
                      {formatBRL(row.final)}
                    </span>
                  </td>

                  {/* Valor Total Medido R$ */}
                  <td
                    onClick={() =>
                      onNavigateToRegistros?.({
                        regional: getRowRegional(row.regional),
                        responsavel: [row.responsavel],
                        onlyWithMedido: totalMedidoLinha > 0,
                        sortBy: 'Valor Final R$',
                        sortDirection: 'desc',
                      })
                    }
                    className={`py-2.5 px-4 text-center tabular-nums border-b border-r border-slate-200/80 transition-colors group ${
                      totalMedidoLinha > 0
                        ? 'cursor-pointer hover:bg-emerald-200/70 font-black text-emerald-900'
                        : 'text-slate-400 font-normal'
                    }`}
                    title={
                      totalMedidoLinha > 0
                        ? isTelemontTable
                          ? `Clique para ver as obras medidas de ${row.responsavel} na aba Registros`
                          : `Clique para ver as obras medidas de ${row.responsavel} (${row.regional}) na aba Registros`
                        : undefined
                    }
                  >
                    <span className={`inline-block py-0.5 px-2 rounded font-black ${totalMedidoLinha > 0 ? 'group-hover:underline' : ''}`}>
                      {formatBRL(totalMedidoLinha)}
                    </span>
                  </td>

                  {/* Valor Faturado */}
                  <td
                    onClick={() =>
                      onNavigateToRegistros?.({
                        regional: getRowRegional(row.regional),
                        responsavel: [row.responsavel],
                        onlyWithFaturado: (row.faturado || 0) > 0,
                        sortBy: 'Valor Faturado',
                        sortDirection: 'desc',
                      })
                    }
                    className={`py-2.5 px-4 text-center tabular-nums border-b border-r border-slate-200/80 transition-colors group ${
                      (row.faturado || 0) > 0
                        ? 'cursor-pointer hover:bg-blue-100/70 font-bold text-slate-900'
                        : 'text-slate-400 font-normal'
                    }`}
                    title={
                      (row.faturado || 0) > 0
                        ? isTelemontTable
                          ? `Clique para ver as obras faturadas de ${row.responsavel} na aba Registros`
                          : `Clique para ver as obras faturadas de ${row.responsavel} (${row.regional}) na aba Registros`
                        : undefined
                    }
                  >
                    <span className={`inline-block py-0.5 px-2 rounded ${(row.faturado || 0) > 0 ? 'group-hover:underline' : ''}`}>
                      {formatBRL(row.faturado || 0)}
                    </span>
                  </td>

                  {/* Saldo */}
                  <td
                    onClick={() =>
                      onNavigateToRegistros?.({
                        regional: getRowRegional(row.regional),
                        responsavel: [row.responsavel],
                        onlyWithSaldo: (row.saldo || 0) > 0,
                        sortBy: 'Saldo',
                        sortDirection: 'desc',
                      })
                    }
                    className={`py-2.5 px-4 text-center tabular-nums border-b border-slate-200/80 transition-colors group ${
                      (row.saldo || 0) > 0
                        ? 'cursor-pointer hover:bg-indigo-100/70 font-bold text-slate-900'
                        : 'text-slate-400 font-normal'
                    }`}
                    title={
                      (row.saldo || 0) > 0
                        ? isTelemontTable
                          ? `Clique para ver as obras com saldo de ${row.responsavel} na aba Registros`
                          : `Clique para ver as obras com saldo de ${row.responsavel} (${row.regional}) na aba Registros`
                        : undefined
                    }
                  >
                    <span className={`inline-block py-0.5 px-2 rounded ${(row.saldo || 0) > 0 ? 'group-hover:underline' : ''}`}>
                      {formatBRL(row.saldo || 0)}
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
                className="py-2.5 px-4 text-left border-r border-slate-200/80 uppercase text-[11px] font-black tracking-wider text-[#002855]"
              >
                Subtotal {isTelemontTable ? 'TELEMONT' : group.regional}
              </td>
              <td
                onClick={() =>
                  onNavigateToRegistros?.({
                    regional: targetGroupRegional,
                    sortBy: 'DC',
                    sortDirection: 'asc',
                  })
                }
                className="py-2.5 px-4 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 text-slate-900 font-black transition-colors group"
                title={
                  isTelemontTable
                    ? 'Clique para ver todas as obras na aba Registros'
                    : `Clique para ver todas as obras da ${group.regional} na aba Registros`
                }
              >
                <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-black">
                  {group.subtotal.count.toLocaleString('pt-BR')}
                </span>
              </td>
              <td
                onClick={() =>
                  onNavigateToRegistros?.({
                    regional: targetGroupRegional,
                    sortBy: 'Orçamento',
                    sortDirection: 'desc',
                  })
                }
                className="py-2.5 px-4 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 text-[#002855] font-black transition-colors group"
                title={
                  isTelemontTable
                    ? 'Clique para ver as obras orçadas na aba Registros'
                    : `Clique para ver as obras orçadas da ${group.regional} na aba Registros`
                }
              >
                <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-black">
                  {formatBRL(group.subtotal.orcamento)}
                </span>
              </td>
              <td
                onClick={() =>
                  onNavigateToRegistros?.({
                    regional: targetGroupRegional,
                    onlyWithParcial: group.subtotal.parcial > 0,
                    sortBy: 'Valor Parcial R$',
                    sortDirection: 'desc',
                  })
                }
                className="py-2.5 px-4 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-emerald-100/70 font-bold text-slate-900 transition-colors group"
                title={
                  isTelemontTable
                    ? 'Clique para ver as obras com medição parcial na aba Registros'
                    : `Clique para ver as obras com medição parcial da ${group.regional} na aba Registros`
                }
              >
                <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-bold">
                  {formatBRL(group.subtotal.parcial)}
                </span>
              </td>
              <td
                onClick={() =>
                  onNavigateToRegistros?.({
                    regional: targetGroupRegional,
                    onlyWithFinal: group.subtotal.final > 0,
                    sortBy: 'Valor Final R$',
                    sortDirection: 'desc',
                  })
                }
                className="py-2.5 px-4 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-emerald-100/70 font-bold text-slate-900 transition-colors group"
                title={
                  isTelemontTable
                    ? 'Clique para ver as obras com medição final na aba Registros'
                    : `Clique para ver as obras com medição final da ${group.regional} na aba Registros`
                }
              >
                <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-bold">
                  {formatBRL(group.subtotal.final)}
                </span>
              </td>
              <td
                onClick={() =>
                  onNavigateToRegistros?.({
                    regional: targetGroupRegional,
                    onlyWithMedido: group.subtotal.totalMedido > 0,
                    sortBy: 'Valor Final R$',
                    sortDirection: 'desc',
                  })
                }
                className="py-2.5 px-4 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-emerald-200/70 font-black text-emerald-900 transition-colors group"
                title={
                  isTelemontTable
                    ? 'Clique para ver as obras medidas na aba Registros'
                    : `Clique para ver as obras medidas da ${group.regional} na aba Registros`
                }
              >
                <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-black">
                  {formatBRL(group.subtotal.totalMedido)}
                </span>
              </td>
              <td
                onClick={() =>
                  onNavigateToRegistros?.({
                    regional: targetGroupRegional,
                    onlyWithFaturado: (group.subtotal.faturado || 0) > 0,
                    sortBy: 'Valor Faturado',
                    sortDirection: 'desc',
                  })
                }
                className="py-2.5 px-4 text-center tabular-nums border-r border-slate-200/80 cursor-pointer hover:bg-blue-100/70 font-black text-blue-900 transition-colors group"
                title={
                  isTelemontTable
                    ? 'Clique para ver as obras faturadas na aba Registros'
                    : `Clique para ver as obras faturadas da ${group.regional} na aba Registros`
                }
              >
                <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-black">
                  {formatBRL(group.subtotal.faturado || 0)}
                </span>
              </td>
              <td
                onClick={() =>
                  onNavigateToRegistros?.({
                    regional: targetGroupRegional,
                    onlyWithSaldo: (group.subtotal.saldo || 0) > 0,
                    sortBy: 'Saldo',
                    sortDirection: 'desc',
                  })
                }
                className="py-2.5 px-4 text-center tabular-nums cursor-pointer hover:bg-indigo-100/70 font-black text-indigo-900 transition-colors group"
                title={
                  isTelemontTable
                    ? 'Clique para ver as obras com saldo na aba Registros'
                    : `Clique para ver as obras com saldo da ${group.regional} na aba Registros`
                }
              >
                <span className="inline-block py-0.5 px-2 rounded group-hover:underline font-black">
                  {formatBRL(group.subtotal.saldo || 0)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToRegistros }) => {
  const { registros, lastImportInfo, loadingRegistros } = useData();

  const initialSavedFilters = useMemo(() => loadSavedDashboardFilters(), []);

  // 1. Search by DC
  const [searchDC, setSearchDC] = useState(initialSavedFilters.searchDC || '');

  // 2. Filters (10 Multi-Selects aligned with RegistrosView)
  const [filterRegional, setFilterRegional] = useState<string[]>(initialSavedFilters.filterRegional || []);
  const [filterUF, setFilterUF] = useState<string[]>(initialSavedFilters.filterUF || []);
  const [filterCarteira, setFilterCarteira] = useState<string[]>(initialSavedFilters.filterCarteira || []);
  const [filterAging, setFilterAging] = useState<string[]>(initialSavedFilters.filterAging || []);
  const [filterStatusAtual, setFilterStatusAtual] = useState<string[]>(initialSavedFilters.filterStatusAtual || []);
  const [filterStatusInforme, setFilterStatusInforme] = useState<string[]>(initialSavedFilters.filterStatusInforme || []);
  const [filterResponsavel, setFilterResponsavel] = useState<string[]>(initialSavedFilters.filterResponsavel || []);
  const [filterTipoProjeto, setFilterTipoProjeto] = useState<string[]>(initialSavedFilters.filterTipoProjeto || []);
  const [filterStatusMedParcial, setFilterStatusMedParcial] = useState<string[]>(initialSavedFilters.filterStatusMedParcial || []);
  const [filterStatusMedFinal, setFilterStatusMedFinal] = useState<string[]>(initialSavedFilters.filterStatusMedFinal || []);
  const [filterBacklogInput, setFilterBacklogInput] = useState<string[]>(initialSavedFilters.filterBacklogInput || []);
  const [filterRespMedicao, setFilterRespMedicao] = useState<string[]>(initialSavedFilters.filterRespMedicao || []);

  // Persist dashboard filter state across page reloads/sessions
  useEffect(() => {
    try {
      const stateToSave: SavedDashboardFilters = {
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
        filterRespMedicao,
      };
      sessionStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch {
      // ignore
    }
  }, [
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
    filterRespMedicao,
  ]);

  // Accordion for status details
  const [isStatusExpanded, setIsStatusExpanded] = useState(false);
  // Filter panel collapse on smaller screens
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  // Helper to drilldown preserving all active dashboard filters
  const handleNavigateWithDashboardFilters = (extraFilters: RegistrosFilterPayload) => {
    if (!onNavigateToRegistros) return;

    // 1. Gather all active dashboard filters
    const payload: RegistrosFilterPayload = {};

    if (searchDC.trim()) payload.searchDC = searchDC.trim();
    if (filterRegional.length > 0) payload.regional = [...filterRegional];
    if (filterUF.length > 0) payload.uf = [...filterUF];
    if (filterCarteira.length > 0) payload.carteira = [...filterCarteira];
    if (filterAging.length > 0) payload.aging = [...filterAging];
    if (filterStatusAtual.length > 0) payload.statusAtual = [...filterStatusAtual];
    if (filterStatusInforme.length > 0) payload.statusInforme = [...filterStatusInforme];
    if (filterResponsavel.length > 0) payload.responsavel = [...filterResponsavel];
    if (filterTipoProjeto.length > 0) payload.tipoProjeto = [...filterTipoProjeto];
    if (filterStatusMedParcial.length > 0) payload.statusMedParcial = [...filterStatusMedParcial];
    if (filterStatusMedFinal.length > 0) payload.statusMedFinal = [...filterStatusMedFinal];
    if (filterBacklogInput.length > 0) payload.backlogInput = [...filterBacklogInput];
    if (filterRespMedicao.length > 0) payload.respMedicao = [...filterRespMedicao];

    // 2. Override/add drilldown specifics
    if ('searchDC' in extraFilters) {
      payload.searchDC = extraFilters.searchDC;
    }
    if ('regional' in extraFilters) {
      if (extraFilters.regional === undefined || extraFilters.regional.length === 0) {
        delete payload.regional;
      } else {
        payload.regional = extraFilters.regional;
      }
    }
    if ('responsavel' in extraFilters) {
      if (extraFilters.responsavel === undefined || extraFilters.responsavel.length === 0) {
        delete payload.responsavel;
      } else {
        payload.responsavel = extraFilters.responsavel;
      }
    }
    if ('respMedicao' in extraFilters) payload.respMedicao = extraFilters.respMedicao;
    if ('uf' in extraFilters) payload.uf = extraFilters.uf;
    if ('carteira' in extraFilters) payload.carteira = extraFilters.carteira;
    if ('aging' in extraFilters) payload.aging = extraFilters.aging;
    if ('statusAtual' in extraFilters) payload.statusAtual = extraFilters.statusAtual;
    if ('statusInforme' in extraFilters) payload.statusInforme = extraFilters.statusInforme;
    if ('tipoProjeto' in extraFilters) payload.tipoProjeto = extraFilters.tipoProjeto;
    if ('statusMedParcial' in extraFilters) payload.statusMedParcial = extraFilters.statusMedParcial;
    if ('statusMedFinal' in extraFilters) payload.statusMedFinal = extraFilters.statusMedFinal;
    if ('backlogInput' in extraFilters) payload.backlogInput = extraFilters.backlogInput;

    if (extraFilters.onlyWithParcial !== undefined) payload.onlyWithParcial = extraFilters.onlyWithParcial;
    if (extraFilters.onlyWithFinal !== undefined) payload.onlyWithFinal = extraFilters.onlyWithFinal;
    if (extraFilters.onlyWithMedido !== undefined) payload.onlyWithMedido = extraFilters.onlyWithMedido;
    if (extraFilters.onlyWithFaturado !== undefined) payload.onlyWithFaturado = extraFilters.onlyWithFaturado;
    if (extraFilters.onlyWithSaldo !== undefined) payload.onlyWithSaldo = extraFilters.onlyWithSaldo;
    if (extraFilters.sortBy) payload.sortBy = extraFilters.sortBy;
    if (extraFilters.sortDirection) payload.sortDirection = extraFilters.sortDirection;

    // 3. Clean any 'TELEMONT' literal from regional
    if (payload.regional) {
      payload.regional = payload.regional.filter(
        (r) => r && r.trim().toUpperCase() !== 'TELEMONT'
      );
      if (payload.regional.length === 0) {
        delete payload.regional;
      }
    }

    onNavigateToRegistros(payload);
  };

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
      | 'BACKLOG_INPUT'
      | 'RESP_MEDICAO'
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
    if (excludeKey !== 'BACKLOG_INPUT' && filterBacklogInput.length > 0) {
      const val = (item['Backlog/Input?'] || '').trim();
      if (!val || !filterBacklogInput.includes(val)) return false;
    }
    if (excludeKey !== 'RESP_MEDICAO' && filterRespMedicao.length > 0) {
      const val = (item['Resp.Medição'] || (item as any)['Resp. Medição'] || '').trim();
      if (!val || !filterRespMedicao.includes(val)) return false;
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
    backlogInputOptions,
    backlogInputCounts,
    respMedicaoOptions,
    respMedicaoCounts,
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
    const respMedCounts: Record<string, number> = {};

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
      if (r['Backlog/Input?']) {
        const val = r['Backlog/Input?'].trim();
        if (matchesFilterSubset(r, 'BACKLOG_INPUT')) backlogInpCounts[val] = (backlogInpCounts[val] || 0) + 1;
        else if (filterBacklogInput.includes(val) && !backlogInpCounts[val]) backlogInpCounts[val] = 0;
      }
      const rmVal = (r['Resp.Medição'] || (r as any)['Resp. Medição'] || '').trim();
      if (rmVal) {
        if (matchesFilterSubset(r, 'RESP_MEDICAO')) respMedCounts[rmVal] = (respMedCounts[rmVal] || 0) + 1;
        else if (filterRespMedicao.includes(rmVal) && !respMedCounts[rmVal]) respMedCounts[rmVal] = 0;
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
      respMedicaoOptions: Object.keys(respMedCounts).sort(),
      respMedicaoCounts: respMedCounts,
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
    filterBacklogInput,
    filterRespMedicao,
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
    filterBacklogInput,
    filterRespMedicao,
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
    filterStatusMedFinal.length +
    filterBacklogInput.length +
    filterRespMedicao.length;

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
    setFilterBacklogInput([]);
    setFilterRespMedicao([]);
    try {
      sessionStorage.removeItem(DASHBOARD_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Aggregated calculations
  const {
    totalDcs,
    totalOrcamento,
    totalParcial,
    totalFinal,
    totalMedido,
    totalFaturado,
    totalSaldo,
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
    let fatTotal = 0;
    let sldTotal = 0;

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
      {
        regional: string;
        responsavel: string;
        count: number;
        orcamento: number;
        parcial: number;
        final: number;
        faturado: number;
        saldo: number;
      }
    > = {};

    filteredRegistros.forEach((r) => {
      const o = parseCurrencyValue(r.Orçamento);
      const p = parseCurrencyValue(r['Valor Parcial R$']);
      const f = parseCurrencyValue(r['Valor Final R$']);
      const fat = parseCurrencyValue(r['Valor Faturado']);
      const sld = parseCurrencyValue(r.Saldo);
      const m = p + f;

      orc += o;
      parc += p;
      fin += f;
      fatTotal += fat;
      sldTotal += sld;

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
          faturado: 0,
          saldo: 0,
        };
      }
      regRespComboMap[comboKey].count++;
      regRespComboMap[comboKey].orcamento += o;
      regRespComboMap[comboKey].parcial += p;
      regRespComboMap[comboKey].final += f;
      regRespComboMap[comboKey].faturado += fat;
      regRespComboMap[comboKey].saldo += sld;

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
          faturado: number;
          saldo: number;
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
          subtotal: { count: 0, orcamento: 0, parcial: 0, final: 0, faturado: 0, saldo: 0, totalMedido: 0 },
        };
      }
      regionalGroupsMap[reg].items.push(row);
      regionalGroupsMap[reg].subtotal.count += row.count;
      regionalGroupsMap[reg].subtotal.orcamento += row.orcamento;
      regionalGroupsMap[reg].subtotal.parcial += row.parcial;
      regionalGroupsMap[reg].subtotal.final += row.final;
      regionalGroupsMap[reg].subtotal.faturado += row.faturado || 0;
      regionalGroupsMap[reg].subtotal.saldo += row.saldo || 0;
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
        faturado: number;
        saldo: number;
      }
    > = {};

    filteredRegistros.forEach((r) => {
      const respCategory = (r.Responsavel || 'Não Atribuído').trim();
      const o = parseCurrencyValue(r['Orçamento'] || r.Orçamento);
      const p = parseCurrencyValue(r['Valor Parcial R$']);
      const f = parseCurrencyValue(r['Valor Final R$']);
      const fat = parseCurrencyValue(r['Valor Faturado']);
      const sld = parseCurrencyValue(r.Saldo);

      if (!telemontItemsMap[respCategory]) {
        telemontItemsMap[respCategory] = {
          regional: 'TELEMONT',
          responsavel: respCategory,
          count: 0,
          orcamento: 0,
          parcial: 0,
          final: 0,
          faturado: 0,
          saldo: 0,
        };
      }
      telemontItemsMap[respCategory].count++;
      telemontItemsMap[respCategory].orcamento += o;
      telemontItemsMap[respCategory].parcial += p;
      telemontItemsMap[respCategory].final += f;
      telemontItemsMap[respCategory].faturado += fat;
      telemontItemsMap[respCategory].saldo += sld;
    });

    const telemontItems = Object.values(telemontItemsMap).sort((a, b) => b.orcamento - a.orcamento);

    const telemontSubtotal = telemontItems.reduce(
      (acc, cur) => {
        acc.count += cur.count;
        acc.orcamento += cur.orcamento;
        acc.parcial += cur.parcial;
        acc.final += cur.final;
        acc.faturado += cur.faturado;
        acc.saldo += cur.saldo;
        acc.totalMedido += cur.parcial + cur.final;
        return acc;
      },
      { count: 0, orcamento: 0, parcial: 0, final: 0, faturado: 0, saldo: 0, totalMedido: 0 }
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
      totalFaturado: fatTotal,
      totalSaldo: sldTotal,
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

          {/* Row 2: Collapsible Filters (Responsivo e Sem Scrollbar Interna) */}
          {isFiltersOpen && (
            <div className="pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-11 gap-2 items-end">
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

                {/* 9. Status Med. Final (Ponto 5) */}
                <MultiSelectFilter
                  label="Status Med. Final"
                  columnRefName="Final"
                  options={statusMedFinalOptions}
                  selected={filterStatusMedFinal}
                  onChange={setFilterStatusMedFinal}
                  optionCounts={statusMedFinalCounts}
                  placeholder="Todos"
                />

                {/* 10. Plan. Estruturante (Antigo Backlog/Input?) */}
                <MultiSelectFilter
                  label="Plan. Estruturante"
                  columnRefName="Tipo"
                  options={backlogInputOptions}
                  selected={filterBacklogInput}
                  onChange={setFilterBacklogInput}
                  optionCounts={backlogInputCounts}
                  placeholder="Todos"
                />

                {/* 11. Resp. Medição */}
                <MultiSelectFilter
                  label="Resp. Medição"
                  columnRefName="Medição"
                  options={respMedicaoOptions}
                  selected={filterRespMedicao}
                  onChange={setFilterRespMedicao}
                  optionCounts={respMedicaoCounts}
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
        <div
          onClick={() => handleNavigateWithDashboardFilters({ sortBy: 'DC', sortDirection: 'asc' })}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all group"
          title="Clique para ver todos os registros filtrados na aba Registros"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block group-hover:text-blue-700 transition-colors">
                Total de DCs
              </span>
              <span className="text-3xl font-black text-slate-900 mt-1 block">
                {totalDcs.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#002855] flex items-center justify-center font-bold shrink-0 group-hover:bg-blue-50 transition-colors">
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
        <div
          onClick={() => handleNavigateWithDashboardFilters({ sortBy: 'Orçamento', sortDirection: 'desc' })}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all group"
          title="Clique para ver registros ordenados por orçamento na aba Registros"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block group-hover:text-blue-700 transition-colors">
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
            <span>Faturado: <strong className="text-blue-700 font-bold">{formatBRL(totalFaturado)}</strong></span>
            <span>Saldo: <strong className="text-indigo-700 font-bold">{formatBRL(totalSaldo)}</strong></span>
          </div>
        </div>

        {/* Card 3: Valor Medido Total */}
        <div
          onClick={() =>
            handleNavigateWithDashboardFilters({
              onlyWithMedido: true,
              sortBy: 'Valor Final R$',
              sortDirection: 'desc',
            })
          }
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-emerald-400 hover:shadow-sm cursor-pointer transition-all group"
          title="Clique para ver todos os registros com medição na aba Registros"
        >
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
        <div
          onClick={() => handleNavigateWithDashboardFilters({ sortBy: 'DC', sortDirection: 'asc' })}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-400 hover:shadow-sm cursor-pointer transition-all group"
          title="Clique para ver obras filtradas na aba Registros"
        >
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
            <>
              {/* 1. Tabela Consolidada TELEMONT em PRIMEIRO (conforme Ponto 1) */}
              {showTelemontTable && (
                <MedicaoGroupTable
                  isTelemont
                  group={telemontGroup}
                  filterRegional={filterRegional}
                  onNavigateToRegistros={handleNavigateWithDashboardFilters}
                />
              )}

              {/* 2. Regionais Separadas Abaixo da TELEMONT (conforme Ponto 1) */}
              {regionalGroups.map((regGroup) => (
                <MedicaoGroupTable
                  key={regGroup.regional}
                  group={regGroup}
                  filterRegional={filterRegional}
                  onNavigateToRegistros={handleNavigateWithDashboardFilters}
                />
              ))}

            </>
          )}

          {/* Card Consolidado: Exibido caso TELEMONT não esteja ativo mas haja mais de 1 regional (ex: 2 regionais) */}
          {!showTelemontTable && regionalGroups.length > 1 && (
            <div className="rounded-xl border-2 border-slate-300 bg-slate-100/90 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-200/80 text-slate-700 uppercase text-[11px] font-black tracking-wider select-none border-b border-slate-300 whitespace-nowrap">
                      <th colSpan={2} className="py-3 px-4 text-left font-black border-r border-slate-300 whitespace-nowrap">
                        Total Geral Consolidado ({regionalGroups.length} Regionais)
                      </th>
                      <th className="py-3 px-4 text-center font-black border-r border-slate-300 w-[100px] whitespace-nowrap">
                        DC's
                      </th>
                      <th className="py-3 px-4 text-center font-black border-r border-slate-300 min-w-[150px] w-[150px] whitespace-nowrap">
                        Orçamento
                      </th>
                      <th className="py-3 px-4 text-center font-black border-r border-slate-300 min-w-[150px] w-[150px] whitespace-nowrap">
                        Valor Parcial R$
                      </th>
                      <th className="py-3 px-4 text-center font-black border-r border-slate-300 min-w-[150px] w-[150px] whitespace-nowrap">
                        Valor Final R$
                      </th>
                      <th className="py-3 px-4 text-center font-black border-r border-slate-300 min-w-[185px] w-[185px] whitespace-nowrap">
                        Valor Total Medido R$
                      </th>
                      <th className="py-3 px-4 text-center font-black border-r border-slate-300 min-w-[150px] w-[150px] whitespace-nowrap">
                        Valor Faturado
                      </th>
                      <th className="py-3 px-4 text-center font-black min-w-[140px] w-[140px] whitespace-nowrap">
                        Saldo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white font-bold text-slate-900 whitespace-nowrap">
                      <td
                        colSpan={2}
                        className="py-3 px-4 text-left border-r border-slate-300 uppercase text-[11px] font-black tracking-wider text-[#002855] whitespace-nowrap"
                      >
                        Soma das Regionais Filtradas
                      </td>
                      <td
                        onClick={() => handleNavigateWithDashboardFilters({ sortBy: 'DC', sortDirection: 'asc' })}
                        className="py-3 px-4 text-center tabular-nums border-r border-slate-300 cursor-pointer hover:bg-blue-100/80 text-slate-900 font-black transition-colors group whitespace-nowrap"
                        title="Clique para ver todas as obras filtradas na aba Registros"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                          {totalDcs.toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td
                        onClick={() => handleNavigateWithDashboardFilters({ sortBy: 'Orçamento', sortDirection: 'desc' })}
                        className="py-3 px-4 text-center tabular-nums border-r border-slate-300 cursor-pointer hover:bg-blue-100/80 text-[#002855] font-black transition-colors group whitespace-nowrap"
                        title="Clique para ver todas as obras ordenadas por orçamento"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                          {formatBRL(totalOrcamento)}
                        </span>
                      </td>
                      <td
                        onClick={() =>
                          handleNavigateWithDashboardFilters({
                            onlyWithParcial: true,
                            sortBy: 'Valor Parcial R$',
                            sortDirection: 'desc',
                          })
                        }
                        className="py-3 px-4 text-center tabular-nums border-r border-slate-300 cursor-pointer hover:bg-emerald-100/80 font-black text-slate-900 transition-colors group whitespace-nowrap"
                        title="Clique para ver todas as obras com medição parcial na aba Registros"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                          {formatBRL(totalParcial)}
                        </span>
                      </td>
                      <td
                        onClick={() =>
                          handleNavigateWithDashboardFilters({
                            onlyWithFinal: true,
                            sortBy: 'Valor Final R$',
                            sortDirection: 'desc',
                          })
                        }
                        className="py-3 px-4 text-center tabular-nums border-r border-slate-300 cursor-pointer hover:bg-emerald-100/80 font-black text-slate-900 transition-colors group whitespace-nowrap"
                        title="Clique para ver todas as obras com medição final na aba Registros"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                          {formatBRL(totalFinal)}
                        </span>
                      </td>
                      <td
                        onClick={() =>
                          handleNavigateWithDashboardFilters({
                            onlyWithMedido: true,
                            sortBy: 'Valor Final R$',
                            sortDirection: 'desc',
                          })
                        }
                        className="py-3 px-4 text-center tabular-nums border-r border-slate-300 cursor-pointer hover:bg-emerald-200/80 font-black text-emerald-900 transition-colors group whitespace-nowrap"
                        title="Clique para ver todas as obras com medições (parcial ou final) na aba Registros"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                          {formatBRL(totalParcial + totalFinal)}
                        </span>
                      </td>
                      <td
                        onClick={() =>
                          handleNavigateWithDashboardFilters({
                            onlyWithFaturado: true,
                            sortBy: 'Valor Faturado',
                            sortDirection: 'desc',
                          })
                        }
                        className="py-3 px-4 text-center tabular-nums border-r border-slate-300 cursor-pointer hover:bg-blue-100/80 font-black text-blue-800 transition-colors group whitespace-nowrap"
                        title="Clique para ver todas as obras faturadas na aba Registros"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                          {formatBRL(totalFaturado)}
                        </span>
                      </td>
                      <td
                        onClick={() =>
                          handleNavigateWithDashboardFilters({
                            onlyWithSaldo: true,
                            sortBy: 'Saldo',
                            sortDirection: 'desc',
                          })
                        }
                        className="py-3 px-4 text-center tabular-nums cursor-pointer hover:bg-indigo-100/80 font-black text-indigo-900 transition-colors group whitespace-nowrap"
                        title="Clique para ver todas as obras com saldo a faturar na aba Registros"
                      >
                        <span className="inline-block py-0.5 px-2 rounded group-hover:underline">
                          {formatBRL(totalSaldo)}
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
                            handleNavigateWithDashboardFilters({
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
                          handleNavigateWithDashboardFilters({
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
                  <div
                    key={item.status}
                    onClick={() => handleNavigateWithDashboardFilters({ statusInforme: [item.status] })}
                    className="p-2 bg-slate-50 border border-slate-200/80 rounded-lg text-xs flex items-center justify-between cursor-pointer hover:bg-blue-50/80 hover:border-blue-300 transition-colors group"
                    title={`Filtrar status "${item.status}" na aba Registros`}
                  >
                    <span className="font-medium text-slate-700 truncate max-w-[70%] group-hover:text-blue-900" title={item.status}>
                      {item.status}
                    </span>
                    <span className="font-bold text-slate-900 shrink-0 group-hover:text-blue-900 group-hover:underline">
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
