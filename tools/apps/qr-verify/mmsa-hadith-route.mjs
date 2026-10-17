// QR J02 S1d: the hadith data's home is MMSA (PCA J71), so QR's pages read it from
// https://madrasatul-muslimeen.github.io/tools/hadith-data-pull/output/. In QR's browser checks those requests are
// answered from a LOCAL MMSA checkout instead (the copy point, 077b4db), with the same CORS header GitHub Pages sends
// (access-control-allow-origin: *), so no check depends on the network.
//
//   PORTED: in the MSA repository the hadith data is this repository's own tools/hadith-data-pull/output; QR_MMSA_DIR
//   still points it elsewhere.
import fs from "node:fs";
import path from "node:path";
import { REPO } from "./_root.mjs"; // ported (see _root.mjs)

export const MMSA_HADITH = "https://madrasatul-muslimeen.github.io/tools/hadith-data-pull/output/";

export function mmsaDir() {
  // Ported: MSA is the one source, so MMSA's hadith data is this repository's own (QR_MMSA_DIR still overrides).
  const dir = process.env.QR_MMSA_DIR || REPO;
  if (!fs.existsSync(path.join(dir, "tools/hadith-data-pull/output"))) {
    throw new Error("Set QR_MMSA_DIR to an MMSA checkout (077b4db): the hadith data is read from it, not the network.");
  }
  return dir;
}

/** Answers every request for MMSA's hadith data in `ctx` (a Playwright context) from the local checkout. Register it
 *  AFTER any catch-all route for madrasatul-muslimeen.github.io (the newest route wins). Returns the hit counter. */
export async function routeMmsaHadith(ctx) {
  const dir = mmsaDir();
  const hits = { served: 0, missing: 0 };
  await ctx.route(`${MMSA_HADITH}**`, (route) => {
    const rel = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = path.join(dir, rel);
    const headers = { "access-control-allow-origin": "*", "cache-control": "max-age=600" };
    if (!file.startsWith(path.join(dir, "tools/hadith-data-pull/output") + path.sep) || !fs.existsSync(file)) {
      hits.missing++;
      return route.fulfill({ status: 404, headers, contentType: "text/plain", body: "Not found" });
    }
    hits.served++;
    return route.fulfill({ status: 200, headers, contentType: "application/json; charset=utf-8", body: fs.readFileSync(file) });
  });
  return hits;
}
