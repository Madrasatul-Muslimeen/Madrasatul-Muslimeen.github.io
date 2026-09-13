// MAP Phase 2 -- RENDERED acceptance QA, in a real browser.
// Focused and un-checked-in, this project's established practice for work
// past behaviour.mjs's pre-existing section-42 stop.
//
// Why it exists: quran-word-card-integration.mjs is static source inspection
// (readFileSync + regex). It proves the code was written, never that a reader
// can click a word and see a card. Everything below is read off the rendered
// page -- measured rects, real text, real focus -- not off the source and not
// off .hidden.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function enterReadWithWbw(page) {
  // Read moved inside the STUDY pillar menu.
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  // Turn the word-by-word panel on through its own control, as a reader does.
  await page.evaluate(() => {
    const t = document.getElementById("wbwShowToggle");
    if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(600);
}

for (const lang of ["en", "bn"]) {
  console.log(`\n=== rendered Word Card, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await enterReadWithWbw(page);

  const words = await page.locator("[data-word-occurrence]").count();
  check(`${lang} clickable words really render`, words > 0, `count=${words}`);
  if (!words) { await ctx.close(); continue; }

  // A real button, not a div dressed up as one.
  const tag = await page.locator("[data-word-occurrence]").first().evaluate((e) => e.tagName);
  check(`${lang} a word is a real <button>`, tag === "BUTTON", tag);

  const first = page.locator("[data-word-occurrence]").first();
  const wantedId = await first.getAttribute("data-word-occurrence");
  await first.click();
  await page.waitForTimeout(400);

  const card = await page.evaluate(() => {
    const c = document.querySelector(".quran-word-card");
    if (!c) return null;
    const r = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    return {
      id: c.getAttribute("data-occurrence-id"),
      w: Math.round(r.width), h: Math.round(r.height),
      top: Math.round(r.top), bottom: Math.round(r.bottom),
      display: cs.display, visibility: cs.visibility,
      tabs: [...c.querySelectorAll('[role="tab"]')].map((t) => t.textContent.trim()),
      selected: c.querySelector('[role="tab"][aria-selected="true"]')?.textContent.trim(),
      panel: c.querySelector('[role="tabpanel"]')?.getAttribute("data-word-card-panel"),
      arabic: c.querySelector(".word-card-arabic")?.textContent.trim(),
      region: c.getAttribute("aria-label"),
      text: c.textContent,
    };
  });
  check(`${lang} the card really appears on screen`,
        !!card && card.w > 0 && card.h > 0 && card.display !== "none" && card.visibility !== "hidden",
        JSON.stringify(card && { w: card.w, h: card.h, display: card.display }));
  check(`${lang} it is the word that was clicked`, card?.id === wantedId, `${card?.id} vs ${wantedId}`);
  check(`${lang} it is fully inside the viewport`,
        card && card.top >= 0 && card.bottom <= 844, `top=${card?.top} bottom=${card?.bottom}`);
  check(`${lang} real Arabic is drawn`, /[؀-ۿ]/.test(card?.arabic || ""), card?.arabic);
  check(`${lang} all three tabs are present`, card?.tabs.length === 3, JSON.stringify(card?.tabs));
  check(`${lang} WbW is the tab it opens on`, card?.panel === "wbw", card?.panel);

  // Language: read the RENDERED card, not the catalogue.
  const BANGLA = /[ঀ-৿]/;
  if (lang === "bn") {
    check("bn the tabs are Bangla", card.tabs.every((t) => BANGLA.test(t)), JSON.stringify(card.tabs));
    check("bn the card's own accessible name is Bangla", BANGLA.test(card.region || ""), card.region);
  } else {
    check("en the tabs read WbW / Basic Arabic / Arabic in Depth",
          card.tabs.join(",") === "WbW,Basic Arabic,Arabic in Depth", JSON.stringify(card.tabs));
  }

  // Basic Arabic tab, by clicking it as a reader would.
  await page.click('[data-word-card-level="basic"]');
  await page.waitForTimeout(500);
  const basic = await page.evaluate(() => {
    const c = document.querySelector(".quran-word-card");
    return { panel: c?.querySelector('[role="tabpanel"]')?.getAttribute("data-word-card-panel"), text: c?.textContent || "" };
  });
  check(`${lang} Basic Arabic really switches panel`, basic.panel === "basic", basic.panel);
  if (lang === "bn") {
    const countText = (basic.text.match(/[০-৯0-9]+\s*টি ব্যবহার/g) || []).join(" | ");
    check("bn a count is printed in Bengali digits",
          countText.length > 0 && !/[0-9]/.test(countText), countText || "(no count found)");
    check("bn Basic Arabic prints no leftover English",
          !/\b(Lemma|Root|Part of speech|root-linked|lemma-linked|Unknown)\b/.test(basic.text),
          basic.text.slice(0, 160));
  }

  // Arabic in Depth.
  await page.click('[data-word-card-level="depth"]');
  await page.waitForTimeout(300);
  const depth = await page.evaluate(() => {
    const c = document.querySelector(".quran-word-card");
    return { panel: c?.querySelector('[role="tabpanel"]')?.getAttribute("data-word-card-panel"), text: c?.textContent || "" };
  });
  check(`${lang} Arabic in Depth really switches panel`, depth.panel === "depth", depth.panel);
  if (lang === "bn") {
    check("bn Depth prints no leftover English",
          !/Semantic range|Dictionary source unavailable|Open dictionary source/.test(depth.text),
          depth.text.slice(0, 160));
  }

  // Keyboard: roving tabindex via arrow keys, read off document.activeElement.
  await page.focus('[data-word-card-level="depth"]');
  await page.keyboard.press("Home");
  await page.waitForTimeout(300);
  const afterHome = await page.evaluate(() => ({
    focused: document.activeElement?.getAttribute("data-word-card-level"),
    selected: document.querySelector('.quran-word-card [role="tab"][aria-selected="true"]')?.getAttribute("data-word-card-level"),
  }));
  check(`${lang} Home moves focus AND selection to the first tab`,
        afterHome.focused === "wbw" && afterHome.selected === "wbw", JSON.stringify(afterHome));

  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  const afterRight = await page.evaluate(() => ({
    focused: document.activeElement?.getAttribute("data-word-card-level"),
    selected: document.querySelector('.quran-word-card [role="tab"][aria-selected="true"]')?.getAttribute("data-word-card-level"),
  }));
  check(`${lang} ArrowRight advances focus and selection together`,
        afterRight.focused === "basic" && afterRight.selected === "basic", JSON.stringify(afterRight));

  // Next / previous word.
  await page.click("[data-word-card-move='next']");
  await page.waitForTimeout(400);
  const moved = await page.evaluate(() => document.querySelector(".quran-word-card")?.getAttribute("data-occurrence-id"));
  check(`${lang} Next moves to a different occurrence`, !!moved && moved !== wantedId, `${wantedId} -> ${moved}`);
  await page.click("[data-word-card-move='previous']");
  await page.waitForTimeout(400);
  const back = await page.evaluate(() => document.querySelector(".quran-word-card")?.getAttribute("data-occurrence-id"));
  check(`${lang} Previous comes back to the first`, back === wantedId, `${moved} -> ${back}`);

  // Escape closes and focus returns to the word that opened it.
  await page.focus("[data-word-card-close]");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const closed = await page.evaluate(() => ({
    present: !!document.querySelector(".quran-word-card"),
    focusedOccurrence: document.activeElement?.getAttribute("data-word-occurrence"),
  }));
  check(`${lang} Escape really removes the card`, !closed.present);
  check(`${lang} focus returns to the word that opened it`,
        closed.focusedOccurrence === wantedId, `${closed.focusedOccurrence}`);

  // The card must never write.
  const writes = await page.evaluate(() => (window.__fsLog || [])
    .filter((r) => /setDoc|updateDoc|batchCommit|txCommit/.test(r.kind)).length);
  check(`${lang} opening and browsing the card writes nothing`, writes === 0, `writes=${writes}`);

  const real = errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|archive\.org|api\.quran\.com/.test(e));
  check(`${lang} no page errors`, real.length === 0, real.slice(0, 2).join(" | "));

  await page.screenshot({ path: `/tmp/phase2-card-${lang}.png` });
  await ctx.close();
}

// The occurrence indexes must stay OFF the load path (I9 / load-speed contract).
{
  console.log("\n=== occurrence indexes are on-demand only ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 } });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const onLoad = await page.evaluate(() => performance.getEntriesByType("resource")
    .filter((r) => /roots-index\.json|lemmas-index\.json/.test(r.name)).length);
  check("neither index is fetched on the landing path", onLoad === 0, `fetched=${onLoad}`);
  await enterReadWithWbw(page);
  const afterRead = await page.evaluate(() => performance.getEntriesByType("resource")
    .filter((r) => /roots-index\.json|lemmas-index\.json/.test(r.name)).length);
  check("nor merely by opening the Read view", afterRead === 0, `fetched=${afterRead}`);
  await ctx.close();
}

// Responsive. A new control is a layout change and gets measured like one --
// this project's own lesson, learned when a card was reported clean at seven
// widths and then ran off both edges of the owner's phone. Measured at every
// width behaviour.mjs uses, in both languages, on the RENDERED box.
{
  console.log("\n=== the card fits, at every viewport, in both languages ===");
  const VIEWPORTS = [
    ["320x640", 320, 640], ["360x640", 360, 640], ["390x844", 390, 844],
    ["412x915", 412, 915], ["768x1024", 768, 1024], ["1280x800", 1280, 800],
  ];
  for (const lang of ["en", "bn"]) {
    for (const [name, width, height] of VIEWPORTS) {
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height } });
      const { page } = await openPage(ctx, "/app/quranrevival.html");
      await enterReadWithWbw(page);
      const n = await page.locator("[data-word-occurrence]").count();
      if (!n) { check(`${lang} ${name} words render`, false, "no clickable words"); await ctx.close(); continue; }
      await page.locator("[data-word-occurrence]").first().click();
      await page.waitForTimeout(400);
      await page.click('[data-word-card-level="basic"]');
      await page.waitForTimeout(400);
      const m = await page.evaluate((vw) => {
        const c = document.querySelector(".quran-word-card");
        if (!c) return null;
        const r = c.getBoundingClientRect();
        const tabs = [...c.querySelectorAll('[role="tab"]')].map((t) => {
          const tr = t.getBoundingClientRect();
          return { top: Math.round(tr.top), h: Math.round(tr.height), w: Math.round(tr.width) };
        });
        const btns = [...c.querySelectorAll("button")].map((b) => {
          const br = b.getBoundingClientRect();
          return Math.min(Math.round(br.width), Math.round(br.height));
        });
        return {
          left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
          tabRows: new Set(tabs.map((t) => t.top)).size,
          smallestTap: btns.length ? Math.min(...btns) : 0,
          docOverflow: document.documentElement.scrollWidth > vw,
        };
      }, width);
      check(`${lang} ${name} card is on screen, neither edge cut`,
            !!m && m.left >= 0 && m.right <= width, JSON.stringify(m && { left: m.left, right: m.right, vw: width }));
      check(`${lang} ${name} the page does not scroll sideways`, m && !m.docOverflow, JSON.stringify(m?.docOverflow));
      check(`${lang} ${name} the three tabs stay on one line`, m && m.tabRows === 1, `rows=${m?.tabRows}`);
      // ~40px is what this project settled on for anything a finger presses;
      // these were 29px. Measured on the smallest side of every button in the
      // card, so a shrunken arrow or close button fails here too.
      check(`${lang} ${name} every button is a real tap target`,
            m && m.smallestTap >= 36, `smallest=${m?.smallestTap}px`);
      await ctx.close();
    }
  }
}

console.log(`\n==== MAP Phase 2 rendered acceptance: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
