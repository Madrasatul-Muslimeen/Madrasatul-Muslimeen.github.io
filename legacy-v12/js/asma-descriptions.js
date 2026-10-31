// A Name's description on its poster: whose words it shows (decision 87, 8 Oct 2026). The Owner: "Names only not
// every Quran words, Yes, save my edits for the madrasah." Three sources, chosen by a strip ABOVE the poster, so the
// poster itself stays the true copy of the Owner's template (decision 85):
//   poster    -- the poster creator's description (POSTER_DESCRIPTIONS, 89 of the Names);
//   suggested -- the Architect's suggestion, written from the Name's own Qur'an and Hadith references, and ALWAYS
//                labelled a suggestion, on the strip and on the poster;
//   madrasah  -- the madrasah's own words, written by its owner/prime and saved for everyone in the madrasah, on the
//                tenant's asmaCollections document (field nameDescriptions, keyed by Name number). The deployed Rules
//                let owner/prime update that document with no field list, so this needs no Rules change.
// Which source a reader sees is their own choice on this device (a convenience; nothing is lost if it is forgotten).
// The demo the Owner saw first: https://claude.ai/artifact/EWMhkBo9rNKqCFXndmFGfy

import { asmaPosterModel } from "./asma-poster.js";
import { t } from "./i18n.js";

export const DESCRIPTION_SOURCES = Object.freeze(["poster", "suggested", "madrasah"]);
const PREF_KEY = "mmsa.asmaDescriptionSource";

const CSS = `
.asma-desc-strip{width:min(100%,560px);margin:0 auto 10px;display:grid;gap:8px;padding:10px;border-radius:12px;background:#fffdf6;color:#1b2a41;border:1px solid #e2ddcd;box-sizing:border-box;text-align:left;font-family:'Inter',system-ui,sans-serif}
.asma-desc-label{font-size:.78rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#5a6172}
.asma-desc-seg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;padding:4px;border-radius:10px;background:#f1ede1}
.asma-desc-seg button{min-height:40px;min-width:0;border:0;border-radius:8px;background:transparent;color:#1b2a41;font:inherit;font-size:.9rem;line-height:1.15;padding:4px;cursor:pointer}
.asma-desc-seg button[aria-pressed="true"]{background:#1b2a41;color:#fff;font-weight:600}
.asma-desc-seg button:disabled{color:#8b8f99;cursor:default}
.asma-desc-note{margin:0;font-size:.82rem;color:#5a6172}
.asma-desc-edit{justify-self:start;min-height:40px;padding:0 14px;border-radius:10px;border:1px solid #8a6116;background:#f3e7cc;color:#6d4c10;font:inherit;font-weight:600;cursor:pointer}
.asma-desc-editor{display:grid;gap:8px}
.asma-desc-editor[hidden]{display:none !important}
.asma-desc-editor textarea{width:100%;box-sizing:border-box;min-height:130px;border:1px solid #d8d2bf;border-radius:10px;background:#fff;color:#1b2a41;font:inherit;padding:10px;resize:vertical}
.asma-desc-row{display:flex;gap:8px;flex-wrap:wrap}
.asma-desc-row button{min-height:40px;padding:0 14px;border-radius:10px;border:1px solid #d8d2bf;background:#fff;color:#1b2a41;font:inherit;cursor:pointer}
.asma-desc-row .asma-desc-save{background:#1b2a41;color:#fff;border-color:#1b2a41;font-weight:600}
.asma-desc-strip ~ .ahp-standalone{width:min(94vw,calc((94vh - 230px) * 1055 / 1491))}
.asma-desc-strip button:focus-visible,.asma-desc-strip textarea:focus-visible{outline:2px solid #B8862F;outline-offset:2px}
`;
let cssDone = false;
function ensureStyles() {
  if (cssDone || typeof document === "undefined" || !document.head) return;
  cssDone = true;
  const st = document.createElement("style");
  st.dataset.asmaDescriptions = "";
  st.textContent = CSS;
  document.head.appendChild(st);
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Pure: the suggested description, built only from the Name's own data (its meaning and references), in English
 *  like the poster. Never invents a reference: with none recorded it says so. */
export function suggestedDescription(entry) {
  const m = asmaPosterModel(entry);
  const name = m.title || "This Name";
  const parts = [`${name}${m.meaning ? `, ${m.meaning}` : ""}.`];
  if (m.quran.length) {
    const refs = m.quran.map((c) => c.full || c.text).join("; ");
    parts.push(`The Qur'an mentions Allah by this Name at ${refs}.`);
  }
  if (m.hadith.length) parts.push(`It is narrated in the Hadith: ${m.hadith.map((c) => c.text).join("; ")}.`);
  if (!m.quran.length && !m.hadith.length) parts.push("No Qur'an or Hadith reference is recorded for this Name yet.");
  if (entry?.weak) parts.push("The narration that names it is graded weak.");
  parts.push("Read the references with a teacher, and write the madrasah's own description.");
  return parts.join(" ");
}

/** Pure: the three texts for one Name ("" where a source has nothing). */
export function descriptionChoices(entry, madrasahDescriptions = {}) {
  return {
    poster: asmaPosterModel(entry).description || "",
    suggested: suggestedDescription(entry),
    madrasah: String(madrasahDescriptions?.[entry?.number] ?? "").trim(),
  };
}

/** Pure: the source to show -- the one asked for when it has text, else the madrasah's, the poster's, the suggestion. */
export function pickDescriptionSource(choices, wanted) {
  if (wanted && choices[wanted]) return wanted;
  return ["madrasah", "poster", "suggested"].find((s) => choices[s]) ?? "suggested";
}

export function readDescriptionPref() {
  try { return localStorage.getItem(PREF_KEY) || null; } catch { return null; }
}
function writeDescriptionPref(v) {
  try { localStorage.setItem(PREF_KEY, v); } catch { /* a private window: the choice lasts this visit only */ }
}

const SOURCE_LABELS = () => ({ poster: t("Poster's"), suggested: t("Suggested"), madrasah: t("Madrasah's") });
const SOURCE_NOTES = () => ({
  poster: t("From the poster's creator."),
  suggested: t("A suggestion, written from this Name's Qur'an and Hadith references."),
  madrasah: t("The madrasah's own description, saved for everyone."),
});

/** The strip's HTML: the three-way choice, a line saying whose words these are, and (owner/prime) ✎ Edit. */
export function renderDescriptionStrip(choices, current, { canEdit = false } = {}) {
  const labels = SOURCE_LABELS();
  const buttons = DESCRIPTION_SOURCES.map((s) => `<button type="button" data-asma-desc-src="${s}" aria-pressed="${s === current}"${choices[s] ? "" : " disabled"}>${esc(labels[s])}</button>`).join("");
  return `<section class="asma-desc-strip" data-asma-desc-strip aria-label="${esc(t("Description"))}">
    <span class="asma-desc-label">${esc(t("Description"))}</span>
    <div class="asma-desc-seg" role="group" aria-label="${esc(t("Whose description"))}">${buttons}</div>
    <p class="asma-desc-note" data-asma-desc-note>${esc(SOURCE_NOTES()[current])}</p>
    ${canEdit ? `<button type="button" class="asma-desc-edit" data-asma-desc-edit>✎ ${esc(t("Edit the madrasah's description"))}</button>
    <div class="asma-desc-editor" data-asma-desc-editor hidden>
      <label class="asma-desc-note" for="asmaDescText">${esc(t("Start from the text shown, change it, then save. Everyone in the madrasah will see it."))}</label>
      <textarea id="asmaDescText" data-asma-desc-text rows="6"></textarea>
      <div class="asma-desc-row"><button type="button" class="asma-desc-save" data-asma-desc-save>${esc(t("Save for the madrasah"))}</button><button type="button" data-asma-desc-cancel>${esc(t("Cancel"))}</button></div>
      <p class="asma-desc-note" data-asma-desc-status role="status"></p>
    </div>` : ""}
  </section>`;
}

/**
 * Mounts the strip and the poster together into `mount`. `renderPoster(description)` returns the poster HTML for a
 * { text, source }; `afterRender()` re-fits and re-wires the poster each time it is drawn. `onSave(text)` resolves
 * true once the madrasah's description is written (I15: a failure must reach the reader, said under the box).
 */
export function mountPosterWithDescriptions(mount, { entry, madrasahDescriptions, canEdit, renderPoster, afterRender, onSave }) {
  ensureStyles();
  let choices = descriptionChoices(entry, madrasahDescriptions);
  let current = pickDescriptionSource(choices, readDescriptionPref());
  function draw() {
    mount.innerHTML = renderDescriptionStrip(choices, current, { canEdit })
      + renderPoster({ text: choices[current], source: current });
    afterRender?.();
    mount.querySelectorAll("[data-asma-desc-src]").forEach((b) => b.addEventListener("click", () => {
      current = b.dataset.asmaDescSrc;
      writeDescriptionPref(current);
      draw();
    }));
    const editor = mount.querySelector("[data-asma-desc-editor]");
    mount.querySelector("[data-asma-desc-edit]")?.addEventListener("click", () => {
      editor.hidden = false;
      const box = mount.querySelector("[data-asma-desc-text]");
      box.value = choices[current];
      box.focus();
    });
    mount.querySelector("[data-asma-desc-cancel]")?.addEventListener("click", () => { editor.hidden = true; });
    mount.querySelector("[data-asma-desc-save]")?.addEventListener("click", async () => {
      const text = mount.querySelector("[data-asma-desc-text]").value.trim();
      const status = mount.querySelector("[data-asma-desc-status]");
      status.textContent = t("Saving…");
      const ok = await onSave(text);
      if (!ok) { status.textContent = t("Not saved. Check the connection and try again."); return; }
      choices = { ...choices, madrasah: text };
      current = text ? "madrasah" : pickDescriptionSource(choices, null);
      writeDescriptionPref(current);
      draw();
    });
  }
  draw();
  return { redraw: draw };
}
