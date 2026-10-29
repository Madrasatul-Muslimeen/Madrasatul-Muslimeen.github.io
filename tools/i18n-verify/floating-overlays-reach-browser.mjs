// Audit part 127 (PCF MSA J29, issue #1304): do the floating things (the ← ✕ way-back pill, the 🧰 toolbox button, the
// offline-save notice, the read-failure box) ever leave a control a finger CANNOT reach on a phone?
// Method: REACHABILITY, not position and size. Every visible interactive control is tested at the page's top, at each
// half-screen step and at the very bottom: some scroll position must have document.elementFromPoint(centre) return the
// control (or a descendant). No such position = UNREACHABLE. Also reported: covered at the bottom-most position only.
// Pages x widths x languages x (pill shown via ?navBack=1 / not shown). The shared pages are CHECKED; the frozen Quran
// Study landing (app/index.html) is MEASURED AND PRINTED only (it goes to the QR Lead, not fixed here).
// Positive control: a button the suite places, absolutely, at the very end of the document under the pill must be
// reported unreachable. End-of-flow probe: a button that is the last thing in <body> must be reachable (this is what the
// page's bottom clearance guarantees).
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/floating-overlays-reach-browser.mjs
//   --page=<file>  one page   --list  print every finding   --verbose  print passes
//   --mutate=no-page-end-clearance  removes the body's end clearance; the end-of-flow check must FAIL
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const ONLY = arg("page"), MUTATE = arg("mutate"), LIST = process.argv.includes("--list");

const PAGES = ["bookmarks.html", "records.html", "notes.html", "journey-map.html", "monitor.html", "people.html"];
const INFO_PAGES = ["index.html"]; // frozen Quran Study landing: printed, not checked
const WIDTHS = [[360, 740], [390, 844], [768, 1024]];
const LANGS = ["en", "bn"];

const MEASURE = async ({ probes, mutate }) => {
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
  const txt = (el) => (el.textContent || el.getAttribute("aria-label") || el.id || "").replace(/\s+/g, " ").trim().slice(0, 40);
  const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/)[0] : "")) + ` "${txt(el)}"`;
  const pill = document.querySelector("[data-bm-back]");
  const pillShown = !!(pill && vis(pill));

  if (mutate) {
    const s = document.createElement("style");
    s.textContent = "html,body{padding-bottom:0!important;margin-bottom:0!important}body>*:last-child{margin-bottom:0!important}";
    document.head.appendChild(s);
  }
  const sel = "button, a[href], select, input:not([type=hidden]), textarea, [role=button], summary";
  let endProbe = null, posProbe = null;
  if (probes) {
    const h = document.documentElement;
    endProbe = document.createElement("button");
    endProbe.id = "__endProbe"; endProbe.textContent = "end-of-flow probe"; endProbe.style.cssText = "display:block;height:44px;width:160px;margin:0;padding:0";
    document.body.appendChild(endProbe);
    if (pillShown) {
      posProbe = document.createElement("button");
      posProbe.id = "__posProbe"; posProbe.textContent = "under-pill probe";
      const pr = pill.getBoundingClientRect();
      posProbe.style.cssText = `position:absolute;z-index:0;width:${Math.max(20, pr.width - 8)}px;height:${Math.max(20, pr.height - 8)}px;left:${pr.left + 4}px;top:${Math.max(h.scrollHeight, document.body.scrollHeight) - pr.height + 4}px;padding:0`;
      document.body.appendChild(posProbe);
    }
  }
  const controls = [...document.querySelectorAll(sel)].filter((el) => vis(el) && getComputedStyle(el).position !== "fixed");
  const maxY = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const stops = [];
  for (let y = 0; y < maxY(); y += Math.max(100, Math.floor(innerHeight / 2))) stops.push(y);
  stops.push(maxY());
  const state = new Map(controls.map((el) => [el, { any: false, atBottom: false }]));
  for (const y of stops) {
    scrollTo(0, y);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const atBottom = Math.abs(scrollY - maxY()) < 2;
    for (const el of controls) {
      let r = el.getBoundingClientRect();
      // A control in a sideways-scrolling box (a wide table) is reached by scrolling THAT box: bring it into view first.
      if (r.left + r.width / 2 > innerWidth || r.left + r.width / 2 < 0) {
        for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
          const ox = getComputedStyle(a).overflowX;
          if ((ox === "auto" || ox === "scroll") && a.scrollWidth > a.clientWidth) { a.scrollLeft += r.left + r.width / 2 - innerWidth / 2; break; }
        }
        r = el.getBoundingClientRect();
      }
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) { continue; }
      const hit = document.elementFromPoint(cx, cy);
      const ok = !!hit && (hit === el || el.contains(hit));
      const s = state.get(el);
      if (ok) s.any = true;
      if (atBottom) s.atBottom = ok ? "ok" : "covered";
    }
  }
  const unreachable = [], coveredAtBottom = [];
  for (const [el, s] of state) {
    if (el === endProbe || el === posProbe) continue;
    if (!s.any) unreachable.push(name(el));
    else if (s.atBottom === "covered") coveredAtBottom.push(name(el));
  }
  scrollTo(0, 0);
  return {
    pillShown, n: controls.length, unreachable, coveredAtBottom,
    endProbe: endProbe ? state.get(endProbe).any : null,
    posProbe: posProbe ? state.get(posProbe).any : null,
  };
};

const browser = await chromium.launch();
const infoRows = [];
let maxControls = 0;
for (const lang of LANGS) {
  for (const [w, h] of WIDTHS) {
    const ctx = await newContext(browser, { appLang: lang, viewport: { width: w, height: h } });
    for (const pg of [...PAGES, ...INFO_PAGES]) {
      if (ONLY && ONLY !== pg) continue;
      const info = INFO_PAGES.includes(pg);
      for (const pill of [false, true]) {
        const { page } = await openPage(ctx, `./app/${pg}${pill ? "?navBack=1" : ""}`.replace("./app/", "/app/"));
        await page.waitForTimeout(600);
        const res = await page.evaluate(MEASURE, { probes: !info, mutate: !!MUTATE && !info });
        const tag = `${pg} ${w}px ${lang} ${pill ? "pill" : "no-pill"}`;
        maxControls = Math.max(maxControls, res.n);
        if (info) {
          if (res.unreachable.length || res.coveredAtBottom.length) infoRows.push({ tag, ...res });
        } else {
          check(`${tag}: controls were measured (positive: ${res.n} found)`, res.n > 0, "no controls found; probe is blind");
          if (pill) check(`${tag}: the way-back pill is showing`, res.pillShown, "navBack=1 mounted no visible pill");
          check(`${tag}: no unreachable control`, res.unreachable.length === 0, JSON.stringify(res.unreachable));
          check(`${tag}: nothing covered at the bottom`, res.coveredAtBottom.length === 0, JSON.stringify(res.coveredAtBottom));
          check(`${tag}: a button at the very end of the page can be reached`, res.endProbe === true, `endProbe=${res.endProbe}`);
          if (pill) check(`${tag}: POSITIVE CONTROL a button under the pill at the page end is reported unreachable`, res.posProbe === false, `posProbe=${res.posProbe}`);
          if (LIST && (res.unreachable.length || res.coveredAtBottom.length)) console.log(tag, JSON.stringify(res));
        }
        await page.close();
      }
    }
    await ctx.close();
  }
}
await browser.close();

if (infoRows.length || LIST) {
  console.log(`\nINFO (not counted): frozen Quran Study landing, ${infoRows.length} width/lang/pill combinations with a covered or unreachable control`);
  for (const r of infoRows) console.log(`  ${r.tag}: unreachable ${JSON.stringify(r.unreachable)} coveredAtBottom ${JSON.stringify(r.coveredAtBottom)}`);
}
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
