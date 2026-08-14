// Translation coverage report — how much of the app's own English has
// Bangla yet, and exactly which strings are still missing.
//
// The owner cannot read code, so "is the translation finished?" has to be
// a number someone can print, not a judgement call. Run:
//
//   node tools/i18n-coverage.mjs            # summary per area
//   node tools/i18n-coverage.mjs --missing  # every untranslated string
//   node tools/i18n-coverage.mjs --area shell --missing
//
// It reads the SAME catalogue the app reads (app/js/i18n/bn.js), so the
// number can never drift from what a phone actually shows.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "app");
const { BN } = await import(join(APP, "js", "i18n", "bn.js"));

// Pages and modules a real user never opens: developer/admin diagnostics
// and one-off migration tools. Counting them would understate real
// coverage against strings nobody needs translated.
const NOT_USER_FACING = new Set([
  "quranrevival-render-test.html",
  "admin-self-check.html",
  "migrate.html",
  "js/self-check.js",
]);

// Which phase owns which file, so progress can be reported the way the
// work was actually planned. Anything unlisted lands in "later phases".
const AREAS = {
  // js/errors.js joined in phase 4: its eight plain-language write-failure
  // sentences are shown on EVERY screen in the app and were counted by no
  // area at all, so they were neither translated nor reported as missing.
  shell: ["js/nav.js", "js/splash.js", "js/unit-keys.js", "js/errors.js", "js/roles.js", "about.html", "index.html", "onboarding.html", "accept-invite.html"],
  quran: ["quranrevival.html", "js/mastery-wheel.js", "js/way-modal.js", "js/ayah-renderer.js", "js/hifz-renderer.js", "js/audio-player.js", "js/quran-data.js"],
  modules: ["deen-study.html", "arabic-study.html", "hadith-study.html", "general-study.html", "naturelife-study.html", "life-skill.html", "health-study.html", "ldog-study.html", "asma-study.html", "js/topic-study.js", "js/routine-study.js", "js/asma-study.js", "js/topic-renderer.js", "js/asma-renderer.js", "js/catalogue-data.js"],
  // js/homework.js and js/course-offers.js joined in phase 4 -- both hold
  // label maps this area's own pages render (submission state, offer status,
  // role in class), so counting them anywhere else understated the area.
  tracking: ["records.html", "monitor.html", "homework.html", "course-offers.html", "js/monitor.js", "js/continue-strip.js", "js/bookmarks.js", "js/records.js", "js/activity.js", "js/homework.js", "js/course-offers.js"],
  admin: ["people.html", "catalogue.html", "curriculum.html", "classes.html", "js/catalogue.js", "js/people.js", "js/curriculum.js", "js/classes.js", "js/grades.js", "js/invites.js", "js/identity.js", "js/resources.js"],
  asma: ["js/asma-data.js", "js/asma-posters.js"],
};

function areaOf(file) {
  for (const [area, files] of Object.entries(AREAS)) if (files.includes(file)) return area;
  return "later phases";
}

function listFiles() {
  const out = [];
  for (const f of readdirSync(APP)) if (f.endsWith(".html")) out.push(f);
  for (const f of readdirSync(join(APP, "js"))) if (f.endsWith(".js")) out.push(`js/${f}`);
  return out.filter((f) => !NOT_USER_FACING.has(f) && !f.startsWith("js/i18n"));
}

const STRIP_COMMENTS = (s) => s.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

// HTML entities must be decoded before a markup string can be used as a
// catalogue key. translateStatic() reads TEXT NODES from the live DOM, where
// `&amp;` has already become `&` and `&mdash;` has become `—`. A key written
// in the raw source form can therefore never match at runtime -- the report
// would say the string was translated while the page still showed English.
// Found by probing a real rendered page, not by reading the report.
const ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'",
  "&nbsp;": " ", "&hellip;": "…", "&mdash;": "—", "&ndash;": "–",
  "&bull;": "•", "&middot;": "·", "&rarr;": "→", "&larr;": "←", "&times;": "×",
};
const decodeEntities = (s) => s.replace(/&[a-z]+;|&#\d+;/gi, (e) => ENTITIES[e] ?? e);
const LOOKS_USER_FACING = (s) =>
  // Two letters, not three. "Go to" is a real on-screen label with no
  // three-letter word in it, and a {3,} rule silently excluded it -- the
  // report then claimed the Quran module was 100% translated while that
  // label sat there in English. Short words are exactly the ones a
  // half-finished translation leaves behind, so they must be counted.
  /[A-Za-z]{2,}/.test(s) &&
  // A ${...} template placeholder means the string was assembled in code.
  // Those are never catalogue keys -- a translatable one is rewritten as
  // t("... {name} ...", { name }) first, which this then picks up properly.
  !s.includes("${") &&
  // A stray backslash means the loose heuristics below tore a string at an
  // escape sequence. The precise t() matcher above already caught the real
  // key, so this is always a fragment of one.
  !s.includes("\\") &&
  !/^[a-z_]+$/.test(s) && // identifiers, statuses, collection names
  !/^https?:|\.(js|html|css|json)$|^#|^[A-Za-z-]+\/[A-Za-z-]+$/.test(s);

/** Every English string a user could see in one file. */
function extract(file) {
  const src = readFileSync(join(APP, file), "utf8");
  const found = new Set();

  if (file.endsWith(".html")) {
    const markup = src
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<style[\s\S]*?<\/style>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "");
    for (const m of markup.matchAll(/>([^<>]+)</g)) {
      const raw = m[1].trim();
      // A node that is ONLY an entity (&times;, &nbsp;) is punctuation, not
      // wording -- skip it, but decode everything else so the key matches
      // the text node the app will actually look up.
      if (!raw || /^(?:&[a-z]+;|&#\d+;)+$/i.test(raw)) continue;
      const s = decodeEntities(raw);
      if (LOOKS_USER_FACING(s)) found.add(s);
    }
    for (const m of markup.matchAll(/(?:placeholder|title|aria-label|alt)="([^"]+)"/g)) {
      const s = decodeEntities(m[1].trim());
      if (LOOKS_USER_FACING(s)) found.add(s);
    }
  }

  const js = file.endsWith(".html")
    ? [...src.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n")
    : src;
  const code = STRIP_COMMENTS(js);
  // Anything already routed through t() is, by definition, a string we
  // intend to translate — the authoritative list for converted files.
  //
  // The (?:[^"\\]|\\.)* form matters: a key may legitimately contain an
  // ESCAPED quote (Couldn't read \"{text}\"...). A naive [^"]+ stops at that
  // backslash-quote and reports a truncated fragment as a missing string,
  // which is a phantom the owner would then be asked to translate.
  // Unescaping afterwards is what makes the reported key match the source.
  for (const m of code.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
    found.add(m[1].replace(/\\(["'\\])/g, "$1"));
  }
  for (const m of code.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) {
    found.add(m[1].replace(/\\(["'\\])/g, "$1"));
  }
  // SINGULAR/PLURAL PAIRS (phase 4): t(n === 1 ? "...entry..." : "...entries...").
  // English needs two sentences where the catalogue key is picked at run
  // time; the matcher above only sees a quote immediately after `t(`, so the
  // PLURAL half -- the one shown almost every time -- went uncounted.
  for (const m of code.matchAll(/\bt\(\s*[^)"'`]*?\?\s*"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
    found.add(m[1].replace(/\\(["'\\])/g, "$1"));
    found.add(m[2].replace(/\\(["'\\])/g, "$1"));
  }
  for (const m of code.matchAll(/>([A-Z][^<>{}`$]{2,70})</g)) {
    const s = m[1].trim();
    if (LOOKS_USER_FACING(s)) found.add(s);
  }
  for (const m of code.matchAll(/(?:textContent|innerText|alert|confirm|label|placeholder|title)\s*[=(:]\s*["'`]([A-Z][^"'`]{2,90})["'`]/g)) {
    const s = m[1].trim();
    if (LOOKS_USER_FACING(s)) found.add(s);
  }
  for (const m of code.matchAll(/label:\s*"([^"]{2,70})"/g)) {
    const s = m[1].trim();
    if (LOOKS_USER_FACING(s)) found.add(s);
  }

  // LABEL MAPS (phase 4). A stored identifier -- confirmState "pending",
  // action "claimed", roleInClass "teacher" -- becomes readable text through
  // a small map whose VALUES are the English translation keys:
  //
  //   const CONFIRM_STATE_LABELS = Object.freeze({ pending: "Awaiting confirmation", ... });
  //   export function confirmStateLabel(id) { return t(CONFIRM_STATE_LABELS[id]); }
  //
  // t() is handed a variable there, so every pattern above misses it, and
  // the report would call an area finished while a table column of pills sat
  // there in English. That is the same failure mode as the three earlier
  // tool bugs, and it is why the `_LABELS` name is a CONVENTION, not a
  // coincidence: name a map that way and its wording gets counted.
  for (const block of code.matchAll(/\b[A-Z_]*_LABELS\s*=\s*(?:Object\.freeze\()?[[{]([\s\S]*?)[}\]]/g)) {
    for (const m of block[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
      const s = m[1].replace(/\\(["'\\])/g, "$1").trim();
      if (LOOKS_USER_FACING(s)) found.add(s);
    }
  }

  // PLATFORM DATA (phase 3). catalogue-data.js and asma-data.js wrap every
  // user-visible string in a small language-key helper -- en("Deen Study"),
  // nameLang("Memorise", "..."), m("The Most Merciful"). These are seeded
  // into each tenant's Firestore documents, and langText() now falls back
  // through the same catalogue for them, so they are translatable and must
  // be counted. Without this the report would call an area finished while
  // every subject name on the screen was still English.
  for (const m of code.matchAll(/\b(?:en|nameLang|m)\(\s*"((?:[^"\\]|\\.)*)"/g)) {
    const s = m[1].replace(/\\(["'\\])/g, "$1").trim();
    if (LOOKS_USER_FACING(s)) found.add(s);
  }
  return found;
}

const wantArea = process.argv.includes("--area") ? process.argv[process.argv.indexOf("--area") + 1] : null;
const showMissing = process.argv.includes("--missing");

const byArea = new Map();
for (const file of listFiles()) {
  const area = areaOf(file);
  if (wantArea && area !== wantArea) continue;
  if (!byArea.has(area)) byArea.set(area, { all: new Set(), missing: new Set() });
  const bucket = byArea.get(area);
  for (const s of extract(file)) {
    bucket.all.add(s);
    // A string counts as translated if the catalogue has it, either plain
    // or under a context suffix ("Track|verb").
    const translated = BN[s] !== undefined || Object.keys(BN).some((k) => k.startsWith(`${s}|`));
    if (!translated) bucket.missing.add(s);
  }
}

const ORDER = ["shell", "quran", "modules", "tracking", "admin", "asma", "later phases"];
let totalAll = 0;
let totalMissing = 0;
console.log(`\n${"area".padEnd(16)}${"strings".padStart(9)}${"bangla".padStart(9)}${"missing".padStart(9)}${"".padStart(3)}done`);
for (const area of ORDER) {
  const b = byArea.get(area);
  if (!b) continue;
  const all = b.all.size;
  const missing = b.missing.size;
  totalAll += all;
  totalMissing += missing;
  const pct = all === 0 ? 100 : Math.round(((all - missing) / all) * 100);
  console.log(`${area.padEnd(16)}${String(all).padStart(9)}${String(all - missing).padStart(9)}${String(missing).padStart(9)}${"".padStart(3)}${pct}%`);
}
const donePct = totalAll === 0 ? 100 : Math.round(((totalAll - totalMissing) / totalAll) * 100);
console.log(`${"TOTAL".padEnd(16)}${String(totalAll).padStart(9)}${String(totalAll - totalMissing).padStart(9)}${String(totalMissing).padStart(9)}${"".padStart(3)}${donePct}%`);
console.log(`\ncatalogue entries: ${Object.keys(BN).length}`);

if (showMissing) {
  for (const area of ORDER) {
    const b = byArea.get(area);
    if (!b || b.missing.size === 0) continue;
    console.log(`\n--- ${area}: ${b.missing.size} missing ---`);
    for (const s of [...b.missing].sort()) console.log(`  ${JSON.stringify(s)}: "",`);
  }
}
