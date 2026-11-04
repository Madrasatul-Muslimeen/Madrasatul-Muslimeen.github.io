// Audit part 141 (PCF MSA J29, issue #1357): keyboard, accessible names, opened surfaces and contrast on hadith-study.html and dua-study.html.
// REPORT ONLY: no file under app/ changes. Method copied from audit parts 31 (names), 32 (opened surfaces), 33 (keyboard focus), 36 (contrast);
// the real-length seed and the view drivers are copied from large-text-hadith-study-browser.mjs / large-text-dua-study-browser.mjs (part 126 seed).
// For each page x width x language x VIEW (the page as it opens + every surface a reader can open) it measures
//   (a) names     every visible button / link / select / input / summary has an accessible name; in bn no chrome name is English
//   (b) keyboard  a real Tab walk reaches every visible control; each focused control has a visible ring (computed outline / box-shadow);
//                 SURFACES: Enter and Space open what a tap opens, Escape closes it and focus returns to the opener
//   (c) contrast  text against its REAL background (first opaque background, layers composited), 4.5:1 normal / 3:1 large; focus ring 3:1
// DEFECT (fails): control with no name, a visible control Tab cannot reach, a focused control with no ring, an opened surface Escape cannot close
// (or Enter/Space cannot open), text under its ratio.   MINOR (printed as INFO): odd tab order, a weak but present ring, focus not returned.
// Run from the repository root with node serve.js on 8080:
//   node tools/i18n-verify/hadith-dua-a11y-browser.mjs
//   --page=hadith|dua  --width=390  --lang=bn  --views=a,b  --list (every finding)  --shots  --mutate=noring (must FAIL)  --no-surfaces
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const LIST = process.argv.includes("--list"), SHOTS = process.argv.includes("--shots"), NO_SURF = process.argv.includes("--no-surfaces");
const MUTATE = arg("mutate");
const OUT = "tools/i18n-verify/out/hadith-dua-a11y";
fs.mkdirSync(OUT, { recursive: true });
const ALL_WIDTHS = [[360, 740], [390, 844], [768, 1024], [1024, 768], [1440, 900]];
const WIDTHS = ALL_WIDTHS.filter(([w]) => !arg("width") || String(w) === arg("width"));
const LANGS = ["en", "bn"].filter((l) => !arg("lang") || l === arg("lang"));
const BUKHARI = "0256Bukhari.Sahih.JK000110-ara1";
const TAB_CAP = 1600; // the Hadith Duas list is 40 cards of ~25 word buttons each

// Real-length data (part 126): long English / Bangla names for the tenant and the people.
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  DATA.ayahCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, collections: [] }];
  DATA.tenants[0].name = lang("Madrasatul Muslimeen (Owner, Prime)", "মাদরাসাতুল মুসলিমীন (মালিক, প্রাইম)");
  DATA.tenantPeople[0].name = lang("Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi", "মুহাম্মদ আব্দুল্লাহ আল-মামুন চৌধুরী");
  DATA.tenantPeople[1].name = lang("Maryam bint Abdullah Al-Hashimi", "মুহাম্মদ আব্দুল্লাহ আল-মামুন চৌধুরী");
  DATA.tenantPeople.push({ _id: "p3", tenantId: TENANT_ID, personId: "p3", name: lang("Fatima Zahra আব্দুর রহমান Al-Hashimi", "ফাতিমা জাহরা আব্দুর রহমান আল-হাশিমী"), managedByPersonId: "p1", isMinor: true, roles: ["student"] });
})();`;

// ---- in-page helpers, installed once per page load as window.__A11Y ----
const INSTALL = () => {
  const SEL = "button, a[href], select, input:not([type=hidden]), textarea, summary, [role=button], [role=link], [role=checkbox], [role=switch]";
  const vis = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e.hidden || e.inert) return false;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
      const d = e.parentElement?.closest("details");
      if (d && !d.open && e.parentElement === d && e.tagName !== "SUMMARY") return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const key = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) return s + "#" + el.id;
    const da = [...el.attributes].find((a) => a.name.startsWith("data-") && !a.name.startsWith("data-a11y"));
    if (da) s += `[${da.name}${da.value && da.value.length < 24 ? "=" + da.value : ""}]`;
    else if (typeof el.className === "string" && el.className.trim()) s += "." + el.className.trim().split(/\s+/)[0];
    return s;
  };
  const textOf = (el) => {
    let out = "";
    const walk = (n) => {
      if (n.nodeType === 3) { out += n.textContent; return; }
      if (n.nodeType !== 1) return;
      if (n.getAttribute("aria-hidden") === "true" || n.hidden) return;
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      if (n.tagName === "IMG") { out += n.getAttribute("alt") || ""; return; }
      if (n.tagName === "svg" || n.tagName === "SVG") { out += n.querySelector("title")?.textContent || n.getAttribute("aria-label") || ""; return; }
      if (n.tagName === "SELECT" || n.tagName === "INPUT" || n.tagName === "TEXTAREA") return;
      n.childNodes.forEach(walk);
    };
    el.childNodes.forEach(walk);
    return out.replace(/\s+/g, " ").trim();
  };
  const accName = (el) => {
    const lb = el.getAttribute("aria-labelledby");
    if (lb) { const t = lb.split(/\s+/).map((i) => document.getElementById(i)).filter(Boolean).map((n) => n.textContent).join(" ").replace(/\s+/g, " ").trim(); if (t) return t; }
    const al = (el.getAttribute("aria-label") || "").trim();
    if (al) return al;
    const tag = el.tagName;
    if (tag === "SELECT" || tag === "TEXTAREA" || (tag === "INPUT" && !/^(button|submit|reset|image)$/i.test(el.type))) {
      const t = [...(el.labels || [])].map((l) => l.textContent).join(" ").replace(/\s+/g, " ").trim();
      if (t) return t;
      const ph = (el.getAttribute("placeholder") || "").trim();
      if (ph) return ph;
    } else if (tag === "INPUT") {
      const v = (el.value || el.getAttribute("alt") || "").trim();
      if (v) return v;
    } else {
      const t = textOf(el);
      if (t) return t;
    }
    return (el.getAttribute("title") || "").trim();
  };
  // colours -> [r,g,b,a] (rgb()/rgba()/color(srgb ...)); anything else is null (unknown, reported not guessed)
  const parse = (s) => {
    let m = /^rgba?\(([^)]+)\)$/.exec(s);
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = /^color\(srgb ([^)]+)\)$/.exec(s);
    if (m) { const p = m[1].split(/[ /]+/).filter(Boolean).map(parseFloat); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]; }
    return null;
  };
  const over = (top, under) => { const a = top[3]; return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1]; };
  // real background behind el: composite every translucent layer up from the first opaque one; null + reason when an image / gradient is in the way
  const bgOf = (el) => {
    const layers = [];
    let reason = "";
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== "none") {
        // a gradient is measured at EVERY colour stop (worst case); a picture (url) cannot be measured and is reported
        if (/url\(/.test(cs.backgroundImage)) { reason = "picture background on " + key(e); break; }
        const stops = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);
        if (!stops.length) { reason = "unparsed gradient on " + key(e); break; }
        layers.push({ stops });
        if (stops.every((c) => c[3] >= 1)) break;
      }
      const c = parse(cs.backgroundColor);
      if (!c) { reason = "unparsed background " + cs.backgroundColor; break; }
      if (c[3] > 0) layers.push({ stops: [c] });
      if (c[3] >= 1) break;
    }
    if (reason) return { reason };
    let alts = [[255, 255, 255, 1]];
    for (let i = layers.length - 1; i >= 0; i--) alts = layers[i].stops.flatMap((st) => alts.map((b) => over(st, b)));
    return { rgb: alts[0], alts };
  };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  const opacityOf = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  const hex = (c) => "#" + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

  window.__A11Y = {
    vis, key, accName,
    // (a) every visible control and its name
    names() {
      const modal = document.querySelector("[data-dua-pop]");
      return [...document.querySelectorAll(SEL)].filter((e) => vis(e) && !e.matches(":disabled") && (!modal || modal.contains(e) || true)).map((e) => ({ key: key(e), name: accName(e), tag: e.tagName.toLowerCase(), inPop: !!modal && modal.contains(e) }));
    },
    // (b) the controls a reader can see and so expects to reach by Tab. Marks each with data-a11y-id.
    expected() {
      const modal = document.querySelector("[data-dua-pop]");
      const list = [...document.querySelectorAll(SEL)].filter((e) => {
        if (!vis(e) || e.matches(":disabled")) return false;
        if (modal && !modal.contains(e)) return false;        // behind a modal pop-up: not the view
        if (/^(tab|option|menuitem|menuitemradio|radio)$/.test(e.getAttribute("role") || "") && e.tabIndex < 0) return false; // roving tabindex
        return true;
      });
      list.forEach((e, i) => e.setAttribute("data-a11y-id", String(i)));
      return list.map((e, i) => ({ id: String(i), key: key(e), name: accName(e), tabindex: e.tabIndex }));
    },
    seen: new Set(),
    // visible controls (same filter as expected()) that no Tab stop has been on: judged on the live DOM at the END of the walk, so a re-render during it cannot fake a miss
    unreached() {
      const modal = document.querySelector("[data-dua-pop]");
      return [...document.querySelectorAll(SEL)].filter((e) => {
        if (!vis(e) || e.matches(":disabled") || window.__A11Y.seen.has(e)) return false;
        if (modal && !modal.contains(e)) return false;
        if (/^(tab|option|menuitem|menuitemradio|radio)$/.test(e.getAttribute("role") || "") && e.tabIndex < 0) return false;
        return true;
      }).map((e) => ({ key: key(e), name: accName(e), tabindex: e.tabIndex }));
    },
    focused() {
      const e = document.activeElement;
      if (!e || e === document.body || e === document.documentElement) return { body: true };
      window.__A11Y.seen.add(e);
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      const bg = bgOf(e);
      const oc = parse(cs.outlineColor);
      const outlineOn = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 && (!oc || oc[3] > 0);
      const shadowOn = cs.boxShadow && cs.boxShadow !== "none";
      let ringRatio = null;
      if (outlineOn && cs.outlineStyle !== "auto" && oc && bg.rgb) ringRatio = ratio(over(oc, bg.rgb), bg.rgb);
      let fixed = false;
      for (let a = e; a && a !== document.body; a = a.parentElement) if (getComputedStyle(a).position === "fixed") fixed = true;
      const pm = document.querySelector("[data-dua-pop]");
      return { inModal: !!pm && pm.contains(e), hasModal: !!pm, id: e.getAttribute("data-a11y-id"), key: key(e), name: accName(e), top: r.top + scrollY, left: r.left + scrollX, fixed, ringOn: !!(outlineOn || shadowOn), outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, shadow: shadowOn ? cs.boxShadow.slice(0, 60) : "none", ringRatio, bgReason: bg.reason || "" };
    },
    // (c) text colour against its real background
    contrast() {
      const out = [], unknown = [];
      const els = [...document.body.querySelectorAll("*")].filter((e) => !/^(SCRIPT|STYLE|SVG|PATH|OPTION|TEMPLATE|NOSCRIPT|HEAD)$/i.test(e.tagName));
      for (const e of els) {
        const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        const field = /^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && e.type !== "hidden" && (e.value || e.tagName === "SELECT");
        if (!own && !field) continue;
        if (!vis(e) || e.matches(":disabled") || e.closest(":disabled")) continue;
        const cs = getComputedStyle(e);
        const fg = parse(cs.color);
        const bg = bgOf(e);
        const txt = ((own ? [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ") : e.value || "") + "").replace(/\s+/g, " ").trim().slice(0, 36);
        if (!fg || !bg.rgb) { unknown.push({ key: key(e), txt, why: !fg ? "unparsed colour " + cs.color : bg.reason }); continue; }
        const op = opacityOf(e);
        let eff = null, r = 99, worst = bg.rgb;
        for (const b of bg.alts) { const ef = over([fg[0], fg[1], fg[2], fg[3] * op], b), rr = ratio(ef, b); if (rr < r) { r = rr; eff = ef; worst = b; } }
        const px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
        const large = px >= 24 || (px >= 18.66 && bold);
        const need = large ? 3 : 4.5;
        if (r < need) out.push({ key: key(e), txt, ratio: Math.round(r * 100) / 100, need, fg: hex(eff), bg: hex(worst), px });
      }
      return { fail: out, unknown };
    },
    visible(sel) { const e = document.querySelector(sel); return !!e && vis(e); },
    activeKey() { const e = document.activeElement; return e && e !== document.body ? key(e) : "body"; },
    activeIn(sel) { const e = document.activeElement, o = document.querySelector(sel); return !!(e && o && (e === o || o.contains(e))); },
  };
};

// ---- positive controls: a defective thing injected into the page ----
const INJECT = () => {
  const h = document.createElement("div");
  h.id = "__inject"; h.style.cssText = "position:relative;padding:8px;background:#fff";
  h.innerHTML = `<button id="inj-unnamed" style="width:44px;height:44px"><span></span></button>
    <button id="inj-notab" tabindex="-1" style="height:44px">Injected not reachable by Tab</button>
    <p id="inj-grey" style="margin:4px;padding:4px;color:#999;background:#aaa;font-size:16px">Injected grey on grey line</p>`;
  document.body.prepend(h);
};
const NORING_CSS = "*,*:focus,*:focus-visible{outline:none!important;box-shadow:none!important}";

const wait = (P, sel, ms = 25000) => P.waitForSelector(sel, { timeout: ms });

// ---- Hadith views ----
const hTab = (P, v) => P.click(`[data-hadith-tab="${v}"]`);
const hShelf = (P) => wait(P, `[data-openiti-book="${BUKHARI}"]`);
const hOpenBukhari = async (P) => { await hShelf(P); await P.click(`[data-openiti-book="${BUKHARI}"]`); await wait(P, "[data-openiti-goto-input]", 15000); };
const hGoto = async (P) => { await hOpenBukhari(P); await P.fill("[data-openiti-goto-input]", "6306"); await P.click("[data-openiti-goto-btn]"); await wait(P, '[data-openiti-passage="6578"]', 20000); };
const hHadeeth = async (P) => { await hTab(P, "collections"); await wait(P, '[data-hadeethenc-category="3"]', 20000); await P.click('[data-hadeethenc-category="3"]'); await wait(P, '[data-hadeethenc-hadith="4563"]', 15000); await P.click('[data-hadeethenc-hadith="4563"]'); await wait(P, '[data-hadeethenc-card="4563"]', 15000); await P.waitForTimeout(800); };
const hDua = async (P) => { await hTab(P, "dua"); await wait(P, "[data-dua-card]", 20000); await P.waitForTimeout(600); };
const HADITH_VIEWS = [
  { id: "opens", label: "The page as it opens (Hadith Books shelf)", go: hShelf },
  { id: "books-menu", label: "Hadith Books: the quick list of books open", go: async (P) => { await hShelf(P); await hTab(P, "books"); await wait(P, '[data-hadith-menu="books"]:not([hidden]) [data-hadith-book-pick]', 15000); } },
  { id: "book-chapters", label: "Hadith Books: Bukhari on its chapters", go: hOpenBukhari },
  { id: "narration", label: "Hadith Books: a narration open", go: hGoto },
  { id: "subjects-menu", label: "Subjects: the menu open", go: async (P) => { await hShelf(P); await hTab(P, "subjects"); await wait(P, '[data-hadith-menu="subjects"]:not([hidden]) [data-hadith-subject-pick]', 10000); } },
  { id: "subject", label: "Subjects: Learning Akhlaq", go: async (P) => { await hShelf(P); await hTab(P, "subjects"); await P.click('[data-hadith-subject-pick="akhlaq"]'); await wait(P, "[data-hadith-subject]", 10000); } },
  { id: "encyclopedia", label: "Encyclopedia: the category list", go: async (P) => { await hTab(P, "collections"); await wait(P, '[data-hadeethenc-category="3"]', 20000); } },
  { id: "hadeethenc-card", label: "Encyclopedia: a hadith card", go: hHadeeth },
  { id: "hadeethenc-assign", label: "Encyclopedia: card with the 👥 list open", go: async (P) => { await hHadeeth(P); await P.click('[data-hadeethenc-card="4563"] [data-assign-trigger]').catch(() => {}); await P.waitForTimeout(500); } },
  { id: "topic", label: "Topics", go: async (P) => { await hTab(P, "topic"); await P.waitForTimeout(1500); } },
  { id: "search", label: "Search", go: async (P) => { await hTab(P, "search"); await P.waitForTimeout(1500); } },
  { id: "explore", label: "Explore", go: async (P) => { await hTab(P, "explore"); await P.waitForTimeout(1500); } },
  { id: "commentary", label: "Commentary", go: async (P) => { await hTab(P, "commentary"); await P.waitForTimeout(1500); } },
  { id: "dua-cards", label: "Dua: the Duas list", go: hDua },
  { id: "dua-word", label: "Dua: a card with a word card open", go: async (P) => { await hDua(P); await P.click('[data-dua-card="4"] [data-dua-word="1"]'); await wait(P, '[data-dua-word-panel="4"]', 10000).catch(() => {}); await P.waitForTimeout(600); } },
  { id: "dua-check", label: "Dua: the ✓ Check this dua panel", go: async (P) => { await hDua(P); await P.click('[data-dua-card="2"] [data-dua-check-open]'); await wait(P, '[data-dua-check-panel="2"] [data-dua-check-member]', 15000); await P.waitForTimeout(600); } },
  { id: "dua-chapters", label: "Dua: Dua chapters, the books", go: async (P) => { await hDua(P); await P.click('[data-dua-mode="chapters"]'); await wait(P, "[data-dua-book]", 15000); } },
  { id: "dua-chapter-list", label: "Dua: a book's Dua chapters", go: async (P) => { await hDua(P); await P.click('[data-dua-mode="chapters"]'); await wait(P, `[data-dua-book="${BUKHARI}"]`, 15000); await P.click(`[data-dua-book="${BUKHARI}"]`); await wait(P, "[data-dua-chapter]", 15000); } },
];
// surfaces: opener -> what appears. `setup` brings the page to the state where the opener is visible.
const HADITH_SURFACES = [
  { id: "books-list", setup: hShelf, opener: '[data-hadith-tab="books"]', surface: '[data-hadith-menu="books"]:not([hidden])' },
  { id: "subjects-list", setup: hShelf, opener: '[data-hadith-tab="subjects"]', surface: '[data-hadith-menu="subjects"]:not([hidden])' },
  { id: "assign-list", setup: hHadeeth, opener: '[data-hadeethenc-card="4563"] [data-assign-trigger]', surface: '[data-hadeethenc-card="4563"] [data-assign-popover]' },
  { id: "dua-word-panel", setup: hDua, opener: '[data-dua-card="4"] [data-dua-word="1"]', surface: '[data-dua-word-panel="4"]' },
  { id: "dua-check-panel", setup: hDua, opener: '[data-dua-card="2"] [data-dua-check-open]', surface: '[data-dua-check-panel="2"]' },
];

// ---- Dua views ----
const dListReady = (P) => wait(P, ".dua-row, [data-dua-empty], .dua-tile", 25000);
const dCardReady = async (P) => { await wait(P, "[data-dua-open] .dua-card-menu, [data-dua-tie-open] .dua-card-menu", 30000); await P.waitForTimeout(600); };
const dPop = (key) => async (P) => { await dCardReady(P); await P.click(`[data-dua-menu="${key}"]`); await wait(P, `[data-dua-pop="${key}"]`, 15000); await P.waitForTimeout(500); };
const RASUL = "?g=rasul&open=1";
const DUA_VIEWS = [
  { id: "opens", label: "The page as it opens (Rasulullah list)", url: "", go: dListReady },
  { id: "groups-menu", label: "The Dua groups menu open", url: "", go: async (P) => { await dListReady(P); await P.click('[data-dua-pd="groups"]'); await wait(P, ".dua-pull [data-dua-group]", 10000); } },
  { id: "occasions-parts", label: "Occasions: the part tiles", url: "?g=occasions", go: dListReady },
  { id: "occasions-part", label: "Occasions, a part chosen", url: "?g=occasions&part=wake", go: dListReady },
  { id: "parts-menu", label: "Occasions: the parts menu open", url: "?g=occasions&part=wake", go: async (P) => { await dListReady(P); await P.click('[data-dua-pd="parts"]'); await wait(P, ".dua-pull [data-dua-part]", 10000); } },
  { id: "books-part", label: "Hadith Books, a part chosen", url: `?g=books&part=${BUKHARI}`, go: dListReady },
  { id: "prophets", label: "Dua of Prophets (list)", url: "?g=prophets", go: dListReady },
  { id: "sahaba-empty", label: "An empty group (Sahaba)", url: "?g=sahaba", go: dListReady },
  { id: "card", label: "A Dua Card open", url: RASUL, go: dCardReady },
  { id: "pop-meaning", label: "Pop-up: Meaning", url: RASUL, go: dPop("meaning") },
  { id: "pop-source", label: "Pop-up: Source", url: RASUL, go: dPop("source") },
  { id: "pop-narration", label: "Pop-up: The whole narration", url: RASUL, go: async (P) => { await dPop("narration")(P); await P.evaluate(() => { const d = document.querySelector("[data-dua-pop] details"); if (d) d.open = true; }); await P.waitForTimeout(300); } },
  { id: "pop-check", label: "Pop-up: ✓ Check", url: RASUL, go: dPop("check") },
  { id: "check-panel", label: "✓ Check panel opened", url: RASUL, go: async (P) => { await dPop("check")(P); await P.click("[data-dua-pop] [data-dua-check-open]"); await wait(P, "[data-dua-check-panel]", 15000); await P.waitForTimeout(500); } },
  { id: "pop-poster", label: "The 🖼 Poster", url: RASUL, go: dPop("poster") },
  { id: "pop-share", label: "Copy / share", url: RASUL, go: dPop("share") },
  { id: "hisn-card", label: "A Hisn al-Muslim card", url: "?g=occasions&part=wake&open=1", go: async (P) => { await wait(P, "[data-dua-hisn]", 25000); await P.waitForTimeout(500); } },
  { id: "hisn-source", label: "Hisn card: Source pop-up", url: "?g=occasions&part=wake&open=1", go: async (P) => { await wait(P, "[data-dua-hisn]", 25000); await P.click('[data-dua-menu="source"]'); await wait(P, '[data-dua-pop="source"]', 10000); await P.waitForTimeout(400); } },
  { id: "prophet-card", label: "A Prophets' card", url: "?g=prophets&open=1", go: async (P) => { await wait(P, "[data-dua-quran]", 25000); await P.waitForTimeout(500); } },
];
const DUA_SURFACES = [
  { id: "groups-pull", url: "", setup: dListReady, opener: '[data-dua-pd="groups"]', surface: ".dua-pull" },
  { id: "parts-pull", url: "?g=occasions&part=wake", setup: dListReady, opener: '[data-dua-pd="parts"]', surface: ".dua-pull" },
  ...["meaning", "source", "narration", "check", "poster", "share"].map((k) => ({ id: "pop-" + k, url: RASUL, setup: dCardReady, opener: `[data-dua-menu="${k}"]`, surface: `[data-dua-pop="${k}"]` })),
  // The panel's opener sits in the ✓ Check pop-up, which closes as the panel opens (by design): Escape returns focus to the card
  // menu's ✓ Check (`returnTo`), and the pop-up is opened again before Space (`reopen`), as a reader would.
  { id: "check-panel", url: RASUL, setup: dPop("check"), opener: "[data-dua-pop] [data-dua-check-open]", surface: "[data-dua-check-panel]",
    returnTo: '[data-dua-menu="check"]', reopen: dPop("check") },
];
const PAGES = [
  { id: "hadith", path: "/app/hadith-study.html", views: HADITH_VIEWS, surfaces: HADITH_SURFACES },
  { id: "dua", path: "/app/dua-study.html", views: DUA_VIEWS, surfaces: DUA_SURFACES },
].filter((p) => !arg("page") || p.id === arg("page"));
const VIEWSEL = arg("views") ? arg("views").split(",") : null;

// bn: a name with a Latin word is either DATA (a book's own transliterated title, a source's proper name HadeethEnc / OpenITI, a language's own name:
// listed as INFO "bn-latin-name (triage)" and read by hand) or an English CHROME word. The latter is decided by this list of the words the two pages
// use for their own buttons, headings and states; any of them standing in a bn name is a DEFECT.
const ENGLISH_CHROME = /\b(Close|Back|Next|Previous|Check|Search|Home|Modules|Operation|Bookmark|Bookmarks|Save|Open|Copy|Share|Poster|Meaning|Source|My Notes|Notes|Studied|Learning|Practising|Achieved|Mastered|Not started|Menu|Show|Hide|Print|Edit|Delete|Cancel|Done|Page|Members|Explore|Topics|Subjects|Encyclopedia|translation|narration|vowels|Go to|Occasions|Prophets|Books)\b/i;

// ---- the three audits for one loaded state ----
const audit = async (P, ctxInfo) => {
  const names = await P.evaluate(() => window.__A11Y.names());
  const nameDefects = names.filter((n) => !n.name).map((n) => `${n.key} has no accessible name`);
  const bnNames = ctxInfo.lang === "bn" ? names.filter((n) => n.name && /[A-Za-z]{3,}/.test(n.name)) : [];
  // (only short names: a long one is a row carrying a dua's or hadith's own text, which is data and is triaged by hand)
  const english = bnNames.filter((n) => n.name.length <= 45 && ENGLISH_CHROME.test(n.name)).map((n) => `${n.key} "${n.name.slice(0, 50)}"`);
  const latin = bnNames.filter((n) => !(n.name.length <= 45 && ENGLISH_CHROME.test(n.name))).map((n) => `${n.key} "${n.name.slice(0, 40)}"`);
  const con = await P.evaluate(() => window.__A11Y.contrast());
  const contrastDefects = con.fail.map((c) => `${c.key} "${c.txt}" ${c.ratio}:1 (need ${c.need}) ${c.fg} on ${c.bg} ${c.px}px`);
  const exp = await P.evaluate(() => window.__A11Y.expected());
  const reached = new Set(), seq = [], ringBad = [], ringWeak = [];
  // The Tab walk must start at the TOP of the document (a click leaves Chrome's sequential start point mid-page): a 1px focusable marker is put first and focused
  await P.evaluate(() => {
    window.__A11Y.seen = new Set(); window.scrollTo(0, 0);
    document.getElementById("__tabstart")?.remove();
    const m = document.createElement("span"); m.id = "__tabstart"; m.tabIndex = -1; m.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px;outline:none";
    document.body.prepend(m); m.focus();
  });
  let bodyHits = 0, backJumps = 0, prevTop = null, steps = 0, outside = 0, hasModal = false;
  for (; steps < TAB_CAP; steps++) {
    await P.keyboard.press("Tab");
    const d = await P.evaluate(() => window.__A11Y.focused());
    if (d.body) { if (++bodyHits > 1) break; continue; }
    const uid = d.id ?? `${d.key}@${Math.round(d.left)},${Math.round(d.top)}`;
    if (reached.has(uid)) break;
    reached.add(uid); seq.push(d);
    if (d.hasModal) { hasModal = true; if (!d.inModal) outside++; }
    if (!d.ringOn) ringBad.push(`${d.key} "${(d.name || "").slice(0, 24)}" outline [${d.outline}] shadow [${d.shadow}]`);
    else if (d.ringRatio !== null && d.ringRatio < 3) ringWeak.push(`${d.key} ring ${Math.round(d.ringRatio * 100) / 100}:1 (${d.outline})`);
    if (!d.fixed) { if (prevTop !== null && d.top < prevTop - 40) backJumps++; prevTop = d.top; }
  }
  const unreached = (await P.evaluate(() => window.__A11Y.unreached())).map((e) => `${e.key} "${(e.name || "").slice(0, 24)}"${e.tabindex < 0 ? " (tabindex=-1)" : ""}`);
  return { nameDefects, english, latin, contrastDefects, contrastUnknown: con.unknown, unreached, ringBad, ringWeak, backJumps, outside, hasModal, stops: seq.length, expected: exp.length, capped: steps >= TAB_CAP };
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const findings = new Map(); // page|view|kind|msg -> {where:Set}
const addFinding = (page, view, kind, msg, where) => {
  const k = `${page}|${view}|${kind}|${msg}`;
  const e = findings.get(k) || { page, view, kind, msg, where: new Set() };
  e.where.add(where); findings.set(k, e);
};
const failedViews = [];

// ---- positive controls (once, on the Dua page at 360 en) ----
if (!arg("page") || arg("page") === "dua") {
  const ctx = await newContext(browser, { banner: false, viewport: { width: 360, height: 740 }, extraSeedJs: SEED });
  const { page: P } = await openPage(ctx, "/app/dua-study.html");
  await P.waitForTimeout(800);
  await P.evaluate(INSTALL);
  const clean = await audit(P, { lang: "en" });
  await P.evaluate(INJECT);
  await P.waitForTimeout(100);
  const bad = await audit(P, { lang: "en" });
  check("positive control (a): an injected unnamed button is reported as having no name", bad.nameDefects.some((m) => m.includes("inj-unnamed")), JSON.stringify(bad.nameDefects.slice(0, 3)));
  check("positive control (b): an injected tabindex=-1 button is reported as unreachable by Tab", bad.unreached.some((m) => m.includes("inj-notab")), JSON.stringify(bad.unreached.slice(0, 3)));
  check("positive control (c): an injected grey-on-grey line is reported under 4.5:1", bad.contrastDefects.some((m) => m.includes("Injected grey")), JSON.stringify(bad.contrastDefects.slice(0, 3)));
  check("positive control: the same page WITHOUT the injection has none of the three", !clean.nameDefects.some((m) => m.includes("inj-")) && !clean.unreached.some((m) => m.includes("inj-")) && !clean.contrastDefects.some((m) => m.includes("Injected")));
  check("positive control (b): the Tab walk really moved (reached controls on the clean page)", clean.stops > 5 && clean.stops >= clean.expected - 3, `stops ${clean.stops} of ${clean.expected}`);
  if (!MUTATE) {
    const ring = await (async () => { await P.addStyleTag({ content: NORING_CSS }); return audit(P, { lang: "en" }); })();
    check("positive control (b): with the focus outline removed every reached control is reported ringless", ring.ringBad.length >= ring.stops - 1 && ring.stops > 5, `ringless ${ring.ringBad.length} of ${ring.stops}`);
    check("positive control (b): before removing it, the page's own rings were present", clean.ringBad.length < clean.stops, `ringless ${clean.ringBad.length} of ${clean.stops}`);
  }
  await ctx.close();
}

// ---- the sweep ----
for (const pg of PAGES) for (const [w, h] of WIDTHS) for (const lang of LANGS) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page: P, errors } = await openPage(ctx, pg.path);
  const fresh = async (url) => {
    await P.goto(new URL(pg.path + (url || ""), P.url()).href, { waitUntil: "networkidle" });
    await P.waitForTimeout(500);
    await P.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((e) => e.remove()));
  };
  const prep = async () => { await P.evaluate(INSTALL); if (MUTATE === "noring") await P.addStyleTag({ content: NORING_CSS }); };
  for (const v of pg.views.filter((x) => !VIEWSEL || VIEWSEL.includes(x.id))) {
    const tag = `${pg.id} / ${v.id} / ${w} / ${lang}`;
    try {
      await fresh(v.url);
      await Promise.race([v.go(P), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout driving the view")), 90000))]);
      await P.waitForTimeout(300);
      await prep();
    } catch (e) { failedViews.push(tag); check(`${tag}: the view opened (positive control)`, false, String(e.message).slice(0, 160)); continue; }
    const textLen = await P.evaluate(() => document.body.innerText.length);
    check(`${tag}: the view rendered text (positive control)`, textLen > 20, `innerText length ${textLen}`);
    const a = await audit(P, { lang });
    const where = `${w}${lang}`;
    check(`${tag}: (a) every visible control has a name`, a.nameDefects.length === 0, "\n      " + a.nameDefects.slice(0, 4).join("\n      "));
    if (lang === "bn") check(`${tag}: (a) no chrome name is English`, a.english.length === 0, "\n      " + a.english.slice(0, 4).join("\n      "));
    a.english.forEach((m) => addFinding(pg.id, v.id, "DEFECT bn-english-chrome", m, where));
    check(`${tag}: (b) Tab reaches every visible control`, a.unreached.length === 0, "\n      " + a.unreached.slice(0, 4).join("\n      "));
    check(`${tag}: (b) every focused control shows a ring`, a.ringBad.length === 0, "\n      " + a.ringBad.slice(0, 4).join("\n      "));
    check(`${tag}: (c) all text meets its ratio`, a.contrastDefects.length === 0, "\n      " + a.contrastDefects.slice(0, 4).join("\n      "));
    a.nameDefects.forEach((m) => addFinding(pg.id, v.id, "DEFECT names", m, where));
    a.unreached.forEach((m) => addFinding(pg.id, v.id, "DEFECT tab-unreachable", m, where));
    a.ringBad.forEach((m) => addFinding(pg.id, v.id, "DEFECT no-ring", m.replace(/ outline.*$/, ""), where));
    a.contrastDefects.forEach((m) => addFinding(pg.id, v.id, "DEFECT contrast", m, where));
    a.latin.forEach((m) => addFinding(pg.id, v.id, "bn-latin-name (triage)", m, where));
    a.ringWeak.forEach((m) => addFinding(pg.id, v.id, "MINOR weak-ring", m, where));
    if (a.backJumps) addFinding(pg.id, v.id, "MINOR tab-order", `${a.backJumps} backward visual jumps in the Tab order`, where);
    if (a.hasModal && a.outside) addFinding(pg.id, v.id, "MINOR modal-not-trapped", `Tab reaches ${a.outside} controls of the page BEHIND the aria-modal pop-up`, where);
    if (a.capped) addFinding(pg.id, v.id, "MINOR tab-walk-capped", `Tab walk hit the ${TAB_CAP}-stop cap`, where);
    a.contrastUnknown.forEach((u) => addFinding(pg.id, v.id, "INFO contrast-not-measurable", `${u.key} "${u.txt}": ${u.why}`, where));
    if (LIST) console.log(`  info  ${tag}: names ${a.nameDefects.length}, unreached ${a.unreached.length}/${a.expected}, ringless ${a.ringBad.length}/${a.stops}, contrast ${a.contrastDefects.length}, weak rings ${a.ringWeak.length}, back-jumps ${a.backJumps}`);
    if (SHOTS && ((pg.id === "hadith" && v.id === "topic" && w === 390 && lang === "bn") || (pg.id === "dua" && v.id === "check-panel" && w === 768 && lang === "en"))) {
      // leave a control focused: the next Tab stop after the surface opened
      await P.evaluate(() => { document.activeElement?.blur?.(); });
      const scope = pg.id === "dua" ? "[data-dua-check-panel] button, [data-dua-check-panel] input, [data-dua-check-panel] a" : "[data-hadith-pane] button, button";
      const target = P.locator(scope).first();
      if (await target.count()) await target.focus().catch(() => {});
      await P.keyboard.press("Tab");
      await P.screenshot({ path: `${OUT}/${pg.id}-${v.id}-${w}-${lang}.png`, fullPage: false });
      console.log(`  shot ${OUT}/${pg.id}-${v.id}-${w}-${lang}.png (focused: ${await P.evaluate(() => window.__A11Y.activeKey())})`);
    }
  }
  if (!NO_SURF) for (const s of pg.surfaces.filter((x) => !VIEWSEL || VIEWSEL.includes(x.id))) {
    const tag = `${pg.id} / surface ${s.id} / ${w} / ${lang}`;
    const where = `${w}${lang}`;
    try { await fresh(s.url); await Promise.race([s.setup(P), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout driving the surface")), 90000))]); await P.waitForTimeout(300); await prep(); }
    catch (e) { failedViews.push(tag); check(`${tag}: the opener appeared (positive control)`, false, String(e.message).slice(0, 160)); continue; }
    const isOpen = () => P.evaluate((q) => window.__A11Y.visible(q), s.surface);
    const op = P.locator(s.opener).first();
    if (!(await op.count())) { failedViews.push(tag); check(`${tag}: the opener exists (positive control)`, false, s.opener); continue; }
    await op.scrollIntoViewIfNeeded().catch(() => {});
    await P.evaluate((q) => document.querySelector(q)?.focus(), s.opener);
    const pre = await isOpen();
    check(`${tag}: the surface is closed before it is opened (positive control)`, !pre, "already open");
    await P.keyboard.press("Enter");
    await P.waitForTimeout(700);
    const openedEnter = await isOpen();
    check(`${tag}: Enter on the opener opens the surface`, openedEnter);
    if (!openedEnter) { addFinding(pg.id, s.id, "DEFECT surface-enter", "Enter on the opener does not open it", where); continue; }
    const heldFocus = await P.evaluate(() => window.__A11Y.activeKey());
    await P.keyboard.press("Escape");
    await P.waitForTimeout(700);
    const stillOpen = await isOpen();
    check(`${tag}: Escape closes the surface`, !stillOpen, `still open (focus on ${heldFocus})`);
    if (stillOpen) { addFinding(pg.id, s.id, "DEFECT escape-no-close", `Escape does not close it (focus was on ${heldFocus})`, where); continue; }
    const back = await P.evaluate((q) => window.__A11Y.activeIn(q), s.returnTo || s.opener);
    const now = await P.evaluate(() => window.__A11Y.activeKey());
    if (!back) addFinding(pg.id, s.id, "MINOR focus-not-returned", `after Escape focus is on ${now}, not the opener`, where);
    // Space
    if (s.reopen) await s.reopen(P);
    await P.evaluate((q) => document.querySelector(q)?.focus(), s.opener);
    await P.keyboard.press("Space");
    await P.waitForTimeout(700);
    const openedSpace = await isOpen();
    check(`${tag}: Space on the opener opens the surface`, openedSpace);
    if (!openedSpace) addFinding(pg.id, s.id, "DEFECT surface-space", "Space on the opener does not open it", where);
  }
  const pageErrors = errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
  check(`${pg.id} / ${w} / ${lang}: no page errors in the whole sweep`, pageErrors.length === 0, pageErrors.slice(0, 2).join(" | "));
  await ctx.close();
}

const tagOut = arg("page") || "all";
fs.writeFileSync(`${OUT}/findings-${tagOut}-${arg("width") || "all"}-${arg("lang") || "all"}.json`, JSON.stringify({ failedViews, findings: [...findings.values()].map((f) => ({ ...f, where: [...f.where] })) }, null, 1));
let n = 0;
const shown = new Map();
let triaged = 0;
console.log("\n=== numbered findings (page | view | kind | control and measurement | width+language) ===");
const order = (k) => (k.startsWith("DEFECT") ? 0 : k.startsWith("MINOR") ? 1 : k.startsWith("bn") ? 2 : 3);
for (const f of [...findings.values()].sort((a, b) => order(a.kind) - order(b.kind) || a.page.localeCompare(b.page) || a.view.localeCompare(b.view) || a.kind.localeCompare(b.kind))) {
  n++;
  if (!LIST && /^(bn-latin|INFO)/.test(f.kind)) { triaged++; continue; } // triage lists are in the findings json; --list prints them
  const gk = `${f.page}|${f.view}|${f.kind}`;
  shown.set(gk, (shown.get(gk) || 0) + 1);
  if (shown.get(gk) > (LIST ? 1e9 : 6)) { if (shown.get(gk) === 7) console.log(`  ... more ${f.kind} findings on ${f.page} / ${f.view} (all in the findings json; --list prints all)`); continue; }
  console.log(`  ${f.kind.startsWith("DEFECT") ? "DEFECT" : "INFO  "} #${n} ${f.page} | ${f.view} | ${f.kind} | ${f.msg.slice(0, 220)} | ${[...f.where].sort().join(",")}`);
}
console.log(`  (${triaged} bn-Latin-name / not-measurable triage entries not printed: they are in ${OUT}/findings-*.json, or run with --list)`);
check("every view and surface opened at every width and language (one that did not open measured nothing)", failedViews.length === 0, failedViews.slice(0, 6).join(", "));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
