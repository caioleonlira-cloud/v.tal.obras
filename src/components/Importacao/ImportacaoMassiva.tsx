import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  readExcelFile,
  downloadModeloImportacaoMassiva,
  exportarRelatorioDcsNaoEncontradas,
} from '../../utils/excel';
import { isFirebaseConfigured, missingFirebaseEnvVars } from '../../lib/firebase';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Check,
  X,
  FileText,
} from 'lucide-react';

export const ImportacaoMassiva: React.FC = () => {
  const { isAdmin } = useAuth();
  const { executarImportacaoMassiva, registros } = useData();

  // File & parsing state
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<Record<string, any>[] | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);

  // Execution state
  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [result, setResult] = useState<{
    totalRows: number;
    updatedRows: number;
    notFoundRows: { dc: string; rowData: any }[];
    updatedColumns: string[];
  } | null>(null);

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
    setResult(null);
    setDetectedColumns([]);
    setLoadingFile(true);

    try {
      const { sheetName: loadedSheet, data, detectedColumns: cols } = await readExcelFile(selectedFile);
      setSheetName(loadedSheet);

      if (data.length === 0) {
        throw new Error('A planilha selecionada está vazia.');
      }

      // Check if DC column is present
      const firstRow = data[0];
      const hasDC = Object.keys(firstRow).some((k) => k.trim().toUpperCase() === 'DC');
      if (!hasDC) {
        throw new Error(
          'Coluna "DC" não encontrada na planilha. A planilha de importação massiva deve conter a coluna "DC" para localização dos registros.'
        );
      }

      // Columns other than DC that will be modified
      const colsToUpdate = cols.filter((c) => c !== 'DC');
      if (colsToUpdate.length === 0) {
        // Fallback to any non-DC key present
        const extraKeys = Object.keys(firstRow).filter((k) => k.trim().toUpperCase() !== 'DC');
        setDetectedColumns(extraKeys);
      } else {
        setDetectedColumns(colsToUpdate);
      }

      setRawData(data);
    } catch (err: any) {
      setParseError(err.message || 'Erro ao ler arquivo Excel.');
      setRawData(null);
      setDetectedColumns([]);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleExecute = async () => {
    if (!rawData) return;
    if (!isAdmin) {
      setParseError('Você precisa de privilégios de Administrador para confirmar a importação massiva no banco de dados.');
      return;
    }
    setExecuting(true);
    setProgress(0);
    setProgressStep('Iniciando...');

    try {
      const importResult = await executarImportacaoMassiva(rawData, (pct, msg) => {
        setProgress(pct);
        setProgressStep(msg);
      });
      setResult(importResult);
    } catch (err: any) {
      console.error('Erro detalhado durante importação massiva:', {
        code: err?.code,
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        fullError: err,
      });
      setParseError('Falha durante a gravação massiva no Firestore: ' + (err?.message || 'Erro no banco de dados.'));
    } finally {
      setExecuting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setRawData(null);
    setDetectedColumns([]);
    setResult(null);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#002855]" />
            <h3 className="text-base font-bold text-slate-900">
              Importação Massiva — Acompanhamento (Colunas W a AF)
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Atualiza em lote os campos do <strong>Bloco 2</strong> (Status de Obra, Responsáveis, Pendências, Datas e Observações).
            Localiza cada linha pela coluna <strong>DC</strong> e atualiza apenas o registro correspondente, sem alterar a Base Matriz.
          </p>
        </div>

        <button
          onClick={downloadModeloImportacaoMassiva}
          className="shrink-0 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 shadow-2xs transition-colors flex items-center space-x-2 cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-600" />
          <span>Baixar Modelo Massivo (.xlsx)</span>
        </button>
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
      {!rawData && !result && (
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
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload-massiva"
          />

          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#002855]/5 border border-[#002855]/10 flex items-center justify-center text-[#002855]">
            {loadingFile ? (
              <RefreshCw className="w-7 h-7 animate-spin text-cyan-600" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <h4 className="text-sm font-bold text-slate-800">
            {loadingFile ? 'Lendo planilha massiva...' : 'Selecione ou arraste a planilha de Importação Massiva (.xlsx)'}
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Contendo a coluna &quot;DC&quot; e os 10 campos de acompanhamento (Bloco 2).
          </p>

          <div className="mt-5 flex justify-center gap-3">
            <label
              htmlFor="file-upload-massiva"
              className="px-5 py-2.5 bg-[#002855] hover:bg-[#001e40] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors inline-flex items-center space-x-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-cyan-300" />
              <span>Escolher Arquivo no Computador</span>
            </label>
          </div>

          {parseError && (
            <div className="mt-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 max-w-lg mx-auto flex items-start space-x-2 text-left">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}
        </div>
      )}

      {/* Confirmation & Execution Screen */}
      {rawData && !result && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-6">
          {/* Error Banner when execution or validation fails */}
          {parseError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start justify-between space-x-2 animate-in fade-in duration-200">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-red-800">Falha na Operação</h5>
                  <p className="mt-0.5">{parseError}</p>
                </div>
              </div>
              <button
                onClick={() => setParseError(null)}
                className="text-red-400 hover:text-red-600 p-1 rounded-md"
                title="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <span className="text-xs font-bold text-cyan-700 uppercase tracking-wide">
                Planilha Carregada
              </span>
              <h4 className="text-base font-extrabold text-slate-900">
                {file?.name} ({rawData.length} linhas lidas)
              </h4>
              <p className="text-xs text-slate-500">
                O sistema fará o cruzamento com as {registros.length} DCs cadastradas atualmente na base.
              </p>
            </div>

            <button
              onClick={handleReset}
              disabled={executing}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 self-start sm:self-auto"
            >
              Trocar de Arquivo
            </button>
          </div>

          {/* Colunas Reconhecidas */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">
                Colunas Identificadas para Atualização ({detectedColumns.length}):
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Reconhecimento inteligente por DC
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 bg-[#002855] text-cyan-300 font-bold rounded-lg text-xs border border-slate-700 shadow-2xs">
                DC (Chave de Localização)
              </span>
              {detectedColumns.map((col) => (
                <span
                  key={col}
                  className="px-2.5 py-1 bg-white text-slate-800 font-semibold rounded-lg text-xs border border-slate-200 shadow-2xs flex items-center space-x-1"
                >
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>{col}</span>
                </span>
              ))}
            </div>
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
                  className="bg-[#002855] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="flex items-center space-x-2 text-xs text-slate-600">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                As linhas com DCs inexistentes serão desconsideradas e relatadas ao final da gravação.
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleReset}
                disabled={executing}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>

              <button
                id="btn-confirm-import-massiva"
                onClick={handleExecute}
                disabled={executing}
                className="px-5 py-2.5 bg-[#002855] hover:bg-[#001e40] text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {executing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                    <span>Atualizando no Firestore...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Executar Importação Massiva</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result & Unlocated DCs Report */}
      {result && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-900">
                Importação Massiva Finalizada!
              </h4>
              <p className="text-xs text-slate-500">
                Resultado do processamento da planilha de acompanhamento.
              </p>
            </div>
          </div>

          {/* Result Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 block">Total de Linhas no Arquivo</span>
              <span className="text-xl font-extrabold text-slate-900 mt-1 block">{result.totalRows}</span>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-xs font-semibold text-emerald-700 block">DCs Atualizadas com Sucesso</span>
              <span className="text-xl font-extrabold text-emerald-800 mt-1 block">{result.updatedRows}</span>
            </div>

            <div
              className={`p-4 rounded-xl border ${
                result.notFoundRows.length > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span
                className={`text-xs font-semibold block ${
                  result.notFoundRows.length > 0 ? 'text-amber-700' : 'text-slate-500'
                }`}
              >
                DCs Não Encontradas (Ignoradas)
              </span>
              <span
                className={`text-xl font-extrabold mt-1 block ${
                  result.notFoundRows.length > 0 ? 'text-amber-800' : 'text-slate-900'
                }`}
              >
                {result.notFoundRows.length}
              </span>
            </div>
          </div>

          {/* Report of non-existent DCs if any */}
          {result.notFoundRows.length > 0 && (
            <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-amber-900">
                      Relatório de DCs Não Localizadas na Base ({result.notFoundRows.length})
                    </h5>
                    <p className="text-[11px] text-amber-700">
                      Estas linhas foram ignoradas durante a gravação pois os códigos de DC não constam no banco de dados.
                    </p>
                  </div>
                </div>

                <button
                  id="btn-download-nao-encontradas"
                  onClick={() => exportarRelatorioDcsNaoEncontradas(result.notFoundRows)}
                  className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-2 self-start sm:self-auto cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Relatório (.xlsx)</span>
                </button>
              </div>

              {/* Table of non-existent DCs */}
              <div className="border border-amber-200 bg-white rounded-lg overflow-x-auto max-h-56">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-100/70 text-amber-900 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 font-bold">#</th>
                      <th className="py-2 px-3 font-bold">DC Informada</th>
                      <th className="py-2 px-3 font-bold">Status Informe</th>
                      <th className="py-2 px-3 font-bold">Resp. Medição</th>
                      <th className="py-2 px-3 font-bold">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.notFoundRows.map((item, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/50">
                        <td className="py-1.5 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-bold text-amber-900">{item.dc}</td>
                        <td className="py-1.5 px-3 text-slate-600">
                          {item.rowData['Status Informe (Campo)'] || '—'}
                        </td>
                        <td className="py-1.5 px-3 text-slate-600">
                          {item.rowData['Resp.Medição'] || '—'}
                        </td>
                        <td className="py-1.5 px-3 text-slate-600">
                          {item.rowData['Responsavel'] || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reset / New Import Button */}
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-[#002855] hover:bg-[#001e40] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Fazer Nova Importação Massiva
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
