import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  Loader2,
  HelpCircle,
  RefreshCw,
  Trash2,
  Database,
  PlusCircle,
  AlertOctagon,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { FR_COLUMNS } from '../../types';
import { parseFRFile, ParseFRResult, formatCurrency, parseFRValor, downloadModeloImportacaoFR, buildFRCompositeKey } from '../../utils/excel';

export const ImportacaoFR: React.FC = () => {
  const {
    frRegistros,
    importInfoFR,
    executarImportacaoFR,
    sincronizarFRLocalParaFirestore,
    apagarTodaBaseFR,
  } = useData();
  const { isAdmin, logout } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<ParseFRResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Import Confirmation Modal & Progress State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [executionSuccessMsg, setExecutionSuccessMsg] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [syncingLocal, setSyncingLocal] = useState<boolean>(false);

  // Delete Entire Base Modal & Progress State
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteProgressPct, setDeleteProgressPct] = useState<number>(0);
  const [deleteProgressMsg, setDeleteProgressMsg] = useState<string>('');
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Calculation of summary: CSV lines, new items, and ignored existing/duplicate lines
  const summary = useMemo(() => {
    if (!parseResult || !parseResult.valid || !parseResult.data) {
      return { totalCsv: 0, novos: 0, ignorados: 0 };
    }

    const existingFrSet = new Set<string>();
    frRegistros.forEach((r) => {
      const frVal = String(r.FR || r.id || '').trim();
      if (frVal) {
        existingFrSet.add(buildFRCompositeKey(frVal, r['DC MIGRADA/OPERAÇÃO']));
      }
    });

    const seenInCsv = new Set<string>();
    let novos = 0;
    let ignorados = 0;

    parseResult.data.forEach((row) => {
      const rawFr = String(row.FR || '').trim();
      if (!rawFr) {
        ignorados++;
        return;
      }
      const compositeKey = buildFRCompositeKey(row.FR, row['DC MIGRADA/OPERAÇÃO']);
      if (existingFrSet.has(compositeKey)) {
        ignorados++;
        return;
      }
      if (seenInCsv.has(compositeKey)) {
        ignorados++;
        return;
      }
      seenInCsv.add(compositeKey);
      novos++;
    });

    return {
      totalCsv: parseResult.totalRows,
      novos,
      ignorados,
    };
  }, [parseResult, frRegistros]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (!showConfirmModal && !showDeleteModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showConfirmModal, showDeleteModal]);

  const handleRetrySyncLocal = async () => {
    setSyncingLocal(true);
    setExecutionError(null);
    try {
      const res = await sincronizarFRLocalParaFirestore((pct, msg) => {
        setProgressPct(pct);
        setProgressMsg(msg);
      });
      if (res.success) {
        setExecutionSuccessMsg(`Sincronização com o Firestore concluída com sucesso! (${res.total || 0} registros sincronizados)`);
        setSelectedFile(null);
        setParseResult(null);
      } else {
        setExecutionError(res.erro || 'Falha ao sincronizar dados com o Firestore.');
      }
    } catch (e: any) {
      setExecutionError(e?.message || 'Erro ao sincronizar com o Firestore.');
    } finally {
      setSyncingLocal(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMsg(null);
    setParseResult(null);
    setExecutionSuccessMsg(null);
    setExecutionError(null);
    setDeleteSuccessMsg(null);
    setDeleteError(null);
    setParsing(true);

    try {
      const res = await parseFRFile(file);
      setParseResult(res);
      if (!res.valid) {
        setErrorMsg(res.error || 'A planilha não atende aos requisitos obrigatórios.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao processar arquivo.');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || !parseResult.valid || parseResult.data.length === 0 || !selectedFile) {
      return;
    }
    if (summary.novos === 0) {
      return;
    }

    setIsExecuting(true);
    setExecutionError(null);
    setProgressPct(0);
    setProgressMsg('Iniciando importação incremental de FR...');

    try {
      const res = await executarImportacaoFR(
        parseResult.data,
        selectedFile.name,
        (pct, msg) => {
          setProgressPct(pct);
          setProgressMsg(msg);
        }
      );

      setIsExecuting(false);
      setShowConfirmModal(false);

      if (res.erro) {
        setExecutionError(res.erro);
      } else {
        const importados = typeof res.totalImportados === 'number' ? res.totalImportados : res.total;
        const ignorados = typeof res.totalIgnorados === 'number' ? res.totalIgnorados : summary.ignorados;
        setExecutionSuccessMsg(
          `Importação concluída: ${importados} novos registros gravados, ${ignorados} ignorados (já existentes).`
        );
        setSelectedFile(null);
        setParseResult(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err: any) {
      setIsExecuting(false);
      setShowConfirmModal(false);
      const codePart = err?.code ? `${err.code}: ` : '';
      const fullMsg = err?.message || 'Falha inesperada durante a importação.';
      setExecutionError(`${codePart}${fullMsg}`);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    setDeleteProgressPct(0);
    setDeleteProgressMsg('Iniciando exclusão de toda a base de FR...');

    try {
      const res = await apagarTodaBaseFR((pct, msg) => {
        setDeleteProgressPct(pct);
        setDeleteProgressMsg(msg);
      });

      setIsDeleting(false);
      setShowDeleteModal(false);

      if (!res.success) {
        setDeleteError(res.erro || 'Falha ao apagar base de FR.');
      } else {
        setDeleteSuccessMsg(
          `Base de FR completamente apagada com sucesso! (${res.apagados || 0} registros removidos do Firebase).`
        );
        setSelectedFile(null);
        setParseResult(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err: any) {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteError(err?.message || 'Erro inesperado ao apagar base de FR.');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    setErrorMsg(null);
    setExecutionError(null);
    setExecutionSuccessMsg(null);
    setDeleteError(null);
    setDeleteSuccessMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Informative Header & Actions */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-cyan-800 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Importação Incremental da Base de FR (Faturamento / Medição)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Importação incremental de novos registros via CSV oficial usando a junção de FR e DC MIGRADA/OPERAÇÃO como chave única. Nenhum dado existente é apagado.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={downloadModeloImportacaoFR}
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Baixar planilha modelo CSV com as 13 colunas estruturadas"
            >
              <Download className="w-4 h-4 text-cyan-700" />
              <span>Baixar Modelo FR (.csv)</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setShowDeleteModal(true);
                }}
                disabled={frRegistros.length === 0}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-rose-50 border border-rose-300 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={
                  frRegistros.length === 0
                    ? 'A base de FR já está vazia'
                    : 'Apagar todos os registros de FR do Firebase (exclusão permanente)'
                }
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Apagar toda a base de FR</span>
              </button>
            )}
          </div>
        </div>

        {/* Current Base Status Badge */}
        {frRegistros.length === 0 ? (
          <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center space-x-2 text-slate-600">
              <Database className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700">Base de FR vazia</span>
              <span className="text-slate-500">— Nenhum registro de FR cadastrado. Todas as linhas da próxima importação serão consideradas novas.</span>
            </div>
            <span className="bg-slate-200/80 text-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              0 registros ativos
            </span>
          </div>
        ) : importInfoFR ? (
          <div className="mt-5 p-3.5 bg-cyan-50/70 border border-cyan-200/80 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center space-x-2 text-cyan-950 font-medium">
              <Clock className="w-4 h-4 text-cyan-700 shrink-0" />
              <span>
                <strong>Última importação no Firebase:</strong>{' '}
                {new Date(importInfoFR.importedAt).toLocaleDateString('pt-BR')} às{' '}
                {new Date(importInfoFR.importedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{' '}
                por <span className="underline">{importInfoFR.importedBy}</span> ({importInfoFR.totalLinhas} linhas analisadas)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-white/80 border border-cyan-300 text-cyan-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                Arquivo: {importInfoFR.fileName}
              </span>
              <span className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                {frRegistros.length} registros ativos
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-5 p-3.5 bg-cyan-50/70 border border-cyan-200/80 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center space-x-2 text-cyan-950 font-medium">
              <HelpCircle className="w-4 h-4 text-cyan-600 shrink-0" />
              <span>Base carregada localmente. Registros disponíveis para consulta.</span>
            </div>
            <span className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              {frRegistros.length} registros ativos
            </span>
          </div>
        )}
      </div>

      {/* Rules & Requirements Checklist */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-cyan-700" />
          <span>Regras da Importação Incremental de FR</span>
        </h4>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="space-y-1.5">
            <p className="flex items-start space-x-2">
              <span className="text-cyan-700 font-bold">•</span>
              <span><strong>13 colunas obrigatórias:</strong> UF, DC-M, REG, Mês, CENTRO, LOCALIDADE DE PRESTAÇÃO, DATA DA SOLICITAÇÃO, DC MIGRADA/OPERAÇÃO, Nº MEDIÇÃO, Nº PEDIDO, ITEM DO PEDIDO, VALOR FR, FR.</span>
            </p>
            <p className="flex items-start space-x-2">
              <span className="text-cyan-700 font-bold">•</span>
              <span><strong>Chave única = junção de FR e DC MIGRADA/OPERAÇÃO:</strong> Se a combinação de FR e DC MIGRADA/OPERAÇÃO já existir na base, a linha é ignorada. Apenas casos inéditos são gravados.</span>
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="flex items-start space-x-2">
              <span className="text-cyan-700 font-bold">•</span>
              <span><strong>Base preservada:</strong> Nenhum dado existente é apagado na importação incremental.</span>
            </p>
            <p className="flex items-start space-x-2">
              <span className="text-cyan-700 font-bold">•</span>
              <span><strong>Deduplicação automática:</strong> Linhas duplicadas no mesmo arquivo e células com FR vazio são desconsideradas automaticamente.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Global Alerts: Delete Success / Error */}
      {deleteSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-950 flex items-start space-x-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{deleteSuccessMsg}</p>
            <p className="mt-0.5 text-emerald-800">
              Você pode carregar uma nova planilha de FR agora. Como a base está vazia, todas as linhas serão consideradas novas.
            </p>
          </div>
        </div>
      )}

      {deleteError && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-950 flex items-start space-x-3 animate-in fade-in duration-200">
          <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Aviso na exclusão da base de FR:</p>
            <p className="mt-0.5 text-rose-800">{deleteError}</p>
          </div>
        </div>
      )}

      {/* Execution Success Message */}
      {executionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-start space-x-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{executionSuccessMsg}</p>
            <p className="mt-1 text-emerald-800">
              Os novos registros foram gravados com segurança no Firestore e já estão disponíveis em todo o sistema.
            </p>
          </div>
        </div>
      )}

      {/* Execution Error */}
      {executionError && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-900 flex items-start space-x-3 animate-in fade-in duration-200">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-rose-950">Falha durante a gravação no banco de dados Firestore:</p>
            <p className="mt-1 font-mono text-xs bg-rose-100/80 p-2.5 rounded-lg border border-rose-200 text-rose-950 whitespace-pre-wrap">
              {executionError}
            </p>
            <div className="mt-3 flex items-center space-x-2 flex-wrap gap-2">
              {frRegistros.length > 0 && (
                <button
                  type="button"
                  onClick={handleRetrySyncLocal}
                  disabled={syncingLocal}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {syncingLocal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{syncingLocal ? 'Sincronizando com o Firestore...' : 'Tentar sincronizar base local com o Firestore'}</span>
                </button>
              )}
              {executionError.includes('permission-denied') && (
                <button
                  type="button"
                  onClick={() => logout()}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                >
                  <span>Sair e Fazer Login Novamente</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Box */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <label
          htmlFor="file-upload-fr"
          className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-cyan-600 rounded-2xl p-8 cursor-pointer transition-colors bg-slate-50/50 hover:bg-cyan-50/30"
        >
          <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800">
            {selectedFile ? selectedFile.name : 'Clique para selecionar a planilha de FR ou arraste o arquivo aqui'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Formato aceito: apenas CSV (.csv) delimitado por ponto e vírgula (;) ou vírgula (,)
          </p>
          <input
            id="file-upload-fr"
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* Parsing Loader */}
        {parsing && (
          <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-cyan-800 font-bold py-3 bg-cyan-50 border border-cyan-200 rounded-xl">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-700" />
            <span>Lendo estrutura e validando as 13 colunas da planilha...</span>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-3">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">A planilha selecionada foi rejeitada:</p>
              <p className="mt-1">{errorMsg}</p>
              {parseResult && parseResult.missingColumns.length > 0 && (
                <div className="mt-2 text-[11px] font-mono bg-rose-100 p-2 rounded-lg text-rose-900">
                  Colunas ausentes no CSV: {parseResult.missingColumns.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Valid Parse Summary & Action (Style identical to Matriz Import) */}
        {parseResult && parseResult.valid && (
          <div className="mt-6 border-t border-slate-200 pt-5 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Arquivo CSV validado com sucesso! As 13 colunas obrigatórias estão presentes.</span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Limpar seleção
              </button>
            </div>

            {/* 3 Metric Cards: Total CSV, Novos a Importar, Já Existentes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Total de Linhas no CSV */}
              <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                    <span>Total no CSV</span>
                  </span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {summary.totalCsv}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Total de linhas de dados identificadas na planilha.
                </p>
              </div>

              {/* Card 2: Novos a Importar */}
              <div
                className={`p-4 rounded-xl border ${
                  summary.novos > 0
                    ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-300/20'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center space-x-1.5">
                    <PlusCircle className="w-4 h-4 text-emerald-600" />
                    <span>Novos a Importar</span>
                  </span>
                  <span className="text-lg font-extrabold text-emerald-700">
                    {summary.novos}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Registros inéditos cuja junção de FR e DC MIGRADA/OPERAÇÃO ainda não existe no sistema.
                </p>
              </div>

              {/* Card 3: Já Existentes (serão ignorados) */}
              <div className="p-4 rounded-xl border bg-amber-50/70 border-amber-300/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
                    <RefreshCw className="w-4 h-4 text-amber-600" />
                    <span>Já Existentes (Ignorados)</span>
                  </span>
                  <span className="text-lg font-extrabold text-amber-800">
                    {summary.ignorados}
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 mt-1">
                  Combinações de FR e DC MIGRADA/OPERAÇÃO já cadastradas ou duplicadas que serão ignoradas.
                </p>
              </div>
            </div>

            {/* Quick Preview Table (first 4 rows) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-100 px-3.5 py-2 font-bold text-slate-700 flex items-center justify-between">
                <span>Prévia dos dados da planilha (primeiras linhas):</span>
                <span className="text-[11px] font-normal text-slate-500">
                  {parseResult.totalRows} linhas no arquivo
                </span>
              </div>
              <div className="overflow-x-auto max-h-56">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold">
                      <th className="p-2 whitespace-nowrap">UF</th>
                      <th className="p-2 whitespace-nowrap">DC-M</th>
                      <th className="p-2 whitespace-nowrap">REG</th>
                      <th className="p-2 whitespace-nowrap">Mês</th>
                      <th className="p-2 whitespace-nowrap">LOCALIDADE</th>
                      <th className="p-2 whitespace-nowrap">DATA SOLICITAÇÃO</th>
                      <th className="p-2 whitespace-nowrap">Nº MEDIÇÃO</th>
                      <th className="p-2 whitespace-nowrap">VALOR FR</th>
                      <th className="p-2 whitespace-nowrap">FR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parseResult.data.slice(0, 4).map((row, idx) => (
                      <tr key={idx} className="hover:bg-cyan-50/40">
                        <td className="p-2 font-bold text-slate-800">{row.UF}</td>
                        <td className="p-2 font-mono font-bold text-cyan-900">{row['DC-M']}</td>
                        <td className="p-2 text-slate-600">{row.REG}</td>
                        <td className="p-2 text-slate-600">{row.Mês}</td>
                        <td className="p-2 text-slate-600">{row['LOCALIDADE DE PRESTAÇÃO']}</td>
                        <td className="p-2 text-slate-600">{row['DATA DA SOLICITAÇÃO']}</td>
                        <td className="p-2 text-slate-600">{row['Nº MEDIÇÃO']}</td>
                        <td className="p-2 font-bold text-emerald-800">
                          {formatCurrency(parseFRValor(row['VALOR FR']))}
                        </td>
                        <td className="p-2 font-mono text-cyan-800">{row.FR}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Zero New Items Notice vs Action Button */}
            {summary.novos === 0 ? (
              <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-700">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-slate-500 shrink-0" />
                  <span>
                    <strong>Nenhum registro novo para importar.</strong> Todos os registros desta planilha já constam na base de FR (mesma junção de FR e DC MIGRADA/OPERAÇÃO) ou possuem FR vazio.
                  </span>
                </div>
                <button
                  disabled
                  className="px-5 py-2.5 bg-slate-300 text-slate-500 text-xs font-bold rounded-xl cursor-not-allowed shrink-0"
                >
                  Nenhum registro novo para importar
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">{summary.novos}</span> novo(s) registro(s) serão adicionados à base existente.
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-700 to-cyan-800 hover:from-cyan-800 hover:to-cyan-900 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Confirmar Importação de Novos Registros ({summary.novos})</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Incremental Import */}
      {showConfirmModal &&
        parseResult &&
        createPortal(
          <div
            style={{ zIndex: 2000 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-6 h-6" />
              </div>

              <h3 className="text-base font-extrabold text-slate-900 text-center">
                Confirmar Importação Incremental de FR
              </h3>

              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 text-center leading-relaxed">
                Serão importados <strong className="text-emerald-700">{summary.novos} registros novos</strong>.{' '}
                {summary.ignorados > 0 && (
                  <>
                    <strong className="text-amber-800">{summary.ignorados} registros já existentes</strong> serão ignorados.{' '}
                  </>
                )}
                <span className="font-semibold text-slate-900 block mt-1">Nenhum dado existente será apagado.</span>
              </div>

              {isExecuting ? (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>{progressMsg}</span>
                    <span className="text-cyan-800">{progressPct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-cyan-700 transition-all duration-200 ease-out"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 text-center">
                    Gravando novos registros no Firebase Firestore... Por favor não feche esta tela.
                  </p>
                </div>
              ) : (
                <div className="mt-6 flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-700 to-cyan-800 hover:from-cyan-800 hover:to-cyan-900 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Confirmar Importação</span>
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Confirmation Modal for Deleting Entire Base */}
      {showDeleteModal &&
        createPortal(
          <div
            style={{ zIndex: 2000 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-rose-200">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-base font-extrabold text-rose-950 text-center">
                Apagar toda a base de FR
              </h3>

              <p className="text-xs text-slate-700 text-center mt-3 leading-relaxed">
                Isso apagará todos os <strong className="text-rose-700 font-bold">{frRegistros.length} registros</strong> de FR do Firebase. Esta ação não pode ser desfeita.
              </p>

              {isDeleting ? (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>{deleteProgressMsg}</span>
                    <span className="text-rose-700">{deleteProgressPct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-rose-600 transition-all duration-200 ease-out"
                      style={{ width: `${deleteProgressPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 text-center">
                    Excluindo documentos do Firestore em lotes... Por favor aguarde.
                  </p>
                </div>
              ) : (
                <div className="mt-6 flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Apagar base</span>
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
