// Decision 96, "Check a dua": the review screen on the Dua card (the Owner: "Dua. yes to all.").
// Expected values are written BY HAND from the data: Dua 2 (Sayyid al-Istighfar) has 23 narrations; its five lowest
// fits (fit-1.json: 0.08, 0.12 x4, all "low") are Tirmidhi 3434, Abu Dawud 1516, al-Nasa'i's 'Amal al-Yawm 458 and
// Ibn al-Sunni 370 and 448. Its first picked word is «اللهم».
// Run from the repository root with serve.js on :8080.
//   --mutate=nofitorder  ignore the fit order           -> the order check fails
//   --mutate=wholedoc    write the whole document       -> the one-field-path check fails
//   --mutate=noback      drop the Back button           -> the Back checks fail
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nofitorder: ["js/dua-check.js", "return idx.sort((a, b) => share(a) - share(b) || a - b);", "return idx;"],
  wholedoc: ["js/dua-check-data.js", "{ [`duaChecks.${n}`]: stored }", "{ tenantId: session.tenantId, duaChecks: { [n]: stored } }"],
  noback: ["js/dua-check.js", "  panel.appendChild(back);\n", "\n"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SEED = `DATA.ayahCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, collections: [] }];`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function context(lang, width) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing in ${file}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  return ctx;
}
const latin = (s) => String(s).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
const CARD = '[data-dua-card="2"]';
async function openDua2(P) {
  await P.click('[data-hadith-tab="dua"]');
  await P.waitForSelector(`${CARD} [data-dua-word="0"]`);
  await P.waitForSelector(`${CARD} [data-dua-check-status]`);
}

for (const [lang, width] of [["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await context(lang, width);
  const { page: P } = await openPage(ctx, "/app/hadith-collections.html");
  await openDua2(P);

  // --- a non-admin preview: the status still shows, the button does not
  await P.evaluate(() => { const c = JSON.parse(localStorage.getItem("qr.sessionContext") || "null"); if (c) { c.viewAsRole = "student"; localStorage.setItem("qr.sessionContext", JSON.stringify(c)); } });
  const preview = await P.evaluate(() => JSON.parse(localStorage.getItem("qr.sessionContext") || "null")?.viewAsRole);
  check(`${tag} the student preview is really on (positive control)`, preview === "student", String(preview));
  await P.reload();
  await openDua2(P);
  const np = await P.evaluate((c) => ({ btn: document.querySelectorAll("[data-dua-check-open]").length, chip: document.querySelector(`${c} [data-dua-check-status]`)?.dataset.duaCheckStatus }), CARD);
  check(`${tag} a non-admin preview has NO Check button, and the card's status chip still shows`, np.btn === 0 && np.chip === "none", JSON.stringify(np));
  await P.evaluate(() => { const c = JSON.parse(localStorage.getItem("qr.sessionContext")); c.viewAsRole = null; localStorage.setItem("qr.sessionContext", JSON.stringify(c)); });
  await P.reload();
  await openDua2(P);

  // --- the owner: button, panel, order
  const before = await P.evaluate((c) => ({ n: document.querySelector(`${c} [data-dua-narrated-count]`).dataset.duaNarratedCount, chip: document.querySelector(`${c} [data-dua-check-status]`).dataset.duaCheckStatus,
    words: [...document.querySelectorAll(`${c} [data-dua-word]`)].map((w) => w.textContent) }), CARD);
  check(`${tag} Dua 2 is narrated in 23 places and starts unchecked`, before.n === "23" && before.chip === "none", JSON.stringify([before.n, before.chip]));
  await P.click(`${CARD} [data-dua-check-open]`);
  await P.waitForSelector('[data-dua-check-panel="2"] [data-dua-check-member]');
  const order = await P.evaluate(() => [...document.querySelectorAll("[data-dua-check-member]")].map((m) => ({ src: m.querySelector(".dua-check-src").textContent, diff: !!m.querySelector("[data-dua-check-diff]") })));
  const first5 = order.slice(0, 5);
  check(`${tag} 23 members listed`, order.length === 23, String(order.length));
  check(`${tag} the first five are Tirmidhi 3434, Abu Dawud 1516, 'Amal al-Yawm 458, Ibn al-Sunni 370 and 448, each with ⚠`,
    ["3434", "1516", "458", "370", "448"].every((s) => first5.some((m) => latin(m.src).includes(s))) && first5.every((m) => m.diff), JSON.stringify(first5));
  // Architect review (PR #717): a narration is named by its STANDARD number, as on the card (Bukhari 6306, not the
  // edition's own 5947), in the reader's digits.
  const bukhari = order.filter((m) => /Bukhari|বুখারী/.test(m.src)).map((m) => latin(m.src));
  check(`${tag} Bukhari's two narrations are named 6306 and 6323, as on the card (never the edition's 5947)`, bukhari.some((s) => s.includes("6306")) && bukhari.some((s) => s.includes("6323")) && !bukhari.some((s) => s.includes("5947")), JSON.stringify(bukhari));
  if (lang === "bn") check(`${tag} ...in Bengali digits`, order.every((m) => !/[0-9]/.test(m.src)), JSON.stringify(order.slice(0, 3)));
  // Architect review (PR #717): a link matched without a leading «و» is not "spelt differently" (وَوَعْدِكَ -> وَعْدَكَ),
  // while a real difference still is: checked on the module's own function with hand-written words.
  const doubts = await P.evaluate(async () => { const m = await import("/app/js/dua-check.js"); return [m.wordDoubt("وَوَعْدِكَ", [0, 0, "وَعْدَكَ"], null), m.wordDoubt("وَأَنَا", [0, 0, "وَإِنَّآ"], null)]; });
  check(`${tag} «و» alone is not a spelling doubt; أنا against إنا still is`, doubts[0] === null && doubts[1] === "spelling", JSON.stringify(doubts));
  const bigBack = await P.evaluate(() => !!document.querySelector("[data-dua-check-back]"));
  check(`${tag} the panel has ← Back to Dua 2 (way-back law)`, bigBack);

  // --- layout
  await P.waitForFunction(() => !document.querySelector(".dua-check-member .hadith-note"), null, { timeout: 30000 }).catch(() => {});
  const lay = async () => P.evaluate(() => ({ over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    small: [...document.querySelectorAll("[data-dua-check-panel] button")].filter((b) => b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().height < 39.5).map((b) => b.textContent) }));
  let l = await lay();
  check(`${tag} step 1: no sideways scroll, every button at least 40px tall`, l.over <= 0 && l.small.length === 0, JSON.stringify(l));

  // --- decisions: cut the weakest, everything else same
  await P.click('[data-dua-check-member] [data-v="cut"]');
  await P.click("[data-dua-check-rest-same]");
  const split = await P.evaluate(() => !!document.querySelector("[data-dua-check-split]") && !!document.querySelector("[data-dua-check-together]") && !!document.querySelector("[data-dua-check-apart]"));
  check(`${tag} a cut shows the split box with together / on its own`, split);
  const anchorCut = await P.evaluate(() => [...document.querySelectorAll("[data-dua-check-member]")].filter((m) => m.querySelector('[data-v="cut"]') === null).length);
  check(`${tag} exactly one member has no "different dua" button (the anchor)`, anchorCut === 1, String(anchorCut));
  await P.click('[data-dua-check-step="2"]');
  await P.click("[data-dua-check-rest-ok]");
  const doubt = await P.evaluate(() => [...document.querySelectorAll("[data-dua-check-word]")].map((w) => !!w.querySelector("[data-dua-check-doubt]")));
  const firstClean = doubt.indexOf(false);
  check(`${tag} doubtful words come first (none after the first clean one)`, doubt.some(Boolean) && (firstClean === -1 || !doubt.slice(firstClean).some(Boolean)), JSON.stringify(doubt));
  l = await lay();
  check(`${tag} step 2: no sideways scroll, every button at least 40px tall`, l.over <= 0 && l.small.length === 0, JSON.stringify(l));
  await P.click('[data-dua-check-word="0"] [data-v="fix"]');
  await P.fill('[data-dua-check-fix="0"]', "اللّٰهُمَّ");
  await P.click('[data-dua-check-step="3"]');
  const sv = await P.evaluate(() => document.querySelector("[data-dua-check-save]")?.dataset.duaCheckSave);
  check(`${tag} everything decided: the button says Save my check (done)`, sv === "done", String(sv));
  l = await lay();
  check(`${tag} step 3: no sideways scroll, every button at least 40px tall`, l.over <= 0 && l.small.length === 0, JSON.stringify(l));

  // --- save: one field path
  await P.evaluate(() => { window.__stubWriteData = []; });
  await P.click("[data-dua-check-save]");
  await P.waitForSelector(`${CARD} [data-dua-check-status="done"]`, { timeout: 10000 }).catch(() => {});
  const w = await P.evaluate(() => (window.__stubWriteData || []).filter((x) => x.col === "ayahCollections"));
  const keys = w.length === 1 ? Object.keys(w[0].data).filter((k) => k !== "updatedAt") : null;
  check(`${tag} saving writes exactly one write, one field path: duaChecks.2`, w.length === 1 && w[0].kind === "update" && JSON.stringify(keys) === '["duaChecks.2"]', JSON.stringify(w.map((x) => [x.kind, Object.keys(x.data)])));
  const st = w[0]?.data?.["duaChecks.2"];
  check(`${tag} the stored check is compact: done, one cut, one word fix, who and when`, st?.done === true && st.cut?.length === 1 && st.fix?.["0"] === "اللّٰهُمَّ" && st.by === "p1" && st.byName && st.at && st.schemaVersion === 1 && !("same" in st), JSON.stringify(st));

  // --- the card after saving
  const after = await P.evaluate((c) => ({ n: document.querySelector(`${c} [data-dua-narrated-count]`)?.dataset.duaNarratedCount, chip: document.querySelector(`${c} [data-dua-check-status]`)?.textContent,
    moved: document.querySelector(`${c} [data-dua-moved-out]`)?.dataset.duaMovedOut, w0: document.querySelector(`${c} [data-dua-word="0"]`)?.textContent,
    panel: !!document.querySelector("[data-dua-check-panel]"), focus: document.activeElement?.dataset?.duaCard }), CARD);
  check(`${tag} the chip now reads checked by the Owner (${lang === "bn" ? "যাচাই করেছেন" : "checked by"})`, after.chip.includes(lang === "bn" ? "যাচাই করেছেন" : "checked by") && after.chip.includes(lang === "bn" ? "আহসান" : "Ahsan"), after.chip);
  check(`${tag} Narrated in 22 places now, and 1 listed as moved out`, latin(after.n) === "22" && latin(after.moved) === "1", JSON.stringify([after.n, after.moved]));
  check(`${tag} the fixed word shows its fixed vowels on the card`, after.w0 === "اللّٰهُمَّ", after.w0);
  check(`${tag} the panel closed and focus is on the card`, !after.panel && after.focus === "2", JSON.stringify([after.panel, after.focus]));

  // --- Back returns focus to the card
  await P.click(`${CARD} [data-dua-check-open]`);
  await P.waitForSelector("[data-dua-check-panel]");
  const reopened = await P.evaluate(() => [...document.querySelectorAll("[data-dua-check-member][data-v='cut']")].length);
  check(`${tag} reopening restores the check (one member still cut)`, reopened === 1, String(reopened));
  await P.evaluate(() => document.activeElement?.blur());
  const hasBack = await P.$("[data-dua-check-back]");
  if (hasBack) await hasBack.click();
  await P.waitForTimeout(200);
  const back = await P.evaluate(() => ({ panel: !!document.querySelector("[data-dua-check-panel]"), focus: document.activeElement?.dataset?.duaCard ?? null }));
  check(`${tag} ← Back closes the panel and returns focus to the card`, hasBack && !back.panel && back.focus === "2", JSON.stringify([!!hasBack, back]));

  // --- the 1.5 KB budget for a fully checked worst-case dua
  const budget = await P.evaluate(async () => {
    const m = await import("/app/js/dua-check.js");
    const books = ["0256Bukhari.Sahih.JK000110-ara1", "0279Tirmidhi.Sunan.JK000140-ara1", "0303Nasai.CamalYawmWaLayla.JK000735-ara1", "0364IbnSunniDinawari.CamalYawmWaLayl.JK000943-ara1"];
    // The anchor cannot be cut (it is the dua), so "all decided" keeps it as "same"; the other 23 are all cut.
    const members = Array.from({ length: 24 }, (_, i) => ({ key: m.memberKey(books[i % 4], 100000 + i), v: i === 0 ? "same" : "cut" }));
    const words = Array.from({ length: 31 }, (_, i) => ({ i, v: "fix", fix: "وَبِنِعْمَتِكَ", unlink: true }));
    const c = { ...m.buildCheck({ members, words, together: true, originals: {} }), by: "p1700000000000", byName: "Ahsan", at: new Date().toISOString() };
    return { bytes: new TextEncoder().encode(JSON.stringify(c)).length, done: c.done };
  });
  // Budget raised from 1.5 KB to 2 KB by the Architect's review (PR #717), reason recorded: the worst case fixes ALL 31
  // words with 14-letter vowelled Arabic (2 bytes a letter in UTF-8, as Firestore counts), about 1.2 KB of it alone.
  // A real check fixes a few words (about 150 bytes). The check still fails a stored form that grows by a third.
  check(`${tag} worst case (24 members, 31 words, all decided) serialises under 2 KB, and counts as done: ${budget.bytes} bytes`, budget.bytes < 2048 && budget.done === true, JSON.stringify(budget));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
