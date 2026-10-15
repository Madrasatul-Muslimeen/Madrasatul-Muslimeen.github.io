// Audit part 5 (PCF J29 follow-on, #850): measured on the rendered page, en/bn x 390 / 820 / 1440.
//  - admin-touch pages (import-notes, dawah, course-offers, backup, taglines, onboarding): every button, picker and
//    text field is >= 40px tall, and the page does not scroll sideways.
//  - pick-touch pages (the seven study modules): the person picker is >= 40px tall.
// Mutations: --mutate=<name> restores one defect and must make this suite FAIL.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const CSS = "**/css/admin-touch.css*";
const MUTATIONS = {
  "picker": ["app/css/admin-touch.css", CSS, "body.pick-touch #personSelect { box-sizing: border-box; min-height: 40px; }", "body.pick-touch #personSelect { min-height: 0; }"],
  "buttons": ["app/css/admin-touch.css", CSS, "box-sizing: border-box; min-height: 40px; } /* audit3 buttons */", "box-sizing: border-box; min-height: 0; } /* audit3 buttons */"],
  "fields": ["app/css/admin-touch.css", CSS, "box-sizing: border-box; min-height: 40px; } /* audit3 fields */", "box-sizing: border-box; min-height: 0; } /* audit3 fields */"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

async function open(url, lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 800 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
    if (!body.includes(from)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: "text/css", body: body.split(from).join(to) }));
  }
  const { page } = await openPage(ctx, url);
  await page.waitForTimeout(1000);
  return { ctx, page };
}

async function touchFlow(tag, page, sel) {
  const r = await page.evaluate((sel) => {
    const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
    const all = [...document.querySelectorAll(sel)].filter(vis).filter((e) => !e.closest("#zabBar,#zabCorner"));
    const bad = all.filter((e) => e.getBoundingClientRect().height < 39.5).map((e) => `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
    return { n: all.length, bad: [...new Set(bad)], sw: document.documentElement.scrollWidth - innerWidth, bodyClass: document.body.className };
  }, sel);
  check(`${tag}: POSITIVE CONTROL ${r.n} controls measured (${r.bodyClass})`, r.n > 0);
  check(`${tag}: each control >= 40px tall`, r.bad.length === 0, r.bad.slice(0, 6).join(", "));
  check(`${tag}: no sideways page scroll`, r.sw <= 0, `${r.sw}px`);
}

const ADMIN = ["import-notes", "dawah", "course-offers", "backup", "taglines", "onboarding"];
const STUDY = ["deen-study", "arabic-study", "general-study", "naturelife-study", "life-skill", "health-study", "ldog-study"];
const ADMIN_SEL = "button, select, input[type=text], input[type=number], input[type=date], input[type=email], input[type=url], input:not([type])";
const jobs = [...ADMIN.map((p) => [p, ADMIN_SEL]), ...STUDY.map((p) => [p, "#personSelect"])];
for (const lang of ["en", "bn"]) for (const width of [390, 820, 1440]) for (const [p, sel] of jobs) {
  const tag = `${lang} ${width}px ${p}`;
  let ctx;
  try {
    const o = await Promise.race([open(`/app/${p}.html`, lang, width), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([touchFlow(tag, o.page, sel), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 30000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await ctx.close().catch(() => {});
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
