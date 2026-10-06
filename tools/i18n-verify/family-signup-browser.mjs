// The Owner, 5 Oct 2026: "When a user new sign in, he is asked to put family members with age, to attach with his
// account, right? If not, we have to make that rule and feature." Built to the demo
// (docs/reference/2026-10-05-family-members-signup-demo.html):
//   - "Create your account" for "My family" opens step 2, "Who is in your family?": a name and a YEAR OF BIRTH per
//     person (the age is worked out, never stored), "A child I look after" ticked by itself under 18;
//   - Save adds each one with the People page's own addPersonToTenant() as a Student, a child managed by the new owner;
//   - "My own learning" never shows the step; Skip is always there;
//   - the People page shows an Age column and takes a year of birth when adding or editing.
// What was WRITTEN is read from the stub's own batch data. en/bn at 390 and 1280. Run from the repository root.
//   --mutate=no-step     the step never opens                 -> the step checks fail
//   --mutate=no-year     the year of birth is not written     -> the birthYear checks fail
//   --mutate=no-manager  a child is not managed by the owner  -> the managed-by check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const SHOTS = (process.argv.find((a) => a.startsWith("--shots=")) || "").slice(8);
function swap(src, from, to) { if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 60)}`); return src.split(from).join(to); }
async function routeMutation(ctx) {
  if (!MUTATE) return;
  if (MUTATE === "no-step") {
    const body = swap(fs.readFileSync("app/onboarding.html", "utf8"), 'if (tenantType === "family") openFamilyStep({ tenantId, personId, uid });', "");
    await ctx.route("**/app/onboarding.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  } else if (MUTATE === "no-year") {
    const body = swap(fs.readFileSync("app/js/people.js", "utf8"), "            birthYear: validBirthYear(birthYear),\n", "");
    await ctx.route("**/js/people.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
  } else if (MUTATE === "no-manager") {
    const body = swap(fs.readFileSync("app/onboarding.html", "utf8"), "managedByPersonId: r.child ? familyCtx.personId : null,", "managedByPersonId: null,");
    await ctx.route("**/app/onboarding.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  } else throw new Error(`unknown mutation ${MUTATE}`);
}
const YEAR = new Date().getFullYear(); // the age is "this year minus the year of birth"; the test computes it itself
const T = {
  en: { heading: "Who is in your family?", added: "Added 2 to your family." },
  bn: { heading: "আপনার পরিবারে কারা আছেন?", added: "আপনার পরিবারে ২ জন যোগ হয়েছে।" },
};
const SEED = `window.__stubApplyBatches = true; window.__DATA = DATA; DATA.tenantPeople[1].birthYear = ${YEAR - 9};`;
const newPeople = (P) => P.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "tenantPeople").map((w) => ({ id: w.id, ...w.data })));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const lang of ["en", "bn"]) for (const width of [390, 1280]) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await routeMutation(ctx);
  const { page: P, errors } = await openPage(ctx, "/app/onboarding.html");
  await P.waitForSelector("#onboardForm", { state: "visible", timeout: 10000 });

  // "My own learning" never shows the step
  await P.fill("#name", "Solo Reader");
  await P.click("#createBtn");
  await P.waitForFunction(() => getComputedStyle(document.getElementById("result")).display !== "none", null, { timeout: 8000 }).catch(() => {});
  check(`${tag}: "My own learning": no family step`, await P.evaluate(() => document.getElementById("familyStep").hidden));

  // "My family"
  await P.check('input[name="tenantType"][value="family"]');
  await P.fill("#name", "Abu Maryam");
  await P.click("#createBtn");
  await P.waitForFunction(() => !document.getElementById("familyStep").hidden, null, { timeout: 8000 }).catch(() => {});
  const step = await P.evaluate(() => { const s = document.getElementById("familyStep"); const r = s.getBoundingClientRect(); return { shown: !s.hidden && r.height > 0, h: s.querySelector("h2")?.textContent.trim(), focus: document.activeElement?.id }; });
  check(`${tag}: "My family" opens step 2, "${T[lang].heading}"`, step.shown && step.h === T[lang].heading, JSON.stringify(step));
  check(`${tag}: ...with the cursor in the first name`, step.focus === "famName0", JSON.stringify(step));
  await P.fill("#famName0", "Maryam");
  await P.fill("#famYear0", String(YEAR - 11));
  const r0 = await P.evaluate(() => ({ age: document.querySelector('[data-fam-row="0"] [data-fam-age]').textContent, child: document.querySelector('[data-fam-row="0"] [data-fam-k="child"]').checked }));
  check(`${tag}: the age is worked out from the year (${lang === "bn" ? "১১" : "11"})`, r0.age === (lang === "bn" ? "১১" : "11"), JSON.stringify(r0));
  check(`${tag}: under 18 is ticked as a child I look after`, r0.child === true, JSON.stringify(r0));
  await P.click("#familyAdd");
  await P.fill("#famName1", "Umm Maryam");
  await P.fill("#famYear1", String(YEAR - 35));
  check(`${tag}: an adult is not ticked as a child`, !(await P.isChecked('[data-fam-row="1"] [data-fam-k="child"]')));
  await P.click("#familyAdd");
  await P.click('[data-fam-del="2"]');
  check(`${tag}: ✕ removes an empty row`, (await P.$$("[data-fam-row]")).length === 2);
  const layout = await P.evaluate(() => { const rows = [...document.querySelectorAll("[data-fam-row] input, [data-fam-row] button")]; return { small: rows.filter((e) => e.type !== "checkbox" && e.getBoundingClientRect().height < 39.5).length, sideways: document.documentElement.scrollWidth > innerWidth + 1 }; });
  check(`${tag}: every field and button is 40px; nothing scrolls sideways`, layout.small === 0 && !layout.sideways, JSON.stringify(layout));
  if (SHOTS) await P.screenshot({ path: `${SHOTS}/fam-${tag.replace("/", "-")}.png`, fullPage: true });
  const owner = await P.evaluate(() => document.querySelector("#result code:nth-of-type(2)")?.textContent);
  await P.evaluate(() => { window.__stubWriteData = []; });
  await P.click("#familySave");
  await P.waitForFunction(() => /\S/.test(document.getElementById("familyResult").textContent), null, { timeout: 8000 }).catch(() => {});
  const people = await newPeople(P);
  const mar = people.find((p) => JSON.stringify(p.name).includes("Maryam") && !JSON.stringify(p.name).includes("Umm"));
  const umm = people.find((p) => JSON.stringify(p.name).includes("Umm Maryam"));
  check(`${tag}: Save adds both people`, !!mar && !!umm, JSON.stringify(people));
  check(`${tag}: ...each with their year of birth (never an age)`, mar?.birthYear === YEAR - 11 && umm?.birthYear === YEAR - 35 && !("age" in (mar ?? {})), JSON.stringify([mar?.birthYear, umm?.birthYear]));
  check(`${tag}: the child is managed by the new owner; the adult by no one`, mar?.isMinor === true && mar?.managedByPersonId === owner && umm?.isMinor === false && umm?.managedByPersonId === null, JSON.stringify({ owner, mar: [mar?.isMinor, mar?.managedByPersonId], umm: [umm?.isMinor, umm?.managedByPersonId] }));
  const mem = await P.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "memberships").map((w) => w.data.role));
  check(`${tag}: each is a Student`, mem.filter((r) => r === "student").length === 2, JSON.stringify(mem));
  check(`${tag}: it says how many were added, with a way into the app`, (await P.textContent("#familyResult")).includes(T[lang].added) && !!(await P.$('#familyResult a[href="index.html"]')), await P.textContent("#familyResult"));

  // ---- the People page ----
  await P.goto(`${new URL(P.url()).origin}/app/people.html`);
  await P.waitForSelector("#rosterBody tr", { timeout: 10000 }).catch(() => {});
  const ages = await P.evaluate(() => [...document.querySelectorAll("#rosterBody tr")].map((tr) => tr.querySelector("[data-person-age]")?.textContent.trim()));
  check(`${tag}: People shows an Age column (Maryam, born ${YEAR - 9}: ${lang === "bn" ? "৯" : "9"}; unknown: —)`, ages.includes(lang === "bn" ? "৯" : "9") && ages.includes("—"), JSON.stringify(ages));
  await P.evaluate(() => { window.__stubWriteData = []; });
  if (await P.isVisible("#addPersonBox")) {
    await P.fill("#addPersonBox #name", "Zaid");
    await P.fill("#birthYear", String(YEAR - 6));
    await P.check('input[name="role"][value="student"]');
    await P.click("#addBtn");
    await P.waitForTimeout(500);
    const z = (await newPeople(P)).find((p) => JSON.stringify(p.name).includes("Zaid"));
    check(`${tag}: Add a person takes a year of birth`, z?.birthYear === YEAR - 6, JSON.stringify(z));
  } else check(`${tag}: (the owner sees Add a person)`, false);
  check(`${tag}: no sideways scroll`, await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
