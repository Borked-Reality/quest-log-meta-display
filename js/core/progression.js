/* =========================================================
   Quest Log // HUD — Levels + streak
   XP needed per level, RPG titles, and the daily streak.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- LEVELING ---------- */
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


/* ---------- STREAK ---------- */
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
    // A Streak Shield (rare loot) saves it once.
    if (player.streakShields > 0 && player.streak > 0) {
      player.streakShields -= 1;
      player.lastCompletedDate = yesterdayKey();
      saveProgress();
      notify({
        kind: "info",
        label: "🛡️ STREAK SHIELD",
        title: `Streak saved at ${player.streak} days`,
        detail: `${player.streakShields} shield${player.streakShields === 1 ? "" : "s"} left`,
      });
      return;
    }
    player.streak = 0;
  }
}
