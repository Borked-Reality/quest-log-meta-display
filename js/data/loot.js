/* =========================================================
   Quest Log // HUD — Loot table
   Chest rarities, the 40 chest items and what each one does.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- LOOT TABLE ---------- */
// Completing a quest can drop a TREASURE CHEST (Vampire Survivors style):
// it opens, a slot reel spins, and lands on one of these items.
// weight = how likely that rarity is when a chest drops (higher = more common).
const RARITIES = {
  common:   { label: "Common",   weight: 55 },
  uncommon: { label: "Uncommon", weight: 28 },
  rare:     { label: "Rare",     weight: 13 },
  epic:     { label: "Epic",     weight: 4 },
};

// Every item DOES something. Two kinds (an item can have both):
//   buff:    a timed power-up { stat, mult | add, minutes } — or an array
//            of them. stat:
//              "xp" / "gold"  multiplier on quest rewards
//              "step"         multiplier on +1 step XP (water, stretch)
//              "luck"         adds to the chest drop chance
//              "rarity"       rare/epic chests become more likely
//              "combo"        combo window becomes 10 min
//   instant: applied right away { xp, gold, shield, guaranteed }
//            shield = Streak Shield, guaranteed = next N quests drop a chest
// Same item again = its timer restarts. Buffs of one stat don't stack
// (the strongest wins), except luck which adds up.
// (Future store: price by rarity. Future inventory: player.itemsFound.)
const LOOT_TABLE = [
  // ----- Common -----
  { id: "coffee",   icon: "☕", name: "Lukewarm Coffee",        rarity: "common",
    effect: "+25% XP for 15 min",            buff: { stat: "xp", mult: 1.25, minutes: 15 } },
  { id: "change",   icon: "💵", name: "Couch Cushion Change",   rarity: "common",
    effect: "+15 gold",                       instant: { gold: 15 } },
  { id: "todo",     icon: "📜", name: "Crumpled To-Do List",    rarity: "common",
    effect: "+20 XP",                         instant: { xp: 20 } },
  { id: "banana",   icon: "🍌", name: "Emergency Banana",       rarity: "common",
    effect: "+15 XP and +5 gold",            instant: { xp: 15, gold: 5 } },
  { id: "juicebox", icon: "🧃", name: "Juice Box of Hydration", rarity: "common",
    effect: "Water + stretch steps give 2× XP for 30 min", buff: { stat: "step", mult: 2, minutes: 30 } },
  { id: "battery",  icon: "🔋", name: "Half-Charged Battery",   rarity: "common",
    effect: "+25% gold for 20 min",          buff: { stat: "gold", mult: 1.25, minutes: 20 } },
  { id: "cookie",   icon: "🍪", name: "Cookie of Encouragement", rarity: "common",
    effect: "+10% chest chance for 30 min",  buff: { stat: "luck", add: 0.1, minutes: 30 } },

  // ----- Uncommon -----
  { id: "goblin",   icon: "🥤", name: "Goblin Energy Drink",    rarity: "uncommon",
    effect: "+50% XP for 30 min",            buff: { stat: "xp", mult: 1.5, minutes: 30 } },
  { id: "sock",     icon: "🧦", name: "Lucky Sock",             rarity: "uncommon",
    effect: "+25% chest chance for 1 hour",  buff: { stat: "luck", add: 0.25, minutes: 60 } },
  { id: "magnet",   icon: "🧲", name: "Coin Magnet",            rarity: "uncommon",
    effect: "+50% gold for 30 min",          buff: { stat: "gold", mult: 1.5, minutes: 30 } },
  { id: "lofi",     icon: "🎧", name: "Lo-fi Beats to Quest To", rarity: "uncommon",
    effect: "Combos last 10 min for 30 min", buff: { stat: "combo", minutes: 30 } },
  { id: "clover",   icon: "🍀", name: "Four-Leaf Clover",       rarity: "uncommon",
    effect: "Rarer chests for 30 min",       buff: { stat: "rarity", mult: 2, minutes: 30 } },
  { id: "boots",    icon: "🥾", name: "Boots of Errand Running", rarity: "uncommon",
    effect: "+30 XP and +10 gold",           instant: { xp: 30, gold: 10 } },
  { id: "bottle",   icon: "💧", name: "Enchanted Water Bottle", rarity: "uncommon",
    effect: "Water + stretch steps give 2× XP for 2 hours", buff: { stat: "step", mult: 2, minutes: 120 } },

  // ----- Rare -----
  { id: "momentum", icon: "🌀", name: "Scroll of Momentum",     rarity: "rare",
    effect: "Combos last 10 min for 1 hour", buff: { stat: "combo", minutes: 60 } },
  { id: "shield",   icon: "🛡️", name: "Streak Shield",          rarity: "rare",
    effect: "Saves your streak if you miss a day", instant: { shield: 1 } },
  { id: "hoard",    icon: "💰", name: "Dragon's Hoard",          rarity: "rare",
    effect: "+75 gold",                       instant: { gold: 75 } },
  { id: "rabbit",   icon: "🐇", name: "Rabbit's Foot",            rarity: "rare",
    effect: "Much rarer chests for 1 hour",  buff: { stat: "rarity", mult: 3, minutes: 60 } },
  { id: "crystal",  icon: "🔮", name: "Crystal Ball of Productivity", rarity: "rare",
    effect: "+75% XP for 45 min",            buff: { stat: "xp", mult: 1.75, minutes: 45 } },
  { id: "mystery",  icon: "📦", name: "Mystery Box",            rarity: "rare",
    effect: "Your next 2 quests drop a chest", instant: { guaranteed: 2 } },

  // ----- Epic -----
  { id: "crown",    icon: "👑", name: "Crown of the Clean Kitchen", rarity: "epic",
    effect: "2× XP for 1 hour",              buff: { stat: "xp", mult: 2, minutes: 60 } },
  { id: "amulet",   icon: "📿", name: "Amulet of Inbox Zero",   rarity: "epic",
    effect: "2× gold for 1 hour",            buff: { stat: "gold", mult: 2, minutes: 60 } },
  { id: "key",      icon: "🗝️", name: "Golden Chest Key",       rarity: "epic",
    effect: "Your next 3 quests drop a chest", instant: { guaranteed: 3 } },
  { id: "unicorn",  icon: "🦄", name: "Unicorn Frappuccino",    rarity: "epic",
    effect: "2× XP and 2× gold for 30 min",
    buff: [{ stat: "xp", mult: 2, minutes: 30 }, { stat: "gold", mult: 2, minutes: 30 }] },
  { id: "trophy",   icon: "🏆", name: "Golden Toilet Brush",    rarity: "epic",
    effect: "+150 XP. Legendary cleaning.",  instant: { xp: 150 } },
  { id: "phoenix",  icon: "🔥", name: "Phoenix Feather",        rarity: "epic",
    effect: "2 Streak Shields + 50 gold",    instant: { shield: 2, gold: 50 } },

  // ----- The weird stuff (a little scuffed, on purpose) -----
  { id: "potato",   icon: "🥔", name: "Suspicious Potato",      rarity: "common",
    effect: "It's probably just a potato. +5 gold", instant: { gold: 5, gamble: { chance: 0.1, gold: 100, win: "IT WAS A GOLDEN POTATO! +100 ◆" } } },
  { id: "grape",    icon: "🍇", name: "A Single Grape",         rarity: "common",
    effect: "+1 XP. It's a really good grape.", instant: { xp: 1 } },
  { id: "coupon",   icon: "🧾", name: "Expired Coupon",         rarity: "common",
    effect: "50% off nothing. +3 gold",      instant: { gold: 3 } },
  { id: "sandwich", icon: "🥪", name: "Half a Sandwich (Left Half)", rarity: "common",
    effect: "+12 XP and +6 gold",            instant: { xp: 12, gold: 6 } },
  { id: "sushi",    icon: "🍣", name: "Gas Station Sushi",      rarity: "common",
    effect: "+30% XP for 20 min. Probably fine.", buff: { stat: "xp", mult: 1.3, minutes: 20 } },
  { id: "duck",     icon: "🐤", name: "Sentient Rubber Duck",   rarity: "uncommon",
    effect: "+35% XP for 1 hour. It listens.", buff: { stat: "xp", mult: 1.35, minutes: 60 } },
  { id: "toaster",  icon: "🍞", name: "Haunted Toaster",        rarity: "uncommon",
    effect: "+13 gold. It's always 13.", instant: { gold: 13 } },
  { id: "raccoon",  icon: "🦝", name: "Raccoon's Business Card", rarity: "uncommon",
    effect: "+20% gold for 1 hour. He knows a guy.", buff: { stat: "gold", mult: 1.2, minutes: 60 } },
  { id: "saltlamp", icon: "🧂", name: "Salt Lamp of Vibes",     rarity: "uncommon",
    effect: "+25% chest chance for 45 min",  buff: { stat: "luck", add: 0.25, minutes: 45 } },
  { id: "scratch",  icon: "🎰", name: "Cursed Scratch Card",    rarity: "rare",
    effect: "Anywhere from 0 to 300 gold. Scratch it.", instant: { gamble: { min: 0, max: 300 } } },
  { id: "moai",     icon: "🗿", name: "Moai of Motivation",     rarity: "rare",
    effect: "Water + stretch steps give 2× XP for 3 hours", buff: { stat: "step", mult: 2, minutes: 180 } },
  { id: "wizsock",  icon: "🧙", name: "Wizard's Old Sock",     rarity: "rare",
    effect: "Rarer chests for 2 hours. Smells magic.", buff: { stat: "rarity", mult: 2, minutes: 120 } },
  { id: "ufo",      icon: "🛸", name: "Alien Tupperware",       rarity: "epic",
    effect: "Your next 5 quests drop a chest. Don't ask.", instant: { guaranteed: 5 } },
  { id: "cat",      icon: "🐈", name: "Cat That Knocks Things Off Tables", rarity: "epic",
    effect: "+200 gold it found under the couch", instant: { gold: 200 } },
];

// Bonus gold that spills out of every chest, by rarity.
const CHEST_GOLD = { common: 5, uncommon: 10, rare: 20, epic: 40 };
