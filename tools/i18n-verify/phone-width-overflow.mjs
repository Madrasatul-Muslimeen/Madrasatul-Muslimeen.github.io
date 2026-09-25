// Issue #293 -- no page may scroll SIDEWAYS on a phone.
//
// Opens every app page at 320/360/390/412px in English and Bangla and fails
// when the document is wider than the screen (scrollWidth > innerWidth + 1).
// A table or panel that scrolls INSIDE its own box is fine -- only the page
// itself sliding sideways is a defect, because then every line of the page
// is partly off screen.
//
// One pending invite carries a deliberately long email address, so People's
// Invite box is measured with real-length content (the standing lesson:
// measure a content-sized control with content the length a real tenant has).
//
// Run from the repository root, with serve.js on :8080.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

const SKIP = /^(index|migrate|onboarding|accept-invite|admin-self-check|quranrevival-render-test|note-editor-prototype-demo|_)/;
const PAGES = fs.readdirSync("app").filter((f) => f.endsWith(".html") && !SKIP.test(f)).sort();
const WIDTHS = [320, 360, 390, 412];
const LONG_EMAIL = "averyveryverylongemailaddress.for.testing@some-long-domain-name.example.org";
const SEED = `\nDATA.tenantInvites.push({ _id: "t1__${LONG_EMAIL}", tenantId: "t1", email: "${LONG_EMAIL}", role: "teacher", status: "pending" });\n`;

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { pass++; } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
if (PAGES.length < 20) throw new Error(`only ${PAGES.length} pages found -- run from the repository root`);

for (const lang of ["en", "bn"]) {
  for (const width of WIDTHS) {
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 800 }, extraSeedJs: SEED });
    for (const p of PAGES) {
      const { page } = await openPage(ctx, `/app/${p}`);
      await page.waitForTimeout(1200);
      const r = await page.evaluate(() => {
        const sw = document.documentElement.scrollWidth;
        if (sw <= innerWidth + 1) return { sw, culprits: [] };
        const culprits = [];
        for (const e of document.querySelectorAll("body *")) {
          const b = e.getBoundingClientRect();
          if (!b.width || b.right <= innerWidth + 1) continue;
          let clipped = false;
          for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
            if (/auto|scroll|hidden|clip/.test(getComputedStyle(a).overflowX)) { clipped = true; break; }
          }
          if (!clipped) culprits.push(`${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}`);
          if (culprits.length >= 3) break;
        }
        return { sw, culprits };
      });
      check(`${lang} ${width}px ${p} does not scroll sideways`, r.sw <= width + 1, `(page ${r.sw}px wide: ${r.culprits.join(", ")})`);
      await page.close();
    }
    await ctx.close();
  }
}

// Positive control: the long invite really reached People's table, so the
// People check above measured real-length content rather than an empty box.
{
  const ctx = await newContext(browser, { viewport: { width: 360, height: 800 }, extraSeedJs: SEED });
  const { page } = await openPage(ctx, "/app/people.html");
  await page.waitForTimeout(1200);
  const seen = await page.evaluate((email) => document.getElementById("inviteBody")?.textContent.includes(email), LONG_EMAIL);
  check("positive control: the long invited email is on People's page", seen === true);
  await ctx.close();
}

await browser.close();
console.log(`\n==== Phone width, no sideways scroll (${PAGES.length} pages x ${WIDTHS.length} widths x 2 languages): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
