// Audit part 84 (PCF MSA J29): first screen audit of the 8 pages that had no browser check at all --
// classes, course offers, curriculum, backup, import notes, dawah, onboarding, accept invite.
// Audit part 85 extends the same suite to 8 shared pages with one check or none -- monitor, homework, people, records,
// catalogue, about, bookmarks, hadith collections.
//
// For each page, at 390x844, 820x1180 and 1440x900, in English and Bangla, on the RENDERED page:
//   (a) it boots: no page error, and its main heading is on screen (the heading text is read: positive control)
//   (b) no sideways scroll, and no visible control cut by a clipping (overflow hidden/clip) ancestor
//   (c) every visible button / link-button is at least 40x40
//   (d) in Bangla, no visible English text left over (bangla-sweep-lib's scanner)
//   (e) opened with ?back=1, a visible <- Back is there (the way-back law, decision 86)
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/unchecked-pages-screen-audit-browser.mjs
//   --page=<file>      one page only (e.g. --page=classes.html)
//   --list             print every measurement finding
//   --mutate=wide      inject a 2000px-wide element into every page (check (b) must fail)
//   --mutate=small     inject a 20px button (check (c) must fail)
//   --mutate=clip      inject a button cut by an overflow:hidden parent (clip check must fail)
//   --mutate=noback    drop the Back control from the page (check (e) must fail)
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
import { SCAN, leaksOf as baseLeaksOf, DATA_ALLOWED, NAME_TOKENS } from "./bangla-sweep-lib.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const ONLY = arg("page"), MUTATE = arg("mutate"), LIST = process.argv.includes("--list");

// Data the seed types (the tenant's own words) and file/product names, never interface wording.
DATA_ALLOWED.push(
  /^(Morning Class|Evening Quran|General Grades|Year 1|Year 2|Surah Al-Fatiha|Memorise Surah Al-Fatiha|Doing well on tajweed\.|Try again)$/,
  /^(Morning Class|Evening Quran) \((ক্লাস|কোর্স অফার)\)$/,
  /^General Grades( — Year 1|: Year 1)(, [০-৯-]+ থেকে \(বর্তমান\))?$/,
);
NAME_TOKENS.push(/\bCSV\b/g, /\bJSON\b/g, /\bGoogle\b/g, /\bGmail\b/g, /\bhttps?\b/g, /\bOpenITI\b/g,
  // Product names and the OTHER app's own menu path / file extensions (WordPress's "Tools → Export → All content" is that app's
  // English wording, which the reader must match on their screen; .xml / .enex are file types), as the About sweeps allow.
  /Mapping My Journey/g, /Tools → Export → All content/g, /\.(?:xml|enex)\b/g);
// The curriculum page prints the seeded week's Qur'an reference and the resource's link address: the tenant's data.
DATA_ALLOWED.push(/^সপ্তাহ [০-৯]+ — Surah Al-Fatiha$/, /^https:\/\/example\.org\/lesson$/);

// Audit part 85: the stub's seeded bookmark name is the reader's own data; Records prints its storage chunk key on purpose
// (records.html: "turning the key into Bengali digits would stop it matching what is stored"); Quran Foundation is the
// font provider's name (About credits it by name in English on purpose).
DATA_ALLOWED.push(/^Ayat al-Kursi and the last two āyāt of Al-Baqarah$/, /^Weekend Qur'an Memorisation and Tajweed Circle \(Year 7–9\)( \((ক্লাস|কোর্স অফার)\))?$/,
  /^Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi$/, /^Maryam bint Abdullah Al-Hashimi$/, /^Reading \(with Tajweed\)$/, /^Madrasatul Muslimeen \(Owner, Prime\)$/, /^Ayat al-Kursi$/, /^খণ্ড: (?:surah|subject)_\w+$/);
NAME_TOKENS.push(/\bQuran Foundation\b/g);

// Audit part 86: the stub has no "arabic_language" root subject, so topic-study.js falls back to printing the module id "arabic"
// (line 258). A real tenant has the subject; this is a fixture gap, not an untranslated label.
DATA_ALLOWED.push(/^arabic$/);
// The Approach name is truncated to 18 characters + "…" in the landing's wheel list; it is the tenant's own data.
DATA_ALLOWED.push(/^Reading \(wit…$/);

const PAGES = [
  ["Classes", "classes.html"], ["Course offers", "course-offers.html"], ["Curriculum", "curriculum.html"],
  ["Backup", "backup.html"], ["Import notes", "import-notes.html"], ["Dawah", "dawah.html"],
  ["Onboarding", "onboarding.html"], ["Accept invite", "accept-invite.html?token=not-a-real-link"],
  // Audit part 85: the shared MSA pages that had one check or none on their screens.
  ["Monitor", "monitor.html"], ["Homework", "homework.html"], ["People", "people.html"], ["Records", "records.html"],
  ["Catalogue", "catalogue.html"], ["About", "about.html"], ["Bookmarks", "bookmarks.html"],
  ["Hadith collections", "hadith-collections.html"],
  // Audit part 86: the last shared pages.
  ["Landing", "index.html"], ["Notes", "notes.html"], ["Journey map", "journey-map.html"], ["Deen study", "deen-study.html"],
  ["Arabic study", "arabic-study.html"], ["Self-check", "admin-self-check.html"], ["Taglines", "taglines.html"],
];

// Audit part 86: REAL-LENGTH data (v07.134 lesson: short fixture names report clean while a real tenant's text runs off a phone).
// Pass --short to run on the stub's own short names, as parts 84-85 did.
const REAL_SEED = `
DATA.tenants[0].name = lang("Madrasatul Muslimeen (Owner, Prime)", "মাদরাসাতুল মুসলিমীন (মালিক, প্রাইম)");
DATA.tenantPeople[0].name = lang("Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi", "মুহাম্মাদ আবদুর রহমান ইবনে আবদুল্লাহ আল-হাশিমী");
DATA.tenantPeople[1].name = lang("Maryam bint Abdullah Al-Hashimi", "মুহাম্মাদ আবদুর রহমান ইবনে আবদুল্লাহ আল-হাশিমী");
DATA.trackables[0].name = lang("Reading (with Tajweed)");
DATA.classes[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
DATA.courseOffers[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
DATA.bookmarks[0].saved[0].name = "Ayat al-Kursi and the last two āyāt of Al-Baqarah";
`;
const SEED = process.argv.includes("--short") ? null : REAL_SEED;
const VIEWPORTS = [[390, 844], [820, 1180], [1440, 900]];
const LANGS = ["en", "bn"];

// ---- the in-page measurers (also run on probes, to prove they can fail) ----
const MEASURE = () => {
  const vis = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e.hidden) return false;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      // Architect review (audit part 86): a closed <details> keeps its links' boxes in Chromium (the landing's Home menu
      // measured 547px of links with open=false), but nothing past its <summary> is on screen.
      const d = e.parentElement?.closest("details");
      if (d && !d.open && e.parentElement === d && e.tagName !== "SUMMARY") return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const label = (el) => ((el.getAttribute("aria-label") || el.textContent || el.value || el.id || el.className || "") + "").replace(/\s+/g, " ").trim().slice(0, 40);
  const heading = [...document.querySelectorAll("h1, h2")].find(vis);
  const sideways = document.documentElement.scrollWidth - window.innerWidth;
  const controls = [...document.querySelectorAll("button, [role=button], a.btn, a[class*=btn], a[class*=button], input[type=button], input[type=submit], select")].filter(vis);
  const small = controls.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width < 39.5 || r.height < 39.5;
  }).map((el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} "${label(el)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
  const clipped = [];
  for (const el of [...document.querySelectorAll("button, a, input, select, textarea, [role=button]")].filter(vis)) {
    const r = el.getBoundingClientRect();
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (!/hidden|clip/.test(cs.overflowX + cs.overflowY)) continue;
      // Architect review (audit part 86): when <html> does not clip, the body's overflow belongs to the VIEWPORT (CSS overflow
      // propagation), not to the body's own box: the landing's 1280px-wide centred body does not cut a window 1384px wide.
      const toViewport = p === document.body && getComputedStyle(document.documentElement).overflow === "visible";
      const pr = toViewport ? { left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight } : p.getBoundingClientRect();
      if (pr.width === 0 && pr.height === 0) continue;
      const cutX = /hidden|clip/.test(cs.overflowX) && (r.left < pr.left - 1 || r.right > pr.right + 1);
      const cutY = /hidden|clip/.test(cs.overflowY) && (r.top < pr.top - 1 || r.bottom > pr.bottom + 1);
      if (cutX || cutY) { clipped.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} "${label(el)}" inside ${p.tagName.toLowerCase()}${p.id ? "#" + p.id : ""}`); break; }
    }
  }
  // The app's one Back row is [data-bm-back] (bookmark-nav.js mountBackRow); a plain "Backup" link is not a Back.
  const back = [...document.querySelectorAll("[data-bm-back], a, button")].filter(vis).filter((el) => el.matches("[data-bm-back]") || /^\s*←/.test(el.textContent)).map(label);
  return { heading: heading ? heading.textContent.replace(/\s+/g, " ").trim() : null, sideways, small, clipped, back };
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const quiet = (errors) => errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));

// ---- positive controls: each measurer CAN fail ----
{
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 844 } });
  const { page: P } = await openPage(ctx, "/app/classes.html");
  await P.waitForTimeout(600);
  const base = await P.evaluate(MEASURE);
  await P.evaluate(() => {
    const d = document.createElement("div"); d.id = "probeWide"; d.style.cssText = "width:2000px;height:10px;background:red"; document.body.appendChild(d);
    const b = document.createElement("button"); b.id = "probeSmall"; b.textContent = "x"; b.style.cssText = "width:20px;height:20px;min-width:0;min-height:0"; document.body.appendChild(b);
    const c = document.createElement("div"); c.style.cssText = "width:50px;height:50px;overflow:hidden"; const cb = document.createElement("button"); cb.id = "probeClip"; cb.textContent = "cut"; cb.style.cssText = "margin-left:40px;width:60px;height:44px"; c.appendChild(cb); document.body.appendChild(c);
  });
  const probed = await P.evaluate(MEASURE);
  check("control: sideways scroll is detected when a 2000px element is added", probed.sideways > base.sideways + 1000, `base ${base.sideways} probe ${probed.sideways}`);
  check("control: a 20px button is reported as small", probed.small.some((s) => s.includes("probeSmall")), JSON.stringify(probed.small));
  check("control: a control cut by an overflow:hidden parent is reported", probed.clipped.some((s) => s.includes("probeClip")), JSON.stringify(probed.clipped));
  await ctx.close();
}

// Every app page that LINKS to accept-invite.html (a string building its address is not a link a reader follows from that page).
const APP_LINKS_INVITE = fs.readdirSync("app").filter((f) => f.endsWith(".html") && f !== "accept-invite.html")
  .some((f) => /href=["'][^"']*accept-invite\.html/.test(fs.readFileSync(`app/${f}`, "utf8")));
const findings = [];
for (const [name, path] of PAGES) {
  if (ONLY && !path.startsWith(ONLY)) continue;
  console.log(`\n== ${name} (${path}) ==`);
  for (const [w, h] of VIEWPORTS) {
    for (const lang of LANGS) {
      const tag = `${name} ${w}x${h} ${lang}`;
      const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: SEED });
      await ctx.route("**/archive.org/**", (r) => r.abort());
      const sep = path.includes("?") ? "&" : "?";
      // hadith-collections.html answers back=1 (its own way-back, the Hadith Lead's) and not the menu's navBack=1.
      const backParam = path.startsWith("hadith-collections") ? "back=1" : "navBack=1";
      const { page: P, errors } = await openPage(ctx, "/app/" + path + sep + backParam);
      await P.waitForTimeout(1000);
      if (MUTATE) await P.evaluate((m) => {
        if (m === "wide") { const d = document.createElement("div"); d.style.cssText = "width:2000px;height:10px"; document.body.appendChild(d); }
        if (m === "small") { const b = document.createElement("button"); b.textContent = "x"; b.style.cssText = "width:20px;height:20px;min-width:0;min-height:0"; document.body.appendChild(b); }
        if (m === "clip") { const c = document.createElement("div"); c.style.cssText = "width:50px;height:50px;overflow:hidden"; const b = document.createElement("button"); b.textContent = "cut"; b.style.cssText = "margin-left:40px;width:60px;height:44px"; c.appendChild(b); document.body.appendChild(c); }
        // narrowselect: undo the part-86 floor on table-row selects (taglines.html) -- check (c) must fail there.
        if (m === "narrowselect") for (const s of document.querySelectorAll("td select")) s.style.cssText = "min-width:0;width:25px";
        // longselect: a select as wide as a real-length name with no min-width:0 guard (deen/arabic study) -- check (b) must fail.
        if (m === "longselect") { const s = document.getElementById("personSelect"); if (s) { s.innerHTML = "<option>" + "Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi and sons".repeat(2) + "</option>"; const st = document.createElement("style"); st.textContent = "#contextBar label,#contextBar select{min-width:auto!important;max-width:none!important}"; document.head.appendChild(st); } }
        if (m === "noback") for (const el of document.querySelectorAll("[data-bm-back]")) el.remove();
      }, MUTATE);
      const m = await P.evaluate(MEASURE);
      check(`${tag}: boots with no page error`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
      check(`${tag}: main heading on screen`, !!m.heading, `heading: ${m.heading}`);
      check(`${tag}: no sideways scroll`, m.sideways <= 0, `scrollWidth over by ${m.sideways}px`);
      check(`${tag}: no control cut by a clipping ancestor`, m.clipped.length === 0, JSON.stringify(m.clipped.slice(0, 4)));
      check(`${tag}: every visible button is at least 40x40`, m.small.length === 0, JSON.stringify(m.small.slice(0, 6)));
      // The menu opens a page with navBack=1 (nav.js, J72); back=1 is the Continue chips' marker and only study pages answer it.
      // UPDATED IN PLACE (audit part 84 review): accept-invite.html is reached only from an invite link sent by email (people.html
      // builds it), never from a page in the app, so there is no place to go back to and (e) does not apply there. onboarding.html
      // IS linked from the app (nav.js noAccountMessageHtml, now with navBack=1) and mounts the Back row.
      // Audit part 86: the same holds for admin-self-check.html (owner diagnostic, opened by address; the only app reference is
      // screensaver-idle.js's never-on list, not a link) and for the landing page, which is the root every Back returns to.
      // Architect review: the landing's own clause read `... || path === "index.html"`, a check that could not fail. The landing is
      // the root every Back returns to, so (e) is simply not asked of it, rather than asserted vacuously.
      if (path === "index.html") { /* (e) not applicable: the root */ }
      else if (path.startsWith("admin-self-check")) check(`${tag}: no in-app link leads here (so no Back is owed)`, !fs.readdirSync("app").filter((f) => f.endsWith(".html") && f !== path).some((f) => new RegExp(`href=["'][^"']*${path.replace(".", "\\.")}["']`).test(fs.readFileSync(`app/${f}`, "utf8"))), "an app page now links here: give it a Back");
      else if (path.startsWith("accept-invite")) check(`${tag}: no in-app page links here (so no Back is owed)`, !APP_LINKS_INVITE, "an app page now links to accept-invite.html: give it a Back");
      else check(`${tag}: ?navBack=1 shows a visible Back`, m.back.length > 0, "no Back control found");
      if (lang === "bn") {
        const bnChars = await P.evaluate(() => (document.body.innerText.match(/[ঀ-৿]/g) || []).length);
        check(`${tag}: rendered in Bangla (positive control)`, bnChars >= 5, `Bangla characters: ${bnChars}`);
        const leaks = baseLeaksOf(await P.evaluate(SCAN));
        if (LIST) console.log(`   leaks: ${JSON.stringify(leaks.map((l) => l.text))}`);
        check(`${tag}: no English interface text`, leaks.length === 0, JSON.stringify(leaks.slice(0, 6).map((l) => `${l.kind}:${l.text}`)));
      }
      if (LIST) console.log(`   ${tag}: ${JSON.stringify(m)}`);
      await ctx.close();
    }
  }
}

await browser.close();
console.log(`\n==== Unchecked pages screen audit: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
