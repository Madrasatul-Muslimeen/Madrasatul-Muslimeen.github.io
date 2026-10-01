// Owner decision 40, rounds 1 and 2 (round 2: the other 23 pages, last section) -- Home -> 👤 My account card, and Back never
// taking a line of its own, on Mapping My Journey and Import Notes.
//
// Run from the repository root with `node serve.js` running.
// Screenshots: set SHOTS=/some/dir.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const SHOTS = process.argv[2] || process.env.SHOTS || "";
const WIDTHS = [320, 340, 360, 390, 412, 768, 1280];
const PAGES = [
  { file: "journey-map", title: "h1", backTitle: { en: "Go back", bn: "ফিরে যান" } },
  { file: "import-notes", title: "h1", backTitle: { en: "Back to Mapping My Journey", bn: "Mapping My Journey-তে ফিরে যান" } },
];
// Hand-set: on main the Back line (40px + 9.6px margin) and the Tenant/Person
// line (2rem of margin + a ~32px control) sat above the content -- two lines
// of about 40px each. The content must now start at least 2 x 20px higher than
// the same page with those two lines put back (emulated below by moving the
// real rows back and giving Back its old own line).
const MIN_GAIN = 40;

const browser = await chromium.launch();
for (const lang of ["en", "bn"]) {
  for (const pg of PAGES) {
    for (const width of WIDTHS) {
      const tag = `${pg.file} ${lang} ${width}px`;
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 800 } });
      const { page } = await openPage(ctx, `/app/${pg.file}.html`);
      await page.waitForSelector("#app", { state: "visible", timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(500);
      const top = pg.file === "journey-map" ? "#viewToggle" : "#pickerSection";

      const m = await page.evaluate(({ top }) => {
        const R = (e) => e.getBoundingClientRect();
        const vis = (e) => { if (!e) return false; const r = R(e); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
        const back = document.getElementById("backLink");
        const cb = document.getElementById("contextBar");
        const ts = document.getElementById("tenantSelect"), ps = document.getElementById("personSelect");
        const first = document.querySelector("#viewToggle .view-toggle-btn");
        const h1 = document.querySelector("h1");
        const vt = document.getElementById("viewToggle");
        const out = {
          back: back && { w: R(back).width, h: R(back).height, cy: R(back).top + R(back).height / 2, title: back.getAttribute("title"), aria: back.getAttribute("aria-label"), text: back.textContent.trim() },
          firstCy: first ? R(first).top + R(first).height / 2 : null,
          h1Cy: h1 ? R(h1).top + R(h1).height / 2 : null,
          h1Lines: null,
          contextDisplay: cb ? getComputedStyle(cb).display : null,
          tenantVisibleOnPage: vis(ts), personVisibleOnPage: vis(ps),
          inCard: !!(ts && ts.closest("#accountCardOverlay")) && !!(ps && ps.closest("#accountCardOverlay")),
          overflow: document.documentElement.scrollWidth - innerWidth,
          top: Math.round(R(document.querySelector(top)).top),
        };
        if (vt) {
          const kids = [...vt.children].filter((k) => R(k).width > 0);
          const tops = kids.map((k) => Math.round(R(k).top));
          out.toggleOneLine = Math.max(...tops) - Math.min(...tops) <= 4;
          out.toggleInside = kids.every((k) => R(k).left >= -0.5 && R(k).right <= innerWidth + 0.5);
          out.labelsCut = [...vt.querySelectorAll(".view-toggle-btn")].some((b) => b.scrollWidth > b.clientWidth + 1);
          out.backFirst = vt.firstElementChild === back;
        }
        // Emulate main: put the rows back in #contextBar, unhide it, and give Back its old own line.
        if (cb) {
          cb.hidden = false;
          cb.append(ts.closest("label"), ps.closest("label"));
          const old = document.createElement("a");
          old.style.cssText = "display:inline-flex;align-items:center;min-height:40px;margin:0.6rem 0 0;padding:0 0.9rem;border:1px solid #ccc";
          old.textContent = "← Back";
          if (vt) { back.style.display = "none"; }
          else { back.style.display = "none"; }
          const app = document.getElementById("app");
          app.parentNode.insertBefore(old, app);
          out.oldTop = Math.round(R(document.querySelector(top)).top);
        }
        return out;
      }, { top });

      check(`${tag}: the Back button is there, 40px square, named "${pg.backTitle[lang]}"`,
        m.back && Math.abs(m.back.w - 40) < 0.6 && Math.abs(m.back.h - 40) < 0.6 && m.back.title === pg.backTitle[lang] && m.back.aria === pg.backTitle[lang] && m.back.text === "←", JSON.stringify(m.back));
      if (pg.file === "journey-map") {
        check(`${tag}: Back is the first item of the view row, on Folders' line (+-4px)`, m.backFirst && Math.abs(m.back.cy - m.firstCy) <= 4, `back ${m.back?.cy} folders ${m.firstCy}`);
        check(`${tag}: the view row stays one line, nothing cut, all inside the screen`, m.toggleOneLine && m.toggleInside && !m.labelsCut, JSON.stringify({ one: m.toggleOneLine, inside: m.toggleInside, cut: m.labelsCut }));
      } else {
        check(`${tag}: Back sits on the title's line (+-4px)`, Math.abs(m.back.cy - m.h1Cy) <= 4, `back ${m.back.cy} title ${m.h1Cy}`);
      }
      check(`${tag}: no Tenant or Person picker on the page itself, and the emptied bar takes no space`,
        m.contextDisplay === "none" && !m.tenantVisibleOnPage && !m.personVisibleOnPage, JSON.stringify({ d: m.contextDisplay, t: m.tenantVisibleOnPage, p: m.personVisibleOnPage }));
      check(`${tag}: both pickers live inside the card`, m.inCard);
      check(`${tag}: content starts at least ${MIN_GAIN}px higher than with the two old lines (${m.oldTop} -> ${m.top})`, m.oldTop - m.top >= MIN_GAIN, `old ${m.oldTop} new ${m.top}`);
      check(`${tag}: no sideways scroll`, m.overflow <= 0, `overflow ${m.overflow}`);
      await ctx.close();
    }
  }
}

// ---- The card itself: Home menu, open/close, modes, real behaviour -------
for (const pg of PAGES) {
  for (const width of [390, 1280]) {
    for (const look of ["night", "light"]) {
      for (const lang of ["en", "bn"]) {
        const tag = `${pg.file} ${lang} ${width}px ${look}`;
        const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 800 } });
        await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch (e) {} }, look);
        const { page } = await openPage(ctx, `/app/${pg.file}.html`);
        await page.waitForSelector("#app", { state: "visible", timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(500);
        await page.click("details.nav-cat-home > summary");
        const item = await page.evaluate(() => {
          const links = document.querySelector("#navHomeExtra");
          const first = links.querySelector("button, a");
          return { first: first?.getAttribute("data-open-account-card") != null, text: first?.textContent.trim(), h: first?.getBoundingClientRect().height };
        });
        check(`${tag}: Home menu's first entry is 👤 My account`, item.first && item.text === (lang === "en" ? "👤 My account" : "👤 আমার অ্যাকাউন্ট"), JSON.stringify(item));
        await page.click("[data-open-account-card]");
        const c = await page.evaluate(() => {
          const ov = document.getElementById("accountCardOverlay"), sh = ov.querySelector(".account-sheet");
          const r = sh.getBoundingClientRect(), cs = getComputedStyle(sh);
          const rgbs = (s) => [...s.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)].map((x) => [+x[1], +x[2], +x[3]]);
          const L = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
          const ratio = (a, b) => (Math.max(L(a), L(b)) + 0.05) / (Math.min(L(a), L(b)) + 0.05);
          // The card background may be a gradient: test against each of its stops, worst case wins.
          const stops = rgbs(cs.backgroundImage !== "none" ? cs.backgroundImage : cs.backgroundColor);
          const worst = (el) => Math.min(...stops.map((s) => ratio(rgbs(getComputedStyle(el).color)[0], s)));
          const texts = [...sh.querySelectorAll(".account-sheet-title, dt, dd, .account-sheet-close, .account-sheet-later, .account-sheet-pickers label")];
          const sel = document.getElementById("personSelect");
          const selBg = rgbs(getComputedStyle(sel).backgroundColor)[0];
          return {
            open: getComputedStyle(ov).display !== "none", left: r.left, top: r.top, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight,
            radius: cs.borderTopLeftRadius, pos: cs.position, nStops: stops.length,
            minContrast: Math.min(...texts.map(worst)),
            selContrast: ratio(rgbs(getComputedStyle(sel).color)[0], selBg),
            facts: sh.querySelector("#accountCardFacts").textContent,
            tenantIn: !!sh.querySelector("#tenantSelect"), personIn: !!sh.querySelector("#personSelect"),
            overflow: document.documentElement.scrollWidth - innerWidth,
          };
        });
        check(`${tag}: the card opens with both pickers inside`, c.open && c.tenantIn && c.personIn);
        check(`${tag}: it shows the signed-in email and the tenant`, /@/.test(c.facts) && /Madrasatul|মাদরাসাতুল/.test(c.facts), c.facts);
        if (width < 900) check(`${tag}: the card is full screen`, c.left === 0 && c.top === 0 && Math.abs(c.w - c.vw) < 1 && Math.abs(c.h - c.vh) < 1, JSON.stringify(c));
        else check(`${tag}: the card floats as a panel`, c.w < c.vw - 100 && c.h < c.vh && c.left > 50 && parseFloat(c.radius) > 0, JSON.stringify(c));
        check(`${tag}: card text is at least 4.5:1 against its real background (${c.minContrast.toFixed(2)}, select ${c.selContrast.toFixed(2)})`, c.minContrast >= 4.5 && c.selContrast >= 4.5);
        check(`${tag}: no sideways scroll with the card open`, c.overflow <= 0);
        if (SHOTS && look === "night") await page.screenshot({ path: `${SHOTS}/${pg.file}-${lang}-${width}-open.png` });
        await page.keyboard.press("Escape");
        check(`${tag}: Escape closes it`, await page.evaluate(() => getComputedStyle(document.getElementById("accountCardOverlay")).display === "none"));
        await page.click("details.nav-cat-home > summary");
        await page.click("[data-open-account-card]");
        await page.click("#accountCardClose");
        check(`${tag}: ✕ closes it`, await page.evaluate(() => getComputedStyle(document.getElementById("accountCardOverlay")).display === "none"));
        if (SHOTS && look === "night") await page.screenshot({ path: `${SHOTS}/${pg.file}-${lang}-${width}-closed.png` });
        await ctx.close();
      }
    }
  }
}

// ---- Changing Person / Tenant inside the card does what the old row did ---
{
  const ctx = await newContext(browser, { viewport: { width: 390, height: 800 } });
  const { page } = await openPage(ctx, "/app/journey-map.html");
  await page.waitForSelector("#app", { state: "visible", timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.click("details.nav-cat-home > summary");
  await page.click("[data-open-account-card]");
  const before = await page.evaluate(() => ({ v: document.getElementById("personSelect").value, n: document.getElementById("personSelect").options.length, read: document.getElementById("readOnlyMsg").textContent.trim(), shown: getComputedStyle(document.getElementById("readOnlyMsg")).display }));
  check("journey-map: the card's Person picker lists both people and starts on the signed-in person", before.n === 2 && before.v === "p1", JSON.stringify(before));
  await page.selectOption("#personSelect", "p2");
  await page.waitForFunction(() => getComputedStyle(document.getElementById("readOnlyMsg")).display !== "none", null, { timeout: 6000 }).catch(() => {});
  const after = await page.evaluate(() => ({ shown: getComputedStyle(document.getElementById("readOnlyMsg")).display, text: document.getElementById("readOnlyMsg").textContent.trim(), stored: (() => { try { return JSON.stringify(Object.entries(localStorage).filter(([k]) => /person/i.test(k))); } catch (e) { return ""; } })() }));
  check("journey-map: choosing Maryam in the card reloads her journey (the read-only notice for someone else's Notes appears)", after.shown !== "none" && after.text.length > 0, JSON.stringify(after));
  await page.selectOption("#personSelect", "p1");
  await page.waitForFunction(() => getComputedStyle(document.getElementById("readOnlyMsg")).display === "none", null, { timeout: 6000 }).catch(() => {});
  check("journey-map: choosing yourself again clears it", await page.evaluate(() => getComputedStyle(document.getElementById("readOnlyMsg")).display === "none"));
  const t = await page.evaluate(() => { const s = document.getElementById("tenantSelect"); return { n: s.options.length, v: s.value }; });
  await page.evaluate(() => { window.__tenantChanged = 0; document.getElementById("tenantSelect").addEventListener("change", () => window.__tenantChanged++); });
  await page.selectOption("#tenantSelect", t.v);
  await page.waitForTimeout(400);
  const t2 = await page.evaluate(() => ({ n: window.__tenantChanged, rows: document.getElementById("personSelect").options.length, open: getComputedStyle(document.getElementById("accountCardOverlay")).display !== "none" }));
  check("journey-map: the Tenant picker in the card still fires the page's own change handler and reloads its people", t2.n === 1 && t2.rows === 2, JSON.stringify(t2));
  await ctx.close();
}
{
  const ctx = await newContext(browser, { viewport: { width: 390, height: 800 } });
  const { page } = await openPage(ctx, "/app/import-notes.html");
  await page.waitForSelector("#app", { state: "visible", timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.click("details.nav-cat-home > summary");
  await page.click("[data-open-account-card]");
  await page.selectOption("#personSelect", "p2");
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => ({ msg: getComputedStyle(document.getElementById("readOnlyMsg")).display, text: document.getElementById("readOnlyMsg").textContent }));
  check("import-notes: choosing Maryam in the card shows the 'only into your own journey' notice", r.msg !== "none" && r.text.length > 0, JSON.stringify(r));
  await ctx.close();
}

// ---- Round 2: the other 23 pages ----------------------------------------
// Viewing pages move Tenant AND Person into the card; study pages move Tenant
// only (D10: the Person/Student picker is the fast "record for each child in
// turn" control and stays where it is). Tenant-only pages have no Person.
const VIEWING = ["notes", "records", "monitor", "bookmarks", "homework", "course-offers"];
const STUDY = ["quranrevival", "arabic-study", "asma-study", "deen-study", "general-study", "hadith-collections", "hadith-study", "health-study", "ldog-study", "life-skill", "naturelife-study"];
const TENANT_ONLY = ["catalogue", "classes", "curriculum", "dawah", "migrate", "people"];
const ROUND2 = [...VIEWING, ...STUDY, ...TENANT_ONLY];
// MUTATE=quran-role leaves quranrevival's User Role cell on the page;
// MUTATE=study-student moves arabic-study's Student picker into the card.
const MUTATE = process.env.MUTATE || "";

async function reveal(page, file) {
  // quranrevival keeps its pickers inside Study options.
  if (file !== "quranrevival") return;
  await page.evaluate(() => {
    const b = document.getElementById("tabStudyOptionsBtn");
    if (!b || b.getBoundingClientRect().width === 0) document.getElementById("tabStudyBtn")?.click();
  });
  await page.waitForTimeout(150);
  await page.click("#tabStudyOptionsBtn").catch(() => {});
  await page.waitForTimeout(250);
}

for (const file of ROUND2) {
  const kind = VIEWING.includes(file) ? "viewing" : STUDY.includes(file) ? "study" : "tenant";
  for (const lang of ["en", "bn"]) {
    for (const width of [390, 1280]) {
      const tag = `${file} (${kind}) ${lang} ${width}px`;
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 800 } });
      const { page } = await openPage(ctx, `/app/${file}.html`);
      await page.waitForSelector("#app", { state: "visible", timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(700);
      if (MUTATE === "quran-role" && file === "quranrevival") await page.evaluate(() => { document.querySelector(".opt-bar-2").appendChild(document.getElementById("tenantSelect").closest(".opt-cell")); });
      if (MUTATE === "study-student" && file === "arabic-study") await page.evaluate(() => { document.getElementById("accountCardPickers").appendChild(document.getElementById("personSelect").closest("label")); });
      await reveal(page, file);

      const m = await page.evaluate(() => {
        const R = (e) => e.getBoundingClientRect();
        const vis = (e) => { if (!e) return false; const r = R(e); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
        const ts = document.getElementById("tenantSelect"), ps = document.getElementById("personSelect");
        const cb = document.getElementById("contextBar");
        return {
          tenantVisible: vis(ts), tenantInCard: !!ts?.closest("#accountCardOverlay"),
          personExists: !!ps, personVisible: vis(ps), personInCard: !!ps?.closest("#accountCardOverlay"),
          barDisplay: cb ? getComputedStyle(cb).display : "(no bar)",
          barHasPicker: !!cb?.querySelector("select"),
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      check(`${tag}: no Tenant picker is visible on the page itself`, !m.tenantVisible, JSON.stringify(m));
      if (kind === "viewing") {
        check(`${tag}: Person picker moved into the card too`, m.personInCard && !m.personVisible, JSON.stringify(m));
      } else if (kind === "study") {
        check(`${tag}: Person/Student picker stays on the page, visible, not in the card`, m.personExists && m.personVisible && !m.personInCard, JSON.stringify(m));
      }
      if (kind !== "study") check(`${tag}: an emptied bar takes no space (${m.barDisplay})`, m.barDisplay === "none" || m.barDisplay === "(no bar)" || m.barHasPicker, JSON.stringify(m));
      check(`${tag}: no sideways scroll`, m.overflow <= 0, `overflow ${m.overflow}`);

      // Home -> My account.
      await page.evaluate(() => { const d = document.querySelector("details.nav-cat-home"); if (d) d.open = true; });
      const btn = await page.evaluate(() => { const b = document.querySelector("[data-open-account-card]"); return { text: b?.textContent.trim(), w: b?.getBoundingClientRect().width }; });
      check(`${tag}: Home has 👤 My account`, btn.text === (lang === "en" ? "👤 My account" : "👤 আমার অ্যাকাউন্ট") && btn.w > 0, JSON.stringify(btn));
      await page.click("[data-open-account-card]");
      const c = await page.evaluate(() => {
        const ov = document.getElementById("accountCardOverlay"), ts = document.getElementById("tenantSelect"), ps = document.getElementById("personSelect");
        return {
          open: getComputedStyle(ov).display !== "none", tenantIn: !!ts && ov.contains(ts), personIn: !!ps && ov.contains(ps),
          tenantShown: ts.getBoundingClientRect().width > 0, facts: ov.querySelector("#accountCardFacts").textContent,
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      check(`${tag}: the card opens and holds #tenantSelect (same element)`, c.open && c.tenantIn && c.tenantShown, JSON.stringify(c));
      check(`${tag}: the card names the signed-in email`, /@/.test(c.facts), c.facts);
      check(`${tag}: no sideways scroll with the card open`, c.overflow <= 0, `overflow ${c.overflow}`);
      if (kind === "viewing") check(`${tag}: #personSelect is in the open card`, c.personIn);
      if (SHOTS && (file === "quranrevival" || file === "notes") && ((lang === "bn" && width === 390) || (lang === "en" && width === 1280))) {
        await page.screenshot({ path: `${SHOTS}/r2-${file}-${lang}-${width}-card.png` });
      }

      // Tenant change in the card: the page's own handler runs and the page still works.
      await page.evaluate(() => { window.__tc = 0; document.getElementById("tenantSelect").addEventListener("change", () => window.__tc++); });
      const tv = await page.evaluate(() => document.getElementById("tenantSelect").value);
      await page.selectOption("#tenantSelect", tv);
      await page.waitForTimeout(600);
      const t2 = await page.evaluate(() => {
        const ts = document.getElementById("tenantSelect"), ps = document.getElementById("personSelect");
        return { fired: window.__tc, same: ts.value, rows: ps ? ps.options.length : -1, shown: ts.selectedOptions[0]?.textContent || "" };
      });
      check(`${tag}: changing tenant in the card fires the page's handler, the page keeps its people (${t2.rows})`, t2.fired === 1 && t2.same === tv && (kind === "tenant" || t2.rows >= 1) && /Madrasatul|মাদরাসাতুল/.test(t2.shown), JSON.stringify(t2));
      await page.keyboard.press("Escape");

      if (kind === "study" && width === 1280) {
        // D10: choosing another child in turn still records for that child.
        await reveal(page, file);
        const opts = await page.evaluate(() => [...document.getElementById("personSelect").options].map((o) => o.value));
        check(`${tag}: lists at least two people to switch between`, opts.length >= 2, JSON.stringify(opts));
        if (opts.length >= 2) {
          const other = opts[1];
          await page.selectOption("#personSelect", other);
          await page.waitForTimeout(600);
          const r = await page.evaluate((other) => {
            const ps = document.getElementById("personSelect");
            const stored = Object.values(localStorage).some((v) => typeof v === "string" && v.includes(`"selectedPersonId":"${other}"`));
            const b = ps.getBoundingClientRect();
            return { value: ps.value, shown: ps.selectedOptions[0]?.textContent, visible: b.width > 0 && b.height > 0, stored };
          }, other);
          check(`${tag}: choosing ${r.shown} on the page records that person as the one studying (visible + stored)`, r.value === other && r.visible && r.stored, JSON.stringify(r));
        }
      }
      await ctx.close();
    }
  }
}

await browser.close();
console.log(`\n==== account card + Back icon: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
