// PCF J24 (Owner, 13 Oct 2026, a phone photo of a STUDENT account in Bangla): "why the Wheel, Legend n Unit
// buttons are missing". Reproduced: not the role. That phone had the landing wheel DRAGGED to a size (saved per
// device, mm_wheel_size_approach) and larger system text. The `.wheel-resized` !important rules beat
// fitLandingFirstScreen()'s --landing-wheel-max cap, so the wheel kept its dragged width and pushed the
// Wheel / Legend / Unit row behind the dock. Below 721px the cap now limits the dragged wrap too.
//
// Larger text is simulated with html { font-size: 125% } (Android text scaling). Run from the repository root,
// with serve.js on :8080. Mutation: delete the `body.landing-view #wheelResizeWrap.wheel-resized` rule in
// app/quranrevival.html, and every "row clear of the dock" case with a saved size fails.
import { chromium, newContext, openPage } from "./harness.mjs";
import { stubFor } from "./firebase-stub.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch();

function studentStub(s) {
  const ownerMember = 'personId: "p1", roles: ["owner", "prime"] },\n  ],\n  tenants:';
  if (!s.includes(ownerMember)) throw new Error("stub shape changed: owner tenantMemberUids row not found");
  s = s.replace(ownerMember, 'personId: "p2", roles: ["student"] },\n  ],\n  tenants:');
  const p2 = '{ _id: "p2", tenantId: TENANT_ID, personId: "p2",';
  if (!s.includes(p2)) throw new Error("stub shape changed: p2 not found");
  s = s.replace(p2, p2 + ' authUid: UID,');
  const head = 'export async function getDocs(q) {\n';
  if (!s.includes(head)) throw new Error("stub shape changed: getDocs not found");
  return s.replace(head, head + '  { const f = (q.__clauses || []).filter(function (c) { return c && c.field; });\n'
    + '    if (q.__col === "tenantPeople" && f.length === 1 && f[0].field === "tenantId") { var e = new Error("Missing or insufficient permissions."); e.code = "permission-denied"; throw e; } }\n');
}

async function open({ role, lang = "bn", width = 412, height = 780, saved = null, bigText = true, surah = true }) {
  const ctx = await newContext(browser, { banner: false, appLang: lang, viewport: { width, height } });
  if (role === "student") {
    const body = studentStub(stubFor({ banner: false }));
    await ctx.route("https://www.gstatic.com/firebasejs/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
  }
  if (saved) await ctx.addInitScript((v) => { try { localStorage.setItem("mm_wheel_size_approach", String(v)); } catch {} }, saved);
  if (bigText) await ctx.addInitScript(() => addEventListener("DOMContentLoaded", () => {
    const st = document.createElement("style"); st.textContent = "html { font-size: 125% !important; }"; document.head.append(st);
  }));
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(3000);
  if (surah) {
    // The Owner's photo: unit Whole Surah, so the dock carries its "Tracking" line and is taller.
    await page.evaluate(() => { const s = document.getElementById("unitTypeSelect"); s.value = "surah"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForTimeout(1200);
  }
  return { ctx, page };
}

const measure = (page) => page.evaluate(() => {
  const row = document.getElementById("wheelDrawerRow"), dock = document.getElementById("dock"), wrap = document.getElementById("wheelResizeWrap");
  const r = row.getBoundingClientRect(), d = dock.getBoundingClientRect();
  // Every drawer button must be the thing at its own centre (not the dock, not anything else on top).
  const hits = [...row.querySelectorAll("[data-wheel-drawer]")].map((b) => {
    const br = b.getBoundingClientRect(); const el = document.elementFromPoint(br.x + br.width / 2, Math.min(br.y + br.height / 2, innerHeight - 1));
    return !!el && b.contains(el);
  });
  return { rowBottom: r.bottom, rowH: r.height, dockTop: d.top, hits, resized: wrap.classList.contains("wheel-resized"), wrapW: wrap.getBoundingClientRect().width };
});

// 1. The Owner's photo: student, Bangla, larger text, a dragged wheel, Whole Surah.
for (const role of ["student", "owner"]) {
  const { ctx, page } = await open({ role, saved: 380 });
  const m = await measure(page);
  check(`${role}, dragged wheel: the saved size really applies (positive control)`, m.resized, JSON.stringify(m));
  check(`${role}, dragged wheel: the drawer row is on screen (height > 0)`, m.rowH > 0, JSON.stringify(m));
  check(`${role}, dragged wheel: the drawer row ends above the dock`, m.rowBottom <= m.dockTop + 0.5, `row bottom ${m.rowBottom} dock top ${m.dockTop}`);
  check(`${role}, dragged wheel: Wheel, Legend and Unit are each the element at their own centre`, m.hits.length === 3 && m.hits.every(Boolean), JSON.stringify(m.hits));
  await ctx.close();
}

// 2. No saved size: unchanged behaviour, the row still clear of the dock.
{ const { ctx, page } = await open({ role: "student" });
  const m = await measure(page);
  check("student, never dragged: no saved size (control)", !m.resized);
  check("student, never dragged: the drawer row ends above the dock", m.rowBottom <= m.dockTop + 0.5, `row bottom ${m.rowBottom} dock top ${m.dockTop}`);
  check("student, never dragged: Wheel, Legend and Unit each hittable", m.hits.every(Boolean), JSON.stringify(m.hits));
  await ctx.close(); }

// 3. Where there is room, a dragged size is still honoured exactly (the cap only bites when it must).
{ const { ctx, page } = await open({ role: "student", height: 1000, saved: 300, bigText: false, surah: false });
  const m = await measure(page);
  check("tall phone, dragged to 300px: the wheel keeps exactly its saved size", Math.abs(m.wrapW - 300) <= 1, `wrap ${m.wrapW}`);
  await ctx.close(); }

// 4. A PC is untouched by the J24 cap. Updated in place 23 Oct 2026: since v12.05 (PCF MSA J44, the Owner: "I want
//    always the app starts with this page setting (mostly size of the pop up and the wheel) in PC even after a new
//    version") a PC's wheel opens at the largest size that fits its window, NEVER from a size an earlier visit stored.
//    So this case asserted "keeps exactly its saved 420px" and had been red since v12.05 (it came up at 346, the fit).
//    It now asserts J44's rule: a stored size changes nothing on a PC, and the fitted wheel is a real size, not the floor.
{ const pc = async (saved) => { const { ctx, page } = await open({ role: "owner", lang: "en", width: 1280, height: 800, saved, bigText: false, surah: false });
    // Audit part 74: wait for the J44 fit to SETTLE (the width unchanged over three reads 500ms apart) before measuring;
    // a fixed 3s wait caught the no-saved-size page mid-fit (346 against its settled 387, measured by a probe).
    let prev = -1, same = 0;
    for (let i = 0; i < 30 && same < 3; i++) { const w = await page.evaluate(() => document.getElementById("wheelResizeWrap").getBoundingClientRect().width); same = Math.abs(w - prev) < 1 ? same + 1 : 0; prev = w; await page.waitForTimeout(500); }
    const m = await measure(page); await ctx.close(); return m; };
  const withSaved = await pc(420), none = await pc(null);
  check("PC (1280px), dragged to 420px on an earlier visit: the saved size really is stored (positive control)", withSaved.resized, JSON.stringify(withSaved));
  check("PC (1280px), J44: an earlier visit's saved size changes nothing -- the wheel opens at the same fitted size as with none saved",
    Math.abs(withSaved.wrapW - none.wrapW) <= 2, `saved 420 -> ${withSaved.wrapW}, none -> ${none.wrapW}`);
  check("PC (1280px): the fitted wheel is a real size (more than the 160px floor)", withSaved.wrapW > 200, `wrap ${withSaved.wrapW}`); }

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
