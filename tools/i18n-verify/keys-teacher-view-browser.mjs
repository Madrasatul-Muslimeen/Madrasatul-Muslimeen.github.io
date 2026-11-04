// PCF MSA J03 round K4: the teacher's view of Keys marks on monitor.html (app/js/keys-teacher-view.js).
// (1) Nothing is read and the view's script is not fetched until the teacher opens the section (I9).
// (2) One row per student with the right counts per mark, for āyāt, Qur'an words, hadith and hadith words.
// (3) "Show on wheel" opens quranrevival.html?surah=<s>&keysFor=<personId>&back=1.
// (4) "Marked by most students": the order (distinct students, ties by key), Done never ranks, links carry back=1.
// (5) Another sūrah reads one document per student and does NOT read the hadith again.
// (6) A refused read (the Rules not yet published) says so in words on the page (I15).
// (7) Fit: no sideways scroll, nothing past the screen's edge, at 360/768/1440, en and bn, text 100% and 200%;
//     every link and the picker at least 40px tall; text contrast at least 4.5:1; Bangla has no English left.
// Run from the repository root, serve.js on :8080 (QR_BASE for another port).
//   --mutate=NAME  applies one mutation to the app files (restored after); the suite must FAIL.
//   --prove        runs every mutation in turn.   --shots  saves screenshots to tools/i18n-verify/out/keys-teacher/
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const VIEW = "app/js/keys-teacher-view.js", MON = "app/monitor.html", BN = "app/js/i18n/bn.js";
const MUT = {
  eager: [MON, "      if (!keysTeacherSection.open || !activeTenantId) return;", "      if (!activeTenantId) return;"],
  noback: [VIEW, "&keysFor=${encodeURIComponent(personId)}&back=1`", "&keysFor=${encodeURIComponent(personId)}`"],
  mostback: [VIEW, "return `./quranrevival.html?goto=${item.surah}:${item.ayah}&back=1`;", "return `./quranrevival.html?goto=${item.surah}:${item.ayah}`;"],
  order: [VIEW, "model.mostMarked.slice(0, MOST_SHOWN)", "model.mostMarked.slice(0, MOST_SHOWN).reverse()"],
  silentrefuse: [VIEW, "if (rows.some((r) => r.refused)) {", "if (false) {"],
  wrongkind: [VIEW, "for (const c of chips(r.counts[kind], lang))", "for (const c of chips(r.counts.ayah, lang))"],
  hadithreread: [VIEW, "if (!hadithCache.has(s.personId)) {", "if (true) {"],
  bnleak: [BN, '  "Show on wheel": "চাকায় দেখান",\n', ""],
  wide: [VIEW, "minmax(min(100%, 19rem), 1fr)", "minmax(26rem, 1fr)"],
  lowcontrast: [VIEW, ".ktv-chip-done { background: #d7efdf; color: #1d5a3c;", ".ktv-chip-done { background: #d7efdf; color: #8fc9a3;"],
  smalltarget: [VIEW, "box-sizing: border-box; min-height: 44px; padding: 0.4rem 0.9rem;", "box-sizing: border-box; min-height: 20px; padding: 0 0.9rem;"],
};
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);

if (process.argv.includes("--prove")) {
  let caught = 0;
  for (const name of Object.keys(MUT)) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--mutate=${name}`], { encoding: "utf8", env: process.env });
    const ok = r.status === 1 && /\n  FAIL  /.test(r.stdout);
    if (ok) caught++;
    const fails = (r.stdout.match(/\n  FAIL  [^\n]*/g) || []).slice(0, 2).map((s) => s.trim()).join(" | ");
    console.log(`  ${ok ? "CAUGHT  " : "UNPROVEN"}  ${name}${fails ? "  <- " + fails.slice(0, 220) : ""}`);
  }
  console.log(`\n${caught}/${Object.keys(MUT).length} mutations caught`);
  process.exit(caught === Object.keys(MUT).length ? 0 : 1);
}

const MUTATE = arg("mutate");
const restore = [];
if (MUTATE) {
  if (!MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
  const [file, from, to] = MUT[MUTATE];
  const text = fs.readFileSync(file, "utf8");
  const n = text.split(from).length - 1;
  if (n < 1) throw new Error(`mutation ${MUTATE}: its text is not in ${file}`);
  restore.push([file, text]);
  fs.writeFileSync(file, text.split(from).join(to));
  console.log(`(mutation ${MUTATE}: ${n} occurrence(s) replaced in ${file})`);
}
const undo = () => { for (const [f, t] of restore.splice(0)) fs.writeFileSync(f, t); };
process.on("exit", undo);
process.on("SIGINT", () => { undo(); process.exit(130); });

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

// Two students with marks (Maryam p2 is in the default fixture; Yusuf p3 is added), and the signed-in owner p1 with none.
const SEED = `
DATA.tenantPeople.push({ _id: "p3", tenantId: TENANT_ID, personId: "p3", name: lang("Yusuf", "ইউসুফ"), roles: ["student"] });
DATA.ayahKeyMarks = [
  { _id: TENANT_ID + "__p2__1", tenantId: TENANT_ID, scope: "p2", surah: 1, entries: { "ayah:1:1": ["hard"], "ayah:1:2": ["practice", "done"], "ayah:1:3": ["done"], "qword:1:1:2": ["hard"], "ayah:1:4": ["gharib"] } },
  { _id: TENANT_ID + "__p3__1", tenantId: TENANT_ID, scope: "p3", surah: 1, entries: { "ayah:1:2": ["hard"], "ayah:1:1": ["done"], "qword:1:1:2": ["practice"] } },
  { _id: TENANT_ID + "__p3__36", tenantId: TENANT_ID, scope: "p3", surah: 36, entries: { "ayah:36:9": ["hard"], "ayah:36:10": ["hard"] } },
];
DATA.hadithKeyMarks = [
  { _id: TENANT_ID + "__p2__hadeethenc", tenantId: TENANT_ID, scope: "p2", collection: "hadeethenc", entries: { "hadith:hadeethenc:3062": ["hard"], "hadithword:hadeethenc:3062:1": ["practice"] } },
  { _id: TENANT_ID + "__p3__hadeethenc", tenantId: TENANT_ID, scope: "p3", collection: "hadeethenc", entries: { "hadith:hadeethenc:3062": ["practice"] } },
];
`;
const MOST_ORDER = ["ayah:1:2", "hadith:hadeethenc:3062", "qword:1:1:2", "ayah:1:1", "hadithword:hadeethenc:3062:1"];

const shots = process.argv.includes("--shots");
if (shots) fs.mkdirSync("tools/i18n-verify/out/keys-teacher", { recursive: true });

const browser = await chromium.launch();
let scriptFetched = false;
async function open({ lang = "en", viewport = { width: 1024, height: 900 }, refuse = false } = {}) {
  const ctx = await newContext(browser, { viewport, appLang: lang, extraSeedJs: SEED });
  if (refuse) await ctx.addInitScript(() => { window.__stubRefuseCols = ["ayahKeyMarks", "hadithKeyMarks"]; });
  scriptFetched = false;
  ctx.on("request", (r) => { if (r.url().includes("keys-teacher-view")) scriptFetched = true; });
  const { page, errors } = await openPage(ctx, "/app/monitor.html");
  await page.waitForFunction(() => document.getElementById("personSelect")?.options.length > 0, null, { timeout: 15000 });
  return { ctx, page, errors };
}
const keyReads = (page) => page.evaluate(() => (window.__fsLog || []).filter((r) => r.col === "ayahKeyMarks" || r.col === "hadithKeyMarks").map((r) => `${r.col}/${r.id}`));
async function openSection(page) {
  await page.click("#keysTeacherSection > summary");
  await page.waitForFunction(() => document.querySelector("[data-ktv-body] [data-ktv-person], [data-ktv-body] [data-ktv-refused]"), null, { timeout: 15000 });
}
const chipText = (page, person, kind) => page.$$eval(`[data-ktv-person="${person}"] [data-ktv-kind="${kind}"] .ktv-chip`, (els) => els.map((e) => e.textContent.trim()));

try {
  // --- (1)-(5): English, a computer ---
  {
    const { ctx, page } = await open();
    const before = await keyReads(page);
    check("(1) nothing is read from ayahKeyMarks/hadithKeyMarks while the section is closed", before.length === 0, JSON.stringify(before));
    check("(1) the view's script is not fetched while the section is closed", !scriptFetched);
    check("(1) the section starts closed", await page.evaluate(() => !document.getElementById("keysTeacherSection").open));
    await openSection(page);
    check("(1) POSITIVE CONTROL: opening the section reads the marks", (await keyReads(page)).length > 0);

    const persons = await page.$$eval("[data-ktv-person]", (els) => els.map((e) => e.getAttribute("data-ktv-person")));
    check("(2) one row per student in the roster (p1, p2, p3)", JSON.stringify(persons) === JSON.stringify(["p1", "p2", "p3"]), JSON.stringify(persons));
    const m = { ayah: await chipText(page, "p2", "ayah"), qword: await chipText(page, "p2", "qword"), hadith: await chipText(page, "p2", "hadith"), hw: await chipText(page, "p2", "hadithword") };
    check("(2) Maryam's āyāt: Difficult 1, Need practice 1, Done 2", JSON.stringify(m.ayah) === JSON.stringify(["Difficult 1", "Need practice 1", "Done 2"]), JSON.stringify(m.ayah));
    check("(2) Maryam's Qur'an words: Difficult 1", JSON.stringify(m.qword) === JSON.stringify(["Difficult 1", "Need practice 0", "Done 0"]), JSON.stringify(m.qword));
    check("(2) Maryam's hadith: Difficult 1; hadith words: Need practice 1", JSON.stringify(m.hadith) === JSON.stringify(["Difficult 1", "Need practice 0", "Done 0"]) && JSON.stringify(m.hw) === JSON.stringify(["Difficult 0", "Need practice 1", "Done 0"]), JSON.stringify([m.hadith, m.hw]));
    const y = await chipText(page, "p3", "ayah");
    check("(2) Yusuf's āyāt: Difficult 1, Done 1", JSON.stringify(y) === JSON.stringify(["Difficult 1", "Need practice 0", "Done 1"]), JSON.stringify(y));

    const wheel = await page.$$eval("[data-ktv-wheel]", (els) => els.map((e) => e.getAttribute("href")));
    check("(3) Show on wheel: ./quranrevival.html?surah=1&keysFor=<id>&back=1 for every student", wheel.length === 3 && wheel.every((h, i) => h === `./quranrevival.html?surah=1&keysFor=p${i + 1}&back=1`), JSON.stringify(wheel));
    check("(3) Show on wheel's own words", (await page.$eval("[data-ktv-wheel]", (e) => e.textContent.trim())) === "Show on wheel");

    const most = await page.$$eval("[data-ktv-most] li", (els) => els.map((e) => ({ unit: e.getAttribute("data-ktv-unit"), href: e.querySelector("a")?.getAttribute("href"), text: e.textContent })));
    check("(4) Marked by most students: the order (2, 2, 2, 1, 1; ties by key)", JSON.stringify(most.map((x) => x.unit)) === JSON.stringify(MOST_ORDER), JSON.stringify(most.map((x) => x.unit)));
    check("(4) Done alone never ranks (ayah:1:3 is not listed)", !most.some((x) => x.unit === "ayah:1:3"));
    const hrefOf = (u) => most.find((x) => x.unit === u)?.href;
    check("(4) an āyah opens quranrevival.html?goto=1:2&back=1", hrefOf("ayah:1:2") === "./quranrevival.html?goto=1:2&back=1", hrefOf("ayah:1:2"));
    check("(4) a word opens its āyah, goto=1:1&back=1", hrefOf("qword:1:1:2") === "./quranrevival.html?goto=1:1&back=1", hrefOf("qword:1:1:2"));
    check("(4) a hadith opens hadith-study.html?resume=hadith:hadeethenc:3062&back=1", hrefOf("hadith:hadeethenc:3062") === "./hadith-study.html?resume=hadith:hadeethenc:3062&back=1", hrefOf("hadith:hadeethenc:3062"));
    check("(4) every Marked-by-most link carries back=1", most.length > 0 && most.every((x) => /[?&]back=1$/.test(x.href || "")));
    check("(4) the top item says 2 students and shows its Done count", /2 students/.test(most[0]?.text || "") && /Done 1/.test(most[0]?.text || ""), most[0]?.text);
    if (shots) await page.screenshot({ path: "tools/i18n-verify/out/keys-teacher/en-1024.png", fullPage: true });

    const readsBefore = (await keyReads(page)).length;
    const hadithBefore = (await keyReads(page)).filter((r) => r.startsWith("hadithKeyMarks")).length;
    await page.selectOption("[data-ktv-surah]", "36");
    await page.waitForFunction(() => document.querySelector('[data-ktv-person="p3"] [data-ktv-wheel]')?.getAttribute("href")?.includes("surah=36"), null, { timeout: 10000 });
    const after = await keyReads(page);
    const newReads = after.slice(readsBefore);
    check("(5) another sūrah: one Qur'an read per student, and no hadith read again", newReads.length === 3 && newReads.every((r) => r.startsWith("ayahKeyMarks/") && r.endsWith("__36")) && after.filter((r) => r.startsWith("hadithKeyMarks")).length === hadithBefore, JSON.stringify(newReads));
    const y36 = await chipText(page, "p3", "ayah"), yh = await chipText(page, "p3", "hadith");
    check("(5) on sūrah 36 Yusuf has Difficult 2 āyāt, and his hadith still count (Need practice 1)", y36[0] === "Difficult 2" && yh[1] === "Need practice 1", JSON.stringify([y36, yh]));
    await ctx.close();
  }

  // --- (6) a refused read ---
  {
    const { ctx, page } = await open({ refuse: true });
    await openSection(page);
    const msg = await page.$eval("[data-ktv-body]", (e) => e.innerText);
    check("(6) a refused read says so in words on the page", /once the Owner publishes the Keys Rules step/.test(msg), msg.slice(0, 160));
    const vis = await page.$eval("[data-ktv-refused]", (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).catch(() => false);
    check("(6) the message is on screen", vis);
    check("(6) no counts are shown for a refused read", (await page.$$("[data-ktv-person] .ktv-chip")).length === 0);
    if (shots) await page.screenshot({ path: "tools/i18n-verify/out/keys-teacher/refused-en-1024.png" });
    await ctx.close();
  }

  // --- (7) fit, targets, contrast, Bangla ---
  for (const lang of ["en", "bn"]) {
    for (const width of [360, 768, 1440]) {
      for (const size of [100, 200]) {
        const tag = `${lang} ${width}px text ${size}%`;
        const { ctx, page } = await open({ lang, viewport: { width, height: 900 } });
        if (size !== 100) await page.evaluate((s) => { document.documentElement.style.fontSize = s + "%"; }, size);
        await openSection(page);
        await page.waitForTimeout(150);
        const r = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const root = document.querySelector("[data-ktv]");
          const past = [...root.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > vw + 0.5 || b.left < -0.5); }).slice(0, 3).map((e) => `${e.className || e.tagName} ${Math.round(e.getBoundingClientRect().right)}`);
          const small = [...root.querySelectorAll("a, select"), document.querySelector("#keysTeacherSection > summary")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height < 40; }).map((e) => `${e.className || e.tagName} ${Math.round(e.getBoundingClientRect().height)}`);
          const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
          const bgOf = (e) => { for (let x = e; x; x = x.parentElement) { const b = getComputedStyle(x).backgroundColor; const m = b.match(/[\d.]+/g); if (m && (m.length < 4 || Number(m[3]) > 0.5)) return b; } return "rgb(255,255,255)"; };
          const low = [];
          for (const e of [...root.querySelectorAll("*")].filter((x) => [...x.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))) {
            const a = lum(getComputedStyle(e).color), b = lum(bgOf(e));
            const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            if (ratio < 4.5) low.push(`${e.className || e.tagName} "${e.textContent.trim().slice(0, 20)}" ${ratio.toFixed(2)}`);
          }
          const english = [...root.querySelectorAll("*")].filter((x) => x.tagName !== "OPTION").flatMap((x) => [...x.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent)).filter((s) => /[A-Za-z]{3,}/.test(s) && !/Yusuf|Maryam|Ahsan/.test(s));
          return { sideways: document.documentElement.scrollWidth - vw, past, small, low, english: english.slice(0, 3) };
        });
        check(`(7) ${tag}: no sideways scroll`, r.sideways <= 0, `scrollWidth over by ${r.sideways}px`);
        check(`(7) ${tag}: nothing in the view goes past the screen's edge`, r.past.length === 0, JSON.stringify(r.past));
        check(`(7) ${tag}: every link, the picker and the heading are 40px or taller`, r.small.length === 0, JSON.stringify(r.small));
        check(`(7) ${tag}: text contrast 4.5:1 or more`, r.low.length === 0, JSON.stringify(r.low.slice(0, 3)));
        if (lang === "bn") check(`(7) ${tag}: no English left in the view`, r.english.length === 0, JSON.stringify(r.english));
        if (shots && (width === 360 || size === 200)) await page.screenshot({ path: `tools/i18n-verify/out/keys-teacher/${lang}-${width}-${size}.png`, fullPage: true });
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
  undo();
}
console.log(`\n==== keys-teacher-view: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
