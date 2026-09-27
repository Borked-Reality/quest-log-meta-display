/* =========================================================
   Quest Log // HUD — Effects
   Flash, toast, particles, coins, sparkles, shake, count-up, XP bar animation.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- EFFECTS ---------- */

// The gold "time left" bar under the quest menu and confirmations. Uses
// the Web Animations API so restarting it never forces a layout.
function startDrain(ms) {
  el.hud.querySelectorAll(".confirm-fill").forEach((fill) => {
    fill.getAnimations().forEach((a) => a.cancel());
    fill.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], { duration: ms, fill: "forwards" });
  });
}

// Quick green flash over the whole HUD.
function flashScreen(color = "green") {
  el.flash.dataset.color = color;
  restartClass(el.flash, "is-active");
}

// Small floating text, e.g. "+5 XP" after logging a glass of water.
function showToast(text) {
  el.toast.textContent = text;
  restartClass(el.toast, "is-active");
}

// Burst of small squares flying out from the center.
// x / y: where the burst starts, as % of the screen area (default: centre).
function spawnParticles(color, count, x = 50, y = 38) {
  count = Math.round(count * CONFIG.BLING);
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    const angle = Math.random() * Math.PI * 2;
    const distance = 90 + Math.random() * 140;
    p.className = "particle";
    p.style.left = `${x}%`;
    p.style.top = `${y}%`;
    p.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    p.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    p.style.setProperty("--particle-color", color);
    p.style.animationDelay = `${Math.random() * 80}ms`;
    el.particles.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}

// ----- Extra bling (used by the treasure chest) -----
// Big motion is skipped for people who ask their device for less motion.
const REDUCED_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Shakes the whole HUD. strength: 1 = small bump, 3 = big hit.
function shakeHud(strength = 1) {
  if (REDUCED_MOTION) return;
  // A Web Animation, not a class: changing a class or variable on .hud
  // makes the glasses restyle all ~300 elements inside it.
  const d = 3 + strength * 3;
  const at = (offset, x, y) => ({ offset, translate: `${x * d}px ${y * d}px` });
  el.hud.animate(
    [at(0, 0, 0), at(0.15, -1, 0.5), at(0.3, 1, -0.5), at(0.45, -0.7, 0), at(0.6, 0.6, 0.4), at(0.8, -0.3, 0), at(1, 0, 0)],
    { duration: 320, easing: "linear" },
  );
}

// Gold coins (◆) that fly up from (x%, y%) and fall with gravity.
function spawnCoins(count, x = 50, y = 75) {
  if (REDUCED_MOTION) return;
  count = Math.round(count * CONFIG.BLING);
  for (let i = 0; i < count; i++) {
    const coin = document.createElement("span");
    coin.className = "coin";
    coin.textContent = ui.coinGlyph || "◆";
    if (!/^[◆★]$/.test(coin.textContent)) coin.classList.add("is-emoji");
    coin.style.left = `${x + (Math.random() - 0.5) * 20}%`;
    coin.style.top = `${y}%`;
    coin.style.setProperty("--dx", `${(Math.random() - 0.5) * 380}px`);
    coin.style.setProperty("--peak", `${-120 - Math.random() * 170}px`);
    coin.style.setProperty("--s", (16 + Math.random() * 14) / 24);
    coin.style.animationDelay = `${Math.random() * 120}ms`;
    el.particles.appendChild(coin);
    setTimeout(() => coin.remove(), 1400);
  }
}

// An expanding ring from the centre (a shockwave).
function spawnRing(color, y = 45) {
  const ring = document.createElement("span");
  ring.className = "shock-ring";
  ring.style.top = `${y}%`;
  ring.style.setProperty("--ring-color", color);
  el.particles.appendChild(ring);
  setTimeout(() => ring.remove(), 800);
}

// Twinkling ✦ stars at random spots.
function spawnSparkles(count, color = "var(--text)") {
  count = Math.round(count * CONFIG.BLING);
  for (let i = 0; i < count; i++) {
    const star = document.createElement("span");
    star.className = "sparkle";
    star.textContent = "✦";
    star.style.left = `${8 + Math.random() * 84}%`;
    star.style.top = `${5 + Math.random() * 80}%`;
    star.style.setProperty("--sparkle-color", color);
    star.style.animationDelay = `${Math.random() * 600}ms`;
    el.particles.appendChild(star);
    setTimeout(() => star.remove(), 1500);
  }
}

// Animates a number from 0 up to `target`.
// onTick(i) fires as the number climbs (at most every 45ms), so a sound
// can tick along with it; i counts up from 0.
function countUp(node, target, duration, onTick) {
  const start = performance.now();
  let shown = 0;
  let ticks = 0;
  let lastTickAt = 0;
  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(target * eased);
    if (value !== shown) {
      shown = value;
      node.textContent = value;
      if (onTick && now - lastTickAt >= 45) {
        lastTickAt = now;
        onTick(ticks++);
      }
    }
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Fills the XP bar. On level-up it fills to 100%, glows gold, and HOLDS
// there (still showing the old level) until the LEVEL UP screen's
// impact calls settleXpBar().
function animateXpBar(levelsGained) {
  if (levelsGained === 0) {
    renderXp();
    return;
  }
  // Keep showing the OLD level (full bar) so the reveal isn't spoiled.
  const oldLevel = player.level - levelsGained;
  el.level.textContent = oldLevel;
  el.levelTitle.textContent = titleFor(oldLevel);
  el.xpText.textContent = `${xpNeededFor(oldLevel)} / ${xpNeededFor(oldLevel)} XP`;
  el.xpFill.classList.add("level-glow");
  el.xpFill.style.width = "100%";
}

// Snap the full bar back to 0, then fill to the new level's progress.
function settleXpBar() {
  const fill = el.xpFill;
  fill.classList.add("no-transition");
  fill.style.width = "0%";
  // Let a frame show the empty bar, then fill it (no forced layout).
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.classList.remove("no-transition");
    renderXp();                       // new level number + title + progress
  }));
}

// ----- Reward warm-up -----
// The first chest / level-up of a session is slow to lay out on the glasses
// (fonts, emoji and ~30 reel rows seen for the first time: well over a
// second, measured). So while the app sits idle after start-up, lay those
// screens out once, hidden. One small step per task, so a swipe in the
// middle never waits long. The real rewards then reuse the work.
function warmUpRewards() {
  // Idle callbacks can be starved; the timeout makes sure each step still runs.
  const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 500 }) : setTimeout(fn, 100));
  const layOut = (screen) => {
    screen.classList.add("is-warming");
    void screen.offsetHeight;               // lay it out now, while nothing else is happening
    screen.classList.remove("is-warming");
  };
  const steps = [];
  // The chest on its own, then a reel row for every loot item (8 per step).
  steps.push(() => { el.reelStrip.replaceChildren(); layOut(el.screens.loot); });
  for (let i = 0; i < LOOT_TABLE.length; i += 8) {
    const rows = LOOT_TABLE.slice(i, i + 8);
    steps.push(() => { el.reelStrip.replaceChildren(...rows.map(reelRow)); layOut(el.screens.loot); });
  }
  steps.push(() => el.reelStrip.replaceChildren());
  // Level up (every digit the big number can show), with a coin in flight.
  steps.push(() => {
    el.levelUpNumber.textContent = "0123456789";
    const coin = document.createElement("span");
    coin.className = "coin";
    coin.textContent = ui.coinGlyph || "◆";
    coin.style.visibility = "hidden";
    el.particles.appendChild(coin);
    layOut(el.screens.levelUp);
    coin.remove();
    el.levelUpNumber.textContent = "";
  });
  steps.push(() => layOut(el.screens.complete));

  const next = () => {
    if (["complete", "levelUp", "loot"].includes(ui.screen)) return;  // real rewards took over: stop
    steps.shift()();
    if (steps.length) idle(next);
  };
  idle(next);
}
