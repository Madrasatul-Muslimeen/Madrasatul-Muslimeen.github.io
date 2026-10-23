// Audit part 44 (PCF MSA J29): QuranRevival as a STUDENT uses it, signed in (a `student` role, not owner/prime) and signed out.
// Students test the app on QR only, so a fault here is student-blocking (PMS rule stu123). Runs against the built QR.
//   node tools/apps/qr-verify/student-browser.mjs     (serves itself on PORT, default 8107)
//   --only=<substring of an area name>   --lang=en|bn   --width=360|390|768|1280   --auth=student|out   --mutate=<name>
//   SHOTS=<dir> saves one screenshot per area/width/lang.  REPORT=1 prints every measurement without failing on it.
// Detectors (each has a positive control that injects an offender and must see it):
//   errors     page errors (the sandbox's TLS/archive.org/api.quran.com noise is filtered)
//   sideways   documentElement scrolls sideways
//   covered    the area's main controls are hit by something else at their centre (elementFromPoint)
//   small      a visible button/select/input in the area is under 40px tall (finger control)
//   english    a Bangla page shows a word of Latin letters (proper names allowed)
//   admin      a student sees an admin-only control (People, Catalogue, Taglines, management palettes; Backup is for everyone by design, nav.js)
// Fix mutations: each restores the old code of one fix and its check must FAIL (see MUTATIONS below).
import "./_root.mjs"; // runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import { spawn } from "node:child_process";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const MUTATE = arg("mutate") ?? null;
const ONLY = arg("only") ?? null, LANG = arg("lang") ?? null, WIDTH = arg("width") ?? null, AUTH = arg("auth") ?? null;
const REPORT = !!process.env.REPORT || process.argv.includes("--report");
const PORT = Number(process.env.PORT) || 8107;

/** name -> [file inside the built app, edit]. Filled in as fixes land. */
const MUTATIONS = {};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`Unknown mutation "${MUTATE}"`);

const { REPO } = await import("./_root.mjs");
const server = spawn(process.execPath, ["tools/apps/serve-app.mjs", process.cwd()], { cwd: REPO, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
process.env.QR_BASE = `http://localhost:${PORT}`;
const base = process.env.QR_BASE;
const { chromium, newContext } = await import("../../i18n-verify/harness.mjs");
const { stubFor } = await import("../../i18n-verify/firebase-stub.mjs");

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; failures.push(name); console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
/** Every wait names itself: a timeout fails THAT check, by name, and the run goes on. */
async function waitFor(label, fn, ms = 15000) {
  try { return await fn(ms); } catch (e) { check(`${label}: finished in time`, false, `timed out after ${ms}ms: ${String(e.message).split("\n")[0]}`); return null; }
}

const NOISE = /ERR_CERT_AUTHORITY_INVALID|archive\.org|api\.quran\.com|Failed to load resource|ERR_(NAME_NOT_RESOLVED|CONNECTION|INTERNET|TUNNEL)|net::ERR_FAILED/;
const STUDENT_SEED = `
DATA.tenantMemberUids[0].roles = ["student"];
DATA.tenantPeople[0].roles = ["student"];
`;

/** A context signed in as a student, or signed out (the stub's auth calls answer "nobody"). */
async function ctxFor(browser, { auth, lang, width, height, theme }) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height }, extraSeedJs: auth === "student" ? STUDENT_SEED : null });
  if (auth === "out") {
    const stub = stubFor({ banner: true, extraSeedJs: null })
      .replace("currentUser: { uid: UID, email: \"smahk9@gmail.com\", displayName: \"Owner\" }", "currentUser: null")
      .replace("setTimeout(() => cb({ uid: UID, email: \"smahk9@gmail.com\", displayName: \"Owner\" }), 0)", "setTimeout(() => cb(null), 0)");
    await ctx.route("https://www.gstatic.com/firebasejs/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: stub }));
  }
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("**/api.quran.com/**", (r) => r.abort());
  await ctx.addInitScript((t) => { try { localStorage.setItem("mm_card_look", t); } catch {} }, theme);
  if (MUTATE) {
    const [file, edit] = MUTATIONS[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, body: edit(await res.text()) }); });
  }
  return ctx;
}

// ---- detectors: pure functions run INSIDE the page, so a positive control can call the same code on an injected offender ----
const DETECTORS = `
window.__sd = {
  sideways: () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  visible: (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[hidden]") && !el.disabled && !(el.closest("details:not([open])") && !el.closest("summary")); },
  small: (root) => [...(root || document).querySelectorAll("button, select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), [role=button]")]
    .filter((el) => window.__sd.visible(el) && !el.closest("[data-sd-skip]") && el.getBoundingClientRect().height < 40)
    .map((el) => (el.id || el.className || el.tagName) + ":" + Math.round(el.getBoundingClientRect().height)),
  // a control scrolled out of a scroll box (or clipped by it) is not "covered": only judge ones whose centre is in every clipping ancestor
  clipped: (el, x, y) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(o.overflowY + o.overflowX)) { const r = p.getBoundingClientRect(); if (x < r.left || x > r.right || y < r.top || y > r.bottom) return true; } } return false; },
  covered: (root) => [...(root || document).querySelectorAll("button, a[href], select")]
    .filter((el) => window.__sd.visible(el) && !el.closest("[data-sd-skip]"))
    .filter((el) => { const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight || window.__sd.clipped(el, x, y)) return false; const hit = document.elementFromPoint(x, y); return hit && hit !== el && !el.contains(hit) && !hit.contains(el); })
    .map((el) => el.id || el.textContent.trim().slice(0, 20)),
  english: () => {
    const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      const p = n.parentElement; if (!p || /SCRIPT|STYLE|NOSCRIPT|OPTION/.test(p.tagName) || p.closest("[data-sd-skip], [data-i18n-skip], [lang=ar], [lang=en], .arabic, .ar, [dir=rtl]") || !window.__sd.visible(p)) continue;
      const t = n.textContent.trim(); if (!t) continue;
      // a run of 3+ lowercase Latin words with no Bangla in the node: English prose, not a proper name or a transliteration
      if (!/[\\u0980-\\u09FF]/.test(t) && /\\b[a-z]{3,}\\b(\\s+\\b[a-z]{2,}\\b){1,}/.test(t)) out.push(t.slice(0, 40));
    }
    return out;
  },
  admin: () => [...document.querySelectorAll("a[href], button, summary, [role=button]")]
    .filter((el) => window.__sd.visible(el) && !el.closest("[data-qr-hidden]"))
    .filter((el) => /people\\.html|catalogue\\.html|taglines/i.test(el.getAttribute("href") || "") || /^(People|Catalogue|Taglines)\\b/i.test(el.textContent.trim()) || /Manage (people|catalogue)|Edit taglines/i.test(el.textContent))
    .map((el) => el.textContent.trim().slice(0, 30)),
};`;

const AREAS = [
  { name: "front", path: "/", ready: "a" },
  { name: "quran-study", path: "/app/quranrevival.html", ready: "#readSurahSelect, #surahSelect" },
  { name: "asma", path: "/app/asma.html", ready: "body" },
  { name: "ldog", path: "/app/ldog-study.html", ready: "body" },
  { name: "journey-map", path: "/app/journey-map.html", ready: "body" },
];
const WIDTHS = [[360, 740], [390, 844], [768, 1024], [1280, 720]];
const LANGS = ["en", "bn"], AUTHS = ["student", "out"], THEMES = ["night", "light"];

const browser = await chromium.launch();
try {
  // Positive controls first: each detector must see an offender injected into a page, or its silence means nothing.
  {
    const ctx = await ctxFor(browser, { auth: "student", lang: "bn", width: 390, height: 844, theme: "night" });
    const page = await ctx.newPage();
    await page.goto(`${base}/app/ldog-study.html`, { waitUntil: "load" });
    await page.evaluate(DETECTORS);
    await page.waitForTimeout(500);
    const pc = await page.evaluate(() => {
      const d = document.createElement("div");
      d.innerHTML = '<button id="sdSmall" style="height:20px;position:fixed;left:5px;top:5px;z-index:1">x</button>'
        + '<button id="sdUnder" style="width:80px;height:50px;position:fixed;left:100px;top:100px;z-index:1">under</button><div style="position:fixed;left:90px;top:90px;width:120px;height:80px;z-index:9;background:red"></div>'
        + '<p id="sdEn">This sentence is plain English prose</p><a href="/app/people.html" style="position:fixed;left:5px;top:200px">People</a>'
        + '<div id="sdWide" style="position:absolute;left:0;top:0;width:' + (innerWidth + 300) + 'px;height:5px"></div>';
      document.body.append(d);
      return { small: window.__sd.small(d).length, covered: window.__sd.covered(d).length, english: window.__sd.english().length, admin: window.__sd.admin().length, sideways: window.__sd.sideways() };
    });
    check("POSITIVE CONTROL small: an injected 20px button is found", pc.small >= 1, JSON.stringify(pc));
    check("POSITIVE CONTROL covered: an injected button under an overlay is found", pc.covered >= 1, JSON.stringify(pc));
    check("POSITIVE CONTROL english: English prose on a Bangla page is found", pc.english >= 1, JSON.stringify(pc));
    check("POSITIVE CONTROL admin: an injected People link is found", pc.admin >= 1, JSON.stringify(pc));
    check("POSITIVE CONTROL sideways: an injected over-wide block is found", pc.sideways > 0, JSON.stringify(pc));
    const bad = new Promise((_, rej) => setTimeout(() => rej(new Error("boom")), 10));
    let threw = false; try { check("x", bad); } catch { threw = true; } bad.catch(() => {});
    check("POSITIVE CONTROL check(): a promise is refused", threw);
    await ctx.close();
    const errCtx = await ctxFor(browser, { auth: "student", lang: "en", width: 390, height: 844, theme: "night" });
    const ep = await errCtx.newPage(); const errs = [];
    ep.on("pageerror", (e) => errs.push(e.message));
    await ep.goto(`${base}/app/ldog-study.html`, { waitUntil: "load" });
    await ep.evaluate(() => setTimeout(() => { throw new Error("injected"); }, 0));
    await ep.waitForTimeout(300);
    check("POSITIVE CONTROL errors: an injected page error is seen", errs.some((m) => /injected/.test(m)));
    await errCtx.close();
  }

  for (const auth of AUTHS) for (const lang of LANGS) for (const [w, h] of WIDTHS) {
    if ((AUTH && AUTH !== auth) || (LANG && LANG !== lang) || (WIDTH && Number(WIDTH) !== w)) continue;
    const theme = (WIDTHS.findIndex((x) => x[0] === w) + LANGS.indexOf(lang)) % 2 ? "night" : "light"; // both looks get covered
    for (const area of AREAS) {
      if (ONLY && !area.name.includes(ONLY)) continue;
      const tag = `${area.name} ${auth} ${w}x${h} ${lang} ${theme}`;
      const ctx = await ctxFor(browser, { auth, lang, width: w, height: h, theme });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => { if (m.type() === "error" && !NOISE.test(m.text())) errors.push(`console: ${m.text()}`); });
      page.setDefaultTimeout(15000);
      await page.goto(`${base}${area.path}`, { waitUntil: "load" });
      const ok = await waitFor(`${tag}: page ready`, () => page.waitForSelector(area.ready, { state: "attached" }));
      if (ok) {
        await page.waitForTimeout(1500);
        await page.evaluate(DETECTORS);
        const m = await page.evaluate(() => ({ sideways: window.__sd.sideways(), small: window.__sd.small(), covered: window.__sd.covered(), english: window.__sd.english(), admin: window.__sd.admin() }));
        const rep = (k, v) => { if (REPORT && v.length) console.log(`  [${k}] ${tag}: ${v.slice(0, 8).join(" | ")}`); };
        check(`${tag}: no sideways scroll`, m.sideways <= 0, `${m.sideways}px`);
        check(`${tag}: nothing under another control`, m.covered.length === 0, m.covered.slice(0, 6).join(", "));
        check(`${tag}: finger controls at least 40px tall`, m.small.length === 0, m.small.slice(0, 8).join(", "));
        if (lang === "bn") check(`${tag}: no English prose on the Bangla page`, m.english.length === 0, m.english.slice(0, 6).join(" | "));
        if (auth === "student") check(`${tag}: a student sees no admin control`, m.admin.length === 0, m.admin.join(", "));
        rep("small", m.small); rep("english", m.english);
        if (process.env.SHOTS && (w === 390 || w === 1280)) await page.screenshot({ path: `${process.env.SHOTS}/${area.name}-${auth}-${w}-${lang}.png` });
      }
      check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 4).join(" | "));
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(`\n==== QR as a student${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
if (fail && REPORT) console.log(failures.slice(0, 80).join("\n"));
process.exit(fail && !REPORT ? 1 : 0);
