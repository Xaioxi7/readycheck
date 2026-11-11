# Company cloud setup (Firebase, free Spark plan)

About 10 minutes. You need a Google account.

1. Go to https://console.firebase.google.com and click **Create a project**. Name it `readycheck-demo`. Google Analytics: off.
2. **Build > Firestore Database > Create database**. Location: `nam5 (United States)`. Start in **production mode**.
3. **Firestore > Rules**: replace everything with the contents of `firestore.rules` in this repo, then **Publish**.
4. **Build > Authentication > Get started**. Under **Sign-in method**, enable **Anonymous** and **Email/Password**.
5. **Authentication > Settings > Authorized domains**: add `xaioxi7.github.io`.
6. **Authentication > Users > Add user**: the manager account for the dashboard (for example `chief@readycheck.demo` with a password). Copy its **User UID**.
7. **Firestore > Data**, create these two documents by hand:
   - Collection `companies`, document ID `DEMO`, field `name` (string) = `Demo Air Medical`
   - Collection `managers`, document ID = the User UID from step 6, field `code` (string) = `DEMO`
8. **Project settings (gear) > Your apps > Web (</>)**: register an app called `ReadyCheck`. Copy the `firebaseConfig` object.
9. Paste it into `firebase-config.js` as `window.RC_FIREBASE = { ... };` and push.

Then, in the manager dashboard (https://xaioxi7.github.io/readycheck/dashboard.html, sign in with the account from step 6):
10. **Tag encryption key > Create company key.** Download the base-station key file and keep it safe (the base station needs it).
11. **Pilots and activation codes**: add each pilot (name + Crew ID). Give each pilot their activation code.

Pilot app (https://xaioxi7.github.io/readycheck/): sign in with company code `DEMO`, Crew ID and activation code, set a PIN,
do a check, then **Save to my tag** or **Send to my company now**. In Me, **Create a recovery code** lets the pilot sign in on a new phone
as the same person without a new activation code.

## What the company can see
Only the record the pilot chose: level 1 completion, level 2 adds Ready / Caution / Low alertness,
level 3 adds reaction time, slow reactions, early taps and duty load. Plus the monthly requirement (met or not met, check days).
The security rules reject any extra fields, writes to another pilot's record, and reads by anyone who is not a manager of that company.

## Keys and identity
- Each company has its own ECDH P-256 key pair (see `rc-crypto.js`). Phones get only the public half, which can lock a tag record
  but not open it. The private half is readable only by the company's managers and the base station. Tag text format: `RC2.<keyId>.<data>`.
- Pilots are identified by Crew ID. A phone joins with Crew ID + activation code (from the manager) or the pilot's recovery code,
  so a new phone or reinstall is still the same pilot.

## Prototype limits
- Results history stays on the old phone; a recovery code restores the company sign-in, not the history.
- Activation codes can be reused until the manager removes them (handy for demos). Remove a code after the pilot has signed in.
- The `firebaseConfig` values are not secret; the rules are what protect the data.
