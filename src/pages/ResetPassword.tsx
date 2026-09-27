import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/layout/Layout";
import { toast } from "sonner";
import Seo from "@/components/Seo";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        const errDesc = url.searchParams.get("error_description") || hash.get("error_description");

        if (errDesc) {
          setError(errDesc);
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) setError(error.message);
          else setReady(true);
          return;
        }

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) setError(error.message);
          else setReady(true);
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (data.session) setReady(true);
        else setError("Reset link is invalid or has expired. Please request a new one.");
      } catch (e) {
        setError((e as Error)?.message ?? "Could not validate reset link.");
      }
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. You're signed in.");
    navigate("/dashboard");
  };

  return (
    <Layout>
      <Seo
        title="Reset Password | DigiCraft"
        description="Choose a new password for your DigiCraft account."
        path="/reset-password"
        noindex
      />
      <section className="py-16">
        <div className="container">
          <div className="mx-auto max-w-md">
            <h1 className="text-center font-display text-3xl font-bold">Set a new password</h1>
            <p className="mt-2 text-center text-muted-foreground">
              {ready ? "Choose a new password for your account." : error ? error : "Validating reset link…"}
            </p>
            {!ready && error && (
              <div className="mt-6 text-center">
                <Button variant="hero" onClick={() => navigate("/auth")}>Request a new reset link</Button>
              </div>
            )}
            {ready && (
              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
                </div>
                <Button variant="hero" size="lg" type="submit" className="w-full" disabled={loading}>
                  {loading ? "Updating…" : "Update password"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
