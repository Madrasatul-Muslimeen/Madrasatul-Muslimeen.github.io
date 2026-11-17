// Single source of truth for the app version -- every place that shows it
// imports this. Full round-by-round history: docs/governance/version-history.md.
export const APP_VERSION = "15.18";
// J108 (v13.01, the Owner: the app SHOWS "v13.01-31.10.26"): the release's date (Sydney, dd.mm.yy) is DISPLAY only.
// APP_VERSION stays the plain number -- caches (sw.js), QR's worker and every vNN.NN check read it -- and every place
// that PRINTS the version prints APP_VERSION_LABEL (it carries its own "v"). allocate-version.py rewrites the date with the number.
export const APP_VERSION_DATE = "17.11.26";
// J141 (15 Nov 2026, the Owner): the label reads "v15.05 - 15.Nov.2026". Only how it is BUILT changes; the stored
// number and dd.mm.yy date above are untouched. Month names are English three-letter in every language.
const _MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const _D = APP_VERSION_DATE.split(".");
export const APP_VERSION_LABEL = `v${APP_VERSION} - ${parseInt(_D[0], 10)}.${_MON[parseInt(_D[1], 10) - 1]}.20${_D[2]}`;
