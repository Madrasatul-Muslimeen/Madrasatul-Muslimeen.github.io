// Keys to Understanding -- the key vocabulary (PCF J03, Builder round K2, 14 Oct 2026).
//
// A "key" is a way of understanding an āyah that a person (or the madrasah) can
// mark on it. The ids below are PERMANENT once written (I5): a stored mark names
// the id, never the English or Bangla name, so renaming a name never erases a
// mark. Every name is language-keyed from day one (I11).
//
// The list is data in this one module: adding a key the Owner names later (J03 Q1
// is still open) is one line here, plus the same id in ayah-keys.mjs's binding
// check. Do not invent keys. Pure: imports nothing, reads and writes nothing.
// Nothing imports this module yet (K2 puts nothing on screen).

export const KEY_IDS = Object.freeze([
  { id: "hard", names: { en: "Hard for me", bn: "আমার জন্য কঠিন" } },
  { id: "gharib", names: { en: "The dictionary (Gharīb)", bn: "অভিধান (গারীব)" } },
  { id: "hadith", names: { en: "Hadith", bn: "হাদীস" } },
  { id: "scholars", names: { en: "The scholars, by era", bn: "যুগ অনুযায়ী আলেমগণ" } },
  { id: "other-ayat", names: { en: "Other āyāt", bn: "অন্যান্য আয়াত" } },
  { id: "passage", names: { en: "Its passage", bn: "এর অংশ" } },
  { id: "asbab", names: { en: "The reason it came down", bn: "নাযিলের কারণ" } },
]);

/** The scope word that marks the madrasah's own keys (a personId marks a person's). */
export const MADRASAH_SCOPE = "madrasah";

/** True when `keyId` is one of the permanent ids above. */
export function isKeyId(keyId) {
  return typeof keyId === "string" && KEY_IDS.some((k) => k.id === keyId);
}

/** A key's name in `lang` ("en" | "bn"), falling back to English; null for an unknown id. */
export function keyName(keyId, lang = "en") {
  const k = KEY_IDS.find((x) => x.id === keyId);
  return k ? (k.names[lang] || k.names.en) : null;
}
