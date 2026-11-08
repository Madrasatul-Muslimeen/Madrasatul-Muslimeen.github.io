// PCF MSA J115 round 2 -- app/js/era-view.js and app/data/era-speakers.json. Run from the repository root:
//   node tools/i18n-verify/era-view.mjs   (no server)     --prove: every broken copy must go red.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SRC = "app/js/era-view.js";
const MUTATIONS = {
  "people are not sorted by death year": ["(list ?? []).map(person(ids)).sort((a, b) => a.d - b.d)", "(list ?? []).map(person(ids))"],
  "the era Approach is not looked up": ["findEraApproach(rows, e).live[0] ?? null", "null"],
  "a removed Approach counts as live": ["findEraApproach(rows, e).live[0]", "findEraApproach(rows, e).removed[0]"],
  "an unknown āyah is not refused": ["if (!entry || !entry.eras) return { ok: false, reason: \"no-reports\" };", ""],
  "quotes are not joined to their source": ["quote: entry.quotes?.[s.quote] ?? \"\"", "quote: \"\""],
  "the 'after' people are dropped": ["after: byDeath(raw.after, data.scholarIds),", "after: [],"],
  "scholar ids are not attached": ["sid: ids?.[`${ar}|${d}`] ?? null", "sid: null"],
  "the 'after' people lose their scholar ids": ["after: byDeath(raw.after, data.scholarIds),", "after: byDeath(raw.after),"],
  "ids are matched by the name alone, not name and death year": ["ids?.[`${ar}|${d}`]", "Object.entries(ids ?? {}).find(([k]) => k.split(\"|\")[0] === ar)?.[1]"],
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
  // J115 follow-up: the Scholars-row links. Each id must be a REAL row of the database whose death year AH is the person's.
  const db = JSON.parse(fs.readFileSync("docs/reference/scholars-database/scholars-database-v1.6.json", "utf8")).rows;
  const deathAH = (r) => Number((String(r.lifeAH).match(/(\d+)\s*AH(?!.*\d+\s*AH)/) ?? [])[1]);
  const wanted = Object.entries(data.scholarIds ?? {});
  check("scholarIds: 5 entries, each a real database row with the same death year", wanted.length === 5 && wanted.every(([k, id]) => { const r = db.find((x) => x.id === id); return r && deathAH(r) === Number(k.split("|")[1]); }));
  const everyone = Object.values(v.eras).flatMap((e) => Object.values(e.columns).flat().concat(e.after));
  check("linked people carry their id (Abū Ḥanīfa s001, Mālik s002, al-Shāfiʿī s005, Isḥāq s006, Aḥmad s007)", ["s001", "s002", "s005", "s006", "s007"].every((id) => everyone.some((p) => p.sid === id)), JSON.stringify(everyone.filter((p) => p.sid).map((p) => p.sid)));
  check("nobody else is linked: Muqātil b. Ḥayyān (d. 150, same year as Abū Ḥanīfa) and the Ṣaḥābah have no id", everyone.filter((p) => p.sid).length === everyone.filter((p) => wanted.some(([k]) => k === `${p.ar}|${p.d}`)).length && everyone.find((p) => p.en.startsWith("Muqātil"))?.sid === null && sah.columns.tuhr.every((p) => p.sid === null));
  const twin = JSON.parse(JSON.stringify(data));
  for (const e of Object.values(twin.ayat["2:228"].eras)) for (const col of Object.values(e)) if (Array.isArray(col)) for (const p of col) if (p[0] === "مالك") p[2] = 180;
  check("same Arabic name but another death year is NOT linked (name alone is not enough)", m.buildEraView(twin, rows, "2:228").eras.flatMap((e) => Object.values(e.columns).flat().concat(e.after)).filter((p) => p.ar === "مالك").every((p) => p.sid === null));
  check("a file with no scholarIds still builds, nobody linked", m.buildEraView({ ...data, scholarIds: undefined }, rows, "2:228").eras.every((e) => Object.values(e.columns).flat().every((p) => p.sid === null)));
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
