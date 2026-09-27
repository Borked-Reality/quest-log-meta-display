/* =========================================================
   Quest Log // HUD — Profile (stats + collection)
   Lifetime stats and the collection of every chest item found.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- PROFILE ---------- */
// Swipe up from the Shop:  QUEST ▲ ADD ▲ SHOP ▲ PROFILE ▲ SETTINGS
// ◀ ▶ steps through:  Stats → every achievement → every collection item.
//   Stats:      lifetime numbers (recorded in player.lifetime)
//   Achievements: trophy grid; secret ones are ❓ until unlocked.
//   Collection: all chest items in a grid; ones you haven't found yet
//               are ❓. The cursor shows each item's name and effect.

// Rows on the stats card: [label, value].
function profileStats() {
  const l = player.lifetime;
  const found = Object.keys(player.itemsFound).length;
  return [
    ["Quests done", l.questsCompleted],
    ["XP earned", l.xpEarned],
    ["Gold earned", l.goldEarned],
    ["Gold spent", l.goldSpent],
    ["Chests opened", l.chestsOpened],
    ["Items found", `${found} / ${LOOT_TABLE.length}`],
    ["Best streak", `${l.bestStreak} 🔥`],
    ["Best combo", `×${l.bestCombo}`],
    ["Login streak", `${player.loginStreak} (best ${l.bestLoginStreak})`],
  ];
}

// Collection order: by rarity, then as listed in js/data/loot.js.
function collectionItems() {
  return ["common", "uncommon", "rare", "epic"].flatMap((r) => LOOT_TABLE.filter((i) => i.rarity === r));
}

function showProfileScreen() {
  if (!el.collectionGrid.children.length) buildCollectionGrid();
  if (!el.achievementGrid.children.length) buildAchievementGrid();
  showScreen("profile");
  renderAll();
}

function buildAchievementGrid() {
  ACHIEVEMENTS.forEach(() => {
    const cell = document.createElement("span");
    cell.className = "collection-cell trophy-cell";
    el.achievementGrid.appendChild(cell);
  });
}

function buildCollectionGrid() {
  collectionItems().forEach((item) => {
    const cell = document.createElement("span");
    cell.className = "collection-cell";
    cell.dataset.rarity = item.rarity;
    el.collectionGrid.appendChild(cell);
  });
}

// Profile positions:  0 = stats card,  1…A = achievements,  A+1… = collection.
function profileSections() {
  return { achievements: ACHIEVEMENTS.length, collection: collectionItems().length };
}

function browseProfile(direction) {
  const { achievements, collection } = profileSections();
  const count = 1 + achievements + collection;
  ui.profileIndex = (ui.profileIndex + direction + count) % count;
  Sound.play("click", { direction });
  renderAll();
}

function renderProfileScreen() {
  const { achievements } = profileSections();
  const view = ui.profileIndex === 0 ? "stats" : ui.profileIndex <= achievements ? "achievements" : "collection";
  el.profileStats.hidden = view !== "stats";
  el.profileAchievements.hidden = view !== "achievements";
  el.profileCollection.hidden = view !== "collection";

  if (view === "stats") renderProfileStats();
  else if (view === "achievements") renderProfileAchievements(ui.profileIndex - 1);
  else renderProfileCollection(ui.profileIndex - 1 - achievements);
}

function renderProfileStats() {
  const unlocked = ACHIEVEMENTS.filter(isUnlocked).length;
  el.profileKind.textContent = "👤 PROFILE";
  el.profileName.textContent = `${titleFor(player.level)} · LV ${player.level}`;
  el.profileStatsGrid.innerHTML = "";
  profileStats().concat([["Achievements", `${unlocked} / ${ACHIEVEMENTS.length}`]]).forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "stat-row";
    const l = document.createElement("span");
    l.className = "stat-label";
    l.textContent = label;
    const v = document.createElement("span");
    v.className = "stat-value";
    v.textContent = value;
    row.append(l, v);
    el.profileStatsGrid.appendChild(row);
  });
  el.profilePager.textContent = "◀ ▶ achievements + collection";
}

// Trophy grid: unlocked = icon, locked = dim icon, secret + locked = ❓.
function renderProfileAchievements(selected) {
  const unlocked = ACHIEVEMENTS.filter(isUnlocked).length;
  el.profileKind.textContent = `🏆 ACHIEVEMENTS ${unlocked} / ${ACHIEVEMENTS.length}`;
  [...el.achievementGrid.children].forEach((cell, i) => {
    const a = ACHIEVEMENTS[i];
    const got = isUnlocked(a);
    cell.textContent = got || !a.secret ? a.icon : "❓";
    cell.classList.toggle("is-found", got);
    cell.classList.toggle("is-selected", i === selected);
  });

  const a = ACHIEVEMENTS[selected];
  const got = isUnlocked(a);
  const hidden = a.secret && !got;
  el.achName.textContent = hidden ? "??? · secret" : `${a.icon} ${a.name}${got ? " ✓" : ""}`;
  el.achDesc.textContent = hidden ? "Keep playing…" : `${a.desc}  ·  ${rewardText(a)}`;
  const progress = achievementProgress(a);
  el.achProgress.hidden = hidden || got || a.goal <= 1;
  el.achBarFill.style.width = `${(progress / a.goal) * 100}%`;
  el.achProgressText.textContent = `${progress} / ${a.goal}`;
  el.profilePager.textContent = `${selected + 1} / ${ACHIEVEMENTS.length}`;
}

// Collection grid with a cursor on the selected item.
function renderProfileCollection(selected) {
  const items = collectionItems();
  const found = items.filter((i) => player.itemsFound[i.id]).length;
  el.profileKind.textContent = `📖 COLLECTION ${found} / ${items.length}`;
  [...el.collectionGrid.children].forEach((cell, i) => {
    const have = !!player.itemsFound[items[i].id];
    cell.textContent = have ? items[i].icon : "❓";
    cell.classList.toggle("is-found", have);
    cell.classList.toggle("is-selected", i === selected);
  });

  const item = items[selected];
  const count = player.itemsFound[item.id] || 0;
  el.collectionDetail.dataset.rarity = item.rarity;
  el.collectionName.textContent = count ? item.name : "???";
  el.collectionEffect.textContent = count
    ? `${item.effect}  ·  found ×${count}`
    : `${RARITIES[item.rarity].label} — not found yet`;
  el.profilePager.textContent = `${selected + 1} / ${items.length}`;
}
