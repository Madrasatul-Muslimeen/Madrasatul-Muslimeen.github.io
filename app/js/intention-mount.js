// The intention reminder on a module page (PCF MSA J05; the Owner, 4 Nov 2026: "Reminder text for all MSA, Build it").
// Quran Study places the card itself (quranrevival.html, beside its Study options setting). Hadith and Dua call
// mountIntentionReminder(host) with an empty host above their own content (MSA Architect placement, 4 Nov 2026).
// Seerah has no page yet; it calls this the same way when it is built.
//
// Everything is read from intention-reminder.js: the same four intentions, the same per-person setting and the SAME one
// "closed today" key, so a reader who said Bismillah in Quran Study does not see it again in Hadith or Dua that day.
// Nothing at start-up beyond reading two localStorage keys (I9); nothing written to Firestore (no Rules).
import { INTENTION_CSS, getIntentionMode, getClosedDay, markClosedToday, shouldShowIntention, intentionCardHtml, wireIntention, localDay } from "./intention-reminder.js";
import { getAppLang } from "./prefs.js";

let styled = false;
// A page's own button rules (hadith.css sizes every button in its section) must not shrink the finger target.
const HOST_CSS = "#intentionHost .intention-bismillah { min-height: 44px; height: auto; box-sizing: border-box; }";
/**
 * Paints the day's intention into `host` when the reader's setting says so, and repaints when `personSelect` changes
 * (the setting and the closed day are per person). Returns { paint } for a page that wants to repaint by hand.
 */
export function mountIntentionReminder(host, { personSelect = document.getElementById("personSelect") } = {}) {
  if (!host) return { paint() {} };
  if (!styled) { const s = document.createElement("style"); s.textContent = INTENTION_CSS + HOST_CSS; document.head.appendChild(s); styled = true; }
  let closedThisOpening = false; // "Every time": closed for this opening of the page only
  const person = () => personSelect?.value || null;
  function paint() {
    const p = person(), today = localDay();
    const show = shouldShowIntention({ mode: getIntentionMode(p), closedDay: getClosedDay(p), today, closedThisOpening });
    host.innerHTML = show ? intentionCardHtml({ lang: getAppLang() === "bn" ? "bn" : "en", day: today }) : "";
    wireIntention(host, () => { closedThisOpening = true; markClosedToday(p, today); host.innerHTML = ""; });
  }
  personSelect?.addEventListener("change", paint);
  // The picker is filled after sign-in without a change event: repaint once its options arrive, so the right person's keys are read.
  if (personSelect) new MutationObserver(paint).observe(personSelect, { childList: true });
  paint();
  return { paint };
}
