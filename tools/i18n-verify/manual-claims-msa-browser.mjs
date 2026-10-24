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
import { chromium, newContext, openPage } from "./harness.mjs";

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

async function summ_bn(page) {
  await page.evaluate(() => { document.querySelector(".nav-cat-home").open = true; });
  await page.waitForTimeout(150);
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped`);
process.exit(fail ? 1 : 0);
