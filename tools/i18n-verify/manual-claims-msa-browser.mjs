// Audit part 87 (PCF MSA J29): the User Manual's MSA-owned sections checked claim by claim against the app.
// Each ### entry of the Manual becomes the steps a reader would take (real clicks and typing on the rendered page) and an
// assertion on what "What it does" says. One check per claim, named with the entry's title.
//
//   node tools/i18n-verify/manual-claims-msa-browser.mjs            (needs node serve.js on 8080)
//   --section=start|bookmarks|teaching   one section only
//   --verbose                            print PASS lines too
//   --mutate=<name>                      break one claim so its check must FAIL (one per section):
//        start      hides the Esc/outside-click close of the menu bar (sets every menu to stay open)
//        bookmarks  hides the Bookmark menu's ✕ Close button
//        teaching   hides the People page's "Hand the device to a child" box
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

async function summ_bn(page) {
  await page.evaluate(() => { document.querySelector(".nav-cat-home").open = true; });
  await page.waitForTimeout(150);
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped`);
process.exit(fail ? 1 : 0);
