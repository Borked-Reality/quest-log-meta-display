// Quest Log // HUD — test runner.
//
//   node tests/run.mjs                 run everything (~2 minutes)
//   node tests/run.mjs chest shop      run only these suites
//   node tests/run.mjs --shots         also save screenshots to tests/screenshots/
//
// Needs Node 22+ and Chrome (or Edge). Nothing to install. Set CHROME_PATH
// if Chrome isn't found. Exit code is 1 if anything fails.
//
// Each suite starts from a fresh, empty save and drives the real
// index.html with real key presses (the Neural Band arrives as keys).

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "./lib/browser.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const SHOTS = args.includes("--shots");
const ONLY = args.filter((a) => !a.startsWith("--"));

// Suite files run in this order.
const SUITES = [
  "startup", "navigation", "quest-menu", "pinch", "add-quest", "time",
  "chest", "warmup", "daily-chest", "shop", "cosmetics", "profile", "achievements", "layout", "sounds",
];

let passed = 0;
let failed = 0;
const failures = [];

function makeT(suite) {
  return {
    ok(condition, name, detail = "") {
      if (condition) {
        passed++;
        console.log(`  ✓ ${name}`);
      } else {
        failed++;
        failures.push(`${suite}: ${name}${detail ? ` — ${detail}` : ""}`);
        console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ""}`);
      }
    },
    eq(actual, expected, name) {
      const a = JSON.stringify(actual);
      const e = JSON.stringify(expected);
      this.ok(a === e, name, a === e ? "" : `expected ${e}, got ${a}`);
    },
  };
}

// 1. Every script must at least parse.
console.log("\nsyntax");
const jsFiles = [];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
  const p = path.join(dir, d.name);
  if (d.isDirectory()) walk(p);
  else if (p.endsWith(".js")) jsFiles.push(p);
});
walk(path.join(ROOT, "js"));
const t0 = makeT("syntax");
for (const file of jsFiles) {
  let ok = true;
  let msg = "";
  try { execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }); }
  catch (e) { ok = false; msg = String(e.stderr || e.message).split("\n").slice(0, 3).join(" "); }
  t0.ok(ok, path.relative(ROOT, file), msg);
}

// 2. The browser suites.
const page = await openBrowser({ root: ROOT });
page.jsFileCount = jsFiles.length;            // startup checks index.html loads them all
for (const name of SUITES) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  console.log(`\n${name}`);
  const t = makeT(name);
  const shot = async (label) => {
    if (SHOTS) await page.screenshot(path.join(ROOT, "tests", "screenshots", `${name}-${label}.png`));
  };
  try {
    await page.fresh();
    page.errors.length = 0;
    const suite = await import(`./suites/${name}.mjs`);
    await suite.default(t, page, shot);
    t.ok(page.errors.length === 0, "no errors on the page", page.errors.join(" | "));
  } catch (err) {
    t.ok(false, "suite crashed", err.stack ? err.stack.split("\n").slice(0, 3).join(" ") : String(err));
  }
}
await page.close();

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log(`  • ${f}`));
  process.exit(1);
}
