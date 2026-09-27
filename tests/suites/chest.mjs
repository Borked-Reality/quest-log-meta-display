// Treasure chests: can't be skipped, the prize is applied, nothing spoiled.
import { prepare, showQuest, forceLoot, noLoot, pinchTwice } from "../lib/helpers.mjs";

export default async function (t, page, shot) {
  await prepare(page);
  await forceLoot(page, "scratch");

  await showQuest(page, "vitamins");
  await pinchTwice(page);
  await page.waitFor(`ui.screen === "loot"`, { timeout: 5000 });
  t.ok(await page.eval("ui.pendingReveal && ui.pendingReveal.gold > 0 && Number(el.gold.textContent) === player.gold - ui.pendingReveal.gold"),
    "the header gold hides the chest's gold until the reveal");

  // Pinch / middle pinch during the show do nothing
  await page.waitFor(`ui.chest.phase === "rattle" || ui.chest.phase === "rattle2"`);
  await page.key("Enter");
  await page.key("Escape");
  t.ok(await page.eval(`ui.screen === "loot" && ui.chest.phase !== "result"`), "pinches don't skip the chest");
  await page.waitFor(`ui.chest.phase === "spin"`);
  await shot("spin");
  await page.key("Enter");
  t.eq(await page.eval("ui.chest.phase"), "spin", "…not even during the spin");

  await page.waitFor(`ui.chest.phase === "result"`, { timeout: 12000 });
  await page.sleep(300);
  t.ok((await page.eval("el.reelStrip.children[ui.chest.winnerIndex].textContent")).includes("Cursed Scratch Card"),
    "the reel stops on the prize");
  t.ok(/scratched|Nothing/.test(await page.eval("el.chestNote.textContent")), "the scratch card shows its result");
  t.eq(await page.eval("Number(el.gold.textContent)"), await page.eval("player.gold"), "after the reveal, gold is up to date");
  t.eq(await page.eval("el.hintConfirmLabel.textContent"), "Continue", "now a pinch continues");
  await shot("result");
  await page.key("Enter");
  t.ok(await page.eval(`ui.screen !== "loot"`), "…and leaves the chest");

  // A power-up changes later rewards: Goblin Energy Drink = +50% XP
  await forceLoot(page, "goblin");
  await showQuest(page, "tidy");
  await pinchTwice(page);
  await page.eval("skipRewards(); true");             // (swipe down would do this too)
  t.ok(await page.eval(`player.buffs.some((b) => b.id === "goblin")`), "the item was applied even when skipped away");
  await noLoot(page);
  const xpBefore = await page.eval("player.lifetime.xpEarned");
  await showQuest(page, "read");
  await pinchTwice(page);
  t.eq(await page.eval("player.lifetime.xpEarned") - xpBefore, 23, "the next quest pays 15 × 1.5 = 23 XP");
  await page.eval("skipRewards(); true");
}
