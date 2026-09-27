// The pinch detector, fed the way the glasses feed it: a pointer press /
// release (touch-action: none), sometimes together with an Enter key for
// the very same pinch.
import { prepare, showQuest, noLoot } from "../lib/helpers.mjs";

const done = (page, id) => page.eval(`QUESTS.find((q) => q.id === ${JSON.stringify(id)}).completed`);

export default async function (t, page) {
  await prepare(page);
  await noLoot(page);
  await showQuest(page, "tidy");

  t.eq(await page.eval("getComputedStyle(document.body).touchAction"), "none",
    "the page asks for the pinch as a pointer stream (touch-action: none)");

  // Pointer hold → menu
  await page.pointer("down");
  await page.sleep(650);
  await page.pointer("up");
  await page.sleep(100);
  t.eq(await page.eval("isQuestMenuOpen() ? ui.armed.actions.map((a) => a.label) : null"), ["Edit", "Remove"],
    "a held pointer pinch opens the menu");
  await page.key("Escape");

  // Pointer double pinch → complete
  for (let i = 0; i < 2; i++) {
    await page.pointer("down");
    await page.sleep(60);
    await page.pointer("up");
    await page.sleep(120);
  }
  t.ok(await done(page, "tidy"), "two quick pointer pinches complete the quest");
  await page.eval("skipRewards(); true");

  // One pinch reported as BOTH a pointer and an Enter key = one pinch
  await showQuest(page, "read");
  await page.pointer("down");
  await page.sleep(60);
  await page.pointer("up");
  await page.key("Enter", { wait: 0 });               // the redundant key copy, right after
  await page.sleep(150);
  t.ok(!(await done(page, "read")), "a pinch sent as pointer + key counts once (no accidental double)");
  t.ok(await page.eval("isDoubleArmed()"), "…it's just the first pinch, waiting for the second");
  await page.sleep(1200);

  // …and the Enter copy arriving FIRST is also one pinch
  await page.key("Enter", { wait: 0 });
  await page.pointer("down");
  await page.sleep(60);
  await page.pointer("up");
  await page.sleep(150);
  t.ok(!(await done(page, "read")), "key first, then pointer: still one pinch");
  await page.sleep(1200);

  // Desktop test buttons are not pinches
  const box = await page.eval(`(() => { const r = document.querySelector('[data-action="next"]').getBoundingClientRect(); return r.width ? [r.x + r.width / 2, r.y + r.height / 2] : null; })()`);
  if (box) {
    await page.pointer("down", box[0], box[1]);
    await page.pointer("up", box[0], box[1]);
    await page.sleep(150);
    t.ok(await page.eval("!isDoubleArmed()"), "clicking a desktop test button isn't treated as a pinch");
  } else {
    t.ok(true, "desktop test buttons are hidden at 600×600 (display size), nothing to click");
  }
}
