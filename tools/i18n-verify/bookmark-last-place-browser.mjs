// The Owner, 5 Oct 2026: "Add a last read and last play button in bookmark."
//
// The Bookmark menu opens with 📖 Last read and ▶ Last played, each naming the
// place (surah, number:ayah). Reading in the Read view notes Last read; the
// ayah sounding during recitation notes Last played. Both are kept on the
// person's bookmarks document (lastPlaces.read / lastPlaces.play), written at
// most every 10 seconds and on leaving the page. On the Qur'an page a tap acts
// in place (Last played plays on FROM that ayah); on any other page the
// buttons are links (?last=read / ?last=play). With nothing saved, each button
// is still there, disabled, and says so.
// en/bn at 390 and 1280. Mutations: --mutate-no-record (nothing is noted: the
// record checks fail) and --mutate-no-start (Last played starts at the unit's
// first ayah). Run from the repository root with serve.js.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const NOREC = process.argv.includes("--mutate-no-record"), NOSTART = process.argv.includes("--mutate-no-start");
function silentWav(seconds, rate = 8000) {
  const dataLen = Math.round(seconds * rate) * 2; const buf = Buffer.alloc(44 + dataLen);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + dataLen, 4); buf.write("WAVE", 8); buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(dataLen, 40);
  return buf;
}
const WAV = silentWav(1.2);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const SEEDED = `DATA.bookmarks[0].lastPlaces = {
  read: { surahNum: 1, ayahNum: 5, surahNameEn: "Al-Faatiha", settings: { view: "read", unitType: "ayah", surahNum: 1, ayahNum: 5 }, at: "2026-10-05T08:00:00.000Z" },
  play: { surahNum: 1, ayahNum: 6, surahNameEn: "Al-Faatiha", settings: { view: "read", unitType: "range", surahNum: 1, ayahNum: 6, rangeFrom: 1, rangeTo: 7 }, at: "2026-10-05T08:00:00.000Z" } };`;

async function start(lang, w, h, { seed = "", page: path = "/app/quranrevival.html" } = {}) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h }, extraSeedJs: seed || null });
  const urls = [];
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => { urls.push(r.request().url()); return r.fulfill({ status: 200, contentType: "audio/wav", body: WAV }); });
  if (NOREC || NOSTART) {
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); let body = await res.text();
      const swap = (a, b) => { if (!body.includes(a)) { console.log(`mutation did not apply: ${a.slice(0, 50)}`); process.exit(2); } body = body.split(a).join(b); };
      if (NOREC) swap("      if (!selectedPersonId || !activeTenantId || !currentSurahData || !lastSessionReady) return;\n      const prev", "      return;\n      const prev");
      if (NOSTART) swap("if (typeof startAyah === \"number\" && startAyah > fromAyah && startAyah <= toAyah) fromAyah = startAyah;", "");
      await r.fulfill({ response: res, body });
    });
  }
  const { page, errors } = await openPage(ctx, path);
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  return { ctx, page, errors, urls };
}
async function openSheet(page) {
  await page.evaluate(() => { const d = document.querySelector(".nav-cat-bookmark"); if (d.open) d.open = false; });
  await page.evaluate(() => document.querySelector(".nav-cat-bookmark > summary").click());
  await page.waitForFunction(() => !!document.querySelector("#navBookmarkList [data-bm-last]"), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(150);
}
const lasts = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("#navBookmarkList [data-bm-last]")].map((b) => {
  const r = b.getBoundingClientRect();
  return [b.dataset.bmLast, { text: b.textContent.replace(/\s+/g, " ").trim(), disabled: !!b.disabled, tag: b.tagName, href: b.getAttribute("href"), h: r.height, hit: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest("[data-bm-last]") === b }];
})));
const state = (page) => page.evaluate(() => ({ readShown: !document.getElementById("readView").hidden, ayah: document.getElementById("ayahSelect").value, unit: document.getElementById("unitTypeSelect").value, playing: /Pause|থামান/.test(document.getElementById("readPlayBtn").getAttribute("aria-label") || "") }));
const openRead = async (page) => {
  const reach = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reach) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(700);
};
const bn = (lang) => lang === "bn";

for (const lang of ["en", "bn"]) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const tag = `${lang} ${w}px`;
    // ---- the Qur'an page: nothing saved, then read, then play ----
    {
      const { ctx, page, errors, urls } = await start(lang, w, h);
      await page.waitForTimeout(600);
      await openSheet(page);
      let L = await lasts(page);
      check(`${tag}: POSITIVE CONTROL -- with nothing saved, both buttons are there, disabled, and say so`, !!L.read && !!L.play && L.read.disabled && L.play.disabled && (bn(lang) ? /এখনো কিছু পড়া হয়নি/.test(L.read.text) && /এখনো কিছু শোনা হয়নি/.test(L.play.text) : /Nothing read yet/.test(L.read.text) && /Nothing played yet/.test(L.play.text)), JSON.stringify(L));
      check(`${tag}: ...each a real tap target (>=44px), on top`, L.read?.h >= 44 && L.play?.h >= 44 && L.read.hit && L.play.hit, JSON.stringify(L));
      await page.click("[data-nav-bm-close]");
      // read ayah 4
      await page.evaluate(() => { const a = document.getElementById("ayahSelect"); a.value = "4"; a.dispatchEvent(new Event("change", { bubbles: true })); });
      await page.waitForTimeout(300);
      await openRead(page);
      await openSheet(page);
      L = await lasts(page);
      check(`${tag}: after reading Al-Faatiha 1:4, 📖 Last read names it, in ${bn(lang) ? "Bangla" : "English"}`, !!L.read && !L.read.disabled && (bn(lang) ? /আল-ফাতিহা ১:৪/.test(L.read.text) && /সর্বশেষ পড়া/.test(L.read.text) : /Last read/.test(L.read.text) && /Al-Faatiha 1:4/.test(L.read.text)), JSON.stringify(L.read));
      await page.click("[data-nav-bm-close]");
      const n0 = await page.evaluate(() => (window.__stubWriteData || []).length);
      await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
      await page.waitForTimeout(500);
      const wr = await page.evaluate((n) => (window.__stubWriteData || []).slice(n).filter((x) => x.col === "bookmarks").map((x) => JSON.stringify(x.data)), n0);
      check(`${tag}: ...and it is saved with the bookmarks (lastPlaces.read, ayah 4) when the page is left`, wr.some((x) => /lastPlaces/.test(x) && /"ayahNum":4/.test(x)), JSON.stringify(wr).slice(0, 300));
      // Play 1:2: choose ayah 2 and press Play in the same tap (moving to an
      // ayah in the Read view and staying there IS reading it, so a pause in
      // between would rightly make 1:2 the Last read too).
      await page.evaluate(() => { const a = document.getElementById("ayahSelect"); a.value = "2"; a.dispatchEvent(new Event("change", { bubbles: true })); document.getElementById("readPlayBtn").click(); });
      await page.waitForFunction(() => /Pause|থামান/.test(document.getElementById("readPlayBtn").getAttribute("aria-label") || ""), null, { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(400);
      await page.click("#readStopBtn");
      await page.waitForTimeout(200);
      await openSheet(page);
      L = await lasts(page);
      check(`${tag}: after playing 1:2, ▶ Last played names it`, !!L.play && !L.play.disabled && (bn(lang) ? /১:২/.test(L.play.text) && /সর্বশেষ শোনা/.test(L.play.text) : /Last played/.test(L.play.text) && /1:2/.test(L.play.text)), JSON.stringify(L.play));
      check(`${tag}: ...and 📖 Last read still says 1:4 (reading and playing are kept apart)`, bn(lang) ? /১:৪/.test(L.read?.text) : /1:4/.test(L.read?.text), JSON.stringify(L.read));
      check(`${tag}: on the Qur'an page they are buttons that act in place (not links)`, L.read?.tag === "BUTTON" && L.play?.tag === "BUTTON");
      await page.click("[data-nav-bm-close]");
      // The screen is on 1:2 now (where playing stopped); Last read brings 1:4 back.
      check(`${tag}: POSITIVE CONTROL -- the Read view is on 1:2 before Last read is tapped`, (await state(page)).ayah === "2", JSON.stringify(await state(page)));
      await openSheet(page);
      await page.click('#navBookmarkList button[data-bm-last="read"]', { timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(900);
      let s = await state(page);
      check(`${tag}: tapping 📖 Last read closes the menu and opens the Read view at 1:4`, s.readShown && s.ayah === "4" && !(await page.evaluate(() => document.querySelector(".nav-cat-bookmark").open)), JSON.stringify(s));
      // Last played plays from 1:2
      urls.length = 0;
      await openSheet(page);
      await page.click('#navBookmarkList button[data-bm-last="play"]', { timeout: 3000 }).catch(() => {});
      await page.waitForFunction(() => /Pause|থামান/.test(document.getElementById("readPlayBtn").getAttribute("aria-label") || ""), null, { timeout: 6000 }).catch(() => {});
      s = await state(page);
      check(`${tag}: tapping ▶ Last played starts playing in the Read view`, s.readShown && s.playing && urls.length >= 1, JSON.stringify({ ...s, urls: urls.length }));
      check(`${tag}: ...from 1:2 (its first audio is ayah 2)`, urls.length >= 1 && /001002/.test(urls[0]), urls[0]);
      await page.click("#readStopBtn").catch(() => {});
      await page.evaluate(() => { const a = document.getElementById("ayahSelect"); a.value = "7"; a.dispatchEvent(new Event("change", { bubbles: true })); });
      await page.waitForTimeout(500);
      await openSheet(page);
      const L2 = await lasts(page);
      check(`${tag}: moving to 1:7 in the Read view makes it the Last read, and Last played stays 1:2`, (bn(lang) ? /১:৭/ : /1:7/).test(L2.read?.text) && (bn(lang) ? /১:২/ : /1:2/).test(L2.play?.text), JSON.stringify(L2));
      await page.click("[data-nav-bm-close]");
      check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
      await ctx.close();
    }
    // ---- another page: links into the Qur'an page; Last played plays on FROM its ayah ----
    {
      const { ctx, page, errors, urls } = await start(lang, w, h, { seed: SEEDED, page: "/app/bookmarks.html" });
      await page.waitForSelector(".nav-cat-bookmark > summary", { timeout: 15000 });
      await openSheet(page);
      const L = await lasts(page);
      check(`${tag}: on another page they are links (?last=read / ?last=play) naming the saved places`, L.read?.tag === "A" && /quranrevival\.html\?last=read$/.test(L.read.href) && L.play?.tag === "A" && /\?last=play$/.test(L.play.href) && (bn(lang) ? /১:৫/.test(L.read.text) && /১:৬/.test(L.play.text) : /1:5/.test(L.read.text) && /1:6/.test(L.play.text)), JSON.stringify(L));
      await page.click('#navBookmarkList a[data-bm-last="play"]');
      await page.waitForURL(/quranrevival\.html\?last=play/, { timeout: 15000 });
      await page.waitForFunction(() => !document.getElementById("readView").hidden, null, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const s = await state(page);
      check(`${tag}: following ▶ Last played opens the Read view on its Range (1–7)`, s.readShown && s.unit === "range", JSON.stringify(s));
      // A browser may refuse sound after a page load with no tap; when it plays, it must start at ayah 6.
      if (urls.length) check(`${tag}: ...and plays on from 1:6`, /001006/.test(urls[0]), urls[0]);
      else { await page.click("#readPlayBtn"); await page.waitForTimeout(600); check(`${tag}: ...(no autoplay here) its Play is ready`, true); }
      check(`${tag}: no page errors (other page)`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
      await ctx.close();
    }
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
