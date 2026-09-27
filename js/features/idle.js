/* =========================================================
   Quest Log // HUD — Idle + background checks
   Fading to the glance view, waking up, and the once-a-minute checks.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- IDLE MODE + BACKGROUND CHECKS ---------- */
// After IDLE_AFTER_MS without input, or on a swipe down, the HUD fades
// to a one-line glance. Black is see-through on the glasses, so idle is
// almost invisible. Swipe up (or any other gesture) wakes it — that
// first gesture ONLY wakes; it never completes a quest by accident.
// Notifications wake it too.
//
// Note: the glasses also turn their display off on their own timer, and
// a web app can't turn it back on. While the display is off, this page
// may be paused; checks run again as soon as it becomes visible.

function resetIdleTimer() {
  clearTimeout(ui.idleTimer);
  if (CONFIG.IDLE_AFTER_MS > 0 && !document.hidden) {
    ui.idleTimer = setTimeout(enterIdle, CONFIG.IDLE_AFTER_MS);
  }
}

function enterIdle() {
  // Reward screens advance on their own; wait until they're done.
  // And don't fade out while someone might be dictating a new quest.
  if (isOnRewardScreen() || ["add", "shop", "profile", "settings"].includes(ui.screen)) { resetIdleTimer(); return; }
  ui.idle = true;
  renderGlance();
  el.hud.classList.add("is-idle");
}

// Returns true if the HUD was idle (so the caller can swallow the input).
function wake() {
  const wasIdle = ui.idle;
  ui.idle = false;
  el.hud.classList.remove("is-idle");
  resetIdleTimer();
  return wasIdle;
}

// Everything that can produce a notification without user input.
function runBackgroundChecks() {
  player.buffs = activeBuffs();          // drop expired power-ups
  checkStreak();
  checkForNewDay();
  announceOpenedQuests(false);
  checkReminders();
  checkSchedules();
  // Future: poll an API / phone companion for new quests here.

  // Time windows may have opened/closed: refresh the resting screens.
  if (ui.screen === "quest" || ui.screen === "allClear") showHome();
  else renderStats();
  if (ui.idle) renderGlance();
}

function startBackgroundChecks() {
  clearInterval(ui.checkTimer);
  ui.checkTimer = setInterval(runBackgroundChecks, CONFIG.CHECK_EVERY_MS);
}

function stopBackgroundChecks() {
  clearInterval(ui.checkTimer);
  clearTimeout(ui.idleTimer);
}

// Display turned off / app backgrounded → stop timers and sensors.
// Display back on → catch up on anything missed and show the full HUD.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopBackgroundChecks();
    stopTicker();
    Motion.stop();
  } else {
    Motion.start();
    startTicker();                 // also finishes a timer that ran out meanwhile
    wake();
    runBackgroundChecks();
    startBackgroundChecks();
    offerDailyChest();             // first time the display is on today?
  }
});

// Dev: jump the clock forward an hour to test reminders / time windows.
function timeWarp() {
  ui.clockOffsetMs += 60 * 60 * 1000;
  el.clockButton.textContent = `+1 HR (${clock().toTimeString().slice(0, 5)})`;
  runBackgroundChecks();
  tick();
}
