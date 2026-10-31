// J108 (v13.01) -- the controls of an Āyah / Hadith block while its Note is being EDITED (note-window.js).
// The demo the Owner approved (demo v3): a show/hide switch (role=switch) with "▾ hide" / "▸ show", عربي · EN · বাং
// buttons (aria-pressed, each language on its own), ✕ to take the block out of the Note; with two or more blocks one
// switch above them shows or hides them all.
//
// Every change rewrites the block's own `data-mmsa-ref` state and its inside, then calls `onChange` -- the editor's
// ordinary autosave (onEditInput) stores it, through the Note's existing write path. The controls drawn here live in
// the edit body's DOM but are never STORED: the sanitiser rebuilds every block from its state alone (note-sanitize.js).
// The all-blocks switch sits OUTSIDE the editable text, so it is never saved either.
import { t, num } from "./i18n.js";
import { cleanRefState, serializeRefState, toggleRefFlag, REF_LANG_TAGS, refBlockHtml } from "./note-ref-block.js";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const LANG_NAME = { ar: "Arabic", en: "English", bn: "Bangla" };
const blocksIn = (body) => [...body.querySelectorAll("div.mm-ref[data-mmsa-ref]")];

function paintBlock(el, state) {
  const s = state;
  const kind = s.kind === "ayah" ? t("Āyah") : t("Hadith");
  const langBtn = (k) => s.text[k]
    ? `<button type="button" class="mm-ref-lang" data-ref-lang="${k}" aria-pressed="${s.flags[k]}" lang="${k}" title="${esc(t(s.flags[k] ? "Hide the {lang}" : "Show the {lang}", { lang: t(LANG_NAME[k]) }))}" aria-label="${esc(t(s.flags[k] ? "Hide the {lang}" : "Show the {lang}", { lang: t(LANG_NAME[k]) }))}">${REF_LANG_TAGS[k]}</button>`
    : "";
  let html = `<div class="mm-ref-head mm-ref-live-head">
      <button type="button" class="mm-ref-sw" role="switch" data-ref-sw aria-checked="${s.flags.on}" aria-label="${esc(t("Show {ref}", { ref: s.label }))}" title="${esc(t("Show {ref}", { ref: s.label }))}"><span aria-hidden="true"></span></button>
      <span class="mm-ref-kind">${esc(kind)}</span><b class="mm-ref-label">${esc(s.label)}</b>
      <button type="button" class="mm-ref-showhide" data-ref-sw aria-hidden="true" tabindex="-1">${esc(s.flags.on ? `▾ ${t("hide")}` : `▸ ${t("show")}`)}</button>
    </div>
    <div class="mm-ref-tools">${langBtn("ar")}${langBtn("en")}${langBtn("bn")}
      <button type="button" class="mm-ref-x" data-ref-x aria-label="${esc(t("Delete {ref} from this Note", { ref: s.label }))}" title="${esc(t("Delete {ref} from this Note", { ref: s.label }))}">✕</button></div>`;
  if (s.flags.on) {
    if (s.flags.ar && s.text.ar) html += `<p class="mm-ref-ar" lang="ar" dir="rtl">${esc(s.text.ar)}</p>`;
    for (const k of ["en", "bn"]) if (s.flags[k] && s.text[k]) html += `<p class="mm-ref-tr" lang="${k}"><span class="mm-ref-tag">${REF_LANG_TAGS[k]}</span> ${esc(s.text[k])}</p>`;
    if (!["ar", "en", "bn"].some((k) => s.flags[k] && s.text[k])) html += `<p class="mm-ref-none">${esc(t("Every language is hidden. Tap عربي, EN or বাং to show one."))}</p>`;
  }
  el.innerHTML = html;
  el.classList.toggle("mm-ref-off", !s.flags.on);
  el.setAttribute("data-mmsa-ref", serializeRefState(s));
}

function mountOne(el, o) {
  if (el.__mmRefLive) return;
  const state = cleanRefState(el.getAttribute("data-mmsa-ref"));
  if (!state) return;
  el.__mmRefLive = true;
  el.setAttribute("contenteditable", "false");
  el.classList.add("mm-ref-live");
  paintBlock(el, state);
  // mousedown would move the caret (and the editor's saved selection) into the block; the press is ours.
  el.addEventListener("mousedown", (ev) => { if (ev.target.closest("button")) ev.preventDefault(); });
  el.addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b || !el.contains(b)) return;
    ev.preventDefault(); ev.stopPropagation();
    const cur = cleanRefState(el.getAttribute("data-mmsa-ref"));
    if (!cur) return;
    if (b.hasAttribute("data-ref-x")) {
      const next = el.nextSibling;
      el.remove();
      if (next?.nodeType === 1) { /* the text after it stays where it was */ }
      o.onChange?.(); o.afterChange?.();
      return;
    }
    const flag = b.hasAttribute("data-ref-sw") ? "on" : b.dataset.refLang;
    if (!flag) return;
    paintBlock(el, toggleRefFlag(cur, flag));
    const again = el.querySelector(b.hasAttribute("data-ref-sw") ? ".mm-ref-sw" : `[data-ref-lang="${flag}"]`);
    again?.focus({ preventScroll: true });
    o.onChange?.(); o.afterChange?.();
  });
}

/** The switch for every block at once, shown above them while there are two or more (outside the editable text). */
function paintAllBar(body, slot, o) {
  if (!slot) return;
  const blocks = blocksIn(body);
  let bar = slot.querySelector(":scope > [data-ref-allbar]");
  if (blocks.length < 2) { bar?.remove(); return; }
  const anyOn = blocks.some((b) => cleanRefState(b.getAttribute("data-mmsa-ref"))?.flags.on);
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "mm-ref-allbar";
    bar.dataset.refAllbar = "";
    slot.prepend(bar);
    bar.addEventListener("click", (ev) => {
      if (!ev.target.closest("[data-ref-all]")) return;
      const all = blocksIn(body), on = !all.some((b) => cleanRefState(b.getAttribute("data-mmsa-ref"))?.flags.on);
      for (const b of all) {
        const s = cleanRefState(b.getAttribute("data-mmsa-ref"));
        if (s && s.flags.on !== on) paintBlock(b, toggleRefFlag(s, "on"));
      }
      o.onChange?.();
      paintAllBar(body, slot, o);
      slot.querySelector("[data-ref-all]")?.focus({ preventScroll: true });
    });
  }
  bar.innerHTML = `<button type="button" class="mm-ref-sw" role="switch" data-ref-all aria-checked="${anyOn}" aria-label="${esc(t("Show every Āyah and Hadith"))}" title="${esc(t("Show every Āyah and Hadith"))}"><span aria-hidden="true"></span></button>
    <span>${esc(anyOn ? t("All Āyāt and Hadith: shown ({n})", { n: num(blocks.length) }) : t("All Āyāt and Hadith: hidden ({n})", { n: num(blocks.length) }))}</span>`;
}

/**
 * Mount every block in the edit body `body`. o = { onChange(), slot } -- `slot` is the element (outside the editable
 * text) that carries the all-blocks switch. Safe to call again: a block already mounted is left alone.
 */
export function mountRefBlocks(body, o = {}) {
  if (!body) return;
  const opts = { ...o, afterChange: () => paintAllBar(body, o.slot, opts) };
  for (const el of blocksIn(body)) mountOne(el, opts);
  paintAllBar(body, o.slot, opts);
}

/** Insert a new block (a state for note-ref-block.js) at the end of `body`, with an empty line after it to write on. */
export function insertRefBlock(body, state) {
  const html = refBlockHtml(state);
  if (!body || !html) return false;
  const tpl = document.createElement("template");
  tpl.innerHTML = `${html}<p><br></p>`;
  body.append(...tpl.content.childNodes);
  return true;
}
