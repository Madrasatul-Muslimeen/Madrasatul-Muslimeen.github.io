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

Future prerequisites, not supplied or authorised by STAGE-5-TASK-12:

1. independently verify current compatible versions of Firebase CLI,
   Firebase JavaScript SDK, and `@firebase/rules-unit-testing`;
2. add an isolated tooling package manifest and lockfile;
3. add `tests/firestore/note-foundation.rules.test.mjs`;
4. obtain explicit authority before modifying proposed Rules;
5. run only against the fixed demo project and local emulator;
6. obtain separate authority before any Rules or index deployment.
