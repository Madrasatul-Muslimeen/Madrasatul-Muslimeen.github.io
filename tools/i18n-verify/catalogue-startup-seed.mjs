// Speed part 6a (issue #285), Architect review: catalogue.html no longer runs
// its seeding routine on every open -- only when what it has just read shows
// something missing. This pins that the three cases still behave:
//   - a brand-new tenant is fully seeded;
//   - a platform module added to MODULE_TEMPLATES later is still created, even
//     when no subject or Approach is missing (the review caught the first
//     version checking subjects/Approaches only);
//   - a fully seeded tenant is not written to at all on open.
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, openPage } from "./harness.mjs";
import { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } from "../../app/js/catalogue-data.js";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? "\n        " + detail : ""}`); }
};
const SEEDED = { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES };
const WRITE = /set|update|create|commit/i;

async function open(opts) {
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 844 }, ...opts });
  const { page, errors } = await openPage(ctx, "/app/catalogue.html");
  await page.waitForFunction(() => /set up/.test(document.getElementById("seedStatus")?.textContent || ""), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);
  const r = await page.evaluate((w) => ({
    writes: (window.__fsLog || []).filter((x) => new RegExp(w, "i").test(x.kind)).map((x) => `${x.col}/${x.id}`),
    status: document.getElementById("seedStatus")?.textContent || "",
  }), WRITE.source);
  await ctx.close();
  return { ...r, errors: errors.filter((e) => !/ERR_(CERT|TUNNEL)/.test(e)) };
}

const browser = await chromium.launch();
{
  const r = await open({ emptyTenant: true });
  check("a brand-new tenant is seeded (subjects, Approaches and modules written)",
    r.writes.some((w) => w.startsWith("modules/")) && /Catalogue set up/.test(r.status), JSON.stringify(r).slice(0, 300));
}
{
  const gone = MODULE_TEMPLATES[MODULE_TEMPLATES.length - 1].id;
  const r = await open({ seedTemplates: SEEDED, extraSeedJs: `\nDATA.modules = DATA.modules.filter((m) => m._id !== ${JSON.stringify(gone)});\n` });
  check(`a platform module missing from an otherwise seeded tenant ("${gone}") is created on open`,
    r.writes.includes(`modules/${gone}`), JSON.stringify(r.writes));
}
{
  const r = await open({ seedTemplates: SEEDED });
  check("a fully seeded tenant is not written to on open", r.writes.length === 0, JSON.stringify(r.writes));
  check("and it says so", /already set up/.test(r.status), r.status);
  check("no page errors", r.errors.length === 0, JSON.stringify(r.errors));
}
await browser.close();
console.log(`\n==== Catalogue startup seeding: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
