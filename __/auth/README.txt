Firebase Authentication's helper pages, served from this site so that sign-in works in browsers that partition
storage (Brave, Safari, Firefox). The Owner's report, 23 Oct 2026: a student on Brave for Android saw "Unable to process
request due to missing initial state" on study-monitoring.firebaseapp.com/__/auth/handler.

Source: Firebase's "Best practices for using signInWithRedirect on browsers that block third-party storage access",
option 3 (self-host the helper code). Copied unchanged on 23 Oct 2026 from
https://study-monitoring.firebaseapp.com/__/auth/{handler,handler.js,experiments.js,iframe,iframe.js}.
GitHub Pages serves an extensionless file as a download, so `handler` and `iframe` are folders holding index.html
(Pages redirects /__/auth/handler?... to /__/auth/handler/?... and keeps the query), and their script tags point at
/__/auth/... absolutely. That is the only change. The root .nojekyll lets GitHub Pages serve a folder whose name
starts with "_".

Used only on the hosts listed in app/js/firebase-init.js SELF_HOSTED_AUTH_HOSTS, and a host is listed only once
https://<host>/__/auth/handler is an authorised redirect URI of the project's Google OAuth client. Refresh these files
from the URLs above if Firebase changes them (tools/i18n-verify/self-hosted-auth.mjs checks they match).
