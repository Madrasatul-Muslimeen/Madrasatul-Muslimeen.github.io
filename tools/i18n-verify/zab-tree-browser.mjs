// PCF J25, Builder round Z6 (issue #831) -- pockets inside pockets, and the phone Drawer, in a real browser.
//
// GATE ON (the ctx.route() seam, as zab-bar-browser.mjs), en/bn x 320, 390, 820, 1440. Seeded tree:
//   Alpha (a) > Beta (b) ;  Delta (d) ;  Dead (trashed) > Orphan (orph)
// Proved from the stub's write log (__stubWriteData): a child and a grandchild are created with their parentId;
// the crumbs show the path and each crumb works; a move into a descendant is refused with a message and writes
// nothing; a pocket holding a child cannot be trashed; an orphan shows at the top level and keeps its parentId;
// "Move into…" lists only legal targets; a legal move writes parentId; the Drawer indents by level and each
// level is 40px+ tall; no sideways scroll; the text has its own line.
//
// MUTATION SEAM: MUTATE=a..g serves a deliberately broken copy of one file, so a check can be shown to FAIL:
//   a: a move into a descendant is not refused          (zab-data.js)
//   b: a pocket holding a child can be trashed          (zab-data.js)
//   c: the bar lists every pocket, not just top level   (zab-bar.js)
//   d: an orphan is hidden                              (zab-data.js)
//   e: the Drawer does not indent                       (zab-bar.js)
//   f: the crumbs are not tappable                      (zab-bar.js)
//   g: "Move into…" offers the pocket's own descendants (zab-data.js)
// Run from the repository root with `node serve.js` running.
import fs from "node:fs";
import { chromium, newContext, BASE } from "./harness.mjs";

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
  const src = mutate(fs.readFileSync("app/" + glob.replace("**/", ""), "utf8"));
  await ctx.route(glob, (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src }));
}
function swap(src, from, to) {
  if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 60)}`);
  return src.replace(from, to);
}
async function routeMutation(ctx) {
  if (!MUTATE) return;
  const D = "**/js/zab-data.js", B = "**/js/zab-bar.js";
  if (MUTATE === "a") await routeText(ctx, D, (s) => swap(s, "if (isSelfOrDescendant(all, pocketId, newParentId))", "if (false)"));
  else if (MUTATE === "b") await routeText(ctx, D, (s) => swap(s, "pockets.some((p) => p.parentId === pocketId)", "false"));
  else if (MUTATE === "c") await routeText(ctx, B, (s) => swap(s, "host.innerHTML = zab.zabTopLevel(S.pockets).map(", "host.innerHTML = activePockets().map("));
  else if (MUTATE === "d") await routeText(ctx, D, (s) => swap(s, "if (!par || !isActive(par)) return true;", "if (!par || !isActive(par)) return false;"));
  else if (MUTATE === "e") await routeText(ctx, B, (s) => swap(s, "margin-inline-start: calc(var(--zab-depth, 0) * 16px)", "margin-inline-start: 0"));
  else if (MUTATE === "f") await routeText(ctx, B, (s) => swap(s, 'data-zab-pocket="${esc(x.pocketId)}" data-zab-crumb', 'data-zab-nocrumb="${esc(x.pocketId)}" data-zab-crumb'));
  else if (MUTATE === "g") await routeText(ctx, D, (s) => swap(s, "return zabTree(pockets).filter((n) => !isSelfOrDescendant(pockets, id, n.pocket.pocketId));", "return zabTree(pockets);"));
  else throw new Error(`unknown mutation ${MUTATE}`);
}

const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__DATA = DATA;
  const r = (id, o) => Object.assign({ _id: "t1__" + id, pocketId: id, tenantId: "t1", addedByPersonId: "p1", status: "active", icon: "📁", color: "#4a5568" }, o);
  DATA.zabPockets = [
    r("a", { name: "Alpha", order: 1 }), r("b", { name: "Beta", order: 1, parentId: "a" }),
    r("d", { name: "Delta", order: 3 }), r("dead", { name: "Dead", order: 5, status: "trashed" }),
    r("orph", { name: "Orphan", order: 6, parentId: "dead" }),
  ];
  DATA.zabItems = [];
})();`;

const WIDTHS = [320, 390, 820, 1440];
const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const opener = (w) => (w >= 768 ? "#zabBar [data-zab-open]" : "#zabCorner");
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => /^zab/.test(w.col || "")));
const clearWrites = (page) => page.evaluate(() => {
  for (const w of window.__stubWriteData || []) {
    if (!/^zab/.test(w.col || "") || !/update/.test(w.kind)) continue;
    const row = (window.__DATA[w.col] || []).find((d) => d._id === w.id);
    if (!row) continue;
    for (const [k, v] of Object.entries(w.data)) { if (v && v.__deleteField) delete row[k]; else row[k] = v; }
  }
  window.__stubWriteData = [];
});
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const panelFits = (page) => page.evaluate(() => { const p = document.getElementById("zabPanel"); const r = p.getBoundingClientRect(); const wide = [...p.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > r.right + 1 || b.left < r.left - 1); }).length; return p.scrollWidth <= p.clientWidth + 1 && wide === 0; });
const crumbTexts = (page) => page.$$eval("#zabPanel [data-zab-crumb]", (e) => e.map((x) => x.textContent.replace(/\s+/g, " ").trim()));
async function waitCrumbs(page, n) {
  await page.waitForFunction((k) => document.querySelectorAll("#zabPanel [data-zab-crumb]").length === k && !!document.querySelector("#zabPanel [data-zab-new-item]"), n, { timeout: 8000 });
}
const rowLeft = (page, id) => page.evaluate((i) => { const b = document.querySelector(`#zabPanel .zab-drawer-row [data-zab-pocket="${i}"]`); return b ? Math.round(b.getBoundingClientRect().left) : null; }, id);

const browser = await chromium.launch();
for (const lang of ["en", "bn"]) {
  for (const w of WIDTHS) {
    const tag = `${lang} ${w}px`;
    console.log(`\n== ${tag} ==`);
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width: w, height: 800 }, extraSeedJs: SEED });
    await ctx.route((u) => !["localhost", "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
    await ctx.route("**/js/zab-readiness.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_OPEN }));
    await routeMutation(ctx);
    // Architect review: a flow that times out under a mutation is a FAILED check for this width, not a crash of the run.
    try {
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`${BASE}/app/records.html`, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    await page.evaluate(() => { for (const el of document.querySelectorAll('[id*="splash"], .mm-splash-overlay')) el.remove(); });
    await page.click(opener(w));
    await page.waitForFunction(() => document.querySelectorAll("#zabPanel [data-zab-pocket]").length >= 1, null, { timeout: 8000 });

    // ---- top level, orphan
    const top = await page.$$eval("#zabPanel [data-zab-pocket]", (e) => e.map((x) => x.dataset.zabPocket));
    check(`${tag}: the list shows the top level only (Beta is inside Alpha, collapsed)`, top.join() === "a,d,orph", top.join());
    check(`${tag}: ORPHAN shows at the top level (its parent is trashed), at depth 0`, await page.evaluate(() => document.querySelector('#zabPanel [data-zab-pocket="orph"]')?.closest(".zab-drawer-row")?.dataset.zabDepth === "0"));
    if (w >= 768) {
      const bar = await page.$$eval("#zabBar [data-zab-pocket]", (e) => e.map((x) => x.dataset.zabPocket));
      check(`${tag}: the bar shows the top-level pockets only`, bar.join() === "a,d,orph", bar.join());
    }
    check(`${tag}: Alpha shows ▸ (it has a pocket inside), Delta shows no twisty`, await page.evaluate(() => { const a = document.querySelector('[data-zab-node="a"]'); return !!a && a.textContent.trim() === "▸" && a.getAttribute("aria-expanded") === "false" && !document.querySelector('[data-zab-node="d"]'); }));

    // ---- Drawer: expand
    await page.click('#zabPanel [data-zab-node="a"]');
    await page.waitForSelector('#zabPanel [data-zab-pocket="b"]');
    check(`${tag}: ▸ becomes ▾ and Beta appears`, await page.evaluate(() => document.querySelector('[data-zab-node="a"]').textContent.trim() === "▾"));
    const la = await rowLeft(page, "a"), lb = await rowLeft(page, "b");
    check(`${tag}: the Drawer indents Beta one level in from Alpha`, la !== null && lb !== null && lb - la >= 12, `${la} -> ${lb}`);
    check(`${tag}: Drawer rows and their ▸/▾ are 40px or taller`, await page.evaluate(() => [...document.querySelectorAll("#zabPanel .zab-drawer-row")].every((r) => r.querySelector("[data-zab-pocket]").getBoundingClientRect().height >= 40 && (!r.querySelector(".zab-twisty") || r.querySelector(".zab-twisty").getBoundingClientRect().height >= 40))));
    check(`${tag}: the Drawer fits the panel, no sideways scroll`, (await panelFits(page)) && (await noSideways(page)));

    // ---- child and grandchild
    await page.click('#zabPanel [data-zab-pocket="b"]');
    await waitCrumbs(page, 2);
    check(`${tag}: crumbs show the path Alpha › Beta`, (await crumbTexts(page)).join("|").replace(/📁 /g, "") === "Alpha|Beta", (await crumbTexts(page)).join("|"));
    await clearWrites(page);
    await page.fill("#zabPanel [data-zab-new-child]", "Gamma");
    await page.press("#zabPanel [data-zab-new-child]", "Enter");
    await page.waitForSelector("#zabPanel [data-zab-chip]");
    let ws = (await writes(page)).filter((x) => x.col === "zabPockets" && x.kind === "set");
    check(`${tag}: a CHILD of Beta is created with parentId b`, ws.length === 1 && ws[0].data.parentId === "b" && ws[0].data.name === "Gamma", JSON.stringify(ws.map((x) => x.data)));
    const gammaId = ws[0]?.data.pocketId;
    check(`${tag}: the child shows as a chip`, (await page.$$eval("#zabPanel [data-zab-chip]", (e) => e.length)) === 1);
    await page.click("#zabPanel [data-zab-chip]");
    await waitCrumbs(page, 3);
    await clearWrites(page);
    await page.fill("#zabPanel [data-zab-new-child]", "Grand");
    await page.press("#zabPanel [data-zab-new-child]", "Enter");
    await page.waitForSelector("#zabPanel [data-zab-chip]");
    ws = (await writes(page)).filter((x) => x.col === "zabPockets" && x.kind === "set");
    check(`${tag}: a GRANDCHILD is created with parentId = the child`, ws.length === 1 && ws[0].data.parentId === gammaId, JSON.stringify(ws.map((x) => x.data)));
    await page.click("#zabPanel [data-zab-chip]");
    await waitCrumbs(page, 4);
    check(`${tag}: crumbs show four levels Alpha › Beta › Gamma › Grand`, (await crumbTexts(page)).join("|").replace(/📁 /g, "") === "Alpha|Beta|Gamma|Grand", (await crumbTexts(page)).join("|"));
    check(`${tag}: the crumbs are 40px+ and fit the panel, no sideways scroll`, (await page.evaluate(() => [...document.querySelectorAll("#zabPanel [data-zab-crumb]")].every((b) => b.getBoundingClientRect().height >= 40))) && (await panelFits(page)) && (await noSideways(page)));
    if (w === 390 || w === 1440) await page.screenshot({ path: `/tmp/zab-tree-${w}-${lang}.png` });
    await page.click('#zabPanel [data-zab-crumb]:nth-of-type(1)');
    await page.waitForFunction(() => document.querySelectorAll("#zabPanel [data-zab-crumb]").length === 1);
    check(`${tag}: tapping the first crumb opens Alpha, which lists Beta as a chip`, (await page.$eval("#zabPanel .zab-head h2", (e) => e.textContent)).includes("Alpha") && (await page.$$eval("#zabPanel [data-zab-chip]", (e) => e.map((x) => x.dataset.zabPocket))).join() === "b");
    await page.click('#zabPanel [data-zab-chip]');
    await waitCrumbs(page, 2);
    await page.click('#zabPanel [data-zab-nav="list"]');
    await page.waitForSelector("#zabPanel .zab-drawer-row");

    // ---- Drawer depth after the new levels
    // adding a child opens its parent, so these are already open: expand only what is still shut
    for (const id of ["a", "b", gammaId]) {
      await page.waitForSelector(`#zabPanel [data-zab-node="${id}"]`);
      if ((await page.getAttribute(`#zabPanel [data-zab-node="${id}"]`, "aria-expanded")) !== "true") await page.click(`#zabPanel [data-zab-node="${id}"]`);
    }
    await page.waitForSelector(`#zabPanel [data-zab-pocket="${gammaId}"]`);
    const depthLefts = await page.evaluate(() => [...document.querySelectorAll("#zabPanel .zab-drawer-row[data-zab-depth] [data-zab-pocket]")].map((b) => Math.round(b.getBoundingClientRect().left)));
    const depthRows = await page.$$eval("#zabPanel .zab-drawer-row[data-zab-depth]", (e) => e.map((r) => r.dataset.zabDepth));
    const aIdx = depthRows.indexOf("0"), gIdx = depthRows.indexOf("3");
    check(`${tag}: four levels deep the Drawer is indented further at each level`, gIdx > 0 && depthRows.slice(aIdx, gIdx + 1).join() === "0,1,2,3" && depthLefts[aIdx] < depthLefts[aIdx + 1] && depthLefts[aIdx + 1] < depthLefts[aIdx + 2] && depthLefts[aIdx + 2] < depthLefts[gIdx], `${depthRows.join()} ${depthLefts.join()}`);
    check(`${tag}: deep Drawer still fits, no sideways scroll`, (await panelFits(page)) && (await noSideways(page)));
    await page.click('#zabPanel [data-zab-node="a"]'); // collapse again
    await page.waitForFunction(() => !document.querySelector('#zabPanel [data-zab-pocket="b"]'));
    check(`${tag}: collapsing Alpha hides everything inside it (Beta, Gamma, Grand)`, (await page.$$eval("#zabPanel .zab-drawer-row[data-zab-depth]", (e) => e.filter((r) => r.dataset.zabDepth !== "0").length)) === 0);
    await page.click('#zabPanel [data-zab-node="a"]');
    await page.waitForSelector('#zabPanel [data-zab-pocket="b"]');
    check(`${tag}: expanding again shows Beta`, await page.evaluate(() => document.querySelector('[data-zab-node="a"]').getAttribute("aria-expanded") === "true"));

    // ---- trash refused while it holds a pocket
    await clearWrites(page);
    await page.click('#zabPanel [data-zab-ptrash="a"]');
    await page.waitForFunction(() => document.getElementById("zabMsg").textContent.length > 3);
    check(`${tag}: a pocket holding a pocket cannot be trashed: a message, no write`, (await page.$eval("#zabMsg", (e) => e.textContent)).length > 10 && (await writes(page)).filter((x) => x.data && x.data.status === "trashed").length === 0);

    // ---- Move into…: legal targets only, refusal with a message
    await clearWrites(page);
    await page.click('#zabPanel [data-zab-pedit="a"]');
    const offered = await page.$$eval("#zabPanel [data-zab-f='parent'] option", (o) => o.map((x) => x.value));
    check(`${tag}: Move into… for Alpha offers Top level and Delta only (not Alpha, Beta, Gamma, Grand)`, offered.includes("") && offered.includes("d") && !offered.includes("a") && !offered.includes("b") && !offered.includes(gammaId) && offered.length === 3, offered.join());
    await page.evaluate(() => { const s = document.querySelector("#zabPanel [data-zab-f='parent']"); const o = document.createElement("option"); o.value = "b"; o.textContent = "forced"; s.appendChild(o); });
    await page.selectOption("#zabPanel [data-zab-f='parent']", "b");
    await page.click("#zabPanel [data-zab-save-pocket]");
    await page.waitForFunction(() => document.getElementById("zabMsg") && document.getElementById("zabMsg").textContent.length > 3, null, { timeout: 5000 }).catch(() => {});
    const refusedMsg = await page.$eval("#zabMsg", (e) => e.textContent).catch(() => "");
    check(`${tag}: a move into a DESCENDANT is refused with a message and writes nothing`, refusedMsg.length > 10 && (await writes(page)).filter((x) => x.data && "parentId" in x.data).length === 0, refusedMsg);
    if (lang === "bn") check(`${tag}: the refusal message is in Bangla`, hasBn(refusedMsg), refusedMsg);

    // ---- legal move
    await page.click('#zabPanel [data-zab-cancel-edit]').catch(() => {});
    await page.waitForSelector('#zabPanel [data-zab-pedit="d"]');
    await clearWrites(page);
    await page.click('#zabPanel [data-zab-pedit="d"]');
    await page.selectOption("#zabPanel [data-zab-f='parent']", "a");
    await page.click("#zabPanel [data-zab-save-pocket]");
    await page.waitForFunction(() => !document.querySelector("#zabPanel [data-zab-save-pocket]"));
    let up = (await writes(page)).filter((x) => x.kind === "update" && x.col === "zabPockets" && x.id === "t1__d");
    check(`${tag}: a legal move writes parentId a on Delta`, up.length === 1 && up[0].data.parentId === "a", JSON.stringify(up.map((x) => x.data)));
    check(`${tag}: Delta now sits inside Alpha, not at the top level`, !(await page.$$eval("#zabPanel [data-zab-pocket]", (e) => e.some((x) => x.dataset.zabPocket === "d" && x.closest(".zab-drawer-row").dataset.zabDepth === "0"))));
    await clearWrites(page);
    await page.click('#zabPanel [data-zab-pedit="d"]');
    await page.selectOption("#zabPanel [data-zab-f='parent']", "");
    await page.click("#zabPanel [data-zab-save-pocket]");
    await page.waitForFunction(() => !document.querySelector("#zabPanel [data-zab-save-pocket]"));
    up = (await writes(page)).filter((x) => x.kind === "update" && x.id === "t1__d");
    check(`${tag}: Top level removes parentId`, up.length === 1 && up[0].data.parentId && up[0].data.parentId.__deleteField === true, JSON.stringify(up.map((x) => x.data)));

    // ---- orphan keeps its parentId
    await clearWrites(page);
    await page.click('#zabPanel [data-zab-pedit="orph"]');
    check(`${tag}: the orphan's picker starts at Top level`, (await page.$eval("#zabPanel [data-zab-f='parent']", (s) => s.value)) === "");
    await page.click("#zabPanel [data-zab-cancel-edit]");
    check(`${tag}: an orphan is shown without any write (its parentId is kept)`, (await writes(page)).length === 0);

    // ---- text has its own line in a pocket row at this width
    await page.click('#zabPanel [data-zab-pocket="a"]');
    await waitCrumbs(page, 1);
    await page.fill("#zabPanel [data-zab-new-item]", "A rather long item text that has to wrap inside a narrow panel without overflowing it sideways");
    await page.press("#zabPanel [data-zab-new-item]", "Enter");
    await page.waitForSelector("#zabPanel .zab-row .zab-text");
    const txt = await page.evaluate(() => { const p = document.getElementById("zabPanel"); const t = p.querySelector(".zab-row .zab-text"); const a = t.closest(".zab-row").querySelector(".zab-acts"); return { share: t.getBoundingClientRect().width / p.clientWidth, below: a.getBoundingClientRect().top >= t.getBoundingClientRect().bottom - 1 }; });
    check(`${tag}: an item's text still has 70%+ of the panel and its controls sit below (as Z2)`, txt.share >= 0.7 && txt.below, JSON.stringify(txt));
    check(`${tag}: pocket view fits, no sideways scroll`, (await panelFits(page)) && (await noSideways(page)));
    check(`${tag}: no page errors`, errors.length === 0, errors.join(" | "));
    } catch (err) {
      check(`${tag}: the flow ran to the end`, false, String(err && err.message || err).split("\n")[0].slice(0, 200));
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
