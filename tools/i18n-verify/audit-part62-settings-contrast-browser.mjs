// Audit part 62 (PCF MSA J29): the words-note on Classes / Course Offers for a reader who is not owner/prime.
//   note      as a pure teacher: one plain sentence where the create area would be, in the page's language
//   control   as the OWNER: the create area IS shown and the note is NOT (positive control)
//   enrol     the Course Offers "Enrol" button is deliberately left alone (Rules canEnrol), display only
// Mutations (--mutate=<name>) restore a plausible defect and must each fail the suite.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part62-settings-contrast-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang");
// [file, route glob, anchor (must occur exactly once), replacement, the page the mutation applies to]
const MUTATIONS = {
  // The note is never switched on for a non-admin on Classes.
  noclassnote: ["app/classes.html", "**/classes.html*", "document.getElementById(\"noAdminNote\").style.display = canAdmin ? \"none\" : \"\";", "document.getElementById(\"noAdminNote\").style.display = \"none\";", "/app/classes.html"],
  // The note is never switched on for a non-admin on Course Offers.
  nooffernote: ["app/course-offers.html", "**/course-offers.html*", "document.getElementById(\"noAdminNote\").style.display = canAdmin ? \"none\" : \"\";", "document.getElementById(\"noAdminNote\").style.display = \"none\";", "/app/course-offers.html"],
  // The note is shown to the owner as well.
  ownernote: ["app/classes.html", "**/classes.html*", "document.getElementById(\"noAdminNote\").style.display = canAdmin ? \"none\" : \"\";", "document.getElementById(\"noAdminNote\").style.display = \"\";", "/app/classes.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
const TEACHER = `
DATA.tenantMemberUids[0].personId = "t1"; DATA.tenantMemberUids[0].roles = ["teacher"];
DATA.tenantPeople.push({ _id: "t1", tenantId: TENANT_ID, personId: "t1", name: lang("Tariq", "তারিক"), roles: ["teacher"] });
`;

async function open(lang, width, pagePath, { seed = "" } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: seed || null });
  if (MUTATE && MUTATIONS[MUTATE][4] === pagePath) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, pagePath, fn, opts = {}) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, pagePath, opts), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.ctx, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/\[write failure\]|denied by the test|ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));

const WIDTHS = [320, 390, 820, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

for (const lang of LANGS) {
  const bn = lang === "bn";
  for (const width of WIDTHS) {
    for (const [name, pg] of [["classes", "/app/classes.html"], ["course-offers", "/app/course-offers.html"]]) {
      for (const who of ["teacher", "owner"]) {
        await flow(`note-${name}-${who}`, lang, width, pg, async (t, page, ctx, errors) => {
          await page.waitForSelector("#app", { state: "visible", timeout: 15000 });
          await settle(page, 1000);
          const f = await ev(page, () => {
            const vis = (id) => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== "none" && e.getClientRects().length > 0; };
            const n = document.getElementById("noAdminNote");
            const r = n ? n.getBoundingClientRect() : null;
            return { form: vis("createFieldset"), note: vis("noAdminNote"), text: n ? n.innerText.trim() : "", right: r ? Math.round(r.right) : 0, enrol: [...document.querySelectorAll("#app button")].some((b) => b.getClientRects().length && /enrolBtn/.test(b.className)) };
          });
          if (who === "owner") {
            check(`${t}: POSITIVE CONTROL the owner sees the create area`, f.form === true, JSON.stringify(f));
            check(`${t}: and the owner does NOT see the note`, f.note === false, JSON.stringify(f));
          } else {
            check(`${t}: the teacher sees the note and not the create area`, f.note === true && f.form === false, JSON.stringify(f));
            check(`${t}: the note is a plain sentence (${bn ? "Bangla" : "English"})`, f.text.length > 30 && (bn ? BN.test(f.text) : !BN.test(f.text)), f.text);
            check(`${t}: the note fits the screen`, f.right <= width, String(f.right));
          }
          check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
        }, { seed: who === "teacher" ? TEACHER : "" });
      }
    }
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
