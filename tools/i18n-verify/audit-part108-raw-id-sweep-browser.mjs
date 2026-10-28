// Audit part 108 (PCF MSA J29, I11): no raw id or computer word on any shared page in Bangla.
// For each of the 23 shared pages of shared-pages-failed-write-audit-browser.mjs (PAGES, same SEEDS), plus seerah.html when it
// exists, in Bangla at 390 and 1440, the check reads every VISIBLE text node and the aria-label / title / placeholder of visible
// controls, before and after opening the page's main surface (its first menu, details and list/card), and flags text that
// looks like a computer id:
//   snake_case word            deen_study, not_started
//   kebab-case id              syn-occ-1, topic-salah
//   a lone lowercase word equal to a module id or subject id (read from app/js/catalogue-data.js, not typed here)
//   an error code              permission-denied, unavailable, failed-precondition
// Ignored: <code>, <pre>, <script>, <style>, [data-i18n-skip], Arabic text, and names the harness fixtures give a person.
// Mutation: --mutate=rawid puts the raw-id fallback back in app/js/topic-study.js; deen-study.html (root subject absent) must fail.
// Positive control: about.html (a clean render) must come back clean.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part108-raw-id-sweep-browser.mjs [--page=a.html,b.html] [--mutate=rawid]
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
import { MODULE_TEMPLATES, SUBJECT_TEMPLATES } from "../../app/js/catalogue-data.js";

const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const ONLY = arg("page"), MUTATE = arg("mutate");
const IDS = [...new Set([...MODULE_TEMPLATES.map((m) => m.id), ...SUBJECT_TEMPLATES.map((s) => s.id)])].filter((i) => /^[a-z]+$/.test(i));
const ERROR_CODES = ["permission-denied", "unavailable", "failed-precondition", "unauthenticated", "not-found", "already-exists", "resource-exhausted", "deadline-exceeded", "invalid-argument", "cancelled", "aborted", "internal", "unknown"];

// ---- the pages and seeds, read from the failed-write audit rather than retyped ----
const src = fs.readFileSync("tools/i18n-verify/shared-pages-failed-write-audit-browser.mjs", "utf8");
const grab = (from, to) => { const i = src.indexOf(from), j = src.indexOf(to, i); if (i < 0 || j < 0) throw new Error("cannot read " + from); return src.slice(i, j); };
const prelude = grab("const PAGES = [", "const FLOW = arg(") // PAGES, REAL_SEED, notes/dawah seeds, SEEDS
  .replace(/^const /, "const ");
const { PAGES, REAL_SEED, SEEDS } = new Function(prelude + "\nreturn { PAGES, REAL_SEED, SEEDS };")();
const pages = PAGES.map(([name, path]) => [name, path]);
if (fs.existsSync("app/seerah.html")) pages.push(["Seerah", "seerah.html"]);

// deen-study.html also runs with its root subject absent: the case the part-106 fallback served
const NO_ROOT = `DATA.subjects = DATA.subjects.filter((s) => !(s.moduleIds || []).includes("deen") && s.subjectId !== "deen_study");`;

const TS = "app/js/topic-study.js";
const ORIG = fs.readFileSync(TS, "utf8");
if (MUTATE === "rawid") {
  const m = ORIG.replace("rootLabel = root ? langText(root.name, getAppLang(), idAsName) : idAsName;", "rootLabel = root ? langText(root.name, getAppLang(), moduleId) : moduleId;");
  if (m === ORIG) throw new Error("mutation did not apply");
  fs.writeFileSync(TS, m);
}

// ---- in the page: collect every visible text and attribute ----
const COLLECT = () => {
  const vis = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e.hidden || e.inert) return false;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
    }
    return true;
  };
  const skip = (el) => !!el.closest("code, pre, script, style, noscript, [data-i18n-skip], textarea, [contenteditable=true]");
  const desc = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "");
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const n = w.currentNode, p = n.parentElement, t = (n.nodeValue || "").replace(/\s+/g, " ").trim();
    if (!t || !p || skip(p) || !vis(p)) continue;
    out.push({ el: desc(p), text: t });
  }
  for (const el of document.querySelectorAll("[aria-label], [title], [placeholder]")) {
    if (skip(el) || !vis(el)) continue;
    for (const a of ["aria-label", "title", "placeholder"]) { const v = (el.getAttribute(a) || "").trim(); if (v) out.push({ el: desc(el) + "[" + a + "]", text: v }); }
  }
  return out;
};

const SNAKE = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/, KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/;
function judge(text) {
  if (/[؀-ۿݐ-ݿ]/.test(text)) return null; // Arabic text
  const whole = text.toLowerCase();
  if (IDS.includes(text) ) return "module/subject id";
  if (ERROR_CODES.includes(whole) && whole === text) return "error code";
  for (const raw of text.split(/\s+/)) {
    const tok = raw.replace(/^[("'\[]+|[)"'\].,:;!?]+$/g, "");
    if (SNAKE.test(tok)) return "snake_case: " + tok;
    if (KEBAB.test(tok) && (ERROR_CODES.includes(tok) || text === tok || /^(syn|synthetic)-/.test(tok) || /^topic-/.test(tok))) return "kebab id: " + tok;
    if (ERROR_CODES.includes(tok) && /-/.test(tok)) return "error code: " + tok;
  }
  return null;
}

const findings = []; // { page, w, text, el, why, stage }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const clean = new Map(); // page -> findings count (for the positive control)
try {
  for (const [name, path] of pages) {
    const file = path.split("?")[0];
    if (ONLY && !ONLY.split(",").some((p) => path.startsWith(p))) continue;
    const variants = [["default", ""]];
    if (file === "deen-study.html") variants.push(["no-root", NO_ROOT]);
    for (const [vname, vseed] of variants) for (const w of [390, 1440]) {
      const ctx = await newContext(browser, { appLang: "bn", accountLang: "bn", banner: false, viewport: { width: w, height: 900 }, extraSeedJs: REAL_SEED + (SEEDS[file] || "") + vseed });
      await ctx.route("**/archive.org/**", (r) => r.abort());
      const sep = path.includes("?") ? "&" : "?";
      let page;
      try { ({ page } = await openPage(ctx, "/app/" + path + sep + (path.startsWith("hadith-collections") ? "back=1" : "navBack=1"))); } catch (e) { console.log(`?? ${name} ${w}: ${String(e).slice(0, 80)}`); await ctx.close(); continue; }
      await page.waitForTimeout(1200);
      const seen = new Set(); let count = 0;
      const scan = async (stage) => {
        const items = await page.evaluate(COLLECT).catch(() => []);
        for (const it of items) {
          const why = judge(it.text);
          if (!why) continue;
          const k = it.el + "|" + it.text; if (seen.has(k)) continue; seen.add(k);
          count++; findings.push({ page: name + (vname === "default" ? "" : " (" + vname + ")"), w, text: it.text.slice(0, 80), el: it.el, why, stage });
        }
      };
      await scan("load");
      // the main surface: the first menu, the first folds, then the first list item / card
      for (const [stage, sel] of [["menu", ".nav-cat, [aria-expanded=false]"], ["details", "summary"], ["card", "main li button, main [role=button], main .card, #app li"]]) {
        await page.evaluate((s) => {
          const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && !e.disabled; };
          if (s === "summary") document.querySelectorAll("details").forEach((d) => (d.open = true));
          else [...document.querySelectorAll(s)].find(vis)?.click();
        }, sel).catch(() => {});
        await page.waitForTimeout(500);
        if (page.url().includes(path.split("?")[0]) || true) await scan(stage);
        const back = await page.evaluate((p) => location.pathname.endsWith(p), file).catch(() => false);
        if (!back) break; // pressing the first card left the page: the rest is another page's sweep
      }
      for (const f of findings.filter((x) => x.page === name + (vname === "default" ? "" : " (" + vname + ")") && x.w === w)) void f;
      clean.set(name + (vname === "default" ? "" : " (" + vname + ")") + " / " + w, count);
      console.log(`${count ? "FOUND" : "clean"}  ${name}${vname === "default" ? "" : " (" + vname + ")"} / bn / ${w}: ${count}`);
      await ctx.close();
    }
  }
} finally {
  if (MUTATE) fs.writeFileSync(TS, ORIG);
  await browser.close();
}

console.log("\nfindings:");
for (const f of findings) console.log(`  ${f.page} / ${f.w} / ${f.stage} / ${f.el}: "${f.text}"  — ${f.why}`);
if (!findings.length) console.log("  (none)");

let bad = findings.length;
if (!ONLY || ONLY.includes("about.html")) {
  const pcs = [...clean].filter(([k]) => k.startsWith("About /"));
  const ok = pcs.length === 2 && pcs.every(([, n]) => n === 0);
  console.log(`\nPOSITIVE CONTROL about.html (clean render): ${ok ? "clean -> OK" : "NOT clean or not run"}`);
  if (!ok) bad++;
}
if (MUTATE === "rawid") {
  const hit = findings.filter((f) => f.page.startsWith("Deen study")).length;
  console.log(`MUTATION rawid: ${hit} findings on deen-study.html -> ${hit ? "caught (the sweep CAN fail)" : "NOT caught"}`);
  process.exit(hit ? 1 : 2);
}
console.log(`\n==== Audit part 108 raw-id sweep: ${findings.length} findings on ${clean.size} page/width runs ====`);
process.exit(bad ? 1 : 0);
