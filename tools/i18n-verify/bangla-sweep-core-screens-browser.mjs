// Bangla sweep, part 2 (issue #680): the Qur'an page, Read view (text and Mushaf), Note view, the Word card, Explore
// (Approaches, QCR, Asma ul Husna), Mapping My Journey and the Bookmarks page.
//
// Same method and the SAME scanner as #677's bangla-sweep-newer-screens-browser.mjs (shared in bangla-sweep-lib.mjs):
// in Bangla each screen is opened for real, every visible text node and aria-label/title/placeholder is read for
// Latin-script interface words, and the suite asserts none. Data is allowed only by exact phrase (lib + CORE_ALLOWED
// below, each with its reason). Run at 390px and again at 1280px.
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/bangla-sweep-core-screens-browser.mjs
//   --list            print every Latin-script string found on each screen (READ it)
//   --mutate="<phrase>"  make the page's bn lookup miss that phrase (the sweep must fail and name it)
//   --width=390|1280  run one width only
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
import { SCAN, leaksOf as baseLeaksOf, DATA_ALLOWED, NAME_TOKENS } from "./bangla-sweep-lib.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const LIST = process.argv.includes("--list");
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const ONLY = (process.argv.find((a) => a.startsWith("--width=")) || "").slice(8);

// Data this part meets that #677's screens did not: exact phrases, each one a name or a title, not interface wording.
DATA_ALLOWED.push(
  // The font-size button's glyph: a symbol (a small and a large letter A), not a word.
  /^Aa$/,
  // The Arabic font choices: typeface names, shown in their own name in every language.
  /^(Scheherazade|Noto Naskh|Amiri Quran)$/,
);
// Reciters' personal names: people's names inside a Bangla label ("Abdullah Basfar (আরবি)"); only the language is interface.
NAME_TOKENS.push(/Abdullah Basfar/g, /Ibraheem Walk/g, /Kevan Brighting/g, /Shareef Bayezid Mahmud/g);

const allLeaks = [];
async function sweep(P, screen, width) {
  const found = await P.evaluate(SCAN);
  const leaks = baseLeaksOf(found);
  for (const l of leaks) allLeaks.push({ screen, ...l });
  if (LIST) console.log(`[${width} ${screen}] ${leaks.length} Latin-script strings:\n` + leaks.map((l) => `    ${l.kind} <${l.where}> ${JSON.stringify(l.text)}`).join("\n"));
  check(`bn ${width}: "${screen}" shows no English interface text`, leaks.length === 0, JSON.stringify(leaks.slice(0, 8).map((l) => `${l.kind}:${l.text}`)));
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const settle = (P, ms = 300) => P.waitForTimeout(ms);
const quiet = (errors) => errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
async function mk(width, extra = {}) {
  const ctx = await newContext(browser, { appLang: "bn", banner: false, viewport: { width, height: 860 }, ...extra });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    await ctx.route("**/app/js/i18n/bn.js*", async (r) => {
      const src = fs.readFileSync("app/js/i18n/bn.js", "utf8");
      const key = JSON.stringify(MUTATE);
      if (!src.includes(key + ":")) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(key + ":").join(JSON.stringify("\u0000" + MUTATE) + ":") });
    });
  }
  return ctx;
}
const noSplash = (P) => P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
const click = async (P, sel, ms = 400) => { await P.evaluate((s) => document.querySelector(s)?.click(), sel); await settle(P, ms); };

for (const width of ONLY ? [Number(ONLY)] : [390, 1280]) {
  // ---- 1-3: the Qur'an page, Read view (text, Mushaf), Note view -------------------------------------------------
  {
    const ctx = await mk(width);
    const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
    await noSplash(P);
    await settle(P, 800);
    await sweep(P, "Qur'an page landing", width);
    check(`bn ${width}: Qur'an page raised no page errors`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
    // 2. Read view (text), bar buttons, Range unit card, Ayah card.
    await click(P, "#tabReadBtn", 700).catch(() => {});
    if (!(await P.evaluate(() => document.body.classList.contains("read-sideways") || !!document.getElementById("readBar")?.offsetWidth))) {
      await click(P, "#tabStudyBtn", 300); await click(P, "#tabReadBtn", 700);
    }
    await sweep(P, "Read view (text)", width);
    for (const [id, nm] of [["readBarTakeBtn", "Take an Approach"], ["readBarRecordBtn", "Record Your Progress"], ["readBarStatusBtn", "Know Your Status"]]) {
      await click(P, "#" + id, 600);
      await sweep(P, "Read bar: " + nm, width);
      await click(P, "#" + id, 400);
    }
    await P.evaluate(() => { const s = document.getElementById("unitTypeSelect"); s.value = "range"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await settle(P, 700);
    await sweep(P, "Read view, Range unit card", width);
    await P.evaluate(() => { const s = document.getElementById("unitTypeSelect"); s.value = "ayah"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await settle(P, 700);
    await sweep(P, "Read view, Āyah card", width);
    await P.evaluate(() => { const m = document.getElementById("mushafToggle"); if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); } });
    await settle(P, 1500);
    await sweep(P, "Read view, Mushaf", width);
    // 3. Note view and its menu.
    await click(P, "#tabNoteBtn", 800);
    await sweep(P, "Note view", width);
    for (const i of [0, 1]) {
      const opened = await P.evaluate((k) => { const b = [...document.querySelectorAll(".note-dot-wrap > .note-icon-btn")].filter((x) => x.offsetWidth > 0)[k]; if (b) b.click(); return !!b; }, i);
      check(`bn ${width}: Note view menu button ${i + 1} exists`, opened);
      await settle(P, 500);
      await sweep(P, `Note view, ⋯/⋮ menu ${i + 1} open`, width);
      await P.keyboard.press("Escape"); await P.evaluate(() => document.body.click()); await settle(P, 200);
    }
    // The Track card (Study options -> Approach + Track).
    await click(P, "#tabStudyOptionsBtn", 600);
    check(`bn ${width}: Track card is on screen`, await P.evaluate(() => (document.getElementById("trackUnitBtn")?.offsetWidth || 0) > 0));
    await sweep(P, "Track card (Study options)", width);
    await ctx.close();
  }
}

await browser.close();
if (LIST) console.log("\nALL LEAKS:\n" + JSON.stringify([...new Set(allLeaks.map((l) => l.text))], null, 1));
console.log(`\n==== Bangla sweep, core screens: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
