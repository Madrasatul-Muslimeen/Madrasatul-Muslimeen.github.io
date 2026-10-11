// Decision 95 (issue #758): the "has a note" state and Copy's "My note" follow the Notes pane's notes, not only the
// retired Note-view store. The ⋮ sheet's own lookup (lookupAyahNotes) is the one read; its result is kept and used.
//   2:255  a Notes-pane note only        -> the ⋮ menu says "My note", and Copy's text carries the note's words
//   2:253  an old Note-view note only    -> still counts ("My note"), copied
//   2:254  no note in either store       -> "My note (none saved)", the box disabled
//   2:252  BOTH                          -> pane text first, old text after
// Expected words are written by hand from the seeds below. Run from the repository root with serve.js on :8080.
//   --mutate=nopane   drop the Notes-pane half of hasNote   -> 2:255's label check fails
//   --mutate=nocopy   Copy ignores the Notes-pane text      -> the copied-text checks fail
//   --mutate=noread   Copy does not read the pane's text itself -> 2:251 (the pane-only path) fails
//   2:251  a Notes-pane note, reached the Owner's way: 📝 opened and closed, then ⋮ → Copy, no ⋮ sheet ever opened
//          (added by the Architect, 10 Oct 2026: the label was lit by the pane's count while Copy carried no text)
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nopane: ["return (panePlainNotesFor(unitKey)?.count ?? 0) > 0;", "return false;"],
  // Both halves of the read go (the early one on opening Copy, kept for Safari's clipboard rule, and the wait at Copy):
  // either alone is enough here, so a mutation removing only one rightly survives.
  noread: [["if (langs.includes(\"notes\")) await ensurePanePlainNotes(unitKey); return", "return"], ["onTextMenuOpen: (unitKey) => { ensurePanePlainNotes(unitKey); },", ""]],
  nocopy: ["...(panePlainNotesFor(unitKey)?.texts ?? [])", "...[]"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const TS = "2026-01-01T00:00:00.000Z";
const mkNote = (id, html) => ({ _id: `t1__${id}`, noteId: id, tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", title: id, bodyHtml: html, status: "active", visibility: "private", currentRevisionId: `${id}-r1`, schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: "test-uid" });
const mkSource = (id, noteId, key) => ({ _id: `t1__${id}`, sourceLinkId: id, tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", noteId, sourceKey: key, sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: "test-uid" });
const NOTES = [mkNote("n255", "<p>Pane words alpha</p>"), mkNote("n252", "<p>Pane words beta</p>"), mkNote("n251", "<p>Pane words epsilon</p>")];
const SOURCES = [mkSource("s255", "n255", "ayah:2:255"), mkSource("s252", "n252", "ayah:2:252"), mkSource("s251", "n251", "ayah:2:251")];
const OLD = { "ayah:2:253": { html: "<p>Old words gamma</p>" }, "ayah:2:252": { html: "<p>Old words delta</p>" } };
const SEED = `
DATA.notes = [...(DATA.notes ?? []), ${JSON.stringify(NOTES)}].flat();
DATA.noteSources = [...(DATA.noteSources ?? []), ${JSON.stringify(SOURCES)}].flat();
DATA.ayahNotes = [{ _id: "t1__p1", tenantId: "t1", personId: "p1", notes: ${JSON.stringify(OLD)} }];`;
const NONE = { en: "My note (none saved)", bn: "আমার নোট (এখনো সংরক্ষিত নেই)" };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"]) for (const [width, height] of [[390, 844], [1280, 800]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.addInitScript(() => { window.__copied = []; Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { window.__copied.push(t); } }, configurable: true }); });
  if (MUTATE) {
    const pairs = Array.isArray(MUT[MUTATE][0]) ? MUT[MUTATE] : [MUT[MUTATE]];
    await ctx.route("**/app/quranrevival.html*", async (r) => { let src = fs.readFileSync("app/quranrevival.html", "utf8"); for (const [a, b] of pairs) { if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); src = src.split(a).join(b); } await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  const ev = (f, a) => P.evaluate(f, a);
  const unsplash = () => ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await unsplash();
  if (!(await ev(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(400);
  await ev(() => { const s = document.getElementById("surahSelect"); if (s.value !== "2") { s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await P.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 15000 });
  const goTo = async (n) => { await ev((a) => { const el = document.getElementById("ayahSelect"); el.value = String(a); el.dispatchEvent(new Event("change", { bubbles: true })); }, n); await P.waitForTimeout(700); await unsplash(); };

  async function openCopy() {
    await ev(() => { const o = document.getElementById("ayahActionSheetOverlay"); o?.classList.remove("open"); });
    await ev(() => document.querySelector("#readQuickMenuSlot [data-qm-toggle]")?.click());
    await ev(() => document.querySelector('#readQuickMenuSlot [data-qm-sub-toggle="copy"]')?.click());
    const info = await ev(() => {
      const lab = document.querySelector('#readQuickMenuSlot .qm-lang-copy[data-lang="notes"]');
      return { label: lab?.parentElement?.textContent.trim() ?? null, disabled: lab?.disabled ?? null };
    });
    let copied = null;
    if (info.disabled === false) {
      await ev(() => { document.querySelectorAll("#readQuickMenuSlot .qm-lang-copy").forEach((c) => { c.checked = c.dataset.lang === "notes"; }); window.__copied.length = 0; document.querySelector("#readQuickMenuSlot [data-qm-copy-go]")?.click(); });
      await P.waitForTimeout(600);
      copied = await ev(() => window.__copied.at(-1) ?? null);
    }
    return { ...info, copied };
  }
  // The Owner's way: 📝 opened on the āyah (the pane reads and reports its count), closed, then ⋮ → Copy.
  async function probePane(n) {
    await goTo(n);
    await ev(() => document.getElementById("readNotesBtn")?.click());
    await P.waitForFunction((a) => document.querySelector("#readNotesBtn .read-notes-count")?.textContent.trim() !== "", n, { timeout: 15000 }).catch(() => {});
    const badge = await ev(() => document.querySelector("#readNotesBtn .read-notes-count")?.textContent.trim() ?? "");
    await ev(() => document.getElementById("readNotesBtn")?.click()); await P.waitForTimeout(400);
    await goTo(n === 255 ? 254 : 255); await goTo(n); // re-render the bar's menu with the pane's count known
    return { badge, ...(await openCopy()) };
  }
  async function probe(n) {
    // The ⋮ sheet's own lookup is the read; open it on this āyah, wait for it, then show the bar's ⋮ menu on the same āyah.
    await goTo(n);
    await ev((a) => document.querySelector(`[data-ayah-num-badge="2:${a}"]`)?.click(), n);
    await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
    await P.waitForTimeout(900);
    await goTo(n === 255 ? 254 : 255); await goTo(n); // re-render the bar's menu after the lookup landed
    await ev(() => { const o = document.getElementById("ayahActionSheetOverlay"); o?.classList.remove("open"); });
    await ev(() => document.querySelector("#readQuickMenuSlot [data-qm-toggle]")?.click());
    await ev(() => document.querySelector('#readQuickMenuSlot [data-qm-sub-toggle="copy"]')?.click());
    const info = await ev(() => {
      const lab = document.querySelector('#readQuickMenuSlot .qm-lang-copy[data-lang="notes"]');
      return { label: lab?.parentElement?.textContent.trim() ?? null, disabled: lab?.disabled ?? null };
    });
    let copied = null;
    if (info.disabled === false) {
      await ev(() => { document.querySelectorAll("#readQuickMenuSlot .qm-lang-copy").forEach((c) => { c.checked = c.dataset.lang === "notes"; }); window.__copied.length = 0; document.querySelector("#readQuickMenuSlot [data-qm-copy-go]")?.click(); });
      await P.waitForTimeout(400);
      copied = await ev(() => window.__copied.at(-1) ?? null);
    }
    return { ...info, copied };
  }
  const myNote = lang === "bn" ? "আমার নোট" : "My note";
  const isMy = (i) => i.label === myNote && i.disabled === false;

  const a251 = await probePane(251);
  check(`${tag} 2:251 the pane's own count is known (positive control for the next check)`, a251.badge !== "", JSON.stringify(a251));
  check(`${tag} 2:251 📝 opened and closed, no ⋮ sheet: "${myNote}", and Copy carries the note's words`, isMy(a251) && (a251.copied ?? "").includes("Pane words epsilon"), JSON.stringify(a251));
  const a255 = await probe(255);
  check(`${tag} 2:255 a Notes-pane note only: the ⋮ menu offers "${myNote}"`, isMy(a255), JSON.stringify(a255));
  check(`${tag} ...and Copy's text contains the note's words`, (a255.copied ?? "").includes("Pane words alpha"), JSON.stringify(a255));
  const a253 = await probe(253);
  check(`${tag} 2:253 an old-store note only still counts`, isMy(a253) && (a253.copied ?? "").includes("Old words gamma"), JSON.stringify(a253));
  const a254 = await probe(254);
  check(`${tag} 2:254 no note in either store: "${NONE[lang]}", box disabled (positive control)`, a254.label === NONE[lang] && a254.disabled === true, JSON.stringify(a254));
  const a252 = await probe(252);
  const c = a252.copied ?? "";
  check(`${tag} 2:252 both: pane text first, old text after`, isMy(a252) && c.includes("Pane words beta") && c.includes("Old words delta") && c.indexOf("Pane words beta") < c.indexOf("Old words delta"), JSON.stringify(a252));
  const bad = errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
  check(`${tag} no page errors`, bad.length === 0, bad.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Notes-pane "has a note" and Copy: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
