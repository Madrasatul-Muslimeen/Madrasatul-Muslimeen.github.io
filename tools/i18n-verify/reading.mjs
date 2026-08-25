// How much Qur'an is actually on screen? (shell round 17, 15 Aug 2026)
//
// Nothing measured this before, because until this round the reading was not
// a screen -- it lived inside the Study options drawer, under five bars of
// controls, in a panel capped at 74dvh. The measured cost of that, on the
// commit before this one: 193px of visible ayah content on a 390x844 phone,
// 87px at 390x700, and 42px at 360x640, all of it starting 447px down.
//
//   node tools/i18n-verify/reading.mjs [en|bn]
//
// Reports, at each viewport: the height the reading area really gets, how
// much of the ayah content that shows, and the same again with Full screen
// on. Run it with the tenant banner both set and cleared, like layout.mjs --
// the banner is the one piece of chrome that varies per tenant.
import { chromium, newContext, openPage } from "./harness.mjs";

const EXE = process.env.CHROMIUM_PATH || undefined;
const LANG = process.argv[2] === "bn" ? "bn" : "en";

const VIEWPORTS = [
  ["390x844", { width: 390, height: 844 }],
  ["412x915", { width: 412, height: 915 }],
  ["390x700", { width: 390, height: 700 }],
  ["360x640", { width: 360, height: 640 }],
  ["768x1024", { width: 768, height: 1024 }],
  ["1280x800", { width: 1280, height: 800 }],
  ["1440x900", { width: 1440, height: 900 }],
  ["1920x1080", { width: 1920, height: 1080 }],
];

function readMetrics() {
  const q = (s) => document.querySelector(s);
  const box = (s) => { const e = q(s); return e ? e.getBoundingClientRect() : null; };
  const scroll = q("#readScroll");
  const panels = q("#ayahPanels");
  const scrollR = scroll?.getBoundingClientRect();
  const panelsR = panels?.getBoundingClientRect();
  // Ayah content actually on screen: the part of #ayahPanels inside the
  // reading area's own visible box, which is the honest equivalent of the
  // "193px" the drawer used to give it.
  const visible = scrollR && panelsR
    ? Math.max(0, Math.min(panelsR.bottom, scrollR.bottom) - Math.max(panelsR.top, scrollR.top))
    : 0;
  return {
    readViewH: Math.round(box("#readView")?.height ?? 0),
    readScrollH: Math.round(scrollR?.height ?? 0),
    ayahNeeds: Math.round(panels?.scrollHeight ?? 0),
    ayahVisible: Math.round(visible),
    startsAt: Math.round(panelsR?.top ?? 0),
    dockVisible: (() => { const d = box("#dock"); return !!d && d.bottom <= innerHeight + 1 && d.height > 0; })(),
    wheelHidden: !!q("#wheelSection")?.hidden,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    readScrollOverflowsX: scroll ? scroll.scrollWidth > scroll.clientWidth + 1 : null,
    immersive: document.body.classList.contains("immersive-read"),
    // Clear space between the Arabic and the side of the phone. Round 22 added
    // this because round 21 shipped a zero gutter and nothing noticed: nothing
    // OVERFLOWED, so every existing check passed while the text sat on the glass.
    textGutter: (() => {
      const a = [...document.querySelectorAll(".ayah-arabic, .ayah-translation")]
        .find((e) => e.getBoundingClientRect().width > 0);
      return a ? Math.round(a.getBoundingClientRect().left) : 0;
    })(),
  };
}

const browser = await chromium.launch({ executablePath: EXE });
let problems = 0;

for (const banner of [true, false]) {
  console.log(`\n######## tenant banner ${banner ? "SET" : "CLEARED"} · app language ${LANG} ########`);
  for (const [name, viewport] of VIEWPORTS) {
    const ctx = await newContext(browser, { banner, viewport, appLang: LANG === "bn" ? "bn" : null });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await page.click("#tabReadBtn");
    await page.waitForTimeout(400);
    const m = await page.evaluate(readMetrics);
    // Shell round 22: full screen is a THREE-state cycle now (normal ->
    // reading only -> bare), so one press is the middle state and two presses
    // is the bare one. Both are measured; `f` stays the bare state, which is
    // what this report has always compared against.
    await page.click("#hideChromeBtn");
    await page.waitForTimeout(300);
    const mid = await page.evaluate(readMetrics);
    await page.click("#hideChromeBtn");
    await page.waitForTimeout(350);
    const f = await page.evaluate(readMetrics);
    // A tap on the ayah text carries the cycle round to the start -- the owner
    // asked for the tap to walk all three states, so from the bare one the
    // next tap is back to normal.
    await page.click("#ayahPanels", { position: { x: 5, y: 5 } }).catch(() => {});
    await page.waitForTimeout(300);
    const back = await page.evaluate(() => document.body.classList.contains("immersive-read"));

    const bad = [];
    if (!m.wheelHidden) bad.push("wheel still showing");
    if (!m.dockVisible) bad.push("dock not visible");
    if (m.horizontalOverflow) bad.push("horizontal overflow");
    if (m.readScrollOverflowsX) bad.push("reading scrolls sideways");
    if (!f.immersive) bad.push("Full screen did nothing");
    if (f.readScrollH <= m.readScrollH) bad.push("Full screen gained nothing");
    if (back) bad.push("the tap did not carry the cycle back to normal");
    if (mid.readScrollH <= m.readScrollH) bad.push("the middle state gained nothing");
    if (f.readScrollH <= mid.readScrollH) bad.push("the bare state gained nothing over the middle one");
    // Round 22's own regression: "edge to edge" must reach the CARD, not the
    // text -- a zero gutter puts the Arabic's diacritics on the glass.
    if (f.textGutter < 4) bad.push(`text gutter only ${f.textGutter}px in full screen`);
    if (errors.length) bad.push("page errors: " + errors.join(" | "));
    if (bad.length) problems++;

    console.log(
      `  ${name.padEnd(9)} reading ${String(m.readScrollH).padStart(4)}px` +
      ` | ayah visible ${String(m.ayahVisible).padStart(4)}px of ${String(m.ayahNeeds).padStart(4)}px needed` +
      ` | starts ${String(m.startsAt).padStart(3)}px down` +
      ` | mid ${String(mid.readScrollH).padStart(4)}px | bare ${String(f.readScrollH).padStart(4)}px (gutter ${f.textGutter}px)` +
      ` | ${bad.length ? "PROBLEM: " + bad.join("; ") : "ok"}`
    );
    await ctx.close();
  }
}

await browser.close();
console.log(problems ? `\n==== ${problems} PROBLEM(S) ====` : "\n==== READING SCREEN OK ====");
