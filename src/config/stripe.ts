/**
 * Stripe live-mode toggle.
 *
 * Set STRIPE_LIVE_MODE to true to use the live Stripe key on the server.
 * The frontend forwards this flag to the `create-checkout` edge function,
 * which selects the corresponding secret:
 *   - true  → STRIPE_SECRET_KEY_LIVE  (must be configured in backend secrets)
 *   - false → STRIPE_SECRET_KEY       (default test key)
 *
 * If STRIPE_SECRET_KEY_LIVE is not configured, the backend falls back to the
 * test key automatically so checkout never breaks.
 */
export const STRIPE_LIVE_MODE = true;

export const stripeConfig = {
  liveMode: STRIPE_LIVE_MODE,
} as const;
