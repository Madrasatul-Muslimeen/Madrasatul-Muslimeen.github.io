// Issue #385 -- an Approach's SHORT NAME: the few words printed along its
// slice of the wheels. Pure: no Firebase, no DOM.
//
// Where it comes from, in order:
//   1. the tenant's own `shortName` on the trackable (either language may be
//      empty -- an empty one is skipped, never printed as blank);
//   2. the platform default for the Approach's template (APPROACH_TEMPLATES);
//   3. the other language of 1 / 2, so a slice is never bare;
//   4. the Approach's full name (an Approach the Owner added has no template
//      and, until they write one, falls back to this).

import { APPROACH_TEMPLATES } from "./catalogue-data.js";

const TEMPLATE_BY_ID = new Map(APPROACH_TEMPLATES.map((t) => [t.id, t]));

function pick(obj, lang) {
  const v = obj?.[lang];
  return typeof v === "string" && v.trim() ? v.trim() : "";
}

/** The short name the reader's language should see for `trackable`. */
export function approachShortName(trackable, lang = "en") {
  if (!trackable) return "";
  const own = trackable.shortName;
  const tpl = TEMPLATE_BY_ID.get(trackable.sourceTemplateId)?.shortName;
  const other = lang === "bn" ? "en" : "bn";
  return pick(own, lang) || pick(tpl, lang)
    || pick(own, other) || pick(tpl, other)
    || pick(trackable.name, lang) || pick(trackable.name, other) || String(trackable.id ?? "");
}

/** The tenant's own pair for an edit form: its own value, else the platform default, else empty. */
export function approachShortNamePair(trackable) {
  const tpl = TEMPLATE_BY_ID.get(trackable?.sourceTemplateId)?.shortName;
  return {
    en: pick(trackable?.shortName, "en") || pick(tpl, "en"),
    bn: pick(trackable?.shortName, "bn") || pick(tpl, "bn"),
  };
}
