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
  t.eq(await page.eval("settings.rewardPace"), "relaxed", "reward screens default to Relaxed (time to read them)");
  // The chest app icon: every <link rel="…icon"> points at a real image.
  // (Loaded as images, which also works when index.html is opened from disk.)
  const icons = await page.eval(`Promise.all([...document.querySelectorAll('link[rel$="icon"]')].map((l) => new Promise((done) => {
    const img = new Image();
    img.onload = () => done([l.getAttribute("href"), img.naturalWidth]);
    img.onerror = () => done([l.getAttribute("href"), 0]);
    img.src = l.href;
  })))`);
  t.eq(icons.length, 2, "a favicon and a home-screen icon are declared");
  t.ok(icons.every(([, width]) => width > 0), "…and both load as images", JSON.stringify(icons));
  await shot("start");
}
