// Audit part 138 (PCF MSA J29, issue #1345): dua-study.html (the Dua Lead's page, v12.126-v12.128) with the phone's text made LARGER.
// REPORT ONLY: no file under app/ changes. Copied in method from large-text-hadith-study-browser.mjs (part 136), itself copied from
// large-text-shared-pages-browser.mjs (part 131): MEASURE, REACH and INJECT below are the same functions (scripts, not modules, so copied).
// The root font-size is set with document.documentElement.style.fontSize to 150% / 200% and the page measured, per view, width and
// language, for   cut, overlap, offscreen, sideways, small, reach, fixedpx   (definitions: see the header of the shared-pages suite).
// VIEWS = the page as it opens; the Dua groups menu; Occasions with a part (numbered list); Hadith Books with a part; Dua of Prophets;
// the Rasulullah list page 2; an empty group (Sahaba); a Dua Card open (with ‹ › and ← Back); its card menu; each pop-up card (Meaning,
// Source, the whole narration, ✓ Check); a Hisn al-Muslim card and its "same dua in the Hadith books" tie opened; a Prophets' card;
// the 🖼 Poster; Copy / share.
// 100% findings of cut / overlap / offscreen / sideways are CHECKED (must be none, bar the NAMED findings printed as INFO);
// everything at 150% / 200% is INFO. Run from the repository root with node serve.js on 8080:
//   node tools/i18n-verify/large-text-dua-study-browser.mjs
//   --width=360  --lang=bn  --views=a,b   filters (run in parts)   --shots  save 200% screenshots to tools/i18n-verify/out/large-text-dua/
//   --no-reach  skip the reach pass   --list  print every finding   --names=short  keep the fixture's short names   --tag=x  name the rows file
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const LIST = process.argv.includes("--list"), SHOTS = process.argv.includes("--shots"), NO_REACH = process.argv.includes("--no-reach");
const OUT = "tools/i18n-verify/out/large-text-dua";
fs.mkdirSync(OUT, { recursive: true });

const ALL_WIDTHS = [[360, 740], [390, 844], [768, 1024], [1024, 768], [1440, 900]];
const WIDTHS = ALL_WIDTHS.filter(([w]) => !arg("width") || String(w) === arg("width"));
const LANGS = ["en", "bn"].filter((l) => !arg("lang") || l === arg("lang"));
const SIZES = [100, 150, 200];
const LONG_NAMES = arg("names") !== "short";
const info = (s) => console.log(s);
const KINDS = ["cut", "overlap", "offscreen", "sideways", "small", "fixedpx"];
const BUKHARI = "0256Bukhari.Sahih.JK000110-ara1";
const PAGE = "/app/dua-study.html";

// Real-length data: the part-126 seed's long Bangla / English names for the tenant and the people (the Tenant / Person pickers, the 👥 list).
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  DATA.ayahCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, collections: [] }];
  if (${process.argv.includes("--names=short")}) return;
  DATA.tenants[0].name = lang("Madrasatul Muslimeen (Owner, Prime)", "মাদরাসাতুল মুসলিমীন (মালিক, প্রাইম)");
  DATA.tenantPeople[0].name = lang("Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi", "মুহাম্মদ আব্দুল্লাহ আল-মামুন চৌধুরী");
  DATA.tenantPeople[1].name = lang("Maryam bint Abdullah Al-Hashimi", "মুহাম্মদ আব্দুল্লাহ আল-মামুন চৌধুরী");
  DATA.tenantPeople.push({ _id: "p3", tenantId: TENANT_ID, personId: "p3", name: lang("Fatima Zahra আব্দুর রহমান Al-Hashimi", "ফাতিমা জাহরা আব্দুর রহমান আল-হাশিমী"), managedByPersonId: "p1", isMinor: true, roles: ["student"] });
  DATA.ayahCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, collections: [] }];
})();`;

// ---- copied from large-text-shared-pages-browser.mjs (MEASURE, REACH, INJECT) ----
// Runs in the page. `baseline` is the list of font sizes (by element index) at 100%, or null on the first pass.
const MEASURE = ({ baseline, baselineRoot, minH }) => {
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
  const txt = (el) => (el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 40);
  const res = { cut: [], overlap: [], offscreen: [], sideways: [], small: [], fixedpx: [], fontSizes: [] };
  const all = [...document.body.querySelectorAll("*")].filter((el) => !/^(SCRIPT|STYLE|SVG|PATH|OPTION|TEMPLATE|NOSCRIPT)$/i.test(el.tagName) && vis(el));
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth) res.sideways.push({ key: "sideways|page", msg: `page scrolls sideways: scrollWidth ${doc.scrollWidth} > ${doc.clientWidth}` });

  // cut
  for (const el of all) {
    if (el.tagName === "SELECT") continue;
    const cs = getComputedStyle(el), w = el.clientWidth;
    if (w <= 0) continue;
    const ellipsis = cs.textOverflow === "ellipsis", clipping = cs.overflowX === "hidden" || cs.overflowX === "clip";
    if (!(ellipsis || clipping) || el.scrollWidth <= w + 1) continue;
    if (!txt(el)) continue;
    const full = (el.getAttribute("title") || el.closest("[title]")?.getAttribute("title") || "").replace(/\s+/g, " ").trim();
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (full && (full.includes(t.slice(0, 30)) || t.includes(full.slice(0, 30)))) continue;
    res.cut.push({ key: "cut|" + path(el), msg: `${path(el)} "${txt(el)}" needs ${el.scrollWidth}px, has ${w}px, no title` });
  }
  // a select whose chosen option is cut counts as cut too
  for (const el of all) {
    if (el.tagName !== "SELECT") continue;
    const cs = getComputedStyle(el), opt = el.options[el.selectedIndex];
    if (!opt) continue;
    const probe = document.createElement("span");
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing};padding:0;border:0;box-sizing:content-box`;
    probe.textContent = opt.textContent; document.body.appendChild(probe);
    const need = probe.getBoundingClientRect().width; probe.remove();
    const w = el.getBoundingClientRect().width;
    const inner = w - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth) - 20;
    if (w > 0 && need > inner + 1 && !(el.title && el.title.includes(opt.textContent.trim().slice(0, 20)))) res.cut.push({ key: "cut|" + path(el), msg: `select ${path(el)} chosen "${opt.textContent.trim().slice(0, 30)}" needs ${Math.round(need)}px, has ${Math.round(inner)}px` });
  }

  // offscreen: past the screen with no scrolling/clipping ancestor (a clipping ancestor with the control past its edge also hides it)
  const sel = "button, a[href], select, input:not([type=hidden]), textarea, [role=button], summary";
  const ctlAll = all.filter((e) => e.matches(sel));
  for (const el of ctlAll) {
    if (getComputedStyle(el).position === "fixed") continue;
    const r = el.getBoundingClientRect();
    let hidden = "", scroller = false;
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const ox = getComputedStyle(a).overflowX;
      if (ox === "auto" || ox === "scroll") { scroller = true; break; }
      if (ox === "hidden" || ox === "clip") { const ar = a.getBoundingClientRect(); if (ar.width > 0 && (r.right > ar.right + 1 || r.left < ar.left - 1)) hidden = `ends ${Math.round(r.right)} / starts ${Math.round(r.left)} outside clipping ${path(a)} (${Math.round(ar.left)}..${Math.round(ar.right)})`; scroller = true; break; }
    }
    if (!hidden && !scroller && (r.right > W + 1 || r.left < -1)) hidden = `spans ${Math.round(r.left)}..${Math.round(r.right)} on a ${W}px screen`;
    if (hidden && !res.sideways.length) res.offscreen.push({ key: "offscreen|" + path(el), msg: `${path(el)} "${txt(el)}" ${hidden}, page does not scroll sideways` });
    else if (hidden) res.offscreen.push({ key: "offscreen-reachable|" + path(el), msg: `(reachable only by sideways page scroll) ${path(el)} "${txt(el)}" ${hidden}` });
  }

  // small
  for (const el of ctlAll) {
    const cs = getComputedStyle(el);
    if (cs.display === "inline" || getComputedStyle(el).position === "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.height < minH && (txt(el) || el.tagName !== "A")) res.small.push({ key: "small|" + path(el), msg: `${path(el)} "${txt(el)}" is ${Math.round(r.height)}px tall` });
  }

  // overlap: any two non-nested, non-fixed controls whose boxes intersect
  // CHANGED from the source suite (as in part 136): (1) a control's box is cut to the boxes of the ancestors that clip it, so a row scrolled
  // out of its pane is not "overlapping" what lies under the pane; (2) a control inside a position:absolute pop-up (the groups pull-down, the
  // 👥 list) is skipped, because a pop-up covering the page is its design. The Dua pop-up cards (.dua-pop) are position:fixed, so they are
  // skipped by the fixed filter below as well; their controls are covered by the reach pass.
  const popup = (e) => { for (let a = e; a && a !== document.body; a = a.parentElement) if (getComputedStyle(a).position === "absolute" && a !== e) return true; return false; };
  const clipRect = (e) => {
    let r = e.getBoundingClientRect(), L = r.left, T = r.top, R = r.right, B = r.bottom;
    for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== "visible" || cs.overflowY !== "visible") { const q = a.getBoundingClientRect(); if (cs.overflowX !== "visible") { L = Math.max(L, q.left); R = Math.min(R, q.right); } if (cs.overflowY !== "visible") { T = Math.max(T, q.top); B = Math.min(B, q.bottom); } }
    }
    return { left: L, top: T, right: R, bottom: B };
  };
  // (3) CHANGED for this page: while a Dua pop-up card (a modal dialog, aria-modal) is open the page behind it is covered by design, so only the
  // pop-up's own controls are compared with each other.
  const modal = document.querySelector("[data-dua-pop]");
  const ctl = ctlAll.filter((e) => getComputedStyle(e).position !== "fixed" && !popup(e) && (!modal || modal.contains(e)));
  for (let i = 0; i < ctl.length; i++) for (let j = i + 1; j < ctl.length; j++) {
    const a = ctl[i], b = ctl[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ra = clipRect(a), rb = clipRect(b);
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 2 && oy > 2) res.overlap.push({ key: "overlap|" + path(a) + "|" + path(b), msg: `${path(a)} "${txt(a)}" overlaps ${path(b)} "${txt(b)}" by ${Math.round(ox)}x${Math.round(oy)}` });
  }

  // fixed px: elements with their own text node whose font-size is the same at this root size as at 100%
  const withText = all.filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  res.fontSizes = withText.map((el) => parseFloat(getComputedStyle(el).fontSize));
  if (baseline && baseline.length === res.fontSizes.length) {
    const rootNow = parseFloat(getComputedStyle(doc).fontSize), rootBase = baselineRoot;
    const want = rootNow / rootBase;
    let stuck = 0;
    const samples = [];
    withText.forEach((el, i) => {
      const was = baseline[i];
      if (res.fontSizes[i] < was * (1 + (want - 1) * 0.5)) { stuck++; if (samples.length < 4) samples.push(`${path(el)} "${txt(el)}" ${was}px -> ${res.fontSizes[i]}px`); }
    });
    if (stuck) res.fixedpx.push({ key: "fixedpx|total", msg: `${stuck} of ${withText.length} text elements did not grow (e.g. ${samples.join("; ")})`, stuck, total: withText.length });
  }
  res.textCount = withText.length;
  res.rootSize = parseFloat(getComputedStyle(doc).fontSize);
  return res;
};

// Reach pass: for every visible control, some scroll stop must have elementFromPoint return it.
const REACH = async () => {
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
  const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/)[0] : "")) + ` "${(el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 30)}"`;
  const pill = document.querySelector("[data-bm-back]");
  // When a pop-up card is open it covers the page: only its own controls are asked to be reachable (the page under it is not the view).
  const pop = document.querySelector("[data-dua-pop]");
  const controls = [...document.querySelectorAll("button, a[href], select, input:not([type=hidden]), textarea, [role=button], summary")].filter((el) => vis(el) && (pop ? pop.contains(el) : getComputedStyle(el).position !== "fixed"));
  const state = new Map(controls.map((el) => [el, false]));
  // Each control is brought into view the way Tab brings it (scrollIntoView, which scrolls every scrolling ancestor) at three block positions.
  for (const block of ["center", "start", "end"]) {
    for (const el of controls) {
      el.scrollIntoView({ block, inline: "nearest", behavior: "instant" });
      if (state.get(el)) continue;
      let r = el.getBoundingClientRect();
      if (r.left + r.width / 2 > innerWidth || r.left + r.width / 2 < 0) {
        for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
          const ox = getComputedStyle(a).overflowX;
          if ((ox === "auto" || ox === "scroll") && a.scrollWidth > a.clientWidth) { a.scrollLeft += r.left + r.width / 2 - innerWidth / 2; break; }
        }
        r = el.getBoundingClientRect();
      }
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;
      const hit = document.elementFromPoint(cx, cy);
      if (hit && (hit === el || el.contains(hit))) state.set(el, true);
    }
  }
  scrollTo(0, 0);
  return { pillShown: !!(pill && vis(pill)), n: controls.length, unreachable: [...state].filter(([, ok]) => !ok).map(([el]) => name(el)) };
};

// Positive controls: injected elements that are correct (defective) by construction, measured at 100%.
const INJECT = () => {
  const host = document.createElement("div");
  host.id = "__inject"; host.style.cssText = "position:relative;width:100%";
  const mk = (tag, text, css) => { const e = document.createElement(tag); e.textContent = text; e.style.cssText = css + (tag === "button" ? ";font-size:1rem" : ""); host.appendChild(e); return e; };
  // (this page's buttons keep the browser's 13.33px, so the injected buttons get rem text; the "fixed px" control is the <p>)
  mk("button", "Tafsir notes from Shaykh's Ramadan halaqah 2026 — Surah Al-Baqarah, far too long for this box", "display:block;width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap");
  const a = mk("button", "overlap A", "position:absolute;left:10px;top:60px;width:100px;height:44px");
  const b = mk("button", "overlap B", "position:absolute;left:50px;top:70px;width:100px;height:44px");
  mk("button", "tiny", "display:block;height:20px!important;min-height:0!important;margin-top:120px"); // the page's body.admin-touch gives every button min-height:40px
  mk("button", "far right", "position:absolute;left:" + (document.documentElement.clientWidth + 200) + "px;top:0;width:80px;height:44px");
  mk("p", "fixed px text", "font-size:13px;margin:0");
  mk("p", "rem text", "font-size:1rem;margin:0");
  void a; void b;
  document.body.appendChild(host);
  document.documentElement.style.overflowX = "hidden"; // so the far-right button is NOT reachable by a sideways page scroll
};
// ---- end of the copied functions ----

// ---- the views: each loads its own address on /app/dua-study.html (root text 100%) and drives it to the state to measure ----
// The page keeps where the reader is in its address (?g= group, part=, lp= list page, open= the Dua Card, tie= a Hisn dhikr's tied Dua).
const wait = (P, sel, ms = 25000) => P.waitForSelector(sel, { timeout: ms });
const listReady = (P) => wait(P, ".dua-row, [data-dua-empty], .dua-tile", 25000);
const cardReady = async (P) => { await wait(P, "[data-dua-open] .dua-card-menu, [data-dua-tie-open] .dua-card-menu", 30000); await P.waitForTimeout(600); };
const popOpen = (key) => async (P) => { await cardReady(P); await P.click(`[data-dua-menu="${key}"]`); await wait(P, `[data-dua-pop="${key}"]`, 15000); await P.waitForTimeout(500); };
const RASUL_CARD = "?g=rasul&open=1";
const VIEWS = [
  { id: "opens", label: "The page as it opens (the Rasulullah list, page 1)", url: "", go: listReady },
  { id: "groups-menu", label: "The Dua groups menu open", url: "", go: async (P) => { await listReady(P); await P.click('[data-dua-pd="groups"]'); await wait(P, ".dua-pull [data-dua-group]", 10000); } },
  { id: "occasions-parts", label: "Occasions with no part chosen (the part tiles)", url: "?g=occasions", go: listReady },
  { id: "occasions-part", label: "Occasions, a part chosen (the numbered list)", url: "?g=occasions&part=wake", go: listReady },
  { id: "parts-menu", label: "Occasions: the parts menu open", url: "?g=occasions&part=wake", go: async (P) => { await listReady(P); await P.click('[data-dua-pd="parts"]'); await wait(P, ".dua-pull [data-dua-part]", 10000); } },
  { id: "books-part", label: "Hadith Books, a part chosen", url: `?g=books&part=${BUKHARI}`, go: listReady },
  { id: "prophets", label: "Dua of Prophets (the list)", url: "?g=prophets", go: listReady },
  { id: "rasul-p2", label: "Rasulullah (SAW) list, page 2", url: "?g=rasul&lp=2", go: listReady },
  { id: "sahaba-empty", label: "An empty group (Sahaba)", url: "?g=sahaba", go: listReady },
  { id: "card", label: "A Dua Card open (Rasulullah list) with ‹ › and ← Back", url: RASUL_CARD, go: cardReady },
  { id: "card-menu", label: "The Dua Card's menu (scrolled into view)", url: RASUL_CARD, go: async (P) => { await cardReady(P); await P.evaluate(() => document.querySelector(".dua-card-menu")?.scrollIntoView({ block: "center" })); } },
  { id: "pop-meaning", label: "Pop-up card: Meaning", url: RASUL_CARD, go: popOpen("meaning") },
  { id: "pop-source", label: "Pop-up card: Source", url: RASUL_CARD, go: popOpen("source") },
  { id: "pop-narration", label: "Pop-up card: The whole narration", url: RASUL_CARD, go: async (P) => { await popOpen("narration")(P); await P.evaluate(() => { const d = document.querySelector("[data-dua-pop] details"); if (d) d.open = true; }); await P.waitForTimeout(300); } },
  { id: "pop-check", label: "Pop-up card: ✓ Check", url: RASUL_CARD, go: popOpen("check") },
  { id: "check-panel", label: "✓ Check opened (the panel under the card)", url: RASUL_CARD, go: async (P) => { await popOpen("check")(P); await P.click("[data-dua-pop] [data-dua-check-open]"); await wait(P, "[data-dua-check-panel]", 15000); await P.waitForTimeout(500); } },
  { id: "pop-poster", label: "The 🖼 Poster", url: RASUL_CARD, go: popOpen("poster") },
  { id: "pop-share", label: "Copy / share", url: RASUL_CARD, go: popOpen("share") },
  { id: "hisn-card", label: "A Hisn al-Muslim card", url: "?g=occasions&part=wake&open=1", go: async (P) => { await wait(P, "[data-dua-hisn]", 25000); await P.waitForTimeout(500); } },
  { id: "hisn-source", label: "A Hisn al-Muslim card: Source pop-up (holds the 'same dua in the Hadith books' tie)", url: "?g=occasions&part=wake&open=1", go: async (P) => { await wait(P, "[data-dua-hisn]", 25000); await P.click('[data-dua-menu="source"]'); await wait(P, '[data-dua-pop="source"]', 10000); await P.waitForTimeout(400); } },
  { id: "hisn-tie", label: "The Hisn dhikr's tied Dua card opened", url: "?g=occasions&part=wake&open=1&tie=1671", go: cardReady },
  { id: "prophet-card", label: "A Prophets' card", url: "?g=prophets&open=1", go: async (P) => { await wait(P, "[data-dua-quran]", 25000); await P.waitForTimeout(500); } },
];
const VIEWSEL = arg("views") ? arg("views").split(",") : null;
const VIEW_LIST = VIEWS.filter((v) => !VIEWSEL || VIEWSEL.includes(v.id));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const setRoot = (P, pct) => P.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; }, pct);
const rows = [], reachRows = [], findings = new Map(), failedViews = [];

// ---- positive controls at 100% / 150% (the measurement must be able to see each defect) ----
{
  const ctx = await newContext(browser, { banner: false, viewport: { width: 360, height: 740 }, extraSeedJs: SEED });
  const { page: P } = await openPage(ctx, PAGE);
  await P.waitForTimeout(800);
  const clean = await P.evaluate(MEASURE, { baseline: null, minH: 36 });
  await P.evaluate(INJECT);
  await P.waitForTimeout(100);
  const base = await P.evaluate(MEASURE, { baseline: null, minH: 36 });
  await setRoot(P, 150);
  await P.waitForTimeout(150);
  const big = await P.evaluate(MEASURE, { baseline: base.fontSizes, baselineRoot: base.rootSize, minH: 36 });
  check("positive control (100%): an injected over-long ellipsis button measures as CUT", base.cut.some((f) => f.msg.includes("Tafsir")), JSON.stringify(base.cut.slice(0, 3)));
  check("positive control (100%): two injected overlapping buttons measure as OVERLAP", base.overlap.some((f) => f.msg.includes("overlap A") && f.msg.includes("overlap B")), JSON.stringify(base.overlap.slice(0, 3)));
  check("positive control (100%): an injected 20px button measures as SMALL", base.small.some((f) => f.msg.includes("tiny")), JSON.stringify(base.small.slice(0, 3)));
  check("positive control (100%): an injected button past the right edge measures as OFFSCREEN", base.offscreen.some((f) => f.msg.includes("far right")), JSON.stringify(base.offscreen.slice(0, 3)));
  check("positive control (100%): the same page WITHOUT the injection has no injected finding", !clean.cut.some((f) => f.msg.includes("Tafsir")) && !clean.small.some((f) => f.msg.includes("tiny")) && !clean.offscreen.some((f) => f.msg.includes("far right")));
  check("positive control (150%): the root font-size really became 24px", big.rootSize === 24, `root ${big.rootSize}`);
  check("positive control (150%): an injected fixed-px text element is reported as NOT growing", big.fixedpx.length === 1 && /fixed px text/.test(big.fixedpx[0].msg), JSON.stringify(big.fixedpx));
  check("positive control (150%): an injected rem text element is NOT in the not-growing list", !big.fixedpx.some((f) => /rem text/.test(f.msg)), JSON.stringify(big.fixedpx));
  await ctx.close();
}

// ---- the sweep ----
for (const [w, h] of WIDTHS) for (const lang of LANGS) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page: P, errors } = await openPage(ctx, PAGE);
  for (const v of VIEW_LIST) {
    const tag = `${v.id} / ${w} / ${lang}`;
    try {
      await P.goto(new URL(PAGE + v.url, P.url()).href, { waitUntil: "networkidle" });
      await P.waitForTimeout(500);
      await P.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((e) => e.remove()));
      await Promise.race([v.go(P), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout driving the view")), 90000))]);
    } catch (e) { failedViews.push(tag); check(`${tag}: the view opened (positive control)`, false, String(e.message).slice(0, 160)); continue; }
    await P.waitForTimeout(300);
    const textLen = await P.evaluate(() => document.body.innerText.length);
    check(`${tag}: the view rendered text (positive control)`, textLen > 20, `innerText length ${textLen}`);
    let baseline = null, baselineRoot = 16;
    const bySize = {};
    for (const pct of SIZES) {
      await setRoot(P, pct);
      await P.waitForTimeout(250);
      const m = await P.evaluate(MEASURE, { baseline, baselineRoot, minH: 36 });
      // The Person and Tenant pickers by their own edge, any amount: the offscreen measure has a threshold, so a picker 3px past the
      // screen is not "offscreen" yet still makes the page scroll sideways (the old B1, fixed).
      const pickerPast = await P.evaluate(() => [...document.querySelectorAll("#personSelect, #tenantSelect")].some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > document.documentElement.clientWidth; }));
      if (pct === 100) { baseline = m.fontSizes; baselineRoot = m.rootSize; }
      check(`${tag} / ${pct}%: the Person and Tenant pickers stay inside the screen`, !pickerPast, "a picker runs past the right edge");
      bySize[pct] = m;
      if (SHOTS && pct === 200 && ((lang === "bn" && w === 360) || (lang === "en" && w === 768))) await P.screenshot({ path: `${OUT}/${v.id}-${w}-${lang}-200.png`, fullPage: !v.id.startsWith("pop-") });
      const counts = Object.fromEntries(KINDS.map((k) => [k, m[k].length]));
      rows.push({ view: v.id, w, lang, pct, counts });
      for (const k of KINDS) for (const f of m[k]) {
        const fk = `${v.id}|${pct}|${k}|${f.key}`;
        const e = findings.get(fk) || { view: v.id, pct, kind: k, key: f.key, msg: f.msg, where: new Set() };
        e.where.add(`${w}${lang}`);
        findings.set(fk, e);
      }
      if (LIST) console.log(`  info  ${tag} ${pct}%: ${KINDS.map((k) => k + " " + counts[k]).join(", ")}`);
      if (pct === 100) for (const k of ["cut", "overlap", "offscreen", "sideways"]) {
        // NAMED 100% FINDINGS. Each is a finding at ORDINARY text size, reported as INFO under its name in the report and handed to its
        // Lead; anything else at 100% still FAILS.
        //   (B1, the Person picker as wide as a ~40-character name, is FIXED: the pickers are capped at the screen and carry their full text
        //    as a title, as Hadith's are since v12.130. Its baseline is gone, so a recurrence fails.)
        //   B2  the 👥 "who is this for" button (.assign-trigger) carries the same long name and runs past a phone.
        //   Z   the fixed 🧰 Zab bar over a row at the foot of the screen at scroll 0: not a defect (v12.125, part 133: every page keeps room
        //       at its end for the bar, so any row can be scrolled clear of it); the same exclusion the other two suites make.
        const named = (f) => (LONG_NAMES && /button\.assign-trigger/.test(f.msg)) ? "B2"
          : (/#zabBar|#zabCorner/.test(f.msg) && k === "overlap") ? "Z"
          : null;
        const sidewaysBy = () => (LONG_NAMES && m.offscreen.some((o) => /button\.assign-trigger/.test(o.msg))) ? "B2"
          : null;
        // A page widened by B1 / B2 can open scrolled sideways, which puts the LEFT-hand controls at a negative x: the same finding, not a new one.
        const tagOf = (f) => (k === "sideways" ? sidewaysBy() : named(f) || (k === "offscreen" && / spans -\d/.test(f.msg) ? sidewaysBy() : null));
        const own = m[k].filter((f) => !tagOf(f));
        for (const f of m[k].filter((x) => tagOf(x))) info(`    INFO [${tag} 100% ${k} BASELINE ${tagOf(f)}] ${f.msg.slice(0, 200)}`);
        check(`${tag} / 100%: no ${k}`, own.length === 0, "\n      " + own.slice(0, 5).map((f) => f.msg).join("\n      "));
      }
    }
    if (!NO_REACH) for (const pct of [150, 200]) {
      await setRoot(P, pct);
      await P.waitForTimeout(250);
      const r = await P.evaluate(REACH);
      reachRows.push({ view: v.id, w, lang, pct, ...r });
      for (const u of r.unreachable) {
        const uk = u.replace(/ ".*$/, "");
        const fk = `${v.id}|${pct}|reach|${uk}`;
        const e = findings.get(fk) || { view: v.id, pct, kind: "reach", key: "reach|" + uk, msg: `control never reachable (scrolled into view, still covered): ${u}`, where: new Set() };
        e.where.add(`${w}${lang}`);
        findings.set(fk, e);
      }
    }
    await setRoot(P, 100);
  }
  const pageErrors = errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
  check(`${w} / ${lang}: no page errors in the whole sweep`, pageErrors.length === 0, pageErrors.slice(0, 2).join(" | "));
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rows${arg("tag") ? "-" + arg("tag") : ""}.json`, JSON.stringify({ rows, reachRows, failedViews, findings: [...findings.values()].map((f) => ({ ...f, where: [...f.where] })) }, null, 1));

// ---- the numbered INFO list: one entry per view / kind / element, at 150% and 200%, NEW (absent at 100% on the same element) ----
const at100 = new Set([...findings.values()].filter((f) => f.pct === 100).map((f) => `${f.view}|${f.kind}|${f.key}`));
const groups = new Map();
for (const f of findings.values()) {
  if (f.pct === 100 || f.kind === "fixedpx") continue;
  const gk = `${f.view}|${f.kind}|${f.key}`;
  const g = groups.get(gk) || { view: f.view, kind: f.kind, msg: f.msg, new: !at100.has(gk), sizes: new Set(), where: new Set() };
  g.sizes.add(f.pct); f.where.forEach((x) => g.where.add(x));
  groups.set(gk, g);
}
let n = 0;
console.log("\n=== INFO: numbered findings at 150% / 200% (view | kind | control and measurement | sizes | width+language) ===");
for (const g of [...groups.values()].sort((a, b) => a.view.localeCompare(b.view) || a.kind.localeCompare(b.kind))) {
  n++;
  console.log(`  INFO #${n} [${g.new ? "NEW" : "also at 100%"}] ${g.view} | ${g.kind} | ${g.msg.slice(0, 200)} | ${[...g.sizes].sort().join("/")}% | ${[...g.where].sort().join(",")}`);
}
console.log(`\nINFO: ${n} findings (cut/overlap/offscreen/sideways/small/reach) at 150%/200%; fixed-px totals per view:`);
for (const v of VIEW_LIST) console.log(`  ${v.id.padEnd(24)} ${[150, 200].map((s) => `${s}%: ` + rows.filter((r) => r.view === v.id && r.pct === s).reduce((a, r) => a + r.counts.fixedpx, 0) + " not-growing").join("  ")}`);
console.log("\n=== totals per view (summed over widths and languages): kind 100/150/200 ===");
for (const v of VIEW_LIST) console.log(`${v.id.padEnd(24)} ${KINDS.filter((k) => k !== "fixedpx").map((k) => k + " " + SIZES.map((s) => rows.filter((r) => r.view === v.id && r.pct === s).reduce((a, r) => a + r.counts[k], 0)).join("/")).join("  ")}`);
console.log(`\nINFO: reach pass: ${reachRows.filter((r) => r.unreachable.length).length} view/width/language/size combinations with a never-reachable control (of ${reachRows.length}).`);
check("every view opened at every width and language (a view that did not open measured nothing)", failedViews.length === 0, failedViews.slice(0, 6).join(", "));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
