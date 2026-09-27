import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Startup guard: fail fast if any unsupported `npm:` specifiers slip back in.
try {
  const src = await Deno.readTextFile(new URL(import.meta.url));
  const bad = src.match(/["']npm:[^"']+["']/g);
  if (bad) {
    console.error(
      `[create-checkout] Unsupported npm: import specifiers detected: ${bad.join(", ")}. ` +
        `Replace with "https://esm.sh/<package>@<version>".`,
    );
    Deno.exit(1);
  }
} catch (e) {
  console.warn("[create-checkout] Dependency check skipped:", (e as Error).message);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Pre-created Stripe Price IDs (LIVE mode). Keep in sync with
// src/config/stripePrices.ts. Using real Price IDs (instead of inline
// price_data) means each charge is linked to a Product/Price in the
// Stripe Dashboard.
const STRIPE_PRICE_IDS: Record<string, string> = {
  "daily-planner": "price_1TjXnjCn19AGQAKowiC1uv71",
  "fitness-planner": "price_1TjXnkCn19AGQAKoP3zQiowF",
  "budget-planner": "price_1TjXnlCn19AGQAKo9CeLOgw0",
  "adhd-planner": "price_1TjXnmCn19AGQAKo1eD2DSwl",
  "pet-planner": "price_1TjXnnCn19AGQAKokYMHeiJn",
  "pet-care-guide": "price_1TjXnnCn19AGQAKo1It3fyUE",
  "children-storybook": "price_1TjXnpCn19AGQAKom68XIqtc",
  "affirmation-cards": "price_1TjXnpCn19AGQAKopOxKa7mf",
  "printable-templates": "price_1TjXnqCn19AGQAKo1hKYuqw2",
  "meal-planner": "price_1TjXnrCn19AGQAKoBamDzvOL",
  "daily-journal": "price_1TjXnsCn19AGQAKosqWxdqmq",
  "self-care-checklist": "price_1TjXntCn19AGQAKo6m7GSjsS",
  "chore-chart": "price_1TjXnuCn19AGQAKoxQOV6Yog",
  "goal-tracker": "price_1TjXnvCn19AGQAKoztetqp4o",
  "weekly-reflection": "price_1TjXnvCn19AGQAKorg6ePeOj",
  "habit-builder": "price_1TjXnwCn19AGQAKoA3gYT9UT",
  "mindfulness-journal": "price_1TjXnxCn19AGQAKoznlLswWS",
  "study-planner": "price_1TjXnyCn19AGQAKo9iYHxacA",
  "meal-prep-guide": "price_1TjXnzCn19AGQAKo663QMIOF",
  "sleep-tracker": "price_1TjXo0Cn19AGQAKoCgsBfRmA",
  "gratitude-journal": "price_1TjXo1Cn19AGQAKoiZ1TSxbp",
  "project-planner": "price_1TjXo1Cn19AGQAKoPCKODmKo",
  "event-planner": "price_1TjXo2Cn19AGQAKosqrUARdT",
  "travel-planner": "price_1TjXo3Cn19AGQAKooxUjCB0c",
  "budget-binder": "price_1TjXo4Cn19AGQAKobTH0cHEF",
  "home-management-binder": "price_1TjXo5Cn19AGQAKosXOGQtsa",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { productId, productName, price, formData, liveMode } = await req.json();

    if (!productId || !productName || !price || !formData) {
      throw new Error("Missing required fields: productId, productName, price, formData");
    }

    // Pick Stripe key based on live-mode toggle from src/config/stripe.ts.
    // Falls back to the test key if STRIPE_SECRET_KEY_LIVE isn't configured.
    const liveKey = Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    const testKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripeKey = liveMode && liveKey ? liveKey : testKey;
    const usingLive = Boolean(liveMode && liveKey);
    console.log(`[create-checkout] Using ${usingLive ? "LIVE" : "TEST"} Stripe key`);

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Create order in database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        product_id: productId,
        form_data: formData,
        status: "pending",
        test_mode: !usingLive,
      })
      .select()
      .single();

    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

    // Initialize Stripe with the selected key
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Look up the pre-created Stripe Price ID for this product.
    const priceId = STRIPE_PRICE_IDS[productId];
    if (!priceId) {
      throw new Error(`No Stripe price configured for product '${productId}'`);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/success?order_id=${order.id}`,
      cancel_url: `${origin}/payment-canceled?order_id=${order.id}&email=${encodeURIComponent(user.email)}`,
      metadata: {
        order_id: order.id,
        product_id: productId,
        user_email: user.email,
      },
    });

    // Update order with stripe session id
    await supabaseAdmin
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("create-checkout error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
