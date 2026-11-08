# QR Lead handover 6, 8 Nov 2026 (about 4:15 pm Sydney), short

Read `2026-11-08-qr-lead-handover-4.md` for rules and the test setup (still holds), then this. Session before: `session_01PL2xbNQQyrggFwTuhPfcku` (03A). MSA Architect (87L) `session_01PL2xbK25yfaQuNQv713fmq`; PCA `session_01PL2xbJXZjniBnbXDLprufL`. Send with the claude-code-remote `send_message`.

## Done this session
- #1528 (Eras tab + Scholars display labels) and #1526 (nits): RELEASED as v13.54 (PR #1530). Last label is 37 (the database's highest tag is 36), recorded by the Architect.
- #1527 merged earlier (bangla-words Rules emulator suite).
- #1531 (J115 Slice B: tafsīr books grouped by author's death century, head 0ced9a8) ACCEPTED by measurement; the Architect releases it as v13.55. Do nothing on it unless an event arrives.
- J121 demo plan written: `docs/reports/2026-11-08-j121-demo1104-plan.md` (branch `claude/qr-lead-j121-plan`, PR from main). Owner chose option 3 (n121e = Q): auto-listen helper, one sūrah per YouTube video, official embedded player only, no copying of audio.
- PCF: J115 comments j115c1355 written (job version 15 after), `claudeSeenAt` stamped. Re-read before the next write and pin `if_version`.

## Next, in order
1. **J121 plan to the Owner**: post a "Claude ↳" comment in PMS J121 summarising the plan's table (route A tab-audio share, desktop Chrome/Edge only; phones only PLAY saved times; route B tap-along fallback; no audio download) and its three tick boxes: (1) route A acceptable, (2) the YouTube link for sūrah 112 and sūrah 1, (3) only times saved, never audio. Then wait for the answer while doing the rest.
2. **Build the demo (demo1104)** only after the video link arrives (or, labelled synthetic, if the Architect says go): one page under `docs/reference/`, sūrah 112 then 1, pause finder as a pure function with a synthetic-audio fixture and a mutation per rule, 320/390/768/1280 en+bn, screenshots looked at. Ask the Architect before reading the channel's terms.
3. **J115 follow-up**: Scholars-row links from era names (needs a name to id mapping; not built). Names in the Eras view are plain text today.
4. J119 Monitor figure / Learn-next badge segment only if the Architect says so.

## Lessons this session
- A mutation that stays green is a finding about the check: the within-group sort mutation was UNPROVEN until an out-of-order fixture was added (the real data is already sorted).
- Merging main into a branch whose suite file both sides extended: both added blocks at the same line; keep both and re-count the closing `});`.
- Playwright is not resolvable from the repo: `ln -sfn /opt/node-tools/node_modules node_modules` (git-ignored), run suites from the repo root with `node serve.js` on :8080, remove the link afterwards.
- A bot review failing for usage limit (Codex) is not a finding; the unattended Architect says any app change is a release for a session Architect.

## FULL OPENING MESSAGE FOR THE SUCCESSOR (paste as the first message)
Bismillah. You are the MSA - QR Lead, taking over from `session_01PL2xbNQQyrggFwTuhPfcku` at about 4:15 pm Sydney, 8 Nov 2026, under the MSA Architect `session_01PL2xbK25yfaQuNQv713fmq` and the PCA `session_01PL2xbJXZjniBnbXDLprufL`. Read CLAUDE.md, then `docs/reports/2026-11-08-qr-lead-handover-6.md` (earlier handovers only for rules and test setup), and only the PMS jobs it names (MSA J115, J119, J121) in https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ. Do not read old transcripts. State: v13.54 released (#1528, #1526); #1531 accepted, v13.55 follows; J121 demo plan written on branch `claude/qr-lead-j121-plan`. Next, in order: (1) post the J121 plan to the Owner in PMS J121 with its three tick boxes (pin `if_version`); (2) build demo1104 once the video link arrives; (3) the J115 Scholars-row links follow-up. Rules: hand over at about 30% context USED; pin every PMS write with `if_version`; write "Siyagah" in full; after "Rasulullah" always write "Sallallahu A'laihi Wa Sallam"; send hand-ins with the head SHA; send messages with the claude-code-remote `send_message` tool. First steps: stamp the jobs, send "PCA ▸ taken over" (with your exact session id from `get_session`) to the PCA and tell the MSA Architect your new id. When you hand over, include the FULL opening message for your successor.
