// Audit part 40 (PCF MSA J29): Hadith, Dua, Bookmarks and the other study modules, each checked WORKING after v12.20-v12.23's windows.
//   control    the detectors find a seeded cut-off button, covered button, short ← Back, grey-on-white text and sideways scroll
//   hadeethenc Hadith library: HadeethEnc (categories -> list -> one hadith: Studied, My Notes, Bookmark this, ← Back to the list)
//   openiti    Hadith library: Arabic books (OpenITI) (book -> chapters -> passages -> the crumb back)
//   dua        Dua cards, status, words, notes, bookmark, ✓ Check this dua
//   bookmarks  bookmarks.html: Manage bookmarks, family tag, retire, Bookmark menu
//   topic      Topic study (hadith, deen, arabic) and Routines (health): list -> topic -> Track window, bookmark star
//   continue   the Continue strip: a chip takes the reader to the topic
//   window     the same pages opened from the menu as a J74 page window (1280 only)
// Per state it judges: no sideways scroll, no control cut off at the screen edge, no control covered (elementFromPoint at its
// centre), every ← Back 40px or taller, and text colour against its real background (4.5:1, 3:1 when large), Night and Light.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part40-features-after-windows-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--look=night|light] [--mutate=<name>]
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
// name: [file, route glob, anchor (exactly once), replacement, page path it applies to]. Each puts one fix back to the old code.
const MUTATIONS = {
  crumbnight: ["app/css/card-look.css", "**/css/card-look.css*", '[data-card-look="night"] .hadith-card .hadeethenc-crumb { color: var(--card-link); }\n', "\n", "/app/hadith-"],
  gobtn: ["app/css/hadith.css", "**/css/hadith.css*", "background: #fff; color: var(--hadith-ink); cursor: pointer; font-weight: 600; }", "background: #fff; cursor: pointer; font-weight: 600; }", "/app/hadith-"],
  chip: ["app/deen-study.html", "**/deen-study.html*", ".topic-status-unclaimed { background: #6b6b6b !important; }", ".topic-status-unclaimed { background: #888 !important; }", "/app/deen-study.html"],
  chiphadith: ["app/hadith-study.html", "**/hadith-study.html*", ".topic-status-unclaimed { background: #6b6b6b !important; }", ".topic-status-unclaimed { background: #888 !important; }", "/app/hadith-study.html"],
  closebtn: ["app/health-study.html", "**/health-study.html*", ".way-close-btn { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #666; flex-shrink: 0; }", ".way-close-btn { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #888; flex-shrink: 0; }", "/app/health-study.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

// ---- in the page: one measurement of everything on screen -------------------------------------------------------------
function measure(scope) {
  const vw = innerWidth;
  const out = { over: document.documentElement.scrollWidth - vw, cut: [], covered: [], backSmall: [], contrast: [], nCtl: 0, nText: 0 };
  const desc = (e) => (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : "") + ":" + (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 18)).slice(0, 60);
  // a closed <details> still gives its content a box (content-visibility), but nobody sees it: only its <summary> counts
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
  // text colour against the real background
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => { // null when a gradient or image sits behind (not measurable by colour)
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
const jsClick = (p, sel) => ev(p, (s) => { const e = document.querySelector(s); if (!e) throw new Error("no " + s); e.scrollIntoView({ block: "center" }); e.click(); }, sel);

/** Judge one state: it must really be on screen (positive control), then the five detectors. */
async function state(t, p, label, mustSee, only = {}) {
  const tt = `${t}: ${label}`;
  const seen = await visible(p, mustSee);
  check(`${tt}: POSITIVE CONTROL it is on screen (${mustSee})`, seen);
  if (!seen) return null;
  // `scope`: for a surface that is meant to sit over the page (the Track window, an open menu) only its own controls are judged
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
const DUA_SEED = `DATA.ayahCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, collections: [] }];`;
const TOPICS = {
  hadith: { id: "hadith", root: "hadith", page: "hadith-study.html", trackable: "studied_hadith" },
  deen: { id: "deen", root: "deen_study", page: "deen-study.html", trackable: "studied_deen" },
  arabic: { id: "arabic", root: "arabic_language", page: "arabic-study.html", trackable: "studied_arabic" },
  health: { id: "health", root: "health", page: "health-study.html", trackable: "practised_health" },
};
const topicSeed = (m) => `(function () {
  const root = "${m.root}", mod = "${m.id}", id = (s) => TENANT_ID + "__" + s;
  DATA.trackables = DATA.trackables.filter((t) => t._id !== id("${m.trackable}"));
  DATA.trackables.push({ _id: id("${m.trackable}"), tenantId: TENANT_ID, subjectId: root, order: 0, status: "active", name: lang("Studied", "অধ্যয়ন করা হয়েছে"), groupName: lang("Understanding", "অনুধাবন"), guide: { what: lang("What it is", "এটি কী"), how: lang("How to do it", "কীভাবে করবেন"), measure: lang("How to measure", "কীভাবে মাপবেন") }, panels: ["text"] });
  DATA.subjects = DATA.subjects.filter((s) => !(s.moduleIds || []).includes(mod));
  const node = (sid, parent, anc, en, bn, order, leaf) => DATA.subjects.push({ _id: id(sid), tenantId: TENANT_ID, subjectId: sid, parentId: parent, name: lang(en, bn), moduleIds: [mod], ancestorIds: anc, status: "active", order, ...(leaf ? { isTrackable: true, resourceIds: ["r1"] } : {}) });
  node(root, null, [], "${m.id}", "${m.id}", 1, false);
  node("leaf_b", root, [root], "Short topic", "ছোট বিষয়", 1, true);
  DATA.bookmarks = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", resume: { ["${m.id}::none::leaf_b"]: { position: "leaf_b", settings: null, updatedAt: "2026-10-01T10:00:00.000Z" } }, folders: [], saved: [] }];
})();`;
const BM_SEED = `(function () {
  window.__DATA = DATA;
  const F = (id, name) => ({ id, name, parentId: null, personTagId: null, removed: false, createdAt: "2026-09-01T00:00:00.000Z" });
  const BM = (id, name, folder, ayah) => ({ id, programId: "none", moduleId: "quranrevival", subjectId: "quran", name, position: "ayah:2:" + ayah, folderId: folder, removed: false, settings: { unitType: "ayah", surahNum: 2, ayahNum: ayah, trackableId: "tafsir" }, createdAt: "2026-09-01T00:00:00.000Z" });
  DATA.bookmarks = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", resume: {}, folders: [F("bA", "Bookmark folder")], saved: [BM("b1", "A bookmark", "bA", 255), BM("b2", "Another", null, 248)] }];
})();`;

async function open(lang, look, width, height, pagePath, seed) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: seed || null });
  await ctx.route((u) => ![new URL(BASE).hostname, "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  await ctx.addInitScript((lk) => { try { localStorage.setItem("mm_card_look", lk); } catch { /* */ } }, look);
  // a computer has a home window the reader has placed (home-window.js); every pop-up opens at it
  if (width >= 900) await ctx.addInitScript(() => { try { localStorage.setItem("mmsa-home-window-v1", JSON.stringify({ x: 200, y: 100, w: 860, h: 600, user: true })); } catch { /* */ } });
  if (MUTATE) {
    const [file, glob, from, to, applies] = MUTATIONS[MUTATE];
    if (pagePath.includes(applies)) {
      const body = fs.readFileSync(path.join(ROOT, file), "utf8");
      const n = body.split(from).length - 1;
      if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
      await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css; charset=utf-8" : file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: body.split(from).join(to) }));
    }
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
/** A flow in a page of its own, or (inWindow) in the J74 page window opened from the Qur'an page's menu. */
async function flow(name, lang, look, width, pagePath, seed, fn, { inWindow = false } = {}) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const height = width < 600 ? 844 : width < 1000 ? 1024 : 800;
  const tag = `${lang} ${look} ${width}x${height} ${name}${inWindow ? " (page window)" : ""}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, look, width, height, inWindow ? "/app/quranrevival.html" : pagePath, seed), new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT opening the page")), 45000))]);
    ctx = o.ctx;
    let target = o.page;
    if (inWindow) {
      await settle(o.page, 900);
      const rel = pagePath.replace("/app/", "");
      await o.page.evaluate((h) => { const a = [...document.querySelectorAll(".app-nav a.nav-link[href]")].find((x) => x.getAttribute("href").startsWith(h)); if (!a) throw new Error("no menu link " + h); a.closest("details")?.setAttribute("open", ""); a.click(); }, rel.split("?")[0]);
      let F = null;
      for (let i = 0; i < 100 && !F; i++) { F = o.page.frames().find((x) => x.url().includes("/app/" + rel.split("?")[0]) && /inWindow=1/.test(x.url())) || null; if (!F) await o.page.waitForTimeout(100); }
      check(`${tag}: POSITIVE CONTROL the page opened in a window`, !!F);
      if (!F) throw new Error("the page window did not open");
      target = F;
      await settle(F, 900);
    }
    await Promise.race([fn(tag, target, o.errors, o.page), new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT in the flow")), 150000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}

// ---- the features -----------------------------------------------------------------------------------------------------
const writes = (p) => ev(p, () => (window.__stubWriteData || []).length);
async function popoverState(t, p, label) {
  // The Bookmark dialog (shared bookmark-popover.js): it is on screen, inside the screen, and has a Cancel/Back at least 40px.
  const info = await ev(p, () => {
    const d = document.querySelector(".bm-popover"); if (!d) return null;
    const r = d.getBoundingClientRect();
    const btns = [...d.querySelectorAll("button")].map((b) => ({ t: (b.textContent || "").trim().slice(0, 20), h: Math.round(b.getBoundingClientRect().height) }));
    return { inside: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1, btns };
  });
  check(`${t}: ${label}: the Bookmark dialog opened`, !!info, "no .bm-popover");
  if (!info) return;
  check(`${t}: ${label}: the dialog sits inside the screen`, info.inside, JSON.stringify(info));
  check(`${t}: ${label}: its buttons are 40px or taller`, info.btns.length >= 2 && info.btns.every((b) => b.h >= 39.5), JSON.stringify(info.btns));
}

async function hadeethenc(t, p) {
  // Updated in place 28 Oct 2026 (PCF MSA J106 round 1): the page now opens on Hadith Books; HadeethEnc is its own
  // menu-bar button, "Encyclopedia" (data-hadith-tab="collections"), so it is opened first.
  await waitFor(p, '[data-hadith-tab="collections"]', 25000);
  await jsClick(p, '[data-hadith-tab="collections"]');
  await waitFor(p, '[data-hadeethenc-category="1"]', 25000);
  await state(t, p, "HadeethEnc categories", '[data-hadeethenc-category="1"]');
  await jsClick(p, '[data-hadeethenc-category="1"]'); await waitFor(p, '[data-hadeethenc-category="12"]');
  await jsClick(p, '[data-hadeethenc-category="12"]'); await waitFor(p, '[data-hadeethenc-category="40"]');
  await jsClick(p, '[data-hadeethenc-category="40"]'); await waitFor(p, "[data-hadeethenc-hadith]");
  await state(t, p, "HadeethEnc list", "[data-hadeethenc-hadith]");
  const y0 = await ev(p, () => { const e = document.querySelector("[data-hadeethenc-hadith]"); e.scrollIntoView({ block: "center" }); const y = scrollY; e.click(); return y; });
  await waitFor(p, "[data-hadeethenc-back]");
  await settle(p, 500);
  await state(t, p, "one HadeethEnc hadith", "[data-hadeethenc-back]");
  check(`${t}: the hadith shows its text and a Studied picker and a My Notes link`, await ev(p, () => !!document.querySelector("select[data-hadeethenc-studied]") && !!document.querySelector("a[data-hadeethenc-note-link]") && (document.body.innerText || "").length > 400));
  await ev(p, () => { window.__stubWriteData = []; });
  await ev(p, () => { const s = document.querySelector("select[data-hadeethenc-studied]"); const o = [...s.options].find((x) => x.value && x.value !== s.value && !x.disabled); s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await settle(p, 900);
  check(`${t}: choosing a Studied value is written (stub write log)`, (await writes(p)) >= 1, "no write recorded");
  const bmBefore = await ev(p, () => document.querySelector("[data-hadeethenc-bookmark]").textContent);
  await ev(p, () => { window.__stubWriteData = []; });
  await jsClick(p, "[data-hadeethenc-bookmark]"); await settle(p, 900);
  const bmAfter = await ev(p, () => document.querySelector("[data-hadeethenc-bookmark]").textContent);
  check(`${t}: Bookmark this is written and the button changes (${bmBefore} -> ${bmAfter})`, (await writes(p)) >= 1 && bmBefore !== bmAfter, `writes=${await writes(p)}`);
  await jsClick(p, "[data-hadeethenc-back]"); await settle(p, 500);
  const back = await ev(p, () => ({ list: !!document.querySelector("[data-hadeethenc-hadith]"), y: scrollY, btn: (() => { const b = document.querySelector("[data-hadeethenc-hadith]"); if (!b) return false; const r = b.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; })() }));
  check(`${t}: ← Back to the list shows the list again, at the same place`, back.list && Math.abs(back.y - y0) <= 60, JSON.stringify({ before: y0, ...back }));
}

async function openiti(t, p) {
  await waitFor(p, '[data-openiti-book^="0676Nawawi.Arbac"]', 25000);
  await state(t, p, "OpenITI books", '[data-openiti-book^="0676Nawawi.Arbac"]');
  await jsClick(p, '[data-openiti-book^="0676Nawawi.Arbac"]'); await waitFor(p, '[data-openiti-chapter="ch-3"]');
  await state(t, p, "OpenITI chapters", '[data-openiti-chapter="ch-3"]');
  check(`${t}: the book lists its chapters`, (await ev(p, () => document.querySelectorAll("[data-openiti-chapter]").length)) > 30);
  await jsClick(p, '[data-openiti-chapter="ch-3"]'); await waitFor(p, "[data-openiti-credit]"); await settle(p, 500);
  // Updated in place 28 Oct 2026 (PCF MSA J106 round 1): the chapter opens in the three-pane reader. On a phone one
  // pane shows at a time and a chapter opens on its hadith list, so the passage (Text pane) is shown by its step
  // button before it is measured; on wider screens all three panes are already side by side.
  await ev(p, () => { const s = document.querySelector('[data-reader-show="text"]'); if (s && s.getBoundingClientRect().width > 0) s.click(); });
  await settle(p, 400);
  await state(t, p, "OpenITI passages", "[data-openiti-credit]");
  check(`${t}: the chapter shows Arabic text`, await ev(p, () => /[؀-ۿ]{8,}/.test(document.body.innerText)));
  // the way back: the book's crumb returns to its chapters
  const ok = await ev(p, () => { const c = [...document.querySelectorAll(".hadith-crumbs button")].pop(); if (!c) return false; c.click(); return true; });
  await settle(p, 600);
  check(`${t}: the book crumb takes the reader back to the chapters`, ok && (await ev(p, () => document.querySelectorAll("[data-openiti-chapter]").length)) > 30);
}

async function dua(t, p) {
  await waitFor(p, '[data-hadith-tab="dua"]', 25000);
  await jsClick(p, '[data-hadith-tab="dua"]'); await waitFor(p, "[data-dua-check-open]", 25000); await settle(p, 500);
  await state(t, p, "Dua card", "[data-dua-check-open]");
  await ev(p, () => { window.__stubWriteData = []; });
  await jsClick(p, '[data-dua-status="learning"]'); await settle(p, 800);
  check(`${t}: choosing Learning is written and shown`, (await writes(p)) >= 1 && (await ev(p, () => document.querySelector('[data-dua-status="learning"]')?.getAttribute("aria-current") === "true" || document.querySelector('[data-dua-status="learning"]')?.classList.contains("active") || document.querySelector("[data-dua-check-status]") !== null)), "no write");
  check(`${t}: the dua's My Notes link points at the notes page`, await ev(p, () => /notes\.html/.test(document.querySelector("[data-dua-note-link]")?.getAttribute("href") || "")));
  const dBefore = await ev(p, () => document.querySelector("[data-dua-bookmark]").textContent);
  await ev(p, () => { window.__stubWriteData = []; });
  await jsClick(p, "[data-dua-bookmark]"); await settle(p, 900);
  const dAfter = await ev(p, () => document.querySelector("[data-dua-bookmark]").textContent);
  check(`${t}: Bookmark this dua is written and the button changes (${dBefore} -> ${dAfter})`, (await writes(p)) >= 1 && dBefore !== dAfter, `writes=${await writes(p)}`);
  await jsClick(p, "[data-dua-check-open]"); await waitFor(p, "[data-dua-check-back]"); await settle(p, 500);
  await state(t, p, "✓ Check this dua", "[data-dua-check-back]");
  await jsClick(p, "[data-dua-check-back]"); await settle(p, 500);
  check(`${t}: ← Back from the check returns to the dua card`, await ev(p, () => !document.querySelector("[data-dua-check-panel]") && !!document.querySelector("[data-dua-check-open]")));
}

async function bookmarksPage(t, p) {
  await waitFor(p, "[data-bm-open-id]", 25000);
  await state(t, p, "Manage bookmarks", "[data-bm-open-id]");
  check(`${t}: the page lists the seeded bookmarks`, (await ev(p, () => document.querySelectorAll("[data-bm-open-id]").length)) >= 2);
  await ev(p, () => { window.__stubWriteData = []; });
  // Audit part 119: a row's For list is filled when the reader reaches for it; focus it first, as a tap or Tab does.
  await ev(p, () => { const s = document.querySelector("select[data-bm-person]"); s.focus(); const o = [...s.options].find((x) => x.value && x.value !== s.value); s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await settle(p, 800);
  check(`${t}: tagging a bookmark for a family member is written`, (await writes(p)) >= 1);
  await ev(p, () => { window.__stubWriteData = []; });
  await jsClick(p, "[data-bm-toggle]"); await settle(p, 800);
  check(`${t}: Retire is written`, (await writes(p)) >= 1);
  if (!(await visible(p, ".nav-cat-bookmark > summary"))) return; // a page window drops the page's own menu row: the Bookmark menu is the Qur'an page's there
  await ev(p, () => { document.querySelector(".nav-cat-bookmark > summary")?.click(); }); await settle(p, 400);
  await state(t, p, "Bookmark menu", ".nav-cat-bookmark[open] .nav-cat-links", { scope: ".nav-cat-bookmark .nav-cat-links" }); // on a phone the menu is a panel over the page, which rightly covers the Bookmark pill itself
  const hrefs = await ev(p, () => [...document.querySelectorAll(".nav-cat-bookmark .nav-cat-links a")].map((a) => a.getAttribute("href")));
  check(`${t}: the Bookmark menu offers Manage bookmarks and a saved bookmark`, hrefs.some((h) => /(^|\/)bookmarks\.html/.test(h)) && hrefs.some((h) => /bookmark=b[12]/.test(h)), JSON.stringify(hrefs));
}

async function topic(t, p, m) {
  await waitFor(p, "#listContainer .topic-row-leaf", 25000);
  await state(t, p, "topic list", "#listContainer .topic-row-leaf");
  // Health is one of the four modules hidden from every entry point (hidden-modules.js): its chip is held back on purpose
  if (m.id !== "health") check(`${t}: the Continue strip offers the topic that was left`, await ev(p, () => /Short topic|ছোট বিষয়|Continue|চালিয়ে/.test(document.querySelector(".continue-strip")?.textContent || "")));
  await jsClick(p, "#listContainer .topic-row-leaf"); await waitFor(p, "#trackTopicBtn"); await settle(p, 600);
  await state(t, p, "topic detail", "#trackTopicBtn");
  await ev(p, () => { window.__stubWriteData = []; });
  await jsClick(p, "#bookmarkTopicBtn"); await settle(p, 600);
  await popoverState(t, p, "topic bookmark");
  await ev(p, () => { document.querySelector(".bm-popover button")?.click(); }); await settle(p, 300);
  await jsClick(p, "#trackTopicBtn"); await settle(p, 800);
  await state(t, p, "Track window", "#wayModalMount .way-back-btn", { scope: "#wayModalOverlay" });
  if (await ev(p, () => innerWidth >= 900)) {
    const box = await ev(p, () => {
      const r = document.getElementById("wayModalMount").getBoundingClientRect(), framed = window.self !== window.top;
      const home = framed ? { x: 0, y: 0, w: innerWidth, h: innerHeight } : JSON.parse(localStorage.getItem("mmsa-home-window-v1"));
      return { framed, r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], home: [home.x, home.y, home.w, home.h] };
    });
    check(`${t}: the Track window sits at the home rect (${box.framed ? "filling its page window" : "on a page of its own"})`, box.r.every((v, i) => Math.abs(v - box.home[i]) <= 2), JSON.stringify(box));
  }
  await jsClick(p, "#wayModalMount .way-back-btn"); await settle(p, 400);
  check(`${t}: ← Back closes the Track window and the topic is still shown`, await ev(p, () => !document.getElementById("wayModalOverlay").classList.contains("open") && !!document.getElementById("trackTopicBtn")));
}

async function continueChip(t, p, m) {
  await waitFor(p, ".continue-chip", 25000);
  const href = await ev(p, () => document.querySelector(".continue-chip").getAttribute("href"));
  check(`${t}: the Continue chip links to the topic with a way back`, new RegExp(`resume=leaf_b`).test(href) && /back=1/.test(href), String(href));
  await jsClick(p, ".continue-chip");
  await settle(p, 1800);
}

// ---- the detectors prove themselves -------------------------------------------------------------------------------------
for (const look of ["night"]) if (!ONLY || "control".includes(ONLY)) await flow("control", "en", look, 390, "/app/about.html", "", async (t, p) => {
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
  const clean = await ev(p, () => { document.getElementById("c1").remove(); document.getElementById("c2x").remove(); document.getElementById("c3").style.height = "44px"; document.getElementById("c4").style.color = "#222"; document.getElementById("c5").remove(); document.getElementById("c2").remove(); });
  const m2 = await p.evaluate(`(${MEASURE_SRC})()`);
  check(`${t}: POSITIVE CONTROL once the seeded defects are fixed they are no longer reported`, !m2.cut.some((x) => x.includes("#c1")) && !m2.backSmall.some((x) => x.includes("#c3")) && !m2.contrast.some((x) => x.includes("#c4")) && m2.over <= 0, JSON.stringify({ c: m2.cut, b: m2.backSmall, k: m2.contrast.slice(0, 3), o: m2.over }));
});

// ---- the sweep ----------------------------------------------------------------------------------------------------------
const WIDTHS = [390, 768, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
const LOOKS = ["night", "light"].filter((l) => !KONLY || l === KONLY);
for (const lang of LANGS) for (const look of LOOKS) for (const width of WIDTHS) {
  const wrap = (fn) => async (t, p, errors) => { await fn(t, p); check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | ")); };
  await flow("hadeethenc", lang, look, width, "/app/hadith-collections.html", "", wrap(hadeethenc));
  await flow("openiti", lang, look, width, "/app/hadith-collections.html", "", wrap(openiti));
  await flow("dua", lang, look, width, "/app/hadith-collections.html", DUA_SEED, wrap(dua));
  // the Hadith page itself (hadith-study.html) carries the same library under its own page styles
  await flow("hadeethenc-hs", lang, look, width, "/app/hadith-study.html", "", wrap(hadeethenc));
  await flow("openiti-hs", lang, look, width, "/app/hadith-study.html", "", wrap(openiti));
  await flow("bookmarks", lang, look, width, "/app/bookmarks.html", BM_SEED, wrap(bookmarksPage));
  for (const m of Object.values(TOPICS)) await flow(`topic-${m.id}`, lang, look, width, `/app/${m.page}`, topicSeed(m), wrap((t, p) => topic(t, p, m)));
  await flow("continue", lang, look, width, `/app/${TOPICS.deen.page}`, topicSeed(TOPICS.deen), wrap(async (t, p) => { await continueChip(t, p, TOPICS.deen); check(`${t}: the chip opened the topic itself`, await ev(p, () => !!document.getElementById("trackTopicBtn"))); }));
}
// the same pages opened from the Qur'an page's menu as a J74 page window
for (const lang of LANGS) for (const look of LOOKS) if (!WONLY || WONLY === 1280) {
  const wrap = (fn) => async (t, p, errors) => { await fn(t, p); };
  await flow("hadeethenc", lang, look, 1280, "/app/hadith-study.html", "", wrap(hadeethenc), { inWindow: true });
  await flow("openiti", lang, look, 1280, "/app/hadith-study.html", "", wrap(openiti), { inWindow: true });
  await flow("dua", lang, look, 1280, "/app/hadith-study.html", DUA_SEED, wrap(dua), { inWindow: true });
  await flow("bookmarks", lang, look, 1280, "/app/bookmarks.html", BM_SEED, wrap(bookmarksPage), { inWindow: true });
  for (const m of [TOPICS.deen, TOPICS.arabic]) await flow(`topic-${m.id}`, lang, look, 1280, `/app/${m.page}`, topicSeed(m), wrap((t, p) => topic(t, p, m)), { inWindow: true });
}

await browser.close();
console.log(`\n==== audit-part40${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
