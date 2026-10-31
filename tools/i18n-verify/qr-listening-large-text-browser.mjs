// QR Lead audit 4, 31 Oct 2026 (Listening, PCF User Manual 9m107jl): Study options ▸ Listening at large text. Measured on main
// v12.138 with this suite's probe: 📖 Read / ▶ Play cut their own words on a phone at 150/200% (360px 200%: "▶ Play" needs
// 111px, got 45) and at the bottom on a 768px tablet at 200% (fixed 40px height); the Mode picker ran 45px past the card on
// a 360/390px phone at 200% (min-width 8rem); on a 768px tablet at 200% "Each Ayah" was squeezed to "Ea" (the wrap line is a
// screen width, blind to text size); on a phone turned sideways at 200% the stacked drawer head took ~180 of the drawer's
// ~190px, so the reciter ticks could not be tapped; and at every size Kevan Brighting read "(whole surah only)" twice.
//   node tools/i18n-verify/qr-listening-large-text-browser.mjs [--mutate=NAME] [--record]   (serve.js on :8080, repo root)
//   no-height   the buttons' fixed 40px height kept -> "Read / Play show their whole words" FAILS at 768 200%
//   no-wrap     the buttons forced to share a line   -> "Read / Play show their whole words" FAILS on phones at 150/200%
//   no-min      the Mode picker's 8rem minimum kept   -> "every control lies inside the card" FAILS at 360/390 200%
//   no-cq       the card-width wrap removed           -> "the Mode picker shows its whole choice" FAILS at 768 200%
//   no-scroll   the head always stands over the drawer -> "every control can be tapped" FAILS sideways at 200%
//   no-dup      the duplicate note put back           -> "(whole surah only) is said once" FAILS everywhere
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9), RECORD = process.argv.includes("--record");
const MUT = {
  "no-height": ["  .opt-act-btn { height: auto; }\n", ""],
  "no-wrap": ["    .opt-actions .opt-act-btn { flex: 1 1 0; min-width: max-content; }\n  }\n  /* The 480px", "    .opt-actions .opt-act-btn { flex: 1 1 0; min-width: 0; }\n  }\n  /* The 480px"],
  "no-min": ["    .opt-bar-listen > .opt-cell-mode { flex: 1 1 auto; min-width: min(8rem, 100%); }\n  }\n  /* The 480px", "    .opt-bar-listen > .opt-cell-mode { flex: 1 1 auto; min-width: 8rem; }\n  }\n  /* The 480px"],
  "no-cq": ["  #drillControls { container-type: inline-size; }\n", ""],
  "no-scroll": ['        if (head.offsetHeight > panel.clientHeight / 2) head.classList.add("qr-panel-head-scrolls");\n', ""],
  "no-dup": ["reciterSupportsSingleAyah(r.id) || /whole surah only/i.test(r.label) ?", "reciterSupportsSingleAyah(r.id) ?"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SHOT_DIR = process.env.SHOT_DIR || "";
// At ordinary text, on main v12.138 (--record), written by hand: [Read left, Read's place in the drawer + 1000, Play width, Mode width, head height].
// main's own values, except Read's place in the drawer where the duplicate "(whole surah only)" had wrapped to a line of its
// own (bn 360/390, en 768, en 740): one line shorter now. With --mutate=no-dup every value here equals main's exactly.
const PLAIN = {
  "en 360x740": [106, 2278, 102, 215, 56], "bn 360x740": [128, 2233, 91, 215, 56], "en 390x844": [106, 2278, 117, 245, 56], "bn 390x844": [128, 2201, 106, 245, 56],
  "en 768x1024": [570, 1975, 69, 401, 56], "bn 768x1024": [586, 1960, 66, 395, 56], "en 1280x800": [1031, 1914, 69, 811, 56], "bn 1280x800": [1046, 1935, 66, 805, 56],
  "en 740x360": [542, 1975, 69, 373, 56], "bn 740x360": [558, 1983, 66, 367, 56], "en 844x390": [646, 1960, 69, 477, 56],
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const [w, h, lang] of [[360, 740, "en"], [360, 740, "bn"], [390, 844, "en"], [390, 844, "bn"], [768, 1024, "en"], [768, 1024, "bn"], [1280, 800, "en"], [1280, 800, "bn"], [740, 360, "en"], [740, 360, "bn"], [844, 390, "en"]]) {
  for (const size of ["100%", "150%", "200%"]) {
    const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const [from, to] = MUT[MUTATE];
      await ctx.route("**/app/quranrevival.html*", async (r) => {
        const res = await r.fetch(); const body = await res.text();
        if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
        r.fulfill({ response: res, body: body.replace(from, to) });
      });
    }
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForFunction(() => document.querySelector("#wheelContainer svg"), null, { timeout: 30000 });
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((e) => e.remove()));
    await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, size); await page.waitForTimeout(300);
    await page.click("#tabStudyBtn"); await page.waitForTimeout(200);
    await page.click("#tabStudyOptionsBtn"); await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const R = (e) => e.getBoundingClientRect(), card = document.getElementById("listeningCard"), c = R(card), panel = document.getElementById("panelStudyOptions");
      const name = (e) => e.id || e.value || e.textContent.trim().slice(0, 12);
      const ctrls = [...card.querySelectorAll("input, select, button")].filter((e) => e.getClientRects().length);
      const outside = ctrls.filter((e) => { const r = R(e); return r.right > c.right + 1 || r.left < c.left - 1; }).map(name);
      const cut = [...card.querySelectorAll("button")].filter((e) => e.getClientRects().length && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)).map(name);
      const s = document.getElementById("drillModeSelect"), cs = getComputedStyle(s), probe = document.createElement("span");
      Object.assign(probe.style, { font: cs.font, position: "absolute", whiteSpace: "pre" }); probe.textContent = s.options[s.selectedIndex].text; document.body.appendChild(probe);
      const modeNeed = Math.round(R(probe).width), modeRoom = Math.round(s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 16); probe.remove();
      // A tap counts if the page or the drawer can be scrolled to it by a finger (the drawer scrolls; the page here does not).
      const hit = (e) => { const r = R(e), x = r.left + r.width / 2, y = r.top + r.height / 2; if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return false; const at = document.elementFromPoint(x, y); return !!at && (e.contains(at) || (at.tagName === "LABEL" && at.contains(e))); };
      const untappable = ctrls.filter((e) => { if (hit(e)) return false; e.scrollIntoView({ block: "center" }); return !hit(e); }).map(name);
      panel.scrollTop = 0;
      const dup = [...card.querySelectorAll("#drillReciterChecks label")].filter((l) => (l.textContent.match(/whole surah only|শুধু পুরো সূরা/gi) || []).length > 1).length;
      const read = R(document.getElementById("drillReadBtn")), head = panel.querySelector(".qr-panel-head");
      return { outside, cut, modeNeed, modeRoom, untappable, dup, plain: [Math.round(read.left), Math.round(read.top + panel.scrollTop), Math.round(R(document.getElementById("drillPlayBtn")).width), Math.round(R(s).width), Math.round(head.offsetHeight)] };
    });
    // The Read button's top is read with the drawer scrolled back to the start, so it is a place in the drawer, not the screen.
    m.plain[1] = await page.evaluate(() => { const p = document.getElementById("panelStudyOptions"); p.scrollTop = 0; return Math.round(document.getElementById("drillReadBtn").getBoundingClientRect().top - p.getBoundingClientRect().top + 1000); });
    const tag = `${lang} ${w}x${h} ${size}`, d = JSON.stringify(m);
    if (RECORD) { if (size === "100%") console.log(`"${lang} ${w}x${h}": ${JSON.stringify(m.plain)},`); await ctx.close(); continue; }
    check(`${tag}: every control lies inside the card`, m.outside.length === 0, d);
    check(`${tag}: 📖 Read / ▶ Play show their whole words`, m.cut.length === 0, d);
    check(`${tag}: the Mode picker shows its whole choice`, m.modeNeed <= m.modeRoom + 1, d);
    check(`${tag}: every control can be tapped`, m.untappable.length === 0, d);
    check(`${tag}: "(whole surah only)" is said once`, m.dup === 0, d);
    const plain = PLAIN[`${lang} ${w}x${h}`];
    if (size === "100%" && plain) check(`${tag}: at ordinary text nothing moves`, plain.every((v, i) => Math.abs(v - m.plain[i]) <= 1), `${d} want ${JSON.stringify(plain)}`);
    if (SHOT_DIR) { await page.evaluate(() => document.getElementById("listeningCard").scrollIntoView({ block: "center" })); await page.screenshot({ path: `${SHOT_DIR}/listen-${lang}-${w}x${h}-${size.replace("%", "")}.png` }); }
    await ctx.close();
  }
}
await browser.close();
if (!RECORD) console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
