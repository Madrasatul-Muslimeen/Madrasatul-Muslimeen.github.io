// Audit part 43 (PCF MSA J29): the tool and admin pages after the new windows (J74) and the – chip (v12.25).
//   control    the detectors find a seeded cut-off button, covered button, short ← Back, grey-on-white text and sideways scroll
//   <page>     import, backup, dawah, monitor, homework, people, onboarding, accept-invite, about: each opened directly and as a
//              window (?inWindow=1), its main action asserted from the rendered page or the stub's write log, then the five detectors
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part43-tool-pages-browser.mjs [--only=<page>] [--width=N] [--lang=en|bn] [--look=night|light] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; if (!process.argv.includes("--quiet")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang"), KONLY = arg("look");
// name: [file, route glob, anchor (exactly once), replacement]. Each puts one fix back to the old code.
const MUTATIONS = {
  acceptrole: ["app/accept-invite.html", "**/accept-invite.html*", "role: roleText(invite.role)", "role: invite.role"],
  dawahheading: ["app/css/card-look.css", "**/css/card-look.css*", "/* Audit part 43: .status-group-heading sits", "[data-card-look=\"night\"] .status-group-heading { color: var(--card-text-muted); border-color: var(--card-line); }\n/* "],
  monthfield: ["app/css/admin-touch.css", "**/css/admin-touch.css*", "body.admin-touch input[type=\"month\"],", ""],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

// ---- in the page: one measurement of everything on screen -------------------------------------------------------------
function measure(scope) {
  const vw = innerWidth;
  const out = { over: document.documentElement.scrollWidth - vw, cut: [], covered: [], backSmall: [], small: [], contrast: [], nCtl: 0, nText: 0 };
  const desc = (e) => (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : "") + ":" + (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 18)).slice(0, 60);
  const folded = (e) => { for (let d = e.closest("details"); d; d = d.parentElement && d.parentElement.closest("details")) { if (!d.open && !(e.closest("summary") && e.closest("summary").parentElement === d)) return true; } return false; };
  const vis = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none" && !e.closest("[hidden]") && !folded(e); };
  const sx = scrollX, sy = scrollY;
  const ctl = [...document.querySelectorAll("button, a[href], select, summary, input:not([type=hidden]), textarea")].filter(vis);
  for (const e of ctl) {
    if (e.closest("#zabCorner, #zabBar, #zabPanel")) continue;
    if (scope && !e.closest(scope)) continue;
    out.nCtl++;
    let r = e.getBoundingClientRect();
    // a control inside its own sideways-scrolling box (a wide table, #293) is reachable by scrolling that box
    const scrolls = (() => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if ((o === "auto" || o === "scroll") && a.scrollWidth > a.clientWidth) return true; } return false; })();
    if (!scrolls && (r.right > vw + 1 || r.left < -1)) out.cut.push(desc(e) + ` [${Math.round(r.left)},${Math.round(r.right)}]`);
    if (/^←/.test((e.textContent || "").trim()) && r.height < 39.5) out.backSmall.push(desc(e) + ` h=${Math.round(r.height)}`);
    // a finger control: buttons, selects, summaries (not text links inside prose, not checkboxes/radios)
    const isFinger = e.matches("button, select, summary") || (e.matches("input") && !/^(checkbox|radio|file)$/.test(e.type)) || (e.matches("a") && e.matches(".btn, .button, [class*=btn]"));
    if (isFinger && Math.min(r.height, 1e9) < 39.5) out.small.push(desc(e) + ` h=${Math.round(r.height)}`);
    e.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    r = e.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > vw) continue;
    const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1), y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
    const at = document.elementFromPoint(x, y);
    if (!at || at === e || e.contains(at) || at.contains(e) || (e.labels && [...e.labels].some((l) => l.contains(at)))) continue;
    out.covered.push(desc(e) + " under " + desc(at));
  }
  scrollTo(sx, sy);
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => {
    const chain = []; for (let n = el; n; n = n.parentElement) chain.push(n);
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = chain.length - 1; i >= 0; i--) {
      const cs = getComputedStyle(chain[i]);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const c = parse(cs.backgroundColor); if (c && c.a > 0) base = over(c, base);
    }
    return base;
  };
  const seen = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const e = n.parentElement; if (!e || seen.has(e) || !vis(e)) continue;
    if (e.closest("script, style, option, svg, canvas, [disabled], [aria-disabled=true], #zabCorner, #zabBar, #zabPanel")) continue;
    seen.add(e); out.nText++;
    const cs = getComputedStyle(e);
    const bg = bgOf(e); if (!bg) continue;
    let fg = parse(cs.color); if (!fg) continue;
    let op = 1; for (let a = e; a; a = a.parentElement) op *= Number(getComputedStyle(a).opacity);
    fg = over({ ...fg, a: fg.a * op }, bg);
    const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    const rr = ratio(fg, bg);
    if (rr < need) out.contrast.push(`${desc(e)} ${rr.toFixed(2)}<${need} (${cs.color} on rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)}))`);
  }
  for (const k of ["cut", "covered", "backSmall", "small", "contrast"]) out[k] = [...new Set(out[k])];
  return out;
}
// English left on a page opened in Bangla: visible Latin words of 4+ letters, minus proper names the page may keep.
const PROPER = /^(Mapping|Journey|WordPress|Evernote|Google|Zab|Quran|Qur|Tools|Export|content|CSV|HTML|enex|XML|Madrasatul|Muslimeen|MSA|Ahsan|Maryam|Yusuf|Zayd|Seeded|Fatiha|Surah|Allah|Ikhlas|Kursi|Invitee|Test|Parent|example|invited|smahk|gmail|json|Ref|Hadith|Dawah|Asma|Husna|QuranRevival|Foundation|OpenITI|Open|Islamicate|Texts|Initiative|Learn|next|backup|quranrevival|gone|Memorise|Doing|well|tajweed|printable|page|body|text|note|without|reference)$/i;
function latinLeft() {
  const out = new Set(), seen = new Set();
  const vis = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none' && !e.closest('[hidden]'); };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const e = n.parentElement; if (!e || seen.has(e) || !vis(e) || e.closest('script, style, code, #zabCorner, #zabBar, #zabPanel, [lang=en], [data-i18n-skip]' + (window.__latinSkip ? ', ' + window.__latinSkip : ''))) continue;
    for (const m of n.nodeValue.matchAll(/[A-Za-z]{4,}/g)) if (!PROPER.test(m[0]) && !/^(https?|www)$/i.test(m[0])) out.add(m[0] + ' in ' + e.tagName.toLowerCase() + (e.id ? '#' + e.id : ''));
  }
  return [...out];
}
const LATIN_SRC = latinLeft.toString();
const PROPER_SRC = PROPER.toString();
const MEASURE_SRC = measure.toString();

const settle = (p, ms = 350) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource|\[write failure\]|denied by the test/i.test(e));
const visible = (p, sel) => ev(p, (s) => [...document.querySelectorAll(s)].some((e) => { const b = e.getBoundingClientRect(), c = getComputedStyle(e); return b.width > 0 && b.height > 0 && c.visibility !== "hidden" && c.display !== "none" && !e.closest("[hidden]"); }), sel);
/** A wait is a named state; a timeout fails by name. */
async function until(name, fn, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 100)); }
  console.log(`  TIMEOUT  waiting for: ${name}`);
  return false;
}

/** Judge one state: it must really be on screen (positive control), then the detectors. */
async function state(t, p, label, mustSee, only = {}) {
  const tt = `${t}: ${label}`;
  const seen = await visible(p, mustSee);
  check(`${tt}: POSITIVE CONTROL it is on screen (${mustSee})`, seen);
  if (!seen) return null;
  const m = await p.evaluate(`(${MEASURE_SRC})(${JSON.stringify(only.scope || null)})`);
  check(`${tt}: ${m.nCtl} controls and ${m.nText} texts were measured`, m.nCtl > 0 && m.nText > 0, JSON.stringify({ n: m.nCtl, t: m.nText }));
  check(`${tt}: no sideways scroll`, m.over <= 0, `scrollWidth - innerWidth = ${m.over}`);
  check(`${tt}: no control cut off at the screen edge`, m.cut.length === 0, m.cut.slice(0, 5).join(" | "));
  check(`${tt}: no control covered by something else`, m.covered.length === 0, m.covered.slice(0, 5).join(" | "));
  check(`${tt}: every ← Back is 40px or taller`, m.backSmall.length === 0, m.backSmall.slice(0, 5).join(" | "));
  check(`${tt}: every finger control is 40px or taller`, m.small.length === 0, m.small.slice(0, 6).join(" | "));
  check(`${tt}: text colour 4.5:1 against its real background`, m.contrast.length === 0, m.contrast.slice(0, 6).join(" | "));
  if (t.startsWith("bn ")) {
    await p.evaluate((k) => { window.__latinSkip = k; }, only.latinSkip || "");
    const left = await p.evaluate(`(() => { const PROPER = ${PROPER_SRC}; return (${LATIN_SRC})(); })()`);
    check(`${tt}: no English left on the Bangla page (proper names aside)`, left.length === 0, left.slice(0, 8).join(" | "));
  }
  return m;
}

// ---- opening a page ---------------------------------------------------------------------------------------------------
const TS = "2026-01-01T00:00:00.000Z";
const SEED = `window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;`;

async function open(lang, look, width, height, pagePath, extraSeedJs = "") {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: SEED + extraSeedJs });
  await ctx.route((u) => ![new URL(BASE).hostname, "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  await ctx.addInitScript((lk) => { try { localStorage.setItem("mm_card_look", lk); } catch { /* */ } }, look);
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css; charset=utf-8" : file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, look, width, pagePath, fn, seed = "") {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const height = width < 600 ? 844 : width < 1000 ? 1024 : width > 1400 ? 900 : 800;
  const tag = `${lang} ${look} ${width}x${height} ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, look, width, height, pagePath, seed), new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT opening the page")), 45000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT in the flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}

// ---- the pages -------------------------------------------------------------------------------------------------------
// file, what must be on screen, per-page main action (optional)
const acceptSeed = `DATA.inviteTokens = [{ _id: "tok1", tenantId: "t1", email: "smahk9@gmail.com" }]; DATA.tenantInvites = [...(DATA.tenantInvites ?? []), { _id: "t1__smahk9@gmail.com", tenantId: "t1", email: "smahk9@gmail.com", role: "teacher", status: "pending" }];`;
const PAGES = {
  about: { file: "about.html", see: "h1", latinSkip: "td" },
  backup: { file: "backup.html", see: "h1" },
  import: { file: "import-notes.html", see: "h1" },
  dawah: { file: "dawah.html", see: "h1", seed: "@dawahSeed" },
  monitor: { file: "monitor.html", see: "h1" },
  homework: { file: "homework.html", see: "h1" },
  people: { file: "people.html", see: "h1" },
  onboarding: { file: "onboarding.html", see: "h1" },
  accept: { file: "accept-invite.html?token=tok1", see: "h1", seed: "@acceptSeed" },
};
const wrote = (p, col) => ev(p, (c) => (window.__stubWriteData || []).filter((r) => r.col === c).length, col);
const writes = (p, col) => ev(p, (c) => (window.__stubWriteData || []).filter((r) => r.col === c), col);
/** Words on screen after a failed write (I15): the global banner or the page's own result box, non-empty and visible. */
const failureWords = (p) => ev(p, () => [...document.querySelectorAll("#qr-write-failure-banner, #result, #createResult, #noteResult, #familyResult, #resultLine, .warn")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== "none" && (e.textContent || "").trim().length > 5; }).map((e) => e.textContent.trim().slice(0, 80)));
const failWrites = (p) => ev(p, () => { window.__stubFailWrites = true; window.__stubFailTx = true; window.__stubFailBatch = true; });
const ok = (p) => ev(p, () => { window.__stubFailWrites = false; window.__stubFailTx = false; window.__stubFailBatch = false; });
var dawahSeed = `DATA.dawahPages = [{ _id: "t1__d1", pageId: "d1", tenantId: "t1", authorPersonId: "p1", authorUid: "test-uid", status: "draft", title: "Seeded printable page", bodyHtml: "<p>Seeded dawah body text</p>", sourceUnitKey: "ayah:2:256", schemaVersion: 1, createdAt: "${TS}", updatedAt: "${TS}", createdBy: "test-uid" }];`;
const wxr = `<?xml version="1.0"?><rss xmlns:wp="x"><channel><wp:category><wp:term_id>1</wp:term_id><wp:category_nicename>fiqh</wp:category_nicename><wp:cat_name>Fiqh</wp:cat_name></wp:category>
<item><title>2:255 Ayat al-Kursi</title><link>http://x/1</link><wp:post_id>11</wp:post_id><wp:post_date_gmt>2020-01-01 00:00:00</wp:post_date_gmt><wp:post_type>post</wp:post_type><wp:status>publish</wp:status><category domain="category" nicename="fiqh">Fiqh</category><content:encoded><![CDATA[<p>The throne verse.</p>]]></content:encoded></item>
<item><title>A note without a reference</title><link>http://x/2</link><wp:post_id>12</wp:post_id><wp:post_date_gmt>2020-01-02 00:00:00</wp:post_date_gmt><wp:post_type>post</wp:post_type><wp:status>publish</wp:status><content:encoded><![CDATA[<p>Plain words.</p>]]></content:encoded></item></channel></rss>`;
const ACTIONS = {
  about: async (t, p) => {
    const n = await ev(p, () => document.body.innerText.length);
    check(`${t}: the page lists what the app has (text on screen)`, n > 500, String(n));
  },
  backup: async (t, p) => {
    await ev(p, () => document.getElementById("makeBtn").click());
    const done = await until("the backup link appears", () => visible(p, "#result a.download-link"), 20000);
    check(`${t}: Make the backup gives a Save link and counts`, done);
    if (!done) return;
    const info = await ev(p, () => ({ href: document.querySelector("#result a.download-link").getAttribute("download"), stats: document.querySelectorAll("#result .stat").length, people: document.querySelector("#result .stat")?.textContent }));
    check(`${t}: the file is an .html backup and the counts are shown (${info.stats})`, /\.html$/.test(info.href || "") && info.stats >= 5, JSON.stringify(info));
    await state(t, p, "after the backup is made", "#result a.download-link");
  },
  import: async (t, p) => {
    await p.setInputFiles("#fileInput", { name: "export.xml", mimeType: "text/xml", buffer: Buffer.from(wxr) });
    const prev = await until("the preview shows", () => visible(p, "#previewSection"), 15000);
    check(`${t}: choosing a WordPress file shows its preview`, prev);
    if (!prev) return;
    const stat = await ev(p, () => ({ notes: document.getElementById("statNotes").textContent.trim(), folders: document.getElementById("statFolders").textContent.trim() }));
    check(`${t}: the preview counts the two posts as Notes`, /^(2|২)$/.test(stat.notes), JSON.stringify(stat));
    await state(t, p, "with the preview", "#previewSection");
    const before = await wrote(p, "notes");
    await ev(p, () => document.getElementById("importBtn").click());
    await settle(p, 1500);
    const words = await ev(p, () => { const r = document.getElementById("resultLine"), g = document.getElementById("gateNotice"); return { result: getComputedStyle(r).display !== "none" ? r.textContent.trim() : "", gate: getComputedStyle(g).display !== "none" ? g.textContent.trim() : "" }; });
    const after = await wrote(p, "notes");
    check(`${t}: pressing Import either creates Notes in the stub or says in words why not (gate: "${words.gate.slice(0, 50)}")`, after > before || words.result.length > 5 || words.gate.length > 5, JSON.stringify({ before, after, words }));
  },
  dawah: async (t, p) => {
    check(`${t}: the seeded page is listed`, await until("the seeded page card", () => visible(p, '[data-page-id="d1"]'), 10000));
    await ev(p, () => document.querySelector('[data-page-id="d1"] [data-page-toggle]').click());
    await settle(p, 300);
    check(`${t}: opening it shows the Note's text`, /Seeded dawah body text/.test(await ev(p, () => document.querySelector('[data-page-id="d1"] [data-page-body]')?.innerText || "")));
    await state(t, p, "page opened", '[data-page-id="d1"] [data-page-body]');
    await ev(p, () => { window.__printed = 0; window.print = () => { window.__printed++; }; document.querySelector('[data-page-id="d1"] [data-page-print]').click(); });
    const pr = await ev(p, () => ({ n: window.__printed, h: document.getElementById("printArea").innerText }));
    check(`${t}: Print fills the printable area with the title and the text and asks to print`, pr.n === 1 && /Seeded printable page/.test(pr.h) && /Seeded dawah body text/.test(pr.h), JSON.stringify(pr));
    await failWrites(p);
    await ev(p, () => document.querySelector('[data-page-id="d1"] [data-page-submit]').click());
    await settle(p, 800);
    const w = await failureWords(p);
    check(`${t}: a failed Share reaches the reader in words (I15)`, w.length > 0, JSON.stringify(w));
    await ok(p);
  },
  monitor: async (t, p) => {
    const rows = await ev(p, () => ({ tr: document.querySelectorAll("#reportBody tr").length, txt: document.getElementById("reportBody").innerText }));
    check(`${t}: the week's report shows the seeded rows (${rows.tr} table rows)`, rows.tr >= 6 && /Ahsan|আহসান/.test(rows.txt), rows.txt.slice(0, 120));
    const dl = await Promise.all([p.waitForEvent("download", { timeout: 8000 }).catch(() => null), ev(p, () => document.getElementById("csvBtn").click())]).then((x) => x[0]);
    check(`${t}: Download CSV gives a file`, !!dl);
    if (dl) { const text = fs.readFileSync(await dl.path(), "utf8"); check(`${t}: the CSV holds the seeded rows (${text.split("\n").length} lines)`, /Ahsan|আহসান/.test(text) && text.trim().split("\n").length >= 3, text.slice(0, 150)); }
    await ev(p, () => { window.__opened = ""; window.open = () => ({ document: { write: (h) => { window.__opened += h; }, close() {} }, focus() {}, print() {}, close() {} }); document.getElementById("printBtn").click(); });
    const printed = await ev(p, () => window.__opened);
    check(`${t}: Print opens a printable copy that holds the seeded rows`, /Ahsan|আহসান/.test(printed) && /<table/.test(printed), printed.slice(0, 100));
    const lbl = await ev(p, () => document.getElementById("rangeLabel").textContent);
    await ev(p, () => document.getElementById("monthTabBtn").click());
    await settle(p, 600);
    const lbl2 = await ev(p, () => document.getElementById("rangeLabel").textContent);
    check(`${t}: the Month tab changes the range label`, lbl !== lbl2, `${lbl} -> ${lbl2}`);
    await state(t, p, "month tab", "#reportBody");
  },
  homework: async (t, p) => {
    check(`${t}: the seeded assignment is listed`, /Memorise Surah Al-Fatiha|সূরা/.test(await ev(p, () => document.getElementById("assignmentsBody").innerText)) || /Fatiha/i.test(await ev(p, () => document.getElementById("assignmentsBody").innerText)));
    await ev(p, () => { document.querySelector("#assignToChecks input")?.click(); document.getElementById("instructionsInput").value = "Read Surah Al-Ikhlas twice"; });
    const before = await wrote(p, "assignments");
    await ev(p, () => document.getElementById("createAssignmentBtn").click());
    await settle(p, 1200);
    const res = await ev(p, () => { const r = document.getElementById("createResult"); return { cls: r.className, txt: r.textContent.trim(), disp: getComputedStyle(r).display }; });
    check(`${t}: Create assignment says it was created (${res.txt.slice(0, 50)})`, res.disp !== "none" && res.txt.length > 3 && !/fail/.test(res.cls), JSON.stringify(res));
    check(`${t}: the stub received an assignment write`, (await ev(p, () => (window.__stubWriteData || []).length)) > 0, JSON.stringify(await ev(p, () => (window.__stubWriteData || []).map((x) => x.col))));
    await failWrites(p);
    await ev(p, () => { document.querySelector("#assignToChecks input")?.click(); document.getElementById("instructionsInput").value = "Second"; document.getElementById("createAssignmentBtn").click(); });
    await settle(p, 1000);
    const w = await failureWords(p);
    check(`${t}: a failed Create reaches the reader in words (I15)`, w.length > 0, JSON.stringify(w));
    await ok(p);
  },
  people: async (t, p) => {
    await ev(p, () => { document.getElementById("name").value = "Yusuf"; document.getElementById("birthYear").value = "2015"; });
    await ev(p, () => document.querySelector('input[name="role"][value="student"]').click());
    const before = await wrote(p, "tenantPeople");
    await ev(p, () => document.getElementById("addBtn").click());
    await until("the add result shows", () => visible(p, "#result.ok"), 8000);
    const r = await ev(p, () => ({ txt: document.getElementById("result").textContent, row: [...document.querySelectorAll("#rosterBody tr")].map((x) => x.innerText).filter((x) => /Yusuf/.test(x)) }));
    check(`${t}: Add person says "Added" with an id`, /Added|যোগ/.test(r.txt), r.txt);
    check(`${t}: the write carried the year of birth to the stub`, (await writes(p, "tenantPeople")).some((w) => /Yusuf/.test(JSON.stringify(w.data)) && /2015/.test(JSON.stringify(w.data))), JSON.stringify(await ev(p, () => (window.__stubWriteData || []).map((x) => x.col))));
    await failWrites(p);
    await ev(p, () => { document.getElementById("name").value = "Fails"; document.getElementById("addBtn").click(); });
    await settle(p, 1000);
    const w = await failureWords(p);
    check(`${t}: a failed Add reaches the reader in words (I15)`, w.length > 0 && !/Added/.test(w.join(" ")), JSON.stringify(w));
    await ok(p);
  },
  onboarding: async (t, p) => {
    await ev(p, () => { document.querySelector('input[name="tenantType"][value="family"]').click(); document.getElementById("name").value = "Test Parent"; });
    await ev(p, () => document.getElementById("createBtn").click());
    const fam = await until("the family step opens", () => visible(p, "#familyStep"), 10000);
    check(`${t}: choosing My family and Create opens Step 2 (family members)`, fam);
    if (!fam) return;
    await ev(p, () => { const n = document.getElementById("famName0"), y = document.getElementById("famYear0"); n.value = "Zayd"; n.dispatchEvent(new Event("input", { bubbles: true })); y.value = "2016"; y.dispatchEvent(new Event("input", { bubbles: true })); });
    const age = await ev(p, () => document.querySelector("[data-fam-age]").textContent);
    check(`${t}: a year of birth shows an age and ticks "child"`, age !== "—" && (await ev(p, () => document.querySelector('[data-fam-k="child"]').checked)), age);
    await state(t, p, "family step", "#familyStep");
    await ev(p, () => document.getElementById("familySave").click());
    await settle(p, 1500);
    check(`${t}: Save and continue says what happened`, (await ev(p, () => document.getElementById("familyResult").textContent.trim())).length > 3);
  },
  accept: async (t, p) => {
    check(`${t}: with a valid token the invite is described and Accept is offered`, await until("accept area", () => visible(p, "#acceptArea"), 10000));
    await state(t, p, "invite ready", "#acceptArea");
    await ev(p, () => { document.getElementById("name").value = "Invitee"; });
    await failWrites(p);
    await ev(p, () => document.getElementById("acceptBtn").click());
    await settle(p, 1200);
    const w = await ev(p, () => document.getElementById("box").textContent.trim());
    check(`${t}: a failed Accept reaches the reader in words (I15)`, w.length > 10 && /fail/.test(await ev(p, () => document.getElementById("box").className)), w);
    await ok(p);
  },
};

function pageFlow(key) {
  const def = PAGES[key];
  return async (t, p, errors) => {
    await until("the page heading shows", () => visible(p, def.see), 20000);
    await settle(p, 700);
    await state(t, p, "first screen", def.see, { latinSkip: def.latinSkip });
    if (ACTIONS[key]) await ACTIONS[key](t, p, errors);
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  };
}

// ---- the detectors prove themselves -------------------------------------------------------------------------------------
if (!ONLY || ONLY.split(",").includes("control")) await flow("control", "en", "night", 390, "/app/about.html", async (t, p) => {
  await ev(p, () => {
    const d = document.createElement("div");
    d.innerHTML = '<button id="c1" style="position:absolute;left:-80px;top:300px;width:60px;height:44px">cut</button>'
      + '<button id="c2" style="position:absolute;left:100px;top:360px;width:90px;height:44px">covered</button><div id="c2x" style="position:absolute;left:90px;top:350px;width:120px;height:70px;background:#fff;z-index:99999"></div>'
      + '<button id="c3" style="position:absolute;left:10px;top:440px;height:30px">← Back</button>'
      + '<p id="c4" style="position:absolute;left:10px;top:500px;margin:0;background:#fff;color:#999">grey on white</p>'
      + '<div id="c5" style="position:absolute;left:0;top:560px;width:2000px;height:10px"></div>';
    document.body.appendChild(d);
  });
  const m = await p.evaluate(`(${MEASURE_SRC})()`);
  check(`${t}: POSITIVE CONTROL a button off the left edge is found`, m.cut.some((x) => x.includes("#c1")), JSON.stringify(m.cut));
  check(`${t}: POSITIVE CONTROL a covered button is found`, m.covered.some((x) => x.includes("#c2")), JSON.stringify(m.covered));
  check(`${t}: POSITIVE CONTROL a 30px ← Back is found`, m.backSmall.some((x) => x.includes("#c3")), JSON.stringify(m.backSmall));
  check(`${t}: POSITIVE CONTROL a 30px button is found as a small finger control`, m.small.some((x) => x.includes("#c3")), JSON.stringify(m.small));
  check(`${t}: POSITIVE CONTROL grey #999 on white is found`, m.contrast.some((x) => x.includes("#c4")), JSON.stringify(m.contrast.slice(0, 3)));
  check(`${t}: POSITIVE CONTROL sideways scroll is found`, m.over > 0, String(m.over));
  await ev(p, () => { document.getElementById("c1").remove(); document.getElementById("c2x").remove(); document.getElementById("c3").style.height = "44px"; document.getElementById("c4").style.color = "#222"; document.getElementById("c5").remove(); document.getElementById("c2").remove(); });
  const m2 = await p.evaluate(`(${MEASURE_SRC})()`);
  check(`${t}: POSITIVE CONTROL once the seeded defects are fixed they are no longer reported`, !m2.cut.some((x) => x.includes("#c1")) && !m2.backSmall.some((x) => x.includes("#c3")) && !m2.small.some((x) => x.includes("#c3")) && !m2.contrast.some((x) => x.includes("#c4")) && m2.over <= 0, JSON.stringify({ c: m2.cut, b: m2.backSmall, o: m2.over }));
});

if (!ONLY || ONLY.split(",").includes("control")) await flow("control", "bn", "night", 390, "/app/about.html", async (t, p) => {
  await ev(p, () => { const e = document.createElement("p"); e.id = "c6"; e.textContent = "আপনি teacher হিসেবে"; document.body.prepend(e); });
  const left = await p.evaluate(`(() => { const PROPER = ${PROPER_SRC}; return (${LATIN_SRC})(); })()`);
  check(`${t}: POSITIVE CONTROL an English word on a Bangla page is found`, left.some((x) => x.startsWith("teacher")), JSON.stringify(left.slice(0, 5)));
  check(`${t}: POSITIVE CONTROL a proper name (Zab) is not reported`, !left.some((x) => /^Zab/.test(x)), JSON.stringify(left.slice(0, 5)));
});

// ---- as a window from the menu (J74), then – and ← Back (v12.25) -----------------------------------------------------------
const MENU_FILES = ["homework.html", "monitor.html", "people.html", "backup.html", "about.html", "dawah.html"];
async function menuWindow(t, p, errors) {
  for (const file of MENU_FILES) {
    const tt = `${t} ${file}`;
    const label = await ev(p, (f) => { const a = [...document.querySelectorAll(".app-nav a.nav-link[href]")].find((x) => x.getAttribute("href").startsWith(f)); if (!a) return null; a.closest("details")?.setAttribute("open", ""); a.click(); return a.textContent.trim(); }, file);
    check(`${tt}: POSITIVE CONTROL the menu has a link to the page`, !!label);
    if (!label) continue;
    const opened = await until("the page window opens", () => visible(p, "#pageWindow:not([hidden])"), 10000);
    check(`${tt}: the menu link "${label}" opens it in a window`, opened);
    if (!opened) continue;
    await settle(p, 1500);
    const url0 = await ev(p, () => document.querySelector("#pageWindow iframe")?.src || "");
    const mb = await ev(p, () => { const b = document.querySelector("#pageWindow .mm-min-btn"); if (!b) return null; const r = b.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { w: Math.round(r.width), h: Math.round(r.height), top: !!at && (at === b || b.contains(at)) }; });
    check(`${tt}: the window's – is 40px+ and not covered`, !!mb && mb.w >= 40 && mb.h >= 40 && mb.top, JSON.stringify(mb));
    await ev(p, () => document.querySelector("#pageWindow .mm-min-btn")?.click()); await settle(p, 400);
    let s = await ev(p, () => ({ win: !!document.querySelector("#pageWindow:not([hidden])") && getComputedStyle(document.getElementById("pageWindow")).display !== "none" && document.getElementById("pageWindow").getBoundingClientRect().width > 0, chip: document.querySelectorAll(".mm-min-chip").length }));
    check(`${tt}: – hides the window and leaves one chip`, !s.win && s.chip === 1, JSON.stringify(s));
    await ev(p, () => document.querySelector(".mm-min-chip")?.click()); await settle(p, 500);
    s = await ev(p, () => ({ win: document.getElementById("pageWindow").getBoundingClientRect().width > 0, chip: document.querySelectorAll(".mm-min-chip").length, src: document.querySelector("#pageWindow iframe")?.src || "" }));
    check(`${tt}: the chip restores the same window (same page, chip gone)`, s.win && s.chip === 0 && s.src === url0, JSON.stringify({ ...s, url0 }));
    await ev(p, () => document.querySelector("#pageWindow [data-pgw-back]")?.click()); await settle(p, 400);
    s = await ev(p, () => ({ win: !!document.querySelector("#pageWindow:not([hidden])") && document.getElementById("pageWindow").getBoundingClientRect().width > 0, url: location.pathname.split("/").pop() }));
    check(`${tt}: ← Back closes it and the landing page is as it was`, !s.win && s.url === "quranrevival.html", JSON.stringify(s));
  }
  check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
}
if (!ONLY || ONLY.split(",").includes("menuwindow")) for (const lang of LANGS_ALL(LONLY)) await flow("menuwindow", lang, "night", 1440, "/app/quranrevival.html", menuWindow);
function LANGS_ALL(l) { return ["en", "bn"].filter((x) => !l || x === l); }

// ---- the sweep ----------------------------------------------------------------------------------------------------------
const WIDTHS = [320, 390, 768, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
const LOOKS = ["night", "light"].filter((l) => !KONLY || l === KONLY);
for (const key of Object.keys(PAGES)) for (const lang of LANGS) for (const look of LOOKS) for (const width of WIDTHS) {
  const f = PAGES[key].file;
  const sd = PAGES[key].seed === "@dawahSeed" ? dawahSeed : PAGES[key].seed === "@acceptSeed" ? acceptSeed : "";
  await flow(key, lang, look, width, `/app/${f}`, pageFlow(key), sd);
  await flow(key + "-window", lang, look, width, `/app/${f}${f.includes("?") ? "&" : "?"}inWindow=1`, pageFlow(key), sd);
}

await browser.close();
console.log(`\n==== audit-part43${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
