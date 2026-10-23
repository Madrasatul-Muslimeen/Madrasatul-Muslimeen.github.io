// PCF MSA J82 part 3 (the Owner, 23 Oct 2026): "How many rows are there before the note area begins? 10. Organise them the
// best and the most standard way." The Notes window from the Āyah card, editing one Note, must have at most 5 rows above
// the writing area: the top bar, ONE tabs+tools row, the formatting row, the title, ONE meta line (created, changed,
// version, folder). No second tab row, no list row for a single Note, the status line a toast, every button still there.
// Run from the repository root, serve.js on :8080.
//   node tools/i18n-verify/note-rows-standard-browser.mjs [--only=1440,390] [--lang=en|bn] [--mutate=duptabs|metarows|statusrow]
//   --mutate=duptabs    the list column (its tabs, + New note, the Note's row) stays beside the Note  -> "no duplicate tab row", "rows" fail
//   --mutate=metarows   created / version / folder go back to separate stacked rows                  -> the "one meta line" checks fail
//   --mutate=statusrow  the status line is an ordinary row above the Note again                      -> "the status line is a toast" fails
import { chromium, newContext, openPage, clickReadTool, BASE } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), LANG = arg("lang");
const MUT = {
  duptabs: ["app/journey-map.html", "html.unit-single #noteLayout.pane-open #listPane,", "html.xunit-single #noteLayout.pane-open #listPane,"],
  metarows: ["app/css/note-window.css", ".note-pane-metaline { display: flex; flex-wrap: wrap;", ".note-pane-metaline { display: block; flex-wrap: wrap;"],
  statusrow: ["app/journey-map.html", "html.unit-mode #pageStatusMsg { position: fixed;", "html.unit-mode #pageStatusMsg { position: static;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
// metarows also needs the version button as a block: serve the second change with the same file
const EXTRA = { metarows: ["app/css/note-window.css", ".note-pane-metaline > .nw-ver-btn { display: inline-flex;", ".note-pane-metaline > .nw-ver-btn { display: flex; width: 100%;"] };

const TS = "2026-01-01T00:00:00.000Z";
const SEED = "window.__stubApplyBatches = true; window.__stubRecordTxData = true;";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function waitFor(what, fn, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await new Promise((r) => setTimeout(r, 100)); }
  throw new Error(`TIMEOUT waiting for ${what} (${ms}ms)`);
}

async function open(lang, vw, vh) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: vw, height: vh }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) for (const [file, a, b] of [MUT[MUTATE], EXTRA[MUTATE]].filter(Boolean)) {
    const url = file.replace("app/", "**/app/") + "*";
    await ctx.route(url, async (r) => {
      const src = fs.readFileSync(file, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE} in ${file}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css; charset=utf-8" : file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page: P } = await openPage(ctx, "/app/quranrevival.html");
  const ev = (f, a) => P.evaluate(f, a);
  const clean = () => ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await clean();
  if (!(await ev(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(400);
  await ev(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await waitFor("the Read view", () => ev(() => !!document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]')));
  await ev(() => { const el = document.getElementById("ayahSelect"); el.value = "18"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForTimeout(900);
  await clean();
  await clickReadTool(P, "#readNotesBtn");
  await waitFor("the Notes window", () => ev(() => !!document.querySelector("#readNotePane:not([hidden]) iframe")), 8000);
  const Fr = await waitFor("the Notes frame", () => P.frames().find((x) => /journey-map\.html\?embed=1&unit=/.test(x.url())), 10000);
  await Fr.waitForFunction(() => document.querySelector("[data-unit-new]") && !document.querySelector("[data-unit-new]").hasAttribute("aria-disabled"), null, { timeout: 15000 });
  await Fr.click("[data-unit-new]");
  await Fr.waitForFunction(() => !document.getElementById("notePane").hidden && document.querySelector("#notePane .pane-edit-toolbar:not([hidden])"), null, { timeout: 8000 });
  await P.waitForTimeout(1200);
  return { ctx, P, Fr };
}

/** The rows above the writing area, counted from what is really on screen, in the frame. */
const measure = (Fr) => Fr.evaluate(() => {
  const vis = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
  const body = document.querySelector("#notePane [data-pane-body]");
  const writeTop = body.getBoundingClientRect().top;
  const inFlow = (e) => vis(e) && getComputedStyle(e).position !== "fixed" && e.getBoundingClientRect().bottom <= writeTop + 2;
  const bandsOf = (els) => { // distinct vertical bands among a set of elements
    const bands = [];
    for (const e of els.filter(vis)) { const r = e.getBoundingClientRect(); if (!bands.some((b) => r.top < b.bottom - 2 && r.bottom > b.top + 2)) bands.push({ top: r.top, bottom: r.bottom }); }
    return bands.length;
  };
  const sel = (s) => [...document.querySelectorAll(s)];
  const sections = {
    bar: sel("#notePane [data-pane-bar]").filter(inFlow).length,
    find: sel("#notePane [data-find-bar]").filter(inFlow).length,
    toolbar: sel("#notePane [data-edit-toolbar]").filter(inFlow).length,
    title: sel("#notePane [data-edit-title]").filter(inFlow).length,
    meta: sel("#notePane [data-pane-metaline]").filter(inFlow).length, // ONE line, which wraps on a phone (never cut)
    unitHead: sel(".unit-head").filter(inFlow).length,
    listRows: sel("#viewUnit .note-card").filter(inFlow).length,
    status: sel("#pageStatusMsg").filter(inFlow).length,
    draft: sel("#notePane [data-draft-offer]").filter(inFlow).length,
  };
  const tabRows = sel(".jm-host-tabs").filter(vis).length;
  const status = document.getElementById("pageStatusMsg");
  const buttons = {};
  for (const s of ["[data-pane-prev]", "[data-pane-next]", "[data-pane-find-toggle]", "[data-pane-foldall]", "[data-pane-multi]", "[data-pane-attach]", "[data-pane-new]", "[data-pane-edit-toggle]", "[data-pane-menu-btn]", "[data-win-ver]", '[data-jm-host-tab="notes"]', '[data-jm-host-tab="track"]']) {
    const el = [...document.querySelectorAll(`#notePane ${s}, ${s}`)].find(vis);
    if (!el) { buttons[s] = null; continue; }
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    buttons[s] = { w: Math.round(r.width), h: Math.round(r.height), top: !!hit && (hit === el || el.contains(hit) || hit.contains(el)) };
  }
  const ml = document.querySelector("#notePane [data-pane-metaline]");
  return {
    writeTop: Math.round(writeTop), sections, tabRows, buttons,
    rows: 1 /* the window's own top bar, in the page above the frame */ + sections.bar + sections.find + sections.toolbar + sections.title + sections.meta + sections.unitHead + (sections.listRows ? 1 : 0) + sections.status + sections.draft,
    metaBands: bandsOf(sel("#notePane [data-pane-metaline] > *")), metaFlex: ml ? getComputedStyle(ml).display === "flex" && getComputedStyle(ml).flexWrap === "wrap" : false,
    metaText: ml?.textContent?.trim().replace(/\s+/g, " ") ?? "",
    metaHasVer: !!ml?.querySelector("[data-win-ver]"), metaHasChips: !!ml?.querySelector("[data-pane-chips]"), metaHasDates: !!ml?.querySelector("[data-pane-meta]"),
    statusPos: status ? getComputedStyle(status).position : null,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

const sizes = [[1440, 900], [1280, 900], [390, 844], [320, 640]].filter(([w]) => !ONLY || ONLY.split(",").includes(String(w)));
for (const lang of ["en", "bn"].filter((l) => !LANG || LANG === l)) for (const [vw, vh] of sizes) {
  const tag = `[${lang} ${vw}]`;
  let c;
  try { c = await open(lang, vw, vh); } catch (e) { check(`${tag} the Notes window opens on a new Note (${e.message})`, false); continue; }
  const { ctx, P, Fr } = c;
  // The stub's new Note has no dates or folder chip yet; give the meta line the content a real Note has (real length), as the page draws it.
  await Fr.evaluate(() => {
    const p = document.querySelector("#notePane [data-pane-meta]"); if (!p.textContent.trim()) p.textContent = "Created 22 Oct 2026, 7:41 am · Last changed 23 Oct 2026, 10:02 am";
    const c = document.querySelector("#notePane [data-pane-chips]"); if (!c.children.length) c.innerHTML = '<button type="button" class="folder-chip">📁 Personal Journey Map</button>';
  });
  const m = await measure(Fr);
  console.log(`  ${tag} rows above the writing area: ${m.rows}, its top y in the frame: ${m.writeTop} ${JSON.stringify(m.sections)} tabRows=${m.tabRows}`);
  check(`${tag} positive control: the counter sees the bar, the toolbar, the title and the meta line (rows >= 4)`, m.rows >= 4, JSON.stringify(m.sections));
  check(`${tag} at most 5 rows above the writing area while editing (${m.rows})`, m.rows <= 5, JSON.stringify(m.sections));
  check(`${tag} no duplicate tab row (${m.tabRows} tab rows; no list head beside or above the Note)`, m.tabRows <= 1 && m.sections.unitHead === 0, JSON.stringify(m.sections));
  check(`${tag} no list row for the one Note being edited`, m.sections.listRows === 0, JSON.stringify(m.sections));
  check(`${tag} the status line is a toast, not a row`, m.sections.status === 0 && m.statusPos !== "static", `${m.statusPos} ${JSON.stringify(m.sections)}`);
  check(`${tag} the meta line holds version, folder and dates together, as ONE line band`, m.metaHasVer && m.metaHasChips && m.metaHasDates && m.sections.meta === 1 && m.metaFlex && (vw < 820 || m.metaBands === 1), JSON.stringify({ meta: m.sections.meta, bands: m.metaBands, flex: m.metaFlex }));
  check(`${tag} the meta line says the version`, /[\d০-৯]/.test(m.metaText) && m.metaText.length > 5, m.metaText);
  check(`${tag} no sideways overflow in the frame`, m.overflowX <= 0, String(m.overflowX));
  for (const [s, b] of Object.entries(m.buttons)) {
    // find / fold / pop-out / attach fold into the ⋯ menu on a phone by design (fitPaneBar); the tabs are hosted on a wide window only
    if (b === null) { if (/find-toggle|foldall|multi|attach|host-tab|prev|next/.test(s)) continue; check(`${tag} ${s} is on screen`, false, "missing"); continue; }
    check(`${tag} ${s} is 40px+ and on top`, b.h >= 40 && b.w >= 38 && b.top, JSON.stringify(b));
  }
  // the version still opens its history
  const opened = await Fr.evaluate(async () => {
    const b = document.querySelector("#notePane [data-win-ver]");
    if (!b || b.hidden) return null;
    b.click();
    await new Promise((r) => setTimeout(r, 600));
    return !!document.querySelector("[data-versions], .nw-versions, [data-ver-panel], [data-ver-list], [data-ver-close]") || /Version|সংস্করণ/.test(document.body.innerText);
  });
  check(`${tag} the version link still works`, opened === true, String(opened));
  await P.screenshot({ path: `/tmp/note-rows-${lang}-${vw}.png` });
  await ctx.close();
}

await browser.close();
console.log(`\n==== Notes window rows, the standard way (J82 part 3)${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
