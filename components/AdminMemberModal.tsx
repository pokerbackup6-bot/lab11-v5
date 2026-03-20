import React, { useState, useEffect } from 'react';

interface Member {
  name: string;
  email: string;
  password?: string;
  mustChangePassword?: boolean;
  isAdmin?: boolean;
  hasMultiLoginAttempt?: boolean;
}

interface AdminMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminMemberModal: React.FC<AdminMemberModalProps> = ({ isOpen, onClose }) => {
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'mass_create' | 'sync'>('list');
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [massEmails, setMassEmails] = useState('');
  const [syncJson, setSyncJson] = useState('');
  const [syncType, setSyncType] = useState<'scenarios' | 'members'>('scenarios');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const SCENARIOS_STORAGE_KEY = 'lab11_scenarios_v1';
  const MEMBERS_STORAGE_KEY = 'gto_members';

  useEffect(() => {
    if (isOpen) {
      const stored = JSON.parse(localStorage.getItem(MEMBERS_STORAGE_KEY) || '[]');
      setMembers(stored);
      setView('list');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const saveToStorage = (updatedList: Member[]) => {
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(updatedList));
    setMembers(updatedList);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setError('');
    
    if (members.some(m => m.email.toLowerCase() === email.toLowerCase())) {
      setError('E-mail já cadastrado.');
      return;
    }

    const newMember: Member = {
      name,
      email: email.toLowerCase(),
      password: 'poker2026',
      mustChangePassword: false,
      isAdmin: false,
      hasMultiLoginAttempt: false
    };

    const newList = [...members, newMember];
    saveToStorage(newList);
    setSuccess('Membro criado com sucesso!');
    setTimeout(() => {
      setSuccess('');
      setName('');
      setEmail('');
      setView('list');
    }, 1500);
  };

  const handleMassCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!massEmails.trim()) {
      setError('Por favor, insira ao menos um e-mail.');
      return;
    }

    const emailList = massEmails
      .split('\n')
      .map(e => e.trim().toLowerCase())
      .filter(e => e !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (emailList.length === 0) {
      setError('Nenhum e-mail válido encontrado.');
      return;
    }

    let addedCount = 0;
    let skipCount = 0;
    const currentMembers = [...members];

    emailList.forEach(mail => {
      if (currentMembers.some(m => m.email.toLowerCase() === mail)) {
        skipCount++;
      } else {
        const newMember: Member = {
          name: mail.split('@')[0].toUpperCase(),
          email: mail,
          password: 'poker2026',
          mustChangePassword: false,
          isAdmin: false,
          hasMultiLoginAttempt: false
        };
        currentMembers.push(newMember);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      saveToStorage(currentMembers);
      setSuccess(`${addedCount} novos membros cadastrados! ${skipCount > 0 ? `(${skipCount} já existiam)` : ''}`);
      setMassEmails('');
      setTimeout(() => {
        setSuccess('');
        setView('list');
      }, 2000);
    } else {
      setError(`Nenhum novo membro cadastrado. ${skipCount} e-mails já estavam na lista.`);
    }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !name || !email) return;

    const newList = members.map(m => {
      if (m.email === selectedMember.email) {
        return { 
          ...m, 
          name, 
          email: email.toLowerCase(),
          ...(password ? { password, mustChangePassword: false } : {})
        };
      }
      return m;
    });

    saveToStorage(newList);
    setSuccess('Dados atualizados!');
    setTimeout(() => {
      setSuccess('');
      setView('list');
    }, 1500);
  };

  const handleDelete = (emailToDelete: string) => {
    if (window.confirm('Tem certeza que deseja excluir este membro?')) {
      const newList = members.filter(m => m.email !== emailToDelete);
      saveToStorage(newList);
    }
  };

  const openEdit = (member: Member) => {
    setSelectedMember(member);
    setName(member.name);
    setEmail(member.email);
    setPassword('');
    setView('edit');
  };

  const handleExportSync = () => {
    setError('');
    setSuccess('');
    const key = syncType === 'scenarios' ? SCENARIOS_STORAGE_KEY : MEMBERS_STORAGE_KEY;
    const rawData = localStorage.getItem(key);
    const data = rawData ? JSON.parse(rawData) : [];
    
    if (!data || data.length === 0) {
      setError(`Não existem ${syncType === 'scenarios' ? 'cenários' : 'membros'} customizados para exportar.`);
      setSyncJson('');
      return;
    }
    
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      setSyncJson(jsonStr);
      setSuccess(`${syncType === 'scenarios' ? 'Cenários' : 'Membros'} exportados com sucesso!`);
    } catch (e) {
      setError('Erro ao gerar código JSON.');
      setSyncJson('');
    }
  };

  const handleImportSync = () => {
    if (!syncJson.trim()) {
      setError('Cole o código JSON para importar.');
      return;
    }
    try {
      const parsed = JSON.parse(syncJson);
      if (Array.isArray(parsed)) {
        const key = syncType === 'scenarios' ? SCENARIOS_STORAGE_KEY : MEMBERS_STORAGE_KEY;
        localStorage.setItem(key, JSON.stringify(parsed));
        setSuccess('Dados importados com sucesso! O sistema será reiniciado.');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError('Formato JSON inválido. Deve ser um array.');
      }
    } catch (e) {
      setError('Erro ao processar JSON. Verifique o código.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="bg-[#0f0f0f] w-full max-w-2xl border border-white/10 rounded-[40px] shadow-[0_40px_80px_-20px_rgba(0,0,0,1)] flex flex-col max-h-[85vh] overflow-hidden relative">
        
        <div className="p-8 border-b border-white/5 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Painel Administrativo</h2>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Gestão de Membros e Sincronização</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-white bg-white/5 rounded-full">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
            <button onClick={() => setView('list')} className={`flex-1 min-w-[100px] py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'list' ? 'bg-white/10 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}>Lista</button>
            <button onClick={() => { setView('create'); setName(''); setEmail(''); }} className={`flex-1 min-w-[120px] py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'create' ? 'bg-emerald-600/20 text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}>Novo Membro</button>
            <button onClick={() => { setView('mass_create'); setMassEmails(''); }} className={`flex-1 min-w-[140px] py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'mass_create' ? 'bg-sky-600/20 text-sky-400' : 'text-gray-500 hover:text-gray-300'}`}>Cadastro Massa</button>
            <button onClick={() => { setView('sync'); setSyncJson(''); setError(''); setSuccess(''); }} className={`flex-1 min-w-[140px] py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'sync' ? 'bg-purple-600/20 text-purple-400 shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}>Sincronização</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {success && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-emerald-400 text-center text-xs font-black uppercase tracking-widest animate-in zoom-in">{success}</div>
          )}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-center text-xs font-black uppercase tracking-widest">{error}</div>
          )}

          {view === 'list' && (
            <div className="space-y-3 animate-in fade-in duration-300">
              {members.length === 0 ? (
                <div className="text-center py-20 text-gray-600 font-black uppercase tracking-[0.3em] text-[10px]">Nenhum membro cadastrado</div>
              ) : (
                members.map((m) => (
                  <div key={m.email} className="group flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-3xl hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 font-black text-xs uppercase relative">{m.name.charAt(0)}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-bold text-sm truncate">{m.name}</h4>
                          {m.hasMultiLoginAttempt && <span className="bg-red-500/20 text-red-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-red-500/30 shrink-0">Multi-Login</span>}
                        </div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-tight truncate">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button onClick={() => openEdit(m)} className="p-3 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 rounded-xl transition-all"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                      <button onClick={() => handleDelete(m.email)} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {view === 'sync' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="bg-purple-500/5 border border-purple-500/10 p-6 rounded-[24px]">
                  <h4 className="text-white font-black text-xs uppercase tracking-widest mb-2">Sincronização Global:</h4>
                  <p className="text-[10px] text-gray-500 mb-4 font-bold">Gere o JSON e compartilhe o código para manter todos os usuários com os mesmos dados.</p>
                  
                  <div className="flex p-1 bg-black/40 rounded-xl border border-white/5 mb-4">
                    <button onClick={() => { setSyncType('scenarios'); setSyncJson(''); setError(''); setSuccess(''); }} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${syncType === 'scenarios' ? 'bg-purple-600/20 text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>Cenários</button>
                    <button onClick={() => { setSyncType('members'); setSyncJson(''); setError(''); setSuccess(''); }} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${syncType === 'members' ? 'bg-sky-600/20 text-sky-400' : 'text-gray-500 hover:text-gray-300'}`}>Membros</button>
                  </div>

                  <button onClick={handleExportSync} className={`w-full py-4 border rounded-2xl text-[11px] font-black uppercase tracking-widest text-white transition-all shadow-xl ${syncType === 'scenarios' ? 'bg-purple-600 border-purple-400 hover:bg-purple-500' : 'bg-sky-600 border-sky-400 hover:bg-sky-500'}`}>Gerar JSON de {syncType === 'scenarios' ? 'Cenários' : 'Membros'}</button>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">Código de Sincronização</label>
                 <textarea value={syncJson} onChange={(e) => setSyncJson(e.target.value)} placeholder="O código JSON aparecerá aqui..." className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-[11px] font-mono text-gray-400 outline-none focus:border-purple-500/50 resize-none transition-all shadow-inner custom-scrollbar" />
               </div>

               <div className="flex gap-4">
                 <button onClick={handleImportSync} className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white transition-all">Importar JSON</button>
                 <button onClick={() => { if(syncJson) { navigator.clipboard.writeText(syncJson); setSuccess('Copiado para a área de transferência!'); } }} className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white transition-all">Copiar Código</button>
               </div>
            </div>
          )}

          {view === 'mass_create' && (
            <form onSubmit={handleMassCreate} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">E-mails (Um por linha)</label>
                <textarea value={massEmails} onChange={(e) => setMassEmails(e.target.value)} placeholder="exemplo1@email.com&#10;exemplo2@email.com" className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-sky-500/50 resize-none transition-all shadow-inner" />
              </div>
              <button type="submit" className="w-full py-5 bg-sky-600 border border-sky-400 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl">Cadastrar Lista em Massa</button>
            </form>
          )}

          {(view === 'create' || view === 'edit') && (
            <form onSubmit={view === 'create' ? handleCreate : handleUpdate} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none" required />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none" required />
              </div>
              <button type="submit" className="w-full py-5 bg-emerald-600 border border-emerald-400 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl">{view === 'create' ? 'Cadastrar Membro' : 'Salvar Alterações'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMemberModal;