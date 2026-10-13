// Issue #797 (PCF J22, the Owner's real use, 12 Oct 2026): "it worked for Zahra only but why can't altogether?" and
// "Saving for all of us at a time doesn't work."  Two faults, both proved fixed here (390 and 1280, en and bn), with
// three people in the tenant (the Owner Ahsan, and two children, Maryam and Yusuf):
//  1. With several people ticked, the Owner's existing folders were greyed out, so "save for all of us into my folder"
//     could not be done. Now an existing folder stays selectable: the selected person's copy carries the folder id,
//     every other person's copy is filed by the folder's NAME in their own document (a live same-name folder reused,
//     else created there). Read view dialog (a) and the Bookmarks page's "+ New bookmark" (b).
//  2. Tapping 🔖/★ when the selected person's own bookmark already exists removed it at once. Now it asks: "Remove my
//     bookmark" or "Add a bookmark…" (40px+, ✕ / Escape close, nothing written until a button is pressed) (c).
//  (d) is the positive control: one person and no folder behaves as before.
// Run from the repository root with serve.js running. Mutations (--mutate=NAME) each put the old behaviour back, and
// the checks named beside each must FAIL:
//   multidisable   Read view dialog greys folders with 2+ ticked       -> (a) folder checks
//   multidisablenb the Bookmarks form does the same                    -> (b) folder checks
//   idonly         bookmark-assign.js ignores choice.folderId when multi -> (a)(b) filing checks
//   instantremove  ★ removes at once, no choice                        -> (c) checks
//   folderid       the Owner's folder id passed straight to a child     -> the by-name checks
import fs from "node:fs";
import { chromium, newContext, openPage, clickReadTool } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  multidisable: ["app/js/bookmark-popover.js", "// An existing folder stays selectable with several people ticked: the",
    "[...folderSelect.options].forEach((opt) => { if (opt.value !== \"\" && opt.value !== \"__new__\") opt.disabled = multi; });\n      if (multi && folderSelect.value !== \"\" && folderSelect.value !== \"__new__\") folderSelect.value = \"\";\n      // the"],
  multidisablenb: ["app/bookmarks.html", 'nbPersonTagField.style.display = multi ? "none" : "";',
    'nbPersonTagField.style.display = multi ? "none" : ""; [...nbFolderSelect.options].forEach((opt) => { if (opt.value !== "" && opt.value !== "__new__") opt.disabled = multi; }); if (multi && nbFolderSelect.value !== "" && nbFolderSelect.value !== "__new__") nbFolderSelect.value = "";'],
  idonly: ["app/js/bookmark-assign.js", "} else if (choice.folderId) {", "} else if (!multi && choice.folderId) {"],
  instantremove: ["app/quranrevival.html", "const pick = await openBookmarkExistsChoice();", 'const pick = "remove";'],
  folderid: ["app/js/bookmark-assign.js", "if (pid === selectedPersonId || !choice.folderName) {", "if (true) {"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const YUSUF = `DATA.tenantPeople.push({ _id: "p3", tenantId: TENANT_ID, personId: "p3", name: lang("Yusuf", "ইউসুফ"), managedByPersonId: "p1", isMinor: true, roles: ["student"] });`;
const FOLDER = "Children - Bedtime";
const OWNER_FOLDER = `DATA.bookmarks[0].folders.push({ id: "fOwn", name: "${FOLDER}", parentId: null, personTagId: null, removed: false, createdAt: "2026-01-01T00:00:00.000Z" });`;
const KID_DOC = (pid, folders) => `DATA.bookmarks.push({ _id: "t1__${pid}", tenantId: "t1", personId: "${pid}", resume: {}, folders: ${JSON.stringify(folders)}, saved: [] });`;
const KID_FOLDER = (id) => ({ id, name: FOLDER, parentId: null, personTagId: null, removed: false, createdAt: "2026-01-01T00:00:00.000Z" });
const OWN_BOOKMARK = `DATA.bookmarks[0].saved.push({ id: "bmOwn", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Al-Baqarah (mine)", position: "surah:2", settings: null, folderId: null, personTagId: null, removed: false, createdAt: "2026-01-02T00:00:00.000Z" });`;

async function open({ lang, w, seed, path = "/app/quranrevival.html" }) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: 844 }, extraSeedJs: YUSUF + seed });
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
async function readView(page) {
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", "2"); await page.waitForTimeout(1500);
  await setSel(page, "unitTypeSelect", "surah"); await page.waitForTimeout(800);
}
const tapBm = async (page) => { await page.evaluate(() => { window.__stubWriteData = []; const n = document.getElementById("bmSavedNotice"); if (n) n.hidden = true; }); await clickReadTool(page, "#readBookmarkBtn"); };
const tick = (page, sel, ids) => page.evaluate(([s, list]) => {
  for (const c of document.querySelectorAll(s)) { if (c.checked !== list.includes(c.value)) c.click(); }
}, [sel, ids]);
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "bookmarks"));
const lastSaved = (ws, docId) => { const w = ws.filter((x) => x.id === docId && x.data.saved).at(-1); return w ? w.data.saved.at(-1) : null; };
const madeFolder = (ws, docId) => ws.filter((x) => x.id === docId && x.data.folders).flatMap((x) => x.data.folders).filter((f) => f.name === FOLDER);
const notice = (page) => page.evaluate(() => { const el = document.getElementById("bmSavedNotice"); return !el || el.hidden ? null : el.querySelector("[data-bm-saved-text]").textContent; });
const ALL3 = { en: "Saved for Ahsan, Maryam and Yusuf", bn: "আহসান, মারইয়াম ও ইউসুফ-এর জন্য সংরক্ষিত হয়েছে" };
const ids = (ws) => JSON.stringify(ws.map((x) => x.id));

/** The shared filing assertions: Owner's copy carries the id, each child's copy is in a same-name folder of their own. */
function filingChecks(tag, ws, { kidHas = [] } = {}) {
  const own = lastSaved(ws, "t1__p1"), m = lastSaved(ws, "t1__p2"), y = lastSaved(ws, "t1__p3");
  check(`${tag} one write of a bookmark to each of the three people's own documents`, !!own && !!m && !!y, ids(ws));
  check(`${tag} the Owner's copy carries the folder id (fOwn)`, own?.folderId === "fOwn", JSON.stringify(own));
  for (const [pid, copy, who] of [["p2", m, "Maryam"], ["p3", y, "Yusuf"]]) {
    const made = madeFolder(ws, `t1__${pid}`);
    if (kidHas.includes(pid)) {
      check(`${tag} ${who}: the same-name folder in HER/HIS document is reused, none created`, made.length === 0 && copy?.folderId === `fk_${pid}`, JSON.stringify({ made, copy }));
    } else {
      check(`${tag} ${who}: a same-name folder is created ONCE in their own document`, made.length === 1 && made[0].id !== "fOwn", JSON.stringify(made));
      check(`${tag} ${who}: the copy is filed in it, never under the Owner's folder id`, !!made[0] && copy?.folderId === made[0].id && copy.folderId !== "fOwn", JSON.stringify(copy));
    }
  }
}

for (const lang of ["en", "bn"]) {
  for (const w of [390, 1280]) {
    const tag = `[${lang} ${w}]`;

    // (a) The Read view dialog: three ticked + the Owner's folder; then a second save with a child's folder already there.
    for (const second of [false, true]) {
      const t = `${tag} (a${second ? "2" : ""})`;
      const seed = OWNER_FOLDER + KID_DOC("p2", second ? [KID_FOLDER("fk_p2")] : []) + KID_DOC("p3", []);
      const { ctx, page, errors } = await open({ lang, w, seed });
      await readView(page);
      await tapBm(page);
      await page.waitForSelector("[data-bm-pop-save]", { timeout: 8000 });
      await tick(page, "[data-bm-pop-assignees] input", ["p1", "p2", "p3"]);
      const opt = await page.evaluate(() => { const o = [...document.querySelectorAll("[data-bm-pop-folder] option")].find((x) => x.value === "fOwn"); return o ? { disabled: o.disabled } : null; });
      check(`${t} three ticked: the Owner's folder is still selectable (not greyed)`, !!opt && opt.disabled === false, JSON.stringify(opt));
      await page.selectOption("[data-bm-pop-folder]", "fOwn");
      const kept = await page.evaluate(() => document.querySelector("[data-bm-pop-folder]").value);
      check(`${t} three ticked: the folder choice is kept`, kept === "fOwn", kept);
      await page.click("[data-bm-pop-save]"); await page.waitForTimeout(1000);
      const ws = await writes(page);
      filingChecks(t, ws, { kidHas: second ? ["p2"] : [] });
      check(`${t} the notice names all three`, (await notice(page)) === ALL3[lang], String(await notice(page)));
      check(`${t} no page errors`, errors.length === 0 || errors.every((e) => /ERR_CERT|archive\.org|api\.quran/.test(String(e))), JSON.stringify(errors));
      await ctx.close();
    }

    // (b) The Bookmarks page's "+ New bookmark".
    {
      const t = `${tag} (b)`;
      const { ctx, page } = await open({ lang, w, seed: OWNER_FOLDER + KID_DOC("p2", []) + KID_DOC("p3", []), path: "/app/bookmarks.html" });
      await page.waitForSelector("#newBookmarkBtn", { state: "visible", timeout: 15000 });
      await page.waitForFunction(() => document.getElementById("personSelect")?.value, null, { timeout: 15000 });
      await page.evaluate(() => { window.__stubWriteData = []; });
      await page.click("#newBookmarkBtn");
      await page.waitForFunction(() => document.getElementById("nbName")?.value, null, { timeout: 10000 });
      await tick(page, "#nbAssignees input", ["p1", "p2", "p3"]);
      const opt = await page.evaluate(() => { const o = [...document.querySelectorAll("#nbFolder option")].find((x) => x.value === "fOwn"); return o ? { disabled: o.disabled } : null; });
      check(`${t} three ticked: the Owner's folder is still selectable (not greyed)`, !!opt && opt.disabled === false, JSON.stringify(opt));
      await page.selectOption("#nbFolder", "fOwn");
      await page.click("#nbCreateBtn"); await page.waitForTimeout(1000);
      filingChecks(t, await writes(page));
      check(`${t} the notice names all three`, (await notice(page)) === ALL3[lang], String(await notice(page)));
      await ctx.close();
    }

    // (c) The Owner's bookmark already exists on the unit.
    for (const action of ["add", "remove", "close", "escape"]) {
      const t = `${tag} (c ${action})`;
      const { ctx, page } = await open({ lang, w, seed: OWNER_FOLDER + OWN_BOOKMARK + KID_DOC("p2", []) + KID_DOC("p3", []) });
      await readView(page);
      check(`${t} precondition: the unit already shows ★`, await page.evaluate(() => document.getElementById("readBookmarkBtn")?.textContent.includes("★")));
      await tapBm(page);
      await page.waitForSelector("[data-bm-exists-choice]", { timeout: 8000 }).catch(() => {});
      const ch = await page.evaluate(() => {
        const q = (s) => document.querySelector(s)?.getBoundingClientRect();
        const r = q("[data-bm-exists-remove]"), a = q("[data-bm-exists-add]"), c = q("[data-bm-exists-close]");
        return { has: !!r && !!a, rh: r?.height ?? 0, ah: a?.height ?? 0, ch: c?.height ?? 0, cw: c?.width ?? 0, rt: document.querySelector("[data-bm-exists-remove]")?.textContent, at: document.querySelector("[data-bm-exists-add]")?.textContent, sx: document.documentElement.scrollWidth - innerWidth };
      });
      check(`${t} the tap shows the two-button choice (not an instant remove)`, ch.has, JSON.stringify(ch));
      if (!ch.has) { await ctx.close(); continue; }
      if (action === "add") {
        check(`${t} buttons 40px+ and labelled in ${lang}`, ch.rh >= 40 && ch.ah >= 40 && ch.ch >= 40 && ch.cw >= 40 && ch.sx <= 0 && (lang === "bn" ? ch.rt === "আমার বুকমার্ক সরান" && ch.at === "বুকমার্ক যোগ করুন…" : ch.rt === "Remove my bookmark" && ch.at === "Add a bookmark…"), JSON.stringify(ch));
        check(`${t} showing the choice wrote nothing`, (await writes(page)).length === 0);
        await page.click("[data-bm-exists-add]");
        await page.waitForSelector("[data-bm-pop-save]", { timeout: 8000 });
        await tick(page, "[data-bm-pop-assignees] input", ["p1", "p2", "p3"]);
        await page.click("[data-bm-pop-save]"); await page.waitForTimeout(1000);
        const ws = await writes(page);
        check(`${t} Add a bookmark… saves for all three`, !!lastSaved(ws, "t1__p1") && !!lastSaved(ws, "t1__p2") && !!lastSaved(ws, "t1__p3"), ids(ws));
        check(`${t} ...and the Owner's existing bookmark is still there (not removed)`, !ws.some((x) => x.data.saved?.some((s) => s.id === "bmOwn" && s.removed)) && ws.filter((x) => x.id === "t1__p1").every((x) => (x.data.saved ?? []).some((s) => s.id === "bmOwn" && !s.removed)), JSON.stringify(ws.filter((x) => x.id === "t1__p1")));
        check(`${t} ...and the notice names all three`, (await notice(page)) === ALL3[lang], String(await notice(page)));
      } else if (action === "remove") {
        await page.click("[data-bm-exists-remove]"); await page.waitForTimeout(900);
        const ws = await writes(page);
        check(`${t} Remove my bookmark removes only it`, ws.length >= 1 && ws.every((x) => x.id === "t1__p1") && ws.some((x) => x.data.saved?.some((s) => s.id === "bmOwn" && s.removed)), ids(ws));
        check(`${t} ...and the choice is gone`, !(await page.$("[data-bm-exists-choice]")));
      } else {
        if (action === "close") await page.click("[data-bm-exists-close]"); else await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
        check(`${t} the choice closes and nothing is written`, !(await page.$("[data-bm-exists-choice]")) && (await writes(page)).length === 0);
        check(`${t} the Owner's bookmark is untouched (still ★)`, await page.evaluate(() => document.getElementById("readBookmarkBtn")?.textContent.includes("★")));
      }
      await ctx.close();
    }

    // (d) Positive control: one person, no folder, a fresh unit -- as before (no choice, one write).
    {
      const t = `${tag} (d)`;
      const { ctx, page } = await open({ lang, w, seed: KID_DOC("p2", []) });
      await readView(page);
      await tapBm(page);
      await page.waitForSelector("[data-bm-pop-save]", { timeout: 8000 });
      check(`${t} a fresh unit goes straight to the dialog (no choice)`, !(await page.$("[data-bm-exists-choice]")));
      await page.click("[data-bm-pop-save]"); await page.waitForTimeout(900);
      const ws = await writes(page);
      check(`${t} one write, to the Owner's own document, in no folder, and no notice`, ws.every((x) => x.id === "t1__p1") && !!lastSaved(ws, "t1__p1") && lastSaved(ws, "t1__p1").folderId == null && (await notice(page)) === null, ids(ws));
      await ctx.close();
    }
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
