import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase.ts';
import { supabaseAdmin } from '../utils/supabaseAdmin.ts';
import AdManager from './AdManager.tsx';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  is_admin: boolean;
  is_active: boolean;
  subscription_status: string | null;
  access_expires_at: string | null;
  created_at: string;
}

interface AdminScreenProps {
  onBack: () => void;
  onManageScenarios: () => void;
  onMigrate: () => Promise<{ success: boolean; count: number; error?: string }>;
  onManageContent: () => void;
  onViewVersionHistory?: () => void;
}

const AdminScreen: React.FC<AdminScreenProps> = ({ onBack, onManageScenarios, onMigrate, onManageContent, onViewVersionHistory }) => {
  const [tab, setTab] = useState<'users' | 'scenarios' | 'content' | 'ads'>('users');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Busca
  const [searchQuery, setSearchQuery] = useState('');

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

  // Extensão de acesso
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extendLoading, setExtendLoading] = useState(false);
  const [customExpireDate, setCustomExpireDate] = useState('');

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

  // Filtra localmente por email ou nome
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const q = searchQuery.toLowerCase().trim();
    return profiles.filter(
      p =>
        (p.email ?? '').toLowerCase().includes(q) ||
        (p.full_name ?? '').toLowerCase().includes(q),
    );
  }, [profiles, searchQuery]);

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

  const toggleActive = async (id: string, current: boolean) => {
    const newActive = !current;
    const { error: err } = await supabaseAdmin
      .from('profiles')
      .update({
        is_active: newActive,
        subscription_status: newActive ? 'manual' : 'canceled',
      })
      .eq('id', id);
    if (!err) {
      setProfiles(prev =>
        prev.map(p =>
          p.id === id
            ? { ...p, is_active: newActive, subscription_status: newActive ? 'manual' : 'canceled' }
            : p,
        ),
      );
      showSuccess(newActive ? 'Acesso ativado!' : 'Acesso desativado.');
    } else {
      showError('Erro ao alterar status de acesso.');
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

    // Cria/atualiza profile com is_active=true e subscription_status='manual'
    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
      id: data.user.id,
      email: createEmail.toLowerCase(),
      full_name: createName || createEmail.split('@')[0].toUpperCase(),
      is_admin: createIsAdmin,
      is_active: true,
      subscription_status: 'manual',
    });

    if (profileErr) {
      showError(`Usuário criado no Auth, mas erro ao salvar perfil: ${profileErr.message}`);
      setCreateLoading(false);
      return;
    }

    showSuccess(`Usuário ${createEmail} criado e ativado!`);
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
      email_confirm: true,
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

  const handleExtendAccess = async (id: string, days: number | null, customDate?: string) => {
    setExtendLoading(true);

    let expiresAt: string;
    if (customDate) {
      expiresAt = new Date(customDate).toISOString();
    } else if (days !== null) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      expiresAt = d.toISOString();
    } else {
      setExtendLoading(false);
      return;
    }

    const { error: err } = await supabaseAdmin
      .from('profiles')
      .update({
        is_active: true,
        subscription_status: 'manual',
        access_expires_at: expiresAt,
      })
      .eq('id', id);

    if (!err) {
      setProfiles(prev =>
        prev.map(p =>
          p.id === id
            ? { ...p, is_active: true, subscription_status: 'manual', access_expires_at: expiresAt }
            : p,
        ),
      );
      showSuccess('Acesso estendido com sucesso!');
      setExtendingId(null);
      setCustomExpireDate('');
    } else {
      showError('Erro ao estender acesso.');
    }
    setExtendLoading(false);
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

  const closeAllPanels = () => {
    setChangingPasswordId(null);
    setExtendingId(null);
    setDeletingId(null);
    setNewPassword('');
    setCustomExpireDate('');
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const isExpired = (iso: string | null) => {
    if (!iso) return false;
    return new Date(iso) < new Date();
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-white text-sm font-bold outline-none focus:border-sky-500/50 transition-all placeholder:text-gray-700';

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
          <button
            onClick={() => setTab('content')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${tab === 'content' ? 'bg-violet-600/20 text-violet-400 shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Conteúdos
          </button>
          <button
            onClick={() => setTab('ads')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${tab === 'ads' ? 'bg-amber-600/20 text-amber-400 shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Publicidade
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
            {/* Barra topo: busca + contador + botão novo */}
            <div className="flex flex-col gap-3 mb-2">
              {/* Campo de busca */}
              <div className="relative">
                <svg
                  width="14" height="14"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar por email ou nome..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-5 text-white text-sm font-bold outline-none focus:border-sky-500/50 transition-all placeholder:text-gray-700"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                  {filteredProfiles.length} / {profiles.length} usuário{profiles.length !== 1 ? 's' : ''}
                  {searchQuery && <span className="text-sky-600 ml-1">(filtrado)</span>}
                </span>
                <button
                  onClick={() => { setShowCreate(!showCreate); setError(''); }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${showCreate ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-sky-600/20 text-sky-400 border-sky-500/20 hover:bg-sky-600/30'}`}
                >
                  {showCreate ? '✕ Cancelar' : '+ Novo Usuário'}
                </button>
              </div>
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
                {/* Info: será criado como ativo */}
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">
                    Usuário será criado com acesso ativo (status: Manual)
                  </span>
                </div>
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
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-20 text-gray-600 font-black uppercase tracking-[0.3em] text-[10px]">
                {searchQuery ? 'Nenhum usuário encontrado para esta busca' : 'Nenhum usuário cadastrado'}
              </div>
            ) : (
              filteredProfiles.map(p => (
                <div key={p.id} className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden transition-all hover:border-white/10">
                  {/* Linha principal */}
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs uppercase shrink-0 ${p.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
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
                          {/* Badge de status ativo/inativo */}
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${p.is_active ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {p.is_active ? '● Ativo' : '○ Inativo'}
                          </span>
                          {/* Badge de expiração */}
                          {p.access_expires_at && (
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${isExpired(p.access_expires_at) ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                              {isExpired(p.access_expires_at) ? '⚠ Expirado' : `⏱ ${formatDate(p.access_expires_at)}`}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-[10px] font-bold truncate">
                          {p.email || p.id.slice(0, 16) + '...'}
                        </p>
                        {p.subscription_status && (
                          <p className="text-gray-700 text-[9px] font-black uppercase tracking-widest">
                            {p.subscription_status}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {/* Toggle ativo/inativo */}
                      <button
                        onClick={() => toggleActive(p.id, p.is_active)}
                        title={p.is_active ? 'Desativar acesso' : 'Ativar acesso'}
                        className={`p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${p.is_active ? 'bg-sky-500/10 text-sky-400 hover:bg-red-500/10 hover:text-red-400 border-sky-500/20 hover:border-red-500/20' : 'bg-red-500/10 text-red-400 hover:bg-sky-500/10 hover:text-sky-400 border-red-500/20 hover:border-sky-500/20'}`}
                      >
                        {p.is_active ? (
                          /* ícone power ON */
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" strokeLinecap="round" />
                            <line x1="12" y1="2" x2="12" y2="12" strokeLinecap="round" />
                          </svg>
                        ) : (
                          /* ícone power OFF */
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" strokeLinecap="round" strokeDasharray="3 2" />
                            <line x1="12" y1="2" x2="12" y2="12" strokeLinecap="round" />
                          </svg>
                        )}
                      </button>

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

                      {/* Estender acesso */}
                      <button
                        onClick={() => {
                          if (extendingId === p.id) { setExtendingId(null); setCustomExpireDate(''); }
                          else { setExtendingId(p.id); setChangingPasswordId(null); setDeletingId(null); setNewPassword(''); }
                        }}
                        title="Estender acesso"
                        className={`p-2.5 rounded-xl transition-all border ${extendingId === p.id ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-white/5 text-gray-500 hover:bg-amber-500/10 hover:text-amber-400 border-white/10'}`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" /><line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M12 14v4m-2-2h4" strokeLinecap="round" />
                        </svg>
                      </button>

                      {/* Trocar senha */}
                      <button
                        onClick={() => {
                          setChangingPasswordId(changingPasswordId === p.id ? null : p.id);
                          setExtendingId(null);
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
                          setExtendingId(null);
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

                  {/* Painel: estender acesso */}
                  {extendingId === p.id && (
                    <div className="px-5 pb-5 animate-in slide-in-from-top-1 duration-200">
                      <div className="bg-black/30 border border-amber-500/10 rounded-2xl p-4 space-y-3">
                        <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Estender / Definir Acesso</p>
                        {/* Botões rápidos */}
                        <div className="flex gap-2">
                          {[7, 30, 90].map(days => (
                            <button
                              key={days}
                              onClick={() => handleExtendAccess(p.id, days)}
                              disabled={extendLoading}
                              className="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-400 transition-all disabled:opacity-50"
                            >
                              +{days}d
                            </button>
                          ))}
                        </div>
                        {/* Data manual */}
                        <div className="flex gap-2 items-center">
                          <input
                            type="date"
                            value={customExpireDate}
                            onChange={e => setCustomExpireDate(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white text-sm font-bold outline-none focus:border-amber-500/50 transition-all"
                            min={new Date().toISOString().split('T')[0]}
                          />
                          <button
                            onClick={() => { if (customExpireDate) handleExtendAccess(p.id, null, customExpireDate); }}
                            disabled={extendLoading || !customExpireDate}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 border border-amber-300 rounded-xl text-[10px] font-black uppercase tracking-widest text-black transition-all disabled:opacity-50 shrink-0"
                          >
                            {extendLoading ? '...' : 'Salvar'}
                          </button>
                          <button
                            onClick={() => { setExtendingId(null); setCustomExpireDate(''); }}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 transition-all shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                        {p.access_expires_at && (
                          <p className={`text-[9px] font-black uppercase tracking-widest ${isExpired(p.access_expires_at) ? 'text-red-500' : 'text-gray-500'}`}>
                            Expiração atual: {formatDate(p.access_expires_at)}
                            {isExpired(p.access_expires_at) && ' — EXPIRADO'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

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

            {/* Histórico de versões */}
            <div className="p-8 bg-amber-500/5 border border-amber-500/20 rounded-3xl space-y-3">
              <h3 className="text-amber-400 font-black uppercase tracking-tighter text-sm">Histórico de Versões</h3>
              <p className="text-gray-500 text-xs font-bold leading-relaxed">
                Visualize todas as alterações feitas nos cenários. Cada edição, exclusão ou migração cria um <span className="text-gray-300">backup automático</span> que pode ser restaurado a qualquer momento.
              </p>
              <button
                onClick={() => onViewVersionHistory?.()}
                className="px-8 py-4 bg-amber-600/80 hover:bg-amber-500 border border-amber-400/30 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white transition-all active:scale-95"
              >
                Ver Histórico
              </button>
            </div>
          </div>
        )}

        {tab === 'content' && (
          <div className="animate-in fade-in duration-300 space-y-4">
            <div className="p-8 bg-white/5 border border-white/5 rounded-3xl text-center space-y-3">
              <h3 className="text-white font-black uppercase tracking-tighter">Gerenciar Conteúdos</h3>
              <p className="text-gray-500 text-xs font-bold leading-relaxed max-w-xs mx-auto">
                Crie, edite, duplique e exclua cursos e aulas. Publique quando estiver pronto para liberar aos alunos.
              </p>
              <button
                onClick={onManageContent}
                className="px-8 py-4 bg-violet-600 hover:bg-violet-500 border border-violet-400 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white transition-all shadow-[0_10px_30px_rgba(139,92,246,0.3)] active:scale-95"
              >
                Abrir Gerenciador de Conteúdos
              </button>
            </div>
          </div>
        )}

        {tab === 'ads' && <AdManager />}
      </div>
    </div>
  );
};

export default AdminScreen;
