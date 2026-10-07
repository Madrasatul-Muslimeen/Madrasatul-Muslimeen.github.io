// Pictures in Notes (item 35, issue #620): the Storage Rules CANDIDATE in the real Storage emulator.
// Every allow is paired with a deny that differs in ONE fact. Run: npm run note-images-storage
// MUTATE_RULES=<path> runs the same cases against a deliberately broken copy (see note-images-storage-mutations.mjs).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { ref, uploadBytes, getBytes, deleteObject, uploadString } from "firebase/storage";

const RULES = process.env.MUTATE_RULES || "../../docs/governance/2026-10-storage-rules-candidate.rules";
let env;
const KB = 1024;
const bytes = (n) => new Uint8Array(n);
const webp = { contentType: "image/webp" };
before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-mmsa-note-images", storage: { rules: fs.readFileSync(RULES, "utf8"), host: "127.0.0.1", port: 9199 } });
});
after(async () => { await env?.cleanup(); });
const as = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).storage();
const seed = async (path) => env.withSecurityRulesDisabled(async (ctx) => { await uploadBytes(ref(ctx.storage(), path), bytes(10), webp); });

test("create: own folder, webp, 200 KB, good name -> allowed", async () => { await assertSucceeds(uploadBytes(ref(as("alice"), "noteImages/alice/AbCdEf12.webp"), bytes(200 * KB), webp)); });
test("create: SOMEONE ELSE's folder (only the uid differs) -> denied", async () => { await assertFails(uploadBytes(ref(as("alice"), "noteImages/bob/AbCdEf13.webp"), bytes(200 * KB), webp)); });
test("create: signed out -> denied", async () => { await assertFails(uploadBytes(ref(as(null), "noteImages/alice/AbCdEf14.webp"), bytes(10), webp)); });
test("create: image/png (only the type differs) -> denied", async () => { await assertFails(uploadBytes(ref(as("alice"), "noteImages/alice/AbCdEf15.webp"), bytes(10), { contentType: "image/png" })); });
test("create: exactly 400 KB -> allowed (the app's own ceiling)", async () => { await assertSucceeds(uploadBytes(ref(as("alice"), "noteImages/alice/AbCdEf16.webp"), bytes(400 * KB), webp)); });
test("create: 400 KB + 1 byte -> denied", async () => { await assertFails(uploadBytes(ref(as("alice"), "noteImages/alice/AbCdEf17.webp"), bytes(400 * KB + 1), webp)); });
test("create: a short name (ab.webp) -> denied", async () => { await assertFails(uploadBytes(ref(as("alice"), "noteImages/alice/ab.webp"), bytes(10), webp)); });
test("create: a .png name -> denied", async () => { await assertFails(uploadBytes(ref(as("alice"), "noteImages/alice/AbCdEf18.png"), bytes(10), webp)); });
test("create: a deeper path -> denied", async () => { await assertFails(uploadBytes(ref(as("alice"), "noteImages/alice/x/AbCdEf19.webp"), bytes(10), webp)); });
test("read: own picture -> allowed", async () => { await seed("noteImages/alice/ReadMe0001.webp"); await assertSucceeds(getBytes(ref(as("alice"), "noteImages/alice/ReadMe0001.webp"))); });
test("read: someone else's picture -> denied", async () => { await seed("noteImages/alice/ReadMe0002.webp"); await assertFails(getBytes(ref(as("bob"), "noteImages/alice/ReadMe0002.webp"))); });
test("read: signed out -> denied", async () => { await seed("noteImages/alice/ReadMe0003.webp"); await assertFails(getBytes(ref(as(null), "noteImages/alice/ReadMe0003.webp"))); });
test("update: overwrite own existing picture -> denied (D6)", async () => { await seed("noteImages/alice/Keep000001.webp"); await assertFails(uploadBytes(ref(as("alice"), "noteImages/alice/Keep000001.webp"), bytes(10), webp)); });
test("delete: own picture -> denied (D6, I4)", async () => { await seed("noteImages/alice/Keep000002.webp"); await assertFails(deleteObject(ref(as("alice"), "noteImages/alice/Keep000002.webp"))); });
test("anything else in the bucket -> denied", async () => { await assertFails(uploadString(ref(as("alice"), "other/alice/x.txt"), "x")); });
