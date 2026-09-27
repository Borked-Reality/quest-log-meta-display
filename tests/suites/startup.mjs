// The page loads every script and starts cleanly.
export default async function (t, page, shot) {
  const info = await page.eval(`({
    scripts: document.querySelectorAll('script[src^="js/"]').length,
    screen: ui.screen,
    label: el.alertLabel.textContent,
    clock: el.clockTime.textContent,
  })`);
  t.eq(info.scripts, page.jsFileCount, "index.html loads every file in js/");
  t.eq(info.screen, "alert", "a fresh day starts with an alert…");
  t.ok(info.label.includes("DAILY CHEST"), "…the daily chest", info.label);
  t.ok(/\d:\d\d/.test(info.clock), "the header clock shows the time", info.clock);
  await shot("start");
}
