// Owner decision 82 (7 Oct 2026) -- Explore -> Quran -> Surah: every Approach at once, a tap on an Ayah slice opens
// that Ayah, Back and Previous/Next, and Take straight from a status. Real taps, en + bn, at 390 / 820 / 1280, with
// seeded statuses. Run from tools/i18n-verify:  node explore-all-approaches-browser.mjs
//
// Expected values come from the SEED below (counts written by hand), never from an app function.
//
// Seeded Ayah 3 of At-Takwir (surah 81), ten Approaches: memorise + recite Mastered, tajweed Achieved,
// listen + read_daily + translate Practising, tafsir Learning, word_by_word + reflect + act Not started.
// Ayah 5: memorise Achieved only.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

const claim = (tid, st) => `{ unitType: "ayah", subjectId: "quran", trackableId: "${tid}", claimedStatus: "${st}", confirmedStatus: null, confirmState: "pending" }`;
const SEED = `
// Real-length Approach names, as the tenant has (the standing lesson on measuring with real data).
DATA.trackables.find((t) => t._id === TENANT_ID + "__act").name = lang("Mastery Level — Where Fiqh turns to Ruling (9:122 pivot)", "দক্ষতার স্তর — যেখানে ফিকহ বিধানে পরিণত হয় (৯:১২২ মোড়)");
DATA.trackables.find((t) => t._id === TENANT_ID + "__tafsir").name = lang("Upper Higher Level — Dhikr / Tadhakkur", "উচ্চতর স্তর — যিকর / তাযাক্কুর");
DATA.records.push(
  { _id: TENANT_ID + "__p1__surah_81", tenantId: TENANT_ID, personId: "p1", chunkKey: "surah_81", entries: {
    "ayah:81:3::memorise": ${claim("memorise", "mastered")},
    "ayah:81:3::recite": ${claim("recite", "mastered")},
    "ayah:81:3::tajweed": ${claim("tajweed", "achieved")},
    "ayah:81:3::listen": ${claim("listen", "practising")},
    "ayah:81:3::read_daily": ${claim("read_daily", "practising")},
    "ayah:81:3::translate": ${claim("translate", "practising")},
    "ayah:81:3::tafsir": ${claim("tafsir", "learning")},
    "ayah:81:5::memorise": ${claim("memorise", "achieved")},
  } }
);
`;
const ORDER = ["mastered", "achieved", "practising", "learning", "not_started"];
const EXPECT3 = { mastered: 2, achieved: 1, practising: 3, learning: 1, not_started: 3 };
const T = {
  en: { all: "All Approaches", one: "One Approach", words: "2 Mastered, 1 Achieved, 3 Practising, 1 Learning, 3 Not started", wordsAfter: "2 Mastered, 1 Achieved, 3 Practising, 2 Learning, 2 Not started", mastered: "Mastered" },
  bn: { all: "সব পদ্ধতি", one: "একটি পদ্ধতি", words: "২ পূর্ণ দক্ষতা, ১ অর্জিত হয়েছে, ৩ অনুশীলন করছি, ১ শিখছি, ৩ শুরু হয়নি", wordsAfter: "২ পূর্ণ দক্ষতা, ১ অর্জিত হয়েছে, ৩ অনুশীলন করছি, ২ শিখছি, ২ শুরু হয়নি", mastered: "পূর্ণ দক্ষতা" },
};
const bnDigits = (s) => String(s).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));

const tap = async (page, sel) => { await page.click(sel, { timeout: 8000 }); await page.waitForTimeout(350); };
async function goSurah(page, n) {
  await page.evaluate((k) => {
    const segs = [...document.querySelectorAll("#exploreWheelContainer .wheel-seg")].filter((s) => s.dataset.key === String(k) && (!s.dataset.ringKind || s.dataset.ringKind === "surah"));
    segs[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }, n);
  await page.waitForFunction(() => !!document.querySelector(".aa-wheel, #exploreModeRow button"), null, { timeout: 15000 });
  await page.waitForTimeout(300);
}
const sliceCount = (page) => page.evaluate(() => Number(document.querySelector(".aa-wheel")?.dataset.slices ?? 0));
const crumbs = (page) => page.evaluate(() => [...document.querySelectorAll("#exploreBreadcrumb .explore-crumb")].map((c) => c.textContent.trim()));
const lastWrite = (page, n) => page.evaluate((from) => (window.__stubWriteData || []).slice(from).filter((w) => w.col === "records").at(-1) ?? null, n);
const writeCount = (page) => page.evaluate(() => (window.__stubWriteData || []).length);

async function run(lang, width) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { banner: false, viewport: { width, height: 900 }, appLang: lang, extraSeedJs: SEED });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.click("#tabExploreBtn");
  await page.waitForFunction(() => !!document.querySelector("#exploreWheelContainer svg"), null, { timeout: 15000 });
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((el) => el.remove()));
  await goSurah(page, 81);

  // ---- All Approaches is the default; One Approach is today's view ----
  const modes = await page.evaluate(() => [...document.querySelectorAll("#exploreModeRow button")].map((b) => ({ text: b.textContent.trim(), pressed: b.getAttribute("aria-pressed"), h: b.getBoundingClientRect().height })));
  check(`${tag} the switch offers All Approaches | One Approach, All pressed by default`, modes.length === 2 && modes[0].text === T[lang].all && modes[1].text === T[lang].one && modes[0].pressed === "true" && modes[1].pressed === "false", JSON.stringify(modes));
  check(`${tag} switch buttons are at least 40px tall`, modes.every((m) => m.h >= 40), JSON.stringify(modes));
  check(`${tag} At-Takwir has 29 Ayah slices`, (await sliceCount(page)) === 29, String(await sliceCount(page)));
  const centre = await page.evaluate(() => document.querySelector(".aa-wheel")?.textContent.replace(/\s+/g, " "));
  check(`${tag} the centre says "All 10 Approaches"`, bnDigits(centre).includes("All 10 Approaches") || bnDigits(centre).includes("সব 10টি পদ্ধতি"), centre);
  check(`${tag} the Approach capsule is put away in All mode`, await page.evaluate(() => document.getElementById("exploreApproachRow").getBoundingClientRect().height === 0));

  // ---- bands: counts and order (Mastered inside, Not started outside) ----
  const bands = await page.evaluate(() => [...document.querySelectorAll('.aa-slice[data-slice="2"] .aa-band')].map((b) => ({ band: b.dataset.band, r0: Number(b.dataset.radiusIn), r1: Number(b.dataset.radiusOut) })));
  check(`${tag} Ayah 3: five bands, Mastered first (inside) to Not started last (outside)`, JSON.stringify(bands.map((b) => b.band)) === JSON.stringify(ORDER), JSON.stringify(bands));
  const depth = bands.at(-1)?.r1 - bands[0]?.r0;
  const props = bands.map((b) => Math.round(((b.r1 - b.r0) / depth) * 10));
  check(`${tag} Ayah 3: each band is proportional to its count (2,1,3,1,3 of 10)`, JSON.stringify(props) === JSON.stringify(ORDER.map((s) => EXPECT3[s])), JSON.stringify(props));
  check(`${tag} Ayah 3: bands run outward without gaps`, bands.every((b, i) => i === 0 || Math.abs(b.r0 - bands[i - 1].r1) < 0.01), JSON.stringify(bands));
  const only = await page.evaluate(() => [...document.querySelectorAll('.aa-slice[data-slice="0"] .aa-band')].map((b) => b.dataset.band));
  check(`${tag} an Ayah with no claims is one Not started band`, JSON.stringify(only) === '["not_started"]', JSON.stringify(only));
  const aria = await page.evaluate(() => document.querySelector('.aa-hit[data-key="2"]').getAttribute("aria-label"));
  check(`${tag} the slice's aria-label says the counts in words`, bnDigits(aria).includes(bnDigits(T[lang].words)) || aria.endsWith(T[lang].words), aria);
  const title = await page.evaluate(() => document.querySelector('.aa-hit[data-key="2"] title')?.textContent);
  check(`${tag} the slice's tooltip says the same`, title === aria, title);

  // ---- rows: every Approach, the right status ----
  const rows = await page.evaluate(() => [...document.querySelectorAll('#exploreSidebarContainer [data-aa-rows="surah"] .aa-row')].map((r) => ({
    id: r.dataset.aaRow, done: Number(r.dataset.done), total: Number(r.dataset.total), cells: [...r.querySelectorAll(".aa-strip i")].map((i) => i.dataset.status), take: r.querySelector(".aa-take")?.getBoundingClientRect().height ?? 0,
    right: r.getBoundingClientRect().right, scrollW: r.scrollWidth, clientW: r.clientWidth, text: r.querySelector(".aa-nm").textContent })));
  check(`${tag} one row per Approach (10)`, rows.length === 10, String(rows.length));
  const mem = rows.find((r) => r.id === "memorise");
  check(`${tag} Memorise: strip has 29 cells, Ayah 3 Mastered, Ayah 5 Achieved, Ayah 1 Not started`, mem?.cells.length === 29 && mem.cells[2] === "mastered" && mem.cells[4] === "achieved" && mem.cells[0] === "not_started", JSON.stringify(mem?.cells));
  check(`${tag} Memorise: "2 of 29 Ayat Achieved or Mastered"`, mem?.done === 2 && mem.total === 29, JSON.stringify(mem && { d: mem.done, t: mem.total }));
  check(`${tag} Recite: 1 Ayah Achieved or Mastered; Act: 0`, rows.find((r) => r.id === "recite")?.done === 1 && rows.find((r) => r.id === "act")?.done === 0);
  check(`${tag} every row has a Take button at least 40px tall`, rows.every((r) => r.take >= 40), JSON.stringify(rows.map((r) => r.take)));
  check(`${tag} no row runs past the screen or is cut (long names included)`, rows.every((r) => r.right <= width + 0.5 && r.scrollW <= r.clientW + 1), JSON.stringify(rows.filter((r) => r.right > width || r.scrollW > r.clientW + 1).map((r) => r.id)));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`${tag} the page has no sideways overflow`, overflow <= 0, String(overflow));

  // ---- One Approach: today's view, plus its single row ----
  await tap(page, '#exploreModeRow [data-v="one"]');
  const one = await page.evaluate(() => ({ aa: !!document.querySelector(".aa-wheel"), rings: document.querySelectorAll('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="ayah"]').length, rows: document.querySelectorAll('[data-aa-rows="surah"] .aa-row').length, capsule: document.getElementById("exploreApproachRow").getBoundingClientRect().height > 0, pressed: document.querySelector('#exploreModeRow [data-v="one"]').getAttribute("aria-pressed") }));
  check(`${tag} One Approach: the ring wheel (29 Ayah arcs), the Approach picker, one row`, !one.aa && one.rings === 29 && one.capsule && one.rows === 1 && one.pressed === "true", JSON.stringify(one));
  await tap(page, '#exploreModeRow [data-v="all"]');

  // ---- a slice tap opens that Ayah ----
  await tap(page, '.aa-hit[data-key="2"]');
  let c = await crumbs(page);
  check(`${tag} tapping Ayah 3's slice opens the Ayah level (Whole Quran > Surah > Ayah 3)`, c.length === 3 && bnDigits(c[2]).includes("3"), JSON.stringify(c));
  const ay = await page.evaluate(() => ({ ar: document.querySelector(".aa-ayah-ar")?.textContent.length ?? 0, tr: document.querySelectorAll(".aa-ayah-tr").length, slices: document.querySelectorAll("#exploreWheelContainer .wheel-seg").length, rows: [...document.querySelectorAll('[data-aa-rows="ayah"] .aa-row')].map((r) => [r.dataset.aaRow, r.dataset.status]), centre: document.querySelector("#exploreWheelContainer svg.mastery-wheel").textContent.replace(/\s+/g, " ") }));
  check(`${tag} the Ayah level shows the Arabic and a translation`, ay.ar > 5 && ay.tr >= 1, JSON.stringify({ ar: ay.ar, tr: ay.tr }));
  check(`${tag} the Ayah wheel has one slice per Approach (10) and the centre says 4 of 10 Achieved+ ... 3 of 10`, ay.slices === 10 && /3/.test(bnDigits(ay.centre)) && /10/.test(bnDigits(ay.centre)), JSON.stringify({ s: ay.slices, c: ay.centre }));
  const want = { memorise: "mastered", recite: "mastered", tajweed: "achieved", listen: "practising", read_daily: "practising", translate: "practising", tafsir: "learning", word_by_word: "not_started", reflect: "not_started", act: "not_started" };
  check(`${tag} every Approach row carries the right status chip`, Object.entries(want).every(([id, st]) => ay.rows.some((r) => r[0] === id && r[1] === st)) && ay.rows.length === 10, JSON.stringify(ay.rows));
  const chip = await page.evaluate(() => document.querySelector('[data-aa-row="memorise"] .status-chip')?.className);
  check(`${tag} the status chip is drawn in its status class`, /chip-mastered/.test(chip ?? ""), chip);

  // ---- Back, Previous / Next on the Ayah ----
  await tap(page, '[data-aa="ayah-next"]');
  c = await crumbs(page);
  check(`${tag} Next goes to Ayah 4`, bnDigits(c.at(-1)).includes("4"), JSON.stringify(c));
  await tap(page, '[data-aa="ayah-prev"]');
  await tap(page, '[data-aa="ayah-prev"]');
  c = await crumbs(page);
  check(`${tag} Previous twice goes to Ayah 2`, bnDigits(c.at(-1)).includes("2"), JSON.stringify(c));
  await tap(page, '[data-aa="ayah-prev"]');
  const atFirst = await page.evaluate(() => ({ prev: document.querySelector('[data-aa="ayah-prev"]').disabled, next: document.querySelector('[data-aa="ayah-next"]').disabled }));
  check(`${tag} at Ayah 1, Previous is disabled and Next is not`, atFirst.prev && !atFirst.next, JSON.stringify(atFirst));
  for (let i = 0; i < 28; i++) await page.click('[data-aa="ayah-next"]', { timeout: 8000 });
  await page.waitForTimeout(300);
  const atLast = await page.evaluate(() => ({ prev: document.querySelector('[data-aa="ayah-prev"]').disabled, next: document.querySelector('[data-aa="ayah-next"]').disabled, crumb: document.querySelector("#exploreBreadcrumb .explore-crumb.active").textContent }));
  check(`${tag} at Ayah 29, Next is disabled and Previous is not`, atLast.next && !atLast.prev && bnDigits(atLast.crumb).includes("29"), JSON.stringify(atLast));
  const nav = await page.evaluate(() => [...document.querySelectorAll("#exploreNavBar button")].map((b) => ({ h: b.getBoundingClientRect().height, cut: b.scrollWidth > b.clientWidth + 1, right: b.getBoundingClientRect().right })));
  check(`${tag} nav buttons: 40px+, nothing cut, nothing past the screen`, nav.every((b) => b.h >= 40 && !b.cut && b.right <= width), JSON.stringify(nav));
  await tap(page, '[data-aa="up"]');
  check(`${tag} Back to the Surah returns to the Surah level`, (await sliceCount(page)) === 29 && (await crumbs(page)).length === 2);

  // ---- Back to the Whole Qur'an; Previous / Next Surah and the ends ----
  await tap(page, '[data-aa="next-surah"]');
  check(`${tag} Next Surah opens Surah 82 (19 Ayat)`, (await sliceCount(page)) === 19, String(await sliceCount(page)));
  await tap(page, '[data-aa="prev-surah"]');
  await tap(page, '[data-aa="prev-surah"]');
  check(`${tag} Previous Surah twice opens Surah 80 (42 Ayat)`, (await sliceCount(page)) === 42, String(await sliceCount(page)));
  const sNav = await page.evaluate(() => [...document.querySelectorAll("#exploreNavBar button")].map((b) => ({ h: b.getBoundingClientRect().height, right: b.getBoundingClientRect().right, aria: b.getAttribute("aria-label") })));
  check(`${tag} the Surah nav buttons are 40px+ and inside the screen, and name the Surahs`, sNav.length === 3 && sNav.every((b) => b.h >= 40 && b.right <= width) && /Surah|সূরা/.test(sNav[1].aria) && /Surah|সূরা/.test(sNav[2].aria), JSON.stringify(sNav));
  await tap(page, '[data-aa="back"]');
  check(`${tag} ← Back goes to the Whole Quran`, (await crumbs(page)).length === 1 && !(await sliceCount(page)));
  await goSurah(page, 1);
  const first = await page.evaluate(() => ({ prev: document.querySelector('[data-aa="prev-surah"]').disabled, next: document.querySelector('[data-aa="next-surah"]').disabled }));
  check(`${tag} Surah 1: no previous (disabled), next enabled`, first.prev && !first.next, JSON.stringify(first));
  await tap(page, '[data-aa="back"]');
  await goSurah(page, 114);
  const lastS = await page.evaluate(() => ({ prev: document.querySelector('[data-aa="prev-surah"]').disabled, next: document.querySelector('[data-aa="next-surah"]').disabled }));
  check(`${tag} Surah 114: no next (disabled), previous enabled`, lastS.next && !lastS.prev, JSON.stringify(lastS));
  await tap(page, '[data-aa="back"]');
  await goSurah(page, 81);

  // ---- Take on the Ayah level: the sheet, and the write ----
  await tap(page, '.aa-hit[data-key="2"]');
  await page.click('[data-aa-row="act"] .aa-take');
  await page.waitForSelector(".aa-sheet", { timeout: 8000 });
  const sheet = await page.evaluate(() => { const s = document.querySelector(".aa-sheet").getBoundingClientRect(); return { h4: document.querySelector(".aa-sheet h4").textContent, sub: document.querySelector(".aa-sub").textContent, acts: [...document.querySelectorAll("[data-aa-act]")].map((b) => b.dataset.aaAct), recs: [...document.querySelectorAll("[data-aa-rec]")].map((b) => ({ s: b.dataset.aaRec, h: b.getBoundingClientRect().height, fg: getComputedStyle(b).color, bg: getComputedStyle(b).backgroundColor })), note: !!document.querySelector("[data-aa-mastered-note]"), left: s.left, right: s.right, bottom: s.bottom, scrollW: document.querySelector(".aa-sheet").scrollWidth, clientW: document.querySelector(".aa-sheet").clientWidth }; });
  check(`${tag} the sheet names the Approach and the unit, with Read / Listen / Guide (no Write for a non-writing Approach)`, /9:122|৯:১২২/.test(sheet.h4) && /3|৩/.test(sheet.sub) && JSON.stringify(sheet.acts) === '["read","listen","guide"]', JSON.stringify(sheet));
  // Updated in place by the Architect's review: the sheet offers the Track card's own stages (Owner, 1 Oct 2026):
  // Not started and N/A always, Mastered only to someone whose claim is not waiting on a teacher (the owner here),
  // each in its wheel-legend colour with the text colour measured to read on it (dark on Achieved, not white).
  check(`${tag} the sheet offers the Track card's stages for an owner: Not started to Mastered and N/A, each 40px+, no teacher note`, JSON.stringify(sheet.recs.map((r) => r.s)) === '["not_started","learning","practising","achieved","mastered","not_applicable"]' && sheet.recs.every((r) => r.h >= 40) && !sheet.note, JSON.stringify(sheet.recs));
  const achievedBtn = sheet.recs.find((r) => r.s === "achieved");
  check(`${tag} Achieved wears the legend's colour with dark text (white on it read 3:1)`, achievedBtn?.bg === "rgb(91, 132, 196)" && achievedBtn?.fg === "rgb(17, 24, 39)", JSON.stringify(achievedBtn));
  check(`${tag} the sheet fits the screen with no sideways overflow`, sheet.left >= 0 && sheet.right <= width + 0.5 && sheet.scrollW <= sheet.clientW + 1, JSON.stringify(sheet));
  const picker = await page.evaluate(() => !!document.querySelector(".aa-sheet [data-claim-for]"));
  console.log(`  INFO  ${tag} 👥 family picker in the sheet: ${picker} (shown only when the person has family members to record for)`);
  const w0 = await writeCount(page);
  await page.click('[data-aa-rec="learning"]');
  await page.waitForFunction(() => !document.querySelector(".aa-sheet"), null, { timeout: 8000 });
  await page.waitForTimeout(500);
  const wr = await lastWrite(page, w0);
  check(`${tag} Take > Learning writes the same document and fields the Track card writes (surah_81, ayah:81:3::act)`, wr?.id === "t1__p1__surah_81" && wr.data?.["entries.ayah:81:3::act"]?.claimedStatus === "learning" && wr.data["entries.ayah:81:3::act"].trackableId === "act", JSON.stringify(wr && { id: wr.id, keys: Object.keys(wr.data ?? {}) }));
  const chipAfter = await page.evaluate(() => document.querySelector('[data-aa-row="act"] .status-chip')?.className);
  check(`${tag} the Ayah row repaints in place as Learning`, /chip-learning/.test(chipAfter ?? ""), chipAfter);
  await tap(page, '[data-aa="up"]');
  const ariaAfter = await page.evaluate(() => document.querySelector('.aa-hit[data-key="2"]').getAttribute("aria-label"));
  check(`${tag} the slice repaints: Ayah 3 now has 2 Learning and 2 Not started`, ariaAfter.endsWith(T[lang].wordsAfter), ariaAfter);
  const bandsAfter = await page.evaluate(() => [...document.querySelectorAll('.aa-slice[data-slice="2"] .aa-band')].map((b) => b.dataset.band));
  check(`${tag} the stacked bar still runs Mastered to Not started after the write`, JSON.stringify(bandsAfter) === JSON.stringify(ORDER), JSON.stringify(bandsAfter));

  // ---- Take on the Surah level: the whole Surah ----
  await page.click('[data-aa-row="recite"] .aa-take');
  await page.waitForSelector(".aa-sheet", { timeout: 8000 });
  const sub2 = await page.evaluate(() => document.querySelector(".aa-sub").textContent);
  const w1 = await writeCount(page);
  await page.click('[data-aa-rec="practising"]');
  await page.waitForFunction(() => !document.querySelector(".aa-sheet"), null, { timeout: 8000 });
  await page.waitForTimeout(500);
  const wr2 = await lastWrite(page, w1);
  check(`${tag} Take on a Surah row records the WHOLE Surah (surah:81::recite)`, !!wr2 && wr2.id === "t1__p1__surah_81" && wr2.data?.["entries.surah:81::recite"]?.claimedStatus === "practising", JSON.stringify(wr2 && { id: wr2.id, keys: Object.keys(wr2.data ?? {}), sub2 }));
  check(`${tag} no page errors`, errors.length === 0, errors.join(" | "));
  await page.screenshot({ path: `/tmp/aa-${lang}-${width}.png` });
  // A student (View as Student): four stages and N/A, no Mastered, and the teacher note -- the Track card's rule.
  if (width === 390) {
    await page.evaluate(() => { const c = JSON.parse(localStorage.getItem("qr.sessionContext") || "null"); if (c) { c.viewAsRole = "student"; localStorage.setItem("qr.sessionContext", JSON.stringify(c)); } });
    await page.reload();
    await page.waitForSelector("#tabExploreBtn", { timeout: 20000 });
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((el) => el.remove()));
    await page.click("#tabExploreBtn");
    await page.waitForFunction(() => !!document.querySelector("#exploreWheelContainer svg"), null, { timeout: 15000 });
    const isStudent = await page.evaluate(() => JSON.parse(localStorage.getItem("qr.sessionContext") || "null")?.viewAsRole);
    check(`${tag} (setup) the student preview is really on`, isStudent === "student", String(isStudent));
    await goSurah(page, 81);
    await tap(page, '.aa-hit[data-key="2"]');
    await page.click('[data-aa-row="act"] .aa-take');
    await page.waitForSelector(".aa-sheet", { timeout: 8000 });
    const st = await page.evaluate(() => ({ recs: [...document.querySelectorAll("[data-aa-rec]")].map((b) => b.dataset.aaRec), note: document.querySelector("[data-aa-mastered-note]")?.textContent.trim() ?? null }));
    check(`${tag} a student is offered four stages and N/A, no Mastered, with the teacher note in ${lang}`, JSON.stringify(st.recs) === '["not_started","learning","practising","achieved","not_applicable"]' && st.note === (lang === "bn" ? "আয়ত্ত হয়েছে কিনা তা একজন শিক্ষক নিশ্চিত করেন।" : "Mastered is confirmed by a teacher."), JSON.stringify(st));
  }
  await ctx.close();
}

// AA_ONLY="en:390" runs one configuration (used for the mutation runs); the default is all six.
const only = process.argv[2];
for (const lang of ["en", "bn"]) for (const width of [390, 820, 1280]) if (!only || only === `${lang}:${width}`) await run(lang, width);
await browser.close();
console.log(`\n==== Explore all Approaches (decision 82): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
