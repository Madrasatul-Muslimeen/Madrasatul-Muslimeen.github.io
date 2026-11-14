#!/usr/bin/env bash
# Mutation proof for the hadithNames candidate (PCF MSA J106 S3 part 2).
# Each line breaks ONE condition of the extract; the suite must FAIL on every one. Run from tools/firestore-emulator:
#   npx firebase emulators:exec --only firestore --project demo-quranrevival-hadith-names-v1 \
#     --config hadith-names-v1.firebase.json "bash hadith-names-v1.mutate.sh"
set -u
SRC=../../tests/firestore/hadith-names-v1.proposed.rules
DIR=$(mktemp -d)
caught=0; total=0
mutate() { # name, old, new
  total=$((total+1))
  python3 - "$SRC" "$DIR/$1.rules" "$2" "$3" <<'PY'
import sys
src, out, old, new = sys.argv[1:5]
s = open(src).read()
n = s.count(old)
assert n == 1, f"mutation anchor must occur exactly once, saw {n}: {old!r}"
open(out, "w").write(s.replace(old, new))
PY
  if [ $? -ne 0 ]; then echo "ANCHOR   $1 (anchor not found exactly once)"; return; fi
  if MUTANT_FILE="$DIR/$1.rules" node --test hadith-names-v1.rules.test.mjs >"$DIR/$1.log" 2>&1; then
    echo "UNPROVEN  $1 (suite stayed green)"
  else
    echo "caught    $1"; caught=$((caught+1))
  fi
}
mutate read-any-signed-in    "allow read: if anyMemberOf(tenantId);" "allow read: if signedIn();"
mutate create-any-member     "allow create: if canAdminCatalogue(tenantId)" "allow create: if anyMemberOf(tenantId)"
mutate create-fields-free    "request.resource.data.keys().hasOnly(['tenantId', 'schemaVersion', 'createdBy', 'createdAt', 'updatedAt', 'names'])
                    && " ""
mutate create-tenant-free    "&& request.resource.data.tenantId == tenantId" ""
mutate create-schema-free    "&& request.resource.data.get('schemaVersion', 0) == 1" ""
mutate create-createdby-free "&& request.resource.data.get('createdBy', null) == myUid()" ""
mutate create-createdat-free "&& request.resource.data.get('createdAt', null) is timestamp" ""
mutate create-map-free       "&& request.resource.data.get('names', null) is map
                    && request.resource.data.names.size() <= 3000;
      // \`resource" "&& request.resource.data.names.size() <= 3000;
      // \`resource"
mutate create-cap-free       "&& request.resource.data.get('names', null) is map
                    && request.resource.data.names.size() <= 3000;
      // \`resource" "&& request.resource.data.get('names', null) is map;
      // \`resource"
mutate update-any-member     "&& canAdminCatalogue(tenantId)
                    && request.resource.data.diff" "&& anyMemberOf(tenantId)
                    && request.resource.data.diff"
mutate update-fields-free    "&& request.resource.data.diff(resource.data).affectedKeys().hasOnly(['names', 'updatedAt'])" ""
mutate update-map-free       "&& request.resource.data.get('names', null) is map
                    && request.resource.data.names.size() <= 3000;
      // No delete" "&& request.resource.data.names.size() <= 3000;
      // No delete"
mutate update-cap-free       "&& request.resource.data.get('names', null) is map
                    && request.resource.data.names.size() <= 3000;
      // No delete" "&& request.resource.data.get('names', null) is map;
      // No delete"
mutate delete-allowed        "// No delete (I4/D6)" "allow delete: if canAdminCatalogue(tenantId); // No delete (I4/D6)"
echo "mutations caught: $caught of $total"
[ "$caught" -eq "$total" ]
