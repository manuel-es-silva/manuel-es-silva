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
  landlordEmail, roommates[], createdAt.
- `rooms` — propertyId, name, kind (drives which checklist template
  applies), sortOrder.
- `photos` — propertyId, roomId, phase ('move-in' | 'move-out'),
  checklistKey, blob, note?, isDamage, capturedAt, sha256,
  pairedMoveInPhotoId? (wired up in Phase 2 for before/after pairing).
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

## Phase 2 — Move-out mode — NOT STARTED

Plan: reuse the same room/checklist structure with `phase: 'move-out'`;
ghost-overlay (canvas compositing live camera preview with the move-in
photo at reduced opacity) is the stretch goal — if that proves unreliable
across mobile browsers, fall back to showing the move-in photo pinned next
to the capture control instead of overlaying it directly.

## Phase 3 — Deadline tracker + roommate split — NOT STARTED

State deposit-return rules **will not be invented**. Plan is to ship a
small, explicitly-sourced table (a handful of states, each with a link to
the actual statute/government page and a `last_verified` date) and mark
every other state "not yet verified," directing the user to check
locally.

## Phase 4 — Monetization — NOT STARTED

Decision (see conversation): **one-time unlock, not ads.** Two reasons:
(1) the app's core pitch is that photos never leave the device — an ad SDK
means third-party trackers, which undercuts that promise; (2) this is a
twice-a-year app (move-in, move-out), not a daily-use app, so ad
impressions per install would be too low to matter anyway, while a
one-time purchase at the moment of highest motivation (about to email the
landlord) converts well. Plan stays as originally scoped: Stripe Checkout
on web, a single entitlement check gating PDF/comparison/deadline/split
features, swapped for platform IAP in Phase 5.

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
