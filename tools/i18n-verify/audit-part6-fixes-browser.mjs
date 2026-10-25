// Audit part 6 (PCF J29 follow-on, #853): measured on the rendered page, en/bn x 390 / 820 / 1440.
//  - landing: the wheel's "Take an Approach" pill is >= 40px tall.
//  - read: the Read bar's three buttons and the unit chip are >= 40px.
//  - note-pane: the Note window's bar fits the screen (close button inside it) and its tabs are >= 40px.
//  - explore: palette, view buttons, breadcrumb and the Approach capsule are >= 40px.
//  - notes-page / bookmarks-page: each really renders content (positive control); "+ New Note" is >= 40px.
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
const MUTATIONS = {
  "cta": [...QR, "top: min(0px, calc(50% - 20px)); bottom: min(0px, calc(50% - 20px)); } /* audit6 cta */", "} /* audit6 cta */"],
  "barbtn": [...QR, "min-height: 40px; /* audit6 barbtn */", "min-height: 0; /* audit6 barbtn */"],
  "unitchip": [...QR, "min-height: 40px; /* audit6 unitchip */", "min-height: 0; /* audit6 unitchip */"],
  "capsule": [...QR, "min-height: 40px; box-sizing: border-box; /* audit6 capsule */", "min-height: 0; box-sizing: border-box; /* audit6 capsule */"],
  "palette": [...QR, "min-height: 40px; /* audit6 palette */", "min-height: 0; /* audit6 palette */"],
  "viewbtn": [...QR, "min-height: 40px; /* audit6 viewbtn */", "min-height: 0; /* audit6 viewbtn */"],
  "crumb": [...QR, "min-height: 40px; /* audit6 crumb */", "min-height: 0; /* audit6 crumb */"],
  "newnote": ["app/notes.html", "**/notes.html*", "min-height: 40px; } /* audit6 newnote */", "} /* audit6 newnote */"],
  "rnpback": ["app/js/read-note-pane.js", "**/js/read-note-pane.js*", "flex: 0 1 auto; min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; /* audit6 rnpback */", "flex: 0 0 auto;"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

async function open(url, lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html", body: body.split(from).join(to) }));
  }
  const { page } = await openPage(ctx, url);
  await page.waitForTimeout(1500);
  return { ctx, page };
}
// every visible element matching one of the selectors, with its rendered size
const sizes = (page, sels) => page.evaluate((sels) => {
  const out = {};
  for (const s of sels) {
    out[s] = [...document.querySelectorAll(s)].filter((e) => {
      const b = e.getBoundingClientRect(); if (!b.width || !b.height) return false;
      for (let p = e; p; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === "none" || c.visibility === "hidden") return false; }
      return true;
    }).map((e) => { const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height * 10) / 10, r: b.right, l: b.left }; });
  }
  return { out, vw: innerWidth };
}, sels);
function tall(tag, r, sels, min = 40) {
  for (const s of sels) {
    const list = r.out[s];
    check(`${tag}: POSITIVE CONTROL ${s} is on screen`, list.length > 0);
    const bad = list.filter((x) => x.h < min - 0.5);
    check(`${tag}: ${s} >= ${min}px tall`, bad.length === 0, bad.map((x) => `${x.w}x${x.h}`).join(", "));
  }
}
const click = (page, id) => page.evaluate((id) => document.getElementById(id).click(), id);

const FLOWS = {
  // Updated in place (v10.66, J29 item 16): the pill keeps its drawn size so it stays inside the
  // hub on a small phone (wheel-centre-browser); the 40px is its TAP AREA. So measure what a finger
  // gets: the pill is on screen (positive control), and the page answers a tap 19.5px above and
  // below the pill's centre with the pill itself (elementFromPoint), whatever its drawn height.
  async landing(tag, page) {
    const r = await page.evaluate(() => {
      const b = document.getElementById("wheelCtaBtn"), q = b.getBoundingClientRect();
      const x = q.left + q.width / 2, y = q.top + q.height / 2;
      const hit = (yy) => { const e = document.elementFromPoint(x, yy); return !!e && (e === b || b.contains(e)); };
      return { w: q.width, h: q.height, up: hit(y - 19.5), down: hit(y + 19.5) };
    });
    check(`${tag}: POSITIVE CONTROL #wheelCtaBtn is on screen`, r.w > 0 && r.h > 0);
    check(`${tag}: #wheelCtaBtn answers a tap across 40px (drawn ${Math.round(r.h)}px)`, r.up && r.down, JSON.stringify(r));
  },
  async read(tag, page) {
    await click(page, "tabStudyBtn"); await click(page, "tabReadBtn"); await page.waitForTimeout(900);
    // PCF MSA J99 (the Owner, 25 Oct 2026: "put those 3 buttons inside the dots on the card"): below 600px the three are in
    // the ⋯ card, so it is opened first, as a reader does. Updated in place, reason recorded.
    if (await page.evaluate(() => !!document.querySelector("#readToolsMenu #readApproachBar"))) { await click(page, "readToolsBtn"); await page.waitForTimeout(250); }
    const S = ["#readBarTakeBtn", "#readBarRecordBtn", "#readBarStatusBtn", "#readUnitChip"];
    tall(tag, await sizes(page, S), S);
  },
  async notepane(tag, page) {
    await click(page, "tabStudyBtn"); await click(page, "tabNoteBtn"); await page.waitForTimeout(900);
    // Updated in place for PCF MSA J71/J72: on a computer the Notes window opens at the home size and its Notes / Track
    // tabs are drawn by the page inside, on its tools row (.jm-host-tab in the frame); measured there, at the same 40px.
    await page.waitForTimeout(1200);
    const hosted = await page.evaluate(() => !!document.querySelector("#readNotePane.rnp-tabs-in-frame"));
    const S = hosted ? [".rnp-back", ".rnp-close"] : [".rnp-back", ".rnp-close", ".rnp-tab"];
    const r = await sizes(page, S);
    tall(tag, r, S);
    if (hosted) {
      const fr = page.frames().find((f) => /journey-map\.html\?embed=1/.test(f.url()));
      await fr?.waitForFunction(() => document.querySelector(".jm-host-tab")?.getBoundingClientRect().height > 0, null, { timeout: 15000 }).catch(() => {});
      const tabs = fr ? await fr.evaluate(() => [...document.querySelectorAll(".jm-host-tab")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => Math.round(e.getBoundingClientRect().height * 10) / 10)) : [];
      check(`${tag}: POSITIVE CONTROL the Notes window's tabs are on its tools row`, tabs.length >= 2, JSON.stringify(tabs));
      check(`${tag}: those tabs >= 40px tall`, tabs.every((h) => h >= 39.5), JSON.stringify(tabs));
    }
    const c = r.out[".rnp-close"][0];
    check(`${tag}: Note window close button inside the screen (right ${c && Math.round(c.r)} of ${r.vw})`, !!c && c.r <= r.vw + 1 && c.l >= -1);
  },
  async explore(tag, page) {
    await click(page, "tabExploreBtn"); await page.waitForTimeout(900);
    const S = ["#explorePaletteQuranBtn", "#explorePaletteQcrBtn", ".explore-crumb", "#exploreViewPrimaryBtn", "#exploreApproachBtn"];
    tall(tag, await sizes(page, S), S);
  },
};
async function pageFlow(tag, url, check_) {
  const [lang, width] = tag.split(" ");
  let ctx;
  try {
    const o = await Promise.race([open(url, lang, parseInt(width)), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([check_(tag, o.page), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 60000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await ctx.close().catch(() => {});
}
for (const lang of ["en", "bn"]) for (const width of [390, 820, 1440]) {
  const tag = `${lang} ${width}px`;
  for (const [name, fn] of Object.entries(FLOWS)) await pageFlow(`${tag} qr-${name}`, "/app/quranrevival.html", fn);
  await pageFlow(`${tag} notes-page`, "/app/notes.html?unit=ayah:2:255&label=Ayat", async (t, page) => {
    tall(t, await sizes(page, ["#newNoteBtn"]), ["#newNoteBtn"]);
  });
  await pageFlow(`${tag} bookmarks-page`, "/app/bookmarks.html", async (t, page) => {
    const n = await page.evaluate(() => document.body.innerText.length);
    const r = await sizes(page, ["button"]);
    check(`${t}: POSITIVE CONTROL bookmarks page renders (${n} chars, ${r.out.button.length} buttons)`, n > 200 && r.out.button.length > 2);
    const bad = r.out.button.filter((x) => x.h < 39.5);
    check(`${t}: every button >= 40px tall`, bad.length === 0, bad.map((x) => `${x.w}x${x.h}`).join(", "));
  });
}
// Added by the Architect's review (15 Oct 2026): on main the Notes window's ✕ ends at 359px on a 320px phone (the long
// "← Back to Surah 1, Bismillah"), while at 390px the title squeezes and the ✕ still fits, so the rnpback mutation could
// not fail at the three widths above. 320px is where the defect lives; measure it there in both languages.
for (const lang of ["en", "bn"]) await pageFlow(`${lang} 320px qr-notepane`, "/app/quranrevival.html", FLOWS.notepane);
// v10.66: the wheel pill is smallest on a 320px phone, where its drawn height is furthest below 40px.
for (const lang of ["en", "bn"]) await pageFlow(`${lang} 320px landing`, "/app/quranrevival.html", FLOWS.landing);
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
