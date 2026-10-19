// PCF MSA J46 (the Owner, 20 Oct 2026: Past, Present and Command "separately in toggle view so that student get a bigger
// close view"; ticks 1A four buttons, 2A All three on a computer and this āyah's tense on a phone; the person groups
// side by side). The Taṣrīf level's Verb Conjugation keeps its three columns under "All three" and gains a four-button
// toggle; a single tense shows large, its person groups side by side, stacking on a narrow card.
//
// Run from the repository root with serve.js running. MUTATE=<name> serves one deliberate break and the suite must
// then FAIL -- that is how each check was proven able to fail.

import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

const HTML = "app/quranrevival.html", DEPTH = "app/js/word-card-depth.js";
const MUTATIONS = {
  "no-toggle": [DEPTH, "  out.push(conjToggle(view, lang));\n", ""],
  "narrow-ignored": [DEPTH, "(ctx.conjNarrow && here?.kind ? here.kind : \"all\")", "\"all\""],
  "groups-stacked": [HTML, ".word-card-cj-groups { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));", ".word-card-cj-groups { display: grid; grid-template-columns: minmax(0, 1fr);"],
  "choice-not-kept": [HTML, "conjView: wordCardConjView, conjNarrow", "conjView: null, conjNarrow"],
  "not-bigger": [HTML, ".word-card-cj-one .word-card-cj-vb { font-size: 2rem;", ".word-card-cj-one .word-card-cj-vb { font-size: 1.3rem;"],
  "toggle-ink": [HTML, "background: var(--wc-purple-bg); color: var(--wc-purple-ink); font: inherit; font-weight: 700; font-size: 0.85rem;", "background: var(--wc-purple-bg); color: #3a3a3a; font: inherit; font-weight: 700; font-size: 0.85rem;"],
};
const MUTATE = process.env.MUTATE || "";

let passed = 0, failed = 0;
function check(name, cond, detail = "") {
  if (cond && typeof cond.then === "function") throw new TypeError("check() takes a value, not a promise");
  if (cond) { passed++; console.log(`  PASS  ${name}`); } else { failed++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const browser = await chromium.launch();
async function open(width, height, { lang = null } = {}) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, from, to] = MUTATIONS[MUTATE] || (() => { throw new Error(`no such mutation ${MUTATE}`); })();
    const body = fs.readFileSync(file, "utf8");
    if (!body.includes(from)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    const glob = file === HTML ? "**/app/quranrevival.html*" : "**/app/js/word-card-depth.js*";
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file === HTML ? "text/html; charset=utf-8" : "text/javascript", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page, errors };
}
// The same way into a word as word-card-conjugation-browser.mjs.
async function openWord(page, surah, ayah, pos) {
  await page.evaluate(() => document.querySelector("[data-word-card-close]")?.click());
  await page.waitForTimeout(300);
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove())); await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(600);
  await page.evaluate((s) => { const e = document.getElementById("surahSelect"); e.value = String(s); e.dispatchEvent(new Event("change", { bubbles: true })); }, surah);
  await page.waitForTimeout(2500);
  await page.evaluate((a) => { const e = document.getElementById("ayahSelect"); if (e.querySelector(`option[value="${a}"]`)) { e.value = String(a); e.dispatchEvent(new Event("change", { bubbles: true })); } }, ayah);
  await page.waitForTimeout(1500);
  await page.evaluate(([s, a, p]) => { document.querySelector(`#readView [data-word-occurrence$=":${s}:${a}:${p}"]`)?.click(); }, [surah, ayah, pos]);
  await page.waitForSelector(".quran-word-card", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  if (!(await page.$('[data-word-card-panel="tasrif"]'))) await page.click('[data-word-card-level="tasrif"]', { timeout: 8000 }).catch(() => {});
  // Wait for a VISIBLE conjugation table of THIS word (a hidden copy of the previous card can still be in the page).
  await page.waitForFunction((ref) => [...document.querySelectorAll("[data-word-card-conj-table]")].some((t) => t.getBoundingClientRect().width > 0 && t.closest(".quran-word-card")?.textContent.includes(ref)), `${surah}:${ayah}:${pos}`, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
}
const state = (page) => page.evaluate(() => {
  // The visible card only: a hidden copy of the card can sit in the page too.
  const shown = (el) => el.getBoundingClientRect().width > 0;
  const sec = [...document.querySelectorAll('[data-word-card-sec="conj"]')].find(shown);
  const tog = sec?.querySelector("[data-word-card-conj-toggle]");
  const buttons = tog ? [...tog.querySelectorAll("button")] : [];
  const one = sec?.querySelector("[data-word-card-conj-single]");
  const cardEl = sec?.closest(".quran-word-card");
  const card = cardEl?.getBoundingClientRect();
  const groups = one ? [...one.querySelectorAll("[data-word-card-conj-group]")].map((g) => {
    const b = g.getBoundingClientRect();
    return { key: g.dataset.wordCardConjGroup, x: b.x, right: b.right, rows: g.querySelectorAll("tr").length };
  }) : [];
  const vb = (el) => el ? parseFloat(getComputedStyle(el).fontSize) : 0;
  const ink = cardEl ? getComputedStyle(cardEl).getPropertyValue("--wc-purple-ink").trim() : "";
  const probe = document.createElement("span"); probe.style.color = ink; document.body.append(probe);
  const inkRgb = getComputedStyle(probe).color; probe.remove();
  const unpressed = buttons.find((b) => b.getAttribute("aria-pressed") === "false");
  return {
    labels: buttons.map((b) => b.textContent.trim()),
    pressed: buttons.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.wordCardConjView),
    tables: sec ? [...sec.querySelectorAll("[data-word-card-conj-table]")].map((t) => t.dataset.wordCardConjTable) : [],
    single: one ? one.dataset.wordCardConjTable : null,
    groups,
    here: one?.querySelector("[data-word-card-conj-here]")?.dataset.wordCardConjPgn ?? null,
    mood: one?.querySelector("[data-word-card-conj-mood]")?.textContent ?? null,
    counts: one ? one.querySelectorAll("[data-word-card-conj-count]").length : 0,
    oneFont: vb(one?.querySelector(".word-card-cj-vb")),
    inkRgb, unpressedColor: unpressed ? getComputedStyle(unpressed).color : null,
    togInside: tog && card ? tog.getBoundingClientRect().right <= card.right + 0.5 && tog.getBoundingClientRect().x >= card.x - 0.5 : false,
    oneInside: one && card ? one.getBoundingClientRect().right <= card.right + 0.5 : true,
    sw: document.documentElement.scrollWidth, vw: innerWidth,
  };
});
const allFont = (page) => page.evaluate(() => parseFloat(getComputedStyle([...document.querySelectorAll("[data-word-card-conj-grid] .word-card-cj-vb")].find((e) => e.getBoundingClientRect().width > 0)).fontSize));
/** Click the VISIBLE control matching `sel` with a real mouse click at its centre (a reader's tap). */
async function tap(page, sel) {
  const at = await page.evaluate((q) => { const el = [...document.querySelectorAll(q)].find((e) => e.getBoundingClientRect().width > 0); if (!el) return null; el.scrollIntoView({ block: "center" }); const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
  if (!at) throw new Error(`nothing visible matches ${sel}`);
  await page.mouse.click(at.x, at.y); await page.waitForTimeout(500);
}
const press = (page, view) => tap(page, `.word-card-conj-toggle [data-word-card-conj-view="${view}"]`);

console.log(`\nword-card-tense-toggle-browser${MUTATE ? ` (MUTATION ${MUTATE})` : ""}`);

console.log("\n1. A computer: All three first, then one tense large (35:2:2 يَفْتَحِ)");
{
  const { ctx, page, errors } = await open(1280, 900);
  await openWord(page, 35, 2, 2);
  let s = await state(page);
  check(`the toggle has four buttons: ${s.labels.join(" | ")}`, s.labels.length === 4 && /^All three/.test(s.labels[0]) && /Past/.test(s.labels[1]) && /Present/.test(s.labels[2]) && /Command/.test(s.labels[3]));
  check(`it opens on All three (2A): pressed ${s.pressed.join(",")}, tables ${s.tables.join(",")}`, s.pressed.join() === "all" && s.tables.join() === "past,pres,imp" && !s.single);
  check(`an unpressed toggle button's text is the card's purple ink (${s.unpressedColor} = ${s.inkRgb})`, !!s.unpressedColor && s.unpressedColor === s.inkRgb);
  const small = await allFont(page);
  await press(page, "pres");
  s = await state(page);
  check(`Present alone: one table, Present pressed (${s.pressed})`, s.single === "pres" && s.tables.join() === "pres" && s.pressed.join() === "pres");
  check(`its three person groups hold 6, 6 and 2 persons (${s.groups.map((g) => g.rows).join(",")})`, s.groups.map((g) => g.rows).join() === "6,6,2");
  const [g3, g2, g1] = s.groups;
  check("the groups sit side by side, right to left: he/she/they rightmost, then you, then I and we", s.groups.length === 3 && g3.x > g2.right - 1 && g2.x > g1.right - 1);
  check(`the Arabic is bigger than in All three (${s.oneFont}px vs ${small}px, at least 1.4x)`, s.oneFont >= small * 1.4);
  check(`the gold row and the mood stay: 3MS here, "${s.mood}"`, s.here === "3MS" && /jussive/i.test(s.mood ?? ""));
  check(`the Qur'an count stays (${s.counts})`, s.counts >= 1);
  check("the toggle and the table stay inside the card, no sideways page scroll", s.togInside && s.oneInside && s.sw <= s.vw);
  await tap(page, '.word-card-cj-step[data-word-card-conj-view="imp"]');
  s = await state(page);
  check(`› steps to Command (${s.single})`, s.single === "imp");
  await tap(page, '.word-card-cj-step[data-word-card-conj-view="pres"]');
  s = await state(page);
  check(`‹ steps back to Present (${s.single})`, s.single === "pres");
  // The choice holds for the visit: step with the card's own › to the next verb, 35:2:11 يُمْسِكْ (present).
  for (let i = 0; i < 9; i++) await tap(page, '[data-word-card-move="next"]');
  await page.waitForFunction(() => [...document.querySelectorAll(".quran-word-card")].some((c) => c.getBoundingClientRect().width > 0 && c.textContent.includes("35:2:11")), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  s = await state(page);
  check(`the next verb (35:2:11, reached with ›) opens on the reader's choice, Present alone (${s.single})`, s.single === "pres");
  await press(page, "all");
  s = await state(page);
  check(`All three brings the three columns back (${s.tables.join(",")})`, s.tables.join() === "past,pres,imp" && !s.single);
  check("no page errors", errors.filter((e) => !/ERR_CERT|archive\.org|net::/.test(e)).length === 0, errors.join(" | "));
  await ctx.close();
}

console.log("\n2. A phone: this āyah's tense first (2A), groups stacked");
for (const lang of [null, "bn"]) {
  const { ctx, page } = await open(390, 844, { lang });
  await openWord(page, 35, 2, 2);
  const s = await state(page);
  const tag = lang === "bn" ? "390 Bangla" : "390";
  check(`${tag}: opens on Present, the tense of يَفْتَحِ (${s.single}, pressed ${s.pressed})`, s.single === "pres" && s.pressed.join() === "pres");
  check(`${tag}: the groups stack (one column)`, s.groups.length === 3 && Math.abs(s.groups[0].x - s.groups[1].x) < 1 && Math.abs(s.groups[1].x - s.groups[2].x) < 1);
  check(`${tag}: toggle and table inside the card, no sideways scroll (${s.sw}/${s.vw})`, s.togInside && s.oneInside && s.sw <= s.vw);
  if (lang === "bn") check(`Bangla: the toggle says তিনটিই (${s.labels[0]})`, /তিনটিই/.test(s.labels[0] ?? ""));
  await ctx.close();
}

await browser.close();
console.log(`\nword-card-tense-toggle-browser: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
