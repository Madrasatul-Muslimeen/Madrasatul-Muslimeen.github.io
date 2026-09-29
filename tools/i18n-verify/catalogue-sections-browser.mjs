// Issue #399 -- the Owner (29 Sep 2026): "Make the Section heading expandible /
// collapsible (collapsible by default) and also make sections draggable up and
// down. Moving the section does not reflect in the wheel."
//
// In a real browser, on a realistic tenant (8 owned sections, 40 Approaches,
// two of them matched to their section by NAME only, three "added" later --
// see _seed-sections.mjs):
//   1. a section move SAVES AT ONCE and reaches the landing wheel: the writes
//      the move recorded are applied to the seed of a SECOND page on
//      quranrevival.html, and the wheel's slice order and the landing Approach
//      list are compared with an order written out BY HAND below;
//   2. a typed-but-unsaved name stays in its field and is announced;
//   3. section headings are collapsible, collapsed by default, and the open
//      state survives an edit / a move;
//   4. drag by mouse AND by touch, Escape / no-op drop write nothing;
//   5. a reader sees no handles or arrows;
//   6. layout at 320-1280px in both languages, with screenshots to /tmp/w/shots.
//
//   node tools/i18n-verify/catalogue-sections-browser.mjs
import { chromium, newContext, openPage } from "./harness.mjs";
import { seedJs } from "./_seed-sections.mjs";
import { mkdirSync } from "node:fs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const SHOTS = "/tmp/w/shots";
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// ---- expected orders, WRITTEN BY HAND from the seed (never computed) ----
const ways = (s) => s.trim().split(/\s+/).map((id) => `Way ${id}`);
const ALPHA = "a01 a02 a03 a04 a05 a38";
const BETA = "a06 a07 a08 a09 a10";
const GAMMA = "a11 a12 a13 a14 a15";
const DELTA = "a16 a17 a18 a19 a20";
const REST = "a21 a22 a23 a24 a25 a39  a26 a27 a28 a29 a30  a31 a32 a33 a34 a35  a36 a37 a40";
const ORIGINAL = { sections: "Alpha,Beta,Gamma,Delta,Epsilon,Zeta,Eta,Theta", wheel: ways(`${ALPHA} ${BETA} ${GAMMA} ${DELTA} ${REST}`) };
const GAMMA_UP = { sections: "Alpha,Gamma,Beta,Delta,Epsilon,Zeta,Eta,Theta", wheel: ways(`${ALPHA} ${GAMMA} ${BETA} ${DELTA} ${REST}`) };
const DELTA_TO_2ND = { sections: "Alpha,Delta,Beta,Gamma,Epsilon,Zeta,Eta,Theta", wheel: ways(`${ALPHA} ${DELTA} ${BETA} ${GAMMA} ${REST}`) };

// ---- helpers ----
async function openCatalogue(lang, width, { extra = "", height = 900 } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height }, extraSeedJs: seedJs() + extra });
  const { page, errors } = await openPage(ctx, "/app/catalogue.html");
  await page.waitForFunction(() => document.querySelectorAll("#trackablesBody tr").length > 0, null, { timeout: 15000 });
  await page.click('[data-cat-tab="approaches"]');
  const base = await page.evaluate(() => (window.__stubWriteData || []).length);
  return { ctx, page, errors, base };
}
const writesSince = (page, base) => page.evaluate((b) => window.__stubWriteData.slice(b), base);
const sectionWrites = (writes) => writes.filter((w) => w.col === "tenants" && w.data?.approachSections);
const savedOrder = (writes) => sectionWrites(writes).at(-1)?.data.approachSections.map((s) => s.name.en).join(",");
const editorOrder = (page) => page.evaluate(() => [...document.querySelectorAll('.secNameInput[data-lang="en"]')].map((e) => e.value).join(","));
const listOrder = (page) => page.evaluate(() => [...document.querySelectorAll("#trackablesBody tr.trk-section-heading strong")].map((e) => e.textContent.trim()).join(","));
const SHOWN_IDS_JS = `[...document.querySelectorAll("#trackablesBody tr[id^='trk-row-'][data-sec-key]")].filter((r) => r.offsetHeight > 0).map((r) => r.id.slice(8))`;
const rowsShown = (page) => page.evaluate(`${SHOWN_IDS_JS}.length`);
const idsShown = (page) => page.evaluate(`${SHOWN_IDS_JS}.sort().join(",")`);
const centre = (page, sel) => page.locator(sel).evaluate((el) => el.scrollIntoView({ block: "center" }));

/** The wheel a SECOND page draws once the recorded writes are in its data. */
async function landingAfter(writes, width = 1100) {
  const patch = `for (const w of ${JSON.stringify(writes)}) { if (w.kind !== "batch-update" && w.kind !== "update") continue; const row = (DATA[w.col] || []).find((d) => d._id === w.id); if (row) Object.assign(row, w.data); }`;
  const ctx = await newContext(browser, { viewport: { width, height: 900 }, extraSeedJs: seedJs() + patch });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelectorAll(".wheel-seg").length > 0 && document.querySelectorAll(".ways-list .way-row").length > 0, null, { timeout: 15000 });
  const out = await page.evaluate(() => ({
    wheel: [...document.querySelectorAll(".wheel-seg-name")].map((e) => e.textContent.trim()),
    nums: [...document.querySelectorAll(".wheel-seg-num")].map((e) => e.textContent.trim()).join(","),
    list: [...document.querySelectorAll(".ways-list .way-row .name")].map((e) => e.textContent.trim()),
    // #400 put a caret and a count badge into each landing heading; read the
    // NAME only (updated in place, 29 Sep 2026).
    groups: [...document.querySelectorAll(".ways-list .ways-group")].map((e) => { const n = e.querySelector(".ways-group-name"); if (!n) return e.textContent.trim(); const c = n.cloneNode(true); c.querySelector(".ways-count")?.remove(); return c.textContent.trim(); }).join(","), // #407: the count box is inside the name now; read the name without it
  }));
  await ctx.close();
  return out;
}
const sameArr = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function mouseDrag(page, fromSel, toSel, { frac = 0.15, steps = 8, dropAtStart = false, escape = false } = {}) {
  await centre(page, fromSel);
  const a = await page.locator(fromSel).boundingBox();
  const b = await page.locator(toSel).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  const ty = dropAtStart ? a.y + a.height / 2 + 2 : b.y + b.height * frac;
  await page.mouse.move(a.x + a.width / 2, ty, { steps });
  await page.waitForTimeout(80);
  const marks = await page.evaluate(() => document.querySelectorAll(".sec-drop-before, .sec-drop-after").length);
  if (escape) await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.waitForTimeout(500);
  return marks;
}

async function touchDrag(page, fromSel, toSel, { frac = 0.15 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await centre(page, fromSel);
  const a = await page.locator(fromSel).boundingBox();
  const b = await page.locator(toSel).boundingBox();
  const x = a.x + a.width / 2, y0 = a.y + a.height / 2, y1 = b.y + b.height * frac;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0, id: 1 }] });
  for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 8, id: 1 }] });
  await page.waitForTimeout(80);
  const marks = await page.evaluate(() => document.querySelectorAll(".sec-drop-before, .sec-drop-after").length);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(500);
  return marks;
}

// =========================================================== 1. move -> wheel
console.log("\n=== 1. a section move saves at once and reaches the wheel ===");
{
  const { ctx, page, base } = await openCatalogue("en", 1100);
  check("seed: the editor starts in the original order", await editorOrder(page) === ORIGINAL.sections, await editorOrder(page));
  const before = await landingAfter([]);
  check("seed: the landing wheel starts in the hand-written original order", sameArr(before.wheel, ORIGINAL.wheel), before.wheel.join(","));
  check("seed: 40 slices, numbered 1..40 in order", before.wheel.length === 40 && before.nums === Array.from({ length: 40 }, (_, i) => i + 1).join(","));

  await page.click('.secUpBtn[data-i="2"]'); // Gamma up -- NO Save pressed
  await page.waitForFunction((b) => window.__stubWriteData.length > b, base, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  const w = await writesSince(page, base);
  check("(a) moving a section writes at once, with no Save pressed", savedOrder(w) === GAMMA_UP.sections, String(savedOrder(w)));
  check("...the editor and the Approach list show the new order", await editorOrder(page) === GAMMA_UP.sections && await listOrder(page) === GAMMA_UP.sections);
  const moved = w.filter((x) => x.col === "trackables").map((x) => x.id.slice(4)).sort().join(",");
  check("...exactly Beta's and Gamma's Approaches were rewritten, the two name-matched ones included",
    moved === "a06,a07,a08,a09,a10,a11,a12,a13,a14,a15", moved);
  const a07 = w.find((x) => x.id === "t1__a07")?.data, a12 = w.find((x) => x.id === "t1__a12")?.data;
  check("...name-matched a07 (no group) and a12 (group 9) now carry their section's real number",
    a07?.group === 3 && a07?.groupName?.en === "Beta" && a12?.group === 2 && a12?.groupName?.en === "Gamma", JSON.stringify([a07, a12]));

  const landing = await landingAfter(w);
  check("(b) the landing wheel's slices follow the new section order (hand-written)", sameArr(landing.wheel, GAMMA_UP.wheel), landing.wheel.join(","));
  check("(b) the wheel numbers are still 1..40 in order", landing.nums === Array.from({ length: 40 }, (_, i) => i + 1).join(","));
  check("(b) the landing Approach list follows it too", sameArr(landing.list, GAMMA_UP.wheel), landing.list.join(","));
  check("(b) ...and its section headings", landing.groups === GAMMA_UP.sections, landing.groups);
  await ctx.close();
}

// ================================================ 2. typed name stays unsaved
console.log("\n=== 2. a typed name is not saved by a move, and says so ===");
for (const lang of ["en", "bn"]) {
  const { ctx, page, base } = await openCatalogue(lang, 1100);
  const note = () => page.evaluate(() => document.getElementById("sectionsDirtyNote")?.textContent.trim() ?? null);
  check(`[${lang}] no unsaved-name note at first`, await note() === "", String(await note()));
  await page.fill('.secNameInput[data-i="1"][data-lang="en"]', "Beta Typed");
  const want = lang === "en" ? "Name changes not saved yet." : "নামের পরিবর্তন এখনো সংরক্ষিত হয়নি।";
  check(`[${lang}] typing a name shows "${want}" beside Save`, await note() === want, String(await note()));
  const noteOk = await page.evaluate(() => {
    const n = document.getElementById("sectionsDirtyNote").getBoundingClientRect(), b = document.getElementById("saveSectionsBtn").getBoundingClientRect();
    return Math.abs(n.top - b.bottom) < 60;
  });
  check(`[${lang}] ...right next to the Save button`, noteOk);
  await page.click('.secUpBtn[data-i="3"]'); // Delta up, over Gamma
  await page.waitForTimeout(600);
  const w = await writesSince(page, base);
  check(`[${lang}] the move saved the ORDER with the STORED names (not "Beta Typed")`,
    savedOrder(w) === "Alpha,Beta,Delta,Gamma,Epsilon,Zeta,Eta,Theta", String(savedOrder(w)));
  check(`[${lang}] the typed name is still in its field, and the note still shows`,
    await page.inputValue('.secNameInput[data-i="1"][data-lang="en"]') === "Beta Typed" && await note() === want);
  await page.click("#saveSectionsBtn");
  await page.waitForTimeout(600);
  const w2 = await writesSince(page, base);
  check(`[${lang}] Save sections then writes the typed name`, savedOrder(w2) === "Alpha,Beta Typed,Delta,Gamma,Epsilon,Zeta,Eta,Theta", String(savedOrder(w2)));
  check(`[${lang}] ...and the note clears`, await note() === "");
  await ctx.close();
}

// ============================================================ 3. collapsible
console.log("\n=== 3. section headings: collapsible, collapsed by default ===");
for (const lang of ["en", "bn"]) {
  const { ctx, page, base } = await openCatalogue(lang, 1100);
  const heads = () => page.evaluate(() => [...document.querySelectorAll("#trackablesBody .trk-sec-toggle")].map((b) => ({ e: b.getAttribute("aria-expanded"), h: b.getBoundingClientRect().height, tag: b.tagName })));
  let h = await heads();
  check(`[${lang}] 8 real buttons, all aria-expanded=false, each >=40px tall`, h.length === 8 && h.every((x) => x.tag === "BUTTON" && x.e === "false" && x.h >= 40), JSON.stringify(h));
  check(`[${lang}] collapsed by default: no Approach row is on screen`, await rowsShown(page) === 0, String(await rowsShown(page)));
  const caret = await page.evaluate(() => document.querySelector(".trk-sec-caret").textContent);
  check(`[${lang}] the caret reads ▸ when closed`, caret === "▸");
  await page.click('.trk-sec-toggle[data-sec-key="n3"]');
  check(`[${lang}] tapping Gamma opens exactly its 5 rows`, await rowsShown(page) === 5);
  const g = await idsShown(page);
  check(`[${lang}] ...a11,a12,a13,a14,a15`, g === "a11,a12,a13,a14,a15", g);
  check(`[${lang}] ...caret ▾, aria-expanded=true`, await page.evaluate(() => { const b = document.querySelector('.trk-sec-toggle[data-sec-key="n3"]'); return b.getAttribute("aria-expanded") === "true" && b.querySelector(".trk-sec-caret").textContent === "▾"; }));
  await page.click("#openAllSectionsBtn");
  check(`[${lang}] Open all shows all 40`, await rowsShown(page) === 40, String(await rowsShown(page)));
  const bh = await page.evaluate(() => [document.getElementById("openAllSectionsBtn"), document.getElementById("closeAllSectionsBtn")].map((b) => b.getBoundingClientRect().height));
  check(`[${lang}] Open all / Close all are >=40px tall`, bh.every((x) => x >= 40), bh.join(","));
  await page.click("#closeAllSectionsBtn");
  check(`[${lang}] Close all hides them again`, await rowsShown(page) === 0);
  // survives an in-place edit / move
  await page.click('.trk-sec-toggle[data-sec-key="n3"]');
  await page.click('#trk-row-a11 .trkDownBtn');
  await page.waitForTimeout(700);
  check(`[${lang}] the open state survives an Approach move (Gamma still open, others closed)`, await rowsShown(page) === 5);
  await page.click('.secUpBtn[data-i="3"]'); // Delta up
  await page.waitForTimeout(700);
  check(`[${lang}] ...and a section move (Gamma is still the open one, now under a new number)`,
    await idsShown(page) === "a11,a12,a13,a14,a15");
  // Edit opens its own section though hidden
  await page.click("#closeAllSectionsBtn");
  await page.evaluate(() => document.querySelector("#trk-row-a22 .editTrkBtn").click());
  await page.waitForTimeout(300);
  check(`[${lang}] Edit on a Approach opens the section it is in`, await page.evaluate(() => { const r = document.querySelector("#trk-row-a22"); return r.offsetHeight > 0 && !!r.querySelector(".trkNameInput"); }));
  await ctx.close();
}

// ============================================================ 4. drag: mouse
console.log("\n=== 4. dragging sections: mouse ===");
{
  const { ctx, page, base } = await openCatalogue("en", 1100);
  const marks = await mouseDrag(page, 'tr.trk-section-heading[data-sec-i="3"] .secDragHandle', 'tr.trk-section-heading[data-sec-i="1"]');
  const w = await writesSince(page, base);
  check("a drop indicator is shown while dragging", marks === 1, String(marks));
  check("dragging Delta from the list heading to above Beta saves at once", savedOrder(w) === DELTA_TO_2ND.sections, String(savedOrder(w)));
  check("...and the editor and list follow", await editorOrder(page) === DELTA_TO_2ND.sections && await listOrder(page) === DELTA_TO_2ND.sections);
  const landing = await landingAfter(w);
  check("...and the landing wheel follows (hand-written order)", sameArr(landing.wheel, DELTA_TO_2ND.wheel), landing.wheel.join(","));
  check("...the drag left no marks or grabbing cursor behind", await page.evaluate(() => !document.body.classList.contains("sec-dragging") && !document.querySelector(".sec-drag-source, .sec-drop-before, .sec-drop-after")));
  await ctx.close();
}
{
  const { ctx, page, base } = await openCatalogue("en", 1100);
  await mouseDrag(page, 'tr.sec-row[data-sec-i="3"] .secDragHandle', 'tr.sec-row[data-sec-i="1"]');
  const w = await writesSince(page, base);
  check("dragging in the Sections EDITOR works too", savedOrder(w) === DELTA_TO_2ND.sections, String(savedOrder(w)));
  await ctx.close();
}
{
  const { ctx, page, base } = await openCatalogue("en", 1100);
  await mouseDrag(page, 'tr.trk-section-heading[data-sec-i="3"] .secDragHandle', 'tr.trk-section-heading[data-sec-i="1"]', { escape: true });
  check("Escape mid-drag writes nothing and changes nothing", (await writesSince(page, base)).length === 0 && await editorOrder(page) === ORIGINAL.sections);
  check("...and clears the drop marks", await page.evaluate(() => !document.querySelector(".sec-drag-source, .sec-drop-before, .sec-drop-after")));
  await mouseDrag(page, 'tr.trk-section-heading[data-sec-i="3"] .secDragHandle', 'tr.trk-section-heading[data-sec-i="3"]', { dropAtStart: true });
  check("dropping back where it started writes nothing", (await writesSince(page, base)).length === 0 && await editorOrder(page) === ORIGINAL.sections);
  // A plain tap on the handle, and a tap on the heading text, must not move anything; the tap toggles.
  await page.click('tr.trk-section-heading[data-sec-i="3"] .secDragHandle');
  check("a tap on the handle moves nothing and does not toggle", (await writesSince(page, base)).length === 0 && await rowsShown(page) === 0);
  await page.click('tr.trk-section-heading[data-sec-i="3"] .trk-sec-toggle');
  check("a tap on the heading toggles it and writes nothing", (await writesSince(page, base)).length === 0 && await rowsShown(page) === 5);
  await ctx.close();
}

// ============================================================ 4b. drag: touch
console.log("\n=== 4b. dragging sections: a finger (touch pointer events) ===");
{
  const { ctx, page, base } = await openCatalogue("en", 390, { height: 1400 });
  const kinds = await page.evaluate(() => { window.__ptypes = []; document.addEventListener("pointerdown", (e) => window.__ptypes.push(e.pointerType), true); return 1; });
  const marks = await touchDrag(page, 'tr.trk-section-heading[data-sec-i="3"] .secDragHandle', 'tr.trk-section-heading[data-sec-i="1"]');
  const types = await page.evaluate(() => window.__ptypes);
  const w = await writesSince(page, base);
  check("the drag really was a touch pointer", types.includes("touch"), JSON.stringify(types));
  check("touch: a drop indicator is shown", marks === 1, String(marks));
  check("touch: dragging Delta above Beta saves at once", savedOrder(w) === DELTA_TO_2ND.sections, String(savedOrder(w)));
  const landing = await landingAfter(w, 390);
  check("touch: the landing wheel follows (hand-written order)", sameArr(landing.wheel, DELTA_TO_2ND.wheel), landing.wheel.join(","));
  await ctx.close();
}

// ================================================================ 5. a reader
console.log("\n=== 5. a reader sees no handles and no arrows ===");
{
  const ctx = await newContext(browser, { viewport: { width: 1100, height: 900 }, extraSeedJs: seedJs() + `DATA.tenantMemberUids[0].roles = ["student"]; DATA.tenantPeople[0].roles = ["student"];` });
  const { page } = await openPage(ctx, "/app/catalogue.html");
  await page.waitForFunction(() => document.querySelectorAll("#trackablesBody tr").length > 0, null, { timeout: 15000 });
  await page.click('[data-cat-tab="approaches"]');
  const r = await page.evaluate(() => ({ handles: document.querySelectorAll(".secDragHandle").length, arrows: document.querySelectorAll(".secUpBtn, .secDownBtn").length, toggles: document.querySelectorAll(".trk-sec-toggle").length }));
  check("no drag handles, no ▲▼ for a reader", r.handles === 0 && r.arrows === 0, JSON.stringify(r));
  check("...but the headings still open and close for them", r.toggles === 8);
  await ctx.close();
}

// ================================================================ 6. layout
console.log("\n=== 6. layout, both languages, every width ===");
for (const lang of ["en", "bn"]) {
  for (const width of [320, 360, 390, 412, 768, 1280]) {
    const { ctx, page } = await openCatalogue(lang, width, { height: 1000 });
    const m = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const heads = [...document.querySelectorAll("#trackablesBody tr.trk-section-heading")];
      const rects = heads.map((tr) => ({ h: tr.querySelector(".secDragHandle").getBoundingClientRect(), t: tr.querySelector(".trk-sec-toggle").getBoundingClientRect(), c: tr.querySelector(".trk-sec-toggle").scrollWidth - tr.querySelector(".trk-sec-toggle").clientWidth }));
      const tools = [...document.querySelectorAll(".sec-list-tools button")].map((b) => b.getBoundingClientRect());
      const eds = [...document.querySelectorAll("#sectionsBody tr.sec-row .row-actions button")].map((b) => b.getBoundingClientRect());
      return {
        sideways: document.documentElement.scrollWidth - vw,
        handleOk: rects.every((r) => r.h.width >= 40 && r.h.height >= 40 && r.h.left >= 0),
        toggleOk: rects.every((r) => r.t.height >= 40 && r.t.right <= vw + 0.5 && r.c <= 1),
        oneLine: rects.every((r) => Math.abs((r.h.top + r.h.height / 2) - (r.t.top + r.t.height / 2)) < 30),
        toolsOk: tools.every((r) => r.height >= 40 && r.right <= vw + 0.5 && r.left >= 0),
        editorOk: eds.length === 8 * 3 && eds.every((r) => r.right <= vw + 0.5 && r.left >= 0 && r.width >= 20),
        count: heads.length,
      };
    });
    const tag = `[${lang} ${width}px]`;
    check(`${tag} page does not scroll sideways`, m.sideways <= 1, String(m.sideways));
    check(`${tag} heading: handle >=40px, toggle >=40px, all inside the screen, text not cut`, m.handleOk && m.toggleOk, JSON.stringify(m));
    check(`${tag} heading handle and toggle share one line`, m.oneLine);
    check(`${tag} Open all / Close all >=40px and on screen`, m.toolsOk);
    check(`${tag} editor handle + ▲▼ inside the screen`, m.editorOk);
    if (width === 390 || width === 1280) {
      await centre(page, 'tr.trk-section-heading[data-sec-i="3"]');
      await page.screenshot({ path: `${SHOTS}/collapsed-${lang}-${width}.png` });
      // a drag in progress
      const a = await page.locator('tr.trk-section-heading[data-sec-i="3"] .secDragHandle').boundingBox();
      const b = await page.locator('tr.trk-section-heading[data-sec-i="1"]').boundingBox();
      await page.mouse.move(a.x + 20, a.y + 20);
      await page.mouse.down();
      await page.mouse.move(a.x + 20, b.y + 4, { steps: 6 });
      await page.screenshot({ path: `${SHOTS}/dragging-${lang}-${width}.png` });
      await page.mouse.up();
    }
    await ctx.close();
  }
}

console.log(`\n==== Catalogue sections (#399): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
