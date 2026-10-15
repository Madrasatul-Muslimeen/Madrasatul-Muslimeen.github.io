// Audit part 8 (PCF J29 follow-on, #858): measured on the rendered page, en/bn x 320 / 390 / 820 / 1440.
//  - journey-map Trash: the "← Back" button is >= 40px (it was 21px).
//  - QCR collections (Explore -> QCR): collection and Approach pickers, the ⋯ button, each āyah row's jump button, the
//    Move-to picker, the remove button and the add-āyah form are all >= 40px (they were 20-36px).
// Each flow has a POSITIVE CONTROL (the surface really rendered the controls) and a timeout that fails by name.
// Mutations: --mutate=<name> restores one defect and must make this suite FAIL.
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
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const QR = ["app/quranrevival.html", "**/quranrevival.html*"];
const JM = ["app/journey-map.html", "**/journey-map.html*"];
const MUTATIONS = {
  "trashback": [...JM, "min-height: 40px; } /* audit8 trashback */", "min-height: 0; } /* audit8 trashback */"],
  "qcrselects": [...QR, "min-height: 40px; } /* audit8 qcrselects */", "min-height: 0; } /* audit8 qcrselects */"],
  "qcrpalette": [...QR, "width: 40px; height: 40px; } /* audit8 qcrpalette */", "} /* audit8 qcrpalette */"],
  "qcrjump": [...QR, "min-height: 40px; } /* audit8 qcrjump */", "min-height: 0; } /* audit8 qcrjump */"],
  "qcrmove": [...QR, "min-height: 40px; } /* audit8 qcrmove */", "min-height: 0; } /* audit8 qcrmove */"],
  "qcrremove": [...QR, "width: 40px; height: 40px; } /* audit8 qcrremove */", "} /* audit8 qcrremove */"],
  "qcradd": [...QR, "min-height: 40px; } /* audit8 qcradd */", "min-height: 0; } /* audit8 qcradd */"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const SEED = `
(function () {
  window.__stubApplyBatches = true;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts() { return { toDate: function () { return new Date("2026-09-01T10:00:00Z"); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = [];
  DATA.noteFolders.push(Object.assign({ _id: "t1__fA", folderId: "fA", name: "Alpha", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts() }, own));
})();`;
const browser = await chromium.launch();

async function open(url, lang, width, extraSeedJs = null) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 }, extraSeedJs });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page } = await openPage(ctx, url);
  await page.waitForTimeout(1500);
  return { ctx, page };
}
const sizes = (page, sels) => page.evaluate((sels) => {
  const out = {};
  for (const s of sels) {
    out[s] = [...document.querySelectorAll(s)].filter((e) => {
      const b = e.getBoundingClientRect(); if (!b.width || !b.height) return false;
      for (let p = e; p; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === "none" || c.visibility === "hidden") return false; }
      return true;
    }).map((e) => { const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height * 10) / 10 }; });
  }
  return out;
}, sels);
function tall(tag, out, sels, min = 40) {
  for (const s of sels) {
    const list = out[s];
    check(`${tag}: POSITIVE CONTROL ${s} is on screen`, list.length > 0);
    const bad = list.filter((x) => x.h < min - 0.5);
    check(`${tag}: ${s} >= ${min}px tall`, bad.length === 0, bad.map((x) => `${x.w}x${x.h}`).join(", "));
  }
}
const click = (page, id) => page.evaluate((id) => document.getElementById(id).click(), id);

async function flow(tag, url, seed, fn) {
  const [lang, width] = tag.split(" ");
  let ctx;
  try {
    const o = await Promise.race([open(url, lang, parseInt(width), seed), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 60000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await ctx.close().catch(() => {});
}

for (const lang of ["en", "bn"]) for (const width of [320, 390, 820, 1440]) {
  const tag = `${lang} ${width}px`;
  await flow(`${tag} journey-trash`, "/app/journey-map.html", SEED, async (t, page) => {
    await page.waitForSelector(".folder-row[data-folder-id]", { timeout: 8000 });
    check(`${t}: POSITIVE CONTROL the seeded folder rendered`, (await page.locator(".folder-row[data-folder-id]").count()) > 0);
    await page.evaluate(() => document.querySelector(".page-menu-wrap .bar-palette-toggle").click());
    await click(page, "openTrashBtn"); await page.waitForTimeout(800);
    tall(t, await sizes(page, ["#trashBackBtn"]), ["#trashBackBtn"]);
  });
  await flow(`${tag} qcr-collections`, "/app/quranrevival.html", null, async (t, page) => {
    await click(page, "tabExploreBtn"); await page.waitForTimeout(700);
    await click(page, "explorePaletteQcrBtn"); await page.waitForTimeout(900);
    const S = ["#qcrLevelSelect", "#qcrApproachSelect", "#qcrPaletteBtn", ".qcr-way-row .way-click", ".qcr-way-manage select",
      ".qcr-way-manage .qcr-icon-btn", "#qcrAddSurahSelect", "#qcrAddAyahInput", "#qcrAddItemBtn"];
    tall(t, await sizes(page, S), S);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`${t}: nothing scrolls sideways (${over})`, over <= 0);
  });
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
