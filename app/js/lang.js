// F-005 — Language-key helpers (Phase 0, Foundation)
//
// I11: every user-visible name is language-keyed from day one, e.g.
//   { en: "Al-Fatiha", bn: "আল-ফাতিহা" }
// English is filled first; Bangla comes later into the SAME object, so
// nothing gets rebuilt when Bangla text becomes available.

/**
 * Read helper. Picks the best available text out of a language-keyed
 * object: the requested language, then bn, then en, then (if the object
 * turns out to hold some other language only) whatever is there, then the
 * supplied fallbackKey. Never returns undefined — a visible fallback is
 * always better than a blank name a user can't act on.
 */
export function langText(value, lang = "en", fallbackKey) {
  if (value == null) return fallbackKey ?? "";

  // Defensive only: I11 says this should never happen for new data, but a
  // bare string must not crash the UI if one slips through somewhere.
  if (typeof value === "string") return value;

  return (
    value[lang] ??
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
