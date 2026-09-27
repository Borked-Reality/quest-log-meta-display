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
}
