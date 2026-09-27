import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Startup guard: fail fast if any unsupported `npm:` specifiers slip back in.
// Deno in this environment cannot resolve bare `npm:` imports — use https://esm.sh/ instead.
try {
  const src = await Deno.readTextFile(new URL(import.meta.url));
  const bad = src.match(/["']npm:[^"']+["']/g);
  if (bad) {
    console.error(
      `[generate-product] Unsupported npm: import specifiers detected: ${bad.join(", ")}. ` +
        `Replace with "https://esm.sh/<package>@<version>".`,
    );
    Deno.exit(1);
  }
} catch (e) {
  console.warn("[generate-product] Dependency check skipped:", (e as Error).message);
}

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
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:'Plus Jakarta Sans',Inter,Arial,sans-serif;color:#1f2937;"><div style="max-width:560px;margin:0 auto;padding:32px 28px;"><h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;color:#111827;">Your ${productName} is ready 🎉</h1><p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#4b5563;">Thanks for your purchase. Your custom digital product has been generated as a PDF and is ready to download.</p><div style="text-align:center;margin:32px 0;"><a href="${downloadUrl}" style="display:inline-block;background:#7C3AED;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:16px;font-weight:700;font-size:15px;">Download your product</a></div><p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#4b5563;">This secure download link stays active for 7 days. If it expires, you can return to your order page to get a fresh link.</p><p style="margin:32px 0 0;font-size:13px;color:#9ca3af;">— The ${SITE_NAME} team</p></div></body></html>`;
}

async function sendWithResend(params: { to: string; subject: string; html: string; idempotencyKey: string }) {
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
      body: JSON.stringify({ from, to: [params.to], subject: params.subject, html: params.html }),
    });
    const text = await response.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
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

function buildPrompt(productId: string, formData: Record<string, string>): string {
  const formSummary = Object.entries(formData)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  const prompts: Record<string, string> = {
    "daily-planner": `Create a comprehensive daily planner content. Include: morning routine section, time-blocked schedule (hourly from wake time), top 3 priorities section, habit tracker checkboxes, gratitude section, evening reflection, and motivational quote. Make it personalized based on:\n${formSummary}`,
    "fitness-planner": `Create a comprehensive fitness planner content. Include: weekly workout schedule, exercise descriptions with sets/reps, meal plan template, progress tracking metrics, body measurements log, water intake tracker, and motivational tips. Personalize based on:\n${formSummary}`,
    "budget-planner": `Create a comprehensive budget planner content. Include: monthly income/expense overview, custom spending categories with budget amounts, savings goal tracker, daily expense log template, bill payment calendar, financial goals section, and money-saving tips. Personalize based on:\n${formSummary}`,
    "adhd-planner": `Create an ADHD-friendly planner content. Include: visual time-blocking with color codes, brain dump page, priority matrix (urgent/important), dopamine menu of rewarding activities, task breakdown section (big tasks into tiny steps), sensory break reminders, and positive affirmations. Use the visual style preference. Personalize based on:\n${formSummary}`,
    "pet-planner": `Create a pet care planner content. Include: daily feeding schedule, exercise/walk log, grooming schedule, vet appointment tracker, medication reminders, weight tracking, vaccination record, and pet milestone journal. Personalize based on:\n${formSummary}`,
    "pet-care-guide": `Create a comprehensive pet care guide. Include: breed-specific care tips, nutrition guide with recommended foods, exercise requirements, common health issues and prevention, grooming guide, training basics, socialization tips, and emergency contact template. Personalize based on:\n${formSummary}`,
    "children-storybook": `Write a children's storybook (8-10 pages). The child is the main character. Include: an engaging opening, rising action with challenges, a climax, resolution with the moral/lesson, and a happy ending. Use age-appropriate language and vivid descriptions. Personalize based on:\n${formSummary}`,
    "affirmation-cards": `Create 30 unique affirmation cards. Each card should have: a powerful affirmation statement (1-2 sentences), a brief reflection prompt or action step. Match the tone and focus area specified. Personalize based on:\n${formSummary}`,
    "printable-templates": `Create content for a printable template. Include: a title section, organized layout sections appropriate for the template type, decorative elements descriptions, and helpful tips or prompts within the template. Personalize based on:\n${formSummary}`,
    "meal-planner": `Create a comprehensive weekly meal planner. Include: 7-day breakfast/lunch/dinner/snack schedule, recipes for each meal (with ingredients and brief instructions), a consolidated grocery list organized by category, nutritional tips, and meal prep suggestions. Respect all dietary preferences and allergies strictly. Personalize based on:\n${formSummary}`,
    "daily-journal": `Create a 30-day guided daily journal. Each day should include: a unique journaling prompt matching the preferred tone, a reflection question, a gratitude exercise, and a mood check-in. Include an introduction page with tips on journaling. Match the tone and focus areas specified. Personalize based on:\n${formSummary}`,
    "self-care-checklist": `Create a comprehensive personalized self-care checklist. Include: a daily self-care morning and evening routine, weekly reset rituals, stress-relief activities matched to the preferred style, mood booster ideas, quick 5-minute self-care breaks, and a monthly self-care planning page. Tailor everything to the person's stress level, daily routine, and preferred self-care style. Personalize based on:\n${formSummary}`,
    "chore-chart": `Create a fun, personalized chore chart for a child. Include: age-appropriate daily and weekly chores, a reward tracking system matching the chosen reward style, a weekly progress tracker, motivational messages, and tips for parents. Make it engaging and fun for the child's age. Personalize based on:\n${formSummary}`,
    "goal-tracker": `Create a comprehensive goal tracker. Include: a breakdown of each of the user's top 3 goals into actionable milestones, a timeline aligned to their chosen timeframe, weekly check-in templates, progress tracking sections matching their motivation style (visual/written/checklist), obstacle planning, accountability prompts, and celebration milestones. Personalize based on:\n${formSummary}`,
    "weekly-reflection": `Create a 12-week guided reflection workbook. Each week should include: a review of focus areas, a wins & gratitude section, a challenge processing exercise, lessons learned prompts, an intention-setting page for the next week, and a mood/energy check-in. Include an intro page with tips on reflective practice. Tailor the tone and prompts to the user's focus areas and challenges. Personalize based on:\n${formSummary}`,
    "habit-builder": `Create a comprehensive habit-building guide. Include: a personalized plan for each habit the user wants to build, a 30-day daily tracking sheet with checkboxes, streak motivation tips, difficulty-appropriate progression steps, accountability strategies matching the user's preferred style, science-backed habit formation tips, obstacle planning, and celebration milestones. Personalize based on:\n${formSummary}`,
    "mindfulness-journal": `Create a 30-day guided mindfulness journal. Each day should include: a mindfulness exercise matched to the user's preferred style (breathing, grounding, or gratitude), a calming reflection prompt, a stress-relief micro-activity, and a daily intention. Include an introductory page with tips on starting a mindfulness practice. Tailor the intensity and techniques to the user's stress level. Personalize based on:\n${formSummary}`,
    "study-planner": `Create a comprehensive study planner. Include: a weekly study schedule organized by subject, study session templates with time-blocking, goal-setting pages for each subject, learning strategy tips tailored to the user's preferred learning style (visual/auditory/hands-on), exam preparation checklists, a progress tracker, focus and concentration tips, and a review/revision schedule. Personalize based on:\n${formSummary}`,
    "meal-prep-guide": `Create a comprehensive weekly meal prep guide. Include: a batch-cooking plan for the week with prep-day instructions, recipes matched to the user's cooking skill level, a day-by-day meal schedule aligned with their weekly routine, a consolidated grocery list organized by category, food storage and reheating tips, time-saving kitchen hacks, and container/portion guidance. Respect the dietary style strictly. Personalize based on:\n${formSummary}`,
    "sleep-tracker": `Create a comprehensive sleep tracker and improvement guide. Include: a 30-day sleep quality log template, a personalized bedtime routine based on the user's current habits, wind-down activity suggestions, sleep hygiene tips addressing their specific challenges, a wake-up strategy plan aligned with their goals, a weekly sleep pattern review section, relaxation techniques, and environment optimization tips. Personalize based on:\n${formSummary}`,
    "gratitude-journal": `Create a 30-day guided gratitude journal. Each day should include: a gratitude exercise matched to the user's preferred reflection style (lists, prompts, or free-write), a positivity booster, and a brief mindfulness moment. Include a weekly gratitude review page and an introductory page with the benefits of gratitude practice. Focus the prompts on the user's chosen gratitude areas. Personalize based on:\n${formSummary}`,
    "project-planner": `Create a comprehensive project planner. Include: a project overview page, a timeline aligned to the deadline with key milestones broken into actionable tasks, a weekly task schedule, a progress tracker, a risk/obstacle planning section, a resource checklist, meeting/check-in templates, and a project completion checklist. Tailor the structure and terminology to the project type. Personalize based on:\n${formSummary}`,
    "event-planner": `Create a comprehensive event planner. Include: a countdown timeline leading to the event date, a categorized vendor/supplier checklist, a budget breakdown aligned to the budget range, a guest list organizer, a day-of schedule with hour-by-hour plan, a decoration & theme ideas section, an emergency contacts page, and post-event wrap-up checklist. Tailor everything to the event type and priorities. Personalize based on:\n${formSummary}`,
    "travel-planner": `Create a comprehensive travel planner. Include: a day-by-day itinerary with activities and recommendations for the destination, a packing checklist tailored to the climate and trip style, a budget breakdown aligned to the budget range, local food and culture tips, transportation guidance, an emergency contacts and important documents page, and a travel journal section. Tailor everything to the trip priorities. Personalize based on:\n${formSummary}`,
    "budget-binder": `Create a comprehensive budget binder. Include: a financial overview page with income allocation, detailed expense category pages matched to the income range, a savings goal tracker with milestones, a debt snowball/avalanche payoff plan, a cash envelope system guide, a bill payment calendar aligned to the budgeting style (weekly/bi-weekly/monthly), sinking funds tracker, net worth tracker, and money-saving challenge pages. Personalize based on:\n${formSummary}`,
    "home-management-binder": `Create a comprehensive home management binder. Include: a weekly and monthly cleaning schedule tailored to the household size, a meal planning and grocery list section, a household budget tracker, a home maintenance log with seasonal reminders, a family calendar/coordination page, an emergency contacts and important info page, and a home inventory checklist. Prioritize sections based on the user's top priorities. Personalize based on:\n${formSummary}`,
  };

  return prompts[productId] || `Create custom content for a ${productId} product based on:\n${formSummary}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) throw new Error("Missing orderId");

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

    // Hard guard: never generate a paid product for a test-mode order. Any
    // order created against the test Stripe key sets test_mode=true; delivery
    // must be gated on a real (live-mode) charge.
    if (order.test_mode === true) {
      console.warn(`[generate-product] Refusing to generate test-mode order ${orderId}`);
      await supabaseAdmin
        .from("orders")
        .update({
          status: "failed",
          error_message: "Refusing to generate: order is in test mode.",
        })
        .eq("id", orderId);
      return new Response(
        JSON.stringify({ error: "Refusing to generate: order is in test mode." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Idempotency guard: only 'paid' orders may be generated. Anything else
    // (completed / generating / failed / pending) is either a duplicate
    // webhook delivery, a concurrent worker, or a caller trying to bypass
    // the webhook flow. Return early WITHOUT re-running the AI/PDF/email
    // pipeline so duplicate Stripe events don't double-charge credits or
    // double-send the delivery email.
    if (order.status !== "paid") {
      console.log(
        `[generate-product] Skipping order ${orderId} — status is '${order.status}', not 'paid' (duplicate delivery or already handled)`,
      );
      let fileUrl: string | null = null;
      if (order.status === "completed" && order.generated_file_url) {
        const { data: signed } = await supabaseAdmin.storage
          .from("generated-products")
          .createSignedUrl(order.generated_file_url, 60 * 60);
        fileUrl = signed?.signedUrl ?? null;
      }
      return new Response(
        JSON.stringify({
          success: order.status === "completed",
          idempotent: true,
          status: order.status,
          fileUrl,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Atomic transition paid → generating. If another concurrent invocation
    // already claimed this order, the update matches 0 rows and we bail out
    // without touching AI or Resend.
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("orders")
      .update({ status: "generating" })
      .eq("id", orderId)
      .eq("status", "paid")
      .select("id");
    if (claimErr) throw new Error(`Failed to claim order: ${claimErr.message}`);
    if (!claimed || claimed.length === 0) {
      console.log(
        `[generate-product] Order ${orderId} was claimed by another worker; skipping`,
      );
      return new Response(
        JSON.stringify({ success: false, idempotent: true, status: "generating" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }



    // Generate content with AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = buildPrompt(order.product_id, order.form_data);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a professional digital product creator. Create well-structured, detailed, and engaging content. Format with clear headings, sections, and bullet points. Use markdown formatting. Make the content feel premium and personalized.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      if (aiResponse.status === 429) {
        throw new Error("Rate limited — please try again shortly");
      }
      if (aiResponse.status === 402) {
        throw new Error("AI credits exhausted — please add funds");
      }
      throw new Error(`AI generation failed: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content || "Content generation failed";

    // Render markdown -> PDF using jsPDF
    const { jsPDF } = await import("https://esm.sh/jspdf@2.5.1");
    const pdf = new jsPDF({ unit: "pt", format: "letter" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 54;
    const marginTop = 64;
    const marginBottom = 64;
    const maxWidth = pageWidth - marginX * 2;
    let y = marginTop;

    const ensureSpace = (lineHeight: number) => {
      if (y + lineHeight > pageHeight - marginBottom) {
        pdf.addPage();
        y = marginTop;
      }
    };

    const writeWrapped = (text: string, opts: { size: number; bold?: boolean; color?: [number, number, number]; gapAfter?: number }) => {
      pdf.setFont("helvetica", opts.bold ? "bold" : "normal");
      pdf.setFontSize(opts.size);
      pdf.setTextColor(...(opts.color ?? [30, 30, 30]));
      const lineHeight = opts.size * 1.35;
      const lines = pdf.splitTextToSize(text, maxWidth);
      for (const line of lines) {
        ensureSpace(lineHeight);
        pdf.text(line, marginX, y);
        y += lineHeight;
      }
      y += opts.gapAfter ?? 4;
    };

    // Strip inline markdown emphasis markers but keep the text
    const cleanInline = (s: string) =>
      s
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    const lines = generatedContent.replace(/\r\n/g, "\n").split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (!line.trim()) {
        y += 6;
        continue;
      }
      if (/^---+$/.test(line.trim())) {
        ensureSpace(20);
        pdf.setDrawColor(200);
        pdf.line(marginX, y, pageWidth - marginX, y);
        y += 14;
        continue;
      }
      // Skip markdown table separator rows like |:---:|:---:|
      if (/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line)) {
        continue;
      }
      const h1 = line.match(/^#\s+(.*)$/);
      const h2 = line.match(/^##\s+(.*)$/);
      const h3 = line.match(/^###\s+(.*)$/);
      const bullet = line.match(/^\s*[*-]\s+(.*)$/);
      const numbered = line.match(/^\s*(\d+)\.\s+(.*)$/);
      const tableRow = line.trim().startsWith("|") && line.trim().endsWith("|");

      if (h1) {
        y += 6;
        writeWrapped(cleanInline(h1[1]), { size: 22, bold: true, color: [124, 58, 237], gapAfter: 8 });
      } else if (h2) {
        y += 4;
        writeWrapped(cleanInline(h2[1]), { size: 17, bold: true, color: [124, 58, 237], gapAfter: 6 });
      } else if (h3) {
        writeWrapped(cleanInline(h3[1]), { size: 14, bold: true, color: [60, 60, 60], gapAfter: 4 });
      } else if (bullet) {
        writeWrapped("•  " + cleanInline(bullet[1]), { size: 11, gapAfter: 2 });
      } else if (numbered) {
        writeWrapped(`${numbered[1]}.  ` + cleanInline(numbered[2]), { size: 11, gapAfter: 2 });
      } else if (tableRow) {
        const cells = line.trim().slice(1, -1).split("|").map((c) => cleanInline(c.trim()));
        writeWrapped(cells.join("   |   "), { size: 10, gapAfter: 2 });
      } else {
        writeWrapped(cleanInline(line), { size: 11, gapAfter: 4 });
      }
    }

    const pdfBytes = pdf.output("arraybuffer");

    const fileName = `${order.user_id}/${orderId}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("generated-products")
      .upload(fileName, new Blob([pdfBytes], { type: "application/pdf" }), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Generate a short-lived signed URL (1 hour). The bucket is private; only
    // the buyer can re-fetch a fresh signed URL via the get-download-url function.
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("generated-products")
      .createSignedUrl(fileName, 60 * 60);

    if (signErr) throw new Error(`Signed URL failed: ${signErr.message}`);

    // Store the storage *path* (not a URL) so we can re-sign on demand.
    await supabaseAdmin
      .from("orders")
      .update({
        status: "completed",
        generated_file_url: fileName,
      })
      .eq("id", orderId);

    // Send delivery email with download link
    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
      const recipientEmail = userData?.user?.email;
      if (recipientEmail) {
        // Sign a longer-lived URL for the email link (7 days)
        const { data: emailSigned } = await supabaseAdmin.storage
          .from("generated-products")
          .createSignedUrl(fileName, 60 * 60 * 24 * 7);

        const messageId = crypto.randomUUID();
        const productName = productLabel(order.product_id);
        const emailDownloadUrl = emailSigned?.signedUrl ?? signed.signedUrl;
        const emailHtml = buildEmailHtml(productName, emailDownloadUrl);
        await supabaseAdmin.from("email_send_log").insert({
          message_id: messageId,
          template_name: "product-delivery",
          recipient_email: recipientEmail,
          status: "pending",
          metadata: { orderId, provider: "resend", downloadUrl: emailDownloadUrl },
        });
        const resendResult = await sendWithResend({
          to: recipientEmail,
          subject: `Your ${productName} is ready to download`,
          html: emailHtml,
          idempotencyKey: `product-delivery-${orderId}`,
        });
        // Persist the rendered HTML + download URL so admins / tests can audit
        // exactly what the buyer received (this is how the delivery-email
        // parsing E2E test verifies the link points at the right order).
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
            downloadUrl: emailDownloadUrl,
            html: emailHtml,
          },
        });
      }
    } catch (emailErr) {
      console.error("Failed to send delivery email:", emailErr);
      // Non-fatal — product is still delivered via the success page
    }

    return new Response(JSON.stringify({ 
      success: true, 
      fileUrl: signed.signedUrl,
      content: generatedContent.substring(0, 500) + "..." 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("generate-product error:", error);

    // Try to update order status to failed
    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      const { orderId } = await req.clone().json();
      if (orderId) {
        await supabaseAdmin
          .from("orders")
          .update({
            status: "failed",
            error_message: ((error as Error)?.message ?? "Unknown error").slice(0, 2000),
          })
          .eq("id", orderId);
      }
    } catch {
      /* best-effort status update */
    }

    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
