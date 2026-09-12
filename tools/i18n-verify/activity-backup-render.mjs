import assert from "node:assert/strict";
import { buildBackupHtml } from "../../app/js/backup-file.js";

const legacy = { date: "2026-09-11", subjectId: "quran", unitKey: "ayah:2:254", unitType: "ayah", trackableId: "recitation", action: "claimed", viaProgramId: null, viaSessionId: null };
const key = "activity-entry:v1|t1|p1|2026-09-07|2026-09-12|quran|ayah:2:255|recitation|practised||class1";
const keyed = { ...legacy, date: "2026-09-12", unitKey: "ayah:2:255", action: "practised", viaSessionId: "class1", eventKey: key, contractVersion: "activity-entry:v1" };
const data = { exportedAt: "2026-09-12T12:00:00Z", tenantId: "t1", people: [{ id: "p1", name: "Reader" }],
  study: [{ personId: "p1", name: "Reader", activityWeeks: [{ weekKey: "2026-09-07", entries: [legacy], v1Events: { [key]: keyed } }] }] };
const html = buildBackupHtml(data);
const activityTable = html.match(/<h3>Activity log <span class="count">2<\/span><\/h3>\s*<div class="scroll"><table>([\s\S]*?)<\/table>/)?.[1];
assert.ok(activityTable, "offline Activity count includes legacy and keyed entries");
assert.equal((activityTable.match(/<tbody><tr>|<\/tr><tr>/g) ?? []).length, 2, "exactly two visible Activity rows");
assert.match(activityTable, /ayah:2:254/);
assert.match(activityTable, /ayah:2:255/);
const raw = JSON.parse(html.match(/<script type="application\/json" id="quranrevival-backup">([\s\S]*?)<\/script>/)?.[1]);
assert.equal(raw.study[0].activityWeeks[0].entries.length, 1, "embedded JSON keeps one raw legacy row");
assert.equal(Object.keys(raw.study[0].activityWeeks[0].v1Events).length, 1, "embedded JSON keeps one raw keyed row");
console.log("==== Offline backup Activity: two displayed, one legacy + one keyed in raw JSON ====");
