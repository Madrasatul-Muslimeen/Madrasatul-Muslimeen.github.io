// Search by sound -- the Owner, 5 Oct 2026: "Enable searching with
// Transliteration like the example" (typed "Inni fi khalqi samawate" into
// Study options' Search and got "Nothing found").
//
// Part 1 (pure, Node): the consonant-skeleton matching in
// app/js/quran-search.js against the REAL packaged search-tr.json.
// Part 2 (browser): the Owner's own example typed into the real Search box,
// en and bn, at 390 and 1280 -- the results, their heading, the highlight,
// and that a tap moves the screen.
// Mutations: --mutate-strict (no slips forgiven: the Owner's own spelling
// must then fail) and --mutate-no-sound (the page never searches by sound:
// the browser checks must fail). Run from the repository root with serve.js.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const STRICT = process.argv.includes("--mutate-strict");
const NO_SOUND = process.argv.includes("--mutate-no-sound");

// ---- Part 1: the matching, in Node ----------------------------------------
let src = fs.readFileSync("app/js/quran-search.js", "utf8");
if (STRICT) {
  const n = (src.match(/if \(length < 5\) return 0;/g) || []).length;
  if (n !== 1) { console.log("mutation did not apply"); process.exit(2); }
  src = src.replace(/export function soundTolerance\(length\) \{[\s\S]*?\n\}/, "export function soundTolerance() { return 0; }");
}
src = src.replace(/from "\.\/quran-data\.js"/, `from "data:text/javascript,export async function getSearchIndex(l){return JSON.parse((await import('node:fs')).readFileSync('tools/quran-data-pull/output/search-'+l+'.json','utf8'));}"`);
const m = await import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));

console.log("\n=== the sound skeleton ===");
const idx = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/search-tr.json", "utf8"));
check("POSITIVE CONTROL -- the transliteration index has one line for every ayah (6,236), none empty", idx.texts.length === 6236 && idx.texts.every((x) => x.trim()), String(idx.texts.length));
check("POSITIVE CONTROL -- 3:190 reads inna fī khalqi l-samāwāti …", idx.texts[idx.refs.indexOf(3190)].startsWith("inna fī khalqi l-samāwāti"), idx.texts[idx.refs.indexOf(3190)]);
for (const [w, want] of [["l-samāwāti", "lsmwt"], ["samawate", "smwt"], ["Inni", "n"], ["inna", "n"], ["khalqi", "khlk"], ["dhālika", "zlk"], ["zalika", "zlk"], ["aḥadun", "hdn"]]) {
  check(`"${w}" sounds as "${want}"`, m.soundSkeleton(w) === want, m.soundSkeleton(w));
}

console.log("\n=== searching by sound, against the real index ===");
const top = async (q, n = 2) => (await m.searchTransliteration(q)).results.slice(0, n).map((h) => `${h.surah}:${h.ayah}`);
const owner = await m.searchTransliteration("Inni fi khalqi samawate");
check("THE OWNER'S EXAMPLE -- \"Inni fi khalqi samawate\" finds 2:164 and 3:190 first", JSON.stringify(owner.results.slice(0, 2).map((h) => `${h.surah}:${h.ayah}`)) === '["2:164","3:190"]', JSON.stringify(owner.results.slice(0, 4).map((h) => `${h.surah}:${h.ayah}`)));
check("...and highlights the matching words (inna fī khalqi l-samāwāti)", owner.results[0]?.match === "inna fī khalqi l-samāwāti", owner.results[0]?.match);
check("\"kul huwallahu ahad\" (k for q, run together) finds 112:1 first", (await top("kul huwallahu ahad", 1))[0] === "112:1", JSON.stringify(await top("kul huwallahu ahad")));
check("\"alhamdulillahi rabbil alamin\" finds 1:2 first", (await top("alhamdulillahi rabbil alamin", 1))[0] === "1:2");
check("\"zalika al kitabu la rayba\" (z for dh) finds 2:2 first", (await top("zalika al kitabu la rayba", 1))[0] === "2:2");
check("\"bismillah\" finds 1:1 first", (await top("bismillah", 1))[0] === "1:1");
check("closest first: every result is no further than the one before it", (() => { const d = owner.results.map((h) => h.distance); return d.every((x, i) => i === 0 || x >= d[i - 1]); })());
check("an English word (\"patience\") finds nothing by sound", (await m.searchTransliteration("patience")).total === 0);
check("Arabic letters are never searched by sound", (await m.searchTransliteration("الرحمن")).total === 0);
check("a one-letter query is refused rather than matching everything", (await m.searchTransliteration("a")).total === 0);

// ---- Part 2: the real Search box -------------------------------------------
console.log("\n=== the Search box, in the app ===");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"]) {
  for (const width of [390, 1280]) {
    const tag = `${lang} ${width}px`;
    const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 } });
    if (NO_SOUND) {
      let page = fs.readFileSync("app/quranrevival.html", "utf8");
      const n = (page.match(/searchTransliteration\(query, \{ limit: 50 \}\)/g) || []).length;
      if (n !== 1) { console.log("mutation did not apply"); process.exit(2); }
      page = page.replace("searchTransliteration(query, { limit: 50 })", "Promise.resolve(null)");
      await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: page }));
    }
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await page.click("#tabStudyBtn");
    await page.waitForTimeout(150);
    await page.click("#tabStudyOptionsBtn");
    await page.waitForTimeout(250);
    await page.fill("#jumpInput", "Inni fi khalqi samawate");
    await page.click("#searchBtn");
    await page.waitForFunction(() => document.querySelectorAll("#searchResults .search-hit").length > 0 || /Nothing|কিছু পাওয়া/.test(document.getElementById("searchStatus").textContent), null, { timeout: 15000 }).catch(() => {});
    const r = await page.evaluate(() => {
      const hits = [...document.querySelectorAll("#searchResults .search-hit")];
      const head = document.querySelector("#searchResults .search-group-head");
      const card = document.getElementById("searchCard").getBoundingClientRect();
      return {
        status: document.getElementById("searchStatus").textContent.trim(),
        hits: hits.length, head: head?.textContent.trim() || "",
        first: hits[0]?.querySelector(".ref")?.textContent.trim() || "",
        mark: hits[0]?.querySelector("mark")?.textContent.trim() || "",
        italic: hits[0] ? getComputedStyle(hits[0].querySelector(".snip")).fontStyle : "",
        inside: hits.slice(0, 3).every((h) => { const b = h.getBoundingClientRect(); return b.left >= card.left - 1 && b.right <= card.right + 1; }),
        sw: document.documentElement.scrollWidth, w: window.innerWidth,
      };
    });
    check(`${tag}: the Owner's example now finds ayahs (it said "Nothing found")`, r.hits > 0, JSON.stringify(r));
    check(`${tag}: under a "By sound" heading in ${lang === "bn" ? "Bangla" : "English"}`, lang === "bn" ? /উচ্চারণ/.test(r.head) : /^By sound \(transliteration\)/.test(r.head), r.head);
    check(`${tag}: the first is Al-Baqarah 2:164 and the words are highlighted in transliteration`, /2:164|২:১৬৪/.test(r.first) && r.mark === "inna fī khalqi l-samāwāti", JSON.stringify(r));
    check(`${tag}: the status line says it was found by sound`, lang === "bn" ? /উচ্চারণ/.test(r.status) : /by sound/i.test(r.status), r.status);
    check(`${tag}: results sit inside their card, no sideways scroll`, r.inside && r.sw <= r.w + 1, JSON.stringify(r));
    if (r.hits) {
      await page.click("#searchResults .search-hit");
      await page.waitForTimeout(700);
      const at = await page.evaluate(() => ({ s: document.getElementById("surahSelect").value, a: document.getElementById("ayahSelect").value }));
      check(`${tag}: tapping it opens 2:164`, at.s === "2" && at.a === "164", JSON.stringify(at));
    } else check(`${tag}: tapping it opens 2:164`, false, "no result to tap");
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
