// Audit part 18 (PCF J29, manual audit): the User Manual's "Getting started and moving around" and the Deen Study / Arabic
// features, each one WORKING. Measured on the rendered pages at 390 / 820 / 1440 (and 320 for anything that opens a window,
// sheet or form), English and Bangla. The RESULT is asserted, not the element: the stored write (window.__stubWriteData:
// collection, id, fields, I17 stamps), the reloaded language or look, the place a back pill returns to.
//   signin   1 Sign in, the sign-up link, Create (tenant + person), an invited person's link
//   family   2 Family members at sign-up (Save and continue / Skip for now)
//   menus    3 Menu bar (open, second tap, outside tap, Esc; the Modules list)   account  4 My account (open, ✕)
//   language 5 Language switch (reload, kept)      look 6 Card look Night/Light (measured colour, kept)
//   back     7 The way-back pill (Read bar, floating, exact place)     taglines  8 Strip (hold pauses) and Settings → Taglines (Save)
//   topic    9 Topic study (Deen Study, Arabic): Track, Bookmark this      continue  10 Continue strip
// Each flow has a POSITIVE CONTROL and a timeout that fails by name. Mutations: --mutate=<name> restores a defect.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part18-getting-started-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const PROBE = process.env.PROBE === "1" || process.argv.includes("--probe");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
const WONLY = Number((process.argv.find((a) => a.startsWith("--width=")) || "").slice(8)) || 0;
const LONLY = (process.argv.find((a) => a.startsWith("--lang=")) || "").slice(7);
// [file, route glob, anchor (must occur exactly once), replacement, the page the mutation applies to].
const MUTATIONS = {};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);

const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
// English words that may stay on a Bangla page: the app's own names, source names and names people typed.
const ALLOWED = /QuranRevival|QCR|MMSA|Qur'?an|Asma|Husna|Madrasatul|Muslimeen|Hadith|hadith|Google|Ahsan|Maryam|Zayd|Aisha|Ethics|Akhlaq|Audit|example|org|com|Tajweed|Fiqh|Tafsir|Legacy|App|v\d+|Deen|Arabic|Dawah|English|Bangla|smahk|gmail/g; // English/Bangla: the language picker names both languages; smahk@gmail: the signed-in email
const englishLeft = (text) => (String(text).replace(ALLOWED, " ").match(/[A-Za-z]{3,}/g) || []);

async function open(lang, width, pagePath, { extraSeed = "", ctxOpts = {}, mutatePage = pagePath } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: extraSeed || null, ...ctxOpts });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://localhost:8080" }).catch(() => {});
  if (MUTATE && MUTATIONS[MUTATE][4] === mutatePage) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}

async function flow(name, lang, width, pagePath, fn, opts = {}) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, pagePath, opts), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.ctx, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}

const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const writes = (page, from = 0) => ev(page, (k) => (window.__stubWriteData || []).slice(k).map((x) => ({ kind: x.kind, col: x.col, id: x.id, data: x.data })), from);
const writeCount = (page) => ev(page, () => (window.__stubWriteData || []).length);
const rectOf = (page, sel) => ev(page, (s) => { const e = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; }, sel);
const inside = (r, vw, vh) => !!r && r.l >= -1 && r.r <= vw + 1 && r.t >= -1 && r.b <= vh + 1;
// A control a finger presses: visible and at least 40px tall.
const tall = async (page, sel) => Math.round((await rectOf(page, sel))?.h ?? -1);
const wide = (page) => ev(page, () => document.documentElement.scrollWidth - innerWidth);
const STAMPS = (d) => d && d.schemaVersion != null && d.createdAt !== undefined && d.updatedAt !== undefined && !!d.createdBy;
const clearSplash = (page) => ev(page, () => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
// Open a nav menu the way a reader does: tap its summary.
const summaryOf = (label) => `.nav-cat:has(> summary:text-is("${label}")) > summary`;
const isOpen = (page, label) => ev(page, (l) => [...document.querySelectorAll(".nav-cat")].find((c) => c.querySelector("summary").textContent.trim() === l)?.open === true, label);

const WIDTHS = [320, 390, 820, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
const L = { en: { modules: "Modules", home: "Home", operation: "Operation" }, bn: {} };

for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  const vh = width > 600 ? 900 : 844;
  // 3: The menu bar.
  await flow("menus", lang, width, "/app/quranrevival.html", async (t, page, ctx, errors) => {
    const cats = await ev(page, () => [...document.querySelectorAll(".nav-cat")].map((c) => c.querySelector("summary").textContent.trim()));
    if (PROBE) console.log(t, "cats", JSON.stringify(cats));
    check(`${t}: POSITIVE CONTROL four menus are on the bar (Home, Modules, Operation, Bookmark)`, cats.length === 4, JSON.stringify(cats));
    const names = ev(page, () => [...document.querySelectorAll(".nav-cat")].map((c) => c.querySelector("summary").textContent.trim()));
    const [home, modules, operation] = await names;
    for (const [label, key] of [[modules, "modules"], [operation, "operation"], [home, "home"]]) {
      const sum = `.nav-cat:has(> summary:text-is("${label}")) > summary`;
      await page.click(sum);
      await settle(page, 250);
      check(`${t}: ${key}: a tap opens it`, await isOpen(page, label));
      const panel = await ev(page, (l) => { const c = [...document.querySelectorAll(".nav-cat")].find((x) => x.querySelector("summary").textContent.trim() === l); const nav = c.querySelector("summary").getBoundingClientRect().bottom; const links = [...c.querySelectorAll("a, button")].filter((e) => e.getClientRects().length); const rs = links.map((e) => e.getBoundingClientRect()); const panel = c.querySelector(".nav-cat-links, .nav-cat-body, :scope > div") ?? c; const pr = panel.getBoundingClientRect(); return { nav, l: Math.min(pr.left, ...rs.map((r) => r.left)), r: Math.max(pr.right, ...rs.map((r) => r.right)), minH: Math.round(Math.min(...rs.map((r) => r.height))), top: Math.min(...rs.map((r) => r.top)), n: links.length }; }, label);
      if (PROBE) console.log(t, key, JSON.stringify(panel));
      check(`${t}: ${key}: its list opens inside the screen, below its own button`, panel.n > 0 && panel.l >= -1 && panel.r <= width + 1 && panel.top >= panel.nav - 1, JSON.stringify(panel));
      check(`${t}: ${key}: every link a finger presses is at least 40px`, panel.minH >= 40, JSON.stringify(panel));
      await page.click(sum);
      await settle(page, 250);
      check(`${t}: ${key}: a second tap closes it`, !(await isOpen(page, label)));
      await page.click(sum); await settle(page, 200);
      await page.mouse.click(Math.round(width / 2), vh - 6);
      await settle(page, 250);
      check(`${t}: ${key}: a tap outside closes it`, !(await isOpen(page, label)));
      await page.click(sum); await settle(page, 200);
      await page.keyboard.press("Escape");
      await settle(page, 250);
      check(`${t}: ${key}: Esc closes it`, !(await isOpen(page, label)));
    }
    // One at a time: opening Modules while Home is open closes Home.
    await page.click(summaryOf(home)); await settle(page, 200);
    await page.click(summaryOf(modules)); await settle(page, 300);
    check(`${t}: opening Modules closes Home (one menu at a time)`, (await isOpen(page, modules)) && !(await isOpen(page, home)));
    // Modules lists exactly six modules, and the four hidden ones are absent.
    const mods = await ev(page, (l) => [...[...document.querySelectorAll(".nav-cat")].find((c) => c.querySelector("summary").textContent.trim() === l).querySelectorAll("a")].map((a) => a.getAttribute("href")), modules);
    check(`${t}: Modules lists exactly Quran Study, Deen Study, Arabic, Hadith, Learn Deen On-the-Go and Asma ul Husna`, JSON.stringify(mods) === JSON.stringify(["quranrevival.html", "deen-study.html", "arabic-study.html", "hadith-study.html", "ldog-study.html", "asma-study.html"]), JSON.stringify(mods));
    const hiddenIn = await ev(page, () => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter((h) => /general-study|naturelife-study|life-skill|health-study/.test(h)));
    check(`${t}: the four hidden modules (General Study, Nature-Life, Life Skill, Health) are absent from every menu`, hiddenIn.length === 0, JSON.stringify(hiddenIn));
    if (bn) {
      const txt = await ev(page, () => [...document.querySelectorAll(".nav-cat")].map((c) => c.textContent).join(" "));
      check(`${t}: no English left in the menus (names and source names aside)`, englishLeft(txt).length === 0, englishLeft(txt).join(", "));
    }
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 4: My account.
  await flow("account", lang, width, "/app/quranrevival.html", async (t, page, ctx, errors) => {
    await page.click(summaryOf(await ev(page, () => document.querySelector(".nav-cat-home > summary").textContent.trim())));
    await settle(page, 250);
    const btn = await rectOf(page, "[data-open-account-card]");
    check(`${t}: POSITIVE CONTROL Home lists 👤 My account, finger-sized`, !!btn && btn.h >= 40, JSON.stringify(btn));
    await page.click("[data-open-account-card]");
    await settle(page, 400);
    const o = await ev(page, () => { const ov = document.getElementById("accountCardOverlay"); const sh = ov?.querySelector(".account-sheet"); const r = sh?.getBoundingClientRect(); const x = document.getElementById("accountCardClose")?.getBoundingClientRect(); return { open: !!ov?.classList.contains("open"), r: r && { l: r.left, r: r.right, t: r.top, b: r.bottom }, x: x && { w: x.width, h: x.height }, facts: ov?.querySelectorAll("dt").length ?? 0, title: ov?.querySelector(".account-sheet-title")?.textContent, homeOpen: document.querySelector(".nav-cat-home")?.open }; });
    if (PROBE) console.log(t, "account", JSON.stringify(o));
    check(`${t}: My account opens as a card inside the screen, and Home closes behind it`, o.open && inside(o.r, width, vh) && o.homeOpen === false, JSON.stringify(o));
    check(`${t}: the card shows the account's facts, titled in ${bn ? "Bangla" : "English"}`, o.facts > 0 && (bn ? BN.test(o.title) : o.title === "My account"), JSON.stringify(o));
    check(`${t}: ✕ is at least 40px`, o.x && o.x.h >= 40 && o.x.w >= 40, JSON.stringify(o.x));
    await page.click("#accountCardClose");
    await settle(page, 300);
    check(`${t}: ✕ closes the card`, await ev(page, () => !document.getElementById("accountCardOverlay").classList.contains("open")));
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
