/* =========================================================
   Quest Log // HUD — Notifications
   notify(), the alert queue, and quests arriving from outside.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- NOTIFICATIONS + INCOMING QUESTS ---------- */
// notify() is the single entry point for anything that should get the
// wearer's attention. It wakes the HUD and shows an alert card.
// Future sources (API sync, phone companion, server/homelab, AI quests)
// should call notify() or receiveQuest() — see window.QuestLog below.
//
// alert shape:
//   { kind: "quest" | "info" | "reminder" | "warning",
//     label, title, detail?, questId?, action?: "log" }
// action "log" means pinching the alert logs one step of that counter
// quest right away (e.g. "+1 Glass" straight from the reminder).

function notify(alert) {
  // Only one pending alert per quest: a newer reminder replaces an older
  // queued one, and nothing is added while that quest's alert is on screen.
  if (alert.questId) {
    if (ui.currentAlert && ui.currentAlert.questId === alert.questId) return;
    ui.alertQueue = ui.alertQueue.filter((a) => a.questId !== alert.questId);
  }
  ui.alertQueue.push(alert);
  wake();
  // (Achievements play their fanfare when shown, in showAlertScreen.)
  if (alert.kind !== "achievement") Sound.play(alert.kind === "reminder" ? "reminder" : "notify");
  // Don't interrupt a reward sequence, another alert, or someone adding a
  // quest / changing settings. It shows when they're back on the board.
  if (!isBusyScreen()) showNextAlert();
}

// An alert about a quest that's since been finished or whose time
// window closed isn't worth showing any more.
function isAlertStale(alert) {
  if (!alert.questId) return false;
  const quest = QUESTS.find((q) => q.id === alert.questId);
  return !quest || quest.completed || !isAvailable(quest);
}

// Screens that queued alerts wait for.
function isBusyScreen() {
  return isOnRewardScreen() || ["alert", "add", "shop", "profile", "settings"].includes(ui.screen);
}

// Shows the next queued alert. Returns false if the queue was empty.
function showNextAlert() {
  ui.alertQueue = ui.alertQueue.filter((a) => !isAlertStale(a));
  const alert = ui.alertQueue.shift();
  if (!alert) return false;
  ui.currentAlert = alert;
  showAlertScreen(alert);
  return true;
}

// Pinch (accept = true) or middle-pinch (accept = false) on an alert.
function closeAlert(accept) {
  const alert = ui.currentAlert;
  ui.currentAlert = null;
  // Achievement with a cosmetic reward: pinch equips it.
  if (accept && alert && alert.action === "equipReward") {
    const item = SHOP_ITEMS.find((i) => i.id === alert.rewardItem);
    if (item) equipItem(item);
  }

  // Daily login chest: pinch opens it. (Dismissed → offered again next time.)
  if (accept && alert && alert.action === "dailyChest") {
    openDailyChest();
    return;
  }

  const quest = accept && alert && !isAlertStale(alert)
    ? QUESTS.find((q) => q.id === alert.questId)
    : null;

  // Reminder with a quick action: log the step right from the alert.
  // If that step would FINISH the quest, open it armed instead, so it
  // still takes a second pinch to complete.
  if (quest && alert.action === "log" && !quest.completed) {
    if (progressOf(quest) + 1 >= quest.target) {
      openQuestArmed(quest);
      return;
    }
    logQuestStep(quest);
    return;
  }

  // Timer finished ("TIME'S UP"): open the quest ready to complete.
  if (quest && alert.action === "finish" && !quest.completed) {
    openQuestArmed(quest);
    return;
  }

  if (quest) {
    player.currentQuestIndex = QUESTS.indexOf(quest);
    saveProgress();
  }
  if (!showNextAlert()) {
    // Opening a quest always shows it, even if the board was all clear.
    if (quest) { showScreen("quest"); renderAll(); }
    else showHome();
  }
}

// Shows a quest already armed, so the next pinch completes it. If the
// two-pinch setting is off, completes right away.
function openQuestArmed(quest) {
  player.currentQuestIndex = QUESTS.indexOf(quest);
  showScreen("quest");
  renderAll();
  if (!CONFIG.CONFIRM_WINDOW_MS) runQuestAction(quest, "primary");
  else armDouble(quest, CONFIG.CONFIRM_WINDOW_MS);   // one more pinch finishes it
}

// Adds a quest to the board and saves it. Returns the board's copy,
// or null if a quest with that id already exists.
// Optional scheduling: dueAt (ms timestamp, one-off) or time ("HH:MM",
// repeats daily).
function addQuestToBoard(data) {
  const quest = {
    id: data.id || `q${Date.now()}`,
    title: data.title,
    type: data.type || "side",
    xp: data.xp || 20,
    gold: data.gold || 4,
  };
  if (data.dueAt) quest.dueAt = data.dueAt;
  if (data.time) quest.time = data.time;
  if (QUESTS.some((q) => q.id === quest.id)) return null;

  const boardQuest = { ...quest, completed: false };
  QUESTS.push(boardQuest);
  player.extraQuests.push(quest);
  saveProgress();
  return boardQuest;
}

// A quest arriving from outside (API, phone, AI...): add it and announce it.
// Returns the quest, or null if one with that id already exists.
function receiveQuest(data) {
  const quest = addQuestToBoard(data);
  if (!quest) return null;                             // already have it

  notify({
    kind: "quest",
    label: `NEW ${QUEST_TYPE_LABELS[quest.type]}`,
    title: quest.title,
    detail: `+${quest.xp} XP   +${quest.gold} ◆`,
    questId: quest.id,
  });
  return quest;
}

// Dev helper: pretend a quest just arrived from somewhere.
function simulateIncomingQuest() {
  const pick = INCOMING_QUEST_POOL[Math.floor(Math.random() * INCOMING_QUEST_POOL.length)];
  receiveQuest({ ...pick, id: `sim-${Date.now()}` });
}
