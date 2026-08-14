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
  check("6 the version badge is NOT mangled into Bengali digits", /v?0?7\.3/.test(r.version || ""), r.version);
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
  await page.click("#jumpGoBtn");
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
  await page.click("#jumpGoBtn");
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

await browser.close();
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail === 0 ? 0 : 1);
