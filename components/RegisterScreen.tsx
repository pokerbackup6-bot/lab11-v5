
import React, { useState } from 'react';

interface RegisterScreenProps {
  onRegister: (email: string) => void;
  onGoToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onGoToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    // Simulação: Apenas o email solicitado pelo usuário tem permissão admin no login.
    // Aqui permitiríamos o cadastro e redirecionaríamos ou logaríamos.
    onRegister(email);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.3)] mb-6 transform rotate-6">
            <span className="text-white text-4xl font-black">L</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Solicitar Acesso</h1>
          <p className="text-gray-500 font-bold tracking-[0.2em] uppercase text-[10px]">Junte-se ao LAB11 Training</p>
        </div>

        <div className="bg-[#0f0f0f] border border-white/5 rounded-[40px] p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] rounded-full -mr-16 -mt-16 pointer-events-none"></div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">Nome Completo</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-700 shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">E-mail</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-700 shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-700 shadow-inner"
              />
            </div>

            {error && (
              <div className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95"
            >
              Enviar Solicitação
            </button>
          </form>

          <div className="mt-8 text-center relative z-10">
            <button 
              onClick={onGoToLogin}
              className="text-[10px] text-gray-500 font-bold uppercase tracking-widest hover:text-white transition-colors"
            >
              Já tem conta? <span className="text-emerald-500">Faça Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;