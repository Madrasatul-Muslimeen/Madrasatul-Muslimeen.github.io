// PCF MSA J112 R1 -- the Map reads the owner's Siyagah Mapping My Journey, READ-ONLY, inside the existing Siyagah bar.
// Against the Firebase stub (Siyagah's documents seeded in its DATA under notebooks/<nb>/...), with the SHIPPED switch:
//   small     a small tree, nested folders, a note in two levels, a note whose id has dots (n~a%2Eb), a loose note,
//             a gone note that never shows, a big note joined from its mmjparts pieces, a real-length folder name
//   pieced    t~0 + t~1..t~2 of one generation are joined; a piece of ANOTHER generation shows no tree until the right
//             piece lands, then the tree appears (read again, never half a tree)
//   note      a note opens in the bar: title, content sanitised (no <script>, no on* attribute), a picture fetched and
//             sha256-checked, a picture whose bytes fail the check NOT shown (a "Picture" box says so)
//   back      "Back to Siyagah folders": the same folders open, the note's own row in view and focused (way-back law)
//   live      a change Siyagah writes arrives through the listener: a renamed note, a note that goes
//   denied    permission-denied: "Ask the owner to allow this app", the device copy kept on screen, no loop (no new read
//             within 5 s), one retry after a minute (the page clock fast-forwarded), and then the live tree
//   writes    nothing is ever written: the stub records no write at all on any notebooks/ path
//   layout    360/768/1024/1440, English and Bangla, text 100/150/200%: the bar on screen, no sideways scroll, every
//             button 40px tall or more and inside the bar, text contrast >= 4.5 against its real background
// Run from the repository root with serve.js running (QR_BASE=http://localhost:8091 for a second one):
//   node tools/i18n-verify/siyagah-mmj-browser.mjs [--mutate=<name>]     SHOTS_DIR=<dir> saves screenshots
// Each --mutate serves a broken copy of one module and the named check must FAIL (see MUTATIONS below).
import fs from "node:fs";
import crypto from "node:crypto";
import { chromium, newContext, BASE } from "./harness.mjs";

let pass = 0, fail = 0;
const failed = [];
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; failed.push(name); console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const read = (p) => fs.readFileSync(p, "utf8");
function mutated(src, a, b) { const n = src.split(a).length - 1; if (!n) throw new Error(`mutation anchor missing: ${a}`); return src.split(a).join(b); }
const SHOTS = process.env.SHOTS_DIR || "";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUTATIONS = {
  "no-sanitize": ["app/js/siyagah-map-link.js", "el.innerHTML = sanitize(tpl.innerHTML);", "el.innerHTML = tpl.innerHTML;", "note: the content is sanitised: no <script>, no on* attribute, the text kept"],
  "no-gone": ["app/js/siyagah-mmj-model.js", "const notes = { ...copy.notes }; delete notes[id];", "const notes = { ...copy.notes };", "live: a note that leaves Mapping My Journey (gone) leaves the Map"],
  "gone-as-note": ["app/js/siyagah-mmj-model.js", "if (data.gone === true) {", "if (false) {", "small: the gone note is not shown"],
  "retry-loop": ["app/js/siyagah-mmj-data.js", "retryTimer = setTimeout(start, retryMs);", "retryTimer = setTimeout(() => { lastTry = 0; start(); }, 200);", "denied: no loop -- no new read within 5 s of the refusal"],
  "trust-pictures": ["app/js/siyagah-mmj-model.js", 'return typeof hex === "string" && hex === plan.want;', "return true;", "note: a picture whose bytes fail the check is NOT shown"],
  "no-way-back": ["app/js/siyagah-map-link.js", "      noteId = null;\n      render();", "      noteId = null; open.clear();\n      render();", "back: the same folders are still open"],
  "no-row-focus": ["app/js/siyagah-map-link.js", "if (row) { row.scrollIntoView({ block: \"nearest\" }); row.focus({ preventScroll: true }); }", "", "back: the note's own row is in view and focused"],
  "small-buttons": ["app/js/siyagah-map-link.js", "width:100%; min-height:40px;", "width:100%; min-height:20px;", "layout en/360/100%: every button in the bar is 40px tall or more and inside the bar"],
  "open-by-default": ["app/js/siyagah-map-link.js", 'isOpen = localStorage.getItem(OPEN_KEY) === "1";', 'isOpen = localStorage.getItem(OPEN_KEY) !== "0";', "small: the folders are shut by default (one toggle in the bar)"],
  "hidden-refusal": ["app/js/siyagah-map-link.js", 'if (s.kind === "denied" || s.kind === "error") setOpen(true, false);', "", "denied: the refusal opens the folders, so it is never hidden (I15)"],
  "no-after": ["app/js/siyagah-map-link.js", "if (after && typeof after.then === \"function\") { try { await after; } catch { /* the Map says its own failure */ } }", "", "the Map first: Siyagah's code is fetched only after the Map's own folders and notes have loaded (no Map read in flight)"],
  "join-any-generation": ["app/js/siyagah-mmj-model.js", 'if (p.g !== t0.g) return { ok: false, reason: "piece-generation" };', "", "pieced: a piece of another generation shows NO tree"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`unknown mutation ${MUTATE}; known: ${Object.keys(MUTATIONS).join(", ")}`);
const SERVED = {};
if (MUTATE) { const [file, a, b] = MUTATIONS[MUTATE]; SERVED[file.replace(/^app/, "")] = mutated(read(file), a, b); }

const NB = "nb-mriuc27o-f44402"; // the SHIPPED switch's notebook (siyagah-cloud-readiness.js)
check("POSITIVE CONTROL the shipped switch names this notebook", read("app/js/siyagah-cloud-readiness.js").includes(`notebookId: "${NB}"`));

// --- seed --------------------------------------------------------------------------------------------------------------
// A real 1x1 PNG, split in two pieces, with its real sha256; and a picture whose bytes do NOT match its sha.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const SHA = crypto.createHash("sha256").update(PNG).digest("hex");
const BAD_SHA = "f".repeat(64);
const half = Math.ceil(PNG.length / 2);
const LONG = "Reflections on the Names of Allah and their meanings in everyday family life";
const BIG_A = "<p>Part one of a long note about Ṣabr. ", BIG_B = "Part two, joined from its piece.</p>";
function seedJs({ pieced = false, badPiece = false } = {}) {
  const tree = pieced
    ? `{ _id: "t~0", v: 1, at: TS(1000), b: "v05.66", sec: { id: "mmj-sec", n: "Mapping My Journey" }, n: 2, g: "G1" },
       { _id: "t~1", v: 1, i: 1, g: "G1", at: TS(990), folders: [{ id: "f-quran", n: "Qur'an reflections", p: null, o: 1, u: "2026-11-01T10:00:00Z" }] },
       { _id: "t~2", v: 1, i: 2, g: ${badPiece ? '"G0"' : '"G1"'}, at: TS(991), folders: [{ id: "f-baqarah", n: "Sūrah Al-Baqarah", p: "f-quran", o: 0 }, { id: "f-hadith", n: "Hadith", p: null, o: 2, vis: 1 }, { id: "f-long", n: ${JSON.stringify(LONG)}, p: null, o: 3 }] },`
    : `{ _id: "t~0", v: 1, at: TS(1000), b: "v05.66", sec: { id: "mmj-sec", n: "Mapping My Journey" }, folders: [
         { id: "f-quran", n: "Qur'an reflections", p: null, o: 1, u: "2026-11-01T10:00:00Z" },
         { id: "f-baqarah", n: "Sūrah Al-Baqarah", p: "f-quran", o: 0 },
         { id: "f-hadith", n: "Hadith", p: null, o: 2, vis: 1 },
         { id: "f-long", n: ${JSON.stringify(LONG)}, p: null, o: 3 } ] },`;
  const bytes = (b) => `{ toUint8Array: function () { return new Uint8Array(${JSON.stringify([...b])}); } }`;
  return `
function TS(ms) { return { toMillis: function () { return ms; }, valueOf: function () { return ms; }, seconds: Math.floor(ms / 1000), nanoseconds: (ms % 1000) * 1e6 }; }
var NBP = "notebooks/${NB}/";
DATA[NBP + "mmj"] = [
  ${tree}
  { _id: "n~n-patience", id: "n-patience", title: "Patience in 2:153", folderIds: ["f-baqarah"], tags: [], kind: "note", updatedAt: "2026-11-02T09:00:00Z", at: TS(1100), b: "v05.66",
    content: '<p>Seek help through <b>patience</b> and prayer.</p><script>window.__xss = 1<\\/script><img src="x" onerror="window.__xss = 2"><p>A picture:</p><img class="ed-img" data-pic="${SHA}" data-mime="image/png" alt="a dot"><p>And one that fails:</p><img class="ed-img" data-pic="${BAD_SHA}" data-mime="image/png" alt="">' },
  { _id: "n~note%2Ewith%2Edots", id: "note.with.dots", title: "A note whose id has dots", folderIds: ["f-quran"], updatedAt: "2026-11-01T09:00:00Z", at: TS(1101), content: "<p>Dots.</p>" },
  { _id: "n~n-big", id: "n-big", title: "A long note in pieces", folderIds: ["f-hadith"], updatedAt: "2026-11-03T09:00:00Z", at: TS(1102), parts: 2, g: "P1", content: "" },
  { _id: "n~n-gone", id: "n-gone", gone: true, at: TS(1103), b: "v05.66" },
  { _id: "n~n-loose", id: "n-loose", title: "A note in no folder", folderIds: [], updatedAt: "2026-10-01T09:00:00Z", at: TS(1104), content: "<p>Loose.</p>", vis: 1 },
];
DATA[NBP + "mmjparts"] = [
  { _id: "n~n-big~P1~0", d: ${JSON.stringify(BIG_A)}, g: "P1" },
  { _id: "n~n-big~P1~1", d: ${JSON.stringify(BIG_B)}, g: "P1" },
];
DATA[NBP + "pics"] = [ { _id: "${SHA}", n: ${PNG.length}, t: "image/png", p: 2 }, { _id: "${BAD_SHA}", n: ${PNG.length}, t: "image/png", p: 1 } ];
DATA[NBP + "picparts"] = [
  { _id: "${SHA}~0", d: ${bytes(PNG.subarray(0, half))} }, { _id: "${SHA}~1", d: ${bytes(PNG.subarray(half))} },
  { _id: "${BAD_SHA}~0", d: ${bytes(PNG)} },
];
try { if (localStorage.getItem("__mmjDeny") === "1") window.__stubDenyCols = ["notebooks/"]; } catch (e) {}
`;
}

const browser = await chromium.launch();
async function openMap({ lang = "en", width = 1024, pct = 100, seed = {}, ctx = null, clock = false, deny = false, latencyMs = 0 } = {}) {
  ctx = ctx || await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: seedJs(seed), latencyMs });
  for (const [p, body] of Object.entries(SERVED)) await ctx.route(`**${p}`, (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
  // A refused start begins with the folders SHUT on this device, so only the refusal itself can open them.
  await ctx.addInitScript((d) => { try { localStorage.setItem("__mmjDeny", d ? "1" : "0"); if (d) localStorage.setItem("msa-siyagah-mmj-open", "0"); } catch (e) {} }, deny);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  if (clock) await page.clock.install();
  await page.goto(`${BASE}/app/journey-map.html`, { waitUntil: "load" });
  await page.waitForFunction(() => document.getElementById("app")?.style.display === "block", null, { timeout: 20000 });
  await page.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; for (const e of document.querySelectorAll('[id*="splash"], .mm-splash-overlay')) e.remove(); }, pct);
  return { ctx, page, errors };
}
/** The folders sit behind the bar's one toggle (shut by default, remembered on the device): open it as a reader would. */
async function showFolders(page) {
  await page.waitForSelector("#siyagahCloudBar [data-siyagah-toggle]", { timeout: 12000 });
  if (await page.$('#siyagahCloudBar [data-siyagah-toggle][aria-expanded="false"]')) await page.click("#siyagahCloudBar [data-siyagah-toggle]");
}
const waitTree = (page, t = 12000) => page.waitForSelector("#siyagahCloudBar [data-mmj-tree]", { timeout: t }).then(() => true, () => false);
const names = (page) => page.$$eval("#siyagahCloudBar [data-mmj-folder] [data-mmj-name], #siyagahCloudBar [data-mmj-note] [data-mmj-name]", (els) => els.map((e) => e.textContent));
async function openFolder(page, id) { await page.click(`#siyagahCloudBar [data-mmj-folder="${id}"]`); await page.waitForSelector(`#siyagahCloudBar [data-mmj-folder="${id}"][aria-expanded="true"]`); }
const writesTo = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => String(w.col || "").startsWith("notebooks/")).length);

// --- small ---------------------------------------------------------------------------------------------------------------
console.log("\n=== small tree ===");
{
  const { ctx, page, errors } = await openMap({});
  await page.waitForSelector("#siyagahCloudBar [data-siyagah-toggle]", { timeout: 12000 });
  const shut = await page.evaluate(() => ({ exp: document.querySelector("#siyagahCloudBar [data-siyagah-toggle]").getAttribute("aria-expanded"), shown: getComputedStyle(document.getElementById("siyagahMmjBody")).display !== "none" }));
  check("small: the folders are shut by default (one toggle in the bar)", shut.exp === "false" && !shut.shown, JSON.stringify(shut));
  await showFolders(page);
  check("small: the tree shows inside the Siyagah bar (no new bar)", await waitTree(page) && await page.evaluate(() => document.querySelectorAll("#siyagahCloudBar").length === 1 && !!document.querySelector("#siyagahCloudBar [data-mmj-tree]")));
  const status = await page.textContent("#siyagahCloudBar [data-mmj-status]");
  // UPDATED IN PLACE (J112 R2a, 5 Nov 2026): folders can now be changed by request (Siyagah's "Writing (R2)"), so the
  // status no longer calls the folders read-only; the NOTES still are, and the sentence must say so.
  // UPDATED IN PLACE again (J112 R2b, 5 Nov 2026): notes can now be changed by request too, so the sentence says both
  // folders and notes are sent to Siyagah -- and must never again call the notes read-only.
  check("small: the status counts 4 folders and 4 notes, and says changes to both are sent to Siyagah", /4 folders, 4 notes\. Changes to folders and notes are sent to Siyagah\./.test(status) && !/read-only/i.test(status), status);
  check("small: the top folders in Siyagah's order (o), the loose notes last", JSON.stringify(await names(page)) === JSON.stringify(["Qur'an reflections", "Hadith", LONG, "Not in a folder"]), JSON.stringify(await names(page)));
  await openFolder(page, "f-quran"); await openFolder(page, "f-baqarah"); await openFolder(page, "f-hadith"); await openFolder(page, "~loose");
  const all = await names(page);
  check("small: a child folder sits inside its parent, with its note", all.indexOf("Sūrah Al-Baqarah") === all.indexOf("Qur'an reflections") + 1 && all.includes("Patience in 2:153"), JSON.stringify(all));
  check("small: a note whose id has dots (doc n~note%2Ewith%2Edots) is read", all.includes("A note whose id has dots"));
  check("small: the big note is listed", all.includes("A long note in pieces"));
  check("small: the loose note is under Not in a folder", all.includes("A note in no folder"));
  check("small: the gone note is not shown", !(await page.$('#siyagahCloudBar [data-mmj-note="n-gone"]')));
  check("small: 👁 marks the folder the owner shared (a hint only)", (await page.$$eval('#siyagahCloudBar [data-mmj-folder="f-hadith"] [data-mmj-vis]', (e) => e.length)) === 1 && (await page.$$eval('#siyagahCloudBar [data-mmj-folder="f-quran"] [data-mmj-vis]', (e) => e.length)) === 0);

  console.log("\n=== note, pictures, way back ===");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('#siyagahCloudBar [data-mmj-note="n-patience"]');
  await page.waitForSelector("#siyagahCloudBar [data-mmj-body]");
  await page.waitForFunction(() => !document.querySelector("#siyagahCloudBar [data-mmj-pic]:not([data-mmj-pic-failed])"), null, { timeout: 8000 }).catch(() => {});
  const nv = await page.evaluate(() => {
    const b = document.querySelector("#siyagahCloudBar [data-mmj-body]");
    return { title: document.querySelector("#siyagahCloudBar [data-mmj-title]")?.textContent, text: b.textContent, html: b.innerHTML,
      script: !!b.querySelector("script"), on: [...b.querySelectorAll("*")].some((e) => [...e.attributes].some((a) => /^on/i.test(a.name))),
      xss: window.__xss || 0, treeShown: getComputedStyle(document.querySelector("#siyagahCloudBar [data-mmj-treewrap]")).display !== "none",
      ok: [...b.querySelectorAll("img[data-mmj-pic-ok]")].map((i) => ({ sha: i.getAttribute("data-mmj-pic-ok"), blob: i.src.startsWith("blob:"), w: i.naturalWidth })),
      failed: [...b.querySelectorAll("[data-mmj-pic-failed]")].map((e) => ({ sha: e.getAttribute("data-mmj-pic"), text: e.textContent })),
      backFocused: document.activeElement?.hasAttribute("data-mmj-back") };
  });
  check("note: it opens in the bar, in place of the tree, with its title", nv.title === "Patience in 2:153" && !nv.treeShown, JSON.stringify(nv.title));
  check("note: the content is sanitised: no <script>, no on* attribute, the text kept", !nv.script && !nv.on && nv.xss === 0 && /patience and prayer/.test(nv.text), nv.html.slice(0, 300));
  check("note: the picture is fetched from its two pieces, sha256-checked and shown", nv.ok.length === 1 && nv.ok[0].sha === SHA && nv.ok[0].blob && nv.ok[0].w === 1, JSON.stringify(nv.ok));
  // UPDATED IN PLACE by the Architect (4 Nov 2026): the reason is now a translated sentence (I11), not the raw error text.
  check("note: a picture whose bytes fail the check is NOT shown", nv.failed.length === 1 && nv.failed[0].sha === BAD_SHA && /failed its safety check/.test(nv.failed[0].text) && !nv.ok.some((o) => o.sha === BAD_SHA), JSON.stringify(nv.failed));
  check("note: the way back is focused", nv.backFocused);
  if (SHOTS) await (await page.$("#siyagahCloudBar")).screenshot({ path: `${SHOTS}/mmj-note-en-1024.png` });
  await page.click("#siyagahCloudBar [data-mmj-back]");
  const back = await page.evaluate(() => {
    const row = document.querySelector('#siyagahCloudBar [data-mmj-note="n-patience"]');
    const r = row?.getBoundingClientRect();
    return { open: [...document.querySelectorAll('#siyagahCloudBar [data-mmj-folder][aria-expanded="true"]')].map((b) => b.getAttribute("data-mmj-folder")).sort(),
      focused: document.activeElement === row, inView: !!r && r.top >= 0 && r.bottom <= innerHeight, noteGone: !document.querySelector("#siyagahCloudBar [data-mmj-body]") };
  });
  check("back: the tree returns and the note view is gone", back.noteGone);
  check("back: the same folders are still open", JSON.stringify(back.open) === JSON.stringify(["f-baqarah", "f-hadith", "f-quran", "~loose"]), JSON.stringify(back.open));
  check("back: the note's own row is in view and focused", back.focused && back.inView, JSON.stringify(back));

  if (!(await page.$('#siyagahCloudBar [data-mmj-folder="f-hadith"][aria-expanded="true"]'))) await openFolder(page, "f-hadith"); // (only a broken way back closes it)
  await page.click('#siyagahCloudBar [data-mmj-note="n-big"]');
  await page.waitForSelector("#siyagahCloudBar [data-mmj-body]");
  check("big note: its content is joined from its two mmjparts pieces, in order", (await page.textContent("#siyagahCloudBar [data-mmj-body]")).includes("Part one of a long note about Ṣabr. Part two, joined from its piece."));
  await page.click("#siyagahCloudBar [data-mmj-back]");

  console.log("\n=== live changes ===");
  await page.evaluate(() => window.__stubEmit(`notebooks/nb-mriuc27o-f44402/mmj`, { _id: "n~note%2Ewith%2Edots", id: "note.with.dots", title: "Renamed in Siyagah", folderIds: ["f-quran"], at: { toMillis: () => 2000, valueOf: () => 2000 }, content: "<p>x</p>" }));
  await page.waitForFunction(() => [...document.querySelectorAll("#siyagahCloudBar [data-mmj-note] [data-mmj-name]")].some((e) => e.textContent === "Renamed in Siyagah"), null, { timeout: 5000 }).catch(() => {});
  check("live: a note renamed in Siyagah is renamed here", (await names(page)).includes("Renamed in Siyagah"));
  await page.evaluate(() => window.__stubEmit(`notebooks/nb-mriuc27o-f44402/mmj`, { _id: "n~n-loose", id: "n-loose", gone: true, at: { toMillis: () => 2001, valueOf: () => 2001 } }));
  await page.waitForFunction(() => !document.querySelector('#siyagahCloudBar [data-mmj-note="n-loose"]'), null, { timeout: 5000 }).catch(() => {});
  check("live: a note that leaves Mapping My Journey (gone) leaves the Map", !(await page.$('#siyagahCloudBar [data-mmj-note="n-loose"]')));
  check("live: the listener was opened once, on notebooks/<nb>/mmj", JSON.stringify(await page.evaluate(() => (window.__stubSnapLog || []).map((l) => l.col))) === JSON.stringify([`notebooks/${NB}/mmj`]));
  await page.waitForTimeout(500); // the device copy is saved 300 ms after a change
  // Still true after R2a: this suite never touches a folder's write control, so reading writes nothing at all.
  // (Writing by request is siyagah-mmj-write-browser.mjs's.)
  check("writes: nothing was written to any notebooks/ path", (await writesTo(page)) === 0);
  check("small: no page error", errors.length === 0, errors.join(" | "));

  // --- denied (same context: the device copy from above is in IndexedDB) ---------------------------------------------------
  console.log("\n=== permission-denied ===");
  await page.close();
  const d = await openMap({ ctx, clock: true, deny: true });
  await d.page.waitForSelector('#siyagahCloudBar [data-mmj-status][data-kind="denied"]', { timeout: 12000 }).catch(() => {});
  const ds = await d.page.evaluate(() => ({ text: document.querySelector("#siyagahCloudBar [data-mmj-status]")?.textContent || "", tree: !!document.querySelector("#siyagahCloudBar [data-mmj-tree]"), names: [...document.querySelectorAll("#siyagahCloudBar [data-mmj-name]")].map((e) => e.textContent), denied: (window.__stubDeniedLog || []).length + (window.__stubSnapLog || []).length }));
  check("denied: the bar says Ask the owner to allow this app", /Ask the owner to allow this app\./.test(ds.text), ds.text);
  check("denied: the refusal opens the folders, so it is never hidden (I15)", await d.page.evaluate(() => getComputedStyle(document.getElementById("siyagahMmjBody")).display !== "none"));
  if (await d.page.evaluate(() => getComputedStyle(document.getElementById("siyagahMmjBody")).display === "none")) await showFolders(d.page); // (only a hidden refusal needs this)
  if (ds.tree) await openFolder(d.page, "f-quran");
  const kept = await names(d.page);
  check("denied: the copy on this device is kept on screen (with the live rename), and says so", ds.tree && kept.includes("Renamed in Siyagah") && /Showing the copy on this device/.test(ds.text), JSON.stringify({ ...ds, kept }));
  await d.page.clock.runFor(5000);
  await d.page.waitForTimeout(300);
  const tries5 = await d.page.evaluate(() => (window.__stubDeniedLog || []).length + (window.__stubSnapLog || []).length);
  check("denied: no loop -- no new read within 5 s of the refusal", tries5 === ds.denied, `${ds.denied} -> ${tries5}`);
  await d.page.evaluate(() => { window.__stubDenyCols = []; });
  await d.page.clock.runFor(61000);
  await d.page.waitForSelector('#siyagahCloudBar [data-mmj-status][data-kind="live"]', { timeout: 8000 }).catch(() => {});
  const after = await d.page.evaluate(() => ({ kind: document.querySelector("#siyagahCloudBar [data-mmj-status]")?.getAttribute("data-kind"), tries: (window.__stubDeniedLog || []).length + (window.__stubSnapLog || []).length }));
  check("denied: one retry after a minute, and the Map is live again", after.kind === "live" && after.tries === tries5 + 1, JSON.stringify(after));
  if (SHOTS) { await d.page.evaluate(() => { window.__stubDenyCols = ["notebooks/"]; }); }
  await ctx.close();
}

// --- the Map's own Back stays in the first screenful -----------------------------------------------------------------
console.log("\n=== first screenful ===");
for (const lang of ["en", "bn"]) {
  const { ctx, page } = await openMap({ lang, width: 320 });
  await page.waitForSelector("#siyagahCloudBar [data-siyagah-toggle]", { timeout: 12000 });
  const top = await page.evaluate(() => document.getElementById("backLink").getBoundingClientRect().top);
  check(`first screenful ${lang}/320: with the folders shut, the Map's own Back is still in the first screenful (top < 400)`, top >= 0 && top < 400, `top ${top}`);
  await ctx.close();
}

// --- the Map's own folders load first --------------------------------------------------------------------------------
console.log("\n=== the Map first ===");
{
  const { ctx, page } = await openMap({ latencyMs: 150 });
  await page.waitForSelector("#siyagahCloudBar [data-siyagah-toggle]", { timeout: 15000 });
  const m = await page.evaluate(() => {
    const r = performance.getEntriesByType("resource").find((e) => e.name.includes("/js/siyagah-cloud.js"));
    const own = (window.__fsLog || []).filter((l) => !String(l.col || "").startsWith("notebooks/") && (l.col === "notes" || l.col === "notePlacements" || l.col === "noteFolders"));
    return { start: r ? r.startTime : null, own: own.map((l) => ({ c: l.col, t0: l.t0, t1: l.t1 })) };
  });
  const inFlight = m.own.filter((l) => l.t0 < m.start && (l.t1 == null || l.t1 > m.start));
  check("the Map first: Siyagah's code is fetched only after the Map's own folders and notes have loaded (no Map read in flight)", m.start != null && m.own.length > 0 && inFlight.length === 0, JSON.stringify({ start: m.start, inFlight, own: m.own.length }));
  await ctx.close();
}

// --- pieced -------------------------------------------------------------------------------------------------------------
console.log("\n=== pieced tree ===");
{
  const { ctx, page } = await openMap({ seed: { pieced: true } });
  await showFolders(page);
  check("pieced: t~0 + t~1 + t~2 of one generation are joined", await waitTree(page) && JSON.stringify(await names(page)) === JSON.stringify(["Qur'an reflections", "Hadith", LONG, "Not in a folder"]), JSON.stringify(await names(page)));
  await ctx.close();
}
{
  const { ctx, page } = await openMap({ seed: { pieced: true, badPiece: true } });
  await showFolders(page);
  await page.waitForSelector('#siyagahCloudBar [data-mmj-status][data-kind="live"]', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(2500); // readTree's three tries
  check("pieced: a piece of another generation shows NO tree", (await page.$$eval("#siyagahCloudBar [data-mmj-folder]", (e) => e.map((x) => x.getAttribute("data-mmj-folder")))).every((id) => id === "~loose"));
  await page.evaluate(() => window.__stubEmit(`notebooks/nb-mriuc27o-f44402/mmj`, { _id: "t~2", v: 1, i: 2, g: "G1", at: { toMillis: () => 3000, valueOf: () => 3000 }, folders: [{ id: "f-baqarah", n: "Sūrah Al-Baqarah", p: "f-quran", o: 0 }, { id: "f-hadith", n: "Hadith", p: null, o: 2, vis: 1 }] }));
  await page.waitForSelector('#siyagahCloudBar [data-mmj-folder="f-hadith"]', { timeout: 6000 }).catch(() => {});
  check("pieced: when the right piece lands, the tree is read again and shows", !!(await page.$('#siyagahCloudBar [data-mmj-folder="f-hadith"]')) && !!(await page.$('#siyagahCloudBar [data-mmj-folder="f-quran"]')));
  await ctx.close();
}

// --- layout -------------------------------------------------------------------------------------------------------------
console.log("\n=== layout ===");
function lum([r, g, b]) { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
async function measure(page) {
  return page.evaluate(() => {
    const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c.length < 4 || c[3] > 0.5)) return c.slice(0, 3); } return [255, 255, 255]; };
    const bar = document.getElementById("siyagahCloudBar"), br = bar.getBoundingClientRect();
    const buttons = [...bar.querySelectorAll("button")].filter((b) => b.getBoundingClientRect().width > 0).map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim().slice(0, 30), h: r.height, l: r.left, r: r.right }; });
    const texts = [...bar.querySelectorAll("[data-mmj-status], [data-mmj-name], [data-mmj-count], [data-mmj-title], [data-mmj-meta], [data-mmj-body] p, [data-mmj-pic], [data-mmj-back], [data-siyagah-status], strong")]
      .filter((e) => e.getBoundingClientRect().width > 0).map((e) => ({ t: e.textContent.trim().slice(0, 30), fg: rgb(getComputedStyle(e).color).slice(0, 3), bg: bgOf(e) }));
    return { vw: innerWidth, bl: br.left, br: br.right, pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, barOverflow: bar.scrollWidth - bar.clientWidth, buttons, texts, text: bar.textContent };
  });
}
const WIDTHS = MUTATE ? [360] : [360, 768, 1024, 1440], LANGS = MUTATE ? ["en"] : ["en", "bn"], PCTS = MUTATE ? [100] : [100, 150, 200];
for (const lang of LANGS) for (const width of WIDTHS) for (const pct of PCTS) {
  const tag = `${lang}/${width}/${pct}%`;
  const { ctx, page } = await openMap({ lang, width, pct });
  await showFolders(page);
  if (!(await waitTree(page))) { check(`layout ${tag}: the tree shows`, false); await ctx.close(); continue; }
  for (const id of ["f-quran", "f-baqarah", "f-long", "~loose"]) await openFolder(page, id);
  for (const view of ["tree", "note"]) {
    if (view === "note") { await page.click('#siyagahCloudBar [data-mmj-note="n-patience"]'); await page.waitForSelector("#siyagahCloudBar [data-mmj-body]"); await page.waitForTimeout(300); }
    const m = await measure(page);
    const v = `layout ${tag}${view === "note" ? " (note)" : ""}`;
    check(`${v}: the bar is on screen and nothing scrolls sideways`, m.bl >= 0 && m.br <= m.vw + 0.5 && m.pageOverflow <= 0 && m.barOverflow <= 0, JSON.stringify({ bl: m.bl, br: m.br, vw: m.vw, po: m.pageOverflow, bo: m.barOverflow }));
    const small = m.buttons.filter((b) => b.h < 39.5 || b.l < m.bl - 0.5 || b.r > m.br + 0.5);
    check(`${v.replace(" (note)", "")}${view === "note" ? " (note)" : ""}: every button in the bar is 40px tall or more and inside the bar`, m.buttons.length > 0 && small.length === 0, JSON.stringify(small));
    const low = m.texts.map((x) => ({ ...x, c: ratio(x.fg, x.bg) })).filter((x) => x.c < 4.5);
    check(`${v}: text contrast is 4.5 or more against its real background`, m.texts.length > 3 && low.length === 0, JSON.stringify(low.slice(0, 3)));
    if (lang === "bn" && view === "tree" && pct === 100) check(`${v}: the bar speaks Bangla`, /ফোল্ডার/.test(m.text) && !/Read-only|Not in a folder/.test(m.text), m.text.slice(0, 200));
    if (lang === "bn" && view === "note" && pct === 100) check(`${v}: the way back speaks Bangla`, /সিয়াগাহ ফোল্ডারে ফিরে যান/.test(m.text));
    if (SHOTS && (width === 360 || width === 1440) && pct !== 150) await (await page.$("#siyagahCloudBar")).screenshot({ path: `${SHOTS}/mmj-${view}-${lang}-${width}-${pct}.png` });
  }
  await ctx.close();
}
await browser.close();
if (MUTATE) {
  const target = MUTATIONS[MUTATE][3];
  console.log(`\n  mutation ${MUTATE}: its check "${target}" ${failed.includes(target) ? "FAILED, as it must" : "STAYED GREEN -- the mutation is unproven"}`);
}
console.log(`\n==== Siyagah MMJ on the Map (J112 R1)${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(MUTATE ? (failed.includes(MUTATIONS[MUTATE][3]) ? 3 : 4) : (fail ? 1 : 0));
