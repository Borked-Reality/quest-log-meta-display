/* =========================================================
   Quest Log // HUD — Start-up
   Runs last: loads the save, applies settings, and draws the first screen.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- START-UP ---------- */
buildReelBulbs();          // chase lights around the chest's slot reel

// The shop shows chest skins on a small copy of the real chest.
el.shopChest = el.chestSvg.cloneNode(true);
el.shopChest.removeAttribute("id");
el.shopChest.classList.add("mini");
el.shopChestSlot.appendChild(el.shopChest);

// The confirm bar's drain animation uses the same timing as the logic.
el.hud.style.setProperty("--confirm-ms", `${CONFIG.CONFIRM_WINDOW_MS}ms`);

loadSettings();
applySettings();
loadProgress();
applyCosmetics();          // equipped theme, font, sound pack, chest, coins
markActive();              // treat opening the app as "active" for the stretch timer
Motion.start();

// Start reminder cooldowns now so nothing nags the instant the app opens.
QUESTS.forEach((q) => { if (q.reminder) ui.lastReminderAt[q.id] = nowMs(); });

checkStreak();
checkForNewDay();          // may raise a "New Day" alert
announceOpenedQuests(true);   // timed quests already open: no announcement spam
startBackgroundChecks();
startTicker();

// Resume on the saved quest, or the next open one if it's already done.
if (currentQuest().completed) moveToNextIncompleteQuest();

// Render without the bar sliding in from 0 on page load.
el.xpFill.classList.add("no-transition");
if (ui.currentAlert) renderAll();   // a start-up check already raised an alert
else showHome();
void el.xpFill.offsetWidth;
el.xpFill.classList.remove("no-transition");

resetIdleTimer();
