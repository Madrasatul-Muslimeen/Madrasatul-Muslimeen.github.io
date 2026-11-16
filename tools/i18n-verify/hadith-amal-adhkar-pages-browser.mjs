// The printed page of a hadith in the three books that had NONE (Hadith Lead 16L, 16 Nov 2026; the Owner's n106j 3.A: "find a source for the
// three books with none"): 'Amal al-Yawm wa'l-Layla by an-Nasa'i (Shamela 6772) and by Ibn al-Sunni (13132), and Nawawi's al-Adhkar (1956).
// Each is keyed by OUR record order `n` (registry keyBy "n"), built by tools/hadith-data-pull/shamela-pages-anchors.py: rare 6-word phrases from
// the record's own text vote for where it sits in Shamela's typed pages. Shamela is stubbed here (offline): the suite proves WHICH page is asked
// for. The anchors (hadith-amal-adhkar-anchors.json) were read on live shamela.ws, independently of the tool that built the maps.
// Run from the repository root, serve.js on :8080.   --mutate=<name> serves one deliberate break; --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUT = {
  wrongindex: ["js/hadith-book-pages.js", "/${Math.trunc(Number(index))}`;", "/${Math.trunc(Number(index)) + 1}`;"],
  wrongbook: ["js/hadith-book-pages.js", 'key: "ibnsunni-amal", kind: "shamela", keyBy: "n", shamelaId: "13132"', 'key: "ibnsunni-amal", kind: "shamela", keyBy: "n", shamelaId: "13133"'],
  nobutton: ["js/hadith-browser.js", "const bp = pageNo ? bookPageButton(vUri, pageNo) : null; if (bp) card.appendChild(bp); }", "}"],
  usesnumber: ["js/hadith-browser.js", 'isKeyedByN(vUri) ? ((h.kind === "hadith" || h.kind === "passage") && Number(h.n) > 0 ? Math.trunc(Number(h.n)) : null)', 'isKeyedByN(vUri) ? (h.kind === "hadith" && Number(h.number) > 0 ? Math.trunc(Number(h.number)) : null)'],
  notkeyedbyn: ["js/hadith-book-pages.js", 'key: "nawawi-adhkar", kind: "shamela", keyBy: "n",', 'key: "nawawi-adhkar", kind: "shamela",'],
  nocredit: ["js/hadith-book-viewer.js", "      : t(\"Printed text: Shamela Library, {edition}, p. {page}\", { edition, page: num(String(info.page ?? \"\")) }))", "      : \"\")"],
  withdownload: ["js/hadith-book-viewer.js", "  if (!shamela) {\n    const dl = bookDownload(book);", "  if (true) {\n    const dl = bookDownload(book);"],
  noescape: ["js/hadith-book-viewer.js", 'if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePane(); return; }', ""],
  eagerload: ["js/hadith-book-viewer.js", "  const note = el(\"span\", \"book-page-error\");", "  loadBookPage(versionUri, lazy ? 1 : number).catch(() => {});\n  const note = el(\"span\", \"book-page-error\");"],
  shiftedmap: ["MAP", "", ""], // serves each of the three maps with every page index moved on by one
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (process.argv.includes("--prove")) {
  let caught = 0;
  for (const name of Object.keys(MUT)) {
    const r = spawnSync("node", [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const failed = /FAIL/.test(r.stdout) && r.status === 1 && !/anchor missing/.test(r.stdout + r.stderr);
    if (failed) caught++;
    console.log(`  ${failed ? "CAUGHT " : "MISSED "} ${name}: ${(r.stdout.match(/FAIL .*/) || [r.stderr.split("\n")[0]])[0].slice(0, 110)}`);
  }
  console.log(`\n==== hadith-amal-adhkar-pages mutations: ${caught} of ${Object.keys(MUT).length} caught ====`);
  process.exit(caught === Object.keys(MUT).length ? 0 : 1);
}
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const ANCH = JSON.parse(fs.readFileSync("tools/i18n-verify/hadith-amal-adhkar-anchors.json", "utf8")).books;
const reg = JSON.parse(fs.readFileSync("tools/hadith-data-pull/sources/book-pages.json", "utf8"));
const BOOKS = {
  "nasai-amal": { uri: "0303Nasai.CamalYawmWaLayla.JK000735-ara1", sid: "6772", titleEn: "'Amal al-Yawm wa'l-Layla (an-Nasa'i)", editionEn: "ed. Farouk Hamada, al-Risala, 2nd ed. 1406 AH", editionBn: "ফারুক হামাদাহ সম্পাদিত, আর-রিসালা, ২য় সংস্করণ, ১৪০৬ হিজরী" },
  "ibnsunni-amal": { uri: "0364IbnSunniDinawari.CamalYawmWaLayl.JK000943-ara1", sid: "13132", titleEn: "'Amal al-Yawm wa'l-Layla (Ibn al-Sunni)", editionEn: "as listed on Shamela (Abd al-Qadir Ata's edition)", editionBn: "শামেলায় তালিকাভুক্ত (আবদুল কাদির আতা সম্পাদিত)" },
  "nawawi-adhkar": { uri: "0676Nawawi.Adhkar.JK001249-ara1", sid: "1956", titleEn: "al-Adhkar (Nawawi)", editionEn: "ed. al-Arna'ut, Dar al-Fikr, 1994", editionBn: "আল-আরনাউত সম্পাদিত, দারুল ফিকর, ১৯৯৪" },
};
const mp = {}, recsOf = {};
for (const [key, B] of Object.entries(BOOKS)) {
  const row = reg.books.find((b) => b.key === key);
  const m = mp[key] = JSON.parse(fs.readFileSync(`tools/hadith-data-pull/output/book-pages/${key}.json`, "utf8"));
  const dir = `tools/hadith-data-pull/output/openiti-release/split/${B.uri}`;
  const recs = fs.readdirSync(dir).filter((f) => /^ch-.*\.json$/.test(f)).flatMap((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")).hadiths);
  recsOf[key] = recs;
  const hadith = recs.filter((r) => r.kind === "hadith");
  check(`${key}: the registry row is Shamela ${B.sid}, keyed by n, status mapped, and the map is for it (parallel arrays of ${row?.lastNumber})`, row?.kind === "shamela" && row.keyBy === "n" && row.status === "mapped" && row.shamela.id === B.sid && m.keyBy === "n" && m.shamelaId === B.sid && m.numbers === row.lastNumber && m.i.length === row.lastNumber && m.v.length === row.lastNumber && m.g.length === row.lastNumber && Math.max(...recs.map((r) => r.n)) === row.lastNumber);
  const mapped = hadith.filter((r) => m.i[r.n - 1] > 0).length;
  check(`${key}: coverage: ${mapped} of ${hadith.length} hadith have a page (at least ${ANCH[key].minCoverage * 100}%)`, mapped >= hadith.length * ANCH[key].minCoverage, String(mapped));
  check(`${key}: every page index is inside the book (1 to ${row.shamela.lastIndex}); one volume (v is 0); index, page and volume agree on present/absent`, m.i.every((x, k) => (x === 0 && m.g[k] === 0) || (Number.isInteger(x) && x >= 1 && x <= row.shamela.lastIndex && m.g[k] > 0)) && m.v.every((x) => x === 0));
  let back = 0, prev = 0;
  for (const x of m.i) { if (!x) continue; if (x < prev) back++; prev = x; }
  check(`${key}: pages never go backwards (${back}; at most ${ANCH[key].maxBackwards})`, back <= ANCH[key].maxBackwards, String(back));
  check(`${key}: hand-read anchors (n = ${Object.keys(ANCH[key].at).join(", ")}): index, volume and printed page, exact`, Object.entries(ANCH[key].at).every(([n, [i, v, g]]) => m.i[n - 1] === i && m.v[n - 1] === v && m.g[n - 1] === g), Object.keys(ANCH[key].at).map((n) => [m.i[n - 1], m.v[n - 1], m.g[n - 1]].join(":")).join(" "));
  const idx = Object.values(ANCH[key].at).map((a) => a[0]);
  check(`${key}: the anchors run from early to late in the book (reading order)`, idx.every((x, k) => k === 0 || x > idx[k - 1]) && idx[idx.length - 1] > row.shamela.lastIndex * 0.7);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const bnd = (n) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
for (const [key, B] of Object.entries(BOOKS)) for (const [lang, width] of [["en", 1280], ["bn", 390]]) {
  const tag = `[${key} ${lang} ${width}]`;
  const { n: N, chapter } = ANCH[key].ui;
  const [I, , G] = ANCH[key].at[String(N)] ?? mp[key].i[N - 1] ? [mp[key].i[N - 1], 0, mp[key].g[N - 1]] : [0, 0, 0];
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 800 } });
  const asked = [];
  await ctx.route("https://shamela.ws/**", async (r) => { asked.push(r.request().url()); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: "<!doctype html><title>stub shamela</title><body>stub shamela</body>" }); });
  if (MUTATE === "shiftedmap") {
    await ctx.route(`**/output/book-pages/${key}.json*`, async (r) => { const m = JSON.parse(fs.readFileSync(`tools/hadith-data-pull/output/book-pages/${key}.json`, "utf8")); m.i = m.i.map((x) => (x ? x + 1 : 0)); await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(m) }); });
  } else if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html");
  const fetched = [];
  P.on("request", (r) => { if (r.url().includes("/output/book-pages/")) fetched.push(r.url().replace(/^.*\/book-pages\//, "")); });
  await P.click('[data-hadith-tab="books"]');
  await P.waitForSelector(`[data-openiti-book="${B.uri}"]`, { timeout: 25000 });
  await P.click(`[data-openiti-book="${B.uri}"]`);
  await P.waitForSelector("[data-openiti-chapter]", { timeout: 15000 });
  await P.evaluate((c) => { document.querySelector(`[data-openiti-chapter="${c}"]`).click(); }, chapter);
  await P.waitForTimeout(700);
  if (await P.$("[data-openiti-bab]")) await P.evaluate(() => { document.querySelector("[data-openiti-bab]").click(); });
  await P.waitForSelector("[data-openiti-row], [data-reader-show=\"text\"]", { state: "attached", timeout: 15000 });
  await P.waitForTimeout(500);
  const row = await P.$(`[data-openiti-row="${N}"]`);
  if (row) { await row.scrollIntoViewIfNeeded(); await row.click().catch(() => {}); await P.waitForTimeout(500); }
  const stepText = await P.$('[data-reader-show="text"]');
  if (stepText && (await stepText.isVisible())) await stepText.click();
  const BTN = `[data-book-page-button="${N}"]`;
  await P.waitForSelector(BTN, { state: "attached", timeout: 15000 }).catch(() => {});
  await P.waitForTimeout(900);
  const btn = await P.$(BTN);
  check(`${tag} I9: no page map was fetched before the button was pressed`, fetched.length === 0, fetched.join());
  check(`${tag} record ${N} shows a "Printed page (Shamela)" button keyed by its record order`, !!btn, (await P.$$eval("[data-book-page-button]", (bs) => bs.map((b) => b.dataset.bookPageButton))).join());
  const label = btn ? (await btn.textContent()).trim() : "";
  check(`${tag} ...worded in the reader's language`, label === (lang === "bn" ? "ছাপা পাতা (শামেলা)" : "Printed page (Shamela)"), label);
  if (btn) {
    await btn.scrollIntoViewIfNeeded(); await btn.click(); await P.waitForSelector("[data-book-page-pane]", { timeout: 15000 });
    check(`${tag} pressing it fetched exactly one page map, ${key}`, fetched.join() === `${key}.json`, fetched.join());
    const src = await P.$eval("[data-book-page-frame]", (f) => f.src);
    check(`${tag} the pane asks Shamela for index ${I} of book ${B.sid}`, src === `https://shamela.ws/book/${B.sid}/${I}`, src);
    await P.waitForFunction(() => !document.querySelector(".book-page-wait"), null, { timeout: 8000 }).catch(() => {});
    check(`${tag} the stub Shamela was actually requested`, asked.some((u) => u.includes(`/book/${B.sid}/${I}`)), asked.join(" | ").slice(0, 160));
    const title = await P.$eval(".book-page-title", (n) => n.textContent);
    check(`${tag} the title names the book (no hadith number: the map is keyed by record order)`, lang === "en" ? title === B.titleEn : title.length > 0 && !/\d/.test(title.replace(/[০-৯]/g, "")), title);
    const credit = await P.$eval(".book-page-credit", (n) => ({ text: n.textContent, href: n.href }));
    check(`${tag} the credit names the edition and the printed page (${G}), no volume, and links Shamela`,
      credit.text === (lang === "bn" ? `ছাপা পাঠ: আল-মাকতাবা আশ-শামিলা, ${B.editionBn}, পৃ. ${bnd(G)}` : `Printed text: Shamela Library, ${B.editionEn}, p. ${G}`) && credit.href === "https://shamela.ws/", JSON.stringify(credit));
    const open = await P.$eval("[data-book-page-open-link]", (n) => ({ href: n.href, target: n.target, rel: n.rel }));
    check(`${tag} "Open on Shamela" links the same page in a new tab, safely`, open.href === `https://shamela.ws/book/${B.sid}/${I}` && open.target === "_blank" && /noopener/.test(open.rel), JSON.stringify(open));
    check(`${tag} there is NO "Download this book" link`, (await P.$("[data-book-page-download]")) === null);
    const geo = await P.evaluate(() => { const r = document.querySelector(".book-page-pane").getBoundingClientRect(); const f = document.querySelector(".book-page-frame").getBoundingClientRect(); const c = document.querySelector(".book-page-close").getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight, fh: f.height, cw: c.width, ch: c.height, foot: document.querySelector(".book-page-foot").scrollWidth - document.querySelector(".book-page-foot").clientWidth }; });
    check(`${tag} the pane sits inside the screen, the page area is >= 300px tall, the × is >= 40px, the footer does not overflow`, geo.l >= -0.5 && geo.t >= -0.5 && geo.r <= geo.vw + 0.5 && geo.b <= geo.vh + 0.5 && geo.fh >= 300 && geo.cw >= 40 && geo.ch >= 40 && geo.foot <= 0, JSON.stringify(geo));
    await P.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/out-${key}-${lang}-${width}.png` });
    await P.keyboard.press("Escape"); await P.waitForTimeout(120);
    check(`${tag} Escape closes the pane, and focus is back on the button (way-back law)`, (await P.$("[data-book-page-pane]")) === null && (await P.evaluate((s) => document.activeElement === document.querySelector(s), BTN)));
  }
  const mod = await P.evaluate(async ([uri, anchors, other]) => {
    const m = await import("/app/js/hadith-book-pages.js");
    const at = {}; for (const n of anchors) { const r = await m.loadBookPage(uri, n); at[n] = r && [r.index, r.volume, r.page, r.kind, r.embedUrl, r.approximate]; }
    return { at, past: await m.loadBookPage(uri, 99999), zero: await m.loadBookPage(uri, 0), isN: m.isKeyedByN(uri), isNother: m.isKeyedByN(other), all: m.BOOK_PAGE_BOOKS };
  }, [B.uri, Object.keys(ANCH[key].at), "0179MalikIbnAnas.Muwatta.Shamela0028107-ara1"]);
  check(`${tag} every anchor opens its own page: index, no volume, printed page, book ${B.sid}, never "approximate"`, Object.entries(ANCH[key].at).every(([n, [i, , g]]) => JSON.stringify(mod.at[n]) === JSON.stringify([i, null, g, "shamela", `https://shamela.ws/book/${B.sid}/${i}`, false])), JSON.stringify(mod.at));
  check(`${tag} a number past the end, or zero, has no page; the book is keyed by n (Muwatta is not)`, mod.past === null && mod.zero === null && mod.isN && !mod.isNother);
  const shRows = reg.books.filter((b) => b.kind === "shamela" && ["mapped", "verified"].includes(b.status));
  check(`${tag} the app's Shamela book list is bound to the registry (id, key, keyBy), both ways`, JSON.stringify(Object.keys(mod.all).filter((k) => mod.all[k].kind === "shamela").sort()) === JSON.stringify(shRows.map((b) => b.versionUri).sort()) && shRows.every((b) => mod.all[b.versionUri]?.shamelaId === b.shamela.id && mod.all[b.versionUri]?.key === b.key && (mod.all[b.versionUri]?.keyBy || null) === (b.keyBy || null)), Object.keys(mod.all).join());
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|shamela|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== 'Amal al-Yawm (an-Nasa'i, Ibn al-Sunni) and al-Adhkar printed pages on Shamela: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
