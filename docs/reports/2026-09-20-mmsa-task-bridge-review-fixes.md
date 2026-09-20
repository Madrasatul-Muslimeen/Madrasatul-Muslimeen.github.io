# MMSA task bridge — Master Architect review fixes

**Date:** 2026-09-20  
**Status:** Review candidate. PR #92 remains unmerged. No Routine or trigger secret is configured; no task has fired.  
**Scope:** Workflow gate, saved Routine prompt, and guard tests only. App version remains 08.31.

## Changes

1. The bridge gate now rejects a comment containing the exact `@claude` mention accepted by the existing `claude.yml` gate. An Owner comment containing both command forms cannot launch both workflows through these predicates. The saved Routine prompt rechecks that condition.
2. Before any `gh api` call, the saved prompt requires the untrusted `comment_id` and `issue_number` to match `^[0-9]+$`. Both API endpoints are quoted. Invalid IDs end the run without a repository change or comment. The stale “all four checks” text was corrected to six.
3. Added guards and mutations for both regressions. Local run: **20 passed, 0 failed; 14 mutations caught, 0 unproven, 0 not applied; exit 0**. A shell probe accepted `123` and rejected `123 --method DELETE`, `1; touch /tmp/nope`, `1/2`, and the empty value.

## Remaining activation gates

- The live GitHub event gate, the Routine API response, Routine credential scope, and re-run reaction behavior remain unobserved in the integrated system. A successful static suite is not an end-to-end test.
- Run GitHub `verify` on the final head and inspect its conclusion.
- Keep PR review before merge. After review, merge this bridge-only PR; then the Owner creates the Routine and enters the one-time URL and token into repository secrets with usage credits off. Claude or the Master Architect handles all subsequent GitHub work and smoke tests.
- Test a single harmless issue task, a mixed-command comment, a pull-request comment, a non-Owner comment, and a manual re-run. Record distinct observations and stop on any unexpected dispatch. Never auto-merge or deploy.

**Claude-MMSA session:** Its remaining context cannot be inspected from GitHub. Ask the session to prepare a dated matching `.md` and `.html` continuation if nearing its limit. All future substantive Claude reports must arrive in matching dated `.md` and `.html` files.
