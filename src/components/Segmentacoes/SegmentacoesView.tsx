import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { SegmentacaoKey, SegmentacaoVivoKey } from '../../types';
import {
  Settings2,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  RotateCcw,
  Search,
  CheckCircle2,
  ListPlus,
  Eraser,
} from 'lucide-react';

const LISTAS_VTAL_INFO: { key: SegmentacaoKey; titulo: string; desc: string }[] = [
  {
    key: 'STATUS DE OBRA',
    titulo: 'Status de Obra',
    desc: 'Alimenta o campo "Status Informe (Campo)"',
  },
  {
    key: 'Resp.Medição (Sul)',
    titulo: 'Resp. Medição',
    desc: 'Alimenta o campo "Resp.Medição"',
  },
  {
    key: 'RESP.',
    titulo: 'Responsável (Área / Célula)',
    desc: 'Alimenta o campo "Responsavel"',
  },
  {
    key: 'IMPLANTAÇÃO',
    titulo: 'Pendência: Implantação',
    desc: 'Alimenta o campo "Pendência (Implantação)"',
  },
  {
    key: 'CELULA SAP',
    titulo: 'Pendência: Célula SAP',
    desc: 'Alimenta o campo "Pendência (Celula Sap)"',
  },
  {
    key: 'PROJETOS',
    titulo: 'Pendência: Projetos',
    desc: 'Alimenta o campo "Pendência (Projetos)"',
  },
];

const LISTAS_VIVO_INFO: { key: SegmentacaoVivoKey; titulo: string; desc: string }[] = [
  {
    key: 'STATUS IMPL',
    titulo: 'Status Implantação (VIVO)',
    desc: 'Alimenta o campo "STATUS IMPL"',
  },
  {
    key: 'PENDENCIA',
    titulo: 'Pendência (VIVO)',
    desc: 'Alimenta o campo "PENDENCIA"',
  },
  {
    key: 'RESPONSÁVEL PENDENCIA',
    titulo: 'Responsável Pendência (VIVO)',
    desc: 'Alimenta o campo "RESPONSÁVEL PENDENCIA"',
  },
  {
    key: 'RESPONSÁVEL MEDIÇÃO',
    titulo: 'Responsável Medição (VIVO)',
    desc: 'Alimenta o campo "RESPONSÁVEL MEDIÇÃO"',
  },
];

export const SegmentacoesView: React.FC = () => {
  const { isAdmin } = useAuth();
  const {
    segmentacoes,
    addSegmentacaoOpcao,
    addMultiplasSegmentacaoOpcoes,
    editSegmentacaoOpcao,
    removeSegmentacaoOpcao,
    limparSegmentacao,
    reorderSegmentacaoOpcoes,
    restaurarSegmentacoesPadrao,

    // VIVO methods
    segmentacoesVivo,
    addSegmentacaoVivoOpcao,
    addMultiplasSegmentacaoVivoOpcoes,
    editSegmentacaoVivoOpcao,
    removeSegmentacaoVivoOpcao,
    limparSegmentacaoVivo,
    reorderSegmentacaoVivoOpcoes,
    subscribeVivoData,
  } = useData();

  // Active client toggle
  const [selectedClient, setSelectedClient] = useState<'VTAL' | 'VIVO'>('VTAL');

  // When client is VIVO, keep the Firestore sync alive
  useEffect(() => {
    if (selectedClient === 'VIVO') {
      const unsubscribe = subscribeVivoData();
      return () => {
        unsubscribe();
      };
    }
  }, [selectedClient, subscribeVivoData]);

  // Selected list keys
  const [selectedVtalKey, setSelectedVtalKey] = useState<SegmentacaoKey>('STATUS DE OBRA');
  const [selectedVivoKey, setSelectedVivoKey] = useState<SegmentacaoVivoKey>('STATUS IMPL');

  // UI state
  const [novoItemText, setNovoItemText] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulkMode, setShowBulkMode] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [searchItem, setSearchItem] = useState('');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="bg-white p-10 rounded-2xl shadow-xs border border-slate-200 text-center max-w-md mx-auto">
        <h3 className="text-base font-bold text-slate-800">Acesso Restrito</h3>
        <p className="text-xs text-slate-500 mt-1">
          Apenas administradores podem gerenciar as listas de segmentação.
        </p>
      </div>
    );
  }

  const currentOpcoes =
    selectedClient === 'VTAL'
      ? segmentacoes[selectedVtalKey] || []
      : segmentacoesVivo[selectedVivoKey] || [];

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItemText.trim()) return;
    try {
      if (selectedClient === 'VTAL') {
        await addSegmentacaoOpcao(selectedVtalKey, novoItemText.trim().toUpperCase());
      } else {
        await addSegmentacaoVivoOpcao(selectedVivoKey, novoItemText.trim().toUpperCase());
      }
      setNovoItemText('');
      showFeedback('Opção adicionada com sucesso!');
    } catch (err: any) {
      showFeedback('Erro ao adicionar opção: ' + err.message);
    }
  };

  const handleAddBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    const lines = bulkText
      .split(/[\n,;]+/)
      .map((l) => l.trim().toUpperCase())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    try {
      if (selectedClient === 'VTAL') {
        await addMultiplasSegmentacaoOpcoes(selectedVtalKey, lines);
      } else {
        await addMultiplasSegmentacaoVivoOpcoes(selectedVivoKey, lines);
      }
      setBulkText('');
      setShowBulkMode(false);
      showFeedback(`${lines.length} opções adicionadas com sucesso!`);
    } catch (err: any) {
      showFeedback('Erro ao adicionar opções em lote: ' + err.message);
    }
  };

  const handleClearAll = async () => {
    const listTitle =
      selectedClient === 'VTAL'
        ? LISTAS_VTAL_INFO.find((l) => l.key === selectedVtalKey)?.titulo || selectedVtalKey
        : LISTAS_VIVO_INFO.find((l) => l.key === selectedVivoKey)?.titulo || selectedVivoKey;

    if (
      !confirm(
        `ATENÇÃO: Deseja realmente LIMPAR TODOS os itens da lista "${listTitle}" (${selectedClient})?\n\nEsta ação removerá todas as ${currentOpcoes.length} opções cadastradas nesta lista.`
      )
    ) {
      return;
    }

    try {
      if (selectedClient === 'VTAL') {
        await limparSegmentacao(selectedVtalKey);
      } else {
        await limparSegmentacaoVivo(selectedVivoKey);
      }
      showFeedback(`A lista "${listTitle}" foi limpa com sucesso.`);
    } catch (err: any) {
      showFeedback('Erro ao limpar lista: ' + err.message);
    }
  };

  const handleStartEdit = (idx: number, valor: string) => {
    setEditingIndex(idx);
    setEditingText(valor);
  };

  const handleSaveEdit = async (idx: number) => {
    if (!editingText.trim()) return;
    try {
      if (selectedClient === 'VTAL') {
        await editSegmentacaoOpcao(selectedVtalKey, idx, editingText.trim().toUpperCase());
      } else {
        await editSegmentacaoVivoOpcao(selectedVivoKey, idx, editingText.trim().toUpperCase());
      }
      setEditingIndex(null);
      setEditingText('');
      showFeedback('Opção editada com sucesso!');
    } catch (err: any) {
      showFeedback('Erro ao editar: ' + err.message);
    }
  };

  const handleRemove = async (idx: number) => {
    if (!confirm('Deseja realmente remover esta opção da lista?')) return;
    try {
      if (selectedClient === 'VTAL') {
        await removeSegmentacaoOpcao(selectedVtalKey, idx);
      } else {
        await removeSegmentacaoVivoOpcao(selectedVivoKey, idx);
      }
      showFeedback('Opção removida!');
    } catch (err: any) {
      showFeedback('Erro ao remover: ' + err.message);
    }
  };

  const handleMove = async (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= currentOpcoes.length) return;
    const reordered = [...currentOpcoes];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    try {
      if (selectedClient === 'VTAL') {
        await reorderSegmentacaoOpcoes(selectedVtalKey, reordered);
      } else {
        await reorderSegmentacaoVivoOpcoes(selectedVivoKey, reordered);
      }
    } catch (err: any) {
      showFeedback('Erro ao reordenar: ' + err.message);
    }
  };

  const handleRestoreDefaults = async () => {
    if (
      !confirm(
        'Tem certeza que deseja restaurar as listas de segmentação da V.TAL para os valores padrão de fábrica?'
      )
    )
      return;
    try {
      await restaurarSegmentacoesPadrao();
      showFeedback('Listas da V.TAL restauradas com sucesso!');
    } catch (err: any) {
      showFeedback('Erro ao restaurar: ' + err.message);
    }
  };

  const showFeedback = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => setStatusFeedback(null), 3000);
  };

  const filteredOpcoes = currentOpcoes.filter((opt) =>
    opt.toLowerCase().includes(searchItem.toLowerCase())
  );

  const currentListTitle =
    selectedClient === 'VTAL'
      ? LISTAS_VTAL_INFO.find((l) => l.key === selectedVtalKey)?.titulo
      : LISTAS_VIVO_INFO.find((l) => l.key === selectedVivoKey)?.titulo;

  const currentListKey = selectedClient === 'VTAL' ? selectedVtalKey : selectedVivoKey;

  return (
    <div className="space-y-6">
      {/* Header Bar with Client Selector Toggle */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Settings2 className="w-5 h-5 text-[#002855]" />
            <h3 className="text-base font-bold text-slate-900">
              Gestão de Segmentações & Listas Suspensas
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Personalize as opções suspensas (dropdowns) utilizadas na equipe de acompanhamento de cada cliente.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start md:self-auto">
          {/* Client Toggle Selector */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => {
                setSelectedClient('VTAL');
                setEditingIndex(null);
                setSearchItem('');
                setShowBulkMode(false);
              }}
              className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                selectedClient === 'VTAL'
                  ? 'bg-[#002855] text-cyan-300 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              V.TAL (6 listas)
            </button>
            <button
              onClick={() => {
                setSelectedClient('VIVO');
                setEditingIndex(null);
                setSearchItem('');
                setShowBulkMode(false);
              }}
              className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                selectedClient === 'VIVO'
                  ? 'bg-[#002855] text-cyan-300 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              VIVO (4 listas)
            </button>
          </div>

          {selectedClient === 'VTAL' && (
            <button
              onClick={handleRestoreDefaults}
              className="px-3 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Restaurar listas da V.TAL para os padrões"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Restaurar V.TAL</span>
            </button>
          )}
        </div>
      </div>

      {statusFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusFeedback}</span>
        </div>
      )}

      {/* Main Grid: Left Side Navigation, Right Side Item Editor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Lists selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Listas de {selectedClient === 'VTAL' ? 'V.TAL' : 'VIVO'}
            </h4>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#002855]"
            >
              Cliente {selectedClient}
            </span>
          </div>

          {selectedClient === 'VTAL'
            ? LISTAS_VTAL_INFO.map((item) => {
                const isSelected = selectedVtalKey === item.key;
                const count = (segmentacoes[item.key] || []).length;
                return (
                  <div
                    key={item.key}
                    onClick={() => {
                      setSelectedVtalKey(item.key);
                      setEditingIndex(null);
                      setSearchItem('');
                      setShowBulkMode(false);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#002855] text-white border-[#002855] shadow-xs'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{item.titulo}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSelected
                            ? 'bg-cyan-400 text-[#002855]'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {count} opções
                      </span>
                    </div>
                    <p
                      className={`text-[11px] mt-1 truncate ${
                        isSelected ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      {item.desc}
                    </p>
                  </div>
                );
              })
            : LISTAS_VIVO_INFO.map((item) => {
                const isSelected = selectedVivoKey === item.key;
                const count = (segmentacoesVivo[item.key] || []).length;
                return (
                  <div
                    key={item.key}
                    onClick={() => {
                      setSelectedVivoKey(item.key);
                      setEditingIndex(null);
                      setSearchItem('');
                      setShowBulkMode(false);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#002855] text-white border-[#002855] shadow-xs'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{item.titulo}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSelected
                            ? 'bg-cyan-400 text-[#002855]'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {count} opções
                      </span>
                    </div>
                    <p
                      className={`text-[11px] mt-1 truncate ${
                        isSelected ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      {item.desc}
                    </p>
                  </div>
                );
              })}
        </div>

        {/* Right Column: Item Management */}
        <div className="md:col-span-2 bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-extrabold text-slate-900">
                  {currentListTitle}
                </h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-[#002855]">
                  {selectedClient}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chave no Firestore: <code className="font-mono">{currentListKey}</code> ({currentOpcoes.length} itens)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={currentOpcoes.length === 0}
                className="px-2.5 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Limpar todos os itens desta lista"
              >
                <Eraser className="w-3.5 h-3.5 text-red-600" />
                <span>Limpar Lista</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBulkMode(!showBulkMode)}
                className={`px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                  showBulkMode
                    ? 'bg-[#002855] text-cyan-300 border-[#002855]'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>{showBulkMode ? 'Modo Simples' : 'Adicionar Várias'}</span>
              </button>
            </div>
          </div>

          {/* Add Forms */}
          {showBulkMode ? (
            <form onSubmit={handleAddBulk} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <ListPlus className="w-4 h-4 text-[#002855]" />
                  <span>Adicionar Múltiplas Opções ({selectedClient})</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Cole várias linhas ou separe por vírgula / ponto e vírgula
                </span>
              </div>
              <textarea
                rows={4}
                placeholder="Exemplo:&#10;OPÇÃO 1&#10;OPÇÃO 2&#10;OPÇÃO 3&#10;OPÇÃO 4"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-[#002855] text-slate-900"
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBulkMode(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!bulkText.trim()}
                  className="px-4 py-1.5 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer bg-[#002855] hover:bg-[#001e40]"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Adicionar Todas as Opções</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAddSingle} className="flex gap-2">
              <input
                type="text"
                placeholder={`Digite o nome da nova opção para ${currentListTitle}...`}
                value={novoItemText}
                onChange={(e) => setNovoItemText(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002855] text-slate-900 uppercase"
              />
              <button
                type="submit"
                disabled={!novoItemText.trim()}
                className="px-4 py-2 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer bg-[#002855] hover:bg-[#001e40]"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </form>
          )}

          {/* Quick search inside list */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar itens nesta lista..."
              value={searchItem}
              onChange={(e) => setSearchItem(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#002855]"
            />
          </div>

          {/* List Options Table / Items List */}
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {filteredOpcoes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                {currentOpcoes.length === 0
                  ? `Nenhum item cadastrado nesta lista da ${selectedClient}. Adicione opções acima.`
                  : 'Nenhum item corresponde à pesquisa.'}
              </div>
            ) : (
              filteredOpcoes.map((opcao, filteredIdx) => {
                const originalIdx = currentOpcoes.indexOf(opcao);
                const isEditing = editingIndex === originalIdx;

                return (
                  <div
                    key={`${opcao}-${originalIdx}`}
                    className="p-2.5 sm:px-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors group"
                  >
                    <div className="flex-1 mr-3 flex items-center space-x-2.5">
                      <span className="w-5 text-[11px] font-bold text-slate-400 text-right shrink-0">
                        {originalIdx + 1}.
                      </span>

                      {isEditing ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="flex-1 px-2.5 py-1 bg-white border border-[#002855] rounded text-xs font-bold text-slate-900 uppercase"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(originalIdx)}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                            title="Salvar"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="p-1 rounded bg-slate-300 text-slate-700 hover:bg-slate-400 cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-800 break-all">
                          {opcao}
                        </span>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => handleMove(originalIdx, originalIdx - 1)}
                          disabled={originalIdx === 0}
                          title="Mover para cima"
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMove(originalIdx, originalIdx + 1)}
                          disabled={originalIdx === currentOpcoes.length - 1}
                          title="Mover para baixo"
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleStartEdit(originalIdx, opcao)}
                          title="Editar valor"
                          className="p-1 text-slate-500 hover:text-[#002855] hover:bg-slate-200 rounded ml-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleRemove(originalIdx)}
                          title="Excluir opção"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
