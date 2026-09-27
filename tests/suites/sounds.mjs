// Every sound, in every sound pack, renders without errors, isn't silent,
// and doesn't clip (rendered offline — nothing actually plays).

// Options for recipes that need them; everything else uses defaults.
const OPTIONS = {
  tick: { i: 10 }, step: { count: 5 }, loot: { rarity: "epic" }, complete: { combo: 3 },
  slotMusic: { duration: 2000 }, chestOpen: { tier: 3 }, payout: { tier: 3 }, click: { direction: 1 },
};

export default async function (t, page) {
  const results = await page.eval(`(async () => {
    const opts = ${JSON.stringify(OPTIONS)};
    const out = [];
    for (const pack of Object.keys(SOUND_PACKS)) {
      for (const name of Object.keys(SOUNDS)) {
        const ctx = new OfflineAudioContext(2, 44100 * 4, 44100);
        Sound.init(ctx);
        Sound.setPack(pack);
        try {
          SOUNDS[name](opts[name] || {});
          const buf = await ctx.startRendering();
          const d = buf.getChannelData(0);
          let peak = 0;
          for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
          out.push([pack, name, peak, ""]);
        } catch (e) {
          out.push([pack, name, 0, e.message]);
        }
      }
    }
    Sound.ctx = null;                          // let the real one be made later
    return out;
  })()`);

  const broken = results.filter(([, , peak, err]) => err || peak < 0.005 || peak >= 0.99);
  t.ok(broken.length === 0, `${results.length} sounds × packs render cleanly (audible, no clipping)`,
    broken.slice(0, 5).map(([p, n, peak, e]) => `${p}/${n}: ${e || "peak " + peak.toFixed(3)}`).join(" | "));
  const loudest = results.reduce((a, r) => (r[2] > a[2] ? r : a));
  t.ok(loudest[1] === "levelUp", "the level-up fanfare is the loudest sound", `${loudest[0]}/${loudest[1]}`);
}
