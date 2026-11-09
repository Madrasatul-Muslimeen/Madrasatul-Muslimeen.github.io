// "Read on" (the Owner, 9 Nov 2026, Demo 1 chosen: "keep two views only: the Mushaf, and the ONE Ayah view with a Read on
// switch; the separate Reading View goes"). The switch sits in the Read bar before the Layers slot. On: the Reading View's
// flow from the āyah being read. Off: back to ONE Ayah view, on the āyah the reader reached. Hidden in the Mushaf.
// Expected values written BY HAND. Run from the repository root, serve.js on :8080.
//   --mutate=noland      off does not land on the āyah reached          -> the "lands on" check fails
//   --mutate=showmushaf  the switch is not hidden in the Mushaf         -> the Mushaf check fails
//   --mutate=nolabel     the label is not translated                    -> the Bangla label check fails
//   --mutate=stuck       the switch can only turn Read on, never off    -> the off checks fail
//   --mutate=nostore     Read on is not remembered on this device       -> the remembered check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate");
const MUT = {
  noland: ["if (ks === currentSurahNum && ka >= 1 && currentUnitType === \"ayah\") currentAyahNum = ka;", "void ka;"],
  showmushaf: ["sw.hidden = mushafToggle.checked;", "sw.hidden = false;"],
  nolabel: ['const word = t("Read on");', 'const word = "Read on";'],
  stuck: ["readMeaningOn = goingOn;\n      try { localStorage.setItem(READ_MEANING_KEY, goingOn", "readMeaningOn = true;\n      try { localStorage.setItem(READ_MEANING_KEY, goingOn"],
  nostore: ['localStorage.setItem(READ_MEANING_KEY, goingOn ? "1" : "0"); } catch { /* per device only */ }\n      paintReadMeaningBtn();\n      renderStudyScreen();', 'void 0; } catch { /* per device only */ }\n      paintReadMeaningBtn();\n      renderStudyScreen();'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const WIDTHS = arg("width") ? [Number(arg("width"))] : [320, 360, 390, 768, 1280];
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function start(lang, width) {
  const ctx = await newContext(browser, { legacyTools: true, appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const src = fs.readFileSync("app/quranrevival.html", "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  return { ctx, ...(await openPage(ctx, "/app/quranrevival.html")) };
}
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
async function openAyah(page) {
  const ok = await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0);
  if (!ok) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", "57"); await page.waitForTimeout(1500);
  await setSel(page, "unitTypeSelect", "ayah"); await page.waitForTimeout(500);
  await setSel(page, "ayahSelect", "5"); await page.waitForTimeout(800);
}
const sw = (page) => page.evaluate(() => {
  const w = document.getElementById("readOnSwitch"), c = document.getElementById("readOnCheck"), r = w.getBoundingClientRect();
  const hit = r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
  const bar = document.getElementById("readBar").getBoundingClientRect(), br = document.getElementById("readMeaningBtn");
  return {
    shown: r.width > 0, h: Math.round(r.height), tappable: !!hit && w.contains(hit), inBar: r.left >= bar.left - 1 && r.right <= bar.right + 1,
    on: c.checked, word: w.querySelector("[data-read-on-word]").textContent.trim(), label: c.getAttribute("aria-label"),
    flow: [...document.querySelectorAll("#pageViewContainer [data-meaning-key]")].filter((e) => e.offsetParent !== null).length, // the hidden container keeps its last flow in the DOM
    mushaf: document.getElementById("mushafToggle").checked,
    ayah: document.getElementById("ayahSelect")?.value, stored: localStorage.getItem("qr.readMeaning"),
    btn: br.querySelector(".read-meaning-word").textContent.trim(), over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});
const waitFlow = async (page, on) => { await page.waitForFunction((o) => ([...document.querySelectorAll("#pageViewContainer [data-meaning-key]")].filter((e) => e.offsetParent !== null).length > 0) === o, on, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(500); };

for (const lang of LANGS) for (const width of WIDTHS) {
  const tag = `[${lang} ${width}]`;
  const WORD = lang === "bn" ? "পড়তে থাকুন" : "Read on", MUSHAF = lang === "bn" ? "মুসহাফ" : "Mushaf";
  const { ctx, page, errors } = await start(lang, width);
  await openAyah(page);

  const s0 = await sw(page);
  check(`${tag} the ONE Ayah view has the "${WORD}" switch, off, a finger's size, tappable and inside the bar`, s0.shown && !s0.on && s0.h >= 40 && s0.tappable && s0.inBar && s0.flow === 0 && s0.over <= 0, JSON.stringify(s0));
  check(`${tag} its label is "${WORD}" (the spoken name too)`, s0.word === WORD && s0.label === WORD, JSON.stringify({ w: s0.word, l: s0.label }));
  check(`${tag} 📖 names the Mushaf next`, s0.btn === MUSHAF, s0.btn);

  await page.click("#readOnCheck", { force: true }); await waitFlow(page, true);
  const s1 = await sw(page);
  check(`${tag} Read on: the flow shows from āyah 57:5, the switch is on, and it is remembered on this device`, s1.on && s1.flow > 3 && s1.stored === "1" && !s1.mushaf, JSON.stringify(s1));
  const at = await page.evaluate(() => { const e = document.querySelector('#pageViewContainer [data-meaning-key="57:5"]'); return e ? { out: e.classList.contains("out") } : null; });
  check(`${tag} ...57:5 is in the flow and drawn plainly (not faint)`, !!at && !at.out, JSON.stringify(at));
  check(`${tag} ...📖 still names the Mushaf; no sideways overflow`, s1.btn === MUSHAF && s1.over <= 0, JSON.stringify({ b: s1.btn, o: s1.over }));

  // The way-back law (decision 86): a word opened from the Read on flow comes back to the same place, Read on still on.
  const wc = await page.evaluate(async () => {
    const art = document.querySelector('#pageViewContainer [data-meaning-key="57:5"]'); const w = art?.querySelector(".ayah-word-clickable");
    if (!w) return { word: false };
    w.click();
    for (let i = 0; i < 40 && !document.querySelector("[data-word-card-close]"); i++) await new Promise((r) => setTimeout(r, 150));
    const close = document.querySelector("[data-word-card-close]"), r = close?.getBoundingClientRect();
    return { word: true, opened: !!close && r.width > 0 };
  });
  check(`${tag} way back: a word tapped in the Read on flow opens its Word Card`, wc.word && wc.opened, JSON.stringify(wc));
  await page.evaluate(() => document.querySelector("[data-word-card-close]")?.click()); await page.waitForTimeout(800);
  const wb = await page.evaluate(() => ({ on: document.getElementById("readOnCheck").checked, card: !!document.querySelector("[data-word-card-close]") && document.querySelector("[data-word-card-close]").getBoundingClientRect().width > 0, at: !!document.querySelector('#pageViewContainer [data-meaning-key="57:5"]') && document.querySelector('#pageViewContainer [data-meaning-key="57:5"]').getBoundingClientRect().height > 0 }));
  check(`${tag} way back: closing the Word Card returns to the Read on flow, still on, 57:5 still there`, wb.on && !wb.card && wb.at, JSON.stringify(wb));

  // Read on, reach 57:8, switch off: back on the āyah reached.
  await page.evaluate(() => document.querySelector('#pageViewContainer [data-meaning-key="57:8"]')?.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.waitForTimeout(500);
  await page.click("#readOnCheck", { force: true }); await waitFlow(page, false);
  const s2 = await sw(page);
  check(`${tag} Read off: back in the ONE Ayah view, no flow, the switch off and shown`, !s2.on && s2.flow === 0 && s2.shown && s2.stored === "0", JSON.stringify(s2));
  check(`${tag} ...on the āyah the reader reached (57:8), not the one they left (57:5)`, s2.ayah === "8", s2.ayah);

  // Hidden in the Mushaf, back after.
  await page.evaluate(() => { const t = document.getElementById("mushafToggle"); t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForFunction(() => document.querySelector("#pageViewContainer .hifz-page"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  const s3 = await sw(page);
  check(`${tag} the Mushaf hides the switch (it is a printed page: Read on has nothing to add)`, s3.mushaf && !s3.shown, JSON.stringify(s3));
  await page.evaluate(() => { const t = document.getElementById("mushafToggle"); t.checked = false; t.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(900);
  const s4 = await sw(page);
  check(`${tag} back from the Mushaf the switch is shown again`, !s4.mushaf && s4.shown, JSON.stringify(s4));

  // 📖 from Read on goes to the Mushaf, and the way back is the ONE Ayah view.
  await page.click("#readOnCheck", { force: true }); await waitFlow(page, true);
  await page.click("#readMeaningBtn"); await page.waitForFunction(() => document.querySelector("#pageViewContainer .hifz-page"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  const s5 = await sw(page);
  check(`${tag} 📖 from Read on goes to the Mushaf (switch hidden, flow closed)`, s5.mushaf && !s5.shown && s5.flow === 0, JSON.stringify(s5));
  await page.click("#readMeaningBtn"); await page.waitForTimeout(900);
  const s6 = await sw(page);
  check(`${tag} 📖 again returns to the ONE Ayah view with Read on off`, !s6.mushaf && s6.shown && !s6.on && s6.flow === 0, JSON.stringify(s6));

  // Remembered: Read on, reload, still on.
  await page.click("#readOnCheck", { force: true }); await waitFlow(page, true);
  await page.reload(); await page.waitForTimeout(1500);
  const stored = await page.evaluate(() => localStorage.getItem("qr.readMeaning"));
  check(`${tag} the choice is remembered on this device`, stored === "1", stored);
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
console.log(`\n==== Read on switch (the Owner, Demo 1, 9 Nov 2026)${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
