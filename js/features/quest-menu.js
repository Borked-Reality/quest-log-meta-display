/* =========================================================
   Quest Log // HUD — Quest board pinches (double pinch + hold menu)
   Double pinch does a quest's main action; pinch-and-hold opens a
   menu with Edit / Remove.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- QUEST BOARD PINCHES ---------- */
// On the quest board:
//   double pinch   → the main action: ✓ Complete · +1 Glass / Finish
//                    (water, stretch) · ▶ Start / ⏸ Pause / ▶ Resume (timers)
//   pinch + hold   → menu: [ ✎ Edit ] [ ✕ Remove ]
//                    ◀ ▶ picks, pinch does it, middle pinch cancels; it
//                    closes by itself after CONFIG.QUEST_MENU_MS
//   single pinch   → nothing yet ("Again!"), so a stray pinch can't do
//                    anything. The 2nd pinch must come within
//                    CONFIG.DOUBLE_PINCH_MS; faster than DOUBLE_PINCH_MIN_MS
//                    is the same pinch reported twice, and is ignored.
// Taps and holds come from the pinch detector in js/ui/input.js.
// Water / stretch counters can't be edited (Remove only).
// With the "One pinch" setting a single pinch does the main action.

function primaryAction(quest) {
  if (quest.completed) return null;
  const timer = timerFor(quest);
  if (hasTimer(quest) && !(timer && timer.done)) {
    if (!timer) return { id: "primary", icon: "▶", label: `Start ${questMinutes(quest)} min` };
    return timer.pausedRemaining != null
      ? { id: "primary", icon: "▶", label: "Resume" }
      : { id: "primary", icon: "⏸", label: "Pause" };
  }
  if (isCounter(quest) && progressOf(quest) + 1 < quest.target) {
    return { id: "primary", icon: "+", label: stepLabel(quest) };
  }
  return { id: "primary", icon: "✓", label: isCounter(quest) ? "Finish" : "Complete" };
}

// What the hold menu offers.
function questActions(quest) {
  const actions = [];
  if (!isCounter(quest)) actions.push({ id: "edit", icon: "✎", label: "Edit" });
  actions.push({ id: "remove", icon: "✕", label: "Remove" });
  return actions;
}

function isQuestMenuOpen() {
  return !!ui.armed && ui.armed.kind === "questMenu";
}

function isDoubleArmed() {
  return !!ui.armed && ui.armed.kind === "double";
}

// A single pinch (tap) on the quest board.
function questTap(quest) {
  // In the hold menu, a tap does the selected action.
  if (isQuestMenuOpen() && ui.armed.questId === quest.id) {
    const action = ui.armed.actions[ui.armed.index];
    disarm(true);
    runQuestAction(quest, action.id);
    return;
  }

  // "One pinch" setting: the main action happens right away.
  if (!CONFIG.CONFIRM_WINDOW_MS) {
    if (primaryAction(quest)) runQuestAction(quest, "primary");
    else showToast("Hold the pinch for options");
    return;
  }

  // 2nd pinch of a double pinch → main action.
  if (isDoubleArmed() && ui.armed.questId === quest.id) {
    if (Date.now() - ui.armed.at < CONFIG.DOUBLE_PINCH_MIN_MS) return;   // same pinch, reported twice
    disarm(true);
    if (primaryAction(quest)) runQuestAction(quest, "primary");
    else showToast("Hold the pinch for options");
    return;
  }

  // 1st pinch: wait for the 2nd.
  armDouble(quest, CONFIG.DOUBLE_PINCH_MS);
}

// A pinch held for CONFIG.HOLD_MS: the Edit / Remove menu.
function questHold(quest) {
  openQuestMenu(quest);
}

// Waits `ms` for a 2nd pinch. Short (a double pinch) when you pinch the
// board; longer (3s, with a draining bar) when an alert opens a quest
// ready to finish, e.g. TIME'S UP.
function armDouble(quest, ms) {
  disarm(true);
  ui.armed = {
    kind: "double",
    questId: quest.id,
    at: Date.now(),
    timer: setTimeout(() => {
      disarm(true);
      showToast("Pinch twice to do it · hold for options");
    }, ms),
  };
  startDrain(ms);
  Sound.play("tick", { i: 12 });
  renderControls();
}

function openQuestMenu(quest) {
  disarm(true);
  ui.armed = {
    kind: "questMenu",
    questId: quest.id,
    actions: questActions(quest),
    index: 0,
    at: Date.now(),
    timer: null,
  };
  restartQuestMenuTimer();
  Sound.play("arm");
  renderControls();
}

// Every swipe in the menu restarts the countdown (and its drain bar).
function restartQuestMenuTimer() {
  clearTimeout(ui.armed.timer);
  ui.armed.timer = setTimeout(() => disarm(false), CONFIG.QUEST_MENU_MS);
  startDrain(CONFIG.QUEST_MENU_MS);
}

function cycleQuestAction(direction) {
  const menu = ui.armed;
  menu.index = (menu.index + direction + menu.actions.length) % menu.actions.length;
  restartQuestMenuTimer();
  Sound.play("click", { direction });
  renderControls();
}

function runQuestAction(quest, id) {
  if (id === "edit") { startEditQuest(quest); return; }
  if (id === "remove") { removeQuest(quest); return; }

  // Main action
  const timer = timerFor(quest);
  if (hasTimer(quest) && !(timer && timer.done)) {
    if (timer) togglePauseTimer();
    else startTimer(quest);
  } else if (isCounter(quest)) {
    logQuestStep(quest);
  } else {
    completeQuest(quest);
  }
}


/* ---------- REMOVE (with undo) ---------- */
// Quests you added are deleted. Built-in quests are only hidden
// (player.hiddenQuestIds) and can be brought back in Settings.

function removeQuest(quest) {
  const index = QUESTS.indexOf(quest);
  const saved = {
    quest,
    index,
    builtIn: index < BASE_QUEST_COUNT,
    extra: player.extraQuests.find((q) => q.id === quest.id),
    wasCompleted: player.completedQuestIds.includes(quest.id),
    timer: player.timer && player.timer.questId === quest.id ? player.timer : null,
  };

  if (saved.builtIn) {
    player.hiddenQuestIds.push(quest.id);
  } else {
    QUESTS.splice(index, 1);
    player.extraQuests = player.extraQuests.filter((q) => q.id !== quest.id);
    player.completedQuestIds = player.completedQuestIds.filter((id) => id !== quest.id);
  }
  if (saved.timer) player.timer = null;
  player.currentQuestIndex = Math.max(0, Math.min(index, QUESTS.length - 1));
  saveProgress();

  showHome();
  Sound.play("hide");
  showToast("Removed");
  startRemoveUndo(saved);
}

// Middle pinch within a few seconds puts it back.
function startRemoveUndo(saved) {
  clearUndo();
  ui.undo = { kind: "remove", saved, timer: setTimeout(clearUndo, CONFIG.UNDO_WINDOW_MS) };
  renderControls();
}

function undoRemove() {
  const { saved } = ui.undo;
  clearUndo();
  if (saved.builtIn) {
    player.hiddenQuestIds = player.hiddenQuestIds.filter((id) => id !== saved.quest.id);
  } else {
    QUESTS.splice(saved.index, 0, saved.quest);
    if (saved.extra) player.extraQuests.push(saved.extra);
    if (saved.wasCompleted) player.completedQuestIds.push(saved.quest.id);
  }
  if (saved.timer) player.timer = saved.timer;
  player.currentQuestIndex = QUESTS.indexOf(saved.quest);
  saveProgress();
  showScreen("quest");
  renderAll();
  showToast("Restored");
  Sound.play("questAdded");
}

// Settings → "Removed quests": bring every hidden built-in quest back.
function restoreHiddenQuests() {
  const count = player.hiddenQuestIds.length;
  if (!count) {
    showToast("Nothing to restore");
    Sound.play("disarm");
    return;
  }
  player.hiddenQuestIds = [];
  saveProgress();
  showToast(`Restored ${count} quest${count === 1 ? "" : "s"}`);
  Sound.play("questAdded");
  renderAll();
}


/* ---------- EDIT (say it again) ---------- */
// Edit reopens the Add Quest card in "edit mode". What you say replaces
// the quest. Quests you added are updated in place; a built-in quest is
// hidden and your new version is added instead.

function startEditQuest(quest) {
  ui.editingQuestId = quest.id;
  showAddScreen();                     // (showScreen keeps editingQuestId on "add")
}

function editingQuest() {
  return ui.editingQuestId ? QUESTS.find((q) => q.id === ui.editingQuestId) : null;
}

// When editing, a spoken quest with no type word keeps the old type.
function applyEditDefaults(draft) {
  const old = editingQuest();
  if (!old || draft.type !== "side" || old.type === "side") return;
  draft.type = old.type;
  Object.assign(draft, rewardFor(draft.title, draft.type));
}

function commitEditedQuest() {
  const old = editingQuest();
  const draft = ui.draftQuest;
  ui.draftQuest = null;
  ui.editingQuestId = null;

  const index = QUESTS.indexOf(old);
  let updated;
  if (index < BASE_QUEST_COUNT) {
    player.hiddenQuestIds.push(old.id);
    updated = addQuestToBoard({ ...draft, id: `my-${Date.now()}` });
  } else {
    // Update in place: same id, same spot on the board, fresh start.
    const fields = { title: draft.title, type: draft.type, xp: draft.xp, gold: draft.gold };
    const extra = player.extraQuests.find((q) => q.id === old.id);
    [old, extra].forEach((q) => {
      if (!q) return;
      Object.assign(q, fields);
      delete q.dueAt;
      delete q.time;
      if (draft.dueAt) q.dueAt = draft.dueAt;
      if (draft.time) q.time = draft.time;
    });
    old.completed = false;
    player.completedQuestIds = player.completedQuestIds.filter((id) => id !== old.id);
    player.announcedQuestIds = player.announcedQuestIds.filter((key) => !key.endsWith(`:${old.id}`) && key !== old.id);
    if (player.timer && player.timer.questId === old.id) player.timer = null;
    updated = old;
  }

  // Rescheduled for a later day? It leaves the board until then.
  const onBoard = isAvailable(updated);
  saveProgress();
  if (onBoard) {
    player.currentQuestIndex = QUESTS.indexOf(updated);
    showScreen("quest");
    renderAll();
  } else {
    showHome();
  }
  Sound.play("questAdded");
  flashScreen();
  spawnParticles("var(--green)", 12);
  showToast(onBoard ? "Quest updated!" : `Scheduled: ${formatSchedule(updated).replace("⏰ ", "")}`);
}
