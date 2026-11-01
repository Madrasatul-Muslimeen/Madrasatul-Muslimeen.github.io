// Audit part 145 (issue #1382): the v13 Note's sheets (🗂 Folders, 📎 Attach) and the Hadith page's 📝 route at large text,
// with real-length data. REPORT ONLY: no app file changes.
// Surfaces: hadith (hadith-study.html 📝 -> shared Note window), hadith-long (same, a long Arabic+English+Bangla hadith attached),
//           journey-new (journey-map.html?embed=1&new=1 with the long folder path).
// Each is measured: window/page fit, 🗂 Folders open, 📎 Attach open (window pages only), Tab trap, night focus ring >= 3:1.
// Large text is modelled by html{font-size:N%} as part 144 did. Night look is the default; the suite sets it explicitly.
// Run from repo root with node serve.js on 8080:
//   node tools/i18n-verify/note-sheets-hadith-large-browser.mjs [--page=hadith|hadith-long|journey-new] [--width=390] [--lang=bn] [--scale=200] [--shots]
//   --mutate=fit | --mutate=ring | --mutate=trap   (each must FAIL)
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) pass++; else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const MUTATE = arg("mutate"), SHOTS = process.argv.includes("--shots");
const OUT = "tools/i18n-verify/out/note-sheets-hadith"; fs.mkdirSync(OUT, { recursive: true });
const WIDTHS = [[360, 740], [390, 844], [768, 1024], [820, 1180], [1024, 768], [1180, 820], [1440, 900]].filter(([w]) => !arg("width") || String(w) === arg("width"));
const LANGS = ["en", "bn"].filter((l) => !arg("lang") || l === arg("lang"));
const SCALES = [100, 150, 200].filter((s) => !arg("scale") || String(s) === arg("scale"));
const NOISE = /ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i;
const EN_NAMES = ["Reflections on patience and gratitude across the whole of the Qur'an", "Hadith studies with commentary from the classical scholars of every school", "Personal notes written during the long weekly circle of study at the masjid", "Questions to ask my teacher about the meaning of intention and sincerity", "Things to revisit after Ramadan when there is more time for slow reading", "Sixth level folder with an even longer name than every one above it, for measure"];
const BN_NAMES = ["কুরআনজুড়ে ধৈর্য ও কৃতজ্ঞতা নিয়ে ভাবনাসমূহ এবং আরও অনেক দীর্ঘ কথা", "সকল মাযহাবের প্রাচীন আলেমদের ব্যাখ্যাসহ হাদীস অধ্যয়নের নোট", "মসজিদে সাপ্তাহিক দীর্ঘ অধ্যয়ন চক্রের সময় লেখা ব্যক্তিগত নোট", "নিয়ত ও ইখলাসের অর্থ নিয়ে শিক্ষককে জিজ্ঞাসা করার প্রশ্নসমূহ", "রমযানের পর ধীরে পড়ার জন্য আবার দেখার বিষয়গুলো", "ষষ্ঠ স্তরের ফোল্ডার যার নাম উপরের সবগুলোর চেয়েও দীর্ঘ পরিমাপের জন্য"];
const LONG = {
  ar: "حَدَّثَنَا " + "عَنْ أَبِي هُرَيْرَةَ رَضِيَ اللَّهُ عَنْهُ قَالَ قَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ ".repeat(6),
  en: "Narrated by Abu Hurayrah, may Allah be pleased with him: the Messenger of Allah, peace be upon him, said a very long saying to measure with. ".repeat(6),
  bn: "আবূ হুরায়রা রাদিয়াল্লাহু আনহু থেকে বর্ণিত, আল্লাহর রাসূল সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম পরিমাপের জন্য একটি খুব দীর্ঘ কথা বলেছেন। ".repeat(6),
};
const seedFor = (lang) => {
  const names = lang === "bn" ? BN_NAMES : EN_NAMES;
  return `(function(){window.__stubApplyBatches=true;window.__stubRecordTxData=true;localStorage.setItem("mm_card_look","night");window.__DATA=DATA;
var own={tenantId:"t1",ownerPersonId:"p1",ownerUid:"test-uid",schemaVersion:1};
function ts(){return{toDate:function(){return new Date("2026-09-01T10:00:00Z")},toMillis:function(){return new Date("2026-09-01T10:00:00Z").getTime()}}}
DATA.noteFolders=[];DATA.notes=[];DATA.notePlacements=[];DATA.noteRevisions=[];DATA.noteSections=[];DATA.noteTags=[];DATA.noteTagLinks=[];DATA.noteSources=[];DATA.noteLinks=[];
var names=${JSON.stringify(names)};
names.forEach(function(n,i){DATA.noteFolders.push(Object.assign({_id:"t1__f"+i,folderId:"f"+i,name:n,parentFolderId:i?"f"+(i-1):null,semanticRole:"user",order:0,status:"active",updatedAt:ts()},own))});
})();`;
};
const src = fs.readFileSync("tools/i18n-verify/shared-tools-a11y-browser.mjs", "utf8");
const ia = src.indexOf("const INSTALL = "), ib = src.indexOf("\n};\n", ia);
const INSTALL = (0, eval)("(" + src.slice(ia + 16, ib + 3).replace(/;\s*$/, "") + ")");

// in-page fit probe over rootSel (the same rules as part 144, plus "inside the scroll container" reachability)
const FIT = (rootSel) => {
  const root = document.querySelector(rootSel) || document.body, out = [];
  const vw = innerWidth;
  const desc = (e) => e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/)[0] : "");
  const shown = (e) => { for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const c = getComputedStyle(x); if (x.hidden || c.display === "none" || c.visibility === "hidden") return false; } const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const de = document.documentElement;
  if (de.scrollWidth > vw + 1) out.push("sideways scroll: document " + de.scrollWidth + " > viewport " + vw);
  for (const e of root.querySelectorAll("button, a[href], select, input:not([type=hidden]), textarea, summary, [role=button], [role=menuitem], [role=checkbox]")) {
    if (!shown(e)) continue;
    const r = e.getBoundingClientRect();
    for (let p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const c = getComputedStyle(p);
      const clipX = /(hidden|clip)/.test(c.overflowX), clipY = /(hidden|clip)/.test(c.overflowY);
      if (!clipX && !clipY) continue;
      const pr = p.getBoundingClientRect();
      if ((clipX && (r.left < pr.left - 1 || r.right > pr.right + 1)) || (clipY && (r.top < pr.top - 1 || r.bottom > pr.bottom + 1))) { out.push("control " + desc(e) + " is cut by " + desc(p)); break; }
    }
    // reachability: a control below a scroll container's visible box is fine only when that container can scroll to it
    for (let p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const c = getComputedStyle(p);
      if (/(auto|scroll)/.test(c.overflowY)) { if (p.scrollHeight <= p.clientHeight + 1 && (r.bottom > p.getBoundingClientRect().bottom + 1 || r.top < p.getBoundingClientRect().top - 1)) out.push("control " + desc(e) + " is outside " + desc(p) + " and it cannot scroll"); break; }
    }
    let scrollable = false;
    for (let p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) if (/(auto|scroll)/.test(getComputedStyle(p).overflowX) && p.scrollWidth > p.clientWidth + 1) { scrollable = true; break; }
    if (!scrollable && (r.right > vw + 1 || r.left < -1)) out.push("control " + desc(e) + " leaves the viewport sideways (" + Math.round(r.left) + ".." + Math.round(r.right) + " of " + vw + ")");
    if (!scrollable && r.bottom > innerHeight + 1 && !/(auto|scroll)/.test(getComputedStyle(document.scrollingElement).overflowY) && de.scrollHeight <= innerHeight + 1) out.push("control " + desc(e) + " is below the screen and the page cannot scroll");
  }
  for (const e of root.querySelectorAll("*")) {
    const c = getComputedStyle(e);
    const whole = (e.textContent || "").trim(), tip = (e.getAttribute("title") || "").trim();
    if (c.textOverflow === "ellipsis" && c.whiteSpace === "nowrap" && e.scrollWidth > e.clientWidth + 1 && shown(e) && whole && !(tip && whole.endsWith(tip))) out.push("label " + desc(e) + " is cut by ellipsis (" + e.scrollWidth + " > " + e.clientWidth + "): " + whole.slice(0, 30));
  }
  // a placeholder that tells the reader what to type must fit its field (an input cannot wrap it)
  for (const e of root.querySelectorAll("input[placeholder]")) {
    if (!shown(e) || e.value) continue;
    const c = getComputedStyle(e), cv = document.createElement("canvas").getContext("2d"); cv.font = c.fontStyle + " " + c.fontWeight + " " + c.fontSize + " " + c.fontFamily;
    const need = cv.measureText(e.placeholder).width, have = e.clientWidth - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight);
    if (need > have + 1) out.push("placeholder of " + desc(e) + " is cut (" + Math.round(need) + " > " + Math.round(have) + "): " + e.placeholder.slice(0, 30));
  }
  // overlap: two visible controls whose boxes cross by more than 2px each way
  const onTop = (e) => { const r = e.getBoundingClientRect(), x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1), t = document.elementFromPoint(x, y); return !t || e.contains(t) || t.contains(e); };
  const ctl = [...root.querySelectorAll("button, a[href], select, input:not([type=hidden]), textarea, [role=button]")].filter((e) => shown(e) && onTop(e)); // a control covered by a sheet is not on screen
  for (let i = 0; i < ctl.length; i++) for (let j = i + 1; j < ctl.length; j++) {
    if (ctl[i].contains(ctl[j]) || ctl[j].contains(ctl[i])) continue;
    const a = ctl[i].getBoundingClientRect(), b = ctl[j].getBoundingClientRect();
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) out.push("controls " + desc(ctl[i]) + " and " + desc(ctl[j]) + " overlap");
  }
  // the old arrow toggles: a show/hide section must wear the shared J109 switch, never a ▸ / ▾ arrow
  for (const e of root.querySelectorAll("summary, button, [role=button]")) { if (shown(e) && /^[\s]*[▸▾▶▼►◂◀]/.test(e.textContent || "")) out.push("ARROW toggle " + desc(e) + ": " + (e.textContent || "").trim().slice(0, 24)); }
  return [...new Set(out)];
};
// focus-ring contrast: the focused element's outline (or box-shadow ring) colour against the first opaque background behind it
const RING = () => {
  const e = document.activeElement; if (!e || e === document.body) return { none: true };
  const parse = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  let bg = { r: 255, g: 255, b: 255, a: 1 };
  for (let p = e.parentElement; p; p = p.parentElement) { const c = parse(getComputedStyle(p).backgroundColor); if (c && c.a > 0.9) { bg = c; break; } }
  const cs = getComputedStyle(e);
  let ring = null, kind = "";
  if (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) { ring = parse(cs.outlineColor); kind = "outline"; }
  if (!ring) { const m = /(rgba?\([^)]+\))\s+0px\s+0px\s+0px\s+([\d.]+)px/.exec(cs.boxShadow || ""); if (m) { ring = parse(m[1]); kind = "box-shadow"; } }
  const tag = e.tagName.toLowerCase() + (e.dataset && e.dataset.nnTool ? "[" + e.dataset.nnTool + "]" : "") + (e.className && typeof e.className === "string" ? "." + e.className.split(/\s+/)[0] : "");
  if (!ring) return { tag, ring: false };
  return { tag, kind, ratio: Math.round(cr(ring, bg) * 100) / 100 };
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const findings = new Map();
const add = (k, m, w) => { const key = k + "|" + m; const e = findings.get(key) || { k, m, w: new Set() }; e.w.add(w); findings.set(key, e); };
const SCALE_CSS = (s) => "html{font-size:" + s + "% !important}";

// ---- positive controls, correct by construction ----
{
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 844 }, extraSeedJs: seedFor("en") });
  const { page: P } = await openPage(ctx, "/app/notes.html"); await P.waitForTimeout(1000);
  await P.evaluate(() => { document.body.innerHTML = '<div id="fx" style="width:300px"><button style="height:44px">Short</button><button style="height:44px">Other</button></div>'; });
  check("positive control (fit): a clean fixture reports nothing", (await P.evaluate(FIT, "#fx")).length === 0);
  await P.evaluate(() => { document.getElementById("fx").insertAdjacentHTML("beforeend", '<span id="cutlabel" style="display:block;width:60px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">a label far too long for its box</span><div style="width:80px;overflow:hidden"><button style="width:200px;height:40px">Wide</button></div><button style="position:absolute;left:10px;top:10px;width:90px;height:40px">Over</button><button style="display:block;height:30px">▸ Arrow section</button>'); });
  const f = await P.evaluate(FIT, "#fx");
  check("positive control (fit): a cut label is reported", f.some((m) => m.includes("cutlabel")));
  check("positive control (fit): a control cut by a clipping parent is reported", f.some((m) => m.includes("is cut by")));
  check("positive control (fit): overlapping controls are reported", f.some((m) => m.includes("overlap")));
  check("positive control (fit): an arrow toggle is reported", f.some((m) => m.startsWith("ARROW")));
  await P.evaluate(() => { document.body.innerHTML = '<div style="background:#0b1530"><button id="a" style="outline:3px solid #fff;outline-offset:2px">A</button><button id="b" style="outline:3px solid #0d1a38;outline-offset:2px">B</button><button id="c" style="outline:none">C</button></div>'; });
  await P.evaluate(() => document.getElementById("a").focus()); const ra = await P.evaluate(RING);
  await P.evaluate(() => document.getElementById("b").focus()); const rb = await P.evaluate(RING);
  await P.evaluate(() => document.getElementById("c").focus()); const rc = await P.evaluate(RING);
  check("positive control (ring): a white ring on navy passes, a navy ring on navy fails, no ring is reported", ra.ratio >= 3 && rb.ratio < 3 && rc.ring === false, JSON.stringify([ra, rb, rc]));
  await ctx.close();
}

async function frameOf(P) {
  const el = await P.waitForSelector("#noteOpener:not([hidden]) iframe", { timeout: 15000 });
  let f = null;
  for (let i = 0; i < 150 && !f; i++) { const c = await el.contentFrame(); if (c && /new=1/.test(c.url())) f = c; else await P.waitForTimeout(100); }
  if (!f) throw new Error("Note frame did not load");
  await f.waitForSelector("[data-nn-tool]", { timeout: 25000 });
  await P.waitForTimeout(700);
  return f;
}
async function openHadith(P, long) {
  await P.click('[data-hadith-tab="collections"]').catch(() => {});
  await P.waitForSelector('[data-hadeethenc-category="3"]', { timeout: 20000 });
  await P.click('[data-hadeethenc-category="3"]');
  await P.waitForSelector('[data-hadeethenc-hadith="4563"]', { timeout: 15000 });
  await P.click('[data-hadeethenc-hadith="4563"]');
  await P.waitForSelector('[data-hadeethenc-note-link="4563"][aria-disabled="false"]', { timeout: 15000 }).catch(() => {});
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!long) { await P.click('[data-hadeethenc-note-link="4563"]'); return; }
  await P.evaluate(async (L) => {
    const m = await import("/app/js/note-opener.js");
    const ref = await m.hadithRefById("4563", { unitKey: "hadith:hadeethenc:4563", label: "Sahih al-Bukhari 1 · a long hadith" });
    ref.text = { ar: L.ar, en: L.en, bn: L.bn };
    m.openNewNote({ ref, unitKey: "hadith:hadeethenc:4563", unitLabel: "Sahih al-Bukhari 1", title: "Sahih al-Bukhari 1 - a long hadith:", backLabel: "Back to the hadith", count: 2, onOpenExisting: () => {} });
  }, LONG);
}

const PAGES = [{ id: "hadith", path: "/app/hadith-study.html", win: true }, { id: "hadith-long", path: "/app/hadith-study.html", win: true, long: true }, { id: "journey-new", path: "/app/journey-map.html?embed=1&new=1", win: false }]
  .filter((p) => !arg("page") || arg("page") === p.id);

async function measureSet(tag, where, scale, P, F, shotName) {
  const fits = async (label, ctxFrame, sel) => {
    if (MUTATE === "fit") await ctxFrame.evaluate(() => { if (!document.getElementById("inj-wide")) { const d = document.createElement("div"); d.id = "inj-wide"; d.style.cssText = "width:3000px;height:20px"; document.body.appendChild(d); } });
    const fit = await ctxFrame.evaluate(FIT, sel);
    check(tag + " " + label + ": nothing cut/overlapping/off-box, no sideways scroll, no arrow", fit.length === 0, "\n      " + fit.slice(0, 3).join("\n      "));
    fit.forEach((m) => add(m.startsWith("ARROW") ? "ARROW" : "DEFECT fit", tag.split(" / ")[0] + " " + label + ": " + m.replace(/\d+/g, "N"), where + "@" + scale));
  };
  await fits("[window]", P, "#noteOpener");
  await fits("[Note page]", F, "body");
  // focus ring in the night look: Tab through the Note page tools, every focused one must show a ring >= 3:1
  await F.evaluate(() => document.querySelector("[data-nn-tool]")?.focus());
  const rings = [];
  for (let i = 0; i < 4; i++) { rings.push(await F.evaluate(RING)); await P.keyboard.press("Tab"); }
  if (MUTATE === "ring") await F.evaluate(() => { const s = document.createElement("style"); s.textContent = "*:focus,*:focus-visible{outline:2px solid #0b1530 !important;box-shadow:none !important}"; document.head.appendChild(s); });
  const rings2 = MUTATE === "ring" ? [await F.evaluate(RING)] : [];
  const badRing = [...rings, ...rings2].filter((r) => !r.none && (r.ring === false || r.ratio < 3));
  check(tag + " [Note page] (night) focus ring >= 3:1 on every tool tabbed to", badRing.length === 0 && rings.some((r) => !r.none), JSON.stringify(badRing.slice(0, 2)));
  badRing.forEach((r) => add("DEFECT focus-ring", tag.split(" / ")[0] + " Note page: " + JSON.stringify(r).replace(/\d+\.\d+/g, "N"), where + "@" + scale));
  // 🗂 Folders (the Map's picker in new mode)
  await F.evaluate(() => document.querySelector('[data-nn-tool="folders"]')?.click());
  await P.waitForTimeout(900);
  const fo = await F.evaluate(() => { const o = [...document.querySelectorAll("[role=dialog], .filing-picker, [data-filing-picker], .mm-pop, .nf-pop")].filter((e) => e.getBoundingClientRect().width > 1); return o.length; });
  check(tag + " 🗂 Folders opened (positive control)", fo > 0, "no dialog/popover found");
  await fits("🗂 Folders open [Note page]", F, "body");
  await fits("🗂 Folders open [window]", P, "#noteOpener");
  if (shotName) await P.screenshot({ path: OUT + "/" + shotName + "-folders.png" });
  await F.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  await F.keyboard?.press?.("Escape").catch(() => {});
  await P.keyboard.press("Escape"); await P.waitForTimeout(500);
}

async function measureAttach(tag, where, scale, P, F, shotName) {
  await F.evaluate(() => document.querySelector('[data-nn-tool="attach"]')?.click());
  const box = await P.waitForSelector("#noteOpener .no-attach:not([hidden]) .no-attach-box", { timeout: 8000 }).catch(() => null);
  check(tag + " 📎 Attach opened (positive control)", !!box);
  if (!box) return;
  await P.waitForTimeout(300);
  const fit = await P.evaluate(FIT, "#noteOpener .no-attach");
  check(tag + " 📎 Attach: nothing cut/overlapping/off-box, no sideways scroll", fit.length === 0, "\n      " + fit.slice(0, 3).join("\n      "));
  fit.forEach((m) => add("DEFECT fit", tag.split(" / ")[0] + " Attach: " + m.replace(/\d+/g, "N"), where + "@" + scale));
  const inBox = await P.evaluate(() => {
    const w = document.getElementById("noteOpener").getBoundingClientRect(), b = document.querySelector(".no-attach-box").getBoundingClientRect(), bad = [];
    if (b.left < w.left - 1 || b.right > w.right + 1 || b.top < w.top - 1 || b.bottom > w.bottom + 1) bad.push("box leaves the window");
    const box = document.querySelector(".no-attach-box");
    for (const e of box.querySelectorAll("button, input")) { const r = e.getBoundingClientRect(); const sc = getComputedStyle(document.querySelector(".no-attach")).overflowY; const clipped = r.bottom > w.bottom + 1 || r.top < w.top - 1; if (clipped && !/(auto|scroll)/.test(sc) && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) bad.push((e.dataset.noAttachGo !== undefined ? "Attach button" : e.tagName.toLowerCase()) + " outside the window and nothing scrolls"); }
    return bad;
  });
  check(tag + " 📎 Attach: every control inside the window box, reachable", inBox.length === 0, inBox.join("; "));
  inBox.forEach((m) => add("DEFECT attach-box", tag.split(" / ")[0] + ": " + m, where + "@" + scale));
  // Tab trap (v13.07 D3): 8 Tabs and 8 Shift+Tabs never leave the sheet
  const presses = MUTATE === "trap" ? 0 : 8;
  let out = 0;
  if (MUTATE === "trap") await P.evaluate(() => { document.querySelector(".no-attach").onkeydown = null; });
  for (let i = 0; i < 8; i++) { await P.keyboard.press("Tab"); if (!(await P.evaluate(() => !!document.activeElement?.closest?.(".no-attach")))) out++; }
  for (let i = 0; i < 8; i++) { await P.keyboard.press("Shift+Tab"); if (!(await P.evaluate(() => !!document.activeElement?.closest?.(".no-attach")))) out++; }
  void presses;
  check(tag + " 📎 Attach: Tab / Shift+Tab stay inside the sheet", out === 0, out + " presses left it");
  const ring = await P.evaluate(RING);
  check(tag + " 📎 Attach (night) focused control shows a ring >= 3:1", !ring.none && ring.ring !== false && ring.ratio >= 3, JSON.stringify(ring));
  if (!(ring.ratio >= 3)) add("DEFECT focus-ring", tag.split(" / ")[0] + " Attach: " + JSON.stringify(ring).replace(/\d+\.\d+/g, "N"), where + "@" + scale);
  if (shotName) await P.screenshot({ path: OUT + "/" + shotName + "-attach.png" });
  await P.keyboard.press("Escape"); await P.waitForTimeout(400);
}

for (const [w, h] of WIDTHS) for (const lang of LANGS) for (const scale of SCALES) for (const pg of PAGES) {
  const tag = pg.id + " / " + w + " / " + lang + " / " + scale + "%", where = w + lang;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: seedFor(lang) });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page: P, errors } = await openPage(ctx, pg.path);
  try {
    let F = P;
    if (pg.win) { await P.waitForTimeout(1200); await openHadith(P, pg.long); F = await frameOf(P); }
    else await P.waitForTimeout(2500);
    await P.addStyleTag({ content: SCALE_CSS(scale) });
    if (pg.win) await F.evaluate((c) => { const s = document.createElement("style"); s.textContent = c; document.head.appendChild(s); }, SCALE_CSS(scale));
    await P.waitForTimeout(400);
    const look = await P.evaluate(() => document.documentElement.getAttribute("data-card-look"));
    check(tag + ": night look is on (positive control)", look === "night", "data-card-look=" + look);
    const shot = SHOTS && [390, 1180].includes(w) && scale === 200 ? pg.id + "-" + w + "-" + lang : null;
    if (pg.win) {
      const back = await P.evaluate(() => { const c = document.querySelector(".no-close"); return { label: c?.getAttribute("aria-label"), visible: !!c && c.getBoundingClientRect().width > 1 }; });
      check(tag + ": the window's way back is named and visible", back.visible && !!back.label, JSON.stringify(back));
      await measureSet(tag, where, scale, P, F, shot);
      await measureAttach(tag, where, scale, P, F, shot);
      // the way-back law: ✕ closes the window and the hadith's card is still on screen
      await P.click(".no-close").catch(() => {});
      await P.waitForFunction(() => document.getElementById("noteOpener")?.hidden, null, { timeout: 9000 }).catch(() => {});
      const card = await P.evaluate(() => { const c = document.querySelector('[data-hadeethenc-card="4563"]')?.getBoundingClientRect(); return { hidden: document.getElementById("noteOpener")?.hidden, on: !!c && c.bottom > 0 && c.top < innerHeight }; });
      check(tag + ": ✕ closes the Note window and hadith 4563's card is still on screen", card.hidden && card.on, JSON.stringify(card));
    } else {
      await measureSet(tag, where, scale, P, P, shot);
    }
    const pe = errors.filter((e) => !NOISE.test(e));
    check(tag + ": no page errors", pe.length === 0, pe.slice(0, 2).join(" | "));
  } catch (e) { check(tag + ": the view opened (positive control)", false, String(e.message).slice(0, 200)); }
  await ctx.close();
}
fs.writeFileSync(OUT + "/findings.json", JSON.stringify([...findings.values()].map((f) => ({ ...f, w: [...f.w] })), null, 1));
console.log("\n=== findings (kind | measurement | width+language@scale) ===");
let n = 0; for (const f of findings.values()) console.log("  #" + (++n) + " " + f.k + " | " + f.m.slice(0, 220) + " | " + [...f.w].slice(0, 6).join(",") + (f.w.size > 6 ? "...(" + f.w.size + ")" : ""));
console.log("\n" + pass + " passed, " + fail + " failed");
await browser.close();
process.exit(fail ? 1 : 0);
