// PCF MSA J115 -- app/js/era-approaches.js: finding the era Approaches by name, and planning the one-tap "add Tābiʿūn".
// Run from the repository root:  node tools/i18n-verify/era-approaches.mjs   (no server)   --prove: 7 broken copies must all go red.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SRC = "app/js/era-approaches.js";
const MUTATIONS = {
  "Tābiʿ al-Tābiʿīn is read as Tābiʿūn": ["if (tabiCount >= 2) return ERA_TABI_TABIIN;", ""],
  "a removed Tābiʿūn does not stop a second one": ["if (tabiun.removed.length) return { ok: false, reason: \"exists-removed\", row: tabiun.removed[0] };", ""],
  "a live Tābiʿūn does not stop a second one": ["if (tabiun.live.length) return { ok: false, reason: \"exists-live\", row: tabiun.live[0] };", ""],
  "a removed Ṣaḥābah row counts as live": ["(isRemoved(row) ? removed : live).push(row);", "live.push(row);"],
  "the new Approach is placed at the end": ["ids.splice(at < 0 ? ids.length : at + 1, 0, id);", "ids.push(id);"],
  "a run-together spelling is read as Tābiʿūn": ["arTabi.length + (twice ? 1 : 0);", "arTabi.length;"],
  "Arabic is not read": ["const arTabi = tk.filter((t) => /^(تابع|التابع|تابعو|تابعي)/.test(t));", "const arTabi = [];"],
};
const nextId = (rows) => { let m = 0; for (const r of rows) { const x = /^approach_(\d+)$/.exec(r.id); if (x) m = Math.max(m, +x[1]); } return `approach_${String(m + 1).padStart(2, "0")}`; };
const row = (id, en, extra = {}) => ({ id, name: { en }, status: "active", group: 7, order: +id.slice(9), ...extra });

async function run(file) {
  let pass = 0, fail = 0;
  const check = (name, ok, detail = "") => { if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`); if (ok) pass++; else { fail++; console.log(`  FAIL  ${name} ${detail}`); } };
  const m = await import(pathToFileURL(file).href + "?" + Math.random());
  const era = m.eraOfName;
  check("exports present", ["eraOfName", "findEraApproach", "planAddTabiun"].every((k) => typeof m[k] === "function"));
  // names -> era, positive and negative
  for (const n of ["Ṣaḥābah", "Sahaba", "28 Sahaba", "Companions (Ṣaḥābah)", "الصحابة", "সাহাবা"]) check(`"${n}" is Ṣaḥābah`, era(n) === "sahabah", era(n));
  for (const n of ["Tābiʿūn", "Tabi'un", "29 Tābiʿīn", "Tabeyeen", "التابعون", "তাবেয়ী", "তাবিঈন", "তাবেঈ", "তাবিঈ", "তাবেয়ীন", "তাবেঈন", "২৯ তাবেয়ী"]) check(`"${n}" is Tābiʿūn`, era(n) === "tabiun", era(n));
  for (const n of ["Tābiʿ al-Tābiʿīn", "29 Tābiʿ al-Tābiʿīn", "Tabe Tabeen", "تابع التابعين", "তাবে তাবেয়ী", "তাবে-তাবেয়ী", "তাবে তাবেঈন", "তাবেতাবেয়ী", "তাবি তাবিঈ", "tabitabiin"]) check(`"${n}" is Tābiʿ al-Tābiʿīn`, era(n) === "tabi-tabiin", era(n));
  for (const n of ["Da'wah", "Teaching Others", "30 Gen1", "Living by it", "Reading", "", null, undefined, 7]) check(`"${n}" is no era`, era(n) === null, era(n));
  for (const n of ["তাবে তাবেয়ী", "তাবে-তাবেয়ী", "তাবেতাবেয়ী"]) check(`"${n}" is never Tābiʿūn`, era(n) !== "tabiun", era(n));
  // finding
  const base = [row("approach_27", "Living by it"), row("approach_28", "Ṣaḥābah"), row("approach_29", "Tābiʿ al-Tābiʿīn"), row("approach_31", "Da'wah"), row("approach_30", "Old", { status: "archived", name: { en: "Tābiʿ al-Tābiʿīn (old)" } })];
  const f = m.findEraApproach(base, "tabi-tabiin");
  check("both Tābiʿ al-Tābiʿīn rows are found, live and removed apart", f.live.length === 1 && f.removed.length === 1 && f.live[0].id === "approach_29" && f.removed[0].id === "approach_30");
  check("Tābiʿūn is NOT found among rows that hold only Tābiʿ al-Tābiʿīn", m.findEraApproach(base, "tabiun").live.length === 0 && m.findEraApproach(base, "tabiun").removed.length === 0);
  check("a short name is read too", m.findEraApproach([{ id: "approach_40", status: "active", name: { en: "Early scholars" }, shortName: { en: "Tābiʿūn" } }], "tabiun").live.length === 1);
  check("a Bangla-only name is found", m.findEraApproach([{ id: "approach_41", status: "active", name: { bn: "সাহাবা" } }], "sahabah").live.length === 1);
  check("junk rows are survived", m.findEraApproach([null, undefined, {}, { name: 3 }], "sahabah").live.length === 0);
  // planning
  const display = ["approach_27", "approach_28", "approach_29", "approach_31"];
  const rows = base.filter((r) => r.status !== "archived");
  const p = m.planAddTabiun(rows, { displayIds: display, nextId });
  check("it plans: next id after the highest, the Ṣaḥābah section, straight after Ṣaḥābah", p.ok && p.id === "approach_32" && p.group === 7 && p.after === "approach_28" && p.ids.join() === "approach_27,approach_28,approach_32,approach_29,approach_31", JSON.stringify(p));
  const withRemoved = m.planAddTabiun(rows.concat([row("approach_40", "Tābiʿūn (old)", { status: "archived" })]), { displayIds: display, nextId });
  check("the id rule counts a removed Approach (never reused)", m.planAddTabiun(rows.concat([row("approach_40", "Old", { status: "archived" })]), { displayIds: display, nextId }).id === "approach_41");
  check("it refuses when a REMOVED Tābiʿūn exists", !withRemoved.ok && withRemoved.reason === "exists-removed");
  const withLive = m.planAddTabiun(rows.concat([row("approach_40", "Tābiʿūn")]), { displayIds: display, nextId });
  check("it refuses when a LIVE Tābiʿūn exists", !withLive.ok && withLive.reason === "exists-live");
  check("it refuses when there is no live Ṣaḥābah Approach to sit after", m.planAddTabiun([row("approach_27", "Living by it")], { displayIds: ["approach_27"], nextId }).reason === "no-sahabah");
  check("a removed Ṣaḥābah is not a place to sit after", m.planAddTabiun([row("approach_28", "Ṣaḥābah", { status: "archived" })], { displayIds: [], nextId }).reason === "no-sahabah");
  let threw = false; try { m.planAddTabiun(rows, { displayIds: display }); } catch { threw = true; }
  check("it will not run without the Add Approach id rule", threw);
  check("no id is hardcoded in the module", !/approach_\d+/.test(fs.readFileSync(file, "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")));
  return { pass, fail };
}

if (process.argv.includes("--prove")) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "era-"));
  const orig = fs.readFileSync(SRC, "utf8");
  let unproven = 0;
  for (const [name, [from, to]] of Object.entries(MUTATIONS)) {
    const n = orig.split(from).length - 1;
    if (n !== 1) { console.log(`UNPROVEN ${name}: the mutation text occurs ${n} times`); unproven++; continue; }
    const f = path.join(dir, "era-approaches.js");
    fs.writeFileSync(f, orig.replace(from, to));
    let red; try { red = (await run(f)).fail > 0; } catch { red = true; }
    console.log(`${red ? "RED (good)" : "STILL GREEN"}  ${name}`);
    if (!red) unproven++;
  }
  process.exit(unproven ? 1 : 0);
}
const { pass, fail } = await run(SRC);
console.log(`era-approaches: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
