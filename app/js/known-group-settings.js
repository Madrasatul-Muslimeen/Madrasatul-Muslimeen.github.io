// The Owner, 18 Nov 2026 (the Vocab List, "Already Known"): "Enable the title texts editable by me ... a delete button as well for
// admin / owner only. Every device."
//
// The owner's own wording for the Already Known groups' titles, and which groups they have hidden ("deleted"), live in ONE additive
// field of the tenant document, `learnNextKnownGroups`, so every device and every member sees the same. The tenant document is the
// home the Approach list's title (`approachListTitle`) and the banner already use: owner/prime-writable and unrestricted on fields in
// firestore.rules (canAdminIdentity), so NO Rules change is needed, and every member can read it with the read the page already makes.
//
// PURE: no DOM, no Firestore except `saveKnownGroupSettings`, which takes the db and `updateDocument` from the caller's imports.
// I4: nothing is deleted. A hidden group's words keep their ticks (the marks are the Word card's own); hiding only stops the group
// being SHOWN, and "Show again" brings it back as it was.

/** The seven groups in the Vocab List's order, and `_known`, the heading "Already known" itself. Closed: anything else read from the
 *  document is ignored, so a stray field cannot invent a group. */
export const KNOWN_GROUP_KEYS = Object.freeze(["allah", "prophets", "people", "ibadah", "daily", "language", "bnnames"]);
export const KNOWN_HEADING_KEY = "_known";
export const KNOWN_TITLE_KEYS = Object.freeze([...KNOWN_GROUP_KEYS, KNOWN_HEADING_KEY]);
export const KNOWN_SETTINGS_FIELD = "learnNextKnownGroups";
export const KNOWN_TITLE_MAX = 80;
const LANGS = ["en", "bn"];

export function cleanKnownTitle(text) {
  return typeof text === "string" ? text.replace(/\s+/g, " ").trim().slice(0, KNOWN_TITLE_MAX) : "";
}

/** The settings a tenant document carries (or the empty ones). Never throws. */
export function knownGroupSettingsFromTenantDoc(tenantData) {
  const raw = tenantData?.[KNOWN_SETTINGS_FIELD];
  const titles = {};
  if (raw && typeof raw === "object" && raw.titles && typeof raw.titles === "object") {
    for (const k of KNOWN_TITLE_KEYS) {
      const one = raw.titles[k];
      if (!one || typeof one !== "object") continue;
      const clean = {};
      for (const l of LANGS) { const v = cleanKnownTitle(one[l]); if (v) clean[l] = v; }
      if (Object.keys(clean).length) titles[k] = clean;
    }
  }
  const hidden = raw && Array.isArray(raw.hidden) ? KNOWN_GROUP_KEYS.filter((k) => raw.hidden.includes(k)) : [];
  return { titles, hidden };
}

/** The title to show: the owner's wording in this language, else the app's own (`original`). */
export function knownTitleFor(settings, key, lang, original) {
  return settings?.titles?.[key]?.[lang === "bn" ? "bn" : "en"] || original;
}

/** True when the owner has changed this title in this language. */
export function knownTitleIsMine(settings, key, lang) {
  return !!settings?.titles?.[key]?.[lang === "bn" ? "bn" : "en"];
}

/** A NEW settings with the title set in `lang`; an empty text puts the app's own wording back. */
export function withKnownTitle(settings, key, lang, text) {
  const s = knownGroupSettingsFromTenantDoc({ [KNOWN_SETTINGS_FIELD]: settings });
  if (!KNOWN_TITLE_KEYS.includes(key)) return s;
  const l = lang === "bn" ? "bn" : "en", v = cleanKnownTitle(text);
  const one = { ...(s.titles[key] ?? {}) };
  if (v) one[l] = v; else delete one[l];
  const titles = { ...s.titles };
  if (Object.keys(one).length) titles[key] = one; else delete titles[key];
  return { ...s, titles };
}

export function isKnownGroupHidden(settings, key) { return !!settings?.hidden?.includes(key); }

/** A NEW settings with the group hidden (or shown again). */
export function withKnownGroupHidden(settings, key, hide) {
  const s = knownGroupSettingsFromTenantDoc({ [KNOWN_SETTINGS_FIELD]: settings });
  if (!KNOWN_GROUP_KEYS.includes(key)) return s;
  const set = new Set(s.hidden);
  if (hide) set.add(key); else set.delete(key);
  return { ...s, hidden: KNOWN_GROUP_KEYS.filter((k) => set.has(k)) };
}

/** The groups the reader sees, in order: the hidden ones leave. */
export function visibleKnownGroupKeys(settings) {
  return KNOWN_GROUP_KEYS.filter((k) => !isKnownGroupHidden(settings, k));
}

/** Save the whole settings object on the tenant document (additive field). `updateDocument` is envelope.js's. */
export async function saveKnownGroupSettings(db, tenantId, settings, updateDocument) {
  const clean = knownGroupSettingsFromTenantDoc({ [KNOWN_SETTINGS_FIELD]: settings });
  await updateDocument(db, "tenants", tenantId, { [KNOWN_SETTINGS_FIELD]: clean });
  return clean;
}
