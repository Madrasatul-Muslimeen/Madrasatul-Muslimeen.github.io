// Audit part 155 (#1418): the WAY-BACK LAW (decision 86) on Hadith Study, Hadith Collections and Dua Study. REPORT ONLY:
// nothing under app/ was changed; a failing check here is a defect recorded in
// docs/reports/2026-11-02-audit-part-155-way-back-hadith-dua.md for the Hadith and Dua Leads.
//
// Part 1, controls that LEAVE: each is followed; the destination must offer a visible way back (back present), the way back
// must work (the reader is on the page they left), the place must be restored (the hadith/dua that was in view, within one
// screen height) and the card must be restored (the same card open/picked out).
// Part 2, ARRIVALS from the shared tools: a bookmark's Open on bookmarks.html (hadith and dua bookmarks; a Quran bookmark is
// the positive control), and a scan of notes / journey-map / records for any link into these pages.
//
// Run from the repository root with serve.js on :8080.   --lang=en|bn  --width=390|1024  --only=<case id>
//   --mutate=note|ayat|duaword|duapage|duaquran|duaref|bmreturn   (each strips ONE way-back mechanism through ONE ctx.route)
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const LANG = arg("lang"), WIDTH = arg("width"), ONLY = arg("only"), MUTATE = arg("mutate");
const MUT = {
  note: ["js/hadith-study-actions.js", 'params.set("back", "1");', ""],
  ayat: ["js/hadith-browser.js", "&back=1&backTo=hadith", ""],
  duaword: ["js/dua-browser.js", "&back=1&from=dua-", "&from=dua-"],
  duapage: ["js/dua-browser.js", 'own.href = "./dua-study.html?back=1";', 'own.href = "./dua-study.html";'],
  duaquran: ["js/dua-study.js", "?goto=${e.ref}&back=1", "?goto=${e.ref}"],
  duaref: ["js/dua-study.js", "&passage=${state.oi.focusPassage}&back=1", "&passage=${state.oi.focusPassage}"],
  bmreturn: ["js/bookmark-nav.js", "sessionStorage.setItem(RETURN_KEY, JSON.stringify({ from: location.href", "void ({ from: location.href"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const QUOTED_BOOK = "0261Muslim.Sahih.Shamela0001727-ara1"; // passage 611 lists 36:38 under "Āyāt this hadith quotes"
const seedBookmarks = `
  DATA.bookmarks[0].saved.push(
    { id: "bmHadith", programId: "none", moduleId: "hadith", subjectId: "hadith", name: "HadeethEnc 4563", position: "hadith:hadeethenc:4563", folderId: null, removed: false, createdAt: "2026-01-02T00:00:00.000Z" },
    { id: "bmDua", programId: "none", moduleId: "hadith", subjectId: "dua", name: "Dua 20", position: "dua:20", folderId: null, removed: false, createdAt: "2026-01-03T00:00:00.000Z" },
    { id: "bmQuran", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Read spot", position: "ayah:3:10", folderId: null, removed: false,
      settings: { view: "read", unitType: "ayah", surahNum: 3, ayahNum: 10, trackableId: "tafsir", mushafOn: false }, createdAt: "2026-01-04T00:00:00.000Z" }
  );
`;

const BACKS = [
  ["notes", "#notesBackBtn:not([hidden])"], ["page", "#hadithBackBtn:not([hidden])"], ["bookmark", "[data-bm-back-link]"],
  ["wordcard", "[data-word-card-app-back]"], ["pill", "#ayahCardBackPill:not([hidden]) [data-ayah-card-back]"],
];
/** The visible way-back control on the current page, or null. */
const findBack = (P) => P.evaluate((backs) => {
  for (const [kind, sel] of backs) for (const e of document.querySelectorAll(sel)) {
    const r = e.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden") {
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { kind, sel, reach: !!top && (top === e || e.contains(top) || top.contains(e) && top.closest(sel) === e), covered: top ? (top.id || top.className || top.tagName) : null, text: (e.getAttribute("aria-label") || e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40) };
    }
  }
  return null;
}, BACKS);
/** Is the element within one screen height of the viewport (the hadith/dua "in view")? */
const nearOf = (P, sel) => P.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.bottom > -innerHeight && r.top < 2 * innerHeight; }, sel);

// ---------- Part 1: the controls that leave ----------
// Every case: open() puts the page in its origin state and returns the page; leave(P) follows the control (returns false if
// it is not there); dest is the destination's address pattern; card/place name the element that must come back.
const hcOpen = (path, setup) => async (ctx) => {
  const { page: P, errors } = await openPage(ctx, path);
  await setup(P);
  return { P, errors };
};
const hcHadeethEnc = async (P) => {
  await P.click('[data-hadith-tab="collections"]').catch(() => {});
  await P.waitForSelector('[data-hadeethenc-category="3"]', { timeout: 20000 });
  await P.click('[data-hadeethenc-category="3"]');
  await P.waitForSelector('[data-hadeethenc-hadith="4563"]', { timeout: 15000 });
  await P.click('[data-hadeethenc-hadith="4563"]');
  await P.waitForSelector('[data-hadeethenc-note-link="4563"][aria-disabled="false"]', { timeout: 15000 }).catch(() => {});
};
/** 📝 / My Notes press opens the shared Note opener over the page (never leaving); the link's own address is followed next. */
const closeOpener = async (P) => {
  const fEl = await P.waitForSelector("#noteOpener:not([hidden]) iframe", { timeout: 8000 }).catch(() => null);
  if (!fEl) return;
  let F = null;
  for (let i = 0; i < 80 && !F; i++) { const f = await fEl.contentFrame(); if (f && /new=1/.test(f.url())) F = f; else await P.waitForTimeout(100); }
  await F?.waitForSelector('[data-nn-tool="back"]', { timeout: 15000 }).catch(() => {});
  await F?.click('[data-nn-tool="back"]').catch(() => {});
  await P.waitForFunction(() => document.getElementById("noteOpener")?.hidden, null, { timeout: 8000 }).catch(() => {});
};
const followHref = async (P, sel) => {
  const href = await P.evaluate((s) => document.querySelector(s)?.getAttribute("href") ?? null, sel);
  if (!href) return false;
  await closeOpenerAfterClick(P, sel);
  await P.goto(new URL(href, P.url()).href, { waitUntil: "load" }).catch(() => {});
  return true;
};
const closeOpenerAfterClick = async (P, sel) => { await P.click(sel, { timeout: 8000 }).catch(() => {}); await closeOpener(P); };
/** Click a plain link and wait for the page to change. */
const clickLink = async (P, sel, destRe) => {
  if (!(await P.$(sel))) return false;
  let clicked = true;
  await Promise.all([P.waitForURL(destRe, { timeout: 15000 }).catch(() => {}), P.click(sel, { timeout: 8000 }).catch(() => { clicked = false; })]);
  return clicked;
};
/** A card's Source (or other) menu opens a pop-over holding the link. */
const openMenu = async (P, key) => { await P.click(`[data-dua-menu="${key}"]`, { timeout: 8000 }).catch(() => {}); await P.waitForTimeout(500); };

const duaStudy = (g, openFirst = true) => async (ctx) => {
  const { page: P, errors } = await openPage(ctx, `/app/dua-study.html?g=${g}&back=1`);
  await P.waitForSelector("[data-dua-part]", { timeout: 15000 }).catch(() => {});
  if (g !== "prophets") { await P.click("[data-dua-part] >> nth=0"); }
  await P.waitForSelector("[data-dua-no]", { timeout: 20000 });
  if (openFirst) { await P.click("[data-dua-no] >> nth=0"); await P.waitForSelector("[data-dua-open]", { timeout: 20000 }); await P.waitForTimeout(1200); }
  return { P, errors };
};

const CASES = [
  { id: "hc-note", page: "hadith-collections.html", what: "HadeethEnc hadith 4563 📝 My Notes (to notes.html)", file: "hadith-study-actions.js",
    open: hcOpen("/app/hadith-collections.html", hcHadeethEnc), dest: /notes\.html/,
    leave: (P) => followHref(P, '[data-hadeethenc-note-link="4563"]'), card: '[data-hadeethenc-card="4563"]', seed: "window.__stubApplyBatches = true;" },
  { id: "hs-note", page: "hadith-study.html", what: "HadeethEnc hadith 4563 📝 My Notes (to notes.html)", file: "hadith-study-actions.js",
    open: hcOpen("/app/hadith-study.html", hcHadeethEnc), dest: /notes\.html/,
    leave: (P) => followHref(P, '[data-hadeethenc-note-link="4563"]'), card: '[data-hadeethenc-card="4563"]', seed: "window.__stubApplyBatches = true;" },
  { id: "hc-ayat", page: "hadith-collections.html", what: "OpenITI passage 611's quoted āyah link 36:38 (to the Read view)", file: "hadith-browser.js",
    open: async (ctx) => { const { page: P, errors } = await openPage(ctx, `/app/hadith-collections.html?openiti=${QUOTED_BOOK}&passage=611&back=1`); await P.waitForSelector('[data-ayat-quoted-link="36:38"]', { timeout: 25000 }).catch(() => {}); return { P, errors }; },
    dest: /quranrevival\.html/, leave: (P) => clickLink(P, '[data-ayat-quoted-link="36:38"]', /quranrevival\.html/), card: '[data-openiti-passage="611"]' },
  { id: "hc-duaword", page: "hadith-collections.html", what: "Dua 1's word → Open in the Word card (to the Word card)", file: "dua-browser.js",
    open: async (ctx) => { const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html?back=1"); await P.click('[data-hadith-tab="dua"]'); await P.waitForSelector('[data-dua-card="1"] [data-dua-word="1"]', { timeout: 20000 }); await P.click('[data-dua-card="1"] [data-dua-word="1"]'); await P.waitForSelector('[data-dua-word-panel="1"]:not([hidden]) [data-dua-word-open]', { timeout: 6000 }).catch(() => {}); return { P, errors }; },
    dest: /quranrevival\.html/, leave: (P) => clickLink(P, '[data-dua-word-panel="1"] [data-dua-word-open]', /quranrevival\.html\?word=/), card: '[data-dua-card="1"]', picked: ".hadith-card-focused" },
  { id: "hc-duapage", page: "hadith-collections.html", what: "the Dua tab's \"Dua Study ↗\" link (to dua-study.html)", file: "dua-browser.js",
    open: async (ctx) => { const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html?back=1"); await P.click('[data-hadith-tab="dua"]'); await P.waitForSelector(".dua-study-link", { timeout: 20000 }); await P.waitForSelector('[data-dua-card="1"]', { timeout: 20000 }).catch(() => {}); return { P, errors }; },
    dest: /dua-study\.html/, leave: (P) => clickLink(P, ".dua-study-link", /dua-study\.html/), card: '[data-dua-card="1"]' },
  { id: "ds-quran", page: "dua-study.html", what: "a prophet's dua card → Open in Quran Study ↗ (to the Read view)", file: "dua-study.js",
    open: duaStudy("prophets"), dest: /quranrevival\.html/, leave: async (P) => { await openMenu(P, "source"); return clickLink(P, ".dua-quran-open", /quranrevival\.html/); }, card: "[data-dua-open]" },
  { id: "ds-note", page: "dua-study.html", what: "a Hadith-books dua card 📝 My Notes (to notes.html)", file: "hadith-study-actions.js",
    open: duaStudy("books"), dest: /notes\.html/, leave: (P) => followHref(P, "[data-dua-note-link]"), card: "[data-dua-open]", seed: "window.__stubApplyBatches = true;" },
  { id: "ds-ref", page: "dua-study.html", what: "a narration's reference \"Bukhari 6311\" (to Hadith Collections)", file: "dua-study.js",
    open: duaStudy("books"), dest: /hadith-collections\.html/, leave: async (P) => { await openMenu(P, "source"); return clickLink(P, "[data-dua-ref] >> nth=0", /hadith-collections\.html/); }, card: "[data-dua-open]" },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const scan = [];
const totals2 = { found: 0, backPresent: 0, reach: 0, backWorks: 0, place: 0, card: 0, attempted: 0 };
const totals = { found: 0, backPresent: 0, reach: 0, backWorks: 0, place: 0, card: 0, attempted: 0 };
for (const lang of ["en", "bn"]) for (const [width, height] of [[390, 844], [1024, 768]]) {
  if ((LANG && LANG !== lang) || (WIDTH && Number(WIDTH) !== width)) continue;
  const tag = `[${lang} ${width}]`;
  const n = { found: 0, backPresent: 0, reach: 0, backWorks: 0, place: 0, card: 0, attempted: 0 };
  const base = { appLang: lang, banner: false, viewport: { width, height } };
  const mutate = async (ctx) => {
    if (!MUTATE) return;
    const [file, a, b] = MUT[MUTATE]; let hits = 0;
    await ctx.route((u) => u.pathname.endsWith(`/app/${file}`), async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing in ${file}: ${MUTATE}`);
      hits = src.split(a).length - 1;
      await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  };

  for (const c of CASES) {
    if (ONLY && ONLY !== c.id) continue;
    const ctag = `${tag} ${c.id}`;
    const ctx = await newContext(browser, { ...base, extraSeedJs: c.seed || null });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    await mutate(ctx);
    let P = null, errors = [];
    try { ({ P, errors } = await c.open(ctx)); } catch (e) { check(`${ctag} origin state reached: ${c.what}`, false, String(e.message).split("\n")[0]); await ctx.close(); continue; }
    const originPath = new URL(P.url()).pathname;
    const scrollY0 = await P.evaluate(() => scrollY);
    const hadCard = c.card ? !!(await P.$(c.card)) : true;
    n.attempted++;
    const left = await c.leave(P);
    if (left) n.found++;
    check(`${ctag} control found and followed: ${c.what}`, !!left);
    if (!left) { await ctx.close(); continue; }
    await P.waitForTimeout(1500);
    const here = new URL(P.url());
    check(`${ctag} it leaves for ${c.dest}`, c.dest.test(here.pathname + here.search), P.url());
    // back present: poll for the destination's way-back control (the Read view mounts it late)
    let back = null;
    for (let i = 0; i < 40 && !back; i++) { back = await findBack(P); if (!back) await P.waitForTimeout(250); }
    if (back) n.backPresent++;
    check(`${ctag} the destination offers a visible way back`, !!back, `${here.pathname}${here.search}`);
    if (back) {
      if (back.reach) n.reach++;
      check(`${ctag} the way back can be tapped (nothing covers it)`, back.reach, `covered by ${back.covered}`);
      // A covered control is still pressed (by script) so that "back works" measures the logic, not the covering.
      if (back.reach) await P.click(back.sel, { timeout: 8000 }).catch(() => {});
      else await P.evaluate((s) => document.querySelector(s)?.click(), back.sel).catch(() => {});
      await P.waitForURL((u) => u.pathname === originPath, { timeout: 15000 }).catch(() => {});
      await P.waitForTimeout(2000);
      const there = new URL(P.url()).pathname === originPath;
      if (there) n.backWorks++;
      check(`${ctag} the way back returns to ${originPath}`, there, P.url());
      if (there && c.card) await P.waitForSelector(c.card, { timeout: 15000 }).catch(() => {});
      const sy = await P.evaluate(() => scrollY);
      const near = there && c.card ? await nearOf(P, c.card) : there ? Math.abs(sy - scrollY0) <= (await P.evaluate(() => innerHeight)) : false;
      if (near) n.place++;
      check(`${ctag} place restored (${c.card ?? "scroll"} within one screen height)`, !!near, `scrollY ${scrollY0} -> ${sy}`);
      const cardOk = there && hadCard && !!(await P.$(c.card)) && (!c.picked || !!(await P.$(`${c.card}${c.picked}`)));
      if (cardOk) n.card++;
      check(`${ctag} card restored (${c.card}${c.picked ?? ""} is open again)`, cardOk);
    } else {
      check(`${ctag} the way back returns to ${originPath}`, false, "no way back to follow");
      check(`${ctag} place restored`, false, "no way back to follow");
      check(`${ctag} card restored`, false, "no way back to follow");
    }
    check(`${ctag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
  console.log(`  ${tag} PART 1 COUNTS: attempted ${n.attempted}, links found ${n.found}, back present ${n.backPresent}, back tappable ${n.reach}, back works ${n.backWorks}, place restored ${n.place}, card restored ${n.card}`);
  for (const k of Object.keys(totals)) totals[k] += n[k];
  check(`${tag} POSITIVE CONTROL: some controls were found (${n.found})`, ONLY ? true : n.found > 0);

  // ---------- Part 2: arrivals from the shared tools ----------
  if (ONLY) continue;
  const m = { found: 0, backPresent: 0, reach: 0, backWorks: 0, place: 0, card: 0, attempted: 0 };
  for (const [id, label, destRe, isControl] of [["bmHadith", "hadith bookmark (resume=hadith:hadeethenc:4563)", /hadith-study\.html/, false], ["bmDua", "dua bookmark (resume=dua:20)", /dua-study\.html/, false], ["bmQuran", "Quran bookmark (POSITIVE CONTROL for the pill)", /quranrevival\.html/, true]]) {
    const ctag = `${tag} arrival ${id}`;
    const ctx = await newContext(browser, { ...base, extraSeedJs: seedBookmarks });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    await mutate(ctx);
    const { page: P, errors } = await openPage(ctx, "/app/bookmarks.html");
    const sel = `.bm-row a[data-bm-open-id="${id}"]`;
    await P.waitForSelector(sel, { timeout: 15000 }).catch(() => {});
    m.attempted++;
    const exists = !!(await P.$(sel));
    check(`${ctag} Open link found: ${label}`, exists);
    if (!exists) { await ctx.close(); continue; }
    m.found++;
    const href = await P.getAttribute(sel, "href");
    await Promise.all([P.waitForURL(destRe, { timeout: 15000 }).catch(() => {}), P.click(sel)]);
    await P.waitForTimeout(2500);
    check(`${ctag} Open leaves for ${destRe}`, destRe.test(P.url()), `${href} -> ${P.url()}`);
    let back = null;
    for (let i = 0; i < 24 && !back; i++) { back = await findBack(P); if (!back) await P.waitForTimeout(250); }
    if (back) m.backPresent++;
    check(`${ctag} the destination offers a visible way back`, !!back, P.url());
    if (back) {
      if (back.reach) m.reach++;
      check(`${ctag} the way back can be tapped (nothing covers it)`, back.reach, `covered by ${back.covered}`);
      if (back.reach) await P.click(back.sel, { timeout: 8000 }).catch(() => {}); else await P.evaluate((s) => document.querySelector(s)?.click(), back.sel).catch(() => {});
      await P.waitForURL(/bookmarks\.html/, { timeout: 15000 }).catch(() => {});
      await P.waitForTimeout(1500);
      const there = /bookmarks\.html/.test(P.url());
      if (there) m.backWorks++;
      check(`${ctag} the way back returns to bookmarks.html`, there, P.url());
      const row = there ? await P.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? r.bottom > -innerHeight && r.top < 2 * innerHeight : false; }, sel) : false;
      if (row) m.place++;
      check(`${ctag} place restored (the bookmark's row is within one screen height)`, row);
      if (there && !!(await P.$(sel))) m.card++;
      check(`${ctag} card restored (the bookmark's row is listed again)`, there && !!(await P.$(sel)));
    } else for (const w of ["returns to bookmarks.html", "place restored", "card restored"]) check(`${ctag} ${w}`, false, "no way back to follow");
    check(`${ctag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
  console.log(`  ${tag} PART 2 BOOKMARK ARRIVALS: attempted ${m.attempted}, Open links found ${m.found}, back present ${m.backPresent}, back tappable ${m.reach}, back works ${m.backWorks}, place restored ${m.place}, card restored ${m.card}`);
  for (const k of Object.keys(totals2)) totals2[k] += m[k];
  // Notes / Mapping My Journey / Records: any link into the three pages? (scan, with a positive control that links are read at all)
  {
    const ctx = await newContext(browser, base);
    await ctx.route("**/archive.org/**", (r) => r.abort());
    let all = 0, into = [];
    for (const p of ["notes.html", "journey-map.html", "records.html"]) {
      const { page } = await openPage(ctx, `/app/${p}`);
      await page.waitForTimeout(1200);
      const hrefs = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")));
      all += hrefs.filter((h) => /\.html/.test(h) && !/legacy/.test(h)).length;
      into.push(...hrefs.filter((h) => /(hadith-study|hadith-collections|dua-study)\.html/.test(h)).map((h) => `${p} -> ${h}`));
      await page.close();
    }
    console.log(`  ${tag} SCAN notes/journey-map/records: in-app links ${all}, links into Hadith/Dua pages ${into.length} ${JSON.stringify(into)}`);
    check(`${tag} scan POSITIVE CONTROL: in-app links are read on notes / journey-map / records (${all})`, all > 0);
    scan.push({ tag, all, into: into.length });
    await ctx.close();
  }
}
console.log(`\nPART 1 TOTAL: attempted ${totals.attempted}, found ${totals.found}, back present ${totals.backPresent}, back tappable ${totals.reach}, back works ${totals.backWorks}, place ${totals.place}, card ${totals.card}`);
console.log(`PART 2 TOTAL: attempted ${totals2.attempted}, Open links found ${totals2.found}, back present ${totals2.backPresent}, back tappable ${totals2.reach}, back works ${totals2.backWorks}, place ${totals2.place}, card ${totals2.card}; links from notes/journey-map/records into Hadith/Dua pages: ${scan.reduce((s, x) => s + x.into, 0)}`);
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
