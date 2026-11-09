// PCF MSA J119 (QR Lead, 8 Nov 2026) -- the Word Card's "Also in Bangla" block, from demo v03.
// PURE: HTML in, HTML out, plus one delegated listener. It never reads or writes storage or Firestore; the page owns the
// state (app/js/bangla-words.js) and saves it. Everything a reader sees comes in through `text`, already translated.
//
// The block holds, in the order of demo v03:
//   * the blue button that marks THIS word (a word in the list is in Bangla by default; no separate "Also in Bangla" line)
//   * "Bangla list": Admin's | Mine, to choose whose marks are in force
//   * the count: known with the Bangla words, and the Bangla words' own share
//   * the list of words in force, a switch for each word, and ONE switch for the whole list in its heading row.
import { LIST_ADMIN, LIST_MINE, canEditList } from "./bangla-words.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const BANGLA_TEXT = Object.freeze({
  mark: "Also in Bangla", marked: "In Bangla", heading: "Bangla list", admin: "Admin's", mine: "Mine",
  adminNote: "admin marks", readOnly: "read only", yours: "yours", listHeading: "Words also in Bangla ({n})",
  listSwitch: "Use the Bangla word list", wordSwitch: "{word} in the list", deviceOnly: "Saved on this device only for now.",
  count: "{words} words, {percent}% of the Qur'an's words", empty: "No words in this list yet.",
});
const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => esc(vars?.[k] ?? ""));

/**
 * @param {object} p
 *  state   normalised Bangla state; lemma  this word's lemma id; bn  its Bangla meaning (for the tag)
 *  canAdmin  may this reader change the admin's list; figures  banglaFigures(); rows  [{l,b,n,ar?}] the words in force; text  BANGLA_TEXT, translated
 */
export function banglaBlockHtml({ state, lemma, bn = "", canAdmin = false, figures = null, rows = [], text = BANGLA_TEXT, tag = "", open = false } = {}) {
  if (!state || !lemma) return "";
  const T = { ...BANGLA_TEXT, ...text };
  const editable = canEditList(state.list, canAdmin) && state.on;
  const inList = state.on && new Set(state[state.list]).has(lemma);
  const who = state.list === LIST_MINE ? T.yours : canAdmin ? T.adminNote : T.readOnly;
  const seg = (id, label) => `<button type="button" class="bnw-seg" data-bangla-list="${id}" aria-pressed="${state.list === id}">${esc(label)}</button>`;
  const rowHtml = rows.map((r) => `<div class="bnw-lrow"><button type="button" class="bnw-sw" data-bangla-word="${esc(r.l)}" aria-pressed="${inListSet(state, r.l)}" aria-label="${fill(T.wordSwitch, { word: r.b || r.l })}"${editable ? "" : " disabled"}></button><span lang="bn">${esc(r.b || "")}</span><span class="bnw-ar" dir="rtl" lang="ar">${esc(r.l)}</span><span class="bnw-n">${esc(r.n ?? "")}</span></div>`).join("");
  const count = figures ? fill(T.count, { words: figures.words, percent: figures.share.toFixed(2) }) : "";
  return `<div class="bnw" data-bangla-block>
    <div class="bnw-row">
      <button type="button" class="bnw-mark" data-bangla-word="${esc(lemma)}" aria-pressed="${inList}"${editable ? "" : " disabled"}>${esc(inList ? T.marked : T.mark)}</button>
      ${tag ? `<span class="bnw-tag" lang="bn" data-bangla-tag>${esc(tag)}</span>` : ""}
    </div>
    <div class="bnw-row" role="group" aria-label="${esc(T.heading)}"><span class="bnw-lab">${esc(T.heading)}</span>${seg(LIST_ADMIN, T.admin)}${seg(LIST_MINE, T.mine)}<span class="bnw-sub">${esc(who)}</span></div>
    ${count ? `<div class="bnw-count" data-bangla-count>${count}</div>` : ""}
    <details class="bnw-list" data-bangla-details${open ? " open" : ""}>
      <summary><span>${fill(T.listHeading, { n: state.on ? state[state.list].length : 0 })}</span><button type="button" class="bnw-sw" data-bangla-onoff aria-pressed="${state.on}" aria-label="${esc(T.listSwitch)}"></button></summary>
      <div class="bnw-body">${rowHtml || `<p class="bnw-empty">${esc(T.empty)}</p>`}</div>
      <p class="bnw-sub bnw-device" data-bangla-device>${esc(T.deviceOnly)}</p>
    </details>
  </div>`;
}
/** The three Wheel switches (ring, centre line, tenth part), for the Wheel's legend row. `text` = { ring, centre, tenth, label }. */
export function banglaWheelSwitchesHtml(state, text = {}) {
  if (!state) return "";
  const T = { label: "Bangla words on the Wheel", ring: "Ring", centre: "Centre", tenth: "Part", ...text };
  const sw = (k) => `<button type="button" class="bnw-chip" data-bangla-wheel="${k}" aria-pressed="${state.wheel?.[k] === true}">${esc(T[k])}</button>`;
  return `<div class="bnw-wheelsw" role="group" aria-label="${esc(T.label)}" data-bangla-wheel-switches>${sw("ring")}${sw("centre")}${sw("tenth")}</div>`;
}
export function wireBanglaWheelSwitches(root, onSwitch) {
  root?.querySelectorAll?.("[data-bangla-wheel]").forEach((b) => b.addEventListener("click", () => onSwitch?.(b.dataset.banglaWheel, b.getAttribute("aria-pressed") !== "true")));
}
const inListSet = (state, l) => state.on && new Set(state[state.list]).has(l);

/** One delegated listener. onWord(lemma, on), onList(id), onOnOff(on). A click on the summary's switch never toggles the details. */
export function wireBanglaBlock(root, { onWord, onList, onOnOff } = {}) {
  root?.querySelectorAll?.("[data-bangla-block]").forEach((block) => block.addEventListener("click", (e) => {
    const sw = e.target.closest("[data-bangla-onoff]");
    if (sw) { e.preventDefault(); e.stopPropagation(); onOnOff?.(sw.getAttribute("aria-pressed") !== "true"); return; }
    const w = e.target.closest("[data-bangla-word]");
    if (w && !w.disabled) { onWord?.(w.dataset.banglaWord, w.getAttribute("aria-pressed") !== "true"); return; }
    const l = e.target.closest("[data-bangla-list]");
    if (l) onList?.(l.dataset.banglaList);
  }));
}

export const BANGLA_CSS = `
.bnw{display:flex;flex-direction:column;gap:6px;margin:6px 0}
.bnw-row{display:flex;flex-wrap:nowrap;gap:5px;align-items:center}
.bnw-lab{font-size:.85rem;opacity:.85;white-space:nowrap}
.bnw-mark{min-height:44px;padding:4px 16px;border-radius:999px;border:2px solid #5fb3ff;background:transparent;color:#8fcaff;font:inherit;font-weight:700;cursor:pointer;text-align:start}
.bnw-mark[aria-pressed="true"]{background:#5fb3ff;color:#0b1826}
.bnw-seg{min-height:40px;padding:2px 10px;border-radius:8px;border:1px solid #2c4262;background:#0b1826;color:#e9eef5;font:inherit;font-weight:600;cursor:pointer}
.bnw-seg[aria-pressed="true"]{background:#c9a24a;color:#10233a;border-color:#c9a24a}
.bnw-mark:disabled,.bnw-sw:disabled{opacity:.45;cursor:default}
.bnw-tag{margin-left:auto;font-size:.8rem;font-weight:700;color:#8fcaff;border:1px solid #5fb3ff;border-radius:999px;padding:1px 10px;white-space:nowrap}
.bnw-sub{font-size:.8rem;opacity:.85}
.bnw-wheelsw{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:6px 0 8px}
.bnw-chip{min-height:40px;min-width:44px;padding:2px 12px;border-radius:999px;border:1px solid #c9a24a;background:transparent;color:inherit;font:inherit;font-weight:600;cursor:pointer}
.bnw-chip[aria-pressed="true"]{background:#c9a24a;color:#10233a}
.bnw-count{border:1px solid #c9a24a;border-radius:10px;padding:8px 12px;background:#0b1826;font-size:.9rem}
.bnw-list{border:1px solid #2c4262;border-radius:10px;background:#0b1826}
.bnw-list summary{padding:8px 12px;font-weight:700;cursor:pointer;min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:10px;list-style:none}
.bnw-list summary::-webkit-details-marker{display:none}
.bnw-body{max-height:300px;overflow-y:auto;border-top:1px solid #2c4262}
.bnw-lrow{display:grid;grid-template-columns:auto 1fr auto auto;gap:8px;align-items:center;padding:6px 10px;border-bottom:1px solid #1b2e47;font-size:.9rem}
.bnw-ar{font-family:'Amiri','Scheherazade New','Noto Naskh Arabic',serif;font-size:1.1rem}
.bnw-n{font-variant-numeric:tabular-nums;opacity:.85}
.bnw-empty,.bnw-device{margin:0;padding:8px 12px}
.bnw-sw{width:52px;height:40px;border:0;background:transparent;position:relative;cursor:pointer;padding:0;flex:none}
.bnw-sw::before{content:"";position:absolute;left:3px;top:7px;width:46px;height:26px;box-sizing:border-box;border-radius:999px;border:1px solid #5fb3ff;background:#10233a}
.bnw-sw::after{content:"";position:absolute;top:10px;left:6px;width:20px;height:20px;border-radius:50%;background:#8fcaff;transition:left .15s}
.bnw-sw[aria-pressed="true"]::before{background:#5fb3ff}
.bnw-sw[aria-pressed="true"]::after{left:28px;background:#0b1826}
`;
