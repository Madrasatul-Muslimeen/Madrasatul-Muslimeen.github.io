// Audit part 24 (PCF J29, manual audit): the User Manual's Records page and Continue strip, each one working.
//   records   1 Records page: one chunk read at a time, status and confirmation shown as stored (I6), the Pending-only filter,
//             an empty chunk says so in words, Confirm writes a confirmation, controls 40px, no sideways scroll, Bangla clean
//   strip     2 Continue strip (on a study page): newest first, each chip opens its module page with ?resume=<subject>, the four
//             hidden modules never appear, it reads only the bookmarks document, the browser's Back returns to the page
// The RESULT is asserted (the reads in window.__fsLog, the stored write, the landed URL), not the element. Each flow has a positive
// control and a timeout that fails by name. Mutations: --mutate=<name> serves one deliberately broken copy of a file.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part24-records-continue-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang");
// [file, route glob, anchor (must occur exactly once), replacement, page prefix it applies to]
const MUTATIONS = {
  // A hidden module's chip is drawn again.
  nohidden: ["app/js/continue-strip.js", "**/continue-strip.js*", 'if (isHiddenFromQr(e.moduleId)) return ""; // QR Stage 1, PCF J30', "", "/app/deen-study.html"],
  // The Pending-only box does nothing.
  nopending: ["app/records.html", "**/records.html*", 'if (pendingOnly.checked) rows = rows.filter(([, e]) => e.confirmState === "pending");', "", "/app/records.html"],
  // The Confirmed column shows what was claimed instead of what was confirmed (I6 broken on screen).
  nofrozen: ["app/records.html", "**/records.html*", 'e.confirmedStatus ? statusLabel(e.confirmedStatus) : "—"', "statusLabel(e.claimedStatus)", "/app/records.html"],
  // The chip no longer carries the subject to resume.
  noresume: ["app/js/continue-strip.js", "**/continue-strip.js*", '?resume=${encodeURIComponent(e.subjectId ?? "")}&back=1', "?back=1", "/app/deen-study.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;

const RESUME = (updatedAt) => ({ position: null, settings: null, updatedAt });
// Newest first: general (HIDDEN), hadith, deen, quranrevival, health (HIDDEN), then arabic (past the strip's cap of five).
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__DATA = DATA;
  DATA.bookmarks = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", folders: [], saved: [],
    resume: ${JSON.stringify({
      "general::none::gsub": RESUME("2026-10-06T00:00:00.000Z"),
      "hadith::none::hsub": RESUME("2026-10-05T00:00:00.000Z"),
      "deen::none::deen_ethics": RESUME("2026-10-04T00:00:00.000Z"),
      "quranrevival::none::quran": RESUME("2026-10-03T00:00:00.000Z"),
      "health::none::hlsub": RESUME("2026-10-02T00:00:00.000Z"),
      "arabic::none::asub": RESUME("2026-10-01T00:00:00.000Z"),
    })} }];
})();`;

async function open(lang, width, pagePath) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: SEED });
  await ctx.route((u) => !["localhost", "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  if (MUTATE && pagePath.startsWith(MUTATIONS[MUTATE][4])) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, pagePath, fn) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, pagePath), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 90000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const wide = (page) => ev(page, () => document.documentElement.scrollWidth - innerWidth);
const small = (page, sel) => ev(page, (s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).display !== "none" && (r.height < 39.5 || r.width < 39.5); }).map((e) => `${e.id || e.className || e.tagName}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`), sel);
const recordReads = (page) => ev(page, () => (window.__fsLog || []).filter((r) => r.col === "records").map((r) => r.id));
const WIDTHS = [320, 390, 820, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
const rowsText = (page) => ev(page, () => [...document.querySelectorAll("#entriesBody tr")].map((tr) => [...tr.children].map((td) => td.innerText.trim())));

// ---------------------------------------------------------------------------------------------------------------
// 1. The Records page
// ---------------------------------------------------------------------------------------------------------------
for (const lang of LANGS) for (const width of WIDTHS.filter((w) => w !== 320)) {
  await flow("records", lang, width, "/app/records.html", async (tag, page, errors) => {
    await page.waitForFunction(() => document.querySelectorAll("#entriesBody tr").length >= 3, null, { timeout: 20000 });
    const rows = await rowsText(page);
    check(`${tag}: positive control: the three seeded entries of the opening chunk are listed`, rows.length === 3 && rows.every((r) => r.length === 8), JSON.stringify(rows).slice(0, 200));
    // Load-speed contract: one chunk per read, never all of a person's records.
    const reads = await recordReads(page);
    check(`${tag}: ONE records chunk was read to draw the page (surah_1), not all of the person's records`, reads.length >= 1 && reads.every((id) => /__p1__surah_1$/.test(id || "")) , JSON.stringify(reads));
    check(`${tag}: the chunk is named on the page`, /surah_1/.test(await ev(page, () => document.getElementById("chunkLabel").dataset.chunkKey)));
    // I6: the stored confirmation is shown as stored. The pending entry was claimed "learning", never confirmed.
    const pending = rows.find((r) => /Try again/.test(r[4]) === false && r[4] && !/Try again/.test(r[4]) && r[7].length > 0 && r[3] === "—");
    check(`${tag}: a pending entry shows its claimed status and NO confirmed status (—), as stored`, !!pending && pending[2] !== "—", JSON.stringify(rows.map((r) => [r[2], r[3]])));
    const confirmedRow = rows.find((r) => r[3] !== "—");
    check(`${tag}: the confirmed entry shows the status that was confirmed, and no Confirm button`, !!confirmedRow && confirmedRow[7] === "", JSON.stringify(confirmedRow));
    const returned = rows.find((r) => /Try again/.test(r[4]));
    check(`${tag}: a returned entry shows its return note`, !!returned);
    if (lang === "bn") {
      const head = await ev(page, () => [...document.querySelectorAll("table thead th")].map((e) => e.innerText.trim()));
      check(`${tag}: the table headings are in Bangla`, head.length >= 7 && head.every((h) => BN.test(h)), head.join(" | "));
      const stat = rows.map((r) => r[2]).filter((x) => x !== "—");
      check(`${tag}: statuses are in Bangla`, stat.length >= 3 && stat.every((x) => BN.test(x)), stat.join(" | "));
    }
    check(`${tag}: no sideways scroll`, (await wide(page)) <= 1, String(await wide(page)));
    const sm = await small(page, "#app button, #app select, #app input:not([type=checkbox])");
    check(`${tag}: every button / picker is 40px or more`, sm.length === 0, sm.slice(0, 6).join(" "));
    // Pending only.
    await page.check("#pendingOnly");
    await page.waitForFunction(() => document.querySelectorAll("#entriesBody tr").length === 1, null, { timeout: 8000 }).catch(() => {});
    const only = await rowsText(page);
    check(`${tag}: Pending only keeps just the pending entry`, only.length === 1 && only[0][3] === "—" && !/Try again/.test(only[0][4]), JSON.stringify(only));
    await page.uncheck("#pendingOnly");
    // Confirm writes the confirmation (the stub records the stored fields).
    await ev(page, () => { window.__stubWriteData = []; window.__stubWrites = []; });
    await page.click("#entriesBody .confirmBtn >> nth=0");
    await page.waitForTimeout(800);
    const writes = await ev(page, () => JSON.stringify([...(window.__stubWriteData || []), ...(window.__stubWrites || [])]));
    check(`${tag}: Confirm stores a confirmation on the records chunk`, /records/.test(writes) && /confirm/i.test(writes), writes.slice(0, 200));
    // A chunk the person has nothing in says so in words (Juz 1 chunks to subject_quran, which holds no entries).
    await page.selectOption("#unitTypeSelect", "juz");
    await page.fill("#unitRef", "1");
    await page.dispatchEvent("#unitRef", "change");
    await page.waitForFunction(() => /subject_quran|subject_/.test(document.getElementById("chunkLabel").dataset.chunkKey), null, { timeout: 8000 }).catch(() => {});
    const empty = await rowsText(page);
    check(`${tag}: a unit with no entries says so in words`, empty.length === 1 && empty[0][0].length > 3 && (lang === "bn" ? BN.test(empty[0][0]) : /Nothing here yet/.test(empty[0][0])), JSON.stringify(empty));
    const reads2 = await recordReads(page);
    check(`${tag}: changing the unit read the other chunk by itself (subject_quran), still one document per read`, reads2.some((id) => /subject_quran$/.test(id || "")) && reads2.every((id) => /__p1__(surah_1|subject_quran)$/.test(id || "")), JSON.stringify(reads2));
    check(`${tag}: no page errors`, errors.length === 0, errors.join(" | ").slice(0, 200));
  });
}
// 320px: the page has no window or sheet of its own; only that it still fits and its controls stay reachable.
for (const lang of LANGS) if (!WONLY || WONLY === 320) {
  await flow("records", lang, 320, "/app/records.html", async (tag, page) => {
    await page.waitForFunction(() => document.querySelectorAll("#entriesBody tr").length >= 3, null, { timeout: 20000 });
    check(`${tag}: no sideways scroll at 320px`, (await wide(page)) <= 1, String(await wide(page)));
  });
}

// ---------------------------------------------------------------------------------------------------------------
// 2. The Continue strip (drawn on every study page; Deen Study is the one used here)
// ---------------------------------------------------------------------------------------------------------------
const HIDDEN = ["general-study.html", "naturelife-study.html", "life-skill.html", "health-study.html"];
for (const lang of LANGS) for (const width of WIDTHS) {
  await flow("strip", lang, width, "/app/deen-study.html", async (tag, page, errors) => {
    await page.waitForSelector("#continueStrip .continue-chip", { timeout: 20000 });
    const chips = await ev(page, () => [...document.querySelectorAll("#continueStrip .continue-chip")].map((a) => ({ href: a.getAttribute("href"), text: a.innerText.trim(), h: Math.round(a.getBoundingClientRect().height) })));
    check(`${tag}: positive control: the strip is drawn with chips`, chips.length > 0, JSON.stringify(chips));
    check(`${tag}: the newest visible places come first (hadith, deen, quranrevival)`, chips.map((c) => c.href.split("?")[0]).join(",") === "hadith-study.html,deen-study.html,quranrevival.html,arabic-study.html", chips.map((c) => c.href).join(" "));
    check(`${tag}: the four hidden modules never appear`, chips.every((c) => !HIDDEN.includes(c.href.split("?")[0])), chips.map((c) => c.href).join(" "));
    check(`${tag}: each chip opens its module page carrying the subject to resume`, chips.every((c) => /\?resume=[A-Za-z_]+&back=1$/.test(c.href)) && chips[1].href === "deen-study.html?resume=deen_ethics&back=1", chips.map((c) => c.href).join(" "));
    check(`${tag}: hidden modules no longer use up places (arabic, the fourth visible, is drawn; audit part 25)`, chips.some((c) => c.href.startsWith("arabic-study")));
    check(`${tag}: every chip is 40px or taller`, chips.every((c) => c.h >= 39.5), chips.map((c) => c.h).join(","));
    // The page's own topic chunk (records) is the page's, not the strip's; the strip's single source is the bookmarks document.
    const reads = await ev(page, () => (window.__fsLog || []).map((r) => r.col));
    check(`${tag}: the strip's source (bookmarks) was read, and no activity, session or note read was made for it`, reads.includes("bookmarks") && !reads.some((c) => /^(activity|sessions|notes|noteFolders|noteSources)/.test(c || "")), JSON.stringify([...new Set(reads)]));
    if (lang === "bn") check(`${tag}: chip wording is Bangla`, chips.every((c) => BN.test(c.text)), chips.map((c) => c.text).join(" | "));
    check(`${tag}: no sideways scroll`, (await wide(page)) <= 1, String(await wide(page)));
    // Open one and come back.
    const here = page.url();
    await page.click('#continueStrip .continue-chip[href^="hadith-study.html"]');
    await page.waitForURL(/hadith-study\.html\?resume=hsub/, { timeout: 15000 });
    check(`${tag}: a chip lands on its module page with ?resume= in the address`, /hadith-study\.html\?resume=hsub&back=1/.test(page.url()), page.url());
    await page.goBack();
    await page.waitForURL(/deen-study\.html/, { timeout: 15000 });
    check(`${tag}: the browser's Back returns to the page the chip was tapped on`, page.url().split("#")[0] === here.split("#")[0], page.url());
    check(`${tag}: no page errors`, errors.length === 0, errors.join(" | ").slice(0, 200));
  });
}

await browser.close();
console.log(`\n==== audit-part24${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
