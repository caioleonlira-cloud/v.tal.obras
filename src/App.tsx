import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { isFirebaseConfigured } from './lib/firebase';
import { Header, NavTabType } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { MinhaContaModal } from './components/MinhaContaModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { RegistrosView } from './components/Registros/RegistrosView';
import { DashboardView } from './components/Dashboard/DashboardView';
import { ImportacaoView } from './components/Importacao/ImportacaoView';
import { SegmentacoesView } from './components/Segmentacoes/SegmentacoesView';
import { UsuariosView } from './components/Usuarios/UsuariosView';
import { FileSpreadsheet, RefreshCw, AlertTriangle, X } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, profile, loading, isAdmin } = useAuth();
  const { quotaExhausted, quotaErrorMessage, clearQuotaError } = useData();
  const [activeTab, setActiveTab] = useState<NavTabType>('registros');
  const [isMinhaContaOpen, setIsMinhaContaOpen] = useState(false);
  const [isFirebaseConfigOpen, setIsFirebaseConfigOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#002855] flex items-center justify-center shadow-lg border border-slate-700">
          <FileSpreadsheet className="w-7 h-7 text-cyan-400" />
        </div>
        <div className="flex items-center space-x-2 text-slate-700 text-xs font-bold">
          <RefreshCw className="w-4 h-4 animate-spin text-[#002855]" />
          <span>Iniciando V.TAL OBRAS...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Admin Quota Warning Banner (Hidden for field users, shown only for Admin) */}
      {isAdmin && quotaExhausted && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-semibold flex items-center justify-between border-b border-amber-600 shadow-sm animate-in slide-in-from-top select-none">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
            <span>
              <strong>Aviso de Cota do Firestore (Plano Gratuito Spark):</strong> {quotaErrorMessage || 'O limite diário de leituras/operações foi atingido. As consultas em tempo real estão temporariamente pausadas e o sistema continuará operando com segurança no modo cache local.'}
            </span>
          </div>
          <button
            onClick={clearQuotaError}
            className="p-1 text-slate-950 hover:text-black rounded hover:bg-amber-600/30 transition-colors ml-3 cursor-pointer shrink-0"
            title="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Fixed Corporate Header in 2 Lines (TeleMont Style) */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if ((tab === 'segmentacoes' || tab === 'usuarios' || tab === 'importacao') && !isAdmin) {
            setActiveTab('registros');
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenMinhaConta={() => setIsMinhaContaOpen(true)}
        onOpenFirebaseConfig={() => setIsFirebaseConfigOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'registros' && <RegistrosView />}
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'importacao' && isAdmin && <ImportacaoView />}
        {activeTab === 'segmentacoes' && isAdmin && <SegmentacoesView />}
        {activeTab === 'usuarios' && isAdmin && <UsuariosView />}
      </main>

      {/* Account / Change Password Modal */}
      <MinhaContaModal
        isOpen={isMinhaContaOpen}
        onClose={() => setIsMinhaContaOpen(false)}
      />

      {/* Firebase / Vercel Configuration Modal */}
      <FirebaseConfigModal
        isOpen={isFirebaseConfigOpen}
        onClose={() => setIsFirebaseConfigOpen(false)}
      />

      {/* Corporate Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div>
            <strong>V.TAL OBRAS</strong> — Sistema Integrado de Acompanhamento de Medições de Obras e DCs
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setIsFirebaseConfigOpen(true)}
              className="cursor-pointer hover:underline flex items-center space-x-1"
            >
              <span>Conexão:</span>
              <span className={`font-semibold ${isFirebaseConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
                ● {isFirebaseConfigured ? 'Firebase Firestore (Online)' : 'Armazenamento Local / Clique para Configurar'}
              </span>
            </button>
            <span>Usuário: <strong className="text-slate-700">{profile?.name || user.email}</strong> ({profile?.role === 'ADM' ? 'Administrador' : 'Usuário Padrão'})</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainLayout />
      </DataProvider>
    </AuthProvider>
  );
}
