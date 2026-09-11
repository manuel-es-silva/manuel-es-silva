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
- Capacitor is deferred to Phase 5, targeting **both iOS and Android** from
  the same codebase (the original brief scoped iOS only and put Android
  out of scope; that was revised — Capacitor supports both without an
  architecture change, so Phase 5 now covers both platforms' native
  camera/filesystem/share/notifications and both stores' submission steps).

## Data model

Dexie tables, all local to the device:

- `properties` — address, moveInDate, moveOutDate?, landlordName,
  landlordEmail, roommates[] (each with an optional `depositPaid` dollar
  amount), state?, depositAmount?, depositReturnedAmount?,
  depositReturnedDate?, createdAt.
- `rooms` — propertyId, name, kind (drives which checklist template
  applies), sortOrder.
- `photos` — propertyId, roomId, phase ('move-in' | 'move-out'),
  checklistKey, blob, note?, isDamage, capturedAt, sha256,
  pairedMoveInPhotoId? (set on move-out photos, wired up in Phase 2 for
  before/after pairing).
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

## Phase 5 — iOS + Android — NOT STARTED

Capacitor wrapping both platforms from one codebase; StoreKit (iOS) and
Google Play Billing (Android) behind the same entitlement check from
Phase 4.

## Ideas parked for later (explicitly out of scope for now)

- User accounts / cloud sync / cross-device access.
- Landlord-facing features (e.g., a landlord view of the report).
- AI-assisted damage detection.
- Multi-property support beyond "one active property at a time" (current
  MVP tracks a single active property via a `localStorage` pointer;
  revisit if multi-property becomes a real need).
