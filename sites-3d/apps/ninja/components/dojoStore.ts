"use client";
import { create } from "zustand";

export type Phase = "idle" | "countdown" | "playing" | "over";
export type Popup = { id: number; x: number; y: number; text: string; kind: "hit" | "gold" | "oni" | "miss" };

export const GAME_LENGTH = 30;
const KEY = "ninjakoi-dojo-best";

export function readBest(): number {
  try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; }
}
function writeBest(v: number) {
  try { localStorage.setItem(KEY, String(v)); } catch { /* stockage indisponible : on continue */ }
}

export function multiplier(combo: number) {
  return combo >= 15 ? 5 : combo >= 10 ? 4 : combo >= 6 ? 3 : combo >= 3 ? 2 : 1;
}

type S = {
  phase: Phase;
  countdown: number;
  timeLeft: number;
  score: number;
  combo: number;
  bestCombo: number;
  throws: number;
  hits: number;
  best: number;
  newRecord: boolean;
  popups: Popup[];
  sound: boolean;
  runId: number;
  start: () => void;
  go: () => void;
  tick: (t: number) => void;
  hit: (points: number, x: number, y: number, label: string, kind: Popup["kind"]) => void;
  miss: () => void;
  pushPopup: (x: number, y: number, text: string, kind: Popup["kind"]) => void;
  throwOne: () => void;
  finish: () => void;
  dropPopup: (id: number) => void;
  setSound: (v: boolean) => void;
  loadBest: () => void;
};

let pid = 0;

/** Décale vers le haut un popup qui tomberait sur un popup encore affiché. */
function placePopup(list: Popup[], x: number, y: number) {
  let yy = y;
  for (let i = 0; i < 4; i++) {
    const clash = list.some((p) => Math.abs(p.x - x) < 90 && Math.abs(p.y - yy) < 34);
    if (!clash) break;
    yy -= 36;
  }
  return yy;
}

export const useDojo = create<S>((set, get) => ({
  phase: "idle",
  countdown: 3,
  timeLeft: GAME_LENGTH,
  score: 0,
  combo: 0,
  bestCombo: 0,
  throws: 0,
  hits: 0,
  best: 0,
  newRecord: false,
  popups: [],
  sound: false,
  runId: 0,
  loadBest: () => set({ best: readBest() }),
  start: () => set((s) => ({
    phase: "countdown", countdown: 3, timeLeft: GAME_LENGTH, score: 0, combo: 0, bestCombo: 0, throws: 0, hits: 0,
    newRecord: false, popups: [], runId: s.runId + 1,
  })),
  go: () => set({ phase: "playing" }),
  tick: (t) => set({ timeLeft: t }),
  throwOne: () => set((s) => ({ throws: s.throws + 1 })),
  hit: (points, x, y, label, kind) => set((s) => {
    const combo = s.combo + 1;
    const gained = points * multiplier(combo);
    const id = ++pid;
    return {
      score: s.score + gained, combo, bestCombo: Math.max(s.bestCombo, combo), hits: s.hits + 1,
      popups: [...s.popups.slice(-6), { id, x, y: placePopup(s.popups, x, y), text: `+${gained} ${label}`, kind }],
    };
  }),
  miss: () => set({ combo: 0 }),
  pushPopup: (x, y, text, kind) => set((s) => ({
    popups: [...s.popups.slice(-6), { id: ++pid, x, y: placePopup(s.popups, x, y), text, kind }],
  })),
  finish: () => {
    const s = get();
    const newRecord = s.score > s.best;
    if (newRecord) writeBest(s.score);
    set({ phase: "over", timeLeft: 0, newRecord, best: Math.max(s.best, s.score) });
  },
  dropPopup: (id) => set((s) => ({ popups: s.popups.filter((p) => p.id !== id) })),
  setSound: (v) => set({ sound: v }),
}));
