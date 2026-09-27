import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "validating" | "ready" | "already" | "invalid" | "submitting" | "done" | "error";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("validating");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_KEY } },
        );
        const data = await res.json();
        if (data.valid) setState("ready");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setState("done");
      else if (data?.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    }
  };

  return (
    <Layout>
      <Seo
        title="Email Preferences | DigiCraft"
        description="Manage your DigiCraft email preferences and unsubscribe from marketing messages."
        path="/unsubscribe"
        noindex
      />
      <section className="py-20">
        <div className="container mx-auto max-w-md text-center">
          {state === "validating" && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Checking your unsubscribe link…</p>
            </>
          )}
          {state === "ready" && (
            <>
              <h1 className="font-display text-2xl font-bold">Unsubscribe from emails?</h1>
              <p className="mt-3 text-muted-foreground">
                You'll stop receiving emails from us at this address.
              </p>
              <Button variant="hero" size="lg" className="mt-6 w-full" onClick={confirm}>
                Confirm unsubscribe
              </Button>
            </>
          )}
          {state === "submitting" && (
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          )}
          {state === "done" && (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-accent" />
              <h1 className="mt-4 font-display text-2xl font-bold">You're unsubscribed</h1>
              <p className="mt-2 text-muted-foreground">
                You won't receive further emails from us.
              </p>
            </>
          )}
          {state === "already" && (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-accent" />
              <h1 className="mt-4 font-display text-2xl font-bold">Already unsubscribed</h1>
              <p className="mt-2 text-muted-foreground">This address is already opted out.</p>
            </>
          )}
          {(state === "invalid" || state === "error") && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <h1 className="mt-4 font-display text-2xl font-bold">Link invalid</h1>
              <p className="mt-2 text-muted-foreground">
                This unsubscribe link is invalid or expired.
              </p>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}
