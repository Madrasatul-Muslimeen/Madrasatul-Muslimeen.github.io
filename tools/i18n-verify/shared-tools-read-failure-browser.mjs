// Audit part 125 (PCF MSA J29): a READ that is slow or fails on the shared tools -- Records, Bookmarks, Notes,
// Mapping My Journey, Monitor. app/js/read-failure.js now shows, above #app:
//   * while the first read is on its way: "Loading…" (translated);
//   * when it fails: plain words, a "Try again" button (44px) that re-runs the read, and the raw code only as a small "Ref:" line.
// The failure is modelled by the stub's OPT-IN window.__stubFailReads (default off): a getDoc/getDocs of a named collection
// rejects with { code: "unavailable" }.
//   node tools/i18n-verify/shared-tools-read-failure-browser.mjs [--mutate=<name>] [--shots=/tmp/dir]
//   --mutate=no-retry    the Try again button is not built      -> the retry checks FAIL
//   --mutate=no-message  the plain words are removed            -> the message checks FAIL
//   --mutate=retry-no-hydrate  Try again calls loadContextData() bare  -> "the page then shows exactly what a normal load shows" FAILS (Records, Monitor)
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const SHOT = (process.argv.find((a) => a.startsWith("--shots=")) || "").slice(8);
const MUT = {
  "no-retry": [["app/js/read-failure.js", "box.append(msg, btn);", "box.append(msg);"]],
  // Architect review: the retry must re-hydrate the memberships; a bare loadContextData() left Records/Monitor with no student.
  "retry-no-hydrate": ["records", "monitor", "bookmarks", "notes"].map((p) => [`app/${p}.html`, "getMyMembershipRoles(db, user.uid).then((roles) => loadContextData(hydrateMemberships(db, roles)))", "loadContextData()"]),
  "no-message": [["app/js/read-failure.js", 'msg.textContent = t("This page could not load its data. Please check your connection and try again.");', 'msg.textContent = "";']],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
function source(file) {
  let src = fs.readFileSync(file, "utf8");
  for (const [f, from, to] of MUT[MUTATE] || []) {
    if (f !== file) continue;
    if (src.split(from).length !== 2) throw new Error(`mutation anchor not found exactly once: ${MUTATE} ${from}`);
    src = src.split(from).join(to);
  }
  return src;
}

const PAGES = {
  records: "/app/records.html", bookmarks: "/app/bookmarks.html", notes: "/app/notes.html",
  journey: "/app/journey-map.html", monitor: "/app/monitor.html",
};
const COLS = ["bookmarks", "records", "notes", "noteFolders", "activity", "tenantPeople", "notePlacements", "noteSources"];
const WORDS = {
  en: { msg: "This page could not load its data. Please check your connection and try again.", btn: "Try again", loading: "Loading…" },
  bn: { msg: "এই পাতা তার তথ্য লোড করতে পারেনি। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।", btn: "আবার চেষ্টা করুন", loading: "লোড হচ্ছে…" },
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function open(url, { lang, w, fail: failList = [], latencyMs = 0 }) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: 844 }, latencyMs });
  await ctx.addInitScript((c) => { window.__stubFailReads = c; }, failList);
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) await ctx.route("**/js/read-failure.js*", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: source("app/js/read-failure.js") }));
  for (const f of new Set((MUT[MUTATE] || []).map((m) => m[0]).filter((f) => f.endsWith(".html")))) {
    await ctx.route(`**/${f.replace(/^app\//, "")}*`, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: source(f) }));
  }
  const { page } = await openPage(ctx, url);
  page.__errors = [];
  page.on("pageerror", (e) => page.__errors.push(e.message));
  return { ctx, page };
}
const status = (page) => page.evaluate(() => {
  const el = document.getElementById("qr-read-status");
  if (!el) return null;
  const btn = el.querySelector("[data-read-retry]");
  const br = btn ? btn.getBoundingClientRect() : null;
  const r = el.getBoundingClientRect();
  return {
    failed: el.hasAttribute("data-read-failed"),
    loading: !!el.querySelector("[data-read-loading]"),
    msg: el.querySelector("[data-read-failed-msg]")?.textContent ?? "",
    loadingText: el.querySelector("[data-read-loading]")?.textContent ?? "",
    btnText: btn?.textContent ?? null, btnH: br ? Math.round(br.height) : 0,
    ref: el.querySelector("[data-read-ref]")?.textContent ?? "",
    outside: (el.innerText || "").replace(el.querySelector("[data-read-ref]")?.innerText || "", ""),
    inside: r.left >= -0.5 && r.right <= innerWidth + 0.5, sx: document.documentElement.scrollWidth - innerWidth,
    visible: r.height > 0 && getComputedStyle(el).display !== "none",
  };
});
async function statusWithin(page, pred, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const s = await status(page); if (s && pred(s)) return s; await page.waitForTimeout(150); }
  return await status(page);
}

// The page's own content, clock times dropped, to compare a retried page with a normal load (Architect review).
const appText = (page) => page.evaluate(() => (document.getElementById("app")?.innerText || "").replace(/\d{1,2}:\d\d(:\d\d)?/g, "").trim());
let normalText = "";
for (const lang of ["en", "bn"]) for (const w of [390, 1280]) for (const [name, url] of Object.entries(PAGES)) {
  const tag = `[${name} ${lang} ${w}]`;
  const W = WORDS[lang];
  // positive control: the read succeeds -> no failure banner, the page is filled in
  {
    const { ctx, page } = await open(url, { lang, w });
    await page.waitForFunction(() => document.getElementById("app")?.style.display === "block", null, { timeout: 20000 });
    await page.waitForTimeout(1200);
    check(`${tag} positive control: the read succeeds -> no failure banner and no stuck "Loading…"`, (await status(page)) === null, JSON.stringify(await status(page)));
    normalText = await appText(page);
    check(`${tag} positive control: the page shows its content (${normalText.length} chars)`, normalText.length > 100, normalText.slice(0, 80));
    await ctx.close();
  }
  // slow line: "Loading…" in words while waiting, then it fills in
  if (w === 390) {
    const { ctx, page } = await open(url, { lang, w, latencyMs: 3000 });
    const s = await statusWithin(page, (x) => x.loading, 8000);
    check(`${tag} slow line: says "${W.loading}" in words while it waits`, !!s && s.loading && s.loadingText === W.loading, JSON.stringify(s));
    await page.waitForFunction(() => !document.getElementById("qr-read-status"), null, { timeout: 40000 }).catch(() => {});
    check(`${tag} slow line: when the data arrives the wait line goes and the page is shown`, (await status(page)) === null && (await page.evaluate(() => document.getElementById("app")?.style.display)) === "block", JSON.stringify(await status(page)));
    await ctx.close();
  }
  // failing read
  {
    const { ctx, page } = await open(url, { lang, w, fail: COLS });
    const s = await statusWithin(page, (x) => x.failed, 15000);
    check(`${tag} failed read: says in ${lang}, in plain words, that the page could not load its data`, !!s && s.failed && s.msg === W.msg, JSON.stringify(s));
    check(`${tag} failed read: a "${W.btn}" button, 40px+ tall`, !!s && s.btnText === W.btn && s.btnH >= 40, JSON.stringify(s));
    check(`${tag} failed read: no raw code outside the small Ref line; Ref line present`, !!s && !/unavailable|Failed to get|offline/i.test(s.outside) && /unavailable/.test(s.ref), JSON.stringify(s));
    check(`${tag} failed read: on screen, no sideways scroll`, !!s && s.visible && s.inside && s.sx <= 0, JSON.stringify(s));
    check(`${tag} failed read: no page error`, page.__errors.length === 0, JSON.stringify(page.__errors));
    if (SHOT && lang === "bn" && w === 390) await page.screenshot({ path: `${SHOT}/${name}-bn-390.png` });
    // the line comes back -> Try again re-runs the read and the banner goes
    await page.evaluate(() => { window.__stubFailReads = []; });
    const clicked = await page.click("[data-read-retry]", { timeout: 3000 }).then(() => true, () => false);
    check(`${tag} retry: the button can be pressed`, clicked);
    if (clicked) {
      await page.waitForFunction(() => !document.getElementById("qr-read-status"), null, { timeout: 15000 }).catch(() => {});
      check(`${tag} retry: once the line is back the read runs again and the page is filled in (no banner)`, (await status(page)) === null && (await page.evaluate(() => document.getElementById("app")?.style.display)) === "block", JSON.stringify(await status(page)));
      await page.waitForTimeout(1200);
      const after = await appText(page);
      check(`${tag} retry: the page then shows exactly what a normal load shows (same students, same records)`, after === normalText, `normal ${normalText.length} chars, after retry ${after.length}: ${after.slice(0, 120)}`);
    }
    await ctx.close();
  }
}
// the sign-in-stage read (userIndex) failing: same words and a button too
for (const [name, url] of Object.entries(PAGES)) {
  const { ctx, page } = await open(url, { lang: "en", w: 390, fail: ["*"] });
  const s = await statusWithin(page, (x) => x.failed, 15000);
  check(`[${name} en 390] first read (sign-in stage) failing: plain words + Try again`, !!s && s.msg === WORDS.en.msg && s.btnText === "Try again" && s.btnH >= 40, JSON.stringify(s));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
