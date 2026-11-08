// 8 Nov 2026 (the Owner, PCF MSA J104 tick 7 C): a Qur'anic dua's ▶ plays the recitation Quran Study already plays;
// a Hadith dua's ▶ stays dimmed (its recordings are 7 A/B). Run from the repository root, serve.js on :8080.
//   --mutate=noplay   the Qur'anic ▶ stays disabled -> check 1 fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = { noplay: ["js/dua-study.js", "play.disabled = false;\n    play.title = t(\"Play\");", "play.disabled = true;\n    play.title = t(\"Play\");"] };
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"]) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: 390, height: 900 } });
  const asked = [];
  await ctx.route("**/archive.org/**", (r) => { asked.push(r.request().url()); return r.abort(); });
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error("mutation anchor missing"); await r.fulfill({ status: 200, contentType: "text/javascript", body: src.replace(a, b) }); });
  }
  const { page: P } = await openPage(ctx, "/app/dua-study.html?g=prophets&open=1");
  P.on("dialog", (d) => d.accept());
  await P.waitForSelector("[data-dua-quran]", { timeout: 25000 });
  const ref = await P.$eval("[data-dua-quran]", (c) => c.dataset.duaQuran);
  const [s, a] = ref.split(":").map(Number);
  const tag = `[${lang} ${ref}]`;
  check(`${tag} the Qur'anic dua's ▶ is enabled`, await P.$eval("[data-dua-play]", (b) => !b.disabled));
  await P.click("[data-dua-play]");
  await P.waitForTimeout(1500);
  const want = `${String(s).padStart(3, "0")}${String(a).padStart(3, "0")}.mp3`;
  check(`${tag} pressing ▶ asks for that āyah's recitation (${want})`, asked.some((u) => u.includes(want)), JSON.stringify(asked));
  await ctx.close();
}
const ctx = await newContext(browser, { appLang: "en", banner: false, viewport: { width: 390, height: 900 } });
const { page: P } = await openPage(ctx, "/app/dua-study.html?g=rasul&open=8");
await P.waitForSelector("[data-dua-topbar]", { timeout: 25000 });
check("a Hadith dua's ▶ stays dimmed", await P.$eval("[data-dua-play]", (b) => b.disabled));
await browser.close();
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
