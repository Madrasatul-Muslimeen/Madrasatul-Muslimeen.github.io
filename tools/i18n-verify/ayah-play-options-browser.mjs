// The Owner, 17 Nov 2026 ("Play button here should open a card to select play options" -> "A, Listening in Study Options"): the ⋮ menu's
// ▶ Play opens a card with the SAME choices as Study options > Listening: reciters, Repeat, Mode (Loop with Whole Unit), then ▶ Play.
//   node tools/i18n-verify/ayah-play-options-browser.mjs [--mutate=NAME]   (repo root, serve.js on :8080 / QR_BASE)
//   --mutate=oldplay   ▶ Play plays at once again, no card              -> "▶ Play opens the play-options card" FAILS
//   --mutate=nosync    the card's Repeat does not reach the real control  -> "Repeat on the card IS Study options' Repeat" FAILS
//   --mutate=noloop    Loop never shows (even with Whole Unit)           -> "Loop shows only with Whole Unit (shown ...)" FAILS
//   Codex review (17 Nov 2026), each its own mutation:
//   --mutate=firstonly   Each Ayah plays only the first ticked reciter      -> "two ticked reciters both play" FAILS
//   --mutate=nostop      the old repeat loop (not the drill) is back           -> "Stop ends a repeated Each Ayah run" FAILS
//   --mutate=oldlist     Whole Unit offers only single-ayah reciters        -> "a whole-sūrah-only reciter is offered under Whole Unit" FAILS
//   --mutate=boxonly     a tick only goes through the hidden Study options box -> "a reciter with no hidden box still plays" FAILS
//   --mutate=notrap      Tab is not kept inside the card                    -> "Tab stays inside the card" FAILS
//   --mutate=noheight    the card has no maximum height                      -> "the card never outgrows a short screen" FAILS
//   --mutate=keeploop    Loop stays on when the card goes back to Each Ayah  -> "Loop is cleared when the card goes back to Each Ayah" FAILS
//   --mutate=openloop   opening the card in Each Ayah with Loop already on leaves Loop on -> "Loop is cleared when the card opens in Each Ayah" FAILS
//   --mutate=session     the card's Each Ayah starts a listening session of the SELECTED unit again -> "Each Ayah starts no listening session" FAILS
//   --mutate=nosettle    a run already sounding is not settled before the card's run replaces it   -> "a run already sounding is settled" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const F = "app/quranrevival.html";
const MUT = {
  oldplay: [F, "onPlay: openAyahPlayDialog, //", "onPlay: quickPlayAyah, //"],
  nosync: [F, 'if (e.target.matches("[data-play-repeat]")) { setReal("#drillRepeatSelect", "value", e.target.value); return; }', 'if (e.target.matches("[data-play-repeat]")) { return; }'],
  firstonly: [F, "reciterIds: ids, repeatCount: repeat, mode: \"each\" }", "reciterIds: ids.slice(0, 1), repeatCount: repeat, mode: \"each\" }"],
  nostop: [F, 'playDrill({ surahNum: surah, fromAyah: ayah, toAyah: ayah, reciterIds: ids, repeatCount: repeat, mode: "each" })', '(async () => { for (let i = 0; i < repeat; i++) await playOneAndWait(surah, ayah, ids[0]); })()'],
  oldlist: [F, "? reciterOffersSurah(id, currentSurahNum) && (reciterSupportsSingleAyah(id) || !!RECITERS[id].surahUrl)", "? reciterOffersSurah(id, currentSurahNum) && reciterSupportsSingleAyah(id)"],
  boxonly: [F, "drillSelectedReciterIds = [...set];\n          const box", "const box"],
  noheight: [F, "#ayahPlayDlg .ayah-copy-box { max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px); }", "#ayahPlayDlg .ayah-copy-box { }"],
  openloop: [F, 'if ((real("#drillModeSelect")?.value ?? "each") === "each" && real("#loopToggle")?.checked) setReal("#loopToggle", "checked", false);\n      paint();', 'paint();'],
  session: [F, "if (isPlaying() || isPaused() || isRunContinuing()) { stopDrill(); stopAudio(); settleListeningSession(\"stopped\"); } else { stopDrill(); stopAudio(); }\n        playDrill({ surahNum: surah, fromAyah: ayah", "if (isPlaying() || isPaused() || isRunContinuing()) { stopDrill(); stopAudio(); settleListeningSession(\"stopped\"); } else { stopDrill(); stopAudio(); }\n        beginListeningSession();\n        playDrill({ surahNum: surah, fromAyah: ayah"],
  nosettle: [F, 'stopDrill(); stopAudio(); settleListeningSession("stopped"); } else { stopDrill(); stopAudio(); }\n        playDrill({ surahNum: surah, fromAyah: ayah', 'stopDrill(); stopAudio(); } else { stopDrill(); stopAudio(); }\n        playDrill({ surahNum: surah, fromAyah: ayah'],
  keeploop: [F, 'if (e.target.value === "each" && real("#loopToggle")?.checked) setReal("#loopToggle", "checked", false);', ''],
  notrap: [F, 'if (e.key !== "Tab") return;\n        // Keep Tab inside the card', 'if (true) return;\n        // Keep Tab inside the card'],
  noloop: [F, '${mode === "whole" ? `<label class="ayah-copy-row ayah-play-loop">', '${false ? `<label class="ayah-copy-row ayah-play-loop">'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error(`promise: ${n}`); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
function wav() {
  const rate = 8000, n = rate * 1, buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(3000 * Math.sin(2 * Math.PI * 440 * i / rate)), 44 + i * 2);
  return buf;
}
const AUDIO = wav();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const sleep = (p, ms) => p.waitForTimeout(ms);
for (const w of [390, 1280]) {
  const tag = `[${w}]`;
  const ctx = await newContext(browser, { banner: false, viewport: { width: w, height: 860 } });
  const hits = [];
  await ctx.route("**/archive.org/**", (r) => r.abort()); // registered FIRST: a later route wins in Playwright, so the one below answers the audio
  await ctx.route("https://archive.org/download/**", (r) => { hits.push(r.request().url()); return r.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "accept-ranges": "bytes", "content-type": "audio/wav" }, body: AUDIO }); });
  if (MUTATE) { const [file, a, b] = MUT[MUTATE]; await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (src.split(a).length !== 2) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }); }); }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 500);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await sleep(page, 150); }
  await page.click("#tabReadBtn"); await sleep(page, 500);
  await page.evaluate(() => { const ss = document.getElementById("surahSelect"); ss.value = "81"; ss.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForFunction(() => !!document.querySelector(".ayah-quick-btn, [data-qm-toggle], .ayah-quick-badge"), null, { timeout: 15000 }).catch(() => {});
  await sleep(page, 900);
  const opened = await page.evaluate(() => { const b = document.querySelector(".ayah-quick-btn, [data-qm-toggle], .ayah-quick-badge"); if (!b) return false; b.click(); return true; });
  await sleep(page, 400);
  check(`${tag} (positive control) the ⋮ menu opens with a Play tile`, opened && (await page.$$("[data-qm-play]")).length > 0);
  await page.evaluate(() => document.querySelector("[data-qm-play]")?.click());
  await sleep(page, 500);
  check(`${tag} ▶ Play opens the play-options card`, !!(await page.$("#ayahPlayDlg [data-play-go]")));
  const hasLoopEach = await page.$("#ayahPlayDlg [data-play-loop]");
  check(`${tag} Loop shows only with Whole Unit (hidden under Each Ayah)`, !hasLoopEach);
  await page.evaluate(() => { const s = document.querySelector("#ayahPlayDlg [data-play-mode]"); if (s) { s.value = "whole"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await sleep(page, 300);
  check(`${tag} Loop shows only with Whole Unit (shown under Whole Unit)`, !!(await page.$("#ayahPlayDlg [data-play-loop]")));
  await page.evaluate(() => { const s = document.querySelector("#ayahPlayDlg [data-play-repeat]"); if (s) { s.value = "3"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await sleep(page, 300);
  const realRepeat = await page.evaluate(() => document.getElementById("drillRepeatSelect")?.value ?? null);
  const realMode = await page.evaluate(() => document.getElementById("drillModeSelect")?.value ?? null);
  check(`${tag} Repeat on the card IS Study options' Repeat (3×)`, realRepeat === "3", String(realRepeat));
  check(`${tag} Mode on the card IS Study options' Mode (Whole Unit)`, realMode === "whole", String(realMode));
  const fits = await page.evaluate(() => { const b = document.querySelector("#ayahPlayDlg .ayah-copy-box")?.getBoundingClientRect(); return !!b && b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight; });
  check(`${tag} the card fits inside the screen`, fits);
  // ---- Codex review (17 Nov 2026): Tab stays inside the card
  await page.evaluate(() => { const b = document.querySelector("#ayahPlayDlg [data-play-go]"); b?.focus(); });
  await page.keyboard.press("Tab"); await sleep(page, 100);
  const inside1 = await page.evaluate(() => !!document.activeElement?.closest("#ayahPlayDlg"));
  await page.evaluate(() => { const f = [...document.querySelectorAll("#ayahPlayDlg button, #ayahPlayDlg input, #ayahPlayDlg select")][0]; f?.focus(); });
  await page.keyboard.press("Shift+Tab"); await sleep(page, 100);
  const inside2 = await page.evaluate(() => !!document.activeElement?.closest("#ayahPlayDlg"));
  check(`${tag} Tab stays inside the card (forwards from the last control, backwards from the first)`, inside1 && inside2, JSON.stringify([inside1, inside2]));
  // ---- a whole-sūrah-only reciter is offered under Whole Unit (and not under Each Ayah)
  const kevanWhole = await page.evaluate(() => [...document.querySelectorAll("#ayahPlayDlg .ayah-play-list label")].some((l) => /Kevan/.test(l.textContent)));
  await page.evaluate(() => { const s = document.querySelector("#ayahPlayDlg [data-play-mode]"); s.value = "each"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await sleep(page, 300);
  const kevanEach = await page.evaluate(() => [...document.querySelectorAll("#ayahPlayDlg .ayah-play-list label")].some((l) => /Kevan/.test(l.textContent)));
  check(`${tag} a whole-sūrah-only reciter is offered under Whole Unit (and not under Each Ayah)`, kevanWhole && !kevanEach, JSON.stringify([kevanWhole, kevanEach]));
  // ---- two ticked reciters both play (Each Ayah): tick Abdullah Basfar and Ibraheem Walk on the card, Repeat 1, Play
  const tick = (label, on) => page.evaluate(([label, on]) => { const l = [...document.querySelectorAll("#ayahPlayDlg .ayah-play-list label")].find((x) => x.textContent.includes(label)); const i = l?.querySelector("input"); if (!i) return false; if (i.checked !== on) { i.checked = on; i.dispatchEvent(new Event("change", { bubbles: true })); } return true; }, [label, on]);
  await page.evaluate(() => { const s = document.querySelector("#ayahPlayDlg [data-play-repeat]"); s.value = "1"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  const a = await tick("Basfar", true), b = await tick("Walk", true);
  hits.length = 0;
  await page.evaluate(() => document.querySelector("#ayahPlayDlg [data-play-go]")?.click());
  await page.waitForFunction(() => true); await sleep(page, 4500);
  const items = [...new Set(hits.map((u) => /download\/([^/]+)\//.exec(u)?.[1]).filter(Boolean))];
  check(`${tag} two ticked reciters both play (positive control: both were offered)`, a && b && items.length >= 2, JSON.stringify([a, b, items]));
  // ---- Stop ends a repeated Each Ayah run: Repeat 5 with one reciter, Stop after the first file, nothing more is asked for
  await page.evaluate(() => { document.getElementById("readStopBtn")?.click(); });
  await sleep(page, 400);
  await page.evaluate(() => document.querySelector("[data-qm-toggle], .ayah-quick-btn, .ayah-quick-badge")?.click()); await sleep(page, 400);
  await page.evaluate(() => document.querySelector("[data-qm-play]")?.click()); await sleep(page, 500);
  await tick("Walk", false); await tick("Basfar", true);
  await page.evaluate(() => { const s = document.querySelector("#ayahPlayDlg [data-play-repeat]"); s.value = "10"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await sleep(page, 200);
  hits.length = 0;
  await page.evaluate(() => document.querySelector("#ayahPlayDlg [data-play-go]")?.click());
  await sleep(page, 1500);
  await page.evaluate(() => document.getElementById("readStopBtn")?.click());
  const atStop = hits.length;
  await sleep(page, 4500);
  check(`${tag} Stop ends a repeated Each Ayah run (no more files asked for after Stop)`, atStop >= 1 && hits.length === atStop, JSON.stringify([atStop, hits.length]));
  // Codex's scenario: after Stop, ANOTHER playback ends; the stopped run must not wake up and start one more file of its own
  hits.length = 0;
  await page.evaluate(() => document.querySelector("[data-qm-toggle], .ayah-quick-btn, .ayah-quick-badge")?.click()); await sleep(page, 400);
  await page.evaluate(() => document.querySelector("[data-qm-play]")?.click()); await sleep(page, 500);
  await page.evaluate(() => { const s = document.querySelector("#ayahPlayDlg [data-play-repeat]"); s.value = "1"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await sleep(page, 200);
  await page.evaluate(() => document.querySelector("#ayahPlayDlg [data-play-go]")?.click());
  await sleep(page, 4500);
  const second = hits.filter((u) => /basfar/.test(u)).length;
  check(`${tag} Stop ends a repeated Each Ayah run for good (a later playback ends and nothing of the stopped run restarts: one file for Repeat 1)`, second === 1, JSON.stringify([second, hits.slice(0, 4)]));
  // ---- a reciter with no hidden Study options box still plays: remove the real box, tick it on a fresh card
  await page.evaluate(() => document.querySelector("[data-qm-toggle], .ayah-quick-btn, .ayah-quick-badge")?.click()); await sleep(page, 400);
  await page.evaluate(() => document.querySelector("[data-qm-play]")?.click()); await sleep(page, 500);
  await tick("Basfar", false);
  await page.evaluate(() => document.querySelectorAll('.drill-reciter-check[value="en_ibraheemwalk"]').forEach((e) => e.remove()));
  await page.evaluate(() => { const s = document.querySelector("#ayahPlayDlg [data-play-repeat]"); s.value = "1"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  const c = await tick("Walk", true);
  hits.length = 0;
  await page.evaluate(() => document.querySelector("#ayahPlayDlg [data-play-go]")?.click());
  await sleep(page, 3000);
  check(`${tag} a reciter with no hidden Study options box still plays (the card writes the shared choice itself)`, c && hits.some((u) => !/basfar/.test(u)) , JSON.stringify([c, hits.slice(0, 3)]));
  // (Play closes the card, so open a fresh one for the checks that follow, and for the Esc check at the end.)
  await page.evaluate(() => document.getElementById("readStopBtn")?.click()); await sleep(page, 300);
  await page.evaluate(() => document.querySelector("[data-qm-toggle], .ayah-quick-btn, .ayah-quick-badge")?.click()); await sleep(page, 400);
  await page.evaluate(() => document.querySelector("[data-qm-play]")?.click()); await sleep(page, 500);
  check(`${tag} (positive control) a fresh card is open for the last checks`, !!(await page.$("#ayahPlayDlg [data-play-go]")));
  // ---- Codex review (17 Nov 2026): listening sessions. These two are read from the page's own source as it is SERVED (the session
  // is internal state the page does not expose), so they are weaker than the behavioural checks above and say so here.
  const served = await page.evaluate(async () => (await fetch("/app/quranrevival.html")).text());
  const handler = (/openAyahPlayDialog[\s\S]*?playDrill\(\{ surahNum: surah, fromAyah: ayah/.exec(served) || [""])[0];
  check(`${tag} Each Ayah starts no listening session (it would be credited to the SELECTED unit, not the clicked ayah)`, handler.length > 500 && !/beginListeningSession\(\)/.test(handler), String(handler.length));
  check(`${tag} a run already sounding is settled before the card's run replaces it`, /isRunContinuing\(\)\) \{ stopDrill\(\); stopAudio\(\); settleListeningSession\("stopped"\);/.test(handler), "settle call missing");
  // ---- Codex review (17 Nov 2026): Loop is cleared when the card goes back to Each Ayah
  await page.evaluate(() => { const s = document.querySelector("#ayahPlayDlg [data-play-mode]"); if (s) { s.value = "whole"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await sleep(page, 250);
  await page.evaluate(() => { const l = document.querySelector("#ayahPlayDlg [data-play-loop]"); if (l) { l.checked = true; l.dispatchEvent(new Event("change", { bubbles: true })); } });
  const loopOn = await page.evaluate(() => !!document.getElementById("loopToggle")?.checked);
  await page.evaluate(() => { const s = document.querySelector("#ayahPlayDlg [data-play-mode]"); if (s) { s.value = "each"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await sleep(page, 250);
  const loopAfter = await page.evaluate(() => !!document.getElementById("loopToggle")?.checked);
  check(`${tag} Loop is cleared when the card goes back to Each Ayah (positive control: it was on under Whole Unit)`, loopOn && !loopAfter, JSON.stringify([loopOn, loopAfter]));
  // ---- Codex review: Loop already ON in Study options with Mode = Each Ayah, then the card is OPENED: Loop is cleared on opening
  await page.keyboard.press("Escape"); await sleep(page, 200);
  await page.evaluate(() => { const m = document.getElementById("drillModeSelect"); m.value = "each"; m.dispatchEvent(new Event("change", { bubbles: true })); const l = document.getElementById("loopToggle"); l.checked = true; l.dispatchEvent(new Event("change", { bubbles: true })); });
  const loopSet = await page.evaluate(() => !!document.getElementById("loopToggle")?.checked);
  await page.evaluate(() => document.querySelector("[data-qm-toggle], .ayah-quick-btn, .ayah-quick-badge")?.click()); await sleep(page, 400);
  await page.evaluate(() => document.querySelector("[data-qm-play]")?.click()); await sleep(page, 600);
  const loopOpened = await page.evaluate(() => !!document.getElementById("loopToggle")?.checked);
  check(`${tag} Loop is cleared when the card opens in Each Ayah (positive control: it was on before)`, loopSet && !loopOpened, JSON.stringify([loopSet, loopOpened]));
  // ---- the card never outgrows a short screen, and Play is reachable
  // (the card is pinned at its size when it opens, so close it, make the screen short, and open a fresh one)
  await page.keyboard.press("Escape"); await sleep(page, 200);
  await page.setViewportSize({ width: w, height: 320 }); await sleep(page, 400);
  await page.evaluate(() => document.querySelector("[data-qm-toggle], .ayah-quick-btn, .ayah-quick-badge")?.click()); await sleep(page, 400);
  await page.evaluate(() => document.querySelector("[data-qm-play]")?.click()); await sleep(page, 600);
  const short = await page.evaluate(() => { const b = document.querySelector("#ayahPlayDlg .ayah-copy-box").getBoundingClientRect(), g = document.querySelector("#ayahPlayDlg [data-play-go]"), body = document.querySelector("#ayahPlayDlg .ayah-copy-body"); g.scrollIntoView({ block: "nearest" }); const r = g.getBoundingClientRect(); return { boxH: Math.round(b.height), vh: innerHeight, playBottom: Math.round(r.bottom), scrolls: body.scrollHeight > body.clientHeight }; });
  check(`${tag} the card never outgrows a short screen (320px tall) and ▶ Play can be reached`, short.boxH <= short.vh && short.playBottom <= short.vh, JSON.stringify(short));
  await page.keyboard.press("Escape"); await sleep(page, 200);
  await page.setViewportSize({ width: w, height: 860 }); await sleep(page, 300);
  await page.evaluate(() => document.querySelector("[data-qm-toggle], .ayah-quick-btn, .ayah-quick-badge")?.click()); await sleep(page, 400);
  await page.evaluate(() => document.querySelector("[data-qm-play]")?.click()); await sleep(page, 600);
  await page.keyboard.press("Escape"); await sleep(page, 200);
  check(`${tag} Esc closes the card`, !(await page.$("#ayahPlayDlg")));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
