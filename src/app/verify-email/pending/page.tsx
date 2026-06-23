"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui";
import { AuthPageShell } from "@/components/auth-layout";
import { useResendVerification } from "@/hooks/use-resend-verification";
import { useDevVerificationUrl } from "@/hooks/use-dev-verification-link";

function DevVerificationBanner({ url }: { url: string }) {
  return (
    <div className="mt-6 rounded-lg border border-accent/30 bg-accent/10 p-4 text-left text-sm">
      <p className="font-medium text-foreground">Development mode — no SMTP configured</p>
      <p className="mt-1 text-xs text-muted">
        Click the link below to verify (also printed in your server terminal):
      </p>
      <a
        href={url}
        className="mt-2 block break-all text-xs text-accent hover:underline"
      >
        {url}
      </a>
    </div>
  );
}

function PendingContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const savedDevLink = useDevVerificationUrl();
  const { resend, message, error, loading, devLink } = useResendVerification(email);
  const showDevLink = devLink || savedDevLink;

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

      {showDevLink && <DevVerificationBanner url={showDevLink} />}

      {!showDevLink && (
        <p className="mt-2 text-xs text-muted">
          Without SMTP configured, the verification link is printed in your server
          terminal where <code className="text-foreground">npm run dev</code> is running.
        </p>
      )}

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
