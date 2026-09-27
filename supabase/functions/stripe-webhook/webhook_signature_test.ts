// Signature-handling tests for the stripe-webhook edge function.
//
// These tests exercise the deployed function via HTTP. They verify the
// webhook rejects:
//   1. requests missing the `stripe-signature` header       → 400
//   2. requests with an invalid signature                   → 400
//   3. non-POST methods                                     → 405
//
// The webhook must NEVER accept an unverified body — a missing/invalid
// signature is the only thing standing between a random caller and marking
// arbitrary orders paid + triggering product generation.
//
// Required env (from .env): VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  "";

const skip = !SUPABASE_URL || !ANON_KEY;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/stripe-webhook`;

const fakeEventBody = JSON.stringify({
  id: "evt_test_fake",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_fake",
      payment_status: "paid",
      metadata: { order_id: "00000000-0000-0000-0000-000000000000" },
    },
  },
});

Deno.test({
  name: "stripe-webhook: rejects request with missing stripe-signature header",
  ignore: skip,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const resp = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Edge functions require an apikey header at the gateway; the
        // webhook itself must still reject on the missing Stripe signature.
        apikey: ANON_KEY,
      },
      body: fakeEventBody,
    });
    const body = await resp.text();
    assertEquals(resp.status, 400, `expected 400, got ${resp.status}: ${body}`);
    assert(
      body.toLowerCase().includes("signature") || body.toLowerCase().includes("missing"),
      `body should mention signature: ${body}`,
    );
  },
});

Deno.test({
  name: "stripe-webhook: rejects request with invalid stripe-signature",
  ignore: skip,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const resp = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        // Well-formed-looking but bogus signature — must fail HMAC check
        // against every configured webhook secret.
        "stripe-signature":
          "t=1700000000,v1=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      },
      body: fakeEventBody,
    });
    const body = await resp.text();
    assertEquals(resp.status, 400, `expected 400, got ${resp.status}: ${body}`);
    assert(
      body.toLowerCase().includes("invalid") || body.toLowerCase().includes("signature"),
      `body should indicate invalid signature: ${body}`,
    );
  },
});

Deno.test({
  name: "stripe-webhook: rejects non-POST requests",
  ignore: skip,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const resp = await fetch(WEBHOOK_URL, {
      method: "GET",
      headers: { apikey: ANON_KEY },
    });
    await resp.text(); // consume body to avoid resource leak
    // 405 from the function itself; some gateways may respond 401/404 to
    // GET before hitting the handler — accept any non-2xx.
    assert(
      resp.status === 405 || (resp.status >= 400 && resp.status < 500),
      `expected 4xx (ideally 405), got ${resp.status}`,
    );
  },
});
