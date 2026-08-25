# The Offline Ark — running QuranRevival with no internet, forever

**Status: PLAN ONLY. Nothing below is built yet.** Written 18 Aug 2026, from
the owner's own question: if the internet goes and never comes back, can this
app still be used on a PC, copied to another PC, or carried on an SSD and
plugged in anywhere?

**Short answer: not today — it wouldn't even open — but it can be made to,
and the job is smaller than it looks.** This file is the whole plan: what
breaks, what it takes, the order to do it in, how to prove it works, and the
monthly routine afterwards.

Read `## The monthly routine` and `## The day it happens` if you only ever
read two sections. Those are the ones that matter after the build is done.

---

## 1. What was measured

Not guessed — read out of this repo on 18 Aug 2026.

| Piece | Where it lives now | With no internet |
|---|---|---|
| The app's own pages and code (1.4 MB) | GitHub Pages | Copy the folder — fine |
| **Firebase's own code** | Google's CDN — **55 import lines in 37 files** | **Total stop. All 26 pages blank.** |
| Google sign-in | Google | Impossible offline. Always. |
| Your data (people, records, claims, homework) | Firestore, in the cloud | Browser holds a partial copy. Not portable, not reliable. |
| **Qur'an text, translations, word-by-word, tajweed, search** | **Already local — 31 MB in `tools/quran-data-pull/output`** | **Already works** |
| Recitation audio | archive.org | Breaks |
| Mushaf page fonts + layout | raw.githubusercontent.com | Breaks (Mushaf view only) |
| Asma posters (92 images) | archive.org | Breaks (screensaver only) |
| Amiri Arabic font | Google Fonts | Falls back to whatever the PC has |

### Three findings that shape the whole plan

**(a) The Qur'an is already local.** All 114 surahs with both translations,
word-by-word, tajweed and the three search indexes are static files in this
project, not a cloud service. The hardest content to replace is already done.

**(b) The Firebase surface is tiny.** The whole app uses **22 Firebase
functions**: 16 database, 5 sign-in, 1 startup. No live listeners, no
sorting, no paging — only "get a document", "get the documents where X", and
"write a document". And **every write already goes through one file**
(`js/envelope.js`, the I17 stamp). That is why Firebase can be replaced by
one local file offering the same 22 names, without touching the logic in the
other 36 files.

**(c) Three collections don't need backing up at all.**
`tenantMemberUids`, `inviteTokens` and `teacherStudentLinks` are
rules-support mirrors (D9) — every one of them is derived from real data
(`memberships`, `tenantInvites`, `enrollments`). Offline there are no
security rules to support, so they can be rebuilt or ignored.

### One thing that cannot be avoided

**A double-clicked page will never work.** Browsers block modern JavaScript
modules and local file reading from a `file://` address. There must be a tiny
web server running on the PC. It can be a double-click (`serve.js` already
exists in this project) — but it has to be there.

---

## 2. What is permanently lost when the internet goes

Say it plainly now rather than discover it later.

- **Google sign-in.** Replaced by a local "who is using this?" picker.
- **Security rules stop being enforced.** `firestore.rules` needs a server.
  Offline, roles become a convenience, not a boundary. **Anyone holding the
  SSD has everything on it.** That is inherent to offline, not a shortcut.
- **Invites by email**, sharing between households, anything cloud.
- **Live sync between your own devices.** The SSD is carried, not synced.
- **The phone and tablet**, unless they get their own copy — and a phone
  can't run a local web server easily. Realistically: offline means PCs.

---

## 3. The build, in order

The ordering principle: **do the things that need the internet first**, and
get real value earliest. Each round is a normal session, built and verified
the way every round in this project is.

### Round 0 — Back up your real data (do this first, regardless)

One page in the app as it is today: **"Back up everything"** → one `.json`
file with every collection for your tenant, plus a folder of `.csv` files
alongside it.

The CSV half matters more than it looks: **a spreadsheet can be opened by any
software, forever, with no code at all.** If everything else in this plan
were abandoned, the family's study history would still be readable in fifty
years. The JSON half is what the app reads back in.

- Needs: nothing decided. Can start immediately.
- Works entirely in the online app. No offline mode required.
- **This is worth doing even if you never build the rest of this plan.**
  Right now, if the Firebase project were lost, every record every child has
  claimed goes with it.

### Round 1 — Make the app itself open with no internet

- Download Firebase's three code files into the project; repoint all 55
  imports at one local path. One command, mechanical.
- That one path holds **either** the real Firebase (online) **or** the local
  replacement (offline). **Swap one file, the whole app switches mode.** The
  app stays one codebase and never forks.
- Portable Node on the SSD (no install, no admin rights — the same trick
  already recorded in `PHASE-4-STATUS.md` for the owner's office VDI), plus
  `Start QuranRevival.bat`.

**End state:** pull the network cable, double-click, every page renders. It
will say you're not signed in and show no data — that's Round 2.

### Round 2 — Local mode (the big one)

- The 22 functions, reimplemented over files on the SSD.
- Local "who is using this?" sign-in in place of the Google popup.
- **Import** of the Round 0 backup, so your real history is there.
- The data lives as **files in a `data/` folder on the SSD** — not in browser
  storage. This is what makes "plug it into another PC" actually work:
  carrying the SSD carries everything.

**End state:** the full app, offline, with your real data, on any Windows PC.

### Round 3 — The media

Biggest in bytes, smallest in code — each is a URL constant swap plus a
download script.

- **Audio** — 4 constants in `audio-player.js`. Needs your decision on which
  reciters (see §7).
- **Mushaf** — 3 constants in `hifz-renderer.js` (layout JSON + 604 page
  fonts + the surah-header font).
- **Asma posters** — 92 images, one list in `asma-posters.js`.
- **Amiri font** — one file.

### Round 4 — Proof, not hope

Three levels, because "I clicked around and it seemed fine" is not a test.

1. **Automated.** This project already has a verification harness (667
   behaviour checks). It gains an offline suite that runs the whole app with
   the network *blocked at the network layer* — so a page that secretly still
   needs the internet fails the build, not your evening.
2. **One tap, by you.** `admin-self-check.html` already exists for exactly
   this purpose (F-008, D8 — "what makes every later phase self-verifying,
   given the owner cannot check code"). It gains offline checks: every
   collection reachable locally, a test write that survives a restart, Qur'an
   data present, audio present, **nothing leaving the PC**. Green/red list.
3. **The disconnection drill.** The only test that really counts — see §5.

### Round 5 — The monthly routine, made into buttons

- **"Back up now"** in the app, one click, writes straight to the SSD.
- The app shows **"Last backup: 34 days ago"** in red when it's stale, so it
  nags you instead of relying on memory.
- **`Update app from GitHub.bat`** — one double-click, while the internet
  still exists, refreshes the SSD's copy of the app to the current version.

**Rough sizing:** Round 0 is small. Rounds 1, 3, 4, 5 are each about one
normal round. **Round 2 is the real work** — probably two sessions. Call it
six or seven sessions in total, spread out as you like. Rounds 0 and 1 are
useful on their own even if the rest never happens.

---

## 4. What ends up on the SSD

```
QuranRevival-Ark/
  Start QuranRevival.bat      <- the only thing you ever double-click
  Update app from GitHub.bat  <- monthly, while internet still exists
  node/                       <- portable Node, no install needed
  app/                        <- the app itself
  quran-data/                 <- all 114 surahs, translations, search
  media/                      <- audio, mushaf fonts, posters
  data/                       <- YOUR RECORDS. This is the irreplaceable part.
  backups/                    <- dated monthly snapshots, json + csv
  OFFLINE-PLAN.md             <- this file
  RUNBOOK.txt                 <- one page, plain words, printable
```

| Part | Size | Note |
|---|---|---|
| App | 1.4 MB | measured |
| Qur'an data | 31 MB | measured |
| Portable Node | ~80 MB | known |
| Mushaf fonts + layout | ~30–60 MB | estimate — can't reach the host from here |
| Asma posters (92) | ~50–150 MB | estimate |
| Audio, one reciter ayah-by-ayah | ~1.2–2 GB | estimate |
| Your data | a few MB, growing slowly | the only part that can't be re-downloaded |

**Total: roughly 1.5–2.5 GB.** A 256 GB SSD is a hundred times more than
needed. Buy the small one and buy two.

---

## 5. Proving it really works

**The disconnection drill.** Do it once when the build finishes, and once a
year after that.

1. Take a PC that has **never** run this app.
2. Turn off Wi-Fi and unplug the network cable. Physically.
3. Plug in the SSD, double-click `Start QuranRevival.bat`.
4. Run the self-check page. Everything green.
5. Then do a **real study session with a child** — pick the person, read,
   listen to the recitation, claim a unit, confirm it, check the Mastery
   Wheel moved.
6. Close everything. Unplug the SSD. Plug it into a **different** PC. Confirm
   what you just claimed is still there.

Step 6 is the one people skip and it is the one that proves portability.

---

## 6. The monthly routine

Ten minutes, once a month, **while the internet still exists.**

1. Plug in **SSD A**.
2. Double-click **`Update app from GitHub.bat`** → the SSD's app becomes the
   current version.
3. Open the app **online**, click **"Back up now"** → your real data is
   written into `data/` and a dated snapshot into `backups/`.
4. Double-click **`Start QuranRevival.bat`**, check two things: the **version
   badge** matches what's live, and the **self-check is green**.
5. Unplug. **Next month use SSD B.** Alternate forever.

**Why two SSDs, alternating:** one drive is one point of failure. Alternating
also means that if a backup is ever corrupt, the other drive is at most two
months old rather than gone. Keep a third copy on a normal PC hard drive as
well — it costs nothing.

**Once a year:** power both SSDs up even if unused (flash memory left
unpowered for years can lose data), and do the disconnection drill.

### The honest weakness of this plan

**Monthly backup means up to 30 days of study records can be lost** at the
moment the internet dies. Three ways to shrink that, in order of how much
they cost you:

- **Click "Back up now" more often.** It's one click and the app nags when
  stale. Weekly costs you nothing.
- **Accept it.** Thirty days of claims, against a plan that otherwise
  survives everything. Reasonable.
- **Invert it** — run the app in local mode all the time and treat the cloud
  as the backup instead. Zero loss at cutover. **But it ends phone and tablet
  use**, because a phone can't run the local server. Not recommended, but
  it's the only way to get to zero.

---

## 7. Decisions still needed from the owner

None of these block Rounds 0 or 1 — those can start today.

1. **Which reciters, and how much audio?** All four is many gigabytes. Basfar
   ayah-by-ayah alone is the practical choice, and it's the one the app leans
   on most.
2. **One master SSD, or several equal copies?** One master is simple and
   safe. Two PCs both writing means a real merge problem later — solvable
   (nothing is ever deleted (I4), every unit has a permanent ID (I5), every
   document carries `updatedAt` (I17)), but it's its own project.
3. **Any lock offline?** No lock, or a simple PIN per person? A PIN is a
   speed bump, not security — with the SSD in hand, everything on it is
   readable. Say which you want and it'll be built as what it is.

---

## 8. The day it happens

Printed on `RUNBOOK.txt`, in the SSD's root, in plain words:

> **There is nothing to do.**
>
> 1. Plug in the SSD.
> 2. Double-click **Start QuranRevival.bat**.
> 3. A black window opens. Leave it open. The app opens in the browser.
> 4. Pick who you are. Use it exactly as before.
> 5. When finished, close the browser, then close the black window.
>
> To use it on another PC: copy the whole folder, or carry the SSD.
> To keep it safe: copy the folder to a second drive every month.
>
> Sign-in, invites and syncing between houses are gone. Everything else —
> the Qur'an, the translations, the search, the recitation, the Approaches,
> every record every child has claimed — is on this drive and needs nothing
> from anyone.
