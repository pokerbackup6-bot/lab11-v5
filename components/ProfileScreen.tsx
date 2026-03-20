import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Lock, Save, CheckCircle } from 'lucide-react';
import { supabase } from '../utils/supabase.ts';
import { supabaseAdmin } from '../utils/supabaseAdmin.ts';

const MEMBERS_STORAGE_KEY = 'gto_members';
const USER_STATS_KEY = 'lab11_user_stats';

interface ProfileScreenProps {
  currentUser: string;
  onBack: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ currentUser, onBack }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [totalHands, setTotalHands] = useState(0);
  const [correctHands, setCorrectHands] = useState(0);

  const [newName, setNewName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, is_admin')
        .eq('id', user.id)
        .single();

      const name = profile?.full_name || currentUser.split('@')[0].toUpperCase();
      setDisplayName(name);
      setIsAdmin(profile?.is_admin ?? false);
      setNewName(name);
    });

    const statsData: Record<string, { totalHands: number; correctHands: number }> =
      JSON.parse(localStorage.getItem(USER_STATS_KEY) || '{}');
    const s = statsData[currentUser];
    if (s) { setTotalHands(s.totalHands); setCorrectHands(s.correctHands); }
  }, [currentUser]);

  const handleSaveName = async () => {
    if (!newName.trim() || !userId) return;
    setNameSaving(true);
    setNameError('');
    const trimmed = newName.trim().toUpperCase();

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: trimmed })
      .eq('id', userId);

    if (error) {
      setNameError('Erro ao salvar. Tente novamente.');
      setNameSaving(false);
      return;
    }

    // Sync to gto_members so ranking shows updated name
    const members: Array<{ name: string; email: string }> =
      JSON.parse(localStorage.getItem(MEMBERS_STORAGE_KEY) || '[]');
    let idx = members.findIndex(m => m.email === currentUser);
    if (idx < 0) {
      members.push({ name: trimmed, email: currentUser });
    } else {
      members[idx] = { ...members[idx], name: trimmed };
    }
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));

    setDisplayName(trimmed);
    setNameSaving(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2500);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Preencha todos os campos.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Nova senha e confirmação não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setPasswordSaving(true);

    // Verify old password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentUser,
      password: oldPassword,
    });
    if (signInError) {
      setPasswordError('Senha atual incorreta.');
      setPasswordSaving(false);
      return;
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setPasswordError('Erro ao alterar senha. Tente novamente.');
      setPasswordSaving(false);
      return;
    }

    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSaving(false);
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 2500);
  };

  const accuracy = totalHands > 0 ? Math.round((correctHands / totalHands) * 100) : 0;
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('') || '?';

  return (
    <div className="w-full min-h-screen overflow-y-auto bg-[#050505] text-white">
      {/* Header */}
      <div className="flex items-center gap-4 p-8 border-b border-white/5">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-[13px] font-black uppercase tracking-[0.3em] text-white">Meu Perfil</h1>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">{currentUser}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-8 space-y-6">
        {/* Avatar & Identity */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-sky-600/20 border border-sky-500/20 flex items-center justify-center shrink-0">
            <span className="text-sky-400 font-black text-xl">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-black text-white truncate">{displayName || '—'}</div>
            <div className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">{currentUser}</div>
            {isAdmin && (
              <span className="mt-2 inline-block text-[8px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* Training Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4 text-center">
            <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1">Total Mãos</div>
            <div className="text-2xl font-black text-white">{totalHands.toLocaleString()}</div>
          </div>
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4 text-center">
            <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1">Acertos</div>
            <div className="text-2xl font-black text-emerald-400">{correctHands.toLocaleString()}</div>
          </div>
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4 text-center">
            <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1">Precisão</div>
            <div className={`text-2xl font-black ${accuracy >= 70 ? 'text-emerald-400' : accuracy >= 50 ? 'text-amber-400' : accuracy > 0 ? 'text-rose-400' : 'text-gray-600'}`}>
              {totalHands > 0 ? `${accuracy}%` : '—'}
            </div>
          </div>
        </div>

        {/* Edit Name */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Alterar Nome</span>
          </div>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value.toUpperCase())}
            placeholder="Seu nome de exibição"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white font-bold uppercase tracking-wide focus:outline-none focus:border-sky-500/50 transition-colors"
          />
          {nameError && (
            <p className="text-rose-400 text-[10px] font-black uppercase tracking-wider">{nameError}</p>
          )}
          <button
            onClick={handleSaveName}
            disabled={nameSaving}
            className={`w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              nameSaved
                ? 'bg-emerald-600/20 border border-emerald-500/20 text-emerald-400'
                : nameSaving
                ? 'bg-sky-600/50 text-white/50 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-500 text-white'
            }`}
          >
            {nameSaved
              ? <><CheckCircle className="w-4 h-4" /> Salvo!</>
              : nameSaving
              ? 'Salvando...'
              : <><Save className="w-4 h-4" /> Salvar Nome</>}
          </button>
        </div>

        {/* Change Password */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Alterar Senha</span>
          </div>
          <input
            type="password"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            placeholder="Senha atual"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[12px] text-white focus:outline-none focus:border-sky-500/50 transition-colors"
          />
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Nova senha"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[12px] text-white focus:outline-none focus:border-sky-500/50 transition-colors"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
            placeholder="Confirmar nova senha"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[12px] text-white focus:outline-none focus:border-sky-500/50 transition-colors"
          />
          {passwordError && (
            <p className="text-rose-400 text-[10px] font-black uppercase tracking-wider">{passwordError}</p>
          )}
          <button
            onClick={handleChangePassword}
            disabled={passwordSaving}
            className={`w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              passwordSaved
                ? 'bg-emerald-600/20 border border-emerald-500/20 text-emerald-400'
                : passwordSaving
                ? 'bg-white/5 border border-white/10 text-white/50 cursor-not-allowed'
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
            }`}
          >
            {passwordSaved
              ? <><CheckCircle className="w-4 h-4" /> Alterada!</>
              : passwordSaving
              ? 'Verificando...'
              : <><Lock className="w-4 h-4" /> Alterar Senha</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
