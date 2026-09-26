/* =========================================================
   Quest Log // HUD — Motion sensor
   Reads the glasses' accelerometer to know when you've been moving.
   Plain script (no modules). Loaded in order by index.html.
   ========================================================= */

/* ---------- ACTIVITY TRACKING (glasses motion sensor) ---------- */
// The glasses expose their accelerometer through the standard
// `devicemotion` event. Sustained movement (walking, standing up and
// moving around) resets the "still" timer used by the stretch reminder.
// This is an ESTIMATE: it can't tell sitting from standing still.
//
// No sensor (e.g. a desktop browser)? The stretch reminder simply
// becomes a timer since your last logged stretch break.

const Motion = {
  listening: false,
  jolts: [],
  lastJoltAt: 0,

  start() {
    if (this.listening || !("DeviceMotionEvent" in window)) return;
    // Some platforms need permission from a user gesture first.
    if (typeof DeviceMotionEvent.requestPermission === "function" && !this.permitted) return;
    window.addEventListener("devicemotion", Motion.onMotion);
    this.listening = true;
  },

  stop() {
    window.removeEventListener("devicemotion", Motion.onMotion);
    this.listening = false;
  },

  // Called from the first wearer gesture on platforms that need it.
  requestPermission() {
    if (this.asked || typeof DeviceMotionEvent === "undefined"
        || typeof DeviceMotionEvent.requestPermission !== "function") return;
    this.asked = true;
    DeviceMotionEvent.requestPermission()
      .then((state) => { this.permitted = state === "granted"; this.start(); })
      .catch(() => { /* denied or unsupported: timer fallback */ });
  },

  onMotion(event) {
    const a = event.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    const magnitude = Math.hypot(a.x, a.y, a.z);
    if (Math.abs(magnitude - 9.81) < CONFIG.MOTION_JOLT) return;

    const t = Date.now();
    if (t - Motion.lastJoltAt < 250) return;        // ignore implausibly rapid peaks
    Motion.lastJoltAt = t;
    Motion.jolts = Motion.jolts.filter((x) => t - x < 30000);
    Motion.jolts.push(t);

    if (Motion.jolts.length >= CONFIG.MOTION_JOLTS_NEEDED) {
      Motion.jolts = [];
      markActive();
    }
  },
};

function markActive() {
  ui.lastActiveAt = nowMs();
}
