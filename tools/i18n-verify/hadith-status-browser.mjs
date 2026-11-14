// Know Your Status (the Owner, 14 Nov 2026, demos approved): on the real Hadith Study page, against the real library.
//   - the menu bar: Menu, Books, Subjects, Explore, Know Your Status (beside Explore); Search is NOT in the bar but at the top right,
//     level with the page heading, and still opens the search;
//   - the list: ONE small icon above the text of a hadith that has a status, nothing on an unmarked or cleared one; one read of the
//     person's bookmarks for the whole list (I9), none more when another chapter opens;
//   - the card: "My status" buttons; press to set, press again to clear. The status lives on the hadith's bookmark (one saved[]
//     entry, updated in place; clearing keeps the bookmark, nothing is deleted); a refused write is said in words (I15);
//   - the wheel: By Book then Chapters, By Topic then Books; centre shows the percentage AND the count; "Counts as done" defaults to
//     Memorised + Revising; a way back from the card's link to the same hadith; a hadith status bookmark reopens its hadith.
// Run from the repository root with serve.js on :8080. Exits 0 only when every check passed.
//   --mutate=<name> serves one deliberate break (the run must FAIL); --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUT = {
  nobadge: ["js/hadith-status.js", "  const s = statusById(known.get(statusPosition(versionUri, n)));\n  if (!s) return null;", "  return null;"],
  searchinbar: ["js/hadith-browser.js", "...(searchSlot ? [] : [[\"search\", t(\"Search\")]]),", "[\"search\", t(\"Search\")],"],
  alwayscreate: ["js/hadith-study-actions.js", "  if (existing) {\n    const settings = { ...(existing.settings ?? {}), status };", "  if (false) {\n    const settings = { ...(existing.settings ?? {}), status };"],
  nofail: ["js/hadith-status.js", "          console.error(err);\n          await draw({ text: t(\"The status could not be saved. Check the connection and try again.\"), failed: true });", "          console.error(err);\n          await draw({ text: t(\"Saved on its bookmark as {name}.\", { name: label(s) }) });"],
  alldone: ["js/hadith-status-model.js", "export const DEFAULT_DONE = Object.freeze([\"mem\", \"rev\"]);", "export const DEFAULT_DONE = Object.freeze([\"mem\", \"rev\", \"need\", \"saved\"]);"],
  wrongpos: ["js/hadith-status-model.js", "export const statusPosition = (versionUri, n) => `openiti:${versionUri}:${n}`;", "export const statusPosition = (versionUri, n) => `hadith:${versionUri}:${n}`;"],
  noback: ["js/hadith-browser.js", "state.statusBack = { label: `← ${t(\"Back to Hadith {n}\", { n: num(no) })}` };", "state.statusBack = null;"],
  eagerread: ["js/hadith-browser.js", "registerBuiltinSubjects(HADITH_SUBJECTS);\n", "registerBuiltinSubjects(HADITH_SUBJECTS);\nprimeStatuses(() => {});\n"],
  clearremoves: ["js/hadith-study-actions.js", "    const ok = await updateSavedBookmarkFields(db, session.tenantId, session.personId, existing.id, { position: existing.position, settings });", "    const ok = status === null ? (await removeSavedBookmark(db, session.tenantId, session.personId, existing.id), true) : await updateSavedBookmarkFields(db, session.tenantId, session.personId, existing.id, { position: existing.position, settings });"],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
if (MUTATE) { const [file, anchor] = MUT[MUTATE]; if (!fs.readFileSync(`app/${file}`, "utf8").includes(anchor)) { console.log(`  FAIL  mutation anchor missing: ${MUTATE} (${file})`); process.exit(1); } }
if (process.argv.includes("--prove")) {
  const missed = []; let caught = 0;
  const only = arg("only") ? arg("only").split(",") : Object.keys(MUT);
  for (const name of only) {
    const r = spawnSync(process.execPath, [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const ff = (r.stdout || "").split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && ff && !/mutation anchor missing/.test(ff)) { caught++; console.log(`  CAUGHT  ${name}: ${ff.trim().slice(0, 130)}`); } else { missed.push(name); console.log(`  MISSED  ${name}`); }
  }
  console.log(`\n==== hadith-status mutations: ${caught} of ${only.length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const U = "0256Bukhari.Sahih.JK000110-ara1";
const SEED_BK = `const mk = (n, st, id) => ({ id, programId: "none", moduleId: "hadith", subjectId: "openiti", name: "Sahih al-Bukhari " + n, position: "openiti:${U}:" + n, settings: { status: st }, folderId: null, personTagId: null, removed: false, createdAt: "2026-11-14T00:00:00.000Z" });
DATA.bookmarks = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", resume: {}, saved: [mk(1653, "mem", "s10"), mk(1654, "need", "s11"), mk(1655, "rev", "s12"), mk(1656, "saved", "s13"), mk(1657, null, "s14")] }];
DATA.hadithSubjects = [{ _id: "t1", tenantId: "t1", schemaVersion: 1, createdBy: "test-uid", subjects: { akhlaq: [
  { versionUri: "${U}", n: 1653, number: 10, kind: "hadith", book: "Sahih al-Bukhari", chapter: "c", title: "t", status: "active" },
  { versionUri: "${U}", n: 1654, number: 11, kind: "hadith", book: "Sahih al-Bukhari", chapter: "c", title: "t", status: "active" } ], ghayb: [], stories: [] } }];`;

async function open(lang, width, { seed = SEED_BK, route = "/app/hadith-study.html", ready = "[data-openiti-book]" } = {}) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: `window.__stubApplyBatches = true; window.__stubApplyUpdates = true; ${seed}` });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, route);
  await page.waitForSelector(ready, { state: "attached" });
  return { ctx, page, errors };
}
const settle = (p, ms = 300) => p.waitForTimeout(ms);
const tap = (p, sel) => p.click(sel, { timeout: 8000 }).catch(() => console.log(`  note: could not tap ${sel}`));
const bkReads = (p) => p.evaluate(() => (window.__fsLog || []).filter((r) => r.col === "bookmarks" && r.kind === "getDoc").length);
const writes = (p) => p.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "bookmarks"));
// ch-33's bab 32 holds ten hadith (n 1653-1661 and 1859): a list long enough to show marked and unmarked rows together.
async function openChapter(p, ch = "ch-33", bab = 32) {
  if (!(await p.$(`[data-openiti-chapter="${ch}"]`))) { await tap(p, `[data-openiti-book="${U}"]`); await p.waitForSelector(`[data-openiti-chapter="${ch}"]`, { state: "attached" }); }
  await tap(p, `[data-openiti-chapter="${ch}"]`);
  await p.waitForSelector(`[data-openiti-bab="${bab}"]`, { state: "attached" });
  await tap(p, `[data-openiti-bab="${bab}"]`);
  await p.waitForSelector("[data-openiti-row]", { state: "attached" }); await settle(p, 700);
}
const ascii = (v) => String(v ?? "").replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
const wheel = (p) => p.evaluate(() => ({ segs: document.querySelectorAll(".hs-seg").length, pct: document.querySelector('[data-hadith-status-centre="pct"]')?.textContent, count: document.querySelector('[data-hadith-status-centre="count"]')?.textContent, bands: [...document.querySelectorAll(".hs-seg path[data-band]")].length, trail: document.querySelector(".hadith-status-trail")?.textContent ?? "" })).then((w) => ({ ...w, pct: ascii(w.pct), count: ascii(w.count) }));
const fits = (p, sel) => p.evaluate((q) => { const cw = document.documentElement.clientWidth; const els = [...document.querySelectorAll(q)].filter((e) => e.getBoundingClientRect().width > 0); return { side: document.documentElement.scrollWidth - cw, out: els.filter((e) => { const r = e.getBoundingClientRect(); return r.left < -0.5 || r.right > cw + 0.5; }).length, minH: els.length ? Math.min(...els.map((e) => Math.round(e.getBoundingClientRect().height))) : 0, n: els.length }; }, sel);

// ---- 1. The bar and the header (every width, both languages) ----------------------------------------------------------
for (const [lang, width] of [["en", 1280], ["en", 820], ["en", 390], ["en", 320], ["bn", 390], ["bn", 320]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n===== know your status, the bar ${tag} =====`);
  const { ctx, page: P, errors } = await open(lang, width);
  const order = await P.$$eval(".hadith-tabs [data-hadith-tab]", (n) => n.map((x) => x.dataset.hadithTab));
  check(`${tag} the bar is Menu, Books, Subjects, Explore, Know Your Status, in that order`, JSON.stringify(order) === JSON.stringify(["menu", "books", "subjects", "explore", "status"]), JSON.stringify(order));
  check(`${tag} Search is not in the bar`, !(await P.$(".hadith-tabs [data-hadith-tab=search]")));
  const hs = await P.$eval("#hadithHeaderSearch [data-hadith-tab=search]", (n) => { const r = n.getBoundingClientRect(), h = document.querySelector(".page-title-row h1").getBoundingClientRect(), row = document.querySelector(".page-title-row").getBoundingClientRect(); return { cy: r.top + r.height / 2, hcy: h.top + h.height / 2, right: r.right, rowRight: row.right, h: r.height, w: r.width }; }).catch(() => null);
  check(`${tag} Search is at the top right, level with "Hadith Study"`, !!hs && Math.abs(hs.cy - hs.hcy) <= 8 && hs.rowRight - hs.right <= 2 && hs.h >= 40, JSON.stringify(hs));
  const bar = await P.$eval(".hadith-tabs", (n) => ({ sw: n.scrollWidth, cw: n.clientWidth, h: Math.round(n.getBoundingClientRect().height) }));
  check(`${tag} the whole bar is on screen (no button hidden past the edge)`, bar.sw <= bar.cw + 1, JSON.stringify(bar));
  const f = await fits(P, ".hadith-tabs .hadith-tab, .hadith-tabs .hadith-menu-btn, .hadith-header-search");
  check(`${tag} nothing runs off the screen and every control is at least 40px tall`, f.side <= 0 && f.out === 0 && f.minH >= 40, JSON.stringify(f));
  if (width === 1280 || width === 320) await P.screenshot({ path: `/tmp/ks-bar-${lang}-${width}.png`, clip: { x: 0, y: 0, width, height: 360 } });
  await tap(P, "#hadithHeaderSearch [data-hadith-tab=search]"); await settle(P, 400);
  check(`${tag} the top-right Search opens the search`, !!(await P.$("#hadithBody input[type=search], #hadithBody input[type=text], #hadithBody [data-hadith-search]")) || (await P.$eval("#hadithHeaderSearch .hadith-header-search", (n) => n.classList.contains("active"))));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|quran\.com/i.test(String(e))).length === 0, JSON.stringify(errors.slice(0, 2)));
  await ctx.close();
}

// ---- 2. The list: the icon above a marked hadith, one read ---------------------------------------------------------------
for (const [lang, width] of [["en", 1280], ["bn", 390]]) {
  const tag = `[${lang} ${width} list]`;
  console.log(`\n===== know your status, the list ${tag} =====`);
  const { ctx, page: P } = await open(lang, width);
  const before = await bkReads(P);
  await openChapter(P);
  const after1 = await bkReads(P);
  const marks = await P.$$eval("[data-openiti-row]", (rows) => rows.map((r) => [r.dataset.openitiRow, r.querySelector("[data-hadith-status-badge]")?.dataset.hadithStatusBadge ?? null]));
  const m = Object.fromEntries(marks);
  check(`${tag} the four marked hadith show their icon (Memorised, Need to memorise, Revising, Bookmarked only)`, m["1653"] === "mem" && m["1654"] === "need" && m["1655"] === "rev" && m["1656"] === "saved", JSON.stringify(marks.slice(0, 7)));
  check(`${tag} a cleared status and an unmarked hadith show NO icon`, m["1657"] === null && m["1658"] === null && m["1659"] === null, JSON.stringify(marks.slice(3, 8)));
  check(`${tag} exactly 4 icons in the whole list`, marks.filter(([, s]) => s).length === 4, String(marks.filter(([, s]) => s).length));
  const geo = await P.$eval('[data-openiti-row="1653"]', (r) => { const b = r.querySelector("[data-hadith-status-badge] i").getBoundingClientRect(), s = r.querySelector(".hadith-reader-snippet").getBoundingClientRect(), rr = r.getBoundingClientRect(); return { badgeBottom: b.bottom, snipTop: s.top, inRow: b.left >= rr.left - 1 && b.right <= rr.right + 1 && b.top >= rr.top - 1, w: b.width }; });
  check(`${tag} the icon sits ABOVE the hadith's text, inside its row`, geo.badgeBottom <= geo.snipTop + 1 && geo.inRow && geo.w <= 30, JSON.stringify(geo));
  const label = await P.$eval('[data-openiti-row="1654"] [data-hadith-status-badge] i', (i) => i.getAttribute("aria-label"));
  check(`${tag} the icon has a name for a screen reader`, !!label && label.length > 3, label);
  check(`${tag} the whole list cost ONE read of the person's bookmarks (I9)`, after1 - before === 1, `${before} -> ${after1}`);
  if (!(await P.$eval('[data-openiti-chapter="ch-34"]', (n) => n.getBoundingClientRect().width > 0).catch(() => false))) { await tap(P, '[data-reader-show="chapters"]'); await settle(P, 300); }
  await tap(P, `[data-openiti-chapter="ch-34"]`); await settle(P, 600);
  check(`${tag} opening another chapter reads nothing more`, (await bkReads(P)) === after1, `${after1} -> ${await bkReads(P)}`);
  await ctx.close();
}

// ---- 3. The card: set, change, clear; a refused write ----------------------------------------------------------------------
{
  const tag = "[en 1280 card]";
  console.log(`\n===== know your status, the card ${tag} =====`);
  const { ctx, page: P } = await open("en", 1280);
  await openChapter(P);
  await tap(P, '[data-openiti-row="1658"]'); await P.waitForSelector("[data-hadith-status-row]", { state: "attached" }); await settle(P, 500);
  const chips = await P.$$eval("[data-hadith-status-set]", (n) => n.map((x) => [x.dataset.hadithStatusSet, x.getAttribute("aria-pressed")]));
  check(`${tag} the card shows the four statuses, none pressed`, JSON.stringify(chips.map((c) => c[0])) === JSON.stringify(["mem", "rev", "need", "saved"]) && chips.every((c) => c[1] === "false"), JSON.stringify(chips));
  await tap(P, '[data-hadith-status-set="mem"]'); await settle(P, 600);
  let w = await writes(P);
  const last = w[w.length - 1];
  const saved = last?.data?.saved ?? [];
  const e15 = saved.find((b) => b.position === `openiti:${U}:1658`);
  check(`${tag} setting Memorised updates the person's bookmarks document with ONE new hadith bookmark`, w.length === 1 && last.kind === "update" && saved.length === 6 && !!e15 && e15.moduleId === "hadith" && e15.subjectId === "openiti" && e15.settings?.status === "mem" && e15.removed === false, JSON.stringify({ n: w.length, kind: last?.kind, len: saved.length, e15 }));
  check(`${tag} the five earlier bookmarks are carried over unchanged`, ["s10", "s11", "s12", "s13", "s14"].every((id) => saved.some((b) => b.id === id)) && saved.find((b) => b.id === "s10").settings.status === "mem");
  check(`${tag} the icon appears in the list at once, and the button shows pressed`, (await P.$eval('[data-openiti-row="1658"] [data-hadith-status-badge]', (n) => n.dataset.hadithStatusBadge).catch(() => null)) === "mem" && (await P.$eval('[data-hadith-status-set="mem"]', (n) => n.getAttribute("aria-pressed"))) === "true");
  const msg = await P.$eval("[data-hadith-status-msg]", (n) => ({ t: n.textContent, f: "hadithStatusFailed" in n.dataset })).catch(() => null);
  check(`${tag} it says it was saved, in words`, !!msg && !msg.f && /saved/i.test(msg.t), JSON.stringify(msg));
  // change to Revising: the SAME entry is updated
  await tap(P, '[data-hadith-status-set="rev"]'); await settle(P, 600);
  w = await writes(P);
  const s2 = w[w.length - 1].data.saved.filter((b) => b.position === `openiti:${U}:1658`);
  check(`${tag} changing the status updates the SAME bookmark (no second entry)`, s2.length === 1 && s2[0].settings.status === "rev", JSON.stringify(s2));
  // clear
  await tap(P, '[data-hadith-status-set="rev"]'); await settle(P, 600);
  w = await writes(P);
  const s3 = w[w.length - 1].data.saved.filter((b) => b.position === `openiti:${U}:1658`);
  check(`${tag} pressing it again CLEARS the status and keeps the bookmark (nothing is deleted)`, s3.length === 1 && s3[0].settings.status === null && s3[0].removed === false && w[w.length - 1].data.saved.length === 6, JSON.stringify(s3));
  check(`${tag} ...and the icon is gone from the list`, !(await P.$('[data-openiti-row="1658"] [data-hadith-status-badge]')));
  // a refused write
  await P.evaluate(() => { window.__stubFailWrites = true; });
  await tap(P, '[data-hadith-status-set="need"]'); await settle(P, 700);
  const m2 = await P.$eval("[data-hadith-status-msg]", (n) => ({ t: n.textContent, f: "hadithStatusFailed" in n.dataset })).catch(() => null);
  check(`${tag} a refused write says so in words, flagged as failed`, !!m2 && m2.f && /could not be saved/i.test(m2.t), JSON.stringify(m2));
  check(`${tag} ...and nothing shows as marked`, !(await P.$('[data-openiti-row="1658"] [data-hadith-status-badge]')) && (await P.$eval('[data-hadith-status-set="need"]', (n) => n.getAttribute("aria-pressed"))) === "false");
  await ctx.close();
}

// ---- 4. The wheel ----------------------------------------------------------------------------------------------------------
for (const [lang, width] of [["en", 1280], ["bn", 390]]) {
  const tag = `[${lang} ${width} wheel]`;
  console.log(`\n===== know your status, the wheel ${tag} =====`);
  const { ctx, page: P, errors } = await open(lang, width);
  await tap(P, '[data-hadith-tab="status"]'); await P.waitForSelector(".hs-seg", { state: "attached" }); await settle(P, 500);
  let w = await wheel(P);
  check(`${tag} By Book: one segment for each book of the library (15), with bands where the person has marked`, w.segs === 15 && w.bands >= 1, JSON.stringify(w));
  check(`${tag} the centre shows the percentage AND the count (2 done of 80579 hadith in the library: Memorised + Revising)`, /^0%$/.test(w.pct) && /80579/.test(w.count) && /\b2\b/.test(w.count), JSON.stringify(w));
  const bk = await P.$$eval(".hs-seg", (n) => n.length);
  await P.evaluate(() => { [...document.querySelectorAll(".hadith-status-rows li > button")].find((b) => b.textContent.includes("Sahih al-Bukhari"))?.click(); }); await settle(P, 300);
  const sel = await P.$eval(".hadith-status-detail", (n) => n.textContent);
  check(`${tag} selecting a book shows its counts in words and an "Open chapters" button`, /Bukhari|بخاري|বুখারী/i.test(sel) && !!(await P.$("[data-hadith-status-open]")), sel.slice(0, 160));
  const sub = ascii(await P.$eval('[data-hadith-status-centre="count"]', (n) => n.textContent));
  check(`${tag} the centre now counts that book: 2 done of 7129 hadith`, /7129/.test(sub) && /\b2\b/.test(sub), sub);
  await tap(P, "[data-hadith-status-open]"); await settle(P, 600);
  w = await wheel(P);
  check(`${tag} Open chapters: only the chapters with a marked hadith are drawn (the book has many more), with a note and a way to show all`, w.segs >= 1 && w.segs <= 5 && !!(await P.$(".hadith-status-capnote")) && !!(await P.$("[data-hadith-status-show-all]")), JSON.stringify(w));
  check(`${tag} a way back is shown`, !!(await P.$("[data-hadith-status-back]")));
  await tap(P, "[data-hadith-status-show-all]"); await settle(P, 600);
  const all = await wheel(P);
  check(`${tag} Show all chapters draws many more`, all.segs > 30, JSON.stringify(all));
  await tap(P, "[data-hadith-status-back]"); await settle(P, 600);
  w = await wheel(P);
  check(`${tag} Back returns to all books`, w.segs === 15, JSON.stringify(w));
  // by topic
  await tap(P, '[data-hadith-status-mode="topic"]'); await settle(P, 700);
  w = await wheel(P);
  check(`${tag} By Topic: the one Subject that has hadith filed is drawn`, w.segs === 1, JSON.stringify(w));
  check(`${tag} ...50% done (1 Memorised of 2 filed), "1 of 2"`, /50/.test(w.pct) && /\b1\b/.test(w.count) && /\b2\b/.test(w.count), JSON.stringify(w));
  await tap(P, ".hadith-status-rows li:first-child button"); await tap(P, "[data-hadith-status-open]"); await settle(P, 600);
  w = await wheel(P);
  check(`${tag} Open books: one book feeds the topic`, w.segs === 1, JSON.stringify(w));
  // counts as done
  await tap(P, '[data-hadith-status-done="need"]'); await settle(P, 500);
  w = await wheel(P);
  check(`${tag} ticking "Need to memorise" as done raises it to 100% (2 of 2)`, /100/.test(w.pct), JSON.stringify(w));
  const persisted = await P.evaluate(() => localStorage.getItem("hadith.status.done"));
  check(`${tag} the choice is remembered on this device`, !!persisted && persisted.includes("need"), String(persisted));
  const f = await fits(P, ".hadith-status-wheel button, .hadith-status-done label");
  check(`${tag} the wheel view fits the screen with every control at least 40px tall`, f.side <= 0 && f.out === 0 && f.minH >= 40, JSON.stringify(f));
  if (width === 390 || width === 1280) await P.screenshot({ path: `/tmp/ks-wheel-${lang}-${width}.png`, fullPage: false });
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|quran\.com/i.test(String(e))).length === 0, JSON.stringify(errors.slice(0, 2)));
  await ctx.close();
}

// ---- 5. From the card to the wheel and back; a status bookmark reopens its hadith ------------------------------------------
{
  const tag = "[en 820 way back]";
  console.log(`\n===== know your status, the way back ${tag} =====`);
  const { ctx, page: P } = await open("en", 820);
  await openChapter(P);
  await tap(P, '[data-openiti-row="1655"]'); await P.waitForSelector("[data-hadith-status-open-wheel]", { state: "attached" }); await settle(P, 500);
  await tap(P, "[data-hadith-status-open-wheel]"); await P.waitForSelector(".hs-seg", { state: "attached" }); await settle(P, 500);
  const back = await P.$eval("[data-hadith-status-back-home]", (n) => n.textContent).catch(() => null);
  check(`${tag} the wheel opened from a card says "Back to Hadith ..."`, !!back && /Back to Hadith/.test(back), String(back));
  await tap(P, "[data-hadith-status-back-home]"); await settle(P, 900);
  check(`${tag} Back returns to the same hadith, open`, !!(await P.$('[data-openiti-passage="1655"]')) && (await P.$eval('[data-openiti-row="1655"]', (n) => n.getAttribute("aria-current"))) === "true");
  await ctx.close();
}
{
  const tag = "[en 1280 resume]";
  console.log(`\n===== know your status, a status bookmark reopens its hadith ${tag} =====`);
  const { ctx, page: P } = await open("en", 1280, { route: `/app/hadith-study.html?resume=${encodeURIComponent(`openiti:${U}:1655`)}`, ready: "[data-openiti-row]" });
  await settle(P, 1200);
  check(`${tag} ?resume=openiti:<book>:<n> opens that hadith`, !!(await P.$('[data-openiti-passage="1655"]')) || !!(await P.$('[data-openiti-row="1655"][aria-current="true"]')));
  await ctx.close();
}

await browser.close();
console.log(`\n==== hadith-status: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
