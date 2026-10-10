// F-005 — Language-key helpers (Phase 0, Foundation)
//
// I11: every user-visible name is language-keyed from day one, e.g.
//   { en: "Al-Fatiha", bn: "আল-ফাতিহা" }
// English is filled first; Bangla comes later into the SAME object, so
// nothing gets rebuilt when Bangla text becomes available.
//
// Full app translation, phase 3 (13 Aug 2026) — the PLATFORM-DATA fallback
// below. This is the piece that makes the 31 subject names, their glosses,
// and the 90 Approach Guide paragraphs readable in Bangla.
//
// Why it lives here and not in catalogue-data.js, where those names are
// written: catalogue-data.js is a SEED. Its text was copied into each
// tenant's own Firestore documents when the tenant was created, and it is
// never re-read for an existing tenant. Adding `bn` there would translate
// the app for a madrasah created tomorrow and do nothing at all for the
// owner's own tenant, which was seeded weeks ago -- the one tenant that
// actually matters today. Translating at READ time fixes every tenant at
// once, with no data migration, no Firestore write and no rules change.
//
// A tenant that has authored its own Bangla still wins: value[lang] is
// checked first, so the catalogue is only ever consulted when the document
// itself has nothing to offer in the requested language.

import { t } from "./i18n.js";

/**
 * Read helper. Picks the best available text out of a language-keyed
 * object: the requested language, then the shared translation catalogue
 * keyed by the English text, then bn, then en, then (if the object turns
 * out to hold some other language only) whatever is there, then the
 * supplied fallbackKey. Never returns undefined — a visible fallback is
 * always better than a blank name a user can't act on.
 */
export function langText(value, lang = "en", fallbackKey) {
  if (value == null) return fallbackKey ?? "";

  // Defensive only: I11 says this should never happen for new data, but a
  // bare string must not crash the UI if one slips through somewhere.
  if (typeof value === "string") return value;

  if (value[lang] != null) return value[lang];

  // Nothing stored in the requested language. If the document carries
  // English, ask the translation catalogue for it. t() returns the English
  // unchanged when there is no entry, so this is always safe -- an untranslated
  // subject name simply stays English rather than going blank.
  if (lang !== "en" && typeof value.en === "string" && value.en) return t(value.en);

  return (
    value.bn ??
    value.en ??
    Object.values(value).find((v) => typeof v === "string" && v) ??
    fallbackKey ??
    ""
  );
}

/**
 * Write helper. Guarantees the value being saved is a language-keyed
 * object, never a bare string (I11). If given an existing language-keyed
 * object plus a single language's new text, merges into it instead of
 * replacing it wholesale — so editing the English name never wipes out a
 * Bangla name that was added later.
 */
export function toLangObject(value, lang = "en") {
  if (value && typeof value === "object") {
    return { ...value };
  }
  return { [lang]: value ?? "" };
}

export function setLangText(existing, lang, text) {
  return { ...toLangObject(existing), [lang]: text };
}
