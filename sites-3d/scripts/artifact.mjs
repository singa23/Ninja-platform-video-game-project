// Usage : node scripts/artifact.mjs <app> [--check]
// Prépare apps/<app>/out pour une publication en page Artifact claude.ai :
//  - index.html réduit à son contenu (l'hébergeur ajoute lui-même doctype/html/head/body)
//  - fichiers annexes limités à _next/ (le reste de l'export n'est pas utile en page unique)
// --check : simule l'enveloppe de l'hébergeur dans Chromium et remonte les erreurs.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { ROOT, launch, openPage, checkCanvases } from "./lib.mjs";

const app = process.argv[2];
const src = path.join(ROOT, "apps", app, "out");
const dest = path.join(ROOT, "artifact", app);
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(path.join(src, "_next"), path.join(dest, "_next"), { recursive: true });

let html = fs.readFileSync(path.join(src, "index.html"), "utf8");
html = html
  .replace(/<!DOCTYPE html>/i, "")
  .replace(/<html[^>]*>/i, "")
  .replace(/<\/html>/i, "")
  .replace(/<head[^>]*>/i, "")
  .replace(/<\/head>/i, "")
  .replace(/<body[^>]*>/i, "")
  .replace(/<\/body>/i, "");
// <title> en tête du fichier (seuls les 8 premiers Ko sont lus pour le titre)
const title = html.match(/<title>[^<]*<\/title>/i)?.[0] || "";
html = title + html.replace(title, "");
fs.writeFileSync(path.join(dest, "index.html"), html);

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : files.push(path.relative(dest, p)); } })(dest);
const bigTotal = files.reduce((s, f) => s + fs.statSync(path.join(dest, f)).size, 0);
console.log(`${app}: ${files.length} fichiers, ${(bigTotal / 1e6).toFixed(2)} Mo, titre ${title}`);
if (files.length > 250) console.log("⚠️  plus de 250 fichiers : trop pour une publication");
fs.writeFileSync(path.join(dest, "files.json"), JSON.stringify(files.filter((f) => f !== "index.html"), null, 0));

if (process.argv.includes("--check")) {
  // Enveloppe comparable à celle de l'hébergeur
  const skeleton = (body) => `<!doctype html><html lang="en" style="color-scheme:light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui;background:#fafaf8}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]).replace(/^\/a\//, "");
    if (url === "" || url === "index.html") { res.writeHead(200, { "content-type": "text/html" }); res.end(skeleton(fs.readFileSync(path.join(dest, "index.html"), "utf8"))); return; }
    const f = path.join(dest, url);
    if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    const ext = path.extname(f);
    res.writeHead(200, { "content-type": { ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" }[ext] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await launch();
  const { page, problems } = await openPage(browser, `http://127.0.0.1:${server.address().port}/a/`);
  await page.waitForTimeout(5000);
  const canvases = await checkCanvases(page);
  fs.mkdirSync(path.join(ROOT, "screenshots", app), { recursive: true });
  await page.screenshot({ path: path.join(ROOT, "screenshots", app, "artifact-check.png") });
  console.log(JSON.stringify({ canvases, problems }, null, 2));
  await browser.close(); server.close();
}
