// Full app translation, phase 1 (the shell) — behaviour suite.
import { chromium, newContext, openPage } from "./harness.mjs";

// Chromium: use whatever this machine has. CHROMIUM_PATH overrides;
// otherwise Playwright finds its own download, which is the normal case.
const EXE = process.env.CHROMIUM_PATH || undefined;
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const BANGLA = /[ঀ-৿]/;

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
        clone.querySelectorAll("#navAppLangSelect, #translationLangSelect, #wbwLangSelect, script, style").forEach((el) => el.remove());
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
        clone.querySelectorAll("#navAppLangSelect, #translationLangSelect, #wbwLangSelect, script, style").forEach((el) => el.remove());
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

  // The wheel's centre disc.
  const centre = await page.evaluate(() => document.querySelector("#wheelContainer svg")?.textContent ?? "");
  check("8c wheel centre is Bangla with Bengali digits", BANGLA.test(centre) && /[০-৯]/.test(centre), centre.slice(0, 40));

  // The Study options panel and its three bars.
  await openStudyOptions(page);
  const panel = await page.evaluate(() => ({
    tabs: [...document.querySelectorAll(".qr-tab")].map((b) => b.textContent.trim()),
    labels: [...document.querySelectorAll("#panelStudyOptions .opt-cell label")].map((l) => l.textContent.trim()),
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

  // Reading view + Listening cards.
  await page.click("#readingViewBtn");
  await page.waitForTimeout(150);
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
    centre: document.querySelector("#wheelContainer svg")?.textContent ?? "",
  }));
  check("9 surah picker still English with Western digits", r.firstSurah?.startsWith("1.") && !BANGLA.test(r.firstSurah), r.firstSurah);
  check("9 position readout still English", /Surah/.test(r.position || ""), r.position);
  check("9 wheel centre still English", /SURAH/i.test(r.centre), r.centre.slice(0, 40));
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
  await openHome(page);
  await page.evaluate(() => document.querySelectorAll(".nav-cat").forEach((d) => (d.open = true)));
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

  // Opening Listening settings is the earliest gesture that always precedes
  // a Play tap -- if this does not warm it, playback can be blocked later.
  await page.click("#tabStudyOptionsBtn");
  await page.waitForTimeout(200);
  await page.click("#listeningBtn");
  await page.waitForTimeout(700);
  check("26b opening Listening settings warms it", timingRequests.length >= 1,
        `${timingRequests.length} request(s) after opening the card`);
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
  check("27b bar 2 is Study Unit + Surah + Ayah",
        JSON.stringify(bars[1]) === '["unitTypeSelect","surahSelect","ayahSelect","rangeFromSelect","rangeToSelect"]', JSON.stringify(bars[1]));
  check("27b bar 3 is one Search field and one Search button", JSON.stringify(bars[2]) === '["jumpInput","searchBtn"]', JSON.stringify(bars[2]));
  check("27b bar 4 is Approach + Track", JSON.stringify(bars[3]) === '["trackableSelect","trackUnitBtn"]', JSON.stringify(bars[3]));
  check("27b bar 5 is Reading view + Listening settings", JSON.stringify(bars[4]) === '["readingViewBtn","listeningBtn"]', JSON.stringify(bars[4]));

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

await browser.close();
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail === 0 ? 0 : 1);
