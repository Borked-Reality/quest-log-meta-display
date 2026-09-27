// Achievements: unlocking, rewards, the pop-up, secrets, locked shop
// items, and the trophy grid on the Profile.
import { prepare, showQuest, noLoot, doublePinch } from "../lib/helpers.mjs";

const unlocked = (page, id) => page.eval(`!!player.achievements[${JSON.stringify(id)}]`);
// Wait for the (slightly delayed) unlock pop-up.
const popup = async (page) => {
  await page.waitFor(`ui.screen === "alert" && ui.currentAlert && ui.currentAlert.kind === "achievement"`, { timeout: 4000 });
  return page.eval("[el.alertLabel.textContent, el.alertTitle.textContent, el.alertDetail.textContent, el.hintConfirmLabel.textContent]");
};

export default async function (t, page, shot) {
  await prepare(page);
  await noLoot(page);

  t.eq(await page.eval("ACHIEVEMENTS.length"), 30, "30 achievements");
  t.eq(await page.eval("Object.keys(player.achievements).length"), 0, "a new player has none");

  // ----- First Quest: a gold reward -----
  const gold0 = await page.eval("player.gold");
  await showQuest(page, "vitamins");
  await doublePinch(page);
  await page.eval("skipRewards(); true");
  let pop = await popup(page);
  t.ok(pop[0].includes("ACHIEVEMENT UNLOCKED") && pop[1].includes("First Quest"), "completing a quest unlocks First Quest", pop.join(" | "));
  t.eq(pop[3], "Nice!", "gold rewards just say Nice!");
  t.eq(await page.eval("player.gold") - gold0, 2 + 20, "…and pay out their gold (+20)");
  await shot("popup");
  await page.key("Enter");

  // ----- Hydro Homie: progress, then a cosmetic reward you can equip -----
  await page.eval("player.counters.glasses = 98; saveProgress(); true");
  t.ok(!(await unlocked(page, "hydro")), "98 glasses isn't enough yet");
  await page.eval(`ui.profileIndex = 1 + ACHIEVEMENTS.findIndex((a) => a.id === "hydro"); showProfileScreen(); true`);
  t.eq(await page.eval("el.achProgressText.textContent"), "98 / 100", "the profile shows progress 98 / 100");
  await showQuest(page, "hydrate");
  await doublePinch(page);
  await page.sleep(300);
  await doublePinch(page);
  pop = await popup(page);
  t.ok(pop[1].includes("Hydro Homie"), "the 100th glass unlocks Hydro Homie");
  t.eq(pop[3], "Equip", "…and offers to equip its reward");
  t.ok(await page.eval(`player.unlocks.includes("coin-water")`), "💧 coin rain is now owned");
  await page.key("Enter");
  t.eq(await page.eval("player.equipped.coin"), "💧", "pinch equips it");

  // ----- Secret: ↑ ↑ ↓ ↓ ◀ ▶ ◀ ▶ -----
  await page.eval("showHome(); true");
  for (const k of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight"]) {
    await page.key(k, { wait: 90 });
  }
  pop = await popup(page);
  t.ok(pop[0].includes("SECRET") && pop[1].includes("Old Habits"), "↑↑↓↓◀▶◀▶ unlocks a SECRET achievement", pop.join(" | "));
  await page.key("Enter");
  t.eq(await page.eval("document.documentElement.dataset.theme"), "rainbow", "…and Rainbow Road can be equipped");
  await page.eval(`player.equipped.theme = "dracula"; applyCosmetics(); true`);

  // ----- Secret: poke the void (hold on the all-clear screen 5×) -----
  await page.eval(`QUESTS.forEach((q) => { q.completed = true; }); showHome(); true`);
  t.eq(await page.eval("ui.screen"), "allClear", "(all quests done)");
  for (let i = 0; i < 5; i++) await page.hold(600);
  t.ok(await page.eval(`ui.screen === "allClear" || ui.screen === "alert"`), "holding on the empty board doesn't start a new round");
  pop = await popup(page);
  t.ok(pop[1].includes("Poke the Void"), "5 holds on the empty board: Poke the Void");
  await page.key("Escape");
  t.ok(await page.eval(`player.unlocks.includes("chest-void")`), "the Void Chest is unlocked");

  // ----- Secret: golden potato (the 10% win) -----
  await page.eval(`(() => { const r = Math.random; Math.random = () => 0.01; openChest(LOOT_TABLE.find((i) => i.id === "potato")); Math.random = r; saveProgress(); return true; })()`);
  t.ok(await unlocked(page, "potato"), "finding the golden potato unlocks Spud Luck");

  // ----- Achievement-only shop items -----
  await page.eval(`ui.shopIndex = SHOP_ITEMS.findIndex((i) => i.id === "theme-midnight"); showShopScreen(); true`);
  t.eq(await page.eval("[el.shopPrice.textContent, el.hintConfirmLabel.textContent]"), ["🔒 EARN IT", "Locked"],
    "achievement items show as locked in the shop");
  t.ok((await page.eval("el.shopDesc.textContent")).includes("secret achievement"), "…without spoiling a secret");
  await page.key("Enter");
  t.ok((await page.eval("el.toast.textContent")).includes("secret"), "pinching explains it must be earned");
  t.eq(await page.eval("document.documentElement.dataset.theme"), "midnight", "…but you can still preview it");
  await page.key("ArrowDown");

  // ----- Trophy grid: secrets stay hidden until found -----
  await page.eval(`ui.profileIndex = 1 + ACHIEVEMENTS.findIndex((a) => a.id === "nightowl"); showProfileScreen(); true`);
  t.eq(await page.eval("el.achName.textContent"), "??? · secret", "a locked secret shows as ???");
  await page.eval(`ui.profileIndex = 1 + ACHIEVEMENTS.findIndex((a) => a.id === "konami"); renderAll(); true`);
  t.ok((await page.eval("el.achName.textContent")).includes("Old Habits ✓"), "an unlocked secret shows its name");
  await shot("trophies");

  // ----- Lots at once → one summary pop-up -----
  await page.eval(`ui.alertQueue = []; ui.currentAlert = null; showHome();
    player.lifetime.questsCompleted = 300; player.lifetime.bestStreak = 31; player.level = 21; player.lifetime.chestsOpened = 60;
    saveProgress(); true`);
  pop = await popup(page);
  t.ok(/\d+ ACHIEVEMENTS UNLOCKED/.test(pop[0]), "many at once become one summary pop-up", pop[0]);
  t.eq(await page.eval("ui.alertQueue.filter((a) => a.kind === 'achievement').length"), 0, "…not a pile of pop-ups");
  t.ok(await page.eval(`player.unlocks.includes("chest-prism")`), "the 30-day streak reward (Prismatic Chest) arrives too");
}
