// The vertical stack: QUEST ▲ ADD ▲ SHOP ▲ PROFILE ▲ SETTINGS
import { prepare, state } from "../lib/helpers.mjs";

export default async function (t, page) {
  await prepare(page);

  for (const expected of ["add", "shop", "profile", "settings", "settings"]) {
    await page.key("ArrowUp");
    t.eq((await state(page)).screen, expected, `▲ → ${expected}`);
  }
  for (const expected of ["profile", "shop", "add", "quest"]) {
    await page.key("ArrowDown");
    t.eq((await state(page)).screen, expected, `▼ → ${expected}`);
  }

  await page.key("ArrowDown");
  t.ok((await state(page)).idle, "▼ on the board hides the HUD");
  await page.key("ArrowUp");
  const woke = await state(page);
  t.ok(!woke.idle && woke.screen === "quest", "▲ brings it back");

  await page.key("ArrowUp");
  t.eq((await state(page)).middle, "Back", "the Add page's middle hint says Back");
  await page.key("Escape");
  t.eq((await state(page)).screen, "quest", "middle pinch on Add → back to the board");

  await page.key("ArrowRight");
  await page.key("ArrowLeft");
  t.eq((await state(page)).screen, "quest", "◀ ▶ browse the board");
}
