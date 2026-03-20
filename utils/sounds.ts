// =============================================================================
// LAB11 — Sistema de Feedback Sonoro (Web Audio API)
// Zero dependências externas. Sons gerados sinteticamente no browser.
// =============================================================================

function createCtx(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// Som de carta distribuída: click suave de alta frequência (ruído branco
// com decaimento exponencial rápido — simula o toque de uma carta na mesa)
// --------------------------------------------------------------------------
export function playDeal(): void {
  const ac = createCtx();
  if (!ac) return;

  const duration = 0.06;
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * duration), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 6);
  }

  const src = ac.createBufferSource();
  const gain = ac.createGain();
  src.buffer = buf;
  gain.gain.value = 0.12;
  src.connect(gain);
  gain.connect(ac.destination);
  src.start();
}

// --------------------------------------------------------------------------
// Som de acerto: ding limpo (onda senoidal, decaimento natural)
//   quality 'high' → dois tons ascendentes (spot difícil, baixa frequência)
//   quality 'mid'  → tom único, altura média
//   quality 'low'  → tom único, mais suave
// --------------------------------------------------------------------------
export function playCorrect(quality: 'high' | 'mid' | 'low'): void {
  const ac = createCtx();
  if (!ac) return;

  const configs: { freq: number; delay: number; vol: number }[] =
    quality === 'high'
      ? [
          { freq: 784, delay: 0,   vol: 0.22 }, // Sol 5
          { freq: 988, delay: 140, vol: 0.20 }, // Si 5
        ]
      : quality === 'mid'
      ? [{ freq: 659, delay: 0, vol: 0.20 }]   // Mi 5
      : [{ freq: 523, delay: 0, vol: 0.15 }];  // Dó 5

  configs.forEach(({ freq, delay, vol }) => {
    setTimeout(() => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.38);
    }, delay);
  });
}

// --------------------------------------------------------------------------
// Som de erro: buzz curto e grave (onda dente-de-serra)
// --------------------------------------------------------------------------
export function playWrong(): void {
  const ac = createCtx();
  if (!ac) return;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 160;
  gain.gain.setValueAtTime(0.12, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.22);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.25);
}

// --------------------------------------------------------------------------
// Som de timeout: dois bipes descendentes
// --------------------------------------------------------------------------
export function playTimeout(): void {
  const ac = createCtx();
  if (!ac) return;

  [440, 330].forEach((freq, i) => {
    setTimeout(() => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.2);
    }, i * 200);
  });
}
