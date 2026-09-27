/* =========================================================
   Quest Log // HUD — Shop
   Buying, equipping and live-previewing cosmetics.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- SHOP ---------- */
// Swipe up from Add Quest. Two levels:
//   1. CATEGORY CARDS (Themes, Fonts, Sound Packs, Chest Skins, Coin Rain):
//      ◀ ▶ picks one (it shows owned / equipped / what you can afford),
//      pinch opens it.
//   2. ITEMS of that kind, one per card: ◀ ▶ browses, and the item is
//      PREVIEWED LIVE on the whole HUD (theme, font, chest, coin rain, a
//      sound sample) — try before you buy. Pinch: Buy (two pinches — it's
//      your gold) → it equips right away. Owned items: pinch to Equip.
//      Middle pinch / swipe down: back to the category cards.
// Leaving the shop (or a category) puts back what's equipped.

function isOwned(item) {
  return item.price === 0 || player.unlocks.includes(item.id);
}

function isEquipped(item) {
  return player.equipped[item.kind] === item.value;
}

function currentShopItem() {
  return SHOP_ITEMS[ui.shopIndex];
}

function currentShopCategory() {
  return SHOP_CATEGORIES[ui.shopCategoryIndex];
}

// What a category card shows: owned count, what's equipped, what you can buy.
function shopCategorySummary(kind) {
  const items = SHOP_ITEMS.filter((i) => i.kind === kind);
  return {
    total: items.length,
    owned: items.filter(isOwned).length,
    equipped: items.find(isEquipped),
    affordable: items.filter((i) => !isOwned(i) && i.price != null && i.price <= player.gold).length,
  };
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

// Arriving from Add Quest: the category cards. Coming back down from
// Profile (keepPlace): wherever you were.
function showShopScreen(keepPlace = false) {
  if (!keepPlace) ui.shopCategory = null;
  showScreen("shop");
  renderAll();
  if (ui.shopCategory) previewShopItem();
}

// ◀ ▶ on the category cards.
function browseShopCategories(direction) {
  const count = SHOP_CATEGORIES.length;
  ui.shopCategoryIndex = (ui.shopCategoryIndex + direction + count) % count;
  Sound.play("click", { direction });
  renderAll();
}

// Pinch on a category card: browse that kind, starting on what's equipped.
function openShopCategory(kind = currentShopCategory().kind) {
  const equipped = SHOP_ITEMS.find((i) => i.kind === kind && isEquipped(i));
  openShopItem((equipped || SHOP_ITEMS.find((i) => i.kind === kind)).id);
  Sound.play("show");
}

// Straight to one item (its category opens around it).
function openShopItem(id) {
  const index = SHOP_ITEMS.findIndex((i) => i.id === id);
  const item = SHOP_ITEMS[index];
  ui.shopCategory = item.kind;
  ui.shopCategoryIndex = SHOP_CATEGORIES.findIndex((c) => c.kind === item.kind);
  ui.shopIndex = index;
  if (ui.screen !== "shop") showScreen("shop");
  renderAll();
  previewShopItem();
}

// Middle pinch / swipe down inside a category: back to the category cards.
function closeShopCategory() {
  ui.shopCategory = null;
  clearTimeout(ui.shopPreviewTimer);
  el.screens.shop.classList.remove("is-bought");
  applyCosmetics();                              // end the preview
  renderAll();
}

// ◀ ▶ inside a category: the next item of the same kind (wraps round).
function browseShop(direction) {
  el.screens.shop.classList.remove("is-bought");   // stamp belongs to the last item
  const indexes = SHOP_ITEMS.map((item, i) => i).filter((i) => SHOP_ITEMS[i].kind === ui.shopCategory);
  const at = indexes.indexOf(ui.shopIndex);
  ui.shopIndex = indexes[(at + direction + indexes.length) % indexes.length];
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
