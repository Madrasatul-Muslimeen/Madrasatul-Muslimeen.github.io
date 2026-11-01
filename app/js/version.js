// Single source of truth for the app version -- every place that shows it
// imports this. Full round-by-round history: docs/governance/version-history.md.
export const APP_VERSION = "13.17";
// J108 (v13.01, the Owner: the app SHOWS "v13.01-31.10.26"): the release's date (Sydney, dd.mm.yy) is DISPLAY only.
// APP_VERSION stays the plain number -- caches (sw.js), QR's worker and every vNN.NN check read it -- and every place
// that PRINTS the version prints APP_VERSION_LABEL (it carries its own "v"). allocate-version.py rewrites the date with the number.
export const APP_VERSION_DATE = "02.11.26";
export const APP_VERSION_LABEL = `v${APP_VERSION}-${APP_VERSION_DATE}`;
