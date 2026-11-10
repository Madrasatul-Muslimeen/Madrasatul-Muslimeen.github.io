#!/usr/bin/env python3
"""Build the Library card for an MSA release (G02 item K, PCA J86 pro1110d; the Owner's yes, 10 Nov 2026).

Reads app/js/version.js and the release's own CHANGELOG.md heading, and prints ONE card as JSON
for BwN's library/send_card.py (pid mmsa, cid vNN.NN, wf mmsa). No AI, no key: send_card.py uses
BwN's public web identifier. Run from the repository root:

    python3 -I tools/governance/release-card.py            # the version on this tree
    python3 -I tools/governance/release-card.py 14.06      # a named version (a re-send)

It refuses (exit 1) when the version has no "## vNN.NN — date — title" heading in CHANGELOG.md,
so a card can never describe a release the log does not record.
"""
import datetime, json, re, sys

src = open("app/js/version.js", encoding="utf-8").read()
ver = sys.argv[1] if len(sys.argv) > 1 else re.search(r'APP_VERSION = "([0-9.]+)"', src).group(1)
label_date = re.search(r'APP_VERSION_DATE = "([0-9.]+)"', src).group(1) if len(sys.argv) <= 1 else ""
log = open("CHANGELOG.md", encoding="utf-8").read()
m = re.search(r"^## v" + re.escape(ver) + r" — ([^—\n]+) — (.+)$", log, re.M)
if not m:
    raise SystemExit(f"no CHANGELOG.md heading for v{ver}: no card sent")
when, title = m.group(1).strip(), m.group(2).strip()
label = f"v{ver}-{label_date}" if label_date else f"v{ver}"
print(json.dumps({
    "pid": "mmsa", "cid": f"v{ver}", "wf": "mmsa",
    "name": f"MSA {label}", "what": f"{when}: {title}",
    "url": "https://madrasatul-muslimeen.github.io/app/index.html",
    "kind": "Report", "status": "done", "ver": label, "by": "MSA release step (GitHub, no AI)",
    "at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "projects": ["mmsa"], "topics": ["release"],
}, ensure_ascii=False))
