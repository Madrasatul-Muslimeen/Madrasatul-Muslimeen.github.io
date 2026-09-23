# Mapping My Journey — three screen options for the Owner to choose

- **Date:** 2026-09-22
- **For:** the Owner, a product decision. Nothing here is built.
- **Requested by:** the Owner — *"Don't build yet. Give me 2–3 simple options
  (a short description or rough mockup of each) and I'll choose."*
- **A rendered comparison of all three, viewable on a phone, is linked from
  the status board.**

---

## What is already decided, and is not part of this choice

ADR-010 (accepted, 15 Sep 2026) fixes the *data* underneath Mapping My
Journey, independent of what the screen looks like:

- It reads existing Notes; it never defines a Note of its own.
- Every person has exactly two **system folders** — the **Personal Journey
  Map** and the **Reflection Archive** — plus as many **folders they make
  and name themselves** as they like.
- A Note can be filed in more than one folder, and moving it never rewrites
  its identity — a move retires one filing and creates another.

**None of the three options below change any of that.** They differ only in
how the screen presents it, which is why picking one now does not lock in
the others forever — the folders and Notes underneath stay the same no
matter which screen sits on top.

## The three options

### A — Folders

Open the screen, see a list of folders. Tap one, see the Notes filed in it.
Tap a Note, it opens. The same shape already used for bookmarks and
collections elsewhere in the app.

- **To build:** smallest of the three — it reuses a pattern the app already
  has, and a rough version of this exact screen already exists as a mock-up
  (`app/note-editor-prototype-demo.html`).
- **Grows well** with any number of Notes.
- **Can become B or C later** without touching the data underneath.

### B — Timeline

Open the screen, see every Note in the order it was written, newest first,
grouped by day — like scrolling back through a diary. Filter chips at the
top switch between everything, the Journey Map, the Archive, or one folder.

- **To build:** moderate — a new screen, but a simple list layout.
- Answers a different question than folders do: not *where is this filed*
  but *what was on my mind, and when*.
- Could exist **alongside** Option A rather than instead of it.

### C — Path

Open the screen, see an actual winding path. Each stop is a Note; the path
passes through named regions for the Journey Map and the Archive, with a
person's own folders as side-trails branching off.

- **To build:** the largest of the three, and the only one that needs more
  design work as it grows — a path stays readable only up to a certain
  number of stops.
- The most literal take on the name "Mapping My Journey" — the most
  memorable, and the most expensive.

## Recommendation, offered rather than decided

**Option A.** It costs the least, it is consistent with the rest of the app,
and a rough version of it already exists. Nothing about choosing it now
closes the door on B or C later. This is a recommendation, not the
decision — the Owner's choice, or a mix, or something else entirely, is what
gets built.
