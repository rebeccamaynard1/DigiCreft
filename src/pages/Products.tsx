import { Link } from "react-router-dom";
import { PRODUCTS, PRODUCT_CATEGORIES } from "@/config/products";
import { ArrowRight } from "lucide-react";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/Seo";

export default function ProductsPage() {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "All DigiCraft Products",
    url: "https://becksdigitalpro.org/products",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: Object.values(PRODUCTS).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://becksdigitalpro.org/product/${p.id}`,
        name: p.name,
      })),
    },
  };
  return (
    <Layout>
      <Seo
        title="Browse AI Digital Products — DigiCraft"
        description="Browse every AI-generated digital product DigiCraft offers — planners, journals, storybooks, pet guides, printables and more."
        path="/products"
        jsonLd={itemList}
      />
      <section className="py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-4xl font-bold">All Products</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Choose a product type and create something unique in seconds
            </p>
          </div>

          <div className="mt-16 space-y-16">
            {PRODUCT_CATEGORIES.map((category) => (
              <div key={category.id}>
                <h2 className="font-display text-2xl font-bold">{category.name}</h2>
                <p className="mt-1 text-muted-foreground">{category.description}</p>
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {category.products.map((productId) => {
                    const product = PRODUCTS[productId];
                    if (!product) return null;
                    return (
                      <Link
                        key={product.id}
                        to={`/product/${product.id}`}
                        className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1"
                      >
                        <div className="mb-3 text-3xl">{product.icon}</div>
                        <h3 className="font-display text-lg font-bold">{product.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{product.shortDescription}</p>
                        <ul className="mt-3 space-y-1">
                          {product.features.slice(0, 3).map((f) => (
                            <li key={f} className="text-xs text-muted-foreground">✓ {f}</li>
                          ))}
                        </ul>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="font-display text-lg font-bold text-primary">${product.price.toFixed(2)}</span>
                          <span className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                            Create <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
