// QR J02 S4: QR's front page (index.html at the site's address; app/index.html is the same file, byte for byte).
// At 390 and 1400, English and Bangla: three large cards that open Quran Study, Asma ul Husna and LDOG; the EN/BN and
// Night/Light switches, stored under MMSA's own keys (mm_app_lang, mm_card_look) so the choice carries into the pages;
// the quiet line to the full Madrasah; no sign-in; tidy (no sideways scroll, every control 40px or more).
//   node tools/apps/qr-verify/front-browser.mjs        (serves itself on PORT, default 8103)
//   SHOTS=<dir>   also saves front-390-en.png and front-1400-bn.png there
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = Number(process.env.PORT) || 8103;
let base = process.env.QR_BASE, server;
let pass = 0, fail = 0;
const check = (ok, what) => { ok ? pass++ : fail++; console.log(`${ok ? "ok  " : "FAIL"} ${what}`); };

check(fs.readFileSync("index.html", "utf8") === fs.readFileSync("app/index.html", "utf8"), "index.html and app/index.html are the same file");

const CARDS = { qfQuran: "/app/quranrevival.html", qfAsma: "/app/asma.html", qfLdog: "/app/ldog-study.html" };
const TITLES = { en: ["Quran Study", "Asma ul Husna", "Learn Deen On-the-Go"], bn: ["কুরআন অধ্যয়ন", "আসমাউল হুসনা", "চলার পথে দ্বীন শিক্ষা"] };
const browser = await chromium.launch();
try {
  for (const width of [390, 1400]) for (const lang of ["en", "bn"]) {
    const tag = `@${width} ${lang}`;
    const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 } });
    await ctx.addInitScript(() => { try { localStorage.setItem("mm_disable_service_worker", "1"); localStorage.setItem("mm_disable_screensaver", "1"); } catch {} });
    const page = await ctx.newPage();
    const errors = [], firebase = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => { if (/firebase|googleapis\.com\/identitytoolkit|securetoken/.test(r.url())) firebase.push(r.url()); });
    for (const path of ["/", "/app/index.html", "/app/"]) {
      const res = await page.goto(base + path, { waitUntil: "load" });
      check(res?.ok(), `${tag} ${path} loads (${res?.status()})`);
    }
    await page.goto(base + "/", { waitUntil: "load" });
    // Choose the language with the switch, the way a reader does.
    await page.click(`[data-lang="${lang === "en" ? "bn" : "en"}"]`);
    await page.click(`[data-lang="${lang}"]`);
    const r = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      stored: localStorage.getItem("mm_app_lang"),
      titles: [...document.querySelectorAll(".qf-card-title")].map((e) => e.textContent.trim()),
      cards: [...document.querySelectorAll(".qf-card")].map((a) => ({ id: a.id, href: new URL(a.href).pathname, w: a.getBoundingClientRect().width, h: a.getBoundingClientRect().height })),
      mmsa: document.getElementById("qfMmsa")?.href,
      small: [...document.querySelectorAll("a, button")].filter((e) => e.getClientRects().length && e.getBoundingClientRect().height < 40).map((e) => e.textContent.trim().slice(0, 20)),
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      signIn: /sign in with|log in/i.test(document.body.innerText) || !!document.querySelector("input[type=password], #who"),
      bg: getComputedStyle(document.body).backgroundColor,
    }));
    check(r.lang === lang && r.stored === lang, `${tag} the language switch sets the page and mm_app_lang (${r.lang}, ${r.stored})`);
    check(JSON.stringify(r.titles) === JSON.stringify(TITLES[lang]), `${tag} three cards: ${r.titles.join(" · ")}`);
    check(r.cards.length === 3 && r.cards.every((c) => CARDS[c.id] === c.href), `${tag} the cards open Quran Study, Asma and LDOG (${r.cards.map((c) => c.href).join(", ")})`);
    const big = width < 600 ? r.cards.every((c) => c.w >= width - 40 && c.h >= 120) : r.cards.every((c) => c.w >= 300 && c.h >= 220) && new Set(r.cards.map((c) => Math.round(c.h))).size === 1;
    check(big, `${tag} the cards are large and even (${r.cards.map((c) => `${Math.round(c.w)}x${Math.round(c.h)}`).join(", ")})`);
    for (const c of r.cards) { const s = await (await fetch(base + c.href)).status; if (s !== 200) check(false, `${tag} ${c.href} exists (${s})`); }
    check(r.mmsa === "https://madrasatul-muslimeen.github.io/", `${tag} the quiet line links the full Madrasah (${r.mmsa})`);
    check(r.small.length === 0, `${tag} every link and button is 40px or taller${r.small.length ? ` (${r.small.join(", ")})` : ""}`);
    check(r.sw <= r.cw, `${tag} no sideways scroll (${r.sw} <= ${r.cw})`);
    check(!r.signIn && firebase.length === 0, `${tag} no sign-in on the front page (${firebase.length} Firebase requests)`);
    check(r.bg && r.bg !== "rgba(0, 0, 0, 0)", `${tag} body has its own background (${r.bg})`);
    // Night is the default; Light, then the choice carries into Asma (and back to Night for the next run).
    const night = await page.evaluate(() => ({ look: document.documentElement.dataset.cardLook, bg: getComputedStyle(document.body).backgroundColor }));
    await page.click('[data-look="light"]');
    const light = await page.evaluate(() => ({ look: document.documentElement.dataset.cardLook, stored: localStorage.getItem("mm_card_look"), bg: getComputedStyle(document.body).backgroundColor, pressed: document.querySelector('[data-look="light"]').getAttribute("aria-pressed") }));
    check(night.look === "night" && light.look === "light" && light.stored === "light" && light.pressed === "true" && light.bg !== night.bg, `${tag} Night/Light switches the look and sets mm_card_look (${night.bg} → ${light.bg})`);
    if (process.env.SHOTS && width === 390 && lang === "en") { await page.click('[data-look="night"]'); await page.screenshot({ path: `${process.env.SHOTS}/front-390-en.png`, fullPage: true }); await page.click('[data-look="light"]'); }
    if (process.env.SHOTS && width === 1400 && lang === "bn") await page.screenshot({ path: `${process.env.SHOTS}/front-1400-bn.png`, fullPage: true });
    await page.click("#qfAsma");
    await page.waitForURL("**/app/asma.html**");
    await page.waitForTimeout(800);
    const asma = await page.evaluate(() => ({ lang: document.documentElement.lang, look: document.documentElement.dataset.cardLook }));
    check(asma.lang === lang && asma.look === "light", `${tag} the choice carries into Asma (${asma.lang}, ${asma.look})`);
    await page.goto(base + "/", { waitUntil: "load" });
    const back = await page.evaluate(() => ({ lang: document.documentElement.lang, look: document.documentElement.dataset.cardLook }));
    check(back.lang === lang && back.look === "light", `${tag} and back on the front page (${back.lang}, ${back.look})`);
    check(errors.length === 0, `${tag} no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  server?.kill();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
