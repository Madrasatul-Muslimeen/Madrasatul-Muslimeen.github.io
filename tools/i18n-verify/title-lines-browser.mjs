// The Ayah card's difficulty line and the Word Card's step line (the Owner, 11 Nov 2026, the phone-layout demo, "yes build now").
//
// Run from the repository root with serve.js up:  node tools/i18n-verify/title-lines-browser.mjs
//   MUT=oldtitles ... mutation: the three old titles come back beside the line      -> "the three old titles are gone"
//   MUT=noline ...    mutation: the Āyah card has no difficulty line                  -> the line checks
//   MUT=notabline ... mutation: the Word Card has no step line                        -> the step-line checks
//   MUT=latinonly ... mutation: the line drops its Arabic                             -> the "all three scripts" check
//   MUT=cut ...       mutation: the type is fixed at its biggest size (the cut-off \"Level of Dif…\" the first build had at 390px)  -> the \"nothing cut\" check
//   MUT=wrap ...      mutation: the line is allowed to wrap onto a second row (type pinned at its biggest, so it must wrap) -> the "one thin row" check
// What it proves, rendered and measured at 320, 360, 390, 768 and 1280, English and Bangla:
//   1. The Ayah card has ONE gold line "Mustawa al-Ṣuʿūbah · مستوى الصعوبة · Level of Difficulty" (Bangla: the English part is
//      Bangla, the title and the Arabic stay) directly over the Difficult / Need practice / Done chips, in one thin row,
//      inside the card, with nothing cut; "Status of this āyah", "Marks" and "Marks for this āyah" are gone.
//   2. The Word Card has ONE gold line "Tadarruj · تدرج · Step-by-Step Learning" directly above the five tabs, in one thin
//      row inside the card; the five tabs are still WbW, Root, Family, Taṣrīf, Depth and still 38px or more tall.
//   3. The line is a title, not a control (no button, no tab stop).
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import path from "node:path";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (typeof ok === "function") throw new Error(`check "${name}" was handed a function; pass its value`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}
const ROOT = process.cwd();
const MUT = process.env.MUT || "";
const restores = [];
function mutate(rel, re, to) {
  const f = path.join(ROOT, rel), keep = fs.readFileSync(f, "utf8");
  let n = 0;
  const next = keep.replace(re, (...a) => (n++, typeof to === "function" ? to(...a) : to));
  console.log(`MUTATION ${MUT}: ${n} replacement(s) in ${rel}`);
  if (!n) throw new Error("mutation matched nothing");
  fs.writeFileSync(f, next);
  restores.push(() => fs.writeFileSync(f, keep));
}
const restoreAll = () => { while (restores.length) restores.pop()(); };
process.on("exit", restoreAll);
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { restoreAll(); process.exit(1); });
if (MUT === "oldtitles") mutate("app/js/ayah-action-sheet.js", /\$\{intro\?\.opening \? `<h3 class="ayah-sheet-section-title">\$\{escapeHtml\(t\("Status"\)\)\}<\/h3>` : ""\}/g, '<h3 class="ayah-sheet-section-title">${escapeHtml(t("Status of this āyah"))}</h3>');
else if (MUT === "noline") mutate("app/js/ayah-action-sheet.js", /\$\{titleLineHtml\(\{ key: "difficulty"[^\n]*\n/g, "\n");
else if (MUT === "notabline") mutate("app/js/quran-word-card.js", /    \$\{titleLineHtml\(\{ key: "word-card-steps"[^\n]*\n/g, "");
else if (MUT === "latinonly") mutate("app/js/title-line.js", /<span class="tl-ar"[^`]*?<\/span>/g, "");
else if (MUT === "cut") { mutate("app/js/title-line.js", /font: 600 clamp\(0\.62rem, 2\.9vw, 0\.78rem\)/g, "font: 600 0.78rem"); mutate("app/js/title-line.js", /font-size: 1\.3em;/g, "font-size: 1.3em; margin-inline: 0.5rem;"); }
else if (MUT === "wrap") { mutate("app/js/title-line.js", /white-space: nowrap; /g, "white-space: normal; "); mutate("app/js/title-line.js", /font: 600 clamp\(0\.62rem, 2\.9vw, 0\.78rem\)/g, "font: 600 0.78rem"); mutate("app/js/title-line.js", /font-size: 1\.3em;/g, "font-size: 1.3em; margin-inline: 0.5rem;"); } // 100L review: wrap alone changed nothing (the line fits at every width), so it pins the type at its biggest, as cut does; then wrapping is what keeps it uncut

const TENANT = "t1";
const SEED = `\nDATA.ayahKeyMarks = [{ _id: "${TENANT}__p1__1", tenantId: "${TENANT}", scope: "p1", surah: 1, entries: { "ayah:1:2": ["hard"], "qword:1:1:1": ["done"], "qword:1:2:1": ["practice"] }, schemaVersion: 1, createdAt: "2026-11-04T00:00:00.000Z", updatedAt: "2026-11-04T00:00:00.000Z", createdBy: "test-uid" }];\n`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
async function open(ctx) {
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.waitForTimeout(1200);
  return page;
}
async function openRead(page) {
  if (await ev(page, () => !document.getElementById("readView").hidden)) return;
  if (!(await ev(page, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await settle(page, 200); }
  await page.click("#tabReadBtn");
  await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 8000 });
  await settle(page, 300);
}
const WIDTHS = process.env.ONE ? [[390, 844]] : [[320, 640], [360, 740], [390, 844], [768, 1024], [1280, 800]];
const LANGS = process.env.ONE ? ["en"] : ["en", "bn"];
try {
  for (const lang of LANGS) for (const [width, height] of WIDTHS) {
    const tag = `[${lang} ${width}]`;
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: SEED + "window.__stubApplyBatches = true;" });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const page = await open(ctx);
    await openRead(page);
    await ev(page, () => { const el = document.getElementById("ayahSelect"); el.value = "2"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await settle(page, 900);
    await ev(page, () => document.querySelector('[data-ayah-num-badge="1:2"]')?.click());
    await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
    await page.waitForSelector("[data-ayah-sheet] [data-marks-row]", { timeout: 6000 }).catch(() => {});
    const card = await ev(page, () => {
      const sheet = document.querySelector("[data-ayah-sheet]"), line = sheet.querySelector('[data-title-line="difficulty"]'), row = sheet.querySelector("[data-marks-row]");
      const R = (e) => e?.getBoundingClientRect(), sr = R(sheet);
      const parts = line ? [...line.children].map((c) => ({ cls: c.className, text: c.textContent.trim(), w: R(c).width, sw: c.scrollWidth, cw: c.clientWidth })) : [];
      const headings = [...sheet.querySelectorAll("h3, h4, .marks-row-label")].map((h) => h.textContent.trim());
      const lr = R(line), rr = R(row); const enEl = line?.querySelector('.tl-en'), enR = R(enEl);
      return { has: !!line, text: line?.textContent ?? "", parts, h: lr?.height ?? 0, left: lr?.left, right: lr?.right, sLeft: sr.left, sRight: sr.right, above: !!lr && !!rr && lr.bottom <= rr.top + 1 && rr.top - lr.bottom < 24,
        interactive: !!line?.querySelector("button, a, [tabindex]") || line?.matches?.("button, a, [tabindex]"), headings, enRight: enR?.right ?? 0, headings2: 0, lineClip: line ? Math.max(line.scrollWidth - line.clientWidth, ...[...line.children].map((c) => c.scrollWidth - c.clientWidth)) : 0 };
    });
    check(`${tag} MUTATION TARGET (noline): the Āyah card has ONE difficulty line`, card.has, JSON.stringify(card).slice(0, 200));
    check(`${tag} MUTATION TARGET (latinonly): it holds all three scripts, "Mustawa al-Ṣuʿūbah", "مستوى الصعوبة" and "${lang === "bn" ? "কঠিনতার স্তর" : "Level of Difficulty"}"`, /Mustawa al-Ṣuʿūbah/.test(card.text) && /مستوى الصعوبة/.test(card.text) && card.text.includes(lang === "bn" ? "কঠিনতার স্তর" : "Level of Difficulty"), card.text);
    check(`${tag} MUTATION TARGET (wrap): it is one thin row (${Math.round(card.h)}px, no wider than its card, nothing cut)`, card.has && card.h > 0 && card.h <= 30 && card.left >= card.sLeft - 1 && card.right <= card.sRight + 1 && card.enRight <= card.sRight + 1 && card.lineClip <= 1, JSON.stringify({ h: card.h, l: card.left, r: card.right, clip: card.lineClip }));
    check(`${tag} it sits directly over the Difficult / Need practice / Done chips`, card.above, JSON.stringify({ above: card.above }));
    check(`${tag} MUTATION TARGET (oldtitles): "Status of this āyah", "Marks" and "Marks for this āyah" are gone`, !card.headings.some((h) => /^(Status of this āyah|Marks|Marks for this āyah|এই আয়াতের অবস্থা|চিহ্ন|এই আয়াতের চিহ্ন)$/i.test(h)), JSON.stringify(card.headings));
    check(`${tag} the line is a title, not a control`, card.has && !card.interactive);
    if (width === 390 && lang === "en") { await page.screenshot({ path: `${process.env.SHOTS || "/tmp"}/title-line-ayah-${lang}-${width}.png` }); }
    await ev(page, () => document.querySelector("[data-ayah-sheet-close]")?.click());
    await settle(page, 300);

    // ---- the Word Card
    await ev(page, () => { const el = document.getElementById("ayahSelect"); el.value = "1"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await settle(page, 700);
    await ev(page, () => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
    await settle(page, 500);
    const occ = "quran-word-occurrence:v1:1:1:1";
    await page.waitForFunction((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`), occ, { timeout: 8000 });
    await ev(page, (i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`).click(), occ);
    await page.waitForSelector(`.quran-word-card[data-occurrence-id="${occ}"]`, { timeout: 8000 });
    await settle(page, 400);
    const wc = await ev(page, () => {
      const card = document.querySelector(".quran-word-card"), line = card.querySelector('[data-title-line="word-card-steps"]'), list = card.querySelector('[role="tablist"]');
      const R = (e) => e?.getBoundingClientRect(), cr = R(card), lr = R(line), tr = R(list);
      const tabs = list ? [...list.querySelectorAll("button, [role=tab]")].map((b) => ({ text: b.textContent.trim().split("\n")[0].trim(), h: R(b).height })) : [];
      return { has: !!line, text: line?.textContent ?? "", h: lr?.height ?? 0, left: lr?.left, right: lr?.right, cLeft: cr.left, cRight: cr.right, above: !!lr && !!tr && lr.bottom <= tr.top + 1 && tr.top - lr.bottom < 24, tabs, clip: line ? Math.max(line.scrollWidth - line.clientWidth, ...[...line.children].map((c) => c.scrollWidth - c.clientWidth)) : 0, interactive: !!line?.querySelector("button, a, [tabindex]") };
    });
    check(`${tag} MUTATION TARGET (notabline): the Word Card has ONE step line, all three scripts ("Tadarruj", "تدرج", "${lang === "bn" ? "ধাপে ধাপে শেখা" : "Step-by-Step Learning"}")`, wc.has && /Tadarruj/.test(wc.text) && /تدرج/.test(wc.text) && wc.text.includes(lang === "bn" ? "ধাপে ধাপে শেখা" : "Step-by-Step Learning"), wc.text);
    check(`${tag} the step line is one thin row inside the card (${Math.round(wc.h)}px), nothing cut, directly above the five tabs`, wc.has && wc.h > 0 && wc.h <= 30 && wc.left >= wc.cLeft - 1 && wc.right <= wc.cRight + 1 && wc.clip <= 1 && wc.above, JSON.stringify({ h: wc.h, l: wc.left, r: wc.right, cl: wc.cLeft, cr: wc.cRight, clip: wc.clip, above: wc.above }));
    check(`${tag} the five tabs are still WbW, Root, Family, Taṣrīf, Depth (five of them) and 38px or more tall`, wc.tabs.length === 5 && wc.tabs.every((x) => x.h >= 38), JSON.stringify(wc.tabs));
    check(`${tag} the step line is a title, not a control`, wc.has && !wc.interactive);
    if (width === 390 && lang === "en") { await page.screenshot({ path: `${process.env.SHOTS || "/tmp"}/title-line-word-${lang}-${width}.png` }); }
    await ctx.close();
  }
} finally {
  await browser.close();
  restoreAll();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
