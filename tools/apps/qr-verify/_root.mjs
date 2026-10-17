// Shared set-up for the ported QR checks (import it FIRST: ES imports run in order).
//   - the checks run with the BUILT QR app (build/qr, or QR_BUILD) as the working directory, so every "app/..." they
//     read from disk is the built file, exactly as QR's own checks read their repository root;
//   - REPO is the MSA repository root, for the few checks that are about tooling living in the source;
//   - QR_BASE defaults to http://localhost:8082 (node tools/apps/serve-app.mjs build/qr).
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const BUILD = path.resolve(process.env.QR_BUILD || path.join(REPO, "build/qr"));
process.chdir(BUILD);
process.env.QR_BASE = (process.env.QR_BASE || "http://localhost:8082").replace(/\/+$/, "");
/** import() of a file of the built app, given its path inside it (e.g. "app/js/asma-data.js"). */
export const importBuilt = (p) => import(pathToFileURL(path.join(BUILD, p)).href);
