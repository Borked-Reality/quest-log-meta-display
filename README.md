# Quest Log // HUD

A glanceable RPG quest log for the **Meta Ray-Ban Display** glasses. Real-life
tasks become quests with XP, levels, gold, loot, streaks, and satisfying
feedback. It's the wearable spin-off of the Quest Log VR app. It's meant as a
light, heads-up companion, not the full VR experience.

It's a plain **HTML + CSS + JavaScript** web app with no frameworks, no build
step, no npm, and no backend. It's designed for the glasses' **600×600** display
and **Meta Neural Band** gestures.

---

## Run it

**On your computer:** open `index.html` in Chrome (double-click it). That's it.

The page shows the 600×600 HUD as the glasses would, plus a test panel
underneath (hidden on the glasses).

**On the glasses:** Meta's *Web Apps* platform (Developer Preview) runs a web
app from a URL.

1. Host these files anywhere that serves static files over HTTPS.
2. Open the URL on the glasses. See Meta's
   [Web Apps docs](https://wearables.developer.meta.com/docs/develop/webapps)
   and [starter kit](https://github.com/facebookincubator/meta-wearables-webapp)
   for developer mode and sharing.

> **Tested on a Meta Ray-Ban Display with the Neural Band** (September 2026).
> The desktop version in Chrome simulates the Band with the keyboard, so it
> behaves the same way.

---

## Controls

The Neural Band sends its gestures to the page as keyboard keys, so the
keyboard *is* the simulator.

| Neural Band | Key | What it does |
|---|---|---|
| Thumb swipe ◀ ▶ | `←` `→` | Browse quests (or settings / quest type) |
| Thumb swipe ▲ | `↑` | Show the HUD → Add Quest → Settings |
| Thumb swipe ▼ | `↓` | Go back a level; on the quest board, hide the HUD |
| Index pinch | `Enter` | The action shown on the hint bar (Continue, Speak, Buy…). On the quest board: **double** pinch = main action, **hold** = Edit / Remove |
| Middle pinch | `Esc` | Back: cancel, undo, stop a timer, dismiss an alert |

The bottom hint bar always shows what each gesture does on the current screen.

**Screens stack vertically:** `Quest board ▲ Add Quest ▲ Shop ▲ Profile ▲ Settings`.

**On the quest board:**

| Gesture | Does |
|---|---|
| **Double pinch** | The main action: ✓ Complete · +1 Glass · ▶ Start / ⏸ Pause timer |
| **Pinch and hold** (~½ s) | Menu: ✎ **Edit** (say it again) · ✕ **Remove** |
| Single pinch | Nothing (shows "Again!"), so a stray pinch can't do anything |

- **In the hold menu:** ◀ ▶ picks, pinch does it, and middle pinch cancels.
  It also closes itself after 4 seconds.
- **Removing has a 5-second undo** (middle pinch). Built-in quests you
  remove can be brought back in Settings.
- **You get 1 second for the second pinch.** Change it in Settings →
  Double-pinch time (0.6 s to 1.3 s).
- **The "One pinch" setting** makes a single pinch do the main action.
- **On desktop,** hold Enter (or hold the mouse down on the HUD) to hold.

### Desktop-only test keys

| Key | Button | Does |
|---|---|---|
| `N` | + QUEST | Simulates a quest arriving from outside |
| `T` | +1 HR | Moves the app clock forward an hour (tests reminders, schedules, timers, midnight reset) |
| `P` | ♪ TEST | Plays each sound in turn |
| `M` | ♪ SOUND | Sound on/off |
| — | RESET | Wipes progress |

---

## Features

- **Quest board.** Daily quests (reset every morning) and one-off main and
  side quests. Some dailies only appear at certain times ("Make your bed"
  5am–12pm, "Plan tomorrow" 6pm–midnight).
- **Counter quests.** "Drink water 3/8" and "Stretch breaks 1/4". Each
  double pinch logs one step, and the pitch rises as you progress. A middle
  pinch undoes the last step for 5 seconds.
- **Rewards.** XP, gold, level-ups with their own fanfare screen, RPG titles
  (Novice → Apprentice → … → Mythic), bonus gold per level, combos, and a
  daily streak.
- **Treasure chests** (Vampire Survivors style, deliberately over the top).
  Completing a quest can drop a chest.
  - **The sequence:** the chest slams down (screen shake), rattles twice as
    light rays spin up, then bursts open with a white flash, a shockwave, a
    fan of rarity-coloured beams and an explosion of coins. A slot reel with
    chase lights spins to chiptune music while coins fountain up, then lands
    with fireworks and a "NICE!" / "BIG WIN!" / rainbow **"JACKPOT!!"** plus
    payout bells.
  - **The prize:** it bounces in with a spinning halo, sparkles, and a
    **NEW!** sticker the first time you find it.
  - It can't be skipped with a pinch. Enjoy the show. (A swipe down still
    escapes if you really need the HUD gone.)

  There are **40 items**, from sensible to deeply scuffed (Suspicious Potato,
  Gas Station Sushi, Haunted Toaster, Cursed Scratch Card, Alien
  Tupperware…), and every one really does something:
  - Timed power-ups: more XP (☕ 🥤 🔮 👑), more gold (🔋 🧲 📿), double XP
    on water/stretch steps (🧃 💧), better chest odds (🍪 🧦), rarer chests
    (🍀 🐇), longer combos (🎧 🌀), or several at once (🦄).
  - 🛡️ / 🔥 Streak Shields: save your streak if you miss a day.
  - 🗝️ / 📦 Chest Keys: your next quests always drop a chest.
  - Instant gold or XP (💵 📜 🍌 🥾 💰 🏆).
  - Gambles: 🎰 scratch card (0–300 gold), 🥔 potato (probably just a
    potato).

  Active power-ups show as chips by the XP bar ("☕ 12m").
- **Daily login chest.** The first time you open the app each day, a free
  chest is waiting ("🎁 DAILY CHEST · Day 3"). It gets better with
  consecutive days:
  - Day 3+: at least Uncommon.
  - Day 5+: at least Rare.
  - Every 7th day: a guaranteed **EPIC**.
- **Profile.** Three sections:
  - **Stats:** quests, XP, gold earned and spent, chests, best streak and
    combo, login streak.
  - **Achievements:** a trophy grid with progress bars.
  - **Collection:** all 40 chest items. Unfound ones are ❓, and ◀ ▶
    inspects each one.
- **Achievements (30, some secret 🤫).**
  - **Unlocking:** they unlock automatically, with a gold pop-up and a
    fanfare. Several at once become one summary.
  - **Rewards:** gold, or **achievement-only cosmetics** you can't buy
    (themes, chest skins, a sound pack, coin rains). The Shop shows those as
    🔒 EARN IT, and you can still preview them.
  - **Secrets** show as ❓ until you find them. The full list, spoilers
    included, is in `js/data/achievements.js`.
- **Add quests by voice.** Pinch the Add Quest box and the glasses' built-in
  voice/handwriting composer opens. It understands phrases like:
  - "remind me to call mom at 3pm"
  - "daily: take meds at 8am"
  - "important: pay rent tomorrow"
  - "stretch for 10 minutes"

  You confirm on a preview card before the quest is added.
- **Clock, timers, schedules.**
  - The header shows the time and date.
  - Quests with a duration ("15-min walk") get a start/pause/stop countdown.
  - Scheduled quests pop a "QUEST TIME" alert when due and show red when overdue.
- **Reminders.**
  - Hydration: paced across your waking day.
  - Stretch: fires if you've been still too long. It uses the glasses' motion
    sensor, or a timer on desktop.
- **Idle mode.** After 20 seconds, or on a swipe down, the HUD fades to a
  one-line glance. Black is see-through on the display. Notifications wake it.
- **Shop.** Spend gold on cosmetics. Each one previews live on the whole HUD
  while you browse it (try before you buy). Buying takes two pinches.
  - **Themes:** Pocket Brick, Arctic, Vaporwave, Ember, Gold Rush, Scuffed CRT
    (with scanlines).
  - **Fonts:** Terminal, Sharpie, LOUD, Pixel, Glitch.
  - **Sound packs** that change every sound: 8-Bit, Scuffed Kazoo, Crystal
    Bells, Deep Fried.
  - **Chest skins:** Soggy Cardboard Box, Golden, Mimic (with teeth), Crystal.
  - **Coin rain:** stars, pizza, ducks, frogs, cash.
- **Settings on the glasses.** Sound, volume, 12/24h clock, one or two pinches
  to complete, auto-hide delay, reminders, timers, and reset.
- **Sound.** A small synth built on the Web Audio API with no audio files.
  Rewards are layered and escalate; reminders are deliberately plain.
- **Saves automatically** in the browser (`localStorage`).

---

## Files

```
index.html   The HUD: every screen, the hint bar, and the desktop test panel
style.css    All visuals: theme colors (top of file), layout, animations
js/          All logic, as small plain scripts grouped by job:
  config.js      tunable numbers (timings, chances, volume)
  data/          content: quests, chest items, shop items
  core/          game rules: state + saving, XP/levels, loot, quests, alerts
  features/      add quest, settings, shop, clock/timers, daily reset, idle
  sound/         the synth engine + every sound recipe
  ui/            drawing screens, reward celebrations, effects, gestures
  main.js        start-up (runs last)
AGENTS.md    Guide for AI coding assistants (architecture, rules, gotchas)
CLAUDE.md    Points Claude Code at AGENTS.md
ROADMAP.md   What's next, known limits, ideas
tests/       Automated tests: node tests/run.mjs
fonts/       Bundled shop fonts (.woff2) + their open licences
```

### Common tweaks

| Want to… | Edit |
|---|---|
| Add/change daily quests | `js/data/quests.js` (the field meanings are documented at the top) |
| Change chest items / odds | `js/data/loot.js` |
| Add or change achievements | `js/data/achievements.js` (+ a reward item in `js/data/shop-items.js`) |
| Add or change shop items | `js/data/shop-items.js` + the matching CSS in the *Cosmetics* part of `style.css` |
| Tone down the chest effects | `CONFIG.BLING` (1 = full, 0.5 = half) |
| Change level titles | `LEVEL_TITLES` in `js/core/progression.js` |
| Tune timings, combo window, waking hours | `js/config.js` |
| Change a sound | Its recipe in `js/sound/sounds.js`; press `P` to hear it |
| Change colors | CSS variables at the top of `style.css` |

---

## Hooks for integrations

The app exposes a small API on `window.QuestLog`, ready for a phone
companion, API sync, a homelab server, or an AI quest generator:

```js
QuestLog.addFromText("call mom tomorrow at 9am");                // parse + add + announce
QuestLog.receiveQuest({ title: "Feed the cat", type: "main", xp: 30, gold: 6 });
QuestLog.notify({ kind: "warning", label: "STREAK AT RISK", title: "Finish 1 quest today" });
QuestLog.handleAction("next");                                   // drive it like a gesture
QuestLog.player();                                               // current save data
```

---

## Tests

```
node tests/run.mjs                 # everything, ~2 minutes
node tests/run.mjs chest shop      # just these suites
node tests/run.mjs --shots         # also save screenshots to tests/screenshots/
```

What you need:
- **Node 22+ and Chrome (or Edge).** Nothing is installed from npm. Set
  `CHROME_PATH` if Chrome isn't found.

What it does:
- **Loads the real `index.html`** in a hidden browser.
- **Presses real keys,** the same as the Neural Band.
- **Checks:** navigation, the quest menu, voice parsing, timers, schedules,
  chests, the daily chest, the shop, the profile, that nothing overflows in
  any font, and that every sound renders cleanly.

It exits with an error if anything fails, so it's worth running before every
commit.

## Status

This is a working prototype, running on the Meta Ray-Ban Display. See
[ROADMAP.md](ROADMAP.md) for what's planned and the known platform limits
(e.g. a web app can't turn the display back on by itself).
