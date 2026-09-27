/* =========================================================
   Quest Log // HUD — Config
   Tunable numbers: timings, chances, volumes. Start here to tweak game feel.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- CONFIG ---------- */
// Tweak game feel here without digging through the code.
const CONFIG = {
  SAVE_KEY: "questLogHud.save.v1",
  SETTINGS_KEY: "questLogHud.settings.v1",
  LOOT_DROP_CHANCE: 0.4,      // 40% chance of loot per completed quest
  // How long each reward screen stays up before moving on by itself, per the
  // "Reward screens" setting (a pinch always moves on sooner). "pinch" has
  // no entry: those screens wait for you.
  REWARD_SCREEN_MS: {
    quick:   { complete: 2400, completeThenLevelUp: 1700, levelUp: 4000, chest: 3000, quip: 1400 },
    relaxed: { complete: 4000, completeThenLevelUp: 3000, levelUp: 7000, chest: 6000, quip: 1800 },
  },
  IDLE_AFTER_MS: 20000,       // no input for this long → idle (0 = never)
  CHECK_EVERY_MS: 60000,      // how often to check for reminders / new day
  SOUND_VOLUME: 0.8,          // master volume, 0 to 1
  COMBO_WINDOW_MS: 180000,    // finish quests within 3 min of each other = combo
  BLING: 1,                   // particle/coin/sparkle amount (0.5 = half, if the glasses stutter)

  // Accident protection (see js/core/quests.js).
  CONFIRM_WINDOW_MS: 3000,    // 2nd pinch must come within this (0 = one pinch completes)
  CONFIRM_MIN_GAP_MS: 250,    // a 2nd pinch faster than this is ignored (misfire)
  UNDO_WINDOW_MS: 5000,       // middle pinch undoes a +1 step / a removal for this long
  QUEST_MENU_MS: 4000,        // the hold menu (Edit / Remove) stays open this long

  // Pinch gestures (see the pinch detector in js/ui/input.js).
  DOUBLE_PINCH_MS: 1000,      // 2nd pinch within this = a double pinch (set in Settings)
  DOUBLE_PINCH_MIN_MS: 60,    // faster than this = one pinch reported twice (ignored)
  HOLD_MS: 450,               // pinch held this long = a hold (opens the Edit / Remove menu)
  PINCH_DEDUPE_MS: 250,       // the glasses may report one pinch as both a key and a pointer

  // Reminders only fire during waking hours (24h clock).
  DAY_START_HOUR: 8,
  DAY_END_HOUR: 21,

  // Movement detection on the glasses (see js/features/motion.js).
  MOTION_JOLT: 2.0,           // m/s² away from gravity that counts as a "jolt"
  MOTION_JOLTS_NEEDED: 20,    // this many jolts in 30s = you're up and moving
};
