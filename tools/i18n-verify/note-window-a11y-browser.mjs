// Audit part 143 (issue #1370): keyboard, accessible names, opened surfaces and contrast on the v13 NOTE:
//   page "qr-note"   the shared Note window (app/js/note-opener.js) on quranrevival.html, opened from Study > Notes ("menu") or by the
//                    Ayah-card call with an Ayah block, long title and long unit label ("api"); its parent chrome (bar, X, count line,
//                    Attach sheet) AND the Note page inside its iframe
//   page "notes"     app/notes.html     page "journey"  app/journey-map.html     page "journey-new"  app/journey-map.html?embed=1&new=1
// REPORT ONLY: no file under app/ changes. Method, helpers and thresholds are part 142's (shared-tools-a11y-browser.mjs; its in-page
// helper block is read from that file, not copied). Measured at 360 390 768 820 1024 1180 1440, en and bn:
//   (a) names  (b) Tab reaches every visible control + a ring on each  (b2) the Note window HOLDS Tab (focus never lands on the page behind)
//   (c) contrast (4.5:1, 3:1 large) against the real background        (s) surfaces: Enter/Space open, Escape closes, focus returns to the opener
// Run from the repository root with `node serve.js` on 8080:
//   node tools/i18n-verify/note-window-a11y-browser.mjs [--page=qr-note|notes|journey|journey-new] [--width=390] [--lang=bn] [--list] [--shots]
//   --mutate=noring   (must FAIL: every focus ring removed)
//   --mutate=trapfix  (must FAIL: Tab is swallowed on the page, so the Tab walk cannot move)
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const LIST = process.argv.includes("--list"), SHOTS = process.argv.includes("--shots");
const MUTATE = arg("mutate");
const OUT = "tools/i18n-verify/out/note-window-a11y";
fs.mkdirSync(OUT, { recursive: true });
const ALL_WIDTHS = [[360, 740], [390, 844], [768, 1024], [820, 1180], [1024, 768], [1180, 820], [1440, 900]];
const WIDTHS = ALL_WIDTHS.filter(([w]) => !arg("width") || String(w) === arg("width"));
const LANGS = ["en", "bn"].filter((l) => !arg("lang") || l === arg("lang"));
const TAB_CAP = 300;

// part 142's in-page helper block (window.__A11Y), read from its source so both audits measure the same way
const src142 = fs.readFileSync("tools/i18n-verify/shared-tools-a11y-browser.mjs", "utf8");
const ia = src142.indexOf("const INSTALL = "), ib = src142.indexOf("\n};\n", ia);
if (ia < 0 || ib < 0) throw new Error("part 142's INSTALL block was not found");
const INSTALL = (0, eval)("(" + src142.slice(ia + "const INSTALL = ".length, ib + 3).replace(/;\s*$/, "") + ")");
const NORING_CSS = "*,*:focus,*:focus-visible{outline:none!important;box-shadow:none!important}";
const LONG = "A very long Note title that a real reader writes: the reasons for patience and gratitude in 2:153-157, with a 6 deep folder path";
const LONG_BN = "একটি খুব দীর্ঘ নোটের শিরোনাম: ২:১৫৩-১৫৭ আয়াতে ধৈর্য ও কৃতজ্ঞতার কারণসমূহ, ছয় স্তরের ফোল্ডার পথসহ";
const SEED = "window.__stubApplyBatches = true; window.__stubRecordTxData = true;";
const settle = (P) => P.waitForTimeout(1200);
const NOISE = /ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const findings = new Map(), failedViews = [];
const addFinding = (page, view, kind, msg, where) => {
  const k = `${page}|${view}|${kind}|${msg}`;
  const e = findings.get(k) || { page, view, kind, msg, where: new Set() };
  e.where.add(where); findings.set(k, e);
};

// ---- audit one document (E = a Page or a Frame; P = the Page that owns the keyboard) ----
const ENGLISH = /\b(Close|Back|Next|Search|Save|Open|Copy|Show|Hide|Edit|Delete|Cancel|Done|Folders?|Attach|Note|Notes|Menu|New|Find|Move|Rename)\b/i;
async function audit(P, E, lang, scoped = false) {
  const names = await E.evaluate(() => window.__A11Y.names());
  const nameDefects = names.filter((n) => !n.name).map((n) => `${n.key} has no accessible name`);
  const english = lang === "bn" ? names.filter((n) => n.name && /[A-Za-z]{3,}/.test(n.name) && n.name.length <= 45 && ENGLISH.test(n.name)).map((n) => `${n.key} "${n.name.slice(0, 40)}"`) : [];
  // scoped: only the Note window's own text (the page behind it is covered, so its text is not what the reader sees)
  if (scoped) await E.evaluate(() => { for (const e of document.body.children) if (e.id !== "noteOpener") { e.dataset.a11yPrevVis = e.style.visibility; e.style.visibility = "hidden"; } });
  const con = await E.evaluate(() => window.__A11Y.contrast());
  if (scoped) await E.evaluate(() => { for (const e of document.body.children) if (e.id !== "noteOpener" && "a11yPrevVis" in e.dataset) { e.style.visibility = e.dataset.a11yPrevVis; delete e.dataset.a11yPrevVis; } });
  const contrastDefects = con.fail.map((c) => `${c.key} "${c.txt}" ${c.ratio}:1 (need ${c.need}) ${c.fg} on ${c.bg} ${c.px}px`);
  const exp = await E.evaluate(() => window.__A11Y.expected());
  const reached = new Set(), ringBad = [], ringWeak = [];
  await E.evaluate(() => {
    window.__A11Y.seen = new Set(); document.getElementById("__tabstart")?.remove();
    const m = document.createElement("span"); m.id = "__tabstart"; m.tabIndex = -1;
    m.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px;outline:none"; document.body.prepend(m); m.focus();
  });
  let bodyHits = 0, steps = 0;
  for (; steps < TAB_CAP; steps++) {
    await P.keyboard.press("Tab");
    const d = await E.evaluate(() => window.__A11Y.focused());
    if (d.body) { if (++bodyHits > 1) break; continue; }
    const uid = d.id ?? `${d.key}@${Math.round(d.left)},${Math.round(d.top)}`;
    if (reached.has(uid)) break;
    reached.add(uid);
    if (d.key.startsWith("iframe")) continue; // focus passing through the frame element; the frame's own controls are audited in the frame
    if (!d.ringOn) ringBad.push(`${d.key} "${(d.name || "").slice(0, 24)}"`);
    else if (d.ringRatio !== null && d.ringRatio < 3) ringWeak.push(`${d.key} ring ${Math.round(d.ringRatio * 100) / 100}:1`);
  }
  // the block's "hide" text (no arrow since v13.10, J109) is an aria-hidden, tabindex=-1 twin of the switch beside it (note-ref-ui.js:26): not a control of its own
  const unreached = (await E.evaluate(() => window.__A11Y.unreached())).filter((e) => !(e.key.includes("data-ref-sw") && /^[▾▸]/.test(e.name || ""))).map((e) => `${e.key} "${(e.name || "").slice(0, 24)}"${e.tabindex < 0 ? " (tabindex=-1)" : ""}`);
  return { nameDefects, english, contrastDefects, unknown: con.unknown, unreached, ringBad, ringWeak, stops: reached.size, expected: exp.length };
}
const report = (tag, pg, view, where, r) => {
  const ind = "\n      ";
  check(`${tag}: (a) every visible control has a name`, r.nameDefects.length === 0, ind + r.nameDefects.slice(0, 4).join(ind));
  if (where.endsWith("bn")) check(`${tag}: (a) no chrome name is English`, r.english.length === 0, ind + r.english.slice(0, 4).join(ind));
  check(`${tag}: (b) Tab reaches every visible control`, r.unreached.length === 0, ind + r.unreached.slice(0, 4).join(ind));
  check(`${tag}: (b) every focused control shows a ring`, r.ringBad.length === 0, ind + r.ringBad.slice(0, 4).join(ind));
  check(`${tag}: (c) all text meets its ratio`, r.contrastDefects.length === 0, ind + r.contrastDefects.slice(0, 4).join(ind));
  r.nameDefects.forEach((m) => addFinding(pg, view, "DEFECT names", m, where));
  r.english.forEach((m) => addFinding(pg, view, "DEFECT bn-english-chrome", m, where));
  r.unreached.forEach((m) => addFinding(pg, view, "DEFECT tab-unreachable", m, where));
  r.ringBad.forEach((m) => addFinding(pg, view, "DEFECT no-ring", m, where));
  r.contrastDefects.forEach((m) => addFinding(pg, view, "DEFECT contrast", m, where));
  r.ringWeak.forEach((m) => addFinding(pg, view, "MINOR weak-ring", m, where));
  r.unknown.forEach((u) => addFinding(pg, view, "INFO contrast-not-measurable", `${u.key} "${u.txt}": ${u.why}`, where));
  if (LIST) console.log(`  info  ${tag}: names ${r.nameDefects.length}, unreached ${r.unreached.length}/${r.expected}, ringless ${r.ringBad.length}/${r.stops}, contrast ${r.contrastDefects.length}`);
};

// ---- positive controls: a defective thing injected into a page ----
{
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 844 }, extraSeedJs: SEED });
  const { page: P } = await openPage(ctx, "/app/notes.html");
  await settle(P);
  await P.evaluate(INSTALL, "#none");
  const clean = await audit(P, P, "en");
  await P.evaluate(() => {
    const h = document.createElement("div"); h.style.cssText = "position:relative;padding:8px;background:#fff";
    h.innerHTML = '<button id="inj-unnamed" style="width:44px;height:44px"><span></span></button><button id="inj-notab" tabindex="-1" style="height:44px">Injected not reachable</button><p style="margin:4px;color:#999;background:#aaa;font-size:16px">Injected grey on grey line</p>';
    document.body.prepend(h);
  });
  const bad = await audit(P, P, "en");
  check("positive control (a): an injected unnamed button is reported", bad.nameDefects.some((m) => m.includes("inj-unnamed")));
  check("positive control (b): an injected tabindex=-1 button is reported unreachable", bad.unreached.some((m) => m.includes("inj-notab")));
  check("positive control (c): an injected grey-on-grey line is reported", bad.contrastDefects.some((m) => m.includes("Injected grey")));
  check("positive control: the clean page has none of the three", !clean.nameDefects.some((m) => m.includes("inj-")) && !clean.unreached.some((m) => m.includes("inj-")) && !clean.contrastDefects.some((m) => m.includes("Injected")));
  check("positive control (b): the Tab walk really moved", clean.stops > 3 && MUTATE !== "trapfix", `stops ${clean.stops} of ${clean.expected}`);
  await P.addStyleTag({ content: NORING_CSS });
  const ring = await audit(P, P, "en");
  check("positive control (b): with focus outlines removed every reached control is reported ringless", ring.ringBad.length >= ring.stops - 1 && ring.stops > 3, `${ring.ringBad.length}/${ring.stops}`);
  await ctx.close();
}

// ---- the Note window on quranrevival.html ----
async function openWindow(P, lang, viaMenu) {
  await settle(P);
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (viaMenu) {
    if (!(await P.evaluate(() => document.getElementById("tabNoteBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(250); }
    await P.click("#tabNoteBtn");
  } else {
    await P.evaluate(async ({ title, label, back }) => {
      const m = await import("/app/js/note-opener.js");
      const ref = await m.loadRefFor("ayah", "2:255");
      m.openNewNote({ ref, unitKey: "ayah:2:255", unitLabel: label, title, backLabel: back, count: 3, onOpenExisting: () => {} });
    }, { back: lang === "bn" ? "আয়াত কার্ডে ফিরুন" : "Back to Āyah card", title: lang === "bn" ? LONG_BN : LONG, label: lang === "bn" ? LONG_BN.slice(0, 40) : LONG.slice(0, 60) });
  }
  const el = await P.waitForSelector("#noteOpener:not([hidden]) iframe", { timeout: 15000 });
  let f = null;
  for (let i = 0; i < 150 && !f; i++) { const c = await el.contentFrame(); if (c && /journey-map\.html\?embed=1&new=1/.test(c.url())) f = c; else await P.waitForTimeout(100); }
  if (!f) throw new Error("the Note frame did not load");
  await f.waitForSelector("[data-nn-tool]", { timeout: 25000 });
  await P.waitForTimeout(800);
  return f;
}

const SURFACES = [
  { id: "attach", tool: "[data-nn-tool=attach]", modal: true, open: (P) => P.evaluate(() => { const e = document.querySelector("#noteOpener [data-no-attach]"); return !!e && !e.hidden; }) },
  { id: "folders", tool: "[data-nn-tool=folders]", open: (_, F) => F.evaluate(() => !!document.querySelector(".folder-picker-overlay, .folder-picker")) },
  { id: "more-menu", tool: "[data-pane-menu-btn]", open: (_, F) => F.evaluate(() => document.querySelector("[data-pane-menu-btn]")?.getAttribute("aria-expanded") === "true") },
];

for (const [w, h] of WIDTHS) for (const lang of LANGS) {
  const where = `${w}${lang}`;
  const want = (id) => !arg("page") || arg("page") === id;
  const mk = async (path) => {
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: SEED });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const { page, errors } = await openPage(ctx, path);
    return { ctx, P: page, errors };
  };
  // ---------- qr-note ----------
  if (want("qr-note")) for (const via of ["menu", "api"]) {
    const tag = `qr-note(${via}) / ${w} / ${lang}`;
    const { ctx, P, errors } = await mk("/app/quranrevival.html");
    let f;
    try { f = await openWindow(P, lang, via === "menu"); } catch (e) { failedViews.push(tag); check(`${tag}: the Note window opened (positive control)`, false, String(e.message).slice(0, 160)); await ctx.close(); continue; }
    await P.evaluate(INSTALL, "#noteOpener:not([hidden])");
    await f.evaluate(INSTALL, "#none");
    if (MUTATE === "noring") { await P.addStyleTag({ content: NORING_CSS }); await f.evaluate((c) => { const s = document.createElement("style"); s.textContent = c; document.head.appendChild(s); }, NORING_CSS); }
    if (MUTATE === "trapfix") await P.evaluate(() => document.addEventListener("keydown", (e) => { if (e.key === "Tab") e.preventDefault(); }, true));
    const full = await P.evaluate(() => document.getElementById("noteOpener").classList.contains("no-full"));
    check(`${tag}: the window is ${w < 1024 ? "full screen" : "floating"} (positive control)`, full === (w < 1024));
    if (SHOTS && (w === 390 || w === 1180)) await P.screenshot({ path: `${OUT}/qr-note-${via}-${w}-${lang}.png` });
    report(`${tag} [parent chrome]`, "qr-note", `${via}-parent`, where, await audit(P, P, lang, true));
    const fa = await audit(P, f, lang);
    check(`${tag} [iframe]: the Tab walk moved (positive control)`, fa.stops > 3 || MUTATE === "trapfix", `stops ${fa.stops}`);
    report(`${tag} [Note page in iframe]`, "qr-note", `${via}-frame`, where, fa);
    // (b2) the FULL-SCREEN window holds Tab: the page behind must never take focus. v13.07 (audit 143 D1/D2, the Architect):
    // the FLOATING window (from 1024px) is non-modal on purpose -- the page beside it stays usable (J81, J108) -- so there
    // it must NOT claim aria-modal, and Tab may move on to the page.
    const floating = w >= 1024;
    if (floating) {
      const amF = await P.evaluate(() => document.getElementById("noteOpener").getAttribute("aria-modal"));
      check(`${tag}: (b2) the floating window is non-modal (no aria-modal, page not inert)`, amF !== "true" && await P.evaluate(() => ![...document.body.children].some((e) => e.inert)), `aria-modal ${amF}`);
    } else {
      // minimised, the window is a chip: the page is usable again; brought back, it is held again
      const inertNow = () => P.evaluate(() => [...document.body.children].filter((e) => e.inert).length);
      const before = await inertNow();
      await P.evaluate(() => document.querySelector("#noteOpener .mm-min-btn")?.click());
      await P.waitForTimeout(300);
      const minimised = await inertNow();
      await P.evaluate(() => document.querySelector('[data-mm-min-chip="newnote"]')?.click());
      await P.waitForTimeout(300);
      const back = await inertNow();
      check(`${tag}: (b2) minimising the full-screen window frees the page; bringing it back holds it again`, before > 0 && minimised === 0 && back >= before /* >=: an element the page added after the first hold (its late splash) is held too */, `inert ${before} -> ${minimised} -> ${back}`);
    }
    await P.evaluate(() => document.querySelector("#noteOpener .no-close").focus());
    let leaked = null;
    for (let i = 0; i < 60 && !leaked && !floating; i++) {
      await P.keyboard.press("Tab");
      leaked = await P.evaluate(() => { const e = document.activeElement, wn = document.getElementById("noteOpener"); return e && e !== document.body && !wn.contains(e) ? (e.id || e.tagName) : null; });
    }
    if (!floating) check(`${tag}: (b2) Tab never reaches the page behind the Note window`, !leaked, `focus reached ${leaked}`);
    if (leaked) addFinding("qr-note", "window", "DEFECT window-does-not-hold-tab", `Tab leaves #noteOpener onto the page behind (${leaked}): role=dialog with no aria-modal and no trap (note-opener.js:94)`, where);
    const am = await P.evaluate(() => document.getElementById("noteOpener").getAttribute("aria-modal"));
    if (w < 1024 && am !== "true") addFinding("qr-note", "window", "DEFECT full-screen-not-aria-modal", "the full-screen Note window covers the whole page but is role=dialog without aria-modal=true (note-opener.js:94)", where);
    // (s) Escape with focus on the X closes the window; focus returns to the opener (Notes sits in the Study menu)
    await P.evaluate(() => document.querySelector("#noteOpener .no-close").focus());
    await P.keyboard.press("Escape");
    await P.waitForTimeout(1500);
    const closed = await P.evaluate(() => document.getElementById("noteOpener").hidden);
    check(`${tag}: (s) Escape closes the Note window`, closed);
    if (!closed) addFinding("qr-note", "window", "DEFECT escape-no-close", "Escape on the X does not close the Note window", where);
    else if (via === "menu") {
      const act = await P.evaluate(() => { const e = document.activeElement; return e && e !== document.body ? (e.id || e.tagName) : "body"; });
      check(`${tag}: (s) focus returns to the Notes button (or the Study button whose menu holds it) after Escape`, /^(tabNoteBtn|tabStudyBtn)$/.test(act), `focus is on ${act}`);
      if (!/^(tabNoteBtn|tabStudyBtn)$/.test(act)) addFinding("qr-note", "window", "DEFECT focus-not-returned", `after closing the Note window focus is on ${act}, not the Notes button that opened it (the button sits in the Study menu, quranrevival.html:25949)`, where);
    }
    const pe = errors.filter((e) => !NOISE.test(e));
    check(`${tag}: no page errors`, pe.length === 0, pe.slice(0, 2).join(" | "));
    await ctx.close();
  }
  // ---------- surfaces inside the Note ----------
  if (want("qr-note")) for (const s of SURFACES) {
    const t2 = `qr-note surface ${s.id} / ${w} / ${lang}`;
    const { ctx, P, errors } = await mk("/app/quranrevival.html");
    void errors;
    let F;
    try { F = await openWindow(P, lang, true); } catch (e) { failedViews.push(t2); check(`${t2}: the window opened (positive control)`, false, String(e.message)); await ctx.close(); continue; }
    const activeInFrame = () => F.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return "body"; return e.dataset?.nnTool ? "tool:" + e.dataset.nnTool : e.hasAttribute("data-pane-menu-btn") ? "menu-btn" : e.tagName + "." + String(e.className).split(" ")[0]; });
    const focusTool = () => F.evaluate((q) => document.querySelector(q)?.focus(), s.tool);
    await focusTool();
    check(`${t2}: closed before it is opened (positive control)`, !(await s.open(P, F)));
    await P.keyboard.press("Enter");
    await P.waitForTimeout(700);
    const op = await s.open(P, F);
    check(`${t2}: Enter opens it`, op);
    if (!op) { addFinding("qr-note", s.id, "DEFECT surface-enter", "Enter on the opener does not open it", where); await ctx.close(); continue; }
    if (s.modal) {
      const inside = await P.evaluate(() => !!document.activeElement?.closest?.("[data-no-attach]"));
      check(`${t2}: focus moves into the sheet`, inside);
      if (!inside) addFinding("qr-note", s.id, "DEFECT sheet-focus", "opening Attach does not move focus into the sheet", where);
      let esc = null;
      for (let i = 0; i < 12 && !esc; i++) { await P.keyboard.press("Tab"); esc = await P.evaluate(() => { const e = document.activeElement; return e && e !== document.body && !e.closest("[data-no-attach]") ? (e.id || e.tagName) : null; }); }
      check(`${t2}: Tab stays inside the aria-modal Attach sheet`, !esc, `focus reached ${esc}`);
      if (esc) addFinding("qr-note", s.id, "DEFECT sheet-not-trapped", `Tab leaves the aria-modal Attach sheet (note-opener.js:271, no trap) and reaches ${esc}`, where);
      await P.evaluate(() => document.querySelector("[data-no-attach-input]")?.focus());
    }
    await P.keyboard.press("Escape");
    await P.waitForTimeout(700);
    const still = await s.open(P, F);
    check(`${t2}: Escape closes it`, !still);
    if (still) { addFinding("qr-note", s.id, "DEFECT escape-no-close", "Escape does not close it", where); await ctx.close(); continue; }
    const back = await activeInFrame();
    const ok = back === `tool:${s.id}` || (s.id === "more-menu" && back === "menu-btn");
    check(`${t2}: focus returns to the opener`, ok, `focus is on ${back}`);
    if (!ok) addFinding("qr-note", s.id, "DEFECT focus-not-returned", `after Escape focus is on ${back}, not the opener`, where);
    await focusTool();
    await P.keyboard.press("Space");
    await P.waitForTimeout(700);
    const op2 = await s.open(P, F);
    check(`${t2}: Space opens it`, op2);
    if (!op2) addFinding("qr-note", s.id, "DEFECT surface-space", "Space on the opener does not open it", where);
    await ctx.close();
  }
  // ---------- stand-alone pages ----------
  for (const pg of [
    { id: "notes", path: "/app/notes.html" }, { id: "journey", path: "/app/journey-map.html" }, { id: "journey-new", path: "/app/journey-map.html?embed=1&new=1" },
  ].filter((p) => want(p.id))) {
    const tag = `${pg.id} / ${w} / ${lang}`;
    const { ctx, P, errors } = await mk(pg.path);
    try {
      await P.waitForTimeout(pg.id === "notes" ? 1000 : 2000);
      await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
      await P.evaluate(INSTALL, "#none");
    } catch (e) { failedViews.push(tag); check(`${tag}: the page opened (positive control)`, false, String(e.message)); await ctx.close(); continue; }
    if (MUTATE === "noring") await P.addStyleTag({ content: NORING_CSS });
    check(`${tag}: rendered text (positive control)`, (await P.evaluate(() => document.body.innerText.length)) > 20);
    report(tag, pg.id, "opens", where, await audit(P, P, lang));
    if (SHOTS && (w === 390 || w === 1180)) await P.screenshot({ path: `${OUT}/${pg.id}-${w}-${lang}.png` });
    const pe = errors.filter((e) => !NOISE.test(e));
    check(`${tag}: no page errors`, pe.length === 0, pe.slice(0, 2).join(" | "));
    await ctx.close();
  }
}

fs.writeFileSync(`${OUT}/findings-${arg("page") || "all"}-${arg("width") || "all"}-${arg("lang") || "all"}.json`, JSON.stringify({ failedViews, findings: [...findings.values()].map((f) => ({ ...f, where: [...f.where] })) }, null, 1));
console.log("\n=== numbered findings (page | view | kind | measurement | width+language) ===");
const order = (k) => (k.startsWith("DEFECT") ? 0 : k.startsWith("MINOR") ? 1 : 2);
let n = 0;
for (const f of [...findings.values()].sort((x, y) => order(x.kind) - order(y.kind) || x.page.localeCompare(y.page) || x.kind.localeCompare(y.kind))) {
  n++;
  if (!LIST && f.kind.startsWith("INFO")) continue;
  console.log(`  ${f.kind.startsWith("DEFECT") ? "DEFECT" : "INFO  "} #${n} ${f.page} | ${f.view} | ${f.kind} | ${f.msg.slice(0, 200)} | ${[...f.where].sort().join(",")}`);
}
check("every view and surface opened at every width and language", failedViews.length === 0, failedViews.slice(0, 6).join(", "));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
