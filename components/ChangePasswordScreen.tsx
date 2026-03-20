
import React, { useState, useEffect } from 'react';

interface OnboardingData {
  name: string;
  password?: string;
  whatsapp?: string;
}

interface ChangePasswordScreenProps {
  email: string;
  onChangeSuccess: (data: OnboardingData) => void;
}

const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({ email, onChangeSuccess }) => {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // Carregar dados atuais do membro para preencher o nome inicial
  useEffect(() => {
    const storedMembers = JSON.parse(localStorage.getItem('gto_members') || '[]');
    const user = storedMembers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      setName(user.name || '');
      setWhatsapp(user.whatsapp || '');
    }
  }, [email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('O nome completo é obrigatório.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword === 'poker2026') {
      setError('A nova senha não pode ser a senha padrão.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    onChangeSuccess({
      name: name.trim(),
      password: newPassword,
      whatsapp: whatsapp.trim() || undefined
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 animate-in fade-in duration-700 overflow-y-auto custom-scrollbar py-12">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-sky-500 rounded-3xl shadow-[0_0_40px_rgba(14,165,233,0.3)] mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2 leading-none">Complete seu Perfil</h1>
          <p className="text-gray-500 font-bold tracking-[0.2em] uppercase text-[10px]">Configuração de primeiro acesso</p>
        </div>

        <div className="bg-[#0f0f0f] border border-white/5 rounded-[40px] p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-[60px] rounded-full -mr-16 -mt-16 pointer-events-none"></div>

          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            {/* Seção Dados do Membro */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                 <div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div>
                 <h3 className="text-[11px] text-gray-400 font-black uppercase tracking-widest">Informações Pessoais</h3>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">Nome Completo <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-sky-500/50 transition-all placeholder:text-gray-700 shadow-inner"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">WhatsApp (Opcional)</label>
                <input 
                  type="text" 
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-sky-500/50 transition-all placeholder:text-gray-700 shadow-inner"
                />
              </div>
            </div>

            {/* Seção Nova Senha */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 mb-2">
                 <div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div>
                 <h3 className="text-[11px] text-gray-400 font-black uppercase tracking-widest">Segurança da Conta</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">Nova Senha</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-sky-500/50 transition-all shadow-inner"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">Confirmar Senha</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-sky-500/50 transition-all shadow-inner"
                    required
                  />
                </div>
              </div>
              <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest px-1 mt-2">Mínimo de 6 caracteres. Diferente da senha atual.</p>
            </div>

            {error && (
              <div className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center bg-red-500/10 py-4 rounded-2xl border border-red-500/20 animate-in shake duration-300">
                {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-6 bg-sky-600 hover:bg-sky-500 border border-sky-400 rounded-3xl text-xs font-black uppercase tracking-[0.2em] text-white transition-all shadow-[0_15px_40px_rgba(14,165,233,0.4)] active:scale-95"
            >
              Salvar Perfil e Começar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordScreen;
