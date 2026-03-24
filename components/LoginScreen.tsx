
import React, { useState } from 'react';
import { supabase } from '../utils/supabase.ts';
import { supabaseAdmin } from '../utils/supabaseAdmin.ts';

interface LoginScreenProps {
  onLogin: (email: string, isAdmin: boolean, isActive: boolean) => void;
  onGoToRegister: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGoToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (authError || !data.user) {
      setError('E-mail ou senha incorretos.');
      setLoading(false);
      return;
    }

    // Buscar perfil para saber se é admin e se tem acesso ativo
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin, is_active')
      .eq('id', data.user.id)
      .single();

    const isAdmin  = profile?.is_admin  ?? false;
    const isActive = profile?.is_active ?? false;

    onLogin(data.user.email!, isAdmin, isActive);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="relative mb-6 group">
             <div className="w-32 h-32 flex items-center justify-center bg-gradient-to-br from-sky-500/20 to-transparent rounded-full border border-white/5 shadow-2xl relative overflow-hidden">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sky-400">
                  <path d="M9 3h6M10 3v5c0 2-2 3-2 7s2 6 6 6 6-2 6-6-2-5-2-7V3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="absolute bottom-2 right-2 w-12 h-12 bg-[#0a0a0a] rounded-full border-2 border-sky-500 flex items-center justify-center shadow-lg">
                  <span className="text-sky-400 text-lg">♠</span>
                </div>
             </div>
          </div>

          <h1 className="text-5xl font-black text-white tracking-tighter uppercase mb-1">LAB11</h1>
          <p className="text-sky-500 font-bold tracking-[0.4em] uppercase text-[10px]">A sua evolução começa aqui</p>
        </div>

        <div className="bg-[#0f0f0f] border border-white/5 rounded-[40px] p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-[60px] rounded-full -mr-16 -mt-16 pointer-events-none"></div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">E-mail de Acesso</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-sky-500/50 transition-all placeholder:text-gray-700 shadow-inner disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-sky-500/50 transition-all placeholder:text-gray-700 shadow-inner disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-sky-600 hover:bg-sky-500 border border-sky-400 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white transition-all shadow-[0_10px_30px_rgba(14,165,233,0.3)] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Verificando...' : 'Entrar no Laboratório'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
