/** Rewarded-ad integration point.
 *
 * THIS IS A MOCK. A real rewarded ad needs a native ad SDK (e.g.
 * `react-native-google-mobile-ads` + AdMob ad unit IDs) wired up as an
 * Expo config plugin and built via EAS — none of which can be installed,
 * compiled, or tested in this sandboxed, browser-only dev environment (no
 * native build tooling, no device, no AdMob account). Shipping an
 * unverifiable native SDK integration blind was judged worse than being
 * upfront about it: `showRewardedAd` below simulates the same async
 * "load → show → reward" shape a real SDK call would have, so swapping in
 * the real implementation later is a one-function change, not a redesign
 * of the calling code in GameScreen.
 *
 * To go live: install `react-native-google-mobile-ads`, configure it as
 * an Expo config plugin in app.json, create a rewarded ad unit in an
 * AdMob account, and replace the body of `showRewardedAd` with the SDK's
 * load/show calls, resolving `true` only from its actual reward callback.
 */

const MOCK_AD_DURATION_MS = 1500;

/** Resolves `true` once the (simulated) rewarded ad has been watched to
 * completion, `false` if it was skipped/failed to load. Never rejects. */
export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), MOCK_AD_DURATION_MS);
  });
}
