// Adding quests by voice: the text parser, and the Add → preview → save flow.
import { prepare, state, noLoot, pinchTwice, showQuest } from "../lib/helpers.mjs";

// [what you say, type, title, schedule shown] — clock pinned to 10:00 AM.
const CASES = [
  ["call mom at 3pm", "side", "Call mom", "⏰ 3:00 PM"],
  ["dentist tomorrow at 9:30am", "side", "Dentist", "⏰ Tomorrow 9:30 AM"],
  ["take out bins in 2 hours", "side", "Take out bins", "⏰ 12:00 PM"],
  ["daily: take meds at 8am", "daily", "Take meds", "⏰ Every day 8:00 AM"],
  ["stretch for 10 minutes", "side", "Stretch for 10 minutes", ""],
  ["pay rent tomorrow", "side", "Pay rent", "⏰ Tomorrow 9:00 AM"],
  ["read the daily news", "side", "Read the daily news", ""],
  ["lunch with sam at noon", "side", "Lunch with sam", "⏰ 12:00 PM"],
  ["call dad tonight", "side", "Call dad", "⏰ 8:00 PM"],
  ["water plants at 9am", "side", "Water plants", "⏰ Tomorrow 9:00 AM"],
  ["important pay rent", "main", "Pay rent", ""],
  ["remind me to call mom", "side", "Call mom", ""],
];

export default async function (t, page, shot) {
  await prepare(page);

  for (const [said, type, title, schedule] of CASES) {
    const d = await page.eval(`(() => { const d = parseQuestText(${JSON.stringify(said)}); return [d.type, d.title, formatSchedule(d)]; })()`);
    t.eq(d, [type, title, schedule], `"${said}"`);
  }
  t.eq(await page.eval(`parseQuestText("...")`), null, "gibberish is rejected");

  // The flow: ▲ → type → preview → ▶ change type → pinch to add
  await page.key("ArrowUp");
  await page.type("feed the cat");
  await page.key("Enter");
  t.eq(await page.eval("el.draftTitle.textContent"), "Feed the cat", "the preview shows what was heard");
  await page.key("ArrowRight");
  t.ok((await page.eval("el.draftType.textContent")).includes("MAIN"), "▶ changes the type");
  await shot("preview");
  await page.key("Enter");
  const s = await state(page);
  t.eq([s.screen, s.toast], ["quest", "Quest added!"], "pinch adds it to the board");
  t.eq(await page.eval("[currentQuest().title, currentQuest().type]"), ["Feed the cat", "main"], "…as a main quest");

  // ----- An added DAILY quest comes back every day; a side quest doesn't -----
  await noLoot(page);
  const add = async (said) => {
    await page.key("ArrowUp");
    await page.type(said);
    await page.key("Enter");                         // → preview
    await page.key("Enter");                         // → add
    const id = await page.eval("currentQuest().id");
    await page.sleep(1700);                          // let queued pop-ups (achievements) arrive…
    await prepare(page);                             // …and clear them, so they don't eat a pinch
    await showQuest(page, id);
    return id;
  };
  const flossId = await add("daily: floss teeth");
  t.eq(await page.eval("currentQuest().type"), "daily", "\"daily: floss teeth\" is added as a daily quest");
  await pinchTwice(page);
  await page.eval("skipRewards(); true");
  const milkId = await add("buy milk");
  await pinchTwice(page);
  await page.eval("skipRewards(); true");
  const quest = (id) => `QUESTS.find((q) => q.id === ${JSON.stringify(id)})`;
  t.ok(await page.eval(`${quest(flossId)}.completed && ${quest(milkId)}.completed`), "both are done today");

  // Close and reopen the app (the save is all that survives).
  const reopen = async () => {
    await page.eval("location.reload(); true");
    await page.sleep(300);
    await page.waitFor("document.readyState === 'complete' && typeof ui !== 'undefined' && typeof el !== 'undefined'");
    await page.sleep(250);
  };
  await reopen();
  t.ok(await page.eval(`${quest(flossId)}?.completed === true`), "after reopening the same day, the daily is still done");

  // Next day (the reset runs from the background check, like after midnight).
  await page.eval(`player.lastDailyReset = "2000-01-01"; ui.alertQueue = []; ui.currentAlert = null; runBackgroundChecks(); true`);
  t.ok(await page.eval(`${quest(flossId)} && !${quest(flossId)}.completed && isAvailable(${quest(flossId)})`),
    "next day: the added daily quest is back on the board, not done");
  t.eq(await page.eval(`${quest(milkId)} === undefined`), true, "…and the finished side quest is gone");
  await reopen();
  t.ok(await page.eval(`${quest(flossId)} && !${quest(flossId)}.completed`), "…and it stays back after reopening the app");
}
