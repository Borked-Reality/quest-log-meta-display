/* =========================================================
   Quest Log // HUD — Daily login chest
   A free treasure chest the first time you open the app each day.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- DAILY CHEST ---------- */
// First open of the day → "🎁 DAILY CHEST · Day 3 login reward" alert.
// Pinch opens it (the full chest show). Opening on consecutive days
// builds a login streak, and the chest gets better:
//   day 1–2  normal chest       day 3+  at least Uncommon
//   day 5+   at least Rare      every 7th day  guaranteed EPIC
// It waits for a pinch on purpose: anticipation, and browsers only play
// sound after the wearer has touched something.
// Dismissed (middle pinch)? It's offered again next time the app opens.

function dailyChestReady() {
  return player.lastDailyChest !== dateKey(clock());
}

// Which login day today's chest would be.
function nextLoginDay() {
  return player.lastDailyChest === yesterdayKey() ? player.loginStreak + 1 : 1;
}

// Minimum rarity tier (0 common … 3 epic) for a login day.
function minTierForDay(day) {
  if (day % 7 === 0) return 3;
  if (day >= 5) return 2;
  if (day >= 3) return 1;
  return 0;
}

function dailyChestHint(day) {
  if (day % 7 === 0) return "Guaranteed EPIC today!";
  const left = 7 - (day % 7);
  return `${left} more day${left === 1 ? "" : "s"} to a guaranteed EPIC`;
}

// Called on start-up, when the display comes back on, and on a new day.
function offerDailyChest() {
  if (!dailyChestReady()) return;
  const pending = ui.alertQueue.concat(ui.currentAlert || []).some((a) => a.action === "dailyChest");
  if (pending) return;
  const day = nextLoginDay();
  notify({
    kind: "gift",
    label: "🎁 DAILY CHEST",
    title: `Day ${day} login reward`,
    detail: dailyChestHint(day),
    action: "dailyChest",
  });
}

// Pinch on the alert: roll (with the streak's minimum rarity) and open it.
function openDailyChest() {
  if (!dailyChestReady()) { showHome(); return; }

  const day = nextLoginDay();
  player.loginStreak = day;
  player.lastDailyChest = dateKey(clock());
  player.lifetime.bestLoginStreak = Math.max(player.lifetime.bestLoginStreak, day);

  const levelBefore = player.level;
  const rarity = rollRarity(minTierForDay(day));
  const pool = LOOT_TABLE.filter((item) => item.rarity === rarity);
  const item = pool[Math.floor(Math.random() * pool.length)];
  const chest = openChest(item);
  chest.title = `🎁 DAILY CHEST · DAY ${day}`;

  // Same "don't spoil it" rule as quest chests (see completeQuest).
  ui.pendingReveal = { gold: chest.gold + chest.noteGold + ((item.instant && item.instant.gold) || 0) };
  const levelUp = applyLevelUpRewards(levelBefore);

  ui.rewardQueue = [() => showChestScreen(chest)];
  if (levelUp) ui.rewardQueue.push(() => showLevelUpScreen(levelUp));
  ui.moveOnAfterRewards = false;
  saveProgress();
  advanceFromRewards();
}
