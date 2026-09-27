// Shop: category cards → items, live preview, two-pinch buy, equip, and
// the preview ends when you leave.
import { prepare } from "../lib/helpers.mjs";

const look = (page) => page.eval(`[document.documentElement.dataset.theme, document.documentElement.dataset.font]`);
const card = (page) => page.eval(`[el.shopName.textContent, el.shopPager.textContent, el.hintConfirmLabel.textContent]`);

export default async function (t, page, shot) {
  await prepare(page);
  await page.eval("player.gold = 500; renderStats(); true");

  // ----- Category cards -----
  await page.key("ArrowUp");
  await page.key("ArrowUp");
  t.eq(await page.eval("ui.screen"), "shop", "▲▲ opens the shop");
  t.eq(await card(page), ["Themes", "1 / 5", "Open"], "…on the category cards (Themes first, pinch = Open)");
  t.ok((await page.eval("el.shopDesc.textContent")).includes("Equipped: Dracula"), "a category card shows what's equipped");
  t.ok(/\d+ you can buy/.test(await page.eval("el.shopDesc.textContent")), "…and how many you can afford");
  await shot("categories");
  await page.key("ArrowRight");
  t.eq((await card(page))[0], "Fonts", "▶ goes to the next category");
  await page.key("ArrowLeft");
  t.eq((await card(page))[0], "Themes", "◀ goes back");

  // ----- Inside a category -----
  await page.key("Enter");
  t.eq(await page.eval("currentShopItem().id"), "theme-dracula", "pinch opens Themes on what's equipped");
  const themes = await page.eval(`SHOP_ITEMS.filter((i) => i.kind === "theme").length`);
  t.eq(await page.eval("el.shopPager.textContent"), `1 / ${themes}`, "the pager counts only this category");
  await page.key("ArrowRight");
  await page.key("ArrowRight");
  await page.key("ArrowRight");
  t.eq(await page.eval("currentShopItem().id"), "theme-vapor", "◀ ▶ browses the themes");
  t.eq((await look(page))[0], "vapor", "the HUD previews the theme live");
  await shot("preview");
  await page.key("ArrowLeft");
  await page.key("ArrowLeft");
  await page.key("ArrowLeft");
  await page.key("ArrowLeft");
  t.eq(await page.eval("currentShopItem().kind"), "theme", "◀ from the first theme wraps round to the last theme, not another kind");
  for (let i = 0; i < 4; i++) await page.key("ArrowRight");     // last → Dracula → … → Vaporwave
  t.eq(await page.eval("currentShopItem().id"), "theme-vapor", "…and ▶ wraps back");

  // ----- Buy -----
  await page.key("Enter");
  t.eq(await page.eval("player.gold"), 500, "one pinch doesn't buy");
  await page.sleep(300);
  await page.key("Enter");
  t.eq(await page.eval("[player.gold, player.unlocks.includes('theme-vapor'), player.equipped.theme]"), [250, true, "vapor"],
    "2nd pinch buys and equips it");
  t.eq(await page.eval("el.hintConfirmLabel.textContent"), "Equipped ✓", "…shown as equipped");
  t.eq(await page.eval("player.lifetime.goldSpent"), 250, "gold spent is recorded");

  // ----- Back out: category → cards → Add -----
  await page.eval(`openShopItem("font-pixel"); true`);
  t.eq((await look(page))[1], "pixel", "fonts preview live too");
  await page.key("Escape");
  t.eq([await page.eval("ui.screen"), await page.eval("ui.shopCategory")], ["shop", null], "middle pinch: back to the category cards");
  t.eq(await look(page), ["vapor", "system"], "…and the preview ends");
  t.eq((await card(page))[0], "Fonts", "…on the category you were in");
  await page.key("Enter");
  await page.key("ArrowDown");
  t.eq(await page.eval("ui.shopCategory"), null, "swipe down inside a category also goes back to the cards");
  await page.key("ArrowDown");
  t.eq(await page.eval("ui.screen"), "add", "swipe down on the cards: back to Add Quest");

  // ----- Profile and back keeps your place -----
  await page.key("ArrowUp");
  t.eq(await page.eval("ui.shopCategory"), null, "coming up from Add Quest starts on the cards");
  await page.eval(`openShopItem("chest-gold"); true`);
  await page.key("ArrowUp");
  t.eq(await page.eval("ui.screen"), "profile", "▲ from inside a category goes to Profile");
  await page.key("ArrowDown");
  t.eq(await page.eval("currentShopItem().id"), "chest-gold", "…and ▼ comes back to the same item");

  // ----- Can't afford -----
  await page.eval(`openShopItem("chest-crystal"); true`);
  await page.key("Enter");
  t.ok((await page.eval("el.toast.textContent")).startsWith("Need"), "too expensive → 'Need … more ◆'");
  t.ok(await page.eval("!ui.armed"), "…and nothing is armed");

  // ----- Re-equip a free default -----
  await page.eval(`openShopItem("theme-dracula"); true`);
  await page.key("Enter");
  t.eq(await page.eval("player.equipped.theme"), "dracula", "owned items equip with one pinch");
}
