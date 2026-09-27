/* =========================================================
   Quest Log // HUD — Shop catalogue
   Cosmetics sold in the Shop (themes, fonts, sound packs, chest skins, coin rain).
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- SHOP CATALOGUE (cosmetics bought with gold) ---------- */
// Everything here only changes how the game LOOKS and SOUNDS — never the
// balance. kind decides what it changes; value is what gets applied:
//   theme  → <html data-theme="value">  (colour palettes in style.css)
//   font   → <html data-font="value">   (fonts/ folder + style.css)
//   sound  → SOUND_PACKS[value]         (how every synth voice is played)
//   chest  → chest SVG data-skin        (colours / extra parts in style.css)
//   coin   → the character(s) thrown by the coin fountain (several = a mix)
// price 0 = owned from the start (the defaults).
const SHOP_ITEMS = [
  // ----- Themes -----
  { id: "theme-dracula", kind: "theme", value: "dracula", price: 0,   icon: "🧛", name: "Dracula",      desc: "The classic. Green and mean." },
  { id: "theme-gameboy", kind: "theme", value: "gameboy", price: 150, icon: "📟", name: "Pocket Brick", desc: "Four shades of pea soup" },
  { id: "theme-arctic",  kind: "theme", value: "arctic",  price: 200, icon: "❄️", name: "Arctic",       desc: "Cool. Very cool." },
  { id: "theme-vapor",   kind: "theme", value: "vapor",   price: 250, icon: "🌴", name: "Vaporwave",    desc: "A E S T H E T I C" },
  { id: "theme-ember",   kind: "theme", value: "ember",   price: 250, icon: "🌋", name: "Ember",        desc: "Everything is on fire (it's fine)" },
  { id: "theme-gold",    kind: "theme", value: "gold",    price: 400, icon: "🏅", name: "Gold Rush",    desc: "Flex on absolutely no one" },
  { id: "theme-crt",     kind: "theme", value: "crt",     price: 500, icon: "📺", name: "Scuffed CRT",  desc: "Scanlines. Flicker. Vibes." },
  { id: "theme-bubblegum", kind: "theme", value: "bubblegum", price: 200, icon: "🍬", name: "Bubblegum", desc: "Pink, minty, slightly sticky" },
  { id: "theme-matcha",    kind: "theme", value: "matcha",    price: 200, icon: "🍵", name: "Matcha",    desc: "Calm. Earthy. Overpriced." },
  { id: "theme-deepsea",   kind: "theme", value: "deepsea",   price: 250, icon: "🐙", name: "Deep Sea",  desc: "Bioluminescent and a bit damp" },
  { id: "theme-sunset",    kind: "theme", value: "sunset",    price: 300, icon: "🌅", name: "Sunset",    desc: "Golden hour, all day long" },
  { id: "theme-spectral",  kind: "theme", value: "spectral",  price: 350, icon: "👻", name: "Spectral",  desc: "Pale, faint, and watching" },

  // ----- Fonts -----
  { id: "font-system",   kind: "font", value: "system",   price: 0,   icon: "🔤", name: "Clean",    desc: "Sensible. Readable. Boring." },
  { id: "font-terminal", kind: "font", value: "terminal", price: 200, icon: "💾", name: "Terminal", desc: "I'm in." },
  { id: "font-marker",   kind: "font", value: "marker",   price: 200, icon: "🖍️", name: "Sharpie",  desc: "Written on the fridge" },
  { id: "font-loud",     kind: "font", value: "loud",     price: 250, icon: "📢", name: "LOUD",     desc: "EVERY WORD IS YELLING" },
  { id: "font-pixel",    kind: "font", value: "pixel",    price: 300, icon: "👾", name: "Pixel",    desc: "Straight out of 1987" },
  { id: "font-glitch",   kind: "font", value: "glitch",   price: 450, icon: "👁️", name: "Glitch",   desc: "Something is wrong with it" },
  { id: "font-comic",    kind: "font", value: "comic",    price: 150, icon: "🤡", name: "Comic Neue", desc: "Legally distinct from you-know-what" },
  { id: "font-bangers",  kind: "font", value: "bangers",  price: 250, icon: "💥", name: "Comic Boom", desc: "KAPOW! Quest complete!" },
  { id: "font-scifi",    kind: "font", value: "scifi",    price: 300, icon: "🚀", name: "Sci-Fi",     desc: "Mission log, stardate today" },
  { id: "font-spooky",   kind: "font", value: "spooky",   price: 350, icon: "🕸️", name: "Spooky",     desc: "Drips a little. Don't ask." },

  // ----- Sound packs -----
  { id: "sound-synth",   kind: "sound", value: "synth",   price: 0,   icon: "🎹", name: "Synth",         desc: "The original sound" },
  { id: "sound-chip",    kind: "sound", value: "chip",    price: 300, icon: "🕹️", name: "8-Bit",         desc: "Pure square waves. No reverb." },
  { id: "sound-kazoo",   kind: "sound", value: "kazoo",   price: 350, icon: "🎺", name: "Scuffed Kazoo", desc: "Every reward, but a kazoo" },
  { id: "sound-bells",   kind: "sound", value: "bells",   price: 400, icon: "🔔", name: "Crystal Bells", desc: "Sparkly, high and huge" },
  { id: "sound-deep",    kind: "sound", value: "deep",    price: 500, icon: "🍟", name: "Deep Fried",    desc: "An octave down. Crunchy." },
  { id: "sound-lofi",     kind: "sound", value: "lofi",     price: 300, icon: "📼", name: "Lo-Fi Tape",  desc: "Beats to do quests to" },
  { id: "sound-chipmunk", kind: "sound", value: "chipmunk", price: 350, icon: "🐿️", name: "Chipmunk",    desc: "Tiny. Fast. Excited." },
  { id: "sound-water",    kind: "sound", value: "water",    price: 400, icon: "🫧", name: "Underwater",  desc: "Blub blub, level up" },
  { id: "sound-theremin", kind: "sound", value: "theremin", price: 450, icon: "🛸", name: "Theremin",    desc: "Wooooo-OOOOooo" },

  // ----- Chest skins -----
  { id: "chest-wood",      kind: "chest", value: "wood",      price: 0,   icon: "🧰", name: "Wooden Chest",        desc: "Honest. Sturdy. Brown." },
  { id: "chest-cardboard", kind: "chest", value: "cardboard", price: 200, icon: "📦", name: "Soggy Cardboard Box", desc: "Held together by tape and hope" },
  { id: "chest-gold",      kind: "chest", value: "gold",      price: 600, icon: "👑", name: "Golden Chest",        desc: "Now we're talking" },
  { id: "chest-mimic",     kind: "chest", value: "mimic",     price: 750, icon: "👅", name: "Mimic",               desc: "It has teeth. It's fine." },
  { id: "chest-crystal",   kind: "chest", value: "crystal",   price: 900, icon: "💎", name: "Crystal Chest",       desc: "Rarest-looking box in town" },
  { id: "chest-bone",      kind: "chest", value: "bone",      price: 300, icon: "🦴", name: "Bone Chest",          desc: "Previous owner didn't make it" },
  { id: "chest-candy",     kind: "chest", value: "candy",     price: 350, icon: "🍭", name: "Candy Chest",         desc: "Do not lick the loot" },
  { id: "chest-slime",     kind: "chest", value: "slime",     price: 450, icon: "🟢", name: "Slime Chest",         desc: "It's squishy. Why is it squishy." },
  { id: "chest-lava",      kind: "chest", value: "lava",      price: 650, icon: "🌋", name: "Lava Chest",          desc: "Handle with oven mitts" },
  { id: "chest-neon",      kind: "chest", value: "neon",      price: 800, icon: "💾", name: "Neon Chest",          desc: "Just the outline. Very cyber." },

  // ----- Coin rain (what the coin fountain throws) -----
  { id: "coin-gem",   kind: "coin", value: "◆",  price: 0,   icon: "◆",  name: "Gold Gems",    desc: "Classic sparkly gems" },
  { id: "coin-star",  kind: "coin", value: "★",  price: 100, icon: "★",  name: "Stars",        desc: "Twinkle twinkle" },
  { id: "coin-pizza", kind: "coin", value: "🍕", price: 150, icon: "🍕", name: "Pizza Rain",   desc: "It's raining slices" },
  { id: "coin-duck",  kind: "coin", value: "🦆", price: 200, icon: "🦆", name: "Duck Storm",   desc: "Quack" },
  { id: "coin-frog",  kind: "coin", value: "🐸", price: 200, icon: "🐸", name: "Frog Fountain", desc: "Ribbit ribbit" },
  { id: "coin-money", kind: "coin", value: "💸", price: 500, icon: "💸", name: "Make It Rain", desc: "Cash money" },
  { id: "coin-notes", kind: "coin", value: "♪♫", price: 150, icon: "♫",  name: "Mixtape",       desc: "Your gold, but make it music" },
  { id: "coin-donut", kind: "coin", value: "🍩", price: 150, icon: "🍩", name: "Donut Shower",  desc: "Glazed and confused" },
  { id: "coin-taco",  kind: "coin", value: "🌮", price: 200, icon: "🌮", name: "Taco Tuesday",  desc: "Every day is Tuesday now" },
  { id: "coin-bee",   kind: "coin", value: "🐝", price: 250, icon: "🐝", name: "Not The Bees",  desc: "NOT THE BEES" },
  { id: "coin-pets",  kind: "coin", value: "🐱🐶", price: 300, icon: "🐱", name: "Cats & Dogs", desc: "It's raining. Literally." },

  // ----- Achievement-only (price: null) — can't be bought, only earned -----
  // `achievement` is the id in js/data/achievements.js that unlocks it.
  { id: "theme-rainbow",  kind: "theme", value: "rainbow",  price: null, achievement: "konami",    icon: "🌈", name: "Rainbow Road",    desc: "Every colour, forever" },
  { id: "theme-midnight", kind: "theme", value: "midnight", price: null, achievement: "nightowl",  icon: "🌙", name: "Midnight",        desc: "For the night owls" },
  { id: "theme-legend",   kind: "theme", value: "legend",   price: null, achievement: "collector", icon: "🏆", name: "Legendary",       desc: "Gold and royal purple" },
  { id: "sound-glitch",   kind: "sound", value: "glitch",   price: null, achievement: "kazoo",     icon: "📟", name: "Glitched",        desc: "Every note slightly wrong" },
  { id: "chest-void",     kind: "chest", value: "void",     price: null, achievement: "void",      icon: "🕳️", name: "Void Chest",      desc: "It stares back" },
  { id: "chest-prism",    kind: "chest", value: "prism",    price: null, achievement: "streak30",  icon: "🔮", name: "Prismatic Chest", desc: "Thirty days of glory" },
  { id: "coin-water",     kind: "coin",  value: "💧",       price: null, achievement: "hydro",     icon: "💧", name: "Hydration",       desc: "Stay hydrated" },
  { id: "coin-potato",    kind: "coin",  value: "🥔",       price: null, achievement: "potato",    icon: "🥔", name: "Potato Rain",     desc: "Spud luck" },
  { id: "coin-skull",     kind: "coin",  value: "💀",       price: null, achievement: "unlucky",   icon: "💀", name: "Bad Luck",        desc: "Nothing. Figures." },
];

const SHOP_KIND_LABELS = { theme: "THEME", font: "FONT", sound: "SOUND PACK", chest: "CHEST SKIN", coin: "COIN RAIN" };

// The Shop opens on these cards, one per kind. Pinch one to browse just
// that kind (so you never scroll through everything).
const SHOP_CATEGORIES = [
  { kind: "theme", icon: "🎨", name: "Themes" },
  { kind: "font",  icon: "🔤", name: "Fonts" },
  { kind: "sound", icon: "🎵", name: "Sound Packs" },
  { kind: "chest", icon: "🧰", name: "Chest Skins" },
  { kind: "coin",  icon: "◆",  name: "Coin Rain" },
];

// What you start with equipped.
const DEFAULT_EQUIPPED = { theme: "dracula", font: "system", sound: "synth", chest: "wood", coin: "◆" };

// How each sound pack changes every synth note (see Sound.voice):
//   wave       force this waveform          transpose  semitones up/down
//   cutoff     max lowpass (Hz), softer     reverb     × the normal reverb
//   vibrato    wobble depth in cents        rate       wobbles per second
//   vol        × volume (square/saw are louder than sine)
//   jitter     random pitch wobble per note, in semitones (Glitched)
const SOUND_PACKS = {
  synth: {},
  chip:  { wave: "square", reverb: 0, vol: 0.85 },
  kazoo: { wave: "sawtooth", cutoff: 1900, vibrato: 35, rate: 6.5, vol: 0.9, reverb: 0.3 },
  bells: { wave: "sine", transpose: 12, reverb: 2.4, vol: 1.1 },
  deep:  { wave: "sawtooth", transpose: -12, cutoff: 1100, vol: 0.85 },
  lofi:     { wave: "triangle", cutoff: 1300, vibrato: 12, rate: 0.7, reverb: 0.4, vol: 1.05 },  // slow tape wobble
  chipmunk: { wave: "triangle", transpose: 12, vibrato: 25, rate: 11, reverb: 0.2 },
  water:    { wave: "sine", cutoff: 700, vibrato: 30, rate: 2.5, reverb: 1.8, vol: 1.2 },
  theremin: { wave: "sine", vibrato: 70, rate: 5.5, reverb: 2, vol: 1.1 },
  // Achievement-only. jitter = random detune per note, in semitones.
  glitch: { wave: "square", jitter: 1.5, reverb: 0.5, vol: 0.8 },
};
