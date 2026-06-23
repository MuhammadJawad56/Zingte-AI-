"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap } from "lucide-react";
import { Input, Button } from "@/components/ui";
import { AuthThemeToggle } from "@/components/auth-theme-toggle";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleResend() {
    if (!unverifiedEmail) return;
    setResending(true);
    setResendMsg("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResendMsg(data.message);
    } catch (e) {
      setResendMsg(e instanceof Error ? e.message : "Failed to resend");
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setUnverifiedEmail("");
    setResendMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(data.email || email);
        }
        throw new Error(data.error);
      }

      router.push(data.user.role === "ADMIN" ? "/admin" : "/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass animate-fade-in-scale space-y-4 rounded-xl p-6">
      {resetSuccess && (
        <p className="rounded-lg bg-success/10 p-3 text-sm text-success">
          Password updated. You can sign in now.
        </p>
      )}
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        required
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
      />
      <div className="text-right">
        <Link href="/forgot-password" className="text-xs text-accent hover:underline">
          Forgot password?
        </Link>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {unverifiedEmail && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          <p className="text-muted">Verify your email to sign in.</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? "Sending..." : "Resend verification email"}
          </Button>
          {resendMsg && <p className="mt-2 text-xs text-success">{resendMsg}</p>}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <AuthThemeToggle />
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Sign in to your API Hub account</p>
        </div>
        <Suspense fallback={<p className="text-center text-muted">Loading...</p>}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Register
          </Link>
        </p>
        <div className="mt-4 rounded-lg border border-border bg-card/50 p-3 text-center text-xs text-muted">
          <p className="font-medium text-foreground">Demo accounts (pre-verified)</p>
          <p className="mt-1">Admin: admin@zingte.com / admin123</p>
          <p>Customer: demo@acme.com / demo123</p>
        </div>
      </div>
    </div>
  );
}
