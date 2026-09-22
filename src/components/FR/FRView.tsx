import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  RotateCw,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Layers,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Clock,
  HelpCircle,
  X,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { FR_COLUMNS, FRRegistro } from '../../types';
import { exportarFRParaExcel } from '../../utils/excel';
import { formatCurrency, parseFRValor } from '../../utils/currency';
import { parseMesAnoSortKey } from '../../utils/monthUtils';
import {
  getFRFilterValue,
  matchesFRFilter,
  sortFilterOptions,
  BLANK_FILTER_OPTION,
} from '../../utils/filterUtils';
import { MultiSelectFilter } from '../Registros/MultiSelectFilter';

type SortDirection = 'asc' | 'desc' | null;

export const FRView: React.FC = () => {
  const { frRegistros, loadingFRs, importInfoFR, refreshFRs } = useData();

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedUF, setSelectedUF] = useState<string[]>([]);
  const [selectedREG, setSelectedREG] = useState<string[]>([]);
  const [selectedMes, setSelectedMes] = useState<string[]>([]);
  const [selectedOperacao, setSelectedOperacao] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState<string>(''); // YYYY-MM-DD
  const [dataFim, setDataFim] = useState<string>(''); // YYYY-MM-DD

  // Sorting
  const [sortField, setSortField] = useState<keyof FRRegistro | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Pagination
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Helper to parse DD/MM/YYYY into timestamp for range comparison
  const parseDateToTimestamp = (dateStr: string): number | null => {
    if (!dateStr) return null;
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }
    const iso = Date.parse(dateStr);
    return isNaN(iso) ? null : iso;
  };

  // Helper for correlated filtering
  const matchesFRFilterSubset = (
    item: FRRegistro,
    excludeKey?: 'UF' | 'REG' | 'MES' | 'OPERACAO'
  ) => {
    if (!item) return false;

    // 1. Text Search (DC-M, FR, Nº MEDIÇÃO, Nº PEDIDO, LOCALIDADE DE PRESTAÇÃO, CENTRO, UF)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const match =
        (item['DC-M'] && item['DC-M'].toLowerCase().includes(term)) ||
        (item.FR && item.FR.toLowerCase().includes(term)) ||
        (item['Nº MEDIÇÃO'] && item['Nº MEDIÇÃO'].toLowerCase().includes(term)) ||
        (item['Nº PEDIDO'] && item['Nº PEDIDO'].toLowerCase().includes(term)) ||
        (item['LOCALIDADE DE PRESTAÇÃO'] && item['LOCALIDADE DE PRESTAÇÃO'].toLowerCase().includes(term)) ||
        (item.CENTRO && item.CENTRO.toLowerCase().includes(term)) ||
        (item.UF && item.UF.toLowerCase().includes(term));
      if (!match) return false;
    }

    // 2. UF
    if (excludeKey !== 'UF' && selectedUF.length > 0) {
      if (!matchesFRFilter(item, 'UF', selectedUF)) return false;
    }

    // 3. REG
    if (excludeKey !== 'REG' && selectedREG.length > 0) {
      if (!matchesFRFilter(item, 'REG', selectedREG)) return false;
    }

    // 4. Mês
    if (excludeKey !== 'MES' && selectedMes.length > 0) {
      if (!matchesFRFilter(item, 'MES', selectedMes)) return false;
    }

    // 5. DC MIGRADA/OPERAÇÃO
    if (excludeKey !== 'OPERACAO' && selectedOperacao.length > 0) {
      if (!matchesFRFilter(item, 'OPERACAO', selectedOperacao)) return false;
    }

    // 6. Data da Solicitação Range
    if (dataInicio || dataFim) {
      const startTs = dataInicio ? new Date(`${dataInicio}T00:00:00`).getTime() : null;
      const endTs = dataFim ? new Date(`${dataFim}T23:59:59`).getTime() : null;
      const rowTs = parseDateToTimestamp(item['DATA DA SOLICITAÇÃO']);
      if (rowTs === null) return false;
      if (startTs !== null && rowTs < startTs) return false;
      if (endTs !== null && rowTs > endTs) return false;
    }

    return true;
  };

  // Unique options & counts for multi-selects with (EM BRANCO) support
  const {
    ufOptions,
    ufCounts,
    regOptions,
    regCounts,
    mesOptions,
    mesCounts,
    operacaoOptions,
    operacaoCounts,
  } = useMemo(() => {
    const uCounts: Record<string, number> = {};
    const rCounts: Record<string, number> = {};
    const mCounts: Record<string, number> = {};
    const opCounts: Record<string, number> = {};

    let hasBlankUF = false;
    let hasBlankREG = false;
    let hasBlankMes = false;
    let hasBlankOp = false;

    frRegistros.forEach((r) => {
      // UF
      const ufVal = getFRFilterValue(r, 'UF');
      if (ufVal === BLANK_FILTER_OPTION) hasBlankUF = true;
      if (matchesFRFilterSubset(r, 'UF')) uCounts[ufVal] = (uCounts[ufVal] || 0) + 1;
      else if (selectedUF.includes(ufVal) && !uCounts[ufVal]) uCounts[ufVal] = 0;

      // REG
      const regVal = getFRFilterValue(r, 'REG');
      if (regVal === BLANK_FILTER_OPTION) hasBlankREG = true;
      if (matchesFRFilterSubset(r, 'REG')) rCounts[regVal] = (rCounts[regVal] || 0) + 1;
      else if (selectedREG.includes(regVal) && !rCounts[regVal]) rCounts[regVal] = 0;

      // Mês
      const mesVal = getFRFilterValue(r, 'MES');
      if (mesVal === BLANK_FILTER_OPTION) hasBlankMes = true;
      if (matchesFRFilterSubset(r, 'MES')) mCounts[mesVal] = (mCounts[mesVal] || 0) + 1;
      else if (selectedMes.includes(mesVal) && !mCounts[mesVal]) mCounts[mesVal] = 0;

      // Operação
      const opVal = getFRFilterValue(r, 'OPERACAO');
      if (opVal === BLANK_FILTER_OPTION) hasBlankOp = true;
      if (matchesFRFilterSubset(r, 'OPERACAO')) opCounts[opVal] = (opCounts[opVal] || 0) + 1;
      else if (selectedOperacao.includes(opVal) && !opCounts[opVal]) opCounts[opVal] = 0;
    });

    if (hasBlankUF && uCounts[BLANK_FILTER_OPTION] === undefined) uCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankREG && rCounts[BLANK_FILTER_OPTION] === undefined) rCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankMes && mCounts[BLANK_FILTER_OPTION] === undefined) mCounts[BLANK_FILTER_OPTION] = 0;
    if (hasBlankOp && opCounts[BLANK_FILTER_OPTION] === undefined) opCounts[BLANK_FILTER_OPTION] = 0;

    return {
      ufOptions: sortFilterOptions(Object.keys(uCounts)),
      ufCounts: uCounts,
      regOptions: sortFilterOptions(Object.keys(rCounts)),
      regCounts: rCounts,
      mesOptions: sortFilterOptions(Object.keys(mCounts), (a, b) => parseMesAnoSortKey(a) - parseMesAnoSortKey(b)),
      mesCounts: mCounts,
      operacaoOptions: sortFilterOptions(Object.keys(opCounts)),
      operacaoCounts: opCounts,
    };
  }, [
    frRegistros,
    searchTerm,
    selectedUF,
    selectedREG,
    selectedMes,
    selectedOperacao,
    dataInicio,
    dataFim,
  ]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    let result = frRegistros.filter((r) => matchesFRFilterSubset(r));

    // Sorting
    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        if (sortField === 'DATA DA SOLICITAÇÃO') {
          const tsA = parseDateToTimestamp(String(valA)) || 0;
          const tsB = parseDateToTimestamp(String(valB)) || 0;
          return sortDirection === 'asc' ? tsA - tsB : tsB - tsA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDirection === 'asc'
          ? strA.localeCompare(strB, 'pt-BR', { numeric: true })
          : strB.localeCompare(strA, 'pt-BR', { numeric: true });
      });
    }

    return result;
  }, [
    frRegistros,
    searchTerm,
    selectedUF,
    selectedREG,
    selectedMes,
    selectedOperacao,
    dataInicio,
    dataFim,
    sortField,
    sortDirection,
  ]);

  // Total sum of VALOR FR for filtered records
  const totalValorFR = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + parseFRValor(curr['VALOR FR']), 0);
  }, [filteredData]);

  // Paginated records
  const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredData.length / (pageSize || 1));
  const currentPageSafe = Math.min(Math.max(currentPage, 1), totalPages || 1);

  const paginatedData = useMemo(() => {
    if (pageSize === 0) return filteredData; // All
    const start = (currentPageSafe - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPageSafe, pageSize]);

  // Active filters count
  const activeFiltersCount =
    (searchTerm.trim() ? 1 : 0) +
    (selectedUF.length > 0 ? 1 : 0) +
    (selectedREG.length > 0 ? 1 : 0) +
    (selectedMes.length > 0 ? 1 : 0) +
    (selectedOperacao.length > 0 ? 1 : 0) +
    (dataInicio ? 1 : 0) +
    (dataFim ? 1 : 0);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedUF([]);
    setSelectedREG([]);
    setSelectedMes([]);
    setSelectedOperacao([]);
    setDataInicio('');
    setDataFim('');
    setCurrentPage(1);
  };

  const handleSort = (field: keyof FRRegistro) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExportExcel = () => {
    const filename = `Base_FR_Filtrada_${new Date().toISOString().slice(0, 10)}.xlsx`;
    exportarFRParaExcel(filteredData, filename);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Metadata */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-cyan-800">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Base de Faturamento e Relatórios (FR)
                </h1>
                <span className="bg-cyan-100/70 border border-cyan-300 text-cyan-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  Somente Leitura
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Consulta detalhada dos registros de faturamento por medição, pedido e centro de custo.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => refreshFRs()}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
              title="Recarregar dados do banco"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loadingFRs ? 'animate-spin text-cyan-700' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={filteredData.length === 0}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-700 to-cyan-800 hover:from-cyan-800 hover:to-cyan-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
              title="Exportar dados filtrados para Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel ({filteredData.length})</span>
            </button>
          </div>
        </div>

        {/* Last Import Info Badge */}
        {importInfoFR ? (
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center space-x-2 text-slate-600">
              <Clock className="w-3.5 h-3.5 text-cyan-700" />
              <span>
                Última importação:{' '}
                <strong>
                  {new Date(importInfoFR.importedAt).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(importInfoFR.importedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </strong>{' '}
                por <span className="underline">{importInfoFR.importedBy}</span> ({importInfoFR.totalLinhas} linhas) —{' '}
                <span className="font-mono text-slate-700">{importInfoFR.fileName}</span>
              </span>
            </div>
            <span className="text-slate-500 font-medium text-[11px]">
              Base consolidada no Firestore
            </span>
          </div>
        ) : (
          <div className="mt-3 text-xs text-slate-500 flex items-center space-x-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Nenhuma importação registrada ainda. Carregue uma planilha oficial de FR pela aba Importação.</span>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 space-y-3">
        {/* Row 1: Search & Multi-Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Free Text Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar DC-M, FR, Medição, Pedido..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-600 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* UF Filter */}
          <div>
            <MultiSelectFilter
              label="UF"
              options={ufOptions}
              optionCounts={ufCounts}
              selected={selectedUF}
              onChange={(sel) => {
                setSelectedUF(sel);
                setCurrentPage(1);
              }}
              placeholder="Todas as UFs"
            />
          </div>

          {/* REG Filter */}
          <div>
            <MultiSelectFilter
              label="REG"
              options={regOptions}
              optionCounts={regCounts}
              selected={selectedREG}
              onChange={(sel) => {
                setSelectedREG(sel);
                setCurrentPage(1);
              }}
              placeholder="Todas as REGs"
            />
          </div>

          {/* Mês Filter */}
          <div>
            <MultiSelectFilter
              label="Mês"
              options={mesOptions}
              optionCounts={mesCounts}
              selected={selectedMes}
              onChange={(sel) => {
                setSelectedMes(sel);
                setCurrentPage(1);
              }}
              placeholder="Todos os Meses"
            />
          </div>

          {/* DC Migrada / Operação Filter */}
          <div>
            <MultiSelectFilter
              label="Operação"
              options={operacaoOptions}
              optionCounts={operacaoCounts}
              selected={selectedOperacao}
              onChange={(sel) => {
                setSelectedOperacao(sel);
                setCurrentPage(1);
              }}
              placeholder="Todas Operações"
            />
          </div>
        </div>

        {/* Row 2: Date Range & Clear Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 border-t border-slate-100">
          <div className="flex items-center space-x-2 flex-wrap">
            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-cyan-700" />
              <span className="font-bold">Data Solicitação:</span>
            </div>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => {
                setDataInicio(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-cyan-600"
              title="Data inicial"
            />
            <span className="text-xs text-slate-400">até</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => {
                setDataFim(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-cyan-600"
              title="Data final"
            />
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center space-x-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all self-end cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Limpar Filtros ({activeFiltersCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px] tracking-wider select-none">
                {FR_COLUMNS.map((col) => {
                  const isSorted = sortField === col;
                  return (
                    <th
                      key={col}
                      onClick={() => handleSort(col as keyof FRRegistro)}
                      className="p-3 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center space-x-1">
                        <span>{col}</span>
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-cyan-800" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-cyan-800" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className="hover:bg-cyan-50/40 transition-colors even:bg-slate-50/40"
                  >
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{row.UF}</td>
                    <td className="p-3 font-mono font-bold text-cyan-900 whitespace-nowrap">{row['DC-M']}</td>
                    <td className="p-3 text-slate-700 whitespace-nowrap">{row.REG}</td>
                    <td className="p-3 text-slate-700 whitespace-nowrap">{row.Mês}</td>
                    <td className="p-3 text-slate-700 whitespace-nowrap">{row.CENTRO}</td>
                    <td className="p-3 text-slate-700 whitespace-nowrap">{row['LOCALIDADE DE PRESTAÇÃO']}</td>
                    <td className="p-3 text-slate-700 whitespace-nowrap">{row['DATA DA SOLICITAÇÃO']}</td>
                    <td className="p-3 text-slate-700 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                        {row['DC MIGRADA/OPERAÇÃO']}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-800 whitespace-nowrap">{row['Nº MEDIÇÃO']}</td>
                    <td className="p-3 font-mono text-slate-800 whitespace-nowrap">{row['Nº PEDIDO']}</td>
                    <td className="p-3 text-slate-700 whitespace-nowrap text-center">{row['ITEM DO PEDIDO']}</td>
                    <td className="p-3 font-bold text-emerald-800 whitespace-nowrap text-right">
                      {formatCurrency(parseFRValor(row['VALOR FR']))}
                    </td>
                    <td className="p-3 font-mono font-bold text-cyan-800 whitespace-nowrap">{row.FR}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={FR_COLUMNS.length} className="p-12 text-center text-slate-500">
                    <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-700">Nenhum registro de FR encontrado</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {frRegistros.length === 0
                        ? 'A base de FR ainda não possui dados importados. Usuários ADM podem carregar a planilha na aba Importação.'
                        : 'Nenhum registro corresponde aos filtros selecionados. Tente ajustar os parâmetros de busca.'}
                    </p>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={handleClearFilters}
                        className="mt-3 px-3.5 py-1.5 bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold rounded-xl hover:bg-cyan-100 transition-all cursor-pointer"
                      >
                        Limpar todos os filtros
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Counter, Sum and Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          {/* Counter & Sum */}
          <div className="flex items-center space-x-2 flex-wrap font-medium">
            <span>
              Exibindo <strong className="text-slate-900">{paginatedData.length}</strong> de{' '}
              <strong className="text-slate-900">{filteredData.length}</strong> registros
              {filteredData.length !== frRegistros.length && (
                <span className="text-slate-400"> (total na base: {frRegistros.length})</span>
              )}
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center space-x-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600 inline" />
              <span>
                Total:{' '}
                <strong className="text-emerald-800 font-extrabold text-sm">
                  {formatCurrency(totalValorFR)}
                </strong>
              </span>
            </span>
          </div>

          {/* Page Size & Navigation */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span>Linhas por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-bold focus:outline-none focus:border-cyan-600 cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={0}>Todos ({filteredData.length})</option>
              </select>
            </div>

            {pageSize > 0 && totalPages > 1 && (
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPageSafe <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-bold text-slate-700">
                  {currentPageSafe} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPageSafe >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Próxima página"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
