// Note-pane Part C1 (the Owner, 6 Oct 2026, decision 72: "38. yes, 39. yes"; issue #595).
// 38 ANNOTATIONS -- numbered comments on marked text -- and 39 HEADING STATUS BADGES, both stored INSIDE the
// Note's own bodyHtml (no new field, no Rules change). Driven with REAL input in the inline pane AND a pop-up
// window, at 390 / 820 / 1440 px, English and Bangla. The stub's write log is the proof of what was saved.
//
// MUTATION SEAM: MUTATE=a..d (or --mutate=a..d) serves one deliberately broken copy of a file through ctx.route(),
// so a check can be shown to FAIL without editing the file:
//   a: the sanitiser lets any data-status through     (note-sanitize.js)
//   b: setting a status also writes a badge into body  (note-window.js)
//   c: removing an annotation leaves its [N] behind    (note-window.js)
//   d: a finalised Note is not refused                 (note-window.js)
// Run from the repository root with `node serve.js` running.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = process.env.MUTATE || (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);

const READY_OPEN = `
export const SIYAGAH_FLAGS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const SIYAGAH_FLAGS_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-04", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isSiyagahFlagsReady() { return true; }
export function siyagahFlagsUnavailableReason() { return null; }
`;
async function routeText(ctx, glob, file, from, to, all = false) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 60)}`);
  src = all ? src.split(from).join(to) : src.replace(from, to);
  await ctx.route(glob, (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src }));
}
async function routeMutation(ctx) {
  if (!MUTATE) return;
  if (MUTATE === "a") await routeText(ctx, "**/js/note-sanitize.js", "app/js/note-sanitize.js", "!NOTE_STATUS_VALUES.includes(st)", "false");
  else if (MUTATE === "b") await routeText(ctx, "**/js/note-window.js", "app/js/note-window.js", 'if (st) h.setAttribute("data-status", st);', 'if (st) { h.setAttribute("data-status", st); h.append(" Done"); }');
  else if (MUTATE === "c") await routeText(ctx, "**/js/note-window.js", "app/js/note-window.js", 'for (const s of div.querySelectorAll(`sup[data-ann-ref="${n}"]`)) s.remove();', "");
  else if (MUTATE === "d") await routeText(ctx, "**/js/note-window.js", "app/js/note-window.js", '"finalised")) { host.status(FINALISED_SAY());', '"finalised") && false) { host.status(FINALISED_SAY());', true);
  else throw new Error(`unknown mutation ${MUTATE}`);
}

const FILL = Array.from({ length: 14 }, (_, i) => `<p>Filler line ${i + 1} to make the Note long enough to scroll.</p>`).join("");
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteLinks = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, body, day, extra) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own, extra || {})); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  F("fSys", "Personal Journey Map", null, 0);
  F("fA", "Alpha", null, 0);
  N("n1", "Note One", "<p>First paragraph alpha beta.</p><p>Second paragraph gamma delta.</p>${FILL}<h2>Heading One</h2><p>under one</p><h2>Heading Two</h2><p>under two</p><h2>Heading Three</h2><p>under three</p>", 1);
  N("n2", "Note Two", "<h2>Locked heading</h2><p>Some <mark data-ann=\\"1\\" data-ann-text=\\"locked comment\\">marked</mark><sup data-ann-ref=\\"1\\">[1]</sup> text.</p>", 2, { finalised: true });
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1);
})();`;

const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const bnDigits = (n) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
async function resetWrites(page) { await page.evaluate(() => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); }); }
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).map((w) => ({ col: w.col, op: String(w.kind).replace(/^tx-/, ""), data: w.data })));
const revBodies = async (page) => (await writes(page)).filter((w) => typeof w.data?.bodyHtml === "string").map((w) => w.data.bodyHtml);
async function lastBody(page, count = 1) {
  await page.waitForFunction((c) => (window.__stubWriteData || []).filter((w) => w.data && typeof w.data.bodyHtml === "string").length >= c, count, { timeout: 8000 }).catch(() => null);
  const b = await revBodies(page);
  return b[b.length - 1] ?? "";
}
const status = (page) => page.evaluate(() => { const e = document.getElementById("pageStatusMsg"); return e && getComputedStyle(e).display !== "none" ? e.textContent : ""; });
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const rgbOf = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

async function waitTree(page) {
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 2 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
}
async function openLeaf(page, id) {
  const showing = await page.evaluate(() => getComputedStyle(document.getElementById("folderNotes")).display !== "none" && !!document.querySelector("#folderNotes [data-note-leaf]"));
  if (!showing) {
    await page.evaluate(() => { const b = document.querySelector("#notePane:not([hidden]) [data-pane-back]"); if (b) b.click(); });
    if (await page.isVisible("#folderNotes [data-list-back]")) await page.click("#folderNotes [data-list-back]");
    await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
    await page.waitForSelector("#folderNotes [data-note-leaf]", { state: "visible" });
  }
  await page.click(`#folderNotes [data-note-leaf][data-note-id="${id}"] [data-note-open]`);
  await page.waitForSelector("#notePane:not([hidden]) [data-pane-title]");
}
async function popOut(page) {
  await page.click("#notePane [data-pane-menu-btn]");
  await page.waitForSelector("[data-pane-menu] [data-pane-popout]", { state: "visible" });
  await page.click("[data-pane-menu] [data-pane-popout]");
  await page.waitForSelector(".note-win [data-pane-body]");
}
async function startEdit(page, S) {
  await page.evaluate((s) => document.querySelector(`${s} [data-pane-edit-toggle]`).click(), S);
  await page.waitForSelector(`${S} [data-edit-body]`);
}
async function finishEdit(page, S) {
  await page.evaluate((s) => document.querySelector(`${s} [data-pane-edit-toggle]`).click(), S);
  await page.waitForSelector(`${S} [data-edit-body]`, { state: "detached" });
}
async function selectText(page, S, a, b = a) {
  await page.evaluate(([s, from, to]) => {
    const body = document.querySelector(`${s} [data-edit-body]`);
    const w = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let st = null, en = null;
    for (let n = w.nextNode(); n; n = w.nextNode()) { if (!st && n.data.includes(from)) st = n; if (st && n.data.includes(to)) { en = n; break; } }
    const r = document.createRange(); r.setStart(st, st.data.indexOf(from)); r.setEnd(en, en.data.indexOf(to) + to.length);
    body.focus(); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    body.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  }, [S, a, b]);
}
async function pressAnnotate(page, S) {
  if (await page.evaluate((s) => getComputedStyle(document.querySelector(`${s} [data-cmd="annotate"]`)).display === "none", S)) await page.click(`${S} [data-tb-tab="3"]`);
  await page.click(`${S} [data-cmd="annotate"]`);
}
async function annotate(page, S, a, b, comment) {
  await selectText(page, S, a, b);
  await pressAnnotate(page, S);
  await page.fill(`${S} [data-panel-ann-text]`, comment);
  await page.click(`${S} [data-panel-ann-apply]`);
}
const inView = (page, S, sel) => page.evaluate(([s, q]) => { const e = document.querySelector(`${s} ${q}`); if (!e) return false; const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight + 1; }, [S, sel]);
const smallTargets = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 39.5 || r.width < 39.5) && getComputedStyle(e).display !== "none"; }).map((e) => `${e.tagName}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`), sel);

const browser = await chromium.launch();

for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1440]) {
    for (const surface of ["pane", "window"]) {
      const tag = `${surface} ${lang} ${width}px`;
      const S = surface === "pane" ? "#notePane" : ".note-win";
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
      await ctx.route("**/js/siyagah-flags-readiness.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_OPEN }));
      await routeMutation(ctx);
      await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); localStorage.setItem("mmsa-journey-note-window", JSON.stringify({ x: 40, y: 40, w: 900, h: 700 })); } catch {} });
      const { page } = await openPage(ctx, "/app/journey-map.html#folders");
      await waitTree(page);
      await openLeaf(page, "n1");
      if (surface === "window") await popOut(page);
      check(`${tag}: POSITIVE CONTROL -- the Note is open in the ${surface}`, await page.evaluate((s) => !!document.querySelector(`${s} [data-pane-body]`), S));

      // ---------------- 38. add annotation 1 ----------------
      await startEdit(page, S);
      check(`${tag}: the toolbar has a 💬 button (a 40px target)`, (await smallTargets(page, `${S} [data-cmd="annotate"]`)).length === 0 && (await page.$$(`${S} [data-cmd="annotate"]`)).length === 1);
      await resetWrites(page);
      await annotate(page, S, "alpha", "alpha", "first comment");
      check(`${tag}: the editor now holds the mark and its [1]`, await page.evaluate((s) => !!document.querySelector(`${s} [data-edit-body] mark[data-ann="1"] + sup[data-ann-ref="1"]`), S));
      await finishEdit(page, S);
      let body = await lastBody(page);
      check(`${tag}: the SAVED bodyHtml has <mark data-ann="1" data-ann-text="first comment"> and <sup data-ann-ref="1">[1]</sup>`, /<mark data-ann="1" data-ann-text="first comment">alpha<\/mark><sup data-ann-ref="1">\[1\]<\/sup>/.test(body), body.slice(0, 300));
      check(`${tag}: the badge and list are NOT in the saved body`, !/note-status|data-status-badge|note-annotations|ann-item/.test(body));
      check(`${tag}: the Annotations list shows [1], the quoted text and the comment`, await page.evaluate(([s, n]) => { const i = document.querySelector(`${s} [data-annotations] [data-ann-item="1"]`); return !!i && i.textContent.includes("alpha") && i.textContent.includes("first comment") && i.querySelector(".ann-num").textContent === `[${n}]`; }, [S, lang === "bn" ? bnDigits(1) : "1"]));
      if (lang === "bn") {
        check(`${tag}: the list heading and the in-text [N] are in Bangla`, hasBn(await page.textContent(`${S} [data-annotations] h3`)) && (await page.textContent(`${S} sup[data-ann-ref="1"]`)) === `[${bnDigits(1)}]`);
      }
      check(`${tag}: the list sits after the body's last text`, await page.evaluate((s) => { const l = document.querySelector(`${s} [data-annotations]`); const last = [...document.querySelectorAll(`${s} .note-sec-body p, ${s} [data-pane-body] > p`)].pop(); return !!l && !!last && !!(last.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING); }, S));

      // ---------------- tap mark <-> comment scrolls both ways ----------------
      await page.evaluate((s) => { const sc = document.querySelector(`${s} [data-win-scroll]`) || document.querySelector(s); sc.scrollTop = 0; window.scrollTo(0, 0); const m = document.querySelector(`${s} mark[data-ann="1"]`); m.scrollIntoView({ block: "start" }); }, S);
      const markStart = await inView(page, S, `mark[data-ann="1"]`);
      const itemStartVisible = await inView(page, S, `[data-ann-item="1"]`);
      await page.evaluate((s) => document.querySelector(`${s} mark[data-ann="1"]`).click(), S);
      await page.waitForTimeout(150);
      check(`${tag}: tapping the mark scrolls to its comment (was ${itemStartVisible ? "already" : "not"} on screen)`, !itemStartVisible ? await inView(page, S, `[data-ann-item="1"]`) : true);
      await page.evaluate((s) => document.querySelector(`${s} [data-ann-item="1"] .ann-main`).click(), S);
      await page.waitForTimeout(150);
      check(`${tag}: tapping the comment scrolls back to the mark (mark was ${markStart ? "on screen" : "off screen"} at start)`, await inView(page, S, `mark[data-ann="1"]`));
      await page.evaluate((s) => { document.querySelector(`${s} sup[data-ann-ref="1"]`).scrollIntoView({ block: "start" }); document.querySelector(`${s} sup[data-ann-ref="1"]`).click(); }, S);
      await page.waitForTimeout(150);
      check(`${tag}: tapping [1] also reaches the comment`, await inView(page, S, `[data-ann-item="1"]`));

      // ---------------- cross-paragraph refused ----------------
      await startEdit(page, S);
      await resetWrites(page);
      await selectText(page, S, "beta", "gamma");
      await pressAnnotate(page, S);
      await page.fill(`${S} [data-panel-ann-text]`, "crossing");
      await page.click(`${S} [data-panel-ann-apply]`);
      const refusal = await page.textContent(`${S} [data-panel-msg]`);
      check(`${tag}: a selection across paragraphs is refused in words (${lang})`, refusal.length > 8 && (lang === "bn" ? hasBn(refusal) : /one paragraph/.test(refusal)), refusal);
      check(`${tag}: ...and no mark was made`, await page.evaluate((s) => document.querySelectorAll(`${s} [data-edit-body] mark[data-ann]`).length === 1, S));
      await page.click(`${S} [data-panel-close]`);

      // ---------------- annotation 2, then the highest is removed, and a new one is NOT numbered 2 ----------------
      await annotate(page, S, "gamma", "gamma", "second comment");
      check(`${tag}: the next annotation is numbered 2`, await page.evaluate((s) => !!document.querySelector(`${s} [data-edit-body] mark[data-ann="2"] + sup[data-ann-ref="2"]`), S));
      await finishEdit(page, S);
      body = await lastBody(page);
      check(`${tag}: both annotations are saved`, body.includes('data-ann="1"') && body.includes('data-ann="2"'));
      // edit comment 1
      await resetWrites(page);
      await page.click(`${S} [data-ann-edit="1"]`);
      await page.fill('[data-note-dialog="ann-edit"] [data-ann-input]', "first comment, edited");
      await page.click('[data-note-dialog="ann-edit"] [data-ann-save]');
      body = await lastBody(page);
      check(`${tag}: ✏ edit saves the new comment on the mark`, body.includes('data-ann-text="first comment, edited"') && !body.includes('data-ann-text="first comment"'), body.slice(0, 200));
      check(`${tag}: ...and the list shows it`, await page.evaluate((s) => document.querySelector(`${s} [data-ann-item="1"] .ann-comment`)?.textContent === "first comment, edited", S));
      // remove 2 (asks first)
      await resetWrites(page);
      await page.click(`${S} [data-ann-del="2"]`);
      await page.waitForSelector('[data-note-dialog="ann-del"]');
      check(`${tag}: ✕ asks before removing, and has written nothing yet`, (await revBodies(page)).length === 0);
      await page.click('[data-note-dialog="ann-del"] [data-ann-confirm]');
      body = await lastBody(page);
      check(`${tag}: remove unwraps the mark, drops its [2], and keeps the text`, !body.includes('data-ann="2"') && !body.includes('data-ann-ref="2"') && !/\[2\]/.test(body) && body.includes("gamma") && body.includes('data-ann="1"'), body.slice(0, 300));
      await page.waitForFunction((s) => !document.querySelector(`${s} [data-ann-item="2"]`), S);
      await startEdit(page, S);
      await annotate(page, S, "delta", "delta", "third comment");
      check(`${tag}: the number 2 is not used again -- the new annotation is 3`, await page.evaluate((s) => !!document.querySelector(`${s} [data-edit-body] mark[data-ann="3"] + sup[data-ann-ref="3"]`) && !document.querySelector(`${s} [data-edit-body] mark[data-ann="2"]`), S));
      await finishEdit(page, S);

      // ---------------- 39. heading status ----------------
      check(`${tag}: every heading shows a badge, "Set status" when none (en) -- 3 headings, 3 badges`, await page.evaluate((s) => document.querySelectorAll(`${s} .note-sec-h .note-status`).length === 3 && [...document.querySelectorAll(`${s} .note-sec-h .note-status`)].every((b) => b.textContent.trim().length > 0), S));
      if (lang === "bn") check(`${tag}: "Set status" is in Bangla`, hasBn(await page.textContent(`${S} [data-status-badge="0"]`)));
      const presets = [["done", "Done"], ["ongoing", "Ongoing"], ["process", "Under process"], ["next", "Next"]];
      for (const [key] of presets) {
        await resetWrites(page);
        await page.click(`${S} button[data-status-badge="0"]`);
        await page.waitForSelector('[data-note-dialog="status"]');
        await page.click(`[data-note-dialog="status"] [data-status-set="${key}"]`);
        body = await lastBody(page);
        check(`${tag}: status "${key}" is saved on the heading`, new RegExp(`<h2 data-status="${key}">Heading One</h2>`).test(body), body.slice(body.indexOf("<h2"), body.indexOf("<h2") + 120));
        check(`${tag}: ...the badge is shown in view mode and is not in the saved HTML ("${key}")`, await page.evaluate(([s, k]) => document.querySelector(`${s} [data-status-badge="0"]`)?.dataset.statusIs === k, [S, key]) && !/note-status|data-status-badge|Set status/.test(body) && !/<h2[^>]*>[^<]*(Done|Ongoing|Under process|Next)/.test(body));
      }
      // Custom
      await resetWrites(page);
      await page.click(`${S} button[data-status-badge="1"]`);
      await page.waitForSelector('[data-note-dialog="status"]');
      await page.click('[data-note-dialog="status"] [data-status-custom]');
      await page.fill('[data-note-dialog="status"] [data-status-label-input]', "Review");
      await page.click('[data-note-dialog="status"] [data-status-colour-pick="#1b6e3c"]');
      await page.click('[data-note-dialog="status"] [data-status-save]');
      body = await lastBody(page);
      check(`${tag}: Custom saves its label and a palette colour on the heading`, /<h2 data-status="custom" data-status-label="Review" data-status-colour="#1b6e3c">Heading Two<\/h2>/.test(body), body.slice(body.indexOf("Heading One") - 40, body.indexOf("Heading One") + 200));
      check(`${tag}: ...the badge reads "Review"`, (await page.textContent(`${S} [data-status-badge="1"]`)) === "Review");
      // the Contents dot (a window that is wide enough)
      if (surface === "window" && width >= 1440) {
        const dots = await page.evaluate(() => [...document.querySelectorAll(".note-win [data-toc-dot]")].map((d) => d.dataset.tocDot));
        check(`${tag}: the side Contents shows the same dots (custom, then the preset on heading 1)`, JSON.stringify(dots) === JSON.stringify(["next", "custom"]), JSON.stringify(dots));
      }
      // contrast of badge text (own fill, so the same in a light or a dark page)
      const badgeCr = await page.evaluate((s) => [...document.querySelectorAll(`${s} .note-status`)].map((b) => { const cs = getComputedStyle(b); return [cs.color, cs.backgroundColor]; }), S);
      check(`${tag}: every badge reads at 4.5:1 or better`, badgeCr.length === 3 && badgeCr.every(([f, b]) => ratio(rgbOf(f), rgbOf(b)) >= 4.5), JSON.stringify(badgeCr));
      // Clear
      await resetWrites(page);
      await page.click(`${S} button[data-status-badge="1"]`);
      await page.waitForSelector('[data-note-dialog="status"]');
      await page.click('[data-note-dialog="status"] [data-status-clear]');
      body = await lastBody(page);
      check(`${tag}: Clear takes the status off the heading`, /<h2>Heading Two<\/h2>/.test(body), body.slice(body.indexOf("Heading Two") - 60, body.indexOf("Heading Two") + 20));
      check(`${tag}: ...and the badge is back to "Set status"`, await page.evaluate((s) => document.querySelector(`${s} [data-status-badge="1"]`)?.classList.contains("note-status-none"), S));
      check(`${tag}: the status controls are 40px targets`, (await smallTargets(page, `${S} button.note-status, ${S} .ann-btns button`)).length === 0, JSON.stringify(await smallTargets(page, `${S} button.note-status, ${S} .ann-btns button`)));

      // ---------------- contrast of the annotation mark, light page and a dark one ----------------
      for (const dark of [false, true]) {
        const cr = await page.evaluate(([s, d]) => {
          const host = document.querySelector(s);
          const saved = [host.style.background, host.style.color];
          if (d) { host.style.background = "#121212"; host.style.color = "#eeeeee"; }
          const out = [...host.querySelectorAll('mark[data-ann], sup[data-ann-ref], .ann-comment, .ann-num')].slice(0, 6).map((e) => { const cs = getComputedStyle(e); let bg = cs.backgroundColor, n = e; while (/rgba\(.*, 0\)|transparent/.test(bg) && n.parentElement) { n = n.parentElement; bg = getComputedStyle(n).backgroundColor; } return [e.tagName + "." + e.className, cs.color, bg]; });
          [host.style.background, host.style.color] = saved;
          return out;
        }, [S, dark]);
        const bad = cr.filter(([, f, b]) => ratio(rgbOf(f), rgbOf(b)) < 4.5);
        check(`${tag}: mark, [N] and comment text read at 4.5:1 on a ${dark ? "dark" : "light"} Note page`, cr.length >= 3 && bad.length === 0, JSON.stringify(bad.length ? bad : cr));
      }
      check(`${tag}: no sideways overflow with annotations and badges on screen`, await noSideways(page));
      await ctx.close();
    }

    // ---------------- hostile paste, finalised refusal (pane, once per language and width) ----------------
    {
      const tag = `hostile+finalised ${lang} ${width}px`;
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
      await ctx.route("**/js/siyagah-flags-readiness.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_OPEN }));
      await routeMutation(ctx);
      await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); localStorage.setItem("mmsa-journey-note-window", JSON.stringify({ x: 40, y: 40, w: 900, h: 700 })); } catch {} });
      const { page } = await openPage(ctx, "/app/journey-map.html#folders");
      await waitTree(page);
      const clean = await page.evaluate(async () => {
        const { sanitizeNoteHtml } = await import("/app/js/note-sanitize.js");
        const hostile = '<mark data-ann="1 onclick=alert(1)" data-ann-text="x&lt;img src=x onerror=alert(1)&gt; javascript:alert(1)" onclick="alert(1)">a</mark><sup data-ann-ref="abc">[x]</sup>'
          + '<h2 data-status="x" data-status-label="y" data-status-colour="red">h</h2>'
          + '<h2 data-status="custom" data-status-label="javascript:alert(1) ok" data-status-colour="#123456">c</h2>'
          + '<p data-status="done">p</p><h3 data-status="DONE">upper</h3>'
          + '<mark data-ann="7" data-ann-text="' + "z".repeat(900) + '">long</mark>';
        const d = document.createElement("div"); d.innerHTML = sanitizeNoteHtml(hostile);
        const q = (s) => d.querySelector(s);
        return {
          html: d.innerHTML,
          badAnn: q("mark") && q("mark").hasAttribute("data-ann"), onclick: /onclick|onerror/i.test(d.innerHTML),
          annText: q("mark")?.getAttribute("data-ann-text") ?? null, supRef: q("sup")?.hasAttribute("data-ann-ref"),
          h1: [...(q("h2")?.attributes ?? [])].map((a) => a.name).join(","), h2: [...d.querySelectorAll("h2")][1]?.outerHTML,
          pStatus: q("p")?.hasAttribute("data-status"), upper: q("h3")?.getAttribute("data-status"),
          longLen: d.querySelector('mark[data-ann="7"]')?.getAttribute("data-ann-text")?.length,
        };
      });
      check(`${tag}: a non-number data-ann is dropped, and no event handler survives`, clean.badAnn === false && clean.onclick === false, clean.html);
      check(`${tag}: a comment's markup and javascript: are stripped from data-ann-text`, !/[<>]|javascript:/i.test(clean.annText ?? ""), String(clean.annText));
      check(`${tag}: a non-number data-ann-ref is dropped`, clean.supRef === false);
      check(`${tag}: data-status="x" is removed with its label and colour`, !/data-status/.test(clean.h1), clean.h1);
      check(`${tag}: a javascript: in a custom label is cleaned, and a colour outside the palette is dropped`, /data-status="custom"/.test(clean.h2) && !/javascript/i.test(clean.h2) && !/data-status-colour/.test(clean.h2), clean.h2);
      check(`${tag}: data-status on a paragraph is removed, and on a heading is lower-cased into the closed set`, clean.pStatus === false && clean.upper === "done");
      check(`${tag}: a 900-character comment is capped to 500`, clean.longLen === 500, String(clean.longLen));

      // finalised: n2 refuses edit, remove, status, in words, and writes nothing
      await openLeaf(page, "n2");
      await resetWrites(page);
      const FINAL_OK = (s) => s.length > 10 && (lang === "bn" ? hasBn(s) : /finalised/.test(s));
      await page.click('#notePane [data-ann-del="1"]');
      await page.waitForTimeout(250);
      let say = await status(page);
      check(`${tag}: ✕ on a finalised Note is refused in words (${lang})`, FINAL_OK(say) && !(await page.$('[data-note-dialog="ann-del"]')), say);
      await page.click('#notePane [data-ann-edit="1"]');
      await page.waitForTimeout(250);
      check(`${tag}: ✏ on a finalised Note opens nothing`, !(await page.$('[data-note-dialog="ann-edit"]')));
      await page.click('#notePane button[data-status-badge="0"]');
      await page.waitForTimeout(250);
      say = await status(page);
      check(`${tag}: a status badge on a finalised Note is refused in words (${lang})`, FINAL_OK(say) && !(await page.$('[data-note-dialog="status"]')), say);
      check(`${tag}: ...and nothing was written`, (await writes(page)).length === 0, JSON.stringify((await writes(page)).map((w) => w.col)));
      check(`${tag}: the finalised Note still shows its list`, await page.evaluate(() => !!document.querySelector('#notePane [data-ann-item="1"]')));
      check(`${tag}: no sideways overflow on the finalised Note`, await noSideways(page));
      await ctx.close();
    }
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
