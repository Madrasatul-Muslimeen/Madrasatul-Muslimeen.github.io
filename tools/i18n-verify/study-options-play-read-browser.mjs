// Issue #409 -- Study options: Play opens the selected view, Read opens it
// without sound, and the Loop / Read / Play row is tidy.
//
// Run from the repository root, with serve.js on :8080.
// Expected values are written by hand (surah 1 has 7 ayahs).
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

function silentWav(seconds, rate = 8000) {
  const dataLen = Math.round(seconds * rate) * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + dataLen, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(dataLen, 40);
  return buf;
}
const WAV = silentWav(2);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function start(lang = "en", width = 390) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 844 } });
  const urls = [];
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => { urls.push(r.request().url()); return r.fulfill({ status: 200, contentType: "audio/wav", body: WAV }); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  return { ctx, page, urls };
}
const openOptions = async (page) => {
  await page.click("#tabStudyBtn");
  await page.waitForTimeout(120);
  await page.click("#tabStudyOptionsBtn");
  await page.waitForTimeout(200);
};
const state = (page) => page.evaluate(() => ({
  optionsHidden: document.getElementById("panelStudyOptions").hidden,
  readShown: !document.getElementById("readView").hidden,
  ayah: document.getElementById("ayahSelect").value,
  body: document.body.className,
  playLabel: document.getElementById("readPlayBtn")?.getAttribute("aria-label") || "",
}));
const waitFor = (page, fn) => page.waitForFunction(fn, null, { timeout: 6000 }).then(() => true).catch(() => false);
const PLAYING = () => /Pause|থামান/.test(document.getElementById("readPlayBtn").getAttribute("aria-label") || "");

console.log("\n=== Study options: Play and Read (#409) ===");
{
  // Play: closes options, opens the view at ayah 4, starts sound.
  const { ctx, page, urls } = await start();
  await openOptions(page);
  await page.selectOption("#unitTypeSelect", "ayah");
  await page.selectOption("#ayahSelect", "4").catch(() => {});
  await page.waitForTimeout(300);
  const before = await state(page);
  check("setup: options are open and the reading view is not", !before.optionsHidden && !before.readShown, JSON.stringify(before));
  await page.click("#drillPlayBtn");
  const playing = await waitFor(page, PLAYING);
  const s = await state(page);
  check("Play closes Study options", s.optionsHidden, JSON.stringify(s));
  check("Play shows the reading view", s.readShown, JSON.stringify(s));
  check("Play opens at the selected ayah (4)", s.ayah === "4" || Number(s.ayah) >= 4, s.ayah);
  check("Play starts the recitation (button reads Pause, audio requested)", playing && urls.length >= 1, `${playing} ${urls.length}`);
  await ctx.close();
}
{
  // Read with the default reciter UNTICKED: no sound, options closed, view open.
  const { ctx, page, urls } = await start();
  await openOptions(page);
  await page.selectOption("#unitTypeSelect", "ayah");
  await page.selectOption("#ayahSelect", "4").catch(() => {});
  await page.waitForTimeout(300);
  for (const c of await page.$$(".drill-reciter-check:checked")) await c.uncheck();
  const ticked = await page.$$eval(".drill-reciter-check:checked", (e) => e.length);
  check("setup: no reciter is ticked", ticked === 0, String(ticked));
  const readBtn = await page.evaluate(() => {
    const b = document.getElementById("drillReadBtn");
    const r = b?.getBoundingClientRect();
    return { there: !!b, disabled: b?.disabled, h: r?.height, text: b?.textContent.trim() };
  });
  check("Read is enabled with no reciter ticked and at least 40px tall",
    readBtn.there && !readBtn.disabled && readBtn.h >= 40, JSON.stringify(readBtn));
  await page.click("#drillReadBtn");
  await page.waitForTimeout(800);
  const s = await state(page);
  check("Read closes Study options", s.optionsHidden, JSON.stringify(s));
  check("Read shows the reading view at the selected ayah", s.readShown && s.ayah === "4", JSON.stringify(s));
  check("Read starts no audio", urls.length === 0 && !/Pause|থামান/.test(s.playLabel), `${urls.length} ${s.playLabel}`);
  await ctx.close();
}
{
  // Read leaves sound that is already playing alone.
  const { ctx, page, urls } = await start();
  await openOptions(page);
  await page.click("#drillPlayBtn");
  await waitFor(page, PLAYING);
  await openOptions(page);
  await page.click("#drillReadBtn");
  await page.waitForTimeout(500);
  const s = await state(page);
  check("Read while playing leaves the recitation playing", /Pause|থামান/.test(s.playLabel) && s.readShown && s.optionsHidden, JSON.stringify(s));
  await ctx.close();
}
{
  // The view that opens follows the selection: two units, and Mushaf on/off.
  const { ctx, page } = await start();
  await openOptions(page);
  await page.selectOption("#unitTypeSelect", "ruku");
  await page.waitForTimeout(400);
  await page.click("#drillReadBtn");
  await page.waitForTimeout(500);
  const ruku = await state(page);
  check("unit Ruku' opens at the unit's first ayah (1)", ruku.readShown && ruku.ayah === "1", JSON.stringify(ruku));
  await openOptions(page);
  await page.selectOption("#unitTypeSelect", "ayah");
  await page.waitForTimeout(300);
  await page.selectOption("#ayahSelect", "5").catch(() => {});
  await page.click("#drillReadBtn");
  await page.waitForTimeout(500);
  const ayah = await state(page);
  check("unit Ayah 5 opens at ayah 5", ayah.readShown && ayah.ayah === "5", JSON.stringify(ayah));
  // Mushaf off vs on: the opened view differs.
  await openOptions(page);
  const off = await page.evaluate(() => document.getElementById("mushafToggle").checked);
  await page.check("#mushafToggle");
  await page.waitForTimeout(200);
  await page.click("#drillReadBtn");
  await page.waitForTimeout(600);
  const on = await state(page);
  check("Mushaf off -> on changes the view that Read opens", off === false && on.readShown && on.body !== ayah.body, `${ayah.body} | ${on.body}`);
  await ctx.close();
}

// Layout: the row at every width in both languages.
for (const lang of ["en", "bn"]) {
  for (const width of [320, 360, 390, 412, 768, 1280]) {
    const { ctx, page } = await start(lang, width);
    await openOptions(page);
    const r = await page.evaluate(() => {
      const box = (id) => { const b = document.getElementById(id).getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, h: b.height }; };
      const loop = document.querySelector(".loop-inline").getBoundingClientRect();
      const ids = ["drillRepeatSelect", "drillModeSelect", "drillReadBtn", "drillPlayBtn"];
      const boxes = ids.map(box);
      boxes.push({ l: loop.left, r: loop.right, t: loop.top, b: loop.bottom, h: loop.height });
      const overlap = [];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5) overlap.push(`${i}x${j}`);
      }
      const cut = [document.querySelector(".loop-inline"), document.getElementById("drillReadBtn"), document.getElementById("drillPlayBtn")]
        .filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.id || e.className);
      const bar = document.querySelector(".opt-bar-listen").getBoundingClientRect();
      const inside = boxes.every((b) => b.l >= bar.left - 1 && b.r <= bar.right + 1);
      return { overlap, cut, inside, sw: document.documentElement.scrollWidth, readH: boxes[2].h, playH: boxes[3].h, sameSize: Math.abs(boxes[2].r - boxes[2].l - (boxes[3].r - boxes[3].l)) < 1.5 };
    });
    const tag = `${lang} ${width}px`;
    check(`${tag} no control in the listening row overlaps another`, r.overlap.length === 0, JSON.stringify(r));
    check(`${tag} nothing is cut (Loop, Read, Play)`, r.cut.length === 0, JSON.stringify(r));
    check(`${tag} every control sits inside the row and the page does not scroll sideways`, r.inside && r.sw <= width + 1, JSON.stringify(r));
    check(`${tag} Read and Play are >= 40px tall and the same size`, r.readH >= 40 && r.playH >= 40 && (width > 480 || r.sameSize), JSON.stringify(r));
    await ctx.close();
  }
}

// The Owner, 4 Oct 2026: "I had a listening bookmark. I opened it. It played.
// I Reset the settings. Clicked play but it didn't. ... The Read/play button at
// the settings should be enough to start the desired read/play act."
// Reproduced: while a recitation is still SOUNDING, Study options' Play (and
// Choose a Unit's) was the reading screen's play/pause toggle, so it PAUSED;
// a paused one was resumed with its old settings. A settings Play now always
// starts the current settings from the beginning. A real recitation is long,
// so these cases serve a 30-second clip (the 2-second one above ends before
// the reader can get back to the settings, which is how this hid).
// Mutation: --mutate-no-fresh serves the page with the settings Play's
// `{ fresh: true }` removed; the "still sounding" cases must fail.
{
  const MUT_NO_FRESH = process.argv.includes("--mutate-no-fresh");
  const LONG = silentWav(30);
  const { readFileSync } = await import("node:fs");
  async function startLong() {
    const ctx = await newContext(browser, { appLang: "en", banner: false, viewport: { width: 390, height: 844 } });
    const urls = [];
    await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    await ctx.route("**/archive.org/**", (r) => { urls.push(r.request().url()); return r.fulfill({ status: 200, contentType: "audio/wav", body: LONG }); });
    if (MUT_NO_FRESH) {
      let src = readFileSync("app/quranrevival.html", "utf8");
      const n = (src.match(/playCurrentSelection\(\{ fresh: true \}\)/g) || []).length;
      if (n !== 2) { console.log(`mutation did not apply (${n} sites)`); process.exit(2); }
      src = src.replaceAll("playCurrentSelection({ fresh: true })", "playCurrentSelection()");
      await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src }));
    }
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    page.on("dialog", (d) => d.dismiss().catch(() => {}));
    return { ctx, page, urls };
  }
  const backToOptions = async (page) => {
    await page.evaluate(() => { const b = document.getElementById("readBackBtn") || document.querySelector("[data-read-back]"); if (b) b.click(); });
    await page.waitForTimeout(300);
    await openOptions(page);
  };
  const sounding = (page) => page.evaluate(PLAYING);
  const first = async () => {
    const r = await startLong();
    await openOptions(r.page);
    await r.page.selectOption("#unitTypeSelect", "ayah");
    await r.page.selectOption("#ayahSelect", "4").catch(() => {});
    await r.page.waitForTimeout(300);
    await r.page.click("#drillPlayBtn");
    r.started = await waitFor(r.page, PLAYING);
    return r;
  };
  console.log("\n=== A settings Play always starts the settings (Owner, 4 Oct 2026) ===");
  {
    const { ctx, page, urls, started } = await first();
    check("setup: the first Play is sounding", started);
    await backToOptions(page);
    check("setup: still sounding when the settings are open again (a real, long recitation)", await sounding(page));
    const n = urls.length;
    await page.click("#drillPlayBtn");
    await page.waitForTimeout(800);
    check("Study options Play while a recitation is sounding STARTS it again (it used to pause)", await sounding(page), `new requests ${urls.length - n}`);
    check("...from the current settings: the āyah is requested again", urls.slice(n).some((u) => /001004\.mp3$/.test(u)), JSON.stringify(urls.slice(n)));
    await ctx.close();
  }
  {
    const { ctx, page, urls } = await first();
    await backToOptions(page);
    await page.selectOption("#drillRepeatSelect", "2");
    const n = urls.length;
    await page.click("#drillPlayBtn");
    await page.waitForTimeout(800);
    check("a changed setting (Repeat 2×) and Play while sounding: it plays", await sounding(page), `new requests ${urls.length - n}`);
    await ctx.close();
  }
  {
    const { ctx, page, urls } = await first();
    await page.click("#readPlayBtn");
    await page.waitForTimeout(300);
    check("the reading screen's own ▶/⏸ still PAUSES (its toggle is kept)", !(await sounding(page)));
    await backToOptions(page);
    await page.selectOption("#ayahSelect", "6").catch(() => {});
    await page.waitForTimeout(300);
    const n = urls.length;
    await page.click("#drillPlayBtn");
    await page.waitForTimeout(800);
    check("paused, then Play in the settings: the CURRENT āyah (6) starts, not the old one resumed", await sounding(page) && urls.slice(n).some((u) => /001006\.mp3$/.test(u)), JSON.stringify(urls.slice(n)));
    await page.click("#readPlayBtn");
    await page.waitForTimeout(300);
    check("...and ▶/⏸ pauses that one too", !(await sounding(page)));
    await page.click("#readPlayBtn");
    await page.waitForTimeout(500);
    check("...and ▶/⏸ resumes it", await sounding(page));
    await ctx.close();
  }
  {
    const { ctx, page, urls, started } = await first();
    check("setup (Choose a Unit): the first Play is sounding", started);
    await page.evaluate(() => { const b = document.getElementById("readBackBtn") || document.querySelector("[data-read-back]"); if (b) b.click(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { document.querySelectorAll(".qr-panel").forEach((p) => { p.hidden = true; }); });
    const n = urls.length;
    await page.evaluate(() => document.getElementById("wheelUnitPlayBtn").click());
    await page.waitForTimeout(800);
    check("Choose a Unit's Play while a recitation is sounding STARTS it again", await sounding(page), `new requests ${urls.length - n}`);
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
