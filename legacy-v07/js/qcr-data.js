// Ayah Collections (QCR) — seed data, imported from the owner's own
// "QCR — Qur'an (calls for) Critical Reasoning" authoring file
// (QCR__QuranCFCR__v01.13__19.06.26.html), 26 Aug 2026.
//
// That file is a standalone content-authoring tool: 18 named thematic
// collections of āyāt pulled from across the whole Qur'an (Naẓar "look",
// Tafakkur "reflect", Tadabbur "ponder", Sayr fil-Arḍ "travel the land",
// and so on — categories of the owner's own "Qur'an calls for Critical
// Reasoning" study framework), 379 āyāt total, 56 of them deliberately
// belonging to more than one collection (e.g. 3:137 sits in "Naẓar",
// "Sayr fil-Arḍ" AND "Proposed New Families" at once).
//
// This file carries ONLY the references, never a second copy of the
// Arabic/English/Bangla text that file also stored — QuranRevival already
// has all of that, live, for every āyah (the owner's own Q1 answer, 26 Aug
// 2026: "All texts come from the QR's own data source"). Every item is a
// plain unit key (I5), built exactly the way `buildUnitKey.ayah()`/
// `buildUnitKey.range()` already do it elsewhere in this app — every one of
// these 379 references is currently single-ayah (ayahStart === ayahEnd in
// the source file), so every item here is an "ayah:" key; "range:" keys are
// supported by qcr.js's own helpers the moment a collection needs one, no
// schema change required.
//
// This is what a brand-new tenant sees until they save their own edit
// (qcr.js's collectionsFrom() falls back to this the same way taglines.js's
// taglinesFrom() falls back to DEFAULT_TAGLINES) — the FIRST manage action
// any owner/prime takes (rename a collection, add/remove/move an āyah,
// archive one) persists the WHOLE list to their own tenant's
// ayahCollections/{tenantId} document from then on, exactly as
// isUsingDefaultTaglines()/taglines.html's own "first save seeds it" shape
// already works.
//
// title is language-keyed (I11) -- English only for now, the same "filled
// now, Bangla later" shape every other seeded name in this app already
// uses (langText() falls back to English until someone (the owner) adds a
// bn value). badge carries the source file's own Y-band label (Y3, Y6–12,
// "All years", "Pending"...) as a plain, undecorated string -- Q5's own
// decision, 26 Aug 2026: a real Y1–Y12 sequencing system belongs to every
// module, not just this one, and is parked as its own future round rather
// than guessed at here; the badge is display-only, nothing filters by it.

export const DEFAULT_QCR_COLLECTIONS = Object.freeze([
  { id: "sec-14-nazar", title: { en: "14 · Naẓar" }, badge: "Y3", order: 10, status: "active", items: ["ayah:6:99", "ayah:10:101", "ayah:28:72", "ayah:32:26", "ayah:32:27", "ayah:43:51", "ayah:50:6", "ayah:51:21", "ayah:67:3", "ayah:67:4", "ayah:88:17", "ayah:88:18", "ayah:88:19", "ayah:88:20", "ayah:3:137", "ayah:6:11", "ayah:12:109", "ayah:16:36"] },
  { id: "sec-15-taaqqul", title: { en: "15 · Ta'aqqul" }, badge: "Y4", order: 20, status: "active", items: ["ayah:2:44", "ayah:2:73", "ayah:2:76", "ayah:2:164", "ayah:2:170", "ayah:2:171", "ayah:2:242", "ayah:3:65", "ayah:3:118", "ayah:5:58", "ayah:5:103", "ayah:6:32", "ayah:6:151", "ayah:7:169", "ayah:8:22", "ayah:10:16", "ayah:10:35", "ayah:10:42", "ayah:10:100", "ayah:11:51", "ayah:12:2", "ayah:12:109", "ayah:13:4", "ayah:16:12", "ayah:16:67", "ayah:21:10", "ayah:21:67", "ayah:22:46", "ayah:23:80", "ayah:24:61", "ayah:25:44", "ayah:26:28", "ayah:28:60", "ayah:29:35", "ayah:29:63", "ayah:30:24", "ayah:30:28", "ayah:36:62", "ayah:36:68", "ayah:37:138", "ayah:37:154", "ayah:39:43", "ayah:40:67", "ayah:43:3", "ayah:45:5", "ayah:49:4", "ayah:57:17", "ayah:59:14", "ayah:67:10", "ayah:68:36"] },
  { id: "sec-20-tafakkur", title: { en: "20 · Tafakkur" }, badge: "Y6–12", order: 30, status: "active", items: ["ayah:2:219", "ayah:2:266", "ayah:3:191", "ayah:6:50", "ayah:7:176", "ayah:10:24", "ayah:13:3", "ayah:16:11", "ayah:16:44", "ayah:16:69", "ayah:30:21", "ayah:39:42", "ayah:45:13", "ayah:59:21"] },
  { id: "sec-21-tadabbur", title: { en: "21 · Tadabbur" }, badge: "Y5", order: 40, status: "active", items: ["ayah:4:82", "ayah:23:68", "ayah:38:29", "ayah:47:24"] },
  { id: "sec-22-tafaqquh", title: { en: "22 · Tafaqquh" }, badge: "Y5", order: 50, status: "active", items: ["ayah:4:78", "ayah:6:65", "ayah:6:98", "ayah:7:179", "ayah:8:65", "ayah:9:81", "ayah:9:87", "ayah:9:122", "ayah:9:127", "ayah:18:93", "ayah:48:15", "ayah:59:13", "ayah:63:3", "ayah:63:7"] },
  { id: "sec-23-tadhakkur", title: { en: "23 · Tadhakkur" }, badge: "Y6", order: 60, status: "active", items: ["ayah:2:221", "ayah:6:152", "ayah:7:57", "ayah:10:3", "ayah:11:24", "ayah:11:30", "ayah:14:25", "ayah:16:17", "ayah:16:90", "ayah:23:85", "ayah:24:1", "ayah:24:27", "ayah:28:43", "ayah:28:46", "ayah:28:51", "ayah:37:155", "ayah:39:27", "ayah:44:58", "ayah:45:23", "ayah:51:49", "ayah:54:15", "ayah:54:17", "ayah:54:22", "ayah:54:32", "ayah:54:40", "ayah:54:51"] },
  { id: "sec-25-fahm", title: { en: "25 · Fahm" }, badge: "Y8–12", order: 70, status: "active", items: ["ayah:21:78", "ayah:21:79"] },
  { id: "sec-26-hukm", title: { en: "26 · Ḥukm / Taḥākum" }, badge: "Y8–12", order: 80, status: "active", items: ["ayah:3:23", "ayah:4:60", "ayah:4:65", "ayah:16:124", "ayah:24:48", "ayah:24:51"] },
  { id: "sec-raa", title: { en: "§4 · Ra'ā family" }, badge: "Y3", order: 90, status: "active", items: ["ayah:2:243", "ayah:2:246", "ayah:2:258", "ayah:3:23", "ayah:4:44", "ayah:4:49", "ayah:4:51", "ayah:4:60", "ayah:4:77", "ayah:13:41", "ayah:14:19", "ayah:14:24", "ayah:14:28", "ayah:16:48", "ayah:17:99", "ayah:19:83", "ayah:22:18", "ayah:22:63", "ayah:22:65", "ayah:24:41", "ayah:24:43", "ayah:25:45", "ayah:26:7", "ayah:26:225", "ayah:29:19", "ayah:29:67", "ayah:30:37", "ayah:31:20", "ayah:31:29", "ayah:31:31", "ayah:35:27", "ayah:36:71", "ayah:39:21", "ayah:40:69", "ayah:41:15", "ayah:46:33", "ayah:58:7", "ayah:58:8", "ayah:58:14", "ayah:59:11", "ayah:67:19", "ayah:71:15", "ayah:89:6", "ayah:105:1"] },
  { id: "sec-sayr", title: { en: "§4 · Sayr fil-Arḍ" }, badge: "Y4", order: 100, status: "active", items: ["ayah:3:137", "ayah:6:11", "ayah:12:109", "ayah:16:36", "ayah:22:46", "ayah:27:69", "ayah:29:20", "ayah:30:9", "ayah:30:42", "ayah:34:18", "ayah:35:44", "ayah:40:21", "ayah:40:82", "ayah:47:10"] },
  { id: "sec-itibar", title: { en: "§4 · I'tibār" }, badge: "Y7–12", order: 110, status: "active", items: ["ayah:3:13", "ayah:12:111", "ayah:16:66", "ayah:23:21", "ayah:24:44", "ayah:59:2", "ayah:79:26"] },
  { id: "sec-epithets", title: { en: "§6 · Audience Epithets" }, badge: "All years", order: 120, status: "active", items: ["ayah:2:179", "ayah:2:197", "ayah:3:13", "ayah:3:18", "ayah:3:190", "ayah:5:100", "ayah:12:111", "ayah:15:75", "ayah:16:78", "ayah:20:54", "ayah:20:128", "ayah:23:78", "ayah:24:44", "ayah:32:9", "ayah:38:43", "ayah:39:21", "ayah:40:54", "ayah:52:32", "ayah:59:2", "ayah:65:10", "ayah:67:23", "ayah:89:5"] },
  { id: "sec-preconditions", title: { en: "§5 · Preconditions" }, badge: "Y1–2", order: 130, status: "active", items: ["ayah:2:12", "ayah:6:109", "ayah:7:95", "ayah:11:75", "ayah:12:15", "ayah:12:107", "ayah:16:26", "ayah:16:45", "ayah:23:56", "ayah:26:202", "ayah:27:18", "ayah:27:50", "ayah:28:9", "ayah:28:11", "ayah:29:53", "ayah:30:31", "ayah:30:33", "ayah:34:9", "ayah:39:8", "ayah:39:25", "ayah:43:66", "ayah:50:8", "ayah:50:33"] },
  { id: "sec-proposed", title: { en: "Proposed New Families" }, badge: "Mixed — pending split", order: 140, status: "active", items: ["ayah:3:137", "ayah:3:178", "ayah:3:180", "ayah:4:95", "ayah:5:100", "ayah:6:11", "ayah:6:40", "ayah:6:46", "ayah:6:47", "ayah:6:50", "ayah:7:84", "ayah:7:86", "ayah:7:103", "ayah:8:59", "ayah:9:19", "ayah:10:39", "ayah:10:50", "ayah:10:59", "ayah:10:73", "ayah:11:24", "ayah:11:28", "ayah:11:63", "ayah:11:88", "ayah:13:16", "ayah:16:75", "ayah:16:76", "ayah:17:62", "ayah:17:68", "ayah:17:69", "ayah:18:63", "ayah:18:102", "ayah:19:77", "ayah:23:55", "ayah:23:115", "ayah:25:43", "ayah:26:75", "ayah:26:205", "ayah:27:14", "ayah:27:51", "ayah:27:69", "ayah:28:40", "ayah:28:71", "ayah:28:72", "ayah:29:2", "ayah:30:9", "ayah:30:42", "ayah:32:18", "ayah:35:12", "ayah:35:19", "ayah:35:22", "ayah:35:40", "ayah:35:44", "ayah:37:73", "ayah:39:9", "ayah:39:29", "ayah:39:38", "ayah:40:21", "ayah:40:58", "ayah:40:82", "ayah:41:34", "ayah:41:52", "ayah:43:25", "ayah:43:80", "ayah:45:23", "ayah:46:4", "ayah:46:10", "ayah:47:10", "ayah:53:19", "ayah:53:33", "ayah:56:58", "ayah:56:63", "ayah:56:68", "ayah:56:71", "ayah:57:10", "ayah:59:20", "ayah:67:14", "ayah:67:16", "ayah:67:17", "ayah:67:22", "ayah:67:28", "ayah:67:30", "ayah:75:3", "ayah:75:36", "ayah:90:5", "ayah:90:7", "ayah:96:9", "ayah:96:11", "ayah:96:13", "ayah:107:1"] },
  { id: "sec-adjacent", title: { en: "§9 · Adjacent / Safeguards" }, badge: "Y6", order: 150, status: "active", items: ["ayah:2:53", "ayah:2:106", "ayah:2:107", "ayah:2:185", "ayah:3:4", "ayah:4:94", "ayah:5:40", "ayah:7:65", "ayah:8:41", "ayah:10:31", "ayah:10:36", "ayah:12:80", "ayah:16:43", "ayah:21:7", "ayah:21:48", "ayah:22:70", "ayah:23:23", "ayah:23:32", "ayah:23:87", "ayah:25:1", "ayah:30:30", "ayah:49:6", "ayah:53:28", "ayah:69:12"] },
  { id: "sec-signs-formula", title: { en: "Āyah-Formula — 'Inna fī dhālika la-āyāt...' (45:3-type)" }, badge: "Y3", order: 160, status: "active", items: ["ayah:2:118", "ayah:2:164", "ayah:2:219", "ayah:2:266", "ayah:3:58", "ayah:3:118", "ayah:3:190", "ayah:5:75", "ayah:6:46", "ayah:6:55", "ayah:6:65", "ayah:6:97", "ayah:6:98", "ayah:6:99", "ayah:6:105", "ayah:6:109", "ayah:6:126", "ayah:7:32", "ayah:7:58", "ayah:7:174", "ayah:9:11", "ayah:10:5", "ayah:10:6", "ayah:10:24", "ayah:10:67", "ayah:10:101", "ayah:12:35", "ayah:13:2", "ayah:13:3", "ayah:13:4", "ayah:14:5", "ayah:15:75", "ayah:16:12", "ayah:16:79", "ayah:17:59", "ayah:20:54", "ayah:20:128", "ayah:23:30", "ayah:24:18", "ayah:24:58", "ayah:24:61", "ayah:27:86", "ayah:29:24", "ayah:29:50", "ayah:30:21", "ayah:30:22", "ayah:30:23", "ayah:30:24", "ayah:30:28", "ayah:30:37", "ayah:31:31", "ayah:32:26", "ayah:34:19", "ayah:39:42", "ayah:39:52", "ayah:42:33", "ayah:44:33", "ayah:45:3", "ayah:45:13", "ayah:46:27", "ayah:57:17", "ayah:74:16"] },
  { id: "sec-halmin", title: { en: "Hal min... (challenge for a rival)" }, badge: "Y4", order: 170, status: "active", items: ["ayah:10:34", "ayah:10:35", "ayah:30:40", "ayah:35:3"] },
  { id: "sec-afaman", title: { en: "Afaman... (comparative-inference)" }, badge: "Y7", order: 180, status: "active", items: ["ayah:3:162", "ayah:9:109", "ayah:10:35", "ayah:11:17", "ayah:13:19", "ayah:13:33", "ayah:16:17", "ayah:28:61", "ayah:32:18", "ayah:35:8", "ayah:39:19", "ayah:39:22", "ayah:39:24", "ayah:41:40", "ayah:47:14", "ayah:67:22"] },
]);
