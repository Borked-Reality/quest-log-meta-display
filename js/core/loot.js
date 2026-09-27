/* =========================================================
   Quest Log // HUD — Loot + power-ups
   Rolling chests, applying items, and active power-up (buff) maths.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- LOOT GENERATION ---------- */

// Picks a rarity key using the weights in RARITIES.
// A "rarity" power-up (Clover, Rabbit's Foot) multiplies the rare and
// epic weights.
// minTier: 0 = any, 1 = at least uncommon … 3 = epic (daily login chest).
function rollRarity(minTier = 0) {
  const boost = buffMult("rarity");
  const entries = Object.entries(RARITIES).filter((_, tier) => tier >= minTier).map(([key, r]) =>
    [key, key === "rare" || key === "epic" ? r.weight * boost : r.weight]);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll < 0) return key;
  }
  return "common";
}

// Returns a loot item, or null if nothing dropped.
function rollForLoot() {
  // Golden Chest Key: the next few quests always drop a chest.
  if (player.guaranteedDrops > 0) {
    player.guaranteedDrops -= 1;
  } else if (Math.random() >= chestChance()) {
    return null;
  }
  const rarity = rollRarity();
  const pool = LOOT_TABLE.filter((item) => item.rarity === rarity);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ----- Buffs (timed power-ups from loot) -----

function activeBuffs() {
  return player.buffs.filter((b) => b.endsAt > nowMs());
}

// XP / gold multiplier from the strongest active buff (1 = none).
function buffMult(stat) {
  return Math.max(1, ...activeBuffs().filter((b) => b.stat === stat).map((b) => b.mult));
}

function chestChance() {
  const luck = activeBuffs().filter((b) => b.stat === "luck").reduce((sum, b) => sum + b.add, 0);
  return Math.min(0.95, CONFIG.LOOT_DROP_CHANCE + luck);
}

function comboWindowMs() {
  return activeBuffs().some((b) => b.stat === "combo") ? 10 * 60000 : CONFIG.COMBO_WINDOW_MS;
}

// Opens a chest: applies the item + bonus gold. Returns what the chest
// screen needs to show. (Applied now, so skipping the animation is safe.)
function openChest(item) {
  let note = "";        // extra line on the result card (gamble outcomes)
  let noteGold = 0;
  if (item.buff) {
    const buffs = Array.isArray(item.buff) ? item.buff : [item.buff];
    player.buffs = player.buffs.filter((b) => b.endsAt > nowMs() && b.id !== item.id);
    buffs.forEach((buff) => {
      player.buffs.push({ id: item.id, icon: item.icon, ...buff, endsAt: nowMs() + buff.minutes * 60000 });
    });
  }
  if (item.instant) {
    const { xp, gold, shield, guaranteed, gamble } = item.instant;
    if (xp) { addXp(xp); player.lifetime.xpEarned += xp; }
    if (gold) { player.gold += gold; player.lifetime.goldEarned += gold; }
    if (shield) player.streakShields += shield;
    if (guaranteed) player.guaranteedDrops += guaranteed;
    // Gamble items: a random gold range, or a small chance of a big win.
    if (gamble) {
      let won = 0;
      if (gamble.max !== undefined) won = gamble.min + Math.floor(Math.random() * (gamble.max - gamble.min + 1));
      else if (Math.random() < gamble.chance) won = gamble.gold;
      if (won) { player.gold += won; player.lifetime.goldEarned += won; }
      note = gamble.max !== undefined
        ? (won ? `You scratched ${won} ◆!` : "Nothing. Figures.")
        : (won ? gamble.win : "");
      noteGold = won;
      if (item.id === "potato" && won) player.counters.goldenPotato = 1;   // secret achievements
      if (item.id === "scratch" && !won) player.counters.zeroScratch = 1;
    }
  }
  const gold = CHEST_GOLD[item.rarity];
  player.gold += gold;

  // Collection + stats (for the future inventory / stats screens)
  const isNew = !player.itemsFound[item.id];
  player.itemsFound[item.id] = (player.itemsFound[item.id] || 0) + 1;
  player.lifetime.chestsOpened += 1;
  player.lifetime.goldEarned += gold;

  return { item, gold, isNew, note, noteGold };
}
