import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from '../utils/supabaseAdmin.ts';
import { supabase } from '../utils/supabase.ts';

interface Ad {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  button_text: string | null;
  button_url: string | null;
  placement: string;
  is_active: boolean;
  priority: number;
  bg_color: string | null;
  text_color: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface AdMetric {
  ad_id: string;
  impressions: number;
  clicks: number;
  ctr_pct: number;
  clicks_7d: number;
  impressions_7d: number;
}

const PLACEMENTS = [
  { value: 'banner_dashboard', label: 'Banner Dashboard', color: 'sky' },
  { value: 'ticker_topbar', label: 'Ticker Barra Superior', color: 'amber' },
  { value: 'sidebar_card', label: 'Card Sidebar', color: 'emerald' },
  { value: 'session_report', label: 'Fim de Sessão', color: 'purple' },
  { value: 'benefits_page', label: 'Página Benefícios', color: 'rose' },
] as const;

const placementLabel = (p: string) => PLACEMENTS.find(x => x.value === p)?.label ?? p;
const placementColor = (p: string) => PLACEMENTS.find(x => x.value === p)?.color ?? 'gray';

const inputClass = "w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-white text-sm font-bold outline-none focus:border-sky-500/50 transition-all placeholder:text-gray-700";
const labelClass = "text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1.5";

const AdManager: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [metrics, setMetrics] = useState<AdMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterPlacement, setFilterPlacement] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '', description: '', image_url: '', button_text: '', button_url: '',
    placement: 'banner_dashboard', priority: 0, bg_color: '', text_color: '',
    start_date: '', end_date: '',
  });

  useEffect(() => { loadAds(); }, []);

  const loadAds = async () => {
    setLoading(true);
    const [{ data: adsData }, { data: metricsData }] = await Promise.all([
      supabaseAdmin.from('ads').select('*').order('priority', { ascending: false }).order('created_at', { ascending: false }),
      supabaseAdmin.from('ad_metrics').select('*'),
    ]);
    if (adsData) setAds(adsData);
    if (metricsData) setMetrics(metricsData);
    setLoading(false);
  };

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const resetForm = () => {
    setForm({ title: '', description: '', image_url: '', button_text: '', button_url: '', placement: 'banner_dashboard', priority: 0, bg_color: '', text_color: '', start_date: '', end_date: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (ad: Ad) => {
    setForm({
      title: ad.title,
      description: ad.description ?? '',
      image_url: ad.image_url ?? '',
      button_text: ad.button_text ?? '',
      button_url: ad.button_url ?? '',
      placement: ad.placement,
      priority: ad.priority,
      bg_color: ad.bg_color ?? '',
      text_color: ad.text_color ?? '',
      start_date: ad.start_date ? ad.start_date.slice(0, 16) : '',
      end_date: ad.end_date ? ad.end_date.slice(0, 16) : '',
    });
    setEditingId(ad.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showFeedback('error', 'Título é obrigatório'); return; }

    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      button_text: form.button_text.trim() || null,
      button_url: form.button_url.trim() || null,
      placement: form.placement,
      priority: form.priority,
      bg_color: form.bg_color.trim() || null,
      text_color: form.text_color.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    if (editingId) {
      const { error } = await supabaseAdmin.from('ads').update(payload).eq('id', editingId);
      if (error) { showFeedback('error', error.message); return; }
      showFeedback('success', 'Publicidade atualizada!');
    } else {
      const { error } = await supabaseAdmin.from('ads').insert(payload);
      if (error) { showFeedback('error', error.message); return; }
      showFeedback('success', 'Publicidade criada!');
    }
    resetForm();
    loadAds();
  };

  const handleToggle = async (ad: Ad) => {
    await supabaseAdmin.from('ads').update({ is_active: !ad.is_active }).eq('id', ad.id);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, is_active: !a.is_active } : a));
  };

  const handleDelete = async (id: string) => {
    await supabaseAdmin.from('ads').delete().eq('id', id);
    setAds(prev => prev.filter(a => a.id !== id));
    showFeedback('success', 'Publicidade removida');
  };

  const getMetric = (adId: string) => metrics.find(m => m.ad_id === adId);

  const filtered = filterPlacement === 'all' ? ads : ads.filter(a => a.placement === filterPlacement);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest">Carregando publicidades...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Feedback */}
      {feedback && (
        <div className={`p-3 rounded-2xl text-center text-xs font-black uppercase tracking-widest animate-in zoom-in ${
          feedback.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>{feedback.msg}</div>
      )}

      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-white font-black uppercase tracking-tighter text-lg">Publicidades</h3>
          <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">{ads.length} cadastrada{ads.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-6 py-3 bg-sky-600 hover:bg-sky-500 border border-sky-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-sky-600/20"
        >
          + Nova Publicidade
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterPlacement('all')}
          className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
            filterPlacement === 'all' ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
          }`}
        >Todos ({ads.length})</button>
        {PLACEMENTS.map(p => {
          const count = ads.filter(a => a.placement === p.value).length;
          return (
            <button
              key={p.value}
              onClick={() => setFilterPlacement(p.value)}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                filterPlacement === p.value ? `bg-${p.color}-600/20 border-${p.color}-500/30 text-${p.color}-400` : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
              }`}
            >{p.label} ({count})</button>
          );
        })}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="p-6 bg-white/5 border border-sky-500/20 rounded-3xl space-y-5 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <h4 className="text-sky-400 text-[10px] font-black uppercase tracking-widest">
              {editingId ? 'Editar Publicidade' : 'Nova Publicidade'}
            </h4>
            <button onClick={resetForm} className="text-gray-500 hover:text-white text-xs transition-colors">✕</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Título *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: 20% OFF PokerStars" className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Descrição</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Texto descritivo (opcional)" rows={2} className={inputClass + ' resize-none'} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>URL da Imagem</label>
              <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Texto do Botão</label>
              <input value={form.button_text} onChange={e => setForm(f => ({ ...f, button_text: e.target.value }))} placeholder="Ex: Aproveitar" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Link do Botão</label>
              <input value={form.button_url} onChange={e => setForm(f => ({ ...f, button_url: e.target.value }))} placeholder="https://..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Local de Exibição *</label>
              <select value={form.placement} onChange={e => setForm(f => ({ ...f, placement: e.target.value }))} className={inputClass}>
                {PLACEMENTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Prioridade</label>
              <input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Cor de Fundo (hex)</label>
              <input value={form.bg_color} onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))} placeholder="#1a1a2e" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Cor do Texto (hex)</label>
              <input value={form.text_color} onChange={e => setForm(f => ({ ...f, text_color: e.target.value }))} placeholder="#ffffff" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Início (opcional)</label>
              <input type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Fim (opcional)</label>
              <input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className={inputClass} />
            </div>
          </div>

          {/* Preview */}
          {(form.title || form.image_url) && (
            <div>
              <label className={labelClass}>Preview</label>
              <div
                className="p-5 rounded-2xl border border-white/10 overflow-hidden"
                style={{ backgroundColor: form.bg_color || '#0f0f0f', color: form.text_color || '#ffffff' }}
              >
                {form.image_url && <img src={form.image_url} alt="preview" className="w-full h-32 object-cover rounded-xl mb-3" />}
                <p className="font-black text-sm">{form.title}</p>
                {form.description && <p className="text-xs opacity-70 mt-1">{form.description}</p>}
                {form.button_text && (
                  <button className="mt-3 px-4 py-2 bg-sky-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white">
                    {form.button_text}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={resetForm} className="px-6 py-3 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">
              Cancelar
            </button>
            <button onClick={handleSave} className="px-6 py-3 bg-sky-600 hover:bg-sky-500 border border-sky-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all">
              {editingId ? 'Salvar Alterações' : 'Criar Publicidade'}
            </button>
          </div>
        </div>
      )}

      {/* Ads list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          </div>
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">Nenhuma publicidade cadastrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ad => {
            const m = getMetric(ad.id);
            const isExpanded = expandedId === ad.id;
            const pColor = placementColor(ad.placement);
            return (
              <div key={ad.id} className={`bg-white/5 border rounded-3xl overflow-hidden transition-all ${ad.is_active ? 'border-white/5 hover:border-white/10' : 'border-red-500/10 opacity-60'}`}>
                <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : ad.id)}>
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 shrink-0 overflow-hidden flex items-center justify-center">
                    {ad.image_url ? (
                      <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-black truncate">{ad.title}</span>
                      <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-lg bg-${pColor}-500/10 text-${pColor}-400 border border-${pColor}-500/20`}>
                        {placementLabel(ad.placement)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[9px] font-bold text-gray-500">
                      {m && <span>{m.impressions.toLocaleString()} views</span>}
                      {m && <span>{m.clicks.toLocaleString()} clicks</span>}
                      {m && m.impressions > 0 && <span>CTR: {m.ctr_pct}%</span>}
                    </div>
                  </div>

                  {/* Toggle */}
                  <div
                    onClick={e => { e.stopPropagation(); handleToggle(ad); }}
                    className={`w-10 h-6 rounded-full border transition-all relative cursor-pointer shrink-0 ${ad.is_active ? 'bg-emerald-600/40 border-emerald-500/50' : 'bg-white/5 border-white/10'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${ad.is_active ? 'left-4 bg-emerald-400' : 'left-0.5 bg-gray-600'}`} />
                  </div>

                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-gray-600 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-white/5 animate-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 mb-5">
                      <div className="bg-black/30 p-3 rounded-xl text-center border border-white/5">
                        <span className="text-[8px] text-gray-500 font-black uppercase block mb-1">Impressões</span>
                        <span className="text-white font-black text-lg">{m?.impressions.toLocaleString() ?? 0}</span>
                      </div>
                      <div className="bg-black/30 p-3 rounded-xl text-center border border-white/5">
                        <span className="text-[8px] text-gray-500 font-black uppercase block mb-1">Cliques</span>
                        <span className="text-sky-400 font-black text-lg">{m?.clicks.toLocaleString() ?? 0}</span>
                      </div>
                      <div className="bg-black/30 p-3 rounded-xl text-center border border-white/5">
                        <span className="text-[8px] text-gray-500 font-black uppercase block mb-1">CTR</span>
                        <span className="text-amber-400 font-black text-lg">{m?.ctr_pct ?? 0}%</span>
                      </div>
                      <div className="bg-black/30 p-3 rounded-xl text-center border border-white/5">
                        <span className="text-[8px] text-gray-500 font-black uppercase block mb-1">Cliques 7d</span>
                        <span className="text-emerald-400 font-black text-lg">{m?.clicks_7d.toLocaleString() ?? 0}</span>
                      </div>
                    </div>

                    {ad.description && <p className="text-gray-400 text-xs mb-3">{ad.description}</p>}
                    {ad.button_url && <p className="text-gray-600 text-[9px] font-mono truncate mb-3">Link: {ad.button_url}</p>}

                    <div className="flex items-center gap-2 flex-wrap text-[9px]">
                      <span className="text-gray-600 font-bold">Prioridade: {ad.priority}</span>
                      {ad.start_date && <span className="text-gray-600 font-bold">| Início: {new Date(ad.start_date).toLocaleDateString('pt-BR')}</span>}
                      {ad.end_date && <span className="text-gray-600 font-bold">| Fim: {new Date(ad.end_date).toLocaleDateString('pt-BR')}</span>}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => openEdit(ad)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-300 transition-all"
                      >Editar</button>
                      <button
                        onClick={() => { if (confirm('Tem certeza que deseja excluir esta publicidade?')) handleDelete(ad.id); }}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-400 transition-all"
                      >Excluir</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdManager;
