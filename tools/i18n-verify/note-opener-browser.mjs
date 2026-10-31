// J108 (v13.01, the Owner: "Q2:A. Q3. Build it."; demo v3) -- the shared Note opener (js/note-opener.js), measured.
//   A. Study ▸ Notes opens a NEW blank Note at once: the window is the whole screen below 1024px and a floating window,
//      moved by its bar and resized from its corner, from 1024px; the Note's toolbar is ONE line of six buttons
//      (← 🗂 📎 🔍 ✏️ ⋯), each at least 40x40 with a name, words beside the icons only from 640px; ← Back closes it and
//      the page underneath is exactly as it was (no reload, the same address, the same scroll, the focus back on Notes).
//   B. The Āyah card's 📝 Note opens a new Note on 15:32 with the Āyah inside it and the title "Quran 15:32 - Al-Hijr:";
//      it is started on the āyah (a noteSources write); pressing EN off changes the STORED bodyHtml (the block's state);
//      ← Back reopens the Āyah card on 15:32.
//   C. 📎 Attach adds 2:255; with two blocks one switch hides them both.
//   D. A hostile block is rebuilt clean by the real sanitiser (DOMPurify in the page).
// Widths 360 390 768 820 1024 1180 1440, English and Bangla. Screenshots: --shots=DIR. Run from the repository root with
// `node serve.js` on :8080 (or QR_BASE). Every mutation (--mutate=NAME) must make the suite exit 1:
//   small    the toolbar buttons are 30px high                      -> "A toolbar: every button is at least 40x40"
//   wrap     the toolbar wraps and shows its words at every width   -> "A toolbar: one line"
//   full     the window floats from 600px                            -> "A window: the whole screen"
//   float    the window is the whole screen at every width          -> "A window: floats"
//   back     closing does not run the way back                       -> "B ← Back reopens the Āyah card"
//   toggle   a language button does not change the block's state    -> "B EN off is in the stored bodyHtml"
//   allsw    the all-blocks switch does nothing                      -> "C the one switch hides both"
//   sanitize the sanitiser keeps a block's inside as it came         -> "D a hostile block is rebuilt clean"
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate"), SHOTS = arg("shots");
const ONLY = arg("widths") ? arg("widths").split(",").map(Number) : null;
const MUT = {
  small: ["journey-map.html", "height: 44px; min-height: 44px; padding: 0; box-sizing: border-box;", "height: 30px; min-height: 30px; padding: 0; box-sizing: border-box;"],
  wrap: ["journey-map.html", "html.new-mode .nn-lbl { display: none; font-size: 0.95rem; }", "html.new-mode .nn-lbl { display: inline; font-size: 0.95rem; } html.new-mode #notePane [data-pane-bar] { flex-wrap: wrap !important; } html.new-mode #notePane [data-pane-bar] > .nn-tb { flex: 0 0 auto !important; padding: 0 12px !important; }"],
  full: ["js/note-opener.js", "export const WINDOW_FROM = 1024;", "export const WINDOW_FROM = 600;"],
  float: ["js/note-opener.js", "export const WINDOW_FROM = 1024;", "export const WINDOW_FROM = 99999;"],
  back: ["js/note-opener.js", "  else if (runOnClosed) fn?.();", "  else if (false) fn?.();"],
  toggle: ["js/note-ref-ui.js", '  el.setAttribute("data-mmsa-ref", serializeRefState(s));\n}', "}"],
  allsw: ["js/note-ref-ui.js", "        if (s && s.flags.on !== on) paintBlock(b, toggleRefFlag(s, \"on\"));", "        void s;"],
  sanitize: ["js/note-sanitize.js", "    el.innerHTML = refStaticHtml(state);\n", ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const WIDTHS = ONLY ?? [360, 390, 768, 820, 1024, 1180, 1440];
const H = 800;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function setup(lang, width) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: H }, extraSeedJs: "window.__stubApplyBatches = true; window.__stubRecordTxData = true;" });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
const opener = (page) => page.evaluate(() => { const w = document.getElementById("noteOpener"); if (!w || w.hidden) return null; const r = w.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), full: w.classList.contains("no-full"), handles: [...w.querySelectorAll(".no-h")].filter((h) => getComputedStyle(h).display !== "none").length }; });
async function frameOf(page) {
  const el = await page.waitForSelector("#noteOpener:not([hidden]) iframe", { timeout: 8000 });
  for (let i = 0; i < 100; i++) { const f = await el.contentFrame(); if (f && /journey-map\.html\?embed=1&new=1/.test(f.url())) return f; await page.waitForTimeout(100); }
  return el.contentFrame();
}
const writesIn = (f) => f.evaluate(() => {
  return (window.__stubWriteData || []).map((w) => ({ col: w.col, data: w.data })); // the values (__stubRecordTxData)
});
async function dragBy(page, from, dx, dy) {
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 4 });
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 4 }); await page.mouse.up();
}
const blockState = (html) => { const m = /data-mmsa-ref="([^"]*)"/.exec(html || ""); if (!m) return null; try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&")); } catch { return null; } };

for (const lang of ["en", "bn"]) for (const width of WIDTHS) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== ${tag} ===`);
  // ---------------------------------------------------------------- A. Study ▸ Notes
  {
    const { ctx, page, errors } = await setup(lang, width);
    await page.evaluate(() => { window.__marker = "kept"; });
    const url0 = page.url();
    if (!(await page.evaluate(() => document.getElementById("tabNoteBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(200); }
    const scroll0 = await page.evaluate(() => scrollY);
    await page.click("#tabNoteBtn");
    const f = await frameOf(page).catch(() => null);
    await f?.waitForSelector("[data-edit-body]", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(500);
    const o = await opener(page);
    check(`${tag} A Study ▸ Notes opens the opener at once`, !!o, JSON.stringify(o));
    const made = f ? (await writesIn(f)).filter((w) => w.col === "notes" && w.data && "bodyHtml" in w.data) : [];
    check(`${tag} A it is a NEW Note: one notes write, blank, no Āyah`, made.length === 1 && !/data-mmsa-ref/.test(made[0].data.bodyHtml || ""), JSON.stringify(made.map((w) => w.data?.title)));
    if (width < 1024) check(`${tag} A window: the whole screen`, o && o.full && o.x === 0 && o.y === 0 && o.w === width && o.h === H && o.handles === 0, JSON.stringify(o));
    else {
      check(`${tag} A window: floats, inside the screen, with 8 handles`, o && !o.full && o.x > 0 && o.w < width && o.x + o.w <= width && o.y + o.h <= H && o.handles === 8, JSON.stringify(o));
      if (o && !o.full) {
        await dragBy(page, { x: o.x + 120, y: o.y + 20 }, -40, 20);
        const o2 = await opener(page);
        check(`${tag} A window: floats and moves by its bar`, o2 && o2.x === o.x - 40 && o2.y === o.y + 20 && o2.w === o.w, JSON.stringify([o, o2]));
        const se = await page.evaluate(() => { const r = document.querySelector('#noteOpener .no-h[data-h="se"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
        await dragBy(page, se, -60, -50);
        const o3 = await opener(page);
        check(`${tag} A window: floats and resizes from its corner`, o3 && o3.w === o2.w - 60 && o3.h === o2.h - 50 && o3.x === o2.x, JSON.stringify([o2, o3]));
      }
    }
    const tb = f ? await f.evaluate(() => {
      const bar = document.querySelector("#notePane [data-pane-bar]");
      const items = [...bar.children].filter((e) => e.getBoundingClientRect().width > 0).map((e) => {
        const b = e.matches("button") ? e : e.querySelector("button"), r = b.getBoundingClientRect();
        return { k: e.dataset.nnTool || "more", w: r.width, h: r.height, top: Math.round(r.top), name: b.getAttribute("aria-label") || "", lbl: e.querySelector(".nn-lbl") ? getComputedStyle(e.querySelector(".nn-lbl")).display : "-" };
      });
      return { items, over: bar.scrollWidth > bar.clientWidth + 1, doc: document.documentElement.scrollWidth > innerWidth + 1, frameW: innerWidth };
    }) : null;
    check(`${tag} A toolbar: the six ← 🗂 📎 🔍 ✏️ ⋯ in order`, tb && tb.items.map((x) => x.k).join() === "back,folders,attach,search,edit,more", JSON.stringify(tb?.items.map((x) => x.k)));
    check(`${tag} A toolbar: one line, nothing cut or scrolled sideways`, tb && new Set(tb.items.map((x) => x.top)).size === 1 && !tb.over && !tb.doc, JSON.stringify(tb?.items.map((x) => x.top)));
    check(`${tag} A toolbar: every button is at least 40x40`, tb && tb.items.every((x) => x.w >= 40 && x.h >= 40), JSON.stringify(tb?.items.map((x) => `${x.k}:${Math.round(x.w)}x${Math.round(x.h)}`)));
    check(`${tag} A toolbar: every button has a name${lang === "bn" ? " (in Bangla)" : ""}`, tb && tb.items.every((x) => x.name && (lang === "en" || /[ঀ-৿]/.test(x.name))), JSON.stringify(tb?.items.map((x) => x.name)));
    const wordsOn = tb && tb.items.filter((x) => x.k !== "more").every((x) => x.lbl !== "none" && x.lbl !== "-"), wordsOff = tb && tb.items.filter((x) => x.k !== "more").every((x) => x.lbl === "none");
    check(`${tag} A toolbar: words beside the icons ${tb?.frameW >= 640 ? "shown (640px and up)" : "hidden (below 640px)"}`, tb && (tb.frameW >= 640 ? wordsOn : wordsOff), JSON.stringify(tb?.items.map((x) => x.lbl)));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/opener-study-${width}-${lang}.png` });
    await f?.click('[data-nn-tool="back"]').catch(() => {});
    await page.waitForFunction(() => document.getElementById("noteOpener")?.hidden, null, { timeout: 8000 }).catch(() => {});
    const after = await page.evaluate(() => ({ hidden: document.getElementById("noteOpener").hidden, marker: window.__marker, y: scrollY, focus: document.activeElement?.id }));
    check(`${tag} A ← Back closes it; the page is as it was (same address, no reload, same scroll)`, after.hidden && after.marker === "kept" && page.url() === url0 && after.y === scroll0, JSON.stringify(after));
    // Notes sits in the Study menu, which closes when it is chosen: the focus goes back to Notes if it is on screen, else to Study.
    check(`${tag} A ← Back puts the focus back on Notes (or on Study, whose menu holds it)`, after.focus === "tabNoteBtn" || after.focus === "tabStudyBtn", after.focus);
    check(`${tag} A no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::/.test(String(e))).length === 0, JSON.stringify(errors).slice(0, 300));
    await ctx.close();
  }
  // ---------------------------------------------------------------- B. the Āyah card, 15:32
  {
    const { ctx, page: P } = await setup(lang, width);
    const ev = (fn, a) => P.evaluate(fn, a);
    if (!(await ev(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
    await P.click("#tabReadBtn"); await P.waitForTimeout(400);
    await ev(() => { const s = document.getElementById("surahSelect"); s.value = "15"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await P.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:15:"]'), null, { timeout: 15000 }).catch(() => {});
    await ev(() => { const el = document.getElementById("ayahSelect"); el.value = "32"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await P.waitForTimeout(900);
    await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await ev(() => document.querySelector('[data-ayah-num-badge="15:32"]')?.click());
    await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 }).catch(() => {});
    await P.waitForTimeout(300);
    await P.click("[data-ayah-sheet] [data-ayah-sheet-note]").catch(() => {});
    const f = await frameOf(P).catch(() => null);
    await f?.waitForSelector("[data-edit-body] .mm-ref .mm-ref-sw", { timeout: 20000 }).catch(() => {});
    await P.waitForTimeout(500);
    const surahBn = lang === "bn" ? await ev(() => document.querySelector('#surahSelect option[value="15"]')?.textContent.replace(/^[\d০-৯]+\.\s*/, "").trim()) : null;
    const want = lang === "en" ? "Quran 15:32 - Al-Hijr:" : `কুরআন ১৫:৩২ - ${surahBn}:`;
    const st = f ? await f.evaluate(() => ({ title: document.querySelector("[data-edit-title]")?.value, n: document.querySelectorAll("[data-edit-body] .mm-ref").length, sw: document.querySelector("[data-edit-body] .mm-ref .mm-ref-sw")?.getAttribute("role"), langs: [...document.querySelectorAll("[data-edit-body] .mm-ref [data-ref-lang]")].map((b) => `${b.dataset.refLang}:${b.getAttribute("aria-pressed")}`).join(), x: !!document.querySelector("[data-edit-body] .mm-ref [data-ref-x]"), ce: document.querySelector("[data-edit-body] .mm-ref")?.getAttribute("contenteditable") })) : {};
    check(`${tag} B the new Note's title is "${want}"`, st.title === want, st.title);
    check(`${tag} B the Note starts with the Āyah block: a switch, عربي · EN · বাং (each pressed), ✕, not editable text`, st.n === 1 && st.sw === "switch" && st.langs === "ar:true,en:true,bn:true" && st.x && st.ce === "false", JSON.stringify(st));
    const w0 = f ? await writesIn(f) : [];
    const src = w0.filter((w) => w.col === "noteSources" && w.data?.sourceKey).pop();
    check(`${tag} B it is started on the āyah (a noteSources link to ayah:15:32)`, src?.data?.sourceKey === "ayah:15:32", JSON.stringify(src?.data ?? null).slice(0, 200));
    const first = w0.filter((w) => w.col === "notes" && w.data && "bodyHtml" in w.data).pop();
    check(`${tag} B the block is in the Note's first write (bodyHtml, no other field)`, blockState(first?.data?.bodyHtml)?.id === "ayah:15:32", (first?.data?.bodyHtml || "").slice(0, 160));
    if (SHOTS) await P.screenshot({ path: `${SHOTS}/opener-ayah-${width}-${lang}.png` });
    // ------------------------------------------------------------ D. the real sanitiser, once per language
    if (width === 360 && f) {
      const d = await f.evaluate(async () => { // inside the Note page, which loads the real DOMPurify
        const { sanitizeNoteHtml } = await import("/app/js/note-sanitize.js");
        const hostile = `<div data-mmsa-ref='{"kind":"ayah","id":"ayah:1:1","label":"<b>One</b>","text":{"ar":"بِسْمِ","en":"In the name <b>x</b>","bn":""},"flags":{"on":true,"ar":true,"en":true,"bn":"yes"}}' onclick="alert(2)" style="color:red" class="evil"><script>alert(3)</script><a href="javascript:alert(4)">x</a><img src=x onerror=alert(5)><b>INNERTEXT</b></div>`
          + `<div data-mmsa-ref='{"kind":"ayah","id":"topic-salah","label":"x","text":{"en":"y"}}'>GONETEXT</div><span data-mmsa-ref='{"kind":"ayah","id":"ayah:1:1","label":"x","text":{"en":"y"}}'>SPANTEXT</span>`;
        const out = sanitizeNoteHtml(hostile);
        const t = document.createElement("template"); t.innerHTML = out;
        const blocks = t.content.querySelectorAll("[data-mmsa-ref]");
        const b = blocks[0];
        return { out, n: blocks.length, attrs: b ? [...b.attributes].map((a) => a.name).sort().join() : "", cls: b?.getAttribute("class"), inner: b ? [...b.querySelectorAll("*")].map((e) => e.tagName).join() : "", state: b ? JSON.parse(b.getAttribute("data-mmsa-ref")) : null };
      });
      const bad = /<script|onerror|onclick|javascript:|<img|<a |INNERTEXT|GONETEXT|SPANTEXT|evil|color:red/i.test(d.out);
      check(`${tag} D a hostile block is rebuilt clean: one block, its own three attributes, no markup from inside, no bad id or tag`,
        !bad && d.n === 1 && d.attrs === "class,contenteditable,data-mmsa-ref" && d.cls === "mm-ref" && /^(DIV|SPAN|B|P)(,(DIV|SPAN|B|P))*$/.test(d.inner),
        JSON.stringify(d).slice(0, 400));
      check(`${tag} D the state itself is cleaned (no "<" in the label, flags only true/false)`, d.state && !/[<>]/.test(d.state.label) && d.state.flags.bn === true && typeof d.state.flags.en === "boolean", JSON.stringify(d.state));
    }
    await f?.click('[data-edit-body] .mm-ref [data-ref-lang="en"]').catch(() => {});
    await P.waitForTimeout(200);
    await f?.evaluate(() => window.postMessage({ type: "mmsa-journey-flush" }, location.origin)).catch(() => {});
    await P.waitForTimeout(1200);
    const w1 = f ? await writesIn(f) : [];
    const last = w1.filter((w) => w.data && typeof w.data.bodyHtml === "string" && /data-mmsa-ref/.test(w.data.bodyHtml)).pop();
    const s1 = blockState(last?.data?.bodyHtml);
    check(`${tag} B EN off is in the stored bodyHtml (the block's state), Arabic and Bangla still on`, s1 && s1.flags.en === false && s1.flags.ar === true && s1.flags.bn === true && s1.flags.on === true, JSON.stringify(s1?.flags ?? null));
    check(`${tag} B no control was stored: the saved block holds only its text`, last && !/<button|role="switch"|data-ref-/.test(last.data.bodyHtml), (last?.data?.bodyHtml || "").slice(0, 200));
    await f?.click('[data-nn-tool="back"]').catch(() => {});
    await P.waitForFunction(() => document.getElementById("noteOpener")?.hidden && document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
    const back = await ev(() => ({ hidden: document.getElementById("noteOpener")?.hidden, card: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), ref: document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent }));
    check(`${tag} B ← Back reopens the Āyah card on 15:32`, back.hidden && back.card && /15:32|১৫:৩২/.test(back.ref || ""), JSON.stringify(back));
    // ------------------------------------------------------------ C. 📎 Attach 2:255, then the one switch (two widths)
    if (width === 390 || width === 1180) {
      await P.click("[data-ayah-sheet] [data-ayah-sheet-note]").catch(() => {});
      const g = await frameOf(P).catch(() => null);
      await g?.waitForSelector("[data-edit-body] .mm-ref .mm-ref-sw", { timeout: 20000 }).catch(() => {});
      await g?.click('[data-nn-tool="attach"]').catch(() => {});
      await P.waitForSelector("#noteOpener [data-no-attach-input]", { timeout: 5000 }).catch(() => {});
      await P.fill("#noteOpener [data-no-attach-input]", lang === "bn" ? "২:২৫৫" : "2:255").catch(() => {});
      await P.click("#noteOpener [data-no-attach-go]").catch(() => {});
      await g?.waitForFunction(() => document.querySelectorAll("[data-edit-body] .mm-ref").length === 2, null, { timeout: 8000 }).catch(() => {});
      const two = g ? await g.evaluate(() => ({ ids: [...document.querySelectorAll("[data-edit-body] .mm-ref")].map((b) => JSON.parse(b.getAttribute("data-mmsa-ref")).id), all: !!document.querySelector("[data-ref-allbar] [data-ref-all]"), allIn: !!document.querySelector("[data-edit-body] [data-ref-allbar]") })) : {};
      check(`${tag} C 📎 Attach 2:255 adds a second block, and one switch appears above them (outside the text)`, JSON.stringify(two.ids) === '["ayah:15:32","ayah:2:255"]' && two.all && !two.allIn, JSON.stringify(two));
      if (SHOTS) await P.screenshot({ path: `${SHOTS}/opener-two-${width}-${lang}.png` });
      await g?.click("[data-ref-allbar] [data-ref-all]").catch(() => {});
      await P.waitForTimeout(200);
      const off = g ? await g.evaluate(() => [...document.querySelectorAll("[data-edit-body] .mm-ref")].map((b) => JSON.parse(b.getAttribute("data-mmsa-ref")).flags.on)) : [];
      check(`${tag} C the one switch hides both`, off.length === 2 && off.every((x) => x === false), JSON.stringify(off));
      await g?.click('[data-nn-tool="back"]').catch(() => {});
      await P.waitForTimeout(800);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`\nnote-opener-browser: ${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
