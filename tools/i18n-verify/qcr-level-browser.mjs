// PCF MSA J62 (the Owner, 21 Oct 2026, a phone screenshot of QCR · 32:27 with its YR LEVEL list open): "QCR: *Rename Yr
// Level to Level. *Add 'Non-Muslim- 13-yo' as a level." and "Add another level for only 'Non-Muslim'". The QCR pop-up's third field reads "Level" (Bangla "স্তর"), its
// list ends with "Non-Muslim 13-yo", and ticking that writes the id `nonmuslim13` into the group's yrLevels.
// Run from the repository root with serve.js on :8080 (or QR_BASE=...). Every mutation must make the suite exit 1:
//   oldname   the field still says "Yr Level"                  -> the label check fails
//   nolevel   the new id is not in the list                     -> the list / write checks fail
//   nolabel   the new id prints as its raw id                   -> the list check fails
//   noplain   the plain "Non-Muslim" level is missing            -> the list check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  oldname: ["app/quranrevival.html", '<span class="note-qcr-field-label">${escapeHtml(t("Level"))}</span>', '<span class="note-qcr-field-label">${escapeHtml(t("Yr Level"))}</span>'],
  nolevel: ["app/js/qcr.js", '"adult", "nonmuslim", "nonmuslim13"];', '"adult"];'],
  noplain: ["app/js/qcr.js", '"adult", "nonmuslim", "nonmuslim13"];', '"adult", "nonmuslim13"];'],
  nolabel: ["app/js/qcr.js", '  if (id === "nonmuslim13") return t("Non-Muslim 13-yo");\n', ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const [lang, width] of [["en", 320], ["en", 390], ["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }));
  }
  const { page: P } = await openPage(ctx, "/app/quranrevival.html");
  const ev = (f, a) => P.evaluate(f, a);
  await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await ev(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(400);
  await ev(() => { const s = document.getElementById("surahSelect"); if (s.value !== "2") { s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await P.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 15000 });
  await ev(() => { const el = document.getElementById("ayahSelect"); el.value = "255"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForTimeout(900);
  await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await ev(() => document.querySelector('[data-ayah-num-badge="2:255"]')?.click());
  await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-qcr]"), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(400);
  await ev(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-qcr]")?.click());
  await P.waitForFunction(() => document.querySelector('#qcrPopup [data-note-qcr-dd-toggle="yrlevel"]'), null, { timeout: 12000 }).catch(() => {});
  await P.waitForTimeout(400);
  const label = await ev(() => document.querySelector('#qcrPopup [data-note-qcr-dd-toggle="yrlevel"]')?.closest(".note-qcr-field")?.querySelector(".note-qcr-field-label")?.textContent.trim() ?? null);
  check(`${tag} the third field reads "${lang === "bn" ? "স্তর" : "Level"}"`, label === (lang === "bn" ? "স্তর" : "Level"), String(label));
  // The Level button needs a group chosen: take the seeded group the Attach list ticks first, or the first group.
  if (await ev(() => document.querySelector('#qcrPopup [data-note-qcr-dd-toggle="yrlevel"]')?.disabled)) {
    await ev(() => document.querySelector('#qcrPopup [data-note-qcr-dd-toggle="group"]')?.click());
    await P.waitForTimeout(300);
    await ev(() => document.querySelector('#qcrPopup [data-note-qcr-group-radio]:not([value=""])')?.click());
    await P.waitForTimeout(400);
  }
  await ev(() => document.querySelector('#qcrPopup [data-note-qcr-dd-toggle="yrlevel"]')?.click());
  await P.waitForTimeout(400);
  const list = await ev(() => {
    const pop = document.querySelector('#qcrPopup [data-note-qcr-dd-pop="yrlevel"]');
    const rows = [...(pop?.querySelectorAll("label.note-collection-row") ?? [])];
    const r = pop?.getBoundingClientRect();
    return { names: rows.map((l) => l.textContent.trim()), ids: rows.map((l) => l.querySelector("input")?.dataset.noteQcrYrlevelToggle), last: rows.at(-1)?.textContent.trim() ?? null,
      out: rows.filter((l) => { const b = l.getBoundingClientRect(); return b.width > 0 && r && (b.left < r.left - 1 || b.right > r.right + 1); }).length,
      over: document.documentElement.scrollWidth - innerWidth };
  });
  const want = lang === "bn" ? "অমুসলিম ১৩ বছর" : "Non-Muslim 13-yo";
  const wantPlain = lang === "bn" ? "অমুসলিম" : "Non-Muslim";
  check(`${tag} the Level list has 15 rows and ends with "${wantPlain}", then "${want}"`, list.ids.length === 15 && list.ids.at(-2) === "nonmuslim" && list.ids.at(-1) === "nonmuslim13" && list.names.at(-2) === wantPlain && list.last === want, JSON.stringify(list));
  check(`${tag} every row sits inside the list, and no sideways scroll`, list.out === 0 && list.over <= 0, JSON.stringify(list));
  const n0 = await ev(() => (window.__stubWriteData || []).length);
  await ev(() => document.querySelector('#qcrPopup [data-note-qcr-yrlevel-toggle="nonmuslim13"]')?.click());
  await P.waitForTimeout(1500);
  const wrote = await ev((n0) => JSON.stringify((window.__stubWriteData || []).slice(n0)), n0);
  const ticked = await ev(() => !!document.querySelector('#qcrPopup [data-note-qcr-yrlevel-toggle="nonmuslim13"]')?.checked);
  check(`${tag} ticking it saves the id nonmuslim13 in the group's levels, and it stays ticked`, /nonmuslim13/.test(wrote) && ticked, wrote.slice(0, 300));
  await ctx.close();
}
console.log(`\n==== QCR Level (J62)${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
