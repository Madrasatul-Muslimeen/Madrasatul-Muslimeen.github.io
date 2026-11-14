# MSA Master Architect 105L: handover, 14 Nov 2026 (~4:35 pm Sydney)

Session `session_01PL2xbL63PQaCSLhHQqjDqx`, took over from 104L at 10:52 am 14 Nov. Handing over on the context rule.
`main` = **v14.39** (release #1714 merged 4:31 pm, ee6346f7; qr-verify on the 14.39 build: exit 0, all 30 rc=0; PCF wn-v1439 + monitor written; "PCA ▸ released v14.39" sent).
The ledger's next number is **14.40**.

**Who:** PCA = **41L** `session_01PL2xbKYBDqo3JkZN1gEpQT` (took over from 40L at 3:07 pm; check meta/global.sessionUrl). Keep-alive
`trig_01BaviTNz5HaEeEye83Uh5Nx` points at 105L: ask the PCA to move it. QR Lead = 47L `session_01PL2xbNAMQAyiv5S52x8NPv`.
Hadith Lead = 14L `session_01PL2xbNbDNZXULwY3eGdqPD`. Dua Lead = 11L `session_01PL2xbHyfbrXS8hET9sKE7P`.

## Done this session
- **v14.38** (#1711, 3:39 pm): #1709 (14L, J106 S1: Hadith Study's ONE bar Menu·Books·Subjects·Explore·Search; Settings in Menu
  with the shared preview note and Person picker re-parented, not changed; "· Preview" cue; Dua redirects) + tests-only #1710 (47L,
  card-look's Notes-pane opener). QR live 14.38 at 3:42 pm (PCA). PCF wn-v1438 + monitor written; "PCA ▸ released v14.38" sent.
  Review found the `wraprow` mutation anchor dead (it crashed, proving nothing); 14L re-anchored it and made a missing anchor fail by name.
- **v14.39** (#1714): #1712 (11L, J104): Dua groups INSIDE the Dua groups menu (separate pop-up and `?dgp=` gone; `?g=g-xxxxxxxx`),
  Keep tab ticks a Dua into groups, "Remove from this list" = off that list only, admin edits titles (en/bn), admin "Add a new Dua"
  (permanent `new-` key). One background read on the Dua page AFTER first paint (I9, flagged in the CHANGELOG). The Owner's go-ahead
  is their own chat message in 11L's session, 2026-11-14T04:21:49Z (I read it in that session's record): "I wanted these functions
  to work in the Dua Group's menu, not a separate Dua Group … 1. Ok, 2. D03, yes. 3. Delete means delete (not from the database, but
  from the list a Dua is attached or created) 4. Okay. *Enable the Dua title editable by Admin." Review made 11L carry the deleted
  pop-up suite's five guarantees into the new suite in place (I4 delete, rename keeps list, way back, I15 refused write, I9 first paint).
- S3 decided with 14L: subject names/order/add/retire ride the ALREADY-PUBLISHED `hadithSubjects` rule (firestore.rules:749, no
  hasOnly, no delete) with no Rules change (emulator + rules-authorisation-executable both ways required); the Bangla book/group names
  get a SEPARATE `hadithNames` Rules candidate (14L writes, Architect reviews, Owner publishes), after S3; no hardening now.

## State at handover / NEXT
1. **#1714**: DONE (merged, PCF written, PCA told). Confirm with the PCA that QR shows 14.39 in qr-version.js.
2. **#1713 (14L, J106 S2 Subjects)**: static review done (shape right). Both requested fixes are in at head **44c09b14** (main #1712
   merged in, CI green): "Loving Rasulullah Sallallahu A'laihi Wa Sallam" (saw128; 14L measured 320/360 en+bn: wraps to two lines, no
   clipping), and audit-part18 1020/8 identical on clean main 81c567d5. 14L's PR posts: behaviour 968/7 = main (Quran read bar 14a 30i
   30j 30l 31a 33a 37a), manual-claims --section=hadith 77/4/2 = main, shared-pages hadith-topic-open/bookmark/track 2/2 each.
   STILL TO DO before merge (105L ran none of it): hadith-topic-surface, hadith-subjects-s2 (+ their mutations), audit-part26/40/106/24/25/34,
   popup-home-sweep, load-speed; look at Subjects with the Continue chips and the long name at 360/390bn/1280; merge pinned to the head
   you tested; release v14.40. 14L will repoint the shared-pages dua flows in its own small PR next.
3. 11L: answer in PCF J104 the Owner's question "Dua Module must have Dua Card and Word Card (connects to QR Word Card) and Dua
   Module's own Dua Card … did we have these?" (asked; build nothing until the Owner ticks, dua130). Follow-up: repoint the
   shared-pages dua-card/dua-word/dua-check flows from hadith-study.html (via window.__hadithCorpus) to dua-study.html.

## OWNER WAITS (in the PCF monitor; never re-ask)
- Phone check v14.38 (Hadith bar + "· Preview"), v14.37 … v14.30 as listed; J120 n120r; J136; J120 n120q; J119 n119g; J104 line 26
  (Dua groups Rules box); Hadith book 46 Bangla, book 65 range, group Bangla names; 47L's Wheel-switch tick; Bangla for "Loving Rasulullah".

## Known red on clean main (compared by name this session)
- audit-part16 572/8, audit-part21 516/8, audit-part33 696/10, audit-part36 1178/6, dua-check 47/2, manual-claims 487/9 (Quran lock,
  Read-view Notes, HadeethEnc), bangla-sweep-newer-screens (crash at line 151 after 7 passes); plus 104L's list (ayah-step-all-views
  [360] Mushaf, quran-flow-step-nav, vocab-wheel 110/4, wbw-rebuild 132/4, stem-mark 136/8, word-card-small-arabic-size).

## Lessons
- **A mutation that dies on a missing anchor proves nothing**: check every anchor string against the file before believing "N of N";
  a run that crashes before any FAIL line is MISSED, not caught.
- **A mutation that fails by a 30 s timeout** counts only if the stack names the exact wait it targets; ask for a bounded wait + FAIL line.
- **Compare red suites by failing-check NAME on a second server**: `git worktree add /tmp/x origin/main`, `PORT=8081 node serve.js`
  there, `QR_BASE=http://localhost:8081 node tools/i18n-verify/<suite>.mjs`. Run 4 suites at once with xargs -P4; slow suites
  (shared-pages full run) time out at 40 min: use `--flow=<name>`.
- **An Owner answer given in a Lead's chat is valid** once read in that session's own record (list_events, kinds user; the newest
  pages are tool output, page back with before_id and parse the saved file).
- This clone is shallow: programme-ledger's "not an ancestor" failures locally are the clone.

## Opening message for the next Architect
"You are the MSA Master Architect (106L), taking over from 105L (session_01PL2xbL63PQaCSLhHQqjDqx). Read CLAUDE.md, then
docs/reports/2026-11-14-msa-architect-105L-handover.md (merge its PR first if open, pinned with the full head SHA), then the PCF
https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ section p/mmsa. Set p/mmsa sessionUrl to your session and stamp claudeSeenAt (pin
if_version). main = v14.39 if #1714 is merged (else finish it: handover NEXT 1). PCA = 41L session_01PL2xbKYBDqo3JkZN1gEpQT (or newer
in meta/global.sessionUrl); ask it to move keep-alive trig_01BaviTNz5HaEeEye83Uh5Nx to you. QR Lead = 47L
session_01PL2xbNAMQAyiv5S52x8NPv. Hadith Lead = 14L session_01PL2xbNbDNZXULwY3eGdqPD. Dua Lead = 11L session_01PL2xbHyfbrXS8hET9sKE7P.
NEXT: review #1713 (Hadith S2 Subjects) once 14L pushes the saw128 fix and the audit-part18 comparison. Tell the PCA "PCA ▸ taken
over", repeating the handover's open items one by one. Suites need `ln -s /opt/node22/lib/node_modules node_modules`, `node serve.js`,
and for qr-verify QR_REPO=<QuranRevival full clone>; stop every serve.js before qr-verify; give it 60 minutes. Merge pinned with the
full expectedHeadSha. Release with allocate-version.py, then PCF What's New + monitor, then "PCA ▸ released vX.YY". No self wake-ups.
At about 30% context, hand over."
