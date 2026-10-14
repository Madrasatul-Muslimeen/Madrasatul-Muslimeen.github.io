// Audit part 2 (PCF J29 follow-on): Mapping My Journey, Bookmarks (Manage bookmarks) and the Hadith page pickers.
// Measured on the rendered page, en/bn x 390 / 820 / 1440: every listed button / picker >= 40x40 (checkboxes count
// through their 40px label), nothing scrolls sideways, no label is cut by an ellipsis, no page error.
// Mutations: --mutate=<name>, each restores one defect and must make this suite FAIL.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const JM = "app/journey-map.html", BM = "app/bookmarks.html", HD = "app/hadith-study.html";
const MUTATIONS = {
  "view-toggle": [JM, ".view-toggle-btn { min-height: 40px; } /* audit2 view-toggle */", ".view-toggle-btn { min-height: 0; } /* audit2 view-toggle */"],
  "search": [JM, "#folderSearchInput { box-sizing: border-box; min-height: 40px; }", "#folderSearchInput { min-height: 0; }"],
  "textsize": [JM, "box-sizing: border-box; min-width: 40px; min-height: 40px; } /* audit2 textsize */", "box-sizing: border-box; min-width: 0; min-height: 0; } /* audit2 textsize */"],
  "check": [JM, ".folder-toolbar-check { min-height: 40px; }", ".folder-toolbar-check { min-height: 0; }"],
  "newfolder": [JM, "box-sizing: border-box; min-height: 40px; } /* audit2 newfolder */", "box-sizing: border-box; min-height: 0; } /* audit2 newfolder */"],
  "newfolder-btn": [JM, "#newFolderForm button { flex: 0 0 auto; min-height: 40px; }", "#newFolderForm button { flex: 0 0 auto; min-height: 0; }"],
  "menu": [JM, "#openTrashBtn, .page-menu-wrap .bar-palette a { box-sizing: border-box; min-height: 40px;", "#openTrashBtn, .page-menu-wrap .bar-palette a { box-sizing: border-box; min-height: 0;"],
  "bm-toolbar": [BM, "#newFolderRow > button, #groupBySelect { box-sizing: border-box; min-height: 40px; }", "#newFolderRow > button, #groupBySelect { box-sizing: border-box; min-height: 0; }"],
  "bm-rows": [BM, "box-sizing: border-box; min-height: 40px; min-width: 40px; } /* audit2 bm-rows */", "box-sizing: border-box; min-height: 0; min-width: 0; } /* audit2 bm-rows */"],
  "bm-label": [BM, "display: inline-flex; align-items: center; gap: 0.4rem; min-height: 40px; }", "display: inline-flex; align-items: center; gap: 0.4rem; min-height: 0; }"],
  "hadith-pickers": [HD, "#contextBar select { box-sizing: border-box; min-height: 40px; }", "#contextBar select { box-sizing: border-box; min-height: 0; }"],
};
const browser = await chromium.launch();

async function open(url, lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, from, to] = MUTATIONS[MUTATE] || (() => { throw new Error(`no such mutation ${MUTATE}`); })();
    if (url === "/" + file) {
      const body = fs.readFileSync(file, "utf8");
      if (!body.includes(from)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await ctx.route(`**${url}*`, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body.split(from).join(to) }));
    }
  }
  const { page } = await openPage(ctx, url);
  await page.waitForTimeout(1200);
  return { ctx, page };
}
// Every listed selector must exist; a checkbox is measured through its enclosing label.
const boxes = (page, sels) => page.evaluate((list) => list.map((s) => {
  const els = [...document.querySelectorAll(s)].map((e) => (e.matches("input[type=checkbox]") ? e.closest("label") || e : e))
    .map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
  return { s, n: els.length, bad: els.filter((r) => r.height < 39.5 || r.width < 39.5).map((r) => `${Math.round(r.width)}x${Math.round(r.height)}`) };
}), sels);
const need = (tag, rs) => { for (const r of rs) check(`${tag} ${r.s}: ${r.n} found, each >= 40x40`, r.n > 0 && r.bad.length === 0, r.bad.join(", ")); };
const hygiene = async (tag, page) => {
  const h = await page.evaluate(() => ({
    ov: document.documentElement.scrollWidth - innerWidth,
    cut: [...document.querySelectorAll("button,select,label,summary")].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && cs.textOverflow === "ellipsis" && e.scrollWidth > e.clientWidth + 1; }).map((e) => (e.textContent || "").trim().slice(0, 20)),
  }));
  check(`${tag} nothing scrolls sideways (${h.ov})`, h.ov <= 0);
  check(`${tag} no ellipsis-cut label`, h.cut.length === 0, h.cut.join(", "));
};

for (const lang of ["en", "bn"]) for (const width of [390, 820, 1440]) {
  const tag = `${lang} ${width}px`;
  { // Mapping My Journey
    const { ctx, page } = await open("/app/journey-map.html", lang, width);
    try {
      check(`${tag} journey: POSITIVE CONTROL page is ${lang}`, (await page.evaluate(() => document.documentElement.lang === "bn")) === (lang === "bn"));
      need(`${tag} journey`, await boxes(page, [".view-toggle-btn", "#folderSearchInput", "#folderShowNumbers", "#folderTextSizeDown", "#folderTextSizeUp", "#newFolderName", "#newFolderForm button"]));
      await page.click(".page-menu-wrap .bar-palette-toggle"); await page.waitForTimeout(300);
      need(`${tag} journey page menu`, await boxes(page, ["#openFavouritesBtn", "#openArchivedBtn", "#openTrashBtn", ".page-menu-wrap .bar-palette a"]));
      const inside = await page.evaluate(() => { const r = document.querySelector("[data-bar-palette=pageMenu]").getBoundingClientRect(); return r.left >= -0.5 && r.right <= innerWidth + 0.5 && r.top >= 0; });
      check(`${tag} journey page menu opens inside the screen`, inside);
      await hygiene(`${tag} journey`, page);
    } catch (e) { check(`${tag} journey: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
    await ctx.close();
  }
  { // Bookmarks
    const { ctx, page } = await open("/app/bookmarks.html", lang, width);
    try {
      need(`${tag} bookmarks`, await boxes(page, ["#newBookmarkBtn", "#newFolderBtn", "#groupBySelect", "#showRetiredCk", ".bm-row button", ".bm-row select"]));
      await hygiene(`${tag} bookmarks`, page);
    } catch (e) { check(`${tag} bookmarks: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
    await ctx.close();
  }
  { // Hadith
    const { ctx, page } = await open("/app/hadith-study.html", lang, width);
    try {
      need(`${tag} hadith`, await boxes(page, ["#personSelect"]));
      await hygiene(`${tag} hadith`, page);
    } catch (e) { check(`${tag} hadith: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
