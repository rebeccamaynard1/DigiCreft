import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { BlobWriter, ZipWriter } from "https://deno.land/x/zipjs@v2.7.45/index.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function safeName(s: string) {
  return s.replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 60) || "product";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from("orders")
      .select("id, product_id, generated_file_url, created_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .not("generated_file_url", "is", null);

    if (ordersErr) throw new Error(ordersErr.message);
    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ error: "No completed orders to download" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build zip
    const zipBlobWriter = new BlobWriter("application/zip");
    const zipWriter = new ZipWriter(zipBlobWriter);

    let added = 0;
    const skipped: string[] = [];
    for (const order of orders) {
      const path = order.generated_file_url as string;
      const { data: file, error: dlErr } = await supabaseAdmin.storage
        .from("generated-products")
        .download(path);
      if (dlErr || !file) {
        skipped.push(order.id);
        continue;
      }
      const buf = new Uint8Array(await file.arrayBuffer());
      const name = `${safeName(order.product_id)}-${order.id.slice(0, 8)}.pdf`;
      const { BlobReader } = await import("https://deno.land/x/zipjs@v2.7.45/index.js");
      await zipWriter.add(name, new BlobReader(new Blob([buf], { type: "application/pdf" })));
      added++;
    }
    await zipWriter.close();
    const zipBlob = await zipBlobWriter.getData();

    if (added === 0) {
      return new Response(JSON.stringify({ error: "Could not read any files" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const zipPath = `${userId}/_bundles/all-${Date.now()}.zip`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("generated-products")
      .upload(zipPath, zipBlob, { contentType: "application/zip", upsert: true });
    if (upErr) throw new Error(`Zip upload failed: ${upErr.message}`);

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("generated-products")
      .createSignedUrl(zipPath, 60 * 10); // 10 min
    if (signErr || !signed) throw new Error(signErr?.message ?? "Failed to sign zip URL");

    return new Response(
      JSON.stringify({ fileUrl: signed.signedUrl, count: added, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("download-all error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
