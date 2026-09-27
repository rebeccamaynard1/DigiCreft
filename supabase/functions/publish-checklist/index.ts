import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CheckStatus = "pass" | "warn" | "fail";
interface CheckResult {
  id: string;
  name: string;
  status: CheckStatus;
  message: string;
  details?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const results: CheckResult[] = [];
  const push = (r: CheckResult) => results.push(r);

  // --- Auth: only signed-in users can run the checklist ---
  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(token);
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // --- 1. Stripe secret key configured & valid ---
  try {
    const key = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!key) {
      push({
        id: "stripe-key",
        name: "Stripe secret key configured",
        status: "fail",
        message: "STRIPE_SECRET_KEY is missing",
      });
    } else {
      const mode = key.startsWith("sk_live_")
        ? "LIVE"
        : key.startsWith("sk_test_")
        ? "TEST"
        : key.startsWith("rk_live_")
        ? "LIVE (restricted)"
        : key.startsWith("rk_test_")
        ? "TEST (restricted)"
        : "UNKNOWN";

      const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });
      // Light call to validate the key
      await stripe.balance.retrieve();
      push({
        id: "stripe-key",
        name: "Stripe secret key valid",
        status: mode.startsWith("LIVE") ? "pass" : "warn",
        message: `Key authenticated — mode: ${mode}`,
        details: mode.startsWith("LIVE")
          ? "Real charges will be processed."
          : "Test key detected — no real money will move. Switch to a live key before going public.",
      });
    }
  } catch (e) {
    push({
      id: "stripe-key",
      name: "Stripe secret key valid",
      status: "fail",
      message: "Stripe rejected the configured key",
      details: (e as Error).message,
    });
  }

  // --- 2. Lovable AI gateway key (used for product generation) ---
  const aiKey = Deno.env.get("LOVABLE_API_KEY");
  push({
    id: "ai-key",
    name: "AI generation key configured",
    status: aiKey ? "pass" : "fail",
    message: aiKey
      ? "LOVABLE_API_KEY is present — product generation can run."
      : "LOVABLE_API_KEY missing — products cannot be generated after payment.",
  });

  // --- 3. Storage bucket for generated products ---
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    if (error) throw error;
    const bucket = buckets?.find((b) => b.name === "generated-products");
    if (!bucket) {
      push({
        id: "storage",
        name: "Storage bucket present",
        status: "fail",
        message: "Bucket 'generated-products' is missing — generated PDFs cannot be saved.",
      });
    } else {
      push({
        id: "storage",
        name: "Storage bucket present",
        status: "pass",
        message: `Bucket 'generated-products' exists (${bucket.public ? "public" : "private"}).`,
      });
    }
  } catch (e) {
    push({
      id: "storage",
      name: "Storage bucket present",
      status: "fail",
      message: "Could not list storage buckets",
      details: (e as Error).message,
    });
  }

  // --- 4. Orders table reachable & schema sanity ---
  try {
    const { error } = await supabaseAdmin
      .from("orders")
      .select("id, status, generated_file_url, stripe_session_id", { count: "exact", head: true });
    if (error) throw error;
    push({
      id: "db-orders",
      name: "Orders table reachable",
      status: "pass",
      message: "Backend can read orders.",
    });
  } catch (e) {
    push({
      id: "db-orders",
      name: "Orders table reachable",
      status: "fail",
      message: "Backend cannot query orders table",
      details: (e as Error).message,
    });
  }

  // --- 5. Recent fulfillment health (last 30 days) ---
  try {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("status, created_at, generated_file_url")
      .gte("created_at", since);
    const total = orders?.length ?? 0;
    const completed = orders?.filter((o) => o.status === "completed" && o.generated_file_url).length ?? 0;
    const failed = orders?.filter((o) => o.status === "failed").length ?? 0;
    const stuckPaid = orders?.filter((o) => o.status === "paid" && !o.generated_file_url).length ?? 0;

    let status: CheckStatus = "pass";
    let msg = `${total} orders in last 30 days · ${completed} completed`;
    if (total === 0) {
      status = "warn";
      msg = "No orders yet — checklist cannot validate end-to-end fulfillment from history. Run a real test purchase.";
    } else if (failed > 0 || stuckPaid > 0) {
      status = "warn";
      msg = `${total} orders · ${failed} failed · ${stuckPaid} paid-but-not-fulfilled`;
    }
    push({
      id: "fulfillment",
      name: "Recent order fulfillment",
      status,
      message: msg,
    });
  } catch (e) {
    push({
      id: "fulfillment",
      name: "Recent order fulfillment",
      status: "fail",
      message: "Could not read order history",
      details: (e as Error).message,
    });
  }

  // --- 6. Email infrastructure: required tables present ---
  try {
    const { error } = await supabaseAdmin
      .from("email_send_log")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    push({
      id: "email-infra",
      name: "Email infrastructure ready",
      status: "pass",
      message: "Email send log is reachable — delivery emails can be queued.",
    });
  } catch (e) {
    push({
      id: "email-infra",
      name: "Email infrastructure ready",
      status: "fail",
      message: "Email send log unreachable — delivery emails will fail.",
      details: (e as Error).message,
    });
  }

  // --- 7. Recent email delivery health (last 30 days, deduped by message_id) ---
  try {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: logs } = await supabaseAdmin
      .from("email_send_log")
      .select("message_id, status, created_at, template_name")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    // Dedupe — keep latest status per message_id
    const latest = new Map<string, string>();
    for (const row of logs ?? []) {
      if (row.message_id && !latest.has(row.message_id)) {
        latest.set(row.message_id, row.status);
      }
    }
    const total = latest.size;
    const sent = [...latest.values()].filter((s) => s === "sent").length;
    const failed = [...latest.values()].filter((s) => s === "dlq" || s === "failed" || s === "bounced").length;

    let status: CheckStatus = "pass";
    let msg = `${total} unique emails in last 30 days · ${sent} delivered · ${failed} failed`;
    if (total === 0) {
      status = "warn";
      msg = "No emails sent in 30 days — verify domain status in Cloud → Emails before launch.";
    } else if (failed / Math.max(total, 1) > 0.1) {
      status = "warn";
      msg = `High failure rate: ${failed}/${total} emails failed in last 30 days.`;
    }
    push({
      id: "email-health",
      name: "Recent email delivery",
      status,
      message: msg,
    });
  } catch (e) {
    push({
      id: "email-health",
      name: "Recent email delivery",
      status: "warn",
      message: "Could not read email send log",
      details: (e as Error).message,
    });
  }

  // --- Summary ---
  const summary = {
    pass: results.filter((r) => r.status === "pass").length,
    warn: results.filter((r) => r.status === "warn").length,
    fail: results.filter((r) => r.status === "fail").length,
  };
  const overall: CheckStatus =
    summary.fail > 0 ? "fail" : summary.warn > 0 ? "warn" : "pass";

  return new Response(
    JSON.stringify({ overall, summary, results, ranAt: new Date().toISOString() }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );
});
