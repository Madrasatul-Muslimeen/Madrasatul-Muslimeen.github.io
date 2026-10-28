// Audit part 88 (PCF MSA J29): keyboard, focus ring and Esc on the 23 shared pages, at 1440x900 and 390x844, in English and (audit part 117) Bangla; --no-bn skips the Bangla pass.
//
// For each page the suite drives the REAL keyboard (page.keyboard.press) and checks:
//   tab    - Tab reaches every visible, enabled button / a[href] / input / select / textarea / [tabindex=0] (cap 150 presses)
//   trap   - focus never sits on a hidden or zero-size element, never falls to <body> while controls remain unreached,
//            and Shift+Tab walks back the way Tab came
//   ring   - each focused control shows a ring (outline or box-shadow differs from its unfocused style) with >= 3:1 contrast
//            against the background behind it
//   esc    - every disclosure the page opens from a control (<summary>, aria-haspopup, aria-expanded) opens with Enter,
//            closes on Esc, and focus is back on the opener
//   role   - a role=button that is not a real <button> activates on Enter and on Space
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/shared-pages-keyboard-audit-browser.mjs
//   --page=<file>      one page only        --list   print every finding        --verbose  print passes
//   --mutate=outline   outline:none!important and box-shadow:none on everything  (ring must fail)
//   --mutate=tabindex  tabindex=-1 on the first visible button                   (tab must fail)
//   --mutate=trap      hide-by-zero-size the control that Tab lands on third      (trap must fail)
//   --mutate=esc       stop every Escape keydown in the capture phase             (esc must fail)
//   --mutate=role      add a role=button <div> with a click handler only on Enter-less activation (role must fail)
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const ONLY = arg("page"), MUTATE = arg("mutate"), LIST = process.argv.includes("--list"), NO_BN = process.argv.includes("--no-bn");

// Copied from unchecked-pages-screen-audit-browser.mjs (not edited there).
const PAGES = [
  ["Classes", "classes.html"], ["Course offers", "course-offers.html"], ["Curriculum", "curriculum.html"],
  ["Backup", "backup.html"], ["Import notes", "import-notes.html"], ["Dawah", "dawah.html"],
  ["Onboarding", "onboarding.html"], ["Accept invite", "accept-invite.html?token=not-a-real-link"],
  ["Monitor", "monitor.html"], ["Homework", "homework.html"], ["People", "people.html"], ["Records", "records.html"],
  ["Catalogue", "catalogue.html"], ["About", "about.html"], ["Bookmarks", "bookmarks.html"],
  ["Hadith collections", "hadith-collections.html"],
  ["Landing", "index.html"], ["Notes", "notes.html"], ["Journey map", "journey-map.html"], ["Deen study", "deen-study.html"],
  ["Arabic study", "arabic-study.html"], ["Self-check", "admin-self-check.html"], ["Taglines", "taglines.html"],
];
const REAL_SEED = `
DATA.tenants[0].name = lang("Madrasatul Muslimeen (Owner, Prime)", "মাদরাসাতুল মুসলিমীন (মালিক, প্রাইম)");
DATA.tenantPeople[0].name = lang("Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi", "মুহাম্মাদ আবদুর রহমান ইবনে আবদুল্লাহ আল-হাশিমী");
DATA.tenantPeople[1].name = lang("Maryam bint Abdullah Al-Hashimi", "মুহাম্মাদ আবদুর রহমান ইবনে আবদুল্লাহ আল-হাশিমী");
DATA.trackables[0].name = lang("Reading (with Tajweed)");
DATA.classes[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
DATA.courseOffers[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
DATA.bookmarks[0].saved[0].name = "Ayat al-Kursi and the last two āyāt of Al-Baqarah";
`;
const VIEWPORTS = [[1440, 900], [390, 844]];
const TAB_CAP = 150;

// ---- in-page helpers, installed once per page as window.__kb ----
const INSTALL = () => {
  const vis = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e.hidden || e.inert) return false;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      const d = e.parentElement?.closest("details");
      if (d && !d.open && e.parentElement === d && e.tagName !== "SUMMARY") return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const label = (el) => ((el.getAttribute("aria-label") || el.textContent || el.value || el.name || "") + "").replace(/\s+/g, " ").trim().slice(0, 40);
  const name = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} "${label(el)}"`;
  const SEL = "button, a[href], input, select, textarea, [tabindex='0']";
  const targets = () => [...document.querySelectorAll(SEL)].filter((el) =>
    !el.disabled && el.type !== "hidden" && !(el.tagName === "A" && el.getAttribute("tabindex") === "-1") && vis(el));
  let n = 0;
  const idOf = (el) => { if (!el.dataset.kbId) el.dataset.kbId = "k" + (++n); return el.dataset.kbId; };
  const rgb = (s) => { const m = (s || "").match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  // An outline is drawn OUTSIDE the box (offset >= 0), so the background behind it is the parent's; a negative offset draws inside.
  const bgBehind = (el) => {
    const layers = [];
    for (let e = parseFloat(getComputedStyle(el).outlineOffset) < 0 ? el : el.parentElement; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } }
    let base = { r: 255, g: 255, b: 255 };
    for (const c of layers.reverse()) base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) };
    return base;
  };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // The ring the browser draws right now (outline, else box-shadow), or null.
  const ring = (el) => {
    const cs = getComputedStyle(el);
    const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 ? { kind: "outline", auto: cs.outlineStyle === "auto", color: cs.outlineColor, sig: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} ${cs.outlineOffset}` } : null;
    const bs = cs.boxShadow && cs.boxShadow !== "none" ? { kind: "shadow", color: (cs.boxShadow.match(/rgba?\([^)]+\)/) || [])[0], sig: cs.boxShadow } : null;
    return { outline, shadow: bs };
  };
  window.__kb = { vis, name, targets, idOf, ring, rgb, bgBehind, contrast, label };
};

const SNAP = () => {
  const k = window.__kb, a = document.activeElement;
  if (!a || a === document.body || a === document.documentElement) return { body: true };
  const r = a.getBoundingClientRect();
  return { id: k.idOf(a), name: k.name(a), zero: r.width <= 0 || r.height <= 0, hidden: !k.vis(a) && r.width > 0 && r.height > 0,
    radioGroup: a.type === "radio" && a.name ? a.name : null, ring: k.ring(a), fvisible: a.matches(":focus-visible") };
};

const hex = (c) => c;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const quiet = (errors) => errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
const rows = [];

for (const lang of NO_BN ? ["en"] : ["en", "bn"])
for (const [name, path] of PAGES) {
  if (ONLY && !path.startsWith(ONLY)) continue;
  console.log(`\n== ${name} (${path})${lang === "bn" ? " [Bangla]" : ""} ==`);
  for (const [w, h] of VIEWPORTS) {
    const tag = `${name} / ${w}${lang === "bn" ? " / bn" : ""}`;
    const ctx = await newContext(browser, { banner: false, viewport: { width: w, height: h }, extraSeedJs: REAL_SEED, appLang: lang === "bn" ? "bn" : null });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const sep = path.includes("?") ? "&" : "?";
    const { page: P, errors } = await openPage(ctx, "/app/" + path + sep + (path.startsWith("hadith-collections") ? "back=1" : "navBack=1"));
    await P.waitForTimeout(1000);
    await P.evaluate(INSTALL);
    // Positive control: a Bangla pass over a page that is still in English would pass vacuously.
    if (lang === "bn") check(`${tag} / page really rendered in Bangla`, await P.evaluate(() => /[ঀ-৿]/.test(document.body.innerText)), "no Bengali text on the page");
    if (MUTATE === "outline") await P.addStyleTag({ content: "*,*:focus,*:focus-visible{outline:none!important;box-shadow:none!important}" });
    if (MUTATE === "esc") await P.evaluate(() => window.addEventListener("keydown", (e) => { if (e.key === "Escape") e.stopImmediatePropagation(); }, true));
    if (MUTATE === "tabindex") await P.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => window.__kb.vis(x) && !x.disabled); if (b) b.tabIndex = -1; });
    if (MUTATE === "role") await P.evaluate(() => {
      const d = document.createElement("div"); d.setAttribute("role", "button"); d.tabIndex = 0; d.id = "probeRole"; d.textContent = "probe"; d.style.cssText = "padding:12px;display:inline-block";
      d.addEventListener("click", () => { d.dataset.hit = (+d.dataset.hit || 0) + 1; }); document.body.appendChild(d); // no key handler: Enter/Space do nothing
    });
    const targets = await P.evaluate(() => window.__kb.targets().map((el) => ({ id: window.__kb.idOf(el), name: window.__kb.name(el), radio: el.type === "radio" && el.name ? el.name : null })));
    if (MUTATE === "trap") await P.evaluate(() => { /* applied during the walk, below */ });

    // ---- Tab walk ----
    await P.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
    const seq = [], seen = new Set(), snaps = new Map(), problems = { zero: [], body: false };
    let pressed = 0, wrapped = false;
    const reachedGroups = new Set();
    const unreachedCount = () => targets.filter((t) => !seen.has(t.id) && !(t.radio && reachedGroups.has(t.radio))).length;
    for (; pressed < TAB_CAP; pressed++) {
      await P.keyboard.press("Tab");
      if (MUTATE === "trap" && pressed === 2) await P.evaluate(() => { const a = document.activeElement; if (a && a !== document.body) a.style.cssText += ";width:0!important;height:0!important;padding:0!important;border:0!important;min-width:0!important;min-height:0!important;overflow:hidden"; });
      const s = await P.evaluate(SNAP);
      if (s.body) { if (unreachedCount() > 0) problems.body = true; break; }
      if (s.zero || s.hidden) problems.zero.push(s.name);
      if (s.id === seq[seq.length - 1]) continue; // one control with several inner stops (a date input's day / month / year)
      if (seen.has(s.id)) { wrapped = true; break; }
      seen.add(s.id); seq.push(s.id); snaps.set(s.id, s);
      if (s.radioGroup) reachedGroups.add(s.radioGroup);
      if (unreachedCount() === 0 && seq.length >= targets.length) break;
    }
    const never = targets.filter((t) => !seen.has(t.id) && !(t.radio && reachedGroups.has(t.radio)));
    if (LIST) console.log(`   ${tag}: ${targets.length} targets, ${seq.length} focus stops, ${pressed} presses`);

    // ---- Shift+Tab walks back the way Tab came ----
    let backOk = true, backDetail = "";
    if (seq.length >= 3) {
      const last = seq[seq.length - 1];
      await P.evaluate((id) => document.querySelector(`[data-kb-id="${id}"]`)?.focus(), last);
      for (let i = 1; i <= 2; i++) {
        let s;
        for (let tries = 0; tries < 4; tries++) { // a date input has inner stops: stay until focus leaves the element
          await P.keyboard.press("Shift+Tab");
          s = await P.evaluate(SNAP);
          if (s.id !== seq[seq.length - i]) break;
        }
        const want = seq[seq.length - 1 - i];
        if (s.id !== want) { backOk = false; backDetail = `step ${i}: expected ${want}, got ${s.id || "body"}`; break; }
      }
    }
    const trapOk = problems.zero.length === 0 && !problems.body && backOk;
    check(`${tag} / Tab reaches every control`, never.length === 0 && quiet(errors).length === 0, `never focused (${never.length} of ${targets.length}): ${never.slice(0, 6).map((t) => t.name).join(" | ")} ${quiet(errors).slice(0, 1).join("")}`);
    check(`${tag} / no focus trap or lost focus (Shift+Tab returns)`, trapOk,
      `${problems.zero.length ? "focus on hidden/zero-size: " + problems.zero.slice(0, 3).join(" | ") : ""} ${problems.body ? "focus fell to <body> with controls unreached" : ""} ${backDetail}`);

    // ---- focus ring: focused style vs unfocused style, 3:1 against the background behind ----
    await P.evaluate(() => document.activeElement?.blur?.());
    const ringBad = [];
    for (const id of seq) {
      const f = snaps.get(id);
      const r = await P.evaluate(([id]) => {
        const el = document.querySelector(`[data-kb-id="${id}"]`); if (!el) return null;
        const k = window.__kb, u = k.ring(el), bg = k.bgBehind(el);
        const col = (c) => (c ? k.rgb(c) : null);
        return { u, bg, o: col(null) };
      }, [id]);
      if (!r) continue;
      const fr = f.ring, ur = r.u;
      const differs = (fr.outline && (!ur.outline || fr.outline.sig !== ur.outline.sig)) || (fr.shadow && (!ur.shadow || fr.shadow.sig !== ur.shadow.sig));
      if (!differs) { ringBad.push(`${f.name}: no ring`); continue; }
      // Chromium paints `outline-style: auto` as a TWO-tone ring (dark outer, white inner), so either tone may carry the contrast.
      const isOutline = fr.outline && (!ur.outline || fr.outline.sig !== ur.outline.sig);
      const colour = await P.evaluate(([c, bg, auto]) => { const k = window.__kb, x = k.rgb(c); if (!x) return null; const a = x.a; const m = { r: x.r * a + bg.r * (1 - a), g: x.g * a + bg.g * (1 - a), b: x.b * a + bg.b * (1 - a) }; const one = k.contrast(m, bg); return auto ? Math.max(one, k.contrast({ r: 255, g: 255, b: 255 }, bg)) : one; },
        [isOutline ? fr.outline.color : fr.shadow.color, r.bg, !!(isOutline && fr.outline.auto)]);
      if (colour === null || colour < 3) ringBad.push(`${f.name}: ring contrast ${colour === null ? "?" : colour.toFixed(2)}:1`);
    }
    check(`${tag} / visible focus ring, 3:1 contrast`, ringBad.length === 0 && seq.length > 0, seq.length === 0 ? "no control took focus" : `${ringBad.length} of ${seq.length}: ${ringBad.slice(0, 5).join(" | ")}`);

    // ---- Esc closes every pop-up and returns focus to its opener ----
    const openers = await P.evaluate(() => [...document.querySelectorAll("summary, [aria-haspopup]:not([aria-haspopup=false]), [aria-expanded]")]
      .filter((el) => window.__kb.vis(el) && !el.disabled).map((el) => window.__kb.idOf(el)));
    const escBad = [];
    let opened = 0;
    for (const id of openers) {
      const before = P.url();
      const st = await P.evaluate((id) => {
        const el = document.querySelector(`[data-kb-id="${id}"]`); if (!el) return null;
        el.scrollIntoView({ block: "center" }); el.focus();
        const det = el.tagName === "SUMMARY" ? el.parentElement : null;
        const visNow = [...document.querySelectorAll("body *")].filter((x) => window.__kb.vis(x));
        document.querySelectorAll("[data-kb-pre]").forEach((x) => delete x.dataset.kbPre);
        for (const x of visNow) x.dataset.kbPre = "1";
        const vcount = visNow.length;
        return { name: window.__kb.name(el), popup: el.tagName === "SUMMARY" || (el.getAttribute("aria-haspopup") || "false") !== "false", expanded: el.getAttribute("aria-expanded"), open: det ? det.open : null, vcount };
      }, id);
      if (!st) continue;
      if (st.expanded === "true" || st.open === true) continue; // already open: nothing to prove from a closed state
      await P.keyboard.press("Enter");
      await P.waitForTimeout(150);
      if (P.url() !== before) { await P.goBack(); await P.waitForTimeout(500); await P.evaluate(INSTALL); break; } // it navigated: not a pop-up
      const after = await P.evaluate(([id, vcount]) => {
        const el = document.querySelector(`[data-kb-id="${id}"]`); if (!el) return null;
        const det = el.tagName === "SUMMARY" ? el.parentElement : null;
        const now = [...document.querySelectorAll("body *")].filter((x) => window.__kb.vis(x)).length;
        return { expanded: el.getAttribute("aria-expanded"), open: det ? det.open : null, grew: now > vcount };
      }, [id, st.vcount]);
      if (!after) continue;
      // A pop-up is a <summary> menu, an aria-haspopup control, or a control that brings up something FLOATING (position fixed /
      // absolute, or role dialog / menu / listbox). An inline accordion (aria-expanded revealing a section in the flow) is a
      // disclosure, not a pop-up, and Esc is not owed there.
      const floating = await P.evaluate(() => [...document.querySelectorAll("body *")].some((x) => !x.dataset.kbPre && window.__kb.vis(x) &&
        (/fixed|absolute/.test(getComputedStyle(x).position) || /dialog|menu|listbox/.test(x.getAttribute("role") || ""))));
      const didOpen = (after.expanded === "true" || after.open === true || after.grew) && (st.popup || floating);
      if (!didOpen) continue; // Enter did something else (an action, or an inline disclosure)
      opened++;
      await P.keyboard.press("Escape");
      await P.waitForTimeout(150);
      const closed = await P.evaluate(([id, vcount]) => {
        const el = document.querySelector(`[data-kb-id="${id}"]`);
        const det = el && el.tagName === "SUMMARY" ? el.parentElement : null;
        const now = [...document.querySelectorAll("body *")].filter((x) => window.__kb.vis(x)).length;
        return { expanded: el ? el.getAttribute("aria-expanded") : null, open: det ? det.open : null, shrank: now <= vcount, focusBack: !!el && document.activeElement === el };
      }, [id, st.vcount]);
      const isClosed = closed.expanded === "true" ? false : closed.open === true ? false : closed.shrank;
      if (!isClosed) escBad.push(`${st.name}: still open after Esc`);
      else if (!closed.focusBack) escBad.push(`${st.name}: closed, but focus did not return to it`);
      // leave the page tidy for the next opener
      await P.evaluate(() => { document.querySelectorAll("details[open]").forEach((d) => { d.open = false; }); });
    }
    check(`${tag} / Esc closes every pop-up and focus returns (${opened} opened)`, escBad.length === 0, escBad.slice(0, 5).join(" | "));
    if (MUTATE === "esc" && opened === 0) { /* a page with no pop-up cannot show this mutation; counted in the report */ }

    // ---- Enter and Space activate a role=button that is not a <button> ----
    const roles = await P.evaluate(() => [...document.querySelectorAll("[role=button]")].filter((el) => !["BUTTON", "INPUT"].includes(el.tagName) && window.__kb.vis(el)).map((el) => window.__kb.idOf(el)));
    const roleBad = [];
    for (const id of roles) {
      for (const key of ["Enter", "Space"]) {
        const nm = await P.evaluate((id) => {
          const el = document.querySelector(`[data-kb-id="${id}"]`); el.scrollIntoView({ block: "center" });
          window.__kbHit = 0; el.__h = () => { window.__kbHit++; }; el.addEventListener("click", el.__h);
          el.focus(); return window.__kb.name(el);
        }, id);
        await P.keyboard.press(key === "Space" ? " " : key);
        await P.waitForTimeout(100);
        const hit = await P.evaluate((id) => { const el = document.querySelector(`[data-kb-id="${id}"]`); const hit = window.__kbHit; if (el) el.removeEventListener("click", el.__h); return hit; }, id).catch(() => 1);
        if (!hit) roleBad.push(`${nm}: ${key} does nothing`);
        if (P.url().includes("#") === false && false) break;
      }
    }
    check(`${tag} / Enter and Space activate role=button (${roles.length} found)`, roleBad.length === 0, roleBad.slice(0, 5).join(" | "));
    rows.push({ lang, page: name, w, targets: targets.length, stops: seq.length, never: never.length, ringBad: ringBad.length, opened, roles: roles.length, roleBad: roleBad.length, escBad: escBad.length });
    await ctx.close();
  }
}
await browser.close();

if (LIST) for (const r of rows) console.log(JSON.stringify(r));
console.log(`\n==== Shared pages keyboard audit: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
