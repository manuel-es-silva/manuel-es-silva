# DepositGuard

A mobile-first, installable web app that helps renters document their unit at
move-in and move-out so they have a dated, hash-verifiable record to send
their landlord — useful when it's time to get the security deposit back.

Everything is **local-first**: photos and data live in your browser's
IndexedDB. Nothing is uploaded anywhere unless you explicitly share the
generated PDF report yourself.

> "DepositGuard" is a placeholder name — rename it in one place:
> `src/config/app.ts` (`APP_NAME`), plus the PWA manifest in
> `vite.config.ts` and the `<title>` in `index.html`.

## Status

Phases 1–5 are done on the code side (move-in MVP, move-out mode, deadline
tracker + roommate split, monetization, iOS + Android via Capacitor). See
[`PLAN.md`](./PLAN.md) for what's implemented, what's next, and notable
decisions.

**Phase 5 was built and type-checked, but not run** — this was built in a
Linux sandbox with no Xcode and no Android SDK access, so the native iOS/
Android builds themselves need to happen on your machine. `PLAN.md` has a
full walkthrough (signing, icons, TestFlight/Play Console, IAP setup) —
read it before assuming anything native works untested.

## Run it locally

```bash
npm install
npm run dev
```

Open the printed local URL. For camera capture to work like it would on a
phone, open the app on an actual phone on the same network (Vite prints a
"Network" URL) or use your browser's device-toolbar/responsive mode — the
capture button uses a plain `<input type="file" capture="environment">`,
which desktop browsers fall back to a normal file picker for.

Other scripts:

```bash
npm run build     # type-check + production build to dist/
npm run preview   # serve the production build locally
npm run lint      # oxlint
```

## How the move-in flow works

1. **Onboarding** (`/`) — address, move-in date, landlord contact, roommates.
2. **Rooms** (`/rooms`) — starts from a default room list (entry, living
   room, kitchen, bathroom, bedroom, closet, hallway, balcony); add, rename,
   or remove rooms to match your place.
3. **Checklist** (`/checklist/:roomId`) — a guided shot list per room (walls,
   floor, ceiling, windows, doors, outlets/switches, cabinets, appliances,
   fixtures — tailored per room type). Tap an item to capture it with your
   camera, optionally flag it as existing damage and add a note. Skip
   anything that doesn't apply, or add extra photos beyond the checklist.
4. **Progress** (`/progress`) — rooms completed vs. remaining, jump back into
   any room.
5. **Report** (`/report/move-in`) — generates a PDF (cover page, room-by-room
   photos with notes/timestamps, damage items highlighted, a SHA-256 hash
   listing for every photo, and a plain-language disclaimer), then share it
   via the Web Share API (mobile: opens your phone's share sheet so you can
   email it straight from your own mail app) or download it (desktop
   fallback). After sharing, the app asks whether you actually sent it to
   your landlord and records that confirmation date.

## Move-out flow

From the move-in progress page, "Moving out? Start move-out documentation"
(`/move-out/start`) sets a move-out date and switches the app into move-out
mode for that property — the same rooms, in the same checklist order.

- **Checklist** (`/checklist/move-out/:roomId`) shows the matching move-in
  photo as a dimmed reference thumbnail above each item so you can match the
  angle, then captures the same way as move-in.
- **Report** (`/report/move-out`) generates a before/after comparison PDF —
  each checklist item side by side (move-in left, move-out right) with both
  timestamps and notes, a section for items only photographed on one side,
  and a combined hash appendix.

## Deadline tracker + roommate split

- **Deadline** (`/deadline`) — pick a state to see its deposit-return
  deadline and source statute; once move-out has a date, shows a live
  countdown. Only a handful of states are verified against real sources
  (`src/data/stateRules.ts`); everything else says so rather than guessing.
- **Split** (`/split`) — total deposit, amount returned, and each
  roommate's paid amount; computes everyone's proportional refund/deduction.

## Monetization

Move-in photo capture is free. Reports, the before/after comparison, the
deadline tracker, and roommate split are behind a one-time unlock
(`src/config/payments.ts` — set your own Stripe Payment Link and price;
`src/config/waitlist.ts` — set your own form endpoint for `/landing`'s
waitlist). `/settings` shows unlock status.

## iOS + Android (Capacitor)

```bash
npm run cap:ios       # build, sync, open Xcode
npm run cap:android   # build, sync, open Android Studio
npm run cap:assets    # regenerate icons/splash from resources/
```

Needs a Mac + Xcode (+ Apple Developer account) for iOS, Android Studio
(+ Play Console account) for Android — see the Phase 5 walkthrough in
`PLAN.md` for the full setup, signing, and store-submission steps. On
native, photos are stored via the Filesystem plugin instead of IndexedDB,
capture uses the real native camera, sharing uses the native share sheet,
deadline reminders are real scheduled OS notifications, and the unlock
uses RevenueCat (StoreKit/Play Billing) instead of the web's Stripe link.

## Tech stack

- Vite + React + TypeScript + Tailwind CSS v4
- `vite-plugin-pwa` — installable, works offline
- Dexie (IndexedDB) — local storage for properties, rooms, and photo blobs
  on web (native uses device filesystem storage instead, see above)
- pdf-lib — on-device PDF generation, no server involved
- react-router-dom
- Capacitor — iOS + Android wrapper (camera, filesystem, share, local
  notifications, haptics)
- RevenueCat — native in-app purchase (StoreKit/Play Billing) with
  server-verified receipts

No backend, no accounts, no analytics.

## Not legal advice

This app organizes documentation. It never promises you'll get your deposit
back and never tells you what the law says for your situation. See the
disclaimer shown on every report and on the onboarding screen.
