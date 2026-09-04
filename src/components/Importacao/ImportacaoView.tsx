import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ImportacaoPadrao } from './ImportacaoPadrao';
import { ImportacaoMassiva } from './ImportacaoMassiva';
import { Layers, Database, Edit3, ShieldAlert } from 'lucide-react';

export const ImportacaoView: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'padrao' | 'massiva'>('padrao');

  if (!isAdmin) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-xs border border-slate-200 text-center max-w-lg mx-auto mt-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-base font-extrabold text-slate-900">
          Acesso Restrito ao Perfil ADM
        </h3>
        <p className="text-xs text-slate-600 mt-2">
          Apenas usuários administradores têm permissão para importar planilhas e atualizar a base de dados do sistema. Usuários padrão possuem acesso somente de leitura.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Switcher */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl w-full max-w-md shadow-inner border border-slate-300/60">
        <button
          onClick={() => setActiveSubTab('padrao')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
            activeSubTab === 'padrao'
              ? 'bg-white text-[#002855] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-cyan-700" />
          <span>1. Base Matriz (Padrão)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('massiva')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
            activeSubTab === 'massiva'
              ? 'bg-white text-[#002855] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5 text-cyan-700" />
          <span>2. Acompanhamento (Massiva)</span>
        </button>
      </div>

      {/* Render Active Import Component */}
      {activeSubTab === 'padrao' ? <ImportacaoPadrao /> : <ImportacaoMassiva />}
    </div>
  );
};
