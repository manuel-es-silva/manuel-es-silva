# PLAN.md

Tracks what's done, what's next, and decisions worth remembering. See
`README.md` for how to run the app.

## Stack

- Vite + React + TypeScript, Tailwind CSS v4 (`@tailwindcss/vite` plugin).
- `vite-plugin-pwa` for installability/offline.
- Dexie over IndexedDB for local-first storage (properties, rooms, photo
  blobs, report-share records).
- **pdf-lib** (not jsPDF) for report generation — chosen over jsPDF because
  the reports are photo-grid-heavy and pdf-lib gives direct pixel control
  over image placement (`embedJpg`/`embedPng` + `drawImage` at explicit
  x/y/width/height), which matters more here than jsPDF's table/text
  helpers.
- react-router-dom for the onboarding → rooms → checklist → progress →
  report flow.
- SHA-256 via native `crypto.subtle` — no hashing library needed.
- Sharing via the Web Share API (`navigator.share`/`canShare` with files),
  falling back to a plain download link when unsupported (desktop).
- Capacitor wraps the same web codebase for **both iOS and Android**
  (Phase 5) — the original brief scoped iOS only and put Android out of
  scope; that was revised, since Capacitor supports both without an
  architecture change.
- RevenueCat (`@revenuecat/purchases-capacitor`) wraps StoreKit/Play
  Billing for the native in-app purchase, chosen over a bare
  cordova-purchase-style plugin because it also verifies receipts
  server-side — closing the gap Phase 4 flagged with the web-only Stripe
  Payment Link unlock (see Phase 5 below).

## Data model

Dexie tables, all local to the device:

- `properties` — address, moveInDate, moveOutDate?, landlordName,
  landlordEmail, roommates[] (each with an optional `depositPaid` dollar
  amount), state?, depositAmount?, depositReturnedAmount?,
  depositReturnedDate?, createdAt.
- `rooms` — propertyId, name, kind (drives which checklist template
  applies), sortOrder.
- `photos` — propertyId, roomId, phase ('move-in' | 'move-out'),
  checklistKey, blob? (web) / filePath? (native, Phase 5 — see
  `src/lib/photoStorage.ts`; exactly one of the two is set), note?,
  isDamage, capturedAt, sha256, pairedMoveInPhotoId? (set on move-out
  photos, wired up in Phase 2 for before/after pairing).
- `reportShares` — one row per (propertyId, phase): sharedAt,
  confirmedSentAt — backs the "did you send it to your landlord?"
  confirmation.

Per-room checklist items (walls, floor, ceiling, appliances, etc.) are a
static config keyed by room `kind` (`src/db/roomTemplates.ts`), not stored
in the DB — custom/renamed rooms still get a sane default checklist.

## Phase 1 — Move-in MVP (web) — DONE

- Onboarding: address, move-in date, landlord name/email, roommates.
- Room setup: default 8-room list; add/remove/rename.
- Guided per-room checklist with camera capture (`<input type="file"
  capture="environment">`), per-photo note + damage flag, skip/extra
  photos, retake.
- Progress view: per-room and overall shot counts.
- Move-in PDF report: cover page, room-by-room photo grid with
  notes/timestamps, damage photos outlined in red, SHA-256 hash appendix,
  disclaimer.
- Share via Web Share API with desktop download fallback; post-share
  "did you send it?" confirmation recorded with a date.
- PWA manifest + icons (placeholder teal house-glyph icons — swap
  `public/icons/*.png` for real branding before shipping).

Verified: `npm run build` and `npx tsc -b` are clean; `npm run lint` has
two non-blocking warnings (an effect `setState` and a `useMemo` dep note,
both intentional/expected given `useLiveQuery`'s per-render array
identity — not addressed to avoid speculative refactoring). Full flow
smoke-tested with Playwright at a 390×844 (iPhone-sized) viewport:
onboarding → add custom room → capture + flag + note a photo → progress →
generate report → PDF preview renders with correct cover data and photo
count. Zero console/page errors during the run.

## Phase 2 — Move-out mode — DONE

- **Start move-out** (`/move-out/start`): confirms/edits the move-out date,
  sets `property.moveOutDate`, which becomes the switch the rest of the app
  uses to decide which phase is "current" (`currentPhase()` in
  `src/lib/phase.ts` — no separate mode flag). Reachable from the move-in
  progress page ("Moving out? Start move-out documentation"); once set, the
  move-in progress page shows a banner back into move-out instead.
- Routes gained a `:phase` segment (`/checklist/:phase/:roomId`,
  `/progress/:phase`, `/report/:phase`) so move-in and move-out reuse the
  same Progress/RoomChecklist/Report components instead of forking them.
  Same rooms, same `checklistForRoomKind` order for both phases, so the
  move-out walkthrough naturally matches move-in's order as required.
- **Ghost reference — went with the sanctioned fallback, not a live
  overlay.** The move-in capture flow uses `<input type="file"
  capture="environment">`, which hands the shot off to the phone's native
  camera app rather than an in-page `<video>` stream — there's no live
  preview in the DOM to composite a ghost image onto. Building one would
  mean switching to `getUserMedia` + a canvas capture pipeline for
  move-out only, forking the two phases' capture UX and adding real
  cross-browser risk (camera permissions, iOS Safari quirks) for a
  same-day fallback the brief explicitly allowed. Instead, `RoomChecklist`
  shows the matching move-in photo as a dimmed reference thumbnail
  directly above each item's capture button — "next to the camera," per
  the brief's own fallback language — and still opens the same native
  camera on tap. Worth revisiting with real `getUserMedia` overlay once
  there's a device to test it on properly (noted here rather than guessed
  at).
- Capturing a move-out photo records `pairedMoveInPhotoId` (most recent
  move-in photo for that room + checklist key), used to build comparison
  pairs.
- **Before/after PDF** (`src/lib/pdf/moveOutReport.ts`): cover page with
  both dates and a compared/uncompared/damage summary, then per-room pages
  with each checklist item as a labeled row — move-in photo on the left,
  move-out on the right, each with its own timestamp/note/damage flag, a
  placeholder box with "No move-in/move-out photo" when only one side
  exists. Items with only one side also get a plain-text appendix, then a
  combined SHA-256 hash appendix for every move-in and move-out photo
  involved. `src/lib/pdf/shared.ts` now holds the page-geometry and
  drawing helpers both report generators share (extracted from Phase 1's
  single-file version to avoid duplicating them).
- If a checklist item was retaken (multiple photos for the same room +
  key + phase), the comparison pairs the *most recent* photo per side —
  every capture still individually appears in the hash appendix via the
  raw photo tables, this only picks one representative per side for the
  visual side-by-side (see the doc comment on `buildRoomComparisons` in
  `src/db/queries.ts`).

Verified: `tsc -b`, `npm run build` (report generators now code-split into
their own chunks, ~2-4kB each), and `npm run lint` clean (same two
pre-existing benign warnings, no new ones). Playwright smoke test at
390×844: full move-in capture → start move-out → move-out checklist shows
the correct move-in reference thumbnail for a re-shot item and correctly
says "No move-in photo to compare" for others → capture → generate
comparison report, zero console/page errors. Additionally verified the
generated PDF isn't just visually plausible but structurally correct: pulled
the report's raw bytes out of the browser and loaded them with pdf-lib —
cover page has 0 embedded images, the room comparison page has exactly 3
(a genuine move-in+move-out pair plus one move-in-only photo, matching what
was captured in the test), and the uncompared/hash appendix pages are
text-only as designed.

## Phase 3 — Deadline tracker + roommate split — DONE

- `src/data/stateRules.ts`: 5 states verified against real, current sources
  (CA, NY, TX, FL, MA — official legislature/senate statute pages, checked
  via web search this session, not memory), each with `deadlineDays`,
  itemized-list requirement, source URL, `lastVerified`. All other states
  + DC are listed with `verified: false` and null fields. `getStateRule()`
  looks one up by code.
- Onboarding gained an optional State field; `Property` gained `state`,
  `depositAmount`, `depositReturnedAmount`, `depositReturnedDate`.
- **Deadline page** (`/deadline`): shows the state's day count and source
  link; once move-out has a date, shows a live countdown (green / amber
  ≤3 days / red overdue) against `moveOutDate + deadlineDays`. Unverified
  states show a one-line "not verified, check yourself" instead of a
  number — never a guessed one.
- **Reminders**: real local push notifications aren't reliably available
  to a plain web app without a backend (no Periodic Background Sync
  support to rely on). Implemented as best-effort instead: an "Enable
  reminders" button requests Notification permission, and
  `src/lib/reminders.ts` fires an in-browser Notification (deduped to
  once/day via localStorage) when the app is opened within 3 days of, on,
  or after the deadline. This only fires while the app is actually
  opened — worth revisiting with Capacitor's real local-notification
  plugin in Phase 5.
- **Split page** (`/split`): `Roommate.depositShare` (a fraction) became
  `depositPaid` (a dollar amount) — easier to type in. Total deposit +
  amount returned by landlord, per-person paid amount (a "You" entry is
  auto-added so the account holder is part of the split), each row shows
  its share % and dollar refund/deduction, computed proportionally to
  what was paid (falls back to an even split if nobody entered amounts).

Verified: `tsc -b`, `npm run build`, `npm run lint` clean (two new
same-category benign warnings on Split.tsx's mount-time migration effect,
consistent with existing ones elsewhere). Playwright smoke test at
390×844: state selection → deadline page pre- and post-move-out (countdown
math checked against the actual move-out date used) → split page with two
people and non-round amounts, percentages and dollar splits verified
correct. Zero console/page errors.

Also did a pass trimming instructional paragraphs across Phase 1/2 screens
(onboarding, room setup, checklist, move-out start) per feedback that the
UI should read as intuitive rather than explained — dynamic counts and
button labels stayed, static "here's how this screen works" text mostly
didn't.

## Phase 4 — Monetization — DONE

One-time unlock, not ads — reasoning unchanged from the earlier decision
(photos-stay-on-device pitch vs. ad SDK trackers; twice-a-year usage makes
ad impressions worthless anyway).

- `src/lib/entitlement.ts`: `isUnlocked()`/`setUnlocked()` over localStorage
  is the single choke point every gated page checks (`useEntitlement()` for
  a reactive read). Phase 5's StoreKit/Play Billing purchase callbacks call
  `setUnlocked(true)` and nothing else changes.
- Gated: `/report/move-in`, `/report/move-out`, `/deadline`, `/split` — all
  show `<Paywall/>` (feature list + price) instead of content when locked.
  Move-in photo capture itself (onboarding → rooms → checklist → progress)
  stays free, per the spec.
- **Payment mechanism — a real limitation, not a corner cut.** No backend
  exists in this app by design, so Stripe Checkout's normal flow (create a
  session server-side, verify a webhook) doesn't fit without standing up
  infrastructure this session can't provision or hold real API keys for.
  Used a **Stripe Payment Link** instead (`src/config/payments.ts` —
  placeholder URL, swap in your own from the Stripe Dashboard): zero
  backend to host. The trade-off is real: unlocking is trust-based, not
  server-verified. Two paths set the local entitlement flag: (1) Stripe's
  configurable "after payment" redirect back to the app with `?unlocked=1`
  (`src/lib/useUnlockRedirect.ts`, checked on every route), or (2) an
  "Already paid? Unlock" manual fallback on the paywall itself, for when
  the redirect isn't configured or payment happened in another tab. Someone
  could unlock without paying by tapping that fallback — acceptable for a
  $9.99 utility with no accounts to protect, not acceptable to leave as-is
  for a real launch. **Before shipping for real**, either add real
  server-side receipt verification, or lean on Phase 5's platform IAP
  (StoreKit/Play Billing both verify purchases without a backend) as the
  primary path and treat the web unlock as secondary.
- `/settings`: entitlement status + unlock, plus the full disclaimer —
  fills a gap from the original Phase 1 spec ("disclaimer... in settings")
  that never got a dedicated screen until now.
- `/landing`: value props + a waitlist form posting to a Formspree-style
  endpoint (`src/config/waitlist.ts` — placeholder, needs a real form ID).
  No backend needed for this either. It's a route in the same SPA rather
  than a separate static site, for simplicity; if it's meant to live at
  the actual public root before launch, that's a deploy-time decision
  (rewrite `/` → this route, move the app to a subpath) rather than
  something to solve in-app.

**Found and fixed while testing this phase:** `Button`'s `fullWidth`
override was broken since Phase 1 — every "compact" button (Add, Download,
Join, etc.) was passing `className="w-auto px-4"` hoping it would beat the
component's baked-in `w-full`, but in this Tailwind v4 build `.w-full`
wins the cascade regardless of className order, so those buttons were
silently rendering full-width and squeezing their sibling inputs down to
~26px. Never visually obvious enough to notice by eye at a glance across
several screens, but showed up clearly once measured (and once the
waitlist email input on this phase's new Landing page made it impossible
to miss). Fixed by giving `Button` a real `fullWidth` prop instead of
relying on class-string precedence, and updated every call site
(RoomChecklist, Onboarding, Report, RoomSetup, Split, Landing).

## Phase 5 — iOS + Android — CODE DONE, NOT BUILDABLE HERE

This sandbox is Linux with no Xcode and no Android SDK (its network
policy also blocks `dl.google.com`, so even downloading the Android SDK
here isn't possible). Everything code-side is done and type-checks/builds
for web; the native builds themselves need to happen on your machine —
see the walkthrough below for exactly what to do and in what order.

**What changed:**

- `npx cap add ios android` scaffolded `ios/` and `android/` — both are
  committed to the repo (they're real project source, not build output;
  `.gitignore` excludes each platform's actual build artifacts —
  `android/app/build`, `ios/App/Pods`, `xcuserdata`, etc.).
- **Photo storage** (`src/lib/photoStorage.ts`): web keeps storing photo
  Blobs directly in IndexedDB as before; native writes each photo to app
  storage via `@capacitor/filesystem` (`Directory.Data`) and the Dexie
  record keeps only a `filePath`. `Photo.blob` and `Photo.filePath` are
  each optional — exactly one is set, decided at capture time by
  `isNative()`. Every read goes through `getPhotoBlob()` (full bytes, for
  the PDF generators) or the `usePhotoUrl()` hook (a displayable URL,
  using `Capacitor.convertFileSrc()` on native so a thumbnail doesn't
  require reading the whole file into JS memory).
- **Camera**: `RoomChecklist`'s capture button calls `@capacitor/camera`'s
  `Camera.getPhoto()` on native (opens the real native camera UI, not a
  file picker) and falls back to the existing `<input capture>` on web.
  `@capacitor/haptics` fires an impact on every successful capture.
- **Share**: `src/lib/share.ts` writes the generated PDF to
  `Directory.Cache` and hands it to `@capacitor/share` on native (the real
  iOS/Android share sheet), instead of the Web Share API. The standalone
  "Download" button on the report page is hidden on native — the native
  share sheet already has a save-to-Files equivalent, so a second button
  doing the same thing would be website-in-a-box clutter.
- **Reminders**: `@capacitor/local-notifications` schedules three real,
  OS-level notifications (3 days before, on the day, one day after) once
  a move-out date and a verified state are both known — these fire even
  if the app is closed, unlike the web version's best-effort check-on-open.
- **Payments**: `@revenuecat/purchases-capacitor` wraps StoreKit and Play
  Billing behind one API and — usefully — verifies receipts server-side
  for you, which actually resolves the "trust-based, not verified" gap
  Phase 4 flagged for the web Stripe Payment Link unlock. `Paywall` shows
  a real purchase button + a "Restore purchases" button (required by App
  Store review for non-consumables) on native, and keeps the Stripe link
  + manual fallback on web. `src/config/iap.ts` has placeholder API keys
  and product/entitlement identifiers to fill in from your own RevenueCat
  dashboard.
- **Icons/splash**: `resources/icon.png`, `icon-foreground.png` +
  `icon-background.png` (Android adaptive icon layers), and `splash.png`
  generated from the app's existing teal house-glyph mark, then
  `npx capacitor-assets generate` populated every required size into both
  native projects. Regenerate after changing the source images with
  `npm run cap:assets`.
- **Privacy strings & manifest**: `ios/App/App/Info.plist` gained
  `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, and
  `NSPhotoLibraryAddUsageDescription` (required or the app crashes the
  instant it touches the camera, and App Store review rejects a submission
  missing them). Added a minimal `PrivacyInfo.xcprivacy` declaring no
  tracking and no data collection, which is simply true for a local-first
  app — Capacitor's own core package already ships its own manifest for
  its internal API usage, so this only covers the app itself.
- **Safe areas**: iOS content now extends under the notch/status bar
  (`contentInset: 'never'`, the Capacitor default) with the header/footer/
  photo-editor sheet padding themselves via `env(safe-area-inset-*)`
  instead, so the brand-teal header bleeds to the top like a native app
  rather than leaving a plain gap above it. This is a reasonable pass, not
  exhaustively verified — there's no physical notched device to test on
  from here; check it for real once you're in Xcode/Android Studio.

**What I could not verify:** any actual native build, launch, camera
capture, share sheet, notification delivery, or purchase flow. Every
piece above type-checks against its real plugin API and follows each
plugin's documented usage, but "compiles against the types" and "works
correctly in a running iOS/Android app" are different claims — treat the
first TestFlight/internal-test build as the real first test of this
phase, not a formality.

### Walkthrough — iOS (needs a Mac, Xcode, and an Apple Developer account)

1. **Pick real identifiers first.** Decide the real `appId` (reverse-DNS,
   e.g. `com.yourcompany.depositguard`) and app name, and set them in
   `capacitor.config.ts`, `src/config/app.ts` (`APP_NAME`), and
   `index.html`'s `<title>`. Changing `appId` after a store listing exists
   means a new listing, so get this right before the next steps.
2. **Apple Developer Program**: enroll at developer.apple.com if you
   haven't ($99/year). You need this before Xcode can create a real
   signing certificate or before TestFlight exists.
3. `npm run cap:ios` (builds the web app, syncs it into the native
   project, opens Xcode). First time, Xcode may take a minute resolving
   the Swift Package dependencies (Capacitor + the plugins).
4. **Signing**: select the `App` target → *Signing & Capabilities* → pick
   your Team → let Xcode manage the provisioning profile automatically
   (simplest option for a first submission).
5. **Icons/splash**: already populated by `capacitor-assets` (see above).
   Open `Assets.xcassets` in Xcode to eyeball them; regenerate from
   `resources/` if you change the source mark.
6. **Permission strings**: already in `Info.plist` (see above) — reword
   them if you want, but don't remove them.
7. **Run on a real device** (simulator can't use the camera): plug in an
   iPhone, select it as the run destination, hit Run. This is the actual
   first real test of the camera/share/haptics/notification code — watch
   for crashes on first camera use particularly.
8. **RevenueCat + IAP**: create a free RevenueCat account, add your iOS
   app, create one non-consumable product in App Store Connect (*Features
   → In-App Purchases*) matching `UNLOCK_PRODUCT_ID` in
   `src/config/iap.ts`, attach it to an entitlement in the RevenueCat
   dashboard matching `UNLOCK_ENTITLEMENT_ID`, and paste your RevenueCat
   iOS public SDK key into `REVENUECAT_API_KEY_IOS`. Test with a Sandbox
   Apple ID before going further.
9. **TestFlight**: Xcode → *Product → Archive* → *Distribute App* → App
   Store Connect. Add yourself as an internal tester in App Store Connect
   and confirm the build installs and runs from TestFlight itself, not
   just from Xcode.
10. **App Store listing**: in App Store Connect, fill in the listing —
    screenshots (Xcode/simulator can generate these, or take them from
    the device you tested on), description, keywords, support URL,
    privacy policy URL (required — even a simple one stating "no data
    leaves your device except what you choose to share" is enough given
    what this app actually does), and the Privacy Nutrition Label
    questionnaire (answer "no" to data collection throughout — this app
    genuinely doesn't collect anything). Submit for review once a
    TestFlight build has been manually tested end-to-end.

### Walkthrough — Android (Android Studio + a Google Play Console account)

1. Install Android Studio (bundles the Android SDK, which is the thing
   this sandbox can't reach). Same real-identifiers step as iOS #1 if you
   haven't already.
2. `npm run cap:android` (builds, syncs, opens Android Studio). Let
   Gradle sync finish — first sync downloads the Android Gradle Plugin
   and dependencies, so it needs real internet access.
3. **Signing**: *Build → Generate Signed App Bundle/APK* → create a new
   keystore (back this up somewhere safe — losing it means you can never
   update the app under the same listing again) → build a release AAB.
4. **Icons/splash**: already populated (adaptive icon foreground/background
   + splash drawables per density, see above).
5. **Run on a device or emulator** — an emulator can fake a camera feed,
   but test on a real device before shipping; same first-real-test caveat
   as iOS.
6. **Google Play Console account** ($25 one-time): console.play.google.com.
7. **RevenueCat + IAP**: same RevenueCat account as iOS, add your Android
   app, create a managed product in Play Console matching
   `UNLOCK_PRODUCT_ID`, attach it to the same entitlement, paste your
   RevenueCat Android public SDK key into `REVENUECAT_API_KEY_ANDROID`.
8. **Internal testing track**: upload the AAB to Play Console's internal
   testing track first, install it via the opt-in link, confirm it works,
   before touching production.
9. **Play Store listing**: store listing (screenshots, description,
   feature graphic), content rating questionnaire, target audience, Data
   Safety section (same honest "collects nothing" answers as iOS's
   privacy label), and a privacy policy URL. Submit to production (or a
   staged rollout) once the internal test build is confirmed working.

## Ideas parked for later (explicitly out of scope for now)

- User accounts / cloud sync / cross-device access.
- Landlord-facing features (e.g., a landlord view of the report).
- AI-assisted damage detection.
- Multi-property support beyond "one active property at a time" (current
  MVP tracks a single active property via a `localStorage` pointer;
  revisit if multi-property becomes a real need).
