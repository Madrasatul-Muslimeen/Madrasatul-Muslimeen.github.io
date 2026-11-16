#!/bin/bash
# Put a text on the status board issue as ONE comment that is edited in place (PCF MSA J144, free1116).
#   bash tools/governance/board-comment.sh <issue> <marker> <file>
# The comment is found by "<!-- <marker> -->" in its body. Found: PATCHed (an edit fires no workflow).
# Not found: created once. claude.yml fires on every comment CREATED and shares the mmsa-builder concurrency
# group, where a new pending run cancels an older pending one (possibly a dispatched Builder round), so a
# job must never create a fresh comment each run. Needs GH_TOKEN and GITHUB_REPOSITORY.
set -euo pipefail
issue=$1; marker=$2; file=$3
grep -q -- "<!-- $marker -->" "$file" || { echo "board-comment: $file does not carry <!-- $marker -->" >&2; exit 2; }
if grep -qiE '@claude|/mmsa-task' "$file"; then echo "board-comment: refusing a text that names the Builder's wake word or the task bridge" >&2; exit 2; fi
id=$(gh api --paginate "repos/$GITHUB_REPOSITORY/issues/$issue/comments?per_page=100" \
  --jq ".[] | select(.body | contains(\"<!-- $marker -->\")) | .id" | head -1)
body=$(jq -Rs '{body: .}' < "$file")
if [ -n "$id" ]; then
  echo "$body" | gh api -X PATCH "repos/$GITHUB_REPOSITORY/issues/comments/$id" --input - > /dev/null
  echo "board-comment: edited comment $id on #$issue"
else
  echo "$body" | gh api -X POST "repos/$GITHUB_REPOSITORY/issues/$issue/comments" --input - > /dev/null
  echo "board-comment: created the $marker comment on #$issue (once)"
fi
