"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "./ui";
import { CreditCard, Loader2 } from "lucide-react";

function CheckoutSuccessInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const success = searchParams.get("success");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    sessionId ? "loading" : "idle"
  );

  useEffect(() => {
    if (!sessionId) return;

    async function verify() {
      try {
        const res = await fetch(
          `/api/stripe/checkout?session_id=${encodeURIComponent(sessionId!)}`
        );
        const data = await res.json();
        if (res.ok && data.status === "complete") {
          setStatus("done");
          router.replace("/dashboard/subscriptions?success=1");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    }

    verify();
  }, [sessionId, router]);

  if (success === "1") {
    return (
      <div className="mb-6 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
        Payment successful! Your subscription is now active.
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        Confirming your payment...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mb-6 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        Payment verification is still processing. Refresh in a moment or check your email.
      </div>
    );
  }

  return null;
}

export function CheckoutSuccessHandler() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessInner />
    </Suspense>
  );
}

export function BillingPortalButton() {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={openPortal} disabled={loading}>
      <CreditCard className="h-4 w-4" />
      {loading ? "Opening..." : "Manage Billing"}
    </Button>
  );
}
