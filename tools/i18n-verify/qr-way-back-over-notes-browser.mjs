// QR Lead, audit part 155 defect 1 (MSA #1421, 2 Nov 2026): arriving in Quran Study's Read view from a Hadith or Dua link
// (quranrevival.html?goto=S:A&back=1&backTo=hadith|dua) opens the Notes pane (#readNotePane, z-index 960) over the floating
// way back (#ayahCardBackPill, 955). Now, while the pane is open and the way back floats, the way back sits above it, and is
// back at 955 once the pane closes. Opening the Āyah card hides the way back (measured), so it never lies over the card.
//   node tools/i18n-verify/qr-way-back-over-notes-browser.mjs [--mutate=NAME]   (serve.js on :8080 or QR_BASE, repo root)
//   no-raise  the rule is gone                      -> "the way back can be tapped over the Notes pane" FAILS
//   always    the way back is raised even with the pane closed -> "back at its own layer" FAILS
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const RULE = "  body:has(#readNotePane:not([hidden])) #ayahCardBackPill:not(.back-docked) { z-index: 961; }";
const MUT = {
  "no-raise": [RULE, ""],
  always: [RULE, "  #ayahCardBackPill:not(.back-docked) { z-index: 961; }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const probe = (page) => page.evaluate(() => {
  const pill = document.getElementById("ayahCardBackPill"), pane = document.getElementById("readNotePane");
  const btn = pill?.querySelector("[data-ayah-card-back]"), b = btn?.getBoundingClientRect();
  const shown = (e) => !!e && !e.hidden && e.getClientRects().length > 0 && e.getBoundingClientRect().width > 0;
  const at = b && b.width ? document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) : null;
  const under = b ? [...document.querySelectorAll("#readNotePane button, #readNotePane input, #readNotePane textarea, #readNotePane select, #readNotePane [contenteditable]")]
    .filter((x) => { const q = x.getBoundingClientRect(); return shown(x) && q.left < b.right && q.right > b.left && q.top < b.bottom && q.bottom > b.top; }).map((x) => x.className.toString().slice(0, 30) || x.tagName) : [];
  const ov = document.getElementById("ayahActionSheetOverlay");
  return { pill: shown(pill), docked: !!pill?.classList.contains("back-docked"), z: pill ? getComputedStyle(pill).zIndex : null, pane: shown(pane),
    paneOver: shown(pane) && !!b && (() => { const p = pane.getBoundingClientRect(); return p.left < b.right && p.right > b.left && p.top < b.bottom && p.bottom > b.top; })(),
    onPill: !!at && !!pill?.contains(at), at: at ? (at.id || at.className.toString().slice(0, 30)) : null, under, card: !!ov?.classList.contains("open") };
});

for (const [w, h] of [[390, 844], [1024, 768], [320, 640]]) for (const lang of ["en", "bn"]) for (const backTo of ["hadith", "dua"]) {
  const tag = `[${lang} ${w}x${h} from ${backTo}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) await ctx.route("**/app/quranrevival.html*", async (r) => {
    const src = fs.readFileSync("app/quranrevival.html", "utf8"); const [a, b] = MUT[MUTATE];
    if (src.split(a).length !== 2) throw new Error(`mutation anchor not found exactly once: ${MUTATE}`);
    await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
  });
  const { page, errors } = await openPage(ctx, `/app/quranrevival.html?goto=36:38&back=1&backTo=${backTo}`);
  await page.waitForFunction(() => { const p = document.getElementById("ayahCardBackPill"); return p && !p.hidden; }, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  let m = await probe(page);
  check(`${tag} POSITIVE CONTROL the way back floats and the Notes pane lies over its place`, m.pill && !m.docked && m.pane && m.paneOver, JSON.stringify(m));
  check(`${tag} the way back can be tapped over the Notes pane`, m.onPill, JSON.stringify(m));
  check(`${tag} the way back covers none of the pane's controls`, m.under.length === 0, JSON.stringify(m.under));
  // An Āyah card opened now (its number badge, under the pane) keeps its place over the way back.
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="36:38"], [data-ayah-num-badge]')?.click());
  await page.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  m = await probe(page);
  // Updated in place, Architect v13.22: a way back to another page now OUTLIVES the Āyah card (qr-page-way-back-survives-card,
  // decision 86), so the pill may still exist; what must hold is that it lies UNDER the card (below its 960), never over it.
  check(`${tag} the Āyah card opens over the pane, and nothing of the way back shows over it`, m.card && !m.onPill && (!m.pill || Number(m.z) < 960), JSON.stringify(m));
  await page.evaluate(() => document.querySelector("#ayahActionSheetMount [data-ayah-sheet-close]")?.click()); await page.waitForTimeout(400);
  // Closing the pane: the raised layer goes with it.
  await page.evaluate(() => document.querySelector("#readNotePane [data-rnp-close], #readNotePane .rnp-close, #readNotePane [aria-label='Close']")?.click());
  await page.waitForTimeout(600);
  m = await probe(page);
  if (!m.pane) check(`${tag} with the pane closed the way back is back at its own layer`, m.z === "955" || m.docked, JSON.stringify(m));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== the way back over the Read view's Notes pane (QR Lead, audit 155 d1)${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
