// F-007 — Write-failure surface (Phase 0, Foundation)
//
// I15: a failed write must reach the user. Never console.error alone.
// This is how bug B1 hid for months — four collections failed silently
// while the app looked healthy.
//
// Every write in the new app goes through envelope.js, and envelope.js
// errors should be passed through safeWrite() here so failures always:
//   1. get translated into a plain sentence (no error codes, no jargon)
//   2. get logged to an in-memory session buffer (so F-008's self-check
//      screen can report "N failures this session" even after the on-screen
//      banner has been dismissed)
//   3. get shown on screen immediately, not just written to the console

import { t } from "./i18n.js";

const sessionErrorBuffer = [];

// Full app translation, phase 4: these eight sentences are the ONLY thing a
// person ever sees when a save fails, on every screen in the app -- so a
// Bangla-only reader seeing them in English is I15 half-done: the failure
// reaches them, but not in a language they can act on.
//
// They were invisible to tools/i18n-coverage.mjs (a plain object literal
// matches none of its extractor patterns), which is the fourth time the
// report has been quietly optimistic. Routing them through t() is what makes
// them countable as well as translated.
//
// Each message is a FUNCTION, not a string, for two reasons: it is
// translated at CALL time (the language can change while a page is open,
// same reason statusLabel() is a function), and writing the English inside a
// literal t("...") is what makes tools/i18n-coverage.mjs able to see it at
// all -- a bare object of strings handed to t() through a variable is
// invisible to every one of its extractor patterns.
const PLAIN_MESSAGES = {
  "permission-denied": () => t("That save was blocked by a permissions rule. Nothing was lost, but it did not save — please tell the admin."),
  unavailable: () => t("Could not reach the server. This will save automatically once the connection is back."),
  unauthenticated: () => t("You're signed out, so that could not be saved. Please sign in again."),
  "not-found": () => t("That record could not be found to update. Please refresh and try again."),
  "deadline-exceeded": () => t("That save took too long and was stopped. Please try again."),
  cancelled: () => t("That save was interrupted before it finished. Please try again."),
  "resource-exhausted": () => t("The server is too busy right now. Please try again in a moment."),
  "quota-exceeded": () => t("You've used all the invites allowed for this account. Ask the admin to raise the limit if you need more."),
};

function plainMessageFor(error) {
  const code = error?.code ?? "unknown";
  const known = PLAIN_MESSAGES[code];
  if (known) return known();
  // The code itself stays as-is: it is a diagnostic for whoever is helping,
  // and it is the one part of this sentence that must not be translated.
  return t("That save did not go through ({code}). Please try again, and tell the admin if it keeps happening.", { code });
}

/**
 * Shows a failure to the user right now. Looks for a page-level listener
 * first (so a real UI can render it however it likes); if nothing is
 * listening, falls back to an on-page banner so the message is never only
 * in the console.
 */
function surfaceToUser(entry) {
  const handled = window.dispatchEvent(
    new CustomEvent("qr:write-failure", { detail: entry, cancelable: true })
  );
  if (!handled) return; // a listener called preventDefault() -- it took over display

  let banner = document.getElementById("qr-write-failure-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "qr-write-failure-banner";
    banner.style.cssText =
      "position:fixed;bottom:0;left:0;right:0;background:#f8d7da;color:#58151c;" +
      "padding:0.75rem 1rem;font-family:system-ui,sans-serif;font-size:0.95rem;z-index:9999;";
    document.body.appendChild(banner);
  }
  banner.textContent = entry.message;
}

/**
 * Records a write failure: logs it (still, in addition, not instead of),
 * saves it to the session buffer, and surfaces it to the user.
 */
export function reportWriteFailure(error, context = {}) {
  const entry = {
    at: new Date().toISOString(),
    context,
    code: error?.code ?? "unknown",
    message: plainMessageFor(error),
    technicalMessage: error?.message ?? String(error),
  };
  sessionErrorBuffer.push(entry);
  console.error("[write failure]", context, error);
  if (typeof window !== "undefined") surfaceToUser(entry);
  return entry;
}

/** Read-only view of every write failure recorded this session (for F-008). */
export function getSessionErrorBuffer() {
  return [...sessionErrorBuffer];
}

/**
 * Wraps any write function (e.g. envelope.js's createDocument /
 * updateDocument) so a thrown error is always surfaced, never left to
 * silently reject. Returns { ok: true, result } or { ok: false, entry }.
 */
export async function safeWrite(writeFn, context = {}) {
  try {
    const result = await writeFn();
    return { ok: true, result };
  } catch (error) {
    const entry = reportWriteFailure(error, context);
    return { ok: false, entry };
  }
}
