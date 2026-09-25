// Usage : node scripts/build.mjs [app...]  (sans argument : toutes les apps)
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { ROOT } from "./lib.mjs";

const apps = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(path.join(ROOT, "apps")).filter((d) => !d.startsWith("_"));
for (const app of apps) {
  console.log(`\n▶ build ${app}`);
  execSync(`npx next build apps/${app}`, { cwd: ROOT, stdio: "inherit" });
}
