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
const ALLOWED = /https?:\/\/\S+|QuranRevival|QCR|MMSA|Qur'?an|Asma|Husna|Madrasatul|Muslimeen|Hadith|hadith|Google|Ahsan|Maryam|Zayd|Aisha|Ethics|Akhlaq|Audit|example|org|com|Tajweed|Fiqh|Tafsir|Legacy|App|v\d+|Deen|Arabic|Dawah|English|Bangla|smahk|gmail/g; // English/Bangla: the language picker names both languages; smahk@gmail: the signed-in email
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
// The seeded tenant has Deen Study topics but no "Studied" Approach, no resource and no Arabic tree; give each module one trackable
// topic with a resource, and one saved "where was I" for the Continue line.
const topicSeed = ({ root, topicId, trackable, mod, en, bn }) => `
DATA.trackables.push({ _id: TENANT_ID + "__${trackable}", tenantId: TENANT_ID, subjectId: "${root}", order: 0, status: "active", name: lang("Studied", "অধ্যয়ন করা হয়েছে"), groupName: lang("Understanding", "অনুধাবন"), guide: { what: lang("What it is", "এটি কী"), how: lang("How to do it", "কীভাবে করবেন"), measure: lang("How to measure", "কীভাবে মাপবেন") }, panels: ["text"] });
if (!DATA.subjects.some((s) => s._id === TENANT_ID + "__${topicId}")) {
  if (!DATA.subjects.some((s) => s._id === TENANT_ID + "__${root}")) DATA.subjects.push({ _id: TENANT_ID + "__${root}", tenantId: TENANT_ID, subjectId: "${root}", parentId: null, name: lang("${root}"), moduleIds: ["${mod}"], ancestorIds: [], status: "active", order: 1 });
  DATA.subjects.push({ _id: TENANT_ID + "__${topicId}", tenantId: TENANT_ID, subjectId: "${topicId}", parentId: "${root}", name: lang("${en}", "${bn}"), gloss: lang("A topic"), moduleIds: ["${mod}"], ancestorIds: ["${root}"], status: "active", order: 1, isTrackable: true });
}
DATA.subjects.find((s) => s._id === TENANT_ID + "__${topicId}").resourceIds = ["r1"];
DATA.bookmarks[0].resume = { "${mod}::none::${topicId}": { position: "${topicId}", updatedAt: "2026-10-01T00:00:00.000Z" } };`;
const TOPIC_MODULES = [
  { id: "deen", root: "deen_study", page: "/app/deen-study.html", topicId: "deen_ethics", topicEn: "Ethics", topicBn: "নৈতিকতা", trackable: "studied_deen", seed: topicSeed({ root: "deen_study", topicId: "deen_ethics", trackable: "studied_deen", mod: "deen", en: "Ethics", bn: "নৈতিকতা" }) },
  { id: "arabic", root: "arabic_language", page: "/app/arabic-study.html", topicId: "arabic_nahw", topicEn: "Nahw", topicBn: "নাহু", trackable: "studied_arabic", seed: topicSeed({ root: "arabic_language", topicId: "arabic_nahw", trackable: "studied_arabic", mod: "arabic", en: "Nahw", bn: "নাহু" }) },
];

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

  // 8a: The tagline strip: holding a finger on it pauses a scrolling line; letting go resumes it.
  const LONG = ("Have you ever weighed a gold bar (12.4 kg) in your hand? It is heavier than you would think, and the weight of a single line of revelation is heavier still, so read it slowly. ").repeat(4).trim(); // long enough to overflow the strip even at 1440px
  const LONG_BN = ("আপনি কি কখনো হাতে একটি সোনার বার (১২.৪ কেজি) ওজন করে দেখেছেন? ভাবনার চেয়ে এটি অনেক ভারী, আর ওহির একটি লাইনের ওজন তার চেয়েও ভারী, তাই ধীরে ধীরে পড়ুন। এক একটি শব্দ থেমে থেমে পড়ুন এবং তার অর্থ নিয়ে ভাবুন, তাহলেই হৃদয়ে তার প্রভাব পড়বে। ").repeat(4).trim();
  await flow("taglinehold", lang, width, "/app/quranrevival.html", async (t, page, ctx, errors) => {
    const tx = () => ev(page, () => { const tr = document.querySelector("#taglineStrip .tagline-line:not(.tagline-leaving) .tagline-track"); return tr ? Math.round(new DOMMatrix(getComputedStyle(tr).transform).m41) : null; });
    await page.waitForFunction(() => !!document.querySelector("#taglineStrip .tagline-scrolling .tagline-track"), null, { timeout: 15000 });
    await page.waitForFunction(() => { const tr = document.querySelector("#taglineStrip .tagline-line:not(.tagline-leaving) .tagline-track"); return tr && new DOMMatrix(getComputedStyle(tr).transform).m41 < -3; }, null, { timeout: 15000 }).catch(() => {});
    const a = await tx(); await settle(page, 900); const b = await tx();
    check(`${t}: POSITIVE CONTROL the long line scrolls by itself (${a} → ${b})`, a !== null && b !== null && b < a, JSON.stringify([a, b]));
    const strip = await rectOf(page, "#taglineStrip");
    // A held finger: pointerdown on the strip (what a touch becomes), nothing else changes.
    await ev(page, () => document.getElementById("taglineStrip").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" })));
    await settle(page, 150);
    const h1 = await tx(); await settle(page, 1000); const h2 = await tx();
    check(`${t}: holding a finger on the strip pauses it (${h1} → ${h2})`, h1 === h2, JSON.stringify([h1, h2]));
    await ev(page, () => document.getElementById("taglineStrip").dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" })));
    await settle(page, 200); const r1 = await tx(); await settle(page, 900); const r2 = await tx();
    check(`${t}: letting go resumes it (${r1} → ${r2})`, r2 !== null && r1 !== null && r2 < r1, JSON.stringify([r1, r2]));
    check(`${t}: the strip sits inside the screen`, !!strip && strip.l >= -1 && strip.r <= width + 1, JSON.stringify(strip));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { ctxOpts: { taglines: { lines: [{ id: "long", text: { en: LONG, bn: LONG_BN }, link: null, order: 10, status: "active", holdDays: 7, ayahRef: null }], settings: { motion: "fade", changeAfterSeconds: 2, pauseOnHold: true, scroll: true, scrollSpeed: 10 } } } });

  // 8b: Settings → Taglines (owner/prime): add a line, movement, Scroll long lines, Scroll speed, Save writes them.
  await flow("taglinesettings", lang, width, "/app/taglines.html", async (t, page, ctx, errors) => {
    await page.waitForSelector("#addBtn", { state: "visible", timeout: 10000 });
    await settle(page, 600);
    const rows0 = await ev(page, () => document.querySelectorAll("#lineRows tr").length);
    check(`${t}: POSITIVE CONTROL the lines table and the Save button are on screen, Save disabled until a change`, rows0 > 0 && (await ev(page, () => document.getElementById("saveBtn").disabled)), `rows ${rows0}`);
    const h = { add: await tall(page, "#addBtn"), save: await tall(page, "#saveBtn"), motion: await tall(page, "#motionSelect"), text: await tall(page, "#newText") };
    check(`${t}: Add line, Save and the fields are at least 40px`, Object.values(h).every((v) => v >= 40), JSON.stringify(h));
    const NEW = bn ? "নতুন লাইন অডিট" : "Audit new line";
    await page.fill("#newText", NEW);
    await page.click("#addBtn"); await settle(page, 300);
    check(`${t}: Add line puts the line in the table and enables Save`, (await ev(page, () => document.querySelectorAll("#lineRows tr").length)) === rows0 + 1 && !(await ev(page, () => document.getElementById("saveBtn").disabled)));
    const motions = await ev(page, () => [...document.querySelectorAll("#motionSelect option")].map((o) => o.value));
    const motion = motions.find((m) => m !== "fade") ?? motions[0];
    await page.selectOption("#motionSelect", motion);
    await page.uncheck("#scrollToggle"); await settle(page, 150);
    check(`${t}: switching Scroll long lines off disables Scroll speed`, await ev(page, () => document.getElementById("scrollSpeedInput").disabled));
    await page.check("#scrollToggle"); await settle(page, 150);
    await ev(page, () => { const s = document.getElementById("scrollSpeedInput"); s.value = "8"; s.dispatchEvent(new Event("input", { bubbles: true })); });
    const w0 = await writeCount(page);
    await page.click("#saveBtn");
    await page.waitForFunction(() => /\S/.test(document.getElementById("saveState").textContent) && document.getElementById("saveState").textContent !== "Not saved yet." , null, { timeout: 8000 }).catch(() => {});
    await settle(page, 400);
    const ws = await writes(page, w0);
    const tw = ws.find((x) => x.col === "tenants");
    if (PROBE) console.log(t, "writes", JSON.stringify(ws).slice(0, 600));
    check(`${t}: Save writes the tenant document with the new line, the movement, Scroll long lines and speed 8`, !!tw && (tw.data.taglines ?? []).some((l) => Object.values(l.text ?? {}).includes(NEW)) && tw.data.taglineSettings?.motion === motion && tw.data.taglineSettings?.scroll === true && tw.data.taglineSettings?.scrollSpeed === 8, JSON.stringify(tw)?.slice(0, 500));
    check(`${t}: and carries updatedAt`, !!tw && tw.data.updatedAt !== undefined, JSON.stringify(tw)?.slice(0, 200));
    const said = await ev(page, () => document.getElementById("saveState").textContent);
    check(`${t}: the page says it saved (${bn ? "Bangla" : "English"}) and Save is disabled again`, (bn ? BN.test(said) : /^Saved\./.test(said)) && (await ev(page, () => document.getElementById("saveBtn").disabled)), said);
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 9 + 10: Topic study (Deen Study, Arabic): Track my progress → "— Studied" → a stage writes the right person and unit key;
  // Bookmark this saves the place; the Continue strip opens the last place.
  for (const mod of TOPIC_MODULES) {
    await flow(`topic-${mod.id}`, lang, width, mod.page, async (t, page, ctx, errors) => {
      await page.waitForSelector(".topic-row-leaf", { timeout: 15000 });
      const persons = await ev(page, () => [...document.querySelectorAll("#personSelect option")].map((o) => o.value));
      check(`${t}: POSITIVE CONTROL the page lists the topic and a Person picker (${persons.join(",")})`, persons.length >= 2 && (await ev(page, () => document.querySelectorAll(".topic-row-leaf").length)) >= 1, JSON.stringify(persons));
      const person = persons.find((p) => p !== persons[0]) ?? persons[0];
      await page.selectOption("#personSelect", person); await settle(page, 900);
      await page.click(".topic-row-leaf"); await settle(page, 1200);
      const det = await ev(page, () => ({ text: document.getElementById("detailContainer").innerText, h: document.getElementById("trackTopicBtn")?.getBoundingClientRect().height ?? 0, dis: document.getElementById("trackTopicBtn")?.disabled }));
      check(`${t}: opening a topic shows its detail with an enabled Track my progress, finger-sized`, !det.dis && det.h >= 40, JSON.stringify(det));
      if (bn) check(`${t}: the topic detail has no English left`, englishLeft(det.text.replace(mod.topicEn, " ")).length === 0, englishLeft(det.text).join(", "));
      await page.click("#trackTopicBtn"); await settle(page, 700);
      const modal = await ev(page, () => ({ title: document.getElementById("wayModalMount").innerText.split("\n")[0].trim(), open: document.getElementById("wayModalOverlay").classList.contains("open"), r: (() => { const r = document.querySelector("#wayModalMount > *").getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; })(), claim: document.querySelector(".way-claim-btn")?.getBoundingClientRect().height ?? 0 }));
      if (PROBE) console.log(t, "modal", JSON.stringify(modal));
      check(`${t}: Track my progress opens "${bn ? "… — অধ্যয়ন করা হয়েছে" : "… — Studied"}" inside the screen`, modal.open && modal.title.endsWith(bn ? "— অধ্যয়ন করা হয়েছে" : "— Studied") && inside(modal.r, width, vh), JSON.stringify(modal));
      check(`${t}: the Claim button is at least 40px`, modal.claim >= 40, JSON.stringify(modal));
      await page.selectOption(".way-status-select", "learning");
      const w0 = await writeCount(page);
      await page.click(".way-claim-btn"); await settle(page, 1000);
      const ws = await writes(page, w0);
      const rec = ws.find((x) => x.col === "records");
      if (PROBE) console.log(t, "writes", JSON.stringify(ws).slice(0, 900));
      const entry = rec?.data?.entries?.[`topic:${mod.topicId}::${mod.trackable}`] ?? null;
      check(`${t}: choosing a stage writes the right person's records document (${person}) under unit key topic:${mod.topicId}`, !!rec && rec.data.personId === person && rec.id.includes(`__${person}__`) && !!entry && entry.unitType === "topic" && entry.claimedStatus === "learning" && Object.keys(rec.data.entries).length === 1, JSON.stringify(rec)?.slice(0, 500));
      check(`${t}: the record carries the I17 stamps`, !!rec && STAMPS(rec.data), JSON.stringify(rec?.data ?? {}).slice(0, 300));
      await page.click(`#wayModalMount button:text-is("×")`); await settle(page, 300);
      // Bookmark this
      const w1 = await writeCount(page);
      check(`${t}: the ☆ bookmark button is at least 40px`, (await tall(page, "#bookmarkTopicBtn")) >= 40, String(await tall(page, "#bookmarkTopicBtn")));
      await page.click("#bookmarkTopicBtn"); await settle(page, 600);
      await page.click("[data-bm-pop-save]"); await settle(page, 900);
      const bw = (await writes(page, w1)).find((x) => x.col === "bookmarks");
      if (PROBE) console.log(t, "bookmark", JSON.stringify(bw)?.slice(0, 600));
      check(`${t}: Bookmark this saves the place (a bookmarks write naming ${mod.topicId} in module ${mod.id})`, !!bw && JSON.stringify(bw.data).includes(`"${mod.topicId}"`) && JSON.stringify(bw.data).includes(`"${mod.id}"`), JSON.stringify(bw)?.slice(0, 400));
      check(`${t}: the star turns filled`, (await ev(page, () => document.getElementById("bookmarkTopicBtn").textContent.trim())) === "★");
      check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { extraSeed: mod.seed });

    // A topic that already has a claim says so in the reader's language ("Status: learning · pending").
    await flow(`topicstatus-${mod.id}`, lang, width, mod.page, async (t, page, ctx, errors) => {
      await page.waitForSelector(".topic-row-leaf", { timeout: 15000 });
      await page.click(".topic-row-leaf"); await settle(page, 1200);
      const text = await ev(page, () => document.querySelector("#detailContainer .topic-detail p:not(.topic-resource-text)")?.parentElement.innerText ?? "");
      const line = text.split("\n").find((l) => /Status|অবস্থা/.test(l)) ?? "";
      if (PROBE) console.log(t, "status line", JSON.stringify(line));
      check(`${t}: POSITIVE CONTROL the topic's own claim is shown as a Status line`, /learning|শিখছি/i.test(line), JSON.stringify(text));
      check(`${t}: the Status line is ${bn ? "wholly Bangla" : "English: \"Status: Learning · Awaiting confirmation\""}`, bn ? englishLeft(line).length === 0 : line === "Status: Learning · Awaiting confirmation", line);
    }, { extraSeed: mod.seed + `\nDATA.records.push({ _id: TENANT_ID + "__p1__subject_${mod.root}", tenantId: TENANT_ID, personId: "p1", subjectId: "${mod.root}", entries: { "topic:${mod.topicId}::${mod.trackable}": { unitType: "topic", subjectId: "${mod.root}", trackableId: "${mod.trackable}", claimedStatus: "learning", claimedByPersonId: "p1", confirmedStatus: null, confirmState: "pending", domainIds: [], notes: "" } } });` });

    await flow(`continue-${mod.id}`, lang, width, mod.page, async (t, page, ctx, errors) => {
      await page.waitForSelector(".continue-chip", { timeout: 15000 }).catch(() => {});
      const chip = await ev(page, () => { const a = document.querySelector("#continueStrip .continue-chip"); const r = a?.getBoundingClientRect(); return a ? { href: a.getAttribute("href"), text: a.textContent.trim().replace(/\s+/g, " "), h: r.height, l: r.left, r: r.right } : null; });
      if (PROBE) console.log(t, "chip", JSON.stringify(chip));
      check(`${t}: POSITIVE CONTROL the Continue line is at the top of the page and names ${mod.topicEn} (${bn ? "Bangla" : "English"})`, !!chip && chip.text.includes(bn ? mod.topicBn : mod.topicEn) && (bn ? chip.text.startsWith("চালিয়ে যান") : chip.text.startsWith("Continue:")), JSON.stringify(chip));
      check(`${t}: the chip is finger-sized and on screen`, !!chip && chip.h >= 40 && chip.l >= -1 && chip.r <= width + 1, JSON.stringify(chip));
      await page.click("#continueStrip .continue-chip");
      await page.waitForURL(`**${mod.page}?resume=${mod.topicId}`, { timeout: 10000 }).catch(() => {});
      await page.waitForSelector("#trackTopicBtn", { timeout: 15000 }).catch(() => {});
      const there = await ev(page, () => ({ url: location.search, detail: !!document.getElementById("trackTopicBtn"), name: document.querySelector("#detailContainer h2")?.textContent.replace(/[☆★]/g, "").trim() }));
      check(`${t}: tapping the Continue line opens the last place (the ${mod.topicEn} topic's detail)`, there.url === `?resume=${mod.topicId}` && there.detail && there.name === (bn ? mod.topicBn : mod.topicEn), JSON.stringify(there));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { extraSeed: mod.seed });
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
