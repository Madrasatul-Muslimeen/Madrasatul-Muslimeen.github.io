// 9 Oct 2026, the way-back law (decision 86): a HadeethEnc hadith card's 📝 My Notes opens notes.html with back=1, and
// ← Back there lands on THAT hadith again, on both hadith pages. The page's address is set to ?resume=hadith:hadeethenc:<id>
// before leaving (the same value a bookmark reopens), and hadith-collections.html now reads it as hadith-study.html does.
// Expected values written BY HAND: hadith 4563 is a direct hadith of root category 3.
// Run from the repository root, serve.js on :8080.
//   --mutate=noback     the Note link loses back=1             -> the Back checks fail
//   --mutate=noremember the hadith is not remembered on leaving -> the "lands on 4563" checks fail
//   --mutate=noscroll   the reopened card is not brought on screen -> a "lands on 4563" check fails
//   --mutate=noresume   hadith-collections.html ignores resume  -> the collections "lands on 4563" check fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  noback: ["js/hadith-study-actions.js", '  params.set("back", "1"); // ← Back', "  // ← Back"],
  noremember: ["js/hadith-browser.js", 'u.searchParams.set("resume", `hadith:hadeethenc:${id}`); history.replaceState', "void "],
  noscroll: ["js/hadith-browser.js", 'state.hc.scrollToCard = false; card.scrollIntoView({ block: "start" });', "state.hc.scrollToCard = false;"],
  noresume: ["hadith-collections.html", 'const initialHadeethEncId = resumeHc ? resumeHc[1] : null;', "const initialHadeethEncId = null;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const [pagePath, lang, width] of [["/app/hadith-collections.html", "en", 390], ["/app/hadith-collections.html", "bn", 1280], ["/app/hadith-study.html", "en", 390]]) {
  const tag = `[${pagePath.slice(5)} ${lang} ${width}]`;
  const bn = lang === "bn";
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 860 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing in ${file}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page: P, errors } = await openPage(ctx, pagePath);
  await P.click('[data-hadith-tab="collections"]').catch(() => {});
  await P.waitForSelector('[data-hadeethenc-category="3"]', { timeout: 20000 });
  await P.click('[data-hadeethenc-category="3"]');
  await P.waitForSelector('[data-hadeethenc-hadith="4563"]', { timeout: 15000 });
  await P.click('[data-hadeethenc-hadith="4563"]');
  await P.waitForSelector('[data-hadeethenc-note-link="4563"][aria-disabled="false"]', { timeout: 15000 }).catch(() => {});
  const href = await P.evaluate(() => document.querySelector('[data-hadeethenc-note-link="4563"]')?.getAttribute("href") ?? "");
  const q = new URLSearchParams(href.split("?")[1] ?? "");
  check(`${tag} 📝 My Notes opens notes.html for hadith:hadeethenc:4563 with back=1`, href.startsWith("notes.html?") && q.get("unit") === "hadith:hadeethenc:4563" && q.get("back") === "1", href);
  // UPDATED IN PLACE (J108, v13.01, the Owner: "Q2:A. Q3. Build it."): a plain press on 📝 now opens a NEW Note with this
  // hadith inside it in the shared Note opener, over this page -- the page is never left, so closing it IS the way back.
  // The link's address (notes.html, this hadith's Notes, back=1) is kept for a modified click and for "open"; its own
  // way back is still checked below by following that address.
  const url0 = P.url();
  await P.click('[data-hadeethenc-note-link="4563"]');
  const fEl = await P.waitForSelector("#noteOpener:not([hidden]) iframe", { timeout: 10000 }).catch(() => null);
  let F = null;
  for (let i = 0; i < 100 && fEl && !F; i++) { const f = await fEl.contentFrame(); if (f && /new=1/.test(f.url())) F = f; else await P.waitForTimeout(100); }
  await F?.waitForSelector("[data-edit-body] .mm-ref", { timeout: 20000 }).catch(() => {});
  const nn = F ? await F.evaluate(() => ({ id: JSON.parse(document.querySelector("[data-edit-body] .mm-ref")?.getAttribute("data-mmsa-ref") || "{}").id, title: document.querySelector("[data-edit-title]")?.value })) : null;
  check(`${tag} 📝 opens a NEW Note with hadith 4563 inside it, over the page (the address unchanged but for ?resume)`, nn?.id === "hadith:hadeethenc:4563" && /:$/.test(nn?.title || "") && P.url().split("?")[0] === url0.split("?")[0], JSON.stringify(nn));
  await F?.click('[data-nn-tool="back"]').catch(() => {});
  await P.waitForFunction(() => document.getElementById("noteOpener")?.hidden, null, { timeout: 8000 }).catch(() => {});
  const closed = await P.evaluate(() => { const c = document.querySelector('[data-hadeethenc-card="4563"]')?.getBoundingClientRect(); return { hidden: document.getElementById("noteOpener")?.hidden, onScreen: !!c && c.bottom > 0 && c.top < innerHeight }; });
  check(`${tag} ← Back closes the Note; hadith 4563's card is still on screen`, closed.hidden && closed.onScreen, JSON.stringify(closed));
  let went = true;
  await P.goto(new URL(href, P.url()).href, { waitUntil: "load" }).catch(() => { went = false; });
  const back = went ? await P.waitForSelector("#notesBackBtn:not([hidden])", { timeout: 10000 }).then(() => P.evaluate(() => ({ text: document.getElementById("notesBackBtn").textContent, h: document.getElementById("notesBackBtn").getBoundingClientRect().height }))).catch(() => null) : null;
  check(`${tag} the Notes page shows ${bn ? "← পেছনে" : "← Back"}, 40px tall`, back?.text === (bn ? "← পেছনে" : "← Back") && back.h >= 40, JSON.stringify(back));
  if (back) {
    await Promise.all([P.waitForURL(new RegExp(pagePath.replace(/[.]/g, "\\.")), { timeout: 15000 }), P.click("#notesBackBtn")]).catch(() => {});
    await P.waitForSelector('[data-hadeethenc-card="4563"]', { timeout: 15000 }).catch(() => {});
    await P.waitForTimeout(1500);
    const there = await P.evaluate(() => { const c = document.querySelector('[data-hadeethenc-card="4563"]')?.getBoundingClientRect(); return { url: location.search, card: !!c, onScreen: !!c && c.bottom > 0 && c.top < innerHeight }; });
    check(`${tag} ← Back lands on hadith 4563's card again, on screen`, /resume=hadith%3Ahadeethenc%3A4563|resume=hadith:hadeethenc:4563/.test(there.url) && there.card && there.onScreen, JSON.stringify(there));
  }
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== HadeethEnc Notes, the way back: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
