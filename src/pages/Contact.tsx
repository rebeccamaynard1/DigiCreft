import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";

export default function ContactPage() {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const idempotencyKey = `contact-${email}-${Date.now()}`;
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-message",
          idempotencyKey,
          templateData: {
            senderName: name,
            senderEmail: email,
            message,
          },
        },
      });
      if (error) throw error;
      toast({ title: "Message sent!", description: "We'll get back to you within 24 hours." });
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      console.error("Contact form failed:", err);
      toast({
        title: "Couldn't send message",
        description: "Please try again in a moment, or email support@becksdigitalpro.org directly.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <Seo
        title="Contact DigiCraft — We're Here to Help"
        description="Questions about your AI digital product? Reach the DigiCraft team — we reply within 24 hours."
        path="/contact"
      />
      <section className="py-16">
        <div className="container">
          <div className="mx-auto max-w-lg">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h1 className="font-display text-4xl font-bold">Contact Us</h1>
              <p className="mt-2 text-muted-foreground">Have a question? We'd love to hear from you.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Name</Label>
                <Input id="contact-name" placeholder="Your name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email</Label>
                <Input id="contact-email" type="email" placeholder="you@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">Message</Label>
                <Textarea id="contact-message" placeholder="How can we help?" rows={5} required value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <Button variant="hero" size="lg" type="submit" className="w-full" disabled={sending}>
                {sending ? "Sending..." : "Send Message"}
              </Button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" /> support@digicraft.app
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
