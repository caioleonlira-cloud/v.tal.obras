import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  readExcelFile,
  readCSVFileVivo,
  detectFileClient,
  downloadModeloImportacaoMassiva,
  downloadModeloImportacaoMassivaVivo,
  exportarRelatorioDcsNaoEncontradas,
  validarColunasSegmentadas,
  validarColunasSegmentadasVivo,
  verificarColunasLeituraMatriz,
  verificarColunasLeituraMatrizVivo,
  downloadCSVFile,
  escapeCSVCell,
} from '../../utils/excel';
import {
  BLOCO_1_KEYS,
  VIVO_BLOCO_1_KEYS,
  SegmentacaoDivergencia,
} from '../../types';
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
  Search,
  Ban,
  Lightbulb,
  Info,
} from 'lucide-react';

export const ImportacaoMassiva: React.FC = () => {
  const { isAdmin } = useAuth();
  const {
    executarImportacaoMassiva,
    executarImportacaoMassivaVivo,
    registros,
    registrosVivo,
    segmentacoes,
    segmentacoesVivo,
  } = useData();

  // File & parsing state
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<Record<string, any>[] | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [detectedClient, setDetectedClient] = useState<'VTAL' | 'VIVO' | null>(null);
  const [segmentacaoErrors, setSegmentacaoErrors] = useState<SegmentacaoDivergencia[]>([]);
  const [matrizError, setMatrizError] = useState<string | null>(null);
  const [matrizMissingColumns, setMatrizMissingColumns] = useState<string[]>([]);
  const [searchDivergencia, setSearchDivergencia] = useState<string>('');

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

  const exportarRelatorioDivergencias = () => {
    if (segmentacaoErrors.length === 0) return;
    const headers = [
      'Linha da Planilha',
      'Coluna',
      'Valor Informado',
      'Mensagem',
      'Sugestão Cadastrada',
    ];
    const headerLine = headers.map(escapeCSVCell).join(';');
    const dataLines = segmentacaoErrors.map((err) =>
      [
        `Linha ${err.linha}`,
        err.coluna,
        err.valorInformado,
        err.mensagem,
        err.sugestao || 'Nenhuma sugestão próxima',
      ]
        .map(escapeCSVCell)
        .join(';')
    );
    const csvContent = [headerLine, ...dataLines].join('\r\n') + '\r\n';
    const dataAtual = new Date().toISOString().split('T')[0];
    downloadCSVFile(csvContent, `Relatorio_Divergencias_Segmentacao_${detectedClient || 'CLIENTE'}_${dataAtual}.csv`);
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setMatrizError(null);
    setMatrizMissingColumns([]);
    setSegmentacaoErrors([]);
    setResult(null);
    setDetectedColumns([]);
    setDetectedClient(null);
    setLoadingFile(true);

    try {
      const client = await detectFileClient(selectedFile);
      if (client === 'UNKNOWN') {
        throw new Error(
          'Cliente não reconhecido. A planilha de importação massiva deve conter a coluna "DC" (para V.TAL) ou a coluna "ID" (para VIVO) para localização dos registros.'
        );
      }
      setDetectedClient(client);

      if (client === 'VTAL') {
        const { sheetName: loadedSheet, data, detectedColumns: cols } = await readExcelFile(selectedFile);
        setSheetName(loadedSheet);

        if (data.length === 0) {
          throw new Error('A planilha selecionada está vazia.');
        }

        const colsToUpdate = cols.filter((c) => c !== 'DC');
        if (colsToUpdate.length === 0) {
          const firstRow = data[0];
          const extraKeys = Object.keys(firstRow).filter((k) => k.trim().toUpperCase() !== 'DC' && k !== '_rowNumber');
          setDetectedColumns(extraKeys);
        } else {
          setDetectedColumns(colsToUpdate);
        }

        const matrizColsInFile = colsToUpdate.filter((c) => (BLOCO_1_KEYS as string[]).includes(c));
        if (matrizColsInFile.length > 0) {
          const checkMatriz = verificarColunasLeituraMatriz(cols);
          if (!checkMatriz.todasPresentes) {
            const errMatriz = `Não é possível atualizar os registros da matriz V.TAL: todas as 26 colunas de Leitura devem ser identificadas na planilha. Colunas ausentes:\n• ${checkMatriz.ausentes.join(
              '\n• '
            )}`;
            setMatrizMissingColumns(checkMatriz.ausentes);
            setMatrizError(errMatriz);
            setParseError(errMatriz);
            setRawData(null);
            return;
          }
        }
        setMatrizError(null);
        setMatrizMissingColumns([]);

        const divergencias = validarColunasSegmentadas(data, segmentacoes);
        if (divergencias.length > 0) {
          setSegmentacaoErrors(divergencias);
          setRawData(null);
          setParseError(
            `Importação massiva V.TAL bloqueada: Foram encontradas ${divergencias.length} divergência(s) nas colunas segmentadas. O upload está cancelado e nenhum dado foi gravado.`
          );
          return;
        }

        setSegmentacaoErrors([]);
        setRawData(data);
      } else {
        // VIVO
        const { sheetName: loadedSheet, data, detectedColumns: cols } = await readCSVFileVivo(selectedFile);
        setSheetName(loadedSheet);

        if (data.length === 0) {
          throw new Error('A planilha selecionada da VIVO está vazia.');
        }

        const colsToUpdate = cols.filter((c) => c !== 'ID');
        if (colsToUpdate.length === 0) {
          const firstRow = data[0];
          const extraKeys = Object.keys(firstRow).filter((k) => k.trim().toUpperCase() !== 'ID' && k !== '_rowNumber');
          setDetectedColumns(extraKeys);
        } else {
          setDetectedColumns(colsToUpdate);
        }

        const matrizColsInFile = colsToUpdate.filter((c) => (VIVO_BLOCO_1_KEYS as string[]).includes(c));
        if (matrizColsInFile.length > 0) {
          const checkMatriz = verificarColunasLeituraMatrizVivo(cols);
          if (!checkMatriz.todasPresentes) {
            const errMatriz = `Não é possível atualizar os registros da matriz VIVO: todas as 21 colunas de Leitura devem ser identificadas na planilha. Colunas ausentes:\n• ${checkMatriz.ausentes.join(
              '\n• '
            )}`;
            setMatrizMissingColumns(checkMatriz.ausentes);
            setMatrizError(errMatriz);
            setParseError(errMatriz);
            setRawData(null);
            return;
          }
        }
        setMatrizError(null);
        setMatrizMissingColumns([]);

        // Segmented columns validation for VIVO
        const divergencias = validarColunasSegmentadasVivo(data, segmentacoesVivo);
        if (divergencias.length > 0) {
          setSegmentacaoErrors(divergencias);
          setRawData(null);
          setParseError(
            `Importação massiva VIVO bloqueada: Foram encontradas ${divergencias.length} divergência(s) nas colunas segmentadas da VIVO. O upload está cancelado e nenhum dado foi gravado.`
          );
          return;
        }

        setSegmentacaoErrors([]);
        setRawData(data);
      }
    } catch (err: any) {
      setParseError(err.message || 'Erro ao processar arquivo.');
      setRawData(null);
      setDetectedColumns([]);
      setSegmentacaoErrors([]);
      setMatrizError(null);
      setMatrizMissingColumns([]);
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
    if (segmentacaoErrors.length > 0) {
      setParseError('Importação bloqueada: Corrija as divergências com a aba "Segmentações" antes de executar.');
      return;
    }
    if (matrizError) {
      setParseError(matrizError);
      return;
    }

    setExecuting(true);
    setProgress(0);
    setProgressStep('Iniciando...');

    try {
      if (detectedClient === 'VTAL') {
        const importResult = await executarImportacaoMassiva(rawData, (pct, msg) => {
          setProgress(pct);
          setProgressStep(msg);
        });
        setResult(importResult);
      } else {
        const importResult = await executarImportacaoMassivaVivo(rawData, (pct, msg) => {
          setProgress(pct);
          setProgressStep(msg);
        });
        setResult(importResult);
      }
    } catch (err: any) {
      console.error('Erro detalhado durante importação massiva:', err);
      const codePart = err?.code ? `[${err.code}] ` : '';
      const fullMsg = err?.message || 'Erro no banco de dados.';
      setParseError(`${codePart}${fullMsg}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setRawData(null);
    setDetectedColumns([]);
    setDetectedClient(null);
    setResult(null);
    setParseError(null);
    setSegmentacaoErrors([]);
    setMatrizError(null);
    setMatrizMissingColumns([]);
    setSearchDivergencia('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredDivergencias = useMemo(() => {
    if (!searchDivergencia.trim()) return segmentacaoErrors;
    const term = searchDivergencia.toLowerCase();
    return segmentacaoErrors.filter(
      (err) =>
        String(err.linha).includes(term) ||
        err.coluna.toLowerCase().includes(term) ||
        err.valorInformado.toLowerCase().includes(term) ||
        (err.sugestao && err.sugestao.toLowerCase().includes(term))
    );
  }, [segmentacaoErrors, searchDivergencia]);

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#002855]" />
            <h3 className="text-base font-bold text-slate-900">
              Importação Massiva — Acompanhamento (V.TAL e VIVO)
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Atualiza em lote os campos operacionais de equipe (Bloco 2).
            Localiza cada linha pela coluna <strong>DC</strong> (V.TAL) ou <strong>ID</strong> (VIVO) e atualiza apenas os registros correspondentes, sem alterar a Base Matriz.
          </p>
        </div>

        {/* Both template download buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={downloadModeloImportacaoMassiva}
            className="px-3.5 py-2.5 bg-[#002855] hover:bg-[#001e40] text-white rounded-xl text-xs font-bold border border-[#002855] shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Baixar modelo oficial V.TAL para atualização massiva do Bloco 2"
          >
            <Download className="w-4 h-4 text-cyan-300" />
            <span>Modelo Massivo — V.TAL</span>
          </button>

          <button
            onClick={downloadModeloImportacaoMassivaVivo}
            className="px-3.5 py-2.5 bg-[#002855] hover:bg-[#001e40] text-white rounded-xl text-xs font-bold border border-[#002855] shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Baixar modelo oficial VIVO para atualização massiva do Bloco 2"
          >
            <Download className="w-4 h-4 text-cyan-300" />
            <span>Modelo Massivo — VIVO</span>
          </button>
        </div>
      </div>

      {/* Template Instructions Card */}
      <div className="bg-gradient-to-r from-blue-50/70 to-slate-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start space-x-3">
          <FileSpreadsheet className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900 block">
              Detecção Inteligente de Cliente na Importação Massiva
            </span>
            <span className="text-slate-600 mt-0.5 block leading-relaxed">
              A planilha deve conter a coluna de chave primária <strong>DC</strong> (V.TAL) ou <strong>ID</strong> (VIVO), acompanhada das colunas de equipe que deseja atualizar. Os valores preenchidos nas colunas com validação de dados são rigorosamente comparados com as listas cadastradas na aba <strong>Segmentações</strong>.
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

      {/* 1) TELA DE ERRO: BLOQUEIO POR DIVERGÊNCIAS NA SEGMENTAÇÃO */}
      {segmentacaoErrors.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xs border border-rose-300 p-6 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-rose-200 gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0 mt-0.5">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-base font-extrabold text-rose-950">
                    Upload Bloqueado — Divergências na Segmentação ({detectedClient === 'VIVO' ? 'VIVO' : 'V.TAL'})
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-600 text-white">
                    {segmentacaoErrors.length} {segmentacaoErrors.length === 1 ? 'divergência' : 'divergências'}
                  </span>
                </div>
                <p className="text-xs text-rose-800 mt-1 max-w-3xl leading-relaxed">
                  <strong>Nenhum dado foi gravado no banco de dados.</strong> Para garantir a integridade do sistema, cada célula preenchida nas colunas segmentadas precisa existir na aba <strong>Segmentações</strong> <em>exatamente</em> como está cadastrada.
                </p>
                {file && (
                  <p className="text-xs text-slate-500 mt-1">
                    Arquivo analisado: <strong className="text-slate-800">{file.name}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                onClick={exportarRelatorioDivergencias}
                className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                title="Baixar lista completa de divergências para corrigir no Excel/CSV"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Relatório de Divergências (.csv)</span>
              </button>

              <button
                onClick={handleReset}
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Escolher Outro Arquivo</span>
              </button>
            </div>
          </div>

          {segmentacaoErrors.length > 5 && (
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar por linha, coluna ou valor..."
                value={searchDivergencia}
                onChange={(e) => setSearchDivergencia(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#002855]"
              />
            </div>
          )}

          <div className="border border-rose-200 bg-white rounded-xl overflow-x-auto max-h-96 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-rose-50 text-rose-950 sticky top-0 z-10 border-b border-rose-200">
                <tr>
                  <th className="py-2.5 px-3.5 font-bold w-24">Linha</th>
                  <th className="py-2.5 px-3.5 font-bold">Nome da Coluna</th>
                  <th className="py-2.5 px-3.5 font-bold">Valor Informado na Planilha</th>
                  <th className="py-2.5 px-3.5 font-bold">Mensagem</th>
                  <th className="py-2.5 px-3.5 font-bold">Sugestão Cadastrada (Mais Parecida)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100">
                {filteredDivergencias.map((err, idx) => (
                  <tr key={idx} className="hover:bg-rose-50/50 transition-colors">
                    <td className="py-2 px-3.5 font-bold text-rose-900 whitespace-nowrap">
                      Linha {err.linha}
                    </td>
                    <td className="py-2 px-3.5 font-semibold text-slate-800">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[11px] font-mono border border-slate-200">
                        {err.coluna}
                      </span>
                    </td>
                    <td className="py-2 px-3.5 font-mono text-rose-950 font-bold">
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-900 rounded border border-rose-300">
                        &quot;{err.valorInformado}&quot;
                      </span>
                    </td>
                    <td className="py-2 px-3.5 text-rose-800 font-medium">
                      {err.mensagem}
                    </td>
                    <td className="py-2 px-3.5">
                      {err.sugestao ? (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 font-bold text-[11px]">
                          <Lightbulb className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>&quot;{err.sugestao}&quot;</span>
                          <span className="text-[10px] text-emerald-700 font-normal">
                            (cadastrado)
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          Nenhum valor similar localizado
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Como prosseguir:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-amber-800">
                <li>Opção 1: Ajuste a grafia dos valores na sua planilha para corresponder exatamente à sugestão cadastrada e tente novamente.</li>
                <li>Opção 2: Se o novo valor informado for legítimo e você for Administrador, acesse a aba <strong>&quot;Segmentações&quot;</strong> (selecionando {detectedClient === 'VIVO' ? 'VIVO' : 'V.TAL'}), cadastre a nova opção na lista correspondente e realize o upload novamente.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 2) TELA DE ERRO: BLOQUEIO POR AUSÊNCIA DE COLUNAS DE LEITURA DA MATRIZ */}
      {matrizMissingColumns.length > 0 && segmentacaoErrors.length === 0 && (
        <div className="bg-white rounded-2xl shadow-xs border border-amber-300 p-6 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-amber-200 gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-base font-extrabold text-amber-950">
                    Atualização da Base Matriz Bloqueada
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-600 text-white">
                    {matrizMissingColumns.length} coluna(s) ausente(s)
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1 max-w-3xl leading-relaxed">
                  O sistema só pode atualizar os registros da matriz quando identificar corretamente todas as colunas de Leitura. A atualização é tudo ou nada.
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Escolher Outro Arquivo</span>
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 block">
              Colunas ausentes ou com nome divergente na planilha:
            </span>
            <div className="flex flex-wrap gap-2">
              {matrizMissingColumns.map((col) => (
                <span
                  key={col}
                  className="px-2.5 py-1 bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  <X className="w-3.5 h-3.5 text-amber-700" />
                  <span>{col}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      {!rawData && !result && segmentacaoErrors.length === 0 && matrizMissingColumns.length === 0 && (
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
            {loadingFile ? 'Lendo planilha massiva e identificando cliente...' : 'Selecione ou arraste a planilha de Importação Massiva (.csv)'}
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Contendo a coluna &quot;DC&quot; (V.TAL) ou &quot;ID&quot; (VIVO) e os campos operacionais de equipe (Bloco 2).
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
              <span className="whitespace-pre-wrap">{parseError}</span>
            </div>
          )}
        </div>
      )}

      {/* Confirmation & Execution Screen */}
      {rawData && !result && segmentacaoErrors.length === 0 && !matrizError && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-6 animate-in fade-in duration-200">
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

          {/* Client Identification Badge */}
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
                    ? `Base VIVO OBRAS — ${rawData.length} linhas lidas`
                    : `Base V.TAL OBRAS — ${rawData.length} linhas lidas`}
                </h4>
              </div>
            </div>

            <div className="text-xs font-medium">
              Chave de localização:{' '}
              <strong className="font-mono">{detectedClient === 'VIVO' ? 'ID' : 'DC'}</strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <span className="text-xs font-bold text-cyan-700 uppercase tracking-wide">
                Planilha Validada com Sucesso
              </span>
              <h4 className="text-base font-extrabold text-slate-900">
                {file?.name}
              </h4>
              <p className="text-xs text-slate-500">
                O cruzamento será realizado com as{' '}
                {detectedClient === 'VIVO' ? registrosVivo.length : registros.length} obras cadastradas na base.
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

          {/* Colunas Reconhecidas */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">
                Colunas Identificadas para Atualização ({detectedColumns.length}):
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Reconhecimento inteligente por {detectedClient === 'VIVO' ? 'ID' : 'DC'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span
                className="px-2.5 py-1 text-white font-bold rounded-lg text-xs border shadow-2xs bg-[#002855] border-slate-700"
              >
                {detectedClient === 'VIVO' ? 'ID (Chave de Localização)' : 'DC (Chave de Localização)'}
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
                  className="h-2.5 rounded-full transition-all duration-300 bg-[#002855]"
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
                As linhas com identificadores inexistentes serão desconsideradas e relatadas ao final da gravação.
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
                id="btn-confirm-import-massiva"
                onClick={handleExecute}
                disabled={executing}
                className="px-5 py-2.5 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50 bg-[#002855] hover:bg-[#001e40]"
              >
                {executing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                    <span>Atualizando no Firestore...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Executar Importação Massiva ({detectedClient === 'VIVO' ? 'VIVO' : 'V.TAL'})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result & Unlocated Report */}
      {result && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-900">
                Importação Massiva ({detectedClient === 'VIVO' ? 'VIVO' : 'V.TAL'}) Finalizada!
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
              <span className="text-xs font-semibold text-emerald-700 block">
                {detectedClient === 'VIVO' ? 'IDs Atualizados' : 'DCs Atualizadas'} com Sucesso
              </span>
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
                {detectedClient === 'VIVO' ? 'IDs Não Encontrados' : 'DCs Não Encontradas'} (Ignorados)
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

          {/* Report of non-existent IDs if any */}
          {result.notFoundRows.length > 0 && (
            <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-amber-900">
                      Relatório de {detectedClient === 'VIVO' ? 'IDs' : 'DCs'} Não Localizados na Base ({result.notFoundRows.length})
                    </h5>
                    <p className="text-[11px] text-amber-700">
                      Estas linhas foram ignoradas durante a gravação pois os códigos não constam no banco de dados.
                    </p>
                  </div>
                </div>

                <button
                  id="btn-download-nao-encontradas"
                  onClick={() => exportarRelatorioDcsNaoEncontradas(result.notFoundRows)}
                  className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-2 self-start sm:self-auto cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Relatório (.csv)</span>
                </button>
              </div>

              <div className="border border-amber-200 bg-white rounded-lg overflow-x-auto max-h-56">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-100/70 text-amber-900 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 font-bold">#</th>
                      <th className="py-2 px-3 font-bold">
                        {detectedClient === 'VIVO' ? 'ID Informado' : 'DC Informada'}
                      </th>
                      <th className="py-2 px-3 font-bold">
                        {detectedClient === 'VIVO' ? 'STATUS IMPL' : 'Status Informe'}
                      </th>
                      <th className="py-2 px-3 font-bold">
                        {detectedClient === 'VIVO' ? 'RESPONSÁVEL PENDENCIA' : 'Responsável'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.notFoundRows.map((item, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/50">
                        <td className="py-1.5 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-bold text-amber-900 font-mono">{item.dc}</td>
                        <td className="py-1.5 px-3 text-slate-600">
                          {item.rowData['STATUS IMPL'] || item.rowData['Status Informe (Campo)'] || '—'}
                        </td>
                        <td className="py-1.5 px-3 text-slate-600">
                          {item.rowData['RESPONSÁVEL PENDENCIA'] || item.rowData['Responsavel'] || '—'}
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
