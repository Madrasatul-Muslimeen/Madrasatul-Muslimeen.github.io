// hadith-subject-names: which name a reader sees for a Subject after the madrasah edits it (PCF MSA J106 S3, 107L review of #1720).
// A shipped Subject renamed in ONE language keeps its shipped wording in the OTHER language: the editor opens the Bangla box
// empty for a shipped Subject, so an English-only rename must not put English in front of every Bangla reader. A Subject the
// madrasah made itself has no shipped wording, so its one name stands in for the other language.
// Run from the repository root: node tools/i18n-verify/hadith-subject-names.mjs   (--prove runs the mutation)
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const SRC = "app/js/hadith-subject-meta.js";
const ANCHOR = '  if (!subject.custom) return (lang === "bn" ? n.bn : n.en) || null;\n';
if (process.argv.includes("--prove")) {
  const s = fs.readFileSync(SRC, "utf8"); const n = s.split(ANCHOR).length - 1;
  if (n !== 1) { console.log(`  FAIL  mutation anchor occurs ${n} times`); process.exit(1); }
  const tmp = "app/js/_mut-hadith-subject-meta.js"; fs.writeFileSync(tmp, s.replace(ANCHOR, ""));
  const r = spawnSync(process.execPath, [process.argv[1]], { encoding: "utf8", env: { ...process.env, SUBJECT_META_SRC: tmp } });
  fs.unlinkSync(tmp);
  const ff = (r.stdout || "").split("\n").find((l) => l.startsWith("  FAIL  "));
  console.log(r.status !== 0 && ff ? `  CAUGHT  cross-language fallback for shipped Subjects: ${ff.trim()}` : "  MISSED  the mutation stayed green");
  process.exit(r.status !== 0 && ff ? 0 : 1);
}
const mod = await import(new URL(`../../${process.env.SUBJECT_META_SRC || SRC}`, import.meta.url));
let pass = 0, fail = 0;
const check = (name, ok, d = "") => { if (typeof ok?.then === "function") throw new Error("promise"); ok ? (pass++, console.log(`  PASS  ${name}`)) : (fail++, console.log(`  FAIL  ${name} ${d}`)); };
const shipped = (o) => ({ id: "akhlaq", name: "Learning Akhlaq", custom: false, nameOverride: o });
const made = (o) => ({ id: "s-abcd1234", name: o.en || o.bn, custom: true, nameOverride: o });
const on = mod.overrideName;
check("shipped, renamed in English only: English readers see the new name", on(shipped({ en: "Good Character", bn: "" }), "en") === "Good Character");
check("shipped, renamed in English only: Bangla readers keep the shipped Bangla (null = use the shipped text)", on(shipped({ en: "Good Character", bn: "" }), "bn") === null, String(on(shipped({ en: "Good Character", bn: "" }), "bn")));
check("shipped, renamed in Bangla only: English readers keep the shipped English", on(shipped({ en: "", bn: "ভালো চরিত্র" }), "en") === null);
check("shipped, renamed in both: each language sees its own", on(shipped({ en: "A", bn: "আ" }), "en") === "A" && on(shipped({ en: "A", bn: "আ" }), "bn") === "আ");
check("shipped, never renamed: null in both", on(shipped(null), "en") === null && on(shipped(null), "bn") === null);
check("made by the madrasah, English only: Bangla readers see the English (there is no shipped Bangla)", on(made({ en: "Manners", bn: "" }), "bn") === "Manners");
check("made by the madrasah, Bangla only: English readers see the Bangla", on(made({ en: "", bn: "আদব" }), "en") === "আদব");
console.log(`\n==== hadith-subject-names: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
