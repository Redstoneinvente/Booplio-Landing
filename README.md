# Booplio marketplace

A free community marketplace for Booplio custom screen-edge dents. Responsive React and TypeScript frontend, Firebase Authentication, Firestore, private Cloud Storage, and callable Cloud Functions. Built for mobile and desktop with the cream, lilac and lime visual direction.

## What works

- Public browsing, category and prefix search, filters, collections, creator profiles and version history.
- Eight real downloadable CC0 starter dents. These work before connecting Firebase.
- Actual HTML previews with schema-1 `dentupdate` messages, sample values, edge/depth controls and reduced motion.
- Google and passwordless email-link sign-in.
- Account profiles, synced saves and named collections, follows, release/update feed and browser download history.
- Three-step creator upload, server file validation, private drafts, moderation feedback and semantic version updates.
- Moderator submission review, reports, takedowns and owner unpublishing.
- Account deletion, server rate limits, protected counters and deny-by-default database/storage rules.

Everything in the marketplace is free to visitors. Running Firebase Storage and Cloud Functions requires a Blaze billing account. Usage charges can apply beyond the included quotas. Set billing alerts in Google Cloud.

## Connected project

The production web app is configured for Firebase project `booplio-redstoneinvente` (US central). Its public SDK configuration is in `src/firebase-project.json`; `VITE_FIREBASE_…` environment values override it. These web configuration values are public identifiers, not administrator credentials. Accounts use Google or passwordless email links, and `booplio.redstoneinvente.com` is an authorized sign-in domain.

The initial Hosting deployment is `https://booplio-redstoneinvente.web.app`. Cloudflare Pages can build the same repository with `npm run build` and output directory `dist`; security headers are supplied by `public/_headers`.

Blaze billing is active. All 14 Node.js 22 Cloud Functions are deployed in `us-central1`, and the private default Storage bucket is `booplio-redstoneinvente.firebasestorage.app`. Its rules deny direct client reads and writes; files are accessed through the callable backend. Function images have a one-day Artifact Registry cleanup policy.

Live deployment checks passed: all functions report ACTIVE and reference the correct bucket; unauthenticated draft and moderation calls return 401; a missing public dent returns 404; anonymous direct Storage access returns 403. The authenticated upload-to-publication lifecycle has been tested in the Firebase emulators. Marketplace administrator access must be granted separately to the intended owner account; it is not assigned automatically to every Firebase project user.

If local function discovery cannot open a loopback server, use the CLI’s file-based discovery mode:

```sh
FIREBASE_FUNCTIONS_DISCOVERY_OUTPUT_PATH=true npx -y firebase-tools@latest deploy --only functions --project booplio-redstoneinvente
```

## Activate Firebase

If using ChatGPT Work, the official Firebase plugin can also create/configure the project after you connect your Google account. The steps below are the CLI alternative.

1. Create a project in [Firebase Console](https://console.firebase.google.com/). Add a **Web app** in Project settings.
2. Enable **Authentication → Google** and **Email/Password → Email link (passwordless sign-in)**. Choose your support email for Google sign-in. Add your production host and localhost if needed to Authentication’s authorized domains.
3. Create the default **Cloud Firestore Standard / Native mode** database. Use locked mode, then deploy the provided rules. Choose its region deliberately; moving it later is not a routine change.
4. Enable **Cloud Storage**, create the default bucket, and upgrade to **Blaze** when prompted. The bucket name must match the web config exactly.
5. Install **Node 22**, then run:

```sh
npm ci
npm --prefix functions ci
npm run firebase:setup
```

The setup command asks for the six public web configuration values and writes ignored `.env.local` and `.firebaserc` files. These are project configuration, not administrator credentials. Never put service account keys in `VITE_` variables or commit them.

6. Deploy the website and backend:

```sh
npx -y firebase-tools@latest login
npm run build
npx -y firebase-tools@latest deploy
```

This deploys Hosting, Firestore indexes/rules, Storage rules and Cloud Functions. The functions are in `us-central1`; change `setGlobalOptions` and `VITE_FIREBASE_FUNCTIONS_REGION` together if using another region. Allow indexes to finish building before testing searches. The CLI may ask about Cloud Run artifact cleanup policies; choose a short retention period.

7. Add the deployed hostname to Authentication’s authorized domains. Test Google sign-in and email links on that hostname. Firebase sends the email links; no custom mail server is required.
8. Create your marketplace account once, then grant yourself moderator access with an authenticated Admin SDK environment:

```sh
gcloud auth application-default login
node scripts/set-admin.mjs YOUR_PROJECT_ID YOUR_ACCOUNT_EMAIL
```

Run this locally with your own Google Cloud permissions, never in the browser. Alternatively set the `admin: true` custom claim with a trusted Admin SDK environment. Sign out and back in, then open `#/moderation`. The public client cannot assign moderator roles. Do not create a public "first admin" endpoint.

## GitHub Pages alternative

Firebase Hosting is the simplest deployment because `firebase.json` supplies security headers. GitHub Pages can host the frontend while Firebase still handles accounts, data, files and functions.

1. Deploy the Firebase backend first: `npx -y firebase-tools@latest deploy --only firestore,storage,functions`.
2. In repository **Settings → Pages**, choose **GitHub Actions** as the source.
3. Add the six `VITE_FIREBASE_…` values as repository **Actions variables**, matching `.env.example`. These are public Firebase web configuration. Optionally add `VITE_PLAY_STORE_URL` after the app listing exists.
4. Run **Publish marketplace to GitHub Pages** under Actions. The workflow is manual so unconfigured Firebase changes do not automatically replace a live site.
5. Add your Pages hostname or custom domain to Firebase Auth’s authorized domains.

Hash routes work on project subpaths without server rewrites. GitHub Pages does not support custom HTTP security headers; the preview iframe still enforces its own CSP and sandbox. If you need the full header policy, use Firebase Hosting.

## Local development

```sh
npm ci
npm --prefix functions ci
npm run dev
```

Without `.env.local`, the public starter catalog works and sign-in/upload actions explain that community accounts are not open yet. It never simulates a signed-in account or pretends to save uploads.

To use local Firebase emulators, set `.env.local` using `.env.example`, use project `demo-booplio`, any nonempty API key and app ID, `demo-booplio.firebaseapp.com` as auth domain, `demo-booplio.appspot.com` as bucket, and `VITE_USE_EMULATORS=true`. Run the Auth, Firestore, Storage and Functions emulators. Emulator connections are only honored on localhost/127.0.0.1.

## Verification

```sh
npm run build
npm run backend:build
npm test
npm run test:emulators
```

Emulator tests require Java 21 (Java 17 also works with the pinned CLI). Rules tests verify private drafts, owner access, moderator access, private saves/reports, blocked direct Storage access and blocked client writes. Integration tests verify real handlers with emulator-issued and verified Auth tokens against real Firestore/Storage emulators: upload, submit, moderation, anonymous downloads, collection saves, live-version preservation, takedowns and account deletion. They invoke the callable `.run` test API rather than the HTTP Functions emulator, allowing tests in environments that prohibit Unix sockets. This does not test the deployed Cloud Functions transport or production OAuth/email delivery.

GitHub Actions runs these checks on pushes and pull requests. Test the production sign-in and import flow on your own Android device before announcing the marketplace. Browser screenshot/interaction QA was not available in the creation environment.

## Files, previews and Android

The Android repository’s `docs/custom-dents.md` and `CustomDent.kt` define the contract: self-contained UTF-8 HTML, maximum 1 MiB, inline scripts/styles, embedded image/font data URLs, `sandbox="allow-scripts"`, opaque origin, and schema-1 `dentupdate` messages. Supported kinds: `charging`, `volume`, `brightness`, `camera`, `headphones`.

The current Android manifest has no marketplace import/deep-link handler. Downloads therefore use real HTML files and explicit instructions: **Booplio → Settings → Custom dent designs → matching category → Import**. No invented "Open in Booplio" integration is presented. The site accepts HTML only because this is what the current Android importer supports.

Listing covers use selectable illustrative artwork. Clicking Try it out runs the actual uploaded file. The site never renders uploaded HTML into its main document. Preview frames cannot access the parent origin, authentication state, network, storage, popups, child frames, objects or forms. JavaScript CPU consumption is not bounded. Preview and import only trusted code; moderation and file-format validation are not safety guarantees.

## Data model

- `profiles/{uid}`: public name, handle and bio, never email.
- `handles/{handle}`: unique public handle lookup.
- `dents/{id}`: currently approved listing, status, counts and indexed search prefixes.
- `dents/{id}/versions/{revision}`: approved version metadata and private file reference.
- `drafts/{id}`: owner/moderator-only work in progress and review state.
- `users/{uid}/saves/{dentId}` and `following/{creatorId}`: account-private preferences.
- `reports/{reportId}`: moderator-only reports.
- `rateLimits` and `downloadReceipts`: temporary hashed deduplication records.
- Storage `private/{uid}/{draftId}/{random}.html`: immutable source files, read/written through server handlers only.

Direct client writes are denied. Every mutation is a callable function with server validation and ownership checks. Published records stay unchanged during pending updates. Approval copies a specific reviewed revision. A stale moderation action fails if the creator edits after review began. Only verified accounts can submit files. Moderator-hidden listings cannot be republished by their owners.

Download counts deduplicate by dent, IP and UTC day; they are approximate, not unique-person analytics. Saves are per-account. There are no fabricated community downloads or users. Old draft file revisions are retained to avoid deleting a file referenced by an approved release; review storage retention as the community grows. Account deletion removes a creator’s uploaded files and listings. Retained moderation logs and other users’ downloaded copies are not erased.

## Launch hardening

Enable Firebase App Check with reCAPTCHA v3 and set `VITE_FIREBASE_APPCHECK_SITE_KEY`. After confirming valid traffic, set `ENFORCE_APP_CHECK=true` in `functions/.env.YOUR_PROJECT_ID` and redeploy functions to enforce it on callables. Enable App Check enforcement for Firestore in the console after testing. Anonymous downloads remain possible with a valid App Check token. Set a retention/TTL policy for `rateLimits.expiresAt` and `downloadReceipts.expiresAt` if the scheduled cleanup batch of 400 records per collection per day is insufficient.

Review the marketplace-specific privacy policy and community terms before launch, especially your contact channel and Google service disclosures. The marketplace needs account data; its privacy policy is intentionally separate from the Android app’s no-data policy.

## Primary references

- https://firebase.google.com/docs/auth/web/email-link-auth
- https://firebase.google.com/docs/functions/callable
- https://firebase.google.com/docs/firestore/security/get-started
- https://firebase.google.com/docs/storage/web/start

## Open in Booplio (Android 2.7.0+)

Template detail pages now provide a real, user-clicked HTTPS link to `/open-template?id=…&kind=…&name=…` on `booplio.redstoneinvente.com`. Pointer-down lifts a small design badge toward the top of the viewport. Reduced motion disables it; navigation is never delayed. The website never claims that an import completed. The Android app asks for consent and handles the actual import.

`/open-template` renders a browser fallback with the real listing, HTML download, and explicit app launch. Android Chrome gets a package-targeted intent with `/templates/ID` as its non-launching browser fallback. Other browsers get the explicit `booplio://template` link. Native entry routes are mapped into the existing hash router without redirecting away from the domain. Assets use root paths so `/templates/ID` can load reliably. No page automatically launches an app.

The public endpoint is `GET /api/templates/ID/download` (also supports HEAD). It returns the exact UTF-8 HTML bytes as an attachment, with sandbox CSP and no JSON envelope or redirects. The HTTP Firebase function `templateDownload` reads only currently published, non-hidden listings and their approved current revision; it never accepts a draft/version override or uses browser credentials. It checks stored size, bounds the actual stream to 1 MiB, validates UTF-8, and rechecks publication before returning. Storage and Firestore rules are unchanged. Original starter files are packaged with the backend during its build.

For Firebase Hosting, `firebase.json` routes `/api/**` to `templateDownload` before the SPA fallback. Deploy after a Firebase CLI sign-in:

```bash
FIREBASE_FUNCTIONS_DISCOVERY_OUTPUT_PATH=true npx -y firebase-tools@latest deploy --only functions:templateDownload,hosting --project booplio-redstoneinvente --non-interactive
```

For Cloudflare Pages, keep build command `npm run build` and output `dist`. The build emits an advanced-mode `_worker.js` and `_routes.json` that route only `/api/*` through the Worker. Starter downloads are served from the Pages asset binding; community downloads proxy the public Firebase HTTP function without forwarding cookies or authorization headers. It rejects redirects, oversized/non-UTF-8 responses and unexpected content types. Do not deploy the Firebase `functions/` folder as Pages Functions: the generated advanced-mode Worker replaces Pages' folder-based routing. Firebase Hosting ignores the Cloudflare-specific output files. A plain GitHub Pages deployment cannot serve this dynamic API.

### Verified Android links

The Play app signing certificate fingerprint is not present in the app handoff or repository. No fingerprint has been invented or taken from a development/upload key. Until configured, the build emits `/.well-known/assetlinks.json` as `[]`, and explicit intent/custom-scheme buttons plus HTML downloads remain available. Automatic verified HTTPS opening is not enabled by this empty association file.

Copy the real **Play Console → App integrity → App signing key certificate → SHA-256** into `android-app-links.json`'s `playSigningFingerprints` array, preserving the colon-separated format, then rebuild and redeploy. Alternatively set `BOOPLIO_PLAY_SIGNING_SHA256` to a comma-separated list of real signing fingerprints in the Cloudflare build environment. The build validates each fingerprint and emits the Android association for `com.redstoneinvente.booplio`. This public certificate fingerprint is not a private signing key. Do not supply keystores, passwords or private keys.

The exact association URL must return JSON with no redirects on the custom domain. Install an Android build containing the 2.7.0 receiver, then verify links on a real phone and test the consent/ignore, offline/retry, installed/uninstalled, and file-manager paths from the app handoff. Automated website tests cannot establish native browser/Android handoff behavior.

New tests cover query validation, safe names, intent fallbacks, deep entry routes, exact bytes, UTF-8 and streaming limits, proxy redirect rejection, and the public endpoint's published/pending/hidden/deleted lifecycle against Firebase emulators. Browser visual QA and real Android end-to-end testing have not been performed in this environment.
