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

  // 5: Language: Home -> Settings -> Language switches English <-> Bangla; the page reloads and the choice is kept.
  // The Qur'an page re-renders IN PLACE (issue #272, deliberate: no reload); every other page reloads. Both are measured.
  for (const [fname, pagePath, reloads] of [["language", "/app/quranrevival.html", false], ["languagereload", "/app/deen-study.html", true]]) await flow(fname, lang, width, pagePath, async (t, page, ctx, errors) => {
    const target = bn ? "en" : "bn";
    const homeLabel = await ev(page, () => document.querySelector(".nav-cat-home > summary").textContent.trim());
    await page.click(summaryOf(homeLabel)); await settle(page, 250);
    const sel = await rectOf(page, "#navAppLangSelect");
    check(`${t}: POSITIVE CONTROL Home → Settings shows the Language picker (finger-sized), set to ${lang}`, !!sel && sel.h >= 40 && (await ev(page, () => document.getElementById("navAppLangSelect").value)) === lang, JSON.stringify(sel));
    await ev(page, () => { window.__noReload = "kept"; });
    if (reloads) await Promise.all([page.waitForNavigation({ waitUntil: "load", timeout: 15000 }), page.selectOption("#navAppLangSelect", target)]);
    else await page.selectOption("#navAppLangSelect", target);
    await settle(page, 1500);
    const after = await ev(page, () => ({ marker: window.__noReload ?? null, stored: localStorage.getItem("mm_app_lang"), nav: document.querySelector(".nav-cat-home > summary").textContent.trim() }));
    check(`${t}: choosing ${target} ${reloads ? "reloads the page (its marker is gone)" : "re-renders in place (no reload, the marker stays)"}`, reloads ? after.marker === null : after.marker === "kept", JSON.stringify(after));
    check(`${t}: the choice is stored on the device (mm_app_lang = ${target})`, after.stored === target, JSON.stringify(after));
    check(`${t}: the page now reads in ${target === "bn" ? "Bangla" : "English"}`, target === "bn" ? BN.test(after.nav) : after.nav === "Home", JSON.stringify(after));
    await page.reload({ waitUntil: "networkidle" }); await settle(page, 1000);
    const kept = await ev(page, () => ({ stored: localStorage.getItem("mm_app_lang"), nav: document.querySelector(".nav-cat-home > summary").textContent.trim() }));
    check(`${t}: after another reload the choice is kept`, kept.stored === target && (target === "bn" ? BN.test(kept.nav) : kept.nav === "Home"), JSON.stringify(kept));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 6: Card look: Night or Light changes the cards' colours and is kept after a reload.
  await flow("look", lang, width, "/app/quranrevival.html", async (t, page, ctx, errors) => {
    const homeLabel = await ev(page, () => document.querySelector(".nav-cat-home > summary").textContent.trim());
    const cardPaint = async () => {
      await page.click(summaryOf(homeLabel)); await settle(page, 200);
      await page.click("[data-open-account-card]"); await settle(page, 300);
      const p = await ev(page, () => { const s = getComputedStyle(document.querySelector(".account-sheet")); return { bg: s.backgroundColor + "|" + s.backgroundImage, text: s.color, look: document.documentElement.getAttribute("data-card-look") }; });
      await page.click("#accountCardClose"); await settle(page, 200);
      return p;
    };
    const setLook = async (id) => { await page.click(summaryOf(homeLabel)); await settle(page, 200); const b = await rectOf(page, `[data-card-look-btn="${id}"]`); await page.click(`[data-card-look-btn="${id}"]`); await settle(page, 300); await page.keyboard.press("Escape"); return b; };
    const night = await cardPaint();
    check(`${t}: POSITIVE CONTROL the default look is Night and the card is painted`, night.look === "night" && night.bg.length > 6, JSON.stringify(night));
    const btn = await setLook("light");
    check(`${t}: the Night and Light buttons are finger-sized`, !!btn && btn.h >= 40, JSON.stringify(btn));
    const light = await cardPaint();
    check(`${t}: Light changes the card's colours (background and text measured)`, light.look === "light" && light.bg !== night.bg && light.text !== night.text, JSON.stringify({ night, light }));
    check(`${t}: Light is stored on the device`, (await ev(page, () => localStorage.getItem("mm_card_look"))) === "light");
    await page.reload({ waitUntil: "networkidle" }); await settle(page, 1000); await clearSplash(page);
    const kept = await cardPaint();
    check(`${t}: after a reload the Light look is kept, same colours`, kept.look === "light" && kept.bg === light.bg && kept.text === light.text, JSON.stringify(kept));
    await setLook("night");
    const back = await cardPaint();
    check(`${t}: Night brings the first colours back`, back.look === "night" && back.bg === night.bg && back.text === night.text, JSON.stringify(back));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 7: The way back: the pill appears after a jump (QCR → an āyah), sits on the Read bar beside ✓ (floats elsewhere), returns to the exact place.
  await flow("back", lang, width, "/app/quranrevival.html", async (t, page, ctx, errors) => {
    await page.click("#tabExploreBtn");
    await page.waitForFunction(() => !!document.querySelector("#exploreWheelContainer svg"), null, { timeout: 15000 });
    await ev(page, () => document.getElementById("explorePaletteQcrBtn").click());
    await page.waitForFunction(() => document.querySelectorAll("#qcrWheelContainer .wheel-seg").length > 0, null, { timeout: 10000 });
    const opts = await ev(page, () => [...document.querySelectorAll("#qcrLevelSelect option")].map((o) => o.value));
    let col = null;
    for (const id of opts) { await page.selectOption("#qcrLevelSelect", id); await settle(page, 300); if (await ev(page, () => document.querySelectorAll("#qcrWaysListContainer [data-qcr-jump]").length)) { col = id; break; } }
    check(`${t}: POSITIVE CONTROL a QCR collection with āyāt is open (${col})`, !!col);
    const rowsBefore = await ev(page, () => document.querySelectorAll("#qcrWaysListContainer [data-qcr-jump]").length);
    check(`${t}: no pill before any jump`, await ev(page, () => { const p = document.getElementById("ayahCardBackPill"); return !p || p.hidden; }));
    await ev(page, () => document.querySelector("#qcrWaysListContainer [data-qcr-jump]").click());
    await page.waitForFunction(() => !document.getElementById("readView").hidden, null, { timeout: 10000 });
    await settle(page, 1200);
    const PILL = "#ayahCardBackPill [data-ayah-card-back]";
    const inRead = await ev(page, () => { const p = document.getElementById("ayahCardBackPill"); const b = p?.querySelector("[data-ayah-card-back]"); const r = b?.getBoundingClientRect(); const slot = document.getElementById("readBackSlot"); const tick = document.getElementById("readCompleteBtn")?.getBoundingClientRect(); return { shown: !!r && r.width > 0, text: b?.innerText.replace(/\s+/g, " ") ?? "", docked: p?.parentElement === slot, h: r?.height ?? 0, l: r?.left ?? 0, rt: r?.right ?? 0, cy: r ? (r.top + r.bottom) / 2 : 0, tick: tick && tick.width > 0 ? { l: tick.left, cy: (tick.top + tick.bottom) / 2 } : null, bar: slot?.parentElement.getBoundingClientRect().height > 0 }; });
    if (PROBE) console.log(t, "pill in read", JSON.stringify(inRead));
    check(`${t}: after the jump the pill reads "Back to QCR" (${bn ? "Bangla" : "English"}), is finger-sized and on screen`, inRead.shown && inRead.h >= 40 && /QCR/.test(inRead.text) && (bn ? BN.test(inRead.text) : /^← Back to QCR/.test(inRead.text)) && inside(await rectOf(page, PILL), width, vh), JSON.stringify(inRead));
    check(`${t}: in the Read view it sits in the Read bar's own slot${inRead.tick ? ", on the same row as ✓ and before it" : " (✓ is under ⋯ at this width)"}`, inRead.docked && inRead.bar && (!inRead.tick || (Math.abs(inRead.cy - inRead.tick.cy) <= 24 && inRead.rt <= inRead.tick.l + 1)), JSON.stringify(inRead));
    await page.click("#tabExploreBtn"); await settle(page, 1200);
    const floating = await ev(page, () => { const p = document.getElementById("ayahCardBackPill"); const r = p.getBoundingClientRect(); return { hidden: p.hidden, body: p.parentElement === document.body, pos: getComputedStyle(p).position, b: r.bottom, t: r.top, l: r.left, r: r.right, vh: innerHeight, vw: innerWidth }; });
    if (PROBE) console.log(t, "pill floating", JSON.stringify(floating));
    check(`${t}: away from the Read view the pill floats near the bottom, on screen`, !floating.hidden && floating.body && floating.pos === "fixed" && floating.b <= floating.vh + 1 && floating.t > floating.vh * 0.5 && floating.l >= -1 && floating.r <= floating.vw + 1, JSON.stringify(floating));
    await page.click(PILL); await settle(page, 1500);
    const back = await ev(page, () => ({ qcr: !document.getElementById("qcrPanel").hidden, cur: document.getElementById("qcrLevelSelect").value, rows: document.querySelectorAll("#qcrWaysListContainer [data-qcr-jump]").length, pill: !document.getElementById("ayahCardBackPill") || document.getElementById("ayahCardBackPill").hidden }));
    check(`${t}: the pill returns to the exact place (the same QCR collection, ${rowsBefore} rows) and goes away`, back.qcr && back.cur === col && back.rows === rowsBefore && back.pill, JSON.stringify(back));
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
