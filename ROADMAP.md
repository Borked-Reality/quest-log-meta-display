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

- [ ] **Edit and delete quests.** There's no way to remove a mis-heard or
      finished-with quest yet (added dailies repeat forever). For example: a
      "Remove" option when viewing a quest you added.
- [ ] **Inventory.** Loot is rolled and shown but not kept. Store it in
      `player` and make a screen to view it. Maybe loot does something
      (a potion = XP boost).
- [ ] **Streak-at-risk reminder.** In the evening, if nothing has been done
      today and the streak > 0, `notify({ kind: "warning", … })`.
- [ ] **Heads-up before a scheduled quest** (e.g. 10 min before).
- [ ] **Weekly/weekday schedules** ("every Monday at 9", "weekdays").
- [ ] **Board order.** Show due-soon and overdue quests first.
- [ ] **Multiple timers**, or ask before replacing a running one.
- [ ] **Achievements** (first quest, 7-day streak, 100 glasses of water…).
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

- **`app.js` is ~2.7k lines.** If it keeps growing, split it into a few plain
  `<script>` files by section (e.g. `sound.js`, `quests.js`, `ui.js`). Keep
  it build-free and keep the load order explicit in `index.html`.
- **Save format.** It's versioned by key (`questLogHud.save.v1`). If the
  shape changes incompatibly, bump to `v2` and migrate in `loadProgress()`.
