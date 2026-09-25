// Usage : node scripts/dev.mjs <app>   → serveur de dev sur http://localhost:3000
import { spawn } from "node:child_process";
import { ROOT } from "./lib.mjs";

const app = process.argv[2];
if (!app) { console.error("usage: npm run dev -- <app>"); process.exit(1); }
spawn("npx", ["next", "dev", `apps/${app}`], { cwd: ROOT, stdio: "inherit" });
