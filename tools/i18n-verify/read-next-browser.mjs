// J03 K3 "Read next" on the Hadith card, in a real browser, against the REAL data: Ṣaḥīḥ al-Bukhārī 3199 (OpenITI
// passage 3351), which quotes 36:38 and is linked to HadeethEnc 65070.
//   - the box is on the card with five tabs (Qur'an, Hadith, Dictionary, Scholars, Tafsīr), each >= 40px, aria-pressed;
//   - nothing of it is fetched until a tab is opened (positive control: the scholars file IS fetched once Scholars opens);
//   - each tab shows real content or an honest note: 36:38 with its Arabic and an "Open the āyah" link (back=1);
//     Bukhārī 4802 / Muslim 159 quote the same āyah (and 3199 itself is left out); HadeethEnc's word meanings and the
//     dictionary's شَمْس; the compiler al-Bukhārī (s008) and the tafsīr scholars by Approach; HadeethEnc's explanation
//     and benefits, the "not in the app yet" note and where to read;
//   - the tab row is tidy at 360 / 768 / 1024 / 1440 in English and Bangla: one row or 3 + 2, nothing cut, nothing
//     outside the card, no sideways scroll; Bangla labels on the Bangla page;
//   - the āyah link opens the Read view at 36:38 with "← Back to the hadith".
// Screenshots (deviceScaleFactor 1): /tmp/read-next-<lang>-<width>.png. Run from the repository root with serve.js on :8080.
import { chromium, newContext, openPage, BASE } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

const BOOK = "0256Bukhari.Sahih.JK000110-ara1", N = 3351;
const URL_ = `/app/hadith-collections.html?openiti=${BOOK}&passage=${N}&back=1`;
const BOX = `[data-openiti-passage="${N}"] .read-next`;
const LABELS = {
  en: ["Qur'an", "Hadith", "Dictionary", "Scholars", "Tafsīr"],
  bn: ["কুরআন", "হাদীস", "অভিধান", "আলেমগণ", "তাফসীর"],
};
const HEAD = { en: "Study Next", bn: "পরবর্তী অধ্যয়ন" }; // K3b (5 Nov 2026): renamed from "Read next" / "পরে পড়ুন"

/** Arabic without its marks (and ٱ as ا), so a check can name the words without matching the mark order. */
const bare = (s) => String(s ?? "").normalize("NFC").replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/g, "").replace(/\u0671/g, "\u0627").replace(/\u06E2/g, "");
async function openTab(page, key) {
  await page.click(`${BOX} [data-read-next-tab="${key}"]`);
  await page.waitForFunction((sel) => !!document.querySelector(sel)?.dataset.readNextLoaded, `${BOX} [data-read-next-panel="${key}"]`, { timeout: 20000 }).catch(() => {});
  return page.evaluate(({ box, key }) => {
    const p = document.querySelector(`${box} [data-read-next-panel="${key}"]`);
    const body = document.querySelector(`${box} .read-next-body`);
    const r = p?.getBoundingClientRect();
    return p ? { loaded: p.dataset.readNextLoaded, text: p.textContent.replace(/\s+/g, " "), shown: getComputedStyle(p).display !== "none" && getComputedStyle(body).display !== "none" && r.height > 0,
      pressed: document.querySelector(`${box} [data-read-next-tab="${key}"]`).getAttribute("aria-pressed") } : null;
  }, { box: BOX, key });
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

for (const lang of ["en", "bn"]) {
  for (const width of [360, 768, 1024, 1440]) {
    const label = `${lang} ${width}px`;
    if (process.env.READ_NEXT_ONLY && !process.env.READ_NEXT_ONLY.split(",").includes(`${lang}:${width}`)) continue; // e.g. en:360 (mutation runs)
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
    const fetched = [];
    ctx.on("request", (r) => { if (/tafsir-scholars\.json|lemma-dictionary-|surahs\/surah_036|ayah-hadith\/36\.json/.test(r.url())) fetched.push(r.url().replace(/^.*\//, "")); });
    const { page, errors } = await openPage(ctx, URL_);
    await page.waitForSelector(BOX, { timeout: 25000 }).catch(() => {});
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await page.locator(BOX).scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(400);

    const bar = await page.evaluate((box) => {
      const b = document.querySelector(box);
      if (!b) return null;
      const card = b.closest(".hadith-card").getBoundingClientRect();
      const btns = [...b.querySelectorAll("[data-read-next-tab]")].map((x) => {
        const r = x.getBoundingClientRect();
        return { key: x.dataset.readNextTab, text: x.textContent, pressed: x.getAttribute("aria-pressed"), x: r.left, y: Math.round(r.top), w: r.width, h: r.height, right: r.right, cut: x.scrollWidth > x.clientWidth + 1 };
      });
      return { display: getComputedStyle(b).display, head: b.querySelector(".read-next-head")?.textContent, btns, card: { left: card.left, right: card.right },
        bodyShown: getComputedStyle(b.querySelector(".read-next-body")).display !== "none", page: document.documentElement.scrollWidth - innerWidth };
    }, BOX);
    check(`${label} the Read next box is on the Bukhārī 3199 card and shown`, !!bar && bar.display !== "none", JSON.stringify(bar?.display));
    if (!bar) { await ctx.close(); continue; }
    check(`${label} headed "${HEAD[lang]}"`, bar.head === HEAD[lang], bar.head);
    check(`${label} five tabs in order, in ${lang === "bn" ? "Bangla" : "English"}`, JSON.stringify(bar.btns.map((b) => b.text)) === JSON.stringify(LABELS[lang]), bar.btns.map((b) => b.text).join(","));
    check(`${label} no tab pressed and no body until one is tapped`, bar.btns.every((b) => b.pressed === "false") && !bar.bodyShown);
    check(`${label} I9: nothing of Read next is fetched before a tab opens`, !fetched.some((u) => /tafsir-scholars|lemma-dictionary/.test(u)), fetched.join(" "));
    check(`${label} every tab is >= 40px tall and nothing is cut`, bar.btns.every((b) => b.h >= 40 && !b.cut), JSON.stringify(bar.btns.map((b) => [b.h, b.cut])));
    const rows = [...new Set(bar.btns.map((b) => b.y))];
    const tidy = rows.length === 1 || (rows.length === 2 && bar.btns.filter((b) => b.y === rows[0]).length === 3);
    check(`${label} the tab row is tidy: one row, or 3 + 2 (rows: ${rows.length})`, tidy, JSON.stringify(bar.btns.map((b) => [b.text, b.y])));
    if (rows.length === 2) {
      const r1 = bar.btns.slice(0, 3), r2 = bar.btns.slice(3);
      const edge = (a, b) => Math.abs(a - b) <= 1.5;
      check(`${label} 3 + 2 rows share both edges (not ragged)`, edge(r1[0].x, r2[0].x) && edge(r1[2].right, r2[1].right), JSON.stringify([r1[0].x, r2[0].x, r1[2].right, r2[1].right]));
    }
    check(`${label} the tabs sit inside the card, no sideways scroll`, bar.btns.every((b) => b.x >= bar.card.left - 0.5 && b.right <= bar.card.right + 0.5) && bar.page <= 1, JSON.stringify({ card: bar.card, page: bar.page }));
    if (width === 360) check(`${label} at 360 the five tabs take 3 + 2`, rows.length === 2);
    if (width === 1440) check(`${label} at 1440 the five tabs take one row`, rows.length === 1);

    // Each tab, its content.
    const q = await openTab(page, "quran");
    check(`${label} Qur'an: opens, pressed, shows 36:38`, q?.shown && q.pressed === "true" && q.loaded === "true" && q.text.includes(lang === "bn" ? "৩৬:৩৮" : "36:38"), q?.text.slice(0, 200));
    check(`${label} Qur'an: the āyah's Arabic and its ${lang === "bn" ? "Bangla" : "English"} meaning`, bare(q?.text).includes("والشمس") && bare(q?.text).includes("لمستقر لها") && (lang === "bn" ? /সূর্য/.test(q.text) : /the sun runs/.test(q.text)), q?.text.slice(0, 300));
    const link = await page.evaluate((box) => { const a = document.querySelector(`${box} [data-read-next-ayah-link="36:38"]`); if (!a) return null; const r = a.getBoundingClientRect(); return { href: a.getAttribute("href"), h: r.height, text: a.textContent }; }, BOX);
    check(`${label} Qur'an: "${lang === "bn" ? "আয়াতটি খুলুন" : "Open the āyah"}" is a >= 40px link with the way back`, link?.href === "./quranrevival.html?goto=36:38&back=1&backTo=hadith" && link.h >= 40 && link.text === (lang === "bn" ? "আয়াতটি খুলুন" : "Open the āyah"), JSON.stringify(link));

    const h = await openTab(page, "hadith");
    const hRefs = await page.evaluate((box) => [...document.querySelectorAll(`${box} [data-read-next-hadith]`)].map((a) => ({ k: a.dataset.readNextHadith, href: a.getAttribute("href"), h: a.getBoundingClientRect().height })), BOX);
    check(`${label} Hadith: Bukhārī 4802 (passage 4981) and Muslim 159 (passage 611) quote the same āyah`, hRefs.some((r) => r.k === `${BOOK}:4981`) && hRefs.some((r) => r.k === "0261Muslim.Sahih.Shamela0001727-ara1:611"), JSON.stringify(hRefs.map((r) => r.k)));
    check(`${label} Hadith: this narration itself is left out`, !hRefs.some((r) => r.k === `${BOOK}:${N}`));
    check(`${label} Hadith: each opens in the library with back=1 and is >= 40px`, hRefs.length > 0 && hRefs.every((r) => /back=1/.test(r.href) && r.h >= 40), JSON.stringify(hRefs.slice(0, 2)));
    check(`${label} Hadith: Qur'an's panel is now hidden (one panel at a time)`, await page.evaluate((box) => getComputedStyle(document.querySelector(`${box} [data-read-next-panel="quran"]`)).display === "none", BOX));
    check(`${label} Hadith: the OpenITI credit is under the list`, /OpenITI \(CC BY-NC-SA 4\.0\)/.test(h?.text ?? ""));

    const d = await openTab(page, "dictionary");
    check(`${label} Dictionary: HadeethEnc's meaning of يوشك is shown`, /يوشك/.test(d?.text ?? "") && /يقرب/.test(d.text), d?.text.slice(0, 200));
    const sun = await page.evaluate((box) => document.querySelector(`${box} [data-read-next-lemma="شَمْس"]`)?.textContent ?? "", BOX);
    check(`${label} Dictionary: شَمْس from the app's dictionary, "${lang === "bn" ? "সূর্য" : "sun"}"`, lang === "bn" ? /সূর্য/.test(sun) : /sun/.test(sun), sun);

    const s = await openTab(page, "scholars");
    check(`${label} positive control: the scholars file IS fetched once Scholars opens`, fetched.some((u) => /tafsir-scholars\.json/.test(u)), fetched.join(" "));
    const comp = await page.evaluate((box) => document.querySelector(`${box} [data-read-next-panel="scholars"] [data-read-next-scholar="s008"]`)?.textContent ?? "", BOX);
    check(`${label} Scholars: the compiler is al-Bukhārī (s008)${lang === "bn" ? ", in Bangla" : ""}`, lang === "bn" ? /ইমাম মুহাম্মাদ আল-বুখারী/.test(comp) : /Imām Muḥammad al-Bukhārī/.test(comp), comp);
    const groups = await page.evaluate((box) => [...document.querySelectorAll(`${box} [data-read-next-approach]`)].map((g) => ({ a: g.dataset.readNextApproach, n: g.querySelectorAll("[data-read-next-scholar]").length, h: g.querySelector("summary").getBoundingClientRect().height })), BOX);
    check(`${label} Scholars: tafsīr scholars in 5+ Approach groups, 40+ scholars, al-Ṭabarī (s021) there`, groups.length >= 5 && groups.reduce((n, g) => n + g.n, 0) >= 40 && /s021/.test(await page.evaluate((box) => [...document.querySelectorAll(`${box} [data-read-next-approach] [data-read-next-scholar]`)].map((x) => x.dataset.readNextScholar).join(" "), BOX)), JSON.stringify(groups));
    check(`${label} Scholars: each Approach heading is a >= 40px target`, groups.every((g) => g.h >= 40), JSON.stringify(groups.map((g) => g.h)));
    check(`${label} Scholars: it says the list is not yet checked`, lang === "bn" ? /যাচাই করা হয়নি/.test(s?.text ?? "") : /not yet checked/.test(s?.text ?? ""));

    const tf = await openTab(page, "tafsir");
    const tfx = await page.evaluate((box) => ({
      ex: !!document.querySelector(`${box} [data-read-next-explanation]`),
      ben: Number(document.querySelector(`${box} [data-read-next-benefits]`)?.dataset.readNextBenefits ?? 0),
      missing: document.querySelector(`${box} [data-read-next-tafsir-missing]`)?.textContent ?? "",
      where: document.querySelectorAll(`${box} [data-read-next-tafsir]`).length,
      ibnKathir: [...document.querySelectorAll(`${box} [data-read-next-tafsir="s048"]`)].map((x) => x.textContent).join(" "),
    }), BOX);
    check(`${label} Tafsīr: HadeethEnc's explanation and its benefits are there`, tfx.ex && tfx.ben >= 3, JSON.stringify(tfx));
    check(`${label} Tafsīr: it says plainly the tafsīr texts are not in the app yet`, lang === "bn" ? /তাফসীরের লেখা এখনো অ্যাপে নেই/.test(tfx.missing) : /The tafsīr texts are not in the app yet/.test(tfx.missing), tfx.missing);
    check(`${label} Tafsīr: where to read 36:38's tafsīr, 40+ works, Ibn Kathīr's among them`, tfx.where >= 40 && /Tafsīr al-Qurʾān al-ʿAẓīm/.test(tfx.ibnKathir) && (lang === "bn" ? /৩৬:৩৮/ : /36:38/).test(tf?.text ?? ""), JSON.stringify({ where: tfx.where, ik: tfx.ibnKathir }));

    // A second tap closes the open tab.
    await page.click(`${BOX} [data-read-next-tab="tafsir"]`);
    const closed = await page.evaluate((box) => ({ body: getComputedStyle(document.querySelector(`${box} .read-next-body`)).display, pressed: [...document.querySelectorAll(`${box} [data-read-next-tab]`)].filter((b) => b.getAttribute("aria-pressed") === "true").length }), BOX);
    check(`${label} a second tap on the open tab closes it`, closed.body === "none" && closed.pressed === 0, JSON.stringify(closed));

    if (lang === "bn") {
      const leak = await page.evaluate((box) => {
        const b = document.querySelector(box);
        return [...b.querySelectorAll(".read-next-head, [data-read-next-tab], .read-next-note, .read-next-sub, summary, a.read-next-go")].map((e) => e.textContent).filter((x) => /\b(Study Next|Read next|Loading|Open the|Where to read|Scholars who|The compiler|From your|Dictionary words|quotes the same)\b/.test(x));
      }, BOX);
      check(`${label} no English chrome left in the Bangla box`, leak.length === 0, leak.join(" | "));
    }

    // Rendered contrast against the REAL background (the reader window is dark, a light card is light): every heading,
    // note, Approach heading and tab label of the open Scholars panel reads at 4.5:1 or better.
    await page.click(`${BOX} [data-read-next-tab="scholars"]`);
    await page.waitForTimeout(200);
    const contrast = await page.evaluate((box) => {
      const rgba = (s) => { const m = s.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
      const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const bgOf = (e) => { for (let n = e; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c.a > 0.5) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
      const out = [];
      for (const e of document.querySelectorAll(`${box} .read-next-head, ${box} [data-read-next-tab], ${box} [data-read-next-panel="scholars"] .read-next-sub, ${box} [data-read-next-panel="scholars"] .read-next-note, ${box} [data-read-next-panel="scholars"] summary`)) {
        if (e.getBoundingClientRect().height === 0) continue;
        const bg = bgOf(e); const fg = rgba(getComputedStyle(e).color);
        let op = 1; for (let n = e; n && !n.matches(box); n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
        const a = fg.a * op; const mix = { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) };
        const [L1, L2] = [lum(mix), lum(bg)].sort((x, y) => y - x);
        out.push({ t: e.textContent.slice(0, 24), ratio: Math.round(((L1 + 0.05) / (L2 + 0.05)) * 100) / 100 });
      }
      return out;
    }, BOX);
    const low = contrast.filter((c) => c.ratio < 4.5);
    check(`${label} headings, notes and tabs read at >= 4.5:1 on their real background (${contrast.length} measured)`, contrast.length >= 8 && low.length === 0, JSON.stringify(low));

    if (width === 360 || width === 1440) {
      await page.locator(BOX).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/read-next-${lang}-${width}.png` });
      await page.locator(BOX).screenshot({ path: `/tmp/read-next-box-${lang}-${width}.png` });
    }
    const errs = errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e));
    check(`${label} no page errors`, errs.length === 0, errs.join(" | "));
    await ctx.close();
  }
}

// The way back: the āyah link opens the Read view at 36:38 with "← Back to the hadith".
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const { page } = await openPage(ctx, URL_);
  await page.waitForSelector(BOX, { timeout: 25000 }).catch(() => {});
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await openTab(page, "quran");
  await page.click(`${BOX} [data-read-next-ayah-link="36:38"]`);
  await page.waitForURL(/quranrevival\.html/, { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(() => document.getElementById("ayahSelect")?.value === "38", null, { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => /Back/.test(document.getElementById("ayahCardBackPill")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  const read = await page.evaluate(() => {
    const p = document.getElementById("ayahCardBackPill");
    return { surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value,
      pill: p?.textContent.replace(/\s+/g, " ").trim() ?? "", pillShown: !!p && getComputedStyle(p).display !== "none" && p.getBoundingClientRect().height > 0 };
  });
  check("the āyah link opens the Read view at 36:38", read.surah === "36" && read.ayah === "38", JSON.stringify(read));
  check("…with a visible ← Back to the hadith", read.pillShown && /Back to the hadith/.test(read.pill), JSON.stringify(read));
  await page.click("#ayahCardBackPill [data-ayah-card-back]").catch(() => {});
  await page.waitForURL(/hadith-collections\.html/, { timeout: 10000 }).catch(() => {});
  await page.waitForSelector(`[data-openiti-passage="${N}"]`, { timeout: 20000 }).catch(() => {});
  check("Back returns to the same hadith (Bukhārī passage 3351)", await page.evaluate((n) => /hadith-collections\.html/.test(location.href) && !!document.querySelector(`[data-openiti-passage="${n}"]`), N));
  await ctx.close();
}

// A Hadith tab link opens that narration with ← Back.
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const { page } = await openPage(ctx, URL_);
  await page.waitForSelector(BOX, { timeout: 25000 }).catch(() => {});
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await openTab(page, "hadith");
  await page.click(`${BOX} [data-read-next-hadith="0261Muslim.Sahih.Shamela0001727-ara1:611"]`);
  await page.waitForSelector('[data-openiti-passage="611"]', { timeout: 20000 }).catch(() => {});
  const back = await page.evaluate(() => { const b = document.getElementById("hadithBackBtn"); return { passage: !!document.querySelector('[data-openiti-passage="611"]'), back: b && !b.hidden ? b.textContent : "" }; });
  check("a Hadith tab link opens Muslim 159 (passage 611) with ← Back", back.passage && /←/.test(back.back), JSON.stringify(back));
  await ctx.close();
}

console.log(`\n==== Read next (J03 K3), browser: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
