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

> Nothing here has been tested on real glasses yet. Everything has been tested
> in desktop Chrome, which simulates the Neural Band with the keyboard.

---

## Controls

The Neural Band sends its gestures to the page as keyboard keys, so the
keyboard *is* the simulator.

| Neural Band | Key | What it does |
|---|---|---|
| Thumb swipe ◀ ▶ | `←` `→` | Browse quests (or settings / quest type) |
| Thumb swipe ▲ | `↑` | Show the HUD → Add Quest → Settings |
| Thumb swipe ▼ | `↓` | Go back a level; on the quest board, hide the HUD |
| Index pinch | `Enter` | The action shown on the hint bar (Complete, +1 Glass, Start timer, Speak…) |
| Middle pinch | `Esc` | Back: cancel, undo, stop a timer, dismiss an alert |

The bottom hint bar always shows what each gesture does on the current screen.

**Screens stack vertically:** `Quest board ▲ Add Quest ▲ Settings`.

**Completing a quest takes two pinches.** The first pinch arms it and a gold
bar counts down. The second pinch completes it. This prevents accidents, and
you can switch it off in Settings.

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
- **Counter quests.** "Drink water 3/8" and "Stretch breaks 1/4". Each pinch
  logs one step, and the pitch rises as you progress. A middle pinch undoes the
  last step for 5 seconds.
- **Rewards.** XP, gold, level-ups with their own fanfare screen, RPG titles
  (Novice → Apprentice → … → Mythic), bonus gold per level, random loot
  (Common/Uncommon/Rare/Epic), combos, and a daily streak.
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
app.js       All logic, in numbered sections (see the list at the top of the file)
AGENTS.md    Guide for AI coding assistants (architecture, rules, gotchas)
CLAUDE.md    Points Claude Code at AGENTS.md
ROADMAP.md   What's next, known limits, ideas
```

### Common tweaks

| Want to… | Edit |
|---|---|
| Add/change daily quests | `QUESTS` in `app.js` (section 2); the field meanings are documented above it |
| Change loot | `RARITIES` / `LOOT_TABLE` (section 3) |
| Change level titles | `LEVEL_TITLES` (section 6) |
| Tune timings, combo window, waking hours | `CONFIG` (section 1) |
| Change a sound | Its recipe in `SOUNDS` (section 15); press `P` to hear it |
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

## Status

This is a working prototype, not yet tested on the glasses. See
[ROADMAP.md](ROADMAP.md) for what's planned and the known platform limits
(e.g. a web app can't turn the display back on by itself).
