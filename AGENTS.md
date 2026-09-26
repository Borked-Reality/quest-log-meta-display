# AGENTS.md — guide for AI coding assistants

This file tells AI assistants (Claude Code, Cursor, Copilot, Codex, …) how
this project works and how to change it safely. Read it before editing.
For the human-facing overview see [README.md](README.md). For planned work
see [ROADMAP.md](ROADMAP.md).

## What this is

**Quest Log // HUD** turns real-life tasks into RPG quests (XP, levels,
gold, loot, streaks) on the **Meta Ray-Ban Display** glasses. It's a
wearable spin-off of a VR app, so it should be glanceable and lightweight,
not a dashboard.

## Hard rules

1. **Plain HTML/CSS/JS only.** No frameworks, no npm, no bundler, no build
   step, no TypeScript. It must run by opening `index.html` directly
   (a `file://` URL). Don't add dependencies without asking the owner.
2. **Keep it readable for a beginner-to-intermediate developer.** Use clear
   names and comments on important sections, and match the existing style
   (see *Code conventions*).
3. **Three source files:** `index.html`, `style.css`, `app.js`. If `app.js`
   gets split, use more plain `<script>` tags. Never introduce modules that
   need a server or build.
4. **Design for the glasses first** (see *Platform facts*), then desktop.
5. **Keep the docs true.** When behavior changes, update `README.md`, this
   file, `ROADMAP.md`, and the numbered section list at the top of `app.js`.

## Platform facts (Meta Ray-Ban Display, Web Apps)

These come from Meta's docs and starter kit
(<https://github.com/facebookincubator/meta-wearables-webapp>,
<https://wearables.developer.meta.com/docs/develop/webapps>).

**Tested on a Meta Ray-Ban Display + Neural Band on 2026-09-26. These all
work as described below:**
- All swipes (incl. left/right), pinch and middle pinch
- The voice composer on the Add Quest box
- Sound on the speakers, emoji, readability and animation smoothness
- Timers, reminders and schedules, including after the display turns off
  and on

Still unconfirmed: whether walking resets the stretch timer via
`devicemotion` (see ROADMAP).

**Display**
- 600×600, 30 Hz (a 33 ms frame budget). Don't run 60 fps loops.
- It's an **additive display, so black (#000) is see-through.** The
  background must stay pure black, and "hiding" something means making it
  black or transparent.
- There's no cursor and no touchscreen.

**Input.** The Neural Band arrives as ordinary `keydown` events:
- Thumb swipes → `ArrowLeft/Right/Up/Down`
- Index pinch → `Enter`
- Middle pinch → `Escape` (Back)
- No custom gestures. Pinch is not a positioned pointer event. Pointer Lock
  is unsupported.

**Text input**
- A normal `<input>`/`<textarea>` opens the glasses' **voice/handwriting
  composer** when the *wearer* pinches it while it has focus.
- Calling `.focus()` in code does **not** open the composer. Read the result
  from `input`/`change`.
- Don't build a custom keyboard.

**Motion sensor** (not yet confirmed on hardware)
- Standard `devicemotion`. Request permission from a user gesture where
  `DeviceMotionEvent.requestPermission` exists.
- Stop listeners when the page is hidden.

**Lifecycle**
- The system turns the display off on its own timer, and there's no
  always-on mode.
- A web app **cannot wake the display or push a system notification.**
  Timers/JS may pause while hidden, so catch up on `visibilitychange`.

**Storage and assets**
- `localStorage` works.
- The emoji the app uses (⏰ ⏱ 🔥 ◆) render on the glasses. Test any new
  ones on the device before relying on them.

## Design rules

- **Colors.** The tokens are at the top of `style.css`:
  - Black background, white text.
  - **Dracula green `#50fa7b`** is the main accent.
  - **Gold** is for rewards and loot.
  - **Red only** for warnings/fail states (e.g. overdue).
  - Cyan and purple are secondary: timers/reminders and epic loot.
- **Layout.** Large text (titles ~44px, never below ~13px), high contrast, and
  generous spacing. Keep content ≥ 44px from the edges (`.hud` padding).
- **Feel.** Playful, slightly retro RPG HUD, not a corporate dashboard or
  heavy cyberpunk.
- **Animations** are short (150–600ms), with a few longer on purpose: level-up
  ≈ 4s, loot ≈ 3s. Honor `prefers-reduced-motion` (see the bottom of
  `style.css`).
- **The hint bar at the bottom always says what each gesture does right now.**
  Any new screen or state must update it.

## File map

| File | Contents |
|---|---|
| `index.html` | The `#hud` (600×600): header (clock/date/timer badge, gold, streak), `.screen-area` with one `div.screen` per screen, XP bar, hint bar, idle glance, flash overlay. Below it, `.dev-panel` (desktop test buttons, hidden at ≤640px). |
| `style.css` | Tokens → stage/layout → per-screen sections → XP bar → hints → dev panel → effects → reduced motion. |
| `app.js` | ~2.7k lines in numbered sections (list at the top of the file). |

### `app.js` sections

| § | Section | Key things |
|---|---|---|
| 1 | Config | `CONFIG` tunables |
| 2 | Quest data | `QUESTS` (base board), `BASE_QUEST_COUNT`, `QUEST_TYPE_LABELS`, `INCOMING_QUEST_POOL` |
| 3 | Loot table | `RARITIES`, `LOOT_TABLE` |
| 4 | Player state + clock | `createNewPlayer()`, `player`, `ui`, `settings`, `applySettings()`, `nowMs()`, `clock()` |
| 5 | Persistence | `saveProgress/loadProgress`, `saveSettings/loadSettings`, `resetProgress(askFirst)` |
| 6 | Leveling | `xpNeededFor`, `LEVEL_TITLES`, `titleFor`, `addXp` |
| 7 | Streak | `dateKey`, `updateStreakOnComplete`, `checkStreak` |
| 8 | Loot | `rollRarity`, `rollForLoot` |
| 9 | Board helpers | `currentQuest`, `isAvailable` (time windows + future `dueAt`), `browseQuests` (Add card sits between last and first), `showHome` |
| 10 | Completion | `completeQuest`, `applyLevelUpRewards`, `logQuestStep` (counter quests), `advanceFromRewards`, `skipRewards` |
| 10b | Accident protection | `confirmTwice(kind, id)`, `disarm`, `startUndo`/`undoLastStep` |
| 11 | Notifications | `notify`, `isBusyScreen`, `showNextAlert`, `closeAlert`, `openQuestArmed`, `addQuestToBoard`, `receiveQuest` |
| 11b | Adding quests | `parseQuestText`, `rewardFor`, `extractSchedule`, add-screen flow (`showAddScreen` → `submitAddText` → preview → `commitDraftQuest`) |
| 11c | Settings | `SETTINGS_ITEMS`, `changeSetting`, `browseSettings` |
| 11d | Clock/timers/schedules | `formatTime/Date/Countdown/Schedule`, `questMinutes`, `hasTimer`, `startTimer`/`togglePauseTimer`/`stopTimer`/`finishTimer`, `checkSchedules`, `tick` (1s ticker) |
| 12 | Daily reset + reminders | `checkForNewDay`, `announceOpenedQuests`, `checkReminders` |
| 13 | Motion | `Motion` (devicemotion jolt counting), `markActive` |
| 14 | Idle + background | `enterIdle`, `wake`, `runBackgroundChecks` (every 60s), `visibilitychange`, `timeWarp` (dev) |
| 15 | Sound | `Sound` engine (voice/noise/brass through compressor + reverb), `SOUNDS` recipes, `SOUND_PREVIEWS` |
| 16 | Rendering | `el` (**all DOM lookups**), `showScreen`, `renderAll` and friends, `confirmLabel`, `renderControls`, screen `show*` functions |
| 17 | Effects | `flashScreen`, `showToast`, `spawnParticles`, `countUp`, `animateXpBar`/`settleXpBar` |
| 18 | Input | `handleAction(action)`, `KEY_BINDINGS`, keydown/click wiring, `window.QuestLog` API |
| 19 | Start-up | Load → checks → ticker → first render |

## Data model

**Quest** (in `QUESTS`; quests added later are also stored in
`player.extraQuests` so they survive reloads):

```js
{ id, title, type: "daily" | "main" | "side", xp, gold, completed,
  window?: [fromHour, toHour],                 // only on the board in these hours
  target?, unit?, units?, stepXp?,             // counter quest (e.g. 8 glasses)
  reminder?: { kind: "pace" | "still", ... },  // nudges (section 12)
  dueAt?: msTimestamp,                         // one-off schedule
  time?: "HH:MM",                              // daily schedule
  minutes? }                                   // timer length (else parsed from title)
```

**`player`** (saved under `questLogHud.save.v1`):
- Progress: level, xp, gold, streak, `lastCompletedDate`, `lastDailyReset`
- Quest state: `completedQuestIds`, `questProgress{id: n}`,
  `announcedQuestIds` (reset daily), `extraQuests`, `currentQuestIndex`
- `timer`

`loadProgress` merges saved data onto `createNewPlayer()`, so **new fields
need a default there**.

**`settings`** (saved under `questLogHud.settings.v1`, and not touched by
Reset): soundEnabled, volume, clock24, twoPinchComplete, autoHideSeconds,
reminders, timers.

**`ui`** (never saved): current screen, queues (`rewardQueue`, `alertQueue`),
timers, `armed`, `undo`, `draftQuest`, `idle`, and similar.

## Screens and flow

`showScreen(name)` shows exactly one `.screen`. The screens are:

| Screen | Purpose |
|---|---|
| `quest` | The board: one quest at a time |
| `allClear` | Nothing left on the board |
| `add` | Voice/typed entry → preview |
| `settings` | One setting per card |
| `complete` → `levelUp` → `loot` | Reward sequence, driven by `ui.rewardQueue` + `advanceFromRewards()` |
| `alert` | Queued notifications |

- **The vertical stack is `quest ▲ add ▲ settings`.** Swiping up climbs it and
  swiping down goes back. Only the board hides the HUD (idle).
- **Alerts** go through `notify()`. They wait while `isBusyScreen()` (reward,
  alert, add, settings) and show on `showHome()`, after rewards, or after
  closing another alert. Stale alerts (quest done or unavailable) are dropped.
- **Completing takes two pinches** via `confirmTwice()` (quests, final counter
  step, New round, Reset). Single counter steps are one pinch plus a 5s undo.

## Code conventions

- **DOM lookups live only in the `el` object (section 16).** Add new elements
  there. Don't call `document.getElementById` elsewhere.
- **All input goes through `handleAction(action)`.** It returns `true` if
  handled (the key event gets `preventDefault`) or `false` to let the system
  handle it. That matters for `Escape`: on the quest board, Back must reach
  the system so it can exit.
- **Game time uses `nowMs()` / `clock()`, never `Date.now()`,** so the dev
  **+1 HR** time warp works. (The only exception is the misfire gap in
  `confirmTwice`, which measures real time.)
- **The hint bar is data-driven.** `confirmLabel()` returns the pinch label,
  and `renderControls()` sets the browse/middle/pinch hints and the desktop
  button. Update both for any new state.
- **Timed sequences:** JS timings and CSS `animation-delay`s must stay in sync.
  These are commented where they live:
  - Complete: coin at 700ms.
  - Level-up: impact at 960ms, final chord at 2000ms.

  Timers inside reward screens go in `ui.effectTimers` so skipping cleans
  them up.
- **Sound recipes** in `SOUNDS` use the helpers `v()`, `noise()`, `brass()`,
  `timpani()` and `crash()`, plus `note(semitonesFromC5)`. Rewards should be
  layered and rising; nags should be soft and plain. Add new sounds to
  `SOUND_PREVIEWS`.
- **Style:** 2-space indent, double quotes, semicolons, and `const`/`let`
  (no `var`). Use a section-header comment for each new section.

## Gotchas (things that have bitten us)

- **Some settings override `CONFIG`.** `applySettings()` overwrites
  `CONFIG.SOUND_VOLUME`, `IDLE_AFTER_MS` and `CONFIRM_WINDOW_MS` from
  `settings`. Change defaults in `settings`, not `CONFIG`.
- **`showScreen()` has side effects.** It clears `ui.armed` and (off the quest
  screen) `ui.undo`, and blurs the Add input.
- **`showHome()` pops queued alerts first.** If you need the board shown
  without that, use `showScreen("quest"); renderAll();`.
- **Never `preventDefault` Enter on `#addInput`.** That pinch is what opens the
  composer. The keydown handler exempts it, and typing letters there must not
  trigger the dev keys.
- **Flex/grid elements toggled with the `hidden` attribute need an explicit
  `[hidden] { display: none; }` rule,** because a class `display` rule beats
  the attribute.
- **No `confirm()`/`alert()` dialogs on the glasses.** Use `confirmTwice`.
  (The desktop RESET button is the one exception.)
- **Some logic leaves the screen before idling.** `enterIdle()` refuses reward,
  add and settings screens (the idle timer just restarts), so an explicit
  "hide" leaves those screens first.
- **Keep `announcedQuestIds` keys unique** per feature: `quest.id` for opened
  time windows, `due:id` / `time:id` for schedules.
- **Keep the 1s ticker cheap.** It updates only text and widths, and it stops
  while the page is hidden.
- **Headless-screenshot artifacts.** Headless Chrome screenshots can catch
  animations mid-way. To judge the final layout, disable animations with an
  injected stylesheet.

## How to…

**Add a screen:**
1. `<div id="screenX" class="screen" hidden>` in `index.html`.
2. Add it to `el.screens`, plus any elements to `el`.
3. A `showX()` function.
4. Labels in `confirmLabel()` / `renderControls()`.
5. Cases in `handleAction()`.
6. Decide `isBusyScreen()`, `isOnRewardScreen()` and `enterIdle()` behavior.
7. Styles in their own `style.css` section.

**Add a quest field:**
1. Document it above `QUESTS`.
2. Copy it in `addQuestToBoard()` if it can be user-added.
3. Default it wherever it's read.

**Add a setting:**
1. A default in `settings`.
2. An entry in `SETTINGS_ITEMS`.
3. Use it (or map it into `CONFIG` in `applySettings()`).

**Add an alert type:**
1. Call `notify({ kind, label, title, detail, questId?, action? })`.
2. Add a `[data-kind="…"]` color in CSS if new.
3. Handle any new `action` in `closeAlert()` and `confirmLabel()`.

**Add a gesture/action:**
1. Map a key in `KEY_BINDINGS` (keep the Band mapping above intact).
2. Add a `case` in `handleAction`.
3. Decide whether it wakes from idle (`WAKE_ACTIONS`).

## Testing

There's no test framework, on purpose. Verify like this:

1. **Syntax:** `node --check app.js`.
2. **Manual (desktop Chrome):**
   - Arrow keys, `Enter` and `Esc` simulate the Band.
   - `T` fast-forwards time (reminders, schedules, timers, midnight reset).
   - `N` simulates an incoming quest, and `P` plays every sound.
   - Check the hint bar on every screen you touched.
3. **Automated in headless Chrome** (this has worked well). Launch with
   `--headless=new --remote-debugging-port=…`. Drive it over the DevTools
   Protocol from a small Node script (Node ≥ 22 has `fetch` and `WebSocket`
   built in):
   - `Input.dispatchKeyEvent` sends real key presses.
   - `Input.insertText` types.
   - `Runtime.evaluate` reads `ui`/`player` state.
   - `Page.captureScreenshot` at 600×600 (`Emulation.setDeviceMetricsOverride`)
     for visuals.
   - For audio, render recipes in an `OfflineAudioContext` and check the peak
     level is below 1 (no clipping) and not silent.
4. **Pin the clock** for time-based tests: set `ui.clockOffsetMs` so `clock()`
   reads e.g. 10:00, and disable `settings.reminders` if nudges would
   interfere.
5. **On the glasses:** the core app was verified on 2026-09-26. Re-test on the
   device after changing gestures, text input, sound or anything time-based.
   Open items are in `ROADMAP.md`.

Report honestly what was verified and how, and what wasn't
(e.g. "not yet tested on the glasses").
