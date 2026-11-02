// Audit part 12 (PCF J29, manual audit, #870): the User Manual's "Qur'an: words and āyāt" features, each one WORKING.
// Measured on the rendered page at 390 / 820 / 1440 (and 320 for anything that opens a window or card), English and Bangla.
// The result is asserted, not the element: a stored write (window.__stubWriteData), a changed class, a URL, a computed box.
//   1 Āyah card   2 Before Al-Fātiḥah   3 Related hadith   4 Full text   5 Related/connected āyāt   6 ⋮ quick menu
//   7 Word card (open + top)   8 Word mark (+ lowering asks)   9 Word search   10 Dictionary box + links
//   11 Verb conjugation (verb yes, noun no)   12 Recording word progress   13 Bangla: no English left on these features
// Each flow has a POSITIVE CONTROL and a timeout that fails by name. Mutations: --mutate=<name> restores a defect.
// Run from the repository root with serve.js on :8080:  node tools/i18n-verify/audit-part12-words-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
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
const QR = ["app/quranrevival.html", "**/quranrevival.html*"];
const MUTATIONS = {
  // The full-screen Āyah card (below 900px) sized content-box + 100% high: 16px taller than the screen.
  // The floating Word card (from 900px) given no top inset: it opens over the nav row.
  "wcinset": [...QR, "        topInset: popupTopInset, // audit12 wcinset: the floating card opened over the nav row\n", ""],
  "sheetbox": [...QR, " box-sizing: border-box; /* audit12 sheetbox: content-box + 100% made the card 16px taller than the screen */", ""],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);

// ~2 s of silence, so a played clip is still "playing" when read.
const WAV = (() => {
  const rate = 8000, n = rate * 2, b = Buffer.alloc(44 + n, 0x80);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write("data", 36); b.writeUInt32LE(n, 40);
  return b;
})();
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
const bnDigits = (s) => String(s).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const refText = (lang, s) => (lang === "bn" ? bnDigits(s) : s);

async function open(lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: "window.__stubApplyBatches = true;" });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}

async function flow(name, lang, width, fn) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.ctx, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}

const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
// 19 Oct 2026 (five-levels change, J38/J39): the dictionary box sits in Depth's collapsed "Dictionary & Forms" section.
const openDictSection = async (page) => {
  await page.waitForSelector('[data-word-card-sec="dict"]', { state: "attached", timeout: 8000 });
  await page.evaluate(() => { document.querySelector('[data-word-card-sec="dict"]').open = true; });
};
const clean = (page) => ev(page, () => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
async function openRead(page) {
  await clean(page);
  if (await ev(page, () => !document.getElementById("readView").hidden)) return;
  if (!(await ev(page, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await settle(page, 200); }
  await page.click("#tabReadBtn");
  await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 8000 });
  await settle(page, 300);
}
async function goToAyah(page, surah, ayah) {
  await openRead(page);
  const moved = await ev(page, (s) => { const el = document.getElementById("surahSelect"); if (el.value === String(s)) return false; el.value = String(s); el.dispatchEvent(new Event("change", { bubbles: true })); return true; }, surah);
  if (moved) await page.waitForFunction((s) => document.querySelector(`#readView [data-word-occurrence^="quran-word-occurrence:v1:${s}:"]`) || document.querySelector(`#readView [data-ayah-num-badge^="${s}:"]`), surah, { timeout: 15000 });
  await ev(page, (a) => { const el = document.getElementById("ayahSelect"); if (el.value !== String(a)) { el.value = String(a); el.dispatchEvent(new Event("change", { bubbles: true })); } }, ayah);
  await settle(page, 900);
  await clean(page);
}
async function wbwOn(page) {
  await ev(page, () => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await settle(page, 500);
}
async function openWord(page, surah, ayah, pos) {
  await ev(page, () => document.querySelector("[data-word-card-close]")?.click());
  await goToAyah(page, surah, ayah);
  await wbwOn(page);
  const id = `quran-word-occurrence:v1:${surah}:${ayah}:${pos}`;
  await page.waitForFunction((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`), id, { timeout: 8000 });
  await ev(page, (i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`).click(), id);
  await page.waitForSelector(`.quran-word-card[data-occurrence-id="${id}"]`, { timeout: 8000 });
  await settle(page, 1000);
}
async function openSheet(page, surah, ayah) {
  await goToAyah(page, surah, ayah);
  await ev(page, (k) => document.querySelector(`[data-ayah-num-badge="${k}"]`)?.click(), `${surah}:${ayah}`);
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
  await settle(page, 600);
}
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
const rectOf = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, vw: innerWidth, vh: innerHeight }; }, sel);
const navBottom = (page) => ev(page, () => Math.max(0, ...[document.getElementById("topNav")].filter(Boolean).map((e) => e.getBoundingClientRect().bottom)));
const writes = (page, from = 0) => ev(page, (k) => (window.__stubWriteData || []).slice(k).map((x) => ({ col: x.col, id: x.id, data: x.data })), from);
const writeCount = (page) => ev(page, () => (window.__stubWriteData || []).length);

const WIDTHS = [320, 390, 820, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
for (const lang of LANGS) for (const width of WIDTHS) {
  // 1 + 3 + 4 + 5: the Āyah card (36:38), Related hadith, Full text, Related āyāt.
  await flow("ayahcard", lang, width, async (t, page, ctx, errors) => {
    await openSheet(page, 36, 38);
    const s = await ev(page, () => { const sh = document.querySelector("[data-ayah-sheet]"); const r = sh.getBoundingClientRect(); const c = document.querySelector("[data-ayah-sheet] [data-ayah-sheet-close]").getBoundingClientRect(); const cs = getComputedStyle(sh); return { bs: cs.boxSizing, pb: cs.paddingBottom, h: cs.height, sh: sh.scrollHeight, ch: sh.clientHeight, ref: document.querySelector("[data-ayah-sheet] .ayah-sheet-ref").textContent, unit: sh.dataset.unitKey, l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight, closeOn: c.width > 0 && c.right <= innerWidth + 1 && c.top >= 0, overlayOpen: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open") }; });
    if (PROBE) console.log(t, JSON.stringify(s));
    check(`${t}: POSITIVE CONTROL the Āyah card is open`, s.overlayOpen && s.unit === "ayah:36:38", JSON.stringify(s));
    check(`${t}: the Āyah card shows that āyah (${refText(lang, "36:38")})`, s.ref.includes(refText(lang, "36:38")), s.ref);
    check(`${t}: the card sits inside the screen (bottom ${Math.round(s.b)} of ${s.vh}) with its close button on screen`, s.l >= -1 && s.r <= s.vw + 1 && s.t >= 0 && s.b <= s.vh + 1 && s.closeOn, JSON.stringify(s));
    // 3: Related hadith -- the list opens with rows (36:38 is quoted by Bukhari 3199 / 4802 and Muslim 159).
    await page.waitForFunction(() => document.querySelector("[data-ayah-hadith-open]") || document.querySelector("[data-ayah-hadith-none]"), null, { timeout: 10000 }).catch(() => {});
    const h = await ev(page, () => [...document.querySelectorAll("[data-ayah-hadith-open]")].map((b) => ({ text: b.textContent.replace(/\s+/g, " ").trim(), h: b.getBoundingClientRect().height })));
    check(`${t}: POSITIVE CONTROL Related hadith lists rows for 36:38`, h.length >= 3, JSON.stringify(h));
    check(`${t}: Related hadith names Muslim 159 and Bukhari 3199, each row a 40px tap target`, lang === "bn" ? h.every((r) => r.h >= 40) : /Muslim 159\b/.test(h.map((r) => r.text).join("|")) && /Bukhari 3199/.test(h.map((r) => r.text).join("|")) && h.every((r) => r.h >= 40), JSON.stringify(h));
    // 5: Related and connected āyāt -- the lists say something (rows or a sentence in words, never blank).
    const rel = await ev(page, () => ({ rel: document.querySelector("[data-ayah-sheet-related]")?.textContent.trim().length, con: document.querySelector("[data-ayah-sheet-connected]")?.textContent.trim().length, jumps: [...document.querySelectorAll("[data-ayah-related-jump]")].map((b) => b.dataset.ayahRelatedJump) }));
    if (PROBE) console.log(t, JSON.stringify(rel));
    check(`${t}: Related and Connected āyāt sections are never blank`, rel.rel > 20 && rel.con > 20, JSON.stringify(rel));
    // 4: Full text opens and closes. UPDATED IN PLACE (PCF MSA J70, v12.19, the Owner: "Enable the full text also to take
    // the entire card size"): on a computer (the card as a window) 📖 puts the full text across the card itself, and 📖
    // again shows both halves -- no separate pop-up. Phones and tablets keep the Full text pop-up, checked as before.
    if (await ev(page, () => !!document.querySelector("[data-ayah-sheet][data-ayah-win]"))) {
      await page.click("[data-ayah-sheet-noteview]"); await settle(page, 400);
      const tx = await ev(page, () => { const b = document.querySelector("[data-ayah-sheet-panes]"); const sh = document.querySelector("[data-ayah-sheet]").getBoundingClientRect(); const nv = document.querySelector("[data-ayah-sheet-noteview]").getBoundingClientRect(); return { mode: b?.dataset.paneMode, ref: document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent ?? "", inView: sh.left >= -1 && sh.right <= innerWidth + 1 && sh.top >= -1 && sh.bottom <= innerHeight + 1, back: nv.width > 0 }; });
      check(`${t}: Full text fills the card on that āyah, inside the screen, with 📖 there to go back`, tx.mode === "text" && tx.ref.includes(refText(lang, "36:38")) && tx.inView && tx.back, JSON.stringify(tx));
      await page.click("[data-ayah-sheet-noteview]"); await settle(page, 400);
      const both = await ev(page, () => ({ mode: document.querySelector("[data-ayah-sheet-panes]")?.dataset.paneMode, card: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open") }));
      check(`${t}: 📖 again shows both halves, the same Āyah card`, both.mode === "split" && both.card, JSON.stringify(both));
    } else {
      await page.click("[data-ayah-sheet-noteview]");
      await page.waitForFunction(() => document.querySelectorAll("#ayahNoteViewPopup:not([hidden]) .ayah-nv-sec").length === 4, null, { timeout: 8000 }).catch(() => {});
      const nv = await ev(page, () => { const p = document.querySelector("#ayahNoteViewPopup:not([hidden])"); if (!p) return null; const r = p.querySelector(".ayah-nv-box").getBoundingClientRect(); const b = p.querySelector("[data-ayah-nv-back]").getBoundingClientRect(); return { secs: p.querySelectorAll(".ayah-nv-sec").length, ref: p.querySelector(".ayah-nv-ref")?.textContent, inView: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1, back: b.width > 0 && b.top >= 0 && b.bottom <= innerHeight }; });
      check(`${t}: Full text opens on that āyah, inside the screen, with a visible way back`, !!nv && nv.secs === 4 && nv.ref.includes(refText(lang, "36:38")) && nv.inView && nv.back, JSON.stringify(nv));
      await page.click("[data-ayah-nv-back]"); await settle(page, 400);
      const closed = await ev(page, () => ({ pop: !!document.querySelector("#ayahNoteViewPopup:not([hidden])"), card: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open") }));
      check(`${t}: Full text closes, back to the same Āyah card`, !closed.pop && closed.card, JSON.stringify(closed));
    }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 5b: tapping a related āyah goes to it, with the way back (the way-back law) to the same card.
  await flow("relatedjump", lang, width, async (t, page) => {
    await openSheet(page, 36, 38);
    const target = await ev(page, () => document.querySelector("[data-ayah-related-jump]")?.dataset.ayahRelatedJump ?? null);
    check(`${t}: POSITIVE CONTROL a related āyah is listed`, !!target, String(target));
    const [ts, ta] = target.split(":");
    await ev(page, () => document.querySelector("[data-ayah-related-jump]").click());
    await page.waitForFunction(([s, a]) => document.getElementById("surahSelect").value === s && document.getElementById("ayahSelect").value === a, [ts, ta], { timeout: 10000 }).catch(() => {});
    await settle(page, 800);
    const at = await ev(page, () => { const p = document.querySelector("#ayahCardBackPill:not([hidden]) [data-ayah-card-back]"); const r = p?.getBoundingClientRect(); const hit = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null; return { surah: document.getElementById("surahSelect").value, ayah: document.getElementById("ayahSelect").value, sheet: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), pill: p?.textContent.trim() ?? null, tappable: !!hit && p.contains(hit), inView: !!r && r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 }; });
    check(`${t}: the related āyah (${target}) opens in the Read view, the card closed`, at.surah === ts && at.ayah === ta && !at.sheet, JSON.stringify(at));
    check(`${t}: a visible, tappable "Back to Āyah card 36:38" stays on screen`, !!at.pill && at.tappable && at.inView && at.pill.includes(refText(lang, "36:38")), JSON.stringify(at));
    await page.click("[data-ayah-card-back]");
    await page.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
    const back = await ev(page, () => ({ open: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), unit: document.querySelector("[data-ayah-sheet]")?.dataset.unitKey, pill: !!document.querySelector("#ayahCardBackPill:not([hidden])") }));
    check(`${t}: the way back reopens the same Āyah card and the pill goes`, back.open && back.unit === "ayah:36:38" && !back.pill, JSON.stringify(back));
  });

  // 2: Before Al-Fātiḥah -- Aʿūdhu billāh and Bismillah show; a stage can be set (the write is asserted).
  await flow("opening", lang, width, async (t, page, ctx, errors) => {
    await goToAyah(page, 1, 1);
    const band = await ev(page, () => ({ chips: [...document.querySelectorAll("[data-opening-open]")].map((c) => ({ key: c.dataset.openingOpen, text: c.textContent.replace(/\s+/g, " ").trim(), w: c.getBoundingClientRect().width, h: c.getBoundingClientRect().height, r: c.getBoundingClientRect().right })), vw: innerWidth, title: document.querySelector(".opening-band-title")?.textContent }));
    if (PROBE) console.log(t, JSON.stringify(band));
    check(`${t}: POSITIVE CONTROL the "Before Al-Fātiḥah" band shows two items (Aʿūdhu billāh, Bismillah)`, band.chips.length === 2 && band.chips[0].key === "opening:taawwudh" && band.chips[1].key === "ayah:1:1", JSON.stringify(band));
    check(`${t}: both items are tap targets (>=40px) inside the screen`, band.chips.every((c) => c.h >= 40 && c.w > 0 && c.r <= band.vw + 1), JSON.stringify(band));
    for (const key of ["opening:taawwudh", "ayah:1:1"]) {
      await ev(page, () => { document.querySelectorAll("#ayahActionSheetOverlay.open [data-ayah-sheet-close]").forEach((b) => b.click()); });
      await settle(page, 300);
      await ev(page, (k) => document.querySelector(`[data-opening-open="${k}"]`).click(), key);
      await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-intro]"), null, { timeout: 8000 });
      await settle(page, 500);
      const c = await ev(page, () => { const sh = document.querySelector("[data-ayah-sheet]"); const ar = sh.querySelector(".ayah-sheet-intro-ar")?.textContent ?? ""; const stages = [...sh.querySelectorAll("[data-approach-stage-btn]")]; return { unit: sh.dataset.unitKey, ar, tr: sh.querySelector(".ayah-sheet-intro-tr")?.textContent ?? "", back: !!sh.querySelector("[data-ayah-sheet-back]"), stages: stages.map((b) => [b.dataset.approachStageBtn, b.disabled]), sel: sh.querySelector("[data-approach-list-pick], select")?.value ?? null }; });
      if (PROBE) console.log(t, key, JSON.stringify(c));
      check(`${t}: ${key} opens its card with the Arabic, a translation and a ← Back`, c.ar.length > 5 && c.tr.length > 5 && c.back, JSON.stringify(c));
      const enabled = c.stages.find(([, d]) => !d);
      check(`${t}: ${key} offers stages to set`, c.stages.length >= 3 && !!enabled, JSON.stringify(c.stages));
      if (enabled) {
        const stage = "learning";
        const n = await writeCount(page);
        await ev(page, (s) => document.querySelector(`[data-ayah-sheet] [data-approach-stage-btn="${s}"]`).click(), stage);
        await settle(page, 1500);
        const w = await writes(page, n);
        if (PROBE) console.log(t, key, stage, JSON.stringify(w).slice(0, 600));
        const rec = w.find((x) => x.col === "records" && x.data?.[`entries.${key}::memorise`]?.claimedStatus === stage);
        check(`${t}: setting "${stage}" on ${key} writes that stage to that exact item's record`, !!rec, JSON.stringify(w.map((x) => [x.col, x.id])));
      }
    }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 6: the ⋮ quick menu -- opens inside the screen, and each item does what its label says.
  await flow("quickmenu", lang, width, async (t, page, ctx, errors) => {
    await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    await ctx.route("**/archive.org/**", (r) => (r.request().resourceType() === "media" ? r.fulfill({ status: 200, contentType: "audio/wav", body: WAV }) : r.abort()));
    await goToAyah(page, 36, 38);
    const menu = () => ev(page, () => { const m = document.querySelector("#readQuickMenuSlot .quick-menu"); const r = m.getBoundingClientRect(); return { open: m.classList.contains("open"), l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight, items: [...m.querySelectorAll(".qm-item")].map((b) => b.textContent.trim()) }; });
    const toggle = async () => { await ev(page, () => document.querySelector("#readQuickMenuSlot [data-qm-toggle]").click()); await settle(page, 250); };
    await toggle();
    const m = await menu();
    if (PROBE) console.log(t, JSON.stringify(m));
    check(`${t}: POSITIVE CONTROL the ⋮ menu opens`, m.open && m.items.length >= 6, JSON.stringify(m));
    check(`${t}: the open menu sits inside the screen`, m.l >= -1 && m.r <= m.vw + 1 && m.t >= 0 && m.b <= m.vh + 1, JSON.stringify(m));
    // Copy / Share open their language boxes.
    for (const k of ["copy", "share"]) {
      await ev(page, (k) => document.querySelector(`#readQuickMenuSlot [data-qm-sub-toggle="${k}"]`).click(), k);
      await settle(page, 200);
      const sub = await ev(page, (k) => { const s = document.querySelector(`#readQuickMenuSlot .qm-sub[data-qm-sub="${k}"]`); return { open: s.classList.contains("open"), boxes: s.querySelectorAll("input[type=checkbox]").length, go: !!s.querySelector(`[data-qm-${k}-go]`) }; }, k);
      check(`${t}: ${k} opens its language choices and a ${k} button`, sub.open && sub.boxes >= 3 && sub.go, JSON.stringify(sub));
    }
    // Copy puts the āyah's text on the clipboard (granted below); fall back to the visible "Copied" flash.
    await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await ev(page, () => document.querySelector("#readQuickMenuSlot [data-qm-copy-go]").click());
    await settle(page, 600);
    const clip = await ev(page, () => navigator.clipboard.readText().catch((e) => `ERR ${e.message}`));
    check(`${t}: Copy puts the āyah's text on the clipboard (1:2 in Arabic)`, /[؀-ۿ]{3,}/.test(clip), String(clip).slice(0, 80));
    // Play starts a recitation.
    await toggle();
    let n = await ev(page, () => document.querySelectorAll("audio").length);
    await ev(page, () => document.querySelector("#readQuickMenuSlot [data-qm-play]").click());
    await page.waitForFunction(() => document.getElementById("readPlayBtn").textContent.trim() === "⏸", null, { timeout: 8000 }).catch(() => {});
    const playing = await ev(page, () => ({ btn: document.getElementById("readPlayBtn").textContent.trim(), closed: !document.querySelector("#readQuickMenuSlot .quick-menu.open") }));
    check(`${t}: Play starts the recitation (the Read bar shows ⏸) and closes the menu`, playing.btn === "⏸" && playing.closed, JSON.stringify(playing));
    await ev(page, () => document.getElementById("readPlayBtn").click());
    await settle(page, 300);
    // Word by Word flips the reading choice, both ways.
    const wbw = () => ev(page, () => document.getElementById("wbwShowToggle").checked);
    const before = await wbw();
    await toggle();
    await ev(page, () => document.querySelector("#readQuickMenuSlot [data-qm-wbw]").click());
    await settle(page, 700);
    const after = await wbw();
    check(`${t}: "Word by Word" flips the Word-by-Word setting (${before} -> ${after})`, before !== after);
    // Root flips Roots.
    const roots = () => ev(page, () => document.getElementById("rootsToggle")?.checked ?? null);
    const r0 = await roots();
    await toggle();
    await ev(page, () => document.querySelector("#readQuickMenuSlot [data-qm-roots]").click());
    await settle(page, 700);
    const r1 = await roots();
    check(`${t}: "Root" flips the Roots setting (${r0} -> ${r1})`, r0 !== null && r0 !== r1);
    // QCR opens the QCR pop-up with a way back.
    await toggle();
    if (PROBE) console.log(t, "wrap unit", await ev(page, () => [document.querySelector("#readQuickMenuSlot .ayah-quick-wrap").dataset.unitKey, document.getElementById("ayahSelect").value, document.querySelector("#readView .ayah-ref, #readRef")?.textContent]));
    await ev(page, () => document.querySelector("#readQuickMenuSlot [data-qm-qcr]").click());
    await page.waitForFunction(() => { const p = document.querySelector(".qcr-pop-box"); return p && p.getClientRects().length; }, null, { timeout: 10000 }).catch(() => {});
    const q = await ev(page, () => { const b = document.querySelector("[data-qcr-pop-back]"); const r = b?.getBoundingClientRect(); return { title: document.querySelector(".qcr-pop-title")?.textContent, back: !!r && r.width > 0 && r.top >= 0 && r.right <= innerWidth + 1 }; });
    check(`${t}: "QCR collection(s)…" opens the QCR pop-up for 36:38 with a visible Back`, !!q.title && q.title.includes(refText(lang, "36:38")) && q.back, JSON.stringify(q));
    await ev(page, () => document.querySelector("[data-qcr-pop-back]")?.click());
    await settle(page, 500);
    // Note & more opens the Notes pane on this āyah with a way back.
    await toggle();
    await ev(page, () => document.querySelector("#readQuickMenuSlot [data-qm-note]").click());
    await page.waitForFunction(() => { const p = document.getElementById("readNotePane"); return p && !p.hidden && p.getClientRects().length > 0; }, null, { timeout: 8000 }).catch(() => {});
    const np = await ev(page, () => { const p = document.getElementById("readNotePane"); const b = p?.querySelector(".rnp-back"); const r = b?.getBoundingClientRect(); return { open: !!p && !p.hidden, unit: decodeURIComponent((p?.querySelector("iframe")?.getAttribute("src") ?? "").match(/unit=([^&]+)/)?.[1] ?? ""), back: !!r && r.width > 0 && r.top >= 0 }; });
    check(`${t}: "Note & more…" opens the Notes pane on ayah:36:38 with a visible way back`, np.open && np.unit === "ayah:36:38" && np.back, JSON.stringify(np));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 7 + 8 + 12: the Word card opens from a word; its top shows word, reference and translation; a mark is written and kept.
  await flow("wordcard", lang, width, async (t, page, ctx, errors) => {
    await openWord(page, 2, 42, 8);
    const top = await ev(page, () => { const m = document.getElementById("quranWordCardMount"); const c = m.querySelector(".quran-word-card"); const r = m.getBoundingClientRect(); const x = c.querySelector("[data-word-card-close]").getBoundingClientRect(); return { id: c.dataset.occurrenceId, ar: c.querySelector(".word-card-arabic")?.textContent.trim(), ref: c.querySelector(".word-card-reference")?.textContent.trim(), en: c.querySelector(".word-card-meaning-en")?.textContent.trim(), bn: c.querySelector(".word-card-meaning-bn")?.textContent.trim(), l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight, close: x.width > 0 && x.right <= innerWidth + 1 && x.top >= 0 && x.bottom <= innerHeight + 1 }; });
    const nb = await navBottom(page);
    if (PROBE) console.log(t, JSON.stringify(top), "nav", nb);
    check(`${t}: POSITIVE CONTROL the Word card opened for 2:42:8`, top.id === "quran-word-occurrence:v1:2:42:8", JSON.stringify(top));
    check(`${t}: the top shows the word (Arabic), its reference (${refText(lang, "2:42:8")}) and its translation`, /[؀-ۿ]{2,}/.test(top.ar) && top.ref === refText(lang, "2:42:8") && (lang === "bn" ? BN.test(top.bn) : /know/i.test(top.en)), JSON.stringify(top));
    // Below 900px the card is the full-screen sheet (issue #322, by design); from 900px it floats BELOW the nav row.
    // Updated in place, 2 Nov 2026 (QR Lead audit 11, v13.14): from 768px to 899px the full-screen card stops at the top of
    // the Zab bar when the bar shows (it covered the card's bottom), so "full screen" ends at the bar, not the screen's edge.
    const zabTop = await ev(page, () => { const z = document.getElementById("zabBar"); return z && z.getClientRects().length && getComputedStyle(z).position === "fixed" && z.getBoundingClientRect().height > 0 ? Math.round(z.getBoundingClientRect().top) : null; });
    check(`${t}: the card sits inside the screen (${top.vw < 900 ? "full-screen sheet" : "floating, below the nav row"}) with its close button on screen`, top.l >= -1 && top.r <= top.vw + 1 && top.b <= top.vh + 1 && top.close && (top.vw < 900 ? top.t === 0 && Math.abs(top.b - (zabTop ?? top.vh)) <= 1 : top.t >= nb - 1), `${JSON.stringify(top)} nav ${nb} zab ${zabTop}`);
    // 8 + 12: set a mark; the write is asserted, and the mark is still there when the card is closed and opened again.
    const pressed = () => ev(page, () => [...document.querySelectorAll("#quranWordCardMount [data-word-progress] [data-word-progress-state]")].filter((e) => e.getAttribute("aria-pressed") === "true").map((e) => e.dataset.wordProgressState).join());
    const n = await writeCount(page);
    await page.click('#quranWordCardMount [data-word-progress-state="learning"]');
    await page.waitForFunction(() => !document.querySelector("#quranWordCardMount [data-word-progress-saving]"), null, { timeout: 10000 }).catch(() => {});
    await settle(page, 1200);
    const w = await writes(page, n);
    if (PROBE) console.log(t, JSON.stringify(w).slice(0, 700));
    const rec = w.find((x) => x.col === "quranWordProgress");
    check(`${t}: pressing Learning writes quranWordProgress for 2:42 word 8 as learning ("l")`, !!rec && rec.id === "t1__p1__wbw__2_42" && rec.data.entries?.["8"]?.s === "l", JSON.stringify(w.map((x) => [x.col, x.id])));
    check(`${t}: the card shows Learning pressed`, (await pressed()) === "learning", await pressed());
    await ev(page, () => document.querySelector("[data-word-card-close]").click());
    await settle(page, 500);
    await ev(page, () => document.querySelector('#readView [data-word-occurrence="quran-word-occurrence:v1:2:42:8"]').click());
    await page.waitForSelector('.quran-word-card[data-occurrence-id="quran-word-occurrence:v1:2:42:8"]', { timeout: 8000 });
    await settle(page, 1200);
    check(`${t}: the mark is kept when the card is opened again`, (await pressed()) === "learning", await pressed());
    // 12: a different stage (Practising) is recorded the same way.
    const n2 = await writeCount(page);
    await page.click('#quranWordCardMount [data-word-progress-state="practising"]');
    await page.waitForFunction(() => !document.querySelector("#quranWordCardMount [data-word-progress-saving]"), null, { timeout: 10000 }).catch(() => {});
    await settle(page, 1200);
    const w2 = await writes(page, n2);
    if (PROBE) console.log(t, "w2", JSON.stringify(w2).slice(0, 500));
    check(`${t}: recording Practising writes it and replaces Learning on the card`, w2.some((x) => x.col === "quranWordProgress" && x.data["entries.8"]?.s === "p") && (await pressed()) === "practising", `${await pressed()} ${JSON.stringify(w2.map((x) => [x.col, x.id]))}`);
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 8b: a lowering press on a place that shows Achieved through ANOTHER mark asks before changing (v10.43).
  await flow("lowerask", lang, width, async (t, page) => {
    await openWord(page, 14, 3, 3);
    await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
    await page.waitForFunction(() => !document.querySelector("#quranWordCardMount [data-word-progress-saving]"), null, { timeout: 10000 }).catch(() => {});
    await settle(page, 1200);
    await openWord(page, 14, 27, 8);
    const n = await writeCount(page);
    await page.click('#quranWordCardMount [data-word-progress-state="learning"]');
    await settle(page, 1500);
    const q = await ev(page, () => { const e = document.querySelector("#quranWordCardMount [data-word-progress-question]"); if (!e) return null; const r = e.getBoundingClientRect(); return { text: e.querySelector("p").textContent, inView: r.left >= -1 && r.right <= innerWidth + 1 && r.width > 0, btns: [...e.querySelectorAll("button")].map((b) => b.getBoundingClientRect().height) }; });
    check(`${t}: POSITIVE CONTROL a lowering press asks first (question inside the card, finger-sized buttons)`, !!q && q.inView && q.btns.length === 2 && q.btns.every((h) => h >= 40), JSON.stringify(q));
    check(`${t}: nothing is written before the answer`, (await writes(page, n)).length === 0, JSON.stringify(await writes(page, n)));
    await page.click('#quranWordCardMount [data-word-progress-ask="change"]');
    await settle(page, 1800);
    const w = await writes(page, n);
    check(`${t}: "Change it" writes the lowered mark (quranLemmaProgress, practising/learning)`, w.some((x) => x.col === "quranLemmaProgress" && JSON.stringify(x.data).includes("learning")), JSON.stringify(w.map((x) => [x.col, x.id])));
  });

  // 9: word search inside the Word card -- a search returns forms and places; opening a place keeps the card open.
  await flow("search", lang, width, async (t, page, ctx, errors) => {
    await openWord(page, 2, 42, 8);
    await page.click("[data-word-card-search-toggle]");
    await page.waitForSelector("[data-word-card-search-input]", { timeout: 5000 });
    await page.fill("[data-word-card-search-input]", "تعلمون");
    await page.click("[data-word-card-search-go]");
    await page.waitForSelector(".word-card-search-res", { timeout: 15000 }).catch(() => {});
    const res = await ev(page, () => ({ forms: [...document.querySelectorAll(".word-card-search-res")].map((b) => ({ n: b.querySelector(".word-card-search-res-n")?.textContent, h: b.getBoundingClientRect().height })), status: document.querySelector("[data-word-card-search-status]")?.textContent.trim() }));
    check(`${t}: POSITIVE CONTROL a search for تعلمون returns forms (with counts, 40px rows)`, res.forms.length >= 2 && res.forms.every((f) => f.h >= 40 && /\d|[০-৯]/.test(f.n)), JSON.stringify(res));
    await page.click('.word-card-search-res[data-word-card-search-form="0"]');
    await page.waitForSelector(".word-card-search-place", { timeout: 8000 });
    const places = await ev(page, () => [...document.querySelectorAll(".word-card-search-place")].map((b) => b.dataset.wordCardSearchPlace));
    check(`${t}: the chosen form lists its 54 places, including 2:42:8 and 26:49:14`, places.length === 54 && places.includes("2042008") && places.includes("26049014"), `${places.length}`);
    await page.click('[data-word-card-search-place="26049014"]');
    await page.waitForFunction((w) => document.querySelector(".quran-word-card .word-card-reference")?.textContent.trim() === w, refText(lang, "26:49:14"), { timeout: 15000 }).catch(() => {});
    const after = await ev(page, () => { const c = document.querySelector(".quran-word-card"); const x = c.querySelector("[data-word-card-close]").getBoundingClientRect(); const s = c.querySelector("[data-word-card-search]"); return { ref: c.querySelector(".word-card-reference")?.textContent.trim(), id: c.dataset.occurrenceId, searchOpen: !!s, close: x.width > 0 && x.top >= 0 && x.right <= innerWidth + 1, current: document.querySelector('[data-word-card-search-place][aria-current="true"]')?.dataset.wordCardSearchPlace }; });
    check(`${t}: opening a place (26:49:14) moves the card there, and the card, its search row and a close button stay on screen`, after.id === "quran-word-occurrence:v1:26:49:14" && after.ref === refText(lang, "26:49:14") && after.searchOpen && after.close && after.current === "26049014", JSON.stringify(after));
    // The place is also reachable from the Read view, and the card's own Previous/Next keep working from there.
    await ev(page, () => document.querySelector('[data-word-card-move="previous"]').click());
    await page.waitForFunction(() => document.querySelector(".quran-word-card")?.dataset.occurrenceId !== "quran-word-occurrence:v1:26:49:14", null, { timeout: 8000 }).catch(() => {});
    check(`${t}: ‹ Previous word still moves the card on from a searched place`, await ev(page, () => document.querySelector(".quran-word-card")?.dataset.occurrenceId !== "quran-word-occurrence:v1:26:49:14"));
  });

  // 9b: an occurrence opened from the card (Basic derived-form pop-up) keeps a way back to the card.
  await flow("occback", lang, width, async (t, page) => {
    await openWord(page, 14, 13, 9);
    await page.click('#quranWordCardMount [data-word-card-level="basic"]');
    await page.waitForFunction(() => document.querySelectorAll("[data-word-card-dcard]").length >= 6, null, { timeout: 10000 }).catch(() => {});
    await ev(page, () => document.querySelector('[data-word-card-dcard][data-word-form-toggle="أُعِيدُ"]').click());
    await page.waitForFunction(() => document.querySelectorAll(".word-card-dpop [data-word-occurrence-goto]").length > 0, null, { timeout: 8000 }).catch(() => {});
    const target = await ev(page, () => document.querySelectorAll(".word-card-dpop [data-word-occurrence-goto]")[2]?.getAttribute("data-word-occurrence-goto"));
    check(`${t}: POSITIVE CONTROL the form's places list opens`, !!target, String(target));
    await ev(page, (id) => document.querySelector(`.word-card-dpop [data-word-occurrence-goto="${id}"]`).click(), target);
    await page.waitForFunction(() => document.querySelector("[data-word-card-origin-back]"), null, { timeout: 8000 }).catch(() => {});
    await settle(page, 500);
    const b = await ev(page, () => { const x = document.querySelector("[data-word-card-origin-back]"); const r = x?.getBoundingClientRect(); const hit = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null; return { text: x?.textContent.trim(), tappable: !!hit && x.contains(hit), inView: !!r && r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1 }; });
    check(`${t}: the opened āyah shows "Back to Word Card", on screen and tappable`, !!b.text && b.tappable && b.inView, JSON.stringify(b));
    await page.click("[data-word-card-origin-back]");
    await page.waitForFunction(() => document.querySelectorAll(".word-card-dpop [data-word-occurrence-goto]").length > 0, null, { timeout: 10000 }).catch(() => {});
    check(`${t}: Back returns to the Word card with the places list open again`, await ev(page, () => !!document.querySelector(".quran-word-card") && !!document.querySelector(".word-card-dpop-box")));
  });

  // 10: the Dictionary box and its links carry the right word.
  await flow("dictionary", lang, width, async (t, page) => {
    await openWord(page, 1, 2, 1);
    await page.click('#quranWordCardMount [data-word-card-level="depth"]');
    // Updated in place 19 Oct 2026 (five-levels change, J38/J39): the Dictionary box is in Depth's collapsed "Dictionary & Forms"
    // section now, so the reader opens it first.
    await openDictSection(page);
    await page.waitForSelector("[data-word-card-dictionary]", { timeout: 8000 });
    await page.waitForFunction(() => !!document.querySelector("[data-word-card-dict-meaning], [data-word-card-dict-none]"), null, { timeout: 8000 });
    const d = await ev(page, () => { const b = document.querySelector("[data-word-card-dictionary]"); const r = b.getBoundingClientRect(); const a = (k) => { const e = b.querySelector(`[data-word-card-dict-link="${k}"]`); return e && { href: e.getAttribute("href"), target: e.getAttribute("target"), rel: e.getAttribute("rel"), h: e.getBoundingClientRect().height }; }; return { meaning: b.querySelector("[data-word-card-dict-meaning]")?.textContent ?? null, corpus: a("corpus"), ejtaal: a("ejtaal"), inView: r.left >= -1 && r.right <= innerWidth + 1 }; });
    check(`${t}: POSITIVE CONTROL the Dictionary box shows a meaning for الحمد (root Hmd)`, !!d.meaning && d.meaning.length > 2 && d.inView, JSON.stringify(d));
    check(`${t}: the Corpus link carries the root (q=Hmd), opens in a new tab safely`, d.corpus?.href === "https://corpus.quran.com/qurandictionary.jsp?q=Hmd" && d.corpus.target === "_blank" && /noopener/.test(d.corpus.rel ?? "") && d.corpus.h >= 40, JSON.stringify(d.corpus));
    check(`${t}: the ejtaal link carries the root (#bwq=Hmd), opens in a new tab safely`, d.ejtaal?.href === "https://ejtaal.net/aa/#bwq=Hmd" && d.ejtaal.target === "_blank" && /noopener/.test(d.ejtaal.rel ?? "") && d.ejtaal.h >= 40, JSON.stringify(d.ejtaal));
    // A different word: the links follow it (1:3:1 is الرحمن, root rHm).
    await ev(page, () => document.querySelector("[data-word-card-close]").click());
    await openWord(page, 1, 3, 1);
    await page.click('#quranWordCardMount [data-word-card-level="depth"]');
    await openDictSection(page);
    await page.waitForFunction(() => document.querySelector('[data-word-card-dict-link="corpus"]'), null, { timeout: 8000 });
    const h2 = await ev(page, () => document.querySelector('[data-word-card-dict-link="corpus"]').getAttribute("href"));
    check(`${t}: for the next word the Corpus link follows it (q=rHm)`, h2 === "https://corpus.quran.com/qurandictionary.jsp?q=rHm", h2);
  });

  // 11: the Verb conjugation table opens for a verb and is absent for a noun.
  await flow("conj", lang, width, async (t, page) => {
    await openWord(page, 2, 102, 35);
    // Updated in place 19 Oct 2026 (five-levels change, J38/J39): Verb Conjugation moved from Depth to the TAṢRĪF tab.
    await page.click('#quranWordCardMount [data-word-card-level="tasrif"]');
    await page.waitForSelector('[data-word-card-sec="conj"]', { timeout: 10000 }).catch(() => {});
    // Updated in place 20 Oct 2026 (PCF MSA J46, tick 2A): a narrow card now OPENS on the āyah word's tense, so the
    // three tables are one tap away; press "All three" first, as a reader would, then count them as before.
    await ev(page, () => document.querySelector('[data-word-card-conj-toggle] [data-word-card-conj-view="all"][aria-pressed="false"]')?.click());
    await page.waitForTimeout(600);
    const v = await ev(page, () => { const s = document.querySelector('[data-word-card-sec="conj"]'); if (!s) return null; const w0 = s.open; s.querySelector("summary").click(); return { was: w0, now: s.open, tables: s.querySelectorAll("[data-word-card-conj-table]").length, rows: s.querySelectorAll("tr").length }; });
    check(`${t}: POSITIVE CONTROL a verb (2:102:35) has a Verb conjugation section that opens`, !!v && v.now !== v.was && v.tables >= 2 && v.rows >= 28, JSON.stringify(v));
    await ev(page, () => document.querySelector("[data-word-card-close]").click());
    await openWord(page, 1, 3, 1);
    await page.click('#quranWordCardMount [data-word-card-level="tasrif"]');
    await page.waitForSelector('[data-word-card-panel="tasrif"]', { timeout: 8000 });
    await settle(page, 1200);
    const nounNoConj = await ev(page, () => !document.querySelector('[data-word-card-sec="conj"]'));
    await page.click('#quranWordCardMount [data-word-card-level="depth"]');
    await page.waitForSelector('[data-word-card-panel="depth"] [data-word-card-sec]', { timeout: 8000 });
    await settle(page, 1200);
    check(`${t}: a noun (الرحمن) has no Verb conjugation section on Taṣrīf, while its other Depth sections show`, nounNoConj && await ev(page, () => document.querySelectorAll("[data-word-card-sec]").length >= 2));
  });

  // 13: on the Bangla page, no English is left on these surfaces (the app's own names and source names excepted).
  if (lang === "bn") await flow("bnleak", lang, width, async (t, page) => {
    const OK = /^(QCR|QuranRevival|Bukhari|Muslim|Tirmidhi|Abu Dawud|Nasa'i|Ibn Majah|Corpus|ejtaal|Wiktionary|Lane|Hans Wehr|Hmd|Quran|WbW|OpenITI)$/i; // OpenITI: the source credit under the related hadith (its licence requires the name)
    const leaks = (sel) => ev(page, ([sel, ok]) => {
      const okRe = new RegExp(ok, "i");
      const out = [];
      for (const root of document.querySelectorAll(sel)) {
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n; (n = w.nextNode());) {
          const p = n.parentElement;
          if (!p || p.closest("[lang=ar], [dir=rtl], [data-i18n-skip], [lang=en], .word-card-meaning-en, .word-card-transliteration, script, style, option") || !p.getClientRects().length) continue;
          for (const word of n.textContent.match(/[A-Za-zĀāŪūĪīḥṣṭḍẓʿʾ']{3,}/g) ?? []) if (!okRe.test(word)) out.push(`${word} «${n.textContent.trim().slice(0, 40)}»`);
        }
      }
      return [...new Set(out)];
    }, [sel, OK.source.replace(/^\^\(|\)\$$/g, "").replace(/^/, "^(").replace(/$/, ")$")]);
    await openSheet(page, 36, 38);
    await settle(page, 1200);
    const l1 = await leaks("[data-ayah-sheet]");
    if (PROBE) console.log(t, "sheet", JSON.stringify(l1));
    check(`${t}: POSITIVE CONTROL the leak scan reads the Āyah card (Bangla text present)`, await ev(page, () => /[ঀ-৿]{3,}/.test(document.querySelector("[data-ayah-sheet]").textContent)));
    check(`${t}: no English left on the Āyah card`, l1.length === 0, l1.slice(0, 8).join(" | "));
    await ev(page, () => document.querySelector("[data-ayah-sheet-close]").click());
    await goToAyah(page, 36, 38);
    await ev(page, () => document.querySelector("#readQuickMenuSlot [data-qm-toggle]").click());
    await settle(page, 300);
    const l2 = await leaks("#readQuickMenuSlot .quick-menu");
    if (PROBE) console.log(t, "menu", JSON.stringify(l2));
    check(`${t}: no English left on the ⋮ quick menu`, l2.length === 0, l2.slice(0, 8).join(" | "));
    await ev(page, () => document.querySelector("#readQuickMenuSlot [data-qm-toggle]").click());
    await openWord(page, 2, 42, 8);
    for (const level of ["wbw", "basic", "intermediate", "depth"]) {
      await page.click(`#quranWordCardMount [data-word-card-level="${level}"]`);
      await settle(page, 1800);
      const l = await leaks("#quranWordCardMount");
      if (PROBE) console.log(t, level, JSON.stringify(l));
      check(`${t}: no English left on the Word card, ${level} tab`, l.length === 0, l.slice(0, 8).join(" | "));
    }
  });

  // 3b: a Related hadith opens the hadith in the library with a way back to the āyah, and Back returns to the open card.
  await flow("hadithway", lang, width, async (t, page) => {
    await openSheet(page, 36, 38);
    await page.waitForFunction(() => document.querySelector("[data-ayah-hadith-open]"), null, { timeout: 10000 });
    await ev(page, () => [...document.querySelectorAll("[data-ayah-hadith-open]")].find((b) => /159/.test(b.textContent) || /১৫৯/.test(b.textContent)).click());
    await page.waitForURL(/hadith-collections\.html/, { timeout: 15000 });
    await page.waitForSelector("#hadithBackBtn:not([hidden])", { timeout: 15000 });
    const b = await ev(page, () => { const x = document.getElementById("hadithBackBtn"); const r = x.getBoundingClientRect(); return { text: x.textContent.trim(), h: r.height, on: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 }; });
    check(`${t}: the opened hadith shows a way back to the āyah (on screen, 40px)`, b.h >= 40 && b.on && (lang === "bn" ? BN.test(b.text) : /Back to the āyah/.test(b.text)), JSON.stringify(b));
    await page.click("#hadithBackBtn");
    await page.waitForURL(/quranrevival\.html/, { timeout: 15000 });
    await page.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 15000 }).catch(() => {});
    const back = await ev(page, () => ({ open: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), unit: document.querySelector("[data-ayah-sheet]")?.dataset.unitKey }));
    check(`${t}: Back returns to the same Āyah card (36:38)`, back.open && back.unit === "ayah:36:38", JSON.stringify(back));
  });
}

await browser.close();
console.log(`\n==== audit part 12, words and āyāt: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
