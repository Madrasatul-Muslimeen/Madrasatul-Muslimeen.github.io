// Audit part 120 (PCF MSA J29): loading speed for a TEACHER with a real class.
//
// Part 119 measured a heavy family account. This suite seeds the signed-in owner/teacher p1 with
//   40 students (real-length names, every third one Bangla), 3 classes and 2 course offers with the students enrolled,
//   a student membership per person, teacher-student links, a year of study per student: records in 30 surah chunks plus
//   2 subject chunks (about 10 entries each), 52 weekly Activity documents, and 60 homework items assigned to the class
//   with a submission per student (2,400 submissions)
// and opens monitor.html, records.html, people.html, homework.html and classes.html at 390x844 on the slowed phone line of
// part 91 and at 1440x900 unthrottled, in English and in Bangla (stub latency 150 ms). Per page it records FCP, ready (the
// later of the last Firestore read and FCP), Firestore reads and documents read (window.__fsLog), main-thread long tasks over
// 50 ms, and scroll-to-frame time over 20 steps. It also times the page's main action (Monitor: switch student, then step
// a week; Records: choose a student) and checks the load-speed contract: Records reads one chunk document, never all of a
// person's records; Activity is one document per (person, week), never a year; no read returns more than 100 documents.
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/heavy-teacher-speed-browser.mjs
//   --page=<file>   one page only     --lang=en|bn   one language     --profile=phone|desktop
//   --report=<path> write the rows (JSON)    --verbose    --mutate=<name> bring a removed slow path back (must FAIL)
import { chromium, newContext, BASE } from "./harness.mjs";
import { writeFileSync, mkdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { createServer } from "node:http";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const ONLY = arg("page"), ONLY_LANG = arg("lang"), ONLY_PROFILE = arg("profile"), REPORT = arg("report"), MUTATE = arg("mutate");
const LATENCY = 150;
const FCP_MAX = 3000, READY_MAX = 6000, LONG_TASK_MAX = 200, SCROLL_MAX = 100, ACTION_MAX = 6000, ACTION_LONG_MAX = 50;
const READ_DOC_CAP = 100;

const PAGES = [["Monitor", "monitor.html"], ["Records", "records.html"], ["People", "people.html"], ["Homework", "homework.html"], ["Classes", "classes.html"]];
const PROFILES = [
  { key: "phone", w: 390, h: 844, throttle: true },
  { key: "desktop", w: 1440, h: 900, throttle: false },
];
const LANGS = ["en", "bn"];

// ---- the seed (runs inside the stub, where DATA, TENANT_ID, THIS_WEEK and lang() are in scope) ----
const SEED = `
(function () {
  var TID = "t1", N = 40;
  var seedN = 11; function rnd() { seedN = (seedN * 1103515245 + 12345) & 0x7fffffff; return seedN / 0x7fffffff; }
  var EN = ["Abdurrahman ibn Muhammad al-Qurashi", "Fatima bint Abdullah al-Hashimiyya", "Muhammad Yusuf Chowdhury", "Aisha Siddiqua Rahman", "Ibrahim Khalilullah Ahmed", "Maryam Jannatul Ferdous", "Zakariya Hasan Mahmud", "Khadija Tahira Begum"];
  var BN = ["আব্দুর রহমান ইবনে মুহাম্মদ", "ফাতিমা বিনতে আব্দুল্লাহ", "মুহাম্মদ ইউসুফ চৌধুরী", "আয়েশা সিদ্দিকা রহমান", "ইব্রাহিম খলিলুল্লাহ আহমেদ"];
  var people = [DATA.tenantPeople[0]], members = [], links = [];
  var ids = [];
  for (var i = 0; i < N; i++) {
    var pid = "s" + (i + 1); ids.push(pid);
    var nm = (i % 3 === 2) ? BN[i % BN.length] : EN[i % EN.length] + " " + (i + 1);
    people.push({ _id: pid, tenantId: TID, personId: pid, name: (i % 3 === 2) ? lang(EN[i % EN.length], nm) : lang(nm, BN[i % BN.length]), roles: ["student"], status: "active", managedByPersonId: null, isMinor: true, birthYear: 2008 + (i % 10) });
    members.push({ _id: TID + "__" + pid + "__student", tenantId: TID, personId: pid, role: "student", status: "active" });
    links.push({ _id: TID + "__p1__" + pid, tenantId: TID, teacherPersonId: "p1", studentPersonId: pid, status: "active" });
  }
  DATA.tenantPeople = people; DATA.memberships = (DATA.memberships || []).concat(members); DATA.teacherStudentLinks = links;

  // classes, offers and enrolments
  var classes = [], offers = [], enrol = [];
  var cnames = ["Morning Hifz Class – Juz Amma and revision", "Afternoon Tajweed and Recitation (Level 2)", "Weekend Arabic Language Foundations"];
  for (var c = 0; c < 3; c++) classes.push({ _id: TID + "__c" + (c + 1), tenantId: TID, name: lang(cnames[c], "ক্লাস " + (c + 1)), gloss: lang("Group " + (c + 1)), subjectIds: ["quran"], levelId: null, status: "active" });
  DATA.classes = classes;
  offers.push({ _id: TID + "__o1", tenantId: TID, name: lang("Evening Quran"), moduleIds: [], subjectIds: ["quran"], status: "active", routine: { daysOfWeek: [0, 2, 4], startDate: "2026-08-01", endDate: null, notes: null } });
  offers.push({ _id: TID + "__o2", tenantId: TID, name: lang("Ramadan Intensive Course"), moduleIds: [], subjectIds: ["quran"], status: "active", routine: { daysOfWeek: [1, 3], startDate: "2026-08-01", endDate: null, notes: null } });
  DATA.courseOffers = offers;
  for (var e = 0; e < N; e++) {
    var ctx = [["class", "c" + (1 + (e % 3))], ["courseOffer", "o" + (1 + (e % 2))]];
    for (var k = 0; k < ctx.length; k++) enrol.push({ _id: TID + "__" + ctx[k][1] + "__" + ids[e], tenantId: TID, contextType: ctx[k][0], contextId: ctx[k][1], personId: ids[e], roleInClass: "student", subjectIds: [], status: "active" });
  }
  enrol.push({ _id: TID + "__c1__p1", tenantId: TID, contextType: "class", contextId: "c1", personId: "p1", roleInClass: "teacher", subjectIds: [], status: "active" });
  DATA.enrollments = enrol;

  // a year of study: records in 30 surah chunks + 2 subject chunks per student; 52 weekly activity documents per student
  var recs = [], acts = [], STAT = ["learning", "practising", "achieved", "mastered"], APP = ["memorise", "recite", "tajweed", "listen", "read_daily", "translate", "tafsir", "word_by_word", "reflect", "act"];
  for (var s = 0; s < N; s++) {
    var P = ids[s];
    for (var sur = 1; sur <= 30; sur++) {
      var ent = {};
      for (var a = 0; a < 10; a++) { var ay = 1 + (a % 7), tr = APP[a]; ent["ayah:" + sur + ":" + ay + "::" + tr] = { unitType: "ayah", subjectId: "quran", trackableId: tr, claimedStatus: STAT[Math.floor(rnd() * 4)], claimedByPersonId: P, confirmedStatus: null, confirmState: a % 3 ? "pending" : "confirmed", domainIds: [], notes: "" }; }
      recs.push({ _id: TID + "__" + P + "__surah_" + sur, tenantId: TID, personId: P, chunkKey: "surah_" + sur, entries: ent });
    }
    var ent2 = {};
    for (var q = 0; q < 12; q++) ent2["topic:t" + q + "::reflect"] = { unitType: "topic", subjectId: "deen_ethics", trackableId: "reflect", claimedStatus: "practising", claimedByPersonId: P, confirmedStatus: null, confirmState: "pending", domainIds: [], notes: "" };
    recs.push({ _id: TID + "__" + P + "__subject_deen_ethics", tenantId: TID, personId: P, chunkKey: "subject_deen_ethics", entries: ent2 });
    for (var w = 0; w < 52; w++) {
      var d = new Date(THIS_WEEK + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 7 * w);
      var wk = d.toISOString().slice(0, 10), en = [];
      for (var x = 0; x < 6; x++) { var dd = new Date(d); dd.setUTCDate(dd.getUTCDate() + (x % 7)); en.push({ date: dd.toISOString().slice(0, 10), subjectId: x % 3 ? "quran" : "deen_ethics", unitKey: x % 3 ? "ayah:" + (1 + (x + w) % 30) + ":" + (1 + x) : "topic:t42", unitType: x % 3 ? "ayah" : "topic", trackableId: APP[(x + w) % 10], action: x % 2 ? "claimed" : "practised" }); }
      acts.push({ _id: TID + "__" + P + "__" + wk, tenantId: TID, personId: P, weekKey: wk, entries: en });
    }
  }
  DATA.records = DATA.records.concat(recs); DATA.activity = DATA.activity.concat(acts);

  // 60 homework items for the class, a submission per student
  var asg = [], subs = [];
  for (var h = 0; h < 60; h++) {
    var aid = "hw" + h, due = new Date(Date.parse("2026-09-01T00:00:00Z") + h * 86400000 * 4).toISOString().slice(0, 10);
    asg.push({ _id: TID + "__" + aid, tenantId: TID, createdByPersonId: "p1", assignedToPersonIds: ids.slice(), extraReadersPersonIds: ["p1"], contextId: "c" + (1 + (h % 3)), moduleId: null, subjectId: "quran", unitKeys: [], dueDate: due,
      instructions: lang("Memorise and revise Surah " + (1 + h % 30) + " with tajweed; bring your questions to class (homework " + (h + 1) + ")", "সূরা " + (1 + h % 30) + " মুখস্থ করুন"), maxScore: 10, status: "active" });
    for (var m = 0; m < N; m++) subs.push({ _id: TID + "__" + aid + "__" + ids[m], tenantId: TID, assignmentId: TID + "__" + aid, personId: ids[m], status: (m + h) % 4 ? "not_submitted" : "submitted", submittedAt: null, submittedNote: null, score: null, maxScoreAtMark: null, comment: null, markedByPersonId: null, markedAt: null });
  }
  DATA.assignments = DATA.assignments.concat(asg); DATA.submissions = DATA.submissions.concat(subs);
})();
`;

// Mutations are filled in as slow paths are fixed (see the report). Each one is a text replacement the suite's own gzip
// server applies to one served file, bringing the old slow path back.
const MUTATIONS = {
  // monitor.html reads every records chunk of the selected student on load and on every change of student.
  "eager-quran-breakdown": { file: "monitor.html", from: "const QURAN_ON_TAP = true;", to: "const QURAN_ON_TAP = false;" },
  // monitor.html builds every raw report row in one task again.
  "one-shot-raw-rows": { file: "monitor.html", from: "const RAW_ROWS_FIRST = 100, RAW_ROWS_SLICE = 100;", to: "const RAW_ROWS_FIRST = 100000, RAW_ROWS_SLICE = 100;" },
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`unknown --mutate=${MUTATE}`);
const MUT = MUTATE ? MUTATIONS[MUTATE] : null;

// Pages sends text files gzip-compressed and serve.js does not, so (as parts 94 and 119 did) the app's files are fetched
// through this suite's own gzip server; the browser still sees the page's own URL.
const ROOT = resolve("."), TEXT = new Set(["html", "js", "mjs", "css", "json", "svg", "txt", "xml"]);
const MIME = { html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8", json: "application/json; charset=utf-8", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", webp: "image/webp", woff2: "font/woff2", ico: "image/x-icon" };
const extOf = (u) => (u.split("?")[0].match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || "";
let gzipPort = 0;
const gzipServer = createServer((req, res) => {
  const u = new URL(req.url, "http://x"), e = extOf(u.pathname);
  const file = join(ROOT, decodeURIComponent(u.pathname));
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end("not found"); }
  let body = readFileSync(file);
  if (MUT && u.pathname === `/app/${MUT.file}`) {
    const text = body.toString();
    if (!text.includes(MUT.from)) { res.writeHead(500); return res.end(`mutation text not found in ${MUT.file}`); }
    body = Buffer.from(text.split(MUT.from).join(MUT.to));
  }
  const headers = { "content-type": MIME[e] || "application/octet-stream", "cache-control": "no-store", "access-control-allow-origin": "*" };
  if (TEXT.has(e)) { headers["content-encoding"] = "gzip"; body = gzipSync(body); }
  res.writeHead(200, headers); res.end(body);
});
await new Promise((ok) => gzipServer.listen(0, "127.0.0.1", () => { gzipPort = gzipServer.address().port; ok(); }));
async function routeGzip(ctx) {
  await ctx.route(`${BASE}/app/**`, (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.endsWith("/js/firebase-init.js")) return route.fallback();
    return route.continue({ url: `http://127.0.0.1:${gzipPort}${u.pathname}${u.search}` });
  });
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const rows = [];

const LONGTASK_INIT = () => {
  window.__long = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push({ s: e.startTime, d: e.duration }); }).observe({ type: "longtask", buffered: true }); } catch {}
};

const READ_KINDS = ["getDoc", "getDocs", "getCount", "txGet"];
function summarise(log) {
  const reads = log.filter((r) => READ_KINDS.includes(r.kind));
  const byCol = {};
  for (const r of reads) { const c = String(r.col); byCol[c] = byCol[c] || { reads: 0, docs: 0, maxDocs: 0 }; byCol[c].reads++; byCol[c].docs += r.docs; byCol[c].maxDocs = Math.max(byCol[c].maxDocs, r.docs); }
  return { reads: reads.length, docs: reads.reduce((a, r) => a + r.docs, 0), byCol };
}

// The page's main action: runs `fn` in the page, then waits until every Firestore read it started has answered and the
// page has painted two quiet frames; returns the elapsed ms, the reads it caused and the longest long task during it.
async function timeAction(page, fn) {
  return page.evaluate(async (src) => {
    const f = new Function("return (" + src + ")")();
    const before = window.__fsLog.length, lt0 = (window.__long || []).length;
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const t0 = performance.now();
    f();
    await frame();
    for (let i = 0; i < 400; i++) {
      const open = window.__fsLog.slice(before).some((r) => r.t1 == null);
      if (!open) { await frame(); if (!window.__fsLog.slice(before).some((r) => r.t1 == null)) break; }
      await new Promise((r) => setTimeout(r, 25));
    }
    const elapsed = performance.now() - t0;
    const log = window.__fsLog.slice(before).map((r) => ({ kind: r.kind, col: r.col, id: r.id, docs: r.docs ?? 0 }));
    const long = (window.__long || []).slice(lt0).map((t) => t.d);
    return { elapsed, log, maxLong: Math.max(0, ...long) };
  }, fn.toString());
}

const ACTIONS = {
  "monitor.html": [
    ["switch student", () => { const s = document.getElementById("personSelect"); s.value = s.options[Math.min(5, s.options.length - 1)].value; s.dispatchEvent(new Event("change", { bubbles: true })); }],
    ["step a week back", () => document.getElementById("weekPrevBtn").click()],
    ["whole roster, one week", () => { const c = document.getElementById("wholeRoster"); c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); }],
    ["whole roster, one month", () => document.getElementById("monthTabBtn").click()],
  ],
  "records.html": [
    ["choose a student", () => { const s = document.getElementById("personSelect"); s.value = s.options[Math.min(5, s.options.length - 1)].value; s.dispatchEvent(new Event("change", { bubbles: true })); }],
  ],
};

async function openAndMeasure(path, prof, lang) {
  const ctx = await newContext(browser, { banner: false, appLang: lang === "bn" ? "bn" : null, viewport: { width: prof.w, height: prof.h }, latencyMs: LATENCY, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.addInitScript(LONGTASK_INIT);
  await routeGzip(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  if (process.argv.includes("--debug")) { page.on("console", (m) => console.log("   [console]", m.text())); page.on("requestfailed", (r) => console.log("   [failed]", r.url())); }
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (prof.throttle) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await page.goto(`${BASE}/app/${path}?navBack=1`, { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(800);
  const data = await page.evaluate(() => {
    const paint = performance.getEntriesByType("paint").find((p) => p.name === "first-contentful-paint");
    const log = (window.__fsLog || []).map((r) => ({ kind: r.kind, col: r.col, id: r.id, t0: r.t0, t1: r.t1, docs: r.docs ?? 0 }));
    const lastRead = Math.max(0, ...log.map((r) => r.t1 || 0));
    return { fcp: paint ? paint.startTime : null, log, lastRead, long: window.__long || [], nodes: document.getElementsByTagName("*").length, height: document.documentElement.scrollHeight };
  });
  const scrollMs = await page.evaluate(async () => {
    const el = document.scrollingElement || document.documentElement;
    const max = Math.max(0, el.scrollHeight - innerHeight), out = [];
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (let i = 1; i <= 20; i++) {
      const t = performance.now();
      el.scrollTop = Math.round((max * i) / 20);
      window.dispatchEvent(new Event("scroll"));
      await frame();
      out.push(performance.now() - t);
    }
    return out;
  });
  const ready = Math.max(data.fcp || 0, data.lastRead);
  const longTasks = data.long.filter((t) => t.s < ready + 1500).map((t) => t.d);
  const actions = [];
  for (const [label, fn] of ACTIONS[path] || []) {
    await page.evaluate(() => { window.__long = []; });
    const a = await timeAction(page, fn);
    actions.push({ label, elapsed: a.elapsed, maxLong: a.maxLong, ...summarise(a.log), log: a.log });
  }
  await ctx.close();
  const s = summarise(data.log);
  return { fcp: data.fcp, ready, ...s, log: data.log, maxLong: Math.max(0, ...longTasks), longTasks: longTasks.length, scrollMax: Math.max(0, ...scrollMs), scrollAvg: scrollMs.reduce((a, b) => a + b, 0) / (scrollMs.length || 1), nodes: data.nodes, height: data.height, errors: errors.length, actions };
}

for (const [name, path] of PAGES) {
  if (ONLY && !path.startsWith(ONLY)) continue;
  for (const prof of PROFILES) {
    if (ONLY_PROFILE && ONLY_PROFILE !== prof.key) continue;
    for (const lang of LANGS) {
      if (ONLY_LANG && ONLY_LANG !== lang) continue;
      const m = { name, path, prof: prof.key, lang, ...(await openAndMeasure(path, prof, lang)) };
      rows.push(m);
      const tag = `${name} / ${prof.key} / ${lang}`;
      console.log(`   ${tag.padEnd(30)} FCP ${String(Math.round(m.fcp ?? -1)).padStart(5)}  ready ${String(Math.round(m.ready)).padStart(5)}  reads ${String(m.reads).padStart(3)}  docs ${String(m.docs).padStart(5)}  long ${m.longTasks} (max ${Math.round(m.maxLong)})  scroll max ${Math.round(m.scrollMax)}  nodes ${m.nodes}`);
      console.log(`      reads by collection: ${Object.entries(m.byCol).map(([c, v]) => `${c} ${v.reads}x/${v.docs}d`).join(", ")}`);
      for (const a of m.actions) console.log(`      action "${a.label}": ${Math.round(a.elapsed)} ms, reads ${a.reads}, docs ${a.docs}, long max ${Math.round(a.maxLong)}  (${Object.entries(a.byCol).map(([c, v]) => `${c} ${v.reads}x/${v.docs}d`).join(", ")})`);
      check(`${tag}: no page error`, m.errors === 0, `${m.errors} page errors`);
      check(`${tag}: FCP was measured`, m.fcp != null);
      check(`${tag}: no read returns more than ${READ_DOC_CAP} documents`, Object.values(m.byCol).every((v) => v.maxDocs <= READ_DOC_CAP), JSON.stringify(m.byCol));
      check(`${tag}: no main-thread long task over ${LONG_TASK_MAX} ms`, m.maxLong <= LONG_TASK_MAX, `${Math.round(m.maxLong)} ms`);
      check(`${tag}: scroll-to-frame <= ${SCROLL_MAX} ms at every step`, m.scrollMax <= SCROLL_MAX, `${Math.round(m.scrollMax)} ms`);
      // the load-speed contract
      const recs = m.log.filter((r) => r.col === "records" && READ_KINDS.includes(r.kind));
      check(`${tag}: records are read one chunk document at a time, never a person's whole set`, recs.every((r) => r.kind === "getDoc"), `${recs.filter((r) => r.kind !== "getDoc").length} list reads of records`);
      const act = m.log.filter((r) => r.col === "activity" && READ_KINDS.includes(r.kind));
      check(`${tag}: activity is read as single week documents, never a year`, act.every((r) => r.kind === "getDoc"), `${act.filter((r) => r.kind !== "getDoc").length} list reads of activity`);
      check(`${tag}: no sessions collection is read`, m.log.every((r) => r.col !== "sessions"));
      for (const a of m.actions) {
        check(`${tag}: "${a.label}" settles in <= ${ACTION_MAX} ms`, a.elapsed <= ACTION_MAX, `${Math.round(a.elapsed)} ms`);
        // an action is a reader's tap: the page may not freeze (a task over 50 ms, the browser's own "long task") while it answers
        check(`${tag}: "${a.label}" freezes the page for no more than ${ACTION_LONG_MAX} ms at a time`, a.maxLong <= ACTION_LONG_MAX, `${Math.round(a.maxLong)} ms`);
        const aRecs = a.log.filter((r) => r.col === "records");
        check(`${tag}: "${a.label}" reads records only as single chunk documents`, aRecs.every((r) => r.kind === "getDoc"), `${aRecs.filter((r) => r.kind !== "getDoc").length} list reads`);
      }
      if (prof.throttle) {
        check(`${tag}: FCP <= ${FCP_MAX} ms`, m.fcp != null && m.fcp <= FCP_MAX, `${Math.round(m.fcp)} ms`);
        check(`${tag}: ready <= ${READY_MAX} ms`, m.ready <= READY_MAX, `${Math.round(m.ready)} ms`);
      }
    }
  }
}

if (REPORT) { mkdirSync(dirname(REPORT), { recursive: true }); writeFileSync(REPORT, JSON.stringify({ rows: rows.map(({ log, actions, ...r }) => ({ ...r, actions: actions.map(({ log: _l, ...a }) => a) })) }, null, 1)); }
await browser.close();
gzipServer.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
