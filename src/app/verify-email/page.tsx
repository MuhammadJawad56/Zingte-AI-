"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Zap } from "lucide-react";
import { AuthThemeToggle } from "@/components/auth-theme-toggle";

function VerifyErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const messages: Record<string, string> = {
    missing_token: "No verification token was provided.",
    invalid_token: "This verification link is invalid or has expired.",
    used_or_invalid:
      "This link is invalid or was already used. Try signing in, or request a new verification email.",
    expired_token:
      "This verification link has expired (links last 24 hours). Request a new one below.",
  };

  return (
    <div className="w-full max-w-md text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
        <AlertCircle className="h-7 w-7 text-danger" />
      </div>
      <h1 className="text-2xl font-bold">Verification failed</h1>
      <p className="mt-3 text-sm text-muted">
        {error ? messages[error] || "Unable to verify your email." : "Unable to verify your email."}
      </p>
      <div className="mt-8 space-y-3">
        <Link
          href="/verify-email/pending"
          className="block rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white"
        >
          Request a new link
        </Link>
        <Link href="/login" className="block text-sm text-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
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
        <VerifyErrorContent />
      </Suspense>
    </div>
  );
}
