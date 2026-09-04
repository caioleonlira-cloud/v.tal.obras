import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { SegmentacaoKey } from '../../types';
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
  AlertCircle,
  Sparkles,
  ListPlus,
  Eraser,
} from 'lucide-react';

const LISTAS_INFO: { key: SegmentacaoKey; titulo: string; desc: string }[] = [
  {
    key: 'STATUS DE OBRA',
    titulo: 'Status de Obra',
    desc: 'Alimenta o campo "Status Informe (Campo)"',
  },
  {
    key: 'Resp.Medição (Sul)',
    titulo: 'Resp. Medição (Sul)',
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
  } = useData();

  const [selectedListKey, setSelectedListKey] = useState<SegmentacaoKey>('STATUS DE OBRA');
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

  const currentOpcoes = segmentacoes[selectedListKey] || [];

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItemText.trim()) return;
    try {
      await addSegmentacaoOpcao(selectedListKey, novoItemText.trim().toUpperCase());
      setNovoItemText('');
      showFeedback('Opção adicionada com sucesso!');
    } catch (err: any) {
      showFeedback('Erro ao adicionar opção: ' + err.message);
    }
  };

  const handleAddBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    // Split by newlines, semicolons or commas
    const lines = bulkText
      .split(/[\n,;]+/)
      .map((l) => l.trim().toUpperCase())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    try {
      await addMultiplasSegmentacaoOpcoes(selectedListKey, lines);
      setBulkText('');
      setShowBulkMode(false);
      showFeedback(`${lines.length} opções adicionadas com sucesso!`);
    } catch (err: any) {
      showFeedback('Erro ao adicionar opções em lote: ' + err.message);
    }
  };

  const handleClearAll = async () => {
    const listTitle = LISTAS_INFO.find((l) => l.key === selectedListKey)?.titulo || selectedListKey;
    if (
      !confirm(
        `ATENÇÃO: Deseja realmente LIMPAR TODOS os itens da lista "${listTitle}"?\n\nEsta ação removerá todas as ${currentOpcoes.length} opções cadastradas nesta lista.`
      )
    ) {
      return;
    }

    try {
      await limparSegmentacao(selectedListKey);
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
      await editSegmentacaoOpcao(selectedListKey, idx, editingText.trim().toUpperCase());
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
      await removeSegmentacaoOpcao(selectedListKey, idx);
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
      await reorderSegmentacaoOpcoes(selectedListKey, reordered);
    } catch (err: any) {
      showFeedback('Erro ao reordenar: ' + err.message);
    }
  };

  const handleRestoreDefaults = async () => {
    if (
      !confirm(
        'Tem certeza que deseja restaurar as 6 listas de segmentação para os valores padrão de fábrica?'
      )
    )
      return;
    try {
      await restaurarSegmentacoesPadrao();
      showFeedback('Listas restauradas com sucesso!');
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

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Settings2 className="w-5 h-5 text-[#002855]" />
            <h3 className="text-base font-bold text-slate-900">
              Gestão de Segmentações & Listas Suspensas (Dropdowns)
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Personalize as opções disponíveis nos campos de acompanhamento (Bloco 2). Adicione individualmente ou cole múltiplos itens de uma só vez.
          </p>
        </div>

        <button
          onClick={handleRestoreDefaults}
          className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center space-x-1.5 self-start md:self-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Restaurar Valores Padrão</span>
        </button>
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
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Selecione a Lista para Gerenciar
          </h4>

          {LISTAS_INFO.map((item) => {
            const isSelected = selectedListKey === item.key;
            const count = (segmentacoes[item.key] || []).length;
            return (
              <div
                key={item.key}
                onClick={() => {
                  setSelectedListKey(item.key);
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
              <h4 className="text-sm font-extrabold text-slate-900">
                {LISTAS_INFO.find((l) => l.key === selectedListKey)?.titulo}
              </h4>
              <p className="text-xs text-slate-500">
                Lista oficial: <code>{selectedListKey}</code> ({currentOpcoes.length} itens)
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Button: Clear List */}
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

              {/* Toggle Bulk Mode */}
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
            /* Bulk Add Mode (Textarea) */
            <form onSubmit={handleAddBulk} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <ListPlus className="w-4 h-4 text-[#002855]" />
                  <span>Adicionar Múltiplas Opções (Lote)</span>
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
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#002855] text-slate-900"
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBulkMode(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!bulkText.trim()}
                  className="px-4 py-1.5 bg-[#002855] hover:bg-[#001e40] text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Adicionar Todas as Opções</span>
                </button>
              </div>
            </form>
          ) : (
            /* Single Add Form */
            <form onSubmit={handleAddSingle} className="flex gap-2">
              <input
                type="text"
                placeholder="Digite o nome da nova opção para adicionar..."
                value={novoItemText}
                onChange={(e) => setNovoItemText(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002855] text-slate-900 uppercase"
              />
              <button
                type="submit"
                disabled={!novoItemText.trim()}
                className="px-4 py-2 bg-[#002855] hover:bg-[#001e40] text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer"
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
              className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#002855]"
            />
          </div>

          {/* List Options Table / Items List */}
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {filteredOpcoes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                Nenhum item cadastrado nesta lista.
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
                    {/* Item Text / Edit Input */}
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

                    {/* Actions: Reorder, Edit, Delete */}
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

