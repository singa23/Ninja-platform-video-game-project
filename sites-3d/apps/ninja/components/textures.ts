"use client";
import * as THREE from "three";
import { drawGlyph, KATAKANA_TITLE } from "./glyphs";

// Toutes les textures sont procédurales (CanvasTexture) : aucun téléchargement.

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Petit bruit déterministe
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Tige de bambou : fibres verticales + nœuds tous les 25 % de la hauteur UV. */
export function bambooTexture() {
  const [c, g] = canvas(64, 512);
  const grad = g.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, "#2d4a3a");
  grad.addColorStop(0.35, "#6f9a72");
  grad.addColorStop(0.55, "#8fb58a");
  grad.addColorStop(1, "#243b30");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 512);
  const r = rng(7);
  g.globalAlpha = 0.18;
  for (let i = 0; i < 70; i++) {
    g.fillStyle = r() > 0.5 ? "#1b2e24" : "#b8d4a8";
    g.fillRect(r() * 64, 0, 1, 512);
  }
  g.globalAlpha = 1;
  for (let k = 0; k < 4; k++) {
    const y = k * 128 + 2;
    g.fillStyle = "#1a2a20";
    g.fillRect(0, y, 64, 5);
    g.fillStyle = "#c9dcb0";
    g.fillRect(0, y + 5, 64, 2);
    const sh = g.createLinearGradient(0, y + 7, 0, y + 30);
    sh.addColorStop(0, "rgba(10,20,15,.45)");
    sh.addColorStop(1, "rgba(10,20,15,0)");
    g.fillStyle = sh;
    g.fillRect(0, y + 7, 64, 23);
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Bouquet de feuilles de bambou (fond transparent). */
export function leafTexture() {
  const [c, g] = canvas(256, 256);
  const r = rng(3);
  for (let i = 0; i < 9; i++) {
    g.save();
    g.translate(128, 40);
    g.rotate(-1.1 + (i / 8) * 2.2 + (r() - 0.5) * 0.2);
    const L = 150 + r() * 60;
    const W = 16 + r() * 8;
    const grd = g.createLinearGradient(0, 0, 0, L);
    grd.addColorStop(0, "#9cc49a");
    grd.addColorStop(1, "#3f6b50");
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(W, L * 0.4, 0, L);
    g.quadraticCurveTo(-W, L * 0.4, 0, 0);
    g.fill();
    g.strokeStyle = "rgba(20,40,28,.5)";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(0, 4);
    g.lineTo(0, L - 6);
    g.stroke();
    g.restore();
  }
  return tex(c);
}

/** Halo radial (pour lueurs additives). */
export function glowTexture(inner = "rgba(255,255,255,1)") {
  const [c, g] = canvas(128, 128);
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.25, "rgba(255,255,255,.35)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return tex(c);
}

/** Lune : disque laiteux avec mers sombres. */
export function moonTexture() {
  const [c, g] = canvas(256, 256);
  const grd = g.createRadialGradient(110, 100, 10, 128, 128, 120);
  grd.addColorStop(0, "#fffaf0");
  grd.addColorStop(0.8, "#eee3cc");
  grd.addColorStop(1, "#d8c9a8");
  g.fillStyle = grd;
  g.beginPath();
  g.arc(128, 128, 120, 0, Math.PI * 2);
  g.fill();
  const r = rng(11);
  g.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 26; i++) {
    const x = 40 + r() * 176, y = 40 + r() * 176, rad = 6 + r() * 26;
    const m = g.createRadialGradient(x, y, 0, x, y, rad);
    m.addColorStop(0, "rgba(150,140,125,.45)");
    m.addColorStop(1, "rgba(150,140,125,0)");
    g.fillStyle = m;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  return tex(c);
}

/** Enseigne néon verticale ニンジャコイ, lueur dessinée dans la texture. */
export function neonSignTexture() {
  const W = 160, H = 900;
  const [c, g] = canvas(W, H);
  g.fillStyle = "#0b0f1c";
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(63,224,208,.55)";
  g.lineWidth = 3;
  g.strokeRect(10, 10, W - 20, H - 20);
  const step = (H - 60) / KATAKANA_TITLE.length;
  KATAKANA_TITLE.forEach((k, i) => {
    const small = k === "ya";
    const size = small ? 78 : 112;
    const x = (W - size) / 2;
    const y = 30 + i * step + (step - size) / 2 + (small ? 12 : 0);
    g.shadowColor = "#ff5a3c";
    g.shadowBlur = 26;
    g.strokeStyle = "#ff6a4a";
    drawGlyph(g, k, x, y, size, 11);
    g.shadowBlur = 0;
    g.strokeStyle = "#ffe0d0";
    drawGlyph(g, k, x, y, size, 4);
  });
  return tex(c);
}

/** Plaque avec 忍 en néon cyan. */
export function neonKanjiTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = "#0b0f1c";
  g.fillRect(0, 0, 256, 256);
  g.shadowColor = "#3fe0d0";
  g.shadowBlur = 30;
  g.strokeStyle = "#3fe0d0";
  drawGlyph(g, "shinobi", 28, 28, 200, 10);
  g.shadowBlur = 0;
  g.strokeStyle = "#e6fffb";
  drawGlyph(g, "shinobi", 28, 28, 200, 4);
  return tex(c);
}

/** Cible de paille : anneaux vermillon / washi. */
export function targetTexture() {
  const [c, g] = canvas(256, 256);
  const rings = ["#f2ead8", "#e8452c", "#f2ead8", "#e8452c", "#f2ead8", "#1b2a4a"];
  rings.forEach((col, i) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(128, 128, 126 - i * 21, 0, Math.PI * 2);
    g.fill();
  });
  g.fillStyle = "#f2b84b";
  g.beginPath();
  g.arc(128, 128, 12, 0, Math.PI * 2);
  g.fill();
  const r = rng(5);
  g.globalAlpha = 0.12;
  for (let i = 0; i < 400; i++) {
    g.fillStyle = r() > 0.5 ? "#000" : "#fff";
    g.fillRect(r() * 256, r() * 256, 1 + r() * 6, 1);
  }
  return tex(c);
}

/** Paille tressée pour la tranche des cibles. */
export function strawTexture() {
  const [c, g] = canvas(128, 32);
  g.fillStyle = "#b99a5b";
  g.fillRect(0, 0, 128, 32);
  const r = rng(9);
  for (let i = 0; i < 120; i++) {
    g.strokeStyle = r() > 0.5 ? "#8a6d36" : "#d9c083";
    g.beginPath();
    const x = r() * 128;
    g.moveTo(x, 0);
    g.lineTo(x + 6, 32);
    g.stroke();
  }
  g.fillStyle = "#5b1a12";
  g.fillRect(0, 13, 128, 6);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Mur shoji rétroéclairé avec fenêtre ronde (maru-mado). */
export function shojiTexture() {
  const W = 1024, H = 512;
  const [c, g] = canvas(W, H);
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#2a2238");
  bg.addColorStop(1, "#15121f");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // Panneaux de papier lumineux
  const panels = [[40, 60, 300, 380], [684, 60, 300, 380]];
  for (const [x, y, w, h] of panels) {
    const p = g.createRadialGradient(x + w / 2, y + h * 0.6, 20, x + w / 2, y + h / 2, w);
    p.addColorStop(0, "#f6d9a8");
    p.addColorStop(1, "#b98a5a");
    g.fillStyle = p;
    g.fillRect(x, y, w, h);
    g.strokeStyle = "#2a1a12";
    g.lineWidth = 6;
    for (let i = 0; i <= 4; i++) {
      g.beginPath();
      g.moveTo(x + (i * w) / 4, y);
      g.lineTo(x + (i * w) / 4, y + h);
      g.stroke();
    }
    for (let j = 0; j <= 6; j++) {
      g.beginPath();
      g.moveTo(x, y + (j * h) / 6);
      g.lineTo(x + w, y + (j * h) / 6);
      g.stroke();
    }
    g.lineWidth = 14;
    g.strokeRect(x, y, w, h);
  }
  // Fenêtre ronde sur la nuit
  const cx = W / 2, cy = 230, R = 170;
  const sky = g.createLinearGradient(0, cy - R, 0, cy + R);
  sky.addColorStop(0, "#0a0e1a");
  sky.addColorStop(1, "#1b2a4a");
  g.fillStyle = sky;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.clip();
  const moon = g.createRadialGradient(cx + 50, cy - 40, 0, cx + 50, cy - 40, 120);
  moon.addColorStop(0, "rgba(255,248,230,1)");
  moon.addColorStop(0.45, "rgba(255,248,230,1)");
  moon.addColorStop(0.5, "rgba(255,240,210,.35)");
  moon.addColorStop(1, "rgba(255,240,210,0)");
  g.fillStyle = moon;
  g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  g.fillStyle = "#0a0e1a";
  for (let i = 0; i < 14; i++) {
    const x = cx - R + 10 + i * 25;
    g.fillRect(x, cy + 40 + Math.sin(i * 1.7) * 30, 8, 200);
  }
  g.restore();
  g.lineWidth = 16;
  g.strokeStyle = "#3a2418";
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
  // Bandeau néon cyan
  g.shadowColor = "#3fe0d0";
  g.shadowBlur = 24;
  g.fillStyle = "#7ff5ea";
  g.fillRect(0, 470, W, 6);
  g.shadowBlur = 0;
  g.fillStyle = "#1a1016";
  g.fillRect(0, 478, W, 34);
  return tex(c);
}

/** Plancher de bois sombre. */
export function floorTexture() {
  const [c, g] = canvas(512, 512);
  const r = rng(21);
  for (let i = 0; i < 8; i++) {
    const l = 22 + r() * 10;
    g.fillStyle = `hsl(20 30% ${l}%)`;
    g.fillRect(i * 64, 0, 64, 512);
    g.globalAlpha = 0.15;
    for (let k = 0; k < 30; k++) {
      g.fillStyle = r() > 0.5 ? "#000" : "#e9c9a0";
      g.fillRect(i * 64 + r() * 64, 0, 1, 512);
    }
    g.globalAlpha = 1;
    g.fillStyle = "rgba(0,0,0,.6)";
    g.fillRect(i * 64, 0, 2, 512);
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Sol forestier : taches de mousse et d'ombre. */
export function groundTexture() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = "#101a1c";
  g.fillRect(0, 0, 512, 512);
  const r = rng(33);
  for (let i = 0; i < 300; i++) {
    const x = r() * 512, y = r() * 512, rad = 4 + r() * 40;
    const m = g.createRadialGradient(x, y, 0, x, y, rad);
    const col = r() > 0.6 ? "40,70,58" : r() > 0.5 ? "20,30,44" : "8,12,16";
    m.addColorStop(0, `rgba(${col},.55)`);
    m.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = m;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
