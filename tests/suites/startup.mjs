// The page loads every script and starts cleanly, and has an app icon.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Width × height of a PNG file, or null if it isn't a PNG.
function pngSize(file) {
  const png = fs.readFileSync(file);
  if (png.subarray(1, 4).toString() !== "PNG" || png.subarray(12, 16).toString() !== "IHDR") return null;
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

export default async function (t, page, shot) {
  const info = await page.eval(`({
    scripts: document.querySelectorAll('script[src^="js/"]').length,
    screen: ui.screen,
    label: el.alertLabel.textContent,
    clock: el.clockTime.textContent,
  })`);
  t.eq(info.scripts, page.jsFileCount, "index.html loads every file in js/");
  t.eq(info.screen, "alert", "a fresh day starts with an alert…");
  t.ok(info.label.includes("DAILY CHEST"), "…the daily chest", info.label);
  t.ok(/\d:\d\d/.test(info.clock), "the header clock shows the time", info.clock);
  t.eq(await page.eval("settings.rewardPace"), "relaxed", "reward screens default to Relaxed (time to read them)");
  // ----- App icon (the chest) -----
  // The glasses' app list needs what Meta's own packager produces: a PNG
  // favicon bigger than 52×52 and a web manifest with icons, at the app root.
  // (Images load fine from disk; the manifest is read from disk here.)
  const icons = await page.eval(`Promise.all([...document.querySelectorAll('link[rel$="icon"]')].map((l) => new Promise((done) => {
    const img = new Image();
    img.onload = () => done({ rel: l.rel, href: l.getAttribute("href"), type: l.type, width: img.naturalWidth });
    img.onerror = () => done({ rel: l.rel, href: l.getAttribute("href"), type: l.type, width: 0 });
    img.src = l.href;
  })))`);
  const favicon = icons.find((i) => i.rel === "icon");
  t.ok(favicon && favicon.type === "image/png" && favicon.href === "favicon.png", "the favicon is favicon.png, declared as a PNG", JSON.stringify(icons));
  t.ok(favicon && favicon.width > 52, "…and it loads, bigger than 52×52", JSON.stringify(favicon));
  t.ok(icons.every((i) => i.width > 0), "every declared icon loads", JSON.stringify(icons));

  const manifestHref = await page.eval(`document.querySelector('link[rel="manifest"]')?.getAttribute("href") || ""`);
  t.eq(manifestHref, "manifest.webmanifest", "a web manifest is linked");
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(path.join(ROOT, manifestHref), "utf8")); } catch { /* reported below */ }
  t.ok(manifest.name && manifest.short_name && manifest.start_url, "the manifest is valid JSON with a name and start URL", JSON.stringify(manifest).slice(0, 120));
  const badIcons = (manifest.icons || []).filter((icon) => {
    const size = fs.existsSync(path.join(ROOT, icon.src)) && pngSize(path.join(ROOT, icon.src));
    return !size || size[0] <= 52 || `${size[0]}x${size[1]}` !== icon.sizes;
  });
  t.ok((manifest.icons || []).length > 0 && badIcons.length === 0, "every manifest icon is a real PNG over 52px, at the size it claims", JSON.stringify(badIcons));
  // Without a maskable icon, launchers shrink the icon into a small circle in
  // the middle of the tile (seen on the glasses, 2026-09-28).
  t.ok((manifest.icons || []).some((icon) => icon.purpose === "maskable"), "there's a maskable icon, so the launcher fills the whole tile");
  await shot("start");
}
