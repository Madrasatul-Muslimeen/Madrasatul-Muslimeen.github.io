// Audit part 144 (issue #1377): the v13 Note at large text (100/150/200%) and in the night look. REPORT ONLY: no app file changes.
// Surfaces: qr-note (shared Note window opened with a long title), notes.html, journey-map.html, journey-map.html?embed=1&new=1.
// Night look: <html data-card-look="night"> is the default; the suite sets localStorage mm_card_look="night" and asserts the attribute.
// Large text: the app has no text-size setting, so the reader's browser setting is modelled by html{font-size:N%}.
// Checks: (fit) no sideways scroll, no control cut by a clipping ancestor or the viewport, no nowrap+ellipsis label cut;
//         (night) rendered text contrast vs real background (window.__A11Y.contrast, part 142's helper).
// Run from repo root with node serve.js on 8080:
//   node tools/i18n-verify/note-window-large-night-browser.mjs [--page=qr-note|notes|journey|journey-new] [--width=390] [--lang=bn] [--scale=200] [--shots]
//   --mutate=fit | --mutate=night   (each must FAIL)
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) pass++; else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const MUTATE = arg("mutate"), SHOTS = process.argv.includes("--shots");
const OUT = "tools/i18n-verify/out/note-window-large-night"; fs.mkdirSync(OUT, { recursive: true });
const WIDTHS = [[360, 740], [390, 844], [768, 1024], [820, 1180], [1024, 768], [1180, 820], [1440, 900]].filter(([w]) => !arg("width") || String(w) === arg("width"));
const LANGS = ["en", "bn"].filter((l) => !arg("lang") || l === arg("lang"));
const SCALES = [100, 150, 200].filter((s) => !arg("scale") || String(s) === arg("scale"));
const src = fs.readFileSync("tools/i18n-verify/shared-tools-a11y-browser.mjs", "utf8");
const ia = src.indexOf("const INSTALL = "), ib = src.indexOf("\n};\n", ia);
const INSTALL = (0, eval)("(" + src.slice(ia + 16, ib + 3).replace(/;\s*$/, "") + ")");
const T120 = "A very long Note title that a real reader writes: the reasons for patience and gratitude in 2:153-157, with a six deep folder path and more words past 120";
const T120_BN = "একটি খুব দীর্ঘ নোটের শিরোনাম: ২:১৫৩-১৫৭ আয়াতে ধৈর্য ও কৃতজ্ঞতার কারণসমূহ, ছয় স্তরের ফোল্ডার পথসহ এবং আরও অনেক কথা যা একশো বিশ অক্ষরের বেশি হয়";
const SEED = 'window.__stubApplyBatches = true; window.__stubRecordTxData = true; localStorage.setItem("mm_card_look","night");';
const NOISE = /ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i;

// in-page fit probe: problems for one document; rootSel limits it to the Note window's own subtree
const FIT = (rootSel) => {
  const root = document.querySelector(rootSel) || document.body, out = [];
  const vw = innerWidth;
  const desc = (e) => e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/)[0] : "");
  const shown = (e) => { for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const c = getComputedStyle(x); if (x.hidden || c.display === "none" || c.visibility === "hidden") return false; if (x.tagName === "DETAILS" && !x.open && !(e.tagName === "SUMMARY" && e.parentElement === x)) return false; } const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const de = document.documentElement;
  if (de.scrollWidth > vw + 1) out.push("sideways scroll: document " + de.scrollWidth + " > viewport " + vw);
  for (const e of root.querySelectorAll("button, a[href], select, input:not([type=hidden]), textarea, summary, [role=button]")) {
    if (!shown(e)) continue;
    const r = e.getBoundingClientRect();
    for (let p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const c = getComputedStyle(p);
      const clipX = /(hidden|clip)/.test(c.overflowX), clipY = /(hidden|clip)/.test(c.overflowY);
      if (!clipX && !clipY) continue;
      const pr = p.getBoundingClientRect();
      if ((clipX && (r.left < pr.left - 1 || r.right > pr.right + 1)) || (clipY && (r.top < pr.top - 1 || r.bottom > pr.bottom + 1))) { out.push("control " + desc(e) + " is cut by " + desc(p)); break; }
    }
    let scrollable = false;
    for (let p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) if (/(auto|scroll)/.test(getComputedStyle(p).overflowX) && p.scrollWidth > p.clientWidth + 1) { scrollable = true; break; }
    if (!scrollable && (r.right > vw + 1 || r.left < -1)) out.push("control " + desc(e) + " leaves the viewport sideways (" + Math.round(r.left) + ".." + Math.round(r.right) + " of " + vw + ")");
  }
  for (const e of root.querySelectorAll("*")) {
    const c = getComputedStyle(e);
    // UPDATED IN PLACE (v13.09, the Architect, audit 144 D3): a cut label whose `title` carries its whole text is the accepted
    // shape for the Note window's bar title (the full title is also the window's name and stands in the Note below).
    const whole = (e.textContent || "").trim(), tip = (e.getAttribute("title") || "").trim();
    if (c.textOverflow === "ellipsis" && c.whiteSpace === "nowrap" && e.scrollWidth > e.clientWidth + 1 && shown(e) && whole && !(tip && whole.endsWith(tip))) out.push("label " + desc(e) + " is cut by ellipsis (" + e.scrollWidth + " > " + e.clientWidth + "): " + e.textContent.trim().slice(0, 30));
  }
  return [...new Set(out)];
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const findings = new Map();
const add = (k, m, w) => { const key = k + "|" + m; const e = findings.get(key) || { k, m, w: new Set() }; e.w.add(w); findings.set(key, e); };
const SCALE_CSS = (s) => "html{font-size:" + s + "% !important}";

async function measure(tag, where, P, E, scoped, scale) {
  await E.evaluate(INSTALL, scoped ? "#noteOpener:not([hidden])" : "#none");
  if (MUTATE === "fit") await E.evaluate(() => { const d = document.createElement("div"); d.id = "inj-wide"; d.style.cssText = "width:3000px;height:20px"; document.body.appendChild(d); });
  if (MUTATE === "night") await E.evaluate(() => { const p = document.createElement("p"); p.textContent = "Injected grey on grey line"; p.style.cssText = "position:fixed;top:60px;left:10px;margin:0;color:#999;background:#aaa;font-size:16px;z-index:9999"; document.body.appendChild(p); });
  const look = await E.evaluate(() => document.documentElement.getAttribute("data-card-look"));
  check(tag + ": night look is on (positive control)", look === "night", "data-card-look=" + look);
  const fit = await E.evaluate(FIT, scoped ? "#noteOpener" : "body");
  check(tag + ": (fit) nothing cut, no sideways scroll", fit.length === 0, "\n      " + fit.slice(0, 3).join("\n      "));
  fit.forEach((m) => add("DEFECT fit", tag.split(" / ")[0] + ": " + m.replace(/\d+/g, "N"), where + "@" + scale));
  if (scoped) await E.evaluate(() => { for (const e of document.body.children) if (e.id !== "noteOpener") { e.dataset.a11yPrevVis = e.style.visibility; e.style.visibility = "hidden"; } });
  const con = await E.evaluate(() => window.__A11Y.contrast());
  if (scoped) await E.evaluate(() => { for (const e of document.body.children) if (e.id !== "noteOpener" && "a11yPrevVis" in e.dataset) { e.style.visibility = e.dataset.a11yPrevVis; delete e.dataset.a11yPrevVis; } });
  const bad = con.fail.map((c) => c.key + ' "' + c.txt + '" ' + c.ratio + ":1 (need " + c.need + ") " + c.fg + " on " + c.bg);
  check(tag + ": (night) all text meets its ratio", bad.length === 0, "\n      " + bad.slice(0, 3).join("\n      "));
  bad.forEach((m) => add("DEFECT night-contrast", tag.split(" / ")[0] + ": " + m, where + "@" + scale));
}

// ---- positive controls built correct by construction: a clean fixture passes, a defective one is reported ----
{
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 844 }, extraSeedJs: SEED });
  const { page: P } = await openPage(ctx, "/app/notes.html"); await P.waitForTimeout(1200);
  await P.evaluate(INSTALL, "#none");
  await P.evaluate(() => { document.body.innerHTML = '<div id="fx" style="width:300px"><button style="height:44px">Short</button><span style="display:block;width:100px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">tiny</span></div>'; });
  check("positive control (fit): a clean fixture reports nothing", (await P.evaluate(FIT, "#fx")).length === 0);
  await P.evaluate(() => { document.getElementById("fx").insertAdjacentHTML("beforeend", '<span id="cutlabel" style="display:block;width:60px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">a label that is far too long for its box</span><div style="width:80px;overflow:hidden"><button style="width:200px;height:40px">Wide</button></div>'); });
  const f = await P.evaluate(FIT, "#fx");
  check("positive control (fit): a cut label is reported", f.some((m) => m.includes("cutlabel")));
  check("positive control (fit): a control cut by a clipping parent is reported", f.some((m) => m.includes("is cut by")));
  await P.evaluate(() => { document.body.innerHTML = '<p style="color:#fff;background:#0b1530;font-size:16px">Light on navy line</p><p style="color:#999;background:#aaa;font-size:16px">Grey on grey line</p>'; });
  const c = await P.evaluate(() => window.__A11Y.contrast());
  check("positive control (night): grey-on-grey is reported, light-on-navy is not", c.fail.some((x) => x.txt.includes("Grey on grey")) && !c.fail.some((x) => x.txt.includes("Light on navy")));
  await ctx.close();
}

async function openNote(P, lang) {
  await P.waitForTimeout(1200);
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await P.evaluate(async ({ title, label }) => {
    const m = await import("/app/js/note-opener.js");
    const ref = await m.loadRefFor("ayah", "2:255");
    m.openNewNote({ ref, unitKey: "ayah:2:255", unitLabel: label, title, backLabel: "Back", count: 3, onOpenExisting: () => {} });
  }, { title: lang === "bn" ? T120_BN : T120, label: (lang === "bn" ? T120_BN : T120).slice(0, 60) });
  const el = await P.waitForSelector("#noteOpener:not([hidden]) iframe", { timeout: 15000 });
  let f = null;
  for (let i = 0; i < 150 && !f; i++) { const c = await el.contentFrame(); if (c && /embed=1&new=1/.test(c.url())) f = c; else await P.waitForTimeout(100); }
  if (!f) throw new Error("Note frame did not load");
  await f.waitForSelector("[data-nn-tool]", { timeout: 25000 });
  await P.waitForTimeout(600);
  return f;
}
const PAGES = [{ id: "qr-note", path: "/app/quranrevival.html" }, { id: "notes", path: "/app/notes.html" }, { id: "journey", path: "/app/journey-map.html" }, { id: "journey-new", path: "/app/journey-map.html?embed=1&new=1" }]
  .filter((p) => !arg("page") || arg("page") === p.id);
for (const [w, h] of WIDTHS) for (const lang of LANGS) for (const scale of SCALES) for (const pg of PAGES) {
  const tag = pg.id + " / " + w + " / " + lang + " / " + scale + "%", where = w + lang;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page: P, errors } = await openPage(ctx, pg.path);
  try {
    let F = null;
    if (pg.id === "qr-note") F = await openNote(P, lang);
    else { await P.waitForTimeout(pg.id === "notes" ? 1000 : 2000); await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove())); }
    await P.addStyleTag({ content: SCALE_CSS(scale) });
    if (F) await F.evaluate((c) => { const s = document.createElement("style"); s.textContent = c; document.head.appendChild(s); }, SCALE_CSS(scale));
    await P.waitForTimeout(400);
    if (pg.id === "qr-note") { await measure(tag + " [window chrome]", where, P, P, true, scale); await measure(tag + " [Note page]", where, P, F, false, scale); }
    else await measure(tag, where, P, P, false, scale);
    if (SHOTS && [390, 1180].includes(w) && scale === 200) await P.screenshot({ path: OUT + "/" + pg.id + "-" + w + "-" + lang + "-" + scale + ".png" });
    const pe = errors.filter((e) => !NOISE.test(e));
    check(tag + ": no page errors", pe.length === 0, pe.slice(0, 2).join(" | "));
  } catch (e) { check(tag + ": the view opened (positive control)", false, String(e.message).slice(0, 160)); }
  await ctx.close();
}
fs.writeFileSync(OUT + "/findings.json", JSON.stringify([...findings.values()].map((f) => ({ ...f, w: [...f.w] })), null, 1));
console.log("\n=== findings (kind | measurement | width+language@scale) ===");
let n = 0; for (const f of findings.values()) console.log("  #" + (++n) + " " + f.k + " | " + f.m.slice(0, 220) + " | " + [...f.w].slice(0, 6).join(",") + (f.w.size > 6 ? "...(" + f.w.size + ")" : ""));
console.log("\n" + pass + " passed, " + fail + " failed");
await browser.close();
process.exit(fail ? 1 : 0);
