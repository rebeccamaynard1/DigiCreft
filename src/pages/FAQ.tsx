import Layout from "@/components/layout/Layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Seo from "@/components/Seo";

const faqs = [
  { q: "How does DigiCraft work?", a: "Choose a product type, fill in a quick customization form, pay securely, and our AI instantly generates your unique digital product as a downloadable PDF." },
  { q: "How fast is delivery?", a: "Products are generated and ready for download within 60 seconds of payment. You'll also receive a copy via email." },
  { q: "Can I print the products?", a: "Yes! All products are designed as high-quality, printable PDFs. They work great on both A4 and Letter-size paper." },
  { q: "Is each product truly unique?", a: "Absolutely. Our AI generates every product from scratch based on your specific inputs. No two products are ever the same." },
  { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards through Stripe, including Visa, Mastercard, and American Express." },
  { q: "Can I get a refund?", a: "Since products are digitally generated and delivered instantly, we generally don't offer refunds. However, if there's an issue with your product, please contact us and we'll make it right." },
  { q: "Can I re-download my products?", a: "Yes! All your products are saved to your dashboard and can be downloaded anytime." },
  { q: "Do you offer subscriptions?", a: "Coming soon! We're working on an unlimited downloads subscription plan. Stay tuned!" },
];

export default function FAQPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <Layout>
      <Seo
        title="DigiCraft FAQ — How AI Product Generation Works"
        description="Answers about DigiCraft delivery times, payments, printing, refunds, re-downloads and how each AI-generated product is created."
        path="/faq"
        jsonLd={faqSchema}
      />
      <section className="py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-center font-display text-4xl font-bold">Frequently Asked Questions</h1>
            <p className="mt-3 text-center text-muted-foreground">Everything you need to know about DigiCraft</p>

            <Accordion type="single" collapsible className="mt-10">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left font-display font-semibold">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </Layout>
  );
}
