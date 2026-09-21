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
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs transition-all">
      {/* Header Accordion - Clicar no título ou no cabeçalho expande/recolhe */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none group"
      >
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[#007A87]" />
          <h4 className="text-[14.5px] font-bold text-slate-900 group-hover:text-[#002855] transition-colors">
            Bloco 1 — Base Matriz (Importação Somente Leitura)
          </h4>
          <span className="text-xs text-slate-400 font-normal">
            (Colunas C a V)
          </span>
          <div className="text-slate-400 group-hover:text-slate-700 p-0.5 rounded transition-transform ml-1">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyAllBloco1();
          }}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 font-semibold text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
          title="Copiar todas as informações do Bloco 1 para a área de transferência"
        >
          {copiedAll ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              <span className="text-emerald-700 font-bold">Todos Copiados!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Copiar Todos os Dados</span>
            </>
          )}
        </button>
      </div>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="pt-3.5 mt-3.5 border-t border-slate-100 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
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
                  className="bg-slate-50/80 hover:bg-slate-100 p-2 rounded-lg border border-slate-200/80 transition-colors flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className="block font-bold text-slate-500 uppercase tracking-tight truncate text-[10.5px]"
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
                        className="p-1 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-[#002855] transition-colors cursor-pointer shrink-0 shadow-2xs"
                        title={`Copiar valor de ${labelText}`}
                      >
                        {isCopied ? (
                          <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <span
                      className={`block font-semibold truncate ${isCurrency ? 'text-[#002855] tabular-nums font-bold' : 'text-slate-800'}`}
                      title={displayVal}
                    >
                      {displayVal}
                    </span>
                  </div>

                  {isCopied && (
                    <span className="text-[10px] font-bold text-emerald-600 mt-1 animate-in fade-in flex items-center space-x-1">
                      <Check className="w-3 h-3" />
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
