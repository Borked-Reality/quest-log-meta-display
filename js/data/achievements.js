/* =========================================================
   Quest Log // HUD — Achievements
   Every achievement, how progress is measured, and what it rewards.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- ACHIEVEMENTS ---------- */
// Each achievement:
//   id, icon, name, desc
//   goal:     the number to reach
//   progress: (player) => current number (read from saved data)
//   secret:   true = shown as "❓ ???" until unlocked
//   reward:   { gold: 100 } or { item: "shop-item-id" } (an achievement-only
//             cosmetic from js/data/shop-items.js)
// Achievements are checked every time progress is saved
// (checkAchievements in js/features/achievements.js), so progress only
// needs to be recorded somewhere in `player` — most of it already is
// (player.lifetime, player.counters, player.itemsFound...).

const questCount = (p, id) => (p.counters.questCounts[id] || 0);
const epicsFound = (p) => LOOT_TABLE.filter((i) => i.rarity === "epic" && p.itemsFound[i.id]).length;

const ACHIEVEMENTS = [
  // ----- Getting going -----
  { id: "first",      icon: "🌱", name: "First Quest",      desc: "Complete your first quest",
    goal: 1, progress: (p) => p.lifetime.questsCompleted, reward: { gold: 20 } },
  { id: "quests50",   icon: "📜", name: "Adventurer",       desc: "Complete 50 quests",
    goal: 50, progress: (p) => p.lifetime.questsCompleted, reward: { gold: 150 } },
  { id: "quests250",  icon: "🗡️", name: "Veteran",          desc: "Complete 250 quests",
    goal: 250, progress: (p) => p.lifetime.questsCompleted, reward: { gold: 500 } },
  { id: "level10",    icon: "⭐", name: "Double Digits",    desc: "Reach level 10",
    goal: 10, progress: (p) => p.level, reward: { gold: 200 } },
  { id: "level20",    icon: "🌟", name: "Legend in Training", desc: "Reach level 20",
    goal: 20, progress: (p) => p.level, reward: { gold: 500 } },

  // ----- Habits -----
  { id: "hydro",      icon: "💧", name: "Hydro Homie",      desc: "Drink 100 glasses of water",
    goal: 100, progress: (p) => p.counters.glasses, reward: { item: "coin-water" } },
  { id: "limber",     icon: "🧘", name: "Limber",           desc: "Take 50 stretch breaks",
    goal: 50, progress: (p) => p.counters.stretches, reward: { gold: 150 } },
  { id: "grass",      icon: "🌳", name: "Touch Grass",      desc: "Step outside 10 times",
    goal: 10, progress: (p) => questCount(p, "outside"), reward: { gold: 100 } },
  { id: "timelord",   icon: "⏱", name: "Time Lord",        desc: "Finish 10 quest timers",
    goal: 10, progress: (p) => p.counters.timersFinished, reward: { gold: 150 } },
  { id: "scribe",     icon: "🎙️", name: "Scribe",           desc: "Add 10 quests by voice",
    goal: 10, progress: (p) => p.counters.questsAdded, reward: { gold: 100 } },
  { id: "perfect",    icon: "✨", name: "Perfect Day",      desc: "Finish every daily quest in one day",
    goal: 1, progress: (p) => p.counters.perfectDays, reward: { gold: 150 } },

  // ----- Streaks + combos -----
  { id: "streak7",    icon: "🔥", name: "On Fire",          desc: "Reach a 7-day streak",
    goal: 7, progress: (p) => p.lifetime.bestStreak, reward: { gold: 200 } },
  { id: "streak30",   icon: "☄️", name: "Unstoppable",      desc: "Reach a 30-day streak",
    goal: 30, progress: (p) => p.lifetime.bestStreak, reward: { item: "chest-prism" } },
  { id: "login7",     icon: "🎁", name: "Regular",          desc: "Open the daily chest 7 days in a row",
    goal: 7, progress: (p) => p.lifetime.bestLoginStreak, reward: { gold: 150 } },
  { id: "combo5",     icon: "⚡", name: "Combo Breaker",    desc: "Hit a ×5 combo",
    goal: 5, progress: (p) => p.lifetime.bestCombo, reward: { gold: 150 } },

  // ----- Loot + gold -----
  { id: "chests50",   icon: "🧰", name: "Chest Addict",     desc: "Open 50 chests",
    goal: 50, progress: (p) => p.lifetime.chestsOpened, reward: { gold: 250 } },
  { id: "collector",  icon: "📖", name: "Collector",        desc: "Find every item",
    goal: LOOT_TABLE.length, progress: (p) => Object.keys(p.itemsFound).length, reward: { item: "theme-legend" } },
  { id: "epics",      icon: "👑", name: "Epic Collector",   desc: "Find every epic item",
    goal: LOOT_TABLE.filter((i) => i.rarity === "epic").length, progress: (p) => epicsFound(p), reward: { gold: 400 } },
  { id: "loaded",     icon: "💰", name: "Loaded",           desc: "Hold 1,000 gold at once",
    goal: 1000, progress: (p) => p.counters.maxGold, reward: { gold: 100 } },
  { id: "spender",    icon: "🛍️", name: "Big Spender",      desc: "Spend 2,000 gold in the shop",
    goal: 2000, progress: (p) => p.lifetime.goldSpent, reward: { gold: 300 } },
  { id: "shopaholic", icon: "🛒", name: "Shopaholic",       desc: "Buy 5 things in the shop",
    goal: 5, progress: (p) => p.unlocks.filter((id) => (SHOP_ITEMS.find((i) => i.id === id) || {}).price).length,
    reward: { gold: 150 } },

  // ----- Secrets 🤫 -----
  { id: "konami",     icon: "🕹️", name: "Old Habits",       desc: "↑ ↑ ↓ ↓ ◀ ▶ ◀ ▶", secret: true,
    goal: 1, progress: (p) => p.counters.konami, reward: { item: "theme-rainbow" } },
  { id: "void",       icon: "🕳️", name: "Poke the Void",    desc: "Hold a pinch on the empty board 5 times", secret: true,
    goal: 1, progress: (p) => p.counters.pokedVoid, reward: { item: "chest-void" } },
  { id: "potato",     icon: "🥔", name: "Spud Luck",        desc: "Find the golden potato", secret: true,
    goal: 1, progress: (p) => p.counters.goldenPotato, reward: { item: "coin-potato" } },
  { id: "unlucky",    icon: "💀", name: "Figures",          desc: "Scratch exactly 0 gold", secret: true,
    goal: 1, progress: (p) => p.counters.zeroScratch, reward: { item: "coin-skull" } },
  { id: "kazoo",      icon: "🎺", name: "Kazoo Virtuoso",   desc: "Complete 10 quests with the kazoo on", secret: true,
    goal: 10, progress: (p) => p.counters.kazooQuests, reward: { item: "sound-glitch" } },
  { id: "nightowl",   icon: "🦉", name: "Night Owl",        desc: "Complete a quest between midnight and 5 AM", secret: true,
    goal: 1, progress: (p) => p.counters.nightOwl, reward: { item: "theme-midnight" } },
  { id: "earlybird",  icon: "🐓", name: "Early Bird",       desc: "Complete a quest between 5 and 7 AM", secret: true,
    goal: 1, progress: (p) => p.counters.earlyBird, reward: { gold: 100 } },
  { id: "undo",       icon: "↩️", name: "Second Thoughts",  desc: "Undo 5 times", secret: true,
    goal: 5, progress: (p) => p.counters.undos, reward: { gold: 50 } },
  { id: "scuffed",    icon: "📼", name: "Fully Scuffed",    desc: "Scuffed CRT + kazoo + cardboard box, all at once", secret: true,
    goal: 1,
    progress: (p) => (p.equipped.theme === "crt" && p.equipped.sound === "kazoo" && p.equipped.chest === "cardboard" ? 1 : 0),
    reward: { gold: 250 } },
];
