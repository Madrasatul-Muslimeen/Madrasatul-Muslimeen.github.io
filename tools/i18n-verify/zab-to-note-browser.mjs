// PCF J25, round Z5 (issue #829) -- Zab "→ Note" into Mapping My Journey, in a real browser, gate open.
//
// Proves, at 320 / 390 / 820 / 1440px in English and Bangla (via __stubWriteData with transaction values on):
//   plain  -- a Note is created OWNED BY THE READER (not the item's adder), titled with the first line, body escaped,
//             filed in the chosen folder; the item is TRASHED (not deleted) with noteId; a toast with Open follows;
//             Open's address carries note=<id> and back=1; the Trash row says "Became a Note" and links to it.
//   task   -- an item that names an existing folder is filed there with NO picker; due date and steps are in the body.
//   link   -- the url is written as a link.
//   fail   -- a failing Note write leaves the item untouched and says so; a failing trash says the Note WAS saved.
//   layout -- the row's controls stay on ONE line and the text keeps >= 70% of the panel's width.
//   way back (en) -- after Open, history.back() reopens Zab on the same pocket.
// --mutate=p..u serves one broken copy of a file, so each check is shown to fail:
//   p: the Note is owned by the item's adder      q: the trash drops noteId
//   r: the Open link has no back=1                s: the item is not trashed at all
//   t: a failed save still removes the item       u: the body is not escaped
//   v: on journey-map.html, Open puts the tray over the page itself   w: no visible ← Back there
// Screenshots (picker open, toast showing) go to /tmp/zab-z5-shots.
// Run from the repository root with `node serve.js` running.
import fs from "node:fs";
import { chromium, newContext, BASE } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);

const READY_OPEN = `
export const ZAB_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const ZAB_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-14", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isZabReady() { return true; }
export const REASON_ZAB_NOT_DEPLOYED = "zab-rules-not-deployed";
export const REASON_ZAB_DECISION_INCOMPLETE = "zab-readiness-decision-incomplete";
export function zabUnavailableReason() { return null; }
`;
function swap(src, from, to) {
  if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 70)}`);
  return src.split(from).join(to);
}
async function routeText(ctx, glob, mutate) {
  const file = "app/" + glob.replace("**/", "");
  const src = mutate(fs.readFileSync(file, "utf8"));
  await ctx.route(glob, (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src }));
}
async function routeMutation(ctx) {
  if (!MUTATE) return;
  if (MUTATE === "p") await routeText(ctx, "**/js/zab-to-note.js", (s) => swap(s, "ownerPersonId: ctx.personId, ownerUid", "ownerPersonId: item.addedByPersonId, ownerUid"));
  else if (MUTATE === "q") await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, "deletedAt: serverTimestamp(), noteId }", "deletedAt: serverTimestamp() }"));
  else if (MUTATE === "r") await routeText(ctx, "**/js/zab-to-note.js", (s) => swap(s, "&back=1", ""));
  else if (MUTATE === "w") await ctx.route("**/journey-map.html*", async (route) => { const r = await route.fetch(); const b = (await r.text()).split('document.getElementById("jmBackBtn")) {').join('document.getElementById("jmBackBtn") && false) {'); await route.fulfill({ response: r, body: b }); }); // no visible ← Back on Mapping My Journey
  else if (MUTATE === "s") await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, `{ status: "trashed", deletedAt: serverTimestamp(), noteId }`, `{ noteId }`));
  else if (MUTATE === "t") await routeText(ctx, "**/js/zab-bar.js", (s) => swap(s, "  if (!res.ok) {\n    S.msg = res.stage", "  S.items = S.items.filter((i) => i.itemId !== itemId);\n  if (!res.ok) {\n    S.msg = res.stage"));
  else if (MUTATE === "u") await routeText(ctx, "**/js/zab-to-note.js", (s) => swap(s, "parts.push(`<p>${esc(l)}</p>`)", "parts.push(`<p>${l}</p>`)"));
  else if (MUTATE === "v") await routeText(ctx, "**/js/zab-bar.js", (s) => swap(s, "if (/\\/journey-map\\.html$/.test(location.pathname)) {", "if (false) {")); // the tray over its own page
  else throw new Error(`unknown mutation ${MUTATE}`);
}

const stampFor = (by) => `createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-1", schemaVersion: 1, addedByPersonId: "${by}", tenantId: "t1", status: "active"`;
const stamp = stampFor("p1");
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__DATA = DATA; window.__stubRecordTxData = true;
  DATA.zabPockets = [
    { _id: "t1__pk-plain", pocketId: "pk-plain", order: 0, name: "Plain", icon: "📁", ${stamp} },
    { _id: "t1__pk-tasks", pocketId: "pk-tasks", order: 1, name: "Tasks", icon: "✅", ztype: "tasks", ${stamp} },
    { _id: "t1__pk-links", pocketId: "pk-links", order: 2, name: "Links", icon: "🔗", ztype: "links", ${stamp} },
  ];
  DATA.zabItems = [
    { _id: "t1__pl-1", itemId: "pl-1", pocketId: "pk-plain", order: 0, text: "Buy <b>dates</b> for iftar, a rather long title to test the row's wrapping\\nsecond line", done: false, tags: ["food"], ${stampFor("p2")} },
    { _id: "t1__pl-2", itemId: "pl-2", pocketId: "pk-plain", order: 1, text: "Fail the Note write", done: false, ${stamp} },
    { _id: "t1__pl-3", itemId: "pl-3", pocketId: "pk-plain", order: 2, text: "Fail the trash", done: false, ${stamp} },
    { _id: "t1__tk-1", itemId: "tk-1", pocketId: "pk-tasks", order: 0, text: "Revise Juz 30", done: false, due: "2026-10-20", folderIds: ["f-ref"], steps: [{ id: "s1", t: "Read", d: true }, { id: "s2", t: "Recite", d: false }], ${stamp} },
    { _id: "t1__lk-1", itemId: "lk-1", pocketId: "pk-links", order: 0, text: "Ayat al-Kursi", url: "https://quran.com/2/255", done: false, ${stamp} },
  ];
  DATA.noteFolders = [
    { _id: "t1__f-ref", folderId: "f-ref", tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", name: "Reflections", status: "active", semanticRole: "user", order: 0, ${stamp.replace('addedByPersonId: "p1", ', "")} },
    { _id: "t1__f-two", folderId: "f-two", tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", name: "Duas", status: "active", semanticRole: "user", order: 1, ${stamp.replace('addedByPersonId: "p1", ', "")} },
  ];
})();`;

async function open(browser, { lang, width, path = "records.html", seed = "" }) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 860 }, extraSeedJs: SEED + seed });
  await ctx.route((u) => !["localhost", "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  await ctx.route("**/js/zab-readiness.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_OPEN }));
  await routeMutation(ctx);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app/${path}`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  await page.evaluate(() => { for (const el of document.querySelectorAll('[id*="splash"], .mm-splash-overlay')) el.remove(); });
  return { ctx, page };
}
const opener = (w) => (w >= 768 ? "#zabBar [data-zab-open]" : "#zabCorner");
const allWrites = (page) => page.evaluate(() => window.__stubWriteData || []);
const settle = (page) => page.evaluate(() => {
  for (const w of window.__stubWriteData || []) {
    if (!/^zab/.test(w.col || "")) continue;
    const rows = (window.__DATA[w.col] = window.__DATA[w.col] || []);
    let row = rows.find((d) => d._id === w.id);
    if (!row) { if (/update/.test(w.kind)) continue; row = { _id: w.id }; rows.push(row); }
    for (const [k, v] of Object.entries(w.data || {})) { if (v && v.__deleteField) delete row[k]; else row[k] = v; }
  }
});
async function openPocket(page, w, id) {
  const panelOpen = await page.evaluate(() => { const p = document.querySelector("#zabPanel"); return p && !p.hidden; });
  if (!panelOpen) await page.click(opener(w));
  else if (await page.$("#zabPanel .zab-head [data-zab-nav='list']")) await page.click("#zabPanel .zab-head [data-zab-nav='list']");
  if (await page.$("#zabToast:not([hidden]) [data-zab-toast-close]")) await page.click("#zabToast [data-zab-toast-close]");
  await page.waitForSelector(`#zabPanel [data-zab-pocket="${id}"]`, { timeout: 8000 });
  await page.click(`#zabPanel [data-zab-pocket="${id}"]`);
  await page.waitForSelector("#zabPanel [data-zab-new-item]", { timeout: 8000 });
  await page.waitForSelector("#zabPanel [data-zab-item]", { timeout: 8000 });
}
const shot = async (page, name) => { fs.mkdirSync("/tmp/zab-z5-shots", { recursive: true }); await page.screenshot({ path: `/tmp/zab-z5-shots/${name}.png` }); };

const browser = await chromium.launch();
for (const lang of ["en", "bn"]) {
  for (const w of [320, 390, 820, 1440]) {
    const tag = `${w}px ${lang}`;
    const { ctx, page } = await open(browser, { lang, width: w });
    try {
      await openPocket(page, w, "pk-plain");

      // --- layout: one line of controls, text keeps >= 70% of the panel
      const geo = await page.evaluate(() => {
        const panel = document.querySelector("#zabPanel").getBoundingClientRect();
        const row = document.querySelector('[data-zab-item="pl-1"]');
        const acts = [...row.querySelectorAll(".zab-acts > *")].map((e) => e.getBoundingClientRect());
        const main = row.querySelector(".zab-main").getBoundingClientRect();
        const actsBox = row.querySelector(".zab-acts").getBoundingClientRect();
        return { tops: acts.map((r) => Math.round(r.top)), n: acts.length, mainW: main.width, panelW: panel.width,
          overflow: Math.max(...acts.map((r) => r.right)) - panel.right, left: Math.min(...acts.map((r) => r.left)) - panel.left, actsW: actsBox.width,
          hasNote: !!row.querySelector("[data-zab-tonote]"), noteW: row.querySelector("[data-zab-tonote]")?.getBoundingClientRect().width };
      });
      check(`${tag}: the row has a → Note button (>= 40px wide)`, geo.hasNote && geo.noteW >= 40, JSON.stringify(geo));
      check(`${tag}: the row's controls sit on one line`, new Set(geo.tops).size === 1 && geo.n >= 6, JSON.stringify(geo));
      check(`${tag}: … none runs past the panel`, geo.overflow <= 1 && geo.left >= -1, JSON.stringify(geo));
      check(`${tag}: the text keeps >= 70% of the panel width`, geo.mainW >= 0.7 * geo.panelW, `${geo.mainW}/${geo.panelW}`);

      // --- A: plain item, picker, chosen folder
      await page.click('[data-zab-item="pl-1"] [data-zab-tonote]');
      await page.waitForSelector("#zabPanel [data-zab-note-folder]", { timeout: 8000 });
      const opts = await page.$$eval("#zabPanel [data-zab-note-folder] option", (o) => o.map((x) => x.textContent.trim()));
      check(`${tag}: the picker lists "No folder" and the reader's folders`, opts.length === 3 && opts.includes("Reflections") && opts.includes("Duas"), JSON.stringify(opts));
      if (w === 390 || w === 1440) await shot(page, `${lang}-${w}-picker`);
      await page.selectOption("#zabPanel [data-zab-note-folder]", "f-ref");
      await page.click("#zabPanel [data-zab-note-go]");
      await page.waitForSelector("#zabToast:not([hidden]) a", { timeout: 8000 });
      await page.waitForTimeout(300);
      if (w === 390 || w === 1440) await shot(page, `${lang}-${w}-toast`);
      let ws = await allWrites(page);
      const note = ws.find((x) => x.col === "notes");
      const place = ws.find((x) => x.col === "notePlacements");
      const trash = ws.find((x) => x.col === "zabItems" && x.id === "t1__pl-1");
      check(`${tag}: a Note is created`, !!note, JSON.stringify(ws.map((x) => x.col)));
      check(`${tag}: … owned by the reader (p1), not the item's adder (p2)`, !!note && note.data.ownerPersonId === "p1", JSON.stringify(note && note.data.ownerPersonId));
      check(`${tag}: … titled with the item's first line`, !!note && note.data.title === "Buy <b>dates</b> for iftar, a rather long title to test the row's wrapping", JSON.stringify(note && note.data.title));
      check(`${tag}: … body is escaped and keeps the second line`, !!note && note.data.bodyHtml.includes("&lt;b&gt;dates&lt;/b&gt;") && !note.data.bodyHtml.includes("<b>") && note.data.bodyHtml.includes("<p>second line</p>"), JSON.stringify(note && note.data.bodyHtml));
      check(`${tag}: … filed in the chosen folder`, !!place && place.data.folderId === "f-ref" && !!note && place.data.noteId === note.data.noteId, JSON.stringify(place && place.data));
      check(`${tag}: the item is trashed, with the Note's id`, !!trash && trash.data.status === "trashed" && !!note && trash.data.noteId === note.data.noteId, JSON.stringify(trash && trash.data));
      check(`${tag}: nothing was deleted`, !ws.some((x) => /delete/i.test(x.kind || "")), JSON.stringify(ws.map((x) => x.kind)));
      check(`${tag}: the item left the list`, !(await page.$('[data-zab-item="pl-1"]')));
      const href = await page.getAttribute("#zabToast a", "href");
      check(`${tag}: the toast's Open goes to the Note with back=1`, !!note && /journey-map\.html\?/.test(href || "") && (href || "").includes(`note=${note.data.noteId}`) && /[?&]back=1(&|$)/.test(href || ""), href);

      // --- E: the Trash row
      await settle(page);
      await page.click('#zabPanel [data-zab-nav="list"]');
      await page.click('#zabPanel [data-zab-nav="trash"]');
      await page.waitForSelector("#zabPanel [data-zab-became]", { timeout: 8000 });
      const became = await page.$eval("#zabPanel [data-zab-became]", (e) => ({ text: e.textContent, href: e.querySelector("a")?.getAttribute("href") }));
      check(`${tag}: its Trash row says it became a Note and links to it`, !!note && became.text.includes(lang === "bn" ? "নোট হয়ে গেছে" : "Became a Note") && (became.href || "").includes(`note=${note.data.noteId}`) && /back=1/.test(became.href || ""), JSON.stringify(became));

      // --- B: task with its own folder, no picker; checklist body
      await page.click('#zabPanel [data-zab-nav="list"]');
      await openPocket(page, w, "pk-tasks");
      await page.click('[data-zab-item="tk-1"] [data-zab-tonote]');
      await page.waitForSelector("#zabToast:not([hidden]) a", { timeout: 8000 });
      ws = await allWrites(page);
      const tNote = ws.filter((x) => x.col === "notes")[1];
      const tPlace = ws.filter((x) => x.col === "notePlacements")[1];
      check(`${tag}: a task naming a folder is filed there with no picker`, !!tPlace && tPlace.data.folderId === "f-ref" && !!tNote, JSON.stringify(tPlace && tPlace.data));
      check(`${tag}: … due date and steps are written as a checklist`, !!tNote && tNote.data.bodyHtml.includes("2026-10-20") && tNote.data.bodyHtml.includes("<li>☑ Read</li>") && tNote.data.bodyHtml.includes("<li>☐ Recite</li>"), JSON.stringify(tNote && tNote.data.bodyHtml));

      // --- C: link
      await openPocket(page, w, "pk-links");
      await page.click('[data-zab-item="lk-1"] [data-zab-tonote]');
      await page.waitForSelector("#zabPanel [data-zab-note-folder]", { timeout: 8000 });
      await page.click("#zabPanel [data-zab-note-go]"); // No folder
      await page.waitForFunction(() => (window.__stubWriteData || []).filter((x) => x.col === "notes").length >= 3, null, { timeout: 8000 });
      ws = await allWrites(page);
      const lNote = ws.filter((x) => x.col === "notes")[2];
      check(`${tag}: a link item's url is written as a link`, !!lNote && lNote.data.bodyHtml.includes('<a href="https://quran.com/2/255"'), JSON.stringify(lNote && lNote.data.bodyHtml));
      check(`${tag}: "No folder" files nowhere`, ws.filter((x) => x.col === "notePlacements").length === 2);

      // --- D: failures
      await openPocket(page, w, "pk-plain");
      const before = (await allWrites(page)).length;
      await page.evaluate(() => { window.__stubFailTx = true; });
      await page.click('[data-zab-item="pl-2"] [data-zab-tonote]');
      await page.waitForSelector("#zabPanel [data-zab-note-folder]", { timeout: 8000 });
      await page.click("#zabPanel [data-zab-note-go]");
      await page.waitForFunction(() => document.querySelector("#zabMsg")?.textContent.trim().length > 0, null, { timeout: 8000 });
      await page.evaluate(() => { window.__stubFailTx = false; });
      check(`${tag}: a failing Note write shows a message`, (await page.$eval("#zabMsg", (e) => e.textContent.trim())).length > 5);
      check(`${tag}: … and leaves the item where it was, untouched`, !!(await page.$('[data-zab-item="pl-2"]')) && (await allWrites(page)).length === before, `${(await allWrites(page)).length} vs ${before}`);
      const bannerShown = await page.evaluate(() => !!document.querySelector("#qr-write-failure-banner"));
      check(`${tag}: … and the app's own write-failure banner reaches the reader (I15)`, bannerShown);
      const clearBanner = () => page.evaluate(() => document.querySelectorAll("#qr-write-failure-banner").forEach((e) => e.remove()));
      await clearBanner();
      await page.evaluate(() => { window.__stubFailWrites = true; });
      await page.click('[data-zab-item="pl-3"] [data-zab-tonote]', { timeout: 5000 }).catch(async (e) => {
        throw new Error("pl-3 click: " + String(e.message).split("\n").filter((l) => /intercepts|subtree/.test(l)).join(" ").slice(0, 300));
      });
      await page.waitForSelector("#zabPanel [data-zab-note-folder]", { timeout: 8000 });
      await page.click("#zabPanel [data-zab-note-go]");
      await page.waitForFunction(() => /saved|সংরক্ষিত/.test(document.querySelector("#zabMsg")?.textContent || ""), null, { timeout: 8000 });
      await page.evaluate(() => { window.__stubFailWrites = false; });
      check(`${tag}: a failing trash says the Note WAS saved and keeps the item`, !!(await page.$('[data-zab-item="pl-3"]')));
      await clearBanner();

      // --- way back (en only)
      if (lang === "en") {
        await settle(page);
        await page.click("#zabPanel .zab-head [data-zab-nav='list']");
        await page.click('#zabPanel [data-zab-nav="trash"]');
        await page.waitForSelector("#zabPanel [data-zab-became] a", { timeout: 8000 });
        await page.click("#zabPanel [data-zab-became] a");
        // UPDATED IN PLACE for PCF MSA J81 part 3 (the Owner: a note tapped anywhere opens in the Mapping My Journey note
        // window): Open no longer leaves the page for journey-map.html?back=1; it opens the tray over this page, and the
        // tray's ✕ is the way back, to Zab as it was.
        const url0 = page.url();
        await page.waitForSelector("#journeyTray:not([hidden]) iframe", { timeout: 15000 }).catch(() => {});
        const tr = await page.evaluate(() => ({ shown: !!document.querySelector("#journeyTray:not([hidden])"), src: document.querySelector("#journeyTray iframe")?.getAttribute("src") ?? "" }));
        check(`${tag}: Open shows the Note in the Mapping My Journey tray, on the same page`, tr.shown && /embed=1&note=/.test(tr.src) && page.url() === url0, JSON.stringify({ tr, url: page.url() }));
        await page.click("#journeyTray .jt-close");
        await page.waitForSelector("#zabPanel:not([hidden]) [data-zab-new-item]", { timeout: 15000 }).catch(() => {});
        const back = await page.evaluate(() => ({ open: !document.querySelector("#zabPanel")?.hidden, head: document.querySelector("#zabPanel .zab-head h2")?.textContent || "" }));
        // (UPDATED IN PLACE, J81 part 3: the page never left, so Zab is exactly as it was, still on the view Open was pressed in.)
        check(`${tag}: closing the tray leaves Zab open exactly as it was`, back.open && back.head.includes("Trash"), JSON.stringify(back));
      }
    } catch (err) {
      check(`${tag}: ran to the end`, false, String(err && err.stack || err).split("\n").slice(0, 4).join(" | "));
    } finally {
      await ctx.close();
    }
  }
}
// J81 part 3, Architect review: on Mapping My Journey's OWN page, a Zab "Became a Note" link must not open the tray
// over the page itself; it opens the Note there as a full page with back=1, and ← Back is visible (mutations v, w).
{
  const { ctx, page } = await open(browser, { lang: "en", width: 1440, path: "journey-map.html",
    // A Zab item that already became a Note (only here, so the trash rows the loop above reads stay as they were).
    seed: `\nDATA.zabItems.push({ _id: "t1__tr-1", itemId: "tr-1", pocketId: "pk-plain", order: 3, text: "Already a Note", done: false, ${stamp}, status: "trashed", deletedAt: new Date(), noteId: "n-became" });` });
  try {
    await page.click(opener(1440));
    await page.waitForSelector('#zabPanel [data-zab-nav="trash"]', { timeout: 8000 });
    await page.click('#zabPanel [data-zab-nav="trash"]');
    await page.waitForSelector('#zabPanel [data-zab-became] a[data-zab-note-open="n-became"]', { timeout: 8000 });
    // Positive control: the link really is the Zab note link the J81 handler acts on.
    check("journey-map.html: POSITIVE CONTROL the trashed item's Became-a-Note link is shown", !!(await page.$('#zabPanel [data-zab-became] a[data-zab-note-open="n-became"]')));
    await page.click('#zabPanel [data-zab-became] a[data-zab-note-open="n-became"]');
    await page.waitForURL(/journey-map\.html\?.*note=n-became/, { timeout: 15000, waitUntil: "commit" }).catch(() => {});
    const r = await page.evaluate(() => ({ url: location.href, tray: !!document.querySelector("#journeyTray:not([hidden])") }));
    check("journey-map.html: Open goes to the Note as a full page with back=1, no tray over the page itself", /note=n-became/.test(r.url) && /back=1/.test(r.url) && !r.tray, JSON.stringify(r));
    const jmBack = await page.waitForSelector("#jmBackBtn", { state: "visible", timeout: 15000 }).catch(() => null);
    check("journey-map.html: ...and shows a visible ← Back (the way-back law)", !!jmBack);
  } catch (err) {
    check("journey-map.html: ran to the end", false, String(err && err.stack || err).split("\n").slice(0, 4).join(" | "));
  } finally {
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
