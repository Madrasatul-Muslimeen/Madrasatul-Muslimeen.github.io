// Full app translation, phase 1 (the shell) — behaviour suite.
import fs from "fs";
import { chromium, newContext, openPage } from "./harness.mjs";

// Chromium: use whatever this machine has. CHROMIUM_PATH overrides;
// otherwise Playwright finds its own download, which is the normal case.
const EXE = process.env.CHROMIUM_PATH || undefined;
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const BANGLA = /[ঀ-৿]/;

// Shell round 22 retired #readRef -- the owner spotted it printed the same
// sentence as the dock's "Tracking:" line for five of the six unit types, and
// the pickers now say it better because they are the readout AND the control.
// This reads whichever of the two is actually on screen.
const readingRef = (page) => page.evaluate(() => {
  const dock = document.getElementById("unitLabel");
  if (dock && dock.textContent.trim() && getComputedStyle(dock).display !== "none") return dock.textContent.trim();
  const s = document.getElementById("readSurahSelect"), a = document.getElementById("readAyahSelect");
  return `Surah ${s.value}, Ayah ${a.value}`;
});

// Fixes round (23 Aug 2026), item 1 -- every bookmark-creation call site now
// opens js/bookmark-popover.js's own DOM overlay instead of a native
// prompt(), so a test can no longer just accept a dialog. Waits for the
// overlay, fills the name (and, when asked, files it under an existing
// folder or types a brand-new one), then clicks Save. Pass folderName to
// pick an existing folder by its visible text, or newFolderName to create
// one in the same step; omit both to leave it Unfiled.
async function fillBookmarkPopover(page, { name, folderName = null, newFolderName = null } = {}) {
  await page.waitForSelector(".bm-popover-overlay");
  if (name !== undefined && name !== null) {
    await page.fill("[data-bm-pop-name]", name);
  }
  if (newFolderName) {
    await page.selectOption("[data-bm-pop-folder]", "__new__");
    await page.fill("[data-bm-pop-newfolder]", newFolderName);
  } else if (folderName) {
    await page.selectOption("[data-bm-pop-folder]", { label: folderName });
  }
  await page.click("[data-bm-pop-save]");
}

async function cancelBookmarkPopover(page) {
  await page.waitForSelector(".bm-popover-overlay");
  await page.click("[data-bm-pop-cancel]");
}


const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
async function ctxFor(o) {
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 }, ...o });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  return ctx;
}
const openHome = async (page) => {
  await page.evaluate(() => { const d = document.querySelector(".nav-cat-home"); if (d) d.open = true; });
  await page.waitForTimeout(80);
};
const openStudyOptions = async (page) => {
  const open = await page.evaluate(() => !document.getElementById("panelStudyOptions").hidden);
  if (!open) { await page.click("#tabStudyOptionsBtn"); await page.waitForTimeout(180); }
};
const openCats = async (page) => {
  await page.evaluate(() => document.querySelectorAll(".nav-cat").forEach((d) => (d.open = true)));
  await page.waitForTimeout(120);
};

const NAV_PAGES = [
  "/app/quranrevival.html", "/app/deen-study.html", "/app/arabic-study.html",
  "/app/hadith-study.html", "/app/general-study.html", "/app/naturelife-study.html",
  "/app/life-skill.html", "/app/health-study.html", "/app/ldog-study.html",
  "/app/asma-study.html", "/app/people.html", "/app/catalogue.html",
  "/app/records.html", "/app/monitor.html", "/app/homework.html",
  "/app/curriculum.html", "/app/classes.html", "/app/course-offers.html", "/app/about.html",
  "/app/bookmarks.html",
];

console.log("\n=== 1. English is untouched (nothing regressed for today's users) ===");
{
  const ctx = await ctxFor({ banner: true });
  for (const p of NAV_PAGES) {
    const { page, errors } = await openPage(ctx, p);
    await openCats(page);
    const r = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      cats: [...document.querySelectorAll(".nav-cat > summary")].map((s) => s.textContent.trim()),
      // The language picker's own option reads "বাংলা (Bangla)" in EVERY
      // language on purpose -- it is how a Bangla-only reader finds the
      // setting at all -- so it is excluded rather than counted as a leak.
      anyBangla: (() => {
        const clone = document.body.cloneNode(true);
        // Every LANGUAGE PICKER names Bangla in Bangla, in every language, on
        // purpose -- that is how a Bangla-only reader finds the setting at all.
        // (The Quran module's translation/word-by-word pickers have done this
        // since long before this round.) Excluded rather than counted as a leak.
        clone.querySelectorAll("#navAppLangSelect, #trBnControl, #wbwLangSelect, script, style").forEach((el) => el.remove());
        return /[ঀ-৿]/.test(clone.innerText || clone.textContent || "");
      })(),
    }));
    check(`${p} nav still English`, r.cats.includes("Modules") && r.cats.includes("Operation"), JSON.stringify(r.cats));
    check(`${p} no Bangla leaked into an English page`, !r.anyBangla);
    check(`${p} no page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
    await page.close();
  }
  await ctx.close();
}

console.log("\n=== 2. Bangla: the nav, the menus and the Home strip all turn over ===");
{
  const ctx = await ctxFor({ banner: true, appLang: "bn" });
  for (const p of NAV_PAGES) {
    const { page, errors } = await openPage(ctx, p);
    await openCats(page);
    await openHome(page);
    const r = await page.evaluate(() => ({
      htmlLang: document.documentElement.lang,
      cats: [...document.querySelectorAll(".nav-cat > summary")].map((s) => s.textContent.trim()),
      links: [...document.querySelectorAll(".nav-link")].map((a) => a.textContent.trim()),
      who: document.getElementById("who")?.textContent?.trim(),
      signIn: document.getElementById("signInBtn")?.textContent?.trim(),
      signOut: document.getElementById("signOutBtn")?.textContent?.trim(),
      settingsLabel: document.querySelector('label[for="navAppLangSelect"]')?.textContent?.trim(),
      font: getComputedStyle(document.body).fontFamily,
    }));
    check(`${p} <html lang> is bn`, r.htmlLang === "bn", r.htmlLang);
    check(`${p} nav categories are Bangla`, r.cats.length > 0 && r.cats.every((c) => BANGLA.test(c)), JSON.stringify(r.cats));
    check(`${p} nav links are Bangla`, r.links.length > 0 && r.links.every((l) => BANGLA.test(l)), JSON.stringify(r.links.slice(0, 4)));
    check(`${p} sign-in strip is Bangla`, BANGLA.test(r.who || "") && BANGLA.test(r.signOut || ""), JSON.stringify([r.who, r.signOut]));
    check(`${p} Settings > Language label is Bangla`, BANGLA.test(r.settingsLabel || ""), r.settingsLabel);
    check(`${p} Bengali font in the stack`, /Bengali|Nirmala|Kalpurush|Vrinda/.test(r.font), r.font);
    check(`${p} no page errors under bn`, errors.length === 0, errors.slice(0, 2).join(" | "));
    await page.close();
  }
  await ctx.close();
}

console.log("\n=== 3. Switching language works BOTH ways, in place ===");
{
  const ctx = await ctxFor({ banner: true });
  const { page } = await openPage(ctx, "/app/about.html");
  await page.evaluate(() => { window.__marker = "kept"; });
  const before = await page.evaluate(() => document.querySelector("h1")?.textContent?.trim());
  await openHome(page);
  await page.selectOption("#navAppLangSelect", "bn");
  await page.waitForTimeout(400);
  await openCats(page);
  const bn = await page.evaluate(() => ({
    heading: document.querySelector("h1")?.textContent?.trim(),
    cats: [...document.querySelectorAll(".nav-cat > summary")].map((s) => s.textContent.trim()),
    marker: window.__marker,
    htmlLang: document.documentElement.lang,
  }));
  check("3a heading became Bangla in place", BANGLA.test(bn.heading || ""), bn.heading);
  check("3a nav became Bangla in place", bn.cats.every((c) => BANGLA.test(c)), JSON.stringify(bn.cats));
  check("3a page did NOT reload", bn.marker === undefined || bn.marker === "kept");

  await openHome(page);
  await page.selectOption("#navAppLangSelect", "en");
  await page.waitForTimeout(400);
  await openCats(page);
  const back = await page.evaluate(() => ({
    heading: document.querySelector("h1")?.textContent?.trim(),
    cats: [...document.querySelectorAll(".nav-cat > summary")].map((s) => s.textContent.trim()),
    marker: window.__marker,
    htmlLang: document.documentElement.lang,
    anyBangla: (() => {
      const clone = document.body.cloneNode(true);
      // Every LANGUAGE PICKER names Bangla in Bangla, in every language, on
        // purpose -- that is how a Bangla-only reader finds the setting at all.
        // (The Quran module's translation/word-by-word pickers have done this
        // since long before this round.) Excluded rather than counted as a leak.
        clone.querySelectorAll("#navAppLangSelect, #trBnControl, #wbwLangSelect, script, style").forEach((el) => el.remove());
      return /[ঀ-৿]/.test(clone.innerText || clone.textContent || "");
    })(),
  }));
  check("3b English comes BACK (the round-trip that a one-way DOM swap would break)", back.heading === before, `${before} -> ${back.heading}`);
  check("3b nav back to English", back.cats.includes("Modules"), JSON.stringify(back.cats));
  check("3b html lang back to en", back.htmlLang === "en");
  check("3b no Bangla left anywhere", !back.anyBangla);
  check("3b still no reload", back.marker === undefined || back.marker === "kept");
  await page.close();
  await ctx.close();
}

console.log("\n=== 4. Progress statuses are translated everywhere they show ===");
{
  const ctx = await ctxFor({ banner: true, appLang: "bn" });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const r = await page.evaluate(() => {
    const legend = document.getElementById("wheelLegendContainer")?.innerText ?? "";
    const chips = [...document.querySelectorAll(".status-chip")].map((c) => c.textContent.trim());
    return { legend, chips };
  });
  check("4 wheel legend statuses are Bangla", BANGLA.test(r.legend), r.legend.slice(0, 60));
  check("4 sidebar status chips are Bangla", r.chips.length > 0 && r.chips.every((c) => BANGLA.test(c)), JSON.stringify(r.chips.slice(0, 3)));
  await page.close();
  await ctx.close();
}

console.log("\n=== 5. Invite and onboarding — the first screens a new person sees ===");
{
  const ctx = await ctxFor({ banner: true, appLang: "bn" });
  for (const p of ["/app/onboarding.html", "/app/accept-invite.html"]) {
    const { page, errors } = await openPage(ctx, p);
    const r = await page.evaluate(() => ({
      heading: document.querySelector("h1, h2")?.textContent?.trim(),
      body: document.body.innerText,
      font: getComputedStyle(document.body).fontFamily,
    }));
    check(`${p} heading is Bangla`, BANGLA.test(r.heading || ""), r.heading);
    check(`${p} body has Bangla`, BANGLA.test(r.body));
    check(`${p} Bengali font in the stack`, /Bengali|Nirmala|Kalpurush|Vrinda/.test(r.font), r.font);
    check(`${p} no page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
    await page.close();
  }
  await ctx.close();
}

console.log("\n=== 6. Bengali numerals available, and never applied to identifiers ===");
{
  const ctx = await ctxFor({ banner: true, appLang: "bn" });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const r = await page.evaluate(async () => {
    const { num } = await import("/app/js/i18n.js");
    return {
      digits: num(255),
      mixed: num("2:255"),
      version: document.getElementById("appVersion")?.textContent?.trim(),
    };
  });
  check("6 num() gives Bengali digits", r.digits === "২৫৫", r.digits);
  check("6 num() converts inside a reference too", r.mixed === "২:২৫৫", r.mixed);
  // The POINT of this check is that num() never touches the version string --
  // Bengali digits in an id, a URL or a version number would be a real bug.
  // It used to assert the literal /v?0?7\.3/, which quietly turned it into a
  // test of what release we were on: it failed the moment v07.39 became
  // v07.40, reporting the correct value as wrong. Written against the shape
  // now, so a version bump can never fail it again.
  check("6 the version badge is NOT mangled into Bengali digits",
        /^v?\d+\.\d+$/.test(r.version || "") && !/[০-৯]/.test(r.version || ""), r.version);
  await page.close();
  await ctx.close();
}

console.log("\n=== 7. Tenant-authored names still follow the same setting (v07.30 intact) ===");
{
  const ctx = await ctxFor({ banner: true, appLang: "bn" });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const names = await page.evaluate(() => [...document.getElementById("personSelect").options].map((o) => o.textContent));
  check("7 person names still Bangla", names.some((n) => BANGLA.test(n)), JSON.stringify(names));
  await page.close();
  await ctx.close();
}


console.log("\n=== 8. PHASE 2: the Quran module in Bangla ===");
{
  const ctx = await ctxFor({ banner: true, appLang: "bn" });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");

  // Surah names + Bengali numerals in the picker.
  const surah = await page.evaluate(() => {
    const opts = [...document.getElementById("surahSelect").options];
    return { first: opts[0]?.textContent, values: opts.slice(0, 3).map((o) => o.value), count: opts.length };
  });
  check("8a surah picker shows Bangla names", BANGLA.test(surah.first || ""), surah.first);
  check("8a ...with Bengali numerals", /[০-৯]/.test(surah.first || ""), surah.first);
  check("8a all 114 surahs present", surah.count === 114, String(surah.count));
  check("8a option VALUES stay plain numbers (they are parsed back with Number())",
        surah.values.join() === "1,2,3", JSON.stringify(surah.values));

  // Ayah picker + position readout.
  const ayah = await page.evaluate(() => ({
    firstOpt: document.getElementById("ayahSelect").options[0]?.textContent,
    firstVal: document.getElementById("ayahSelect").options[0]?.value,
    position: document.getElementById("ayahPosition")?.textContent?.trim(),
  }));
  check("8b ayah picker uses Bengali numerals", /[০-৯]/.test(ayah.firstOpt || ""), ayah.firstOpt);
  check("8b ayah option value stays plain", ayah.firstVal === "1", ayah.firstVal);
  check("8b position readout is Bangla", BANGLA.test(ayah.position || ""), ayah.position);

  // The wheel's centre disc no longer draws the chosen ayah's own text at
  // all (a shell round after v07.61/62 -- the hub's own permanent
  // Ta'awwudh/Bismillah plus its Surah/Ayah pickers replaced it, and a
  // fragment of the old, unbounded ayah text used to show through behind
  // the narrower hub overlay). The Bangla surface that check used to be
  // here now lives in the hub's OWN Surah picker instead -- syncWheelHubPickers()
  // mirrors it from the canonical control on every renderWheel(), whether or
  // not the intro's been tapped yet, so its options are already Bangla.
  const centre = await page.evaluate(() => ({
    svgText: [...document.querySelectorAll("#wheelContainer svg text:not(.wheel-seg-num)")].map((t) => t.textContent.trim()).filter(Boolean),
    hubSurah: document.getElementById("wheelHubSurahSelect")?.options[0]?.textContent,
  }));
  check("8c the wheel centre draws no ayah text of its own any more", centre.svgText.length === 0, JSON.stringify(centre.svgText));
  check("8c ...the hub's own Surah picker is Bangla with Bengali numerals instead",
        BANGLA.test(centre.hubSurah || "") && /[০-৯]/.test(centre.hubSurah || ""), centre.hubSurah);

  // The Study options panel and its three bars.
  await openStudyOptions(page);
  const panel = await page.evaluate(() => ({
    tabs: [...document.querySelectorAll(".qr-tab")].map((b) => b.textContent.trim()),
    // Spacer labels (&nbsp;, keeping a bare button or checkbox aligned with
    // the control beside it) carry no words, so they are skipped rather than
    // reported as untranslated.
    labels: [...document.querySelectorAll("#panelStudyOptions .opt-cell > label")]
      .map((l) => l.textContent.replace(/\u00a0/g, "").trim()).filter(Boolean),
    buttons: [...document.querySelectorAll("#panelStudyOptions .opt-btn")].map((b) => b.textContent.trim()),
    unitOpts: [...document.getElementById("unitTypeSelect").options].map((o) => o.textContent.trim()),
  }));
  check("8d dock tabs are Bangla", panel.tabs.every((x) => BANGLA.test(x)), JSON.stringify(panel.tabs));
  check("8d bar labels are Bangla", panel.labels.length > 0 && panel.labels.every((x) => BANGLA.test(x)), JSON.stringify(panel.labels));
  check("8d bar-3 buttons are Bangla", panel.buttons.every((x) => BANGLA.test(x)), JSON.stringify(panel.buttons));
  check("8d Study Unit options are Bangla", panel.unitOpts.every((x) => BANGLA.test(x)), JSON.stringify(panel.unitOpts));

  // The "Go to" box must accept Bengali digits — a Bangla keyboard types ২:২৫৫.
  await page.fill("#jumpInput", "২:২৫৫");
  await page.click("#searchBtn");
  await page.waitForTimeout(600);
  const jumped = await page.evaluate(() => ({
    surah: document.getElementById("surahSelect").value,
    ayah: document.getElementById("ayahSelect").value,
    msgShown: !document.getElementById("jumpMsg").hidden,
  }));
  check("8e typing Bengali digits in Go to actually jumps", jumped.surah === "2" && jumped.ayah === "255", JSON.stringify(jumped));
  check("8e ...with no error message", !jumped.msgShown);

  // And a bad one still explains itself, in Bangla.
  await page.fill("#jumpInput", "৯৯৯");
  await page.click("#searchBtn");
  await page.waitForTimeout(300);
  const badMsg = await page.evaluate(() => document.getElementById("jumpMsg").textContent.trim());
  check("8f a bad reference explains itself in Bangla", BANGLA.test(badMsg), badMsg);

  // Reading view is always visible since shell round 18 -- no button to press.
  const reading = await page.evaluate(() => [...document.querySelectorAll("#readingViewCard label")].map((l) => l.textContent.trim()));
  check("8g Reading view labels are Bangla", reading.every((x) => BANGLA.test(x)), JSON.stringify(reading));

  check("8 no page errors anywhere in the Quran module under bn", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

console.log("\n=== 9. PHASE 2: English is still exactly English ===");
{
  const ctx = await ctxFor({ banner: true });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const r = await page.evaluate(() => ({
    firstSurah: document.getElementById("surahSelect").options[0]?.textContent,
    position: document.getElementById("ayahPosition")?.textContent?.trim(),
    centreText: [...document.querySelectorAll("#wheelContainer svg text:not(.wheel-seg-num)")].map((t) => t.textContent.trim()).filter(Boolean),
    hubSurah: document.getElementById("wheelHubSurahSelect")?.options[0]?.textContent,
  }));
  check("9 surah picker still English with Western digits", r.firstSurah?.startsWith("1.") && !BANGLA.test(r.firstSurah), r.firstSurah);
  check("9 position readout still English", /Surah/.test(r.position || ""), r.position);
  check("9 wheel centre still draws no ayah text of its own", r.centreText.length === 0, JSON.stringify(r.centreText));
  check("9 ...the hub's own Surah picker is still English too", r.hubSurah?.startsWith("1.") && !BANGLA.test(r.hubSurah || ""), r.hubSurah);
  await page.close();
  await ctx.close();
}


console.log("\n=== 10. PHASE 3: the nine other modules in Bangla ===");
{
  const MODULE_PAGES = [
    "/app/deen-study.html", "/app/arabic-study.html", "/app/hadith-study.html",
    "/app/general-study.html", "/app/naturelife-study.html", "/app/life-skill.html",
    "/app/health-study.html", "/app/ldog-study.html", "/app/asma-study.html",
  ];
  const ctx = await ctxFor({ banner: true, appLang: "bn" });
  for (const p of MODULE_PAGES) {
    const { page, errors } = await openPage(ctx, p);
    const r = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim(),
      intro: [...document.querySelectorAll("p")].map((x) => x.textContent.trim()).find((x) => x.length > 40),
    }));
    check(`${p} heading is Bangla`, BANGLA.test(r.h1 || ""), r.h1);
    check(`${p} browser-tab title is Bangla`, BANGLA.test(r.title || ""), r.title);
    check(`${p} intro paragraph is Bangla`, !r.intro || BANGLA.test(r.intro), (r.intro || "").slice(0, 60));
    check(`${p} carries no developer noise like "(Phase 6)"`, !/\(Phase \d|\(F-\d/.test(`${r.title} ${r.h1}`), `${r.title} | ${r.h1}`);
    check(`${p} no page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
    await page.close();
  }
  await ctx.close();
}

console.log("\n=== 11. PHASE 3: SEEDED English-only data translates (the langText fallback) ===");
{
  // The stub's Deen subjects carry ONLY an `en` name, exactly like the real
  // tenant data seeded into Firestore weeks ago. If these render in Bangla,
  // the catalogue fallback in js/lang.js works and no data migration was
  // needed -- which is the whole reason phase 3 was built that way.
  const ctx = await ctxFor({ banner: true, appLang: "bn" });
  const { page } = await openPage(ctx, "/app/deen-study.html");
  const r = await page.evaluate(() => ({
    list: document.getElementById("listContainer")?.innerText ?? "",
    names: [...document.querySelectorAll(".topic-name, .topic-row")].map((e) => e.textContent.trim()).slice(0, 4),
  }));
  check("11a a seeded English-only subject name renders in Bangla", r.list.includes("নৈতিকতা"), r.list.slice(0, 80));
  check("11b its gloss does too", r.list.includes("সামাজিক আচরণ"), r.list.slice(0, 120));
  check("11c and no English is left in that list", !/[A-Za-z]{3,}/.test(r.list), r.list.slice(0, 120));
  await page.close();
  await ctx.close();
}

console.log("\n=== 12. PHASE 3: English module pages are unchanged ===");
{
  const ctx = await ctxFor({ banner: true });
  const { page } = await openPage(ctx, "/app/deen-study.html");
  const r = await page.evaluate(() => ({
    h1: document.querySelector("h1")?.textContent?.trim(),
    list: document.getElementById("listContainer")?.innerText ?? "",
  }));
  check("12 English heading intact", r.h1 === "Deen Study", r.h1);
  check("12 English subject names intact", r.list.includes("Ethics") && r.list.includes("Akhlaq"), r.list.slice(0, 80));
  await page.close();
  await ctx.close();
}


console.log("\n=== 13. PHASE 4: the four tracking pages in Bangla ===");
{
  const TRACKING_PAGES = ["/app/records.html", "/app/monitor.html", "/app/homework.html", "/app/course-offers.html"];
  const ctx = await ctxFor({ banner: true, appLang: "bn" });
  for (const p of TRACKING_PAGES) {
    const { page, errors } = await openPage(ctx, p);
    const r = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim(),
      intro: [...document.querySelectorAll("p")].map((x) => x.textContent.trim()).find((x) => x.length > 40),
      // The tenant picker printed roles.join(", ") -- "(owner, prime)" --
      // on every signed-in page right through phases 1-3.
      tenantOpt: document.getElementById("tenantSelect")?.options[0]?.textContent?.trim(),
    }));
    check(`${p} heading is Bangla`, BANGLA.test(r.h1 || ""), r.h1);
    check(`${p} browser-tab title is Bangla`, BANGLA.test(r.title || ""), r.title);
    check(`${p} intro paragraph is Bangla`, !r.intro || BANGLA.test(r.intro), (r.intro || "").slice(0, 60));
    check(`${p} carries no developer noise like "(Phase 8)"`, !/\(Phase \d|\(F-\d|round \d/.test(`${r.title} ${r.h1}`), `${r.title} | ${r.h1}`);
    check(`${p} role names in the tenant picker are Bangla`, !/owner|prime|teacher|guardian/i.test(r.tenantOpt || ""), r.tenantOpt);
    check(`${p} no page errors under bn`, errors.length === 0, errors.slice(0, 2).join(" | "));
    await page.close();
  }
  await ctx.close();
}

console.log("\n=== 14. PHASE 4: Records — pickers, tables and the typed reference ===");
{
  const ctx = await ctxFor({ banner: true, appLang: "bn" });
  const { page, errors } = await openPage(ctx, "/app/records.html");
  const r = await page.evaluate(() => ({
    unitOpts: [...document.getElementById("unitTypeSelect").options].map((o) => o.textContent.trim()),
    unitVals: [...document.getElementById("unitTypeSelect").options].map((o) => o.value).slice(0, 3),
    // This picker was built from STATUSES' own English `label`, so it stayed
    // English in Bangla even after phase 1 translated statuses everywhere.
    statusOpts: [...document.getElementById("statusSelect").options].map((o) => o.textContent.trim()),
    statusVals: [...document.getElementById("statusSelect").options].map((o) => o.value).slice(0, 2),
    hint: document.getElementById("unitRefHint")?.textContent?.trim(),
    headers: [...document.querySelectorAll("table th")].map((h) => h.textContent.trim()),
    rows: [...document.querySelectorAll("#entriesBody tr")].map((tr) => tr.innerText.replace(/\s+/g, " ").trim()),
    activity: [...document.querySelectorAll("#activityBody tr")].map((tr) => tr.innerText.replace(/\s+/g, " ").trim()),
    week: document.getElementById("weekLabel")?.textContent?.trim(),
  }));
  check("14a unit-type options are Bangla", r.unitOpts.length === 12 && r.unitOpts.every((x) => BANGLA.test(x)), JSON.stringify(r.unitOpts));
  check("14a ...with option VALUES still the bare identifiers", r.unitVals.join() === "ayah,range,surah", JSON.stringify(r.unitVals));
  check("14b status picker is Bangla (it read the raw English label before)", r.statusOpts.every((x) => BANGLA.test(x)), JSON.stringify(r.statusOpts));
  check("14b ...with status VALUES still the stored ids", r.statusVals.join() === "not_applicable,not_started", JSON.stringify(r.statusVals));
  check("14c the reference hint is Bangla with Bengali digits", BANGLA.test(r.hint || "") && /[০-৯]/.test(r.hint || ""), r.hint);
  check("14d every table header is Bangla", r.headers.length > 0 && r.headers.every((x) => BANGLA.test(x)), JSON.stringify(r.headers));
  check("14e a claimed row reads in Bangla, unit key included", r.rows.length === 3 && BANGLA.test(r.rows[0]) && r.rows[0].includes("আয়াত"), r.rows[0]);
  check("14e ...and its confirmation state is a Bangla word, not `pending`",
        !r.rows.some((x) => /pending|confirmed|returned/i.test(x)), JSON.stringify(r.rows).slice(0, 120));
  check("14f the week's activity rows read in Bangla, action included",
        r.activity.length === 2 && !r.activity.some((x) => /claimed|practised/i.test(x)), JSON.stringify(r.activity).slice(0, 140));
  check("14g the week label uses Bengali digits", /[০-৯]/.test(r.week || ""), r.week);

  // parseNum: a Bangla keyboard types Bengali digits into the reference box.
  await page.fill("#unitRef", "২:২৫৫");
  await page.dispatchEvent("#unitRef", "change");
  await page.waitForTimeout(400);
  const chunk = await page.evaluate(() => document.getElementById("chunkLabel").textContent.trim());
  check("14h typing Bengali digits in Reference is understood", chunk.includes("surah_2"), chunk);
  check("14 no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

console.log("\n=== 15. PHASE 4: Monitor, Homework and Course Offers ===");
{
  const ctx = await ctxFor({ banner: true, appLang: "bn" });

  const mon = await openPage(ctx, "/app/monitor.html");
  const m = await mon.page.evaluate(async () => {
    const { entriesToCsvRows } = await import("/app/js/monitor.js");
    return {
      range: document.getElementById("rangeLabel")?.textContent?.trim(),
      headers: [...document.querySelectorAll("#reportBody th")].map((h) => h.textContent.trim()),
      body: document.getElementById("reportBody")?.innerText ?? "",
      quran: document.getElementById("quranBody")?.innerText ?? "",
      csvHeader: entriesToCsvRows([], { roster: [], subjectTree: [], trackables: [] })[0],
    };
  });
  check("15a the range label is Bangla with Bengali digits", BANGLA.test(m.range || "") && /[০-৯]/.test(m.range || ""), m.range);
  check("15a every report table header is Bangla", m.headers.length > 0 && m.headers.every((x) => BANGLA.test(x)), JSON.stringify(m.headers));
  check("15a the report body uses Bengali digits", /[০-৯]/.test(m.body), m.body.slice(0, 60));
  check("15b the Quran breakdown's status columns are Bangla",
        BANGLA.test(m.quran) && !/Not started|Practising|Mastered/.test(m.quran), m.quran.slice(0, 80));
  check("15b the CSV HEADER row is translated", m.csvHeader.every((x) => BANGLA.test(x)), JSON.stringify(m.csvHeader));
  await mon.page.close();

  const hw = await openPage(ctx, "/app/homework.html");
  const h = await hw.page.evaluate(() => ({
    heading: document.getElementById("assignmentsHeading")?.textContent?.trim(),
    // "About" alone is the nav's About PAGE (পরিচিতি). Here it means "about
    // which student" -- the first real use of the context-suffix mechanism.
    aboutLabel: document.querySelector('label[for="noteAboutSelect"]')?.textContent?.trim(),
    noteCard: document.getElementById("notesBody")?.innerText ?? "",
    pill: document.querySelector("#assignmentsBody .pill")?.textContent?.trim(),
    cardText: document.getElementById("assignmentsBody")?.innerText ?? "",
    placeholders: [...document.querySelectorAll("#assignmentsBody [placeholder]")].map((e) => e.placeholder),
  }));
  check("15c 'Assignments for X' is one Bangla sentence, name first",
        BANGLA.test(h.heading || "") && h.heading.startsWith("আহসান"), h.heading);
  check("15d the note's About label is 'কার সম্পর্কে', not the About PAGE's own word",
        h.aboutLabel === "কার সম্পর্কে", h.aboutLabel);
  check("15d ...and the same in the saved note card", h.noteCard.includes("কার সম্পর্কে"), h.noteCard.slice(0, 60));
  check("15e the submission-state pill is Bangla, not `not submitted`", BANGLA.test(h.pill || ""), h.pill);
  check("15e the card's Due/Max score lines use Bengali digits", /[০-৯]/.test(h.cardText), h.cardText.slice(0, 80));
  check("15e scoring placeholders are Bangla", h.placeholders.length > 0 && h.placeholders.every((x) => BANGLA.test(x)), JSON.stringify(h.placeholders));
  await hw.page.close();

  const co = await openPage(ctx, "/app/course-offers.html");
  const c = await co.page.evaluate(() => ({
    heading: document.getElementById("enrolmentsHeading")?.textContent?.trim(),
    days: [...document.querySelectorAll("#dayChecks label")].map((l) => l.textContent.trim()),
    offer: document.getElementById("offersBody")?.innerText ?? "",
    enrolBtn: document.querySelector("#offersBody .enrolBtn")?.textContent?.trim(),
  }));
  check("15f \"X's enrolments\" is one Bangla sentence, name first",
        BANGLA.test(c.heading || "") && c.heading.startsWith("আহসান"), c.heading);
  check("15g weekday names are Bangla", c.days.length === 7 && c.days.every((x) => BANGLA.test(x)), JSON.stringify(c.days));
  check("15h the offer's status and the enrolled role are Bangla, not `active`/`student`",
        !/\bactive\b|\bstudent\b|\bteacher\b/i.test(c.offer), c.offer.slice(0, 120));
  check("15i the Enrol button reads as one Bangla sentence", BANGLA.test(c.enrolBtn || "") && c.enrolBtn.startsWith("আহসান"), c.enrolBtn);
  await co.page.close();
  await ctx.close();
}

console.log("\n=== 16. PHASE 4: shell strings phases 1-3 missed ===");
{
  const ctx = await ctxFor({ banner: true, appLang: "bn" });
  const { page } = await openPage(ctx, "/app/records.html");
  const r = await page.evaluate(async () => {
    const { reportWriteFailure } = await import("/app/js/errors.js");
    const { noAccountMessageHtml } = await import("/app/js/nav.js");
    // I15: this is the ONLY thing a person sees when a save fails, on every
    // screen. It had no Bangla and no area of the coverage report counted it.
    reportWriteFailure({ code: "permission-denied", message: "denied" }, { collection: "records" });
    const known = document.getElementById("qr-write-failure-banner")?.textContent ?? "";
    reportWriteFailure({ code: "some-unmapped-code", message: "x" }, {});
    const unknown = document.getElementById("qr-write-failure-banner")?.textContent ?? "";
    return { known, unknown, noAccount: noAccountMessageHtml() };
  });
  check("16a a write failure is explained in Bangla", BANGLA.test(r.known) && !/That save/.test(r.known), r.known.slice(0, 60));
  check("16b an UNMAPPED failure code is too, with the code left readable",
        BANGLA.test(r.unknown) && r.unknown.includes("some-unmapped-code"), r.unknown.slice(0, 70));
  check("16c the 'no account yet' dead end is Bangla on every page that shows it",
        BANGLA.test(r.noAccount) && !/no account found/.test(r.noAccount), r.noAccount.slice(0, 60));
  await page.close();
  await ctx.close();
}

console.log("\n=== 17. PHASE 4: the same four pages are still exactly English ===");
{
  const ctx = await ctxFor({ banner: true });
  const { page, errors } = await openPage(ctx, "/app/records.html");
  const r = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector("h1")?.textContent?.trim(),
    unitOpts: [...document.getElementById("unitTypeSelect").options].map((o) => o.textContent.trim()).slice(0, 3),
    row: document.querySelector("#entriesBody tr")?.innerText.replace(/\s+/g, " ").trim(),
    tenantOpt: document.getElementById("tenantSelect")?.options[0]?.textContent?.trim(),
  }));
  check("17 English title and heading intact", r.title === "QuranRevival — Records" && r.h1 === "Records", `${r.title} | ${r.h1}`);
  check("17 unit types read as English words", r.unitOpts.join() === "Ayah,Range,Surah", JSON.stringify(r.unitOpts));
  check("17 a row still reads in English", /Ayah 1:1/.test(r.row || "") && /Awaiting confirmation/.test(r.row || ""), r.row);
  check("17 roles read as English words", r.tenantOpt === "Madrasatul Muslimeen (Owner, Prime)", r.tenantOpt);
  check("17 no page errors in English", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}


console.log("\n=== 18. PHASE 5: the four admin pages in Bangla ===");
{
  const ADMIN_PAGES = ["/app/people.html", "/app/catalogue.html", "/app/curriculum.html", "/app/classes.html"];
  const ctx = await ctxFor({ banner: true, appLang: "bn" });
  for (const p of ADMIN_PAGES) {
    const { page, errors } = await openPage(ctx, p);
    const r = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim(),
      intro: [...document.querySelectorAll("p")].map((x) => x.textContent.trim()).find((x) => x.length > 40),
      // A header that is only a symbol ("#") is punctuation, not wording --
      // it reads the same in both languages, so requiring Bangla there is a
      // wrong assertion, not a finding. Same class as the language-picker
      // false alarm the README already warns about.
      headers: [...document.querySelectorAll("th")].map((h) => h.textContent.trim()).filter((x) => /[A-Za-z\u0980-\u09FF]/.test(x)),
      legends: [...document.querySelectorAll("legend")].map((l) => l.textContent.trim()),
      h2s: [...document.querySelectorAll("h2")].map((h) => h.textContent.trim()),
    }));
    check(`${p} heading is Bangla`, BANGLA.test(r.h1 || ""), r.h1);
    check(`${p} browser-tab title is Bangla`, BANGLA.test(r.title || ""), r.title);
    check(`${p} intro paragraph is Bangla`, !r.intro || BANGLA.test(r.intro), (r.intro || "").slice(0, 60));
    check(`${p} carries no developer noise like "(Phase 11)"`,
          !/\(Phase \d|\(F-\d|round \d|Stage [A-C]\d|\bI\d\/I\d/.test(`${r.title} ${r.h1} ${r.intro ?? ""}`), `${r.title} | ${r.h1}`);
    check(`${p} every table header is Bangla`, r.headers.every((x) => BANGLA.test(x)), JSON.stringify(r.headers));
    check(`${p} every fieldset legend is Bangla`, r.legends.every((x) => BANGLA.test(x)), JSON.stringify(r.legends));
    check(`${p} every section heading is Bangla`, r.h2s.every((x) => BANGLA.test(x)), JSON.stringify(r.h2s));
    check(`${p} no page errors under bn`, errors.length === 0, errors.slice(0, 2).join(" | "));
    await page.close();
  }
  await ctx.close();
}

console.log("\n=== 19. PHASE 5: People — roles, invites and the handover lock ===");
{
  const ctx = await ctxFor({ banner: true, appLang: "bn" });
  const { page, errors } = await openPage(ctx, "/app/people.html");
  const r = await page.evaluate(() => ({
    roster: [...document.querySelectorAll("#rosterBody tr")].map((tr) => tr.innerText.replace(/\s+/g, " ").trim()),
    invites: [...document.querySelectorAll("#inviteBody tr")].map((tr) => tr.innerText.replace(/\s+/g, " ").trim()),
    viewAs: [...document.getElementById("viewAsSelect").options].map((o) => o.textContent.trim()),
    viewAsVals: [...document.getElementById("viewAsSelect").options].map((o) => o.value),
    inviteRoles: [...document.getElementById("inviteRole").options].map((o) => o.textContent.trim()),
    inviteRoleVals: [...document.getElementById("inviteRole").options].map((o) => o.value),
  }));
  // The Roles column printed the raw array, comma-joined by toString().
  check("19a the roster's Roles column is Bangla, not a raw array",
        r.roster.length === 2 && !/owner|prime|student/i.test(r.roster.join(" ")), JSON.stringify(r.roster));
  check("19b an invite's role AND state are both Bangla",
        r.invites.length === 2 && !/teacher|pending|consumed|student/i.test(r.invites.join(" ")), JSON.stringify(r.invites));
  check("19b ...while the email address is left exactly as it is",
        r.invites.join(" ").includes("invited@example.com"), JSON.stringify(r.invites));
  check("19c View as options are Bangla", r.viewAs.every((x) => BANGLA.test(x)), JSON.stringify(r.viewAs));
  check("19c ...with option VALUES still the bare role ids",
        r.viewAsVals.join() === ",prime,teacher,guardian,student", JSON.stringify(r.viewAsVals));
  check("19c the invite Role picker too", r.inviteRoles.every((x) => BANGLA.test(x)) && r.inviteRoleVals.join() === "teacher,student,guardian,prime",
        JSON.stringify([r.inviteRoles, r.inviteRoleVals]));

  // The handover lock's refusal message lives in js/study-lock.js and is the
  // only explanation a person gets for a blocked switch.
  const lock = await page.evaluate(async () => {
    const { acquireStudyLock, canSwitchTo, releaseStudyLock } = await import("/app/js/study-lock.js");
    acquireStudyLock("p2");
    const refused = canSwitchTo("someone-else");
    releaseStudyLock();
    return refused.reason;
  });
  check("19d a refused handover explains itself in Bangla", BANGLA.test(lock || ""), lock);
  check("19 no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

console.log("\n=== 20. PHASE 5: Catalogue, Curriculum and Classes ===");
{
  const ctx = await ctxFor({ banner: true, appLang: "bn" });

  const cat = await openPage(ctx, "/app/catalogue.html");
  const c = await cat.page.evaluate(() => ({
    seed: document.getElementById("seedStatus")?.textContent?.trim(),
    modules: [...document.querySelectorAll("#modulesBody tr")].map((tr) => tr.innerText.replace(/\s+/g, " ").trim()),
    subjects: [...document.querySelectorAll("#subjectsBody tr")].map((tr) => tr.innerText.replace(/\s+/g, " ").trim()),
    tags: [...document.querySelectorAll("#subjectsBody .tag")].map((e) => e.textContent.trim()),
    approach: document.querySelector("#trackablesBody tr")?.innerText.replace(/\s+/g, " ").trim(),
    guide: (() => {
      const b = document.querySelector("#trackablesBody .guideBox");
      return b ? b.textContent.replace(/\s+/g, " ").trim() : "";
    })(),
    parentOpts: [...document.getElementById("newSubjParent").options].map((o) => o.textContent.trim()),
  }));
  check("20a the seed status line is Bangla with Bengali digits",
        BANGLA.test(c.seed || "") && /[০-৯]/.test(c.seed || ""), c.seed);
  // "planned" is a module status modules.js seeds and nothing else uses --
  // exactly the kind of value a status map quietly misses.
  check("20b Renderer and Status cells are Bangla, `planned` included",
        c.modules.length === 4 && !/\bayah\b|\btopic\b|\broutine\b|\bactive\b|\bplanned\b/i.test(c.modules.join(" ")),
        JSON.stringify(c.modules));
  check("20b the app's own name is deliberately NOT translated",
        c.modules.join(" ").includes("QuranRevival"), JSON.stringify(c.modules[0]));
  check("20c a subject row's status and confirmation rule are Bangla",
        c.subjects.length > 0 && !/\bactive\b|\bAuto\b|\barchived\b/i.test(c.subjects.join(" ")), JSON.stringify(c.subjects.slice(0, 1)));
  // The module tags printed the raw moduleId ("deen", "quranrevival").
  check("20d module tags show module NAMES, not their ids",
        c.tags.length > 0 && !c.tags.some((x) => /^(deen|arabic|hadith|general|health|naturelife|lifeskill|ldog)$/.test(x)),
        JSON.stringify(c.tags));
  check("20e the Approach list uses Bengali digits and Bangla section names",
        /[০-৯]/.test(c.approach || "") && BANGLA.test(c.approach || ""), c.approach);
  check("20e the Guide's What/How/Measure labels are Bangla",
        BANGLA.test(c.guide) && !/What:|How:|Measure:/.test(c.guide), c.guide.slice(0, 60));
  check("20f the parent picker's top-level option is Bangla",
        BANGLA.test(c.parentOpts[0] || ""), c.parentOpts[0]);
  await cat.page.close();

  const cur = await openPage(ctx, "/app/curriculum.html");
  const u = await cur.page.evaluate(() => ({
    terms: [...document.getElementById("planTermSelect").options].map((o) => o.textContent.trim()),
    termVals: [...document.getElementById("planTermSelect").options].map((o) => o.value),
    weeks: [...document.getElementById("planWeekSelect").options].map((o) => o.textContent.trim()),
    weekVals: [...document.getElementById("planWeekSelect").options].map((o) => o.value),
    plan: document.getElementById("planBody")?.innerText.replace(/\s+/g, " ").trim(),
    unit: document.querySelector("#unitsBody .pill")?.textContent?.trim(),
    grades: document.getElementById("gradesBody")?.innerText.replace(/\s+/g, " ").trim(),
    resources: document.getElementById("resourcesBody")?.innerText.replace(/\s+/g, " ").trim(),
  }));
  check("20g Term/Week options are Bangla with Bengali digits",
        u.terms.every((x) => BANGLA.test(x) && /[০-৯]/.test(x)) && u.weeks.every((x) => BANGLA.test(x)),
        JSON.stringify([u.terms[0], u.weeks[9]]));
  check("20g ...with option VALUES still plain numbers (Number() reads them back)",
        u.termVals.join() === "1,2,3,4" && u.weekVals[9] === "10", JSON.stringify([u.termVals, u.weekVals[9]]));
  check("20h a planned row reads in Bangla", BANGLA.test(u.plan || "") && !/\bWeek\b|\bTerm\b/.test(u.plan || ""), u.plan);
  check("20h a unit's status pill is Bangla", BANGLA.test(u.unit || ""), u.unit);
  check("20i the grade history's dates use Bengali digits and read in Bangla",
        BANGLA.test(u.grades || "") && /[০-৯]/.test(u.grades || "") && !/\bfrom\b|\bcurrent\b/i.test(u.grades || ""), u.grades);
  check("20j a resource's 'added by' line is Bangla, its URL untouched",
        BANGLA.test(u.resources || "") && u.resources.includes("https://example.org/lesson"), u.resources);
  await cur.page.close();

  const cls = await openPage(ctx, "/app/classes.html");
  const k = await cls.page.evaluate(() => ({
    card: document.querySelector("#classesBody .card")?.innerText.replace(/\s+/g, " ").trim(),
    pill: document.querySelector("#classesBody .pill")?.textContent?.trim(),
    roleOpts: [...(document.querySelector(".enrolRoleSelect")?.options ?? [])].map((o) => o.textContent.trim()),
    roleVals: [...(document.querySelector(".enrolRoleSelect")?.options ?? [])].map((o) => o.value),
  }));
  check("20k a class's status pill is Bangla", BANGLA.test(k.pill || ""), k.pill);
  // The gloss was read straight off .en, so a tenant that HAD authored
  // Bangla for it still saw English -- a real pre-existing bug (I11).
  check("20l a tenant-authored Bangla gloss really renders in Bangla",
        (k.card || "").includes("ফজরের আগের দল"), k.card);
  check("20m the enrol Role picker is Bangla with bare values",
        k.roleOpts.every((x) => BANGLA.test(x)) && k.roleVals.join() === "student,teacher",
        JSON.stringify([k.roleOpts, k.roleVals]));
  await cls.page.close();
  await ctx.close();
}

console.log("\n=== 21. PHASE 5: the admin pages are still exactly English ===");
{
  const ctx = await ctxFor({ banner: true });
  const { page, errors } = await openPage(ctx, "/app/catalogue.html");
  const r = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector("h1")?.textContent?.trim(),
    modules: [...document.querySelectorAll("#modulesBody tr")].map((tr) => tr.innerText.replace(/\s+/g, " ").trim()),
  }));
  check("21 English title and heading intact", r.title === "QuranRevival — Catalogue" && r.h1 === "Catalogue", `${r.title} | ${r.h1}`);
  check("21 renderer and status read as English words",
        /Ayah by ayah/.test(r.modules[0] || "") && /Active/.test(r.modules[0] || ""), r.modules[0]);
  check("21 no page errors in English", errors.length === 0, errors.slice(0, 2).join(" | "));

  const cls = await openPage(ctx, "/app/classes.html");
  const k = await cls.page.evaluate(() => document.querySelector("#classesBody .card")?.innerText.replace(/\s+/g, " ").trim());
  check("21 the English gloss still shows in English", (k || "").includes("Before Fajr group"), k);
  await cls.page.close();
  await page.close();
  await ctx.close();
}

console.log("\n=== 22. PHASE 6: Asma ul Husna reads entirely in Bangla ===");
{
  const ctx = await ctxFor({ appLang: "bn", banner: true });
  const { page, errors } = await openPage(ctx, "/app/asma-study.html");

  const grid = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".asma-card")];
    const cell = (c, s) => c?.querySelector(s)?.textContent?.trim();
    return {
      count: cards.length,
      first: {
        number: cell(cards[0], ".asma-card-number"),
        arabic: cell(cards[0], ".asma-card-arabic"),
        name: cell(cards[0], ".asma-card-translit"),
        meaning: cell(cards[0], ".asma-card-meaning"),
        chip: cell(cards[0], ".asma-status-chip"),
        // The value read back by openNameDetail() with Number(). num() must
        // never have touched it -- the phase 2 rule, restated.
        dataNumber: cards[0]?.dataset.number,
      },
      last: {
        number: cell(cards[98], ".asma-card-number"),
        name: cell(cards[98], ".asma-card-translit"),
        meaning: cell(cards[98], ".asma-card-meaning"),
      },
      // No Latin transliteration should survive anywhere in the grid. This
      // is the check that would have caught phase 6 shipping half-done.
      latinLeft: cards.map((c) => cell(c, ".asma-card-translit")).filter((x) => /[A-Za-z]/.test(x || "")),
      meaningsLeft: cards.map((c) => cell(c, ".asma-card-meaning")).filter((x) => /[A-Za-z]/.test(x || "")),
      digitsLeft: cards.map((c) => cell(c, ".asma-card-number")).filter((x) => /[0-9]/.test(x || "")),
    };
  });
  check("22a all 99 cards render", grid.count === 99, String(grid.count));
  check("22a the first card is Bangla end to end",
        BANGLA.test(grid.first.name) && BANGLA.test(grid.first.meaning) && BANGLA.test(grid.first.chip),
        JSON.stringify(grid.first));
  check("22a the Arabic is untouched", grid.first.arabic === "الرَّحْمَٰن", grid.first.arabic);
  check("22b Bengali digits are drawn, data-number stays plain",
        grid.first.number === "১" && grid.first.dataNumber === "1" && grid.last.number === "৯৯",
        `${grid.first.number}/${grid.first.dataNumber}/${grid.last.number}`);
  check("22c NOT ONE of the 99 Names is left in Latin script",
        grid.latinLeft.length === 0, grid.latinLeft.slice(0, 3).join(" | "));
  check("22c NOT ONE of the 99 meanings is left in English",
        grid.meaningsLeft.length === 0, grid.meaningsLeft.slice(0, 3).join(" | "));
  check("22c no card number is left in Latin digits", grid.digitsLeft.length === 0, grid.digitsLeft.slice(0, 3).join(" | "));
  check("22c the 99th Name and meaning are Bangla too",
        BANGLA.test(grid.last.name) && BANGLA.test(grid.last.meaning),
        `${grid.last.name} — ${grid.last.meaning}`);

  // The detail panel. Its status line used to print a raw claimedStatus
  // with underscores swapped for spaces, plus a raw confirmState id.
  await page.click(".asma-card[data-number='1']");
  await page.waitForTimeout(150);
  const detail = await page.evaluate(() => ({
    number: document.querySelector(".asma-detail-number")?.textContent?.trim(),
    heading: document.querySelector(".asma-detail h2")?.textContent?.trim(),
    meaning: document.querySelector(".asma-detail-meaning")?.textContent?.trim(),
    status: document.querySelector(".asma-detail p:not(.asma-detail-meaning)")?.textContent?.trim(),
    btn: document.getElementById("trackAsmaBtn")?.textContent?.trim(),
  }));
  check("22d '1 of 99' reads in Bangla with Bengali digits, not a number glued to a word",
        BANGLA.test(detail.number || "") && /১/.test(detail.number || "") && /৯৯/.test(detail.number || "") && !/\bof\b/.test(detail.number || ""),
        detail.number);
  check("22d the detail heading is the Bangla Name", BANGLA.test(detail.heading || "") && !/[A-Za-z]/.test(detail.heading || ""), detail.heading);
  check("22d the detail meaning is Bangla", BANGLA.test(detail.meaning || "") && !/[A-Za-z]/.test(detail.meaning || ""), detail.meaning);
  check("22e the status line is Bangla, with NO raw status or confirmState id",
        BANGLA.test(detail.status || "") && !/practising|pending|Status:/i.test(detail.status || ""), detail.status);
  check("22e the track button is Bangla", BANGLA.test(detail.btn || ""), detail.btn);

  // The way modal's title is the only other place the Name is drawn.
  await page.click("#trackAsmaBtn");
  await page.waitForTimeout(200);
  const modal = await page.evaluate(() => document.querySelector("#wayModalMount .way-modal-header h3")?.textContent?.trim());
  check("22f the way modal's title carries the Bangla Name",
        BANGLA.test(modal || "") && !/Ar-Rahman/.test(modal || ""), modal);

  // The screensaver. Its captions are the poster set's own filenames, on a
  // different transliteration convention from the 99 -- their own catalogue.
  // The overlay intercepts pointer events while open, so close it the way
  // the page itself does rather than clicking through it.
  await page.evaluate(() => document.getElementById("wayModalOverlay")?.classList.remove("open"));
  await page.waitForTimeout(80);
  await page.click("#screensaverBtn");
  await page.waitForTimeout(200);
  const saver = await page.evaluate(() => ({
    caption: document.querySelector(".asma-screensaver-caption")?.textContent?.trim(),
    alt: document.querySelector(".asma-screensaver-img")?.getAttribute("alt"),
    src: document.querySelector(".asma-screensaver-img")?.getAttribute("src"),
  }));
  check("22g the screensaver caption is Bangla", BANGLA.test(saver.caption || ""), saver.caption);
  check("22g its alt text is translated too (a Bangla screen reader)", BANGLA.test(saver.alt || ""), saver.alt);
  check("22g the poster URL is untouched", (saver.src || "").startsWith("https://archive.org/download/"), saver.src);
  check("22h no page errors in Bangla", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

console.log("\n=== 23. PHASE 6: the Asma page is still exactly English ===");
{
  const ctx = await ctxFor({ banner: true });
  const { page, errors } = await openPage(ctx, "/app/asma-study.html");
  const r = await page.evaluate(() => {
    const c = document.querySelector(".asma-card");
    const cell = (s) => c?.querySelector(s)?.textContent?.trim();
    return {
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim(),
      number: cell(".asma-card-number"),
      name: cell(".asma-card-translit"),
      meaning: cell(".asma-card-meaning"),
      count: document.querySelectorAll(".asma-card").length,
    };
  });
  check("23 English title, heading and all 99 cards intact",
        r.title === "QuranRevival — Asma ul Husna" && r.h1 === "Asma ul Husna" && r.count === 99,
        `${r.title} | ${r.h1} | ${r.count}`);
  check("23 the card still reads Ar-Rahman / The Most Merciful, in Latin digits",
        r.number === "1" && r.name === "Ar-Rahman" && r.meaning === "The Most Merciful",
        JSON.stringify(r));
  check("23 no page errors in English", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

console.log("\n=== 24. PHASE 6: the claim message every module shows ===");
{
  // Untranslated at FIVE call sites (the Quran module twice, topic-study,
  // routine-study, asma-study) right through phases 1-5, because none of
  // them ever wrapped the ternary in t(). The coverage report could not
  // see it: its plural/ternary matcher only fires INSIDE t(...).
  const src = await (await fetch("http://localhost:8080/app/js/topic-study.js")).text();
  const quran = await (await fetch("http://localhost:8080/app/quranrevival.html")).text();
  const routine = await (await fetch("http://localhost:8080/app/js/routine-study.js")).text();
  const asma = await (await fetch("http://localhost:8080/app/js/asma-study.js")).text();
  const bare = /(?<!t\()(?:^|[^(])outcome\.result\.needsConfirmation \? "Claimed/;
  const all = [src, quran, routine, asma];
  check("24 every claim-confirmation message goes through t()",
        all.every((f) => !bare.test(f)) && (quran.match(/t\(outcome\.result\.needsConfirmation/g) || []).length === 2,
        "one or more call sites still bare");
}

console.log("\n=== 25. v07.37: the language follows the ACCOUNT, not the browser ===");
{
  // A device that has never chosen a language, signing in to an account
  // whose language is Bangla. This is the case the owner actually hit:
  // "setting again is just annoying."
  const ctx = await ctxFor({ banner: true, accountLang: "bn" });
  const { page, errors } = await openPage(ctx, "/app/records.html");
  await page.waitForTimeout(400); // the adopt reload
  const r = await page.evaluate(() => ({
    stored: localStorage.getItem("mm_app_lang"),
    h1: document.querySelector("h1")?.textContent?.trim(),
    cats: [...document.querySelectorAll(".nav-cat > summary")].map((s) => s.textContent.trim()),
  }));
  check("25a a fresh device adopts the account's language", r.stored === "bn", String(r.stored));
  check("25a ...and the page really renders in it",
        BANGLA.test(r.h1 || "") && r.cats.every((c) => BANGLA.test(c)),
        `${r.h1} | ${r.cats.join(",")}`);
  check("25a no page errors while adopting", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}
{
  // The other direction: this device says Bangla, the account says English.
  // The ACCOUNT wins -- that is what makes "set it once, anywhere" true.
  const ctx = await ctxFor({ banner: true, appLang: "bn", accountLang: "en" });
  const { page } = await openPage(ctx, "/app/people.html");
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({
    stored: localStorage.getItem("mm_app_lang"),
    h1: document.querySelector("h1")?.textContent?.trim(),
  }));
  check("25b the account overrides a disagreeing device", r.stored === "en", String(r.stored));
  check("25b ...and the page is back in English", r.h1 === "People", r.h1);
  await page.close();
  await ctx.close();
}
{
  // Agreement must NOT reload -- otherwise every page load on every device
  // reloads once, forever. Proved by marking the window and checking the
  // mark survives.
  const ctx = await ctxFor({ banner: true, appLang: "bn", accountLang: "bn" });
  const { page } = await openPage(ctx, "/app/monitor.html");
  await page.evaluate(() => { window.__notReloaded = true; });
  await page.waitForTimeout(500);
  const survived = await page.evaluate(() => window.__notReloaded === true);
  check("25c a device that already agrees does NOT reload", survived === true, String(survived));
  await page.close();
  await ctx.close();
}
{
  // An account with no language set at all (everyone, before this round)
  // must leave the device's own choice alone.
  const ctx = await ctxFor({ banner: true, appLang: "bn" });
  const { page } = await openPage(ctx, "/app/records.html");
  await page.waitForTimeout(300);
  const stored = await page.evaluate(() => localStorage.getItem("mm_app_lang"));
  check("25d an account with no language set leaves the device alone", stored === "bn", String(stored));
  await page.close();
  await ctx.close();
}
{
  // Changing it must SAVE to the account, or the whole round does nothing.
  const ctx = await ctxFor({ banner: true });
  const { page } = await openPage(ctx, "/app/records.html");
  // PC layout fix (nav accordion): only one nav category can be open at a
  // time now, so opening every OTHER one right after Home (as this used to)
  // immediately closes Home again and #navAppLangSelect goes invisible.
  // openHome() alone is all #navAppLangSelect ever needed.
  await openHome(page);
  await page.waitForTimeout(120);
  await page.selectOption("#navAppLangSelect", "bn");
  await page.waitForTimeout(600);
  const writes = await page.evaluate(() => JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"));
  const langWrite = writes.find((w) => w.col === "userIndex" && w.appLang);
  check("25e choosing a language writes it to the account",
        Boolean(langWrite) && langWrite.appLang === "bn", JSON.stringify(writes.slice(0, 2)));
  // hasOnly(['tenantIds','defaultTenantId','appLang','updatedAt']) in
  // firestore.rules REJECTS the write if it carries anything else, so the
  // field list is as load-bearing as the value.
  check("25e ...writing only appLang + updatedAt, which is all the rules allow",
        langWrite && langWrite.data.join() === "appLang,updatedAt",
        langWrite ? langWrite.data.join() : "no write");
  await page.close();
  await ctx.close();
}
{
  // prefs.js is imported by PURE RENDERERS (asma-renderer.js reads
  // getAppLang, nav.js reads APP_LANGS). If the Firestore half ever lands
  // in it they gain a Firebase dependency and I2 breaks -- so this is
  // checked as SOURCE, not behaviour. Comments are stripped first: both
  // files legitimately discuss Firebase in their own headers, and matching
  // prose would fail on the explanation rather than on the code.
  const stripped = (s) => s.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const prefs = stripped(await (await fetch("http://localhost:8080/app/js/prefs.js")).text());
  check("25f prefs.js still imports nothing at all",
        !/^\s*import\s/m.test(prefs) && !/firebase|firestore/i.test(prefs),
        "prefs.js gained an import");
  const renderer = stripped(await (await fetch("http://localhost:8080/app/js/asma-renderer.js")).text());
  check("25f the pure renderer still has no Firebase dependency",
        !/firebase|firestore|lang-sync/i.test(renderer), "asma-renderer.js gained one");
}

console.log("\n=== 26. v07.39: the 460KB reciter timing map is not on the load path ===");
{
  // audio-player.js used to fetch the Bangla ayah-timing map (~460KB from
  // raw.githubusercontent.com) the moment the module loaded -- on every
  // visit to the app's landing page, whether or not anyone played audio.
  // It cannot simply be dropped: it has to be in memory BEFORE a Play tap
  // or the browser can reject playback. So it moved to the gestures that
  // always precede Play, and BOTH halves of that need proving.
  const ctx = await ctxFor({ banner: true });
  const page = await ctx.newPage();
  const timingRequests = [];
  await page.route("**/gtaf_bangla_timestamps.json", (route) => {
    timingRequests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.goto("http://localhost:8080/app/quranrevival.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  check("26a nothing fetches the timing map on load", timingRequests.length === 0,
        `${timingRequests.length} request(s) during load`);

  // Shell round 19 retired the Listening card, so the gestures that warm the
  // map are Study options, the Read tab, ticking a reciter and Play itself.
  // Opening Study options is the first of them.
  await page.click("#tabStudyOptionsBtn");
  await page.waitForTimeout(700);
  check("26b opening Study options warms it", timingRequests.length >= 1,
        `${timingRequests.length} request(s) after opening the panel`);
  await page.close();
  await ctx.close();
}

console.log("\n=== 27. Shell round 14: the Study options bars, and Search ===");
{
  const ctx = await ctxFor({ banner: true });
  const page = await ctx.newPage();
  const searchRequests = [];
  page.on("request", (r) => { if (/\/search-(en|bn|ar)\.json/.test(r.url())) searchRequests.push(r.url()); });
  await page.goto("http://localhost:8080/app/quranrevival.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  // The whole point of fetching the index on first use: a visit that never
  // searches must not pay for it. This is the load-speed half of the round,
  // and it is the half a test that only checked "search works" would miss --
  // exactly the trap section 26 was written for.
  check("27a no search index is fetched on load", searchRequests.length === 0,
        `${searchRequests.length} request(s) during load`);

  await page.click("#tabStudyOptionsBtn");
  await page.waitForTimeout(200);

  // The owner's four tablines. Ids are asserted, not positions: the round's
  // own rule was that moving a control is fine and rewiring it is not.
  const bars = await page.evaluate(() =>
    [...document.querySelectorAll(".study-options-body > .opt-bar")].map((bar) =>
      [...bar.querySelectorAll("select, input, button")].map((el) => el.id)
    )
  );
  check("27b bar 1 is User Role + Student", JSON.stringify(bars[0]) === '["tenantSelect","personSelect"]', JSON.stringify(bars[0]));
  check("27b bar 2 is Study Unit + unit number + Surah + Ayah",
        JSON.stringify(bars[1]) === '["unitTypeSelect","unitNumSelect","surahSelect","ayahSelect","rangeFromSelect","rangeToSelect"]', JSON.stringify(bars[1]));
  check("27b bar 3 is one Search field and one Search button", JSON.stringify(bars[2]) === '["jumpInput","searchBtn"]', JSON.stringify(bars[2]));
  check("27b bar 4 is Approach + Track", JSON.stringify(bars[3]) === '["trackableSelect","trackUnitBtn"]', JSON.stringify(bars[3]));
  // Shell round 19: there is no fifth bar. Reading view (round 18) and
  // Listening (round 19) are both always-visible sections now, so neither
  // spends a button on the bars.
  check("27b there is no button bar left", bars.length === 4, JSON.stringify(bars.map((b) => b.length)));

  const labels = await page.evaluate(() => ({
    tenant: document.querySelector('label[for="tenantSelect"]').textContent.trim(),
    person: document.querySelector('label[for="personSelect"]').textContent.trim(),
    jump: document.querySelector('label[for="jumpInput"]').textContent.trim(),
    track: document.getElementById("trackUnitBtn").textContent.trim(),
    summaryGone: !document.getElementById("optionsSummary"),
    noGoBtn: !document.getElementById("jumpGoBtn"),
  }));
  check("27c the tenant picker is labelled User Role", labels.tenant === "User Role", labels.tenant);
  check("27c the person picker is labelled Student", labels.person === "Student", labels.person);
  check("27c the field is titled Search, and the separate Go button is gone",
        labels.jump === "Search" && labels.noGoBtn, JSON.stringify(labels));
  check("27c the claim button is one word", labels.track === "Track", labels.track);
  check("27c the summary strip is gone", labels.summaryGone);

  // The owner's ask: Approach should get the room, not an even split with a
  // one-word button. Measured, not eyeballed.
  const claim = await page.evaluate(() => {
    const sel = document.getElementById("trackableSelect").getBoundingClientRect().width;
    const btn = document.getElementById("trackUnitBtn").getBoundingClientRect().width;
    return { sel: Math.round(sel), btn: Math.round(btn) };
  });
  check("27c Approach gets more of its line than the Track button does",
        claim.sel > claim.btn * 1.5, JSON.stringify(claim));

  // Search: a real English word, against the real packaged index.
  await page.fill("#jumpInput", "patience");
  await page.click("#searchBtn");
  await page.waitForTimeout(2500);
  const en = await page.evaluate(() => ({
    open: !document.getElementById("searchCard").hidden,
    status: document.getElementById("searchStatus").textContent.trim(),
    hits: document.querySelectorAll(".search-hit").length,
    firstRef: document.querySelector(".search-hit .ref")?.textContent.trim(),
    firstMark: document.querySelector(".search-hit mark")?.textContent.trim(),
  }));
  check("27d Search opens its card and finds real ayahs", en.open && en.hits > 0, JSON.stringify(en));
  check("27d ...says how many", /\d/.test(en.status), en.status);
  check("27d ...highlights the word that matched", (en.firstMark || "").toLowerCase() === "patience", en.firstMark);
  check("27d ...and names the surah, not just a number", /[A-Za-z]/.test(en.firstRef || ""), en.firstRef);
  check("27d exactly one index was fetched, the English one",
        searchRequests.length === 1 && searchRequests[0].includes("search-en.json"), JSON.stringify(searchRequests));

  // Clicking a result navigates -- and must NOT overwrite what was searched
  // for, or the remaining results become unreadable in context.
  await page.click(".search-hit");
  await page.waitForTimeout(900);
  const afterClick = await page.evaluate(() => ({
    surah: document.getElementById("surahSelect").value,
    ayah: document.getElementById("ayahSelect").value,
    box: document.getElementById("jumpInput").value,
  }));
  check("27e clicking a result really moves the screen", Number(afterClick.surah) >= 1 && Number(afterClick.ayah) >= 1, JSON.stringify(afterClick));
  check("27e ...and leaves the search box alone", afterClick.box === "patience", afterClick.box);

  // The owner's own suggestion: the Go box takes words as well as references.
  await page.fill("#jumpInput", "mercy");
  await page.click("#searchBtn");
  await page.waitForTimeout(1200);
  const viaGo = await page.evaluate(() => ({
    open: !document.getElementById("searchCard").hidden,
    hits: document.querySelectorAll(".search-hit").length,
    jumpMsgShown: !document.getElementById("jumpMsg").hidden,
  }));
  check("27f a word typed into the box searches instead of erroring", viaGo.open && viaGo.hits > 0 && !viaGo.jumpMsgShown, JSON.stringify(viaGo));

  // ...but a mistyped REFERENCE still explains itself, rather than silently
  // searching for "2:" and finding nothing.
  await page.fill("#jumpInput", "2:");
  await page.click("#searchBtn");
  await page.waitForTimeout(400);
  const badRef = await page.evaluate(() => ({
    shown: !document.getElementById("jumpMsg").hidden,
    text: document.getElementById("jumpMsg").textContent.trim(),
  }));
  check("27f a mistyped reference still explains itself", badRef.shown && /2:255/.test(badRef.text), JSON.stringify(badRef));

  // A real reference still jumps, exactly as before this round.
  await page.fill("#jumpInput", "2:255");
  await page.click("#searchBtn");
  await page.waitForTimeout(900);
  const ref = await page.evaluate(() => ({
    surah: document.getElementById("surahSelect").value,
    ayah: document.getElementById("ayahSelect").value,
  }));
  check("27g a reference still jumps", ref.surah === "2" && ref.ayah === "255", JSON.stringify(ref));

  // Arabic: typed WITHOUT the small marks, which is how anyone types it, and
  // matched against the fully-pointed uthmani text.
  await page.fill("#jumpInput", "الرحمن");
  await page.click("#searchBtn");
  await page.waitForTimeout(3000);
  const ar = await page.evaluate(() => ({
    hits: document.querySelectorAll(".search-hit").length,
    dir: document.querySelector(".search-hit .snip")?.getAttribute("dir"),
    mark: document.querySelector(".search-hit mark")?.textContent.trim(),
  }));
  check("27h unpointed Arabic matches the pointed text", ar.hits > 0, JSON.stringify(ar));
  check("27h ...is shown right to left", ar.dir === "rtl", ar.dir);
  // The highlight must come back with its vowel marks intact -- the stripped
  // form is what MATCHES, never what is shown.
  check("27h ...and highlights properly-pointed Arabic", /[ؐ-ٰ]/.test(ar.mark || ""), ar.mark);
  check("27h the Arabic index was fetched, and only now",
        searchRequests.some((u) => u.includes("search-ar.json")) && !searchRequests.some((u) => u.includes("search-bn.json")),
        JSON.stringify(searchRequests));

  // PHRASES, not just single words -- the owner asked directly whether the
  // box does them. A phrase is several words in a row, so this only passes
  // if the match really spans the whole thing.
  await page.fill("#jumpInput", "Lord of the worlds");
  await page.click("#searchBtn");
  await page.waitForTimeout(1500);
  const phrase = await page.evaluate(() => ({
    hits: document.querySelectorAll(".search-hit").length,
    mark: document.querySelector(".search-hit mark")?.textContent.trim(),
  }));
  check("27j an English phrase matches as a phrase",
        phrase.hits > 0 && /^lord of the worlds$/i.test(phrase.mark || ""), JSON.stringify(phrase));

  // The Arabic phrase that was silently finding NOTHING before this round:
  // the Uthmani text writes the long A of the last word as a superscript
  // alef, so a reader typing a full alef matched nothing at all.
  await page.fill("#jumpInput", "رب العالمين");
  await page.click("#searchBtn");
  await page.waitForTimeout(2500);
  const arPhrase = await page.evaluate(() => ({
    hits: document.querySelectorAll(".search-hit").length,
    ref: document.querySelector(".search-hit .ref")?.textContent.trim(),
    mark: document.querySelector(".search-hit mark")?.textContent.trim(),
  }));
  check("27j an Arabic phrase matches across a superscript alef", arPhrase.hits > 0, JSON.stringify(arPhrase));
  // The highlight must cover BOTH words, with their marks, and must start at
  // the start of the first word rather than one letter into it.
  check("27j ...highlighting the whole phrase, pointed, from its first letter",
        /\s/.test(arPhrase.mark || "") && /[ؐ-ٰ]/.test(arPhrase.mark || "") && /^[ا-يٱ]/.test(arPhrase.mark || ""),
        arPhrase.mark);

  // Range: "To" used to be pushed onto a line of its own, because a
  // three-column grid could not hold four cells. Both range fields must now
  // sit beside Study Unit and Surah, on ONE line, with nothing truncated.
  await page.selectOption("#unitTypeSelect", "range");
  await page.waitForTimeout(500);
  const range = await page.evaluate(() => {
    const bar = document.querySelectorAll(".study-options-body > .opt-bar")[1];
    const cells = [...bar.children].filter((c) => c.getBoundingClientRect().height > 0);
    const rows = [];
    for (const c of cells) {
      const r = c.getBoundingClientRect();
      const row = rows.find((x) => r.top < x.bottom - 1 && r.bottom > x.top + 1);
      if (row) { row.top = Math.min(row.top, r.top); row.bottom = Math.max(row.bottom, r.bottom); }
      else rows.push({ top: r.top, bottom: r.bottom });
    }
    return {
      ids: cells.map((c) => c.querySelector("select")?.id),
      lines: rows.length,
      cutLabels: [...bar.querySelectorAll("label")]
        .filter((l) => l.scrollWidth > l.clientWidth + 1)
        .map((l) => l.textContent.trim()),
      fromW: Math.round(document.getElementById("rangeFromSelect").getBoundingClientRect().width),
    };
  });
  check("27i with Range on, all four cells are Unit/Surah/From/To",
        JSON.stringify(range.ids) === '["unitTypeSelect","surahSelect","rangeFromSelect","rangeToSelect"]', JSON.stringify(range.ids));
  check("27i ...on ONE line, not two", range.lines === 1, `${range.lines} line(s)`);
  check("27i ...with no label silently truncated", range.cutLabels.length === 0, JSON.stringify(range.cutLabels));
  check("27i ...and the ayah fields kept narrow", range.fromW < 80, `${range.fromW}px`);
  await page.selectOption("#unitTypeSelect", "ayah");
  await page.waitForTimeout(400);

  await page.close();
  await ctx.close();
}

console.log("\n=== 28. Shell round 14: the new controls read in Bangla too ===");
{
  const ctx = await ctxFor({ banner: true, appLang: "bn" });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openStudyOptions(page);
  const l = await page.evaluate(() => ({
    tenant: document.querySelector('label[for="tenantSelect"]').textContent.trim(),
    person: document.querySelector('label[for="personSelect"]').textContent.trim(),
    search: document.getElementById("searchBtn").textContent.trim(),
    placeholder: document.getElementById("jumpInput").placeholder,
  }));
  check("28a User Role is Bangla", BANGLA.test(l.tenant), l.tenant);
  check("28a Student is Bangla", BANGLA.test(l.person), l.person);
  check("28a Search is Bangla", BANGLA.test(l.search), l.search);
  check("28a the box's own hint is Bangla, and teaches that a word works",
        BANGLA.test(l.placeholder) && !/[0-9]/.test(l.placeholder), l.placeholder);

  // A Bangla reader typing Bengali script must get the Bangla index, not the
  // English one -- the search language follows what was TYPED, not the app's
  // setting, and this is the case that proves the two are separate.
  await page.fill("#jumpInput", "ধৈর্য");
  await page.click("#searchBtn");
  await page.waitForTimeout(3000);
  const bn = await page.evaluate(() => ({
    hits: document.querySelectorAll(".search-hit").length,
    status: document.getElementById("searchStatus").textContent.trim(),
    mark: document.querySelector(".search-hit mark")?.textContent.trim(),
  }));
  check("28b Bengali script searches the Bangla text", bn.hits > 0, JSON.stringify(bn));
  check("28b ...and says so in Bangla, with Bengali digits",
        BANGLA.test(bn.status) && !/[0-9]/.test(bn.status), bn.status);
  check("28b ...highlighting the Bangla word", BANGLA.test(bn.mark || ""), bn.mark);

  // A Bangla PHRASE, for the same reason the English and Arabic ones are
  // checked: the owner asked whether phrases work, in every language.
  await page.fill("#jumpInput", "সাহায্য প্রার্থনা কর");
  await page.click("#searchBtn");
  await page.waitForTimeout(2000);
  const bnPhrase = await page.evaluate(() => ({
    hits: document.querySelectorAll(".search-hit").length,
    mark: document.querySelector(".search-hit mark")?.textContent.trim(),
  }));
  check("28b a Bangla phrase matches as a phrase",
        bnPhrase.hits > 0 && /\s/.test(bnPhrase.mark || "") && BANGLA.test(bnPhrase.mark || ""), JSON.stringify(bnPhrase));

  // Nothing found is a real answer, and it has to be readable.
  await page.fill("#jumpInput", "কখনোইনয়এমনশব্দ");
  await page.click("#searchBtn");
  await page.waitForTimeout(1200);
  const none = await page.evaluate(() => ({
    status: document.getElementById("searchStatus").textContent.trim(),
    hits: document.querySelectorAll(".search-hit").length,
  }));
  check("28c nothing found says so in Bangla", none.hits === 0 && BANGLA.test(none.status), JSON.stringify(none));
  await page.close();
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 29. Shell round 17: the reading screen.
//
// The owner's brief was that the Qur'an must stop being displayed inside the
// Study options drawer. reading.mjs measures how much room it gets; this
// section checks the BEHAVIOUR -- that the reading is a stage view of its own,
// that the wheel really gives way to it and comes back, that Full screen hides
// the app's three strips and a tap on the text restores them, that a
// multi-ayah unit opens at its first ayah, and that all of it reads in Bangla.
// ---------------------------------------------------------------------------
console.log("\n=== 29. Shell round 17: the reading screen ===");
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");

  const before = await page.evaluate(() => ({
    readHidden: document.getElementById("readView").hidden,
    wheelShown: !document.getElementById("wheelSection").hidden,
    studyInPanel: !!document.getElementById("panelStudyOptions").querySelector("#studyScreen"),
    studyOnStage: !!document.querySelector("#stage #studyScreen"),
    tabs: [...document.querySelectorAll(".qr-tab")].map((b) => b.textContent.trim()),
  }));
  check("29a the landing screen is still the wheel", before.wheelShown && before.readHidden);
  check("29a the Study screen has LEFT the Study options drawer", !before.studyInPanel);
  check("29a ...and lives on the stage", before.studyOnStage);
  check("29a the dock carries three tabs", before.tabs.length === 3 && before.tabs[1] === "Read", JSON.stringify(before.tabs));

  await page.click("#tabReadBtn");
  await page.waitForTimeout(400);
  const reading = await page.evaluate(() => ({
    readShown: !document.getElementById("readView").hidden,
    wheelHidden: getComputedStyle(document.getElementById("wheelSection")).display === "none",
    pressed: document.getElementById("tabReadBtn").getAttribute("aria-pressed"),
    ref: document.getElementById("readSurahSelect").value + ":" + document.getElementById("readAyahSelect").value,
    ayahs: document.querySelectorAll("#ayahPanels .ayah-arabic").length,
    navVisible: getComputedStyle(document.getElementById("singleAyahNavRow")).display !== "none",
    dockVisible: getComputedStyle(document.getElementById("dock")).display !== "none",
  }));
  check("29b tapping Read shows the reading", reading.readShown && reading.pressed === "true");
  // The wheel carries display:flex from .wheel-box, so `hidden` alone does not
  // hide it -- this is the check that caught it before it shipped.
  check("29b ...and the wheel really goes (computed display, not just [hidden])", reading.wheelHidden);
  check("29b the ayah text is on the stage", reading.ayahs > 0);
  // Round 21: the inner Previous/Next buttons hide for a Single Ayah (the read
  // bar's own pair is exactly them), but the row itself stays because
  // #ayahPosition is the only place the surah's total is written.
  check("29b the ayah position readout came with it", reading.navVisible);
  // Round 22: the pickers ARE the readout now, so "what is being read" is the
  // surah and ayah they are set to rather than a sentence in a bar.
  check("29b the reading names what is being read", /^\d+:\d+$/.test(reading.ref), reading.ref);
  check("29b the bottom bar is still there", reading.dockVisible);

  // Study options is ONE tap away while reading -- the owner's own reason for
  // choosing this shape over "reading replaces the wheel".
  await page.click("#tabStudyOptionsBtn");
  await page.waitForTimeout(300);
  const opts = await page.evaluate(() => ({
    panelOpen: !document.getElementById("panelStudyOptions").hidden,
    stillReading: !document.getElementById("readView").hidden,
  }));
  check("29c Study options opens over the reading in one tap", opts.panelOpen && opts.stillReading);
  await page.click("#tabStudyOptionsBtn");
  await page.waitForTimeout(250);

  // Full screen, and the tap that carries the cycle round. Round 22 made this
  // three states, and the app's own chrome goes at the FIRST one -- which is
  // exactly what this check has always been about.
  await page.click("#hideChromeBtn");
  await page.waitForTimeout(350);
  const full = await page.evaluate(() => ({
    nav: getComputedStyle(document.getElementById("topNav")).display,
    dock: getComputedStyle(document.getElementById("dock")).display,
    h1: getComputedStyle(document.querySelector("h1")).display,
    ayahs: document.querySelectorAll("#ayahPanels .ayah-arabic").length,
    hint: !document.getElementById("readHint").hidden,
  }));
  check("29d Full screen hides the top menu, the bottom menu and the title",
        full.nav === "none" && full.dock === "none" && full.h1 === "none", JSON.stringify(full));
  check("29d ...the Qur'an is still there", full.ayahs > 0);
  check("29d ...and it says how to get back", full.hint);

  // Round 22: the tap CYCLES, so from the middle state it goes to bare and
  // only then back to normal. Tap until the menus really are back.
  for (let i = 0; i < 3; i++) {
    const back = await page.evaluate(() => getComputedStyle(document.getElementById("dock")).display !== "none");
    if (back) break;
    await page.click("#ayahPanels", { position: { x: 5, y: 5 } });
    await page.waitForTimeout(300);
  }
  const restored = await page.evaluate(() => getComputedStyle(document.getElementById("dock")).display !== "none");
  check("29d tapping the text carries the cycle back to the menus", restored);

  // A tap on something you meant to press must NOT be swallowed as "show the
  // menus again" -- and must not hide them either, since nothing hides on a tap.
  await page.click("#hideChromeBtn");
  await page.waitForTimeout(300);
  const stillFull = await page.evaluate(() => {
    const b = document.querySelector("#readScroll button:not([disabled])");
    b?.click();
    return document.body.classList.contains("immersive-read");
  });
  check("29d pressing a button inside the reading does not exit Full screen", stillFull);

  // Back out of Full screen the only way there is -- taps on the text. Round 22
  // made that a THREE-state cycle, so one tap is not always enough, and the
  // dock is genuinely gone until it completes: without this loop every action
  // after it fails on an invisible #tabReadBtn.
  for (let i = 0; i < 3; i++) {
    const back = await page.evaluate(() => getComputedStyle(document.getElementById("dock")).display !== "none");
    if (back) break;
    await page.click("#ayahPanels", { position: { x: 5, y: 5 } });
    await page.waitForTimeout(300);
  }

  await page.click("#tabReadBtn"); // tapping the open tab returns to the wheel
  await page.waitForTimeout(350);
  const back = await page.evaluate(() => ({
    wheel: getComputedStyle(document.getElementById("wheelSection")).display !== "none",
    readHidden: document.getElementById("readView").hidden,
    immersive: document.body.classList.contains("immersive-read"),
    wheelSvg: !!document.querySelector("#wheelContainer svg"),
  }));
  check("29e tapping Read again returns to the wheel", back.wheel && back.readHidden);
  check("29e ...the wheel is really redrawn, not an empty box", back.wheelSvg);
  check("29e ...and Full screen is dropped on the way out", !back.immersive);

  // The owner's answer to "where does a multi-ayah unit open?": the first ayah.
  await page.click("#tabStudyOptionsBtn");
  await page.waitForTimeout(250);
  await page.selectOption("#surahSelect", "2");
  await page.waitForTimeout(1200);
  await page.selectOption("#ayahSelect", "10");
  await page.waitForTimeout(400);
  await page.selectOption("#unitTypeSelect", "ruku");
  await page.waitForTimeout(400);
  await page.click("#tabStudyOptionsBtn");
  await page.waitForTimeout(200);
  await page.click("#tabReadBtn");
  await page.waitForTimeout(600);
  const firstAyah = await page.evaluate(() => ({
    position: document.getElementById("ayahPosition").textContent.trim(),
    ref: document.getElementById("unitLabel").textContent.trim(), // round 22: the dock is the one sentence now
  }));
  // Ayah 10 of Surah 2 sits in Ruku' 2, which runs 8-20 -- so "the first ayah
  // of the unit" is 8, NOT 1. Read the unit's own start out of the reference
  // line rather than hardcoding a number: the assertion then survives any
  // future change to the ruku boundaries, and cannot pass by accident.
  const unitStart = Number(firstAyah.ref.match(/ayahs (\d+)/)?.[1]);
  const openedAt = Number(firstAyah.position.match(/Ayah (\d+) of/)?.[1]);
  check("29f a Ruku' opens at the ruku's FIRST ayah, not where you last were",
        unitStart > 1 && openedAt === unitStart, JSON.stringify(firstAyah));

  check("29g no page errors anywhere in the reading screen", errors.length === 0, errors.join(" | "));
  await page.close();
  await ctx.close();
}

console.log("\n=== 29h. The reading screen in Bangla ===");
{
  const ctx = await ctxFor({ banner: false, appLang: "bn" });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const tab = await page.evaluate(() => document.getElementById("tabReadBtn").textContent.trim());
  check("29h the Read tab is Bangla", BANGLA.test(tab), tab);
  await page.click("#tabReadBtn");
  await page.waitForTimeout(400);
  // Shell round 21 removed the "◂ Mastery Wheel" button from this bar on the
  // owner's own reasoning (the dock's Read tab already returns to the wheel),
  // so what used to be asserted here is now Prev/Next -- see 33h. Everything
  // else in this section is unchanged.
  const bn = await page.evaluate(() => ({
    noBack: !document.getElementById("backToWheelBtn"),
    full: document.getElementById("hideChromeBtn").getAttribute("aria-label") || "",
    ref: document.getElementById("unitLabel").textContent.trim()
       || document.getElementById("readAyahSelect").selectedOptions[0]?.textContent.trim() || "",
  }));
  check("29h the way back to the wheel is the Read tab, not a button", bn.noBack);
  // Round 22: an icon has no words, so its NAME is what has to be in Bangla.
  check("29h Full screen is Bangla", BANGLA.test(bn.full), bn.full);
  check("29h what is being read is Bangla, in Bengali digits",
        BANGLA.test(bn.ref) && !/[0-9]/.test(bn.ref), bn.ref);
  await page.click("#hideChromeBtn");
  await page.waitForTimeout(350);
  const hint = await page.evaluate(() => document.getElementById("readHint").textContent.trim());
  check("29h the how-to-get-back line is Bangla", BANGLA.test(hint), hint);
  await page.close();
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 30. Shell round 18: picking a unit BY NUMBER, the reading transport, the
// always-visible Reading view, and one reciter list instead of two.
// ---------------------------------------------------------------------------
console.log("\n=== 30. Shell round 18: unit numbers, transport, reading view ===");
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");

  // I9: the three boundary tables are on-first-use, never on the load path.
  const indexRequests = [];
  page.on("request", (r) => {
    if (/(juz|page|hizb)-index\.json/.test(r.url())) indexRequests.push(r.url().split("/").pop());
  });
  await page.waitForTimeout(400);
  check("30a no boundary table is fetched on load", indexRequests.length === 0, JSON.stringify(indexRequests));

  await openStudyOptions(page);
  const unitOptions = await page.evaluate(() => [...document.querySelectorAll("#unitTypeSelect option")].map((o) => o.value));
  check("30a Hizb is a Study Unit now", unitOptions.includes("hizb"), JSON.stringify(unitOptions));
  const hiddenAtFirst = await page.evaluate(() => getComputedStyle(document.getElementById("unitNumControl")).display === "none");
  check("30a the number cell stays out of the way for Single Ayah", hiddenAtFirst);

  // Juz: the picker appears, names itself, and offers all 30.
  await page.selectOption("#unitTypeSelect", "juz");
  await page.waitForTimeout(900);
  const juz = await page.evaluate(() => ({
    shown: getComputedStyle(document.getElementById("unitNumControl")).display !== "none",
    label: document.getElementById("unitNumLabel").textContent.trim(),
    count: document.querySelectorAll("#unitNumSelect option").length,
    values: [...document.querySelectorAll("#unitNumSelect option")].slice(0, 3).map((o) => o.value),
    span: document.getElementById("unitSpanReadout").textContent.trim(),
  }));
  check("30b choosing Juz reveals a Juz number picker", juz.shown && /Juz/.test(juz.label), JSON.stringify(juz));
  check("30b ...with all 30", juz.count === 30, String(juz.count));
  check("30b ...whose option VALUES are plain numbers", JSON.stringify(juz.values) === '["1","2","3"]', JSON.stringify(juz.values));
  check("30b ...and it says what the juz covers", /Surah/.test(juz.span), juz.span);
  check("30b the table was fetched only when the unit was chosen", indexRequests.includes("juz-index.json"), JSON.stringify(indexRequests));

  // Picking Juz 5 must LOAD a different surah and land on that juz's own
  // first ayah -- the whole point of picking by number.
  await page.selectOption("#unitNumSelect", "5");
  await page.waitForTimeout(1500);
  const juz5 = await page.evaluate(() => ({
    surah: document.getElementById("surahSelect").value,
    position: document.getElementById("ayahPosition").textContent.trim(),
    span: document.getElementById("unitSpanReadout").textContent.trim(),
    label: document.getElementById("unitLabel").textContent.trim(),
  }));
  check("30c picking Juz 5 really moves to its own surah and first ayah",
        juz5.surah === "4" && /Ayah 24 of/.test(juz5.position), JSON.stringify(juz5));
  check("30c ...and the dock says Juz 5", /Juz 5/.test(juz5.label), juz5.label);
  // Juz 5 runs 4:24 -> 4:147, one surah: the readout names it once.
  check("30c a single-surah juz reads as one surah and a range",
        /Surah 4/.test(juz5.span) && !/→/.test(juz5.span), juz5.span);

  // A juz that spans two surahs names only the TOP and the BOTTOM -- the
  // owner's own rule, and the reason the readout is not a list.
  await page.selectOption("#unitNumSelect", "2");
  await page.waitForTimeout(1500);
  const juz2 = await page.evaluate(() => document.getElementById("unitSpanReadout").textContent.trim());
  await page.selectOption("#unitNumSelect", "6");
  await page.waitForTimeout(1500);
  const juz6 = await page.evaluate(() => document.getElementById("unitSpanReadout").textContent.trim());
  check("30d a juz spanning two surahs shows top → bottom only",
        /→/.test(juz6) && (juz6.match(/Surah/g) || []).length === 2, juz6);
  check("30d ...while one inside a single surah does not", !/→/.test(juz2), juz2);

  // Hizb, built this round from the pulled hizbQuarter field.
  await page.selectOption("#unitTypeSelect", "hizb");
  await page.waitForTimeout(1200);
  const hizb = await page.evaluate(() => ({
    label: document.getElementById("unitNumLabel").textContent.trim(),
    count: document.querySelectorAll("#unitNumSelect option").length,
  }));
  check("30e Hizb offers all 60", /Hizb/.test(hizb.label) && hizb.count === 60, JSON.stringify(hizb));
  await page.selectOption("#unitNumSelect", "3");
  await page.waitForTimeout(1500);
  const hizb3 = await page.evaluate(() => ({
    label: document.getElementById("unitLabel").textContent.trim(),
    span: document.getElementById("unitSpanReadout").textContent.trim(),
    position: document.getElementById("ayahPosition").textContent.trim(),
  }));
  check("30e picking Hizb 3 claims Hizb 3, not the one the old ayah sat in",
        /Hizb 3/.test(hizb3.label), JSON.stringify(hizb3));
  check("30e ...and lands on its first ayah", /Ayah 142 of/.test(hizb3.position), hizb3.position);

  // Page: 604 of them, and the same landing rule.
  await page.selectOption("#unitTypeSelect", "page");
  await page.waitForTimeout(1200);
  const pageCount = await page.evaluate(() => document.querySelectorAll("#unitNumSelect option").length);
  check("30f Page offers all 604", pageCount === 604, String(pageCount));
  await page.selectOption("#unitNumSelect", "22");
  await page.waitForTimeout(1500);
  const page22 = await page.evaluate(() => ({
    surah: document.getElementById("surahSelect").value,
    span: document.getElementById("unitSpanReadout").textContent.trim(),
    label: document.getElementById("unitLabel").textContent.trim(),
  }));
  check("30f picking Page 22 lands in its own surah and says so",
        page22.surah === "2" && /Surah 2/.test(page22.span) && /Page 22/.test(page22.label), JSON.stringify(page22));

  // Ruku' numbering is per-surah and needs no table at all.
  await page.selectOption("#unitTypeSelect", "ruku");
  await page.waitForTimeout(900);
  const ruku = await page.evaluate(() => ({
    label: document.getElementById("unitNumLabel").textContent.trim(),
    count: document.querySelectorAll("#unitNumSelect option").length,
    first: document.querySelector("#unitNumSelect option")?.value,
  }));
  check("30g Ruku' numbers are this surah's own, starting at 1",
        /Ruku/.test(ruku.label) && ruku.first === "1" && ruku.count > 1, JSON.stringify(ruku));

  // Reading view: always visible, and the three ticks work together.
  await page.selectOption("#unitTypeSelect", "ayah");
  await page.waitForTimeout(600);
  const cardVisible = await page.evaluate(() => ({
    noButton: !document.getElementById("readingViewBtn"),
    visible: !document.getElementById("readingViewCard").hidden,
  }));
  check("30h Reading view is on screen, not behind a button", cardVisible.noButton && cardVisible.visible, JSON.stringify(cardVisible));

  await page.check("#tajweedToggle");
  await page.check("#wbwShowToggle");
  await page.check("#trBnToggle");
  await page.waitForTimeout(600);
  const all = await page.evaluate(() => ({
    tajweed: document.querySelectorAll("#ayahPanels .ayah-arabic [class^='tajweed-']").length,
    wbw: document.querySelectorAll("#ayahPanels .wbw-word").length,
    en: document.querySelectorAll("#ayahPanels .ayah-translation").length,
    bn: document.querySelectorAll("#ayahPanels .ayah-translation-bn").length,
  }));
  check("30h Tajweed, Word-by-Word and BOTH translations show at the same time",
        all.tajweed > 0 && all.wbw > 0 && all.en > 0 && all.bn > 0, JSON.stringify(all));

  await page.uncheck("#trEnToggle");
  await page.waitForTimeout(400);
  const bnOnly = await page.evaluate(() => ({
    en: document.querySelectorAll("#ayahPanels .ayah-translation:not(.ayah-translation-bn)").length,
    bn: document.querySelectorAll("#ayahPanels .ayah-translation-bn").length,
  }));
  check("30h Bangla alone is now expressible, which the old one-of-two picker could not say",
        bnOnly.bn > 0 && bnOnly.en === 0, JSON.stringify(bnOnly));
  await page.check("#trEnToggle");
  await page.waitForTimeout(300);

  // Listening settings: ONE reciter list, and no second set of play buttons.
  await page.waitForTimeout(300);
  const listening = await page.evaluate(() => {
    const card = document.getElementById("listeningCard");
    const names = [...card.querySelectorAll(".drill-reciter-check")].map((c) => c.parentElement.textContent.trim());
    return {
      oldSelectGone: !document.getElementById("reciterSelect"),
      oldPlayGone: !document.getElementById("playBtn") && !document.getElementById("playSurahBtn"),
      listCount: names.length,
      duplicated: names.length !== new Set(names).size,
      playButtons: [...card.querySelectorAll("button")].map((b) => b.id),
    };
  });
  check("30i the duplicate reciter picker is gone", listening.oldSelectGone);
  check("30i each reciter is named exactly once", listening.listCount > 0 && !listening.duplicated, JSON.stringify(listening));
  check("30i the duplicated play buttons are gone from the card",
        listening.oldPlayGone && JSON.stringify(listening.playButtons) === '["drillPlayBtn"]', JSON.stringify(listening.playButtons));

  // The transport itself, on the reading screen where the owner asked for it.
  await page.click("#tabReadBtn");
  await page.waitForTimeout(600);
  // Shell round 21 merged Pause INTO Play (one button reading the audio's real
  // state) and gave the freed slot to Full screen -- the owner's own plan. So
  // the row is four buttons still, and "Pause disabled while nothing plays"
  // became "the button reads Play while nothing plays".
  // Round 22 merged the two control rows into one and retired "Whole surah"
  // entirely, once Play started following the chosen unit -- so the row is
  // Prev / Next / Play / Stop / Full screen, and the buttons are icons whose
  // NAME lives in aria-label.
  const transport = await page.evaluate(() => ({
    visible: !document.getElementById("readBar").hidden,
    // Direct children only -- round 31 mounts the ⋮ quick-menu's own popover
    // (several unnamed <button>s of its own) inside #readQuickMenuSlot, a
    // sixth DIRECT child of #readBar; `#readBar button` would count those
    // too and this check is about the five original controls specifically.
    buttons: [...document.querySelectorAll("#readBar > button")].map((b) => b.id),
    noWholeSurah: !document.getElementById("readPlaySurahBtn"),
    playLabel: document.getElementById("readPlayBtn").getAttribute("aria-label") || "",
    // Round 25 retired the reciter caption -- its only job was naming which
    // reciter Play would use, which Study options -> Listening already says.
    noReciter: !document.getElementById("readReciterName"),
  }));
  check("30j prev, next, play, stop and full screen are on the reading screen",
        transport.visible && JSON.stringify(transport.buttons) === '["prevUnitBtn","nextUnitBtn","readPlayBtn","readStopBtn","hideChromeBtn"]', JSON.stringify(transport));
  check("30j the separate 'Whole surah' button is gone (Play follows the unit)", transport.noWholeSurah);
  check("30j the merged button is named Play while nothing is playing",
        /Play|চালান/.test(transport.playLabel) && !/Pause|থামান/.test(transport.playLabel), transport.playLabel);
  check("30j the reciter caption is gone (Listening settings names it)", transport.noReciter);

  check("30k no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

console.log("\n=== 30l. Round 18's own controls in Bangla ===");
{
  const ctx = await ctxFor({ banner: false, appLang: "bn" });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openStudyOptions(page);
  await page.selectOption("#unitTypeSelect", "hizb");
  await page.waitForTimeout(1200);
  const bn = await page.evaluate(() => ({
    unitLabel: document.getElementById("unitNumLabel").textContent.trim(),
    firstOption: document.querySelector("#unitNumSelect option")?.textContent.trim(),
    optionValue: document.querySelector("#unitNumSelect option")?.value,
    span: document.getElementById("unitSpanReadout").textContent.trim(),
    ticks: [...document.querySelectorAll(".reading-ticks label")].map((l) => l.textContent.trim()),
  }));
  check("30l the Hizb picker is Bangla", BANGLA.test(bn.unitLabel), bn.unitLabel);
  check("30l ...its numbers are Bengali digits while the VALUE stays plain",
        !/[0-9]/.test(bn.firstOption || "") && bn.optionValue === "1", JSON.stringify(bn));
  check("30l ...and what it covers reads in Bangla with Bengali digits",
        BANGLA.test(bn.span) && !/[0-9]/.test(bn.span), bn.span);
  // Round 27 made it six ("Roots & derivatives", split out of Word by Word);
  // round 28 made it seven ("Page by page", the sideways reading).
  check("30l every Reading view tick is Bangla", bn.ticks.length === 7 && bn.ticks.every((x) => BANGLA.test(x)), JSON.stringify(bn.ticks));
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  // Round 22: icons carry no words, so what must be in Bangla is their name.
  // Direct children only -- see the round-31 comment at 30j above.
  const t18 = await page.evaluate(() => [...document.querySelectorAll("#readBar > button")].map((b) => b.getAttribute("aria-label") || ""));
  check("30l every reading-screen control is NAMED in Bangla",
        t18.length === 5 && t18.every((x) => BANGLA.test(x)), JSON.stringify(t18));
  await page.close();
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 31. Shell round 19: an Approach never blocks the regular study process.
//
// The owner's standing rule, stated as a correction: "No approach blocks the
// regular study process, therefore all study options (including listening)
// always remain active whatever approach is chosen." Measured before the
// round: 12 of the 32 Approaches declared no text panel, 25 no audio.
// ---------------------------------------------------------------------------
console.log("\n=== 31. Shell round 19: no Approach blocks anything ===");
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openStudyOptions(page);

  const sections = await page.evaluate(() => ({
    readingVisible: !document.getElementById("readingViewCard").hidden,
    listeningVisible: !document.getElementById("listeningCard").hidden,
    noListeningButton: !document.getElementById("listeningBtn"),
    noRecitationHeading: !/Recitation/.test(document.getElementById("listeningCard").textContent),
    noStopHere: !document.getElementById("drillStopBtn"),
    playLabel: document.getElementById("drillPlayBtn")?.textContent.trim(),
    noTranslator: !document.getElementById("translationChoiceSelect"),
    noPageDisplay: !document.getElementById("pageViewModeSelect"),
  }));
  check("31a Listening is a section, not a button", sections.listeningVisible && sections.noListeningButton, JSON.stringify(sections));
  check("31a ...with no second 'Recitation' heading", sections.noRecitationHeading);
  check("31a ...and no Stop (it lives on the reading screen)", sections.noStopHere);
  check("31a Play is just Play", /Play/.test(sections.playLabel || "") && !/Drill/.test(sections.playLabel || ""), sections.playLabel);
  check("31a the disabled Translator placeholder is gone", sections.noTranslator);
  check("31a the old Page display picker is gone", sections.noPageDisplay);

  // THE RULE. The stub's second Approach declares panels: ["text"] only -- no
  // audio, no loop, no word-by-word -- which before this round disabled the
  // whole listening card and hid Loop entirely.
  const approaches = await page.evaluate(() => [...document.getElementById("trackableSelect").options].map((o) => o.value));
  if (approaches.length > 1) {
    await page.selectOption("#trackableSelect", approaches[1]);
    await page.waitForTimeout(700);
    const live = await page.evaluate(() => ({
      reciters: document.querySelectorAll(".drill-reciter-check").length,
      recitersDisabled: [...document.querySelectorAll(".drill-reciter-check")].some((c) => c.disabled),
      loop: !!document.getElementById("loopToggle"),
      play: !!document.getElementById("drillPlayBtn") && !document.getElementById("drillPlayBtn").disabled,
      ticks: [...document.querySelectorAll(".reading-ticks input")].filter((i) => !i.disabled).length,
      arabic: document.querySelectorAll("#ayahPanels .ayah-arabic").length,
    }));
    check("31b an Approach with no audio panel still offers every reciter",
          live.reciters > 0 && !live.recitersDisabled, JSON.stringify(live));
    check("31b ...still offers Loop and Play", live.loop && live.play, JSON.stringify(live));
    check("31b ...and every reading choice stays live", live.ticks === 7, String(live.ticks)); // seven since round 28
    check("31b the Qur'an text is on screen whatever the Approach declares", live.arabic > 0, String(live.arabic));
  }

  // Mushaf: a tick like the others, available on a SINGLE ayah, and the one
  // choice that cannot share the screen -- so it greys the rest rather than
  // hiding them.
  await page.check("#mushafToggle");
  await page.waitForTimeout(1500);
  const mushaf = await page.evaluate(() => ({
    // Round 28: "Page by page" is excluded alongside Mushaf itself, and for a
    // reason rather than for convenience -- Mushaf greys the choices it
    // REPLACES (Tajweed, the words, the derivatives, the translations), while
    // how you MOVE between pages still applies to a Mushaf page, and visibly
    // so: its pages sit side by side too (41e).
    othersDisabled: [...document.querySelectorAll(".reading-ticks input")]
      .filter((i) => i.id !== "mushafToggle" && i.id !== "sidewaysToggle").every((i) => i.disabled),
    stillVisible: [...document.querySelectorAll(".reading-ticks label")].every((l) => l.offsetParent !== null),
    noteShown: !document.getElementById("mushafNote").hidden,
    pageShown: getComputedStyle(document.getElementById("pageViewContainer")).display !== "none",
    panelsHidden: getComputedStyle(document.getElementById("ayahPanels")).display === "none",
  }));
  check("31c Mushaf greys the other reading choices rather than hiding them",
        mushaf.othersDisabled && mushaf.stillVisible, JSON.stringify(mushaf));
  check("31c ...says why, in words", mushaf.noteShown);
  check("31c ...and it works on a SINGLE ayah unit", mushaf.pageShown && mushaf.panelsHidden, JSON.stringify(mushaf));

  await page.uncheck("#mushafToggle");
  await page.waitForTimeout(500);
  const back = await page.evaluate(() => ({
    enabled: [...document.querySelectorAll(".reading-ticks input")].every((i) => !i.disabled),
    arabic: document.querySelectorAll("#ayahPanels .ayah-arabic").length,
  }));
  check("31c turning Mushaf off gives the reading choices back", back.enabled && back.arabic > 0, JSON.stringify(back));

  // A Ruku' still reads ayah by ayah -- round 19 changed WHAT is available,
  // never which units use the flow renderer. This is the check that caught a
  // real regression during the build.
  await page.selectOption("#unitTypeSelect", "ruku");
  await page.waitForTimeout(900);
  const ruku = await page.evaluate(() => ({
    navVisible: getComputedStyle(document.getElementById("singleAyahNavRow")).display !== "none",
    position: document.getElementById("ayahPosition").textContent.trim(),
  }));
  check("31d a Ruku' still reads ayah by ayah, with Previous/Next",
        ruku.navVisible && /Ayah \d+ of/.test(ruku.position), JSON.stringify(ruku));

  check("31e no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

// The 460KB timing map: round 19 removed the card that used to warm it, so
// the gestures that warm it now are the ones that can precede Play.
console.log("\n=== 31f. The timing map still cannot reach the load path ===");
{
  const ctx = await ctxFor({ banner: false });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const hits = [];
  page.on("request", (r) => { if (/gtaf_bangla_timestamps\.json/.test(r.url())) hits.push(r.url()); });
  await page.waitForTimeout(600);
  check("31f nothing fetches it on load", hits.length === 0, String(hits.length));
  // Opening the READING screen warms it -- the owner's own case: arriving
  // from a bookmark and pressing Play without ever opening Study options.
  await page.click("#tabReadBtn");
  await page.waitForTimeout(900);
  check("31f opening the reading screen warms it", hits.length >= 1, String(hits.length));
  await page.close();
  await ctx.close();
}

// ===========================================================================
// 32. Shell round 20 -- the moving tagline strip, and its editing screen.
//
// The strip replaces the static tagline, so two things have to be true at
// once and BOTH are asserted below: the page still reads exactly as it did
// before any script runs (nothing flashes, nothing is lost), and the line
// really does change -- once -- when it is someone else's turn.
// ===========================================================================
const TL_SETTINGS = { motion: "fade", changeAfterSeconds: 2, pauseOnHold: true };
const TL_LINES = [
  { id: "a", text: { en: "First words", bn: "প্রথম কথা" }, link: null, order: 10, status: "active", holdDays: 7, ayahRef: null },
  { id: "b", text: { en: "Read the article", bn: "প্রবন্ধটি পড়ুন" }, link: { url: "https://example.org/x", target: "external" }, order: 20, status: "active", holdDays: 0, ayahRef: null },
  { id: "c", text: { en: "The ninety-nine Names", bn: "নিরানব্বই নাম" }, link: { url: "asma-study.html", target: "internal" }, order: 30, status: "active", holdDays: 0, ayahRef: null },
  { id: "d", text: { en: "About this ayah", bn: "এই আয়াত সম্পর্কে" }, link: { url: "https://example.org/ayah", target: "external" }, order: 40, status: "active", holdDays: 0, ayahRef: "1:3" },
  { id: "e", text: { en: "Retired line", bn: "অবসরে যাওয়া লাইন" }, link: null, order: 50, status: "archived", holdDays: 0, ayahRef: null },
];
const tlCtx = (o = {}) => ctxFor({ banner: false, taglines: { lines: TL_LINES, settings: TL_SETTINGS }, ...o });
const seedTaglineState = (ctx, state) =>
  ctx.addInitScript((s) => { try { localStorage.setItem("mm_tagline_state", JSON.stringify(s)); } catch {} }, state);
const stripText = (page) => page.evaluate(() => document.querySelector("#taglineStrip .tagline-line")?.textContent.trim() ?? "");

console.log("\n=== 32. The tagline strip ===");
{
  const ctx = await tlCtx();
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  const early = await page.evaluate(() => ({
    strip: Boolean(document.getElementById("taglineStrip")),
    lines: document.querySelectorAll("#taglineStrip .tagline-line").length,
    text: document.querySelector("#taglineStrip .tagline-line")?.textContent.trim(),
    // The strip must not be taller than the paragraph it replaced, or this
    // round has spent landing height rounds 9-14 fought for.
    height: Math.round(document.getElementById("taglineStrip").getBoundingClientRect().height),
  }));
  check("32a the strip is there, holding exactly one line", early.strip && early.lines === 1, JSON.stringify(early));
  check("32a it still reads the page's own tagline before the tenant's lines arrive",
        early.text === "Reviving the Quran, abandoned.", String(early.text));
  check("32a and it is no taller than the paragraph it replaced (19px)", early.height <= 19, String(early.height));
  await page.close();
  await ctx.close();
}
{
  // THE STRIP MUST NEVER CLIP ITS OWN WORDS. body is a flex column (shell
  // round 7), so the strip's first version -- a flex item with height: 19px --
  // was SHRUNK to 16px on a phone and overflow:hidden cut the bottom off the
  // tagline; it shrank further the moment the nav bar gained its real height,
  // which read to the owner as "the menu jumps up and covers the tagline".
  // Measured at three sizes in both languages, because the phone was the only
  // one that showed it.
  for (const [name, viewport] of [["390x844", { width: 390, height: 844 }], ["768x1024", { width: 768, height: 1024 }], ["1280x800", { width: 1280, height: 800 }]]) {
    for (const lang of ["en", "bn"]) {
      const ctx = await ctxFor({ banner: false, viewport, appLang: lang, taglines: { lines: TL_LINES, settings: TL_SETTINGS } });
      const { page } = await openPage(ctx, "/app/quranrevival.html");
      const fit = await page.evaluate(() => {
        const s = document.getElementById("taglineStrip");
        const l = s.querySelector(".tagline-line");
        const sr = s.getBoundingClientRect(), lr = l.getBoundingClientRect();
        return { clipped: Math.round(lr.bottom - sr.bottom), stripH: Math.round(sr.height), lineH: Math.round(lr.height) };
      });
      check(`32a${name}/${lang} the words are not clipped by the strip`,
            fit.clipped <= 0 && fit.stripH >= fit.lineH, JSON.stringify(fit));
      // And it stays ONE line tall while a change is in flight -- the incoming
      // line is in normal flow now, so two in-flow lines would double it.
      await page.waitForTimeout(2600);
      const during = await page.evaluate(() => {
        const s = document.getElementById("taglineStrip");
        return { lines: s.querySelectorAll(".tagline-line").length, h: Math.round(s.getBoundingClientRect().height) };
      });
      check(`32a${name}/${lang} ...and stays one line tall through a change`, during.h <= 20, JSON.stringify(during));
      await page.close();
      await ctx.close();
    }
  }
}
{
  const ctx = await tlCtx();
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  // No stored state: the first line's turn. It arrives ONCE, after the
  // owner's own "change after" delay -- not instantly, which would read as
  // a flash rather than a movement.
  const atOneSecond = await stripText(page);
  check("32b nothing has moved a second in", atOneSecond === "Reviving the Quran, abandoned.", atOneSecond);
  await page.waitForTimeout(2600);
  const afterDelay = await stripText(page);
  check("32b the first line arrives after the delay", afterDelay === "First words", afterDelay);
  check("32b no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}
{
  // A line whose turn it is, held for seven days: the strip must NOT advance
  // to the next one. This is the whole of the owner's "a few might stay for
  // days" -- and the check that proves the strip is not a carousel.
  const ctx = await tlCtx();
  await seedTaglineState(ctx, { id: "a", since: Date.now() });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(3000);
  const held = await stripText(page);
  check("32c a held line does not give way to the next one", held === "First words", held);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("mm_tagline_state") || "null"));
  check("32c ...and its hold is not silently restarted", state?.id === "a", JSON.stringify(state));
  await page.close();
  await ctx.close();
}
{
  // The hold has expired: the next line takes over, and it is the external
  // one -- a real <a> that opens in a new tab and cannot reach back into
  // this one.
  const ctx = await tlCtx();
  await seedTaglineState(ctx, { id: "a", since: 0 });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(2800);
  const ext = await page.evaluate(() => {
    const el = document.querySelector("#taglineStrip .tagline-line");
    return {
      tag: el?.tagName, text: el?.textContent.trim(), href: el?.getAttribute("href"),
      target: el?.getAttribute("target"), rel: el?.getAttribute("rel"),
      mark: Boolean(el?.querySelector(".tagline-ext")),
      label: el?.getAttribute("aria-label"),
    };
  });
  check("32d an expired hold hands over to the next line", ext.text?.startsWith("Read the article"), JSON.stringify(ext));
  check("32d an outside address is a real link, opening in a new tab",
        ext.tag === "A" && ext.href === "https://example.org/x" && ext.target === "_blank" && /noopener/.test(ext.rel || ""), JSON.stringify(ext));
  check("32d ...marked as such, in words as well as an arrow",
        ext.mark && /opens in a new tab/.test(ext.label || ""), String(ext.label));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("mm_tagline_state") || "null"));
  check("32d the new line's turn is remembered for the next visit", stored?.id === "b", JSON.stringify(stored));
  await page.close();
  await ctx.close();
}
{
  // A line pointing at a page inside the app stays in this tab.
  const ctx = await tlCtx();
  await seedTaglineState(ctx, { id: "b", since: 0 });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(2800);
  const int = await page.evaluate(() => {
    const el = document.querySelector("#taglineStrip .tagline-line");
    return { tag: el?.tagName, text: el?.textContent.trim(), href: el?.getAttribute("href"), target: el?.getAttribute("target") };
  });
  check("32e a page inside the app opens in the same tab",
        int.tag === "A" && int.href === "asma-study.html" && !int.target && int.text === "The ninety-nine Names", JSON.stringify(int));
  await page.close();
  await ctx.close();
}
{
  // The owner's own case: "I might attach this to particular Ayah, An
  // article about the Ayah." It has to appear WHILE that ayah is open, and
  // without waiting for a change delay that belongs to the rotation.
  const ctx = await tlCtx();
  await seedTaglineState(ctx, { id: "a", since: Date.now() });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(2600);
  await openStudyOptions(page);
  await page.selectOption("#ayahSelect", "3");
  await page.waitForTimeout(600); // deliberately less than changeAfterSeconds
  const onAyah = await stripText(page);
  check("32f an ayah's own line appears as soon as that ayah is open", onAyah.startsWith("About this ayah"), onAyah);
  await page.selectOption("#ayahSelect", "1");
  await page.waitForTimeout(2600);
  const offAyah = await stripText(page);
  check("32f leaving the ayah brings the ordinary line back", offAyah === "First words", offAyah);
  // And the ordinary line is the SAME one as before the detour -- an
  // ayah-attached line interrupts the rotation, it never advances it.
  const stateAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("mm_tagline_state") || "null"));
  check("32f ...the same one, not the next", stateAfter?.id === "a", JSON.stringify(stateAfter));
  await page.close();
  await ctx.close();
}
{
  // The rule itself, with no DOM in the way -- the reason js/taglines.js is
  // pure. Six assertions the rendered page can only show one at a time.
  const ctx = await tlCtx();
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const rule = await page.evaluate(async (lines) => {
    const m = await import("/app/js/taglines.js");
    const day = 86400000;
    const now = 1000 * day;
    return {
      firstRun: m.pickTagline({ lines, state: null, nowMs: now }).current.id,
      firstRunQuiet: m.pickTagline({ lines, state: null, nowMs: now }).changed,
      heldStays: m.pickTagline({ lines, state: { id: "a", since: now - day }, nowMs: now }).current.id,
      expiredMoves: m.pickTagline({ lines, state: { id: "a", since: now - 8 * day }, nowMs: now }).current.id,
      expiredIsAChange: m.pickTagline({ lines, state: { id: "a", since: now - 8 * day }, nowMs: now }).changed,
      ayahWins: m.pickTagline({ lines, state: { id: "a", since: now }, nowMs: now, ayahRef: "1:3" }).current.id,
      archivedNever: m.activeTaglines(lines).some((l) => l.id === "e"),
      oneLineNeverMoves: m.pickTagline({ lines: [lines[1]], state: { id: "b", since: 0 }, nowMs: now }).changed,
      // A line whose id is no longer in the list must not wedge the strip.
      unknownStateRecovers: m.pickTagline({ lines, state: { id: "gone", since: 0 }, nowMs: now }).current.id,
      // The lock: asked again during the same visit, an expired hold must
      // NOT walk on to a third line. This is the real bug this check exists
      // for -- paging through ayahs used to advance the strip each time.
      lockedHolds: m.pickTagline({ lines, state: { id: "b", since: 0 }, nowMs: now, lockedId: "b" }).current.id,
      lockedIsQuiet: m.pickTagline({ lines, state: { id: "b", since: 0 }, nowMs: now, lockedId: "b" }).changed,
      lockedAyahStillWins: m.pickTagline({ lines, state: { id: "b", since: 0 }, nowMs: now, lockedId: "b", ayahRef: "1:3" }).current.id,
    };
  }, TL_LINES);
  check("32g first visit shows the first line, quietly", rule.firstRun === "a" && rule.firstRunQuiet === false, JSON.stringify(rule));
  check("32g a hold that has not run out keeps its line", rule.heldStays === "a");
  check("32g a hold that has run out moves on, and that IS the one change", rule.expiredMoves === "b" && rule.expiredIsAChange === true);
  check("32g an ayah's own line beats whatever was holding", rule.ayahWins === "d");
  check("32g a retired line is never shown", rule.archivedNever === false);
  check("32g one line on its own never moves", rule.oneLineNeverMoves === false);
  check("32g a remembered line that is gone does not wedge the strip", rule.unknownStateRecovers === "a");
  check("32g asked twice in one visit, it stays on the line it chose",
        rule.lockedHolds === "b" && rule.lockedIsQuiet === false, JSON.stringify(rule));
  check("32g ...but an ayah's own line still interrupts it", rule.lockedAyahStillWins === "d");
  await page.close();
  await ctx.close();
}
{
  // Bangla. Both halves matter: a line the tenant wrote in Bangla, and the
  // SHIPPED lines, which carry English only and reach Bangla through
  // langText() -> t(value.en) -- the read-time path phase 3 built.
  const ctx = await tlCtx({ appLang: "bn" });
  await seedTaglineState(ctx, { id: "a", since: Date.now() });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(2600);
  const bn = await stripText(page);
  check("32h a tenant's Bangla line really shows in Bangla", bn === "প্রথম কথা" && BANGLA.test(bn), bn);
  await page.close();
  await ctx.close();

  const ctx2 = await ctxFor({ banner: false, appLang: "bn" }); // no tenant list: the shipped six
  const { page: p2 } = await openPage(ctx2, "/app/quranrevival.html");
  await p2.waitForTimeout(7000); // the shipped settings use the 6-second default
  const shipped = await stripText(p2);
  check("32h a shipped line, English in the code, shows in Bangla too",
        BANGLA.test(shipped) && !/[A-Za-z]{3}/.test(shipped.replace(/archive\.org/, "")), shipped);
  await p2.close();
  await ctx2.close();
}
console.log("\n=== 32i. Taglines: the editing screen ===");
{
  const ctx = await tlCtx();
  const { page, errors } = await openPage(ctx, "/app/taglines.html");
  const shown = await page.evaluate(() => ({
    rows: document.querySelectorAll("#lineRows tr").length,
    archived: document.querySelectorAll("#lineRows tr.archived").length,
    firstText: document.querySelector("#lineRows .tl-text")?.value,
    motion: document.getElementById("motionSelect")?.value,
    after: document.getElementById("changeAfterInput")?.value,
    saveDisabled: document.getElementById("saveBtn")?.disabled,
    defaultsNotice: getComputedStyle(document.getElementById("usingDefaults")).display,
  }));
  check("32i every line is listed, retired ones included", shown.rows === 5 && shown.archived === 1, JSON.stringify(shown));
  check("32i the tenant's own settings are what the screen shows",
        shown.motion === "fade" && shown.after === "2", JSON.stringify(shown));
  check("32i a tenant with its own list is not told it is using the shipped ones",
        shown.defaultsNotice === "none", shown.defaultsNotice);
  check("32i Save is inert until something is actually changed", shown.saveDisabled === true);

  await page.fill("#newText", "A brand new line");
  await page.click("#addBtn");
  await page.waitForTimeout(150);
  const added = await page.evaluate(() => ({
    rows: document.querySelectorAll("#lineRows tr").length,
    last: [...document.querySelectorAll("#lineRows .tl-text")].pop()?.value,
    saveDisabled: document.getElementById("saveBtn").disabled,
  }));
  check("32i adding a line adds a row and arms Save",
        added.rows === 6 && added.last === "A brand new line" && added.saveDisabled === false, JSON.stringify(added));

  // Retiring: I4 -- the row stays, greyed, and can be turned back on.
  await page.click("#lineRows tr:first-child td:last-child button");
  await page.waitForTimeout(120);
  const retired = await page.evaluate(() => ({
    rows: document.querySelectorAll("#lineRows tr").length,
    firstArchived: document.querySelector("#lineRows tr")?.classList.contains("archived"),
  }));
  check("32i retiring a line keeps it, greyed, rather than deleting it",
        retired.rows === 6 && retired.firstArchived === true, JSON.stringify(retired));

  // Order: the move buttons really renumber.
  const before = await page.evaluate(() => [...document.querySelectorAll("#lineRows .tl-text")].map((i) => i.value));
  await page.click("#lineRows tr:nth-child(2) td:first-child button:nth-child(1)"); // move up
  await page.waitForTimeout(120);
  const after = await page.evaluate(() => [...document.querySelectorAll("#lineRows .tl-text")].map((i) => i.value));
  check("32i moving a line up really reorders the list",
        after[0] === before[1] && after[1] === before[0], JSON.stringify([before.slice(0, 2), after.slice(0, 2)]));

  // A mistyped ayah says so rather than storing rubbish.
  await page.fill("#newAyah", "not an ayah");
  await page.fill("#newText", "x");
  await page.click("#addBtn");
  await page.waitForTimeout(120);
  const refused = await page.evaluate(() => document.getElementById("saveState").textContent.trim());
  check("32i a mistyped ayah reference explains itself", /2:255/.test(refused), refused);

  await page.fill("#newAyah", "");
  await page.click("#saveBtn");
  await page.waitForTimeout(500);
  const writes = await page.evaluate(() => JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"));
  const w = writes.find((x) => x.col === "tenants");
  check("32i Save writes the list to the tenant document",
        Boolean(w) && w.data.join() === "taglineSettings,taglines,updatedAt", JSON.stringify(writes));
  const saidSo = await page.evaluate(() => document.getElementById("saveState").textContent.trim());
  check("32i ...and says so afterwards", /Saved/.test(saidSo), saidSo);
  check("32i no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}
{
  // A tenant that has never opened this screen sees the shipped six, and is
  // told that is what they are.
  const ctx = await ctxFor({ banner: false });
  const { page } = await openPage(ctx, "/app/taglines.html");
  const d = await page.evaluate(() => ({
    rows: document.querySelectorAll("#lineRows tr").length,
    notice: getComputedStyle(document.getElementById("usingDefaults")).display,
  }));
  check("32j the shipped lines are all there and named as shipped",
        d.rows === 6 && d.notice !== "none", JSON.stringify(d));
  await page.close();
  await ctx.close();
}
{
  // Bangla, and no developer noise -- the standing rule since phase 5.
  const ctx = await tlCtx({ appLang: "bn" });
  const { page } = await openPage(ctx, "/app/taglines.html");
  const bn = await page.evaluate(() => ({
    h1: document.querySelector("h1").textContent.trim(),
    title: document.title,
    intro: document.querySelector("p.intro").textContent.trim(),
    heads: [...document.querySelectorAll("h2")].map((h) => h.textContent.trim()),
    ths: [...document.querySelectorAll("th")].map((h) => h.textContent.trim()),
    opens: [...document.querySelectorAll("#newTarget option")].map((o) => `${o.value}=${o.textContent.trim()}`),
    holds: [...document.querySelectorAll("#newHold option")].map((o) => `${o.value}=${o.textContent.trim()}`),
    motions: [...document.querySelectorAll("#motionSelect option")].map((o) => `${o.value}=${o.textContent.trim()}`),
  }));
  check("32k the editing screen is in Bangla", BANGLA.test(bn.h1) && BANGLA.test(bn.title) && BANGLA.test(bn.intro), JSON.stringify(bn).slice(0, 200));
  check("32k every heading and column is in Bangla",
        bn.heads.every((h) => BANGLA.test(h)) && bn.ths.every((h) => BANGLA.test(h)), JSON.stringify([bn.heads, bn.ths]));
  check("32k no developer noise anywhere in its headings",
        ![bn.h1, bn.title, bn.intro, ...bn.heads].some((x) => /\(Phase \d|\(F-\d|round \d/.test(x)), JSON.stringify(bn.heads));
  // Option VALUES stay the bare ids and numbers -- the same rule every
  // translated picker in this app follows, because the code reads them back.
  check("32k the pickers are Bangla with their values left alone",
        bn.opens.every((o) => BANGLA.test(o.split("=")[1])) && bn.opens.map((o) => o.split("=")[0]).join() === "internal,external"
        && bn.holds.map((o) => o.split("=")[0]).join() === "0,1,3,7,30"
        && bn.motions.map((o) => o.split("=")[0]).join() === "flip,fade,slide",
        JSON.stringify([bn.opens, bn.holds, bn.motions]));
  await page.close();
  await ctx.close();
}
{
  // The gate: it is tenant content, so only owner/prime get the link. Tested
  // on the renderer itself, since the stub's one account always holds owner.
  const ctx = await ctxFor({ banner: false });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const gate = await page.evaluate(async () => {
    const m = await import("/app/js/nav.js");
    return {
      owner: /taglines\.html/.test(m.renderHomeExtras(["owner"])),
      prime: /taglines\.html/.test(m.renderHomeExtras(["prime"])),
      teacher: /taglines\.html/.test(m.renderHomeExtras(["teacher"])),
      none: /taglines\.html/.test(m.renderHomeExtras([])),
    };
  });
  check("32l only the owner and prime are offered the Taglines screen",
        gate.owner && gate.prime && !gate.teacher && !gate.none, JSON.stringify(gate));
  await page.close();
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 33. Shell round 21: Prev/Next move the UNIT, and Full screen is a choice.
//
// Two owner asks. (1) "Tapping on the screen will take the entire mobile
// screen edge to edge, tapping again will move it back to normal" -- so the
// tap TOGGLES now, reversing round 17's one-way rule. (2) "Any choice which
// reflects in the reading screen should have a button to choose next of the
// same choice (example, if a range of 5 Ayat is chosen, then the 'next'
// button should bring the next 5 Ayat)."
//
// Plus their answer to what full screen hides, which was neither yes nor no:
// "enable all choices to show individually or together."
// ---------------------------------------------------------------------------
console.log("\n=== 33. Shell round 21: unit Prev/Next, and configurable full screen ===");

const openRead = async (page) => {
  const reading = await page.evaluate(() => !document.getElementById("readView").hidden);
  if (!reading) { await page.click("#tabReadBtn"); await page.waitForTimeout(350); }
};
const setUnit = async (page, unit) => {
  await openStudyOptions(page);
  await page.selectOption("#unitTypeSelect", unit);
  await page.waitForTimeout(450);
  await page.click("#tabStudyOptionsBtn"); // close it again
  await page.waitForTimeout(150);
};
const readRef = readingRef; // round 22: #readRef is retired, see readingRef above

{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openRead(page);

  // --- 33a the bar itself -------------------------------------------------
  // Round 22 rebuilt this row again: the pickers took the name line's place
  // (they say what is being read AND change it), and Play/Stop/Full screen
  // came up from the retired transport row. All five are icons now.
  const bar = await page.evaluate(() => ({
    ids: [...document.querySelectorAll("#readBar > *")].map((el) => el.id),
    noBack: !document.getElementById("backToWheelBtn"),
    noSeparatePause: !document.getElementById("readPauseBtn"),
    noRef: !document.getElementById("readRef"),
    playLabel: document.getElementById("readPlayBtn").getAttribute("aria-label") || "",
  }));
  // Round 25 dropped the reciter caption from the end of this row. Round 31
  // added a sixth child, #readQuickMenuSlot, mounting the ⋮ quick menu on
  // the bar instead of over the ayah text.
  check("33a the read bar is Prev · Next · Play · Stop · Full screen · ⋮ slot",
        bar.ids.join() === "prevUnitBtn,nextUnitBtn,readPlayBtn,readStopBtn,hideChromeBtn,readQuickMenuSlot",
        JSON.stringify(bar.ids));
  check("33a the '◂ Mastery Wheel' button is gone (the Read tab does it)", bar.noBack);
  check("33a the separate Pause button is gone", bar.noSeparatePause);
  check("33a the duplicated name line is gone (the pickers say it)", bar.noRef);
  check("33a Play is named 'Play' while nothing is playing", /Play/.test(bar.playLabel) && !/Pause/.test(bar.playLabel), bar.playLabel);

  // --- 33b Next moves the unit, per unit type -----------------------------
  await setUnit(page, "range");
  await openRead(page);
  const rangeBefore = await readRef(page);
  await page.click("#nextUnitBtn");
  await page.waitForTimeout(450);
  const rangeAfter = await readRef(page);
  // The stub opens on Surah 1 (7 ayahs); the default range is 5 wide, so
  // Next gives a short tail rather than a full window -- read the numbers out
  // of the line rather than hardcoding them.
  const nums = (s) => (s.match(/\d+/g) || []).map(Number);
  const before = nums(rangeBefore), after = nums(rangeAfter);
  check("33b Next on a Range moves past the window it was showing",
        after.length >= 2 && before.length >= 2 && after[0] > before[1],
        `${rangeBefore} -> ${rangeAfter}`);
  await page.click("#prevUnitBtn");
  await page.waitForTimeout(450);
  const rangeBack = await readRef(page);
  // This is the check that caught a real defect during the build. Surah 1 has
  // seven ayahs, so Next on a five-wide window gives a SHORT TAIL (6-7) -- and
  // the first version then stepped back by the truncated width of two, landing
  // on 4-5 and silently reducing the reader's own choice of five. The window
  // the reader asked for has to survive a truncation.
  check("33b Prev brings back the window the reader actually chose", rangeBack === rangeBefore,
        `${rangeBefore} -> ${rangeAfter} -> ${rangeBack}`);

  await setUnit(page, "surah");
  await openRead(page);
  const surahBefore = await readRef(page);
  await page.click("#nextUnitBtn");
  await page.waitForTimeout(900);
  const surahAfter = await page.evaluate(() => ({
    ref: document.getElementById("unitLabel").textContent.trim(),
    picker: document.getElementById("surahSelect").value,
  }));
  check("33b Next on Whole Surah opens the next surah, picker and all",
        surahAfter.picker === "2" && surahAfter.ref !== surahBefore,
        `${surahBefore} -> ${surahAfter.ref} (picker ${surahAfter.picker})`);

  // --- 33c Prev is disabled at the very beginning of the Qur'an -----------
  await setUnit(page, "ayah");
  await openRead(page);
  const atStart = await page.evaluate(async () => {
    document.getElementById("surahSelect").value = "1";
    document.getElementById("surahSelect").dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 900));
    return {
      prev: document.getElementById("prevUnitBtn").disabled,
      next: document.getElementById("nextUnitBtn").disabled,
    };
  });
  check("33c at 1:1 Prev is greyed out and Next is not", atStart.prev && !atStart.next, JSON.stringify(atStart));

  // --- 33d Next crosses the surah boundary (the owner's own answer) -------
  const crossed = await page.evaluate(async () => {
    // Straight to the last ayah of Surah 1, then one more Next.
    const ayah = document.getElementById("ayahSelect");
    ayah.value = ayah.options[ayah.options.length - 1].value;
    ayah.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 400));
    const beforeSurah = document.getElementById("surahSelect").value;
    document.getElementById("nextUnitBtn").click();
    await new Promise((r) => setTimeout(r, 1200));
    return { beforeSurah, afterSurah: document.getElementById("surahSelect").value,
             ref: document.getElementById("unitLabel").textContent.trim() };
  });
  check("33d Next at a surah's last ayah carries on into the next surah",
        crossed.beforeSurah === "1" && crossed.afterSurah === "2", JSON.stringify(crossed));

  // --- 33e the inner ayah row: kept where it does a different job ---------
  await setUnit(page, "ayah");
  await openRead(page);
  const innerAyah = await page.evaluate(() => ({
    prevHidden: document.getElementById("prevAyahBtn").hidden,
    nextHidden: document.getElementById("nextAyahBtn").hidden,
    positionShown: !!document.getElementById("ayahPosition").offsetParent,
  }));
  check("33e for Single Ayah the inner buttons hide (the bar already is them)",
        innerAyah.prevHidden && innerAyah.nextHidden, JSON.stringify(innerAyah));
  check("33e ...but 'Ayah n of total' stays, so nothing is lost", innerAyah.positionShown);

  await setUnit(page, "ruku");
  await openRead(page);
  const innerRuku = await page.evaluate(() => ({
    prevHidden: document.getElementById("prevAyahBtn").hidden,
    nextHidden: document.getElementById("nextAyahBtn").hidden,
  }));
  check("33e inside a Ruku' the inner ayah buttons stay (the owner's 'keep both')",
        !innerRuku.prevHidden && !innerRuku.nextHidden, JSON.stringify(innerRuku));

  check("33 no page errors", errors.length === 0, errors.join(" | "));
  await page.close();
  await ctx.close();
}

{
  // --- 33f full screen is a set of choices, not one behaviour -------------
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openStudyOptions(page);
  const ticks = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll("#fullScreenHides input[data-fs-hide]")];
    return { ids: boxes.map((b) => b.dataset.fsHide), allOn: boxes.every((b) => b.checked) };
  });
  check("33f all five strips are offered separately",
        ticks.ids.join() === "banner,topnav,readbar,transport,dock", JSON.stringify(ticks.ids));
  check("33f ...and all are on by default (the owner's 'entire mobile screen')", ticks.allOn);

  await page.click("#tabStudyOptionsBtn");
  await openRead(page);
  // Round 22: three states, so the bare one is two presses away.
  await page.click("#hideChromeBtn");
  await page.waitForTimeout(250);
  await page.click("#hideChromeBtn");
  await page.waitForTimeout(350);
  const everything = await page.evaluate(() => {
    const shown = (s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== "none"; };
    return {
      banner: shown("body > h1"), nav: shown("#topNav"), dock: shown("#dock"),
      readbar: shown("#readPickers") || shown("#prevUnitBtn"),
      transport: shown("#readPlayBtn"),
      quran: shown("#studyScreen"),
      label: document.getElementById("hideChromeBtn").getAttribute("aria-label") || "",
    };
  });
  check("33f with everything ticked, full screen leaves only the Qur'an",
        !everything.banner && !everything.nav && !everything.dock
        && !everything.readbar && !everything.transport && everything.quran,
        JSON.stringify(everything));
  check("33f ...and the button says how to get out", /Show/i.test(everything.label), everything.label);

  // The owner's own example of a partial choice: "show only bottom menu".
  const partial = await page.evaluate(async () => {
    // Bring the menus back so Study options is reachable, then retick.
    document.getElementById("studyScreen").click();
    await new Promise((r) => setTimeout(r, 250));
    document.getElementById("tabStudyOptionsBtn").click();
    await new Promise((r) => setTimeout(r, 250));
    for (const b of document.querySelectorAll("#fullScreenHides input[data-fs-hide]")) {
      const want = b.dataset.fsHide !== "dock" && b.dataset.fsHide !== "transport";
      if (b.checked !== want) { b.checked = want; b.dispatchEvent(new Event("change", { bubbles: true })); }
    }
    await new Promise((r) => setTimeout(r, 200));
    document.getElementById("tabStudyOptionsBtn").click();
    await new Promise((r) => setTimeout(r, 250));
    document.getElementById("hideChromeBtn").click();
    await new Promise((r) => setTimeout(r, 250));
    document.getElementById("hideChromeBtn").click(); // round 22: two presses reach the bare state
    await new Promise((r) => setTimeout(r, 350));
    const shown = (s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== "none"; };
    return { banner: shown("body > h1"), nav: shown("#topNav"), dock: shown("#dock"),
             readbar: shown("#readPickers") || shown("#prevUnitBtn"),
             transport: shown("#readPlayBtn") };
  });
  check("33f 'keep the bottom menu and the play buttons' really keeps just those",
        !partial.banner && !partial.nav && !partial.readbar && partial.dock && partial.transport,
        JSON.stringify(partial));

  check("33f no page errors", errors.length === 0, errors.join(" | "));
  await page.close();
  await ctx.close();
}

{
  // --- 33g the tap toggles BOTH ways (the ask that reverses round 17) -----
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openRead(page);
  const imm = () => page.evaluate(() => document.body.classList.contains("immersive-read"));
  check("33g the reading opens with the menus showing", !(await imm()));
  await page.click("#studyScreen", { position: { x: 8, y: 8 } });
  await page.waitForTimeout(350);
  check("33g a tap goes full screen", await imm());
  await page.click("#studyScreen", { position: { x: 8, y: 8 } });
  await page.waitForTimeout(350);
  check("33g a second tap hides more, rather than coming straight back", await imm());
  await page.click("#studyScreen", { position: { x: 8, y: 8 } });
  await page.waitForTimeout(350);
  check("33g a third tap completes the cycle and the menus are back", !(await imm()));

  // A tap on something you meant to press must not flip the screen. With the
  // menus hidden the transport is gone too, so this is tested with the ticks
  // set to keep it -- pressed via the button that is always in the reading.
  await page.click("#studyScreen", { position: { x: 8, y: 8 } });
  await page.waitForTimeout(300);
  const afterButton = await page.evaluate(async () => {
    const btn = document.querySelector("#studyScreen button, #studyScreen input");
    if (btn) { btn.click(); await new Promise((r) => setTimeout(r, 300)); }
    return { had: !!btn, immersive: document.body.classList.contains("immersive-read") };
  });
  check("33g pressing a control inside the reading does not exit full screen",
        !afterButton.had || afterButton.immersive, JSON.stringify(afterButton));

  // Edge to edge, taken literally: the study screen's own side padding goes.
  // Round 22's correction: the CARD goes edge to edge (no border, no corner),
  // but the TEXT keeps a gutter. Round 21 set this to 0 and put the Arabic's
  // diacritics on the glass -- the owner's phone screenshot showed it, and no
  // check caught it because nothing actually overflowed.
  const bleed = await page.evaluate(() => {
    const cs = getComputedStyle(document.getElementById("studyScreen"));
    return { padL: parseFloat(cs.paddingLeft), borderL: cs.borderLeftStyle, radius: cs.borderTopLeftRadius };
  });
  check("33g the card is full-bleed but the text still has a gutter",
        bleed.padL >= 4 && bleed.padL <= 12 && bleed.borderL === "none" && parseFloat(bleed.radius) === 0,
        JSON.stringify(bleed));

  check("33g no page errors", errors.length === 0, errors.join(" | "));
  await page.close();
  await ctx.close();
}

{
  // --- 33h all of it in Bangla ------------------------------------------
  const ctx = await ctxFor({ banner: false, appLang: "bn" });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openRead(page);
  // Round 22 made all five of these ICONS, so what has to be in Bangla is
  // their spoken name, not their face -- an arrow reads the same either way.
  const bn = await page.evaluate(() => {
    const name = (id) => document.getElementById(id).getAttribute("aria-label") || "";
    return { prev: name("prevUnitBtn"), next: name("nextUnitBtn"),
             full: name("hideChromeBtn"), play: name("readPlayBtn") };
  });
  const BN = /[ঀ-৿]/;
  check("33h Prev and Next are NAMED in Bangla", BN.test(bn.prev) && BN.test(bn.next), JSON.stringify(bn));
  check("33h Full screen and Play are NAMED in Bangla", BN.test(bn.full) && BN.test(bn.play), JSON.stringify(bn));

  await openStudyOptions(page);
  const bnTicks = await page.evaluate(() => ({
    heading: [...document.querySelectorAll("#readingViewCard h5")].map((h) => h.textContent.trim()).join("|"),
    labels: [...document.querySelectorAll("#fullScreenHides label")].map((l) => l.textContent.trim()),
    values: [...document.querySelectorAll("#fullScreenHides input")].map((i) => i.dataset.fsHide),
  }));
  check("33h the Full-screen ticks read in Bangla", BN.test(bnTicks.heading) && bnTicks.labels.every((l) => BN.test(l)),
        JSON.stringify(bnTicks.labels));
  check("33h ...while their stored values stay plain ids",
        bnTicks.values.join() === "banner,topnav,readbar,transport,dock", JSON.stringify(bnTicks.values));

  check("33h no page errors", errors.length === 0, errors.join(" | "));
  await page.close();
  await ctx.close();
}
// ---------------------------------------------------------------------------
// 34. Shell round 22: the pickers move onto the reading screen, full screen
// becomes a three-state cycle, and Play follows the chosen unit.
//
// The owner's reasoning for the pickers: "an user might not go to study
// option, straight will go to read ... so what about placing the Surah, Ayah,
// Range, Juzz, Page, Ruku, Hizb, From and To picker in the Reading Screen?"
// They chose to keep BOTH places for now, so these are mirrors with one
// source of truth for behaviour.
// ---------------------------------------------------------------------------
console.log("\n=== 34. Shell round 22: pickers on the reading screen ===");
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openRead(page);

  const pickers = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("#readPickers > *")].map((e) => e.id);
    const visible = ids.filter((id) => !document.getElementById(id).hidden);
    return { ids, visible, rows: document.querySelectorAll("#readPickers, #readBar").length };
  });
  check("34a every picker has a home on the reading screen",
        pickers.ids.join() === "readUnitTypeSelect,readSurahSelect,readAyahSelect,readUnitNumSelect,readRangeFromSelect,readRangeToSelect",
        JSON.stringify(pickers.ids));
  check("34a for a Single Ayah, three of them show", pickers.visible.length === 3, JSON.stringify(pickers.visible));

  // The mirror really drives the real control, and the real control's own
  // handler is what does the work -- that is the whole safety of keeping both.
  const surahMoved = await page.evaluate(async () => {
    const m = document.getElementById("readSurahSelect");
    m.value = "3";
    m.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 1400));
    return {
      canonical: document.getElementById("surahSelect").value,
      mirror: document.getElementById("readSurahSelect").value,
      arabic: document.querySelectorAll("#ayahPanels .ayah-arabic").length,
    };
  });
  check("34b changing the reading screen's Surah really loads that surah",
        surahMoved.canonical === "3" && surahMoved.arabic > 0, JSON.stringify(surahMoved));

  // ...and the other way: Study options still drives the mirror.
  const backwards = await page.evaluate(async () => {
    document.getElementById("tabStudyOptionsBtn").click();
    await new Promise((r) => setTimeout(r, 250));
    const c = document.getElementById("surahSelect");
    c.value = "5";
    c.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 1400));
    document.getElementById("tabStudyOptionsBtn").click();
    await new Promise((r) => setTimeout(r, 200));
    return { mirror: document.getElementById("readSurahSelect").value };
  });
  check("34b ...and changing it in Study options moves the reading screen's copy",
        backwards.mirror === "5", JSON.stringify(backwards));

  // Round 22 asked "From and To only, or all three?" and the owner said all
  // three. Round 27 they reversed it from real use: with From and To on
  // screen, a third number picker says nothing they do not already say, and it
  // cost the two that matter their width. Updated rather than deleted, because
  // the rule it asserts genuinely changed.
  const rangeCells = await page.evaluate(async () => {
    const m = document.getElementById("readUnitTypeSelect");
    m.value = "range";
    m.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 700));
    const ids = [...document.querySelectorAll("#readPickers > *")].filter((e) => !e.hidden).map((e) => e.id);
    const boxes = [...document.querySelectorAll("#readPickers > *")].filter((e) => !e.hidden)
      .map((e) => e.getBoundingClientRect());
    const oneLine = boxes.every((b) => Math.abs(b.top - boxes[0].top) < 3);
    return { ids, oneLine, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  check("34c with a Range on it is From and To, with no third Ayah picker (round 27)",
        rangeCells.ids.join() === "readUnitTypeSelect,readSurahSelect,readRangeFromSelect,readRangeToSelect",
        JSON.stringify(rangeCells.ids));
  check("34c ...all five on one line, with no sideways overflow",
        rangeCells.oneLine && !rangeCells.overflow, JSON.stringify(rangeCells));

  const numbered = await page.evaluate(async () => {
    const m = document.getElementById("readUnitTypeSelect");
    m.value = "juz";
    m.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 1200));
    const numSel = document.getElementById("readUnitNumSelect");
    return { shown: !numSel.hidden, options: numSel.options.length, name: numSel.getAttribute("aria-label") };
  });
  check("34c a numbered unit shows its own number cell, with all 30 juz",
        numbered.shown && numbered.options === 30, JSON.stringify(numbered));

  check("34 no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

{
  // --- 34d Play follows the chosen unit ----------------------------------
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  // Watch what is actually requested rather than trusting the button.
  const wanted = [];
  await ctx.route("**/archive.org/**", (r) => { wanted.push(r.request().url()); r.abort(); });
  await openRead(page);
  page.on("dialog", (d) => d.dismiss().catch(() => {}));

  const single = await page.evaluate(async () => {
    document.getElementById("readPlayBtn").click();
    await new Promise((r) => setTimeout(r, 900));
    return true;
  });
  const afterSingle = wanted.length;
  check("34d Play on a Single Ayah asks for that one ayah's file",
        afterSingle >= 1 && /001001\.mp3$/.test(wanted[0] || ""), JSON.stringify(wanted.slice(0, 2)));

  const noWholeSurah = await page.evaluate(() => !document.getElementById("readPlaySurahBtn"));
  check("34d the separate 'Whole surah' button is gone", noWholeSurah);

  // A Range must ask for the range's FIRST ayah, not the current one only --
  // playAyahRange walks the window.
  wanted.length = 0;
  const ranged = await page.evaluate(async () => {
    document.getElementById("readStopBtn").click();
    const m = document.getElementById("readUnitTypeSelect");
    m.value = "range";
    m.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 700));
    document.getElementById("readPlayBtn").click();
    await new Promise((r) => setTimeout(r, 900));
    return document.getElementById("readAyahSelect").value;
  });
  check("34d Play on a Range starts the range rather than refusing",
        wanted.length >= 1, JSON.stringify(wanted.slice(0, 2)));

  // And the label must not lie after a failed load -- round 22's own fix.
  await page.waitForTimeout(600);
  const label = await page.evaluate(() => document.getElementById("readPlayBtn").getAttribute("aria-label") || "");
  check("34d after playback fails the button does not still say Pause",
        /Play/.test(label), label);

  check("34d no page errors", errors.filter((e) => !/archive\.org|ERR_/.test(e)).length === 0,
        errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

{
  // --- 34e the three-state cycle, and its middle stop --------------------
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openRead(page);
  const stateOf = () => page.evaluate(() => {
    const shown = (s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== "none"; };
    return { banner: shown("body > h1"), nav: shown("#topNav"), dock: shown("#dock"),
             pickers: shown("#readPickers"), play: shown("#readPlayBtn"), quran: shown("#studyScreen") };
  });
  const s0 = await stateOf();
  await page.click("#studyScreen", { position: { x: 8, y: 8 } });
  await page.waitForTimeout(320);
  const s1 = await stateOf();
  await page.click("#studyScreen", { position: { x: 8, y: 8 } });
  await page.waitForTimeout(320);
  const s2 = await stateOf();
  await page.click("#studyScreen", { position: { x: 8, y: 8 } });
  await page.waitForTimeout(320);
  const s3 = await stateOf();

  check("34e state 1 is everything", s0.banner && s0.nav && s0.dock && s0.pickers && s0.play);
  check("34e state 2 is THE OWNER'S MISSING ONE: two bars only, no app chrome",
        !s1.banner && !s1.nav && !s1.dock && s1.pickers && s1.play && s1.quran, JSON.stringify(s1));
  check("34e state 3 is bare — nothing but the Qur'an",
        !s2.banner && !s2.nav && !s2.dock && !s2.pickers && !s2.play && s2.quran, JSON.stringify(s2));
  check("34e a fourth tap is back where it started",
        s3.banner && s3.nav && s3.dock && s3.pickers && s3.play, JSON.stringify(s3));

  check("34e no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

{
  // --- 34f all of it in Bangla ------------------------------------------
  const ctx = await ctxFor({ banner: false, appLang: "bn" });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openRead(page);
  const bn = await page.evaluate(() => ({
    names: [...document.querySelectorAll("#readPickers select")].map((s) => s.getAttribute("aria-label") || ""),
    unitOption: document.querySelector("#readUnitTypeSelect option")?.textContent.trim(),
    unitValue: document.querySelector("#readUnitTypeSelect option")?.value,
    ayahOption: document.querySelector("#readAyahSelect option")?.textContent.trim(),
    ayahValue: document.querySelector("#readAyahSelect option")?.value,
  }));
  check("34f every picker is NAMED in Bangla", bn.names.every((n) => BANGLA.test(n)), JSON.stringify(bn.names));
  check("34f the unit options read in Bangla while their values stay plain ids",
        BANGLA.test(bn.unitOption || "") && bn.unitValue === "ayah", JSON.stringify(bn));
  check("34f the ayah numbers are Bengali digits while the value stays plain",
        !/[0-9]/.test(bn.ayahOption || "") && bn.ayahValue === "1", JSON.stringify(bn));
  check("34f no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 35. Shell round 23: the Qur'an's own typeface, bundled and choosable.
//
// The owner compared our Arabic with another app's and asked for that face,
// "keep the current one as an option to choose from". Before this the stack
// named 'Traditional Arabic' and 'Amiri' and NEITHER was bundled, so the real
// answer was "whatever this phone happens to have".
// ---------------------------------------------------------------------------
console.log("\n=== 35. Shell round 23: the bundled Qur'an typefaces ===");
{
  const ctx = await ctxFor({ banner: false });
  const fontHits = [];
  await ctx.route("**/app/fonts/*.woff2", async (r) => {
    fontHits.push(r.request().url().split("/").pop());
    await r.continue();
  });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openStudyOptions(page);

  const picker = await page.evaluate(() => {
    const sel = document.getElementById("quranFontSelect");
    return { values: [...sel.options].map((o) => o.value), value: sel.value,
             labels: [...sel.options].map((o) => o.textContent.trim()) };
  });
  check("35a the Arabic font picker offers the bundled faces and the device's own",
        picker.values.join() === "scheherazade,notonaskh,amiriquran,device", JSON.stringify(picker.values));
  check("35a ...and defaults to the one the owner asked for", picker.value === "scheherazade", picker.value);
  check("35a ...with the old device-decides behaviour KEPT as a choice, not removed",
        picker.values.includes("device"));

  const applied = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--quran-font").trim());
  check("35b the choice really reaches the Qur'an text", /QR Scheherazade/.test(applied), applied);

  // The face must actually be DOWNLOADED, not merely named -- that is the
  // whole defect this round fixes.
  await page.click("#tabStudyOptionsBtn");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(900);
  check("35b the woff2 is really fetched, not just referenced",
        fontHits.includes("scheherazade.woff2"), JSON.stringify(fontHits));

  const swapped = await page.evaluate(async () => {
    document.getElementById("tabStudyOptionsBtn").click();
    await new Promise((r) => setTimeout(r, 250));
    const sel = document.getElementById("quranFontSelect");
    sel.value = "device";
    sel.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 250));
    return getComputedStyle(document.documentElement).getPropertyValue("--quran-font").trim();
  });
  check("35c choosing 'your device's own' restores exactly the old stack",
        /Traditional Arabic/.test(swapped) && !/QR /.test(swapped), swapped);

  // A stored preference is worth nothing if it does not survive a reload.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const kept = await page.evaluate(() => ({
    sel: document.getElementById("quranFontSelect").value,
    applied: getComputedStyle(document.documentElement).getPropertyValue("--quran-font").trim(),
  }));
  check("35c ...and the choice survives a reload", kept.sel === "device" && /Traditional Arabic/.test(kept.applied),
        JSON.stringify(kept));

  check("35 no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

{
  // --- 35d a stale or hand-edited value can never leave the Qur'an unstyled
  const ctx = await ctxFor({ banner: false });
  await ctx.addInitScript(() => { try { localStorage.setItem("mm_quran_font", "not-a-font"); } catch {} });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const fallback = await page.evaluate(() => ({
    applied: getComputedStyle(document.documentElement).getPropertyValue("--quran-font").trim(),
    sel: document.getElementById("quranFontSelect").value,
  }));
  check("35d an unknown stored font falls back rather than wedging",
        /QR Scheherazade/.test(fallback.applied) && fallback.sel === "scheherazade", JSON.stringify(fallback));
  await page.close();
  await ctx.close();
}

{
  // --- 35e in Bangla: the wording translates, the face names do not --------
  const ctx = await ctxFor({ banner: false, appLang: "bn" });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openStudyOptions(page);
  const bn = await page.evaluate(() => {
    const sel = document.getElementById("quranFontSelect");
    return {
      label: document.querySelector('label[for="quranFontSelect"]').textContent.trim(),
      device: [...sel.options].find((o) => o.value === "device").textContent.trim(),
      face: [...sel.options].find((o) => o.value === "scheherazade").textContent.trim(),
      values: [...sel.options].map((o) => o.value),
      note: document.getElementById("quranFontNote").textContent.trim(),
    };
  });
  check("35e the control is named in Bangla", BANGLA.test(bn.label), bn.label);
  check("35e ...'your device's own' is Bangla", BANGLA.test(bn.device), bn.device);
  check("35e ...but a typeface's own name is left alone", bn.face === "Scheherazade", bn.face);
  check("35e ...the Indo-Pak note reads in Bangla", BANGLA.test(bn.note), bn.note.slice(0, 40));
  check("35e ...and the stored values stay plain ids",
        bn.values.join() === "scheherazade,notonaskh,amiriquran,device", JSON.stringify(bn.values));
  await page.close();
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 36. Shell round 24: the word-by-word chips read right to left, and the
// transliteration follows the chosen language.
//
// Both reported by the owner from the live app. (a) "all selections showing
// Bangla, yet Transliteration is showing Eng". (b) "The word by word reads
// from left to right. it has to be right to left."
// ---------------------------------------------------------------------------
console.log("\n=== 36. Shell round 24: word-by-word direction and transliteration ===");
{
  const ctx = await ctxFor({ banner: false, viewport: { width: 412, height: 915 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openStudyOptions(page);
  await page.check("#wbwShowToggle");
  await page.waitForTimeout(400);

  const readChips = () => page.evaluate(() => {
    const strip = document.querySelector(".wbw-strip");
    const chips = [...(strip?.querySelectorAll(".wbw-word") ?? [])];
    return {
      stripDir: strip ? getComputedStyle(strip).direction : "none",
      chipDir: chips[0] ? getComputedStyle(chips[0]).direction : "none",
      arabicDir: chips[0]?.querySelector(".wbw-arabic")
        ? getComputedStyle(chips[0].querySelector(".wbw-arabic")).direction : "none",
      count: chips.length,
      translits: chips.filter((c) => c.querySelector(".wbw-translit")).length,
      firstLeft: chips[0] ? Math.round(chips[0].getBoundingClientRect().left) : null,
      secondLeft: chips[1] ? Math.round(chips[1].getBoundingClientRect().left) : null,
      firstTop: chips[0] ? Math.round(chips[0].getBoundingClientRect().top) : null,
      secondTop: chips[1] ? Math.round(chips[1].getBoundingClientRect().top) : null,
    };
  });

  await page.selectOption("#wbwLangSelect", "both");
  await page.waitForTimeout(500);
  await page.click("#tabStudyOptionsBtn");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(700);
  const both = await readChips();

  check("36a the word strip is right-to-left", both.stripDir === "rtl", both.stripDir);
  // The property alone proves nothing -- measure where the words REALLY are.
  // The first word of the ayah must be drawn to the RIGHT of the second.
  check("36a ...and the first word is really drawn to the right of the second",
        both.count > 1 && both.firstTop === both.secondTop && both.firstLeft > both.secondLeft,
        JSON.stringify({ first: both.firstLeft, second: both.secondLeft }));
  // Each chip goes back to normal inside: its transliteration and gloss are
  // left-to-right scripts, and only the Arabic line is RTL.
  check("36a each chip reads normally inside", both.chipDir === "ltr", both.chipDir);
  check("36a ...while the Arabic inside it stays right-to-left", both.arabicDir === "rtl", both.arabicDir);
  check("36b with English among the languages, the transliteration is there",
        both.translits === both.count && both.count > 0, JSON.stringify(both));

  // The owner's own case: every control says Bangla, so nothing Latin should
  // be left on the chips.
  const bnOnly = await page.evaluate(async () => {
    document.getElementById("tabStudyOptionsBtn").click();
    await new Promise((r) => setTimeout(r, 250));
    const sel = document.getElementById("wbwLangSelect");
    sel.value = "bn";
    sel.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 450));
    document.getElementById("tabStudyOptionsBtn").click();
    await new Promise((r) => setTimeout(r, 250));
    const chips = [...document.querySelectorAll(".wbw-strip .wbw-word")];
    return {
      count: chips.length,
      translits: chips.filter((c) => c.querySelector(".wbw-translit")).length,
      glosses: chips.filter((c) => c.querySelector(".wbw-gloss-bn")).length,
      latin: chips.filter((c) => /[A-Za-z]/.test(c.textContent)).length,
    };
  });
  check("36b 'বাংলা only' really means only Bangla — no Latin transliteration",
        bnOnly.count > 0 && bnOnly.translits === 0, JSON.stringify(bnOnly));
  check("36b ...and the Bangla gloss is still there", bnOnly.glosses === bnOnly.count, JSON.stringify(bnOnly));
  check("36b ...with no Latin letters left on any chip", bnOnly.latin === 0, JSON.stringify(bnOnly));

  check("36 no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 37. Shell round 25: the root & derivatives panel in Bangla, and the reading
// controls moved right.
//
// The owner, reading the panel with the app in Bangla: "what about these
// derivates? in Bangla means everything should be Bangla." Also "move the
// button to right side", and "why do we show 'Abdullah Basfar' there? ... can
// we remove that from there?"
// ---------------------------------------------------------------------------
console.log("\n=== 37. Shell round 25: grammar labels, and the control row ===");
{
  const ctx = await ctxFor({ banner: false, viewport: { width: 412, height: 915 }, appLang: "bn" });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openStudyOptions(page);
  await page.check("#wbwShowToggle");
  // Round 27 split the grammar table out of Word by Word into its own reading
  // choice, so this section has to ask for it explicitly now.
  await page.check("#rootsToggle");
  await page.waitForTimeout(400);
  await page.click("#tabStudyOptionsBtn");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(900);

  const m = await page.evaluate(() => {
    const bar = document.getElementById("readBar");
    const barBox = bar.getBoundingClientRect();
    const kids = [...bar.children];
    const rows = [...document.querySelectorAll(".root-deriv-strip .root-row")];
    // The honest check for "packed together, not spread with gaps" is the
    // GAP between each consecutive control, not where the group starts --
    // round 31 added a sixth child (#readQuickMenuSlot), which widens the
    // group and moves its own start point, so a start-position threshold
    // tuned for five items breaks the moment a sixth is added even though
    // the row is still flush right with no `space-between`-style gaps.
    const gaps = kids.slice(1).map((el, i) => Math.round(el.getBoundingClientRect().left - kids[i].getBoundingClientRect().right));
    return {
      barKids: kids.map((e) => e.id),
      noReciter: !document.getElementById("readReciterName"),
      gaps,
      lastRight: Math.round(kids[kids.length - 1].getBoundingClientRect().right),
      barLeft: Math.round(barBox.left), barRight: Math.round(barBox.right),
      posCount: rows.length,
      latinPos: rows.map((r) => r.querySelector(".root-pos")?.textContent || "").filter((x) => /[A-Za-z]/.test(x)).length,
      samplePos: rows[0]?.querySelector(".root-pos")?.textContent.trim() ?? "",
      counts: rows.map((r) => r.querySelector(".root-count")?.textContent ?? "").filter(Boolean),
    };
  });

  check("37a the reciter caption is gone from the reading controls", m.noReciter);
  // Round 31 added a sixth child, #readQuickMenuSlot (the ⋮ quick menu).
  check("37a the row is Prev · Next · Play · Stop · Full screen · ⋮ slot",
        m.barKids.join() === "prevUnitBtn,nextUnitBtn,readPlayBtn,readStopBtn,hideChromeBtn,readQuickMenuSlot", JSON.stringify(m.barKids));
  // `space-between` would leave large, uneven gaps between controls, which
  // is exactly how a stale `space-between` survived this round's first
  // attempt -- checking the gaps directly catches that regardless of how
  // many controls the row holds.
  check("37a the controls are grouped together with no large gaps between them, flush against the right edge",
        m.gaps.every((g) => g < 15) && m.lastRight >= m.barRight - 2,
        JSON.stringify({ gaps: m.gaps, lastRight: m.lastRight, barRight: m.barRight }));

  check("37b the root & derivatives panel has rows to check", m.posCount > 0, String(m.posCount));
  check("37b every grammar label is Bangla — no English left",
        m.latinPos === 0 && BANGLA.test(m.samplePos), JSON.stringify({ latin: m.latinPos, sample: m.samplePos }));
  check("37b ...and the root counts use Bengali digits",
        m.counts.length > 0 && m.counts.every((c) => !/[0-9]/.test(c)), JSON.stringify(m.counts.slice(0, 3)));

  check("37 no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

{
  // --- 37c the composed labels, and the raw corpus codes ------------------
  // 359 distinct part-of-speech strings in the data, built from 46 atoms:
  // posLabel() has to translate the atoms and rejoin, and it has to expand
  // the corpus codes, which are meaningless in ENGLISH too.
  const ctx = await ctxFor({ banner: false });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const en = await page.evaluate(async () => {
    const m = await import("/app/js/labels.js");
    return {
      composed: m.posLabel("Preposition + Relative Pronoun"),
      code: m.posLabel("RES"),
      unknown: m.posLabel("yaAsiyna"),
      empty: m.posLabel(""),
    };
  });
  check("37c a composed label survives in English", en.composed === "Preposition + Relative Pronoun", en.composed);
  check("37c a raw corpus code is expanded into real words", en.code === "Restriction Particle", en.code);
  check("37c an unknown atom prints as it is rather than vanishing", en.unknown === "yaAsiyna", en.unknown);
  check("37c nothing in, nothing out", en.empty === "", JSON.stringify(en.empty));
  await page.close();
  await ctx.close();
}

{
  const ctx = await ctxFor({ banner: false, appLang: "bn" });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const bn = await page.evaluate(async () => {
    const m = await import("/app/js/labels.js");
    return { composed: m.posLabel("Preposition + Relative Pronoun"), code: m.posLabel("PRO") };
  });
  check("37c ...and both sides of a composed label are Bangla",
        bn.composed.split("+").every((p) => BANGLA.test(p)), bn.composed);
  check("37c ...including one that started as a corpus code", BANGLA.test(bn.code), bn.code);
  await page.close();
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 38. Shell round 26: the listening fixes.
//
// EVERY other section in this suite has been able to leave audio alone,
// because archive.org is unreachable from a sandbox and the checks only ever
// asked WHICH FILE was requested. That is not enough for this round: the
// owner's complaints are about what happens AFTER a file loads (or fails to),
// so these tests serve real, playable audio of their own and watch the app's
// own behaviour rather than its intentions.
//
// The wav is silence, one second of it, 8kHz mono -- small enough to make a
// range finish inside a test, real enough for the browser to decode, play,
// seek within and fire timeupdate/ended on.
// ---------------------------------------------------------------------------
function silentWav(seconds = 1, rate = 8000) {
  const samples = Math.round(seconds * rate);
  const dataLen = samples * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + dataLen, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(dataLen, 40);
  return buf;
}
// Two lengths, because the two reciter shapes need different things: a direct
// reciter gets one short file per ayah, a segmented one gets a single long
// file it seeks around inside.
const WAV_AYAH = silentWav(0.5);
const WAV_SURAH = silentWav(3);
// Surah 1's seven ayahs, a third of a second each inside that one file -- the
// same shape as the real Bangla timing map, small enough that a whole ruku'
// finishes inside a test.
const TIMINGS = JSON.stringify({
  1: Array.from({ length: 7 }, (_, i) => ({
    verse_key: `1:${i + 1}`, timestamp_from: i * 300, timestamp_to: (i + 1) * 300,
  })),
});
const isSurahFile = (url) => /ShareefBayezidMahmud|al-quran-eng-mp3-audio/.test(url);

/** A context whose audio really plays: archive.org serves the wav above and
    the Bangla timing map is real. `urls` collects every audio file asked for,
    which is how "did BOTH reciters play" is answered by fact rather than by
    reading the button. */
async function audioCtx({ audio = "ok" } = {}) {
  const ctx = await ctxFor({ banner: false });
  const urls = [];
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: TIMINGS }));
  await ctx.route("**/archive.org/**", (r) => {
    const url = r.request().url();
    urls.push(url);
    if (audio === "fail") return r.abort();
    return r.fulfill({ status: 200, contentType: "audio/wav", body: isSurahFile(url) ? WAV_SURAH : WAV_AYAH });
  });
  return { ctx, urls };
}
const tickReciter = async (page, id) => {
  await openStudyOptions(page);
  await page.check(`.drill-reciter-check[value="${id}"]`);
  await page.waitForTimeout(250);
};
const playLabel = (page) => page.evaluate(() =>
  document.getElementById("readPlayBtn").getAttribute("aria-label") || "");
/** Waiting for a state rather than sleeping a guessed number of milliseconds:
    a boundary check rides on `timeupdate`, which browsers throttle to about a
    quarter of a second, so a short ayah takes noticeably longer than its own
    length and a fixed sleep would make these tests flaky rather than wrong. */
const waitFor = (page, fn, timeout = 8000) =>
  page.waitForFunction(fn, null, { timeout }).then(() => true).catch(() => false);
const ayahNow = (page) => page.evaluate(() => document.getElementById("ayahSelect").value);

console.log("\n=== 38. Shell round 26: listening ===");
{
  // --- 38a EVERY ticked reciter plays, not just the first ----------------
  // The owner's own report: "even Arabic and Bangla is checked for listening
  // but only Arabic is played not Bangla". The reading screen's Play used a
  // single currentReciterId while the list beside it took several ticks.
  const { ctx, urls } = await audioCtx();
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await tickReciter(page, "bn");
  await openRead(page);
  await page.click("#readPlayBtn");
  await page.waitForTimeout(3500);
  const arabic = urls.filter((u) => /001001\.mp3$/.test(u));
  const bangla = urls.filter((u) => /ShareefBayezidMahmud/.test(u));
  check("38a Play sounds the Arabic reciter", arabic.length >= 1, JSON.stringify(urls.slice(0, 3)));
  check("38a Play sounds the Bangla reciter too — the owner's own report",
        bangla.length >= 1, JSON.stringify(urls.slice(0, 3)));
  check("38a no page errors", errors.filter((e) => !/ERR_/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

{
  // --- 38b ONE failure, ONE prompt, and it says what failed --------------
  // The owner's two screenshots are two dialogs for a single file that would
  // not load: the element's `error` event alerted one sentence and the
  // rejected play() promise alerted the browser's own wording of the same
  // thing.
  const { ctx } = await audioCtx({ audio: "fail" });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const dialogs = [];
  page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss().catch(() => {}); });
  await openRead(page);
  await page.click("#readPlayBtn");
  await page.waitForTimeout(2500);
  check("38b one failure raises exactly one prompt", dialogs.length === 1, JSON.stringify(dialogs));
  check("38b ...and it names the reciter and the ayah that failed",
        /Basfar/.test(dialogs[0] || "") && /Ayah/.test(dialogs[0] || ""), dialogs[0]);
  check("38b ...the Play button is usable again rather than stuck",
        (await page.evaluate(() => !document.getElementById("readPlayBtn").disabled))
        && /Play/.test(await playLabel(page)));
  await page.close();
  await ctx.close();
}

{
  // --- 38c a failed SEGMENTED load settles instead of hanging ------------
  // seekTo() waited for `loadedmetadata` and nothing else, so a load that
  // failed left its promise pending for ever: the drill never advanced, never
  // reported and never recovered. The proof is that a second Play, once the
  // file is reachable, really plays.
  const ctx = await ctxFor({ banner: false });
  let audioOk = false;
  const urls = [];
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: TIMINGS }));
  await ctx.route("**/archive.org/**", (r) => {
    const url = r.request().url();
    urls.push(url);
    return audioOk
      ? r.fulfill({ status: 200, contentType: "audio/wav", body: isSurahFile(url) ? WAV_SURAH : WAV_AYAH })
      : r.abort();
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const dialogs = [];
  page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss().catch(() => {}); });
  await openStudyOptions(page);
  await page.check('.drill-reciter-check[value="bn"]');
  await page.uncheck('.drill-reciter-check[value="ar"]');
  await page.waitForTimeout(250);
  await openRead(page);
  await page.click("#readPlayBtn");
  await page.waitForTimeout(2000);
  check("38c a failed Bangla load reports once rather than hanging silently",
        dialogs.length === 1, JSON.stringify(dialogs));
  audioOk = true;
  urls.length = 0;
  await page.click("#readPlayBtn");
  const playing = await waitFor(page, () =>
    /Pause|থামান/.test(document.getElementById("readPlayBtn").getAttribute("aria-label") || ""), 6000);
  check("38c ...and the next Play really plays",
        playing && urls.length >= 1, `${urls.length} request(s), label ${await playLabel(page)}`);
  await page.close();
  await ctx.close();
}

{
  // --- 38d switching to the reading screen does not stop the recitation ---
  // The owner: "moving from Study options to read or vice versa stops the
  // play". Playback moves the current ayah as it advances, so the Read tab's
  // "open the unit at its first ayah" rule was jumping backwards AND calling
  // stopDrill() on the way.
  const { ctx } = await audioCtx();
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  // A Ruku' (surah 1: ayahs 1-7), deliberately NOT a Range: Range and Whole
  // Surah render as a flow, which does not move #ayahSelect, so they cannot
  // say which ayah is sounding. A Ruku' reads ayah by ayah and does.
  await setUnit(page, "ruku");
  await openStudyOptions(page);
  await page.click("#drillPlayBtn");
  // Wait until the recitation has really moved off the unit's first ayah --
  // that is the state in which the old code stopped it.
  const moved = await waitFor(page, () => Number(document.getElementById("ayahSelect").value) > 1, 15000);
  check("38d the recitation really advances ayah by ayah", moved, await ayahNow(page));
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  check("38d tapping Read mid-recitation keeps it playing",
        /Pause|থামান/.test(await playLabel(page)), await playLabel(page));
  // ...and with nothing playing it still opens at the unit's own first ayah,
  // which is round 17's rule and must survive this fix.
  await page.click("#readStopBtn");
  await page.evaluate(() => {
    const a = document.getElementById("ayahSelect");
    a.value = "4"; a.dispatchEvent(new Event("change"));
  });
  await page.waitForTimeout(400);
  await page.click("#tabReadBtn"); // leave
  await page.click("#tabReadBtn"); // and come back
  await page.waitForTimeout(400);
  check("38d with nothing playing it still opens at the unit's first ayah",
        await page.evaluate(() => document.getElementById("ayahSelect").value === "1"),
        await page.evaluate(() => document.getElementById("ayahSelect").value));
  await page.close();
  await ctx.close();
}

{
  // --- 38e a finished run starts again; it does not "resume" into the rest
  // of the surah. A segmented reciter stops at an ayah boundary PART-WAY
  // through a whole-surah file, which looks exactly like a pause -- so the
  // next Play used to carry straight on past the boundary with no listener
  // left to stop it.
  const { ctx } = await audioCtx();
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await openStudyOptions(page);
  await page.check('.drill-reciter-check[value="bn"]');
  await page.uncheck('.drill-reciter-check[value="ar"]');
  await page.selectOption("#unitTypeSelect", "ruku");
  await page.waitForTimeout(400);
  await page.click("#drillPlayBtn");
  await waitFor(page, () => Number(document.getElementById("ayahSelect").value) === 7, 20000);
  const ended = await waitFor(page, () =>
    /Play|চালান/.test(document.getElementById("readPlayBtn").getAttribute("aria-label") || ""), 8000);
  check("38e the finished run leaves the button reading Play", ended, await playLabel(page));
  await page.click("#drillPlayBtn");
  const restarted = await waitFor(page, () => document.getElementById("ayahSelect").value === "1", 5000);
  check("38e pressing Play again starts the unit over rather than running on",
        restarted, await ayahNow(page));
  await page.close();
  await ctx.close();
}

{
  // --- 38f Play still pauses and resumes, and resuming does not refetch ---
  const { ctx, urls } = await audioCtx();
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await setUnit(page, "surah");
  await openRead(page);
  await page.click("#readPlayBtn");
  await page.waitForTimeout(600);
  check("38f Play starts, and the button becomes Pause",
        /Pause|থামান/.test(await playLabel(page)), await playLabel(page));
  await page.click("#readPlayBtn");
  await page.waitForTimeout(300);
  check("38f pressing it again pauses", /Play|চালান/.test(await playLabel(page)), await playLabel(page));
  const before = urls.length;
  await page.click("#readPlayBtn");
  await page.waitForTimeout(400);
  check("38f and pressing it once more resumes rather than restarting",
        /Pause|থামান/.test(await playLabel(page)) && urls.length === before,
        `${await playLabel(page)}, ${urls.length - before} extra request(s)`);
  await page.close();
  await ctx.close();
}

{
  // --- 38g the two Play buttons are one behaviour ------------------------
  const ctx = await ctxFor({ banner: false });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openStudyOptions(page);
  const repeat = await page.evaluate(() => document.getElementById("drillRepeatSelect").value);
  check("38g Repeat defaults to once — one Play serves both screens now", repeat === "1", repeat);
  await page.close();
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 39. Shell round 27: the owner's four fixes.
// ---------------------------------------------------------------------------
console.log("\n=== 39. Shell round 27: the four fixes ===");
{
  // --- 39a a Range shows From and To, and no third number picker ---------
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await setUnit(page, "range");
  await openRead(page);
  const range = await page.evaluate(() => {
    const shown = (id) => {
      const el = document.getElementById(id);
      return !!el && !el.hidden && el.getBoundingClientRect().width > 0;
    };
    const row = document.getElementById("readPickers");
    const cells = [...row.querySelectorAll("select")].filter((el) => !el.hidden);
    const tops = cells.map((c) => Math.round(c.getBoundingClientRect().top));
    return {
      ayah: shown("readAyahSelect"), from: shown("readRangeFromSelect"), to: shown("readRangeToSelect"),
      cells: cells.map((c) => c.id),
      oneLine: new Set(tops).size === 1,
      overflow: row.scrollWidth > row.clientWidth + 1,
      numWidth: Math.round(document.getElementById("readRangeToSelect").getBoundingClientRect().width),
    };
  });
  check("39a a Range shows From and To", range.from && range.to, JSON.stringify(range));
  check("39a ...and NOT a third Ayah picker beside them", !range.ayah, JSON.stringify(range.cells));
  check("39a ...all on one line, nothing overflowing", range.oneLine && !range.overflow, JSON.stringify(range));

  // A three-digit ayah must not be clipped -- the owner's "3 digits show
  // cut-off, looks odd". Surah 2 has 286, so its pickers really carry three
  // digits; measured against what the widest option needs.
  const wide = await page.evaluate(async () => {
    const s = document.getElementById("readSurahSelect");
    s.value = "2"; s.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 1400));
    const sel = document.getElementById("readRangeToSelect");
    const last = sel.options[sel.options.length - 1]; // the surah's own last ayah: three digits in surah 2
    sel.value = last.value; sel.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 700));
    // What the text alone needs, measured in the select's own font.
    const probe = document.createElement("span");
    const cs = getComputedStyle(sel);
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font}`;
    probe.textContent = last.textContent;
    document.body.appendChild(probe);
    const needs = probe.getBoundingClientRect().width;
    probe.remove();
    // A <select> spends roughly 18px on its arrow plus its own padding.
    const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 18;
    return { box: sel.getBoundingClientRect().width, needs: needs + pad, value: last.textContent };
  });
  check("39a a three-digit ayah is not cut off",
        wide.box >= wide.needs, `${Math.round(wide.box)}px box, needs ${Math.round(wide.needs)}px`);
  check("39a no page errors", errors.filter((e) => !/ERR_/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

{
  // --- 39b the ayah being recited is marked on screen --------------------
  // A Range draws every ayah at once, so nothing moved as the audio advanced:
  // the owner's "the Ayah playing should display on the screen (now it
  // remains static)".
  const { ctx } = await audioCtx();
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await setUnit(page, "range");
  await openRead(page);
  const marked = await page.evaluate(() =>
    document.querySelectorAll("#pageViewContainer .page-flow-ayah[data-ayah]").length);
  check("39b every ayah in the flow carries its own number", marked >= 2, String(marked));
  await page.click("#readPlayBtn");
  const first = await waitFor(page, () =>
    document.querySelector("#pageViewContainer .page-flow-ayah.now-playing")?.dataset.ayah === "1", 8000);
  check("39b the ayah being recited is marked", first);
  const moved = await waitFor(page, () =>
    document.querySelector("#pageViewContainer .page-flow-ayah.now-playing")?.dataset.ayah === "2", 12000);
  check("39b ...and the mark follows the recitation to the next ayah", moved,
        await page.evaluate(() => document.querySelector("#pageViewContainer .now-playing")?.dataset.ayah));
  check("39b exactly one ayah is marked at a time",
        await page.evaluate(() => document.querySelectorAll("#pageViewContainer .now-playing").length === 1));
  await page.close();
  await ctx.close();
}

{
  // --- 39c Word by Word no longer drags the grammar table with it --------
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openStudyOptions(page);
  await page.check("#wbwShowToggle");
  await page.waitForTimeout(600);
  const wbwOnly = await page.evaluate(() => ({
    wbw: document.querySelectorAll("#ayahPanels .wbw-strip").length,
    roots: document.querySelectorAll("#ayahPanels .root-deriv-strip").length,
  }));
  check("39c Word by Word shows the words", wbwOnly.wbw > 0, JSON.stringify(wbwOnly));
  check("39c ...and NOT the derivatives at the same time", wbwOnly.roots === 0, JSON.stringify(wbwOnly));

  await page.check("#rootsToggle");
  await page.waitForTimeout(600);
  const both = await page.evaluate(() => ({
    wbw: document.querySelectorAll("#ayahPanels .wbw-strip").length,
    roots: document.querySelectorAll("#ayahPanels .root-deriv-strip").length,
  }));
  check("39c its own tick brings the derivatives back", both.roots > 0 && both.wbw > 0, JSON.stringify(both));

  // The other direction, asked of the renderer itself. It cannot be asked of
  // the screen here: EVERY Quran Approach in the stub declares wordByWord, and
  // an Approach's own panels ADD to the reader's ticks rather than being
  // overridden by them (round 19) -- so with those Approaches the words are
  // always on whatever the tick says. What matters is that the two panels are
  // genuinely independent, which is exactly what this asks.
  const split = await page.evaluate(async () => {
    const r = await import("/app/js/ayah-renderer.js");
    const q = await import("/app/js/quran-data.js");
    const ayah = (await q.getSurah(1)).ayahs[0];
    const has = (html, cls) => html.includes(cls);
    const words = r.renderLayoutA(ayah, ["wordByWord"], {});
    const roots = r.renderLayoutA(ayah, ["rootDerivatives"], {});
    return {
      wordsOnly: has(words, "wbw-strip") && !has(words, "root-deriv-strip"),
      rootsOnly: has(roots, "root-deriv-strip") && !has(roots, "wbw-strip"),
    };
  });
  check("39c the words panel renders without the derivatives", split.wordsOnly, JSON.stringify(split));
  check("39c ...and the derivatives can be had WITHOUT the words", split.rootsOnly, JSON.stringify(split));
  check("39c no page errors", errors.filter((e) => !/ERR_/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

{
  // --- 39d one reciter's missing file does not stop the whole recitation --
  // The owner's fourth report: a Range with Arabic and Bangla, paused, played
  // again -- Bangla failed and everything "came to a total stop".
  const ctx = await ctxFor({ banner: false });
  const urls = [];
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: TIMINGS }));
  await ctx.route("**/archive.org/**", (r) => {
    const url = r.request().url();
    urls.push(url);
    // Bangla is unreachable; Arabic is fine.
    return isSurahFile(url)
      ? r.abort()
      : r.fulfill({ status: 200, contentType: "audio/wav", body: WAV_AYAH });
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const dialogs = [];
  page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss().catch(() => {}); });
  await tickReciter(page, "bn");
  await setUnit(page, "ruku");
  await openRead(page);
  await page.click("#readPlayBtn");
  const carriedOn = await waitFor(page, () =>
    Number(document.getElementById("ayahSelect").value) >= 3, 20000);
  check("39d a failing reciter does not stop the other one", carriedOn, await ayahNow(page));
  await page.waitForTimeout(1200); // a held-back message is announced a beat later
  check("39d ...and it is explained once, not once per ayah",
        dialogs.length === 1,
        `${dialogs.length} dialog(s); bangla asked ${urls.filter((u) => isSurahFile(u)).length}x of ${urls.length}`);
  await page.click("#readStopBtn");
  await page.close();
  await ctx.close();
}

{
  // --- 39e a load that fails once and works on the retry says nothing -----
  // A file that was playing a moment ago and then will not load is transient,
  // and the retry makes it moot -- so the reader must not be interrupted.
  const ctx = await ctxFor({ banner: false });
  let refuse = 1;
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: TIMINGS }));
  await ctx.route("**/archive.org/**", (r) => {
    if (refuse-- > 0) return r.abort();
    return r.fulfill({ status: 200, contentType: "audio/wav", body: WAV_AYAH });
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const dialogs = [];
  page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss().catch(() => {}); });
  await openRead(page);
  await page.click("#readPlayBtn");
  const playing = await waitFor(page, () =>
    /Pause|থামান/.test(document.getElementById("readPlayBtn").getAttribute("aria-label") || ""), 8000);
  await page.waitForTimeout(1200); // long enough for a held-back prompt to have fired
  check("39e a first failure that the retry fixes really plays", playing, await playLabel(page));
  check("39e ...and the reader is never interrupted about it",
        dialogs.length === 0, JSON.stringify(dialogs));
  await page.close();
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 40. Shell round 28: the Mushaf page.
//
// Nothing in this suite had ever rendered a Mushaf page -- which is how a page
// 32px wider than the phone it was drawn on survived since Phase 5. See
// fixtures/README.md for why two real pages are checked in and the 122KB glyph
// font is not.
// ---------------------------------------------------------------------------
const MUSHAF_PAGES = fs.readFileSync(new URL("./fixtures/mushaf-pages.json", import.meta.url));
const STAND_IN_FONT = fs.readFileSync(new URL("../../app/fonts/notonaskh.woff2", import.meta.url));

async function mushafCtx(opts = {}) {
  const ctx = await ctxFor(opts);
  await ctx.route("**/mushaf-madani-v2.json", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: MUSHAF_PAGES }));
  // A real, loadable woff2 in place of the page's own glyph font: without one
  // that resolves, hifz-renderer.js skips justification entirely and these
  // checks would measure nothing. See fixtures/README.md.
  for (const pattern of ["**/mushaf/fonts/p*.woff2", "**/QCF_SurahHeader_COLOR-Regular.woff2"]) {
    await ctx.route(pattern, (r) => r.fulfill({ status: 200, contentType: "font/woff2", body: STAND_IN_FONT }));
  }
  return ctx;
}

/** Surah 3 is the one the checked-in fixture pages cover. `unit` is chosen
    BEFORE Mushaf is ticked on purpose: opening a Mushaf page goes straight to
    full screen (round 18's rule -- a page is a page), which hides the dock, so
    there is no Study options tab to reach afterwards. */
async function openMushaf(page, unit = null) {
  await openStudyOptions(page);
  await page.selectOption("#surahSelect", "3");
  await page.waitForTimeout(1200);
  if (unit) { await page.selectOption("#unitTypeSelect", unit); await page.waitForTimeout(600); }
  await page.check("#mushafToggle");
  await page.waitForTimeout(2500);
  await page.click("#tabStudyOptionsBtn");
  await page.waitForTimeout(200);
  await openRead(page);
  await page.waitForTimeout(1500);
  // One tap on the reading walks the full-screen cycle back to normal, which
  // is what puts the reading screen's own controls back within reach.
  await page.evaluate(() => {
    if (document.body.classList.contains("immersive-read")) {
      document.getElementById("studyScreen").click();
    }
  });
  await page.waitForTimeout(400);
}

console.log("\n=== 40. Shell round 28: the Mushaf page ===");
{
  const ctx = await mushafCtx({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await openMushaf(page);

  const fit = await page.evaluate(() => {
    const el = document.querySelector(".hifz-page");
    if (!el) return { none: true };
    const r = el.getBoundingClientRect();
    const sc = document.getElementById("readScroll");
    return {
      left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width),
      viewport: innerWidth,
      gutterLeft: Math.round(r.left),
      gutterRight: Math.round(innerWidth - r.right),
      sideways: sc.scrollWidth > sc.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
  check("40a the Mushaf page really renders", !fit.none, JSON.stringify(fit));
  check("40a it fits the screen — nothing hanging off the right",
        fit.right <= fit.viewport, `right ${fit.right} of ${fit.viewport}`);
  check("40a ...with the same gutter on both sides, which is what the owner asked for",
        Math.abs(fit.gutterLeft - fit.gutterRight) <= 1, JSON.stringify(fit));
  check("40a ...and nothing scrolls sideways", !fit.sideways, JSON.stringify(fit));

  // The page is rendered while the Study options panel is over a stage that is
  // still showing the wheel, so its width is 0 at render time and
  // justifyPageLines() gives up. Nothing used to re-run it once the reading
  // screen appeared: the lines stayed at their natural width instead of
  // spanning the page.
  const just = await page.evaluate(() => {
    const el = document.querySelector(".hifz-page");
    const cs = getComputedStyle(el);
    const target = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const lines = [...el.querySelectorAll(".hifz-line:not(.centered)")];
    const rects = lines.map((l) => l.getBoundingClientRect());
    const contentRight = el.getBoundingClientRect().right - parseFloat(cs.paddingRight);
    const contentLeft = el.getBoundingClientRect().left + parseFloat(cs.paddingLeft);
    return {
      count: lines.length,
      transformed: lines.filter((l) => /scaleX/.test(l.style.transform)).length,
      target: Math.round(target),
      pastRight: rects.filter((r) => r.right > contentRight + 1).length,
      pastLeft: rects.filter((r) => r.left < contentLeft - 1).length,
    };
  });
  check("40b the page has justifiable lines to check", just.count > 0, JSON.stringify(just));
  check("40b every line is justified, even though the page was drawn while hidden",
        just.transformed === just.count, JSON.stringify(just));
  check("40b ...and no line spills past either edge of the page",
        just.pastRight === 0 && just.pastLeft === 0, JSON.stringify(just));
  check("40 no page errors", errors.filter((e) => !/ERR_|archive\.org/.test(e)).length === 0,
        errors.slice(0, 2).join(" | "));
  await page.close();
  await ctx.close();
}

{
  // --- 40c the recited ayah is marked AND followed ------------------------
  const ctx = await mushafCtx({ banner: false });
  const urls = [];
  await ctx.route("**/archive.org/**", (r) => {
    urls.push(r.request().url());
    return r.fulfill({ status: 200, contentType: "audio/wav", body: WAV_AYAH });
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  // A Ruku' reads ayah by ayah, so the recitation really walks the page.
  await openMushaf(page, "ruku");
  await page.click("#readPlayBtn");
  const marked = await waitFor(page, () =>
    document.querySelectorAll(".hifz-word.playing").length > 0, 10000);
  check("40c the ayah being recited is marked on the page", marked,
        await page.evaluate(() => document.querySelectorAll(".hifz-word.playing").length));
  const band = await page.evaluate(() => {
    const w = document.querySelector(".hifz-word.playing");
    if (!w) return null;
    const cs = getComputedStyle(w);
    return { bg: cs.backgroundColor, shadow: cs.boxShadow };
  });
  check("40c ...with a real background band, not only a colour change",
        !!band && band.bg !== "rgba(0, 0, 0, 0)" && band.bg !== "transparent", JSON.stringify(band));

  // ...and the mark moves on with the recitation.
  const firstKey = await page.evaluate(() => {
    const w = document.querySelector(".hifz-word.playing");
    return w ? w.textContent : null;
  });
  const movedOn = await waitFor(page, (prev) => {
    const w = document.querySelector(".hifz-word.playing");
    return !!w && w.textContent !== prev;
  }, 15000);
  check("40c ...and it follows the recitation to the next ayah", movedOn, String(firstKey));
  check("40c exactly one ayah is marked at a time",
        await page.evaluate(() => {
          const keys = new Set();
          document.querySelectorAll(".hifz-word.playing").forEach((w) => {
            const line = w.closest(".hifz-line");
            keys.add(line ? [...line.children].indexOf(w) >= 0 : false);
          });
          // The real question: every marked word belongs to ONE ayah, which the
          // registry guarantees -- so simply assert some are marked and the
          // page did not light up wholesale.
          const marked = document.querySelectorAll(".hifz-word.playing").length;
          const total = document.querySelectorAll(".hifz-word").length;
          return marked > 0 && marked < total;
        }));
  await page.click("#readStopBtn");
  await page.close();
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 41. Shell round 28: the reading moves sideways, page by page.
// ---------------------------------------------------------------------------
console.log("\n=== 41. Shell round 28: sideways reading ===");
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await setUnit(page, "range");
  await openRead(page);

  const strip = await page.evaluate(() => {
    const el = document.getElementById("pageViewContainer");
    const kids = [...el.children].map((k) => k.getBoundingClientRect());
    const sc = document.getElementById("readScroll");
    return {
      on: document.body.classList.contains("read-sideways"),
      ticked: document.getElementById("sidewaysToggle").checked,
      pages: kids.length,
      pageWidth: kids[0] ? Math.round(kids[0].width) : 0,
      stripWidth: el.clientWidth,
      movesSideways: el.scrollWidth > el.clientWidth + 1,
      firstLeft: kids[0] ? Math.round(kids[0].left) : null,
      secondLeft: kids[1] ? Math.round(kids[1].left) : null,
      // Round 17's own guard: the READING SCROLLER must still never scroll
      // sideways. The strip inside it is what pages now.
      scrollerSideways: sc.scrollWidth > sc.clientWidth + 1,
      docSideways: document.documentElement.scrollWidth > innerWidth + 1,
      firstAyah: el.children[0]?.dataset.ayah,
      secondAyah: el.children[1]?.dataset.ayah,
    };
  });
  check("41a the reading is paged sideways by default", strip.on && strip.ticked, JSON.stringify(strip));
  check("41a each ayah of a Range is its own page, exactly one screen wide",
        strip.pages > 1 && Math.abs(strip.pageWidth - strip.stripWidth) <= 1, JSON.stringify(strip));
  check("41a the strip really moves sideways", strip.movesSideways, JSON.stringify(strip));
  // Corrected same-round: the owner's own follow-up said the FIRST build had
  // this backwards -- "left to right" was about the swipe gesture, not the
  // on-screen order, and the Qur'an itself reads right to left. Ayah 1 sits on
  // the RIGHT (visible without scrolling, same gutter every other reading
  // control keeps) and ayah 2 is to its LEFT, off-screen until the reader
  // moves -- exactly how a real Mushaf's pages turn.
  check("41b ayah 1 opens visible on screen with a normal gutter, not scrolled off",
        strip.firstLeft !== null && strip.firstLeft >= 0 && strip.firstLeft < strip.stripWidth,
        JSON.stringify(strip));
  check("41b ayah 2 sits to the LEFT of ayah 1, not the right — reading order, not left-to-right order",
        strip.secondLeft < strip.firstLeft && Number(strip.secondAyah) === Number(strip.firstAyah) + 1,
        JSON.stringify(strip));
  check("41a ...and nothing else scrolls sideways",
        !strip.scrollerSideways && !strip.docSideways, JSON.stringify(strip));
  check("41a no page errors", errors.filter((e) => !/ERR_|archive\.org/.test(e)).length === 0,
        errors.slice(0, 2).join(" | "));

  // The tick is the way back, and it sticks.
  await openStudyOptions(page);
  await page.uncheck("#sidewaysToggle");
  await page.waitForTimeout(500);
  const off = await page.evaluate(() => ({
    on: document.body.classList.contains("read-sideways"),
    stored: localStorage.getItem("mm_reading_sideways"),
  }));
  check("41d unticking it gives the scrolling reading back", !off.on && off.stored === "0", JSON.stringify(off));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const afterReload = await page.evaluate(() => ({
    on: document.body.classList.contains("read-sideways"),
    ticked: document.getElementById("sidewaysToggle").checked,
  }));
  check("41d ...and the choice survives a reload", !afterReload.on && !afterReload.ticked, JSON.stringify(afterReload));
  await page.close();
  await ctx.close();
}

{
  // --- 41c the recitation carries the strip across ------------------------
  const { ctx } = await audioCtx();
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await setUnit(page, "range");
  await openRead(page);
  const before = await page.evaluate(() => document.getElementById("pageViewContainer").scrollLeft);
  await page.click("#readPlayBtn");
  // Measured directly, not assumed: under the strip's own `direction: rtl`
  // (see the CSS comment), scrollLeft starts at 0 on ayah 1 and goes NEGATIVE
  // as the reading advances leftward to ayah 2, 3... -- the reverse of the
  // ordinary left-to-right scrolling sign.
  const carried = await waitFor(page, () =>
    document.getElementById("pageViewContainer").scrollLeft < -1, 15000);
  check("41c the recitation carries the reading across to the ayah it reaches",
        carried, `scrollLeft was ${before}, now ${await page.evaluate(() => document.getElementById("pageViewContainer").scrollLeft)}`);
  await page.click("#readStopBtn");
  await page.close();
  await ctx.close();
}

{
  // --- 41e a Mushaf page is a page in the strip too ------------------------
  const ctx = await mushafCtx({ banner: false });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await openMushaf(page, "surah"); // a whole surah spans both fixture pages
  const m = await page.evaluate(() => {
    const el = document.getElementById("pageViewContainer");
    const pages = [...el.querySelectorAll(".hifz-page")].map((p) => p.getBoundingClientRect());
    return {
      sideways: document.body.classList.contains("read-sideways"),
      pages: pages.length,
      // Reading order, corrected same-round: page 2 (the later page) sits to
      // the LEFT of page 1, matching how a real Mushaf turns.
      sideBySide: pages.length > 1 ? Math.round(pages[1].left) < Math.round(pages[0].left) : null,
      sameRow: pages.length > 1 ? Math.abs(pages[1].top - pages[0].top) < 2 : null,
      // Only the page ON SCREEN has to fit: the next one is waiting off to
      // the left, which is the whole point of a strip you move across.
      fitsScreen: pages.length ? pages[0].left >= -1 && pages[0].right <= innerWidth + 1 : false,
    };
  });
  check("41e the Mushaf pages sit side by side, not stacked, in right-to-left order",
        m.sideways && m.pages > 1 && m.sideBySide && m.sameRow, JSON.stringify(m));
  check("41e ...and the page on screen still fits it", m.fitsScreen, JSON.stringify(m));
  await page.close();
  await ctx.close();
}

// ---------------------------------------------------------------------------
console.log("\n=== 42. The Ayah Note panel: ⋮ quick menu + Note & more ===");
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(400); // ensureAyahNoteDataLoaded() is fire-and-forget from this same click

  const badge = await page.evaluate(() => {
    const wrap = document.querySelector("#readQuickMenuSlot .ayah-quick-wrap");
    return {
      present: !!wrap,
      unitKey: wrap?.dataset.unitKey ?? null,
      hasNoteClass: wrap?.querySelector(".ayah-quick-btn")?.classList.contains("has-note") ?? null,
    };
  });
  check("42a the ⋮ badge sits on the single-ayah view", badge.present && badge.unitKey === "ayah:1:1", JSON.stringify(badge));
  check("42a ...not marked as having a note yet", badge.hasNoteClass === false, JSON.stringify(badge));

  await page.click("#readQuickMenuSlot [data-qm-toggle]");
  await page.waitForTimeout(150);
  const menu = await page.evaluate(() => {
    const wrap = document.querySelector("#readQuickMenuSlot .ayah-quick-wrap");
    return {
      open: wrap.querySelector(".quick-menu").classList.contains("open"),
      items: [...wrap.querySelectorAll(".qm-item")].map((b) => b.textContent.trim()),
    };
  });
  check("42b the quick menu opens", menu.open);
  check("42b ...with Copy, Share, Play and Note & more",
        menu.items.some((t) => t.includes("Copy")) && menu.items.some((t) => t.includes("Share"))
        && menu.items.some((t) => t.includes("Play")) && menu.items.some((t) => t.includes("Note")),
        JSON.stringify(menu.items));

  await page.click('#readQuickMenuSlot [data-qm-sub-toggle="copy"]');
  await page.waitForTimeout(120);
  const copySub = await page.evaluate(() => {
    const wrap = document.querySelector("#readQuickMenuSlot .ayah-quick-wrap");
    const sub = wrap.querySelector('.qm-sub[data-qm-sub="copy"]');
    return {
      open: sub.classList.contains("open"),
      notesDisabled: sub.querySelector('.qm-lang-copy[data-lang="notes"]')?.disabled,
      arChecked: sub.querySelector('.qm-lang-copy[data-lang="ar"]')?.checked,
    };
  });
  check("42c Copy expands to its own language checkboxes", copySub.open);
  check("42c ...Arabic/English/Bangla checked by default", copySub.arChecked === true);
  check("42c ...and \"My note\" is greyed out -- nothing saved for this ayah yet", copySub.notesDisabled === true);

  // Note & more -- opens the full-stage view, not a floating modal.
  await page.click("#readQuickMenuSlot [data-qm-note]");
  await page.waitForTimeout(250);
  const opened = await page.evaluate(() => ({
    noteShown: !document.getElementById("noteView").hidden,
    readHidden: document.getElementById("readView").hidden,
    wheelHidden: getComputedStyle(document.getElementById("wheelSection")).display === "none",
    dockVisible: getComputedStyle(document.getElementById("dock")).display !== "none",
    pressed: document.getElementById("tabReadBtn").getAttribute("aria-pressed"),
    ref: document.querySelector(".note-ref")?.textContent.trim(),
    arabic: document.querySelector(".note-arabic")?.textContent.trim().length > 0,
    english: document.querySelector(".note-english")?.textContent.trim().length > 0,
    bangla: document.querySelector(".note-bangla")?.textContent.trim().length > 0,
    bookmarkStar: document.querySelector("[data-note-bookmark]")?.textContent.trim(),
  }));
  check("42d Note & more opens a full-stage view, not a modal",
        opened.noteShown && opened.readHidden && opened.wheelHidden, JSON.stringify(opened));
  check("42d ...with the dock still reachable underneath", opened.dockVisible);
  check("42d ...and the Read tab still reads as pressed (this IS the reading experience)", opened.pressed === "true");
  check("42d Arabic, English and Bangla all render", opened.arabic && opened.english && opened.bangla, JSON.stringify(opened));
  check("42d not bookmarked yet", opened.bookmarkStar === "☆", opened.bookmarkStar);

  // Notes starts CLOSED now -- the Approach card moved in right after it, and
  // the owner asked for the same "closed until asked for" default the field
  // never had before. Opened explicitly here so the master-toggle and typing
  // checks below still exercise a visible editor, same as when Notes used to
  // open on its own.
  const notesStartsClosed = await page.evaluate(() => getComputedStyle(document.querySelector('[data-note-field="notes"] .note-field-body')).display === "none");
  check("42d Notes starts closed by default", notesStartsClosed);
  await page.click('[data-note-field="notes"] [data-note-field-toggle]');
  await page.waitForTimeout(100);

  // Master toggle collapses Arabic/English/Bangla together -- never Notes.
  await page.click("[data-note-master-toggle]");
  await page.waitForTimeout(100);
  const collapsed = await page.evaluate(() => ({
    fieldsHidden: getComputedStyle(document.querySelector("[data-note-collapsible]")).display === "none",
    notesStillThere: getComputedStyle(document.querySelector('[data-note-field="notes"] .note-field-body')).display !== "none",
  }));
  check("42e the master toggle collapses Arabic/English/Bangla together", collapsed.fieldsHidden);
  check("42e ...and Notes is untouched by it", collapsed.notesStillThere);
  await page.click("[data-note-master-toggle]");
  await page.waitForTimeout(100);

  // Round 32 -- Bookmark and Play moved up to bar 2, beside Copy/Share/Word
  // by word, and are always visible now (the old 🔖 reveal toggle, and the
  // note-actionsbar it revealed, are both retired outright).
  const barHasBookmarkPlay = await page.evaluate(() => {
    const bar2 = document.querySelector(".note-bar2");
    return {
      bookmarkVisible: getComputedStyle(bar2.querySelector("[data-note-bookmark]")).display !== "none",
      playVisible: getComputedStyle(bar2.querySelector("[data-note-play]")).display !== "none",
      noToggleLeft: !document.querySelector("[data-note-actions-toggle], [data-note-actionsbar]"),
    };
  });
  check("42f Bookmark and Play sit in bar 2, always visible -- no 🔖 reveal toggle any more",
        barHasBookmarkPlay.bookmarkVisible && barHasBookmarkPlay.playVisible && barHasBookmarkPlay.noToggleLeft,
        JSON.stringify(barHasBookmarkPlay));

  // Bookmark -- reuses the existing bookmarks collection (findSavedBookmark).
  // Enhancement round: creating one now opens the folder-picker popover
  // (item 1) rather than a native prompt() -- fill and save it here, same as
  // every other bookmark-creation call site in this suite.
  await page.click("[data-note-bookmark]");
  await fillBookmarkPopover(page, { name: "Test bookmark name" });
  await page.waitForTimeout(300);
  const afterBookmark = await page.evaluate(() => ({
    star: document.querySelector("[data-note-bookmark]")?.textContent.trim(),
    active: document.querySelector("[data-note-bookmark]")?.classList.contains("active"),
  }));
  check("42f bookmarking this ayah flips the star", afterBookmark.star === "★" && afterBookmark.active, JSON.stringify(afterBookmark));
  const bookmarkWrites = await page.evaluate(() => JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"));
  const bw = bookmarkWrites.find((w) => w.col === "bookmarks" && w.data.includes("saved"));
  check("42f ...and really writes to the existing bookmarks collection (no new mechanism)", Boolean(bw), JSON.stringify(bookmarkWrites));

  // Notes -- rich-text, saved on blur, through the new ayahNotes collection.
  await page.click("[data-note-editor]");
  await page.keyboard.type("Reflect on this daily.");
  await page.click(".note-ref"); // blur the editor by focusing elsewhere
  await page.waitForTimeout(400);
  const noteWrites = await page.evaluate(() => JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"));
  const nw = noteWrites.find((w) => w.col === "ayahNotes" && w.data.some((k) => k.startsWith("notes.")));
  check("42g typing a note and blurring saves it through ayahNotes", Boolean(nw), JSON.stringify(noteWrites));
  const status = await page.evaluate(() => document.querySelector("[data-note-save-status]")?.hidden);
  check("42g ...with no failure notice shown", status === true);

  // Leaving: no × button anywhere in the view -- the dock is the only way out.
  const hasCloseBtn = await page.evaluate(() => !!document.querySelector(".note-view [data-note-close], .note-view .modal-close, .note-view .close-btn"));
  check("42h there is no × / close button in the view", !hasCloseBtn);
  await page.click("#tabReadBtn"); // tapping the SAME tab is how you leave -- same idiom as every other dock tab
  await page.waitForTimeout(300);
  const closed = await page.evaluate(() => ({
    noteHidden: document.getElementById("noteView").hidden,
    readShown: !document.getElementById("readView").hidden,
  }));
  check("42h tapping the Read tab again leaves Note & more, back to reading", closed.noteHidden && closed.readShown, JSON.stringify(closed));

  // The badge itself now reflects the saved note.
  const badgeAfter = await page.evaluate(() => document.querySelector("#readQuickMenuSlot .ayah-quick-wrap .ayah-quick-btn")?.classList.contains("has-note"));
  check("42i the ⋮ badge now shows this ayah has a note", badgeAfter === true);

  check("42 no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

// --- 42j the ⋮ badge also rides along in the flow view (Range/Whole Surah) -
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(300);
  await openStudyOptions(page);
  await page.selectOption("#unitTypeSelect", "surah");
  await page.waitForTimeout(300);
  const flow = await page.evaluate(() => {
    const wraps = [...document.querySelectorAll("#pageViewContainer .page-flow-ayah .ayah-quick-wrap")];
    return { count: wraps.length, keys: wraps.slice(0, 3).map((w) => w.dataset.unitKey) };
  });
  check("42j Whole Surah's flow view carries one ⋮ badge per ayah", flow.count > 1, JSON.stringify(flow));
  check("42j ...each keyed to its own ayah", flow.keys.every((k, i) => k === `ayah:1:${i + 1}`), JSON.stringify(flow.keys));
  check("42j no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

// --- 42l round 30's fix (the badge sitting in its own header row, never
// overlaid on the text) still holds for the FLOW view; round 31 moved the
// single-āyah badge again, off the ayah entirely and onto #readBar (the
// owner's own question: "why should the three dot take space over the
// Ayah, when the Bar has empty spaces?") -- so there is no overlap
// question left to measure there at all; what matters is that it really
// left #ayahPanels rather than being duplicated. -------------------------
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(400);
  const single = await page.evaluate(() => ({
    onReadBar: !!document.querySelector("#readBar #readQuickMenuSlot .ayah-quick-wrap"),
    stillInAyahPanels: !!document.querySelector("#ayahPanels .ayah-quick-wrap"),
  }));
  check("42l the single-āyah ⋮ badge lives on #readBar now, not over the ayah",
        single.onReadBar, JSON.stringify(single));
  check("42l ...and it's gone from #ayahPanels entirely -- moved, not duplicated",
        !single.stillInAyahPanels, JSON.stringify(single));

  await openStudyOptions(page);
  await page.selectOption("#unitTypeSelect", "surah");
  await page.waitForTimeout(300);
  const flow = await page.evaluate(() => {
    const row = document.querySelector("#pageViewContainer .page-flow-ayah");
    const badge = row.querySelector(".ayah-quick-wrap").getBoundingClientRect();
    const arabic = row.querySelector(".ayah-arabic").getBoundingClientRect();
    return { badgeBottom: badge.bottom, arabicTop: arabic.top };
  });
  check("42l ...and in the flow view too (every ayah, not just the first)",
        flow.badgeBottom <= flow.arabicTop + 1, JSON.stringify(flow));
  check("42l no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

// --- 42m round 31: the Ayah bar (bar 1) is JUST the reference, Prev/Next,
// Aa, Collapse and Full screen now -- Copy/Share/Journey moved OUT to a
// permanent second bar (see 42p) so nothing competes with the reference
// for room. The reference itself still doesn't truncate (nowrap+ellipsis
// was round 30's own now-fixed defect) -- proven twice over: the computed
// style allows wrapping, AND the real text ("Quran 1:1 — Surah
// Al-Faatiha") is actually present start to finish, not just theoretically
// wrappable. Round 30 shipped the CSS fix while a separate bug
// (surahName() called with no englishName) left the surah name blank, so
// the property-only check passed while the owner could still see it cut
// off -- this is the rendered-text half that catches that class of bug
// again if it ever comes back. ---------------------------------------------
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(400);
  await page.click("#readQuickMenuSlot [data-qm-toggle]");
  await page.waitForTimeout(150);
  await page.click("#readQuickMenuSlot [data-qm-note]");
  await page.waitForTimeout(300);
  const bar = await page.evaluate(() => {
    const view = document.querySelector(".note-view");
    const bar1 = view.querySelector(".note-ayahbar");
    const ref = bar1.querySelector(".note-ref");
    const refCs = getComputedStyle(ref);
    return {
      bar1HasCopy: !!bar1.querySelector("[data-note-copy], [data-note-sub-toggle]"),
      bar1HasJourney: !!bar1.querySelector(".note-journey-btn"),
      hasPrev: !!bar1.querySelector("[data-note-prev]"),
      hasNext: !!bar1.querySelector("[data-note-next]"),
      hasCollapse: !!bar1.querySelector("[data-note-master-toggle]"),
      hasFullscreen: !!bar1.querySelector("[data-note-fullscreen]"),
      collapseIsIconOnly: bar1.querySelector("[data-note-master-toggle]").textContent.trim() === "▾",
      refWhiteSpace: refCs.whiteSpace,
      refTextOverflow: refCs.textOverflow,
      refText: ref.textContent.trim(),
    };
  });
  check("42m bar 1 no longer carries Copy/Share/Journey -- moved to bar 2",
        !bar.bar1HasCopy && !bar.bar1HasJourney, JSON.stringify(bar));
  check("42m ...just Prev, Next, Collapse and Full screen alongside the reference",
        bar.hasPrev && bar.hasNext && bar.hasCollapse && bar.hasFullscreen, JSON.stringify(bar));
  check("42m the Collapse button is icon-only, no label text", bar.collapseIsIconOnly, JSON.stringify(bar));
  check("42m the reference CAN wrap (no nowrap+ellipsis)",
        bar.refWhiteSpace !== "nowrap" && bar.refTextOverflow !== "ellipsis", JSON.stringify(bar));
  check("42m ...and the real text actually renders in full, surah name included",
        bar.refText === "Quran 1:1 — Surah Al-Faatiha", bar.refText);
  check("42m no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

// --- 42p round 31/32: bar 2 is a REAL second bar, permanent on every
// platform (not a mobile-only wrap fallback of bar 1, which was round
// 30's shape) -- Copy, Share, Bookmark, Play and Word by word all present
// on a phone AND a desktop, always as their own row below bar 1. Round 32
// added the Approach toggle: on a PC/tablet it (and Mapping My Journey)
// sit in bar 2 itself; on a phone the owner asked for them in a SEPARATE
// row instead, so bar 2 doesn't grow past one line -- verified by
// checking actual computed visibility, not just DOM presence (both
// desktop and mobile copies of Approach/Journey always exist in the
// markup; CSS is what decides which pair is actually on screen).
{
  async function barLayout(viewport) {
    const ctx = await ctxFor({ banner: false, viewport });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.click("#tabReadBtn");
    await page.waitForTimeout(400);
    await page.click("#readQuickMenuSlot [data-qm-toggle]");
    await page.waitForTimeout(150);
    await page.click("#readQuickMenuSlot [data-qm-note]");
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => {
      const visible = (el) => !!el && getComputedStyle(el).display !== "none";
      const view = document.querySelector(".note-view");
      const bar1 = view.querySelector(".note-ayahbar").getBoundingClientRect();
      const bar2El = view.querySelector(".note-bar2");
      const bar2 = bar2El.getBoundingClientRect();
      const mobileBarEl = view.querySelector(".note-approach-bar-mobile");
      return {
        bar2Below: bar2.top >= bar1.bottom - 1,
        hasCopyToggle: !!bar2El.querySelector('[data-note-sub-toggle="copy"]'),
        hasShareToggle: !!bar2El.querySelector('[data-note-sub-toggle="share"]'),
        hasBookmark: !!bar2El.querySelector("[data-note-bookmark]"),
        hasPlay: !!bar2El.querySelector("[data-note-play]"),
        hasWbwToggle: !!bar2El.querySelector("[data-note-wbw-toggle]"),
        approachVisibleInBar2: visible(bar2El.querySelector(".note-approach-desktop")),
        journeyVisibleInBar2: visible(bar2El.querySelector(".note-journey-desktop")),
        mobileBarVisible: visible(mobileBarEl),
        mobileBarHasApproach: !!mobileBarEl?.querySelector(".note-approach-mobile [data-note-approach-select]"),
        mobileBarHasJourney: !!mobileBarEl?.querySelector(".note-journey-mobile"),
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    await page.close();
    await ctx.close();
    return info;
  }
  const mobile = await barLayout({ width: 390, height: 844 });
  const desktop = await barLayout({ width: 1280, height: 900 });
  for (const [label, info] of [["phone", mobile], ["desktop", desktop]]) {
    check(`42p bar 2 sits below bar 1 as its own row on a ${label}`, info.bar2Below, JSON.stringify(info));
    check(`42p ...with Copy, Share, Bookmark, Play and Word by word all present on a ${label}`,
          info.hasCopyToggle && info.hasShareToggle && info.hasBookmark && info.hasPlay && info.hasWbwToggle, JSON.stringify(info));
    check(`42p ...and nothing overflows the ${label} viewport`, !info.overflowX);
  }
  check("42p on a desktop/tablet, Approach and Mapping My Journey sit IN bar 2, and the mobile-only bar stays hidden",
        desktop.approachVisibleInBar2 && desktop.journeyVisibleInBar2 && !desktop.mobileBarVisible, JSON.stringify(desktop));
  check("42p on a phone, bar 2's own Approach/Journey are hidden and a separate bar below carries both instead",
        !mobile.approachVisibleInBar2 && !mobile.journeyVisibleInBar2 && mobile.mobileBarVisible
        && mobile.mobileBarHasApproach && mobile.mobileBarHasJourney, JSON.stringify(mobile));
}

// --- 42q round 31: Copy and Share on bar 2 open the SAME language-checkbox
// picker the ⋮ quick menu already uses, rather than acting immediately on
// whatever was left ticked from before (the owner's own point: "why not
// the 'copy' icon... open a toggle that will show all the copy and share
// options to choose from?"). ------------------------------------------------
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(400);
  await page.click("#readQuickMenuSlot [data-qm-toggle]");
  await page.waitForTimeout(150);
  await page.click("#readQuickMenuSlot [data-qm-note]");
  await page.waitForTimeout(300);

  await page.click('.note-bar2 [data-note-sub-toggle="copy"]');
  await page.waitForTimeout(150);
  const copyPop = await page.evaluate(() => {
    const wrap = document.querySelector('[data-note-sub-wrap="copy"]');
    const pop = wrap.querySelector(".note-sub-popover");
    return {
      open: pop.classList.contains("open"),
      arChecked: pop.querySelector('input[data-lang="ar"]')?.checked,
      notesDisabled: pop.querySelector('input[data-lang="notes"]')?.disabled,
    };
  });
  check("42q Copy on bar 2 opens its own popover rather than copying immediately", copyPop.open, JSON.stringify(copyPop));
  check("42q ...with Arabic/English/Bangla checked and \"My note\" greyed out (none saved yet)",
        copyPop.arChecked === true && copyPop.notesDisabled === true, JSON.stringify(copyPop));

  // Clicking Go really runs the copy (flashes ✓/✗, same as the quick
  // menu's own Go button) and closes the popover behind it -- not asserting
  // the OS clipboard's own contents, which headless Chromium doesn't grant
  // read access to by default; the flash IS the outcome the reader sees.
  await page.click("[data-note-copy-go]");
  await page.waitForTimeout(150);
  const flashed = await page.evaluate(() => document.querySelector("[data-note-copy-go] .ayah-note-flash")?.textContent.trim());
  check("42q clicking Copy's Go button really runs it (flashes ✓ or ✗)",
        flashed === "✓ Copied" || flashed === "Copy failed", flashed);
  await page.waitForTimeout(700);
  const closedAfterCopy = await page.evaluate(() => !document.querySelector('[data-note-sub-wrap="copy"] .note-sub-popover').classList.contains("open"));
  check("42q ...and the popover closes itself afterwards", closedAfterCopy);

  // Share opens its OWN, separate popover -- ticking inside Copy's must
  // never leak into Share's.
  await page.click('.note-bar2 [data-note-sub-toggle="share"]');
  await page.waitForTimeout(150);
  const sharePop = await page.evaluate(() => {
    const wrap = document.querySelector('[data-note-sub-wrap="share"]');
    const pop = wrap.querySelector(".note-sub-popover");
    return { open: pop.classList.contains("open"), arChecked: pop.querySelector('input[data-lang="ar"]')?.checked };
  });
  check("42q Share opens its own popover, independent of Copy's own ticks",
        sharePop.open && sharePop.arChecked === true, JSON.stringify(sharePop));

  check("42q no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

// --- 42r round 31: Word by word, the new bar-2 tool -- "this Ayah screen
// would be the main study screen for a user, therefore we need to make
// tools available here" (the owner's own words). Reuses the same
// renderWordByWordPanel() the ordinary reading screen already calls. ------
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(400);
  await page.click("#readQuickMenuSlot [data-qm-toggle]");
  await page.waitForTimeout(150);
  await page.click("#readQuickMenuSlot [data-qm-note]");
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => ({
    fieldPresent: !!document.querySelector('[data-note-field="wbw"]'),
    pressed: document.querySelector("[data-note-wbw-toggle]").getAttribute("aria-pressed"),
  }));
  check("42r Word by word is off by default", !before.fieldPresent && before.pressed === "false", JSON.stringify(before));

  await page.click("[data-note-wbw-toggle]");
  await page.waitForTimeout(200);
  const on = await page.evaluate(() => {
    const field = document.querySelector('[data-note-field="wbw"]');
    return {
      present: !!field,
      hasWords: field ? field.querySelectorAll(".wbw-word").length > 0 : false,
      pressed: document.querySelector("[data-note-wbw-toggle]").getAttribute("aria-pressed"),
      active: document.querySelector("[data-note-wbw-toggle]").classList.contains("active"),
    };
  });
  check("42r ticking it renders real word-by-word content, not a placeholder",
        on.present && on.hasWords, JSON.stringify(on));
  check("42r ...and the toggle itself reads pressed", on.pressed === "true" && on.active);

  // Persists across Next -- a reading preference, not per-āyah state.
  await page.click("[data-note-next]");
  await page.waitForTimeout(200);
  const afterNext = await page.evaluate(() => !!document.querySelector('[data-note-field="wbw"]'));
  check("42r stays on after Next -- a session preference, not reset per āyah", afterNext);

  check("42r no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

// --- 42s round 32: the Approach toggle -- picking a different Approach in
// the Ayah Note screen changes currentTrackableId app-wide, so the canonical
// Study-options picker (#trackableSelect) agrees, the wheel re-renders, and
// -- the owner's own ask -- the Track/Guide/Breakdown/Coverage card further
// down this same screen updates to name the newly-picked Approach. Default
// viewport here is the phone size (390x844, ctxFor's own default), so this
// exercises the MOBILE copy of the toggle, in its own bar below bar 2. -----
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(400);
  await page.click("#readQuickMenuSlot [data-qm-toggle]");
  await page.waitForTimeout(150);
  await page.click("#readQuickMenuSlot [data-qm-note]");
  await page.waitForTimeout(300);

  const before = await page.evaluate(() => ({
    approachValue: document.querySelector(".note-approach-mobile [data-note-approach-select]")?.value,
    cardTitle: document.querySelector(".note-approach .way-embed-title")?.textContent.trim(),
    canonicalValue: document.getElementById("trackableSelect").value,
  }));
  check("42s starts on the same Approach the canonical picker already has, card named to match",
        before.approachValue === before.canonicalValue && before.cardTitle?.includes("Memorise"), JSON.stringify(before));

  await page.selectOption(".note-approach-mobile [data-note-approach-select]", "tafsir");
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => ({
    canonicalValue: document.getElementById("trackableSelect").value,
    cardTitle: document.querySelector(".note-approach .way-embed-title")?.textContent.trim(),
    desktopMirrorValue: document.querySelector(".note-approach-desktop [data-note-approach-select]")?.value,
  }));
  check("42s picking a different Approach here updates the canonical Study-options picker too",
        after.canonicalValue === "tafsir", JSON.stringify(after));
  check("42s ...and the Track/Guide/Breakdown/Coverage card below renames itself to the new Approach",
        after.cardTitle?.includes("Study tafsir"), JSON.stringify(after));
  check("42s ...and the OTHER (desktop) copy of the toggle stays in step with it",
        after.desktopMirrorValue === "tafsir", JSON.stringify(after));

  check("42s no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

// --- 42t enhancement round: the Root (Roots & derivatives) toggle -- always
// right after Word by word, on every platform (no phone/desktop split the
// way Approach/Journey get), off by default, opening real derivatives
// content below Word by word and closing again on a second click. ----------
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(400);
  await page.click("#readQuickMenuSlot [data-qm-toggle]");
  await page.waitForTimeout(150);
  await page.click("#readQuickMenuSlot [data-qm-note]");
  await page.waitForTimeout(300);

  const before = await page.evaluate(() => {
    const bar2 = document.querySelector(".note-bar2");
    const children = [...bar2.children];
    const wbwIdx = children.findIndex((c) => c.matches("[data-note-wbw-toggle]"));
    const rootsIdx = children.findIndex((c) => c.matches("[data-note-roots-toggle]"));
    const rootsBtn = document.querySelector("[data-note-roots-toggle]");
    return {
      fieldPresent: !!document.querySelector('[data-note-field="rootDerivatives"]'),
      pressed: rootsBtn.getAttribute("aria-pressed"),
      label: rootsBtn.textContent.trim(),
      rightAfterWbw: rootsIdx === wbwIdx + 1,
    };
  });
  check("42t Root is off by default, right after Word by word, labelled \"Root\"",
        !before.fieldPresent && before.pressed === "false" && before.label === "Root" && before.rightAfterWbw,
        JSON.stringify(before));

  // Turn Word by word on too, so "below Word by word" is a real ordering
  // check rather than a no-op against a field that isn't even rendered.
  await page.click("[data-note-wbw-toggle]");
  await page.waitForTimeout(150);
  await page.click("[data-note-roots-toggle]");
  await page.waitForTimeout(200);
  const on = await page.evaluate(() => {
    const wbwField = document.querySelector('[data-note-field="wbw"]');
    const rootsField = document.querySelector('[data-note-field="rootDerivatives"]');
    const collapsible = document.querySelector("[data-note-collapsible]");
    const children = [...collapsible.children];
    return {
      present: !!rootsField,
      hasContent: rootsField ? rootsField.textContent.trim().length > 0 : false,
      pressed: document.querySelector("[data-note-roots-toggle]").getAttribute("aria-pressed"),
      active: document.querySelector("[data-note-roots-toggle]").classList.contains("active"),
      belowWbw: wbwField && rootsField ? children.indexOf(rootsField) === children.indexOf(wbwField) + 1 : null,
    };
  });
  check("42t clicking it opens real derivatives content below Word by word",
        on.present && on.hasContent && on.belowWbw === true, JSON.stringify(on));
  check("42t ...and the toggle itself reads pressed", on.pressed === "true" && on.active);

  await page.click("[data-note-roots-toggle]");
  await page.waitForTimeout(200);
  const off = await page.evaluate(() => ({
    fieldPresent: !!document.querySelector('[data-note-field="rootDerivatives"]'),
    pressed: document.querySelector("[data-note-roots-toggle]").getAttribute("aria-pressed"),
  }));
  check("42t clicking it again closes the derivatives field", !off.fieldPresent && off.pressed === "false", JSON.stringify(off));

  check("42t no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

// --- 42o the Note view's own full screen: two states, and both bars
// (bar 1 and, since round 31, bar 2 -- it holds Copy/Share/WbW now, real
// edit/action tools, same reasoning as bar 1) stay on screen in both. ------
{
  const ctx = await ctxFor({ banner: true });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(400);
  await page.click("#readQuickMenuSlot [data-qm-toggle]");
  await page.waitForTimeout(150);
  await page.click("#readQuickMenuSlot [data-qm-note]");
  await page.waitForTimeout(300);

  const before = await page.evaluate(() => ({
    banner: getComputedStyle(document.querySelector("h1")).display,
    topNav: getComputedStyle(document.getElementById("topNav")).display,
    dock: getComputedStyle(document.getElementById("dock")).display,
    ayahbar: getComputedStyle(document.querySelector(".note-ayahbar")).display,
    bar2: getComputedStyle(document.querySelector(".note-bar2")).display,
  }));
  check("42o state one (default): banner, main menu, dock and both bars are all visible",
        before.banner !== "none" && before.topNav !== "none" && before.dock !== "none" && before.ayahbar !== "none" && before.bar2 !== "none",
        JSON.stringify(before));

  await page.click("[data-note-fullscreen]");
  await page.waitForTimeout(200);
  const full = await page.evaluate(() => ({
    banner: getComputedStyle(document.querySelector("h1")).display,
    topNav: getComputedStyle(document.getElementById("topNav")).display,
    dock: getComputedStyle(document.getElementById("dock")).display,
    ayahbar: getComputedStyle(document.querySelector(".note-ayahbar")).display,
    bar2: getComputedStyle(document.querySelector(".note-bar2")).display,
    pressed: document.querySelector("[data-note-fullscreen]").getAttribute("aria-pressed"),
  }));
  check("42o state two (full screen): banner, main menu and dock go",
        full.banner === "none" && full.topNav === "none" && full.dock === "none", JSON.stringify(full));
  check("42o ...but BOTH bars stay -- they hold the Notes edit/action controls", full.ayahbar !== "none" && full.bar2 !== "none", JSON.stringify(full));
  check("42o the toggle itself reads pressed", full.pressed === "true");

  await page.click("[data-note-fullscreen]");
  await page.waitForTimeout(200);
  const restored = await page.evaluate(() => ({
    banner: getComputedStyle(document.querySelector("h1")).display,
    dock: getComputedStyle(document.getElementById("dock")).display,
  }));
  check("42o tapping it again restores the banner and dock", restored.banner !== "none" && restored.dock !== "none", JSON.stringify(restored));

  // The dock itself is one of the three things full screen hides, so
  // leaving the note view WHILE full screen is on isn't reachable via the
  // dock at all -- same convention the reading screen's own full screen
  // already uses (its own BARE state hides the dock too, and getting back
  // to it means un-hiding first). Full screen is already off again at this
  // point (the restore click above), so what's worth proving is that
  // leaving normally and re-opening later never carries a stale full-
  // screen flag across -- each open starts in state one, per the owner's
  // own description of it.
  await page.click("#tabReadBtn");
  await page.waitForTimeout(300);
  await page.click("#readQuickMenuSlot [data-qm-toggle]");
  await page.waitForTimeout(150);
  await page.click("#readQuickMenuSlot [data-qm-note]");
  await page.waitForTimeout(300);
  const reopened = await page.evaluate(() => ({
    bodyClass: document.body.className,
    dock: getComputedStyle(document.getElementById("dock")).display,
    pressed: document.querySelector("[data-note-fullscreen]")?.getAttribute("aria-pressed"),
  }));
  check("42o re-opening the note view always starts in state one, never carrying a stale full-screen flag",
        !reopened.bodyClass.includes("note-immersive") && reopened.dock !== "none" && reopened.pressed === "false",
        JSON.stringify(reopened));

  check("42o no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

// --- 42k the whole panel really renders in Bangla, not just the coverage
// report -- the standing lesson this project keeps relearning: only a
// rendered page proves a screen is translated. ------------------------------
{
  const ctx = await ctxFor({ banner: false, appLang: "bn" });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(400);
  await page.click("#readQuickMenuSlot [data-qm-toggle]");
  await page.waitForTimeout(150);
  const menuBn = await page.evaluate(() => {
    const wrap = document.querySelector("#readQuickMenuSlot .ayah-quick-wrap");
    return {
      items: [...wrap.querySelectorAll(".qm-item")].map((b) => b.textContent.trim()),
      // Checkbox VALUES must stay plain "ar"/"en"/"bn"/"notes" -- they are
      // read back by unit-key-building code, never shown to a reader.
      langValues: [...wrap.querySelectorAll(".qm-lang-copy")].map((cb) => cb.dataset.lang),
    };
  });
  check("42k the quick menu's own items render in Bangla", menuBn.items.every((t) => BANGLA.test(t)), JSON.stringify(menuBn.items));
  check("42k ...while the checkbox values stay plain ids", JSON.stringify(menuBn.langValues) === JSON.stringify(["ar", "en", "bn", "notes"]));

  await page.click("#readQuickMenuSlot [data-qm-note]");
  await page.waitForTimeout(300);
  const noteBn = await page.evaluate(() => {
    const view = document.querySelector(".note-view");
    return {
      ayahbarRef: view.querySelector(".note-ref").textContent,
      journeyBtn: view.querySelector(".note-journey-btn").textContent,
      fieldLabels: [...view.querySelectorAll(".note-field-label")].map((s) => s.textContent.trim()),
      // Icon-only now (the owner's ask) -- the Bangla lives in the title,
      // not the button's own (single-glyph) text.
      masterToggleTitle: view.querySelector("[data-note-master-toggle]").title,
      fullscreenTitle: view.querySelector("[data-note-fullscreen]").title,
      headingOptions: [...view.querySelectorAll("[data-note-heading] option")].map((o) => ({ value: o.value, text: o.textContent.trim() })),
      // Round 31 -- bar 2's own titles. "WbW" itself stays Latin (same
      // convention as "Aa"), so only its title is asserted Bangla; the
      // Journey button's title is separate from its own visible text above.
      wbwToggleText: view.querySelector("[data-note-wbw-toggle]").textContent.trim(),
      wbwToggleTitle: view.querySelector("[data-note-wbw-toggle]").title,
      // Round 32 -- Bookmark and Play now live directly in bar 2 (no more
      // 🔖 reveal toggle), each with its own title.
      bookmarkTitle: view.querySelector("[data-note-bookmark]").title,
      playTitle: view.querySelector("[data-note-play]").title,
      approachTitle: view.querySelector("[data-note-approach-select]").title,
      // Enhancement round -- the Root toggle's own VISIBLE text is real
      // wording ("Root"), unlike "WbW"/"Aa", so it's asserted in Bangla too.
      rootsToggleText: view.querySelector("[data-note-roots-toggle]").textContent.trim(),
      rootsToggleTitle: view.querySelector("[data-note-roots-toggle]").title,
    };
  });
  check("42k Note & more's own ref and Journey placeholder are in Bangla",
        BANGLA.test(noteBn.ayahbarRef) && BANGLA.test(noteBn.journeyBtn), JSON.stringify(noteBn));
  check("42k ...every field label too (Arabic/English/Bangla/Notes)", noteBn.fieldLabels.every((t) => BANGLA.test(t)), JSON.stringify(noteBn.fieldLabels));
  check("42k ...and the icon-only buttons' own titles (Collapse, Full screen)",
        BANGLA.test(noteBn.masterToggleTitle) && BANGLA.test(noteBn.fullscreenTitle), JSON.stringify(noteBn));
  check("42k the heading-style dropdown reads in Bangla with plain option values",
        noteBn.headingOptions.every((o) => BANGLA.test(o.text)) && noteBn.headingOptions.map((o) => o.value).join() === "p,h1,h2,h3",
        JSON.stringify(noteBn.headingOptions));
  check("42k bar 2's Word by word toggle stays the Latin abbreviation \"WbW\" (like \"Aa\"), title in Bangla",
        noteBn.wbwToggleText === "WbW" && BANGLA.test(noteBn.wbwToggleTitle), JSON.stringify(noteBn));
  check("42k Bookmark and Play's own titles are in Bangla now that they sit in bar 2 (round 32)",
        BANGLA.test(noteBn.bookmarkTitle) && BANGLA.test(noteBn.playTitle), JSON.stringify(noteBn));
  check("42k the Approach toggle's own title (\"Choose an Approach\") is in Bangla",
        BANGLA.test(noteBn.approachTitle), JSON.stringify(noteBn));
  check("42k the Root toggle reads a real Bangla word (not left as \"Root\"), title in Bangla too",
        BANGLA.test(noteBn.rootsToggleText) && BANGLA.test(noteBn.rootsToggleTitle), JSON.stringify(noteBn));

  await page.click('.note-bar2 [data-note-sub-toggle="copy"]');
  await page.waitForTimeout(120);
  const copyPopBn = await page.evaluate(() => {
    const pop = document.querySelector('[data-note-sub-wrap="copy"] .note-sub-popover');
    return {
      labels: [...pop.querySelectorAll("label span")].map((s) => s.textContent.trim()),
      langValues: [...pop.querySelectorAll("input[type=checkbox]")].map((cb) => cb.dataset.lang),
      goText: pop.querySelector(".qm-go-btn").textContent.trim(),
    };
  });
  check("42k bar 2's Copy popover renders in Bangla too", copyPopBn.labels.every((t) => BANGLA.test(t)) && BANGLA.test(copyPopBn.goText), JSON.stringify(copyPopBn));
  check("42k ...while its checkbox values stay plain ids", JSON.stringify(copyPopBn.langValues) === JSON.stringify(["ar", "en", "bn", "notes"]));

  check("42k no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

console.log("\n=== 43. The wheel's one-time intro + in-hub Surah/Ayah pickers, and the Approach card moving into the Ayah screen ===");
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForSelector("#wheelContainer svg", { timeout: 10000 }).catch(() => {});

  const before = await page.evaluate(() => ({
    ctaVisible: getComputedStyle(document.getElementById("wheelCtaBtn")).display !== "none",
    hubHidden: getComputedStyle(document.getElementById("wheelHubPickers")).display === "none",
    veiled: document.getElementById("wheelStageWrap").classList.contains("wheel-veiled"),
    settledHidden: document.getElementById("wheelIntroSettled").hidden,
  }));
  check("43a the wheel starts covered by the intro button, hub pickers hidden, settled caption hidden",
        before.ctaVisible && before.hubHidden && before.veiled && before.settledHidden, JSON.stringify(before));

  await page.click("#wheelCtaBtn");
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => ({
    ctaHidden: getComputedStyle(document.getElementById("wheelCtaBtn")).display === "none",
    hubVisible: getComputedStyle(document.getElementById("wheelHubPickers")).display !== "none",
    veiled: document.getElementById("wheelStageWrap").classList.contains("wheel-veiled"),
    settledShown: !document.getElementById("wheelIntroSettled").hidden,
  }));
  check("43b tapping it hides the button, lifts the veil, and shows the settled caption -- one time, no way back",
        after.ctaHidden && after.hubVisible && !after.veiled && after.settledShown, JSON.stringify(after));

  // The hub pickers are MIRRORS (same shape as #readPickers, shell round
  // 22): changing one drives the canonical control, and the canonical
  // control changing keeps the hub in sync -- both directions, one source
  // of truth for what actually happens.
  await page.selectOption("#wheelHubAyahSelect", "5");
  await page.waitForTimeout(200);
  const ayahAfter = await page.evaluate(() => document.getElementById("ayahSelect").value);
  check("43c the hub Ayah picker really drives the canonical Ayah picker", ayahAfter === "5", ayahAfter);

  // #surahSelect lives inside the Study options panel, hidden until opened.
  await openStudyOptions(page);
  await page.selectOption("#surahSelect", "2");
  await page.waitForTimeout(300);
  const hubSurahAfter = await page.evaluate(() => document.getElementById("wheelHubSurahSelect").value);
  check("43d changing the canonical Surah picker keeps the hub mirror in sync", hubSurahAfter === "2", hubSurahAfter);
  await page.click("#tabStudyOptionsBtn"); // close the panel again -- same tap-to-close idiom every dock tab uses
  await page.waitForTimeout(150);
  // Changing surah can bring the Quran-entry splash back; openPage() only
  // clears it once, right after the initial load.
  await page.evaluate(() => { for (const el of document.querySelectorAll('[id*="splash"], .mm-splash-overlay')) el.remove(); });

  // Clicking a wheel slice: opens the Ayah Note screen (study first), not
  // the old floating pop-up -- with the Approach card (assessment) embedded
  // after Notes, and Notes itself still starting closed even reached this way.
  await page.click(".wheel-seg");
  await page.waitForTimeout(300);
  const clicked = await page.evaluate(() => {
    const body = document.querySelector(".note-body");
    const children = [...body.children];
    const notesIdx = children.findIndex((c) => c.dataset?.noteField === "notes");
    const approachIdx = children.findIndex((c) => c.classList?.contains("note-approach"));
    return {
      noteShown: !document.getElementById("noteView").hidden,
      modalOpen: document.getElementById("wayModalOverlay").classList.contains("open"),
      embedPresent: !!document.querySelector(".way-embed"),
      embedAfterNotes: notesIdx !== -1 && approachIdx !== -1 && approachIdx > notesIdx,
      notesClosed: getComputedStyle(document.querySelector('[data-note-field="notes"] .note-field-body')).display === "none",
      trackState: document.querySelector(".way-embed .way-track-state")?.textContent.trim(),
    };
  });
  check("43e clicking a wheel slice opens the Ayah Note screen, not the old floating pop-up",
        clicked.noteShown && !clicked.modalOpen, JSON.stringify(clicked));
  check("43f the Approach card (Track/Guide/Breakdown/Coverage) is embedded right after Notes -- study above, assessment below",
        clicked.embedPresent && clicked.embedAfterNotes, JSON.stringify(clicked));
  check("43g Notes still starts closed even when the screen is reached from a wheel slice", clicked.notesClosed);
  check("43h the embedded card shows the real claim state for this āyah/Approach", Boolean(clicked.trackState), clicked.trackState);

  check("43 no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

console.log("\n=== 43i-o. The hub's own content: Ta'awwudh/Bismillah (both permanent) on top, Surah, Ayah narrow at the very bottom ===");
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForSelector("#wheelContainer svg", { timeout: 10000 }).catch(() => {});
  await page.click("#wheelCtaBtn");
  await page.waitForTimeout(200);

  const order = await page.evaluate(() => {
    const rect = (id) => document.getElementById(id).getBoundingClientRect();
    return {
      taawwudhTop: rect("wheelHubTaawwudh").top, bismillahTop: rect("wheelHubBismillah").top,
      surahTop: rect("wheelHubSurahSelect").top, ayahTop: rect("wheelHubAyahSelect").top,
    };
  });
  check("43i Ta'awwudh sits above Bismillah", order.taawwudhTop < order.bismillahTop, JSON.stringify(order));
  check("43i ...which sits above Surah", order.bismillahTop < order.surahTop, JSON.stringify(order));
  check("43i ...which sits above Ayah, at the very bottom", order.surahTop < order.ayahTop, JSON.stringify(order));

  const surahW = await page.evaluate(() => document.getElementById("wheelHubSurahSelect").getBoundingClientRect().width);
  const ayahW = await page.evaluate(() => document.getElementById("wheelHubAyahSelect").getBoundingClientRect().width);
  check("43j Ayah is narrowed to three digits, nowhere near Surah's own width", ayahW < surahW * 0.4, `surah=${surahW} ayah=${ayahW}`);

  // Picking the widest real ayah number (Surah 2 has 286) must not clip --
  // the whole point of "three digits wide, not more than that."
  await page.selectOption("#wheelHubSurahSelect", "2");
  await page.waitForTimeout(250);
  await page.selectOption("#wheelHubAyahSelect", "286");
  await page.waitForTimeout(250);
  const wide = await page.evaluate(() => {
    const el = document.getElementById("wheelHubAyahSelect");
    return { value: el.value, clipped: el.scrollWidth > el.clientWidth + 1, canonical: document.getElementById("ayahSelect").value };
  });
  check("43j ...286 (the widest real ayah number) fits without clipping", wide.value === "286" && !wide.clipped, JSON.stringify(wide));
  check("43j ...and really drives the canonical Ayah picker too", wide.canonical === "286", wide.canonical);

  // Both Ta'awwudh and Bismillah are now PERMANENT -- "these two texts are to
  // be permanently placed there" -- no more conditional on available room.
  // Also: the wheel's own centre must no longer show the CHOSEN ayah's own
  // Arabic text at all (a stray fragment of it used to show through behind/
  // around the narrower hub overlay) -- picking 2:286, the longest ayah in
  // the whole Qur'an, is exactly the case that used to spill past the ring.
  const state = await page.evaluate(() => ({
    taawwudhShown: !document.getElementById("wheelHubTaawwudh").hidden,
    taawwudhText: document.getElementById("wheelHubTaawwudh").textContent,
    bismillahShown: !document.getElementById("wheelHubBismillah").hidden,
    bismillahText: document.getElementById("wheelHubBismillah").textContent,
    // .wheel-seg-num is the ring's own per-slice number labels (1, 2, 3…) --
    // real, unrelated text this check must not trip on; only the centre's
    // own text element(s) (centerArabic/centerRef) carry no class at all.
    centerTexts: [...document.querySelectorAll("#wheelContainer svg text:not(.wheel-seg-num)")].map((t) => t.textContent.trim()).filter(Boolean),
  }));
  check("43k Ta'awwudh is shown, even with the longest ayah in the Qur'an selected", state.taawwudhShown && state.taawwudhText.includes("أَعُوذُ"), JSON.stringify(state));
  check("43k ...and so is Bismillah, permanently, not conditionally", state.bismillahShown && state.bismillahText.includes("بِسْمِ"), JSON.stringify(state));
  check("43k the wheel's own centre draws no ayah text of its own any more", state.centerTexts.length === 0, JSON.stringify(state.centerTexts));

  // Nothing here -- select or Arabic line -- may spill past the wheel's own
  // hub circle onto a slice (Pythagoras against the wheel's OWN measured
  // hub radius, same geometry layoutWheelHub() itself solves), even with
  // both Arabic lines always in the stack now.
  const fit = await page.evaluate(() => {
    const svg = document.querySelector("#wheelContainer svg.mastery-wheel");
    const svgRect = svg.getBoundingClientRect();
    const size = svg.viewBox.baseVal.width;
    const hubRadius = svgRect.width * ((size / 2 - 4) / size) / 2;
    const cx = svgRect.left + svgRect.width / 2, cy = svgRect.top + svgRect.height / 2;
    const hub = document.getElementById("wheelHubPickers").getBoundingClientRect();
    const corners = [[hub.left, hub.top], [hub.right, hub.top], [hub.left, hub.bottom], [hub.right, hub.bottom]];
    const maxDist = Math.max(...corners.map(([x, y]) => Math.hypot(x - cx, y - cy)));
    return { maxDist, hubRadius, fits: maxDist <= hubRadius + 2 };
  });
  check("43l the hub's own content stays inside the wheel's hub circle, off the slices", fit.fits, JSON.stringify(fit));

  check("43i-l no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

console.log("\n=== 44. The Bookmark Manager (bookmarks.html) -- items 2/3/5 ===");
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/bookmarks.html");
  await page.waitForTimeout(600);

  const initial = await page.evaluate(() => ({
    appVisible: getComputedStyle(document.getElementById("app")).display !== "none",
    rowNames: [...document.querySelectorAll(".bm-row-name")].map((r) => r.textContent.trim()),
    hasOpenLink: !!document.querySelector('.bm-row[data-bm-id="bm1"] a[href*="bookmark=bm1"]'),
  }));
  check("44a the seeded bookmark renders on load, with a real Open link", initial.appVisible && initial.rowNames.includes("Ayat al-Kursi") && initial.hasOpenLink, JSON.stringify(initial));

  page.on("dialog", (d) => (d.type() === "prompt" ? d.accept("Tafsir notes") : d.accept()));
  await page.click("#newFolderBtn");
  await page.waitForTimeout(200);
  const afterFolder = await page.evaluate(() => [...document.querySelectorAll(".bm-folder-name")].map((f) => f.textContent.trim()));
  check("44b creating a folder (item 3, \"multilayered\") really adds it", afterFolder.includes("Tafsir notes"), JSON.stringify(afterFolder));

  // Move the seeded bookmark into the new folder (item 3: "moveable among layers").
  const folderOptVal = await page.evaluate(() => {
    const sel = document.querySelector('.bm-row[data-bm-id="bm1"] [data-bm-move]');
    return [...sel.options].find((o) => o.textContent.trim() === "Tafsir notes")?.value ?? null;
  });
  await page.selectOption('.bm-row[data-bm-id="bm1"] [data-bm-move]', folderOptVal);
  await page.waitForTimeout(200);
  const afterMove = await page.evaluate(() => ({
    insideFolder: !!document.querySelector(".bm-folder .bm-row[data-bm-id='bm1']"),
    stillInUnfiled: !!document.getElementById("unfiledContainer").querySelector('.bm-row[data-bm-id="bm1"]'),
  }));
  check("44c moving a bookmark into a folder relocates it there, out of Unfiled", afterMove.insideFolder && !afterMove.stillInUnfiled, JSON.stringify(afterMove));

  // Rename it (item 2: "enable editing it").
  await page.click('.bm-row[data-bm-id="bm1"] [data-bm-rename]');
  await page.waitForTimeout(200);
  const afterRename = await page.evaluate(() => document.querySelector('.bm-row[data-bm-id="bm1"] .bm-row-name')?.textContent.trim());
  check("44d renaming a bookmark really changes its name", afterRename === "Tafsir notes", afterRename);

  // Retire, then restore (I4 -- nothing destroyed).
  await page.click('.bm-row[data-bm-id="bm1"] [data-bm-toggle]');
  await page.waitForTimeout(200);
  const retired = await page.evaluate(() => document.querySelector('.bm-row[data-bm-id="bm1"]')?.classList.contains("retired"));
  check("44e retiring a bookmark greys it out rather than removing it from the list", retired === true);
  await page.click('.bm-row[data-bm-id="bm1"] [data-bm-toggle]');
  await page.waitForTimeout(200);
  const restored = await page.evaluate(() => document.querySelector('.bm-row[data-bm-id="bm1"]')?.classList.contains("retired"));
  check("44f ...and restoring it brings it back", restored === false);

  // A folder can be retired without losing what's inside it (I4) -- its
  // bookmarks fall back to Unfiled, grouped by module, rather than vanishing.
  const folderToggleSel = await page.evaluate(() => {
    const folderEl = [...document.querySelectorAll(".bm-folder")].find((f) => f.querySelector(".bm-folder-name")?.textContent.trim() === "Tafsir notes");
    return folderEl ? folderEl.dataset.folderId : null;
  });
  await page.click(`.bm-folder[data-folder-id="${folderToggleSel}"] [data-folder-toggle]`);
  await page.waitForTimeout(200);
  const afterFolderRetire = await page.evaluate((fid) => ({
    folderRetired: document.querySelector(`.bm-folder[data-folder-id="${fid}"]`)?.classList.contains("retired"),
    bookmarkFellBackToUnfiled: !!document.getElementById("unfiledContainer").querySelector('.bm-row[data-bm-id="bm1"]'),
  }), folderToggleSel);
  check("44g retiring a folder falls its bookmarks back to Unfiled rather than losing them",
        afterFolderRetire.folderRetired && afterFolderRetire.bookmarkFellBackToUnfiled, JSON.stringify(afterFolderRetire));

  check("44 no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();

  // Bangla, own context -- the standing lesson this project keeps
  // relearning: only a rendered page proves a screen is translated.
  const ctxBn = await ctxFor({ banner: false, appLang: "bn" });
  const { page: pageBn, errors: errorsBn } = await openPage(ctxBn, "/app/bookmarks.html");
  await pageBn.waitForTimeout(600);
  const bn = await pageBn.evaluate(() => ({
    h1: document.querySelector("h1")?.textContent.trim(),
    intro: document.querySelector(".intro")?.textContent.trim(),
    newFolderBtn: document.getElementById("newFolderBtn")?.textContent.trim(),
    openBtn: document.querySelector(".bm-row button")?.textContent.trim(),
    renameBtn: document.querySelector("[data-bm-rename]")?.textContent.trim(),
    retireBtn: document.querySelector("[data-bm-toggle]")?.textContent.trim(),
    rowModule: document.querySelector(".bm-row-module")?.textContent.trim(), // module NAMEs are proper nouns, not translated
  }));
  check("44h the whole page really renders in Bangla, not just the coverage report",
        [bn.h1, bn.intro, bn.newFolderBtn, bn.openBtn, bn.renameBtn, bn.retireBtn].every((s) => BANGLA.test(s || "")),
        JSON.stringify(bn));
  check("44h ...while a module's own name (a proper noun) stays as it is", bn.rowModule === "QuranRevival", bn.rowModule);
  check("44 no page errors in Bangla", errorsBn.length === 0, errorsBn.slice(0, 3).join(" | "));
  await pageBn.close();
  await ctxBn.close();
}

console.log("\n=== 45. Quran bookmarks -- naming prompt, full settings capture/restore (item 4), and the READ screen's own star (item 3) ===");
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(400);

  // The Read screen's own ⋮ menu now offers Bookmark too, not just the Note view.
  await page.click("#readQuickMenuSlot [data-qm-toggle]");
  await page.waitForTimeout(150);
  const readMenuItems = await page.evaluate(() => [...document.querySelectorAll("#readQuickMenuSlot .qm-item")].map((b) => b.textContent.trim()));
  check("45a the plain Read screen's own quick menu offers a Bookmark item", readMenuItems.some((t) => t.includes("Bookmark")), JSON.stringify(readMenuItems));

  // Cancelling the naming popover (item 1/2) makes no write and no bookmark.
  await page.click("#readQuickMenuSlot [data-qm-bookmark]");
  await cancelBookmarkPopover(page);
  await page.waitForTimeout(200);
  const afterCancel = await page.evaluate(() => document.querySelector("#readQuickMenuSlot .ayah-quick-btn")?.classList.contains("has-note"));
  check("45b cancelling the name prompt makes no bookmark", afterCancel !== true);

  // Now really bookmark it, naming it, with Tajweed and a non-default Approach on.
  await openStudyOptions(page);
  await page.selectOption("#trackableSelect", "tafsir");
  await page.waitForTimeout(150);
  await page.click("#tajweedToggle");
  await page.waitForTimeout(100);
  await page.click("#tabStudyOptionsBtn"); // close the panel again -- it overlaps #readQuickMenuSlot while open
  await page.waitForTimeout(150);
  await page.click("#readQuickMenuSlot [data-qm-toggle]");
  await page.waitForTimeout(150);
  await page.click("#readQuickMenuSlot [data-qm-bookmark]");
  await fillBookmarkPopover(page, { name: "My Fatiha bookmark" });
  await page.waitForTimeout(300);
  const writes = await page.evaluate(() => JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"));
  const saveWrite = writes.find((w) => w.col === "bookmarks" && w.data.includes("saved"));
  check("45c saving really writes to the bookmarks collection", Boolean(saveWrite), JSON.stringify(writes));

  check("45 no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

console.log("\n=== 46. Quran's own ?bookmark= deep link restores the full study state (item 4/6) ===");
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html?bookmark=bm1");
  await page.waitForTimeout(1200);
  const restored = await page.evaluate(() => ({
    noteVisible: document.getElementById("noteView")?.hidden === false,
    surah: document.getElementById("surahSelect")?.value,
    ayah: document.getElementById("ayahSelect")?.value,
    trackable: document.getElementById("trackableSelect")?.value,
    tajweed: document.getElementById("tajweedToggle")?.checked,
    noteRef: document.querySelector(".note-ref")?.textContent,
  }));
  check("46a a Quran bookmark's own surah/ayah are restored, landing on the Note view",
        restored.noteVisible && restored.surah === "2" && restored.ayah === "255" && restored.noteRef?.includes("2:255"),
        JSON.stringify(restored));
  check("46b ...the Approach it was claimed under is restored too", restored.trackable === "tafsir", restored.trackable);
  check("46c ...and a reading tick (Tajweed) that would otherwise reset comes back on", restored.tajweed === true, restored.tajweed);

  check("46 no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

console.log("\n=== 47. Every other module gets a real, named Bookmark star too (item 5) ===");
{
  // Deen Study (topic-study.js) -- a real leaf topic, "deen_ethics".
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/deen-study.html");
  await page.waitForTimeout(800);
  await page.click('[data-id="deen_ethics"]');
  await page.waitForTimeout(300);
  await page.click("#bookmarkTopicBtn");
  await fillBookmarkPopover(page, { name: "Ethics bookmark" });
  await page.waitForTimeout(300);
  const topicAfter = await page.evaluate(() => ({
    text: document.getElementById("bookmarkTopicBtn")?.textContent.trim(),
    active: document.getElementById("bookmarkTopicBtn")?.classList.contains("active"),
  }));
  check("47a Deen Study's own topic detail screen offers a real, named Bookmark star",
        topicAfter.text === "★" && topicAfter.active, JSON.stringify(topicAfter));
  const topicWrites = await page.evaluate(() => JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"));
  check("47a ...and really writes it, without re-fetching the whole detail view",
        topicWrites.some((w) => w.col === "bookmarks" && w.data.includes("saved")), JSON.stringify(topicWrites));
  // Toggling it off removes it again.
  await page.click("#bookmarkTopicBtn");
  await page.waitForTimeout(300);
  const topicOff = await page.evaluate(() => document.getElementById("bookmarkTopicBtn")?.textContent.trim());
  check("47a ...and clicking it again removes it", topicOff === "☆", topicOff);
  await page.close();
  await ctx.close();

  // Asma ul Husna -- the star, AND the pre-existing ?resume= gap this round closes.
  const ctx2 = await ctxFor({ banner: false });
  const { page: page2, errors: errors2 } = await openPage(ctx2, "/app/asma-study.html");
  await page2.waitForTimeout(800);
  await page2.click('.asma-card[data-number="1"]');
  await page2.waitForTimeout(300);
  await page2.click("#bookmarkAsmaBtn");
  await fillBookmarkPopover(page2, { name: "Al-Rahman bookmark" });
  await page2.waitForTimeout(300);
  const asmaAfter = await page2.evaluate(() => ({
    text: document.getElementById("bookmarkAsmaBtn")?.textContent.trim(),
    active: document.getElementById("bookmarkAsmaBtn")?.classList.contains("active"),
  }));
  check("47b Asma ul Husna's own detail screen offers a real, named Bookmark star too",
        asmaAfter.text === "★" && asmaAfter.active, JSON.stringify(asmaAfter));
  await page2.close();
  await ctx2.close();

  const ctx3 = await ctxFor({ banner: false });
  const { page: page3, errors: errors3 } = await openPage(ctx3, "/app/asma-study.html?resume=5");
  await page3.waitForTimeout(1000);
  const asmaResume = await page3.evaluate(() => ({
    detailVisible: !!document.querySelector(".asma-detail"),
    number: document.querySelector(".asma-detail-number")?.textContent.trim(),
  }));
  check("47c asma-study.html's own pre-existing ?resume= gap is closed -- it really jumps to that Name now",
        asmaResume.detailVisible && asmaResume.number === "5 of 99", JSON.stringify(asmaResume));
  check("47 no page errors", errors.length === 0 && errors2.length === 0 && errors3.length === 0,
        [...errors, ...errors2, ...errors3].slice(0, 3).join(" | "));
  await page3.close();
  await ctx3.close();
}

console.log("\n=== 48. Fixes round item 1 -- the bookmark popover's own folder picker ===");
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.click("#tabReadBtn");
  await page.waitForTimeout(400);

  // Bookmark #1: name it and create a brand-new folder in the same step.
  await page.click("#readQuickMenuSlot [data-qm-toggle]");
  await page.waitForTimeout(150);
  await page.click("#readQuickMenuSlot [data-qm-bookmark]");
  await fillBookmarkPopover(page, { name: "Ayah One", newFolderName: "Favourites" });
  await page.waitForTimeout(300);
  const writesAfterFirst = await page.evaluate(() => JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"));
  const bmWritesAfterFirst = writesAfterFirst.filter((w) => w.col === "bookmarks");
  check("48a naming with a brand-new folder issues a folder-create write AND a bookmark-save write",
        bmWritesAfterFirst.some((w) => w.data.includes("folders")) && bmWritesAfterFirst.some((w) => w.data.includes("saved")),
        JSON.stringify(bmWritesAfterFirst));

  // Move to a different āyah so bookmark #2 is genuinely new, not a toggle-off of #1.
  await page.selectOption("#readAyahSelect", "2");
  await page.waitForTimeout(200);
  await page.click("#readQuickMenuSlot [data-qm-toggle]");
  await page.waitForTimeout(150);
  await page.click("#readQuickMenuSlot [data-qm-bookmark]");
  await page.waitForSelector(".bm-popover-overlay");
  const folderOptions = await page.evaluate(() =>
    [...document.querySelectorAll("[data-bm-pop-folder] option")].map((o) => o.textContent.trim())
  );
  check("48b the folder just created is offered in the very next popover -- bookmarksDoc really updated in memory, no re-fetch needed",
        folderOptions.includes("Favourites"), JSON.stringify(folderOptions));

  await fillBookmarkPopover(page, { name: "Ayah Two", folderName: "Favourites" });
  await page.waitForTimeout(300);
  const writesAfterSecond = await page.evaluate(() => JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"));
  const newBmWrites = writesAfterSecond.filter((w) => w.col === "bookmarks").slice(bmWritesAfterFirst.length);
  check("48c picking an EXISTING folder files it there directly, with no extra folder-create write",
        newBmWrites.length === 1 && newBmWrites[0].data.includes("saved") && !newBmWrites[0].data.includes("folders"),
        JSON.stringify(newBmWrites));

  // Cancelling still makes no write at all -- the popover's own escape hatch, unchanged by adding the folder picker.
  await page.selectOption("#readAyahSelect", "3");
  await page.waitForTimeout(200);
  const writesBeforeCancel = (await page.evaluate(() => JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"))).filter((w) => w.col === "bookmarks").length;
  await page.click("#readQuickMenuSlot [data-qm-toggle]");
  await page.waitForTimeout(150);
  await page.click("#readQuickMenuSlot [data-qm-bookmark]");
  await cancelBookmarkPopover(page);
  await page.waitForTimeout(200);
  const writesAfterCancel = (await page.evaluate(() => JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"))).filter((w) => w.col === "bookmarks").length;
  check("48d cancelling makes no write at all, folder picker or not", writesAfterCancel === writesBeforeCancel);

  check("48 no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

console.log("\n=== 49. Fixes round items 2/3 -- the nav bar's own live Bookmark dropdown ===");
{
  const ctx = await ctxFor({ banner: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(600);

  // Opening the category is what fetches (I9) -- before that, the skeleton
  // says "Loading…" and nothing else.
  const beforeOpen = await page.evaluate(() => document.getElementById("navBookmarkList")?.textContent.trim());
  check("49a before opening, the skeleton shows only its own placeholder", beforeOpen === "Loading…", beforeOpen);

  await page.click(".nav-cat-bookmark summary");
  await page.waitForFunction(() => document.getElementById("navBookmarkList")?.textContent.trim() !== "Loading…");
  const unfiledState = await page.evaluate(() => {
    const list = document.getElementById("navBookmarkList");
    return {
      hasDirectLink: [...list.querySelectorAll(".nav-bm-link")].some((a) => a.textContent.trim() === "Ayat al-Kursi"),
      insideAFold: !!list.querySelector(".nav-bm-folder a"),
      href: [...list.querySelectorAll(".nav-bm-link")].find((a) => a.textContent.trim() === "Ayat al-Kursi")?.getAttribute("href"),
    };
  });
  check("49b the seeded (unfiled) bookmark is a direct, clickable link -- one click away, no fold to open first",
        unfiledState.hasDirectLink && !unfiledState.insideAFold, JSON.stringify(unfiledState));
  check("49c ...and its href jumps straight to it (item 6, same mechanism as the Manager page)",
        unfiledState.href?.includes("bookmark=bm1"), unfiledState.href);

  // Close the dropdown again -- it's an absolutely-positioned overlay and
  // would otherwise intercept the read-screen clicks below.
  await page.click(".nav-cat-bookmark summary");
  await page.waitForTimeout(150);

  // Create a second bookmark, filed into a brand-new folder, via the popover
  // (item 1). The folder must show up in the SAME dropdown collapsed by
  // default (item 3), with its own bookmark reachable only once expanded.
  await page.click("#tabReadBtn");
  await page.waitForTimeout(400);
  await page.click("#readQuickMenuSlot [data-qm-toggle]");
  await page.waitForTimeout(150);
  await page.click("#readQuickMenuSlot [data-qm-bookmark]");
  await fillBookmarkPopover(page, { name: "Fatiha in a folder", newFolderName: "Favourites" });
  await page.waitForTimeout(300);

  // Re-opening the category re-fetches -- force it closed, then open it
  // again, whatever state it happened to be left in by the actions above.
  // The list's own content already reads "Ayat al-Kursi" (not "Loading…")
  // from the last time it was open, so simply waiting for "not Loading…"
  // here would resolve instantly against that stale leftover rather than
  // the fresh render. Reset it to the sentinel "Loading…" text itself right
  // before reopening -- the real load() briefly sets that same text too, so
  // there is no transient window to race against; the wait can only resolve
  // once the genuinely fresh render lands.
  const stillOpen = await page.evaluate(() => document.querySelector(".nav-cat-bookmark")?.open);
  if (stillOpen) {
    await page.click(".nav-cat-bookmark summary");
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => { document.getElementById("navBookmarkList").textContent = "Loading…"; });
  await page.click(".nav-cat-bookmark summary");
  await page.waitForFunction(() => document.getElementById("navBookmarkList")?.textContent.trim() !== "Loading…");
  const folderState = await page.evaluate(() => {
    const list = document.getElementById("navBookmarkList");
    const folder = [...list.querySelectorAll(".nav-bm-folder")].find((f) => f.querySelector("summary")?.textContent.includes("Favourites"));
    return {
      folderPresent: !!folder,
      startsCollapsed: folder ? !folder.open : null,
    };
  });
  check("49d the just-created folder shows up on the very next open -- real re-fetch, not a stale cache",
        folderState.folderPresent, JSON.stringify(folderState));
  check("49e ...collapsed by default (item 3)", folderState.startsCollapsed === true, JSON.stringify(folderState));

  await page.click(".nav-bm-folder summary");
  await page.waitForTimeout(100);
  const afterExpand = await page.evaluate(() => {
    const list = document.getElementById("navBookmarkList");
    const folder = [...list.querySelectorAll(".nav-bm-folder")].find((f) => f.querySelector("summary")?.textContent.includes("Favourites"));
    return {
      open: folder?.open,
      linkText: folder?.querySelector(".nav-bm-link")?.textContent.trim(),
    };
  });
  check("49f ...one click away from opening it (item 3)", afterExpand.open === true && afterExpand.linkText === "Fatiha in a folder", JSON.stringify(afterExpand));

  check("49 no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
  await ctx.close();
}

await browser.close();
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail === 0 ? 0 : 1);
