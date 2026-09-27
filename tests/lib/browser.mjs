// Drives the real index.html in headless Chrome over the DevTools
// Protocol. No npm packages: Node 22+ has fetch and WebSocket built in.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Chrome / Edge / Chromium location. Override with CHROME_PATH.
export function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error("Chrome not found. Set CHROME_PATH to your Chrome/Edge executable.");
  return found;
}

// Key name → Windows virtual key code (what Chrome expects).
const KEY_CODES = { Enter: 13, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };

export async function openBrowser({ root }) {
  const chrome = findChrome();
  const port = 9300 + Math.floor(Math.random() * 600);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "questlog-test-"));
  const proc = spawn(chrome, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--autoplay-policy=no-user-gesture-required",
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });

  // Wait for Chrome's debugging endpoint and the first page.
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      target = list.find((t) => t.type === "page");
    } catch { /* not up yet */ }
  }
  if (!target) { proc.kill(); throw new Error("Chrome did not start"); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  let nextId = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      errors.push(`${d.exception ? d.exception.description : d.text} (${(d.url || "").split("/").pop()}:${d.lineNumber + 1})`);
    }
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 600, height: 600, deviceScaleFactor: 1, mobile: false });

  const url = pathToFileURL(path.join(root, "index.html")).href;

  const page = {
    errors,
    sleep,

    // Runs JS in the page and returns the (JSON-able) result.
    async eval(expression) {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r.result.exceptionDetails) {
        throw new Error(`page eval failed: ${r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text}\n  in: ${expression.slice(0, 120)}`);
      }
      return r.result.result.value;
    },

    // A real key press (the Neural Band arrives as these).
    async key(name, { wait = 120 } = {}) {
      const code = KEY_CODES[name] || name.toUpperCase().charCodeAt(0);
      const text = name === "Enter" ? "\r" : name.length === 1 ? name : undefined;
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: name, windowsVirtualKeyCode: code, text });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: name, windowsVirtualKeyCode: code });
      if (wait) await sleep(wait);
    },

    // Pinch and HOLD: Enter down, wait, Enter up.
    async hold(ms = 700) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
      await sleep(ms);
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", windowsVirtualKeyCode: 13 });
      await sleep(120);
    },

    // The glasses' pointer copy of a pinch: "down" or "up" at (x, y).
    async pointer(kind, x = 300, y = 250) {
      await send("Input.dispatchMouseEvent", {
        type: kind === "down" ? "mousePressed" : "mouseReleased",
        x, y, button: "left", buttons: kind === "down" ? 1 : 0, clickCount: 1,
      });
    },

    // A pinch-and-move (the glasses send it as a pointer drag).
    async drag(x1, y1, x2, y2) {
      const m = (type, x, y, buttons) => send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons, clickCount: 1 });
      await m("mousePressed", x1, y1, 1);
      for (let i = 1; i <= 8; i++) await m("mouseMoved", x1 + ((x2 - x1) * i) / 8, y1 + ((y2 - y1) * i) / 8, 1);
      await m("mouseReleased", x2, y2, 0);
      await sleep(120);
    },

    async type(text) {
      await send("Input.insertText", { text });
      await sleep(60);
    },

    async waitFor(expression, { timeout = 15000, every = 50 } = {}) {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        if (await page.eval(`!!(${expression})`)) return;
        await sleep(every);
      }
      throw new Error(`timed out waiting for: ${expression}`);
    },

    async screenshot(file) {
      const r = await send("Page.captureScreenshot", { format: "png" });
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(r.result.data, "base64"));
    },

    // Fresh start: empty save, page reloaded and fully started.
    async fresh() {
      await send("Page.navigate", { url });
      await sleep(300);
      await page.eval("localStorage.clear(); true");
      await send("Page.reload", { ignoreCache: true });
      await sleep(300);
      await page.waitFor("document.readyState === 'complete' && typeof ui !== 'undefined' && typeof el !== 'undefined'");
      await sleep(250);
    },

    async close() {
      try { ws.close(); } catch { /* ignore */ }
      proc.kill();
      await sleep(300);
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold files */ }
    },
  };
  return page;
}
