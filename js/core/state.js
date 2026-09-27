/* =========================================================
   Quest Log // HUD — Player state + saving
   The player / ui / settings objects, the game clock, and localStorage saving.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- PLAYER STATE + CLOCK ---------- */
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
    // From chest loot:
    buffs: [],                 // timed power-ups { id, icon, stat, mult|add, endsAt }
    streakShields: 0,          // each one saves a missed day once
    guaranteedDrops: 0,        // next N quests always drop a chest
    // Shop: ids bought, and what's equipped per kind (see SHOP_ITEMS).
    unlocks: [],
    // Quest menu: built-in quests you removed (restore them in Settings).
    hiddenQuestIds: [],
    // Daily login chest.
    loginStreak: 0,            // consecutive days a daily chest was opened
    lastDailyChest: null,      // "YYYY-MM-DD"
    equipped: { ...DEFAULT_EQUIPPED },
    // Recorded now for the future inventory / stats / store screens:
    itemsFound: {},            // { itemId: timesFound }
    lifetime: {
      questsCompleted: 0,
      xpEarned: 0,
      goldEarned: 0,
      chestsOpened: 0,
      bestStreak: 0,
      bestCombo: 0,
      goldSpent: 0,
      bestLoginStreak: 0,
    },
    // Achievements: { id: unlockedAtMs } (see js/data/achievements.js)
    achievements: {},
    // Counters that only achievements need.
    counters: {
      glasses: 0,              // glasses of water logged, ever
      stretches: 0,            // stretch breaks logged, ever
      timersFinished: 0,
      questsAdded: 0,          // by voice / typing
      undos: 0,
      kazooQuests: 0,          // quests completed with the kazoo pack on
      perfectDays: 0,          // days every daily quest was done
      lastPerfectDay: null,
      maxGold: 0,              // most gold held at once
      questCounts: {},         // { questId: times completed }
      // Secrets (0 / 1)
      konami: 0, pokedVoid: 0, goldenPotato: 0, zeroScratch: 0, nightOwl: 0, earlyBird: 0,
    },
  };
}

let player = createNewPlayer();

// UI state (not saved)
const ui = {
  // "quest" | "complete" | "levelUp" | "loot" | "allClear" | "alert"
  // | "add" | "settings"
  screen: "quest",
  settingsIndex: 0,    // which setting card is showing
  shopIndex: 0,        // which shop card is showing
  profileIndex: 0,     // profile: 0 = stats, 1… = collection item
  editingQuestId: null, // Add card is editing this quest (quest menu → Edit)
  newAchievements: [],  // unlocked, waiting to be announced
  achievementTimer: null,
  recentActions: [],   // for the ↑↑↓↓◀▶◀▶ secret
  voidPokes: 0,        // holds on the all-clear screen (secret)
  shopPreviewTimer: null,
  coinGlyph: "◆",      // what the coin fountain throws (equipped coin rain)
  rainbowTimer: null,  // Rainbow Road theme colour cycling
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
  chest: null,         // treasure chest animation state (see showChestScreen)
  pendingReveal: null, // { gold } held back from the display until the chest opens
  combo: 0,            // quests finished back-to-back
  lastCompleteAt: 0,
};

// Settings are stored separately so "Reset Progress" doesn't touch them.
// Changed on the glasses from the SETTINGS screen (js/features/settings.js).
const settings = {
  soundEnabled: true,
  volume: 0.8,              // 0.25 | 0.5 | 0.8 | 1
  clock24: false,           // 24-hour clock?
  twoPinchComplete: true,   // completing needs a 2nd pinch
  doublePinchMs: 1000,      // time allowed for the 2nd pinch: 600 | 800 | 1000 | 1300
  autoHideSeconds: 20,      // 10 | 20 | 30 | 60 | 0 (never)
  reminders: true,          // hydration / stretch nudges
  timers: true,             // quests with a duration start a timer
};

// Copies settings into CONFIG, which the rest of the code reads.
function applySettings() {
  CONFIG.SOUND_VOLUME = settings.volume;
  CONFIG.IDLE_AFTER_MS = settings.autoHideSeconds * 1000;
  CONFIG.CONFIRM_WINDOW_MS = settings.twoPinchComplete ? 3000 : 0;
  CONFIG.DOUBLE_PINCH_MS = settings.doublePinchMs;
  if (Sound.master) Sound.master.gain.value = settings.volume;
}

// All time-based logic reads the clock through these, so the dev
// time-warp button can fast-forward the day for testing.
function nowMs() { return Date.now() + ui.clockOffsetMs; }
function clock() { return new Date(nowMs()); }
function minutesSince(ms) { return (nowMs() - ms) / 60000; }


/* ---------- PERSISTENCE ---------- */
// localStorage can throw (private mode, blocked storage), so every
// access is wrapped. The app still works without it; it just won't save.

function saveProgress() {
  checkAchievements();                 // anything saved might unlock one
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
      // Nested objects need their own merge so newly added stats get defaults.
      player.lifetime = { ...createNewPlayer().lifetime, ...player.lifetime };
      player.equipped = { ...DEFAULT_EQUIPPED, ...player.equipped };
      player.counters = { ...createNewPlayer().counters, ...player.counters };
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
  applyCosmetics();                                // back to the default look
  checkForNewDay();                                // sets today, silently
  announceOpenedQuests(true);
  saveProgress();
  showHome();
}
