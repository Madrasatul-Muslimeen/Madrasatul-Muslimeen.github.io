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
import { chromium, newContext, openPage, clickReadTool } from "./harness.mjs";
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
  // REPLACED (debt round, 11 Nov 2026): "rnpback" targeted js/read-note-pane.js, whose pane no longer opens from the Read bar, so it passed under its own mutation (UNPROVEN).
  // These three break the controls the Notes window really has now, and each makes a named check fail.
  "jtclose": ["app/js/journey-tray.js", "**/js/journey-tray.js*", ".jt-close { flex: 0 0 auto; min-width: 44px; min-height: 44px;", ".jt-close { flex: 0 0 auto; min-width: 0; min-height: 0; padding: 0; width: 24px; height: 24px;"],
  "minbtn": ["app/js/minimise.js", "**/js/minimise.js*", ".mm-min-btn { flex: 0 0 auto; margin-inline-start: auto; min-width: 40px; min-height: 40px; padding: 0;", ".mm-min-btn { flex: 0 0 auto; margin-inline-start: auto; min-width: 0; min-height: 0; width: 24px; height: 24px; padding: 0;"],
  "panebtn": ["app/journey-map.html", "**/journey-map.html*", "html.pane-tabs-hosted #notePane .note-pane-bar .pane-btn { min-width: 40px; min-height: 40px;", "html.pane-tabs-hosted #notePane .note-pane-bar .pane-btn { min-width: 0; min-height: 0; padding: 0 4px; height: 26px;"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

async function open(url, lang, width, seed) {
  // legacyTools: drives the retired ⋯ path (PCF MSA J114 ONE menu; measured against main: loses checks without it)
  const ctx = await newContext(browser, { legacyTools: true, appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 }, extraSeedJs: seed });
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

// The Read bar's Notes tile opens the Notes PANE only when the āyah already has a Note (otherwise it starts a new one). Seed a Note started on āyah 2:256 (the same seed as read-note-pane-browser) and read it.
const NOTEPANE_SEED = `
window.__stubApplyBatches = true; window.__stubRecordTxData = true;
const TS = "2026-01-01T00:00:00.000Z", own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: "test-uid" };
DATA.notes = [...(DATA.notes ?? []), { _id: "t1__n256", noteId: "n256", ...own, title: "Started on 2:256", bodyHtml: "<p>No compulsion in religion.</p>", status: "active", visibility: "private", currentRevisionId: "n256-r1" }];
DATA.noteSources = [...(DATA.noteSources ?? []), { _id: "t1__s256", sourceLinkId: "s256", ...own, noteId: "n256", sourceKey: "ayah:2:256", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active" }];`;
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
    // UPDATED IN PLACE, MSA · QR J132 (the Owner, 10 Nov 2026: "Study moves to dot"): the three buttons are tiles in the ⋮ sheet's Study group at every
    // width (earlier: the ⋯ card below 600px, the bar from 600px). The ⋮ is opened first, as a reader does; the tiles are measured there.
    await page.evaluate(() => { if (!document.querySelector("#readQuickMenuSlot .quick-menu")?.classList.contains("open")) document.querySelector("#readQuickMenuSlot .ayah-quick-btn")?.click(); });
    await page.waitForTimeout(300);
    const S = ['#readQuickMenuSlot [data-qm-act="approach"]', '#readQuickMenuSlot [data-qm-act="record"]', '#readQuickMenuSlot [data-qm-act="status"]', "#readUnitChip"];
    tall(tag, await sizes(page, S), S);
  },
  async notepane(tag, page) {
    // UPDATED IN PLACE, MSA · QR J108 (one shared Note opener, v13.01) + v14.09 (the Read bar's Notes is a tile of the ⋮ sheet), found by the debt round, 11 Nov 2026:
    // the Study menu's Note tab now opens the shared "New note" window, not the Notes pane, so this flow measured nothing (every .rnp-* control "not on screen").
    // The Notes pane the check is about opens from the Read bar's Notes (a tile of the ⋮ sheet); the harness's clickReadTool opens it the way a reader does.
    await click(page, "tabStudyBtn"); await click(page, "tabReadBtn"); await page.waitForTimeout(1200);
    await page.evaluate(() => { const s = document.getElementById("surahSelect"); if (s.value !== "2") { s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
    await page.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "256"; el.dispatchEvent(new Event("change", { bubbles: true })); }); await page.waitForTimeout(900);
    await clickReadTool(page, "#readNotesBtn"); await page.waitForSelector("#readNotePane", { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(900);
    // Updated in place for PCF MSA J71/J72: on a computer the Notes window opens at the home size and its Notes / Track
    // tabs are drawn by the page inside, on its tools row (.jm-host-tab in the frame); measured there, at the same 40px.
    await page.waitForTimeout(1200);
    // UPDATED IN PLACE again (debt round, 11 Nov 2026): the Notes pane (#readNotePane with .rnp-back / .rnp-close / .rnp-tab) is gone. A āyah's Notes open in the
    // shared Mapping My Journey window: its title bar has ➖ (.mm-min-btn) and ✕ (.jt-close), and the page inside (journey-map.html?embed=1) has the ← Back,
    // ‹ ›, ✚, Edit and ⋯ buttons (.pane-btn, .folder-menu-btn). The same promise is measured there: every control a finger presses is at least 40px tall,
    // and the window's ✕ is inside the screen.
    await page.waitForSelector(".jt-frame", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(900);
    const S = [".mm-min-btn", ".jt-close"];
    const r = await sizes(page, S);
    tall(tag, r, S);
    const fr = page.frames().find((f) => /journey-map\.html\?embed=1/.test(f.url()));
    await fr?.waitForFunction(() => document.querySelector(".pane-btn")?.getBoundingClientRect().height > 0, null, { timeout: 15000 }).catch(() => {});
    const inner = fr ? await fr.evaluate(() => [...document.querySelectorAll(".pane-btn, .folder-menu-btn")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => ({ t: e.textContent.trim().slice(0, 8), h: Math.round(e.getBoundingClientRect().height * 10) / 10 }))) : [];
    check(`${tag}: POSITIVE CONTROL the Notes window's page shows its buttons (${inner.length})`, inner.length >= 4, JSON.stringify(inner));
    check(`${tag}: those buttons >= 40px tall`, inner.every((x) => x.h >= 39.5), JSON.stringify(inner.filter((x) => x.h < 39.5)));
    const c = r.out[".jt-close"][0];
    check(`${tag}: Note window close button inside the screen (right ${c && Math.round(c.r)} of ${r.vw})`, !!c && c.r <= r.vw + 1 && c.l >= -1);
  },
  async explore(tag, page) {
    await click(page, "tabExploreBtn"); await page.waitForTimeout(900);
    const S = ["#explorePaletteQuranBtn", "#explorePaletteQcrBtn", ".explore-crumb", "#exploreViewPrimaryBtn", "#exploreApproachBtn"];
    tall(tag, await sizes(page, S), S);
  },
};
async function pageFlow(tag, url, check_, seed) {
  const [lang, width] = tag.split(" ");
  let ctx;
  try {
    const o = await Promise.race([open(url, lang, parseInt(width), seed), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([check_(tag, o.page), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 60000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await ctx.close().catch(() => {});
}
for (const lang of ["en", "bn"]) for (const width of [390, 820, 1440]) {
  const tag = `${lang} ${width}px`;
  for (const [name, fn] of Object.entries(FLOWS)) await pageFlow(`${tag} qr-${name}`, "/app/quranrevival.html", fn, name === "notepane" ? NOTEPANE_SEED : undefined);
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
for (const lang of ["en", "bn"]) await pageFlow(`${lang} 320px qr-notepane`, "/app/quranrevival.html", FLOWS.notepane, NOTEPANE_SEED);
// v10.66: the wheel pill is smallest on a 320px phone, where its drawn height is furthest below 40px.
for (const lang of ["en", "bn"]) await pageFlow(`${lang} 320px landing`, "/app/quranrevival.html", FLOWS.landing);
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
