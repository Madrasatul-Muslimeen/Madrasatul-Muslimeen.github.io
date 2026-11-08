// PCF MSA J115 round 2 -- app/js/era-view.js and app/data/era-speakers.json. Run from the repository root:
//   node tools/i18n-verify/era-view.mjs   (no server)     --prove: every broken copy must go red.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SRC = "app/js/era-view.js";
const MUTATIONS = {
  "people are not sorted by death year": ["(list ?? []).map(person).sort((a, b) => a.d - b.d)", "(list ?? []).map(person)"],
  "the era Approach is not looked up": ["findEraApproach(rows, e).live[0] ?? null", "null"],
  "a removed Approach counts as live": ["findEraApproach(rows, e).live[0]", "findEraApproach(rows, e).removed[0]"],
  "an unknown āyah is not refused": ["if (!entry || !entry.eras) return { ok: false, reason: \"no-reports\" };", ""],
  "quotes are not joined to their source": ["quote: entry.quotes?.[s.quote] ?? \"\"", "quote: \"\""],
  "the 'after' people are dropped": ["after: byDeath(raw.after),", "after: [],"],
};
const row = (id, en, extra = {}) => ({ id, name: { en }, status: "active", ...extra });

async function run(file) {
  let pass = 0, fail = 0;
  const check = (name, ok, detail = "") => { if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`); if (ok) pass++; else { fail++; console.log(`  FAIL  ${name} ${detail}`); } };
  const m = await import(pathToFileURL(file).href + "?" + Math.random());
  const data = JSON.parse(fs.readFileSync("app/data/era-speakers.json", "utf8"));
  const rows = [row("approach_28", "Ṣaḥābah"), row("approach_31", "Tābiʿūn"), row("approach_30", "Tābiʿ al-Tābiʿīn", { status: "archived" })];
  check("ayahRef", m.ayahRef(2, 228) === "2:228" && m.ayahRef("2", "228") === "2:228" && m.ayahRef(0, 1) === null && m.ayahRef("x", 1) === null);
  const v = m.buildEraView(data, rows, "2:228");
  check("2:228 builds", v.ok === true && v.eras.length === 3 && v.views.length === 2, JSON.stringify(v).slice(0, 120));
  const sah = v.eras?.find((e) => e.era === "sahabah"), tab = v.eras?.find((e) => e.era === "tabiun"), att = v.eras?.find((e) => e.era === "tabi-tabiin");
  check("Ṣaḥābah: 4 ṭuhr, 12 ḥayḍ (as the approved demo)", sah?.columns.tuhr.length === 4 && sah?.columns.hayd.length === 12);
  check("Tābiʿūn: 10 ṭuhr, 18 ḥayḍ", tab?.columns.tuhr.length === 10 && tab?.columns.hayd.length === 18);
  check("Tābiʿ al-Tābiʿīn: 2 ṭuhr, 6 ḥayḍ, 3 after the line", att?.columns.tuhr.length === 2 && att?.columns.hayd.length === 6 && att?.after.length === 3);
  check("every column is in death-year order", v.eras.every((e) => Object.values(e.columns).concat([e.after]).every((c) => c.every((p, i) => i === 0 || c[i - 1].d <= p.d))));
  check("the live Approach row is found by name, no id written", sah?.approach?.id === "approach_28" && tab?.approach?.id === "approach_31");
  check("a REMOVED Tābiʿ al-Tābiʿīn Approach is not offered as the live one, and the era still shows", att?.approach === null && att?.approachFound === false && att.columns.tuhr.length === 2);
  check("with no Approach rows every era still shows, none found", m.buildEraView(data, [], "2:228").eras.every((e) => e.approachFound === false && e.columns.tuhr.length > 0));
  check("each source row carries its verbatim passage", v.eras.every((e) => e.src.length > 0 && e.src.every((s) => s.quote.length > 40 && /[؀-ۿ]/.test(s.quote))));
  check("the windows are the Owner's 100 / 180 / 220", sah?.window === 100 && tab?.window === 180 && att?.window === 220);
  check("an āyah with no early reports says so", m.buildEraView(data, rows, "1:1").ok === false && m.buildEraView(data, rows, "1:1").reason === "no-reports");
  check("no data, null and junk are survived", [null, undefined, 3, {}, { ayat: null }].every((d) => m.buildEraView(d, rows, "2:228").ok === false) && m.buildEraView(data, null, "2:228").ok === true && m.buildEraView(data, rows, null).ok === false);
  check("every era name in the data is one the module knows", Object.keys(data.ayat["2:228"].eras).every((e) => m.ERAS.includes(e)));
  check("every source's quote key exists", Object.values(data.ayat["2:228"].eras).every((e) => e.src.every((s) => s.quote in data.ayat["2:228"].quotes)));
  check("the data says it is a draft", data.checked === false && v.checked === false);
  check("no Approach id is written in the module", !/approach_\d/.test(fs.readFileSync(SRC, "utf8").replace(/\/\/.*$/gm, "")));
  console.log(`${path.basename(file)}: ${pass} passed, ${fail} failed`);
  return fail;
}

if (process.argv.includes("--prove")) {
  const src = fs.readFileSync(SRC, "utf8");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "era-view-"));
  let unproven = 0;
  for (const [name, [old, rep]] of Object.entries(MUTATIONS)) {
    const n = src.split(old).length - 1;
    if (n !== 1) { console.log(`UNPROVEN ${name}: the mutation text occurs ${n} times`); unproven++; continue; }
    fs.cpSync("app/js", path.join(dir, name.replace(/\W+/g, "_")), { recursive: true });
    const f = path.join(dir, name.replace(/\W+/g, "_"), "era-view.js");
    fs.writeFileSync(f, src.replace(old, rep));
    let red; try { red = (await run(f)) > 0; } catch (e) { red = true; }
    console.log(red ? `caught   ${name}` : `UNPROVEN ${name}`);
    if (!red) unproven++;
  }
  process.exit(unproven ? 1 : 0);
} else {
  process.exit((await run(path.resolve(SRC))) ? 1 : 0);
}
