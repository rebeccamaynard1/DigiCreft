import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, ShoppingBag, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";

export default function PaymentCanceled() {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const email = params.get("email");
  const [productId, setProductId] = useState<string | null>(null);

  useEffect(() => {
    // Preserve the email used at checkout so future retries can pre-fill it.
    if (email) {
      try {
        localStorage.setItem("lastCheckoutEmail", email);
      } catch {
        /* ignore storage errors */
      }
    }

    // Look up the order so we can offer a direct retry link to the product page.
    if (orderId) {
      supabase
        .from("orders")
        .select("product_id")
        .eq("id", orderId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.product_id) setProductId(data.product_id);
        });
    }
  }, [orderId, email]);

  const retryHref = productId ? `/product/${productId}?canceled=1` : "/products";

  return (
    <Layout>
      <Seo
        title="Payment Canceled | DigiCraft"
        description="Your checkout was canceled and nothing was charged. You can retry your purchase at any time."
        path="/payment-canceled"
        noindex
      />
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-lg text-center">
            <div className="mb-6 inline-flex items-center justify-center rounded-full bg-rose-100/80 p-4 dark:bg-rose-900/20">
              <XCircle className="h-10 w-10 text-rose-500" />
            </div>

            <h1 className="mb-3 text-3xl font-bold tracking-tight text-primary-purple">
              Payment Canceled
            </h1>
            <p className="mb-3 text-muted-foreground">
              You canceled the checkout session. No charge was made.
            </p>
            {email && (
              <p className="mb-8 text-sm text-muted-foreground">
                We saved <span className="font-medium text-foreground">{email}</span>{" "}
                so you can pick up where you left off.
              </p>
            )}

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild variant="default" className="gap-2">
                <Link to={retryHref}>
                  <RotateCcw className="h-4 w-4" />
                  Retry Payment
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/products">
                  <ShoppingBag className="h-4 w-4" />
                  Browse Products
                </Link>
              </Button>
              <Button asChild variant="ghost" className="gap-2">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4" />
                  Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
