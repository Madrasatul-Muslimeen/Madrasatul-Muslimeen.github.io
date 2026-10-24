// Keys to Understanding, Round 1 -- "Related hadith" on the Āyah card and "Āyāt this hadith quotes" in the Hadith
// module, in a real browser, against the REAL index (tools/hadith-data-pull/output/ayah-hadith/).
//   - 36:38 lists Bukhari 4802 and 3199 and Muslim 159; 36:12 lists Tirmidhi 3226;
//   - an āyah with no hit says so in words (never blank);
//   - the surah's index file is NOT fetched at startup, and IS fetched once the card opens (positive control);
//   - tapping a hadith opens it in the Hadith library with "← Back to the āyah"; Back returns to the same āyah with
//     the card open;
//   - from a hadith, "Āyāt this hadith quotes" opens the Read view at the āyah with "← Back to the hadith";
//   - rows are >= 40px, no sideways scroll at 320 / 390 / 768 / 1280, English and Bangla.
// Run from the repository root with serve.js on :8080.
import { chromium, newContext, openPage, BASE } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

async function openStudy(page, which) {
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
  const reachable = await page.evaluate((id) => (document.getElementById(id)?.getBoundingClientRect().width ?? 0) > 0, which);
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click(`#${which}`);
  await page.waitForTimeout(700);
}
async function goToAyah(page, surah, ayah) {
  await page.evaluate((s) => { const el = document.getElementById("surahSelect"); el.value = String(s); el.dispatchEvent(new Event("change", { bubbles: true })); }, surah);
  await page.waitForTimeout(1500);
  await page.evaluate((a) => {
    const u = document.getElementById("unitTypeSelect"); u.value = "ayah"; u.dispatchEvent(new Event("change", { bubbles: true }));
    const el = document.getElementById("ayahSelect"); el.value = String(a); el.dispatchEvent(new Event("change", { bubbles: true }));
  }, ayah);
  await page.waitForTimeout(900);
}
const hadithRows = (page) => page.evaluate(() => [...document.querySelectorAll("[data-ayah-hadith-open]")].map((b) => ({
  text: b.textContent.replace(/\s+/g, " ").trim(), h: b.getBoundingClientRect().height,
})));
const waitForHadith = (page) => page.waitForFunction(
  () => document.querySelector("[data-ayah-hadith-open]") || document.querySelector("[data-ayah-hadith-none]"), null, { timeout: 10000 }).catch(() => {});

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// ---- the Āyah card, 36:38 / 36:12 / an āyah with no hit, at four widths, both languages --------------------
for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 900 }, { width: 1280, height: 800 }]) {
  for (const lang of ["en", "bn"]) {
    const label = `${lang} ${viewport.width}px`;
    const ctx = await newContext(browser, { appLang: lang, viewport });
    const fetched = [];
    ctx.on("request", (r) => { if (/ayah-hadith\/\d+\.json/.test(r.url())) fetched.push(r.url()); });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await openStudy(page, "tabReadBtn");
    await goToAyah(page, 36, 38);
    check(`${label} I9: the index file is not fetched before the card opens`, fetched.length === 0, fetched.join(" "));

    // A real tap first. At 320x640 (with the default banner) Playwright finds #readScroll / #studyScreen / #singleAyahNavRow on top
    // of the badge and the click never lands (a 30 s run-killing timeout); that is ONE red check here, and the card is then opened
    // by the badge's own click() so the hadith checks below still run. See docs/reports/2026-10-24-audit-part81-ayah-card-sweep.md.
    const tapped = await page.click('#readView [data-ayah-num-badge="36:38"]', { timeout: 4000 }).then(() => true, () => false);
    if (!tapped) await page.evaluate(() => document.querySelector('#readView [data-ayah-num-badge="36:38"]')?.click());
    check(`${label} a real tap on the 36:38 number badge reaches it (nothing sits on top)`, tapped, "Playwright's click was intercepted");
    await waitForHadith(page);
    check(`${label} positive control: the surah's index file is fetched once the card opens`, fetched.some((u) => /\/36\.json/.test(u)), fetched.join(" "));
    const heading = await page.evaluate(() => document.querySelector("[data-ayah-sheet-hadith] .ayah-status-heading")?.textContent);
    check(`${label} the section is headed "${lang === "bn" ? "সম্পর্কিত হাদিস" : "Related hadith"}"`, heading === (lang === "bn" ? "সম্পর্কিত হাদিস" : "Related hadith"), heading);
    const rows = await hadithRows(page);
    if (lang === "en") {
      const all = rows.map((r) => r.text).join(" | ");
      check(`${label} 36:38 lists Bukhari 3199`, /Bukhari 3199/.test(all), all);
      check(`${label} 36:38 lists Bukhari 4802`, /Bukhari 4802/.test(all), all);
      check(`${label} 36:38 lists Muslim 159`, /Muslim 159\b/.test(all), all);
      check(`${label} every row says "quotes this āyah"`, rows.length > 0 && rows.every((r) => /quotes this āyah/.test(r.text)), all);
      check(`${label} a row shows the first line of the Arabic`, rows.some((r) => /[؀-ۿ]{3,}/.test(r.text)), all);
    } else {
      check(`${label} the rows say "এই আয়াত উদ্ধৃত করেছে"`, rows.length > 0 && rows.every((r) => /এই আয়াত উদ্ধৃত করেছে/.test(r.text)), rows[0]?.text);
    }
    check(`${label} every row is a real tap target (>= 40px)`, rows.length > 0 && Math.min(...rows.map((r) => r.h)) >= 40, String(Math.min(...rows.map((r) => r.h))));
    // PCA, QR J02 S1c: the related hadith are OpenITI text, and its CC BY-NC-SA 4.0 licence requires the credit where it shows.
    const credit = await page.evaluate(() => { const e = document.querySelector("[data-ayah-sheet-hadith] [data-ayah-hadith-credit]"); return e ? { text: e.textContent, shown: e.offsetParent !== null } : null; });
    const creditText = lang === "bn" ? "সূত্র: OpenITI (CC BY-NC-SA 4.0)" : "Source: OpenITI (CC BY-NC-SA 4.0)";
    check(`${label} under the list: "${creditText}"`, !!credit && credit.shown && credit.text === creditText, JSON.stringify(credit));
    const sw = await page.evaluate(() => {
      const sheet = document.querySelector("[data-ayah-sheet]");
      const cut = [...document.querySelectorAll("[data-ayah-sheet-hadith] button")].filter((b) => b.scrollWidth > b.clientWidth + 1).length;
      return { page: document.documentElement.scrollWidth - innerWidth, sheet: sheet ? sheet.scrollWidth - sheet.clientWidth : 0, cut };
    });
    check(`${label} no sideways scroll and nothing cut in the section`, sw.page <= 1 && sw.sheet <= 1 && sw.cut === 0, JSON.stringify(sw));
    if (lang === "en" && (viewport.width === 390 || viewport.width === 1280)) {
      await page.screenshot({ path: `/tmp/ayah-related-hadith-${viewport.width}.png` });
    }

    if (lang === "en" && viewport.width === 390) {
      // 36:12 -> Tirmidhi 3226
      await page.evaluate(() => document.getElementById("ayahActionSheetOverlay")?.classList.remove("open"));
      await goToAyah(page, 36, 12);
      await page.click('#readView [data-ayah-num-badge="36:12"]');
      await waitForHadith(page);
      const r12 = (await hadithRows(page)).map((r) => r.text).join(" | ");
      check(`${label} 36:12 lists Tirmidhi 3226`, /Tirmidhi 3226/.test(r12), r12);
      // an āyah with no hit: 1:1 has no hadith quoting it word for word in the index
      await page.evaluate(() => document.getElementById("ayahActionSheetOverlay")?.classList.remove("open"));
      await goToAyah(page, 108, 3);
      await page.click('#readView [data-ayah-num-badge="108:3"]');
      await waitForHadith(page);
      const none = await page.evaluate(() => document.querySelector("[data-ayah-hadith-none]")?.textContent ?? "");
      check(`${label} an āyah with no hit says so in words`, none === "No hadith in our books quotes this āyah word for word.", none);
    }
    check(`${label} no page errors`, errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, errors.join(" | "));
    await ctx.close();
  }
}

// ---- the way back: āyah card -> hadith -> Back, and hadith -> āyah -> Back ---------------------------------
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openStudy(page, "tabReadBtn");
  await goToAyah(page, 36, 38);
  await page.click('#readView [data-ayah-num-badge="36:38"]');
  await waitForHadith(page);
  const mus = page.locator("[data-ayah-hadith-open]", { hasText: "Muslim 159" }).first();
  await mus.click();
  await page.waitForURL(/hadith-collections\.html/, { timeout: 10000 }).catch(() => {});
  await page.waitForSelector("#hadithBackBtn:not([hidden])", { timeout: 10000 }).catch(() => {});
  const backText = await page.evaluate(() => document.getElementById("hadithBackBtn")?.textContent ?? "");
  check("opening a hadith from the card shows ← Back to the āyah", backText === "← Back to the āyah", backText);
  await page.waitForSelector('[data-openiti-passage="611"]', { timeout: 15000 }).catch(() => {});
  check("the library opened exactly that narration (passage 611)", await page.evaluate(() => !!document.querySelector('[data-openiti-passage="611"]')));
  // From the hadith: "Āyāt this hadith quotes" lists 36:38
  await page.waitForSelector('[data-openiti-passage="611"] [data-ayat-quoted-link="36:38"]', { timeout: 10000 }).catch(() => {});
  const link = await page.evaluate(() => {
    const a = document.querySelector('[data-openiti-passage="611"] [data-ayat-quoted-link="36:38"]');
    return a ? { text: a.textContent, h: a.getBoundingClientRect().height, head: a.closest(".hadith-ayat-quoted")?.querySelector(".hadith-ayat-quoted-head")?.textContent } : null;
  });
  check("the hadith lists 36:38 under \"Āyāt this hadith quotes\"", link?.text === "36:38" && link.head === "Āyāt this hadith quotes", JSON.stringify(link));
  check("the āyah link is a >= 40px target", (link?.h ?? 0) >= 40, String(link?.h));
  await page.click("#hadithBackBtn");
  await page.waitForURL(/quranrevival\.html/, { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 15000 }).catch(() => {});
  const back = await page.evaluate(() => ({
    open: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"),
    ref: document.querySelector("[data-ayah-sheet]")?.textContent.includes("36:38") ?? false,
    surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value,
    stale: location.search.includes("ayahCard"),
  }));
  check("Back returns to 36:38 with the Āyah card open", back.open && back.ref && back.surah === "36" && back.ayah === "38", JSON.stringify(back));
  check("the one-shot ?ayahCard= is cleared from the address", !back.stale);
  await ctx.close();

  const ctx2 = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const { page: p2 } = await openPage(ctx2, "/app/quranrevival.html");
  await p2.goto(BASE + "/app/hadith-collections.html?openiti=0261Muslim.Sahih.Shamela0001727-ara1&passage=611&back=1", { waitUntil: "domcontentloaded" });
  await p2.waitForSelector('[data-ayat-quoted-link="36:38"]', { timeout: 20000 }).catch(() => {});
  await p2.click('[data-ayat-quoted-link="36:38"]');
  await p2.waitForURL(/quranrevival\.html/, { timeout: 10000 }).catch(() => {});
  await p2.waitForFunction(() => document.getElementById("ayahSelect")?.value === "38", null, { timeout: 20000 }).catch(() => {});
  await p2.waitForFunction(() => /Back/.test(document.getElementById("ayahCardBackPill")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  const read = await p2.evaluate(() => ({
    surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value,
    pill: document.getElementById("ayahCardBackPill")?.textContent.replace(/\s+/g, " ").trim() ?? "",
  }));
  check("the hadith's āyah link opens the Read view at 36:38", read.surah === "36" && read.ayah === "38", JSON.stringify(read));
  check("…with ← Back to the hadith", /Back to the hadith/.test(read.pill), read.pill);
  await ctx2.close();
}

// The About page credits OpenITI (CC BY-NC-SA 4.0) beside the Quran Foundation fonts, in the page's language, before sign-in too.
for (const lang of ["en", "bn"]) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/about.html");
  await page.waitForTimeout(800);
  const ack = await page.evaluate(() => { const a = [...document.querySelectorAll(".acknowledgements a")].find((x) => /openiti\.org/.test(x.href)); if (!a) return null; const r = a.getBoundingClientRect(); return { text: a.textContent.trim(), href: a.href, target: a.target, w: r.width, h: r.height }; });
  const want = lang === "bn" ? "আরবি হাদিসের পাঠ OpenITI থেকে (CC BY-NC-SA 4.0)" : "Arabic hadith texts from OpenITI (CC BY-NC-SA 4.0)";
  check(`${lang} about.html: the Acknowledgements credit "${want}", linking to openiti.org in a new tab`, !!ack && ack.text === want && ack.target === "_blank" && ack.w > 0 && ack.h > 0, JSON.stringify(ack));
  const para = await page.evaluate(() => [...document.querySelectorAll(".acknowledgements p")].map((p) => p.textContent).find((x) => /Open Islamicate Texts Initiative/.test(x)) || "");
  check(`${lang} about.html: it says which texts come from OpenITI${lang === "bn" ? ", in Bangla" : ""}`, lang === "bn" ? /হাদিস লাইব্রেরির/.test(para) : /Hadith library/.test(para), para);
  check(`${lang} about.html: no page errors`, errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, errors.join(" | "));
  await ctx.close();
}
console.log(`\n==== Related hadith (Keys Round 1), browser: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
