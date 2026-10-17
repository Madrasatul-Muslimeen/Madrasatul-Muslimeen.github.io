// QR J01 R4 (QR-only): the Asma app's "About and privacy" page (app/asma-about.html). Both languages are in the
// page; this shows the reader's one (MMSA's prefs.js key, shared with the app), lets them switch, clears what the
// app keeps on this device when asked twice, and takes them back to exactly where they were in the app.
import { getAppLang, setAppLang } from "./prefs.js";

/** What "Clear" removes: the Studied ticks, the screensaver's settings and the description choice. */
export const CLEARED_KEYS = Object.freeze(["qr_asma_studied_v1", "mm_screensaver", "mmsa.asmaDescriptionSource"]);

function paint() {
  const lang = getAppLang();
  document.documentElement.lang = lang;
  document.title = lang === "bn" ? "পরিচিতি ও গোপনীয়তা · আসমাউল হুসনা" : "About and privacy · Asma ul Husna";
  document.querySelectorAll("[data-ab-lang]").forEach((el) => { el.hidden = el.dataset.abLang !== lang; });
  document.querySelectorAll("[data-ab-set]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.abSet === lang)));
}
document.querySelectorAll("[data-ab-set]").forEach((b) => b.addEventListener("click", () => { setAppLang(b.dataset.abSet); paint(); }));

// Way back: when the reader came from the app, step back to it (same Name or tab, same place); else open it.
document.querySelector("[data-ab-back]").addEventListener("click", (e) => {
  let fromApp = false;
  try { fromApp = new URL(document.referrer).pathname.endsWith("/app/asma.html"); } catch { /* no referrer */ }
  if (fromApp && history.length > 1) { e.preventDefault(); history.back(); }
});

for (const box of document.querySelectorAll("[data-ab-privacy]")) {
  const ask = box.querySelector("[data-ab-clear]"), yes = box.querySelector("[data-ab-clear-yes]"), status = box.querySelector("[data-ab-status]");
  const bn = box.closest("[data-ab-lang]").dataset.abLang === "bn";
  ask.addEventListener("click", () => {
    yes.hidden = false;
    status.textContent = bn ? "নিশ্চিত হলে \"হ্যাঁ, মুছে দিন\" চাপুন।" : "Tap \"Yes, clear them\" to be sure.";
    yes.focus();
  });
  yes.addEventListener("click", () => {
    for (const k of CLEARED_KEYS) { try { localStorage.removeItem(k); } catch { /* storage blocked */ } }
    yes.hidden = true;
    status.textContent = bn ? "মুছে দেওয়া হয়েছে।" : "Cleared.";
  });
}
paint();
