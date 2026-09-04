import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search, Eraser } from 'lucide-react';

interface MultiSelectFilterProps {
  label: string;
  columnRefName?: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  optionCounts?: Record<string, number>;
  placeholder?: string;
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  columnRefName,
  options,
  selected,
  onChange,
  optionCounts,
  placeholder = 'Todas',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const term = search.toLowerCase().trim();
    return options.filter((opt) => opt.toLowerCase().includes(term));
  }, [options, search]);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    onChange([...options]);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  // Label to show on the trigger button
  const triggerLabel = useMemo(() => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) return selected[0];
    if (selected.length === options.length && options.length > 0) return 'Todas';
    return `${selected.length} selecionados`;
  }, [selected, options.length, placeholder]);

  return (
    <div className="relative inline-block w-full text-left" ref={dropdownRef}>
      {/* Field Label */}
      <div className="flex items-center justify-between mb-0.5">
        <label className="block text-[10px] font-bold text-slate-700 tracking-tight truncate leading-tight">
          {label}
          {columnRefName && (
            <span className="ml-0.5 text-[9px] font-medium text-slate-400">
              ({columnRefName})
            </span>
          )}
        </label>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center space-x-0.5 px-1 py-0.2 rounded text-[9px] text-red-600 hover:text-red-800 hover:bg-red-50 font-semibold cursor-pointer transition-colors"
            title="Limpar este filtro (borracha)"
          >
            <Eraser className="w-2.5 h-2.5 text-red-500" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-2 py-1 bg-white border rounded-md text-[11px] font-medium transition-all shadow-2xs cursor-pointer h-[28px] ${
          selected.length > 0
            ? 'border-[#002855] text-slate-900 ring-1 ring-[#002855]/20 bg-blue-50/20'
            : 'border-slate-300 hover:border-slate-400 text-slate-600'
        }`}
      >
        <span className="truncate pr-1 text-[11px] font-medium">{triggerLabel}</span>
        <div className="flex items-center space-x-0.5 shrink-0">
          {selected.length > 0 && (
            <>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear(e);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    handleClear();
                  }
                }}
                className="p-0.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                title="Limpar este filtro (borracha)"
              >
                <Eraser className="w-3 h-3 text-red-500" />
              </span>
              <span className="px-1 py-0.2 rounded-full text-[9px] font-bold bg-[#002855] text-white">
                {selected.length}
              </span>
            </>
          )}
          <ChevronDown
            className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-slate-700' : ''
            }`}
          />
        </div>
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 mt-1 w-64 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
          {/* Internal Search */}
          {options.length > 6 && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar opções..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#002855] focus:bg-white"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Quick Select / Clear Toolbar */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[10px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[#002855] hover:text-[#001e40] font-bold cursor-pointer hover:underline"
            >
              Marcar todos ({options.length})
            </button>
            <button
              type="button"
              onClick={() => handleClear()}
              disabled={selected.length === 0}
              className="inline-flex items-center space-x-1 text-slate-500 hover:text-red-600 font-semibold cursor-pointer disabled:opacity-30"
            >
              <Eraser className="w-3 h-3 text-red-500" />
              <span>Desmarcar</span>
            </button>
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400 italic">
                Nenhuma opção encontrada
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selected.includes(opt);
                const count = optionCounts ? optionCounts[opt] : undefined;

                return (
                  <label
                    key={opt}
                    onClick={() => handleToggle(opt)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer select-none transition-colors ${
                      isChecked
                        ? 'bg-blue-50/70 text-[#002855] font-semibold'
                        : 'hover:bg-slate-50 text-slate-700 font-normal'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                          isChecked
                            ? 'bg-[#002855] border-[#002855] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="truncate text-[11px]" title={opt}>
                        {opt}
                      </span>
                    </div>

                    {count !== undefined && (
                      <span className="text-[10px] text-slate-400 font-medium ml-1.5 shrink-0">
                        {count}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

