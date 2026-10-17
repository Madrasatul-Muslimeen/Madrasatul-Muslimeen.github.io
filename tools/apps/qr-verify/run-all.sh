#!/bin/bash
# Runs every ported QR check against the built QR, from the MSA repository root:
#   node tools/apps/build-app.mjs qr && bash tools/apps/qr-verify/run-all.sh
# upgrade-browser needs QR_REPO=<a full clone of QuranRevival/QuranRevival.github.io> (its old commit fe028eb).
set -u
cd "$(dirname "$0")/../../.."
L=${QR_LOGS:-build/qr-logs}; mkdir -p "$L"
node tools/apps/serve-app.mjs build/qr > "$L/serve.log" 2>&1 & SP=$!
trap 'kill $SP' EXIT
sleep 1
failed=0
for c in naming asma-poster-data-check asma-local-sync pages-browser front-browser asma-browser asma-offline-browser asma-screensaver-browser asma-store-browser one-worker-browser quran-ldog-browser qr-offline-browser upgrade-browser links-browser explore-asma-wheel-browser range-bookmark-browser fatiha-opening-browser approach-window-browser mmsa-hadith-route import-walk; do
  timeout 1500 node "tools/apps/qr-verify/$c.mjs" > "$L/$c.log" 2>&1; rc=$?
  [ $rc -eq 0 ] || failed=1
  echo "$c rc=$rc $(grep -iE 'passed|failed' "$L/$c.log" | tail -1)"
done
exit $failed
