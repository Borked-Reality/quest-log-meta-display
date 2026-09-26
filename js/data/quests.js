/* =========================================================
   Quest Log // HUD — Quest data
   The starting quest board (daily + one-off quests). Add or edit quests here.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- QUEST DATA ---------- */
// Fields every quest has:
//   id, title, type ("daily" | "main" | "side"), xp, gold, completed
//
// Optional fields:
//   window: [fromHour, toHour]  → only on the board during those hours
//                                 (e.g. [5, 12] = 5:00 to 11:59)
//   target, unit, units, stepXp → a COUNTER quest. Each pinch logs one step
//                                 (+stepXp). Reaching target completes it.
//   reminder                    → nudges during the day (js/features/daily.js):
//       { kind: "pace",  everyMin } → remind if behind pace for the day
//       { kind: "still", afterMin } → remind after sitting still too long
//
// Daily quests reopen every morning. Edit, add, or remove freely.
const QUESTS = [
  // ----- Daily quests -----
  {
    id: "hydrate", title: "Drink water", type: "daily", xp: 40, gold: 8,
    target: 8, unit: "glass", units: "glasses", stepXp: 5,
    reminder: { kind: "pace", everyMin: 90, label: "HYDRATION CHECK", text: "Drink a glass of water" },
  },
  {
    id: "stretch", title: "Stretch breaks", type: "daily", xp: 40, gold: 8,
    target: 4, unit: "break", units: "breaks", stepXp: 5,
    reminder: { kind: "still", afterMin: 45, text: "Stand up & stretch" },
  },
  { id: "bed",       title: "Make your bed",          type: "daily", xp: 10, gold: 2, window: [5, 12] },
  { id: "breakfast", title: "Eat a real breakfast",   type: "daily", xp: 15, gold: 3, window: [5, 11] },
  { id: "vitamins",  title: "Take your vitamins",     type: "daily", xp: 10, gold: 2 },
  { id: "outside",   title: "Step outside for 10 min",type: "daily", xp: 20, gold: 4 },
  { id: "walk",      title: "Go for a 15-min walk",   type: "daily", xp: 25, gold: 5 },
  { id: "tidy",      title: "Tidy one surface",       type: "daily", xp: 15, gold: 3 },
  { id: "read",      title: "Read 10 pages",          type: "daily", xp: 15, gold: 3 },
  { id: "plan",      title: "Plan tomorrow's top 3",  type: "daily", xp: 20, gold: 4, window: [18, 24] },
  { id: "winddown",  title: "Screens off before bed", type: "daily", xp: 20, gold: 4, window: [21, 24] },

  // ----- One-off quests -----
  { id: "trash",  title: "Take out the trash", type: "main", xp: 25, gold: 5 },
  { id: "steps",  title: "Walk 500 steps",     type: "side", xp: 20, gold: 4 },
  { id: "dishes", title: "Clean 5 dishes",     type: "side", xp: 15, gold: 3 },
  { id: "email",  title: "Reply to an email",  type: "main", xp: 30, gold: 6 },
].map((quest) => ({ ...quest, completed: false }));

// Quests received later (simulator now; API / phone / AI later) are
// appended after the starting board.
const BASE_QUEST_COUNT = QUESTS.length;

const QUEST_TYPE_LABELS = {
  main: "MAIN QUEST",
  side: "SIDE QUEST",
  daily: "DAILY QUEST",
};

// Pool used by the "+ QUEST" dev button to simulate a quest arriving.
const INCOMING_QUEST_POOL = [
  { title: "Refill your water bottle",   type: "side", xp: 10, gold: 2 },
  { title: "Take a 2-minute breather",   type: "side", xp: 10, gold: 2 },
  { title: "Put away 3 things",          type: "side", xp: 15, gold: 3 },
  { title: "Text a friend back",         type: "main", xp: 20, gold: 4 },
  { title: "Water the plants",           type: "side", xp: 15, gold: 3 },
];
