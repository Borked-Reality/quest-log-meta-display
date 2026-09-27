/* =========================================================
   Quest Log // HUD — Quest logic
   The board, completing quests, counter steps, and two-pinch confirm / undo.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- QUEST BOARD HELPERS ---------- */

function currentQuest() {
  return QUESTS[player.currentQuestIndex];
}

// Timed quests (with a `window`) are only on the board during their hours.
// Scheduled quests (with `dueAt`) appear on the day they're due.
function isAvailable(quest) {
  if (player.hiddenQuestIds.includes(quest.id)) return false;   // removed (built-in)
  if (quest.dueAt && dateKey(new Date(quest.dueAt)) > dateKey(clock())) return false;
  if (!quest.window) return true;
  const hour = clock().getHours();
  return hour >= quest.window[0] && hour < quest.window[1];
}

function availableQuests() {
  return QUESTS.filter(isAvailable);
}

function isCounter(quest) {
  return typeof quest.target === "number";
}

function progressOf(quest) {
  return player.questProgress[quest.id] || 0;
}

// "1 glass" / "3 glasses"
function unitText(quest, count) {
  return count === 1 ? quest.unit : quest.units;
}

function isWakingHours() {
  const hour = clock().getHours();
  return hour >= CONFIG.DAY_START_HOUR && hour < CONFIG.DAY_END_HOUR;
}

// Points currentQuestIndex at the next available quest that isn't done.
function moveToNextIncompleteQuest() {
  const count = QUESTS.length;
  for (let step = 1; step <= count; step++) {
    const index = (player.currentQuestIndex + step) % count;
    if (!QUESTS[index].completed && isAvailable(QUESTS[index])) {
      player.currentQuestIndex = index;
      saveProgress();
      return;
    }
  }
}

// If the current quest's time window closed, move off it.
function ensureCurrentAvailable() {
  if (currentQuest() && isAvailable(currentQuest())) return;
  moveToNextIncompleteQuest();
  if (!isAvailable(currentQuest())) {
    player.currentQuestIndex = Math.max(0, QUESTS.findIndex(isAvailable));
  }
}

// Browsing with prev/next (skips quests outside their time window).
// The board is a loop with the "+ ADD QUEST" card between the last
// quest and the first one.
function browseQuests(direction) {
  if (ui.screen === "add") {
    leaveAddScreen(direction);
    return;
  }
  const board = availableQuests();
  const nextPos = board.indexOf(currentQuest()) + direction;
  if (nextPos < 0 || nextPos >= board.length) {
    showAddScreen();
    return;
  }
  player.currentQuestIndex = QUESTS.indexOf(board[nextPos]);
  saveProgress();
  showScreen("quest");
  renderAll();
}

// The resting screen: the current quest, or "all clear" if nothing is left.
// Alerts that waited (e.g. while you were adding a quest) show first.
function showHome() {
  if (ui.alertQueue.length && showNextAlert()) return;
  ensureCurrentAvailable();
  showScreen(availableQuests().every((q) => q.completed) ? "allClear" : "quest");
  renderAll();
}

// Reopens the one-off quests so the board can be played again.
// Daily quests stay as they are until tomorrow.
function startNewRound() {
  QUESTS.forEach((quest) => {
    if (quest.type !== "daily") quest.completed = false;
  });
  player.completedQuestIds = QUESTS.filter((q) => q.completed).map((q) => q.id);
  player.currentQuestIndex = 0;
  moveToNextIncompleteQuest();
  saveProgress();
  showHome();
}


/* ---------- COMPLETION LOGIC + COUNTER QUESTS ---------- */
// Rewards play as a sequence of screens:
//   QUEST COMPLETE → LEVEL UP (if earned) → LOOT (if it dropped)
// ui.rewardQueue holds the screens still to come.

function completeQuest(quest) {
  if (!quest || quest.completed) return;

  // 1. mark complete
  quest.completed = true;
  player.completedQuestIds.push(quest.id);
  player.currentQuestIndex = QUESTS.indexOf(quest);
  if (player.timer && player.timer.questId === quest.id) player.timer = null;

  // 2-5. award XP + gold, boosted by active power-ups
  //      (the bar is updated by the complete screen)
  const levelBefore = player.level;
  const gains = {
    xp: Math.round(quest.xp * buffMult("xp")),
    gold: Math.round(quest.gold * buffMult("gold")),
    xpMult: buffMult("xp"),
    goldMult: buffMult("gold"),
  };
  addXp(gains.xp);
  player.gold += gains.gold;
  updateStreakOnComplete();
  player.lifetime.questsCompleted += 1;
  player.lifetime.xpEarned += gains.xp;
  player.lifetime.goldEarned += gains.gold;
  player.lifetime.bestStreak = Math.max(player.lifetime.bestStreak, player.streak);
  recordCompletionForAchievements(quest);

  // 6. maybe a treasure chest (its item is applied now, shown later)
  const loot = rollForLoot();
  const chest = loot ? openChest(loot) : null;
  // Don't spoil the chest: the header gold and power-up chips hold back
  // what's inside until the reel lands (see showChestResult).
  ui.pendingReveal = chest ? { gold: chest.gold + chest.noteGold + ((loot.instant && loot.instant.gold) || 0) } : null;

  const levelsGained = player.level - levelBefore;
  const levelUp = applyLevelUpRewards(levelBefore);

  // Back-to-back completions build a combo (the celebration gets higher).
  ui.combo = nowMs() - ui.lastCompleteAt < comboWindowMs() ? ui.combo + 1 : 1;
  ui.lastCompleteAt = nowMs();
  player.lifetime.bestCombo = Math.max(player.lifetime.bestCombo, ui.combo);

  // Line up the reward screens: COMPLETE → CHEST → LEVEL UP
  ui.rewardQueue = [];
  if (chest) ui.rewardQueue.push(() => showChestScreen(chest));
  if (levelUp) ui.rewardQueue.push(() => showLevelUpScreen(levelUp));
  ui.moveOnAfterRewards = true;

  saveProgress();
  showCompleteScreen(quest, levelsGained, ui.combo, gains);
}

// Level-up extras: bonus gold (5 × each new level) and maybe a new title.
// Returns null if no level was gained.
function applyLevelUpRewards(levelBefore) {
  if (player.level === levelBefore) return null;
  let bonusGold = 0;
  for (let lv = levelBefore + 1; lv <= player.level; lv++) bonusGold += lv * 5;
  player.gold += bonusGold;
  player.lifetime.goldEarned += bonusGold;
  const newTitle = titleFor(player.level) !== titleFor(levelBefore) ? titleFor(player.level) : null;
  return { from: levelBefore, to: player.level, bonusGold, newTitle };
}

// Counter quests: one pinch = one step (one glass, one stretch break...).
// Small reward per step; the full celebration when the target is reached.
function logQuestStep(quest) {
  if (!quest || quest.completed) return;

  const snapshot = JSON.stringify(player);            // for undo
  const count = progressOf(quest) + 1;
  player.questProgress[quest.id] = count;
  if (quest.id === "hydrate") player.counters.glasses += 1;          // (achievements)
  if (quest.id === "stretch") player.counters.stretches += 1;
  ui.lastReminderAt[quest.id] = nowMs();              // don't nag right after
  if (quest.reminder && quest.reminder.kind === "still") markActive();

  if (count >= quest.target) {
    completeQuest(quest);
    return;
  }

  const levelBefore = player.level;
  const stepMult = buffMult("xp") * buffMult("step");                // power-ups count too
  const stepXp = Math.round((quest.stepXp || 0) * stepMult);
  player.lifetime.xpEarned += stepXp;
  const levelsGained = addXp(stepXp);
  const levelUp = applyLevelUpRewards(levelBefore);
  saveProgress();

  // Feedback: pip pops, "+5 XP" floats up, bar fills.
  player.currentQuestIndex = QUESTS.indexOf(quest);
  showScreen("quest");
  renderAll();
  animateXpBar(levelsGained);
  const newPip = el.questPips.children[count - 1];
  if (newPip) newPip.classList.add("is-new");
  showToast(stepMult > 1 ? `+${stepXp} XP ⚡` : `+${stepXp} XP`);
  spawnParticles("var(--cyan)", 10);
  Sound.play("step", { count });                 // pitch climbs with each step

  // A step that levels you up still gets the full LEVEL UP screen,
  // then returns to this quest.
  if (levelUp) {
    ui.rewardQueue = [() => showLevelUpScreen(levelUp)];
    ui.moveOnAfterRewards = false;
    ui.advanceTimer = setTimeout(advanceFromRewards, 700);
    return;
  }

  // Middle pinch within a few seconds undoes it (accidental pinch).
  startUndo(quest, snapshot);

  // Any alerts that queued up meanwhile show after the feedback.
  if (ui.alertQueue.length) {
    setTimeout(() => { if (ui.screen === "quest") showNextAlert(); }, 1400);
  }
}

/* ---------- ACCIDENT PROTECTION: two-pinch confirm + undo ---------- */
// Completing a quest (or starting a new round) takes TWO pinches:
//   1st pinch → "armed": gold "Pinch again to complete" bar drains over
//               CONFIRM_WINDOW_MS. Swipe / middle pinch cancels.
//   2nd pinch → done. A 2nd pinch faster than CONFIRM_MIN_GAP_MS is
//               ignored, so a double misfire can't complete anything.
// Single +1 steps stay one pinch (you log them often) but can be undone
// with a middle pinch for UNDO_WINDOW_MS.

// Returns true when the action should go ahead now; otherwise arms it
// (1st pinch) and returns false.
function confirmTwice(kind, questId = null) {
  if (!CONFIG.CONFIRM_WINDOW_MS) return true;           // feature switched off

  const armed = ui.armed;
  if (armed && armed.kind === kind && armed.questId === questId) {
    if (Date.now() - armed.at < CONFIG.CONFIRM_MIN_GAP_MS) return false;   // misfire
    disarm(true);
    return true;
  }

  disarm(true);
  ui.armed = {
    kind,
    questId,
    at: Date.now(),
    timer: setTimeout(() => disarm(false), CONFIG.CONFIRM_WINDOW_MS),
  };
  startDrain(CONFIG.CONFIRM_WINDOW_MS);
  Sound.play("arm");
  renderControls();
  return false;
}

// silent = no "cancelled" sound (e.g. the 2nd pinch, or moving away).
function disarm(silent) {
  if (!ui.armed) return;
  clearTimeout(ui.armed.timer);
  ui.armed = null;
  if (!silent) Sound.play("disarm");
  renderControls();
}

function startUndo(quest, snapshot) {
  clearUndo();
  ui.undo = {
    kind: "step",
    snapshot,
    questId: quest.id,
    timer: setTimeout(clearUndo, CONFIG.UNDO_WINDOW_MS),
  };
  renderControls();
}

function clearUndo() {
  if (!ui.undo) return;
  clearTimeout(ui.undo.timer);
  ui.undo = null;
  renderControls();
}

// Middle pinch during the undo window: undo a +1 step or a removal.
function undoLast() {
  if (ui.undo.kind === "remove") undoRemove();
  else undoLastStep();
  player.counters.undos += 1;          // after the restore, so it sticks
  saveProgress();
}

// Puts the player back exactly as before the last +1 step.
function undoLastStep() {
  const { snapshot, questId } = ui.undo;
  clearUndo();
  player = JSON.parse(snapshot);
  saveProgress();
  player.currentQuestIndex = QUESTS.findIndex((q) => q.id === questId);
  showScreen("quest");
  renderAll();
  showToast("Undone");
  Sound.play("disarm");
}


// Shows the next reward screen, or finishes the sequence:
// → queued notification? → next quest (or back to the same one) / all clear
function advanceFromRewards() {
  clearRewardTimers();

  const next = ui.rewardQueue.shift();
  if (next) {
    next();
    return;
  }

  // 7. move to another quest
  if (ui.moveOnAfterRewards) moveToNextIncompleteQuest();
  if (!showNextAlert()) showHome();
}

// Skips whatever is left of the reward sequence (Back / swipe down).
function skipRewards() {
  ui.rewardQueue = [];
  ui.pendingReveal = null;
  advanceFromRewards();
}

function clearRewardTimers() {
  clearTimeout(ui.advanceTimer);
  ui.effectTimers.forEach(clearTimeout);
  ui.effectTimers = [];
  if (ui.chest) clearInterval(ui.chest.coinTimer);   // chest coin fountain
  Sound.stopMusic();                                  // chest slot music
}
