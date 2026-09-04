import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isFirebaseConfigured, missingFirebaseEnvVars } from '../lib/firebase';
import {
  FileSpreadsheet,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Info,
  Key,
  Copy,
  Check,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEnvTemplate = () => {
    const template = [
      'VITE_FIREBASE_API_KEY=',
      'VITE_FIREBASE_AUTH_DOMAIN=',
      'VITE_FIREBASE_PROJECT_ID=',
      'VITE_FIREBASE_STORAGE_BUCKET=',
      'VITE_FIREBASE_MESSAGING_SENDER_ID=',
      'VITE_FIREBASE_APP_ID=',
      'VITE_FIREBASE_DATABASE_ID=',
    ].join('\n');
    navigator.clipboard.writeText(template);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#002855] flex items-center justify-center shadow-md border border-slate-700/50">
            <FileSpreadsheet className="w-8 h-8 text-cyan-400" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          V.TAL <span className="text-[#002855]">OBRAS</span>
        </h1>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Sistema Corporativo de Medições e Controle de DCs
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Vercel Environment Variables Notice if not yet configured */}
        {!isFirebaseConfigured && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 shadow-xs">
            <div className="flex items-start space-x-2.5">
              <Key className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-amber-900">
                  Configuração de Variáveis no Vercel
                </h4>
                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                  Para conectar o sistema ao Firebase no Vercel, adicione as variáveis de ambiente em{' '}
                  <strong>Vercel &gt; Settings &gt; Environment Variables</strong>:
                </p>
                <div className="mt-2 text-[10px] font-mono bg-white/80 p-2 rounded border border-amber-200 text-slate-700">
                  {missingFirebaseEnvVars.length > 0 ? missingFirebaseEnvVars.join(', ') : 'VITE_FIREBASE_*'}
                </div>
                <button
                  type="button"
                  onClick={handleCopyEnvTemplate}
                  className="mt-2 inline-flex items-center space-x-1 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-900 transition-colors cursor-pointer"
                >
                  {copiedEnv ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-700" />
                      <span>Copiado para colar no Vercel!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar Nomes das Variáveis</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm border border-slate-200/90 rounded-2xl">
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="font-semibold leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="input-login-email"
                className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                E-mail Corporativo
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="input-login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com.br"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002855] focus:border-transparent text-slate-900 placeholder:text-slate-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="input-login-password"
                className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Senha de Acesso
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002855] focus:border-transparent text-slate-900 placeholder:text-slate-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Information Note */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-start space-x-2.5 text-slate-600 text-xs">
              <Info className="w-4 h-4 text-[#002855] shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                Somente usuários previamente cadastrados pelo Administrador possuem acesso ao sistema.
              </p>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#002855] hover:bg-[#001e40] shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002855] disabled:opacity-60 cursor-pointer pt-3 pb-3"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security badge */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center space-x-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>Sistema Corporativo • Gestão Integrada de Obras e Medições</span>
          </p>
        </div>
      </div>
    </div>
  );
};
