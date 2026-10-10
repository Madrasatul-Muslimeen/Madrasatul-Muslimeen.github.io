// Decision 95 (the Owner, 9 Oct 2026, "NotePane: Build the demo"): the separate Note view retires, and "QCR stays on the
// Āyah card and ⋮". Both routes used to reach QCR THROUGH the Note view; they now open the same QCR / Asma panel in a
// pop-up of its own (renderQcrDrawerHtml + wireAsmaXNoteFields + attachQcrDrawerHandlers, reused), over the screen the
// reader is on, with ← Back (decision 86), ✕ and Escape, no Note view opened and no new write path.
// Run from the repository root, serve.js on :8080. 390px Bangla and 1280px English.
//   --mutate=routenote  the Āyah card's 📚 QCR opens the Note view again   -> the pop-up / #noteView checks fail
//   --mutate=noteonly   the pop-up's handlers are bound under #noteView    -> the tick writes nothing
//   --mutate=noback     the pop-up has no ← Back                           -> the Back checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  routenote: ["quranrevival.html", "openQcrPopup(unitKey, { backLabel: t(\"Āyah card\"), onBack: () => openAyahActionSheet(`${s}:${a}`, h) });", "ayahSheetPendingQcrOpen = true; openNoteView(unitKey);"],
  noteonly: ["quranrevival.html", "attachQcrDrawerHandlers(body, {", "attachQcrDrawerHandlers(noteView, {"],
  noback: ["quranrevival.html", "data-qcr-pop-back><span", "data-qcr-pop-x><span"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const quiet = (errs) => errs.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [lang, width] of [["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  const ev = (f, a) => P.evaluate(f, a);
  const REF = lang === "bn" ? "২:২৫৫" : "2:255";
  await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await ev(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(400);
  await ev(() => { const s = document.getElementById("surahSelect"); if (s.value !== "2") { s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await P.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 15000 });
  await ev(() => { const el = document.getElementById("ayahSelect"); el.value = "255"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForTimeout(900);
  await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));

  const popOpen = () => ev(() => { const p = document.getElementById("qcrPopup"); return !!p && !p.hidden && p.getClientRects().length > 0; });
  const waitPop = (open) => P.waitForFunction((o) => { const p = document.getElementById("qcrPopup"); return o ? !!p && !p.hidden && p.querySelector("[data-note-collection-toggle]") : !p || p.hidden; }, open, { timeout: 12000 }).catch(() => {});

  // 1. From the Āyah card: 📚 QCR opens the pop-up, not the Note view, with the Attach list open.
  await ev(() => document.querySelector('[data-ayah-num-badge="2:255"]')?.click());
  await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
  await P.waitForTimeout(400);
  await ev(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-qcr]")?.click());
  await waitPop(true);
  const s1 = await ev(() => {
    const p = document.getElementById("qcrPopup");
    const attach = p?.querySelector('[data-note-qcr-dd-pop="attach"]');
    return { open: !!p && !p.hidden, noteViewHidden: !document.getElementById("noteView") || document.getElementById("noteView").getClientRects().length === 0,
      attachOn: !!attach?.classList.contains("on"), ticks: [...(p?.querySelectorAll("[data-note-collection-toggle]") ?? [])].filter((c) => c.getClientRects().length).length,
      title: p?.querySelector(".qcr-pop-title")?.textContent ?? "", back: p?.querySelector("[data-qcr-pop-back]")?.textContent.trim() ?? null };
  });
  check(`${tag} the Āyah card's 📚 QCR opens the QCR pop-up, with the Attach list open`, s1.open && s1.attachOn && s1.ticks >= 10, JSON.stringify(s1));
  check(`${tag} ...the Note view is NOT opened (#noteView stays hidden)`, s1.noteViewHidden, JSON.stringify(s1));
  check(`${tag} ...its title names the āyah (${REF})`, s1.title.includes(REF), s1.title);
  check(`${tag} ...it has ← Back, naming the Āyah card`, !!s1.back && s1.back.startsWith("←") && s1.back.includes(lang === "bn" ? "আয়াত কার্ড" : "Āyah card"), String(s1.back));

  // 2. Tick one collection: the stub records the ayahCollections update, and the tick shows checked after the re-render.
  await ev(() => { window.__stubWriteData = []; });
  const id = await ev(() => { const cb = [...document.querySelectorAll("#qcrPopup [data-note-collection-toggle]")].find((c) => c.getClientRects().length && !c.checked); if (!cb) return null; cb.click(); return cb.dataset.noteCollectionToggle; });
  await P.waitForFunction(() => (window.__stubWriteData || []).some((w) => /ayahCollections/.test(w.col ?? "")), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(400);
  const wrote = await ev((cid) => {
    const w = (window.__stubWriteData || []).filter((x) => x.col === "ayahCollections").pop();
    const col = (w?.data?.collections ?? []).find((c) => c.id === cid);
    return { n: (window.__stubWriteData || []).filter((x) => x.col === "ayahCollections").length, filed: !!col && col.items.includes("ayah:2:255") };
  }, id);
  check(`${tag} ticking a collection writes ayahCollections with ayah:2:255 filed in it (the write is read back)`, !!id && wrote.n === 1 && wrote.filed, JSON.stringify({ id, ...wrote }));
  const after = await ev((cid) => ({ checked: !!document.querySelector(`#qcrPopup [data-note-collection-toggle="${cid}"]`)?.checked, still: !!document.querySelector('#qcrPopup [data-note-qcr-dd-pop="attach"].on'), noteView: document.getElementById("noteView")?.getClientRects().length > 0 }), id);
  check(`${tag} ...it shows checked after the re-render, the Attach list still open, and only the pop-up was redrawn`, after.checked && after.still && !after.noteView, JSON.stringify(after));

  // 3. Switch Topic to Asma ul Husna: its fields show.
  await ev(() => { const s = document.querySelector("#qcrPopup #noteTopicSelect"); s.value = "asma"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForFunction(() => document.querySelector('#qcrPopup [data-asmax-dd-toggle="asmagroup"]'), null, { timeout: 12000 }).catch(() => {});
  const asma = await ev(() => ({ group: !!document.querySelector('#qcrPopup [data-asmax-dd-toggle="asmagroup"]')?.getClientRects().length, names: !!document.querySelector('#qcrPopup [data-asmax-dd-toggle="asmaname"]'), refs: !!document.querySelector('#qcrPopup [data-asmax-dd-toggle="asmaref"]'), qcrGone: !document.querySelector("#qcrPopup [data-note-qcr-dd-toggle]") }));
  check(`${tag} switching Topic to Asma ul Husna shows its Group / Names / References fields (QCR's go)`, asma.group && asma.names && asma.refs && asma.qcrGone, JSON.stringify(asma));
  await ev(() => document.querySelector('#qcrPopup [data-asmax-dd-toggle="asmagroup"]')?.click());
  check(`${tag} ...and its Group dropdown opens inside the pop-up`, await ev(() => !!document.querySelector('#qcrPopup [data-asmax-dd-pop="asmagroup"].on')));

  // 4. Every button at least 40px tall; no sideways scroll; full screen on a phone, centred on a wide screen.
  const geo = await ev(() => {
    const p = document.getElementById("qcrPopup"), box = p.querySelector(".qcr-pop-box"), r = box.getBoundingClientRect();
    const small = [...p.querySelectorAll("button, select")].filter((b) => b.getClientRects().length && b.getBoundingClientRect().height < 39.5).map((b) => `${(b.className || b.tagName).toString().slice(0, 30)}:${Math.round(b.getBoundingClientRect().height)}`);
    return { small, boxOver: box.scrollWidth - box.clientWidth, docOver: document.documentElement.scrollWidth - document.documentElement.clientWidth, w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), vw: innerWidth, vh: innerHeight };
  });
  check(`${tag} every button and select in the pop-up is at least 40px tall`, geo.small.length === 0, geo.small.join(", "));
  check(`${tag} no sideways scroll (box or page)`, geo.boxOver <= 0 && geo.docOver <= 0, JSON.stringify(geo));
  check(`${tag} ${width < 640 ? "full screen on a phone" : "a centred pop-up on a wide screen"}`, width < 640 ? geo.w >= geo.vw - 1 && geo.h >= geo.vh - 1 : geo.w < geo.vw - 100 && Math.abs(geo.left - (geo.vw - geo.w - geo.left)) <= 2, JSON.stringify(geo));

  // 5. ← Back reopens the same Āyah card.
  await P.click("#qcrPopup [data-qcr-pop-back]").catch(() => {});
  await P.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(400);
  const back = await ev(() => ({ pop: !!document.getElementById("qcrPopup") && !document.getElementById("qcrPopup").hidden, card: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), ref: document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent ?? "" }));
  check(`${tag} ← Back closes the pop-up and reopens the Āyah card on ${REF}`, !back.pop && back.card && back.ref.includes(REF), JSON.stringify(back));

  // 5b. ✕ and Escape close it (from the card again).
  await ev(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-qcr]")?.click());
  await waitPop(true);
  await P.click("#qcrPopup [data-qcr-pop-close]").catch(() => {});
  check(`${tag} ✕ closes the pop-up`, !(await popOpen()));
  await ev(() => document.querySelector('[data-ayah-num-badge="2:255"]')?.click());
  await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-qcr]"), null, { timeout: 8000 }).catch(() => {});
  await ev(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-qcr]")?.click());
  await waitPop(true);
  await P.keyboard.press("Escape"); await P.waitForTimeout(200);
  check(`${tag} Escape closes the pop-up`, !(await popOpen()));
  await ev(() => { document.getElementById("ayahActionSheetOverlay")?.classList.remove("open"); });

  // 6. From ⋮ on the Read view: the pop-up opens; ← Back leaves the Read view on the same āyah, at the same scroll.
  const scroll0 = await ev(() => { const s = document.getElementById("readScroll"); if (s && s.scrollHeight > s.clientHeight + 60) s.scrollTop = 60; return s ? Math.round(s.scrollTop) : null; });
  await P.waitForTimeout(200);
  await ev(() => document.querySelector('#readView .ayah-quick-wrap[data-unit-key="ayah:2:255"] [data-qm-toggle]')?.click());
  await P.waitForTimeout(300);
  await ev(() => document.querySelector('#readView .ayah-quick-wrap[data-unit-key="ayah:2:255"] [data-qm-qcr]')?.click());
  await waitPop(true);
  const m = await ev(() => ({ open: !document.getElementById("qcrPopup")?.hidden, noteView: document.getElementById("noteView")?.getClientRects().length > 0, back: document.querySelector("#qcrPopup [data-qcr-pop-back]")?.textContent.trim() ?? null, attachOn: !!document.querySelector('#qcrPopup [data-note-qcr-dd-pop="attach"].on'), title: document.querySelector("#qcrPopup .qcr-pop-title")?.textContent ?? "" }));
  check(`${tag} ⋮ on the Read view opens the QCR pop-up on Attach for ${REF}, without the Note view`, m.open && !m.noteView && m.attachOn && m.title.includes(REF), JSON.stringify(m));
  await P.click("#qcrPopup [data-qcr-pop-back]").catch(() => {});
  await P.waitForTimeout(500);
  const land = await ev(() => ({ pop: !!document.getElementById("qcrPopup") && !document.getElementById("qcrPopup").hidden, read: !!document.querySelector('#readView [data-ayah-num-badge="2:255"]')?.getClientRects().length, ayah: document.getElementById("ayahSelect")?.value, scroll: Math.round(document.getElementById("readScroll")?.scrollTop ?? -1), noteView: document.getElementById("noteView")?.getClientRects().length > 0 }));
  check(`${tag} ← Back leaves the Read view on 2:255, at the same scroll (${scroll0})`, !land.pop && land.read && land.ayah === "255" && land.scroll === scroll0 && !land.noteView, JSON.stringify({ ...land, scroll0 }));
  check(`${tag} no page errors`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== QCR / Asma pop-up (decision 95): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
