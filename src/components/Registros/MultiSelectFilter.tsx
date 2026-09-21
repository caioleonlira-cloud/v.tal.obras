import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X, Search, Eraser } from 'lucide-react';

interface MultiSelectFilterProps {
  label: string;
  columnRefName?: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  optionCounts?: Record<string, number>;
  placeholder?: string;
  align?: 'left' | 'right';
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  columnRefName,
  options,
  selected,
  onChange,
  optionCounts,
  placeholder = 'Todas',
  align,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Position calculation based on trigger button bounding client rect
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 256; // 16rem / w-64
    let left = rect.left;
    if (align === 'right' || left + dropdownWidth > window.innerWidth - 8) {
      left = Math.max(8, rect.right - dropdownWidth);
    }

    let top = rect.bottom + 4;
    const estimatedHeight = 270;
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
      // Focus without causing layout/viewport scroll jump
      const timer = setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current && triggerRef.current.contains(target)) {
        return;
      }
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown when scrolling outside the dropdown's own option list (capture: true)
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = (event: Event) => {
      const target = event.target as HTMLElement | null;
      // If the scroll happened inside the dropdown menu (e.g. scrolling options list), keep it open
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

  // Close dropdown on window resize
  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      setIsOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
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

  // Determine if columnRefName is redundant (identical to label)
  const isRedundantRef = useMemo(() => {
    if (!columnRefName) return true;
    const cleanLabel = label.toLowerCase().replace(/[\s._()\-/[\]]/g, '');
    const cleanRef = columnRefName.toLowerCase().replace(/[\s._()\-/[\]]/g, '');
    return cleanLabel === cleanRef;
  }, [label, columnRefName]);

  return (
    <div className="relative inline-block w-full min-w-0 text-left z-10" ref={containerRef}>
      {/* Field Label */}
      <div className="flex items-center justify-between mb-0.5 min-w-0">
        <label
          className="block text-[10px] font-bold text-slate-700 tracking-tight truncate leading-tight"
          title={!isRedundantRef && columnRefName ? `${label} (${columnRefName})` : label}
        >
          {label}
          {!isRedundantRef && columnRefName && (
            <span className="ml-0.5 text-[9px] font-medium text-slate-400">
              ({columnRefName})
            </span>
          )}
        </label>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center space-x-0.5 px-1 py-0.2 rounded text-[9px] text-red-600 hover:text-red-800 hover:bg-red-50 font-semibold cursor-pointer transition-colors shrink-0 ml-0.5"
            title="Limpar este filtro (borracha)"
          >
            <Eraser className="w-2.5 h-2.5 text-red-500" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggleDropdown}
        className={`w-full min-w-0 flex items-center justify-between px-1.5 py-1 bg-white border rounded-md text-[11px] font-medium transition-all shadow-2xs cursor-pointer h-[28px] ${
          selected.length > 0
            ? 'border-[#002855] text-slate-900 ring-1 ring-[#002855]/20 bg-blue-50/20'
            : 'border-slate-300 hover:border-slate-400 text-slate-600'
        }`}
      >
        <span className="truncate pr-0.5 text-[10px] sm:text-[11px] font-medium">{triggerLabel}</span>
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

      {/* Popover Dropdown Panel rendered via Portal in document.body */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 40,
            }}
            className="w-64 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 animate-in fade-in duration-75 select-none"
          >
            {/* Internal Search - Present on all filters */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar opções..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#002855] focus:bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

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
          </div>,
          document.body
        )}
    </div>
  );
};

