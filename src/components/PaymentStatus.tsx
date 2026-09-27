import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Download,
  ArrowRight,
  Loader2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Mail,
  Copy,
  Check,
  Clock,
  Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PaymentStatusState =
  | "verifying"
  | "generating"
  | "completed"
  | "unpaid"
  | "error";

interface PaymentStatusProps {
  state: PaymentStatusState;
  orderId?: string | null;
  fileUrl?: string | null;
  errorMessage?: string | null;
  onRetry?: () => void;
  onFileUrlRefresh?: (url: string) => void;
}

const STATUS_META: Record<
  PaymentStatusState,
  { label: string; tone: "info" | "success" | "warning" | "error" }
> = {
  verifying: { label: "Verifying payment", tone: "info" },
  generating: { label: "Generating product", tone: "info" },
  completed: { label: "Paid & ready", tone: "success" },
  unpaid: { label: "Payment not completed", tone: "warning" },
  error: { label: "Verification failed", tone: "error" },
};

const TONE_CLASSES: Record<string, string> = {
  info: "bg-primary/10 text-primary border-primary/20",
  success: "bg-accent/10 text-accent border-accent/20",
  warning: "bg-orange-100 text-orange-700 border-orange-200",
  error: "bg-destructive/10 text-destructive border-destructive/20",
};

export function PaymentStatusBadge({ state }: { state: PaymentStatusState }) {
  const meta = STATUS_META[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${TONE_CLASSES[meta.tone]}`}
    >
      {(state === "verifying" || state === "generating") && (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      {state === "completed" && <CheckCircle className="h-3 w-3" />}
      {state === "unpaid" && <AlertTriangle className="h-3 w-3" />}
      {state === "error" && <XCircle className="h-3 w-3" />}
      {meta.label}
    </span>
  );
}

function CheckYourEmail({
  orderId,
  onFileUrlRefresh,
}: {
  orderId: string;
  onFileUrlRefresh?: (url: string) => void;
}) {
  const [resending, setResending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<
    null | "queued" | "pending" | "sent" | "failed" | "dlq" | "suppressed" | "bounced" | "complained" | "unknown"
  >(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [deliveryRecipient, setDeliveryRecipient] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Record<string, string>>({});
  const pollRef = useRef<number | null>(null);

  const recordStep = (step: string, when?: string | null) => {
    setTimeline((prev) =>
      prev[step] ? prev : { ...prev, [step]: when ?? new Date().toISOString() }
    );
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = (messageId: string) => {
    stopPolling();
    let elapsed = 0;
    pollRef.current = window.setInterval(async () => {
      elapsed += 3;
      try {
        const { data, error } = await supabase.functions.invoke(
          "get-email-status",
          { body: { orderId, messageId } }
        );
        if (error) return;
        if (data?.status) {
          setDeliveryStatus(data.status);
          recordStep(data.status, data.updatedAt);
        }
        if (data?.errorMessage) setDeliveryError(data.errorMessage);
        if (data?.recipientEmail) setDeliveryRecipient(data.recipientEmail);
        const terminal = ["sent", "failed", "dlq", "suppressed", "bounced", "complained"];
        if (terminal.includes(data?.status)) stopPolling();
      } catch {
        // ignore transient errors
      }
      if (elapsed >= 90) stopPolling(); // give up after 90s
    }, 3000);
  };

  const handleResend = async () => {
    setResending(true);
    setTimeline({});
    setDeliveryStatus("queued");
    setDeliveryError(null);
    recordStep("queued");
    try {
      const { data, error } = await supabase.functions.invoke(
        "resend-delivery-email",
        { body: { orderId } }
      );
      if (error) throw error;
      if (data?.fileUrl && onFileUrlRefresh) onFileUrlRefresh(data.fileUrl);
      if (data?.recipientEmail) setDeliveryRecipient(data.recipientEmail);
      if (data?.status) {
        setDeliveryStatus(data.status);
        recordStep(data.status);
      }
      toast.success("Email queued — tracking delivery");
      if (data?.messageId) startPolling(data.messageId);
      else setDeliveryStatus("unknown");
    } catch (err) {
      setDeliveryStatus("failed");
      setDeliveryError(err?.message ?? "Couldn't resend the email");
      recordStep("failed");
      toast.error(err?.message ?? "Couldn't resend the email");
    } finally {
      setResending(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy order ID");
    }
  };

  const renderDeliveryStatus = () => {
    if (!deliveryStatus) return null;

    const map: Record<
      string,
      { icon: JSX.Element; label: string; tone: string; description: string }
    > = {
      queued: {
        icon: <Send className="h-3.5 w-3.5" />,
        label: "Queued",
        tone: TONE_CLASSES.info,
        description: "Email handed to the delivery queue.",
      },
      pending: {
        icon: <Clock className="h-3.5 w-3.5" />,
        label: "Sending…",
        tone: TONE_CLASSES.info,
        description: "Waiting for the provider to send.",
      },
      sent: {
        icon: <CheckCircle className="h-3.5 w-3.5" />,
        label: "Sent",
        tone: TONE_CLASSES.success,
        description: deliveryRecipient
          ? `Successfully sent to ${deliveryRecipient}.`
          : "Successfully sent.",
      },
      failed: {
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: "Failed",
        tone: TONE_CLASSES.error,
        description: deliveryError ?? "Send failed. Try again in a moment.",
      },
      dlq: {
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: "Failed after retries",
        tone: TONE_CLASSES.error,
        description: deliveryError ?? "Email couldn't be delivered after retries.",
      },
      suppressed: {
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        label: "Suppressed",
        tone: TONE_CLASSES.warning,
        description: "This address is on the suppression list (bounced or unsubscribed).",
      },
      bounced: {
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        label: "Bounced",
        tone: TONE_CLASSES.warning,
        description: "Provider reported a bounce for this address.",
      },
      complained: {
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        label: "Complaint",
        tone: TONE_CLASSES.warning,
        description: "Recipient marked a previous email as spam.",
      },
      unknown: {
        icon: <Clock className="h-3.5 w-3.5" />,
        label: "Tracking…",
        tone: TONE_CLASSES.info,
        description: "Couldn't locate a tracking ID — the email may still be sending.",
      },
    };

    const meta = map[deliveryStatus] ?? map.unknown;

    const fmt = (iso: string) =>
      new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

    const steps: { key: string; label: string; isError?: boolean }[] = [
      { key: "queued", label: "Queued" },
      { key: "pending", label: "Sending" },
    ];
    if (timeline.sent || deliveryStatus === "sent") {
      steps.push({ key: "sent", label: "Sent" });
    } else if (
      timeline.failed ||
      timeline.dlq ||
      timeline.suppressed ||
      timeline.bounced ||
      timeline.complained ||
      ["failed", "dlq", "suppressed", "bounced", "complained"].includes(
        deliveryStatus
      )
    ) {
      const errKey =
        ["failed", "dlq", "suppressed", "bounced", "complained"].find(
          (k) => timeline[k] || deliveryStatus === k
        ) ?? "failed";
      const labels: Record<string, string> = {
        failed: "Failed",
        dlq: "Failed after retries",
        suppressed: "Suppressed",
        bounced: "Bounced",
        complained: "Complaint",
      };
      steps.push({ key: errKey, label: labels[errKey], isError: true });
    } else {
      steps.push({ key: "sent", label: "Sent" });
    }

    return (
      <div className="mt-3 rounded-lg border bg-background p-3 text-left">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.tone}`}
          >
            {(deliveryStatus === "queued" || deliveryStatus === "pending") ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              meta.icon
            )}
            {meta.label}
          </span>
          <span className="text-[11px] text-muted-foreground">Email delivery status</span>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{meta.description}</p>

        <ol className="mt-3 space-y-2 border-t pt-3">
          {steps.map((step, i) => {
            const ts = timeline[step.key];
            const reached = Boolean(ts) || deliveryStatus === step.key;
            const active = deliveryStatus === step.key && !["sent", "failed", "dlq", "suppressed", "bounced", "complained"].includes(step.key);
            return (
              <li key={step.key} className="flex items-center gap-2.5 text-xs">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    step.isError && reached
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : reached
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {active ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : reached ? (
                    step.isError ? (
                      <XCircle className="h-3 w-3" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )
                  ) : (
                    <span className="text-[10px]">{i + 1}</span>
                  )}
                </span>
                <span
                  className={`flex-1 font-medium ${
                    reached ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {ts ? fmt(ts) : "—"}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    );
  };

  return (
    <div className="mt-6 rounded-2xl border bg-muted/40 p-5 text-left">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-display text-sm font-semibold">Check your email</p>
          <p className="mt-1 text-xs text-muted-foreground">
            We've sent your download link to the email on your account. It can
            take a minute — also check your spam folder.
          </p>

          <div className="mt-3 flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-xs">
            <span className="text-muted-foreground">Order ID:</span>
            <code className="flex-1 truncate font-mono text-foreground">
              {orderId}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="text-muted-foreground transition hover:text-foreground"
              aria-label="Copy order ID"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-accent" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resending…
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" /> Resend email + refresh link
              </>
            )}
          </Button>

          {renderDeliveryStatus()}
        </div>
      </div>
    </div>
  );
}


export default function PaymentStatus({
  state,
  orderId,
  fileUrl,
  errorMessage,
  onRetry,
  onFileUrlRefresh,
}: PaymentStatusProps) {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
      <div className="flex justify-center">
        <PaymentStatusBadge state={state} />
      </div>

      {state === "verifying" && (
        <>
          <Loader2 className="mx-auto mt-6 h-12 w-12 animate-spin text-primary" />
          <h2 className="mt-6 font-display text-2xl font-bold">Verifying your payment…</h2>
          <p className="mt-2 text-muted-foreground">
            Hang tight — we're confirming your payment with Stripe.
          </p>
        </>
      )}

      {state === "generating" && (
        <>
          <Loader2 className="mx-auto mt-6 h-12 w-12 animate-spin text-accent" />
          <h2 className="mt-6 font-display text-2xl font-bold">Payment confirmed — generating your product</h2>
          <p className="mt-2 text-muted-foreground">
            Our AI is crafting your custom product. This usually takes under a minute.
          </p>
        </>
      )}

      {state === "completed" && (
        <>
          <div className="mx-auto mt-6 mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 animate-scale-in">
            <CheckCircle className="h-10 w-10 text-accent" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold">Your product is ready!</h2>
          <p className="mt-2 text-muted-foreground">
            We've also emailed a download link to your inbox.
          </p>
          <div className="mt-8 space-y-3">
            {fileUrl && (
              <Button variant="hero" size="lg" className="w-full" asChild>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-5 w-5" /> Download your product
                </a>
              </Button>
            )}
            <Button variant="outline" size="lg" className="w-full" asChild>
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
            <Button variant="ghost" size="lg" className="w-full" asChild>
              <Link to="/products">
                Create another product <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {orderId && (
            <CheckYourEmail orderId={orderId} onFileUrlRefresh={onFileUrlRefresh} />
          )}
        </>
      )}

      {state === "unpaid" && (
        <>
          <AlertTriangle className="mx-auto mt-6 h-12 w-12 text-orange-500" />
          <h2 className="mt-6 font-display text-2xl font-bold">Payment wasn't completed</h2>
          <p className="mt-2 text-muted-foreground">
            It looks like your Stripe checkout was cancelled or didn't finish. No charge was made.
          </p>
          <div className="mt-6 space-y-3">
            <Button variant="hero" size="lg" className="w-full" asChild>
              <Link to="/products">Try checkout again</Link>
            </Button>
            <Button variant="ghost" size="lg" className="w-full" asChild>
              <Link to="/contact">Contact support</Link>
            </Button>
          </div>
        </>
      )}

      {state === "error" && (
        <>
          <XCircle className="mx-auto mt-6 h-12 w-12 text-destructive" />
          <h2 className="mt-6 font-display text-2xl font-bold">We couldn't verify your payment</h2>
          <p className="mt-2 text-muted-foreground">
            {errorMessage ||
              "Something went wrong while confirming your order. If you were charged, your product will be delivered automatically."}
          </p>
          <div className="mt-6 space-y-3">
            {onRetry && (
              <Button variant="hero" size="lg" className="w-full" onClick={onRetry}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry verification
              </Button>
            )}
            <Button variant="outline" size="lg" className="w-full" asChild>
              <Link to="/dashboard">Check my orders</Link>
            </Button>
            <Button variant="ghost" size="lg" className="w-full" asChild>
              <Link to="/contact">Contact support</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
