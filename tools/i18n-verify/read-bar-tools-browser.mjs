// The Read bar's tools, as the READER has them: the bar's ONE ⋮ and its sheet (the Owner, 6 Nov 2026 "ONE ⋮ beside the āyah", J114; 9 Nov v14.09 "one Read bar").
// REWRITTEN IN PLACE on 98L's word (11 Nov 2026). Until now this suite drove the retired ⋯ menu (#readToolsBtn / #readToolsMenu), which is hidden at every width and which
// only the harness's legacyTools mode could reach. Expected values written BY HAND. Run from the repository root, serve.js on :8080.
// Assertions KEPT (re-aimed at the ⋮ sheet): the tools are folded off the bar; the sheet opens with its tiles on screen, each with its word (Bangla in Bangla), 40px+ and
// tappable; Text size opens its sliders fully on screen with the sheet staying open; Escape closes it; a tap outside closes it; choosing a tool closes it and the tool runs
// (the Writing sheet opens); the way back's slot stays on the bar, never inside the sheet; no sideways scroll, no page errors.
// Assertions DROPPED, each for a reason: "⋯ is on the bar below 900px" and "from 900px no ⋯ and six tools in a line" (the ⋯ is retired; replaced by "the old ⋯ is hidden and
// the ⋮ is on the bar at every width"); "six tiles" (the sheet has more tiles and a Study group; read-one-bar-browser owns the Study group); "A± sliders away from the A± tile
// (audit part 42)" and "the sliders' right anchor" (they belong to the retired panel's CSS; the sheet's own sliders are measured on screen instead); "📖 ⤢ ⋯ wrap together"
// (⋯ is gone; read-bar-asks-browser owns the bar's groups); "the three study buttons in the ⋯ card / last line from 600px" (now the sheet's Study group, read-one-bar-browser);
// "bare full screen keeps 📖 and ⤢, not ⋯" (owned by read-bar-bookmark-layers-browser and zab-dock-browser).
// MUTATIONS, one per tool (each must FAIL its named check):
//   --mutate=notextsize  the sheet loses Text size       --mutate=nocomplete  the sheet loses Mark complete       --mutate=nonote    the sheet loses its Notes tile
//   --mutate=noescape    the sheet loses its Escape handler    --mutate=nowriting   the sheet loses Writing sheet   --mutate=noasma      the sheet loses Attach to Asma     --mutate=nofold    the old ⋯ shows again on the bar
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const QR = "app/quranrevival.html", NR = "app/js/ayah-note-renderer.js";
const MUT = {
  notextsize: [QR, "      return textSize + tileHtml(\"complete\", \"✓\", t(\"Mark complete\"), t(\"Mark this reading complete\"));", "      return tileHtml(\"complete\", \"✓\", t(\"Mark complete\"), t(\"Mark this reading complete\"));"],
  nocomplete: [QR, "      return textSize + tileHtml(\"complete\", \"✓\", t(\"Mark complete\"), t(\"Mark this reading complete\"));", "      return textSize;"],
  nonote: [NR, "${tile(`data-qm-note${hasNote ? \"\" : \" data-qm-note-new\"}`, \"📝\", hasNote ? t(\"Notes\") : t(\"Take Note\"))}", ""],
  nowriting: [NR, "${showWriting ? tile(\"data-qm-writing\", \"✍\", t(\"Writing sheet\")) : \"\"}", ""],
  noasma: [NR, "${showAsma ? tile(\"data-qm-asma\", \"🔗\", t(\"Asma ul Husna\"), { title: t(\"Attach to Asma ul Husna\") }) : \"\"}", ""],
  noescape: [NR, "    document.addEventListener(\"keydown\", (e) => {\n      if (e.key !== \"Escape\") return;\n      const open = container.querySelector(\".quick-menu.open\");", "    document.addEventListener(\"keydown\", (e) => {\n      if (true) return;\n      const open = container.querySelector(\".quick-menu.open\");"],
  nofold: [QR, "  #readBar #readToolsBtn, #readToolsMenu { display: none !important; }", "  #readBar #readToolsBtn { display: inline-flex !important; }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SHOT_DIR = process.env.SHOT_DIR || "/tmp";
const BN = /[ঀ-৿]/;
const browser = await chromium.launch();
const SHEET = "#readQuickMenuSlot .quick-menu";

async function start(lang, width, height) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    const glob = file.endsWith(".js") ? `**/js/${file.split("/").pop()}*` : "**/app/quranrevival.html*";
    await ctx.route(glob, async (r) => {
      const src = fs.readFileSync(file, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  const ok = await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0);
  if (!ok) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await page.evaluate(() => { const m = document.getElementById("mushafToggle"); if (!m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction(() => { const r = document.getElementById("mushafPageRef"); return r && !r.hidden && r.dataset.page; }, null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(500);
  return { ctx, page, errors };
}
const wide = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.getBoundingClientRect().width ?? 0) > 0, sel);
const sheetOpen = (page) => page.evaluate((q) => !!document.querySelector(q)?.classList.contains("open"), SHEET);
const openSheet = async (page) => { if (!(await sheetOpen(page))) { await page.click("#readQuickMenuSlot .ayah-quick-btn", { timeout: 8000 }); await page.waitForTimeout(350); } };
const TOOLS = [["Text size", "[data-text-size-toggle]"], ["Mark complete", '[data-qm-act="complete"]'], ["Notes", "[data-qm-note]"], ["Writing sheet", "[data-qm-writing]"], ["Attach to Asma", "[data-qm-asma]"]];

for (const [lang, width, height] of [["en", 360, 740], ["en", 390, 844], ["bn", 390, 844], ["en", 820, 1180], ["en", 1280, 900], ["bn", 1280, 900]]) {
  const tag = `[${lang} ${width}]`;
  const { ctx, page, errors } = await start(lang, width, height);

  // ---- the bar: ONE ⋮, the tools folded off it, the old ⋯ gone
  const bar = await page.evaluate(() => ({ dots: (document.querySelector("#readQuickMenuSlot .ayah-quick-btn")?.getBoundingClientRect().width ?? 0) > 0, old: (document.getElementById("readToolsBtn")?.getBoundingClientRect().width ?? 0) > 0,
    onBar: ["readBookmarkBtn", "readNotesBtn", "readCompleteBtn", "readWritingBtn", "readAttachAsmaBtn"].filter((i) => (document.getElementById(i)?.getBoundingClientRect().width ?? 0) > 0) }));
  check(`${tag} the bar has its ONE ⋮, the old ⋯ is hidden, and no tool is left on the bar`, bar.dots && !bar.old && bar.onBar.length === 0, JSON.stringify(bar));

  // ---- the sheet's tiles
  await openSheet(page);
  const open = await page.evaluate(({ q, tools }) => {
    const m = document.querySelector(q), r = m.getBoundingClientRect();
    const one = (sel) => { const b = m.querySelector(sel); if (!b) return null; b.scrollIntoView({ block: "nearest" }); const br = b.getBoundingClientRect(); const hit = br.width ? document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2) : null; return { h: Math.round(br.height), w: Math.round(br.width), word: (b.textContent || "").replace(/\s+/g, " ").trim(), hit: !!hit && b.contains(hit) }; };
    return { open: m.classList.contains("open"), inView: r.left >= 0 && r.right <= innerWidth + 1, tiles: tools.map(([name, sel]) => [name, one(sel)]) };
  }, { q: SHEET, tools: TOOLS });
  check(`${tag} the ⋮ sheet opens on screen with all five tools: ${TOOLS.map((x) => x[0]).join(", ")}`, open.open && open.inView && open.tiles.every(([, t]) => !!t && t.w > 0), JSON.stringify(open));
  check(`${tag} ...each tile has its word (${lang === "bn" ? "in Bangla" : "in English"}), is at least 40px high and tappable`, open.tiles.every(([, t]) => t && t.word && t.h >= 40 && t.hit && (lang === "bn" ? BN.test(t.word) : /[A-Za-z]/.test(t.word))), JSON.stringify(open.tiles));
  for (const [name] of TOOLS) check(`${tag} ...the sheet has the ${name} tile`, !!open.tiles.find(([n]) => n === name)?.[1]?.w, name);
  if (lang === "bn" || width === 390) await page.screenshot({ path: `${SHOT_DIR}/read-bar-tools-${lang}-${width}.png` });

  // ---- Text size's sliders open fully on screen, the sheet staying open
  await page.click(`${SHEET} [data-text-size-toggle]`); await page.waitForTimeout(300);
  // The sheet scrolls on a short phone (360x740), so the sliders are checked once scrolled to, as a reader does.
  const pop = await page.evaluate((q) => { const p = document.querySelector(`${q} .text-size-popover.open, .text-size-popover.open`); p?.scrollIntoView({ block: "nearest" }); const r = p?.getBoundingClientRect(); return r ? { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), inView: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1, sheetOpen: !!document.querySelector(q)?.classList.contains("open") } : null; }, SHEET);
  check(`${tag} ...Text size opens its sliders fully on screen, the sheet staying open`, !!pop && pop.inView && pop.sheetOpen, JSON.stringify(pop));
  await page.click(`${SHEET} [data-text-size-toggle]`); await page.waitForTimeout(250);

  // ---- Escape and a tap outside
  await openSheet(page);
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  check(`${tag} ...Escape closes the sheet and gives the ⋮ the focus back`, !(await sheetOpen(page)) && await page.evaluate(() => document.activeElement?.classList.contains("ayah-quick-btn")));
  await openSheet(page);
  // The tap lands on the page title: a neutral spot (a tap on the reading itself would open that āyah's card, which is the app doing its job, not the sheet staying open).
  const out = await page.evaluate(() => { const r = document.querySelector("h1").getBoundingClientRect(); return { x: Math.round(r.left + Math.min(r.width / 2, 40)), y: Math.round(r.top + r.height / 2) }; });
  await page.mouse.click(out.x, out.y); await page.waitForTimeout(250);
  check(`${tag} ...a tap outside closes the sheet`, !(await sheetOpen(page)));

  // ---- choosing a tool closes the sheet and the tool runs
  await openSheet(page);
  await page.click(`${SHEET} [data-qm-writing]`); await page.waitForTimeout(500);
  check(`${tag} ...choosing Writing sheet closes the sheet and the tool runs (the Writing sheet opens)`, await page.evaluate((q) => !document.querySelector(q)?.classList.contains("open") && !!document.querySelector("[data-ws-chrome]"), SHEET));
  await page.evaluate(() => document.querySelector('[data-ws="close"]')?.click()); await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('[data-ws="close-anyway"]')?.click()); await page.waitForTimeout(300);

  check(`${tag} the way back's slot is on the bar, never inside the sheet`, await page.evaluate(() => { const s = document.getElementById("readBackSlot"); return !!s && !s.closest(".quick-menu") && !!s.closest("#readBar"); }));
  check(`${tag} no sideways scroll, no page errors`, (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0 && errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

console.log(`\n==== Read bar tools in the ⋮ sheet (rewritten 11 Nov 2026${MUTATE ? `; mutation ${MUTATE}` : ""}): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
