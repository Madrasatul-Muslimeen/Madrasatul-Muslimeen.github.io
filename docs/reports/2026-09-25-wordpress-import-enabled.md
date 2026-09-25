# WordPress / Evernote import — switched on (25 Sep 2026)

**Decision:** master-architect, 2026-09-25.

**What was deployed, and by whom.** The Owner published
`docs/governance/2026-09-25-wordpress-import-DEPLOYMENT-candidate.rules` to the
`study-monitoring` Firebase project through the Console and confirmed it in
their own words: *"Rules are published."* The file is today's previously-live
ruleset plus only additions: optional `originalCreatedAt`, `originalModifiedAt`
and `importSource` on `notes`, optional `importSource` on `noteFolders`, and a
guard freezing those fields once written. One existing line gained one word
(`'importSource'` in the `noteFolders` allowed-field list).

**What this change does.**

- `firestore.rules` is synced to that exact file, so the repository matches the
  live project. The commit carries `[already-deployed-manually]` so the
  approval-gated deploy workflow does not ask the Owner to approve a publish
  that already happened.
- `app/js/study-wordpress-import-readiness.js` moves from `ready: false` to
  `ready: true` with this governed decision. The Import button on
  `app/import-notes.html` is enabled for both the WordPress (.xml) and the
  Evernote (.enex) importer, which share this one gate.

**Proof the importer works on these rules.** Before the publish, the real
importer ran against exactly this ruleset on the emulator
(`tools/firestore-emulator/wordpress-import-real-function.rules.test.mjs`) with
the Owner's own export: 1,464 folders, 1,083 Notes, 550 āyah links, 2,319
filings, 0 refused; a second run created nothing. The Evernote suite
(`evernote-import-real-function.rules.test.mjs`) ran 12/0 on the same
ruleset. Both re-run after this sync.

**Not changed.** Pictures are still named placeholders (the Owner's picture
storage decision is pending). No other collection's rules changed.
