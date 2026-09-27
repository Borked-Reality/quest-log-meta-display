/* =========================================================
   Quest Log // HUD — Loot table
   Chest rarities, the 64 chest items and what each one does.
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
//   instant: applied right away { xp, gold, shield, guaranteed, gamble }
//            shield = Streak Shield, guaranteed = next N quests drop a chest
//            gamble = random gold: { min, max } (a range) or { chance, gold }
//              (a small chance of a big win). Optional win / lose lines for
//              the result card; "{gold}" in a win line becomes the amount.
//   quip:    optional line the gremlin says when you get it (js/features/gremlin.js)
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
    effect: "It's probably just a potato. +5 gold", instant: { gold: 5, gamble: { chance: 0.1, gold: 100, win: "IT WAS A GOLDEN POTATO! +100 ◆" } },
    quip: "It's a potato. I'm not going to say it again." },
  { id: "grape",    icon: "🍇", name: "A Single Grape",         rarity: "common",
    effect: "+1 XP. It's a really good grape.", instant: { xp: 1 },
    quip: "One grape. Savour it. That's all you get." },
  { id: "coupon",   icon: "🧾", name: "Expired Coupon",         rarity: "common",
    effect: "50% off nothing. +3 gold",      instant: { gold: 3 },
    quip: "It expired in 2009. Like my patience." },
  { id: "sandwich", icon: "🥪", name: "Half a Sandwich (Left Half)", rarity: "common",
    effect: "+12 XP and +6 gold",            instant: { xp: 12, gold: 6 } },
  { id: "sushi",    icon: "🍣", name: "Gas Station Sushi",      rarity: "common",
    effect: "+30% XP for 20 min. Probably fine.", buff: { stat: "xp", mult: 1.3, minutes: 20 } },
  { id: "duck",     icon: "🐤", name: "Sentient Rubber Duck",   rarity: "uncommon",
    effect: "+35% XP for 1 hour. It listens.", buff: { stat: "xp", mult: 1.35, minutes: 60 },
    quip: "It knows what you did." },
  { id: "toaster",  icon: "🍞", name: "Haunted Toaster",        rarity: "uncommon",
    effect: "+13 gold. It's always 13.", instant: { gold: 13 } },
  { id: "raccoon",  icon: "🦝", name: "Raccoon's Business Card", rarity: "uncommon",
    effect: "+20% gold for 1 hour. He knows a guy.", buff: { stat: "gold", mult: 1.2, minutes: 60 },
    quip: "He says you owe him for the last job." },
  { id: "saltlamp", icon: "🧂", name: "Salt Lamp of Vibes",     rarity: "uncommon",
    effect: "+25% chest chance for 45 min",  buff: { stat: "luck", add: 0.25, minutes: 45 } },
  { id: "scratch",  icon: "🎰", name: "Cursed Scratch Card",    rarity: "rare",
    effect: "Anywhere from 0 to 300 gold. Scratch it.", instant: { gamble: { min: 0, max: 300 } } },
  { id: "moai",     icon: "🗿", name: "Moai of Motivation",     rarity: "rare",
    effect: "Water + stretch steps give 2× XP for 3 hours", buff: { stat: "step", mult: 2, minutes: 180 } },
  { id: "wizsock",  icon: "🧙", name: "Wizard's Old Sock",     rarity: "rare",
    effect: "Rarer chests for 2 hours. Smells magic.", buff: { stat: "rarity", mult: 2, minutes: 120 } },
  { id: "ufo",      icon: "🛸", name: "Alien Tupperware",       rarity: "epic",
    effect: "Your next 5 quests drop a chest. Don't ask.", instant: { guaranteed: 5 },
    quip: "It came with instructions. They're screaming." },
  { id: "cat",      icon: "🐈", name: "Cat That Knocks Things Off Tables", rarity: "epic",
    effect: "+200 gold it found under the couch", instant: { gold: 200 },
    quip: "It's staring at your coffee. Move it. Now." },

  // ----- Even weirder stuff (the gremlin found these) -----
  { id: "spoon",     icon: "🥄", name: "Spoon of Destiny",            rarity: "common",
    effect: "+8 XP. Destiny unclear.",       instant: { xp: 8 },
    quip: "It's a spoon. I don't know what you expected." },
  { id: "cheese",    icon: "🧀", name: "Cheese of Unknown Age",       rarity: "common",
    effect: "+4 gold. 20% chance it aged well.",
    instant: { gold: 4, gamble: { chance: 0.2, gold: 60, win: "It aged like fine wine! +60 ◆", lose: "It aged like milk." } } },
  { id: "paperclip", icon: "📎", name: "Paperclip With Ambition",     rarity: "common",
    effect: "+18 XP. It wants to be a stapler.", instant: { xp: 18 },
    quip: "It looks like you're trying to quest. Need help?" },
  { id: "spaghetti", icon: "🍝", name: "Cold Spaghetti at 2 AM",      rarity: "common",
    effect: "+20% gold for 30 min",          buff: { stat: "gold", mult: 1.2, minutes: 30 } },
  { id: "candle",    icon: "🕯️", name: "Candle That Smells Like Tuesday", rarity: "common",
    effect: "+8% chest chance for 30 min",   buff: { stat: "luck", add: 0.08, minutes: 30 } },
  { id: "tooth",     icon: "🦷", name: "Somebody's Tooth",            rarity: "common",
    effect: "+7 gold. Don't think about it.", instant: { gold: 7 },
    quip: "The tooth fairy is going to want that back." },
  { id: "sponge",    icon: "🧽", name: "Sponge That Has Seen Things", rarity: "common",
    effect: "Water + stretch steps give 2× XP for 20 min", buff: { stat: "step", mult: 2, minutes: 20 } },
  { id: "balloon",   icon: "🎈", name: "Deflated Birthday Balloon",   rarity: "common",
    effect: "+10 XP and +2 gold. Happy birthday to someone.", instant: { xp: 10, gold: 2 } },

  { id: "snail",     icon: "🐌", name: "Motivational Snail",          rarity: "uncommon",
    effect: "+40% XP for 90 min. Slow and steady.", buff: { stat: "xp", mult: 1.4, minutes: 90 },
    quip: "Finally, someone who moves at your pace." },
  { id: "kazoo",     icon: "🎺", name: "Kazoo of Minor Authority",    rarity: "uncommon",
    effect: "Combos last 10 min for 20 min", buff: { stat: "combo", minutes: 20 } },
  { id: "swan",      icon: "🦢", name: "Aggressive Swan",             rarity: "uncommon",
    effect: "+25% gold for 45 min. It stole it from someone.", buff: { stat: "gold", mult: 1.25, minutes: 45 },
    quip: "Don't make eye contact with it." },
  { id: "mushroom",  icon: "🍄", name: "Questionable Mushroom",       rarity: "uncommon",
    effect: "+10 XP. 50/50: good mushroom or bad mushroom.",
    instant: { xp: 10, gamble: { chance: 0.5, gold: 45, win: "Good mushroom! +45 ◆", lose: "Bad mushroom. You can hear colours now." } } },
  { id: "cart",      icon: "🛒", name: "Cart With One Bad Wheel",     rarity: "uncommon",
    effect: "Rarer chests for 20 min",       buff: { stat: "rarity", mult: 2, minutes: 20 } },
  { id: "fortune",   icon: "🥠", name: "Empty Fortune Cookie",        rarity: "uncommon",
    effect: "+20% chest chance for 40 min. The fortune was \"no\".", buff: { stat: "luck", add: 0.2, minutes: 40 } },

  { id: "chair",     icon: "🪑", name: "Folding Chair of Wrestling",  rarity: "rare",
    effect: "+100 XP. OH MY GOD.",           instant: { xp: 100 },
    quip: "Please don't hit anyone with that. Yet." },
  { id: "hat",       icon: "🎩", name: "Hat With a Smaller Hat Inside", rarity: "rare",
    effect: "Your next 2 quests drop a chest. Hats all the way down.", instant: { guaranteed: 2 } },
  { id: "evileye",   icon: "🧿", name: "Evil Eye That Blinked",       rarity: "rare",
    effect: "Much rarer chests for 30 min",  buff: { stat: "rarity", mult: 3, minutes: 30 },
    quip: "It blinked. Did you see it blink? It blinked." },
  { id: "vhs",       icon: "📼", name: "VHS Tape Labelled 'DO NOT'",  rarity: "rare",
    effect: "Anywhere from 0 to 250 gold. You're watching it.",
    instant: { gamble: { min: 0, max: 250, win: "It was a treasure map! +{gold} ◆", lose: "Seven days. That's all it said." } } },
  { id: "soup",      icon: "🥫", name: "Soup of the Ancients",        rarity: "rare",
    effect: "+60% XP for 90 min. Best before: yes.", buff: { stat: "xp", mult: 1.6, minutes: 90 } },
  { id: "fish",      icon: "🐟", name: "Legally Binding Fish",        rarity: "rare",
    effect: "Saves your streak if you miss a day", instant: { shield: 1 },
    quip: "Your streak is now protected by fish law." },

  { id: "dragon",    icon: "🐉", name: "Dragon (Small, Unpaid Intern)", rarity: "epic",
    effect: "+40 XP now, 2× gold for 45 min",
    instant: { xp: 40 }, buff: { stat: "gold", mult: 2, minutes: 45 },
    quip: "He's asking about the dental plan again." },
  { id: "brain",     icon: "🧠", name: "Galaxy Brain",                rarity: "epic",
    effect: "2.5× XP for 20 min. Think fast.", buff: { stat: "xp", mult: 2.5, minutes: 20 },
    quip: "Big brain energy. Temporarily." },
  { id: "trex",      icon: "🦖", name: "T. Rex With Tiny Arms",       rarity: "epic",
    effect: "+250 XP. It tried its best.",   instant: { xp: 250 },
    quip: "He can't reach the loot, so you get it." },
  { id: "pocket",    icon: "🌌", name: "Pocket Dimension",            rarity: "epic",
    effect: "Next 4 quests drop a chest, +30% chest chance for 1 hour",
    instant: { guaranteed: 4 }, buff: { stat: "luck", add: 0.3, minutes: 60 },
    quip: "Don't reach in too far. We lost Gary in there." },
];
// Bonus gold that spills out of every chest, by rarity.
const CHEST_GOLD = { common: 5, uncommon: 10, rare: 20, epic: 40 };
