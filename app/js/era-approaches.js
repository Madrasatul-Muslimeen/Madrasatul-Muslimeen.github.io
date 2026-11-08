// PCF MSA J115 (QR Lead, 8 Nov 2026) -- finding the era Approaches (Ṣaḥābah, Tābiʿūn, Tābiʿ al-Tābiʿīn) in the tenant's catalogue BY NAME.
// The Architect's rule (J115 answer (ii)): NO Approach id is written anywhere. The Owner's Approaches 28-37 exist only in the
// tenant's own catalogue, so an era is found by a small normalised-name matcher (transliteration variants, Arabic, Bangla) and
// the page says so in plain words when one is not found. PURE: no imports, no storage, no Firestore.

export const ERA_SAHABAH = "sahabah", ERA_TABIUN = "tabiun", ERA_TABI_TABIIN = "tabi-tabiin";

const MARKS = /[̀-ًͯ-ٰٟۖ-ۭـ]/g;      // Latin combining marks, Arabic harakat and tatweel
const APOS = /[ʿʻʾʼ‘’'``]/g;                // ʿ ʻ ʾ ʼ ' ’ `
const TABI_FORM = /^(tabi|tabe)(un|in|yun|yin|een|oon|ioon|ieen|iyun|iyin|ein)?$/;
const tokens = (name) => String(name ?? "").normalize("NFD").replace(MARKS, "").replace(APOS, "").toLowerCase()
  .replace(/[أإآٱ]/g, "ا").replace(/[^\p{L}\p{N}\p{M}]+/gu, " ").trim().split(" ").filter((t) => t && !/^\d+$/.test(t));

/** `sahabah`, `tabiun`, `tabi-tabiin`, or null: which era a name is. "29 Tābiʿīn" and "Tabeyeen" are Tābiʿūn; "Tābiʿ al-Tābiʿīn" is not. */
export function eraOfName(name) {
  const tk = tokens(name);
  if (!tk.length) return null;
  const latinTabi = tk.filter((t) => /^(tabi|tabe)/.test(t));
  const bnTabi = tk.filter((t) => /^তাব/.test(t));
  const arTabi = tk.filter((t) => /^(تابع|التابع|تابعو|تابعي)/.test(t));
  // a run-together spelling ("tabitabiin", "তাবেতাবেয়ী") holds the word twice in ONE token
  const twice = tk.some((t) => (t.match(/tabi|tabe/g) ?? []).length >= 2 || (t.match(/তাব/g) ?? []).length >= 2);
  const tabiCount = latinTabi.length + bnTabi.length + arTabi.length + (twice ? 1 : 0);
  if (tabiCount >= 2) return ERA_TABI_TABIIN;
  if (latinTabi.length === 1 && TABI_FORM.test(latinTabi[0])) return ERA_TABIUN;
  if (latinTabi.length === 1 && /^tabi?[ey]+n?$|^tabiy?een$/.test(latinTabi[0])) return ERA_TABIUN;
  if (bnTabi.length === 1 || arTabi.length === 1) return ERA_TABIUN;
  if (tk.some((t) => /^(sahab|sahaab)(a|ah|i|is)?$/.test(t) || t === "companions" || /^(ال)?صحاب/.test(t) || /^ସাহাব/.test(t) || /^সাহাব/.test(t))) return ERA_SAHABAH;
  return null;
}

const namesOf = (row) => [row?.name, row?.shortName].flatMap((n) => (n && typeof n === "object" ? Object.values(n) : [n])).filter((x) => typeof x === "string" && x.trim());
const isRemoved = (row) => row?.status === "archived";

/** { live, removed }: every Approach row whose name (or short name) is this era, live and removed apart. */
export function findEraApproach(rows, era) {
  const live = [], removed = [];
  for (const row of rows ?? []) {
    if (!namesOf(row).some((n) => eraOfName(n) === era)) continue;
    (isRemoved(row) ? removed : live).push(row);
  }
  return { live, removed };
}

/**
 * The owner-only one-tap "add the Tābiʿūn Approach after the Ṣaḥābah Approach".
 * `rows` are the tenant's Approach rows; `displayIds` their ids in display order; `nextId(rows)` the SAME id rule Add Approach uses
 * (next after the highest, removed included), handed in so this file stays free of imports.
 * Refuses, with a reason the page can say in words: no live Ṣaḥābah Approach to sit after, a live Tābiʿūn already, a removed Tābiʿūn already.
 * Otherwise { ok:true, id, group, countsForEachAyah, after, ids } where `ids` is the display order with the new Approach straight after Ṣaḥābah.
 */
export function planAddTabiun(rows, { displayIds = [], nextId } = {}) {
  if (typeof nextId !== "function") throw new Error("planAddTabiun needs the Add Approach id rule as nextId");
  const tabiun = findEraApproach(rows, ERA_TABIUN);
  if (tabiun.live.length) return { ok: false, reason: "exists-live", row: tabiun.live[0] };
  if (tabiun.removed.length) return { ok: false, reason: "exists-removed", row: tabiun.removed[0] };
  const sah = findEraApproach(rows, ERA_SAHABAH).live[0];
  if (!sah) return { ok: false, reason: "no-sahabah" };
  const id = nextId(rows);
  const ids = displayIds.filter((x) => x !== id);
  const at = ids.indexOf(sah.id);
  ids.splice(at < 0 ? ids.length : at + 1, 0, id);
  return { ok: true, id, group: sah.group, countsForEachAyah: sah.countsForEachAyah === true, after: sah.id, ids };
}
