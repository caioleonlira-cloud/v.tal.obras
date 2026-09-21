import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ImportacaoPadrao } from './ImportacaoPadrao';
import { ImportacaoMassiva } from './ImportacaoMassiva';
import { ImportacaoFR } from './ImportacaoFR';
import {
  Layers,
  Database,
  Edit3,
  FileSpreadsheet,
  ShieldAlert,
  Wrench,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const ImportacaoView: React.FC = () => {
  const { isAdmin } = useAuth();
  const { migrarNomesDeCampos } = useData();
  const [activeSubTab, setActiveSubTab] = useState<'padrao' | 'massiva' | 'fr'>('padrao');

  // Migration states
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [migratedProgress, setMigratedProgress] = useState<{ done: number; total: number } | null>(null);
  const [migrationResult, setMigrationResult] = useState<{
    migrados: number;
    jaOk: number;
    total: number;
    erro?: string;
  } | null>(null);

  const handleRunMigration = async () => {
    if (!window.confirm('Deseja iniciar a migração de nomes de campos ("TIPO (Cateira)" -> "TIPO (Carteira)" e "Backlog/Input?" -> "Plan. Estruturante") em todos os registros do banco?')) {
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);
    setMigratedProgress({ done: 0, total: 1 });

    const res = await migrarNomesDeCampos((done, total) => {
      setMigratedProgress({ done, total });
    });

    setIsMigrating(false);
    setMigrationResult(res);
  };

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
      {/* Sub-Tabs Switcher & Migration Button Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex bg-slate-200/80 p-1 rounded-xl w-full max-w-xl shadow-inner border border-slate-300/60">
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

          <button
            onClick={() => setActiveSubTab('fr')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              activeSubTab === 'fr'
                ? 'bg-white text-[#002855] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-700" />
            <span>3. Base de FR (Faturamento)</span>
          </button>
        </div>

        {/* Action: Field Migration */}
        <button
          onClick={handleRunMigration}
          disabled={isMigrating}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-60 cursor-pointer"
          title="Renomear no Firestore campos legados: TIPO (Cateira) -> TIPO (Carteira) e Backlog/Input? -> Plan. Estruturante"
        >
          {isMigrating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-700" />
          ) : (
            <Wrench className="w-3.5 h-3.5 text-slate-600" />
          )}
          <span>{isMigrating ? 'Migrando banco...' : 'Migrar nomes de campos'}</span>
        </button>
      </div>

      {/* Migration Feedback Banner */}
      {isMigrating && migratedProgress && (
        <div className="p-3.5 bg-cyan-50 border border-cyan-200 rounded-xl text-xs text-cyan-950 flex items-center justify-between">
          <div className="flex items-center space-x-2 font-bold">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-700" />
            <span>Executando migração de campos legados no Firestore...</span>
          </div>
          <span className="font-mono font-bold">
            {migratedProgress.done} de {migratedProgress.total} registros
          </span>
        </div>
      )}

      {migrationResult && !isMigrating && (
        <div
          className={`p-4 rounded-xl text-xs flex items-start space-x-3 border ${
            migrationResult.erro
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {migrationResult.erro ? (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-bold">
              {migrationResult.erro
                ? 'Falha ao executar migração de campos no banco de dados:'
                : 'Migração de nomes de campos concluída com sucesso!'}
            </p>
            <p className="mt-0.5">
              {migrationResult.erro
                ? migrationResult.erro
                : `${migrationResult.migrados} registros migrados, ${migrationResult.jaOk} já estavam com o nome correto (Total avaliado: ${migrationResult.total}).`}
            </p>
          </div>
        </div>
      )}

      {/* Render Active Import Component */}
      {activeSubTab === 'padrao' && <ImportacaoPadrao />}
      {activeSubTab === 'massiva' && <ImportacaoMassiva />}
      {activeSubTab === 'fr' && <ImportacaoFR />}
    </div>
  );
};

