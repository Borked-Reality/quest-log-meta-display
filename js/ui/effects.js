/* =========================================================
   Quest Log // HUD — Effects
   Flash, toast, particles, coins, sparkles, shake, count-up, XP bar animation.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- EFFECTS ---------- */

// Quick green flash over the whole HUD.
function flashScreen(color = "green") {
  el.flash.dataset.color = color;
  el.flash.classList.remove("is-active");
  void el.flash.offsetWidth;          // restart the CSS animation
  el.flash.classList.add("is-active");
}

// Small floating text, e.g. "+5 XP" after logging a glass of water.
function showToast(text) {
  el.toast.textContent = text;
  el.toast.classList.remove("is-active");
  void el.toast.offsetWidth;
  el.toast.classList.add("is-active");
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
  el.hud.style.setProperty("--shake", `${3 + strength * 3}px`);
  restartClass(el.hud, "is-shaking");
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
    coin.style.setProperty("--size", `${16 + Math.random() * 14}px`);
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
  void fill.offsetWidth;              // apply the snap before re-enabling transition
  fill.classList.remove("no-transition");
  renderXp();                         // new level number + title + progress
}
