"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Button } from "@/components/ui";
import { AuthPageShell } from "@/components/auth-layout";
import { useResendVerification } from "@/hooks/use-resend-verification";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { resend, message: resendMsg, loading: resending } =
    useResendVerification(unverifiedEmail);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setUnverifiedEmail("");

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
            onClick={resend}
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
    <AuthPageShell
      title="Welcome back"
      subtitle="Sign in to your API Hub account"
      footer={
        <>
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
        </>
      }
    >
      <Suspense fallback={<p className="text-center text-muted">Loading...</p>}>
        <LoginForm />
      </Suspense>
    </AuthPageShell>
  );
}
