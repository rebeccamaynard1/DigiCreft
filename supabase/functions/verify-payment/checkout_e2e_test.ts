// End-to-end test: simulated Stripe checkout → PDF generation → download + email.
//
// This test does NOT drive a real Stripe Checkout session (that requires browser
// automation against Stripe's hosted page). Instead it simulates a successful
// Stripe checkout by inserting an order in the `paid` state for a freshly
// provisioned auth user, then exercises the real downstream pipeline:
//
//   1. invoke `generate-product` (renders the PDF, uploads to storage, sends email)
//   2. poll `orders.status` until it becomes `completed`
//   3. invoke `get-download-url` as the buyer and fetch the signed URL
//   4. assert the response body is a real PDF (starts with `%PDF-`)
//   5. assert a row landed in `email_send_log` for the buyer's email
//
// Gated behind RUN_E2E=1 because it calls Lovable AI + Resend (consumes credits
// and sends a real email). Required env vars:
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//   - SUPABASE_ANON_KEY
// Optional: E2E_EMAIL_DOMAIN (defaults to "e2e.becksdigitalpro.org")

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const RUN = Deno.env.get("RUN_E2E") === "1";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "";
const EMAIL_DOMAIN = Deno.env.get("E2E_EMAIL_DOMAIN") ?? "e2e.becksdigitalpro.org";

const skip = !RUN || !SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY;

Deno.test({
  name: "checkout e2e: simulated paid order produces email + downloadable PDF",
  ignore: skip,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
    });

    // 1. Provision a throwaway buyer.
    const stamp = Date.now();
    const email = `e2e+${stamp}@${EMAIL_DOMAIN}`;
    const password = `E2e!${crypto.randomUUID()}`;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assertEquals(createErr, null, `createUser failed: ${createErr?.message}`);
    const userId = created.user!.id;

    let orderId: string | null = null;

    try {
      // 2. Sign in to obtain a buyer JWT (used later for get-download-url).
      const { data: session, error: signInErr } = await anon.auth.signInWithPassword({
        email,
        password,
      });
      assertEquals(signInErr, null, `signIn failed: ${signInErr?.message}`);
      const accessToken = session.session!.access_token;

      // 3. Simulate a successful Stripe checkout by inserting a paid order.
      //    `stripe_session_id` is left null because we skip the Stripe roundtrip;
      //    generate-product only requires the order row + service-role auth.
      const { data: order, error: orderErr } = await admin
        .from("orders")
        .insert({
          user_id: userId,
          product_id: "home-management-binder",
          form_data: {
            email,
            household_size: "2",
            top_priorities: ["cleaning", "meal-planning"],
            budgeting_style: "monthly",
          },
          status: "paid",
          test_mode: false,
        })
        .select()
        .single();
      assertEquals(orderErr, null, `order insert failed: ${orderErr?.message}`);
      orderId = order!.id;

      // 4. Invoke generate-product with service-role auth (matches verify-payment behavior).
      const genResp = await fetch(`${SUPABASE_URL}/functions/v1/generate-product`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({ orderId }),
      });
      const genBody = await genResp.text();
      assert(genResp.ok, `generate-product failed (${genResp.status}): ${genBody}`);

      // 5. Poll until the order is marked completed.
      let completed: { status: string; generated_file_url: string | null } | null = null;
      for (let i = 0; i < 30; i++) {
        const { data } = await admin
          .from("orders")
          .select("status, generated_file_url")
          .eq("id", orderId)
          .single();
        if (data?.status === "completed" && data.generated_file_url) {
          completed = data;
          break;
        }
        if (data?.status === "failed") {
          throw new Error("Order generation failed");
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      assert(completed, "Order did not reach completed status within 30s");

      // 6. Buyer fetches the signed download URL via the download center endpoint.
      const dlResp = await fetch(`${SUPABASE_URL}/functions/v1/get-download-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({ orderId }),
      });
      const dlBody = await dlResp.json();
      assert(dlResp.ok, `get-download-url failed: ${JSON.stringify(dlBody)}`);
      assert(typeof dlBody.fileUrl === "string", "missing fileUrl");

      // 7. Confirm the URL serves a real PDF.
      const fileResp = await fetch(dlBody.fileUrl);
      assert(fileResp.ok, `signed URL returned ${fileResp.status}`);
      const bytes = new Uint8Array(await fileResp.arrayBuffer());
      const head = new TextDecoder().decode(bytes.slice(0, 5));
      assertEquals(head, "%PDF-", "downloaded file is not a PDF");
      assert(bytes.length > 1000, `PDF suspiciously small: ${bytes.length} bytes`);

      // 8. Confirm an email was logged to the buyer.
      const { data: emailRows, error: logErr } = await admin
        .from("email_send_log")
        .select("recipient_email, status, template_name, created_at")
        .eq("recipient_email", email)
        .order("created_at", { ascending: false })
        .limit(5);
      assertEquals(logErr, null, `email_send_log query failed: ${logErr?.message}`);
      assert(
        (emailRows ?? []).length > 0,
        `No email_send_log row found for ${email}`,
      );
      const latest = emailRows![0];
      assert(
        ["sent", "pending"].includes(latest.status),
        `unexpected email status: ${latest.status}`,
      );
    } finally {
      // 9. Best-effort cleanup so reruns don't accumulate test data.
      if (orderId) {
        const { data: o } = await admin
          .from("orders")
          .select("generated_file_url")
          .eq("id", orderId)
          .maybeSingle();
        if (o?.generated_file_url) {
          await admin.storage.from("generated-products").remove([o.generated_file_url]);
        }
        // orders denies DELETE via RLS; leave the row for audit.
      }
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
  },
});
