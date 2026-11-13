// PCF MSA J106 7A (the Owner, 14 Nov 2026) -- the Hadith books' Dua chapters on the Dua page (dua-study.js renderBooks), moved from the Hadith
// page's Dua tab. Rendered checks at 320/390/1280 in English and Bangla: the button, the book list (titles + counts), one book's chapters, a
// chapter opening in Hadith Books with ← Back returning to the same chapter list, an address for each place, no overflow, no English leak in Bangla.
// Run from the repository root with serve.js on :8080.
//   --mutate=noaddr    the Dua page does not write books/book into its address     --mutate=nochapter  Hadith Books ignores ?chapter=
//   --mutate=noback    the chapter link carries no back=1                            --mutate=stay       choosing a group does not leave the books view
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`); if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); } };
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  noaddr: ["app/js/dua-study.js", 'if (where.books) { u.searchParams.set("books", "1");', 'if (false) { u.searchParams.set("books", "1");'],
  nochapter: ["app/hadith-collections.html", "&& /^[0-9A-Za-z_-]{1,40}$/.test(chapterId)", "&& false"],
  noback: ["app/js/dua-study.js", "&chapter=${encodeURIComponent(id)}&back=1`", "&chapter=${encodeURIComponent(id)}`"],
  stay: ["app/js/dua-study.js", "tie: null, books: false, book: null }, next);", "tie: null }, next);"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function open(width, lang, url) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => {
      const s = fs.readFileSync(file, "utf8");
      if (!s.includes(a)) throw new Error(`mutation anchor missing in ${file}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html" : "text/javascript", body: s.replace(a, b) });
    });
  }
  const { page: P } = await openPage(ctx, url);
  return { ctx, P };
}
const ENGLISH_CHROME = /\b(Hadith Books|Dua chapters|narrations|All Dua books)\b/;

for (const [width, lang] of [[320, "en"], [390, "bn"], [1280, "en"], [1280, "bn"]]) {
  const tag = `[${lang} ${width}]`;
  const { ctx, P } = await open(width, lang, "/app/dua-study.html?g=rasul");
  await P.waitForSelector('[data-dua-pd="books"]', { timeout: 20000 });
  const geo = await P.evaluate(() => { const b = document.querySelector('[data-dua-pd="books"]').getBoundingClientRect(); return { l: b.left, r: b.right, h: b.height, vw: innerWidth, sx: document.documentElement.scrollWidth - innerWidth }; });
  check(`${tag} the Dua chapters button is on screen, finger-sized, and the page does not scroll sideways`, geo.l >= 0 && geo.r <= geo.vw + 0.5 && geo.h >= 40 && geo.sx <= 0, JSON.stringify(geo));
  await P.click('[data-dua-pd="books"]');
  await P.waitForSelector("[data-dua-book]", { timeout: 20000 });
  const rows = await P.$$eval("[data-dua-book]", (r) => r.map((x) => ({ ar: !!x.querySelector(".openiti-title-ar"), meta: x.querySelector(".hadith-row-meta")?.textContent ?? "", right: x.getBoundingClientRect().right })));
  check(`${tag} the Dua books are listed, each with its Arabic title and a narration count`, rows.length >= 10 && rows.every((r) => r.ar && /[\d০-৯]/.test(r.meta) && r.right <= geo.vw + 0.5), JSON.stringify(rows.slice(0, 2)));
  check(`${tag} the address names this place (?books=1)`, new URL(P.url()).searchParams.get("books") === "1", P.url());
  if (lang === "bn") {
    const txt = await P.evaluate(() => document.getElementById("duaSection").innerText);
    check(`${tag} Bangla: no English chrome words in the list`, !ENGLISH_CHROME.test(txt), txt.match(ENGLISH_CHROME)?.[0] ?? "");
  }
  const bookUri = await P.$eval("[data-dua-book]", (b) => b.dataset.duaBook);
  await P.click("[data-dua-book]");
  await P.waitForSelector("[data-dua-chapter]");
  const ch = await P.$$eval("[data-dua-chapter]", (r) => r.length);
  check(`${tag} a book shows its chapters, and the address names the book`, ch >= 1 && new URL(P.url()).searchParams.get("book") === bookUri, `${ch} ${P.url()}`);
  await P.reload();
  await P.waitForSelector("[data-dua-chapter]", { timeout: 20000 }).catch(() => {});
  check(`${tag} reloading the address reopens the same book's chapters`, (await P.$$eval("[data-dua-chapter]", (r) => r.length)) === ch);
  const placeBefore = P.url();
  await P.click("[data-dua-chapter]");
  await P.waitForURL(/hadith-collections/, { timeout: 20000 });
  const u = new URL(P.url());
  check(`${tag} the chapter link names the book, the chapter and back=1`, u.searchParams.get("openiti") === bookUri && !!u.searchParams.get("chapter") && u.searchParams.get("back") === "1", P.url());
  const shown = await P.waitForSelector(".openiti-passage", { timeout: 20000 }).then(() => true).catch(() => false);
  check(`${tag} Hadith Books shows that chapter's narrations`, shown);
  const backShown = await P.evaluate(() => { const b = document.getElementById("hadithBackBtn"); return !!b && !b.hidden; });
  check(`${tag} ← Back is shown`, backShown);
  if (backShown) {
    await P.click("#hadithBackBtn");
    await P.waitForSelector("[data-dua-chapter]", { timeout: 20000 }).catch(() => {});
    check(`${tag} ← Back returns to the same book's chapter list`, P.url() === placeBefore && (await P.$$eval("[data-dua-chapter]", (r) => r.length)) === ch, P.url());
  } else check(`${tag} ← Back returns to the same book's chapter list`, false, "no back button");
  await P.waitForSelector('[data-dua-pd="groups"]');
  await P.click('[data-dua-pd="groups"]');
  await P.click('[data-dua-group="rasul"]');
  await P.waitForTimeout(300);
  check(`${tag} choosing a Dua group leaves the books view (no books in the address, the list is back)`, !new URL(P.url()).searchParams.has("books") && (await P.$$("[data-dua-book]")).length === 0);
  await ctx.close();
}
await browser.close();
console.log(`==== Dua chapters on the Dua page: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
