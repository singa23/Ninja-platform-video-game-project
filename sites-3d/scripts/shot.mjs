// Usage : node scripts/shot.mjs <app> [--video] [--wait=ms]
// Capture desktop + mobile de apps/<app>/out, vérifie le rendu WebGL et les erreurs.
// Si apps/<app>/qa.mjs existe, il est exécuté : export default async ({ page, shot, vp, log }) => {...}
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, startServer, launch, openPage, checkCanvases } from "./lib.mjs";

const app = process.argv[2];
if (!app) { console.error("usage: node scripts/shot.mjs <app> [--video] [--wait=ms]"); process.exit(1); }
const video = process.argv.includes("--video");
const wait = Number((process.argv.find((a) => a.startsWith("--wait=")) || "--wait=4000").split("=")[1]);
const outDir = path.join(ROOT, "screenshots", app);
fs.mkdirSync(outDir, { recursive: true });

const qaFile = path.join(ROOT, "apps", app, "qa.mjs");
const qa = fs.existsSync(qaFile) ? (await import(pathToFileURL(qaFile).href + "?t=" + process.hrtime.bigint())).default : null;

const server = await startServer(app);
const browser = await launch();
const report = { app, url: server.url, viewports: {} };
let failed = false;
try {
  for (const vp of ["desktop", "mobile"]) {
    const extra = video && vp === "desktop" ? { recordVideo: { dir: outDir, size: { width: 1280, height: 800 } } } : {};
    const { context, page, problems } = await openPage(browser, server.url, vp, extra);
    await page.waitForTimeout(wait);
    const shots = [];
    const shot = async (name, opts = {}) => {
      const file = path.join(outDir, `${vp}-${name}.png`);
      await page.screenshot({ path: file, ...opts });
      shots.push(path.relative(ROOT, file));
      return file;
    };
    await shot("01-accueil");
    const canvases = await checkCanvases(page);
    const logs = [];
    if (qa) {
      try { await qa({ page, shot, vp, log: (m) => logs.push(String(m)) }); }
      catch (e) { problems.push(`qa.mjs a échoué: ${e.message}`); }
    }
    await shot("99-pleine-page", { fullPage: true });
    const v = page.video();
    await context.close();
    if (v) { const p = await v.path(); const dest = path.join(outDir, "demo.webm"); fs.renameSync(p, dest); shots.push(path.relative(ROOT, dest)); }
    const blank = canvases.filter((c) => c.blank);
    if (problems.length || blank.length || canvases.length === 0) failed = true;
    report.viewports[vp] = { canvases, problems, qaLog: logs, shots };
  }
} finally {
  await browser.close();
  await server.close();
}
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(failed ? "\n❌ PROBLÈMES DÉTECTÉS (voir ci-dessus)" : "\n✅ OK : WebGL rendu, aucune erreur");
process.exit(failed ? 2 : 0);
