// PCF MSA J104 item 25 (the Owner, 13 Nov 2026, demo v1.10 layout B): the Dua Card's Menu has FIVE TABS in one row (Show, Share,
// Keep, Listen, Study); only the chosen tab's buttons are on screen. Rendered checks (computed display, measured rects), never
// the intent the code expressed. Run from the repository root, serve.js on :8080.
//   --mutate=alwayson   no tab turns the other groups off          -> the "only that tab's group shows" checks fail
//   --mutate=twoline    the five tabs wrap onto two lines          -> the one-row check fails
//   --mutate=noaria     aria-selected is never true                -> the aria check fails
//   --mutate=nokeys     arrow keys do nothing                      -> the keyboard check fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`); if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); } };
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  alwayson: ["js/dua-menu-tabs.js", 'g.toggleAttribute("data-tab-off", !on);', 'g.toggleAttribute("data-tab-off", false);'],
  twoline: ["css/dua-study.css", ".dua-menu-panel .dua-menu-tabs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));", ".dua-menu-panel .dua-menu-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));"],
  noaria: ["js/dua-menu-tabs.js", 'b.setAttribute("aria-selected", String(on));', 'b.setAttribute("aria-selected", "false");'],
  nokeys: ["js/dua-menu-tabs.js", "if (to) { ev.preventDefault(); select(to, true); }", "if (false) { ev.preventDefault(); select(to, true); }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function context(width, lang) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css" : "text/javascript", body: src.split(a).join(b) }); });
  }
  return ctx;
}
const KEYS = ["show", "share", "keep", "listen", "study"];
const state = (P) => P.evaluate(() => {
  const panel = document.querySelector(".dua-menu-panel");
  const shown = (el) => !!el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().height > 0;
  const groupOf = (k) => (k === "show" ? panel.querySelector(":scope > .dua-sel") : panel.querySelector(`:scope > [data-dua-menu-group="${k}"]`));
  return Object.fromEntries(["show", "share", "keep", "listen", "study"].map((k) => [k, shown(groupOf(k))]));
});
const WORDS = { en: { show: "Show", share: "Share", keep: "Keep", listen: "Listen", study: "Study" }, bn: { show: "দেখান", share: "শেয়ার", keep: "সংরক্ষণ", listen: "শুনুন", study: "অধ্যয়ন" } };
for (const [width, lang] of [[390, "en"], [390, "bn"], [320, "en"], [1280, "en"]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await context(width, lang);
  const { page: P } = await openPage(ctx, "/app/dua-study.html?g=rasul&open=8");
  await P.waitForSelector("[data-dua-topbar]", { timeout: 25000 });
  await P.click("[data-dua-menu-toggle]");
  await P.waitForSelector(".dua-menu-tabs button", { timeout: 10000 });
  await P.waitForFunction(() => !document.querySelector('.dua-menu-panel [data-dua-menu-group="keep"]')?.hidden, null, { timeout: 15000 }).catch(() => {});
  const tabs = await P.$$eval(".dua-menu-tabs [data-dua-tab]", (bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return { k: b.dataset.duaTab, t: b.textContent.trim(), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), cut: b.scrollWidth > b.clientWidth + 1, role: b.getAttribute("role") }; }));
  check(`${tag} five tabs: Show, Share, Keep, Listen, Study, in this order`, tabs.map((x) => x.k).join() === KEYS.join(), JSON.stringify(tabs));
  check(`${tag} the tabs are named in this language`, tabs.every((x) => x.t === WORDS[lang][x.k]), JSON.stringify(tabs.map((x) => x.t)));
  check(`${tag} ALL FIVE sit in ONE row (same top) and each is finger-high (44px)`, new Set(tabs.map((x) => x.top)).size === 1 && tabs.every((x) => x.h >= 44), JSON.stringify(tabs));
  check(`${tag} no tab word is cut off`, tabs.every((x) => !x.cut), JSON.stringify(tabs.filter((x) => x.cut)));
  const inside = await P.evaluate(() => { const p = document.querySelector(".dua-menu-panel").getBoundingClientRect(); return [...document.querySelectorAll(".dua-menu-tabs button")].every((b) => { const r = b.getBoundingClientRect(); return r.left >= p.left - 1 && r.right <= p.right + 1; }); });
  check(`${tag} the tab row stays inside the Menu panel (no sideways overflow)`, inside);
  check(`${tag} every tab has role=tab`, tabs.every((x) => x.role === "tab"));
  // initial state: Show only
  let st = await state(P);
  check(`${tag} Show is the first tab: the selections show, no other group does`, st.show && !st.share && !st.keep && !st.listen && !st.study, JSON.stringify(st));
  const sel0 = await P.$$eval(".dua-menu-tabs [aria-selected]", (b) => b.map((x) => `${x.dataset.duaTab}:${x.getAttribute("aria-selected")}`).join());
  check(`${tag} aria-selected is true on Show only`, sel0 === "show:true,share:false,keep:false,listen:false,study:false", sel0);
  for (const k of ["share", "keep", "listen", "study", "show"]) {
    await P.click(`[data-dua-tab="${k}"]`);
    st = await state(P);
    const only = KEYS.every((x) => st[x] === (x === k));
    check(`${tag} tab ${k}: ONLY its group is on screen`, only, JSON.stringify(st));
    if (k !== "keep" && k !== "show") {
      const chips = await P.$$eval(`.dua-menu-panel [data-dua-menu-group="${k}"] button`, (b) => b.map((x) => { const r = x.getBoundingClientRect(); return { h: Math.round(r.height), l: Math.round(r.left), r: Math.round(r.right) }; }));
      const w = await P.evaluate(() => innerWidth);
      check(`${tag} tab ${k}: its ${chips.length} chips are on screen and 40px or more high`, chips.length > 0 && chips.every((c) => c.h >= 40 && c.l >= 0 && c.r <= w), JSON.stringify(chips));
    }
  }
  // a control inside a tab still works: Share -> Poster opens the pop-up (the same button as before)
  await P.click('[data-dua-tab="share"]');
  await P.click('[data-dua-menu="poster"]');
  await P.waitForSelector('[data-dua-pop="poster"]', { timeout: 15000 }).catch(() => {});
  check(`${tag} Poster, pressed from the Share tab, opens its pop-up`, (await P.locator('[data-dua-pop="poster"]').count()) > 0);
  await P.keyboard.press("Escape"); await P.waitForTimeout(200);
  // keyboard: ArrowRight from the selected tab moves to the next and focuses it
  await P.focus('[data-dua-tab="show"]'); await P.click('[data-dua-tab="show"]');
  await P.keyboard.press("ArrowRight");
  const afterRight = await P.evaluate(() => ({ sel: document.querySelector('.dua-menu-tabs [aria-selected="true"]')?.dataset.duaTab, focus: document.activeElement?.dataset?.duaTab }));
  check(`${tag} ArrowRight moves to the next tab and focuses it`, afterRight.sel === "share" && afterRight.focus === "share", JSON.stringify(afterRight));
  await P.keyboard.press("ArrowLeft"); await P.keyboard.press("ArrowLeft");
  const wrap = await P.evaluate(() => document.querySelector('.dua-menu-tabs [aria-selected="true"]')?.dataset.duaTab);
  check(`${tag} ArrowLeft past the first tab wraps to the last (Study)`, wrap === "study", wrap);
  await ctx.close();
}
await browser.close();
console.log(`\n==== Dua menu tabs (25, layout B): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
