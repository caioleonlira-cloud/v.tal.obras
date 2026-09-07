import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserRole, INITIAL_ADMIN_EMAIL } from '../../types';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Edit2,
  Trash2,
  Lock,
  Mail,
  User,
  Check,
  X,
  AlertCircle,
  Search,
  CheckCircle2,
  LogOut,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';

export const UsuariosView: React.FC = () => {
  const {
    isAdmin,
    usersList,
    user: currentUser,
    createUser,
    updateUserStatus,
    updateUserRole,
    updateUserName,
    updateUserPassword,
    removeUser,
    logoutAllUsers,
  } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLogoutAllModalOpen, setIsLogoutAllModalOpen] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editPasswordValue, setEditPasswordValue] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // New User Form State
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('PADRAO');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="bg-white p-10 rounded-2xl shadow-xs border border-slate-200 text-center max-w-md mx-auto">
        <h3 className="text-base font-bold text-slate-800">Acesso Restrito</h3>
        <p className="text-xs text-slate-500 mt-1">
          Apenas administradores podem gerenciar os usuários do sistema.
        </p>
      </div>
    );
  }

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (newPassword.length < 6) {
      setFormError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setFormLoading(true);
    try {
      await createUser(newEmail, newPassword, newName, newRole);
      setIsCreateModalOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewRole('PADRAO');
      showFeedback('Usuário cadastrado com sucesso!');
    } catch (err: any) {
      setFormError(err.message || 'Erro ao cadastrar usuário.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setFormLoading(true);
    try {
      await updateUserName(editingUser.uid, editingUser.name);
      await updateUserRole(editingUser.uid, editingUser.role);
      await updateUserStatus(editingUser.uid, editingUser.status);
      if (editPasswordValue && editPasswordValue !== editingUser.password) {
        await updateUserPassword(editingUser.uid, editPasswordValue);
      }
      setEditingUser(null);
      showFeedback('Perfil e dados de acesso do usuário atualizados com sucesso!');
    } catch (err: any) {
      setFormError(err.message || 'Erro ao atualizar usuário.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (targetUser: UserProfile) => {
    if (targetUser.email.toLowerCase() === INITIAL_ADMIN_EMAIL.toLowerCase()) {
      alert('Não é possível desativar o administrador inicial do sistema.');
      return;
    }
    const newStatus = targetUser.status === 'active' ? 'inactive' : 'active';
    try {
      await updateUserStatus(targetUser.uid, newStatus);
      showFeedback(`Usuário ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message);
    }
  };

  const handleDeleteUser = async (targetUser: UserProfile) => {
    if (targetUser.email.toLowerCase() === INITIAL_ADMIN_EMAIL.toLowerCase()) {
      alert('Não é possível excluir o administrador inicial do sistema.');
      return;
    }
    if (!confirm(`Deseja realmente remover o usuário "${targetUser.name || targetUser.email}" do sistema?`)) {
      return;
    }
    try {
      await removeUser(targetUser.uid);
      showFeedback('Usuário removido da base de dados!');
    } catch (err: any) {
      alert('Erro ao remover usuário: ' + err.message);
    }
  };

  const handleConfirmLogoutAll = async () => {
    setLogoutAllLoading(true);
    try {
      await logoutAllUsers();
      setIsLogoutAllModalOpen(false);
      showFeedback('Comando enviado: Todas as sessões de usuários ativos foram invalidadas com sucesso!');
    } catch (err: any) {
      alert('Erro ao invalidar sessões: ' + (err.message || err));
    } finally {
      setLogoutAllLoading(false);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      u.role.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#002855]" />
            <h3 className="text-base font-bold text-slate-900">
              Gestão de Usuários e Permissões
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Cadastre e controle os acessos dos usuários com autenticação Firebase individual.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-logout-todos"
            type="button"
            onClick={() => setIsLogoutAllModalOpen(true)}
            className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center space-x-2 cursor-pointer"
            title="Desconecta imediatamente todos os usuários comuns logados"
          >
            <LogOut className="w-4 h-4 text-red-600" />
            <span>Deslogar Todos os Usuários</span>
          </button>

          <button
            id="btn-novo-usuario"
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#002855] hover:bg-[#001e40] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-cyan-300" />
            <span>Cadastrar Novo Usuário</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar usuário por nome, e-mail ou perfil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#002855]"
            />
          </div>

          <span className="text-xs font-semibold text-slate-600">
            Total cadastrados: <strong className="text-slate-900">{usersList.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#002855] text-white">
              <tr>
                <th className="py-3 px-4 font-bold">Nome Completo</th>
                <th className="py-3 px-4 font-bold">E-mail de Login</th>
                <th className="py-3 px-4 font-bold">Perfil de Acesso</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold">Data Cadastro</th>
                <th className="py-3 px-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.uid === currentUser?.uid;
                  const isSeedAdmin = u.email.toLowerCase() === INITIAL_ADMIN_EMAIL.toLowerCase();

                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-[#002855]/10 text-[#002855] flex items-center justify-center font-bold text-xs">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span>{u.name || 'Sem nome'}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-cyan-100 text-cyan-800 px-1.5 py-0.2 rounded font-bold">
                              Você
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-mono text-xs">
                        {u.email}
                      </td>

                      <td className="py-3 px-4">
                        {u.role === 'ADM' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <ShieldCheck className="w-3 h-3" />
                            <span>ADM (Total)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <UserCheck className="w-3 h-3" />
                            <span>Usuário Padrão (Leitura)</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isSeedAdmin}
                          title={isSeedAdmin ? 'Administrador padrão não pode ser alterado' : 'Clique para alternar status'}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                            u.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          } ${isSeedAdmin ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                        >
                          {u.status === 'active' ? '● Ativo' : '○ Inativo'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setEditingUser({ ...u });
                              setEditPasswordValue(u.password || '');
                              setShowEditPassword(false);
                            }}
                            className="p-1.5 text-slate-500 hover:text-[#002855] hover:bg-slate-100 rounded-lg transition-colors"
                            title="Editar usuário"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!isSeedAdmin && !isCurrent && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir usuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-[#002855] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm">Cadastrar Novo Usuário</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002855]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail corporativo (Login)
                </label>
                <input
                  type="email"
                  required
                  placeholder="usuario@telemontrms.com.br"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002855]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Senha Inicial (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002855]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Perfil de Acesso
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002855]"
                >
                  <option value="PADRAO">Usuário Padrão (Somente Leitura)</option>
                  <option value="ADM">ADM (Administrador - Acesso Total)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {newRole === 'ADM'
                    ? 'Pode editar registros, gerenciar listas, importar planilhas e criar usuários.'
                    : 'Pode visualizar, filtrar e exportar registros, sem permissão de edição.'}
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-[#002855] hover:bg-[#001e40] text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {formLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Cadastrar Usuário</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-[#002855] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm">Editar Usuário</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail de Login
                </label>
                <input
                  type="text"
                  disabled
                  value={editingUser.email}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Senha do Usuário
                  </label>
                  {editPasswordValue ? (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                      Senha disponível
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium border border-amber-200">
                      Sem senha registrada
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPasswordValue}
                    onChange={(e) => setEditPasswordValue(e.target.value)}
                    placeholder="Digite para ver ou redefinir a senha"
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002855] text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showEditPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Clique no ícone do olho para visualizar a senha. Se desejar alterá-la, basta digitar uma nova senha e clicar em Salvar.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002855]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Perfil de Acesso
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, role: e.target.value as UserRole })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002855]"
                >
                  <option value="PADRAO">Usuário Padrão (Somente Leitura)</option>
                  <option value="ADM">ADM (Administrador - Acesso Total)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status da Conta
                </label>
                <select
                  value={editingUser.status}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      status: e.target.value as 'active' | 'inactive',
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002855]"
                >
                  <option value="active">Ativo (Pode acessar)</option>
                  <option value="inactive">Inativo (Acesso bloqueado)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-[#002855] hover:bg-[#001e40] text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {formLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Deslogar Todos os Usuários */}
      {isLogoutAllModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4 border border-red-100">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Deslogar Todos os Usuários Ativos?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Esta ação irá <strong>invalidar imediatamente todas as sessões ativas</strong> de todos os usuários comuns no sistema. Eles serão desconectados em tempo real e redirecionados para a tela de login.
            </p>
            <p className="text-xs text-slate-500 mt-2 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              ℹ️ A sua própria sessão de administrador permanecerá ativa.
            </p>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsLogoutAllModalOpen(false)}
                disabled={logoutAllLoading}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLogoutAll}
                disabled={logoutAllLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50"
              >
                {logoutAllLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Confirmar e Deslogar Todos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
