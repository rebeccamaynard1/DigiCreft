// Verifies that generate-product is idempotent: a duplicate webhook
// delivery (or any second invocation) for an order that is already
// completed / generating must NOT re-run the AI + PDF + email pipeline.
//
// Two guards being tested here (see generate-product/index.ts):
//   1. status != 'paid'   → early return, no AI/email
//   2. atomic paid→generating claim; a losing race must return early
//
// Failure of this test means Stripe webhook retries (which Stripe issues
// aggressively on 5xx or timeouts) could double-charge Lovable AI credits,
// double-upload PDFs, AND send the buyer a second delivery email — a real
// user-visible bug.
//
// Required env (from .env): VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Skipped automatically if either is missing.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const skip = !SUPABASE_URL || !SERVICE_ROLE;

async function invokeGenerate(orderId: string) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-product`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
    body: JSON.stringify({ orderId }),
  });
  const body = await resp.json();
  return { resp, body } as { resp: Response; body: Record<string, unknown> };
}

Deno.test({
  name:
    "generate-product: duplicate invocation on a completed order does not regenerate or re-email",
  ignore: skip,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const stamp = Date.now();
    const email = `dedup+${stamp}@e2e.becksdigitalpro.org`;
    const { data: created, error: userErr } = await admin.auth.admin.createUser({
      email,
      password: `Dedup!${crypto.randomUUID()}`,
      email_confirm: true,
    });
    assertEquals(userErr, null, `createUser failed: ${userErr?.message}`);
    const userId = created.user!.id;

    let orderId: string | null = null;
    try {
      // Seed an already-completed order (simulates: webhook fired once,
      // PDF was rendered and delivered, now Stripe retries the event).
      const fakePath = `${userId}/dedup-${stamp}.pdf`;
      const { data: order, error: orderErr } = await admin
        .from("orders")
        .insert({
          user_id: userId,
          product_id: "daily-planner",
          form_data: { name: "Dedup Test" },
          status: "completed",
          test_mode: false,
          generated_file_url: fakePath,
        })
        .select()
        .single();
      assertEquals(orderErr, null, `insert failed: ${orderErr?.message}`);
      orderId = order!.id;

      // Snapshot email log rows for this recipient BEFORE the duplicate call.
      const { data: emailsBefore } = await admin
        .from("email_send_log")
        .select("id")
        .eq("recipient_email", email)
        .eq("template_name", "product-delivery");
      const beforeCount = emailsBefore?.length ?? 0;

      // Simulate a duplicate Stripe webhook delivery hitting generate-product.
      const { resp, body } = await invokeGenerate(orderId!);
      assertEquals(resp.status, 200, `expected 200, got ${resp.status}: ${JSON.stringify(body)}`);
      assertEquals(
        body.idempotent,
        true,
        `duplicate delivery must be flagged idempotent: ${JSON.stringify(body)}`,
      );
      assertEquals(
        body.status,
        "completed",
        `status should stay 'completed', got '${body.status}'`,
      );

      // Order row must not have been touched (still completed, same file path).
      const { data: after } = await admin
        .from("orders")
        .select("status, generated_file_url")
        .eq("id", orderId)
        .single();
      assertEquals(after?.status, "completed", "status regressed after duplicate delivery");
      assertEquals(
        after?.generated_file_url,
        fakePath,
        "generated_file_url was overwritten by duplicate delivery",
      );

      // Crucially: NO new product-delivery email was logged.
      const { data: emailsAfter } = await admin
        .from("email_send_log")
        .select("id")
        .eq("recipient_email", email)
        .eq("template_name", "product-delivery");
      assertEquals(
        emailsAfter?.length ?? 0,
        beforeCount,
        `duplicate delivery sent an extra email (before=${beforeCount}, after=${emailsAfter?.length})`,
      );
    } finally {
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
  },
});

Deno.test({
  name:
    "generate-product: concurrent invocations on a paid order only run the pipeline once",
  ignore: skip,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const stamp = Date.now();
    const email = `race+${stamp}@e2e.becksdigitalpro.org`;
    const { data: created, error: userErr } = await admin.auth.admin.createUser({
      email,
      password: `Race!${crypto.randomUUID()}`,
      email_confirm: true,
    });
    assertEquals(userErr, null, `createUser failed: ${userErr?.message}`);
    const userId = created.user!.id;

    let orderId: string | null = null;
    try {
      // Seed a paid order (nothing generated yet), then fire TWO invocations
      // in parallel — mimicking Stripe re-delivering `checkout.session.completed`
      // while the first one is still in flight. The atomic paid→generating
      // claim must ensure exactly one wins; the loser returns idempotent=true
      // without any AI/email work.
      const { data: order, error: orderErr } = await admin
        .from("orders")
        .insert({
          user_id: userId,
          product_id: "daily-planner",
          form_data: { name: "Race Test" },
          status: "paid",
          test_mode: false,
        })
        .select()
        .single();
      assertEquals(orderErr, null, `insert failed: ${orderErr?.message}`);
      orderId = order!.id;

      const [a, b] = await Promise.all([invokeGenerate(orderId!), invokeGenerate(orderId!)]);

      // Both calls should succeed at the HTTP level.
      assert(a.resp.ok, `first call failed: ${JSON.stringify(a.body)}`);
      assert(b.resp.ok, `second call failed: ${JSON.stringify(b.body)}`);

      // Exactly one must have been flagged idempotent (the losing racer).
      const idempotentFlags = [a.body.idempotent === true, b.body.idempotent === true];
      const idempotentCount = idempotentFlags.filter(Boolean).length;
      assertEquals(
        idempotentCount,
        1,
        `expected exactly one loser to return idempotent=true, got ${idempotentCount}. ` +
          `a=${JSON.stringify(a.body)} b=${JSON.stringify(b.body)}`,
      );

      // Poll until the winning invocation finishes (or fails).
      let final: { status: string } | null = null;
      for (let i = 0; i < 60; i++) {
        const { data } = await admin
          .from("orders")
          .select("status")
          .eq("id", orderId)
          .single();
        if (data?.status === "completed" || data?.status === "failed") {
          final = data as { status: string };
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      assert(final, "order never reached a terminal status");

      // Only ONE product-delivery email may have been logged for this buyer,
      // regardless of how many webhook retries hit the function.
      const { data: deliveryEmails } = await admin
        .from("email_send_log")
        .select("id, status")
        .eq("recipient_email", email)
        .eq("template_name", "product-delivery")
        .in("status", ["sent", "pending"]);
      // We accept 0 (generation could have failed) or 1, but never >1.
      const count = deliveryEmails?.length ?? 0;
      assert(
        count <= 1,
        `duplicate delivery emails sent (${count}) — idempotency broken`,
      );
    } finally {
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
  },
});
