import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { RangeData, Scenario, ActionFrequency, BoardVariant } from '../types.ts';

interface ScenarioCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (s: Scenario, shouldClose?: boolean) => void;
  onDelete?: (id: string) => void;
  onTogglePublish?: (id: string) => void;
  scenarios?: Scenario[];
  isAdmin?: boolean;
}

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS = ['h', 'd', 's', 'c'];
const SCENARIO_DRAFT_KEY = 'lab11_scenario_draft';

const CUSTOM_PALETTE = [
  '#10b981', // Verde (Bet/Raise)
  '#f59e0b', // Amarelo/Âmbar (Bet Médio)
  '#f97316', // Laranja (Bet Alto)
  '#ef4444', // Vermelho (Overbet/All-in)
  '#8b5cf6', // Roxo
  '#ec4899', // Rosa
  '#06b6d4', // Ciano
  '#14b8a6', // Teal
];

const getActionColor = (label: string, index: number): string => {
  const l = label.toLowerCase();
  
  // Cores fixas para ações universais (Independente do índice)
  if (l.includes('fold')) return '#475569'; // Cinza slate
  if (l.includes('check')) return '#0ea5e9'; // Azul claro/Sky
  if (l.includes('call') || l.includes('pagar') || l === 'limp') return '#2563eb'; // Azul forte
  
  // Para todas as outras ações (BET BAIXO, BET MÉDIO, RAISE, etc), usamos a paleta baseada no índice.
  // Como a paleta começa com Verde, Amarelo, Laranja e Vermelho, ela seguirá naturalmente 
  // a lógica de intensidade de apostas se as ações forem criadas nessa ordem.
  return CUSTOM_PALETTE[Math.max(0, index) % CUSTOM_PALETTE.length];
};

const EMPTY_CELL_BG = '#0a0a0a';

const ScenarioCreatorModal: React.FC<ScenarioCreatorModalProps> = ({ isOpen, onClose, onSave, onDelete, onTogglePublish, scenarios = [], isAdmin = false }) => {
  const [step, setStep] = useState<number | 'manage' | 'quick'>(1);
  const [isDragging, setIsDragging] = useState(false);
  
  const [currentId, setCurrentId] = useState<string>(`sc-${Date.now()}`);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [modality, setModality] = useState('MTT');
  const [street, setStreet] = useState('PREFLOP');
  const [action, setAction] = useState('RFI');
  const [playerCount, setPlayerCount] = useState(9);
  const [heroPos, setHeroPos] = useState('BTN');
  const [opponents, setOpponents] = useState<string[]>([]);
  const [stackBB, setStackBB] = useState(100);
  const [heroBetSize, setHeroBetSize] = useState(2.5);
  const [opponentBetSize, setOpponentBetSize] = useState(2.2);
  const [initialPotBB, setInitialPotBB] = useState(5.5);
  const [board, setBoard] = useState<string[]>(['', '', '']);
  const [opponentAction, setOpponentAction] = useState('Check');
  const [customActions, setCustomActions] = useState<string[]>([]);
  const [newActionInput, setNewActionInput] = useState('');

  const [isPublished, setIsPublished] = useState(true);

  // Opponent Range mode
  const [useOpponentRanges, setUseOpponentRanges] = useState(false);
  const [opponentRangeData, setOpponentRangeData] = useState<RangeData>({});
  const [opponentCustomActions, setOpponentCustomActions] = useState<string[]>([]);
  const [heroRangesByActionData, setHeroRangesByActionData] = useState<Record<string, RangeData>>({});
  const [editingRangeTarget, setEditingRangeTarget] = useState<'hero' | 'opponent' | string>('hero');
  const [newOpponentActionInput, setNewOpponentActionInput] = useState('');

  const [rangeData, setRangeData] = useState<RangeData>({});
  const [variants, setVariants] = useState<BoardVariant[]>([]);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

  // Helper para atualizar o board e sincronizar com as variantes
  const updateBoard = (newBoard: string[]) => {
    setBoard(newBoard);
    if (activeVariantId && street !== 'PREFLOP') {
      setVariants(prev => {
        const updated = prev.map(v => v.id === activeVariantId ? { ...v, board: newBoard } : v);
        // Re-calcular duplicatas para todos
        return updated.map(v => {
          const flopStr = [...v.board].sort().join('');
          const isDup = updated.some(other => other.id !== v.id && [...other.board].sort().join('') === flopStr);
          return { ...v, isDuplicate: isDup };
        });
      });
    }
  };

  // Helper para atualizar as ações customizadas e sincronizar com as variantes
  const updateCustomActions = (newActions: string[]) => {
    setCustomActions(newActions);
    if (activeVariantId && street !== 'PREFLOP') {
      setVariants(prev => prev.map(v => v.id === activeVariantId ? { ...v, customActions: newActions } : v));
    }
  };

  // Helper para atualizar o range e sincronizar com as variantes
  const updateRangeData = (updater: (prev: RangeData) => RangeData) => {
    if (useOpponentRanges && editingRangeTarget === 'opponent') {
      setOpponentRangeData(prev => updater(prev));
    } else if (useOpponentRanges && editingRangeTarget !== 'hero' && editingRangeTarget !== 'opponent') {
      // Editing hero range for a specific opponent action
      const actionKey = editingRangeTarget;
      setHeroRangesByActionData(prev => ({
        ...prev,
        [actionKey]: updater(prev[actionKey] || {}),
      }));
    } else {
      setRangeData(prev => {
        const next = updater(prev);
        if (activeVariantId && street !== 'PREFLOP') {
          setVariants(vPrev => vPrev.map(v => v.id === activeVariantId ? { ...v, ranges: next } : v));
        }
        return next;
      });
    }
  };

  // Range e ações ativos baseado no target de edição
  const activeRangeData = useOpponentRanges
    ? (editingRangeTarget === 'opponent'
        ? opponentRangeData
        : editingRangeTarget !== 'hero'
          ? (heroRangesByActionData[editingRangeTarget] || {})
          : rangeData)
    : rangeData;

  const activeCustomActions = useOpponentRanges
    ? (editingRangeTarget === 'opponent'
        ? opponentCustomActions
        : customActions)
    : customActions;
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedFrequency, setSelectedFrequency] = useState(100);
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [lastAutosave, setLastAutosave] = useState<Date | null>(null);
  
  const [rangeText, setRangeText] = useState('');
  const [suitRangeText, setSuitRangeText] = useState('');
  const [gtoWizardText, setGtoWizardText] = useState('');
  const [pioSolverText, setPioSolverText] = useState('');
  const [bulkImportText, setBulkImportText] = useState('');
  const [bulkFlopText, setBulkFlopText] = useState('');
  const [bulkPreflopText, setBulkPreflopText] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showBulkFlopImport, setShowBulkFlopImport] = useState(false);
  const [showBulkPreflopImport, setShowBulkPreflopImport] = useState(false);

  // Quick Entry mode state
  const [quickBoard, setQuickBoard] = useState<string[]>(['', '', '']);
  const [quickActionTexts, setQuickActionTexts] = useState<Record<string, string>>({});
  const [quickPreviewRange, setQuickPreviewRange] = useState<RangeData>({});

  const [pendingDuplicateImport, setPendingDuplicateImport] = useState<{
    unique: BoardVariant[];
    conflicts: Array<{ incoming: BoardVariant; existing: BoardVariant }>;
  } | null>(null);

  const handleBulkFlopImport = () => {
    if (!bulkFlopText.trim()) {
      alert("Por favor, cole o texto antes de processar.");
      return;
    }

    console.log("Iniciando importação em massa conforme especificações...");
    try {
      // 1. O sistema vai ler o primeiro divisor "---"
      // Tudo antes do primeiro "---" (nome e descrição) é ignorado.
      const rawBlocks = bulkFlopText.split('---');
      if (rawBlocks.length < 2) {
        alert("Nenhum divisor '---' encontrado. O arquivo deve conter '---' para iniciar os cenários.");
        return;
      }

      // Ignora o primeiro bloco (header) e processa os demais
      const scenarioBlocks = rawBlocks.slice(1).map(b => b.trim()).filter(b => b.length > 0);
      const newVariants: BoardVariant[] = [];

      scenarioBlocks.forEach((block, bIdx) => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return;

        let flopCards: string[] = [];
        let currentAction = '';
        const ranges: RangeData = {};
        const variantActions: string[] = [];

        // c) Após o divisor vem o FLOP (primeira linha do bloco)
        const firstLine = lines[0];
        // Regex aprimorado para capturar ranks (A, K, Q, J, T, 10, 2-9) e naipes (h, d, s, c)
        const cardRegex = /(10|[2-9TJQKA])[hdsc]/gi;
        const cards = firstLine.match(cardRegex);

        if (cards && cards.length >= 3) {
          flopCards = cards.slice(0, 3).map(c => {
            let val = c.toUpperCase();
            if (val.startsWith('10')) val = 'T' + val.slice(2);
            return val;
          });
          console.log(`Flop ${bIdx + 1} detectado:`, flopCards);

          // d) Após as cartas do flop vem as ações e e) Abaixo de cada ação, o sistema vai ler as mãos
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            
            // Detectar Ação com prefixo (ex: AÇÃO: BET BAIXO ou ACTION: CHECK)
            const actionMatch = line.match(/^(?:AÇÃO|ACAO|ACTION):\s*(.+)$/i);
            if (actionMatch) {
              currentAction = actionMatch[1].trim();
              if (currentAction && !variantActions.includes(currentAction)) {
                variantActions.push(currentAction);
              }
              continue;
            }

            if (line.includes(':')) {
              // É uma linha de range (mão: frequencia)
              if (!currentAction) continue;
              
              const parts = line.split(',').map(p => p.trim()).filter(p => p.length > 0);
              parts.forEach(part => {
                if (!part.includes(':')) return;
                const [combo, freqStr] = part.split(':').map(s => s.trim());
                if (!combo || !freqStr) return;
                
                let freq = parseFloat(freqStr);
                if (isNaN(freq)) return;
                if (freq <= 1.0 && freq > 0) freq *= 100;

                // Normalização crucial: Rank em Maiúsculo, Naipe/Tipo em Minúsculo (ex: 3d3c -> 3d3c, AKs -> AKs)
                let normalizedCombo = combo.trim().toUpperCase().replace(/10/g, 'T');
                if (normalizedCombo.length === 4) {
                  normalizedCombo = normalizedCombo[0] + normalizedCombo[1].toLowerCase() + 
                                   normalizedCombo[2] + normalizedCombo[3].toLowerCase();
                } else if (normalizedCombo.length === 3) {
                  normalizedCombo = normalizedCombo.slice(0, 2) + normalizedCombo[2].toLowerCase();
                } else if (normalizedCombo.length === 2 && normalizedCombo[0] !== normalizedCombo[1]) {
                  // Se for AK, vira AKo
                  normalizedCombo = normalizedCombo + 'o';
                }

                if (!ranges[normalizedCombo]) ranges[normalizedCombo] = {};
                
                // Acumula frequências para a mesma ação se necessário
                ranges[normalizedCombo][currentAction] = Math.min(100, (ranges[normalizedCombo][currentAction] || 0) + freq);
              });
            } else {
              // f) O sistema vai automaticamente criar as ações (linhas sem :)
              // Ignora linhas que parecem ser mãos mas não tem :
              const isHand = /^[2-9TJQKA]{2,4}[sdhc]?$/i.test(line);
              if (!isHand) {
                currentAction = line;
                if (!variantActions.includes(currentAction)) {
                  variantActions.push(currentAction);
                }
              }
            }
          }
        }

        if (flopCards.length === 3) {
          console.log(`Bloco ${bIdx + 1}: Flop ${flopCards.join('')}, Ações: ${variantActions.join(', ')}`);
          console.log(`Ranges parsed para o bloco ${bIdx + 1}:`, ranges);

          newVariants.push({
            id: `v-bulk-${Date.now()}-${bIdx}-${Math.random().toString(36).substr(2, 5)}`,
            board: flopCards,
            ranges: ranges,
            customActions: variantActions.length > 0 ? variantActions : undefined,
          });
        } else {
          console.warn(`Bloco ${bIdx + 1} ignorado: Flop não detectado na primeira linha após '---'.`);
        }
      });

      if (newVariants.length === 0) {
        alert("Nenhum cenário válido foi processado. Verifique se o FLOP está na linha imediatamente após o '---'.");
        return;
      }

      // Dedup dentro do próprio batch (manter o último de cada flop)
      const batchSeen = new Map<string, BoardVariant>();
      newVariants.forEach(v => {
        const key = [...v.board].sort().join('');
        batchSeen.set(key, v);
      });
      const dedupedVariants = Array.from(batchSeen.values());

      // Separar únicos vs conflitos com os existentes
      const uniqueVariants: BoardVariant[] = [];
      const conflictPairs: Array<{ incoming: BoardVariant; existing: BoardVariant }> = [];

      dedupedVariants.forEach(incoming => {
        const key = [...incoming.board].sort().join('');
        const existing = variants.find(v => [...v.board].sort().join('') === key);
        if (existing) {
          conflictPairs.push({ incoming, existing });
        } else {
          uniqueVariants.push(incoming);
        }
      });

      if (conflictPairs.length > 0) {
        // Mostrar modal de confirmação
        setPendingDuplicateImport({ unique: uniqueVariants, conflicts: conflictPairs });
      } else {
        // Sem conflitos — adicionar direto
        const wasEmpty = variants.length === 0;
        setVariants(prev => [...prev, ...uniqueVariants]);
        if (!activeVariantId || wasEmpty) {
          const first = uniqueVariants[0];
          setActiveVariantId(first.id);
          setBoard(first.board);
          setRangeData(first.ranges);
          setCustomActions(first.customActions || ['Fold', 'Call', 'Raise']);
        }
        setBulkFlopText('');
        setShowBulkFlopImport(false);
      }
    } catch (e) {
      console.error("Erro na importação:", e);
      alert("Ocorreu um erro ao processar o arquivo. Verifique o formato do texto.");
    }
  };

  const applyImport = (choice: 'replace' | 'skip' | 'keepBoth') => {
    if (!pendingDuplicateImport) return;
    const { unique, conflicts } = pendingDuplicateImport;

    let toAdd: BoardVariant[] = [...unique];

    if (choice === 'replace') {
      // Remove os existentes conflitantes e adiciona os novos
      const conflictKeys = new Set(conflicts.map(c => [...c.existing.board].sort().join('')));
      setVariants(prev => {
        const filtered = prev.filter(v => !conflictKeys.has([...v.board].sort().join('')));
        return [...filtered, ...toAdd, ...conflicts.map(c => c.incoming)];
      });
      toAdd = [...toAdd, ...conflicts.map(c => c.incoming)];
    } else if (choice === 'skip') {
      // Só adiciona os únicos, ignora conflitos
      setVariants(prev => [...prev, ...toAdd]);
    } else {
      // keepBoth — adiciona tudo (novo recebe novo id, já tem)
      const extras = conflicts.map(c => ({ ...c.incoming, id: `v-keep-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` }));
      toAdd = [...toAdd, ...extras];
      setVariants(prev => [...prev, ...toAdd]);
    }

    // Ativar primeira se não havia variante ativa
    const wasEmpty = variants.length === 0;
    if ((!activeVariantId || wasEmpty) && toAdd.length > 0) {
      const first = toAdd[0];
      setActiveVariantId(first.id);
      setBoard(first.board);
      setRangeData(first.ranges);
      setCustomActions(first.customActions || ['Fold', 'Call', 'Raise']);
    }

    const total = choice === 'skip' ? unique.length : unique.length + conflicts.length;
    // importação concluída
    setPendingDuplicateImport(null);
    setBulkFlopText('');
    setShowBulkFlopImport(false);
  };

  const handleBulkImport = () => {
    try {
      const data = JSON.parse(bulkImportText);
      const scenariosToImport = Array.isArray(data) ? data : [data];
      
      scenariosToImport.forEach((s: any, idx: number) => {
        if (s.name && s.ranges) {
          const newScenario: Scenario = {
            ...s,
            id: s.id || `sc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
          // Só fecha o modal na última iteração (ou nem fecha, já que estamos no modo bulk)
          onSave?.(newScenario, false);
        }
      });
      
      // importação concluída
      setBulkImportText('');
      setShowBulkImport(false);
      setStep('manage');
    } catch (e) {
      alert('Erro ao importar JSON. Verifique o formato.');
      console.error(e);
    }
  };

  // Importação em massa de range preflop por texto
  const handleBulkPreflopImport = () => {
    if (!bulkPreflopText.trim()) return;

    try {
      const rawBlocks = bulkPreflopText.split('---');
      // Primeiro bloco pode ser título/descrição — ignorado se não tiver ":"
      const newRangeData: RangeData = {};
      const newActions: string[] = [];
      let currentAction = '';

      rawBlocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return;

        lines.forEach(line => {
          // Detectar header de ação (ex: "AÇÃO: FOLD" ou "FOLD" ou "RAISE 2.5")
          const actionMatch = line.match(/^(?:AÇÃO|ACAO|ACTION):\s*(.+)$/i);
          if (actionMatch) {
            currentAction = actionMatch[1].trim();
            if (currentAction && !newActions.includes(currentAction)) newActions.push(currentAction);
            return;
          }

          // Se a linha tem ":" provavelmente é combo: freq
          if (line.includes(':')) {
            const parts = line.split(',').map(p => p.trim()).filter(p => p.length > 0);
            parts.forEach(part => {
              if (!part.includes(':')) return;
              const [combo, freqStr] = part.split(':').map(s => s.trim());
              if (!combo || !freqStr) return;
              let freq = parseFloat(freqStr);
              if (isNaN(freq)) return;
              if (freq <= 1.0 && freq > 0) freq *= 100;

              // Normalizar combo
              let normalized = combo.trim().toUpperCase().replace(/10/g, 'T');
              if (normalized.length === 4) {
                normalized = normalized[0] + normalized[1].toLowerCase() + normalized[2] + normalized[3].toLowerCase();
              } else if (normalized.length === 3) {
                normalized = normalized.slice(0, 2) + normalized[2].toLowerCase();
              } else if (normalized.length === 2 && normalized[0] !== normalized[1]) {
                normalized = normalized + 'o';
              }

              if (currentAction) {
                if (!newRangeData[normalized]) newRangeData[normalized] = {};
                newRangeData[normalized][currentAction] = Math.min(100, (newRangeData[normalized][currentAction] || 0) + freq);
              }
            });
          } else {
            // Linha sem ":" pode ser um header de ação simples (ex: "FOLD", "RAISE 2.5")
            const normalizedLine = line.replace(/10/g, 'T');
            const isCombo = /^[2-9TJQKA]{2}[so]?$/i.test(normalizedLine);
            if (!isCombo && line.length >= 2 && !/^\d/.test(line)) {
              currentAction = line;
              if (!newActions.includes(currentAction)) newActions.push(currentAction);
            }
          }
        });
      });

      if (Object.keys(newRangeData).length > 0) {
        if (newActions.length > 0) setCustomActions(newActions);
        updateRangeData(prev => {
          const merged = { ...prev };
          Object.entries(newRangeData).forEach(([hand, freqs]) => {
            merged[hand] = { ...(merged[hand] || {}), ...freqs };
          });
          return merged;
        });
        setBulkPreflopText('');
        setShowBulkPreflopImport(false);
      }
    } catch (e) {
      console.error('Erro na importação preflop:', e);
    }
  };

  // Quick Entry: parse all action textareas into a preview range
  const parseQuickTexts = (texts: Record<string, string>): RangeData => {
    const result: RangeData = {};
    Object.entries(texts).forEach(([actionName, text]) => {
      if (!text.trim()) return;
      const parts = text.split(/[,;\n]+/).map(p => p.trim()).filter(p => p.length > 0);
      parts.forEach(part => {
        const subParts = part.split(/[:=]/).map(s => s.trim());
        let combo = '', freq = 100;
        if (subParts.length >= 2) {
          combo = subParts[0]; freq = parseFloat(subParts[1]);
          if (isNaN(freq)) return;
          if (freq <= 1.0 && freq > 0) freq *= 100;
        } else {
          combo = subParts[0];
        }
        combo = combo.toUpperCase().replace(/10/g, 'T');
        if (combo.length === 4) {
          combo = combo[0] + combo[1].toLowerCase() + combo[2] + combo[3].toLowerCase();
        } else if (combo.length === 3) {
          combo = combo.slice(0, 2) + combo[2].toLowerCase();
        } else if (combo.length === 2 && combo[0] !== combo[1]) {
          combo = combo + 'o';
        }
        if (combo.length >= 2 && combo.length <= 5) {
          if (!result[combo]) result[combo] = {};
          result[combo][actionName] = Math.min(100, (result[combo][actionName] || 0) + freq);
        }
      });
    });
    return result;
  };

  const handleQuickActionTextChange = (actionName: string, text: string) => {
    const next = { ...quickActionTexts, [actionName]: text };
    setQuickActionTexts(next);
    setQuickPreviewRange(parseQuickTexts(next));
  };

  const handleQuickSaveFlop = () => {
    const boardCards = quickBoard.map(c => c.trim().toUpperCase().replace(/10/g, 'T')).map(c => {
      if (c.length === 2) return c[0] + c[1].toLowerCase();
      return c;
    });
    if (boardCards.filter(c => c.length === 2).length < 3) return; // Precisa de 3 cartas válidas

    const ranges = parseQuickTexts(quickActionTexts);
    if (Object.keys(ranges).length === 0) return;

    const actionsUsed = [...new Set(Object.values(ranges).flatMap(f => Object.keys(f)))];

    // Add as variant
    const newId = `v-${Date.now()}`;
    const flopStr = [...boardCards].sort().join('');
    const isDuplicate = variants.some(v => [...v.board].sort().join('') === flopStr);
    const newVariant: BoardVariant = {
      id: newId,
      board: boardCards,
      ranges,
      customActions: actionsUsed.length > 0 ? actionsUsed : customActions,
      isDuplicate,
    };
    setVariants(prev => [...prev, newVariant]);

    // Update customActions if new actions found
    const merged = new Set([...customActions, ...actionsUsed]);
    if (merged.size > customActions.length) setCustomActions([...merged]);

    // Reset quick entry for next flop
    setQuickBoard(['', '', '']);
    setQuickActionTexts({});
    setQuickPreviewRange({});
  };

  const handleQuickPublishAll = () => {
    if (variants.length === 0) return;
    // Use first variant's data as the main scenario range
    const first = variants[0];
    setRangeData(first.ranges);
    setBoard(first.board);
    setActiveVariantId(first.id);

    const scenario = buildScenarioObject(true);
    if (onSave) onSave(scenario, true);
    resetForm();
  };

  // Autosave timer effect
  useEffect(() => {
    if (!isOpen || step === 'manage') return;

    const interval = setInterval(() => {
      const draft = {
        currentId, name, description, videoLink, modality, street, action,
        playerCount, heroPos, opponents, stackBB, heroBetSize, opponentBetSize, initialPotBB, board, opponentAction, customActions, rangeData, variants, activeVariantId, step,
        useOpponentRanges, opponentRangeData, opponentCustomActions, heroRangesByActionData
      };
      localStorage.setItem(SCENARIO_DRAFT_KEY, JSON.stringify(draft));
      setLastAutosave(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [isOpen, step, currentId, name, description, videoLink, modality, street, action, playerCount, heroPos, opponents, stackBB, heroBetSize, opponentBetSize, customActions, rangeData, variants, activeVariantId, useOpponentRanges, opponentRangeData, opponentCustomActions, heroRangesByActionData]);

  useEffect(() => {
    if (isOpen && !name) {
      const savedDraft = localStorage.getItem(SCENARIO_DRAFT_KEY);
      if (savedDraft) {
        if (window.confirm('Um rascunho de cenário anterior foi encontrado. Deseja recuperá-lo?')) {
          try {
            const d = JSON.parse(savedDraft);
            setCurrentId(d.currentId); setName(d.name); setDescription(d.description);
            setVideoLink(d.videoLink); setModality(d.modality); setStreet(d.street);
            setAction(d.action); setPlayerCount(d.playerCount); setHeroPos(d.heroPos);
            setOpponents(d.opponents || []); setStackBB(d.stackBB); setHeroBetSize(d.heroBetSize || 2.5);
            setOpponentBetSize(d.opponentBetSize || 2.2);
            setInitialPotBB(d.initialPotBB || 5.5);
            setBoard(d.board || ['', '', '']);
            setOpponentAction(d.opponentAction || 'Check');
            setCustomActions(d.customActions || []); setRangeData(d.rangeData || {});
            setVariants(d.variants || []); setActiveVariantId(d.activeVariantId || null);
            setStep(d.step || 1);
            setUseOpponentRanges(d.useOpponentRanges || false);
            setOpponentRangeData(d.opponentRangeData || {});
            setOpponentCustomActions(d.opponentCustomActions || []);
            setHeroRangesByActionData(d.heroRangesByActionData || {});
          } catch (e) { console.error('Falha ao restaurar rascunho', e); }
        } else {
          localStorage.removeItem(SCENARIO_DRAFT_KEY);
        }
      }
    }
  }, [isOpen]);

  const availablePositions = useMemo(() => {
    if (playerCount === 2) return ['BTN', 'SB'];
    if (playerCount <= 4) return ['CO', 'BTN', 'SB', 'BB'];
    if (playerCount <= 6) return ['LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    return ['UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  }, [playerCount]);

  useEffect(() => {
    if (!availablePositions.includes(heroPos)) {
      setHeroPos(availablePositions[0] || 'BTN');
    }
    setOpponents(prev => {
      const filtered = prev.filter(pos => availablePositions.includes(pos) && pos !== heroPos);
      return filtered.length !== prev.length ? filtered : prev;
    });
  }, [playerCount, availablePositions, heroPos]);

  useEffect(() => {
    if (customActions.length === 0) {
      if (street === 'PREFLOP') {
        if (action === 'RFI') setCustomActions(['Fold', 'Raise']);
        else if (action === 'open shove') setCustomActions(['Fold', 'All-In']);
        else if (action === 'limp') setCustomActions(['Fold', 'Limp']);
        else if (action === 'iso') setCustomActions(['Fold', 'Limp', 'Raise']);
        else setCustomActions(['Fold', 'Call', 'Raise']);
      } else {
        setCustomActions(['Fold', 'Call', 'Raise']);
      }
    }
  }, [action, street, customActions]);

  const isReRaiseAction = useMemo(() => {
    const a = action.toLowerCase();
    return a.includes('3-bet') || a.includes('4-bet') || a.includes('squeeze') || a.includes('iso');
  }, [action]);

  const loadScenarioToEdit = (s: Scenario) => {
    setCurrentId(s.id);
    setName(s.name);
    setDescription(s.description || '');
    setVideoLink(s.videoLink || '');
    setModality(s.modality);
    setStreet(s.street);
    setAction(s.preflopAction);
    setPlayerCount(s.playerCount);
    setHeroPos(s.heroPos);
    setOpponents(s.opponents || []);
    setStackBB(s.stackBB);
    setHeroBetSize(s.heroBetSize || 2.5);
    setOpponentBetSize(s.opponentBetSize || 2.2);
    setInitialPotBB(s.initialPotBB || 5.5);
    setBoard(s.board || ['', '', '']);
    setOpponentAction(s.opponentAction || 'Check');
    setRangeData(s.ranges || {});
    
    // Inteligência de Migração: Se for pós-flop e não tiver variantes, 
    // converte o board/range atual em uma variante para garantir o acúmulo.
    let initialVariants = s.variants || [];
    if (s.street !== 'PREFLOP' && initialVariants.length === 0 && s.ranges) {
      initialVariants = [{
        id: `v-legacy-${Date.now()}`,
        board: s.board || ['', '', ''],
        ranges: s.ranges
      }];
    }
    
    setVariants(initialVariants);
    if (initialVariants.length > 0) {
      setActiveVariantId(initialVariants[0].id);
      setBoard(initialVariants[0].board);
      setRangeData(initialVariants[0].ranges);
    } else {
      setActiveVariantId(null);
    }
    setCustomActions(s.customActions || []);
    setIsPublished(s.isPublished ?? true);
    // Opponent range state
    const hasOppRanges = s.opponentRanges && Object.keys(s.opponentRanges).length > 0;
    setUseOpponentRanges(!!hasOppRanges);
    setOpponentRangeData(s.opponentRanges || {});
    setOpponentCustomActions(s.opponentActions || []);
    setHeroRangesByActionData(s.heroRangesByAction || {});
    setEditingRangeTarget('hero');
    setStep(1);
  };

  const duplicateScenario = (s: Scenario) => {
    const newId = `sc-${Date.now()}`;
    const newName = `${s.name} (Cópia)`;
    setCurrentId(newId);
    setName(newName);
    setDescription(s.description || '');
    setVideoLink(s.videoLink || '');
    setModality(s.modality);
    setStreet(s.street);
    setAction(s.preflopAction);
    setPlayerCount(s.playerCount);
    setHeroPos(s.heroPos);
    setOpponents(s.opponents || []);
    setStackBB(s.stackBB);
    setHeroBetSize(s.heroBetSize || 2.5);
    setOpponentBetSize(s.opponentBetSize || 2.2);
    setInitialPotBB(s.initialPotBB || 5.5);
    setBoard(s.board || ['', '', '']);
    setOpponentAction(s.opponentAction || 'Check');
    setRangeData(JSON.parse(JSON.stringify(s.ranges || {})));
    setVariants(JSON.parse(JSON.stringify(s.variants || [])));
    if (s.variants && s.variants.length > 0) {
      setActiveVariantId(s.variants[0].id);
    } else {
      setActiveVariantId(null);
    }
    setCustomActions([...(s.customActions || [])]);
    setIsPublished(false); // Cópia começa como rascunho
    // Opponent range state
    const hasOppRanges = s.opponentRanges && Object.keys(s.opponentRanges).length > 0;
    setUseOpponentRanges(!!hasOppRanges);
    setOpponentRangeData(JSON.parse(JSON.stringify(s.opponentRanges || {})));
    setOpponentCustomActions([...(s.opponentActions || [])]);
    setHeroRangesByActionData(JSON.parse(JSON.stringify(s.heroRangesByAction || {})));
    setEditingRangeTarget('hero');
    setStep(1);
  };

  const toggleOpponent = useCallback((pos: string) => {
    setOpponents(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]);
  }, []);

  const availableRangeActions = useMemo(() => {
    const actions = activeCustomActions.length > 0 ? activeCustomActions : customActions;
    if (actions.length > 0) return actions;
    return ['Fold', 'Call', 'Raise'].filter(a => a !== '');
  }, [customActions, activeCustomActions]);

  const updateHandAction = (draft: RangeData, hand: string, actionName: string, freq: number, accumulate = false) => {
    const current = draft[hand] || {};
    if (accumulate) {
      const prevFreq = current[actionName] || 0;
      // Soma a nova frequência à existente, limitada a 100%
      draft[hand] = { ...current, [actionName]: Math.min(100, prevFreq + freq) };
    } else {
      draft[hand] = { ...current, [actionName]: freq };
    }
  };

  const clearHand = useCallback((handKey: string) => {
    updateRangeData(prev => { 
        const next = { ...prev }; 
        delete next[handKey];
        Object.keys(next).forEach(k => {
           if (k.length === 4) {
              const r1 = k[0]; const s1 = k[1]; const r2 = k[2]; const s2 = k[3];
              let genericKey = r1 === r2 ? r1 + r1 : (RANKS.indexOf(r1) < RANKS.indexOf(r2) ? r1 + r2 : r2 + r1) + (s1 === s2 ? 's' : 'o');
              if (genericKey === handKey) delete next[k];
           }
        });
        return next; 
    });
  }, [activeVariantId, street]);

  const applyActionToHand = useCallback((handKey: string) => {
    if (isEraserMode) { clearHand(handKey); return; }
    if (!selectedAction) return;
    updateRangeData(prev => {
      const next = { ...prev };
      updateHandAction(next, handKey, selectedAction, selectedFrequency);
      return next;
    });
  }, [selectedAction, selectedFrequency, isEraserMode, clearHand, activeVariantId, street]);

  const handleMouseDown = (hand: string, e: React.MouseEvent) => {
    if (e.button === 2) { clearHand(hand); return; }
    setIsDragging(true); applyActionToHand(hand);
  };

  const handleMouseEnter = (hand: string) => { if (isDragging) applyActionToHand(hand); };
  const handleMouseUp = () => setIsDragging(false);
  useEffect(() => { window.addEventListener('mouseup', handleMouseUp); return () => window.removeEventListener('mouseup', handleMouseUp); }, []);

  const getCellStyles = (handKey: string) => {
    const r1 = handKey[0]; const r2 = handKey[1];
    const isSuited = handKey.endsWith('s'); const isPair = handKey.length === 2;
    
    // 1. Identificar combos possíveis considerando o board (blockers)
    const normalizedBoard = board.map(c => {
      if (!c) return '';
      let val = c.trim().toUpperCase().replace(/10/g, 'T');
      if (val.length === 2) {
        return val[0] + val[1].toLowerCase();
      }
      return val;
    }).filter(c => c.length === 2);

    const possibleCombos: string[] = [];
    for (const s1 of SUITS) {
      for (const s2 of SUITS) {
        const c1 = r1 + s1;
        const c2 = r2 + s2;
        
        // Se alguma das cartas está no board, o combo é impossível
        if (normalizedBoard.includes(c1) || normalizedBoard.includes(c2)) continue;

        if (isPair) {
          // Para pares, evitamos duplicatas (AhAd é o mesmo que AdAh)
          if (SUITS.indexOf(s1) < SUITS.indexOf(s2)) {
            possibleCombos.push(c1 + c2);
          }
        } else if (isSuited) {
          if (s1 === s2) possibleCombos.push(c1 + c2);
        } else {
          if (s1 !== s2) possibleCombos.push(c1 + c2);
        }
      }
    }

    const totalPossible = possibleCombos.length;
    if (totalPossible === 0) return { backgroundColor: '#0f172a', color: '#1e293b', opacity: 0.4 };

    const aggregated: ActionFrequency = {};
    
    // Mapear dados por combo específico
    const comboMap: Record<string, ActionFrequency> = {};
    
    // Primeiro, preenchemos com o dado genérico se existir
    const currentRange = activeRangeData;
    const handData = currentRange[handKey];
    if (handData) {
      possibleCombos.forEach(c => {
        comboMap[c] = Object.assign({}, handData);
      });
    }

    // Depois, sobrepomos com dados de combos específicos se existirem
    Object.entries(currentRange).forEach(([k, data]) => {
      // Normaliza o combo para comparação
      const normalizedK = k.replace(/10/g, 'T');
      if (normalizedK.length !== 4) return;
      
      const cr1 = normalizedK[0]; const cs1 = normalizedK[1]; const cr2 = normalizedK[2]; const cs2 = normalizedK[3];
      const ranksMatch = (cr1 === r1 && cr2 === r2) || (cr1 === r2 && cr2 === r1);
      if (!ranksMatch) return;
      
      const suitMatch = isPair ? cr1 === cr2 : isSuited ? cs1 === cs2 : cs1 !== cs2;
      if (!suitMatch) return;

      // Se o combo está na lista de possíveis, atualizamos
      const comboKey1 = cr1 + cs1 + cr2 + cs2;
      const comboKey2 = cr2 + cs2 + cr1 + cs1;
      
      if (data && possibleCombos.includes(comboKey1)) {
        comboMap[comboKey1] = Object.assign({}, data);
      } else if (data && possibleCombos.includes(comboKey2)) {
        comboMap[comboKey2] = Object.assign({}, data);
      }
    });

    // Agora agregamos as frequências de todos os combos possíveis
    Object.values(comboMap).forEach(data => {
      Object.entries(data).forEach(([act, freq]) => {
        aggregated[act] = (aggregated[act] || 0) + ((freq as number) / totalPossible);
      });
    });

    // Normalização: Se a soma das frequências ultrapassar 100%, normalizamos para que o total seja 100%
    // Isso evita que ações fiquem "escondidas" no gradiente CSS.
    const totalFreqSum = Object.values(aggregated).reduce((a, b) => a + b, 0);
    if (totalFreqSum > 100) {
      Object.keys(aggregated).forEach(k => {
        aggregated[k] = (aggregated[k] * 100) / totalFreqSum;
      });
    }

    // Se houver uma ação "Fold" definida, garantimos que ela pegue o resto se o total for < 100
    const currentTotal = Object.values(aggregated).reduce((a, b) => a + b, 0);
    const foldAction = availableRangeActions.find(a => a.toLowerCase().includes('fold'));
    if (currentTotal < 99.9 && foldAction) {
      aggregated[foldAction] = (aggregated[foldAction] || 0) + (100 - currentTotal);
    }

    if (Object.keys(aggregated).length === 0) return { backgroundColor: EMPTY_CELL_BG, color: '#475569' };
    
    let cumulative = 0;
    const gradientParts = Object.entries(aggregated)
      .sort((a, b) => {
        const aLow = a[0].toLowerCase();
        const bLow = b[0].toLowerCase();
        if (aLow.includes('fold')) return 1;
        if (bLow.includes('fold')) return -1;
        return 0;
      })
      .map(([act, freq]) => {
        const start = cumulative.toFixed(1);
        cumulative += (freq as number);
        const end = Math.min(cumulative, 100).toFixed(1);
        return `${getActionColor(act, availableRangeActions.indexOf(act))} ${start}% ${end}%`;
      });

    if (cumulative < 99.99) {
      gradientParts.push(`${EMPTY_CELL_BG} ${cumulative.toFixed(2)}% 100%`);
    }
    
    return { 
      background: `linear-gradient(to right, ${gradientParts.join(', ')})`, 
      color: (cumulative > 50 && (aggregated['Fold'] || 0) < 50) ? 'white' : '#94a3b8',
      border: 'none',
      boxShadow: 'none'
    };
  };

  const parseRangeText = () => {
    if (!rangeText.trim()) return;
    if (!selectedAction) {
      alert("Por favor, selecione uma ação para pintar o range primeiro.");
      return;
    }
    
    // Normaliza 10 para T no texto de entrada
    const normalizedText = rangeText.toUpperCase().replace(/10/g, 'T');
    
    const parts = normalizedText.split(',').map(p => p.trim());
    const newRangeData = { ...rangeData };

    parts.forEach(part => {
      // Pairs like AA-TT or 55+
      if (/^[2-9TJQK A]{2}(\+|-|$)/.test(part)) {
        if (part.includes('-')) {
          const [top, bottom] = part.split('-').map(p => p[0]);
          const topIdx = RANKS.indexOf(top);
          const bottomIdx = RANKS.indexOf(bottom);
          for (let i = topIdx; i <= bottomIdx; i++) {
            updateHandAction(newRangeData, RANKS[i] + RANKS[i], selectedAction, selectedFrequency, true);
          }
        } else if (part.endsWith('+')) {
          const rank = part[0];
          const idx = RANKS.indexOf(rank);
          for (let i = 0; i <= idx; i++) {
            updateHandAction(newRangeData, RANKS[i] + RANKS[i], selectedAction, selectedFrequency, true);
          }
        } else {
          updateHandAction(newRangeData, part.substring(0, 2), selectedAction, selectedFrequency, true);
        }
      } 
      // Suited/Offsuit like AKs-AQs, T9s+, AKo
      else if (/^[2-9TJQK A]{2}[so](\+|-|$)/.test(part)) {
        const r1 = part[0]; const r2 = part[1]; const type = part[2];
        if (part.includes('-')) {
           const bottomPart = part.split('-')[1];
           const bottomR2 = bottomPart[1];
           const startIdx = RANKS.indexOf(r2);
           const endIdx = RANKS.indexOf(bottomR2);
           for (let i = startIdx; i <= endIdx; i++) {
             updateHandAction(newRangeData, r1 + RANKS[i] + type, selectedAction, selectedFrequency, true);
           }
        } else if (part.endsWith('+')) {
           const idx = RANKS.indexOf(r2);
           const stopIdx = RANKS.indexOf(r1) + 1;
           for (let i = stopIdx; i <= idx; i++) {
             updateHandAction(newRangeData, r1 + RANKS[i] + type, selectedAction, selectedFrequency, true);
           }
        } else {
           updateHandAction(newRangeData, r1 + r2 + type, selectedAction, selectedFrequency, true);
        }
      }
    });
    updateRangeData(() => newRangeData);
    setRangeText('');
  };

  const parseSuitRangeText = () => {
    if (!suitRangeText.trim()) return;
    if (!selectedAction) {
      alert("Por favor, selecione uma ação para pintar o range primeiro.");
      return;
    }
    
    // Normaliza 10 para T
    const normalizedText = suitRangeText.replace(/10/g, 'T');
    
    const parts = normalizedText.split(',').map(p => p.trim());
    const newRangeData = { ...rangeData };
    parts.forEach(p => {
      if (p.length === 4) {
        updateHandAction(newRangeData, p, selectedAction, selectedFrequency, true);
      }
    });
    updateRangeData(() => newRangeData);
    setSuitRangeText('');
  };

  const parseGtoWizardRange = () => {
    if (!gtoWizardText.trim()) return;
    
    const newRangeData = { ...rangeData };
    const newActions = [...customActions];
    let addedCount = 0;
    let currentAction = selectedAction;
    let textToProcess = gtoWizardText;

    // 1. Processar blocos [freq]combos[/freq] (formato Simple Postflop/Pio)
    const tagRegex = /\[([\d.]+)\](.*?)\[\/[\d.]+\]/gs;
    let match;
    while ((match = tagRegex.exec(gtoWizardText)) !== null) {
      const freqStr = match[1];
      const combosStr = match[2];
      let freq = parseFloat(freqStr);
      if (freq <= 1.0) freq *= 100;
      
      // Aqui podemos manter o split por espaço pois dentro da tag os combos são apenas nomes
      const combos = combosStr.split(/[,; ]+/).map(c => c.trim()).filter(c => c.length > 0);
      combos.forEach(combo => {
        const normalizedCombo = combo.replace(/10/g, 'T');
        if (normalizedCombo.length >= 2 && normalizedCombo.length <= 5 && currentAction) {
          updateHandAction(newRangeData, normalizedCombo, currentAction, freq, true);
          addedCount++;
        }
      });
      textToProcess = textToProcess.replace(match[0], ' ');
    }

    // 2. Processar linha a linha para detectar headers e combos
    const lines = textToProcess.split(/[\n\r]+/);
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Detectar se a linha é um header de ação (ex: "CHECK", "C-BET BAIXO")
      // Critérios: não tem ':', não é um combo curto, não começa com número
      const normalizedForCheck = trimmedLine.replace(/10/g, 'T');
      const isCombo = /^[2-9TJQK A]{2}[so]?$/.test(normalizedForCheck) || /^[2-9TJQK A][hdsc][2-9TJQK A][hdsc]$/.test(normalizedForCheck);
      
      if (!trimmedLine.includes(':') && !isCombo && trimmedLine.length > 2 && !/^\d/.test(trimmedLine)) {
        const matchedAction = newActions.find(a => a.toLowerCase() === trimmedLine.toLowerCase());
        if (matchedAction) {
          currentAction = matchedAction;
        } else {
          newActions.push(trimmedLine);
          currentAction = trimmedLine;
        }
        return;
      }

      // Processar combos na linha - IMPORTANTE: não splitar por espaço aqui para não quebrar "combo: freq"
      const parts = trimmedLine.split(/[,;]+/).map(p => p.trim()).filter(p => p.length > 0);
      parts.forEach(part => {
        const subParts = part.split(/[:=]/).map(s => s.trim());
        if (subParts.length >= 2) {
          let combo = subParts[0].replace(/10/g, 'T');
          let freq = parseFloat(subParts[1]);
          if (!isNaN(freq) && currentAction) {
            if (freq <= 1.0) freq *= 100;
            updateHandAction(newRangeData, combo, currentAction, freq, true);
            addedCount++;
          }
        } else if (subParts.length === 1) {
          let combo = subParts[0].replace(/10/g, 'T');
          if (combo.length >= 2 && combo.length <= 5 && currentAction) {
            updateHandAction(newRangeData, combo, currentAction, 100, true);
            addedCount++;
          }
        }
      });
    });

    if (addedCount > 0) {
      if (newActions.length !== customActions.length) {
        setCustomActions(newActions);
      }
      updateRangeData(() => newRangeData);
      setGtoWizardText('');
      // importação concluída
    } else {
      alert("Nenhum combo válido encontrado. Verifique se selecionou uma ação ou se o texto contém cabeçalhos.");
    }
  };

  const parsePioSolverRange = () => {
    if (!pioSolverText.trim()) return;
    if (!selectedAction) {
      alert('Selecione uma ação antes de importar do PioSolver.');
      return;
    }

    // Rank order for determining higher card
    const RANK_ORDER = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
    const rankIdx = (r: string) => RANK_ORDER.indexOf(r);

    // Convert a specific combo (e.g. "AhKd") to abstract hand type (e.g. "AKo")
    const comboToHandType = (card1: string, card2: string): string | null => {
      if (card1.length !== 2 || card2.length !== 2) return null;
      const r1 = card1[0].toUpperCase().replace('10','T');
      const s1 = card1[1].toLowerCase();
      const r2 = card2[0].toUpperCase().replace('10','T');
      const s2 = card2[1].toLowerCase();
      if (!RANK_ORDER.includes(r1) || !RANK_ORDER.includes(r2)) return null;
      if (!['h','d','c','s'].includes(s1) || !['h','d','c','s'].includes(s2)) return null;
      if (r1 === r2) return r1 + r2; // pair: AA, KK…
      const [high, highS, low, lowS] = rankIdx(r1) > rankIdx(r2)
        ? [r1, s1, r2, s2] : [r2, s2, r1, s1];
      return high + low + (highS === lowS ? 's' : 'o');
    };

    // Aggregate: sum frequencies and count combos per hand type
    const acc: Record<string, { sum: number; count: number }> = {};

    // Each line can be "AhKd: 0.85," or "AhKd: 0.85" — commas separate entries
    const entries = pioSolverText.split(/[,\n\r]+/);
    let parsed = 0;

    entries.forEach((entry: string) => {
      const trimmed = entry.trim();
      const match = trimmed.match(/^([2-9TJQKAtjqka][hdcsHDCS])([2-9TJQKAtjqka][hdcsHDCS]):\s*([\d.]+)$/);
      if (!match) return;

      const freq = parseFloat(match[3]);
      if (isNaN(freq)) return;

      const handType = comboToHandType(match[1], match[2]);
      if (!handType) return;

      if (!acc[handType]) acc[handType] = { sum: 0, count: 0 };
      acc[handType].sum += freq;
      acc[handType].count += 1;
      parsed++;
    });

    if (parsed === 0) {
      alert('Nenhum combo válido encontrado. Verifique o formato PioSolver (ex: AhKd: 0.85).');
      return;
    }

    const newRangeData = { ...rangeData };
    let applied = 0;

    Object.entries(acc).forEach(([handType, { sum, count }]) => {
      const avgFreq = sum / count; // 0–1 scale
      if (avgFreq === 0) return; // skip pure-zero hands (fold hands)
      const freqPct = Math.round(avgFreq * 100 * 100) / 100; // convert to 0–100, 2 decimal places
      updateHandAction(newRangeData, handType, selectedAction, freqPct, true);
      applied++;
    });

    updateRangeData(() => newRangeData);
    setPioSolverText('');
    // importação PioSolver concluída
  };

  const [clearConfirmPending, setClearConfirmPending] = useState(false);
  const clearConfirmTimer = useRef<number | null>(null);

  const onClearMatrixClick = () => {
    if (!clearConfirmPending) {
      // Primeiro clique — pede confirmação (3s para clicar de novo)
      setClearConfirmPending(true);
      if (clearConfirmTimer.current) window.clearTimeout(clearConfirmTimer.current);
      clearConfirmTimer.current = window.setTimeout(() => setClearConfirmPending(false), 3000);
      return;
    }
    // Segundo clique — limpa de verdade
    setClearConfirmPending(false);
    if (clearConfirmTimer.current) { window.clearTimeout(clearConfirmTimer.current); clearConfirmTimer.current = null; }

    if (useOpponentRanges && editingRangeTarget === 'opponent') {
      setOpponentRangeData({});
    } else if (useOpponentRanges && editingRangeTarget !== 'hero' && editingRangeTarget !== 'opponent') {
      setHeroRangesByActionData(prev => ({ ...prev, [editingRangeTarget]: {} }));
    } else {
      setRangeData({});
      if (activeVariantId && street !== 'PREFLOP') {
        setVariants(vPrev => vPrev.map(v => v.id === activeVariantId ? { ...v, ranges: {} } : v));
      }
    }
    setRangeText('');
    setSuitRangeText('');
    setGtoWizardText('');
    localStorage.removeItem(SCENARIO_DRAFT_KEY);
  };

  const buildScenarioObject = (publishState: boolean): Scenario => {
    const isPostFlop = street !== 'PREFLOP';
    return {
      id: currentId, name: name || 'Novo Cenário', description, videoLink, modality, street, preflopAction: action,
      playerCount, heroPos, opponents, stackBB, heroBetSize, opponentBetSize: isReRaiseAction ? opponentBetSize : undefined,
      initialPotBB: isPostFlop ? initialPotBB : undefined,
      board: isPostFlop ? board : undefined,
      opponentAction: isPostFlop ? opponentAction : undefined,
      ranges: rangeData,
      variants: isPostFlop ? variants : undefined,
      customActions,
      isPublished: publishState,
      ...(useOpponentRanges && Object.keys(opponentRangeData).length > 0 ? {
        opponentRanges: opponentRangeData,
        opponentActions: opponentCustomActions,
        heroRangesByAction: heroRangesByActionData,
      } : {}),
    };
  };

  const resetForm = () => {
    localStorage.removeItem(SCENARIO_DRAFT_KEY);
    onClose(); setStep(1); setRangeData({}); setVariants([]); setActiveVariantId(null); setCurrentId(`sc-${Date.now()}`);
    setName(''); setDescription(''); setVideoLink(''); setIsPublished(true);
    setUseOpponentRanges(false); setOpponentRangeData({}); setOpponentCustomActions([]);
    setHeroRangesByActionData({}); setEditingRangeTarget('hero'); setNewOpponentActionInput('');
  };

  const handleFinish = () => {
    const newScenario = buildScenarioObject(isPublished);
    if (onSave) onSave(newScenario, true);
    resetForm();
  };

  const handleSaveAsDraft = () => {
    const newScenario = buildScenarioObject(false);
    if (onSave) onSave(newScenario, true);
    resetForm();
  };

  const handlePublishAndSave = () => {
    const newScenario = buildScenarioObject(true);
    if (onSave) onSave(newScenario, true);
    resetForm();
  };

  const addVariant = (initialBoard?: string[], initialRanges?: RangeData, initialActions?: string[]) => {
    const newId = `v-${Date.now()}`;
    const boardToUse = initialBoard || ['', '', ''];
    const flopStr = [...boardToUse].sort().join('');
    const isDuplicate = variants.some(v => [...v.board].sort().join('') === flopStr);

    const newVariant: BoardVariant = {
      id: newId,
      board: boardToUse,
      ranges: initialRanges || {},
      customActions: initialActions || (street === 'PREFLOP' ? undefined : ['Fold', 'Call', 'Raise']),
      isDuplicate: isDuplicate
    };
    
    setVariants(prev => [...prev, newVariant]);
    setActiveVariantId(newId);
    if (initialBoard) setBoard(initialBoard);
    else setBoard(['', '', '']);
    
    if (initialRanges) setRangeData(initialRanges);
    else setRangeData({});

    if (initialActions) setCustomActions(initialActions);
    else if (street !== 'PREFLOP') setCustomActions(['Fold', 'Call', 'Raise']);
  };

  const switchVariant = (id: string) => {
    const variant = variants.find(v => v.id === id);
    if (variant) {
      setActiveVariantId(id);
      setBoard(variant.board);
      setRangeData(variant.ranges);
      if (variant.customActions) setCustomActions(variant.customActions);
      else if (street !== 'PREFLOP') setCustomActions(['Fold', 'Call', 'Raise']);
    }
  };

  const removeVariant = (id: string) => {
    if (variants.length <= 1) {
      alert("Um cenário pós-flop deve ter pelo menos um board.");
      return;
    }
    const newVariants = variants.filter(v => v.id !== id);
    setVariants(newVariants);
    if (activeVariantId === id) {
      const first = newVariants[0];
      setActiveVariantId(first.id);
      setBoard(first.board);
      setRangeData(first.ranges);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/98 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className={`bg-[#080808] w-full ${step === 2 || step === 'quick' ? 'max-w-[1250px]' : 'max-w-4xl'} border border-white/10 rounded-[40px] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden transition-all duration-500`}>
        
        <div className={`px-10 py-8 border-b border-white/5 flex justify-between items-center ${step === 2 || step === 'quick' ? 'bg-sky-500/5' : 'bg-emerald-500/5'}`}>
          <div className="flex items-center gap-6">
            <div className={`w-14 h-14 ${step === 'manage' ? 'bg-gray-700' : step === 'quick' ? 'bg-emerald-600' : step === 1 ? 'bg-emerald-600' : 'bg-sky-600'} rounded-2xl flex items-center justify-center shadow-2xl`}>
               {step === 1 ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M12 4v16m8-8H4" /></svg> : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M9 17l-5-5 5-5m11 5H4" /></svg>}
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-1">{step === 'manage' ? 'GERENCIAR' : step === 'quick' ? 'ENTRADA RÁPIDA' : step === 1 ? 'CRIADOR' : 'MATRIZ GTO'}</h2>
              <div className="flex items-center gap-3">
                <p className={`text-[11px] font-black tracking-[0.3em] uppercase ${step === 1 ? 'text-emerald-500' : step === 'quick' ? 'text-emerald-500' : 'text-sky-500'}`}>{step === 1 ? 'Etapa 1: Mesa e Spot' : step === 'quick' ? 'Flop a flop · Rápido e Eficiente' : 'Etapa 2: Range Estratégico'}</p>
                {lastAutosave && <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest italic animate-pulse">Autosave: {lastAutosave.toLocaleTimeString()}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {step === 1 && <button onClick={() => setStep('manage')} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-gray-400 tracking-widest hover:bg-white/10 hover:text-white transition-all">Editar Cenários</button>}
            <button onClick={() => { onClose(); setStep(1); }} className="p-3 text-gray-500 hover:text-white transition-all bg-white/5 rounded-full"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
          </div>
        </div>

        {step === 'manage' && (
          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar animate-in fade-in duration-500 space-y-10">
             <div className="flex justify-between items-center">
                <h3 className="text-white font-black text-xl uppercase tracking-tighter">Cenários Salvos</h3>
                <button 
                  onClick={() => setShowBulkImport(!showBulkImport)} 
                  className="px-6 py-3 bg-sky-600/20 border border-sky-500/30 rounded-xl text-[10px] font-black uppercase text-sky-400 tracking-widest hover:bg-sky-600/30 transition-all"
                >
                  {showBulkImport ? 'Cancelar Importação' : 'Importar em Massa (JSON)'}
                </button>
             </div>

             {showBulkImport ? (
               <div className="bg-white/5 border border-white/10 p-8 rounded-[40px] space-y-6">
                  <div className="space-y-3">
                    <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest block">Cole o JSON dos Cenários</label>
                    <textarea 
                      value={bulkImportText}
                      onChange={(e) => setBulkImportText(e.target.value)}
                      placeholder='[ { "name": "Cenário 1", "ranges": { ... } }, ... ]'
                      className="w-full h-64 bg-black/40 border border-white/10 rounded-[32px] p-8 text-white font-mono text-sm outline-none focus:border-sky-500/50 resize-none custom-scrollbar"
                    />
                  </div>
                  <button 
                    onClick={handleBulkImport}
                    disabled={!bulkImportText.trim()}
                    className="w-full py-6 bg-sky-600 rounded-[24px] text-white font-black text-sm uppercase tracking-[0.3em] shadow-2xl hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Processar Importação
                  </button>
               </div>
             ) : (
               <div className="flex flex-col gap-4">
                  {scenarios.map(s => (
                    <div key={s.id} className="group bg-white/5 border border-white/5 p-8 rounded-[32px] flex items-center justify-between hover:bg-white/10 hover:border-sky-500/30 transition-all">
                       <div className="flex-1 min-w-0 pr-8">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-sky-500 text-[9px] font-black uppercase tracking-widest">{s.modality} • {s.street}</div>
                            {isAdmin && s.street !== 'PREFLOP' && (
                              <div className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded-full text-[8px] font-black text-sky-400 uppercase tracking-tighter">
                                {s.variants?.length || (s.ranges ? 1 : 0)} FLOP(S)
                              </div>
                            )}
                            {s.isPublished === false ? (
                              <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[8px] font-black text-amber-400 uppercase tracking-tighter">
                                RASCUNHO
                              </div>
                            ) : (
                              <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[8px] font-black text-emerald-400 uppercase tracking-tighter">
                                PUBLICADO
                              </div>
                            )}
                          </div>
                          <h4 className="text-white font-black text-lg uppercase truncate">{s.name}</h4>
                       </div>
                       <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => onTogglePublish?.(s.id)}
                            className={`p-3 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${s.isPublished === false ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'}`}
                            title={s.isPublished === false ? 'Publicar' : 'Despublicar (tornar rascunho)'}
                          >
                            {s.isPublished === false ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" /></svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                            )}
                          </button>
                          <button onClick={() => { if(window.confirm('Excluir este cenário permanentemente?')) onDelete?.(s.id); }} className="p-3 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100" title="Excluir Cenário">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                          <button onClick={() => duplicateScenario(s)} className="p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100" title="Duplicar Cenário">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 7v-2a2 2 0 012-2h9a2 2 0 012 2v9a2 2 0 01-2 2h-2M5 11h9a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                          <button onClick={() => {
                            const json = JSON.stringify(s, null, 2);
                            const blob = new Blob([json], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${s.name.replace(/\s+/g, '_')}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }} className="p-3 bg-sky-500/10 rounded-xl text-sky-500 hover:bg-sky-500/20 transition-all opacity-0 group-hover:opacity-100" title="Exportar JSON">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-5l5 5 5-5m-5 5V3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                          <button onClick={() => loadScenarioToEdit(s)} className="px-5 py-3 bg-sky-600 rounded-xl text-white font-black text-[10px] uppercase tracking-widest hover:bg-sky-500 transition-all opacity-0 group-hover:opacity-100 shadow-xl">Editar Tudo</button>
                       </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest px-1">Identificação do Spot</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: CO Open vs BTN 3-Bet" className="w-full bg-white/5 border border-white/10 rounded-[20px] py-5 px-8 text-white text-lg font-bold outline-none focus:border-emerald-500/50" />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest px-1">Street</label>
                <div className="grid grid-cols-4 gap-2">
                  {['PREFLOP', 'FLOP', 'TURN', 'RIVER'].map(s => (<button key={s} onClick={() => setStreet(s)} className={`py-5 rounded-[20px] border text-[10px] font-black transition-all uppercase ${s === street ? 'bg-emerald-600 border-emerald-400' : 'bg-white/5 border-white/5 text-gray-500'}`}>{s}</button>))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest px-1">Ação Principal</label>
                <div className="flex flex-wrap gap-2">
                  {(street === 'PREFLOP' ? ['RFI', '3-bet', '4-bet', '5-bet', 'squeeze', 'limp', 'iso', 'open shove'] : ['C-bet', 'vs C-bet', 'Donk-bet', 'Check-Raise']).map(a => (<button key={a} onClick={() => setAction(a)} className={`px-6 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${a === action ? 'bg-emerald-600 border-emerald-400 text-white shadow-xl scale-105' : 'bg-white/5 border-white/5 text-gray-500'}`}>{a}</button>))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest px-1">Stack Efetivo (BB)</label>
                <input 
                  type="number" 
                  value={stackBB} 
                  onChange={(e) => setStackBB(parseFloat(e.target.value) || 0)} 
                  className="w-full bg-white/5 border border-white/10 rounded-[20px] py-4 px-8 text-white font-bold outline-none focus:border-sky-500/50" 
                />
              </div>
            </div>

            {/* Gerenciamento de Botões de Ação */}
            <div className="space-y-4 col-span-full bg-white/5 p-8 rounded-[32px] border border-white/10">
               <div className="flex justify-between items-center mb-4">
                  <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest px-1">Ações do Herói (Botões na Mesa)</label>
                  <span className="text-[9px] text-sky-500 font-black uppercase tracking-widest">Defina os rótulos que aparecerão na mesa</span>
               </div>
               <div className="flex flex-wrap gap-3 mb-6">
                  {customActions.map((act, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-black/40 border border-white/10 px-5 py-3 rounded-2xl transition-all hover:border-white/20">
                      <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ backgroundColor: getActionColor(act, idx) }}></div>
                      <span className="text-[11px] font-black text-white uppercase tracking-wider">{act}</span>
                      <button onClick={() => updateCustomActions(customActions.filter(a => a !== act))} className="ml-2 text-gray-600 hover:text-red-500 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  {customActions.length === 0 && <p className="text-[10px] text-gray-600 font-bold uppercase italic p-2">Nenhuma ação customizada. Usando padrão do Spot.</p>}
               </div>
               <div className="flex gap-3">
                  <input
                    type="text"
                    value={newActionInput}
                    onChange={(e) => setNewActionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newActionInput.trim()) {
                          updateCustomActions([...customActions, newActionInput.trim()]);
                          setNewActionInput('');
                        }
                      }
                    }}
                    placeholder="Adicionar botão (ex: Raise 2.5, All-In, Check)"
                    className="flex-1 bg-black/60 border border-white/10 rounded-2xl py-4 px-6 text-white text-xs font-bold outline-none focus:border-sky-500/50 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newActionInput.trim()) {
                        updateCustomActions([...customActions, newActionInput.trim()]);
                        setNewActionInput('');
                      }
                    }}
                    className="px-8 py-4 bg-sky-600 border border-sky-400 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest hover:bg-sky-500 transition-all shadow-xl active:scale-95"
                  >
                    Adicionar
                  </button>
               </div>
            </div>

            {/* Ação Dinâmica do Oponente (Opponent Range Mode) */}
            <div className="space-y-4 col-span-full bg-violet-500/5 p-8 rounded-[32px] border border-violet-500/20">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                  <label className="text-[11px] text-violet-400 font-black uppercase tracking-widest">Ação Dinâmica do Oponente</label>
                </div>
                <button
                  type="button"
                  onClick={() => setUseOpponentRanges(!useOpponentRanges)}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${useOpponentRanges ? 'bg-violet-600' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all duration-300 ${useOpponentRanges ? 'left-7' : 'left-0.5'}`}></div>
                </button>
              </div>
              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                Quando ativado, o oponente terá um range próprio e suas ações variam por mão. O herói responde com ranges diferentes para cada ação do oponente.
              </p>

              {useOpponentRanges && (
                <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] text-violet-300 font-black uppercase tracking-widest block">Ações do Oponente</label>
                  <div className="flex flex-wrap gap-3 mb-4">
                    {opponentCustomActions.map((act, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-black/40 border border-violet-500/20 px-5 py-3 rounded-2xl transition-all hover:border-violet-500/40">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getActionColor(act, idx) }}></div>
                        <span className="text-[11px] font-black text-white uppercase tracking-wider">{act}</span>
                        <button onClick={() => {
                          const newActions = opponentCustomActions.filter(a => a !== act);
                          setOpponentCustomActions(newActions);
                          // Remove hero range for this action too
                          setHeroRangesByActionData(prev => {
                            const next = { ...prev };
                            delete next[act];
                            return next;
                          });
                          if (editingRangeTarget === act) setEditingRangeTarget('hero');
                        }} className="ml-2 text-gray-600 hover:text-red-500 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                    {opponentCustomActions.length === 0 && <p className="text-[10px] text-gray-600 font-bold uppercase italic p-2">Adicione as ações possíveis (ex: RAISE 2.2, ALL-IN, FOLD)</p>}
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newOpponentActionInput}
                      onChange={(e) => setNewOpponentActionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newOpponentActionInput.trim() && !opponentCustomActions.includes(newOpponentActionInput.trim())) {
                            setOpponentCustomActions(prev => [...prev, newOpponentActionInput.trim()]);
                            setNewOpponentActionInput('');
                          }
                        }
                      }}
                      placeholder="Adicionar ação do oponente (ex: RAISE 2.2)"
                      className="flex-1 bg-black/60 border border-white/10 rounded-2xl py-4 px-6 text-white text-xs font-bold outline-none focus:border-violet-500/50 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newOpponentActionInput.trim() && !opponentCustomActions.includes(newOpponentActionInput.trim())) {
                          setOpponentCustomActions(prev => [...prev, newOpponentActionInput.trim()]);
                          setNewOpponentActionInput('');
                        }
                      }}
                      className="px-8 py-4 bg-violet-600 border border-violet-400 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest hover:bg-violet-500 transition-all shadow-xl active:scale-95"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {isReRaiseAction && (
              <div className="bg-orange-500/5 border border-orange-500/20 p-8 rounded-[32px] space-y-4 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <label className="text-[11px] text-orange-400 font-black uppercase tracking-widest">Inteligência de Confronto</label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <p className="text-[10px] text-gray-500 font-bold leading-relaxed">Defina o tamanho do raise que o oponente fará antes da sua vez. O sistema exibirá essa aposta no seat do primeiro vilão selecionado.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Tamanho do Raise do Vilão (BB)</label>
                    <input type="number" step="0.1" value={opponentBetSize} onChange={(e) => setOpponentBetSize(parseFloat(e.target.value) || 0)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white font-black text-sm outline-none focus:border-orange-500/50" />
                  </div>
                </div>
              </div>
            )}

            {street !== 'PREFLOP' && (
              <div className="bg-sky-500/5 border border-sky-500/20 p-8 rounded-[32px] space-y-6 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                  <label className="text-[11px] text-sky-400 font-black uppercase tracking-widest">Configuração {street}</label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Tamanho do Pote Inicial (BB)</label>
                    <input type="number" step="0.1" value={initialPotBB} onChange={(e) => setInitialPotBB(parseFloat(e.target.value) || 0)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white font-black text-sm outline-none focus:border-sky-500/50" />
                  </div>
                  
                  <div className="space-y-4">
                    <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Ação do Oponente antes do Herói</label>
                    <div className="flex gap-2">
                      {['Check', 'Bet', 'Raise'].map(a => (
                        <button 
                          key={a} 
                          onClick={() => setOpponentAction(a)} 
                          className={`px-6 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${opponentAction === a ? 'bg-sky-600 border-sky-400 text-white' : 'bg-black/40 border-white/10 text-gray-500'}`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Cartas da Mesa (Ex: Ah, Kd, 2s)</label>
                  <div className="flex flex-wrap gap-3">
                    {(street === 'FLOP' ? [0, 1, 2] : street === 'TURN' ? [0, 1, 2, 3] : [0, 1, 2, 3, 4]).map(i => (
                      <input 
                        key={i}
                        type="text" 
                        maxLength={3}
                        value={board[i] || ''} 
                        onChange={(e) => {
                          const newBoard = [...board];
                          newBoard[i] = e.target.value;
                          updateBoard(newBoard);
                        }}
                        placeholder={i < 3 ? "Flop" : i === 3 ? "Turn" : "River"}
                        className="w-16 bg-black/40 border border-white/10 rounded-xl py-4 text-center text-white font-black text-lg outline-none focus:border-sky-500/50 uppercase"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-5">
                <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest block text-center">Posição do Herói</label>
                <div className="flex flex-wrap justify-center gap-2">
                  {availablePositions.map(pos => (<button key={pos} onClick={() => setHeroPos(pos)} className={`w-14 h-14 rounded-2xl border text-[11px] font-black transition-all ${pos === heroPos ? 'bg-sky-600 border-sky-400 text-white shadow-lg' : 'bg-black/40 border-white/10 text-gray-600'}`}>{pos}</button>))}
                </div>
              </div>
              <div className="space-y-5">
                <label className="text-[11px] text-gray-500 font-black uppercase tracking-widest block text-center">Oponente(s) no Pote</label>
                <div className="flex flex-wrap justify-center gap-2">
                  {availablePositions.map(pos => {
                    const isSelected = opponents.includes(pos);
                    const isHero = pos === heroPos;
                    // Só desabilita se for posição do herói E não estiver selecionado (permite desmarcar)
                    const isDisabled = isHero && !isSelected;
                    return (
                      <button
                        key={pos}
                        onClick={() => toggleOpponent(pos)}
                        disabled={isDisabled}
                        className={`w-14 h-14 rounded-2xl border text-[11px] font-black transition-all ${isSelected ? 'bg-orange-600 border-orange-400 text-white shadow-lg' : 'bg-black/40 border-white/10 text-gray-600 disabled:opacity-20'}`}
                      >
                        {pos}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto custom-scrollbar p-10 gap-10 animate-in fade-in duration-500">
            {/* Variants Sidebar for Post-Flop */}
            {street !== 'PREFLOP' && (
              <div className="w-64 border-r border-white/5 flex flex-col bg-black/20 rounded-[32px] overflow-hidden">
                {showBulkFlopImport ? (
                  <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/20 space-y-4 animate-in slide-in-from-left duration-300">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-emerald-400">Importar Texto</span>
                      <button onClick={() => setShowBulkFlopImport(false)} className="text-gray-500 hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
                    </div>
                    <textarea 
                      value={bulkFlopText}
                      onChange={(e) => setBulkFlopText(e.target.value)}
                      placeholder="Cole o texto do bloco de notas aqui..."
                      className="w-full h-64 bg-black/60 border border-white/10 rounded-xl p-3 text-[9px] text-white font-mono outline-none focus:border-emerald-500/50 resize-none custom-scrollbar"
                    />
                    <button 
                      onClick={handleBulkFlopImport}
                      className="w-full py-3 bg-emerald-600 rounded-xl text-white font-black text-[9px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg"
                    >
                      Processar Texto
                    </button>
                    <p className="text-[8px] text-gray-500 italic leading-tight">Separe cenários com ---. Use "AÇÃO: NOME" para definir botões e "AA: 100" para o range.</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Boards / Flops</span>
                        {isAdmin && (
                          <span className="text-[8px] font-black text-sky-500 uppercase tracking-tighter">Total: {variants.length}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => addVariant(['', '', ''], {})}
                          className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg hover:bg-sky-500/30 transition-all"
                          title="Adicionar novo flop"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                        </button>
                        <button 
                          onClick={() => setShowBulkFlopImport(!showBulkFlopImport)}
                          className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all"
                          title="Importar em massa"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                      </div>
                    </div>

                    {/* Editor de Board para a Variante Ativa */}
                    {activeVariantId && (
                      <div className="p-4 border-b border-white/5 bg-sky-500/5 space-y-3">
                        <label className="text-[9px] text-sky-400 font-black uppercase tracking-widest block">Editar Board Ativo</label>
                        <div className="flex gap-2">
                          {(street === 'FLOP' ? [0, 1, 2] : street === 'TURN' ? [0, 1, 2, 3] : [0, 1, 2, 3, 4]).map(i => (
                            <input 
                              key={i}
                              type="text" 
                              maxLength={3}
                              value={board[i] || ''} 
                              onChange={(e) => {
                                const newBoard = [...board];
                                newBoard[i] = e.target.value;
                                updateBoard(newBoard);
                              }}
                              placeholder="?"
                              className="w-10 h-12 bg-black/60 border border-white/20 rounded-lg text-center text-white font-black text-sm outline-none focus:border-sky-500/50 uppercase"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                  {variants.length === 0 && (
                    <div className="p-4 text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase leading-tight">Nenhum board criado. Clique no + para começar.</p>
                    </div>
                  )}
                  {variants.map((v, idx) => (
                    <div 
                      key={v.id}
                      onClick={() => switchVariant(v.id)}
                      className={`group p-3 rounded-xl border transition-all cursor-pointer relative ${activeVariantId === v.id ? 'bg-sky-500/10 border-sky-500/50' : v.isDuplicate ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase">Board #{idx + 1}</span>
                          {v.isDuplicate && (
                            <span className="text-[8px] font-black text-rose-500 uppercase bg-rose-500/10 px-1.5 py-0.5 rounded">Duplicado</span>
                          )}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeVariant(v.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-500/20 rounded transition-all"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <div className="flex gap-1">
                        {v.board.map((card, cidx) => {
                          const getCardColor = (c: string) => {
                            if (!c || c.length < 2) return 'text-gray-600';
                            const suit = c.slice(-1).toLowerCase();
                            switch (suit) {
                              case 'h': return 'text-red-600';
                              case 'c': return 'text-green-600';
                              case 'd': return 'text-blue-600';
                              case 's': return 'text-black';
                              default: return 'text-gray-600';
                            }
                          };
                          
                          return (
                            <div key={cidx} className={`w-8 h-10 rounded-md border flex items-center justify-center text-[10px] font-bold ${card ? `bg-white ${getCardColor(card)} border-white` : 'bg-black/40 border-white/10 text-gray-600'}`}>
                              {card || '?'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

             <div className="flex-1 bg-black/60 rounded-[40px] border border-white/5 p-8 flex flex-col items-center justify-center shadow-inner relative group min-h-[600px]">
              {/* Opponent Range Tab Navigation */}
              {useOpponentRanges && opponentCustomActions.length > 0 && (
                <div className="w-full max-w-[650px] mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingRangeTarget('opponent')}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editingRangeTarget === 'opponent' ? 'bg-violet-600 border-violet-400 text-white shadow-lg' : 'bg-white/5 border border-white/10 text-gray-500 hover:bg-white/10'}`}
                  >
                    Range do Oponente
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRangeTarget('hero')}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editingRangeTarget === 'hero' ? 'bg-sky-600 border-sky-400 text-white shadow-lg' : 'bg-white/5 border border-white/10 text-gray-500 hover:bg-white/10'}`}
                  >
                    Range Padrão Hero
                  </button>
                  {opponentCustomActions.filter(a => !a.toLowerCase().includes('fold')).map(act => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setEditingRangeTarget(act)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editingRangeTarget === act ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' : 'bg-white/5 border border-white/10 text-gray-500 hover:bg-white/10'}`}
                    >
                      Hero vs {act}
                    </button>
                  ))}
                </div>
              )}
              {/* Tab indicator label */}
              {useOpponentRanges && editingRangeTarget !== 'hero' && (
                <div className="w-full max-w-[650px] mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${editingRangeTarget === 'opponent' ? 'text-violet-400' : 'text-emerald-400'}`}>
                    {editingRangeTarget === 'opponent' ? 'Pintando: Range do Oponente' : `Pintando: Hero vs ${editingRangeTarget}`}
                  </span>
                </div>
              )}
              <div onContextMenu={(e) => e.preventDefault()} className="grid grid-cols-13 gap-0 aspect-square w-full max-w-[650px] shadow-2xl overflow-hidden rounded-lg bg-[#0a0a0a]">
                {RANKS.map((r1, row) => RANKS.map((r2, col) => {
                    let hand = row === col ? r1 + r2 : row < col ? r1 + r2 + 's' : r2 + r1 + 'o';
                    return (
                      <div 
                        key={hand} 
                        onMouseDown={(e) => handleMouseDown(hand, e)} 
                        onMouseEnter={() => handleMouseEnter(hand)} 
                        style={getCellStyles(hand)} 
                        className="relative flex items-center justify-center text-[9px] font-black cursor-crosshair select-none hover:z-50 hover:shadow-2xl border-0 w-full h-full"
                      >
                        <span className="relative z-10">{hand}</span>
                      </div>
                    );
                }))}
              </div>
            </div>

            <div className="w-full md:w-[340px] flex flex-col gap-6 shrink-0">
               <section className="bg-white/5 p-7 rounded-[32px] border border-white/10 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Pintar Estratégia</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={onClearMatrixClick} title={clearConfirmPending ? 'Clique para confirmar' : 'Limpar toda a matriz'} className={`p-2.5 rounded-xl border transition-all ${clearConfirmPending ? 'bg-red-600 border-red-400 text-white animate-pulse shadow-lg' : 'bg-white/5 border-white/10 text-gray-500 hover:text-red-400 hover:border-red-500/30'}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg></button>
                      <button type="button" onClick={() => setIsEraserMode(!isEraserMode)} title="Borracha (apagar uma mão)" className={`p-2.5 rounded-xl border transition-all ${isEraserMode ? 'bg-red-600 border-red-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-500'}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 21l-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" strokeLinecap="round" strokeLinejoin="round" /><path d="M22 21H7" strokeLinecap="round" strokeLinejoin="round" /><path d="m5 11l9 9" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {availableRangeActions.map((a, idx) => (
                      <button key={a} type="button" onClick={() => { setSelectedAction(a); setIsEraserMode(false); }} className={`w-full py-4 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all text-left px-5 flex items-center justify-between ${selectedAction === a && !isEraserMode ? 'bg-white border-white text-black shadow-xl' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getActionColor(a, idx) }}></div>
                          {a}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between items-center"><label className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Frequência</label><span className="text-sky-400 font-mono font-black text-xl">{selectedFrequency}%</span></div>
                   <input type="range" min="0" max="100" step="5" value={selectedFrequency} onChange={(e) => setSelectedFrequency(parseInt(e.target.value))} className="w-full h-1.5 bg-black/60 rounded-full appearance-none cursor-pointer accent-sky-500" />
                </div>
                
                {/* Inputs de Range por Texto */}
                <div className="pt-4 border-t border-white/5 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Range por Texto (ex: AA-TT, 55+, AKs)</label>
                    <div className="flex gap-2">
                      <input type="text" value={rangeText} onChange={(e) => setRangeText(e.target.value.toUpperCase())} placeholder="AA-TT, 55+, AKs" className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-white text-[10px] outline-none focus:border-sky-500/50" />
                      <button type="button" onClick={parseRangeText} className="bg-sky-600 px-4 rounded-xl text-white text-[10px] font-black uppercase shadow-lg hover:bg-sky-500 active:scale-95 transition-all">Add</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Range por Naipes (ex: AhKd, AsKs)</label>
                    <div className="flex gap-2">
                      <input type="text" value={suitRangeText} onChange={(e) => setSuitRangeText(e.target.value)} placeholder="AhKd, AsKs" className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-white text-[10px] outline-none focus:border-sky-500/50" />
                      <button type="button" onClick={parseSuitRangeText} className="bg-sky-600 px-4 rounded-xl text-white text-[10px] font-black uppercase shadow-lg hover:bg-sky-500 active:scale-95 transition-all">Add</button>
                    </div>
                  </div>
                  {/* Novo Input GTO Wizard */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">GTO Wizard (ex: 5d5c: 1, Tc9c: 0.85)</label>
                    <div className="flex flex-col gap-2">
                      <textarea 
                        value={gtoWizardText} 
                        onChange={(e) => setGtoWizardText(e.target.value)} 
                        placeholder="Cole o código do GTO Wizard aqui..." 
                        className="w-full h-24 bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-white text-[10px] outline-none focus:border-sky-500/50 resize-none custom-scrollbar" 
                      />
                      <button 
                        type="button" 
                        onClick={parseGtoWizardRange} 
                        className="w-full bg-sky-600 py-2 rounded-xl text-white text-[10px] font-black uppercase shadow-lg hover:bg-sky-500 active:scale-95 transition-all"
                      >
                        Importar GTO Wizard
                      </button>
                    </div>
                  </div>
                  {/* PioSolver Import */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">PioSolver (ex: AhKd: 0.85, KhQh: 1)</label>
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={pioSolverText}
                        onChange={(e) => setPioSolverText(e.target.value)}
                        placeholder="Cole o output do PioSolver aqui (uma ação por vez)..."
                        className="w-full h-24 bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-white text-[10px] outline-none focus:border-violet-500/50 resize-none custom-scrollbar"
                      />
                      <button
                        type="button"
                        onClick={parsePioSolverRange}
                        className="w-full bg-violet-700 py-2 rounded-xl text-white text-[10px] font-black uppercase shadow-lg hover:bg-violet-600 active:scale-95 transition-all"
                      >
                        Importar PioSolver
                      </button>
                    </div>
                  </div>
                  {/* Importação Preflop em Massa */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowBulkPreflopImport(!showBulkPreflopImport)}
                      className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showBulkPreflopImport ? 'bg-emerald-600 text-white' : 'bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20'}`}
                    >
                      {showBulkPreflopImport ? 'Fechar' : 'Importar Texto em Massa'}
                    </button>
                    {showBulkPreflopImport && (
                      <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
                        <textarea
                          value={bulkPreflopText}
                          onChange={(e) => setBulkPreflopText(e.target.value)}
                          placeholder={"Título (ignorado)\nAÇÃO: FOLD\nAA: 0, AKs: 0\n---\nAÇÃO: RAISE\nAA: 100, AKs: 100\n---"}
                          className="w-full h-40 bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-white text-[10px] font-mono outline-none focus:border-emerald-500/50 resize-none custom-scrollbar"
                        />
                        <button
                          type="button"
                          onClick={handleBulkPreflopImport}
                          className="w-full bg-emerald-600 py-2 rounded-xl text-white text-[10px] font-black uppercase shadow-lg hover:bg-emerald-500 active:scale-95 transition-all"
                        >
                          Processar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>

            </div>
          </div>
        )}

        {/* Quick Entry Mode */}
        {step === 'quick' && (
          <div className="flex-1 flex overflow-hidden animate-in fade-in duration-500">
            {/* Sidebar: flops salvos */}
            <div className="w-56 border-r border-white/5 flex flex-col bg-black/20 shrink-0">
              <div className="p-4 border-b border-white/5 bg-white/5">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Flops Salvos</span>
                <span className="ml-2 text-[10px] font-black text-emerald-400">{variants.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                {variants.length === 0 && (
                  <p className="p-3 text-[9px] text-gray-600 font-bold uppercase text-center">Nenhum flop ainda</p>
                )}
                {variants.map((v, idx) => (
                  <div key={v.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-gray-500">#{idx + 1}</span>
                      <div className="flex gap-0.5">
                        {v.board.map((card, ci) => (
                          <span key={ci} className="text-[10px] font-black text-white bg-black/40 px-1 py-0.5 rounded">{card || '?'}</span>
                        ))}
                      </div>
                    </div>
                    <span className="text-[8px] text-gray-500 font-bold">{Object.keys(v.ranges).length}h</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Main area */}
            <div className="flex-1 flex flex-col md:flex-row gap-6 p-8 overflow-y-auto custom-scrollbar">
              {/* Left: inputs */}
              <div className="flex-1 space-y-6 min-w-0">
                {/* Flop cards */}
                <div className="space-y-3">
                  <label className="text-[11px] text-emerald-400 font-black uppercase tracking-widest">Cartas do Flop</label>
                  <div className="flex gap-3">
                    {[0, 1, 2].map(i => (
                      <input
                        key={i}
                        type="text"
                        maxLength={3}
                        value={quickBoard[i] || ''}
                        onChange={(e) => {
                          const nb = [...quickBoard];
                          nb[i] = e.target.value;
                          setQuickBoard(nb);
                        }}
                        placeholder="?"
                        className="w-16 h-14 bg-black/60 border border-white/20 rounded-xl text-center text-white font-black text-lg outline-none focus:border-emerald-500/50 uppercase"
                      />
                    ))}
                  </div>
                </div>

                {/* Action textareas */}
                <div className="space-y-4">
                  <label className="text-[11px] text-sky-400 font-black uppercase tracking-widest">Ranges por Ação</label>
                  {customActions.length === 0 && (
                    <p className="text-[9px] text-gray-500 font-bold">Configure as ações do herói na Etapa 1 primeiro.</p>
                  )}
                  {customActions.map((act, idx) => (
                    <div key={act} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getActionColor(act, idx) }}></div>
                        <span className="text-[10px] font-black text-white uppercase tracking-wider">{act}</span>
                      </div>
                      <textarea
                        value={quickActionTexts[act] || ''}
                        onChange={(e) => handleQuickActionTextChange(act, e.target.value)}
                        placeholder={`Cole o range de ${act} (ex: AA: 100, AKs: 85, QQ: 50)`}
                        className="w-full h-20 bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-white text-[10px] font-mono outline-none focus:border-sky-500/50 resize-none custom-scrollbar"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: mini preview matrix */}
              <div className="w-[280px] shrink-0 flex flex-col gap-4">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest text-center">Preview</label>
                <div className="grid grid-cols-13 gap-0 aspect-square w-full rounded-lg overflow-hidden bg-[#0a0a0a]">
                  {RANKS.map((r1, row) => RANKS.map((r2, col) => {
                    const hand = row === col ? r1 + r2 : row < col ? r1 + r2 + 's' : r2 + r1 + 'o';
                    const freqs = quickPreviewRange[hand];
                    let bg = EMPTY_CELL_BG;
                    if (freqs) {
                      const entries = Object.entries(freqs) as [string, number][];
                      const total = entries.reduce((s, [, f]) => s + f, 0);
                      if (total > 0) {
                        // Use dominant action color
                        entries.sort((a, b) => b[1] - a[1]);
                        const topAction = entries[0][0];
                        const idx = customActions.indexOf(topAction);
                        bg = getActionColor(topAction, idx !== -1 ? idx : 0);
                      }
                    }
                    return (
                      <div
                        key={hand}
                        style={{ backgroundColor: bg }}
                        className="flex items-center justify-center text-[5px] font-bold text-white/60 select-none aspect-square"
                      >
                        {hand.replace(/[so]$/, '')}
                      </div>
                    );
                  }))}
                </div>
                <div className="text-[9px] text-gray-500 font-bold text-center">
                  {Object.keys(quickPreviewRange).length} mãos detectadas
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-12 py-10 border-t border-white/5 bg-black/50 flex gap-6 shrink-0">
          <button type="button" onClick={() => step === 2 || step === 'manage' || step === 'quick' ? setStep(1) : onClose()} className="flex-1 py-6 rounded-[24px] border border-white/10 text-[12px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-all">{step === 1 ? 'CANCELAR' : 'RETORNAR'}</button>
          {step !== 'manage' && step === 1 && (
            <>
              {street !== 'PREFLOP' && (
                <button type="button" onClick={() => {
                  setQuickBoard(['', '', '']);
                  setQuickActionTexts({});
                  setQuickPreviewRange({});
                  setStep('quick');
                }} className="flex-1 py-6 rounded-[24px] border border-emerald-500/30 bg-emerald-600/20 text-[12px] font-black uppercase tracking-[0.3em] text-emerald-400 hover:bg-emerald-600/30 transition-all flex items-center justify-center gap-3">
                  ENTRADA RÁPIDA
                </button>
              )}
              <button type="button" onClick={() => {
                if (street !== 'PREFLOP' && variants.length === 0) {
                  addVariant(board, rangeData, customActions);
                }
                setStep(2);
              }} className="flex-[1.2] py-6 rounded-[24px] border text-[12px] font-black uppercase tracking-[0.3em] text-white shadow-2xl transition-all flex items-center justify-center gap-4 bg-emerald-600 border-emerald-400">
                CONFIGURAR MATRIZ GTO
              </button>
            </>
          )}
          {step === 'quick' && (
            <>
              <button type="button" onClick={handleQuickSaveFlop} disabled={quickBoard.filter(c => c.trim().length >= 2).length < 3 || Object.keys(quickPreviewRange).length === 0} className="flex-1 py-6 rounded-[24px] border border-emerald-500/30 bg-emerald-600 text-[12px] font-black uppercase tracking-[0.3em] text-white shadow-2xl transition-all flex items-center justify-center gap-3 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed">
                SALVAR FLOP E PRÓXIMO
              </button>
              <button type="button" onClick={handleQuickPublishAll} disabled={variants.length === 0} className="flex-1 py-6 rounded-[24px] border border-sky-400 bg-sky-600 text-[12px] font-black uppercase tracking-[0.3em] text-white shadow-2xl transition-all flex items-center justify-center gap-3 hover:bg-sky-500 disabled:opacity-30 disabled:cursor-not-allowed">
                PUBLICAR ({variants.length} FLOPS)
              </button>
            </>
          )}
          {step !== 'manage' && step === 2 && (
            <>
              <button type="button" onClick={handleSaveAsDraft} className="flex-1 py-6 rounded-[24px] border border-amber-500/30 bg-amber-600/20 text-[12px] font-black uppercase tracking-[0.3em] text-amber-400 hover:bg-amber-600/30 transition-all flex items-center justify-center gap-3">
                <span className="text-[16px]">◐</span> SALVAR RASCUNHO
              </button>
              <button type="button" onClick={handlePublishAndSave} className="flex-[1.2] py-6 rounded-[24px] border border-sky-400 bg-sky-600 text-[12px] font-black uppercase tracking-[0.3em] text-white shadow-2xl transition-all flex items-center justify-center gap-3 hover:bg-sky-500">
                <span className="text-[16px]">▶</span> PUBLICAR
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal de conflito de importação */}
      {pendingDuplicateImport && (
        <div className="absolute inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-[32px]">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-8 w-[480px] max-w-[90%] shadow-2xl flex flex-col gap-6">
            <div>
              <h3 className="text-white text-[15px] font-bold mb-1">Flops duplicados detectados</h3>
              <p className="text-gray-400 text-[12px] leading-relaxed">
                {pendingDuplicateImport.conflicts.length} flop{pendingDuplicateImport.conflicts.length > 1 ? 's' : ''} já exist{pendingDuplicateImport.conflicts.length > 1 ? 'em' : 'e'} neste cenário:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingDuplicateImport.conflicts.map(({ existing }) => (
                  <span key={existing.id} className="text-[11px] font-mono bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-1 rounded">
                    {existing.board.join('')}
                  </span>
                ))}
              </div>
              {pendingDuplicateImport.unique.length > 0 && (
                <p className="mt-3 text-gray-500 text-[11px]">
                  {pendingDuplicateImport.unique.length} flop{pendingDuplicateImport.unique.length > 1 ? 's' : ''} novo{pendingDuplicateImport.unique.length > 1 ? 's' : ''} serão adicionados em qualquer opção.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => applyImport('replace')}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[12px] font-bold uppercase tracking-widest transition-colors"
              >
                Substituir — sobrescrever os existentes
              </button>
              <button
                onClick={() => applyImport('skip')}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[12px] font-bold uppercase tracking-widest transition-colors border border-white/10"
              >
                Pular — manter os existentes
              </button>
              <button
                onClick={() => applyImport('keepBoth')}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[12px] font-bold uppercase tracking-widest transition-colors border border-white/10"
              >
                Manter ambos — adicionar como novo
              </button>
            </div>

            <button
              onClick={() => setPendingDuplicateImport(null)}
              className="text-gray-500 hover:text-white text-[11px] uppercase tracking-widest transition-colors text-center"
            >
              Cancelar importação
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioCreatorModal;