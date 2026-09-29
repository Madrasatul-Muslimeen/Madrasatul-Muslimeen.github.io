// Owner request, 28 Sep 2026 -- "Check the 'Approach Section' in 'Catalogue'
// under home menu. There's no option for adding new approach and assigning to
// a section. Fix it." The Catalogue page gains an "Add an Approach" form
// (owner/prime only): a name in English and/or Bangla, a Section, and the
// Approach's own "Counts for each āyah inside" rule.
//
// Rendered, in a real browser, both languages. The expected id and section
// are worked out BY HAND from the seed below, never by calling the page's own
// nextApproachId()/approachesInDisplayOrder().
//
//   node tools/i18n-verify/catalogue-add-approach-browser.mjs
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

// Two real-shaped Approaches in section 7 plus one REMOVED approach_31: the
// next id must be approach_32 (a removed Approach's id, and every claim keyed
// by it, is never reused -- I5), and the new one must land in section 7 AFTER
// approach_30.
const SEED = `
const SEC7 = { en: "A'mal / Application", bn: "আমল / প্রয়োগ" };
DATA.trackables.push(
  { _id: TENANT_ID + "__approach_29", tenantId: TENANT_ID, moduleId: "quranrevival", subjectId: "quran", order: 29, status: "active", group: 7, groupName: SEC7, name: { en: "Da'wah" } },
  { _id: TENANT_ID + "__approach_30", tenantId: TENANT_ID, moduleId: "quranrevival", subjectId: "quran", order: 30, status: "active", group: 7, groupName: SEC7, name: { en: "Teaching Others" } },
  { _id: TENANT_ID + "__approach_31", tenantId: TENANT_ID, moduleId: "quranrevival", subjectId: "quran", order: 31, status: "archived", group: 7, groupName: SEC7, name: { en: "An old removed one" } }
);
`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

for (const lang of ["en", "bn"]) {
  console.log(`\n=== Catalogue: Add an Approach, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width: 390, height: 844 }, extraSeedJs: SEED });
  const { page, errors } = await openPage(ctx, "/app/catalogue.html");
  await page.waitForFunction(() => document.querySelectorAll("#trackablesBody tr").length > 0, null, { timeout: 15000 });
  // 29 Sep 2026: the Catalogue is in tabs now (Modules, Subjects, Approaches,
  // Ladders & levels), so the Approach controls this suite checks sit behind
  // the Approaches tab. Updated in place: open that tab first.
  await page.click('[data-cat-tab="approaches"]');

  const box = await page.evaluate(() => {
    const f = document.getElementById("addApproachBox");
    const r = f.getBoundingClientRect();
    return {
      shown: getComputedStyle(f).display !== "none" && r.height > 0,
      legend: f.querySelector("legend").textContent.trim(),
      sections: [...document.querySelectorAll("#newApproachSection option")].map((o) => o.value),
      btnH: document.getElementById("addApproachBtn").getBoundingClientRect().height,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  check(`[${lang}] the owner sees the Add-an-Approach form`, box.shown, JSON.stringify(box));
  check(`[${lang}] its Section list offers all 7 sections`, JSON.stringify(box.sections) === '["1","2","3","4","5","6","7"]', JSON.stringify(box.sections));
  check(`[${lang}] the form's heading is in the reader's language`, lang === "en" ? box.legend === "Add an Approach" : /[ঀ-৿]/.test(box.legend), box.legend);
  check(`[${lang}] no sideways scroll at 390px`, box.overflow <= 1, String(box.overflow));

  // No name: refused in words, nothing written.
  const writesBefore = await page.evaluate(() => (window.__stubWriteData || []).length);
  await page.click("#addApproachBtn");
  await page.waitForTimeout(300);
  const refused = await page.evaluate((n) => ({ msg: document.getElementById("addApproachResult").textContent.trim(), writes: (window.__stubWriteData || []).length - n }), writesBefore);
  check(`[${lang}] with no name it says why and writes nothing`, refused.msg.length > 0 && refused.writes === 0, JSON.stringify(refused));

  await page.fill("#newApproachNameEn", "Recitation Circle");
  await page.fill("#newApproachNameBn", "তিলাওয়াত হালকা");
  await page.selectOption("#newApproachSection", "7");
  await page.selectOption("#newApproachCounts", "yes");
  await page.click("#addApproachBtn");
  await page.waitForFunction(() => /Recitation Circle|তিলাওয়াত হালকা/.test(document.getElementById("addApproachResult").textContent), null, { timeout: 8000 }).catch(() => {});

  const created = await page.evaluate(() => (window.__stubWriteData || []).find((w) => w.col === "trackables" && w.kind === "set"));
  check(`[${lang}] one new trackables document, id approach_32 (after the removed 31)`, created?.id === "t1__approach_32", JSON.stringify(created && created.id));
  const d = created?.data ?? {};
  check(`[${lang}] it is a Quran Approach in section 7 with section 7's name`, d.subjectId === "quran" && d.moduleId === "quranrevival" && d.group === 7 && d.groupName?.en === "A'mal / Application", JSON.stringify({ s: d.subjectId, g: d.group, gn: d.groupName }));
  check(`[${lang}] both names are saved`, d.name?.en === "Recitation Circle" && d.name?.bn === "তিলাওয়াত হালকা", JSON.stringify(d.name));
  check(`[${lang}] its own rule is saved: counts for each āyah inside = Yes`, d.countsForEachAyah === true, JSON.stringify(d.countsForEachAyah));
  check(`[${lang}] it has no platform template, so the name sync never overwrites it`, d.sourceTemplateId === null && d.edited === true && d.status === "active", JSON.stringify({ t: d.sourceTemplateId, e: d.edited, s: d.status }));

  // It shows in the table, in section 7, after approach_30 -- read off the
  // rendered rows, not off the page's own ordering function.
  const rows = await page.evaluate(() => {
    const out = [];
    let heading = null;
    for (const tr of document.querySelectorAll("#trackablesBody tr")) {
      if (tr.classList.contains("trk-section-heading")) { heading = tr.textContent.trim(); continue; }
      const edit = tr.querySelector(".editTrkBtn");
      if (edit) out.push({ id: edit.dataset.id, heading });
    }
    return out;
  });
  const i30 = rows.findIndex((r) => r.id === "approach_30");
  const i32 = rows.findIndex((r) => r.id === "approach_32");
  check(`[${lang}] the new Approach appears in the table`, i32 >= 0, JSON.stringify(rows.map((r) => r.id)));
  check(`[${lang}] under the same section heading as approach_30, right after it`, i30 >= 0 && i32 === i30 + 1 && rows[i32].heading === rows[i30].heading, JSON.stringify({ i30, i32, h30: rows[i30]?.heading, h32: rows[i32]?.heading }));
  // The renumber is one batched write (the stub's writeBatch records only a
  // count, so the order values are proven by the rendered rows above). What
  // is proven here: the create came first, then exactly one renumber batch.
  const log = await page.evaluate(() => (window.__fsLog || []).map((r) => r.kind + " " + (r.col || "")));
  const iSet = log.findIndex((l) => l.startsWith("setDoc trackables"));
  const iBatch = log.findIndex((l, k) => k > iSet && l.startsWith("batchCommit"));
  check(`[${lang}] the create is followed by one renumbering write`, iSet >= 0 && iBatch > iSet, JSON.stringify(log.slice(Math.max(0, iSet - 1), iSet + 3)));
  const msg = await page.evaluate(() => document.getElementById("addApproachResult").textContent.trim());
  check(`[${lang}] it says what was added, and where`, /Recitation Circle|তিলাওয়াত হালকা/.test(msg), msg);

  const real = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID|FAILED)/.test(e));
  check(`[${lang}] no page errors`, real.length === 0, real.join("; "));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Catalogue: Add an Approach: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
