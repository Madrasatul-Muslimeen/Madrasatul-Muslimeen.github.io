// PCF MSA J73 (the Owner, 22 Oct 2026, a computer screenshot of Learn next with First 2,020 open: "Learn, Practice or
// Step test buttons do not do anything, no response. Check n Fix." and "Vocabulary opens to this wide screen, make it
// open popup as the same standard size."). The cause: the three buttons awaited the review schedule's read, and a read
// that hangs (neither answers nor fails) left them silent for ever; Learn next's top line, which says what the schedule
// holds, was empty for the same reason. The stub's window.__stubHangCols makes that one read hang.
// (1) With the read hanging, each button opens its screen within 2 s, for First 10 and First 2,020.
// (2) Learn next says it is loading the schedule, and after the wait says in words that it could not be loaded (I15).
// (3) Without a hang, the schedule's line is there as before.
// (4) On a computer Learn next and the Vocabulary screen are pop-ups at the home size (J72); on a phone full screen.
// Run from the repository root, serve.js on :8080 (QR_BASE for another port).
//   --mutate=await   openVocabulary() awaits the schedule again -> (1) fails
//   --mutate=nowait  the time limit removed (the read awaited for ever) -> (2) fails
//   --mutate=nohome  Learn next not placed at the home size -> (4) fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  await: ["ensureVocabReview().catch(() => {}); // J73: never waited on here", "await ensureVocabReview(); // J73: never waited on here"],
  nowait: ["new Promise((res) => setTimeout(() => res(\"slow\"), VOCAB_REVIEW_WAIT_MS))", "new Promise(() => {})"],
  nohome: ["el.classList.toggle(\"at-home\", placeAtHome(el));", "void 0;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function open({ width, height, lang, hang }) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height }, extraSeedJs: hang ? 'window.__stubHangCols = ["quranVocabReview"];' : null });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => { const src = fs.readFileSync("app/quranrevival.html", "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await P.waitForTimeout(800);
  await P.evaluate(() => document.getElementById("tabVocabularyBtn").click());
  await P.waitForFunction(() => document.querySelector("#learnNextSheet [data-ln-tile]"), null, { timeout: 30000 });
  return { ctx, P, errors };
}
const rect = (P, sel) => P.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? [r.x, r.y, r.width, r.height].map(Math.round) : null; }, sel);

for (const lang of ["en", "bn"]) for (const [width, height] of [[1440, 900], [390, 844]]) {
  const tag = `[${lang} ${width}]`;
  let ctx, P, errors;
  // a fresh page per step: a screen a slow button opens late must never be taken for the next button's
  for (const step of ["10", "2020"]) {
    if (ctx) await ctx.close();
    ({ ctx, P, errors } = await open({ width, height, lang, hang: true }));
    if (step === "10") {
      const loading = await P.evaluate(() => !!document.querySelector("#learnNextSheet [data-ln-review-loading]"));
      check(`${tag} with the schedule's read hanging, Learn next says it is loading it`, loading);
    }
    await P.evaluate((n) => { const t = document.querySelector(`#learnNextSheet [data-ln-tile="${n}"]`); if (t.getAttribute("aria-pressed") !== "true") t.click(); }, step);
    await P.waitForTimeout(300);
    for (const what of ["learn", "practise", "test"]) {
      const label = await P.evaluate((w) => { const b = document.querySelector(`#learnNextSheet [data-ln-vocab="${w}"]`); b?.click(); return b?.textContent.trim() ?? ""; }, what);
      // its OWN screen: the title is the button's word (a screen left open by an earlier, late button is not it)
      const opened = await P.waitForFunction((l) => { const v = document.getElementById("vocabSheet"); return v && !v.hidden && v.getBoundingClientRect().width > 0 && v.querySelector(".vo-title")?.textContent.trim() === l; }, label, { timeout: 2000 }).then(() => true, () => false);
      check(`${tag} First ${step}: ${what} opens its screen at once (within 2 s) although the schedule's read hangs`, opened);
      if (what === "learn" && step === "10" && width >= 900) {
        const home = JSON.parse(await P.evaluate(() => localStorage.getItem("mmsa-home-window-v1")) || "null");
        const v = await rect(P, "#vocabSheet");
        check(`${tag} the Vocabulary screen is a pop-up at the home size ${JSON.stringify(home)}`, !!home && v && v[0] === home.x && v[1] === home.y && v[2] === home.w && v[3] === home.h, JSON.stringify(v));
      }
      if (what === "learn" && step === "10" && width < 900) {
        const v = await rect(P, "#vocabSheet");
        check(`${tag} on a phone the Vocabulary screen fills the screen`, v && v[0] === 0 && v[1] === 0 && v[2] === width && v[3] === height, JSON.stringify(v));
      }
      for (let i = 0; i < 3; i++) { // the screen's own ← Back (a round's goes to the menu first, the menu's closes)
        if (!(await P.evaluate(() => { const v = document.getElementById("vocabSheet"); if (!v || v.hidden) return false; v.querySelector(".vo-back")?.click(); return true; }))) break;
        await P.waitForTimeout(250);
      }
    }
  }
  // (4) Learn next itself
  const home = JSON.parse(await P.evaluate(() => localStorage.getItem("mmsa-home-window-v1")) || "null");
  const ln = await rect(P, "#learnNextSheet");
  if (width >= 900) check(`${tag} Learn next is a pop-up at the home size ${JSON.stringify(home)}`, !!home && ln && ln[0] === home.x && ln[1] === home.y && ln[2] === home.w && ln[3] === home.h, JSON.stringify(ln));
  else check(`${tag} on a phone Learn next fills the screen`, ln && ln[0] === 0 && ln[1] === 0 && ln[2] === width && ln[3] === height, JSON.stringify(ln));
  const back = await P.evaluate(() => { const b = document.querySelector("#learnNextSheet [data-ln-back]"); const r = b?.getBoundingClientRect(); return r ? { w: r.width, h: r.height, text: b.textContent } : null; });
  check(`${tag} Learn next keeps its ← Back (40px)`, back && back.h >= 40 && /←/.test(back.text), JSON.stringify(back));
  // (2) after the wait, the words say it could not be loaded
  const said = await P.waitForFunction(() => document.querySelector("#learnNextSheet .ln-review-err"), null, { timeout: 12000 }).then(() => true, () => false);
  check(`${tag} after the wait Learn next says in words that the schedule could not be loaded (I15)`, said);
  check(`${tag} no page errors`, errors.length === 0, errors.join(" | "));
  await ctx.close();
}
// (3) the ordinary case
{
  const { ctx, P } = await open({ width: 1440, height: 900, lang: "en", hang: false });
  const line = await P.waitForFunction(() => { const m = document.querySelector("#learnNextSheet .ln-review-msg"); return m && !m.matches("[data-ln-review-loading], .ln-review-err") ? m.textContent : null; }, null, { timeout: 8000 }).then((h) => h.jsonValue(), () => null);
  check("[en 1440] without a hang, the schedule's line is shown as before", !!line, String(line));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Vocabulary buttons open at once; Learn next and Vocabulary at the home size (J73): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
