"use client";
// Bruitages synthétisés (Web Audio) : aucun fichier, jamais joués sans clic préalable.
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch { ctx = null; }
}

function env(g: GainNode, t: number, a: number, peak: number, dur: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

export function sfx(kind: "throw" | "hit" | "gold" | "oni" | "wall" | "gong" | "tick") {
  if (!ctx || !noise) return;
  const t = ctx.currentTime;
  const out = ctx.destination;
  try {
    if (kind === "throw") {
      const src = ctx.createBufferSource(); src.buffer = noise;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 3;
      f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.16);
      const g = ctx.createGain(); env(g, t, 0.01, 0.25, 0.18);
      src.connect(f).connect(g).connect(out); src.start(t); src.stop(t + 0.2);
    } else if (kind === "hit" || kind === "wall") {
      const o = ctx.createOscillator(); o.type = "triangle";
      o.frequency.setValueAtTime(kind === "hit" ? 180 : 120, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
      const g = ctx.createGain(); env(g, t, 0.003, kind === "hit" ? 0.5 : 0.25, 0.14);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.16);
      const src = ctx.createBufferSource(); src.buffer = noise;
      const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1800;
      const g2 = ctx.createGain(); env(g2, t, 0.002, 0.18, 0.05);
      src.connect(f).connect(g2).connect(out); src.start(t); src.stop(t + 0.06);
    } else if (kind === "gold") {
      [1320, 1980, 2640].forEach((fr, i) => {
        const o = ctx!.createOscillator(); o.type = "sine"; o.frequency.value = fr;
        const g = ctx!.createGain(); env(g, t + i * 0.03, 0.004, 0.14, 0.35);
        o.connect(g).connect(out); o.start(t + i * 0.03); o.stop(t + 0.45);
      });
    } else if (kind === "oni") {
      const o = ctx.createOscillator(); o.type = "square";
      o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.25);
      const g = ctx.createGain(); env(g, t, 0.005, 0.12, 0.28);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.3);
    } else if (kind === "tick") {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 880;
      const g = ctx.createGain(); env(g, t, 0.003, 0.15, 0.09);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.1);
    } else if (kind === "gong") {
      [110, 165, 262, 393].forEach((fr, i) => {
        const o = ctx!.createOscillator(); o.type = "sine"; o.frequency.value = fr;
        const g = ctx!.createGain(); env(g, t, 0.01, 0.22 / (i + 1), 2.2);
        o.connect(g).connect(out); o.start(t); o.stop(t + 2.3);
      });
    }
  } catch { /* audio indisponible */ }
}
