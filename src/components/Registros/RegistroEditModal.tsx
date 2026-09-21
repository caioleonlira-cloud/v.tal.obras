import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Registro,
  RegistroBloco2,
  BLOCO_1_KEYS,
} from '../../types';
import {
  X,
  Check,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { RegistroBloco2Form } from './RegistroBloco2Form';
import { RegistroBloco1Details } from './RegistroBloco1Details';
import { isValidDateBR } from '../../utils/dateUtils';

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

    // Validação estrita de preenchimento de datas
    const dateFields = [
      { key: 'Data Previsão Entrega (Medição)', label: 'Data Previsão Entrega (Medição)' },
      { key: 'Data Previsão Entrega (Projeto)', label: 'Data Previsão Entrega (Projeto)' },
      { key: 'Data Tratativa', label: 'Data Tratativa' },
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

  return createPortal(
    <div
      style={{ zIndex: 2000 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[780px] max-h-[84vh] flex flex-col overflow-hidden my-auto">
        {/* Header - Fixed */}
        <div className="bg-[#002855] text-white px-3.5 sm:px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="p-1 rounded-md bg-[#005B94]/50 border border-cyan-400/30 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="fs-modal-title font-bold text-white tracking-wide">
                  DC: {registro.DC}
                </h3>
                <span className="px-1.5 py-0.5 rounded fs-modal-badge font-bold bg-[#007A87] text-white">
                  {registro.UF || 'UF'} - {registro.Localidade || 'Localidade'}
                </span>
                <span className="px-1.5 py-0.5 rounded fs-modal-badge font-semibold bg-[#001D3D] text-white border border-white/20">
                  {registro['Status da DC (Atual)'] || 'Sem Status'}
                </span>
              </div>
              <p className="text-blue-100/80 fs-modal-subtitle font-normal truncate max-w-md sm:max-w-xl mt-0.5">
                {registro.Descricao || registro['Tipo de Projeto'] || 'Detalhes da Obra'}
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

          {/* BLOCO 2 (Acima): Preenchimento & Acompanhamento (Campos de Edição) - Aberto por padrão */}
          <RegistroBloco2Form
            formData={formData}
            handleChange={handleChange}
            handleSave={handleSave}
            segmentacoes={segmentacoes}
          />

          {/* BLOCO 1 (Abaixo): Dados da DC (Base Matriz - Somente Leitura) - Accordion Recolhido por padrão */}
          <RegistroBloco1Details
            registro={registro}
            copiedKey={copiedKey}
            copiedAll={copiedAll}
            handleCopyValue={handleCopyValue}
            handleCopyAllBloco1={handleCopyAllBloco1}
          />
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
              form="form-edit-bloco2"
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
