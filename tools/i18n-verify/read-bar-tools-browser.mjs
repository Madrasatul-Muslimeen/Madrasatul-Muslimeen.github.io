// The Read bar's ⋯ More tools and the three study buttons at a phone's foot (the Owner, 10 Oct 2026):
//   "I think all these buttons along with bookmark can be organised under one button so that a row space is saved"
//   "How about moving three buttons at the bottom of the screen?"
// Expected values written BY HAND. Run from the repository root, serve.js on :8080.
//   --mutate=nofold    below 900px the tools are not folded behind ⋯ any more   -> the fold checks fail
//   --mutate=nobottom  the study buttons stay in the bar on a phone           -> the bottom-row checks fail
//   --mutate=tsleft    the A± sliders keep their right anchor inside the panel        -> the "fully on screen" check fails
//   --mutate=nogroup   📖 ⤢ ⋯ are not one group                               -> the "wrap together" check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nofold: ["    #readToolsMenu { display: none; }\n    #readToolsMenu.open {", "    #readToolsMenu { display: contents; }\n    #readToolsMenu.open {"],
  nobottom: ["      position: fixed; left: 0.5rem; right: 0.5rem; bottom: calc(var(--rq-bottom, 0px) + 6px); z-index: 60;", "      position: static;"],
  tsleft: ["    #readToolsMenu.open .text-size-popover { left: 0; right: auto; }", "    #readToolsMenu.open .text-size-popover { }"],
  nogroup: ["  #readBarEnd { display: flex; align-items: center; gap: inherit; margin-left: auto; flex: 0 0 auto; }", "  #readBarEnd { display: contents; }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SHOT_DIR = process.env.SHOT_DIR || "/tmp";
const BN = /[ঀ-৿]/;
const browser = await chromium.launch();

async function start(lang, width, height) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const src = fs.readFileSync("app/quranrevival.html", "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  const ok = await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0);
  if (!ok) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await page.evaluate(() => { const m = document.getElementById("mushafToggle"); if (!m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction(() => { const r = document.getElementById("mushafPageRef"); return r && !r.hidden && r.dataset.page; }, null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(500);
  return { ctx, page, errors };
}
const TOOL_IDS = ["readBookmarkBtn", "readNotesBtn", "readCompleteBtn", "readWritingBtn", "readAttachAsmaBtn"];
const vis = (page, id) => page.evaluate((i) => { const e = document.getElementById(i); const r = e?.getBoundingClientRect(); return !!r && r.width > 0 && r.height > 0; }, id);

for (const [lang, width, height] of [["en", 360, 740], ["en", 390, 844], ["bn", 390, 844], ["en", 820, 1180], ["en", 1280, 900], ["bn", 1280, 900]]) {
  const tag = `[${lang} ${width}]`;
  const narrow = width < 900, phone = width < 600;
  const { ctx, page, errors } = await start(lang, width, height);

  // ---- ⋯ ----
  const closed = await page.evaluate((ids) => ({ toolsBtn: (document.getElementById("readToolsBtn")?.getBoundingClientRect().width ?? 0) > 0, shown: ids.filter((i) => (document.getElementById(i)?.getBoundingClientRect().width ?? 0) > 0), size: (document.querySelector("#readTextSizeSlot .text-size-toggle")?.getBoundingClientRect().width ?? 0) > 0 }), TOOL_IDS);
  if (narrow) {
    check(`${tag} below 900px ⋯ is on the bar and the six tools are folded behind it`, closed.toolsBtn && closed.shown.length === 0 && !closed.size, JSON.stringify(closed));
    await page.click("#readToolsBtn");
    await page.waitForTimeout(250);
    const open = await page.evaluate(() => {
      const m = document.getElementById("readToolsMenu"), r = m.getBoundingClientRect();
      const tiles = [...m.querySelectorAll(".qr-ico")].filter((b) => b.getBoundingClientRect().width > 0).map((b) => {
        const br = b.getBoundingClientRect(); const hit = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
        return { id: b.id || "size", h: Math.round(br.height), word: getComputedStyle(b, "::after").content.replace(/^"|"$/g, ""), hit: !!hit && b.contains(hit) };
      });
      return { open: m.classList.contains("open"), expanded: document.getElementById("readToolsBtn").getAttribute("aria-expanded"), inView: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, tiles };
    });
    const words = open.tiles.map((x) => x.word);
    check(`${tag} ⋯ opens a panel of tiles on screen: Text size, Bookmark, Notes, Mark complete, Writing sheet, Attach to Asma`, open.open && open.expanded === "true" && open.inView && open.tiles.length === 6 && ["size", ...TOOL_IDS].every((id) => open.tiles.some((x) => x.id === id)), JSON.stringify(open));
    check(`${tag} ...each tile has its word (${lang === "bn" ? "in Bangla" : "in English"}), is at least 40px high and tappable`, open.tiles.every((x) => x.word && x.word !== "none" && x.h >= 40 && x.hit && (lang === "bn" ? BN.test(x.word) : /[A-Za-z]/.test(x.word))), JSON.stringify(open.tiles));
    if (lang === "bn" || width === 390) await page.screenshot({ path: `${SHOT_DIR}/read-bar-tools-${lang}-${width}.png` });
    // A± inside the panel opens its sliders fully on screen (measured 10 Oct 2026: right-anchored to its tile, they ran
    // 125px off the left edge of a 390px phone).
    await page.click("#readTextSizeSlot [data-text-size-toggle]");
    await page.waitForTimeout(250);
    const pop = await page.evaluate(() => { const p = document.querySelector("#readTextSizeSlot .text-size-popover.open"); const r = p?.getBoundingClientRect(); return r ? { l: Math.round(r.left), r: Math.round(r.right), b: Math.round(r.bottom), inView: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, panelOpen: document.getElementById("readToolsMenu").classList.contains("open") } : null; });
    check(`${tag} ...A± in the panel opens its sliders fully on screen, the panel staying open`, !!pop && pop.inView && pop.panelOpen, JSON.stringify(pop));
    await page.click("#readTextSizeSlot [data-text-size-toggle]");
    await page.waitForTimeout(200);
    if (!(await page.evaluate(() => document.getElementById("readToolsMenu").classList.contains("open")))) { await page.click("#readToolsBtn"); await page.waitForTimeout(200); }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    const esc = await page.evaluate(() => ({ open: document.getElementById("readToolsMenu").classList.contains("open"), focus: document.activeElement?.id }));
    check(`${tag} ...Escape closes it and gives ⋯ the focus back`, !esc.open && esc.focus === "readToolsBtn", JSON.stringify(esc));
    await page.click("#readToolsBtn"); await page.waitForTimeout(200);
    await page.mouse.click(10, height - 200); await page.waitForTimeout(200);
    check(`${tag} ...a tap outside closes it`, !(await page.evaluate(() => document.getElementById("readToolsMenu").classList.contains("open"))));
    await page.click("#readToolsBtn"); await page.waitForTimeout(200);
    await page.click("#readWritingBtn"); await page.waitForTimeout(400);
    check(`${tag} ...choosing a tool closes it (the tool still runs: the Writing sheet opens)`, await page.evaluate(() => !document.getElementById("readToolsMenu").classList.contains("open") && !!document.querySelector("[data-ws-chrome]")));
    await page.evaluate(() => document.querySelector('[data-ws="close"]')?.click());
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('[data-ws="close-anyway"]')?.click());
    await page.waitForTimeout(300);
  } else {
    check(`${tag} from 900px there is no ⋯: the six tools sit on the bar in a line`, !closed.toolsBtn && closed.shown.length === TOOL_IDS.length && closed.size, JSON.stringify(closed));
  }
  check(`${tag} the way back's slot is on the bar, never inside ⋯`, await page.evaluate(() => { const s = document.getElementById("readBackSlot"); return !!s && !s.closest("#readToolsMenu") && !!s.closest("#readBar"); }));

  // ---- 📖 ⤢ ⋯ wrap together ----
  const grp = await page.evaluate(() => { const ids = ["readMeaningBtn", "hideChromeBtn", "readToolsBtn"]; const tops = ids.map((i) => document.getElementById(i)).filter((e) => e && e.getBoundingClientRect().width > 0).map((e) => { const r = e.getBoundingClientRect(); return Math.round(r.top + r.height / 2); }); return { tops, same: tops.every((t) => Math.abs(t - tops[0]) <= 4) }; });
  check(`${tag} 📖 Meaning, ⤢ and ⋯ stay on one line together`, grp.tops.length >= 2 && grp.same, JSON.stringify(grp));

  // ---- the three study buttons ----
  const ab = await page.evaluate(() => {
    const a = document.getElementById("readApproachBar"), r = a.getBoundingClientRect(), d = document.getElementById("dock")?.getBoundingClientRect(), bar = document.getElementById("readBar").getBoundingClientRect();
    const sc = document.getElementById("readScroll"), sr = sc.getBoundingClientRect(), pb = parseFloat(getComputedStyle(sc).paddingBottom) || 0;
    const btns = [...a.querySelectorAll(".approach-bar-btn")].map((b) => { const br = b.getBoundingClientRect(); const hit = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2); return !!hit && b.contains(hit); });
    return { pos: getComputedStyle(a).position, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), dockTop: d ? Math.round(d.top) : null, inBar: r.top >= bar.top - 1 && r.bottom <= bar.bottom + 1, tappable: btns.every(Boolean), contentEnd: Math.round(sr.bottom - pb) };
  });
  if (phone) {
    check(`${tag} on a phone the three study buttons are one row just above the four bottom buttons, all tappable`, ab.pos === "fixed" && ab.dockTop != null && ab.bottom <= ab.dockTop && ab.dockTop - ab.bottom <= 12 && ab.tappable, JSON.stringify(ab));
    check(`${tag} ...and the reading ends above them (nothing hidden under the row)`, ab.contentEnd <= ab.top + 1, JSON.stringify(ab));
  } else {
    check(`${tag} from 600px the three study buttons stay the bar's last line, all tappable`, ab.pos !== "fixed" && ab.inBar && ab.tappable, JSON.stringify(ab));
  }

  // ---- bare full screen keeps 📖 and ⤢, not ⋯ ----
  for (let i = 0; i < 4; i++) {
    const bare = await page.evaluate(() => ["immersive-read", "fs-hide-readbar", "fs-hide-transport"].every((c) => document.body.classList.contains(c)));
    if (bare) break;
    await page.click("#hideChromeBtn"); await page.waitForTimeout(250);
  }
  const fs1 = { meaning: await vis(page, "readMeaningBtn"), fs: await vis(page, "hideChromeBtn"), tools: await vis(page, "readToolsBtn"), study: await vis(page, "readApproachBar") };
  check(`${tag} in full screen's bare state only 📖 and ⤢ remain (no ⋯, no study row)`, fs1.meaning && fs1.fs && !fs1.tools && !fs1.study, JSON.stringify(fs1));
  check(`${tag} no sideways scroll, no page errors`, (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0 && errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

console.log(`\n==== Read bar ⋯ More tools and the study buttons' row (the Owner, 10 Oct 2026): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
