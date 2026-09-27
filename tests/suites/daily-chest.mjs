// Daily login chest: offered once a day, streak-based minimum rarity.

export default async function (t, page, shot) {
  // A fresh save starts on the daily chest alert (no prepare(): keep it).
  t.ok((await page.eval("el.alertTitle.textContent")) === "Day 1 login reward", "day 1 is offered on first open");
  await page.key("Enter");
  await page.waitFor(`ui.screen === "loot"`);
  t.eq(await page.eval("el.chestTitle.textContent"), "🎁 DAILY CHEST · DAY 1", "the chest shows a DAILY CHEST banner");
  await shot("banner");
  await page.waitFor(`ui.chest.phase === "result"`, { timeout: 12000 });
  t.eq(await page.eval("[player.loginStreak, player.lastDailyChest === dateKey(clock())]"), [1, true],
    "opening it starts the login streak");
  await page.key("Enter");

  await page.eval("ui.alertQueue = []; ui.currentAlert = null; offerDailyChest(); true");
  t.ok(await page.eval("ui.alertQueue.length === 0 && ui.currentAlert === null"), "only one daily chest per day");

  // Rarity floor by streak day
  t.eq(await page.eval("[1, 2, 3, 4, 5, 6, 7, 14].map(minTierForDay)"), [0, 0, 1, 1, 2, 2, 3, 3],
    "minimum rarity: day 3 uncommon, day 5 rare, every 7th day epic");
  t.ok(await page.eval(`Array.from({ length: 60 }, () => rollRarity(2)).every((r) => r === "rare" || r === "epic")`),
    "a 'rare or better' roll never gives common/uncommon");

  // Dismissing keeps it for later; day 7 is a guaranteed epic
  await page.eval(`player.lastDailyChest = yesterdayKey(); player.loginStreak = 6; showHome(); offerDailyChest(); true`);
  t.eq(await page.eval("[el.alertTitle.textContent, el.alertDetail.textContent]"), ["Day 7 login reward", "Guaranteed EPIC today!"],
    "day 7 is announced as a guaranteed EPIC");
  await page.key("Escape");
  t.ok(await page.eval("player.lastDailyChest === yesterdayKey()"), "dismissing it doesn't use it up");
  await page.eval("offerDailyChest(); true");
  await page.key("Enter");
  await page.waitFor(`ui.screen === "loot"`);
  t.eq(await page.eval("[ui.chest.item.rarity, player.loginStreak, player.lifetime.bestLoginStreak]"), ["epic", 7, 7],
    "day 7 opens an EPIC and the streak is 7");
  await page.eval("skipRewards(); true");

  // Missing a day resets the streak
  await page.eval(`player.lastDailyChest = "2000-01-01"; true`);
  t.eq(await page.eval("nextLoginDay()"), 1, "missing a day starts again at day 1");
}
