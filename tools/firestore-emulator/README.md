# Note Foundation Firestore emulator scaffold

This directory is testing infrastructure only. It does not modify or deploy
Firestore Rules and it must never connect to the production `study-monitoring`
project.

Safety controls:

- the fixed project ID is `demo-quranrevival-note-foundation`;
- the launcher rejects project IDs without the `demo-` prefix;
- Firestore is bound to `127.0.0.1:8085`;
- the production `.firebaserc` is not read or changed;
- UI, import/export, persistence, and deployment are not configured;
- normal launcher execution reports scaffold status and starts nothing;
- `--execute` fails until an executable Rules test is separately authorised.

Current verification:

```sh
node tools/firestore-emulator/run.mjs
node tools/i18n-verify/note-foundation-emulator-scaffold.mjs
```

STAGE-5-TASK-13 adds a locked, isolated tooling workspace and one local smoke
test. From this directory:

```sh
npm ci
npm run smoke
```

The smoke test uses the current repository Rules unchanged and proves only
that the demo-only local emulator starts and denies an unauthenticated read
of an unimplemented Note Foundation path. It does not validate future Rules.

Future prerequisites, not supplied or authorised by STAGE-5-TASK-12/13:

1. add `tests/firestore/note-foundation.rules.test.mjs`;
2. obtain explicit authority before modifying proposed Rules;
3. run only against the fixed demo project and local emulator;
4. obtain separate authority before any Rules or index deployment.
