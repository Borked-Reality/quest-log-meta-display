// Profile: stats card and the collection grid.
import { prepare } from "../lib/helpers.mjs";

export default async function (t, page, shot) {
  await prepare(page);
  await page.eval(`player.lifetime.questsCompleted = 42; player.lifetime.bestStreak = 9; true`);

  for (let i = 0; i < 3; i++) await page.key("ArrowUp");
  t.eq(await page.eval("ui.screen"), "profile", "▲▲▲ opens the profile");
  const stats = await page.eval(`[...el.profileStatsGrid.children].map((r) => r.textContent)`);
  t.ok(stats.includes("Quests done42"), "stats show lifetime numbers", JSON.stringify(stats.slice(0, 3)));
  t.ok(stats.some((s) => s.startsWith("Best streak9")), "…including the best streak");
  await shot("stats");

  // ▶ goes through the achievements first; jump to the first collection item.
  await page.key("ArrowRight");
  t.ok((await page.eval("el.profileKind.textContent")).startsWith("🏆 ACHIEVEMENTS"), "▶ from stats shows achievements");
  await page.eval("ui.profileIndex = 1 + ACHIEVEMENTS.length; renderAll(); true");
  t.eq(await page.eval("el.collectionGrid.children.length"), await page.eval("LOOT_TABLE.length"),
    "the collection grid has every item");
  t.eq(await page.eval("el.collectionName.textContent"), "???", "unfound items are a mystery");
  t.ok((await page.eval("el.profileKind.textContent")).includes("0 /"), "0 found so far");

  // Find the first item in the grid
  await page.eval(`openChest(collectionItems()[0]); renderAll(); true`);
  t.eq(await page.eval("el.collectionName.textContent"), await page.eval("collectionItems()[0].name"),
    "a found item shows its name");
  t.ok((await page.eval("el.collectionEffect.textContent")).includes("found ×1"), "…and how many times");
  t.ok((await page.eval("el.profileKind.textContent")).includes("1 /"), "the count goes up");
  await shot("collection");

  await page.eval("ui.profileIndex = 1; renderAll(); true");
  await page.key("ArrowLeft");
  t.eq(await page.eval("ui.profileIndex"), 0, "◀ goes back to stats");
}
