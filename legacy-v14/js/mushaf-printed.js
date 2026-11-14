// Printed page view (the Owner, 11 Nov 2026: "Ma Shaa Allah! Good! ... 1A"): the Madinah Mushaf as the real printed page,
// a THIRD view beside the ONE Ayah View and the (text) Mushaf. Not a replacement: the Word Card, tajweed colours,
// notes and the stripe need the live text, which a picture cannot give.
//
// The pictures: the King Fahd Complex's Madinah Mushaf, 604 pages, from King Saud University's e-Mushaf
// (https://quran.ksu.edu.sa/png_big/<page>.png), kept at tools/quran-data-pull/output/mushaf-printed/ksu-madani/NNN.png
// (README there). Never precached and never kept by a worker's run-time cache (98L): a reader keeps pages on purpose.
//
// This module draws pages into the same strip the text Mushaf uses and gives each the SAME hook,
// `.hifz-page[data-mushaf-page]`, so the page reference, the ‹ › buttons and the scroll watch work unchanged.
import { t, num } from "./i18n.js";

// QR's build rewrites this one line to MSA's address (apps/qr/edits.json), because QR does not carry the pictures.
export const PRINTED_BASE = "/tools/quran-data-pull/output/mushaf-printed/ksu-madani/";
export const PRINTED_KEY = "qr.readPrinted";
export const printedPageUrl = (n) => `${PRINTED_BASE}${String(n).padStart(3, "0")}.png`;

export function readPrintedOn() { try { return localStorage.getItem(PRINTED_KEY) === "1"; } catch { return false; } }
export function savePrintedOn(on) { try { localStorage.setItem(PRINTED_KEY, on ? "1" : "0"); } catch { /* per device only */ } }

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Draw `pages` (page numbers) into `container`. `onAsText(pageNum)` is called by "Open this page as text". */
export function renderPrintedPages(container, pages, { onFirstPage = null, onAsText = null } = {}) {
  container.innerHTML = "";
  if (!pages.length) { container.innerHTML = `<p style="color:#888;">${esc(t("Couldn't find a Mushaf page for this selection."))}</p>`; return; }
  for (const p of pages) {
    const sec = document.createElement("section");
    sec.className = "hifz-page mushaf-printed-page";
    sec.dataset.mushafPage = String(p);
    sec.setAttribute("aria-label", t("Page {page}", { page: num(p) }));
    sec.innerHTML = `
      <div class="printed-bar">
        <span class="hifz-page-num">${esc(t("Page {page}", { page: num(p) }))}</span>
        <button type="button" class="secondary printed-zoom" aria-pressed="false">🔍 <span>${esc(t("Zoom"))}</span></button>
        <button type="button" class="secondary printed-as-text">${esc(t("Open this page as text"))}</button>
      </div>
      <div class="printed-frame"><img class="printed-img" alt="${esc(t("Madinah Mushaf, page {page}", { page: num(p) }))}" width="622" height="917" loading="${container.childElementCount < 2 ? "eager" : "lazy"}" decoding="async" src="${printedPageUrl(p)}"></div>
      <p class="printed-credit">${esc(t("Madinah Mushaf, King Fahd Complex for the Printing of the Holy Qur'an. Page pictures: King Saud University e-Mushaf."))}</p>`;
    const img = sec.querySelector(".printed-img"), frame = sec.querySelector(".printed-frame"), zoom = sec.querySelector(".printed-zoom");
    const setZoom = (on) => { frame.classList.toggle("zoomed", on); zoom.setAttribute("aria-pressed", String(on)); };
    zoom.addEventListener("click", () => setZoom(!frame.classList.contains("zoomed")));
    img.addEventListener("dblclick", () => setZoom(!frame.classList.contains("zoomed")));
    sec.querySelector(".printed-as-text").addEventListener("click", () => onAsText?.(p));
    img.addEventListener("error", () => {
      frame.innerHTML = `<p class="printed-missing" role="status">${esc(t("This page picture is not on this device and cannot be fetched now. Connect to the internet to see it."))}</p>`;
      zoom.disabled = true;
    });
    container.appendChild(sec);
    if (p === pages[0] && onFirstPage) onFirstPage();
  }
}
