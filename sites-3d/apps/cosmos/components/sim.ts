import { create } from "zustand";
import * as THREE from "three";
import { AU_KM, EARTH_RADIUS_KM, J2000_MS, MS_PER_DAY, PLANETS, SPEEDS, SUN_RADIUS_KM, heliocentric } from "./data";

export type ScaleMode = "lisible" | "reelle";

type Store = {
  intro: boolean;
  focus: number | null;
  speed: number;
  paused: boolean;
  scale: ScaleMode;
  compare: boolean;
  sheetOpen: boolean;
  dir: 1 | -1;
  jump: number;
  setIntro: (v: boolean) => void;
  select: (i: number | null) => void;
  setSpeed: (i: number) => void;
  togglePause: () => void;
  setScale: (s: ScaleMode) => void;
  toggleScale: () => void;
  setCompare: (v: boolean) => void;
  setSheetOpen: (v: boolean) => void;
  toggleDir: () => void;
};

export const useStore = create<Store>((set, get) => ({
  intro: true,
  focus: null,
  speed: 0,
  paused: false,
  scale: "lisible",
  compare: false,
  sheetOpen: false,
  dir: 1,
  jump: 0,
  setIntro: (intro) => set({ intro }),
  select: (focus) => set({ focus, compare: focus === null ? false : get().compare, sheetOpen: false }),
  setSpeed: (speed) => set({ speed, paused: false }),
  togglePause: () => set({ paused: !get().paused }),
  setScale: (scale) => set({ scale }),
  toggleScale: () => set({ scale: get().scale === "lisible" ? "reelle" : "lisible" }),
  setCompare: (compare) => set({ compare }),
  setSheetOpen: (sheetOpen) => set({ sheetOpen }),
  toggleDir: () => set({ dir: get().dir === 1 ? -1 : 1, paused: false }),
}));

/** État mutable partagé à 60 im/s, hors React. */
export const sim = {
  days: (Date.now() - J2000_MS) / MS_PER_DAY,
  blend: 0, // 0 = échelle lisible, 1 = échelle réelle
  planetPos: PLANETS.map(() => new THREE.Vector3()),
  planetRadius: PLANETS.map(() => 1),
  moonPos: new THREE.Vector3(),
  moonRadius: 0.1,
  sunRadius: 3,
};
export const daysPerSecond = () => {
  const s = useStore.getState();
  // l'horloge reste figée pendant l'introduction : on entre dans l'explorateur à la date du jour
  return s.paused || s.intro ? 0 : SPEEDS[s.speed].daysPerSec * s.dir;
};
export const simDateMs = () => J2000_MS + sim.days * MS_PER_DAY;
/** Place l'horloge à une date (ms UTC) ; un saut notable recadre la caméra (la géométrie Soleil–planète a changé). */
export const setSimDate = (ms: number) => {
  const d = (ms - J2000_MS) / MS_PER_DAY;
  const big = Math.abs(d - sim.days) > 20;
  sim.days = d;
  if (big) useStore.setState({ jump: useStore.getState().jump + 1 });
};
export const resetToToday = () => setSimDate(Date.now());
/** Validité de la table 1 du JPL. */
export const VALID_FROM = Date.UTC(1800, 0, 1);
export const VALID_TO = Date.UTC(2050, 11, 31);
/** Bornes dures de la simulation (au-delà, les éléments moyens n'ont plus de sens). */
export const DAYS_MIN = (Date.UTC(1000, 0, 1) - J2000_MS) / MS_PER_DAY;
export const DAYS_MAX = (Date.UTC(3000, 0, 1) - J2000_MS) / MS_PER_DAY;

/** Géométrie de l'interface, mesurée dans le DOM (partagée entre la scène et les étiquettes). */
export type LayoutMode = "wide" | "phone" | "short";
export const ui = {
  mode: "wide" as LayoutMode,
  W: 1, H: 1,
  free: { l: 0, t: 0, r: 1, b: 1 },
  obstacles: [] as { l: number; t: number; r: number; b: number }[],
  stamp: 0,
};
export const PHONE_MQ = "(max-width: 720px) and (min-height: 501px), (max-width: 540px)";
export const SHORT_MQ = "(max-height: 500px) and (min-width: 541px)";
export function layoutMode(): LayoutMode {
  try {
    if (window.matchMedia(PHONE_MQ).matches) return "phone";
    if (window.matchMedia(SHORT_MQ).matches) return "short";
  } catch { /* ignore */ }
  return "wide";
}
/** Éléments DOM des étiquettes (rendues hors de la Canvas, positionnées par la scène). */
export const labelEls: (HTMLElement | null)[] = [];
export const moonLabel: { el: HTMLElement | null } = { el: null };

// ——— Échelles ———
export const UNITS_PER_AU_REAL = 400;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const lmix = (a: number, b: number, t: number) => Math.exp(mix(Math.log(a), Math.log(b), t));

/** Distance héliocentrique (UA) → rayon scène, selon le mélange des échelles. */
export function mapDistance(rAU: number, t = sim.blend) {
  const readable = 5 + 7.5 * Math.pow(rAU, 0.55);
  const real = rAU * UNITS_PER_AU_REAL;
  return lmix(readable, real, t);
}
export function mapRadius(km: number, t = sim.blend) {
  const readable = 0.25 + 0.2 * Math.pow(km / EARTH_RADIUS_KM, 0.6);
  const real = (km / AU_KM) * UNITS_PER_AU_REAL;
  return lmix(readable, real, t);
}
export const sunRadius = (t = sim.blend) => lmix(3, (SUN_RADIUS_KM / AU_KM) * UNITS_PER_AU_REAL, t);
export const moonDistance = (t = sim.blend) => lmix(1.7, (384400 / AU_KM) * UNITS_PER_AU_REAL, t);
export const introDistance = (t = sim.blend, portrait = false) => lmix(portrait ? 150 : 88, UNITS_PER_AU_REAL * (portrait ? 7 : 4.2), t);
export const realOverview = (portrait = false) => UNITS_PER_AU_REAL * (portrait ? 7 : 4.2);
export { lmix };

const tmp: [number, number, number] = [0, 0, 0];
/** Met à jour toutes les positions de sim à partir de sim.days et sim.blend. */
export function updatePositions() {
  sunRadiusCache();
  PLANETS.forEach((p, i) => {
    heliocentric(p.el, sim.days, tmp);
    const r = Math.hypot(tmp[0], tmp[1], tmp[2]);
    const k = mapDistance(r) / r;
    sim.planetPos[i].set(tmp[0] * k, tmp[1] * k, tmp[2] * k);
    sim.planetRadius[i] = mapRadius(p.radiusKm);
  });
  const md = moonDistance();
  moonDirAt(sim.days, sim.moonPos).multiplyScalar(md).add(sim.planetPos[2]);
  sim.moonRadius = lmix(sim.planetRadius[2] * 0.2727, mapRadius(1737.4, 1), sim.blend);
}
/** Direction géocentrique (repère scène) de la Lune au jour d : orbite circulaire inclinée de 5,1° sur l'écliptique. */
export function moonDirAt(d: number, out: THREE.Vector3) {
  const lon = ((218.316 + 13.176396 * d) * Math.PI) / 180;
  const node = ((125.08 - 0.0529538 * d) * Math.PI) / 180;
  const inc = (5.14 * Math.PI) / 180;
  const u = lon - node;
  const x = Math.cos(node) * Math.cos(u) - Math.sin(node) * Math.sin(u) * Math.cos(inc);
  const y = Math.sin(node) * Math.cos(u) + Math.cos(node) * Math.sin(u) * Math.cos(inc);
  const z = Math.sin(u) * Math.sin(inc);
  return out.set(x, z, -y);
}
function sunRadiusCache() { sim.sunRadius = sunRadius(); }

/** Distance réelle actuelle (UA) entre deux planètes ou au Soleil (j = -1). */
export function realDistanceAU(i: number, j: number) {
  const a = heliocentric(PLANETS[i].el, sim.days, [0, 0, 0]);
  if (j < 0) return Math.hypot(a[0], a[1], a[2]);
  const b = heliocentric(PLANETS[j].el, sim.days, [0, 0, 0]);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export const prefersReducedMotion = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};
