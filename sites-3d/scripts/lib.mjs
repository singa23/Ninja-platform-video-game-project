// Outils partagés : serveur statique + navigateur Chromium avec WebGL logiciel.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PNG } from "pngjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".woff2": "font/woff2", ".woff": "font/woff", ".glb": "model/gltf-binary", ".ico": "image/x-icon",
};

/**
 * Sert apps/<app>/out sous un sous-dossier (/preview/<app>/) pour vérifier
 * que tous les chemins sont bien relatifs, comme sur un hébergement statique.
 */
export async function startServer(app) {
  const outDir = path.join(ROOT, "apps", app, "out");
  if (!fs.existsSync(path.join(outDir, "index.html"))) {
    throw new Error(`Pas de build pour "${app}" : lancez d'abord  npx next build apps/${app}`);
  }
  const prefix = `/preview/${app}/`;
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    if (!url.startsWith(prefix)) { res.writeHead(404); res.end("hors préfixe (chemin absolu ?) " + url); return; }
    let file = path.join(outDir, url.slice(prefix.length));
    if (!file.startsWith(outDir)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) { res.writeHead(404); res.end("introuvable " + url); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}${prefix}`;
  return { url, close: () => new Promise((r) => server.close(r)) };
}

export async function launch() {
  return chromium.launch({
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"],
  });
}

export const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

/** Ouvre une page en collectant erreurs console / exceptions / requêtes échouées. */
export async function openPage(browser, url, vp = "desktop", extra = {}) {
  const context = await browser.newContext({ ...VIEWPORTS[vp], ...extra });
  const page = await context.newPage();
  const problems = [];
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console.error: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`exception: ${e.message}`));
  page.on("requestfailed", (r) => problems.push(`requête échouée: ${r.url()} (${r.failure()?.errorText})`));
  page.on("response", (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(url, { waitUntil: "load" });
  return { context, page, problems };
}

/** Analyse une capture PNG : renvoie l'écart-type de luminance (≈0 = image vide/unie). */
export function pngStats(buffer) {
  const png = PNG.sync.read(buffer);
  let n = 0, sum = 0, sum2 = 0;
  for (let i = 0; i < png.data.length; i += 4 * 7) {
    const l = 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
    sum += l; sum2 += l * l; n++;
  }
  const mean = sum / n;
  return { mean: +mean.toFixed(1), std: +Math.sqrt(Math.max(0, sum2 / n - mean * mean)).toFixed(1) };
}

/** Vérifie que chaque <canvas> WebGL visible affiche autre chose qu'une couleur unie. */
export async function checkCanvases(page) {
  const canvases = await page.locator("canvas").all();
  const out = [];
  for (const [i, c] of canvases.entries()) {
    if (!(await c.isVisible())) continue;
    const box = await c.boundingBox();
    if (!box || box.width < 20 || box.height < 20) continue;
    const stats = pngStats(await c.screenshot());
    out.push({ index: i, width: Math.round(box.width), height: Math.round(box.height), ...stats, blank: stats.std < 3 });
  }
  return out;
}
