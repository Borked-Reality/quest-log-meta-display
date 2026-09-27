// Nothing overflows the 600×600 display: every screen, in every font,
// with the longest real text. Animations are frozen while measuring.
import { prepare } from "../lib/helpers.mjs";

export default async function (t, page, shot) {
  await prepare(page);
  const results = await page.eval(`(async () => {
    const style = document.createElement("style");
    style.textContent = "*,*::before,*::after{animation:none!important;transition:none!important} .particles{display:none}";
    document.head.appendChild(style);
    rollForLoot = () => null;

    const hud = el.hud.getBoundingClientRect();
    const area = document.querySelector(".screen-area").getBoundingClientRect();
    const check = (label) => {
      const bad = [];
      el.hud.querySelectorAll("*").forEach((n) => {
        if (n.closest("[hidden], .reel, .particles, .chest-beams, .glance") || n.classList.contains("chest-rays") || n.classList.contains("flash")) return;
        const cs = getComputedStyle(n);
        if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return;
        if (n.children.length || !n.textContent.trim()) return;              // leaf text only
        const r = n.getBoundingClientRect();
        if (!r.width) return;
        const text = n.textContent.trim().slice(0, 30);
        if (r.left < hud.left + 20 || r.right > hud.right - 20) bad.push(label + ': "' + text + '" too wide');
        if (n.closest(".screen-area") && r.bottom > area.bottom + 2) bad.push(label + ': "' + text + '" spills into the XP bar');
      });
      return bad;
    };

    const out = {};
    for (const font of ["system", "terminal", "marker", "loud", "pixel", "glitch"]) {
      applyCosmetics({ font });
      await document.fonts.ready;
      let bad = [];
      const longest = QUESTS.reduce((a, q) => (q.title.length > a.title.length ? q : a));
      const show = (id) => { player.currentQuestIndex = QUESTS.findIndex((q) => q.id === id); showScreen("quest"); renderAll(); };
      show(longest.id); bad = bad.concat(check("quest"));
      openQuestMenu(longest); renderAll(); bad = bad.concat(check("quest menu"));
      disarm(true);
      show("hydrate"); openQuestMenu(QUESTS[0]); renderAll(); bad = bad.concat(check("water menu"));
      disarm(true);
      show("walk"); bad = bad.concat(check("timer"));
      showCompleteScreen(longest, 0, 3, { xp: 150, gold: 40, xpMult: 2, goldMult: 2 }); bad = bad.concat(check("complete"));
      clearRewardTimers();
      showLevelUpScreen({ from: 29, to: 30, bonusGold: 150, newTitle: "Mythic" }); el.levelUpNumber.textContent = "30"; bad = bad.concat(check("level up"));
      clearRewardTimers();
      const cat = LOOT_TABLE.find((i) => i.id === "cat");
      showChestScreen({ item: cat, gold: 40, isNew: true, note: "IT WAS A GOLDEN POTATO! +100 ◆", title: "🎁 DAILY CHEST · DAY 14" });
      bad = bad.concat(check("chest opening"));
      clearRewardTimers(); setChestPhase("result"); bad = bad.concat(check("chest result"));
      showAlertScreen({ kind: "reminder", label: "STILL FOR 120 MIN", title: "Stand up & stretch", detail: "1 / 4 breaks today · aim for 3 by now" }); bad = bad.concat(check("alert"));
      ui.settingsIndex = 3; showScreen("settings"); renderAll(); bad = bad.concat(check("settings"));
      ui.shopIndex = SHOP_ITEMS.findIndex((i) => i.id === "chest-cardboard"); showScreen("shop"); renderAll(); applyCosmetics({ font }); bad = bad.concat(check("shop"));
      showScreen("add"); ui.draftQuest = parseQuestText("daily: stretch for 10 minutes at 8am"); renderAll(); bad = bad.concat(check("add preview"));
      ui.draftQuest = null; ui.editingQuestId = longest.id; renderAll(); bad = bad.concat(check("edit"));
      ui.editingQuestId = null;
      ui.profileIndex = 0; showProfileScreen(); bad = bad.concat(check("profile stats"));
      ui.profileIndex = 1; renderAll(); bad = bad.concat(check("achievements"));
      ui.profileIndex = 1 + ACHIEVEMENTS.findIndex((x) => x.id === "scuffed"); renderAll(); bad = bad.concat(check("longest achievement"));
      ui.profileIndex = 1 + ACHIEVEMENTS.length; renderAll(); bad = bad.concat(check("collection"));
      showAlertScreen({ kind: "achievement", label: "🤫 SECRET ACHIEVEMENT", title: "🎺 Kazoo Virtuoso", detail: "Unlocked: Prismatic Chest (chest skin)", action: "equipReward" }); bad = bad.concat(check("achievement pop-up"));
      ui.shopIndex = SHOP_ITEMS.findIndex((i) => i.id === "chest-prism"); showScreen("shop"); renderAll(); applyCosmetics({ font }); bad = bad.concat(check("locked shop item"));
      out[font] = bad;
    }
    applyCosmetics();
    return out;
  })()`);

  for (const [font, problems] of Object.entries(results)) {
    t.ok(problems.length === 0, `everything fits in the ${font} font`, problems.slice(0, 4).join(" | "));
  }
  await page.eval("location.reload(); true");        // drop the frozen-animation style
  await page.sleep(800);
  await shot("after");
}
