// PROBE: does the Firestore EMULATOR refuse a query that production would
// refuse for want of a composite index?
//
// This is load-bearing evidence, not a nicety: if the emulator serves such a
// query happily, then a green emulator suite says nothing at all about whether
// the same query works in production. The emulator is started here WITH an
// index file that declares zero composite indexes, which is the strictest
// honest setup available.
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDocs, limit, orderBy, query, setDoc, where } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-quranrevival-index-probe",
  firestore: { host: "127.0.0.1", port: 8097 },
});
const db = env.authenticatedContext("uid-p1").firestore();

for (let i = 0; i < 3; i++) {
  await setDoc(doc(db, "notes", `t1__n${i}`), {
    tenantId: "t1", ownerPersonId: "p1", status: "active", updatedAt: `2026-09-1${i}`,
  });
}

// Three equality filters + an orderBy on a FOURTH field. In production this
// needs a composite index (tenantId, ownerPersonId, status, updatedAt desc).
let outcome;
try {
  const snap = await getDocs(query(collection(db, "notes"),
    where("tenantId", "==", "t1"), where("ownerPersonId", "==", "p1"),
    where("status", "==", "active"), orderBy("updatedAt", "desc"), limit(100)));
  outcome = `SERVED ${snap.size} documents -- the emulator does NOT enforce composite indexes`;
} catch (err) {
  outcome = `REFUSED (${err.code}) -- the emulator DOES enforce composite indexes`;
}
console.log(`\nRESULT: ${outcome}\n`);
await env.cleanup();
