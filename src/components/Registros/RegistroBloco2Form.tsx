import React from 'react';
import { RegistroBloco2 } from '../../types';
import { Edit3 } from 'lucide-react';

interface RegistroBloco2FormProps {
  formData: RegistroBloco2;
  handleChange: (key: keyof RegistroBloco2, value: string) => void;
  handleSave: (e: React.FormEvent) => void;
  segmentacoes: Record<string, string[]>;
}

export const RegistroBloco2Form: React.FC<RegistroBloco2FormProps> = ({
  formData,
  handleChange,
  handleSave,
  segmentacoes,
}) => {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
      {/* Header do Bloco 2 */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <Edit3 className="w-4 h-4 text-slate-800" />
          <h4 className="text-[14.5px] font-bold text-slate-900 tracking-tight">
            Bloco 2 — Preenchimento & Acompanhamento
          </h4>
          <span className="text-xs text-slate-400 font-normal">
            (Colunas W a AF)
          </span>
        </div>
        <div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50/60 border border-blue-200/80 px-3 py-1 rounded-md flex items-center space-x-1.5 shadow-2xs">
            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Colunas Equipe: Edição</span>
          </span>
        </div>
      </div>

      <form id="form-edit-bloco2" onSubmit={handleSave} className="space-y-3.5">
        {/* Grid de 3 colunas conforme layout da imagem */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3.5">
          {/* Linha 1 - Coluna 1: Status Informe (Campo) */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Status Informe (Campo)
            </label>
            <select
              value={formData['Status Informe (Campo)']}
              onChange={(e) => handleChange('Status Informe (Campo)', e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] focus:outline-none transition-colors"
            >
              <option value="">-- Selecione --</option>
              {(segmentacoes['STATUS DE OBRA'] || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Linha 1 - Coluna 2: Resp.Medição */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Resp.Medição
            </label>
            <select
              value={formData['Resp.Medição']}
              onChange={(e) => handleChange('Resp.Medição', e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] focus:outline-none transition-colors"
            >
              <option value="">-- Selecione --</option>
              {(segmentacoes['Resp.Medição (Sul)'] || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Linha 1 - Coluna 3: Responsavel (Área) */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Responsavel (Área)
            </label>
            <select
              value={formData['Responsavel']}
              onChange={(e) => handleChange('Responsavel', e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] focus:outline-none transition-colors"
            >
              <option value="">-- Selecione --</option>
              {(segmentacoes['RESP.'] || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Linha 2 - Coluna 1: Pendência (Implantação) */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Pendência (Implantação)
            </label>
            <select
              value={formData['Pendência (Implantação)']}
              onChange={(e) => handleChange('Pendência (Implantação)', e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] focus:outline-none transition-colors"
            >
              <option value="">-- Selecione --</option>
              {(segmentacoes['PENDÊNCIAS'] || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Linha 2 - Coluna 2: Pendência (Celula Sap) */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Pendência (Celula Sap)
            </label>
            <select
              value={formData['Pendência (Celula Sap)']}
              onChange={(e) => handleChange('Pendência (Celula Sap)', e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] focus:outline-none transition-colors"
            >
              <option value="">-- Selecione --</option>
              {(segmentacoes['PENDENCIA SAP'] || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Linha 2 - Coluna 3: Pendência (Projetos) */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Pendência (Projetos)
            </label>
            <select
              value={formData['Pendência (Projetos)']}
              onChange={(e) => handleChange('Pendência (Projetos)', e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] focus:outline-none transition-colors"
            >
              <option value="">-- Selecione --</option>
              {(segmentacoes['PENDÊNCIA (PROJETOS)'] || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Linha 3 - Coluna 1: Data Previsão Entrega (Medição) */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Data Previsão Entrega (Medição)
            </label>
            <input
              type="text"
              placeholder="dd/mm/aaaa"
              value={formData['Data Previsão Entrega (Medição)']}
              onChange={(e) => handleChange('Data Previsão Entrega (Medição)', e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] focus:outline-none transition-colors"
            />
          </div>

          {/* Linha 3 - Coluna 2: Data Previsão Entrega (Projeto) */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Data Previsão Entrega (Projeto)
            </label>
            <input
              type="text"
              placeholder="dd/mm/aaaa"
              value={formData['Data Previsão Entrega (Projeto)']}
              onChange={(e) => handleChange('Data Previsão Entrega (Projeto)', e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] focus:outline-none transition-colors"
            />
          </div>

          {/* Linha 3 - Coluna 3: Data Tratativa */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Data Tratativa
            </label>
            <input
              type="text"
              placeholder="dd/mm/aaaa"
              value={formData['Data Tratativa']}
              onChange={(e) => handleChange('Data Tratativa', e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] focus:outline-none transition-colors"
            />
          </div>

          {/* Linha 4 - Largura Total: OBS (Medição) */}
          <div className="col-span-1 md:col-span-3">
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              OBS (Medição)
            </label>
            <textarea
              rows={3}
              placeholder="Insira observações detalhadas sobre a medição/tratativa desta DC..."
              value={formData['OBS (Medição)']}
              onChange={(e) => handleChange('OBS (Medição)', e.target.value)}
              className="w-full min-h-[76px] px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] focus:outline-none resize-y transition-colors"
            />
          </div>
        </div>
      </form>
    </div>
  );
};
