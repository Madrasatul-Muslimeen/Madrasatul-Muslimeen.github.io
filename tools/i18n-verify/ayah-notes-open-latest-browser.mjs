// PCF MSA J114 follow-up (the Owner, 7 Nov 2026, "1(C).2.F"):
//   F: when an āyah already has Notes, the ⋮ sheet's Notes tile opens the LATEST Note in the Journey tray (not the old Notes pane), and a
//      "+ New Note" row beside it opens a blank Note through the shared Note opener. With no Note, the tile is "Take Note" and opens a new one.
//   C: on a unit wider than one āyah the sheet keeps a "Bookmark · <unit>" row for the whole unit; an āyah unit has none (the tile is it).
// Seeds: 2:255 has two Notes (n-old 1 Jan, n-new 5 Jan), 2:256 none. At 320/390/768/1280, en and bn.
//   --mutate=pane  the tile goes back to the Notes pane -> the tray checks fail.   --mutate=nounit  no unit row -> the C checks fail.   --mutate=nosync  the ⋮ never learns the āyah has Notes -> the F checks fail.
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error("promise"); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUTS = {
  pane: ["onOpenNote: (unitKey) => openLatestNoteFromMenu(unitKey),", "onOpenNote: (unitKey) => openNotesPaneForKey(unitKey),"],
  nounit: ["if (!info || info.unitType === \"ayah\") return null;", "return null;"],
  nosync: ["onMenuOpen: (unitKey, wrap) => { syncMenuNoteState(unitKey, wrap); },", ""],
};
if (MUTATE && !MUTS[MUTATE]) throw new Error("unknown mutation");
const T = (d) => `2026-01-0${d}T00:00:00.000Z`;
const mkNote = (id, d) => ({ _id: `t1__${id}`, noteId: id, tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", title: id, bodyHtml: `<p>${id}</p>`, status: "active", visibility: "private", currentRevisionId: `${id}-r1`, schemaVersion: 1, createdAt: T(d), updatedAt: T(d), createdBy: "test-uid" });
const mkSource = (id, noteId, key, d) => ({ _id: `t1__${id}`, sourceLinkId: id, tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", noteId, sourceKey: key, sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active", schemaVersion: 1, createdAt: T(d), updatedAt: T(d), createdBy: "test-uid" });
const SEED = `
DATA.notes = [...(DATA.notes ?? []), ${JSON.stringify([mkNote("n-old", 1), mkNote("n-new", 5)])}].flat();
DATA.noteSources = [...(DATA.noteSources ?? []), ${JSON.stringify([mkSource("s-old", "n-old", "ayah:2:255", 1), mkSource("s-new", "n-new", "ayah:2:255", 5)])}].flat();`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
for (const [lang, width] of [["en", 320], ["en", 390], ["bn", 390], ["en", 768], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) await ctx.route("**/app/quranrevival.html*", async (r) => { const res = await r.fetch(); const b = await res.text(); const [from, to] = MUTS[MUTATE]; if (b.split(from).length !== 2) throw new Error("anchor " + MUTATE); r.fulfill({ response: res, body: b.replace(from, to) }); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  // Whole sūrah 2 in the ONE-flow view: a ⋮ on every āyah, and the unit is wider than one āyah (C).
  await setSel(page, "unitTypeSelect", "surah"); await page.waitForTimeout(600);
  await setSel(page, "surahSelect", "2"); await page.waitForTimeout(1800);
  const openMenu = async (key) => {
    await page.evaluate((k) => { const w = document.querySelector(`#pageViewContainer .ayah-quick-wrap[data-unit-key="ayah:2:${k}"]`); w?.scrollIntoView({ block: "center" }); w?.querySelector("[data-qm-toggle]")?.click(); }, key);
    await page.waitForTimeout(600);
  };
  const sheet = (key) => page.evaluate((k) => { const m = document.querySelector(`#pageViewContainer .ayah-quick-wrap[data-unit-key="ayah:2:${k}"] .quick-menu.open`); if (!m) return null; const label = (sel) => m.querySelector(sel)?.textContent.trim() ?? null; return { note: label("[data-qm-note] .qm-label"), noteNew: m.querySelector("[data-qm-note]")?.hasAttribute("data-qm-note-new"), add: !!m.querySelector("[data-qm-note-add]"), unitRow: label("[data-qm-unit-bookmark]") }; }, key);
  // F: an āyah WITH Notes
  await openMenu(255);
  let s = await sheet(255);
  const N = lang === "bn" ? /নোট/ : /^Notes$/;
  check(`${tag} 2:255 (two Notes): the tile says Notes and a "+ New Note" row stands beside it`, !!s && N.test(s.note ?? "") && s.noteNew === false && s.add, JSON.stringify(s));
  await page.evaluate(() => document.querySelector('#pageViewContainer .ayah-quick-wrap[data-unit-key="ayah:2:255"] [data-qm-note]')?.click());
  await page.waitForFunction(() => { const t = document.getElementById("journeyTray"); return t && !t.hidden && (t.querySelector("iframe")?.getAttribute("src") ?? "").includes("note="); }, null, { timeout: 8000 }).catch(() => {});
  const tray = await page.evaluate(() => { const t = document.getElementById("journeyTray"); return { open: !!t && !t.hidden, src: t?.querySelector("iframe")?.getAttribute("src") ?? "", pane: document.getElementById("readNotePane")?.hidden === false }; });
  check(`${tag} the Notes tile opens the LATEST Note (n-new) in the Journey tray, not the old Notes pane`, tray.open && /note=n-new\b/.test(tray.src) && !tray.pane, JSON.stringify(tray));
  await page.evaluate(() => document.querySelector("#journeyTray [data-tray-close], #journeyTray .jt-close, #journeyTray button[aria-label]")?.click());
  await page.evaluate(() => { const t = document.getElementById("journeyTray"); if (t) t.hidden = true; });
  // + New Note
  await openMenu(255);
  await page.evaluate(() => document.querySelector('#pageViewContainer .ayah-quick-wrap[data-unit-key="ayah:2:255"] [data-qm-note-add]')?.click());
  await page.waitForFunction(() => { const w = document.getElementById("noteOpener"); return w && !w.hidden; }, null, { timeout: 8000 }).catch(() => {});
  const nn = await page.evaluate(() => ({ opener: !!document.getElementById("noteOpener") && !document.getElementById("noteOpener").hidden, src: document.querySelector("#noteOpener iframe")?.getAttribute("src") ?? "" }));
  check(`${tag} "+ New Note" opens a blank Note on 2:255 through the shared Note opener`, nn.opener && /new=1/.test(nn.src) && /unit=ayah(%3A|:)2(%3A|:)255/.test(nn.src), JSON.stringify(nn));
  await page.evaluate(() => document.querySelector("#noteOpener .no-close")?.click());
  await page.waitForFunction(() => document.getElementById("noteOpener")?.hidden, null, { timeout: 8000 }).catch(() => {});
  // an āyah WITHOUT Notes
  await openMenu(256);
  s = await sheet(256);
  check(`${tag} 2:256 (no Note): the tile is "Take Note" and there is no "+ New Note" row`, !!s && s.noteNew === true && !s.add, JSON.stringify(s));
  // C: the whole unit's bookmark
  check(`${tag} the whole-sūrah bookmark row is in the sheet ("Bookmark · …")`, !!s && !!s.unitRow && s.unitRow.includes("·"), JSON.stringify(s));
  await page.evaluate(() => { window.__stubWriteData = []; });
  await page.evaluate(() => document.querySelector('#pageViewContainer .ayah-quick-wrap[data-unit-key="ayah:2:256"] [data-qm-unit-bookmark]')?.click());
  await page.waitForTimeout(1500);
  // A bookmark form may ask for a name: confirm it with whatever save button it shows.
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((e) => e.getClientRects().length && /^(Save|Save bookmark|Add bookmark|সংরক্ষণ|সংরক্ষণ করুন)$/i.test(e.textContent.trim())); b?.click(); });
  await page.waitForTimeout(1500);
  const saved = await page.evaluate(() => (window.__stubWriteData ?? []).flatMap((w) => w.data?.saved ?? []).map((e) => e.position));
  check(`${tag} pressing it bookmarks the whole unit (saved position: ${JSON.stringify(saved)})`, saved.some((p) => /^surah[:_]2$/.test(String(p))), JSON.stringify(saved));
  // an āyah unit has no unit row
  await setSel(page, "unitTypeSelect", "ayah"); await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector("#readQuickMenuSlot [data-qm-toggle]")?.click()); await page.waitForTimeout(400);
  const one = await page.evaluate(() => { const m = document.querySelector("#readQuickMenuSlot .quick-menu.open"); return { open: !!m, unitRow: !!m?.querySelector("[data-qm-unit-bookmark]"), tile: !!m?.querySelector("[data-qm-bookmark]") }; });
  check(`${tag} an āyah unit has no whole-unit row (its Bookmark tile is the bookmark)`, one.open && !one.unitRow && one.tile, JSON.stringify(one));
  await ctx.close();
}
// Larger text (the Architect's hand-over list): at 150% / 200% the sheet's new rows ("+ New Note", "Bookmark · <unit>") stay inside the sheet and the screen,
// and their words wrap instead of running out of it.
for (const [lang, width, pct] of [["en", 390, 150], ["en", 390, 200], ["bn", 390, 200], ["en", 360, 200]]) {
  const tag = `[${lang} ${width} ${pct}%]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; }, pct);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  // The ONE-Ayah-View bar ⋮ with Page as the unit: a unit wider than one āyah (so the whole-unit row is there) and the āyah 2:255 (so the Note rows are).
  await setSel(page, "unitTypeSelect", "page"); await page.waitForTimeout(700);
  await setSel(page, "surahSelect", "2"); await page.waitForTimeout(1500);
  await page.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "255"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector("#readQuickMenuSlot [data-qm-toggle]")?.click());
  await page.waitForTimeout(900);
  const g = await page.evaluate(() => {
    const m = document.querySelector("#readQuickMenuSlot .quick-menu.open"); if (!m) return null; const mb = m.getBoundingClientRect();
    const rows = ["[data-qm-note-add]", "[data-qm-unit-bookmark]"].map((s) => { const e = m.querySelector(s); if (!e) return { s, missing: true }; const r = e.getBoundingClientRect(); return { s, inside: r.left >= mb.left - 0.5 && r.right <= mb.right + 0.5 && r.right <= innerWidth, noOverflow: e.scrollWidth <= e.clientWidth + 1, h: Math.round(r.height), sw: e.scrollWidth, cw: e.clientWidth, tx: (e.querySelector(".qm-rowtext")||e).textContent.slice(0,60), tsw: (e.querySelector(".qm-rowtext")||e).scrollWidth, tcw: (e.querySelector(".qm-rowtext")||e).clientWidth }; });
    return { menu: [Math.round(mb.left), Math.round(mb.right)], vw: innerWidth, rows };
  });
  check(`${tag} the "+ New Note" and "Bookmark · unit" rows stay inside the sheet and the screen, their words wrapping`, !!g && g.menu[0] >= 0 && g.menu[1] <= g.vw && g.rows.every((r) => !r.missing && r.inside && r.noOverflow), JSON.stringify(g));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
