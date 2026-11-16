// PCA J117 (the Owner, 16 Nov 2026: "Enable Hadith, Health, Dua also separately installable"): Hadith, Dua and Health
// each install as their own app, with the ONE shared Install button (app/js/install-card.js). On each page:
//   1. the browser parses the page's OWN manifest (name, id = the page, scope /app/, start = the page, standalone), never
//      MMSA's; its three icons and the iPhone icon are served as PNGs of the size they claim;
//   2. no card before the browser offers an install (desktop, not an iPhone);
//   3. when the browser offers it (nothing covers its buttons: the Zab 🧰 corner did on the first run), the offer is kept for our button ONLY together with a visible card (Siyagah's
//      finding: a cancelled offer with no button hides Chrome's own bar): defaultPrevented AND the card on screen, inside
//      the viewport, its buttons >= 40px, at 320 / 390 / 1280;
//   4. Install calls the browser's own prompt and hides the card;
//   5. "Not now" hides it, and the next offer is NOT cancelled (Chrome's own bar stays possible) and shows no card;
//   6. running as the installed app (display-mode standalone): no card, offer not cancelled;
//   7. an iPhone (no install offer): the card shows "How?" and then the Share ▸ Add to Home Screen steps;
//   8. the page in Bangla (<html lang="bn">): the card's words are Bangla, and follow a switch.
// Plus: an MMSA page (quranrevival.html) keeps MMSA's own manifest and loads no install card.
// Chrome's installability-errors call is not used: in the headless shell it cannot fail (qr-verify/install-browser.mjs).
//   node tools/i18n-verify/install-card-browser.mjs          (needs node serve.js on :8080)
//   --prove   runs the mutations below and reports CAUGHT / MISSED:
//     MUT=nobutton  the card is never made visible       -> 3 FAILS (cancelled offer with no visible button)
//     MUT=later     "Not now" is not remembered           -> 5 FAILS
//     MUT=noplace   the card does not move above the Zab   -> 3 FAILS (a button covered)
//     MUT=ownlink   hadith-study.html links MMSA's manifest -> 1 FAILS
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage, BASE } from "./harness.mjs";

if (process.argv.includes("--prove")) {
  let missed = 0;
  for (const m of ["nobutton", "later", "noplace", "ownlink"]) {
    const r = spawnSync(process.execPath, [process.argv[1]], { encoding: "utf8", env: { ...process.env, MUT: m }, timeout: 600000 });
    const ff = (r.stdout || "").split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && ff) console.log(`  CAUGHT  ${m}: ${ff.trim()}`); else { missed++; console.log(`  MISSED  ${m}`); }
  }
  process.exit(missed ? 1 : 0);
}
const MUT = process.env.MUT || "";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok instanceof Promise) throw new Error(`check() was handed a promise: ${name}`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

const APPS = [
  { page: "hadith-study.html", file: "hadith.webmanifest", name: "Hadith Study", short: "Hadith", icon: "hadith" },
  { page: "dua-study.html", file: "dua.webmanifest", name: "Dua Study", short: "Dua", icon: "dua" },
  { page: "health-study.html", file: "health.webmanifest", name: "Health Study", short: "Health", icon: "health" },
];

const mutate = async (ctx) => {
  if (MUT === "nobutton" || MUT === "later" || MUT === "noplace") {
    await ctx.route(`${BASE}/app/js/install-card.js*`, async (r) => {
      const res = await r.fetch();
      let body = await res.text();
      if (MUT === "nobutton") body = body.replace("state.card.hidden = false;", "state.card.hidden = true;");
      if (MUT === "later") body = body.replace("c.querySelector(\".mm-install-no\").addEventListener(\"click\", () => { setLater(state.app.id); hide(); });", "c.querySelector(\".mm-install-no\").addEventListener(\"click\", () => { hide(); });");
      if (MUT === "noplace") body = body.replace("  state.card.hidden = false;\n  place();", "  state.card.hidden = false;");
      await r.fulfill({ response: res, body });
    });
  }
  if (MUT === "ownlink") {
    await ctx.route(`${BASE}/app/hadith-study.html*`, async (r) => {
      const res = await r.fetch();
      await r.fulfill({ response: res, body: (await res.text()).replace("./hadith.webmanifest", "./manifest.webmanifest") });
    });
  }
};

// A browser's install offer, made by hand: the same event name, cancelable, with prompt() and userChoice.
const offer = (page) => page.evaluate(() => {
  const ev = new Event("beforeinstallprompt", { cancelable: true });
  window.__prompted = 0;
  ev.prompt = () => { window.__prompted++; return Promise.resolve(); };
  ev.userChoice = Promise.resolve({ outcome: "accepted" });
  window.dispatchEvent(ev);
  return ev.defaultPrevented;
});
const card = (page) => page.evaluate(() => {
  const c = document.getElementById("mmInstallCard");
  if (!c || c.hidden || getComputedStyle(c).display === "none") return null;
  const r = c.getBoundingClientRect();
  const btns = [...c.querySelectorAll("button")].filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect());
  const ios = c.querySelector(".mm-install-ios");
  return {
    title: c.querySelector(".mm-install-title").textContent, go: c.querySelector(".mm-install-go").textContent,
    no: c.querySelector(".mm-install-no").textContent, ios: ios.hidden ? "" : ios.textContent,
    left: r.left, right: r.right, top: r.top, bottom: r.bottom, vw: innerWidth, vh: innerHeight,
    minBtn: Math.min(...btns.map((b) => b.height)), btnsInside: btns.every((b) => b.left >= r.left && b.right <= r.right + 0.5),
    // Nothing covers any part of a button: the element at its centre, at both ends and at its top and bottom edge is the
    // button itself (the Zab 🧰 corner covered Install's right end, 17 Nov; a centre-only test missed that). The buttons
    // are pills, so the ends are taken half a height in (a point 3px from a corner is outside the pill, on the card).
    covered: [...c.querySelectorAll("button")].filter((b) => b.offsetParent).filter((b) => {
      const q = b.getBoundingClientRect(), mx = q.left + q.width / 2, my = q.top + q.height / 2, h = q.height / 2;
      const pts = [[mx, my], [q.left + h, my], [q.right - h, my], [mx, q.top + 3], [mx, q.bottom - 3]];
      return pts.some(([x, y]) => { const at = document.elementFromPoint(x, y); return !(at === b || b.contains(at)); });
    }).map((b) => b.className),
  };
});
const settle = (page) => page.waitForFunction(() => document.readyState === "complete").then(() => page.waitForTimeout(300));

const browser = await chromium.launch();
try {
  for (const a of APPS) {
    console.log(`== ${a.page}`);
    for (const width of [320, 390, 1280]) {
      const ctx = await newContext(browser, { viewport: { width, height: width === 1280 ? 900 : 760 } });
      await mutate(ctx);
      const { page } = await openPage(ctx, `/app/${a.page}`);
      await settle(page);
      if (width === 390) {
        const cdp = await ctx.newCDPSession(page);
        const m = await cdp.send("Page.getAppManifest");
        let d = null; try { d = JSON.parse(m.data || ""); } catch { /* none */ }
        check(`1 ${a.page} links its OWN manifest ${a.file}, parsed as ${a.name}`, m.url.endsWith(`/app/${a.file}`) && d?.name === a.name && d?.short_name === a.short, `${m.url} ${d?.name}`);
        check(`1 ${a.page}: id and start are the page, scope /app/, standalone`, d?.id === `/app/${a.page}` && d?.start_url === `/app/${a.page}` && d?.scope === "/app/" && d?.display === "standalone", JSON.stringify({ id: d?.id, s: d?.start_url, sc: d?.scope }));
        const icons = await page.evaluate(async (list) => Promise.all(list.map(async ([src, size]) => {
          const r = await fetch(src, { cache: "no-store" });
          const b = new Uint8Array(await r.arrayBuffer());
          const u32 = (i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
          return r.status === 200 && b[1] === 0x50 && `${u32(16)}x${u32(20)}` === size;
        })), [...(d?.icons || []).map((i) => [new URL(i.src, m.url).href, i.sizes]), [new URL(`img/icons/${a.icon}-apple-touch-icon.png`, m.url).href, "180x180"]]);
        check(`1 ${a.page}: three manifest icons and the iPhone icon are served PNGs of their size`, icons.length === 4 && icons.every(Boolean), JSON.stringify(icons));
        const apple = await page.evaluate(() => document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href"));
        check(`1 ${a.page}: the iPhone home-screen icon is the module's own`, apple === `./img/icons/${a.icon}-apple-touch-icon.png`, apple);
      }
      check(`2 ${a.page} @${width}: no card before the browser offers an install`, (await card(page)) === null);
      const prevented = await offer(page);
      const c = await card(page);
      check(`3 ${a.page} @${width}: the offer is kept for our button AND the card is on screen`, prevented && !!c, `prevented=${prevented} card=${!!c}`);
      check(`3 ${a.page} @${width}: the card sits inside the screen, its buttons >= 40px and inside it`, !!c && c.left >= 0 && c.right <= c.vw && c.top >= 0 && c.bottom <= c.vh && c.minBtn >= 40 && c.btnsInside && c.covered.length === 0, JSON.stringify(c));
      check(`3 ${a.page} @${width}: it names the app ("Install ${a.short}") with Install and Not now`, c?.title === `Install ${a.short}` && c?.go === "Install" && c?.no === "Not now", `${c?.title}|${c?.go}|${c?.no}`);
      if (width === 390) {
        await page.screenshot({ path: `${process.env.SHOTS || "/tmp"}/install-card-${a.icon}-390.png` }).catch(() => {});
        await page.click("#mmInstallCard .mm-install-go");
        check(`4 ${a.page}: Install calls the browser's own prompt and hides the card`, (await page.evaluate(() => window.__prompted)) === 1 && (await card(page)) === null);
        // 5. Not now
        await page.reload({ waitUntil: "networkidle" }); await settle(page);
        await offer(page);
        await page.click("#mmInstallCard .mm-install-no");
        check(`5 ${a.page}: Not now hides the card`, (await card(page)) === null);
        await page.reload({ waitUntil: "networkidle" }); await settle(page);
        const again = await offer(page);
        check(`5 ${a.page}: after Not now, the next offer is NOT cancelled (Chrome's own bar stays) and no card shows`, again === false && (await card(page)) === null, `prevented=${again}`);
        // 8. Bangla
        await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("mm_install_later:")) localStorage.removeItem(k); });
        await page.reload({ waitUntil: "networkidle" }); await settle(page);
        await page.evaluate(() => { document.documentElement.lang = "bn"; });
        await offer(page);
        const bn = await card(page);
        check(`8 ${a.page}: in Bangla the card's words are Bangla`, !!bn && bn.go === "ইনস্টল" && bn.no === "এখন নয়" && /ইনস্টল করুন$/.test(bn.title), JSON.stringify(bn?.title));
        await page.evaluate(() => { document.documentElement.lang = "en"; });
        await page.waitForTimeout(100);
        check(`8 ${a.page}: and follow a switch back to English`, (await card(page))?.go === "Install");
      }
      await ctx.close();
    }
    // 6. Standalone
    {
      // Emulation.setEmulatedMedia's display-mode is not honoured by this headless Chromium (measured 17 Nov: still
      // "browser" after it), so the installed app's answer is given to matchMedia itself, before any page script runs.
      const ctx = await newContext(browser, { viewport: { width: 390, height: 760 } });
      await ctx.addInitScript(() => {
        const real = window.matchMedia.bind(window);
        window.matchMedia = (q) => (/display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : real(q));
      });
      const { page } = await openPage(ctx, `/app/${a.page}`);
      await settle(page);
      const std = await page.evaluate(() => matchMedia("(display-mode: standalone)").matches);
      const prevented = await offer(page);
      check(`6 ${a.page}: as the installed app (standalone ${std}) no card, and the offer is not cancelled`, std && !prevented && (await card(page)) === null, `prevented=${prevented}`);
      await ctx.close();
    }
    // 7. iPhone
    {
      const ctx = await newContext(browser, { viewport: { width: 390, height: 760 } });
      await ctx.addInitScript(() => {
        Object.defineProperty(navigator, "userAgent", { get: () => "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
        Object.defineProperty(navigator, "platform", { get: () => "iPhone" });
      });
      await mutate(ctx);
      const { page } = await openPage(ctx, `/app/${a.page}`);
      await settle(page);
      const c = await card(page);
      check(`7 ${a.page}: on an iPhone the card shows "How?" with no browser offer`, c?.go === "How?" && c?.ios === "", JSON.stringify(c?.go));
      if (c) await page.click("#mmInstallCard .mm-install-go");
      const c2 = await card(page);
      check(`7 ${a.page}: How? shows Share ⬆ then Add to Home Screen`, /Share ⬆/.test(c2?.ios || "") && /Add to Home Screen/.test(c2?.ios || ""), c2?.ios);
      await ctx.close();
    }
  }
  // MMSA's own pages keep MMSA's install and no card.
  {
    const ctx = await newContext(browser, { viewport: { width: 390, height: 760 } });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    const cdp = await ctx.newCDPSession(page);
    const m = await cdp.send("Page.getAppManifest");
    const usesCard = await page.evaluate(() => [...document.scripts].some((s) => /install-card\.js/.test(s.src + s.textContent)));
    check("an MMSA page (quranrevival.html) keeps MMSA's own manifest and loads no install card", m.url.endsWith("/app/manifest.webmanifest") && !usesCard, m.url);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(`\ninstall-card-browser: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
