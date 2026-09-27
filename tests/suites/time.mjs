// Timers, scheduled quests, and the midnight reset.
import { prepare, showQuest, noLoot, pinchTwice } from "../lib/helpers.mjs";

export default async function (t, page) {
  await prepare(page);
  await noLoot(page);

  // ----- Timer runs out → TIME'S UP → menu → complete -----
  await showQuest(page, "walk");
  await pinchTwice(page);
  t.ok(await page.eval(`player.timer && player.timer.questId === "walk"`), "the timer starts");
  await page.eval("player.timer.endsAt = nowMs() + 400; true");
  await page.waitFor(`ui.screen === "alert"`, { timeout: 4000 });
  t.ok((await page.eval("el.alertLabel.textContent")).includes("TIME'S UP"), "a TIME'S UP alert appears");
  await page.key("Enter");
  t.ok(await page.eval(`isDoubleArmed() && el.hintConfirmLabel.textContent === "Again!"`),
    "pinching it opens the quest ready to finish (one more pinch)");
  await page.sleep(300);
  await page.key("Enter");
  t.ok(await page.eval(`QUESTS.find((q) => q.id === "walk").completed && player.timer === null`),
    "2nd pinch completes it and clears the timer");
  await page.eval("skipRewards(); true");

  // ----- Scheduled quest → QUEST TIME alert when due -----
  await page.eval(`addQuestToBoard({ id: "t-call", title: "Call mom", dueAt: nowMs() + 30 * 60000 }); true`);
  t.ok((await page.eval(`formatSchedule(QUESTS.find((q) => q.id === "t-call"))`)).startsWith("⏰"), "it shows a ⏰ time");
  await page.eval(`QuestLog.handleAction("timeWarp"); true`);
  t.ok((await page.eval("el.alertLabel.textContent")).includes("QUEST TIME"), "an hour later: QUEST TIME alert");
  await page.key("Escape");
  t.ok((await page.eval(`formatSchedule(QUESTS.find((q) => q.id === "t-call"))`)).includes("Overdue"), "…and it's marked overdue");

  // ----- A new day resets dailies and offers the daily chest -----
  await page.eval(`player.questProgress.hydrate = 3; player.lastDailyReset = "2000-01-01"; ui.alertQueue = []; ui.currentAlert = null; runBackgroundChecks(); true`);
  t.eq(await page.eval("progressOf(QUESTS[0])"), 0, "counters reset at midnight");
  const labels = await page.eval("[ui.currentAlert, ...ui.alertQueue].filter(Boolean).map((a) => a.label)");
  t.ok(labels.some((l) => l.includes("DAILY CHEST")), "the daily chest is offered", JSON.stringify(labels));
  t.ok(labels.includes("NEW DAY"), "a NEW DAY alert appears", JSON.stringify(labels));
}
