// Bangla sweep, part 3 (issue #684): the landing page and every remaining page -- the study modules, people, records,
// monitor, homework, catalogue, curriculum, classes, course offers, taglines, about, backup, onboarding, accept-invite.
//
// Same method and the SAME scanner as #677/#680 (bangla-sweep-lib.mjs): each page is opened for real in Bangla, every
// visible text node and aria-label/title/placeholder is read for Latin-script interface words, and the suite asserts none.
// Data is allowed only by exact phrase (lib + OTHER_ALLOWED below, each with its reason). Run at 390px and at 1280px.
//
// Skipped on purpose (owner tools / test pages / demo): migrate.html, admin-self-check.html,
// quranrevival-render-test.html, note-editor-prototype-demo.html.
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/bangla-sweep-other-pages-browser.mjs
//   --list               print every Latin-script string found on each screen (READ it)
//   --mutate="<phrase>"  make the page's bn lookup miss that phrase (the sweep must fail and name it)
//   --width=390|1280     run one width only
//   --shots=<dir>        save a 390px screenshot of each page into <dir>
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
import { SCAN, leaksOf as baseLeaksOf, DATA_ALLOWED, NAME_TOKENS } from "./bangla-sweep-lib.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const LIST = process.argv.includes("--list");
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("width"), SHOTS = arg("shots");

// Data this part meets: exact phrases, each a name, title or note TYPED BY THE TEST'S SEED (the tenant's own words), or an
// identifier -- never interface wording.
DATA_ALLOWED.push(
  // Seeded class, course offer, ladder/levels, assignment, feedback note and returned-entry note (firebase-stub.mjs).
  /^(Morning Class|Evening Quran|General Grades|Year 1|Year 2|Surah Al-Fatiha|Memorise Surah Al-Fatiha|Doing well on tajweed\.|Try again)$/,
  /^(Morning Class|Evening Quran) \((ক্লাস|কোর্স অফার)\)$/,
  /^General Grades( — Year 1|: Year 1)(, [০-৯-]+ থেকে \(বর্তমান\))?$/,
  /^সপ্তাহ [০-৯]+ — Surah Al-Fatiha$/,
  // A resource's own link address (data); and an input's "https://…" example shape, which is a URL pattern, not a word.
  /^https:\/\/(example\.org\/lesson|…)$/,
  // The topic names the test seeds into each study module (typed by the tenant).
  /^(Seeded topic|Seeded topic with a resource|Seeded Root)$/,
);
// "CSV" is the file-type name on the Download button (an acronym, printed the same in Bangla); "http" is the URL scheme
// the Taglines note tells the reader to type; "Quran Foundation" is the font provider's credit; "surah_1" is the
// records chunk's storage id, printed after the translated label "খণ্ড:" (the page's own comment calls it an identifier).
NAME_TOKENS.push(/\bCSV\b/g, /\bhttps?\b/g, /Quran Foundation/g, /\bsurah_\d+\b/g);

const allLeaks = [];
async function sweep(P, screen, width) {
  const bnChars = await P.evaluate(() => (document.body.innerText.match(/[ঀ-৿]/g) || []).length);
  check(`bn ${width}: "${screen}" is rendered in Bangla (positive control)`, bnChars >= 10, `Bangla characters: ${bnChars}`);
  const found = await P.evaluate(SCAN);
  const leaks = baseLeaksOf(found);
  for (const l of leaks) allLeaks.push({ screen, ...l });
  if (LIST) console.log(`[${width} ${screen}] ${leaks.length} Latin-script strings:\n` + leaks.map((l) => `    ${l.kind} <${l.where}> ${JSON.stringify(l.text)}`).join("\n"));
  check(`bn ${width}: "${screen}" shows no English interface text`, leaks.length === 0, JSON.stringify(leaks.slice(0, 8).map((l) => `${l.kind}:${l.text}`)));
  if (SHOTS && width === 390) {
    fs.mkdirSync(SHOTS, { recursive: true });
    await P.screenshot({ path: `${SHOTS}/${screen.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png` });
  }
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const settle = (P, ms = 500) => P.waitForTimeout(ms);
const quiet = (errors) => errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
async function mk(width, extra = {}) {
  const ctx = await newContext(browser, { appLang: "bn", banner: false, viewport: { width, height: 860 }, ...extra });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    await ctx.route("**/app/js/i18n/bn.js*", async (r) => {
      const src = fs.readFileSync("app/js/i18n/bn.js", "utf8");
      const key = JSON.stringify(MUTATE);
      if (!src.includes(key + ":")) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(key + ":").join(JSON.stringify("\u0000" + MUTATE) + ":") });
    });
  }
  return ctx;
}

// Plain pages: opened, settled, swept. Monitor also gets a week and a month view.
const PAGES = [
  ["Landing page", "index.html"],
["Asma Study", "asma-study.html"],
  ["People", "people.html"], ["Records", "records.html"], ["Monitor", "monitor.html"], ["Homework", "homework.html"],
  ["Catalogue", "catalogue.html"], ["Curriculum", "curriculum.html"], ["Classes", "classes.html"],
  ["Course offers", "course-offers.html"], ["Taglines", "taglines.html"],
  ["About", "about.html"], ["Backup", "backup.html"], ["Onboarding", "onboarding.html"],
  ["Accept invite (invalid link)", "accept-invite.html?token=not-a-real-link"],
];

// Study modules: the stub holds topics only for Deen, so seed a root, a leaf with no resource and a leaf with a resource
// (the stub's r1) for each other module. Both renderers (topic and routine) are then opened one level down.
const MODULES = [
  ["Arabic Study", "arabic-study.html", "arabic", "arabic_language"], ["General Study", "general-study.html", "general", "general_study"],
  ["Nature-Life Study", "naturelife-study.html", "naturelife", "nature_life"], ["Life Skill", "life-skill.html", "lifeskill", "life_skill"],
  ["Health Study (routines)", "health-study.html", "health", "health"], ["LDOG Study (routines)", "ldog-study.html", "ldog", "ldog"],
  ["Deen Study", "deen-study.html", "deen", "deen_study"],
];
const seedModules = `(function () {
  var T = TENANT_ID;
  ${JSON.stringify(MODULES.filter((m) => m[2] !== "deen").map((m) => [m[2], m[3]]))}.forEach(function (m) {
    var mod = m[0], root = m[1];
    DATA.subjects.push({ _id: T + "__" + root, tenantId: T, subjectId: root, parentId: null, name: { en: "Seeded Root" }, moduleIds: [mod], ancestorIds: [], status: "active", order: 1 });
  });
  ${JSON.stringify(MODULES.map((m) => [m[2], m[3]]))}.forEach(function (m) {
    var mod = m[0], root = m[1];
    DATA.subjects.push({ _id: T + "__" + root + "_a", tenantId: T, subjectId: root + "_a", parentId: root, name: { en: "Seeded topic" }, moduleIds: [mod], ancestorIds: [root], status: "active", order: 11, isTrackable: true });
    DATA.subjects.push({ _id: T + "__" + root + "_b", tenantId: T, subjectId: root + "_b", parentId: root, name: { en: "Seeded topic with a resource" }, moduleIds: [mod], ancestorIds: [root], status: "active", order: 12, isTrackable: true, resourceIds: ["r1"] });
  });
})();`;

for (const width of [390, 1280]) {
  if (ONLY && String(width) !== ONLY) continue;
  for (const [name, path] of [...MODULES.map((m) => [m[0], m[1]]), ...PAGES]) {
    const mod = MODULES.find((m) => m[1] === path);
    const ctx = await mk(width, mod ? { extraSeedJs: seedModules } : {});
    const { page: P, errors } = await openPage(ctx, "/app/" + path);
    await settle(P, 1000);
    await sweep(P, name, width);
    if (mod) {
      // Open one topic (or routine) of each kind: without and with a resource.
      for (const [suffix, label] of [["_a", "no resource"], ["_b", "with a resource"]]) {
        const row = P.locator(`.topic-row[data-id="${mod[3]}${suffix}"]`);
        const n = await row.count();
        check(`bn ${width}: "${name}" lists the seeded topic (${label})`, n === 1, `rows: ${n}`);
        if (n === 1) {
          await row.click(); await settle(P, 800);
          await sweep(P, `${name}, topic open (${label})`, width);
          const back = P.locator(".topic-crumb-btn").first();
          if (await back.count()) { await back.click(); await settle(P, 400); }
        }
      }
    }
    if (path === "monitor.html") {
      await P.click("#monthTabBtn"); await settle(P, 800);
      await sweep(P, "Monitor, month view", width);
    }
    check(`bn ${width}: "${name}" raised no page errors`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
    await ctx.close();
  }
}

await browser.close();
if (LIST) console.log("\nALL LEAKS:\n" + JSON.stringify([...new Set(allLeaks.map((l) => l.text))], null, 1));
console.log(`\n==== Bangla sweep, other pages: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
