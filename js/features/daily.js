/* =========================================================
   Quest Log // HUD — Daily reset + reminders
   Midnight reset, timed-quest windows, hydration and stretch nudges.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- DAILY RESET, TIME WINDOWS, REMINDERS ---------- */

// Once per calendar day: reopen daily quests, reset counters, and clear
// out finished one-off quests that arrived on earlier days.
function checkForNewDay() {
  const today = dateKey(clock());
  if (player.lastDailyReset === today) return;
  const isFirstRun = player.lastDailyReset === null;
  player.lastDailyReset = today;

  // Remove completed one-off quests that were added later (walk backwards
  // so splicing is safe). Added DAILY quests stay and reopen below.
  for (let i = QUESTS.length - 1; i >= BASE_QUEST_COUNT; i--) {
    if (QUESTS[i].completed && QUESTS[i].type !== "daily") QUESTS.splice(i, 1);
  }
  player.extraQuests = player.extraQuests.filter((q) => QUESTS.some((x) => x.id === q.id));

  // Reopen daily quests and reset their counters.
  const dailies = QUESTS.filter((q) => q.type === "daily");
  dailies.forEach((q) => { q.completed = false; });
  player.questProgress = {};
  player.announcedQuestIds = [];
  ui.lastReminderAt = {};
  if (!isFirstRun) player.timer = null;               // yesterday's timer is stale

  player.completedQuestIds = QUESTS.filter((q) => q.completed).map((q) => q.id);
  player.currentQuestIndex = 0;
  ensureCurrentAvailable();
  saveProgress();

  if (!isFirstRun) {
    offerDailyChest();
    // Timed quests open during the day get their own announcement later.
    announceOpenedQuests(true);
    notify({
      kind: "info",
      label: "NEW DAY",
      title: "Daily quests refreshed",
      detail: `${availableQuests().filter((q) => q.type === "daily").length} daily quests ready`,
    });
  }
}

// Announces timed quests when their window opens ("Plan tomorrow" at 6pm).
// silent = just mark what's open now as seen (used at start-up).
function announceOpenedQuests(silent) {
  QUESTS.forEach((quest) => {
    if (!quest.window || quest.completed || !isAvailable(quest)) return;
    if (player.announcedQuestIds.includes(quest.id)) return;
    player.announcedQuestIds.push(quest.id);
    if (silent) return;
    notify({
      kind: "quest",
      label: "DAILY QUEST UNLOCKED",
      title: quest.title,
      detail: `+${quest.xp} XP   +${quest.gold} ◆`,
      questId: quest.id,
    });
  });
  saveProgress();
}

// Hydration pace + "you've been still too long" nudges.
function checkReminders() {
  if (!settings.reminders || !isWakingHours()) return;

  QUESTS.forEach((quest) => {
    const r = quest.reminder;
    if (!r || quest.completed || !isAvailable(quest)) return;
    const count = progressOf(quest);
    const lastReminder = ui.lastReminderAt[quest.id] || 0;

    if (r.kind === "pace") {
      // How far through the waking day are we? Expect that share of target.
      const hour = clock().getHours() + clock().getMinutes() / 60;
      const dayShare = (hour - CONFIG.DAY_START_HOUR) / (CONFIG.DAY_END_HOUR - CONFIG.DAY_START_HOUR);
      const expected = Math.floor(quest.target * Math.min(Math.max(dayShare, 0), 1));
      if (count >= expected || minutesSince(lastReminder) < r.everyMin) return;

      ui.lastReminderAt[quest.id] = nowMs();
      notify({
        kind: "reminder",
        label: r.label,
        title: r.text,
        detail: `${count} / ${quest.target} ${quest.units} · aim for ${expected} by now`,
        questId: quest.id,
        action: "log",
      });
    }

    if (r.kind === "still") {
      const stillFor = minutesSince(ui.lastActiveAt);
      if (stillFor < r.afterMin || minutesSince(lastReminder) < r.afterMin) return;

      ui.lastReminderAt[quest.id] = nowMs();
      notify({
        kind: "reminder",
        label: `STILL FOR ${Math.round(stillFor)} MIN`,
        title: r.text,
        detail: `${count} / ${quest.target} ${quest.units} today`,
        questId: quest.id,
        action: "log",
      });
    }
  });
}
