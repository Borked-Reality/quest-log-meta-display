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
3. **Source files:** `index.html`, `style.css`, and small plain scripts in
   `js/` (see *File map*). Keep files focused on one job. Never introduce ES
   modules, a bundler, or anything that needs a server or build.
4. **Design for the glasses first** (see *Platform facts*), then desktop.
5. **Keep the docs true.** When behavior changes, update `README.md`, this
   file (including the `js/` file table), and `ROADMAP.md`.

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
- **Pinch start / end (for hold):** with `touch-action: none` on `html, body`
  (set in `style.css`), Meta's docs say the glasses *also* send the index pinch
  as `pointerdown` → `pointerup`, and `Enter` may arrive too. The pinch
  detector in `js/ui/input.js` merges both.
  - **Verified on the glasses (2026-09-26):** pinch-and-hold is detected, a
    double pinch works, and the voice composer still opens and inserts text
    with `touch-action: none` on.

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
  ≈ 4s, treasure chest ≈ 7.5–9.5s. How long reward screens then *stay up* is
  the "Reward screens" setting (`CONFIG.REWARD_SCREEN_MS` via `moveOnAfter()`
  in `js/ui/rewards.js`): Quick, Relaxed (default, time to read everything)
  or Wait for pinch. Never hard-code a reward screen's `setTimeout`. The level-up can be skipped with a pinch. The chest deliberately can't (only a swipe down escapes). Honor `prefers-reduced-motion` (see the bottom of
  `style.css`).
- **The hint bar at the bottom always says what each gesture does right now.**
  Any new screen or state must update it.

## File map

| File | Contents |
|---|---|
| `index.html` | The `#hud` (600×600): header (clock/date/timer badge, gold, streak), `.screen-area` with one `div.screen` per screen, XP bar, hint bar, idle glance, flash overlay. Below it, `.dev-panel` (desktop test buttons, hidden at ≤640px). |
| `style.css` | Tokens → stage/layout → per-screen sections → XP bar → hints → dev panel → effects → **cosmetics** (chest skins, themes, fonts, shop) → reduced motion. |
| `favicon.png`, `manifest.webmanifest` | The app icon for the glasses' app list (and browser tabs): a 192px PNG of the chest plus a web manifest (name + icons), at the app root. This is the shape Meta's own web-app packager produces (PNG over 52×52 + manifest). Seen on the glasses: an SVG favicon showed a generic chain icon, and without a `"purpose": "maskable"` icon the launcher shrank the icon into a small circle mid-tile. The `startup` test checks all of this. |
| `icons/` | Icon art, full-bleed black squares (the launcher rounds the corners): `icon.svg` (chest ≈ 88% wide) → `favicon.png` + `icon-512.png`; `icon-maskable.svg` (chest ≈ 75%, safe for any crop) → `maskable-192/512.png` + `apple-touch-icon.png`. `logo.svg` (rounded, glowing) → `logo-512.png` for the README. If the chest art changes, re-render these. |
| `fonts/` | Bundled `.woff2` fonts for the shop (Latin subset) and their licences (OFL / Apache). They're only downloaded when used. |
| `js/` | All logic, split by job into plain scripts (below). |

### The `js/` files (loaded in this order by `index.html`)

These are **plain `<script>` files, not ES modules.** Browsers block
modules on `file://` pages, and the app must open straight from disk. All
files share one global scope, so a function defined in any file can be
called from any other at *runtime*.

**Load order matters for code that runs immediately.** Top-level
statements run as each file loads. They may only use things from files
*above* them in the list. Put new start-up work in `js/main.js`, which runs
last.

| File | What's in it | Key things |
|---|---|---|
| `js/config.js` | Tunable numbers | `CONFIG` |
| `js/data/quests.js` | Starting quest board | `QUESTS`, `BASE_QUEST_COUNT`, `QUEST_TYPE_LABELS`, `INCOMING_QUEST_POOL` |
| `js/data/loot.js` | Chest items | `RARITIES`, `LOOT_TABLE` (64 items with a `buff` / `instant` effect, incl. `gamble` with optional `win` / `lose` lines, and an optional gremlin `quip`), `CHEST_GOLD` |
| `js/data/gremlin-lines.js` | The gremlin's lines | `GREMLIN_LINES` (by moment: `complete`, `completeLate`, `levelUp`, `chestEpic`, `water`, …; `{placeholders}`) |
| `js/data/achievements.js` | Achievements | `ACHIEVEMENTS` (goal, `progress(player)`, `secret`, `reward: { gold } \| { item }`) |
| `js/data/shop-items.js` | Shop catalogue | `SHOP_ITEMS` (kind + value + price), `SHOP_KIND_LABELS`, `SHOP_CATEGORIES` (the category cards), `DEFAULT_EQUIPPED`, `SOUND_PACKS` |
| `js/core/state.js` | State + saving | `createNewPlayer()`, `player`, `ui`, `settings`, `applySettings()`, `nowMs()`, `clock()`, `saveProgress/loadProgress`, `resetProgress(askFirst)` |
| `js/core/progression.js` | Levels + streak | `xpNeededFor`, `LEVEL_TITLES`, `titleFor`, `addXp`, `dateKey`, `checkStreak` (uses Streak Shields) |
| `js/core/loot.js` | Loot + power-ups | `rollRarity`, `rollForLoot`, `openChest` (applies the item, records the find/stats), `activeBuffs`, `buffMult(stat)`, `chestChance`, `comboWindowMs` |
| `js/core/quests.js` | Quest logic | `currentQuest`, `isAvailable`, `browseQuests`, `showHome`, `completeQuest`, `logQuestStep`, `advanceFromRewards`, `skipRewards`, `confirmTwice`, `disarm`, `startUndo`/`undoLastStep` |
| `js/core/notifications.js` | Alerts | `notify`, `isBusyScreen`, `showNextAlert`, `closeAlert`, `openQuestArmed`, `addQuestToBoard`, `receiveQuest` |
| `js/features/add-quest.js` | Voice add | `parseQuestText`, `extractSchedule`, `rewardFor`, `showAddScreen` → `submitAddText` → preview → `commitDraftQuest` |
| `js/features/settings.js` | Settings screen | `SETTINGS_ITEMS`, `changeSetting`, `browseSettings` |
| `js/features/quest-menu.js` | Quest board pinches | `questTap` (double pinch), `questHold` / `openQuestMenu` (Edit / Remove), `armDouble`, `questActions`/`primaryAction`, `cycleQuestAction`, `runQuestAction`, `removeQuest`/`undoRemove`, `restoreHiddenQuests`, `startEditQuest`/`commitEditedQuest` |
| `js/features/daily-chest.js` | Daily login chest | `offerDailyChest`, `openDailyChest`, `nextLoginDay`, `minTierForDay` |
| `js/features/gremlin.js` | The sarcastic AI | `quip(kind, vars, { always })`, `completeQuip`, `chestQuip`, `showQuip`; `settings.sass` (off / some / lots) |
| `js/features/achievements.js` | Achievements logic | `checkAchievements` (runs in `saveProgress`), `announceAchievements`, `recordCompletionForAchievements`, secrets: `trackSecretSequence`, `pokeTheVoid` |
| `js/features/profile.js` | Profile | `showProfileScreen`, `browseProfile`, `renderProfileScreen`, `profileStats`, `collectionItems` |
| `js/features/shop.js` | Shop | `applyCosmetics(preview)`, `isOwned`/`isEquipped`, `showShopScreen(keepPlace)`, category cards (`browseShopCategories`, `openShopCategory`, `closeShopCategory`, `shopCategorySummary`), `openShopItem(id)`, `browseShop` (within a kind), `previewShopItem`, `shopAction` → `buyItem` / `equipItem` |
| `js/features/time.js` | Clock, timers, schedules | `formatTime/Date/Countdown/Schedule`, `questMinutes`, `startTimer`/`togglePauseTimer`/`stopTimer`/`finishTimer`, `checkSchedules`, `tick` (1s ticker) |
| `js/features/daily.js` | Daily reset + nudges | `checkForNewDay`, `announceOpenedQuests`, `checkReminders` |
| `js/features/motion.js` | Motion sensor | `Motion`, `markActive` |
| `js/features/idle.js` | Idle + background | `enterIdle`, `wake`, `runBackgroundChecks` (every 60s), `visibilitychange`, `timeWarp` (dev) |
| `js/sound/engine.js` | Synth engine | `Sound` (voice / noise / brass, compressor + reverb, music channel, `setPack`), helpers `v` `noise` `brass` `timpani` `crash`, `note()` |
| `js/sound/sounds.js` | Sound recipes | `SOUNDS`, `SOUND_PREVIEWS`, `toggleSound` |
| `js/ui/render.js` | Rendering | `el` (**all DOM lookups**), `showScreen`, `renderAll` and friends, `confirmLabel`, `renderControls`, `showAlertScreen`, `setText` / `setHidden` / `setData` |
| `js/ui/rewards.js` | Celebrations | `showCompleteScreen`, `showLevelUpScreen`, the treasure chest (`showChestScreen`, reel, `landReel`, `showChestResult`) |
| `js/ui/effects.js` | Effects | `flashScreen`, `showToast`, `spawnParticles` / `spawnCoins` / `spawnRing` / `spawnSparkles`, `shakeHud`, `countUp`, `animateXpBar`, `startDrain`, `warmUpRewards` |
| `js/ui/input.js` | Input | `handleAction(action)`, `KEY_BINDINGS`, the **pinch detector** (`pinchStart`/`pinchEnd`: tap vs hold, key + pointer copies merged), `window.QuestLog` API |
| `js/main.js` | Start-up (last) | Load → checks → ticker → first render |

**Adding a new file:**
1. Give it the same header comment as the others.
2. Add a `<script>` tag in `index.html`, in the right place in the order.
3. Add a row to the table above.

## Data model

**Quest** (in `QUESTS`; quests added later are also stored in
`player.extraQuests` so they survive reloads):

```js
{ id, title, type: "daily" | "main" | "side", xp, gold, completed,
  window?: [fromHour, toHour],                 // only on the board in these hours
  target?, unit?, units?, stepXp?,             // counter quest (e.g. 8 glasses)
  reminder?: { kind: "pace" | "still", ... },  // nudges (js/features/daily.js)
  dueAt?: msTimestamp,                         // one-off schedule
  time?: "HH:MM",                              // daily schedule
  minutes? }                                   // timer length (else parsed from title)
```

**`player`** (saved under `questLogHud.save.v1`):
- Progress: level, xp, gold, streak, `lastCompletedDate`, `lastDailyReset`
- Quest state: `completedQuestIds`, `questProgress{id: n}`,
  `announcedQuestIds` (reset daily), `extraQuests`, `currentQuestIndex`
- `timer`
- From chests: `buffs` (timed power-ups), `streakShields`, `guaranteedDrops`
- For the future stats / inventory / store screens:
  - `itemsFound` (`{ itemId: count }`)
  - Shop: `unlocks` (bought ids), `equipped` (per kind; merged with
    `DEFAULT_EQUIPPED` on load)
  - Quest menu: `hiddenQuestIds`. Daily chest: `loginStreak`,
    `lastDailyChest` (+ `lifetime.bestLoginStreak`)
  - Achievements: `achievements` (`{ id: unlockedAt }`), `counters` (glasses,
    stretches, timersFinished, questsAdded, undos, kazooQuests, perfectDays,
    maxGold, questCounts, and the secret flags). Deep-merged on load.
  - `lifetime` (questsCompleted, xpEarned, goldEarned, chestsOpened,
    bestStreak, bestCombo, goldSpent)

  `loadProgress` deep-merges `lifetime`, so new stat fields get defaults.

`loadProgress` merges saved data onto `createNewPlayer()`, so **new fields
need a default there**.

**`settings`** (saved under `questLogHud.settings.v1`, and not touched by
Reset): soundEnabled, volume, clock24, twoPinchComplete, autoHideSeconds,
reminders, timers, sass, rewardPace.

**`ui`** (never saved): current screen, queues (`rewardQueue`, `alertQueue`),
timers, `armed`, `undo`, `draftQuest`, `idle`, and similar.

## Screens and flow

`showScreen(name)` shows exactly one `.screen`. The screens are:

| Screen | Purpose |
|---|---|
| `quest` | The board: one quest at a time |
| `allClear` | Nothing left on the board |
| `add` | Voice/typed entry → preview |
| `shop` | Cosmetics. Opens on 5 category cards (`SHOP_CATEGORIES`: owned / equipped / affordable); pinch opens one, then one item per card with live preview. Middle pinch / ▼ goes back to the cards (`ui.shopCategory = null`) |
| `profile` | Stats card, then the collection grid (◀ ▶ moves the cursor) |
| `settings` | One setting per card |
| `complete` → `loot` (treasure chest) → `levelUp` | Reward sequence, driven by `ui.rewardQueue` + `advanceFromRewards()`. The chest comes before the level-up because chest XP can cause the level-up |
| `alert` | Queued notifications |

- **The vertical stack is `quest ▲ add ▲ shop ▲ profile ▲ settings`.** Swiping up climbs it and
  swiping down goes back. Only the board hides the HUD (idle).
- **Alerts** go through `notify()`. They wait while `isBusyScreen()` (reward,
  alert, add, shop, profile, settings) and show on `showHome()`, after rewards, or after
  closing another alert. Stale alerts (quest done or unavailable) are dropped.
- **Quest board pinches** (`js/features/quest-menu.js`):
  - **Double pinch** (2nd within `DOUBLE_PINCH_MS`) = main action. A single
    pinch sets `ui.armed.kind === "double"` and does nothing else.
  - **Pinch + hold** (`HOLD_MS`) = Edit / Remove menu
    (`ui.armed.kind === "questMenu"`).
  - Taps and holds come from the pinch detector as `handleAction("confirm")`
    / `handleAction("hold")`. A hold anywhere else is treated as a pinch.
  - Other two-step confirms use `confirmTwice()` (New round, Buy, Reset).
  - **Undo:** `ui.undo.kind` is "step" (+1 Glass) or "remove". The middle
    pinch calls `undoLast()`.
  - **Removed quests:** your own are deleted; built-in ones go into
    `player.hiddenQuestIds`, which `isAvailable()` respects.
- **Daily chest:** offered via an alert with `action: "dailyChest"` (start-up,
  display back on, new day). It waits for a pinch so sound can play.

## Code conventions

- **DOM lookups live only in the `el` object (`js/ui/render.js`).** Add new elements
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
  - Chest (see the comment above `showChestScreen`):
    - Thud at 330ms, rattles at 450 and 800ms, burst open at 1150ms.
    - Reel at 1500ms, landing after `2200 + tier×450`ms, result about 900ms
      later.
    - The CSS runs off the `data-phase` attribute
      (drop/rattle/rattle2/open/spin/landed/result).
  - Bling helpers (`js/ui/effects.js`): `spawnParticles(color, n, x%, y%)`,
    `spawnCoins`, `spawnRing`, `spawnSparkles`, `shakeHud`.
    - They're scaled by `CONFIG.BLING`.
    - Coins and shake are skipped under reduced motion.
    - Anything looping (a `setInterval` / `requestAnimationFrame`) must be
      stopped in `clearRewardTimers()`.

  Timers inside reward screens go in `ui.effectTimers` so skipping cleans
  them up.
- **Sound recipes** in `SOUNDS` use the helpers `v()`, `noise()`, `brass()`,
  `timpani()` and `crash()`, plus `note(semitonesFromC5)`. Rewards should be
  layered and rising; nags should be soft and plain. Add new sounds to
  `SOUND_PREVIEWS`.
- **Style:** 2-space indent, double quotes, semicolons, and `const`/`let`
  (no `var`). Use a section-header comment for each new section.

## Gotchas (things that have bitten us)

- **Don't animate colours with CSS `filter: hue-rotate`.** It changed nothing
  on the glasses (desktop Chrome was fine), so Rainbow Road cycles the accent
  CSS variables from JS instead (`setRainbow` in `js/features/shop.js`).
  The epic chest's hue-rotate effects were removed for the same reason.
- **HUD text must stay unselectable** (`user-select: none` on `html, body`).
  With `touch-action: none`, a pinch-and-move is a drag and would select
  text. Only `.add-input` is selectable. The `cosmetics` test suite checks
  this with a real drag.

- **`saveProgress()` also checks achievements.** Unlocking changes `player`
  (gold, unlocks), and the pop-up is announced ~0.9s later via `notify`
  (so it waits behind celebrations).
  - Record progress in `player` *before* saving.
  - Anything restored from a snapshot (undo) must re-apply its counter
    *after* the restore.
- **Achievement-only shop items have `price: null`.** They're owned only via
  `player.unlocks` (added by the reward). Code that sums or compares prices
  must handle `null`.

- **`Enter` is not in `KEY_BINDINGS`.** The pinch detector handles it
  (keydown starts, keyup ends), so tap vs hold works. Tests that need a hold
  use `page.hold()`; the glasses' pointer copy is `page.pointer("down"/"up")`.
- **Don't remove `touch-action: none`** from `html, body`: without it the
  glasses (per Meta's docs) only send a finished pinch, so holds can't be
  detected.

- **Cosmetics must never change the balance.** Only looks and sound. The
  background stays black and red stays "warning" in every theme.
- **Leaving the Shop must restore the equipped look.** `showScreen()` calls
  `applyCosmetics()` when leaving the shop. Any new preview must also be
  undone there.
- **Wide fonts only apply to "display" text,** through `--font-display` and
  `font-size-adjust` (`--display-adjust`). Don't set a wide font on
  `body`.
- **Editing files from the shell:** in GNU sed, `\'` means "end of line", not
  an apostrophe. For multi-line or quote-heavy edits, write a small Node
  script to a file instead of a one-liner.

- **The page must never scroll on the display.** A screen shake moves the
  HUD past the edge, so `html, body { overflow: hidden }` applies at display
  size. Keep it.
- **Keep effect counts moderate:** the glasses render at 30 Hz. The epic chest
  peaks at ~100 animated pieces. Use `CONFIG.BLING` rather than hard-coding
  bigger bursts.

- **Chest rewards are applied when the quest completes, not at the reveal.**
  That keeps skipping safe. `ui.pendingReveal` hides the chest's gold and the
  power-up chips until the reel lands, so the display doesn't spoil it. Clear
  it on any path that leaves the chest (`showChestResult`, `skipRewards`).
- **Music plays on its own channel** (`Sound.startMusic()` /
  `stopMusic()`), so it can be cut off. `clearRewardTimers()` stops it and
  the chest's coin fountain.
- **Apply power-up multipliers** (`buffMult("xp")` / `buffMult("gold")`)
  anywhere XP or gold is earned from a quest.

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

## Performance (measured on the glasses profile)

Measured in Chrome at 12× CPU slowdown, 600×600, 500 Kbps / 150 ms. That is
the profile from Meta's optimize skill. What mattered:

- **Don't toggle classes, attributes or CSS variables on `.hud` or `:root`
  during effects.** That restyles all ~300 elements (hundreds of ms on the
  glasses). `shakeHud` uses a Web Animation on `.hud` for this reason.
  Rainbow Road is the one deliberate exception (4×/s, paused while idle).
- **Animate with the Web Animations API or CSS `transform`/`opacity`,** not
  per-frame JS. The reel spin and the confirm drain are single
  `element.animate()` calls, and the reel ticks are scheduled from the easing
  curve up front.
- **No forced reflows to restart animations.** Use `restartClass()` (a double
  `requestAnimationFrame`), not `void node.offsetWidth`.
- **Per-second renders write only what changed.** Use `setText` / `setHidden` /
  `setData` (`js/ui/render.js`). Rewriting the same text still redoes layout.
- **Varying `font-size` per element is slow.** Each new size of an emoji or
  symbol is shaped again. Coins use one font size and scale with
  `transform` (`--s`).
- **First-time layout is the big cost** (fonts, emoji, reel rows: the first
  chest took ~1.4s to lay out). `warmUpRewards()` (`js/ui/effects.js`) lays
  the chest and level-up screens out once, hidden, a step at a time, 3s after
  start-up. That brought the first chest down to ~0.1s. If you add a heavy
  reward screen, add it there.
- **Load:** ~270 KB of HTML/CSS/JS, ~77 KB gzipped. GitHub Pages gzips and
  serves HTTP/2, so there's no build step. The fonts load only when picked.

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

**Add a shop item:**
1. An entry in `SHOP_ITEMS` (`kind` + `value` + `price` + icon/name/desc).
   It shows up in its kind's category automatically, in catalogue order
   (so keep each kind's items roughly cheapest first). A brand-new *kind*
   also needs a `SHOP_CATEGORIES` card and a `SHOP_KIND_LABELS` entry.
2. The look for its `value`:
   - **theme:** a `:root[data-theme=…]` block of colour variables.
   - **font:** a `@font-face` plus `:root[data-font=…]` with
     `--font-display` / `--display-adjust`.
   - **chest:** a `.chest-svg[data-skin=…]` block of `--c-*` colours.
   - **sound:** a `SOUND_PACKS` entry.
   - **coin:** just the character, or several for a mix (`"🐱🐶"`: each coin
     picks one). Plain symbols take the theme's gold only if listed in
     `TEXT_COINS` (`js/ui/effects.js`); anything else is drawn as emoji.
3. Run the tests. The `layout` suite checks every shop font fits every
   screen, and `cosmetics` checks every theme, chest skin, font and sound
   pack actually changes something. For a new font, tune `--display-adjust`
   by eye too: condensed all-caps fonts need a bigger value (Comic Boom 0.82)
   or they come out tiny.

**Add an achievement:**
1. An entry in `ACHIEVEMENTS` (`js/data/achievements.js`) with `goal` and
   `progress(player)`.
2. If nothing records that progress yet, add a counter to
   `player.counters` (`createNewPlayer`) and increment it where it happens.
3. For a cosmetic reward, add a `price: null, achievement: "<id>"` item to
   `SHOP_ITEMS` and its CSS.
4. Extend `tests/suites/achievements.mjs`.

**Add a setting:**
1. A default in `settings`.
2. An entry in `SETTINGS_ITEMS`.
3. Use it (or map it into `CONFIG` in `applySettings()`).

**Add an alert type:**
1. Call `notify({ kind, label, title, detail, questId?, action?, gremlin? })`.
   `gremlin` names a list in `GREMLIN_LINES` for the 👾 line on the alert.
2. Add a `[data-kind="…"]` color in CSS if new.
3. Handle any new `action` in `closeAlert()` and `confirmLabel()`.

**Add a gremlin line / moment:**
1. Add lines to a list in `GREMLIN_LINES` (`js/data/gremlin-lines.js`), or
   a `quip:` to a loot item. Keep them under ~70 characters: the `gremlin`
   test checks ≤ 72, and the `layout` test checks the longest one fits.
2. **Tone:** sarcastic and teasing about procrastination, late nights and
   tiny chores, but never actually mean. No jabs at bodies, health, money
   worries or anything the wearer can't help.
3. A new moment: call `quip("yourList", vars)` and put the result on screen
   with `showQuip(node, text)` (an `.ai-line` element). Use `{ always: true }`
   only for rare, specific moments; generic ones should respect "Some".

**Add a gesture/action:**
1. Map a key in `KEY_BINDINGS` (keep the Band mapping above intact).
2. Add a `case` in `handleAction`.
3. Decide whether it wakes from idle (`WAKE_ACTIONS`).

## Testing

**Run `node tests/run.mjs` before handing back any change.** It uses Node
22+ and Chrome, with no npm. It syntax-checks every file, then drives the
real `index.html` in headless Chrome with real key presses, suite by suite,
each from an empty save. Suites live in `tests/suites/`. Shared helpers
(`prepare` pins the clock to 10:00, sets Quick reward screens and clears start-up alerts, plus
`showQuest`, `forceLoot`/`noLoot`, `pinchTwice`) are in
`tests/lib/helpers.mjs`.

- **Add or extend a suite** for any new behaviour. Use `t.ok` / `t.eq` with
  names that read like a sentence.
- **Prove a new test can fail:** break the code on purpose once, see it go
  red, then restore.
- **Screenshots:** `--shots` saves them to `tests/screenshots/`
  (git-ignored). Look at them after visual changes.

The manual and low-level techniques below still apply:

1. **Syntax:** run `node --check` on each file, e.g.
   `for f in $(find js -name "*.js"); do node --check "$f"; done`.
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
4. **Overflow check** after touching fonts, themes or long text:
   - Render every screen in every font with the longest real strings, with
     animations frozen.
   - Flag any leaf text outside the HUD's safe area (±20px), or spilling out
     of `.screen-area` into the XP bar.
   - Prove the check works by breaking something on purpose (e.g. remove a
     font's `--display-adjust`).
5. **Pin the clock** for time-based tests: set `ui.clockOffsetMs` so `clock()`
   reads e.g. 10:00, and disable `settings.reminders` if nudges would
   interfere.
6. **On the glasses:** the core app was verified on 2026-09-26. Re-test on the
   device after changing gestures, text input, sound or anything time-based.
   Open items are in `ROADMAP.md`.

Report honestly what was verified and how, and what wasn't
(e.g. "not yet tested on the glasses").
