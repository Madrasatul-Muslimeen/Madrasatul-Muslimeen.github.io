// PCF MSA J82 part 3 (the Owner, 23 Oct 2026: "How many rows are there before the note area begins? 10. Organise them the
// best and the most standard way."). Since v12.26 (J81 part 3) a Note tapped in the Read view's Notes pane opens in the
// Mapping My Journey window, where reading it has 3 rows above the text (window bar, Note bar, title) and editing adds the
// formatting. This proves, editing in that window at 1440 / 1280 / 390 (en, bn):
//   - at most 5 rows above the writing area on a computer (window bar, Note bar, title, tabs, tools), 6 on a phone;
//   - the formatting is tidy: the tabs and the chosen group's tools are ONE line when they fit, else the tabs on one line
//     and the tools under them -- never a tool (⌫) wrapped alone onto a line of its own;
//   - positive control: the counter sees the Note bar, the title and the formatting.
//   - the window is the NOTE window: the Note takes the window's width (at 1440 the window would otherwise be three
//     panels with the Note a 350px third column), and ← Back gives Mapping My Journey its panels again.
// --mutate=inline  the "does it fit" fallback removed (fitToolbar keeps tb-inline) -> the 1280 tidy check fails
// --mutate=focus   a pop-up opened on a Note keeps the panels                     -> the 1440 checks fail
// Run from the repository root with serve.js on :8080.
import fs from "node:fs";
import { chromium, newContext, openPage, clickReadTool } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `  ${detail}` : ""}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate"), LANG = arg("lang");
const MUT = { focus: ["journey-map.html", "if (noteFocus) return \"narrow\";", ""], inline: ["js/note-window.js", "if (tops.length && Math.max(...tops) - Math.min(...tops) > 4) tb.classList.remove(\"tb-inline\");", ""] };
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const TS = "2026-01-01T00:00:00.000Z";
const own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: "test-uid" };
const NOTES = [{ _id: "t1__n256", noteId: "n256", ...own, title: "Started on 2:256", bodyHtml: "<p>No compulsion in religion.</p>", status: "active", visibility: "private", currentRevisionId: "n256-r1" }];
const SOURCES = [{ _id: "t1__s256", sourceLinkId: "s256", ...own, noteId: "n256", sourceKey: "ayah:2:256", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active" }];
const SEED = `window.__stubApplyBatches = true; window.__stubRecordTxData = true;
DATA.notes = [...(DATA.notes ?? []), ...${JSON.stringify(NOTES)}]; DATA.noteSources = [...(DATA.noteSources ?? []), ...${JSON.stringify(SOURCES)}];`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(name, fn, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(100); }
  throw new Error(`TIMEOUT waiting for ${name}`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"].filter((l) => !LANG || l === LANG)) for (const [w, h] of [[1440, 900], [1280, 900], [390, 844]]) {
  const tag = `[${lang} ${w}]`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  try {
    const { page: P } = await openPage(ctx, "/app/quranrevival.html");
    const ev = (f, a) => P.evaluate(f, a);
    const kill = () => ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await kill();
    if (!(await ev(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await sleep(150); }
    await P.click("#tabReadBtn"); await sleep(400);
    await ev(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await until("surah 2", () => ev(() => !!document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]')));
    await ev(() => { const el = document.getElementById("ayahSelect"); el.value = "256"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await sleep(900); await kill();
    await clickReadTool(P, "#readNotesBtn");
    const F = await until("the Notes pane frame", () => P.frames().find((x) => /embed=1&unit=/.test(x.url())));
    await F.waitForSelector('[data-unit-body] [data-note-id="n256"] [data-note-open]', { timeout: 15000 });
    await F.click('[data-unit-body] [data-note-id="n256"] [data-note-open]');
    const T = await until("the Mapping My Journey window frame", () => P.frames().find((x) => /embed=1&note=n256/.test(x.url())));
    await T.waitForFunction(() => /No compulsion/.test(document.querySelector("#notePane:not([hidden])")?.textContent ?? ""), null, { timeout: 15000 });
    await sleep(600);
    await T.click("#notePane [data-pane-edit-toggle]");
    await T.waitForSelector("#notePane .pane-edit-toolbar:not([hidden]) .tb-tab", { timeout: 8000 });
    await sleep(800);
    const m = await T.evaluate(() => {
      const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && cs.position !== "fixed"; };
      const top = document.querySelector("#notePane [data-pane-body]").getBoundingClientRect().top;
      const els = [...document.querySelectorAll("button, h1, h2, h3, p, input, select, textarea, a, label")].filter((e) => vis(e) && e.getBoundingClientRect().bottom <= top + 2 && e.getBoundingClientRect().top >= -1);
      const bands = [];
      for (const e of els) { const r = e.getBoundingClientRect(); const b = bands.find((x) => r.top < x.bottom - 2 && r.bottom > x.top + 2); if (b) { b.top = Math.min(b.top, r.top); b.bottom = Math.max(b.bottom, r.bottom); } else bands.push({ top: r.top, bottom: r.bottom }); }
      const line = (els) => { const ls = []; for (const e of els) { const y = e.getBoundingClientRect().top; const l = ls.find((x) => Math.abs(x.y - y) <= 4); if (l) l.n++; else ls.push({ y, n: 1 }); } return ls.map((x) => x.n); };
      const tb = document.querySelector("#notePane .pane-edit-toolbar");
      const tabs = [...tb.querySelectorAll(".tb-tab")].filter(vis), tools = [...tb.querySelectorAll("[data-tb-g].tb-on")].filter(vis);
      const bar = document.querySelector("#notePane [data-pane-bar]"), title = document.querySelector("#notePane [data-edit-title]");
      return { bands: bands.length, tabLines: line(tabs), toolLines: line(tools), allLines: line([...tabs, ...tools]), inline: tb.classList.contains("tb-inline"),
        seen: { bar: !!bar && vis(bar), title: !!title && vis(title), tabs: tabs.length, tools: tools.length },
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    const rows = 1 + m.bands; // + the window's own top bar, in the page above the frame
    check(`${tag} POSITIVE CONTROL the counter sees the Note bar, the title, 5 tabs and the chosen group's tools`, m.seen.bar && m.seen.title && m.seen.tabs === 5 && m.seen.tools >= 5, JSON.stringify(m.seen));
    check(`${tag} at most ${w >= 600 ? 5 : 6} rows above the writing area while editing (${rows})`, rows <= (w >= 600 ? 5 : 6), JSON.stringify(m));
    const oneLine = m.allLines.length === 1;
    const underTabs = m.tabLines.length === 1 && !m.inline && m.toolLines.every((n, i, a) => i < a.length - 1 || n >= 2 || a.length === 1);
    check(`${tag} the formatting is tidy: tabs and tools on one line, or the tools under the tabs (no tool alone on a line)`, w >= 600 ? (oneLine || (underTabs && m.toolLines.length === 1)) : (m.tabLines.length === 1 && Math.min(...m.toolLines) >= 2), JSON.stringify({ all: m.allLines, tabs: m.tabLines, tools: m.toolLines, inline: m.inline }));
    check(`${tag} no sideways overflow in the window`, m.overflowX <= 0, String(m.overflowX));
    const wide = await T.evaluate(() => { const p = document.getElementById("notePane").getBoundingClientRect(); return { pane: Math.round(p.width), doc: document.documentElement.clientWidth, three: !!document.querySelector("#noteLayout.three.tier-wide") }; });
    check(`${tag} the Note takes the window's width (${wide.pane} of ${wide.doc}px), not a third column`, wide.pane >= wide.doc * 0.85 && !wide.three, JSON.stringify(wide));
    if (w === 1440) {
      await T.click("#notePane [data-pane-edit-toggle]"); await sleep(500); // ✓ Done
      const back = await T.$("#notePane [data-pane-back]");
      if (back) await back.click();
      await sleep(800);
      const after = await T.evaluate(() => ({ pane: !document.getElementById("notePane").hidden, three: !!document.querySelector("#noteLayout.three.tier-wide") }));
      check(`${tag} ← Back: Mapping My Journey gets its three panels again`, !!back && !after.pane && after.three, JSON.stringify({ back: !!back, ...after }));
    }
    await P.screenshot({ path: `/tmp/note-toolbar-fit-${lang}-${w}.png` });
  } catch (e) {
    check(`${tag} ran to the end`, false, String(e?.message || e).split("\n")[0]);
  }
  await ctx.close();
}
await browser.close();
console.log(`\n==== Note toolbar fit in the Mapping My Journey window (J82 part 3)${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
