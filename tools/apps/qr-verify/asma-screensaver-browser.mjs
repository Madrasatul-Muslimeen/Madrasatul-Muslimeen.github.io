// QR J01 R3: the 🌙 Asma ul Husna screensaver in the Asma app (MMSA's, with no Firebase).
// At 390 and 1400, English and Bangla, Night and Light: the settings are kept after a reload; it opens from 🌙 and
// shows the chosen group's posters in order; slides change on the chosen speed; a tap or a key closes it back to
// exactly where the reader was; no sideways scroll, 40px controls, no page errors, no Firebase/Google requests.
// (Offline: asma-offline-browser.mjs opens it with the network cut.)
//
//   node tools/apps/qr-verify/asma-screensaver-browser.mjs         (serves itself on PORT, default 8094)
//   --mutate=<name>   serves one file with one thing broken; the suite must FAIL
//       tapclose   a tap on the poster only shows the controls (MMSA's way), it does not close
//       persist    the settings are not written to localStorage
//       speed      every poster shows for 15 seconds whatever is chosen
import { importBuilt } from "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import { spawn } from "node:child_process";
import { chromium } from "playwright";
const { DEFAULT_ASMA_COLLECTIONS } = await importBuilt("app/js/asma-collections-data.js");

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const MUTATE = arg("mutate") ?? null;
const RUNS = [[390, "en", "night"], [390, "bn", "light"], [1400, "en", "light"], [1400, "bn", "night"]];
const FORBIDDEN = /(^|\.)(gstatic\.com|googleapis\.com|firebaseapp\.com|firebaseio\.com|firebase\.google\.com)$/i;
const PORT = Number(process.env.PORT) || 8094;
let base = process.env.QR_BASE, server;
const GROUP = "asmacat_02";
// MMSA's deck keeps the Names' own order (the 99, then the added ones), filtered to the group: so, by number.
const GROUP_NUMBERS = DEFAULT_ASMA_COLLECTIONS.find((c) => c.id === GROUP).items.map((k) => Number(k.split(":")[1])).sort((a, b) => a - b);

const MUTATIONS = {
  tapclose: ["**/app/js/asma-screensaver-qr.js", 'root.addEventListener("click", (e) => { if (!e.target.closest("button")) close(); });', 'root.addEventListener("click", (e) => { if (!e.target.closest("button")) showCtl(); });'],
  persist: ["**/app/js/screensaver-idle.js", "try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}", "void next;"],
  speed: ["**/app/js/asma-screensaver-qr.js", "Math.max(3, Number(settings.eachSec) || 15) * 1000", "15000"],
};

let pass = 0, fail = 0;
const check = (ok, what) => {
  if (ok instanceof Promise) throw new Error(`check() was handed a promise: ${what}`);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
};
const outside = new Map();
const browser = await chromium.launch();
try {
  for (const [width, lang, look] of RUNS) {
    try { await run(width, lang, look); } catch (err) { check(false, `@${width} ${lang} ${look} stopped early: ${String(err.message).split("\n").slice(0, 3).join(" ")}`); }
  }
} finally {
  await browser.close();
  server?.kill();
}
console.log(`\nOther sites asked for: ${[...outside].map(([h, n]) => `${h} (${n})`).join(", ") || "none"}`);
console.log(`${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

async function run(width, lang, look) {
  const tag = `@${width} ${lang} ${look}`;
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 } });
  await ctx.addInitScript(([l, k]) => {
    if (sessionStorage.getItem("qr-test-seeded")) return;
    localStorage.clear();
    localStorage.setItem("mm_app_lang", l);
    localStorage.setItem("mm_card_look", k);
    localStorage.setItem("mm_disable_service_worker", "1");
    localStorage.setItem("mm_disable_screensaver", "1"); // never by itself during the test; 🌙 still opens it
    sessionStorage.setItem("qr-test-seeded", "1");
  }, [lang, look]);
  if (MUTATE) {
    const [glob, from, to] = MUTATIONS[MUTATE] ?? [];
    if (!glob) throw new Error(`Unknown mutation "${MUTATE}"`);
    await ctx.route(glob, async (route) => {
      const res = await route.fetch();
      const text = await res.text();
      if (!text.includes(from)) throw new Error(`Mutation "${MUTATE}" did not apply`);
      await route.fulfill({ response: res, body: text.replace(from, to) });
    });
  }
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const errors = [], requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => requests.push(r.url()));

  // Settings: chosen, kept on this device, still there after a reload.
  await page.goto(`${base}/app/asma.html#v=name&n=7`, { waitUntil: "load" });
  await page.waitForSelector('[data-qa-detail="7"]');
  const moon = await page.locator("[data-qa-saver]").boundingBox();
  check(moon && moon.height >= 40 && moon.width >= 40, `${tag} the 🌙 button is finger-sized (${Math.round(moon?.width)}x${Math.round(moon?.height)})`);
  await page.click("[data-qa-saver-settings]");
  await page.waitForSelector("#mmSaverSettings");
  await noSideways(page, `${tag} settings`);
  await tapTargets(page, "#mmSaverSettings", `${tag} settings`);
  for (const [k, v] of [["eachSec", "5"], ["kind", "tpl"], ["order", "seq"], ["which", "group"]]) await page.click(`#mmSaverSettings [data-k="${k}"] [data-v="${v}"]`);
  await page.selectOption("#mmSaverSettings [data-group]", GROUP);
  await page.click('#mmSaverSettings [data-mmss="close"]');
  check(await page.locator("#mmSaverSettings").count() === 0, `${tag} Done closes the settings`);
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector('[data-qa-detail="7"]');
  await page.click("[data-qa-saver-settings]");
  await page.waitForSelector("#mmSaverSettings [data-group] option", { state: "attached" });
  const kept = await page.evaluate(() => {
    const on = (k) => document.querySelector(`#mmSaverSettings [data-k="${k}"] [aria-pressed="true"]`)?.dataset.v;
    return { eachSec: on("eachSec"), kind: on("kind"), order: on("order"), which: on("which"), group: document.querySelector("#mmSaverSettings [data-group]").value };
  });
  check(kept.eachSec === "5" && kept.kind === "tpl" && kept.order === "seq" && kept.which === "group" && kept.group === GROUP, `${tag} the settings are kept after a reload (${JSON.stringify(kept)})`);
  if (lang === "bn") check(/[ঀ-৿]/.test(await page.locator("#mmSaverSettings h2").innerText()), `${tag} the settings are in Bangla`);
  await page.keyboard.press("Escape");

  // Open it from 🌙, on a scrolled Name page.
  await page.evaluate(() => scrollTo(0, 260));
  const before = await page.evaluate(() => ({ y: Math.round(scrollY), hash: location.hash }));
  await page.click("[data-qa-saver]");
  await page.waitForSelector("#mmSaver .mms-slide.on .ahp");
  const first = await shown(page);
  check(first === GROUP_NUMBERS[0], `${tag} it opens on the chosen group's first Name, in order (${first} of ${GROUP_NUMBERS.join(", ")})`);
  check(await page.evaluate(() => { const r = document.getElementById("mmSaver").getBoundingClientRect(); return r.top <= 0 && r.left <= 0 && r.bottom >= innerHeight && r.right >= innerWidth; }), `${tag} it covers the whole screen`);
  await noSideways(page, `${tag} screensaver`);
  await page.mouse.move(width / 2, 200);
  await page.mouse.move(width / 2 + 5, 205);
  await tapTargets(page, "#mmSaver .mms-ctl, #mmSaver .mms-top", `${tag} screensaver controls`);
  const bar = await page.evaluate(() => {
    const lines = (el) => { const r = document.createRange(); r.selectNodeContents(el); return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size; };
    const btns = [...document.querySelectorAll("#mmSaver .mms-ctl button")].filter((b) => !b.hidden);
    const box = document.querySelector("#mmSaver .mms-ctl").getBoundingClientRect();
    const open = document.querySelector('#mmSaver [data-mms="open"]');
    return { multi: btns.filter((b) => lines(b) > 1).map((b) => b.textContent.trim()), left: box.left, right: box.right, open: open.textContent.trim(), openLabel: open.getAttribute("aria-label") };
  });
  check(bar.multi.length === 0 && bar.left >= 0 && bar.right <= width, `${tag} the bar's buttons each fit on one line, inside the screen${bar.multi.length ? ": " + bar.multi.join(", ") + " wrap" : ""}`);
  check(bar.open === (lang === "bn" ? "খুলুন" : "Open") && /Name|নাম/.test(bar.openLabel ?? ""), `${tag} "${bar.open}" carries its full words "${bar.openLabel}" for screen readers`);
  await page.waitForTimeout(2500);
  check(await shown(page) === first, `${tag} the poster stays while its 5 seconds run`);
  await page.waitForFunction((n) => Number(document.querySelector("#mmSaver .mms-slide.on .ahp")?.dataset.asmaPoster) !== n, first, { timeout: 6000 }).catch(() => {});
  const second = await shown(page);
  check(second === GROUP_NUMBERS[1], `${tag} after 5 seconds the next Name of the group shows (${second})`);

  // A tap closes it, back to exactly where the reader was.
  await page.mouse.click(width / 2, (width < 600 ? 844 : 900) / 2);
  await page.waitForSelector("#mmSaver", { state: "detached", timeout: 3000 }).catch(() => {});
  const after = await page.evaluate(() => ({ y: Math.round(scrollY), hash: location.hash, open: !!document.getElementById("mmSaver") }));
  check(!after.open && after.hash === before.hash && Math.abs(after.y - before.y) <= 2, `${tag} a tap closes it, back on the same Name at the same place (${after.hash}, y ${after.y})`);

  // A key closes it too, on the Groups tab.
  await page.click('[data-qa-tab="groups"]');
  await page.waitForSelector("[data-qa-wheel] .wheel-seg");
  await page.click("[data-qa-saver]");
  await page.waitForSelector("#mmSaver .mms-slide.on");
  await page.keyboard.press("a");
  await page.waitForSelector("#mmSaver", { state: "detached", timeout: 3000 }).catch(() => {});
  check(await page.locator("#mmSaver").count() === 0 && /v=groups/.test(page.url()) && await page.locator("[data-qa-wheel] .wheel-seg").count() === 19, `${tag} a key closes it, back on the Groups tab`);

  // "Open this Name" opens it in the app.
  await page.click("[data-qa-saver]");
  await page.waitForSelector("#mmSaver .mms-slide.on .ahp");
  const n = await shown(page);
  await page.mouse.move(width / 2, 300);
  await page.click('#mmSaver [data-mms="open"]');
  await page.waitForSelector(`[data-qa-detail="${n}"]`, { timeout: 3000 }).catch(() => {});
  check(await page.locator(`[data-qa-detail="${n}"]`).count() === 1, `${tag} "Open this Name" opens Name ${n} in the app`);

  check(errors.length === 0, `${tag} no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
  const bad = requests.filter((u) => { try { return FORBIDDEN.test(new URL(u).hostname); } catch { return false; } });
  check(bad.length === 0, `${tag} no request to Firebase or Google hosts${bad.length ? ": " + bad.join(", ") : ""}`);
  for (const u of requests) { try { const h = new URL(u).host; if (!h.startsWith("localhost")) outside.set(h, (outside.get(h) ?? 0) + 1); } catch {} }
  await ctx.close();
}

async function shown(page) {
  return Number(await page.locator("#mmSaver .mms-slide.on .ahp").last().getAttribute("data-asma-poster").catch(() => "0"));
}
async function noSideways(page, what) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check(sw <= cw, `${what}: no sideways scroll (${sw} <= ${cw})`);
}
async function tapTargets(page, scope, what) {
  const small = await page.evaluate((sel) => [...document.querySelectorAll(sel)].flatMap((root) => [...root.querySelectorAll("button, select, label.mmss-switch")])
    .filter((el) => el.offsetParent !== null || el.getClientRects().length)
    .map((el) => ({ h: el.getBoundingClientRect().height, t: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 24) }))
    .filter((x) => x.h > 0 && x.h < 39.5), scope);
  check(small.length === 0, `${what}: every control is at least 40px tall${small.length ? ": " + small.map((x) => `${x.t} ${Math.round(x.h)}px`).join(", ") : ""}`);
}
