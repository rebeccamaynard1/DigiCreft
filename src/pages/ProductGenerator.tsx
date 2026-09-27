import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { PRODUCTS } from "@/config/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Layout from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Seo from "@/components/Seo";

export default function ProductGeneratorPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const product = productId ? PRODUCTS[productId] : null;
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    if (!productId) return {};
    try {
      const saved = sessionStorage.getItem("digicraft_order");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.productId === productId && parsed?.formData) {
          return parsed.formData;
        }
      }
      const draft = sessionStorage.getItem(`digicraft_draft_${productId}`);
      if (draft) return JSON.parse(draft);
    } catch {
      /* ignore storage errors */
    }
    return {};
  });
  const [loading, setLoading] = useState(false);

  // Persist draft so a sign-in redirect or accidental refresh doesn't wipe input
  useEffect(() => {
    if (!productId) return;
    try {
      sessionStorage.setItem(`digicraft_draft_${productId}`, JSON.stringify(formData));
    } catch {
      /* ignore storage errors */
    }
  }, [productId, formData]);

  // Surface a clear message when the user returns from a canceled Stripe Checkout
  useEffect(() => {
    if (searchParams.get("canceled") === "1") {
      toast.info("Payment canceled — your details are saved. Click Continue to Payment to try again.");
      searchParams.delete("canceled");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);


  if (!product) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Product not found</h1>
          <Button className="mt-6" onClick={() => navigate("/products")}>Back to Products</Button>
        </div>
      </Layout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        sessionStorage.setItem("digicraft_order", JSON.stringify({ productId: product.id, formData }));
        sessionStorage.setItem("digicraft_redirect", `/product/${product.id}`);
        toast.info("Please sign in to continue with your purchase");
        navigate("/auth");
        return;
      }

      // Create checkout session
      const { stripeConfig } = await import("@/config/stripe");
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          productId: product.id,
          productName: product.name,
          price: product.price,
          formData,
          liveMode: stripeConfig.liveMode,
        },
      });

      if (error) throw error;
      if (data?.url) {
        try {
          // Full-page redirect to Stripe Checkout
          window.location.assign(data.url);
          // Fallback in case assign is blocked
          setTimeout(() => {
            if (document.visibilityState === "visible") {
              window.location.href = data.url;
            }
          }, 800);
        } catch (redirectErr) {
          console.error("Redirect to Stripe failed:", redirectErr);
          toast.error("Could not redirect to Stripe Checkout. Please try again.");
          setLoading(false);
        }
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error((error as Error)?.message || "Failed to start checkout");
      setLoading(false);
    }
  };

  const updateField = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    offers: {
      "@type": "Offer",
      price: product.price.toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `https://becksdigitalpro.org/product/${product.id}`,
    },
  };

  return (
    <Layout>
      <Seo
        title={`${product.name} — DigiCraft`}
        description={product.description.slice(0, 158)}
        path={`/product/${product.id}`}
        type="product"
        jsonLd={productSchema}
      />
      <section className="py-12">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-10 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <div className="mb-6">
                  <span className="text-4xl">{product.icon}</span>
                  <h1 className="mt-3 font-display text-3xl font-bold">{product.name}</h1>
                  <p className="mt-2 text-muted-foreground">{product.description}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {product.fields.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor={field.name}>
                        {field.label} {field.required && <span className="text-destructive">*</span>}
                      </Label>
                      {field.type === "text" || field.type === "number" ? (
                        <Input
                          id={field.name}
                          type={field.type}
                          placeholder={field.placeholder}
                          required={field.required}
                          value={formData[field.name] || ""}
                          onChange={(e) => updateField(field.name, e.target.value)}
                        />
                      ) : field.type === "textarea" ? (
                        <Textarea
                          id={field.name}
                          placeholder={field.placeholder}
                          required={field.required}
                          value={formData[field.name] || ""}
                          onChange={(e) => updateField(field.name, e.target.value)}
                          rows={3}
                        />
                      ) : field.type === "select" && field.options ? (
                        <Select
                          value={formData[field.name] || ""}
                          onValueChange={(v) => updateField(field.name, v)}
                          required={field.required}
                        >
                          <SelectTrigger id={field.name}>
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.type === "date" ? (
                        <Input
                          id={field.name}
                          type="date"
                          required={field.required}
                          value={formData[field.name] || ""}
                          onChange={(e) => updateField(field.name, e.target.value)}
                        />
                      ) : null}
                    </div>
                  ))}

                  <Button variant="hero" size="lg" type="submit" className="w-full" disabled={loading}>
                    {loading ? "Processing..." : (
                      <>Continue to Payment — ${product.price.toFixed(2)} <ArrowRight className="ml-1 h-5 w-5" /></>
                    )}
                  </Button>
                </form>
              </div>

              <div className="lg:col-span-2">
                <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-card">
                  <h3 className="font-display text-lg font-bold">What's Included</h3>
                  <ul className="mt-4 space-y-3">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 rounded-xl bg-secondary p-4 text-center">
                    <span className="text-sm text-muted-foreground">Price</span>
                    <div className="font-display text-3xl font-bold text-primary">${product.price.toFixed(2)}</div>
                    <span className="text-xs text-muted-foreground">One-time payment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
