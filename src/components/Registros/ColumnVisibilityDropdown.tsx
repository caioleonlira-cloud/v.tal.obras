import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Columns3,
  Check,
  X,
  Search,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export interface ColumnVisibilityDropdownProps {
  baseColumns: string[];
  equipeColumns: string[];
  hiddenColumns: string[];
  onToggleColumn: (colKey: string) => void;
  onShowAll: () => void;
  onShowOnlyEdicao: () => void;
}

export const ColumnVisibilityDropdown: React.FC<ColumnVisibilityDropdownProps> = ({
  baseColumns,
  equipeColumns,
  hiddenColumns,
  onToggleColumn,
  onShowAll,
  onShowOnlyEdicao,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const hiddenSet = useMemo(() => new Set(hiddenColumns), [hiddenColumns]);
  const totalHidden = hiddenColumns.length;

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 320; // 20rem

    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 12) {
      left = Math.max(12, rect.right - dropdownWidth);
    }

    let top = rect.bottom + 4;
    const estimatedHeight = 380;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < estimatedHeight && rect.top > estimatedHeight) {
      top = Math.max(8, rect.top - estimatedHeight - 4);
    }

    setCoords({
      top: Math.round(top),
      left: Math.round(Math.max(8, left)),
    });
  };

  const handleToggleDropdown = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 20);
      return () => clearTimeout(timer);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current && triggerRef.current.contains(target)) return;
      if (menuRef.current && menuRef.current.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll listener (capture: true) to close when page scrolls
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (menuRef.current && target && menuRef.current.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [isOpen]);

  // Resize listener
  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => setIsOpen(false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // Search filter
  const filterCol = (name: string) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase().trim();
    return name.toLowerCase().includes(term);
  };

  const filteredBaseColumns = useMemo(
    () => baseColumns.filter(filterCol),
    [baseColumns, search]
  );

  const filteredEquipeColumns = useMemo(
    () => equipeColumns.filter(filterCol),
    [equipeColumns, search]
  );

  return (
    <div className="relative inline-block">
      {/* Botão Gatilho "Colunas" */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggleDropdown}
        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded font-semibold text-[10px] shadow-2xs transition-colors cursor-pointer border ${
          isOpen
            ? 'bg-slate-200 text-slate-900 border-slate-400'
            : totalHidden > 0
            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-300'
        }`}
        title="Configurar visibilidade de colunas individuais"
      >
        <Columns3 className="w-2.5 h-2.5 text-slate-500 shrink-0" />
        <span>Colunas</span>
        {totalHidden > 0 && (
          <span className="ml-0.5 px-1 py-0.2 rounded-full bg-amber-200 text-amber-950 font-bold text-[9px] leading-tight">
            {totalHidden} ocultas
          </span>
        )}
      </button>

      {/* Menu Portal Dropdown */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: '320px',
              zIndex: 900,
            }}
            className="bg-white rounded-xl shadow-xl border border-slate-300/90 text-xs overflow-hidden flex flex-col max-h-[420px] animate-in fade-in zoom-in-95 duration-100 select-none"
          >
            {/* Header do Menu */}
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Columns3 className="w-3.5 h-3.5 text-[#002855]" />
                <span className="font-extrabold text-slate-800 text-[11px]">
                  Exibir / Ocultar Colunas
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 cursor-pointer transition-colors"
                title="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Barra de Atalhos Rápidos */}
            <div className="p-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={onShowAll}
                className="flex-1 py-1 px-2 rounded-md bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-[10px] flex items-center justify-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                title="Exibir todas as colunas da tabela"
              >
                <Eye className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Mostrar todas</span>
              </button>

              <button
                type="button"
                onClick={onShowOnlyEdicao}
                className="flex-1 py-1 px-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold text-[10px] flex items-center justify-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                title="Ocultar Base Leitura e focar somente nas colunas de Edição da Equipe"
              >
                <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                <span>Só edição</span>
              </button>
            </div>

            {/* Campo de Busca Rápida */}
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar coluna..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-7 pr-7 py-1 text-[11px] border border-slate-300 rounded-md bg-slate-50/50 focus:bg-white focus:border-[#002855] focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Aviso Informativo de Colunas Fixas */}
            <div className="px-3 py-1 bg-slate-50/80 text-slate-500 text-[10px] border-b border-slate-100 flex items-center justify-between">
              <span>Colunas fixas sempre visíveis:</span>
              <span className="font-bold text-slate-700">AÇÕES e DC</span>
            </div>

            {/* Lista com Rolagem de Colunas */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
              {/* Grupo 1: Base Leitura */}
              {filteredBaseColumns.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1 px-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Base: Leitura ({filteredBaseColumns.length})</span>
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {filteredBaseColumns.map((colKey) => {
                      const isVisible = !hiddenSet.has(colKey);
                      return (
                        <label
                          key={colKey}
                          className={`flex items-center space-x-2 px-2 py-1 rounded cursor-pointer transition-colors text-[11px] ${
                            isVisible
                              ? 'hover:bg-slate-100 text-slate-800 font-medium'
                              : 'hover:bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => onToggleColumn(colKey)}
                            className="w-3.5 h-3.5 rounded text-[#002855] border-slate-300 focus:ring-0 cursor-pointer"
                          />
                          <span className="truncate flex-1" title={colKey}>
                            {colKey}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grupo 2: Equipe Edição */}
              {filteredEquipeColumns.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1 px-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      <span>Equipe: Edição ({filteredEquipeColumns.length})</span>
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {filteredEquipeColumns.map((colKey) => {
                      const isVisible = !hiddenSet.has(colKey);
                      return (
                        <label
                          key={colKey}
                          className={`flex items-center space-x-2 px-2 py-1 rounded cursor-pointer transition-colors text-[11px] ${
                            isVisible
                              ? 'hover:bg-slate-100 text-slate-800 font-semibold'
                              : 'hover:bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => onToggleColumn(colKey)}
                            className="w-3.5 h-3.5 rounded text-[#002855] border-slate-300 focus:ring-0 cursor-pointer"
                          />
                          <span className="truncate flex-1" title={colKey}>
                            {colKey}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredBaseColumns.length === 0 && filteredEquipeColumns.length === 0 && (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Nenhuma coluna encontrada com "{search}"
                </div>
              )}
            </div>

            {/* Rodapé Informativo */}
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
              <span>
                {totalHidden === 0 ? (
                  'Todas as colunas visíveis'
                ) : (
                  <strong className="text-amber-800">{totalHidden} colunas ocultas</strong>
                )}
              </span>
              <button
                type="button"
                onClick={onShowAll}
                className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer underline text-[10px]"
              >
                Restaurar todas
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
