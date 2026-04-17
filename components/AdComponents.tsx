import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../utils/supabase.ts';

// =============================================================================
// Shared: Ad type + hook to load & track ads
// =============================================================================

export interface Ad {
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
}

export function useAds(placement: string) {
  const [ads, setAds] = useState<Ad[]>([]);
  const tracked = useRef(new Set<string>());

  useEffect(() => {
    supabase
      .from('ads')
      .select('*')
      .eq('placement', placement)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const now = new Date();
        const filtered = data.filter(ad => {
          if (ad.start_date && new Date(ad.start_date) > now) return false;
          if (ad.end_date && new Date(ad.end_date) < now) return false;
          return true;
        });
        setAds(filtered);
      });
  }, [placement]);

  const trackImpression = useCallback(async (adId: string) => {
    if (tracked.current.has(adId)) return;
    tracked.current.add(adId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    supabase.from('ad_events').insert({ ad_id: adId, user_id: session.user.id, event_type: 'impression' }).then(() => {});
  }, []);

  const trackClick = useCallback(async (adId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    supabase.from('ad_events').insert({ ad_id: adId, user_id: session.user.id, event_type: 'click' }).then(() => {});
  }, []);

  return { ads, trackImpression, trackClick };
}

// =============================================================================
// 1. Banner Carousel — Dashboard hero
// =============================================================================

export const BannerCarousel: React.FC = () => {
  const { ads, trackImpression, trackClick } = useAds('banner_dashboard');
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (ads.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % ads.length);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [ads.length]);

  useEffect(() => {
    if (ads[current]) trackImpression(ads[current].id);
  }, [current, ads, trackImpression]);

  if (ads.length === 0) return null;

  const ad = ads[current];

  const handleClick = () => {
    if (!ad.button_url) return;
    trackClick(ad.id);
    window.open(ad.button_url, '_blank', 'noopener');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 relative group"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={ad.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.4 }}
          onClick={handleClick}
          className={`relative rounded-3xl overflow-hidden border border-white/5 ${ad.button_url ? 'cursor-pointer' : ''}`}
          style={{ backgroundColor: ad.bg_color || '#0f0f1a' }}
        >
          {/* Background image */}
          {ad.image_url && (
            <img
              src={ad.image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
          )}

          <div className="relative z-10 flex items-center justify-between p-6 md:p-8 min-h-[120px]">
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-sky-400 mb-1 block">Parceiro</span>
              <h3
                className="text-lg md:text-xl font-black tracking-tight mb-1"
                style={{ color: ad.text_color || '#ffffff' }}
              >
                {ad.title}
              </h3>
              {ad.description && (
                <p className="text-sm opacity-70 max-w-md" style={{ color: ad.text_color || '#ffffff' }}>
                  {ad.description}
                </p>
              )}
            </div>
            {ad.button_text && (
              <button
                className="shrink-0 ml-4 px-6 py-3 bg-sky-600 hover:bg-sky-500 border border-sky-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-sky-600/20"
              >
                {ad.button_text}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      {ads.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === current ? 'bg-sky-400 w-4' : 'bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};


// =============================================================================
// 2. Top Ticker — scrolling text bar
// =============================================================================

export const TopTicker: React.FC = () => {
  const { ads, trackImpression, trackClick } = useAds('ticker_topbar');

  useEffect(() => {
    ads.forEach(ad => trackImpression(ad.id));
  }, [ads, trackImpression]);

  if (ads.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-r from-sky-600/10 via-sky-500/5 to-sky-600/10 border-b border-sky-500/10 overflow-hidden h-8 flex items-center relative">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#050505] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#050505] to-transparent z-10" />
      <div className="animate-marquee whitespace-nowrap flex items-center gap-12">
        {[...ads, ...ads].map((ad, i) => (
          <span
            key={`${ad.id}-${i}`}
            onClick={() => {
              if (ad.button_url) {
                trackClick(ad.id);
                window.open(ad.button_url, '_blank', 'noopener');
              }
            }}
            className={`text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 ${ad.button_url ? 'cursor-pointer hover:text-sky-300' : ''}`}
            style={{ color: ad.text_color || '#38bdf8' }}
          >
            <span className="w-1 h-1 rounded-full bg-sky-400 shrink-0" />
            {ad.title}
            {ad.description && <span className="opacity-60 font-bold normal-case tracking-normal">— {ad.description}</span>}
            {ad.button_text && <span className="text-sky-400 underline underline-offset-2">{ad.button_text}</span>}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee ${Math.max(ads.length * 8, 15)}s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};


// =============================================================================
// 3. Sidebar Promo Card — compact sponsor card
// =============================================================================

export const SidebarPromo: React.FC = () => {
  const { ads, trackImpression, trackClick } = useAds('sidebar_card');
  const [current, setCurrent] = useState(0);

  // Rotate every 10s
  useEffect(() => {
    if (ads.length <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % ads.length), 10000);
    return () => clearInterval(t);
  }, [ads.length]);

  useEffect(() => {
    if (ads[current]) trackImpression(ads[current].id);
  }, [current, ads, trackImpression]);

  if (ads.length === 0) return null;

  const ad = ads[current];

  return (
    <div
      className="mx-4 mb-4 rounded-2xl border border-white/5 overflow-hidden transition-all hover:border-white/10 cursor-pointer"
      style={{ backgroundColor: ad.bg_color || '#0a0f1a' }}
      onClick={() => {
        if (ad.button_url) {
          trackClick(ad.id);
          window.open(ad.button_url, '_blank', 'noopener');
        }
      }}
    >
      {ad.image_url && (
        <img src={ad.image_url} alt="" className="w-full h-20 object-cover" />
      )}
      <div className="p-3">
        <span className="text-[7px] font-black uppercase tracking-[0.3em] text-sky-500/60 block mb-1">Parceiro</span>
        <p className="text-[11px] font-black leading-tight" style={{ color: ad.text_color || '#ffffff' }}>
          {ad.title}
        </p>
        {ad.description && (
          <p className="text-[9px] opacity-50 mt-0.5 leading-snug" style={{ color: ad.text_color || '#ffffff' }}>
            {ad.description}
          </p>
        )}
        {ad.button_text && (
          <span className="inline-block mt-2 text-[8px] font-black uppercase tracking-widest text-sky-400 hover:text-sky-300">
            {ad.button_text} →
          </span>
        )}
      </div>
    </div>
  );
};


// =============================================================================
// 4. Session Report Promo — card after training session ends
// =============================================================================

export const SessionReportPromo: React.FC = () => {
  const { ads, trackImpression, trackClick } = useAds('session_report');

  useEffect(() => {
    if (ads[0]) trackImpression(ads[0].id);
  }, [ads, trackImpression]);

  if (ads.length === 0) return null;

  const ad = ads[0]; // Show highest priority only

  return (
    <div
      className="rounded-2xl border border-white/5 overflow-hidden transition-all hover:border-white/10 cursor-pointer"
      style={{ backgroundColor: ad.bg_color || '#0a0f1a' }}
      onClick={() => {
        if (ad.button_url) {
          trackClick(ad.id);
          window.open(ad.button_url, '_blank', 'noopener');
        }
      }}
    >
      <div className="flex items-center gap-4 p-4">
        {ad.image_url ? (
          <img src={ad.image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
            <span className="text-sky-400 text-xl">♠</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className="text-[7px] font-black uppercase tracking-[0.3em] text-sky-500/60 block">Parceiro Lab11</span>
          <p className="text-sm font-black text-white truncate">{ad.title}</p>
          {ad.description && <p className="text-[10px] text-gray-400 truncate">{ad.description}</p>}
        </div>
        {ad.button_text && (
          <span className="shrink-0 px-4 py-2 bg-sky-600/20 border border-sky-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-sky-400">
            {ad.button_text}
          </span>
        )}
      </div>
    </div>
  );
};


// =============================================================================
// 5. Benefits Screen — full page with all benefits_page ads
// =============================================================================

interface BenefitsScreenProps {
  onBack: () => void;
  userId: string;
}

export const BenefitsScreen: React.FC<BenefitsScreenProps> = ({ onBack, userId }) => {
  const { ads, trackImpression, trackClick } = useAds('benefits_page');

  useEffect(() => {
    ads.forEach(ad => trackImpression(ad.id));
  }, [ads, trackImpression]);

  return (
    <div className="fixed inset-0 bg-[#050505] text-white overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={onBack}
            className="text-[10px] text-gray-500 hover:text-white font-black uppercase tracking-widest transition-colors mb-4 inline-flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Voltar
          </button>
          <h2 className="text-sky-500 text-[9px] font-black tracking-[0.3em] uppercase mb-1">PRO TRAINING</h2>
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase">
            Benefícios <span className="text-sky-400">Exclusivos</span>
          </h1>
          <p className="text-gray-600 text-[10px] font-bold tracking-widest uppercase mt-1">
            Descontos e promoções para membros LAB11
          </p>
        </motion.div>

        {/* Ads Grid */}
        {ads.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-700">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/>
              </svg>
            </div>
            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">Nenhum benefício disponível no momento</p>
            <p className="text-gray-700 text-[10px] font-bold mt-1">Em breve teremos novidades!</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ads.map((ad, idx) => (
              <motion.div
                key={ad.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => {
                  if (ad.button_url) {
                    trackClick(ad.id);
                    window.open(ad.button_url, '_blank', 'noopener');
                  }
                }}
                className={`rounded-3xl border border-white/5 overflow-hidden transition-all hover:border-white/10 hover:scale-[1.01] ${ad.button_url ? 'cursor-pointer' : ''}`}
                style={{ backgroundColor: ad.bg_color || '#0f0f0f' }}
              >
                {ad.image_url && (
                  <img src={ad.image_url} alt="" className="w-full h-40 object-cover" />
                )}
                <div className="p-6">
                  <h3 className="text-lg font-black tracking-tight mb-1" style={{ color: ad.text_color || '#ffffff' }}>
                    {ad.title}
                  </h3>
                  {ad.description && (
                    <p className="text-sm opacity-60 mb-4 leading-relaxed" style={{ color: ad.text_color || '#ffffff' }}>
                      {ad.description}
                    </p>
                  )}
                  {ad.button_text && (
                    <span className="inline-block px-5 py-2.5 bg-sky-600 hover:bg-sky-500 border border-sky-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-sky-600/20">
                      {ad.button_text}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
