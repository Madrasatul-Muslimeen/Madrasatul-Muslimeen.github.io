// PCF J25, Builder round Z2 (issue #823) -- the Zab bar and plain pockets, in a real browser.
//
// TWO HALVES, one suite.
//   GATE ON  -- zab-readiness.js is replaced by a copy that says ready (the ctx.route() seam;
//               production cannot reach it). The bar/button is on every listed page; the four
//               study pockets seed ONCE; add, rename, tick, reorder, move, Trash, restore and
//               Clear done are each proved from the stub's write log; Bangla shows the seeded
//               names; the panel fits its width; no sideways scroll; closing returns the reader.
//   GATE OFF -- the file as shipped: no Zab element on any page, and ZERO Zab reads or writes,
//               and zab-bar.js / zab-data.js are never even requested.
//
// MUTATION SEAM: MUTATE=a..f serves a deliberately broken copy of one file, so a check can be
// shown to FAIL without editing a file:
//   a: a rename keeps the seeded `names`            (zab-data.js)
//   b: the page mounts Zab even with the gate shut  (sw-register.js)
//   c: a pocket holding items can be trashed        (zab-data.js)
//   d: every open seeds again                       (zab-bar.js + zab-data.js)
//   e: closing does not give focus back             (zab-bar.js)
//   f: seeded names ignore the reader's language    (zab-bar.js)
// Run from the repository root with `node serve.js` running.
import fs from "node:fs";
import { chromium, newContext } from "./harness.mjs";
import { BASE } from "./harness.mjs";

// Progress is also appended to ZAB_LOG (default /tmp/zab-bar.log) as it happens, so a long run can be watched.
const LOG = process.env.ZAB_LOG || "/tmp/zab-bar.log";
fs.writeFileSync(LOG, "");
const realLog = console.log;
console.log = (...a) => { realLog(...a); fs.appendFileSync(LOG, a.join(" ") + "\n"); };
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = process.env.MUTATE || (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);

const READY_OPEN = `
export const ZAB_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const ZAB_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-14", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isZabReady() { return true; }
export const REASON_ZAB_NOT_DEPLOYED = "zab-rules-not-deployed";
export const REASON_ZAB_DECISION_INCOMPLETE = "zab-readiness-decision-incomplete";
export function zabUnavailableReason() { return null; }
`;

async function routeText(ctx, glob, mutate) {
  const file = "app/" + glob.replace("**/", "");
  const src = mutate(fs.readFileSync(file, "utf8"));
  await ctx.route(glob, (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src }));
}
function swap(src, from, to) {
  if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 60)}`);
  return src.replace(from, to);
}
async function routeMutation(ctx) {
  if (!MUTATE) return;
  if (MUTATE === "a") await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, 'if ("name" in patch) data.names = deleteField();', ""));
  else if (MUTATE === "b") await routeText(ctx, "**/js/sw-register.js", (s) => swap(s, "if (isZabReady()) import(", "if (true) import("));
  else if (MUTATE === "c") await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, "if (items.length || pockets.some(", "if (false && pockets.some("));
  else if (MUTATE === "d") {
    await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, "if (existing.length) return { ok: true, seeded: false };", ""));
    await routeText(ctx, "**/js/zab-bar.js", (s) => swap(swap(s, "if (S.loaded || S.loading) return;", "if (S.loading) return;"), "if (!all.length) {", "if (true) {"));
  }
  else if (MUTATE === "e") await routeText(ctx, "**/js/zab-bar.js", (s) => swap(s, "try { o.focus({ preventScroll: true }); }", "try { /* no focus back */ }"));
  else if (MUTATE === "g") await routeText(ctx, "**/js/zab-bar.js", (s) => s.split(".zab-row { display: grid;").join(".zab-row { display: flex; flex-wrap: nowrap !important;").split("#zabPanel[data-w=\"narrow\"] .zab-row .zab-main {").join(".zab-x {").split(".zab-row .zab-acts { grid-column: 1 / -1;").join(".zab-row .zab-acts { flex: 0 0 auto !important;")); // the ORIGINAL defect: text and controls side by side
  else if (MUTATE === "h") await routeText(ctx, "**/js/zab-bar.js", (s) => swap(s, "flex-wrap: nowrap; gap: 4px;", "flex-wrap: wrap; gap: 4px;").replace("width: auto; flex: 0 1 9.5rem; min-width: 5.5rem; max-width: 9.5rem;", "width: 100%; flex: 1 1 100%; max-width: none;")); // a full-width picker wrapping the controls onto lines of their own
  else if (MUTATE === "f") await routeText(ctx, "**/js/zab-bar.js", (s) => swap(s, "const pocketName = (p) => (p.names ? langText(p.names, lang(), p.name) : p.name || \"\");", "const pocketName = (p) => p.name || \"\";"));
  else throw new Error(`unknown mutation ${MUTATE}`);
}

const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__DATA = DATA;
  DATA.zabPockets = []; DATA.zabItems = [];
})();`;

const ONLY = process.argv.filter((a) => a.endsWith(".html")); // optional: node zab-bar-browser.mjs homework.html
const PAGES = ONLY.length ? ONLY : fs.readdirSync("app").filter((f) => f.endsWith(".html") && !["index.html", "note-editor-prototype-demo.html"].includes(f)).sort();
const WIDTHS = [320, 390, 768, 820, 1280, 1440];
const hasBn = (s) => /[ঀ-৿]/.test(s || "");

async function open(ctx, path) {
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  // "load" + a settle, not "networkidle": several pages keep fetching data files this sandbox cannot reach.
  const t0 = Date.now();
  await page.goto(`${BASE}/app/${path}`, { waitUntil: "load" });
  if (Date.now() - t0 > 3000) console.log(`   (slow load ${path}: ${Date.now() - t0}ms)`);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { for (const el of document.querySelectorAll('[id*="splash"], .mm-splash-overlay')) el.remove(); });
  return { page, errors };
}
async function mk(browser, { gate, lang = "en", width = 1280 }) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 800 }, extraSeedJs: SEED });
  // Outside hosts are unreachable here and make a page wait on a timeout; fail them at once (fonts, audio, CDNs).
  await ctx.route((u) => !["localhost", "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  if (gate) await ctx.route("**/js/zab-readiness.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_OPEN }));
  // Updated in place 15 Oct 2026: the shipped gate is now OPEN (the Owner published the Zab Rules, PCF J25), so the
  // gate-OFF half serves the real module with its declaration shut, keeping "no Zab while shut" tested.
  else await routeText(ctx, "**/js/zab-readiness.js", (src) => swap(src, "ready: true,", "ready: false,"));
  await routeMutation(ctx);
  return ctx;
}
const visible = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => /^zab/.test(w.col || "")));
// The stub never applies updateDoc to its DATA (its standing rule), so a read after a write would see stale rows.
// clearWrites() first replays the updates recorded so far onto DATA, as real Firestore would have.
const clearWrites = (page) => page.evaluate(() => {
  for (const w of window.__stubWriteData || []) {
    if (!/^zab/.test(w.col || "") || !/update/.test(w.kind)) continue;
    const row = (window.__DATA[w.col] || []).find((d) => d._id === w.id);
    if (!row) continue;
    for (const [k, v] of Object.entries(w.data)) { if (v && v.__deleteField) delete row[k]; else row[k] = v; }
  }
  window.__stubWriteData = [];
});
const zabReads = (page) => page.evaluate(() => (window.__fsLog || []).filter((r) => /^zab/.test(r.col || "")).length);
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
// Updated in place 16 Oct 2026 (audit part 24): since v10.59 (commit 5da99079) quranrevival.html on a phone puts the
// 🧰 in its Wheel/Legend/Unit row ([data-zab-dock]) and HIDES the floating corner while that row is on screen
// (zab-dock-browser covers the dock itself). Every other page keeps the corner. docked() names that one page.
const docked = (pg, w) => pg === "quranrevival.html" && w < 768;
const opener = (w, pg) => (w >= 768 ? "#zabBar [data-zab-open]" : docked(pg, w) ? "[data-zab-dock] .zab-dock-btn" : "#zabCorner");
async function waitPockets(page, n) {
  await page.waitForFunction((k) => document.querySelectorAll("#zabPanel [data-zab-pocket]").length >= k, n, { timeout: 8000 });
}
async function waitItem(page, text) {
  await page.waitForFunction((x) => [...document.querySelectorAll("#zabPanel .zab-text")].some((e) => e.textContent === x), text, { timeout: 8000 });
}
const rowFor = (text) => `.zab-row:has(.zab-text:text-is("${text}"))`;

const browser = await chromium.launch();

// ============================== GATE OFF =====================================
console.log("\n== gate OFF (declaration shut): nothing of Zab on any page ==");
{
  let offenders = [], reads = 0, zabRequests = [], dead = [];
  for (const p of PAGES) {
    // A fresh context per page: one context holding 16+ pages stalled this Chromium.
    const ctx = await mk(browser, { gate: false, width: 1280 });
    ctx.on("request", (r) => { if (/\/js\/zab-(bar|data)\.js/.test(r.url())) zabRequests.push(r.url()); });
    console.log("   .", p);
    const { page, errors } = await open(ctx, p);
    const n =await page.evaluate(() => document.querySelectorAll("#zabRoot, #zabBar, #zabCorner, #zabPanel, #zabStyle, [data-zab]").length);
    if (n) offenders.push(p);
    reads += await zabReads(page);
    reads += (await writes(page)).length;
    if (await page.evaluate(() => document.body.classList.contains("zab-bar-on"))) dead.push(p);
    await ctx.close();
  }
  check(`no Zab element on any of the ${PAGES.length} pages`, offenders.length === 0, offenders.join(", "));
  check("no page carries the zab-bar-on class", dead.length === 0, dead.join(", "));
  check("ZERO Zab reads or writes on any page", reads === 0, `count ${reads}`);
  check("zab-bar.js and zab-data.js are never even requested", zabRequests.length === 0, zabRequests.join(", "));
}

// ============================== GATE ON ======================================
console.log("\n== gate ON: the bar is on every page ==");
for (const w of [390, 1280]) {
  const missing = [];
  for (const p of PAGES) {
    const ctx = await mk(browser, { gate: true, width: w });
    const { page } = await open(ctx, p);
    await page.waitForTimeout(200);
    if (!(await visible(page, w >= 768 ? "#zabBar" : docked(p, w) ? "[data-zab-dock] .zab-dock-btn" : "#zabCorner"))) missing.push(p);
    await ctx.close();
  }
  check(`${w}px: the ${w >= 768 ? "bar" : "corner button"} is on all ${PAGES.length} pages`, missing.length === 0, missing.join(", "));
}

console.log("\n== gate ON: no read at start-up (I9) ==");
{
  const ctx = await mk(browser, { gate: true, width: 1280 });
  const { page } = await open(ctx, "records.html");
  check("a page with the bar mounted has made no Zab read or write", (await zabReads(page)) === 0 && (await writes(page)).length === 0);
  await page.close();
  await ctx.close();
}

console.log("\n== gate ON: the full flow (1280px, English) ==");
{
  const ctx = await mk(browser, { gate: true, width: 1280 });
  const { page, errors } = await open(ctx, "records.html");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.focus(opener(1280));
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await clearWrites(page);
  await page.click(opener(1280));
  await waitPockets(page, 4);
  let w = await writes(page);
  const creates = w.filter((x) => x.col === "zabPockets" && x.kind === "batch-set");
  check("first open seeds the four study pockets, in one batch", creates.length === 4, `got ${creates.length}`);
  check("the seeds are the four named pockets", ["zp-memorise", "zp-revise", "zp-questions", "zp-links"].every((id) => creates.some((c) => c.id === `t1__${id}`)));
  const names = await page.$$eval("#zabPanel [data-zab-pocket]", (els) => els.map((e) => e.textContent.trim()));
  check("English names show from `names`", names.some((n) => n.includes("To memorise")) && names.some((n) => n.includes("Questions")), names.join(" | "));
  check("the bar now lists the four pockets", (await page.$$eval("#zabBar [data-zab-pocket]", (e) => e.length)) === 4);
  check("the panel is 380px wide", Math.abs((await page.evaluate(() => document.getElementById("zabPanel").getBoundingClientRect().width)) - 380) < 1);
  check("the bar is at least 40px tall in its buttons", await page.evaluate(() => [...document.querySelectorAll("#zabBar button")].every((b) => b.getBoundingClientRect().height >= 40)));

  // close, reopen: no second seed
  await clearWrites(page);
  await page.click("#zabPanel [data-zab-close]");
  check("closing hides the panel", !(await visible(page, "#zabPanel")));
  check("WAY BACK: closing gives focus back to the control that opened it", await page.evaluate(() => document.activeElement && document.activeElement.matches("#zabBar [data-zab-open]")));
  check("WAY BACK: the scroll position is where it was", (await page.evaluate(() => window.scrollY)) === scrollBefore);
  await page.click(opener(1280));
  await page.waitForTimeout(400);
  check("reopening does NOT seed again", (await writes(page)).filter((x) => x.col === "zabPockets").length === 0);

  // open a pocket, add items
  await page.click('#zabPanel [data-zab-pocket="zp-memorise"]');
  await page.waitForSelector("#zabPanel [data-zab-new-item]");
  await clearWrites(page);
  await page.fill("#zabPanel [data-zab-new-item]", "Alif");
  await page.press("#zabPanel [data-zab-new-item]", "Enter");
  await waitItem(page, "Alif");
  await page.fill("#zabPanel [data-zab-new-item]", "Ba");
  await page.press("#zabPanel [data-zab-new-item]", "Enter");
  await waitItem(page, "Ba");
  w = await writes(page);
  const adds = w.filter((x) => x.col === "zabItems" && x.kind === "set");
  check("Enter adds an item: two creates, with text, pocket and who added it", adds.length === 2 && adds[0].data.text === "Alif" && adds[0].data.pocketId === "zp-memorise" && adds[0].data.addedByPersonId === "p1" && adds[0].data.done === false, JSON.stringify(adds[0]?.data));
  check("each item shows who added it, by name", (await page.$eval(rowFor("Alif"), (e) => e.textContent)).includes("Ahsan"));

  // tick
  await clearWrites(page);
  await page.check(`${rowFor("Alif")} input[type=checkbox]`);
  await page.waitForTimeout(250);
  w = await writes(page);
  check("tick writes done: true", w.some((x) => x.kind === "update" && x.col === "zabItems" && x.data.done === true));

  // reorder
  await clearWrites(page);
  await page.click(`${rowFor("Alif")} [data-zab-idown]`);
  await page.waitForTimeout(300);
  w = await writes(page);
  const orderWrites = w.filter((x) => x.kind === "update" && "order" in x.data);
  check("reorder writes the two swapped `order` values", orderWrites.length === 2 && orderWrites[0].data.order !== orderWrites[1].data.order);
  const texts = await page.$$eval("#zabPanel .zab-row .zab-text", (e) => e.map((x) => x.textContent));
  check("the list shows the new order", texts[0] === "Ba" && texts[1] === "Alif", texts.join(","));

  // edit
  await clearWrites(page);
  await page.click(`${rowFor("Ba")} [data-zab-iedit]`);
  await page.fill("#zabPanel [data-zab-item-text]", "Ba edited");
  await page.press("#zabPanel [data-zab-item-text]", "Enter");
  await waitItem(page, "Ba edited");
  check("edit writes the new text", (await writes(page)).some((x) => x.kind === "update" && x.data.text === "Ba edited"));

  // move
  await clearWrites(page);
  await page.selectOption(`${rowFor("Ba edited")} select[data-zab-imove]`, "zp-revise");
  await page.waitForFunction(() => ![...document.querySelectorAll("#zabPanel .zab-text")].some((e) => e.textContent === "Ba edited"));
  check("move to another pocket writes pocketId", (await writes(page)).some((x) => x.kind === "update" && x.data.pocketId === "zp-revise"));

  // trash an item, restore it later
  await clearWrites(page);
  await page.click(`${rowFor("Alif")} [data-zab-itrash]`);
  await page.waitForFunction(() => !document.querySelector("#zabPanel .zab-text"));
  w = await writes(page);
  check("Trash sets status trashed + deletedAt (never deletes)", w.some((x) => x.kind === "update" && x.data.status === "trashed" && "deletedAt" in x.data) && !w.some((x) => /delete/.test(x.kind)));

  // clear done
  await page.fill("#zabPanel [data-zab-new-item]", "Ta");
  await page.press("#zabPanel [data-zab-new-item]", "Enter");
  await waitItem(page, "Ta");
  await page.check(`${rowFor("Ta")} input[type=checkbox]`);
  await page.waitForTimeout(250);
  await clearWrites(page);
  await page.click("#zabPanel [data-zab-clear-done]");
  await page.waitForFunction(() => !document.querySelector("#zabPanel .zab-text"));
  w = await writes(page);
  check("Clear done trashes the ticked items in a batch", w.some((x) => x.kind === "batch-update" && x.col === "zabItems" && x.data.status === "trashed"));

  // pockets: rename, refuse trash with items, trash empty, restore
  await page.click('#zabPanel [data-zab-nav="list"]');
  await page.waitForSelector("#zabPanel [data-zab-pedit]");
  await clearWrites(page);
  await page.click('#zabPanel [data-zab-pedit="zp-revise"]');
  await page.fill("#zabPanel [data-zab-f='name']", "Revise more");
  await page.click("#zabPanel [data-zab-save-pocket]");
  await page.waitForFunction(() => document.querySelector("#zabPanel").textContent.includes("Revise more"));
  w = await writes(page);
  const ren = w.find((x) => x.kind === "update" && x.col === "zabPockets" && x.data.name === "Revise more");
  check("rename writes `name` and removes `names`", !!ren && ren.data.names && ren.data.names.__deleteField === true, JSON.stringify(ren?.data));

  await clearWrites(page);
  await page.click('#zabPanel [data-zab-ptrash="zp-revise"]');
  await page.waitForTimeout(300);
  check("a pocket holding items cannot be trashed: plain message, no write", (await page.$eval("#zabMsg", (e) => e.textContent)).includes("still has items") && (await writes(page)).filter((x) => x.data && x.data.status === "trashed").length === 0);

  await clearWrites(page);
  await page.click('#zabPanel [data-zab-ptrash="zp-questions"]');
  await page.waitForFunction(() => !document.querySelector('#zabPanel [data-zab-pocket="zp-questions"]'));
  check("an empty pocket goes to Trash", (await writes(page)).some((x) => x.kind === "update" && x.col === "zabPockets" && x.data.status === "trashed"));

  // pocket reorder + restyle
  await clearWrites(page);
  await page.click('#zabPanel [data-zab-pdown="zp-memorise"]');
  await page.waitForTimeout(300);
  check("pocket reorder writes two `order` values", (await writes(page)).filter((x) => x.kind === "update" && "order" in x.data).length === 2);
  await clearWrites(page);
  await page.click('#zabPanel [data-zab-pedit="zp-links"]');
  await page.selectOption("#zabPanel [data-zab-f='icon']", "⭐");
  await page.click("#zabPanel [data-zab-save-pocket]");
  await page.waitForTimeout(300);
  check("icon change writes `icon` only (no name)", (await writes(page)).some((x) => x.kind === "update" && x.data.icon === "⭐" && !("name" in x.data)));

  // trash view + restore
  await page.click('#zabPanel [data-zab-nav="trash"]');
  await page.waitForFunction(() => document.querySelectorAll("#zabPanel [data-zab-restore]").length >= 3);
  const trashRows = await page.$$eval("#zabPanel [data-zab-restore]", (e) => e.length);
  check("the Trash view lists the trashed pocket and the trashed items", trashRows >= 3, `${trashRows}`);
  await clearWrites(page);
  await page.click('#zabPanel [data-zab-restore="pocket:zp-questions"]');
  await page.waitForTimeout(300);
  w = await writes(page);
  check("Restore brings a pocket back (status active, deletedAt removed)", w.some((x) => x.kind === "update" && x.data.status === "active" && x.data.deletedAt && x.data.deletedAt.__deleteField === true));
  check("the restored pocket is back in the bar", (await page.$$eval("#zabBar [data-zab-pocket]", (e) => e.length)) === 4);
  const itemRestore = await page.$("#zabPanel [data-zab-restore^='item:']");
  await clearWrites(page);
  await itemRestore.click();
  await page.waitForTimeout(300);
  check("Restore brings an item back", (await writes(page)).some((x) => x.col === "zabItems" && x.data.status === "active"));

  check("the panel's inside fits its width", await page.evaluate(() => { const p = document.getElementById("zabPanel"); return p.scrollWidth <= p.clientWidth + 1; }));
  check("no sideways scroll", await noSideways(page));
  check("no page errors", errors.length === 0, errors.join(" | "));
  await page.close();
  await ctx.close();
}

console.log("\n== gate ON: a failed write reaches the reader (I15) ==");
{
  const ctx = await mk(browser, { gate: true, width: 1280 });
  const { page } = await open(ctx, "records.html");
  await page.click(opener(1280));
  await waitPockets(page, 4);
  await page.click('#zabPanel [data-zab-pocket="zp-links"]');
  await page.waitForSelector("#zabPanel [data-zab-new-item]");
  await page.fill("#zabPanel [data-zab-new-item]", "Will fail");
  await page.evaluate(() => { window.__stubFailWrites = true; });
  await page.press("#zabPanel [data-zab-new-item]", "Enter");
  await page.waitForFunction(() => document.getElementById("zabMsg").textContent.length > 3);
  check("a refused write shows a plain message in the panel", (await page.$eval("#zabMsg", (e) => e.textContent)).includes("Could not save"));
  check("the item is not shown as saved", !(await page.$$eval("#zabPanel .zab-text", (e) => e.some((x) => x.textContent === "Will fail"))));
  await page.close();
  await ctx.close();
}

console.log("\n== gate ON: layout, every width, English and Bangla ==");
for (const lang of ["en", "bn"]) {
  for (const w of WIDTHS) {
    const ctx = await mk(browser, { gate: true, lang, width: w });
    for (const pg of ["quranrevival.html", "records.html"]) {
      const { page, errors } = await open(ctx, pg);
      const tag = `${pg} ${w}px ${lang}`;
      if (docked(pg, w)) {
        check(`${tag}: the 🧰 is docked in the Wheel row, rendered, on screen and at least 40px`, await page.evaluate(() => { const e = document.querySelector("[data-zab-dock] .zab-dock-btn"); if (!e) return false; const r = e.getBoundingClientRect(); return r.width >= 40 && r.height >= 40 && r.left >= 0 && r.right <= window.innerWidth && r.top >= 0 && r.bottom <= window.innerHeight; }));
        check(`${tag}: the floating corner is hidden while the dock is on screen`, !(await visible(page, "#zabCorner")) && await page.evaluate(() => document.body.classList.contains("zab-docked")));
      } else {
        check(`${tag}: bar or corner button present`, await visible(page, w >= 768 ? "#zabBar" : "#zabCorner"));
        if (w < 768) check(`${tag}: corner button is at least 44px`, await page.evaluate(() => { const r = document.getElementById("zabCorner").getBoundingClientRect(); return r.width >= 44 && r.height >= 44; }));
      }
      check(`${tag}: no sideways scroll before opening`, await noSideways(page));
      await page.click(opener(w, pg));
      await waitPockets(page, 4);
      const names = await page.$$eval("#zabPanel [data-zab-pocket]", (e) => e.map((x) => x.textContent.trim()));
      if (lang === "bn") check(`${tag}: the four seeded names show in Bangla`, names.length === 4 && names.every(hasBn), names.join(" | "));
      else check(`${tag}: the four seeded names show in English`, names.length === 4 && names.some((n) => n.includes("To memorise")));
      const fit = await page.evaluate(() => { const p = document.getElementById("zabPanel"); const r = p.getBoundingClientRect(); const wide = [...p.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > r.right + 1 || b.left < r.left - 1); }).length; return { sw: p.scrollWidth, cw: p.clientWidth, inside: r.left >= -1 && r.right <= window.innerWidth + 1, wide }; });
      check(`${tag}: the panel's inside fits its width, and the panel fits the screen`, fit.sw <= fit.cw + 1 && fit.inside && fit.wide === 0, JSON.stringify(fit));
      if (w < 768) check(`${tag}: phone panel is a bottom sheet`, await page.evaluate(() => { const r = document.getElementById("zabPanel").getBoundingClientRect(); return Math.abs(r.bottom - window.innerHeight) < 2 && r.width >= window.innerWidth - 1; }));
      check(`${tag}: row shape follows the panel's own width`, await page.evaluate(() => { const p = document.getElementById("zabPanel"); return p.dataset.w === (p.clientWidth < 560 ? "narrow" : "wide"); }));
      await page.click('#zabPanel [data-zab-pocket="zp-memorise"]');
      await page.waitForSelector("#zabPanel [data-zab-new-item]");
      await page.fill("#zabPanel [data-zab-new-item]", "A rather long item text that has to wrap inside a narrow panel without overflowing it sideways");
      await page.press("#zabPanel [data-zab-new-item]", "Enter");
      await page.waitForSelector("#zabPanel .zab-row");
      const fit2 = await page.evaluate(() => { const p = document.getElementById("zabPanel"); const r = p.getBoundingClientRect(); const bad = [...p.querySelectorAll("button,select,input")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > r.right + 1 || b.left < r.left - 1); }).length; const textW = p.querySelector(".zab-row .zab-main").getBoundingClientRect().width; return { fits: p.scrollWidth <= p.clientWidth + 1, bad, textW: Math.round(textW) }; });
      // Architect review (Z2): the item's TEXT gets the row's width, the controls go beneath it -- never a column a few letters wide.
      const txt = await page.evaluate(() => { const p = document.getElementById("zabPanel"); const t = [...p.querySelectorAll(".zab-row .zab-text")].pop(); const a = t && t.closest(".zab-row").querySelector(".zab-acts"); if (!t || !a) return null; const tr = t.getBoundingClientRect(), ar = a.getBoundingClientRect(); return { share: tr.width / p.clientWidth, below: ar.top >= tr.bottom - 1 }; });
      check(`${tag}: the item's text has at least 70% of the panel's width`, !!txt && txt.share >= 0.7, JSON.stringify(txt));
      check(`${tag}: the item's controls sit below its text`, !!txt && txt.below, JSON.stringify(txt));
      const oneLine = await page.evaluate(() => { const a = [...document.querySelectorAll("#zabPanel .zab-row .zab-acts")].pop(); if (!a) return null; const tops = [...a.children].filter((c) => c.getBoundingClientRect().width > 0).map((c) => Math.round(c.getBoundingClientRect().top)); return { lines: new Set(tops).size, n: tops.length }; });
      check(`${tag}: the item's controls sit on ONE line (calm, nothing ragged)`, !!oneLine && oneLine.n >= 4 && oneLine.lines === 1, JSON.stringify(oneLine));
      check(`${tag}: an item row with long text still fits (every control inside the panel)`, fit2.fits && fit2.bad === 0, JSON.stringify(fit2));
      check(`${tag}: the item's text column keeps a readable width (>= 150px; a screenshot caught it at 40px)`, fit2.textW >= 150, JSON.stringify(fit2));
      check(`${tag}: no sideways scroll with the panel open`, await noSideways(page));
      if (pg === "records.html" && (w === 390 || w === 1280)) await page.screenshot({ path: `/tmp/zab-${w}-${lang}.png` });
      await page.keyboard.press("Escape");
      check(`${tag}: Escape closes the panel`, !(await visible(page, "#zabPanel")));
      check(`${tag}: no page errors`, errors.length === 0, errors.join(" | "));
      await page.close();
    }
    await ctx.close();
  }
}

console.log("\n== gate ON: things fixed to the bottom leave room for the bar ==");
{
  const ctx = await mk(browser, { gate: true, width: 1280 });
  const { page } = await open(ctx, "quranrevival.html");
  await page.evaluate(() => new Promise((res) => { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "css/note-window.css"; l.onload = res; l.onerror = res; document.head.appendChild(l); }));
  const gap = await page.evaluate(() => {
    const e =document.createElement("div"); e.className = "nw-switch"; e.style.cssText = "height:56px"; document.body.appendChild(e);
    const bar = document.getElementById("zabBar").getBoundingClientRect();
    return { switchBottom: e.getBoundingClientRect().bottom, barTop: bar.top };
  });
  check("the Note window's bottom bar sits above the Zab bar", gap.switchBottom <= gap.barTop + 1, JSON.stringify(gap));
  check("a spacer keeps the end of the page clear of the bar", await page.evaluate(() => document.getElementById("zabSpacer").getBoundingClientRect().height >= 44));
  await page.close();
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
