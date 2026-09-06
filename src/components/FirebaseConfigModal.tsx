import React, { useState } from 'react';
import {
  firebaseConfig,
  isFirebaseConfigured,
  saveCustomFirebaseConfig,
  clearCustomFirebaseConfig,
  FirebaseConfigType,
  missingFirebaseEnvVars,
} from '../lib/firebase';
import { Database, X, CheckCircle2, AlertTriangle, Copy, Check, ShieldCheck, Sparkles, ExternalLink, RefreshCw, Radio, Zap, Users } from 'lucide-react';
import { useData } from '../context/DataContext';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ isOpen, onClose }) => {
  const { registros, isRealtimeConnected, realtimeStatus, lastSyncTimestamp, refreshRegistros, loadingRegistros } = useData();
  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleForceReconnect = async () => {
    setIsReconnecting(true);
    try {
      await refreshRegistros();
    } finally {
      setTimeout(() => setIsReconnecting(false), 600);
    }
  };

  const [form, setForm] = useState<FirebaseConfigType>({
    apiKey: firebaseConfig.apiKey.startsWith('AIzaSyDummy') ? '' : firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain.includes('vtal-obras-app') ? '' : firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId.includes('vtal-obras-app') ? '' : firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket.includes('vtal-obras-app') ? '' : firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId.includes('1234567890') ? '' : firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId.includes('1:1234567890') ? '' : firebaseConfig.appId,
    databaseId: firebaseConfig.databaseId || '',
  });

  if (!isOpen) return null;

  const handlePasteJson = () => {
    setJsonError(null);
    try {
      let text = jsonInput.trim();
      if (!text) return;

      // Extract JSON object if wrapped in const firebaseConfig = { ... }
      if (text.includes('{') && text.includes('}')) {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}') + 1;
        text = text.substring(start, end);
      }

      // Replace JS object keys with quoted keys if needed
      const normalizedJson = text
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
        .replace(/'/g, '"');

      const parsed = JSON.parse(normalizedJson);

      setForm((prev) => ({
        ...prev,
        apiKey: parsed.apiKey || parsed.api_key || prev.apiKey,
        authDomain: parsed.authDomain || parsed.auth_domain || prev.authDomain,
        projectId: parsed.projectId || parsed.project_id || prev.projectId,
        storageBucket: parsed.storageBucket || parsed.storage_bucket || prev.storageBucket,
        messagingSenderId: parsed.messagingSenderId || parsed.messaging_sender_id || prev.messagingSenderId,
        appId: parsed.appId || parsed.app_id || prev.appId,
        databaseId: parsed.databaseId || prev.databaseId,
      }));
      setJsonInput('');
    } catch (err: any) {
      setJsonError('Não foi possível ler o bloco JSON/Objeto. Cole o código ou preencha os campos abaixo manualmente.');
    }
  };

  const handleSave = () => {
    saveCustomFirebaseConfig(form);
  };

  const handleReset = () => {
    if (window.confirm('Deseja limpar as credenciais salvas e voltar ao modo padrão?')) {
      clearCustomFirebaseConfig();
    }
  };

  const copyEnvTemplate = () => {
    const template = `VITE_FIREBASE_API_KEY=${form.apiKey || 'sua-api-key'}
VITE_FIREBASE_AUTH_DOMAIN=${form.authDomain || 'seu-projeto.firebaseapp.com'}
VITE_FIREBASE_PROJECT_ID=${form.projectId || 'seu-projeto-id'}
VITE_FIREBASE_STORAGE_BUCKET=${form.storageBucket || 'seu-projeto.appspot.com'}
VITE_FIREBASE_MESSAGING_SENDER_ID=${form.messagingSenderId || '1234567890'}
VITE_FIREBASE_APP_ID=${form.appId || '1:1234567890:web:abcdef123456'}`;
    navigator.clipboard.writeText(template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#002855] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Database className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-base">Conexão Firebase / Vercel</h3>
              <p className="text-xs text-slate-300">Configuração de banco Firestore e credenciais do projeto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700 text-xs">
          {/* Status Bar */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isFirebaseConfigured
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}>
            <div className="flex items-center space-x-3">
              {isFirebaseConfigured ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
              )}
              <div>
                <h4 className="font-bold text-sm flex items-center space-x-2">
                  <span>{isFirebaseConfigured ? 'Firebase Conectado' : 'Modo Híbrido / Armazenamento Local Ativo'}</span>
                  {isRealtimeConnected && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow-2xs">
                      <Radio className="w-2.5 h-2.5 mr-1 animate-pulse" /> Tempo Real Ativo
                    </span>
                  )}
                </h4>
                <p className="text-xs opacity-90 mt-0.5">
                  {isFirebaseConfigured
                    ? `Sincronizando com o projeto "${firebaseConfig.projectId}" no Firestore.`
                    : 'O sistema grava e funciona normalmente com cache no navegador até você inserir as chaves do Firebase.'}
                </p>
              </div>
            </div>

            {isFirebaseConfigured && (
              <button
                type="button"
                onClick={handleForceReconnect}
                disabled={isReconnecting || loadingRegistros}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 shadow-2xs cursor-pointer transition-colors disabled:opacity-50 shrink-0"
                title="Forçar atualização e re-sincronizar listeners em tempo real"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting || loadingRegistros ? 'animate-spin' : ''}`} />
                <span>{isReconnecting ? 'Reconectando...' : 'Re-sincronizar'}</span>
              </button>
            )}
          </div>

          {/* Real-time Architecture Info Card */}
          {isFirebaseConfigured && (
            <div className="p-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200 rounded-xl space-y-2 text-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-xs text-blue-950">Sincronização em Tempo Real (Estilo Google Sheets)</span>
                </div>
                <div className="flex items-center space-x-1 text-[11px] text-blue-900 font-semibold bg-white/80 px-2 py-0.5 rounded border border-blue-200">
                  <Users className="w-3 h-3 text-blue-600" />
                  <span>~20 usuários simultâneos</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="bg-white/90 p-2 rounded-lg border border-blue-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Status do Listener</span>
                  <span className="font-bold text-emerald-700 flex items-center space-x-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    <span>{isRealtimeConnected ? 'Conectado (onSnapshot)' : 'Sincronizando...'}</span>
                  </span>
                </div>
                <div className="bg-white/90 p-2 rounded-lg border border-blue-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Registros em Memória</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{registros.length.toLocaleString('pt-BR')} itens</span>
                </div>
                <div className="bg-white/90 p-2 rounded-lg border border-blue-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Último Delta Recebido</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {lastSyncTimestamp ? new Date(lastSyncTimestamp).toLocaleTimeString('pt-BR') : 'Agora'}
                  </span>
                </div>
              </div>
              <p className="text-[10.5px] text-slate-500 leading-tight">
                * Conflito de edição: política de <strong>"último a salvar sobrescreve" (Last Write Wins)</strong> ativa. Qualquer alteração feita por outro usuário reflete instantaneamente sem travar a tela.
              </p>
            </div>
          )}

          {/* Quick Paste Block */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                <span>Colar Bloco firebaseConfig do Firebase Console (Rápido)</span>
              </label>
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-700 hover:underline flex items-center space-x-1 text-[11px] font-semibold"
              >
                <span>Abrir Firebase Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-500">
              Copie o código <code className="font-mono bg-slate-200 px-1 rounded">const firebaseConfig = &#123; ... &#125;</code> do seu app Web no Firebase Console e cole abaixo:
            </p>
            <div className="flex gap-2">
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={'const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "...",\n  projectId: "...",\n  ...\n};'}
                rows={3}
                className="flex-1 p-2.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px] text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={handlePasteJson}
                disabled={!jsonInput.trim()}
                className="px-4 py-2 bg-[#002855] hover:bg-[#001f44] disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer transition-colors shrink-0 flex items-center justify-center"
              >
                Aplicar
              </button>
            </div>
            {jsonError && <p className="text-red-600 font-semibold text-[11px]">{jsonError}</p>}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">API Key (VITE_FIREBASE_API_KEY)</label>
              <input
                type="text"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Project ID (VITE_FIREBASE_PROJECT_ID)</label>
              <input
                type="text"
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                placeholder="meu-projeto-id"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Auth Domain (VITE_FIREBASE_AUTH_DOMAIN)</label>
              <input
                type="text"
                value={form.authDomain}
                onChange={(e) => setForm({ ...form, authDomain: e.target.value })}
                placeholder="meu-projeto.firebaseapp.com"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Storage Bucket (VITE_FIREBASE_STORAGE_BUCKET)</label>
              <input
                type="text"
                value={form.storageBucket}
                onChange={(e) => setForm({ ...form, storageBucket: e.target.value })}
                placeholder="meu-projeto.appspot.com"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Sender ID (VITE_FIREBASE_MESSAGING_SENDER_ID)</label>
              <input
                type="text"
                value={form.messagingSenderId}
                onChange={(e) => setForm({ ...form, messagingSenderId: e.target.value })}
                placeholder="1234567890"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">App ID (VITE_FIREBASE_APP_ID)</label>
              <input
                type="text"
                value={form.appId}
                onChange={(e) => setForm({ ...form, appId: e.target.value })}
                placeholder="1:1234567890:web:abcdef..."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Vercel instructions & copy */}
          <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Deploy no Vercel</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                No painel do Vercel, acesse <strong>Project Settings → Environment Variables</strong> e cole as variáveis.
              </p>
            </div>
            <button
              type="button"
              onClick={copyEnvTemplate}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Copiado!' : 'Copiar para Vercel'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
          >
            Limpar e Desconectar
          </button>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Salvar e Conectar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
