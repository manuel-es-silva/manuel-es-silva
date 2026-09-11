// RevenueCat wraps StoreKit (iOS) and Play Billing (Android) behind one API
// and verifies receipts server-side for you — resolving the "trust-based"
// gap the web Stripe Payment Link unlock has (see PLAN.md). Create a free
// RevenueCat account, add your App Store Connect / Play Console apps, and
// configure one non-consumable product + an entitlement that grants it.
export const REVENUECAT_API_KEY_IOS = 'REPLACE_ME_IOS_PUBLIC_SDK_KEY';
export const REVENUECAT_API_KEY_ANDROID = 'REPLACE_ME_ANDROID_PUBLIC_SDK_KEY';

// Must match the product id created in App Store Connect / Play Console
// and attached to an offering in the RevenueCat dashboard.
export const UNLOCK_PRODUCT_ID = 'unlock_reports';

// Must match the entitlement identifier configured in the RevenueCat dashboard.
export const UNLOCK_ENTITLEMENT_ID = 'unlock';
