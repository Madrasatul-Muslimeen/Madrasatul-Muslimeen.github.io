// Shared seed for catalogue-sections-browser.mjs: a realistic tenant, 8 OWNED
// sections and 40 Quran Approaches, written out by hand.
export const SEC_NAMES = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta"];
export const SEC_NAMES_BN = ["আলফা", "বিটা", "গামা", "ডেল্টা", "এপসিলন", "জিটা", "ইটা", "থিটা"];
// [number, group, order]
//  a07: NO group number, matched to Beta by NAME only.
//  a12: a BOGUS group (9, no such section), matched to Gamma by NAME only.
//  a38/a39/a40: added through "Add an Approach" later, so order 38-40, filed in sections 1, 5, 8.
export const ROWS = [];
for (let i = 1; i <= 37; i++) ROWS.push([i, Math.min(8, Math.ceil(i / 5)), i]);
ROWS.push([38, 1, 38], [39, 5, 39], [40, 8, 40]);

export function seedJs() {
  return `
DATA.tenants[0].approachSections = ${JSON.stringify(SEC_NAMES.map((en, i) => ({ n: i + 1, name: { en, bn: SEC_NAMES_BN[i] } })))};
DATA.trackables = DATA.trackables.filter((t) => t.subjectId !== "quran");
const NAMES = ${JSON.stringify(SEC_NAMES)}, NAMES_BN = ${JSON.stringify(SEC_NAMES_BN)};
for (const [n, g, order] of ${JSON.stringify(ROWS)}) {
  const id = "a" + String(n).padStart(2, "0");
  const row = { _id: "t1__" + id, tenantId: "t1", subjectId: "quran", moduleId: "quranrevival", order, status: "active",
    name: { en: "Way " + id, bn: "পথ " + id }, group: g, groupName: { en: NAMES[g - 1], bn: NAMES_BN[g - 1] },
    guide: { what: { en: "w" }, how: { en: "h" }, measure: { en: "m" } }, panels: ["text"] };
  if (id === "a07") delete row.group;
  if (id === "a12") row.group = 9;
  DATA.trackables.push(row);
}
`;
}
