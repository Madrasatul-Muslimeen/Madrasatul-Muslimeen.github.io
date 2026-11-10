// PCF MSA J120 O5: one calm "Offline: working from this device" line at the top; back online, "All saved ✓".
//
// Run from the repository root with serve.js up:
//   PORT=8082 node serve.js &   QR_BASE=http://localhost:8082 node tools/i18n-verify/offline-line-browser.mjs
//   ONE=1 ...          one pass only (English, 390px) -- what the mutations use
//   MUT=noline ...     mutation: sw-register never mounts the line           -> every "line shows" check fails
//   MUT=eager ...      mutation: the line's code is fetched at every load    -> the "costs nothing online" check fails
//   MUT=nosaved ...    mutation: back online never says "All saved ✓"       -> the All saved checks fail
//   MUT=nowarm ...     mutation: the worker is not asked to keep the line    -> the "page opened offline" check fails
//   MUT=nocount ...    mutation: Notes still waiting are not counted         -> the waiting-Notes check fails
//   MUT=noguard ...    mutation: Sign in and outside links are not stopped   -> the "needs the internet" checks fail
//
// What it proves, in rendered, measured terms:
// Every case runs with the service worker on, as on a real phone (without it, a page that goes offline cannot fetch
// any module it had not loaded yet -- the line's code included; sw-register asks the worker to keep it).
//   1. Online, on four pages, the line's code is NOT fetched and no line exists (I9).
//   2. The line drops (context offline + the `offline` event): the line is the page's first element, reads
//      "Offline: working from this device" in the reader's language, is at least 32px tall and within the screen
//      width, adds no sideways scroll, and its text contrast against its own background is at least 4.5:1.
//   3. Back online: "Back online — saving…" then "All saved ✓", and the line goes away by itself.
//   4. A Note still waiting in the outbox (another person's, so the replay leaves it): back online the line says one
//      Note waits and where it will be saved, never "All saved ✓".
//   5. A page OPENED with no internet (service worker on, after one online visit): the line is there from the start.
//   6. Quran Study's Read view with the line showing: the reading area still ends inside the screen.
// Screenshots go to $SHOTS (default: the system temp folder) to be LOOKED at.
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
if (!fs.existsSync(path.join(ROOT, "app/apps/msa.json"))) { console.error("run from the repository root"); process.exit(2); }
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), "offline-line-"));
fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (typeof ok === "function") throw new Error(`check "${name}" was handed a function; pass its value`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}
const MUT = process.env.MUT || "";
const restores = [];
function mutate(rel, re, to) {
  const f = path.join(ROOT, rel), keep = fs.readFileSync(f, "utf8");
  let n = 0;
  const next = keep.replace(re, (...a) => (n++, typeof to === "function" ? to(...a) : to));
  console.log(`MUTATION ${MUT}: ${n} replacement(s) in ${rel}`);
  if (!n) throw new Error("mutation matched nothing");
  fs.writeFileSync(f, next);
  restores.push(() => fs.writeFileSync(f, keep));
}
const restoreAll = () => { while (restores.length) restores.pop()(); };
process.on("exit", restoreAll);
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { restoreAll(); process.exit(1); });
if (MUT === "noline") mutate("app/js/sw-register.js", /const mountLine = \(\) => import\("\.\/offline-line\.js"\)\.then\(\(m\) => m\.mountOfflineLine\(\)\)/g, "const mountLine = () => Promise.resolve()");
else if (MUT === "eager") mutate("app/js/sw-register.js", /    if \(navigator\.onLine === false\) \{\n/g, "    if (true) {\n");
else if (MUT === "nosaved") mutate("app/js/offline-line.js", /show\("saved", t\("All saved ✓"\)\);/g, "show(\"saving\", t(\"Back online — saving your changes…\"));");
else if (MUT === "nowarm") mutate("app/js/sw-register.js", /, new URL\("\.\/offline-line\.js", import\.meta\.url\)\.href\]/g, "]");
else if (MUT === "nocount") mutate("app/js/offline-line.js", /  const notes = outboxCount\(\);\n/g, "  const notes = 0;\n");
else if (MUT === "noguard") mutate("app/js/offline-line.js", /  window\.addEventListener\("click", guardInternetOnly, true\);\n/g, "");
else if (MUT) throw new Error(`unknown MUT=${MUT}`);

const TEXT = {
  en: { off: "Offline: working from this device", saving: "Back online — saving your changes…", saved: "All saved ✓", signin: "Signing in needs the internet. Connect, then tap Sign in again.", outside: "Outside websites need the internet. This link will open when you are online.", wait: /^Back online\. 1 Note\(s\) written offline will be saved when you open Notes or Mapping My Journey\.$/ },
  bn: { signin: "সাইন ইন করতে ইন্টারনেট লাগে। সংযোগ দিয়ে আবার সাইন ইন চাপুন।", outside: "বাইরের ওয়েবসাইটের জন্য ইন্টারনেট লাগে। অনলাইনে থাকলে এই লিংক খুলবে।", off: "ইন্টারনেট নেই: এই ডিভাইস থেকে কাজ চলছে", saving: "আবার অনলাইনে — আপনার পরিবর্তনগুলো সংরক্ষণ হচ্ছে…", saved: "সব সংরক্ষিত ✓", wait: /^আবার অনলাইনে। ইন্টারনেট ছাড়া লেখা ১টি নোট/ },
};
const PAGES = ["quranrevival.html", "notes.html", "hadith-study.html", "dua-study.html"];
const removeSplash = (page) => page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay, .app-splash-overlay').forEach((e) => e.remove()));
const waitFor = (page, fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true).catch(() => false);
const lineInfo = (page) => page.evaluate(() => {
  const el = document.getElementById("mmOfflineLine");
  if (!el) return null;
  const r = el.getBoundingClientRect(), s = getComputedStyle(el);
  const rgb = (c) => (c.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  const lum = (c) => { const [R, G, B] = rgb(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * R + 0.7152 * G + 0.0722 * B; };
  const a = lum(s.color), b = lum(s.backgroundColor);
  return { text: el.textContent, hidden: el.hidden || s.display === "none", state: el.dataset.state, first: document.body.firstElementChild === el,
    h: r.height, w: r.width, left: r.left, right: r.right, vw: document.documentElement.clientWidth,
    sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth, contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
});
/** Is the line's code in the worker's caches? Polled from here: waitForFunction counts an async body's PROMISE as true
 *  at once (the "async body is a pass" trap), which sent the first run offline before the worker had kept anything. */
async function lineKept(page, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const hit = await page.evaluate(async () => { for (const n of await caches.keys()) if (await (await caches.open(n)).match("/app/js/offline-line.js")) return true; return false; }).catch(() => false);
    if (hit) return true;
    await page.waitForTimeout(250);
  }
  return false;
}
/** As on a real phone: the service worker on, controlling the page, and holding the line's code (warmed, never opened). */
async function swPage(ctx, p) {
  const { page } = await openPage(ctx, `/app/${p}`);
  await waitFor(page, () => !!navigator.serviceWorker?.controller, null, 20000);
  await lineKept(page, 20000);
  return page;
}
const lineFetched = (page) => page.evaluate(() => performance.getEntriesByType("resource").some((e) => e.name.includes("/js/offline-line.js")));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const PASSES = process.env.ONE ? [["en", 390]] : [["en", 390], ["bn", 390], ["en", 1280], ["bn", 1280]];
for (const [lang, width] of PASSES) {
  const tag = `${lang} ${width}px`, T = TEXT[lang];
  console.log(`\n=== ${tag} ===`);
  // ---- 1-3 on each page ----
  for (const p of PAGES) {
    const ctx = await newContext(browser, { allowServiceWorker: true, viewport: { width, height: 800 }, appLang: lang });
    const page = await swPage(ctx, p);
    await removeSplash(page);
    check(`${tag} ${p}: online, the line's code is NOT fetched (I9)`, !(await lineFetched(page)));
    check(`${tag} ${p}: online, there is no line`, (await lineInfo(page)) === null);
    await ctx.setOffline(true);
    const shown = await waitFor(page, (txt) => document.getElementById("mmOfflineLine")?.textContent === txt && !document.getElementById("mmOfflineLine").hidden, T.off, 8000);
    const off = await lineInfo(page);
    check(`${tag} ${p}: MUTATION TARGET (noline): offline, the line reads "${T.off}"`, shown, JSON.stringify(off));
    check(`${tag} ${p}: the line is the page's first element, at least 32px tall, within the screen width`,
      !!off && off.first && off.h >= 32 && off.h <= 80 && off.left >= 0 && off.right <= off.vw + 0.5, JSON.stringify(off));
    check(`${tag} ${p}: no sideways scroll with the line showing`, !!off && off.sideways <= 0, JSON.stringify(off && off.sideways));
    check(`${tag} ${p}: the line's text contrast is at least 4.5:1`, !!off && off.contrast >= 4.5, JSON.stringify(off && off.contrast.toFixed(2)));
    if (p === "quranrevival.html") await page.screenshot({ path: path.join(SHOTS, `offline-${p}-${lang}-${width}.png`), clip: { x: 0, y: 0, width, height: 200 } });
    if (p === "hadith-study.html") {
      // Offline, what needs the internet says so in words instead of failing (O5).
      const r = await page.evaluate(() => {
        const out = {};
        const b = document.getElementById("signInBtn");
        b.style.display = "";
        let ran = 0;
        const own = () => { ran++; };
        b.addEventListener("click", own);
        b.click();
        b.removeEventListener("click", own);
        out.signinRan = ran;
        out.signinText = document.getElementById("mmOfflineLine")?.textContent;
        const a = document.createElement("a");
        a.href = "https://example.org/tafsir"; a.textContent = "outside"; document.body.appendChild(a);
        const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
        a.dispatchEvent(ev);
        out.outsidePrevented = ev.defaultPrevented;
        out.outsideText = document.getElementById("mmOfflineLine")?.textContent;
        const same = document.createElement("a");
        same.href = "#offline-line-same"; document.body.appendChild(same);
        const ev2 = new MouseEvent("click", { bubbles: true, cancelable: true });
        same.dispatchEvent(ev2);
        out.samePrevented = ev2.defaultPrevented;
        a.remove(); same.remove(); b.style.display = "none";
        return out;
      });
      check(`${tag} ${p}: MUTATION TARGET (noguard): offline, Sign in is stopped before it fails (its own handler did not run)`, r.signinRan === 0, JSON.stringify(r));
      check(`${tag} ${p}: MUTATION TARGET (noguard): and the line says signing in needs the internet`, r.signinText === T.signin, r.signinText);
      check(`${tag} ${p}: MUTATION TARGET (noguard): offline, a link to an outside website is stopped and the line says why`, r.outsidePrevented === true && r.outsideText === T.outside, JSON.stringify(r));
      check(`${tag} ${p}: positive control: a link inside the app is NOT stopped`, r.samePrevented === false, JSON.stringify(r));
    }
    await ctx.setOffline(false);
    const sawSaving = await waitFor(page, (txt) => document.getElementById("mmOfflineLine")?.textContent === txt, T.saving, 3000);
    const saved = await waitFor(page, (txt) => document.getElementById("mmOfflineLine")?.textContent === txt && !document.getElementById("mmOfflineLine").hidden, T.saved, 10000);
    if (saved && p === "quranrevival.html") await page.screenshot({ path: path.join(SHOTS, `saved-${p}-${lang}-${width}.png`), clip: { x: 0, y: 0, width, height: 200 } });
    check(`${tag} ${p}: back online it says "${T.saving}" first`, sawSaving);
    check(`${tag} ${p}: MUTATION TARGET (nosaved): then "${T.saved}"`, saved, JSON.stringify(await lineInfo(page)));
    const gone = await waitFor(page, () => document.getElementById("mmOfflineLine")?.hidden === true, null, 8000);
    check(`${tag} ${p}: MUTATION TARGET (nosaved): and then the line goes away by itself`, gone);
    await ctx.close();
  }
  // ---- 4: a Note still waiting ----
  {
    const ctx = await newContext(browser, { allowServiceWorker: true, viewport: { width, height: 800 }, appLang: lang });
    await ctx.addInitScript(() => { try { localStorage.setItem("mmsa.noteOutbox.v1", JSON.stringify([{ id: "x1", kind: "revise", actorUid: "someone-else", noteId: "n-x", tenantId: "t", title: "", bodyHtml: "" }])); } catch {} });
    const page = await swPage(ctx, "hadith-study.html");
    await ctx.setOffline(true);
    await waitFor(page, () => !!document.getElementById("mmOfflineLine") && !document.getElementById("mmOfflineLine").hidden, null, 8000);
    await ctx.setOffline(false);
    const waiting = await waitFor(page, (src) => new RegExp(src).test(document.getElementById("mmOfflineLine")?.textContent || ""), T.wait.source, 10000);
    const info = await lineInfo(page);
    check(`${tag}: MUTATION TARGET (nocount): a Note still waiting is counted, with where it will be saved`, waiting, JSON.stringify(info));
    await page.waitForTimeout(1500);
    check(`${tag}: and the line never says "${T.saved}" while a Note waits`, (await lineInfo(page))?.text !== T.saved);
    await ctx.close();
  }
}

// ---- 5: a page opened with no internet (service worker on) ----
console.log("\n=== a page opened with no internet ===");
for (const lang of process.env.ONE ? ["en"] : ["en", "bn"]) {
  const ctx = await newContext(browser, { allowServiceWorker: true, viewport: { width: 390, height: 800 }, appLang: lang });
  const { page } = await openPage(ctx, "/app/hadith-study.html");
  const controlled = await waitFor(page, () => !!navigator.serviceWorker?.controller, null, 20000);
  const warmed = await lineKept(page, 20000);
  check(`${lang}: precondition: the service worker controls the page`, controlled);
  check(`${lang}: MUTATION TARGET (nowarm): the worker keeps the line's code after one online visit (never opened)`, warmed);
  check(`${lang}: positive control: online, this visit never fetched the line's code itself`, !(await lineFetched(page)));
  await page.close();
  await ctx.setOffline(true);
  await ctx.route(`${BASE}/**`, (route) => route.abort("internetdisconnected"));
  const { page: p2 } = await openPage(ctx, "/app/hadith-study.html").catch(() => ({ page: null }));
  const ok = p2 ? await waitFor(p2, (txt) => document.getElementById("mmOfflineLine")?.textContent === txt && !document.getElementById("mmOfflineLine").hidden, TEXT[lang].off, 15000) : false;
  check(`${lang}: MUTATION TARGET (nowarm): a page OPENED offline shows the line from the start`, ok, p2 ? JSON.stringify(await lineInfo(p2)) : "page did not open");
  await ctx.close();
}

// ---- 6: Quran Study's Read view with the line ----
console.log("\n=== the Read view with the line showing ===");
for (const width of process.env.ONE ? [390] : [390, 1280]) {
  const ctx = await newContext(browser, { allowServiceWorker: true, viewport: { width, height: 800 }, appLang: "en" });
  const page = await swPage(ctx, "quranrevival.html");
  await removeSplash(page);
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn").catch(() => {}); await page.waitForTimeout(200); }
  await page.click("#tabReadBtn").catch(() => {});
  await page.waitForTimeout(800);
  const measure = () => page.evaluate(() => {
    const rs = document.getElementById("readScroll"), r = rs ? rs.getBoundingClientRect() : null;
    return { readOpen: !!r && r.height > 0, bottom: r ? r.bottom : null, vh: innerHeight, docOver: document.scrollingElement.scrollHeight - innerHeight };
  });
  const before = await measure();
  await ctx.setOffline(true);
  await waitFor(page, () => !!document.getElementById("mmOfflineLine") && !document.getElementById("mmOfflineLine").hidden, null, 8000);
  const after = await measure();
  await page.screenshot({ path: path.join(SHOTS, `read-offline-${width}.png`) });
  check(`${width}px: precondition: the Read view is open`, before.readOpen, JSON.stringify(before));
  check(`${width}px: with the line showing, the reading area still ends inside the screen`, after.readOpen && after.bottom <= after.vh + 0.5, JSON.stringify({ before, after }));
  await ctx.close();
}

await browser.close();
console.log(`\nScreenshots: ${SHOTS}`);
console.log(`offline-line-browser: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
