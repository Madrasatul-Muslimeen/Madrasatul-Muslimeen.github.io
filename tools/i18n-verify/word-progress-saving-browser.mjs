// The Owner, 5 Oct 2026: "It takes hours to marked achieved from not started.
// Fix." and then "That save was blocked by a permissions rule ... update the
// whole-Qur'an word total for this lemma · permission-denied".
//
// One Achieved press is ~14 database round trips in a row. Nothing showed until
// the last, so the button was pressed again; two presses at once both CREATED
// the lemma counter / the totals document, and the second create was refused
// by the Rules as an overwrite (reproduced in the emulator). Now a press shows
// AT ONCE (pressed state, "Saving…", buttons locked) and a second press while
// one is saving starts nothing.
//
// Measured with the stub's own latency (300ms a call), en/bn, phone and PC.
// Mutations: --mutate-no-lock (a second press runs again: the write counts
// fail) and --mutate-no-instant (nothing shows until the end: the
// "at once" checks fail). Run from the repository root with serve.js.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const NO_LOCK = process.argv.includes("--mutate-no-lock");
const NO_INSTANT = process.argv.includes("--mutate-no-instant");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

function mutatedPage() {
  let src = fs.readFileSync("app/quranrevival.html", "utf8");
  const swap = (a, b) => { if (src.split(a).length !== 2) { console.log(`mutation did not apply: ${a.slice(0, 50)}`); process.exit(2); } src = src.replace(a, b); };
  if (NO_LOCK) swap("      if (wordProgressSaving) return;\n", "");
  if (NO_INSTANT) swap("      wordProgressSaving = { occurrenceId: quranWordCardState.occurrenceId, level, state: action.kind === \"state\" ? action.state : null };\n      renderPersistentWordCard();\n", "      wordProgressSaving = { occurrenceId: quranWordCardState.occurrenceId, level, state: action.kind === \"state\" ? action.state : null };\n");
  return src;
}

const B = '#quranWordCardMount [data-word-progress-state="achieved"]';
for (const lang of ["en", "bn"]) {
  for (const [w, h] of [[390, 844], [1100, 900]]) {
    const tag = `${lang} ${w}px`;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width: w, height: h }, latencyMs: 300 });
    if (NO_LOCK || NO_INSTANT) { const body = mutatedPage(); await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body })); }
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    const reach = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
    if (!reach) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
    await page.click("#tabReadBtn");
    await page.evaluate(() => {
      const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); }
      const a = document.getElementById("ayahSelect"); if (a && a.value !== "2") { a.value = "2"; a.dispatchEvent(new Event("change", { bubbles: true })); }
    });
    await page.waitForFunction(() => !!document.querySelector('[data-word-occurrence$=":1:2:2"]'), null, { timeout: 20000 });
    await page.evaluate(() => document.querySelector('[data-word-occurrence$=":1:2:2"]').click());
    await page.waitForFunction((b) => { const x = document.querySelector(b); return !!x && !x.disabled; }, B, { timeout: 30000 });
    await page.waitForTimeout(2500);
    check(`${tag}: POSITIVE CONTROL -- the word starts not achieved`, await page.evaluate((b) => document.querySelector(b).getAttribute("aria-pressed") === "false", B));
    const writesBefore = await page.evaluate(() => (window.__stubWriteData || []).length);
    // The press, then at once two more (Achieved again, and Learning) -- what
    // a reader does when a button seems dead.
    const at = await page.evaluate((b) => {
      document.querySelector(b).click();
      const card = document.getElementById("quranWordCardMount");
      const now = {
        pressed: document.querySelector(b)?.getAttribute("aria-pressed"),
        saving: card.querySelector("[data-word-progress-saving]")?.textContent.trim() || "",
        locked: [...card.querySelectorAll("[data-word-progress-state]")].every((x) => x.disabled),
      };
      // The buttons are disabled now, so a plain click would prove only the
      // disabled attribute. Lift it first (a stale render, a keyboard path),
      // so what refuses these presses is the save lock itself.
      for (const x of card.querySelectorAll("[data-word-progress-state]")) x.disabled = false;
      document.querySelector(b)?.click();
      card.querySelector('[data-word-progress-state="learning"]')?.click();
      return now;
    }, B);
    check(`${tag}: AT ONCE the pressed button shows Achieved (it used to wait ~14 round trips)`, at.pressed === "true", JSON.stringify(at));
    check(`${tag}: ...with "Saving…" in ${lang === "bn" ? "Bangla" : "English"}`, lang === "bn" ? /সংরক্ষণ/.test(at.saving) : at.saving === "Saving…", JSON.stringify(at));
    check(`${tag}: ...and every progress button locked while it saves`, at.locked, JSON.stringify(at));
    await page.waitForFunction(() => !document.querySelector("#quranWordCardMount [data-word-progress-saving]"), null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const writes = await page.evaluate((n) => (window.__stubWriteData || []).slice(n).map((x) => x.col), writesBefore);
    const count = (c) => writes.filter((x) => x === c).length;
    check(`${tag}: the extra presses started nothing: ONE word-progress write`, count("quranWordProgress") === 1, JSON.stringify(writes));
    check(`${tag}: ...ONE lemma claim and ONE lemma counter seed (the collision the Rules refused)`, count("quranLemmaProgress") === 1 && count("quranLemmaOccurrenceCounters") === 1, JSON.stringify(writes));
    const after = await page.evaluate((b) => ({
      pressed: document.querySelector(b)?.getAttribute("aria-pressed"),
      saving: !!document.querySelector("#quranWordCardMount [data-word-progress-saving]"),
      unlocked: [...document.querySelectorAll("#quranWordCardMount [data-word-progress-state]")].every((x) => !x.disabled),
    }), B);
    check(`${tag}: when it is saved: still Achieved, "Saving…" gone, buttons unlocked`, after.pressed === "true" && !after.saving && after.unlocked, JSON.stringify(after));
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
