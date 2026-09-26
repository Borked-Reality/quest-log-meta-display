/* =========================================================
   Quest Log // HUD — app logic
   Plain JavaScript, no frameworks. Sections:

     1. Config
     2. Quest data (daily + one-off)
     3. Loot table
     4. Player state + clock
     5. Persistence (localStorage)
     6. Leveling
     7. Streak
     8. Loot generation
     9. Quest board helpers (time windows, browsing)
    10. Completion logic + counter quests
    10b. Accident protection (two-pinch confirm, undo)
    11. Notifications + incoming quests
    11b. Adding quests (voice / handwriting)
    11c. Settings screen
    11d. Clock, timers, schedules
    12. Daily reset, time windows, reminders
    13. Activity tracking (glasses motion sensor)
    14. Idle mode + background checks
    15. Sound (Web Audio synth)
    16. UI rendering
    17. Effects (flash, particles, count-up, toast)
    18. Input (Neural Band / keyboard / buttons)
    19. Start-up
   ========================================================= */


/* ---------- 1. CONFIG ---------- */
// Tweak game feel here without digging through the code.
const CONFIG = {
  SAVE_KEY: "questLogHud.save.v1",
  SETTINGS_KEY: "questLogHud.settings.v1",
  LOOT_DROP_CHANCE: 0.4,      // 40% chance of loot per completed quest
  COMPLETE_SCREEN_MS: 2400,   // how long "QUEST COMPLETE" stays up
  LOOT_SCREEN_MS: 3000,       // how long the loot drop stays up
  LEVEL_UP_SCREEN_MS: 4000,   // how long the LEVEL UP fanfare stays up
  IDLE_AFTER_MS: 20000,       // no input for this long → idle (0 = never)
  CHECK_EVERY_MS: 60000,      // how often to check for reminders / new day
  SOUND_VOLUME: 0.8,          // master volume, 0 to 1
  COMBO_WINDOW_MS: 180000,    // finish quests within 3 min of each other = combo

  // Accident protection (see section 10b).
  CONFIRM_WINDOW_MS: 3000,    // 2nd pinch must come within this (0 = one pinch completes)
  CONFIRM_MIN_GAP_MS: 250,    // a 2nd pinch faster than this is ignored (misfire)
  UNDO_WINDOW_MS: 5000,       // middle pinch undoes a +1 step for this long

  // Reminders only fire during waking hours (24h clock).
  DAY_START_HOUR: 8,
  DAY_END_HOUR: 21,

  // Movement detection on the glasses (see section 13).
  MOTION_JOLT: 2.0,           // m/s² away from gravity that counts as a "jolt"
  MOTION_JOLTS_NEEDED: 20,    // this many jolts in 30s = you're up and moving
};


/* ---------- 2. QUEST DATA ---------- */
// Fields every quest has:
//   id, title, type ("daily" | "main" | "side"), xp, gold, completed
//
// Optional fields:
//   window: [fromHour, toHour]  → only on the board during those hours
//                                 (e.g. [5, 12] = 5:00 to 11:59)
//   target, unit, units, stepXp → a COUNTER quest. Each pinch logs one step
//                                 (+stepXp). Reaching target completes it.
//   reminder                    → nudges during the day (section 12):
//       { kind: "pace",  everyMin } → remind if behind pace for the day
//       { kind: "still", afterMin } → remind after sitting still too long
//
// Daily quests reopen every morning. Edit, add, or remove freely.
const QUESTS = [
  // ----- Daily quests -----
  {
    id: "hydrate", title: "Drink water", type: "daily", xp: 40, gold: 8,
    target: 8, unit: "glass", units: "glasses", stepXp: 5,
    reminder: { kind: "pace", everyMin: 90, label: "HYDRATION CHECK", text: "Drink a glass of water" },
  },
  {
    id: "stretch", title: "Stretch breaks", type: "daily", xp: 40, gold: 8,
    target: 4, unit: "break", units: "breaks", stepXp: 5,
    reminder: { kind: "still", afterMin: 45, text: "Stand up & stretch" },
  },
  { id: "bed",       title: "Make your bed",          type: "daily", xp: 10, gold: 2, window: [5, 12] },
  { id: "breakfast", title: "Eat a real breakfast",   type: "daily", xp: 15, gold: 3, window: [5, 11] },
  { id: "vitamins",  title: "Take your vitamins",     type: "daily", xp: 10, gold: 2 },
  { id: "outside",   title: "Step outside for 10 min",type: "daily", xp: 20, gold: 4 },
  { id: "walk",      title: "Go for a 15-min walk",   type: "daily", xp: 25, gold: 5 },
  { id: "tidy",      title: "Tidy one surface",       type: "daily", xp: 15, gold: 3 },
  { id: "read",      title: "Read 10 pages",          type: "daily", xp: 15, gold: 3 },
  { id: "plan",      title: "Plan tomorrow's top 3",  type: "daily", xp: 20, gold: 4, window: [18, 24] },
  { id: "winddown",  title: "Screens off before bed", type: "daily", xp: 20, gold: 4, window: [21, 24] },

  // ----- One-off quests -----
  { id: "trash",  title: "Take out the trash", type: "main", xp: 25, gold: 5 },
  { id: "steps",  title: "Walk 500 steps",     type: "side", xp: 20, gold: 4 },
  { id: "dishes", title: "Clean 5 dishes",     type: "side", xp: 15, gold: 3 },
  { id: "email",  title: "Reply to an email",  type: "main", xp: 30, gold: 6 },
].map((quest) => ({ ...quest, completed: false }));

// Quests received later (simulator now; API / phone / AI later) are
// appended after the starting board.
const BASE_QUEST_COUNT = QUESTS.length;

const QUEST_TYPE_LABELS = {
  main: "MAIN QUEST",
  side: "SIDE QUEST",
  daily: "DAILY QUEST",
};

// Pool used by the "+ QUEST" dev button to simulate a quest arriving.
const INCOMING_QUEST_POOL = [
  { title: "Refill your water bottle",   type: "side", xp: 10, gold: 2 },
  { title: "Take a 2-minute breather",   type: "side", xp: 10, gold: 2 },
  { title: "Put away 3 things",          type: "side", xp: 15, gold: 3 },
  { title: "Text a friend back",         type: "main", xp: 20, gold: 4 },
  { title: "Water the plants",           type: "side", xp: 15, gold: 3 },
];


/* ---------- 3. LOOT TABLE ---------- */
// weight = how likely that rarity is when loot drops (higher = more common).
const RARITIES = {
  common:   { label: "Common",   weight: 55 },
  uncommon: { label: "Uncommon", weight: 28 },
  rare:     { label: "Rare",     weight: 13 },
  epic:     { label: "Epic",     weight: 4 },
};

const LOOT_TABLE = [
  { name: "Slightly Crumpled Receipt", rarity: "common",   effect: "+1 Sense of Accomplishment" },
  { name: "Lint Ball of Focus",        rarity: "common",   effect: "+2% Focus\nfor 5 minutes" },
  { name: "Lukewarm Coffee",           rarity: "common",   effect: "+5% Alertness\nfor 10 minutes" },
  { name: "Sturdy Sock",               rarity: "uncommon", effect: "+5 Comfort" },
  { name: "Scroll of To-Do",           rarity: "uncommon", effect: "Reveals one hidden chore" },
  { name: "Goblin Energy Drink",       rarity: "rare",     effect: "+10% Motivation\nfor 30 minutes" },
  { name: "Boots of Errand Running",   rarity: "rare",     effect: "+15% Walk Speed\nto the mailbox" },
  { name: "Amulet of Inbox Zero",      rarity: "epic",     effect: "Immunity to email\nfor 1 hour" },
  { name: "Crown of the Clean Kitchen",rarity: "epic",     effect: "+50% Pride\nuntil tomorrow" },
];


/* ---------- 4. PLAYER STATE + CLOCK ---------- */
// Everything in `player` is saved to localStorage. Later this is what
// you'd sync to a server / the VR app / a cloud save.
function createNewPlayer() {
  return {
    level: 1,
    xp: 0,                     // XP inside the current level
    gold: 0,
    streak: 0,                 // consecutive days with at least 1 quest done
    lastCompletedDate: null,   // "YYYY-MM-DD"
    lastDailyReset: null,      // "YYYY-MM-DD" daily quests were last reopened
    completedQuestIds: [],
    questProgress: {},         // counter quests: { hydrate: 3, stretch: 1 }
    announcedQuestIds: [],     // timed quests already announced today
    extraQuests: [],           // quests received after the starting board
    currentQuestIndex: 0,
    // Quest timer (one at a time). Saved so it survives a reload.
    //   { questId, durationMs, endsAt, pausedRemaining, done }
    timer: null,
  };
}

let player = createNewPlayer();

// UI state (not saved)
const ui = {
  // "quest" | "complete" | "levelUp" | "loot" | "allClear" | "alert"
  // | "add" | "settings"
  screen: "quest",
  settingsIndex: 0,    // which setting card is showing
  tickTimer: null,     // 1-second clock / timer ticker
  rewardQueue: [],     // reward screens still to show (level up, loot)
  moveOnAfterRewards: true,  // after rewards: next quest (true) or stay (false)
  advanceTimer: null,  // auto-advance timer for reward screens
  effectTimers: [],    // timed effects inside a reward screen
  alertQueue: [],      // notifications waiting to be shown
  currentAlert: null,  // notification on screen right now
  idle: false,         // true = HUD faded out to the glance view
  idleTimer: null,
  checkTimer: null,
  clockOffsetMs: 0,    // dev "time warp" (+1 HR button)
  lastActiveAt: 0,     // last time we saw the wearer moving (ms)
  lastReminderAt: {},  // questId → ms of the last reminder
  draftQuest: null,    // quest being added, waiting for confirmation
  armed: null,         // { kind, questId, at, timer } after the 1st pinch
  undo: null,          // { snapshot, questId, timer } after a +1 step
  combo: 0,            // quests finished back-to-back
  lastCompleteAt: 0,
};

// Settings are stored separately so "Reset Progress" doesn't touch them.
// Changed on the glasses from the SETTINGS screen (section 11c).
const settings = {
  soundEnabled: true,
  volume: 0.8,              // 0.25 | 0.5 | 0.8 | 1
  clock24: false,           // 24-hour clock?
  twoPinchComplete: true,   // completing needs a 2nd pinch
  autoHideSeconds: 20,      // 10 | 20 | 30 | 60 | 0 (never)
  reminders: true,          // hydration / stretch nudges
  timers: true,             // quests with a duration start a timer
};

// Copies settings into CONFIG, which the rest of the code reads.
function applySettings() {
  CONFIG.SOUND_VOLUME = settings.volume;
  CONFIG.IDLE_AFTER_MS = settings.autoHideSeconds * 1000;
  CONFIG.CONFIRM_WINDOW_MS = settings.twoPinchComplete ? 3000 : 0;
  if (Sound.master) Sound.master.gain.value = settings.volume;
}

// All time-based logic reads the clock through these, so the dev
// time-warp button can fast-forward the day for testing.
function nowMs() { return Date.now() + ui.clockOffsetMs; }
function clock() { return new Date(nowMs()); }
function minutesSince(ms) { return (nowMs() - ms) / 60000; }


/* ---------- 5. PERSISTENCE ---------- */
// localStorage can throw (private mode, blocked storage), so every
// access is wrapped. The app still works without it; it just won't save.

function saveProgress() {
  try {
    localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(player));
  } catch (err) {
    console.warn("Could not save progress:", err);
  }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(CONFIG.SAVE_KEY);
    if (raw) {
      // Merge onto a fresh player so new fields get defaults.
      player = Object.assign(createNewPlayer(), JSON.parse(raw));
    }
  } catch (err) {
    console.warn("Could not load progress:", err);
  }

  // Re-add quests that arrived in earlier sessions.
  player.extraQuests.forEach((quest) => QUESTS.push({ ...quest, completed: false }));

  // Apply saved completion flags onto the quest list.
  QUESTS.forEach((quest) => {
    quest.completed = player.completedQuestIds.includes(quest.id);
  });

  // Guard against a saved index that no longer exists.
  if (player.currentQuestIndex >= QUESTS.length) player.currentQuestIndex = 0;
}

function saveSettings() {
  try {
    localStorage.setItem(CONFIG.SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) { /* ignore */ }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(CONFIG.SETTINGS_KEY);
    if (raw) Object.assign(settings, JSON.parse(raw));
  } catch (err) { /* ignore */ }
}

// askFirst: the desktop RESET button uses a browser dialog; the glasses'
// Settings screen confirms with two pinches instead.
function resetProgress(askFirst = true) {
  if (askFirst && !confirm("Reset all Quest Log progress?")) return;
  clearRewardTimers();
  player = createNewPlayer();
  QUESTS.splice(BASE_QUEST_COUNT);                 // drop received quests
  QUESTS.forEach((quest) => { quest.completed = false; });
  ui.rewardQueue = [];
  ui.alertQueue = [];
  ui.currentAlert = null;
  checkForNewDay();                                // sets today, silently
  announceOpenedQuests(true);
  saveProgress();
  showHome();
}


/* ---------- 6. LEVELING ---------- */
// Level 1 needs 100 XP, level 2 needs 150, level 3 needs 200, ...
function xpNeededFor(level) {
  return 100 + (level - 1) * 50;
}

// RPG titles, unlocked at these levels. Shown next to your level and
// announced on the LEVEL UP screen.
const LEVEL_TITLES = [
  [1, "Novice"],
  [3, "Apprentice"],
  [5, "Adventurer"],
  [8, "Veteran"],
  [12, "Hero"],
  [16, "Champion"],
  [20, "Legend"],
  [30, "Mythic"],
];

function titleFor(level) {
  let title = LEVEL_TITLES[0][1];
  LEVEL_TITLES.forEach(([minLevel, name]) => { if (level >= minLevel) title = name; });
  return title;
}

// Adds XP and handles level-ups (including multiple at once).
// Returns how many levels were gained.
function addXp(amount) {
  let levelsGained = 0;
  player.xp += amount;
  while (player.xp >= xpNeededFor(player.level)) {
    player.xp -= xpNeededFor(player.level);
    player.level += 1;
    levelsGained += 1;
  }
  return levelsGained;
}


/* ---------- 7. STREAK ---------- */
// A streak counts consecutive calendar days with at least one quest done.

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function yesterdayKey() {
  const d = clock();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

// Call when a quest is completed.
function updateStreakOnComplete() {
  const today = dateKey(clock());
  if (player.lastCompletedDate === today) return;           // already counted today
  player.streak = player.lastCompletedDate === yesterdayKey()
    ? player.streak + 1                                      // kept it going
    : 1;                                                     // new streak
  player.lastCompletedDate = today;
}

// Call on start-up / wake: if a day was missed, the streak is broken.
function checkStreak() {
  const today = dateKey(clock());
  const last = player.lastCompletedDate;
  if (last && last !== today && last !== yesterdayKey()) {
    player.streak = 0;
  }
}


/* ---------- 8. LOOT GENERATION ---------- */

// Picks a rarity key using the weights in RARITIES.
function rollRarity() {
  const entries = Object.entries(RARITIES);
  const total = entries.reduce((sum, [, r]) => sum + r.weight, 0);
  let roll = Math.random() * total;
  for (const [key, rarity] of entries) {
    roll -= rarity.weight;
    if (roll < 0) return key;
  }
  return "common";
}

// Returns a loot item, or null if nothing dropped.
function rollForLoot() {
  if (Math.random() >= CONFIG.LOOT_DROP_CHANCE) return null;
  const rarity = rollRarity();
  const pool = LOOT_TABLE.filter((item) => item.rarity === rarity);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}


/* ---------- 9. QUEST BOARD HELPERS ---------- */

function currentQuest() {
  return QUESTS[player.currentQuestIndex];
}

// Timed quests (with a `window`) are only on the board during their hours.
// Scheduled quests (with `dueAt`) appear on the day they're due.
function isAvailable(quest) {
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


/* ---------- 10. COMPLETION LOGIC + COUNTER QUESTS ---------- */
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

  // 2-5. award XP + gold (bar is updated by the complete screen)
  const levelBefore = player.level;
  const levelsGained = addXp(quest.xp);
  player.gold += quest.gold;
  updateStreakOnComplete();
  const levelUp = applyLevelUpRewards(levelBefore);

  // Back-to-back completions build a combo (the celebration gets higher).
  ui.combo = nowMs() - ui.lastCompleteAt < CONFIG.COMBO_WINDOW_MS ? ui.combo + 1 : 1;
  ui.lastCompleteAt = nowMs();

  // 6. line up the reward screens
  const loot = rollForLoot();
  ui.rewardQueue = [];
  if (levelUp) ui.rewardQueue.push(() => showLevelUpScreen(levelUp));
  if (loot) ui.rewardQueue.push(() => showLootScreen(loot));
  ui.moveOnAfterRewards = true;

  saveProgress();
  showCompleteScreen(quest, levelsGained, ui.combo);
}

// Level-up extras: bonus gold (5 × each new level) and maybe a new title.
// Returns null if no level was gained.
function applyLevelUpRewards(levelBefore) {
  if (player.level === levelBefore) return null;
  let bonusGold = 0;
  for (let lv = levelBefore + 1; lv <= player.level; lv++) bonusGold += lv * 5;
  player.gold += bonusGold;
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
  ui.lastReminderAt[quest.id] = nowMs();              // don't nag right after
  if (quest.reminder && quest.reminder.kind === "still") markActive();

  if (count >= quest.target) {
    completeQuest(quest);
    return;
  }

  const levelBefore = player.level;
  const levelsGained = addXp(quest.stepXp || 0);
  const levelUp = applyLevelUpRewards(levelBefore);
  saveProgress();

  // Feedback: pip pops, "+5 XP" floats up, bar fills.
  player.currentQuestIndex = QUESTS.indexOf(quest);
  showScreen("quest");
  renderAll();
  animateXpBar(levelsGained);
  const newPip = el.questPips.children[count - 1];
  if (newPip) newPip.classList.add("is-new");
  showToast(`+${quest.stepXp} XP`);
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

/* ---------- 10b. ACCIDENT PROTECTION: two-pinch confirm + undo ---------- */
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
  advanceFromRewards();
}

function clearRewardTimers() {
  clearTimeout(ui.advanceTimer);
  ui.effectTimers.forEach(clearTimeout);
  ui.effectTimers = [];
}


/* ---------- 11. NOTIFICATIONS + INCOMING QUESTS ---------- */
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
  Sound.play(alert.kind === "reminder" ? "reminder" : "notify");
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
  return isOnRewardScreen() || ["alert", "add", "settings"].includes(ui.screen);
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
  const quest = accept && alert && !isAlertStale(alert)
    ? QUESTS.find((q) => q.id === alert.questId)
    : null;

  // Reminder with a quick action: log the step right from the alert.
  // If that step would FINISH the quest, open it armed instead, so it
  // still takes a second pinch to complete.
  if (quest && alert.action === "log" && !quest.completed) {
    if (progressOf(quest) + 1 >= quest.target) {
      openQuestArmed(quest, () => logQuestStep(quest));
      return;
    }
    logQuestStep(quest);
    return;
  }

  // Timer finished ("TIME'S UP"): open the quest ready to complete.
  if (quest && alert.action === "finish" && !quest.completed) {
    openQuestArmed(quest, () => completeQuest(quest));
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
function openQuestArmed(quest, complete) {
  player.currentQuestIndex = QUESTS.indexOf(quest);
  showScreen("quest");
  renderAll();
  if (confirmTwice("complete", quest.id)) complete();
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


/* ---------- 11b. ADDING QUESTS (voice / handwriting) ---------- */
// On the glasses, a normal <input> opens the built-in voice/handwriting
// composer when the wearer pinches it. The app can't open it by itself
// ("programmatic focus does not open the composer"), so the flow is:
//
//   ADD card (end of the board, or swipe up) → input gets focus
//   → wearer pinches → composer opens → they speak → text arrives
//   → PREVIEW card: swipe ◀ ▶ to change type, pinch = Add, back = retry
//
// In a desktop browser, just type into the box and press Enter.

const QUEST_TYPES = ["side", "main", "daily"];

// Base rewards by type. Time in the text ("10 minutes") adds XP.
function rewardFor(title, type) {
  const base = { side: 20, main: 30, daily: 15 }[type];
  let xp = base;
  const minutes = title.match(/(\d+)\s*(min|minute)/i);
  const hours = title.match(/(\d+)\s*(hr|hour)/i);
  if (minutes) xp = Math.min(60, Math.max(xp, 10 + Number(minutes[1])));
  if (hours) xp = Math.min(80, xp + 30 * Number(hours[1]));
  return { xp, gold: Math.max(2, Math.round(xp / 5)) };
}

// Turns spoken text into a quest draft, e.g.
//   "remind me to call mom"          → Side quest "Call mom"
//   "daily: stretch for 10 minutes"  → Daily quest, +20 XP
//   "important pay rent"             → Main quest "Pay rent"
// Returns null if there's nothing usable.
function parseQuestText(text) {
  let title = text.trim().replace(/[.!?]+$/, "");

  // Drop spoken lead-ins.
  title = title.replace(
    /^(please\s+)?(add\s+(a\s+)?(new\s+)?(quest|task)(\s+to)?|new\s+(quest|task)|remind\s+me\s+to|i\s+(need|have)\s+to|i\s+should)\b\s*[:,-]?\s*/i,
    ""
  );

  // Work out the type from keywords.
  let type = "side";
  if (/^daily\b/i.test(title) || /\b(every\s*day|each\s*day)\b/i.test(title)
      || /\bdaily\b(?=\s*(at\b|\d|$))/i.test(title)) type = "daily";
  else if (/^(main|important|urgent)\b/i.test(title) || /\b(important|urgent|asap)\b/i.test(title)) type = "main";

  // Remove the keywords themselves from the title.
  title = title
    .replace(/^(daily|main|side|important|urgent)(\s+quest)?\b\s*[:,-]?\s*/i, "")
    .replace(/\s*[,-]?\s*\b(every\s*day|each\s*day)\b/i, "")
    // "daily"/"asap" only at the end or right before a time ("daily at 8")
    .replace(/\s*[,-]?\s*\b(daily|asap)\b(?=\s*(at\b|\d|$))/i, "")
    .trim();

  // When? ("at 3pm", "tomorrow at 9:30", "in 20 minutes", "tonight")
  const schedule = extractSchedule(title, type === "daily");
  title = schedule.text.replace(/\s{2,}/g, " ").replace(/[\s,;:-]+$/, "").trim();
  if (!title) return null;

  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (title.length > 60) title = `${title.slice(0, 57)}…`;
  const draft = { title, type, ...rewardFor(title, type) };
  if (schedule.dueAt) draft.dueAt = schedule.dueAt;
  if (schedule.time) draft.time = schedule.time;
  return draft;
}

// Pulls a time out of spoken text and returns what's left.
//   { text, dueAt? }  one-off: a timestamp
//   { text, time? }   daily:   "HH:MM", repeats every day
function extractSchedule(text, isDaily) {
  let hour = null;
  let minute = 0;
  let dayOffset = 0;
  let relativeMs = null;

  let t = text
    // "in 20 minutes" / "in 2 hours"
    .replace(/\s*\bin\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i, (_, n, unit) => {
      relativeMs = Number(n) * (/^h/i.test(unit) ? 3600000 : 60000);
      return " ";
    })
    .replace(/\s*\btomorrow\b/i, () => { dayOffset = 1; return " "; })
    // "at noon" / "midnight"
    .replace(/\s*\b(?:at\s+)?(noon|midnight)\b/i, (_, word) => {
      hour = /noon/i.test(word) ? 12 : 0;
      return " ";
    })
    // "3pm", "at 9:30 am", "at 7 p.m."
    .replace(/\s*\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s?m\.?(?=\s|$|[,.;])/i, (_, h, m, ap) => {
      hour = Number(h) % 12 + (/p/i.test(ap) ? 12 : 0);
      minute = Number(m || 0);
      return " ";
    })
    // "at 15:00", "at 3" (no am/pm: 1–7 is probably afternoon)
    .replace(/\s*\bat\s+(\d{1,2})(?::(\d{2}))?\b/i, (_, h, m) => {
      hour = Number(h);
      minute = Number(m || 0);
      if (hour >= 1 && hour <= 7) hour += 12;
      return " ";
    })
    .replace(/\s*\b(tonight|this evening)\b/i, () => { if (hour === null) hour = 20; return " "; })
    .replace(/\s*\bthis morning\b/i, () => { if (hour === null) hour = 9; return " "; })
    .replace(/\s*\bthis afternoon\b/i, () => { if (hour === null) hour = 14; return " "; });

  if (relativeMs) return { text: t, dueAt: nowMs() + relativeMs };
  if (hour === null && !dayOffset) return { text };        // no time mentioned

  if (hour === null) hour = 9;                               // "tomorrow" alone → 9am
  if (isDaily) {
    return { text: t, time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
  }
  const due = clock();
  due.setDate(due.getDate() + dayOffset);
  due.setHours(hour, minute, 0, 0);
  if (!dayOffset && due.getTime() < nowMs()) due.setDate(due.getDate() + 1);   // already passed → tomorrow
  return { text: t, dueAt: due.getTime() };
}

function showAddScreen() {
  ui.draftQuest = null;
  el.addInput.value = "";
  showScreen("add");
  renderAll();
  // Focus is needed so the wearer's pinch opens the composer
  // (focus alone doesn't open it).
  el.addInput.focus({ preventScroll: true });
}

// Text arrived from the composer (or desktop typing).
function submitAddText() {
  const text = el.addInput.value;
  el.addInput.value = "";
  const draft = parseQuestText(text || "");
  if (!draft) {
    showToast("Didn't catch that");
    return;
  }
  ui.draftQuest = draft;
  el.addInput.blur();
  Sound.play("click");
  renderAll();
}

// Swipe ◀ ▶ on the preview cycles Side → Main → Daily.
function cycleDraftType(direction) {
  const draft = ui.draftQuest;
  const i = QUEST_TYPES.indexOf(draft.type);
  draft.type = QUEST_TYPES[(i + direction + QUEST_TYPES.length) % QUEST_TYPES.length];
  Object.assign(draft, rewardFor(draft.title, draft.type));
  Sound.play("click", { direction });
  renderAll();
}

// Pinch on the preview: it's on the board.
function commitDraftQuest() {
  const quest = addQuestToBoard({ ...ui.draftQuest, id: `my-${Date.now()}` });
  ui.draftQuest = null;

  // Scheduled for a later day: it's saved but stays off the board until then.
  const laterDay = !isAvailable(quest);
  if (!laterDay) player.currentQuestIndex = QUESTS.indexOf(quest);
  saveProgress();

  showScreen(laterDay ? (availableQuests().every((q) => q.completed) ? "allClear" : "quest") : "quest");
  renderAll();
  Sound.play("questAdded");
  flashScreen();
  spawnParticles("var(--green)", 16);
  showToast(laterDay ? `Scheduled: ${formatSchedule(quest).replace("⏰ ", "")}` : "Quest added!");

  // Alerts that waited while you were adding show after the celebration.
  if (ui.alertQueue.length) {
    setTimeout(() => { if (ui.screen === "quest" || ui.screen === "allClear") showNextAlert(); }, 1500);
  }
}

// Middle pinch on the preview: throw it away and listen again.
function cancelDraftQuest() {
  ui.draftQuest = null;
  renderAll();
  el.addInput.focus({ preventScroll: true });
}

// Leaving the add card (browse away / back): return to the board.
function leaveAddScreen(direction) {
  ui.draftQuest = null;
  const board = availableQuests();
  const target = direction < 0 ? board[board.length - 1] : board[0];
  if (direction !== 0 && target) player.currentQuestIndex = QUESTS.indexOf(target);
  showHome();
}


/* ---------- 11c. SETTINGS SCREEN ---------- */
// Navigation is a vertical stack:   QUEST  ▲  ADD QUEST  ▲  SETTINGS
// Swipe up goes one level up, swipe down goes one level back.
// On Settings: ◀ ▶ picks a setting, pinch changes its value.

const SETTINGS_ITEMS = [
  { key: "soundEnabled", label: "Sound", options: [[true, "On"], [false, "Off"]] },
  { key: "volume", label: "Volume", options: [[0.25, "25%"], [0.5, "50%"], [0.8, "80%"], [1, "100%"]] },
  { key: "clock24", label: "Clock", options: [[false, "12-hour"], [true, "24-hour"]] },
  { key: "twoPinchComplete", label: "Complete with", options: [[true, "Two pinches"], [false, "One pinch"]],
    note: "Two pinches prevents accidents" },
  { key: "autoHideSeconds", label: "Auto-hide",
    options: [[10, "After 10s"], [20, "After 20s"], [30, "After 30s"], [60, "After 1 min"], [0, "Never"]] },
  { key: "reminders", label: "Reminders", options: [[true, "On"], [false, "Off"]], note: "Water + stretch nudges" },
  { key: "timers", label: "Quest timers", options: [[true, "On"], [false, "Off"]],
    note: "Timed quests start a countdown" },
  { key: "reset", label: "Reset progress", action: true, note: "Pinch twice: wipes level, gold + quests" },
];

function showSettingsScreen() {
  showScreen("settings");
  renderAll();
}

function currentSettingItem() {
  return SETTINGS_ITEMS[ui.settingsIndex];
}

function settingValueLabel(item) {
  if (item.action) return "";
  const option = item.options.find(([value]) => value === settings[item.key]);
  return option ? option[1] : String(settings[item.key]);
}

function browseSettings(direction) {
  const count = SETTINGS_ITEMS.length;
  ui.settingsIndex = (ui.settingsIndex + direction + count) % count;
  Sound.play("click", { direction });
  renderAll();
}

// Pinch: step to the next option (or, for Reset, arm → reset).
function changeSetting() {
  const item = currentSettingItem();

  if (item.key === "reset") {
    if (!confirmTwice("reset")) return;
    resetProgress(false);
    showToast("Progress reset");
    return;
  }

  const i = item.options.findIndex(([value]) => value === settings[item.key]);
  settings[item.key] = item.options[(i + 1) % item.options.length][0];
  saveSettings();
  applySettings();
  resetIdleTimer();
  renderAll();
  Sound.play("click");                 // also lets you hear the new volume
}


/* ---------- 11d. CLOCK, TIMERS, SCHEDULES ---------- */
// • Clock + date in the header (12/24h from Settings).
// • Quests with a duration ("15-min walk", "for 10 minutes") get a
//   timer: pinch = start → pause/resume; middle pinch = stop. When it
//   runs out: chime + "TIME'S UP" alert → pinch opens the quest armed.
// • Scheduled quests: dueAt (one-off) or time "HH:MM" (daily). When the
//   time comes: "QUEST TIME" alert.
// A 1-second ticker keeps the clock and countdowns fresh; it stops when
// the display is off (visibilitychange).

// "3:05 PM" or "15:05"
function formatTime(date) {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  if (settings.clock24) return `${String(h).padStart(2, "0")}:${m}`;
  return `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

// "THU 25 SEP"
function formatDate(date) {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

// 9:41 or 1:02:03
function formatCountdown(ms) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

// When a scheduled quest is due, as a timestamp for today (or null).
function dueTimeOf(quest) {
  if (quest.dueAt) return quest.dueAt;
  if (quest.time) {
    const [h, m] = quest.time.split(":").map(Number);
    const d = clock();
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }
  return null;
}

// "⏰ 3:00 PM", "⏰ Tomorrow 9:30 AM", "⏰ Every day 8:00 AM", "⏰ Overdue · 3:00 PM"
function formatSchedule(quest) {
  const due = dueTimeOf(quest);
  if (!due) return "";
  const time = formatTime(new Date(due));
  if (quest.time) return `⏰ Every day ${time}`;
  const dueDay = dateKey(new Date(due));
  const today = dateKey(clock());
  if (dueDay > today) {
    const tomorrow = clock();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dueDay === dateKey(tomorrow) ? `⏰ Tomorrow ${time}` : `⏰ ${formatDate(new Date(due))} ${time}`;
  }
  if (!quest.completed && due < nowMs() - 60000) return `⏰ Overdue · ${time}`;
  return `⏰ ${time}`;
}

function isOverdue(quest) {
  const due = dueTimeOf(quest);
  return !!due && !quest.completed && due < nowMs() - 60000;
}

// Minutes of work in the quest ("Go for a 15-min walk" → 15), or 0.
function questMinutes(quest) {
  if (quest.minutes) return quest.minutes;
  const hours = quest.title.match(/(\d+)\s*-?\s*(hours?|hrs?)\b/i);
  if (hours) return Number(hours[1]) * 60;
  const minutes = quest.title.match(/(\d+)\s*-?\s*(minutes?|mins?)\b/i);
  return minutes ? Number(minutes[1]) : 0;
}

function hasTimer(quest) {
  return settings.timers && !isCounter(quest) && questMinutes(quest) > 0;
}

function timerFor(quest) {
  return player.timer && player.timer.questId === quest.id ? player.timer : null;
}

function timerRemaining(timer) {
  if (timer.done) return 0;
  if (timer.pausedRemaining != null) return timer.pausedRemaining;
  return Math.max(0, timer.endsAt - nowMs());
}

function startTimer(quest) {
  const durationMs = questMinutes(quest) * 60000;
  player.timer = { questId: quest.id, durationMs, endsAt: nowMs() + durationMs, pausedRemaining: null, done: false };
  saveProgress();
  Sound.play("timerStart");
  renderAll();
}

function togglePauseTimer() {
  const timer = player.timer;
  if (timer.pausedRemaining != null) {
    timer.endsAt = nowMs() + timer.pausedRemaining;
    timer.pausedRemaining = null;
    Sound.play("timerStart");
  } else {
    timer.pausedRemaining = timerRemaining(timer);
    Sound.play("disarm");
  }
  saveProgress();
  renderAll();
}

function stopTimer() {
  player.timer = null;
  saveProgress();
  Sound.play("disarm");
  showToast("Timer stopped");
  renderAll();
}

function finishTimer() {
  const timer = player.timer;
  timer.done = true;
  timer.pausedRemaining = null;
  saveProgress();
  const quest = QUESTS.find((q) => q.id === timer.questId);
  Sound.play("timerDone");
  if (!quest) return;
  renderAll();
  notify({
    kind: "quest",
    label: "⏱ TIME'S UP",
    title: quest.title,
    detail: "Pinch to finish the quest",
    questId: quest.id,
    action: "finish",
  });
}

// "QUEST TIME" alerts for scheduled quests (once each; daily ones once a day).
function checkSchedules() {
  QUESTS.forEach((quest) => {
    if (quest.completed || !isAvailable(quest)) return;
    const due = dueTimeOf(quest);
    const key = `${quest.time ? "time" : "due"}:${quest.id}`;
    if (!due || nowMs() < due || player.announcedQuestIds.includes(key)) return;
    player.announcedQuestIds.push(key);
    saveProgress();
    notify({
      kind: "quest",
      label: "⏰ QUEST TIME",
      title: quest.title,
      detail: `+${quest.xp} XP   +${quest.gold} ◆`,
      questId: quest.id,
    });
  });
}

// Every second: clock, countdowns, timer end.
function tick() {
  const timer = player.timer;
  if (timer && !timer.done && timer.pausedRemaining == null && timer.endsAt <= nowMs()) finishTimer();
  renderClock();
  renderTimer();
  if (ui.idle) renderGlance();
}

function startTicker() {
  clearInterval(ui.tickTimer);
  ui.tickTimer = setInterval(tick, 1000);
  tick();
}

function stopTicker() {
  clearInterval(ui.tickTimer);
}


/* ---------- 12. DAILY RESET, TIME WINDOWS, REMINDERS ---------- */

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


/* ---------- 13. ACTIVITY TRACKING (glasses motion sensor) ---------- */
// The glasses expose their accelerometer through the standard
// `devicemotion` event. Sustained movement (walking, standing up and
// moving around) resets the "still" timer used by the stretch reminder.
// This is an ESTIMATE: it can't tell sitting from standing still.
//
// No sensor (e.g. a desktop browser)? The stretch reminder simply
// becomes a timer since your last logged stretch break.

const Motion = {
  listening: false,
  jolts: [],
  lastJoltAt: 0,

  start() {
    if (this.listening || !("DeviceMotionEvent" in window)) return;
    // Some platforms need permission from a user gesture first.
    if (typeof DeviceMotionEvent.requestPermission === "function" && !this.permitted) return;
    window.addEventListener("devicemotion", Motion.onMotion);
    this.listening = true;
  },

  stop() {
    window.removeEventListener("devicemotion", Motion.onMotion);
    this.listening = false;
  },

  // Called from the first wearer gesture on platforms that need it.
  requestPermission() {
    if (this.asked || typeof DeviceMotionEvent === "undefined"
        || typeof DeviceMotionEvent.requestPermission !== "function") return;
    this.asked = true;
    DeviceMotionEvent.requestPermission()
      .then((state) => { this.permitted = state === "granted"; this.start(); })
      .catch(() => { /* denied or unsupported: timer fallback */ });
  },

  onMotion(event) {
    const a = event.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    const magnitude = Math.hypot(a.x, a.y, a.z);
    if (Math.abs(magnitude - 9.81) < CONFIG.MOTION_JOLT) return;

    const t = Date.now();
    if (t - Motion.lastJoltAt < 250) return;        // ignore implausibly rapid peaks
    Motion.lastJoltAt = t;
    Motion.jolts = Motion.jolts.filter((x) => t - x < 30000);
    Motion.jolts.push(t);

    if (Motion.jolts.length >= CONFIG.MOTION_JOLTS_NEEDED) {
      Motion.jolts = [];
      markActive();
    }
  },
};

function markActive() {
  ui.lastActiveAt = nowMs();
}


/* ---------- 14. IDLE MODE + BACKGROUND CHECKS ---------- */
// After IDLE_AFTER_MS without input, or on a swipe down, the HUD fades
// to a one-line glance. Black is see-through on the glasses, so idle is
// almost invisible. Swipe up (or any other gesture) wakes it — that
// first gesture ONLY wakes; it never completes a quest by accident.
// Notifications wake it too.
//
// Note: the glasses also turn their display off on their own timer, and
// a web app can't turn it back on. While the display is off, this page
// may be paused; checks run again as soon as it becomes visible.

function resetIdleTimer() {
  clearTimeout(ui.idleTimer);
  if (CONFIG.IDLE_AFTER_MS > 0 && !document.hidden) {
    ui.idleTimer = setTimeout(enterIdle, CONFIG.IDLE_AFTER_MS);
  }
}

function enterIdle() {
  // Reward screens advance on their own; wait until they're done.
  // And don't fade out while someone might be dictating a new quest.
  if (isOnRewardScreen() || ui.screen === "add" || ui.screen === "settings") { resetIdleTimer(); return; }
  ui.idle = true;
  renderGlance();
  el.hud.classList.add("is-idle");
}

// Returns true if the HUD was idle (so the caller can swallow the input).
function wake() {
  const wasIdle = ui.idle;
  ui.idle = false;
  el.hud.classList.remove("is-idle");
  resetIdleTimer();
  return wasIdle;
}

// Everything that can produce a notification without user input.
function runBackgroundChecks() {
  checkStreak();
  checkForNewDay();
  announceOpenedQuests(false);
  checkReminders();
  checkSchedules();
  // Future: poll an API / phone companion for new quests here.

  // Time windows may have opened/closed: refresh the resting screens.
  if (ui.screen === "quest" || ui.screen === "allClear") showHome();
  else renderStats();
  if (ui.idle) renderGlance();
}

function startBackgroundChecks() {
  clearInterval(ui.checkTimer);
  ui.checkTimer = setInterval(runBackgroundChecks, CONFIG.CHECK_EVERY_MS);
}

function stopBackgroundChecks() {
  clearInterval(ui.checkTimer);
  clearTimeout(ui.idleTimer);
}

// Display turned off / app backgrounded → stop timers and sensors.
// Display back on → catch up on anything missed and show the full HUD.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopBackgroundChecks();
    stopTicker();
    Motion.stop();
  } else {
    Motion.start();
    startTicker();                 // also finishes a timer that ran out meanwhile
    wake();
    runBackgroundChecks();
    startBackgroundChecks();
  }
});

// Dev: jump the clock forward an hour to test reminders / time windows.
function timeWarp() {
  ui.clockOffsetMs += 60 * 60 * 1000;
  el.clockButton.textContent = `+1 HR (${clock().toTimeString().slice(0, 5)})`;
  runBackgroundChecks();
  tick();
}


/* ---------- 15. SOUND ---------- */
// A small synth built on the Web Audio API — no audio files needed.
//
// Why these sounds feel rewarding:
//   • Layers: a low "thump", a bright body, and a high sparkle.
//   • Rising pitch = progress. Each glass of water plays one note higher,
//     so the last one resolves (anticipation → payoff).
//   • Timing matches the visuals: XP ticks count up, then a coin
//     "cha-ching" lands as the gold appears.
//   • Escalation: back-to-back completions (combos) play higher, and
//     rarer loot gets a bigger sound.
//   • Contrast: reminders are soft and plain, so the "reward" sound
//     only ever means a reward.
//   • A little reverb + a compressor make it sound polished, not beepy.
//
// To swap in real audio files later, change Sound.play() to
// e.g. new Audio("sounds/" + name + ".mp3").play();

// Major pentatonic: every note sounds good next to every other note.
const PENTATONIC = [0, 2, 4, 7, 9];
const C5 = 523.25;

// Semitones above C5 → frequency in Hz.
function note(semitones) {
  return C5 * Math.pow(2, semitones / 12);
}

// The nth note up the pentatonic scale (0 = C5, 5 = C6, ...).
function scaleStep(n) {
  return 12 * Math.floor(n / 5) + PENTATONIC[n % 5];
}

const Sound = {
  ctx: null,
  master: null,
  reverbSend: null,
  noiseBuffer: null,

  // Builds the audio chain: voices → master → compressor → speakers,
  // plus a reverb "send" for a sense of space.
  init(ctx) {
    this.ctx = ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;

    this.master = ctx.createGain();
    this.master.gain.value = CONFIG.SOUND_VOLUME;
    this.master.connect(compressor).connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 1.4, 3);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.25;
    this.reverbSend.connect(reverb).connect(this.master);

    // One second of white noise, reused for whooshes and impacts.
    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  },

  // Browsers only allow audio after a user gesture, so the context is
  // created lazily the first time something plays.
  ready() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.init(new AudioCtx());
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return true;
  },

  // One synth note.
  //   freq   start pitch (Hz)      glide  pitch to slide to (Hz)
  //   at     delay (s)             dur    length (s)
  //   type   sine | triangle | square | sawtooth
  //   vol    peak volume           cutoff lowpass filter (Hz), softens harsh waves
  //   wet    send to reverb?
  voice({ freq, at = 0, dur = 0.2, type = "sine", vol = 0.1, attack = 0.005, glide, cutoff, wet = true }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + at;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + dur * 0.8);
    osc.detune.value = (Math.random() - 0.5) * 8;   // tiny variation, less robotic

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    let source = osc;
    if (cutoff) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      osc.connect(filter);
      source = filter;
    }
    source.connect(gain);
    gain.connect(this.master);
    if (wet) gain.connect(this.reverbSend);

    osc.start(t);
    osc.stop(t + dur + 0.05);
  },

  // Filtered noise: a sweep from `from` Hz to `to` Hz (whoosh / impact).
  // attack: seconds to reach full volume (default: a slow swell). Use a
  // tiny attack like 0.005 for a sharp hit such as a cymbal crash.
  noise({ at = 0, dur = 0.2, vol = 0.05, from = 800, to = 6000, attack }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + at;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;                   // the buffer is 1s; long sounds loop it

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + (attack !== undefined ? attack : dur * 0.6));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(filter).connect(gain).connect(this.master);
    gain.connect(this.reverbSend);
    src.start(t);
    src.stop(t + dur + 0.05);
  },

  // Brass-like note: two slightly detuned sawtooth waves through a filter
  // that opens quickly ("blat") and then mellows — like a trumpet swell.
  brass({ freq, at = 0, dur = 0.4, vol = 0.06, bright = 2400 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + at;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(bright * 0.25, t);
    filter.frequency.exponentialRampToValueAtTime(bright, t + 0.06);
    filter.frequency.exponentialRampToValueAtTime(bright * 0.5, t + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.025);
    gain.gain.exponentialRampToValueAtTime(vol * 0.7, t + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    [-7, 7].forEach((cents) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.detune.value = cents;
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
    filter.connect(gain);
    gain.connect(this.master);
    gain.connect(this.reverbSend);
  },

  // Plays a named sound from SOUNDS. `options` depends on the sound.
  play(name, options = {}) {
    if (!settings.soundEnabled || !SOUNDS[name]) return;
    if (!this.ready()) return;
    SOUNDS[name](options);
  },
};

// A synthetic room: decaying stereo noise used as a reverb impulse.
function makeImpulse(ctx, seconds, decay) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

// Shorthand used by the sound recipes below.
const v = (opts) => Sound.voice(opts);
const noise = (opts) => Sound.noise(opts);
const brass = (freq, at, dur, vol, bright) => Sound.brass({ freq, at, dur, vol, bright });

// Drum hit: a low note that bends down slightly, like a timpani.
function timpani(freq, at, vol) {
  v({ freq: freq * 1.15, glide: freq, at, dur: 0.45, vol, attack: 0.003 });
}

// Cymbal: bright noise with a sharp attack and a long tail.
function crash(at, dur, vol) {
  noise({ at, dur, vol, from: 9000, to: 5000, attack: 0.005 });
}

// ----- The sound recipes -----
const SOUNDS = {
  // Browsing: a soft tick, slightly higher going forward.
  click({ direction = 1 } = {}) {
    v({ freq: direction > 0 ? 1500 : 1250, dur: 0.05, vol: 0.12, wet: false });
  },

  // Swipe down / up: a soft swoop down or up.
  hide() { v({ freq: 700, glide: 330, dur: 0.2, vol: 0.14 }); },
  show() { v({ freq: 330, glide: 700, dur: 0.2, vol: 0.14 }); },

  // Counter quest step (+1 glass). Pitch climbs with progress.
  step({ count = 1 } = {}) {
    const f = note(scaleStep(count - 1));
    v({ freq: f * 0.5, glide: f, dur: 0.12, vol: 0.12 });                   // "bloop" up
    v({ freq: f, at: 0.06, dur: 0.28, type: "triangle", vol: 0.09 });       // the note
    v({ freq: f * 2, at: 0.09, dur: 0.35, vol: 0.03 });                     // sparkle
  },

  // XP counter tick; `i` rises as the number climbs.
  tick({ i = 0 } = {}) {
    v({ freq: 900 * Math.pow(2, i / 24), dur: 0.04, type: "square", cutoff: 3000, vol: 0.09, wet: false });
  },

  // Gold awarded: classic two-note coin.
  coin() {
    v({ freq: note(11), dur: 0.08, type: "square", cutoff: 4000, vol: 0.05 });       // B5
    v({ freq: note(16), at: 0.07, dur: 0.4, type: "square", cutoff: 4000, vol: 0.05 }); // E6
    v({ freq: note(28), at: 0.07, dur: 0.4, vol: 0.02 });                              // sparkle
  },

  // Quest complete: impact + rising arpeggio + held chord + sparkle.
  // combo 2, 3, ... transposes it up a whole step each time.
  complete({ combo = 1 } = {}) {
    const k = Math.min(combo - 1, 4) * 2;
    v({ freq: 180, glide: 55, dur: 0.25, vol: 0.22, wet: false });            // thump
    noise({ dur: 0.08, vol: 0.05, from: 3000, to: 800 });                     // snap

    [0, 4, 7, 12].forEach((s, i) => {
      v({ freq: note(s + k), at: i * 0.06, dur: 0.25, type: "triangle", vol: 0.12 });
      v({ freq: note(s + k), at: i * 0.06, dur: 0.2, type: "square", cutoff: 2500, vol: 0.03 });
    });
    [12, 16, 19].forEach((s) => {
      v({ freq: note(s + k), at: 0.24, dur: 0.7, type: "triangle", vol: 0.05, attack: 0.02 });
    });
    [24, 28, 31, 36].forEach((s, i) => {
      v({ freq: note(s + k), at: 0.26 + i * 0.04, dur: 0.25, vol: 0.025 });
    });
  },

  // Level up: a full fanfare, ~3 seconds. The LEVEL UP screen's visuals
  // are timed to these beats (see showLevelUpScreen).
  //   0.00  timpani roll building up + rising whoosh
  //   0.60  brass pickup: G G G
  //   0.96  IMPACT: big C major brass chord, bass, timpani, cymbal crash
  //   1.50  F chord → 1.74 G chord (the classic "here it comes" cadence)
  //   2.00  final bright C chord + crash + sparkle run
  levelUp() {
    // Timpani roll on G2, getting louder.
    for (let i = 0; i < 12; i++) {
      timpani(note(-29), i * 0.05, 0.04 + i * 0.012);
    }
    noise({ dur: 0.9, vol: 0.05, from: 300, to: 7000 });

    // Pickup: three short G's (with the octave below for weight).
    [0.6, 0.72, 0.84].forEach((t) => {
      brass(note(-5), t, 0.1, 0.07);
      brass(note(-17), t, 0.1, 0.04);
    });

    // IMPACT.
    const hit = 0.96;
    [-12, -8, -5, 0].forEach((s) => brass(note(s), hit, 1.0, 0.055));       // C4 E4 G4 C5
    v({ freq: note(-36), at: hit, dur: 1.2, vol: 0.2, wet: false });        // C2 bass
    timpani(note(-24), hit, 0.25);
    crash(hit, 1.8, 0.06);

    // Cadence: F → G.
    [-7, -3, 0].forEach((s) => brass(note(s), 1.5, 0.22, 0.045));           // F A C
    timpani(note(-31), 1.5, 0.15);
    [-5, -1, 2].forEach((s) => brass(note(s), 1.74, 0.22, 0.045));          // G B D
    timpani(note(-29), 1.74, 0.15);

    // Final chord, an octave up, with a sparkle run on top.
    const end = 2.0;
    [0, 4, 7, 12].forEach((s) => brass(note(s), end, 1.5, 0.05, 3200));     // C5 E5 G5 C6
    v({ freq: note(-36), at: end, dur: 1.5, vol: 0.2, wet: false });
    timpani(note(-24), end, 0.22);
    crash(end, 1.6, 0.045);
    for (let i = 0; i < 10; i++) {
      v({ freq: note(24 + scaleStep(i)), at: end + 0.05 + i * 0.05, dur: 0.35, vol: 0.025 });
    }
  },

  // Loot: bigger the rarer it is.
  loot({ rarity = "common" } = {}) {
    const tier = { common: 0, uncommon: 1, rare: 2, epic: 3 }[rarity] || 0;
    let t = 0;
    if (tier === 3) {
      // Epic: suspense rise before the reveal.
      v({ freq: note(-12), glide: note(12), dur: 0.4, type: "sawtooth", cutoff: 1500, vol: 0.04 });
      noise({ dur: 0.4, vol: 0.04, from: 300, to: 6000 });
      v({ freq: note(-24), at: 0.4, dur: 0.8, vol: 0.15, wet: false });
      t = 0.4;
    }
    const notes = [3, 4, 6, 8][tier];
    for (let i = 0; i < notes; i++) {
      v({ freq: note(12 + scaleStep(i)), at: t + i * 0.045, dur: 0.3, vol: 0.06 });
    }
    if (tier >= 2) {
      [12, 16, 19, 24].forEach((s) => {
        v({ freq: note(s), at: t + notes * 0.045, dur: 0.9, type: "triangle", vol: 0.045, attack: 0.02 });
      });
    }
  },

  // 1st pinch on a quest: a rising "charge up", asking for the 2nd pinch.
  arm() {
    v({ freq: note(-5), glide: note(7), dur: 0.28, type: "triangle", vol: 0.1 });
    v({ freq: note(7), at: 0.22, dur: 0.12, vol: 0.05 });
  },

  // Confirm cancelled / timed out, or a step undone: a soft fall.
  disarm() {
    v({ freq: note(2), glide: note(-10), dur: 0.25, vol: 0.08 });
  },

  // Timer started / resumed: a quick "tick-tock" going up.
  timerStart() {
    v({ freq: note(0), dur: 0.06, type: "square", cutoff: 2500, vol: 0.06, wet: false });
    v({ freq: note(7), at: 0.12, dur: 0.08, type: "square", cutoff: 2500, vol: 0.06, wet: false });
  },

  // Timer finished: a bright bell pattern, twice, so you notice it.
  timerDone() {
    [0, 0.6].forEach((t) => {
      [12, 16, 19].forEach((s, i) => {
        v({ freq: note(s), at: t + i * 0.1, dur: 0.5, type: "triangle", vol: 0.1 });
        v({ freq: note(s + 12), at: t + i * 0.1, dur: 0.35, vol: 0.03 });
      });
    });
  },

  // A quest you added lands on the board: "quest accepted".
  questAdded() {
    noise({ dur: 0.25, vol: 0.03, from: 800, to: 5000 });                   // page swoosh
    v({ freq: note(7), at: 0.08, dur: 0.18, type: "triangle", vol: 0.11 });  // G5
    v({ freq: note(14), at: 0.18, dur: 0.45, type: "triangle", vol: 0.11 }); // D6
    [19, 24, 26].forEach((s, i) => v({ freq: note(s), at: 0.22 + i * 0.05, dur: 0.3, vol: 0.03 }));
  },

  // Notifications: gentle and neutral on purpose (not a "reward").
  notify() {
    v({ freq: note(7), dur: 0.35, vol: 0.07, cutoff: 3000 });                 // G5
    v({ freq: note(12), at: 0.14, dur: 0.5, vol: 0.07, cutoff: 3000 });       // C6
  },

  // Reminders (water, stretch): one soft ding.
  reminder() {
    v({ freq: note(9), dur: 0.6, vol: 0.12, attack: 0.01, cutoff: 2500 });    // A5
  },
};

// Dev "♪ TEST" button: steps through every sound so you can tune them.
const SOUND_PREVIEWS = [
  ["complete", {}], ["complete", { combo: 3 }], ["step", { count: 1 }], ["step", { count: 7 }],
  ["coin", {}], ["levelUp", {}], ["loot", { rarity: "common" }], ["loot", { rarity: "rare" }],
  ["loot", { rarity: "epic" }], ["questAdded", {}], ["arm", {}], ["disarm", {}], ["timerStart", {}], ["timerDone", {}], ["notify", {}], ["reminder", {}], ["hide", {}], ["show", {}],
];
let soundPreviewIndex = 0;

function previewNextSound() {
  const [name, options] = SOUND_PREVIEWS[soundPreviewIndex];
  soundPreviewIndex = (soundPreviewIndex + 1) % SOUND_PREVIEWS.length;
  Sound.play(name, options);
  const extra = Object.values(options)[0];
  el.soundPreview.textContent = `♪ ${name}${extra !== undefined ? " " + extra : ""}`;
}

function toggleSound() {
  settings.soundEnabled = !settings.soundEnabled;
  saveSettings();
  renderSoundToggle();
  Sound.play("click");
}


/* ---------- 16. UI RENDERING ---------- */
// All DOM lookups live here so the rest of the code never touches HTML ids.

const el = {
  hud: document.getElementById("hud"),
  screens: {
    quest: document.getElementById("screenQuest"),
    complete: document.getElementById("screenComplete"),
    levelUp: document.getElementById("screenLevelUp"),
    loot: document.getElementById("screenLoot"),
    allClear: document.getElementById("screenAllClear"),
    alert: document.getElementById("screenAlert"),
    add: document.getElementById("screenAdd"),
    settings: document.getElementById("screenSettings"),
  },

  clockTime: document.getElementById("clockTime"),
  clockDate: document.getElementById("clockDate"),
  timerBadge: document.getElementById("timerBadge"),

  questSchedule: document.getElementById("questSchedule"),
  questTimer: document.getElementById("questTimer"),
  questTimerTime: document.getElementById("questTimerTime"),
  questTimerFill: document.getElementById("questTimerFill"),

  draftExtras: document.getElementById("draftExtras"),

  settingLabel: document.getElementById("settingLabel"),
  settingValue: document.getElementById("settingValue"),
  settingNote: document.getElementById("settingNote"),
  settingPager: document.getElementById("settingPager"),

  addInput: document.getElementById("addInput"),
  addEntry: document.getElementById("addEntry"),
  addPreview: document.getElementById("addPreview"),
  draftType: document.getElementById("draftType"),
  draftTitle: document.getElementById("draftTitle"),
  draftXp: document.getElementById("draftXp"),
  draftGold: document.getElementById("draftGold"),
  gold: document.getElementById("goldValue"),
  streak: document.getElementById("streakValue"),

  questType: document.getElementById("questType"),
  questTitle: document.getElementById("questTitle"),
  questProgress: document.getElementById("questProgress"),
  questPips: document.getElementById("questPips"),
  questProgressText: document.getElementById("questProgressText"),
  questXp: document.getElementById("questXp"),
  questGold: document.getElementById("questGold"),
  questPager: document.getElementById("questPager"),

  completeTitle: document.getElementById("completeTitle"),
  completeXp: document.getElementById("completeXp"),
  completeGold: document.getElementById("completeGold"),
  levelUpHeading: document.getElementById("levelUpHeading"),
  levelUpNumber: document.getElementById("levelUpNumber"),
  levelUpTitle: document.getElementById("levelUpTitle"),
  levelUpBonus: document.getElementById("levelUpBonus"),
  levelTitle: document.getElementById("levelTitle"),
  comboBanner: document.getElementById("comboBanner"),

  lootRarity: document.getElementById("lootRarity"),
  lootName: document.getElementById("lootName"),
  lootEffect: document.getElementById("lootEffect"),

  alertLabel: document.getElementById("alertLabel"),
  alertTitle: document.getElementById("alertTitle"),
  alertDetail: document.getElementById("alertDetail"),

  glanceLabel: document.getElementById("glanceLabel"),
  glanceText: document.getElementById("glanceText"),

  level: document.getElementById("levelValue"),
  xpText: document.getElementById("xpText"),
  xpFill: document.getElementById("xpFill"),

  hintBrowse: document.getElementById("hintBrowse"),
  hintBrowseLabel: document.getElementById("hintBrowseLabel"),
  hintHide: document.getElementById("hintHide"),
  hintHideKey: document.getElementById("hintHideKey"),
  hintHideLabel: document.getElementById("hintHideLabel"),
  hintConfirm: document.getElementById("hintConfirm"),
  hintConfirmLabel: document.getElementById("hintConfirmLabel"),

  confirmButton: document.getElementById("confirmButton"),
  navButtons: document.querySelectorAll(".btn-nav"),
  soundToggle: document.getElementById("soundToggle"),
  clockButton: document.getElementById("clockButton"),
  soundPreview: document.getElementById("soundPreview"),

  toast: document.getElementById("toast"),
  flash: document.getElementById("flash"),
  particles: document.getElementById("particles"),
};

// Shows exactly one screen.
function showScreen(name) {
  ui.screen = name;
  Object.entries(el.screens).forEach(([key, node]) => {
    node.hidden = key !== name;
  });
  // Any screen change cancels a half-done confirm or pending undo.
  if (ui.armed) { clearTimeout(ui.armed.timer); ui.armed = null; }
  if (ui.undo && name !== "quest") { clearTimeout(ui.undo.timer); ui.undo = null; }

  // Leaving the add card: drop focus so the text box stops taking keys.
  if (name !== "add" && document.activeElement === el.addInput) {
    el.addInput.value = "";
    el.addInput.blur();
  }
}

function renderAll() {
  renderStats();
  renderXp();
  renderQuest();
  renderControls();
  renderSoundToggle();
  renderClock();
  renderTimer();
}

// Header: "3:42 PM  THU 25 SEP"
function renderClock() {
  const now = clock();
  el.clockTime.textContent = formatTime(now);
  el.clockDate.textContent = formatDate(now);
}

// The countdown on the quest card + the small ⏱ badge in the header.
function renderTimer() {
  const timer = player.timer;
  el.timerBadge.hidden = !timer;
  if (timer) el.timerBadge.textContent = timer.done ? "⏱ Done" : `⏱ ${formatCountdown(timerRemaining(timer))}`;
  el.timerBadge.classList.toggle("is-paused", !!timer && timer.pausedRemaining != null);

  const quest = currentQuest();
  const show = ui.screen === "quest" && quest && !quest.completed && hasTimer(quest);
  el.questTimer.hidden = !show;
  el.screens.quest.classList.toggle("has-timer", !!show);
  if (!show) return;

  const own = timerFor(quest);
  const total = questMinutes(quest) * 60000;
  const remaining = own ? timerRemaining(own) : total;
  el.questTimerTime.textContent = own && own.done ? "Done!" : formatCountdown(remaining);
  el.questTimerFill.style.width = `${(1 - remaining / total) * 100}%`;
  el.questTimer.dataset.state = !own ? "ready" : own.done ? "done" : own.pausedRemaining != null ? "paused" : "running";
}

function renderStats() {
  el.gold.textContent = player.gold;
  el.streak.textContent = player.streak;
}

function renderXp() {
  const needed = xpNeededFor(player.level);
  el.level.textContent = player.level;
  el.levelTitle.textContent = titleFor(player.level);
  el.xpText.textContent = `${player.xp} / ${needed} XP`;
  el.xpFill.classList.remove("level-glow");
  el.xpFill.style.width = `${(player.xp / needed) * 100}%`;
}

function renderQuest() {
  const quest = currentQuest();
  if (!quest) return;

  el.questType.textContent = quest.completed ? "✓ COMPLETED" : QUEST_TYPE_LABELS[quest.type];
  el.questType.dataset.type = quest.completed ? "done" : quest.type;
  el.questTitle.textContent = quest.title;
  el.questTitle.classList.toggle("is-done", quest.completed);
  el.questXp.textContent = quest.xp;
  el.questGold.textContent = quest.gold;

  // Scheduled: "⏰ 3:00 PM" (red when overdue)
  const schedule = formatSchedule(quest);
  el.questSchedule.hidden = !schedule || quest.completed;
  el.questSchedule.textContent = schedule;
  el.questSchedule.classList.toggle("is-overdue", isOverdue(quest));

  // Counter quests: a pip per step + "3 / 8 glasses"
  el.questProgress.hidden = !isCounter(quest);
  if (isCounter(quest)) {
    const count = quest.completed ? quest.target : progressOf(quest);
    el.questPips.innerHTML = "";
    for (let i = 0; i < quest.target; i++) {
      const pip = document.createElement("span");
      pip.className = i < count ? "pip is-filled" : "pip";
      el.questPips.appendChild(pip);
    }
    el.questProgressText.textContent = `${count} / ${quest.target} ${quest.units}`;
  }

  // Position among quests currently on the board.
  const board = availableQuests();
  el.questPager.textContent = `${board.indexOf(quest) + 1} / ${board.length}`;
}

function isOnRewardScreen() {
  return ui.screen === "complete" || ui.screen === "levelUp" || ui.screen === "loot";
}

// "+1 Glass"
function stepLabel(quest) {
  return `+1 ${quest.unit.charAt(0).toUpperCase()}${quest.unit.slice(1)}`;
}

// What "confirm" (pinch / Enter) means on the current screen.
// Shared by the on-glasses hint and the browser test button.
function confirmLabel() {
  if (ui.armed) return { text: "Confirm!", enabled: true };
  if (ui.screen === "settings") return { text: currentSettingItem().action ? "Reset" : "Change", enabled: true };
  if (ui.screen === "quest") {
    const quest = currentQuest();
    if (quest.completed) return { text: "Done ✓", enabled: false };
    const timer = timerFor(quest);
    if (hasTimer(quest) && !(timer && timer.done)) {
      if (!timer) return { text: `Start ${questMinutes(quest)} min`, enabled: true };
      return { text: timer.pausedRemaining != null ? "Resume" : "Pause", enabled: true };
    }
    if (isCounter(quest) && progressOf(quest) + 1 < quest.target) {
      return { text: stepLabel(quest), enabled: true };
    }
    return { text: isCounter(quest) ? "Finish" : "Complete", enabled: true };
  }
  if (ui.screen === "allClear") return { text: "New round", enabled: true };
  if (ui.screen === "add") return { text: ui.draftQuest ? "Add" : "Speak", enabled: true };
  if (ui.screen === "alert") {
    const alert = ui.currentAlert;
    const quest = alert && alert.questId && QUESTS.find((q) => q.id === alert.questId);
    if (quest && alert.action === "log" && !quest.completed) return { text: stepLabel(quest), enabled: true };
    if (quest && alert.action === "finish" && !quest.completed) return { text: "Finish", enabled: true };
    return { text: quest ? "View" : "OK", enabled: true };
  }
  return { text: "Continue", enabled: true };   // reward screens
}

function renderControls() {
  const confirm = confirmLabel();
  const canBrowse = !isOnRewardScreen() && ui.screen !== "alert";

  // On-glasses gesture hints
  el.hintConfirmLabel.textContent = confirm.text;
  el.hintConfirm.classList.toggle("is-disabled", !confirm.enabled);
  el.hintBrowse.classList.toggle("is-off", !canBrowse);
  el.hintBrowseLabel.textContent =
    ui.screen === "add" && ui.draftQuest ? "Type" : ui.screen === "settings" ? "Setting" : "Browse";

  // Armed (after the 1st pinch): gold pinch hint + draining confirm bar.
  el.hud.classList.toggle("is-armed", !!ui.armed);
  el.hintConfirm.classList.toggle("is-armed", !!ui.armed);

  // Middle hint: normally "▼ Hide". It changes when there is something
  // better to do: "BACK Undo" after a +1 step, "BACK Stop" while this
  // quest's timer runs, "▼ Back" on the Add / Settings pages.
  const quest = currentQuest();
  const runningTimer = ui.screen === "quest" && quest && timerFor(quest) && !timerFor(quest).done;
  let middle = ["▼", "Hide"];
  if (ui.undo) middle = ["BACK", "Undo"];
  else if (runningTimer) middle = ["BACK", "Stop"];
  else if (ui.screen === "add" || ui.screen === "settings") middle = ["▼", "Back"];
  el.hintHideKey.textContent = middle[0];
  el.hintHideLabel.textContent = middle[1];
  el.hintHide.classList.toggle("is-undo", middle[0] === "BACK");

  // Add card: text box (entry) or the quest preview (after speaking).
  if (ui.screen === "add") renderAddScreen();
  if (ui.screen === "settings") renderSettingsScreen();

  // Browser test buttons
  el.confirmButton.textContent = confirm.text.toUpperCase();
  el.confirmButton.disabled = !confirm.enabled;
  el.navButtons.forEach((b) => { b.disabled = !canBrowse; });
}

function renderAddScreen() {
  const draft = ui.draftQuest;
  el.addEntry.hidden = !!draft;
  el.addPreview.hidden = !draft;
  if (!draft) return;
  el.draftType.textContent = `◀ ${QUEST_TYPE_LABELS[draft.type]} ▶`;
  el.draftType.dataset.type = draft.type;
  el.draftTitle.textContent = draft.title;
  el.draftXp.textContent = draft.xp;
  el.draftGold.textContent = draft.gold;

  // "⏰ Tomorrow 9:30 AM · ⏱ 10 min"
  const extras = [formatSchedule(draft), questMinutes(draft) ? `⏱ ${questMinutes(draft)} min timer` : ""]
    .filter(Boolean).join("  ·  ");
  el.draftExtras.hidden = !extras;
  el.draftExtras.textContent = extras;
}

function renderSettingsScreen() {
  const item = currentSettingItem();
  el.settingLabel.textContent = item.label;
  el.settingValue.textContent = settingValueLabel(item);
  el.settingValue.hidden = !!item.action;
  el.settingNote.textContent = item.note || "Pinch to change";
  el.settingPager.textContent = `${ui.settingsIndex + 1} / ${SETTINGS_ITEMS.length}`;
  el.screens.settings.classList.toggle("is-danger", !!item.action);
}

// Briefly pulses a hint so the wearer sees their gesture registered.
function pulseHint(node) {
  node.classList.remove("is-pressed");
  void node.offsetWidth;              // restart the CSS animation
  node.classList.add("is-pressed");
}

function renderSoundToggle() {
  el.soundToggle.textContent = settings.soundEnabled ? "♪ SOUND ON" : "♪ SOUND OFF";
}

// The one-line view shown while idle.
function renderGlance() {
  const quest = currentQuest();
  if (ui.screen === "alert" && ui.currentAlert) {
    el.glanceLabel.textContent = `● ${ui.currentAlert.label}`;
    el.glanceText.textContent = ui.currentAlert.title;
    el.hud.dataset.glance = "alert";
  } else {
    // Idle glance: the time on top, then a running timer, or the quest.
    const timer = player.timer;
    const timerQuest = timer && QUESTS.find((q) => q.id === timer.questId);
    el.glanceLabel.textContent = formatTime(clock());
    if (timerQuest) {
      el.glanceText.textContent = `⏱ ${timer.done ? "Done" : formatCountdown(timerRemaining(timer))} · ${timerQuest.title}`;
    } else if (ui.screen === "allClear") {
      el.glanceText.textContent = "All quests clear";
    } else {
      el.glanceText.textContent = isCounter(quest) && !quest.completed
        ? `${quest.title} · ${progressOf(quest)}/${quest.target}`
        : quest.title;
    }
    el.hud.dataset.glance = "";
  }
}

// The celebration is a short, timed sequence (sound and visuals line up):
//   0ms    impact + flash + particles + arpeggio
//   150ms  XP counts up, ticking as it climbs
//   700ms  gold pops in with a coin "cha-ching"   (CSS delay matches)
// If you levelled up, the XP bar fills and glows gold, then the
// LEVEL UP screen takes over.
function showCompleteScreen(quest, levelsGained, combo = 1) {
  el.completeTitle.textContent = quest.title;
  el.completeGold.textContent = quest.gold;
  el.completeXp.textContent = "0";
  el.comboBanner.hidden = combo < 2;
  el.comboBanner.textContent = `COMBO ×${combo}`;

  showScreen("complete");
  renderControls();
  renderStats();

  Sound.play("complete", { combo });
  flashScreen();
  spawnParticles("var(--green)", 18);
  animateXpBar(levelsGained);

  setTimeout(() => {
    countUp(el.completeXp, quest.xp, 550, (i) => Sound.play("tick", { i }));
  }, 150);

  setTimeout(() => Sound.play("coin"), 700);

  // Level up: move on to the fanfare a little sooner.
  ui.advanceTimer = setTimeout(advanceFromRewards, levelsGained > 0 ? 1700 : CONFIG.COMPLETE_SCREEN_MS);
}

// LEVEL UP: the big one. Timed to the fanfare in SOUNDS.levelUp:
//   0ms     drum roll; "LEVEL UP!" drops in letter by letter; rays fade in
//   600ms   three-note brass pickup
//   960ms   IMPACT: big chord + cymbal. Number flips old → new, shockwave
//           ring, gold flash, particle burst, XP bar resets
//   1500ms  chord, 1740ms chord (small pulses on the number)
//   2000ms  final chord: new title + bonus gold pop in, confetti burst
function showLevelUpScreen({ from, to, bonusGold, newTitle }) {
  const screen = el.screens.levelUp;

  // "LEVEL UP!" as separate letters so they can drop in one by one.
  el.levelUpHeading.innerHTML = "";
  "LEVEL UP!".split("").forEach((ch, i) => {
    const span = document.createElement("span");
    span.textContent = ch === " " ? " " : ch;
    span.style.setProperty("--i", i);
    el.levelUpHeading.appendChild(span);
  });

  el.levelUpNumber.textContent = from;
  el.levelUpTitle.textContent = newTitle
    ? `New title: ${newTitle}`
    : `Next level: ${xpNeededFor(to)} XP`;
  el.levelUpBonus.textContent = `+${bonusGold} ◆ level bonus`;

  screen.classList.remove("is-impact", "is-pulse");
  showScreen("levelUp");
  renderControls();

  Sound.play("levelUp");

  const at = (ms, fn) => ui.effectTimers.push(setTimeout(fn, ms));

  at(960, () => {
    el.levelUpNumber.textContent = to;
    restartClass(screen, "is-impact");
    flashScreen("gold");
    spawnParticles("var(--gold)", 40);
    settleXpBar();
    renderStats();
  });
  at(1500, () => restartClass(screen, "is-pulse"));
  at(1740, () => restartClass(screen, "is-pulse"));
  at(2000, () => {
    ["var(--gold)", "var(--green)", "var(--cyan)", "var(--purple)"].forEach((c) => spawnParticles(c, 10));
  });

  ui.advanceTimer = setTimeout(advanceFromRewards, CONFIG.LEVEL_UP_SCREEN_MS);
}

// Removes and re-adds a class so its CSS animation plays again.
function restartClass(node, className) {
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
}

function showLootScreen(loot) {
  const rarityLabel = RARITIES[loot.rarity].label.toUpperCase();
  el.screens.loot.dataset.rarity = loot.rarity;
  el.lootRarity.textContent = `${rarityLabel} DROP!`;
  el.lootName.textContent = loot.name;
  // "\n" in effect text becomes a line break
  el.lootEffect.innerHTML = "";
  loot.effect.split("\n").forEach((line, i) => {
    if (i > 0) el.lootEffect.appendChild(document.createElement("br"));
    el.lootEffect.appendChild(document.createTextNode(line));
  });

  showScreen("loot");
  renderControls();

  Sound.play("loot", { rarity: loot.rarity });
  const colorByRarity = {
    common: "var(--text)", uncommon: "var(--green)", rare: "var(--gold)", epic: "var(--purple)",
  };
  spawnParticles(colorByRarity[loot.rarity], loot.rarity === "epic" ? 32 : 16);

  ui.advanceTimer = setTimeout(advanceFromRewards, CONFIG.LOOT_SCREEN_MS);
}

function showAlertScreen(alert) {
  el.screens.alert.dataset.kind = alert.kind;
  el.alertLabel.textContent = alert.label;
  el.alertTitle.textContent = alert.title;
  el.alertDetail.textContent = alert.detail || "";
  showScreen("alert");
  renderAll();
}


/* ---------- 17. EFFECTS ---------- */

// Quick green flash over the whole HUD.
function flashScreen(color = "green") {
  el.flash.dataset.color = color;
  el.flash.classList.remove("is-active");
  void el.flash.offsetWidth;          // restart the CSS animation
  el.flash.classList.add("is-active");
}

// Small floating text, e.g. "+5 XP" after logging a glass of water.
function showToast(text) {
  el.toast.textContent = text;
  el.toast.classList.remove("is-active");
  void el.toast.offsetWidth;
  el.toast.classList.add("is-active");
}

// Burst of small squares flying out from the center.
function spawnParticles(color, count) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    const angle = Math.random() * Math.PI * 2;
    const distance = 90 + Math.random() * 140;
    p.className = "particle";
    p.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    p.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    p.style.setProperty("--particle-color", color);
    p.style.animationDelay = `${Math.random() * 80}ms`;
    el.particles.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}

// Animates a number from 0 up to `target`.
// onTick(i) fires as the number climbs (at most every 45ms), so a sound
// can tick along with it; i counts up from 0.
function countUp(node, target, duration, onTick) {
  const start = performance.now();
  let shown = 0;
  let ticks = 0;
  let lastTickAt = 0;
  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(target * eased);
    if (value !== shown) {
      shown = value;
      node.textContent = value;
      if (onTick && now - lastTickAt >= 45) {
        lastTickAt = now;
        onTick(ticks++);
      }
    }
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Fills the XP bar. On level-up it fills to 100%, glows gold, and HOLDS
// there (still showing the old level) until the LEVEL UP screen's
// impact calls settleXpBar().
function animateXpBar(levelsGained) {
  if (levelsGained === 0) {
    renderXp();
    return;
  }
  // Keep showing the OLD level (full bar) so the reveal isn't spoiled.
  const oldLevel = player.level - levelsGained;
  el.level.textContent = oldLevel;
  el.levelTitle.textContent = titleFor(oldLevel);
  el.xpText.textContent = `${xpNeededFor(oldLevel)} / ${xpNeededFor(oldLevel)} XP`;
  el.xpFill.classList.add("level-glow");
  el.xpFill.style.width = "100%";
}

// Snap the full bar back to 0, then fill to the new level's progress.
function settleXpBar() {
  const fill = el.xpFill;
  fill.classList.add("no-transition");
  fill.style.width = "0%";
  void fill.offsetWidth;              // apply the snap before re-enabling transition
  fill.classList.remove("no-transition");
  renderXp();                         // new level number + title + progress
}


/* ---------- 18. INPUT ---------- */
// Every input source (Neural Band, keyboard, test buttons, and later a
// phone companion or voice) funnels into handleAction().

// Gestures that bring the HUD back when it's idle. Swipe up is the
// intended one; the others also wake it so nothing feels "dead".
const WAKE_ACTIONS = ["show", "prev", "next", "confirm"];

// Returns true if the action was handled, false if it should be left
// to the browser / glasses system (e.g. Back on the main screen exits).
function handleAction(action) {
  Motion.requestPermission();        // no-op unless the platform needs it

  // While idle, the first gesture only wakes the HUD.
  if (ui.idle) {
    if (WAKE_ACTIONS.includes(action)) { wake(); Sound.play("show"); return true; }
    if (action === "hide") return true;             // already hidden
    if (action === "back") return false;            // let the system handle it
  }
  resetIdleTimer();

  // Any gesture other than a pinch cancels a half-done confirm.
  if (ui.armed && action !== "confirm" && action !== "back") disarm(true);
  if (ui.undo && (action === "prev" || action === "next")) clearUndo();

  switch (action) {
    case "show":
      // Swipe up climbs the stack:  QUEST ▲ ADD QUEST ▲ SETTINGS
      if (ui.screen === "quest" || ui.screen === "allClear") {
        Sound.play("show");
        showAddScreen();
      } else if (ui.screen === "add" && !ui.draftQuest) {   // (not mid-preview)
        Sound.play("show");
        showSettingsScreen();
      }
      return true;

    case "hide":
      // Swipe down goes back one level; from the quest board it hides.
      if (ui.screen === "settings") {
        pulseHint(el.hintHide);
        Sound.play("hide");
        showAddScreen();
        return true;
      }
      if (ui.screen === "add") {
        pulseHint(el.hintHide);
        Sound.play("hide");
        leaveAddScreen(0);
        return true;
      }
      // On a reward screen, finish the sequence quietly first.
      if (isOnRewardScreen()) skipRewards();
      pulseHint(el.hintHide);
      Sound.play("hide");
      clearTimeout(ui.idleTimer);
      enterIdle();                   // an open alert stays pending in the glance
      return true;

    case "prev":
    case "next":
      if (isOnRewardScreen() || ui.screen === "alert") return true;   // browsing paused
      pulseHint(el.hintBrowse);
      if (ui.screen === "add" && ui.draftQuest) {       // preview: change the type
        cycleDraftType(action === "prev" ? -1 : 1);
        return true;
      }
      if (ui.screen === "settings") {
        browseSettings(action === "prev" ? -1 : 1);
        return true;
      }
      Sound.play("click", { direction: action === "prev" ? -1 : 1 });
      browseQuests(action === "prev" ? -1 : +1);
      return true;

    case "confirm": {
      if (!confirmLabel().enabled) return true;
      pulseHint(el.hintConfirm);
      const quest = currentQuest();
      if (ui.screen === "quest") {
        const isStep = isCounter(quest) && progressOf(quest) + 1 < quest.target;
        const timer = timerFor(quest);
        if (hasTimer(quest) && !(timer && timer.done)) {          // timed quest
          if (timer) togglePauseTimer();
          else startTimer(quest);
        }
        else if (isStep) logQuestStep(quest);                     // one pinch (undoable)
        else if (confirmTwice("complete", quest.id)) {            // two pinches
          if (isCounter(quest)) logQuestStep(quest);              // final step completes
          else completeQuest(quest);
        }
      }
      else if (isOnRewardScreen()) advanceFromRewards();
      else if (ui.screen === "alert") { Sound.play("click"); closeAlert(true); }
      else if (ui.screen === "allClear") {
        if (confirmTwice("newRound")) { Sound.play("click"); startNewRound(); }
      }
      else if (ui.screen === "settings") changeSetting();
      else if (ui.screen === "add") {
        if (ui.draftQuest) commitDraftQuest();
        else if (el.addInput.value.trim()) submitAddText();
        else el.addInput.focus({ preventScroll: true });   // desktop: ready to type
      }
      return true;
    }

    case "back":
      // Middle-finger pinch: cancel a half-done confirm, undo a +1 step,
      // dismiss an alert, or skip reward screens. Anywhere else, let the
      // system handle Back (leave the app).
      if (ui.armed) { disarm(false); return true; }
      if (ui.undo && ui.screen === "quest") { undoLastStep(); return true; }
      if (ui.screen === "quest" && timerFor(currentQuest()) && !player.timer.done) { stopTimer(); return true; }
      if (ui.screen === "settings") { Sound.play("click"); showAddScreen(); return true; }
      if (ui.screen === "alert") { Sound.play("click"); closeAlert(false); return true; }
      if (ui.screen === "add") {
        Sound.play("click");
        if (ui.draftQuest) cancelDraftQuest();          // preview → speak again
        else leaveAddScreen(0);                         // back to the board
        return true;
      }
      if (!isOnRewardScreen()) return false;
      Sound.play("click");
      skipRewards();
      return true;

    // ----- dev / test actions -----
    case "toggleSound":
      toggleSound();
      return true;

    case "reset":
      resetProgress();
      return true;

    case "simulateQuest":
      simulateIncomingQuest();
      return true;

    case "previewSound":
      previewNextSound();
      return true;

    case "timeWarp":
      timeWarp();
      return true;

  }
  return false;
}

// Keyboard → action mapping.
// On Meta Ray-Ban Display the Neural Band arrives as these same keys:
//   thumb swipe         → Arrow keys
//   index-finger pinch  → Enter
//   middle-finger pinch → Escape (Back)
const KEY_BINDINGS = {
  ArrowLeft: "prev",
  ArrowRight: "next",
  ArrowUp: "show",      // swipe up   → bring the HUD back
  ArrowDown: "hide",    // swipe down → fade to the idle glance
  Enter: "confirm",
  Escape: "back",
  // dev keys (desktop only)
  m: "toggleSound",   M: "toggleSound",
  n: "simulateQuest", N: "simulateQuest",
  t: "timeWarp",      T: "timeWarp",
  p: "previewSound",  P: "previewSound",
};

document.addEventListener("keydown", (event) => {
  // The "+ ADD QUEST" text box needs some keys for itself:
  //  • Enter (the pinch) must reach it untouched — that's what opens the
  //    glasses' voice/handwriting composer, and commits typed text on desktop.
  //  • Typing and moving the caret on desktop.
  if (event.target === el.addInput) {
    if (event.key === "Enter" || event.key.length === 1) return;
    if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && el.addInput.value) return;
  }

  const action = KEY_BINDINGS[event.key];
  if (!action || event.repeat) return;
  // Only block the default when we used the key. This also stops a focused
  // button from "clicking" a second time on Enter.
  if (handleAction(action)) event.preventDefault();
});

// Text committed from the composer (or Enter after typing on desktop).
el.addInput.addEventListener("change", () => {
  if (ui.screen === "add" && el.addInput.value.trim()) submitAddText();
});

// Any element with data-action="..." becomes a control.
document.querySelectorAll("[data-action]").forEach((node) => {
  node.addEventListener("click", () => {
    handleAction(node.dataset.action);
    node.blur();   // so keyboard focus doesn't linger on buttons
  });
});

// Hooks for future integrations (gesture bridge, phone companion, API
// sync, homelab server, AI quest generator), e.g. from the console:
//   QuestLog.receiveQuest({ title: "Feed the cat", type: "main", xp: 30, gold: 6 })
//   QuestLog.notify({ kind: "warning", label: "STREAK AT RISK", title: "Finish 1 quest today" })
window.QuestLog = {
  handleAction,
  receiveQuest,
  notify,
  // Plain-language quest from anywhere (phone voice assistant, API...):
  //   QuestLog.addFromText("daily: stretch for 10 minutes")
  addFromText: (text) => {
    const draft = parseQuestText(text || "");
    return draft ? receiveQuest(draft) : null;
  },
  parseQuestText,
  player: () => player,
  quests: QUESTS,
};


/* ---------- 19. START-UP ---------- */
// The confirm bar's drain animation uses the same timing as the logic.
el.hud.style.setProperty("--confirm-ms", `${CONFIG.CONFIRM_WINDOW_MS}ms`);

loadSettings();
applySettings();
loadProgress();
markActive();              // treat opening the app as "active" for the stretch timer
Motion.start();

// Start reminder cooldowns now so nothing nags the instant the app opens.
QUESTS.forEach((q) => { if (q.reminder) ui.lastReminderAt[q.id] = nowMs(); });

checkStreak();
checkForNewDay();          // may raise a "New Day" alert
announceOpenedQuests(true);   // timed quests already open: no announcement spam
startBackgroundChecks();
startTicker();

// Resume on the saved quest, or the next open one if it's already done.
if (currentQuest().completed) moveToNextIncompleteQuest();

// Render without the bar sliding in from 0 on page load.
el.xpFill.classList.add("no-transition");
if (ui.currentAlert) renderAll();   // a start-up check already raised an alert
else showHome();
void el.xpFill.offsetWidth;
el.xpFill.classList.remove("no-transition");

resetIdleTimer();
