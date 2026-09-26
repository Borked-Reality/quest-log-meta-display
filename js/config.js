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
  COMPLETE_SCREEN_MS: 2400,   // how long "QUEST COMPLETE" stays up
  LEVEL_UP_SCREEN_MS: 4000,   // how long the LEVEL UP fanfare stays up
  IDLE_AFTER_MS: 20000,       // no input for this long → idle (0 = never)
  CHECK_EVERY_MS: 60000,      // how often to check for reminders / new day
  SOUND_VOLUME: 0.8,          // master volume, 0 to 1
  COMBO_WINDOW_MS: 180000,    // finish quests within 3 min of each other = combo
  BLING: 1,                   // particle/coin/sparkle amount (0.5 = half, if the glasses stutter)

  // Accident protection (see js/core/quests.js).
  CONFIRM_WINDOW_MS: 3000,    // 2nd pinch must come within this (0 = one pinch completes)
  CONFIRM_MIN_GAP_MS: 250,    // a 2nd pinch faster than this is ignored (misfire)
  UNDO_WINDOW_MS: 5000,       // middle pinch undoes a +1 step for this long

  // Reminders only fire during waking hours (24h clock).
  DAY_START_HOUR: 8,
  DAY_END_HOUR: 21,

  // Movement detection on the glasses (see js/features/motion.js).
  MOTION_JOLT: 2.0,           // m/s² away from gravity that counts as a "jolt"
  MOTION_JOLTS_NEEDED: 20,    // this many jolts in 30s = you're up and moving
};
