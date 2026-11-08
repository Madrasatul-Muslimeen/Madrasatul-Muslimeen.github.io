// PCF MSA J120 O1 + O2: "Install MSA" (a web app manifest and icons) and "Get ready for offline" (My account).
//
// Run from the repository root with serve.js up:
//   PORT=8082 node serve.js &   QR_BASE=http://localhost:8082 node tools/i18n-verify/offline-ready-browser.mjs
//   ONE=1 ...           one pass only (English, 390px) -- what the mutations use
//   MUT=noquran ...     mutation: the download skips the Qur'an files     -> the offline sūrah check fails
//   MUT=noready ...     mutation: "Ready" is never written                 -> the Ready checks fail
//   MUT=nobooks ...     mutation: the ticked books are not downloaded     -> the offline Hadith book check fails
//   MUT=nomanifest ...  mutation: quranrevival.html loses its manifest link -> the manifest checks fail
//
// What it proves, each in rendered, measured terms (never "no error" alone):
//   1. The manifest is linked from every reader page msa.json lists, parses as JSON, names start_url/scope /app/,
//      display standalone, and its icons exist at the sizes it states (read off each PNG's own header).
//   2. In My account, at 390px and 1280px, in English and Bangla: the section shows the space it will use BEFORE
//      anything starts, Duas is ticked by default; one tap (with al-Muwatta' ticked too) runs a progress bar to
//      "N of N files" and ends "Ready ✓ (updated …)", remembered across a reload; storage.persist() was asked on
//      the tap and not before (the startup path is unchanged, I9).
//   3. Then with the network cut (context.setOffline(true)): index.html opens Quran Study with its Mastery Wheel;
//      a sūrah never opened before (77, al-Mursalāt) shows its first āyah's real meaning; Dua Study shows its
//      groups (real Arabic text); and the ticked Hadith book (al-Muwatta') opens to a chapter's real Arabic text.
//   4. The section at 320/390/768/1280px in both languages: the button and every book row at least 40px tall,
//      nothing cut or wider than the card, the progress row inside the card. Screenshots are written to
//      $SHOTS (default: the system temp folder) to be LOOKED at.
//   5. The two generated lists are current (install-links.mjs --check, build-offline-files.mjs --check).
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
const ROOT = process.cwd();
if (!fs.existsSync(path.join(ROOT, "app/apps/msa.json"))) { console.error("run from the repository root"); process.exit(2); }
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), "offline-ready-"));
fs.mkdirSync(SHOTS, { recursive: true });

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (typeof ok === "function") throw new Error(`check "${name}" was handed a function; pass its value`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}

// ---- Mutations: edit the source on disk (serve.js serves it live), restore on exit ----
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
if (MUT === "noquran") mutate("app/js/offline-ready.js", /\.\.\.filesOf\(list\.parts\.quran\.dirs, list\.parts\.quran\.cache\),/g, "");
else if (MUT === "noready") mutate("app/js/offline-ready.js", /store\.set\(READY_KEY, \{ at, version: APP_VERSION, books: ticked\(\) \}\);\n\s*state\.textContent = t\("Ready ✓ \(updated \{when\}\)", \{ when: whenText\(at\) \}\);/g, "/* mutated */");
else if (MUT === "nobooks") mutate("app/js/offline-ready.js", /for \(const b of chosen\) items\.push\(\.\.\.filesOf\(b\.dirs, "hadith"\)\);/g, "");
else if (MUT === "nomanifest") mutate("app/quranrevival.html", /<link rel="manifest" href="\.\/manifest\.webmanifest" \/>/g, "");
else if (MUT) throw new Error(`unknown MUT=${MUT}`);

const msa = JSON.parse(fs.readFileSync(path.join(ROOT, "app/apps/msa.json"), "utf8"));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const MUWATTA = "0179MalikIbnAnas.Muwatta.Shamela0028107-ara1";
const SURAH77 = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/quran-data-pull/output/surahs/surah_077.json"), "utf8")).ayahs[0].translations;
// Opening words of al-Muwatta' chapter 3's narrations (after the chain, marked "*"), as the Hadith list shows them.
const CH3_SNIPPETS = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/hadith-data-pull/output/openiti-release/split", MUWATTA_URI(), "ch-3.json"), "utf8")).hadiths
  .map((h) => { const s = String(h.text || ""); const c = s.indexOf("*"); return (c >= 0 && c < s.length - 20 ? s.slice(c + 1) : s).trim().split(/\s+/).slice(0, 4).join(" "); })
  .filter((x) => x.length > 8);
function MUWATTA_URI() { return "0179MalikIbnAnas.Muwatta.Shamela0028107-ara1"; }
const removeSplash = (page) => page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay, .app-splash-overlay').forEach((e) => e.remove()));
const arabicChars = (s) => (s.match(/[؀-ۿ]/g) || []).length;
async function waitFor(page, fn, arg, ms) {
  return page.waitForFunction(fn, arg, { timeout: ms }).then(() => true).catch(() => false);
}

// =============================================================================
// 1. The manifest and icons (files, then the rendered link on every listed page)
// =============================================================================
console.log("\n=== 1. Install MSA: the manifest and its icons ===");
{
  let m = null;
  try { m = JSON.parse(fs.readFileSync(path.join(ROOT, "app/manifest.webmanifest"), "utf8")); } catch (e) { /* m stays null */ }
  check("app/manifest.webmanifest is valid JSON", !!m);
  check("it names the app as msa.json does, short name MSA", !!m && m.name === msa.name.full.en && m.short_name === "MSA", JSON.stringify(m && [m.name, m.short_name]));
  check("start_url and scope are under /app/, display standalone, colours are msa.json's", !!m && m.start_url.startsWith("/app/") && m.scope === "/app/" && m.display === "standalone" &&
    m.theme_color === msa.colours.theme && m.background_color === msa.colours.background);
  const pngSize = (f) => { const b = fs.readFileSync(f); return b.toString("ascii", 1, 4) === "PNG" ? `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}` : null; };
  const icons = (m && m.icons) || [];
  check("three icons: 192, 512 and a maskable 512", icons.length === 3 && icons.some((i) => i.sizes === "192x192") && icons.some((i) => i.sizes === "512x512" && i.purpose === "any") && icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable"));
  for (const i of icons) {
    const f = path.join(ROOT, "app", i.src);
    check(`icon ${i.src} exists and really is ${i.sizes}`, fs.existsSync(f) && pngSize(f) === i.sizes, fs.existsSync(f) ? pngSize(f) : "missing");
  }
  check("sw.js may keep the manifest (webmanifest is in isCacheable's list)", /webmanifest\)\$\/i\.test\(url\.pathname\)/.test(fs.readFileSync(path.join(ROOT, "app/sw.js"), "utf8")));

  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 }, appLang: "en" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app/offline-files.json`); // same origin for the fetches below
  const results = [];
  for (const p of msa.manifest.pages) {
    // A plain fetch of each page's HTML and of the manifest its link names (no page boot needed for a <head> link).
    const r = await page.evaluate(async ({ base, p }) => {
      const html = await (await fetch(`${base}/app/${p}`)).text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const link = doc.head.querySelector('link[rel="manifest"]');
      const icon = doc.head.querySelector('link[rel="apple-touch-icon"]');
      const theme = doc.head.querySelector('meta[name="theme-color"]');
      if (!link) return { p, ok: false, why: "no manifest link" };
      const url = new URL(link.getAttribute("href"), `${base}/app/${p}`).href;
      let json = null;
      try { json = JSON.parse(await (await fetch(url)).text()); } catch { /* not JSON */ }
      const iconOk = !!icon && (await fetch(new URL(icon.getAttribute("href"), `${base}/app/${p}`).href)).ok;
      return { p, ok: !!json && json.short_name === "MSA" && iconOk && !!theme, why: !json ? "manifest not JSON" : !iconOk ? "no apple-touch-icon" : !theme ? "no theme-color" : "" };
    }, { base: BASE, p });
    results.push(r);
  }
  const bad = results.filter((r) => !r.ok);
  check(`MUTATION TARGET (nomanifest): every one of the ${msa.manifest.pages.length} reader pages links the manifest (valid JSON), the home-screen icon and the theme colour`,
    results.length >= 30 && bad.length === 0, bad.map((r) => `${r.p}: ${r.why}`).join("; "));
  await ctx.close();
}

// =============================================================================
// 2-3. Get ready, then offline
// =============================================================================
async function openMyAccount(page) {
  await removeSplash(page);
  await page.click("details.nav-cat-home > summary", { timeout: 8000 });
  await page.click("[data-open-account-card]", { timeout: 8000 });
  return waitFor(page, () => { const b = document.getElementById("offlineReadyBtn"); return b && !b.disabled; }, null, 15000);
}
async function openSurah77(page) {
  await removeSplash(page);
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(200); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(600);
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "77"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  return waitFor(page, (tr) => document.body.innerText.includes(tr.en) || document.body.innerText.includes(tr.bn), SURAH77, 10000);
}

const PASSES = process.env.PASS ? [[process.env.PASS.split(":")[0], Number(process.env.PASS.split(":")[1])]] // PASS=en:1280, one pass
  : process.env.ONE ? [["en", 390]] : [["en", 390], ["bn", 390], ["en", 1280], ["bn", 1280]];
for (const [lang, width] of PASSES) {
  const tag = `${lang} ${width}px`;
  console.log(`\n=== 2-3. Get ready, then offline -- ${tag} ===`);
  const ctx = await newContext(browser, { allowServiceWorker: true, viewport: { width, height: 900 }, appLang: lang });
  // Record when storage.persist() is called, so the test can show it is asked on the tap and never at startup.
  await ctx.addInitScript(() => {
    window.__persistCalls = 0;
    window.__dataFetches = 0; // fetch() calls this page makes for app or data files (the second-tap check reads it)
    const realFetch = window.fetch.bind(window);
    window.fetch = (input, init) => { const u = String(input && input.url || input); if (/\/(tools|app)\//.test(u) && !u.includes("offline-files.json")) window.__dataFetches++; return realFetch(input, init); };
    try {
      if (navigator.storage && navigator.storage.persist) {
        const real = navigator.storage.persist.bind(navigator.storage);
        navigator.storage.persist = () => { window.__persistCalls++; return real(); };
      }
    } catch { /* nothing to record */ }
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const controlled = await waitFor(page, () => !!navigator.serviceWorker?.controller, null, 15000);
  check(`${tag}: precondition: the service worker controls the page`, controlled);
  check(`${tag}: nothing asks for persistent storage at startup (I9)`, (await page.evaluate(() => window.__persistCalls)) === 0);
  check(`${tag}: the offline list is NOT fetched at startup (only when My account opens)`,
    !(await page.evaluate(() => performance.getEntriesByType("resource").some((e) => e.name.includes("offline-files.json")))));
  const ready0 = await openMyAccount(page);
  check(`${tag}: My account shows the Get ready button, enabled once the list has loaded`, ready0);
  const before = await page.evaluate(() => ({
    need: document.getElementById("offlineNeed")?.textContent || "",
    btn: document.getElementById("offlineReadyBtn")?.textContent || "",
    dua: document.querySelector('input[data-offline-book="dua"]')?.checked,
    others: [...document.querySelectorAll("input[data-offline-book]")].filter((i) => i.dataset.offlineBook !== "dua" && i.checked).length,
    rows: document.querySelectorAll("input[data-offline-book]").length,
    sizes: [...document.querySelectorAll(".offline-book-size")].map((s) => s.textContent),
  }));
  const MB = lang === "bn" ? /[০-৯]+\.[০-৯] MB/ : /\d+\.\d MB/;
  check(`${tag}: the space it will use is shown BEFORE starting`, (lang === "bn" ? /জায়গা লাগবে/ : /Space it will use/).test(before.need) && MB.test(before.need), before.need);
  check(`${tag}: the button reads in the reader's language`, before.btn === (lang === "bn" ? "ইন্টারনেট ছাড়া ব্যবহারের জন্য প্রস্তুত করুন" : "Get ready for offline"), before.btn);
  check(`${tag}: Duas is ticked by default, no other book`, before.dua === true && before.others === 0, JSON.stringify(before));
  check(`${tag}: one row per book (Duas, HadeethEnc, 15 books), each with its size in MB`, before.rows === 17 && before.sizes.every((s) => MB.test(s)), JSON.stringify(before.sizes.slice(0, 3)));
  await page.locator(`input[data-offline-book="${MUWATTA}"]`).check();
  const need2 = await page.evaluate(() => document.getElementById("offlineNeed").textContent);
  check(`${tag}: ticking al-Muwatta' raises the space it will use`, need2 !== before.need, `${before.need} -> ${need2}`);

  const t0 = Date.now();
  await page.click("#offlineReadyBtn");
  const progressSeen = await waitFor(page, () => !document.getElementById("offlineProgress").hidden && /\d|[০-৯]/.test(document.getElementById("offlineProgressText").textContent), null, 15000);
  check(`${tag}: a progress bar appears with files and MB`, progressSeen);
  const finished = await waitFor(page, () => !document.getElementById("offlineReadyBtn").disabled, null, 600000);
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  const after = await page.evaluate(() => ({
    state: document.getElementById("offlineReadyState").textContent,
    prog: document.getElementById("offlineProgressText").textContent,
    bar: [document.getElementById("offlineProgressBar").value, document.getElementById("offlineProgressBar").max],
    space: document.getElementById("offlineSpace").textContent,
    failed: document.getElementById("offlineFailed").hidden ? "" : document.getElementById("offlineFailed").textContent,
    persist: window.__persistCalls,
    stamp: (() => { try { return localStorage.getItem("mm_offline_ready"); } catch { return null; } })(),
  }));
  console.log(`  (download took ${secs}s: ${after.prog})`);
  check(`${tag}: the download finishes`, finished);
  check(`${tag}: no file failed`, !after.failed, after.failed);
  const READY = lang === "bn" ? /^প্রস্তুত ✓ \(হালনাগাদ .*[০-৯].*\)$/ : /^Ready ✓ \(updated \d{1,2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}\)$/;
  check(`${tag}: MUTATION TARGET (noready): it ends "Ready ✓ (updated <date, time>)"`, READY.test(after.state), after.state);
  check(`${tag}: MUTATION TARGET (noready): Ready is remembered on this device`, !!after.stamp && /"at":\d+/.test(after.stamp), String(after.stamp));
  const [d, tot] = (after.prog.match(/^([\d০-৯]+)[^\d০-৯]+([\d০-৯]+)/) || []).slice(1);
  check(`${tag}: the progress reaches every file (N of N) and the bar is full`, !!d && d === tot && after.bar[0] === after.bar[1], `${after.prog} ${after.bar}`);
  check(`${tag}: storage.persist() was asked once, on the tap`, after.persist === 1, String(after.persist));
  check(`${tag}: the space used is reported after (storage.estimate)`, MB.test(after.space), after.space);
  const kept = await page.evaluate(async () => {
    const out = {};
    for (const n of await caches.keys()) out[n] = (await (await caches.open(n)).keys()).length;
    return out;
  });
  const appCache = Object.keys(kept).find((n) => n.startsWith("mm-app-"));
  check(`${tag}: the files are in the worker's own caches (mm-app-<version>, mm-hadith-v1, mm-ext-v1)`,
    !!appCache && kept[appCache] > 700 && kept["mm-hadith-v1"] > 500 && kept["mm-ext-v1"] >= 3, JSON.stringify(kept));
  await page.screenshot({ path: path.join(SHOTS, `ready-${lang}-${width}.png`) });

  // A second tap fetches only what is missing: count requests that reach the server.
  const fetches0 = await page.evaluate(() => window.__dataFetches);
  await page.click("#offlineReadyBtn");
  await waitFor(page, () => !document.getElementById("offlineReadyBtn").disabled, null, 120000);
  const second = (await page.evaluate(() => window.__dataFetches)) - fetches0;
  check(`${tag}: positive control: the first tap's downloads were counted (${fetches0})`, fetches0 > 1000);
  check(`${tag}: a second tap downloads nothing new (everything is already kept)`, second === 0, `${second} file(s) fetched again`);

  // Reload: Ready is still shown.
  await page.reload({ waitUntil: "networkidle" });
  await openMyAccount(page);
  const st = await page.evaluate(() => document.getElementById("offlineReadyState").textContent);
  check(`${tag}: after a reload My account still says Ready ✓`, READY.test(st), st);
  await page.close();

  // ---- Offline ----
  await ctx.setOffline(true);
  {
    const { page: p } = await openPage(ctx, "/app/index.html").catch(() => ({ page: null }));
    // The REAL app, not the early paint (decision 81 shows a kept copy of the wheel, inert, before the app boots).
    const wheel = p ? await waitFor(p, () => location.pathname.endsWith("/quranrevival.html") && document.querySelectorAll("#wheelSection .wheel-seg").length > 0 &&
      !document.getElementById("app").inert && document.getElementById("bootStatus").hidden, null, 20000) : false;
    const boot = p ? await p.evaluate(() => [document.getElementById("bootStatus")?.hidden, document.getElementById("bootStatusText")?.textContent, document.getElementById("app")?.inert]) : null;
    check(`${tag}: OFFLINE index.html opens Quran Study and the real app (not the early paint) shows its Mastery Wheel`, wheel, JSON.stringify(boot));
    const s77 = p ? await openSurah77(p).catch(() => false) : false;
    check(`${tag}: MUTATION TARGET (noquran): OFFLINE a sūrah never opened before (77) shows its first āyah's meaning`, s77);
    if (p) { await p.screenshot({ path: path.join(SHOTS, `offline-surah77-${lang}-${width}.png`) }); await p.close(); }
  }
  {
    const { page: p } = await openPage(ctx, "/app/dua-study.html").catch(() => ({ page: null }));
    const ok = p ? await waitFor(p, () => (document.body.innerText.match(/[؀-ۿ]/g) || []).length > 300, null, 15000) : false;
    const text = p ? await p.evaluate(() => document.body.innerText) : "";
    check(`${tag}: OFFLINE Dua Study shows its duas (real Arabic text, ${arabicChars(text)} Arabic letters)`, ok && !/Could not load|আনা যায়নি/.test(text));
    if (p) { await p.screenshot({ path: path.join(SHOTS, `offline-dua-${lang}-${width}.png`) }); await p.close(); }
  }
  {
    const { page: p } = await openPage(ctx, "/app/hadith-study.html").catch(() => ({ page: null }));
    let ok = false, detail = "";
    if (p) {
      await p.locator('[data-hadith-tab="books"]').click({ timeout: 6000 }).catch(() => {});
      await p.waitForTimeout(1200);
      await p.locator('.hadith-row:has-text("الموطأ")').first().click({ timeout: 6000 }).catch(() => {});
      const chapters = await waitFor(p, () => /وقوت الصلاة/.test(document.body.innerText), null, 10000);
      await p.locator('.hadith-row:has-text("وقوت الصلاة")').first().click({ timeout: 6000 }).catch(() => {});
      await p.waitForTimeout(1500);
      // The chapter's own file (ch-3.json) is what the book download adds: open its Hadith list and look for the
      // opening words of one of its narrations, read straight from that file.
      await p.locator("button", { hasText: /^(Hadith|হাদীস) · / }).first().click({ timeout: 6000 }).catch(() => {});
      const shown = await waitFor(p, (snips) => { const t = document.body.innerText; return snips.some((x) => t.includes(x)); }, CH3_SNIPPETS, 10000);
      const body = await p.evaluate(() => (document.querySelector(".hadith-body") || document.body).innerText);
      ok = chapters && shown && !/Could not load|আনা যায়নি/.test(body);
      detail = `chapters=${chapters} narration words shown=${shown}`;
      await p.screenshot({ path: path.join(SHOTS, `offline-hadith-${lang}-${width}.png`) });
      await p.close();
    }
    check(`${tag}: MUTATION TARGET (nobooks): OFFLINE the ticked Hadith book (al-Muwatta') opens to a chapter's real Arabic text`, ok, detail);
  }
  await ctx.close();
}

// =============================================================================
// 4. Layout: the section at four widths, both languages
// =============================================================================
if (!process.env.ONE && !process.env.PASS) {
  console.log("\n=== 4. The section's layout ===");
  for (const lang of ["en", "bn"]) for (const width of [320, 390, 768, 1280]) {
    const tag = `${lang} ${width}px`;
    const ctx = await newContext(browser, { viewport: { width, height: 900 }, appLang: lang });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    const opened = await openMyAccount(page);
    // The progress row shown with the longest text a real download prints (four-digit counts, three-digit MB).
    await page.evaluate((lang) => {
      const prog = document.getElementById("offlineProgress");
      prog.hidden = false;
      document.getElementById("offlineProgressText").textContent = lang === "bn" ? "৯৯৯৯টি ফাইলের ৮৮৮৮টি · ৯৯৯.৯ MB-এর ৮৮৮.৮ MB" : "8888 of 9999 files · 888.8 MB of 999.9 MB";
      document.getElementById("offlineReadyState").textContent = lang === "bn" ? "প্রস্তুত ✓ (হালনাগাদ ৯ নভে, ২০২৬, ০৭:৩০)" : "Ready ✓ (updated 9 Nov 2026, 07:30)";
      document.getElementById("offlineReady").scrollIntoView({ block: "start" });
    }, lang);
    const m = await page.evaluate(() => {
      const sheet = document.querySelector(".account-sheet").getBoundingClientRect();
      const box = document.getElementById("offlineReady");
      const r = (e) => e.getBoundingClientRect();
      const btn = r(document.getElementById("offlineReadyBtn"));
      const rows = [...box.querySelectorAll("label.offline-book")].map((l) => r(l).height);
      const outside = [...box.querySelectorAll("*")].filter((e) => { const b = r(e); return b.width > 0 && (b.left < sheet.left - 0.5 || b.right > sheet.right + 0.5); }).map((e) => e.id || e.className || e.tagName);
      const cut = [...box.querySelectorAll("*")].filter((e) => e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== "visible").map((e) => e.id || e.className || e.tagName);
      const prog = r(document.getElementById("offlineProgress"));
      return { btnH: btn.height, btnW: btn.width, minRow: Math.min(...rows), rows: rows.length, outside, cut, progIn: prog.left >= sheet.left - 0.5 && prog.right <= sheet.right + 0.5 && prog.width > 0,
        pageScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth };
    });
    check(`${tag}: the section opens`, opened);
    check(`${tag}: the button is at least 40px tall (${m.btnH.toFixed(0)}px) and fills its line`, m.btnH >= 40 && m.btnW > 200, JSON.stringify(m));
    check(`${tag}: every book row is at least 40px tall (${m.rows} rows, smallest ${m.minRow.toFixed(0)}px)`, m.rows === 17 && m.minRow >= 40);
    check(`${tag}: nothing sits outside the card, nothing is cut`, m.outside.length === 0 && m.cut.length === 0, JSON.stringify({ outside: m.outside, cut: m.cut }));
    check(`${tag}: the progress row (longest text) sits inside the card; no sideways page scroll`, m.progIn && !m.pageScroll, JSON.stringify(m));
    await page.screenshot({ path: path.join(SHOTS, `layout-${lang}-${width}.png`) });
    await ctx.close();
  }
}

// =============================================================================
// 5. The generated lists are current
// =============================================================================
console.log("\n=== 5. The generated lists ===");
for (const [script, name] of [["tools/offline/install-links.mjs", "the install line is on every listed reader page"], ["tools/offline/build-offline-files.mjs", "app/offline-files.json is current"]]) {
  let ok = true, out = "";
  try { out = execFileSync(process.execPath, [script, "--check"], { cwd: ROOT, encoding: "utf8" }); } catch (e) { ok = false; out = String(e.stdout || e.message); }
  check(name, ok, out.split("\n")[0]);
}

await browser.close();
console.log(`\nScreenshots: ${SHOTS}`);
console.log(`offline-ready-browser: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
