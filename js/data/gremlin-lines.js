/* =========================================================
   Quest Log // HUD — The gremlin's lines
   Everything the sarcastic AI in your glasses says, by moment.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- GREMLIN LINES ---------- */
// The gremlin pokes at you: sarcastic, never actually mean. Keep lines
// short (they must fit two lines on the display, ~70 characters).
// {placeholders} are filled in by quip() in js/features/gremlin.js:
//   {time} clock time, {level} new level, {combo} combo count,
//   {secs} seconds since the quest was added, {late} how late it was
// Item-specific lines live on the items themselves (quip: in js/data/loot.js).
const GREMLIN_LINES = {
  // Quest complete (the most specific that fits wins, see completeQuip())
  complete: [
    "Wow. You did a thing. Alert the media.",
    "Look at you, being a functional adult.",
    "I've updated your file: \"occasionally useful\".",
    "That's one. Only a lifetime to go.",
    "Productivity detected. Suspicious.",
    "Great job. I'm legally required to say that.",
    "The bar was low, but you cleared it.",
    "Your ancestors are mildly impressed.",
    "Adding this to your highlight reel. It's short.",
    "Quest done. The crowd goes mild.",
    "See? That wasn't so hard. Don't answer that.",
    "Somewhere, a to-do list sheds a single tear of joy.",
  ],
  completeLate: [
    "It's {time}. Heroic. Also, go to sleep.",
    "Questing at {time}? The raccoons respect you.",
    "Nothing says \"thriving\" like chores at {time}.",
  ],
  completeEarly: [
    "Before 8 AM? Who hurt you?",
    "Early bird gets the XP. The worm got nothing.",
    "It's {time}. Even the sun isn't this motivated.",
  ],
  completeFast: [
    "Added it and did it in {secs}s. Were you already doing it?",
    "Speedrun any%. I see what you're doing.",
    "Adding quests you already finished? Classic.",
  ],
  completeOverdue: [
    "Only {late} late. Personal best?",
    "Better late than never. Barely.",
    "The deadline called. It says \"finally\".",
  ],
  completeCombo: [
    "Combo ×{combo}. Who even are you right now?",
    "You're on a roll. Please don't make it weird.",
    "×{combo}! Quick, before the motivation wears off.",
  ],

  levelUp: [
    "Level {level}. Your mom would be proud. Probably.",
    "Level {level}. Still no dental plan.",
    "Level {level}! Stats unchanged, ego enlarged.",
    "Level {level}. I'd clap, but I don't have hands.",
    "Ding. Level {level}. The grind never sleeps. You should.",
  ],

  // Chest results by rarity (when the item has no quip of its own)
  chestCommon: [
    "Truly the loot of legends.",
    "Straight into the junk drawer.",
    "It's… something. Technically.",
    "You opened a whole chest for this.",
  ],
  chestUncommon: [
    "Not bad. Not good either. Just \"not bad\".",
    "Mildly useful. Like you on a Monday.",
    "Ooh, uncommon. Tell no one.",
  ],
  chestRare: [
    "A rare! I'll pretend I'm not jealous.",
    "Rare loot. Try not to lose it in the couch.",
    "Okay, fine, that's actually decent.",
  ],
  chestEpic: [
    "EPIC?! Don't let it go to your head.",
    "Epic loot. I'm going to be insufferable about this.",
    "The gremlin council will hear of this.",
  ],

  allClear: [
    "Nothing left? Did you cheat? I'm checking.",
    "All clear. Go touch grass. It's a real quest.",
    "Board's empty. Enjoy it. It won't last.",
    "You finished everything. Now what? Existential dread?",
  ],

  // Alerts (the key is the alert's `gremlin` field)
  water: [
    "Your cells are filing a formal complaint.",
    "You are basically a houseplant. Water yourself.",
    "Even the cactus drinks more than you.",
    "Hydrate. Your brain is 75% water and 25% excuses.",
  ],
  still: [
    "You've become part of the furniture.",
    "Legs still work? Let's find out.",
    "Your chair would like some personal space.",
    "Stand up. Dramatically, if possible.",
  ],
  newDay: [
    "New day, same you. Let's go.",
    "Fresh day. Try not to waste this one.",
    "The quests respawned. So did you, apparently.",
  ],
  questTime: [
    "It's time. You've been dreading this, haven't you?",
    "Now or never. Well, now or later. Please now.",
    "The schedule says now. I just work here.",
  ],
  timesUp: [
    "Timer's done. Please tell me you actually did it.",
    "Time! I'll trust you. Mostly.",
  ],
  newQuest: [
    "A new quest! More work. Yay.",
    "Fresh quest, just for you. Lucky you.",
  ],
  dailyChest: [
    "Free chest for showing up. The bar is on the floor.",
    "You opened the app. Here's a reward. Low standards.",
  ],
  achievement: [
    "Achievement unlocked. I'm contractually impressed.",
    "More digital participation trophies. Nice.",
  ],
  shield: [
    "The shield saved your streak. You're welcome.",
    "Streak rescued. Let's not make this a habit.",
  ],
};
