"use client";
import * as THREE from "three";

// Textures procédurales (CanvasTexture), mises en cache par clé.
const cache = new Map<string, THREE.Texture>();

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, opts?: { repeat?: [number, number]; srgb?: boolean }) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (opts?.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (opts?.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...opts.repeat);
  }
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

// Générateur pseudo-aléatoire déterministe
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function blobShadow() {
  return make("blob", 128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(20,24,30,0.62)");
    grd.addColorStop(0.35, "rgba(20,24,30,0.32)");
    grd.addColorStop(0.7, "rgba(20,24,30,0.08)");
    grd.addColorStop(1, "rgba(20,24,30,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
}

export function lightPool() {
  return make("pool", 128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(255,236,200,0.9)");
    grd.addColorStop(0.5, "rgba(255,226,180,0.3)");
    grd.addColorStop(1, "rgba(255,220,170,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
}

export function speckle() {
  return make("speckle", 512, 512, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let i = 0; i < 2600; i++) {
      const s = r() * 1.8 + 0.3;
      g.fillStyle = `rgba(${40 + r() * 40},${30 + r() * 20},${20},${0.25 + r() * 0.5})`;
      g.beginPath();
      g.arc(r() * w, r() * h, s, 0, Math.PI * 2);
      g.fill();
    }
    // légères variations de glaçure
    for (let i = 0; i < 40; i++) {
      const grd = g.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 60 + r() * 80);
      grd.addColorStop(0, "rgba(255,255,255,0.12)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    }
  }, { repeat: [3, 2] });
}

export function woodGrain() {
  return make("wood", 512, 512, (g, w, h) => {
    g.fillStyle = "#e9e2d8";
    g.fillRect(0, 0, w, h);
    const r = rng(11);
    for (let i = 0; i < 90; i++) {
      const y0 = r() * h;
      const amp = 4 + r() * 10;
      const freq = 0.004 + r() * 0.01;
      const ph = r() * 10;
      g.strokeStyle = `rgba(90,60,35,${0.05 + r() * 0.16})`;
      g.lineWidth = 0.6 + r() * 2.4;
      g.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1 + ph) * amp * 0.25;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  }, { repeat: [1.5, 1.5] });
}

export function knit() {
  return make("knit", 128, 128, (g, w, h) => {
    g.fillStyle = "#d9d9d9";
    g.fillRect(0, 0, w, h);
    const cols = 16;
    const rows = 16;
    const cw = w / cols;
    const rh = h / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = x * cw + cw / 2;
        const cy = y * rh + rh / 2;
        g.fillStyle = "#ffffff";
        g.beginPath();
        g.ellipse(cx - cw * 0.18, cy, cw * 0.22, rh * 0.42, 0.5, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(cx + cw * 0.18, cy, cw * 0.22, rh * 0.42, -0.5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "rgba(0,0,0,0.35)";
        g.fillRect(cx - 0.5, cy - rh / 2, 1, rh);
      }
    }
  }, { repeat: [14, 10] });
}

export function knitBump() {
  return make("knitBump", 128, 128, (g, w, h) => {
    g.fillStyle = "#555";
    g.fillRect(0, 0, w, h);
    const cols = 16;
    const rows = 16;
    const cw = w / cols;
    const rh = h / rows;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const cx = x * cw + cw / 2;
        const cy = y * rh + rh / 2;
        g.fillStyle = "#fff";
        g.beginPath();
        g.ellipse(cx - cw * 0.18, cy, cw * 0.2, rh * 0.4, 0.5, 0, Math.PI * 2);
        g.ellipse(cx + cw * 0.18, cy, cw * 0.2, rh * 0.4, -0.5, 0, Math.PI * 2);
        g.fill();
      }
  }, { repeat: [14, 10], srgb: false });
}

export function tortoise() {
  // Écaille d'acétate : fond miel translucide, nuages bruns allongés et fondus, veines ambrées.
  return make("tortoise", 512, 256, (g, w, h) => {
    g.fillStyle = "#9a5a22";
    g.fillRect(0, 0, w, h);
    const r = rng(5);
    const blob = (x: number, y: number, rx: number, ry: number, rot: number, col: string) => {
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
      g.fill();
    };
    g.filter = "blur(10px)";
    for (let i = 0; i < 70; i++) blob(r() * w, r() * h, 30 + r() * 60, 10 + r() * 22, -0.35 + r() * 0.3, `rgba(${46 + r() * 20},${22 + r() * 10},${10},${0.55 + r() * 0.35})`);
    g.filter = "blur(6px)";
    for (let i = 0; i < 45; i++) blob(r() * w, r() * h, 14 + r() * 34, 5 + r() * 10, -0.35 + r() * 0.3, `rgba(${200 + r() * 30},${130 + r() * 30},${55},${0.35 + r() * 0.3})`);
    g.filter = "blur(3px)";
    for (let i = 0; i < 90; i++) blob(r() * w, r() * h, 4 + r() * 12, 2 + r() * 5, -0.35 + r() * 0.3, `rgba(${34},${16},${8},${0.5 + r() * 0.4})`);
    g.filter = "none";
  }, { repeat: [2, 2] });
}

export function perfumeLabel(name: string, ml = "50") {
  return make("label:" + name + ml, 512, 256, (g, w, h) => {
    g.fillStyle = "#f4f3ef";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#16191d";
    g.lineWidth = 3;
    g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = "#16191d";
    g.font = "700 64px 'Syne Variable', 'Syne', sans-serif";
    g.textBaseline = "alphabetic";
    g.fillText("BRUME", 40, 100);
    g.font = "500 64px 'IBM Plex Mono', monospace";
    g.fillText("N°3", w - 170, 100);
    g.fillRect(40, 124, w - 80, 3);
    g.font = "500 26px 'IBM Plex Mono', monospace";
    g.fillText(name.toUpperCase(), 40, 170);
    g.fillText(`EAU DE PARFUM · ${ml} ML`, 40, 212);
  });
}

/** Cadran de montre dessiné en direct (heure de l'appareil). */
export class WatchFace {
  canvas: HTMLCanvasElement;
  tex: THREE.CanvasTexture;
  accent: string;
  last = -1;
  constructor(accent: string) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = 512;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    this.accent = accent;
    this.draw(true);
  }
  setAccent(a: string) {
    if (a !== this.accent) {
      this.accent = a;
      this.draw(true);
    }
  }
  draw(force = false) {
    const now = new Date();
    const s = now.getSeconds();
    if (!force && s === this.last) return;
    this.last = s;
    const g = this.canvas.getContext("2d")!;
    const W = 512;
    const c = W / 2;
    g.fillStyle = "#050608";
    g.fillRect(0, 0, W, W);
    // graduation 60 min
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const long = i % 5 === 0;
      const r1 = 244;
      const r0 = long ? 222 : 234;
      g.strokeStyle = i <= s ? this.accent : "rgba(255,255,255,0.28)";
      g.lineWidth = long ? 5 : 2.5;
      g.beginPath();
      g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
      g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
      g.stroke();
    }
    const days = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];
    g.textAlign = "center";
    g.fillStyle = "rgba(255,255,255,0.7)";
    g.font = "500 30px 'IBM Plex Mono', monospace";
    g.fillText(`${days[now.getDay()]} ${String(now.getDate()).padStart(2, "0")}`, c, 132);
    // heure
    g.fillStyle = "#ffffff";
    g.font = "700 150px 'Syne Variable', 'Syne', sans-serif";
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    g.fillText(`${hh}:${mm}`, c, 280);
    // secondes
    g.fillStyle = this.accent;
    g.font = "500 34px 'IBM Plex Mono', monospace";
    g.fillText(String(s).padStart(2, "0"), c + 170, 196);
    // cardio + allure
    const bpm = 138 + Math.round(Math.sin(now.getTime() / 4000) * 6);
    g.fillStyle = "#ff5a5f";
    heart(g, c - 118, 338, 17);
    g.fillStyle = "#ffffff";
    g.textAlign = "left";
    g.font = "600 40px 'IBM Plex Mono', monospace";
    g.fillText(String(bpm), c - 92, 352);
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.font = "500 22px 'IBM Plex Mono', monospace";
    g.fillText("bpm", c - 12, 352);
    g.fillStyle = "#ffffff";
    g.font = "600 40px 'IBM Plex Mono', monospace";
    g.fillText("4'52", c + 42, 352);
    // zones cardio
    const zones = ["#6b7a8f", "#3c8dff", "#34c38f", "#f7b731", "#ff5a36"];
    zones.forEach((z, i) => {
      g.fillStyle = i === 2 ? z : z + "66";
      g.fillRect(c - 110 + i * 45, 384, 40, i === 2 ? 12 : 8);
    });
    g.textAlign = "center";
    g.fillStyle = "rgba(255,255,255,0.6)";
    g.font = "500 22px 'IBM Plex Mono', monospace";
    g.fillText("Z3 · TEMPO   8,42 km", c, 432);
    this.tex.needsUpdate = true;
  }
}

function heart(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.beginPath();
  g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.2, x, y - s * 0.4);
  g.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  g.fill();
}
