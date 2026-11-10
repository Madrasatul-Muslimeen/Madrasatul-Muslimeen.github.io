// PCF MSA J120 O1 + O2: "Install MSA" (a web app manifest and icons) and "Get ready for offline" (My account).
//
// Run from the repository root with serve.js up:
//   PORT=8082 node serve.js &   QR_BASE=http://localhost:8082 node tools/i18n-verify/offline-ready-browser.mjs
//   ONE=1 ...           one pass only (English, 390px) -- what the mutations use
//   MUT=noquran ...     mutation: the download skips the Qur'an files     -> the offline sūrah check fails
//   MUT=noready ...     mutation: "Ready" is never written                 -> the Ready checks fail
//   MUT=nobooks ...     mutation: the books are not downloaded            -> the offline Hadith book check fails
//   MUT=onlydua ...     mutation: only the default book (Duas) is downloaded, the J120 E behaviour -> the all-books checks fail
//   MUT=quranlost ...   mutation: a release's clean-up deletes mm-quran-v1 -> the release-bump checks fail
//   MUT=nomove ...      mutation: the update does not move Qur'an files out of an old app cache -> the move check fails
//   MUT=nomanifest ...  mutation: quranrevival.html loses its manifest link -> the manifest checks fail
//   MUT=noown ...       mutation: the tap does not keep the reader's own copy (J120 O4) -> the own-copy checks fail
//
// What it proves, each in rendered, measured terms (never "no error" alone):
//   1. The manifest is linked from every reader page msa.json lists, parses as JSON, names start_url/scope /app/,
//      display standalone, and its icons exist at the sizes it states (read off each PNG's own header).
//   2. In My account, at 390px and 1280px, in English and Bangla: the section shows the space it will use BEFORE
//      anything starts (every book's total), every Hadith and Dua book is listed with its size and NONE has a tick
//      box (the Owner, J120 n120b, 10 Nov 2026: "2.D", all of them; updated in place from E, "each reader
//      chooses", which this suite used to prove); one tap downloads every book's every file and runs a progress bar to
//      "N of N files" and ends "Ready ✓ (updated …)", remembered across a reload; storage.persist() was asked on
//      the tap and not before (the startup path is unchanged, I9).
//   3. Then with the network cut (context.setOffline(true)): index.html opens Quran Study with its Mastery Wheel;
//      a sūrah never opened before (77, al-Mursalāt) shows its first āyah's real meaning; Dua Study shows its
//      groups (real Arabic text); and a Hadith book (al-Muwatta') opens to a chapter's real Arabic text.
//   4. The section at 320/390/768/1280px in both languages: the button and every book row (17) at least 40px tall,
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
else if (MUT === "noready") mutate("app/js/offline-ready.js", /store\.set\(READY_KEY, keep\);\n\s*state\.textContent = t\("Ready ✓ \(updated \{when\}\)", \{ when: whenText\(at\) \}\);/g, "/* mutated */");
else if (MUT === "noown") mutate("app/js/offline-ready.js", /const ownResult = await keepOwn\(own, ownNote\);/g, "const ownResult = null;");
else if (MUT === "onlydua") mutate("app/js/offline-ready.js", /export const allBookIds = \(list\) => list\.books\.map\(\(b\) => b\.id\);/g, "export const allBookIds = (list) => list.books.filter((b) => b.default).map((b) => b.id);");
else if (MUT === "nobooks") mutate("app/js/offline-ready.js", /for \(const b of chosen\) items\.push\(\.\.\.filesOf\(b\.dirs, "hadith"\)\);/g, "");
else if (MUT === "quranlost") mutate("app/sw.js", /\(n\.startsWith\("mm-quran-"\) && n !== QURAN_CACHE_NAME\)/g, 'n.startsWith("mm-quran-")');
else if (MUT === "nomove") mutate("app/sw.js", /    moveQuranDataFromAppCaches\(\)\.catch\(\(\) => 0\),\n/g, "");
else if (MUT === "nomanifest") mutate("app/quranrevival.html", /<link rel="manifest" href="\.\/manifest\.webmanifest" \/>/g, "");
else if (MUT) throw new Error(`unknown MUT=${MUT}`);

const msa = JSON.parse(fs.readFileSync(path.join(ROOT, "app/apps/msa.json"), "utf8"));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const MUWATTA = "0179MalikIbnAnas.Muwatta.Shamela0028107-ara1";
// What "all of them" (J120 2 D) means, read off the list itself rather than retyped: every book id, every Hadith-cache
// URL (the shared files plus every book's, each once), and the whole download's bytes, as planFor counts them.
const OFFLINE_LIST = JSON.parse(fs.readFileSync(path.join(ROOT, "app/offline-files.json"), "utf8"));
const ALL_BOOK_IDS = OFFLINE_LIST.books.map((b) => b.id);
const urlsOf = (dirs) => dirs.flatMap((d) => d.files.map(([name, bytes]) => [d.base + name, bytes]));
const ALL_HADITH_URLS = new Set([...urlsOf(OFFLINE_LIST.parts.hadithCommon.dirs), ...OFFLINE_LIST.books.flatMap((b) => urlsOf(b.dirs))].map(([u]) => u));
const ALL_BYTES = (() => { const m = new Map(); for (const [u, b] of [...urlsOf(OFFLINE_LIST.parts.app.dirs), ...urlsOf(OFFLINE_LIST.parts.quran.dirs),
  ...urlsOf(OFFLINE_LIST.parts.hadithCommon.dirs), ...OFFLINE_LIST.books.flatMap((x) => urlsOf(x.dirs))]) m.set(u, b); return [...m.values()].reduce((a, b) => a + b, 0); })();
const ALL_MB_EN = `${(ALL_BYTES / 1048576).toFixed(1)} MB`;
const SURAH77 = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/quran-data-pull/output/surahs/surah_077.json"), "utf8")).ayahs[0].translations;
// Opening words of al-Muwatta' chapter 3's narrations (after the chain, marked "*"), as the Hadith list shows them.
const CH3_SNIPPETS = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/hadith-data-pull/output/openiti-release/split", MUWATTA_URI(), "ch-3.json"), "utf8")).hadiths
  .map((h) => { const s = String(h.text || ""); const c = s.indexOf("*"); return (c >= 0 && c < s.length - 20 ? s.slice(c + 1) : s).trim().split(/\s+/).slice(0, 4).join(" "); })
  .filter((x) => x.length > 8);
function MUWATTA_URI() { return "0179MalikIbnAnas.Muwatta.Shamela0028107-ara1"; }
const removeSplash = (page) => page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay, .app-splash-overlay').forEach((e) => e.remove()));
const arabicChars = (s) => (s.match(/[؀-ۿ]/g) || []).length;
/** No internet: the context goes offline AND every request to the app's server that still reaches the network is
 *  refused. Offline emulation alone did not cover a service worker installed after the context started (measured:
 *  after a worker update, the new worker fetched a sura from the server while navigator.onLine was false). */
async function goOffline(ctx) {
  await ctx.setOffline(true);
  await ctx.route(`${BASE}/**`, (route) => route.abort("internetdisconnected"));
}
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
  if (!ready0) { fail++; console.log(`  FAIL  ${tag}: the rest of this pass cannot run without the section`); await ctx.close(); continue; }
  const before = await page.evaluate(() => ({
    need: document.getElementById("offlineNeed")?.textContent || "",
    btn: document.getElementById("offlineReadyBtn")?.textContent || "",
    boxes: document.querySelectorAll("#offlineReady input").length,
    ids: [...document.querySelectorAll("#offlineBooks [data-offline-book]")].map((e) => e.dataset.offlineBook),
    rows: document.querySelectorAll("#offlineBooks li.offline-book").length,
    sizes: [...document.querySelectorAll(".offline-book-size")].map((s) => s.textContent),
  }));
  const MB = lang === "bn" ? /[০-৯]+\.[০-৯] MB/ : /\d+\.\d MB/;
  check(`${tag}: the space it will use is shown BEFORE starting`, (lang === "bn" ? /জায়গা লাগবে/ : /Space it will use/).test(before.need) && MB.test(before.need), before.need);
  check(`${tag}: the button reads in the reader's language`, before.btn === (lang === "bn" ? "ইন্টারনেট ছাড়া ব্যবহারের জন্য প্রস্তুত করুন" : "Get ready for offline"), before.btn);
  // J120 2 D (updated in place: these three replaced "Duas is ticked by default" and "ticking al-Muwatta' raises
  // the space", which proved answer E, each reader chooses).
  check(`${tag}: there is no tick box to choose books (J120 2 D: all of them)`, before.boxes === 0, String(before.boxes));
  check(`${tag}: one row per book, every book in the list (Duas, HadeethEnc, 15 books), each with its size in MB`,
    before.rows === 17 && before.rows === ALL_BOOK_IDS.length && ALL_BOOK_IDS.every((id) => before.ids.includes(id)) && before.sizes.length === 17 && before.sizes.every((s) => MB.test(s)), JSON.stringify(before.sizes.slice(0, 3)));
  check(`${tag}: MUTATION TARGET (onlydua): the space it will use is every book's (${ALL_MB_EN} in all)`, ALL_BYTES > 200 * 1048576 && before.need.endsWith(lang === "bn" ? ALL_MB_EN.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]) : ALL_MB_EN), before.need);

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
  // J120 O4: the same tap kept a copy of the reader's own Notes, folders, Records and Bookmarks (the Firestore reads
  // went out through the real data layer; that they then answer offline is proven against the real SDK and the real
  // Rules in tools/firestore-emulator/offline-own-data-real-function.rules.test.mjs -- this stub has no on-device copy).
  {
    const o = await page.evaluate(() => ({
      own: document.getElementById("offlineOwn")?.textContent || "",
      note: document.getElementById("offlineOwnNote")?.hidden === false ? document.getElementById("offlineOwnNote").textContent : "",
      log: (window.__fsLog || []).map((r) => `${r.kind}:${r.col}`),
      stamp: (() => { try { return JSON.parse(localStorage.getItem("mm_offline_ready")); } catch { return null; } })(),
    }));
    const OWN = lang === "bn" ? /^আপনার নিজের কপি: ([০-৯]+)টি নোট, ([০-৯]+)টি ফোল্ডার, ([০-৯]+)টি রেকর্ড, ([০-৯]+)টি বুকমার্ক ✓$/
      : /^Your own copy: (\d+) Notes, (\d+) folders, (\d+) Records, (\d+) Bookmarks ✓$/;
    const m = o.own.match(OWN);
    const toN = (x) => Number(String(x).replace(/[০-৯]/g, (c) => "০১২৩৪৫৬৭৮৯".indexOf(c)));
    const c = (o.stamp && o.stamp.own && o.stamp.own.counts) || null;
    check(`${tag}: MUTATION TARGET (noown): it says how many of your own Notes, folders, Records and Bookmarks it kept`, !!m, o.own);
    check(`${tag}: MUTATION TARGET (noown): the counts shown are the ones remembered with Ready`, !!m && !!c &&
      toN(m[1]) === c.notes && toN(m[2]) === c.folders && toN(m[3]) === c.records && toN(m[4]) === c.bookmarks, JSON.stringify(c));
    const read = (k) => o.log.includes(k);
    check(`${tag}: MUTATION TARGET (noown): the tap read the reader's Notes, folders, filings, links, Records and Bookmarks`,
      ["getDocs:notes", "getDocs:noteFolders", "getDocs:notePlacements", "getDocs:noteSources", "getDocs:records", "getDoc:bookmarks"].every(read),
      ["getDocs:notes", "getDocs:noteFolders", "getDocs:notePlacements", "getDocs:noteSources", "getDocs:records", "getDoc:bookmarks"].filter((k) => !read(k)).join(", "));
    check(`${tag}: it says, in words, what is NOT kept (older versions, pictures)`, (lang === "bn" ? /পুরোনো সংস্করণ/ : /Older versions of a Note/).test(o.note), o.note);
  }
  check(`${tag}: the space used is reported after (storage.estimate)`, MB.test(after.space), after.space);
  const kept = await page.evaluate(async () => {
    const out = {};
    for (const n of await caches.keys()) out[n] = (await (await caches.open(n)).keys()).length;
    return out;
  });
  const appCache = Object.keys(kept).find((n) => n.startsWith("mm-app-"));
  const hadithKept = await page.evaluate(async () => (await (await caches.open("mm-hadith-v1")).keys()).map((r) => new URL(r.url).pathname));
  const missingHadith = [...ALL_HADITH_URLS].filter((u) => !hadithKept.includes(u));
  check(`${tag}: MUTATION TARGET (onlydua): mm-hadith-v1 holds EVERY Hadith and Dua file (${ALL_HADITH_URLS.size}, all ${ALL_BOOK_IDS.length} books)`,
    ALL_HADITH_URLS.size > 7000 && missingHadith.length === 0, `${missingHadith.length} missing, e.g. ${missingHadith.slice(0, 2).join(", ")}`);
  const readyBooks = (() => { try { return JSON.parse(after.stamp).books; } catch { return null; } })();
  check(`${tag}: Ready records every book`, Array.isArray(readyBooks) && readyBooks.length === ALL_BOOK_IDS.length, JSON.stringify(readyBooks && readyBooks.length));
  check(`${tag}: the files are in the worker's own caches (mm-app-<version>, mm-quran-v1, mm-hadith-v1, mm-ext-v1)`,
    !!appCache && kept[appCache] > 300 && kept["mm-quran-v1"] >= 470 && kept["mm-hadith-v1"] > 500 && kept["mm-ext-v1"] >= 3, JSON.stringify(kept));
  check(`${tag}: no Qur'an file sits in the per-version app cache (a release would drop it)`,
    !(await page.evaluate(async (n) => (await (await caches.open(n)).keys()).some((r) => r.url.includes("/tools/quran-data-pull/output/")), appCache)));
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
  // Empty the browser's own HTTP cache first, so offline only the worker's caches can answer (a file the download
  // fetched also sits in the HTTP cache, and Chromium answers from it offline, which would hide a lost cache).
  { const cdp = await ctx.newCDPSession(page); await cdp.send("Network.clearBrowserCache"); await cdp.detach(); }
  await page.close();

  // ---- Offline ----
  await goOffline(ctx);
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
    check(`${tag}: MUTATION TARGET (nobooks): OFFLINE a Hadith book (al-Muwatta') opens to a chapter's real Arabic text`, ok, detail);
  }
  await ctx.close();
}

// =============================================================================
// 3b. A release (APP_VERSION bump) must not empty the Qur'an cache
// =============================================================================
// version.js is rewritten on disk (restored on exit), the worker updates and takes over, its activate step deletes
// the old mm-app-<version>, and mm-quran-v1 must still hold every Qur'an file -- then, offline, a sūrah opens.
if (!process.env.PASS || process.env.MUT === "quranlost" || process.env.MUT === "nomove") {
  console.log("\n=== 3b. A release keeps the Qur'an cache ===");
  const ctx = await newContext(browser, { allowServiceWorker: true, viewport: { width: 390, height: 900 }, appLang: "en" });
  // J120 2 D: there is no book choice any more, so this pass downloads everything, as a reader's tap does.
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await waitFor(page, () => !!navigator.serviceWorker?.controller, null, 15000);
  const ok0 = await openMyAccount(page);
  if (ok0) await page.click("#offlineReadyBtn");
  const done0 = ok0 && await waitFor(page, () => !document.getElementById("offlineReadyBtn").disabled, null, 600000);
  const count = (pg) => pg.evaluate(async () => { const o = {}; for (const n of await caches.keys()) o[n] = (await (await caches.open(n)).keys()).length; return o; });
  const before = await count(page);
  const oldApp = Object.keys(before).find((n) => n.startsWith("mm-app-"));
  check("release: got ready (app, Qur'an, every book), the Qur'an cache holds every file", done0 && (before["mm-quran-v1"] || 0) >= 470, JSON.stringify(before));
  // A reader from before J120 kept Qur'an data in the per-version app cache. Plant one file there ONLY (taken out of
  // mm-quran-v1, with a marker body no server has), so the update can only fill mm-quran-v1 with it by moving it.
  // A file the download really kept (so the count check below sees it come back, not a 471st file).
  const PLANT = await page.evaluate(async () => new URL((await (await caches.open("mm-quran-v1")).keys()).map((r) => r.url).find((u) => /\/surahs\/[^/]*114[^/]*\.json$/.test(u)) || "").pathname);
  const planted = await page.evaluate(async ([oldApp, url]) => {
    const q = await caches.open("mm-quran-v1"); await q.delete(url);
    const body = JSON.stringify({ planted: "old-app-cache-copy" });
    await (await caches.open(oldApp)).put(url, new Response(body, { headers: { "content-type": "application/json" } }));
    return !(await q.match(url)) && !!(await (await caches.open(oldApp)).match(url));
  }, [oldApp, PLANT]);
  check("release: positive control: a Qur'an file sits in the OLD app cache only, as before J120", planted && PLANT.includes("/surahs/"), PLANT);
  const vf = path.join(ROOT, "app/js/version.js"), keep = fs.readFileSync(vf, "utf8");
  const bumped = keep.replace(/APP_VERSION = "[\d.]+"/, 'APP_VERSION = "99.99"');
  fs.writeFileSync(vf, bumped);
  restores.push(() => fs.writeFileSync(vf, keep));
  // The worker checks for an update, installs the new version (carrying the app files over), and is told to take over.
  const tookOver = await page.evaluate(async (oldApp) => {
    const reg = await navigator.serviceWorker.getRegistration("/app/");
    await reg.update();
    const end = Date.now() + 60000;
    while (!reg.waiting && Date.now() < end) await new Promise((r) => setTimeout(r, 250));
    if (!reg.waiting) return "no new worker";
    const changed = new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
    reg.waiting.postMessage({ type: "skipWaiting" });
    await Promise.race([changed, new Promise((r) => setTimeout(r, 30000))]);
    for (let i = 0; i < 40 && (await caches.keys()).includes(oldApp); i++) await new Promise((r) => setTimeout(r, 250));
    return "ok";
  }, oldApp).catch((e) => String(e));
  const after = await count(page);
  check("release: the new worker (v99.99) took over and dropped the old app cache", tookOver === "ok" && !!after["mm-app-99.99"] && !after[oldApp], `${tookOver} ${JSON.stringify(after)}`);
  check("MUTATION TARGET (quranlost): release: mm-quran-v1 still holds every Qur'an file", (after["mm-quran-v1"] || 0) === before["mm-quran-v1"], `${before["mm-quran-v1"]} -> ${after["mm-quran-v1"]}`);
  const movedBody = await page.evaluate(async (url) => { const r = await (await caches.open("mm-quran-v1")).match(url); return r ? r.text() : null; }, PLANT);
  check("MUTATION TARGET (nomove): release: the Qur'an file from the old app cache is now in mm-quran-v1, moved without a download", movedBody === JSON.stringify({ planted: "old-app-cache-copy" }), String(movedBody).slice(0, 80));
  check("release: the Qur'an cache's name carries no version number", !Object.keys(after).some((n) => /^mm-quran-.*\d+\.\d+/.test(n)));
  // Empty the browser's own HTTP cache first, so offline only the worker's caches can answer (a file the download
  // fetched also sits in the HTTP cache, and Chromium answers from it offline, which would hide a lost cache).
  { const cdp = await ctx.newCDPSession(page); await cdp.send("Network.clearBrowserCache"); await cdp.detach(); }
  await page.close();
  await goOffline(ctx);
  const { page: p } = await openPage(ctx, "/app/quranrevival.html").catch(() => ({ page: null }));
  const booted = p ? await waitFor(p, () => !document.getElementById("app").inert && document.getElementById("bootStatus").hidden && document.querySelectorAll("#wheelSection .wheel-seg").length > 0, null, 20000) : false;
  const s77 = booted ? await openSurah77(p).catch(() => false) : false;
  const diag = p ? await p.evaluate(async () => { const o = {}; for (const n of await caches.keys()) o[n] = (await (await caches.open(n)).keys()).filter((r) => r.url.includes("surah_077")).length; return { o, online: navigator.onLine }; }) : null;
  check("MUTATION TARGET (quranlost): release, then OFFLINE: sūrah 77 still opens with its meaning", s77, `booted=${booted} ${JSON.stringify(diag)}`);
  if (process.env.DIAG) console.log("DIAG", JSON.stringify(diag));
  if (p) await p.screenshot({ path: path.join(SHOTS, "release-offline-surah77.png") });
  await ctx.close();
  fs.writeFileSync(vf, keep);
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
      const rows = [...box.querySelectorAll("li.offline-book")].map((l) => r(l).height);
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
