/* =========================================================
   Quest Log // HUD — Shop
   Buying, equipping and live-previewing cosmetics.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- SHOP ---------- */
// Swipe up from Add Quest. One item per card: ◀ ▶ browses, and the item
// is PREVIEWED LIVE on the whole HUD while you look at it (theme, font,
// chest, coin rain, and a sound sample) — try before you buy.
// Pinch: Buy (two pinches — it's your gold) → it equips right away.
// Owned items: pinch to Equip. Leaving the shop puts back what's equipped.

function isOwned(item) {
  return item.price === 0 || player.unlocks.includes(item.id);
}

function isEquipped(item) {
  return player.equipped[item.kind] === item.value;
}

function currentShopItem() {
  return SHOP_ITEMS[ui.shopIndex];
}

// Applies the equipped cosmetics, optionally with one kind overridden
// (a preview), e.g. applyCosmetics({ theme: "vapor" }).
function applyCosmetics(preview = {}) {
  const look = { ...player.equipped, ...preview };
  const root = document.documentElement;
  root.dataset.theme = look.theme;
  root.dataset.font = look.font;
  el.chestSvg.dataset.skin = look.chest;
  ui.coinGlyph = look.coin;
  Sound.setPack(look.sound);
  setRainbow(look.theme === "rainbow");
}

// Rainbow Road: cycles the accent colours (the same CSS variables every
// theme sets) round the colour wheel. Done in JS because a CSS filter
// (hue-rotate) didn't change anything on the glasses.
const RAINBOW_CYCLE_MS = 8000;          // one trip round the colour wheel
const RAINBOW_VARS = [["--green", 0], ["--gold", 60], ["--cyan", 180], ["--purple", 270]];

function setRainbow(on) {
  const root = document.documentElement;
  clearInterval(ui.rainbowTimer);
  ui.rainbowTimer = null;
  if (!on) {
    RAINBOW_VARS.forEach(([name]) => root.style.removeProperty(name));
    return;
  }
  const paint = () => {
    if (document.hidden || ui.idle) return;          // display off / HUD hidden: skip
    const hue = ((Date.now() % RAINBOW_CYCLE_MS) / RAINBOW_CYCLE_MS) * 360;
    RAINBOW_VARS.forEach(([name, offset]) => {
      root.style.setProperty(name, `hsl(${Math.round(hue + offset) % 360}, 95%, 64%)`);
    });
  };
  paint();
  ui.rainbowTimer = setInterval(paint, 250);         // 4×/s: each repaint restyles the whole HUD
}

function showShopScreen() {
  showScreen("shop");
  renderAll();
  previewShopItem();
}

function browseShop(direction) {
  el.screens.shop.classList.remove("is-bought");   // stamp belongs to the last item
  const count = SHOP_ITEMS.length;
  ui.shopIndex = (ui.shopIndex + direction + count) % count;
  Sound.play("click", { direction });
  renderAll();
  previewShopItem();
}

// Try it on: the HUD changes to the item you're looking at.
function previewShopItem() {
  const item = currentShopItem();
  applyCosmetics({ [item.kind]: item.value });
  clearTimeout(ui.shopPreviewTimer);
  if (item.kind === "sound") {
    ui.shopPreviewTimer = setTimeout(() => {
      Sound.play("complete");
      setTimeout(() => Sound.play("coin"), 450);
    }, 250);
  }
  if (item.kind === "coin") spawnCoins(8, 50, 72);
  if (item.kind === "chest") restartClass(el.shopChest, "is-bouncing");
}

// Pinch on a shop card.
function shopAction() {
  const item = currentShopItem();
  if (isOwned(item)) {
    if (!isEquipped(item)) equipItem(item);
    return;
  }
  // Achievement-only: can't be bought.
  if (item.price == null) {
    const a = ACHIEVEMENTS.find((x) => x.id === item.achievement);
    Sound.play("disarm");
    showToast(a && !a.secret ? `Earn it: ${a.desc}` : "Earn it: it's a secret 🤫");
    return;
  }
  if (player.gold < item.price) {
    Sound.play("disarm");
    showToast(`Need ${item.price - player.gold} more ◆`);
    return;
  }
  if (confirmTwice("buy", item.id)) buyItem(item);
}

function equipItem(item) {
  player.equipped[item.kind] = item.value;
  saveProgress();
  applyCosmetics();
  Sound.play("questAdded");
  showToast("Equipped!");
  renderAll();
}

// Ka-ching! Pay, unlock, equip, celebrate.
function buyItem(item) {
  player.gold -= item.price;
  player.lifetime.goldSpent += item.price;
  player.unlocks.push(item.id);
  player.equipped[item.kind] = item.value;
  saveProgress();
  applyCosmetics();

  Sound.play("purchase");
  flashScreen("gold");
  shakeHud(1);
  spawnCoins(14, 50, 65);
  spawnSparkles(12, "var(--gold)");
  restartClass(el.screens.shop, "is-bought");        // "UNLOCKED!" stamp
  setTimeout(() => el.screens.shop.classList.remove("is-bought"), 1700);
  renderAll();
}
