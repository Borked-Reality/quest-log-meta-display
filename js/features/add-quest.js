/* =========================================================
   Quest Log // HUD — Add quest (voice)
   The Add Quest card and turning spoken text into a quest.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- ADDING QUESTS (voice / handwriting) ---------- */
// On the glasses, a normal <input> opens the built-in voice/handwriting
// composer when the wearer pinches it. The app can't open it by itself
// ("programmatic focus does not open the composer"), so the flow is:
//
//   ADD card (end of the board, or swipe up) → input gets focus
//   → wearer pinches → composer opens → they speak → text arrives
//   → PREVIEW card: swipe ◀ ▶ to change type, pinch = Add, back = retry
//
// In a desktop browser, just type into the box and press Enter.

const QUEST_TYPES = ["side", "main", "daily"];

// Base rewards by type. Time in the text ("10 minutes") adds XP.
function rewardFor(title, type) {
  const base = { side: 20, main: 30, daily: 15 }[type];
  let xp = base;
  const minutes = title.match(/(\d+)\s*(min|minute)/i);
  const hours = title.match(/(\d+)\s*(hr|hour)/i);
  if (minutes) xp = Math.min(60, Math.max(xp, 10 + Number(minutes[1])));
  if (hours) xp = Math.min(80, xp + 30 * Number(hours[1]));
  return { xp, gold: Math.max(2, Math.round(xp / 5)) };
}

// Turns spoken text into a quest draft, e.g.
//   "remind me to call mom"          → Side quest "Call mom"
//   "daily: stretch for 10 minutes"  → Daily quest, +20 XP
//   "important pay rent"             → Main quest "Pay rent"
// Returns null if there's nothing usable.
function parseQuestText(text) {
  let title = text.trim().replace(/[.!?]+$/, "");

  // Drop spoken lead-ins.
  title = title.replace(
    /^(please\s+)?(add\s+(a\s+)?(new\s+)?(quest|task)(\s+to)?|new\s+(quest|task)|remind\s+me\s+to|i\s+(need|have)\s+to|i\s+should)\b\s*[:,-]?\s*/i,
    ""
  );

  // Work out the type from keywords.
  let type = "side";
  if (/^daily\b/i.test(title) || /\b(every\s*day|each\s*day)\b/i.test(title)
      || /\bdaily\b(?=\s*(at\b|\d|$))/i.test(title)) type = "daily";
  else if (/^(main|important|urgent)\b/i.test(title) || /\b(important|urgent|asap)\b/i.test(title)) type = "main";

  // Remove the keywords themselves from the title.
  title = title
    .replace(/^(daily|main|side|important|urgent)(\s+quest)?\b\s*[:,-]?\s*/i, "")
    .replace(/\s*[,-]?\s*\b(every\s*day|each\s*day)\b/i, "")
    // "daily"/"asap" only at the end or right before a time ("daily at 8")
    .replace(/\s*[,-]?\s*\b(daily|asap)\b(?=\s*(at\b|\d|$))/i, "")
    .trim();

  // When? ("at 3pm", "tomorrow at 9:30", "in 20 minutes", "tonight")
  const schedule = extractSchedule(title, type === "daily");
  title = schedule.text.replace(/\s{2,}/g, " ").replace(/[\s,;:-]+$/, "").trim();
  if (!title) return null;

  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (title.length > 60) title = `${title.slice(0, 57)}…`;
  const draft = { title, type, ...rewardFor(title, type) };
  if (schedule.dueAt) draft.dueAt = schedule.dueAt;
  if (schedule.time) draft.time = schedule.time;
  return draft;
}

// Pulls a time out of spoken text and returns what's left.
//   { text, dueAt? }  one-off: a timestamp
//   { text, time? }   daily:   "HH:MM", repeats every day
function extractSchedule(text, isDaily) {
  let hour = null;
  let minute = 0;
  let dayOffset = 0;
  let relativeMs = null;

  let t = text
    // "in 20 minutes" / "in 2 hours"
    .replace(/\s*\bin\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i, (_, n, unit) => {
      relativeMs = Number(n) * (/^h/i.test(unit) ? 3600000 : 60000);
      return " ";
    })
    .replace(/\s*\btomorrow\b/i, () => { dayOffset = 1; return " "; })
    // "at noon" / "midnight"
    .replace(/\s*\b(?:at\s+)?(noon|midnight)\b/i, (_, word) => {
      hour = /noon/i.test(word) ? 12 : 0;
      return " ";
    })
    // "3pm", "at 9:30 am", "at 7 p.m."
    .replace(/\s*\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s?m\.?(?=\s|$|[,.;])/i, (_, h, m, ap) => {
      hour = Number(h) % 12 + (/p/i.test(ap) ? 12 : 0);
      minute = Number(m || 0);
      return " ";
    })
    // "at 15:00", "at 3" (no am/pm: 1–7 is probably afternoon)
    .replace(/\s*\bat\s+(\d{1,2})(?::(\d{2}))?\b/i, (_, h, m) => {
      hour = Number(h);
      minute = Number(m || 0);
      if (hour >= 1 && hour <= 7) hour += 12;
      return " ";
    })
    .replace(/\s*\b(tonight|this evening)\b/i, () => { if (hour === null) hour = 20; return " "; })
    .replace(/\s*\bthis morning\b/i, () => { if (hour === null) hour = 9; return " "; })
    .replace(/\s*\bthis afternoon\b/i, () => { if (hour === null) hour = 14; return " "; });

  if (relativeMs) return { text: t, dueAt: nowMs() + relativeMs };
  if (hour === null && !dayOffset) return { text };        // no time mentioned

  if (hour === null) hour = 9;                               // "tomorrow" alone → 9am
  if (isDaily) {
    return { text: t, time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
  }
  const due = clock();
  due.setDate(due.getDate() + dayOffset);
  due.setHours(hour, minute, 0, 0);
  if (!dayOffset && due.getTime() < nowMs()) due.setDate(due.getDate() + 1);   // already passed → tomorrow
  return { text: t, dueAt: due.getTime() };
}

function showAddScreen() {
  ui.draftQuest = null;
  el.addInput.value = "";
  showScreen("add");
  renderAll();
  // Focus is needed so the wearer's pinch opens the composer
  // (focus alone doesn't open it).
  el.addInput.focus({ preventScroll: true });
}

// Text arrived from the composer (or desktop typing).
function submitAddText() {
  const text = el.addInput.value;
  el.addInput.value = "";
  const draft = parseQuestText(text || "");
  if (!draft) {
    showToast("Didn't catch that");
    return;
  }
  if (ui.editingQuestId) applyEditDefaults(draft);    // keep the old type
  ui.draftQuest = draft;
  el.addInput.blur();
  Sound.play("click");
  renderAll();
}

// Swipe ◀ ▶ on the preview cycles Side → Main → Daily.
function cycleDraftType(direction) {
  const draft = ui.draftQuest;
  const i = QUEST_TYPES.indexOf(draft.type);
  draft.type = QUEST_TYPES[(i + direction + QUEST_TYPES.length) % QUEST_TYPES.length];
  Object.assign(draft, rewardFor(draft.title, draft.type));
  Sound.play("click", { direction });
  renderAll();
}

// Pinch on the preview: it's on the board.
function commitDraftQuest() {
  if (ui.editingQuestId) { commitEditedQuest(); return; }   // quest menu → Edit
  player.counters.questsAdded += 1;
  const quest = addQuestToBoard({ ...ui.draftQuest, id: `my-${Date.now()}` });
  ui.draftQuest = null;

  // Scheduled for a later day: it's saved but stays off the board until then.
  const laterDay = !isAvailable(quest);
  if (!laterDay) player.currentQuestIndex = QUESTS.indexOf(quest);
  saveProgress();

  showScreen(laterDay ? (availableQuests().every((q) => q.completed) ? "allClear" : "quest") : "quest");
  renderAll();
  Sound.play("questAdded");
  flashScreen();
  spawnParticles("var(--green)", 16);
  showToast(laterDay ? `Scheduled: ${formatSchedule(quest).replace("⏰ ", "")}` : "Quest added!");

  // Alerts that waited while you were adding show after the celebration.
  if (ui.alertQueue.length) {
    setTimeout(() => { if (ui.screen === "quest" || ui.screen === "allClear") showNextAlert(); }, 1500);
  }
}

// Middle pinch on the preview: throw it away and listen again.
function cancelDraftQuest() {
  ui.draftQuest = null;
  renderAll();
  el.addInput.focus({ preventScroll: true });
}

// Leaving the add card (browse away / back): return to the board.
function leaveAddScreen(direction) {
  ui.draftQuest = null;
  const board = availableQuests();
  const target = direction < 0 ? board[board.length - 1] : board[0];
  if (direction !== 0 && target) player.currentQuestIndex = QUESTS.indexOf(target);
  showHome();
}
