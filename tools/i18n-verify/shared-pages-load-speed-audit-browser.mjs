// Audit part 91 (PCF MSA J29): loading speed and startup reads on the 23 shared pages.
//
// The brief's load-speed contract (CLAUDE.md, Architecture Part 8, invariant I9): before first paint, local cache only and no
// network wait; after first paint, at most 3 Firestore reads (userIndex, enrolments, bookmarks); records, curriculum and
// sessions never at startup. For each page this suite records, with the stub answering after 150 ms:
//   reads   every Firestore read before the page is idle (window.__fsLog), before or after first paint, classified
//           OK | PAGE'S OWN JOB | BREAKS CONTRACT
//   timing  first contentful paint and "ready" (the later of the last contentful-paint candidate and the end of the last
//           startup read), at 390x844 on a slowed phone line (1.6 Mbit/s down, 750 kbit/s up, 150 ms RTT, cache off)
//           and at 1440x900 unthrottled. Over 3 s FCP or 6 s ready is flagged (throttled run).
//   bytes   JS, CSS, JSON and font bytes finished before ready, and the 3 biggest files (served by serve.js; the Firebase
//           SDK is the stub here, so it is NOT counted)
//   block   a <script src> in <head> without type=module / defer / async, and any Firestore read or fetch/XHR that
//           FINISHED before first contentful paint (a network wait the paint could have been standing behind)
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/shared-pages-load-speed-audit-browser.mjs
//   --page=<file>   one page only      --list   print every read and the numbers   --verbose  print passes
//   --report=<path> write the per-page rows (JSON) to this path
//   --mutate=extra-read   index.html reads `records` at startup (reads must fail on index.html)
//   --mutate=slow         a 4 s blocking <script src> in every page's <head> (block and timing must fail)
import { chromium, newContext, BASE } from "./harness.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const ONLY = arg("page"), MUTATE = arg("mutate"), LIST = process.argv.includes("--list"), REPORT = arg("report");

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

const PROFILES = [
  { key: "phone", w: 390, h: 844, throttle: true },
  { key: "desktop", w: 1440, h: 900, throttle: false },
];
const FCP_MAX = 3000, READY_MAX = 6000;
const LATENCY = 150;

// ---- classification ----
// The three reads the contract allows after first paint.
const ALLOWED = new Set(["userIndex", "enrollments", "enrolments", "bookmarks"]);
// What every page's shell needs to know who is signed in and which tenant it is in (identity resolution), read by
// js/identity.js / tenant.js. They are not in the contract's list of three: reported OK(identity) so the contract's own
// list is not quietly widened, and counted in the report so the Architect can decide whether the list should be.
const IDENTITY = new Set(["tenantMemberUids", "tenants", "tenantPeople", "users", "modules", "subjects"]);
// Page -> collections that ARE that page's own job (the reader opened the page to see this data).
const OWN_JOB = {
  "classes.html": ["classes", "enrollments", "tenantPeople", "teacherStudentLinks", "ladders", "levels"],
  "course-offers.html": ["courseOffers", "enrollments", "tenantPeople", "classes"],
  "curriculum.html": ["curricula", "curriculum", "curriculumUnits", "curriculumPlan", "personLevels", "subjects", "grades", "resources", "classes", "ladders", "levels"],
  "backup.html": ["*"],
  "import-notes.html": ["notes", "noteFolders", "notePlacements", "noteSources", "noteLinks"],
  "monitor.html": ["records", "activity", "evidence", "tenantPeople", "subjects", "trackables", "enrollments"],
  "homework.html": ["homework", "assignments", "submissions", "teachingNotes", "courseOffers", "tenantPeople", "feedback", "classes"],
  "people.html": ["tenantPeople", "tenantInvites", "tenantMemberUids", "memberships"],
  "records.html": ["records", "activity","tenantPeople", "subjects", "trackables", "levels", "ladders", "domains"],
  "catalogue.html": ["subjects", "trackables", "approaches", "domains", "ladders", "levels", "modules", "subjectTemplates", "(batch"],
  "bookmarks.html": ["bookmarks", "bookmarkFolders"],
  "notes.html": ["notes", "noteFolders", "notePlacements", "noteSources", "noteLinks", "bookmarks"],
  "journey-map.html": ["notes", "noteFolders", "notePlacements", "noteSources", "noteLinks", "noteSections", "noteTags", "noteTagLinks"],
  "deen-study.html": ["topics", "records", "subjects", "trackables"],
  "arabic-study.html": ["topics", "records", "subjects", "trackables"],
  "admin-self-check.html": ["*"],
  "taglines.html": ["taglines"],
  "dawah.html": ["dawah", "dawahPages"],
  "onboarding.html": ["tenantPeople", "tenantInvites"],
  "accept-invite.html": ["inviteTokens", "tenantInvites", "tenantPeople"],
  "about.html": ["featureRegistry"],
  "hadith-collections.html": [],
  "index.html": [],
};
const classify = (rec, pagePath) => {
  const col = String(rec.col).startsWith("(") ? "(batch" : String(rec.col).split("/")[0], op = rec.kind;
  const writes = op === "setDoc" || op === "updateDoc" || op === "batchCommit" || op === "txCommit";
  if (ALLOWED.has(col)) return { verdict: "OK", why: "in the contract's three" };
  const own = OWN_JOB[pagePath.split("?")[0]] || [];
  if (own.includes("*") || own.includes(col)) return { verdict: "OWN JOB", why: `${pagePath.split("?")[0]} exists to show ${col}` };
  if (IDENTITY.has(col)) return { verdict: "OK", why: "identity/tenant resolution (not in the contract's three)" };
  if (writes) return { verdict: "BREAKS CONTRACT", why: `a ${op} at startup` };
  return { verdict: "BREAKS CONTRACT", why: `${col} is not userIndex/enrolments/bookmarks and not this page's job` };
};

// ---- helpers ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ext = (url) => (url.split("?")[0].match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || "";
const KIND = (type, mime, url) => {
  const e = ext(url);
  if (type === "Script" || e === "js" || e === "mjs") return "js";
  if (type === "Stylesheet" || e === "css") return "css";
  if (type === "Font" || /^(woff2?|ttf|otf)$/.test(e)) return "font";
  if (e === "json" || /json/.test(mime || "")) return "json";
  return null;
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const rows = [];

async function measure(name, path, prof) {
  const ctx = await newContext(browser, { banner: false, viewport: { width: prof.w, height: prof.h }, latencyMs: LATENCY, extraSeedJs: REAL_SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const pagePath = path.split("?")[0];
  if (MUTATE === "slow") {
    await ctx.route("**/__slow-block.js", async (r) => { await sleep(4000); r.fulfill({ status: 200, contentType: "text/javascript", body: "window.__slowBlock=1;" }); });
    await ctx.route(`${BASE}/app/${pagePath}*`, async (r) => {
      const resp = await r.fetch();
      const body = (await resp.text()).replace(/<head[^>]*>/i, (m) => m + '<script src="/__slow-block.js"></script>');
      r.fulfill({ response: resp, body });
    });
  }
  if (MUTATE === "extra-read" && (pagePath === "index.html" || ONLY === pagePath)) {
    await ctx.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const s = document.createElement("script"); s.type = "module";
        s.textContent = `import { db } from "/app/js/firebase-init.js";
          import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
          getDocs(collection(db, "records"));`;
        document.head.appendChild(s);
      });
    });
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (prof.throttle) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6e6 / 8), uploadThroughput: (750e3 / 8) });
  const reqs = new Map(), done = [];
  cdp.on("Network.requestWillBeSent", (e) => { reqs.set(e.requestId, { url: e.request.url, type: e.type, t: Date.now() }); });
  cdp.on("Network.responseReceived", (e) => { const r = reqs.get(e.requestId); if (r) { r.mime = e.response.mimeType; r.status = e.response.status; r.type = e.type || r.type; } });
  cdp.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) { r.size = e.encodedDataLength; r.tEnd = Date.now(); done.push(r); } });
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}/app/${path}${sep}${path.startsWith("hadith-collections") ? "back=1" : "navBack=1"}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(600);
  const data = await page.evaluate(() => {
    const paint = performance.getEntriesByType("paint").find((p) => p.name === "first-contentful-paint");
    const lcp = performance.getEntriesByType("largest-contentful-paint").slice(-1)[0];
    const head = [...document.head.querySelectorAll("script")].map((s) => ({ src: s.getAttribute("src"), type: s.type, defer: s.defer, async: s.async }));
    const sheets = [...document.head.querySelectorAll("link[rel=stylesheet]")].map((l) => l.getAttribute("href"));
    return {
      origin: performance.timeOrigin, fcp: paint ? paint.startTime : null, lcp: lcp ? lcp.startTime : null,
      log: (window.__fsLog || []).map((r) => ({ kind: r.kind, col: r.col, id: r.id, t0: r.t0, t1: r.t1 })),
      head, sheets,
    };
  });
  await ctx.close();
  const blocking = data.head.filter((s) => s.src && s.type !== "module" && !s.defer && !s.async).map((s) => s.src);
  const inline = data.head.filter((s) => !s.src && s.type !== "module").length;
  const reads = data.log.filter((r) => r.kind === "getDoc" || r.kind === "getDocs" || r.kind === "getCount" || r.kind === "txGet")
    .concat(data.log.filter((r) => !["getDoc", "getDocs", "getCount", "txGet"].includes(r.kind))); // writes are classified too
  const fcp = data.fcp, lastRead = Math.max(0, ...data.log.map((r) => r.t1 || 0));
  const ready = Math.max(data.lcp || 0, fcp || 0, lastRead);
  const readyWall = data.origin + ready;
  const files = done.filter((r) => !/gstatic\.com|jsdelivr/.test(r.url) && r.tEnd <= readyWall + 1).map((r) => ({ url: r.url.replace(BASE, ""), kind: KIND(r.type, r.mime, r.url), size: r.size || 0, type: r.type })).filter((f) => f.kind);
  const bytes = { js: 0, css: 0, json: 0, font: 0 };
  for (const f of files) bytes[f.kind] += f.size;
  const top3 = [...files].sort((a, b) => b.size - a.size).slice(0, 3).map((f) => `${f.url} ${(f.size / 1024).toFixed(0)}K`);
  const early = done.filter((r) => /^(Fetch|XHR)$/.test(r.type) && !/gstatic\.com|jsdelivr/.test(r.url) && fcp != null && r.tEnd - data.origin < fcp).map((r) => r.url.replace(BASE, ""));
  const classed = reads.map((r) => ({ ...r, ...classify(r, pagePath), phase: fcp != null && r.t0 < fcp ? "before paint" : "after paint" }));
  const waited = classed.filter((r) => fcp != null && r.t1 != null && r.t1 < fcp).map((r) => `${r.kind} ${r.col}`);
  return { name, path, prof: prof.key, fcp, ready, bytes, top3, blocking, inline, classed, early, waited, errors: errors.length };
}

for (const [name, path] of PAGES) {
  if (ONLY && !path.startsWith(ONLY)) continue;
  console.log(`\n== ${name} (${path}) ==`);
  for (const prof of PROFILES) {
    const m = await measure(name, path, prof);
    rows.push(m);
    const tag = `${name} / ${prof.key}`;
    const breaks = m.classed.filter((r) => r.verdict === "BREAKS CONTRACT");
    const afterPaint = m.classed.filter((r) => r.phase === "after paint" && r.verdict === "OK" && ALLOWED.has(r.col));
    if (LIST) {
      console.log(`   ${tag}: FCP ${m.fcp?.toFixed(0)}ms ready ${m.ready.toFixed(0)}ms  js ${(m.bytes.js / 1024).toFixed(0)}K css ${(m.bytes.css / 1024).toFixed(0)}K json ${(m.bytes.json / 1024).toFixed(0)}K font ${(m.bytes.font / 1024).toFixed(0)}K  top: ${m.top3.join(", ")}`);
      for (const r of m.classed) console.log(`      ${r.verdict.padEnd(15)} ${r.phase.padEnd(12)} ${r.kind} ${r.col}${r.id ? "/" + r.id : ""}  (${r.why})`);
      if (m.blocking.length) console.log(`      blocking head scripts: ${m.blocking.join(", ")}`);
      if (m.early.length) console.log(`      fetches finished before paint: ${m.early.join(", ")}`);
    }
    check(`${tag}: no read breaks the contract`, breaks.length === 0, breaks.map((r) => `${r.kind} ${r.col}: ${r.why}`).join("; "));
    check(`${tag}: no page error`, m.errors === 0, `${m.errors} page errors`);
    check(`${tag}: FCP was measured`, m.fcp != null);
    check(`${tag}: no blocking <script src> in <head>`, m.blocking.length === 0, m.blocking.join(", "));
    check(`${tag}: no Firestore read or fetch finished before first paint`, m.waited.length === 0 && m.early.length === 0, [...m.waited, ...m.early].join(", "));
    if (prof.throttle) {
      check(`${tag}: FCP <= ${FCP_MAX} ms`, m.fcp != null && m.fcp <= FCP_MAX, `${m.fcp?.toFixed(0)} ms`);
      check(`${tag}: ready <= ${READY_MAX} ms`, m.ready <= READY_MAX, `${m.ready.toFixed(0)} ms`);
    }
  }
}

if (REPORT) { mkdirSync(dirname(REPORT), { recursive: true }); writeFileSync(REPORT, JSON.stringify(rows, null, 1)); }
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
