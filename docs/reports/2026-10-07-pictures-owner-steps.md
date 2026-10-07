# Pictures in Notes: the four things only you can do (7 Oct 2026)

Decision 81: "2.yes". The app part is built (v09.104). Pictures stay switched off until you do these four steps, in this order. Each one is a few clicks. Tell me "done" after each, or all at once.

**What it costs.**
- Each picture is made small on your phone first (about 200 KB).
- Firebase gives 5 GB of storage and 1 GB of downloads a day free, even on the Blaze plan. 5 GB is about 25,000 pictures.
- Your bill should stay at **$0**. The $1 alert in step 1 emails you if it ever does not.

---

## Step 1: switch to the Blaze plan, with a $1 alert (about 3 minutes)

1. Open **https://console.firebase.google.com** and sign in with your usual Google account.
2. Tap the project **study-monitoring**.
3. At the bottom of the left-hand menu it says **Spark**. Tap **Upgrade** next to it.
4. Choose **Blaze (pay as you go)** and tap **Select plan**.
5. Choose your billing account, or **Create a billing account** and enter a card.
6. When it asks for a **budget**, type **1** (that is, US$1) and tap **Continue**, then **Purchase** (or **Confirm**).

A budget only **emails you**; it does not stop the app.

## Step 2: switch Storage on (about 1 minute)

1. In the left-hand menu, tap **Build** → **Storage**.
2. Tap **Get started**.
3. Choose **Start in production mode** and tap **Next**.
4. If it asks for a **location**, leave the one it suggests and tap **Done**. It cannot be changed later; the suggested one is right.

## Step 3: publish the Storage Rules (about 1 minute)

1. Still in **Storage**, tap the **Rules** tab.
2. Select everything in the box and delete it.
3. Open **https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/blob/main/docs/governance/2026-10-storage-rules-candidate.rules**, tap the **Copy raw file** button (two squares, top right of the file), and paste it into the box.
4. Tap **Publish**.

What the Rules allow:
- Only you can see your pictures.
- A picture can be added but never changed or deleted.
- Each picture must be a small WebP of at most 400 KB, in your own folder.
- Nothing else in Storage can be read or written.

I tested these Rules in Firebase's own Storage emulator: 15 checks, and 7 deliberate breaks, each caught.

## Step 4: let the website fetch your pictures (about 2 minutes)

Browsers only fetch a picture back from Storage if the bucket allows this website. This is its **CORS** setting, a list of the websites allowed to fetch from it.

1. Open **https://console.cloud.google.com/?project=study-monitoring**.
2. At the top right, tap the **>_** button (**Activate Cloud Shell**). A black box opens at the bottom. Wait for it to say it is ready.
3. Paste this whole line into the black box and press **Enter**:

```
echo '[{"origin":["https://madrasatul-muslimeen.github.io"],"method":["GET"],"maxAgeSeconds":3600}]' > cors.json && gcloud storage buckets update gs://study-monitoring.firebasestorage.app --cors-file=cors.json
```

4. If it asks **Authorize**, tap **Authorize**. It ends with a line saying it is updated.

---

## Then check it (1 minute)

1. Open any Note in Mapping My Journey and tap **Edit**.
2. In the editing toolbar, tap **🖼**, then **Choose a picture or take a photo**, and pick one.
3. It says "Making the picture small…", then "Uploading the picture…", and the picture appears in the Note.
4. Tap **Save**, close the Note and open it again: the picture is still there.

If a step says "picture storage is not switched on yet", step 3 has not been published. If the picture shows a broken box, step 4 is missing. Tell me which, and I will look.
