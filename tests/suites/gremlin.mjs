// The gremlin (sarcastic AI): when it talks, what it says, and the AI sass setting.
import { prepare, showQuest, noLoot, forceLoot, pinchTwice } from "../lib/helpers.mjs";

// Which list of GREMLIN_LINES a line on screen came from ("" = no line).
async function listOf(page, node) {
  const text = await page.eval(`${node}.hidden ? "" : ${node}.textContent.replace(/^👾 /, "")`);
  if (!text) return "";
  const lists = await page.eval("GREMLIN_LINES");
  // A line matches when its fixed parts match and each {placeholder} matches anything.
  const escape = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = (line) => new RegExp(`^${line.split(/\{\w+\}/).map(escape).join(".+")}$`).test(text);
  const hit = Object.entries(lists).find(([, lines]) => lines.some(matches));
  return hit ? hit[0] : `?: ${text}`;
}

// Achievement pop-ups arrive ~1s after a completion and would eat a pinch:
// let them land, then clear them (prepare also pins the clock).
async function settle(page, options) {
  await page.sleep(1300);
  await prepare(page, options);
}

export default async function (t, page) {
  await prepare(page);
  await noLoot(page);

  // ----- Every line is short enough and fills in cleanly -----
  const lines = await page.eval(`(() => {
    const all = Object.values(GREMLIN_LINES).flat().concat(LOOT_TABLE.filter((i) => i.quip).map((i) => i.quip));
    const known = ["time", "level", "combo", "secs", "late"];
    return {
      count: all.length,
      tooLong: all.filter((l) => l.length > 72),
      unknown: all.flatMap((l) => (l.match(/\\{(\\w+)\\}/g) || []).map((m) => m.slice(1, -1))).filter((k) => !known.includes(k)),
    };
  })()`);
  t.ok(lines.count > 60, `the gremlin has plenty to say (${lines.count} lines)`);
  t.eq(lines.tooLong, [], "every line is short enough for the display (≤ 72 characters)");
  t.eq(lines.unknown, [], "every {placeholder} is one quip() knows how to fill");

  // ----- It doesn't repeat itself -----
  const said = await page.eval(`(() => { settings.sass = "lots"; return Array.from({ length: 12 }, () => quip("complete")); })()`);
  t.eq(new Set(said).size, 12, "12 lines in a row, no repeats");

  // ----- Sass Off: silence everywhere -----
  await page.eval(`settings.sass = "off"; true`);
  await showQuest(page, "vitamins");
  await pinchTwice(page);
  t.eq(await page.eval("el.completeQuip.hidden"), true, "AI sass Off: nothing on the complete screen");
  await page.eval("skipRewards(); true");
  t.eq(await page.eval(`quip("levelUp", { level: 3 }, { always: true })`), "", "…not even on a level up");

  // ----- Sass Lots: a line every time, and the right kind -----
  await settle(page);
  await page.eval(`settings.sass = "lots"; true`);
  await showQuest(page, "tidy");
  await pinchTwice(page);
  t.eq(await listOf(page, "el.completeQuip"), "complete", "AI sass Lots: the complete screen gets a 👾 line");
  await page.eval("skipRewards(); true");

  // 1 AM chores
  await settle(page, { hour: 1 });
  await page.eval(`settings.sass = "lots"; addQuestToBoard({ id: "t-late", title: "Fold laundry", type: "side" }); true`);
  await showQuest(page, "t-late");
  await pinchTwice(page);
  t.eq(await listOf(page, "el.completeQuip"), "completeLate", "a quest done at 1 AM gets roasted for it");
  await page.eval("skipRewards(); true");

  // Added and done in seconds (the real Add flow)
  await settle(page);
  await page.eval(`settings.sass = "lots"; true`);
  await page.key("ArrowUp");
  await page.type("feed the fish");
  await page.key("Enter");
  await page.key("Enter");
  await page.sleep(300);
  await pinchTwice(page);
  t.eq(await listOf(page, "el.completeQuip"), "completeFast", "a quest done seconds after adding it: \"speedrun\"");
  await page.eval("skipRewards(); true");

  // Overdue
  await settle(page);
  await page.eval(`settings.sass = "lots"; addQuestToBoard({ id: "t-over", title: "Call the bank", dueAt: nowMs() - 3 * 3600000 }); true`);
  await showQuest(page, "t-over");
  await pinchTwice(page);
  t.eq(await listOf(page, "el.completeQuip"), "completeOverdue", "an overdue quest gets \"only 3 hours late\"");
  t.ok((await page.eval("el.completeQuip.textContent")).length > 3, "…and says something", await page.eval("el.completeQuip.textContent"));
  await page.eval("skipRewards(); true");

  // ----- Chest: the item's own quip -----
  await settle(page);
  await page.eval(`settings.sass = "lots"; true`);
  await forceLoot(page, "cat");
  await page.eval(`(() => { const item = LOOT_TABLE.find((i) => i.id === "cat"); showChestScreen({ item, gold: 40, isNew: true, note: "" }); return true; })()`);
  t.eq(await page.eval("el.chestQuip.textContent"), await page.eval(`"👾 " + LOOT_TABLE.find((i) => i.id === "cat").quip`),
    "a chest item with its own quip uses it");
  await page.eval("clearRewardTimers(); showHome(); true");

  // ----- Alerts: reminders get sass -----
  await settle(page);
  await page.eval(`settings.sass = "lots"; settings.reminders = true; ui.lastReminderAt = {}; ui.lastActiveAt = nowMs() - 60 * 60000; checkReminders(); true`);
  await page.waitFor(`ui.screen === "alert"`, { timeout: 3000 });
  const kind = await listOf(page, "el.alertQuip");
  t.ok(kind === "still" || kind === "water", "a reminder alert comes with a poke", kind);

  // ----- Gamble items: custom win / lose lines -----
  const gamble = await page.eval(`(() => {
    const cheese = LOOT_TABLE.find((i) => i.id === "cheese");
    const real = Math.random;
    Math.random = () => 0.99; const lose = openChest(cheese).note;
    Math.random = () => 0.01; const win = openChest(cheese).note;
    const vhs = LOOT_TABLE.find((i) => i.id === "vhs");
    Math.random = () => 0.5; const range = openChest(vhs).note;
    Math.random = real;
    return { lose, win, range };
  })()`);
  t.eq([gamble.lose, gamble.win], ["It aged like milk.", "It aged like fine wine! +60 ◆"], "gamble items can say something whether you win or lose");
  t.ok(/^It was a treasure map! \+\d+ ◆$/.test(gamble.range), "…and a range gamble fills in the amount won", gamble.range);

  // ----- The setting -----
  t.ok(await page.eval(`SETTINGS_ITEMS.some((i) => i.key === "sass")`), "AI sass is in Settings");
  await page.eval(`settings.sass = "some"; true`);
}
