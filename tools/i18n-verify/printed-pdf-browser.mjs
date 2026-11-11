// Printed Mushaf pages as a PDF file (the Owner, 11 Nov 2026, "1A"): Study options -> "Printed pages for offline" -> "PDF file".
//
// Run from the repository root with serve.js up:  node tools/i18n-verify/printed-pdf-browser.mjs
// NEEDS poppler (pdfinfo, pdftotext, pdftoppm) and python3 with Pillow to read the file the way a PDF reader does; it FAILS
// by name when they are missing rather than skipping, so a green run always means the file was really read back.
//   ONE=1 ...           English at 390px only (what the mutations use)
//   MUT=order ...       mutation: the pages are put in the file in reverse order                -> "starts at the right page"
//   MUT=count ...       mutation: the file says one page more than it holds                      -> the page count check
//   MUT=xref ...        mutation: every cross-reference offset is one byte out                   -> the "cross-reference table points at every object" check
//   MUT=nocredit ...    mutation: the credit line is left off the pages                          -> the credit check
//   MUT=nopredictor ... mutation: the picture is stored without the PNG row-filter predictor      -> the rendered-page comparison
//   MUT=nowhite ...     mutation: a transparent non-white palette entry is accepted               -> the refusal check
//   MUT=keeps ...       mutation: making a PDF also keeps the pages in the app                    -> the "keeps nothing" check
//   MUT=noerr ...       mutation: a picture that could not be fetched does not stop the file       -> the "says why" check
// The pictures are the real files from tools/quran-data-pull/output/mushaf-printed/ksu-madani/, answered by this suite
// from disk. What it proves, read back from the real file:
//   1. The PDF part of the box (English and Bangla, 390 and 1280): the size is shown BEFORE, controls >= 40px, inside the
//      card, no sideways scroll.
//   2. "Download PDF" for Juz 1 really downloads a file named Madinah-Mushaf-juz-01.pdf with 21 pages, a valid
//      cross-reference table, "Page 1" first and "Page 21" last, the credit line on every page, and page 5 drawn as the
//      real picture of page 5 (compared with the source PNG, pixel by pixel).
//   3. Juz 2 starts at the right page (22) and the whole Mushaf is 604 pages of about 51 MB.
//   4. A PDF keeps NOTHING in the app (the cache holds no page afterwards).
//   5. Offline with nothing kept, and a page that cannot be fetched: said in words (role=alert), no file is downloaded.
//   6. The writer refuses, by name, a picture it could not draw as it looks (transparent non-white entry, alpha channel, interlaced).
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
const ROOT = process.cwd();
if (!fs.existsSync(path.join(ROOT, "app/apps/msa.json"))) { console.error("run from the repository root"); process.exit(2); }
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (typeof ok === "function") throw new Error(`check "${name}" was handed a function; pass its value`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}
const MUT = process.env.MUT || "";
const restores = [];
function mutate(rel, re, to) {
  const f = path.join(ROOT, rel), keep = fs.readFileSync(f, "utf8");
  let n = 0;
  const next = keep.replace(re, (...a) => (n++, typeof to === "function" ? to(...a) : to));
  console.log(`MUTATION ${MUT}: ${n} replacement(s) in ${rel}`);
  if (!n) throw new Error("mutation matched nothing");
  fs.writeFileSync(f, next);
  restores.push(() => fs.writeFileSync(f, keep));
}
const restoreAll = () => { while (restores.length) restores.pop()(); };
process.on("exit", restoreAll);
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { restoreAll(); process.exit(1); });
const PDFJS = "app/js/printed-pdf.js";
if (MUT === "order") mutate(PDFJS, /pages: pages\.map\(\(p, k\) => \(\{ label: `Page \$\{p\}`, png: pics\[k\] \}\)\), title/g, "pages: pages.map((p, k) => ({ label: `Page ${p}`, png: pics[k] })).reverse(), title");
else if (MUT === "count") mutate(PDFJS, /\/Count \$\{pages\.length\}/g, "/Count ${pages.length + 1}");
else if (MUT === "xref") mutate(PDFJS, /\$\{String\(offsets\[n\]\)\.padStart\(10, "0"\)\}/g, '${String(offsets[n] + 1).padStart(10, "0")}');
else if (MUT === "nocredit") mutate(PDFJS, /\(\$\{pdfText\(`\$\{pg\.label\} \| \$\{credit\}`\)\}\)/g, "(${pdfText(pg.label)})");
else if (MUT === "nopredictor") mutate(PDFJS, /\/Predictor 15 /g, "");
else if (MUT === "nowhite") mutate(PDFJS, /if \(!w\) throw new Error\([^\n]*\n/g, "\n");
else if (MUT === "keeps") mutate(PDFJS, /pics\[k\] = await pagePicture\(pages\[k\], \{ fetchFn \}\);/g, 'pics[k] = await pagePicture(pages[k], { fetchFn }); await (await import("./printed-offline.js")).savePrintedPages({ pages: [pages[k]] });');
else if (MUT === "noerr") mutate(PDFJS, /  if \(firstError\) throw firstError;\n  let blob;/g, "  let blob;");

const PIC = (n) => fs.readFileSync(path.join(ROOT, "tools/quran-data-pull/output/mushaf-printed/ksu-madani", `${String(n).padStart(3, "0")}.png`));
let net = true, failPage = null;
const routePic = (route) => {
  const n = Number(/(\d{3})\.png$/.exec(route.request().url())[1]);
  if (!net || n === failPage) return route.abort();
  return route.fulfill({ status: 200, headers: { "content-type": "image/png", "access-control-allow-origin": "*", "cache-control": "no-store" }, body: PIC(n) });
};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "printed-pdf-"));
const tool = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { return `ERROR ${cmd}: ${e.message}`; } };
const haveTools = ["pdfinfo", "pdftotext", "pdftoppm"].every((c) => !tool(c, ["-v"]).startsWith("ERROR ") || /version/i.test(tool(c, ["-v"])));
const PYCMP = `
import sys
from PIL import Image, ImageChops, ImageStat, ImageFilter
r = Image.open(sys.argv[1]).convert("RGB")
s = Image.open(sys.argv[2]).convert("RGBA"); bg = Image.new("RGBA", s.size, (255,255,255,255)); bg.alpha_composite(s); s = bg.convert("RGB")
r = r.crop((0,0,s.width,s.height))
# a PDF reader smooths a scanned picture a little, so both are blurred the same before they are compared
b = lambda im: im.filter(ImageFilter.GaussianBlur(3))
print(sum(ImageStat.Stat(ImageChops.difference(b(r), b(s))).mean)/3)
`;
check("poppler (pdfinfo, pdftotext, pdftoppm) is installed, so the file can be read back", haveTools, "apt-get install poppler-utils");

/** Everything a PDF reader needs, checked on the raw file: the cross-reference table must point at every object. */
function xrefProblems(file) {
  const buf = fs.readFileSync(file), s = buf.toString("latin1");
  const probs = [];
  if (!s.startsWith("%PDF-1.4")) probs.push("no %PDF header");
  if (!s.trimEnd().endsWith("%%EOF")) probs.push("no %%EOF");
  const sx = /startxref\n(\d+)\n/.exec(s);
  if (!sx) return ["no startxref"];
  if (!s.slice(Number(sx[1]), Number(sx[1]) + 4).startsWith("xref")) probs.push("startxref does not point at xref");
  const m = /xref\n0 (\d+)\n((?:\d{10} \d{5} [nf] \n)+)/.exec(s.slice(Number(sx[1])));
  if (!m) return [...probs, "xref table unreadable"];
  const rows = m[2].trimEnd().split("\n");
  if (rows.length !== Number(m[1])) probs.push(`xref says ${m[1]} entries, has ${rows.length}`);
  rows.forEach((r, n) => { if (n && !s.startsWith(`${n} 0 obj`, Number(r.slice(0, 10)))) probs.push(`object ${n} is not at its offset`); });
  return probs.slice(0, 3);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const passes = process.env.ONE ? [["en", 390]] : [["en", 390], ["bn", 390], ["en", 1280], ["bn", 1280]];
  for (const [lang, width] of passes) {
    const tag = `[${lang} ${width}]`;
    net = true; failPage = null;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, allowServiceWorker: true });
    await ctx.route("**/mushaf-printed/ksu-madani/*.png", routePic);
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await page.click("#tabStudyBtn"); await page.waitForTimeout(200);
    await page.click("#tabStudyOptionsBtn");
    await page.waitForSelector("#printedPdfBtn", { timeout: 15000 });

    // ---- 1. the box
    const sec = await page.evaluate(() => {
      const card = document.getElementById("readingViewCard"), R = (e) => e.getBoundingClientRect();
      const btn = document.getElementById("printedPdfBtn"), sel = document.getElementById("printedPdfScope");
      return { btnText: btn.textContent.trim(), btnH: R(btn).height, selH: R(sel).height, selText: sel.options[sel.selectedIndex].text,
        inside: R(btn).right <= R(card).right + 1 && R(sel).right <= R(card).right + 1, over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    check(`${tag} the PDF choice names Juz 1 with its 21 pages`, /21|২১/.test(sec.selText), sec.selText);
    check(`${tag} the size is shown BEFORE the file is made ("about … MB")`, lang === "bn" ? /প্রায়/.test(sec.btnText) && /এমবি|MB/.test(sec.btnText) : /about [\d.]+ MB/.test(sec.btnText), sec.btnText);
    check(`${tag} button and select are at least 40px tall, inside the card, no sideways scroll`, sec.btnH >= 40 && sec.selH >= 40 && sec.inside && sec.over <= 0, JSON.stringify(sec));
    if (width === 390) { await page.evaluate(() => document.getElementById("printedPdfBtn").scrollIntoView({ block: "center" })); await page.waitForTimeout(200); await page.screenshot({ path: `${process.env.SHOTS || "/tmp"}/printed-pdf-${lang}-${width}.png` }); }

    // ---- 2. Juz 1 downloads a real PDF
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.click("#printedPdfBtn")]);
    const file = path.join(tmp, `${lang}-${width}-` + dl.suggestedFilename());
    await dl.saveAs(file);
    check(`${tag} the file is named Madinah-Mushaf-juz-01.pdf`, dl.suggestedFilename() === "Madinah-Mushaf-juz-01.pdf", dl.suggestedFilename());
    await page.waitForFunction(() => /PDF made:|পিডিএফ তৈরি হয়েছে:/.test(document.getElementById("printedPdfStatus")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
    const st = await page.evaluate(() => document.getElementById("printedPdfStatus")?.textContent ?? "");
    check(`${tag} the box says "PDF made: … (21 pages, size)"`, /21|২১/.test(st) && /MB|এমবি/.test(st) && /Madinah-Mushaf-juz-01\.pdf/.test(st), st);
    if (width === 390 && lang === "en") {
      const probs = xrefProblems(file);
      check(`${tag} MUTATION TARGET (xref): the cross-reference table points at every object`, probs.length === 0, probs.join("; "));
      const info = tool("pdfinfo", [file]);
      check(`${tag} MUTATION TARGET (count): the file holds exactly 21 pages (read by pdfinfo)`, /Pages:\s+21\b/.test(info), info.split("\n").slice(0, 8).join(" | "));
      check(`${tag} each page is the picture plus a 15pt foot (466.5 x 702.75 pt)`, /Page size:\s+466\.5 x 702\.75 pts/.test(info), info.split("\n").find((l) => /Page size/.test(l)));
      const p1 = tool("pdftotext", ["-f", "1", "-l", "1", file, "-"]), p21 = tool("pdftotext", ["-f", "21", "-l", "21", file, "-"]), p9 = tool("pdftotext", ["-f", "9", "-l", "9", file, "-"]);
      check(`${tag} MUTATION TARGET (order): the file starts at page 1 and ends at page 21`, /Page 1\b/.test(p1) && /Page 21\b/.test(p21) && /Page 9\b/.test(p9), JSON.stringify([p1, p21, p9].map((x) => x.slice(0, 20))));
      check(`${tag} MUTATION TARGET (nocredit): the credit line is on every page (King Fahd Complex, King Saud University)`, [p1, p9, p21].every((x) => /King Fahd Complex/.test(x.replace(/\s+/g, " ")) && /King Saud University/.test(x.replace(/\s+/g, " "))), p1.replace(/\s+/g, " ").slice(0, 160));
      tool("pdftoppm", ["-r", "96", "-f", "5", "-l", "5", "-png", file, path.join(tmp, "r5")]);
      const rendered = fs.readdirSync(tmp).find((f) => f.startsWith("r5") && f.endsWith(".png"));
      fs.writeFileSync(path.join(tmp, "src5.png"), PIC(5));
      const diff = rendered ? tool("python3", ["-I", "-c", PYCMP, path.join(tmp, rendered), path.join(tmp, "src5.png")]).trim() : "no render";
      fs.writeFileSync(path.join(tmp, "src6.png"), PIC(6));
      const wrong = rendered ? tool("python3", ["-I", "-c", PYCMP, path.join(tmp, rendered), path.join(tmp, "src6.png")]).trim() : "no render";
      check(`${tag} positive control: the same comparison against the picture of page 6 is far worse (${Number(wrong).toFixed(1)} against ${Number(diff).toFixed(2)})`, Number(wrong) > 10 && Number(wrong) > 3 * Number(diff), `${wrong} vs ${diff}`);
      check(`${tag} MUTATION TARGET (nopredictor): page 5 is drawn as the real picture of page 5 (mean difference ${Number(diff).toFixed(2)} of 255)`, Number.isFinite(Number(diff)) && Number(diff) < 5, diff);
    }

    // ---- 4. a PDF keeps nothing in the app
    const kept = await page.evaluate(async () => (await (await caches.open("mm-printed-v1")).keys()).length);
    check(`${tag} MUTATION TARGET (keeps): making a PDF keeps NOTHING in the app`, kept === 0, `kept ${kept}`);

    // ---- 5. failures: said in words, no file
    let downloads = 0; page.on("download", () => { downloads++; });
    failPage = 8;
    await page.click("#printedPdfBtn");
    await page.waitForFunction(() => /Could not make the PDF|পিডিএফ বানানো যায়নি/.test(document.getElementById("printedPdfStatus")?.textContent ?? ""), null, { timeout: 30000 }).catch(() => {});
    const bad = await page.evaluate(() => ({ text: document.getElementById("printedPdfStatus")?.textContent ?? "", role: document.getElementById("printedPdfStatus")?.getAttribute("role") }));
    check(`${tag} MUTATION TARGET (noerr): a picture that cannot be fetched is said in words (role=alert) with the reason`, /picture server|ছবির সার্ভার/.test(bad.text) && bad.role === "alert", JSON.stringify(bad));
    await page.waitForTimeout(400);
    check(`${tag} a failed PDF downloads no file`, downloads === 0, `downloads ${downloads}`);
    failPage = null;
    await page.selectOption("#printedPdfScope", "juz"); // clears the old message, so the next one is not the stale one
    await ctx.setOffline(true); net = false;
    await page.evaluate(() => Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false })); // the harness does not flip it; a real cut does
    await page.click("#printedPdfBtn");
    await page.waitForFunction(() => /needs the internet|ইন্টারনেট লাগে|Could not make the PDF|পিডিএফ বানানো যায়নি/.test(document.getElementById("printedPdfStatus")?.textContent ?? ""), null, { timeout: 30000 }).catch(() => {});
    const off = await page.evaluate(() => ({ text: document.getElementById("printedPdfStatus")?.textContent ?? "", role: document.getElementById("printedPdfStatus")?.getAttribute("role") }));
    check(`${tag} offline with nothing kept: the PDF says it needs the internet (role=alert), no file`, /internet|ইন্টারনেট/.test(off.text) && off.role === "alert" && downloads === 0, JSON.stringify(off));
    await ctx.setOffline(false); net = true;
    await page.evaluate(() => { delete navigator.onLine; });

    // ---- 3 and 6, once, in the page itself
    if (width === 390 && lang === "en") {
      const juz2 = await page.evaluate(async () => {
        const m = await import("/app/js/printed-pdf.js");
        let blob; const pages = Array.from({ length: 20 }, (_, i) => 22 + i);
        await m.downloadPrintedPdf({ pages, filename: "j2.pdf", saveFn: (b) => { blob = b; } });
        return Array.from(new Uint8Array(await blob.arrayBuffer())).map((b) => String.fromCharCode(b)).join("");
      });
      fs.writeFileSync(path.join(tmp, "j2.pdf"), Buffer.from(juz2, "latin1"));
      const j2 = tool("pdftotext", ["-f", "1", "-l", "1", path.join(tmp, "j2.pdf"), "-"]);
      check(`${tag} Juz 2 starts at page 22 (the right page) and holds 20 pages`, /Page 22\b/.test(j2) && /Pages:\s+20\b/.test(tool("pdfinfo", [path.join(tmp, "j2.pdf")])), j2.slice(0, 40));
      const whole = await page.evaluate(async () => {
        const m = await import("/app/js/printed-pdf.js");
        let blob; const pages = Array.from({ length: 604 }, (_, i) => 1 + i);
        await m.downloadPrintedPdf({ pages, filename: "all.pdf", saveFn: (b) => { blob = b; } });
        return { size: blob.size, head: await blob.slice(0, 12000).text() };
      });
      check(`${tag} the whole Mushaf is 604 pages, about 51 MB`, /\/Count 604\b/.test(whole.head) && whole.size > 50e6 && whole.size < 54e6, `${whole.size}`);
      const refused = await page.evaluate(async () => {
        const m = await import("/app/js/printed-pdf.js");
        const png = new Uint8Array(await (await fetch("/tools/quran-data-pull/output/mushaf-printed/ksu-madani/001.png")).arrayBuffer());
        const find = (type) => { for (let i = 8; i + 8 < png.length;) { const len = (png[i] << 24 | png[i + 1] << 16 | png[i + 2] << 8 | png[i + 3]) >>> 0, ty = String.fromCharCode(...png.subarray(i + 4, i + 8)); if (ty === type) return i + 8; i += 12 + len; } return -1; };
        const tryBuild = (bytes) => { try { m.buildPdf({ pages: [{ label: "x", png: bytes }] }); return "built"; } catch (e) { return e.message; } };
        const out = {};
        const a = png.slice(); const plte = find("PLTE"), trns = find("tRNS"); let idx = -1; for (let k = 0; k < 8; k++) if (a[trns + k] === 0) idx = k;
        a[plte + idx * 3] = 0; out.nonWhite = tryBuild(a);
        const b = png.slice(); b[find("IHDR") + 9] = 6; out.alpha = tryBuild(b);
        const c = png.slice(); c[find("IHDR") + 12] = 1; out.interlaced = tryBuild(c);
        out.clean = tryBuild(png); out.junk = tryBuild(new Uint8Array(40));
        return out;
      });
      check(`${tag} positive control: the real picture builds`, refused.clean === "built", JSON.stringify(refused));
      check(`${tag} MUTATION TARGET (nowhite): a transparent entry that is not white is refused by name`, /transparent and not white/.test(refused.nonWhite), refused.nonWhite);
      check(`${tag} a picture with an alpha channel, an interlaced one and a non-PNG are refused by name`, /colour type 6/.test(refused.alpha) && /interlaced/.test(refused.interlaced) && /not a PNG/.test(refused.junk), JSON.stringify(refused));
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  restoreAll();
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
