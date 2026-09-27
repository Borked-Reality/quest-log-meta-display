// Quest board pinches: double pinch = main action, pinch + hold = Edit /
// Remove menu, single pinch = nothing. Also undo, restore, edit, counters,
// timers and the one-pinch setting.
import { prepare, showQuest, noLoot, doublePinch, state } from "../lib/helpers.mjs";

const done = (page, id) => page.eval(`QUESTS.find((q) => q.id === ${JSON.stringify(id)}).completed`);

// Hold → menu → pick with ▶ (n times) → pinch.
async function holdAndPick(page, rightSwipes) {
  await page.hold();
  for (let i = 0; i < rightSwipes; i++) await page.key("ArrowRight");
  await page.key("Enter");
}

export default async function (t, page, shot) {
  await prepare(page);
  await noLoot(page);

  // ----- Hints -----
  await showQuest(page, "vitamins");
  const hint = await page.eval("[el.hintConfirmKey.textContent, el.hintConfirmLabel.textContent]");
  t.eq(hint, ["PINCH ×2", "Complete"], "the hint says: double pinch to complete");
  t.ok((await page.eval("el.questPager.textContent")).includes("hold pinch"), "…and the card mentions hold for options");
  await shot("board");

  // ----- Single pinch does nothing -----
  const windowMs = await page.eval("CONFIG.DOUBLE_PINCH_MS");
  t.eq(windowMs, 1000, "you get 1 second for the 2nd pinch by default");
  await page.key("Enter");
  t.eq((await state(page)).pinch, "Again!", "one pinch asks for another");
  await page.sleep(windowMs + 200);
  t.ok(!(await done(page, "vitamins")), "a single pinch never completes a quest");
  t.ok((await state(page)).toast.includes("Pinch twice"), "…and explains how");

  // ----- Too slow isn't a double -----
  await page.key("Enter");
  await page.sleep(700);
  await page.key("Enter");
  t.ok(await done(page, "vitamins"), "a relaxed double pinch (700ms apart) still counts");
  await page.eval("skipRewards(); true");
  await showQuest(page, "outside");
  await page.key("Enter");
  await page.sleep(windowMs + 150);
  await page.key("Enter");
  t.ok(!(await done(page, "outside")), "pinches further apart than the setting aren't a double pinch");
  await page.sleep(windowMs + 200);
  await showQuest(page, "vitamins");

  // ----- One pinch reported twice (same instant) isn't a double -----
  await showQuest(page, "outside");
  await page.key("Enter", { wait: 0 });
  await page.key("Enter", { wait: 0 });
  t.ok(!(await done(page, "outside")), "a pinch reported twice at once doesn't count");
  await page.sleep(windowMs + 200);

  // ----- Quick double pinch completes -----
  await showQuest(page, "read");
  await doublePinch(page);
  t.ok(await done(page, "read"), "a quick double pinch completes it");
  t.eq((await state(page)).screen, "complete", "…with the Quest Complete celebration");
  await page.eval("skipRewards(); true");

  // ----- The Settings option changes the window -----
  await page.eval("settings.doublePinchMs = 600; applySettings(); true");
  await showQuest(page, "bed");
  await page.key("Enter");
  await page.sleep(750);
  await page.key("Enter");
  t.ok(!(await done(page, "bed")), "with 'Fast · 0.6s', 750ms apart is too slow");
  await page.eval("settings.doublePinchMs = 1000; applySettings(); true");
  await page.sleep(800);

  // ----- Hold opens the menu -----
  await showQuest(page, "tidy");
  await page.hold();
  let s = await state(page);
  t.eq(s.menu, ["Edit", "Remove"], "pinch + hold opens Edit / Remove");
  t.eq([s.browse, s.middle], ["Action", "Cancel"], "◀ ▶ picks, middle pinch cancels");
  t.ok(!(await done(page, "tidy")), "holding doesn't complete anything");
  await shot("menu");
  await page.key("ArrowRight");
  t.eq((await state(page)).pinch, "Remove", "▶ → Remove");
  await page.key("ArrowRight");
  t.eq((await state(page)).pinch, "Edit", "▶ wraps back to Edit");
  await page.key("Escape");
  t.eq((await state(page)).menu, null, "middle pinch closes the menu");
  await page.hold();
  await page.sleep(4400);
  t.eq((await state(page)).menu, null, "the menu also closes by itself");

  // ----- Remove a quest you added, then undo -----
  await page.eval(`addQuestToBoard({ id: "t-cat", title: "Feed the cat", type: "side" }); true`);
  await showQuest(page, "t-cat");
  await holdAndPick(page, 1);                         // Remove
  t.ok(await page.eval(`!QUESTS.some((q) => q.id === "t-cat") && !player.extraQuests.some((q) => q.id === "t-cat")`),
    "Remove deletes a quest you added");
  t.eq((await state(page)).middle, "Undo", "…and offers BACK Undo");
  await page.key("Escape");
  t.eq((await state(page)).quest, "t-cat", "middle pinch brings it back");

  // ----- Remove a built-in quest, restore it in Settings -----
  await showQuest(page, "tidy");
  await holdAndPick(page, 1);
  t.ok(await page.eval(`player.hiddenQuestIds.includes("tidy") && !availableQuests().some((q) => q.id === "tidy")`),
    "a built-in quest is hidden from the board");
  await page.eval(`ui.settingsIndex = SETTINGS_ITEMS.findIndex((i) => i.key === "restore"); showSettingsScreen(); true`);
  t.ok((await page.eval("el.settingNote.textContent")).includes("1 built-in"), "Settings shows 1 removed quest");
  await page.key("Enter");
  t.eq(await page.eval("player.hiddenQuestIds.length"), 0, "Settings → Removed quests restores it");
  await page.eval("showHome(); true");

  // ----- Edit a quest you added -----
  await showQuest(page, "t-cat");
  await holdAndPick(page, 0);                         // Edit
  t.eq((await state(page)).screen, "add", "Edit opens the voice box…");
  t.eq(await page.eval("el.addLabel.textContent"), "✎ EDIT QUEST", "…in edit mode");
  await page.type("call dad at 3pm");
  await page.key("Enter");                           // text arrives → preview
  await page.key("Enter");                           // pinch: save
  const edited = await page.eval(`(() => { const q = QUESTS.find((q) => q.id === "t-cat"); return { title: q.title, due: !!q.dueAt }; })()`);
  t.eq(edited, { title: "Call dad", due: true }, "the quest is replaced (same id, new title + time)");
  t.eq((await state(page)).toast, "Quest updated!", "…with a confirmation");

  // ----- Editing keeps the old type if you don't say one -----
  await page.eval(`addQuestToBoard({ id: "t-daily", title: "Meditate", type: "daily" }); true`);
  await showQuest(page, "t-daily");
  await holdAndPick(page, 0);
  await page.type("breathe for 5 minutes");
  await page.key("Enter");
  await page.key("Enter");
  t.eq(await page.eval(`QUESTS.find((q) => q.id === "t-daily").type`), "daily", "an edited daily stays daily");

  // ----- Water: double pinch = +1 Glass; hold = Remove only -----
  await showQuest(page, "hydrate");
  t.eq(await page.eval("el.hintConfirmLabel.textContent"), "+1 Glass", "water's main action is +1 Glass");
  await doublePinch(page);
  t.eq(await page.eval("progressOf(QUESTS[0])"), 1, "double pinch logs a glass");
  await page.key("Escape");
  t.eq(await page.eval("progressOf(QUESTS[0])"), 0, "middle pinch undoes it");
  await page.hold();
  t.eq((await state(page)).menu, ["Remove"], "counters can't be edited (hold → Remove only)");
  await page.key("Escape");

  // ----- Timed quest: double pinch starts the timer -----
  await showQuest(page, "walk");
  t.eq(await page.eval("el.hintConfirmLabel.textContent"), "Start 15 min", "timed quests: double pinch starts the timer");
  await doublePinch(page);
  t.ok(await page.eval(`player.timer && player.timer.questId === "walk"`), "…and it runs");
  await page.key("Escape");                          // BACK Stop
  t.ok(await page.eval("player.timer === null"), "middle pinch stops the timer");

  // ----- One-pinch setting -----
  await page.eval("settings.twoPinchComplete = false; applySettings(); true");
  await showQuest(page, "breakfast");
  await page.key("Enter");
  t.ok(await done(page, "breakfast"), "One-pinch setting: a single pinch completes");
  await page.eval("skipRewards(); true");
  await showQuest(page, "breakfast");
  await page.hold();
  t.eq((await state(page)).menu, ["Edit", "Remove"], "…and hold still opens the menu");
  await page.key("Escape");
  await page.eval("settings.twoPinchComplete = true; applySettings(); true");

  // ----- Holding on other screens is just a pinch -----
  await page.eval(`showAlertScreen({ kind: "info", label: "TEST", title: "Hello" }); ui.currentAlert = { kind: "info", label: "TEST", title: "Hello" }; true`);
  await page.hold();
  t.ok(await page.eval(`ui.screen !== "alert"`), "a held pinch on an alert still dismisses it");
}
