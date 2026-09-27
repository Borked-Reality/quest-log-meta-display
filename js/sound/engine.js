/* =========================================================
   Quest Log // HUD — Sound engine
   The Web Audio synth: voices, noise, brass, reverb, music channel, sound packs.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- SOUND ---------- */
// A small synth built on the Web Audio API — no audio files needed.
//
// Why these sounds feel rewarding:
//   • Layers: a low "thump", a bright body, and a high sparkle.
//   • Rising pitch = progress. Each glass of water plays one note higher,
//     so the last one resolves (anticipation → payoff).
//   • Timing matches the visuals: XP ticks count up, then a coin
//     "cha-ching" lands as the gold appears.
//   • Escalation: back-to-back completions (combos) play higher, and
//     rarer loot gets a bigger sound.
//   • Contrast: reminders are soft and plain, so the "reward" sound
//     only ever means a reward.
//   • A little reverb + a compressor make it sound polished, not beepy.
//
// To swap in real audio files later, change Sound.play() to
// e.g. new Audio("sounds/" + name + ".mp3").play();

// Major pentatonic: every note sounds good next to every other note.
const PENTATONIC = [0, 2, 4, 7, 9];
const C5 = 523.25;

// Semitones above C5 → frequency in Hz.
function note(semitones) {
  return C5 * Math.pow(2, semitones / 12);
}

// The nth note up the pentatonic scale (0 = C5, 5 = C6, ...).
function scaleStep(n) {
  return 12 * Math.floor(n / 5) + PENTATONIC[n % 5];
}

const Sound = {
  ctx: null,
  master: null,
  reverbSend: null,
  noiseBuffer: null,

  // Builds the audio chain: voices → master → compressor → speakers,
  // plus a reverb "send" for a sense of space.
  init(ctx) {
    this.ctx = ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;

    this.master = ctx.createGain();
    this.master.gain.value = CONFIG.SOUND_VOLUME;
    this.master.connect(compressor).connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 1.4, 3);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.25 * (this.pack.reverb ?? 1);
    this.reverbSend.connect(reverb).connect(this.master);

    // One second of white noise, reused for whooshes and impacts.
    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  },

  // Browsers only allow audio after a user gesture, so the context is
  // created lazily the first time something plays.
  ready() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.init(new AudioCtx());
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return true;
  },

  // One synth note.
  //   freq   start pitch (Hz)      glide  pitch to slide to (Hz)
  //   at     delay (s)             dur    length (s)
  //   type   sine | triangle | square | sawtooth
  //   vol    peak volume           cutoff lowpass filter (Hz), softens harsh waves
  //   wet    send to reverb?
  //   out    send to this node instead of master (e.g. the music channel)
  voice({ freq, at = 0, dur = 0.2, type = "sine", vol = 0.1, attack = 0.005, glide, cutoff, wet = true, out }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + at;

    // The equipped sound pack reshapes every note (see SOUND_PACKS).
    const pack = this.pack;
    const jitter = pack.jitter ? (Math.random() * 2 - 1) * pack.jitter : 0;   // Glitched pack
    const shift = Math.pow(2, ((pack.transpose || 0) + jitter) / 12);
    freq *= shift;
    if (glide) glide *= shift;
    if (pack.wave) type = pack.wave;
    // Pack filters muffle the sound, but never below the note itself
    // (otherwise high sparkles and coin "tings" would vanish).
    if (pack.cutoff) cutoff = Math.min(cutoff || 20000, Math.max(pack.cutoff, freq * 2));
    vol *= pack.vol || 1;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + dur * 0.8);
    osc.detune.value = (Math.random() - 0.5) * 8;   // tiny variation, less robotic
    if (pack.vibrato) {                               // kazoo wobble
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = pack.rate || 6;
      depth.gain.value = pack.vibrato;
      lfo.connect(depth).connect(osc.detune);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    let source = osc;
    if (cutoff) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      osc.connect(filter);
      source = filter;
    }
    source.connect(gain);
    gain.connect(out || this.master);
    if (wet && !out) gain.connect(this.reverbSend);

    osc.start(t);
    osc.stop(t + dur + 0.05);
  },

  // A run of notes on ONE oscillator (instead of one oscillator per note).
  // Much cheaper for long, fast patterns like the chest's slot music.
  //   notes: [{ freq, at, dur }]    (at/dur in seconds from now)
  sequence(notes, { type = "square", vol = 0.05, cutoff, out, attack = 0.004 } = {}) {
    if (!notes.length) return;
    const ctx = this.ctx;
    const pack = this.pack;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = pack.wave || type;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    const peak = vol * (pack.vol || 1);
    notes.forEach(({ freq, at, dur }) => {
      const jitter = pack.jitter ? (Math.random() * 2 - 1) * pack.jitter : 0;
      const f = freq * Math.pow(2, ((pack.transpose || 0) + jitter) / 12);
      const t = now + at;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    });
    let source = osc;
    const limit = pack.cutoff ? Math.min(cutoff || 20000, pack.cutoff) : cutoff;
    if (limit) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = limit;
      osc.connect(filter);
      source = filter;
    }
    source.connect(gain);
    gain.connect(out || this.master);
    const last = notes[notes.length - 1];
    osc.start(now);
    osc.stop(now + last.at + last.dur + 0.05);
  },

  // Filtered noise: a sweep from `from` Hz to `to` Hz (whoosh / impact).
  // attack: seconds to reach full volume (default: a slow swell). Use a
  // tiny attack like 0.005 for a sharp hit such as a cymbal crash.
  noise({ at = 0, dur = 0.2, vol = 0.05, from = 800, to = 6000, attack }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + at;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;                   // the buffer is 1s; long sounds loop it

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + (attack !== undefined ? attack : dur * 0.6));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(filter).connect(gain).connect(this.master);
    gain.connect(this.reverbSend);
    src.start(t);
    src.stop(t + dur + 0.05);
  },

  // Brass-like note: two slightly detuned sawtooth waves through a filter
  // that opens quickly ("blat") and then mellows — like a trumpet swell.
  brass({ freq, at = 0, dur = 0.4, vol = 0.06, bright = 2400 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + at;
    freq *= Math.pow(2, (this.pack.transpose || 0) / 12);   // sound pack pitch

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(bright * 0.25, t);
    filter.frequency.exponentialRampToValueAtTime(bright, t + 0.06);
    filter.frequency.exponentialRampToValueAtTime(bright * 0.5, t + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.025);
    gain.gain.exponentialRampToValueAtTime(vol * 0.7, t + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    [-7, 7].forEach((cents) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.detune.value = cents;
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
    filter.connect(gain);
    gain.connect(this.master);
    gain.connect(this.reverbSend);
  },

  pack: {},             // current SOUND_PACKS entry

  // Switches sound pack (from the shop / equipped cosmetics).
  setPack(id) {
    this.pack = SOUND_PACKS[id] || {};
    if (this.reverbSend) this.reverbSend.gain.value = 0.25 * (this.pack.reverb ?? 1);
  },

  // Plays a named sound from SOUNDS. `options` depends on the sound.
  play(name, options = {}) {
    if (!settings.soundEnabled || !SOUNDS[name]) return;
    if (!this.ready()) return;
    SOUNDS[name](options);
  },

  // Music gets its own channel so it can be cut off early (the chest
  // reel lands, or the wearer skips). Returns the channel to play into.
  startMusic() {
    this.stopMusic();
    this.musicBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    return this.musicBus;
  },

  stopMusic() {
    if (!this.musicBus) return;
    const bus = this.musicBus;
    bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);   // quick fade, no click
    setTimeout(() => bus.disconnect(), 300);
    this.musicBus = null;
  },
};

// A synthetic room: decaying stereo noise used as a reverb impulse.
function makeImpulse(ctx, seconds, decay) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

// Shorthand used by the sound recipes below.
const v = (opts) => Sound.voice(opts);
const noise = (opts) => Sound.noise(opts);
const brass = (freq, at, dur, vol, bright) => Sound.brass({ freq, at, dur, vol, bright });

// Drum hit: a low note that bends down slightly, like a timpani.
function timpani(freq, at, vol) {
  v({ freq: freq * 1.15, glide: freq, at, dur: 0.45, vol, attack: 0.003 });
}

// Cymbal: bright noise with a sharp attack and a long tail.
function crash(at, dur, vol) {
  noise({ at, dur, vol, from: 9000, to: 5000, attack: 0.005 });
}
