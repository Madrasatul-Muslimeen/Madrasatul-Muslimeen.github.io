// J03 K3 "Read next" placed on QR's Āyah card and Word card (QR Lead, 4 Nov 2026), in a real browser:
//   - Āyah card (36:38): the box is in the Info block with THREE tabs (Dictionary, Scholars, Tafsīr) -- no Qur'an or Hadith
//     tab, because the card already has Related āyāt / Related hadith; each tab is a 40px target; Dictionary lists
//     the āyah's real lemmas; the box SURVIVES the card's redraw (Next-then-back is not needed: a redraw is forced);
//   - Word card: FOUR tabs (Qur'an, Dictionary, Scholars, Tafsīr); Dictionary shows the word's lemma; the Qur'an tab
//     lists real places with a link carrying back=1; an opened tab stays open across a redraw of the card;
//   - at 360 / 768 / 1440, en and bn: no sideways scroll, the box inside its card, tab labels translated in bn.
//   node tools/i18n-verify/read-next-qr-cards-browser.mjs   (serve.js on :8080; from the repository root)
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
const LABELS = { en: { ayah: ["Dictionary", "Scholars", "Tafsīr"], word: ["Qur'an", "Dictionary", "Scholars", "Tafsīr"] },
  bn: { ayah: ["অভিধান", "আলেমগণ", "তাফসীর"], word: ["কুরআন", "অভিধান", "আলেমগণ", "তাফসীর"] } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const lang of ["en", "bn"]) {
  for (const width of [360, 768, 1440]) {
    const tag = `[${lang} ${width}]`;
    const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
    await page.click("#tabReadBtn"); await page.waitForTimeout(500);
    await setSel(page, "surahSelect", "36"); await page.waitForTimeout(1200);
    await setSel(page, "ayahSelect", "38"); await page.waitForTimeout(900);
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));

    // --- Word card
    await page.evaluate(() => document.querySelector(`[data-word-occurrence$=":36:38:3"]`)?.click());
    await page.waitForSelector("#quranWordCardMount .quran-word-card .read-next", { timeout: 15000 }).catch(() => {});
    const wbox = () => page.evaluate(() => {
      const b = document.querySelector("#quranWordCardMount .quran-word-card .read-next"); if (!b) return null;
      const card = document.querySelector("#quranWordCardMount .quran-word-card").getBoundingClientRect(), r = b.getBoundingClientRect();
      const tabs = [...b.querySelectorAll("[data-read-next-tab]")];
      return { keys: tabs.map((x) => x.dataset.readNextTab), labels: tabs.map((x) => x.textContent.trim()), minH: Math.min(...tabs.map((x) => x.getBoundingClientRect().height)),
        inside: r.left >= card.left - 1 && r.right <= card.right + 1, sideways: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    let w = await wbox();
    check(`${tag} Word card has the box`, !!w);
    check(`${tag} Word card tabs are Qur'an, Dictionary, Scholars, Tafsīr`, w?.keys.join() === "quran,dictionary,scholars,tafsir", w?.keys.join());
    check(`${tag} Word card tab labels in ${lang}`, w?.labels.join("|") === LABELS[lang].word.join("|"), w?.labels.join("|"));
    check(`${tag} Word card tabs are 40px, box inside the card, no sideways scroll`, !!w && w.minH >= 39.5 && w.inside && !w.sideways, JSON.stringify(w));
    await page.click("#quranWordCardMount [data-read-next-tab='dictionary']");
    await page.waitForFunction(() => document.querySelector("#quranWordCardMount [data-read-next-panel='dictionary']")?.dataset.readNextLoaded, null, { timeout: 20000 }).catch(() => {});
    const dict = await page.evaluate(() => document.querySelectorAll("#quranWordCardMount [data-read-next-lemma]").length);
    check(`${tag} Word card Dictionary shows the word's lemma`, dict >= 1, String(dict));
    await page.click("#quranWordCardMount [data-read-next-tab='quran']");
    await page.waitForFunction(() => document.querySelector("#quranWordCardMount [data-read-next-panel='quran']")?.dataset.readNextLoaded, null, { timeout: 20000 }).catch(() => {});
    const links = await page.evaluate(() => [...document.querySelectorAll("#quranWordCardMount [data-read-next-panel='quran'] a")].map((a) => a.getAttribute("href")));
    check(`${tag} Word card Qur'an tab lists places with back=1`, links.length >= 1 && links.every((h) => /back=1/.test(h)), links.slice(0, 2).join(" "));
    // a redraw (change level) keeps the opened tab
    await page.evaluate(() => document.querySelector("#quranWordCardMount [data-word-card-level], #quranWordCardMount [data-word-card-tab]")?.click());
    await page.waitForTimeout(500);
    const still = await page.evaluate(() => document.querySelector("#quranWordCardMount [data-read-next-tab='quran']")?.getAttribute("aria-pressed"));
    check(`${tag} Word card: the opened tab survives a redraw`, still === "true", String(still));
    await page.click("[data-word-card-close]"); await page.waitForTimeout(300);

    // --- Āyah card
    await page.click("[data-ayah-num-badge]"); await page.waitForSelector("[data-ayah-sheet]", { timeout: 10000 });
    await page.waitForSelector("[data-ayah-sheet] .read-next", { timeout: 10000 }).catch(() => {});
    const a = await page.evaluate(() => {
      const b = document.querySelector("[data-ayah-sheet] .read-next"); if (!b) return null;
      const info = document.querySelector("[data-ayah-sheet-info]"), tabs = [...b.querySelectorAll("[data-read-next-tab]")];
      return { inInfo: !!info?.contains(b), keys: tabs.map((x) => x.dataset.readNextTab), labels: tabs.map((x) => x.textContent.trim()), minH: Math.min(...tabs.map((x) => x.getBoundingClientRect().height)),
        related: !!document.querySelector("[data-ayah-sheet-related]") && !!document.querySelector("[data-ayah-sheet-hadith]"), sideways: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    check(`${tag} Āyah card has the box in its Info block`, !!a?.inInfo);
    check(`${tag} Āyah card tabs are Dictionary, Scholars, Tafsīr (no Qur'an/Hadith: the Related sections stay)`, a?.keys.join() === "dictionary,scholars,tafsir" && a.related, a?.keys.join());
    check(`${tag} Āyah card tab labels in ${lang}`, a?.labels.join("|") === LABELS[lang].ayah.join("|"), a?.labels.join("|"));
    check(`${tag} Āyah card tabs are 40px, no sideways scroll`, !!a && a.minH >= 39.5 && !a.sideways, JSON.stringify(a));
    await page.click("[data-ayah-sheet] [data-read-next-tab='dictionary']");
    await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] [data-read-next-panel='dictionary']")?.dataset.readNextLoaded, null, { timeout: 20000 }).catch(() => {});
    const lem = await page.evaluate(() => document.querySelectorAll("[data-ayah-sheet] [data-read-next-lemma]").length);
    check(`${tag} Āyah card Dictionary lists the āyah's lemmas`, lem >= 3, String(lem));
    // force a redraw of the card (the "See on the wheel"-free route: toggle the pane split) -- Next then Previous reopens a new box,
    // so instead redraw through the same key by changing the language-neutral Approach picker
    await page.evaluate(() => { const s = document.querySelector("[data-ayah-sheet] select"); if (s && s.options.length > 1) { s.selectedIndex = 1; s.dispatchEvent(new Event("change", { bubbles: true })); } });
    await page.waitForTimeout(600);
    const kept = await page.evaluate(() => document.querySelector("[data-ayah-sheet] [data-read-next-tab='dictionary']")?.getAttribute("aria-pressed"));
    check(`${tag} Āyah card: the opened tab survives a redraw`, kept === "true", String(kept));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
