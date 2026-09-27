// Shared test helpers. `page` comes from openBrowser() in browser.mjs.

// Standard starting point for most suites: clock pinned to 10:00 today,
// reminders off (so nudges don't pop up mid-test), start-up alerts (like
// the daily chest) cleared, and the quest board showing.
export async function prepare(page, { hour = 10 } = {}) {
  await page.eval(`(() => {
    const t = new Date(); t.setHours(${hour}, 0, 0, 0);
    ui.clockOffsetMs = t.getTime() - Date.now();
    settings.reminders = false;
    ui.alertQueue = []; ui.currentAlert = null;
    player.announcedQuestIds = []; announceOpenedQuests(true);
    markActive();
    showHome();
    return true;
  })()`);
}

// Show a specific quest on the board.
export async function showQuest(page, id) {
  await page.eval(`(() => {
    player.currentQuestIndex = QUESTS.findIndex((q) => q.id === ${JSON.stringify(id)});
    showScreen("quest"); renderAll(); return true;
  })()`);
}

// Stop chests dropping (or force one item) for predictable tests.
export async function noLoot(page) {
  await page.eval(`rollForLoot = () => null; true`);
}
export async function forceLoot(page, itemId) {
  await page.eval(`rollForLoot = () => LOOT_TABLE.find((i) => i.id === ${JSON.stringify(itemId)}); true`);
}

// A double pinch: two pinches ~150ms apart (the quest board's main action).
export async function doublePinch(page) {
  await page.key("Enter", { wait: 150 });
  await page.key("Enter");
}

// Two separate, deliberate pinches ~300ms apart. Still a double pinch on the
// quest board; on other screens (shop Buy, New round) it's "pinch, confirm".
export async function pinchTwice(page) {
  await page.key("Enter");
  await page.sleep(300);                  // longer than the confirm misfire gap
  await page.key("Enter");
}

// A compact snapshot of what's on screen.
export function state(page) {
  return page.eval(`({
    screen: ui.screen,
    idle: ui.idle,
    menu: isQuestMenuOpen() ? ui.armed.actions.map((a) => a.label) : null,
    menuIndex: isQuestMenuOpen() ? ui.armed.index : null,
    pinch: el.hintConfirmLabel.textContent,
    browse: el.hintBrowseLabel.textContent,
    middle: el.hintHideLabel.textContent,
    quest: currentQuest() ? currentQuest().id : null,
    toast: el.toast.textContent,
  })`);
}
