// QR Lead (audit part 47, via the MSA Architect, 23 Oct 2026): after a language switch made IN PLACE on quranrevival.html,
//   - an open Āyah card kept its old language (labels, ladder rungs, Approach titles, the reference);
//   - an open Notes pane kept the label it was handed ("Notes on ২:২৫৫").
// applyAppLangChange() now redraws the Āyah card and hands the pane its unit again through read-note-pane.js's
// relabelReadNotePane() (shared; the MSA Architect adds it). Until it is on main this check stands in a one-line
// relabelReadNotePane that records what it was given, so it proves THIS side: the call, with the label in the new language.
// At 1280 and 390, bn -> en and en -> bn, it fails unless:
//   - the Āyah card's own words (outside its Arabic and the āyah's Bangla translation) changed, into the new language;
//   - the pane was handed the same unit with a label in the new language's digits.
//   node tools/i18n-verify/qr-lang-switch-cards-browser.mjs [--mutate=no-card|no-pane]     (serve.js on :8080, or QR_BASE)
//   --mutate=no-card   the Āyah card is not redrawn   -> the card checks FAIL
//   --mutate=no-pane   the pane is not told           -> the pane checks FAIL
//   --mutate=no-relabel-lists   Related āyāt keeps its old labels (surah names, digits) -> the bn→en card checks FAIL
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-card": ["      if (ayahSheetUnitKey) {\n        renderAyahActionSheetNow();", "      if (false) {\n        renderAyahActionSheetNow();"],
  "no-relabel-lists": ["if (ayahSheetRelated && !ayahSheetRelated.error) ensureAyahSheetRelatedLoaded(ayahSheetUnitKey, rs, ra);", ""],
  "no-pane": ["if (u) readNotePaneMod.relabelReadNotePane?.(u); }", "}"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const BN = /[ঀ-৿]/;
// The card's own words: its Arabic and the āyah's translations are content, not the app's words.
const cardWords = () => {
  const sheet = document.querySelector("#ayahActionSheetMount [data-ayah-sheet]");
  if (!sheet) return null;
  const c = sheet.cloneNode(true);
  c.querySelectorAll("[lang], [dir=rtl], .ayah-bn, .ayah-en, .ayah-translation, [data-i18n-skip]").forEach((e) => e.remove());
  return c.innerText.replace(/\s+/g, " ").trim();
};

for (const [w, h] of [[1280, 900], [390, 844]]) for (const [from, to] of [["bn", "en"], ["en", "bn"]]) {
  const tag = `[${from}→${to} ${w}]`;
  const ctx = await newContext(browser, { appLang: from, viewport: { width: w, height: h } });
  await ctx.route("**/app/js/read-note-pane.js*", async (r) => {
    const res = await r.fetch(); let body = await res.text();
    if (!/export function relabelReadNotePane\b/.test(body)) body += "\nexport function relabelReadNotePane(u) { (window.__relabel = window.__relabel || []).push(u); }\n";
    else body = body.replace(/export function relabelReadNotePane\(u\) \{/, "export function relabelReadNotePane(u) { (window.__relabel = window.__relabel || []).push(u);");
    r.fulfill({ response: res, body });
  });
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const body = await res.text();
      if (body.split(a).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
      r.fulfill({ response: res, body: body.replace(a, b) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(1500);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(800);
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const s = document.getElementById("ayahSelect"); s.value = "255"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1200);
  // The Notes pane on 2:255, then the Āyah card over it.
  await page.evaluate(() => document.getElementById("readNotesBtn")?.click());
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="2:255"]')?.click());
  await page.waitForFunction(() => !!document.querySelector("#ayahActionSheetMount [data-ayah-sheet]"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
  const before = await page.evaluate(cardWords);
  const inLang = (x, l) => (l === "bn" ? BN.test(x) : !BN.test(x) && /[A-Za-z]/.test(x));
  check(`${tag} POSITIVE CONTROL: the Āyah card is open, its words in ${from} ("${(before ?? "").slice(0, 50)}…")`, !!before && inLang(before, from), String(before).slice(0, 200));
  const paneOpen = await page.evaluate(() => !!document.querySelector("#readNotePane:not([hidden]), [data-read-note-pane]:not([hidden])") || document.getElementById("readNotesBtn")?.getAttribute("aria-expanded") === "true");
  check(`${tag} POSITIVE CONTROL: the Notes pane is open on 2:255`, paneOpen);
  // The switch, made in place without touching the page (a tap on Home could close the card).
  await page.evaluate((l) => { const s = document.getElementById("navAppLangSelect"); s.value = l; s.dispatchEvent(new Event("change", { bubbles: true })); }, to);
  await page.waitForFunction((l) => document.documentElement.lang === l, to, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const after = await page.evaluate(cardWords);
  check(`${tag} the Āyah card is still open and its words are now in ${to} ("${(after ?? "").slice(0, 60)}…")`, !!after && after !== before && inLang(after, to), String(after).slice(0, 240));
  const relabel = await page.evaluate(() => window.__relabel ?? []);
  const last = relabel[relabel.length - 1];
  check(`${tag} the Notes pane was handed 2:255 again with a ${to} label ("${last?.label ?? "-"}")`, !!last && /2:255/.test(last.unitKey) && (to === "bn" ? /২/.test(last.label) : /2:255|2\s*:\s*255/.test(last.label) && !BN.test(last.label)), JSON.stringify(relabel));
  await ctx.close();
}
await browser.close();
console.log(`\n==== QR language switch: the open Āyah card and Notes pane${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
