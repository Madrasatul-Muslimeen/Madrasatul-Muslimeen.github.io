// J03 K3b "Study Next" (the Owner, 5 Nov 2026), in a real browser, on all three cards that carry the box:
//   - the box is called "Study Next" / "পরবর্তী অধ্যয়ন" on the Hadith card (Bukhārī 3199), the Word card and the Āyah card;
//   - Tafsīr: each book links to THAT āyah (36:38) on its site, in a new tab: Ibn Kathīr on quran.com, Ibn ʿĀshūr,
//     al-Jalālayn and al-Rāzī on tafsir.app, al-Khāzin on altafsir.com; al-Marāghī says "Not online yet"; al-Manār says
//     "only some āyāt"; every link is a 40px target inside its card, with no sideways scroll;
//   - Scholars (and the Tafsīr rows): a scholar's name opens THAT scholar's Scholars Database row (?s=<id>&back=1, new tab);
//   - the Scholars Database page itself, opened that way: the row is marked and on screen, ← Back is there (40px);
//     opened plainly, neither appears (the Owner's live page is untouched in use);
//   - at 360 / 768 / 1440, en and bn. SHOTS_DIR=<dir> keeps screenshots.
//   QR_BASE=http://localhost:<port> node tools/i18n-verify/study-next-k3b-browser.mjs   (from the repository root)
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const HEAD = { en: "Study Next", bn: "পরবর্তী অধ্যয়ন" };
const OFFLINE = { en: "Not online yet", bn: "এখনো অনলাইনে নেই" };
const PARTIAL = { en: "only some āyāt", bn: "শুধু কিছু আয়াত" };
const WANT = {
  s048: "https://quran.com/36:38/tafsirs/ar-tafsir-ibn-kathir",
  s068: "https://tafsir.app/ibn-aashoor/36/38",
  s049: "https://tafsir.app/jalalayn/36/38",
  s038: "https://tafsir.app/alrazi/36/38",
  s044: "https://www.altafsir.com/Tafasir.asp?tMadhNo=0&tTafsirNo=18&tSoraNo=36&tAyahNo=38&tDisplay=yes&UserProfile=0&LanguageId=1",
};
const DB = "https://madrasatul-muslimeen.github.io/docs/reference/scholars-database/Scholars%20Database%20-%20v1.6.html";
const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);

/** Opens a tab of the box under `box` and waits until its panel has loaded. */
async function openTab(page, box, key) {
  await page.locator(`${box} [data-read-next-tab="${key}"]`).scrollIntoViewIfNeeded().catch(() => {});
  await page.click(`${box} [data-read-next-tab="${key}"]`);
  await page.waitForFunction((sel) => !!document.querySelector(sel)?.dataset.readNextLoaded, `${box} [data-read-next-panel="${key}"]`, { timeout: 20000 }).catch(() => {});
}

/** What the Tafsīr panel of `box` (inside `cardSel`) shows: each row's links, its offline/partial notes, geometry. */
function tafsirFacts(page, box, cardSel) {
  return page.evaluate(([box, cardSel]) => {
    const b = document.querySelector(box); if (!b) return null;
    const card = document.querySelector(cardSel).getBoundingClientRect();
    const head = b.querySelector(".read-next-head")?.textContent ?? "";
    const rows = {};
    for (const item of b.querySelectorAll("[data-read-next-panel='tafsir'] [data-read-next-tafsir]")) {
      const id = item.dataset.readNextTafsir;
      (rows[id] ??= []).push({
        title: item.querySelector(".rn-ref")?.textContent ?? "",
        links: [...item.querySelectorAll("a[data-read-next-tafsir-link]")].map((a) => ({ href: a.href, target: a.target, rel: a.rel, text: a.textContent })),
        scholar: item.querySelector("a[data-read-next-scholar-link]")?.href ?? null,
        offline: item.querySelector("[data-read-next-tafsir-offline]")?.textContent ?? null,
        text: item.textContent,
      });
    }
    const targets = [...b.querySelectorAll("[data-read-next-panel='tafsir'] a.read-next-go")].map((a) => a.getBoundingClientRect());
    return {
      head, rows,
      minH: targets.length ? Math.min(...targets.map((r) => r.height)) : 0,
      inside: targets.every((r) => r.left >= card.left - 1 && r.right <= card.right + 1),
      sideways: document.documentElement.scrollWidth > innerWidth + 1,
      linkCount: targets.length,
    };
  }, [box, cardSel]);
}

function judgeTafsir(tag, lang, f) {
  check(`${tag} the box is called "${HEAD[lang]}"`, f?.head === HEAD[lang], JSON.stringify(f?.head));
  for (const [id, href] of Object.entries(WANT)) {
    const r = f?.rows[id]?.find((x) => x.links.length);
    check(`${tag} ${id}: the book links to 36:38 on its site, in a new tab`, r?.links.some((l) => l.href === href && l.target === "_blank" && /noopener/.test(l.rel)), JSON.stringify(r?.links));
  }
  check(`${tag} al-Marāghī (s065) says "${OFFLINE[lang]}" and has no link`, f?.rows.s065?.[0]?.offline === OFFLINE[lang] && f.rows.s065[0].links.length === 0, JSON.stringify(f?.rows.s065));
  check(`${tag} al-Manār (s064) links and says "${PARTIAL[lang]}"`, f?.rows.s064?.[0]?.links.length === 1 && f.rows.s064[0].text.includes(PARTIAL[lang]), JSON.stringify(f?.rows.s064?.[0]?.text));
  check(`${tag} every Tafsīr row's scholar opens their own Scholars Database row`, !!f && Object.entries(f.rows).every(([id, rs]) => rs.every((r) => r.scholar === `${DB}?s=${id}&back=1`)), "");
  check(`${tag} 40+ links, each a 40px target inside the card, no sideways scroll`, !!f && f.linkCount >= 40 && f.minH >= 39.5 && f.inside && !f.sideways, JSON.stringify({ n: f?.linkCount, minH: f?.minH, inside: f?.inside, sideways: f?.sideways }));
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"]) {
  for (const width of [360, 768, 1440]) {
    const tag = `[${lang} ${width}]`;
    const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());

    // --- Hadith card: Bukhārī 3199 (OpenITI passage 3351), which quotes 36:38
    {
      const BOX = `[data-openiti-passage="3351"] .read-next`;
      const { page } = await openPage(ctx, "/app/hadith-collections.html?openiti=0256Bukhari.Sahih.JK000110-ara1&passage=3351&back=1");
      await page.waitForSelector(BOX, { timeout: 25000 }).catch(() => {});
      await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
      await openTab(page, BOX, "tafsir");
      judgeTafsir(`${tag} Hadith card`, lang, await tafsirFacts(page, BOX, `[data-openiti-passage="3351"]`));
      if (SHOTS) await page.locator(`${BOX} [data-read-next-panel='tafsir']`).screenshot({ path: `${SHOTS}/hadith-tafsir-${lang}-${width}.png` }).catch(() => {});
      await openTab(page, BOX, "scholars");
      const sch = await page.evaluate((box) => [...document.querySelectorAll(`${box} [data-read-next-panel='scholars'] a[data-read-next-scholar-link]`)].map((a) => ({ id: a.dataset.readNextScholarLink, href: a.href, target: a.target })), BOX);
      check(`${tag} Hadith card Scholars: every name is a new-tab link to that scholar's row (40+)`, sch.length >= 40 && sch.every((s) => s.href === `${DB}?s=${s.id}&back=1` && s.target === "_blank"), `${sch.length} ${JSON.stringify(sch[0])}`);
      check(`${tag} Hadith card Scholars: al-Bukhārī (s008), the compiler, is linked too`, sch.some((s) => s.id === "s008"), sch.slice(0, 3).map((s) => s.id).join());
      await page.close();
    }

    // --- Word card and Āyah card at 36:38
    {
      const { page } = await openPage(ctx, "/app/quranrevival.html");
      if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
      await page.click("#tabReadBtn"); await page.waitForTimeout(500);
      await setSel(page, "surahSelect", "36"); await page.waitForTimeout(1200);
      await setSel(page, "ayahSelect", "38"); await page.waitForTimeout(900);
      await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));

      await page.evaluate(() => document.querySelector(`[data-word-occurrence$=":36:38:3"]`)?.click());
      const WBOX = "#quranWordCardMount .quran-word-card .read-next";
      await page.waitForSelector(WBOX, { timeout: 15000 }).catch(() => {});
      await openTab(page, WBOX, "tafsir");
      judgeTafsir(`${tag} Word card`, lang, await tafsirFacts(page, WBOX, "#quranWordCardMount .quran-word-card"));
      if (SHOTS) await page.locator(`${WBOX} [data-read-next-panel='tafsir']`).screenshot({ path: `${SHOTS}/word-tafsir-${lang}-${width}.png` }).catch(() => {});
      await page.click("[data-word-card-close]").catch(() => {}); await page.waitForTimeout(300);

      await page.click("[data-ayah-num-badge]"); await page.waitForSelector("[data-ayah-sheet]", { timeout: 10000 }).catch(() => {});
      const ABOX = "[data-ayah-sheet] .read-next";
      await page.waitForSelector(ABOX, { timeout: 10000 }).catch(() => {});
      await openTab(page, ABOX, "tafsir");
      judgeTafsir(`${tag} Āyah card`, lang, await tafsirFacts(page, ABOX, "[data-ayah-sheet]"));
      await page.close();
    }
    await ctx.close();
  }
}

// --- The Scholars Database page, opened at one scholar (and opened plainly): served from this tree.
const local = (q) => `/docs/reference/scholars-database/Scholars%20Database%20-%20v1.6.html${q}`;
for (const width of [360, 1440]) {
  const ctx = await newContext(browser, { appLang: "en", banner: false, viewport: { width, height: 800 } });
  const { page } = await openPage(ctx, local("?s=s068&back=1"));
  await page.waitForSelector("#tb tr[data-id]", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  const at = await page.evaluate(() => {
    const tr = document.querySelector("#tb tr.jump"), b = document.getElementById("backBtn");
    const r = tr?.getBoundingClientRect(), br = b?.getBoundingClientRect();
    return { id: tr?.dataset.id, marked: document.querySelectorAll("#tb tr.jump").length, top: r?.top, bottom: r?.bottom, vh: innerHeight,
      back: b ? { text: b.textContent, h: br.height, onScreen: br.top >= 0 && br.bottom <= innerHeight } : null, sideways: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  check(`[db ${width}] ?s=s068 marks exactly Ibn ʿĀshūr's row and brings it on screen`, at.id === "s068" && at.marked === 1 && at.top < at.vh && at.bottom > 0, JSON.stringify(at));
  check(`[db ${width}] back=1 shows ← Back, a 40px target, still on screen at the scholar's row; no sideways page scroll`, at.back?.text === "← Back" && at.back.h >= 39.5 && at.back.onScreen && !at.sideways, JSON.stringify(at.back));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/db-s068-${width}.png` });
  await page.close();
  const plain = (await openPage(ctx, local(""))).page;
  await plain.waitForSelector("#tb tr[data-id]", { timeout: 15000 }).catch(() => {});
  const p = await plain.evaluate(() => ({ rows: document.querySelectorAll("#tb tr[data-id]").length, jump: document.querySelectorAll("tr.jump").length, back: !!document.getElementById("backBtn") }));
  check(`[db ${width}] opened plainly: all 68 rows, nothing marked, no ← Back (positive control: the rows are there)`, p.rows === 68 && p.jump === 0 && !p.back, JSON.stringify(p));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Study Next (J03 K3b), browser: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
