// PCF MSA J50 (the Owner, 20 Oct 2026, screenshot of Know Your Status): "Enable every Approach to choose through a
// pull-down menu (so the user don't have to scroll to see all. and make the texts look bigger, elegant, eye-catching
// (in PC context). But yes, also keep option the current all list visible at a glance as well".
// Seeds 40 Approaches (the live tenant's count). Run from the repository root with serve.js on :8080.
// Every mutation (--mutate=NAME) must make the suite exit 1:
//   nopick     the pull-down is not drawn                       -> the pull-down checks fail
//   nohide     choosing one Approach still shows all 40          -> "only that Approach" fails
//   notsticky  the pull-down scrolls away with the list          -> "stays at the top while the list scrolls" fails
//   small      the PC text sizes are the old ones                -> the "bigger on a PC" checks fail
//   nowheel    a new computer's wheel opens at the old default   -> the "wheel opens large" check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const HTML = "app/quranrevival.html";
const MUT = {
  // Removes the pull-down itself (a `hidden` on the bar would prove nothing: its display:flex beats [hidden]).
  nopick: [['<select id="myStatusPickSelect" data-ms-pick>', '<select id="myStatusPickSelect" data-ms-pick-off hidden>']],
  nohide: [['li.hidden = !!myStatusPick && li.dataset.msRow !== myStatusPick;', "li.hidden = false;"]],
  notsticky: [[".ms-pick-bar { position: sticky; top: -0.8rem;", ".ms-pick-bar { position: static; top: -0.8rem;"]],
  small: [["    .my-status-row-name { font-size: 1.12rem; letter-spacing: 0.01em; }", "    .my-status-row-name { font-size: 0.9rem; }"],
    ["    .my-status-list.ms-one .my-status-row-name { font-size: 1.6rem; }", "    .my-status-list.ms-one .my-status-row-name { font-size: 1.3rem; }"]],
  nowheel: [["if (wheelBox && !keptWheel?.size && window.innerWidth >= 900) {", "if (false) {"]],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SEED = `
for (let i = 11; i <= 40; i++) DATA.trackables.push({ _id: TENANT_ID + "__extra" + i, tenantId: TENANT_ID, subjectId: "quran", order: 100 + i, status: "active",
  name: lang("Approach number " + i, "পদ্ধতি " + i), groupName: lang("More", "আরও"), guide: { what: lang("w", "w"), how: lang("h", "h"), measure: lang("m", "m") }, panels: ["text"] });`;
const ALL = { en: "All Approaches (the whole list)", bn: "সব পদ্ধতি (পুরো তালিকা)" };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function start(lang, width, height) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    let body = fs.readFileSync(HTML, "utf8");
    for (const [a, b] of MUT[MUTATE]) { if (!body.includes(a)) throw new Error(`mutation anchor missing: ${a.slice(0, 60)}`); body = body.split(a).join(b); }
    await ctx.route(`**/${HTML}*`, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(700);
  await page.click("#myStatusWideBtn");
  await page.waitForFunction(() => document.querySelectorAll("#myStatusBody [data-ms-row]").length >= 40, null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
  return { ctx, page, errors };
}
const state = (page) => page.evaluate(() => {
  const sel = document.querySelector("#myStatusBody [data-ms-pick]");
  const bar = document.querySelector("#myStatusBody [data-ms-pick-bar]");
  const rows = [...document.querySelectorAll("#myStatusBody [data-ms-row]")];
  const shown = rows.filter((li) => li.getBoundingClientRect().height > 0);
  const name = shown[0]?.querySelector(".my-status-row-name");
  const fig = shown[0]?.querySelector(".ms-tile-fig");
  const body = document.getElementById("myStatusBody").getBoundingClientRect();
  const br = bar?.getBoundingClientRect();
  return {
    options: sel ? sel.options.length : 0, first: sel?.options[0]?.textContent.trim() ?? null, value: sel?.value ?? null,
    selVisible: !!sel && sel.getBoundingClientRect().height >= 40, selInk: sel ? getComputedStyle(sel).color : null,
    heading: getComputedStyle(document.querySelector("#myStatusCard .my-status-row-name") ?? document.body).color,
    rows: rows.length, shown: shown.length, shownIds: shown.map((li) => li.dataset.msRow),
    nameSize: name ? parseFloat(getComputedStyle(name).fontSize) : 0, figSize: fig ? parseFloat(getComputedStyle(fig).fontSize) : 0,
    barTop: br ? Math.round(br.top - body.top) : null, barIn: !!br && br.top >= body.top - 1 && br.bottom <= body.bottom + 1,
    over: document.documentElement.scrollWidth - innerWidth,
    wheel: Math.round(document.querySelector("#myStatusOverviewWheel svg")?.getBoundingClientRect().width ?? 0),
    card: (() => { const r = document.getElementById("myStatusCard").getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
  };
});

for (const [lang, width, height] of [["en", 1280, 800], ["en", 1600, 900], ["bn", 1280, 800], ["en", 390, 844], ["bn", 390, 844]]) {
  const tag = `${lang}/${width}`;
  const pc = width >= 900;
  console.log(`\n=== ${tag} ===`);
  const { ctx, page, errors } = await start(lang, width, height);
  const s0 = await state(page);
  check(`${tag}: a pull-down lists "${ALL[lang]}" first, then all 40 Approaches`, s0.options === 41 && s0.first === ALL[lang] && s0.value === "" && s0.selVisible, JSON.stringify(s0));
  check(`${tag}: by default the whole list is shown, all 40 rows (the list at a glance, as before)`, s0.rows === 40 && s0.shown === 40, JSON.stringify({ rows: s0.rows, shown: s0.shown }));
  if (pc) {
    check(`${tag}: on a PC the Approach names are bigger (1.12rem, 17.9px+) and their figures 1rem`, s0.nameSize >= 17.9 && s0.figSize >= 15.9, JSON.stringify({ name: s0.nameSize, fig: s0.figSize }));
    check(`${tag}: a new computer's wheel opens large: about two-thirds of the window's height (no size kept)`, s0.wheel >= s0.card.h * 0.55 && s0.wheel <= s0.card.w, JSON.stringify({ wheel: s0.wheel, card: s0.card }));
  }
  check(`${tag}: the pull-down's text is the card's heading colour (rendered)`, s0.selInk === s0.heading, JSON.stringify({ sel: s0.selInk, heading: s0.heading }));
  // Choose the 25th Approach: it is the only row shown, larger.
  const pick = await page.evaluate(() => document.querySelector("#myStatusBody [data-ms-pick]").options[25].value);
  await page.selectOption("#myStatusBody [data-ms-pick]", pick);
  await page.waitForTimeout(300);
  const s1 = await state(page);
  check(`${tag}: choosing one Approach shows only that Approach`, s1.shown === 1 && s1.shownIds[0] === pick && s1.value === pick, JSON.stringify({ shown: s1.shown, ids: s1.shownIds, pick }));
  check(`${tag}: ...larger (name ${pc ? "1.6rem, 25.5px+" : "1.3rem, 20.7px+"})`, s1.nameSize >= (pc ? 25.5 : 20.7), String(s1.nameSize));
  check(`${tag}: ...and the pull-down is in view at the top of the list`, s1.barIn, JSON.stringify({ barTop: s1.barTop }));
  // Back to all; scroll the list far down: the pull-down is still in view (sticky).
  await page.selectOption("#myStatusBody [data-ms-pick]", "");
  await page.waitForTimeout(200);
  await page.evaluate(() => { const b = document.getElementById("myStatusBody"); b.scrollTop = b.scrollHeight; });
  await page.waitForTimeout(250);
  const s2 = await state(page);
  check(`${tag}: "All Approaches" brings back all 40, and the pull-down stays at the top while the list scrolls`, s2.shown === 40 && s2.barIn && s2.barTop <= 20, JSON.stringify({ shown: s2.shown, barTop: s2.barTop }));
  // A row still opens its Approach card.
  await page.evaluate(() => document.querySelector("#myStatusBody [data-my-status-open]")?.click());
  await page.waitForFunction(() => !document.getElementById("myStatusDetailMount").hidden, null, { timeout: 5000 }).catch(() => {});
  check(`${tag}: a row still opens its Approach card`, await page.evaluate(() => !document.getElementById("myStatusDetailMount").hidden));
  check(`${tag}: no sideways scroll`, s2.over <= 0, String(s2.over));
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
console.log(`\n==== Know Your Status: Approach pull-down (J50)${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
