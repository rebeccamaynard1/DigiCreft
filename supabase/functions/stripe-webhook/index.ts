import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Stripe webhook receiver — authoritative source for marking an order paid
// and kicking off product generation. The success page only polls order
// status, so the buyer cannot receive the PDF unless this webhook runs
// and Stripe has confirmed the charge.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("[stripe-webhook] Missing stripe-signature header");
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();

  // Try LIVE secret first, fall back to TEST. This lets one endpoint receive
  // events from both modes without per-event routing.
  const liveSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE");
  const testSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const liveKey = Deno.env.get("STRIPE_SECRET_KEY_LIVE");
  const testKey = Deno.env.get("STRIPE_SECRET_KEY") || "";

  if (!liveSecret && !testSecret) {
    console.error("[stripe-webhook] No STRIPE_WEBHOOK_SECRET configured");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event | null = null;
  let usedLive = false;
  const stripeLive = new Stripe(liveKey || testKey, { apiVersion: "2025-08-27.basil" });
  const stripeTest = new Stripe(testKey, { apiVersion: "2025-08-27.basil" });

  // constructEventAsync is required in Deno (uses Web Crypto)
  for (const attempt of [
    { secret: liveSecret, stripe: stripeLive, live: true },
    { secret: testSecret, stripe: stripeTest, live: false },
  ]) {
    if (!attempt.secret) continue;
    try {
      event = await attempt.stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        attempt.secret,
      );
      usedLive = attempt.live;
      break;
    } catch (_err) {
      // try next secret
    }
  }

  if (!event) {
    console.error("[stripe-webhook] Signature verification failed for all secrets");
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[stripe-webhook] Verified ${event.type} (${usedLive ? "LIVE" : "TEST"})`);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;

      if (!orderId) {
        console.warn(`[stripe-webhook] ${event.type} missing order_id metadata`);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (session.payment_status !== "paid") {
        console.log(`[stripe-webhook] Session ${session.id} not paid yet (${session.payment_status})`);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Idempotency: only transition pending -> paid. Anything else is a replay.
      const { data: order, error: orderErr } = await supabaseAdmin
        .from("orders")
        .select("id, status, stripe_session_id")
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr || !order) {
        console.error(`[stripe-webhook] Order ${orderId} not found`, orderErr);
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (order.status !== "pending") {
        console.log(`[stripe-webhook] Order ${orderId} already ${order.status}, skipping`);
        return new Response(JSON.stringify({ received: true, idempotent: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateErr } = await supabaseAdmin
        .from("orders")
        .update({ status: "paid", stripe_session_id: session.id })
        .eq("id", orderId)
        .eq("status", "pending"); // guard against race

      if (updateErr) {
        console.error(`[stripe-webhook] Failed to mark order paid:`, updateErr);
        throw updateErr;
      }

      // Fire-and-forget: invoke generate-product. Success page polls order
      // status, so even if this call fails the next webhook retry or a
      // manual retry can recover.
      const genResp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-product`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ orderId }),
        },
      );
      console.log(`[stripe-webhook] generate-product invoked: ${genResp.status}`);
    } else {
      console.log(`[stripe-webhook] Ignoring event ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[stripe-webhook] Handler error:", err);
    // Return 500 so Stripe retries
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
