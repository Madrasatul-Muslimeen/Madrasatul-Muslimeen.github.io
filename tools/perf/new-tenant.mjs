// Proof that seeding still works for a genuinely NEW tenant.
//
// The load-speed round took three seeding checks off every page's startup
// path. The whole risk of that change is a tenant that has never been set up
// landing on a study page and finding nothing there -- so this is not
// optional reassurance, it is the test that has to pass before the change
// can ship.
//
// It runs each study page against a tenant with NO catalogue at all (no
// subjects, no trackables, no modules, no subjectTemplates) and checks two
// things: that the page seeds, and that it then renders real content.
//
//   node tools/perf/new-tenant.mjs

import { chromium, newContext, BASE } from "../i18n-verify/harness.mjs";
import { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } from "../../app/js/catalogue-data.js";

const SEEDED = { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES };

const CASES = [
  { path: "/app/deen-study.html", name: "Deen Study", ready: "#listContainer" },
  { path: "/app/health-study.html", name: "Health", ready: "#listContainer" },
  { path: "/app/asma-study.html", name: "Asma ul Husna", ready: "#gridContainer" },
];

let pass = 0;
let fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? "  -- " + detail : ""}`); }
}

const EXE = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});

for (const c of CASES) {
  console.log(`\n=== ${c.name}, tenant never set up ===`);

  // emptyTenant wipes the catalogue AFTER the seed data is applied, so the
  // page starts from genuinely nothing -- the state a brand-new tenant is in.
  const ctx = await newContext(browser, { banner: false, emptyTenant: true, seedTemplates: SEEDED, viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(`${BASE}${c.path}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);

  const seeded = await p.evaluate(() => (window.__fsLog || []).filter((r) => r.kind === "batchCommit" || r.kind === "setDoc").length);
  const contentRows = await p.$eval(c.ready, (el) => el.children.length).catch(() => 0);
  const text = await p.$eval(c.ready, (el) => el.innerText.trim()).catch(() => "");

  check(`${c.name}: seeding actually wrote something`, seeded > 0, `writes seen: ${seeded}`);
  check(`${c.name}: content rendered after seeding`, contentRows > 0, `rows: ${contentRows}, text: ${text.slice(0, 60)}`);
  check(`${c.name}: no page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));

  await ctx.close();
}

// And the other half of the guarantee: a tenant already set up must NOT be
// written to at all on a normal page load. Seeding is additive-only (I4), but
// a needless write would still be a regression in its own right.
console.log(`\n=== Deen Study, tenant already set up ===`);
{
  const ctx = await newContext(browser, { banner: false, seedTemplates: SEEDED, viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/app/deen-study.html`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  const writes = await p.evaluate(() => (window.__fsLog || []).filter((r) => r.kind === "batchCommit" || r.kind === "setDoc" || r.kind === "updateDoc").length);
  check("a seeded tenant is not written to on load", writes === 0, `writes seen: ${writes}`);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
