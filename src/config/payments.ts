// Fill in your own Stripe Payment Link (Stripe Dashboard → Payment Links →
// New). No backend needed for the link itself. In the link's "After
// payment" settings, set the confirmation page to redirect to this app's
// URL with `?unlocked=1` appended so the app can auto-unlock on return —
// see the paywall/redirect-handling note in PLAN.md for why this is a
// trust-based placeholder, not verified server-side.
export const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/REPLACE_ME';

export const UNLOCK_PRICE_LABEL = '$9.99';

export const UNLOCK_QUERY_PARAM = 'unlocked';

export const UNLOCK_FEATURES = [
  'Move-in & move-out PDF reports',
  'Before/after comparison',
  'Deposit deadline tracker',
  'Roommate split',
];
