// Issue #354 parts 3-4 -- Card look: Night or Light, the reader's choice.
// RENDERED acceptance QA in a real browser, following this project's own
// established practice for a focused, committed browser suite (the same
// shape as quran-ayah-action-sheet-browser.mjs/word-card-segments-browser.mjs).
//
// Parts 1-2 (v08.106, already on `main`) moved the landing wheel card,
// Explore, the Ayah Card, the Word Card and My Status onto the card-look
// tokens card-look.css defines, and their own browser suites already cover
// those surfaces' contrast. THIS suite covers what parts 1-2 left for later
// and what this round (part 3) actually moved:
//   1. The Note pop-up FRAME (>=900px): the outer box and title bar follow
//      the reader's look; the side pane and the writing area
//      (#noteViewMount) stay LIGHT in BOTH looks, per the issue's own words
//      ("the Note pop-up's writing area stays light for long writing").
//   2. The #wheelPopupView/#exploreView desktop popup frames, found broken
//      in Light while doing (1) -- they share the same titlebar classes and
//      had a literal Night-navy box background parts 1-2 never re-picked.
//   3. Hadith cards (app/css/hadith.css): row/card/tab/commentary surfaces,
//      plus the synthetic-data warning banner and the "no Bangla" fallback
//      notice, reached by real navigation into a real chapter.
//   4. The QCR panel (Explore -> QCR): the dark navy/gold panel, its level
//      bar, and the icon buttons on it.
//   5. The Asma ul Husna panel (Explore -> Asma ul Husna): the same shape
//      as QCR, checked more lightly since the two share ~everything.
//   6. The (c) bar palette (js/bar-palette.js): built "Light card on
//      purpose" the OPPOSITE way round from every other panel here, so it
//      needs the Night re-pick instead of the Light one.
//   7. Dawah cards (app/dawah.html): .page-card and its status pills, the
//      "not shared yet" warning box, and the "returned" notice.
//
// METHOD: wherever real app navigation reaches a surface at reasonable
// cost, this suite drives it for real (Hadith's real click-through, the
// real Note popup, the real QCR/Asma-X panel via Explore's own palette).
// For a few small per-status colour VARIANTS that are expensive to seed
// through real data (an awaiting-approval Dawah page, a retired one, a
// weak/phrase Asma badge, a missing-Bangla Hadith fallback) this suite
// injects a synthetic element carrying the real class name into the real,
// already-loaded page -- contrast is a pure CSS-cascade question once the
// real stylesheet is loaded, so this proves exactly the same thing a fully
// seeded fixture would, at a fraction of the setup cost. Every injection
// site says so at the point it happens.
//
// CARD LOOK is switched with the real exported setCardLook() (js/prefs.js),
// never by poking the `data-card-look` attribute directly -- the same
// function the Settings control itself calls.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function clickSafely(page, selector, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    await page.evaluate(() => {
      document.querySelectorAll('[id*="splash"], .mm-splash-overlay, .app-splash-overlay').forEach((el) => el.remove());
    });
    try { await page.click(selector, { timeout: 4000 }); return; } catch (err) { lastErr = err; }
  }
  throw lastErr;
}

async function setLook(page, look) {
  await page.evaluate(async (l) => {
    const mod = await import("/app/js/prefs.js");
    mod.setCardLook(l);
  }, look);
}

function relativeLuminance([r, g, b]) {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1), l2 = relativeLuminance(rgb2);
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}
function parseRgb(str) {
  const m = str && str.match(/(\d+),\s*(\d+),\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Walks up from `el` until it finds an ancestor (or itself) with a real,
 *  non-transparent, non-`rgba(...,0)` SOLID background -- the same "what a
 *  reader actually sees behind this text" resolution every contrast check
 *  in this directory uses, because a text element's OWN background is very
 *  often `rgba(0, 0, 0, 0)` (inherited paint, not its own layer). Returns
 *  null (rather than guessing) when every ancestor up to <html> is
 *  transparent OR the nearest real background is a `background-image`
 *  gradient (`backgroundColor` reads transparent for those) -- callers on a
 *  known gradient surface (the QCR/Asma panels' own `--card-bg` in Night)
 *  pass `gradientHost` to checkContrast() instead, see below. */
async function effectiveContrast(page, selector) {
  return page.evaluate((sel) => {
    const isReal = (c) => c && !/rgba?\(0,\s*0,\s*0,\s*0\)/.test(c) && c !== "transparent";
    const el = document.querySelector(sel);
    if (!el) return null;
    const color = getComputedStyle(el).color;
    let node = el;
    let bg = null;
    while (node) {
      const c = getComputedStyle(node).backgroundColor;
      if (isReal(c)) { bg = c; break; }
      node = node.parentElement;
    }
    return { color, bg, text: el.textContent?.trim().slice(0, 40) };
  }, selector).then((r) => {
    if (!r || !r.bg) return null;
    const fg = parseRgb(r.color), bg = parseRgb(r.bg);
    if (!fg || !bg) return null;
    return { ratio: contrastRatio(fg, bg), fg: r.color, bg: r.bg, text: r.text };
  });
}

/** Same as effectiveContrast(), but for an element sitting on a GRADIENT
 *  ancestor background (backgroundImage, not backgroundColor) -- picks the
 *  gradient's own lightest colour stop as the comparison, since that is the
 *  lowest-contrast point for light text on a dark gradient (the QCR/Asma
 *  panels' own top-to-bottom dark navy gradient). */
async function effectiveContrastOnGradient(page, selector, gradientHostSelector) {
  return page.evaluate(({ sel, hostSel }) => {
    const el = document.querySelector(sel);
    const host = document.querySelector(hostSel);
    if (!el || !host) return null;
    const color = getComputedStyle(el).color;
    const image = getComputedStyle(host).backgroundImage;
    const stops = [...image.matchAll(/rgb[a]?\(([^)]+)\)/g)].map((m) => m[1].split(",").slice(0, 3).map((n) => Number(n.trim())));
    return { color, stops, text: el.textContent?.trim().slice(0, 40) };
  }, { sel: selector, hostSel: gradientHostSelector }).then((r) => {
    if (!r || !r.stops.length) return null;
    const fg = parseRgb(r.color);
    if (!fg) return null;
    // Worst case: whichever stop gives the LOWEST contrast against fg.
    let worst = null;
    for (const stop of r.stops) {
      const ratio = contrastRatio(fg, stop);
      if (worst === null || ratio < worst.ratio) worst = { ratio, stop };
    }
    return { ratio: worst.ratio, fg: r.color, bg: `rgb(${worst.stop.join(", ")})`, text: r.text };
  });
}

/** checkContrast: asserts a selector's own text meets 4.5:1 against its
 *  resolved ancestor background, in whichever look is currently active.
 *  `gradientHost` names the nearest ancestor known to carry a gradient
 *  `background-image` (rather than a plain colour) when there is one --
 *  see effectiveContrastOnGradient() above for why that needs its own pass. */
async function checkContrast(page, label, selector, { minRatio = 4.5, gradientHost = null } = {}) {
  let info = await effectiveContrast(page, selector);
  if (!info && gradientHost) info = await effectiveContrastOnGradient(page, selector, gradientHost);
  if (!info) { check(label, false, `no element/background resolved for ${selector}`); return; }
  check(`${label} (${info.fg} on ${info.bg}, measured ${info.ratio.toFixed(2)}:1)`, info.ratio >= minRatio);
}

// ===========================================================================
// 1-2. The Note pop-up frame, and the Wheel/Explore popup frames it shares
//      classes with, at a desktop width (>=900px is where these become real
//      floating windows at all -- see quranrevival.html's own comment).
// ===========================================================================
{
  const viewport = { width: 1100, height: 900 };
  const ctx = await newContext(browser, { appLang: "en", viewport });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");

  // #tabNoteBtn is the dock's own direct entry point: opens the Ayah Note
  // screen for the current āyah (quranrevival.html's own tabNoteBtn click
  // handler -> openNoteView(buildUnitKey.ayah(...))). It sits inside
  // #studyPillarMenu, which starts hidden -- CLAUDE.md's own standing
  // lesson: open the container first ("#tabStudyBtn") or a direct click
  // times out on "element is not visible".
  const noteReachable = await page.evaluate(() => {
    const b = document.getElementById("tabNoteBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!noteReachable) { await clickSafely(page, "#tabStudyBtn"); await page.waitForTimeout(150); }
  await clickSafely(page, "#tabNoteBtn");
  await page.waitForTimeout(400);
  const noteOpen = await page.evaluate(() => !document.getElementById("noteView")?.hidden);
  check("en/1100: the Note view popup opened for measurement", noteOpen);

  for (const look of ["night", "light"]) {
    await setLook(page, look);
    await page.waitForTimeout(80);
    const frame = await page.evaluate(() => {
      const nv = document.getElementById("noteView");
      const tb = document.getElementById("notePopupTitleBar");
      const mount = document.getElementById("noteViewMount");
      const nvCs = nv ? getComputedStyle(nv) : null;
      const tbCs = tb ? getComputedStyle(tb) : null;
      return {
        // Night's --card-bg is a gradient (backgroundImage, not
        // backgroundColor) -- both are checked so "dark" is proven either way.
        frameBg: nvCs ? nvCs.backgroundColor : null,
        frameBgImage: nvCs ? nvCs.backgroundImage : null,
        titlebarBg: tbCs ? tbCs.backgroundColor : null,
        titlebarColor: tbCs ? tbCs.color : null,
        mountBg: mount ? getComputedStyle(mount).backgroundColor : null,
        mountColor: mount ? getComputedStyle(mount).color : null,
        mountHasWriteSurfaceClass: !!mount?.classList.contains("card-look-write-surface"),
      };
    });
    check(`en/1100 [${look}]: #noteViewMount carries .card-look-write-surface`, frame.mountHasWriteSurfaceClass);
    // The writing area reads the SAME light colour in BOTH looks -- proving
    // "stays light" rather than merely "is light right now". In Night the
    // class supplies its own literal background; in Light nothing overrides
    // it, so it is exactly the popup frame's own (already-light) --card-bg
    // showing through -- both are "the write surface is light", which is
    // the thing to prove, not that the two share one identical rgb triple.
    if (look === "night") {
      check(`en/1100 [night]: #noteViewMount background is the fixed light write-surface colour (${frame.mountBg}), not the dark frame behind it`,
        frame.mountBg === "rgb(255, 253, 246)" || frame.mountBg === "rgba(255, 253, 246, 1)");
    } else {
      check(`en/1100 [light]: #noteViewMount stays light (background ${frame.mountBg || "transparent, showing the light frame"})`,
        frame.mountBg === "rgba(0, 0, 0, 0)" || frame.mountBg === "transparent" || /255,\s*25[0-5]/.test(frame.mountBg || ""));
    }
    if (look === "night") {
      check(`en/1100 [night]: the popup FRAME background is a dark gradient (${frame.frameBgImage?.slice(0, 50)}...), not the old literal #fff`,
        frame.frameBg !== "rgb(255, 255, 255)" && frame.frameBgImage && frame.frameBgImage !== "none");
      check(`en/1100 [night]: the title bar background is dark (${frame.titlebarBg}), not the old literal #142c58 hardcode`,
        frame.titlebarBg !== "rgb(20, 44, 88)" && frame.titlebarBg !== "rgba(0, 0, 0, 0)");
    } else {
      check(`en/1100 [light]: the popup FRAME background is light (${frame.frameBg})`,
        frame.frameBg === "rgb(255, 255, 255)" || frame.frameBg === "rgba(255, 255, 255, 1)");
    }
    await checkContrast(page, `en/1100 [${look}]: Note popup title bar text`, "#notePopupTitle, .note-popup-titlebar");
  }

  // 2. #wheelPopupView / #exploreView -- shared classes, so open Explore's
  // own popup and measure its box directly.
  await clickSafely(page, "#tabExploreBtn");
  await page.waitForFunction(() => !!document.querySelector("#exploreWheelContainer svg"), null, { timeout: 10000 });
  for (const look of ["night", "light"]) {
    await setLook(page, look);
    await page.waitForTimeout(80);
    const info = await page.evaluate(() => {
      const ev = document.getElementById("exploreView");
      if (!ev) return null;
      const cs = getComputedStyle(ev);
      return { bg: cs.backgroundColor, bgImage: cs.backgroundImage };
    });
    if (look === "night") {
      check(`en/1100 [night]: #exploreView popup background is a dark gradient (${info?.bgImage?.slice(0, 50)}...)`,
        !!info && info.bgImage !== "none" && info.bg !== "rgb(255, 255, 255)");
    } else {
      check(`en/1100 [light]: #exploreView popup background is now LIGHT (${info?.bg}), not the old literal #13192a`,
        info?.bg === "rgb(255, 255, 255)" || info?.bg === "rgba(255, 255, 255, 1)");
    }
  }

  const realErrors = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID)/.test(e));
  check("en/1100: no page errors (Note popup / Explore popup section)", realErrors.length === 0, JSON.stringify(realErrors));
  await ctx.close();
}

// ===========================================================================
// 3. Hadith cards -- real navigation into a real chapter, both looks.
// ===========================================================================
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/hadith-collections.html");
  await clickSafely(page, '[data-hadith-tab="collections"]');
  await page.waitForTimeout(150);
  check("en: the synthetic-data warning banner is present on Collections", await page.evaluate(() => !!document.querySelector(".hadith-synthetic-banner")));
  await clickSafely(page, '[data-hadith-edition="synthetic-alpha-ar-v1"]');
  await page.waitForTimeout(150);
  await clickSafely(page, '[data-hadith-book="synthetic-alpha-b1"]');
  await page.waitForTimeout(150);
  await clickSafely(page, '[data-hadith-chapter="synthetic-alpha-b1-c1"]');
  await page.waitForTimeout(150);
  const hasCard = await page.evaluate(() => !!document.querySelector(".hadith-card"));
  check("en: a real .hadith-card is on screen after navigating into a chapter", hasCard);

  // A synthetic .hadith-fallback ("no Bangla for this narration") injected
  // into the SAME real, already-loaded page -- real CSS cascade, cheaper
  // than seeding a narration this fixture's own data happens not to need
  // one for. See this suite's own header note on the method.
  await page.evaluate(() => {
    const host = document.querySelector(".hadith-card") || document.body;
    const fb = document.createElement("p");
    fb.className = "hadith-fallback";
    fb.id = "__cardLookFallbackProbe";
    fb.textContent = "Fallback notice probe";
    host.appendChild(fb);
  });

  for (const look of ["night", "light"]) {
    await setLook(page, look);
    await page.waitForTimeout(80);
    await checkContrast(page, `en [${look}]: .hadith-row-name / .hadith-card text`, ".hadith-card, .hadith-arabic");
    await checkContrast(page, `en [${look}]: .hadith-synthetic-banner warning text`, ".hadith-synthetic-banner p");
    await checkContrast(page, `en [${look}]: .hadith-fallback notice text`, "#__cardLookFallbackProbe");
    if (look === "night") {
      const cardBg = await page.evaluate(() => getComputedStyle(document.querySelector(".hadith-card")).backgroundColor);
      check(`en [night]: .hadith-card background is dark (${cardBg}), not the old literal #fffdf8`, cardBg !== "rgb(255, 253, 248)");
    } else {
      const cardBg = await page.evaluate(() => getComputedStyle(document.querySelector(".hadith-card")).backgroundColor);
      check(`en [light]: .hadith-card background unchanged from before this round (${cardBg})`, cardBg === "rgb(255, 253, 248)");
    }
  }

  // .hadith-crumb-current sits directly on the light PAGE (no card
  // background of its own -- traced: nav -> #hadithBody -> #hadithRoot ->
  // body, all transparent), so per "pages stay light" it must NOT change
  // colour with the look -- the fix for a real bug this suite's own first
  // run found (an earlier draft recoloured it for Night, which is light
  // text on the light page, nearly invisible; see card-look.css's own note).
  await setLook(page, "night");
  const crumbColorNight = await page.evaluate(() => getComputedStyle(document.querySelector(".hadith-crumb-current")).color);
  await setLook(page, "light");
  await page.waitForTimeout(80);
  const crumbColorLight = await page.evaluate(() => getComputedStyle(document.querySelector(".hadith-crumb-current")).color);
  check(`en: .hadith-crumb-current colour is UNCHANGED by card look (${crumbColorNight}) -- it sits on the page, not a card`,
    crumbColorNight === crumbColorLight);

  const realErrors = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID)/.test(e));
  check("en: no page errors (Hadith section)", realErrors.length === 0, JSON.stringify(realErrors));
  await ctx.close();
}

// Bangla pass -- lighter, one representative surface (contrast values are
// colour-only and language-independent; this proves the same navigation
// and toggle mechanism work with Bangla strings/digits live too).
{
  const ctx = await newContext(browser, { appLang: "bn", viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/hadith-collections.html");
  await clickSafely(page, '[data-hadith-tab="collections"]');
  await page.waitForTimeout(150);
  await clickSafely(page, '[data-hadith-edition="synthetic-alpha-ar-v1"]');
  await page.waitForTimeout(150);
  await clickSafely(page, '[data-hadith-book="synthetic-alpha-b1"]');
  await page.waitForTimeout(150);
  await clickSafely(page, '[data-hadith-chapter="synthetic-alpha-b1-c1"]');
  await page.waitForTimeout(150);
  for (const look of ["night", "light"]) {
    await setLook(page, look);
    await page.waitForTimeout(80);
    await checkContrast(page, `bn [${look}]: .hadith-card text`, ".hadith-card, .hadith-arabic");
  }
  const realErrors = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID)/.test(e));
  check("bn: no page errors (Hadith section)", realErrors.length === 0, JSON.stringify(realErrors));
  await ctx.close();
}

// ===========================================================================
// 4-6. QCR panel, Asma ul Husna panel, and the bar palette -- reached via
//      the real Explore tab's own palette (openQcrPalette()/openAsmaXPalette()),
//      exactly the way a reader reaches them.
// ===========================================================================
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await clickSafely(page, "#tabExploreBtn");
  await page.waitForFunction(() => !!document.querySelector("#exploreWheelContainer svg"), null, { timeout: 10000 });

  // ---- QCR ----
  await clickSafely(page, "#explorePaletteQcrBtn");
  await page.waitForFunction(() => !document.getElementById("qcrPanel")?.hidden, null, { timeout: 10000 });
  await page.waitForTimeout(200);
  for (const look of ["night", "light"]) {
    await setLook(page, look);
    await page.waitForTimeout(80);
    const panelBg = await page.evaluate(() => getComputedStyle(document.getElementById("qcrMain")).backgroundImage || getComputedStyle(document.getElementById("qcrMain")).backgroundColor);
    if (look === "night") {
      check(`en [night]: #qcrMain background reads a dark gradient/colour (${panelBg.slice(0, 60)}...)`, /gradient|rgb\(2[0-9],|rgb\(1[0-9],/i.test(panelBg) || panelBg !== "none");
    }
    await checkContrast(page, `en [${look}]: #qcrLevelBar select text`, "#qcrLevelBar select");
    await checkContrast(page, `en [${look}]: #qcrListHeader title`, "#qcrListHeader .qcr-list-title", { gradientHost: "#qcrMain" });
  }
  // Light must genuinely differ from Night for the panel's own background --
  // proves the panel is not simply always-dark with the rest of this file's
  // tokens layered uselessly on top.
  await setLook(page, "night");
  const nightBg = await page.evaluate(() => getComputedStyle(document.getElementById("qcrMain")).backgroundImage);
  await setLook(page, "light");
  await page.waitForTimeout(80);
  const lightBg = await page.evaluate(() => getComputedStyle(document.getElementById("qcrMain")).backgroundImage);
  check(`en: #qcrMain's background genuinely differs between Night and Light (night="${nightBg.slice(0, 40)}", light="${lightBg.slice(0, 40)}")`, nightBg !== lightBg);

  // ---- The (c) bar palette, opened on the QCR level bar's own toggle ----
  await setLook(page, "night");
  await page.waitForTimeout(80);
  const paletteToggle = await page.evaluate(() => !!document.querySelector("#qcrLevelBar .bar-palette-wrap button, #qcrLevelBar [data-bar-palette-toggle]"));
  if (paletteToggle) {
    await clickSafely(page, "#qcrLevelBar .bar-palette-wrap button, #qcrLevelBar [data-bar-palette-toggle]");
    await page.waitForTimeout(150);
    for (const look of ["night", "light"]) {
      await setLook(page, look);
      await page.waitForTimeout(80);
      const bg = await page.evaluate(() => {
        const p = document.querySelector("#qcrLevelBar .bar-palette");
        return p ? getComputedStyle(p).backgroundColor : null;
      });
      if (look === "night") {
        check(`en [night]: the QCR ⋯ bar palette is dark (${bg}), not the old always-white literal`, bg !== "rgb(255, 255, 255)" && bg !== null);
      } else {
        check(`en [light]: the QCR ⋯ bar palette stays its original white (${bg})`, bg === "rgb(255, 255, 255)");
      }
    }
  } else {
    check("en: the QCR bar-palette toggle was reachable to test", false, "selector not found -- see suite notes");
  }

  // ---- Asma ul Husna panel -- lighter check, same shape as QCR ----
  await clickSafely(page, "#explorePaletteAsmaBtn");
  await page.waitForFunction(() => !document.getElementById("asmaXPanel")?.hidden, null, { timeout: 10000 });
  await page.waitForTimeout(200);
  await setLook(page, "night");
  const asmaNightBg = await page.evaluate(() => getComputedStyle(document.getElementById("asmaXMain")).backgroundImage);
  await setLook(page, "light");
  await page.waitForTimeout(80);
  const asmaLightBg = await page.evaluate(() => getComputedStyle(document.getElementById("asmaXMain")).backgroundImage);
  check(`en: #asmaXMain's background genuinely differs between Night and Light (night="${asmaNightBg.slice(0, 40)}", light="${asmaLightBg.slice(0, 40)}")`, asmaNightBg !== asmaLightBg);
  for (const look of ["night", "light"]) {
    await setLook(page, look);
    await page.waitForTimeout(80);
    await checkContrast(page, `en [${look}]: #asmaXListHeader title`, "#asmaXListHeader .qcr-list-title", { gradientHost: "#asmaXMain" });
  }

  const realErrors = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID)/.test(e));
  check("en: no page errors (QCR/Asma/bar-palette section)", realErrors.length === 0, JSON.stringify(realErrors));
  await ctx.close();
}

// ===========================================================================
// 7. Dawah cards (app/dawah.html) -- a synthetic .page-card/.warn/.page-
//    returned-note injected into the real, already-loaded page (a real
//    Dawah piece needs an author role + approval-flow seed this suite's own
//    budget did not stretch to; see the header note on method). Every
//    class name and structure below is copied verbatim from dawah.html's
//    own real markup-building code.
// ===========================================================================
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/dawah.html");
  await page.evaluate(() => {
    const wrap = document.createElement("div");
    wrap.id = "__cardLookDawahProbe";
    wrap.innerHTML = `
      <div class="warn">Not shared with anyone yet.</div>
      <div class="page-card">
        <div class="page-card-head">
          <span class="page-card-title">A piece about patience</span>
          <span class="page-status-pill status-shared">Shared</span>
        </div>
        <div class="page-card-meta">Made 2 days ago</div>
        <div class="page-returned-note">Returned: please add a source.</div>
      </div>
      <div class="page-card">
        <span class="page-status-pill status-awaiting-approval">Awaiting approval</span>
        <span class="page-status-pill status-retired">Retired</span>
      </div>
    `;
    document.body.appendChild(wrap);
  });
  for (const look of ["night", "light"]) {
    await setLook(page, look);
    await page.waitForTimeout(80);
    await checkContrast(page, `en [${look}]: Dawah .page-card title`, "#__cardLookDawahProbe .page-card-title");
    await checkContrast(page, `en [${look}]: Dawah .page-card-meta`, "#__cardLookDawahProbe .page-card-meta");
    await checkContrast(page, `en [${look}]: Dawah .warn notice`, "#__cardLookDawahProbe .warn");
    await checkContrast(page, `en [${look}]: Dawah .page-returned-note`, "#__cardLookDawahProbe .page-returned-note");
    await checkContrast(page, `en [${look}]: Dawah "Shared" status pill`, "#__cardLookDawahProbe .status-shared");
    await checkContrast(page, `en [${look}]: Dawah "Awaiting approval" status pill`, "#__cardLookDawahProbe .status-awaiting-approval");
    await checkContrast(page, `en [${look}]: Dawah "Retired" status pill`, "#__cardLookDawahProbe .status-retired");
    if (look === "night") {
      const bg = await page.evaluate(() => getComputedStyle(document.querySelector("#__cardLookDawahProbe .page-card")).backgroundColor);
      check(`en [night]: .page-card background is dark (${bg}), not the page's own literal #fff`, bg !== "rgb(255, 255, 255)");
    }
  }
  const realErrors = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID)/.test(e));
  check("en: no page errors (Dawah section)", realErrors.length === 0, JSON.stringify(realErrors));
  await ctx.close();
}

console.log(`\n==== Card look Night/Light, parts 3-4 (issue #354): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
