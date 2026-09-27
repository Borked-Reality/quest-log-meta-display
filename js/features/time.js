/* =========================================================
   Quest Log // HUD — Clock, timers, schedules
   Clock/date formatting, quest timers, scheduled quests, the 1-second ticker.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- CLOCK, TIMERS, SCHEDULES ---------- */
// • Clock + date in the header (12/24h from Settings).
// • Quests with a duration ("15-min walk", "for 10 minutes") get a
//   timer: pinch = start → pause/resume; middle pinch = stop. When it
//   runs out: chime + "TIME'S UP" alert → pinch opens the quest armed.
// • Scheduled quests: dueAt (one-off) or time "HH:MM" (daily). When the
//   time comes: "QUEST TIME" alert.
// A 1-second ticker keeps the clock and countdowns fresh; it stops when
// the display is off (visibilitychange).

// "3:05 PM" or "15:05"
function formatTime(date) {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  if (settings.clock24) return `${String(h).padStart(2, "0")}:${m}`;
  return `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

// "THU 25 SEP"
function formatDate(date) {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

// 9:41 or 1:02:03
function formatCountdown(ms) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

// When a scheduled quest is due, as a timestamp for today (or null).
function dueTimeOf(quest) {
  if (quest.dueAt) return quest.dueAt;
  if (quest.time) {
    const [h, m] = quest.time.split(":").map(Number);
    const d = clock();
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }
  return null;
}

// "⏰ 3:00 PM", "⏰ Tomorrow 9:30 AM", "⏰ Every day 8:00 AM", "⏰ Overdue · 3:00 PM"
function formatSchedule(quest) {
  const due = dueTimeOf(quest);
  if (!due) return "";
  const time = formatTime(new Date(due));
  if (quest.time) return `⏰ Every day ${time}`;
  const dueDay = dateKey(new Date(due));
  const today = dateKey(clock());
  if (dueDay > today) {
    const tomorrow = clock();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dueDay === dateKey(tomorrow) ? `⏰ Tomorrow ${time}` : `⏰ ${formatDate(new Date(due))} ${time}`;
  }
  if (!quest.completed && due < nowMs() - 60000) return `⏰ Overdue · ${time}`;
  return `⏰ ${time}`;
}

function isOverdue(quest) {
  const due = dueTimeOf(quest);
  return !!due && !quest.completed && due < nowMs() - 60000;
}

// Minutes of work in the quest ("Go for a 15-min walk" → 15), or 0.
function questMinutes(quest) {
  if (quest.minutes) return quest.minutes;
  const hours = quest.title.match(/(\d+)\s*-?\s*(hours?|hrs?)\b/i);
  if (hours) return Number(hours[1]) * 60;
  const minutes = quest.title.match(/(\d+)\s*-?\s*(minutes?|mins?)\b/i);
  return minutes ? Number(minutes[1]) : 0;
}

function hasTimer(quest) {
  return settings.timers && !isCounter(quest) && questMinutes(quest) > 0;
}

function timerFor(quest) {
  return player.timer && player.timer.questId === quest.id ? player.timer : null;
}

function timerRemaining(timer) {
  if (timer.done) return 0;
  if (timer.pausedRemaining != null) return timer.pausedRemaining;
  return Math.max(0, timer.endsAt - nowMs());
}

function startTimer(quest) {
  const durationMs = questMinutes(quest) * 60000;
  player.timer = { questId: quest.id, durationMs, endsAt: nowMs() + durationMs, pausedRemaining: null, done: false };
  saveProgress();
  Sound.play("timerStart");
  renderAll();
}

function togglePauseTimer() {
  const timer = player.timer;
  if (timer.pausedRemaining != null) {
    timer.endsAt = nowMs() + timer.pausedRemaining;
    timer.pausedRemaining = null;
    Sound.play("timerStart");
  } else {
    timer.pausedRemaining = timerRemaining(timer);
    Sound.play("disarm");
  }
  saveProgress();
  renderAll();
}

function stopTimer() {
  player.timer = null;
  saveProgress();
  Sound.play("disarm");
  showToast("Timer stopped");
  renderAll();
}

function finishTimer() {
  const timer = player.timer;
  timer.done = true;
  timer.pausedRemaining = null;
  player.counters.timersFinished += 1;
  saveProgress();
  const quest = QUESTS.find((q) => q.id === timer.questId);
  Sound.play("timerDone");
  if (!quest) return;
  renderAll();
  notify({
    gremlin: "timesUp",
    kind: "quest",
    label: "⏱ TIME'S UP",
    title: quest.title,
    detail: "Pinch to finish the quest",
    questId: quest.id,
    action: "finish",
  });
}

// "QUEST TIME" alerts for scheduled quests (once each; daily ones once a day).
function checkSchedules() {
  QUESTS.forEach((quest) => {
    if (quest.completed || !isAvailable(quest)) return;
    const due = dueTimeOf(quest);
    const key = `${quest.time ? "time" : "due"}:${quest.id}`;
    if (!due || nowMs() < due || player.announcedQuestIds.includes(key)) return;
    player.announcedQuestIds.push(key);
    saveProgress();
    notify({
      gremlin: "questTime",
      kind: "quest",
      label: "⏰ QUEST TIME",
      title: quest.title,
      detail: `+${quest.xp} XP   +${quest.gold} ◆`,
      questId: quest.id,
    });
  });
}

// Every second: clock, countdowns, timer end.
function tick() {
  const timer = player.timer;
  if (timer && !timer.done && timer.pausedRemaining == null && timer.endsAt <= nowMs()) finishTimer();
  renderClock();
  renderTimer();
  renderBuffs();                           // power-up minutes left
  if (ui.idle) renderGlance();
}

function startTicker() {
  clearInterval(ui.tickTimer);
  ui.tickTimer = setInterval(tick, 1000);
  tick();
}

function stopTicker() {
  clearInterval(ui.tickTimer);
}
