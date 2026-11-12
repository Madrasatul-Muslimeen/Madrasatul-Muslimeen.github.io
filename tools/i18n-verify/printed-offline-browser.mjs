// Printed Mushaf pages kept in the app (the Owner, 11 Nov 2026, "1A"): Study options -> "Printed pages for offline".
//
// Run from the repository root with serve.js up:  node tools/i18n-verify/printed-offline-browser.mjs
//   ONE=1 ...           English at 390px only (what the mutations use)
//   MUT=nosw ...        mutation: the worker never answers a printed-page request from its cache      -> the offline checks fail
//   MUT=nosetguard ...  mutation: the worker steps in for EVERY printed-page request                  -> the "not kept goes straight to the network" check fails
//   MUT=notell ...      mutation: a save never tells the worker                                       -> the offline checks fail
//   MUT=noremove ...    mutation: Remove leaves the pictures in the cache                              -> the "removed" checks fail
//   MUT=noerr ...       mutation: a failed page does not stop the save (listed as kept anyway)       -> the "could not keep" checks fail
//   MUT=noreconcile ... mutation: a page whose picture is gone from the cache is still listed        -> the "cache cleared by the browser" check fails
//   MUT=nocors ...      mutation: the save asks without CORS (an opaque answer is accepted as saved)  -> the "no CORS" check fails
// The page pictures are the real files from tools/quran-data-pull/output/mushaf-printed/ksu-madani/. They are answered by
// this suite from disk (so the worker's own fetches are routed too, and "the network" can be cut). What it proves,
// rendered and measured:
//   1. The box is in Study options, in English and Bangla at 390 and 1280: names the choice, shows "about N MB" BEFORE
//      anything is downloaded, button and select >= 40px tall, inside the card, no sideways scroll; nothing is kept and
//      nothing is requested until the button is pressed (the Owner's rule).
//   2. Keep Juz 1 (21 pages): "Saving… n of 21" runs to "Kept in the app: Juz 1 (… MB)" (the real size, after), the cache
//      mm-printed-v1 holds exactly pages 1-21, "On this device: 21 of 604", and the list survives a reload.
//   3. With the network CUT: a kept page's picture loads through the worker; a page that was NOT kept does not (control).
//   4. Online, a page that was NOT kept goes straight to the network and the worker does not keep it (PRINTED-EXCLUDED).
//   5. Remove empties the cache for that choice and offline loading of it fails again.
//   6. A failure part-way (page 8 refused) is said in words (role=alert), the sūrah/juz is NOT claimed as kept, and what
//      was got is honestly counted.
//   7. The browser clearing the cache behind the app's back does not leave pages listed as kept.
//   8. QR's case, a picture host on ANOTHER origin: one that answers CORS is kept as a readable picture; one that does not is refused in words.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
const ROOT = process.cwd();
if (!fs.existsSync(path.join(ROOT, "app/apps/msa.json"))) { console.error("run from the repository root"); process.exit(2); }
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
if (MUT === "nosw") mutate("app/sw.js", /if \(isPrintedPage\(request\) && \(savedPrinted === null \|\| savedPrinted\.has\(request\.url\)\)\) \{/g, "if (false) {");
else if (MUT === "nosetguard") mutate("app/sw.js", /isPrintedPage\(request\) && \(savedPrinted === null \|\| savedPrinted\.has\(request\.url\)\)/g, "isPrintedPage(request)");
else if (MUT === "notell") mutate("app/js/printed-offline.js", /navigator\.serviceWorker\?\.controller\?\.postMessage\(\{ type: "printed-saved-changed" \}\);/g, "/* mutated */");
else if (MUT === "noremove") mutate("app/js/printed-offline.js", /await Promise\.all\(pages\.map\(\(p\) => cache\.delete\(pageKey\(p\)\)\)\);/g, "");
else if (MUT === "noerr") mutate("app/js/printed-offline.js", /  if \(firstError\) throw firstError;\n/g, "");
else if (MUT === "noreconcile") mutate("app/js/printed-offline.js", /for \(const p of Object\.keys\(sizes\)\) if \(!\(p in out\)\) \{ delete sizes\[p\]; changed = true; \}/g, "for (const p of Object.keys(sizes)) if (!(p in out)) { out[p] = sizes[p]; }");
else if (MUT === "nocors") mutate("app/js/printed-offline.js", /res = await fetchFn\(url, \{ mode: "cors", credentials: "omit" \}\);/g, 'res = await fetchFn(url, { mode: "no-cors", credentials: "omit" });');

const PIC = (n) => fs.readFileSync(path.join(ROOT, "tools/quran-data-pull/output/mushaf-printed/ksu-madani", `${String(n).padStart(3, "0")}.png`));
let net = true, failPage = null;
const viaWorker = new Set(); // printed-page URLs the WORKER fetched (route.request().serviceWorker() is set), as opposed to the page itself
const routePic = (route) => {
  const url = route.request().url();
  try { if (route.request().serviceWorker()) viaWorker.add(url); } catch { /* not a worker request */ }
  const n = Number(/(\d{3})\.png$/.exec(url)[1]);
  if (!net || n === failPage) return route.abort();
  return route.fulfill({ status: 200, headers: { "content-type": "image/png", "access-control-allow-origin": "*", "cache-control": "no-store" }, body: PIC(n) });
};
const loadsPic = (page, n) => page.evaluate(async (n) => {
  const url = new URL(`/tools/quran-data-pull/output/mushaf-printed/ksu-madani/${String(n).padStart(3, "0")}.png`, location.href).href;
  return await new Promise((res) => { const i = new Image(); i.onload = () => res(i.naturalWidth > 0); i.onerror = () => res(false); i.src = url; });
}, n);
const cacheKeys = (page) => page.evaluate(async () => (await (await caches.open("mm-printed-v1")).keys()).map((r) => r.url));
const openOptions = async (page) => {
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.click("#tabStudyBtn"); await page.waitForTimeout(200);
  await page.click("#tabStudyOptionsBtn");
  await page.waitForSelector("#printedOfflineBox #printedOfflineScope", { timeout: 15000 });
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const passes = process.env.ONE ? [["en", 390]] : [["en", 390], ["bn", 390], ["en", 1280], ["bn", 1280]];
  for (const [lang, width] of passes) {
    const tag = `[${lang} ${width}]`;
    net = true; failPage = null; viaWorker.clear();
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, allowServiceWorker: true });
    let asked = 0;
    await ctx.route("**/mushaf-printed/ksu-madani/*.png", (r) => { asked++; return routePic(r); });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {});
    await openOptions(page);
    await page.selectOption("#printedOfflineScope", "juz");
    await page.waitForFunction(() => /21/.test(document.querySelector("#printedOfflineSave")?.textContent ?? "") || /about|প্রায়/.test(document.querySelector("#printedOfflineSave")?.textContent ?? ""), null, { timeout: 8000 }).catch(() => {});

    // ---- 1. the box, before anything is downloaded
    const sec = await page.evaluate(() => {
      const box = document.getElementById("printedOfflineBox"), card = document.getElementById("readingViewCard"), R = (e) => e.getBoundingClientRect();
      const btn = document.getElementById("printedOfflineSave"), sel = document.getElementById("printedOfflineScope");
      return { text: box.textContent, btnText: btn?.textContent.trim(), btnH: btn ? R(btn).height : 0, selH: R(sel).height, selText: sel.options[sel.selectedIndex].text,
        inside: R(box).right <= R(card).right + 1 && R(btn).right <= R(card).right + 1, over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    check(`${tag} the box says nothing is kept unless the button is pressed, and names the choice (21 pages for Juz 1)`, (lang === "bn" ? /বোতাম না চাপলে/ : /Nothing is kept unless you press the button/).test(sec.text) && /21|২১/.test(sec.selText), sec.selText);
    check(`${tag} the size is shown BEFORE anything is downloaded ("about … MB")`, lang === "bn" ? /প্রায়/.test(sec.btnText ?? "") && /এমবি|MB/.test(sec.btnText ?? "") : /about [\d.]+ MB/.test(sec.btnText ?? ""), sec.btnText);
    check(`${tag} button and select are at least 40px tall, inside the card, no sideways scroll`, sec.btnH >= 40 && sec.selH >= 40 && sec.inside && sec.over <= 0, JSON.stringify(sec));
    check(`${tag} nothing was asked for or kept before the button (the Owner's rule)`, asked === 0 && (await cacheKeys(page)).length === 0, `asked ${asked}`);
    if (width === 390) { await page.evaluate(() => document.getElementById("printedOfflineBox").scrollIntoView({ block: "center" })); await page.waitForTimeout(200); await page.screenshot({ path: `${process.env.SHOTS || "/tmp"}/printed-offline-${lang}-${width}.png` }); }

    // ---- 2. keep Juz 1
    await page.click("#printedOfflineSave").catch(() => {}); // 99L review: a mutation that hides the button is a counted FAIL below, not a crash
    await page.waitForFunction(() => /Kept in the app:|অ্যাপে রাখা হয়েছে:/.test(document.getElementById("printedOfflineStatus")?.textContent ?? ""), null, { timeout: 30000 }).catch(() => {});
    const status = await page.evaluate(() => document.getElementById("printedOfflineStatus")?.textContent ?? "");
    check(`${tag} the keep ends "Kept in the app: … (size)" with the real size`, (lang === "bn" ? /অ্যাপে রাখা হয়েছে:.*\(.*(এমবি|MB)/ : /Kept in the app: Juz 1 \([\d.]+ MB\)/).test(status), status);
    const keys = await cacheKeys(page);
    const nums = keys.map((u) => Number(/(\d{3})\.png$/.exec(u)?.[1])).sort((a, b) => a - b);
    check(`${tag} the worker's cache mm-printed-v1 holds exactly pages 1-21`, nums.length === 21 && nums[0] === 1 && nums[20] === 21, JSON.stringify(nums));
    const after = await page.evaluate(() => ({ total: document.getElementById("printedOfflineTotal")?.textContent ?? "", remove: !!document.getElementById("printedOfflineRemove"), save: !!document.getElementById("printedOfflineSave") }));
    check(`${tag} "On this device: 21 of 604 pages" and the choice now offers Remove, not Keep`, (lang === "bn" ? /৬০৪.*২১|২১/ : /21 of 604/).test(after.total) && after.remove && !after.save, JSON.stringify(after));
    if (width === 390 && lang === "en") {
      await page.reload({ waitUntil: "networkidle" });
      await openOptions(page);
      const total = await page.evaluate(() => document.getElementById("printedOfflineTotal")?.textContent ?? "");
      check(`${tag} the kept pages are still listed after a reload`, /21 of 604/.test(total), total);
      await page.selectOption("#printedOfflineScope", "juz"); // the choice itself is not remembered: pick Juz 1 again
      await page.waitForSelector("#printedOfflineRemove", { timeout: 8000 });
    }

    // ---- 3/4. online guard: a page that was NOT kept goes straight to the network, never through the worker
    viaWorker.clear();
    const online30 = await loadsPic(page, 30);
    check(`${tag} positive control: online, a page that was not kept still loads`, online30 === true);
    check(`${tag} MUTATION TARGET (nosetguard): online, the worker does NOT step in for a page that was not kept`, ![...viaWorker].some((u) => /030\.png$/.test(u)), JSON.stringify([...viaWorker]));
    check(`${tag} the worker did not keep page 30 on its own (PRINTED-EXCLUDED)`, !(await cacheKeys(page)).some((u) => /030\.png$/.test(u)));

    // ---- 3. the network cut
    await ctx.setOffline(true); net = false;
    check(`${tag} offline: a kept page LOADS (served by the worker)`, (await loadsPic(page, 5)) === true);
    check(`${tag} offline control: a page that was NOT kept does not load`, (await loadsPic(page, 40)) === false);
    await ctx.setOffline(false); net = true;

    // ---- 5. Remove
    await page.click("#printedOfflineRemove").catch(() => {}); // 99L review: as above
    await page.waitForFunction(() => !document.getElementById("printedOfflineRemove"), null, { timeout: 8000 }).catch(() => {});
    check(`${tag} Remove: the cache holds none of the pages`, (await cacheKeys(page)).length === 0, JSON.stringify((await cacheKeys(page)).length));
    const afterRm = await page.evaluate(() => document.getElementById("printedOfflineTotal")?.textContent ?? "");
    check(`${tag} Remove: the box says no pages are kept`, (lang === "bn" ? /কোনো ছাপা পৃষ্ঠা রাখা নেই/ : /No printed pages are kept/).test(afterRm), afterRm);
    await ctx.setOffline(true); net = false;
    check(`${tag} Remove: offline loading of a page that was kept (and never opened here) fails again`, (await loadsPic(page, 6)) === false); // not page 5: the browser keeps a picture it already drew in memory
    await ctx.setOffline(false); net = true;

    // ---- 6. a failure part-way
    failPage = 8;
    await page.click("#printedOfflineSave").catch(() => {}); // 99L review: as above (MUT=noremove left Save hidden and hung here)
    await page.waitForFunction(() => /Could not keep|রাখা যায়নি/.test(document.getElementById("printedOfflineStatus")?.textContent ?? ""), null, { timeout: 30000 }).catch(() => {});
    const bad = await page.evaluate(() => ({ text: document.getElementById("printedOfflineStatus")?.textContent ?? "", role: document.getElementById("printedOfflineStatus")?.getAttribute("role"), save: !!document.getElementById("printedOfflineSave"), total: document.getElementById("printedOfflineTotal")?.textContent ?? "" }));
    check(`${tag} a page that cannot be fetched: the keep says so in words (role=alert)`, /Could not keep these pages|এই পৃষ্ঠাগুলো রাখা যায়নি/.test(bad.text) && bad.role === "alert", JSON.stringify(bad));
    check(`${tag} a failed keep is NOT claimed as kept: the button still offers Keep`, bad.save === true, JSON.stringify(bad));
    const gotSome = (await cacheKeys(page)).length;
    check(`${tag} what was got is honestly counted (fewer than 21, never page 8)`, gotSome < 21 && !(await cacheKeys(page)).some((u) => /008\.png$/.test(u)) && !/ 21 of /.test(bad.total), `${gotSome} ${bad.total}`);
    failPage = null;

    // ---- 8. QR's case: the pictures are at MSA's address, a DIFFERENT origin. A host that answers CORS can be kept (and the kept copy
    // is a readable picture, not an opaque one); a host that does not is refused in words and nothing is kept.
    if (width === 390) {
      await ctx.route("http://localhost:8081/**", (r) => r.fulfill({ status: 200, headers: { "content-type": "image/png", "access-control-allow-origin": "*" }, body: PIC(50) }));
      // Playwright adds the CORS header to anything a route fulfils, so the host that does NOT allow it is a real server.
      const noCors = http.createServer((q, r) => { r.writeHead(200, { "content-type": "image/png" }); r.end(PIC(51)); });
      await new Promise((ok) => noCors.listen(8082, ok));
      const other = (port, page_) => page.evaluate(async ({ port, page_ }) => {
        const m = await import("/app/js/printed-offline.js");
        const r = await m.savePrintedPages({ pages: [page_], fetchFn: (u, init) => fetch(`http://localhost:${port}/picture.png`, init) }).then((x) => ({ ok: true, ...x }), (e) => ({ ok: false, msg: e.message }));
        const hit = await (await caches.open("mm-printed-v1")).match(m.pageKey(page_));
        return { ...r, cached: !!hit, size: hit ? (await hit.blob()).size : 0, type: hit?.type ?? null };
      }, { port, page_ });
      const yes = await other(8081, 50);
      check(`${tag} MUTATION TARGET (nocors): a cross-origin host that answers CORS can be kept, as a readable picture`, yes.ok === true && yes.cached && yes.size > 1000 && yes.type !== "opaque", JSON.stringify(yes));
      const no = await other(8082, 51);
      noCors.close();
      check(`${tag} a cross-origin host that does not answer CORS is refused in words and nothing is kept`, no.ok === false && /Could not keep these pages|এই পৃষ্ঠাগুলো রাখা যায়নি/.test(no.msg) && !no.cached, JSON.stringify(no));
    }

    // ---- 7. the browser cleared the cache behind the app's back
    await page.evaluate(async () => { await caches.delete("mm-printed-v1"); });
    await page.reload({ waitUntil: "networkidle" });
    await openOptions(page);
    const cleared = await page.evaluate(() => document.getElementById("printedOfflineTotal")?.textContent ?? "");
    check(`${tag} MUTATION TARGET (noreconcile): a cleared cache leaves no page listed as kept`, (lang === "bn" ? /কোনো ছাপা পৃষ্ঠা রাখা নেই/ : /No printed pages are kept/).test(cleared), cleared);
    await ctx.close();
  }
} finally {
  await browser.close();
  restoreAll();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
