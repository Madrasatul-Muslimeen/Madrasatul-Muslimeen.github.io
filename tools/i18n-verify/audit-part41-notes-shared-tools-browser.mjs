// Audit part 41 (PCF MSA J29): Notes and the shared tools after v12.25-v12.27 (minimise, every Note in the Mapping My Journey window).
//   control    the detectors find a seeded cut-off button, covered button, short ← Back, grey-on-white text and sideways scroll
//   zab        how many 🧰 Zab strips are on screen (all frames) with the tray open: ONE, the page's own (none inside embed=1 frames)
//   notespage  notes.html: lists, opens (Edit form, ⧉ Open in window) and the way back (?back=1)
//   traynote   the tray opened on a Note: the Note is full width on a computer, – makes a chip and the chip restores, ✕ returns
// Bookmarks / Records / the Continue strip: no code path there opens a Note (grep in the PR), so there is nothing to run.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part41-notes-shared-tools-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--look=night|light] [--mutate=<name>]
//   --mutate=zab   sw-register.js mounts Zab inside embed=1 frames again -> the zab flow fails
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang"), KONLY = arg("look");
// name: [file, route glob, anchor (exactly once), replacement]. Each puts one fix back to the old code.
const MUTATIONS = {
  zab: ["app/js/sw-register.js", "**/js/sw-register.js*", "isZabReady() && !inWindow && !embedded", "isZabReady() && !inWindow"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

// ---- in the page: one measurement of everything on screen -------------------------------------------------------------
function measure(scope) {
  const vw = innerWidth;
  const out = { over: document.documentElement.scrollWidth - vw, cut: [], covered: [], backSmall: [], contrast: [], nCtl: 0, nText: 0 };
  const desc = (e) => (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : "") + ":" + (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 18)).slice(0, 60);
  const folded = (e) => { for (let d = e.closest("details"); d; d = d.parentElement && d.parentElement.closest("details")) { if (!d.open && !(e.closest("summary") && e.closest("summary").parentElement === d)) return true; } return false; };
  const vis = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none" && !e.closest("[hidden]") && !folded(e); };
  const sx = scrollX, sy = scrollY;
  const ctl = [...document.querySelectorAll("button, a[href], select, summary, input:not([type=hidden]), textarea")].filter(vis);
  for (const e of ctl) {
    if (e.closest("#zabCorner, #zabBar, #zabPanel")) continue;
    if (scope && !e.closest(scope)) continue;
    out.nCtl++;
    let r = e.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) out.cut.push(desc(e) + ` [${Math.round(r.left)},${Math.round(r.right)}]`);
    if (/^←/.test((e.textContent || "").trim()) && r.height < 39.5) out.backSmall.push(desc(e) + ` h=${Math.round(r.height)}`);
    e.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    r = e.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > vw) continue;
    const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1), y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
    const at = document.elementFromPoint(x, y);
    if (!at || at === e || e.contains(at) || at.contains(e) || (e.labels && [...e.labels].some((l) => l.contains(at)))) continue;
    out.covered.push(desc(e) + " under " + desc(at));
  }
  scrollTo(sx, sy);
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => {
    const chain = []; for (let n = el; n; n = n.parentElement) chain.push(n);
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = chain.length - 1; i >= 0; i--) {
      const cs = getComputedStyle(chain[i]);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const c = parse(cs.backgroundColor); if (c && c.a > 0) base = over(c, base);
    }
    return base;
  };
  const seen = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const e = n.parentElement; if (!e || seen.has(e) || !vis(e)) continue;
    if (e.closest("script, style, option, svg, canvas, [disabled], [aria-disabled=true], #zabCorner, #zabBar, #zabPanel")) continue;
    seen.add(e); out.nText++;
    const cs = getComputedStyle(e);
    const bg = bgOf(e); if (!bg) continue;
    let fg = parse(cs.color); if (!fg) continue;
    let op = 1; for (let a = e; a; a = a.parentElement) op *= Number(getComputedStyle(a).opacity);
    fg = over({ ...fg, a: fg.a * op }, bg);
    const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    const rr = ratio(fg, bg);
    if (rr < need) out.contrast.push(`${desc(e)} ${rr.toFixed(2)}<${need} (${cs.color} on rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)}))`);
  }
  out.cut = [...new Set(out.cut)]; out.covered = [...new Set(out.covered)]; out.backSmall = [...new Set(out.backSmall)]; out.contrast = [...new Set(out.contrast)];
  return out;
}
const MEASURE_SRC = measure.toString();

const settle = (p, ms = 350) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const visible = (p, sel) => ev(p, (s) => [...document.querySelectorAll(s)].some((e) => { const b = e.getBoundingClientRect(), c = getComputedStyle(e); return b.width > 0 && b.height > 0 && c.visibility !== "hidden" && c.display !== "none" && !e.closest("[hidden]"); }), sel);
const waitFor = (p, sel, ms = 15000) => p.waitForSelector(sel, { timeout: ms, state: "attached" });
/** A wait is a named state; a timeout fails by name. */
async function until(name, fn, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 100)); }
  console.log(`  TIMEOUT  waiting for: ${name}`);
  return false;
}

/** Judge one state: it must really be on screen (positive control), then the five detectors. */
async function state(t, p, label, mustSee, only = {}) {
  const tt = `${t}: ${label}`;
  const seen = await visible(p, mustSee);
  check(`${tt}: POSITIVE CONTROL it is on screen (${mustSee})`, seen);
  if (!seen) return null;
  const m = await p.evaluate(`(${MEASURE_SRC})(${JSON.stringify(only.scope || null)})`);
  check(`${tt}: ${m.nCtl} controls and ${m.nText} texts were measured`, m.nCtl > 0 && m.nText > 0, JSON.stringify({ n: m.nCtl, t: m.nText }));
  check(`${tt}: no sideways scroll`, m.over <= 0, `scrollWidth - innerWidth = ${m.over}`);
  check(`${tt}: no control cut off at the screen edge`, m.cut.length === 0, m.cut.slice(0, 5).join(" | "));
  check(`${tt}: no control covered by something else`, m.covered.length === 0, m.covered.slice(0, 5).join(" | "));
  check(`${tt}: every ← Back is 40px or taller`, m.backSmall.length === 0, m.backSmall.slice(0, 5).join(" | "));
  check(`${tt}: text colour 4.5:1 against its real background`, m.contrast.length === 0, m.contrast.slice(0, 6).join(" | "));
  return m;
}

// ---- opening a page ---------------------------------------------------------------------------------------------------
const TS = "2026-01-01T00:00:00.000Z";
const own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: "test-uid" };
const NOTES = [
  { _id: "t1__n256", noteId: "n256", ...own, title: "Started on 2:256", bodyHtml: "<p>No compulsion in religion.</p>", status: "active", visibility: "private", currentRevisionId: "n256-r1" },
  { _id: "t1__n7", noteId: "n7", ...own, title: "Findable elsewhere note", bodyHtml: "<p>Another body.</p>", status: "active", visibility: "private", currentRevisionId: "n7-r1" },
];
const SOURCES = NOTES.map((n, i) => ({ _id: "t1__s" + n.noteId, sourceLinkId: "s" + n.noteId, ...own, noteId: n.noteId, sourceKey: "ayah:2:256", sourceKind: "quran-unit", relationshipKind: i ? "reference" : "origin", approachId: null, provenanceKind: "study-note", status: "active" }));
const REVS = NOTES.map((n) => ({ _id: "t1__" + n.noteId + "-r1", revisionId: n.noteId + "-r1", noteId: n.noteId, previousRevisionId: null, title: n.title, bodyHtml: n.bodyHtml, revisionReason: "content-update", actorUid: "test-uid", ...own }));
const SEED = `window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
DATA.notes = [...(DATA.notes ?? []), ...${JSON.stringify(NOTES)}];
DATA.noteSources = [...(DATA.noteSources ?? []), ...${JSON.stringify(SOURCES)}];
DATA.noteRevisions = [...(DATA.noteRevisions ?? []), ...${JSON.stringify(REVS)}];
DATA.userPrefs = [{ _id: "test-uid" }];`;

async function open(lang, look, width, height, pagePath) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: SEED });
  await ctx.route((u) => ![new URL(BASE).hostname, "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  await ctx.addInitScript((lk) => { try { localStorage.setItem("mm_card_look", lk); } catch { /* */ } }, look);
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, look, width, pagePath, fn) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const height = width < 600 ? 844 : width < 1000 ? 1024 : width > 1400 ? 900 : 800;
  const tag = `${lang} ${look} ${width}x${height} ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, look, width, height, pagePath), new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT opening the page")), 45000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT in the flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const frameOf = (p) => p.frames().find((f) => /journey-map\.html/.test(f.url()) && /embed=1/.test(f.url()));
async function openTray(p, noteId) {
  await ev(p, async (id) => { const m = await import("/app/js/journey-tray.js"); m.openJourneyTray(id ? { noteId: id } : {}); }, noteId || null);
  await until("the tray frame loads", async () => { const f = frameOf(p); return !!f && (await f.evaluate(() => document.readyState === "complete").catch(() => false)); });
  await settle(p, 1500);
}

// ---- the features -----------------------------------------------------------------------------------------------------
/** Every visible Zab element in every frame of the page. */
async function zabCount(p) {
  let total = 0; const where = [];
  for (const f of p.frames()) {
    const n = await f.evaluate(() => [...document.querySelectorAll("#zabBar, #zabCorner")].filter((e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.display !== "none" && c.visibility !== "hidden" && !e.closest("[hidden]"); }).length).catch(() => 0);
    total += n; if (n) where.push(f.url().split("/").pop().slice(0, 30) + "=" + n);
  }
  return { total, where: where.join(", ") };
}
async function zab(t, p) {
  const before = await zabCount(p);
  const wide = await ev(p, () => innerWidth >= 1000);
  if (wide) check(`${t}: POSITIVE CONTROL the page's own Zab is on screen before the tray opens`, before.total === 1, JSON.stringify(before));
  await openTray(p, "n256");
  check(`${t}: POSITIVE CONTROL the tray's frame is open`, !!frameOf(p));
  const after = await zabCount(p);
  const inFrame = await frameOf(p)?.evaluate(() => document.querySelectorAll("#zabBar, #zabCorner").length).catch(() => -1);
  check(`${t}: with the tray open no Zab is drawn INSIDE its frame, and no more than the page's own is on screen`, inFrame === 0 && after.total <= Math.max(before.total, 1), JSON.stringify({ before, after, inFrame }));
}

async function trayNote(t, p, errors) {
  const wide = await ev(p, () => innerWidth >= 1000);
  const y0 = await ev(p, () => scrollY);
  await openTray(p, "n256");
  const f = frameOf(p);
  check(`${t}: POSITIVE CONTROL the tray opened on the Note`, !!f && await until("the note pane shows", async () => f.evaluate(() => { const e = document.querySelector("#notePane:not([hidden])"); return !!e && e.getBoundingClientRect().width > 0; })));
  if (!f) return;
  const g = await f.evaluate(() => { const e = document.querySelector("#notePane"); return { pane: Math.round(e.getBoundingClientRect().width), win: innerWidth, folders: [...document.querySelectorAll("#folderTree, #folderPanel, .folder-panel")].some((x) => x.getBoundingClientRect().width > 0), title: (document.querySelector("#notePane .nw-title, #notePane [data-pane-title]")?.textContent || "").trim() }; });
  if (wide) check(`${t}: the Note takes the whole width of the tray (${g.pane} of ${g.win}px), no folders column beside it`, g.pane >= g.win * 0.9 && !g.folders, JSON.stringify(g));
  check(`${t}: the Note shown is the one tapped`, /Started on 2:256/.test(g.title), g.title);
  const mb = await ev(p, () => { const b = document.querySelector("#journeyTray .mm-min-btn"); if (!b) return null; const r = b.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { w: Math.round(r.width), h: Math.round(r.height), top: !!at && (at === b || b.contains(at)) }; });
  check(`${t}: the tray's – is 40px+ and not covered`, !!mb && mb.w >= 40 && mb.h >= 40 && mb.top, JSON.stringify(mb));
  await ev(p, () => document.querySelector("#journeyTray .mm-min-btn")?.click()); await settle(p, 400);
  let s = await ev(p, () => ({ tray: !!document.querySelector("#journeyTray:not([hidden])") && getComputedStyle(document.getElementById("journeyTray")).display !== "none", chip: !!document.querySelector('[data-mm-min-chip="journey"]') }));
  check(`${t}: – hides the tray and leaves its chip`, !s.tray && s.chip, JSON.stringify(s));
  await ev(p, () => document.querySelector('[data-mm-min-chip="journey"]')?.click()); await settle(p, 500);
  s = await ev(p, () => ({ tray: !!document.querySelector("#journeyTray:not([hidden])") && getComputedStyle(document.getElementById("journeyTray")).display !== "none", chip: !!document.querySelector('[data-mm-min-chip="journey"]') }));
  const g2 = await frameOf(p)?.evaluate(() => (document.querySelector("#notePane .nw-title, #notePane [data-pane-title]")?.textContent || "").trim()).catch(() => "");
  check(`${t}: the chip restores the tray as it was (same Note, chip gone)`, s.tray && !s.chip && /Started on 2:256/.test(g2), JSON.stringify({ ...s, g2 }));
  await ev(p, () => document.querySelector("#journeyTray .jt-close")?.click()); await settle(p, 500);
  const e = await ev(p, () => ({ tray: !!document.querySelector("#journeyTray:not([hidden])"), y: scrollY }));
  check(`${t}: ✕ returns to where the reader was (tray gone, same scroll)`, !e.tray && Math.abs(e.y - y0) <= 2, JSON.stringify({ y0, ...e }));
  check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
}

async function notesPage(t, p, errors) {
  await waitFor(p, ".note-card[data-note-id]", 25000);
  await state(t, p, "My Notes list", ".note-card[data-note-id]");
  const n = await ev(p, () => [...document.querySelectorAll(".note-card[data-note-id]")].map((c) => c.dataset.noteId));
  check(`${t}: the page lists both seeded Notes`, n.includes("n256") && n.includes("n7"), JSON.stringify(n));
  await ev(p, () => { const e = document.querySelector('[data-note-id="n256"] [data-note-edit]'); e.scrollIntoView({ block: "center" }); e.click(); });
  const ed = await until("the inline editor opens", async () => visible(p, '[data-note-id="n256"] [data-edit-body]'));
  check(`${t}: Edit opens the Note's editor`, ed);
  if (ed) await state(t, p, "inline editor", '[data-note-id="n256"] [data-edit-body]');
  await p.reload(); await waitFor(p, ".note-card[data-note-id]", 25000); await settle(p, 600);
  await ev(p, () => { const e = document.querySelector('[data-note-id="n7"] [data-note-window]'); e.scrollIntoView({ block: "center" }); e.click(); });
  const w = await until("a Note window opens", async () => visible(p, ".note-win"), 8000);
  check(`${t}: ⧉ Open in window shows the Note in a window of this page (recorded: it is not the Mapping My Journey tray, see "For the Owner")`, w);
  check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  const bb = await ev(p, () => { const b = document.getElementById("notesBackBtn"); if (!b || b.hidden) return null; const r = b.getBoundingClientRect(); return { h: Math.round(r.height), txt: b.textContent.trim() }; });
  check(`${t}: POSITIVE CONTROL ?back=1 shows ← Back, 40px or taller`, !!bb && /^←/.test(bb.txt) && bb.h >= 40, JSON.stringify(bb));
  await ev(p, () => document.getElementById("notesBackBtn")?.click()).catch(() => {});
  check(`${t}: ← Back leaves the My Notes page for where the reader came from`, await until("the page changes", async () => !/notes\.html/.test(p.url()), 8000), p.url());
}

// ---- the detectors prove themselves -------------------------------------------------------------------------------------
if (!ONLY || "control".includes(ONLY)) await flow("control", "en", "night", 390, "/app/about.html", async (t, p) => {
  await ev(p, () => {
    const d = document.createElement("div");
    d.innerHTML = '<button id="c1" style="position:absolute;left:-80px;top:300px;width:60px;height:44px">cut</button>'
      + '<button id="c2" style="position:absolute;left:100px;top:360px;width:90px;height:44px">covered</button><div id="c2x" style="position:absolute;left:90px;top:350px;width:120px;height:70px;background:#fff;z-index:99999"></div>'
      + '<button id="c3" style="position:absolute;left:10px;top:440px;height:30px">← Back</button>'
      + '<p id="c4" style="position:absolute;left:10px;top:500px;margin:0;background:#fff;color:#999">grey on white</p>'
      + '<div id="c5" style="position:absolute;left:0;top:560px;width:2000px;height:10px"></div>';
    document.body.appendChild(d);
  });
  const m = await p.evaluate(`(${MEASURE_SRC})()`);
  check(`${t}: POSITIVE CONTROL a button off the left edge is found`, m.cut.some((x) => x.includes("#c1")), JSON.stringify(m.cut));
  check(`${t}: POSITIVE CONTROL a covered button is found`, m.covered.some((x) => x.includes("#c2")), JSON.stringify(m.covered));
  check(`${t}: POSITIVE CONTROL a 30px ← Back is found`, m.backSmall.some((x) => x.includes("#c3")), JSON.stringify(m.backSmall));
  check(`${t}: POSITIVE CONTROL grey #999 on white is found`, m.contrast.some((x) => x.includes("#c4")), JSON.stringify(m.contrast.slice(0, 3)));
  check(`${t}: POSITIVE CONTROL sideways scroll is found`, m.over > 0, String(m.over));
  await ev(p, () => { document.getElementById("c1").remove(); document.getElementById("c2x").remove(); document.getElementById("c3").style.height = "44px"; document.getElementById("c4").style.color = "#222"; document.getElementById("c5").remove(); document.getElementById("c2").remove(); });
  const m2 = await p.evaluate(`(${MEASURE_SRC})()`);
  check(`${t}: POSITIVE CONTROL once the seeded defects are fixed they are no longer reported`, !m2.cut.some((x) => x.includes("#c1")) && !m2.backSmall.some((x) => x.includes("#c3")) && !m2.contrast.some((x) => x.includes("#c4")) && m2.over <= 0, JSON.stringify({ c: m2.cut, b: m2.backSmall, o: m2.over }));
});

// ---- the sweep ----------------------------------------------------------------------------------------------------------
const WIDTHS = [390, 768, 1280, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
const LOOKS = ["night", "light"].filter((l) => !KONLY || l === KONLY);
for (const lang of LANGS) for (const look of LOOKS) for (const width of WIDTHS) {
  if (width !== 1440) await flow("notespage", lang, look, width, "/app/notes.html?unit=ayah%3A2%3A256&label=2%3A256&back=1", notesPage);
  await flow("zab", lang, look, width, "/app/quranrevival.html", zab);
  await flow("traynote", lang, look, width, "/app/quranrevival.html", trayNote);
}

await browser.close();
console.log(`\n==== audit-part41${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
