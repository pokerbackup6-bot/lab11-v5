import React, { useState, useMemo, useEffect } from 'react';
import { Scenario } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Search, X, Filter, ChevronDown, Play, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SelectionScreenProps {
  scenarios: Scenario[];
  onSelect: (s: Scenario) => void;
  onCreateNew: () => void;
  isAdmin?: boolean;
}

const SelectionScreen: React.FC<SelectionScreenProps> = ({ scenarios, onSelect, onCreateNew, isAdmin = false }) => {
  // Estados dos Filtros
  const [filterStreet, setFilterStreet] = useState<string>('ALL');
  const [filterStack, setFilterStack] = useState<string>('ALL'); // ALL, SHORT, MEDIUM, DEEP
  const [filterSpot, setFilterSpot] = useState<string>('ALL');
  const [filterPlayers, setFilterPlayers] = useState<string>('ALL');
  const [filterPos, setFilterPos] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Carregar favoritos do localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('poker_training_favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Erro ao carregar favoritos', e);
      }
    }
  }, []);

  // Salvar favoritos no localStorage
  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(id)
      ? favorites.filter(favId => favId !== id)
      : [...favorites, id];
    
    setFavorites(newFavorites);
    localStorage.setItem('poker_training_favorites', JSON.stringify(newFavorites));
  };

  // Opções dinâmicas baseadas nos cenários existentes
  const uniqueSpots = useMemo(() => Array.from(new Set(scenarios.map(s => s.preflopAction))).sort(), [scenarios]);
  const uniquePlayers = useMemo(() => Array.from(new Set(scenarios.map(s => s.playerCount))).sort((a: number, b: number) => b - a), [scenarios]);
  const uniquePositions = useMemo(() => Array.from(new Set(scenarios.map(s => s.heroPos))).sort(), [scenarios]);

  // Lógica de Filtragem e Ordenação
  const filteredScenarios = useMemo(() => {
    let result = scenarios.filter(s => {
      const matchStreet = filterStreet === 'ALL' || s.street === filterStreet;
      
      let matchStack = true;
      if (filterStack === 'SHORT') matchStack = s.stackBB <= 25;
      else if (filterStack === 'MEDIUM') matchStack = s.stackBB > 25 && s.stackBB <= 50;
      else if (filterStack === 'DEEP') matchStack = s.stackBB > 50;

      const matchSpot = filterSpot === 'ALL' || s.preflopAction === filterSpot;
      const matchPlayers = filterPlayers === 'ALL' || s.playerCount.toString() === filterPlayers;
      const matchPos = filterPos === 'ALL' || s.heroPos === filterPos;
      
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = searchQuery === '' || 
        s.name.toLowerCase().includes(searchLower) || 
        s.preflopAction.toLowerCase().includes(searchLower) ||
        s.heroPos.toLowerCase().includes(searchLower);

      const isFav = favorites.includes(s.id);
      const matchFavorites = !showOnlyFavorites || isFav;

      return matchStreet && matchStack && matchSpot && matchPlayers && matchPos && matchSearch && matchFavorites;
    });

    // Ordenar: Favoritos primeiro, depois por nome
    return result.sort((a, b) => {
      const aFav = favorites.includes(a.id) ? 1 : 0;
      const bFav = favorites.includes(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return a.name.localeCompare(b.name);
    });
  }, [scenarios, filterStreet, filterStack, filterSpot, filterPlayers, filterPos, searchQuery, showOnlyFavorites, favorites]);

  const clearFilters = () => {
    setFilterStreet('ALL');
    setFilterStack('ALL');
    setFilterSpot('ALL');
    setFilterPlayers('ALL');
    setFilterPos('ALL');
    setSearchQuery('');
    setShowOnlyFavorites(false);
  };

  const hasActiveFilters = filterStreet !== 'ALL' || filterStack !== 'ALL' || filterSpot !== 'ALL' || filterPlayers !== 'ALL' || filterPos !== 'ALL' || searchQuery !== '' || showOnlyFavorites;

  return (
    <div className="w-full bg-[#050505] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1">CENTRO DE TREINAMENTO</h1>
            <p className="text-gray-500 font-bold tracking-widest uppercase text-[9px] md:text-[10px]">Evolua sua técnica com cenários GTO</p>
          </div>
          
          <div className="flex items-center gap-3">
          </div>
        </motion.div>

        {/* Barra de Busca, Favoritos e Categorias (Linha 1) */}
        <div className="flex flex-col lg:flex-row gap-4 items-center mb-6 shrink-0">
          {/* Search Bar */}
          <div className="relative flex-1 w-full lg:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Buscar cenários..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium outline-none focus:border-sky-500/50 transition-all placeholder:text-gray-600"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded-full transition-all"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>

          {/* Favorites Toggle */}
          <button 
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={cn(
              "px-4 py-3 rounded-2xl border transition-all flex items-center gap-2 shrink-0 w-full lg:w-auto justify-center",
              showOnlyFavorites 
                ? "bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.1)]" 
                : "bg-[#0f0f0f] border-white/5 text-gray-500 hover:border-white/10"
            )}
          >
            <Heart className={cn("w-4 h-4", showOnlyFavorites && "fill-current")} />
            <span className="text-[10px] font-black uppercase tracking-widest">Favoritos</span>
          </button>

          {/* Street Tabs */}
          <div className="flex bg-[#0f0f0f] p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar max-w-full w-full lg:w-auto">
            {['ALL', 'PREFLOP', 'FLOP', 'TURN', 'RIVER'].map(s => (
              <button 
                key={s} 
                onClick={() => setFilterStreet(s)}
                className={cn(
                  "flex-1 lg:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  filterStreet === s 
                    ? "bg-sky-600 text-white shadow-lg" 
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                )}
              >
                {s === 'ALL' ? 'Todos' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Filtros Secundários e Resultados (Linha 2) */}
        <div className="flex flex-wrap items-center gap-3 mb-8 shrink-0">
          <div className="flex items-center gap-2 text-gray-500 mr-1">
            <Filter className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">Filtros:</span>
          </div>

          {/* Stack Filter */}
          <select 
            value={filterStack}
            onChange={(e) => setFilterStack(e.target.value)}
            className="bg-[#0f0f0f] border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-sky-500/50 transition-all text-gray-400 cursor-pointer hover:border-white/10"
          >
            <option value="ALL">Stack (Todos)</option>
            <option value="SHORT">Short (&le; 25 BB)</option>
            <option value="MEDIUM">Medium (26-50 BB)</option>
            <option value="DEEP">Deep (&gt; 50 BB)</option>
          </select>

          {/* Spot Filter */}
          <select 
            value={filterSpot}
            onChange={(e) => setFilterSpot(e.target.value)}
            className="bg-[#0f0f0f] border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-sky-500/50 transition-all text-gray-400 cursor-pointer hover:border-white/10"
          >
            <option value="ALL">Spot (Todos)</option>
            {uniqueSpots.map(spot => (
              <option key={spot} value={spot}>{spot}</option>
            ))}
          </select>

          {/* Position Filter */}
          <select 
            value={filterPos}
            onChange={(e) => setFilterPos(e.target.value)}
            className="bg-[#0f0f0f] border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-sky-500/50 transition-all text-gray-400 cursor-pointer hover:border-white/10"
          >
            <option value="ALL">Posição (Todas)</option>
            {uniquePositions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>

          {/* Players Filter */}
          <select 
            value={filterPlayers}
            onChange={(e) => setFilterPlayers(e.target.value)}
            className="bg-[#0f0f0f] border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-sky-500/50 transition-all text-gray-400 cursor-pointer hover:border-white/10"
          >
            <option value="ALL">Mesa (Todas)</option>
            {uniquePlayers.map(p => (
              <option key={p} value={p.toString()}>{p} Jogadores</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all"
            >
              <X className="w-3 h-3" />
              Limpar Filtros
            </button>
          )}

          <div className="ml-auto hidden lg:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
             <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Resultados:</span>
             <span className="text-sm font-mono font-black text-sky-400">{filteredScenarios.length}</span>
          </div>
        </div>

        {/* Grid de Cenários */}
        <div className="pb-8">
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredScenarios.map((s) => (
                <motion.div 
                  key={s.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => onSelect(s)}
                  className="group relative bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-sky-500/40 transition-all hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] flex flex-col"
                >
                  {/* Favorite Button */}
                  <button 
                    onClick={(e) => toggleFavorite(e, s.id)}
                    className={cn(
                      "absolute top-3 right-3 z-10 p-2 rounded-lg transition-all",
                      favorites.includes(s.id) 
                        ? "bg-rose-500/20 text-rose-500" 
                        : "bg-black/40 text-gray-600 hover:text-white hover:bg-black/60"
                    )}
                  >
                    <Heart className={cn("w-3.5 h-3.5", favorites.includes(s.id) && "fill-current")} />
                  </button>

                  <div className="p-5 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest",
                        s.street === 'PREFLOP' ? 'bg-emerald-500/10 text-emerald-400' : 
                        s.street === 'FLOP' ? 'bg-sky-500/10 text-sky-400' :
                        s.street === 'TURN' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                      )}>
                        {s.street}
                      </span>
                      <span className="text-gray-700 text-[10px]">•</span>
                      <span className="text-sky-500/80 text-[8px] font-black tracking-widest uppercase">{s.preflopAction}</span>
                    </div>

                    <h3 className="text-sm font-black leading-tight group-hover:text-sky-400 transition-colors uppercase mb-4 line-clamp-2 min-h-[2.5rem]">
                      {s.name}
                    </h3>

                    <div className="grid grid-cols-3 gap-2 mt-auto">
                      <div className="bg-black/40 p-2 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                        <span className="text-[7px] text-gray-600 font-black uppercase mb-0.5 tracking-tighter">Stack</span>
                        <span className="text-[10px] font-black text-white">{s.stackBB}BB</span>
                      </div>
                      <div className="bg-black/40 p-2 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                        <span className="text-[7px] text-gray-600 font-black uppercase mb-0.5 tracking-tighter">Herói</span>
                        <span className="text-[10px] font-black text-white">{s.heroPos}</span>
                      </div>
                      <div className="bg-black/40 p-2 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                        <span className="text-[7px] text-gray-600 font-black uppercase mb-0.5 tracking-tighter">Mesa</span>
                        <span className="text-[10px] font-black text-white">{s.playerCount}P</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-3 bg-black/40 border-t border-white/5 flex items-center justify-between group-hover:bg-sky-500/5 transition-colors">
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-500 group-hover:text-sky-400 transition-colors">Treinar Agora</span>
                    <Play className="w-3 h-3 text-gray-600 group-hover:text-sky-400 transition-all" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {filteredScenarios.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 bg-white/[0.01]"
              >
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-gray-600">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-gray-400 uppercase font-black tracking-widest text-xs">Nenhum cenário encontrado</p>
                  <p className="text-gray-600 text-[9px] uppercase font-bold mt-1">Tente ajustar seus filtros ou busca</p>
                </div>
                <button 
                  onClick={clearFilters} 
                  className="mt-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all"
                >
                  Limpar Tudo
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SelectionScreen;
