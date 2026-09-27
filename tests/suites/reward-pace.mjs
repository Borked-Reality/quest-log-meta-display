// "Reward screens" setting: how long Quest Complete / Level Up / the chest
// result stay up. Quick = the old timings, Relaxed (default) = longer,
// Wait for pinch = they never move on by themselves. A pinch always moves on.
import { prepare, showQuest, noLoot, pinchTwice } from "../lib/helpers.mjs";

// Pops up ~1s after a completion (achievements) would change the screen: clear them.
async function settle(page, pace) {
  await page.sleep(1300);
  await prepare(page);
  await page.eval(`settings.rewardPace = "${pace}"; settings.sass = "off"; player.xp = 0; true`);
}

export default async function (t, page) {
  await prepare(page);
  await noLoot(page);
  t.ok(await page.eval(`SETTINGS_ITEMS.some((i) => i.key === "rewardPace")`), "\"Reward screens\" is in Settings");

  // ----- Relaxed: Quest Complete stays up past the old 2.4s, then moves on -----
  await settle(page, "relaxed");
  await showQuest(page, "vitamins");
  await pinchTwice(page);
  await page.sleep(3000);
  t.eq(await page.eval("ui.screen"), "complete", "Relaxed: Quest Complete is still up after 3s (Quick left at 2.4s)");
  await page.waitFor(`ui.screen !== "complete"`, { timeout: 3000 });
  t.ok(true, "…and moves on by itself after ~4s");

  // ----- Relaxed: Level Up stays up ~7s -----
  await settle(page, "relaxed");
  await page.eval(`player.xp = xpNeededFor(player.level) - 1; true`);
  await showQuest(page, "tidy");
  await pinchTwice(page);
  await page.waitFor(`ui.screen === "levelUp"`, { timeout: 5000 });
  await page.sleep(5000);
  t.eq(await page.eval("ui.screen"), "levelUp", "Relaxed: LEVEL UP is still up after 5s (Quick left at 4s)");
  await page.key("Enter");
  t.ok(await page.eval(`ui.screen !== "levelUp"`), "…and a pinch moves on right away");

  // ----- Wait for pinch: nothing moves on by itself -----
  await settle(page, "pinch");
  await showQuest(page, "trash");
  await pinchTwice(page);
  await page.sleep(8000);
  t.eq(await page.eval("ui.screen"), "complete", "Wait for pinch: Quest Complete is still up after 8s");
  await page.key("Enter");
  t.ok(await page.eval(`ui.screen !== "complete"`), "…until you pinch");

  // ----- Quick: the old timings -----
  await settle(page, "quick");
  await showQuest(page, "email");
  await pinchTwice(page);
  await page.waitFor(`ui.screen !== "complete"`, { timeout: 3200 });
  t.ok(true, "Quick: Quest Complete moves on after ~2.4s");
}
