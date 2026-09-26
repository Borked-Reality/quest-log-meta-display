/* =========================================================
   Quest Log // HUD — Rendering
   The `el` lookups, showScreen(), and drawing the HUD, hints and screens.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- UI RENDERING ---------- */
// All DOM lookups live here so the rest of the code never touches HTML ids.

const el = {
  hud: document.getElementById("hud"),
  screens: {
    quest: document.getElementById("screenQuest"),
    complete: document.getElementById("screenComplete"),
    levelUp: document.getElementById("screenLevelUp"),
    loot: document.getElementById("screenLoot"),
    allClear: document.getElementById("screenAllClear"),
    alert: document.getElementById("screenAlert"),
    add: document.getElementById("screenAdd"),
    settings: document.getElementById("screenSettings"),
    shop: document.getElementById("screenShop"),
  },

  clockTime: document.getElementById("clockTime"),
  clockDate: document.getElementById("clockDate"),
  timerBadge: document.getElementById("timerBadge"),

  questSchedule: document.getElementById("questSchedule"),
  questTimer: document.getElementById("questTimer"),
  questTimerTime: document.getElementById("questTimerTime"),
  questTimerFill: document.getElementById("questTimerFill"),

  draftExtras: document.getElementById("draftExtras"),

  settingLabel: document.getElementById("settingLabel"),
  settingValue: document.getElementById("settingValue"),
  settingNote: document.getElementById("settingNote"),
  settingPager: document.getElementById("settingPager"),

  addInput: document.getElementById("addInput"),
  addEntry: document.getElementById("addEntry"),
  addPreview: document.getElementById("addPreview"),
  draftType: document.getElementById("draftType"),
  draftTitle: document.getElementById("draftTitle"),
  draftXp: document.getElementById("draftXp"),
  draftGold: document.getElementById("draftGold"),
  gold: document.getElementById("goldValue"),
  streak: document.getElementById("streakValue"),

  questType: document.getElementById("questType"),
  questTitle: document.getElementById("questTitle"),
  questProgress: document.getElementById("questProgress"),
  questPips: document.getElementById("questPips"),
  questProgressText: document.getElementById("questProgressText"),
  questXp: document.getElementById("questXp"),
  questGold: document.getElementById("questGold"),
  questPager: document.getElementById("questPager"),

  completeTitle: document.getElementById("completeTitle"),
  completeXp: document.getElementById("completeXp"),
  completeGold: document.getElementById("completeGold"),
  levelUpHeading: document.getElementById("levelUpHeading"),
  levelUpNumber: document.getElementById("levelUpNumber"),
  levelUpTitle: document.getElementById("levelUpTitle"),
  levelUpBonus: document.getElementById("levelUpBonus"),
  levelTitle: document.getElementById("levelTitle"),
  comboBanner: document.getElementById("comboBanner"),

  lootRarity: document.getElementById("lootRarity"),
  lootIcon: document.getElementById("lootIcon"),
  lootName: document.getElementById("lootName"),
  lootEffect: document.getElementById("lootEffect"),
  reelStrip: document.getElementById("reelStrip"),
  reelFrame: document.getElementById("reelFrame"),
  chestShout: document.getElementById("chestShout"),
  chestSvg: document.getElementById("chestSvg"),
  shopKind: document.getElementById("shopKind"),
  shopIcon: document.getElementById("shopIcon"),
  shopChestSlot: document.getElementById("shopChestSlot"),
  shopChest: null,                  // a copy of the chest SVG, made at start-up
  shopName: document.getElementById("shopName"),
  shopDesc: document.getElementById("shopDesc"),
  shopPrice: document.getElementById("shopPrice"),
  shopPager: document.getElementById("shopPager"),
  chestNote: document.getElementById("chestNote"),
  chestGold: document.getElementById("chestGold"),
  completeBoost: document.getElementById("completeBoost"),
  buffBar: document.getElementById("buffBar"),

  alertLabel: document.getElementById("alertLabel"),
  alertTitle: document.getElementById("alertTitle"),
  alertDetail: document.getElementById("alertDetail"),

  glanceLabel: document.getElementById("glanceLabel"),
  glanceText: document.getElementById("glanceText"),

  level: document.getElementById("levelValue"),
  xpText: document.getElementById("xpText"),
  xpFill: document.getElementById("xpFill"),

  hintBrowse: document.getElementById("hintBrowse"),
  hintBrowseLabel: document.getElementById("hintBrowseLabel"),
  hintHide: document.getElementById("hintHide"),
  hintHideKey: document.getElementById("hintHideKey"),
  hintHideLabel: document.getElementById("hintHideLabel"),
  hintConfirm: document.getElementById("hintConfirm"),
  hintConfirmLabel: document.getElementById("hintConfirmLabel"),

  confirmButton: document.getElementById("confirmButton"),
  navButtons: document.querySelectorAll(".btn-nav"),
  soundToggle: document.getElementById("soundToggle"),
  clockButton: document.getElementById("clockButton"),
  soundPreview: document.getElementById("soundPreview"),

  toast: document.getElementById("toast"),
  flash: document.getElementById("flash"),
  particles: document.getElementById("particles"),
};

// Shows exactly one screen.
function showScreen(name) {
  const leavingShop = ui.screen === "shop" && name !== "shop";
  ui.screen = name;
  if (leavingShop) {
    clearTimeout(ui.shopPreviewTimer);
    el.screens.shop.classList.remove("is-bought");
    applyCosmetics();                    // end the preview
  }
  Object.entries(el.screens).forEach(([key, node]) => {
    node.hidden = key !== name;
  });
  // Any screen change cancels a half-done confirm or pending undo.
  if (ui.armed) { clearTimeout(ui.armed.timer); ui.armed = null; }
  if (ui.undo && name !== "quest") { clearTimeout(ui.undo.timer); ui.undo = null; }

  // Leaving the add card: drop focus so the text box stops taking keys.
  if (name !== "add" && document.activeElement === el.addInput) {
    el.addInput.value = "";
    el.addInput.blur();
  }
}

function renderAll() {
  renderStats();
  renderXp();
  renderQuest();
  renderControls();
  renderSoundToggle();
  renderClock();
  renderTimer();
}

// Header: "3:42 PM  THU 25 SEP"
function renderClock() {
  const now = clock();
  el.clockTime.textContent = formatTime(now);
  el.clockDate.textContent = formatDate(now);
}

// The countdown on the quest card + the small ⏱ badge in the header.
function renderTimer() {
  const timer = player.timer;
  el.timerBadge.hidden = !timer;
  if (timer) el.timerBadge.textContent = timer.done ? "⏱ Done" : `⏱ ${formatCountdown(timerRemaining(timer))}`;
  el.timerBadge.classList.toggle("is-paused", !!timer && timer.pausedRemaining != null);

  const quest = currentQuest();
  const show = ui.screen === "quest" && quest && !quest.completed && hasTimer(quest);
  el.questTimer.hidden = !show;
  el.screens.quest.classList.toggle("has-timer", !!show);
  if (!show) return;

  const own = timerFor(quest);
  const total = questMinutes(quest) * 60000;
  const remaining = own ? timerRemaining(own) : total;
  el.questTimerTime.textContent = own && own.done ? "Done!" : formatCountdown(remaining);
  el.questTimerFill.style.width = `${(1 - remaining / total) * 100}%`;
  el.questTimer.dataset.state = !own ? "ready" : own.done ? "done" : own.pausedRemaining != null ? "paused" : "running";
}

function renderStats() {
  el.gold.textContent = player.gold - ((ui.pendingReveal && ui.pendingReveal.gold) || 0);
  el.streak.textContent = player.streak;
  renderBuffs();
}

// Active power-ups as small chips by the XP bar: "☕ 12m", "🛡️ ×1".
// Shows up to 3; the rest become "+2".
function renderBuffs() {
  const chips = activeBuffs()
    .sort((a, b) => a.endsAt - b.endsAt)
    .filter((b, i, all) => all.findIndex((x) => x.id === b.id) === i)   // one chip per item
    .map((b) => `${b.icon} ${Math.ceil((b.endsAt - nowMs()) / 60000)}m`);
  if (player.streakShields > 0) chips.push(`🛡️ ×${player.streakShields}`);
  if (player.guaranteedDrops > 0) chips.push(`🗝️ ×${player.guaranteedDrops}`);
  const shown = chips.slice(0, 3);
  if (chips.length > 3) shown.push(`+${chips.length - 3}`);
  if (ui.pendingReveal) shown.length = 0;             // chest not opened yet
  const text = shown.join("  ");
  if (el.buffBar.textContent !== text) el.buffBar.textContent = text;   // cheap on every tick
  el.buffBar.hidden = shown.length === 0;
}

function renderXp() {
  const needed = xpNeededFor(player.level);
  el.level.textContent = player.level;
  el.levelTitle.textContent = titleFor(player.level);
  el.xpText.textContent = `${player.xp} / ${needed} XP`;
  el.xpFill.classList.remove("level-glow");
  el.xpFill.style.width = `${(player.xp / needed) * 100}%`;
}

function renderQuest() {
  const quest = currentQuest();
  if (!quest) return;

  el.questType.textContent = quest.completed ? "✓ COMPLETED" : QUEST_TYPE_LABELS[quest.type];
  el.questType.dataset.type = quest.completed ? "done" : quest.type;
  el.questTitle.textContent = quest.title;
  el.questTitle.classList.toggle("is-done", quest.completed);
  el.questXp.textContent = quest.xp;
  el.questGold.textContent = quest.gold;

  // Scheduled: "⏰ 3:00 PM" (red when overdue)
  const schedule = formatSchedule(quest);
  el.questSchedule.hidden = !schedule || quest.completed;
  el.questSchedule.textContent = schedule;
  el.questSchedule.classList.toggle("is-overdue", isOverdue(quest));

  // Counter quests: a pip per step + "3 / 8 glasses"
  el.questProgress.hidden = !isCounter(quest);
  if (isCounter(quest)) {
    const count = quest.completed ? quest.target : progressOf(quest);
    el.questPips.innerHTML = "";
    for (let i = 0; i < quest.target; i++) {
      const pip = document.createElement("span");
      pip.className = i < count ? "pip is-filled" : "pip";
      el.questPips.appendChild(pip);
    }
    el.questProgressText.textContent = `${count} / ${quest.target} ${quest.units}`;
  }

  // Position among quests currently on the board.
  const board = availableQuests();
  el.questPager.textContent = `${board.indexOf(quest) + 1} / ${board.length}`;
}

function isOnRewardScreen() {
  return ui.screen === "complete" || ui.screen === "levelUp" || ui.screen === "loot";
}

// "+1 Glass"
function stepLabel(quest) {
  return `+1 ${quest.unit.charAt(0).toUpperCase()}${quest.unit.slice(1)}`;
}

// What "confirm" (pinch / Enter) means on the current screen.
// Shared by the on-glasses hint and the browser test button.
function confirmLabel() {
  if (ui.armed) return { text: "Confirm!", enabled: true };
  if (ui.screen === "settings") return { text: currentSettingItem().action ? "Reset" : "Change", enabled: true };
  if (ui.screen === "shop") {
    const item = currentShopItem();
    if (isOwned(item)) return isEquipped(item) ? { text: "Equipped ✓", enabled: false } : { text: "Equip", enabled: true };
    if (player.gold < item.price) return { text: `Need ${item.price - player.gold} ◆`, enabled: true };
    return { text: `Buy ${item.price} ◆`, enabled: true };
  }
  if (ui.screen === "quest") {
    const quest = currentQuest();
    if (quest.completed) return { text: "Done ✓", enabled: false };
    const timer = timerFor(quest);
    if (hasTimer(quest) && !(timer && timer.done)) {
      if (!timer) return { text: `Start ${questMinutes(quest)} min`, enabled: true };
      return { text: timer.pausedRemaining != null ? "Resume" : "Pause", enabled: true };
    }
    if (isCounter(quest) && progressOf(quest) + 1 < quest.target) {
      return { text: stepLabel(quest), enabled: true };
    }
    return { text: isCounter(quest) ? "Finish" : "Complete", enabled: true };
  }
  if (ui.screen === "allClear") return { text: "New round", enabled: true };
  if (ui.screen === "add") return { text: ui.draftQuest ? "Add" : "Speak", enabled: true };
  if (ui.screen === "alert") {
    const alert = ui.currentAlert;
    const quest = alert && alert.questId && QUESTS.find((q) => q.id === alert.questId);
    if (quest && alert.action === "log" && !quest.completed) return { text: stepLabel(quest), enabled: true };
    if (quest && alert.action === "finish" && !quest.completed) return { text: "Finish", enabled: true };
    return { text: quest ? "View" : "OK", enabled: true };
  }
  // The chest can't be skipped: enjoy the show.
  if (ui.screen === "loot" && ui.chest && ui.chest.phase !== "result") {
    return { text: ui.chest.phase === "spin" ? "Spinning…" : "Opening…", enabled: false };
  }
  return { text: "Continue", enabled: true };   // reward screens
}

function renderControls() {
  const confirm = confirmLabel();
  const canBrowse = !isOnRewardScreen() && ui.screen !== "alert";

  // On-glasses gesture hints
  el.hintConfirmLabel.textContent = confirm.text;
  el.hintConfirm.classList.toggle("is-disabled", !confirm.enabled);
  el.hintBrowse.classList.toggle("is-off", !canBrowse);
  el.hintBrowseLabel.textContent =
    ui.screen === "add" && ui.draftQuest ? "Type" : ui.screen === "settings" ? "Setting" : "Browse";

  // Armed (after the 1st pinch): gold pinch hint + draining confirm bar.
  el.hud.classList.toggle("is-armed", !!ui.armed);
  el.hintConfirm.classList.toggle("is-armed", !!ui.armed);

  // Middle hint: normally "▼ Hide". It changes when there is something
  // better to do: "BACK Undo" after a +1 step, "BACK Stop" while this
  // quest's timer runs, "▼ Back" on the Add / Settings pages.
  const quest = currentQuest();
  const runningTimer = ui.screen === "quest" && quest && timerFor(quest) && !timerFor(quest).done;
  let middle = ["▼", "Hide"];
  if (ui.undo) middle = ["BACK", "Undo"];
  else if (runningTimer) middle = ["BACK", "Stop"];
  else if (["add", "shop", "settings"].includes(ui.screen)) middle = ["▼", "Back"];
  el.hintHideKey.textContent = middle[0];
  el.hintHideLabel.textContent = middle[1];
  el.hintHide.classList.toggle("is-undo", middle[0] === "BACK");

  // Add card: text box (entry) or the quest preview (after speaking).
  if (ui.screen === "add") renderAddScreen();
  if (ui.screen === "settings") renderSettingsScreen();
  if (ui.screen === "shop") renderShopScreen();

  // Browser test buttons
  el.confirmButton.textContent = confirm.text.toUpperCase();
  el.confirmButton.disabled = !confirm.enabled;
  el.navButtons.forEach((b) => { b.disabled = !canBrowse; });
}

function renderAddScreen() {
  const draft = ui.draftQuest;
  el.addEntry.hidden = !!draft;
  el.addPreview.hidden = !draft;
  if (!draft) return;
  el.draftType.textContent = `◀ ${QUEST_TYPE_LABELS[draft.type]} ▶`;
  el.draftType.dataset.type = draft.type;
  el.draftTitle.textContent = draft.title;
  el.draftXp.textContent = draft.xp;
  el.draftGold.textContent = draft.gold;

  // "⏰ Tomorrow 9:30 AM · ⏱ 10 min"
  const extras = [formatSchedule(draft), questMinutes(draft) ? `⏱ ${questMinutes(draft)} min timer` : ""]
    .filter(Boolean).join("  ·  ");
  el.draftExtras.hidden = !extras;
  el.draftExtras.textContent = extras;
}

function renderShopScreen() {
  const item = currentShopItem();
  el.shopKind.textContent = `🛒 ${SHOP_KIND_LABELS[item.kind]}`;
  el.shopIcon.textContent = item.icon;
  el.shopIcon.hidden = item.kind === "chest";
  el.shopChest.style.display = item.kind === "chest" ? "" : "none";
  el.shopChest.dataset.skin = item.value;
  el.shopName.textContent = item.name;
  el.shopDesc.textContent = item.desc;
  el.shopPager.textContent = `${ui.shopIndex + 1} / ${SHOP_ITEMS.length}`;

  const owned = isOwned(item);
  el.shopPrice.textContent = owned ? (isEquipped(item) ? "EQUIPPED ✓" : "OWNED") : `${item.price} ◆`;
  el.shopPrice.dataset.state = owned ? "owned" : player.gold >= item.price ? "buy" : "poor";
}

function renderSettingsScreen() {
  const item = currentSettingItem();
  el.settingLabel.textContent = item.label;
  el.settingValue.textContent = settingValueLabel(item);
  el.settingValue.hidden = !!item.action;
  el.settingNote.textContent = item.note || "Pinch to change";
  el.settingPager.textContent = `${ui.settingsIndex + 1} / ${SETTINGS_ITEMS.length}`;
  el.screens.settings.classList.toggle("is-danger", !!item.action);
}

// Briefly pulses a hint so the wearer sees their gesture registered.
function pulseHint(node) {
  node.classList.remove("is-pressed");
  void node.offsetWidth;              // restart the CSS animation
  node.classList.add("is-pressed");
}

function renderSoundToggle() {
  el.soundToggle.textContent = settings.soundEnabled ? "♪ SOUND ON" : "♪ SOUND OFF";
}

// The one-line view shown while idle.
function renderGlance() {
  const quest = currentQuest();
  if (ui.screen === "alert" && ui.currentAlert) {
    el.glanceLabel.textContent = `● ${ui.currentAlert.label}`;
    el.glanceText.textContent = ui.currentAlert.title;
    el.hud.dataset.glance = "alert";
  } else {
    // Idle glance: the time on top, then a running timer, or the quest.
    const timer = player.timer;
    const timerQuest = timer && QUESTS.find((q) => q.id === timer.questId);
    el.glanceLabel.textContent = formatTime(clock());
    if (timerQuest) {
      el.glanceText.textContent = `⏱ ${timer.done ? "Done" : formatCountdown(timerRemaining(timer))} · ${timerQuest.title}`;
    } else if (ui.screen === "allClear") {
      el.glanceText.textContent = "All quests clear";
    } else {
      el.glanceText.textContent = isCounter(quest) && !quest.completed
        ? `${quest.title} · ${progressOf(quest)}/${quest.target}`
        : quest.title;
    }
    el.hud.dataset.glance = "";
  }
}


function showAlertScreen(alert) {
  el.screens.alert.dataset.kind = alert.kind;
  el.alertLabel.textContent = alert.label;
  el.alertTitle.textContent = alert.title;
  el.alertDetail.textContent = alert.detail || "";
  showScreen("alert");
  renderAll();
}
