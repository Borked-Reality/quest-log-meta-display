/* =========================================================
   Quest Log // HUD — Input
   Gestures / keys → handleAction(), and the window.QuestLog API.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- INPUT ---------- */
// Every input source (Neural Band, keyboard, test buttons, and later a
// phone companion or voice) funnels into handleAction().

// Gestures that bring the HUD back when it's idle. Swipe up is the
// intended one; the others also wake it so nothing feels "dead".
const WAKE_ACTIONS = ["show", "prev", "next", "confirm"];

// Returns true if the action was handled, false if it should be left
// to the browser / glasses system (e.g. Back on the main screen exits).
function handleAction(action) {
  Motion.requestPermission();        // no-op unless the platform needs it

  // While idle, the first gesture only wakes the HUD.
  if (ui.idle) {
    if (WAKE_ACTIONS.includes(action)) { wake(); Sound.play("show"); return true; }
    if (action === "hide") return true;             // already hidden
    if (action === "back") return false;            // let the system handle it
  }
  resetIdleTimer();

  // Any gesture other than a pinch cancels a half-done confirm.
  if (ui.armed && action !== "confirm" && action !== "back") disarm(true);
  if (ui.undo && (action === "prev" || action === "next")) clearUndo();

  switch (action) {
    case "show":
      // Swipe up climbs the stack:  QUEST ▲ ADD QUEST ▲ SHOP ▲ SETTINGS
      if (ui.screen === "quest" || ui.screen === "allClear") {
        Sound.play("show");
        showAddScreen();
      } else if (ui.screen === "add" && !ui.draftQuest) {   // (not mid-preview)
        Sound.play("show");
        showShopScreen();
      } else if (ui.screen === "shop") {
        Sound.play("show");
        showSettingsScreen();
      }
      return true;

    case "hide":
      // Swipe down goes back one level; from the quest board it hides.
      if (ui.screen === "settings") {
        pulseHint(el.hintHide);
        Sound.play("hide");
        showShopScreen();
        return true;
      }
      if (ui.screen === "shop") {
        pulseHint(el.hintHide);
        Sound.play("hide");
        showAddScreen();
        return true;
      }
      if (ui.screen === "add") {
        pulseHint(el.hintHide);
        Sound.play("hide");
        leaveAddScreen(0);
        return true;
      }
      // On a reward screen, finish the sequence quietly first.
      if (isOnRewardScreen()) skipRewards();
      pulseHint(el.hintHide);
      Sound.play("hide");
      clearTimeout(ui.idleTimer);
      enterIdle();                   // an open alert stays pending in the glance
      return true;

    case "prev":
    case "next":
      if (isOnRewardScreen() || ui.screen === "alert") return true;   // browsing paused
      pulseHint(el.hintBrowse);
      if (ui.screen === "add" && ui.draftQuest) {       // preview: change the type
        cycleDraftType(action === "prev" ? -1 : 1);
        return true;
      }
      if (ui.screen === "settings") {
        browseSettings(action === "prev" ? -1 : 1);
        return true;
      }
      if (ui.screen === "shop") {
        browseShop(action === "prev" ? -1 : 1);
        return true;
      }
      Sound.play("click", { direction: action === "prev" ? -1 : 1 });
      browseQuests(action === "prev" ? -1 : +1);
      return true;

    case "confirm": {
      if (!confirmLabel().enabled) return true;
      pulseHint(el.hintConfirm);
      const quest = currentQuest();
      if (ui.screen === "quest") {
        const isStep = isCounter(quest) && progressOf(quest) + 1 < quest.target;
        const timer = timerFor(quest);
        if (hasTimer(quest) && !(timer && timer.done)) {          // timed quest
          if (timer) togglePauseTimer();
          else startTimer(quest);
        }
        else if (isStep) logQuestStep(quest);                     // one pinch (undoable)
        else if (confirmTwice("complete", quest.id)) {            // two pinches
          if (isCounter(quest)) logQuestStep(quest);              // final step completes
          else completeQuest(quest);
        }
      }
      else if (isOnRewardScreen()) advanceFromRewards();
      else if (ui.screen === "alert") { Sound.play("click"); closeAlert(true); }
      else if (ui.screen === "allClear") {
        if (confirmTwice("newRound")) { Sound.play("click"); startNewRound(); }
      }
      else if (ui.screen === "settings") changeSetting();
      else if (ui.screen === "shop") shopAction();
      else if (ui.screen === "add") {
        if (ui.draftQuest) commitDraftQuest();
        else if (el.addInput.value.trim()) submitAddText();
        else el.addInput.focus({ preventScroll: true });   // desktop: ready to type
      }
      return true;
    }

    case "back":
      // Middle-finger pinch: cancel a half-done confirm, undo a +1 step,
      // dismiss an alert, or skip reward screens. Anywhere else, let the
      // system handle Back (leave the app).
      if (ui.armed) { disarm(false); return true; }
      if (ui.undo && ui.screen === "quest") { undoLastStep(); return true; }
      if (ui.screen === "quest" && timerFor(currentQuest()) && !player.timer.done) { stopTimer(); return true; }
      if (ui.screen === "settings") { Sound.play("click"); showShopScreen(); return true; }
      if (ui.screen === "shop") { Sound.play("click"); showAddScreen(); return true; }
      if (ui.screen === "alert") { Sound.play("click"); closeAlert(false); return true; }
      if (ui.screen === "add") {
        Sound.play("click");
        if (ui.draftQuest) cancelDraftQuest();          // preview → speak again
        else leaveAddScreen(0);                         // back to the board
        return true;
      }
      if (!isOnRewardScreen()) return false;
      // Middle pinch doesn't skip a chest mid-show (swipe down still escapes).
      if (ui.screen === "loot" && ui.chest && ui.chest.phase !== "result") return true;
      Sound.play("click");
      skipRewards();
      return true;

    // ----- dev / test actions -----
    case "toggleSound":
      toggleSound();
      return true;

    case "reset":
      resetProgress();
      return true;

    case "simulateQuest":
      simulateIncomingQuest();
      return true;

    case "previewSound":
      previewNextSound();
      return true;

    case "timeWarp":
      timeWarp();
      return true;

  }
  return false;
}

// Keyboard → action mapping.
// On Meta Ray-Ban Display the Neural Band arrives as these same keys:
//   thumb swipe         → Arrow keys
//   index-finger pinch  → Enter
//   middle-finger pinch → Escape (Back)
const KEY_BINDINGS = {
  ArrowLeft: "prev",
  ArrowRight: "next",
  ArrowUp: "show",      // swipe up   → bring the HUD back
  ArrowDown: "hide",    // swipe down → fade to the idle glance
  Enter: "confirm",
  Escape: "back",
  // dev keys (desktop only)
  m: "toggleSound",   M: "toggleSound",
  n: "simulateQuest", N: "simulateQuest",
  t: "timeWarp",      T: "timeWarp",
  p: "previewSound",  P: "previewSound",
};

document.addEventListener("keydown", (event) => {
  // The "+ ADD QUEST" text box needs some keys for itself:
  //  • Enter (the pinch) must reach it untouched — that's what opens the
  //    glasses' voice/handwriting composer, and commits typed text on desktop.
  //  • Typing and moving the caret on desktop.
  if (event.target === el.addInput) {
    if (event.key === "Enter" || event.key.length === 1) return;
    if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && el.addInput.value) return;
  }

  const action = KEY_BINDINGS[event.key];
  if (!action || event.repeat) return;
  // Only block the default when we used the key. This also stops a focused
  // button from "clicking" a second time on Enter.
  if (handleAction(action)) event.preventDefault();
});

// Text committed from the composer (or Enter after typing on desktop).
el.addInput.addEventListener("change", () => {
  if (ui.screen === "add" && el.addInput.value.trim()) submitAddText();
});

// Any element with data-action="..." becomes a control.
document.querySelectorAll("[data-action]").forEach((node) => {
  node.addEventListener("click", () => {
    handleAction(node.dataset.action);
    node.blur();   // so keyboard focus doesn't linger on buttons
  });
});

// Hooks for future integrations (gesture bridge, phone companion, API
// sync, homelab server, AI quest generator), e.g. from the console:
//   QuestLog.receiveQuest({ title: "Feed the cat", type: "main", xp: 30, gold: 6 })
//   QuestLog.notify({ kind: "warning", label: "STREAK AT RISK", title: "Finish 1 quest today" })
window.QuestLog = {
  handleAction,
  receiveQuest,
  notify,
  // Plain-language quest from anywhere (phone voice assistant, API...):
  //   QuestLog.addFromText("daily: stretch for 10 minutes")
  addFromText: (text) => {
    const draft = parseQuestText(text || "");
    return draft ? receiveQuest(draft) : null;
  },
  parseQuestText,
  player: () => player,
  quests: QUESTS,
};
