// Audit part 11 (PCF J29, manual audit, #866): the User Manual's "Qur'an: reading" features, each one WORKING, start to end.
// Measured on the rendered page at 390 / 820 / 1440 (and 320 for anything that opens a window), English and Bangla.
// The result is asserted, not the element: a rendered font size, a stored write, a changed class, a computed display.
//   1 Read view      2 Study options     3 Saved settings (presets)   4 Listening (play)    5 Mushaf view   6 Meaning
//   7 Full screen + window               8 Text size (A±)             9 Mark words          10 Al-Fātiḥah count + Mark complete
//   11 Unit card, End-of-unit prompt, Quick buttons          12 Bangla page: no English left on these controls
// Each flow has a POSITIVE CONTROL and a timeout that fails by name. Mutations: --mutate=<name> restores a defect.
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
const QR = ["app/quranrevival.html", "**/quranrevival.html*"];
const MUTATIONS = {
  // ⋯ panel hung from a ⋯ that is not at the right edge ran off the left of a 320px screen.
  "toolsplace": [...QR, "readToolsMenu.style.right = `${Math.min(rightMax, Math.max(8, Math.round(window.innerWidth - r.right)))}px`; /* audit11 toolsplace */", "readToolsMenu.style.right = `${Math.max(8, Math.round(window.innerWidth - r.right))}px`;"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);

// ~2 s of silence, so a played clip is still "playing" when the button is read.
const WAV = (() => {
  const rate = 8000, n = rate * 2, b = Buffer.alloc(44 + n, 0x80);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write("data", 36); b.writeUInt32LE(n, 40);
  return b;
})();
const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";

const browser = await chromium.launch();

async function open(lang, width, { seed = null, mushaf = false } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 }, extraSeedJs: seed });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => (r.request().resourceType() === "media" ? r.fulfill({ status: 200, contentType: "audio/wav", body: WAV }) : r.abort()));
  if (mushaf) {
    await ctx.route(MUSHAF_JSON_URL, (r) => r.fulfill({ status: 200, contentType: "application/json", body: fs.readFileSync(path.join(ROOT, "mushaf/mushaf-madani-v2.json")) }));
    await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => { const f = r.request().url().split("/").pop(); r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync(path.join(ROOT, "mushaf/fonts", f)) }); });
    await ctx.route(SURAH_HEADER_FONT_URL, (r) => r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync(path.join(ROOT, "mushaf/QCF_SurahHeader_COLOR-Regular.woff2")) }));
  }
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page };
}

async function flow(name, lang, width, opts, fn) {
  if (ONLY && !name.includes(ONLY)) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, opts || {}),new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 100000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await ctx.close().catch(() => {});
}

const ev = (page, f, a) => page.evaluate(f, a);
const click = (page, id) => page.evaluate((id) => document.getElementById(id).click(), id);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
async function openRead(page) {
  await click(page, "tabReadBtn");
  await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 8000 });
  await settle(page, 300);
}
/** Opens Study options the way a reader does: the Study tab, then Options. */
async function openOptions(page) {
  await page.click("#tabStudyBtn"); await settle(page, 200);
  await page.click("#tabStudyOptionsBtn"); await settle(page, 400);
}
const panelOpen = (page) => ev(page, () => { const p = document.getElementById("panelStudyOptions"); const r = p.getBoundingClientRect(); return { hidden: p.hidden, display: getComputedStyle(p).display, top: r.top, left: r.left, right: r.right, bottom: r.bottom, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight }; });
async function closePanel(page) { await ev(page, () => document.querySelector("#panelStudyOptions [data-close-panel]").click()); await settle(page, 300); }
const setCheck = (page, id, on) => ev(page, ([id, on]) => { const t = document.getElementById(id); if (t.checked !== on) { t.checked = on; t.dispatchEvent(new Event("change", { bubbles: true })); } }, [id, on]);
const setSelect = (page, id, v) => ev(page, ([id, v]) => { const e = document.getElementById(id); e.value = String(v); e.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
const readLen = (page) => ev(page, () => document.getElementById("ayahPanels").textContent.length);
const toolsOpen = (page) => ev(page, () => { const t = document.getElementById("readToolsBtn"); if (t.getBoundingClientRect().width > 0 && t.getAttribute("aria-expanded") !== "true") t.click(); });
const BN = /[ঀ-৿]/;
const flowNames = [];

const WIDTHS = [320, 390, 820, 1440];
for (const lang of ["en", "bn"]) for (const width of WIDTHS) {
  // 1 + 2: the Read view opens and shows the chosen Unit; Study options open, a setting changes, the Read view follows.
  await flow("read+options", lang, width, null, async (t, page) => {
    await openRead(page);
    const s = await ev(page, () => ({ rv: !document.getElementById("readView").hidden, disp: getComputedStyle(document.getElementById("readView")).display, sel: ["readUnitTypeSelect", "readSurahSelect", "readAyahSelect"].map((i) => document.getElementById(i).value), chip: document.getElementById("readUnitChip").textContent.trim(), top: document.getElementById("readView").getBoundingClientRect().top, navBottom: Math.max(0, ...[...document.querySelectorAll("nav, #qrNav, .nav-row, #topNav")].map((e) => e.getBoundingClientRect().bottom)) }));
    if (PROBE) console.log(t, JSON.stringify(s));
    check(`${t}: POSITIVE CONTROL Read view is open and shows āyah text`, s.rv && s.disp !== "none" && (await readLen(page)) > 20);
    check(`${t}: Read view shows the chosen Unit (Ayah, Surah 1, Ayah 1)`, s.sel.join() === "ayah,1,1", s.sel.join());
    await setSelect(page, "readSurahSelect", 112); await settle(page, 1500);
    const after = await ev(page, () => ({ surah: document.getElementById("surahSelect").value, panel: document.getElementById("ayahPanels").textContent }));
    check(`${t}: choosing Surah 112 in the Read view changes the Unit being read`, after.surah === "112" && /قُلْ|قل/.test(after.panel), after.surah);
    // Study options
    await openOptions(page);
    const p = await panelOpen(page);
    check(`${t}: POSITIVE CONTROL Study options open on screen`, !p.hidden && p.display !== "none" && p.w > 0 && p.h > 0, JSON.stringify(p));
    check(`${t}: Study options sit inside the screen (${Math.round(p.left)}..${Math.round(p.right)} of ${p.vw}, bottom ${Math.round(p.bottom)} of ${p.vh})`, p.left >= -1 && p.right <= p.vw + 1 && p.bottom <= p.vh + 1 && p.top >= 0);
    const hasClose = await ev(page, () => { const b = document.querySelector("#panelStudyOptions [data-close-panel]"); const r = b.getBoundingClientRect(); return r.width > 0 && r.right <= innerWidth + 1 && r.top >= 0; });
    check(`${t}: Study options have a visible way back (close button on screen)`, hasClose);
    // A setting changes and the Read view follows: English translation off shortens the page, on restores it.
    const withEn = await readLen(page);
    await setCheck(page, "trEnToggle", false); await settle(page, 600);
    const noEn = await readLen(page);
    check(`${t}: English translation off — the Read view follows (${withEn} -> ${noEn})`, noEn < withEn);
    await setCheck(page, "trEnToggle", true); await settle(page, 600);
    check(`${t}: English translation on again — the Read view follows (${await readLen(page)})`, (await readLen(page)) === withEn);
    await closePanel(page);
    check(`${t}: closing Study options leaves the Read view open`, await ev(page, () => document.getElementById("panelStudyOptions").hidden && !document.getElementById("readView").hidden));
  });

  // 3: saved settings (presets). Save, change a setting, apply, it comes back; the write is what survives a reload.
  await flow("presets", lang, width, null, async (t, page) => {
    await openRead(page);
    await openOptions(page);
    await ev(page, () => document.getElementById("presetSaveBtn").click()); await settle(page, 300);
    check(`${t}: POSITIVE CONTROL the save form opens`, await ev(page, () => !document.getElementById("presetForm").hidden));
    await ev(page, () => { const i = document.getElementById("presetNameInput"); i.value = "Audit one"; i.dispatchEvent(new Event("input", { bubbles: true })); });
    await ev(page, () => document.getElementById("presetFormSave").click()); await settle(page, 600);
    const chips = await ev(page, () => [...document.querySelectorAll("#presetChips [data-preset-apply]")].map((e) => e.textContent.trim()));
    check(`${t}: the saved setting appears as a chip`, chips.join() === "Audit one", chips.join());
    const wrote = await ev(page, () => (window.__stubWriteData || []).filter((w) => w.col === "bookmarks").map((w) => w.data.settingsPresets).filter(Boolean).at(-1) || null);
    check(`${t}: the save is written to the database (bookmarks.settingsPresets)`, !!wrote && wrote.length === 1 && wrote[0].name === "Audit one" && wrote[0].settings.translationLangs.join() === "en", JSON.stringify(wrote && wrote.map((p) => [p.name, p.settings.translationLangs])));
    await setCheck(page, "trBnToggle", true); await settle(page, 300);
    check(`${t}: POSITIVE CONTROL the setting was changed after saving`, await ev(page, () => document.getElementById("trBnToggle").checked));
    await ev(page, () => document.querySelector("#presetChips [data-preset-apply]").click()); await settle(page, 600);
    check(`${t}: applying the saved setting brings the old value back`, await ev(page, () => !document.getElementById("trBnToggle").checked && document.getElementById("trEnToggle").checked));
    // Survives a reload: a fresh page seeded with exactly what was written shows the chip and applies it.
    const ctx2 = await open(lang, width, { seed: `DATA.bookmarks[0].settingsPresets = ${JSON.stringify(wrote)};` });
    try {
      await openRead(ctx2.page); await openOptions(ctx2.page);
      const chips2 = await ev(ctx2.page, () => [...document.querySelectorAll("#presetChips [data-preset-apply]")].map((e) => e.textContent.trim()));
      check(`${t}: after a reload the saved setting is still offered`, chips2.join() === "Audit one", chips2.join());
      await setCheck(ctx2.page, "trBnToggle", true); await settle(ctx2.page, 300);
      await ev(ctx2.page, () => document.querySelector("#presetChips [data-preset-apply]").click()); await settle(ctx2.page, 600);
      check(`${t}: after a reload it still applies`, await ev(ctx2.page, () => !document.getElementById("trBnToggle").checked));
    } finally { await ctx2.ctx.close().catch(() => {}); }
  });

  // 4: listening — the play control changes state (the sound is a silent stub).
  await flow("play", lang, width, null, async (t, page) => {
    await openRead(page);
    const read = () => ev(page, () => document.getElementById("readPlayBtn").textContent.trim());
    check(`${t}: POSITIVE CONTROL Play is offered (▶) and on screen`, (await read()) === "▶" && await ev(page, () => document.getElementById("readPlayBtn").getBoundingClientRect().width >= 36));
    await click(page, "readPlayBtn");
    await page.waitForFunction(() => document.getElementById("readPlayBtn").textContent.trim() === "⏸", null, { timeout: 8000 }).catch(() => {});
    check(`${t}: pressing Play turns the control into Pause (⏸)`, (await read()) === "⏸", await read());
    const label = await ev(page, () => document.getElementById("readPlayBtn").getAttribute("aria-label"));
    check(`${t}: its accessible name follows (${label})`, /⏸/.test(label) && (lang === "bn" ? BN.test(label) : /Pause/.test(label)), label);
    await click(page, "readPlayBtn"); await settle(page, 500);
    check(`${t}: pressing it again pauses (▶ back)`, (await read()) === "▶", await read());
    await click(page, "readPlayBtn"); await settle(page, 800); await click(page, "readStopBtn"); await settle(page, 500);
    check(`${t}: Stop returns the control to ▶`, (await read()) === "▶", await read());
  });

  // 5: Mushaf view — switch to it and back; the place is kept.
  await flow("mushaf", lang, width, { mushaf: true }, async (t, page) => {
    await openRead(page);
    await setSelect(page, "readSurahSelect", 2); await settle(page, 1800);
    await setSelect(page, "readAyahSelect", 5); await settle(page, 800);
    await openOptions(page);
    await setCheck(page, "mushafToggle", true); await settle(page, 600);
    await closePanel(page);
    await page.waitForFunction(() => !!document.querySelector("#pageViewContainer .hifz-page .hifz-word"), null, { timeout: 12000 }).catch(() => {});
    const m = await ev(page, () => ({ pages: document.querySelectorAll("#pageViewContainer .hifz-page").length, shown: getComputedStyle(document.getElementById("pageViewContainer")).display, ayah: document.getElementById("readAyahSelect").value, surah: document.getElementById("readSurahSelect").value, ref: document.getElementById("mushafPageRef").textContent.trim() }));
    check(`${t}: POSITIVE CONTROL the Mushaf page is drawn and shown`, m.pages > 0 && m.shown !== "none", JSON.stringify(m));
    check(`${t}: the place is kept in Mushaf view (Surah 2, Ayah 5)`, m.surah === "2" && m.ayah === "5", `${m.surah}:${m.ayah}`);
    await openOptions(page);
    await setCheck(page, "mushafToggle", false); await settle(page, 800);
    await closePanel(page);
    const b = await ev(page, () => ({ shown: getComputedStyle(document.getElementById("pageViewContainer")).display, panels: document.getElementById("ayahPanels").textContent.length, ayah: document.getElementById("readAyahSelect").value, surah: document.getElementById("readSurahSelect").value }));
    check(`${t}: switching back leaves the same place (Surah 2, Ayah 5) and the āyah text`, b.surah === "2" && b.ayah === "5" && b.panels > 20, JSON.stringify(b));
    check(`${t}: the Mushaf page is hidden again`, b.shown === "none", b.shown);
  });

  // 6 + 7: Meaning, full screen cycle, window.
  await flow("meaning+fullscreen", lang, width, null, async (t, page) => {
    await openRead(page);
    const pressed = () => ev(page, () => document.getElementById("readMeaningBtn").getAttribute("aria-pressed"));
    check(`${t}: POSITIVE CONTROL Meaning starts off`, (await pressed()) === "false");
    const base = await readLen(page);
    await click(page, "readMeaningBtn");
    await page.waitForFunction(() => document.getElementById("readMeaningLayersSlot").getBoundingClientRect().width > 0, null, { timeout: 5000 }).catch(() => {});
    const on = await ev(page, () => ({ slot: !document.getElementById("readMeaningLayersSlot").hidden, w: document.getElementById("readMeaningLayersSlot").getBoundingClientRect().width }));
    check(`${t}: 📖 Meaning turns on (pressed, layer switches shown)`, (await pressed()) === "true" && on.slot && on.w > 0, JSON.stringify(on));
    await click(page, "readMeaningBtn"); await settle(page, 500);
    check(`${t}: pressing it again turns Meaning off and the layer switches go`, (await pressed()) === "false" && await ev(page, () => document.getElementById("readMeaningLayersSlot").hidden || document.getElementById("readMeaningLayersSlot").getBoundingClientRect().width === 0));
    check(`${t}: the Read view is as before (${base} -> ${await readLen(page)})`, (await readLen(page)) === base);
    // Full screen is a cycle: normal -> reading only -> chosen hides -> normal.
    const st = () => ev(page, () => ({ imm: document.body.classList.contains("immersive-read"), dock: getComputedStyle(document.getElementById("dock")).display, hideBtn: document.getElementById("hideChromeBtn").getBoundingClientRect().width, readView: !document.getElementById("readView").hidden, pressed: document.getElementById("hideChromeBtn").getAttribute("aria-pressed") }));
    const s0 = await st();
    check(`${t}: POSITIVE CONTROL normal screen: not full screen, ⤢ on screen`, !s0.imm && s0.hideBtn > 0 && s0.dock !== "none");
    await click(page, "hideChromeBtn"); await settle(page, 500);
    const s1 = await st();
    check(`${t}: ⤢ enters full screen (menus gone, ⤢ still there, still reading)`, s1.imm && s1.dock === "none" && s1.hideBtn > 0 && s1.readView && s1.pressed === "true", JSON.stringify(s1));
    let s = s1, n = 0;
    while (s.imm && n++ < 3) { await click(page, "hideChromeBtn"); await settle(page, 400); s = await st(); }
    check(`${t}: pressing ⤢ on leaves full screen (the way back, ${n} more presses)`, !s.imm && s.dock !== "none" && s.readView && s.pressed === "false", JSON.stringify(s));
    // The window (PC only).
    const wb = await ev(page, () => { const b = document.getElementById("readWindowBtn"); return { w: b.getBoundingClientRect().width, disp: getComputedStyle(b).display }; });
    if (width >= 900) {
      check(`${t}: POSITIVE CONTROL the window button is offered on a computer`, wb.w > 0);
      await click(page, "readWindowBtn"); await settle(page, 700);
      const w1 = await ev(page, () => { const r = document.getElementById("readView").getBoundingClientRect(); return { win: document.body.classList.contains("read-windowed"), bar: document.getElementById("readWinBar").getBoundingClientRect().height, l: r.left, r: r.right, top: r.top, bottom: r.bottom, vw: innerWidth, vh: innerHeight, dockBtn: document.getElementById("readWinDockBtn").getBoundingClientRect().width }; });
      check(`${t}: 🗗 opens the Read view as a window inside the screen, with a way back`, w1.win && w1.bar > 0 && w1.l >= 0 && w1.r <= w1.vw && w1.top >= 0 && w1.bottom <= w1.vh && w1.dockBtn > 0, JSON.stringify(w1));
      await click(page, "readWinDockBtn"); await settle(page, 600);
      check(`${t}: "Put back in the page" returns the Read view`, await ev(page, () => !document.body.classList.contains("read-windowed") && document.getElementById("readWinBar").getBoundingClientRect().height === 0 && !document.getElementById("readView").hidden));
    } else {
      check(`${t}: below 900px the window button is not offered (display ${wb.disp}, width ${wb.w})`, wb.w === 0 || wb.disp === "none");
    }
  });

  // 8: text size A±.
  await flow("textsize", lang, width, null, async (t, page) => {
    await openRead(page);
    const arSize = () => ev(page, () => { const e = document.querySelector("#ayahPanels .ayah-word-clickable"); return e ? parseFloat(getComputedStyle(e).fontSize) : 0; });
    const base = await arSize();
    check(`${t}: POSITIVE CONTROL an Arabic line is measured (${base}px)`, base > 8);
    await toolsOpen(page);
    if (width < 900) {
      const tm = await ev(page, () => { const r = document.getElementById("readToolsMenu").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom), innerWidth, innerHeight]; });
      check(`${t}: the ⋯ tools panel sits inside the screen (${tm.join(",")})`, tm[0] >= 0 && tm[1] <= tm[4] && tm[2] >= 0 && tm[3] <= tm[5]);
    }
    await ev(page, () => document.querySelector('[data-text-size-toggle="read"]').click()); await settle(page, 300);
    check(`${t}: A± opens its panel on screen`, await ev(page, () => { const p = document.querySelector('[data-text-size-popover="read"]'); const r = p.getBoundingClientRect(); return r.width > 0 && r.left >= -1 && r.right <= innerWidth + 1; }), JSON.stringify(await ev(page, () => { const r = document.querySelector('[data-text-size-popover="read"]').getBoundingClientRect(); return [r.left, r.right, r.width, innerWidth, document.querySelector('[data-text-size-toggle="read"]').getAttribute("aria-expanded")]; })));
    const setSize = async (v) => { await ev(page, (v) => { const s = document.querySelector('[data-text-size-slider="ar"][data-text-size-for="read"]'); s.value = String(v); s.dispatchEvent(new Event("input", { bubbles: true })); s.dispatchEvent(new Event("change", { bubbles: true })); }, v); await settle(page, 300); };
    await setSize(1.6); const big = await arSize();
    await setSize(0.8); const small = await arSize();
    check(`${t}: larger makes the rendered Arabic bigger, smaller makes it smaller (${small} < ${base} < ${big})`, small < base && base < big);
    await setSize(9);
    const stored = await ev(page, () => parseFloat(localStorage.getItem("mm_text_size_ar")));
    check(`${t}: the size stops at its upper limit (stored ${stored} <= 1.6, rendered ${await arSize()} <= ${big})`, stored <= 1.6 && (await arSize()) <= big + 0.01);
    await setSize(-4);
    check(`${t}: the size stops at its lower limit (stored ${await ev(page, () => localStorage.getItem("mm_text_size_ar"))} >= 0.8)`, (await ev(page, () => parseFloat(localStorage.getItem("mm_text_size_ar")))) >= 0.8 && (await arSize()) >= small - 0.01);
    await ev(page, () => document.querySelector('[data-text-size-reset="read"]').click()); await settle(page, 300);
    check(`${t}: Reset brings the original size back`, Math.abs((await arSize()) - base) < 0.01);
  });

  // 9: mark words — known / unknown, remembered.
  await flow("markwords", lang, width, null, async (t, page) => {
    await openRead(page); await openOptions(page);
    const state = () => ev(page, () => ({ p: [...document.querySelectorAll("[data-mark-words-mode]")].map((b) => b.dataset.markWordsMode + ":" + b.getAttribute("aria-pressed")).join(), ls: localStorage.getItem("mm_mark_words_mode"), labels: [...document.querySelectorAll("[data-mark-words-mode]")].map((b) => b.textContent.trim()) }));
    const s0 = await state();
    check(`${t}: POSITIVE CONTROL Fewer (auto) is the default`, s0.p === "fewer:true,known:false,unknown:false", s0.p);
    for (const mode of ["known", "unknown"]) {
      await ev(page, (m) => document.querySelector(`[data-mark-words-mode="${m}"]`).click(), mode); await settle(page, 300);
      const s = await state();
      check(`${t}: choosing ${mode} presses it and stores it`, s.p.includes(`${mode}:true`) && s.ls === mode, JSON.stringify(s));
    }
    await page.reload(); await page.waitForTimeout(1500);
    await ev(page, () => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await ev(page, () => document.getElementById("tabStudyBtn").click()); await ev(page, () => document.getElementById("tabStudyOptionsBtn").click()); await settle(page, 400);
    const s2 = await state();
    check(`${t}: after a reload Unknown is still chosen`, s2.p.includes("unknown:true"), JSON.stringify(s2));
    if (lang === "bn") check(`${t}: the three labels are in Bangla`, s2.labels.every((l) => BN.test(l)), s2.labels.join(" | "));
  });

  // 10: Al-Fātiḥah count and Mark this reading complete.
  await flow("fatiha+complete", lang, width, null, async (t, page) => {
    await openRead(page);
    await setSelect(page, "readSurahSelect", 1); await settle(page, 800);
    const opts = () => ev(page, () => [...document.getElementById("readAyahSelect").options].map((o) => o.textContent.trim()));
    const on = await opts();
    await openOptions(page);
    check(`${t}: POSITIVE CONTROL the Al-Fātiḥah switch starts on`, await ev(page, () => document.getElementById("fatihaCountToggle").checked && localStorage.getItem("mm_fatiha_bismillah_unnumbered") !== "0"));
    await setCheck(page, "fatihaCountToggle", false); await settle(page, 800);
    const off = await opts();
    check(`${t}: Al-Fātiḥah count off changes the numbering and is stored (${on.length} -> ${off.length} options)`, JSON.stringify(on) !== JSON.stringify(off) && await ev(page, () => localStorage.getItem("mm_fatiha_bismillah_unnumbered") === "0"), JSON.stringify([on, off]));
    await setCheck(page, "fatihaCountToggle", true); await settle(page, 800);
    check(`${t}: and back on restores it`, JSON.stringify(await opts()) === JSON.stringify(on));
    await closePanel(page);
    // Mark this reading complete: one evidence write, the button confirms.
    await toolsOpen(page);
    const before = await ev(page, () => window.__fsLog.length);
    await click(page, "readCompleteBtn");
    await page.waitForFunction(() => document.getElementById("readCompleteBtn").getAttribute("aria-pressed") === "true", null, { timeout: 8000 }).catch(() => {});
    const r = await ev(page, (b) => ({ pressed: document.getElementById("readCompleteBtn").getAttribute("aria-pressed"), msg: document.getElementById("readCompleteMsg").textContent, writes: window.__fsLog.slice(b).filter((x) => x.kind === "setDoc" && /^activity\//.test(x.col) && /^reading\.completed/.test(x.id)).map((x) => x.id) }), before);
    check(`${t}: ✓ Mark this reading complete writes one reading.completed record (${r.writes.join()})`, r.writes.length === 1 && /ayah:1:1/.test(r.writes[0]), JSON.stringify(r));
    check(`${t}: and says so (button pressed, message "${r.msg}")`, r.pressed === "true" && r.msg.length > 0 && (lang === "bn" ? BN.test(r.msg) : /recorded/i.test(r.msg)), JSON.stringify(r));
  });

  // 11: Unit card, end-of-unit prompt.
  await flow("unitcard+endprompt", lang, width, null, async (t, page) => {
    await openRead(page);
    await setSelect(page, "readSurahSelect", 112); await settle(page, 1500);
    await setSelect(page, "readUnitTypeSelect", "surah"); await settle(page, 1500);
    const chip = await ev(page, () => { const c = document.getElementById("readUnitChip"); const r = c.getBoundingClientRect(); return { hidden: c.hidden, w: r.width, txt: c.textContent.trim() }; });
    check(`${t}: POSITIVE CONTROL the unit chip names the unit (${chip.txt})`, !chip.hidden && chip.w > 0 && chip.txt.length > 0);
    await click(page, "readUnitChip"); await settle(page, 800);
    const card = await ev(page, () => { const c = document.querySelector("[data-unit-card]"); if (!c) return null; const r = c.getBoundingClientRect(); const x = c.querySelector("[data-unit-card-close]"); const xr = x ? x.getBoundingClientRect() : null; return { l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight, close: !!xr && xr.width > 0 && xr.left >= 0 && xr.right <= innerWidth && xr.top >= 0 && xr.bottom <= innerHeight, type: c.dataset.unitType, key: c.dataset.unitKey }; });
    check(`${t}: the unit chip opens the Unit card for this unit (${card && card.key})`, !!card && card.type === "surah" && /112/.test(card.key));
    check(`${t}: the Unit card sits inside the screen with its close button reachable`, !!card && card.l >= -1 && card.r <= card.vw + 1 && card.t >= 0 && card.close, JSON.stringify(card));
    await ev(page, () => document.querySelector("[data-unit-card-close]").click()); await settle(page, 500);
    check(`${t}: closing the Unit card leaves the Read view where it was`, await ev(page, () => !document.querySelector("[data-unit-card]") && !document.getElementById("readView").hidden && document.getElementById("readSurahSelect").value === "112"));
    // End-of-unit prompt.
    await ev(page, () => document.querySelector("[data-end-of-unit-prompt]")?.scrollIntoView({ block: "center" })); await settle(page, 300);
    const n = await ev(page, () => document.querySelectorAll("[data-end-of-unit-prompt]").length);
    check(`${t}: POSITIVE CONTROL the end-of-unit prompt shows at the end of a surah`, n === 1, String(n));
    const labels = await ev(page, () => [...document.querySelectorAll("[data-end-of-unit-prompt] [data-end-of-unit-stage]")].map((b) => b.dataset.endOfUnitStage + ":" + b.textContent.trim()));
    check(`${t}: its three buttons are Learning, Practising, Achieved`, labels.map((l) => l.split(":")[0]).join() === "learning,practising,achieved" && (lang !== "bn" || labels.every((l) => BN.test(l.split(":")[1]))), labels.join());
    const wb = await ev(page, () => window.__stubWriteData?.length || 0);
    await ev(page, () => document.querySelector('[data-end-of-unit-stage="practising"]').click()); await settle(page, 900);
    const done = await ev(page, (wb) => ({ saved: document.querySelector(".end-of-unit-saved")?.textContent.trim(), w: (window.__stubWriteData || []).slice(wb).filter((w) => w.col === "records").map((w) => JSON.stringify(w.data)) }), wb);
    check(`${t}: pressing Practising saves it for the surah and says "Saved"`, !!done.saved && done.w.some((d) => /surah:112/.test(d) && /practising/.test(d)), JSON.stringify(done));
    await ev(page, () => document.querySelector("[data-end-of-unit-close]").click()); await settle(page, 300);
    check(`${t}: its × closes the prompt`, await ev(page, () => document.querySelectorAll("[data-end-of-unit-prompt]").length === 0));
  });

  // 11: quick buttons for plain readers (the Read contents route, full screen).
  await flow("quickbuttons", lang, width, null, async (t, page) => {
    const btn = await ev(page, () => ((document.getElementById("readHeadBtn")?.getBoundingClientRect().width ?? 0) > 0 ? "#readHeadBtn" : "#readContentsBtn"));
    await page.click(btn);
    await page.waitForFunction(() => document.querySelectorAll("#readContentsBody .rc-row").length > 0, null, { timeout: 8000 });
    await page.click('#readContentsBody .rc-row[data-rc-kind="surah"][data-rc-n="112"]');
    await page.waitForFunction(() => document.body.classList.contains("immersive-read"), null, { timeout: 8000 });
    await settle(page, 800);
    const labels = await ev(page, () => [...document.querySelectorAll("#readQuickRow .rq-btn")].map((b) => ({ txt: b.textContent.trim(), w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height, inView: b.getBoundingClientRect().bottom <= innerHeight + 1 && b.getBoundingClientRect().right <= innerWidth + 1 })));
    check(`${t}: POSITIVE CONTROL three quick buttons are on screen`, labels.length === 3 && labels.every((l) => l.w > 0 && l.h >= 30 && l.inView), JSON.stringify(labels));
    if (lang === "bn") check(`${t}: their labels are Bangla`, labels.every((l) => BN.test(l.txt)), labels.map((l) => l.txt).join());
    await click(page, "readQuickNoteBtn"); await settle(page, 1200);
    check(`${t}: Notes opens the notes pane`, await ev(page, () => document.getElementById("readNotesBtn").getAttribute("aria-expanded") === "true" || !!document.querySelector("#readNotePane, .read-note-pane, [data-read-note-pane]")));
    await click(page, "readNotesBtn"); await settle(page, 500);
    await click(page, "readQuickTrackBtn"); await settle(page, 900);
    check(`${t}: Record opens the Unit card`, await ev(page, () => !!document.querySelector("[data-unit-card]")));
    await ev(page, () => document.querySelector("[data-unit-card-close]")?.click()); await settle(page, 500);
    await click(page, "readQuickApproachBtn"); await settle(page, 900);
    check(`${t}: Approach opens the Approach wheel`, await ev(page, () => { const w = document.getElementById("wheelSection"); return !!w && w.getBoundingClientRect().width > 0 && !document.getElementById("wheelPopupView").hidden; }));
  });

  // 12: no English left on these controls in Bangla.
  if (lang === "bn") await flow("bn-no-english", lang, width, null, async (t, page) => {
    await openRead(page); await toolsOpen(page);
    const words = (s) => (s || "").replace(/[A-Za-z]{1,2}±|A±/g, "").match(/[A-Za-z]{3,}/g) || [];
    const bar = await ev(page, () => [...document.querySelectorAll("#readBar button, #readBar select, #readBar [aria-label]")].flatMap((e) => [e.textContent, e.getAttribute("aria-label"), e.getAttribute("title")]).filter(Boolean));
    const offenders = [...new Set(bar.flatMap(words))];
    check(`${t}: Read bar controls carry no English words (${offenders.join(", ") || "none"})`, offenders.length === 0);
    await openOptions(page);
    const opt = await ev(page, () => [...document.querySelectorAll("#readingViewCard label, #readingViewCard h4, #fullScreenHides label, #markWordsControl, #presetBar, #endOfUnitPromptControl, #fatihaCountControl")].filter((e) => e.closest("[data-i18n-skip]") === null).map((e) => { const c = e.cloneNode(true); c.querySelectorAll("[data-i18n-skip],[lang=ar]").forEach((x) => x.remove()); return c.textContent; }));
    const off2 = [...new Set(opt.flatMap(words))];
    check(`${t}: Study options reading controls carry no English words (${off2.join(", ") || "none"})`, off2.length === 0);
  });
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
