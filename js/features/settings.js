/* =========================================================
   Quest Log // HUD — Settings screen
   The Settings cards and what each setting does.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- SETTINGS SCREEN ---------- */
// Navigation is a vertical stack:   QUEST  ▲  ADD QUEST  ▲  SETTINGS
// Swipe up goes one level up, swipe down goes one level back.
// On Settings: ◀ ▶ picks a setting, pinch changes its value.

const SETTINGS_ITEMS = [
  { key: "soundEnabled", label: "Sound", options: [[true, "On"], [false, "Off"]] },
  { key: "volume", label: "Volume", options: [[0.25, "25%"], [0.5, "50%"], [0.8, "80%"], [1, "100%"]] },
  { key: "clock24", label: "Clock", options: [[false, "12-hour"], [true, "24-hour"]] },
  { key: "twoPinchComplete", label: "Complete with", options: [[true, "Double pinch"], [false, "One pinch"]],
    note: "Double pinch prevents accidents" },
  { key: "doublePinchMs", label: "Double-pinch time",
    options: [[600, "Fast · 0.6s"], [800, "Normal · 0.8s"], [1000, "Relaxed · 1s"], [1300, "Very relaxed · 1.3s"]],
    note: "Time you get for the 2nd pinch" },
  { key: "autoHideSeconds", label: "Auto-hide",
    options: [[10, "After 10s"], [20, "After 20s"], [30, "After 30s"], [60, "After 1 min"], [0, "Never"]] },
  { key: "reminders", label: "Reminders", options: [[true, "On"], [false, "Off"]], note: "Water + stretch nudges" },
  { key: "timers", label: "Quest timers", options: [[true, "On"], [false, "Off"]],
    note: "Timed quests start a countdown" },
  { key: "restore", label: "Removed quests", action: true },
  { key: "reset", label: "Reset progress", action: true, danger: true, note: "Pinch twice: wipes level, gold + quests" },
];

function showSettingsScreen() {
  showScreen("settings");
  renderAll();
}

function currentSettingItem() {
  return SETTINGS_ITEMS[ui.settingsIndex];
}

function settingValueLabel(item) {
  if (item.action) return "";
  const option = item.options.find(([value]) => value === settings[item.key]);
  return option ? option[1] : String(settings[item.key]);
}

function browseSettings(direction) {
  const count = SETTINGS_ITEMS.length;
  ui.settingsIndex = (ui.settingsIndex + direction + count) % count;
  Sound.play("click", { direction });
  renderAll();
}

// Pinch: step to the next option (or, for Reset, arm → reset).
function changeSetting() {
  const item = currentSettingItem();

  if (item.key === "restore") {
    restoreHiddenQuests();
    return;
  }

  if (item.key === "reset") {
    if (!confirmTwice("reset")) return;
    resetProgress(false);
    showToast("Progress reset");
    return;
  }

  const i = item.options.findIndex(([value]) => value === settings[item.key]);
  settings[item.key] = item.options[(i + 1) % item.options.length][0];
  saveSettings();
  applySettings();
  resetIdleTimer();
  renderAll();
  Sound.play("click");                 // also lets you hear the new volume
}
