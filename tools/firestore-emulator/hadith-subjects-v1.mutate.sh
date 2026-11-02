#!/usr/bin/env bash
# Mutation proof for the hadithSubjects candidate (PCF MSA J106 round 2).
# Each line breaks ONE condition of the extract; the suite must FAIL on every
# one. Run from tools/firestore-emulator inside the emulator:
#   npx firebase emulators:exec --only firestore --project demo-quranrevival-hadith-subjects-v1 \
#     --config hadith-subjects-v1.firebase.json "bash hadith-subjects-v1.mutate.sh"
set -u
SRC=../../tests/firestore/hadith-subjects-v1.proposed.rules
DIR=$(mktemp -d)
caught=0; total=0
mutate() { # name, python replacement (old, new)
  total=$((total+1))
  python3 - "$SRC" "$DIR/$1.rules" "$2" "$3" <<'PY'
import sys
src, out, old, new = sys.argv[1:5]
s = open(src).read()
n = s.count(old)
assert n == 1, f"mutation anchor must occur exactly once, saw {n}: {old!r}"
open(out, "w").write(s.replace(old, new))
PY
  if MUTANT_FILE="$DIR/$1.rules" node --test hadith-subjects-v1.rules.test.mjs >"$DIR/$1.log" 2>&1; then
    echo "UNPROVEN  $1 (suite stayed green)"
  else
    echo "caught    $1"; caught=$((caught+1))
  fi
}
mutate read-any-signed-in   "allow read: if anyMemberOf(tenantId);" "allow read: if signedIn();"
mutate create-any-member    "allow create: if canAdminCatalogue(tenantId)" "allow create: if anyMemberOf(tenantId)"
mutate create-tenant-free   "&& request.resource.data.tenantId == tenantId" ""
mutate create-schema-free   "&& request.resource.data.get('schemaVersion', 0) == 1" ""
mutate create-createdby-free "&& request.resource.data.get('createdBy', null) == myUid()" ""
mutate create-createdat-free "&& request.resource.data.get('createdAt', null) is timestamp" ""
mutate update-schema-free   "&& request.resource.data.get('schemaVersion', null) == resource.data.get('schemaVersion', null)" ""
mutate create-map-free      "&& request.resource.data.get('subjects', null) is map;
      // \`resource" ";
      // \`resource"
mutate update-any-member    "&& canAdminCatalogue(tenantId)
                    && request.resource.data.tenantId == resource" "&& anyMemberOf(tenantId)
                    && request.resource.data.tenantId == resource"
mutate update-tenant-free   "&& request.resource.data.tenantId == resource.data.tenantId" ""
mutate update-createdby-free "&& request.resource.data.get('createdBy', null) == resource.data.get('createdBy', null)" ""
mutate update-createdat-free "&& request.resource.data.get('createdAt', null) == resource.data.get('createdAt', null)" ""
mutate update-map-free      "&& request.resource.data.get('subjects', null) is map;
      // No delete" ";
      // No delete"
mutate delete-allowed       "// No delete (I4/D6)" "allow delete: if canAdminCatalogue(tenantId); // No delete (I4/D6)"
echo "mutations caught: $caught of $total"
[ "$caught" -eq "$total" ]
