// PCF MSA J68 (the Owner, 21 Oct 2026, a screenshot of the Read window at 22:4 and "Notes on 22:3"):
//   "*Enable the Title to start with 'Quran (Surah Number): Ayah Number - Surah Name:' when note view opens from an Ayah
//    Card. *Enable Title wrapped, not cuts horizontal *Enable copying Arabic Text. Or Enable a button to copy the Ayah
//    with option to copy individual, and multiple."
// (1) A new Note made from the Āyah card's 📝 Note starts with the title "Quran 2:255 - Al-Baqara:".
// (2) The title box wraps: a long title shows whole on several lines, nothing cut sideways; Enter goes on to the body.
// (3) The card's 📋 Copy opens a chooser: this āyah or From–To, any of Arabic · English · Bangla; what reaches the
//     clipboard is read back. Esc goes back to the card.
// Real data (2:255–257). Run from the repository root, serve.js on :8080 (or QR_BASE).
// Every mutation (--mutate=NAME) must make the suite exit 1:
//   notitle   the Note's first title is the bare "2:255" again        -> "(1) the new Note's title is"
//   input     the title box is a one-line input again                  -> "(2) the title wraps"
//   fit       the title box does not grow to its text                  -> "(2) the title wraps"
//   enter     Enter in the title is not sent on to the body            -> "(2) Enter in the title"
//   direct    📋 Copy copies at once again (no chooser)                 -> "(3) Copy opens the chooser"
//   range     Several āyāt copies only the card's āyah                  -> "(3) 255–257 copies three āyāt"
//   langs     the Include choice is ignored                            -> "(3) Bangla on, English off"
//   esc       Esc does not close the chooser                           -> "(3) Esc closes the chooser"
//   bnleak    the chooser's Bangla title is missing                    -> "(3) Bangla: the chooser in Bangla"
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  // UPDATED IN PLACE (J108): the new Note is made by the opener's page now, so the mutation drops ITS first title.
  notitle: ["journey-map.html", "      const title = newTitleParam;", "      const title = \"\";"],
  input: ["js/note-window.js", '<textarea class="pane-edit-title" data-edit-title rows="1" hidden></textarea>', '<input type="text" class="pane-edit-title" data-edit-title hidden>'],
  fit: ["js/note-window.js", "  function fitEditTitle(el) {\n", "  function fitEditTitle(el) { return;\n"],
  enter: ["js/note-window.js", 'else if (ev.key === "Enter" && ev.target.matches?.("[data-edit-title]"))', 'else if (false)'],
  direct: ["quranrevival.html", "        onCopy: (unitKey) => openAyahCopyDialog(unitKey),", "        onCopy: async (unitKey) => { await copyToClipboard(buildAyahText(unitKey, [\"ar\", \"en\"])); },"],
  range: ["quranrevival.html", '(st.mode === "many" ? keys : [unitKey])', "[unitKey]"],
  langs: ["quranrevival.html", ".map((k) => buildAyahText(k, st.langs))", '.map((k) => buildAyahText(k, ["ar", "en"]))'],
  esc: ["quranrevival.html", 'const onKey = (e) => { if (e.key === "Escape") {', 'const onKey = (e) => { if (false) {'],
  bnleak: ["js/i18n/bn.js", '  "Copy āyāt": "আয়াত কপি করুন",\n', ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const surah2 = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/surahs/surah_002.json", "utf8"));
const A = (n) => surah2.ayahs.find((a) => a.ayah === n);
// A Note already on 2:256 (row shapes as ayah-card-takenote-family-browser.mjs), opened in the tray for the title-box checks.
const TS = "2026-01-01T00:00:00.000Z";
const NOTE_256 = { _id: "t1__n256", noteId: "n256", tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", title: "On 2:256", bodyHtml: "<p>On 2:256</p>", status: "active", visibility: "private", currentRevisionId: "n256-r1", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: "test-uid" };
const SOURCE_256 = { _id: "t1__s256", sourceLinkId: "s256", tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", noteId: "n256", sourceKey: "ayah:2:256", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: "test-uid" };
const SEED = `window.__stubApplyBatches = true; window.__stubRecordTxData = true; DATA.notes = [...(DATA.notes ?? []), ${JSON.stringify(NOTE_256)}]; DATA.noteSources = [...(DATA.noteSources ?? []), ${JSON.stringify(SOURCE_256)}];`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function setup(lang, width, height) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height }, extraSeedJs: SEED });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
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
  return { ctx, P, ev, errors };
}
async function openCard(P, ayah) {
  await P.evaluate((a) => document.querySelector(`[data-ayah-num-badge="2:${a}"]`)?.click(), ayah);
  await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
  await P.waitForTimeout(400);
}
const clip = (P) => P.evaluate(async () => { try { return await navigator.clipboard.readText(); } catch (e) { return `ERR ${e}`; } });
const TITLE = { en: "Quran 2:255 - Al-Baqara:", bn: null }; // bn: the Bangla name the app itself prints for sūrah 2 (read below)

for (const lang of ["en", "bn"]) for (const [width, height] of [[1280, 800], [390, 844]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== ${tag} ===`);
  const { ctx, P, ev } = await setup(lang, width, height);
  // (1) the first title
  await openCard(P, 255);
  // UPDATED IN PLACE (J108, v13.01): the card's 📝 Note opens the shared Note opener -- a NEW Note at once -- so (1) reads the
  // title off that Note's first write (createStudyNote, as before) and off its title box.
  await P.click("[data-ayah-sheet] [data-ayah-sheet-note]");
  let F = null;
  for (let i = 0; i < 80 && !F; i++) { F = P.frames().find((x) => /journey-map\.html\?embed=1&new=1&unit=ayah%3A2%3A255/.test(x.url())) ?? null; if (!F) await P.waitForTimeout(100); }
  await F?.waitForSelector("[data-edit-title]:not([hidden])", { timeout: 20000 }).catch(() => {});
  await P.waitForTimeout(500);
  const title = F ? await F.evaluate(() => (window.__stubWriteData || []).filter((x) => x.col === "notes").map((x) => x.data?.title ?? null)[0] ?? null).catch(() => null) : null;
  const closeTray = async () => { await P.click("#journeyTray .jt-close", { timeout: 5000 }).catch(() => {}); await P.waitForTimeout(400); };
  await F?.click('[data-nn-tool="back"]').catch(() => {});
  await P.waitForFunction(() => document.getElementById("noteOpener")?.hidden, null, { timeout: 8000 }).catch(() => {});
  const want = lang === "en" ? TITLE.en : `কুরআন ২:২৫৫ - ${await ev(() => document.querySelector('#surahSelect option[value="2"]')?.textContent.replace(/^[\d০-৯]+\.\s*/, "").trim())}:`;
  check(`${tag} (1) the new Note's title is "${want}" (got "${title}")`, title === want, String(title));
  // (2) a long title wraps, nothing cut; Enter goes on to the body
  const long = "Quran 2:255 - Al-Baqara: Ayat al-Kursi, the greatest ayah in the Book of Allah, read it after every prayer and before sleep";
  await P.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(300);
  await P.click('[data-ayah-sheet] [data-ayah-sheet-step="1"]');
  await P.waitForFunction(() => /2:256|২:২৫৬/.test(document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent ?? ""), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(500);
  await P.click("[data-ayah-sheet] [data-ayah-sheet-note]");
  // J108: the new Note's "You have 1 other Note on this āyah — open" is the way to the Notes pane listing "On 2:256".
  await P.waitForSelector("#noteOpener:not([hidden]) [data-no-count-open]", { timeout: 20000 }).catch(() => {});
  await P.click("#noteOpener [data-no-count-open]").catch(() => {});
  let F2 = null;
  // the pane may reuse its page and be told the new āyah by message, so its address can still name 2:255
  for (let i = 0; i < 80 && !F2; i++) { F2 = P.frames().find((x) => /journey-map\.html\?embed=1&unit=ayah%3A2%3A/.test(x.url()) && !/new=1/.test(x.url())) ?? null; if (!F2) await P.waitForTimeout(100); }
  await F2?.waitForSelector('[data-unit-body] [data-note-id="n256"] [data-note-open]', { timeout: 15000 }).catch(() => {});
  await F2?.click('[data-unit-body] [data-note-id="n256"] [data-note-open]').catch(() => {});
  let T = null;
  for (let i = 0; i < 80 && !T; i++) { T = P.frames().find((x) => /journey-map\.html\?embed=1&note=n256/.test(x.url())) ?? null; if (!T) await P.waitForTimeout(100); }
  await T?.waitForSelector("[data-pane-edit-toggle]:not([hidden])", { timeout: 15000 }).catch(() => {});
  await T?.click("[data-pane-edit-toggle]:not([hidden])").catch(() => {});
  await T?.waitForFunction(() => { const e = document.querySelector("#notePane [data-edit-title]"); return e && !e.hidden; }, null, { timeout: 10000 }).catch(() => {});
  F = T;
  const wrap = F ? await F.evaluate(async (long) => {
    const e = document.querySelector("#notePane [data-edit-title]");
    const one = e.getBoundingClientRect().height;
    e.focus(); e.value = long; e.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return { tag: e.tagName, one: Math.round(one), h: Math.round(r.height), lines: Math.round((e.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / parseFloat(cs.lineHeight)), side: e.scrollWidth - e.clientWidth, hidden: e.scrollHeight - e.clientHeight };
  }, long) : null;
  check(`${tag} (2) the title wraps: a long title shows whole on 2+ lines, the box grew, nothing cut sideways or below`, wrap && wrap.tag === "TEXTAREA" && wrap.lines >= 2 && wrap.h > wrap.one && wrap.side <= 0 && wrap.hidden <= 1, JSON.stringify(wrap));
  await F?.focus("#notePane [data-edit-title]");
  await P.keyboard.press("Enter");
  await P.waitForTimeout(200);
  const enter = F ? await F.evaluate(() => ({ body: !!document.activeElement?.isContentEditable, nl: /\n/.test(document.querySelector("#notePane [data-edit-title]").value) })) : null;
  check(`${tag} (2) Enter in the title goes on to the body (no line break in the title)`, enter?.body && !enter.nl, JSON.stringify(enter));
  await closeTray();
  await P.click("#readNotePane [data-rnp-back]").catch(() => {});
  await P.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(300);
  // back to 2:255, where the Copy checks below are written (the title checks above stepped to 2:256)
  await P.click('[data-ayah-sheet] [data-ayah-sheet-step="-1"]').catch(() => {});
  await P.waitForFunction(() => /2:255|২:২৫৫/.test(document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent ?? ""), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(400);
  // (3) Copy
  if (!(await ev(() => !!document.querySelector("[data-ayah-sheet] [data-ayah-sheet-copy]")))) await openCard(P, 255);
  await P.click("[data-ayah-sheet] [data-ayah-sheet-copy]");
  await P.waitForTimeout(300);
  const dlg = await ev(() => { const d = document.getElementById("ayahCopyDlg"); if (!d) return null; const b = d.querySelector(".ayah-copy-box").getBoundingClientRect(); return { title: d.querySelector("h3")?.textContent, langs: [...d.querySelectorAll("[data-copy-lang]")].map((x) => `${x.dataset.copyLang}:${x.getAttribute("aria-pressed")}`).join(), inside: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight, small: [...d.querySelectorAll("button, select")].filter((x) => x.getBoundingClientRect().height > 0 && x.getBoundingClientRect().height < 44).length, cut: [...d.querySelectorAll("button")].filter((x) => x.scrollWidth > x.clientWidth + 1).map((x) => x.textContent), side: document.documentElement.scrollWidth - innerWidth }; });
  const defLangs = lang === "bn" ? "ar:true,en:false,bn:true" : "ar:true,en:true,bn:false";
  check(`${tag} (3) Copy opens the chooser, Arabic + the app's language ticked, on screen, 44px+, nothing cut`, dlg && dlg.langs === defLangs && dlg.inside && dlg.small === 0 && dlg.cut.length === 0 && dlg.side <= 0, JSON.stringify(dlg));
  if (lang === "bn") check(`${tag} (3) Bangla: the chooser in Bangla ("${dlg?.title}")`, /আয়াত কপি করুন/.test(dlg?.title ?? "") && !/Copy/.test(dlg?.title ?? ""), dlg?.title);
  await P.click("#ayahCopyDlg [data-copy-go]").catch(() => {}); await P.waitForTimeout(300);
  let c = await clip(P);
  const tr = lang === "bn" ? A(255).translations.bn : A(255).translations.en;
  check(`${tag} (3) This āyah: the clipboard has 2:255's Arabic and its ${lang === "bn" ? "Bangla" : "English"}, nothing of 2:256`, c.includes(A(255).uthmaniText) && c.includes(tr) && !c.includes(A(256).uthmaniText), c.slice(0, 120));
  await P.click("#ayahCopyDlg [data-copy-mode=many]").catch(() => {}); await P.waitForTimeout(200);
  await P.selectOption("#ayahCopyDlg [data-copy-to]", "257").catch(() => {}); await P.waitForTimeout(200);
  const goText = await ev(() => document.querySelector("#ayahCopyDlg [data-copy-go]")?.textContent ?? "");
  await P.click("#ayahCopyDlg [data-copy-go]").catch(() => {}); await P.waitForTimeout(300);
  c = await clip(P);
  check(`${tag} (3) Several āyāt 255–257 copies three āyāt, in order ("${goText.trim()}")`, [255, 256, 257].every((n) => c.includes(A(n).uthmaniText)) && c.indexOf(A(255).uthmaniText) < c.indexOf(A(256).uthmaniText) && c.indexOf(A(256).uthmaniText) < c.indexOf(A(257).uthmaniText) && /3|৩/.test(goText), c.slice(0, 80));
  // Bangla on, English off (from whatever the default was)
  if (!(await ev(() => document.querySelector("#ayahCopyDlg [data-copy-lang=bn]")?.getAttribute("aria-pressed") === "true"))) await P.click("#ayahCopyDlg [data-copy-lang=bn]");
  if (await ev(() => document.querySelector("#ayahCopyDlg [data-copy-lang=en]")?.getAttribute("aria-pressed") === "true")) await P.click("#ayahCopyDlg [data-copy-lang=en]");
  await P.click("#ayahCopyDlg [data-copy-go]").catch(() => {}); await P.waitForTimeout(300);
  c = await clip(P);
  check(`${tag} (3) Bangla on, English off: the Bangla of 256 is copied, its English is not`, c.includes(A(256).translations.bn) && !c.includes(A(256).translations.en), c.slice(0, 80));
  await P.keyboard.press("Escape"); await P.waitForTimeout(250);
  const back = await ev(() => ({ dlg: !!document.getElementById("ayahCopyDlg"), card: !!document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), focus: !!document.activeElement?.matches?.("[data-ayah-sheet-copy]") }));
  check(`${tag} (3) Esc closes the chooser and leaves the Āyah card open, focus back on 📋 Copy`, !back.dlg && back.card && back.focus, JSON.stringify(back));
  await ctx.close();
}
// The chooser's colours follow the card's look (it uses the card's own --card-* colours): Night and Day.
for (const look of ["night", "light"]) {
  const { ctx, P, ev } = await setup("en", 1280, 800);
  await ev((l) => document.documentElement.setAttribute("data-card-look", l), look);
  await openCard(P, 255);
  // the card closes when a tile is pressed, so its colours are read first, then the chooser's
  const sheet = await ev(() => { const s = getComputedStyle(document.querySelector("[data-ayah-sheet]")); return [s.backgroundImage, s.backgroundColor, s.color].join(" | "); });
  await P.click("[data-ayah-sheet] [data-ayah-sheet-copy]"); await P.waitForTimeout(250);
  const col = { sheet, box: await ev(() => { const b = document.querySelector("#ayahCopyDlg .ayah-copy-box"); if (!b) return "no chooser"; const c = getComputedStyle(b); return [c.backgroundImage, c.backgroundColor, c.color].join(" | "); }) };
  check(`${look}: the chooser wears the Āyah card's own background and text colour`, col.sheet === col.box, JSON.stringify(col));
  await ctx.close();
}
console.log(`\n==== Āyah card: Note title and Copy (J68)${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
