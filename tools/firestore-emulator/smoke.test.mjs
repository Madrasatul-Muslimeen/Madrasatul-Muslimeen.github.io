import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertFails,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc } from "firebase/firestore";

const PROJECT_ID = "demo-quranrevival-note-foundation";
const here = path.dirname(fileURLToPath(import.meta.url));
const rules = fs.readFileSync(path.resolve(here, "../../firestore.rules"), "utf8");
// UPDATED 5 Nov 2026: this suite could not START. Its emulator config (firebase.json beside this file) pointed
// `rules` at ../../firestore.rules, and the locked firebase-tools refuses a path outside the directory holding
// firebase.json ("../../firestore.rules is outside of project directory"), so `npm run smoke` stopped before
// any assertion ran. The config now names closed.placeholder.rules (deny-all, the remedy recorded in
// docs/governance/phase3-word-progress-rules-candidate-2026-09-13.md section 7). What is TESTED is unchanged:
// the live firestore.rules read above is what initializeTestEnvironment() installs.

test("demo-only Firestore emulator loads current Rules and denies an unauthenticated Foundation read", async () => {
  if (!PROJECT_ID.startsWith("demo-")) {
    throw new Error("Smoke test project must use the demo- prefix.");
  }

  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8085,
      rules,
    },
  });

  try {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "notes", "demo-tenant__demo-note")));
  } finally {
    await testEnv.cleanup();
  }
});
