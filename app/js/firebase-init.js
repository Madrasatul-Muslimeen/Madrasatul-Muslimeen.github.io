// F-001 — Firebase bootstrap (Phase 0, Foundation)
//
// Loads Firebase's modular SDK straight from Google's CDN (no npm, no build
// step — see D4). Connects to the SAME Firebase project the live app uses
// (study-monitoring, D1), so people and history are shared, never orphaned.
//
// Auth and Firestore are started in parallel, and Firestore's offline cache
// is turned on (D5), so the app can paint from local data with no network
// wait on startup (load-speed contract, CLAUDE.md Part 8).

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Sign-in's helper pages (the Owner, 23 Oct 2026: a student on Brave for Android saw "Unable to process request due
// to missing initial state" on study-monitoring.firebaseapp.com/__/auth/handler). Browsers that partition storage
// (Brave, Safari, Firefox) lose the sign-in state when that helper lives on another site than the app, so the same
// helper is served from the app's own site (/__/auth/, copied from Firebase; see __/auth/README.txt) and, on the
// hosts listed here, authDomain is the app's own host. A host is listed ONLY once https://<host>/__/auth/handler is an
// authorised redirect URI of the project's Google OAuth client (the Owner's step in the Google Cloud console, agreed
// 23 Oct 2026); before that, Google would refuse the sign-in for everyone. Elsewhere (localhost, the test harness)
// the helper stays on firebaseapp.com, exactly as before.
const SELF_HOSTED_AUTH_HOSTS = ["madrasatul-muslimeen.github.io", "quranrevival.github.io"]; // J88 part 2: the Owner added both redirect URIs
const authHost = typeof location !== "undefined" && SELF_HOSTED_AUTH_HOSTS.includes(location.hostname)
  ? location.hostname : "study-monitoring.firebaseapp.com";

// Same project as the live app (index.html) — same users, same history.
const firebaseConfig = {
  apiKey: "AIzaSyBhDw1Y8CxicjIZ7xG2TZdCOIl5rsfaomg",
  authDomain: authHost,
  projectId: "study-monitoring",
  storageBucket: "study-monitoring.firebasestorage.app",
  messagingSenderId: "285011621597",
  appId: "1:285011621597:web:46a8f1c5edbc5aa54b4d34",
};

const firebaseApp = initializeApp(firebaseConfig);

// Auth doesn't need to wait on anything — starts immediately.
export const auth = getAuth(firebaseApp);

// Firestore with the offline cache turned on from the first call (D5).
// persistentMultipleTabManager lets the app stay in sync if the owner
// has it open in more than one browser tab at once.
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export { firebaseApp };
