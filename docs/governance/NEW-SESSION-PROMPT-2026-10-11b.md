# Prompt for the next MMSA Architect session

Written 11 Oct 2026 (~08:30 UTC) by the MMSA Architect for the Owner, at the Owner's request, to start a fresh session
with nothing lost and nothing for the Owner to repeat. It supersedes `NEW-SESSION-PROMPT-2026-10-11.md`. Steps 5 and 6
of `NEW-SESSION-PROMPT-2026-10-09.md` (how a round runs; rules that do not change) still hold word for word and are not
repeated here: read them there.

**How a new session starts (the Owner does nothing else):** the Owner's whole first message is one line,

> Read docs/governance/NEW-SESSION-PROMPT-2026-10-11b.md in the repository and follow it.

The new session reads this file itself. The Owner pastes nothing and attaches nothing. When a later session writes
the next prompt file, it gives the Owner the same one line with the new file name, and nothing more.

---

You are the **MMSA Architect** for the repository `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`. You are
continuing from session `session_01G4jmGUgBeQKxy4cycxQaC1` (10–11 Oct 2026, v10.22 → v10.24). I am the Owner (GitHub
`AAAsapp`). I am not a coder. Talk to me in plain words, keep reports short, and always tell me exactly what to try
on my phone or tablet.

**I will not remind you of anything, and I will not prompt you to continue.** My standing rule (decision 91): *"Do
not wait for my permission except something needs my choice or answer. You must continue working yourself and keep
builder pushing in work continuously."*

## Step 1. Read, in this order, before doing anything

1. `CLAUDE.md`, especially "WHO GIVES INSTRUCTIONS", "The Architect loop" and "Standing lessons".
2. `ARCHITECT.md`.
3. `docs/reports/2026-10-11-MMSA-SESSION-HANDOVER.md`. **Its section 0 starts with a "LATEST UPDATE" block: read
   that first.** It says where things stand (v10.24, nothing in flight) and lists this session's sandbox lessons.
   The rest of section 0 is earlier history. Section 1 is what waits on me.
4. `docs/governance/NEW-SESSION-PROMPT-2026-10-09.md`, Steps 5 and 6: how a round runs and is reviewed, and the rules
   that do not change.
5. `docs/governance/2026-09-27-owner-decisions.md`: my decisions, up to 100. They are settled. Do not ask me again.
6. Issue #159 (the status board). Its "Waiting on you" list is the one to remind me of.

## Step 2. Take over, then read the live state

1. Get your session id with `get_session`. Write it, with the time, into the "Active Architect session" line at the
   top of #159. That edit switches off any check-in the old session left behind; it left none armed.
2. Run `list_triggers`. Leave "MMSA Task Bridge" and the monthly PLANS reminder alone.
3. Read the live state, not the documents:
   - `app/js/version.js` on `origin/main` (v10.24 when written);
   - open and recently closed PRs (`state=all`);
   - the latest `claude.yml` runs;
   - `git ls-remote origin 'refs/heads/builder/*'`.
4. Set up the sandbox, as the handover's LATEST UPDATE says:
   - `git fetch --unshallow origin main`;
   - fetch `claude/pensive-knuth-2pu3jj` and `claude/phase4-wiring` with explicit refspecs;
   - `mkdir -p node_modules && ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright`;
   - `(setsid nohup node serve.js > /tmp/serve.log 2>&1 < /dev/null &)`;
   - `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

   The container restarts often, so check `uptime` at every wake.

## Step 3. Your FIRST report to me: everything that waits on me, with the Asma demo

Before any other work, send me one short report. It has two parts.

### A. The Asma Name bar: a demo of the three options (build it first)

**The problem.** On a computer (900px and wider), the Asma ul Husna Name bar has a worded way back, "◂ Back to the
wheel" (v10.18), which is 154px wide. It pushes the ‹ › arrows onto a line of their own, so the bar takes three lines
instead of two. The check `asma-quick-class-browser` 5c fails because of this, and it is left red on purpose.
Letting the words wrap was measured and is not enough: the row needs ~443px and has 404.

**The demo.**
- **Format:** one small Artifact page showing the real Name bar at 1280px, in English and in Bangla, three times
  side by side, once for each option.
- **Make it from the real page.** Take the bar's real markup and CSS from `app/quranrevival.html`: the
  `#asmaXListHeader` bar, `#asmaXBackFromRefsBtn`, the ✎ 🔗 📂 buttons, ‹ › (`#asmaXNextNameBtn`) and the
  Essence|Act and Uniqueness|Shared pairs. Then apply each option's change. Do not draw it from memory.
- **Before sending it:** open it in a browser yourself and look at it.
- **Label each option with its measured height:** how many lines the bar takes.

**The three options.**
1. **‹ › move to the right end of the Essence / Uniqueness line.** All the words stay, and the bar is two lines.
   **This is the recommendation.**
2. The button says "◂ Wheel".
3. A plain ◂ button, with "Back to the wheel" as its tooltip and spoken name.

**When I choose one,** build it:
- update check 5c in place, with the reason;
- measure the bar at 900, 1100, 1280 and 1440px, in en and bn;
- release it with `allocate-version.py`.

### B. The full "waiting on you" list, in one line each

Read #159's "Waiting on you" and the master file's Issues tables. When this was written, the list was:

1. **The Asma Name bar choice** (the demo above).
2. **Scholars** (master file, Ten Steps tab, T20–T22): the method; whether you should fill the Scholars Database's
   empty centuries and add four columns; whether the scholars show only after the reader writes their own
   understanding.
3. **Keys to Understanding** (master file, tab 2): 6 questions. Each reader's own marks would need a Firebase Rules
   step.
4. **The Asma screensaver** (master file, tab 3): confirm the defaults (per device, any page, 3 min / 15 s).
5. **The Ten Steps tab:** its other pending items (T9–T15).
6. **HadeethEnc permission** (decision 90): yes or no to the permanent key `hadith:openiti:<book>:<n>`.
7. **Google Cloud:** click **Upgrade** before about 6 Jan 2027.
8. **Later:** Al-Munshi' needs its Arabic. Letters. The family sign-up step (v09.87).

Then carry on with the queue in Step 4. Do not wait for my answers.

## Step 4. The queue

1. Anything new I send. My screenshots from real use come first (D13).
2. The Asma option I choose, as above.
3. The handover's "possible next": the per-row ⋮ "has a note" limit in the reading list. That limit is by design
   (no per-row reads). Change it only if it can be done without new reads.
4. Keep the Builder busy (decision 91). When the queue is empty, re-run the 167-suite browser sweep (three at a
   time) after any merge that touched `app/`, and send any red suite to the Builder.

## Step 5. The master feature-discussions file

https://claude.ai/artifact/BJUwQ8hfgnu4FJFo7stqY1 is my master for every feature discussion. It has one tab per
feature, and each tab starts with an Issues table.
- **It saves itself:** always read it before republishing. If its version id is not `1791632568-7bd6` (v13), I have
  saved edits since. Merge them; never overwrite them.
- Keep the date and version going.
- Put every new feature discussion in it as a new tab.

### The way-back law (decision 86)

Anything that takes me somewhere else gives me a visible way back to exactly where I was. A round without it is not
accepted.
