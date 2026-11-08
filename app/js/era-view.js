// PCF MSA J115 round 2 (QR Lead, 8 Nov 2026) -- the era view of one āyah: who in each era held which view, and the later
// book and passage that reports it. PURE: no storage, no network, no DOM. The page fetches app/data/era-speakers.json on
// first use (I9) and hands it in with the tenant's Approach rows; eras are found BY NAME (era-approaches.js), never by id.
import { ERA_SAHABAH, ERA_TABIUN, ERA_TABI_TABIIN, findEraApproach } from "./era-approaches.js";

export const ERAS = [ERA_SAHABAH, ERA_TABIUN, ERA_TABI_TABIIN];
const ARABIC_NAME = { [ERA_SAHABAH]: "الصحابة", [ERA_TABIUN]: "التابعون", [ERA_TABI_TABIIN]: "تابع التابعين" };
const LATIN_NAME = { [ERA_SAHABAH]: "Ṣaḥābah", [ERA_TABIUN]: "Tābiʿūn", [ERA_TABI_TABIIN]: "Tābiʿ al-Tābiʿīn" };

// `ids` = data.scholarIds, "<arabic name>|<death AH>" -> a Scholars Database id; a person without an entry has sid null.
const person = (ids) => ([ar, en, d, note]) => ({ ar, en, d, note: note ?? "", sid: ids?.[`${ar}|${d}`] ?? null });
const byDeath = (list, ids) => (list ?? []).map(person(ids)).sort((a, b) => a.d - b.d);

/** "2:228" from a surah/āyah pair or a string; null for anything else. */
export function ayahRef(surah, ayah) {
  const s = Number(surah), a = Number(ayah);
  return Number.isInteger(s) && Number.isInteger(a) && s >= 1 && a >= 1 ? `${s}:${a}` : null;
}

/**
 * The era view of one āyah.
 *   data  = the parsed era-speakers.json   rows = the tenant's Approach rows   ref = "2:228"
 * Returns { ok:false, reason:"no-data" | "no-reports" } when there is nothing to show (the page says so in plain words), else
 * { ok:true, ref, question, views:[{id,en,ar}], eras:[{ era, name, ar, window, approach, approachFound, columns:{[viewId]:[person]}, after:[person], src:[...] }], checked }.
 * `approach` is the tenant's live Approach row for that era, or null: the era's content still shows, and `approachFound:false`
 * lets the page add "the <era> Approach is not in your catalogue yet" rather than hide anything.
 */
export function buildEraView(data, rows, ref) {
  if (!data || typeof data !== "object" || !data.ayat) return { ok: false, reason: "no-data" };
  const entry = ref ? data.ayat[ref] : null;
  if (!entry || !entry.eras) return { ok: false, reason: "no-reports" };
  const views = (entry.views ?? []).map((v) => ({ id: v.id, en: v.en, ar: v.ar }));
  const eras = ERAS.filter((e) => entry.eras[e]).map((e) => {
    const raw = entry.eras[e];
    const approach = findEraApproach(rows, e).live[0] ?? null;
    const columns = {};
    for (const v of views) columns[v.id] = byDeath(raw[v.id], data.scholarIds);
    return {
      era: e, name: LATIN_NAME[e], ar: ARABIC_NAME[e], window: data.windows?.[e] ?? null,
      approach, approachFound: !!approach, columns, after: byDeath(raw.after, data.scholarIds),
      src: (raw.src ?? []).map((s) => ({ book: s.book, died: s.died, note: s.note, view: s.view, quote: entry.quotes?.[s.quote] ?? "" })),
    };
  });
  return eras.length ? { ok: true, ref, question: entry.question ?? "", views, eras, checked: data.checked === true } : { ok: false, reason: "no-reports" };
}

/** How many names an era holds for one view, for the tab's little count. */
export const countFor = (era, viewId) => era?.columns?.[viewId]?.length ?? 0;
