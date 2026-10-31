// Health Atlas — claim-level provenance registry (claim-provenance tranche 1).
//
// WHY THIS FILE EXISTS. Foundation tranche 1 (see health-atlas-data.js and
// docs/reports/2026-09-20-health-atlas-foundation-tranche1.md) ported 8
// "general references" (HEALTH_ATLAS_REFERENCES) and gave every organ its
// own refs[] pointing into them. Those references back the ORGAN, or the
// dataset as a whole, in the sense that whoever assembled the source data
// says "these are the kind of sources this organ's material draws from" —
// they were never written to support any ONE specific function statement.
//
// INVESTIGATED DIRECTLY, NOT ASSUMED (see the dated report above for the
// full method): every one of the 46 organs' 82 function statements in
// HEALTH_ATLAS_ORGANS was scanned for an inline citation marker (a
// reference id, a bracketed number, a URL) inside the statement text
// itself. Zero were found. So today, honestly, NOT ONE function statement
// in this dataset is "verified" in the sense of being traceable to a
// specific source for that exact claim — every one of them is
// `general-reference-only`, the same shape as Hadith's own accepted
// position ("zero editions are rights-cleared, so every narration ...
// says so in its own Arabic" — CLAUDE.md). A registry that is 100%
// `general-reference-only` today is the HONEST state, not a shortcoming
// of this file.
//
// THE CLOSED VOCABULARY — exactly two values, never a third without also
// updating tools/health-atlas-verify/claims-integrity.mjs, which checks
// against this list:
//   'general-reference-only' — the organ's/dataset's general references
//        exist but were not written to support this exact statement. The
//        default for anything not individually traced.
//   'cited-evidence' — a SPECIFIC reference (referenceId, resolving into
//        HEALTH_ATLAS_REFERENCES) is bound to this exact statement
//        because it was traced to that source for that claim. Reserve
//        this for a real, traceable citation only — see
//        app/health/README.md before ever setting it. As of this
//        tranche, no such case was found in the ported source data, so
//        none is claimed.
//
// WHY EVERY STATEMENT GETS AN EXPLICIT ENTRY RATHER THAN A GLOBAL DEFAULT.
// A function that returned 'general-reference-only' for anything it did
// not recognise would make "not silently unclassified" true by
// construction, for every function, forever — including one added to
// health-atlas-data.js tomorrow that nobody has looked at. This registry
// instead names EVERY statement explicitly (generated from the live data
// file, not hand-retyped, so the text matches byte-for-byte — see
// tools/health-atlas-verify/claims-integrity.mjs' own registry-generation
// note), so a NEW organ or function statement is missing an entry until
// someone deliberately adds one, and the boundary suite fails by name
// until they do.
//
// NO IMPORTS, on purpose — the same shape as health-atlas-selectors.js.
// This keeps the file loadable by tools/health-atlas-verify/
// import-esm-file.mjs's data: URL technique (which cannot resolve a
// relative import), and keeps it independently auditable: a reviewer can
// read this file's registry against health-atlas-data.js's organ.functions
// without tracing through anything else.

// organId -> [{ statement, status, referenceId? }], one entry per
// health-atlas-data.js organ.functions[] statement, same order, exact text.
export const EVIDENCE_STATUS = Object.freeze({
  GENERAL_REFERENCE_ONLY: 'general-reference-only',
  CITED_EVIDENCE: 'cited-evidence'
});

const VALID_STATUSES = new Set(Object.values(EVIDENCE_STATUS));

export const ORGAN_FUNCTION_CLAIMS = Object.freeze({
    "heart": Object.freeze([
      Object.freeze({ statement: "Pumps blood through the body (roughly 100,000 beats/day)", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Delivers oxygen and nutrients to tissues", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Removes carbon dioxide and metabolic waste", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Helps maintain blood pressure", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "lungs": Object.freeze([
      Object.freeze({ statement: "Gas exchange — oxygen in, carbon dioxide out", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Helps regulate blood pH via CO2 removal", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Filters small clots from venous blood", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "liver": Object.freeze([
      Object.freeze({ statement: "Detoxifies blood", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Produces bile for fat digestion", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Stores glycogen and vitamins", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Synthesises proteins including clotting factors", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Metabolises medications and alcohol", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "stomach": Object.freeze([
      Object.freeze({ statement: "Stores food temporarily", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Secretes acid and pepsin to begin protein digestion", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Churns food into chyme", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Regulates release into the small intestine", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "small-intestine": Object.freeze([
      Object.freeze({ statement: "Main site of nutrient digestion and absorption", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Uses enzymes from the pancreas and bile from the liver", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "large-intestine": Object.freeze([
      Object.freeze({ statement: "Absorbs water and electrolytes", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Hosts the microbiome that ferments fibre", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Forms and stores stool", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "pancreas": Object.freeze([
      Object.freeze({ statement: "Produces digestive enzymes (lipase, amylase, protease)", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Produces insulin and glucagon to regulate blood glucose", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "kidneys": Object.freeze([
      Object.freeze({ statement: "Filter blood, removing waste and excess fluid as urine", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Regulate electrolyte balance", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Help regulate blood pressure (via renin)", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Activate vitamin D", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Stimulate red blood cell production (erythropoietin)", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "bladder": Object.freeze([
      Object.freeze({ statement: "Stores urine produced by the kidneys", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Contracts to expel urine", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "brain": Object.freeze([
      Object.freeze({ statement: "Controls cognition, memory and emotion", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Coordinates voluntary movement", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Regulates autonomic functions (breathing, heart rate)", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Processes sensory input", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "spinal-cord": Object.freeze([
      Object.freeze({ statement: "Relays signals between brain and body", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Coordinates reflexes", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Protected within the vertebral column", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "bones": Object.freeze([
      Object.freeze({ statement: "Structural support", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Protects internal organs", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Stores calcium and phosphorus", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Produces blood cells (bone marrow)", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "skeletal-muscles": Object.freeze([
      Object.freeze({ statement: "Enable voluntary movement and posture", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Generate heat", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Support glucose metabolism", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "thyroid": Object.freeze([
      Object.freeze({ statement: "Produces hormones (T3/T4) that regulate metabolism, growth and energy use", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "adrenal-glands": Object.freeze([
      Object.freeze({ statement: "Produce cortisol (stress response)", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Produce adrenaline", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Produce aldosterone (sodium & fluid balance)", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "skin": Object.freeze([
      Object.freeze({ statement: "Protective barrier against pathogens and UV", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Regulates temperature via sweating", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Synthesises vitamin D from sunlight", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
      Object.freeze({ statement: "Sensory organ for touch", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "eyes": Object.freeze([
      Object.freeze({ statement: "Capture light and convert it to neural signals for the brain to interpret as vision", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "aorta": Object.freeze([
      Object.freeze({ statement: "The body's largest artery — carries oxygen-rich blood from the heart to the rest of the body", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "vena-cava": Object.freeze([
      Object.freeze({ statement: "The two largest veins — return oxygen-poor blood from the upper and lower body back to the heart", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "coronary-arteries": Object.freeze([
      Object.freeze({ statement: "Supply oxygen-rich blood to the heart muscle itself", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "carotid-arteries": Object.freeze([
      Object.freeze({ statement: "Main arteries supplying blood to the brain, neck and face", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "trachea": Object.freeze([
      Object.freeze({ statement: "Airway connecting the throat to the bronchi, carrying air to and from the lungs", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "bronchi": Object.freeze([
      Object.freeze({ statement: "Branching airways carrying air from the trachea into each lung", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "diaphragm": Object.freeze([
      Object.freeze({ statement: "Main muscle of breathing — contracts to draw air into the lungs", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "esophagus": Object.freeze([
      Object.freeze({ statement: "Muscular tube carrying swallowed food from the throat to the stomach", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "gallbladder": Object.freeze([
      Object.freeze({ statement: "Stores and concentrates bile made by the liver, releasing it to help digest fat", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "salivary-glands": Object.freeze([
      Object.freeze({ statement: "Produce saliva to begin starch digestion and ease swallowing", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "vagus-nerve": Object.freeze([
      Object.freeze({ statement: "Major nerve linking the brain to the heart, lungs and digestive tract; central to the rest-and-digest response", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "sciatic-nerve": Object.freeze([
      Object.freeze({ statement: "The body's longest nerve, running from the lower spine down each leg", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "peripheral-nerves": Object.freeze([
      Object.freeze({ statement: "Network of nerves carrying signals between the spinal cord and the rest of the body", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "ureters": Object.freeze([
      Object.freeze({ statement: "Thin tubes carrying urine from each kidney down to the bladder", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "urethra": Object.freeze([
      Object.freeze({ statement: "Tube carrying urine from the bladder out of the body", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "renal-vessels": Object.freeze([
      Object.freeze({ statement: "The renal artery and vein carry blood to and from each kidney for filtering", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "vertebral-column": Object.freeze([
      Object.freeze({ statement: "Chain of vertebrae protecting the spinal cord and supporting the trunk", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "ribcage": Object.freeze([
      Object.freeze({ statement: "Bony cage protecting the heart and lungs and assisting breathing", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "joints-cartilage": Object.freeze([
      Object.freeze({ statement: "Cushion and connect bones, allowing smooth, low-friction movement", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "tendons-ligaments": Object.freeze([
      Object.freeze({ statement: "Tendons attach muscle to bone; ligaments attach bone to bone, stabilising joints", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "pituitary-gland": Object.freeze([
      Object.freeze({ statement: "The body's \"master gland\" — signals the thyroid, adrenal glands and other glands to release their hormones", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "parathyroid-glands": Object.freeze([
      Object.freeze({ statement: "Four small glands beside the thyroid that regulate blood calcium levels", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "pineal-gland": Object.freeze([
      Object.freeze({ statement: "Small brain gland that produces melatonin, regulating the sleep–wake cycle", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "sweat-glands": Object.freeze([
      Object.freeze({ statement: "Release sweat to cool the body via evaporation", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "sebaceous-glands": Object.freeze([
      Object.freeze({ statement: "Produce oil (sebum) that lubricates and waterproofs the skin and hair", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "hair-nails": Object.freeze([
      Object.freeze({ statement: "Protective keratin structures growing from the skin", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "ears": Object.freeze([
      Object.freeze({ statement: "Capture sound waves and maintain balance", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "optic-nerve": Object.freeze([
      Object.freeze({ statement: "Carries visual signals from each eye to the brain", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
    "olfactory-system": Object.freeze([
      Object.freeze({ statement: "Detects smell and contributes strongly to taste perception", status: EVIDENCE_STATUS.GENERAL_REFERENCE_ONLY }),
    ]),
});

/** Returns the closed-vocabulary status for one organ's exact function
 * statement, or null if this registry carries no entry for it (a caller
 * must treat null as "unclassified", never fall back to a default status). */
export function evidenceStatusFor(organId, statement) {
  const entries = ORGAN_FUNCTION_CLAIMS[organId];
  if (!entries) return null;
  const found = entries.find(e => e.statement === statement);
  return found ? found.status : null;
}

/** Returns the reference id a 'cited-evidence' statement names, or null —
 * including when the statement is 'general-reference-only' or unclassified,
 * so a caller can never read a reference id off a claim that is not cited. */
export function referenceIdFor(organId, statement) {
  const entries = ORGAN_FUNCTION_CLAIMS[organId];
  if (!entries) return null;
  const found = entries.find(e => e.statement === statement);
  if (!found || found.status !== EVIDENCE_STATUS.CITED_EVIDENCE) return null;
  return found.referenceId || null;
}

/** True only for the two closed-vocabulary values above. */
export function isValidStatus(status) {
  return VALID_STATUSES.has(status);
}
