// Decision 95 (the Owner, 9 Oct 2026: "NotePane: Build the demo. no old notes copy needed"), round 1, v10.01:
// the Read bar's 📝 Notes opens Mapping My Journey's own Note pane on the āyah being read
// (docs/reference/2026-10-09-read-note-pane-demo.html). Checked at a phone (390), a tablet (820) and a computer (1280),
// in English and Bangla, against a seeded āyah 2:256 holding one Note started on it, one Note that mentions it, and
// the āyah's old Note-view note (ayahNotes). Expected values are written by hand from that seed.
// Run from the repository root, serve.js on :8080.
//   --mutate=reload     ‹ › reloads the page inside instead of telling it the new āyah -> "no reload" fails
//   --mutate=noback     the pane's ← Back does nothing                                  -> the way-back checks fail
//   --mutate=cardnote    the Āyah card's 📝 Note opens the Note view again        -> the "opens the Notes pane" checks fail
//   --mutate=notrackback a Track action leaves no way back to the pane          -> the Track way-back checks fail
//   --mutate=nosource   ✚ New note makes a Note with no link to the āyah                 -> the noteSources check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  reload: ["js/read-note-pane.js", "  if (!pane || pane.hidden || !u || u.unitKey === unit?.unitKey) return;\n  toFrame(", "  if (!pane || pane.hidden || !u || u.unitKey === unit?.unitKey) return;\n  frame.setAttribute(\"src\", srcFor(u)); (0, void "],
  noback: ["js/read-note-pane.js", "  back.addEventListener(\"click\", closeReadNotePane);\n", "\n"],
  cardnote: ["quranrevival.html", "        onNote: (unitKey) => { openNotesPaneFromAyahCard(unitKey); },", "        onNote: (unitKey) => { rememberAyahCardReturn(unitKey); openNoteView(unitKey); },"],
  notrackback: ["quranrevival.html", "      setAppReturn(t(\"Back to Notes on {unit}\", { unit: u.label }), \"\", async () => {", "      (() => {})(t(\"Back to Notes on {unit}\", { unit: u.label }), \"\", async () => {"],
  nosource: ["journey-map.html", "const { note } = await createStudyNote(db, { ...ownerArgs, unitKey: unitKeyParam, title: label });", "const note = await createPermanentNote(db, { ...ownerArgs, title: label, bodyHtml: \"\" });"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const TS = "2026-01-01T00:00:00.000Z";
const own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: "test-uid" };
const NOTES = [
  { _id: "t1__n256", noteId: "n256", ...own, title: "Started on 2:256", bodyHtml: "<p>No compulsion in religion.</p>", status: "active", visibility: "private", currentRevisionId: "n256-r1" },
  { _id: "t1__n7", noteId: "n7", ...own, title: "Mentions 2:256", bodyHtml: "<p>See also 2:256.</p>", status: "active", visibility: "private", currentRevisionId: "n7-r1" },
];
const SOURCES = [
  { _id: "t1__s256", sourceLinkId: "s256", ...own, noteId: "n256", sourceKey: "ayah:2:256", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active" },
  { _id: "t1__s7", sourceLinkId: "s7", ...own, noteId: "n7", sourceKey: "ayah:2:256", sourceKind: "quran-unit", relationshipKind: "reference", approachId: null, provenanceKind: "study-note", status: "active" },
];
// The stub applies what the app writes (opt-in, as journey-sections-browser.mjs does), so ✚'s filing can find its Note.
const SEED = `
window.__stubApplyBatches = true; window.__stubRecordTxData = true;
DATA.notes = [...(DATA.notes ?? []), ...${JSON.stringify(NOTES)}];
DATA.noteSources = [...(DATA.noteSources ?? []), ...${JSON.stringify(SOURCES)}];
(DATA.ayahNotes.find((d) => d._id === "t1__p1") || {}).notes = { "ayah:2:256": { html: "<p>My old quick note on 2:256</p>" } };`;

const L = {
  en: { backNotes: "Back to Notes on 2:257", backCard: "← Back to Āyah card", title258: "Notes on 2:258", title256: "Notes on 2:256", title257: "Notes on 2:257", back: "← Back to 2:256", started: "started here", mentions: "mentions it", old: "Your note from the Note view", empty257: "No notes on 2:257 yet", newBtn: "New note on 2:257" },
  bn: { backNotes: "২:২৫৭-এর নোটে ফিরে যান", backCard: "← আয়াত কার্ডে ফিরুন", title258: "২:২৫৮-এর নোট", title256: "২:২৫৬-এর নোট", title257: "২:২৫৭-এর নোট", back: "← ২:২৫৬-এ ফিরে যান", started: "এখানে শুরু", mentions: "এর উল্লেখ আছে", old: "নোট ভিউ থেকে আপনার নোট", empty257: "২:২৫৭-এ এখনো কোনো নোট নেই", newBtn: "২:২৫৭-এ নতুন নোট" },
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"]) for (const [width, height, mode] of [[390, 844, "phone"], [820, 1100, "dock"], [1280, 800, "side"]]) {
  const tag = `[${lang} ${width}]`, W = L[lang];
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  const ev = (f, a) => P.evaluate(f, a);
  await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await ev(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(400);
  await ev(() => { const s = document.getElementById("surahSelect"); if (s.value !== "2") { s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await P.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 15000 });
  await ev(() => { const el = document.getElementById("ayahSelect"); el.value = "256"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForTimeout(900);
  await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));

  // 1. The button: on the Read bar, the same size as its neighbours, nothing read for it before it is pressed (I9).
  const btn = await ev(() => {
    const b = document.getElementById("readNotesBtn"), bm = document.getElementById("readBookmarkBtn"), r = b?.getBoundingClientRect();
    return { shown: !!r && r.width > 0, h: r?.height ?? 0, bmH: bm?.getBoundingClientRect().height ?? 0, label: b?.getAttribute("aria-label"), inside: !!r && r.left >= 0 && r.right <= innerWidth + 0.5,
      loaded: !!document.getElementById("readNotePane"), badge: !b?.querySelector(".read-notes-count")?.hidden };
  });
  check(`${tag} 📝 is on the Read bar, inside the screen, as tall as 🔖 beside it`, btn.shown && btn.inside && Math.abs(btn.h - btn.bmH) <= 1, JSON.stringify(btn));
  check(`${tag} ...named for the āyah ("${W.title256}") and nothing loaded or counted before it is pressed`, btn.label === W.title256 && !btn.loaded && !btn.badge, JSON.stringify(btn));

  // 2. Open it: where it sits, and the reading underneath does not move.
  const before = await ev(() => ({ top: document.getElementById("readScroll")?.scrollTop ?? 0, y: scrollY, ayah: document.getElementById("ayahSelect").value }));
  await P.click("#readNotesBtn");
  await P.waitForFunction(() => document.querySelector("#readNotePane:not([hidden]) iframe"), null, { timeout: 8000 }).catch(() => {});
  const F = await (async () => { for (let i = 0; i < 60; i++) { const f = P.frames().find((x) => /journey-map\.html\?embed=1&unit=ayah%3A2%3A256/.test(x.url())); if (f) return f; await P.waitForTimeout(100); } return null; })();
  check(`${tag} pressing 📝 opens the pane on the page inside (journey-map.html?embed=1&unit=ayah:2:256)`, !!F, P.frames().map((f) => f.url()).join(" "));
  if (!F) { await ctx.close(); continue; }
  await F.waitForSelector("[data-unit-body] [data-note-id], [data-unit-empty]", { timeout: 15000 }).catch(() => {});
  await F.waitForTimeout(500);
  const where = await ev((m) => {
    const p = document.getElementById("readNotePane"), r = p.getBoundingClientRect(), rs = document.getElementById("readScroll").getBoundingClientRect();
    return { cls: [...p.classList].join(" "), l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, iw: innerWidth, ih: innerHeight, readRight: rs.right, side: document.body.classList.contains("rnp-open-side"), dock: document.body.classList.contains("rnp-open-dock"), sideways: document.documentElement.scrollWidth > innerWidth + 1 };
  }, mode);
  const placed = mode === "phone" ? where.l <= 0.5 && where.t <= 0.5 && Math.abs(where.r - where.iw) <= 1 && Math.abs(where.b - where.ih) <= 1
    : mode === "dock" ? Math.abs(where.b - where.ih) <= 1 && where.l <= 0.5 && Math.abs(where.r - where.iw) <= 1 && where.h < where.ih * 0.7 && where.dock
    : Math.abs(where.r - where.iw) <= 1 && where.t <= 0.5 && where.w < where.iw * 0.5 && where.side && where.readRight <= where.l + 1;
  check(`${tag} the pane sits ${mode === "phone" ? "over the whole screen" : mode === "dock" ? "docked under the reading, about half the height" : "beside the reading, which is not covered"}`, placed && where.cls.includes(`rnp-${mode}`), JSON.stringify(where));
  check(`${tag} ...no sideways scroll`, !where.sideways, JSON.stringify(where));
  const list = await F.evaluate(() => ({
    title: document.querySelector("[data-unit-title]")?.textContent ?? "",
    cards: [...document.querySelectorAll("[data-unit-body] [data-note-id]")].map((c) => ({ id: c.dataset.noteId, kind: c.querySelector("[data-unit-kind]")?.textContent ?? "" })),
    old: document.querySelector("[data-unit-old-note]")?.textContent ?? "",
    toggle: getComputedStyle(document.getElementById("viewToggle")).display, ctx: getComputedStyle(document.getElementById("contextBar")).display,
    newBtn: !!document.querySelector("[data-unit-new]"), journey: !!document.querySelector("[data-unit-journey]"),
  }));
  check(`${tag} the pane is titled "${W.title256}"`, list.title === W.title256, list.title);
  check(`${tag} ...it lists both Notes on 2:256: one "${W.started}", one "${W.mentions}"`, list.cards.length === 2 && list.cards.find((c) => c.id === "n256")?.kind === W.started && list.cards.find((c) => c.id === "n7")?.kind === W.mentions, JSON.stringify(list.cards));
  check(`${tag} ...the old Note-view note is shown, read only, as it was (nothing copied)`, list.old.includes(W.old) && list.old.includes("My old quick note on 2:256"), list.old);
  check(`${tag} ...with ✚ New note and Open in Mapping My Journey, and without the page's own view toggle and person row`, list.newBtn && list.journey && list.toggle === "none" && list.ctx === "none", JSON.stringify(list));
  // 3. A Note opens in Mapping My Journey's own Note view.
  await F.click('[data-unit-body] [data-note-id="n256"] [data-note-open]');
  await F.waitForFunction(() => !document.getElementById("notePane").hidden && /No compulsion in religion/.test(document.getElementById("notePane").textContent), null, { timeout: 8000 }).catch(() => {});
  check(`${tag} tapping "Started on 2:256" opens it in the Journey Note view`, await F.evaluate(() => !document.getElementById("notePane").hidden && /No compulsion in religion/.test(document.getElementById("notePane").textContent)));

  // 4. The way back: ← Back closes the pane, the reading is where it was, and the badge now says 2.
  const backText = await ev(() => document.querySelector("#readNotePane [data-rnp-back]")?.textContent ?? "");
  check(`${tag} the pane's bar says "${W.back}"`, backText === W.back, backText);
  await P.click("#readNotePane [data-rnp-back]");
  await P.waitForTimeout(400);
  const after = await ev(() => ({ hidden: document.getElementById("readNotePane").hidden, top: document.getElementById("readScroll")?.scrollTop ?? 0, y: scrollY, ayah: document.getElementById("ayahSelect").value, focus: document.activeElement?.id, badge: document.querySelector("#readNotesBtn .read-notes-count")?.textContent, badgeShown: !document.querySelector("#readNotesBtn .read-notes-count")?.hidden, body: document.body.className }));
  check(`${tag} ← Back closes the pane and the reading is exactly where it was (same āyah, same scroll)`, after.hidden && after.ayah === before.ayah && Math.abs(after.top - before.top) <= 2 && Math.abs(after.y - before.y) <= 2 && !/rnp-open/.test(after.body), JSON.stringify({ before, after }));
  check(`${tag} ...the focus is back on 📝, which now shows 2 Notes`, after.focus === "readNotesBtn" && after.badgeShown && after.badge === (lang === "bn" ? "২" : "2"), JSON.stringify(after));

  // 5. ‹ › with the pane open: it follows to 2:257 WITHOUT reloading the page inside.
  await P.click("#readNotesBtn");
  await P.waitForTimeout(300);
  await F.evaluate(() => { window.__notReloaded = true; });
  // The āyah changes through the reading screen's own picker (▸ shows only in single-āyah view; on a phone the pane covers the bar).
  await ev(() => { const el = document.getElementById("ayahSelect"); el.value = "257"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await F.waitForFunction((t) => document.querySelector("[data-unit-title]")?.textContent === t, W.title257, { timeout: 8000 }).catch(() => {});
  await F.waitForTimeout(400);
  const moved = await F.evaluate(() => ({ kept: window.__notReloaded === true, title: document.querySelector("[data-unit-title]")?.textContent, empty: document.querySelector("[data-unit-empty]")?.textContent ?? "", cards: document.querySelectorAll("[data-unit-body] [data-note-id]").length, old: !!document.querySelector("[data-unit-old-note]") })).catch(() => ({ kept: false }));
  check(`${tag} moving to the next āyah moves the open pane to "${W.title257}" without reloading it`, moved.kept && moved.title === W.title257, JSON.stringify(moved));
  check(`${tag} ...2:257 has no Notes and no old note`, moved.cards === 0 && moved.empty.includes(W.empty257) && !moved.old, JSON.stringify(moved));
  const paneTitle = await ev(() => document.querySelector("#readNotePane .rnp-title")?.textContent);
  check(`${tag} ...and the pane's bar names 2:257 too`, paneTitle === W.title257, paneTitle);

  // 6. ✚ New note on 2:257: a Note started on the āyah, filed in a folder, opened in the Note view.
  const newLabel = await F.evaluate(() => document.querySelector("[data-unit-new]")?.textContent ?? "");
  check(`${tag} the button reads "✚ ${W.newBtn}"`, newLabel.includes(W.newBtn), newLabel);
  await F.waitForFunction(() => document.querySelector("[data-unit-new]") && !document.querySelector("[data-unit-new]").hasAttribute("aria-disabled"), null, { timeout: 15000 }).catch(() => {});
  await F.click("[data-unit-new]");
  await F.waitForFunction(() => !document.getElementById("notePane").hidden, null, { timeout: 8000 }).catch(() => {});
  await F.waitForTimeout(500);
  const made = await F.evaluate(() => {
    const w = window.__stubWriteData || [], log = window.__fsLog || [];
    const src = w.find((x) => x.col === "noteSources") || null;
    return { notes: log.some((r) => r.col === "notes" || r.col === "noteRevisions") || w.some((x) => x.col === "notes"), source: src?.data?.sourceKey ?? null, kind: src?.data?.relationshipKind ?? null,
      placement: w.some((x) => x.col === "notePlacements") || log.some((r) => r.col === "notePlacements"), paneOpen: !document.getElementById("notePane").hidden,
      listed: [...document.querySelectorAll("[data-unit-body] [data-note-id]")].map((c) => c.querySelector("[data-unit-kind]")?.textContent) };
  });
  check(`${tag} ✚ writes a Note, linked to ayah:2:257 as its origin, and files it in a folder`, made.notes && made.source === "ayah:2:257" && made.kind === "origin" && made.placement, JSON.stringify(made));
  check(`${tag} ...the new Note is listed ("${W.started}") and open in the Note view`, made.paneOpen && made.listed.length === 1 && made.listed[0] === W.started, JSON.stringify(made));
  const editing = await F.evaluate(() => { const a = document.activeElement; return { editable: !!a?.isContentEditable, inPane: !!a && document.getElementById("notePane").contains(a) }; });
  check(`${tag} ...ready to write: the cursor is in its text`, editing.editable && editing.inPane, JSON.stringify(editing));
  await F.locator("#notePane [contenteditable=true]").first().pressSequentially("Bismillah");
  check(`${tag} ...typing goes straight into the new Note`, (await F.evaluate(() => document.querySelector("#notePane [contenteditable=true]")?.textContent ?? "")).includes("Bismillah"));

  // 7. Open in Mapping My Journey: the tray, over the reading, on that Note; closing it comes back to the reading.
  // From the pane's own bar (on a phone the open Note covers the list and its button).
  await P.click("#readNotePane [data-rnp-journey]");
  await P.waitForFunction(() => document.querySelector("#journeyTray:not([hidden]) iframe")?.getAttribute("src")?.includes("note="), null, { timeout: 8000 }).catch(() => {});
  const tray = await ev(() => ({ shown: !!document.querySelector("#journeyTray:not([hidden])"), src: document.querySelector("#journeyTray iframe")?.getAttribute("src") ?? "" }));
  check(`${tag} Open in Mapping My Journey opens the tray on the new Note`, tray.shown && /embed=1&note=/.test(tray.src), JSON.stringify(tray));
  await P.click("#journeyTray .jt-close");
  await P.waitForTimeout(300);
  check(`${tag} ...closing the tray leaves the Notes pane and the reading as they were`, await ev(() => document.getElementById("journeyTray").hidden && !document.getElementById("readNotePane").hidden && document.getElementById("ayahSelect").value === "257"));
  // 8. Round 2a: "Track this āyah" is a tab of the pane; Record Your Progress opens the Āyah card (its 👥 included) and
  // leaves "Back to Notes on 2:257", which brings the pane back on its Track tab.
  await P.click('#readNotePane [data-rnp-tab="track"]');
  await P.waitForTimeout(300);
  const tr = await ev(() => ({ frame: document.querySelector("#readNotePane .rnp-frame").hidden, track: document.querySelector("#readNotePane .rnp-track").hidden,
    btns: [...document.querySelectorAll("#readNotePane [data-rnp-track]")].map((b) => b.dataset.rnpTrack), sel: document.querySelector('#readNotePane [data-rnp-tab="track"]').getAttribute("aria-selected"),
    hs: [...document.querySelectorAll("#readNotePane [data-rnp-track]")].map((b) => b.getBoundingClientRect().height) }));
  check(`${tag} the Track tab shows Take an Approach, Record Your Progress and Know Your Status, each >= 40px`, tr.frame && !tr.track && tr.sel === "true" && tr.btns.join() === "take,record,status" && tr.hs.every((h) => h >= 40), JSON.stringify(tr));
  await P.click('#readNotePane [data-rnp-track="record"]');
  await P.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(400);
  const rec = await ev(() => ({ paneHidden: document.getElementById("readNotePane").hidden, ref: document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent ?? "", pill: document.querySelector("#ayahCardBackPill:not([hidden]) [data-ayah-card-back]")?.textContent ?? "" }));
  check(`${tag} Record Your Progress closes the pane and opens 2:257's Āyah card, with "${W.backNotes}"`, rec.paneHidden && /2:257|২:২৫৭/.test(rec.ref) && rec.pill.includes(W.backNotes), JSON.stringify(rec));
  await ev(() => document.querySelector("#ayahCardBackPill [data-ayah-card-back]")?.click());
  await P.waitForTimeout(600);
  const backT = await ev(() => ({ shown: !document.getElementById("readNotePane").hidden, sel: document.querySelector('#readNotePane [data-rnp-tab="track"]')?.getAttribute("aria-selected"), title: document.querySelector("#readNotePane .rnp-title")?.textContent }));
  check(`${tag} ...and that way back reopens the pane on its Track tab, on 2:257`, backT.shown && backT.sel === "true" && backT.title === W.title257, JSON.stringify(backT));
  await P.click('#readNotePane [data-rnp-back]');
  await P.waitForTimeout(300);

  // 9. The Āyah card's 📝 Note opens the pane on that āyah, with "← Back to Āyah card" (decisions 94, 95).
  const openCard = async (a) => {
    await ev((x) => { const el = document.getElementById("ayahSelect"); el.value = String(x); el.dispatchEvent(new Event("change", { bubbles: true })); }, a);
    await P.waitForTimeout(600);
    await ev((x) => document.querySelector(`[data-ayah-num-badge="2:${x}"]`)?.click(), a);
    await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 }).catch(() => {});
    await P.waitForTimeout(500);
  };
  await openCard(256);
  await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-note]") && !document.querySelector("[data-ayah-sheet] [data-ayah-sheet-note-new]"), null, { timeout: 8000 }).catch(() => {});
  await P.click("[data-ayah-sheet] [data-ayah-sheet-note]");
  await P.waitForFunction(() => !document.getElementById("readNotePane")?.hidden, null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(600);
  const fromCard = await ev(() => ({ pane: !document.getElementById("readNotePane").hidden, card: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), title: document.querySelector("#readNotePane .rnp-title")?.textContent,
    back: document.querySelector("#readNotePane [data-rnp-back]")?.textContent, noteView: !document.getElementById("noteView")?.hidden && document.getElementById("noteView")?.getBoundingClientRect().height > 0 }));
  check(`${tag} the Āyah card's 📝 Note opens the Notes pane on 2:256 (not the Note view), the card closed`, fromCard.pane && !fromCard.card && fromCard.title === W.title256 && !fromCard.noteView, JSON.stringify(fromCard));
  check(`${tag} ...with "${W.backCard}" on its bar`, fromCard.back === W.backCard, fromCard.back);
  await P.click('#readNotePane [data-rnp-back]');
  await P.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(300);
  const reCard = await ev(() => ({ open: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), ref: document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent ?? "", pane: document.getElementById("readNotePane").hidden }));
  check(`${tag} ...which closes the pane and reopens 2:256's Āyah card`, reCard.open && reCard.pane && /2:256|২:২৫৬/.test(reCard.ref), JSON.stringify(reCard));
  await ev(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-close], [data-ayah-sheet-close]")?.click());
  await P.keyboard.press("Escape");
  await P.waitForTimeout(300);
  // 10. On an āyah with no Note yet, the card's 📝 Note opens the pane with ✚ New note in focus (nothing is created).
  await openCard(258);
  await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-note-new]"), null, { timeout: 8000 }).catch(() => {});
  await P.click("[data-ayah-sheet] [data-ayah-sheet-note]");
  const F2 = await (async () => { for (let i = 0; i < 60; i++) { const f = P.frames().find((x) => /journey-map\.html\?embed=1&unit=/.test(x.url())); if (f) return f; await P.waitForTimeout(100); } return null; })();
  await F2?.waitForFunction(() => document.activeElement?.matches?.("[data-unit-new].unit-new-ready"), null, { timeout: 15000 }).catch(() => {});
  const ready = F2 ? await F2.evaluate(() => ({ title: document.querySelector("[data-unit-title]")?.textContent, focus: !!document.activeElement?.matches?.("[data-unit-new].unit-new-ready") })) : null;
  check(`${tag} on 2:258 (no Note yet) the card's 📝 Note opens the pane with ✚ New note in focus, ready to press`, ready?.focus && ready.title === W.title258, JSON.stringify(ready));
  check(`${tag} ...and nothing was written just by opening it`, F2 ? await F2.evaluate(() => !(window.__stubWriteData || []).some((x) => x.col === "noteSources" && /2:258/.test(JSON.stringify(x.data)))) : false);
  const errs = errors.filter((e) => !/ERR_CERT|archive\.org|net::ERR/.test(e));
  check(`${tag} no page errors`, errs.length === 0, errs.join(" | ").slice(0, 400));
  if (width === 390 && lang === "bn" || width === 1280 && lang === "en") {
    if (await ev(() => document.getElementById("readNotePane").hidden)) await P.click("#readNotesBtn");
    await P.waitForTimeout(400);
    await P.screenshot({ path: `${process.env.SHOTS || "/tmp"}/read-note-pane-${lang}-${width}.png` });
  }
  await ctx.close();
}
await browser.close();
console.log(`\n==== Read view Notes pane (decision 95): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
