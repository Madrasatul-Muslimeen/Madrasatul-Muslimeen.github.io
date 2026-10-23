// QR Lead (audit, QR as a student, via the MSA Architect, 23 Oct 2026), on quranrevival.html's header:
//   - Home ▾'s "Sign in with Google" (#signInBtn) was 27px tall on a computer: 40px for a finger (Sign out is checked too);
//   - the version beside the name (#appVersion) was #888 on white, 3.54:1: at least 4.5:1.
// The stub is always signed in, so #signInBtn is shown the way the page shows it to a signed-out reader
// (style.display = "inline-block", quranrevival.html's own auth handler) before it is measured.
//   node tools/i18n-verify/qr-student-header-browser.mjs [--mutate=small|grey]     (serve.js on :8080, or QR_BASE)
//   --mutate=small   the 40px rule removed        -> the size checks FAIL
//   --mutate=grey    the version back to #888      -> the contrast checks FAIL
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  small: ["  #signInBtn, #signOutBtn { min-height: 40px; }\n", ""],
  grey: ["color: #666; vertical-align: middle; } /* QR Lead", "color: #888; vertical-align: middle; } /* QR Lead"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const [w, h, lang] of [[1280, 800, "en"], [390, 844, "bn"], [360, 740, "en"]]) {
  const tag = `[${lang} ${w}]`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: w, height: h } });
  if (MUTATE) {
    const [from, to] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const body = await res.text();
      if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
      r.fulfill({ response: res, body: body.replace(from, to) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForSelector("#appVersion", { state: "attached", timeout: 20000 });
  await page.waitForFunction(() => /\d/.test(document.getElementById("appVersion")?.textContent || ""), null, { timeout: 10000 }).catch(() => {});
  await page.evaluate(() => { const d = document.querySelector("details.nav-cat-home"); if (d) d.open = true; });
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const lum = (c) => { const v = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; } return "rgb(255, 255, 255)"; };
    const v = document.getElementById("appVersion"), fg = getComputedStyle(v).color, bg = bgOf(v);
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    const out = { version: v.textContent, fg, bg, ratio: Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100 };
    const so = document.getElementById("signOutBtn"), si = document.getElementById("signInBtn");
    out.signOut = { shown: so.getBoundingClientRect().width > 0, h: Math.round(so.getBoundingClientRect().height) };
    si.style.display = "inline-block"; // what the page itself does for a signed-out reader
    out.signIn = { shown: si.getBoundingClientRect().width > 0, h: Math.round(si.getBoundingClientRect().height), text: si.textContent.trim() };
    si.style.display = "none";
    return out;
  });
  check(`${tag} POSITIVE CONTROL: the version shows ("${m.version}")`, /\d/.test(m.version), JSON.stringify(m));
  check(`${tag} the version reads at least 4.5:1 (${m.fg} on ${m.bg}: ${m.ratio}:1)`, m.ratio >= 4.5, JSON.stringify(m));
  check(`${tag} POSITIVE CONTROL: Home ▾ is open and Sign out shows (signed in)`, m.signOut.shown, JSON.stringify(m.signOut));
  check(`${tag} Sign out is at least 40px tall (${m.signOut.h}px)`, m.signOut.h >= 40, JSON.stringify(m.signOut));
  check(`${tag} "${m.signIn.text}", as a signed-out reader sees it, is at least 40px tall (${m.signIn.h}px)`, m.signIn.shown && m.signIn.h >= 40, JSON.stringify(m.signIn));
  await ctx.close();
}
await browser.close();
console.log(`\n==== QR header for a student (sign-in size, version contrast)${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
