import React, { useState, useEffect } from 'react';
import { HistoricoEdicaoItem } from '../../types';
import { History, X, Clock, User, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { exportarRelatorioHistoricoParaExcel } from '../../utils/excel';
import { useData } from '../../context/DataContext';

interface HistoricoModalProps {
  dc: string;
  isOpen: boolean;
  onClose: () => void;
  historicoList?: HistoricoEdicaoItem[];
}

export const HistoricoModal: React.FC<HistoricoModalProps> = ({
  dc,
  isOpen,
  onClose,
  historicoList,
}) => {
  const { fetchHistoricoForDC } = useData();
  const [items, setItems] = useState<HistoricoEdicaoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && dc) {
      setLoading(true);
      fetchHistoricoForDC(dc)
        .then((fetched) => {
          if (!isMounted) return;
          if (historicoList && historicoList.length > 0) {
            const dcTarget = dc.toLowerCase().trim();
            const fromProp = historicoList.filter(
              (h) => (h.dc || '').toLowerCase().trim() === dcTarget
            );
            const seen = new Set<string>();
            const merged: HistoricoEdicaoItem[] = [];
            [...fetched, ...fromProp].forEach((item) => {
              const k = item.id || `hist_${item.dc}_${item.colunaEditada || item.coluna}_${item.timestamp}_${item.valorNovo}`;
              if (!seen.has(k)) {
                seen.add(k);
                merged.push(item);
              }
            });
            merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            setItems(merged);
          } else {
            setItems(fetched);
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      setItems([]);
      setLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, dc, fetchHistoricoForDC, historicoList]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#002855] px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <History className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Histórico de Edições — DC {dc}
              </h3>
              <p className="text-[11px] text-slate-300">
                Auditoria de alterações realizadas pela equipe nesta obra (busca sob demanda)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!loading && items.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  exportarRelatorioHistoricoParaExcel(
                    items,
                    `VTAL_Historico_DC_${dc.replace(/[^a-zA-Z0-9]/g, '_')}`
                  )
                }
                className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                title="Exportar histórico desta DC para Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
          {loading ? (
            <div className="py-14 text-center text-slate-500 bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#002855]" />
              <p className="font-semibold text-xs text-slate-700">
                Buscando histórico da obra DC {dc}...
              </p>
              <p className="text-[11px] text-slate-400">
                Consultando registros de auditoria otimizados sob demanda
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 p-6">
              <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-xs text-slate-700">
                Nenhuma alteração registrada para esta DC
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                As edições manuais feitas nas colunas da equipe ficam registradas aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={`${item.id || 'hist'}_${idx}`}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-2">
                    <div className="flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-[#002855]" />
                      <strong className="text-slate-800 font-semibold">
                        {item.userName || item.usuarioNome || item.userEmail || item.usuario || 'Usuário'}
                      </strong>
                      {item.userEmail && (
                        <span className="text-slate-400">({item.userEmail})</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{item.dataHora}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-600">Coluna editada: </span>
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded font-semibold text-[11px]">
                      {item.colunaEditada || item.coluna}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                        Valor Anterior
                      </span>
                      <span className="text-slate-600 line-through">
                        {item.valorAnterior || '— (Vazio)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-600 block text-[10px] font-bold uppercase tracking-wider">
                        Valor Novo
                      </span>
                      <span className="text-emerald-800 font-bold">
                        {item.valorNovo || '— (Vazio)'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-slate-500">
            Total de alterações registradas: <strong>{items.length}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#002855] hover:bg-[#001e40] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
