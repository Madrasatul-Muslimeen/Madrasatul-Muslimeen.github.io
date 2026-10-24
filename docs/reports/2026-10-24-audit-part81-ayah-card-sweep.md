# Audit part 81 (PCF MSA J29): the six crashing ayah-* suites

Issue #1144. One line per suite, added as each is finished.

| Suite | Before | After | Cause | What was done |
|---|---|---|---|---|
| `ayah-card-takenote-family-browser` | died on a 30 s timeout at `#readNotePane [data-rnp-back]` after 2 FAIL | 40 pass / 0 fail | stale (J81 part 3, v12.26: ✚ New note now writes the Note and opens `#journeyTray`; the tray covers the pane) | The two "cursor in pane / typing" checks became one check: the tray opens on the new Note (address names `note=`) and a `notes` write happened. The tray is closed with its ✕ before "Back to Āyah card". `--mutate=self-only` still fails 4 checks. |
