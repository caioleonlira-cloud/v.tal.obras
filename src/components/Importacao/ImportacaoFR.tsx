import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  FileText,
  Loader2,
  HelpCircle,
  RefreshCw,
  CloudUpload,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '../../context/DataContext';
import { FR_COLUMNS, FRRegistro } from '../../types';
import { parseFRFile, ParseFRResult, formatCurrency, parseFRValor } from '../../utils/excel';

export const ImportacaoFR: React.FC = () => {
  const { frRegistros, importInfoFR, executarImportacaoFR, sincronizarFRLocalParaFirestore } = useData();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<ParseFRResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Replacement Confirmation Modal & Progress State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [executionSuccess, setExecutionSuccess] = useState<boolean>(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Online Cloud Synchronization State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgressPct, setSyncProgressPct] = useState<number>(0);
  const [syncProgressMsg, setSyncProgressMsg] = useState<string>('');
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Lock body scroll when confirm modal is open
  useEffect(() => {
    if (!showConfirmModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showConfirmModal]);

  // Template download
  const handleDownloadTemplate = () => {
    const headers = [...FR_COLUMNS];
    const sampleRow: Record<string, any> = {
      'UF': 'PR',
      'DC-M': 'DC-904120',
      'REG': 'SUL',
      'Mês': '08/2024',
      'CENTRO': 'CC-CURITIBA-01',
      'LOCALIDADE DE PRESTAÇÃO': 'CURITIBA',
      'DATA DA SOLICITAÇÃO': '15/08/2024',
      'DC MIGRADA/OPERAÇÃO': 'MIGRADA',
      'Nº MEDIÇÃO': 'MED-45120',
      'Nº PEDIDO': 'PED-89410',
      'ITEM DO PEDIDO': '10',
      'VALOR FR': 18450.5,
      'FR': 'FR-778901',
    };

    const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(16, h.length + 4) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo_FR');
    XLSX.writeFile(wb, 'Modelo_Importacao_FR.xlsx');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMsg(null);
    setParseResult(null);
    setExecutionSuccess(false);
    setExecutionError(null);
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

    setIsExecuting(true);
    setExecutionError(null);
    setProgressPct(0);
    setProgressMsg('Iniciando substituição da base de FR...');

    const res = await executarImportacaoFR(
      parseResult.data,
      selectedFile.name,
      (pct, msg) => {
        setProgressPct(pct);
        setProgressMsg(msg);
      }
    );

    setIsExecuting(false);
    if (res.erro) {
      setExecutionError(res.erro);
      setExecutionSuccess(false);
    } else {
      setExecutionSuccess(true);
      setShowConfirmModal(false);
      setSelectedFile(null);
      setParseResult(null);
    }
  };

  const handleSyncLocalToFirestore = async () => {
    if (frRegistros.length === 0) return;
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);
    setSyncProgressPct(0);
    setSyncProgressMsg('Iniciando sincronização da base com o Firebase...');

    const res = await sincronizarFRLocalParaFirestore((pct, msg) => {
      setSyncProgressPct(pct);
      setSyncProgressMsg(msg);
    });

    setIsSyncing(false);
    if (!res.success) {
      setSyncError(res.erro || 'Falha ao sincronizar com o Firebase.');
    } else {
      setSyncSuccess(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Informative Header & Last Import Badge */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-cyan-800">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Importação da Base de FR (Faturamento / Medição)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Substituição integral da base de FR a partir da planilha oficial com as 13 colunas obrigatórias.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Baixar planilha modelo com as 13 colunas estruturadas"
          >
            <Download className="w-4 h-4 text-cyan-700" />
            <span>Baixar Modelo FR (.xlsx)</span>
          </button>
        </div>

        {/* Last Import Info Card */}
        {importInfoFR ? (
          <div className="mt-5 p-3.5 bg-cyan-50/70 border border-cyan-200/80 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center space-x-2 text-cyan-950 font-medium">
              <Clock className="w-4 h-4 text-cyan-700 shrink-0" />
              <span>
                <strong>Última importação:</strong>{' '}
                {new Date(importInfoFR.importedAt).toLocaleDateString('pt-BR')} às{' '}
                {new Date(importInfoFR.importedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{' '}
                por <span className="underline">{importInfoFR.importedBy}</span> ({importInfoFR.totalLinhas} linhas)
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
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span>Nenhuma importação de FR registrada ainda. A base atual está vazia ou operando em cache local.</span>
          </div>
        )}
      </div>

      {/* Sincronização da Base Local com Firebase Firestore */}
      {frRegistros.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50/90 to-cyan-50/80 border border-blue-200/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-[#002855] text-white rounded-xl shadow-xs shrink-0">
                <CloudUpload className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Sincronização com o Banco de Dados Online (Firebase)</span>
                  <span className="bg-blue-100 text-blue-800 text-[10.5px] font-bold px-2 py-0.5 rounded-full border border-blue-300">
                    {frRegistros.length} registros locais
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Para que a tabela <strong>"FR's GERADAS"</strong> no Dashboard mostre os números para todos os usuários em qualquer computador, os dados devem estar gravados no Firebase. Clique abaixo para sincronizar a base atual com a nuvem.
                </p>
              </div>
            </div>

            <button
              onClick={handleSyncLocalToFirestore}
              disabled={isSyncing || isExecuting}
              className="px-4 py-2.5 bg-[#002855] hover:bg-[#003875] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2 shrink-0 cursor-pointer self-start md:self-auto"
              title="Gravar base de FR no Firebase para todos os usuários verem no Dashboard"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-cyan-300" />
                  <span>Gravar no Firebase Firestore</span>
                </>
              )}
            </button>
          </div>

          {/* Sync Progress / Feedback */}
          {isSyncing && (
            <div className="mt-4 pt-3 border-t border-blue-200/60">
              <div className="flex items-center justify-between text-xs text-slate-800 font-medium mb-1.5">
                <span>{syncProgressMsg || 'Sincronizando...'}</span>
                <span className="font-bold">{syncProgressPct}%</span>
              </div>
              <div className="w-full bg-blue-200/80 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#002855] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${syncProgressPct}%` }}
                />
              </div>
            </div>
          )}

          {syncSuccess && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Base de FR sincronizada com o Firebase com sucesso! A tabela "FR's GERADAS" no Dashboard já está disponível para todos os usuários em tempo real.</span>
            </div>
          )}

          {syncError && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{syncError}</span>
            </div>
          )}
        </div>
      )}

      {/* Rules & Requirements Checklist */}
      <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Regras de Validação e Formato da Planilha FR</span>
        </h4>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
          <div className="space-y-1.5">
            <p className="flex items-start space-x-2">
              <span className="text-amber-600 font-bold">•</span>
              <span><strong>13 colunas obrigatórias:</strong> UF, DC-M, REG, Mês, CENTRO, LOCALIDADE DE PRESTAÇÃO, DATA DA SOLICITAÇÃO, DC MIGRADA/OPERAÇÃO, Nº MEDIÇÃO, Nº PEDIDO, ITEM DO PEDIDO, VALOR FR, FR.</span>
            </p>
            <p className="flex items-start space-x-2">
              <span className="text-amber-600 font-bold">•</span>
              <span><strong>Tolerância de cabeçalho:</strong> Variações de maiúsculas/minúsculas, acentuação e espaçamento são reconhecidas automaticamente.</span>
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="flex items-start space-x-2">
              <span className="text-amber-600 font-bold">•</span>
              <span><strong>Substituição total:</strong> Toda nova importação substitui integralmente a base de FR anterior.</span>
            </p>
            <p className="flex items-start space-x-2">
              <span className="text-amber-600 font-bold">•</span>
              <span><strong>Datas e Moedas:</strong> A coluna DATA DA SOLICITAÇÃO é convertida para DD/MM/AAAA e VALOR FR para numérico formatado em BRL.</span>
            </p>
          </div>
        </div>
      </div>

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
            Formatos aceitos: Microsoft Excel (.xlsx, .xls) ou CSV (.csv)
          </p>
          <input
            id="file-upload-fr"
            type="file"
            accept=".xlsx, .xls, .csv"
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
                  Colunas ausentes na planilha: {parseResult.missingColumns.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Execution Error */}
        {executionError && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-3">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Ocorreu uma falha durante a gravação no banco de dados:</p>
              <p className="mt-1">{executionError}</p>
              <p className="mt-1 text-[11px] text-rose-700">A operação foi interrompida com segurança e não foi dada como concluída.</p>
            </div>
          </div>
        )}

        {/* Execution Success Message */}
        {executionSuccess && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Base de FR substituída com sucesso!</p>
              <p className="mt-1">
                Todas as linhas foram gravadas no Firestore e sincronizadas para todos os usuários em tempo real.
              </p>
            </div>
          </div>
        )}

        {/* Valid Parse Summary & Action */}
        {parseResult && parseResult.valid && (
          <div className="mt-6 border-t border-slate-200 pt-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Planilha validada com sucesso! Todas as 13 colunas estão corretas.</span>
              </div>
              <span className="text-xs font-bold text-slate-700">
                Total de linhas de dados: <strong className="text-cyan-900">{parseResult.totalRows}</strong>
              </span>
            </div>

            {/* Quick Preview Table (first 3 rows) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 flex items-center justify-between">
                <span>Prévia dos dados identificados (primeiras linhas):</span>
                <span className="text-[11px] font-normal text-slate-500">Total a importar: {parseResult.totalRows}</span>
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

            {/* Substitution Alert Box */}
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start space-x-3 text-xs text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-extrabold text-amber-950">Atenção: Substituição Integral da Base</strong>
                <p className="mt-0.5">
                  A confirmação desta importação irá <strong>apagar todas as {frRegistros.length} linhas atuais</strong> de FR e gravar <strong>{parseResult.totalRows} novas linhas</strong> da planilha selecionada.
                </p>
              </div>
            </div>

            {/* Trigger Confirmation Modal Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowConfirmModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-700 to-cyan-800 hover:from-cyan-800 hover:to-cyan-900 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Prosseguir para Confirmação de Substituição</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal &&
        parseResult &&
        createPortal(
          <div
            style={{ zIndex: 2000 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-base font-extrabold text-slate-900 text-center">
                Confirmar Substituição da Base de FR
              </h3>

              <p className="text-xs text-slate-600 text-center mt-2 leading-relaxed">
                Isso vai substituir as <strong className="text-rose-600">{frRegistros.length} linhas existentes</strong> por{' '}
                <strong className="text-emerald-600">{parseResult.totalRows} linhas novas</strong> da planilha{' '}
                <span className="font-mono font-bold text-slate-800">{selectedFile?.name}</span>.
              </p>

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
                    Gravando em lotes de até 200 registros no Firestore... Por favor não feche esta tela.
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
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Confirmar e Substituir Base</span>
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
