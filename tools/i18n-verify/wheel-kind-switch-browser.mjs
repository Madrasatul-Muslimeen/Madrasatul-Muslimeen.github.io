// The Owner, 13 Nov 2026 (the wheel window's title bar on a computer, "Approaches | Vocabulary | Marks" circled): "Mark (which is actually the
// 'Difficulty Level', write it so.) ... not in Mob n Tab. Why?" The three-way switch is ONE row that the page moves: into the Wheel window's title bar
// from 900px, into the "Wheel" drawer under the wheel on a phone or tablet. This suite proves the row's words, that it is whole and tappable in
// BOTH places (so the answer to "where is it on a phone?" is a checked fact), and that the drawer opens it.
//   --mutate=oldname   the button reads "Marks" again  -> the words check fails by name
// Run from the repository root with serve.js up:  node tools/i18n-verify/wheel-kind-switch-browser.mjs [--lang=en|bn] [--mutate=oldname]
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
const PAGE = "app/quranrevival.html";
const NAMES = { en: ["Approaches", "Vocabulary", "Difficulty Level"], bn: null };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of arg("lang") ? [arg("lang")] : ["en", "bn"]) for (const [w, h, where] of [[320, 700, "drawer"], [390, 844, "drawer"], [820, 1100, "drawer"], [900, 800, "title"], [1100, 800, "title"], [1440, 900, "title"]]) {
  const tag = `[${lang} ${w}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
  if (MUTATE === "oldname") await ctx.route("**/app/quranrevival.html*", async (r) => {
    const src = fs.readFileSync(PAGE, "utf8"), a = 'aria-pressed="false">Difficulty Level</button>';
    if (!src.includes(a)) throw new Error("mutation anchor missing");
    await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.replace(a, 'aria-pressed="false">Marks</button>') });
  });
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await P.waitForTimeout(1200);
  const probe = () => P.evaluate(() => {
    const r = document.getElementById("wheelKindRow"); if (!r) return null;
    const btns = [...r.querySelectorAll("[data-wheel-kind]")].map((b) => { const q = b.getBoundingClientRect(); return { kind: b.dataset.wheelKind, text: b.textContent.trim(), w: Math.round(q.width), h: Math.round(q.height), l: Math.round(q.left), rt: Math.round(q.right), cut: b.scrollWidth > b.clientWidth + 1 }; });
    const q = r.getBoundingClientRect();
    return { parent: r.parentElement?.id || r.parentElement?.getAttribute("data-wheel-drawer-panel"), shown: q.width > 0, btns, rowL: Math.round(q.left), rowR: Math.round(q.right), scroll: document.documentElement.scrollWidth - innerWidth };
  });
  const first = await probe();
  check(`${tag} the switch is in the wheel bar's Know Your Status panel, closed until opened (v15.00: one place at every width; it was the title bar from 900px and the Wheel drawer below)`, !!first && first.parent === "wbPanelStatus" && !first.shown, JSON.stringify(first && { parent: first.parent, shown: first.shown }));
  {
    check(`${tag} the "Know Your Status" bar button is on screen and at least 40px tall`, await P.evaluate(() => { const b = document.querySelector('#wbStatus'); const q = b?.getBoundingClientRect(); return !!q && q.width > 0 && q.height >= 40 && q.top >= 0 && q.bottom <= innerHeight + 1; }));
    await P.evaluate(() => document.querySelector('#wbStatus')?.click());
    await P.waitForTimeout(500);
  }
  const s = await probe();
  check(`${tag} the switch is on screenonce Know Your Status is opened`, !!s && s.shown, JSON.stringify(s));
  if (s?.shown) {
    const want = lang === "en" ? NAMES.en : null;
    check(`${tag} MUTATION TARGET (oldname): the three buttons read ${lang === "en" ? want.join(" | ") : "Approaches | Vocabulary | Difficulty Level (Bangla)"}; the third is the difficulty level, not "Marks"`, s.btns.map((b) => b.kind).join() === "approaches,vocab,marks" && (lang === "en" ? s.btns.map((b) => b.text).join("|") === want.join("|") : s.btns[2].text.includes("কঠিনতার") && !/^চিহ্ন$/.test(s.btns[2].text) ), JSON.stringify(s.btns.map((b) => b.text)));
    check(`${tag} every button is at least 40px tall, whole (nothing cut) and inside the screen`, s.btns.every((b) => b.h >= 40 && !b.cut && b.l >= 0 && b.rt <= w + 0.5) && s.scroll <= 1, JSON.stringify(s));
    await P.evaluate(() => document.querySelector('[data-wheel-kind="marks"]').click());
    await P.waitForTimeout(500);
    const on = await P.evaluate(() => ({ pressed: document.querySelector('[data-wheel-kind="marks"]').getAttribute("aria-pressed"), legend: !!document.querySelector("[data-mk-legend], .mk-legend") || /Difficult|Done/i.test(document.getElementById("wheelContainer")?.textContent ?? "") }));
    check(`${tag} tapping it shows the difficulty-level wheel (pressed, with its legend/figures)`, on.pressed === "true" && on.legend, JSON.stringify(on));
  }
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
console.log(`\n==== Wheel switch: Approaches | Vocabulary | Difficulty Level${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
