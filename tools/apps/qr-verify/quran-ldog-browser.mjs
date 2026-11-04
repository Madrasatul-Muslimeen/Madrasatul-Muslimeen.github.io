// QR J02 S1: Quran Study (app/quranrevival.html) and LDOG (app/ldog-study.html), copied from MMSA unchanged, run on
// QR's own server, signed in through MMSA's own test harness (tools/i18n-verify/harness.mjs and firebase-stub.mjs,
// copied byte-identical: Firebase is faked at the network layer, so the pages' real code runs).
// At 390 and 1400: each page loads with no page errors; the Quran wheel; the Read view of Al-Fatiha; an Āyah card;
// the LDOG routine list, and (QR J05) LDOG's ← Back from a Continue chip. Console errors are listed (not failed): QR does not have every page MMSA's pages link to.
//
//   node tools/apps/qr-verify/quran-ldog-browser.mjs     (serves itself on PORT, default 8097)
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import { spawn } from "node:child_process";
import { routeMmsaHadith } from "./mmsa-hadith-route.mjs";

const PORT = Number(process.env.PORT) || 8097;
let server = null;
const { chromium, newContext, openPage } = await import("../../i18n-verify/harness.mjs");

// QR J02 S1b: the pages Quran Study itself opens, copied unchanged.
const S1B = ["journey-map.html"]; // J02 S1e: the other S1b pages live in MMSA now (PCA J71)
let pass = 0, fail = 0;
const check = (ok, what) => {
  if (ok instanceof Promise) throw new Error(`check() was handed a promise: ${what}`);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
};
const consoleNotes = new Map();
const browser = await chromium.launch();
try {
  for (const width of [390, 1400]) {
    for (const [name, fn] of [["quran", quran], ["ldog", ldog], ...S1B.map((p) => [p, () => plainPage(p, width)])]) {
      try { await fn(width); } catch (err) { check(false, `${name} @${width} stopped early: ${String(err.message).split("\n")[0]}`); }
    }
  }
} finally {
  await browser.close();
  server?.kill();
}
if (consoleNotes.size) console.log(`\nConsole errors and failed requests seen (listed, not failed):\n${[...consoleNotes].map(([k, n]) => `  ${n}x ${k}`).join("\n")}`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

function track(page) {
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) { const k = m.text().slice(0, 140); consoleNotes.set(k, (consoleNotes.get(k) ?? 0) + 1); } });
  page.on("response", (r) => { if (r.status() >= 400) { const k = `HTTP ${r.status()} ${r.url().replace(process.env.QR_BASE, "")}`; consoleNotes.set(k, (consoleNotes.get(k) ?? 0) + 1); } });
  return pageErrors;
}

async function quran(width) {
  const tag = `quranrevival.html @${width}`;
  const ctx = await newContext(browser, { viewport: { width, height: width < 600 ? 844 : 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await routeMmsaHadith(ctx);
  const page = await ctx.newPage();
  const pageErrors = track(page);
  await page.goto(`${process.env.QR_BASE}/app/quranrevival.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  // UPDATED IN PLACE (J108, v13.01): the badge shows the release date too ("v13.01-31.10.26").
  check(/^v\d+\.\d+(?:-\d\d\.\d\d\.\d\d)?$/.test(await page.locator("#appVersion").innerText().catch(() => "")), `${tag} the page's code runs (version ${await page.locator("#appVersion").innerText().catch(() => "?")})`);
  const signedIn = await page.evaluate(() => !/Checking sign-in/.test(document.getElementById("who")?.textContent ?? ""));
  check(signedIn, `${tag} signed in (faked)`);
  await page.waitForSelector("#wheelSection svg.mastery-wheel .wheel-seg, #wheelSection svg .wheel-seg", { timeout: 15000 }).catch(() => {});
  const segs = await page.locator("#wheelSection .wheel-seg").count();
  check(segs > 0, `${tag} the wheel draws (${segs} slices)`);
  await page.evaluate(() => document.getElementById("tabReadBtn").click());
  await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 15000 }).catch(() => {});
  const read = await page.evaluate(() => ({ sel: ["readSurahSelect", "readAyahSelect"].map((i) => document.getElementById(i)?.value).join(":"), text: document.getElementById("ayahPanels")?.textContent ?? "" }));
  check(read.sel === "1:2" && /بِسْمِ|ٱللَّهِ|الحمد|ٱلْحَمْدُ/.test(read.text), `${tag} the Read view shows Al-Fatiha (${read.sel})`);
  // The Āyah card, the way MMSA's audit part 12 opens it: āyah 36:38, then its number badge.
  await page.evaluate(() => { const el = document.getElementById("surahSelect"); el.value = "36"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForFunction(() => document.querySelector('#readView [data-ayah-num-badge^="36:"]') || document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:36:"]'), null, { timeout: 15000 }).catch(() => {});
  // Surah 36's āyah list fills a moment after the surah changes: choose 38 once it is there.
  await page.waitForFunction(() => !!document.querySelector('#ayahSelect option[value="38"]'), null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "38"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForSelector('[data-ayah-num-badge="36:38"]', { state: "attached", timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);
  for (let i = 0; i < 3 && !(await page.evaluate(() => !!document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"))); i++) {
    await page.evaluate(() => document.querySelector('[data-ayah-num-badge="36:38"]')?.click());
    await page.waitForTimeout(1500);
  }
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 10000 }).catch(() => {});
  const card = await page.evaluate(() => ({ open: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), unit: document.querySelector("[data-ayah-sheet]")?.dataset.unitKey, badge: !!document.querySelector('[data-ayah-num-badge="36:38"]'), surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value, badges: document.querySelectorAll("[data-ayah-num-badge]").length }));
  check(card.open && card.unit === "ayah:36:38", `${tag} the Āyah card opens (${JSON.stringify(card)})`);
  // S1c: its "Related hadith" rows name the book (36:38 is quoted by Bukhari and Muslim), never a raw library id.
  await page.waitForFunction(() => document.querySelector("[data-ayah-hadith-open]") || document.querySelector("[data-ayah-hadith-none]"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => [...document.querySelectorAll("[data-ayah-hadith-open]")].some((b) => /Bukhari|Muslim/.test(b.textContent)), null, { timeout: 15000 }).catch(() => {});
  const rows = await page.evaluate(() => [...document.querySelectorAll("[data-ayah-hadith-open]")].map((b) => b.textContent.replace(/\s+/g, " ").trim()));
  const rawId = rows.filter((t) => /\d{4}[A-Za-z]+\.[A-Za-z]+\.[A-Za-z0-9]+-ara\d/.test(t));
  check(rows.length >= 3 && /Muslim 159\b/.test(rows.join("|")) && /Bukhari 3199/.test(rows.join("|")) && rawId.length === 0,
    `${tag} the Āyah card's related hadith name their books (${rows.length} rows: "${rows[0] ?? ""}"${rawId.length ? `; raw ids: ${rawId.length}` : ""})`);
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check(sw <= cw, `${tag} no sideways scroll (${sw} <= ${cw})`);
  check(pageErrors.length === 0, `${tag} no page errors${pageErrors.length ? ": " + pageErrors.join(" | ") : ""}`);
  await ctx.close();
}

async function ldog(width) {
  const tag = `ldog-study.html @${width}`;
  // MMSA's stub seeds no LDOG subjects; these two follow catalogue-data.js's own LDOG rows (root + first child).
  const extraSeedJs = `
DATA.subjects.push(
  { _id: TENANT_ID + "__ldog", tenantId: TENANT_ID, subjectId: "ldog", parentId: null, name: lang("Learn Deen On-the-Go"), moduleIds: ["ldog"], ancestorIds: [], status: "active", order: 9 },
  { _id: TENANT_ID + "__daily_deen_habit", tenantId: TENANT_ID, subjectId: "daily_deen_habit", parentId: "ldog", name: lang("Daily Deen Learning Habit for Life"), moduleIds: ["ldog"], ancestorIds: ["ldog"], status: "active", order: 1, isTrackable: true }
);`;
  const ctx = await newContext(browser, { viewport: { width, height: width < 600 ? 844 : 900 }, extraSeedJs });
  const page = await ctx.newPage();
  const pageErrors = track(page);
  await page.goto(`${process.env.QR_BASE}/app/ldog-study.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => getComputedStyle(document.getElementById("app")).display !== "none", null, { timeout: 15000 }).catch(() => {});
  check(await page.evaluate(() => getComputedStyle(document.getElementById("app")).display !== "none"), `${tag} the signed-in app shows (faked sign-in)`);
  await page.waitForFunction(() => (document.getElementById("listContainer")?.textContent.trim().length ?? 0) > 20, null, { timeout: 15000 }).catch(() => {});
  const list = await page.evaluate(() => ({ text: document.getElementById("listContainer")?.textContent.trim() ?? "", items: document.querySelectorAll("#listContainer button, #listContainer a, #listContainer [data-key], #listContainer li").length }));
  check(list.text.length > 20 && list.items > 0, `${tag} the routine list shows (${list.items} items: "${list.text.slice(0, 60)}…")`);
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check(sw <= cw, `${tag} no sideways scroll (${sw} <= ${cw})`);
  check(pageErrors.length === 0, `${tag} no page errors${pageErrors.length ? ": " + pageErrors.join(" | ") : ""}`);
  // QR J05: the way-back law. Opened from the menu (no back=1): no ← Back. Opened by a Continue chip (back=1): ← Back.
  check(await page.locator(".bm-back-row").count() === 0, `${tag} no ← Back when opened from the menu`);
  await page.goto(`${process.env.QR_BASE}/app/ldog-study.html?resume=daily_deen_habit&back=1`, { waitUntil: "networkidle", referer: `${process.env.QR_BASE}/app/index.html` });
  await page.waitForSelector(".bm-back-row", { timeout: 15000 }).catch(() => {});
  const back = await page.evaluate(() => [...document.querySelectorAll(".bm-back-row")].map((r) => ({ text: r.textContent.trim(), href: r.querySelector("a")?.getAttribute("href") ?? "", w: r.getBoundingClientRect().width })));
  check(back.length === 1 && back[0].text.startsWith("←") && back[0].w > 0, `${tag} a Continue chip (back=1) gives one ← Back (${JSON.stringify(back)})`);
  check(back[0]?.href.endsWith("/app/index.html"), `${tag} ← Back goes to the page the chip was on`);
  await ctx.close();
}

/** One of the S1b pages: it loads signed in (faked), its own code runs, no page errors, no sideways scroll. */
async function plainPage(p, width) {
  const tag = `${p} @${width}`;
  const ctx = await newContext(browser, { viewport: { width, height: width < 600 ? 844 : 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await routeMmsaHadith(ctx);
  const page = await ctx.newPage();
  const pageErrors = track(page);
  const res = await page.goto(`${process.env.QR_BASE}/app/${p}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  check(res && res.ok(), `${tag} loads (${res && res.status()})`);
  const r = await page.evaluate(() => ({
    title: document.title.trim(),
    checking: /Checking sign-in/.test(document.getElementById("who")?.textContent ?? ""),
    text: document.body.innerText.trim().length,
    sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
  }));
  check(r.title.length > 0 && r.text > 20 && !r.checking, `${tag} its code runs, past "Checking sign-in" ("${r.title}")`);
  check(r.sw <= r.cw, `${tag} no sideways scroll (${r.sw} <= ${r.cw})`);
  check(pageErrors.length === 0, `${tag} no page errors${pageErrors.length ? ": " + pageErrors.join(" | ") : ""}`);
  await ctx.close();
}
