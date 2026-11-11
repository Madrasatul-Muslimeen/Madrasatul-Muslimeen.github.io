// The printed page of a hadith for books with NO scan (the Owner, 10-11 Nov 2026: "Shamela is the fallback"): Muwatta Malik
// and Musnad Ahmad. A narration with its own printed number shows a "Printed page (Shamela)" button; it opens the same pop-up pane,
// on shamela.ws's page of the named edition, with a credit line that says which edition, volume and page, and no scan download.
// Shamela is stubbed (deterministic, offline): the suite proves WHICH page is asked for. The live iframe was proven by a browser
// spike on 11 Nov 2026 (shamela.ws/book/1727/10 loads in an iframe on a 390px page, no frame-blocking header).
// Anchors written BY HAND from live Shamela pages (title "ج<vol> - ص<page>" and the number at the head of the page):
//   Muwatta 233 -> index 650 = vol 2 p. 99;   see ANCHORS below for the rest.
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
  wrongbook: ["js/hadith-book-pages.js", 'key: "muwatta", kind: "shamela", shamelaId: "28107"', 'key: "muwatta", kind: "shamela", shamelaId: "28108"'],
  nobutton: ["js/hadith-browser.js", "const bp = pageNo ? bookPageButton(vUri, pageNo) : null; if (bp) card.appendChild(bp); }", "}"],
  usesn: ["js/hadith-browser.js", 'isShamelaBook(vUri) ? (h.kind === "hadith" && Number(h.number) > 0 ? Math.trunc(Number(h.number)) : null) : cite', "isShamelaBook(vUri) ? h.n : cite"],
  nocredit: ["js/hadith-book-viewer.js", "? t(\"Printed text: Shamela Library, {edition}, vol. {vol}, p. {page}\", { edition, vol: num(String(info.volume ?? \"\")), page: num(String(info.page ?? \"\")) })", "? \"\""],
  withdownload: ["js/hadith-book-viewer.js", "  if (!shamela) {\n    const dl = bookDownload(book);", "  if (true) {\n    const dl = bookDownload(book);"],
  noescape: ["js/hadith-book-viewer.js", 'if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePane(); return; }', ""],
  nofocusback: ["js/hadith-book-viewer.js", "if (opener && document.contains(opener)) opener.focus();", ""],
  eagerload: ["js/hadith-book-viewer.js", "  const note = el(\"span\", \"book-page-error\");", "  loadBookPage(versionUri, lazy ? 1 : number).catch(() => {});\n  const note = el(\"span\", \"book-page-error\");"],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (process.argv.includes("--prove")) {
  let caught = 0;
  for (const name of Object.keys(MUT)) {
    const r = spawnSync("node", [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 600000 });
    const failed = /FAIL/.test(r.stdout) && r.status === 1 && !/anchor missing/.test(r.stdout + r.stderr);
    if (failed) caught++;
    console.log(`  ${failed ? "CAUGHT " : "MISSED "} ${name}: ${(r.stdout.match(/FAIL .*/) || [r.stderr.split("\n")[0]])[0].slice(0, 110)}`);
  }
  console.log(`\n==== hadith-shamela-pages mutations: ${caught} of ${Object.keys(MUT).length} caught ====`);
  process.exit(caught === Object.keys(MUT).length ? 0 : 1);
}
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

// ---- the maps and the registry, on disk. ANCHORS: number -> [Shamela index, volume, printed page], read by hand on shamela.ws.
const ANCHORS = JSON.parse(fs.readFileSync("tools/i18n-verify/hadith-shamela-anchors.json", "utf8"));
const reg = JSON.parse(fs.readFileSync("tools/hadith-data-pull/sources/book-pages.json", "utf8"));
const maps = {};
for (const key of Object.keys(ANCHORS).filter((k) => k !== "note")) {
  const row = reg.books.find((b) => b.key === key);
  const mp = JSON.parse(fs.readFileSync(`tools/hadith-data-pull/output/book-pages/${key}.json`, "utf8"));
  maps[key] = mp;
  check(`${key}: the registry row names the Shamela book and the map is for it`, row?.kind === "shamela" && mp.kind === "shamela" && mp.shamelaId === row.shamela.id && mp.numbers === row.lastNumber && mp.i.length === row.lastNumber && mp.v.length === row.lastNumber && mp.g.length === row.lastNumber);
  const found = mp.i.filter((x) => x > 0).length;
  check(`${key}: most numbers found (${found} of ${mp.numbers}), every page index inside the book (1 to ${row.shamela.lastIndex})`, found >= mp.numbers * ANCHORS[key].minCoverage && mp.i.every((x) => x === 0 || (Number.isInteger(x) && x >= 1 && x <= row.shamela.lastIndex)), String(found));
  let back = 0, prev = 0;
  for (const x of mp.i) { if (!x) continue; if (x < prev) back++; prev = x; }
  check(`${key}: pages never go backwards (at most ${ANCHORS[key].maxBackwards} exceptions)`, back <= ANCHORS[key].maxBackwards, String(back));
  check(`${key}: volume and page agree with the index for every mapped number (index grows with volume, then page)`, mp.i.every((x, k) => (x === 0) === (mp.v[k] === 0 && mp.g[k] === 0)));
  check(`${key}: hand-checked anchors ${Object.keys(ANCHORS[key].at).join(", ")}, exact`, Object.entries(ANCHORS[key].at).every(([n, [i, v, g]]) => mp.i[n - 1] === i && mp.v[n - 1] === v && mp.g[n - 1] === g), Object.keys(ANCHORS[key].at).map((n) => [mp.i[n - 1], mp.v[n - 1], mp.g[n - 1]].join(":")).join(" "));
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const MUW = "0179MalikIbnAnas.Muwatta.Shamela0028107-ara1";
const [mwN, mwA] = Object.entries(ANCHORS.muwatta.at)[0];
async function openBook(P, uri, number) {
  const on = await P.$eval('[data-hadith-tab="books"]', (b) => b.getAttribute("aria-current") === "page").catch(() => false);
  if (!on) await P.click('[data-hadith-tab="books"]');
  await P.waitForSelector(`[data-openiti-book="${uri}"]`, { timeout: 25000 });
  await P.click(`[data-openiti-book="${uri}"]`);
  await P.waitForSelector("[data-openiti-goto-input]", { timeout: 15000 });
  const mode = await P.$("[data-openiti-goto-mode]"); // the book's OWN numbers, not the standard concordance ones
  if (mode) await mode.selectOption("edition");
  await P.fill("[data-openiti-goto-input]", String(number)); await P.click("[data-openiti-goto-btn]");
}
for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280], ["bn", 360], ["en", 1440], ["en", 195]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 800 } });
  const asked = [];
  await ctx.route("https://shamela.ws/**", async (r) => { asked.push(r.request().url()); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: "<!doctype html><title>stub shamela</title><body>stub shamela</body>" }); });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html");
  const fetched = [];
  P.on("request", (r) => { if (r.url().includes("/output/book-pages/")) fetched.push(r.url().replace(/^.*\/book-pages\//, "")); });
  await openBook(P, MUW, mwN);
  const BTN = `[data-book-page-button="${mwN}"]`;
  await P.waitForSelector(BTN, { timeout: 15000 }).catch(() => {});
  const btn = await P.$(BTN);
  check(`${tag} I9: no page map was fetched before the button was pressed`, fetched.length === 0, fetched.join());
  check(`${tag} Muwatta ${mwN} has a "Printed page (Shamela)" button`, !!btn);
  const label = btn ? (await btn.textContent()).trim() : "";
  check(`${tag} ...worded in the reader's language (not the scan wording)`, label === (lang === "bn" ? "ছাপা পাতা (শামেলা)" : "Printed page (Shamela)"), label);
  if (btn) {
    await btn.scrollIntoViewIfNeeded(); await btn.click(); await P.waitForSelector("[data-book-page-pane]", { timeout: 15000 });
    check(`${tag} pressing it fetched exactly one page map, muwatta`, fetched.join() === "muwatta.json", fetched.join());
    const src = await P.$eval("[data-book-page-frame]", (f) => f.src);
    check(`${tag} the pane asks Shamela for index ${mwA[0]} of book 28107`, src === `https://shamela.ws/book/28107/${mwA[0]}`, src);
    await P.waitForFunction(() => !document.querySelector(".book-page-wait"), null, { timeout: 8000 }).catch(() => {});
    check(`${tag} the stub Shamela was actually requested`, asked.some((u) => u.includes(`/book/28107/${mwA[0]}`)), asked.join(" | ").slice(0, 160));
    const title = await P.$eval(".book-page-title", (n) => n.textContent);
    check(`${tag} the title names the book and the number`, new RegExp(`${mwN}|${mwN.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d])}`).test(title) && (lang === "bn" ? /মুয়াত্তা/.test(title) : /Muwatta/.test(title)), title);
    const credit = await P.$eval(".book-page-credit", (n) => ({ text: n.textContent, href: n.href }));
    const bnd = (n) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
    check(`${tag} the credit names the edition, the volume and the printed page (${mwA[1]}, ${mwA[2]}) and links Shamela`,
      credit.text === (lang === "bn" ? `ছাপা পাঠ: আল-মাকতাবা আশ-শামিলা, আল-আ'যামী সম্পাদিত, খণ্ড ${bnd(mwA[1])}, পৃ. ${bnd(mwA[2])}` : `Printed text: Shamela Library, ed. al-A'zami, vol. ${mwA[1]}, p. ${mwA[2]}`) && credit.href === "https://shamela.ws/", JSON.stringify(credit));
    const open = await P.$eval("[data-book-page-open-link]", (n) => ({ href: n.href, text: n.textContent, target: n.target, rel: n.rel }));
    check(`${tag} "Open on Shamela" links the same page in a new tab, safely`, open.href === `https://shamela.ws/book/28107/${mwA[0]}` && open.text === (lang === "bn" ? "শামেলায় খুলুন" : "Open on Shamela") && open.target === "_blank" && /noopener/.test(open.rel), JSON.stringify(open));
    check(`${tag} there is NO "Download this book" link (Shamela is not a scan we may offer)`, (await P.$("[data-book-page-download]")) === null);
    const geo = await P.evaluate(() => { const r = document.querySelector(".book-page-pane").getBoundingClientRect(); const f = document.querySelector(".book-page-frame").getBoundingClientRect(); const c = document.querySelector(".book-page-close").getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight, fh: f.height, cw: c.width, ch: c.height, foot: document.querySelector(".book-page-foot").scrollWidth - document.querySelector(".book-page-foot").clientWidth }; });
    check(`${tag} the pane sits inside the screen, the page area is tall enough (>= 300px), the × is >= 40px, the footer does not overflow sideways`, geo.l >= -0.5 && geo.t >= -0.5 && geo.r <= geo.vw + 0.5 && geo.b <= geo.vh + 0.5 && geo.fh >= 300 && geo.cw >= 40 && geo.ch >= 40 && geo.foot <= 0, JSON.stringify(geo));
    const focusIn = await P.evaluate(() => document.activeElement?.classList.contains("book-page-close"));
    check(`${tag} focus moves to the × when the pane opens`, focusIn);
    await P.screenshot({ path: `tools/i18n-verify/out-shamela-${lang}-${width}.png` });
    await P.keyboard.press("Escape"); await P.waitForTimeout(120);
    check(`${tag} Escape closes the pane`, (await P.$("[data-book-page-pane]")) === null);
    check(`${tag} ...and focus is back on the button (way-back law)`, await P.evaluate((s) => document.activeElement === document.querySelector(s), BTN));
    await btn.click(); await P.waitForSelector("[data-book-page-pane]");
    await P.click(".book-page-close"); await P.waitForTimeout(120);
    check(`${tag} the × closes it, and pressing again re-used the page map (still one fetch)`, (await P.$("[data-book-page-pane]")) === null && fetched.join() === "muwatta.json", fetched.join());
  }
  // module level: both books, every kind of answer, and the book list bound to the registry
  const mod = await P.evaluate(async ([muw, ahm, ahmN]) => {
    const m = await import("/app/js/hadith-book-pages.js"); const v = await import("/app/js/hadith-book-viewer.js");
    const a = await m.loadBookPage(ahm, ahmN), none = await m.loadBookPage(muw, 99999), zero = await m.loadBookPage(muw, 0);
    return { a: a && [a.index, a.volume, a.page, a.kind, a.embedUrl, a.openUrl, a.approximate], none, zero, isM: m.isShamelaBook(muw), isB: m.isShamelaBook("0256Bukhari.Sahih.JK000110-ara1"),
      all: m.BOOK_PAGE_BOOKS, noBtnBad: v.bookPageButton(muw, 0) === null };
  }, [MUW, MUW, Object.keys(ANCHORS.muwatta.at)[1]]);
  const [aN, aA] = Object.entries(ANCHORS.muwatta.at)[1];
  check(`${tag} Muwatta ${aN} (two-part number 396 / 120): Shamela index ${aA[0]}, vol ${aA[1]}, p. ${aA[2]}, the book 28107, never "approximate"`, JSON.stringify(mod.a) === JSON.stringify([aA[0], aA[1], aA[2], "shamela", `https://shamela.ws/book/28107/${aA[0]}`, `https://shamela.ws/book/28107/${aA[0]}`, false]), JSON.stringify(mod.a));
  check(`${tag} a number past the end, or zero, has no page and no button (never a guess)`, mod.none === null && mod.zero === null && mod.noBtnBad);
  check(`${tag} Shamela books are told apart from scan books`, mod.isM && !mod.isB);
  const shRows = reg.books.filter((b) => b.kind === "shamela" && ["mapped", "verified"].includes(b.status));
  check(`${tag} the app's Shamela book list is bound to the registry (id, key, edition), both ways`, JSON.stringify(Object.keys(mod.all).filter((k) => mod.all[k].kind === "shamela").sort()) === JSON.stringify(shRows.map((b) => b.versionUri).sort()) && shRows.every((b) => mod.all[b.versionUri]?.shamelaId === b.shamela.id && mod.all[b.versionUri]?.key === b.key && mod.all[b.versionUri]?.edition?.en === b.shamela.edition), JSON.stringify(Object.keys(mod.all)));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|shamela|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Hadith printed page on Shamela (Muwatta; Musnad Ahmad joins when its map is proven): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
