"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Zap } from "lucide-react";
import { Button } from "@/components/ui";
import { AuthThemeToggle } from "@/components/auth-theme-toggle";

function PendingContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleResend() {
    if (!email) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
        <Mail className="h-7 w-7 text-accent" />
      </div>
      <h1 className="text-2xl font-bold">Check your email</h1>
      <p className="mt-3 text-sm text-muted">
        We sent a verification link to{" "}
        {email ? (
          <span className="font-medium text-foreground">{email}</span>
        ) : (
          "your email address"
        )}
        . Click the link to activate your account.
      </p>
      <p className="mt-2 text-xs text-muted">
        Without SMTP configured, the verification link is printed in your server terminal.
      </p>

      <div className="mt-8 space-y-3">
        <Button
          className="w-full"
          variant="secondary"
          onClick={handleResend}
          disabled={loading || !email}
        >
          {loading ? "Sending..." : "Resend verification email"}
        </Button>
        {message && <p className="text-sm text-success">{message}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        <Link
          href="/login"
          className="block text-sm text-accent hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPendingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <AuthThemeToggle />
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-semibold">Zingte API Hub</span>
      </div>
      <Suspense fallback={<p className="text-muted">Loading...</p>}>
        <PendingContent />
      </Suspense>
    </div>
  );
}
