// Audit part 3 (PCF J29 follow-on, #844): Asma ul Husna study, Records, Monitor, People, Classes, Homework,
// Curriculum, Catalogue (+ the Hadith page's nav). Measured on the rendered page, en/bn x 390 / 820 / 1440:
// every button / picker / field / checkbox label >= 40x40 (nav links and the language picker included),
// nothing scrolls sideways, no label is cut by an ellipsis, no page error.
// Mutations: --mutate=<name>, each restores one defect in app/css/admin-touch.css and must make this suite FAIL.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const CSS = "app/css/admin-touch.css";
const MUTATIONS = {
  "buttons": ["box-sizing: border-box; min-height: 40px; } /* audit3 buttons */", "box-sizing: border-box; min-height: 0; } /* audit3 buttons */"],
  "buttonwidth": ["button { min-width: 40px; } /* audit3 buttonwidth */", "button { min-width: 0; } /* audit3 buttonwidth */"],
  "fields": ["box-sizing: border-box; min-height: 40px; } /* audit3 fields */", "box-sizing: border-box; min-height: 0; } /* audit3 fields */"],
  "checks": ["gap: 0.4rem; min-height: 40px; } /* audit3 checks */", "gap: 0.4rem; min-height: 0; } /* audit3 checks */"],
  "nav": ["box-sizing: border-box; min-height: 40px; } /* audit3 nav */", "box-sizing: border-box; min-height: 0; } /* audit3 nav */"],
  "langpick": ["#navAppLangSelect { min-height: 40px; } /* audit3 nav */", "#navAppLangSelect { min-height: 0; } /* audit3 nav */"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

async function open(url, lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(CSS, "utf8");
    if (!body.includes(from)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    await ctx.route("**/css/admin-touch.css*", (r) => r.fulfill({ status: 200, contentType: "text/css", body: body.split(from).join(to) }));
  }
  const { page } = await openPage(ctx, url);
  await page.waitForTimeout(1200);
  return { ctx, page };
}
// Every visible control; a checkbox / radio is measured through its enclosing label.
const small = (page) => page.evaluate(() => {
  const all = [...document.querySelectorAll("button,select,input:not([type=hidden]),summary")]
    .map((e) => (e.matches("input[type=checkbox],input[type=radio]") ? e.closest("label") || e : e))
    .filter((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden"; });
  const bad = all.filter((e) => { const r = e.getBoundingClientRect(); return r.height < 39.5 || r.width < 39.5; })
    .map((e) => { const r = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""} ${Math.round(r.width)}x${Math.round(r.height)}`; });
  return { n: all.length, bad: [...new Set(bad)] };
});
const hygiene = async (tag, page) => {
  const h = await page.evaluate(() => ({
    ov: document.documentElement.scrollWidth - innerWidth,
    cut: [...document.querySelectorAll("button,select,label,summary")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).textOverflow === "ellipsis" && e.scrollWidth > e.clientWidth + 1; }).map((e) => (e.textContent || "").trim().slice(0, 20)),
  }));
  check(`${tag} nothing scrolls sideways (${h.ov})`, h.ov <= 0);
  check(`${tag} no ellipsis-cut label`, h.cut.length === 0, h.cut.join(", "));
};

const PAGES = ["asma-study", "records", "monitor", "people", "classes", "homework", "curriculum", "catalogue", "hadith-study"];
for (const lang of ["en", "bn"]) for (const width of [390, 820, 1440]) for (const p of PAGES) {
  const tag = `${lang} ${width}px ${p}`;
  const { ctx, page } = await open(`/app/${p}.html`, lang, width);
  try {
    check(`${tag}: POSITIVE CONTROL page is ${lang}`, (await page.evaluate(() => document.documentElement.lang === "bn")) === (lang === "bn"));
    check(`${tag}: POSITIVE CONTROL admin-touch applies`, await page.evaluate(() => document.body.classList.contains("admin-touch") && getComputedStyle(document.body).getPropertyValue("--x") !== "never"));
    const s = await small(page);
    check(`${tag}: ${s.n} controls found, each >= 40x40`, s.n > 3 && s.bad.length === 0, s.bad.join(", "));
    await hygiene(tag, page);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
