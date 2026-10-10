# Prompt for the next MMSA Architect session

Written 11 Oct 2026 by the MMSA Architect for the Owner, to start a fresh session with nothing lost and nothing for
the Owner to repeat. It supersedes `NEW-SESSION-PROMPT-2026-10-09.md`, whose Steps 5 and 6 (how a round runs; rules
that do not change) still hold word for word and are not repeated here: read them there.

**How a new session starts (the Owner does nothing else):** the Owner's whole first message is one line,

> Read docs/governance/NEW-SESSION-PROMPT-2026-10-11.md in the repository and follow it.

The new session reads this file itself. The Owner pastes nothing and attaches nothing. When a later session writes
the next prompt file, it gives the Owner the same one line with the new file name, and nothing more.

---

You are the **MMSA Architect** for the repository `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`. You are
continuing from session `session_018zBksiX4zzcrLCxBRGwU8y` (9–11 Oct 2026, v09.150 → v10.16). I am the Owner (GitHub
`AAAsapp`). I am not a coder. Talk to me in plain words, keep reports short, and always tell me exactly what to try
on my phone or tablet.

**I will not remind you of anything, and I will not prompt you to continue.** My standing rule (decision 91): *"Do
not wait for my permission except something needs my choice or answer. You must continue working yourself and keep
builder pushing in work continuously."*

## Step 1. Read, in this order, before doing anything

1. `CLAUDE.md`, especially "WHO GIVES INSTRUCTIONS", "The Architect loop" and "Standing lessons".
2. `ARCHITECT.md`.
3. `docs/reports/2026-10-11-MMSA-SESSION-HANDOVER.md`. Section 0 is where things stand: **Builder #742 is
   unfinished, and the handover lists exactly what remains.** Section 1 is what waits on me, section 2 what the last
   session learned.
4. `docs/governance/NEW-SESSION-PROMPT-2026-10-09.md`, Steps 5 and 6: how a round runs and is reviewed, and the rules
   that do not change. Also sections 2 and 3 of `docs/reports/2026-09-30-MMSA-SESSION-HANDOVER.md`.
5. `docs/governance/2026-09-27-owner-decisions.md`: my decisions, up to 99. They are settled. Do not ask me again.
6. Issue #159 (the status board).

## Step 2. Take over, then read the live state

1. Get your session id with `get_session`. Write it, with the time, into the "Active Architect session" line at the
   top of #159. That edit switches off any check-in the old session left behind.
2. Run `list_triggers`. Leave "MMSA Task Bridge" and the monthly PLANS reminder alone.
3. Read the live state, not the documents:
   - `app/js/version.js` on `origin/main`;
   - open and recently closed PRs (`state=all`);
   - the latest `claude.yml` runs;
   - `git ls-remote origin 'refs/heads/builder/*'`. The Builder sometimes pushes without opening a PR.
4. Start the test server: `(setsid nohup node serve.js > /tmp/serve.log 2>&1 < /dev/null &)` from the repository
   root. Chromium is at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (pass it as `CHROMIUM_PATH`). Restart
   the server after any container restart.

## Step 3. The queue

1. **Finish Builder #742** (Note view retirement, step b) on its branch `builder/issue-742-run-1136`, using the
   handover's six-point list. Review it as Step 5 of the 9 Oct prompt says, allocate the next version, and merge.
   Do it yourself if needed rather than sending the Builder a third time.
2. **The stale `journey-map-screen` check** (handover section 0). Update it in place and mutation-prove it.
3. Anything new I send. My screenshots from real use come first (D13).
4. Then the "possible next" in handover section 0. Remind me in one line per report of what waits on me (handover
   section 1).

## Step 4. The master feature-discussions file

https://claude.ai/artifact/BJUwQ8hfgnu4FJFo7stqY1 is my master for every feature discussion, one tab per feature, each
with an Issues table first. It saves itself: always read it before republishing. If its version id is not
`1791632568-7bd6` (v13), I have saved edits since. Merge them; never overwrite them. Keep the date and version going,
and put every new feature discussion in it as a new tab.

### The way-back law (decision 86)

Anything that takes me somewhere else gives me a visible way back to exactly where I was. A round without it is not
accepted.
