// PCF MSA J110 (the Owner, 2 Nov 2026): Quran Study's two non-Mushaf views stay DISTINCT -- the ONE Ayah View (one āyah
// to study) and the Reading View (regular reading). The Owner ticked n110a A, B and C for the Reading View:
//   A. the layer switches (English / Bangla / WbW): "Under a button where no space (Mob). or in open bar in PC and tab
//      where space is available (but not to make another bar)."
//   B. the names on the button: "Reading View" and "ONE Ayah View".
//   C. the regular reading functions: the playing āyah highlighted and followed during recitation (and the jump back to
//      the unit's start fixed), the ⋮ on each āyah, and "last read" following the scroll.
// Expected values written BY HAND. Run from the repository root, serve.js on :8080.
//   --mutate=nofollow   markPlayingAyah() ignores the Reading View        -> the recitation checks fail
//   --mutate=nomenu     no ⋮ in the Reading View                            -> the ⋮ checks fail
//   --mutate=double     an added page wires every ⋮ again                   -> "one tap opens it" on the added page fails
//   --mutate=open       the phone keeps the switches open on the bar        -> the phone's "Show ▾" checks fail
//   --mutate=names      the old word "Meaning" on the button                -> the name checks fail
//   --mutate=lastread   the Reading View never notes the scroll            -> the last-read check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nofollow: [`      if (pageViewContainer.querySelector("[data-meaning-flow]")) {\n        const key = \`\${currentSurahNum}:\${ayahNum}\`;`, `      if (false) {\n        const key = \`\${currentSurahNum}:\${ayahNum}\`;`],
  nomenu: ["</span>${meaningQuickMenuHtml(g.surah, a.ayah)}</div>", "</span></div>"],
  double: ["        attachAyahQuickMenus(pageBox);", "        attachAyahQuickMenus(pageViewContainer);"],
  open: ["  @media (max-width: 599.98px) {\n    #readMeaningLayersSlot { position: relative; overflow: visible; }", "  @media (max-width: 1px) {\n    #readMeaningLayersSlot { position: relative; overflow: visible; }"],
  names: [`["📖", t("Reading View"),`, `["📖", t("Meaning"),`],
  lastread: [`      if (stageView !== "read" || readViewNow() !== "meaning" || isPlaying()) return;`, `      return;`],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SHOT_DIR = process.env.SHOT_DIR || "/tmp";

function silentWav(seconds = 1, rate = 8000) {
  const samples = Math.round(seconds * rate), dataLen = samples * 2, buf = Buffer.alloc(44 + dataLen);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + dataLen, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(dataLen, 40);
  return buf;
}
const WAV_AYAH = silentWav(0.6), WAV_SURAH = silentWav(3);
const TIMINGS = JSON.stringify({ 1: Array.from({ length: 7 }, (_, i) => ({ verse_key: `1:${i + 1}`, timestamp_from: i * 400, timestamp_to: (i + 1) * 400 })) });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
async function start(lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: TIMINGS }));
  await ctx.route("**/archive.org/**", (r) => r.fulfill({ status: 200, contentType: "audio/wav", body: /ShareefBayezidMahmud|al-quran-eng-mp3-audio/.test(r.request().url()) ? WAV_SURAH : WAV_AYAH }));
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const src = fs.readFileSync("app/quranrevival.html", "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const opened = await openPage(ctx, "/app/quranrevival.html");
  opened.page.on("dialog", (d) => d.dismiss().catch(() => {}));
  return { ctx, ...opened };
}
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
/** Al-Fātiḥa 1-7 as a Range, in the ONE Ayah View (the Mushaf tick cleared). */
async function openFatiha(page) {
  const ok = await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0);
  if (!ok) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", "1"); await page.waitForTimeout(1200);
  await setSel(page, "unitTypeSelect", "range"); await page.waitForTimeout(700);
  await setSel(page, "rangeFromSelect", "1"); await page.waitForTimeout(300);
  await setSel(page, "rangeToSelect", "7"); await page.waitForTimeout(700);
  await page.evaluate(() => { const t = document.getElementById("mushafToggle"); if (t?.checked) { t.checked = false; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(800);
}
const view = (page) => page.evaluate(() => document.querySelector("#pageViewContainer [data-meaning-flow]") ? "meaning" : document.querySelector("#pageViewContainer .hifz-page") ? "mushaf" : document.querySelector("#pageViewContainer .page-flow-ayah") ? "plain" : "?");
const word = (page) => page.evaluate(() => { const b = document.getElementById("readMeaningBtn"); return { word: b?.querySelector(".read-meaning-word")?.textContent.trim() ?? "", label: b?.getAttribute("aria-label") ?? "" }; });
async function goTo(page, want) {
  for (let i = 0; i < 4 && (await view(page)) !== want; i++) { await page.click("#readMeaningBtn"); await page.waitForTimeout(1300); }
  if (want === "meaning") await page.waitForFunction(() => document.querySelectorAll("#pageViewContainer [data-meaning-key]").length > 0, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);
}
const switches = (page) => page.evaluate(() => {
  const slot = document.getElementById("readMeaningLayersSlot"), bar = document.getElementById("readBar");
  const mb = slot?.querySelector("[data-ml-menu]"), mr = mb?.getBoundingClientRect();
  const labels = [...(slot?.querySelectorAll("label") ?? [])].map((l) => {
    const r = l.getBoundingClientRect();
    const hit = r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
    return { w: Math.round(r.width), h: Math.round(r.height), inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, hit: !!hit && l.contains(hit) };
  });
  return {
    inBar: !!bar && bar.contains(slot), slotShown: !!slot && !slot.hidden && slot.getBoundingClientRect().width > 0,
    btn: mr && mr.width > 0 ? { w: Math.round(mr.width), h: Math.round(mr.height), text: mb.textContent.trim(), expanded: mb.getAttribute("aria-expanded") } : null,
    labels, barH: Math.round(bar?.getBoundingClientRect().height ?? 0),
    active: document.activeElement?.dataset?.meaningLayer ?? null,
  };
});

for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 360], ["en", 768], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`;
  const phone = width < 600;
  const { ctx, page, errors } = await start(lang, width);
  await openFatiha(page);

  // ---- B: the names --------------------------------------------------------------------------------------------
  const W = lang === "bn" ? { rv: "পড়ার দৃশ্য", one: "এক আয়াত দৃশ্য", mushaf: "মুসহাফ" } : { rv: "Reading View", one: "ONE Ayah View", mushaf: "Mushaf" };
  const w0 = await word(page), v0 = await view(page);
  check(`${tag} B: in the ONE Ayah View the button names the next view "${W.rv}" (its tip too)`, v0 === "plain" && w0.word === W.rv && w0.label.startsWith(W.rv), JSON.stringify({ v0, ...w0 }));
  await goTo(page, "meaning");
  const w1 = await word(page);
  check(`${tag} B: in the Reading View it names the Mushaf next ("${W.mushaf}")`, (await view(page)) === "meaning" && w1.word === W.mushaf, JSON.stringify(w1));

  // ---- A: the switches ---------------------------------------------------------------------------------------
  const s0 = await switches(page);
  check(`${tag} A: the switches are in the Read bar's own slot (no new bar)`, s0.inBar && s0.slotShown, JSON.stringify(s0));
  if (phone) {
    check(`${tag} A: on a phone ONE "${lang === "bn" ? "দেখান" : "Show"} ▾" button, a finger's size, and the three switches folded away`, !!s0.btn && s0.btn.h >= 40 && s0.btn.text.startsWith(lang === "bn" ? "দেখান" : "Show") && s0.btn.expanded === "false" && s0.labels.length === 3 && s0.labels.every((l) => l.w === 0), JSON.stringify(s0));
    await page.click("#readMeaningLayersSlot [data-ml-menu]"); await page.waitForTimeout(250);
    const s1 = await switches(page);
    check(`${tag} A: a tap opens the three, each on screen, ≥40px tall and really under the finger`, s1.btn?.expanded === "true" && s1.labels.length === 3 && s1.labels.every((l) => l.w > 0 && l.h >= 40 && l.inView && l.hit), JSON.stringify(s1.labels));
    await page.screenshot({ path: `${SHOT_DIR}/j110-show-open-${lang}-${width}.png` });
    await page.click('#readMeaningLayersSlot [data-meaning-layer="wbw"]'); await page.waitForTimeout(1400);
    const s2 = await switches(page);
    check(`${tag} A: ticking a switch keeps the list open and the focus on that switch (the flow re-renders)`, s2.btn?.expanded === "true" && s2.labels.every((l) => l.w > 0) && s2.active === "wbw", JSON.stringify({ exp: s2.btn?.expanded, active: s2.active }));
    await page.click('#readMeaningLayersSlot [data-meaning-layer="wbw"]'); await page.waitForTimeout(1400);
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    const s3 = await switches(page);
    check(`${tag} A: Esc folds them away again`, s3.btn?.expanded === "false" && s3.labels.every((l) => l.w === 0), JSON.stringify(s3.btn));
    await page.click("#readMeaningLayersSlot [data-ml-menu]"); await page.waitForTimeout(200);
    await page.click("#pageViewContainer .meaning-page-rule"); await page.waitForTimeout(250); // a plain spot (a word would open its Word Card)
    const s4 = await switches(page);
    check(`${tag} A: a tap elsewhere folds them away`, s4.btn?.expanded === "false", JSON.stringify(s4.btn));
  } else {
    check(`${tag} A: on a tablet or computer no "Show ▾"; the three stand open on the bar, each tappable`, !s0.btn && s0.labels.length === 3 && s0.labels.every((l) => l.w > 0 && l.inView && l.hit), JSON.stringify(s0));
  }
  console.log(`  info ${tag} Read bar height in the Reading View: ${s0.barH}px`);

  // ---- C: the ⋮ on each āyah -----------------------------------------------------------------------------------
  const qm = await page.evaluate(() => {
    const arts = [...document.querySelectorAll("#pageViewContainer .meaning-ayah")];
    return { n: arts.length, withMenu: arts.filter((a) => a.querySelector(".meaning-ayah-head .ayah-quick-wrap [data-qm-toggle]")).length };
  });
  check(`${tag} C: every āyah in the Reading View carries a ⋮ (${qm.n})`, qm.n >= 7 && qm.withMenu === qm.n, JSON.stringify(qm));
  const openMenu = async (key) => {
    await page.evaluate((k) => document.querySelector(`#pageViewContainer [data-meaning-key="${k}"]`)?.scrollIntoView({ block: "center" }), key);
    await page.waitForTimeout(250);
    const sel = `#pageViewContainer [data-meaning-key="${key}"] [data-qm-toggle]`;
    if (!(await page.$(sel))) return null;
    await page.click(sel); await page.waitForTimeout(250);
    return page.evaluate((k) => {
      const m = document.querySelector(`#pageViewContainer [data-meaning-key="${k}"] .quick-menu`), r = m?.getBoundingClientRect();
      return { open: !!m?.classList.contains("open") && (r?.height ?? 0) > 0, inView: !!r && r.left >= 0 && r.right <= innerWidth + 1,
        items: [...(m?.querySelectorAll(":scope > .qm-item") ?? [])].map((b) => [...b.attributes].map((x) => x.name).find((n) => n.startsWith("data-qm-"))) };
    }, key);
  };
  const m3 = await openMenu("1:3");
  check(`${tag} C: one tap opens 1:3's ⋮ with Copy, Share, Play, Bookmark, Note and QCR (no WbW/Root rows: the view has its own switches)`, !!m3 && m3.open && m3.inView && ["data-qm-play", "data-qm-bookmark", "data-qm-note", "data-qm-qcr"].every((x) => m3.items.includes(x)) && !m3.items.includes("data-qm-wbw"), JSON.stringify(m3));
  if (width === 390 && lang === "en") await page.screenshot({ path: `${SHOT_DIR}/j110-qm-${lang}-${width}.png` });
  await page.evaluate(() => document.querySelector('#pageViewContainer [data-meaning-key="1:3"] .meaning-ayah-ref')?.click()); await page.waitForTimeout(200);

  // ---- C: last read follows the scroll ---------------------------------------------------------------------
  if (lang === "en" && (width === 390 || width === 1280)) {
    await page.evaluate(() => {
      const el = document.querySelector('#pageViewContainer [data-meaning-key="1:5"]');
      el?.scrollIntoView({ block: "start", behavior: "instant" });
    });
    await page.waitForTimeout(400);
    const placeKey = await page.evaluate(() => {
      const root = document.getElementById("readScroll"), top = root.getBoundingClientRect().top;
      return [...document.querySelectorAll("#pageViewContainer [data-meaning-key]")].find((e) => e.getBoundingClientRect().bottom > top + 60)?.dataset.meaningKey;
    });
    const n0 = await page.evaluate(() => (window.__stubWriteData || []).length);
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide"))); // the page's own flush of the last places
    await page.waitForTimeout(500);
    const wrote = await page.evaluate((n) => (window.__stubWriteData || []).slice(n).filter((x) => x.col === "bookmarks").map((x) => JSON.stringify(x.data)).join(" "), n0);
    const ayahNum = (wrote.match(/read":\{"surahNum":1,"ayahNum":(\d+)/) || [])[1];
    check(`${tag} C: 📖 Last read follows the scroll: 1:5, scrolled to the top, is the one saved (not the unit's start)`, ayahNum === "5", JSON.stringify({ placeKey, ayahNum, wrote: wrote.slice(0, 240) }));
  }

  // ---- C: recitation is highlighted and followed; no jump back -------------------------------------------
  if (lang === "en" && (width === 390 || width === 1280)) {
    await page.evaluate(() => { document.getElementById("readScroll").scrollTop = 0; window.__flowEl = document.querySelector("#pageViewContainer [data-meaning-flow]"); });
    await page.click("#readPlayBtn");
    const got = async (k) => page.waitForFunction((kk) => document.querySelector("#pageViewContainer .meaning-ayah.now-playing")?.dataset.meaningKey === kk, k, { timeout: 15000 }).then(() => true).catch(() => false);
    const p1 = await got("1:1");
    check(`${tag} C: the āyah being recited is highlighted in the Reading View (1:1)`, p1, await page.evaluate(() => document.querySelector("#pageViewContainer .now-playing")?.dataset.meaningKey ?? "none"));
    const p4 = await got("1:4");
    // The follow is a smooth scroll: wait for the sounding row to be inside the reading area (up to 3 s), not a guessed time.
    await page.waitForFunction(() => { const r = document.querySelector("#pageViewContainer .meaning-ayah.now-playing")?.getBoundingClientRect(), v = document.getElementById("readScroll").getBoundingClientRect(); return !!r && r.bottom > v.top && r.top < v.bottom; }, null, { timeout: 3000 }).catch(() => {});
    const st = await page.evaluate(() => {
      const row = document.querySelector("#pageViewContainer .meaning-ayah.now-playing"), r = row?.getBoundingClientRect(), v = document.getElementById("readScroll").getBoundingClientRect();
      const bg = row ? getComputedStyle(row).backgroundColor : "";
      const rs = document.getElementById("readScroll");
      return { dbg: { rowTop: Math.round(r?.top ?? -1), rowBottom: Math.round(r?.bottom ?? -1), vTop: Math.round(v.top), vBottom: Math.round(v.bottom), st: Math.round(rs.scrollTop), sh: rs.scrollHeight, ch: rs.clientHeight, ov: getComputedStyle(rs).overflowY, win: Math.round(scrollY) },
        key: row?.dataset.meaningKey, n: document.querySelectorAll("#pageViewContainer .now-playing").length, sameFlow: window.__flowEl === document.querySelector("#pageViewContainer [data-meaning-flow]") && !!window.__flowEl,
        visible: !!r && r.bottom > v.top && r.top < v.bottom, bg };
    });
    check(`${tag} C: ...the highlight follows the recitation (1:4), one āyah at a time, in its gold band`, p4 && st.n === 1 && st.bg === "rgb(255, 248, 225)", JSON.stringify(st));
    check(`${tag} C: ...and the flow is NOT rebuilt at each āyah (the jump back to the unit's start is gone)`, st.sameFlow, JSON.stringify(st));
    check(`${tag} C: ...the sounding āyah is on screen (followed)`, st.visible, JSON.stringify(st));
    await page.evaluate(() => document.getElementById("readStopBtn")?.click());
    await page.waitForTimeout(300);
  }

  // The ONE Ayah View is not changed: back to it, its rows and its own ⋮ as before.
  await goTo(page, "plain");
  const plain = await page.evaluate(() => ({ rows: document.querySelectorAll("#pageViewContainer .page-flow-ayah").length, qm: document.querySelectorAll("#pageViewContainer .page-flow-ayah .ayah-quick-header [data-qm-toggle]").length, slotHidden: document.getElementById("readMeaningLayersSlot")?.hidden }));
  check(`${tag} the ONE Ayah View is as it was: its 7 rows, each with its ⋮, and no switches on the bar`, plain.rows === 7 && plain.qm === 7 && plain.slotHidden === true, JSON.stringify(plain));
  const w2 = await word(page);
  check(`${tag} B: ...and there the button names "${W.rv}" again`, w2.word === W.rv, JSON.stringify(w2));
  // From the Mushaf the button names the ONE Ayah View.
  await page.evaluate(() => { const t = document.getElementById("mushafToggle"); t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1500);
  const w3 = await word(page);
  check(`${tag} B: in the Mushaf the button names "${W.one}"`, w3.word === W.one && w3.label.startsWith(W.one), JSON.stringify(w3));

  const real = errors.filter((e) => !/ERR_CERT|ERR_|archive\.org|api\.quran\.com/.test(e));
  check(`${tag} no page errors`, real.length === 0, real.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---- C: an added page's ⋮ opens with one tap (wired once) -----------------------------------------------------
{
  const { ctx, page } = await start("en", 390);
  await openFatiha(page);
  await goTo(page, "meaning");
  await page.evaluate(() => document.querySelector("#pageViewContainer [data-meaning-next]")?.scrollIntoView());
  await page.waitForFunction(() => document.querySelector('#pageViewContainer [data-meaning-key="2:1"]'), null, { timeout: 10000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('#pageViewContainer [data-meaning-key="2:1"]')?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  const has = await page.$('#pageViewContainer [data-meaning-key="2:1"] [data-qm-toggle]');
  if (has) { await page.click('#pageViewContainer [data-meaning-key="2:1"] [data-qm-toggle]'); await page.waitForTimeout(250); }
  const open21 = await page.evaluate(() => !!document.querySelector('#pageViewContainer [data-meaning-key="2:1"] .quick-menu.open'));
  check("[en 390] C: on the page that joins as the reader scrolls (page 2, 2:1), one tap opens the ⋮", !!has && open21, JSON.stringify({ has: !!has, open21 }));
  // Earlier pages keep working: 1:2's ⋮ still opens with one tap.
  await page.evaluate(() => document.querySelector('#pageViewContainer [data-meaning-key="1:2"]')?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(250);
  await page.click('#pageViewContainer [data-meaning-key="1:2"] [data-qm-toggle]'); await page.waitForTimeout(250);
  const open12 = await page.evaluate(() => !!document.querySelector('#pageViewContainer [data-meaning-key="1:2"] .quick-menu.open'));
  check("[en 390] C: ...and the first page's ⋮ (1:2) still opens with one tap", open12);
  await ctx.close();
}

await browser.close();
console.log(`\n==== J110 Reading View (A switches, B names, C reading functions): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
