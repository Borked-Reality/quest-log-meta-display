/* =========================================================
   Quest Log // HUD — Reward screens
   Quest Complete, LEVEL UP and the treasure chest — the timed celebrations.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

// The celebration is a short, timed sequence (sound and visuals line up):
//   0ms    impact + flash + particles + arpeggio
//   150ms  XP counts up, ticking as it climbs
//   700ms  gold pops in with a coin "cha-ching"   (CSS delay matches)
// If you levelled up, the XP bar fills and glows gold, then the
// LEVEL UP screen takes over.
// gains: { xp, gold, xpMult, goldMult } after power-ups.
function showCompleteScreen(quest, levelsGained, combo = 1, gains = { xp: quest.xp, gold: quest.gold, xpMult: 1, goldMult: 1 }) {
  el.completeTitle.textContent = quest.title;
  el.completeGold.textContent = gains.gold;
  el.completeXp.textContent = "0";

  // "⚡ ×1.5 XP" when a power-up boosted this reward
  const boosts = [];
  if (gains.xpMult > 1) boosts.push(`×${gains.xpMult} XP`);
  if (gains.goldMult > 1) boosts.push(`×${gains.goldMult} gold`);
  el.completeBoost.hidden = boosts.length === 0;
  el.completeBoost.textContent = `⚡ ${boosts.join("  ")}`;
  el.comboBanner.hidden = combo < 2;
  el.comboBanner.textContent = `COMBO ×${combo}`;

  showScreen("complete");
  renderControls();
  renderStats();

  Sound.play("complete", { combo });
  flashScreen();
  spawnParticles("var(--green)", 18);
  animateXpBar(levelsGained);

  setTimeout(() => {
    countUp(el.completeXp, gains.xp, 550, (i) => Sound.play("tick", { i }));
  }, 150);

  setTimeout(() => Sound.play("coin"), 700);

  // Level up: move on to the fanfare a little sooner.
  ui.advanceTimer = setTimeout(advanceFromRewards, levelsGained > 0 ? 1700 : CONFIG.COMPLETE_SCREEN_MS);
}

// LEVEL UP: the big one. Timed to the fanfare in SOUNDS.levelUp:
//   0ms     drum roll; "LEVEL UP!" drops in letter by letter; rays fade in
//   600ms   three-note brass pickup
//   960ms   IMPACT: big chord + cymbal. Number flips old → new, shockwave
//           ring, gold flash, particle burst, XP bar resets
//   1500ms  chord, 1740ms chord (small pulses on the number)
//   2000ms  final chord: new title + bonus gold pop in, confetti burst
function showLevelUpScreen({ from, to, bonusGold, newTitle }) {
  const screen = el.screens.levelUp;

  // "LEVEL UP!" as separate letters so they can drop in one by one.
  el.levelUpHeading.innerHTML = "";
  "LEVEL UP!".split("").forEach((ch, i) => {
    const span = document.createElement("span");
    span.textContent = ch === " " ? " " : ch;
    span.style.setProperty("--i", i);
    el.levelUpHeading.appendChild(span);
  });

  el.levelUpNumber.textContent = from;
  el.levelUpTitle.textContent = newTitle
    ? `New title: ${newTitle}`
    : `Next level: ${xpNeededFor(to)} XP`;
  el.levelUpBonus.textContent = `+${bonusGold} ◆ level bonus`;

  screen.classList.remove("is-impact", "is-pulse");
  showScreen("levelUp");
  renderControls();

  Sound.play("levelUp");

  const at = (ms, fn) => ui.effectTimers.push(setTimeout(fn, ms));

  at(960, () => {
    el.levelUpNumber.textContent = to;
    restartClass(screen, "is-impact");
    flashScreen("gold");
    spawnParticles("var(--gold)", 40);
    settleXpBar();
    renderStats();
  });
  at(1500, () => restartClass(screen, "is-pulse"));
  at(1740, () => restartClass(screen, "is-pulse"));
  at(2000, () => {
    ["var(--gold)", "var(--green)", "var(--cyan)", "var(--purple)"].forEach((c) => spawnParticles(c, 10));
  });

  ui.advanceTimer = setTimeout(advanceFromRewards, CONFIG.LEVEL_UP_SCREEN_MS);
}

// Removes and re-adds a class so its CSS animation plays again.
function restartClass(node, className) {
  node.classList.remove(className);
  void node.getBoundingClientRect();    // forces a reflow (works for SVG too)
  node.classList.add(className);
}

// TREASURE CHEST (Vampire Survivors style, deliberately over the top).
// Timeline (ms from the start):
//   0       chest falls in
//   330     THUD: screen shake + dust
//   450     rattle #1 — rays start turning behind it, chest glows
//   800     rattle #2, faster and brighter
//   1150    BURST OPEN: white flash, shockwave, a fan of light beams in
//           the rarity colour (the first hint!), coin explosion
//   1500    slot reel spins to chiptune music, chase lights racing round
//           the frame, a fountain of coins; rarer prizes spin longer
//   +spin   LANDS: shake (harder for rarer), shockwave, fireworks,
//           "NICE!" / "BIG WIN!" / rainbow "JACKPOT!!", payout bells
//   +900    RESULT: prize card with a spinning halo, bouncing rarity
//           title, "NEW!" sticker on a first find, sparkles, bonus gold
// No skipping with a pinch — the show IS the reward. (A swipe down still
// escapes: the item was already applied in completeQuest(), so nothing
// is lost.)
const REEL_ROW_PX = 64;
const RARITY_ORDER = ["common", "uncommon", "rare", "epic"];
const CHEST_SHOUTS = { common: "", uncommon: "NICE!", rare: "BIG WIN!", epic: "JACKPOT!!" };

function rarityColor(rarity) {
  return { common: "var(--text)", uncommon: "var(--green)", rare: "var(--gold)", epic: "var(--purple)" }[rarity];
}

function showChestScreen({ item, gold, isNew, note }) {
  const tier = RARITY_ORDER.indexOf(item.rarity);
  const spinMs = 2200 + tier * 450;
  const winnerIndex = 22 + tier * 4;
  ui.chest = { item, gold, isNew, tier, phase: "drop", raf: null, coinTimer: null, winnerIndex };

  const screen = el.screens.loot;
  screen.dataset.rarity = item.rarity;
  screen.classList.toggle("is-new", !!isNew);
  el.chestShout.textContent = CHEST_SHOUTS[item.rarity];
  setLetters(el.lootRarity, `${RARITIES[item.rarity].label.toUpperCase()}!`);
  el.lootIcon.textContent = item.icon;
  el.lootName.textContent = item.name;
  el.lootEffect.textContent = item.effect;
  el.chestNote.textContent = note || "";
  el.chestGold.textContent = "0";
  buildReel(item, winnerIndex);

  showScreen("loot");
  setChestPhase("drop");

  const color = rarityColor(item.rarity);
  const at = (ms, fn) => ui.effectTimers.push(setTimeout(fn, ms));

  at(330, () => {                                   // THUD
    Sound.play("chestDrop");
    shakeHud(1);
    spawnParticles("#8a7a66", 10, 50, 55);          // dust
  });
  at(450, () => { setChestPhase("rattle"); Sound.play("chestRattle"); });
  at(800, () => { setChestPhase("rattle2"); Sound.play("chestRattle", { fast: true }); });
  at(1150, () => {                                  // BURST OPEN
    setChestPhase("open");
    Sound.play("chestOpen", { tier });
    flashScreen("white");
    shakeHud(2);
    spawnRing(color);
    spawnParticles(color, 24, 50, 45);
    spawnCoins(16, 50, 50);
  });
  at(1500, () => startReel(spinMs));
  at(1500 + spinMs, landReel);
}

// The phase drives the CSS (data-phase) and the pinch label (Skip/Continue).
function setChestPhase(phase) {
  ui.chest.phase = phase;
  el.screens.loot.dataset.phase = phase;
  renderControls();
}

// Puts each letter in its own <span> so CSS can bounce them in a wave.
function setLetters(node, text) {
  node.innerHTML = "";
  text.split("").forEach((ch, i) => {
    const span = document.createElement("span");
    span.textContent = ch;
    span.style.setProperty("--i", i);
    node.appendChild(span);
  });
}

// Fills the reel with random items, the prize at `winnerIndex`, and
// sometimes an epic right next to it (the classic "so close!" tease).
function buildReel(prize, winnerIndex) {
  const strip = el.reelStrip;
  strip.innerHTML = "";
  const epics = LOOT_TABLE.filter((i) => i.rarity === "epic" && i.id !== prize.id);
  const teaseAt = Math.random() < 0.5 ? winnerIndex + (Math.random() < 0.5 ? -1 : 1) : -1;

  for (let i = 0; i <= winnerIndex + 1; i++) {
    let item = LOOT_TABLE[Math.floor(Math.random() * LOOT_TABLE.length)];
    if (i === winnerIndex) item = prize;
    else if (i === teaseAt && epics.length) item = epics[Math.floor(Math.random() * epics.length)];

    const row = document.createElement("div");
    row.className = "reel-row";
    row.dataset.rarity = item.rarity;
    const icon = document.createElement("span");
    icon.className = "reel-icon";
    icon.textContent = item.icon;
    const name = document.createElement("span");
    name.className = "reel-name";
    name.textContent = item.name;
    row.append(icon, name);
    strip.appendChild(row);
  }
  // Start with row 1 in the middle of the 3-row window.
  strip.style.transition = "none";
  strip.style.transform = "translateY(0px)";
}

// The chase-light bulbs around the reel frame (made once, at start-up).
function buildReelBulbs() {
  const perSide = 9;
  for (let i = 0; i < perSide * 2; i++) {
    const bulb = document.createElement("span");
    const top = i < perSide;
    const n = top ? i : i - perSide;
    bulb.className = "bulb";
    bulb.style.left = `${4 + (n * 92) / (perSide - 1)}%`;
    bulb.style.top = top ? "-7px" : "calc(100% - 3px)";
    // Bottom row runs backwards so the light "chases" round the frame.
    bulb.style.setProperty("--i", top ? n : perSide * 2 - 1 - n);
    el.reelFrame.appendChild(bulb);
  }
}

function reelTargetY() {
  return -(ui.chest.winnerIndex - 1) * REEL_ROW_PX;
}

// Spin: one long CSS transition that starts fast and eases out slowly.
// A frame loop watches the position and ticks once per item passing,
// while a coin fountain keeps going behind it.
function startReel(spinMs) {
  const strip = el.reelStrip;
  setChestPhase("spin");
  void strip.offsetWidth;                 // make sure the start position applies
  strip.style.transition = `transform ${spinMs}ms cubic-bezier(0.1, 0.7, 0.15, 1)`;
  strip.style.transform = `translateY(${reelTargetY()}px)`;
  Sound.play("slotMusic", { duration: spinMs });

  let lastRow = -1;
  const watch = () => {
    const transform = getComputedStyle(strip).transform;
    const y = transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
    const row = Math.round(-y / REEL_ROW_PX);
    if (row !== lastRow) {
      lastRow = row;
      Sound.play("reelTick", { i: row });
    }
    ui.chest.raf = requestAnimationFrame(watch);
  };
  ui.chest.raf = requestAnimationFrame(watch);

  // Coin fountain from both bottom corners of the reel.
  let side = 0;
  ui.chest.coinTimer = setInterval(() => {
    side = 1 - side;
    spawnCoins(2, side ? 22 : 78, 88);
    Sound.play("coinClink");
  }, 170);
}

// The reel stops on the prize. Bigger rarity = bigger everything.
function landReel() {
  const { item, tier } = ui.chest;
  const color = rarityColor(item.rarity);
  cancelAnimationFrame(ui.chest.raf);
  clearInterval(ui.chest.coinTimer);
  el.reelStrip.style.transition = "none";
  el.reelStrip.style.transform = `translateY(${reelTargetY()}px)`;
  Sound.stopMusic();
  setChestPhase("landed");

  Sound.play("reelLand");
  Sound.play("loot", { rarity: item.rarity });
  if (tier >= 1) Sound.play("payout", { tier });
  shakeHud(1 + tier);
  spawnRing(color);
  // (Counts are kept moderate: the glasses render at 30 Hz.)
  spawnParticles(color, 12 + tier * 6);
  spawnCoins(8 + tier * 5, 50, 60);

  // Rare and epic get fireworks around the screen.
  const bursts = [[], [], [[25, 25], [75, 25]], [[20, 20], [80, 20], [30, 70], [70, 70]]][tier];
  bursts.forEach(([x, y], i) => {
    ui.effectTimers.push(setTimeout(() => {
      spawnParticles(i % 2 ? "var(--gold)" : color, 9, x, y);
      Sound.play("firework");
    }, 150 + i * 160));
  });

  ui.effectTimers.push(setTimeout(showChestResult, 900 + tier * 150));
}

// Final card + bonus gold counting up + sparkles.
function showChestResult() {
  const { item, gold } = ui.chest;
  setChestPhase("result");
  ui.pendingReveal = null;                // now the header gold + chips can update
  renderStats();

  countUp(el.chestGold, gold, 500, (i) => Sound.play("tick", { i }));
  ui.effectTimers.push(setTimeout(() => Sound.play("coin"), 550));
  spawnSparkles(10 + ui.chest.tier * 4, rarityColor(item.rarity));
  spawnCoins(8, 50, 70);
  if (ui.chest.isNew) ui.effectTimers.push(setTimeout(() => Sound.play("newItem"), 350));

  ui.advanceTimer = setTimeout(advanceFromRewards, 3000);
}
