// Decision 56 (issue #484) -- "a word of the same root AND the same meaning
// counts as known". Achieving ٱلرَّحْمَٰن (1:1:3) must mark ٱلرَّحِيم (1:1:4,
// 1:3:2) on the Read page, show a quiet "Known through ..." line on its Word
// card, write NOTHING for it, never spread a claim still awaiting a teacher,
// and never reach a word of the same root with a different meaning
// (أَرْحَام, "wombs"). The groups file is fetched on first use only (I9).
//
// Expected values are hand-written below, never computed by the code under
// test. Run from the repository root. MUTATE=nogroup|wholeroot|pending runs
// the same assertions against a deliberately broken build and must FAIL.
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = process.argv[2] || process.env.MUTATE || "";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

// Hand-written fixtures (checked against the real corpus when this was written):
// 1:1:3 = ٱلرَّحْمَٰن, 1:1:4 = ٱلرَّحِيم, 1:3:2 = ٱلرَّحِيم, and 3:6:5 is an
// occurrence of أَرْحَام (lemmas-index.json, ref 3006005) -- same root ر ح م,
// different meaning, so it is in NO mercy group.
const GROUPS_URL = "**/lemma-meaning-groups.json";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function newCtx(lang, width, height) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height } });
  if (MUTATE === "nogroup") {
    await ctx.route(GROUPS_URL, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ byLemma: {}, groups: {} }) }));
  } else if (MUTATE === "wholeroot") {
    // The whole root as one group: أَرْحَام joins the mercy words.
    await ctx.route(GROUPS_URL, async (r) => {
      const res = await r.fetch();
      const data = await res.json();
      const id = Object.entries(data.byLemma).find(([k]) => k.normalize("NFC") === "رَّحْمَٰن".normalize("NFC"))[1];
      data.byLemma["أَرْحَام"] = id;
      data.groups[id] = [...data.groups[id], "أَرْحَام"];
      await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
    });
  } else if (MUTATE === "pending") {
    // A pending claim spreads: group-mates are read as if no confirmation were required.
    await ctx.route("**/app/quranrevival.html", async (r) => {
      const res = await r.fetch();
      const body = (await res.text()).replace("lemmaId: mate, confirmationRequired })", "lemmaId: mate, confirmationRequired: false })");
      await r.fulfill({ response: res, body });
    });
  }
  return ctx;
}

async function enterRead(page) {
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const t = document.getElementById("wbwShowToggle");
    if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(600);
}
async function goTo(page, surah, ayah) {
  await page.evaluate(([s, a]) => {
    const ss = document.getElementById("surahSelect");
    if (ss.value !== String(s)) { ss.value = String(s); ss.dispatchEvent(new Event("change", { bubbles: true })); }
    const set = () => { const as = document.getElementById("ayahSelect"); as.value = String(a); as.dispatchEvent(new Event("change", { bubbles: true })); };
    setTimeout(set, 600);
  }, [surah, ayah]);
  await page.waitForFunction(([s, a]) => !!document.querySelector(`[data-word-occurrence$=":${s}:${a}:1"]`), [surah, ayah], { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}
const occ = (page, s, a, p) => page.evaluate(([s, a, p]) => {
  const els = [...document.querySelectorAll(`[data-word-occurrence$=":${s}:${a}:${p}"]`)];
  return { present: els.length > 0, marked: els.some((e) => e.classList.contains("is-known-word")) };
}, [s, a, p]);
async function openWord(page, s, a, p) {
  await page.evaluate(([s, a, p]) => document.querySelector(`[data-word-occurrence$=":${s}:${a}:${p}"]`)?.click(), [s, a, p]);
  await page.waitForFunction(() => {
    const b = document.querySelector("#quranWordCardMount [data-word-progress]");
    return !!b && !/Loading|লোড হচ্ছে/.test(b.querySelector(".word-progress-state")?.textContent ?? "");
  }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}
const readCard = (page) => page.evaluate(() => {
  const m = document.querySelector("#quranWordCardMount");
  const t = m?.querySelector("[data-word-known-through]");
  return {
    through: t?.textContent?.trim() ?? null,
    throughArabic: t?.querySelector("[lang=ar]")?.textContent?.trim() ?? null,
    pressed: [...(m?.querySelectorAll("[data-word-progress-state]") ?? [])].find((e) => e.getAttribute("aria-pressed") === "true")?.dataset.wordProgressState ?? null,
  };
});
const waitMark = (page, s, a, p, want) => page.waitForFunction(([s, a, p, want]) =>
  [...document.querySelectorAll(`[data-word-occurrence$=":${s}:${a}:${p}"]`)].some((e) => e.classList.contains("is-known-word")) === want,
  [s, a, p, want], { timeout: 5000 }).then(() => true).catch(() => false);

const THROUGH = { en: "Known through ", bn: "এর মাধ্যমে জানা (একই অর্থ)" };
const RAHMAN = "رَّحْمَٰن";
const errs = (errors) => errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e));

for (const [width, height] of [[390, 844], [1280, 900]]) {
  for (const lang of ["en", "bn"]) {
    const tag = `[${lang} ${width}]`;
    console.log(`\n=== ${tag} achieved ٱلرَّحْمَٰن marks ٱلرَّحِيم ===`);
    const ctx = await newCtx(lang, width, height);
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    const fetched = [];
    page.on("request", (r) => { if (/lemma-meaning-groups/.test(r.url())) fetched.push(r.url()); });
    await page.waitForTimeout(800);
    check(`${tag} the groups file is NOT fetched on the landing page`, fetched.length === 0, JSON.stringify(fetched));

    await enterRead(page);
    await goTo(page, 1, 1);
    check(`${tag} precondition: 1:1:3 and 1:1:4 are on screen`, (await occ(page, 1, 1, 3)).present && (await occ(page, 1, 1, 4)).present);
    check(`${tag} before any claim: 1:1:4 is not marked`, (await occ(page, 1, 1, 4)).marked === false);

    await openWord(page, 1, 1, 3);
    await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
    await page.waitForTimeout(900);
    // UPDATED IN PLACE, 2 Oct 2026 -- decision 58 corrects decision 56: WbW
    // Achieved counts the SAME word only; same root AND same meaning belongs
    // to BASIC Achieved, which has no lemma-wide claim until the Owner
    // publishes its Rules. So a WbW claim on ٱلرَّحْمَٰن must NOT mark ٱلرَّحِيم,
    // and the groups file is not even fetched while nothing can spread.
    check(`${tag} the groups file is NOT fetched while only WbW has a lemma-wide claim`, fetched.length === 0, JSON.stringify(fetched));
    check(`${tag} Achieved on ٱلرَّحْمَٰن marks itself`, await waitMark(page, 1, 1, 3, true));
    await page.waitForTimeout(600);
    check(`${tag} ... but NOT ٱلرَّحِيم at 1:1:4 (WbW counts the same word only)`, (await occ(page, 1, 1, 4)).marked === false);

    await goTo(page, 1, 3);
    check(`${tag} ... it marks the same word ٱلرَّحْمَٰن at 1:3:1`, await waitMark(page, 1, 3, 1, true));
    check(`${tag} ... and NOT ٱلرَّحِيم at 1:3:2`, (await occ(page, 1, 3, 2)).marked === false);
    await page.screenshot({ path: `.builder-round/shot-fatiha-${lang}-${width}.png` });

    await openWord(page, 1, 3, 2);
    const card = await readCard(page);
    // UPDATED IN PLACE (decision 58): no "Known through" line from a WbW claim.
    check(`${tag} the Word card on ٱلرَّحِيم has NO "Known through" line (a WbW claim does not spread)`, card.through === null, JSON.stringify(card));
    check(`${tag} ... while its own buttons still read not started`, card.pressed === "not_started", JSON.stringify(card));

    const writes = await page.evaluate(() => (window.__stubWriteData || []).map((w) => ({ col: w.col, id: w.id })));
    const forRahim = writes.filter((w) => /رَّحِيم/.test(w.id ?? "") || /_1_3(_|$)/.test(w.id ?? "") || /_1_1_4$/.test(w.id ?? ""));
    check(`${tag} nothing was written for ٱلرَّحِيم`, forRahim.length === 0, JSON.stringify(forRahim));
    const lemmaWrites = writes.filter((w) => w.col === "quranLemmaProgress");
    check(`${tag} the only lemma write was ٱلرَّحْمَٰن's own`, lemmaWrites.length >= 1 && lemmaWrites.every((w) => (w.id ?? "").endsWith(`__wbw__${RAHMAN}`) || (w.id ?? "").normalize("NFC").endsWith(`__wbw__${RAHMAN}`.normalize("NFC"))), JSON.stringify(lemmaWrites));

    // Same root, different meaning: أَرْحَام at 3:6:5 must stay unmarked.
    await goTo(page, 3, 6);
    const arham = await occ(page, 3, 6, 5);
    check(`${tag} precondition: 3:6:5 (أَرْحَام) is on screen`, arham.present);
    check(`${tag} أَرْحَام (wombs) is NOT marked -- same root, different meaning`, arham.marked === false);

    check(`${tag} no page errors`, errs(errors).length === 0, JSON.stringify(errs(errors).slice(0, 3)));
    await ctx.close();
  }
}

// A claim still awaiting a teacher spreads to nobody.
console.log(`\n=== a pending (unconfirmed) claim marks nothing ===`);
{
  const ctx = await newCtx("en", 390, 844);
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await enterRead(page);
  const switched = await page.evaluate(() => {
    const sel = document.getElementById("personSelect");
    const opt = sel && [...sel.options].find((o) => o.value === "p2");
    if (!opt) return false;
    sel.value = "p2"; sel.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  });
  check("[pending] the managed child is reachable", switched === true);
  await page.waitForTimeout(800);
  await goTo(page, 1, 1);
  await openWord(page, 1, 1, 3);
  await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
  await page.waitForTimeout(900);
  const waiting = await page.evaluate(() => /Waiting/i.test(document.querySelector("#quranWordCardMount [data-word-progress]")?.textContent ?? ""));
  check("[pending] the claim shows as waiting to be checked", waiting);
  check("[pending] ٱلرَّحْمَٰن itself is not marked while waiting", (await occ(page, 1, 1, 3)).marked === false);
  check("[pending] ٱلرَّحِيم at 1:1:4 is not marked either", (await occ(page, 1, 1, 4)).marked === false);
  await openWord(page, 1, 1, 4);
  check("[pending] ٱلرَّحِيم's card has no 'Known through' line", (await readCard(page)).through === null);
  check("[pending] no page errors", errs(errors).length === 0, JSON.stringify(errs(errors).slice(0, 3)));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Known meaning groups (issue #484)${MUTATE ? ` [MUTATE=${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
