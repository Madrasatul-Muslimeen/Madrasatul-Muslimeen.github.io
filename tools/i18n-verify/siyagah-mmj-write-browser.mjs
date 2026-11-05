// PCF MSA J112 R2a -- the Map ASKS Siyagah to change a Mapping My Journey folder (Siyagah v05.68, MMJ-SHARE.md
// "Writing (R2)"): one new request document under notebooks/<nb>/mmjin/, nothing else of Siyagah's, ever.
// Against the Firebase stub (Siyagah's documents seeded under notebooks/<nb>/..., the SHIPPED switch):
//   lazy      the writer is not loaded until the first request; every folder has a 40px ⋯ menu; "New folder" at the top
//   rename    ONE create in mmjin with exactly {v,op,from,at,st,id,name}, from:'msa'; the new name shows at once, marked
//             "Waiting for Siyagah…", the row focused and the folders still open; done -> the mark goes; Siyagah's copy
//             then takes over
//   add       a subfolder: id x-msa-<random>, the parent opened, the new row focused; refused -> the row goes, Siyagah's
//             why is said in words on the parent's row (I15), focus back on it
//   move      Move to… offers no folder inside itself; the request carries parent; Move up carries before
//   vis       the 👁 switch asks folder.vis 0/1
//   delete    ONE confirm saying the folder AND its notes go to Siyagah's Trash and can be undone there (with the counts)
//   failed    a create the cloud refuses: said in words, the row restored
//   still     no answer for 20 s: "Still waiting…", and NOTHING is sent again
//   escape    Escape closes a form, focus back on the row
//   denied    the controls explain themselves (nothing sent)
//   only      across every page: every write on a notebooks/ path is a setDoc (no merge) into notebooks/<nb>/mmjin
//   qr        on quranrevival.github.io the request says from:'qr'
//   layout    en/bn at 360/768/1440, text 100/200%, with a menu open and a waiting row: no sideways scroll, every button
//             40px or more and inside the bar, contrast >= 4.5
// Run from the repository root with serve.js running:  QR_BASE=http://localhost:8151 node tools/i18n-verify/siyagah-mmj-write-browser.mjs
//   [--mutate=<name>]   SHOTS_DIR=<dir> saves screenshots
import fs from "node:fs";
import { chromium, newContext, BASE } from "./harness.mjs";

let pass = 0, fail = 0;
const failed = [];
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; failed.push(name); console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const read = (p) => fs.readFileSync(p, "utf8");
// A section that throws (a control a broken build never drew) is a FAILED check, never a crash that hides the rest.
function crashed(err) { check("the section ran to its end", false, String(err?.message || err).split("\n")[0].slice(0, 300)); }
function mutated(src, a, b) { const n = src.split(a).length - 1; if (!n) throw new Error(`mutation anchor missing: ${a}`); console.log(`  (mutation: ${n} occurrence${n > 1 ? "s" : ""} replaced)`); return src.split(a).join(b); }
const SHOTS = process.env.SHOTS_DIR || "";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUTATIONS = {
  "wrong-path": ["app/js/siyagah-mmj-write.js", "`notebooks/${nb}/mmjin`", "`notebooks/${nb}/mmj`", "only: every write on a notebooks/ path is a setDoc (no merge) into notebooks/<nb>/mmjin"],
  "no-refused-message": ["app/js/siyagah-map-link.js", 't("Siyagah did not make this change: {why}", { why: whyWords(outcome.why) })', '""', "add: refused -> Siyagah's why is said in words on the parent's row"],
  "no-wait-mark": ["app/js/siyagah-map-link.js", 't("Waiting for Siyagah…")', '""', "rename: the row says Waiting for Siyagah…"],
  "retry-on-still": ["app/js/siyagah-map-link.js", "entry.still = true; render();", "entry.still = true; render(); w.send(built.req);", "still: nothing was sent again"],
  "lose-open": ["app/js/siyagah-map-link.js", "render(); focusRow(focusId);", "open.clear(); render(); focusRow(focusId);", "rename: the folders stay open and the row is focused and in view (way-back law)"],
  "no-confirm": ["app/js/siyagah-map-link.js", 'else if (kind === "delete") { form = { kind: "delete", id }; }', 'else if (kind === "delete") { ask("folder.delete", { id }, id); return; }', "delete: one confirm says the folder AND its notes go to Siyagah's Trash, undoable there, with the counts"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`unknown mutation ${MUTATE}; known: ${Object.keys(MUTATIONS).join(", ")}`);
const SERVED = {};
if (MUTATE) { const [file, a, b] = MUTATIONS[MUTATE]; SERVED[file.replace(/^app/, "")] = mutated(read(file), a, b); }

const NB = "nb-mriuc27o-f44402";
const MMJ = `notebooks/${NB}/mmj`, MMJIN = `notebooks/${NB}/mmjin`;
check("POSITIVE CONTROL the shipped switch names this notebook", read("app/js/siyagah-cloud-readiness.js").includes(`notebookId: "${NB}"`));
const LONG = "Reflections on the Names of Allah and their meanings in everyday family life";
const TREE = [
  { id: "f-quran", n: "Qur'an reflections", p: null, o: 1 },
  { id: "f-baqarah", n: "Sūrah Al-Baqarah", p: "f-quran", o: 0 },
  { id: "f-hadith", n: "Hadith", p: null, o: 2, vis: 1 },
  { id: "f-long", n: LONG, p: null, o: 3 },
];
const seedJs = () => `
function TS(ms) { return { toMillis: function () { return ms; }, valueOf: function () { return ms; }, seconds: Math.floor(ms / 1000), nanoseconds: (ms % 1000) * 1e6 }; }
window.__TS = TS;
DATA["${MMJ}"] = [
  { _id: "t~0", v: 1, at: TS(1000), b: "v05.68", sec: { id: "mmj-sec", n: "Mapping My Journey" }, folders: ${JSON.stringify(TREE)} },
  { _id: "n~n1", id: "n1", title: "Patience in 2:153", folderIds: ["f-baqarah"], updatedAt: "2026-11-02T09:00:00Z", at: TS(1100), content: "<p>x</p>" },
  { _id: "n~n2", id: "n2", title: "In two folders", folderIds: ["f-quran", "f-hadith"], updatedAt: "2026-11-01T09:00:00Z", at: TS(1101), content: "<p>y</p>" },
];
try { if (localStorage.getItem("__mmjDeny") === "1") window.__stubDenyCols = ["notebooks/"]; } catch (e) {}
`;

const browser = await chromium.launch();
const allWrites = []; // every page's writes on notebooks/ paths, gathered before the page closes
async function openMap({ lang = "en", width = 1024, pct = 100, ctx = null, clock = false, deny = false, host = null } = {}) {
  ctx = ctx || await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: seedJs() });
  for (const [p, body] of Object.entries(SERVED)) await ctx.route(`**${p}`, (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
  if (host) {
    // QuranRevival's site: the same pages, served from this repository under quranrevival.github.io (the harness's own
    // routes -- Firebase, firebase-init.js -- still answer for it).
    await ctx.route(`https://${host}/**`, async (r) => {
      const u = new URL(r.request().url());
      if (/\/js\/firebase-init\.js$/.test(u.pathname) || Object.keys(SERVED).some((p) => u.pathname.endsWith(p))) return r.fallback();
      const res = await r.fetch({ url: BASE + u.pathname + u.search });
      return r.fulfill({ response: res });
    });
  }
  await ctx.addInitScript((d) => { try { localStorage.setItem("__mmjDeny", d ? "1" : "0"); localStorage.setItem("msa-siyagah-mmj-open", "1"); } catch (e) {} }, deny);
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  if (clock) await page.clock.install();
  await page.goto(`${host ? `https://${host}` : BASE}/app/journey-map.html`, { waitUntil: "load" });
  await page.waitForFunction(() => document.getElementById("app")?.style.display === "block", null, { timeout: 20000 });
  await page.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; for (const e of document.querySelectorAll('[id*="splash"], .mm-splash-overlay')) e.remove(); }, pct);
  const ok = await page.waitForSelector("#siyagahCloudBar [data-mmj-tree]", { timeout: 15000 }).then(() => true, () => false);
  return { ctx, page, errors, ok };
}
const writes = (page) => page.evaluate(() => (window.__fsLog || []).filter((l) => /^(setDoc|updateDoc|batchCommit|txCommit)$/.test(l.kind) && String(l.col || "").startsWith("notebooks/")).map((l) => ({ kind: l.kind, col: l.col, id: l.id })));
const writeData = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => String(w.col || "").startsWith("notebooks/")));
async function gather(page) { allWrites.push(...await writes(page), ...(await writeData(page)).map((w) => ({ kind: w.kind, col: w.col, id: w.id, merge: w.merge }))); }
async function openFolder(page, id) { if (!(await page.$(`#siyagahCloudBar [data-mmj-folder="${id}"][aria-expanded="true"]`))) { await page.click(`#siyagahCloudBar [data-mmj-folder="${id}"]`); await page.waitForSelector(`#siyagahCloudBar [data-mmj-folder="${id}"][aria-expanded="true"]`); } }
async function menu(page, id) {
  await page.click(`#siyagahCloudBar [data-mmj-menu-btn="${id}"]`);
  await page.waitForSelector(`#siyagahCloudBar [data-mmj-menu="${id}"].open`, { timeout: 3000 });
}
async function act(page, id, kind) { await menu(page, id); await page.click(`#siyagahCloudBar [data-mmj-menu="${id}"] [data-mmj-act="${kind}"]`); }
const lastReq = async (page) => { const d = await writeData(page); return d[d.length - 1] || null; };
const rowState = (page, id) => page.evaluate((id) => {
  const b = document.querySelector(`#siyagahCloudBar [data-mmj-folder="${CSS.escape(id)}"]`);
  if (!b) return null;
  const li = b.closest("li"), r = b.getBoundingClientRect();
  return { name: b.querySelector("[data-mmj-name]")?.textContent, pending: b.closest("[data-mmj-row]")?.getAttribute("data-mmj-pending") || null,
    wait: [...li.children].filter((e) => e.matches("[data-mmj-wait]")).map((e) => e.textContent).join(" "),
    msg: [...li.children].filter((e) => e.matches("[data-mmj-msg]")).map((e) => e.textContent).join(" "),
    focused: document.activeElement === b, inView: r.top >= 0 && r.bottom <= innerHeight,
    open: [...document.querySelectorAll('#siyagahCloudBar [data-mmj-folder][aria-expanded="true"]')].map((x) => x.getAttribute("data-mmj-folder")).sort() };
}, id);
const emit = (page, col, row) => page.evaluate(([c, r]) => window.__stubEmit(c, r), [col, row]);
const answer = (page, req, extra) => emit(page, MMJIN, { _id: req.id, ...req.data, at: null, ...extra });
const keys = (o) => Object.keys(o || {}).sort();
const waitFor = (page, fn, arg, t = 5000) => page.waitForFunction(fn, arg, { timeout: t }).then(() => true, () => false);

// --- the main run --------------------------------------------------------------------------------------------------------
console.log("\n=== lazy, rename, done ===");
let keepCtx;
try {
  const { ctx, page, errors, ok } = await openMap({});
  keepCtx = ctx;
  check("the tree shows (folders open on this device)", ok);
  const lazy = await page.evaluate(() => ({
    loaded: performance.getEntriesByType("resource").some((e) => e.name.includes("/js/siyagah-mmj-write.js")),
    menus: [...document.querySelectorAll("#siyagahCloudBar [data-mmj-menu-btn]")].map((b) => ({ id: b.getAttribute("data-mmj-menu-btn"), h: b.getBoundingClientRect().height, w: b.getBoundingClientRect().width })),
    top: !!document.querySelector('#siyagahCloudBar [data-mmj-act="newtop"]'),
  }));
  check("lazy: the writer is NOT loaded before the first request (I9)", !lazy.loaded);
  check("lazy: every top folder has a 40px ⋯ menu, and New folder sits above the tree", lazy.top && JSON.stringify(lazy.menus.map((m) => m.id)) === JSON.stringify(["f-quran", "f-hadith", "f-long"]) && lazy.menus.every((m) => m.h >= 39.5 && m.w >= 39.5), JSON.stringify(lazy));

  await openFolder(page, "f-quran");
  await act(page, "f-baqarah", "rename");
  const pre = await page.evaluate(() => ({ v: document.querySelector("#siyagahCloudBar [data-mmj-input]")?.value, focused: document.activeElement?.matches("[data-mmj-input]") }));
  check("rename: the form opens with the folder's name, focused", pre.v === "Sūrah Al-Baqarah" && pre.focused, JSON.stringify(pre));
  check("rename: still nothing written while the form is open", (await writes(page)).length === 0);
  await page.fill("#siyagahCloudBar [data-mmj-input]", "  Al-Baqarah notes ");
  await page.press("#siyagahCloudBar [data-mmj-input]", "Enter");
  await waitFor(page, () => (window.__stubWriteData || []).some((w) => String(w.col).includes("/mmjin")));
  const w1 = await writes(page), r1 = await lastReq(page);
  check("rename: exactly ONE write, a setDoc in notebooks/<nb>/mmjin", w1.length === 1 && w1[0].kind === "setDoc" && w1[0].col === MMJIN, JSON.stringify(w1));
  check("rename: the request is exactly {v,op,from,at,st,id,name}: v 1, folder.rename, from msa, st new, the trimmed name, no merge", r1 && JSON.stringify(keys(r1.data)) === JSON.stringify(["at", "from", "id", "name", "op", "st", "v"])
    && r1.data.v === 1 && r1.data.op === "folder.rename" && r1.data.from === "msa" && r1.data.st === "new" && r1.data.id === "f-baqarah" && r1.data.name === "Al-Baqarah notes" && !!r1.data.at && !r1.merge, JSON.stringify(r1));
  check("rename: the request id is a fresh random id (20 letters and digits)", /^[a-z0-9]{20}$/.test(r1?.id || ""), r1?.id);
  check("lazy: the writer was loaded by the first request", await page.evaluate(() => performance.getEntriesByType("resource").some((e) => e.name.includes("/js/siyagah-mmj-write.js"))));
  await waitFor(page, () => !!document.querySelector("#siyagahCloudBar [data-mmj-wait]"));
  let s = await rowState(page, "f-baqarah");
  check("rename: the new name shows at once, marked as waiting", s?.name === "Al-Baqarah notes" && s?.pending === "folder.rename", JSON.stringify(s));
  check("rename: the row says Waiting for Siyagah…", /Waiting for Siyagah…/.test(s?.wait || ""), JSON.stringify(s));
  check("rename: the folders stay open and the row is focused and in view (way-back law)", JSON.stringify(s?.open) === JSON.stringify(["f-quran"]) && s.focused && s.inView, JSON.stringify(s));
  check("rename: the request document itself is followed (one listener on it)", await page.evaluate(([c, id]) => (window.__stubSnapLog || []).filter((l) => l.col === c && l.id === id).length === 1, [MMJIN, r1.id]));
  await answer(page, r1, { st: "work", by: "dev1" });
  await page.waitForTimeout(200);
  check("rename: st work is still waiting", /Waiting for Siyagah…/.test((await rowState(page, "f-baqarah"))?.wait || ""));
  await answer(page, r1, { st: "done", res: { id: "f-baqarah" }, doneAt: 1 });
  await waitFor(page, () => !document.querySelector("#siyagahCloudBar [data-mmj-wait]"));
  s = await rowState(page, "f-baqarah");
  check("done: the waiting mark goes, the new name stays until Siyagah's copy shows it", s?.wait === "" && !s?.pending && s?.name === "Al-Baqarah notes", JSON.stringify(s));
  await page.evaluate(([c, folders]) => window.__stubEmit(c, { _id: "t~0", v: 1, at: window.__TS(5000), b: "v05.68", sec: { id: "mmj-sec", n: "Mapping My Journey" }, folders }),
    [MMJ, TREE.map((f) => (f.id === "f-baqarah" ? { ...f, n: "Al-Baqarah notes" } : f))]);
  await page.waitForTimeout(400);
  s = await rowState(page, "f-baqarah");
  check("done: Siyagah's copy takes over (same name, no mark), folders still open", s?.name === "Al-Baqarah notes" && !s?.pending && s?.wait === "" && JSON.stringify(s?.open) === JSON.stringify(["f-quran"]), JSON.stringify(s));

  console.log("\n=== add a subfolder, refused ===");
  await act(page, "f-hadith", "add");
  await page.fill("#siyagahCloudBar [data-mmj-input]", "New sub");
  await page.click('#siyagahCloudBar [data-mmj-form="add"] button[type="submit"]');
  await waitFor(page, () => (window.__stubWriteData || []).filter((w) => String(w.col).includes("/mmjin")).length === 2);
  const r2 = await lastReq(page);
  check("add: one more create: folder.add {id x-msa-<random>, name, parent f-hadith} and nothing else", (await writes(page)).length === 2 && r2?.data.op === "folder.add" && /^x-msa-[a-z0-9]{16}$/.test(r2.data.id) && r2.data.parent === "f-hadith" && r2.data.name === "New sub"
    && JSON.stringify(keys(r2.data)) === JSON.stringify(["at", "from", "id", "name", "op", "parent", "st", "v"]), JSON.stringify(r2));
  await waitFor(page, (id) => !!document.querySelector(`#siyagahCloudBar [data-mmj-folder="${CSS.escape(id)}"]`), r2.data.id);
  s = await rowState(page, r2.data.id);
  check("add: the parent opens, the new folder shows at once (waiting), focused", s?.name === "New sub" && s?.pending === "folder.add" && /Waiting/.test(s.wait) && s.focused && s.open.includes("f-hadith"), JSON.stringify(s));
  await answer(page, r2, { st: "refused", why: "not a Mapping My Journey folder", doneAt: 1 });
  await waitFor(page, (id) => !document.querySelector(`#siyagahCloudBar [data-mmj-folder="${CSS.escape(id)}"]`), r2.data.id);
  const gone = await rowState(page, r2.data.id), ph = await rowState(page, "f-hadith");
  check("add: refused -> the new row goes (the tree as it was)", gone === null, JSON.stringify(gone));
  check("add: refused -> Siyagah's why is said in words on the parent's row", /Siyagah did not make this change: not a Mapping My Journey folder/.test(ph?.msg || ""), JSON.stringify(ph));
  check("add: refused -> focus back on the parent's row", !!ph?.focused, JSON.stringify(ph));
  await page.click('#siyagahCloudBar [data-mmj-dismiss="f-hadith"]');
  check("add: the message can be dismissed (OK), focus kept on the row", await page.evaluate(() => !document.querySelector("#siyagahCloudBar [data-mmj-msg]") && document.activeElement?.getAttribute("data-mmj-folder") === "f-hadith"));

  console.log("\n=== move, move up, vis ===");
  await act(page, "f-quran", "move");
  const opts = await page.$$eval("#siyagahCloudBar [data-mmj-parent] option", (os) => os.map((o) => o.value));
  check("move: Move to… never offers the folder itself or its own subfolders", JSON.stringify(opts) === JSON.stringify(["", "f-hadith", "f-long"]), JSON.stringify(opts));
  await page.keyboard.press("Escape");
  s = await rowState(page, "f-quran");
  check("escape: Escape closes the form and focus is back on the row", s?.focused && !(await page.$("#siyagahCloudBar [data-mmj-form]")), JSON.stringify(s));
  await act(page, "f-long", "move");
  await page.selectOption("#siyagahCloudBar [data-mmj-parent]", "f-quran");
  await page.click('#siyagahCloudBar [data-mmj-form="move"] button[type="submit"]');
  await waitFor(page, () => (window.__stubWriteData || []).filter((w) => String(w.col).includes("/mmjin")).length === 3);
  const r3 = await lastReq(page);
  check("move: folder.move {id, parent} exactly", r3?.data.op === "folder.move" && r3.data.id === "f-long" && r3.data.parent === "f-quran" && JSON.stringify(keys(r3.data)) === JSON.stringify(["at", "from", "id", "op", "parent", "st", "v"]), JSON.stringify(r3?.data));
  s = await rowState(page, "f-long");
  check("move: it shows at once inside its new parent, waiting, focused", s?.pending === "folder.move" && s.focused && await page.evaluate(() => !!document.querySelector('#siyagahCloudBar [data-mmj-folder="f-quran"]').closest("li").querySelector('[data-mmj-folder="f-long"]')), JSON.stringify(s));
  await act(page, "f-hadith", "up");
  await waitFor(page, () => (window.__stubWriteData || []).filter((w) => String(w.col).includes("/mmjin")).length === 4);
  const r4 = await lastReq(page);
  check("move up: folder.move {id, parent:null, before:<the folder above>}", r4?.data.op === "folder.move" && r4.data.id === "f-hadith" && r4.data.parent === null && r4.data.before === "f-quran", JSON.stringify(r4?.data));
  await menu(page, "f-hadith");
  const sw = await page.getAttribute('#siyagahCloudBar [data-mmj-menu="f-hadith"] [data-mmj-act="vis"]', "aria-checked");
  await page.click('#siyagahCloudBar [data-mmj-menu="f-hadith"] [data-mmj-act="vis"]');
  await waitFor(page, () => (window.__stubWriteData || []).filter((w) => String(w.col).includes("/mmjin")).length === 5);
  const r5 = await lastReq(page);
  check("vis: the 👁 switch shows on and asks folder.vis {id, vis:0}", sw === "true" && r5?.data.op === "folder.vis" && r5.data.vis === 0 && JSON.stringify(keys(r5.data)) === JSON.stringify(["at", "from", "id", "op", "st", "v", "vis"]), JSON.stringify({ sw, d: r5?.data }));

  console.log("\n=== delete ===");
  await act(page, "f-quran", "delete");
  const conf = await page.evaluate(() => ({ text: document.querySelector("#siyagahCloudBar [data-mmj-confirm]")?.textContent || "", focused: document.activeElement?.hasAttribute("data-mmj-confirm-delete") }));
  check("delete: still nothing sent while the confirm is open", (await writes(page)).length === 5);
  // f-quran holds f-baqarah (its note n1 goes) and, moved in just now, f-long; n2 is also in f-hadith, so it stays.
  check("delete: one confirm says the folder AND its notes go to Siyagah's Trash, undoable there, with the counts", /Delete “Qur'an reflections”\? It goes to Siyagah's Trash with its 2 subfolders and 1 notes\. You can undo it in Siyagah \(Trash, then Restore\)\./.test(conf.text) && conf.focused, JSON.stringify(conf));
  await page.click("#siyagahCloudBar [data-mmj-confirm-delete]");
  await waitFor(page, () => (window.__stubWriteData || []).filter((w) => String(w.col).includes("/mmjin")).length === 6);
  const r6 = await lastReq(page);
  check("delete: folder.delete {id} exactly", r6?.data.op === "folder.delete" && r6.data.id === "f-quran" && JSON.stringify(keys(r6.data)) === JSON.stringify(["at", "from", "id", "op", "st", "v"]), JSON.stringify(r6?.data));
  s = await rowState(page, "f-quran");
  check("delete: the row stays, marked as going, waiting, focused", s?.pending === "folder.delete" && /Waiting/.test(s.wait) && s.focused, JSON.stringify(s));
  if (SHOTS) await (await page.$("#siyagahCloudBar")).screenshot({ path: `${SHOTS}/mmj-write-delete-en-1024.png` });
  check("no page error", errors.length === 0, errors.join(" | "));
  await gather(page);
  await page.close();
} catch (err) { crashed(err); }

console.log("\n=== a create the cloud refuses ===");
try {
  const { ctx, page, errors } = await openMap({});
  await page.evaluate(() => { window.__stubFailWrites = true; });
  await act(page, "f-long", "rename");
  await page.fill("#siyagahCloudBar [data-mmj-input]", "Will not go");
  await page.press("#siyagahCloudBar [data-mmj-input]", "Enter");
  await waitFor(page, () => !!document.querySelector("#siyagahCloudBar [data-mmj-msg]"));
  const s = await rowState(page, "f-long");
  check("failed: said in words on the row (I15), the row restored, focused", /Siyagah could not be asked: Ask the owner to allow this app\./.test(s?.msg || "") && s?.name === LONG && !s?.pending && s?.wait === "" && s.focused, JSON.stringify(s));
  check("failed: no page error", errors.length === 0, errors.join(" | "));
  await gather(page);
  await ctx.close();
} catch (err) { crashed(err); }

console.log("\n=== no answer: still waiting, never sent again ===");
try {
  const { ctx, page } = await openMap({ clock: true });
  await act(page, "f-long", "rename");
  await page.fill("#siyagahCloudBar [data-mmj-input]", "Patient");
  await page.press("#siyagahCloudBar [data-mmj-input]", "Enter");
  await waitFor(page, () => !!document.querySelector("#siyagahCloudBar [data-mmj-wait]"));
  // the request is really out (sent, and its answer followed) before the clock moves: the 20 s start from the send
  await waitFor(page, (c) => (window.__stubSnapLog || []).some((l) => l.col === c && l.id), MMJIN);
  await page.clock.runFor(21000);
  await page.waitForTimeout(200);
  const s = await rowState(page, "f-long");
  check("still: after 20 s it says it is still waiting, and why", /Still waiting for Siyagah\. It makes the change when Siyagah is open on one of your devices\./.test(s?.wait || "") && s?.name === "Patient", JSON.stringify(s));
  await page.clock.runFor(120000);
  await page.waitForTimeout(200);
  check("still: nothing was sent again", (await writes(page)).length === 1, JSON.stringify(await writes(page)));
  await gather(page);
  await ctx.close();
} catch (err) { crashed(err); }

console.log("\n=== denied: the controls explain themselves ===");
try {
  const d = await openMap({ ctx: keepCtx, deny: true }); // the device copy from the main run is in IndexedDB
  await d.page.waitForSelector('#siyagahCloudBar [data-mmj-status][data-kind="denied"]', { timeout: 12000 }).catch(() => {});
  check("denied: the device copy's tree is shown, with its ⋯ menus", d.ok && !!(await d.page.$('#siyagahCloudBar [data-mmj-menu-btn="f-hadith"]')));
  if (d.ok) {
    await act(d.page, "f-hadith", "rename");
    await d.page.fill("#siyagahCloudBar [data-mmj-input]", "x");
    await d.page.press("#siyagahCloudBar [data-mmj-input]", "Enter");
    await waitFor(d.page, () => !!document.querySelector("#siyagahCloudBar [data-mmj-msg]"));
    const s = await rowState(d.page, "f-hadith");
    check("denied: a request is not sent; the row says why in words", /This change cannot be sent now: Ask the owner to allow this app\./.test(s?.msg || "") && (await writes(d.page)).length === 0 && s?.focused, JSON.stringify(s));
  }
  await gather(d.page);
  await keepCtx.close();
} catch (err) { crashed(err); }

console.log("\n=== quranrevival.github.io ===");
try {
  const { ctx, page, ok } = await openMap({ host: "quranrevival.github.io" });
  check("qr: the Map opens on quranrevival.github.io with the tree", ok);
  if (ok) {
    await act(page, "f-hadith", "vis");
    await waitFor(page, () => (window.__stubWriteData || []).some((w) => String(w.col).includes("/mmjin")));
    const r = await lastReq(page);
    check("qr: the request says from:'qr'", r?.data.from === "qr" && r.col === MMJIN, JSON.stringify(r));
    await act(page, "f-hadith", "add");
    await page.fill("#siyagahCloudBar [data-mmj-input]", "From QR");
    await page.press("#siyagahCloudBar [data-mmj-input]", "Enter");
    await waitFor(page, () => (window.__stubWriteData || []).filter((w) => String(w.col).includes("/mmjin")).length === 2);
    check("qr: a new folder's id is x-qr-<random>", /^x-qr-[a-z0-9]{16}$/.test((await lastReq(page))?.data.id || ""));
  }
  await gather(page);
  await ctx.close();
} catch (err) { crashed(err); }

console.log("\n=== only mmjin, only creates ===");
check("POSITIVE CONTROL writes were gathered from the pages above", allWrites.length >= 10, String(allWrites.length));
const bad = allWrites.filter((w) => !(w.col === MMJIN && (w.kind === "setDoc" || w.kind === "set") && !w.merge));
check("only: every write on a notebooks/ path is a setDoc (no merge) into notebooks/<nb>/mmjin", allWrites.length > 0 && bad.length === 0, JSON.stringify(bad.slice(0, 4)));

// --- layout -------------------------------------------------------------------------------------------------------------
console.log("\n=== layout ===");
function lum([r, g, b]) { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
async function measure(page) {
  return page.evaluate(() => {
    const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c.length < 4 || c[3] > 0.5)) return c.slice(0, 3); } return [255, 255, 255]; };
    const bar = document.getElementById("siyagahCloudBar"), br = bar.getBoundingClientRect();
    const buttons = [...bar.querySelectorAll("button, select, input")].filter((b) => b.getBoundingClientRect().width > 0).map((b) => { const r = b.getBoundingClientRect(); return { t: (b.textContent || b.value || "").trim().slice(0, 30), h: r.height, l: r.left, r: r.right }; });
    const texts = [...bar.querySelectorAll("[data-mmj-status], [data-mmj-name], [data-mmj-count], [data-mmj-wait], [data-mmj-msg] > span, [data-mmj-confirm], [data-mmj-form] label > span, .bar-palette button, [data-mmj-tools] button, [data-siyagah-status], strong")]
      .filter((e) => e.getBoundingClientRect().width > 0).map((e) => ({ t: e.textContent.trim().slice(0, 30), fg: rgb(getComputedStyle(e).color).slice(0, 3), bg: bgOf(e) }));
    const pop = bar.querySelector(".bar-palette.open"), pr = pop?.getBoundingClientRect();
    // what is really on top at the menu's centre: the menu, not something painted over it
    const hit = pr ? document.elementFromPoint(pr.left + pr.width / 2, Math.min(pr.top + 20, innerHeight - 1)) : null;
    return { vw: innerWidth, bl: br.left, br: br.right, pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, barOverflow: bar.scrollWidth - bar.clientWidth,
      buttons, texts, text: bar.textContent, pop: pr ? { l: pr.left, r: pr.right } : null, popOnTop: !!(hit && pop.contains(hit)) };
  });
}
const WIDTHS = MUTATE ? [360] : [360, 768, 1440], LANGS = MUTATE ? ["en"] : ["en", "bn"], PCTS = MUTATE ? [100] : [100, 200];
for (const lang of LANGS) for (const width of WIDTHS) for (const pct of PCTS) {
  const tag = `${lang}/${width}/${pct}%`;
  const { ctx, page, ok } = await openMap({ lang, width, pct });
  try {
  if (!ok) { check(`layout ${tag}: the tree shows`, false); await ctx.close(); continue; }
  await openFolder(page, "f-quran");
  await act(page, "f-long", "rename");
  await page.fill("#siyagahCloudBar [data-mmj-input]", "A waiting row with a long name that has to wrap on a phone");
  await page.press("#siyagahCloudBar [data-mmj-input]", "Enter");
  await waitFor(page, () => !!document.querySelector("#siyagahCloudBar [data-mmj-wait]"));
  await menu(page, "f-baqarah"); // a nested folder's menu, open
  await page.evaluate(() => document.querySelector('#siyagahCloudBar [data-mmj-menu="f-baqarah"]').scrollIntoView({ block: "nearest" }));
  const m = await measure(page);
  check(`layout ${tag}: the bar is on screen and nothing scrolls sideways (menu open, a row waiting)`, m.bl >= 0 && m.br <= m.vw + 0.5 && m.pageOverflow <= 0 && m.barOverflow <= 0, JSON.stringify({ bl: m.bl, br: m.br, vw: m.vw, po: m.pageOverflow, bo: m.barOverflow }));
  check(`layout ${tag}: the open menu is inside the bar and on top`, !!m.pop && m.pop.l >= m.bl - 0.5 && m.pop.r <= m.br + 0.5 && m.popOnTop, JSON.stringify(m.pop));
  const small = m.buttons.filter((b) => b.h < 39.5 || b.l < m.bl - 0.5 || b.r > m.br + 0.5);
  check(`layout ${tag}: every control in the bar is 40px tall or more and inside the bar`, m.buttons.length > 8 && small.length === 0, JSON.stringify(small.slice(0, 4)));
  const low = m.texts.map((x) => ({ ...x, c: ratio(x.fg, x.bg) })).filter((x) => x.c < 4.5);
  check(`layout ${tag}: text contrast is 4.5 or more against its real background`, m.texts.length > 8 && low.length === 0, JSON.stringify(low.slice(0, 3)));
  if (lang === "bn" && pct === 100) check(`layout ${tag}: the controls speak Bangla`, /সিয়াগাহ-এর অপেক্ষায়…/.test(m.text) && /নাম বদলান/.test(m.text) && !/Waiting for Siyagah|Rename|Move up/.test(m.text), m.text.slice(0, 300));
  if (SHOTS && ((lang === "bn" && width === 360 && pct === 200) || (lang === "en" && width === 1440 && pct === 100))) await page.screenshot({ path: `${SHOTS}/mmj-write-${lang}-${width}-${pct}.png`, fullPage: false });
  } catch (err) { crashed(err); }
  await ctx.close();
}
await browser.close();
if (MUTATE) {
  const target = MUTATIONS[MUTATE][3];
  console.log(`\n  mutation ${MUTATE}: its check "${target}" ${failed.includes(target) ? "FAILED, as it must" : "STAYED GREEN -- the mutation is unproven"}`);
}
console.log(`\n==== Siyagah MMJ folder requests on the Map (J112 R2a)${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(MUTATE ? (failed.includes(MUTATIONS[MUTATE][3]) ? 3 : 4) : (fail ? 1 : 0));
