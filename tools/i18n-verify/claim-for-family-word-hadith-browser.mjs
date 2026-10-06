// The Owner, 5 Oct 2026 (decision 71): progress for family members is recordable "wherever progress is recorded".
// v09.84 put the 👥 picker on the Ayah, This page and Unit cards. This round puts it on the Word Card (WbW, Basic,
// Depth: state presses and Approve/Return) and beside the Hadith "Studied" select.
// Roster (hand-written): p1 Ahsan (owner, the Student, self-confirmed), p2 Maryam (managed child: her claims wait for
// approval), p3 Yusuf (a guardian: self-confirmed). The test word is Al-Fatihah 1:7:6, whose lemma occurs exactly ONCE in
// the Qur'an (asserted below by scanning every surah), so one Achieved moves a person's whole-Qur'an total by exactly 1.
//   --mutate=no-load       skip the per-person cache load before the "before" snapshot -> the already-known person is counted twice
//   --mutate=decide-all    Approve/Return is applied to every ticked person           -> the not-waiting person is decided too
//   --mutate=student-rule  every person takes the Student's confirmation rule         -> the wrong person is treated as waiting
//   --mutate=student-only  only the Student is written for                            -> the two-person checks fail
//   --mutate=hadith-self   Hadith Studied claims only for the page's person           -> the Hadith two-claims check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);

// --- fixture assumption: 1:7:6 has a lemma that occurs once in the whole Qur'an ---
const surahFile = (i) => `tools/quran-data-pull/output/surahs/surah_${String(i).padStart(3, "0")}.json`;
const lemmaCount = {};
for (let i = 1; i <= 114; i++) for (const a of JSON.parse(fs.readFileSync(surahFile(i), "utf8")).ayahs) for (const w of a.words || []) { const l = w.morphology?.lemma; if (l) lemmaCount[l] = (lemmaCount[l] || 0) + 1; }
const s1 = JSON.parse(fs.readFileSync(surahFile(1), "utf8"));
const WORD = s1.ayahs.find((a) => a.ayah === 7).words.find((w) => w.position === 6);
if (!WORD?.morphology?.lemma || lemmaCount[WORD.morphology.lemma] !== 1) throw new Error("fixture assumption broke: 1:7:6 no longer has a once-only lemma");
const OCC = "quran-word-occurrence:v1:1:7:6";

const PROGRESS = (person, by, s = "a") => `{ _id: TENANT_ID + "__${person}__wbw__1_7", contractVersion: "quran-word-progress:v1", identityContract: "quran-word-occurrence:v1", lane: "learner", tenantId: TENANT_ID, personId: "${person}", level: "wbw", surah: 1, ayah: 7, entries: { "6": { s: "${s}", at: "2026-09-13T10:00:00.000Z", by: "${by}" } } }`;
const PEOPLE = `
DATA.tenantPeople.push({ _id: "p3", tenantId: TENANT_ID, personId: "p3", name: lang("Yusuf", "ইউসুফ"), roles: ["guardian"] });`;
const NAMES = { en: ["Ahsan", "Maryam", "Yusuf"], bn: ["আহসান", "মারইয়াম", "ইউসুফ"] };
// A: nothing recorded yet. B: Yusuf already has the word Achieved (his progress is NOT loaded by the page before the press).
// Each person starts with an (empty) totals document, so a press INCREMENTS it, as in production. The stub never mutates its
// own data (CLAUDE.md), so without these a second write in one press would re-create the document and read as a second +1.
const TOTALS = `\nDATA.quranWordTotals = ["p1", "p2", "p3"].map((p) => ({ _id: TENANT_ID + "__" + p, contractVersion: "quran-word-total:v1", tenantId: TENANT_ID, personId: p, total: 77429, known: 0, byJuz: { "1": { known: 0, total: 2522 } } }));`;
const SEED_A = PEOPLE + TOTALS + `\nDATA.quranWordProgress = []; DATA.quranWordApprovals = []; DATA.quranLemmaProgress = []; DATA.quranLemmaApprovals = [];`;
const SEED_B = PEOPLE + TOTALS + `\nDATA.quranWordProgress = [${PROGRESS("p3", "p3")}]; DATA.quranWordApprovals = []; DATA.quranLemmaProgress = []; DATA.quranLemmaApprovals = [];`;
// D: Maryam (the Student here) and Zaynab (p4, also managed) both wait; Yusuf's claim is self-confirmed (nobody waits on it).
const SEED_D = PEOPLE + `
DATA.tenantPeople.push({ _id: "p4", tenantId: TENANT_ID, personId: "p4", name: lang("Zaynab", "যায়নাব"), managedByPersonId: "p1", isMinor: true, roles: ["student"] });
DATA.quranWordProgress = [${PROGRESS("p2", "p2")}, ${PROGRESS("p4", "p4")}, ${PROGRESS("p3", "p3")}]; DATA.quranWordApprovals = []; DATA.quranLemmaProgress = []; DATA.quranLemmaApprovals = [];`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function mutated(ctx) {
  if (!MUTATE) return;
  const swapIn = (file, pairs) => {
    let body = fs.readFileSync(file, "utf8");
    for (const [a, b] of pairs) { if (!body.includes(a)) throw new Error(`mutation anchor missing: ${a.slice(0, 70)}`); body = body.split(a).join(b); }
    return body;
  };
  if (["no-load", "decide-all", "student-rule", "student-only"].includes(MUTATE)) {
    const pairs = {
      "no-load": [["if (ref && (level === \"wbw\" || isWordLevelsPersistenceReady())) await primeAyahProgress(db, { tenantId, personId, level, surah: ref.surah, ayah: ref.ayah });\n            await primeLemmaProgressForOccurrenceScope(currentSurahData, [occurrenceId], tenantId, personId);", ""]],
      "decide-all": [["confirmationRequired: p.confirmationRequired }).awaitingReview);", "confirmationRequired: p.confirmationRequired }).awaitingReview || true);"]],
      "student-rule": [["confirmationRequired = !!(await wordProgressConfirmationRequired(tenantId, personId));", "confirmationRequired = !!(await wordProgressConfirmationRequired(tenantId, subjectPersonId));"]],
      "student-only": [["const order = targets.includes(subjectPersonId) ? [...others, subjectPersonId] : others;", "const order = [subjectPersonId];"]],
    }[MUTATE];
    const body = swapIn("app/quranrevival.html", pairs);
    await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  } else if (MUTATE === "hadith-self") {
    const body = swapIn("app/js/hadith-study-actions.js", [["const targets = personIds?.length ? personIds : [session.personId];", "const targets = [session.personId];"]]);
    await ctx.route("**/js/hadith-study-actions.js*", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
  } else throw new Error(`unknown mutation ${MUTATE}`);
}

async function openWordCard(P) {
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await P.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; }))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(500);
  await P.evaluate(() => {
    const t = document.getElementById("wbwShowToggle");
    if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); }
    const a = document.getElementById("ayahSelect");
    if (a && a.value !== "7") { a.value = "7"; a.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await P.waitForTimeout(800);
  await P.evaluate(() => document.querySelector('[data-word-occurrence$=":1:7:6"]')?.click());
  await P.waitForFunction(() => { const b = document.querySelector("#quranWordCardMount [data-word-progress]"); return !!b && !/Loading|লোড হচ্ছে/.test(b.querySelector(".word-progress-state")?.textContent ?? ""); }, null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(500);
}
const ev = (P, f, a) => P.evaluate(f, a);
const pickerInfo = (P) => ev(P, () => {
  const r = document.querySelector("#quranWordCardMount [data-claim-for]"); if (!r) return null;
  const b = r.querySelector("[data-assign-trigger]").getBoundingClientRect();
  return { label: r.querySelector("[data-assign-trigger-label]")?.textContent, h: b.height, inside: b.left >= 0 && b.right <= innerWidth, rows: [...r.querySelectorAll("[data-assign-list] input")].map((i) => [i.value, i.checked]) };
});
// What each person's whole-Qur'an word total moved by, summed from the writes the page made (setDoc seed or increment).
const totalMoves = (P, from = 0) => ev(P, (k) => {
  const out = {};
  for (const w of (window.__stubWriteData || []).slice(k)) {
    if (w.col !== "quranWordTotals") continue;
    const person = (w.id.match(/__(p\d)$/) || [])[1]; if (!person) continue;
    const known = w.data?.known;
    out[person] = (out[person] || 0) + (typeof known === "number" ? known : (known?.__increment ?? 0));
  }
  return out;
}, from);
const writesFrom = (P, from) => ev(P, ([k]) => (window.__stubWriteData || []).slice(k).map((w) => [w.col, w.id]), [from]);
const nWrites = (P) => ev(P, () => (window.__stubWriteData || []).length);
const tick = async (P, id) => { await P.click("#quranWordCardMount [data-claim-for] [data-assign-trigger]"); await P.waitForTimeout(120); await P.click(`#quranWordCardMount [data-claim-for] [data-assign-list] input[value="${id}"]`); await P.click("#quranWordCardMount [data-claim-for] [data-assign-trigger]"); await P.waitForTimeout(80); };

// --lang=en / --w=390 narrow a debugging run; the default is the full grid.
const ARG = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
for (const lang of (ARG("lang") ? [ARG("lang")] : ["en", "bn"])) for (const width of (ARG("w") ? [Number(ARG("w"))] : [390, 820, 1440])) {
  const tag = `${lang}/${width}`;
  const N = NAMES[lang];
  const bnDigits = (n) => (lang === "bn" ? String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]) : String(n));
  console.log(`\n=== ${tag}: Word Card, record for family ===`);
  // The yardstick: what ONE person's Achieved moves their total by, with nobody else ticked. The stub never mutates its
  // data, so the lemma counter is re-created inside one press and the figure reads 2 here though a real database moves it
  // by the lemma's occurrence count (1 for this word); what matters is each ticked person moves by this same amount.
  let SOLO = 0;
  {
    const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED_A });
    const { page: P } = await openPage(ctx, "/app/quranrevival.html");
    await openWordCard(P);
    const n = await nWrites(P);
    await P.click('#quranWordCardMount [data-word-progress-state="achieved"]');
    await P.waitForFunction(() => !document.querySelector("#quranWordCardMount [data-word-progress-saving]"), null, { timeout: 15000 }).catch(() => {});
    await P.waitForTimeout(500);
    SOLO = (await totalMoves(P, n)).p1 ?? 0;
    check(`${tag}: yardstick: one person's Achieved moves their own total (a positive amount)`, SOLO >= 1, String(SOLO));
    await ctx.close();
  }
  {
    const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED_A });
    await mutated(ctx);
    const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
    await openWordCard(P);
    const pk = await pickerInfo(P);
    check(`${tag}: WbW: the 👥 picker is on the Word Card, naming the Student, only them ticked`, pk?.label === N[0] && JSON.stringify(pk?.rows) === JSON.stringify([["p1", true], ["p2", false], ["p3", false]]), JSON.stringify(pk));
    check(`${tag}: ...a 40px target inside the screen`, (pk?.h ?? 0) >= 40 && !!pk?.inside, JSON.stringify(pk));
    const rowShape = await ev(P, () => { const r = document.querySelector("#quranWordCardMount [data-claim-for]"); const g = document.querySelector("#quranWordCardMount .word-progress-states"); return { after: g?.nextElementSibling === r || r?.previousElementSibling === g }; });
    check(`${tag}: ...sitting right under the state buttons`, !!rowShape.after, JSON.stringify(rowShape));
    // Architect review (#597): the popover is a white box on the dark Word Card; its names must carry their own dark ink.
    await P.click("#quranWordCardMount [data-claim-for] [data-assign-trigger]"); await P.waitForTimeout(120);
    const ink = await ev(P, () => {
      const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
      const pop = document.querySelector("#quranWordCardMount [data-claim-for] [data-assign-popover]");
      const name = pop?.querySelector(".who-name"); if (!name) return null;
      const a = lum(getComputedStyle(name).color), b = lum(getComputedStyle(pop).backgroundColor);
      return { ratio: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100, fg: getComputedStyle(name).color, bg: getComputedStyle(pop).backgroundColor };
    });
    check(`${tag}: ...the names in the open list read against its background (contrast >= 4.5)`, (ink?.ratio ?? 0) >= 4.5, JSON.stringify(ink));
    await P.click("#quranWordCardMount [data-claim-for] [data-assign-trigger]"); await P.waitForTimeout(80);
    // Basic and Depth carry it too (when their buttons are live)
    for (const level of ["basic", "depth"]) {
      await P.evaluate((l) => document.querySelector(`#quranWordCardMount [data-word-card-level="${l}"]`)?.click(), level);
      await P.waitForTimeout(900);
      const has = await ev(P, () => ({ picker: !!document.querySelector("#quranWordCardMount [data-claim-for]"), buttons: document.querySelectorAll("#quranWordCardMount [data-word-progress-state]").length }));
      check(`${tag}: ${level}: the 👥 picker is on the card wherever its progress buttons are`, has.buttons === 0 ? false : has.picker, JSON.stringify(has));
    }
    await P.evaluate(() => document.querySelector('#quranWordCardMount [data-word-card-level="wbw"]')?.click());
    await P.waitForTimeout(700);

    // Achieved for Ahsan + Yusuf
    await tick(P, "p3");
    let n = await nWrites(P);
    await P.click('#quranWordCardMount [data-word-progress-state="achieved"]');
    await P.waitForFunction(() => !document.querySelector("#quranWordCardMount [data-word-progress-saving]"), null, { timeout: 15000 }).catch(() => {});
    await P.waitForTimeout(500);
    let w = await writesFrom(P, n);
    const wp = (p) => w.filter(([c, id]) => c === "quranWordProgress" && id.includes(`__${p}__`)).length;
    check(`${tag}: Achieved with two ticked writes quranWordProgress for EACH (Ahsan and Yusuf), none for Maryam`, wp("p1") >= 1 && wp("p3") >= 1 && wp("p2") === 0, JSON.stringify(w));
    let moves = await totalMoves(P, n);
    check(`${tag}: each person's own whole-Qur'an total moved by the same single-person amount (${SOLO}), Maryam's not at all`, SOLO >= 1 && moves.p1 === SOLO && moves.p3 === SOLO && moves.p2 === undefined, JSON.stringify({ moves, SOLO }));
    n = await nWrites(P);
    await P.click('#quranWordCardMount [data-word-progress-state="achieved"]');
    await P.waitForFunction(() => !document.querySelector("#quranWordCardMount [data-word-progress-saving]"), null, { timeout: 15000 }).catch(() => {});
    await P.waitForTimeout(500);
    moves = await totalMoves(P, n);
    check(`${tag}: pressing Achieved again moves nobody's total`, !moves.p1 && !moves.p3, JSON.stringify(moves));

    // Untick the Student: only Yusuf
    await tick(P, "p1");
    check(`${tag}: only Yusuf ticked: the chip names him`, (await P.textContent("#quranWordCardMount [data-claim-for] [data-assign-trigger-label]")) === N[2]);
    await P.click('#quranWordCardMount [data-word-progress-state="learning"]');
    await P.waitForFunction(() => !document.querySelector("#quranWordCardMount [data-word-progress-saving]"), null, { timeout: 15000 }).catch(() => {});
    await P.waitForTimeout(500);
    const after = await ev(P, () => ({ pressed: [...document.querySelectorAll("#quranWordCardMount [data-word-progress-state]")].find((b) => b.getAttribute("aria-pressed") === "true")?.dataset.wordProgressState, notice: document.getElementById("qrStudyNotice")?.textContent || "" }));
    check(`${tag}: the card still shows the Student's own Achieved`, after.pressed === "achieved", JSON.stringify(after));
    check(`${tag}: the notice names Yusuf`, after.notice.includes(N[2]), JSON.stringify(after));
    w = await writesFrom(P, n);
    check(`${tag}: Learning was written for Yusuf only`, w.some(([c, id]) => c === "quranWordProgress" && id.includes("__p3__")) && !w.some(([c, id]) => c === "quranWordProgress" && id.includes("__p1__")), JSON.stringify(w));
    check(`${tag}: no sideways scroll`, await ev(P, () => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
  {
    // B: Yusuf's progress already exists but is NOT loaded by the page before the press.
    const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED_B });
    await mutated(ctx);
    const { page: P } = await openPage(ctx, "/app/quranrevival.html");
    await openWordCard(P);
    await tick(P, "p3");
    const n = await nWrites(P);
    await P.click('#quranWordCardMount [data-word-progress-state="achieved"]');
    await P.waitForFunction(() => !document.querySelector("#quranWordCardMount [data-word-progress-saving]"), null, { timeout: 15000 }).catch(() => {});
    await P.waitForTimeout(500);
    const moves = await totalMoves(P, n);
    check(`${tag}: a person whose progress was not loaded (Yusuf, already Achieved): his total does NOT move; Ahsan's moves by the single-person amount`, SOLO >= 1 && moves.p1 === SOLO && !moves.p3, JSON.stringify(moves));
    await ctx.close();
  }
  {
    // D: Approve for two ticked, one waiting
    const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED_D });
    await mutated(ctx);
    const { page: P } = await openPage(ctx, "/app/quranrevival.html");
    let prompts = 0;
    P.on("dialog", async (d) => { prompts++; await d.accept("again please"); });
    await P.evaluate(() => { const s = document.getElementById("personSelect"); s.value = "p2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await P.waitForTimeout(900);
    await openWordCard(P);
    await tick(P, "p3"); await tick(P, "p4");
    let n = await nWrites(P);
    // Send back first: the note is asked ONCE and used for both waiting people (an Approve first would leave nobody waiting).
    await P.click('#quranWordCardMount [data-word-progress-decide="returned"]');
    await P.waitForFunction(() => !document.querySelector("#quranWordCardMount [data-word-progress-saving]"), null, { timeout: 15000 }).catch(() => {});
    await P.waitForTimeout(500);
    const w = await ev(P, (k) => (window.__stubWriteData || []).slice(k).filter((x) => x.col === "quranWordApprovals").map((x) => [x.id, JSON.stringify(x.data)]), n);
    const ap = (p) => w.filter(([id]) => id.includes(`__${p}__`)).length;
    check(`${tag}: Send back on Maryam + Zaynab (waiting) + Yusuf (not waiting): decided for the two waiting only`, ap("p2") >= 1 && ap("p4") >= 1 && ap("p3") === 0, JSON.stringify(w));
    check(`${tag}: ...the note was asked ONCE and used for both`, prompts === 1 && w.filter(([, d]) => d.includes("again please")).length >= 2, `prompts=${prompts} ${JSON.stringify(w)}`);
    n = await nWrites(P);
    await P.click('#quranWordCardMount [data-word-progress-decide="returned"]').catch(() => {});
    await P.waitForTimeout(800);
    await ctx.close();
  }
  {
    // Hadith "Studied"
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: PEOPLE });
    await mutated(ctx);
    const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html");
    await P.click('[data-hadith-tab="collections"]'); await P.waitForTimeout(200);
    await P.click('[data-hadeethenc-category="3"]'); await P.waitForTimeout(200);
    await P.click('[data-hadeethenc-hadith="4563"]'); await P.waitForTimeout(300);
    await P.waitForSelector('[data-hadeethenc-card="4563"] [data-hadeethenc-studied]:not([disabled]) ~ *, [data-hadeethenc-card="4563"] [data-claim-for]', { timeout: 8000 }).catch(() => {});
    const hp = await ev(P, () => { const r = document.querySelector('[data-hadeethenc-card="4563"] [data-claim-for]'); if (!r) return null; const b = r.querySelector("[data-assign-trigger]").getBoundingClientRect(); const lab = document.querySelector('[data-hadeethenc-card="4563"] .hadeethenc-study-label')?.getBoundingClientRect(); return { h: b.height, inside: b.left >= 0 && b.right <= innerWidth, rows: [...r.querySelectorAll("[data-assign-list] input")].map((i) => [i.value, i.checked]), label: r.querySelector("[data-assign-trigger-label]")?.textContent }; });
    check(`${tag}: Hadith Studied: the 👥 picker is there, Ahsan ticked, 40px, on screen`, !!hp && hp.label === N[0] && hp.h >= 40 && hp.inside && JSON.stringify(hp.rows) === JSON.stringify([["p1", true], ["p2", false], ["p3", false]]), JSON.stringify(hp));
    check(`${tag}: Hadith: the 👥 list starts closed`, await ev(P, () => getComputedStyle(document.querySelector('[data-hadeethenc-card="4563"] [data-assign-popover]')).display === "none"));
    await P.click('[data-hadeethenc-card="4563"] [data-claim-for] [data-assign-trigger]'); await P.waitForTimeout(100);
    await P.click('[data-hadeethenc-card="4563"] [data-claim-for] [data-assign-list] input[value="p3"]');
    // Architect review (#597): the open list is a styled box (not an always-open inline list) whose names read against it.
    const hInk = await ev(P, () => {
      const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
      const pop = document.querySelector('[data-hadeethenc-card="4563"] [data-assign-popover]');
      const name = pop?.querySelector(".who-name"); if (!name) return null;
      const cs = getComputedStyle(pop), a = lum(getComputedStyle(name).color), b = lum(cs.backgroundColor);
      return { pos: cs.position, bg: cs.backgroundColor, ratio: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100 };
    });
    check(`${tag}: Hadith: the open 👥 list is a floating box whose names read against it (contrast >= 4.5)`, hInk?.pos === "absolute" && hInk?.bg !== "rgba(0, 0, 0, 0)" && (hInk?.ratio ?? 0) >= 4.5, JSON.stringify(hInk));
    await P.click('[data-hadeethenc-card="4563"] [data-claim-for] [data-assign-trigger]'); await P.waitForTimeout(100);
    const n = await nWrites(P);
    await P.selectOption('[data-hadeethenc-studied="4563"]', "achieved"); await P.waitForTimeout(900);
    const w = await ev(P, (k) => (window.__stubWriteData || []).slice(k).filter((x) => x.col === "records").map((x) => ({ id: x.id, by: Object.values(x.data?.entries || {})[0]?.claimedByPersonId ?? Object.entries(x.data || {}).find(([key]) => key.startsWith("entries."))?.[1]?.claimedByPersonId })), n);
    check(`${tag}: Hadith Studied for two ticked writes two records claims (Ahsan's and Yusuf's), claimant Ahsan`, w.length === 2 && w.some((x) => x.id.includes("__p1__")) && w.some((x) => x.id.includes("__p3__")) && w.every((x) => x.by === "p1"), JSON.stringify(w));
    await P.click('[data-hadeethenc-card="4563"] [data-claim-for] [data-assign-trigger]'); await P.waitForTimeout(100);
    await P.click('[data-hadeethenc-card="4563"] [data-claim-for] [data-assign-list] input[value="p1"]');
    await P.click('[data-hadeethenc-card="4563"] [data-claim-for] [data-assign-trigger]'); await P.waitForTimeout(100);
    const n2 = await nWrites(P);
    await P.selectOption('[data-hadeethenc-studied="4563"]', "learning"); await P.waitForTimeout(900);
    const w2 = await ev(P, (k) => (window.__stubWriteData || []).slice(k).filter((x) => x.col === "records").map((x) => x.id), n2);
    const shown = await ev(P, () => ({ v: document.querySelector('[data-hadeethenc-studied="4563"]').value, note: document.querySelector("[data-hadeethenc-recorded]")?.textContent || "" }));
    check(`${tag}: unticking Ahsan records for Yusuf only; the select keeps showing Ahsan's own status; the notice names Yusuf`, w2.length === 1 && w2[0].includes("__p3__") && shown.v === "achieved" && shown.note.includes(N[2]), JSON.stringify({ w2, shown }));
    check(`${tag}: Hadith: no sideways scroll`, await ev(P, () => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`${tag}: Hadith: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}
{
  // a lone person sees no picker on either surface
  const ctx = await newContext(browser, { appLang: "en", banner: false, viewport: { width: 390, height: 900 }, extraSeedJs: "DATA.tenantPeople = DATA.tenantPeople.filter((p) => p._id === 'p1'); DATA.quranWordProgress = [];" });
  await mutated(ctx);
  const { page: P } = await openPage(ctx, "/app/quranrevival.html");
  await openWordCard(P);
  check("lone person: no 👥 on the Word Card (and the buttons are there)", !(await P.$("#quranWordCardMount [data-claim-for]")) && !!(await P.$('#quranWordCardMount [data-word-progress-state="achieved"]')));
  await ctx.close();
  const ctx2 = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 900 }, extraSeedJs: "DATA.tenantPeople = DATA.tenantPeople.filter((p) => p._id === 'p1');" });
  const { page: H } = await openPage(ctx2, "/app/hadith-collections.html");
  await H.click('[data-hadith-tab="collections"]'); await H.waitForTimeout(200);
  await H.click('[data-hadeethenc-category="3"]'); await H.waitForTimeout(200);
  await H.click('[data-hadeethenc-hadith="4563"]'); await H.waitForTimeout(1200);
  check("lone person: no 👥 beside Hadith Studied (and the select is there)", !(await H.$('[data-hadeethenc-card="4563"] [data-claim-for]')) && !!(await H.$('[data-hadeethenc-studied="4563"]')));
  await ctx2.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
