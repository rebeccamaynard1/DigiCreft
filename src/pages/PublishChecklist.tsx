import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CheckStatus = "pass" | "warn" | "fail";
interface CheckResult {
  id: string;
  name: string;
  status: CheckStatus;
  message: string;
  details?: string;
}
interface ChecklistResponse {
  overall: CheckStatus;
  summary: { pass: number; warn: number; fail: number };
  results: CheckResult[];
  ranAt: string;
}

const statusMeta: Record<CheckStatus, { color: string; icon: typeof CheckCircle2; label: string }> = {
  pass: { color: "text-emerald-600", icon: CheckCircle2, label: "Pass" },
  warn: { color: "text-amber-600", icon: AlertTriangle, label: "Warning" },
  fail: { color: "text-rose-600", icon: XCircle, label: "Fail" },
};

export default function PublishChecklist() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<ChecklistResponse | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      runChecks();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runChecks = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("publish-checklist");
      if (error) throw error;
      setData(data as ChecklistResponse);
    } catch (e) {
      toast.error("Failed to run checklist");
      console.error(e);
    } finally {
      setRunning(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl py-12 px-4">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Publish Checklist</h1>
            <p className="text-muted-foreground">
              End-to-end checks for Stripe, fulfillment, PDF generation, and email delivery.
            </p>
          </div>
          <Button onClick={runChecks} disabled={running} variant="outline">
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Re-run checks
          </Button>
        </div>

        {data && (
          <>
            <Card className="p-6 mb-6 rounded-2xl">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  {(() => {
                    const Icon = statusMeta[data.overall].icon;
                    return <Icon className={`w-12 h-12 ${statusMeta[data.overall].color}`} />;
                  })()}
                  <div>
                    <h2 className="text-2xl font-bold">
                      {data.overall === "pass" && "Ready to publish"}
                      {data.overall === "warn" && "Mostly ready — review warnings"}
                      {data.overall === "fail" && "Not ready — fix failures first"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Last run: {new Date(data.ranAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                    {data.summary.pass} pass
                  </Badge>
                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                    {data.summary.warn} warn
                  </Badge>
                  <Badge variant="outline" className="text-rose-600 border-rose-600">
                    {data.summary.fail} fail
                  </Badge>
                </div>
              </div>
            </Card>

            <div className="space-y-3 mb-8">
              {data.results.map((r) => {
                const meta = statusMeta[r.status];
                const Icon = meta.icon;
                return (
                  <Card key={r.id} className="p-5 rounded-2xl">
                    <div className="flex items-start gap-4">
                      <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${meta.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h3 className="font-semibold">{r.name}</h3>
                          <Badge variant="outline" className={meta.color}>{meta.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{r.message}</p>
                        {r.details && (
                          <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted p-2 rounded">
                            {r.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Card className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Rocket className="w-5 h-5" /> Manual end-to-end test
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Automated checks confirm the plumbing. To verify the full live flow, complete one real purchase yourself:
              </p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Buy the cheapest product with a real card</li>
                <li>Confirm Stripe charges and the success page shows your file</li>
                <li>Confirm the delivery email arrives in your inbox</li>
                <li>Refund yourself in Stripe Dashboard once verified</li>
              </ol>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
