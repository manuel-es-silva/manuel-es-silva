import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';
import type { CustomerInfo } from '@revenuecat/purchases-capacitor';
import { isNative } from './platform';
import { setUnlocked } from './entitlement';
import {
  REVENUECAT_API_KEY_ANDROID,
  REVENUECAT_API_KEY_IOS,
  UNLOCK_ENTITLEMENT_ID,
  UNLOCK_PRODUCT_ID,
} from '../config/iap';

let configured = false;

async function ensureConfigured(): Promise<void> {
  if (configured) return;
  const apiKey = Capacitor.getPlatform() === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  await Purchases.configure({ apiKey });
  configured = true;
}

function applyEntitlement(customerInfo: CustomerInfo): boolean {
  const active = UNLOCK_ENTITLEMENT_ID in customerInfo.entitlements.active;
  setUnlocked(active);
  return active;
}

/** Call once on app startup (native only) so a prior purchase is reflected immediately. */
export async function initNativePurchases(): Promise<void> {
  if (!isNative()) return;
  await ensureConfigured();
  const { customerInfo } = await Purchases.getCustomerInfo();
  applyEntitlement(customerInfo);
}

export async function purchaseNativeUnlock(): Promise<boolean> {
  if (!isNative()) return false;
  await ensureConfigured();
  const { products } = await Purchases.getProducts({ productIdentifiers: [UNLOCK_PRODUCT_ID] });
  const product = products[0];
  if (!product) return false;
  const { customerInfo } = await Purchases.purchaseStoreProduct({ product });
  return applyEntitlement(customerInfo);
}

/** App Store review requires a restore path for non-consumable purchases. */
export async function restoreNativePurchases(): Promise<boolean> {
  if (!isNative()) return false;
  await ensureConfigured();
  const { customerInfo } = await Purchases.restorePurchases();
  return applyEntitlement(customerInfo);
}
