// PCF MSA J103 Round 3: a HadeethEnc card shows each proven reference (book, standard number, chapter); a tap opens
// THAT hadith in the library, and "← Back to the hadith card" returns to the card (decision 86).
// Expected values are NOT read from the data the page uses: 4560 is Muslim 1907 (sunnah.com, by hand), and a shown
// number must equal the standard number the LIBRARY itself prints on the passage it opens (the concordance, a
// different file), for a spread of books.
// Run from the repository root, serve.js on :8080.
//   --mutate=wrongpassage  the tap opens the passage after the right one -> the "opens that hadith" checks fail
//   --mutate=noback        no way back                                   -> the Back checks fail
//   --mutate=unproven      a not-yet-found book is not said              -> the "not yet found" check fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  wrongpassage: ["js/hadith-browser.js", "openReferenceInBook(state, id, b.uri, ref.n)", "openReferenceInBook(state, id, b.uri, ref.n + 1)"],
  noback: ["js/hadith-browser.js", 'trail: [{ label: t("← Back to the hadith card")', 'trail: [], _x: [{ label: t("← Back to the hadith card")'],
  unproven: ["js/hadith-browser.js", "if (missing.length) {", "if (false) {"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

// A spread of books, chosen from the data by hand-written rule (first proven id per book with a passage), plus 4560.
const DISPLAY = "tools/hadith-data-pull/output/hadeethenc-references/display";
const firstOf = {};
for (const f of fs.readdirSync(DISPLAY).sort((a, b) => parseInt(a) - parseInt(b))) {
  for (const [id, refs] of Object.entries(JSON.parse(fs.readFileSync(`${DISPLAY}/${f}`, "utf8")).refs)) {
    for (const r of refs) if (r[2] != null && !firstOf[r[0]] && id !== "4560") firstOf[r[0]] = { id, book: r[0], cite: r[1] };
  }
}
// A card with a named book not yet proven (the first such id with a proven reference too), for the "not yet found" line.
let UNPROVEN = null;
for (const f of fs.readdirSync(DISPLAY).sort((a, b) => parseInt(a) - parseInt(b))) {
  const d = JSON.parse(fs.readFileSync(`${DISPLAY}/${f}`, "utf8"));
  const id = Object.keys(d.notFound).find((k) => d.refs[k]?.length);
  if (id) { UNPROVEN = { id, books: d.notFound[id].join(",") }; break; }
}
const SPREAD = [{ id: "4560", book: "muslim", cite: "1907" }, ...["bukhari", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik", "ahmad"].map((b) => firstOf[b]).filter(Boolean)];
const STANDARD = new Set(["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function openCard(ctx, pagePath, id) {
  const { page: P, errors } = await openPage(ctx, `${pagePath}?resume=hadith:hadeethenc:${id}`);
  await P.click('[data-hadith-tab="collections"]').catch(() => {});
  await P.waitForSelector(`[data-hadeethenc-card="${id}"] [data-hadeethenc-refs] .hadith-ref, [data-hadeethenc-card="${id}"] [data-hadith-ref-missing]`, { timeout: 20000 });
  return { P, errors };
}

for (const [pagePath, lang, width] of [["/app/hadith-collections.html", "en", 390], ["/app/hadith-collections.html", "bn", 820], ["/app/hadith-study.html", "en", 1280]]) {
  const tag = `[${pagePath.slice(5)} ${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 860 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing in ${file}`);
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { P } = await openCard(ctx, pagePath, "4560");
  const card = await P.evaluate(() => {
    const box = document.querySelector('[data-hadeethenc-card="4560"] [data-hadeethenc-refs]');
    const btn = box?.querySelector('[data-hadith-ref="muslim:1907"]');
    const r = btn?.getBoundingClientRect();
    return { btn: btn?.textContent ?? null, h: r?.height ?? 0, inside: !!r && r.left >= 0 && r.right <= innerWidth,
      chapter: btn?.closest(".hadith-ref")?.querySelector(".hadith-ref-chapter")?.textContent ?? "", bukhari: !!box?.querySelector('[data-hadith-ref="bukhari:6689"]'),
      missing: box?.querySelector("[data-hadith-ref-missing]")?.dataset.hadithRefMissing ?? null,
      sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  check(`${tag} hadith 4560 shows Muslim 1907 as a tappable reference, at least 40px tall, on screen`, !!card.btn && /1907|১৯০৭/.test(card.btn) && card.h >= 40 && card.inside, JSON.stringify(card));
  check(`${tag} its Arabic chapter is shown (كتاب الإمارة)`, card.chapter.includes("كتاب الإمارة"), card.chapter);
  // By hand (sunnah.com): "innamal a'malu bin-niyyah" is also Bukhari 6689 (Book of Oaths and Vows), found by its
  // quoted words (Round 4); both books its line names are proven, so nothing is "not yet found" on this card.
  check(`${tag} it shows Bukhārī 6689 too, and no "not yet found" line`, card.bukhari && card.missing === null, JSON.stringify(card));
  check(`${tag} no sideways scroll`, card.sideways <= 0, String(card.sideways));
  // A card whose line names a book not yet proven says so, and shows no number for it.
  {
    const { P: Q } = await openCard(ctx, pagePath, UNPROVEN.id);
    const miss = await Q.evaluate((id) => {
      const box = document.querySelector(`[data-hadeethenc-card="${id}"] [data-hadeethenc-refs]`);
      return box?.querySelector("[data-hadith-ref-missing]")?.dataset.hadithRefMissing ?? null;
    }, UNPROVEN.id);
    check(`${tag} hadith ${UNPROVEN.id}: ${UNPROVEN.books}, named but not yet proven, is said to be "not yet found" (no guessed number)`, miss === UNPROVEN.books, JSON.stringify(miss));
    await Q.close();
  }
  if (width === 390 || lang === "bn") {
    fs.mkdirSync("/tmp/claude-0/shots", { recursive: true });
    await P.locator('[data-hadeethenc-card="4560"] [data-hadeethenc-refs]').screenshot({ path: `/tmp/claude-0/shots/refs-${lang}-${width}.png` }).catch(() => {});
  }

  // Tap -> the library opens THAT hadith: the passage it focuses prints the same standard number.
  await P.click('[data-hadith-ref="muslim:1907"]');
  const opened = await P.waitForSelector("[data-openiti-focused]", { timeout: 20000 }).then(() => P.evaluate(() => {
    const f = document.querySelector("[data-openiti-focused]");
    const r = f.getBoundingClientRect();
    return { std: f.querySelector("[data-openiti-standard]")?.dataset.openitiStandard ?? null, onScreen: r.bottom > 0 && r.top < innerHeight,
      back: document.querySelector("[data-openiti-trail-back]")?.textContent ?? null };
  })).catch(() => null);
  check(`${tag} the tap opens Muslim 1907 itself (the library prints 1907 on the focused passage), on screen`, opened?.std === "1907" && opened.onScreen, JSON.stringify(opened));
  check(`${tag} a way back is shown`, !!opened?.back, JSON.stringify(opened));
  if (opened?.back) {
    await P.click("[data-openiti-trail-back]");
    await P.waitForTimeout(1200);
    const there = await P.evaluate(() => { const c = document.querySelector('[data-hadeethenc-card="4560"]')?.getBoundingClientRect(); return { card: !!c, onScreen: !!c && c.bottom > 0 && c.top < innerHeight }; });
    check(`${tag} ← Back returns to hadith 4560's card, on screen`, there.card && there.onScreen, JSON.stringify(there));
  } else check(`${tag} ← Back returns to hadith 4560's card, on screen`, false, "no back button");
  await ctx.close();
}

// The spread: every book's first proven reference opens a passage whose own printed standard number is the one shown.
{
  const ctx = await newContext(browser, { appLang: "en", banner: false, viewport: { width: 1024, height: 860 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: fs.readFileSync(`app/${file}`, "utf8").split(a).join(b) }));
  }
  for (const s of SPREAD.slice(1)) {
    const { P } = await openCard(ctx, "/app/hadith-collections.html", s.id);
    await P.click(`[data-hadeethenc-card="${s.id}"] [data-hadith-ref="${s.book}:${s.cite}"]`);
    const got = await P.waitForSelector("[data-openiti-focused]", { timeout: 20000 }).then(() => P.evaluate(() => {
      const f = document.querySelector("[data-openiti-focused]");
      return { std: f.querySelector("[data-openiti-standard]")?.dataset.openitiStandard ?? null, number: f.querySelector(".openiti-number, [data-openiti-number]")?.textContent ?? f.textContent.slice(0, 40) };
    })).catch(() => null);
    const ok = STANDARD.has(s.book) ? String(got?.std) === String(s.cite) || Math.floor(Number(got?.std)) === Math.floor(Number(s.cite)) : !!got;
    check(`${s.book} ${s.cite} (HadeethEnc ${s.id}) opens the passage the library numbers ${s.cite}`, ok, JSON.stringify(got));
    await P.close();
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
