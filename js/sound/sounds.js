/* =========================================================
   Quest Log // HUD — Sound recipes
   Every named sound (complete, levelUp, chest...). Press P on desktop to hear them.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

// ----- The sound recipes -----
const SOUNDS = {
  // Browsing: a soft tick, slightly higher going forward.
  click({ direction = 1 } = {}) {
    v({ freq: direction > 0 ? 1500 : 1250, dur: 0.05, vol: 0.12, wet: false });
  },

  // Swipe down / up: a soft swoop down or up.
  hide() { v({ freq: 700, glide: 330, dur: 0.2, vol: 0.14 }); },
  show() { v({ freq: 330, glide: 700, dur: 0.2, vol: 0.14 }); },

  // Counter quest step (+1 glass). Pitch climbs with progress.
  step({ count = 1 } = {}) {
    const f = note(scaleStep(count - 1));
    v({ freq: f * 0.5, glide: f, dur: 0.12, vol: 0.12 });                   // "bloop" up
    v({ freq: f, at: 0.06, dur: 0.28, type: "triangle", vol: 0.09 });       // the note
    v({ freq: f * 2, at: 0.09, dur: 0.35, vol: 0.03 });                     // sparkle
  },

  // XP counter tick; `i` rises as the number climbs.
  tick({ i = 0 } = {}) {
    v({ freq: 900 * Math.pow(2, i / 24), dur: 0.04, type: "square", cutoff: 3000, vol: 0.09, wet: false });
  },

  // Gold awarded: classic two-note coin.
  coin() {
    v({ freq: note(11), dur: 0.08, type: "square", cutoff: 4000, vol: 0.05 });       // B5
    v({ freq: note(16), at: 0.07, dur: 0.4, type: "square", cutoff: 4000, vol: 0.05 }); // E6
    v({ freq: note(28), at: 0.07, dur: 0.4, vol: 0.02 });                              // sparkle
  },

  // Quest complete: impact + rising arpeggio + held chord + sparkle.
  // combo 2, 3, ... transposes it up a whole step each time.
  complete({ combo = 1 } = {}) {
    const k = Math.min(combo - 1, 4) * 2;
    v({ freq: 180, glide: 55, dur: 0.25, vol: 0.22, wet: false });            // thump
    noise({ dur: 0.08, vol: 0.05, from: 3000, to: 800 });                     // snap

    [0, 4, 7, 12].forEach((s, i) => {
      v({ freq: note(s + k), at: i * 0.06, dur: 0.25, type: "triangle", vol: 0.12 });
      v({ freq: note(s + k), at: i * 0.06, dur: 0.2, type: "square", cutoff: 2500, vol: 0.03 });
    });
    [12, 16, 19].forEach((s) => {
      v({ freq: note(s + k), at: 0.24, dur: 0.7, type: "triangle", vol: 0.05, attack: 0.02 });
    });
    [24, 28, 31, 36].forEach((s, i) => {
      v({ freq: note(s + k), at: 0.26 + i * 0.04, dur: 0.25, vol: 0.025 });
    });
  },

  // Level up: a full fanfare, ~3 seconds. The LEVEL UP screen's visuals
  // are timed to these beats (see showLevelUpScreen).
  //   0.00  timpani roll building up + rising whoosh
  //   0.60  brass pickup: G G G
  //   0.96  IMPACT: big C major brass chord, bass, timpani, cymbal crash
  //   1.50  F chord → 1.74 G chord (the classic "here it comes" cadence)
  //   2.00  final bright C chord + crash + sparkle run
  levelUp() {
    // Timpani roll on G2, getting louder.
    for (let i = 0; i < 12; i++) {
      timpani(note(-29), i * 0.05, 0.04 + i * 0.012);
    }
    noise({ dur: 0.9, vol: 0.05, from: 300, to: 7000 });

    // Pickup: three short G's (with the octave below for weight).
    [0.6, 0.72, 0.84].forEach((t) => {
      brass(note(-5), t, 0.1, 0.07);
      brass(note(-17), t, 0.1, 0.04);
    });

    // IMPACT.
    const hit = 0.96;
    [-12, -8, -5, 0].forEach((s) => brass(note(s), hit, 1.0, 0.055));       // C4 E4 G4 C5
    v({ freq: note(-36), at: hit, dur: 1.2, vol: 0.2, wet: false });        // C2 bass
    timpani(note(-24), hit, 0.25);
    crash(hit, 1.8, 0.06);

    // Cadence: F → G.
    [-7, -3, 0].forEach((s) => brass(note(s), 1.5, 0.22, 0.045));           // F A C
    timpani(note(-31), 1.5, 0.15);
    [-5, -1, 2].forEach((s) => brass(note(s), 1.74, 0.22, 0.045));          // G B D
    timpani(note(-29), 1.74, 0.15);

    // Final chord, an octave up, with a sparkle run on top.
    const end = 2.0;
    [0, 4, 7, 12].forEach((s) => brass(note(s), end, 1.5, 0.05, 3200));     // C5 E5 G5 C6
    v({ freq: note(-36), at: end, dur: 1.5, vol: 0.2, wet: false });
    timpani(note(-24), end, 0.22);
    crash(end, 1.6, 0.045);
    for (let i = 0; i < 10; i++) {
      v({ freq: note(24 + scaleStep(i)), at: end + 0.05 + i * 0.05, dur: 0.35, vol: 0.025 });
    }
  },

  // Chest prize revealed: bigger the rarer it is. (The spinning reel is
  // the suspense, so this hits immediately.)
  loot({ rarity = "common" } = {}) {
    const tier = { common: 0, uncommon: 1, rare: 2, epic: 3 }[rarity] || 0;
    const notes = [3, 4, 6, 8][tier];
    for (let i = 0; i < notes; i++) {
      v({ freq: note(12 + scaleStep(i)), at: i * 0.045, dur: 0.3, vol: 0.06 });
    }
    if (tier >= 2) {
      [12, 16, 19, 24].forEach((s) => {
        v({ freq: note(s), at: notes * 0.045, dur: 0.9, type: "triangle", vol: 0.045, attack: 0.02 });
      });
    }
    if (tier === 3) {
      // Epic: a brass hit, a bass boom, and a cymbal on top.
      [0, 4, 7, 12].forEach((s) => brass(note(s), 0, 1.0, 0.04, 3000));
      v({ freq: note(-36), dur: 1.0, vol: 0.18, wet: false });
      crash(0, 1.4, 0.045);
    }
  },

  // 1st pinch on a quest: a rising "charge up", asking for the 2nd pinch.
  arm() {
    v({ freq: note(-5), glide: note(7), dur: 0.28, type: "triangle", vol: 0.1 });
    v({ freq: note(7), at: 0.22, dur: 0.12, vol: 0.05 });
  },

  // Confirm cancelled / timed out, or a step undone: a soft fall.
  disarm() {
    v({ freq: note(2), glide: note(-10), dur: 0.25, vol: 0.08 });
  },

  // Timer started / resumed: a quick "tick-tock" going up.
  timerStart() {
    v({ freq: note(0), dur: 0.06, type: "square", cutoff: 2500, vol: 0.06, wet: false });
    v({ freq: note(7), at: 0.12, dur: 0.08, type: "square", cutoff: 2500, vol: 0.06, wet: false });
  },

  // Timer finished: a bright bell pattern, twice, so you notice it.
  timerDone() {
    [0, 0.6].forEach((t) => {
      [12, 16, 19].forEach((s, i) => {
        v({ freq: note(s), at: t + i * 0.1, dur: 0.5, type: "triangle", vol: 0.1 });
        v({ freq: note(s + 12), at: t + i * 0.1, dur: 0.35, vol: 0.03 });
      });
    });
  },

  // ----- Treasure chest -----

  // Chest hits the ground.
  chestDrop() {
    v({ freq: 140, glide: 50, dur: 0.3, vol: 0.22, wet: false });
    noise({ dur: 0.12, vol: 0.06, from: 1200, to: 300, attack: 0.005 });
  },

  // Chest shakes: wooden knocks. The second rattle is faster and higher.
  chestRattle({ fast = false } = {}) {
    const gap = fast ? 0.06 : 0.09;
    const count = fast ? 6 : 4;
    for (let i = 0; i < count; i++) {
      v({ freq: (fast ? 300 : 240) + i * 25, at: i * gap, dur: 0.05, type: "square", cutoff: 1400, vol: 0.06, wet: false });
    }
  },

  // Lid bursts open: boom + whoosh + brass chord + cymbal. Bigger for rarer.
  chestOpen({ tier = 0 } = {}) {
    noise({ dur: 0.5, vol: 0.05, from: 500, to: 9000 });
    v({ freq: note(-24), dur: 0.6, vol: 0.2, wet: false });
    [0, 4, 7, 12].forEach((s) => brass(note(s), 0.02, 0.5, 0.035 + tier * 0.005, 2800));
    [12, 16, 19, 24].forEach((s, i) => {
      v({ freq: note(s), at: 0.05 + i * 0.04, dur: 0.5, type: "triangle", vol: 0.06 });
    });
    crash(0.02, 1.0 + tier * 0.2, 0.04);
  },

  // One coin from the fountain: a tiny random "ting".
  coinClink() {
    const s = 24 + [0, 4, 7, 12][Math.floor(Math.random() * 4)];
    v({ freq: note(s), dur: 0.12, type: "triangle", vol: 0.035 });
  },

  // Slot-machine payout bells: more for rarer (uncommon 4 → epic 16).
  payout({ tier = 1 } = {}) {
    const bells = [0, 4, 8, 16][tier];
    const pattern = [24, 28, 31, 36];
    for (let i = 0; i < bells; i++) {
      const s = pattern[i % 4] + (i >= 8 ? 5 : 0);
      v({ freq: note(s), at: 0.1 + i * 0.07, dur: 0.25, type: "triangle", vol: 0.055 });
      v({ freq: note(s + 12), at: 0.1 + i * 0.07, dur: 0.15, vol: 0.015 });
    }
  },

  // Firework pop: a crack + a falling fizz.
  firework() {
    noise({ dur: 0.08, vol: 0.06, from: 4000, to: 1500, attack: 0.003 });
    v({ freq: note(31 + Math.floor(Math.random() * 5)), glide: note(19), dur: 0.35, vol: 0.03 });
  },

  // Shop purchase: cash-register "ka-ching" + a coin cascade.
  purchase() {
    noise({ dur: 0.05, vol: 0.08, from: 3000, to: 1200, attack: 0.002 });          // drawer clunk
    v({ freq: note(-12), dur: 0.2, vol: 0.14, wet: false });
    v({ freq: note(24), at: 0.08, dur: 0.5, type: "triangle", vol: 0.09 });         // "ka-
    v({ freq: note(31), at: 0.16, dur: 0.8, type: "triangle", vol: 0.09 });         //  -ching!"
    for (let i = 0; i < 10; i++) {
      v({ freq: note(26 + scaleStep(i % 7)), at: 0.25 + i * 0.045, dur: 0.18, vol: 0.03 });
    }
  },

  // First time finding an item: a bright little "collected!" jingle.
  newItem() {
    [19, 24, 28, 31].forEach((s, i) => v({ freq: note(s), at: i * 0.06, dur: 0.22, type: "square", cutoff: 3500, vol: 0.04 }));
  },

  // Slot-machine music while the reel spins: a fast chiptune loop.
  // It plays on the music channel so landing can cut it off.
  slotMusic({ duration = 2500 } = {}) {
    const bus = Sound.startMusic();
    const step = 0.075;                                   // 16th notes
    const melody = [0, 4, 7, 12, 16, 12, 7, 4, 2, 5, 9, 14, 17, 14, 9, 5];
    const bass = [-24, -24, -19, -22];
    const count = Math.floor(duration / 1000 / step);
    for (let i = 0; i < count; i++) {
      v({ freq: note(melody[i % melody.length]), at: i * step, dur: step * 0.9,
          type: "square", cutoff: 2600, vol: 0.035, wet: false, out: bus });
      if (i % 4 === 0) {
        v({ freq: note(bass[Math.floor(i / 4) % bass.length]), at: i * step, dur: step * 3,
            type: "triangle", vol: 0.09, wet: false, out: bus });
      }
    }
  },

  // One item passing the reel window; slightly higher as it goes.
  reelTick({ i = 0 } = {}) {
    v({ freq: 1400 + Math.min(i, 30) * 15, dur: 0.025, type: "square", cutoff: 4000, vol: 0.05, wet: false });
  },

  // Reel stops: a solid "clack" + bell.
  reelLand() {
    noise({ dur: 0.06, vol: 0.07, from: 2500, to: 900, attack: 0.003 });
    v({ freq: note(24), dur: 0.6, type: "triangle", vol: 0.08 });
  },

  // A quest you added lands on the board: "quest accepted".
  questAdded() {
    noise({ dur: 0.25, vol: 0.03, from: 800, to: 5000 });                   // page swoosh
    v({ freq: note(7), at: 0.08, dur: 0.18, type: "triangle", vol: 0.11 });  // G5
    v({ freq: note(14), at: 0.18, dur: 0.45, type: "triangle", vol: 0.11 }); // D6
    [19, 24, 26].forEach((s, i) => v({ freq: note(s), at: 0.22 + i * 0.05, dur: 0.3, vol: 0.03 }));
  },

  // Notifications: gentle and neutral on purpose (not a "reward").
  notify() {
    v({ freq: note(7), dur: 0.35, vol: 0.07, cutoff: 3000 });                 // G5
    v({ freq: note(12), at: 0.14, dur: 0.5, vol: 0.07, cutoff: 3000 });       // C6
  },

  // Reminders (water, stretch): one soft ding.
  reminder() {
    v({ freq: note(9), dur: 0.6, vol: 0.12, attack: 0.01, cutoff: 2500 });    // A5
  },
};

// Dev "♪ TEST" button: steps through every sound so you can tune them.
const SOUND_PREVIEWS = [
  ["complete", {}], ["complete", { combo: 3 }], ["step", { count: 1 }], ["step", { count: 7 }],
  ["coin", {}], ["levelUp", {}], ["loot", { rarity: "common" }], ["loot", { rarity: "rare" }],
  ["loot", { rarity: "epic" }], ["questAdded", {}], ["arm", {}], ["disarm", {}], ["timerStart", {}], ["timerDone", {}],
  ["chestDrop", {}], ["chestRattle", {}], ["chestOpen", { tier: 3 }], ["slotMusic", { duration: 2500 }], ["reelLand", {}],
  ["coinClink", {}], ["payout", { tier: 3 }], ["firework", {}], ["newItem", {}], ["purchase", {}], ["notify", {}], ["reminder", {}], ["hide", {}], ["show", {}],
];
let soundPreviewIndex = 0;

function previewNextSound() {
  const [name, options] = SOUND_PREVIEWS[soundPreviewIndex];
  soundPreviewIndex = (soundPreviewIndex + 1) % SOUND_PREVIEWS.length;
  Sound.play(name, options);
  const extra = Object.values(options)[0];
  el.soundPreview.textContent = `♪ ${name}${extra !== undefined ? " " + extra : ""}`;
}

function toggleSound() {
  settings.soundEnabled = !settings.soundEnabled;
  saveSettings();
  renderSoundToggle();
  Sound.play("click");
}
