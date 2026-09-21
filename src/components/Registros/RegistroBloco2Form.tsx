import React, { useState, useRef, useEffect, useMemo } from 'react';
import { RegistroBloco2 } from '../../types';
import { Edit3, Calendar, AlertCircle, ChevronDown, Check, Search, X } from 'lucide-react';
import { maskDateInput, isValidDateBR, dateBRToISO, dateISOToBR } from '../../utils/dateUtils';

interface RegistroBloco2FormProps {
  formData: RegistroBloco2;
  handleChange: (key: keyof RegistroBloco2, value: string) => void;
  handleSave: (e: React.FormEvent) => void;
  segmentacoes: Record<string, string[]>;
}

interface DateInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

const DateInputGroup: React.FC<DateInputProps> = ({ label, value, onChange }) => {
  const nativePickerRef = useRef<HTMLInputElement | null>(null);
  const isInvalid = Boolean(value && String(value).trim() && !isValidDateBR(value));

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const masked = maskDateInput(raw);
    onChange(masked);
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (iso) {
      onChange(dateISOToBR(iso));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <label className="block fs-modal-label font-semibold text-slate-700">
          {label}
        </label>
        {isInvalid && (
          <span className="text-[9px] font-bold text-red-600 flex items-center space-x-0.5">
            <AlertCircle className="w-2.5 h-2.5 text-red-500" />
            <span>Data inválida</span>
          </span>
        )}
      </div>

      <div className="relative flex items-center">
        {/* Preenchimento manual: digitação direta com máscara dd/mm/aaaa */}
        <input
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          maxLength={10}
          value={value || ''}
          onChange={handleTextChange}
          className={`w-full modal-input-field pl-2.5 pr-8 bg-white border rounded-md font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none transition-colors ${
            isInvalid
              ? 'border-red-400 focus:ring-1 focus:ring-red-400 focus:border-red-500'
              : 'border-slate-300 focus:ring-1 focus:ring-[#002855]/30 focus:border-[#002855]'
          }`}
        />

        {/* Botão de calendário com acionador nativo que abre o seletor gráfico de calendário */}
        <div
          className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 text-slate-400 hover:text-[#002855] hover:bg-slate-100 rounded transition-colors group cursor-pointer overflow-hidden"
          title="Clique para abrir o calendário"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#002855] pointer-events-none" />
          <input
            ref={nativePickerRef}
            type="date"
            tabIndex={-1}
            title="Selecionar data no calendário"
            value={dateBRToISO(value || '')}
            onChange={handlePickerChange}
            onClick={(e) => {
              try {
                if (typeof (e.currentTarget as any).showPicker === 'function') {
                  (e.currentTarget as any).showPicker();
                }
              } catch {
                // Handled gracefully in iframes or browsers
              }
            }}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
          />
        </div>
      </div>
    </div>
  );
};

interface CustomDropdownSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const CustomDropdownSelect: React.FC<CustomDropdownSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = '-- Selecione --',
  isOpen,
  onToggle,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Foco no campo de busca ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 30);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const safeOptions = useMemo(() => {
    return Array.isArray(options) ? options : [];
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return safeOptions;
    const term = search.toLowerCase().trim();
    return safeOptions.filter((opt) => String(opt ?? '').toLowerCase().includes(term));
  }, [safeOptions, search]);

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'}`} ref={containerRef}>
      <label className="block fs-modal-label font-semibold text-slate-700 mb-0.5">
        {label}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full modal-input-field px-2 bg-white border rounded-md font-medium flex items-center justify-between text-left focus:bg-white focus:outline-none transition-colors cursor-pointer shadow-2xs ${
          isOpen
            ? 'border-[#002855] ring-1 ring-[#002855]/30'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <span
          className={`truncate text-[10.5px] ${
            value ? 'text-slate-900 font-semibold' : 'text-slate-400 font-normal'
          }`}
          title={value || placeholder}
        >
          {value || placeholder}
        </span>
        <div className="flex items-center space-x-1 shrink-0 ml-1">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Limpar seleção"
            >
              <X className="w-2.5 h-2.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-[#002855]' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu - Abre RIGOROSAMENTE para baixo (top-full mt-1) */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-56 overflow-hidden flex flex-col animate-in fade-in duration-100">
          {/* Campo de pesquisa rápida */}
          <div className="p-1.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div className="relative flex items-center">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Filtrar opções..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-6 pr-2 py-1 text-[10.5px] bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#002855] focus:ring-1 focus:ring-[#002855]/20 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Lista de Opções */}
          <div className="overflow-y-auto max-h-44 p-1 space-y-0.5 custom-scrollbar text-[10.5px]">
            {/* Opção para limpar / deixar em branco */}
            <button
              type="button"
              onClick={() => {
                onChange('');
                onClose();
              }}
              className="w-full text-left px-2 py-1.5 rounded text-slate-400 italic hover:bg-slate-100 hover:text-slate-600 transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>-- Em branco / Nenhum --</span>
              {!value && <Check className="w-3 h-3 text-slate-400" />}
            </button>

            {filteredOptions.length === 0 ? (
              <div className="py-2.5 text-center text-slate-400 italic text-[10px]">
                Nenhuma opção encontrada
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      onClose();
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-[#002855] font-bold'
                        : 'hover:bg-slate-100 text-slate-700 font-medium'
                    }`}
                  >
                    <span className="truncate pr-1" title={opt}>
                      {opt}
                    </span>
                    {isSelected && (
                      <Check className="w-3 h-3 text-[#002855] stroke-[2.5] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const RegistroBloco2Form: React.FC<RegistroBloco2FormProps> = ({
  formData,
  handleChange,
  handleSave,
  segmentacoes,
}) => {
  // Controle de dropdown ativo (apenas um aberto por vez)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (key: string) => {
    setActiveDropdown((prev) => (prev === key ? null : key));
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  // Garantir resolução robusta das listas validadas da aba Segmentação
  const statusObraOptions =
    segmentacoes['STATUS DE OBRA'] || segmentacoes['Status de Obra'] || [];
  const respMedicaoOptions =
    segmentacoes['Resp.Medição'] ||
    segmentacoes['Resp.Medição (Sul)'] ||
    segmentacoes['Resp. Medição (Sul)'] ||
    segmentacoes['Resp. Medição'] ||
    [];
  const respAreaOptions =
    segmentacoes['RESP.'] || segmentacoes['Responsável'] || [];
  
  // Pendências validadas da aba Segmentação (chaves 'IMPLANTAÇÃO', 'CELULA SAP', 'PROJETOS')
  const pendImplantacaoOptions =
    segmentacoes['IMPLANTAÇÃO'] ||
    segmentacoes['PENDÊNCIAS'] ||
    segmentacoes['Pendência: Implantação'] ||
    segmentacoes['Pendência (Implantação)'] ||
    [];
  const pendCelulaSapOptions =
    segmentacoes['CELULA SAP'] ||
    segmentacoes['PENDENCIA SAP'] ||
    segmentacoes['Pendência: Célula SAP'] ||
    segmentacoes['Pendência (Celula Sap)'] ||
    [];
  const pendProjetosOptions =
    segmentacoes['PROJETOS'] ||
    segmentacoes['PENDÊNCIA (PROJETOS)'] ||
    segmentacoes['Pendência: Projetos'] ||
    segmentacoes['Pendência (Projetos)'] ||
    [];

  return (
    <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs">
      {/* Header do Bloco 2 */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 mb-2.5 border-b border-slate-100">
        <div className="flex items-center space-x-1.5">
          <Edit3 className="w-3.5 h-3.5 text-slate-800" />
          <h4 className="fs-modal-block-title font-bold text-slate-900 tracking-tight">
            Bloco 2 — Preenchimento & Acompanhamento
          </h4>
          <span className="fs-modal-caption text-slate-400 font-normal">
            (Colunas W a AF)
          </span>
        </div>
        <div>
          <span className="fs-modal-caption font-bold text-blue-700 bg-blue-50/70 border border-blue-200/80 px-1.5 py-0.5 rounded-md flex items-center space-x-1 shadow-2xs">
            <Edit3 className="w-2.5 h-2.5 text-blue-600" />
            <span>Colunas Equipe: Edição</span>
          </span>
        </div>
      </div>

      <form id="form-edit-bloco2" onSubmit={handleSave} className="space-y-2">
        {/* Grid de 3 colunas compacto com fontes reduzidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-2.5 gap-y-2">
          {/* Linha 1 - Coluna 1: Status Informe (Campo) */}
          <CustomDropdownSelect
            label="Status Informe (Campo)"
            value={formData['Status Informe (Campo)'] || ''}
            onChange={(val) => handleChange('Status Informe (Campo)', val)}
            options={statusObraOptions}
            isOpen={activeDropdown === 'statusInforme'}
            onToggle={() => toggleDropdown('statusInforme')}
            onClose={closeDropdown}
          />

          {/* Linha 1 - Coluna 2: Resp.Medição */}
          <CustomDropdownSelect
            label="Resp.Medição"
            value={formData['Resp.Medição'] || ''}
            onChange={(val) => handleChange('Resp.Medição', val)}
            options={respMedicaoOptions}
            isOpen={activeDropdown === 'respMedicao'}
            onToggle={() => toggleDropdown('respMedicao')}
            onClose={closeDropdown}
          />

          {/* Linha 1 - Coluna 3: Responsavel (Área) */}
          <CustomDropdownSelect
            label="Responsavel (Área)"
            value={formData['Responsavel'] || ''}
            onChange={(val) => handleChange('Responsavel', val)}
            options={respAreaOptions}
            isOpen={activeDropdown === 'responsavel'}
            onToggle={() => toggleDropdown('responsavel')}
            onClose={closeDropdown}
          />

          {/* Linha 2 - Coluna 1: Pendência (Implantação) */}
          <CustomDropdownSelect
            label="Pendência (Implantação)"
            value={formData['Pendência (Implantação)'] || ''}
            onChange={(val) => handleChange('Pendência (Implantação)', val)}
            options={pendImplantacaoOptions}
            isOpen={activeDropdown === 'pendImplantacao'}
            onToggle={() => toggleDropdown('pendImplantacao')}
            onClose={closeDropdown}
          />

          {/* Linha 2 - Coluna 2: Pendência (Celula Sap) */}
          <CustomDropdownSelect
            label="Pendência (Celula Sap)"
            value={formData['Pendência (Celula Sap)'] || ''}
            onChange={(val) => handleChange('Pendência (Celula Sap)', val)}
            options={pendCelulaSapOptions}
            isOpen={activeDropdown === 'pendCelulaSap'}
            onToggle={() => toggleDropdown('pendCelulaSap')}
            onClose={closeDropdown}
          />

          {/* Linha 2 - Coluna 3: Pendência (Projetos) */}
          <CustomDropdownSelect
            label="Pendência (Projetos)"
            value={formData['Pendência (Projetos)'] || ''}
            onChange={(val) => handleChange('Pendência (Projetos)', val)}
            options={pendProjetosOptions}
            isOpen={activeDropdown === 'pendProjetos'}
            onToggle={() => toggleDropdown('pendProjetos')}
            onClose={closeDropdown}
          />

          {/* Linha 3 - Coluna 1: Data Previsão Entrega (Medição) */}
          <DateInputGroup
            label="Data Previsão Entrega (Medição)"
            value={formData['Data Previsão Entrega (Medição)'] || ''}
            onChange={(val) => handleChange('Data Previsão Entrega (Medição)', val)}
          />

          {/* Linha 3 - Coluna 2: Data Previsão Entrega (Projeto) */}
          <DateInputGroup
            label="Data Previsão Entrega (Projeto)"
            value={formData['Data Previsão Entrega (Projeto)'] || ''}
            onChange={(val) => handleChange('Data Previsão Entrega (Projeto)', val)}
          />

          {/* Linha 3 - Coluna 3: Data Tratativa */}
          <DateInputGroup
            label="Data Tratativa"
            value={formData['Data Tratativa'] || ''}
            onChange={(val) => handleChange('Data Tratativa', val)}
          />

          {/* Linha 4 - Largura Total: OBS (Medição) */}
          <div className="col-span-1 md:col-span-3">
            <label className="block fs-modal-label font-semibold text-slate-700 mb-0.5">
              OBS (Medição)
            </label>
            <textarea
              rows={2}
              placeholder="Insira observações detalhadas sobre a medição/tratativa desta DC..."
              value={formData['OBS (Medição)'] || ''}
              onChange={(e) => handleChange('OBS (Medição)', e.target.value)}
              className="w-full min-h-[50px] px-2 py-1 bg-white border border-slate-300 rounded-md fs-modal-input font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-[#002855]/30 focus:border-[#002855] focus:outline-none resize-y transition-colors"
            />
          </div>
        </div>
      </form>
    </div>
  );
};
