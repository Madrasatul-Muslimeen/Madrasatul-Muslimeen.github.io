// The original printed page of a hadith (the Owner, 10-11 Nov 2026): a Bukhari narration with a standard number shows an
// "Original book page" button; it opens a pop-up pane on the right page of the scan (archive.org's reader), with a credit line,
// an "Open on archive.org" link, ×/Escape/outside-tap to come back and focus returned to the button (way-back law).
// archive.org is stubbed (deterministic, offline): the suite proves WHICH page is asked for. The live embed was proven by a
// browser spike on 11 Nov 2026 (Bukhari hadith 112 on leaf 120, phone width).
// Anchors written BY HAND from the scan's own text layer: hadith 1 -> leaf 45, 112 -> leaf 120, 6306 -> leaf 3542.
// Run from the repository root, serve.js on :8080.
//   --mutate=<name> serves one deliberate break (the run must FAIL); --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUT = {
  wrongleaf: ["js/hadith-book-pages.js", "const n = Math.max(0, Math.trunc(Number(leaf) || 0));", "const n = Math.max(0, Math.trunc(Number(leaf) || 0)) + 1;"],
  noescape: ["js/hadith-book-viewer.js", 'if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePane(); return; }', ""],
  nofocusback: ["js/hadith-book-viewer.js", "if (opener && document.contains(opener)) opener.focus();", ""],
  nocredit: ["js/hadith-book-viewer.js", 'credit.textContent = t("Scan: Darussalam edition, shared on archive.org");', 'credit.textContent = "";'],
  noapprox: ["js/hadith-book-pages.js", "if (map.a[mid] === n) { approximate = true; break; }", "if (map.a[mid] === n) { break; }"],
  nodownload: ["js/hadith-book-viewer.js", "  foot.appendChild(down);\n", ""],
  noduabutton: ["js/dua-browser.js", "if (bp) card.appendChild(bp); }\n", "}\n"],
  nobutton: ["js/hadith-browser.js", "{ const bp = cite ? bookPageButton(conc?.versionUri ?? versionUri, cite) : null; if (bp) card.appendChild(bp); }", ""],
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
  console.log(`\n==== hadith-book-pages mutations: ${caught} of ${Object.keys(MUT).length} caught ====`);
  process.exit(caught === Object.keys(MUT).length ? 0 : 1);
}
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

// ---- the map and the registry, on disk
const map = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/book-pages/bukhari.json", "utf8"));
const reg = JSON.parse(fs.readFileSync("tools/hadith-data-pull/sources/book-pages.json", "utf8"));
check("the map covers hadith 1 to 7563, one page each", map.numbers === 7563 && map.p.length === 7563 && map.p.every(Number.isInteger));
check("pages never go backwards", map.p.every((v, i) => i === 0 || v >= map.p[i - 1]));
check("the approximate list is sorted, in range, and a small minority", map.a.every((v, i) => v >= 1 && v <= 7563 && (i === 0 || v > map.a[i - 1])) && map.a.length < 7563 * 0.1, String(map.a.length));
check("hand-checked anchors: hadith 1 -> leaf 45, 112 -> leaf 120, 6306 -> leaf 3542", map.p[0] === 45 && map.p[111] === 120 && map.p[6305] === 3542, [map.p[0], map.p[111], map.p[6305]].join());
check("those anchors are exact, not approximate", ![1, 112, 6306].some((n) => map.a.includes(n)));
check("every page is inside the scan", map.p.every((v) => v >= 0 && v < map.leaves), String(map.leaves));

const mus = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/book-pages/muslim.json", "utf8"));
check("Muslim: the map covers 1 to 7563, one page each, never going backwards", mus.numbers === 7563 && mus.p.length === 7563 && mus.p.every((v, i) => Number.isInteger(v) && v >= 0 && v < mus.leaves && (i === 0 || v >= mus.p[i - 1])));
check("Muslim: the approximate list is sorted and under 5%", mus.a.every((v, i) => v >= 1 && v <= 7563 && (i === 0 || v > mus.a[i - 1])) && mus.a.length < 7563 * 0.05, String(mus.a.length));
check("Muslim: hand-checked anchors (read against the scan): 331 -> leaf 217, 4100 -> 2001, 5800 -> 2792, 7000 -> 3354, exact", mus.p[330] === 217 && mus.p[4099] === 2001 && mus.p[5799] === 2792 && mus.p[6999] === 3354 && ![331, 4100, 5800, 7000].some((n) => mus.a.includes(n)), [mus.p[330], mus.p[4099], mus.p[5799], mus.p[6999]].join());

const tir = JSON.parse(fs.readFileSync("tools/hadith-data-pull/output/book-pages/tirmidhi.json", "utf8"));
check("Tirmidhi: the map covers 1 to 3956, one page each, never going backwards, under 15% approximate", tir.numbers === 3956 && tir.p.length === 3956 && tir.p.every((v, i) => Number.isInteger(v) && v >= 0 && v < tir.leaves && (i === 0 || v >= tir.p[i - 1])) && tir.a.length < 3956 * 0.15, String(tir.a.length));
check("Tirmidhi: hand-checked anchors (read against the scan): 500 -> leaf 501, 1526 -> 1416, 3956 -> 3393, exact", tir.p[499] === 501 && tir.p[1525] === 1416 && tir.p[3955] === 3393 && ![500, 1526, 3956].some((n) => tir.a.includes(n)), [tir.p[499], tir.p[1525], tir.p[3955]].join());

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const BUK = "0256Bukhari.Sahih.JK000110-ara1";
for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 800 } });
  const asked = [];
  await ctx.route("https://archive.org/**", async (r) => { asked.push(r.request().url()); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: "<!doctype html><title>stub reader</title><body>stub reader</body>" }); });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html");
  const fetched = [];
  P.on("request", (r) => { if (r.url().includes("/output/book-pages/")) fetched.push(r.url().replace(/^.*\/book-pages\//, "")); });
  await P.click('[data-hadith-tab="dua"]');
  // Dua cards included (Owner, 11 Nov 2026): Dua 1 is Bukhari 6311, its button finds the number only when pressed.
  await P.waitForSelector('[data-dua-card="1"]');
  check(`${tag} I9: no page map is fetched before the button is pressed (eagerload would fetch it)`, fetched.length === 0, fetched.join());
  const dbtn = await P.$('[data-dua-card="1"] .book-page-button');
  check(`${tag} the Dua card (Dua 1, Bukhari 6311) has an "Original book page" button`, !!dbtn);
  if (dbtn) {
    await dbtn.scrollIntoViewIfNeeded(); await dbtn.click(); await P.waitForSelector("[data-book-page-pane]", { timeout: 15000 });
    const dSrc = await P.$eval("[data-book-page-frame]", (f) => f.src);
    check(`${tag} ...it asks for the scan page of 6311 (leaf ${map.p[6310]})`, dSrc.endsWith(`#page/n${map.p[6310]}/mode/1up`) && dSrc.includes("Sahih%20Al%20Bukhari"), dSrc);
    const dTitle = await P.$eval(".book-page-title", (n) => n.textContent);
    check(`${tag} ...and the title says 6311`, /6311|৬৩১১/.test(dTitle), dTitle);
    await P.keyboard.press("Escape"); await P.waitForTimeout(120);
    check(`${tag} ...Escape returns to the Dua card's button`, await P.evaluate(() => document.activeElement?.classList.contains("book-page-button") && !!document.activeElement.closest('[data-dua-card="1"]')));
  }
  await P.click('[data-dua-mode="chapters"]');
  await P.waitForSelector("[data-dua-book]");
  await P.click(`[data-dua-book="${BUK}"]`);
  await P.waitForSelector("[data-dua-chapter]");
  await P.click("[data-dua-chapter]");
  await P.waitForSelector("[data-openiti-goto-input]", { state: "attached" });
  const chaptersStep = await P.$('[data-reader-show="chapters"]');
  if (chaptersStep && await chaptersStep.isVisible()) await chaptersStep.click();
  await P.fill("[data-openiti-goto-input]", "6306");
  await P.click("[data-openiti-goto-btn]");
  await P.waitForSelector('[data-openiti-passage="6578"]');
  const BTN = '[data-openiti-passage="6578"] [data-book-page-button]';
  const btn = await P.$(BTN);
  check(`${tag} Bukhari 6306 has an "Original book page" button`, !!btn);
  const label = btn ? await btn.textContent() : "";
  check(`${tag} ...worded in the reader's language`, label.trim() === (lang === "bn" ? "মূল বইয়ের পাতা" : "Original book page"), label);
  if (btn) {
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await P.waitForSelector("[data-book-page-pane]");
    check(`${tag} pressing it fetched exactly one page map, bukhari`, fetched.join() === "bukhari.json", fetched.join());
    const frameSrc = await P.$eval("[data-book-page-frame]", (f) => f.src);
    check(`${tag} the pane asks archive.org's reader for leaf 3542 of the Bukhari scan`, frameSrc === "https://archive.org/embed/AllInOne-Hadiths-EngArabicDarusalam_201407/All%20in%20One-Sahih%20Al%20Bukhari-Eng-Arabic#page/n3542/mode/1up", frameSrc);
    await P.waitForFunction(() => !document.querySelector(".book-page-wait"), null, { timeout: 8000 }).catch(() => {});
    check(`${tag} the stub reader was actually requested from archive.org`, asked.some((u) => u.includes("/embed/AllInOne-Hadiths-EngArabicDarusalam_201407/")), asked.join(" | ").slice(0, 160));
    const title = await P.$eval(".book-page-title", (n) => n.textContent);
    check(`${tag} the title names the book and the number`, /6306|৬৩০৬/.test(title) && (lang === "bn" ? /বুখারী/.test(title) : /Bukhari/.test(title)), title);
    const credit = await P.$eval(".book-page-credit", (n) => ({ text: n.textContent, href: n.href }));
    check(`${tag} the credit line names the Darussalam edition on archive.org (Owner: credit line yes)`, credit.text === (lang === "bn" ? "স্ক্যান: দারুস সালাম সংস্করণ, archive.org-এ শেয়ার করা" : "Scan: Darussalam edition, shared on archive.org") && credit.href.startsWith("https://archive.org/details/"), JSON.stringify(credit));
    const open = await P.$eval("[data-book-page-open-link]", (n) => ({ href: n.href, target: n.target, rel: n.rel }));
    check(`${tag} "Open on archive.org" links the same page in a new tab, safely`, open.href.endsWith("/page/n3542/mode/1up") && open.target === "_blank" && /noopener/.test(open.rel), JSON.stringify(open));
    const dlEl = await P.$("[data-book-page-download]");
    const dl = dlEl ? await dlEl.evaluate((n) => ({ href: n.href, text: n.textContent, target: n.target, rel: n.rel })) : { href: "", text: "", target: "", rel: "" };
    check(`${tag} "Download this book" links the whole PDF, with its size, in a new tab (Owner, 11 Nov)`, dl.href === "https://archive.org/download/AllInOne-Hadiths-EngArabicDarusalam_201407/All%20in%20One-Sahih%20Al%20Bukhari-Eng-Arabic.pdf" && dl.text === (lang === "bn" ? "এই বইটি ডাউনলোড করুন (PDF, ৮২ MB)" : "Download this book (PDF, 82 MB)") && dl.target === "_blank" && /noopener/.test(dl.rel), JSON.stringify(dl));
    const geo = await P.evaluate(() => { const r = document.querySelector(".book-page-pane").getBoundingClientRect(); const c = document.querySelector("[data-book-page-close]").getBoundingClientRect(); const f = document.querySelector("[data-book-page-frame]").getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight, cw: c.width, ch: c.height, fh: f.height }; });
    check(`${tag} the pane sits inside the screen`, geo.l >= -0.5 && geo.t >= -0.5 && geo.r <= geo.vw + 0.5 && geo.b <= geo.vh + 0.5, JSON.stringify(geo));
    check(`${tag} the × is at least 40px, and the page area is tall enough to read (>= 300px)`, geo.cw >= 40 && geo.ch >= 40 && geo.fh >= 300, JSON.stringify(geo));
    const focusIn = await P.evaluate(() => document.activeElement?.matches("[data-book-page-close]"));
    check(`${tag} focus moves to the × when the pane opens`, focusIn);
    await P.screenshot({ path: `${process.env.SHOTS || "/tmp"}/book-page-${lang}-${width}.png` });
    // way back: Escape
    await P.keyboard.press("Escape");
    await P.waitForTimeout(150);
    check(`${tag} Escape closes the pane`, (await P.$("[data-book-page-pane]")) === null);
    check(`${tag} ...and focus is back on the "Original book page" button (way-back law)`, await P.evaluate((s) => document.activeElement === document.querySelector(s), BTN));
    // × and outside tap
    await btn.click(); await P.waitForSelector("[data-book-page-pane]");
    await P.click("[data-book-page-close]"); await P.waitForTimeout(100);
    check(`${tag} the × closes it`, (await P.$("[data-book-page-pane]")) === null);
    if (width > 700) {
      await btn.click(); await P.waitForSelector("[data-book-page-pane]");
      await P.mouse.click(8, 8); await P.waitForTimeout(100);
      check(`${tag} a tap outside closes it`, (await P.$("[data-book-page-pane]")) === null);
    }
    check(`${tag} the page can scroll again after closing`, await P.evaluate(() => !document.body.classList.contains("book-page-open")));
    check(`${tag} pressing again re-used the page map (still one fetch)`, fetched.join() === "bukhari.json", fetched.join());
  }
  // Muslim: its own narration with a standard number, through the same reader.
  await P.goto(P.url()); await P.waitForSelector('[data-hadith-tab="dua"]');
  await P.click('[data-hadith-tab="dua"]'); await P.click('[data-dua-mode="chapters"]'); await P.waitForSelector("[data-dua-book]");
  await P.click('[data-dua-book="0261Muslim.Sahih.Shamela0001727-ara1"]'); await P.waitForSelector("[data-dua-chapter]"); await P.click("[data-dua-chapter]");
  await P.waitForSelector("[data-openiti-goto-input]", { state: "attached" });
  const step2 = await P.$('[data-reader-show="chapters"]'); if (step2 && await step2.isVisible()) await step2.click();
  await P.fill("[data-openiti-goto-input]", "331"); await P.click("[data-openiti-goto-btn]");
  const MB = '[data-book-page-button="331"]';
  await P.waitForSelector(MB, { timeout: 15000 }).catch(() => {});
  const mbtn = await P.$(MB);
  check(`${tag} Muslim 331 has an "Original book page" button`, !!mbtn);
  if (mbtn) {
    await mbtn.scrollIntoViewIfNeeded(); await mbtn.click(); await P.waitForSelector("[data-book-page-pane]");
    const mSrc = await P.$eval("[data-book-page-frame]", (f) => f.src);
    check(`${tag} ...it asks for leaf 217 of the Muslim scan`, mSrc === "https://archive.org/embed/AllInOne-Hadiths-EngArabicDarusalam_201407/All%20in%20One-Sahih%20Muslim-Eng-Arabic-Darusalam#page/n217/mode/1up", mSrc);
    const mTitle = await P.$eval(".book-page-title", (n) => n.textContent);
    check(`${tag} ...and names Sahih Muslim, hadith 331`, /331|৩৩১/.test(mTitle) && (lang === "bn" ? /মুসলিম/.test(mTitle) : /Sahih Muslim/.test(mTitle)), mTitle);
    await P.keyboard.press("Escape"); await P.waitForTimeout(120);
    check(`${tag} Muslim: Escape closes it`, (await P.$("[data-book-page-pane]")) === null);
  }
  // module-level: which books show a button, and the approximate flag
  const mod = await P.evaluate(async (buk) => {
    const m = await import("/app/js/hadith-book-pages.js"); const v = await import("/app/js/hadith-book-viewer.js");
    const exact = await m.loadBookPage(buk, 112), approx = await m.loadBookPage(buk, 273), none = await m.loadBookPage(buk, 9999), other = await m.loadBookPage("0275AbuDawudSijistani.Sunan.JK000142-ara1", 5);
    const tirm = await m.loadBookPage("0279Tirmidhi.Sunan.JK000140-ara1", 500);
    return { tirm: tirm && [tirm.leaf, tirm.embedUrl], hasMuslim: m.hasBookPages("0275AbuDawudSijistani.Sunan.JK000142-ara1"), hasBukhari: m.hasBookPages(buk), muslimBtn: v.bookPageButton("0275AbuDawudSijistani.Sunan.JK000142-ara1", 5) === null,
      exact: exact && [exact.leaf, exact.approximate], approx: approx && [approx.leaf, approx.approximate], none, other, keys: Object.keys(m.BOOK_PAGE_BOOKS), all: m.BOOK_PAGE_BOOKS };
  }, BUK);
  check(`${tag} a book with no scan yet (Abu Dawud) shows no button and no page`, !mod.hasMuslim && mod.hasBukhari && mod.muslimBtn && mod.other === null);
  check(`${tag} hadith 112 is exact on leaf 120; hadith 273 is flagged approximate; a number past the end has no page`, JSON.stringify(mod.exact) === "[120,false]" && mod.approx?.[1] === true && mod.none === null, JSON.stringify(mod));
  check(`${tag} Tirmidhi 500 is on leaf 501 of its own scan file`, mod.tirm?.[0] === 501 && mod.tirm?.[1] === "https://archive.org/embed/AllInOne-Hadiths-EngArabicDarusalam_201407/All%20in%20One-Jami%20At-Tirmidhi-Eng#page/n501/mode/1up", JSON.stringify(mod.tirm));
  check(`${tag} the app's book list is bound to the registry (sources/book-pages.json), both ways`, JSON.stringify([...mod.keys].sort()) === JSON.stringify(reg.books.filter((b) => ["mapped", "verified"].includes(b.status)).map((b) => b.versionUri).sort()) && reg.books.filter((b) => ["mapped", "verified"].includes(b.status)).every((b) => mod.all[b.versionUri]?.archiveId === b.archiveId && mod.all[b.versionUri]?.slug === b.scanSlug && mod.all[b.versionUri]?.key === b.key && mod.all[b.versionUri]?.pdf === b.pdfFile && mod.all[b.versionUri]?.pdfBytes === b.pdfBytes), JSON.stringify(mod.keys));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Hadith original book page (Bukhari, Muslim, Tirmidhi): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
