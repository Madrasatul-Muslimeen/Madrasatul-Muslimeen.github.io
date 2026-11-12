// The printed page of a hadith in Musnad Ahmad (the Owner ticked hd1111n A, 11 Nov 2026).
// Shamela has the typed text of ed. al-Arna'ut (al-Risala), 45 volumes; its paragraphs start with the edition's own hadith number, which our
// OpenITI text carries too, so the map is keyed by the BOOK'S OWN NUMBER. It was built from every page of the book
// (shamela-pages-build.py) and then checked against our text (shamela-pages-verified.py): a number keeps a page only when its opening words
// agree with the paragraph found there, otherwise it has none. Shamela is stubbed here (offline): the suite proves WHICH page is asked for.
// Anchors in hadith-shamela-anchors.json (key "ahmad") were read on live shamela.ws. Run from the repository root, serve.js on :8080.
//   --mutate=<name> serves one deliberate break; --prove runs them all.
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
  wrongbook: ["js/hadith-book-pages.js", 'key: "ahmad", kind: "shamela", shamelaId: "25794"', 'key: "ahmad", kind: "shamela", shamelaId: "25795"'],
  nobutton: ["js/hadith-browser.js", "const bp = pageNo ? bookPageButton(vUri, pageNo) : null; if (bp) card.appendChild(bp); }", "}"],
  usesn: ["js/hadith-browser.js", 'isShamelaBook(vUri) ? (h.kind === "hadith" && Number(h.number) > 0 ? Math.trunc(Number(h.number)) : null)', 'isShamelaBook(vUri) ? (h.kind === "hadith" && Number(h.n) > 0 ? Math.trunc(Number(h.n)) : null)'],
  keyedbyn: ["js/hadith-book-pages.js", 'key: "ahmad", kind: "shamela", shamelaId', 'key: "ahmad", kind: "shamela", keyBy: "n", shamelaId'],
  titlehadith: ["js/hadith-book-viewer.js", 'book.keyBy === "n" ? bookName : t(', 'true ? bookName : t('],
  nocredit: ["js/hadith-book-viewer.js", "? t(\"Printed text: Shamela Library, {edition}, vol. {vol}, p. {page}\", { edition, vol: num(String(info.volume ?? \"\")), page: num(String(info.page ?? \"\")) })", "? \"\""],
  withdownload: ["js/hadith-book-viewer.js", "  if (!shamela) {\n    const dl = bookDownload(book);", "  if (true) {\n    const dl = bookDownload(book);"],
  noescape: ["js/hadith-book-viewer.js", 'if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePane(); return; }', ""],
  nofocusback: ["js/hadith-book-viewer.js", "if (opener && document.contains(opener)) opener.focus();", ""],
  eagerload: ["js/hadith-book-viewer.js", "  const note = el(\"span\", \"book-page-error\");", "  loadBookPage(versionUri, lazy ? 1 : number).catch(() => {});\n  const note = el(\"span\", \"book-page-error\");"],
  shiftedmap: ["MAP", "", ""], // serves ahmad.json with every page index moved on by one
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
  console.log(`\n==== hadith-ahmad-pages mutations: ${caught} of ${Object.keys(MUT).length} caught ====`);
  process.exit(caught === Object.keys(MUT).length ? 0 : 1);
}
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

// ---- the map, the registry and our own hadith records, on disk
const ANCH = JSON.parse(fs.readFileSync("tools/i18n-verify/hadith-shamela-anchors.json", "utf8")).ahmad;
const reg = JSON.parse(fs.readFileSync("tools/hadith-data-pull/sources/book-pages.json", "utf8"));
const row = reg.books.find((b) => b.key === "ahmad");
const mp = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/book-pages/ahmad.json", "utf8"));
const SPLIT = "tools/hadith-data-pull/output/openiti-release/split/0241IbnHanbal.Musnad.Shamela0025794-ara1";
const recs = fs.readdirSync(SPLIT).filter((f) => /^ch-.*\.json$/.test(f)).flatMap((f) => JSON.parse(fs.readFileSync(`${SPLIT}/${f}`, "utf8")).hadiths);
const hadith = recs.filter((r) => r.kind === "hadith");
check("the registry row is Shamela 25794, keyed by the book's own number, and the map is for it (27647 numbers, parallel arrays)", row?.kind === "shamela" && !row.keyBy && !mp.keyBy && mp.shamelaId === "25794" && mp.numbers === row.lastNumber && mp.i.length === row.lastNumber && mp.v.length === row.lastNumber && mp.g.length === row.lastNumber && Math.max(...hadith.map((r) => Number(r.number) || 0)) <= row.lastNumber);
const nums = new Set(hadith.filter((r) => Number(r.number) > 0).map((r) => Number(r.number)));
const mapped = [...nums].filter((x) => mp.i[x - 1] > 0).length;
check(`coverage: ${mapped} of ${nums.size} numbered hadith have a page (at least ${ANCH.minCoverage * 100}%)`, mapped >= nums.size * ANCH.minCoverage, String(mapped));
check("a number our text does not carry never has a page (no link rather than a guess)", mp.i.every((x, k) => x === 0 || nums.has(k + 1)));
check(`every page index is inside the book (1 to ${row.shamela.lastIndex}); volumes 1 to 45 (v is 0 only where there is no page); page and index agree on present/absent`, mp.i.every((x, k) => (x === 0 && mp.g[k] === 0) || (Number.isInteger(x) && x >= 1 && x <= row.shamela.lastIndex && mp.g[k] > 0)) && mp.v.every((x, k) => (mp.i[k] === 0) === (x === 0) && x >= 0 && x <= 45));
let back = 0, prev = 0;
for (const x of mp.i) { if (!x) continue; if (x < prev) back++; prev = x; }
check(`pages seldom go backwards (${back} places; at most ${ANCH.maxBackwards})`, back <= ANCH.maxBackwards, String(back));
check(`hand-read anchors (number = ${Object.keys(ANCH.at).join(", ")}): index, volume and printed page, exact`, Object.entries(ANCH.at).every(([n, [i, v, g]]) => mp.i[n - 1] === i && mp.v[n - 1] === v && mp.g[n - 1] === g), Object.keys(ANCH.at).map((n) => [mp.i[n - 1], mp.v[n - 1], mp.g[n - 1]].join(":")).join(" "));
check(`the numbers our text carries but the map drops (the text disagreed) are few (${nums.size - mapped}, at most ${ANCH.maxDropped})`, nums.size - mapped <= ANCH.maxDropped);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const RIY = "0241IbnHanbal.Musnad.Shamela0025794-ara1";
const bnd = (n) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const N = 1, [I, V, G] = ANCH.at[String(N)]; // hadith number 1 is the key
for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280], ["bn", 360], ["en", 1440], ["en", 195]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 800 } });
  const asked = [];
  await ctx.route("https://shamela.ws/**", async (r) => { asked.push(r.request().url()); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: "<!doctype html><title>stub shamela</title><body>stub shamela</body>" }); });
  if (MUTATE === "shiftedmap") {
    await ctx.route("**/output/book-pages/ahmad.json*", async (r) => { const m = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/book-pages/ahmad.json", "utf8")); m.i = m.i.map((x) => (x ? x + 1 : 0)); await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(m) }); });
  } else if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html");
  const fetched = [];
  P.on("request", (r) => { if (r.url().includes("/output/book-pages/")) fetched.push(r.url().replace(/^.*\/book-pages\//, "")); });
  await P.click('[data-hadith-tab="books"]');
  await P.waitForSelector(`[data-openiti-book="${RIY}"]`, { timeout: 25000 });
  // Ahmad sits far down the book list, under the sticky menu on a phone: bring it to the middle of the screen, then press it
  await P.$eval(`[data-openiti-book="${RIY}"]`, (b) => { b.scrollIntoView({ block: "center" }); b.click(); });
  await P.waitForSelector("[data-openiti-goto-input]", { timeout: 15000 });
  await P.fill("[data-openiti-goto-input]", "1"); await P.$eval("[data-openiti-goto-btn]", (b) => { b.scrollIntoView({ block: "center" }); b.click(); }); // hadith 1 = record n 3
  const BTN = `[data-book-page-button="${N}"]`;
  await P.waitForSelector('[data-book-page-button]', { timeout: 15000 }).catch(() => {});
  const keys = await P.$$eval("[data-book-page-button]", (bs) => bs.map((b) => b.dataset.bookPageButton));
  const btn = await P.$(BTN);
  check(`${tag} I9: no page map was fetched before the button was pressed`, fetched.length === 0, fetched.join());
  check(`${tag} hadith 1 shows a "Printed page (Shamela)" button keyed by the book's own number ${N}`, !!btn && keys.includes(String(N)), keys.join());
  const label = btn ? (await btn.textContent()).trim() : "";
  check(`${tag} ...worded in the reader's language`, label === (lang === "bn" ? "ছাপা পাতা (শামেলা)" : "Printed page (Shamela)"), label);
  if (btn) {
    await btn.scrollIntoViewIfNeeded(); await btn.click(); await P.waitForSelector("[data-book-page-pane]", { timeout: 15000 });
    check(`${tag} pressing it fetched exactly one page map, ahmad`, fetched.join() === "ahmad.json", fetched.join());
    const src = await P.$eval("[data-book-page-frame]", (f) => f.src);
    check(`${tag} the pane asks Shamela for index ${I} of book 25794`, src === `https://shamela.ws/book/25794/${I}`, src);
    await P.waitForFunction(() => !document.querySelector(".book-page-wait"), null, { timeout: 8000 }).catch(() => {});
    check(`${tag} the stub Shamela was actually requested`, asked.some((u) => u.includes(`/book/25794/${I}`)), asked.join(" | ").slice(0, 160));
    const title = await P.$eval(".book-page-title", (n) => n.textContent);
    check(`${tag} the title names the book and the hadith number`, title.includes(lang === "bn" ? "মুসনাদে আহমাদ" : "Musnad Ahmad") && title.includes(lang === "bn" ? bnd(N) : String(N)), title);
    const credit = await P.$eval(".book-page-credit", (n) => ({ text: n.textContent, href: n.href }));
    check(`${tag} the credit names the edition, the volume and the printed page (${V}, ${G}), and links Shamela`,
      credit.text === (lang === "bn" ? `ছাপা পাঠ: আল-মাকতাবা আশ-শামিলা, শু'আইব আল-আরনাউত সম্পাদিত, আর-রিসালা, খণ্ড ${bnd(V)}, পৃ. ${bnd(G)}` : `Printed text: Shamela Library, ed. al-Arna'ut, al-Risala, vol. ${V}, p. ${G}`) && credit.href === "https://shamela.ws/", JSON.stringify(credit));
    const open = await P.$eval("[data-book-page-open-link]", (n) => ({ href: n.href, text: n.textContent, target: n.target, rel: n.rel }));
    check(`${tag} "Open on Shamela" links the same page in a new tab, safely`, open.href === `https://shamela.ws/book/25794/${I}` && open.text === (lang === "bn" ? "শামেলায় খুলুন" : "Open on Shamela") && open.target === "_blank" && /noopener/.test(open.rel), JSON.stringify(open));
    check(`${tag} there is NO "Download this book" link`, (await P.$("[data-book-page-download]")) === null);
    const geo = await P.evaluate(() => { const r = document.querySelector(".book-page-pane").getBoundingClientRect(); const f = document.querySelector(".book-page-frame").getBoundingClientRect(); const c = document.querySelector(".book-page-close").getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight, fh: f.height, cw: c.width, ch: c.height, foot: document.querySelector(".book-page-foot").scrollWidth - document.querySelector(".book-page-foot").clientWidth }; });
    check(`${tag} the pane sits inside the screen, the page area is tall enough (>= 300px), the × is >= 40px, the footer does not overflow sideways`, geo.l >= -0.5 && geo.t >= -0.5 && geo.r <= geo.vw + 0.5 && geo.b <= geo.vh + 0.5 && geo.fh >= 300 && geo.cw >= 40 && geo.ch >= 40 && geo.foot <= 0, JSON.stringify(geo));
    check(`${tag} focus moves to the × when the pane opens`, await P.evaluate(() => document.activeElement?.classList.contains("book-page-close")));
    await P.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/out-ahmad-${lang}-${width}.png` });
    await P.keyboard.press("Escape"); await P.waitForTimeout(120);
    check(`${tag} Escape closes the pane`, (await P.$("[data-book-page-pane]")) === null);
    check(`${tag} ...and focus is back on the button (way-back law)`, await P.evaluate((s) => document.activeElement === document.querySelector(s), BTN));
    await btn.click(); await P.waitForSelector("[data-book-page-pane]");
    await P.click(".book-page-close"); await P.waitForTimeout(120);
    check(`${tag} the × closes it, and pressing again re-used the page map (still one fetch)`, (await P.$("[data-book-page-pane]")) === null && fetched.join() === "ahmad.json", fetched.join());
  }
  // module level: other records, the chapter-heading record, and the registry binding
  const mod = await P.evaluate(async ([uri, anchors]) => {
    const m = await import("/app/js/hadith-book-pages.js"); const v = await import("/app/js/hadith-book-viewer.js");
    const at = {}; for (const n of anchors) { const r = await m.loadBookPage(uri, n); at[n] = r && [r.index, r.volume, r.page, r.kind, r.embedUrl, r.approximate]; }
    return { at, past: await m.loadBookPage(uri, 27648), zero: await m.loadBookPage(uri, 0),
      isN: m.isKeyedByN(uri), isNother: m.isKeyedByN("0179MalikIbnAnas.Muwatta.Shamela0028107-ara1"), all: m.BOOK_PAGE_BOOKS, noBtn: v.bookPageButton(uri, 0) === null };
  }, [RIY, Object.keys(ANCH.at)]);
  check(`${tag} every anchor opens its own page: index, volume, printed page, book 25794, never "approximate"`, Object.entries(ANCH.at).every(([n, [i, v, g]]) => JSON.stringify(mod.at[n]) === JSON.stringify([i, v, g, "shamela", `https://shamela.ws/book/25794/${i}`, false])), JSON.stringify(mod.at));

  check(`${tag} a number past the end, or zero, has no page and no button (never a guess)`, mod.past === null && mod.zero === null && mod.noBtn);
  check(`${tag} Ahmad is keyed by the book's own number, not by n`, !mod.isN);
  const shRows = reg.books.filter((b) => b.kind === "shamela" && ["mapped", "verified"].includes(b.status));
  check(`${tag} the app's Shamela book list is bound to the registry (id, key, keyBy), both ways`, JSON.stringify(Object.keys(mod.all).filter((k) => mod.all[k].kind === "shamela").sort()) === JSON.stringify(shRows.map((b) => b.versionUri).sort()) && shRows.every((b) => mod.all[b.versionUri]?.shamelaId === b.shamela.id && mod.all[b.versionUri]?.key === b.key && (mod.all[b.versionUri]?.keyBy || null) === (b.keyBy || null)), Object.keys(mod.all).join());
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|shamela|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Musnad Ahmad printed page on Shamela: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
