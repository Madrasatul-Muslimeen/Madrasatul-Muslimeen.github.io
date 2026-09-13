// MAP Phase 3 -- RENDERED acceptance QA for WbW word progress, in a real
// browser, in both languages, at six viewports.
//
// Everything below is read off the RENDERED page -- measured rects, computed
// styles, real text, real focus, and the VALUES a write actually carried --
// never off the source and never off `.hidden`. A passing check that asserts
// the intent the code just expressed is this project's recorded blind spot.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// Seed one real lane so the READ path is proved, not only the write path.
// p1 is the fixture's owner (confirmation NOT required); p2 is a managed
// child with managedByPersonId set (confirmation REQUIRED) -- the two halves
// of Phase 3's own scope, already in the shared fixture.
const SEED = `
DATA.quranWordProgress = [{
  _id: TENANT_ID + "__p1__wbw__1_1", contractVersion: "quran-word-progress:v1",
  identityContract: "quran-word-occurrence:v1", lane: "learner",
  tenantId: TENANT_ID, personId: "p1", level: "wbw", surah: 1, ayah: 1,
  entries: { "2": { s: "a", at: "2026-09-13T10:00:00.000Z", by: "p1" }, "3": { s: "l", at: "2026-09-13T10:00:00.000Z", by: "p1" } },
}];
DATA.quranWordApprovals = [];
`;

async function enterReadWithWbw(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const t = document.getElementById("wbwShowToggle");
    if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(600);
}

/** Open the card on one specific word and wait for its progress block to settle. */
async function openWord(page, position) {
  await page.evaluate((p) => {
    const el = document.querySelector(`[data-word-occurrence$=":1:1:${p}"]`) || document.querySelectorAll("[data-word-occurrence]")[p - 1];
    el?.click();
  }, position);
  await page.waitForFunction(() => {
    const block = document.querySelector("#quranWordCardMount [data-word-progress]");
    return !!block && !/Loading|লোড হচ্ছে/.test(block.querySelector(".word-progress-state")?.textContent ?? "");
  }, null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(250);
}

for (const lang of ["en", "bn"]) {
  console.log(`\n=== rendered WbW progress, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 }, extraSeedJs: SEED });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");

  // --- I9: nothing joined the startup path ---------------------------------
  const startupReads = await page.evaluate(() =>
    (window.__fsLog || []).filter((r) => /quranWord/.test(r.col || "")).length);
  check(`[${lang}] no word-progress read on the landing path (I9)`, startupReads === 0, `saw ${startupReads}`);

  await enterReadWithWbw(page);
  const afterRead = await page.evaluate(() =>
    (window.__fsLog || []).filter((r) => /quranWord/.test(r.col || "")).length);
  check(`[${lang}] still none merely from opening Read`, afterRead === 0, `saw ${afterRead}`);

  // --- The block appears, and reads a SEEDED state -------------------------
  await openWord(page, 2);
  const afterOpen = await page.evaluate(() =>
    (window.__fsLog || []).filter((r) => /quranWord/.test(r.col || "")).map((r) => r.col));
  check(`[${lang}] opening a word reads both lanes and no more`,
    afterOpen.filter((c) => c === "quranWordProgress").length === 1 && afterOpen.filter((c) => c === "quranWordApprovals").length === 1,
    JSON.stringify(afterOpen));

  const block = await page.evaluate(() => {
    const b = document.querySelector("#quranWordCardMount [data-word-progress]");
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const buttons = [...b.querySelectorAll("[data-word-progress-state]")].map((el) => {
      const br = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { state: el.dataset.wordProgressState, text: el.textContent.trim(), pressed: el.getAttribute("aria-pressed"), w: Math.round(br.width), h: Math.round(br.height), top: Math.round(br.top), disabled: el.disabled, bg: cs.backgroundColor, color: cs.color };
    });
    return {
      onScreen: r.width > 0 && r.height > 0 && r.left >= 0 && r.right <= innerWidth,
      heading: b.querySelector(".word-progress-heading")?.textContent.trim() ?? null,
      buttons,
      coverage: b.querySelector(".word-progress-coverage")?.textContent.trim() ?? null,
      review: b.querySelector("[data-word-progress-review]")?.textContent.trim() ?? null,
      decideCount: b.querySelectorAll("[data-word-progress-decide]").length,
      blocked: b.querySelector("[data-word-progress-blocked]")?.textContent.trim() ?? null,
    };
  });
  check(`[${lang}] the progress block really renders, on screen`, !!block && block.onScreen, JSON.stringify(block));
  check(`[${lang}] three state buttons`, block?.buttons.length === 3, JSON.stringify(block?.buttons));
  check(`[${lang}] every state button is a real finger target (>=40px)`,
    block?.buttons.every((b) => b.h >= 40 && b.w >= 40), JSON.stringify(block?.buttons.map((b) => [b.w, b.h])));
  check(`[${lang}] the three buttons sit on ONE line`,
    new Set(block?.buttons.map((b) => b.top)).size === 1, JSON.stringify(block?.buttons.map((b) => b.top)));

  // The seeded state is `achieved` on word 2, and p1 needs no confirmation.
  const achieved = block?.buttons.find((b) => b.state === "achieved");
  check(`[${lang}] the SEEDED achieved state is what the card shows`, achieved?.pressed === "true", JSON.stringify(block?.buttons));
  check(`[${lang}] the selected button is visibly distinct from its neighbours`,
    achieved && block.buttons.some((b) => b.state !== "achieved" && b.bg !== achieved.bg), JSON.stringify(block?.buttons.map((b) => [b.state, b.bg])));
  check(`[${lang}] p1 needs no confirmation, so no decision buttons are offered`, block?.decideCount === 0, String(block?.decideCount));
  check(`[${lang}] p1 may record, so no "not allowed" line`, block?.blocked === null, String(block?.blocked));

  // --- Language ------------------------------------------------------------
  const bangla = /[ঀ-৿]/;
  if (lang === "bn") {
    check(`[bn] the heading is really in Bangla`, bangla.test(block?.heading ?? ""), block?.heading);
    check(`[bn] every state button is in Bangla, none left in English`,
      block?.buttons.every((b) => bangla.test(b.text)), JSON.stringify(block?.buttons.map((b) => b.text)));
    check(`[bn] the coverage line is in Bangla`, bangla.test(block?.coverage ?? ""), block?.coverage);
    check(`[bn] the coverage line carries BENGALI digits, not Western ones`,
      /[০-৯]/.test(block?.coverage ?? "") && !/[0-9]/.test(block?.coverage ?? ""), block?.coverage);
  } else {
    check(`[en] the heading is English`, !bangla.test(block?.heading ?? "") && !!block?.heading, block?.heading);
    check(`[en] the coverage line names known and total`, /\d+.*\d+/.test(block?.coverage ?? ""), block?.coverage);
  }

  // --- Coverage is computed from the SEEDED lane, not invented -------------
  // Ayah 1:1 has 4 words. One is `achieved` and p1 self-confirms, so exactly
  // one counts as known; the other three are read and not started.
  const covNumbers = await page.evaluate(() => {
    const text = document.querySelector("#quranWordCardMount .word-progress-coverage")?.textContent ?? "";
    const western = text.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09E6));
    return (western.match(/\d+/g) || []).map(Number);
  });
  // Asserted as a SET, not positionally. The Bangla reads "of this ayah's
  // {total} words, {known} are known" -- the natural Bengali order, and the
  // whole reason the card's strings carry named placeholders rather than
  // fixed positions. The first version of this check assumed English order
  // and failed on a correct translation.
  check(`[${lang}] coverage reads 1 known of 4 from the seeded lane`,
    covNumbers.length === 2 && covNumbers.includes(1) && covNumbers.includes(4), JSON.stringify(covNumbers));
  check(`[${lang}] and it is COMPLETE -- nothing unloaded, so no caveat`,
    (block?.coverage ?? "").indexOf("(") === -1 && covNumbers.length === 2, JSON.stringify(covNumbers));
  if (lang === "bn") {
    check(`[bn] the Bangla really places the numbers in its own order`,
      covNumbers[0] === 4 && covNumbers[1] === 1,
      `${JSON.stringify(covNumbers)} -- if this ever reads [1,4] the Bangla has been rewritten into English order`);
  }

  // --- LOCK: Activity != Mastery. Browsing writes nothing. ----------------
  const writesAfterBrowsing = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => /quranWord/.test(w.col || "")).length);
  check(`[${lang}] opening, reading and switching tab wrote NOTHING`, writesAfterBrowsing === 0, String(writesAfterBrowsing));
  await page.click('#quranWordCardMount [data-word-card-level="basic"]');
  await page.waitForTimeout(150);
  await page.click('#quranWordCardMount [data-word-card-level="wbw"]');
  await page.waitForTimeout(150);
  const writesAfterTabs = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => /quranWord/.test(w.col || "")).length);
  check(`[${lang}] switching Arabic level still wrote nothing`, writesAfterTabs === 0, String(writesAfterTabs));

  // --- A real claim, proved by the VALUE it wrote --------------------------
  await page.click('#quranWordCardMount [data-word-progress-state="learning"]');
  await page.waitForTimeout(400);
  const claimWrite = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranWordProgress").at(-1));
  check(`[${lang}] pressing Learning wrote to the learner lane, at the right document`,
    claimWrite?.col === "quranWordProgress" && /__p1__wbw__1_1$/.test(claimWrite?.id ?? ""), JSON.stringify(claimWrite?.id));
  check(`[${lang}] the write was a single dotted field, not the whole document`,
    Object.keys(claimWrite?.data ?? {}).filter((k) => k.startsWith("entries.")).length === 1, JSON.stringify(Object.keys(claimWrite?.data ?? {})));
  check(`[${lang}] and it carried the state that was pressed, and who pressed it`,
    claimWrite?.data?.["entries.2"]?.s === "l" && claimWrite?.data?.["entries.2"]?.by === "p1", JSON.stringify(claimWrite?.data));
  check(`[${lang}] nothing was written to the approvals lane by a claim`,
    (await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranWordApprovals").length)) === 0);
  check(`[${lang}] no claim leaked into the records collection (a word is not an Approach claim)`,
    (await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "records").length)) === 0);

  const afterClaim = await page.evaluate(() => {
    const b = document.querySelector("#quranWordCardMount [data-word-progress]");
    return {
      pressed: [...b.querySelectorAll("[data-word-progress-state]")].filter((el) => el.getAttribute("aria-pressed") === "true").map((el) => el.dataset.wordProgressState),
      coverage: (b.querySelector(".word-progress-coverage")?.textContent ?? "").replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09E6)).match(/\d+/g)?.map(Number),
    };
  });
  check(`[${lang}] the card shows the new state immediately, from its own cache`,
    afterClaim.pressed.length === 1 && afterClaim.pressed[0] === "learning", JSON.stringify(afterClaim.pressed));
  // Set-wise again, for the same reason as above.
  check(`[${lang}] and coverage fell to 0 known of 4, because the achieved claim was withdrawn`,
    afterClaim.coverage?.length === 2 && afterClaim.coverage.includes(0) && afterClaim.coverage.includes(4), JSON.stringify(afterClaim.coverage));

  check(`[${lang}] no page errors`, errors.length === 0, JSON.stringify(errors.slice(0, 3)));
  await page.screenshot({ path: `/tmp/claude-0/-home-user/a1e19a2e-bf40-5532-b479-4f9a08409a5a/scratchpad/p3-progress-${lang}.png` });
  await ctx.close();
}

// ---------------------------------------------------------------------------
// The SUPERVISOR half: a managed student, a claim that waits, and a real
// teacher decision. p2 is the shared fixture's managed child
// (managedByPersonId: "p1"), so records.js's own computed rule answers
// "confirmation required" for them and "not required" for p1 -- the two
// halves of Phase 3's scope, without inventing a fixture.
// ---------------------------------------------------------------------------
console.log(`\n=== managed student, approval and teacher decision ===`);
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 }, extraSeedJs: SEED });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await enterReadWithWbw(page);
  await openWord(page, 2);

  const beforeSwitch = await page.evaluate(() => {
    const b = document.querySelector("#quranWordCardMount [data-word-progress]");
    return { pressed: [...b.querySelectorAll("[data-word-progress-state]")].find((el) => el.getAttribute("aria-pressed") === "true")?.dataset.wordProgressState ?? null };
  });
  check("[sup] p1's own seeded state is showing before the switch", beforeSwitch.pressed === "achieved", JSON.stringify(beforeSwitch));

  // D10: switching student from the roster dropdown is the normal fast
  // workflow, and is exactly where a stale cache would show one child's
  // progress under another child's name.
  const switched = await page.evaluate(() => {
    const sel = document.getElementById("personSelect");
    if (!sel) return "no personSelect";
    const opt = [...sel.options].find((o) => o.value === "p2");
    if (!opt) return `no p2 among ${[...sel.options].map((o) => o.value).join(",")}`;
    sel.value = "p2";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    return "ok";
  });
  check("[sup] the roster dropdown really offers the managed child", switched === "ok", switched);
  await page.waitForTimeout(700);
  await openWord(page, 2);

  const asStudent = await page.evaluate(() => {
    const b = document.querySelector("#quranWordCardMount [data-word-progress]");
    if (!b) return null;
    return {
      pressed: [...b.querySelectorAll("[data-word-progress-state]")].filter((el) => el.getAttribute("aria-pressed") === "true").map((el) => el.dataset.wordProgressState),
      decideButtons: [...b.querySelectorAll("[data-word-progress-decide]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { review: el.dataset.wordProgressDecide, text: el.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
      }),
      coverage: (b.querySelector(".word-progress-coverage")?.textContent ?? "").match(/\d+/g)?.map(Number),
      review: b.querySelector("[data-word-progress-review]")?.textContent.trim() ?? null,
    };
  });
  check("[sup] p1's seeded achieved state did NOT follow the switch to p2",
    asStudent && asStudent.pressed[0] === "not_started", JSON.stringify(asStudent?.pressed));
  check("[sup] p2 has read nothing of p1's coverage either",
    asStudent?.coverage?.[0] === 0 && asStudent?.coverage?.[1] === 4, JSON.stringify(asStudent?.coverage));

  // A supervisor records the claim FOR the managed child.
  await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
  await page.waitForTimeout(400);
  const claimForChild = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranWordProgress").at(-1));
  check("[sup] the claim landed on the CHILD's document, not the teacher's",
    /__p2__wbw__1_1$/.test(claimForChild?.id ?? ""), String(claimForChild?.id));
  // Either shape: this is p2's FIRST word, so it takes the create path and the
  // entry is nested, where a later word in the same ayah arrives as a dotted
  // field update. The first version of this check only knew the update shape.
  const childEntry = claimForChild?.data?.["entries.2"] ?? claimForChild?.data?.entries?.["2"];
  check("[sup] and it recorded whose hand made it (p1 acting for p2)",
    childEntry?.by === "p1" && childEntry?.s === "a" && claimForChild?.data?.personId === "p2",
    JSON.stringify(claimForChild?.data));

  const awaiting = await page.evaluate(() => {
    const b = document.querySelector("#quranWordCardMount [data-word-progress]");
    return {
      review: b.querySelector("[data-word-progress-review]")?.textContent.trim() ?? null,
      coverage: (b.querySelector(".word-progress-coverage")?.textContent ?? "").match(/\d+/g)?.map(Number),
      decideButtons: [...b.querySelectorAll("[data-word-progress-decide]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { review: el.dataset.wordProgressDecide, text: el.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
      }),
    };
  });
  check("[sup] LOCK: the claim is shown as WAITING, not as known", /Waiting/i.test(awaiting.review ?? ""), String(awaiting.review));
  check("[sup] LOCK: Activity != Mastery -- the waiting claim scores 0 in coverage",
    awaiting.coverage?.[0] === 0 && awaiting.coverage?.[1] === 4, JSON.stringify(awaiting.coverage));
  check("[sup] the two decision buttons are now offered", awaiting.decideButtons.length === 2, JSON.stringify(awaiting.decideButtons.map((b) => b.text)));
  check("[sup] both decision buttons are real finger targets on one line",
    awaiting.decideButtons.every((b) => b.h >= 40 && b.w >= 40) && new Set(awaiting.decideButtons.map((b) => b.top)).size === 1,
    JSON.stringify(awaiting.decideButtons));

  // The teacher confirms.
  await page.click('#quranWordCardMount [data-word-progress-decide="confirmed"]');
  await page.waitForTimeout(400);
  const decision = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranWordApprovals").at(-1));
  check("[sup] the decision went to the APPROVALS lane, a different document",
    decision?.col === "quranWordApprovals" && /__p2__wbw__1_1$/.test(decision?.id ?? ""), JSON.stringify(decision?.id));
  const entry = decision?.data?.["entries.2"] ?? decision?.data?.entries?.["2"];
  check("[sup] it recorded the decision, the reviewer, and WHICH claim it was for",
    entry?.r === "c" && entry?.by === "p1" && entry?.s === "a" && !!entry?.fc, JSON.stringify(entry));

  const afterConfirm = await page.evaluate(() => {
    const b = document.querySelector("#quranWordCardMount [data-word-progress]");
    return {
      review: b.querySelector("[data-word-progress-review]")?.textContent.trim() ?? null,
      coverage: (b.querySelector(".word-progress-coverage")?.textContent ?? "").match(/\d+/g)?.map(Number),
    };
  });
  check("[sup] the card now says confirmed", /[Cc]onfirmed/.test(afterConfirm.review ?? ""), String(afterConfirm.review));
  check("[sup] and ONLY NOW does the word count towards coverage",
    afterConfirm.coverage?.[0] === 1 && afterConfirm.coverage?.[1] === 4, JSON.stringify(afterConfirm.coverage));

  check("[sup] nothing was ever written to records or activity", (await page.evaluate(() =>
    (window.__stubWriteData || []).filter((w) => w.col === "records" || w.col === "activity").length)) === 0);
  check("[sup] no page errors", errors.length === 0, JSON.stringify(errors.slice(0, 3)));
  await page.screenshot({ path: `/tmp/claude-0/-home-user/a1e19a2e-bf40-5532-b479-4f9a08409a5a/scratchpad/p3-progress-supervisor.png` });
  await ctx.close();
}

// --- Responsive: the block must not wrap or overflow at any phone width ----
console.log(`\n=== responsive, six viewports x two languages ===`);
for (const lang of ["en", "bn"]) {
  for (const [w, h] of [[320, 640], [360, 740], [390, 844], [412, 915], [768, 1024], [1100, 900]]) {
    const ctx = await newContext(browser, { appLang: lang, viewport: { width: w, height: h }, extraSeedJs: SEED });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await enterReadWithWbw(page);
    await openWord(page, 2);
    const m = await page.evaluate(() => {
      const b = document.querySelector("#quranWordCardMount [data-word-progress]");
      if (!b) return null;
      const buttons = [...b.querySelectorAll("[data-word-progress-state]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width), truncated: el.scrollWidth > el.clientWidth + 1, text: el.textContent.trim() };
      });
      const r = b.getBoundingClientRect();
      const mount = document.getElementById("quranWordCardMount");
      const mr = mount.getBoundingClientRect();
      const states = b.querySelector(".word-progress-states");
      return {
        buttons, inside: r.left >= 0 && r.right <= innerWidth + 1,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        // The control must be REACHABLE, not merely correct. At 320x640 the
        // card's own 45vh cap once left all three buttons below the fold --
        // found by looking at a screenshot while every rect check passed.
        statesReachableWithoutScrolling: states.getBoundingClientRect().bottom <= mr.bottom + 1,
      };
    });
    const ok = m && m.buttons.length === 3 && new Set(m.buttons.map((b) => b.top)).size === 1
      && m.buttons.every((b) => b.h >= 40) && m.inside && !m.buttons.some((b) => b.truncated)
      && m.statesReachableWithoutScrolling && m.overflow <= 0;
    check(`[${lang}] ${w}x${h}: one line, >=40px, on screen, reachable, no label cut, no sideways scroll`, !!ok,
      m ? `tops=${JSON.stringify(m.buttons.map((b) => b.top))} h=${JSON.stringify(m.buttons.map((b) => b.h))} cut=${JSON.stringify(m.buttons.filter((b) => b.truncated).map((b) => b.text))} inside=${m.inside} reachable=${m.statesReachableWithoutScrolling} overflowX=${m.overflow}` : "no block");
    await ctx.close();
  }
}

await browser.close();
console.log(`\n==== Rendered WbW progress: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
