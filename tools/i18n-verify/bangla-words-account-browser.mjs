// PCF MSA J143 (the Owner ticked B, 16 Nov 2026): the own-language word list in the reader's ACCOUNT, in the real pages (Firebase stubbed).
//   node tools/i18n-verify/bangla-words-account-browser.mjs [--mutate=NAME]     (repository root, serve.js on :8080 or QR_BASE)
// UPDATED IN PLACE 16 Nov 2026 (Architect 114L, v15.13): the Owner published the banglaWords Rules and the gate
// (app/js/bangla-words-readiness.js) is now ON in the repository. This suite still runs the pages TWICE:
//   GATE OFF (the readiness file is replaced in memory by a closed one; the way back): the page behaves exactly as before (the list is
//     on the device, the page says so) and NOTHING touches banglaWords.
//   GATE ON, as shipped:
//     - this device's list is COPIED up once into the first student's account and the device copy is never changed (I4);
//     - a tap saves the student's own list to banglaWords/{tenant}__{person}; a failed save reaches the reader (I15);
//     - switching students switches lists (D10: no lock);
//     - the Monitor's Vocabulary table reads each student's own list (one get) and counts it, and its note says so.
// Mutations (--mutate=NAME), each must exit 1:
//   leak       the page treats the gate as ON even when it is OFF      -> "gate OFF: nothing touches banglaWords" fails
//   nocopyup   the device list is not copied up                        -> "copied up once" fails
//   devwrite   the device copy is overwritten by the account's lists   -> "the device list is never changed" fails
//   nopersist  a tap is not saved to the account                       -> "a tap saves" fails
//   noswitch   switching students keeps the previous student's words   -> "switching students" fails
//   monitorown the Monitor ignores the own-language list               -> "the Monitor counts" fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const HTML = "app/quranrevival.html", MON = "app/monitor.html";
const MUT = {
  leak: [HTML, "const banglaSharedOn = () => isBanglaWordsPersistenceReady();", "const banglaSharedOn = () => true;"],
  nocopyup: [HTML, "const r = await m.saveBanglaList(db, c, c.personId, mineDevice);", "const r = { ok: false };"],
  devwrite: [HTML, "saveBanglaState(devicePrefsState(banglaState, banglaDeviceState)); // the device keeps only", "saveBanglaState(banglaState); // the device keeps only"],
  nopersist: [HTML, "        const before = banglaListPayload(prev, list), after = banglaListPayload(next, list);\n", "        const before = banglaListPayload(prev, list), after = banglaListPayload(next, list); continue;\n"],
  noswitch: [HTML, "if (banglaSharedOn()) { banglaState = withBanglaList(withBanglaList(banglaState, \"mine\", { words: [], kinds: {} }), \"admin\", { words: [], kinds: {} }); banglaRemote = { key: \"\", status: \"idle\" }; banglaHydrate(); }", "if (banglaSharedOn()) { banglaRemote = { key: \"\", status: \"idle\" }; banglaHydrate(); }"],
  monitorown: [MON, "const known = (row) => knownBase(row) || own.has(row?.l);", "const known = (row) => knownBase(row);"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const T = "t1"; // the stub's tenant id (firebase-stub TENANT_ID)
const rows = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/learn-next.json", "utf8")).rows;
const L1 = rows[0].l, L2 = rows[1].l, L3 = rows[2].l; // real lemma ids, so the list can show them
const READY_ON = (src) => /\n  ready: true,\n/.test(src) ? src : src.replace("  ready: false,\n  decision: null,", "  ready: true,\n  decision: { by: \"master-architect\", on: \"2026-11-20\", reference: \"docs/test.md\" },");
const READY_OFF = (src) => { const out = src.replace(/  ready: true,\n  decision: Object\.freeze\(\{[\s\S]*?\n  \}\),/, "  ready: false,\n  decision: null,"); if (!/\n  ready: false,\n  decision: null,/.test(out)) throw new Error("READY_OFF: could not close the gate in memory"); return out; };
const gateRoute = (ctx, on) => ctx.route("**/app/js/bangla-words-readiness.js*", async (r) => { const res = await r.fetch(); r.fulfill({ response: res, body: (on ? READY_ON : READY_OFF)(await res.text()) }); });
const seedJs = (rows) => rows.map((r) => `(DATA.banglaWords = DATA.banglaWords || []).push(${JSON.stringify(r)});`).join("\n"); // the stub's own DATA, before the page runs
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);

async function open(on, { width = 390, lang = "en", device = null, seed = [] } = {}) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 844 }, extraSeedJs: seedJs(seed) });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await gateRoute(ctx, on);
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (src.split(a).length !== 2) throw new Error(`mutation ${MUTATE}: anchor found ${src.split(a).length - 1} times, not 1`);
    await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.replace(a, b) }));
  }
  if (device) await ctx.addInitScript((d) => { try { if (!localStorage.getItem("mm_bangla_words.v2")) localStorage.setItem("mm_bangla_words.v2", JSON.stringify(d)); } catch {} }, device);
  return ctx;
}
const touched = (page) => page.evaluate(() => ({ log: (window.__fsLog || []).filter((r) => /banglaWords/.test(JSON.stringify(r))).length, writes: (window.__stubWriteData || []).filter((w) => w.col === "banglaWords") }));
async function openCard(ctx) {
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", "2"); await page.waitForTimeout(1200);
  await setSel(page, "ayahSelect", "14"); await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":2:14:8"]')?.click());
  await page.waitForFunction(() => !!document.querySelector("#quranWordCardMount [data-bangla-block]"), null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => { const p = document.querySelector("#quranWordCardMount [data-word-card-menu-panel]"); if (p?.hidden) document.querySelector("#quranWordCardMount [data-word-card-menu-toggle]")?.click(); }); await page.waitForTimeout(300);
  return page;
}
const device = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("mm_bangla_words.v2") || "null"));
const MINE = '#quranWordCardMount [data-bangla-list="mine"]';
const CHIP = '#quranWordCardMount [data-bangla-marks] [data-bangla-kind="bangla"]';

// ===== GATE OFF (closed in memory: the way back) =====
{
  const ctx = await open(false);
  const page = await openCard(ctx);
  await page.evaluate((s) => document.querySelector(s)?.click(), MINE); await page.waitForTimeout(300);
  const lemma = await page.evaluate(() => document.querySelector("#quranWordCardMount [data-bangla-marks]")?.dataset.banglaLemma);
  await page.evaluate((s) => document.querySelector(s)?.click(), CHIP); await page.waitForTimeout(500);
  check("gate OFF: a mark is stored on the device exactly as before", ((await device(page))?.mine ?? []).includes(lemma), JSON.stringify(await device(page)));
  const t = await touched(page);
  check("gate OFF: nothing touches banglaWords (no read, no write)", t.log === 0 && t.writes.length === 0, JSON.stringify(t));
  check("gate OFF: the menu still says the list is saved on this device", await page.evaluate(() => /this device/i.test(document.querySelector("#quranWordCardMount [data-bangla-device]")?.textContent ?? "")), await page.evaluate(() => document.querySelector("#quranWordCardMount [data-bangla-device]")?.textContent));
  await ctx.close();
}

// ===== GATE ON =====
const DEV = { list: "mine", on: true, admin: [], mine: [L1], kinds: { admin: {}, mine: { [L1]: ["bangla"] } }, wheel: { ring: true, centre: true, tenth: false } };
const seedP2 = [{ _id: `${T}__p2`, tenantId: T, scope: "p2", words: [L2], kinds: { [L2]: ["rituals"] } }];
{
  const ctx = await open(true, { device: DEV, seed: seedP2 });
  const page = await openCard(ctx);
  await page.waitForTimeout(1200);
  let t = await touched(page);
  const copy = t.writes.find((w) => w.id === `${T}__p1`);
  check("gate ON: this device's list is COPIED up once into the first student's account (one create, the same words)", !!copy && copy.data.scope === "p1" && JSON.stringify(copy.data.words) === JSON.stringify([L1]) && t.writes.filter((w) => w.id === `${T}__p1`).length === 1, JSON.stringify(t.writes));
  check("gate ON: the menu says the list is saved in the student's account", await page.evaluate(() => /account/i.test(document.querySelector("#quranWordCardMount [data-bangla-device]")?.textContent ?? "")), await page.evaluate(() => document.querySelector("#quranWordCardMount [data-bangla-device]")?.textContent));
  await page.evaluate((s) => document.querySelector(s)?.click(), MINE); await page.waitForTimeout(300);
  const lemma = await page.evaluate(() => document.querySelector("#quranWordCardMount [data-bangla-marks]")?.dataset.banglaLemma);
  await page.evaluate((s) => document.querySelector(s)?.click(), CHIP); await page.waitForTimeout(700);
  t = await touched(page);
  const last = t.writes.filter((w) => w.id === `${T}__p1`).at(-1);
  check("gate ON: a tap saves the student's own list to their account (the copied word plus the new one)", !!last && last.data.words.includes(L1) && last.data.words.includes(lemma) && t.writes.length >= 2, JSON.stringify(t.writes.map((w) => [w.kind, w.id, w.data.words])));
  const dev = await device(page);
  check("gate ON: the device list is never changed (I4): still exactly what it was", JSON.stringify(dev?.mine) === JSON.stringify([L1]) && JSON.stringify(dev?.admin) === "[]", JSON.stringify(dev));
  // I15: a failed save reaches the reader
  await page.evaluate(() => { window.__stubFailWrites = true; });
  await page.evaluate((s) => document.querySelector(s)?.click(), CHIP); await page.waitForTimeout(900);
  check("gate ON: a failed save REACHES the reader (the red write-failure banner), not the console alone (I15)", await page.evaluate(() => !!document.getElementById("qr-write-failure-banner") && getComputedStyle(document.getElementById("qr-write-failure-banner")).display !== "none"));
  await page.evaluate(() => { window.__stubFailWrites = false; });
  // D10: switching students switches lists
  const opts = await page.evaluate(() => [...document.getElementById("personSelect").options].map((o) => o.value));
  check("POSITIVE CONTROL: the picker offers a second student (p2)", opts.includes("p2"), JSON.stringify(opts));
  const shownWords = () => page.evaluate(() => [...document.querySelectorAll("#quranWordCardMount [data-bangla-word]")].map((e) => e.dataset.banglaWord));
  await page.evaluate(() => { window.__stubHold = ["banglaWords"]; }); // p2's list is slow to arrive: until it does, p1's words must NOT show under p2's name
  await page.evaluate(() => { const s = document.getElementById("personSelect"); s.value = "p2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(600);
  const during = await shownWords();
  check("gate ON: while p2's list is still being read, p1's words are NOT shown under p2's name", !during.includes(L1) && !during.includes(lemma), JSON.stringify(during));
  await page.evaluate(() => window.__stubRelease());
  await page.waitForTimeout(1200);
  const seen = await page.evaluate(() => ({ list: window.__fsLog.filter((r) => /banglaWords/.test(JSON.stringify(r))).map((r) => r.id ?? r.docId ?? ""), set: (window.__bnShown ?? null) }));
  const p2 = await page.evaluate(() => { const rows = [...document.querySelectorAll("#quranWordCardMount [data-bangla-word]")].map((e) => e.dataset.banglaWord); return rows; });
  check("gate ON: switching students switches lists: p2's own list is read, and p1's words are not shown under p2's name", JSON.stringify(seen).includes(`${T}__p2`) && !p2.includes(L1) && (p2.length === 0 || p2.includes(L2)), JSON.stringify({ seen, p2 }));
  check("gate ON: p2's list is the one in force (their word is listed, one get)", p2.includes(L2), JSON.stringify(p2));
  await ctx.close();
}

// ===== THE MONITOR =====
async function monitorWords(on, lang = "en", width = 1100) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, extraSeedJs: seedJs([{ _id: `${T}__p1`, tenantId: T, scope: "p1", words: [L2, L3], kinds: {} }]) });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await gateRoute(ctx, on);
  if (MUTATE === "monitorown") { const [file, a, b] = MUT.monitorown; const src = fs.readFileSync(file, "utf8"); if (src.split(a).length !== 2) throw new Error("monitorown anchor"); await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.replace(a, b) })); }
  const { page } = await openPage(ctx, "/app/monitor.html");
  await page.waitForFunction(() => document.getElementById("vocabLoadBtn") || document.querySelector("[data-vocab-table]"), null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.getElementById("vocabLoadBtn")?.click());
  await page.waitForFunction(() => document.querySelector("[data-vocab-table]"), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);
  const out = await page.evaluate(() => ({ words: Number(document.querySelector('[data-vt-person="p1"]')?.dataset.vtWords ?? "NaN"), note: document.querySelector("[data-vt-note]")?.textContent ?? "", reads: (window.__fsLog || []).filter((r) => /banglaWords/.test(JSON.stringify(r))).length }));
  await ctx.close();
  return out;
}
const off = await monitorWords(false), on = await monitorWords(true);
check("POSITIVE CONTROL: the Monitor's table shows p1's words known (gate OFF)", Number.isFinite(off.words) && off.words >= 0, JSON.stringify(off));
check("gate OFF: the Monitor reads no banglaWords and keeps today's note (the list is on the device)", off.reads === 0 && /leave out/.test(off.note), JSON.stringify(off));
check("gate ON: the Monitor reads each student's own list (one get) and COUNTS it (two more words known than with the gate off)", on.reads >= 1 && on.words >= off.words + 2, JSON.stringify({ off, on }));
check("gate ON: the note under the table says the own-language list is counted", /include/.test(on.note) && !/leave out/.test(on.note), on.note);
await browser.close();
console.log(`\n==== Bangla word lists in the account, in the pages (J143)${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
