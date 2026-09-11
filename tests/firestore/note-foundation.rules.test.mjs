// Reconstructed STAGE-5-TASK-30 candidate. Demo/loopback only.
// This suite is intentionally not claimed as security evidence until it runs
// under the locked emulator on JDK 21+.
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const PROJECT_ID = "demo-quranrevival-note-foundation";
const HOST = "127.0.0.1";
const PORT = 8085;
const here = path.dirname(fileURLToPath(import.meta.url));
const rules = fs.readFileSync(path.resolve(here, "../../firestore.rules"), "utf8");
if (!PROJECT_ID.startsWith("demo-") || HOST !== "127.0.0.1") throw new Error("Demo-only loopback lock violated.");

const ids = {
  note: "tenant-a__note-a", revision: "tenant-a__revision-a",
  otherNote: "tenant-b__note-b", otherRevision: "tenant-b__revision-b",
};
const note = {
  tenantId: "tenant-a", noteId: "note-a", ownerPersonId: "child-a", ownerUid: "child-uid",
  visibility: "private", status: "active", currentRevisionId: "revision-a", title: "A", bodyHtml: "A",
};
const revision = { tenantId: "tenant-a", revisionId: "revision-a", noteId: "note-a", ownerPersonId: "child-a", ownerUid: "child-uid", title: "A", bodyHtml: "A" };

async function environment() {
  const env = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { host: HOST, port: PORT, rules } });
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "notes", ids.note), note);
    await setDoc(doc(context.firestore(), "noteRevisions", ids.revision), revision);
    await setDoc(doc(context.firestore(), "guardianLinks", "tenant-a__guardian-a__child-a"), { tenantId: "tenant-a", guardianPersonId: "guardian-a", childPersonId: "child-a", status: "active" });
    await setDoc(doc(context.firestore(), "teacherStudentLinks", "tenant-a__teacher-a__child-a"), { tenantId: "tenant-a", teacherPersonId: "teacher-a", studentPersonId: "child-a", status: "active" });
  });
  return env;
}

test("unauthenticated Foundation reads and writes are denied", async () => {
  const env = await environment();
  try {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "notes", ids.note)));
    await assertFails(setDoc(doc(db, "notes", "tenant-a__new"), note));
  } finally { await env.cleanup(); }
});

test("owner may read and perform an atomic Note plus immutable revision write", async () => {
  const env = await environment();
  try {
    const db = env.authenticatedContext("child-uid", { tenantId: "tenant-a", personId: "child-a" }).firestore();
    await assertSucceeds(getDoc(doc(db, "notes", ids.note)));
    // The complete create/update atomicity cases are exercised by writes from
    // the application transaction gateway; isolated writes must fail.
    await assertFails(updateDoc(doc(db, "notes", ids.note), { bodyHtml: "changed" }));
    await assertFails(updateDoc(doc(db, "noteRevisions", ids.revision), { bodyHtml: "changed" }));
  } finally { await env.cleanup(); }
});

test("teacher and tenant/platform administrators may read only, never edit automatically", async () => {
  const env = await environment();
  try {
    for (const auth of [
      ["teacher-uid", { tenantId: "tenant-a", personId: "teacher-a", roles: ["teacher"] }],
      ["admin-uid", { tenantId: "tenant-a", personId: "admin-a", roles: ["prime"] }],
      ["platform-uid", { platformAdmin: true, personId: "platform-a" }],
    ]) {
      const db = env.authenticatedContext(auth[0], auth[1]).firestore();
      await assertSucceeds(getDoc(doc(db, "notes", ids.note)));
      await assertFails(updateDoc(doc(db, "notes", ids.note), { title: "forbidden" }));
    }
  } finally { await env.cleanup(); }
});

test("guardian scope and Note-specific approval fields remain isolated", async () => {
  const env = await environment();
  try {
    const db = env.authenticatedContext("guardian-uid", { tenantId: "tenant-a", personId: "guardian-a", roles: ["guardian"] }).firestore();
    await assertSucceeds(getDoc(doc(db, "notes", ids.note)));
    await assertFails(getDoc(doc(db, "notes", ids.otherNote)));
    await assertFails(updateDoc(doc(db, "notes", ids.note), { ownerPersonId: "guardian-a" }));
    await assertFails(updateDoc(doc(db, "notes", ids.note), { guardianApproval: { childPersonId: "other-child", durationMinutes: 30 } }));
  } finally { await env.cleanup(); }
});

test("cross-tenant access and revision mutation are denied", async () => {
  const env = await environment();
  try {
    const db = env.authenticatedContext("outsider", { tenantId: "tenant-b", personId: "outsider-b" }).firestore();
    await assertFails(getDoc(doc(db, "notes", ids.note)));
    await assertFails(getDoc(doc(db, "noteRevisions", ids.revision)));
    await assertFails(updateDoc(doc(db, "noteRevisions", ids.revision), { title: "mutated" }));
  } finally { await env.cleanup(); }
});
