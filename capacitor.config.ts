import type { CapacitorConfig } from '@capacitor/cli';

// appId and appName are placeholders alongside APP_NAME in src/config/app.ts —
// rename all three together before submitting to either store. Changing
// appId after a store listing exists means creating a new listing, so pick
// the real one (reverse-DNS, e.g. com.yourcompany.appname) before Phase 5's
// Xcode/Play Console setup.
const config: CapacitorConfig = {
  appId: 'com.depositguard.app',
  appName: 'DepositGuard',
  webDir: 'dist',
  // Content extends under the notch/status bar (default 'never') so the
  // header's brand color reaches the top like a native app, rather than
  // leaving a plain gap above it — src/components/PageShell.tsx pads for
  // the safe area itself via env(safe-area-inset-top).
  ios: {
    contentInset: 'never',
  },
};

export default config;
