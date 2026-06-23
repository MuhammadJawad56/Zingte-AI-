"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui";
import { AuthPageShell } from "@/components/auth-layout";
import { useResendVerification } from "@/hooks/use-resend-verification";

function PendingContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const { resend, message, error, loading } = useResendVerification(email);

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
        <Mail className="h-7 w-7 text-accent" />
      </div>
      <h2 className="text-xl font-bold">Check your email</h2>
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
          onClick={resend}
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
    <AuthPageShell title="Zingte API Hub" header={<div className="mb-8" />}>
      <Suspense fallback={<p className="text-muted">Loading...</p>}>
        <PendingContent />
      </Suspense>
    </AuthPageShell>
  );
}
