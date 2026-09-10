// STAGE-5-TASK-12 — fail-closed launcher scaffold only.
// No Firebase dependency or Rules test is installed by this task, so normal
// execution stops before spawning anything. A future authorised testing task
// may supply --execute after installing and locking the required tooling.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const DEMO_PROJECT_ID = "demo-quranrevival-note-foundation";
export const EMULATOR_HOST = "127.0.0.1:8085";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const configPath = path.join(here, "firebase.json");
const rulesTestPath = path.join(root, "tests/firestore/note-foundation.rules.test.mjs");

export function assertDemoOnly(projectId = DEMO_PROJECT_ID) {
  if (!projectId.startsWith("demo-")) {
    throw new Error("Refusing emulator launch: project ID must start with demo-.");
  }
  if (projectId === "study-monitoring") {
    throw new Error("Refusing emulator launch: production project ID is forbidden.");
  }
}

export function scaffoldStatus() {
  assertDemoOnly();
  return {
    projectId: DEMO_PROJECT_ID,
    emulatorHost: EMULATOR_HOST,
    configPresent: fs.existsSync(configPath),
    executableRulesTestPresent: fs.existsSync(rulesTestPath),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const status = scaffoldStatus();
  if (!process.argv.includes("--execute")) {
    console.log(JSON.stringify(status, null, 2));
    console.log("Scaffold only: no emulator or Firestore connection was started.");
    process.exit(0);
  }

  if (!status.executableRulesTestPresent) {
    throw new Error("Rules tests are intentionally absent until separately authorised.");
  }

  const command = [
    "emulators:exec",
    "--only", "firestore",
    "--project", DEMO_PROJECT_ID,
    "--config", configPath,
    "node --test tests/firestore/note-foundation.rules.test.mjs",
  ];
  const result = spawnSync("firebase", command, {
    cwd: root,
    env: { ...process.env, FIRESTORE_EMULATOR_HOST: EMULATOR_HOST },
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}
