// PCF MSA J112 (BWN J27 Stage 2, the Owner's go, 3 Nov 2026) -- THE SIYAGAH CLOUD SWITCH
//
// WHY THIS FILE EXISTS. J112 makes MSA and QR work on Siyagah's REAL Mapping My Journey folders and notes, through
// Siyagah's R1 API, after a SECOND, separate sign-in to Siyagah's own Firebase project. Siyagah is still building R1,
// so the parts that do not need it (the lazy sign-in in siyagah-cloud.js, the Map hook in siyagah-map-link.js) are
// built now and stay OFF until this switch says otherwise.
//
// Same shape as siyagah-flags-readiness.js:
// (1) IT DEFAULTS TO FALSE, as a literal, with the burden of proof entirely on enablement.
// (2) THIS MODULE IS PURE AND IMPORTS NOTHING. It cannot look at the network, a file or the page to decide; the
//     inability is the enforcement. Do not give it an import.
// (3) FLIPPING `ready` ALONE DOES NOTHING: isSiyagahCloudReady() also needs a well-formed `decision` (a closed
//     authority, a real date, a reference) AND Siyagah's web-app `config` (apiKey and projectId; appId when it has
//     one), which Siyagah's Architect sent with R1's API.
//
// ENABLEMENT IS THE MASTER ARCHITECT'S, once R1 is live and the Owner has done the 3 free sign-in steps (Siyagah's
// Firebase Authorized domains: both app hosts; Siyagah's Google OAuth client: https://<host>/__/auth/handler for both).
// A builder round never flips it on its own say; R1's was flipped on the Master Architect's instruction (J112 R1).

/** Who may switch it on. Closed: a module cannot authorise itself. */
export const SIYAGAH_CLOUD_AUTHORITIES = Object.freeze(["master-architect"]);

/**
 * THE DECLARATION. ON for R1 (4 Nov 2026): Siyagah's R1 is live (v05.66), its Architect sent the public web config
 * below and the notebook id, and the Owner has added both app hosts to Siyagah's Authorised domains. Switched on by the
 * MSA Master Architect's job PCF MSA J112 round R1, built by its builder round on the Architect's instruction.
 * The config is Siyagah's PUBLIC web-app config (an apiKey for a Firebase web app is not a secret; Siyagah's own
 * Firestore Rules are what keep its data to the owner's sign-in). Siyagah has no appId; none is needed to read.
 */
export const SIYAGAH_CLOUD_DECLARATION = Object.freeze({
  ready: true,
  decision: Object.freeze({ by: "master-architect", on: "2026-11-04", reference: "PCF MSA J112 R1 (Siyagah R1 live, v05.66; MMJ-SHARE reader contract)" }),
  config: Object.freeze({
    apiKey: "AIzaSyBxrQ5uNrerOAFiCmUbUkUM8tjMpjKygsA",
    authDomain: "aaas-notebook.firebaseapp.com",
    projectId: "aaas-notebook",
    storageBucket: "aaas-notebook.firebasestorage.app",
    messagingSenderId: "32292493079",
  }),
  notebookId: "nb-mriuc27o-f44402",
  job: "PCF MSA J112",
  note: "R1: the Map reads the owner's Siyagah Mapping My Journey folders and notes, read-only.",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const NONEMPTY = (v) => typeof v === "string" && v.trim().length > 0;

/**
 * Is a Siyagah web-app config well formed? apiKey and projectId are required (all Auth and Firestore need); appId is
 * optional (Siyagah's own config has none, R1, 4 Nov 2026) but, when given, must not be empty.
 */
export function isSiyagahCloudConfig(config) {
  if (!config || typeof config !== "object") return false;
  if (!NONEMPTY(config.apiKey)) return false;
  if ("appId" in config && !NONEMPTY(config.appId)) return false;
  if (!NONEMPTY(config.projectId) || !/^[a-z0-9-]{4,40}$/.test(config.projectId)) return false;
  if (config.projectId === "study-monitoring") return false; // the SECOND sign-in is never to MSA's own project (D1)
  return true;
}

/** Is the Siyagah cloud on? True ONLY for an explicit governed decision with a real config; every other shape is false. */
export function isSiyagahCloudReady(declaration = SIYAGAH_CLOUD_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!SIYAGAH_CLOUD_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on) || Number.isNaN(Date.parse(d.on))) return false;
  if (!NONEMPTY(d.reference)) return false;
  return isSiyagahCloudConfig(declaration.config);
}
