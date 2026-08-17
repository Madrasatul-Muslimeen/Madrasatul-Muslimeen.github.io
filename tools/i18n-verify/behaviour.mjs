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

  // The wheel's centre disc.
  const centre = await page.evaluate(() => document.querySelector("#wheelContainer svg")?.textContent ?? "");
  check("8c wheel centre is Bangla with Bengali digits", BANGLA.test(centre) && /[০-৯]/.test(centre), centre.slice(0, 40));

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
    ref: document.getElementById("readRef").textContent.trim(),
    ayahs: document.querySelectorAll("#ayahPanels .ayah-arabic").length,
    navVisible: getComputedStyle(document.getElementById("singleAyahNavRow")).display !== "none",
    dockVisible: getComputedStyle(document.getElementById("dock")).display !== "none",
  }));
  check("29b tapping Read shows the reading", reading.readShown && reading.pressed === "true");
  // The wheel carries display:flex from .wheel-box, so `hidden` alone does not
  // hide it -- this is the check that caught it before it shipped.
  check("29b ...and the wheel really goes (computed display, not just [hidden])", reading.wheelHidden);
  check("29b the ayah text is on the stage", reading.ayahs > 0);
  check("29b Previous/Next came with it", reading.navVisible);
  check("29b the reading names what is being read", /Surah/.test(reading.ref), reading.ref);
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

  // Full screen, and the tap that brings the menus back.
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

  await page.click("#ayahPanels", { position: { x: 5, y: 5 } });
  await page.waitForTimeout(300);
  const restored = await page.evaluate(() => getComputedStyle(document.getElementById("dock")).display !== "none");
  check("29d a tap on the text brings the menus back", restored);

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

  // Back out of Full screen the only way there is -- a tap on the text. The
  // dock is genuinely gone until then, which is why this line is not optional.
  await page.click("#ayahPanels", { position: { x: 5, y: 5 } });
  await page.waitForTimeout(300);

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
    ref: document.getElementById("readRef").textContent.trim(),
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
  const bn = await page.evaluate(() => ({
    back: document.getElementById("backToWheelBtn").textContent.trim(),
    full: document.getElementById("hideChromeBtn").textContent.trim(),
    ref: document.getElementById("readRef").textContent.trim(),
  }));
  check("29h the way back to the wheel is Bangla", BANGLA.test(bn.back), bn.back);
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
  const transport = await page.evaluate(() => ({
    visible: !document.getElementById("readTransport").hidden,
    buttons: [...document.querySelectorAll("#readTransport button")].map((b) => b.id),
    pauseDisabled: document.getElementById("readPauseBtn").disabled,
    reciter: document.getElementById("readReciterName").textContent.trim(),
  }));
  check("30j play, pause, stop and whole-surah are on the reading screen",
        transport.visible && JSON.stringify(transport.buttons) === '["readPlayBtn","readPauseBtn","readStopBtn","readPlaySurahBtn"]', JSON.stringify(transport));
  check("30j Pause is disabled while nothing is playing", transport.pauseDisabled);
  check("30j the reading names the reciter it would use", transport.reciter.length > 0, transport.reciter);

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
  check("30l every Reading view tick is Bangla", bn.ticks.length === 5 && bn.ticks.every((x) => BANGLA.test(x)), JSON.stringify(bn.ticks));
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  const t18 = await page.evaluate(() => [...document.querySelectorAll("#readTransport button")].map((b) => b.textContent.trim()));
  check("30l the transport buttons are Bangla", t18.length === 4 && t18.every((x) => BANGLA.test(x)), JSON.stringify(t18));
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
    check("31b ...and every reading choice stays live", live.ticks === 5, String(live.ticks));
    check("31b the Qur'an text is on screen whatever the Approach declares", live.arabic > 0, String(live.arabic));
  }

  // Mushaf: a tick like the others, available on a SINGLE ayah, and the one
  // choice that cannot share the screen -- so it greys the rest rather than
  // hiding them.
  await page.check("#mushafToggle");
  await page.waitForTimeout(1500);
  const mushaf = await page.evaluate(() => ({
    othersDisabled: [...document.querySelectorAll(".reading-ticks input")].filter((i) => i.id !== "mushafToggle").every((i) => i.disabled),
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

await browser.close();
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail === 0 ? 0 : 1);
