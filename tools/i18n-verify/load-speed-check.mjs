// Speed check per page (PCF MSA J29, audit part 22): a page's "ready" may not be more than 20% slower than the number
// recorded after the speed fixes (docs/reports/2026-10-16-load-speed-after.json). Each cell is the MEDIAN of 3 runs, on
// the slowed phone connection load-speed.mjs describes, first visit and second (cache warm) visit, at 390px.
// A +60 ms floor sits under the 20% because a warm page that is ready in 64 ms would otherwise fail on 13 ms of noise.
//
//   node tools/i18n-verify/load-speed-check.mjs [--pages=a,b] [--mutate=noasync]
// --mutate=noasync serves hadith-collections without its async corpus script: the check must then FAIL.
// Run from the repository root.
import fs from "node:fs";
import { chromium } from "./harness.mjs";
import { PAGES, startPagesServer, measureMedian, htmlMutation } from "./load-speed.mjs";

const recorded = JSON.parse(fs.readFileSync("docs/reports/2026-10-16-load-speed-after.json", "utf8")).rows;
const only = (process.argv.find((a) => a.startsWith("--pages=")) || "").slice(8).split(",").filter(Boolean);
const mutateName = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { if (ok) pass++; else { fail++; console.log(`  FAIL  ${name} ${detail}`); } };

const { server, base } = await startPagesServer({ transformHtml: htmlMutation(mutateName) });
const browser = await chromium.launch();
for (const def of PAGES.filter((p) => !only.length || only.includes(p.key))) {
  const m = await measureMedian(browser, base, def, 390, 3);
  for (const visit of ["first", "second"]) {
    const rec = recorded.find((r) => r.page === def.key && r.width === 390 && r.visit === visit);
    check(`positive control: a recorded number exists for ${def.key} ${visit}`, !!rec && rec.readyMs > 0);
    const now = m[visit].readyMs;
    check(`${def.key} ${visit} visit is ready (the page's main content drew)`, now !== null);
    if (rec && now !== null) {
      const limit = Math.max(rec.readyMs * 1.2, rec.readyMs + 60);
      check(`${def.key} ${visit} visit ready ${now} ms is within 20% of the recorded ${rec.readyMs} ms`, now <= limit, `(limit ${Math.round(limit)} ms)`);
    }
  }
}
await browser.close(); server.close();
console.log(`\n==== Load speed${mutateName ? ` [mutated: ${mutateName}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
