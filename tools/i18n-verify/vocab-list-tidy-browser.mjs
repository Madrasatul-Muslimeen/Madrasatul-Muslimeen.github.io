// The Owner, 18 Nov 2026 (Vocab List, Tidy A + "Enable all title texts editable by me ... a delete button as well for admin/owner only. Every device."):
//   1. Learn next's title row holds "Due today" and "Review now"; the ✕ stays in that row; when narrow "Review now" is "Review"
//   2. each Already Known group is one short line (title with its Bangla line beside it)
//   3. the owner edits a group title (✎), puts it back (↺), hides a group (🗑, a second tap) and shows it again; saved on the TENANT document so
//      every device sees it; a reader who is not owner/prime sees none of these buttons
//   4. the Word card's "Already Known" group follows the Vocab List (a hidden group leaves it, an owner's title is its chip's name)
//   node tools/i18n-verify/vocab-list-tidy-browser.mjs [--mutate=NAME]   (repo root, serve.js on :8080 / QR_BASE)
//   --mutate=closeout    the ✕ is pushed out of the title row when narrow        -> "the ✕ stays in the title row" FAILS
//   --mutate=longlabel   "Review now" never shortens                             -> "narrow: the button reads Review" FAILS
//   --mutate=tallrows    the Bangla line is back under the title                 -> "each group is one line" FAILS
//   --mutate=everyone    every reader gets the edit/hide buttons                  -> "a reader who cannot manage sees no ✎ 🗑" FAILS
//   --mutate=nosave      the title is changed on screen only                     -> "saved on the tenant document" FAILS
//   --mutate=nohide      hiding does nothing                                      -> "hiding a group takes it out" FAILS
//   --mutate=stale       a save ignores what another device saved meanwhile    -> "a save keeps what another device saved meanwhile" FAILS
//   --mutate=noheading   the heading Already known has no editor               -> "the owner edits the heading" FAILS
//   --mutate=cardkeeps   the Word card ignores the hidden group                   -> "the Word card follows" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const PAGE = "app/quranrevival.html";
const MUT = {
  closeout: [PAGE, "#learnNextSheet .ln-head .ln-close { order: 4; }", "#learnNextSheet .ln-head .ln-close { order: 9; }"],
  longlabel: [PAGE, "    #learnNextSheet .ln-head .ln-review-go { font-size: 0; }\n    #learnNextSheet .ln-head .ln-review-go::after { content: attr(data-short); font-size: 0.86rem; }\n", ""],
  tallrows: [PAGE, "  .lnk-t small { display: inline; margin-inline-start: 0.5rem; }", "  .lnk-t small { display: block; }"],
  everyone: [PAGE, "${knownCanEdit() ? `<span class=\"lnk-own\">", "${true ? `<span class=\"lnk-own\">"],
  nosave: [PAGE, "const clean = await saveKnownGroupSettings(db, tenantId, next, updateDocument);", "const clean = knownGroupSettingsFromTenantDoc({ [KNOWN_SETTINGS_FIELD]: next });"],
  nohide: [PAGE, "return { asma, lists: all.filter((l) => !isKnownGroupHidden(settings, l.k)) };", "return { asma, lists: all };"],
  stale: [PAGE, "if (snap.exists()) fresh = snap.data();", ""],
  noheading: [PAGE, "const heading = knownCanEdit() ? `<div class=\"lnk-heading\">", "const heading = false ? `<div class=\"lnk-heading\">"],
  cardkeeps: [PAGE, "const marks = knownGroupMarks({ groups: base.lists,", "const marks = knownGroupMarks({ groups: [...base.lists, ...knownGroupsData.groups.filter((g) => !base.lists.some((l) => l.k === g.k)).map((g) => ({ k: g.k, lemmas: g.lemmas }))],"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error(`promise: ${n}`); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const READER = `DATA.tenantMemberUids[0].roles = ["student"]; DATA.tenantPeople[0].roles = ["student"];`;
const sleep = (p, ms) => p.waitForTimeout(ms);
async function openSheet(page) {
  if (!(await page.evaluate(() => (document.getElementById("tabVocabularyBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await sleep(page, 150); }
  await page.click("#tabVocabularyBtn");
  await page.waitForFunction(() => { const s = document.getElementById("learnNextSheet"); return s && !s.hidden && s.querySelectorAll(".ln-row").length > 0; }, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-known-tile]")?.click()); await sleep(page, 400);
}
// __stubWriteData keeps the written VALUES (sessionStorage.__stubWrites keeps only the field names)
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).map((w) => ({ col: w.col, id: w.id, data: w.data })));

for (const [lang, width, height, reader] of [["en", 1280, 900, false], ["en", 390, 844, false], ["bn", 390, 844, false], ["en", 1280, 900, true]]) {
  const tag = `[${lang} ${width}${reader ? " reader" : ""}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: (reader ? READER : "") + " window.__tenantDoc = DATA.tenants[0];" });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) { const [file, a, b] = MUT[MUTATE]; await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (src.split(a).length !== 2) throw new Error(`mutation anchor missing or not unique: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }); }); }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 500);
  await openSheet(page);
  const panelOpen = await page.evaluate(() => !!document.querySelector("#learnNextSheet [data-lnk]"));
  check(`${tag} POSITIVE CONTROL: the Already known groups are open`, panelOpen);

  if (!reader) {
    // ---- 1. the title row ---------------------------------------------------------------------------------------
    await page.evaluate(() => { const s = document.querySelector("#learnNextSheet [data-ln-review]"); s.innerHTML = '<p class="ln-review-msg ln-due"><b>Due today: 25 words</b></p><button type="button" class="ln-vbtn ln-review-go" data-ln-review-go data-short="Review">Review now</button>'; });
    await sleep(page, 200);
    const h = await page.evaluate(() => { const b = (s) => { const r = document.querySelector(`#learnNextSheet ${s}`)?.getBoundingClientRect(); return r && r.width > 0 ? { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height) } : null; };
      const go = document.querySelector("#learnNextSheet .ln-review-go"); const cs = getComputedStyle(go), af = getComputedStyle(go, "::after");
      return { head: b(".ln-head"), title: b(".ln-title"), close: b(".ln-close"), review: b(".ln-review"), go: b(".ln-review-go"), sheet: b("") ?? { right: innerWidth }, text: go.textContent.trim(), fs: cs.fontSize, after: af.content, wide: innerWidth };
    });
    check(`${tag} "Due today" and "Review now" are in the title row's header, the button ≥ 44px tall`, !!h.head && !!h.review && !!h.go && h.review.top >= h.head.top - 1 && h.review.bottom <= h.head.bottom + 1 && h.go.h >= 44, JSON.stringify(h));
    check(`${tag} the ✕ stays in the title row (same line as the title) and inside the window`, !!h.close && !!h.title && Math.abs(h.close.top - h.title.top) <= 12 && h.close.right <= h.head.right + 1, JSON.stringify({ close: h.close, title: h.title, head: h.head }));
    if (width >= 1000) {
      check(`${tag} wide: Due today and the button share the title's line, and the button says "Review now"`, Math.abs(h.review.top - h.title.top) <= 14 && h.text === "Review now" && h.after === "none", JSON.stringify(h));
    } else {
      check(`${tag} narrow: the button reads Review (the full words fold away) and the strip takes a line under the title`, h.fs === "0px" && /Review|পুনরালোচনা/.test(h.after) && !/now|এখন/.test(h.after) && h.review.top >= h.title.top + 20, JSON.stringify(h));
    }
    await page.evaluate(() => { document.querySelector("#learnNextSheet [data-ln-review]").innerHTML = ""; });

    // ---- 2. one line per group -----------------------------------------------------------------------------------
    const rows = await page.evaluate(() => [...document.querySelectorAll("#learnNextSheet .lnk-g > summary")].map((s) => ({ k: s.parentElement.dataset.lnkG, h: Math.round(s.getBoundingClientRect().height), small: s.querySelector(".lnk-t small") ? getComputedStyle(s.querySelector(".lnk-t small")).display : null })));
    if (width >= 1000) check(`${tag} each group is one line (≤ 52px), the Bangla line beside its title`, rows.length === 7 && rows.every((r) => r.h <= 52 && (r.small === null || r.small === "inline")), JSON.stringify(rows));
    else check(`${tag} the Bangla line sits beside the title, not under it`, rows.length === 7 && rows.every((r) => r.small === null || r.small === "inline"), JSON.stringify(rows));

    // ---- 3. the owner's own titles and the hide button -----------------------------------------------------------
    const bn = lang === "bn";
    const own = await page.evaluate(() => ({ edit: document.querySelectorAll("#learnNextSheet [data-lnk-edit]").length, hide: document.querySelectorAll("#learnNextSheet [data-lnk-hide]").length, reset: document.querySelectorAll("#learnNextSheet [data-lnk-reset]").length, small: [...document.querySelectorAll("#learnNextSheet .lnk-ib")].every((b) => b.getBoundingClientRect().width >= 34 && b.getBoundingClientRect().height >= 34) }));
    check(`${tag} the owner sees ✎ on all seven groups and on the heading, 🗑 on all seven groups (≥ 34px), and ↺ only after a change`, own.edit === 8 && own.hide === 7 && own.reset === 0 && own.small, JSON.stringify(own));
    await page.evaluate(() => { sessionStorage.setItem("__stubWrites", "[]"); window.__stubWriteData = []; });
    // another device hides Daily Life while this page still holds the old settings; this page then edits a title: the save must keep that hide
    await page.evaluate(() => { window.__tenantDoc.learnNextKnownGroups = { titles: {}, hidden: ["daily"] }; });
    await page.evaluate(() => document.querySelector('#learnNextSheet [data-lnk-edit="prophets"]').click()); await sleep(page, 200);
    const inp = await page.evaluate(() => { const i = document.querySelector("#learnNextSheet [data-lnk-title='prophets'] input"); return i ? { v: i.value, focused: document.activeElement === i } : null; });
    check(`${tag} ✎ opens the title in a box, focused, holding the current words`, !!inp && inp.v.length > 2 && inp.focused, JSON.stringify(inp));
    await page.fill("#learnNextSheet [data-lnk-title='prophets'] input", bn ? "নবীগণ" : "The Prophets"); await page.keyboard.press("Enter"); await sleep(page, 600);
    const t1 = await page.evaluate(() => document.querySelector("#learnNextSheet [data-lnk-g='prophets'] .lnk-t")?.childNodes[0]?.textContent.trim());
    check(`${tag} Enter puts the owner's words in the title`, t1 === (bn ? "নবীগণ" : "The Prophets"), String(t1));
    const w = await writes(page);
    const tw = w.find((x) => x.col === "tenants" && JSON.stringify(x.data).includes("learnNextKnownGroups"));
    check(`${tag} saved on the tenant document (field learnNextKnownGroups, titles.prophets.${bn ? "bn" : "en"}), so every device reads it`, !!tw && tw.data.learnNextKnownGroups?.titles?.prophets?.[bn ? "bn" : "en"] === (bn ? "নবীগণ" : "The Prophets"), JSON.stringify(w.slice(0, 3)));
    check(`${tag} a save keeps what another device saved meanwhile (Daily Life stays hidden, the new title is there too)`, !!tw && (tw.data.learnNextKnownGroups?.hidden ?? []).join() === "daily" && tw.data.learnNextKnownGroups?.titles?.prophets?.[bn ? "bn" : "en"] === (bn ? "নবীগণ" : "The Prophets"), JSON.stringify(tw?.data));
    check(`${tag} ↺ is offered for the changed title`, await page.evaluate(() => !!document.querySelector('#learnNextSheet [data-lnk-reset="prophets"]')));
    await page.evaluate(() => document.querySelector('#learnNextSheet [data-lnk-reset="prophets"]').click()); await sleep(page, 600);
    const t2 = await page.evaluate(() => document.querySelector("#learnNextSheet [data-lnk-g='prophets'] .lnk-t")?.childNodes[0]?.textContent.trim());
    check(`${tag} ↺ puts the app's own title back`, t2 !== (bn ? "নবীগণ" : "The Prophets") && !!t2, String(t2));
    // the heading "Already known" itself (tile, panel, Word card) is editable too
    await page.evaluate(() => document.querySelector('#learnNextSheet [data-lnk-edit="_known"]')?.click()); await sleep(page, 200);
    await page.fill("#learnNextSheet [data-lnk-title='_known'] input", bn ? "জানা শব্দ" : "Known words"); await page.keyboard.press("Enter"); await sleep(page, 600);
    const hd = await page.evaluate(() => ({ head: document.querySelector("#learnNextSheet [data-lnk-title='_known']")?.textContent.trim(), tile: document.querySelector("#learnNextSheet [data-ln-known-tile] .ln-tile-n")?.textContent.trim() }));
    const hw = (await writes(page)).find((x) => x.col === "tenants" && x.data.learnNextKnownGroups?.titles?._known);
    check(`${tag} the owner edits the heading "Already known": the panel and the tile carry the new words, saved as titles._known`, hd.head === (bn ? "জানা শব্দ" : "Known words") && hd.tile === hd.head && !!hw, JSON.stringify({ hd, hw: hw?.data }));
    await page.evaluate(() => document.querySelector('#learnNextSheet [data-lnk-reset="_known"]')?.click()); await sleep(page, 600);
    // hide: a first tap only arms it, a second hides
    await page.evaluate(() => document.querySelector('#learnNextSheet [data-lnk-hide="people"]').click()); await sleep(page, 200);
    const armed = await page.evaluate(() => ({ still: !!document.querySelector("#learnNextSheet [data-lnk-g='people']"), armed: document.querySelector('#learnNextSheet [data-lnk-hide="people"]')?.dataset.armed }));
    check(`${tag} the first tap on 🗑 only asks ("Tap again to hide"); nothing is hidden yet`, armed.still && armed.armed === "1", JSON.stringify(armed));
    await page.evaluate(() => document.querySelector('#learnNextSheet [data-lnk-hide="people"]').click()); await sleep(page, 600);
    const afterHide = await page.evaluate(() => ({ keys: [...document.querySelectorAll("#learnNextSheet [data-lnk-g]")].map((g) => g.dataset.lnkG), restore: !!document.querySelector("#learnNextSheet [data-lnk-unhide='people']") }));
    check(`${tag} hiding a group takes it out of the list (five left: Daily Life was hidden from the other device) and offers "Show again"`, afterHide.keys.join() === "allah,prophets,ibadah,language,bnnames" && afterHide.restore, JSON.stringify(afterHide));
    const w2 = await writes(page);
    check(`${tag} hiding is saved on the tenant document (hidden: [people]); nothing is deleted`, w2.some((x) => x.col === "tenants" && (x.data.learnNextKnownGroups?.hidden ?? []).join() === "people,daily" || (x.data.learnNextKnownGroups?.hidden ?? []).join() === "daily,people") && !w2.some((x) => /delete/i.test(JSON.stringify(x))), JSON.stringify(w2.slice(-2)));
    // ---- 4. the Word card follows ----------------------------------------------------------------------------------
    await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-back]")?.click()); await sleep(page, 300);
    await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
    if (!(await page.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await sleep(page, 200); }
    await page.click("#tabReadBtn");
    const occ = "quran-word-occurrence:v1:1:1:2";
    await page.waitForFunction((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`), occ, { timeout: 12000 }).catch(() => {});
    await page.evaluate((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`)?.click(), occ);
    await page.waitForSelector("[data-known-marks]", { timeout: 15000 }).catch(() => {});
    const card = await page.evaluate(() => ({ keys: [...document.querySelectorAll("[data-known-marks] [data-known-group]")].map((b) => b.dataset.knownGroup) }));
    check(`${tag} the Word card follows: the hidden group (Well-Known Names) is not among its categories`, card.keys.length > 0 && !card.keys.includes("people") && card.keys.join() === "allah,prophets,ibadah,language,bnnames", JSON.stringify(card));
  } else {
    // a reader who cannot manage
    const own = await page.evaluate(() => ({ groups: document.querySelectorAll("#learnNextSheet [data-lnk-g]").length, buttons: document.querySelectorAll("#learnNextSheet [data-lnk-edit], #learnNextSheet [data-lnk-hide], #learnNextSheet [data-lnk-reset], #learnNextSheet [data-lnk-unhide]").length }));
    check(`${tag} a reader who cannot manage sees no ✎ 🗑 (the groups are there: ${own.groups})`, own.groups === 7 && own.buttons === 0, JSON.stringify(own));
  }
  await ctx.close();
}
await browser.close();
console.log(`\n==== Vocab List: tidy window, owner titles and hide (the Owner, 18 Nov 2026)${MUTATE ? ` [MUTATE=${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
