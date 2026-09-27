import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

import Layout from "@/components/layout/Layout";
import PaymentStatus, { PaymentStatusState } from "@/components/PaymentStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Seo from "@/components/Seo";

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [state, setState] = useState<PaymentStatusState>("verifying");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verifyAndGenerate = useCallback(async () => {
    if (!orderId) {
      setState("error");
      setErrorMessage("Missing order reference in the URL.");
      return;
    }

    setState("verifying");
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { orderId },
      });

      if (error) throw error;

      if (data?.status === "completed") {
        setState("completed");
        setFileUrl(data.fileUrl ?? null);
        toast.success("Your product is ready!");
        return;
      }

      if (data?.status === "generating" || data?.status === "pending") {
        // Payment confirmation (pending) and PDF generation (generating) both
        // resolve via the Stripe webhook. Poll the order row until the
        // webhook flips status to completed or failed.
        setState("generating");
        const interval = setInterval(async () => {
          const { data: orderData } = await supabase
            .from("orders")
            .select("status")
            .eq("id", orderId)
            .single();

          if (orderData?.status === "completed") {
            const { data: signed } = await supabase.functions.invoke(
              "get-download-url",
              { body: { orderId } },
            );
            setState("completed");
            setFileUrl(signed?.fileUrl ?? null);
            toast.success("Your product is ready!");
            clearInterval(interval);
          } else if (orderData?.status === "failed") {
            setState("error");
            setErrorMessage("Product generation failed. Our team has been notified.");
            clearInterval(interval);
          }
        }, 3000);
        return;
      }

      if (data?.status === "unpaid") {
        setState("unpaid");
        return;
      }

      setState("error");
      setErrorMessage("Unexpected response while verifying your payment.");
    } catch (err) {
      console.error("Verification error:", err);
      setState("error");
      setErrorMessage(err?.message ?? null);
      toast.error("Something went wrong verifying your payment");
    }
  }, [orderId]);

  useEffect(() => {
    verifyAndGenerate();
  }, [verifyAndGenerate]);

  return (
    <Layout>
      <Seo
        title="Order Complete | DigiCraft"
        description="Your DigiCraft order is confirmed and your download is ready."
        path="/success"
        noindex
      />
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-lg">
            <h1 className="mb-8 text-center font-display text-3xl font-bold">
              {orderId ? "Your order" : "No order to show"}
            </h1>
            {orderId ? (
              <PaymentStatus
                state={state}
                orderId={orderId}
                fileUrl={fileUrl}
                errorMessage={errorMessage}
                onRetry={state === "error" ? verifyAndGenerate : undefined}
                onFileUrlRefresh={setFileUrl}
              />
            ) : (
              <div className="rounded-2xl border bg-card p-8 text-center">
                <p className="text-muted-foreground">
                  This page shows your download after a purchase. It looks like you landed here
                  without an order — head to your dashboard for past orders, or browse the catalog
                  to create something new.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button asChild>
                    <Link to="/products">Browse products</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/dashboard">My dashboard</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

    </Layout>
  );
}
