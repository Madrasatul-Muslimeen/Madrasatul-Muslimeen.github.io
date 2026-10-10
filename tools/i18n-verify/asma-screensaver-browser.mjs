// The Asma ul Husna screensaver (Owner, 10 Oct 2026, master file tab 3): it starts by itself when a page is left
// alone, shows the template posters with the chosen timing, never covers a reader who is typing or listening, closes
// back to exactly where the reader was, and has its settings in every page's Home menu. Nothing of it loads until it
// starts (load-speed contract: "Screensaver -- on first use").
// Run from the repository root, serve.js on :8080. 390px Bangla and 1280px English.
//   --mutate=noarm   about.html no longer arms the watcher        -> the start-by-itself checks fail
//   --mutate=nohold  the watcher ignores what the reader is doing -> the "held" checks fail
//   --mutate=eager   the watcher imports the screensaver at once  -> the load-on-first-use check fails
// Round 2 (#736):
//   --mutate=nostudy   "Ones I'm studying" ignores the records          -> 5a fails
//   --mutate=nogroup   a group choice shows every Name                  -> 5b fails
//   --mutate=nocorr    other pages use the bundled 99, no corrections   -> 5c fails
//   --mutate=noopen    "Open this Name" drops the way back (back=1)     -> 5e fails
//   --mutate=nohide    the settings' [hidden] rule is dropped      -> the tick list shows under "All"
//   --mutate=earlyread the watcher reads the madrasah's data at startup -> 5f fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  noarm: ["about.html", "    armScreensaver();\n", "\n"],
  nohold: ["js/screensaver-idle.js", "export function screensaverHeld(doc = document) {\n", "export function screensaverHeld(doc = document) {\n  return false;\n"],
  eager: ["js/screensaver-idle.js", "const KEY = \"mm_screensaver\";", "import \"./asma-screensaver.js\";\nconst KEY = \"mm_screensaver\";"],
  nostudy: ["js/asma-screensaver.js", 'if (settings.which === "studying" && studied) {', "if (false) {"],
  nogroup: ["js/asma-screensaver.js", 'if (settings.which === "group") {', "if (false) {"],
  nocorr: ["js/asma-screensaver.js", "entries = entries || data.entries;", "entries = entries || null;"],
  noopen: ["js/asma-screensaver.js", "&back=1`;", "`;"],
  nohide: ["js/asma-screensaver.js", "\n#mmSaverSettings [hidden]{display:none!important}", ""],
  earlyread: ["js/screensaver-idle.js", "  if (armed) return;\n  armed = true;\n", '  if (armed) return;\n  armed = true;\n  import("./asma-screensaver.js").then((m) => m.loadScreensaverData());\n'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const quiet = (errs) => errs.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|fonts\.g|Failed to load resource/i.test(e));
const FAST = { idleMin: 0.17, eachSec: 5, kind: "tpl", order: "seq", clock: true, night: "same", move: "fade" }; // ~10 s idle

async function ctxWith(browser, lang, width, { allow = true, settings = FAST } = {}) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 844 }, allowScreensaver: allow });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (settings) await ctx.addInitScript((s) => { try { if (!localStorage.getItem("mm_screensaver")) localStorage.setItem("mm_screensaver", JSON.stringify(s)); } catch {} }, settings);
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  return ctx;
}
const saverOn = (P) => P.evaluate(() => { const s = document.getElementById("mmSaver"); return !!s && s.getClientRects().length > 0; });
const waitSaver = (P, on, ms) => P.waitForFunction((o) => { const s = document.getElementById("mmSaver"); return o ? !!s : !s; }, on, { timeout: ms }).then(() => true).catch(() => false);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [lang, width] of [["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`;
  // 1. Left alone, about.html starts the screensaver by itself, and only then loads it.
  {
    const ctx = await ctxWith(browser, lang, width);
    const loaded = [];
    ctx.on("request", (r) => { if (/asma-screensaver\.js|asma-posters\.js|asma-poster\.js/.test(r.url())) loaded.push({ url: r.url(), at: Date.now() }); });
    const { page: P, errors } = await openPage(ctx, "/app/about.html");
    await P.waitForTimeout(1500);
    check(`${tag} 1a nothing of the screensaver is loaded at startup`, loaded.length === 0, JSON.stringify(loaded.map((l) => l.url.split("/").pop())));
    check(`${tag} 1b the page starts uncovered`, !(await saverOn(P)));
    const started = await waitSaver(P, true, 16000);
    check(`${tag} 1c left alone, it starts by itself`, started && (await saverOn(P)));
    await P.waitForTimeout(1600);
    const s1 = await P.evaluate(() => {
      const s = document.getElementById("mmSaver"), r = s?.querySelector(".mms-slide.on .ahp")?.getBoundingClientRect();
      return { title: s?.querySelector(".mms-slide.on [data-poster-title]")?.textContent, clock: s?.querySelector(".mms-clock")?.textContent,
        inView: !!r && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1, w: r?.width };
    });
    check(`${tag} 1d it shows a template poster (Ar-Rahman first, in order)`, s1.title === "Ar-Rahman", JSON.stringify(s1));
    check(`${tag} 1e the whole poster is on screen`, s1.inView && s1.w > 200, JSON.stringify(s1));
    check(`${tag} 1f the clock shows the time`, /\d/.test(s1.clock || ""), s1.clock);
    check(`${tag} 1g the screensaver code loaded only when it started`, loaded.some((l) => /asma-screensaver\.js/.test(l.url)));
    await P.waitForTimeout(5200);
    const t2 = await P.evaluate(() => document.querySelector("#mmSaver .mms-slide.on [data-poster-title]")?.textContent);
    check(`${tag} 1h after "5 sec" the next poster shows`, t2 === "Ar-Rahim", t2);
    // Controls on a touch, then Escape closes it and the page is as it was.
    await P.mouse.click(Math.round(width / 2), 300);
    await P.waitForTimeout(200);
    const ctl = await P.evaluate(() => { const c = document.querySelector("#mmSaver .mms-ctl"); return { on: document.getElementById("mmSaver")?.classList.contains("ctl"), op: c && getComputedStyle(c).opacity, labels: [...(c?.querySelectorAll("button") ?? [])].map((b) => b.getAttribute("aria-label") || b.textContent.trim()) }; });
    check(`${tag} 1i a touch shows the controls`, ctl.on && Number(ctl.op) > 0, JSON.stringify(ctl));
    if (lang === "bn") check(`${tag} 1j the controls speak Bangla`, ctl.labels.some((l) => /[ঀ-৿]/.test(l)), JSON.stringify(ctl.labels));
    const url = P.url();
    await P.keyboard.press("Escape");
    const closed = await waitSaver(P, false, 3000);
    check(`${tag} 1k Escape closes it, back on the same page`, closed && P.url() === url, P.url());
    check(`${tag} 1l "carry on" remembers the last Name shown`, (await P.evaluate(() => JSON.parse(localStorage.getItem("mm_screensaver") || "{}").pos)) >= 1);
    check(`${tag} 1m no page errors`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
    await ctx.close();
  }
  // 2. Typing, or a sound playing, holds it off; and the test harness's own switch keeps it off.
  {
    const ctx = await ctxWith(browser, lang, width);
    const { page: P } = await openPage(ctx, "/app/about.html");
    await P.evaluate(() => { const i = document.createElement("input"); i.id = "ssProbe"; document.body.prepend(i); i.focus(); });
    const typing = await waitSaver(P, true, 14000);
    check(`${tag} 2a not while the reader is in a text box`, !typing);
    await P.evaluate(() => { document.getElementById("ssProbe").blur(); const d = document.createElement("div"); d.setAttribute("data-screensaver-hold", ""); document.body.append(d); });
    const held = await waitSaver(P, true, 14000);
    check(`${tag} 2b not while the page holds it (writing, a recitation)`, !held);
    await ctx.close();
    const ctx2 = await ctxWith(browser, lang, width, { allow: false });
    const { page: P2 } = await openPage(ctx2, "/app/about.html");
    check(`${tag} 2c the harness's switch keeps it off in every other suite`, !(await waitSaver(P2, true, 14000)));
    await ctx2.close();
  }
  // 3. Settings from the Home menu: every choice is kept on this device, and the card fits the screen.
  {
    const ctx = await ctxWith(browser, lang, width, { settings: { on: false } });
    const { page: P, errors } = await openPage(ctx, "/app/about.html");
    const btn = await P.evaluate(() => { const b = document.querySelector("[data-screensaver-settings]"); return b ? b.textContent.trim() : null; });
    check(`${tag} 3a the Home menu has 🌙 Screensaver`, !!btn && (lang === "bn" ? /স্ক্রিনসেভার/.test(btn) : /Screensaver/.test(btn)), btn);
    await P.evaluate(() => document.querySelector("[data-screensaver-settings]")?.click());
    const open = await P.waitForFunction(() => document.getElementById("mmSaverSettings"), null, { timeout: 8000 }).then(() => true).catch(() => false);
    check(`${tag} 3b it opens the settings`, open);
    const st = await P.evaluate(() => {
      const c = document.querySelector("#mmSaverSettings .mmss-card"), r = c?.getBoundingClientRect();
      return { fits: !!r && r.left >= 0 && r.right <= innerWidth, text: c?.innerText || "", groups: [...document.querySelectorAll("#mmSaverSettings .mmss-seg")].map((s) => s.dataset.k) };
    });
    check(`${tag} 3c the card fits the screen`, st.fits);
    check(`${tag} 3d every setting is offered`, ["idleMin", "eachSec", "kind", "which", "order", "move", "night", "where"].every((k) => st.groups.includes(k)), st.groups.join(","));
    if (lang === "bn") check(`${tag} 3e the settings speak Bangla`, /প্রতিটি পোস্টার দেখাবে/.test(st.text) && !/Each poster shows for/.test(st.text), st.text.slice(0, 120));
    await P.evaluate(() => document.querySelector('#mmSaverSettings [data-k="eachSec"] [data-v="30"]')?.click());
    await P.evaluate(() => document.querySelector('#mmSaverSettings [data-k="which"] [data-v="fav"]')?.click());
    await P.evaluate(() => { const i = document.querySelector('#mmSaverSettings [data-names] input[value="5"]'); if (i) { i.checked = true; i.dispatchEvent(new Event("change", { bubbles: true })); } });
    const saved = await P.evaluate(() => JSON.parse(localStorage.getItem("mm_screensaver") || "{}"));
    check(`${tag} 3f choices are kept on this device`, saved.eachSec === 30 && saved.which === "fav" && (saved.fav || []).includes(5), JSON.stringify(saved));
    await P.evaluate(() => document.querySelector('#mmSaverSettings [data-mmss="preview"]')?.click());
    await waitSaver(P, true, 8000);
    await P.waitForTimeout(1500);
    const only = await P.evaluate(() => document.querySelector("#mmSaver .mms-slide.on [data-poster-title]")?.textContent);
    check(`${tag} 3g ▶ Start now shows the Names chosen (5 only)`, only === "As-Salam", only);
    await P.evaluate(() => document.querySelector('#mmSaver [data-mms="close"]')?.click());
    check(`${tag} 3h ✕ Close closes it`, await waitSaver(P, false, 3000));
    check(`${tag} 3i no page errors`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
    await ctx.close();
  }
}
// 4. The Asma page's own Screensaver button opens the same screensaver, with that page's Names.
{
  const ctx = await ctxWith(browser, "en", 1280, { settings: { on: false, kind: "tpl", order: "seq" } });
  const { page: P, errors } = await openPage(ctx, "/app/asma-study.html");
  await P.waitForFunction(() => document.getElementById("screensaverBtn")?.getBoundingClientRect().width > 0, null, { timeout: 15000 }).catch(() => {});
  await P.click("#screensaverBtn");
  const on = await waitSaver(P, true, 10000);
  await P.waitForTimeout(1500);
  const t = await P.evaluate(() => document.querySelector("#mmSaver .mms-slide.on [data-poster-title]")?.textContent);
  check("[asma] 4a the Asma page's Screensaver button opens it", on && !!t, t);
  check("[asma] 4b the old overlay is gone (one screensaver, not two)", !(await P.evaluate(() => document.getElementById("screensaverOverlay"))));
  check("[asma] 4c no page errors", quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
  await ctx.close();
}
// 5. Round 2: "Ones I'm studying", the madrasah's groups, its corrections on every page, and "Open this Name".
{
  const SEED = `
  DATA.records.find((r) => r._id === "t1__p1__subject_asma_ul_husna").entries["name:3::studied_asma"] = { unitType: "name", subjectId: "asma_ul_husna", trackableId: "studied_asma", claimedStatus: "learning", claimedByPersonId: "p1", confirmedStatus: null, confirmState: "pending", domainIds: [], notes: "" };
  DATA.asmaCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, schemaVersion: 1,
    collections: [
      { id: "g1", title: { en: "Mercy group" }, kind: "group", badge: "", order: 10, status: "active", items: ["name:2", "name:4"] },
      { id: "a1", title: { en: "ACT" }, kind: "cls_act", badge: "", order: 20, status: "active", items: ["name:5"] } ],
    extraNames: [], nameOverrides: {}, nameOverridesEn: { "1": "Zzcorrected Mercy" }, nameRefOverrides: {} }];`;
  const titles = async (P, n) => {
    const out = [];
    for (let k = 0; k < n; k++) {
      await P.waitForTimeout(150);
      out.push(await P.evaluate(() => document.querySelector("#mmSaver .mms-stage .mms-slide:last-child [data-poster-title]")?.textContent));
      await P.keyboard.press("ArrowRight");
    }
    return out;
  };
  const begin = async (settings) => {
    const ctx = await newContext(browser, { appLang: "en", banner: false, viewport: { width: 1280, height: 844 }, allowScreensaver: true, extraSeedJs: SEED });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    await ctx.addInitScript((st) => { try { localStorage.setItem("mm_screensaver", JSON.stringify({ idleMin: 30, eachSec: 60, kind: "tpl", order: "seq", clock: false, night: "same", ...st })); } catch {} }, settings);
    if (MUTATE) {
      const [file, a, b] = MUT[MUTATE];
      await ctx.route(`**/app/${file}*`, async (r) => {
        const src = fs.readFileSync(`app/${file}`, "utf8");
        if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
        await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) });
      });
    }
    const { page: P, errors } = await openPage(ctx, "/app/about.html");
    await P.waitForTimeout(800);
    return { ctx, P, errors };
  };
  const start = async (P) => { await P.evaluate(() => import("/app/js/screensaver-idle.js").then((m) => m.startScreensaver())); await waitSaver(P, true, 8000); await P.waitForTimeout(500); };
  const reads = (P) => P.evaluate(() => window.__fsLog.filter((r) => r.col === "asmaCollections").length);

  { // 5f nothing new is read before the screensaver starts
    const { ctx, P } = await begin({ which: "studying" });
    const before = await reads(P);
    check("[5f] no madrasah Names document is read before the screensaver starts", before === 0, String(before));
    await start(P);
    const after = await reads(P);
    check("[5f] it is read once, when the screensaver starts", after === 1, String(after));
    await ctx.close();
  }
  { // 5a studied only
    const { ctx, P } = await begin({ which: "studying" });
    await start(P);
    const got = await titles(P, 4);
    check("[5a] \"Ones I'm studying\" shows only the studied Names (1 and 3), then round again", JSON.stringify(got) === JSON.stringify(["Ar-Rahman", "Al-Malik", "Ar-Rahman", "Al-Malik"]), JSON.stringify(got));
    await ctx.close();
  }
  { // 5b a group
    const { ctx, P } = await begin({ which: "group", group: "g1" });
    await start(P);
    const got = await titles(P, 3);
    check("[5b] a group choice shows only that group's Names (2 and 4)", JSON.stringify(got) === JSON.stringify(["Ar-Rahim", "Al-Quddus", "Ar-Rahim"]), JSON.stringify(got));
    await ctx.close();
  }
  { // 5b2 the settings offer the lists
    const { ctx, P } = await begin({ which: "all" });
    await P.evaluate(() => document.querySelector("[data-screensaver-settings]")?.click());
    await P.waitForFunction(() => document.querySelectorAll("#mmSaverSettings [data-group] option").length >= 2, null, { timeout: 8000 }).catch(() => {});
    const opts = await P.evaluate(() => [...document.querySelectorAll("#mmSaverSettings [data-group] option")].map((o) => o.textContent));
    const offered = await P.evaluate(() => [...document.querySelectorAll('#mmSaverSettings [data-k="which"] button')].map((b) => b.dataset.v));
    // The [hidden] trap (CLAUDE.md): .mmss-names sets display:flex, so only an explicit rule keeps the tick list off
    // screen while "All" is chosen. Rendered boxes, not the attribute.
    const shown = await P.evaluate(() => ({ names: document.querySelector("#mmSaverSettings [data-names]")?.getClientRects().length ?? -1, group: document.querySelector("#mmSaverSettings [data-group]")?.getClientRects().length ?? -1 }));
    check("[5b] with \"All\" chosen, neither the tick list of Names nor the group picker is on screen", shown.names === 0 && shown.group === 0, JSON.stringify(shown));
    check("[5b] the settings offer \"studying\" and \"group\", and every active list (Group and ACT)", offered.includes("studying") && offered.includes("group") && opts.length === 2 && opts.some((o) => /Mercy group/.test(o)) && opts.some((o) => /ACT/.test(o)), JSON.stringify({ offered, opts }));
    await ctx.close();
  }
  { // 5c corrected English meaning on a page that is not the Asma page; 5e open this Name
    const { ctx, P } = await begin({ which: "all" });
    await start(P);
    const txt = await P.evaluate(() => document.querySelector("#mmSaver .mms-slide:last-child")?.innerText || "");
    check("[5c] the madrasah's corrected English meaning shows on another page (about)", /Zzcorrected Mercy/.test(txt), txt.slice(0, 160));
    await P.keyboard.press("ArrowRight"); await P.keyboard.press("ArrowRight");
    await P.waitForTimeout(300);
    await P.evaluate(() => document.getElementById("mmSaver").classList.add("ctl"));
    await P.evaluate(() => document.querySelector('#mmSaver [data-mms="open"]')?.click());
    await P.waitForURL(/asma-study\.html/, { timeout: 8000 }).catch(() => {});
    check("[5e] \"Open this Name\" goes to that Name (3) with back=1", /asma-study\.html\?name=3&back=1/.test(P.url()), P.url());
    await P.waitForFunction(() => document.getElementById("asmaBackBtn") && getComputedStyle(document.getElementById("app")).display !== "none", null, { timeout: 15000 }).catch(() => {});
    await P.waitForTimeout(800);
    const pg = await P.evaluate(() => ({ back: !!document.getElementById("asmaBackBtn")?.getClientRects().length, detail: document.getElementById("detailContainer")?.innerText.slice(0, 200) || "" }));
    check("[5e] the Name's card is open and a visible ← Back is there", pg.back && /Malik/i.test(pg.detail), JSON.stringify(pg));
    await P.click("#asmaBackBtn");
    await P.waitForURL(/about\.html/, { timeout: 8000 }).catch(() => {});
    check("[5e] ← Back returns to the page the reader was on", /about\.html/.test(P.url()), P.url());
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Asma screensaver: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
