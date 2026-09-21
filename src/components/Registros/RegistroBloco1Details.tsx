import React, { useState } from 'react';
import { Registro, BLOCO_1_KEYS } from '../../types';
import { formatBRL, parseCurrencyValue } from '../../utils/currency';
import { Layers, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface RegistroBloco1DetailsProps {
  registro: Registro;
  copiedKey: string | null;
  copiedAll: boolean;
  handleCopyValue: (key: string, val: any) => void;
  handleCopyAllBloco1: () => void;
}

export const RegistroBloco1Details: React.FC<RegistroBloco1DetailsProps> = ({
  registro,
  copiedKey,
  copiedAll,
  handleCopyValue,
  handleCopyAllBloco1,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs transition-all">
      {/* Header Accordion - Clicar no título ou no cabeçalho expande/recolhe */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex flex-wrap items-center justify-between gap-1.5 cursor-pointer select-none group"
      >
        <div className="flex items-center space-x-1.5">
          <Layers className="w-3.5 h-3.5 text-[#007A87]" />
          <h4 className="fs-modal-block-title font-bold text-slate-900 group-hover:text-[#002855] transition-colors">
            Bloco 1 — Base Matriz (Importação Somente Leitura)
          </h4>
          <span className="fs-modal-caption text-slate-400 font-normal">
            (Colunas C a V)
          </span>
          <div className="text-slate-400 group-hover:text-slate-700 p-0.5 rounded transition-transform ml-0.5">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyAllBloco1();
          }}
          className="inline-flex items-center space-x-1 px-2 py-0.5 font-semibold fs-modal-btn rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
          title="Copiar todas as informações do Bloco 1 para a área de transferência"
        >
          {copiedAll ? (
            <>
              <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[2.5]" />
              <span className="text-emerald-700 font-bold">Todos Copiados!</span>
            </>
          ) : (
            <>
              <Copy className="w-2.5 h-2.5 text-slate-500" />
              <span>Copiar Todos os Dados</span>
            </>
          )}
        </button>
      </div>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="pt-2 mt-2 border-t border-slate-100 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 text-xs">
            {BLOCO_1_KEYS.map((key) => {
              const rawVal =
                key === 'TIPO (Carteira)'
                  ? (registro['TIPO (Carteira)'] || (registro as any)['TIPO (Cateira)'])
                  : key === 'Plan. Estruturante'
                  ? (registro['Plan. Estruturante'] || (registro as any)['Backlog/Input?'])
                  : (registro as any)[key];
              const isCurrency = [
                'Orçamento',
                'Valor Parcial R$',
                'Valor Final R$',
                'Valor Faturado',
                'Saldo',
              ].includes(key);
              const displayVal = isCurrency
                ? (rawVal !== undefined && rawVal !== null && rawVal !== '' ? formatBRL(parseCurrencyValue(rawVal)) : '—')
                : (rawVal || '—');
              const copyVal = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';
              const isCopied = copiedKey === key;
              const labelText =
                (key as string) === 'Backlog/Input?' || key === 'Plan. Estruturante'
                  ? 'Plan. Estruturante'
                  : (key as string) === 'TIPO (Cateira)' || key === 'TIPO (Carteira)'
                  ? 'TIPO (Carteira)'
                  : key;

              return (
                <div
                  key={key}
                  className="bg-slate-50/80 hover:bg-slate-100 p-1.5 rounded-md border border-slate-200/80 transition-colors flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className="block font-bold text-slate-500 uppercase tracking-tight truncate text-[9px]"
                        title={labelText}
                      >
                        {labelText}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyValue(key, copyVal || displayVal);
                        }}
                        className="p-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-[#002855] transition-colors cursor-pointer shrink-0 shadow-2xs"
                        title={`Copiar valor de ${labelText}`}
                      >
                        {isCopied ? (
                          <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[2.5]" />
                        ) : (
                          <Copy className="w-2.5 h-2.5" />
                        )}
                      </button>
                    </div>
                    <span
                      className={`block fs-modal-input font-semibold truncate ${isCurrency ? 'text-[#002855] tabular-nums font-bold' : 'text-slate-800'}`}
                      title={displayVal}
                    >
                      {displayVal}
                    </span>
                  </div>

                  {isCopied && (
                    <span className="text-[9px] font-bold text-emerald-600 mt-0.5 animate-in fade-in flex items-center space-x-1">
                      <Check className="w-2.5 h-2.5" />
                      <span>Copiado!</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
