// PCF MSA J48 round 3 (the Owner, 21 Oct 2026: "1B. also another Wheel display should show the progress of the 9
// segments. 2A. yes."; n48d A: a segment fills by the step's own new words). Plan j48p10.
// (1) learn-next.json is not fetched at startup; the Wheel opens on Approaches and the fill switch is hidden.
// (2) "Vocabulary" draws 9 segments, the 9 Learn next steps; the centre is the share of the Qur'an's words known.
// (3) Each segment says k/size for its own new words (the default), ✓ once every word of the step is known, and fills.
// (4) "All words up to it" changes every segment to k/n and is remembered on this device (a reload keeps it).
// (5) A segment opens that step in Learn next; ← Back returns to the Wheel, still on Vocabulary (the way-back law).
// (6) The badge at the top of Learn next and on Know Your Status: words known, the share, steps passed, the next step.
// (7) Back on Approaches, the Word by word slice fills in gold by the āyah's known words, k/n in its title.
// (8) The Vocabulary Wheel fits: inside the window on a computer, no sideways scroll on a phone. Bangla has no English.
// (9) Monitor (2A): nothing is read until "Show the Vocabulary table" is tapped; then one row per student, and the
//     signed-in student's row counts exactly the words their own badge counts.
// Run from the repository root, serve.js on :8080 (QR_BASE for another port). --mutate=NAME must make the suite FAIL:
//   startup  the Wheel starts on Vocabulary (the list is fetched at startup)   -> (1)
//   nofill   no segment fills                                                  -> (3)
//   passed   a step counts as passed when only its NEW words are known        -> (3)/(6)
//   noremember the fill choice is not kept                                     -> (4)
//   noopen   a segment opens nothing                                           -> (5)
//   nobadge  Learn next has no badge                                           -> (6)
//   nokys    Know Your Status has no badge                                     -> (6)
//   nogold   the Word by word slice never fills                                -> (7)
//   bnleak   one Bangla string is missing                                      -> (8)
//   titlebar the switch stays in a row of its own above the wheel on a computer  -> (8)
//   phonerow on a phone the switch is a row of its own above the wheel           -> (8)
//   monitorauto  the Monitor reads the table as the page opens                 -> (9)
//   monitorcount the Monitor ignores WbW marks                                 -> (9)
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } from "../../app/js/catalogue-data.js";
// The real catalogue, so Word by word is approach_04 (the default fixture uses short made-up ids).
const SEED_TEMPLATES = { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES };

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const HTML = "app/quranrevival.html", LN = "app/js/learn-next.js", BN = "app/js/i18n/bn.js";
const MUT = {
  startup: [HTML, 'let wheelKind = "approaches",', 'let wheelKind = "vocab",'],
  nofill: [HTML, "          progress: fill,\n          progressFill: VOCAB_GREEN,", "          progress: 0,\n          progressFill: VOCAB_GREEN,"],
  passed: [LN, "passed: all === n };", "passed: fresh === n - prev };"],
  noremember: [HTML, "try { localStorage.setItem(VOCAB_FILL_KEY, mode); }", "try { void mode; }"],
  noopen: [HTML, "    function openLearnNextAtStep(n) {\n", "    function openLearnNextAtStep(n) { return;\n"],
  nobadge: [HTML, "          ${vocabBadgeHtml()}\n          <p class=\"ln-note\">", "          <p class=\"ln-note\">"],
  nokys: [HTML, "      if (slot && vocabCtxIsCurrent()) slot.innerHTML = vocabBadgeHtml();", ""],
  nogold: [HTML, "if (wordFrac && trackable.id === WBW_TRACKABLE_ID) {", "if (false) {"],
  phonerow: [HTML, "else if (drawer.firstElementChild !== wheelKindRowEl) drawer.prepend(wheelKindRowEl);", "else document.getElementById(\"wheelStageWrap\").before(wheelKindRowEl);"],
  titlebar: [HTML, "if (wheelKindRowEl.parentElement !== slot) slot.appendChild(wheelKindRowEl);", "void slot;"],
  monitorauto: ["app/monitor.html", "    let vocabShown = false;", "    let vocabShown = true; setTimeout(() => refreshVocabTable(), 0);"],
  monitorcount: ["app/js/vocab-known.js", "if (lemmaProgressFor({ tenantId, personId, lemmaId, confirmationRequired }).countsAsKnown) return true;", ""],
  bnleak: [BN, '  "of the Qur\'an\'s words": "কুরআনের শব্দের",\n', ""],
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

// The seed: words 1-10 and 12-50 known (word 11 not), then every 4th word up to rank 300 -- so First 10 is passed,
// First 25 and First 50 are NOT (word 11 is missing), though every NEW word of First 50 (26-50) is known: that is
// what tells "every word of the step" from "only its new words" (the "passed" mutation).
const data = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/learn-next.json", "utf8"));
const rows = data.rows;
const STEPS = [10, 25, 50, 100, 300, 500, 1000, 1500, 2020];
const knownRank = (r) => r <= 10 || (r >= 12 && r <= 50) || (r <= 300 && r % 4 === 0);
const nfc = (s) => String(s).normalize("NFC");
const knownLemmas = new Set(rows.filter((r) => knownRank(r.r)).map((r) => nfc(r.l)));
const SEED = `\nDATA.quranLemmaProgress = ${JSON.stringify(rows.filter((r) => knownRank(r.r)).map((r, i) => ({
  _id: `__T__p1__wbw__${i}`, personId: "p1", level: "wbw", lemmaId: r.l, lane: "learner", state: "achieved", at: "2026-10-20T10:00:00.000Z", byPersonId: "p1",
})))}.map((d) => ({ ...d, _id: d._id.replace("__T__", TENANT_ID + "__"), tenantId: TENANT_ID }));\nDATA.quranLemmaApprovals = [];\n`;
const words = rows.filter((r) => knownRank(r.r)).length;
const share = (100 * rows.filter((r) => knownRank(r.r)).reduce((n, r) => n + r.n, 0)) / data.total;
let prev = 0;
const steps = STEPS.map((n) => {
  let all = 0, fresh = 0;
  for (let r = 1; r <= n; r++) if (knownRank(r)) { all++; if (r > prev) fresh++; }
  const s = { n, newKnown: fresh, newSize: n - prev, allKnown: all, passed: all === n };
  prev = n;
  return s;
});
const passedN = steps.filter((s) => s.passed).length, nextStep = steps.find((s) => !s.passed).n;
if (passedN !== 1 || nextStep !== 25 || steps[2].newKnown !== steps[2].newSize) throw new Error("seed assumption broke: expected First 10 alone passed, First 50's new words all known");
const digits = (s) => String(s).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
const s1 = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/surahs/surah_001.json", "utf8"));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function open(ctx) {
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.waitForTimeout(1200);
  return { page, errors };
}
const wheelInfo = (page) => page.evaluate(() => {
  const svg = document.querySelector("#wheelContainer svg[data-vocab-wheel]");
  const segs = [...document.querySelectorAll("#wheelContainer .wheel-seg")];
  return {
    mode: svg?.getAttribute("data-vocab-wheel") ?? null,
    segs: segs.length,
    keys: segs.map((s) => s.dataset.key),
    progress: document.querySelectorAll("#wheelContainer .wheel-seg-progress").length,
    labels: [...document.querySelectorAll("#wheelContainer .wheel-seg-label")].map((t) => [...t.querySelectorAll("tspan")].map((x) => x.textContent)),
    ticked: segs.filter((s) => s.getAttribute("stroke") === "#7fd1a2").map((s) => s.dataset.key),
    centre: [...(svg?.querySelectorAll(":scope > text") ?? [])].map((t) => t.textContent).join(" | "),
    pressed: [...document.querySelectorAll("#wheelKindRow [aria-pressed=true]")].map((b) => b.dataset.wheelKind || b.dataset.vocabFill),
    fillHidden: document.querySelector("[data-vocab-fill-switch]")?.hidden,
  };
});

for (const lang of ["en", "bn"]) for (const [width, height] of [[1440, 900], [390, 844]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== Vocabulary Wheel ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: SEED, seedTemplates: SEED_TEMPLATES });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file.replace(/^app\//, "app/")}*`, async (r) => {
      const src = fs.readFileSync(file, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  let fetched = 0;
  ctx.on("request", (rq) => { if (/learn-next\.json/.test(rq.url())) fetched++; });
  // The list arrives 2 s late, and on a computer the window is maximised meanwhile: the wheel must still fit when it
  // arrives. (A first build re-fitted it on arrival; once the switch left the wheel's column the wheel's size no longer
  // depends on what it holds, a "nofit" mutation could not fail, and the re-fit was removed as dead code.)
  await ctx.route("**/learn-next.json*", async (r) => { await new Promise((res) => setTimeout(res, 2000)); await r.continue(); });
  let { page, errors } = await open(ctx);

  // (1)
  const start = await wheelInfo(page);
  check(`${tag} (1) learn-next.json is not fetched at startup`, fetched === 0, String(fetched));
  check(`${tag} (1) the Wheel opens on Approaches, the fill switch hidden`, start.pressed.includes("approaches") && start.fillHidden === true && start.mode === null, JSON.stringify(start.pressed));

  // (6) Know Your Status FIRST, on a page that has not read the list yet: the badge is filled in after the status.
  await page.evaluate(() => document.getElementById("myStatusWideBtn")?.click());
  await page.waitForFunction(() => document.querySelector("#myStatusBody [data-ms-vocab-badge] [data-vocab-badge]"), null, { timeout: 20000 }).catch(() => {});
  const kysFirst = await page.evaluate(() => document.querySelector("#myStatusBody [data-vocab-badge]")?.dataset.vbWords ?? null);
  check(`${tag} (6) Know Your Status opened first still gets its badge (${words} words)`, Number(kysFirst) === words, String(kysFirst));
  await page.evaluate(() => document.getElementById("myStatusBackBtn")?.click());
  await page.waitForTimeout(300);

  // (8) where the switch is: never a row of its own that the wheel pays for
  if (width < 900) {
    const before = await page.evaluate(() => ({ inDrawer: !!document.querySelector('[data-wheel-drawer-panel="wheel"]')?.contains(document.getElementById("wheelKindRow")) }));
    await page.click('#wheelDrawerRow [data-wheel-drawer="wheel"]');
    await page.waitForTimeout(250);
    const shown = await page.evaluate(() => [...document.querySelectorAll("#wheelKindRow [data-wheel-kind]")].map((b) => Math.round(b.getBoundingClientRect().height)));
    check(`${tag} (8) on a phone the switch is in the Wheel drawer and shows when it opens, buttons at least 40px`, before.inDrawer && shown.length === 2 && shown.every((h) => h >= 40), JSON.stringify({ before, shown }));
  }

  // (2) + (3)
  await page.evaluate(() => document.querySelector('[data-wheel-kind="vocab"]').click());
  // the window is maximised while the list loads (its size changes, so the wheel is fitted to "Loading…")
  if (width >= 900) { await page.waitForTimeout(300); await page.evaluate(() => document.getElementById("wheelPopupMaximizeBtn")?.click()); await page.waitForTimeout(600); }
  await page.waitForFunction(() => document.querySelector("#wheelContainer svg[data-vocab-wheel]"), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(300);
  let w = await wheelInfo(page);
  check(`${tag} (2) Vocabulary draws 9 segments, First 10 … First 2,020`, w.segs === 9 && w.keys.join() === STEPS.map((n) => `vstep-${n}`).join(), JSON.stringify(w.keys));
  check(`${tag} (2) the centre is the share of the Qur'an's words known (${share.toFixed(1)}%)`, digits(w.centre).split(" | ").includes(`${share.toFixed(1)}%`), w.centre);
  const wantNew = steps.map((s) => `${s.newKnown}/${s.newSize}`);
  check(`${tag} (3) each segment says its own new words known (default fill)`, w.mode === "new" && w.labels.map((l) => digits(l[1]).replace(/,/g, "")).join() === wantNew.join(), JSON.stringify(w.labels.map((l) => l[1])));
  check(`${tag} (3) the passed step (First 10) carries ✓ and a light edge; no other does (First 50's new words are all known, word 11 is not)`, w.ticked.join() === "vstep-10" && w.labels.filter((l) => l[0].startsWith("✓")).length === 1, JSON.stringify(w.ticked));
  check(`${tag} (3) every step with a known word fills (${steps.filter((s) => s.newKnown).length} fills)`, w.progress === steps.filter((s) => s.newKnown).length, String(w.progress));
  check(`${tag} (3) the fill switch shows, "The step's new words" pressed`, w.fillHidden === false && w.pressed.includes("new"), JSON.stringify(w.pressed));

  // (8) fits
  const fit = await page.evaluate(() => {
    const svg = document.querySelector("#wheelContainer svg").getBoundingClientRect();
    const sec = document.getElementById("wheelSection").getBoundingClientRect();
    return { svgB: svg.bottom, svgR: svg.right, svgL: svg.left, secB: sec.bottom, over: document.documentElement.scrollWidth - innerWidth, w: svg.width };
  });
  if (width >= 900) {
    const bar = await page.evaluate(() => {
      const b = document.getElementById("wheelPopupTitleBar");
      return { inBar: !!b?.contains(document.getElementById("wheelKindRow")), h: b?.getBoundingClientRect().height ?? 0,
        cut: [...(b?.querySelectorAll("button, .note-popup-title") ?? [])].filter((e) => e.scrollWidth > e.clientWidth + 1).length };
    });
    check(`${tag} (8) on a computer the switch sits in the window's title bar, one line, nothing cut (no wheel height spent)`, bar.inBar && bar.h <= 60 && bar.cut === 0, JSON.stringify(bar));
  }
  if (width >= 900) check(`${tag} (8) the Vocabulary Wheel sits inside the window (no taller than its space)`, fit.svgB <= fit.secB + 1 && fit.w >= 200, JSON.stringify(fit));
  else check(`${tag} (8) the Vocabulary Wheel fits the phone, no sideways scroll`, fit.over <= 0 && fit.svgL >= 0 && fit.svgR <= width + 1, JSON.stringify(fit));
  if (lang === "bn") {
    const text = await page.evaluate(() => [...document.querySelectorAll("#wheelContainer svg text, #wheelKindRow button, [data-vocab-wheel-list], #wheelLegendContainer")].map((e) => e.textContent).join(" "));
    check(`${tag} (8) Bangla: no English left on the Vocabulary Wheel`, !/[A-Za-z]{3,}/.test(text), text.match(/[A-Za-z]{3,}.{0,30}/)?.[0]);
  }

  // (4)
  await page.evaluate(() => document.querySelector('[data-vocab-fill="all"]').click());
  await page.waitForTimeout(200);
  w = await wheelInfo(page);
  const wantAll = steps.map((s) => `${s.allKnown}/${s.n}`);
  check(`${tag} (4) "All words up to it" changes every segment to k/n`, w.mode === "all" && w.labels.map((l) => digits(l[1]).replace(/,/g, "")).join() === wantAll.join(), JSON.stringify(w.labels.map((l) => l[1])));
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.waitForTimeout(1200);
  const afterReload = await wheelInfo(page);
  check(`${tag} (4)/(1) after a reload the Wheel is on Approaches again (nothing fetched at startup)`, afterReload.pressed.includes("approaches") && afterReload.mode === null);
  await page.evaluate(() => document.querySelector('[data-wheel-kind="vocab"]').click());
  await page.waitForFunction(() => document.querySelector("#wheelContainer svg[data-vocab-wheel]"), null, { timeout: 30000 }).catch(() => {});
  w = await wheelInfo(page);
  check(`${tag} (4) the fill choice is remembered on this device`, w.mode === "all" && w.pressed.includes("all"), JSON.stringify(w.pressed));
  await page.evaluate(() => document.querySelector('[data-vocab-fill="new"]').click());
  await page.waitForTimeout(200);

  // (5) + (6)
  await page.evaluate(() => document.querySelector('#wheelContainer .wheel-seg[data-key="vstep-50"]').dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForFunction(() => { const s = document.getElementById("learnNextSheet"); return s && !s.hidden; }, null, { timeout: 15000 }).catch(() => {});
  const ln = await page.evaluate(() => {
    const s = document.getElementById("learnNextSheet");
    if (!s || s.hidden) return null;
    const badge = s.querySelector("[data-vocab-badge]");
    const body = s.querySelector("[data-ln-scroll]");
    return {
      tile: s.querySelector('[data-ln-tile][aria-pressed="true"]')?.dataset.lnTile ?? null,
      onlyNew: s.querySelector('[data-ln-new="1"]')?.getAttribute("aria-pressed"),
      badgeFirst: !!badge && body.firstElementChild === badge,
      words: badge?.dataset.vbWords, big: badge?.querySelector(".vb-big")?.textContent, sum: badge?.querySelector("[data-vb-sum]")?.textContent,
      passed: badge ? [...badge.querySelectorAll("[data-vb-passed]")].map((e) => e.dataset.vbStep).join() : null,
    };
  });
  check(`${tag} (5) the First 50 segment opens Learn next on that step, its new words only`, ln?.tile === "50" && ln?.onlyNew === "true", JSON.stringify(ln));
  check(`${tag} (6) the badge is the first thing in Learn next`, !!ln?.badgeFirst, JSON.stringify(ln));
  check(`${tag} (6) the badge: ${words} words, ${share.toFixed(1)}%`, Number(ln?.words) === words && digits(ln?.big ?? "").includes(`${share.toFixed(1)}%`) && digits(ln?.big ?? "").replace(/,/g, "").includes(String(words)), ln?.big);
  const sumNums = digits(ln?.sum ?? "").replace(/[^\d]+/g, " ").trim().split(" ").sort().join();
  check(`${tag} (6) the badge: 1 of 9 steps passed, next First 25, First 10 ticked`, ln?.passed === "10" && sumNums === ["1", "9", "25"].sort().join(), `${ln?.sum} ${ln?.passed}`);
  if (lang === "en") check(`${tag} (6) the badge reads as the demo`, /^You know \d+ words = [\d.]+% of the Qur'an's words$/.test(ln?.big ?? "") && /^1 of 9 steps passed · next: First 25$/.test(ln?.sum ?? ""), `${ln?.big} / ${ln?.sum}`);
  await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-back]")?.click());
  await page.waitForTimeout(300);
  const back = await page.evaluate(() => ({ sheetHidden: document.getElementById("learnNextSheet")?.hidden, vocab: !!document.querySelector("#wheelContainer svg[data-vocab-wheel]"), visible: (document.querySelector("#wheelContainer svg")?.getBoundingClientRect().width ?? 0) > 0 }));
  check(`${tag} (5) ← Back returns to the Wheel, still on Vocabulary`, back.sheetHidden === true && back.vocab && back.visible, JSON.stringify(back));

  // (7) the gold fill on Approaches
  await page.evaluate(() => document.querySelector('[data-wheel-kind="approaches"]').click());
  await page.waitForTimeout(400);
  const gold = await page.evaluate(() => {
    const seg = document.querySelector('#wheelContainer .wheel-seg[data-key="approach_04"]');
    const prog = [...document.querySelectorAll("#wheelContainer .wheel-seg-progress")].filter((p) => p.getAttribute("fill") === "#d8b25a");
    return { title: seg?.querySelector("title")?.textContent, gold: prog.length, surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value };
  });
  const a = s1.ayahs.find((x) => String(x.ayah) === String(gold.ayah));
  const wantK = gold.surah === "1" && a ? a.words.filter((x) => knownLemmas.has(nfc(x.morphology?.lemma))).length : -1;
  const wantN = a ? a.words.length : -1;
  check(`${tag} (7) the Word by word slice fills in gold by the āyah's known words (${wantK}/${wantN} on 1:${gold.ayah})`, wantK > 0 && gold.gold === 1 && digits(gold.title ?? "").includes(`${wantK}/${wantN}`), JSON.stringify(gold));

  // (6) Know Your Status
  await page.evaluate(() => document.getElementById("myStatusWideBtn")?.click());
  await page.waitForFunction(() => document.querySelector("#myStatusBody [data-ms-vocab-badge] [data-vocab-badge]"), null, { timeout: 20000 }).catch(() => {});
  const kys = await page.evaluate(() => document.querySelector("#myStatusBody [data-vocab-badge]")?.dataset.vbWords ?? null);
  check(`${tag} (6) Know Your Status carries the same badge (${words} words)`, Number(kys) === words, String(kys));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::/.test(e)).length === 0, errors.join(" | ").slice(0, 300));
  await ctx.close();
}
// (9) Monitor
for (const lang of ["en", "bn"]) for (const [width, height] of [[1440, 900], [390, 844]]) {
  const tag = `[Monitor ${lang} ${width}]`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: SEED, seedTemplates: SEED_TEMPLATES });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => {
      const src = fs.readFileSync(file, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  let fetched = 0;
  ctx.on("request", (rq) => { if (/learn-next\.json/.test(rq.url())) fetched++; });
  const { page, errors } = await openPage(ctx, "/app/monitor.html");
  await page.waitForFunction(() => document.getElementById("vocabLoadBtn") || document.querySelector("[data-vocab-table]"), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  check(`${tag} nothing is read until the button is tapped`, fetched === 0 && !(await page.evaluate(() => !!document.querySelector("[data-vocab-table]"))), String(fetched));
  await page.evaluate(() => document.getElementById("vocabLoadBtn")?.click());
  await page.waitForFunction(() => document.querySelector("[data-vocab-table]"), null, { timeout: 30000 }).catch(() => {});
  const m = await page.evaluate(() => {
    const t = document.querySelector("[data-vocab-table]");
    return {
      heads: t ? t.querySelectorAll("thead th").length : 0,
      rows: t ? [...t.querySelectorAll("tbody tr")].map((r) => ({ id: r.dataset.vtPerson, words: r.dataset.vtWords ?? null, failed: r.hasAttribute("data-vt-failed") })) : [],
      roster: document.getElementById("personSelect")?.options.length ?? 0,
      over: document.documentElement.scrollWidth - innerWidth,
      head: t ? [...t.querySelectorAll("thead th")].map((h) => h.textContent).join(" | ") : "",
    };
  });
  const me = m.rows.find((r) => r.id === "p1");
  check(`${tag} one row per student in the picker (${m.roster}), six columns`, m.heads === 6 && m.rows.length === m.roster && m.roster > 0, JSON.stringify(m));
  check(`${tag} the student's row counts the same ${words} words as their own badge`, Number(me?.words) === words, JSON.stringify(me));
  check(`${tag} no sideways scroll on the page`, m.over <= 0, String(m.over));
  if (lang === "bn") check(`${tag} Bangla: the table's headings are translated`, !/[A-Za-z]{3,}/.test(m.head), m.head);
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::/.test(e)).length === 0, errors.join(" | ").slice(0, 300));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
