// 9 Oct 2026 (the 8 Oct handover's "possible next": Notes and bookmarks on a dua): every Dua card has 📝 My Notes and
// 🔖 Bookmark this, the same pair a HadeethEnc hadith card has, on the dua's permanent key dua:<n> (decision 88).
// Notes open notes.html for that key with ← Back to the same card (the way-back law, decision 86; ADR-009 §9 makes
// the key bindable, sourceKind dua-unit). The bookmark is saved in the person's own bookmarks document, and the
// Bookmarks page's ?resume=dua:<n> reopens that card on its own page. A failed save says so (I15).
// Expected values written BY HAND: Dua 45 is on page 2 (40 cards a page, most narrated first).
// Run from the repository root, serve.js on :8080.
//   --mutate=noback    the Notes link loses back=1          -> the Back checks fail
//   --mutate=wrongkey  the bookmark is saved under hadith:… -> the key check fails
//   --mutate=noresume  ?resume=dua:<n> is not read          -> the resume check fails
//   --mutate=contentbox the shared button style loses border-box -> the same-height check fails
//   --mutate=nokeep    the card is not kept in view          -> the Back-lands check fails (often, not always)
//   --mutate=noplace   the card's place is not remembered    -> the Back-lands check fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
const { buildUnitKey } = await import("../../app/js/unit-keys.js");
const { sourceKindForUnitKey } = await import("../../app/js/study-note-binding.js");

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  noback: ["js/hadith-study-actions.js", '  params.set("back", "1");\n', "\n"],
  wrongkey: ["js/hadith-study-actions.js", "    subjectId: DUA_BOOKMARK_SUBJECT_ID, name, position: unitKey, uid: session.uid,", "    subjectId: DUA_BOOKMARK_SUBJECT_ID, name, position: `hadith:${unitKey}`, uid: session.uid,"],
  noresume: ["hadith-study.html", '/^dua:(\\d{1,5})$/.exec(resumeParam ?? "")', "null"],
  contentbox: ["css/hadith.css", "  box-sizing: border-box;\n  display: inline-flex;", "  display: inline-flex;"],
  nokeep: ["js/hadith-browser.js", "    if (target) keepCardInView(target, list);\n", "\n"],
  noplace: ["js/hadith-browser.js", " return; } rememberDuaPlace(page, dua); });", " return; } });"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const KEY = buildUnitKey.dua(20);
check("the permanent key is built by buildUnitKey: dua:20, and Notes bind it as dua-unit (ADR-009 §9)", KEY === "dua:20" && sourceKindForUnitKey(KEY) === "dua-unit", `${KEY} ${sourceKindForUnitKey(KEY)}`);
check("a dua WORD is not a Note source (Notes are on the dua)", sourceKindForUnitKey(buildUnitKey.duaWord(1, 2)) === null);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function context(lang, width, look, extra = null) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 860 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch {} }, look);
  for (const [file, a, b] of [MUTATE && MUT[MUTATE], extra].filter(Boolean)) {
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing in ${file}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html; charset=utf-8" : file.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  return ctx;
}
const ROW = '[data-dua-note-bookmark="20"]'; // Dua 20: well down page 1, so "back on its card" cannot pass by luck

for (const [lang, width, look] of [["en", 390, "light"], ["bn", 390, "night"], ["en", 1280, "night"]]) {
  const tag = `[${lang} ${width} ${look}]`;
  const bn = lang === "bn";
  const ctx = await context(lang, width, look);
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html");
  await P.click('[data-hadith-tab="dua"]');
  await P.waitForSelector(`${ROW} [data-dua-bookmark]`, { timeout: 15000 }).catch(() => {});
  const row = await P.evaluate((sel) => {
    const r = document.querySelector(sel);
    const card = r?.closest("[data-dua-card]")?.getBoundingClientRect();
    const note = r?.querySelector("[data-dua-note-link]"), mark = r?.querySelector("[data-dua-bookmark]");
    const box = (e) => e?.getBoundingClientRect();
    return { note: note?.textContent, href: note?.getAttribute("href"), mark: mark?.textContent,
      h: Math.min(box(note)?.height ?? 0, box(mark)?.height ?? 0), dh: Math.abs((box(note)?.height ?? 0) - (box(mark)?.height ?? 0)), inside: !!card && [note, mark].every((e) => box(e).left >= card.left - 0.5 && box(e).right <= card.right + 0.5),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  }, ROW);
  check(`${tag} Dua 20's card has ${bn ? "📝 আমার নোট and 🔖 এটি বুকমার্ক করুন" : "📝 My Notes and 🔖 Bookmark this"}, both 40px tall (the same height), inside the card, no sideways scroll`,
    row.note === (bn ? "📝 আমার নোট" : "📝 My Notes") && row.mark === (bn ? "🔖 এটি বুকমার্ক করুন" : "🔖 Bookmark this") && row.h >= 40 && row.dh < 1 && row.inside && row.overflow <= 0, JSON.stringify(row));
  const q = new URLSearchParams((row.href ?? "").split("?")[1] ?? "");
  check(`${tag} My Notes opens notes.html for dua:20, labelled ${bn ? "দুআ ২০" : "Dua 20"}, with back=1`, (row.href ?? "").startsWith("notes.html?") && q.get("unit") === "dua:20" && q.get("label") === (bn ? "দুআ ২০" : "Dua 20") && q.get("back") === "1", row.href);

  // The bookmark: saved in the person's own bookmarks document, under the dua's key.
  await P.evaluate((sel) => { window.__stubWriteData = []; document.querySelector(sel)?.scrollIntoView({ block: "center" }); }, ROW);
  await P.click(`${ROW} [data-dua-bookmark]`);
  await P.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "bookmarks"), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(300);
  const saved = await P.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "bookmarks").flatMap((w) => (w.data?.saved ?? []).map((b) => ({ id: w.id, moduleId: b.moduleId, subjectId: b.subjectId, position: b.position, name: b.name }))));
  const markNow = await P.evaluate((sel) => document.querySelector(`${sel} [data-dua-bookmark]`)?.textContent, ROW);
  check(`${tag} Bookmark saves {moduleId hadith, subjectId dua, position dua:20} in t1__p1's own bookmarks`, saved.some((b) => b.id === "t1__p1" && b.moduleId === "hadith" && b.subjectId === "dua" && b.position === KEY && b.name === (bn ? "দুআ ২০" : "Dua 20")), JSON.stringify(saved));
  check(`${tag} ...and the button then says ${bn ? "★ বুকমার্ক সরান" : "★ Remove bookmark"}`, markNow === (bn ? "★ বুকমার্ক সরান" : "★ Remove bookmark"), markNow);

  // My Notes and back: the Notes page for the dua, then ← Back to the same card.
  let went = true;
  await Promise.all([P.waitForURL(/notes\.html\?/, { timeout: 15000 }), P.click(`${ROW} [data-dua-note-link]`)]).catch(() => { went = false; });
  check(`${tag} My Notes opens the Notes page`, went);
  if (went) {
    await P.waitForFunction(() => document.getElementById("unitBanner")?.textContent.trim().length > 0, null, { timeout: 15000 }).catch(() => {});
    const np = await P.evaluate(() => ({ banner: document.getElementById("unitBanner")?.textContent ?? "", back: (() => { const b = document.getElementById("notesBackBtn"); return b && !b.hidden && getComputedStyle(b).display !== "none" ? { text: b.textContent, h: b.getBoundingClientRect().height } : null; })(), newBtn: getComputedStyle(document.getElementById("newNoteBtn")).display }));
    check(`${tag} the Notes page is about ${bn ? "দুআ ২০" : "Dua 20"}, and a Note can be written there (the key is bindable)`, np.banner.includes(bn ? "দুআ ২০" : "Dua 20") && np.newBtn !== "none", JSON.stringify(np));
    check(`${tag} ...with ${bn ? "← পেছনে" : "← Back"} on screen, 40px tall`, np.back?.text === (bn ? "← পেছনে" : "← Back") && np.back.h >= 40, JSON.stringify(np.back));
    if (np.back) {
      let back = true;
      await Promise.all([P.waitForURL(/hadith-collections\.html/, { timeout: 15000 }), P.click("#notesBackBtn")]).catch(() => { back = false; });
      // Either the page is re-drawn from its address (Dua 20's card focused) or the browser restores it exactly as it
      // was left (its back-forward cache: no focus mark, same scroll). What the reader needs either way: card 1 on screen.
      const onScreen = () => { const r = document.querySelector('[data-dua-card="20"]')?.getBoundingClientRect(); return !!r && r.bottom > 0 && r.top < innerHeight; };
      // 40s, not 15s: under load (behaviour running beside it) the Duas page re-draws from its address slowly; this
      // failed twice that way (9 Oct), card not yet drawn, address already right. Still a state wait, never a sleep.
      await P.waitForFunction(onScreen, null, { timeout: 40000 }).catch(() => {});
      await P.waitForTimeout(3000); // ...and STAYS on screen once the cards above have filled in (found in this round)
      const there = await P.evaluate((f) => ({ url: location.search, onScreen: eval(f)(), focused: !!document.querySelector('[data-dua-card="20"].hadith-card-focused') }), `(${onScreen})`);
      check(`${tag} ← Back lands on the Duas page again, with Dua 20's card on screen`, back && /view=dua/.test(there.url) && /dua=20\b/.test(there.url) && there.onScreen, JSON.stringify(there));
    }
  }
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();

  // The Bookmarks page's link (?resume=dua:45) reopens Dua 45 on its own page (page 2).
  const ctx2 = await context(lang, width, look);
  const { page: R } = await openPage(ctx2, "/app/hadith-study.html?resume=dua:45");
  await R.waitForSelector('[data-dua-card="45"].hadith-card-focused', { timeout: 20000 }).catch(() => {});
  const res = await R.evaluate(() => ({ focused: !!document.querySelector('[data-dua-card="45"].hadith-card-focused'), page: document.querySelector(".dua-pager .hadith-note")?.textContent ?? "" }));
  check(`${tag} a dua bookmark (?resume=dua:45) reopens Dua 45's card, on page 2`, res.focused && res.page.includes(bn ? "২" : "2"), JSON.stringify(res));
  await ctx2.close();

  // I15: a failed bookmark save says so and keeps the old state.
  const ctx3 = await context(lang, width, look, ["js/hadith-study-actions.js", "  const unitKey = duaUnitKey(number);\n  const existing", "  throw new Error(\"permission-denied\");\n  const unitKey = duaUnitKey(number);\n  const existing"]);
  const { page: F } = await openPage(ctx3, "/app/hadith-collections.html");
  await F.click('[data-hadith-tab="dua"]');
  await F.waitForSelector(`${ROW} [data-dua-bookmark]`, { timeout: 15000 }).catch(() => {});
  await F.click(`${ROW} [data-dua-bookmark]`);
  await F.waitForTimeout(600);
  const bad = await F.evaluate((sel) => ({ msg: document.querySelector(`${sel} [role="status"]`)?.textContent ?? "", mark: document.querySelector(`${sel} [data-dua-bookmark]`)?.textContent }), ROW);
  check(`${tag} I15: a failed bookmark says "${bn ? "সংরক্ষিত হয়নি" : "Not saved"}" and keeps ${bn ? "🔖 এটি বুকমার্ক করুন" : "🔖 Bookmark this"}`, bad.msg.startsWith(bn ? "সংরক্ষিত হয়নি" : "Not saved") && /permission-denied/.test(bad.msg) && bad.mark === (bn ? "🔖 এটি বুকমার্ক করুন" : "🔖 Bookmark this"), JSON.stringify(bad));
  await ctx3.close();
}
await browser.close();
console.log(`\n==== Notes and bookmarks on a dua: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
