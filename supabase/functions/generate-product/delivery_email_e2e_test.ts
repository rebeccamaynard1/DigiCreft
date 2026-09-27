// End-to-end test: after generate-product runs, the outgoing delivery email
// must contain a download link that (1) points at THIS order's stored PDF,
// (2) is a valid signed URL that actually returns a PDF, and (3) matches
// the email_send_log delivery record for the same order + buyer.
//
// The test parses the rendered HTML persisted in email_send_log.metadata.html
// (captured by generate-product on the 'sent' row) — that HTML is byte-for-byte
// what Resend delivered to the buyer.
//
// Gated behind RUN_E2E=1 because it burns Lovable AI credits and (via
// generate-product) sends a real email through Resend.
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Optional: E2E_EMAIL_DOMAIN (default "e2e.becksdigitalpro.org").

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const RUN = Deno.env.get("RUN_E2E") === "1";
const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EMAIL_DOMAIN = Deno.env.get("E2E_EMAIL_DOMAIN") ?? "e2e.becksdigitalpro.org";

const skip = !RUN || !SUPABASE_URL || !SERVICE_ROLE;

// Pull the first <a href="..."> Download button target out of the email HTML.
function extractDownloadUrl(html: string): string | null {
  // The delivery template renders exactly one anchor (the CTA button).
  const match = html.match(/<a[^>]+href="([^"]+)"/i);
  return match ? match[1] : null;
}

Deno.test({
  name:
    "delivery email e2e: parsed email download URL matches the order's stored PDF and delivery log",
  ignore: skip,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const stamp = Date.now();
    const email = `delivery+${stamp}@${EMAIL_DOMAIN}`;
    const { data: created, error: userErr } = await admin.auth.admin.createUser({
      email,
      password: `Delivery!${crypto.randomUUID()}`,
      email_confirm: true,
    });
    assertEquals(userErr, null, `createUser failed: ${userErr?.message}`);
    const userId = created.user!.id;

    let orderId: string | null = null;
    try {
      // Seed a paid order — generate-product will render the PDF, upload it,
      // and send the delivery email.
      const { data: order, error: orderErr } = await admin
        .from("orders")
        .insert({
          user_id: userId,
          product_id: "daily-planner",
          form_data: { email, name: "Delivery Parse Test" },
          status: "paid",
          test_mode: false,
        })
        .select()
        .single();
      assertEquals(orderErr, null, `order insert failed: ${orderErr?.message}`);
      orderId = order!.id;

      // Kick off the pipeline exactly like the webhook does.
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

      // Poll for completion (up to 60s — includes AI + PDF render).
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
        if (data?.status === "failed") throw new Error("Order marked failed");
        await new Promise((r) => setTimeout(r, 1000));
      }
      assert(final, "order never reached completed status");
      const storagePath = final!.generated_file_url!;
      // Storage path must be scoped to this buyer + order — the download URL
      // in the email is derived from this path, so if it's wrong the email
      // would leak the wrong buyer's PDF.
      assertEquals(
        storagePath,
        `${userId}/${orderId}.pdf`,
        `unexpected storage path for order: ${storagePath}`,
      );

      // Fetch the 'sent' delivery-email row for this buyer + this order.
      // We match on metadata->>orderId to be certain we're reading THIS
      // order's email and not a stray row from a previous run.
      const { data: sentRows, error: logErr } = await admin
        .from("email_send_log")
        .select("id, message_id, recipient_email, status, metadata, template_name")
        .eq("recipient_email", email)
        .eq("template_name", "product-delivery")
        .eq("status", "sent")
        .filter("metadata->>orderId", "eq", orderId)
        .order("created_at", { ascending: false })
        .limit(1);
      assertEquals(logErr, null, `email_send_log query failed: ${logErr?.message}`);
      assert(
        (sentRows ?? []).length === 1,
        `expected exactly 1 sent delivery row for order ${orderId}, got ${sentRows?.length ?? 0}`,
      );
      const sent = sentRows![0];
      const meta = (sent.metadata ?? {}) as Record<string, unknown>;

      // The persisted HTML is the exact body that Resend delivered.
      const html = typeof meta.html === "string" ? meta.html : "";
      assert(html.length > 0, "delivery email row is missing rendered html");
      assert(
        html.includes("Download your product"),
        "delivery email HTML is missing the CTA copy — template drift?",
      );

      // Parse the CTA link out of the HTML and cross-check it against the
      // downloadUrl the server recorded. They must be identical — otherwise
      // the buyer's link and the audit trail disagree.
      const parsedUrl = extractDownloadUrl(html);
      assert(parsedUrl, "could not extract download URL from delivery email HTML");
      assertEquals(
        parsedUrl,
        meta.downloadUrl,
        "email <a href> does not match the recorded downloadUrl in email_send_log",
      );

      // The URL must be a Supabase-signed storage URL for THIS order's PDF.
      const u = new URL(parsedUrl!);
      assert(
        u.pathname.includes(`/generated-products/${storagePath}`),
        `download URL path does not point at this order's PDF. path=${u.pathname} expected suffix=/generated-products/${storagePath}`,
      );
      assert(
        u.searchParams.get("token"),
        "download URL is missing signed 'token' query param",
      );

      // Fetch it — the parsed link must actually serve the PDF for this order.
      const fileResp = await fetch(parsedUrl!);
      assert(
        fileResp.ok,
        `parsed download URL did not serve the file (status=${fileResp.status})`,
      );
      const bytes = new Uint8Array(await fileResp.arrayBuffer());
      const head = new TextDecoder().decode(bytes.slice(0, 5));
      assertEquals(head, "%PDF-", "delivery URL did not return a PDF");
      assert(bytes.length > 1000, `PDF suspiciously small: ${bytes.length} bytes`);

      // Sanity: the 'sent' row is paired with a 'pending' row via message_id.
      // Any dashboard/monitoring dedup logic keys on message_id, so make sure
      // both rows for this delivery share one.
      const { data: pairRows } = await admin
        .from("email_send_log")
        .select("status")
        .eq("message_id", sent.message_id!);
      const statuses = (pairRows ?? []).map((r) => r.status).sort();
      assertEquals(
        statuses,
        ["pending", "sent"],
        `expected pending+sent pair for message_id, got ${JSON.stringify(statuses)}`,
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
