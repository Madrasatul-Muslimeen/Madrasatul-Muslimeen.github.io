// PCF MSA J112 -- THE SECOND, LAZY SIGN-IN TO SIYAGAH'S OWN FIREBASE PROJECT
//
// MSA and QR sign in to study-monitoring (firebase-init.js, D1). J112's notes and folders live in Siyagah's own project,
// so reading them needs a second, SEPARATE Firebase app (named "siyagah", its own sign-in kept apart from MSA's) signed
// in with the reader's same Google account.
//
// I9 / the load-speed contract: NOTHING here runs at startup. This module's only static import is the pure switch;
// Firebase's code and Siyagah's app are loaded by openSiyagahCloud(), which is called only from the Map
// (siyagah-map-link.js) and only when the switch is on. With the switch off, openSiyagahCloud() returns null before
// it loads anything.
//
// The sign-in's helper pages are the SAME self-hosted /__/auth/ files as MSA's (J88, __/auth/README.txt): Firebase's
// helper reads the project from the apiKey it is given, so one copy serves both projects. authDomain follows the SAME
// host list as firebase-init.js (read from it, never retyped): the app's own host where /__/auth/ is self-hosted,
// <projectId>.firebaseapp.com everywhere else (localhost, the test harness).
//
// R1 (Siyagah's read/write API for folders and notes) is NOT here yet: Siyagah's Architect sends it. Until then this
// module only signs in.
import { SIYAGAH_CLOUD_DECLARATION, isSiyagahCloudReady } from "./siyagah-cloud-readiness.js";

export const SIYAGAH_APP_NAME = "siyagah";
const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

/** The helper's host for Siyagah's project: this site when it self-hosts /__/auth/, else the project's firebaseapp.com. */
export function siyagahAuthDomain(hostname, selfHostedHosts, projectId) {
  const hosts = Array.isArray(selfHostedHosts) ? selfHostedHosts : [];
  return hosts.includes(hostname) ? hostname : `${projectId}.firebaseapp.com`;
}

let opening = null;

/**
 * Load Firebase for Siyagah and start its named app. Returns null when the switch is off (nothing is loaded), else
 * { app, auth, sdk } -- once per page; a failed load is forgotten so the next tap tries again.
 */
export function openSiyagahCloud({ declaration = SIYAGAH_CLOUD_DECLARATION, hostname = globalThis.location?.hostname || "" } = {}) {
  if (!isSiyagahCloudReady(declaration)) return Promise.resolve(null);
  if (opening) return opening;
  opening = (async () => {
    const [appSdk, authSdk, init] = await Promise.all([
      import(`${SDK}firebase-app.js`),
      import(`${SDK}firebase-auth.js`),
      import("./firebase-init.js"),
    ]);
    const config = { ...declaration.config, authDomain: siyagahAuthDomain(hostname, init.SELF_HOSTED_AUTH_HOSTS, declaration.config.projectId) };
    const app = appSdk.initializeApp(config, SIYAGAH_APP_NAME);
    return { app, auth: authSdk.getAuth(app), sdk: authSdk };
  })();
  opening.catch(() => { opening = null; });
  return opening;
}

/** Sign in to Siyagah with Google, suggesting the account already signed in to MSA (the reader may pick another). */
export async function siyagahSignIn(cloud, { email = "" } = {}) {
  const provider = new cloud.sdk.GoogleAuthProvider();
  if (email && typeof provider.setCustomParameters === "function") provider.setCustomParameters({ login_hint: email });
  return cloud.sdk.signInWithPopup(cloud.auth, provider);
}

/** Calls back with Siyagah's signed-in user (or null) now and on every change; returns the unsubscribe. */
export function onSiyagahUser(cloud, callback) {
  return cloud.sdk.onAuthStateChanged(cloud.auth, callback);
}

/** Sign out of Siyagah only. MSA's own sign-in is untouched. */
export function siyagahSignOut(cloud) {
  return cloud.sdk.signOut(cloud.auth);
}
