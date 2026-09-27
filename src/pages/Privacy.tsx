import Layout from "@/components/layout/Layout";
import Seo from "@/components/Seo";

export default function PrivacyPage() {
  return (
    <Layout>
      <Seo
        title="Privacy Policy | DigiCraft"
        description="How DigiCraft collects, uses, and protects your personal information when you create and purchase digital products."
        path="/privacy"
      />
      <section className="py-16">
        <div className="container">
          <div className="prose prose-sm mx-auto max-w-2xl">
            <h1 className="font-display text-4xl font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: April 6, 2026</p>

            <div className="mt-8 space-y-6 text-muted-foreground">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">1. Information We Collect</h2>
                <p>We collect information you provide when creating products (names, preferences) and payment information processed securely through Stripe. We do not store your credit card details.</p>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">2. How We Use Your Information</h2>
                <p>Your information is used to generate your custom products, process payments, deliver products via email, and improve our services.</p>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">3. Data Storage</h2>
                <p>Your generated products and account data are stored securely. You can request deletion of your data at any time by contacting us.</p>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">4. Third-Party Services</h2>
                <p>We use Stripe for payment processing and AI services for content generation. These services have their own privacy policies.</p>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">5. Contact</h2>
                <p>For privacy-related inquiries, contact us at support@digicraft.app.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
