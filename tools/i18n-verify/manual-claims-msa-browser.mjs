// Audit part 87 (PCF MSA J29): the User Manual's MSA-owned sections checked claim by claim against the app.
// Each ### entry of the Manual becomes the steps a reader would take (real clicks and typing on the rendered page) and an
// assertion on what "What it does" says. One check per claim, named with the entry's title.
//
//   node tools/i18n-verify/manual-claims-msa-browser.mjs            (needs node serve.js on 8080)
//   --section=start|bookmarks|teaching|notes|hadith|modules   one section only
//   --verbose                            print PASS lines too
//   --mutate=<name>                      break one claim so its check must FAIL (one per section):
//        start      hides the Esc/outside-click close of the menu bar (sets every menu to stay open)
//        bookmarks  hides the Bookmark menu's ✕ Close button
//        teaching   hides the People page's "Hand the device to a child" box
//        modules    removes Track my progress (topic and routine), the topic's bookmark star and the Continue chip
//        hadith     breaks one claim per entry: Text language, Go to number, Studied, Next ›, a progress stage, ✓ Check this dua
import { chromium, newContext, openPage, BASE as BASE_URL } from "./harness.mjs";

let pass = 0, fail = 0, skip = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const SKIP = (name, why) => { skip++; console.log(`  SKIP  ${name} (${why})`); };
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const ONLY = arg("section"), MUTATE = arg("mutate");
const want = (s) => !ONLY || ONLY === s;

const VIEWPORTS = [[390, 844], [1440, 900]];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const quiet = (errors) => errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
const isOpen = (page, sel) => page.evaluate((s) => { const m = /^LABEL:(.*)$/.exec(s); const d = m ? [...document.querySelectorAll("details.nav-cat")].find((x) => x.querySelector(":scope > summary")?.textContent.trim() === m[1]) : document.querySelector(s); return !!d?.open; }, sel);
const shown = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; }, sel);
// Puts the page back to rest between entries, so one failed claim cannot leave a menu open and fail the next (the harness's job, not a claim).
const tidy = (page) => page.evaluate(() => { document.querySelectorAll(".nav-cat[open]").forEach((c) => { c.open = false; }); document.getElementById("accountCardOverlay")?.classList.remove("open"); });
const settle = async (page, sel = "#navBar details.nav-cat") => { await page.waitForSelector(sel, { state: "attached", timeout: 15000 }); await page.waitForTimeout(500); };

async function open(path, { w, h, lang = null, ctxOpts = {} }) {
  const ctx = await newContext(browser, { banner: false, appLang: lang, viewport: { width: w, height: h }, ...ctxOpts });
  const { page, errors } = await openPage(ctx, path);
  return { ctx, page, errors };
}

// =====================================================================================================================
// ▸ Getting started and moving around
// =====================================================================================================================
if (want("start")) {
  console.log("== Getting started and moving around");
  for (const [w, h] of VIEWPORTS) {
    const tag = `${w}px`;
    const { ctx, page, errors } = await open("/app/people.html", { w, h });
    await settle(page);
    if (MUTATE === "start") await page.evaluate(() => { window.addEventListener("keydown", (e) => { if (e.key === "Escape") e.stopImmediatePropagation(); }, true); });

    // ### Signing in and creating an account
    const sign = await page.evaluate(() => ({ btn: document.getElementById("signInBtn")?.textContent.trim(), inHome: !!document.querySelector(".nav-cat-home #signInBtn") }));
    check(`[${tag}] Signing in: Home ▾ holds a "Sign in with Google" button`, sign.btn === "Sign in with Google" && sign.inHome, JSON.stringify(sign));
    check(`[${tag}] Signing in: a signed-in reader does not see the Sign in button`, !(await shown(page, "#signInBtn")));
    if (w === 390) SKIP("Signing in: pressing Sign in with Google", "real Google sign-in needs the network");

    // ### The menu bar
    const names = await page.evaluate(() => [...document.querySelectorAll("#topNav > details.nav-cat > summary, #navBar > details.nav-cat > summary")].map((s) => s.textContent.trim()));
    check(`[${tag}] The menu bar: four menus Home, Modules, Operation, Bookmark`, JSON.stringify(names) === JSON.stringify(["Home", "Modules", "Operation", "Bookmark"]), JSON.stringify(names));
    const summ = (label) => page.locator("#topNav summary", { hasText: new RegExp(`^${label}$`) }).first();
    const catOf = (label) => `LABEL:${label}`;
    await summ("Modules").click(); await page.waitForTimeout(150);
    check(`[${tag}] The menu bar: tapping Modules opens it`, await isOpen(page, catOf("Modules")));
    await summ("Modules").click(); await page.waitForTimeout(150);
    check(`[${tag}] The menu bar: tapping it again closes it`, !(await isOpen(page, catOf("Modules"))));
    await summ("Operation").click(); await page.waitForTimeout(150);
    await page.mouse.click(Math.floor(w / 2), h - 20); await page.waitForTimeout(150);
    check(`[${tag}] The menu bar: tapping outside closes it`, !(await isOpen(page, catOf("Operation"))));
    await summ("Home").click(); await page.waitForTimeout(150);
    const homeOpen = await isOpen(page, catOf("Home"));
    await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    check(`[${tag}] The menu bar: Esc closes an open menu (positive control: it was open)`, homeOpen && !(await isOpen(page, catOf("Home"))));
    // Modules list
    await summ("Modules").click(); await page.waitForTimeout(150);
    const mods = await page.evaluate(() => [...document.querySelectorAll("#navBar details.nav-cat:first-child .nav-cat-links a")].map((a) => a.textContent.trim()));
    const need = ["Quran Study", "Deen Study", "Arabic", "Hadith", "Learn Deen On-the-Go", "Asma ul Husna"];
    const hiddenOnes = ["General Study", "Nature-Life", "Life Skill", "Health"];
    check(`[${tag}] The menu bar: Modules ▾ holds ${need.join(", ")}`, need.every((n) => mods.some((m) => m.replace(/\s+/g, " ").includes(n))), JSON.stringify(mods));
    check(`[${tag}] The menu bar: General Study, Nature-Life, Life Skill and Health are hidden from Modules ▾`, !hiddenOnes.some((n) => mods.some((m) => m.includes(n))), JSON.stringify(mods));
    await page.keyboard.press("Escape");
    // Home links the frozen versions
    const legacy = await page.evaluate(() => [...document.querySelectorAll(".nav-cat-home a.nav-legacy-link")].map((a) => a.textContent.trim()));
    check(`[${tag}] The menu bar: Home ▾ links Legacy App v06 ↗ … v11 ↗`, ["v06", "v07", "v08", "v09", "v10", "v11"].every((v) => legacy.some((l) => l === `Legacy App - ${v} ↗`)), JSON.stringify(legacy));
    // Bookmark sheet
    await summ("Bookmark").click(); await page.waitForTimeout(400);
    const sheet = await page.evaluate(() => { const c = document.querySelector(".nav-cat-bookmark .nav-cat-links"); const r = c.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), close: document.querySelector("[data-nav-bm-close]")?.textContent.trim() }; });
    check(`[${tag}] The menu bar: Bookmark ▾ opens a full-screen sheet with ✕ Close`, sheet.w >= w - 2 && sheet.h >= h - 2 && /✕\s*Close/.test(sheet.close || ""), JSON.stringify(sheet));
    await page.click("[data-nav-bm-close]"); await page.waitForTimeout(150);
    check(`[${tag}] The menu bar: ✕ Close closes the Bookmark sheet`, !(await isOpen(page, ".nav-cat-bookmark")));
    await page.evaluate(() => document.querySelectorAll(".nav-cat[open]").forEach((c) => { c.open = false; })); // only matters when a claim above failed
    await summ("Bookmark").click(); await page.waitForTimeout(300); await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    check(`[${tag}] The menu bar: Esc closes the Bookmark sheet`, !(await isOpen(page, ".nav-cat-bookmark")));
    await page.evaluate(() => document.querySelectorAll(".nav-cat[open]").forEach((c) => { c.open = false; }));

    // ### My account
    await tidy(page);
    await summ("Home").click(); await page.waitForTimeout(150);
    const accBtn = await shown(page, "[data-open-account-card]");
    check(`[${tag}] My account: Home ▾ has 👤 My account`, accBtn);
    await page.click("[data-open-account-card]"); await page.waitForTimeout(250);
    const acc = await page.evaluate(() => ({
      open: document.getElementById("accountCardOverlay")?.classList.contains("open"),
      facts: [...document.querySelectorAll("#accountCardFacts dt")].map((d) => d.textContent.trim()),
      tenantPicker: !!document.querySelector("#accountCardPickers #tenantSelect"),
    }));
    check(`[${tag}] My account: the card shows email and tenant`, acc.open && acc.facts.includes("Email") && acc.facts.includes("Tenant"), JSON.stringify(acc));
    // APP IS WRONG (reported, not fixed): account-card.js's mountPageAccountCard() hands getSummary() only name (movePerson pages) + email + tenant, never roles.
    check(`[${tag}] My account: the card shows name, email, tenant, roles`, acc.open && ["Name", "Email", "Tenant", "Roles"].every((k) => acc.facts.includes(k)), JSON.stringify(acc));
    check(`[${tag}] My account: the Tenant picker is inside the card`, acc.tenantPicker, JSON.stringify(acc));
    await page.click("#accountCardClose"); await page.waitForTimeout(200);
    check(`[${tag}] My account: ✕ closes the card`, !(await page.evaluate(() => document.getElementById("accountCardOverlay").classList.contains("open"))));

    // ### Card look
    await tidy(page);
    await summ("Home").click(); await page.waitForTimeout(150);
    const look = async () => page.evaluate(() => document.documentElement.getAttribute("data-card-look"));
    await page.click('[data-card-look-btn="light"]'); await page.waitForTimeout(150);
    const l1 = await look();
    const bgLight = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--card-bg") || getComputedStyle(document.body).backgroundColor);
    await page.click('[data-card-look-btn="night"]'); await page.waitForTimeout(150);
    const l2 = await look();
    check(`[${tag}] Card look: Light then Night set the look`, l1 === "light" && l2 === "night", `${l1} / ${l2}`);
    await page.keyboard.press("Escape");

    // ### Language: English or Bangla
    await tidy(page);
    await summ("Home").click(); await page.waitForTimeout(150);
    const enH1 = await page.evaluate(() => document.querySelector("h1").textContent.trim());
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }).catch(() => {}), page.selectOption("#navAppLangSelect", "bn")]);
    await page.waitForTimeout(1200);
    const bn = await page.evaluate(() => ({ h1: document.querySelector("h1").textContent.trim(), summ: [...document.querySelectorAll("#topNav summary")].map((s) => s.textContent.trim()), th: [...document.querySelectorAll("#rosterTable th")].map((x) => x.textContent.trim()) }));
    check(`[${tag}] Language: choosing বাংলা reloads the page in Bangla (heading, menus, table heads)`, /[ঀ-৿]/.test(bn.h1) && bn.h1 !== enH1 && bn.summ.every((s) => /[ঀ-৿]/.test(s)) && bn.th.some((s) => /[ঀ-৿]/.test(s)), JSON.stringify(bn));
    await page.waitForSelector("#navAppLangSelect", { state: "attached" });
    await summ_bn(page);
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }).catch(() => {}), page.selectOption("#navAppLangSelect", "en")]);
    await page.waitForTimeout(1200);
    const back = await page.evaluate(() => document.querySelector("h1").textContent.trim());
    check(`[${tag}] Language: choosing English returns it`, back === enH1, back);
    check(`[${tag}] Getting started: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
    await ctx.close();
  }

  // ### Adding family members at sign-up   (the stub is already signed in, so the onboarding form shows with an empty tenant)
  for (const [w, h] of VIEWPORTS) {
    const tag = `${w}px`;
    for (const mode of ["save", "skip"]) {
      const { ctx, page, errors } = await open("/app/onboarding.html", { w, h, ctxOpts: { emptyTenant: true } });
      await page.waitForSelector("#onboardForm", { state: "visible", timeout: 15000 });
      const stepBefore = await page.evaluate(() => !document.getElementById("familyStep").hidden);
      await page.check('input[name="tenantType"][value="family"]');
      await page.fill("#name", "Test Parent");
      await page.click("#createBtn");
      await page.waitForSelector("#familyStep:not([hidden])", { timeout: 10000 }).catch(() => {});
      const step = await page.evaluate(() => ({ shown: !document.getElementById("familyStep").hidden, h: document.getElementById("familyHeading").textContent.trim(), labels: [...document.querySelectorAll("#familyRows .fam-row label")].map((l) => l.textContent.trim()), child: !!document.querySelector('#familyRows [data-fam-k="child"]'), rows: document.querySelectorAll("#familyRows .fam-row").length }));
      if (mode === "save") {
        check(`[${tag}] Adding family members: a family account shows "Who is in your family?" only after Create`, !stepBefore && step.shown && step.h === "Who is in your family?", JSON.stringify({ stepBefore, step }));
        check(`[${tag}] Adding family members: each row has Name, Year of birth and a child tick`, step.labels.some((l) => l.startsWith("Name")) && step.labels.some((l) => l.startsWith("Year of birth")) && step.child, JSON.stringify(step));
        await page.click("#familyAdd"); await page.waitForTimeout(150);
        const rows2 = await page.locator("#familyRows .fam-row").count();
        check(`[${tag}] Adding family members: + Add another adds a row`, rows2 === step.rows + 1, `${step.rows} -> ${rows2}`);
        await page.fill("#famName0", "Amina"); await page.fill("#famYear0", "2015");
        const ticked = await page.evaluate(() => document.querySelector('#familyRows [data-fam-i="0"][data-fam-k="child"]').checked);
        check(`[${tag}] Adding family members: a year of birth under 18 ticks "child"`, ticked === true);
        await page.click("#familySave"); await page.waitForTimeout(1200);
        const res = await page.evaluate(() => document.getElementById("familyResult").textContent.trim());
        const wrote = await page.evaluate(() => (window.__stubWriteData || []).concat(JSON.parse(sessionStorage.getItem("__stubWrites") || "[]")).some((x) => JSON.stringify(x).includes("Amina")));
        check(`[${tag}] Adding family members: Save and continue reports who was added and writes the person`, /Added 1 to your family/.test(res) && wrote, JSON.stringify({ res, wrote }));
      } else {
        await page.click("#familySkip"); await page.waitForTimeout(300);
        const res = await page.evaluate(() => document.getElementById("familyResult").textContent.trim());
        check(`[${tag}] Adding family members: Skip for now leaves it for the People page`, /add family members any time on the People page/.test(res), res);
        check(`[${tag}] Adding family members: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
      }
      await ctx.close();
    }
  }

  // ### The way back   (a menu link carries navBack=1; the page it opens shows ← Back to the page it came from, and the button returns there)
  for (const [w, h] of VIEWPORTS) {
    const tag = `${w}px`;
    const { ctx, page } = await open("/app/people.html", { w, h });
    await settle(page);
    await page.locator("#topNav summary", { hasText: /^Home$/ }).first().click(); await page.waitForTimeout(200);
    await page.click('.nav-cat-home a[href^="about.html"]');
    await page.waitForSelector("[data-bm-back]", { state: "visible", timeout: 15000 }).catch(() => {});
    const bk = await page.evaluate(() => { const b = document.querySelector("[data-bm-back]"); return { text: b?.textContent.replace(/\s+/g, " ").trim(), url: location.pathname.split("/").pop() }; });
    check(`[${tag}] The way back: Home ▾ → About shows a "← Back" button (the Manual says "← Back to …"; a menu link's button reads just "← Back" -- Manual wording to correct)`, bk.url === "about.html" && /^←\s*Back\s*✕?$/.test(bk.text || ""), JSON.stringify(bk));
    await page.click("[data-bm-back]"); await page.waitForTimeout(1500);
    check(`[${tag}] The way back: pressing it returns to the People page`, page.url().includes("/people.html"), page.url());
    await ctx.close();
  }

  // ### Taglines strip
  {
    const LONG = "Have you ever weighed a gold bar (12.4 kg) in your hand? It is heavier than you would think, and the weight of a single line of revelation is heavier still, so read it slowly.";
    const lines = [{ id: "long", text: { en: LONG, bn: LONG }, link: null, order: 10, status: "active", holdDays: 7, ayahRef: null }];
    const { ctx, page } = await open("/app/quranrevival.html", { w: 390, h: 844, ctxOpts: { taglines: { lines, settings: { motion: "fade", changeAfterSeconds: 2, pauseOnHold: true } } } });
    await page.waitForFunction(() => document.querySelector("#taglineStrip .tagline-line")?.textContent.includes("gold bar"), null, { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await page.waitForTimeout(600);
    const st = await page.evaluate(() => { const l = document.querySelector("#taglineStrip .tagline-line"); const t = l?.querySelector(".tagline-track"); return { text: !!l, scrolling: l?.classList.contains("tagline-scrolling"), running: t?.getAnimations()[0]?.playState }; });
    check("Taglines strip: a long line slides sideways on the strip (running animation)", st.scrolling && st.running === "running", JSON.stringify(st));
    const box = await page.locator("#taglineStrip").boundingBox();
    await page.mouse.move(box.x + 40, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(250);
    const held = await page.evaluate(() => document.querySelector("#taglineStrip .tagline-track")?.getAnimations()[0]?.playState);
    await page.mouse.up(); await page.waitForTimeout(250);
    const freed = await page.evaluate(() => document.querySelector("#taglineStrip .tagline-track")?.getAnimations()[0]?.playState);
    check("Taglines strip: holding a finger on a line pauses it, letting go resumes it", held === "paused" && freed === "running", `${held} / ${freed}`);
    await ctx.close();
    // owner/prime: Home ▾ → Settings → Taglines
    for (const [w, h] of VIEWPORTS) {
      const c2 = await open("/app/people.html", { w, h });
      await settle(c2.page);
      await c2.page.locator("#topNav summary", { hasText: /^Home$/ }).first().click(); await c2.page.waitForTimeout(200);
      const link = await c2.page.evaluate(() => [...document.querySelectorAll(".nav-cat-home .nav-cat-group")].some((g) => /Settings/.test(g.textContent) && g.querySelector('a[href^="taglines.html"]')));
      check(`[${w}px] Taglines strip: Home ▾ → Settings has a Taglines link for the owner`, link);
      await c2.page.click('.nav-cat-home a[href^="taglines.html"]');
      await c2.page.waitForSelector("#scrollToggle", { state: "visible", timeout: 15000 });
      const ui = await c2.page.evaluate(() => ({ scroll: document.querySelector('label[for="scrollToggle"]')?.textContent.trim(), speed: document.querySelector('label[for="scrollSpeedInput"]')?.textContent.trim(), saveDisabled: document.getElementById("saveBtn").disabled, hasMotion: !!document.getElementById("motionSelect"), add: !!document.getElementById("addBtn") }));
      check(`[${w}px] Taglines strip: the page has Add line, motion, Scroll long lines, Scroll speed and Save`, ui.scroll === "Scroll long lines" && ui.speed === "Scroll speed" && ui.hasMotion && ui.add && ui.saveDisabled === true, JSON.stringify(ui));
      await c2.page.click("#scrollToggle"); await c2.page.waitForTimeout(200);
      const afterEdit = await c2.page.evaluate(() => document.getElementById("saveBtn").disabled);
      check(`[${w}px] Taglines strip: changing Scroll long lines enables Save`, afterEdit === false);
      await c2.page.click("#saveBtn"); await c2.page.waitForTimeout(800);
      const msg = await c2.page.evaluate(() => document.getElementById("saveState").textContent.trim());
      check(`[${w}px] Taglines strip: Save says the strip shows it next load`, /^Saved\./.test(msg), msg);
      await c2.ctx.close();
    }
  }
}

// =====================================================================================================================
// ▸ Bookmarks
// =====================================================================================================================
const FOLDER_SEED = `DATA.bookmarks[0].folders = [{ id: "f1", name: "Memorising", parentId: null, order: 0, removed: false }, { id: "f2", name: "Reading", parentId: null, order: 1, removed: false }]; DATA.bookmarks[0].saved[0].folderId = "f1";`;
const stubWritesOf = (page) => page.evaluate(() => JSON.stringify((window.__stubWriteData || []).concat(JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"))));
if (want("bookmarks")) {
  console.log("== Bookmarks");
  SKIP("Bookmarking a place: 🔖 on the Read bar / Mushaf bar / Āyah card, whole unit / This āyah / This page, 'even whether you were listening'", "Quran Study is frozen and the QR Lead's suites own its Read view; here the ☆ on a Deen Study page stands for the shared popover");
  SKIP("Bookmarking a place: ticked people's folders matched by name in their own list (v10.38)", "needs the second person's own bookmarks document, which the stub does not mutate");
  SKIP("The Bookmark menu: Group by changes the grouping / tapping a bookmark opens it / Saved settings", "Saved settings exist on the Quran page only; opening navigates to the Quran page");
  for (const [w, h] of VIEWPORTS) {
    const tag = `${w}px`;
    // ### Bookmarking a place / Bookmarks for family members   (☆ on a study page: deen-study.html, topic Ethics)
    {
      const { ctx, page, errors } = await open("/app/deen-study.html", { w, h, ctxOpts: { extraSeedJs: FOLDER_SEED } });
      await page.waitForSelector("#personSelect option", { state: "attached", timeout: 15000 });
      await page.waitForTimeout(1200);
      await page.locator("button", { hasText: /Ethics/ }).first().click();
      await page.waitForSelector("#bookmarkTopicBtn", { state: "visible", timeout: 15000 });
      await page.click("#bookmarkTopicBtn");
      await page.waitForSelector("[data-bm-pop-save]", { state: "visible", timeout: 8000 }).catch(() => {});
      const pop = await page.evaluate(() => {
        const o = document.querySelector(".bm-popover-overlay");
        return { has: !!o, name: o?.querySelector("[data-bm-pop-name]")?.value, folders: [...(o?.querySelectorAll("[data-bm-pop-folder] option") ?? [])].map((x) => x.textContent.trim()), assign: !!o?.querySelector("[data-bm-pop-assignees]"), newFolder: !![...(o?.querySelectorAll("[data-bm-pop-folder] option") ?? [])].find((x) => x.value === "__new__") };
      });
      check(`[${tag}] Bookmarking a place: ☆ asks for a Name, a Folder (with + New folder…) and Assign to`, pop.has && !!pop.name && pop.folders.includes("Memorising") && pop.newFolder && pop.assign, JSON.stringify(pop));
      if (MUTATE === "bookmarks") await page.evaluate(() => document.querySelector("[data-bm-pop-save]")?.remove());
      await page.fill("[data-bm-pop-name]", "My ethics place");
      await page.selectOption("[data-bm-pop-folder]", { label: "Reading" });
      await page.click("[data-bm-pop-save]").catch(() => {}); await page.waitForTimeout(900);
      const w1 = await stubWritesOf(page);
      check(`[${tag}] Bookmarking a place: Save writes the bookmark under its Name in the chosen Folder`, w1.includes("My ethics place") && w1.includes('"f2"'), w1.slice(0, 300));
      // Already bookmarked → the Manual says an "Already bookmarked" choice appears; the topic page's ☆ removes at once.
      await page.click("#bookmarkTopicBtn").catch(() => {}); await page.waitForTimeout(600);
      const again = await page.evaluate(() => ({ choice: !!document.querySelector("[data-bm-exists-choice]"), star: document.getElementById("bookmarkTopicBtn")?.textContent.trim() }));
      check(`[${tag}] Bookmarking a place: tapping again opens "Already bookmarked" (Remove my bookmark / Add a bookmark…) instead of removing at once`, again.choice, JSON.stringify(again) + " -- APP IS WRONG on the topic pages' ☆ (topic-study.js toggleTopicBookmark removes at once); the Quran-page 🔖 is the one the Manual describes");
      await tidy(page);
      // Family: tick the child under Assign to
      await page.reload(); await page.waitForSelector("#personSelect option", { state: "attached" }); await page.waitForTimeout(1200);
      await page.locator("button", { hasText: /Ethics/ }).first().click();
      await page.waitForSelector("#bookmarkTopicBtn", { state: "visible", timeout: 15000 });
      await page.click("#bookmarkTopicBtn");
      await page.waitForSelector("[data-bm-pop-assignees]", { state: "visible", timeout: 8000 }).catch(() => {});
      const kids = await page.evaluate(() => [...document.querySelectorAll("[data-bm-pop-assignees] label")].map((l) => l.textContent.trim()));
      const box = page.locator("[data-bm-pop-assignees] label", { hasText: /Maryam|Child|Student|Aisha|Yusuf/i }).first();
      const ticked = (await box.count()) ? (await box.locator("input").check(), true) : false;
      await page.click("[data-bm-pop-save]").catch(() => {}); await page.waitForTimeout(1000);
      const notice = await page.evaluate(() => ({ text: document.querySelector("[data-bm-saved-text]")?.textContent.trim(), links: [...document.querySelectorAll("[data-bm-saved-link]")].map((a) => a.textContent.trim()) }));
      check(`[${tag}] Bookmarks for family members: ticking a person under Assign to ends with "Saved for …" and a link to that person's bookmarks`, ticked && /^Saved for /.test(notice.text || "") && notice.links.length > 0, JSON.stringify({ kids, notice }));
      check(`[${tag}] Bookmarking a place: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
      await ctx.close();
    }
    // ### The Bookmark menu
    {
      const { ctx, page, errors } = await open("/app/people.html", { w, h, ctxOpts: { extraSeedJs: FOLDER_SEED } });
      await settle(page);
      await page.locator("#topNav summary", { hasText: /^Bookmark$/ }).first().click();
      await page.waitForSelector("#navBookmarkList [data-bm-last]", { timeout: 10000 }).catch(() => {});
      const m = await page.evaluate(() => ({
        lasts: [...document.querySelectorAll("#navBookmarkList [data-bm-last]")].map((x) => x.textContent.replace(/\s+/g, " ").trim()),
        folders: [...document.querySelectorAll("#navBookmarkList details[data-bm-folder-id] [data-bm-folder-label]")].map((x) => x.textContent),
        handle: document.querySelectorAll("[data-bm-folder-handle]").length, pencil: document.querySelectorAll("[data-bm-folder-rename]").length, bin: document.querySelectorAll("[data-bm-remove-folder]").length,
        groupBy: !!document.querySelector("[data-bm-nav-groupby]"), times: document.querySelector("[data-bm-nav-times]")?.textContent.trim(),
        bookmarks: [...document.querySelectorAll("#navBookmarkList a[data-bm-open-id]")].map((a) => a.textContent.trim()),
      }));
      check(`[${tag}] The Bookmark menu: 📖 Last read and ▶ Last played sit at the top`, m.lasts.length === 2 && /Last read/.test(m.lasts[0]) && /Last played/.test(m.lasts[1]), JSON.stringify(m.lasts));
      check(`[${tag}] The Bookmark menu: folders show ⠿ ✎ 🗑 and Group by, Show times are there`, m.folders.length === 2 && m.handle === 2 && m.pencil === 2 && m.bin === 2 && m.groupBy && /times/.test(m.times || ""), JSON.stringify(m));
      // The times are ON by default (check corrected: the first run assumed they start hidden): the button then reads Hide times.
      const t1 = await page.evaluate(() => ({ btn: document.querySelector("[data-bm-nav-times]")?.textContent.trim(), when: document.querySelectorAll("#navBookmarkList [data-bm-when]").length }));
      await page.click("[data-bm-nav-times]"); await page.waitForTimeout(300);
      const t2 = await page.evaluate(() => ({ btn: document.querySelector("[data-bm-nav-times]")?.textContent.trim(), when: document.querySelectorAll("#navBookmarkList [data-bm-when]").length }));
      check(`[${tag}] The Bookmark menu: the time each was last opened shows (Hide times), and Show times / Hide times toggles it`, /Hide times/.test(t1.btn || "") && t1.when > 0 && /Show times/.test(t2.btn || "") && t2.when === 0, JSON.stringify({ t1, t2 }));
      await page.click("[data-bm-nav-times]"); await page.waitForTimeout(200);
      // rename ✎
      await page.click("[data-bm-folder-rename]"); await page.fill("[data-bm-folder-input]", "Memorised"); await page.keyboard.press("Enter"); await page.waitForTimeout(500);
      const renamed = await page.evaluate(() => document.querySelector("[data-bm-folder-label]")?.textContent);
      check(`[${tag}] The Bookmark menu: ✎ renames a folder`, renamed === "Memorised" && (await stubWritesOf(page)).includes("Memorised"), renamed);
      // reorder ⠿ with the arrow keys
      await page.locator("[data-bm-folder-handle]").first().focus(); await page.keyboard.press("ArrowDown"); await page.waitForTimeout(500);
      const order = await page.evaluate(() => [...document.querySelectorAll("#navBookmarkList details[data-bm-folder-id] [data-bm-folder-label]")].map((x) => x.textContent));
      check(`[${tag}] The Bookmark menu: ⠿ reorders folders (ArrowDown moves the first below the second)`, order[0] === "Reading" && order[1] === "Memorised", JSON.stringify(order));
      // delete 🗑 + Undo
      await page.locator("[data-bm-remove-folder]").first().click(); await page.waitForTimeout(500);
      const gone = await page.evaluate(() => ({ undo: !!document.querySelector("[data-bm-undo-btn]"), folders: document.querySelectorAll("#navBookmarkList details[data-bm-folder-id]").length }));
      check(`[${tag}] The Bookmark menu: 🗑 removes a folder and offers Undo`, gone.undo, JSON.stringify(gone));
      await page.click("[data-bm-undo-btn]").catch(() => {}); await page.waitForTimeout(500);
      const back = await page.evaluate(() => document.querySelectorAll("#navBookmarkList details[data-bm-folder-id]").length);
      check(`[${tag}] The Bookmark menu: Undo brings the folder back`, back === 2, String(back));
      // ✕ Close
      if (MUTATE === "bookmarks") await page.evaluate(() => document.querySelector("[data-nav-bm-close]")?.remove());
      await page.click("[data-nav-bm-close]").catch(() => {}); await page.waitForTimeout(200);
      check(`[${tag}] The Bookmark menu: ✕ Close shuts it`, !(await isOpen(page, ".nav-cat-bookmark")));
      await tidy(page);
      check(`[${tag}] The Bookmark menu: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
      await ctx.close();
    }
    // ### Manage bookmarks page
    {
      const { ctx, page } = await open("/app/people.html", { w, h, ctxOpts: { extraSeedJs: FOLDER_SEED } });
      await settle(page);
      await page.locator("#topNav summary", { hasText: /^Bookmark$/ }).first().click();
      await page.waitForSelector('#navBookmarkList a[href^="bookmarks.html"], .nav-cat-bookmark a[href^="bookmarks.html"]', { state: "attached" });
      const link = (await page.locator('.nav-cat-bookmark a[href^="bookmarks.html"]').first().textContent()).trim();
      check(`[${tag}] Manage bookmarks page: Bookmark ▾ has "Manage bookmarks…"`, link === "Manage bookmarks…", link);
      await page.locator('.nav-cat-bookmark a[href^="bookmarks.html"]').first().click();
      await page.waitForSelector("#newBookmarkBtn", { state: "visible", timeout: 15000 });
      await page.waitForTimeout(800);
      const back = await page.evaluate(() => { const b = document.querySelector("[data-bm-back]"); return b ? b.textContent.replace(/\s+/g, " ").trim() : null; });
      check(`[${tag}] The Bookmark menu: a "← Back" button returns you to the page you left (from Manage bookmarks…)`, /^←\s*Back/.test(back || ""), String(back));
      const ui = await page.evaluate(() => ({ nb: document.getElementById("newBookmarkBtn").textContent.trim(), nf: document.getElementById("newFolderBtn").textContent.trim(), row: [...document.querySelectorAll(".bm-row")].map((r) => [...r.querySelectorAll("button")].map((b) => b.textContent.trim()).join("|")), fold: [...document.querySelectorAll(".bm-folder-header")].map((r) => [...r.querySelectorAll("button")].map((b) => b.textContent.trim()).join("|")) }));
      check(`[${tag}] Manage bookmarks page: + New bookmark, + New folder, and Open / Rename / Retire on each row`, ui.nb === "+ New bookmark" && ui.nf === "+ New folder" && ui.row.length > 0 && ui.row.every((r) => /Open/.test(r) && /Rename/.test(r) && /Retire/.test(r)) && ui.fold.every((r) => /Rename/.test(r) && /Retire/.test(r)), JSON.stringify(ui));
      // Retire → Restore
      await page.locator(".bm-row [data-bm-toggle]").first().click(); await page.waitForTimeout(600);
      await page.check("#showRetiredCk"); await page.waitForTimeout(400);
      const lab = await page.locator(".bm-row.retired [data-bm-toggle]").first().textContent().catch(() => null);
      check(`[${tag}] Manage bookmarks page: Retire hides a bookmark and Show retired offers Restore`, (lab || "").trim() === "Restore", String(lab));
      await page.locator(".bm-row.retired [data-bm-toggle]").first().click().catch(() => {}); await page.waitForTimeout(500);
      const restored = await page.locator(".bm-row.retired").count();
      check(`[${tag}] Manage bookmarks page: Restore brings it back`, restored === 0, String(restored));
      // + New bookmark form and + New folder
      await page.click("#newBookmarkBtn"); await page.waitForTimeout(300);
      const form = await shown(page, "#newBookmarkForm");
      check(`[${tag}] Manage bookmarks page: + New bookmark opens a form with Name and Create`, form && (await shown(page, "#nbName")) && (await shown(page, "#nbCreateBtn")));
      await page.click("#nbCancelBtn");
      await ctx.close();
    }
  }
}

// =====================================================================================================================
// ▸ Teaching, family and madrasah management
// =====================================================================================================================
const pageFor = async (path, w, h, ctxOpts = {}) => {
  const o = await open(path, { w, h, ctxOpts });
  await o.page.waitForSelector("#app", { state: "visible", timeout: 20000 }).catch(() => {});
  await o.page.waitForTimeout(1200);
  return o;
};
const writtenHas = async (page, ...needles) => { const s = await stubWritesOf(page); return needles.every((n) => s.includes(n)); };
if (want("teaching")) {
  console.log("== Teaching, family and madrasah management");
  for (const [w, h] of VIEWPORTS) {
    const tag = `${w}px`;
    // ### People / Hand the device to a child / View as
    {
      const { ctx, page, errors } = await pageFor("/app/people.html", w, h);
      if (MUTATE === "teaching") await page.evaluate(() => document.getElementById("startStudyBtn")?.closest("fieldset")?.remove());
      const cols = await page.evaluate(() => [...document.querySelectorAll("#rosterTable th")].map((x) => x.textContent.trim()));
      check(`[${tag}] People: the roster lists Name, Age, Roles, Managed by`, ["Name", "Age", "Roles", "Managed by"].every((c) => cols.includes(c)), JSON.stringify(cols));
      const rows0 = await page.locator("#rosterBody tr").count();
      await page.fill("#name", "Little Zayd"); await page.fill("#birthYear", "2016"); await page.check("#isMinor"); await page.check('input[name="role"][value="student"]');
      await page.click("#addBtn"); await page.waitForTimeout(900);
      check(`[${tag}] People: Add a person (Name, Year of birth, Roles, "This is a child") writes the person`, await writtenHas(page, "Little Zayd", "2016"), (await stubWritesOf(page)).slice(0, 200));
      await page.fill("#inviteEmail", "teacher@example.org"); await page.selectOption("#inviteRole", "teacher"); await page.click("#inviteBtn"); await page.waitForTimeout(900);
      const inv = await page.evaluate(() => ({ rows: [...document.querySelectorAll("#inviteBody tr")].map((r) => r.textContent.replace(/\s+/g, " ").trim()), res: document.getElementById("inviteResult").textContent.trim() }));
      const copy = await page.evaluate(() => [...document.querySelectorAll("#inviteBody button, #inviteBody a")].map((b) => b.textContent.trim()));
      // The stub never mutates its data, so the new invite itself is proved by the write; the row check uses the seeded pending invite.
      check(`[${tag}] People: Invite (email + Role) creates the invite and a pending invite's row offers "Copy link"`, (await writtenHas(page, "teacher@example.org")) && /Copy link/.test(inv.res) && inv.rows.some((r) => /Pending.*Copy link/.test(r)) && copy.some((c) => /Copy link/.test(c)), JSON.stringify({ inv, copy }));
      // Hand the device to a child
      const kids = await page.evaluate(() => [...document.querySelectorAll("#studyPersonSelect option")].map((o) => o.textContent.trim()));
      check(`[${tag}] Hand the device to a child: the People page offers Child, Start studying, End session`, kids.length > 0 && (await shown(page, "#startStudyBtn")), JSON.stringify(kids));
      if (kids.length) {
        await page.click("#startStudyBtn"); await page.waitForTimeout(900);
        const st = await page.evaluate(() => ({ end: getComputedStyle(document.getElementById("endStudyBtn")).display, res: document.getElementById("studyResult").textContent.trim() }));
        check(`[${tag}] Hand the device to a child: Start studying shows End session`, st.end !== "none", JSON.stringify(st));
        // J92: the Manual promises the app is LOCKED to that child's study. Measure what the nav still offers.
        // Start studying only writes sessionStorage "study lock" (study-lock.js); it is read by session-context.js to refuse a person switch.
        // Measure from the child's side: open a study page in the same tab and see what the picker and the menu still offer.
        await page.goto(`${BASE_URL}/app/deen-study.html`, { waitUntil: "networkidle" }); await page.waitForTimeout(1500);
        const kid = await page.evaluate(() => ({ lock: sessionStorage.getItem("mm_study_lock") ?? Object.keys(sessionStorage).filter((k) => /lock/i.test(k)).join(","), people: [...document.querySelectorAll("#personSelect option")].map((o) => o.textContent.trim()), menus: [...document.querySelectorAll("#topNav summary")].map((s) => s.textContent.trim()), banner: /studying on their own|study session|locked/i.test(document.body.innerText) }));
        check(`[${tag}] Hand the device to a child: the app is locked to that child's study (the child sees only themself, and the other menus are out of reach)`, kid.people.length === 1 && kid.menus.length < 4, JSON.stringify(kid) + " -- APP DOES LESS (PCF J92): the lock only refuses a person switch");
        await page.goto(`${BASE_URL}/app/people.html`, { waitUntil: "networkidle" }); await page.waitForTimeout(1200);
        await page.click("#endStudyBtn").catch(() => {}); await page.waitForTimeout(600);
        const ended = await page.evaluate(() => getComputedStyle(document.getElementById("endStudyBtn")).display === "none");
        check(`[${tag}] Hand the device to a child: End session ends it`, ended);
      }
      // View as
      const vis = await page.evaluate(() => { const wrap = document.getElementById("viewAsWrap"); return { shown: !!wrap && wrap.getBoundingClientRect().width > 0, inCard: !!wrap?.closest("#accountCardPickers"), opts: [...document.querySelectorAll("#viewAsSelect option")].map((o) => o.textContent.trim()) }; });
      check(`[${tag}] View as: People offers a "View as" chooser (your real role, Prime, Teacher, Guardian, Student)`, vis.opts.includes("(your real role)") && vis.opts.length === 5, JSON.stringify(vis));
      if (vis.shown || vis.inCard) {
        if (vis.inCard) { await page.locator("#topNav summary", { hasText: /^Home$/ }).first().click(); await page.click("[data-open-account-card]"); await page.waitForTimeout(300); }
        await page.selectOption("#viewAsSelect", "student"); await page.waitForTimeout(1500);
        const badge = await page.evaluate(() => document.querySelector(".nav-preview-notice")?.textContent.trim());
        check(`[${tag}] View as: choosing Student shows a "Previewing as" badge`, /Previewing as/.test(badge || ""), String(badge));
        await tidy(page);
        await page.selectOption("#viewAsSelect", "").catch(() => {}); await page.waitForTimeout(1200);
      } else {
        check(`[${tag}] View as: the chooser is reachable on People`, false, JSON.stringify(vis));
      }
      check(`[${tag}] People: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
      await ctx.close();
    }
    // ### Classes
    {
      const { ctx, page } = await pageFor("/app/classes.html", w, h);
      await page.fill("#classNameInput", "Tajweed Circle"); await page.click("#createClassBtn"); await page.waitForTimeout(900);
      check(`[${tag}] Classes: Create class (Name, Subjects) writes the class`, await writtenHas(page, "Tajweed Circle"));
      const card = await page.evaluate(() => ({ enrol: !!document.querySelector(".enrolBtn"), bulk: [...document.querySelectorAll(".bulkConfirmClassBtn")].map((b) => b.textContent.trim()), arch: !!document.querySelector(".archiveClassBtn") }));
      check(`[${tag}] Classes: each class has Enrol, "Bulk confirm all pending for this class" and Archive`, card.enrol && card.bulk.length > 0 && card.arch, JSON.stringify(card));
      await page.locator(".enrolBtn").first().click(); await page.waitForTimeout(800);
      check(`[${tag}] Classes: Enrol writes an enrolment`, await writtenHas(page, "enrollments"), (await stubWritesOf(page)).slice(-300));
      await page.locator(".archiveClassBtn").first().click(); await page.waitForTimeout(800);
      check(`[${tag}] Classes: Archive writes the class as archived`, await writtenHas(page, "archived"));
      await ctx.close();
    }
    // ### Course Offers
    {
      const { ctx, page } = await pageFor("/app/course-offers.html", w, h);
      await page.fill("#offerNameInput", "Outside Arabic tutor"); await page.fill("#startDateInput", "2026-11-01"); await page.click("#createOfferBtn"); await page.waitForTimeout(900);
      check(`[${tag}] Course Offers: Fill Name, dates, Create offer writes it`, await writtenHas(page, "Outside Arabic tutor", "2026-11-01"));
      const heading = await page.evaluate(() => document.getElementById("enrolmentsHeading")?.textContent.trim());
      // Manual wording is fine ("enrol people under Enrolments"); the heading is "<Person>'s enrolments" -- check corrected.
      check(`[${tag}] Course Offers: there is an enrolments section`, /enrolments/i.test(heading || ""), String(heading));
      await ctx.close();
    }
    // ### Homework
    {
      const { ctx, page } = await pageFor("/app/homework.html", w, h);
      await page.waitForSelector("#assignToChecks input", { state: "attached", timeout: 15000 }).catch(() => {});
      await page.locator("#assignToChecks input").first().check().catch(() => {});
      await page.fill("#instructionsInput", "Read Surah Al-Ikhlas twice"); await page.fill("#dueDateInput", "2026-11-05"); await page.fill("#maxScoreInput", "10");
      await page.click("#createAssignmentBtn"); await page.waitForTimeout(900);
      check(`[${tag}] Homework: Choose Assign to, fill the fields, Create assignment writes it`, await writtenHas(page, "Read Surah Al-Ikhlas twice"));
      const acts = await page.evaluate(() => ({ sub: [...document.querySelectorAll(".markSubmittedBtn")].length, score: [...document.querySelectorAll(".saveScoreBtn")].length, note: !!document.getElementById("saveNoteBtn") }));
      check(`[${tag}] Homework: each assignment has Mark as submitted and Save score; private teaching notes exist`, acts.sub > 0 && acts.score > 0 && acts.note, JSON.stringify(acts));
      await page.locator(".markSubmittedBtn").first().click(); await page.waitForTimeout(800);
      check(`[${tag}] Homework: Mark as submitted writes the submission`, await writtenHas(page, "submitted"));
      await ctx.close();
    }
    // ### Curriculum
    {
      const { ctx, page } = await pageFor("/app/curriculum.html", w, h);
      await page.fill("#unitNameInput", "Unit on Wudu"); await page.click("#createUnitBtn"); await page.waitForTimeout(900);
      check(`[${tag}] Curriculum: Create unit writes it`, await writtenHas(page, "Unit on Wudu"));
      await page.fill("#resourceUrlInput", "https://example.org/wudu").catch(() => {});
      const rb = await shown(page, "#createResourceBtn");
      check(`[${tag}] Curriculum: Create resource and the plan/grades controls exist`, rb);
      await ctx.close();
    }
    // ### Catalogue
    {
      const { ctx, page } = await pageFor("/app/catalogue.html", w, h);
      const tabs = await page.evaluate(() => [...document.querySelectorAll("[data-cat-tab]")].map((b) => b.dataset.catTab + "=" + b.textContent.trim()));
      await page.click('[data-cat-tab="subjects"]');
      await page.waitForSelector("#newSubjName", { state: "visible", timeout: 20000 }).catch(() => {});
      await page.fill("#newSubjName", "Fiqh of Prayer"); await page.click("#addSubjBtn"); await page.waitForTimeout(900);
      check(`[${tag}] Catalogue: Add subject writes it`, await writtenHas(page, "Fiqh of Prayer"));
      await page.click('[data-cat-tab="approaches"]');
      await page.fill("#newApproachNameEn", "Teach it back").catch(() => {}); await page.fill("#newApproachNameBn", "শেখান").catch(() => {});
      await page.click("#addApproachBtn").catch(() => {}); await page.waitForTimeout(900);
      check(`[${tag}] Catalogue: Add Approach (English and Bangla names) writes it`, await writtenHas(page, "Teach it back", "শেখান"));
      await page.click('[data-cat-tab="ladders"]');
      await page.fill("#newLadderName", "Grades A").catch(() => {}); await page.click("#addLadderBtn").catch(() => {}); await page.waitForTimeout(700);
      check(`[${tag}] Catalogue: Add ladder writes it`, await writtenHas(page, "Grades A"));
      await ctx.close();
    }
    // ### Backup
    {
      const { ctx, page } = await pageFor("/app/backup.html", w, h);
      await page.waitForFunction(() => !document.getElementById("makeBtn").disabled, null, { timeout: 15000 }).catch(() => {});
      await page.click("#makeBtn").catch(() => {});
      // The page offers a real "Save" link (a.download-link) rather than starting the download itself (backup.html:196).
      await page.waitForSelector("#result a.download-link", { timeout: 30000 }).catch(() => {});
      const file = await page.evaluate(async () => { const a = document.querySelector("#result a.download-link"); if (!a) return null; const text = await (await fetch(a.href)).text(); return { name: a.download, text }; });
      check(`[${tag}] Backup: Make the backup offers a file holding roster, claims, bookmarks, activity`, !!file && /bookmarks/i.test(file.text) && /activity/i.test(file.text) && /records|claims/i.test(file.text) && /people|roster/i.test(file.text), file ? `${file.name} ${file.text.length} bytes` : "no download link");
      await ctx.close();
    }
    // ### About
    {
      const { ctx, page } = await open("/app/about.html", { w, h });
      await page.waitForTimeout(1800);
      const ab = await page.evaluate(() => ({ items: document.querySelectorAll("li, tr").length, text: document.body.innerText }));
      check(`[${tag}] About: lists the app's features with their build phase, and acknowledges sources`, ab.items > 10 && /Phase/i.test(ab.text) && /Acknowledg|Credit|Source/i.test(ab.text), String(ab.items));
      await ctx.close();
    }
  }
}

// =====================================================================================================================
// ▸ Notes and Mapping My Journey   (audit part 87b)
// =====================================================================================================================
const hx = (id) => id.slice(1).repeat(32);
// A step that cannot be taken (a control missing, a timeout) is a FAILED claim, not a crashed suite.
const crash = (e) => { fail++; console.log(`  FAIL  step could not be taken: ${String(e.message || e).split("\n").slice(0, 2).join(" | ").slice(0, 200)} @ line ${(/manual-claims-msa-browser\.mjs:(\d+)/.exec(e.stack || "") || [])[1]}`); };
// Mapping My Journey: Alpha{n1,n2,n3} and Beta{}; every Note started on 2:256. Writes are applied so the page can be driven on.
const NOTES_SEED = (owner = "p1") => `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "${owner}", ownerUid: "test-uid", schemaVersion: 1, createdBy: "test-uid" };
  function ts() { return { toDate: function () { return new Date("2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date("2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteSources = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(l, title, extra) { var id = l.slice(1).repeat(32); DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: "<p>" + title + " body</p>", currentRevisionId: "rev-" + id, status: "active", visibility: "private", createdAt: ts(), updatedAt: ts() }, own, extra || {}));
    DATA.noteRevisions.push(Object.assign({ _id: "t1__rev-" + id, revisionId: "rev-" + id, noteId: id, previousRevisionId: null, title: title, bodyHtml: "<p>" + title + " body</p>", revisionReason: "content-update", actorUid: "test-uid", createdAt: new Date("2026-09-01T10:00:00Z") }, own));
    DATA.noteSources.push(Object.assign({ _id: "t1__s-" + id, sourceLinkId: "s-" + id, noteId: id, sourceKey: "ayah:2:256", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active", createdAt: ts(), updatedAt: ts() }, own)); }
  function P(id, l, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: l.slice(1).repeat(32), folderId: folder, order: order, status: "active" }, own)); }
  F("fA", "Alpha", null, 0); F("fB", "Beta", null, 1);
  N("n1", "Note One"); N("n2", "Note Two"); N("n3", "Note Three");
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1); P("p3", "n3", "fA", 2);
})();`;
const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden" && r.width > 0 && r.height > 0; }, sel);
const count = (page, sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
const jmOpen = async (path, w, h, seed = NOTES_SEED(), extra = {}) => {
  const ctx = await newContext(browser, { banner: false, appLang: null, viewport: { width: w, height: h }, extraSeedJs: seed, ...extra });
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA", "fB"])); } catch {} });
  const { page, errors } = await openPage(ctx, path);
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
};
const jmReady = (page) => page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 2 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 20000 });
const jmOpenNote = async (page, id = "n1", folder = "fA") => {
  if (await vis(page, "#folderNotes [data-list-back]")) await page.click("#folderNotes [data-list-back]");
  await page.click(`.folder-row[data-folder-id="${folder}"] [data-folder-name]`);
  await page.waitForSelector(`#folderNotes [data-note-leaf][data-note-id="${hx(id)}"] [data-note-open]`, { state: "visible", timeout: 15000 });
  await page.click(`#folderNotes [data-note-leaf][data-note-id="${hx(id)}"] [data-note-open]`);
  await page.waitForSelector("#notePane:not([hidden]) [data-pane-title]", { state: "visible", timeout: 15000 });
};
if (want("notes")) {
  console.log("== Notes and Mapping My Journey");
  // ### Notes pane in the Read view  +  ### Track this āyah (Notes pane tab)
  for (const [w, h] of VIEWPORTS) try {
    const tag = `${w}px`;
    const { ctx, page, errors } = await jmOpen("/app/quranrevival.html", w, h);
    await page.route("**/archive.org/**", (r) => r.abort());
    if (!(await shown(page, "#tabReadBtn"))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
    await page.click("#tabReadBtn"); await page.waitForTimeout(400);
    await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 20000 });
    await page.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "256"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForTimeout(900);
    // How to use, route 1: the Read bar's 📝 (on a phone ⋯ More tools → 📝)
    const narrow = await shown(page, "#readToolsBtn");
    check(`[${tag}] Notes pane in the Read view: ${narrow ? "on a phone 📝 is behind ⋯ More tools" : "on a computer 📝 is on the Read bar"}`, narrow ? !(await shown(page, "#readNotesBtn")) : await shown(page, "#readNotesBtn"));
    if (narrow) await page.click("#readToolsBtn");
    await page.waitForTimeout(150);
    if (MUTATE === "notes") await page.evaluate(() => document.getElementById("readNotesBtn")?.remove());
    await page.click("#readNotesBtn", { timeout: 4000 }).catch(() => {});
    await page.waitForFunction(() => document.querySelector("#readNotePane:not([hidden]) iframe"), null, { timeout: 8000 }).catch(() => {});
    let F = null;
    for (let i = 0; i < 60 && !F; i++) { F = page.frames().find((x) => /journey-map\.html\?embed=1&unit=ayah%3A2%3A256/.test(x.url())); if (!F) await page.waitForTimeout(100); }
    check(`[${tag}] Notes pane in the Read view: ${narrow ? "⋯ → 📝" : "📝 on the bar"} opens the pane on the āyah (journey-map.html?embed=1&unit=ayah:2:256)`, !!F, page.frames().map((f) => f.url()).join(" "));
    if (F) {
      await F.waitForSelector("[data-unit-body] [data-note-id], [data-unit-empty]", { timeout: 15000 }).catch(() => {});
      await F.waitForTimeout(500);
      const where = await page.evaluate(() => { const p = document.getElementById("readNotePane"), r = p.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, iw: innerWidth, ih: innerHeight, w: r.width }; });
      const list = await F.evaluate(() => ({ cards: [...document.querySelectorAll("[data-unit-body] [data-note-id]")].map((c) => c.dataset.noteId), newBtn: document.querySelector("[data-unit-new]")?.textContent.trim(), journey: !!document.querySelector("[data-unit-journey]") }));
      check(`[${tag}] Notes pane in the Read view: it lists every Note linked to the āyah (the 3 seeded Notes started on 2:256) and has ✚ New note`, list.cards.length === 3 && /^✚\s*New note/.test(list.newBtn || ""), JSON.stringify(list));
      if (narrow) check(`[${tag}] Notes pane in the Read view: on a phone the pane is full screen`, where.l <= 0.5 && where.t <= 0.5 && Math.abs(where.r - where.iw) <= 1 && Math.abs(where.b - where.ih) <= 1, JSON.stringify(where));
      // MANUAL IS WRONG (PCF MSA J72): on a computer the pane is a pop-up WINDOW at the home window's size, over the reading, not a column "beside" it.
      // Check corrected to the app: a window with a margin on every side (not full screen), inside the screen.
      else check(`[${tag}] Notes pane in the Read view: on a computer the pane is a pop-up window over the reading (J72), with a margin all round, not full screen`, where.l > 0 && where.t > 0 && where.r < where.iw && where.b < where.ih, JSON.stringify(where));
      const back = await page.evaluate(() => document.querySelector("#readNotePane [data-rnp-back]")?.textContent.trim());
      check(`[${tag}] Notes pane in the Read view: the bar says "← Back to 2:256"`, /^←\s*Back to 2:256/.test(back || ""), String(back));
      // ### Track this āyah tab
      if (await page.evaluate(() => !!document.querySelector("#readNotePane.rnp-tabs-in-frame"))) await F.click('.jm-host-tab[data-jm-host-tab="track"]'); else await page.click('#readNotePane [data-rnp-tab="track"]');
      await page.waitForTimeout(300);
      const tr = await page.evaluate(() => ({ trackShown: !document.querySelector("#readNotePane .rnp-track").hidden, btns: [...document.querySelectorAll("#readNotePane [data-rnp-track]")].map((b) => b.dataset.rnpTrack + "=" + b.textContent.trim().replace(/\s+/g, " ")) }));
      check(`[${tag}] Track this āyah: the tab holds Take an Approach, Record Your Progress and Know Your Status`, tr.trackShown && tr.btns.length === 3 && /Take an Approach/.test(tr.btns[0]) && /Record Your Progress/.test(tr.btns[1]) && /Know Your Status/.test(tr.btns[2]), JSON.stringify(tr));
      await page.click('#readNotePane [data-rnp-track="record"]');
      await page.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(400);
      const rec = await page.evaluate(() => ({ pane: document.getElementById("readNotePane").hidden, pill: document.querySelector("#ayahCardBackPill:not([hidden]) [data-ayah-card-back]")?.textContent.trim() ?? "" }));
      check(`[${tag}] Track this āyah: an action opens it and leaves "Back to Notes on 2:256"`, rec.pane && /Back to Notes on 2:256/.test(rec.pill), JSON.stringify(rec));
      await page.evaluate(() => document.querySelector("#ayahCardBackPill [data-ayah-card-back]")?.click());
      await page.waitForTimeout(600);
      check(`[${tag}] Track this āyah: "Back to Notes on …" brings you back to the pane`, await page.evaluate(() => !document.getElementById("readNotePane").hidden));
      // ↗ Open in Mapping My Journey opens the full tray; ← Back to … closes the pane
      await page.click("#readNotePane [data-rnp-journey]");
      await page.waitForFunction(() => document.querySelector("#journeyTray:not([hidden]) iframe"), null, { timeout: 8000 }).catch(() => {});
      check(`[${tag}] Notes pane in the Read view: ↗ Open in Mapping My Journey opens the full tray`, await page.evaluate(() => !!document.querySelector("#journeyTray:not([hidden])")));
      await page.click("#journeyTray .jt-close").catch(() => {}); await page.waitForTimeout(300);
      await page.click("#readNotePane [data-rnp-back]").catch(() => {}); await page.waitForTimeout(300);
      check(`[${tag}] Notes pane in the Read view: ← Back to … closes it`, await page.evaluate(() => document.getElementById("readNotePane").hidden));
    }
    // route 2: Study ▾ → Notes
    await page.evaluate(() => { document.getElementById("ayahActionSheetOverlay")?.classList.remove("open"); document.getElementById("studyPillarMenu").hidden = true; });
    await page.click("#tabStudyBtn", { timeout: 5000 }).catch((e) => console.log("   (Study click: " + String(e).split("\n")[0].slice(0, 160) + ")")); await page.waitForTimeout(200);
    const studyNote = await shown(page, "#tabNoteBtn");
    if (studyNote) { await page.click("#tabNoteBtn"); await page.waitForTimeout(900); }
    const viaStudy = await page.evaluate(() => !document.getElementById("readNotePane")?.hidden);
    check(`[${tag}] Notes pane in the Read view: Study ▾ → Notes also opens it`, studyNote && viaStudy, JSON.stringify({ studyNote, viaStudy }));
    check(`[${tag}] Notes pane in the Read view / Track this āyah: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
    await ctx.close();
  } catch (e) { crash(e); }

  // ### Mapping My Journey   (three panels, three views, and the two doors)
  for (const [w, h] of VIEWPORTS) try {
    const tag = `${w}px`;
    const { ctx, page, errors } = await jmOpen("/app/journey-map.html#folders", w, h);
    await jmReady(page);
    const panels = await page.evaluate(() => ["listPane", "folderNotes", "notePane"].map((id) => { const e = document.getElementById(id); const r = e?.getBoundingClientRect(); return { id, shown: !!e && !e.hidden && r.width > 0 && r.height > 0, x: Math.round(r.left), w: Math.round(r.width) }; }));
    await jmOpenNote(page);
    const panels2 = await page.evaluate(() => ["listPane", "folderNotes", "notePane"].map((id) => { const e = document.getElementById(id); const r = e?.getBoundingClientRect(); return { id, shown: !!e && !e.hidden && r.width > 0 && r.height > 0, x: Math.round(r.left), w: Math.round(r.width) }; }));
    if (w >= 1000) check(`[${tag}] Mapping My Journey: on a wide screen the folder tree, the notes and the open Note are side by side`, panels2.every((p) => p.shown) && panels2[0].x < panels2[1].x && panels2[1].x < panels2[2].x, JSON.stringify(panels2));
    else check(`[${tag}] Mapping My Journey: on a phone one panel shows at a time (the open Note replaces the lists)`, panels2.filter((p) => p.shown).length === 1 && panels2[2].shown, JSON.stringify({ panels, panels2 }));
    await page.click("#notePane [data-pane-back]").catch(() => {}); await page.waitForTimeout(300);
    if (await vis(page, "#folderNotes [data-list-back]")) { await page.click("#folderNotes [data-list-back]"); await page.waitForTimeout(300); } // a phone shows one panel at a time: back to the tree
    const views = {};
    for (const v of ["timeline", "path", "folders"]) {
      if (MUTATE === "notes" && v === "path") await page.evaluate(() => document.getElementById("viewPath")?.remove());
      await page.click(`.view-toggle-btn[data-view="${v}"]`); await page.waitForTimeout(400);
      views[v] = await page.evaluate((k) => { const e = document.getElementById({ folders: "viewFolders", timeline: "viewTimeline", path: "viewPath" }[k]); return !!e && getComputedStyle(e).display !== "none" && e.getClientRects().length > 0; }, v);
    }
    const labels = await page.evaluate(() => [...document.querySelectorAll(".view-toggle-btn")].map((b) => b.textContent.trim()));
    check(`[${tag}] Mapping My Journey: the top switch reads Folders | Timeline | Path and each view shows`, JSON.stringify(labels.map((l) => l.replace(/^\W+/, ""))) === JSON.stringify(["Folders", "Timeline", "Path"]) && views.timeline && views.path && views.folders, JSON.stringify({ labels, views }));
    // Path: every Note as a stop, oldest to newest
    await page.click('.view-toggle-btn[data-view="path"]'); await page.waitForTimeout(500);
    const stops = await page.evaluate(() => [...document.querySelectorAll("#viewPath [data-note-id], #viewPath .path-stop, #viewPath li")].length);
    check(`[${tag}] Mapping My Journey: the Path view shows every Note (3) as a stop`, stops >= 3, String(stops));
    check(`[${tag}] Mapping My Journey: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
    await ctx.close();
  } catch (e) { crash(e); }
  // How to use: the tab at the bottom of Quran Study (pop-up window) and Home ▾ → Mapping My Journey
  for (const [w, h] of VIEWPORTS) try {
    const tag = `${w}px`;
    const { ctx, page } = await jmOpen("/app/quranrevival.html", w, h);
    const tab = await page.evaluate(() => { const b = [...document.querySelectorAll("button, a")].find((x) => /Mapping My Journey/.test(x.textContent) && /tab|dock/i.test(x.className + x.id)); const r = b?.getBoundingClientRect(); return b ? { id: b.id, cls: b.className, shown: r.width > 0, bottom: Math.round(r.bottom), ih: innerHeight } : null; });
    check(`[${tag}] Mapping My Journey: Quran Study has a Mapping My Journey tab at the bottom`, !!tab && tab.shown && tab.bottom > tab.ih - 120, JSON.stringify(tab));
    if (tab) {
      await page.evaluate((id) => document.getElementById(id)?.click(), tab.id); await page.waitForTimeout(1200);
      const tray = await page.evaluate(() => { const t = document.getElementById("journeyTray"); return { open: !!t && !t.hidden, iframe: document.querySelector("#journeyTray iframe")?.getAttribute("src") ?? "" }; });
      check(`[${tag}] Mapping My Journey: the tab opens it as a pop-up window (tray holding journey-map.html)`, tray.open && /journey-map\.html/.test(tray.iframe), JSON.stringify(tray));
    }
    await ctx.close();
  } catch (e) { crash(e); }
  try {
    // A page without the tray: the full page. People mounts the tray (part 87): the Manual's "for the full page" holds only where it is absent.
    const { ctx, page } = await jmOpen("/app/about.html", 1440, 900);
    await page.waitForTimeout(800);
    await page.locator("#topNav summary", { hasText: /^Home$/ }).first().click(); await page.waitForTimeout(200);
    const link = await page.evaluate(() => [...document.querySelectorAll(".nav-cat-home a")].find((a) => /Mapping My Journey/.test(a.textContent))?.getAttribute("href") ?? null);
    check("Mapping My Journey: Home ▾ has a Mapping My Journey link", !!link, String(link));
    if (link) {
      await page.locator(".nav-cat-home a", { hasText: /Mapping My Journey/ }).first().click(); await page.waitForTimeout(1800);
      const where = await page.evaluate(() => ({ url: location.pathname.split("/").pop(), tray: !!document.querySelector("#journeyTray:not([hidden])") }));
      check("Mapping My Journey: Home ▾ → Mapping My Journey opens the full page (from a page without the tray)", where.url === "journey-map.html" || where.tray, JSON.stringify(where));
    }
    await ctx.close();
  } catch (e) { crash(e); }

  // ### Folders and sections
  for (const [w, h] of VIEWPORTS) try {
    const tag = `${w}px`;
    const { ctx, page, errors } = await jmOpen("/app/journey-map.html#folders", w, h);
    await jmReady(page);
    await page.click('.folder-row[data-folder-id="fA"] .folder-menu-btn');
    const items = await page.evaluate(() => [...document.querySelectorAll('.folder-row[data-folder-id="fA"] .folder-row-menu button')].map((b) => b.textContent.replace(/\s+/g, " ").trim()));
    const want = ["Add note here", "Add subfolder", "Rename", "Move up", "Move down", "Copy to", "Move to", "Colour and bold", "Move to section", "Turn into a section", "Open in its own window", "Delete"];
    const missing = want.filter((x) => !items.some((i) => i.includes(x)));
    check(`[${tag}] Folders and sections: the folder ⋯ menu offers ${want.join(", ")}`, missing.length === 0, "missing: " + missing.join(" | ") + " ; has: " + JSON.stringify(items));
    await page.keyboard.press("Escape");
    // right-click opens the same menu
    await page.evaluate(() => document.querySelectorAll(".folder-row-menu").forEach((m) => { m.hidden = true; m.classList.remove("open"); }));
    await page.click('.folder-row[data-folder-id="fB"] [data-folder-name]', { button: "right" }).catch(() => {}); await page.waitForTimeout(300);
    const ctxm = await page.evaluate(() => [...document.querySelectorAll('.folder-row[data-folder-id="fB"] .folder-row-menu')].some((m) => { const r = m.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(m).display !== "none"; }));
    check(`[${tag}] Folders and sections: right-click on a folder opens its menu`, ctxm);
    await page.keyboard.press("Escape");
    // + New section sits in the New folder box
    const sec = await page.evaluate(() => { const b = document.getElementById("newSectionBtn"); return { txt: b?.textContent.trim(), inForm: !!b?.closest("#newFolderForm, .new-folder-box, #listPane") }; });
    check(`[${tag}] Folders and sections: "+ New section" is in the New folder box at the foot of the tree`, /New section/.test(sec.txt || "") && sec.inForm, JSON.stringify(sec));
    await page.fill("#newFolderName", "Gamma"); await page.click("#newFolderForm button[type=submit]"); await page.waitForTimeout(800);
    check(`[${tag}] Folders and sections: the New folder box adds a folder`, await page.evaluate(() => [...document.querySelectorAll("[data-folder-tree] [data-folder-name]")].some((x) => /Gamma/.test(x.textContent))));
    // drag a Note onto a folder (wide screen)
    if (w >= 1000) {
      await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]'); await page.waitForTimeout(500);
      const src = page.locator(`#folderNotes [data-note-leaf][data-note-id="${hx("n1")}"]`).first();
      const dst = page.locator('.folder-row[data-folder-id="fB"]').first();
      const sb = await src.boundingBox(), db = await dst.boundingBox();
      if (sb && db) { await page.mouse.move(sb.x + 30, sb.y + 12); await page.mouse.down(); await page.mouse.move(db.x + 40, db.y + db.height / 2, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(900); }
      const filed = await page.evaluate(() => (window.__DATA.notePlacements || []).filter((p) => p.noteId === "1".repeat(32) && p.folderId === "fB" && p.status !== "retired").length);
      check(`[${tag}] Folders and sections: dragging a Note onto a folder files it there too`, filed >= 1, String(filed));
    } else SKIP(`[${tag}] Folders and sections: drag a Note onto a folder`, "the Manual says wide screen only");
    SKIP(`[${tag}] Folders and sections: long-press opens the menu`, "touch long-press is not driven by this harness; right-click and ⋯ are checked");
    check(`[${tag}] Folders and sections: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
    await ctx.close();
  } catch (e) { crash(e); }

  // ### Writing and editing a Note   +   ### The Note's ⋯ menu   +   ### Reading tools in a Note
  for (const [w, h] of VIEWPORTS) try {
    const tag = `${w}px`;
    const { ctx, page, errors } = await jmOpen("/app/journey-map.html#folders", w, h);
    await jmReady(page);
    await jmOpenNote(page);
    // ⋯ menu first
    await page.click("#notePane [data-pane-menu-btn]"); await page.waitForTimeout(400);
    const menu = await page.evaluate(() => {
      const m = document.querySelector("[data-pane-menu]"), r = m.getBoundingClientRect();
      return { open: m.classList.contains("open"), heads: [...m.querySelectorAll("[data-pane-menu-group] .pane-menu-gl")].map((x) => x.textContent.trim()), keys: [...m.querySelectorAll("[data-pane-menu-group]")].map((g) => g.dataset.paneMenuGroup),
        marks: [...m.querySelectorAll("[data-pane-flag]")].map((b) => (b.getAttribute("aria-label") || b.textContent).trim()), last: [...m.querySelectorAll("button")].filter((b) => b.offsetParent !== null).pop()?.hasAttribute("data-pane-delete"),
        bottom: Math.round(r.bottom), ih: innerHeight, fullW: Math.round(r.width) === innerWidth, x: !!m.querySelector(".pane-menu-x") };
    });
    check(`[${tag}] The Note's ⋯ menu: six groups Move between notes, Read, Mark, Organise, Change, Settings, with Delete last`, ["Move between notes", "Read", "Mark", "Organise", "Change", "Settings"].every((x, i) => menu.heads[i] === x) && menu.last, JSON.stringify(menu));
    check(`[${tag}] The Note's ⋯ menu: Mark holds Pin, Favourite, Archive, Finalise`, ["Pin", "Favourite", "Archive", "Finalise"].every((x) => menu.marks.some((m) => m.includes(x))), JSON.stringify(menu.marks));
    if (w < 600) check(`[${tag}] The Note's ⋯ menu: on a phone it opens from the bottom (full-width sheet ending at the screen bottom)`, menu.fullW && Math.abs(menu.bottom - menu.ih) <= 1, JSON.stringify(menu));
    if (w < 600) { await page.click(".pane-menu-x"); } else await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    check(`[${tag}] The Note's ⋯ menu: ${w < 600 ? "tap × closes it" : "Esc closes it"}`, await page.evaluate(() => !document.querySelector("[data-pane-menu]").classList.contains("open")));
    if (w < 600) {
      await page.click("#notePane [data-pane-menu-btn]"); await page.waitForTimeout(300);
      await page.click("[data-pane-menu-backdrop]", { position: { x: 20, y: 20 } }); await page.waitForTimeout(300);
      check(`[${tag}] The Note's ⋯ menu: tapping outside closes it`, await page.evaluate(() => !document.querySelector("[data-pane-menu]").classList.contains("open")));
    }
    // Edit
    const bar = async (sel) => { if (await vis(page, `#notePane [data-pane-bar] > ${sel}`)) { await page.click(`#notePane [data-pane-bar] > ${sel}`); } else { await page.click("#notePane [data-pane-menu-btn]"); await page.click(`#notePane [data-pane-menu] ${sel}`); } };
    const editLabel = await page.evaluate(() => (document.querySelector("#notePane [data-pane-edit-toggle]")?.textContent ?? "").trim());
    await bar("[data-pane-edit-toggle]"); await page.waitForSelector("#notePane [data-edit-body]", { state: "visible", timeout: 8000 }).catch(() => {});
    check(`[${tag}] Writing and editing a Note: the button reads ✏️ Edit and opens an editor`, /Edit/.test(editLabel) && (await vis(page, "#notePane [data-edit-body]")), editLabel);
    const cmds = await page.evaluate(() => [...document.querySelectorAll("#notePane [data-edit-toolbar] [data-cmd]")].map((b) => b.dataset.cmd));
    const needCmds = ["bold", "italic", "underline", "h1", "ul", "ol", "check", "quote", "link", "table", "color", "highlight", "left", "center", "right", "undo", "redo"];
    check(`[${tag}] Writing and editing a Note: the toolbar has bold, italic, underline, headings, lists, checklists, quotes, links, tables, colours, highlights, alignment, undo/redo`, needCmds.every((c) => cmds.includes(c)), "missing: " + needCmds.filter((c) => !cmds.includes(c)).join(","));
    // type, ✓ Done saves a revision
    await page.click("#notePane [data-edit-body]"); await page.keyboard.press("Control+End"); await page.keyboard.type(" TYPED");
    await page.evaluate(() => { window.__stubWriteData = []; });
    await bar("[data-pane-edit-toggle]"); await page.waitForTimeout(1500);
    const revs = await page.evaluate(() => window.__DATA.noteRevisions.filter((r) => r.noteId === "1".repeat(32) && /TYPED/.test(r.bodyHtml || "")).length);
    check(`[${tag}] Writing and editing a Note: ✓ Done saves the text as a new revision`, revs === 1, String(revs));
    // a failed save says "Not saved yet — will try again"
    await bar("[data-pane-edit-toggle]"); await page.waitForSelector("#notePane [data-edit-body]", { state: "visible" });
    await page.evaluate(() => { window.__stubFailWrites = true; window.__stubFailTx = true; window.__stubFailBatch = true; });
    await page.click("#notePane [data-edit-body]"); await page.keyboard.press("Control+End"); await page.keyboard.type(" LOST");
    await bar("[data-pane-edit-toggle]"); await page.waitForTimeout(1500);
    const said = await page.evaluate(() => [...document.querySelectorAll("[data-edit-status], #pageStatusMsg, #qr-write-failure-banner")].map((e) => (getComputedStyle(e).display !== "none" && e.getClientRects().length ? e.textContent : "")).join(" "));
    check(`[${tag}] Writing and editing a Note: a failed save says "Not saved yet — will try again"`, /Not saved yet — will try again/.test(said), JSON.stringify(said));
    await page.evaluate(() => { window.__stubFailWrites = false; window.__stubFailTx = false; window.__stubFailBatch = false; });
    check(`[${tag}] The Note's ⋯ menu / Writing and editing: no page error`, quiet(errors).filter((e) => !/write failure|denied by the test/i.test(e)).length === 0, JSON.stringify(quiet(errors)));
    await ctx.close();
  } catch (e) { crash(e); }

  // ### Reading tools in a Note   +   ### Tags on Notes   +   ### Pop-up Note windows   +   ### My Note tools   +   ### Favourites, Archived and Trash
  // n1 has two headings (Contents, ⇅), and is linked to n2 (so n2 reads "Linked from" n1).
  const RICH_SEED = NOTES_SEED() + `
(function () {
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1, createdBy: "test-uid" };
  var id = "1".repeat(32), id2 = "2".repeat(32);
  var n = DATA.notes.find(function (x) { return x.noteId === id; });
  n.bodyHtml = "<p>Intro line.</p><h1>First heading</h1><p>Body one.</p><h2>Second heading</h2><p>Body two.</p>";
  DATA.noteRevisions.filter(function (r) { return r.noteId === id; }).forEach(function (r) { r.bodyHtml = n.bodyHtml; });
  DATA.noteLinks = [Object.assign({ _id: "t1__l1", linkId: "l1", fromNoteId: id, toNoteId: id2, status: "active", createdAt: new Date("2026-09-01T10:00:00Z"), updatedAt: new Date("2026-09-01T10:00:00Z") }, own)];
})();`;
  for (const [w, h] of VIEWPORTS) try {
    const tag = `${w}px`;
    const { ctx, page, errors } = await jmOpen("/app/journey-map.html#folders", w, h, RICH_SEED);
    await jmReady(page);
    await jmOpenNote(page, "n1");
    const barSel = (s) => `#notePane [data-pane-bar] > ${s}`;
    // the tool buttons are on the bar, or ⋯ when it is narrow
    const toolIn = async (attr) => { const onBar = await vis(page, barSel(attr)); if (onBar) return "bar"; await page.click("#notePane [data-pane-menu-btn]"); await page.waitForTimeout(250); const inMenu = await vis(page, `#notePane [data-pane-menu] ${attr}`); return inMenu ? "menu" : "none"; };
    const use = async (attr) => { const where = await toolIn(attr); if (where === "bar") await page.click(barSel(attr)); else if (where === "menu") await page.click(`#notePane [data-pane-menu] ${attr}`); return where; };
    // 🔍 Find in this Note
    const find = await use("[data-pane-find-toggle]");
    await page.waitForTimeout(300);
    const findBox = await page.evaluate(() => { const i = document.querySelector("#notePane [data-find-input]"); return { has: !!i, shown: !!i && i.getBoundingClientRect().width > 0 }; });
    check(`[${tag}] Reading tools in a Note: 🔍 Find in this Note (${find}) opens a find box`, find !== "none" && findBox.shown, JSON.stringify({ find, findBox }));
    if (findBox.shown) {
      await page.fill("#notePane [data-find-input]", "Body two"); await page.waitForTimeout(400);
      const cnt = await page.evaluate(() => document.querySelector("#notePane [data-find-count]")?.textContent.trim() ?? "");
      check(`[${tag}] Reading tools in a Note: typing in Find counts the matches ("${cnt}")`, /1/.test(cnt), cnt);
    }
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    // ⇅ open or close all headings
    const fold = await toolIn("[data-pane-foldall]");
    if (fold === "menu") await page.keyboard.press("Escape");
    const headsOpen = () => page.evaluate(() => [...document.querySelectorAll("#notePane .note-sec")].map((d) => !d.classList.contains("collapsed")));
    const h0 = await headsOpen();
    if (fold !== "none") { await use("[data-pane-foldall]"); await page.waitForTimeout(300); }
    const h1 = await headsOpen();
    check(`[${tag}] Reading tools in a Note: ⇅ opens or closes all headings (it toggled ${h0.length} heading sections)`, fold !== "none" && h0.length >= 2 && JSON.stringify(h0) !== JSON.stringify(h1), JSON.stringify({ fold, h0, h1 }));
    await page.keyboard.press("Escape");
    // ☰ Contents
    const cBtn = await vis(page, "#notePane [data-pane-contents-btn]");
    if (cBtn) { await page.click("#notePane [data-pane-contents-btn]"); await page.waitForTimeout(300); }
    const toc = await page.evaluate(() => [...document.querySelectorAll("#notePane [data-pane-contents-list] button, #notePane [data-pane-contents-list] a")].map((b) => b.textContent.trim()));
    check(`[${tag}] Reading tools in a Note: ☰ Contents lists the Note's headings`, cBtn && toc.some((x) => /First heading/.test(x)) && toc.some((x) => /Second heading/.test(x)), JSON.stringify({ cBtn, toc }));
    await page.keyboard.press("Escape");
    await page.evaluate(() => document.querySelectorAll("[data-bar-palette].open").forEach((e) => e.classList.remove("open")));
    // 🕘 Versions
    const ver = await use("[data-pane-versions]");
    await page.waitForSelector("[data-ver-body]", { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(500);
    const vrows = await page.evaluate(() => document.querySelectorAll("[data-ver-open]").length);
    check(`[${tag}] Reading tools in a Note: 🕘 Versions (${ver}) lists the earlier versions`, ver !== "none" && vrows >= 1, String(vrows));
    if (vrows) {
      await page.click("[data-ver-open]"); await page.waitForTimeout(300);
      check(`[${tag}] Reading tools in a Note: a version can be opened to read it (with its text), and "bring it back" is offered only for a version that is not the current one`, await page.evaluate(() => /First heading/.test(document.querySelector("[data-ver-text]")?.textContent ?? "")), "");
    }
    await page.click("[data-ver-close]").catch(() => {}); await page.waitForTimeout(200);
    // Note links: n2 reads "Linked from"
    await page.evaluate(() => document.querySelector("#notePane [data-pane-back]")?.click()); await page.waitForTimeout(300);
    await jmOpenNote(page, "n2");
    await page.waitForTimeout(600);
    const linked = await page.evaluate(() => ({ head: document.querySelector("#notePane [data-links-in-head]")?.textContent.trim() ?? null, rows: [...document.querySelectorAll("#notePane [data-links-in] [data-link-open]")].map((b) => b.textContent.trim()) }));
    check(`[${tag}] Reading tools in a Note: a Note linked from another shows "Linked from" with that Note`, /Linked from/.test(linked.head || "") && linked.rows.includes("Note One"), JSON.stringify(linked));
    check(`[${tag}] Reading tools in a Note: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
    await ctx.close();
  } catch (e) { crash(e); }

  // Tags: ⋯ → 🏷 Tags…, create a tag, tick; the Tags list shows its count; tap the tag to see its Notes
  for (const [w, h] of VIEWPORTS) try {
    const tag = `${w}px`;
    const { ctx, page, errors } = await jmOpen("/app/journey-map.html#folders", w, h);
    await jmReady(page);
    await jmOpenNote(page, "n1");
    await page.click("#notePane [data-pane-menu-btn]");
    await page.waitForSelector("[data-pane-menu] [data-pane-tags]", { state: "visible" });
    const tagBtn = await page.evaluate(() => document.querySelector("[data-pane-menu] [data-pane-tags]").textContent.trim());
    check(`[${tag}] Tags on Notes: ⋯ has 🏷 Tags…`, /Tags/.test(tagBtn), tagBtn);
    await page.click("[data-pane-menu] [data-pane-tags]"); await page.waitForSelector(".tag-picker");
    await page.fill("[data-tag-new-name]", "Prayer"); await page.click("[data-tag-new]");
    await page.waitForFunction(() => document.querySelectorAll(".tag-pick-row input:checked").length === 1, null, { timeout: 8000 }).catch(() => {});
    check(`[${tag}] Tags on Notes: creating a tag in the picker also ticks it for this Note`, await page.evaluate(() => document.querySelectorAll(".tag-pick-row input:checked").length === 1));
    await page.click("[data-tag-close]"); await page.waitForTimeout(300);
    check(`[${tag}] Tags on Notes: the Note shows the tag as a chip`, await page.evaluate(() => [...document.querySelectorAll("#notePane [data-tag-chip]")].some((e) => /Prayer/.test(e.textContent))));
    await page.evaluate(() => document.querySelector("#notePane [data-pane-back]")?.click()); await page.waitForTimeout(300);
    if (await vis(page, "#folderNotes [data-list-back]")) { await page.click("#folderNotes [data-list-back]"); await page.waitForTimeout(300); }
    await page.waitForSelector("[data-tags-block] [data-tag-item]", { timeout: 8000 }).catch(() => {});
    const cnt = await page.evaluate(() => document.querySelector("[data-tag-item] [data-tag-count]")?.textContent.trim() ?? null);
    check(`[${tag}] Tags on Notes: a Tags list under the folders shows how many Notes each tag has (1)`, cnt === "1", String(cnt));
    await page.click("[data-tag-item] [data-tag-open]"); await page.waitForSelector("[data-tag-notes] [data-tag-note]", { timeout: 8000 }).catch(() => {});
    const listed = await page.evaluate(() => [...document.querySelectorAll("[data-tag-note]")].map((e) => e.dataset.tagNote));
    check(`[${tag}] Tags on Notes: tapping a tag lists its Notes`, JSON.stringify(listed) === JSON.stringify([hx("n1")]), JSON.stringify(listed));
    check(`[${tag}] Tags on Notes: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
    await ctx.close();
  } catch (e) { crash(e); }

  // Pop-up Note windows
  for (const [w, h] of VIEWPORTS) try {
    const tag = `${w}px`;
    const { ctx, page, errors } = await jmOpen("/app/journey-map.html#folders", w, h, NOTES_SEED() + `DATA.notes.find(function (x) { return x.noteId === "${hx("n3")}"; }).pinned = true;`);
    await jmReady(page);
    await jmOpenNote(page, "n1");
    await page.click("#notePane [data-pane-menu-btn]");
    await page.click("[data-pane-menu] [data-pane-popout]");
    await page.waitForSelector(`.note-win[data-note-id="${hx("n1")}"]`, { timeout: 8000 }).catch(() => {});
    check(`[${tag}] Pop-up Note windows: ⋯ → ⧉ Pop out opens the Note in its own window`, (await count(page, ".note-win")) === 1);
    // a second one: ▾ → ⧉ Open in window on the list row
    await page.evaluate(() => document.querySelector("#folderNotes [data-list-back]")?.click());
    if (w < 600) { await page.setViewportSize({ width: 820, height: 900 }); await page.waitForTimeout(500); }
    await page.evaluate((id) => localStorage.setItem("mmsa-journey-note-window", JSON.stringify({ x: 420, y: 80, w: 360, h: 600 })), 0);
    await page.evaluate((hxid) => { const row = document.querySelector(`#folderNotes [data-note-leaf][data-note-id="${hxid}"]`); row?.querySelector("[data-note-toggle]")?.click(); row?.querySelector("[data-note-window]")?.click(); }, hx("n2"));
    await page.waitForSelector(`.note-win[data-note-id="${hx("n2")}"]`, { timeout: 8000 }).catch(() => {});
    if (w < 600) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(500); }
    check(`[${tag}] Pop-up Note windows: several Notes open at once, each in its own window`, (await count(page, ".note-win")) === 2);
    const sw = await page.evaluate(() => ({ shown: !!document.getElementById("noteWinSwitch") && document.getElementById("noteWinSwitch").getBoundingClientRect().height > 0, tabs: document.querySelectorAll("#noteWinSwitch [data-win-switch]").length, closeAll: document.querySelector("#noteWinSwitch [data-win-closeall]")?.textContent.trim() ?? "" }));
    check(`[${tag}] Pop-up Note windows: ${w < 600 ? "a switcher at the bottom" : "a tab strip"} switches between them`, sw.shown && sw.tabs === 2, JSON.stringify(sw));
    if (w >= 1000) {
      const TOP = `.note-win[data-note-id="${hx("n2")}"]`; // the newest window is on top
      const bar = await page.locator(`${TOP} .nw-title`).boundingBox();
      const before = await page.locator(TOP).boundingBox();
      if (bar) { await page.mouse.move(bar.x + 20, bar.y + bar.height / 2); await page.mouse.down(); await page.mouse.move(bar.x - 40, bar.y + 50, { steps: 5 }); await page.mouse.up(); }
      const after = await page.locator(TOP).boundingBox();
      check(`[${tag}] Pop-up Note windows: a window can be moved by its title bar`, !!before && !!after && (Math.abs(after.x - before.x) > 20 || Math.abs(after.y - before.y) > 20), JSON.stringify({ before, after }));
      const se = await page.locator(`${TOP} [data-h="se"]`).boundingBox();
      if (se) { await page.mouse.move(se.x + 6, se.y + 6); await page.mouse.down(); await page.mouse.move(se.x - 80, se.y - 60, { steps: 5 }); await page.mouse.up(); }
      const sized = await page.locator(TOP).boundingBox();
      check(`[${tag}] Pop-up Note windows: a window can be resized by its corner`, !!se && !!sized && (Math.abs(sized.width - after.width) > 20 || Math.abs(sized.height - after.height) > 20), JSON.stringify({ after, sized }));
    }
    // Pinned Notes can be shown in a side panel
    const frontWin = () => page.evaluate(() => { const ws = [...document.querySelectorAll(".note-win")].filter((x) => x.getBoundingClientRect().width > 0 && x.querySelector("[data-win-pins-toggle]")); return ws.sort((a, b) => (Number(getComputedStyle(b).zIndex) || 0) - (Number(getComputedStyle(a).zIndex) || 0))[0]?.dataset.noteId ?? null; });
    const fid = await frontWin();
    const WIN = `.note-win[data-note-id="${fid}"]`;
    const pins = await page.evaluate((s) => { const t = document.querySelector(s + " [data-win-pins-toggle]"); return { has: !!t, text: t?.textContent.trim() ?? "" }; }, WIN);
    if (pins.has) { await page.evaluate((s) => document.querySelector(s + " [data-win-pins-toggle]").click(), WIN); await page.waitForTimeout(300); }
    const panel = await page.evaluate((s) => { const p = document.querySelector(s + " [data-win-pinned]"); const r = p?.getBoundingClientRect(); return { shown: !!p && !p.hidden && r.width > 0, text: p?.textContent.replace(/\s+/g, " ").trim().slice(0, 80) ?? "" }; }, WIN);
    check(`[${tag}] Pop-up Note windows: 📌 Pinned in a window opens a side panel listing the pinned Notes (Note Three)`, pins.has && panel.shown && /Note Three/.test(panel.text), JSON.stringify({ pins, panel }));
    check(`[${tag}] Pop-up Note windows: "✕ Close all (2)" is offered`, /Close all/.test(sw.closeAll), sw.closeAll);
    await page.click("#noteWinSwitch [data-win-closeall]").catch(() => {}); await page.waitForTimeout(400);
    check(`[${tag}] Pop-up Note windows: ✕ Close all closes them`, (await count(page, ".note-win")) === 0);
    check(`[${tag}] Pop-up Note windows: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
    await ctx.close();
  } catch (e) { crash(e); }

  // ### Pictures, tables and link previews   +   ### My Note tools   +   ### Favourites, Archived and Trash
  for (const [w, h] of VIEWPORTS) try {
    const tag = `${w}px`;
    const { ctx, page, errors } = await jmOpen("/app/journey-map.html#folders", w, h);
    await jmReady(page);
    await jmOpenNote(page, "n1");
    const barSel = (s) => `#notePane [data-pane-bar] > ${s}`;
    const pressBar = async (attr) => { if (await vis(page, barSel(attr))) await page.click(barSel(attr)); else { await page.click("#notePane [data-pane-menu-btn]"); await page.click(`#notePane [data-pane-menu] ${attr}`); } };
    // Pictures, tables, link previews
    await pressBar("[data-pane-edit-toggle]"); await page.waitForSelector("#notePane [data-edit-body]", { state: "visible" });
    const cmds = await page.evaluate(() => [...document.querySelectorAll("#notePane [data-edit-toolbar] [data-cmd]")].map((b) => b.dataset.cmd));
    check(`[${tag}] Pictures, tables and link previews: while editing the toolbar has 🖼 picture, ▦ table and ⊞ spreadsheet tools`, ["image", "table", "sheet"].every((c) => cmds.includes(c)), JSON.stringify(cmds));
    await pressBar("[data-pane-edit-toggle]"); await page.waitForTimeout(800); // ✓ Done
    await page.click("#notePane [data-pane-menu-btn]"); await page.waitForTimeout(300);
    const pv0 = await page.evaluate(() => document.querySelector("#notePane [data-pane-previews]")?.getAttribute("aria-pressed") ?? null);
    check(`[${tag}] Pictures, tables and link previews: ⋯ has "Show link previews", off to begin with`, pv0 === "false", String(pv0));
    await page.click("#notePane [data-pane-previews]"); await page.waitForTimeout(400);
    // The switch first asks in words (the link's address goes to Microlink); "Turn on" then makes it so.
    const asks = await page.evaluate(() => /Microlink/.test(document.querySelector("[data-preview-yes]")?.closest("div")?.parentElement?.textContent ?? ""));
    check(`[${tag}] Pictures, tables and link previews: the switch asks first (Microlink gets each link's address) before turning cards on`, asks);
    await page.click("[data-preview-yes]").catch(() => {}); await page.waitForTimeout(500);
    const pv1 = await page.evaluate(() => document.querySelector("#notePane [data-pane-previews]")?.getAttribute("aria-pressed") ?? null);
    check(`[${tag}] Pictures, tables and link previews: pressing it turns link cards on`, pv1 === "true", String(pv1));
    await page.keyboard.press("Escape"); if (w < 600) await page.click(".pane-menu-x").catch(() => {});
    await page.waitForTimeout(300);

    // My Note tools
    await page.click("#notePane [data-pane-menu-btn]"); await page.click("#notePane [data-pane-menu] [data-pane-mytools]");
    await page.waitForSelector(".mt-dialog [data-mt-sec]", { state: "visible" });
    await page.click('.mt-dialog [data-mt-sec="templates"]');
    await page.click(".mt-dialog [data-mt-tplsave]"); await page.waitForTimeout(900);
    const tpl = await page.evaluate(() => ({ n: document.querySelectorAll(".mt-dialog [data-mt-tpl]").length, name: document.querySelector(".mt-dialog [data-mt-tplname]")?.value, newFrom: [...document.querySelectorAll(".mt-dialog button")].some((b) => /New note from this/.test(b.textContent)), /* MANUAL IS STALE: the button reads "New note from this", not "New from template" */ writes: (window.__stubWriteData || []).map((x) => x.col) }));
    check(`[${tag}] My Note tools: "Save as template" lists a template named for the Note, with "New from template" to start a Note from it`, tpl.n >= 1 && tpl.name === "Note One" && tpl.newFrom, JSON.stringify(tpl));
    check(`[${tag}] My Note tools: the template is stored with the person's own settings (userPrefs), so it follows them to every device`, tpl.writes.length > 0 && tpl.writes.every((c) => c === "userPrefs"), JSON.stringify(tpl.writes));
    await page.click('.mt-dialog [data-mt-sec="phrases"]');
    await page.fill("[data-mt-phrasenew]", "Peace be upon you"); await page.click(".mt-dialog [data-mt-phraseform] button[type=submit]"); await page.waitForTimeout(800);
    check(`[${tag}] My Note tools: Add phrase saves a phrase`, await page.evaluate(() => document.querySelector("[data-mt-phrasetext]")?.value === "Peace be upon you"));
    await page.keyboard.press("Escape"); await page.evaluate(() => document.querySelectorAll(".mt-dialog").forEach((d) => (d.closest(".mt-overlay, [role=dialog]") || d).remove())); await page.waitForTimeout(200);

    // Favourites, Archived and Trash
    await page.evaluate(() => { window.__stubWriteData = []; });
    await page.click("#notePane [data-pane-menu-btn]"); await page.waitForTimeout(250);
    await page.click('#notePane [data-pane-flag="favourite"]'); await page.waitForTimeout(900);
    if (await page.evaluate(() => document.querySelector("#notePane [data-pane-menu]").classList.contains("open"))) { await page.click('#notePane [data-pane-flag="archived"]'); await page.waitForTimeout(700); } else { await page.click("#notePane [data-pane-menu-btn]"); await page.waitForTimeout(250); await page.click('#notePane [data-pane-flag="archived"]'); await page.waitForTimeout(700); }
    await page.keyboard.press("Escape"); if (w < 600) await page.click(".pane-menu-x").catch(() => {});
    await page.waitForTimeout(300);
    await page.click("#notePane [data-pane-back]").catch(() => {}); await page.waitForTimeout(300);
    if (await vis(page, "#folderNotes [data-list-back]")) { await page.click("#folderNotes [data-list-back]"); await page.waitForTimeout(300); }
    const pageMenu = async () => { await page.click('[data-bar-palette-toggle="pageMenu"]'); await page.waitForTimeout(300); };
    const labels = async () => { await pageMenu(); const l = await page.evaluate(() => ["openFavouritesBtn", "openArchivedBtn", "openTrashBtn"].map((i) => document.getElementById(i)?.textContent.trim() ?? null)); await page.keyboard.press("Escape"); await page.evaluate(() => document.querySelectorAll("[data-bar-palette].open").forEach((e) => e.classList.remove("open"))); return l; };
    const lab = await labels();
    check(`[${tag}] Favourites, Archived and Trash: the page ⋯ offers ⭐ Favourites, 📦 Archived and 🗑 Trash`, /Favourites/.test(lab[0]) && /Archived/.test(lab[1]) && /Trash/.test(lab[2]), JSON.stringify(lab));
    await pageMenu(); await page.click("#openFavouritesBtn"); await page.waitForTimeout(700);
    const fav = await page.evaluate(() => document.querySelector("[data-flag-list=favourite]")?.textContent.replace(/\s+/g, " ").trim() ?? null);
    check(`[${tag}] Favourites, Archived and Trash: Favourites lists the Note marked ⭐`, /Note One/.test(fav || ""), String(fav));
    await page.keyboard.press("Escape"); await page.evaluate(() => document.querySelectorAll(".siyagah-overlay, [data-siyagah-dialog]").forEach((e) => e.remove()));
    await pageMenu(); await page.click("#openArchivedBtn"); await page.waitForTimeout(700);
    const arc = await page.evaluate(() => document.querySelector("[data-flag-list=archived]")?.textContent.replace(/\s+/g, " ").trim() ?? null);
    check(`[${tag}] Favourites, Archived and Trash: Archived lists the Note marked 📦`, /Note One/.test(arc || ""), String(arc));
    await page.keyboard.press("Escape"); await page.evaluate(() => document.querySelectorAll(".siyagah-overlay, [data-siyagah-dialog]").forEach((e) => e.remove()));
    // delete a Note, find it in Trash, Restore
    await jmOpenNote(page, "n2");
    await page.click("#notePane [data-pane-menu-btn]"); await page.waitForTimeout(250);
    await page.evaluate(() => { window.__stubWriteData = []; });
    await page.click("#notePane [data-pane-delete]"); await page.waitForTimeout(400);
    await page.click("[data-note-delete-yes]"); await page.waitForTimeout(1200);
    const gone = await page.evaluate(() => window.__DATA.notes.find((n) => n.noteId === "2".repeat(32))?.status);
    const wDel = await page.evaluate(() => (window.__stubWriteData || []).some((x) => /delete/i.test(x.kind)));
    if (!(await vis(page, '[data-bar-palette-toggle="pageMenu"]'))) { await page.click("[data-list-back]").catch(() => {}); await page.waitForTimeout(400); }
    await pageMenu(); await page.click("#openTrashBtn"); await page.waitForTimeout(800);
    const inTrash = await page.evaluate((id) => !!document.querySelector(`[data-trash-note-id="${id}"]`), hx("n2"));
    check(`[${tag}] Favourites, Archived and Trash: a deleted Note is only marked (never erased) and is in Trash`, gone && gone !== "active" && !wDel && inTrash, JSON.stringify({ gone, wDel, inTrash }));
    if (MUTATE === "notes") await page.evaluate(() => document.querySelectorAll("[data-trash-restore]").forEach((e) => e.remove()));
    await page.click(`[data-trash-note-id="${hx("n2")}"] [data-trash-restore]`, { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1200);
    const back = await page.evaluate(() => window.__DATA.notes.find((n) => n.noteId === "2".repeat(32))?.status);
    check(`[${tag}] Favourites, Archived and Trash: tapping Restore in Trash brings it back`, back === "active", String(back));
    check(`[${tag}] Pictures / My Note tools / Favourites: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
    await ctx.close();
  } catch (e) { crash(e); }

  // ### File in folder(s) from the Āyah card   (on 2:258, which has no Note yet: the Manual says one is created)
  const FILE_SEED = NOTES_SEED() + `
(function () {
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1, createdBy: "test-uid" };
  DATA.noteSections = [Object.assign({ _id: "t1__sec1", sectionId: "sec1", name: "Reflections", order: 0, status: "active" }, own)];
  DATA.noteFolders.find(function (f) { return f.folderId === "fA"; }).sectionId = "sec1";
})();`;
  for (const [w, h] of VIEWPORTS) try {
    const tag = `${w}px`;
    const { ctx, page, errors } = await jmOpen("/app/quranrevival.html", w, h, FILE_SEED);
    await page.route("**/archive.org/**", (r) => r.abort());
    if (!(await shown(page, "#tabReadBtn"))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
    await page.click("#tabReadBtn"); await page.waitForTimeout(400);
    await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 20000 });
    await page.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "258"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForTimeout(900);
    await page.evaluate(() => document.querySelector('[data-ayah-num-badge="2:258"]')?.click());
    await page.waitForSelector("[data-ayah-sheet] [data-ayah-sheet-file-folder]", { timeout: 10000 });
    await page.waitForTimeout(500);
    const label = await page.evaluate(() => document.querySelector("[data-ayah-sheet-file-folder]").getAttribute("aria-label") || document.querySelector("[data-ayah-sheet-file-folder]").textContent.trim());
    check(`[${tag}] File in folder(s): the Āyah card offers "File in folder(s)…"`, /File in folder/.test(label), label);
    if (MUTATE === "notes") await page.evaluate(() => document.querySelector("[data-ayah-sheet-file-folder]")?.remove());
    await page.click("[data-ayah-sheet] [data-ayah-sheet-file-folder]", { timeout: 4000 }).catch(() => {});
    await page.waitForSelector("[data-ayah-folder-picker]", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);
    const pick = await page.evaluate(() => ({ search: !!document.querySelector("[data-ayah-folder-search]"), heads: [...document.querySelectorAll("[data-ayah-folder-sechead]")].map((x) => x.textContent.trim()), ticks: [...document.querySelectorAll("[data-ayah-folder-toggle]")].map((x) => x.dataset.ayahFolderToggle), save: !!document.querySelector("[data-ayah-folder-save]"), fold: document.querySelectorAll("[data-ayah-folder-fold]").length }));
    check(`[${tag}] File in folder(s): the picker has a search box, tick boxes, Save, and groups folders under their section ("Reflections")`, pick.search && pick.save && pick.ticks.length >= 2 && pick.heads.includes("Reflections"), JSON.stringify(pick));
    await page.fill("[data-ayah-folder-search]", "Beta"); await page.waitForTimeout(300);
    const shownTicks = await page.evaluate(() => [...document.querySelectorAll("[data-ayah-folder-toggle]")].filter((x) => x.getBoundingClientRect().width > 0 || x.closest("label")?.getBoundingClientRect().width > 0).map((x) => x.dataset.ayahFolderToggle));
    check(`[${tag}] File in folder(s): the search box narrows the folders (Beta only)`, shownTicks.join() === "fB", JSON.stringify(shownTicks));
    await page.fill("[data-ayah-folder-search]", ""); await page.waitForTimeout(200);
    const backTxt = await page.evaluate(() => { const b = document.getElementById("ayahFolderFilingBackBtn"); return { text: b?.textContent.trim(), shown: !!b && b.getBoundingClientRect().width > 0 }; });
    check(`[${tag}] File in folder(s): "← Back to Āyah card" is on the picker`, backTxt.shown && /^←\s*Back to Āyah card/.test(backTxt.text || ""), JSON.stringify(backTxt));
    await page.click("#ayahFolderFilingBackBtn"); await page.waitForTimeout(600);
    const cardAgain = await page.evaluate(() => ({ card: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), picker: document.getElementById("ayahFolderFilingOverlay")?.classList.contains("open") ?? !!document.querySelector("[data-ayah-folder-picker]")?.getBoundingClientRect().width }));
    check(`[${tag}] File in folder(s): pressing it returns to the Āyah card (the picker closes)`, cardAgain.card && !cardAgain.picker, JSON.stringify(cardAgain));
    await page.click("[data-ayah-sheet] [data-ayah-sheet-file-folder]"); await page.waitForSelector("[data-ayah-folder-picker]", { timeout: 8000 }); await page.waitForTimeout(600);
    await page.evaluate(() => { window.__stubWriteData = []; });
    await page.evaluate(() => document.querySelector('[data-ayah-folder-toggle="fB"]').click());
    await page.click("[data-ayah-folder-save]"); await page.waitForTimeout(1500);
    const done = await page.evaluate(() => { const w = window.__stubWriteData || []; const src = w.find((x) => x.col === "noteSources"); return { note: w.some((x) => x.col === "notes"), source: src?.data?.sourceKey ?? null, placed: w.filter((x) => x.col === "notePlacements").map((x) => x.data.folderId) }; });
    check(`[${tag}] File in folder(s): Save creates the āyah's Note (linked to ayah:2:258) and files it in the ticked folder (Beta)`, done.note && done.source === "ayah:2:258" && done.placed.includes("fB"), JSON.stringify(done));
    check(`[${tag}] File in folder(s): no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
    await ctx.close();
  } catch (e) { crash(e); }

  // ### Import Notes   (Mapping My Journey → ⋯ → Import Notes…; source + file, optional Stack name, 2. Preview, 3. Import)
  const ENEX = `<?xml version="1.0" encoding="UTF-8"?><en-export><note><title>Reflection on Ayat al-Kursi 2:255</title><content><![CDATA[<?xml version="1.0"?><en-note><div>Allah, there is no god but He (2:255).</div></en-note>]]></content><created>20260101T100000Z</created></note><note><title>A plain thought</title><content><![CDATA[<?xml version="1.0"?><en-note><div>Nothing to cite here.</div></en-note>]]></content><created>20260102T100000Z</created></note></en-export>`;
  for (const [w, h] of VIEWPORTS) try {
    const tag = `${w}px`;
    const { ctx, page, errors } = await jmOpen("/app/journey-map.html#folders", w, h);
    await jmReady(page);
    if (await vis(page, "#folderNotes [data-list-back]")) { await page.click("#folderNotes [data-list-back]"); await page.waitForTimeout(300); }
    await page.click('[data-bar-palette-toggle="pageMenu"]'); await page.waitForTimeout(300);
    if (MUTATE === "notes") await page.evaluate(() => document.querySelector('a[href^="import-notes.html"]')?.remove());
    const link = await page.evaluate(() => { const a = document.querySelector('[data-bar-palette="pageMenu"] a[href^="import-notes.html"]'); return a ? { txt: a.textContent.trim(), shown: a.getBoundingClientRect().width > 0 } : null; });
    check(`[${tag}] Import Notes: Mapping My Journey → ⋯ has "Import Notes…"`, !!link && link.shown && /^Import Notes/.test(link.txt), JSON.stringify(link));
    await page.click('[data-bar-palette="pageMenu"] a[href^="import-notes.html"]', { timeout: 4000 }).catch(() => {});
    await page.waitForURL(/import-notes\.html/, { timeout: 10000 }).catch(() => {});
    await page.waitForSelector("#sourceSelect", { state: "visible", timeout: 15000 });
    const src = await page.evaluate(() => ({ opts: [...document.querySelectorAll("#sourceSelect option")].map((o) => o.textContent.trim()), stackShown: getComputedStyle(document.getElementById("stackNameRow")).display !== "none", preview: getComputedStyle(document.getElementById("previewSection")).display !== "none", h: [...document.querySelectorAll("h2")].map((x) => x.textContent.trim()) }));
    check(`[${tag}] Import Notes: the Source offers a WordPress export (.xml) and an Evernote export (.enex)`, src.opts.length === 2 && /WordPress.*\.xml/.test(src.opts[0]) && /Evernote.*\.enex/.test(src.opts[1]), JSON.stringify(src.opts));
    check(`[${tag}] Import Notes: the page is the steps 1. Choose your export, 2. Preview, 3. Import (no preview before a file)`, /^1\./.test(src.h[0]) && /^2\. Preview/.test(src.h[1]) && /^3\. Import/.test(src.h[2]) && !src.preview, JSON.stringify(src));
    check(`[${tag}] Import Notes: the optional Stack name is not offered for WordPress`, !src.stackShown);
    await page.selectOption("#sourceSelect", "evernote"); await page.waitForTimeout(300);
    check(`[${tag}] Import Notes: choosing Evernote offers an optional Stack name`, await vis(page, "#stackNameInput"));
    await page.fill("#stackNameInput", "Personal Journal");
    await page.evaluate(() => { window.__stubWriteData = []; });
    await page.setInputFiles("#fileInput", [{ name: "My Notebook.enex", mimeType: "application/xml", buffer: Buffer.from(ENEX) }]);
    await page.waitForFunction(() => getComputedStyle(document.getElementById("previewSection")).display !== "none", null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    const prev = await page.evaluate(() => ({ shown: getComputedStyle(document.getElementById("previewSection")).display !== "none", notes: document.getElementById("statNotes")?.textContent, ayah: document.getElementById("statAyahLinks")?.textContent, noRef: document.getElementById("statNoRef")?.textContent, folders: document.getElementById("statFolders")?.textContent, btn: document.getElementById("importBtn")?.getAttribute("aria-disabled") }));
    check(`[${tag}] Import Notes: choosing the file shows a Preview (2 Notes, 1 linked to an āyah, 1 with no reference) before anything is imported`, prev.shown && prev.notes === "2" && prev.ayah === "1" && prev.noRef === "1", JSON.stringify(prev));
    const wBefore = await page.evaluate(() => (window.__stubWriteData || []).length);
    check(`[${tag}] Import Notes: the preview wrote nothing`, wBefore === 0);
    await page.click("#importBtn"); await page.waitForTimeout(2500);
    const res = await page.evaluate(() => { const w = window.__stubWriteData || []; return { result: document.getElementById("resultLine")?.textContent.trim() || "", notes: w.filter((x) => x.col === "notes").length, folderW: w.filter((x) => x.col === "noteFolders").length, status: document.getElementById("pageStatusMsg")?.textContent.trim() }; });
    check(`[${tag}] Import Notes: 3. Import brings the Notes in (writes Notes and a folder, with the Stack name)`, res.notes >= 2 && res.folderW >= 1, JSON.stringify(res));
    check(`[${tag}] Import Notes: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
    await ctx.close();
  } catch (e) { crash(e); }

  // ### My Notes page   (notes.html for one study unit; New Note, Edit, history, Open in window, Make a printable page)
  for (const [w, h] of VIEWPORTS) try {
    const tag = `${w}px`;
    const { ctx, page, errors } = await jmOpen("/app/notes.html?unit=ayah%3A2%3A256&label=%C4%80yah%202%3A256&back=1", w, h);
    await page.waitForSelector("#notesContainer .note-card", { timeout: 15000 });
    await page.waitForTimeout(500);
    const top = await page.evaluate(() => ({ h1: document.querySelector("h1")?.textContent.trim(), banner: document.getElementById("unitBanner")?.textContent.trim(), cards: document.querySelectorAll("#notesContainer .note-card").length, newBtn: document.getElementById("newNoteBtn")?.textContent.trim(), back: !document.getElementById("notesBackBtn").hidden }));
    check(`[${tag}] My Notes page: it is the Notes of one study unit (banner names 2:256, lists its 3 Notes)`, top.h1 === "My Notes" && /2:256/.test(top.banner || "") && top.cards === 3, JSON.stringify(top));
    check(`[${tag}] My Notes page: "+ New Note about this unit" is offered`, /^\+\s*New Note about this unit/.test(top.newBtn || "") && (await vis(page, "#newNoteBtn")), JSON.stringify(top));
    const acts = await page.evaluate(() => [...document.querySelector("#notesContainer .note-card .note-actions").querySelectorAll("button")].map((b) => b.textContent.replace(/\s+/g, " ").trim()));
    if (MUTATE === "notes") acts.splice(acts.findIndex((a) => /Edit/.test(a)), 1);
    check(`[${tag}] My Notes page: each Note offers Edit, Open in window, Show history and Make a printable page`, ["Edit", "Open in window", "Show history", "Make a printable page"].every((x) => acts.some((a) => a.includes(x))), JSON.stringify(acts));
    // + New Note → Save
    await page.click("#newNoteBtn"); await page.waitForSelector("#newNoteForm", { state: "visible", timeout: 5000 });
    await page.fill("#newTitleInput", "Fresh thought");
    await page.click("#newBodyEditor"); await page.keyboard.type("A new body for this unit");
    await page.evaluate(() => { window.__stubWriteData = []; });
    await page.click("#newSaveBtn"); await page.waitForTimeout(1500);
    const saved = await page.evaluate(() => { const wr = window.__stubWriteData || []; return { note: wr.some((x) => x.col === "notes"), src: wr.find((x) => x.col === "noteSources")?.data?.sourceKey ?? null, listed: [...document.querySelectorAll("#notesContainer .note-title, #notesContainer [data-note-title]")].some((e) => /Fresh thought/.test(e.textContent)) }; });
    check(`[${tag}] My Notes page: + New Note → Save stores the Note linked to the unit (ayah:2:256) and lists it`, saved.note && saved.src === "ayah:2:256" && saved.listed, JSON.stringify(saved));
    // Edit
    await page.click('#notesContainer .note-card [data-note-edit]'); await page.waitForTimeout(600);
    const editing = await page.evaluate(() => !!document.querySelector("#notesContainer .note-card [contenteditable=true], #notesContainer .note-card textarea, #notesContainer .note-card input"));
    check(`[${tag}] My Notes page: Edit opens an editor on the Note`, editing);
    await page.reload(); await page.waitForSelector("#notesContainer .note-card", { timeout: 15000 }); await page.waitForTimeout(500);
    // history
    await page.click('#notesContainer .note-card [data-note-history-toggle]'); await page.waitForTimeout(800);
    const hist = await page.evaluate(() => { const c = document.querySelector("#notesContainer .note-card [data-note-history]"); return { shown: c.getBoundingClientRect().height > 0, txt: c.textContent.replace(/\s+/g, " ").trim().slice(0, 80), btn: document.querySelector("#notesContainer .note-card [data-note-history-toggle]").textContent.trim() }; });
    check(`[${tag}] My Notes page: Show history lists the Note's revisions (button then reads Hide history)`, hist.shown && /Edited|Revision|content-update/i.test(hist.txt) && /Hide history/.test(hist.btn), JSON.stringify(hist));
    // Open in window
    await page.click('#notesContainer .note-card [data-note-window]'); await page.waitForTimeout(1200);
    const win = await page.evaluate(() => document.querySelectorAll(".note-win").length === 1);
    check(`[${tag}] My Notes page: ⧉ Open in window opens the Note in a pop-up window`, win);
    check(`[${tag}] My Notes page: ← Back is shown when the page was reached with back=1`, top.back);
    check(`[${tag}] My Notes page: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
    await ctx.close();
  } catch (e) { crash(e); }

  // ### Dawah pages   (Note → Make a printable page → Dawah: My pages → Send for approval / Print; owner Approve or Return with a reason)
  const DAWAH_SEED = (author, minor) => NOTES_SEED() + `
(function () {
  var o = { tenantId: "t1", authorPersonId: "${author}", schemaVersion: 1, createdBy: "test-uid", createdAt: "2026-09-01T10:00:00.000Z", updatedAt: "2026-09-01T10:00:00.000Z", sourceNoteId: "x", sourceRevisionId: "y", sourceUnitKey: "ayah:2:255", approvedByPersonId: null, approvedAt: null, returnedNote: null, bodyHtml: "<p>Dawah body</p>" };
  DATA.dawahPages = [
    Object.assign({ _id: "t1__dpA", pageId: "dpA", title: "Draft page A", status: "draft" }, o),
    Object.assign({ _id: "t1__dpW", pageId: "dpW", title: "Waiting page W", status: "awaiting-approval", authorPersonId: "p2" }, o, { authorPersonId: "p2" }),
    Object.assign({ _id: "t1__dpV", pageId: "dpV", title: "Waiting page V", status: "awaiting-approval", authorPersonId: "p2" }, o, { authorPersonId: "p2" }),
    Object.assign({ _id: "t1__dpC", pageId: "dpC", title: "Shared page C", status: "shared" }, o)];
  ${minor ? 'DATA.tenantPeople.forEach(function (p) { if (p.personId === "p1") p.isMinor = true; });' : ""}
})();`;
  for (const [w, h] of VIEWPORTS) try {
    const tag = `${w}px`;
    // Make a printable page, from a Note
    {
      const { ctx, page, errors } = await jmOpen("/app/notes.html?unit=ayah%3A2%3A256&label=%C4%80yah%202%3A256&back=1", w, h);
      await page.waitForSelector("#notesContainer .note-card [data-note-dawah]", { timeout: 15000 });
      // the page then navigates to dawah.html (which would reset the write log), so hold that navigation and read what was written
      await page.evaluate(() => { window.__stubWriteData = []; window.addEventListener("beforeunload", () => { sessionStorage.setItem("__mcW", JSON.stringify((window.__stubWriteData || []).map((x) => x.col + ":" + x.kind + ":" + (x.data?.status ?? "")))); }); });
      await page.click("#notesContainer .note-card [data-note-dawah]");
      await page.waitForURL(/dawah\.html/, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(800);
      const wentTo = page.url();
      const made = await page.evaluate(() => JSON.parse(sessionStorage.getItem("__mcW") || "[]"));
      check(`[${tag}] Dawah pages: a Note's "Make a printable page" makes a draft Dawah page and opens the Dawah screen`, made.some((x) => /^dawahPages:.*:draft$/.test(x)) && /dawah\.html\?back=1/.test(wentTo || ""), JSON.stringify({ made, wentTo }));
      await ctx.close();
    }
    // Home ▾ → Dawah, then My pages
    const { ctx, page, errors } = await jmOpen("/app/about.html", w, h, DAWAH_SEED("p1", true));
    await page.waitForTimeout(800);
    await page.locator("#topNav summary", { hasText: /^Home$/ }).first().click(); await page.waitForTimeout(250);
    const link = await page.evaluate(() => [...document.querySelectorAll(".nav-cat-home a")].find((a) => /^Dawah$/.test(a.textContent.trim()))?.getAttribute("href") ?? null);
    check(`[${tag}] Dawah pages: Home ▾ has a Dawah link`, /dawah\.html/.test(link || ""), String(link));
    await page.goto(new URL("/app/dawah.html", page.url()).href);
    await page.waitForSelector('#viewMine .page-card[data-page-id="dpA"]', { timeout: 15000 });
    await page.waitForTimeout(500);
    const tabs = await page.evaluate(() => [...document.querySelectorAll("#viewToggle button")].map((b) => b.textContent.trim()));
    check(`[${tag}] Dawah pages: the screen has My pages, Waiting for my approval and Madrasah pages`, JSON.stringify(tabs) === JSON.stringify(["My pages", "Waiting for my approval", "Madrasah pages"]), JSON.stringify(tabs));
    const btns = await page.evaluate(() => [...document.querySelectorAll('#viewMine .page-card[data-page-id="dpA"] .page-actions button')].map((b) => b.textContent.trim()));
    check(`[${tag}] Dawah pages: My pages → a draft by a minor author offers "Send for approval" and Print`, btns.includes("Send for approval") && btns.includes("Print"), JSON.stringify(btns));
    await page.evaluate(() => { window.__printCalls = 0; window.print = () => { window.__printCalls++; }; window.__stubWriteData = []; });
    await page.click('#viewMine [data-page-id="dpA"] [data-page-print]'); await page.waitForTimeout(400);
    check(`[${tag}] Dawah pages: Print asks the browser to print (and stores nothing)`, (await page.evaluate(() => window.__printCalls)) === 1 && (await page.evaluate(() => window.__stubWriteData.length)) === 0);
    await page.click('#viewMine [data-page-id="dpA"] [data-page-submit]'); await page.waitForTimeout(1500);
    const sent = await page.evaluate(() => (window.__stubWriteData || []).filter((x) => x.col === "dawahPages").map((x) => x.data?.status));
    check(`[${tag}] Dawah pages: Send for approval moves the page to awaiting-approval`, sent.includes("awaiting-approval"), JSON.stringify(sent));
    await ctx.close();
    // owner approves or returns
    const o2 = await jmOpen("/app/dawah.html", w, h, DAWAH_SEED("p1", false));
    const pg = o2.page;
    await pg.waitForSelector('#viewMine .page-card[data-page-id="dpA"]', { timeout: 15000 });
    const adult = await pg.evaluate(() => document.querySelector('#viewMine [data-page-id="dpA"] [data-page-submit]')?.textContent.trim());
    check(`[${tag}] Dawah pages: an adult author's button reads "Share" (the Manual's "Send for approval" is for a minor author's pages)`, adult === "Share", String(adult));
    if (MUTATE === "notes") await pg.evaluate(() => document.querySelector('[data-view="approvals"]')?.remove());
    await pg.click('[data-view="approvals"]', { timeout: 4000 }).catch(() => {}); await pg.waitForTimeout(600);
    const waiting = await pg.evaluate(() => [...document.querySelectorAll("#viewApprovals .page-card")].map((c) => c.dataset.pageId + ":" + [...c.querySelectorAll(".page-actions button")].map((b) => b.textContent.trim()).join("/")));
    check(`[${tag}] Dawah pages: Waiting for my approval lists the pages sent by others with Approve and Return`, waiting.length === 2 && waiting.every((x) => /Approve\/Return/.test(x)), JSON.stringify(waiting));
    await pg.evaluate(() => { window.__stubWriteData = []; });
    await pg.click('#viewApprovals [data-page-id="dpW"] [data-page-approve]'); await pg.waitForTimeout(1500);
    const appr = await pg.evaluate(() => (window.__stubWriteData || []).filter((x) => x.col === "dawahPages").map((x) => x.data?.status));
    check(`[${tag}] Dawah pages: Approve shares the page with the madrasah`, appr.includes("shared"), JSON.stringify(appr));
    let asked = null;
    pg.once("dialog", (d) => { asked = d.message(); d.accept("Please add the source"); });
    await pg.evaluate(() => { window.__stubWriteData = []; });
    await pg.click('#viewApprovals [data-page-id="dpV"] [data-page-return]'); await pg.waitForTimeout(1500);
    const ret = await pg.evaluate(() => (window.__stubWriteData || []).filter((x) => x.col === "dawahPages").map((x) => x.data?.status + "|" + (x.data?.returnedNote ?? "")));
    check(`[${tag}] Dawah pages: Return asks for a reason and sends the page back to draft with it`, /Why is this page being returned/.test(asked || "") && ret.some((x) => x === "draft|Please add the source"), JSON.stringify({ asked, ret }));
    await pg.click('[data-view="shared"]'); await pg.waitForTimeout(500);
    check(`[${tag}] Dawah pages: Madrasah pages lists the shared pages`, (await pg.evaluate(() => document.querySelectorAll("#viewShared .page-card").length)) >= 1);
    check(`[${tag}] Dawah pages: no page error`, quiet(errors).length === 0 && quiet(o2.errors).length === 0, JSON.stringify(quiet(o2.errors)));
    await o2.ctx.close();
  } catch (e) { crash(e); }
  SKIP("Dawah pages: Āyah card → Make a poster / a Hadith or Dua card's 📝 My Notes link", "the Āyah card is Quran Study (frozen) and the Hadith/Dua cards are the Hadith Lead's; the page they open (notes.html?unit=) is what is checked above");
}

// =====================================================================================================================
// ▸ Hadith and Dua   (audit part 89; the Hadith Lead's module, so a FAIL is reported, never fixed here)
// =====================================================================================================================
if (want("hadith")) {
  console.log("== Hadith and Dua");
  const fsx = await import("node:fs");
  const OUT = "tools/hadith-data-pull/output";
  const rec = (lang, id) => { const c = JSON.parse(fsx.readFileSync(`${OUT}/hadeethenc/${lang}/categories.json`, "utf8")); return JSON.parse(fsx.readFileSync(`${OUT}/hadeethenc/${c.hadithFile[id]}`, "utf8")).hadiths.find((h) => h.id === id); };
  const R = { ar: rec("ar", "4563"), en: rec("en", "4563"), bn: rec("bn", "4563") };
  // The numbers the Manual quotes, read from the data the app ships.
  const books = fsx.readdirSync(`${OUT}/openiti-release`).filter((f) => /-ara1\.txt$/.test(f));
  let duas = 0; const duaBooks = new Set();
  for (let i = 1; i <= 79; i++) for (const c of JSON.parse(fsx.readFileSync(`${OUT}/dua/cards-${i}.json`, "utf8")).cards) { duas++; for (const m of c.members) duaBooks.add(m[0]); }
  const BUKHARI = "0256Bukhari.Sahih.JK000110-ara1";
  const FAMILY = `DATA.tenantPeople.push({ _id: "p3", tenantId: TENANT_ID, personId: "p3", name: "Yusuf", roles: ["guardian"] });`;
  const CHECK = `DATA.ayahCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, collections: [] }];`;
  const READER = `DATA.tenantMemberUids[0].roles = ["student"]; DATA.tenantPeople[0].roles = ["student"];`;
  const mut = (page, sel) => MUTATE === "hadith" ? page.evaluate((s) => document.querySelectorAll(s).forEach((e) => e.remove()), sel) : null;
  const wcount = (page) => page.evaluate(() => (window.__stubWriteData || []).length);
  const wfrom = (page, k) => page.evaluate((k) => (window.__stubWriteData || []).slice(k).map((x) => ({ col: x.col, id: x.id, data: x.data })), k);
  const hopen = async (w, h, seed = "") => {
    const o = await open("/app/people.html", { w, h, ctxOpts: { extraSeedJs: seed } });
    await o.ctx.route("**/archive.org/**", (r) => r.abort());
    return o;
  };
  // Modules ▾ → Hadith, as the Manual says, then the page's own tab.
  const toHadith = async (page, tab) => {
    await settle(page);
    await page.locator("#topNav summary", { hasText: /^Modules$/ }).first().click(); await page.waitForTimeout(150);
    await Promise.all([page.waitForURL(/hadith-study\.html/, { timeout: 15000 }), page.click('#navBar a[href^="hadith-study.html"]')]);
    await page.waitForSelector(`[data-hadith-tab="${tab}"]`, { timeout: 25000 });
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    // Updated in place 28 Oct 2026 (PCF MSA J106 round 1): the page opens on Hadith Books, whose button opens its quick
    // list when Books is already the view -- so a tab already current is not tapped again.
    if (!(await page.$eval(`[data-hadith-tab="${tab}"]`, (b) => b.getAttribute("aria-current") === "page"))) await page.click(`[data-hadith-tab="${tab}"]`);
  };
  const openHE = async (page) => {
    await page.waitForSelector('[data-hadeethenc-category="3"]', { timeout: 25000 });
    await page.click('[data-hadeethenc-category="3"]');
    await page.waitForSelector('[data-hadeethenc-hadith="4563"]', { timeout: 15000 });
    await page.click('[data-hadeethenc-hadith="4563"]');
    await page.waitForSelector('[data-hadeethenc-card="4563"]', { timeout: 15000 });
  };
  let gotoOpts = [];
  const gotoBukhari = async (page, n = "6306") => {
    await page.waitForSelector(`[data-openiti-book="${BUKHARI}"]`, { timeout: 25000 });
    await page.click(`[data-openiti-book="${BUKHARI}"]`);
    await page.waitForSelector("[data-openiti-goto-input]", { timeout: 15000 });
    gotoOpts = await page.evaluate(() => [...document.querySelectorAll("[data-openiti-goto-mode] option")].map((o) => o.textContent.trim()));
    await page.fill("[data-openiti-goto-input]", n);
    await mut(page, "[data-openiti-goto-btn]");
    await page.click("[data-openiti-goto-btn]", { timeout: 4000 });
  };
  const entryRows = (ws) => ws.filter((x) => x.col === "records").flatMap((x) => Object.entries(x.data?.entries || {}).map(([k, v]) => ({ id: x.id, key: k, status: v?.claimedStatus, by: v?.claimedByPersonId })).concat(Object.entries(x.data || {}).filter(([k]) => k.startsWith("entries.")).map(([k, v]) => ({ id: x.id, key: k.slice(8), status: v?.claimedStatus, by: v?.claimedByPersonId }))));
  const fitsScreen = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

  // The numbers the Manual quotes.
  check("Hadith library: Arabic books (OpenITI): the data holds fifteen Arabic books", books.length === 15, String(books.length));
  check("Dua cards: the data holds over 3,000 duas", duas > 3000, String(duas));
  check("Dua cards: the duas are gathered from eleven hadith books", duaBooks.size === 11, String(duaBooks.size));

  for (const [w, h] of VIEWPORTS) {
    const tag = `${w}px`;
    // ### Hadith library: HadeethEnc
    try {
      const { ctx, page, errors } = await hopen(w, h);
      await toHadith(page, "collections");
      // Updated in place 28 Oct 2026 (PCF MSA J106 round 1): the Owner had the "Hadith Corpus" heading's tabs moved into
      // one menu bar, where Collections is now "Encyclopedia" (the PCF User Manual's line is the Architect's to update
      // at release).
      const head = await page.evaluate(() => { const b = document.querySelector('.hadith-menubar [data-hadith-tab="collections"]'); return b ? { text: b.textContent.trim(), cur: b.getAttribute("aria-current") } : null; });
      check(`[${tag}] Hadith library: HadeethEnc: Modules ▾ → Hadith → the menu bar's "Encyclopedia"`, head?.text === "Encyclopedia" && head.cur === "page", JSON.stringify(head));
      await openHE(page);
      const c = await page.evaluate(() => { const k = document.querySelector('[data-hadeethenc-card="4563"]'); return { ar: k.querySelector(".hadith-arabic")?.textContent, tr: k.querySelector(".hadith-translation-text")?.textContent, grade: k.querySelector(".hadith-attribution")?.textContent ?? "", sel: document.getElementById("hadithContentLang")?.value, ex: !!k.querySelector("[data-hadeethenc-explanation-toggle]") }; });
      check(`[${tag}] Hadith library: HadeethEnc: a hadith opens with its Arabic and English, its grade and an explanation (verbatim from the packaged record)`, c.ar === R.ar.hadeeth && c.tr === R.en.hadeeth && c.grade.includes(R.en.grade) && c.ex, JSON.stringify(c).slice(0, 200));
      await page.click('[data-hadeethenc-card="4563"] [data-hadeethenc-explanation-toggle]'); await page.waitForTimeout(200);
      const ex = await page.evaluate(() => document.querySelector('[data-hadeethenc-card="4563"] .hadeethenc-explanation')?.innerText ?? "");
      check(`[${tag}] Hadith library: HadeethEnc: the explanation opens`, ex.includes(R.en.explanation.slice(0, 40)), ex.slice(0, 80));
      await mut(page, "#hadithContentLang");
      await page.selectOption("#hadithContentLang", "bn", { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(700);
      const bn = await page.evaluate(() => document.querySelector('[data-hadeethenc-card="4563"] .hadith-translation-text')?.textContent ?? null);
      check(`[${tag}] Hadith library: HadeethEnc: Text language বাংলা shows the hadith's Bangla`, bn === R.bn.hadeeth, String(bn).slice(0, 60));
      check(`[${tag}] Hadith library: HadeethEnc: no sideways scroll, no page error`, (await fitsScreen(page)) && quiet(errors).length === 0, JSON.stringify(quiet(errors)));
      await ctx.close();
    } catch (e) { crash(e); }

    // ### Hadith library: Arabic books (OpenITI)
    try {
      const { ctx, page, errors } = await hopen(w, h);
      await toHadith(page, "books"); // J106 round 1: the Arabic books are Hadith Books now
      await page.waitForSelector("[data-openiti-book]", { timeout: 25000 });
      const bookN = await page.evaluate(() => document.querySelectorAll("[data-openiti-book]").length);
      const names = await page.evaluate(() => [...document.querySelectorAll("[data-openiti-book]")].map((b) => b.textContent.replace(/\s+/g, " ")).join(" | "));
      check(`[${tag}] Hadith library: Arabic books (OpenITI): Hadith Books lists the Arabic books (the Manual says fifteen; the page lists ${bookN})`, bookN === 15, `${bookN}: ${names.slice(0, 300)}`);
      check(`[${tag}] Hadith library: Arabic books (OpenITI): Bukhari, Muslim, the Sunan, Malik, Riyad as-Salihin and al-Adhkar are among them`, ["Bukhari", "Muslim", "Sunan", "Malik|Muwatta", "Riyad", "Adhkar"].every((n) => new RegExp(n, "i").test(names)), names.slice(0, 300));
      await gotoBukhari(page);
      await page.waitForSelector('[data-openiti-passage="6578"]', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(800);
      const s = await page.evaluate(() => { const c = document.querySelector('[data-openiti-passage="6578"]'); return { text: c?.innerText ?? "" }; });
      s.opts = gotoOpts;
      check(`[${tag}] Hadith library: Arabic books (OpenITI): Go to hadith number 6306 (Standard number) finds Bukhari 6306 («سيد الاستغفار»)`, /سيد الاستغفار/.test(s.text) && /6306/.test(s.text), s.text.slice(0, 100));
      check(`[${tag}] Hadith library: Arabic books (OpenITI): "Which numbering" offers Standard number and This edition's number`, s.opts.length === 2 && /^Standard number$/i.test(s.opts[0]) && /edition/i.test(s.opts[1]), JSON.stringify(s.opts));
      // Back to the book's chapter list (the Manual's route), then the edition's own number.
      await page.reload();
      // Updated in place 28 Oct 2026 (PCF MSA J106 round 1): the page opens on Hadith Books, the shelf of every book.
      await page.waitForSelector(`[data-openiti-book="${BUKHARI}"]`, { timeout: 25000 });
      await page.click(`[data-openiti-book="${BUKHARI}"]`);
      await page.waitForSelector("[data-openiti-goto-input]", { timeout: 15000 });
      await page.selectOption("[data-openiti-goto-mode]", "edition");
      await page.fill("[data-openiti-goto-input]", "5947");
      await page.click("[data-openiti-goto-btn]");
      await page.waitForSelector('[data-openiti-passage="6578"]', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(800);
      const ed = await page.evaluate(() => document.querySelector('[data-openiti-passage="6578"]')?.innerText ?? "");
      check(`[${tag}] Hadith library: Arabic books (OpenITI): This edition's number 5947 finds the same narration`, /سيد الاستغفار/.test(ed) && /5947/.test(ed) && /6306/.test(ed), ed.slice(0, 100));
      await page.evaluate(() => { const d = document.querySelector('[data-openiti-passage="6578"] [data-standard-translation="en"]'); d?.scrollIntoView({ block: "center" }); d?.querySelector("summary")?.click(); });
      await page.waitForSelector('[data-openiti-passage="6578"] [data-standard-translation="en"] [data-standard-translation-text]', { timeout: 15000 }).catch(() => {});
      const tr = await page.evaluate(() => { const d = document.querySelector('[data-openiti-passage="6578"] [data-standard-translation="en"]'); return { label: d?.querySelector("summary")?.textContent.trim(), text: d?.querySelector("[data-standard-translation-text]")?.textContent ?? "" }; });
      check(`[${tag}] Hadith library: Arabic books (OpenITI): opening "English translation" reads the translation ("${tr.label}")`, /English translation/i.test(tr.label || "") && /Shaddad bin Aus/.test(tr.text), JSON.stringify(tr).slice(0, 160));
      SKIP(`[${tag}] Hadith library: Arabic books (OpenITI): the Bangla translation fold "where available"`, "the English fold is checked; the Bangla fold is the same code path and its text file is a separate network fetch of the same shape");
      check(`[${tag}] Hadith library: Arabic books (OpenITI): no sideways scroll, no page error`, (await fitsScreen(page)) && quiet(errors).length === 0, JSON.stringify(quiet(errors)));
      await ctx.close();
    } catch (e) { crash(e); }

    // ### Hadith "Studied" and notes
    try {
      const { ctx, page, errors } = await hopen(w, h, FAMILY);
      await toHadith(page, "collections");
      await openHE(page);
      await page.waitForSelector('[data-hadeethenc-card="4563"] [data-claim-for]', { timeout: 15000 });
      await page.waitForSelector('[data-hadeethenc-card="4563"] [data-hadeethenc-bookmark][aria-disabled="false"]', { timeout: 15000 }).catch(() => {});
      await mut(page, '[data-hadeethenc-studied="4563"]');
      let k = await wcount(page);
      await page.selectOption('[data-hadeethenc-studied="4563"]', "achieved", { timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(900);
      let es = entryRows(await wfrom(page, k));
      check(`[${tag}] Hadith "Studied" and notes: Studied records hadith:hadeethenc:4563 as studied for the signed-in person`, es.length === 1 && es[0].key.startsWith("hadith:hadeethenc:4563") && es[0].id.includes("__p1__") && es[0].status === "achieved", JSON.stringify(es));
      // APP IS WRONG (reported, not fixed): hadith-browser.js:654 toggles the popover on the trigger AND way-modal.js:271's delegated document listener
      // toggles it again (hadith-study.html imports way-modal.js), so the 👥 list opens and shuts in the same tap. Smallest fix: e.stopPropagation() in that handler.
      let tapped = 0;
      const pick = async (id) => {
        await page.waitForTimeout(400);
        await page.click('[data-hadeethenc-card="4563"] [data-claim-for] [data-assign-trigger]'); await page.waitForTimeout(250);
        const isOpen = await page.evaluate(() => document.querySelector('[data-hadeethenc-card="4563"] [data-assign-popover]')?.classList.contains("open"));
        if (tapped++ === 0) check(`[${tag}] Hadith "Studied" and notes: tapping 👥 opens the list of people to include`, isOpen === true, "the list did not open (two click handlers toggle it twice)");
        if (!isOpen) await page.evaluate(() => document.querySelector('[data-hadeethenc-card="4563"] [data-assign-popover]')?.classList.add("open")); // so the later claims can still be measured
        await page.waitForTimeout(100); await page.click(`[data-hadeethenc-card="4563"] [data-claim-for] [data-assign-list] input[value="${id}"]`); await page.click('[data-hadeethenc-card="4563"] [data-claim-for] [data-assign-trigger]'); await page.waitForTimeout(100); };
      await pick("p3"); await pick("p1");
      k = await wcount(page);
      await page.selectOption('[data-hadeethenc-studied="4563"]', "learning", { timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(900);
      es = entryRows(await wfrom(page, k));
      check(`[${tag}] Hadith "Studied" and notes: 👥 records it for a family member (Yusuf) instead`, es.length === 1 && es[0].id.includes("__p3__") && es[0].status === "learning", JSON.stringify(es));
      k = await wcount(page);
      await page.click('[data-hadeethenc-bookmark="4563"]');
      await page.waitForTimeout(900);
      const bw = (await wfrom(page, k)).filter((x) => x.col === "bookmarks").flatMap((x) => (x.data?.saved ?? []).map((b) => b.position));
      const bt = await page.evaluate(() => document.querySelector('[data-hadeethenc-bookmark="4563"]')?.textContent.trim());
      check(`[${tag}] Hadith "Studied" and notes: Bookmark this saves the hadith (button then reads "${bt}")`, bw.some((p) => String(p).startsWith("hadith:hadeethenc:4563")), JSON.stringify([bw, bt]));
      const nl = await page.evaluate(() => { const a = document.querySelector('[data-hadeethenc-note-link="4563"]'); return { text: a?.textContent.trim(), href: a?.getAttribute("href") }; });
      check(`[${tag}] Hadith "Studied" and notes: 📝 My Notes links the hadith to its notes (the Manual's label: "📝 My Notes"; the page says "${nl.text}")`, /My Notes/.test(nl.text || "") && /unit=hadith:hadeethenc:4563|unit=hadith%3Ahadeethenc%3A4563/.test(nl.href || ""), JSON.stringify(nl));
      await page.click('[data-hadith-tab="books"]'); // J106 round 1: from the Encyclopedia, Hadith Books goes to the shelf
      await page.waitForSelector("#openitiSection .openiti-study-soon", { timeout: 25000 });
      const soon = await page.evaluate(() => document.querySelector("#openitiSection .openiti-study-soon")?.textContent ?? "");
      check(`[${tag}] Hadith "Studied" and notes: the OpenITI Arabic books say "not enabled here yet"`, /not enabled here yet/.test(soon), soon.slice(0, 120));
      check(`[${tag}] Hadith "Studied" and notes: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
      await ctx.close();
    } catch (e) { crash(e); }

    // ### Dua cards
    try {
      const { ctx, page, errors } = await hopen(w, h);
      await toHadith(page, "dua");
      await page.waitForSelector("[data-dua-card]", { timeout: 25000 });
      const list = () => page.evaluate(() => ({ count: document.querySelector(".dua-cards-count")?.textContent ?? "", ids: [...document.querySelectorAll("[data-dua-card]")].map((c) => Number(c.dataset.duaCard)), narr: [...document.querySelectorAll("[data-dua-narrated-count]")].map((e) => Number(e.dataset.duaNarratedCount)), prevOff: document.querySelector("[data-dua-prev]")?.disabled }));
      const p1 = await list();
      check(`[${tag}] Dua cards: Hadith → Dua shows cards, most-narrated first (count line: "${p1.count.slice(0, 60)}")`, p1.ids.length === 40 && p1.narr.every((n, i) => i === 0 || n <= p1.narr[i - 1]) && p1.narr[0] > 1, JSON.stringify({ n: p1.ids.length, narr: p1.narr.slice(0, 6) }));
      check(`[${tag}] Dua cards: the count line names the whole set (${duas})`, p1.count.includes(String(duas).replace(/\B(?=(\d{3})+$)/, ",")) || p1.count.includes(String(duas)), p1.count);
      await mut(page, "[data-dua-next]");
      await page.click("[data-dua-next]", { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(700);
      const p2 = await list();
      await page.click("[data-dua-prev]", { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(700);
      const p3 = await list();
      check(`[${tag}] Dua cards: Next › shows the next set and ‹ Previous returns`, p2.ids[0] !== p1.ids[0] && p2.prevOff === false && p3.ids.join() === p1.ids.join(), JSON.stringify({ a: p1.ids[0], b: p2.ids[0], c: p3.ids[0] }));
      const card4 = '[data-dua-card="4"]';
      const words = () => page.evaluate((c) => ({ w: document.querySelector(`${c} [data-dua-words]`)?.textContent ?? "", sw: document.querySelector(`${c} [data-dua-vowels-toggle]`)?.textContent ?? "" }), card4);
      const vw = await words();
      await page.evaluate((c) => document.querySelector(`${c} [data-dua-vowels-toggle]`)?.scrollIntoView({ block: "center" }), card4);
      await page.click(`${card4} [data-dua-vowels-toggle]`); const nv = await words();
      await page.click(`${card4} [data-dua-vowels-toggle]`); const bk = await words();
      const vow = (s) => /[ً-ْ]/.test(s);
      check(`[${tag}] Dua cards: With vowels / Without vowels switches the dua's words ("${vw.sw}" / "${nv.sw}")`, vow(vw.w) && !vow(nv.w) && vow(bk.w) && /Without vowels/.test(vw.sw) && /With vowels/.test(nv.sw), JSON.stringify([vw.sw, nv.sw]));
      const fw = await page.evaluate(() => { const e = document.querySelector('[data-dua-card="4"] [data-dua-words]'); return e ? getComputedStyle(e).fontFamily : ""; });
      check(`[${tag}] Dua cards: the dua's words are set in the Qur'anic font`, /qur|uthman|amiri|scheherazade|kfgq|hafs|noto naskh/i.test(fw), fw);
      const d2 = await page.evaluate(() => { const c = document.querySelector('[data-dua-card="2"]'); const hd = c.querySelector("[data-dua-narrated-count]"); return { n: hd.dataset.duaNarratedCount, head: hd.textContent.trim(), refs: c.querySelectorAll(".dua-also [data-dua-ref]").length }; });
      check(`[${tag}] Dua cards: "${d2.head}" lists each source (${d2.refs})`, /Narrated in \d+ places/.test(d2.head) && d2.refs === Number(d2.n), JSON.stringify(d2));
      await page.evaluate(() => document.querySelector('[data-dua-card="2"] .dua-also')?.scrollIntoView({ block: "center" }));
      const first = await page.evaluate(() => document.querySelector('[data-dua-card="2"] .dua-also > .dua-also-refs [data-dua-ref]')?.dataset.duaRef);
      await page.click(`[data-dua-card="2"] .dua-also > .dua-also-refs [data-dua-ref="${first}"]`);
      await page.waitForSelector("[data-openiti-trail-back]", { timeout: 25000 });
      const bt = await page.evaluate(() => document.querySelector("[data-openiti-trail-back]")?.textContent.trim());
      await page.click("[data-openiti-trail-back]");
      await page.waitForSelector('[data-dua-card="2"].hadith-card-focused', { timeout: 20000 }).catch(() => {});
      const back = await page.evaluate(() => { const r = document.querySelector('[data-dua-card="2"]')?.getBoundingClientRect(); return { focused: !!document.querySelector('[data-dua-card="2"].hadith-card-focused'), on: !!r && r.bottom > 0 && r.top < innerHeight }; });
      check(`[${tag}] Dua cards: a source opens its narration with "${bt}", which returns to the same dua`, /^←\s*Back to Dua 2/.test(bt || "") && back.focused && back.on, JSON.stringify({ bt, back }));
      await page.click('[data-dua-mode="chapters"]');
      await page.waitForSelector("[data-dua-book]", { timeout: 15000 });
      check(`[${tag}] Dua cards: "Dua chapters" browses by book`, (await page.locator("[data-dua-book]").count()) === 11, String(await page.locator("[data-dua-book]").count()));
      check(`[${tag}] Dua cards: no sideways scroll, no page error`, (await fitsScreen(page)) && quiet(errors).length === 0, JSON.stringify(quiet(errors)));
      await ctx.close();
    } catch (e) { crash(e); }

    // ### Dua progress, words, notes and bookmarks
    try {
      const { ctx, page, errors } = await hopen(w, h);
      await toHadith(page, "dua");
      await page.waitForSelector('[data-dua-card="1"] [data-dua-status="learning"]', { timeout: 25000 });
      const card = '[data-dua-card="1"]';
      const stages = await page.evaluate((c) => [...document.querySelectorAll(`${c} [data-dua-status]`)].map((b) => b.dataset.duaStatus + ":" + b.textContent.trim()), card);
      check(`[${tag}] Dua progress, words, notes and bookmarks: "My progress on this dua" offers five stages (${stages.join(", ")})`, stages.length === 5, JSON.stringify(stages));
      await page.evaluate((c) => document.querySelector(c).scrollIntoView({ block: "start" }), card);
      await mut(page, `${card} [data-dua-status="learning"]`);
      const k = await wcount(page);
      await page.click(`${card} [data-dua-status="learning"]`, { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(900);
      const es = entryRows(await wfrom(page, k));
      check(`[${tag}] Dua progress, words, notes and bookmarks: tapping a stage records dua:1 once`, es.length === 1 && es[0].key.startsWith("dua:1") && es[0].status === "learning", JSON.stringify(es));
      await page.evaluate((c) => document.querySelector(`${c} [data-dua-word="1"]`)?.scrollIntoView({ block: "center" }), card);
      await page.click(`${card} [data-dua-word="1"]`);
      await page.waitForSelector('[data-dua-word-panel="1"] [data-dua-word-open]', { timeout: 10000 });
      const wp = await page.evaluate(() => { const p = document.querySelector('[data-dua-word-panel="1"]'); return { open: p.querySelector("[data-dua-word-open]")?.textContent.trim(), href: p.querySelector("[data-dua-word-open]")?.getAttribute("href"), text: p.innerText.length, prog: !!p.querySelector("[data-claim-for], [data-word-status], select, button:not([data-dua-word-open])") }; });
      check(`[${tag}] Dua progress, words, notes and bookmarks: tapping a word opens its card with "${wp.open}" and the word's progress`, /Open in the Word card/.test(wp.open || "") && /word=2:131:7/.test(wp.href || "") && wp.text > 20 && wp.prog, JSON.stringify(wp));
      const nb = await page.evaluate(() => ({ note: document.querySelector('[data-dua-note-bookmark="1"] [data-dua-note-link]')?.textContent.trim(), bm: document.querySelector('[data-dua-note-bookmark="1"] [data-dua-bookmark]')?.textContent.trim() }));
      check(`[${tag}] Dua progress, words, notes and bookmarks: the card has 📝 My Notes and 🔖 Bookmark this ("${nb.note}" / "${nb.bm}")`, /My Notes/.test(nb.note || "") && /Bookmark/.test(nb.bm || ""), JSON.stringify(nb));
      const k2 = await wcount(page);
      await page.click('[data-dua-note-bookmark="1"] [data-dua-bookmark]'); await page.waitForTimeout(900);
      const bw = (await wfrom(page, k2)).filter((x) => x.col === "bookmarks").flatMap((x) => (x.data?.saved ?? []).map((b) => b.position));
      check(`[${tag}] Dua progress, words, notes and bookmarks: 🔖 saves dua:1`, bw.includes("dua:1"), JSON.stringify(bw));
      let went = true;
      await Promise.all([page.waitForURL(/quranrevival\.html\?word=2:131:7/, { timeout: 20000 }), page.click('[data-dua-word-panel="1"] [data-dua-word-open]')]).catch(() => { went = false; });
      check(`[${tag}] Dua progress, words, notes and bookmarks: Open in the Word card reaches the Qur'an word 2:131:7`, went, page.url());
      check(`[${tag}] Dua progress, words, notes and bookmarks: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
      await ctx.close();
    } catch (e) { crash(e); }

    // ### ✓ Check this dua
    try {
      const { ctx, page, errors } = await hopen(w, h, CHECK);
      await toHadith(page, "dua");
      const card = '[data-dua-card="2"]';
      await page.waitForSelector(`${card} [data-dua-check-open]`, { timeout: 25000 });
      await mut(page, `${card} [data-dua-check-open]`);
      await page.evaluate((c) => document.querySelector(`${c} [data-dua-check-open]`)?.scrollIntoView({ block: "center" }), card);
      await page.click(`${card} [data-dua-check-open]`, { timeout: 4000 }).catch(() => {});
      await page.waitForSelector('[data-dua-check-panel="2"] [data-dua-check-member]', { timeout: 6000 }).catch(() => {});
      const mem = await page.evaluate(() => document.querySelectorAll('[data-dua-check-panel="2"] [data-dua-check-member]').length);
      check(`[${tag}] ✓ Check this dua: the owner's Dua card opens the review with a Narrations step (${mem} narrations)`, mem === 23, String(mem));
      if (mem) {
        await page.click('[data-dua-check-member] [data-v="cut"]'); await page.click("[data-dua-check-rest-same]");
        await page.click('[data-dua-check-step="2"]');
        await page.waitForSelector("[data-dua-check-word]", { timeout: 10000 });
        const nw = await page.locator("[data-dua-check-word]").count();
        check(`[${tag}] ✓ Check this dua: the Words step lists each word to confirm its Qur'an word (${nw})`, nw > 5, String(nw));
        await page.click("[data-dua-check-rest-ok]"); await page.click('[data-dua-check-step="3"]');
        const k = await wcount(page);
        await page.click("[data-dua-check-save]");
        await page.waitForSelector(`${card} [data-dua-check-status="done"]`, { timeout: 15000 }).catch(() => {});
        const wr = (await wfrom(page, k)).filter((x) => x.col === "ayahCollections");
        check(`[${tag}] ✓ Check this dua: Save stores the check (duaChecks.2) and the card says it was checked`, wr.length === 1 && Object.keys(wr[0].data).includes("duaChecks.2") && /checked by/.test(await page.evaluate((c) => document.querySelector(`${c} [data-dua-check-status]`)?.textContent ?? "", card)), JSON.stringify(wr.map((x) => Object.keys(x.data))));
        await page.click(`${card} [data-dua-check-open]`); await page.waitForSelector("[data-dua-check-back]");
        const bt = await page.evaluate(() => document.querySelector("[data-dua-check-back]")?.textContent.trim());
        await page.click("[data-dua-check-back]"); await page.waitForTimeout(300);
        check(`[${tag}] ✓ Check this dua: "${bt}" returns to the dua`, /Back to Dua/.test(bt || "") && !(await page.$("[data-dua-check-panel]")), String(bt));
      }
      check(`[${tag}] ✓ Check this dua: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
      await ctx.close();
      // a reader (not owner/prime) does not see it
      const r = await hopen(w, h, CHECK + READER);
      await toHadith(r.page, "dua");
      await r.page.waitForSelector(`${card} [data-dua-word="0"]`, { timeout: 25000 });
      await r.page.waitForTimeout(1500);
      check(`[${tag}] ✓ Check this dua: a reader who is not owner/prime is not offered it`, (await r.page.locator("[data-dua-check-open]").count()) === 0);
      await r.ctx.close();
    } catch (e) { crash(e); }
  }
}

// =====================================================================================================================
// ▸ Other study modules   (audit part 90: topic study, routines, the Continue strip; shared MSA pages, so a FAIL is reported)
// =====================================================================================================================
if (want("modules")) {
  console.log("== Other study modules");
  const MODS = [
    { id: "deen", root: "deen_study", page: "deen-study.html", trackable: "studied_deen", name: "Deen Study", done: "Studied" },
    { id: "arabic", root: "arabic_language", page: "arabic-study.html", trackable: "studied_arabic", name: "Arabic", done: "Studied" },
    { id: "ldog", root: "ldog", page: "ldog-study.html", trackable: "practised_ldog", name: "Learn Deen On-the-Go", done: "Practised" },
  ];
  // The stub's own catalogue holds no topic with a resource, so each module gets a root and two topics that have one (the stub's r1).
  const seedMod = (m, extra = "") => `
(function () {
  window.__stubApplyBatches = true;
  const root = "${m.root}", mod = "${m.id}", id = (s) => TENANT_ID + "__" + s;
  DATA.trackables = DATA.trackables.filter((t) => t._id !== id("${m.trackable}"));
  DATA.trackables.push({ _id: id("${m.trackable}"), tenantId: TENANT_ID, subjectId: root, order: 0, status: "active", name: lang("${m.done}"), groupName: lang("Understanding"), guide: { what: lang("What it is"), how: lang("How to do it"), measure: lang("How to measure") }, panels: ["text"] });
  DATA.subjects = DATA.subjects.filter((s) => !(s.moduleIds || []).includes(mod));
  const node = (sid, parent, anc, en, order, leaf) => DATA.subjects.push({ _id: id(sid), tenantId: TENANT_ID, subjectId: sid, parentId: parent, name: lang(en), moduleIds: [mod], ancestorIds: anc, status: "active", order, ...(leaf ? { isTrackable: true, resourceIds: ["r1"] } : {}) });
  node(root, null, [], "${m.name}", 1, false);
  node("leaf_b", root, [root], "Short topic", 1, true);
  node("leaf_c", root, [root], "Second topic", 2, true);
  ${extra}
})();`;
  const gone = (page, sel) => MUTATE === "modules" ? page.evaluate((s) => document.querySelectorAll(s).forEach((e) => e.remove()), sel) : null;
  const wcountM = (page) => page.evaluate(() => (window.__stubWriteData || []).length);
  const wfromM = (page, k) => page.evaluate((k) => (window.__stubWriteData || []).slice(k).map((x) => ({ col: x.col, id: x.id, data: x.data })), k);
  const viaModules = async (page, m) => {
    await settle(page);
    await page.locator("#topNav summary", { hasText: /^Modules$/ }).first().click(); await page.waitForTimeout(150);
    await Promise.all([page.waitForURL(new RegExp(m.page.replace(".", "\\.")), { timeout: 15000 }), page.click(`#navBar a[href^="${m.page}"]`)]);
    await page.waitForSelector("#listContainer .topic-row", { timeout: 25000 });
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await page.waitForTimeout(400);
  };

  for (const [w, h] of VIEWPORTS) {
    const tag = `${w}px`;
    // ### Topic study (Deen Study, Arabic)
    for (const m of MODS.slice(0, 2)) {
      try {
        const { ctx, page, errors } = await open("/app/people.html", { w, h, ctxOpts: { extraSeedJs: seedMod(m) } });
        await viaModules(page, m);
        const T = `[${tag}] Topic study (${m.name})`;
        check(`${T}: Modules ▾ → ${m.name} opens the subject's topics as a list`, (await page.locator("#listContainer .topic-row").count()) >= 2 && /Short topic/.test(await page.locator("#listContainer").innerText()));
        const persons = await page.evaluate(() => [...document.querySelectorAll("#personSelect option")].length);
        check(`${T}: there is a Person to pick`, persons >= 2, String(persons));
        await page.click('.topic-row-leaf[data-id="leaf_b"]'); await page.waitForTimeout(900);
        const det = await page.evaluate(() => ({ h2: document.querySelector("#detailContainer h2")?.childNodes[0]?.textContent.trim(), link: document.querySelector("#detailContainer a")?.getAttribute("href") ?? null }));
        check(`${T}: opening a topic shows its resource`, det.h2 === "Short topic" && det.link === "https://example.org/lesson", JSON.stringify(det));
        await gone(page, "#trackTopicBtn");
        await page.click("#trackTopicBtn", { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(600);
        const title = await page.evaluate(() => document.querySelector("#wayModalMount h3")?.textContent.trim() ?? "");
        check(`${T}: Track my progress opens "Short topic — Studied"`, title === "Short topic — Studied", title);
        const tab = await page.evaluate(() => ({ tabs: [...document.querySelectorAll(".way-tab-btn")].map((b) => b.textContent.trim()), sel: !!document.querySelector(".way-track .way-status-select") }));
        check(`${T}: its Track tab offers the stage choice (Guide and Breakdown tabs beside it)`, tab.sel && tab.tabs[0] === "Track" && tab.tabs.includes("Guide") && tab.tabs.includes("Breakdown"), JSON.stringify(tab));
        let rec = null;
        if (tab.sel) {
          await page.selectOption(".way-status-select", "learning");
          const k = await wcountM(page);
          await page.click(".way-claim-btn"); await page.waitForTimeout(1000);
          rec = (await wfromM(page, k)).find((x) => x.col === "records");
        }
        check(`${T}: choosing a stage and Claim records topic:leaf_b as learning`, !!rec && JSON.stringify(rec.data).includes("topic:leaf_b") && JSON.stringify(rec.data).includes('"learning"'), JSON.stringify(rec)?.slice(0, 200));
        await page.click(".way-close-btn", { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(300);
        await gone(page, "#bookmarkTopicBtn");
        const k2 = await wcountM(page);
        await page.click("#bookmarkTopicBtn", { timeout: 4000 }).catch(() => {});
        await page.click("[data-bm-pop-save]", { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(900);
        const bw = (await wfromM(page, k2)).find((x) => x.col === "bookmarks");
        check(`${T}: Bookmark this saves your place`, !!bw && JSON.stringify(bw.data).includes("leaf_b"), JSON.stringify(bw)?.slice(0, 200));
        check(`${T}: no sideways scroll, no page error`, (await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)) && quiet(errors).length === 0, JSON.stringify(quiet(errors)));
        await ctx.close();
      } catch (e) { crash(e); }
    }

    // ### Routines (Learn Deen On-the-Go)   (leaf_c is seeded as already practised today: the stub never mutates its data, so a fresh log cannot show on the page)
    try {
      const m = MODS[2];
      const LOGGED = `DATA.activity = (DATA.activity || []).filter(function (a) { return a._id !== TENANT_ID + "__p1__" + THIS_WEEK; }).concat([{ _id: TENANT_ID + "__p1__" + THIS_WEEK, tenantId: TENANT_ID, personId: "p1", weekKey: THIS_WEEK, entries: [{ date: TODAY, subjectId: "leaf_c", unitKey: "topic:leaf_c", unitType: "topic", trackableId: "practised_ldog", action: "practised" }] }]);`;
      const { ctx, page, errors } = await open("/app/people.html", { w, h, ctxOpts: { extraSeedJs: seedMod(m, LOGGED) } });
      await viaModules(page, m);
      const T = `[${tag}] Routines (Learn Deen On-the-Go)`;
      const list = await page.evaluate(() => ({ rows: document.querySelectorAll("#listContainer .topic-row-leaf").length, badges: [...document.querySelectorAll("#listContainer .topic-reminder-done")].map((b) => b.textContent.trim()), rem: document.querySelector(".routine-reminder")?.textContent.trim() ?? "" }));
      check(`${T}: a routine logged today shows "Logged today" in the list`, list.badges.length === 1 && list.badges[0] === "Logged today", JSON.stringify(list));
      check(`${T}: the page says how many routines are not logged yet ("${list.rem}")`, list.rows >= 2 && list.rem === (list.rows - 1 === 1 ? "1 routine here not logged today yet." : `${list.rows - 1} routines here not logged today yet.`), JSON.stringify(list));
      await page.click('.topic-row-leaf[data-id="leaf_c"]'); await page.waitForTimeout(900);
      const dc = await page.evaluate(() => document.querySelector("#detailContainer")?.innerText ?? "");
      check(`${T}: the logged routine's page reads "Logged today ✓"`, /Logged today ✓/.test(dc), dc.slice(0, 120));
      await page.click('#breadcrumbContainer .topic-crumb-btn').catch(() => {}); await page.waitForTimeout(300);
      await page.click('.topic-row-leaf[data-id="leaf_b"]'); await page.waitForTimeout(900);
      const d1 = await page.evaluate(() => document.querySelector("#detailContainer")?.innerText ?? "");
      check(`${T}: an unlogged routine says "Not logged today yet."`, /Not logged today yet\./.test(d1), d1.slice(0, 120));
      await gone(page, "#trackTopicBtn");
      await page.click("#trackTopicBtn", { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(700);
      const sh = await page.evaluate(() => ({ title: document.querySelector("#wayModalMount h3")?.textContent.trim(), tabs: [...document.querySelectorAll(".way-tab-btn")].map((b) => b.textContent.trim()) }));
      check(`${T}: Track my progress opens "— Practised" with Track, Guide, Streak and Breakdown tabs`, sh.title === "Short topic — Practised" && JSON.stringify(sh.tabs) === JSON.stringify(["Track", "Guide", "Streak", "Breakdown"]), JSON.stringify(sh));
      let lw = [];
      if (sh.tabs.length) {
        await page.click('.way-tab-btn[data-tab="Streak"]'); await page.waitForTimeout(200);
        const k = await wcountM(page);
        await page.click(".way-log-btn"); await page.waitForTimeout(1000);
        lw = (await wfromM(page, k)).filter((x) => x.col === "activity");
      }
      check(`${T}: pressing Log today on the Streak tab writes a "practised" entry for the routine`, lw.length >= 1 && JSON.stringify(lw).includes("leaf_b") && JSON.stringify(lw).includes("practised"), JSON.stringify(lw).slice(0, 200));
      check(`${T}: no sideways scroll, no page error`, (await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)) && quiet(errors).length === 0, JSON.stringify(quiet(errors)));
      await ctx.close();
    } catch (e) { crash(e); }

    // ### Continue strip
    try {
      const m = MODS[0];
      const RES = `DATA.bookmarks = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", folders: [], saved: [], resume: { "deen::none::leaf_b": { position: null, settings: null, updatedAt: "2026-10-10T00:00:00.000Z" }, "general::none::g": { position: null, settings: null, updatedAt: "2026-10-12T00:00:00.000Z" } } }];`;
      const { ctx, page, errors } = await open(`/app/${m.page}`, { w, h, ctxOpts: { extraSeedJs: seedMod(m, RES) } });
      await page.waitForSelector("#listContainer .topic-row", { timeout: 25000 });
      await page.waitForTimeout(1200);
      await gone(page, ".continue-chip");
      const strip = await page.evaluate(() => ({ chips: [...document.querySelectorAll("#continueStrip .continue-chip")].map((a) => a.textContent.replace(/\s+/g, " ").trim()) }));
      const T = `[${tag}] Continue strip`;
      check(`${T}: a "Continue: Deen Study — Short topic" line sits at the top of the study page`, strip.chips.length === 1 && strip.chips[0] === "Continue: Deen Study — Short topic", JSON.stringify(strip));
      check(`${T}: a hidden module's newer place (General Study) is not offered`, !strip.chips.some((c) => /General/.test(c)), JSON.stringify(strip));
      let there = null;
      if (strip.chips.length) {
        await Promise.all([page.waitForURL(/resume=leaf_b/, { timeout: 15000 }), page.click("#continueStrip .continue-chip", { timeout: 4000 })]).catch(() => {});
        await page.waitForSelector("#detailContainer .topic-detail h2", { timeout: 20000 }).catch(() => {});
        there = await page.evaluate(() => document.querySelector("#detailContainer h2")?.childNodes[0]?.textContent.trim());
      }
      check(`${T}: tapping it opens the topic you last were in`, there === "Short topic", String(there));
      check(`${T}: no page error`, quiet(errors).length === 0, JSON.stringify(quiet(errors)));
      await ctx.close();
    } catch (e) { crash(e); }

    // ### Hidden modules (the section's opening note)
    try {
      const { ctx, page } = await open("/app/general-study.html", { w, h });
      await page.waitForTimeout(2500);
      const g = await page.evaluate(() => ({ h1: document.querySelector("h1")?.textContent.trim(), url: location.pathname.split("/").pop() }));
      check(`[${tag}] Hidden modules: an old link to General Study still opens its page`, g.url === "general-study.html" && /General/i.test(g.h1 || ""), JSON.stringify(g));
      await ctx.close();
    } catch (e) { crash(e); }
  }
  SKIP("Topic study: a second account's progress on the same topic", "needs a second signed-in account");
}

async function summ_bn(page) {
  await page.evaluate(() => { document.querySelector(".nav-cat-home").open = true; });
  await page.waitForTimeout(150);
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped`);
process.exit(fail ? 1 : 0);
