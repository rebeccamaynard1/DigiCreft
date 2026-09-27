// Ensures generate-product NEVER produces a PDF or delivery for a
// test-mode order. This is the last line of defense: if a stray test-mode
// order (from the sandbox Stripe key, a manual DB insert, or a bug in
// create-checkout) reaches generate-product, it must be refused and marked
// failed — no AI call, no PDF, no email, no delivery.
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

Deno.test({
  name: "generate-product: refuses test-mode orders and marks them failed",
  ignore: skip,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Provision a throwaway user so the order FK is satisfied.
    const stamp = Date.now();
    const email = `guard+${stamp}@e2e.becksdigitalpro.org`;
    const { data: created, error: userErr } = await admin.auth.admin.createUser({
      email,
      password: `Guard!${crypto.randomUUID()}`,
      email_confirm: true,
    });
    assertEquals(userErr, null, `createUser failed: ${userErr?.message}`);
    const userId = created.user!.id;

    let orderId: string | null = null;
    try {
      // Insert a paid TEST-mode order — exactly what a sandbox Stripe
      // checkout would produce.
      const { data: order, error: orderErr } = await admin
        .from("orders")
        .insert({
          user_id: userId,
          product_id: "daily-planner",
          form_data: { name: "Guard Test" },
          status: "paid",
          test_mode: true,
        })
        .select()
        .single();
      assertEquals(orderErr, null, `insert failed: ${orderErr?.message}`);
      orderId = order!.id;

      // Call generate-product with service-role auth (webhook's caller).
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-product`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({ orderId }),
      });
      const body = await resp.text();

      // Must refuse — not 200.
      assert(
        resp.status >= 400,
        `expected refusal (>=400) for test-mode order, got ${resp.status}: ${body}`,
      );
      assert(
        body.toLowerCase().includes("test mode"),
        `error body should mention test mode: ${body}`,
      );

      // Order must be marked failed, never generating/completed. Also
      // confirm no PDF was uploaded and no delivery email was logged.
      const { data: after } = await admin
        .from("orders")
        .select("status, generated_file_url, error_message")
        .eq("id", orderId)
        .single();
      assertEquals(
        after?.status,
        "failed",
        `test-mode order should be marked failed, got ${after?.status}`,
      );
      assertEquals(
        after?.generated_file_url,
        null,
        "test-mode order must not have a generated file",
      );
      assert(
        (after?.error_message ?? "").toLowerCase().includes("test mode"),
        `error_message should mention test mode: ${after?.error_message}`,
      );

      const { data: emails } = await admin
        .from("email_send_log")
        .select("id")
        .eq("recipient_email", email);
      assertEquals(
        emails?.length ?? 0,
        0,
        "test-mode order must not trigger a delivery email",
      );
    } finally {
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
  },
});
