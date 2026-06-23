"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Input, Button } from "@/components/ui";
import { AuthPageShell } from "@/components/auth-layout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      title="Forgot password?"
      subtitle="Enter your email and we'll send a reset link"
      footer={
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="glass rounded-xl p-6 text-center">
          <p className="text-sm text-muted">{message}</p>
          <p className="mt-2 text-xs text-muted">
            Check your inbox. Without SMTP, the link appears in the server terminal.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass animate-fade-in-scale space-y-4 rounded-xl p-6">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthPageShell>
  );
}
