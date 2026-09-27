// Reward warm-up: lays the chest / level-up out once, hidden, after start-up.
// It must leave nothing behind and never touch a real reward.
import { prepare, showQuest, forceLoot, pinchTwice } from "../lib/helpers.mjs";

export default async function (t, page) {
  await prepare(page);
  await page.sleep(4500);                  // starts 3 s after load; each step is quick here
  t.eq(await page.eval("ui.screen"), "quest", "the quest board stays up");
  t.ok(await page.eval("el.screens.loot.hidden && el.screens.levelUp.hidden && el.screens.complete.hidden"), "reward screens stay hidden");
  t.eq(await page.eval("document.querySelectorAll('.is-warming').length"), 0, "no warm-up class left behind");
  t.eq(await page.eval("el.reelStrip.children.length"), 0, "the reel is emptied again");
  t.eq(await page.eval("el.levelUpNumber.textContent"), "", "the level number is cleared");
  t.eq(await page.eval("el.particles.querySelectorAll('.coin').length"), 0, "no coin left in the particle layer");

  // A chest that shows up mid warm-up is left alone.
  await forceLoot(page, "crown");
  await showQuest(page, "vitamins");
  await page.eval("warmUpRewards(); true");
  await pinchTwice(page);
  await page.waitFor(`ui.screen === "loot"`, { timeout: 5000 });
  await page.sleep(1500);                  // warm-up steps would have run by now
  t.ok((await page.eval("el.reelStrip.children[ui.chest.winnerIndex].textContent")).includes(
    await page.eval(`LOOT_TABLE.find((i) => i.id === "crown").name`)), "the real reel still lands on the prize");
  t.eq(await page.eval("document.querySelectorAll('.is-warming').length"), 0, "…and no warm-up class on it");
}
