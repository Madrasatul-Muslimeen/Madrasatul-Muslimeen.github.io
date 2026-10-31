// QR Stage 1 (PCF J30, Owner decision 15 Oct 2026): today's app becomes
// QuranRevival. These four modules are HIDDEN from every entry point, not
// deleted -- they wait for a future MMSA app. Their pages, module ids,
// catalogue entries, data and saved keys are untouched, and each page still
// opens at its own address. To turn them back on, empty this list.
export const HIDDEN_FROM_QR = ["general", "naturelife", "lifeskill", "health"];

export function isHiddenFromQr(moduleId) {
  return HIDDEN_FROM_QR.includes(moduleId);
}
