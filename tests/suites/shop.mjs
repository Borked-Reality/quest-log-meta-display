// Shop: live preview, two-pinch buy, equip, preview ends when you leave.
import { prepare } from "../lib/helpers.mjs";

const look = (page) => page.eval(`[document.documentElement.dataset.theme, document.documentElement.dataset.font]`);

export default async function (t, page, shot) {
  await prepare(page);
  await page.eval("player.gold = 500; renderStats(); true");

  await page.key("ArrowUp");
  await page.key("ArrowUp");
  t.eq(await page.eval("ui.screen"), "shop", "▲▲ opens the shop");
  await page.key("ArrowRight");
  await page.key("ArrowRight");
  await page.key("ArrowRight");
  t.eq(await page.eval("currentShopItem().id"), "theme-vapor", "◀ ▶ browses items");
  t.eq((await look(page))[0], "vapor", "the HUD previews the theme live");
  await shot("preview");

  await page.key("Enter");
  t.eq(await page.eval("player.gold"), 500, "one pinch doesn't buy");
  await page.sleep(300);
  await page.key("Enter");
  t.eq(await page.eval("[player.gold, player.unlocks.includes('theme-vapor'), player.equipped.theme]"), [250, true, "vapor"],
    "2nd pinch buys and equips it");
  t.eq(await page.eval("el.hintConfirmLabel.textContent"), "Equipped ✓", "…shown as equipped");
  t.eq(await page.eval("player.lifetime.goldSpent"), 250, "gold spent is recorded");

  // Preview something else, then leave: back to what's equipped
  await page.eval(`ui.shopIndex = SHOP_ITEMS.findIndex((i) => i.id === "font-pixel"); renderAll(); previewShopItem(); true`);
  t.eq((await look(page))[1], "pixel", "fonts preview live too");
  await page.key("ArrowDown");
  t.eq(await look(page), ["vapor", "system"], "leaving the shop ends the preview");

  // Can't afford
  await page.key("ArrowUp");
  await page.eval(`ui.shopIndex = SHOP_ITEMS.findIndex((i) => i.id === "chest-crystal"); renderAll(); true`);
  await page.key("Enter");
  t.ok((await page.eval("el.toast.textContent")).startsWith("Need"), "too expensive → 'Need … more ◆'");
  t.ok(await page.eval("!ui.armed"), "…and nothing is armed");

  // Re-equip a free default
  await page.eval(`ui.shopIndex = SHOP_ITEMS.findIndex((i) => i.id === "theme-dracula"); renderAll(); true`);
  await page.key("Enter");
  t.eq(await page.eval("player.equipped.theme"), "dracula", "owned items equip with one pinch");
}
