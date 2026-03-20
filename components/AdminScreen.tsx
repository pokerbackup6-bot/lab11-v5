import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase.ts';
import { supabaseAdmin } from '../utils/supabaseAdmin.ts';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  is_admin: boolean;
  created_at: string;
}

interface AdminScreenProps {
  onBack: () => void;
  onManageScenarios: () => void;
  onMigrate: () => Promise<{ success: boolean; count: number; error?: string }>;
}

const AdminScreen: React.FC<AdminScreenProps> = ({ onBack, onManageScenarios, onMigrate }) => {
  const [tab, setTab] = useState<'users' | 'scenarios'>('users');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Criar usuário
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createIsAdmin, setCreateIsAdmin] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Migração de cenários
  const [migrateLoading, setMigrateLoading] = useState(false);

  // Trocar senha
  const [changingPasswordId, setChangingPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Deletar
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (tab === 'users') fetchProfiles();
  }, [tab]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setError('');
    setTimeout(() => setSuccess(''), 2500);
  };

  const showError = (msg: string) => {
    setError(msg);
    setSuccess('');
  };

  const fetchProfiles = async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProfiles(data);
    if (err) showError('Erro ao carregar usuários.');
    setLoading(false);
  };

  const toggleAdmin = async (id: string, current: boolean) => {
    const { error: err } = await supabase
      .from('profiles')
      .update({ is_admin: !current })
      .eq('id', id);
    if (!err) {
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, is_admin: !current } : p));
      showSuccess('Permissão atualizada!');
    } else {
      showError('Erro ao atualizar permissão.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail || !createPassword) return;
    setCreateLoading(true);
    setError('');

    const { data, error: err } = await supabaseAdmin.auth.admin.createUser({
      email: createEmail.toLowerCase(),
      password: createPassword,
      email_confirm: true,
      user_metadata: { full_name: createName },
    });

    if (err || !data.user) {
      showError(err?.message || 'Erro ao criar usuário.');
      setCreateLoading(false);
      return;
    }

    // Atualiza profile com nome e is_admin
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email: createEmail.toLowerCase(),
      full_name: createName || createEmail.split('@')[0].toUpperCase(),
      is_admin: createIsAdmin,
    });

    showSuccess(`Usuário ${createEmail} criado!`);
    setCreateEmail('');
    setCreateName('');
    setCreatePassword('');
    setCreateIsAdmin(false);
    setShowCreate(false);
    setCreateLoading(false);
    fetchProfiles();
  };

  const handleChangePassword = async (id: string) => {
    if (!newPassword || newPassword.length < 6) {
      showError('Senha deve ter ao menos 6 caracteres.');
      return;
    }
    setPasswordLoading(true);
    const { error: err } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: newPassword,
    });
    if (!err) {
      showSuccess('Senha alterada!');
      setChangingPasswordId(null);
      setNewPassword('');
    } else {
      showError('Erro ao alterar senha.');
    }
    setPasswordLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    const { error: err } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (!err) {
      setProfiles(prev => prev.filter(p => p.id !== id));
      showSuccess('Usuário excluído.');
      setDeletingId(null);
    } else {
      showError('Erro ao excluir usuário.');
    }
    setDeleteLoading(false);
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-white text-sm font-bold outline-none focus:border-sky-500/50 transition-all placeholder:text-gray-700";

  return (
    <div className="h-screen overflow-y-auto bg-[#050505] text-white">
      {/* Header fixo */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/95 backdrop-blur border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter text-white">Painel Admin</h1>
          <p className="text-[10px] text-sky-500 font-black uppercase tracking-[0.3em]">LAB11</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all"
        >
          ← Voltar
        </button>
      </div>

      <div className="pt-24 pb-16 px-8 max-w-3xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 mb-8">
          <button
            onClick={() => setTab('users')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${tab === 'users' ? 'bg-sky-600/20 text-sky-400 shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Usuários
          </button>
          <button
            onClick={() => setTab('scenarios')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${tab === 'scenarios' ? 'bg-emerald-600/20 text-emerald-400 shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Cenários
          </button>
        </div>

        {/* Feedback */}
        {success && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-center text-xs font-black uppercase tracking-widest animate-in zoom-in">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-center text-xs font-black uppercase tracking-widest">
            {error}
          </div>
        )}

        {/* TAB: USUÁRIOS */}
        {tab === 'users' && (
          <div className="space-y-3 animate-in fade-in duration-300">
            {/* Barra topo: contador + botão novo */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                {profiles.length} usuário{profiles.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => { setShowCreate(!showCreate); setError(''); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${showCreate ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-sky-600/20 text-sky-400 border-sky-500/20 hover:bg-sky-600/30'}`}
              >
                {showCreate ? '✕ Cancelar' : '+ Novo Usuário'}
              </button>
            </div>

            {/* Formulário criar usuário */}
            {showCreate && (
              <form
                onSubmit={handleCreate}
                className="p-6 bg-white/5 border border-sky-500/20 rounded-3xl space-y-4 animate-in slide-in-from-top-2 duration-300 mb-4"
              >
                <h3 className="text-[10px] text-sky-400 font-black uppercase tracking-widest mb-2">Cadastrar Novo Usuário</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    placeholder="Nome (opcional)"
                    className={inputClass}
                  />
                  <input
                    type="email"
                    value={createEmail}
                    onChange={e => setCreateEmail(e.target.value)}
                    placeholder="E-mail"
                    className={inputClass}
                    required
                  />
                </div>
                <input
                  type="password"
                  value={createPassword}
                  onChange={e => setCreatePassword(e.target.value)}
                  placeholder="Senha (mín. 6 caracteres)"
                  className={inputClass}
                  required
                  minLength={6}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setCreateIsAdmin(!createIsAdmin)}
                      className={`w-10 h-6 rounded-full border transition-all relative ${createIsAdmin ? 'bg-emerald-600/40 border-emerald-500/50' : 'bg-white/5 border-white/10'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${createIsAdmin ? 'left-4 bg-emerald-400' : 'left-0.5 bg-gray-600'}`} />
                    </div>
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                      Perfil Admin
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-6 py-3 bg-sky-600 hover:bg-sky-500 border border-sky-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-50"
                  >
                    {createLoading ? 'Cadastrando...' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            )}

            {/* Lista de usuários */}
            {loading ? (
              <div className="text-center py-20 text-gray-600 font-black uppercase tracking-[0.3em] text-[10px]">
                Carregando...
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-20 text-gray-600 font-black uppercase tracking-[0.3em] text-[10px]">
                Nenhum usuário encontrado
              </div>
            ) : (
              profiles.map(p => (
                <div key={p.id} className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden transition-all hover:border-white/10">
                  {/* Linha principal */}
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 font-black text-xs uppercase shrink-0">
                        {(p.full_name || p.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-bold text-sm">{p.full_name || '—'}</span>
                          {p.is_admin && (
                            <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-[10px] font-bold truncate">
                          {p.email || p.id.slice(0, 16) + '...'}
                        </p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {/* Toggle admin */}
                      <button
                        onClick={() => toggleAdmin(p.id, p.is_admin)}
                        title={p.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                        className={`p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${p.is_admin ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400 border-emerald-500/20 hover:border-red-500/20' : 'bg-white/5 text-gray-500 hover:bg-emerald-500/10 hover:text-emerald-400 border-white/10'}`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      {/* Trocar senha */}
                      <button
                        onClick={() => {
                          setChangingPasswordId(changingPasswordId === p.id ? null : p.id);
                          setDeletingId(null);
                          setNewPassword('');
                        }}
                        title="Trocar senha"
                        className={`p-2.5 rounded-xl transition-all border ${changingPasswordId === p.id ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'bg-white/5 text-gray-500 hover:bg-sky-500/10 hover:text-sky-400 border-white/10'}`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
                        </svg>
                      </button>

                      {/* Deletar */}
                      <button
                        onClick={() => {
                          setDeletingId(deletingId === p.id ? null : p.id);
                          setChangingPasswordId(null);
                          setNewPassword('');
                        }}
                        title="Excluir usuário"
                        className={`p-2.5 rounded-xl transition-all border ${deletingId === p.id ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 border-white/10'}`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Painel: trocar senha */}
                  {changingPasswordId === p.id && (
                    <div className="px-5 pb-5 animate-in slide-in-from-top-1 duration-200">
                      <div className="flex gap-3 items-center bg-black/30 border border-sky-500/10 rounded-2xl p-4">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Nova senha (mín. 6 caracteres)"
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm font-bold outline-none focus:border-sky-500/50 transition-all placeholder:text-gray-700"
                          minLength={6}
                        />
                        <button
                          onClick={() => handleChangePassword(p.id)}
                          disabled={passwordLoading || !newPassword}
                          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 border border-sky-400 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-50 shrink-0"
                        >
                          {passwordLoading ? '...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => { setChangingPasswordId(null); setNewPassword(''); }}
                          className="px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 transition-all shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Painel: confirmar exclusão */}
                  {deletingId === p.id && (
                    <div className="px-5 pb-5 animate-in slide-in-from-top-1 duration-200">
                      <div className="flex gap-3 items-center justify-between bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                        <span className="text-red-400 text-xs font-black uppercase tracking-widest">
                          Excluir permanentemente?
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deleteLoading}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 border border-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-50"
                          >
                            {deleteLoading ? '...' : 'Excluir'}
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB: CENÁRIOS */}
        {tab === 'scenarios' && (
          <div className="animate-in fade-in duration-300 space-y-4">
            {/* Gerenciar cenários */}
            <div className="p-8 bg-white/5 border border-white/5 rounded-3xl text-center space-y-3">
              <h3 className="text-white font-black uppercase tracking-tighter">Gerenciar Cenários</h3>
              <p className="text-gray-500 text-xs font-bold leading-relaxed max-w-xs mx-auto">
                Crie, edite e exclua os cenários de treinamento.
              </p>
              <button
                onClick={onManageScenarios}
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95"
              >
                Abrir Gerenciador
              </button>
            </div>

            {/* Migrar do navegador */}
            <div className="p-8 bg-sky-500/5 border border-sky-500/20 rounded-3xl space-y-3">
              <h3 className="text-sky-400 font-black uppercase tracking-tighter text-sm">Migrar do Navegador → Banco de Dados</h3>
              <p className="text-gray-500 text-xs font-bold leading-relaxed">
                Lê os cenários salvos no <span className="text-gray-300">localStorage</span> deste navegador e os envia para o Supabase, substituindo os cenários existentes no banco.
              </p>
              <button
                onClick={async () => {
                  setMigrateLoading(true);
                  const result = await onMigrate();
                  setMigrateLoading(false);
                  if (result.success) {
                    showSuccess(`${result.count} cenários migrados com sucesso!`);
                  } else {
                    showError(`Erro na migração: ${result.error}`);
                  }
                }}
                disabled={migrateLoading}
                className="px-8 py-4 bg-sky-600 hover:bg-sky-500 border border-sky-400 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white transition-all active:scale-95 disabled:opacity-50"
              >
                {migrateLoading ? 'Migrando...' : 'Migrar Cenários'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminScreen;
