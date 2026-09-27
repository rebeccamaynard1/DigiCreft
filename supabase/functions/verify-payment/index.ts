import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Startup guard: fail fast if any unsupported `npm:` specifiers slip back in.
try {
  const src = await Deno.readTextFile(new URL(import.meta.url));
  const bad = src.match(/["']npm:[^"']+["']/g);
  if (bad) {
    console.error(
      `[verify-payment] Unsupported npm: import specifiers detected: ${bad.join(", ")}. ` +
        `Replace with "https://esm.sh/<package>@<version>".`,
    );
    Deno.exit(1);
  }
} catch (e) {
  console.warn("[verify-payment] Dependency check skipped:", (e as Error).message);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) throw new Error("Missing orderId");

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user?.email) throw new Error("User not authenticated");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) throw new Error("Order not found");
    if (!order.stripe_session_id) throw new Error("No Stripe session for this order");

    // Ensure the caller owns this order
    if (order.user_id !== user.id) {
      console.warn(`[verify-payment] User ${user.id} attempted to verify order owned by ${order.user_id}`);
      throw new Error("Order does not belong to authenticated user");
    }

    // Already processed — re-sign the stored path so the buyer gets a fresh URL
    if (order.status !== "pending") {
      let fileUrl: string | null = null;
      if (order.generated_file_url) {
        const { data: signed } = await supabaseAdmin.storage
          .from("generated-products")
          .createSignedUrl(order.generated_file_url, 60 * 60);
        fileUrl = signed?.signedUrl ?? null;
      }
      return new Response(JSON.stringify({
        status: order.status,
        fileUrl,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side delivery is gated on the Stripe webhook. We never call
    // Stripe or trigger generation from this endpoint — that would let the
    // client kick off a paid action without Stripe confirming the charge.
    // The success page polls until the webhook flips status to
    // generating/completed.
    if (order.status === "pending") {
      return new Response(JSON.stringify({ status: "pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Any other status (paid/generating/completed/failed) — return current
    // state. generating is what the success page polls on.
    let fileUrl: string | null = null;
    if (order.status === "completed" && order.generated_file_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from("generated-products")
        .createSignedUrl(order.generated_file_url, 60 * 60);
      fileUrl = signed?.signedUrl ?? null;
    }

    return new Response(
      JSON.stringify({
        status: order.status === "paid" ? "generating" : order.status,
        fileUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("verify-payment error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
