/* =========================================================
   Quest Log // HUD — Achievements (checking + unlocking)
   Unlocks achievements, pays out rewards, and shows the pop-up.
   The list itself lives in js/data/achievements.js.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- CHECKING + UNLOCKING ---------- */
// checkAchievements() runs inside saveProgress(), so anything that
// changes and saves progress can unlock an achievement. Unlocks are
// shown a moment later (never mid-celebration: they're queued like any
// alert), and several at once become one summary pop-up.

function isUnlocked(achievement) {
  return !!player.achievements[achievement.id];
}

function achievementProgress(achievement) {
  return Math.min(achievement.goal, achievement.progress(player) || 0);
}

function checkAchievements() {
  player.counters.maxGold = Math.max(player.counters.maxGold, player.gold);
  ACHIEVEMENTS.forEach((a) => {
    if (isUnlocked(a) || achievementProgress(a) < a.goal) return;
    player.achievements[a.id] = nowMs();
    if (a.reward.gold) {
      player.gold += a.reward.gold;
      player.lifetime.goldEarned += a.reward.gold;
    }
    if (a.reward.item && !player.unlocks.includes(a.reward.item)) player.unlocks.push(a.reward.item);
    ui.newAchievements.push(a);
  });
  if (ui.newAchievements.length && !ui.achievementTimer) {
    ui.achievementTimer = setTimeout(announceAchievements, 900);
  }
}

// "Gold 100" / "Unlocked: Potato Rain (coin rain)"
function rewardText(achievement) {
  if (achievement.reward.gold) return `+${achievement.reward.gold} ◆`;
  const item = SHOP_ITEMS.find((i) => i.id === achievement.reward.item);
  return item ? `Unlocked: ${item.name} (${SHOP_KIND_LABELS[item.kind].toLowerCase()})` : "";
}

function announceAchievements() {
  ui.achievementTimer = null;
  const list = ui.newAchievements;
  ui.newAchievements = [];
  if (!list.length) return;

  if (list.length > 3) {
    notify({
      kind: "achievement",
      label: `🏆 ${list.length} ACHIEVEMENTS UNLOCKED`,
      title: list.slice(0, 4).map((a) => a.icon).join(" ") + (list.length > 4 ? " …" : ""),
      detail: "See them all on your Profile",
    });
    return;
  }
  list.forEach((a) => {
    notify({
      kind: "achievement",
      label: a.secret ? "🤫 SECRET ACHIEVEMENT" : "🏆 ACHIEVEMENT UNLOCKED",
      title: `${a.icon} ${a.name}`,
      detail: rewardText(a),
      action: a.reward.item ? "equipReward" : undefined,
      rewardItem: a.reward.item,
    });
  });
}


/* ---------- SECRET GESTURES ---------- */

// ↑ ↑ ↓ ↓ ◀ ▶ ◀ ▶ within a few seconds, anywhere. Called for every action.
const KONAMI = ["show", "show", "hide", "hide", "prev", "next", "prev", "next"];

function trackSecretSequence(action) {
  if (!KONAMI.includes(action)) { ui.recentActions = []; return; }
  const now = Date.now();
  ui.recentActions = ui.recentActions.filter((a) => now - a.at < 6000).concat({ action, at: now });
  const last = ui.recentActions.slice(-KONAMI.length).map((a) => a.action);
  if (last.join() === KONAMI.join() && !player.counters.konami) {
    player.counters.konami = 1;
    saveProgress();
  }
}

// Hold a pinch on the "All quests clear" screen: the void... responds.
const VOID_REPLIES = ["…", "…?", "stop that", "it tickles", "OK FINE"];

function pokeTheVoid() {
  ui.voidPokes += 1;
  showToast(VOID_REPLIES[Math.min(ui.voidPokes, VOID_REPLIES.length) - 1]);
  Sound.play("disarm");
  if (ui.voidPokes >= 5 && !player.counters.pokedVoid) {
    player.counters.pokedVoid = 1;
    saveProgress();
  }
}


/* ---------- WHAT A COMPLETED QUEST COUNTS TOWARDS ---------- */
// Called by completeQuest() (js/core/quests.js).
function recordCompletionForAchievements(quest) {
  const c = player.counters;
  c.questCounts[quest.id] = (c.questCounts[quest.id] || 0) + 1;

  const hour = clock().getHours();
  if (hour < 5) c.nightOwl = 1;                          // 🦉 midnight – 5 AM
  else if (hour < 7) c.earlyBird = 1;                    // 🐓 5 – 7 AM

  if (player.equipped.sound === "kazoo") c.kazooQuests += 1;

  // Perfect Day: every daily quest (that you haven't removed) is done today.
  const today = dateKey(clock());
  const dailies = QUESTS.filter((q) => q.type === "daily" && !player.hiddenQuestIds.includes(q.id));
  if (c.lastPerfectDay !== today && dailies.length && dailies.every((q) => q.completed)) {
    c.perfectDays += 1;
    c.lastPerfectDay = today;
  }
}
