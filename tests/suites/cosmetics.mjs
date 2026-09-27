// Cosmetics that have bitten us on the glasses: Rainbow Road must really
// change colours (a CSS filter didn't), and HUD text must not be
// selectable by a pinch-and-move drag.
import { prepare, showQuest } from "../lib/helpers.mjs";

const accent = (page) => page.eval(`getComputedStyle(document.documentElement).getPropertyValue("--green").trim()`);
const hintColour = (page) => page.eval("getComputedStyle(el.hintConfirmLabel).color");

export default async function (t, page) {
  await prepare(page);
  await showQuest(page, "vitamins");

  // ----- Rainbow Road -----
  await page.eval(`player.unlocks.push("theme-rainbow"); player.equipped.theme = "rainbow"; applyCosmetics(); true`);
  const a1 = await accent(page);
  const c1 = await hintColour(page);
  await page.sleep(1500);
  const a2 = await accent(page);
  const c2 = await hintColour(page);
  t.ok(a1 !== a2, "Rainbow Road cycles the accent colour", `${a1} → ${a2}`);
  t.ok(c1 !== c2, "…and on-screen text really changes colour", `${c1} → ${c2}`);

  await page.eval(`player.equipped.theme = "dracula"; applyCosmetics(); true`);
  const back = await accent(page);
  await page.sleep(400);
  t.eq([back, await accent(page)], ["#50fa7b", "#50fa7b"], "switching away stops the cycling (back to green)");

  // ----- No text selection -----
  t.eq(await page.eval("getComputedStyle(document.body).userSelect"), "none", "HUD text is not selectable");
  await page.eval("window.getSelection().removeAllRanges(); true");
  await page.drag(80, 200, 540, 330);                // pinch-and-move across the quest card
  t.eq(await page.eval("window.getSelection().toString()"), "", "a pinch-and-drag across the card selects nothing");

  await page.eval("showAddScreen(); true");
  t.eq(await page.eval("getComputedStyle(el.addInput).userSelect"), "text", "…but the voice box still takes text");
  await page.type("feed the cat");
  t.eq(await page.eval("el.addInput.value"), "feed the cat", "typing into it still works");

  // ----- Every item in the shop really has a look -----
  // (Catches a typo between SHOP_ITEMS and style.css / SOUND_PACKS.)
  const looks = await page.eval(`(() => {
    const out = { theme: [], chest: [], sound: [], font: [] };
    const green = () => getComputedStyle(document.documentElement).getPropertyValue("--green").trim();
    const wood = () => getComputedStyle(el.chestSvg).getPropertyValue("--c-wood").trim();
    applyCosmetics({ theme: "dracula", chest: "wood" });
    const baseGreen = green(), baseWood = wood();
    SHOP_ITEMS.forEach((item) => {
      if (item.kind === "theme" && item.value !== "dracula" && item.value !== "rainbow") {
        applyCosmetics({ theme: item.value });
        if (green() === baseGreen) out.theme.push(item.value);
      }
      if (item.kind === "chest" && item.value !== "wood") {
        applyCosmetics({ chest: item.value });
        if (wood() === baseWood) out.chest.push(item.value);
      }
      if (item.kind === "sound" && !SOUND_PACKS[item.value]) out.sound.push(item.value);
      if (item.kind === "font" && item.value !== "system") {
        applyCosmetics({ font: item.value });
        const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-display");
        if (!/QL /.test(fam)) out.font.push(item.value);
      }
    });
    applyCosmetics();
    return out;
  })()`);
  t.eq(looks.theme, [], "every theme changes the colours");
  t.eq(looks.chest, [], "every chest skin changes the chest");
  t.eq(looks.sound, [], "every sound pack exists");
  t.eq(looks.font, [], "every font switches the display font");

  // ----- Coin rains: a mix like 🐱🐶 throws both; symbols stay theme-gold -----
  const coins = await page.eval(`(() => {
    const thrown = (glyph) => {
      ui.coinGlyph = glyph;
      el.particles.querySelectorAll(".coin").forEach((c) => c.remove());
      spawnCoins(40);
      return [...el.particles.querySelectorAll(".coin")];
    };
    const pets = [...new Set(thrown("🐱🐶").map((c) => c.textContent))].sort();
    const notes = thrown("♪♫");
    const out = { pets, notesEmoji: notes.some((c) => c.classList.contains("is-emoji")), notes: [...new Set(notes.map((c) => c.textContent))].sort() };
    el.particles.querySelectorAll(".coin").forEach((c) => c.remove());
    applyCosmetics();
    return out;
  })()`);
  t.eq(coins.pets, ["🐱", "🐶"].sort(), "Cats & Dogs throws both cats and dogs");
  t.eq([coins.notes, coins.notesEmoji], [["♪", "♫"], false], "Mixtape throws ♪ and ♫ in the theme's gold (not as emoji)");
}
