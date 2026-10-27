// PCF MSA J102 (the Owner, 28 Oct 2026 5:44 am Sydney, a phone screenshot of the Word Card for 64:4:8 تُسِرُّونَ, Root
// tab, the block under the root family box circled): "Enable the marked section 20% bigger, more eye-catching, noticeable,
// elegant looking." The block is the "From the data" line (the root's meaning and how often it is used) and "How the root
// grows: its N meanings" with its chips. This suite measures it on the Root tab at 360, 390, 768, 820, 1024, 1180 and 1440,
// English and Bangla, on the card's Night and Light looks:
//   - the meaning line, the heading and the chips are about 20% bigger than before (font size, chip height);
//   - the block is one calm panel on the card, distinct from it (its own background and border), with the root's meaning
//     marked;
//   - every piece of text reads at >= 4.5:1 against the colour really behind it;
//   - nothing is outside the card or cut, and the chips wrap as a tidy group (every chip whole, rows left-aligned);
//   - the root family box and the rest of the tab are where they were.
// Mutations (each must fail it): small (the old font sizes), nopanel (no panel), lightchip (the old light chips on Night),
//   nomark (the meaning not marked).
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
const CARD = "app/js/quran-word-card.js", PAGE = "app/quranrevival.html";
const MUT = {
  small: [PAGE, ".word-card-root-panel .word-card-root-meaning-line { font-size: 1.2rem;", ".word-card-root-panel .word-card-root-meaning-line { font-size: 1rem;"],
  nopanel: ["app/js/word-card-depth.js", 'class="word-card-root-panel" data-word-card-root-panel', 'class="word-card-root-panelx" data-word-card-root-panel'],
  lightchip: [PAGE, '  [data-card-look="night"] .word-card-grow-chip { background: rgba(201, 162, 75, 0.1); color: #F2E8D5; border-color: rgba(201, 162, 75, 0.45); }\n', ""],
  nomark: [PAGE, "  .word-card-root-panel [data-word-card-root-meaning] { color: var(--card-heading); font-weight: 800; }\n", ""],
};
// Before J102 (measured on main at v12.81, 28 Oct 2026, 64:4:8, every width and both languages alike): the meaning line
// 16px, the heading 14.08px, the chips 13.12px and 24.4px tall (25.4 in Bangla).
const BEFORE = { line: 16, head: 14.08, chip: 13.12, chipH: 24.375 };
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const WIDTHS = arg("width") ? [Number(arg("width"))] : [360, 390, 768, 820, 1024, 1180, 1440];
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const SHOTS = process.env.SHOT_DIR || "";
const TAG = arg("tag") || "after";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function start(lang, width, at = [1, 5, 2]) {
  const [su, ay, po] = at;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 780 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    const body = fs.readFileSync(file, "utf8");
    if (!body.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    const js = file.endsWith(".js");
    const glob = js ? `**/${file.replace(/^app\//, "")}*` : "**/app/quranrevival.html*";
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: js ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(a).join(b) }));
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(500);
  if (su !== 1) { await page.evaluate((n) => { const s = document.getElementById("surahSelect"); s.value = String(n); s.dispatchEvent(new Event("change", { bubbles: true })); }, su); await page.waitForTimeout(1500); }
  await page.evaluate((n) => { const s = document.getElementById("ayahSelect"); if (s && s.value !== String(n)) { s.value = String(n); s.dispatchEvent(new Event("change", { bubbles: true })); } }, ay);
  const occ = `:${su}:${ay}:${po}`;
  await page.waitForFunction((o) => !!document.querySelector(`[data-word-occurrence$="${o}"]`), occ, { timeout: 8000 }).catch(() => {});
  await page.evaluate((o) => document.querySelector(`[data-word-occurrence$="${o}"]`)?.click(), occ);
  await page.waitForFunction(() => !!document.querySelector("#quranWordCardMount [data-word-card-meaning-bar]"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
  return { ctx, page, errors };
}
async function settled(page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming?.().iterations === Infinity), null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(100);
}

const block = (page) => page.evaluate(() => {
  const card = document.querySelector("#quranWordCardMount .quran-word-card");
  const fam = card.querySelector("[data-word-card-root-family]");
  const panel = card.querySelector("[data-word-card-root-panel]");
  const line = card.querySelector(".word-card-root-meaning-line") ?? (fam ? fam.querySelectorAll('[data-word-card-dline="data"]')[0] : null);
  const grows = card.querySelector("[data-word-card-root-grows]");
  const h = grows?.querySelector("h4"), chips = grows ? [...grows.querySelectorAll("[data-word-card-grow-chip]")] : [];
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  const fs = (el) => el ? parseFloat(getComputedStyle(el).fontSize) : 0;
  const famBox = fam?.querySelector("[data-word-card-fam]");
  const ps = panel ? getComputedStyle(panel) : null;
  // Tidy wrap: chips in rows; each row starts at the row container's left edge, no chip cut or outside the panel.
  const box = R(grows?.querySelector(".word-card-grow-chips")), cr = chips.map(R);
  const rows = []; for (const c of cr) { const row = rows.find((x) => Math.abs(x.t - c.t) < 3); if (row) row.items.push(c); else rows.push({ t: c.t, items: [c] }); }
  const rowStarts = rows.map((r) => Math.min(...r.items.map((c) => c.l)) - (box?.l ?? 0));
  const cut = chips.filter((c) => c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1).length;
  const pr = R(panel), cardR = R(card);
  return {
    hasPanel: !!panel, panelHoldsBoth: !!panel && !!line && panel.contains(line) && !!grows && panel.contains(grows),
    panelBg: ps?.backgroundColor ?? "", panelBorder: ps ? parseFloat(ps.borderInlineStartWidth || ps.borderLeftWidth) : 0, panelRadius: ps ? parseFloat(ps.borderTopLeftRadius) : 0,
    lineFs: fs(line), headFs: fs(h), chipFs: chips.length ? fs(chips[0]) : 0, chipH: chips.length ? Math.min(...cr.map((c) => c.h)) : 0, n: chips.length,
    markColor: line?.querySelector("[data-word-card-root-meaning]") ? getComputedStyle(line.querySelector("[data-word-card-root-meaning]")).color : "", lineColor: line ? getComputedStyle(line).color : "",
    rows: rows.length, rowStarts, cut, chipsInside: !!pr && cr.every((c) => c.l >= pr.l - 0.5 && c.r <= pr.r + 0.5),
    panelInCard: !!pr && !!cardR && pr.l >= cardR.l - 0.5 && pr.r <= cardR.r + 0.5,
    famAbove: !!famBox && !!pr && R(famBox).b <= pr.t + 0.5, over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});
// Every piece of text in the panel against the colour really behind it: translucent layers composited down to the first
// opaque one; a gradient counts as its worst stop.
const contrast = (page) => page.evaluate(() => {
  const nums = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgsOf = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const grad = cs.backgroundImage.includes("gradient") ? [...cs.backgroundImage.matchAll(/rgba?\([^)]*\)/g)].map((m) => nums(m[0])) : null;
      if (grad?.length) { layers.push({ stops: grad.map((c) => c.slice(0, 3)) }); break; }
      const c = nums(cs.backgroundColor);
      if (c.length === 3 || (c.length === 4 && c[3] === 1)) { layers.push({ stops: [c.slice(0, 3)] }); break; }
      if (c.length === 4 && c[3] > 0) layers.push({ a: c[3], c: c.slice(0, 3) });
    }
    let base = layers.length && layers[layers.length - 1].stops ? layers.pop().stops : [[255, 255, 255]];
    for (const l of layers.reverse()) base = base.map((b) => b.map((v, i) => l.c[i] * l.a + v * (1 - l.a)));
    return base;
  };
  const out = [];
  const was = document.documentElement.getAttribute("data-card-look");
  for (const look of ["night", "light"]) {
    document.documentElement.setAttribute("data-card-look", look);
    const panel = document.querySelector("#quranWordCardMount [data-word-card-root-panel]") ?? document.querySelector("#quranWordCardMount [data-word-card-root-family]");
    const els = [...panel.querySelectorAll("*")].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length);
    for (const el of els) {
      const fg = nums(getComputedStyle(el).color);
      const worst = Math.min(...bgsOf(el).map((b) => ratio(fg.slice(0, 3), b)));
      out.push({ look, cls: String(el.className).slice(0, 40) || el.tagName, r: Math.round(worst * 100) / 100 });
    }
    // How light a chip that is not this word's meaning sits on this look (0 black .. 1 white).
    const chip = panel.querySelector("[data-word-card-grow-chip]:not(.word-card-grow-chip-current)");
    if (chip) out.push({ look, chipLum: Math.round(Math.max(...bgsOf(chip).map(lum)) * 1000) / 1000 });
  }
  if (was === null) document.documentElement.removeAttribute("data-card-look"); else document.documentElement.setAttribute("data-card-look", was);
  return out;
});

for (const lang of LANGS) for (const width of WIDTHS) {
  const { ctx, page, errors } = await start(lang, width, [64, 4, 8]);
  await page.click('#quranWordCardMount [data-word-card-level="intermediate"]').catch(() => {});
  await page.waitForFunction(() => !!document.querySelector("#quranWordCardMount [data-word-card-root-grows]"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  const tag = `[${lang} ${width}]`;
  const a = await block(page);
  console.log(tag, JSON.stringify(a));
  if (SHOTS) {
    await settled(page);
    await page.evaluate(() => document.querySelector("#quranWordCardMount [data-word-card-root-family]")?.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${SHOTS}/j102-${TAG}-${lang}-${width}.png` });
    // The Light card look, beside the default Night one; the look found is put back after.
    const was = await page.evaluate(() => { const w = document.documentElement.getAttribute("data-card-look"); document.documentElement.setAttribute("data-card-look", "light"); return w; });
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${SHOTS}/j102-${TAG}-${lang}-${width}-light.png` });
    await page.evaluate((w) => { if (w === null) document.documentElement.removeAttribute("data-card-look"); else document.documentElement.setAttribute("data-card-look", w); }, was);
  }
  const up = (now, was) => now / was;
  check(`${tag} the meaning line, the heading and the chips are about 20% bigger (each 1.18–1.25× its old size)`,
    [up(a.lineFs, BEFORE.line), up(a.headFs, BEFORE.head), up(a.chipFs, BEFORE.chip)].every((x) => x >= 1.18 && x <= 1.25), JSON.stringify({ line: a.lineFs, head: a.headFs, chip: a.chipFs }));
  check(`${tag} ...the chips are taller too (≥ 1.18× ${BEFORE.chipH}px)`, a.chipH >= BEFORE.chipH * 1.18, String(a.chipH));
  check(`${tag} one panel holds the root's meaning and how it grows, on its own background with a coloured edge`, a.hasPanel && a.panelHoldsBoth && !/rgba\(0, 0, 0, 0\)|transparent/.test(a.panelBg) && a.panelBorder >= 3 && a.panelRadius >= 10, JSON.stringify(a));
  check(`${tag} ...the root's meaning is marked (its own colour)`, !!a.markColor && a.markColor !== a.lineColor, JSON.stringify({ m: a.markColor, l: a.lineColor }));
  check(`${tag} ...all ${a.n} chips whole, inside the panel, in tidy rows starting at the same edge`, a.n >= 1 && a.cut === 0 && a.chipsInside && a.rowStarts.every((x) => Math.abs(x) <= 1), JSON.stringify({ n: a.n, cut: a.cut, inside: a.chipsInside, rows: a.rows, starts: a.rowStarts }));
  check(`${tag} ...the panel is inside the card, under the root family box, and nothing scrolls sideways`, a.panelInCard && a.famAbove && a.over <= 0, JSON.stringify(a));
  if (width === 390 || width === 1024) {
    const ratios = await contrast(page);
    const chipLum = ratios.filter((x) => "chipLum" in x);
    check(`${tag} ...on the Night look the chips are dark like the card (not white pills); on Light they are light`,
      chipLum.length === 2 && chipLum.find((x) => x.look === "night").chipLum < 0.1 && chipLum.find((x) => x.look === "light").chipLum > 0.6, JSON.stringify(chipLum));
    ratios.splice(0, ratios.length, ...ratios.filter((x) => "r" in x));
    const bad = ratios.filter((x) => x.r < 4.5);
    check(`${tag} every text in the panel reads at ≥ 4.5:1 on the Night and Light looks (${ratios.length} measured)`, ratios.length >= 10 && bad.length === 0, JSON.stringify(bad));
  }
  check(`${tag} no page errors`, errors.length === 0, errors.join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Word Card Root tab: the root's meaning and how it grows, 20% bigger, one elegant panel (PCF MSA J102): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
