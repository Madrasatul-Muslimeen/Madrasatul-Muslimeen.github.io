// The Owner, 8 Oct 2026, a screenshot of the Āyah card with "Note" and "Take Note" circled:
//   "Ayah Card: Note n Take Note both takes to the same view, Isn't it? Fix. Also Ayah card doesn't have family
//    members progress recording. Enable."
// (1) ✍ Take Note opens the Note view READY TO WRITE (its Notes box open, in sight, the cursor in it); 📝 Note opens the
// Note view as it is (no cursor put anywhere). Both leave "Back to Āyah card".
// Updated in place 9 Oct 2026 (decision 94, the Owner: "we got 3 notes. It's confusing"): ONE 📝 Note. With no Note on
// the āyah yet it is the ready-to-write door; once the āyah has a Note it opens the Note view as it is.
// (2) The Āyah card's "✅ Record Your Progress" carries 👥: ticking Maryam too writes the claim for BOTH (read back from
// the stub's records writes), as the Track card does. Expected values written by hand (fixture p1 Ahsan, p2 Maryam).
// Run from the repository root, serve.js on :8080.
//   --mutate=samedoor   with no Note yet, 📝 Note takes the plain door  -> the "ready to write" checks fail
//   --mutate=self-only  claimApproachStatus writes only for the Student -> the two-person check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  samedoor: ["js/ayah-action-sheet.js", '? (callbacks.onTakeNote ?? callbacks.onNote) : callbacks.onNote);', "? callbacks.onNote : callbacks.onNote);"],
  "self-only": ["quranrevival.html", "      const targets = claimTargetIds();\n", "      const targets = [selectedPersonId];\n"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const TENANT_ID = "t1";
// A Note already on 2:256 (the stub never adds what the app writes to its own data, so the Note typed on 2:255 below
// cannot be read back; the "has a Note" door is proven on this seeded one). Row shapes as ayah-connected-browser.mjs.
const TS = "2026-01-01T00:00:00.000Z";
const NOTE_256 = { _id: "t1__n256", noteId: "n256", tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", title: "On 2:256", bodyHtml: "<p>On 2:256</p>", status: "active", visibility: "private", currentRevisionId: "n256-r1", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: "test-uid" };
const SOURCE_256 = { _id: "t1__s256", sourceLinkId: "s256", tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", noteId: "n256", sourceKey: "ayah:2:256", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: "test-uid" };
const SEED = `
window.__stubApplyBatches = true; window.__stubRecordTxData = true;
DATA.notes = [...(DATA.notes ?? []), ${JSON.stringify(NOTE_256)}];
DATA.noteSources = [...(DATA.noteSources ?? []), ${JSON.stringify(SOURCE_256)}];
DATA.records.push(
  { _id: TENANT_ID + "__p1__surah_2", tenantId: "t1", personId: "p1", entries: {} },
  { _id: TENANT_ID + "__p2__surah_2", tenantId: "t1", personId: "p2", entries: {} }
);`.replace(/TENANT_ID \+ "/g, '"t1');
const NAMES = { en: ["Ahsan", "Maryam"], bn: ["আহসান", "মারইয়াম"] };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function openCard(P, ayah) {
  await P.evaluate((a) => document.querySelector(`[data-ayah-num-badge="2:${a}"]`)?.click(), ayah);
  await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
  await P.waitForTimeout(400);
}
for (const lang of ["en", "bn"]) for (const [width, height] of [[390, 844], [1280, 800]]) {
  const tag = `[${lang} ${width}]`;
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
  await ev(() => { const el = document.getElementById("ayahSelect"); el.value = "255"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForTimeout(900);
  await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));

  // 1. One 📝 Note (decision 94), UPDATED IN PLACE for decision 95 (the Owner, 9 Oct 2026: "NotePane: Build the demo";
  // v10.03), reason recorded: the Note is Mapping My Journey's own Note pane on the Read view now, not the Note view.
  // No Note yet -> the pane with ✚ New note in focus, ready to press (pressing it writes the Note, the cursor in it);
  // a Note already -> the pane listing it. Both carry "← Back to Āyah card" on the pane's bar.
  const paneFrame = async () => { for (let i = 0; i < 80; i++) { const f = P.frames().find((x) => /journey-map\.html\?embed=1&unit=ayah%3A2%3A/.test(x.url())); if (f) return f; await P.waitForTimeout(100); } return null; };
  await openCard(P, 255);
  const doors = await ev(() => ({ note: document.querySelectorAll("[data-ayah-sheet] [data-ayah-sheet-note]").length, isNew: !!document.querySelector("[data-ayah-sheet] [data-ayah-sheet-note-new]"), take: !!document.querySelector("[data-ayah-sheet] [data-ayah-sheet-takenote]"), pen: [...document.querySelectorAll("[data-ayah-sheet] [data-ayah-sheet-actions] button")].some((b) => b.textContent.includes("✍")) }));
  check(`${tag} the card has ONE 📝 Note (no separate ✍ Take Note), and with no Note yet it is the take-a-note door`, doors.note === 1 && doors.isNew && !doors.take && !doors.pen, JSON.stringify(doors));
  await P.click("[data-ayah-sheet] [data-ayah-sheet-note]");
  const F = await paneFrame();
  await F?.waitForFunction(() => document.activeElement?.matches?.("[data-unit-new].unit-new-ready"), null, { timeout: 15000 }).catch(() => {});
  const take = await ev(() => ({ pane: !document.getElementById("readNotePane")?.hidden, back: document.querySelector("#readNotePane [data-rnp-back]")?.textContent ?? "", title: document.querySelector("#readNotePane .rnp-title")?.textContent ?? "" }));
  const ready = F ? await F.evaluate(() => !!document.activeElement?.matches?.("[data-unit-new].unit-new-ready")) : false;
  check(`${tag} 📝 Note (no Note yet) opens the Notes pane on 2:255 with ✚ New note in focus`, take.pane && /2:255|২:২৫৫/.test(take.title) && ready, JSON.stringify({ ...take, ready }));
  await F?.click("[data-unit-new]");
  await F?.waitForFunction(() => document.activeElement?.isContentEditable, null, { timeout: 10000 }).catch(() => {});
  check(`${tag} ...pressing it makes the Note with the cursor in it, ready to type`, F ? await F.evaluate(() => !!document.activeElement?.isContentEditable) : false);
  await P.keyboard.type("Bismillah");
  check(`${tag} ...typing goes straight into the Note`, F ? (await F.evaluate(() => document.querySelector("#notePane [contenteditable=true]")?.textContent ?? "")).includes("Bismillah") : false);
  check(`${tag} ...and "Back to Āyah card" is there`, take.back === `← ${lang === "bn" ? "আয়াত কার্ডে ফিরুন" : "Back to Āyah card"}`, take.back);
  await P.click("#readNotePane [data-rnp-back]");
  await P.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(300);
  await ev(() => document.activeElement?.blur?.());
  // 2:256 has a Note (seeded): the card's one 📝 Note there opens the pane listing it, with nothing put in focus.
  await P.click('[data-ayah-sheet] [data-ayah-sheet-step="1"]');
  await P.waitForFunction(() => /2:256|২:২৫৬/.test(document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent ?? "") && document.querySelector("[data-ayah-sheet] [data-ayah-sheet-note]")?.getAttribute("aria-label") !== null, null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(700);
  const nowHas = await ev(() => ({ isNew: !!document.querySelector("[data-ayah-sheet] [data-ayah-sheet-note-new]"), label: document.querySelector("[data-ayah-sheet] [data-ayah-sheet-note]")?.getAttribute("aria-label") }));
  check(`${tag} on 2:256, which has a Note, the card's one 📝 Note is "Note & more…", not the take-a-note door`, !nowHas.isNew && nowHas.label === (lang === "bn" ? "নোট ও আরও…" : "Note & more…"), JSON.stringify(nowHas));
  await P.click("[data-ayah-sheet] [data-ayah-sheet-note]");
  await P.waitForTimeout(600);
  const F2 = await paneFrame();
  await F2?.waitForFunction(() => /2:256|২:২৫৬/.test(document.querySelector("[data-unit-title]")?.textContent ?? "") && document.querySelector('[data-unit-body] [data-note-id="n256"]'), null, { timeout: 15000 }).catch(() => {});
  const plain = F2 ? await F2.evaluate(() => ({ listed: !!document.querySelector('[data-unit-body] [data-note-id="n256"]'), focused: !!document.activeElement?.matches?.("[data-unit-new].unit-new-ready") })) : null;
  check(`${tag} ...and it opens the pane listing "On 2:256" (✚ not put in focus) -- a different door`, plain?.listed && !plain.focused, JSON.stringify(plain));
  await P.click("#readNotePane [data-rnp-back]").catch(() => {});
  await P.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(400);
  // Back to 2:255, where the 👥 checks below are written.
  await P.click('[data-ayah-sheet] [data-ayah-sheet-step="-1"]');
  await P.waitForFunction(() => /2:255|২:২৫৫/.test(document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent ?? ""), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(500);

  // 2. 👥 on the Āyah card: tick Maryam too, press Learning, both are recorded.
  const picker = await ev(() => { const r = document.querySelector("[data-ayah-sheet] [data-claim-for]"), b = r?.querySelector("[data-assign-trigger]")?.getBoundingClientRect(); return r ? { label: r.querySelector("[data-assign-trigger-label]")?.textContent, h: b?.height ?? 0, beside: !!r.closest(".claim-for-line") } : null; });
  check(`${tag} the Āyah card's "Record Your Progress" has 👥, naming the Student (${NAMES[lang][0]}), 40px`, picker?.label === NAMES[lang][0] && picker.h >= 40 && picker.beside, JSON.stringify(picker));
  await P.click("[data-ayah-sheet] [data-claim-for] [data-assign-trigger]"); await P.waitForTimeout(150);
  await P.click('[data-ayah-sheet] [data-claim-for] [data-assign-list] input[value="p2"]');
  await P.click("[data-ayah-sheet] [data-claim-for] [data-assign-trigger]"); await P.waitForTimeout(100);
  check(`${tag} two ticked: the chip shows 2`, (await P.textContent("[data-ayah-sheet] [data-claim-for] [data-assign-trigger-label]")) === (lang === "bn" ? "২" : "2"));
  const approach = await ev(() => { const s = document.querySelector("[data-ayah-sheet] [data-approach-stage-select]"); const v = [...(s?.options ?? [])].map((o) => o.value).find((x) => x); if (s && v) { s.value = v; s.dispatchEvent(new Event("change", { bubbles: true })); } return v; });
  await P.waitForTimeout(400);
  const n = await ev(() => (window.__stubWriteData || []).length);
  await P.click('[data-ayah-sheet] [data-approach-stage-btn="learning"]'); await P.waitForTimeout(1000);
  const w = await ev(([k, a]) => (window.__stubWriteData || []).slice(k).filter((x) => x.col === "records").map((x) => [x.id, x.data?.[`entries.ayah:2:255::${a}`]?.claimedStatus ?? null]), [n, approach]);
  check(`${tag} pressing Learning on the Āyah card writes it for BOTH Ahsan and Maryam (${approach})`, !!approach && w.some(([id, s]) => id === "t1__p1__surah_2" && s === "learning") && w.some(([id, s]) => id === "t1__p2__surah_2" && s === "learning"), JSON.stringify(w));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Āyah card: Take Note ready to write, Note as it is, 👥 records for each ticked person: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
