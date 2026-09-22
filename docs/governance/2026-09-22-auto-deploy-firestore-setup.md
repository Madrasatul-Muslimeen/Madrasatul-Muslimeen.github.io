# Setting up approval-gated Firestore deploys — one-time, about ten minutes

- **Date:** 2026-09-22
- **For:** the Owner, working in two browser tabs (Google Cloud Console and
  GitHub). No coding, no command line — only pasting.
- **What this buys you:** from now on, publishing a Firestore **Rules**
  change is *"click Approve"* instead of *"copy the file, open the Console,
  paste it, press Publish, check it worked by hand."* You still get the
  final say, every single time — nothing publishes without your click.
- **Rules only, not indexes, on purpose.** This repository already has a
  standing rule that an index declaration only ever sits in a `docs/`
  candidate file until you separately authorise moving it to the live spot
  — the same weight as authorising a Rules publish. So indexes stay a manual
  Console step for now (exactly as the deployment guide already describes);
  automating them is real follow-up work, not assumed here.
- **Cost:** none. Everything here is on Firebase's free (Spark) tier.

This is a one-time setup. Once it's done, it stays done — you never repeat
these steps for a future Rules change, only the "click Approve" part.

---

## Before you start — what you're actually creating

Two things, both revocable at any time, both limited to one job:

1. **A Google-issued key** that can *only* publish Firestore Rules — nothing
   else. It cannot read a single row of your data, and it cannot spend
   money — Rules publishing has no billable cost on any plan.
2. **A GitHub "Environment"** named `firebase-production-deploy`, set so
   that any job that uses it pauses and waits for you, specifically, to
   click Approve. This is a GitHub feature, not something this repository
   invented — the same mechanism companies use to gate production deploys.

If at any point you want to undo this, deleting the key in Google Cloud
Console or removing yourself as a reviewer in GitHub switches it off
immediately — the workflow file stays but has nothing to authenticate with,
so it fails safely rather than publishing anything.

---

## Step 1 — create the key (Google Cloud Console)

1. Go to **[console.cloud.google.com](https://console.cloud.google.com)**
   and make sure the project selector at the top reads **study-monitoring**
   (the same project as your Firebase app — there is only one).
2. In the search bar at the top, type **"Service Accounts"** and open it.
3. Click **+ Create Service Account**.
   - Name: `firestore-rules-deployer` (or anything you'll recognise).
   - Click **Create and Continue**.
4. On the **"Grant this service account access to project"** screen, add
   exactly this one role (search it by name, click it):
   - **Firebase Rules Admin**

   This is deliberately narrow — it can publish Rules and nothing else. Do
   not add a broader role like "Editor" or "Owner" unless you hit a
   permission error and want a quick unblock; if you do, you can always
   tighten it back to this one role afterwards. (If indexes get added to
   this same automation later, **Cloud Datastore Index Admin** would join
   it then — not needed today.)
5. Click **Continue**, then **Done**. Skip the optional "grant users access"
   screen.
6. You're back on the Service Accounts list. Click the account you just
   made, open the **Keys** tab, click **Add Key → Create new key**, choose
   **JSON**, and click **Create**. A `.json` file downloads to your
   computer.

   **Keep this file safe until step 3, then you can delete it from your
   downloads** — it will live only inside GitHub's encrypted secret store
   from that point on.

---

## Step 2 — create the GitHub Environment

1. Go to the repository on GitHub:
   `https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`
2. Click **Settings** (top of the repo, not your account settings).
3. In the left sidebar, click **Environments**.
4. Click **New environment**.
5. Name it **exactly**: `firebase-production-deploy` (this has to match
   the workflow file precisely, so copy-paste it rather than retyping).
6. Click **Configure environment**.
7. Tick **Required reviewers**, then add **yourself** (search your own
   GitHub username and select it).
8. Click **Save protection rules**.

This is the step that makes every future publish wait for your click —
nothing else in this setup does that.

---

## Step 3 — add the key as a secret, scoped to this environment

Still on the environment page you just configured (`firebase-production-deploy`):

1. Scroll to **Environment secrets**.
2. Click **Add secret**.
3. Name: **exactly** `FIREBASE_DEPLOY_SERVICE_ACCOUNT`.
4. Value: open the `.json` file you downloaded in step 1 with a plain text
   editor (Notepad, TextEdit — anything that shows raw text, not Word),
   select all, copy, and paste the whole thing here.
5. Click **Add secret**.

**Scoped to the environment, not the whole repository** — on purpose. A
repository-wide secret would be readable by any workflow in this repo; an
environment secret is only readable by a job that references
`firebase-production-deploy`, which is exactly one job in one file.

You can now delete the downloaded `.json` file from your computer — it's
safely stored in GitHub's encrypted secret store, which nobody (including
Claude, including this session) can read back out once saved.

---

## How it works from here on, every time

1. A Rules change lands on `main` — most often me, telling you what changed
   and why, the same as every Rules change so far.
2. GitHub Actions runs automatically and stops at a **"Review deployments"**
   button, visible on the repository's **Actions** tab. You'll see a diff of
   exactly what changed.
3. You read it (or have ChatGPT read it, as you're already doing), and
   click **Approve and deploy** — or leave it, and nothing happens.
4. Once approved, it publishes automatically and posts a short summary
   confirming what went live.

**One case where it deliberately does nothing:** if I publish a Rules
change through the Console by hand first (like this round) and then push a
follow-up commit just to keep the repository's own copy matching what's
already live, that commit is marked so the automation skips it — you
already did the real approval, by hand, in the Console.

---

## If something goes wrong

- **"Review deployments" never appears** → the environment name doesn't
  match exactly, or Required reviewers wasn't saved. Re-check step 2.
- **The deploy fails with a permission error** → the key's two roles in
  step 1 may be missing one, or the key wasn't pasted in full in step 3.
  Re-check both; a partial paste is the most common cause.
- **You want to stop this and go back to doing it by hand** → delete the
  environment secret (step 3) or the service account itself (step 1's Keys
  tab, click Delete). The workflow will then fail loudly with a clear error
  rather than publishing anything, and you can go back to the manual Console
  steps at any time.
