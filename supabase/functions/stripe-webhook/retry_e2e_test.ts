// End-to-end test: simulates Stripe re-delivering the same
// `checkout.session.completed` event multiple times (Stripe retries
// aggressively on any non-2xx or timeout). The webhook + generate-product
// pipeline MUST be idempotent so the buyer receives exactly ONE PDF and
// ONE delivery email regardless of how many retries land.
//
// Flow:
//   1. Provision a throwaway buyer + a `pending` order.
//   2. Sign a real Stripe webhook payload with STRIPE_WEBHOOK_SECRET.
//   3. POST the same signed event to `stripe-webhook` three times.
//   4. Poll until the order reaches `completed`.
//   5. Assert exactly ONE `product-delivery` row in email_send_log and
//      exactly ONE generated file for the order.
//
// Gated behind RUN_E2E=1 because it burns Lovable AI credits and sends
// a real email through Resend. Required env:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   - STRIPE_WEBHOOK_SECRET (test-mode signing secret)
// Optional: E2E_EMAIL_DOMAIN (default "e2e.becksdigitalpro.org")

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const RUN = Deno.env.get("RUN_E2E") === "1";
const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const EMAIL_DOMAIN = Deno.env.get("E2E_EMAIL_DOMAIN") ?? "e2e.becksdigitalpro.org";

const skip = !RUN || !SUPABASE_URL || !SERVICE_ROLE || !WEBHOOK_SECRET;

// Sign a payload the same way Stripe does: `t=<ts>,v1=<hex hmac sha256>`
// over `${ts}.${payload}`. constructEventAsync in the webhook verifies this.
async function stripeSign(payload: string, secret: string): Promise<string> {
  const ts = Math.floor(Date.now() / 1000);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${ts}.${payload}`));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `t=${ts},v1=${hex}`;
}

Deno.test({
  name:
    "stripe-webhook e2e: retried delivery of the same event produces one PDF and one email",
  ignore: skip,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const stamp = Date.now();
    const email = `retry+${stamp}@${EMAIL_DOMAIN}`;
    const { data: created, error: userErr } = await admin.auth.admin.createUser({
      email,
      password: `Retry!${crypto.randomUUID()}`,
      email_confirm: true,
    });
    assertEquals(userErr, null, `createUser failed: ${userErr?.message}`);
    const userId = created.user!.id;

    let orderId: string | null = null;
    try {
      // Seed a pending order — the webhook's job is to transition it to paid
      // then invoke generate-product.
      const { data: order, error: orderErr } = await admin
        .from("orders")
        .insert({
          user_id: userId,
          product_id: "daily-planner",
          form_data: { email, name: "Retry Test" },
          status: "pending",
          test_mode: false,
        })
        .select()
        .single();
      assertEquals(orderErr, null, `order insert failed: ${orderErr?.message}`);
      orderId = order!.id;

      // Build one Stripe event; we'll POST the SAME body+signature three times.
      const sessionId = `cs_test_retry_${stamp}`;
      const event = {
        id: `evt_test_retry_${stamp}`,
        object: "event",
        api_version: "2025-08-27.basil",
        created: Math.floor(Date.now() / 1000),
        type: "checkout.session.completed",
        livemode: false,
        data: {
          object: {
            id: sessionId,
            object: "checkout.session",
            payment_status: "paid",
            status: "complete",
            metadata: { order_id: orderId },
            customer_details: { email },
          },
        },
      };
      const body = JSON.stringify(event);
      const signature = await stripeSign(body, WEBHOOK_SECRET);

      // Fire 3 sequential retries. Each must return 2xx so Stripe stops
      // retrying, and only the first one may kick off the pipeline.
      const statuses: number[] = [];
      const bodies: unknown[] = [];
      for (let i = 0; i < 3; i++) {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "stripe-signature": signature,
          },
          body,
        });
        statuses.push(resp.status);
        bodies.push(await resp.json().catch(() => ({})));
        // Small gap so the first delivery has a head start on claiming the row.
        await new Promise((r) => setTimeout(r, 250));
      }
      assert(
        statuses.every((s) => s >= 200 && s < 300),
        `webhook retries returned non-2xx: ${JSON.stringify({ statuses, bodies })}`,
      );
      // Retries 2 & 3 should be flagged as idempotent replays.
      assertEquals(
        (bodies[1] as { idempotent?: boolean }).idempotent,
        true,
        `2nd delivery not idempotent: ${JSON.stringify(bodies[1])}`,
      );
      assertEquals(
        (bodies[2] as { idempotent?: boolean }).idempotent,
        true,
        `3rd delivery not idempotent: ${JSON.stringify(bodies[2])}`,
      );

      // Poll until generate-product finishes (up to 60s).
      let final: { status: string; generated_file_url: string | null } | null = null;
      for (let i = 0; i < 60; i++) {
        const { data } = await admin
          .from("orders")
          .select("status, generated_file_url")
          .eq("id", orderId)
          .single();
        if (data?.status === "completed" && data.generated_file_url) {
          final = data as { status: string; generated_file_url: string | null };
          break;
        }
        if (data?.status === "failed") {
          throw new Error(`Order marked failed after webhook retries`);
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      assert(final, "Order never reached completed status after webhook retries");

      // Exactly ONE product-delivery email must be logged for this buyer.
      const { data: deliveryEmails } = await admin
        .from("email_send_log")
        .select("id, status, message_id")
        .eq("recipient_email", email)
        .eq("template_name", "product-delivery");
      const emailCount = deliveryEmails?.length ?? 0;
      assertEquals(
        emailCount,
        1,
        `expected exactly 1 product-delivery email, got ${emailCount}: ${JSON.stringify(deliveryEmails)}`,
      );

      // Exactly ONE generated file should exist for this order in storage.
      const { data: files, error: listErr } = await admin.storage
        .from("generated-products")
        .list(userId);
      assertEquals(listErr, null, `storage list failed: ${listErr?.message}`);
      const orderFiles = (files ?? []).filter((f) =>
        (final!.generated_file_url ?? "").endsWith(f.name),
      );
      assertEquals(
        orderFiles.length,
        1,
        `expected 1 generated PDF for order, got ${orderFiles.length}`,
      );
    } finally {
      if (orderId) {
        const { data: o } = await admin
          .from("orders")
          .select("generated_file_url")
          .eq("id", orderId)
          .maybeSingle();
        if (o?.generated_file_url) {
          await admin.storage
            .from("generated-products")
            .remove([o.generated_file_url])
            .catch(() => {});
        }
      }
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
  },
});
