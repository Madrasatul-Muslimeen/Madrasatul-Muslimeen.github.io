// The Owner, 8 Oct 2026, a screenshot of Explore → Asma ul Husna at one Name:
//   "Enable a NAV buttons. And I want the poster to be taken entire space."
// ‹ › on the Name's bar (after 📂) step to the previous / next Name in the list the
// Name was opened from (its group's order; every Name when opened from the Names
// picker). At the Name level the right panel holds the poster alone, as large as
// the panel's width AND height allow (its shape 1055 : 1491), no wheel handles.
// Expected values written BY HAND. Run from the repository root, serve.js on :8080.
//   --mutate=nav     ‹ › do nothing                -> the stepping checks fail
//   --mutate=size    the poster keeps 320px         -> the fill checks fail
//   --mutate=mode    the poster-mode class is never set -> the handles checks fail
//   --mutate=pair    ‹ › loose in the row again     -> the one-line check fails at 390px
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
function swap(src, from, to) { if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 60)}`); return src.split(from).join(to); }
async function routeMutation(ctx) {
  if (!MUTATE) return;
  const f = (s) => {
    if (MUTATE === "nav") return swap(swap(s, "if (navPrev != null) openAsmaXName(navPrev);", ""), "if (navNext != null) openAsmaXName(navNext);", "");
    if (MUTATE === "size") return swap(s, "panel.style.width = `${w}px`;", "panel.style.width = \"320px\";");
    if (MUTATE === "mode") return swap(s, 'asmaXWheelPaneEl.classList.toggle("asmax-poster-mode", asmaXLevel === "refs");', "");
    if (MUTATE === "pair") return swap(s, '<span class="asmax-name-nav-pair">', '<span style="display: contents">');
    throw new Error(`unknown mutation ${MUTATE}`);
  };
  const body = f(fs.readFileSync("app/quranrevival.html", "utf8"));
  await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
}
const RATIO = 1491 / 1055;
const W = { en: { prev: "Previous Name", next: "Next Name" }, bn: { prev: "আগের নাম", next: "পরের নাম" } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function openAsma(page) {
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
  await page.click("#tabExploreBtn");
  await page.waitForTimeout(700);
  await page.click("#explorePaletteAsmaBtn");
  await page.waitForFunction(() => document.querySelectorAll("#asmaXSingleSelect option").length > 1 && document.querySelectorAll("select[data-asmax-class-select]").length >= 1, null, { timeout: 8000 });
}
const state = (page) => page.evaluate(() => {
  const pane = document.getElementById("asmaXWheelPane"), panel = document.getElementById("asmaXPosterPanel");
  const cs = getComputedStyle(pane), r = panel?.getBoundingClientRect(), q = pane.getBoundingClientRect();
  const hint = document.getElementById("asmaXHint"), gap = parseFloat(cs.rowGap) || 0;
  const vis = (el) => el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0;
  const btn = (id) => { const b = document.getElementById(id); if (!b) return null; const br = b.getBoundingClientRect(); return { dis: b.disabled, w: br.width, h: br.height, label: b.getAttribute("aria-label"), top: br.top }; };
  return {
    title: document.querySelector("#asmaXListHeader .qcr-list-title")?.textContent.trim(),
    picker: document.getElementById("asmaXSingleSelect").value,
    ar: panel?.querySelector("[data-poster-arabic]")?.textContent.trim(),
    poster: r ? { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height } : null,
    pane: { l: q.left, r: q.right, t: q.top, b: q.bottom, availW: pane.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      availH: pane.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - (hint.textContent ? hint.getBoundingClientRect().height + gap : 0) },
    handles: [...pane.querySelectorAll(".wheel-resize-handle")].filter(vis).length,
    legend: vis(document.getElementById("asmaXLegendContainer")) && document.getElementById("asmaXLegendContainer").textContent.trim() !== "",
    prev: btn("asmaXPrevNameBtn"), next: btn("asmaXNextNameBtn"),
    groupsBtnRight: document.getElementById("asmaXGroupsThisNameBtn")?.getBoundingClientRect().right ?? null,
    over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    vw: innerWidth, vh: innerHeight,
  };
});

for (const lang of ["en", "bn"]) {
  // 1239 x 818 is the Owner's own screenshot.
  for (const [width, height] of [[390, 844], [768, 1024], [1239, 818], [1440, 900]]) {
    const tag = `[${lang} ${width}x${height}]`;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    await routeMutation(ctx);
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await openAsma(page);

    // A. From the Names picker: Name #1, then › to #2, ‹ back to #1.
    await page.selectOption("#asmaXSingleSelect", "1");
    await page.waitForSelector("#asmaXPosterPanel");
    await page.waitForTimeout(400);
    let s = await state(page);
    check(`${tag} ‹ and › are on the Name's bar, named "${W[lang].prev}" / "${W[lang].next}"`, s.prev?.label === W[lang].prev && s.next?.label === W[lang].next, JSON.stringify([s.prev, s.next]));
    check(`${tag} ‹ and › sit side by side on one line (never split across two)`, s.prev && s.next && Math.abs(s.prev.top - s.next.top) < 2, JSON.stringify([s.prev, s.next]));
    check(`${tag} each is at least 40px square`, s.prev && s.next && Math.min(s.prev.w, s.prev.h, s.next.w, s.next.h) >= 40, JSON.stringify([s.prev, s.next]));
    check(`${tag} at Name #1 of every Name, ‹ is off and › is on`, s.prev?.dis === true && s.next?.dis === false, JSON.stringify([s.prev, s.next]));
    await page.click("#asmaXNextNameBtn"); await page.waitForTimeout(400);
    s = await state(page);
    check(`${tag} › opens Name #2 (Ar-Raheem): the bar, the picker and the poster all follow`, /Ra(h|ḥ)eem|Rahim|রাহীম|রহীম/i.test(s.title ?? "") && s.picker === "2" && /الرَّحِيم/.test(s.ar ?? ""), JSON.stringify({ t: s.title, p: s.picker, ar: s.ar }));
    check(`${tag} at #2 both ‹ and › are on`, s.prev?.dis === false && s.next?.dis === false, JSON.stringify([s.prev, s.next]));
    await page.click("#asmaXPrevNameBtn"); await page.waitForTimeout(400);
    s = await state(page);
    check(`${tag} ‹ goes back to Name #1 (Ar-Rahman)`, s.picker === "1" && /الرَّحْم/.test(s.ar ?? ""), JSON.stringify({ p: s.picker, ar: s.ar }));

    // B. The poster fills the panel: as wide as the panel, or as tall as it, whichever runs out first.
    const p = s.poster, q = s.pane;
    const limitH = width >= 900 ? q.availH : height * 0.85 - (q.b - q.t - q.availH > 0 ? 0 : 0);
    const fitsW = Math.abs(p.w - q.availW) <= 3, fitsH = width >= 900 ? Math.abs(p.h - q.availH) <= 4 : p.h <= height * 0.85 + 2;
    check(`${tag} the poster is as large as the panel allows (width ${p.w | 0} of ${q.availW | 0}, height ${p.h | 0} of ${limitH | 0})`, (fitsW && p.h <= limitH + 4) || (fitsH && p.w <= q.availW + 1), JSON.stringify({ p, q }));
    check(`${tag} the poster keeps its own shape (1055 : 1491)`, Math.abs(p.h / p.w - RATIO) < 0.02, (p.h / p.w).toFixed(3));
    if (width >= 900) check(`${tag} the poster sits inside the panel, whole`, p.l >= q.l - 1 && p.r <= q.r + 1 && p.t >= q.t - 1 && p.b <= q.b + 1, JSON.stringify({ p, q }));
    check(`${tag} the poster is bigger than the old 320px wherever the panel has room for more`, q.availW <= 330 || p.w > 330, `${p.w | 0} in ${q.availW | 0}`);
    check(`${tag} at a Name, the wheel's resize handles and legend are gone from the panel`, s.handles === 0 && !s.legend, JSON.stringify({ h: s.handles, l: s.legend }));
    check(`${tag} no sideways scroll`, s.over <= 0, String(s.over));
    if ((width === 1239 && lang === "en") || (width === 390 && lang === "bn")) await page.screenshot({ path: `/tmp/asma-name-nav-${lang}-${width}.png` });

    // C. Opened from a group: ‹ › follow that group's own order. Back to the group shows the wheel and its handles again.
    await page.click("#asmaXBackFromRefsBtn"); await page.waitForTimeout(300);
    // Back from a Name opened from the picker lands on the groups list: tap the second group, as a reader does.
    await page.click('#asmaXWaysListContainer [data-asma-open-group="asmacat_02"]'); await page.waitForTimeout(500);
    s = await state(page);
    check(`${tag} back at a group the wheel's resize handles come back`, s.handles === 8, String(s.handles));
    const order = await page.evaluate(() => [...document.querySelectorAll("#asmaXWaysListContainer [data-asma-jump]")].map((b) => Number(b.dataset.asmaJump.split(":")[1])));
    if (order.length >= 2) {
      await page.click(`#asmaXWaysListContainer [data-asma-jump="name:${order[0]}"]`); await page.waitForTimeout(400);
      s = await state(page);
      check(`${tag} the group's first Name: ‹ is off`, s.prev?.dis === true && s.picker === String(order[0]), JSON.stringify({ prev: s.prev, p: s.picker, first: order[0] }));
      await page.click("#asmaXNextNameBtn"); await page.waitForTimeout(400);
      s = await state(page);
      check(`${tag} › opens the group's SECOND Name (#${order[1]}), not the next number`, s.picker === String(order[1]), `${s.picker} vs ${order[1]} (${order.slice(0, 4)})`);
      await page.click(`#asmaXBackFromRefsBtn`); await page.waitForTimeout(300);
      const last = order[order.length - 1];
      await page.click(`#asmaXWaysListContainer [data-asma-jump="name:${last}"]`); await page.waitForTimeout(400);
      s = await state(page);
      check(`${tag} the group's last Name: › is off`, s.next?.dis === true, JSON.stringify(s.next));
    } else check(`${tag} the first group holds at least two Names (fixture)`, false, JSON.stringify(order));
    check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|Failed to load resource/.test(e)).length === 0, errors.join(" | "));
    await ctx.close();
  }
}
console.log(`\n==== Asma Explore: ‹ › on a Name, the poster fills its panel: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
