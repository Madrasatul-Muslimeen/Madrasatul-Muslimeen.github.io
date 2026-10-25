// Audit part 92 (PCF MSA J29): does Bangla FIT on the 23 shared pages? (bangla-sweep-other-pages-browser proves no English
// leaks; nothing measured width.)  Each page is opened in Bangla at 320x640, 390x844, 768x1024 and 1440x900, then again in
// English at the same width. Per page and width it records:
//   overflow  the page scrolls sideways, or a visible element ends past the screen / past an ancestor that clips (overflow-x hidden|clip)
//   cut       a visible element whose own text is cut (scrollWidth > clientWidth + 1 with overflow not visible/auto/scroll, or ellipsis in use)
//   squeeze   a visible button / block link with text under 32px tall, or whose label wraps to 3+ lines
//   font      document.fonts.check for body and nav, and visible Bangla text whose width in its computed font is far from the same text
//             in a known Bengali stack (a fallback with no Bengali glyphs)
// A finding counts as FAILING only when it is NEW in Bangla (same kind on the same element is absent in English at that width).
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/shared-pages-bangla-layout-audit-browser.mjs
//   --page=<file>   one page only     --list  print every finding     --verbose  print passes
//   --mutate=wide     inject a 900px nowrap Bangla span into the landing page          (overflow must fail)
//   --mutate=cut      clip a nav label to 30px with an ellipsis                          (cut must fail)
//   --mutate=squeeze  set a page button's height to 20px                                 (squeeze must fail)
//   --mutate=font     force font-family: monospace on all text                           (font must fail)
// Screenshots (320px, Bangla) go to tools/i18n-verify/out/bn-layout/; per-row JSON to out/bn-layout/rows.json.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const ONLY = arg("page"), MUTATE = arg("mutate"), LIST = process.argv.includes("--list");

// Copied from shared-pages-keyboard-audit-browser.mjs (not edited there).
const PAGES = [
  ["Classes", "classes.html"], ["Course offers", "course-offers.html"], ["Curriculum", "curriculum.html"],
  ["Backup", "backup.html"], ["Import notes", "import-notes.html"], ["Dawah", "dawah.html"],
  ["Onboarding", "onboarding.html"], ["Accept invite", "accept-invite.html?token=not-a-real-link"],
  ["Monitor", "monitor.html"], ["Homework", "homework.html"], ["People", "people.html"], ["Records", "records.html"],
  ["Catalogue", "catalogue.html"], ["About", "about.html"], ["Bookmarks", "bookmarks.html"],
  ["Hadith collections", "hadith-collections.html"],
  ["Landing", "index.html"], ["Notes", "notes.html"], ["Journey map", "journey-map.html"], ["Deen study", "deen-study.html"],
  ["Arabic study", "arabic-study.html"], ["Self-check", "admin-self-check.html"], ["Taglines", "taglines.html"],
];
const REAL_SEED = `
DATA.tenants[0].name = lang("Madrasatul Muslimeen (Owner, Prime)", "মাদরাসাতুল মুসলিমীন (মালিক, প্রাইম)");
DATA.tenantPeople[0].name = lang("Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi", "মুহাম্মাদ আবদুর রহমান ইবনে আবদুল্লাহ আল-হাশিমী");
DATA.tenantPeople[1].name = lang("Maryam bint Abdullah Al-Hashimi", "মুহাম্মাদ আবদুর রহমান ইবনে আবদুল্লাহ আল-হাশিমী");
DATA.trackables[0].name = lang("Reading (with Tajweed)");
DATA.classes[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
DATA.courseOffers[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
DATA.bookmarks[0].saved[0].name = "Ayat al-Kursi and the last two āyāt of Al-Baqarah";
`;
const VIEWPORTS = [[320, 640], [390, 844], [768, 1024], [1440, 900]];
const OUT = "tools/i18n-verify/out/bn-layout";
fs.mkdirSync(OUT, { recursive: true });

// Runs in the page. Returns { overflow:[], cut:[], squeeze:[], font:[] }; every item has key (kind + element path, no text) and msg.
const MEASURE = () => {
  const W = document.documentElement.clientWidth;
  const vis = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e.hidden || e.inert) return false;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
      const d = e.parentElement?.closest("details");
      if (d && !d.open && e.parentElement === d && e.tagName !== "SUMMARY") return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const path = (el) => {
    const out = [];
    for (let e = el; e && e !== document.body && out.length < 4; e = e.parentElement)
      out.unshift(e.tagName.toLowerCase() + (e.id ? "#" + e.id : (typeof e.className === "string" && e.className.trim() ? "." + e.className.trim().split(/\s+/)[0] : "")));
    return out.join(">");
  };
  const txt = (el) => (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50);
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
  const res = { overflow: [], cut: [], squeeze: [], font: [] };
  const all = [...document.body.querySelectorAll("*")].filter((el) => !/^(SCRIPT|STYLE|SVG|PATH|OPTION|TEMPLATE|NOSCRIPT)$/i.test(el.tagName) && vis(el));

  // 1. overflow
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth) res.overflow.push({ key: "overflow|page", msg: `page scrolls sideways: scrollWidth ${doc.scrollWidth} > ${doc.clientWidth}` });
  const offenders = new Set();
  for (const el of all) {
    if (getComputedStyle(el).position === "fixed" && el.getBoundingClientRect().left >= W) continue; // an off-screen drawer
    const r = el.getBoundingClientRect();
    let bad = r.right > W + 1 ? `ends at ${Math.round(r.right)} past the ${W}px screen` : "";
    for (let a = el.parentElement; a && !bad && a !== document.documentElement; a = a.parentElement) {
      const ox = getComputedStyle(a).overflowX;
      if (ox === "hidden" || ox === "clip") { const ar = a.getBoundingClientRect(); if (r.right > ar.right + 1 && ar.width > 0) bad = `ends at ${Math.round(r.right)} past ${path(a)} (clips at ${Math.round(ar.right)})`; break; }
      if (ox === "auto" || ox === "scroll") break; // it scrolls: reachable
    }
    if (bad) offenders.add(el), (el.__ovMsg = bad);
  }
  for (const el of offenders) { // report the outermost offender only
    let p = el.parentElement, nested = false; while (p) { if (offenders.has(p)) { nested = true; break; } p = p.parentElement; }
    if (!nested) res.overflow.push({ key: "overflow|" + path(el), msg: `${path(el)} "${txt(el)}" ${el.__ovMsg}` });
  }

  // 2. cut
  for (const el of all) {
    if (!ownText(el) && !/^(BUTTON|A|SELECT)$/.test(el.tagName)) continue;
    const cs = getComputedStyle(el), w = el.clientWidth;
    if (w <= 0 || el.tagName === "SELECT" && false) continue;
    const clipping = cs.overflowX !== "visible" && cs.overflowX !== "auto" && cs.overflowX !== "scroll";
    const need = el.scrollWidth;
    if ((clipping || cs.textOverflow === "ellipsis") && need > w + 1) res.cut.push({ key: "cut|" + path(el), msg: `${path(el)} "${txt(el)}" needs ${need}px, has ${w}px` });
  }

  // 3. squeeze
  for (const el of all) {
    if (!el.matches("button, a[href], [role=button]") || !txt(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "inline") continue;
    const r = el.getBoundingClientRect();
    const rg = document.createRange(); rg.selectNodeContents(el); // the text's own line boxes, not the button's height
    const tops = new Set([...rg.getClientRects()].filter((q) => q.width > 0 && q.height > 0 && q.height < 80).map((q) => Math.round(q.top / 4)));
    const lines = tops.size;
    if (r.height < 32) res.squeeze.push({ key: "squeeze|h|" + path(el), msg: `${path(el)} "${txt(el)}" is ${Math.round(r.height)}px tall` });
    else if (lines >= 3) res.squeeze.push({ key: "squeeze|lines|" + path(el), msg: `${path(el)} "${txt(el)}" wraps to ${lines} lines` });
  }

  // 4. font
  const BN = /[ঀ-৿]/;
  const bodyFam = getComputedStyle(document.body).fontFamily;
  const navEl = document.querySelector("nav, #nav, .nav-bar, header") || document.body;
  const navFam = getComputedStyle(navEl).fontFamily;
  const hasBn = (fam) => document.fonts.check(`16px ${fam}`, "বাংলা");
  // fonts.check() is true for any installed face, so also refuse a stack pinned to a Latin-only face (monospace / Courier ...)
  // with no Bengali family named: the browser then has no reason to reach for a Bengali fallback.
  const BN_FAM = /Noto Sans Bengali|Nirmala|Kalpurush|Vrinda|Siyam Rupali|Hind Siliguri|Bangla|system-ui|sans-serif/i;
  const pinned = (fam) => /monospace|courier|consolas/i.test(fam) && !BN_FAM.test(fam);
  if (pinned(bodyFam)) res.font.push({ key: "font|body-pinned", msg: `body font-family (${bodyFam}) is pinned to a face with no Bengali glyphs` });
  if (!hasBn(bodyFam)) res.font.push({ key: "font|body", msg: `body font-family (${bodyFam}) fails fonts.check for বাংলা` });
  if (!hasBn(navFam)) res.font.push({ key: "font|nav", msg: `nav font-family (${navFam}) fails fonts.check for বাংলা` });
  const ctx = document.createElement("canvas").getContext("2d");
  const REF = `"Noto Sans Bengali", "Nirmala UI", "Kalpurush", "Vrinda", "Siyam Rupali", sans-serif`;
  const seen = new Set();
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n, checked = 0;
  while ((n = tw.nextNode()) && checked < 60) {
    const s = n.nodeValue.replace(/\s+/g, " ").trim();
    const p = n.parentElement;
    if (!p || !BN.test(s) || /[A-Za-z]/.test(s) || s.length < 4 || !vis(p) || /^(SCRIPT|STYLE)$/.test(p.tagName)) continue;
    const cs = getComputedStyle(p);
    if (/amiri|naskh|scheherazade|uthmani|serif.*arabic/i.test(cs.fontFamily) && !/Noto Sans Bengali|Kalpurush|Vrinda|Nirmala/i.test(cs.fontFamily)) { /* an Arabic-face element: still must render Bengali */ }
    if (pinned(cs.fontFamily)) { res.font.push({ key: "font|pinned|" + path(p), msg: `${path(p)} "${s.slice(0, 30)}" is set in (${cs.fontFamily}), no Bengali glyphs` }); checked++; continue; }
    const sig = cs.fontFamily + "|" + cs.fontSize + "|" + cs.fontWeight + "|" + s.slice(0, 12);
    if (seen.has(sig)) continue; seen.add(sig); checked++;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const a = ctx.measureText(s).width;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${REF}`;
    const b = ctx.measureText(s).width;
    const ratio = a / b;
    if (b > 0 && (ratio < 0.75 || ratio > 1.33)) res.font.push({ key: "font|node|" + path(p), msg: `${path(p)} "${s.slice(0, 30)}" renders ${Math.round(a)}px in (${cs.fontFamily}) vs ${Math.round(b)}px in a Bengali stack (x${ratio.toFixed(2)})` });
  }
  return res;
};

const MUTATIONS = {
  wide: () => { const s = document.createElement("span"); s.textContent = "এটি একটি অনেক দীর্ঘ বাংলা লেখা ".repeat(12); s.style.cssText = "display:inline-block;width:900px;white-space:nowrap"; document.body.appendChild(s); },
  cut: () => {
    const own = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue.trim()).join("").length;
    const el = [...document.querySelectorAll(".nav-cat > summary, nav > a, header a, header button")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && own(e) >= 2; }).sort((a, b) => own(b) - own(a))[0]; // the longest visible nav label
    if (el) el.style.cssText += ";max-width:30px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block";
  },
  squeeze: () => { const b = [...document.querySelectorAll("button")].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.textContent.trim(); }); if (b) b.style.cssText += ";height:20px;min-height:0;overflow:hidden"; },
  font: () => { const s = document.createElement("style"); s.textContent = "body, body * { font-family: monospace !important }"; document.head.appendChild(s); },
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`unknown --mutate=${MUTATE}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const rows = [];

async function measure(path, w, h, lang, name) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: REAL_SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const sep = path.includes("?") ? "&" : "?";
  const { page: P } = await openPage(ctx, "/app/" + path + sep + (path.startsWith("hadith-collections") ? "back=1" : "navBack=1"));
  await P.waitForTimeout(1000);
  if (lang === "bn") {
    const bnChars = await P.evaluate(() => (document.body.innerText.match(/[ঀ-৿]/g) || []).length);
    check(`${name} / ${w}: rendered in Bangla (positive control)`, bnChars >= 3, `Bangla characters: ${bnChars}`);
    if (MUTATE && (MUTATE !== "wide" || path === "index.html")) { await P.evaluate(MUTATIONS[MUTATE]); await P.waitForTimeout(150); }
    if (w === 320 && !MUTATE) await P.screenshot({ path: `${OUT}/${path.replace(/[^a-z0-9]+/gi, "-").replace(/-html/, "")}.png`, fullPage: false });
  }
  const m = await P.evaluate(MEASURE);
  await ctx.close();
  return m;
}

for (const [name, path] of PAGES) {
  if (ONLY && !path.startsWith(ONLY)) continue;
  console.log(`\n== ${name} (${path}) ==`);
  for (const [w, h] of VIEWPORTS) {
    const bn = await measure(path, w, h, "bn", name);
    const en = await measure(path, w, h, "en", name);
    const row = { page: name, path, width: w, counts: {}, newInBn: {}, enCounts: {}, findings: {} };
    for (const kind of ["overflow", "cut", "squeeze", "font"]) {
      const enKeys = new Set(en[kind].map((f) => f.key));
      const fresh = bn[kind].filter((f) => !enKeys.has(f.key));
      row.counts[kind] = bn[kind].length; row.enCounts[kind] = en[kind].length; row.newInBn[kind] = fresh.length;
      row.findings[kind] = { bn: bn[kind].map((f) => f.msg), en: en[kind].map((f) => f.msg), fresh: fresh.map((f) => f.msg) };
      check(`${name} / ${w}: ${kind} (bn ${bn[kind].length}, en ${en[kind].length}, new in Bangla ${fresh.length})`, fresh.length === 0, "\n      " + fresh.slice(0, 8).map((f) => f.msg).join("\n      "));
      if (LIST) {
        for (const f of bn[kind]) console.log(`    [${w} bn ${kind}] ${f.msg}`);
        for (const f of en[kind]) console.log(`    [${w} en ${kind}] ${f.msg}`);
      }
    }
    rows.push(row);
  }
}
if (!MUTATE && !ONLY) fs.writeFileSync(`${OUT}/rows.json`, JSON.stringify(rows, null, 1));
console.log("\n=== per page and width: bn counts (overflow/cut/squeeze/font) -> new in Bangla ===");
for (const r of rows) console.log(`${r.page.padEnd(20)} ${String(r.width).padStart(4)}  bn ${r.counts.overflow}/${r.counts.cut}/${r.counts.squeeze}/${r.counts.font}  en ${r.enCounts.overflow}/${r.enCounts.cut}/${r.enCounts.squeeze}/${r.enCounts.font}  new ${r.newInBn.overflow}/${r.newInBn.cut}/${r.newInBn.squeeze}/${r.newInBn.font}`);
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
await browser.close();
process.exit(fail ? 1 : 0);
