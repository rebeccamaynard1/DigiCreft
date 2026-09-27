import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PRODUCTS, PRODUCT_CATEGORIES } from "@/config/products";
import { ArrowRight, Sparkles, Zap, Shield, Download } from "lucide-react";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/Seo";

function ProductCard({ product }: { product: typeof PRODUCTS[string] }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1"
    >
      <div className="mb-4 text-4xl">{product.icon}</div>
      <h3 className="font-display text-lg font-bold">{product.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{product.shortDescription}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-display text-lg font-bold text-primary">${product.price.toFixed(2)}</span>
        <span className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Create Now <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const featuredProducts = Object.values(PRODUCTS);

  return (
    <Layout>
      <Seo
        title="DigiCraft — AI-Generated Custom Digital Products"
        description="Create custom planners, storybooks, guides & printables in seconds with AI. Pay once, download instantly, print at home."
        path="/"
      />
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 gradient-hero opacity-5" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" /> AI-Powered Digital Products
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-tight md:text-6xl">
              Custom Digital Products,{" "}
              <span className="gradient-text">Created Instantly</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Enter a few details, and our AI creates beautiful, personalized digital products — planners, storybooks, guides & more — delivered as printable PDFs in seconds.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button variant="hero" size="xl" asChild>
                <Link to="/products">Browse Products <ArrowRight className="ml-1 h-5 w-5" /></Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/faq">How It Works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border py-20">
        <div className="container">
          <h2 className="text-center font-display text-3xl font-bold">How It Works</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Three simple steps to your custom digital product
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { icon: <Sparkles className="h-6 w-6" />, title: "Choose & Customize", desc: "Pick your product and fill in a quick form with your preferences." },
              { icon: <Zap className="h-6 w-6" />, title: "AI Creates It", desc: "Our AI generates unique, personalized content and beautiful layouts." },
              { icon: <Download className="h-6 w-6" />, title: "Download Instantly", desc: "Get your printable PDF immediately — it's also saved to your dashboard." },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground">
                  {step.icon}
                </div>
                <h3 className="font-display text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="border-t border-border bg-card py-20">
        <div className="container">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold">Popular Products</h2>
              <p className="mt-2 text-muted-foreground">Create something amazing today</p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/products">View All</Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-border py-16">
        <div className="container">
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            {[
              { icon: <Zap className="h-5 w-5" />, title: "Instant Delivery", desc: "Products generated and delivered in under 60 seconds" },
              { icon: <Shield className="h-5 w-5" />, title: "Secure Payments", desc: "All payments processed securely through Stripe" },
              { icon: <Sparkles className="h-5 w-5" />, title: "100% Unique", desc: "Every product is uniquely generated by AI, just for you" },
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold">{item.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
