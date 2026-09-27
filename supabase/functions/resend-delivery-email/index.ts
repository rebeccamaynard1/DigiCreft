import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_URL = "https://api.resend.com/emails";
const SITE_NAME = "DigiCraft";
const PRIMARY_FROM = "DigiCraft <orders@becksdigitalpro.org>";
const FALLBACK_FROM = "DigiCraft <onboarding@resend.dev>";

function productLabel(productId: string) {
  return productId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildEmailHtml(productName: string, downloadUrl: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#ffffff;font-family:'Plus Jakarta Sans',Inter,Arial,sans-serif;color:#1f2937;">
    <div style="max-width:560px;margin:0 auto;padding:32px 28px;">
      <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;color:#111827;">Your ${productName} is ready 🎉</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#4b5563;">Thanks for your purchase. Your custom digital product has been generated as a PDF and is ready to download.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${downloadUrl}" style="display:inline-block;background:#7C3AED;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:16px;font-weight:700;font-size:15px;">Download your product</a>
      </div>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#4b5563;">This secure download link stays active for 7 days. If it expires, you can return to your order page to get a fresh link.</p>
      <p style="margin:32px 0 0;font-size:13px;color:#9ca3af;">— The ${SITE_NAME} team</p>
    </div>
  </body>
</html>`;
}

async function sendWithResend(params: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");

  const attempt = async (from: string) => {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
        "Idempotency-Key": params.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    return { response, data, text, from };
  };

  const primary = await attempt(PRIMARY_FROM);
  if (primary.response.ok) return primary;

  const errorText = primary.text.toLowerCase();
  if (errorText.includes("domain") || errorText.includes("from")) {
    const fallback = await attempt(FALLBACK_FROM);
    if (fallback.response.ok) return fallback;
    throw new Error(`Resend failed (${fallback.response.status}): ${fallback.text || JSON.stringify(fallback.data)}`);
  }

  throw new Error(`Resend failed (${primary.response.status}): ${primary.text || JSON.stringify(primary.data)}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAuthed = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAuthed.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body?.orderId === "string" ? body.orderId : null;
    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { persistSession: false } }
    );

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status !== "completed" || !order.generated_file_url) {
      return new Response(
        JSON.stringify({ error: "Order is not ready for delivery yet" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If the stored file is not a PDF (legacy .md or anything else), regenerate
    // as a proper PDF before sending the email so the recipient always gets the
    // latest, properly-formatted version.
    if (!order.generated_file_url.toLowerCase().endsWith(".pdf")) {
      const anonKeyForRegen = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      const regenResponse = await fetch(`${supabaseUrl}/functions/v1/generate-product`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          apikey: anonKeyForRegen,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      if (!regenResponse.ok) {
        const errText = await regenResponse.text();
        throw new Error(`PDF regeneration failed (${regenResponse.status}): ${errText}`);
      }

      // Re-fetch the order to pick up the new generated_file_url
      const { data: refreshed } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (refreshed) {
        order.generated_file_url = refreshed.generated_file_url;
        order.status = refreshed.status;
      }
    }

    const recipientEmail = user.email;
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "No email on file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Long-lived URL for email (7 days)
    const { data: emailSigned, error: signErr } = await supabaseAdmin.storage
      .from("generated-products")
      .createSignedUrl(order.generated_file_url, 60 * 60 * 24 * 7);

    if (signErr) throw new Error(`Signed URL failed: ${signErr.message}`);

    // Short-lived URL for the on-page download button (1 hour)
    const { data: pageSigned } = await supabaseAdmin.storage
      .from("generated-products")
      .createSignedUrl(order.generated_file_url, 60 * 60);

    const downloadUrl = emailSigned?.signedUrl ?? pageSigned?.signedUrl;
    if (!downloadUrl) throw new Error("Download URL could not be created");

    const productName = productLabel(order.product_id);
    const messageId = crypto.randomUUID();
    const idempotencyKey = `product-delivery-${orderId}-resend-${Date.now()}`;

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "product-delivery",
      recipient_email: recipientEmail,
      status: "pending",
      metadata: { orderId, provider: "resend" },
    });

    let resendResult: Awaited<ReturnType<typeof sendWithResend>>;
    try {
      resendResult = await sendWithResend({
        to: recipientEmail,
        subject: `Your ${productName} is ready to download`,
        html: buildEmailHtml(productName, downloadUrl),
        idempotencyKey,
      });
    } catch (sendError) {
      await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId,
        template_name: "product-delivery",
        recipient_email: recipientEmail,
        status: "failed",
        error_message: (sendError as Error).message,
        metadata: { orderId, provider: "resend" },
      });
      throw sendError;
    }

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "product-delivery",
      recipient_email: recipientEmail,
      status: "sent",
      metadata: {
        orderId,
        provider: "resend",
        from: resendResult.from,
        response: resendResult.data,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        recipientEmail,
        fileUrl: pageSigned?.signedUrl ?? null,
        messageId,
        status: "sent",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("resend-delivery-email error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
