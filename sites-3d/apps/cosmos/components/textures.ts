import * as THREE from "three";
import { feature } from "topojson-client";
import land from "world-atlas/land-110m.json";
import type { Topology, GeometryCollection } from "topojson-specification";

// ——— Bruit ———
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const perm = new Uint8Array(512);
{
  const r = mulberry32(1846);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function grad(h: number, x: number, y: number, z: number) {
  const hh = h & 15, u = hh < 8 ? x : y, v = hh < 4 ? y : hh === 12 || hh === 14 ? x : z;
  return ((hh & 1) === 0 ? u : -u) + ((hh & 2) === 0 ? v : -v);
}
export function noise3(x: number, y: number, z: number) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
  return lerp(
    lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u), lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
    lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u), lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v),
    w,
  );
}
export function fbm(x: number, y: number, z: number, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * noise3(x * f, y * f, z * f); a *= 0.5; f *= 2.03; }
  return s;
}
/** Champ de cratères (bruit cellulaire) : renvoie un décalage de luminosité. */
function craters(x: number, y: number, z: number, scale: number, seed: number) {
  x *= scale; y *= scale; z *= scale;
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let shade = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
    const cx = xi + i, cy = yi + j, cz = zi + k;
    const h = perm[(perm[(perm[(cx + seed) & 255] + cy) & 255] + cz) & 255];
    if (h > 150) continue; // cellules sans cratère
    const px = cx + perm[(h + 11) & 255] / 255, py = cy + perm[(h + 37) & 255] / 255, pz = cz + perm[(h + 71) & 255] / 255;
    const r = 0.18 + (perm[(h + 101) & 255] / 255) * 0.32;
    const d = Math.hypot(x - px, y - py, z - pz) / r;
    if (d < 1.25) {
      if (d < 0.85) shade -= 0.16 * (1 - d * d * 0.6);
      else if (d < 1.05) shade += 0.2 * (1 - Math.abs(d - 0.95) / 0.1);
      else shade += 0.05 * (1.25 - d) / 0.2;
    }
  }
  return shade;
}

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a: RGB, b: RGB, t: number): RGB => {
  t = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
};
const smooth = (e0: number, e1: number, x: number) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  // canevas logiciel : lectures (getImageData) et écritures sans aller-retour GPU
  c.getContext("2d", { willReadFrequently: true });
  return c;
}
/* Génération découpée dans le temps : on rend la main au navigateur toutes les ~10 ms
   pour que l'animation d'entrée et la scène restent fluides pendant la fabrication des textures. */
let sliceStart = 0;
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
function yieldNow() {
  return new Promise<void>((r) => {
    try {
      const ch = new MessageChannel();
      ch.port1.onmessage = () => { ch.port1.close(); r(); };
      ch.port2.postMessage(0);
    } catch { setTimeout(r, 0); }
  });
}
async function maybeYield(budget = 10) {
  if (now() - sliceStart > budget) {
    // tâche suivante : le navigateur peut peindre une image et traiter les entrées entre deux tranches
    await yieldNow();
    sliceStart = now();
  }
}

/** Remplit une texture équirectangulaire via une fonction du point de la sphère unité. */
async function paint(w: number, h: number, fn: (x: number, y: number, z: number, lat: number, lon: number, px: number, py: number) => RGB | [number, number, number, number], base?: HTMLCanvasElement) {
  const c = base ?? makeCanvas(w, h);
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  sliceStart = now();
  for (let py = 0; py < h; py++) {
    const lat = (0.5 - (py + 0.5) / h) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let px = 0; px < w; px++) {
      const lon = ((px + 0.5) / w) * Math.PI * 2 - Math.PI;
      const x = cl * Math.cos(lon), z = -cl * Math.sin(lon), y = sl;
      const col = fn(x, y, z, lat, lon, px, py);
      const o = (py * w + px) * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = col.length === 4 ? col[3] : 255;
    }
    await maybeYield();
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
function toTex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// ——— Planètes ———
export type PlanetTextures = { map: THREE.Texture; rough?: THREE.Texture; clouds?: THREE.Texture };

function mercury(w: number, h: number) {
  const a = hex("#5d5a56"), b = hex("#a39d94"), c = hex("#c8c1b5");
  return paint(w, h, (x, y, z) => {
    const n = fbm(x * 3, y * 3, z * 3, 5);
    let col = mixc(a, b, 0.55 + n * 1.3);
    const cr = craters(x, y, z, 7, 3) + craters(x, y, z, 16, 9) * 0.6;
    const ray = Math.max(0, fbm(x * 20, y * 20, z * 20, 2)) * 0.3;
    col = mixc(col, c, cr * 1.6 + ray);
    const s = 1 + cr * 0.6;
    return [col[0] * s, col[1] * s, col[2] * s];
  });
}

function venus(w: number, h: number) {
  const a = hex("#b98a4c"), b = hex("#e8cf98"), c = hex("#f6e8c4");
  return paint(w, h, (x, y, z, lat) => {
    const warp = fbm(x * 2, y * 2, z * 2, 3);
    const band = Math.sin(lat * 9 + warp * 5 + x * 1.5);
    const n = fbm(x * 4 + warp * 2, y * 10, z * 4, 4);
    let col = mixc(a, b, 0.55 + band * 0.18 + n * 0.8);
    col = mixc(col, c, smooth(0.1, 0.4, n + Math.abs(lat) * 0.2));
    return col;
  });
}

function earthLandMask(w: number, h: number) {
  const topo = land as unknown as Topology;
  const fc = feature(topo, topo.objects.land as GeometryCollection) as unknown as GeoJSON.FeatureCollection;
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  const X = (lon: number) => ((lon + 180) / 360) * w;
  const Y = (lat: number) => ((90 - lat) / 180) * h;
  for (const f of fc.features) {
    const g = f.geometry;
    const polys = (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []) as number[][][][];
    for (const rings of polys) {
      for (const off of [-w, 0, w]) {
        ctx.beginPath();
        for (const ring of rings) {
          let prev = ring[0][0], acc = 0;
          ring.forEach(([lon, lat], i) => {
            if (i > 0) { const dl = lon - prev; if (dl > 180) acc -= 360; else if (dl < -180) acc += 360; }
            prev = lon;
            const px = X(lon + acc) + off, py = Y(lat);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          });
          ctx.closePath();
        }
        ctx.fill("evenodd");
      }
    }
  }
  return c;
}

async function earth(w: number, h: number): Promise<{ map: HTMLCanvasElement; rough: HTMLCanvasElement }> {
  const mask = earthLandMask(w, h);
  await maybeYield();
  const m = mask.getContext("2d")!.getImageData(0, 0, w, h).data;
  // proximité des côtes : masque moyenné sur une grille réduite, puis lissé (flou calculé en JS,
  // bien moins coûteux que ctx.filter = "blur()" en rendu logiciel)
  const K = 8, sw = Math.ceil(w / K), sh = Math.ceil(h / K);
  const grid = new Float32Array(sw * sh);
  for (let py = 0; py < h; py++) {
    const row = ((py / K) | 0) * sw;
    for (let px = 0; px < w; px++) if (m[(py * w + px) * 4] > 127) grid[row + ((px / K) | 0)] += 1 / (K * K);
  }
  const sm = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    let a = 0, n = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const yy = y + j; if (yy < 0 || yy >= sh) continue;
      a += grid[yy * sw + ((x + i + sw) % sw)]; n++;
    }
    sm[y * sw + x] = a / n;
  }
  await maybeYield();
  const coastAt = (px: number, py: number) => {
    const fx = Math.max(0, px / K - 0.5), fy = Math.min(sh - 1.001, Math.max(0, py / K - 0.5));
    const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0, x1 = (x0 + 1) % sw;
    const a = sm[y0 * sw + x0] * (1 - tx) + sm[y0 * sw + x1] * tx;
    const b = sm[(y0 + 1) * sw + x0] * (1 - tx) + sm[(y0 + 1) * sw + x1] * tx;
    return a * (1 - ty) + b * ty;
  };
  const deep = hex("#06203d"), mid = hex("#0d3b66"), shallow = hex("#1f6f8b");
  const forest = hex("#2f5a27"), green = hex("#557a38"), dry = hex("#8f7d4c"), desert = hex("#c9a66b"), tundra = hex("#8c8a78"), ice = hex("#eef3f6"), boreal = hex("#34502f");
  const rough = makeCanvas(w, h);
  const rctx = rough.getContext("2d")!;
  const rimg = rctx.createImageData(w, h);
  const map = await paint(w, h, (x, y, z, lat, lon, px, py) => {
    const o = (py * w + px) * 4;
    const isLand = m[o] > 127;
    const coast = coastAt(px, py);
    const latd = (Math.abs(lat) * 180) / Math.PI;
    const n = fbm(x * 5, y * 5, z * 5, 5);
    rimg.data[o] = 0; rimg.data[o + 1] = isLand ? 235 : 165 + n * 40; rimg.data[o + 2] = 0; rimg.data[o + 3] = 255;
    if (!isLand) {
      let col = mixc(deep, mid, 0.5 + n * 0.8);
      col = mixc(col, shallow, smooth(0.15, 0.7, coast) * 0.7);
      if (latd > 72 + n * 10) col = mixc(col, ice, smooth(72, 80, latd + n * 12) * 0.9);
      return col;
    }
    const lond = (lon * 180) / Math.PI;
    const n2 = fbm(x * 12, y * 12, z * 12, 3);
    // Déserts : ceinture subtropicale, élargie sur Sahara / Arabie / Australie
    const lats = (lat * 180) / Math.PI;
    const aridBoost = 0.35 * smooth(-26, -12, lond) * smooth(68, 54, lond) * smooth(2, 12, lats) + 0.3 * smooth(108, 118, lond) * smooth(156, 146, lond) * smooth(-2, -12, lats);
    const arid = smooth(0.35, 0.8, 1 - Math.abs(latd - 24) / 14 + aridBoost + n * 0.6);
    let col = latd < 12 ? mixc(forest, green, 0.4 + n2) : mixc(green, boreal, smooth(40, 60, latd + n * 10));
    col = mixc(col, dry, smooth(0.2, 0.6, arid + n2 * 0.4));
    col = mixc(col, desert, smooth(0.55, 0.9, arid + n2 * 0.3));
    col = mixc(col, tundra, smooth(58, 68, latd + n * 12));
    const greenland = lond > -75 && lond < -10 && lat > 0 && latd > 60;
    if (latd > 66 + n * 8 || greenland || lat < -1.05) col = mixc(col, ice, greenland ? 0.95 : smooth(64, 72, latd + n * 10));
    const s = 0.92 + n2 * 0.25;
    return [col[0] * s, col[1] * s, col[2] * s];
  });
  rctx.putImageData(rimg, 0, 0);
  return { map, rough };
}

function clouds(w: number, h: number) {
  return paint(w, h, (x, y, z, lat) => {
    const warp = fbm(x * 1.5, y * 1.5, z * 1.5, 2) * 2.2;
    const n = fbm(x * 3 + warp, y * 5 + warp * 0.6, z * 3 - warp, 5);
    const latd = Math.abs(lat);
    // bandes : ITCZ équatoriale et rails dépressionnaires des moyennes latitudes
    const belt = 0.12 * Math.exp(-((latd - 0.95) ** 2) / 0.05) + 0.08 * Math.exp(-(latd ** 2) / 0.01);
    const a = smooth(0.02, 0.32, n + belt);
    return [255, 255, 255, a * 235];
  });
}

function mars(w: number, h: number) {
  const dark = hex("#6a3321"), base = hex("#b35a33"), light = hex("#cf8656"), ice = hex("#f1ece4");
  return paint(w, h, (x, y, z, lat, lon) => {
    const n = fbm(x * 1.7 + 3, y * 1.7, z * 1.7, 5);
    const d = fbm(x * 7, y * 7, z * 7, 4);
    let col = mixc(base, light, 0.45 + d * 0.9 + n * 0.4);
    // grandes régions sombres (Syrtis Major, Mare Acidalium…), plus étendues dans l'hémisphère sud
    const albedo = smooth(0.04, 0.26, n + 0.07 - 0.12 * smooth(-0.35, 0.35, lat) + d * 0.25);
    col = mixc(col, dark, albedo * 0.8);
    // Valles Marineris : ~4 000 km d'est en ouest, tracé sinueux, largeur variable, extrémités fondues
    const u = (lon + 1.3) / 0.62; // −1 (Noctis Labyrinthus, à l'ouest) → +1 (chaos à l'est)
    if (Math.abs(u) < 1.25) {
      const wig = fbm(x * 4 + 7, y * 4, z * 4, 3) * 0.16 + u * 0.05;
      const wv = 0.03 * (0.6 + 0.9 * Math.max(0, fbm(x * 6, y * 6 + 2, z * 6, 3) + 0.3) + 0.5 * smooth(-1, 0.4, u)) * (1 - 0.3 * Math.abs(u));
      const dl = lat + 0.14 - wig;
      const along = smooth(1.2, 0.4, Math.abs(u));
      // chasmata discontinus : l'intensité varie le long du tracé
      const patch = smooth(-0.15, 0.2, fbm(x * 8 + 1, y * 8, z * 8 - 3, 3) + 0.05);
      const vm = Math.exp(-(dl * dl) / (2 * wv * wv)) * along * (0.45 + 0.55 * patch);
      col = mixc(col, light, Math.exp(-((dl - wv * 1.8) ** 2) / (2 * wv * wv * 0.6)) * along * 0.12);
      col = mixc(col, dark, Math.min(1, vm) * 0.4);
    }
    const cr = craters(x, y, z, 10, 5) * 0.35;
    const latd = (lat * 180) / Math.PI;
    const cap = lat > 0 ? smooth(74, 80, latd + n * 10) : smooth(-79, -85, latd - n * 8);
    col = mixc(col, ice, cap);
    const s = 1 + cr;
    return [col[0] * s, col[1] * s, col[2] * s];
  });
}

function jupiter(w: number, h: number) {
  // Profil latitudinal (degrés, couleur) : zones claires / ceintures brun-rouge
  const bands: [number, string][] = [
    [-90, "#8a8579"], [-60, "#a39a88"], [-45, "#c9b99a"], [-36, "#a8835e"], [-28, "#e6d8bd"], [-20, "#b77a52"],
    [-13, "#a86a45"], [-7, "#efe4cf"], [0, "#d9c3a0"], [7, "#efe2c8"], [12, "#9d5c3c"], [18, "#b07650"],
    [24, "#e9dcc2"], [31, "#b58e68"], [38, "#d8c7a6"], [46, "#a58a6c"], [60, "#9d9482"], [90, "#88826f"],
  ].map(([l, c]) => [l as number, c as string]);
  const cols = bands.map(([, c]) => hex(c));
  const grsLat = -22 * (Math.PI / 180), grsLon = 0.9;
  return paint(w, h, (x, y, z, lat, lon) => {
    const warp = fbm(x * 6, y * 16, z * 6, 3);
    const turb = fbm(x * 3 + warp * 0.8, y * 12, z * 3 - warp * 0.8, 4);
    const lw = (lat * 180) / Math.PI + turb * 3.4 + Math.sin(lon * 7 + lat * 30) * 0.5;
    let i = 0;
    while (i < bands.length - 2 && bands[i + 1][0] < lw) i++;
    const t = (lw - bands[i][0]) / (bands[i + 1][0] - bands[i][0]);
    let col = mixc(cols[i], cols[i + 1], smooth(0, 1, t));
    const fine = fbm(x * 5 + warp, y * 26, z * 5 - warp, 2);
    const k = 0.95 + fine * 0.2 + warp * 0.1;
    col = [col[0] * k, col[1] * k, col[2] * k];
    // Grande Tache rouge : ovale ~ 16 000 × 12 000 km
    let dl = lon - grsLon; if (dl > Math.PI) dl -= Math.PI * 2; if (dl < -Math.PI) dl += Math.PI * 2;
    const ex = dl / 0.27, ey = (lat - grsLat) / 0.11;
    const r = Math.sqrt(ex * ex + ey * ey);
    if (r < 1.6) {
      const ang = Math.atan2(ey, ex);
      const swirl = noise3(r * 4 + Math.cos(ang * 2 + r * 6) * 0.6, ang * 0.8, 3.3) * 0.25;
      const core = smooth(1.0, 0.25, r + swirl);
      col = mixc(col, hex("#e7d5bb"), smooth(1.55, 1.05, r) * 0.55);
      col = mixc(col, hex("#b3442a"), core);
      col = mixc(col, hex("#cf6a3e"), core * smooth(0.6, 0.1, r) * 0.6);
    }
    // ovales blancs de la ceinture tempérée sud
    for (const [ol, oo] of [[-33, -1.4], [-33, -0.6], [-40, 2.2]] as [number, number][]) {
      let d2 = lon - oo; if (d2 > Math.PI) d2 -= Math.PI * 2; if (d2 < -Math.PI) d2 += Math.PI * 2;
      const rr = Math.hypot(d2 / 0.06, (lat - (ol * Math.PI) / 180) / 0.035);
      if (rr < 1) col = mixc(col, hex("#f4efe6"), smooth(1, 0.4, rr));
    }
    return col;
  });
}

function saturn(w: number, h: number) {
  const bands: [number, string][] = [
    [-90, "#7e8a8c"], [-70, "#a79f86"], [-50, "#cdb989"], [-35, "#dcc794"], [-20, "#e8d6a4"], [-8, "#d7bd85"],
    [0, "#efdcaa"], [8, "#d4b680"], [18, "#e6d19f"], [30, "#cfb582"], [45, "#d9c595"], [60, "#b3a381"], [75, "#8f8f86"], [90, "#7a8488"],
  ];
  const cols = bands.map(([, c]) => hex(c));
  return paint(w, h, (x, y, z, lat) => {
    const turb = fbm(x * 2.5, y * 16, z * 2.5, 4);
    const lw = (lat * 180) / Math.PI + turb * 2;
    let i = 0;
    while (i < bands.length - 2 && bands[i + 1][0] < lw) i++;
    const t = (lw - bands[i][0]) / (bands[i + 1][0] - bands[i][0]);
    let col = mixc(cols[i], cols[i + 1], smooth(0, 1, t));
    const fine = fbm(x * 4, y * 60, z * 4, 2);
    col = mixc(col, [250, 240, 215], fine * 0.25);
    return col;
  });
}

function uranus(w: number, h: number) {
  const a = hex("#8ccad2"), b = hex("#b8e3e6"), c = hex("#d8f1f0");
  return paint(w, h, (x, y, z, lat) => {
    const n = fbm(x * 2, y * 14, z * 2, 3);
    let col = mixc(a, b, 0.5 + Math.sin(lat * 14) * 0.08 + n * 0.3);
    col = mixc(col, c, smooth(0.9, 1.4, lat));
    return col;
  });
}

function neptune(w: number, h: number) {
  const a = hex("#1f3b93"), b = hex("#3f68d2"), c = hex("#6c93ea");
  return paint(w, h, (x, y, z, lat, lon) => {
    const n = fbm(x * 2.5, y * 12, z * 2.5, 4);
    let col = mixc(a, b, 0.55 + Math.sin(lat * 10 + n * 2) * 0.2 + n * 0.5);
    col = mixc(col, c, smooth(0.2, 0.5, Math.abs(Math.sin(lat * 5))) * 0.25);
    // Grande Tache sombre (observée par Voyager 2 en 1989)
    let dl = lon - 1.8; if (dl > Math.PI) dl -= Math.PI * 2; if (dl < -Math.PI) dl += Math.PI * 2;
    const r = Math.hypot(dl / 0.22, (lat + 0.35) / 0.1);
    col = mixc(col, hex("#0f1f5a"), smooth(1, 0.3, r) * 0.9);
    // nuages de méthane blancs, étirés en longitude
    const streak = fbm(x * 3, y * 45, z * 3, 3);
    const s1 = smooth(0.28, 0.42, streak) * (Math.exp(-((lat + 0.5) ** 2) / 0.01) + Math.exp(-((lat - 0.45) ** 2) / 0.006) + smooth(1.1, 0.8, r) * smooth(0.8, 1.1, r) * 2);
    col = mixc(col, [240, 246, 255], Math.min(1, s1));
    return col;
  });
}

function moon(w: number, h: number) {
  const mare = hex("#4a4a4c"), high = hex("#a6a39d");
  return paint(w, h, (x, y, z) => {
    const n = fbm(x * 1.6 + 4, y * 1.6, z * 1.6, 5);
    // les mers sont concentrées sur la face visible (-x vers la Terre en repère texture)
    const near = smooth(-0.2, 0.8, x);
    let col = mixc(high, mare, smooth(0.0, 0.12, n + near * 0.15 - 0.06));
    const cr = craters(x, y, z, 8, 7) + craters(x, y, z, 20, 13) * 0.5;
    const s = 1 + cr * 0.9;
    col = [col[0] * s, col[1] * s, col[2] * s];
    return col;
  });
}

/** Canevas sources, gardés pour les vignettes du comparateur. */
export const texCanvases: Record<string, HTMLCanvasElement> = {};
/* File d'attente : une texture à la fois, découpée en tranches (voir paint).
   La planète sélectionnée passe devant les autres. */
type Job = { key: string; run: () => Promise<unknown>; done: (v: unknown) => void; fail: (e: unknown) => void };
const jobs: Job[] = [];
let busy = false;
let wanted = "";
export function prioritizeTexture(key: string) {
  wanted = key;
  const i = jobs.findIndex((j) => j.key === key);
  if (i > 0) jobs.unshift(...jobs.splice(i, 1));
}
async function pump() {
  if (busy) return;
  busy = true;
  while (jobs.length) {
    const i = jobs.findIndex((j) => j.key === wanted);
    const job = i >= 0 ? jobs.splice(i, 1)[0] : jobs.shift()!;
    try { job.done(await job.run()); } catch (e) { job.fail(e); }
  }
  busy = false;
}
function enqueue<T>(key: string, run: () => Promise<T>): Promise<T> {
  return new Promise<T>((done, fail) => {
    jobs.push({ key, run, done: done as (v: unknown) => void, fail });
    void pump();
  });
}

async function buildPlanet(id: string, hi: boolean): Promise<PlanetTextures> {
  const W = hi ? 1024 : 512, H = W / 2;
  const w = hi ? 768 : 384, h = w / 2;
  let map: HTMLCanvasElement;
  switch (id) {
    case "mercure": map = await mercury(w, h); break;
    case "venus": map = await venus(w, h); break;
    case "terre": {
      const e = await earth(W, H);
      const cl = await clouds(W, H);
      texCanvases.terre = e.map; texCanvases.nuages = cl;
      return { map: toTex(e.map), rough: toTex(e.rough, false), clouds: toTex(cl) };
    }
    case "mars": map = await mars(w, h); break;
    case "jupiter": map = await jupiter(W, H); break;
    case "saturne": map = await saturn(w, h); break;
    case "uranus": map = await uranus(256, 128); break;
    case "neptune": map = await neptune(w, h); break;
    default: map = await moon(w, h);
  }
  texCanvases[id] = map;
  return { map: toTex(map) };
}
export const loadPlanetTextures = (id: string, hi: boolean) => enqueue(id, () => buildPlanet(id, hi));
export const loadMoonTexture = (hi: boolean) => enqueue("lune", async () => {
  const c = await moon(hi ? 512 : 256, hi ? 256 : 128);
  texCanvases.lune = c;
  return toTex(c);
});

/* ——— Vignette ombrée pour le comparateur : projection orthographique d'une texture équirectangulaire ——— */
const pixCache = new Map<HTMLCanvasElement, ImageData>();
const snapCache = new Map<string, string>();
function pixelsOf(c: HTMLCanvasElement) {
  let d = pixCache.get(c);
  if (!d) { d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height); pixCache.set(c, d); }
  return d;
}
/** Renvoie une image (data URL) du globe éclairé, ou null si la texture n'est pas encore prête. */
export function sphereSnapshot(id: string, size: number): string | null {
  const src = texCanvases[id];
  if (!src) return null;
  size = Math.max(8, Math.min(320, Math.round(size)));
  const key = `${id}:${size}`;
  const hit = snapCache.get(key);
  if (hit) return hit;
  const tex = pixelsOf(src);
  const cloud = id === "terre" && texCanvases.nuages ? pixelsOf(texCanvases.nuages) : null;
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const L = [-0.55, 0.42, 0.72]; const ll = Math.hypot(L[0], L[1], L[2]); L[0] /= ll; L[1] /= ll; L[2] /= ll;
  const tilt = id === "saturne" ? 0.35 : id === "uranus" ? 0.2 : 0.18;
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const lon0 = id === "terre" ? 0.3 : id === "jupiter" ? -0.9 : 0;
  const R = size / 2;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const nx = (px + 0.5 - R) / R, ny = (R - py - 0.5) / R;
      const r2 = nx * nx + ny * ny;
      const o = (py * size + px) * 4;
      if (r2 > 1) { img.data[o + 3] = 0; continue; }
      const nz = Math.sqrt(1 - r2);
      // inclinaison de l'axe vers l'observateur
      const y = ny * ct + nz * st, z = -ny * st + nz * ct;
      const lat = Math.asin(Math.max(-1, Math.min(1, y)));
      let lon = Math.atan2(nx, z) + lon0;
      lon = ((lon + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const tx = Math.min(tex.width - 1, Math.floor((lon / (2 * Math.PI)) * tex.width));
      const ty = Math.min(tex.height - 1, Math.floor((0.5 - lat / Math.PI) * tex.height));
      const ti = (ty * tex.width + tx) * 4;
      let rr = tex.data[ti], gg = tex.data[ti + 1], bb = tex.data[ti + 2];
      if (cloud) {
        const ci = (Math.floor(ty * cloud.height / tex.height) * cloud.width + Math.floor(tx * cloud.width / tex.width)) * 4;
        const a = cloud.data[ci + 3] / 255 * 0.9;
        rr += (255 - rr) * a; gg += (255 - gg) * a; bb += (255 - bb) * a;
      }
      const diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      const shade = 0.06 + 0.94 * Math.pow(diff, 0.85);
      const edge = Math.min(1, (1 - Math.sqrt(r2)) * R * 1.2);
      img.data[o] = Math.min(255, rr * shade); img.data[o + 1] = Math.min(255, gg * shade); img.data[o + 2] = Math.min(255, bb * shade);
      img.data[o + 3] = 255 * edge;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = c.toDataURL("image/png");
  snapCache.set(key, url);
  return url;
}

// ——— Anneaux : profil radial (0 = bord intérieur, 1 = bord extérieur) ———
export function ringTexture(kind: "saturne" | "uranus") {
  const W = 1024;
  const c = makeCanvas(W, 1);
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(W, 1);
  const rnd = mulberry32(kind === "saturne" ? 7 : 19);
  const grain = Array.from({ length: W }, () => rnd());
  for (let i = 0; i < W; i++) {
    const t = i / (W - 1);
    let a = 0, col: RGB = [220, 205, 175];
    if (kind === "saturne") {
      const r = 1.239 + t * (2.27 - 1.239); // rayons équatoriaux de Saturne
      const g = 0.85 + grain[i] * 0.3;
      if (r < 1.527) { a = 0.12 + 0.1 * smooth(1.239, 1.52, r); col = [150, 135, 118]; } // anneau C
      else if (r < 1.951) { a = 0.72 + 0.25 * Math.sin((r - 1.527) * 40) * 0.3 + 0.2 * smooth(1.53, 1.75, r); col = mixc([214, 196, 160], [240, 226, 196], smooth(1.6, 1.9, r)); } // anneau B
      else if (r < 2.025) { a = 0.05 + 0.04 * Math.exp(-((r - 1.99) ** 2) / 0.0002); col = [120, 110, 100]; } // division de Cassini
      else if (r < 2.269) { a = 0.52 - 0.1 * smooth(2.1, 2.26, r); col = [205, 192, 168]; if (Math.abs(r - 2.214) < 0.004) a = 0.03; } // anneau A + division d'Encke
      a *= g;
    } else {
      const r = 1.64 + t * (2.02 - 1.64);
      for (const [rr, wdt, s] of [[1.64, 0.004, 0.25], [1.65, 0.004, 0.2], [1.72, 0.004, 0.2], [1.83, 0.005, 0.2], [1.86, 0.004, 0.25], [1.9, 0.005, 0.3], [2.0, 0.012, 0.45]])
        a = Math.max(a, s * Math.exp(-((r - rr) ** 2) / (wdt * wdt)));
      col = [120, 128, 132];
      a *= 0.55;
    }
    img.data[i * 4] = col[0]; img.data[i * 4 + 1] = col[1]; img.data[i * 4 + 2] = col[2]; img.data[i * 4 + 3] = Math.max(0, Math.min(1, a)) * 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
