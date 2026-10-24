// Audit part 84 (PCF MSA J29): first screen audit of the 8 pages that had no browser check at all --
// classes, course offers, curriculum, backup, import notes, dawah, onboarding, accept invite.
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

const PAGES = [
  ["Classes", "classes.html"], ["Course offers", "course-offers.html"], ["Curriculum", "curriculum.html"],
  ["Backup", "backup.html"], ["Import notes", "import-notes.html"], ["Dawah", "dawah.html"],
  ["Onboarding", "onboarding.html"], ["Accept invite", "accept-invite.html?token=not-a-real-link"],
];
const VIEWPORTS = [[390, 844], [820, 1180], [1440, 900]];
const LANGS = ["en", "bn"];

// ---- the in-page measurers (also run on probes, to prove they can fail) ----
const MEASURE = () => {
  const vis = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e.hidden) return false;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
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
      const pr = p.getBoundingClientRect();
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
      const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
      await ctx.route("**/archive.org/**", (r) => r.abort());
      const sep = path.includes("?") ? "&" : "?";
      const { page: P, errors } = await openPage(ctx, "/app/" + path + sep + "navBack=1");
      await P.waitForTimeout(1000);
      if (MUTATE) await P.evaluate((m) => {
        if (m === "wide") { const d = document.createElement("div"); d.style.cssText = "width:2000px;height:10px"; document.body.appendChild(d); }
        if (m === "small") { const b = document.createElement("button"); b.textContent = "x"; b.style.cssText = "width:20px;height:20px;min-width:0;min-height:0"; document.body.appendChild(b); }
        if (m === "clip") { const c = document.createElement("div"); c.style.cssText = "width:50px;height:50px;overflow:hidden"; const b = document.createElement("button"); b.textContent = "cut"; b.style.cssText = "margin-left:40px;width:60px;height:44px"; c.appendChild(b); document.body.appendChild(c); }
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
      if (path.startsWith("accept-invite")) check(`${tag}: no in-app page links here (so no Back is owed)`, !APP_LINKS_INVITE, "an app page now links to accept-invite.html: give it a Back");
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
