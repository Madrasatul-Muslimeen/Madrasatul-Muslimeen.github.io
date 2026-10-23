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
const MUTATIONS = {
  // Fix 1 (app/js/nav.js): a signed-out reader gets Language and Night/Light in Home after the page settles. Old code: nothing until sign-in.
  signedoutlang: ["app/js/nav.js", (t) => { const r = t.replace("setTimeout(offerSettingsWhileSignedOut, SIGNED_OUT_SETTINGS_MS)", "void 0"); if (r === t) throw new Error("mutation signedoutlang did not apply"); return r; }],
};
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
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight || window.__sd.clipped(el, x, y)) return false; const hit = document.elementFromPoint(x, y); if (!hit || hit === el || el.contains(hit) || hit.contains(el)) return false; for (let p = hit; p && p !== document.body; p = p.parentElement) if (/fixed|sticky/.test(getComputedStyle(p).position) && root === undefined) return false; return true; })
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

// Findings in QR-only files (app/quranrevival.html), which belong to the MSA-QR-LEAD: listed, not failed, and a
// listed id that STOPS occurring is itself reported (a fixed finding must leave this list).
const FOR_QR_LEAD = { "quran-study": ["wheelCtaBtn", "wheelListCollapseBtn"] };
const seenKnown = new Set();
const AREAS = [
  { name: "front", path: "/", ready: "a" },
  { name: "quran-study", path: "/app/quranrevival.html", ready: "#readSurahSelect, #surahSelect" },
  { name: "asma", path: "/app/asma.html", ready: "body" },
  { name: "ldog", path: "/app/ldog-study.html", ready: "body" },
  { name: "journey-map", path: "/app/journey-map.html", ready: "body" },
];
const WIDTHS = [[360, 740], [390, 844], [768, 1024], [1280, 720]];
const LANGS = ["en", "bn"], AUTHS = ["student", "out"], THEMES = ["night", "light"];


// ---- the student's flows on Quran Study: each does its main action and the RESULT is asserted ----
const settle = (page, ms = 500) => page.waitForTimeout(ms);
async function openRead(page) {
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await page.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await settle(page, 200); }
  await page.click("#tabReadBtn");
  await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 10000 });
  await settle(page, 400);
}
async function flows(auth, lang, [w, h]) {
  const tag = `flows ${auth} ${w}x${h} ${lang}`;
  const ctx = await ctxFor(browser, { auth, lang, width: w, height: h, theme: w === 390 ? "night" : "light" });
  await ctx.addInitScript("window.__stubApplyBatches = true;");
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !NOISE.test(m.text())) errors.push("console: " + m.text()); });
  page.setDefaultTimeout(12000);
  await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "load" });
  const writes = (k = 0) => page.evaluate((n) => (window.__stubWriteData || []).slice(n).map((x) => ({ col: x.col, id: x.id, data: x.data })), k);
  if (auth === "out") {
    await settle(page, 3500);
    await page.evaluate(DETECTORS);
    const o = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => window.__sd.visible(x) && /Google|গুগল/.test(x.textContent)); const r = b?.getBoundingClientRect(); return { text: document.body.innerText.slice(0, 200), btn: !!b, h: r ? Math.round(r.height) : 0, tabsHidden: document.getElementById("tabReadBtn").getBoundingClientRect().width === 0 }; });
    check(`${tag}: signed out, the page says so in words and offers Sign in with Google`, o.btn && /signed out|সাইন আউট|সাইন ইন/i.test(o.text), JSON.stringify(o));
    check(`${tag}: the sign-in button is a finger control (40px or more)`, o.h >= 40, JSON.stringify(o));
    const other0 = lang === "en" ? "bn" : "en";
    const hb0 = await page.evaluate(() => document.querySelector("details.nav-cat-home > summary")?.textContent ?? "");
    await page.evaluate(() => { document.querySelector("details.nav-cat-home").open = true; });
    const has = await page.waitForSelector("#navAppLangSelect", { state: "attached", timeout: 4000 }).then(() => true).catch(() => false);
    check(`${tag}: signed out, Home holds the Language box`, has);
    if (has) await Promise.all([page.waitForLoadState("load").catch(() => {}), page.selectOption("#navAppLangSelect", other0)]);
    await page.waitForFunction((b) => (document.querySelector("details.nav-cat-home > summary")?.textContent ?? b) !== b, hb0, { timeout: 15000 }).catch(() => {});
    const hb1 = await page.evaluate(() => document.querySelector("details.nav-cat-home > summary")?.textContent ?? "");
    check(`${tag}: Home -> Language works signed out too (${hb0.trim()} -> ${hb1.trim()})`, hb1 !== hb0);
    check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 4).join(" | "));
    await ctx.close();
    return;
  }
  const opened = await waitFor(`${tag}: the Read view opens`, () => openRead(page).then(() => true));
  check(`${tag}: the Read view opens and shows the āyah`, !!opened);
  if (!opened) { await ctx.close(); return; }
  // Choose a surah and an āyah: the page's own words change.
  const before = await page.evaluate(() => document.getElementById("ayahPanels").textContent.trim().slice(0, 60));
  await page.evaluate(() => { const s = document.getElementById("readSurahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await settle(page, 1200);
  const after = await page.evaluate(() => ({ t: document.getElementById("ayahPanels").textContent.trim().slice(0, 60), ref: document.getElementById("readRef")?.textContent.trim() }));
  check(`${tag}: choosing surah 2 changes what is read (${after.ref})`, after.t !== before);
  await page.evaluate(() => { const s = document.getElementById("readSurahSelect"); s.value = "1"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await settle(page, 1000);
  const vis = (sel) => page.evaluate((q) => { const e = document.querySelector(q); return !!e && e.getBoundingClientRect().width > 0; }, sel);
  check(`${tag}: the Take / Record / Status bar shows`, (await vis("#readBarTakeBtn")) && (await vis("#readBarRecordBtn")) && (await vis("#readBarStatusBtn")));
  // Know Your Status
  await page.click("#readBarStatusBtn"); await settle(page, 1200);
  const st = await page.evaluate(() => ({ open: !document.getElementById("myStatusMount").hidden, text: document.getElementById("myStatusBody").innerText.length, close: document.getElementById("myStatusCloseBtn").getBoundingClientRect().width > 0 }));
  check(`${tag}: Know Your Status opens with its Approaches and a ✕`, st.open && st.text > 60 && st.close, JSON.stringify(st));
  await page.click("#myStatusCloseBtn"); await settle(page, 400);
  check(`${tag}: ✕ takes the student back to the Read view`, await page.evaluate(() => document.getElementById("myStatusMount").hidden && !document.getElementById("readView").hidden));
  // Record Your Progress: the write is the student's own claim
  await page.click("#readBarRecordBtn"); await settle(page, 900);
  const picked = await waitFor(`${tag}: Record Your Progress card`, () => page.selectOption("#ayahSheetApproachSelect", "recite").then(() => true));
  if (picked) {
    await settle(page, 400);
    const n = (await writes()).length;
    await page.evaluate(() => document.querySelector('[data-ayah-sheet] [data-approach-stage-btn="practising"]').click());
    await settle(page, 1500);
    const w2 = await writes(n);
    const rec = w2.find((x) => x.col === "records" && Object.entries(x.data || {}).some(([k, v]) => /^entries\.ayah:1:\d+::recite$/.test(k) && v?.claimedStatus === "practising"));
    check(`${tag}: Practising is written as the student's own claim (records ${w2.map((x) => x.col).join(",")})`, !!rec, JSON.stringify(w2).slice(0, 400));
    check(`${tag}: the claim names the student as the one who made it`, !!rec && Object.values(rec.data).some((v) => v?.claimedByPersonId === "p1"), JSON.stringify(rec?.data ?? null).slice(0, 300));
    const pressed = await page.evaluate(() => document.querySelector('[data-ayah-sheet] [data-approach-stage-btn="practising"]')?.getAttribute("aria-pressed"));
    check(`${tag}: the card shows Practising as pressed after the write`, pressed === "true");
  }
  await page.evaluate(() => document.querySelectorAll("#ayahActionSheetOverlay.open [data-ayah-sheet-close]").forEach((b) => b.click())); await settle(page, 300);
  // Take an Approach: the wheel
  await page.click("#readBarTakeBtn"); await settle(page, 1200);
  const tk = await page.evaluate(() => ({ readHidden: document.getElementById("readView").hidden, segs: document.querySelectorAll("#wheelContainer .wheel-seg").length }));
  check(`${tag}: Take an Approach draws the Approach wheel`, tk.readHidden && tk.segs >= 3, JSON.stringify(tk));
  // Explore
  if (!(await vis("#tabExploreBtn"))) { await page.click("#tabStudyBtn").catch(() => {}); await settle(page, 200); }
  await page.click("#tabExploreBtn"); await settle(page, 1500);
  const ex = await page.evaluate(() => ({ panel: !document.getElementById("explorePanel")?.hidden, text: (document.getElementById("explorePanel")?.innerText || "").length }));
  check(`${tag}: Explore opens and shows its list`, ex.panel && ex.text > 40, JSON.stringify(ex));
  // Language: Home -> Language switches the page's words and back
  const other = lang === "en" ? "bn" : "en";
  const hb = await page.evaluate(() => document.querySelector("details.nav-cat-home > summary")?.textContent ?? "");
  await page.evaluate(() => { document.querySelector("details.nav-cat-home").open = true; });
  await Promise.all([page.waitForLoadState("load").catch(() => {}), page.selectOption("#navAppLangSelect", other)]);
  await page.waitForFunction((b) => (document.querySelector("details.nav-cat-home > summary")?.textContent ?? b) !== b, hb, { timeout: 15000 }).catch(() => {});
  const hb2 = await page.evaluate(() => document.querySelector("details.nav-cat-home > summary")?.textContent ?? "");
  check(`${tag}: Home -> Language to ${other} changes the page's words (${hb.trim()} -> ${hb2.trim()})`, hb2 !== hb);
  check(`${tag}: no page errors through the flows`, errors.length === 0, errors.slice(0, 4).join(" | "));
  await ctx.close();
}

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
        const known = FOR_QR_LEAD[area.name] || [];
        const kn = m.small.filter((x) => known.some((k) => x.startsWith(k + ":")));
        kn.forEach((x) => seenKnown.add(x.split(":")[0]));
        if (kn.length) console.log(`  KNOWN (for the QR Lead, app/quranrevival.html) ${tag}: ${kn.join(", ")}`);
        check(`${tag}: finger controls at least 40px tall`, m.small.length === kn.length, m.small.filter((x) => !kn.includes(x)).slice(0, 8).join(", "));
        if (lang === "bn") check(`${tag}: no English prose on the Bangla page`, m.english.length === 0, m.english.slice(0, 6).join(" | "));
        if (auth === "student") check(`${tag}: a student sees no admin control`, m.admin.length === 0, m.admin.join(", "));
        if (auth === "out" && area.name !== "front" && area.name !== "asma") {
          await page.waitForTimeout(2500);
          check(`${tag}: signed out, Home -> Settings holds the Language box (a student can read the sign-in words in Bangla)`, await page.evaluate(() => !!document.querySelector("#navHomeExtra #navAppLangSelect, #navHomeExtra select")));
        }
        rep("small", m.small); rep("english", m.english);
        if (process.env.SHOTS && (w === 390 || w === 1280)) await page.screenshot({ path: `${process.env.SHOTS}/${area.name}-${auth}-${w}-${lang}.png` });
      }
      check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 4).join(" | "));
      await ctx.close();
    }
  }
  for (const auth of AUTHS) for (const lang of LANGS) for (const vp of [[390, 844], [1280, 720]]) {
    if ((AUTH && AUTH !== auth) || (LANG && LANG !== lang) || (WIDTH && Number(WIDTH) !== vp[0]) || (ONLY && !"flows".includes(ONLY))) continue;
    try { await flows(auth, lang, vp); } catch (e) { check(`flows ${auth} ${vp[0]} ${lang}: stopped early`, false, String(e.message).split("\n")[0]); }
  }
  if (!ONLY && !WIDTH && !LANG && !AUTH) for (const id of FOR_QR_LEAD["quran-study"]) check(`the known QR Lead finding "${id}" still occurs (else remove it from FOR_QR_LEAD: it was fixed)`, seenKnown.has(id));
} finally {
  await browser.close();
  server.kill();
}
console.log(`\n==== QR as a student${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
if (fail && REPORT) console.log(failures.slice(0, 80).join("\n"));
process.exit(fail && !REPORT ? 1 : 0);
