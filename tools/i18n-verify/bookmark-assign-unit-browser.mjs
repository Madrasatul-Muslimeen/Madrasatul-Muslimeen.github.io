// The Owner, 12 Oct 2026, two reports from real use of the Read view's 🔖 dialog (Al-Baqarah, Whole Surah):
//
//  (1) "I tried to add bookmark for children but couldn't add, but for myself only? yes, ok. Pls fix".
//      Reproduced before any change: the write DID land, in the child's own bookmarks/{tenant}__{child} document --
//      but nothing said so, the 🔖 on screen did not change (this page holds only the selected person's document),
//      the Owner's Bookmark menu reads only that document, the child's copy was tagged "For" the Owner, and one of
//      the Owner's own folders handed the child's copy a folder id that does not exist in the child's document.
//      Proved here: a child-only save writes the child's document, tagged for the child; a notice names who it was
//      saved for (en/bn), inside the screen, with a link to that child's bookmarks that opens the Bookmarks page on
//      the child with ← Back (the way-back law); an Owner's folder is filed by NAME in the child's document --
//      created there when missing, reused when present.
//  (2) "Can you add quick unit choice because this only restrict to whole Surah."
//      Proved here: on a wider unit the dialog offers the unit, This āyah and This page (36px+, one tidy row, nothing
//      cut, no sideways scroll at 320/390/768/1280 in en and bn); This āyah is the āyah the reader has scrolled to
//      (not āyah 1), This page its Mushaf page; each changes the default Name unless the reader typed one; the saved
//      position is the unit key of that āyah/page; and opening that bookmark lands on that āyah / that page.
//      A Single Ayah unit shows no choice at all.
//
// Run from the repository root with serve.js running (QR_BASE for another port). SHOT_DIR=... saves screenshots.
// Mutations (--mutate=NAME) each put the old behaviour back; the checks named beside each must FAIL:
//   nofollow       For stays on the selected person        -> "tagged for the child"
//   silent         no notice after the save                -> the notice checks
//   folderid       the Owner's folder id passed straight   -> the folder-by-name checks
//   noperson       bookmarks.html ignores ?person          -> "opens on the child"
//   noback         bookmarks.html shows no ← Back          -> the Back checks
//   nounits        the dialog gets no unit choice          -> the unit-choice checks
//   staleayah      This āyah = the stale active āyah (1)   -> "the āyah scrolled to"
//   nameoverwrite  a typed name is overwritten             -> "a typed name is kept"
//   unitpos        the picked unit's position ignored      -> the saved-position checks
import fs from "node:fs";
import { chromium, newContext, openPage, clickReadTool } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nofollow: ["app/js/bookmark-popover.js", "if (n === 1 && personSelect && !personPicked) {", "if (false) {"],
  silent: ["app/js/bookmark-popover.js", "if (!savedFor.some((pid) => pid !== selectedPersonId)) return null;", "return null;"],
  folderid: ["app/js/bookmark-assign.js", "if (pid === selectedPersonId || !choice.folderName) {", "if (true) {"],
  noperson: ["app/bookmarks.html", "const asked = askedPersonId && ", "const asked = false && askedPersonId && "],
  noback: ["app/bookmarks.html", 'if (urlParams.get("back") === "1") {', "if (false) {"],
  nounits: ["app/quranrevival.html", "{ unitChoices: readBookmarkUnitChoices(info) }", "{ unitChoices: [] }"],
  staleayah: ["app/quranrevival.html", "if (curRow && seen(curRow)) return cur;", "return cur;"],
  nameoverwrite: ["app/js/bookmark-popover.js", "if (!nameTyped) nameInput.value = isRangeUnit(u) ?", "nameInput.value = isRangeUnit(u) ?"], // anchor updated 16 Oct 2026: the line now also names a range (PCA J76)
  unitpos: ["app/quranrevival.html", "position: picked?.position ?? unitKey,", "position: unitKey,"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const SHOTS = process.env.SHOT_DIR;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const surah2 = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/surahs/surah_002.json", "utf8"));
const pageOf = (a) => surah2.ayahs.find((x) => x.ayah === a)?.page;
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const digits = (lang, n) => (lang === "bn" ? String(n).replace(/\d/g, (d) => BN_DIGITS[d]) : String(n));

const OWNER_FOLDER = `DATA.bookmarks[0].folders.push({ id: "fOwn", name: "Children - Bedtime", parentId: null, personTagId: null, removed: false, createdAt: "2026-01-01T00:00:00.000Z" });`;
const KID_DOC = (folders) => `DATA.bookmarks.push({ _id: "t1__p2", tenantId: "t1", personId: "p2", resume: {}, folders: ${JSON.stringify(folders)},
  saved: [{ id: "bmKid", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Maryam's own bookmark", position: "ayah:1:1", settings: null, folderId: null, personTagId: null, removed: false, createdAt: "2026-01-02T00:00:00.000Z" }] });`;

async function open({ lang = "en", w = 390, h = 844, seed = "", path = "/app/quranrevival.html" } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: seed });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => {
      const src = fs.readFileSync(file, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, path);
  return { ctx, page, errors };
}
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
async function readView(page, { surah = "2", unit = "surah", mushaf = false } = {}) {
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", surah); await page.waitForTimeout(1500);
  await setSel(page, "unitTypeSelect", unit); await page.waitForTimeout(800);
  if (mushaf) {
    await page.evaluate(() => { const t = document.getElementById("mushafToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
    await page.waitForFunction(() => document.querySelectorAll(".hifz-page[data-mushaf-page]").length > 1, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
  }
}
async function openDialog(page) {
  await page.evaluate(() => { window.__stubWriteData = []; });
  await clickReadTool(page, "#readBookmarkBtn");
  // A unit already bookmarked shows ★, and tapping it now ASKS (issue #797): "Add a bookmark…" reaches the dialog.
  await page.waitForSelector(".bm-popover", { timeout: 5000 });
  if (await page.$("[data-bm-exists-add]")) { await page.click("[data-bm-exists-add]"); await page.waitForSelector("[data-bm-pop-save]", { timeout: 5000 }); }
}
// The ★ tap asks first (issue #797); "Remove my bookmark" is the old instant remove, now one deliberate press.
async function removeOwn(page) {
  await page.evaluate(() => document.getElementById("readBookmarkBtn").click());
  await page.waitForSelector("[data-bm-exists-remove]", { timeout: 5000 });
  await page.click("[data-bm-exists-remove]");
  await page.waitForTimeout(500);
}
/** Picks a unit choice; when the dialog offers none (a mutation), says so and leaves the default -- the checks then
    fail by name instead of the suite crashing. */
async function pickUnit(page, id) {
  if (await page.$(`[data-bm-pop-unit="${id}"]`)) await page.click(`[data-bm-pop-unit="${id}"]`);
  else console.log(`  note  no "${id}" choice in the dialog`);
}
const tick = (page, ids) => page.evaluate((list) => {
  for (const c of document.querySelectorAll("[data-bm-pop-assignees] input")) { if (c.checked !== list.includes(c.value)) c.click(); }
}, ids);
async function save(page) { await page.click("[data-bm-pop-save]"); await page.waitForTimeout(900); }
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "bookmarks"));
const lastSaved = (ws, docId) => { const w = ws.filter((x) => x.id === docId && x.data.saved).at(-1); return w ? w.data.saved.at(-1) : null; };
const notice = (page) => page.evaluate(() => {
  const el = document.getElementById("bmSavedNotice");
  if (!el || el.hidden) return null;
  const r = el.getBoundingClientRect(); const link = el.querySelector("[data-bm-saved-link]"); const lr = link?.getBoundingClientRect(); const x = el.querySelector("[data-bm-saved-close]").getBoundingClientRect();
  return { text: el.querySelector("[data-bm-saved-text]").textContent, role: el.getAttribute("role"), inside: r.left >= 0 && r.right <= innerWidth + 0.5 && r.top >= 0 && r.bottom <= innerHeight + 0.5,
    href: link?.getAttribute("href") ?? null, linkText: link?.textContent ?? null, linkH: lr ? lr.height : 0, closeH: x.height, closeW: x.width, sx: document.documentElement.scrollWidth - innerWidth };
});
const hideNotice = (page) => page.evaluate(() => { const el = document.getElementById("bmSavedNotice"); if (el) el.hidden = true; });

// ---------------------------------------------------------------------------------------------------------------
// (1) Saving for the children.
// ---------------------------------------------------------------------------------------------------------------
for (const lang of ["en", "bn"]) {
  const tag = `[${lang} 390]`;
  const { ctx, page, errors } = await open({ lang, seed: OWNER_FOLDER + KID_DOC([]) });
  await readView(page);
  // POSITIVE CONTROL: the dialog has both people, the Owner ticked.
  await openDialog(page);
  const ticks0 = await page.evaluate(() => [...document.querySelectorAll("[data-bm-pop-assignees] input")].map((c) => `${c.value}:${c.checked}`).join(","));
  check(`${tag} positive control: Assign to lists Ahsan (ticked) and Maryam`, ticks0 === "p1:true,p2:false", ticks0);
  check(`${tag} positive control: no notice before anything is saved`, (await notice(page)) === null);

  // Only the child.
  await tick(page, ["p2"]);
  const forNow = await page.evaluate(() => document.querySelector("[data-bm-pop-person]").value);
  check(`${tag} child only: "For" follows the tick to Maryam`, forNow === "p2", forNow);
  await save(page);
  let ws = await writes(page);
  const kid = lastSaved(ws, "t1__p2");
  check(`${tag} child only: the bookmark is written to Maryam's own document (surah:2), and nothing to the Owner's`, !!kid && kid.position === "surah:2" && !ws.some((x) => x.id === "t1__p1" && x.data.saved), JSON.stringify(ws.map((x) => x.id)));
  check(`${tag} child only: Maryam's copy is tagged for Maryam, not for the Owner`, kid?.personTagId === "p2", JSON.stringify(kid));
  let n = await notice(page);
  check(`${tag} child only: a notice says who it was saved for`, !!n && n.role === "status" && (lang === "bn" ? n.text === "মারইয়াম-এর জন্য সংরক্ষিত হয়েছে" : n.text === "Saved for Maryam"), JSON.stringify(n));
  check(`${tag} child only: ...inside the screen, no sideways scroll, ✕ 36px+`, !!n && n.inside && n.sx <= 0 && n.closeH >= 36 && n.closeW >= 36, JSON.stringify(n));
  check(`${tag} child only: ...with a 36px+ link to Maryam's bookmarks (person=p2, back=1)`, !!n && n.href === "./bookmarks.html?person=p2&back=1" && n.linkH >= 36 && (lang === "bn" ? /মারইয়াম-এর বুকমার্ক দেখুন/.test(n.linkText) : n.linkText === "See Maryam's bookmarks"), JSON.stringify(n));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/bm-notice-${lang}.png` });
  await hideNotice(page);

  // The child and the Owner.
  await openDialog(page);
  await tick(page, ["p1", "p2"]);
  await save(page);
  ws = await writes(page);
  check(`${tag} both: one write to each person's own document`, !!lastSaved(ws, "t1__p1") && !!lastSaved(ws, "t1__p2"), JSON.stringify(ws.map((x) => x.id)));
  n = await notice(page);
  check(`${tag} both: the notice names both`, !!n && (lang === "bn" ? n.text === "আহসান ও মারইয়াম-এর জন্য সংরক্ষিত হয়েছে" : n.text === "Saved for Ahsan and Maryam"), JSON.stringify(n));
  check(`${tag} both: the Owner's own copy shows on screen (★)`, await page.evaluate(() => document.getElementById("readBookmarkBtn").textContent.includes("★")));
  await hideNotice(page);

  // The Owner alone: no notice (its own ★ says so) -- positive control the other way.
  await removeOwn(page); // ★ -> choice -> "Remove my bookmark" (issue #797: was an instant remove)
  await openDialog(page);
  await save(page);
  check(`${tag} Owner alone: saved to the Owner's document, and no notice`, !!lastSaved(await writes(page), "t1__p1") && (await notice(page)) === null);
  await removeOwn(page);

  // One child + one of the Owner's folders, which Maryam's document does not have.
  await openDialog(page);
  await tick(page, ["p2"]);
  const folderOffered = await page.evaluate(() => { const o = [...document.querySelectorAll("[data-bm-pop-folder] option")].find((x) => x.value === "fOwn"); return !!o && !o.disabled; });
  check(`${tag} one child: the Owner's folder is still offered`, folderOffered);
  await page.selectOption("[data-bm-pop-folder]", "fOwn");
  await save(page);
  ws = await writes(page);
  const madeFolder = ws.filter((x) => x.id === "t1__p2" && x.data.folders).flatMap((x) => x.data.folders).find((f) => f.name === "Children - Bedtime");
  const filed = lastSaved(ws, "t1__p2");
  check(`${tag} one child + Owner's folder: a folder of the same NAME is created in Maryam's document`, !!madeFolder && madeFolder.id !== "fOwn", JSON.stringify(madeFolder));
  check(`${tag} one child + Owner's folder: Maryam's copy is filed in it (never the Owner's folder id)`, !!filed && !!madeFolder && filed.folderId === madeFolder.id, JSON.stringify(filed));
  await hideNotice(page);

  // The link opens Maryam's bookmarks, with ← Back to the Read view.
  await openDialog(page);
  await tick(page, ["p2"]);
  await save(page);
  // No link (a mutation): go to the page anyway, so its own checks still run.
  if (await page.$("#bmSavedNotice:not([hidden]) [data-bm-saved-link]")) await page.click("#bmSavedNotice [data-bm-saved-link]");
  else await page.goto(page.url().replace(/quranrevival\.html.*$/, "bookmarks.html?person=p2&back=1"));
  await page.waitForURL(/bookmarks\.html/, { timeout: 10000 });
  await page.waitForFunction(() => document.getElementById("personSelect")?.value, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  const bm = await page.evaluate(() => {
    const b = document.getElementById("bmBackBtn"); const r = b?.getBoundingClientRect();
    return { person: document.getElementById("personSelect").value, whose: document.getElementById("bmWhoseLine")?.hidden ? null : document.getElementById("bmWhoseLine")?.textContent, listed: document.body.innerText.includes("Maryam's own bookmark"), back: !!r && r.height >= 40 && r.width > 0, backText: b?.textContent ?? "" };
  });
  check(`${tag} the link opens the Bookmarks page on Maryam, showing her bookmarks`, bm.person === "p2" && bm.listed, JSON.stringify(bm));
  check(`${tag} ...and says whose they are`, bm.whose === (lang === "bn" ? "মারইয়াম-এর বুকমার্ক" : "Maryam's bookmarks"), JSON.stringify(bm));
  check(`${tag} ...with a 40px ← Back`, bm.back && (lang === "bn" ? /←/.test(bm.backText) && /[ঀ-৿]/.test(bm.backText) : bm.backText === "← Back"), JSON.stringify(bm));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/bm-kid-page-${lang}.png` });
  if (bm.back) {
    await page.click("#bmBackBtn");
    await page.waitForURL(/quranrevival\.html/, { timeout: 10000 }).catch(() => {});
  }
  check(`${tag} ← Back returns to the Qur'an page`, /quranrevival\.html/.test(page.url()), page.url());
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// The child's document already HAS a folder of that name: reuse it, create nothing.
{
  const tag = "[en 390 existing folder]";
  const { ctx, page } = await open({ seed: OWNER_FOLDER + KID_DOC([{ id: "fKid", name: "Children - Bedtime", parentId: null, personTagId: null, removed: false, createdAt: "2026-01-01T00:00:00.000Z" }]) });
  await readView(page);
  await openDialog(page);
  await tick(page, ["p2"]);
  await page.selectOption("[data-bm-pop-folder]", "fOwn");
  await save(page);
  const ws = await writes(page);
  const filed = lastSaved(ws, "t1__p2");
  check(`${tag} Maryam's copy goes into HER folder of that name (fKid)`, filed?.folderId === "fKid", JSON.stringify(filed));
  check(`${tag} ...and no second folder is created`, !ws.some((x) => x.id === "t1__p2" && x.data.folders), JSON.stringify(ws.map((x) => Object.keys(x.data))));
  await ctx.close();
}

// ---------------------------------------------------------------------------------------------------------------
// (2) The quick unit choice.
// ---------------------------------------------------------------------------------------------------------------
const made = {};
for (const lang of ["en", "bn"]) {
  const tag = `[${lang} 390 units]`;
  const { ctx, page, errors } = await open({ lang });
  await readView(page);
  // Scroll the flow to āyah 8 (page 3), the way a reader does; the active āyah stays 1.
  await page.evaluate(() => document.querySelector('#readView .page-flow-ayah[data-ayah="8"]')?.scrollIntoView({ block: "start", inline: "start", behavior: "instant" }));
  await page.waitForTimeout(500);
  const N = await page.evaluate(() => Number(document.querySelector("#readView .page-flow-ayah.in-view")?.dataset.ayah || 0));
  check(`${tag} precondition: the reader is at āyah ${N} (scrolled past āyah 1)`, N > 5, String(N));
  await openDialog(page);
  const units = await page.evaluate(() => [...document.querySelectorAll("[data-bm-pop-unit]")].map((b) => ({ id: b.dataset.bmPopUnit, text: b.textContent, on: b.getAttribute("aria-checked"), h: b.getBoundingClientRect().height })));
  check(`${tag} three choices: the unit (picked), This āyah, This page`, units.map((u) => `${u.id}:${u.on}`).join(",") === "unit:true,ayah:false,page:false"
    && (lang === "bn" ? units[1]?.text === "এই আয়াত" && units[2]?.text === "এই পৃষ্ঠা" : units[1]?.text === "This āyah" && units[2]?.text === "This page"), JSON.stringify(units));
  check(`${tag} every choice is 36px+ tall`, units.length === 3 && units.every((u) => u.h >= 36), JSON.stringify(units));
  const nameOf = () => page.evaluate(() => document.querySelector("[data-bm-pop-name]").value);
  const name0 = await nameOf();
  check(`${tag} the default Name is the unit's, as before`, lang === "bn" ? /সম্পূর্ণ সূরা/.test(name0) : name0 === "Whole Surah 2", name0);
  await pickUnit(page, "ayah");
  const nameA = await nameOf();
  check(`${tag} This āyah: the Name becomes that āyah (2:${N}), the āyah scrolled to`, nameA.includes(`${digits(lang, 2)}:${digits(lang, N)}`), nameA);
  await pickUnit(page, "page");
  const nameP = await nameOf();
  check(`${tag} This page: the Name becomes Page ${pageOf(N)}`, lang === "bn" ? nameP === `পৃষ্ঠা ${digits(lang, pageOf(N))}` : nameP === `Page ${pageOf(N)}`, nameP);
  await pickUnit(page, "ayah");
  await save(page);
  const ayahBm = lastSaved(await writes(page), "t1__p1");
  check(`${tag} This āyah saves position ayah:2:${N}, opening as the Single Ayah unit at ${N}`, ayahBm?.position === `ayah:2:${N}` && ayahBm?.settings?.unitType === "ayah" && ayahBm?.settings?.ayahNum === N && ayahBm?.settings?.view === "read", JSON.stringify(ayahBm));
  // A typed name is kept when the unit changes; This page saves the page's key.
  await openDialog(page);
  await page.fill("[data-bm-pop-name]", "My bedtime page");
  await pickUnit(page, "page");
  check(`${tag} a typed name is kept when the unit changes`, (await nameOf()) === "My bedtime page", await nameOf());
  await save(page);
  const pageBm = lastSaved(await writes(page), "t1__p1");
  check(`${tag} This page saves position page:madani:${pageOf(N)}, opening as the Page unit`, pageBm?.position === `page:madani:${pageOf(N)}` && pageBm?.settings?.unitType === "page" && pageOf(pageBm?.settings?.ayahNum) === pageOf(N) && pageBm?.name === "My bedtime page", JSON.stringify(pageBm));
  made[lang] = { ayahBm, pageBm, N };
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// Opening those bookmarks lands on that āyah / that page.
for (const lang of ["en"]) {
  const { ayahBm, pageBm, N } = made[lang];
  if (!ayahBm || !pageBm) { check(`[${lang}] opening the saved bookmarks (none were saved)`, false); continue; }
  const seed = `DATA.bookmarks[0].saved.push(${JSON.stringify({ ...ayahBm, id: "bmA" })}, ${JSON.stringify({ ...pageBm, id: "bmP" })});`;
  for (const [id, want] of [["bmA", "ayah"], ["bmP", "page"]]) {
    const { ctx, page } = await open({ lang, seed, path: `/app/quranrevival.html?bookmark=${id}` });
    await page.waitForTimeout(1800);
    const end = await page.evaluate(() => ({ read: document.getElementById("readView")?.hidden === false, surah: document.getElementById("surahSelect").value, ayah: document.getElementById("ayahSelect").value, unit: document.getElementById("unitTypeSelect").value, unitNum: document.getElementById("unitNumSelect")?.value, text: (document.getElementById("readScroll")?.innerText ?? "").length }));
    if (want === "ayah") check(`[${lang}] opening the This-āyah bookmark lands on 2:${N}, Single Ayah, in the Read view`, end.read && end.surah === "2" && end.ayah === String(N) && end.unit === "ayah" && end.text > 0, JSON.stringify(end));
    else check(`[${lang}] opening the This-page bookmark lands on page ${pageOf(N)}, Page unit, in the Read view`, end.read && end.surah === "2" && end.unit === "page" && end.unitNum === String(pageOf(N)) && end.text > 0, JSON.stringify(end));
    await ctx.close();
  }
}

// A Single Ayah unit: no choice (there is nothing smaller); the Mushaf: This page is the page in view.
{
  const { ctx, page } = await open({});
  await readView(page, { unit: "ayah" });
  await openDialog(page);
  check("[en 390 single ayah] no unit choice on a Single Ayah", (await page.evaluate(() => document.querySelectorAll("[data-bm-pop-unit]").length)) === 0);
  await page.click("[data-bm-pop-cancel]");
  await ctx.close();
}
{
  const tag = "[en 390 Mushaf]";
  const { ctx, page } = await open({});
  await readView(page, { unit: "surah", mushaf: true });
  await page.evaluate(() => document.querySelector('.hifz-page[data-mushaf-page="4"]')?.scrollIntoView({ block: "start", inline: "start", behavior: "instant" }));
  await page.waitForTimeout(800);
  const inView = await page.evaluate(() => { const vis = (p) => { const r = p.getBoundingClientRect(); return Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)); }; const ps = [...document.querySelectorAll(".hifz-page[data-mushaf-page]")]; return ps.length ? Number(ps.reduce((a, b) => (vis(b) > vis(a) ? b : a)).dataset.mushafPage) : 0; });
  check(`${tag} precondition: the Mushaf is on page 4`, inView === 4, String(inView));
  await openDialog(page);
  await pickUnit(page, "page");
  await save(page);
  const pBm = lastSaved(await writes(page), "t1__p1");
  check(`${tag} This page = the Mushaf page in view (page:madani:4)`, pBm?.position === "page:madani:4", JSON.stringify(pBm?.position));
  // Issue #786 turned this line from information into a check, in place: it used to only print where the Mushaf was
  // after the save, because the save re-rendered the Read view and landed on the surah's first page (it printed 2).
  // That jump is fixed (refreshBookmarkDisplay keeps the place), so the reader must still be on page 4 now.
  await page.waitForTimeout(1500);
  const afterSave = await page.evaluate(() => { const vis = (p) => { const r = p.getBoundingClientRect(); return Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)); }; const ps = [...document.querySelectorAll(".hifz-page[data-mushaf-page]")]; return ps.length ? Number(ps.reduce((a, b) => (vis(b) > vis(a) ? b : a)).dataset.mushafPage) : 0; });
  check(`${tag} after the save the Mushaf is still on page 4 (it used to jump back to the surah's first page)`, afterSave === 4, String(afterSave));
  await page.evaluate(() => document.querySelector('.hifz-page[data-mushaf-page="4"]')?.scrollIntoView({ block: "start", inline: "start", behavior: "instant" }));
  await page.waitForTimeout(800);
  await openDialog(page);
  await pickUnit(page, "ayah");
  await save(page);
  const aBm = lastSaved(await writes(page), "t1__p1");
  const a = Number(aBm?.position?.split(":")[2]);
  check(`${tag} This āyah = an āyah on that page`, /^ayah:2:\d+$/.test(aBm?.position ?? "") && pageOf(a) === 4, JSON.stringify(aBm?.position));
  await ctx.close();
}

// The dialog's layout: four widths, two languages.
for (const lang of ["en", "bn"]) {
  for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1280, 800]]) {
    const tag = `[${lang} ${w} layout]`;
    const { ctx, page } = await open({ lang, w, h });
    await readView(page);
    await openDialog(page);
    const m = await page.evaluate(() => {
      const pop = document.querySelector(".bm-popover").getBoundingClientRect();
      const btns = [...document.querySelectorAll("[data-bm-pop-unit]")].map((b) => { const r = b.getBoundingClientRect(); return { h: r.height, w: r.width, top: Math.round(r.top), cutX: b.scrollWidth - b.clientWidth, cutY: b.scrollHeight - b.clientHeight }; });
      const actions = [...document.querySelectorAll(".bm-popover-actions button")].map((b) => b.getBoundingClientRect().height);
      return { sx: document.documentElement.scrollWidth - innerWidth, pop: [pop.left, pop.right, pop.top, pop.bottom], W: innerWidth, H: innerHeight, btns, actions };
    });
    check(`${tag} no sideways scroll, the dialog inside the screen`, m.sx <= 0 && m.pop[0] >= 0 && m.pop[1] <= m.W + 0.5 && m.pop[2] >= 0 && m.pop[3] <= m.H + 0.5, JSON.stringify(m));
    check(`${tag} the three choices: one row, each 36px+, nothing cut`, m.btns.length === 3 && new Set(m.btns.map((b) => b.top)).size === 1 && m.btns.every((b) => b.h >= 36 && b.w > 0 && b.cutX <= 1 && b.cutY <= 1), JSON.stringify(m.btns));
    check(`${tag} Cancel and Save are 36px+`, m.actions.length === 2 && m.actions.every((x) => x >= 36), JSON.stringify(m.actions));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/bm-dialog-${lang}-${w}.png` });
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
