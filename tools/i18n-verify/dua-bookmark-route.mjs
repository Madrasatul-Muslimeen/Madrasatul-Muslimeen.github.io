// v12.128 (Dua round R4, D06; the Architect's shared part): a Dua bookmark -- a Hadith-module bookmark at position
// "dua:<n>" -- opens the Dua page at that Dua, from the Bookmark menu (bookmark-nav.js) and the Bookmarks page
// (bookmarks.html); every other bookmark still opens its module's own page.
//   node tools/i18n-verify/dua-bookmark-route.mjs [--mutate=off]    (from the repository root; no browser)
//   --mutate=off  resumePageFor ignores the Dua case: the Dua checks must FAIL.
import { readFileSync } from "node:fs";
import { resumePageFor as real, MODULE_PAGES } from "../../app/js/continue-strip.js";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const resumePageFor = MUTATE === "off" ? (m) => MODULE_PAGES[m] : real;
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}

check("a Dua bookmark (hadith, dua:12) opens the Dua page", resumePageFor("hadith", "dua:12") === "dua-study.html", resumePageFor("hadith", "dua:12"));
check("a Dua bookmark (hadith, dua:3126) opens the Dua page", resumePageFor("hadith", "dua:3126") === "dua-study.html");
// Positive controls: everything else is unchanged, so the checks above cannot pass by sending everything to one page.
check("a Hadith narration bookmark still opens Hadith Study", resumePageFor("hadith", "hadeethenc:123") === "hadith-study.html");
check("a malformed dua position still opens Hadith Study", resumePageFor("hadith", "dua:12x") === "hadith-study.html");
check("a Deen Study bookmark still opens Deen Study", resumePageFor("deen", "dua:12") === "deen-study.html");
check("a module with no page still has no page", resumePageFor("nosuch", "dua:1") === undefined);
// Wiring: both places that build a bookmark's link use it (strip comments first).
const code = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
for (const f of ["app/js/bookmark-nav.js", "app/bookmarks.html"]) {
  const src = code(f);
  check(`${f}: bookmarkHref asks resumePageFor`, /function bookmarkHref\([^)]*\)\s*\{\s*const page = resumePageFor\(b\.moduleId, b\.position\);/.test(src));
}
console.log(`\n==== Dua bookmark route${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
