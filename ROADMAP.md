# Roadmap

What's next for Quest Log // HUD, what we know doesn't work yet, and the
bigger ideas. AI assistants: check this before starting work, and update it
when something ships or a limit is discovered.

## 1. Hardware testing

**Tested on a Meta Ray-Ban Display + Neural Band on 2026-09-26. It works
well, with no issues found.**

- [x] **Swipes.** All four directions, including left/right browsing.
- [x] **Pinch and middle pinch** (Enter / Escape), including Back.
- [x] **Two-pinch confirm** works with the default timings (3s window,
      250ms misfire gap).
- [x] **Voice composer.** Pinching the Add Quest box opens it, and the spoken
      quest arrives in the preview.
- [x] **Sound** is audible on the open-ear speakers.
- [x] **Emoji** (⏰ ⏱ 🔥 ◆) render.
- [x] **Layout** is readable, and animations are smooth at 30 Hz (incl.
      level-up).
- [x] **Timers, reminders and scheduled alerts** fire, including catching up
      after the display turns off and on.
- [ ] **Motion sensor.** Not specifically checked yet: does walking reset the
      stretch timer? (`devicemotion` → tune `MOTION_JOLT` /
      `MOTION_JOLTS_NEEDED` if needed.)

Re-test on the device after changing gestures, text input, sound or
anything time-based.

## 2. Next up

- [x] **Edit and delete quests** via the quest menu, with undo and restore
      (2026-09-26).
- [x] **Daily login chest** with streak-based rarity (2026-09-26).
- [x] **Profile: stats + collection** (2026-09-26).
- [x] **Automated tests** in `tests/` (2026-09-26).
- [x] **Double pinch to complete, pinch + hold for Edit / Remove**
      (2026-09-26).
- [ ] **Test achievements on the glasses:** the pop-up fanfare, Rainbow Road's
      hue cycling at 30 Hz, and the ↑↑↓↓◀▶◀▶ secret with real swipes.
- [ ] **Test the new stuff on the glasses:**
  - [x] **Pinch + hold opens the menu** (verified 2026-09-26).
  - [x] **A double pinch works.** 600 ms felt rushed, so the default is now
        1 s and it's adjustable in Settings.
  - [x] **Voice add / edit still opens the composer** with
        `touch-action: none`.
  - [ ] The menu chips are readable.
  - [ ] The daily chest's first-pinch sound plays.
  - [ ] The collection grid is readable.
- [x] **Loot that does something.** Treasure chests give timed power-ups,
      Streak Shields and Chest Keys (2026-09-26).
- [x] **Over-the-top chest** + 26 items + collection/stats recording
      (2026-09-26).
- [ ] **Test the chest on the glasses:**
  - [ ] All the item emoji render.
  - [ ] Smoothness at 30 Hz during the epic landing (lower `CONFIG.BLING`
        if it stutters).
  - [ ] Whether the screen shake is comfortable, and slot music volume.

- [x] **Cosmetics shop** (2026-09-26): 29 items across themes, fonts, sound
      packs, chest skins and coin rain, with live preview and a two-pinch
      buy. The chest can't be skipped, and 14 weird/scuffed items were added.
- [ ] **Test the shop on the glasses:** bundled fonts load and read well,
      the CRT scanlines look right on the display, and the sound packs play
      on the speakers.
- [x] **More shop stuff** (2026-09-26): 23 more items, so 61 in all (5 themes,
      4 fonts, 4 sound packs, 5 chest skins, 5 coin rains). A coin rain can
      mix characters (Cats & Dogs).
- [x] **More weird loot + the gremlin** (2026-09-27): 24 more scuffed chest
      items (64 in all), gamble items with win / lose lines, and a sarcastic
      AI ("the gremlin", 👾) that comments on completions, chests, level ups,
      the all-clear screen and alerts. AI sass setting: Off / Some / Lots.
- [x] **App icon in the glasses' app list** (2026-09-28): the SVG favicon
      showed a chain icon; a PNG `favicon.png` + `manifest.webmanifest` (like
      Meta's packager makes) fixed it.
- [ ] **App icon fills the tile:** it showed as a small circle mid-tile with
      lots of dead space. Now tighter icons + `"purpose": "maskable"` ones.
      Check after deploying (remove and re-add the app if the old icon sticks).
- [ ] **Test the gremlin + new loot on the glasses:** that 👾 lines are
      readable (19px italic purple) and the complete screen stays up long
      enough to read one, and that the new emoji render (🥄 🧀 📎 🍝 🕯️ 🦷
      🧽 🎈 🐌 🎺 🦢 🍄 🛒 🥠 🪑 🎩 🧿 📼 🥫 🐟 🐉 🧠 🦖 🌌 👾).
- [ ] **Test the new shop items on the glasses:** that the new emoji render
      (🍩 🌮 🐝 🐱 🐶 ♪ ♫), and that the Neon Chest's see-through body looks
      right.
- [ ] **Even more shop stuff:** HUD frames, level-up fanfare variants,
      particle styles, titles/nameplates, seasonal items, a daily "deal".

### Inventory and more (planned)

Stats and the collection are done (the Profile screen). Next ideas:

- **Per-day history** for streak calendars and charts on the Profile.
- [x] **Achievements** (30, 9 secret) with achievement-only cosmetics
  (2026-09-26).
- **More secrets / seasonal achievements** (holidays, streak milestones,
  hidden gestures).
- **Rotating shop deal:** one discounted item per day.
- **Streak-at-risk** evening warning, and a 10-minute **heads-up** before
  scheduled quests.
- **Inventory.** Let some chest items go to a backpack instead of applying
  instantly, so you can activate a 2× XP potion when you choose.
  - Needs: `player.inventory: [{ itemId, count }]` and a "use" action.
  - Decide per item: `store: true` vs applied instantly.
- **Selling power-ups in the store** (not just cosmetics). Price by
  rarity (e.g. common 30 / uncommon 75 / rare 180 / epic 400 ◆), maybe as a
  daily rotating stock of 3 so there's a reason to check in. This needs the
  inventory first.
- [ ] **Streak-at-risk reminder.** In the evening, if nothing has been done
      today and the streak > 0, `notify({ kind: "warning", … })`.
- [ ] **Heads-up before a scheduled quest** (e.g. 10 min before).
- [ ] **Weekly/weekday schedules** ("every Monday at 9", "weekdays").
- [ ] **Board order.** Show due-soon and overdue quests first.
- [ ] **Multiple timers**, or ask before replacing a running one.
- [ ] **Configurable waking hours** in Settings (currently `CONFIG` 8–21).

## 3. Bigger features (from the original brief)

Each of these should plug into the existing hooks rather than rewrite the core:

- **Phone companion app.** Add and manage quests from the phone. It could
  also send real notifications that wake the glasses (a web app can't).
  Hooks: `QuestLog.addFromText()`, `QuestLog.receiveQuest()`.
- **API sync / cloud saves / account login.** `player` + `settings` are small
  JSON blobs, so sync them. Watch for conflicts across devices.
- **VR Quest Log sync.** Shared quest/XP model with the VR app.
- **Server / homelab integration.** For example, Home Assistant events
  → `receiveQuest` / `notify`. The poll hook is in `runBackgroundChecks()`.
- **Randomized real-world side quests** and **AI-generated quests.** Generate
  plain text, then send it through `parseQuestText` / `addFromText`.
- **Location/context-aware quests.** Phone GPS is available to web apps
  (`navigator.geolocation`).
- **Real recorded sound effects.** Swap `Sound.play()` to use audio files
  and keep the same timing.

## Known limits (platform)

- **Display wake.** The glasses turn the display off on their own timer, and
  a web app can't turn it back on or push a system notification. Reminders,
  timers and schedules fire when the display is on, or when it comes back
  on.
- **No custom Neural Band gestures.** Only swipes, pinch and middle pinch.
- **Distribution.** During the Developer Preview, sharing is limited
  (password-protected URLs, a limited number of testers).

## Code health

- [x] **Split the code** into 23 small plain scripts in `js/` (2026-09-26).
  Largest is `js/ui/render.js` at ~420 lines.
- [ ] **Maybe split `style.css`** (~1.4k lines) the same way, e.g.
  `css/base.css`, `css/screens.css`, `css/chest.css`, `css/cosmetics.css`.
- **Save format.** It's versioned by key (`questLogHud.save.v1`). If the
  shape changes incompatibly, bump to `v2` and migrate in `loadProgress()`.
