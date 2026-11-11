import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  readExcelFile,
  readCSVFileVivo,
  detectFileClient,
  downloadModeloImportacaoPadrao,
  downloadModeloImportacaoPadraoVivo,
  verificarColunasLeituraMatriz,
  verificarColunasLeituraMatrizVivo,
} from '../../utils/excel';
import {
  RegistroBloco1,
  Registro,
  RegistroVivoBloco1,
  RegistroVivo,
} from '../../types';
import { isFirebaseConfigured, missingFirebaseEnvVars } from '../../lib/firebase';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Layers,
  Search,
  Check,
  X,
} from 'lucide-react';

export const ImportacaoPadrao: React.FC = () => {
  const { isAdmin } = useAuth();
  const {
    analisarImportacaoPadrao,
    executarImportacaoPadrao,
    analisarImportacaoPadraoVivo,
    executarImportacaoPadraoVivo,
  } = useData();

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [detectedClient, setDetectedClient] = useState<'VTAL' | 'VIVO' | null>(null);

  // Analysis / Diff state for V.TAL
  const [diffVtal, setDiffVtal] = useState<{
    novas: RegistroBloco1[];
    removidas: Registro[];
    atualizadas: {
      dc: string;
      antigoBloco1: Partial<RegistroBloco1>;
      novoBloco1: RegistroBloco1;
      bloco2Existente: any;
    }[];
  } | null>(null);

  // Analysis / Diff state for VIVO
  const [diffVivo, setDiffVivo] = useState<{
    novas: RegistroVivoBloco1[];
    removidas: RegistroVivo[];
    atualizadas: {
      id: string;
      antigoBloco1: Partial<RegistroVivoBloco1>;
      novoBloco1: RegistroVivoBloco1;
      bloco2Existente: any;
    }[];
  } | null>(null);

  // Execution state
  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [completed, setCompleted] = useState(false);

  // Preview tab state
  const [activePreviewTab, setActivePreviewTab] = useState<'novas' | 'atualizadas' | 'removidas'>('novas');
  const [previewSearch, setPreviewSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await processFile(selectedFile);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await processFile(droppedFile);
    }
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setDiffVtal(null);
    setDiffVivo(null);
    setDetectedClient(null);
    setCompleted(false);
    setLoadingFile(true);

    try {
      // 1. Detect client automatically from file contents
      const client = await detectFileClient(selectedFile);
      if (client === 'UNKNOWN') {
        throw new Error(
          'Cliente não reconhecido. O arquivo CSV deve conter a coluna "DC" no cabeçalho (para base V.TAL) ou a coluna "ID" (para base VIVO).'
        );
      }
      setDetectedClient(client);

      if (client === 'VTAL') {
        const { sheetName: loadedSheet, data, detectedColumns: cols } = await readExcelFile(selectedFile);
        setSheetName(loadedSheet);

        if (data.length === 0) {
          throw new Error('A planilha selecionada está vazia.');
        }

        const checkMatriz = verificarColunasLeituraMatriz(cols);
        if (!checkMatriz.todasPresentes) {
          throw new Error(
            `Não é possível atualizar os registros da matriz V.TAL: todas as 26 colunas de Leitura da aba "Registro - (V.TAL OBRAS)" devem ser identificadas na planilha com os nomes corretos. A atualização é tudo ou nada. Colunas ausentes ou divergentes:\n• ${checkMatriz.ausentes.join(
              '\n• '
            )}`
          );
        }

        const resultDiff = analisarImportacaoPadrao(data, cols);
        setDiffVtal(resultDiff);

        if (resultDiff.novas.length > 0) {
          setActivePreviewTab('novas');
        } else if (resultDiff.atualizadas.length > 0) {
          setActivePreviewTab('atualizadas');
        } else if (resultDiff.removidas.length > 0) {
          setActivePreviewTab('removidas');
        }
      } else {
        // VIVO
        const { sheetName: loadedSheet, data, detectedColumns: cols } = await readCSVFileVivo(selectedFile);
        setSheetName(loadedSheet);

        if (data.length === 0) {
          throw new Error('A planilha selecionada da VIVO está vazia.');
        }

        const checkMatriz = verificarColunasLeituraMatrizVivo(cols);
        if (!checkMatriz.todasPresentes) {
          throw new Error(
            `Não é possível atualizar os registros da matriz VIVO: todas as 21 colunas de Leitura da aba "Registro - (VIVO OBRAS)" devem ser identificadas na planilha com os nomes corretos. A atualização é tudo ou nada. Colunas ausentes ou divergentes:\n• ${checkMatriz.ausentes.join(
              '\n• '
            )}`
          );
        }

        const resultDiff = analisarImportacaoPadraoVivo(data, cols);
        setDiffVivo(resultDiff);

        if (resultDiff.novas.length > 0) {
          setActivePreviewTab('novas');
        } else if (resultDiff.atualizadas.length > 0) {
          setActivePreviewTab('atualizadas');
        } else if (resultDiff.removidas.length > 0) {
          setActivePreviewTab('removidas');
        }
      }
    } catch (err: any) {
      setParseError(err.message || 'Erro ao processar planilha.');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleExecute = async () => {
    if (!isAdmin) {
      setParseError('Você precisa de privilégios de Administrador para confirmar a importação no banco de dados.');
      return;
    }

    setExecuting(true);
    setProgress(0);
    setProgressStep('Iniciando...');

    try {
      if (detectedClient === 'VTAL' && diffVtal) {
        await executarImportacaoPadrao(diffVtal, (pct, msg) => {
          setProgress(pct);
          setProgressStep(msg);
        });
        setCompleted(true);
      } else if (detectedClient === 'VIVO' && diffVivo) {
        await executarImportacaoPadraoVivo(diffVivo, (pct, msg) => {
          setProgress(pct);
          setProgressStep(msg);
        });
        setCompleted(true);
      }
    } catch (err: any) {
      console.error('Erro detalhado durante importação padrão:', err);
      const codePart = err?.code ? `[${err.code}] ` : '';
      const fullMsg = err?.message || 'Erro de comunicação com o banco de dados.';
      setParseError(`${codePart}${fullMsg}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setDiffVtal(null);
    setDiffVivo(null);
    setDetectedClient(null);
    setCompleted(false);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Preview counts & items
  const novasCount = detectedClient === 'VTAL' ? diffVtal?.novas.length || 0 : diffVivo?.novas.length || 0;
  const atualizadasCount = detectedClient === 'VTAL' ? diffVtal?.atualizadas.length || 0 : diffVivo?.atualizadas.length || 0;
  const removidasCount = detectedClient === 'VTAL' ? diffVtal?.removidas.length || 0 : diffVivo?.removidas.length || 0;

  const filteredNovas = (
    detectedClient === 'VTAL' ? diffVtal?.novas || [] : diffVivo?.novas || []
  ).filter((item: any) => !previewSearch || JSON.stringify(item).toLowerCase().includes(previewSearch.toLowerCase()));

  const filteredAtualizadas = (
    detectedClient === 'VTAL' ? diffVtal?.atualizadas || [] : diffVivo?.atualizadas || []
  ).filter((item: any) => !previewSearch || JSON.stringify(item).toLowerCase().includes(previewSearch.toLowerCase()));

  const filteredRemovidas = (
    detectedClient === 'VTAL' ? diffVtal?.removidas || [] : diffVivo?.removidas || []
  ).filter((item: any) => !previewSearch || JSON.stringify(item).toLowerCase().includes(previewSearch.toLowerCase()));

  const hasDiff = !!(diffVtal || diffVivo);

  return (
    <div className="space-y-6">
      {/* Introduction and Template Download Banner */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#002855]" />
            <h3 className="text-base font-bold text-slate-900">
              Importação Padrão — Base Matriz (V.TAL e VIVO)
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Sincroniza a base de obras. O sistema detecta automaticamente o cliente através do cabeçalho da planilha (coluna <strong>DC</strong> para V.TAL ou coluna <strong>ID</strong> para VIVO).
            <strong className="text-slate-800"> O Bloco 2 preenchido pela equipe nunca é sobrescrito.</strong>
          </p>
        </div>

        {/* Both template download buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={downloadModeloImportacaoPadrao}
            className="px-3.5 py-2.5 bg-[#002855] hover:bg-[#001e40] text-white rounded-xl text-xs font-bold border border-[#002855] shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Baixar modelo oficial V.TAL com as 26 colunas esperadas"
          >
            <Download className="w-4 h-4 text-cyan-300" />
            <span>Modelo Padrão — V.TAL</span>
          </button>

          <button
            onClick={downloadModeloImportacaoPadraoVivo}
            className="px-3.5 py-2.5 bg-[#002855] hover:bg-[#001e40] text-white rounded-xl text-xs font-bold border border-[#002855] shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Baixar modelo oficial VIVO com as 21 colunas esperadas"
          >
            <Download className="w-4 h-4 text-cyan-300" />
            <span>Modelo Padrão — VIVO</span>
          </button>
        </div>
      </div>

      {/* Template Instructions Card */}
      <div className="bg-gradient-to-r from-blue-50/70 to-slate-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start space-x-3">
          <FileSpreadsheet className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900 block">
              Detecção Inteligente de Cliente
            </span>
            <span className="text-slate-600 mt-0.5 block leading-relaxed">
              Planilhas com coluna <strong>DC</strong> serão sincronizadas na base <strong>V.TAL OBRAS</strong> (26 colunas). Planilhas com coluna <strong>ID</strong> serão sincronizadas na base <strong>VIVO OBRAS</strong> (21 colunas). Baixe os modelos oficiais acima para conferir os cabeçalhos.
            </span>
          </div>
        </div>
      </div>

      {!isFirebaseConfigured && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-amber-950">Aviso: Variáveis de Conexão do Firebase Não Detectadas</h5>
            <p className="mt-0.5 text-amber-800 leading-relaxed">
              O aplicativo está operando com chaves temporárias de inicialização. Para gravar dados de forma persistente no Firestore,
              certifique-se de preencher as variáveis <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px] font-semibold">{missingFirebaseEnvVars.join(', ') || 'VITE_FIREBASE_API_KEY'}</code> no ambiente de deploy.
            </p>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      {!hasDiff && !completed && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors bg-white ${
            loadingFile
              ? 'border-cyan-400 bg-cyan-50/30'
              : 'border-slate-300 hover:border-[#002855] hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload-padrao"
          />

          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#002855]/5 border border-[#002855]/10 flex items-center justify-center text-[#002855]">
            {loadingFile ? (
              <RefreshCw className="w-7 h-7 animate-spin text-cyan-600" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <h4 className="text-sm font-bold text-slate-800">
            {loadingFile ? 'Lendo e identificando cliente na planilha...' : 'Selecione ou arraste o arquivo CSV da Base Matriz (V.TAL ou VIVO)'}
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Reconhecimento automático: coluna &quot;DC&quot; direciona para V.TAL e coluna &quot;ID&quot; direciona para VIVO.
          </p>

          <div className="mt-5 flex justify-center gap-3">
            <label
              htmlFor="file-upload-padrao"
              className="px-5 py-2.5 bg-[#002855] hover:bg-[#001e40] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors inline-flex items-center space-x-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-cyan-300" />
              <span>Escolher Arquivo no Computador</span>
            </label>
          </div>

          {parseError && (
            <div className="mt-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 max-w-lg mx-auto flex items-start space-x-2 text-left">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="whitespace-pre-wrap">{parseError}</span>
            </div>
          )}
        </div>
      )}

      {/* Diff Analysis & Preview Screen */}
      {hasDiff && !completed && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden space-y-6 p-6">
          {/* Error Banner when execution or validation fails */}
          {parseError && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start justify-between space-x-2 animate-in fade-in duration-200">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-rose-950">Falha na Gravação no Firestore</h5>
                  <p className="mt-1 font-mono text-xs bg-rose-100/80 p-2.5 rounded-lg border border-rose-200 text-rose-950 whitespace-pre-wrap">{parseError}</p>
                </div>
              </div>
              <button
                onClick={() => setParseError(null)}
                className="text-rose-400 hover:text-rose-700 p-1 rounded-md cursor-pointer"
                title="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Client Identification Banner */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white bg-[#002855]">
                {detectedClient === 'VIVO' ? 'VIVO' : 'VTAL'}
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider block opacity-75">
                  Base Identificada Automaticamente
                </span>
                <h4 className="text-base font-extrabold">
                  {detectedClient === 'VIVO'
                    ? `Base VIVO OBRAS — ${novasCount + atualizadasCount} registros no arquivo`
                    : `Base V.TAL OBRAS — ${novasCount + atualizadasCount} registros no arquivo`}
                </h4>
              </div>
            </div>

            <div className="text-xs font-medium">
              Chave única: <strong className="font-mono">{detectedClient === 'VIVO' ? 'ID' : 'DC'}</strong>
            </div>
          </div>

          {/* Header & File Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <span className="text-xs font-bold text-cyan-700 uppercase tracking-wide">
                Prévia da Importação
              </span>
              <h4 className="text-base font-extrabold text-slate-900">
                Arquivo: {file?.name} (Aba: {sheetName})
              </h4>
              <p className="text-xs text-slate-500">
                Revise as alterações identificadas antes de aplicar no banco de dados.
              </p>
            </div>

            <button
              onClick={handleReset}
              disabled={executing}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 self-start sm:self-auto cursor-pointer"
            >
              Trocar de Arquivo
            </button>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Novas */}
            <div
              onClick={() => setActivePreviewTab('novas')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                activePreviewTab === 'novas'
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 flex items-center space-x-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Obras Novas (Inserção)</span>
                </span>
                <span className="text-lg font-extrabold text-emerald-700">
                  {novasCount}
                </span>
              </div>
              <p className="text-[11px] text-emerald-600 mt-1">
                Cadastradas com o Bloco 2 vazio para posterior acompanhamento.
              </p>
            </div>

            {/* Atualizadas */}
            <div
              onClick={() => setActivePreviewTab('atualizadas')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                activePreviewTab === 'atualizadas'
                  ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800 flex items-center space-x-1.5">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  <span>Obras Atualizadas</span>
                </span>
                <span className="text-lg font-extrabold text-blue-700">
                  {atualizadasCount}
                </span>
              </div>
              <p className="text-[11px] text-blue-600 mt-1">
                Atualização exclusiva do Bloco 1. O Bloco 2 será mantido intacto.
              </p>
            </div>

            {/* Removidas */}
            <div
              onClick={() => setActivePreviewTab('removidas')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                activePreviewTab === 'removidas'
                  ? 'bg-red-50 border-red-400 ring-2 ring-red-400/20'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-800 flex items-center space-x-1.5">
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>Obras Removidas (Exclusão)</span>
                </span>
                <span className="text-lg font-extrabold text-red-700">
                  {removidasCount}
                </span>
              </div>
              <p className="text-[11px] text-red-600 mt-1">
                Presentes no banco, mas ausentes na nova planilha.
              </p>
            </div>
          </div>

          {/* Search inside preview */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar nesta lista de prévia..."
                value={previewSearch}
                onChange={(e) => setPreviewSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855]"
              />
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Aba ativa:{' '}
              <strong className="text-slate-800 uppercase">
                {activePreviewTab === 'novas' && `Novas (${filteredNovas.length})`}
                {activePreviewTab === 'atualizadas' && `Atualizadas (${filteredAtualizadas.length})`}
                {activePreviewTab === 'removidas' && `Removidas (${filteredRemovidas.length})`}
              </strong>
            </span>
          </div>

          {/* Table Preview */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 sticky top-0">
                <tr>
                  <th className="py-2 px-3 font-bold">{detectedClient === 'VIVO' ? 'ID' : 'DC'}</th>
                  <th className="py-2 px-3 font-bold">UF</th>
                  <th className="py-2 px-3 font-bold">Localidade</th>
                  <th className="py-2 px-3 font-bold">Tipo de Projeto</th>
                  <th className="py-2 px-3 font-bold">
                    {detectedClient === 'VIVO' ? 'Status Medição Final' : 'Status da DC (Atual)'}
                  </th>
                  <th className="py-2 px-3 font-bold">
                    {detectedClient === 'VIVO' ? 'OSP ORÇAMENTO' : 'Valor Final R$'}
                  </th>
                  <th className="py-2 px-3 font-bold">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activePreviewTab === 'novas' &&
                  filteredNovas.slice(0, 50).map((r: any, i: number) => {
                    const idVal = detectedClient === 'VIVO' ? r.ID : r.DC;
                    const descVal = detectedClient === 'VIVO' ? r['Desc.'] : r.Descricao;
                    const statusVal = detectedClient === 'VIVO' ? r['Status Medição Final'] : r['Status da DC (Atual)'];
                    const valorVal = detectedClient === 'VIVO' ? r['OSP ORÇAMENTO'] : r['Valor Final R$'];
                    return (
                      <tr key={`nova_${idVal || i}_${i}`} className="hover:bg-emerald-50/40">
                        <td className="py-2 px-3 font-bold text-emerald-800 font-mono">{idVal}</td>
                        <td className="py-2 px-3">{r.UF}</td>
                        <td className="py-2 px-3">{r.Localidade}</td>
                        <td className="py-2 px-3">{r['Tipo de Projeto']}</td>
                        <td className="py-2 px-3">{statusVal}</td>
                        <td className="py-2 px-3 font-mono">{valorVal}</td>
                        <td className="py-2 px-3 truncate max-w-xs">{descVal}</td>
                      </tr>
                    );
                  })}

                {activePreviewTab === 'atualizadas' &&
                  filteredAtualizadas.slice(0, 50).map((r: any, i: number) => {
                    const idVal = detectedClient === 'VIVO' ? r.id : r.dc;
                    const novo = r.novoBloco1 || {};
                    const descVal = detectedClient === 'VIVO' ? novo['Desc.'] : novo.Descricao;
                    const statusVal = detectedClient === 'VIVO' ? novo['Status Medição Final'] : novo['Status da DC (Atual)'];
                    const valorVal = detectedClient === 'VIVO' ? novo['OSP ORÇAMENTO'] : novo['Valor Final R$'];
                    return (
                      <tr key={`atual_${idVal || i}_${i}`} className="hover:bg-blue-50/40">
                        <td className="py-2 px-3 font-bold text-blue-800 font-mono">{idVal}</td>
                        <td className="py-2 px-3">{novo.UF}</td>
                        <td className="py-2 px-3">{novo.Localidade}</td>
                        <td className="py-2 px-3">{novo['Tipo de Projeto']}</td>
                        <td className="py-2 px-3">{statusVal}</td>
                        <td className="py-2 px-3 font-mono">{valorVal}</td>
                        <td className="py-2 px-3 truncate max-w-xs">{descVal}</td>
                      </tr>
                    );
                  })}

                {activePreviewTab === 'removidas' &&
                  filteredRemovidas.slice(0, 50).map((r: any, i: number) => {
                    const idVal = detectedClient === 'VIVO' ? r.ID : r.DC;
                    const descVal = detectedClient === 'VIVO' ? r['Desc.'] : r.Descricao;
                    const statusVal = detectedClient === 'VIVO' ? r['Status Medição Final'] : r['Status da DC (Atual)'];
                    const valorVal = detectedClient === 'VIVO' ? r['OSP ORÇAMENTO'] : r['Valor Final R$'];
                    return (
                      <tr key={`rem_${idVal || i}_${i}`} className="hover:bg-red-50/40">
                        <td className="py-2 px-3 font-bold text-red-800 font-mono">{idVal}</td>
                        <td className="py-2 px-3">{r.UF}</td>
                        <td className="py-2 px-3">{r.Localidade}</td>
                        <td className="py-2 px-3">{r['Tipo de Projeto']}</td>
                        <td className="py-2 px-3">{statusVal}</td>
                        <td className="py-2 px-3 font-mono">{valorVal}</td>
                        <td className="py-2 px-3 truncate max-w-xs">{descVal}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Execution Progress Bar */}
          {executing && (
            <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>{progressStep}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full transition-all duration-300 bg-[#002855]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs text-slate-600">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Ao confirmar, a coleção <strong className="font-mono">{detectedClient === 'VIVO' ? 'registros_vivo' : 'registros'}</strong> será sincronizada no Firestore.
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleReset}
                disabled={executing}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                id="btn-confirm-import-padrao"
                onClick={handleExecute}
                disabled={executing}
                className="px-5 py-2.5 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50 bg-[#002855] hover:bg-[#001e40]"
              >
                {executing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                    <span>Gravando no Firestore...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Confirmar e Gravar na Base {detectedClient === 'VIVO' ? 'VIVO' : 'V.TAL'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {completed && (
        <div className="bg-white p-8 rounded-2xl shadow-xs border border-emerald-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h4 className="text-lg font-extrabold text-slate-900">
            Importação da Base Matriz {detectedClient === 'VIVO' ? 'VIVO' : 'V.TAL'} Concluída com Sucesso!
          </h4>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Os dados foram sincronizados no Firestore. Todas as alterações já estão disponíveis na aba{' '}
            <strong>{detectedClient === 'VIVO' ? 'Registro - (VIVO OBRAS)' : 'Registro - (V.TAL OBRAS)'}</strong>.
          </p>

          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Fazer Nova Importação
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
