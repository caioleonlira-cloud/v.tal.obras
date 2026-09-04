import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { isFirebaseConfigured } from '../lib/firebase';
import { useOnlinePresence } from '../hooks/useOnlinePresence';
import { OnlineUsersIndicator } from './OnlineUsersIndicator';
import {
  LayoutDashboard,
  Grid3X3,
  Layers,
  Upload,
  Settings2,
  Users,
  User,
  KeyRound,
  LogOut,
  RefreshCw,
  Cloud,
  Database,
  CheckCircle2,
} from 'lucide-react';

export type NavTabType =
  | 'registros'
  | 'dashboard'
  | 'importacao'
  | 'segmentacoes'
  | 'usuarios';

interface HeaderProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  onOpenMinhaConta: () => void;
  onOpenFirebaseConfig?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenMinhaConta,
  onOpenFirebaseConfig,
}) => {
  const { profile, user, logout, isAdmin } = useAuth();
  const { registros, loadingRegistros, refreshRegistros, isRealtimeConnected, realtimeStatus, lastSyncTimestamp } = useData();

  // Presença online em tempo real (Firestore event-based, exclusivo ADM)
  const {
    onlineCount,
    onlineUsers,
  } = useOnlinePresence({ user, profile, isAdmin });

  // User initials (e.g., "CA" from Caio or email)
  const userInitials = React.useMemo(() => {
    if (profile?.name) {
      const parts = profile.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      const namePart = user.email.split('@')[0];
      return namePart.slice(0, 2).toUpperCase();
    }
    return 'CA';
  }, [profile?.name, user?.email]);

  const userName = profile?.name || user?.email?.split('@')[0] || 'caio.lira';

  return (
    <header className="sticky top-0 z-40 w-full shadow-md select-none font-sans">
      {/* =========================================================================
          LINHA 1 — Identidade e Usuário (~40px, fundo #0a1f44)
          ========================================================================= */}
      <div className="w-full bg-[#0a1f44] border-b border-[#142d5c] px-4 py-1.5 flex items-center justify-between min-h-[42px]">
        {/* Esquerda: Badges e Logotipo Telemont / V.TAL OBRAS */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Badge Telemont */}
          <div className="px-2.5 py-0.5 rounded bg-[#1a56db] text-white font-extrabold text-[11px] tracking-wider uppercase shadow-xs">
            TELEMONT
          </div>

          {/* Badge V.TAL */}
          <div className="px-1.5 py-0.5 rounded bg-white text-[#0a1f44] font-black text-[10px] tracking-tight uppercase shadow-xs">
            V.TAL
          </div>

          {/* Nome do Sistema e Subtítulo */}
          <div className="flex items-baseline space-x-1.5">
            <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">
              OBRAS
            </span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase hidden sm:inline-block">
              TELEMONT GROUP
            </span>
          </div>
        </div>

        {/* Direita: Conexão, Refresh, Usuário, Permissões, Logout */}
        <div className="flex items-center space-x-2 sm:space-x-3.5">
          {/* Badge Conexão Firebase / Vercel: Clicável para ADM, Status em tempo real para não-ADM */}
          {isAdmin ? (
            <button
              type="button"
              onClick={onOpenFirebaseConfig}
              title="Gerenciar conexão Firebase / Vercel (Tempo Real Ativo)"
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shadow-xs cursor-pointer transition-all hover:scale-105 ${
                isFirebaseConfigured
                  ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-amber-950/80 border border-amber-500/40 text-amber-300 hover:bg-amber-900'
              }`}
            >
              {isFirebaseConfigured ? (
                <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isRealtimeConnected
                    ? 'bg-emerald-400 animate-ping'
                    : isFirebaseConfigured
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="hidden sm:inline">
                {isFirebaseConfigured
                  ? isRealtimeConnected
                    ? 'Tempo Real Conectado'
                    : 'Firebase Conectado'
                  : 'Configurar Firebase'}
              </span>
            </button>
          ) : (
            <div
              title={
                isRealtimeConnected
                  ? 'Sincronização em tempo real ativa (Google Sheets). Atualizações feitas por qualquer usuário são refletidas automaticamente.'
                  : 'Status de conexão dos dados'
              }
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium select-none shadow-2xs ${
                isRealtimeConnected && isFirebaseConfigured
                  ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                  : isFirebaseConfigured
                  ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/60 border border-amber-500/30 text-amber-300'
              }`}
            >
              {loadingRegistros ? (
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
              ) : isRealtimeConnected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </>
              ) : isFirebaseConfigured ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="hidden sm:inline">
                {loadingRegistros
                  ? 'Sincronizando...'
                  : isRealtimeConnected
                  ? 'Tempo Real Ativo'
                  : isFirebaseConfigured
                  ? 'Sincronizado'
                  : 'Modo Local'}
              </span>
            </div>
          )}

          {/* Badge Usuários Online (Visível SOMENTE para o perfil ADM, ao lado de Tempo Real Conectado) */}
          {isAdmin && (
            <OnlineUsersIndicator
              onlineCount={onlineCount}
              onlineUsers={onlineUsers}
            />
          )}

          {/* Ícone de Refresh / Recarregar */}
          <button
            type="button"
            onClick={() => refreshRegistros()}
            title="Recarregar base de dados"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingRegistros ? 'animate-spin text-cyan-400' : ''}`}
            />
          </button>

          {/* Bloco Usuário: Avatar circular azul + Nome + Tag Equipe/ADM + E-mail */}
          <div className="flex items-center space-x-2 pl-1 sm:pl-2 border-l border-white/10">
            {/* Avatar Circular */}
            <div className="w-7 h-7 rounded-full bg-[#1a56db] text-white font-bold text-xs flex items-center justify-center border border-white/20 shadow-xs shrink-0">
              {userInitials}
            </div>

            {/* Nome, Perfil e E-mail */}
            <div className="text-left leading-tight hidden md:block max-w-[170px] truncate">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-white truncate">{userName}</span>
                <span className="text-[9px] font-semibold bg-white/15 text-cyan-200 border border-white/20 px-1 py-0.2 rounded">
                  {isAdmin ? 'ADM' : 'Equipe'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          {/* Ícone Chave / Minha Conta */}
          <button
            type="button"
            onClick={onOpenMinhaConta}
            title="Minha Conta / Alterar Senha"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-cyan-300 flex items-center justify-center transition-colors cursor-pointer border border-white/10"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>

          {/* Ícone Saída / Logout */}
          <button
            type="button"
            onClick={logout}
            title="Sair do Sistema"
            className="w-7 h-7 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-red-500/30"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          LINHA 2 — Navegação por Abas (~36px, fundo #06152d)
          ========================================================================= */}
      <div className="w-full bg-[#06152d] px-4 py-1 flex items-center justify-between border-b border-[#0f244a] text-xs">
        {/* Esquerda: Abas de navegação */}
        <nav className="flex items-center space-x-1 overflow-x-auto custom-scrollbar py-0.5">
          {/* 1. Dashboard */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-[#1a56db] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          {/* 2. Registro (Ativo com badge) */}
          <button
            type="button"
            onClick={() => setActiveTab('registros')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'registros'
                ? 'bg-[#1a56db] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Registro</span>
            <span
              className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ml-1 ${
                activeTab === 'registros'
                  ? 'bg-[#0a1f44] text-cyan-300 border border-cyan-400/30'
                  : 'bg-white/15 text-slate-300'
              }`}
            >
              {registros.length.toLocaleString('pt-BR')}
            </span>
          </button>

          {/* 3. Importação (Visível APENAS para ADM) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('importacao')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'importacao'
                  ? 'bg-[#1a56db] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importação</span>
              <span className="text-[9px] bg-amber-500/30 text-amber-300 border border-amber-400/40 px-1 py-0.2 rounded font-bold">
                ADM
              </span>
            </button>
          )}

          {/* 4. Segmentações (ADM) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('segmentacoes')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'segmentacoes'
                  ? 'bg-[#1a56db] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Segmentações</span>
              <span className="text-[9px] bg-amber-500/30 text-amber-300 border border-amber-400/40 px-1 py-0.2 rounded font-bold">
                ADM
              </span>
            </button>
          )}

          {/* 6. Usuários (ADM) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('usuarios')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'usuarios'
                  ? 'bg-[#1a56db] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Usuários</span>
              <span className="text-[9px] bg-amber-500/30 text-amber-300 border border-amber-400/40 px-1 py-0.2 rounded font-bold">
                ADM
              </span>
            </button>
          )}

          {/* 7. Minha Conta */}
          <button
            type="button"
            onClick={onOpenMinhaConta}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer whitespace-nowrap"
          >
            <User className="w-3.5 h-3.5" />
            <span>Minha Conta</span>
          </button>
        </nav>

        {/* Direita: Status Contextual com Dot Verde */}
        <div className="hidden lg:flex items-center space-x-1.5 text-slate-400 text-[11px] font-medium pl-3 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs" />
          <span>Controle de Implantação e Medições OSP</span>
        </div>
      </div>
    </header>
  );
};
