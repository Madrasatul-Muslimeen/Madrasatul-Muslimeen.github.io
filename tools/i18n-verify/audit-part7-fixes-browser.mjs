// Audit part 7 (PCF J29 item 12, #856): the floating "← Back to Know Your Status" pill must keep the way back and
// cover no tab. Measured on the rendered Qur'an page after Know Your Status -> "See in Explore", en/bn x 390 / 820 / 1440:
//  - the pill is shown (POSITIVE CONTROL: it exists, and the Approach tab is on screen),
//  - the pill's box does not overlap the pinned #tabRow (any tab),
//  - elementFromPoint at the centre of #tabApproachBtn finds the tab (or a child), not the pill.
// Mutations: --mutate=<name> restores one defect and must make this suite FAIL.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
import { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } from "../../app/js/catalogue-data.js";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
async function flow(name, ms, fn) {
  let timer;
  try {
    await Promise.race([fn(), new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`timed out after ${ms}ms`)), ms); })]);
  } catch (err) { check(`${name}: flow completed`, false, String(err && err.message).split("\n")[0]); } finally { clearTimeout(timer); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUTATIONS = {
  "pill-over-tabs": ["app/js/bookmark-nav.js", "**/js/bookmark-nav.js*",
    "if (b.width > 0 && b.height > 0 && b.bottom > window.innerHeight * 0.5 && b.top < window.innerHeight) top = Math.min(top, b.top);",
    "/* mutated: the pill ignores the pinned tab row */"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const SEED_TEMPLATES = { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES };

async function open(lang, width) {
  const ctx = await newContext(browser, { banner: false, appLang: lang === "bn" ? "bn" : "en", viewport: { width, height: 844 }, seedTemplates: SEED_TEMPLATES });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
    if (!body.includes(from)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: body.split(from).join(to) }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => !!document.querySelector("#wheelContainer svg"), null, { timeout: 30000 });
  return { ctx, page };
}

for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1440]) {
    const tag = `[${lang} ${width}px]`;
    await flow(`${tag} back pill`, 90000, async () => {
      const { ctx, page } = await open(lang, width);
      await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((el) => el.remove()));
      await page.click("#myStatusWideBtn, #myStatusBtn >> visible=true", { timeout: 8000 });
      await page.waitForFunction(() => document.querySelectorAll(".my-status-row-btn").length > 0, null, { timeout: 15000 });
      await page.click(".my-status-row-btn", { timeout: 8000 });
      await page.waitForFunction(() => !document.getElementById("myStatusDetailMount").hidden, null, { timeout: 8000 });
      await page.evaluate(() => document.getElementById("myStatusSeeInExploreBtn").click());
      await page.waitForFunction(() => !!document.getElementById("kysBackRow"), null, { timeout: 8000 });
      await page.waitForTimeout(2000); // the pill re-lifts at 600ms and 1600ms
      const r = await page.evaluate(() => {
        const pill = document.getElementById("kysBackRow"), tabs = document.getElementById("tabRow"), a = document.getElementById("tabApproachBtn");
        const p = pill.getBoundingClientRect(), t = tabs.getBoundingClientRect(), ab = a.getBoundingClientRect();
        const hit = document.elementFromPoint(ab.left + ab.width / 2, ab.top + ab.height / 2);
        const shown = getComputedStyle(pill).display !== "none" && p.width > 0;
        return { shown, tabVisible: ab.width > 0 && ab.height > 0, overlap: p.left < t.right && p.right > t.left && p.top < t.bottom && p.bottom > t.top,
          hitOk: !!hit && (hit === a || a.contains(hit)), pill: [p.left, p.top, p.right, p.bottom].map(Math.round), tabs: [t.left, t.top, t.right, t.bottom].map(Math.round) };
      });
      check(`${tag} POSITIVE CONTROL: the Back pill is shown and the Approach tab is on screen`, r.shown && r.tabVisible, JSON.stringify(r));
      check(`${tag} the Back pill covers no tab (pill ${r.pill}, tabs ${r.tabs})`, !r.overlap);
      check(`${tag} the Approach tab can be pressed (elementFromPoint finds it)`, r.hitOk);
      await ctx.close();
    });
  }
}
await browser.close();
console.log(`\n==== audit part 7: ${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""} ====`);
process.exit(fail ? 1 : 0);
