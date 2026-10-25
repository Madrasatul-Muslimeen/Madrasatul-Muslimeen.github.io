// The Read bar's ⋯ More tools and the three study buttons at a phone's foot (the Owner, 10 Oct 2026):
//   "I think all these buttons along with bookmark can be organised under one button so that a row space is saved"
//   "How about moving three buttons at the bottom of the screen?"
// Expected values written BY HAND. Run from the repository root, serve.js on :8080.
//   --mutate=nofold    below 900px the tools are not folded behind ⋯ any more   -> the fold checks fail
//   --mutate=nomove    the study buttons stay on the bar on a phone (PCF MSA J99) -> the ⋯-card checks fail
//   --mutate=tsleft    the A± sliders keep their right anchor inside the panel        -> the "fully on screen" check fails
//   --mutate=tscover   the A± sliders drop 2.3rem again, over the A± tile (audit part 42) -> the "tile free" check fails
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
  nomove: ["      if (readPhoneMQ.matches) { if (readApproachBarEl.parentElement !== readToolsMenu)", "      if (false) { if (readApproachBarEl.parentElement !== readToolsMenu)"],
  tsleft: ["    #readToolsMenu.open .text-size-popover { left: 0; right: auto; top: 100%; }", "    #readToolsMenu.open .text-size-popover { top: 100%; }"],
  tscover: ["    #readToolsMenu.open .text-size-popover { left: 0; right: auto; top: 100%; }", "    #readToolsMenu.open .text-size-popover { left: 0; right: auto; }"],
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
    // Updated in place (audit part 42): PCF MSA J63 took the Bookmark tile out of the card on purpose (app/quranrevival.html:
    // `#readToolsMenu.open #readBookmarkBtn { display: none }`); the bar's own 🔖 is the bookmark. So the card holds Text size,
    // Notes, Mark complete, Writing sheet, Attach to Asma and Attach to QCR, and Bookmark must NOT be among them.
    check(`${tag} ⋯ opens a panel of tiles on screen: Text size, Notes, Mark complete, Writing sheet, Attach to Asma (no Bookmark tile, J63)`, open.open && open.expanded === "true" && open.inView && open.tiles.length === 6 && ["size", ...TOOL_IDS.filter((i) => i !== "readBookmarkBtn")].every((id) => open.tiles.some((x) => x.id === id)) && !open.tiles.some((x) => x.id === "readBookmarkBtn"), JSON.stringify(open));
    check(`${tag} ...each tile has its word (${lang === "bn" ? "in Bangla" : "in English"}), is at least 40px high and tappable`, open.tiles.every((x) => x.word && x.word !== "none" && x.h >= 40 && x.hit && (lang === "bn" ? BN.test(x.word) : /[A-Za-z]/.test(x.word))), JSON.stringify(open.tiles));
    if (lang === "bn" || width === 390) await page.screenshot({ path: `${SHOT_DIR}/read-bar-tools-${lang}-${width}.png` });
    // A± inside the panel opens its sliders fully on screen (measured 10 Oct 2026: right-anchored to its tile, they ran
    // 125px off the left edge of a 390px phone).
    await page.click("#readTextSizeSlot [data-text-size-toggle]");
    await page.waitForTimeout(250);
    const pop = await page.evaluate(() => { const p = document.querySelector("#readTextSizeSlot .text-size-popover.open"); const r = p?.getBoundingClientRect(); return r ? { l: Math.round(r.left), r: Math.round(r.right), b: Math.round(r.bottom), inView: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, panelOpen: document.getElementById("readToolsMenu").classList.contains("open") } : null; });
    check(`${tag} ...A± in the panel opens its sliders fully on screen, the panel staying open`, !!pop && pop.inView && pop.panelOpen, JSON.stringify(pop));
    // Audit part 42: measured at 360x740, the sliders (top 2.3rem under the tile) now start INSIDE the A± tile (the tile is 80px
    // tall and the popover covers its lower 43px), so elementFromPoint at the tile's centre is the popover and a second tap on A±
    // cannot land. Fixed in app/quranrevival.html (PCA: MSA builds it): in the panel the sliders open at top: 100%. Now a real
    // check, and the closing step is a real tap again.
    const covered = await page.evaluate(() => { const t = document.querySelector("#readTextSizeSlot [data-text-size-toggle]"), r = t.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(h && t.contains(h)); });
    check(`${tag} ...the open sliders leave the A± tile free, so a second tap on A± lands on it (audit part 42)`, !covered);
    await page.click("#readTextSizeSlot [data-text-size-toggle]");
    await page.waitForTimeout(200);
    if (!(await page.evaluate(() => document.getElementById("readToolsMenu").classList.contains("open")))) { await page.click("#readToolsBtn"); await page.waitForTimeout(200); }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    const esc = await page.evaluate(() => ({ open: document.getElementById("readToolsMenu").classList.contains("open"), focus: document.activeElement?.id }));
    check(`${tag} ...Escape closes it and gives ⋯ the focus back`, !esc.open && esc.focus === "readToolsBtn", JSON.stringify(esc));
    await page.click("#readToolsBtn"); await page.waitForTimeout(200);
    // PCF MSA J99: on a phone the card now holds the three study buttons, so (10, height - 200) fell INSIDE it (on "Take an
    // Approach"). The tap outside is made just left of the card, half way down it. Updated in place, reason recorded.
    const out = await page.evaluate(() => { const r = document.getElementById("readToolsMenu").getBoundingClientRect(); return { x: Math.max(2, Math.round(r.left) - 6), y: Math.round((r.top + r.bottom) / 2) }; });
    await page.mouse.click(out.x, out.y); await page.waitForTimeout(200);
    check(`${tag} ...a tap outside closes it`, !(await page.evaluate(() => document.getElementById("readToolsMenu").classList.contains("open"))));
    await page.click("#readToolsBtn"); await page.waitForTimeout(200);
    await page.click("#readWritingBtn"); await page.waitForTimeout(400);
    check(`${tag} ...choosing a tool closes it (the tool still runs: the Writing sheet opens)`, await page.evaluate(() => !document.getElementById("readToolsMenu").classList.contains("open") && !!document.querySelector("[data-ws-chrome]")));
    await page.evaluate(() => document.querySelector('[data-ws="close"]')?.click());
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('[data-ws="close-anyway"]')?.click());
    await page.waitForTimeout(300);
  } else {
    // Updated in place 12 Oct 2026 (v10.27, the Owner: "Add bookmark button on the top of the Mushaf page"): this suite reads
    // the Mushaf view, where the bar's own 🔖 (#readBarBookmarkBtn) is the Bookmark from 900px and ⋯'s copy steps aside, so
    // the six are Text size, the bar's 🔖 and the four other tools.
    const barBm = await page.evaluate(() => (document.getElementById("readBarBookmarkBtn")?.getBoundingClientRect().width ?? 0) > 0);
    check(`${tag} from 900px there is no ⋯: the six tools sit on the bar in a line (Bookmark is the Mushaf bar's own 🔖)`, !closed.toolsBtn && barBm && JSON.stringify(closed.shown) === JSON.stringify(TOOL_IDS.filter((i) => i !== "readBookmarkBtn")) && closed.size, JSON.stringify({ ...closed, barBm }));
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
    // PCF MSA J99 (the Owner, 25 Oct 2026: "put those 3 buttons inside the dots on the card (expand the card), saves a row"):
    // the row above the four bottom buttons is gone; the three are the last lines of the ⋯ card. Updated in place, reason recorded.
    const shut = await page.evaluate(() => { const a = document.getElementById("readApproachBar"), r = a.getBoundingClientRect(), sc = document.getElementById("readScroll"); return { inMenu: !!a.closest("#readToolsMenu"), shown: r.width > 0 && r.height > 0, pb: parseFloat(getComputedStyle(sc).paddingBottom) || 0 }; });
    check(`${tag} on a phone the three study buttons are not a row on the screen (they live in the ⋯ card), and the reading keeps no room for one`, shut.inMenu && !shut.shown && shut.pb === 0, JSON.stringify(shut));
    await page.click("#readToolsBtn"); await page.waitForTimeout(250);
    const inCard = await page.evaluate(() => [...document.querySelectorAll("#readToolsMenu #readApproachBar .approach-bar-btn")].map((b) => { const r = b.getBoundingClientRect(); const ok = [0.1, 0.5, 0.9].every((f) => { const e = document.elementFromPoint(r.left + r.width * f, r.top + r.height / 2); return !!e && b.contains(e); }); return { id: b.id, h: Math.round(r.height), inside: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, ok, whole: b.scrollWidth <= b.clientWidth + 1 }; }));
    check(`${tag} ...⋯ shows them in order, each a whole 40px+ line inside the screen that a finger reaches end to end`, inCard.map((x) => x.id).join() === "readBarTakeBtn,readBarRecordBtn,readBarStatusBtn" && inCard.every((x) => x.h >= 40 && x.inside && x.ok && x.whole), JSON.stringify(inCard));
    await page.keyboard.press("Escape"); await page.waitForTimeout(150);
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
