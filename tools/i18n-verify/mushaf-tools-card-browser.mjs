// PCF MSA J63 (the Owner, 21 Oct 2026, a phone screenshot of the Read view at 50:6 with the ⋯ tools card open):
//   "Remove bookmark from the card. Add Attach to 'QCR' Button in the Card. Place only a bigger back button sign."
// Checks, at 320/390/768/1280 in EN and BN, in the Mushaf and in the plain Read view:
//   the card has no Bookmark tile; the bar's 🔖 still bookmarks; "Attach to QCR" opens #qcrPopup for this āyah and its
//   Back returns to the same āyah; below 600px the Back pill is a bare ≥22px arrow in a ≥44px tile inside the viewport,
//   from 600px the words show; tile labels are not cut and the card does not scroll sideways; contrast ≥ 4.5:1.
// Run from the repository root, serve.js on :8080. Mutations (--mutate=NAME) must each FAIL:
//   bmtile    the Bookmark tile back in the card
//   noqcr     the Attach to QCR tile never shown
//   qcrwrong  the tile opens the QCR pop-up for āyah 1 instead of this one
//   qcrnoback the pop-up's Back leaves the tools card open
//   words     the Back pill words shown on a phone
//   smallarr  the arrow back to its small size
//   smalltile the pill tile 30px
//   hidewords the words hidden on every width
//   lowcontrast the new tile's label drawn pale
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  bmtile: ["    #readToolsMenu.open #readBookmarkBtn { display: none !important; }", "    #readToolsMenu.open #readBookmarkBtn { }"],
  noqcr: ['readAttachQcrBtn.hidden = unitInfo.unitType !== "ayah";', "readAttachQcrBtn.hidden = true;"],
  qcrwrong: ["openQcrPopup(info.unitKey, { backLabel: t(\"Read\") });", "openQcrPopup(\"ayah:2:1\", { backLabel: t(\"Read\") });"],
  qcrnoback: ["openQcrPopup(info.unitKey, { backLabel: t(\"Read\") });", "openQcrPopup(info.unitKey, { backLabel: t(\"Read\"), onBack: () => { setTimeout(() => readToolsMenu.classList.add(\"open\"), 50); } });"],
  words: ["    .ayah-card-back-text { display: none; }\n    .ayah-card-back-pill .ayah-card-back-btn,", "    .ayah-card-back-text { }\n    .ayah-card-back-pill .ayah-card-back-btn,"],
  smallarr: ["font-size: 1.5rem; line-height: 1; }", "font-size: 0.9rem; line-height: 1; }"],
  smalltile: ["min-height: 44px; min-width: 44px; padding: 0 0.6rem; }", "min-height: 30px; min-width: 30px; padding: 0; }"],
  hidewords: ["  .ayah-card-back-ref { color: #c9a24b; margin-left: 0.3rem; }", "  .ayah-card-back-ref { color: #c9a24b; margin-left: 0.3rem; }\n  .ayah-card-back-text { display: none; }"],
  lowcontrast: ["    #readToolsMenu.open #readNotesBtn .read-notes-count { top: 4px; right: 6px; }", "    #readToolsMenu.open #readNotesBtn .read-notes-count { top: 4px; right: 6px; }\n    #readToolsMenu.open #readAttachQcrBtn::after { color: #d5dbe8; }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (typeof ok?.then === "function") throw new Error(`check "${n}" was given a promise`); ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`)); };
const quiet = (errs) => errs.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

// WCAG contrast of two "rgb(a)" strings.
const CONTRAST = `(a, b) => {
  const p = (c) => c.match(/[\\d.]+/g).map(Number);
  const lum = (c) => { const [r, g, bl] = p(c).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
  const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}`;

for (const [lang, W] of [["en", 320], ["bn", 320], ["en", 390], ["bn", 390], ["en", 768], ["bn", 768], ["en", 1280], ["bn", 1280]]) {
  for (const mushaf of [true, false]) {
    const tag = `[${lang} ${W} ${mushaf ? "mushaf" : "read"}]`;
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: W, height: 900 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const [a, b] = MUT[MUTATE];
      await ctx.route("**/app/quranrevival.html*", async (r) => { const src = fs.readFileSync("app/quranrevival.html", "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }); });
    }
    const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
    const ev = (f, a) => P.evaluate(f, a);
    await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    if (!(await ev(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
    await P.click("#tabReadBtn"); await P.waitForTimeout(400);
    await ev(() => { const s = document.getElementById("surahSelect"); s.value = "50"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await P.waitForTimeout(1200);
    await ev(() => { const el = document.getElementById("ayahSelect"); el.value = "6"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await P.waitForTimeout(700);
    if (mushaf) {
      await ev(() => { const t = document.getElementById("mushafToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
      await P.waitForFunction(() => document.querySelector(".hifz-page[data-mushaf-page]"), null, { timeout: 15000 }).catch(() => {});
      await P.waitForTimeout(600);
    }
    await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    const phone = W < 900;
    const openTools = async () => { if (phone && !(await ev(() => document.getElementById("readToolsMenu").classList.contains("open")))) { await P.click("#readToolsBtn"); await P.waitForTimeout(250); } };
    await openTools();

    // 1. The card has no Bookmark tile (from 900px the tools sit on the bar and the bar's own 🔖 is the bookmark).
    const tiles = await ev(() => {
      const shown = (id) => { const b = document.getElementById(id); const r = b?.getBoundingClientRect(); return !!r && r.width > 0 && getComputedStyle(b).display !== "none"; };
      return { bm: shown("readBookmarkBtn"), qcr: shown("readAttachQcrBtn"), barBm: shown("readBarBookmarkBtn"), notes: shown("readNotesBtn") };
    });
    check(`${tag} POSITIVE CONTROL the card shows its Notes tile`, tiles.notes, JSON.stringify(tiles));
    check(`${tag} the tools card has no Bookmark tile`, !tiles.bm, JSON.stringify(tiles));
    check(`${tag} the bar's own 🔖 is there`, tiles.barBm, JSON.stringify(tiles));

    // 2. Attach to QCR is there (one āyah selected), beside Attach to Asma, with its words and a 📚.
    check(`${tag} "Attach to QCR" is in the card`, tiles.qcr, JSON.stringify(tiles));
    const tile = await ev((phone) => {
      const b = document.getElementById("readAttachQcrBtn"), m = document.getElementById("readToolsMenu");
      const cs = getComputedStyle(b), af = getComputedStyle(b, "::after");
      const r = b.getBoundingClientRect(), mr = m.getBoundingClientRect();
      return { label: b.getAttribute("aria-label"), glyph: b.textContent.trim(), cut: b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1,
        inside: m.style.display === "contents" || getComputedStyle(m).display === "contents" ? true : r.left >= mr.left - 1 && r.right <= mr.right + 1 && r.top >= mr.top - 1 && r.bottom <= mr.bottom + 1,
        menuSideways: getComputedStyle(m).display === "contents" ? false : m.scrollWidth > m.clientWidth + 1,
        fg: phone ? af.color : cs.color, bg: cs.backgroundColor, afterText: phone ? af.content : "" };
    }, phone);
    check(`${tag} the tile is a 📚 labelled "${lang === "bn" ? "QCR-এ যুক্ত করুন" : "Attach to QCR"}"`, tile.glyph.startsWith("📚") && tile.label === (lang === "bn" ? "QCR-এ যুক্ত করুন" : "Attach to QCR"), JSON.stringify(tile));
    check(`${tag} the tile label is not cut, the card has no sideways scroll`, !tile.cut && tile.inside && !tile.menuSideways, JSON.stringify(tile));
    const cr = await ev(`(${CONTRAST})(${JSON.stringify(tile.fg)}, ${JSON.stringify(phone ? "rgb(255, 255, 255)" : tile.bg)})`);
    check(`${tag} the tile's label has contrast ≥ 4.5:1 (${cr.toFixed?.(2)})`, cr >= 4.5, `${cr} ${tile.fg}`);

    // 3. Its tap opens #qcrPopup for this āyah; Back returns to the same āyah, tools card closed.
    await ev(() => document.getElementById("readAttachQcrBtn").click());
    await P.waitForFunction(() => { const p = document.getElementById("qcrPopup"); return !!p && !p.hidden && p.querySelector(".qcr-pop-title"); }, null, { timeout: 12000 }).catch(() => {});
    const pop = await ev(() => { const p = document.getElementById("qcrPopup"); return { open: !!p && !p.hidden && p.getClientRects().length > 0, title: p?.querySelector(".qcr-pop-title")?.textContent ?? "" }; });
    const REF = lang === "bn" ? "৫০:৬" : "50:6";
    check(`${tag} Attach to QCR opens #qcrPopup for ${REF}`, pop.open && pop.title.includes(REF), JSON.stringify(pop));
    await ev(() => document.querySelector("#qcrPopup [data-qcr-pop-back]")?.click());
    await P.waitForTimeout(500);
    const back = await ev(() => { const p = document.getElementById("qcrPopup"); return { popClosed: !p || p.hidden, surah: document.getElementById("surahSelect").value, ayah: document.getElementById("ayahSelect").value, toolsOpen: document.getElementById("readToolsMenu").classList.contains("open") }; });
    check(`${tag} its Back returns to the same āyah (50:6) with the tools card closed`, back.popClosed && back.surah === "50" && back.ayah === "6" && !back.toolsOpen, JSON.stringify(back));

    // 4. The bar's 🔖 still bookmarks: the stub write log shows the bookmark document.
    await ev(() => { window.__stubWriteData = []; });
    await P.click("#readBarBookmarkBtn");
    await P.waitForSelector(".bm-popover-overlay", { timeout: 5000 }).catch(() => {});
    await P.fill("[data-bm-pop-name]", "J63").catch(() => {});
    await P.click("[data-bm-pop-save]").catch(() => {});
    await P.waitForTimeout(900);
    const wrote = await ev(() => (window.__stubWriteData || []).filter((w) => /bookmark/i.test(`${w.col ?? ""} ${w.path ?? ""}`)).length);
    check(`${tag} the bar's 🔖 still bookmarks (a bookmarks write is logged)`, wrote >= 1, String(wrote));

    // 5. The way-back pill (plain Read only: it needs the Āyah card's related-āyah jump): bare arrow below 600px.
    if (!mushaf) {
      await ev(() => { const s = document.getElementById("surahSelect"); s.value = "36"; s.dispatchEvent(new Event("change", { bubbles: true })); });
      await P.waitForTimeout(1000);
      await ev(() => { const el = document.getElementById("ayahSelect"); el.value = "38"; el.dispatchEvent(new Event("change", { bubbles: true })); });
      await P.waitForTimeout(700);
      await ev(() => document.querySelector('[data-ayah-num-badge="36:38"]')?.click());
      await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 }).catch(() => {});
      await P.waitForTimeout(500);
      const has = await ev(() => !!document.querySelector("[data-ayah-related-jump]"));
      check(`${tag} POSITIVE CONTROL a related āyah is listed to make the pill`, has);
      if (has) {
        await ev(() => document.querySelector("[data-ayah-related-jump]").click());
        await P.waitForFunction(() => document.querySelector("#ayahCardBackPill:not([hidden]) [data-ayah-card-back]"), null, { timeout: 10000 }).catch(() => {});
        await P.waitForTimeout(500);
        const pill = await ev(() => {
          const pl = document.getElementById("ayahCardBackPill"), b = pl?.querySelector("[data-ayah-card-back]"), x = pl?.querySelector("[data-ayah-card-back-dismiss]");
          const ar = pl?.querySelector(".ayah-card-back-arrow"), tx = pl?.querySelector(".ayah-card-back-text");
          const r = b?.getBoundingClientRect(), xr = x?.getBoundingClientRect(), pr = pl?.getBoundingClientRect();
          const bg = pl ? getComputedStyle(pl).backgroundColor : "", fg = ar ? getComputedStyle(ar).color : "";
          return { textShown: !!tx && tx.getBoundingClientRect().width > 0, arrowPx: ar ? parseFloat(getComputedStyle(ar).fontSize) : 0, w: r?.width ?? 0, h: r?.height ?? 0, ph: pr?.height ?? 0, xw: xr?.width ?? 0,
            inView: !!pr && pr.left >= -0.5 && pr.right <= innerWidth + 0.5 && pr.top >= 0 && pr.bottom <= innerHeight + 0.5, aria: b?.getAttribute("aria-label") ?? "", title: b?.getAttribute("title") ?? "", fg, bg };
        });
        if (W < 600) {
          check(`${tag} on a phone the Back pill shows no words`, !pill.textShown, JSON.stringify(pill));
          check(`${tag} ...the arrow is ≥ 22px (about 1.5rem)`, pill.arrowPx >= 22, JSON.stringify(pill));
          check(`${tag} ...the pill is ≥ 44×44 and inside the viewport, the × a 44px tile`, pill.w >= 44 && pill.h >= 44 && pill.ph >= 44 && pill.xw >= 44 && pill.inView, JSON.stringify(pill));
          check(`${tag} ...the full words stay as aria-label and title`, pill.aria.length > 3 && pill.aria === pill.title, JSON.stringify(pill));
        } else {
          check(`${tag} from 600px the Back pill keeps its words`, pill.textShown && pill.inView, JSON.stringify(pill));
        }
        const pc = await ev(`(${CONTRAST})(${JSON.stringify(pill.fg)}, ${JSON.stringify(pill.bg)})`);
        check(`${tag} the arrow has contrast ≥ 4.5:1 (${pc.toFixed?.(2)})`, pc >= 4.5, `${pc} ${pill.fg} on ${pill.bg}`);
      }
    }
    const errs = quiet(errors);
    check(`${tag} no page errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
