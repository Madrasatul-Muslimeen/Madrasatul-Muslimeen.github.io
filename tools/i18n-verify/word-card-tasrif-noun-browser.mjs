// J41 round 2 -- Taṣrīf for words that are not verbs: "This word's shape" and "The forms of <lemma> in the Qur'an".
// Real data, no stubs. Expected numbers are hand-written from the Corpus rows (see noun-forms-data.mjs), never
// read from the code under test. Run from the repository root with `node serve.js` running.
//   --mutate=NAME   breaks the code a check guards (route rewrite of the served module), so that check must FAIL:
//                   dn-count | case-a-g | case-n | ink | no-this | lazy | back | overflow
//   --lang=en|bn  --width=N   narrow the responsive run.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const MUTATE = arg("mutate");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// name -> [file, from, to, how many times it must occur]
const MUTATIONS = {
  // a lower-case "n" place (ending says accusative/genitive) is counted as nominative -> DN becomes ×6, the AG line vanishes
  "dn-count": ["word-card-depth.js", "if (kase === \"n\") return { number, key: \"AG\"", "if (kase === \"n\") return { number, key: number + \"N\""],
  // a lower-case "a"/"g" place (ending says nominative) goes to the Accusative box
  "case-a-g": ["word-card-depth.js", "return { number, key: number + \"N\", kase: \"N\"", "return { number, key: number + \"A\", kase: \"N\""],
  // the shape chip trusts the Corpus label for a "n" place
  "case-n": ["word-card-depth.js", "const caseKey = k === \"-\" ? null : k === \"n\" ? \"AG\"", "const caseKey = k === \"-\" ? null : k === \"n\" ? \"N\""],
  // the purple box text stops using the card's ink
  "ink": ["quranrevival.html", "background: transparent; color: inherit; overflow-wrap: anywhere; min-width: 0; }", "background: transparent; color: #000; overflow-wrap: anywhere; min-width: 0; }"],
  // no table box is marked "this word"
  "no-this": ["word-card-depth.js", "const isHere = mine?.key === key;", "const isHere = false;"],
  // the files are fetched at any level, not only Taṣrīf
  "lazy": ["quranrevival.html", "else if (quranWordCardState.level === \"tasrif\") ensureNounData(word);", "else ensureNounData(word);"],
  // the way back forgets the level
  "back": ["quranrevival.html", "unitType: currentUnitType, level: quranWordCardState.level,", "unitType: currentUnitType, level: \"basic\","],
  // the table keeps its natural width
  "overflow": ["quranrevival.html", ".word-card-ntable { width: 100%; table-layout: fixed;", ".word-card-ntable { width: 100%; min-width: 640px; table-layout: auto;"],
};

async function openWord(page, surah, ayah, pos) {
  await page.evaluate(() => document.querySelector("[data-word-card-close]")?.click());
  await page.waitForTimeout(300);
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove())); await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(600);
  await page.evaluate((s) => { const e = document.getElementById("surahSelect"); e.value = String(s); e.dispatchEvent(new Event("change", { bubbles: true })); }, surah);
  await page.waitForTimeout(2500);
  await page.evaluate((a) => { const e = document.getElementById("ayahSelect"); if (e.querySelector(`option[value="${a}"]`)) { e.value = String(a); e.dispatchEvent(new Event("change", { bubbles: true })); } }, ayah);
  await page.waitForTimeout(1500);
  await page.evaluate(([s, a, p]) => { document.querySelector(`#readView [data-word-occurrence$=":${s}:${a}:${p}"]`)?.click(); }, [surah, ayah, pos]);
  await page.waitForSelector(".quran-word-card", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
}
async function openTasrif(page) {
  if (!(await page.$('[data-word-card-panel="tasrif"]'))) await page.click('[data-word-card-level="tasrif"]', { timeout: 8000 });
  await page.waitForSelector("[data-word-card-noun-forms] [data-noun-cell]", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
}
const read = (page) => page.evaluate(() => {
  const card = document.querySelector(".quran-word-card");
  const q = (s) => card?.querySelector(s);
  const qa = (s) => [...(card?.querySelectorAll(s) ?? [])];
  const cells = Object.fromEntries(qa("[data-noun-cell]").map((c) => [c.dataset.nounCell, { empty: c.hasAttribute("data-noun-empty"), text: c.textContent.replace(/\s+/g, " ").trim(), here: c.hasAttribute("data-noun-here"), n: c.querySelector("[data-noun-count]")?.textContent.trim() ?? null }]));
  return {
    shape: q("[data-word-card-noun-shape]")?.textContent.replace(/\s+/g, " ").trim() ?? null,
    chips: Object.fromEntries(qa("[data-noun-chip]").map((c) => [c.dataset.nounChip, c.textContent.replace(/\s+/g, " ").trim()])),
    caseLine: q("[data-noun-case-line]")?.textContent.trim() ?? null,
    head: q("[data-word-card-noun-forms] h4")?.textContent.replace(/\s+/g, " ").trim() ?? null,
    cells, na: !!q("[data-word-card-tasrif-na]"), conj: !!q('details[data-word-card-sec="conj"]'),
    stateButtons: qa("[data-word-progress-state]").length, progressNa: q("[data-word-progress-na]")?.textContent.trim() ?? null,
  };
});

const BN_DIGITS = /[০-৯]/;
const toLatin = (s) => String(s).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
const only = (name) => arg(name);

for (const lang of ["en", "bn"].filter((l) => !only("lang") || only("lang") === l)) {
  for (const width of [320, 390, 768, 1280].filter((w) => !only("width") || Number(only("width")) === w)) {
    const L = `${lang}/${width}`;
    console.log(`\n=== ${L} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: width > 600 ? 900 : 844 } });
    if (MUTATE) {
      const m = MUTATIONS[MUTATE];
      if (!m) throw new Error(`unknown mutation ${MUTATE}`);
      await ctx.route(`**/${m[0] === "quranrevival.html" ? "app/quranrevival.html" : `js/${m[0]}`}*`, async (route) => {
        const res = await route.fetch();
        let body = await res.text();
        // Architect review (20 Oct 2026): a missing anchor STOPS the run -- a mutation that changed nothing would read as a pass.
        if (!body.includes(m[1])) throw new Error(`mutation ${MUTATE}: anchor NOT FOUND in ${m[0]}`);
        body = body.split(m[1]).join(m[2]);
        await route.fulfill({ response: res, body });
      });
    }
    const reqs = [];
    ctx.on("request", (r) => { if (/noun-forms\.json|word-forms-index\.json/.test(r.url())) reqs.push(r.url().split("/").pop()); });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(800);

    // ---------- 2:2:2 ٱلْكِتَـٰبُ ----------
    await openWord(page, 2, 2, 2);
    for (const lvl of ["wbw", "basic", "intermediate", "depth"]) {
      await page.click(`[data-word-card-level="${lvl}"]`, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(250);
    }
    check(`${L} the noun files are NOT requested before the Taṣrīf level opens`, reqs.length === 0, JSON.stringify(reqs));
    await openTasrif(page);
    check(`${L} opening Taṣrīf for a noun requests noun-forms.json and word-forms-index.json`, reqs.includes("noun-forms.json") && reqs.includes("word-forms-index.json"), JSON.stringify(reqs));
    let r = await read(page);
    const en = lang === "en";
    check(`${L} 2:2:2 is not "Not applicable" and has no conjugation`, !r.na && !r.conj, JSON.stringify({ na: r.na, conj: r.conj }));
    if (en) {
      check(`${L} 2:2:2 shape: Singular · Masculine · Nominative · Definite`,
        /Singular/.test(r.chips.number ?? "") && /Masculine/.test(r.chips.gender ?? "") && /Nominative/.test(r.chips.case ?? "") && /Definite/.test(r.chips.definite ?? "") && !/Dual|Plural|Feminine|Accusative|Genitive/.test(r.shape ?? ""), JSON.stringify(r.chips));
    } else {
      check(`${L} 2:2:2 shape is in Bangla: one, masculine, nominative and definite chips`, ["number", "gender", "case", "definite"].every((k) => r.chips[k] && /[ঀ-৿]/.test(r.chips[k])) && !/Singular|Masculine|Nominative|Definite/.test(r.shape ?? ""), JSON.stringify(r.chips));
    }
    const num = (s) => Number(toLatin(String(s ?? "").replace(/[^\d০-৯]/g, "")));
    check(`${L} 2:2:2 forms table: every Dual box is "not in the Qur'an"`, ["DN", "DA", "DG"].every((k) => r.cells[k]?.empty), JSON.stringify(r.cells));
    check(`${L} 2:2:2 forms table: Singular-Genitive is ×117`, num(r.cells.SG?.n) === 117 && !r.cells.SG.empty, JSON.stringify(r.cells.SG));
    check(`${L} 2:2:2 forms table: Singular-Nominative ×32, Accusative ×105, Plural-Genitive ×5`, num(r.cells.SN?.n) === 32 && num(r.cells.SA?.n) === 105 && num(r.cells.PG?.n) === 5, JSON.stringify([r.cells.SN, r.cells.SA, r.cells.PG]));
    check(`${L} 2:2:2 the Singular-Nominative box is "this word" and no other box is`, r.cells.SN?.here && Object.entries(r.cells).filter(([, v]) => v.here).length === 1, JSON.stringify(Object.entries(r.cells).filter(([, v]) => v.here)));
    check(`${L} 2:2:2 heading counts 260 places (32 + 105 + 117 + 5 + 1)`, num(r.head?.replace(/^[^(（]*/, "")) === 260, r.head);
    check(`${L} 2:2:2 progress for a noun stays Not applicable (I7): no state buttons`, r.stateButtons === 0 && /Not applicable|প্রযোজ্য নয়/.test(r.progressNa ?? ""), JSON.stringify([r.stateButtons, r.progressNa]));

    // --- the purple boxes' RENDERED colour equals --wc-purple-ink exactly ---
    const ink = await page.evaluate(() => {
      const card = document.querySelector(".quran-word-card");
      const probe = document.createElement("i"); probe.style.color = "var(--wc-purple-ink)"; card.appendChild(probe);
      const want = getComputedStyle(probe).color; probe.remove();
      const off = [];
      for (const sel of ["[data-word-card-noun-shape]", "[data-word-card-noun-forms]"]) {
        const box = card.querySelector(sel);
        if (!box) { off.push(`${sel} missing`); continue; }
        for (const el of [box, ...box.querySelectorAll("*")]) {
          if (el.hasAttribute("data-noun-empty") || el.closest("[data-noun-empty]")) continue;
          // UPDATED IN PLACE 22 Oct 2026 (PCF MSA J69): the gold "Basic form: فَعَلَ" button now sits in the shape box's
          // sentence on its own gold chip, deliberately not purple; its own ink-on-chip contrast is checked below instead.
          if (el.closest(".word-card-basic-bar")) continue;
          if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
          const c = getComputedStyle(el).color;
          if (c !== want) off.push(`${el.tagName.toLowerCase()}${el.dataset.nounCell ? `[${el.dataset.nounCell}]` : ""}:${c}`);
        }
      }
      return { want, off };
    });
    check(`${L} every text in both purple boxes renders in exactly --wc-purple-ink (${ink.want})`, ink.off.length === 0, JSON.stringify(ink));
    // J69: the gold button's text against its own chip (WCAG AA 4.5:1 for normal text)
    const chip = await page.evaluate(() => {
      const b = document.querySelector("#quranWordCardMount .word-card-basic-btn"); if (!b) return null;
      const rgb = (c) => c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
      const lum = ([r, g, bl]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl); };
      const a = lum(rgb(getComputedStyle(b).color)), c = lum(rgb(getComputedStyle(b).backgroundColor));
      return Math.round(((Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05)) * 100) / 100;
    });
    check(`${L} the gold "Basic form" button's text reads on its own chip (contrast at least 4.5:1)`, chip !== null && chip >= 4.5, String(chip));

    // --- the way back: tap a box, tap a place, Back ---
    await page.click('[data-noun-cell="SG"]');
    await page.waitForTimeout(400);
    const list = await page.evaluate(() => {
      const l = document.querySelector("[data-noun-list]");
      return { key: l?.dataset.nounList ?? null, places: l ? l.querySelectorAll("[data-word-occurrence-goto]").length : 0, forms: l?.querySelectorAll("[data-noun-list-form]").length ?? 0, first: l?.querySelector("[data-word-occurrence-goto]")?.dataset.wordOccurrenceGoto ?? null };
    });
    check(`${L} tapping Singular-Genitive lists its forms and its 117 places`, list.key === "SG" && list.places === 117 && list.forms >= 2, JSON.stringify(list));
    await page.click('[data-noun-cell="SG"]');
    await page.waitForTimeout(300);
    check(`${L} tapping the box again closes the list`, (await page.$("[data-noun-list]")) === null);
    await page.click('[data-noun-cell="SG"]');
    await page.waitForTimeout(300);
    const target = await page.evaluate(() => document.querySelector("[data-noun-list] [data-word-occurrence-goto]")?.dataset.wordOccurrenceGoto);
    await page.evaluate(() => document.querySelector("[data-noun-list] [data-word-occurrence-goto]")?.click());
    await page.waitForTimeout(1500);
    const there = await page.evaluate((t) => {
      const [s, a] = t.split(":");
      return { cardOpen: !!document.querySelector(".quran-word-card:not([hidden]) [data-word-card-panel]"), surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value, back: !!document.querySelector("[data-word-card-origin-back]"), want: [s, a] };
    }, target);
    check(`${L} a tapped place opens that āyah (${target}) with "Back to Word Card" showing and the card closed`, there.surah === there.want[0] && there.ayah === there.want[1] && there.back && !there.cardOpen, JSON.stringify(there));
    await page.evaluate(() => document.querySelector("[data-word-card-origin-back]")?.click());
    await page.waitForTimeout(1800);
    const back = await page.evaluate(() => ({ level: document.querySelector("[data-word-card-panel]")?.dataset.wordCardPanel ?? null, ref: document.querySelector(".quran-word-card")?.textContent.match(/\d+:\d+/)?.[0] ?? null, here: !!document.querySelector("[data-noun-cell][data-noun-here]"), surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value }));
    check(`${L} Back returns to the same Word Card (2:2) on the same level (Taṣrīf)`, back.level === "tasrif" && back.surah === "2" && back.ayah === "2" && back.here, JSON.stringify(back));

    // --- fit at this width ---
    const fit = async (tag) => {
      const f = await page.evaluate(() => {
        const card = document.querySelector(".quran-word-card");
        const c = card.getBoundingClientRect();
        const t = card.querySelector("[data-noun-table]");
        const tr = t.getBoundingClientRect();
        const cut = [...t.querySelectorAll("td, th")].filter((e) => e.scrollWidth > e.clientWidth + 1).length;
        return { insideCard: tr.left >= c.left - 1 && tr.right <= c.right + 1, cardW: Math.round(c.width), tableW: Math.round(tr.width), cut, pageOver: document.documentElement.scrollWidth - innerWidth, cardOver: card.scrollWidth - card.clientWidth, anyTableChildOut: [...t.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.right > c.right + 1 || b.left < c.left - 1); }).length };
      });
      check(`${L} ${tag}: the forms table is inside the card, nothing cut, no sideways overflow`, f.insideCard && f.cut === 0 && f.pageOver <= 0 && f.cardOver <= 0 && f.anyTableChildOut === 0, JSON.stringify(f));
    };
    await fit("2:2:2");

    // ---------- 55:46:5 جَنَّتَانِ ----------
    await openWord(page, 55, 46, 5);
    await openTasrif(page);
    r = await read(page);
    check(`${L} 55:46:5 جَنَّتَانِ: Dual-Nominative box is ×3 (not 6)`, num(r.cells.DN?.n) === 3, JSON.stringify(r.cells.DN));
    check(`${L} 55:46:5: the "accusative or genitive" line is ×3 and is tappable`, num(r.cells.AG?.n) === 3 && !r.cells.AG.empty, JSON.stringify(r.cells.AG));
    check(`${L} 55:46:5: this word is the Dual-Nominative box`, r.cells.DN?.here === true && !r.cells.AG?.here, JSON.stringify([r.cells.DN, r.cells.AG]));
    if (en) check(`${L} 55:46:5: Case "Nominative" (its ending ـَانِ agrees)`, /Nominative/.test(r.chips.case ?? "") && /Dual/.test(r.chips.number ?? "") && /Feminine/.test(r.chips.gender ?? ""), JSON.stringify(r.chips));
    await fit("55:46:5");

    // ---------- 18:32:7 جَنَّتَيْنِ (Corpus says nominative; the ending says accusative or genitive) ----------
    await openWord(page, 18, 32, 7);
    await openTasrif(page);
    r = await read(page);
    if (en) {
      check(`${L} 18:32:7 جَنَّتَيْنِ: Case is "Accusative or genitive"`, /Accusative or genitive/.test(r.chips.case ?? ""), JSON.stringify(r.chips));
      check(`${L} 18:32:7: the word "Nominative" appears nowhere in its shape box`, r.shape !== null && !/Nominative|marfūʿ/i.test(r.shape), r.shape);
      check(`${L} 18:32:7: the line says where it comes from: its ending ـَيْنِ`, /ـَيْنِ/.test(r.caseLine ?? ""), r.caseLine);
    } else {
      check(`${L} 18:32:7 in Bangla: the shape box never says Nominative/মারফূ`, r.shape !== null && !/Nominative|মারফূ|মরফূ/.test(r.shape) && /ـَيْنِ/.test(r.caseLine ?? ""), JSON.stringify([r.shape, r.caseLine]));
    }
    check(`${L} 18:32:7: the AG line is the "this word" box and no table box is`, r.cells.AG?.here === true && ["DN", "DA", "DG"].every((k) => !r.cells[k]?.here), JSON.stringify([r.cells.AG, r.cells.DN]));
    await fit("18:32:7");

    // ---------- 49:9:2 طَآئِفَتَانِ and 9:10:10 ٱلْمُعْتَدُونَ (Corpus says genitive / accusative; the ending says nominative) ----------
    for (const [s, a, p, want] of [[49, 9, 2, { box: "DN", ending: "ـَانِ", number: /Dual/ }], [9, 10, 10, { box: "PN", ending: "ـُونَ", number: /Plural/ }]]) {
      await openWord(page, s, a, p);
      await openTasrif(page);
      r = await read(page);
      if (en) check(`${L} ${s}:${a}:${p}: Case reads "Nominative" from its ending ${want.ending}, never the Corpus's label`, /^Nominative/.test(r.chips.case ?? "") && !/Accusative|Genitive/.test(r.chips.case ?? "") && r.caseLine.includes(want.ending) && want.number.test(r.chips.number ?? ""), JSON.stringify([r.chips, r.caseLine]));
      check(`${L} ${s}:${a}:${p}: it sits in the ${want.box} box and nowhere else is "this word"`, r.cells[want.box]?.here === true && Object.values(r.cells).filter((c) => c.here).length === 1, JSON.stringify(Object.entries(r.cells).filter(([, c]) => c.here)));
    }

    // ---------- a particle keeps today's Not applicable line ----------
    await openWord(page, 2, 2, 1);
    await page.click('[data-word-card-level="tasrif"]', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    r = await read(page);
    check(`${L} 2:2:1 ذَٰلِكَ (a demonstrative, no noun code): keeps the Not applicable line`, r.na && !r.shape && Object.keys(r.cells).length === 0, JSON.stringify([r.na, r.shape]));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Word card Taṣrīf for nouns${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
// Architect review: a mutation run exits 1 when it is caught, like every other suite here.
process.exit(fail ? 1 : 0);
