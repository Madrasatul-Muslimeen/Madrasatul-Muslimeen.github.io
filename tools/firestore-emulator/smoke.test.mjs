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
