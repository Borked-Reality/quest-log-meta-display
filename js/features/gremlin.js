/* =========================================================
   Quest Log // HUD — The gremlin (sarcastic AI)
   Picks what the gremlin in your glasses says, and when.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- THE GREMLIN ---------- */
// It pokes at you on reward screens and alerts (a 👾 line). The "AI sass"
// setting decides how often: Off, Some (about half the time) or Lots.
// Specific moments (2 AM chores, overdue quests, level ups, item quips)
// always get a line unless sass is Off: those are the funny ones.
// The lines themselves are in js/data/gremlin-lines.js.

const SASS_CHANCE = { off: 0, some: 0.5, lots: 1 };
const RECENT_QUIPS_KEPT = 12;          // don't repeat any of the last 12 lines

// A line for this moment, or "" (sass off, or it stays quiet this time).
//   kind:   a key in GREMLIN_LINES, or an array of lines
//   vars:   values for the {placeholders}
//   always: skip the dice roll (still silent when sass is Off)
function quip(kind, vars = {}, { always = false } = {}) {
  const chance = SASS_CHANCE[settings.sass] ?? SASS_CHANCE.some;
  if (!chance || (!always && Math.random() >= chance)) return "";
  const lines = Array.isArray(kind) ? kind : GREMLIN_LINES[kind];
  if (!lines || !lines.length) return "";
  const line = pickFreshLine(lines);
  return line.replace(/\{(\w+)\}/g, (_, key) => (vars[key] ?? ""));
}

// A random line the gremlin hasn't said lately.
function pickFreshLine(lines) {
  const fresh = lines.filter((line) => !ui.recentQuips.includes(line));
  const pool = fresh.length ? fresh : lines;
  const line = pool[Math.floor(Math.random() * pool.length)];
  ui.recentQuips.push(line);
  if (ui.recentQuips.length > RECENT_QUIPS_KEPT) ui.recentQuips.shift();
  return line;
}

// Puts a line on screen (👾 + text), or hides the element when there's none.
function showQuip(node, text) {
  node.textContent = text ? `👾 ${text}` : "";
  node.hidden = !text;
}

// "45 min" / "3 hours"
function lateText(ms) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 90) return `${minutes} min`;
  return `${Math.round(minutes / 60)} hours`;
}

// Quest complete: the most specific thing that fits.
function completeQuip(quest, combo) {
  // Your own quests have ids like "my-<time added>".
  const addedAt = /^my-\d+$/.test(quest.id) ? Number(quest.id.slice(3)) : 0;
  const secs = addedAt ? Math.round((Date.now() - addedAt) / 1000) : Infinity;
  if (secs < 90) return quip("completeFast", { secs }, { always: true });

  const due = dueTimeOf(quest);
  if (due && nowMs() - due > 5 * 60000) {
    return quip("completeOverdue", { late: lateText(nowMs() - due) }, { always: true });
  }

  const hour = clock().getHours();
  const time = formatTime(clock());
  if (hour >= 23 || hour < 4) return quip("completeLate", { time }, { always: true });
  if (hour >= 5 && hour < 8) return quip("completeEarly", { time }, { always: true });
  if (combo >= 3) return quip("completeCombo", { combo });
  return quip("complete");
}

// Chest result: the item's own line if it has one, else one for its rarity.
function chestQuip(item) {
  if (item.quip) return quip([item.quip], {}, { always: true });
  const kind = `chest${item.rarity[0].toUpperCase()}${item.rarity.slice(1)}`;
  return quip(kind, {}, { always: item.rarity === "epic" });
}
