import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Registro,
  RegistroBloco2,
  BLOCO_1_KEYS,
  BLOCO_2_KEYS,
  BLOCO_2_SEGMENTATION_MAP,
  SegmentacaoKey,
} from '../../types';
import {
  X,
  Check,
  Building2,
  Calendar,
  Layers,
  FileText,
  AlertCircle,
  Clock,
  ShieldCheck,
  Eye,
  Edit3,
  Copy,
} from 'lucide-react';

interface RegistroEditModalProps {
  registro: Registro | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RegistroEditModal: React.FC<RegistroEditModalProps> = ({
  registro,
  isOpen,
  onClose,
}) => {
  const { isAdmin } = useAuth();
  const { segmentacoes, updateRegistroBloco2 } = useData();

  const [formData, setFormData] = useState<RegistroBloco2>({
    'Status Informe (Campo)': '',
    'Resp.Medição': '',
    'Pendência (Implantação)': '',
    'Pendência (Celula Sap)': '',
    'Pendência (Projetos)': '',
    'Data Previsão Entrega (Medição)': '',
    'Data Previsão Entrega (Projeto)': '',
    'Responsavel': '',
    'Data Tratativa': '',
    'OBS (Medição)': '',
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (registro) {
      setFormData({
        'Status Informe (Campo)': registro['Status Informe (Campo)'] || '',
        'Resp.Medição': registro['Resp.Medição'] || '',
        'Pendência (Implantação)': registro['Pendência (Implantação)'] || '',
        'Pendência (Celula Sap)': registro['Pendência (Celula Sap)'] || '',
        'Pendência (Projetos)': registro['Pendência (Projetos)'] || '',
        'Data Previsão Entrega (Medição)': registro['Data Previsão Entrega (Medição)'] || '',
        'Data Previsão Entrega (Projeto)': registro['Data Previsão Entrega (Projeto)'] || '',
        'Responsavel': registro['Responsavel'] || '',
        'Data Tratativa': registro['Data Tratativa'] || '',
        'OBS (Medição)': registro['OBS (Medição)'] || '',
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
    const lines = BLOCO_1_KEYS.map((k) => `${k}: ${(registro as any)[k] || '—'}`);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleChange = (key: keyof RegistroBloco2, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setErrorMsg(null);
    try {
      await updateRegistroBloco2(registro.DC, formData);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar alterações no registro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-[#002855] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-white/10 border border-white/20">
              <Building2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white tracking-wide">
                  DC: {registro.DC}
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                  {registro.UF || 'UF'} - {registro.Localidade || 'Localidade'}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 text-white border border-white/15">
                  {registro['Status da DC (Atual)'] || 'Sem Status'}
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate max-w-md">
                {registro.Descricao || registro['Tipo de Projeto'] || 'Detalhes da Obra'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2 text-xs text-emerald-700">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Dados atualizados com sucesso no Firestore!</span>
            </div>
          )}

          {/* SECTION 2: Bloco 2 - Preenchimento / Acompanhamento */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-[#002855]" />
                <h4 className="text-sm font-bold text-slate-900">
                  Bloco 2 — Preenchimento & Acompanhamento
                </h4>
                <span className="text-[10px] text-slate-500 font-medium">
                  (Colunas W a AF)
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center space-x-1.5 shadow-2xs">
                  <Edit3 className="w-3 h-3 text-blue-600" />
                  <span>Colunas Equipe: Edição</span>
                </span>
              </div>
            </div>

            <form id="form-edit-bloco2" onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Status Informe (Campo) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Informe (Campo)
                  </label>
                  <select
                    value={formData['Status Informe (Campo)']}
                    onChange={(e) => handleChange('Status Informe (Campo)', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002855] focus:outline-none"
                  >
                    <option value="">-- Selecione --</option>
                    {(segmentacoes['STATUS DE OBRA'] || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Resp.Medição */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Resp.Medição
                  </label>
                  <select
                    value={formData['Resp.Medição']}
                    onChange={(e) => handleChange('Resp.Medição', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002855] focus:outline-none"
                  >
                    <option value="">-- Selecione --</option>
                    {(segmentacoes['Resp.Medição (Sul)'] || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Responsavel */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Responsavel (Área)
                  </label>
                  <select
                    value={formData['Responsavel']}
                    onChange={(e) => handleChange('Responsavel', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002855] focus:outline-none"
                  >
                    <option value="">-- Selecione --</option>
                    {(segmentacoes['RESP.'] || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pendência (Implantação) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pendência (Implantação)
                  </label>
                  <select
                    value={formData['Pendência (Implantação)']}
                    onChange={(e) => handleChange('Pendência (Implantação)', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002855] focus:outline-none"
                  >
                    <option value="">-- Selecione --</option>
                    {(segmentacoes['IMPLANTAÇÃO'] || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pendência (Celula Sap) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pendência (Celula Sap)
                  </label>
                  <select
                    value={formData['Pendência (Celula Sap)']}
                    onChange={(e) => handleChange('Pendência (Celula Sap)', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002855] focus:outline-none"
                  >
                    <option value="">-- Selecione --</option>
                    {(segmentacoes['CELULA SAP'] || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pendência (Projetos) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pendência (Projetos)
                  </label>
                  <select
                    value={formData['Pendência (Projetos)']}
                    onChange={(e) => handleChange('Pendência (Projetos)', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002855] focus:outline-none"
                  >
                    <option value="">-- Selecione --</option>
                    {(segmentacoes['PROJETOS'] || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data Previsão Entrega (Medição) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Previsão Entrega (Medição)
                  </label>
                  <input
                    type="text"
                    placeholder="dd/mm/aaaa"
                    value={formData['Data Previsão Entrega (Medição)']}
                    onChange={(e) => handleChange('Data Previsão Entrega (Medição)', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002855] focus:outline-none"
                  />
                </div>

                {/* Data Previsão Entrega (Projeto) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Previsão Entrega (Projeto)
                  </label>
                  <input
                    type="text"
                    placeholder="dd/mm/aaaa"
                    value={formData['Data Previsão Entrega (Projeto)']}
                    onChange={(e) => handleChange('Data Previsão Entrega (Projeto)', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002855] focus:outline-none"
                  />
                </div>

                {/* Data Tratativa */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Tratativa
                  </label>
                  <input
                    type="text"
                    placeholder="dd/mm/aaaa"
                    value={formData['Data Tratativa']}
                    onChange={(e) => handleChange('Data Tratativa', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002855] focus:outline-none"
                  />
                </div>
              </div>

              {/* OBS (Medição) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  OBS (Medição)
                </label>
                <textarea
                  rows={3}
                  placeholder="Insira observações detalhadas sobre a medição/tratativa desta DC..."
                  value={formData['OBS (Medição)']}
                  onChange={(e) => handleChange('OBS (Medição)', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002855] focus:outline-none"
                />
              </div>
            </form>
          </div>

          {/* SECTION 1: Bloco 1 - Base Matriz (Read Only with Copy) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-700" />
                <h4 className="text-sm font-bold text-slate-900">
                  Bloco 1 — Base Matriz (Importação Somente Leitura)
                </h4>
                <span className="text-[10px] text-slate-500 font-medium">
                  (Colunas C a V)
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyAllBloco1}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200"
                title="Copiar todas as informações do Bloco 1"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    <span className="text-emerald-700 font-bold">Todos Copiados!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copiar Todos os Dados</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
              {BLOCO_1_KEYS.map((key) => {
                const val = (registro as any)[key];
                const isCopied = copiedKey === key;
                return (
                  <div
                    key={key}
                    className="bg-slate-50 hover:bg-slate-100/80 p-2.5 rounded-lg border border-slate-200/80 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
                          {key}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyValue(key, val)}
                          className="p-1 rounded text-slate-400 hover:text-[#002855] hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
                          title={`Copiar valor de ${key}`}
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <span className="block font-semibold text-slate-800 truncate mt-0.5" title={val}>
                        {val || '—'}
                      </span>
                    </div>

                    {isCopied && (
                      <span className="text-[9px] font-bold text-emerald-600 mt-1 animate-in fade-in">
                        Copiado!
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {registro._updatedAt && (
              <span>
                Última atualização:{' '}
                {new Date(registro._updatedAt).toLocaleString('pt-BR')} por{' '}
                {registro._updatedBy || 'Sistema'}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              form="form-edit-bloco2"
              disabled={saving}
              className="px-4 py-2 bg-[#002855] hover:bg-[#001e40] text-white rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Alterações (Bloco 2)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
