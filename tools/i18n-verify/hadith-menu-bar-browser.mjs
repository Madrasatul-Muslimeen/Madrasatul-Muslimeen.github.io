// PCF MSA J106 S1 (the Owner, 14 Nov 2026, demo ticks 1B 4A 7A): Hadith Study's ONE bar -- Menu, Books, Subjects, Explore, Search.
// Rendered checks, en and bn:
//   - the bar is those five, in that order, on ONE row at 320/360/390/820/1280, nothing runs off the screen, Search is last;
//   - Encyclopedia, Classical Explanations, Dua, Topics are NOT on the bar; the Menu panel starts hidden (COMPUTED display);
//   - Menu holds Encyclopedia, Classical Explanations, a Dua link (dua-study.html?back=1) and Settings (Text language, Card colours);
//   - "Menu · Preview" shows while a "View as" preview is on and is gone when it is off; the "Previewing as" note and the Tenant/Person
//     pickers sit INSIDE Menu > Settings and not at the page top (they are the shared page's own elements, re-parented);
//   - the old Dua addresses on both Hadith pages land on dua-study.html with the same dua (a rendered card for each).
// Run from the repository root with serve.js on :8080. Exits 0 only when every check passed.
//   --mutate=<name> serves one deliberate break (the run must FAIL); --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage, hadithMenuOpen } from "./harness.mjs";
import { duaRedirectTarget } from "../../app/js/hadith-dua-redirect.js";

const MUT = {
  panelopen: ["js/hadith-browser.js", "  panel.hidden = true;\n  btn.setAttribute(\"aria-haspopup\"", "  panel.hidden = false;\n  btn.setAttribute(\"aria-haspopup\""],
  wraprow: ["css/hadith.css", "flex-wrap: nowrap; overflow-x: auto;", "flex-wrap: wrap; overflow-x: visible;"],
  nocue: ["js/hadith-menu-settings.js", "if (c.hidden === on) c.hidden = !on;", "if (c.hidden === false) c.hidden = true; /* never shows the cue (writes only on a change, so no observer loop) */"],
  cuestay: ["js/hadith-menu-settings.js", "if (c.hidden === on) c.hidden = !on;", "c.hidden = false;"],
  notehome: ["js/hadith-menu-settings.js", "previewSlot.appendChild(fresh[fresh.length - 1]);", "/* left at the top */"],
  tabback: ["js/hadith-browser.js", "    [\"explore\", t(\"Explore\")],\n    [\"search\", t(\"Search\")],", "    [\"collections\", t(\"Encyclopedia\")],\n    [\"explore\", t(\"Explore\")],\n    [\"search\", t(\"Search\")],"],
  nohold: ["js/hadith-menu-settings.js", "holder.appendChild(host);", "void 0;"],
  nodualredirect: ["js/hadith-dua-redirect.js", "  if (q.get(\"view\") === \"dua\") {", "  if (false) {"],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
if (MUTATE) { // a dead anchor must never look like a catch: fail by name, before any page is opened
  const [file, anchor] = MUT[MUTATE];
  if (!fs.readFileSync(`app/${file}`, "utf8").includes(anchor)) { console.log(`  FAIL  mutation anchor missing: ${MUTATE} (${file})`); process.exit(1); }
}
if (process.argv.includes("--prove")) {
  const missed = []; let caught = 0;
  for (const name of Object.keys(MUT)) {
    const r = spawnSync(process.execPath, [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const out = (r.stdout || "").trim(); const ff = out.split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && ff) { caught++; console.log(`  CAUGHT  ${name}: ${ff.trim().slice(0, 130)}`); } else { missed.push(name); console.log(`  MISSED  ${name}`); }
  }
  console.log(`\n==== hadith-menu-bar mutations: ${caught} of ${Object.keys(MUT).length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function open(lang, width, path = "/app/hadith-study.html", ctxIn = null) {
  const ctx = ctxIn ?? await newContext(browser, { appLang: lang, viewport: { width, height: 800 } });
  if (MUTATE && !ctxIn) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, path);
  await page.waitForSelector('button[data-hadith-tab="menu"]', { timeout: 25000 });
  return { ctx, page, errors };
}
const setPreview = (P, role) => P.evaluate((r) => { const c = JSON.parse(localStorage.getItem("qr.sessionContext")); c.viewAsRole = r; localStorage.setItem("qr.sessionContext", JSON.stringify(c)); localStorage.getItem("qr.sessionContext"); return JSON.parse(localStorage.getItem("qr.sessionContext")).viewAsRole; }, role);
const barState = (P) => P.evaluate(() => {
  const kids = [...document.querySelectorAll(".hadith-menubar .hadith-tabs > .hadith-menu > .hadith-menu-btn, .hadith-menubar .hadith-tabs > .hadith-tab")];
  const rects = kids.map((k) => k.getBoundingClientRect());
  return { tabs: kids.map((k) => k.dataset.hadithTab), tops: rects.map((r) => Math.round(r.top)), h: rects.map((r) => Math.round(r.height)), right: Math.max(...rects.map((r) => r.right)),
    lastRight: rects[rects.length - 1].right, vw: document.documentElement.clientWidth, over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    clipped: kids.filter((k) => k.scrollWidth > k.clientWidth + 1).map((k) => k.dataset.hadithTab),
    onBar: ["collections", "commentary", "dua", "topic"].filter((v) => document.querySelector(`.hadith-menubar [data-hadith-tab="${v}"]`)),
    panel: getComputedStyle(document.getElementById("hadithMenu-menu")).display, cue: (() => { const c = document.querySelector("[data-hadith-menu-cue]"); const r = c.getBoundingClientRect(); return { disp: getComputedStyle(c).display, w: Math.round(r.width) }; })(),
    noticeOutside: [...document.querySelectorAll(".nav-preview-notice")].filter((n) => !n.closest("#hadithSettingsHost")).length,
    pickersInDom: ["personSelect", "tenantSelect"].every((id) => !!document.getElementById(id)),
    noticeIn: document.querySelectorAll("#hadithSettingsHost .nav-preview-notice").length };
});

// ---- 0: the redirect function itself (pure), with the Owner's table -----------------------------------------------
check("redirect: ?view=dua&duaPage=3&dua=12 -> dua-study.html?back=1&view=dua&dua=12", duaRedirectTarget("?view=dua&duaPage=3&dua=12") === "dua-study.html?back=1&view=dua&dua=12");
check("redirect: the dword rides along only for the same dua", duaRedirectTarget("?view=dua&duaPage=3&dua=12&dword=12:4") === "dua-study.html?back=1&view=dua&dua=12&dword=12:4" && duaRedirectTarget("?view=dua&dua=12&dword=9:4") === "dua-study.html?back=1&view=dua&dua=12");
check("redirect: ?view=dua&duaPage=2 -> dua-study.html?back=1", duaRedirectTarget("?view=dua&duaPage=2") === "dua-study.html?back=1");
check("redirect: ?resume=dua:7 -> dua-study.html?resume=dua:7", duaRedirectTarget("?resume=dua:7") === "dua-study.html?resume=dua:7");
check("redirect: a Hadith address is NOT redirected (positive control for the three above)", duaRedirectTarget("?resume=hadith:hadeethenc:65070") === null && duaRedirectTarget("") === null);

// ---- 1: the bar, en and bn, five widths -----------------------------------------------------------------------------
for (const lang of ["en", "bn"]) for (const width of [320, 360, 390, 820, 1280]) {
  const tag = `[${lang} ${width}px]`;
  const { ctx, page: P, errors } = await open(lang, width);
  const s = await barState(P);
  check(`${tag} the bar is Menu, Books, Subjects, Explore, Search, in that order`, s.tabs.join() === "menu,books,subjects,explore,search", s.tabs.join());
  check(`${tag} all five are on ONE row`, Math.max(...s.tops) - Math.min(...s.tops) <= 2, JSON.stringify(s.tops)); // 2px: a stacked cue makes the Menu button 1px taller, a wrapped row is 30px+
  check(`${tag} nothing runs off the screen, the page does not scroll sideways`, s.over <= 0 && s.right <= s.vw, `over ${s.over} right ${s.right} vw ${s.vw}`);
  check(`${tag} Search is the last, at the right edge of the row`, s.lastRight === s.right);
  check(`${tag} no label is clipped, every button is at least 36px tall`, s.clipped.length === 0 && Math.min(...s.h) >= 36, `${s.clipped} ${s.h}`);
  check(`${tag} Encyclopedia, Classical Explanations, Dua and Topics are NOT on the bar`, s.onBar.length === 0, s.onBar.join());
  check(`${tag} the Menu panel starts hidden (COMPUTED display)`, s.panel === "none", s.panel);
  check(`${tag} the "Preview" cue is not on the bar with no preview on`, s.cue.disp === "none" && s.cue.w === 0, JSON.stringify(s.cue));
  check(`${tag} no "Previewing as" note sits at the page top`, s.noticeOutside === 0);
  check(`${tag} #personSelect and #tenantSelect are still IN the page while Menu is closed (the page's own scripts find them by id)`, s.pickersInDom);
  if (width === 390 || width === 1280) {
    await hadithMenuOpen(P);
    const m = await P.evaluate(() => { const p = document.getElementById("hadithMenu-menu"), r = p.getBoundingClientRect(); const dua = p.querySelector("a[data-hadith-dua-link]");
      const ph = Math.round(p.querySelector(".hadith-menu-item")?.getBoundingClientRect().height ?? 0);
      return { disp: getComputedStyle(p).display, rows: [...p.querySelectorAll("[data-hadith-tab]")].map((b) => b.dataset.hadithTab), dua: dua?.getAttribute("href"), lang: !!p.querySelector("#hadithContentLang"), col: !!p.querySelector("#hadithColours"),
        heading: !!document.querySelector("#openitiSection > h2"), soon: !!document.querySelector(".openiti-study-soon"), inside: r.left >= -1 && r.right <= innerWidth + 1, duaBox: dua ? Math.round(dua.getBoundingClientRect().right) <= Math.round(r.right) + 1 : false, ph, over: document.documentElement.scrollWidth - innerWidth }; });
    check(`${tag} Menu opens (COMPUTED display shown) with Encyclopedia and Classical Explanations`, m.disp !== "none" && m.rows.join() === "collections,commentary", `${m.disp} ${m.rows}`);
    check(`${tag} Menu has a Dua link to dua-study.html?back=1, inside the panel`, m.dua === "dua-study.html?back=1" && m.duaBox, JSON.stringify([m.dua, m.duaBox]));
    check(`${tag} Menu > Settings has Text language and Card colours`, m.lang && m.col);
    check(`${tag} the panel sits inside the screen`, m.inside && m.over <= 0, JSON.stringify([m.inside, m.over]));
    check(`${tag} the "Hadith Books" heading and the grey "not enabled here yet" note are gone`, !m.heading && !m.soon);
    await P.screenshot({ path: `/tmp/hadith-menu-${lang}-${width}.png` });
  }
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::ERR/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---- 2: the Preview cue, and where the note and the pickers sit ---------------------------------------------------------------
for (const [lang, width] of [["en", 320], ["en", 1280], ["bn", 320], ["bn", 390]]) {
  const tag = `[${lang} ${width}px preview]`;
  const { ctx, page: P } = await open(lang, width);
  const on = await setPreview(P, "student");
  check(`${tag} the student preview is really on (positive control)`, on === "student", String(on));
  await P.reload({ waitUntil: "networkidle" }); await P.waitForSelector('button[data-hadith-tab="menu"]', { timeout: 25000 }); await P.waitForTimeout(500);
  let s = await barState(P);
  const cueWord = lang === "bn" ? "পূর্বরূপ" : "Preview";
  check(`${tag} the Menu button SHOWS the cue while the preview is on (computed display, real width)`, s.cue.disp !== "none" && s.cue.w > 8, JSON.stringify(s.cue));
  check(`${tag} the cue is in the button and says "${cueWord}"`, await P.evaluate((w) => document.querySelector('button[data-hadith-tab="menu"] [data-hadith-menu-cue]')?.textContent.includes(w), cueWord));
  check(`${tag} with the cue on, the five are still on ONE row and inside the screen`, Math.max(...s.tops) - Math.min(...s.tops) <= 2 && s.over <= 0 && s.right <= s.vw, JSON.stringify([s.tops, s.over, s.right, s.vw]));
  check(`${tag} the "Previewing as" note is inside Menu > Settings and NOT at the page top`, s.noticeOutside === 0 && s.noticeIn === 1, JSON.stringify([s.noticeIn, s.noticeOutside]));
  await hadithMenuOpen(P);
  const inMenu = await P.evaluate(() => { const n = document.querySelector("#hadithMenu-menu .nav-preview-notice"), c = document.querySelector("#hadithMenu-menu #contextBar"); const vis = (e) => { const r = e?.getBoundingClientRect(); return !!r && r.width > 0 && r.height > 0; };
    return { note: vis(n), text: n?.textContent.trim().slice(0, 40), pickers: vis(c), tenant: !!c?.querySelector("#tenantSelect"), person: !!c?.querySelector("#personSelect"), topCtx: !!document.querySelector("#hadithCorpusSection ~ #contextBar, body > #contextBar") }; });
  // Person is in Menu > Settings (the Owner, 4A). The Tenant picker is moved into the My account card by the shared account-card
  // script (as on main since the account card landed), so it is asserted to exist in the page, not to sit in Menu.
  check(`${tag} opening Menu shows the note and the Person picker (Tenant lives in the account card, as before)`, inMenu.note && inMenu.pickers && inMenu.person && (await P.evaluate(() => !!document.getElementById("tenantSelect"))), JSON.stringify(inMenu));
  // an old copy of the pickers must not still sit at the top
  check(`${tag} there is ONE set of Tenant/Person pickers on the page`, (await P.evaluate(() => document.querySelectorAll("#contextBar").length)) === 1);
  // preview OFF: the cue is gone
  await setPreview(P, null);
  await P.reload({ waitUntil: "networkidle" }); await P.waitForSelector('button[data-hadith-tab="menu"]', { timeout: 25000 }); await P.waitForTimeout(500);
  s = await barState(P);
  check(`${tag} with the preview OFF the cue is gone (computed display none, no width) and no note remains`, s.cue.disp === "none" && s.cue.w === 0 && s.noticeOutside === 0 && s.noticeIn === 0, JSON.stringify([s.cue, s.noticeIn, s.noticeOutside]));
  await P.screenshot({ path: `/tmp/hadith-preview-${lang}-${width}.png` });
  await ctx.close();
}

// ---- 3: the Menu's Dua link, and the old Dua addresses (rendered, on both Hadith pages) --------------------------------------------
{
  const { ctx, page: P } = await open("en", 390);
  await hadithMenuOpen(P);
  await Promise.all([P.waitForURL(/dua-study\.html/, { timeout: 15000 }), P.click("a[data-hadith-dua-link]")]);
  await P.waitForSelector("h1", { timeout: 15000 });
  check("Menu > Dua opens Dua Study (its own page)", /dua-study\.html\?back=1/.test(P.url()), P.url());
  check("Dua Study shows a Back (the way-back law)", (await P.$$eval("a,button", (xs) => xs.filter((x) => /^← Back/.test(x.textContent.trim())).length)) > 0);
  await ctx.close();
}
for (const page of ["hadith-study.html", "hadith-collections.html"]) {
  for (const [from, want] of [
    [`?view=dua&duaPage=1&dua=5&dword=5:2`, { open: "5", dword: "5:2", back: "1" }],
    [`?view=dua&duaPage=2`, { open: null, back: "1" }],
    [`?resume=dua:7`, { open: "7", back: null }],
  ]) {
    const tag = `[${page}${from}]`;
    const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 800 } });
    if (MUTATE) { const [file, a, b] = MUT[MUTATE]; await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); }); }
    const { page: P } = await openPage(ctx, `/app/${page}${from}`);
    await P.waitForURL(/dua-study\.html/, { timeout: 15000 }).catch(() => {});
    await P.waitForSelector("h1", { timeout: 15000 });
    const u = new URL(P.url());
    check(`${tag} lands on dua-study.html`, /\/dua-study\.html$/.test(u.pathname), P.url());
    check(`${tag} with the same dua/page and the way back`, u.searchParams.get("open") === want.open && u.searchParams.get("back") === want.back && (want.dword ? u.searchParams.get("dword") === want.dword : true), P.url());
    if (want.open) check(`${tag} the dua's card is drawn`, (await P.waitForSelector(`[data-dua-card="${want.open}"]`, { timeout: 15000 }).then(() => true).catch(() => false)));
    else check(`${tag} the Dua page itself is drawn`, (await P.$$eval("h1", (h) => h.some((x) => /Dua/.test(x.textContent)))));
    await ctx.close();
  }
}
// a Hadith address is left alone
{
  const { ctx, page: P } = await open("en", 390, "/app/hadith-study.html?resume=hadith:hadeethenc:65070");
  await P.waitForSelector('[data-hadeethenc-card="65070"]', { timeout: 25000 }).catch(() => {});
  check("a Hadith address (?resume=hadith:hadeethenc:65070) stays on Hadith Study and opens its card", /hadith-study\.html/.test(P.url()) && !!(await P.$('[data-hadeethenc-card="65070"]')));
  await ctx.close();
}
await browser.close();
console.log(`\n==== hadith-menu-bar: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
