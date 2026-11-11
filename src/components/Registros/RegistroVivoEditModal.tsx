import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  RegistroVivo,
  RegistroVivoBloco2,
  VIVO_BLOCO_1_KEYS,
  SegmentacaoVivoKey,
} from '../../types';
import {
  X,
  Check,
  Building2,
  AlertCircle,
  Copy,
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  Edit3,
} from 'lucide-react';
import { maskDateInput, isValidDateBR, dateBRToISO, dateISOToBR } from '../../utils/dateUtils';
import { formatBRL, parseCurrencyValue } from '../../utils/currency';

interface RegistroVivoEditModalProps {
  registro: RegistroVivo | null;
  isOpen: boolean;
  onClose: () => void;
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
                // Handled gracefully in iframes
              }
            }}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
          />
        </div>
      </div>
    </div>
  );
};

interface DropdownSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  onClear: () => void;
}

const DropdownSelectGroup: React.FC<DropdownSelectProps> = ({
  label,
  value,
  options,
  onChange,
  onClear,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <label className="block fs-modal-label font-semibold text-slate-700">
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="text-[9px] text-slate-400 hover:text-red-600 flex items-center space-x-0.5 font-bold cursor-pointer transition-colors"
            title="Limpar seleção"
          >
            <X className="w-2.5 h-2.5" />
            <span>Limpar</span>
          </button>
        )}
      </div>
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full modal-input-field pl-2.5 pr-7 bg-white border border-slate-300 rounded-md font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002855]/30 focus:border-[#002855] transition-colors"
        >
          <option value="">-- Selecione --</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export const RegistroVivoEditModal: React.FC<RegistroVivoEditModalProps> = ({
  registro,
  isOpen,
  onClose,
}) => {
  const { segmentacoesVivo, updateRegistroVivoBloco2 } = useData();

  const [formData, setFormData] = useState<RegistroVivoBloco2>({
    'STATUS IMPL': '',
    'PENDENCIA': '',
    'RESPONSÁVEL PENDENCIA': '',
    'PRAZO DE MEDIÇÃO': '',
    'PRAZO PROJETO': '',
    'RESPONSÁVEL MEDIÇÃO': '',
    'OBS MEDIÇÃO': '',
    'DATA TRATATIVA': '',
    'ID NOVO/ANTIGO': '',
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isBloco1Expanded, setIsBloco1Expanded] = useState(false);

  // Lock background body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (registro) {
      setFormData({
        'STATUS IMPL': registro['STATUS IMPL'] || '',
        'PENDENCIA': registro['PENDENCIA'] || '',
        'RESPONSÁVEL PENDENCIA': registro['RESPONSÁVEL PENDENCIA'] || '',
        'PRAZO DE MEDIÇÃO': registro['PRAZO DE MEDIÇÃO'] || '',
        'PRAZO PROJETO': registro['PRAZO PROJETO'] || '',
        'RESPONSÁVEL MEDIÇÃO': registro['RESPONSÁVEL MEDIÇÃO'] || '',
        'OBS MEDIÇÃO': registro['OBS MEDIÇÃO'] || '',
        'DATA TRATATIVA': registro['DATA TRATATIVA'] || '',
        'ID NOVO/ANTIGO': registro['ID NOVO/ANTIGO'] || '',
      });
      setErrorMsg(null);
      setSuccess(false);
      setCopiedKey(null);
      setCopiedAll(false);
    }
  }, [registro]);

  if (!isOpen || !registro) return null;

  const handleCopyValue = (key: string, val: any) => {
    const text = val !== undefined && val !== null ? String(val).trim() : '';
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 1500);
  };

  const handleCopyAllBloco1 = () => {
    const lines = VIVO_BLOCO_1_KEYS.map((k) => `${k}: ${(registro as any)[k] || '—'}`);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleChange = (key: keyof RegistroVivoBloco2, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação estrita de datas
    const dateFields = [
      { key: 'PRAZO DE MEDIÇÃO', label: 'PRAZO DE MEDIÇÃO' },
      { key: 'PRAZO PROJETO', label: 'PRAZO PROJETO' },
      { key: 'DATA TRATATIVA', label: 'DATA TRATATIVA' },
    ];

    for (const field of dateFields) {
      const val = (formData as any)[field.key];
      if (val && val.trim() !== '' && !isValidDateBR(val)) {
        setErrorMsg(`O campo "${field.label}" deve conter uma data válida no formato dd/mm/aaaa (ou ficar em branco).`);
        return;
      }
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await updateRegistroVivoBloco2(registro.ID, formData);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar alterações no registro VIVO.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      style={{ zIndex: 2000 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[780px] max-h-[84vh] flex flex-col overflow-hidden my-auto">
        {/* Header - Fixed (Idêntico ao da V.TAL) */}
        <div className="bg-[#002855] text-white px-3.5 sm:px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="p-1 rounded-md bg-[#005B94]/50 border border-cyan-400/30 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="fs-modal-title font-bold text-white tracking-wide">
                  ID: {registro.ID}
                </h3>
                <span className="px-1.5 py-0.5 rounded fs-modal-badge font-bold bg-[#007A87] text-white">
                  {registro.UF || 'UF'} - {registro.Localidade || 'Localidade'}
                </span>
                <span className="px-1.5 py-0.5 rounded fs-modal-badge font-semibold bg-[#001D3D] text-white border border-white/20">
                  {registro['Status Draft'] || 'Sem Status'}
                </span>
              </div>
              <p className="text-blue-100/80 fs-modal-subtitle font-normal truncate max-w-md sm:max-w-xl mt-0.5">
                {registro['Desc.'] || registro['Tipo de Projeto'] || 'Detalhes da Obra'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Body - ONLY middle rola */}
        <div className="p-3 sm:p-3.5 overflow-y-auto space-y-3 flex-1 bg-slate-50/70">
          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2 text-xs text-emerald-700">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Dados atualizados com sucesso no Firestore!</span>
            </div>
          )}

          {/* BLOCO 2: Preenchimento & Acompanhamento (Campos de Edição) - Aberto por padrão */}
          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[#002855]" />
                <h4 className="fs-modal-block-title font-bold text-slate-900">
                  Bloco 2 — Preenchimento & Acompanhamento
                </h4>
              </div>
              <span className="px-1.5 py-0.5 rounded fs-modal-badge font-semibold bg-blue-50 border border-blue-200 text-blue-800">
                Colunas Equipe: Edição
              </span>
            </div>

            <form id="form-edit-bloco2-vivo" onSubmit={handleSave} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {/* 1. STATUS IMPL */}
                <DropdownSelectGroup
                  label="STATUS IMPL"
                  value={formData['STATUS IMPL']}
                  options={segmentacoesVivo['STATUS IMPL'] || []}
                  onChange={(val) => handleChange('STATUS IMPL', val)}
                  onClear={() => handleChange('STATUS IMPL', '')}
                />

                {/* 2. PENDENCIA */}
                <DropdownSelectGroup
                  label="PENDENCIA"
                  value={formData['PENDENCIA']}
                  options={segmentacoesVivo['PENDENCIA'] || []}
                  onChange={(val) => handleChange('PENDENCIA', val)}
                  onClear={() => handleChange('PENDENCIA', '')}
                />

                {/* 3. RESPONSÁVEL PENDENCIA */}
                <DropdownSelectGroup
                  label="RESPONSÁVEL PENDENCIA"
                  value={formData['RESPONSÁVEL PENDENCIA']}
                  options={segmentacoesVivo['RESPONSÁVEL PENDENCIA'] || []}
                  onChange={(val) => handleChange('RESPONSÁVEL PENDENCIA', val)}
                  onClear={() => handleChange('RESPONSÁVEL PENDENCIA', '')}
                />

                {/* 4. RESPONSÁVEL MEDIÇÃO */}
                <DropdownSelectGroup
                  label="RESPONSÁVEL MEDIÇÃO"
                  value={formData['RESPONSÁVEL MEDIÇÃO']}
                  options={segmentacoesVivo['RESPONSÁVEL MEDIÇÃO'] || []}
                  onChange={(val) => handleChange('RESPONSÁVEL MEDIÇÃO', val)}
                  onClear={() => handleChange('RESPONSÁVEL MEDIÇÃO', '')}
                />

                {/* 5. PRAZO DE MEDIÇÃO */}
                <DateInputGroup
                  label="PRAZO DE MEDIÇÃO"
                  value={formData['PRAZO DE MEDIÇÃO']}
                  onChange={(val) => handleChange('PRAZO DE MEDIÇÃO', val)}
                />

                {/* 6. PRAZO PROJETO */}
                <DateInputGroup
                  label="PRAZO PROJETO"
                  value={formData['PRAZO PROJETO']}
                  onChange={(val) => handleChange('PRAZO PROJETO', val)}
                />

                {/* 7. DATA TRATATIVA */}
                <DateInputGroup
                  label="DATA TRATATIVA"
                  value={formData['DATA TRATATIVA']}
                  onChange={(val) => handleChange('DATA TRATATIVA', val)}
                />

                {/* 8. ID NOVO/ANTIGO (Texto livre) */}
                <div>
                  <label className="block fs-modal-label font-semibold text-slate-700 mb-0.5">
                    ID NOVO/ANTIGO
                  </label>
                  <input
                    type="text"
                    placeholder="Texto livre..."
                    value={formData['ID NOVO/ANTIGO']}
                    onChange={(e) => handleChange('ID NOVO/ANTIGO', e.target.value)}
                    className="w-full modal-input-field px-2.5 bg-white border border-slate-300 rounded-md font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002855]/30 focus:border-[#002855] transition-colors"
                  />
                </div>
              </div>

              {/* 9. OBS MEDIÇÃO (Caixa de texto em linha inteira) */}
              <div>
                <label className="block fs-modal-label font-semibold text-slate-700 mb-0.5">
                  OBS MEDIÇÃO
                </label>
                <textarea
                  rows={2}
                  placeholder="Observações da medição..."
                  value={formData['OBS MEDIÇÃO']}
                  onChange={(e) => handleChange('OBS MEDIÇÃO', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002855]/30 focus:border-[#002855] transition-colors fs-modal-input resize-none"
                />
              </div>
            </form>
          </div>

          {/* BLOCO 1: Dados da Base Matriz (Importação Somente Leitura) - Accordion Recolhido por padrão */}
          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs transition-all">
            <div
              onClick={() => setIsBloco1Expanded(!isBloco1Expanded)}
              className="flex flex-wrap items-center justify-between gap-1.5 cursor-pointer select-none group"
            >
              <div className="flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-[#007A87]" />
                <h4 className="fs-modal-block-title font-bold text-slate-900 group-hover:text-[#002855] transition-colors">
                  Bloco 1 — Base Matriz (Importação Somente Leitura)
                </h4>
                <div className="text-slate-400 group-hover:text-slate-700 p-0.5 rounded transition-transform ml-0.5">
                  {isBloco1Expanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyAllBloco1();
                }}
                className="inline-flex items-center space-x-1 px-2 py-0.5 font-semibold fs-modal-btn rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
                title="Copiar todas as informações do Bloco 1 para a área de transferência"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[2.5]" />
                    <span className="text-emerald-700 font-bold">Todos Copiados!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-2.5 h-2.5 text-slate-500" />
                    <span>Copiar Todos os Dados</span>
                  </>
                )}
              </button>
            </div>

            {isBloco1Expanded && (
              <div className="pt-2 mt-2 border-t border-slate-100 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 text-xs">
                  {VIVO_BLOCO_1_KEYS.map((key) => {
                    const rawVal = (registro as any)[key];
                    const isCurrency =
                      key === 'OSP ORÇAMENTO' ||
                      key === 'OSP MEDIDO' ||
                      key === 'Faturado' ||
                      key === 'Produção Bi R$';

                    const displayVal = isCurrency
                      ? rawVal !== undefined && rawVal !== null && rawVal !== ''
                        ? formatBRL(parseCurrencyValue(rawVal))
                        : '—'
                      : rawVal || '—';

                    const copyVal = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';
                    const isCopied = copiedKey === key;

                    return (
                      <div
                        key={key}
                        className="bg-slate-50/80 hover:bg-slate-100 p-1.5 rounded-md border border-slate-200/80 transition-colors flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span
                              className="block font-bold text-slate-500 uppercase tracking-tight truncate text-[9px]"
                              title={key}
                            >
                              {key}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyValue(key, copyVal || displayVal);
                              }}
                              className="p-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-[#002855] transition-colors cursor-pointer shrink-0 shadow-2xs"
                              title={`Copiar valor de ${key}`}
                            >
                              {isCopied ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[2.5]" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                          <span
                            className={`block fs-modal-input font-semibold truncate ${
                              isCurrency ? 'text-[#002855] tabular-nums font-bold' : 'text-slate-800'
                            }`}
                            title={displayVal}
                          >
                            {displayVal}
                          </span>
                        </div>

                        {isCopied && (
                          <span className="text-[9px] font-bold text-emerald-600 mt-0.5 animate-in fade-in flex items-center space-x-1">
                            <Check className="w-2.5 h-2.5" />
                            <span>Copiado!</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions - Fixed */}
        <div className="bg-slate-50/90 px-3.5 sm:px-4 py-2 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="fs-modal-footer text-slate-500 font-normal">
            {registro._updatedAt ? (
              <span>
                Última atualização:{' '}
                {new Date(registro._updatedAt).toLocaleString('pt-BR')} por{' '}
                {registro._updatedBy || 'Sistema'}
              </span>
            ) : (
              <span>Dados sincronizados com a base</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 border border-slate-300 rounded-md fs-modal-btn font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              form="form-edit-bloco2-vivo"
              disabled={saving}
              className="px-3 py-1 bg-[#002855] hover:bg-[#001D3D] text-white rounded-md fs-modal-btn font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
            >
              {saving ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-3 h-3" />
                  <span>Salvar Alterações (Bloco 2)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
