import Layout from "@/components/layout/Layout";
import Seo from "@/components/Seo";

export default function TermsPage() {
  return (
    <Layout>
      <Seo
        title="Terms of Service | DigiCraft"
        description="Read the DigiCraft terms of service covering purchases, digital product delivery, refunds, and acceptable use."
        path="/terms"
      />
      <section className="py-16">
        <div className="container">
          <div className="prose prose-sm mx-auto max-w-2xl">
            <h1 className="font-display text-4xl font-bold">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: April 6, 2026</p>

            <div className="mt-8 space-y-6 text-muted-foreground">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">1. Acceptance of Terms</h2>
                <p>By accessing or using DigiCraft, you agree to be bound by these Terms of Service and our Privacy Policy.</p>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">2. Description of Service</h2>
                <p>DigiCraft provides AI-generated digital products including planners, guides, storybooks, affirmation cards, and printable templates. Products are delivered as downloadable PDF files.</p>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">3. Payments & Refunds</h2>
                <p>All payments are processed securely through Stripe. Due to the digital and personalized nature of our products, refunds are generally not offered. If you experience technical issues, please contact us.</p>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">4. Intellectual Property</h2>
                <p>Products you purchase are licensed for personal use. You may print and use them for yourself. Redistribution or resale is not permitted.</p>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">5. Limitation of Liability</h2>
                <p>DigiCraft is provided "as is". We do not guarantee that all AI-generated content will be error-free or meet your specific expectations.</p>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">6. Contact</h2>
                <p>For questions about these terms, please contact us at support@digicraft.app.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
