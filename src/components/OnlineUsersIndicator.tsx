import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  X,
  ShieldCheck,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { OnlineUserInfo } from '../hooks/useOnlinePresence';

interface OnlineUsersIndicatorProps {
  onlineCount: number;
  onlineUsers: OnlineUserInfo[];
}

export const OnlineUsersIndicator: React.FC<OnlineUsersIndicatorProps> = ({
  onlineCount,
  onlineUsers,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Badge Usuários Online: Mesmo estilo do badge "Tempo Real Conectado" */}
      <button
        type="button"
        id="btn-online-users-indicator"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Usuários atuando no sistema no momento (visível somente para ADM). Clique para ver detalhes."
        className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shadow-xs cursor-pointer transition-all hover:scale-105 bg-cyan-950/85 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900"
      >
        <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            onlineCount > 0
              ? 'bg-cyan-400 animate-pulse'
              : 'bg-slate-400'
          }`}
        />
        <span className="font-semibold tracking-tight">
          {onlineCount} {onlineCount === 1 ? 'Usuário Online' : 'Usuários Online'}
        </span>
      </button>

      {/* Popover com Lista Detalhada de Usuários Online (Exclusivo ADM) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 text-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header do Popover */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/70">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white leading-tight">
                  Usuários Atuando no Momento
                </h4>
                <p className="text-[10px] text-slate-400">
                  Monitoramento em tempo real (Firestore)
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status do Canal */}
          <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-300">
                Canal: <strong className="text-white">Firestore</strong>
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/30">
              Conectado (Event-based)
            </span>
          </div>

          {/* Lista de Usuários Conectados */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/80 px-2 py-1">
            {onlineUsers.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Nenhum usuário detectado no momento.
              </div>
            ) : (
              onlineUsers.map((u) => (
                <div
                  key={u.uid}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-800/40 rounded-xl transition-colors"
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-xs">
                        {u.name?.charAt(0) || u.email?.charAt(0) || 'U'}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-semibold text-white truncate">
                          {u.name}
                        </span>
                        {u.isCurrent && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-500/30">
                            Você
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        {u.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        u.role === 'ADM'
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-500/30'
                          : u.role === 'COORD'
                          ? 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                          : u.role === 'CAMPO'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {u.role || 'PADRAO'}
                    </span>
                    {u.connectionsCount > 1 && (
                      <span
                        className="text-[9px] text-slate-400 font-semibold px-1 py-0.5 rounded bg-slate-800/80"
                        title={`${u.connectionsCount} abas ativas neste dispositivo`}
                      >
                        {u.connectionsCount} abas
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer do Popover */}
          <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1 text-slate-400 text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Visível exclusivamente para ADM</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
