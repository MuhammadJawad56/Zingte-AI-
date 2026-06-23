"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Button } from "@/components/ui";
import { AuthPageShell } from "@/components/auth-layout";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push("/login?reset=success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="glass rounded-xl p-6 text-center text-sm text-muted">
        Invalid reset link.{" "}
        <Link href="/forgot-password" className="text-accent hover:underline">
          Request a new one
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass animate-fade-in-scale space-y-4 rounded-xl p-6">
      <Input
        label="New password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Min. 8 chars, 1 uppercase, 1 number"
        required
        minLength={8}
      />
      <Input
        label="Confirm password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthPageShell
      title="Set new password"
      subtitle="Choose a strong password for your account"
    >
      <Suspense fallback={<p className="text-center text-muted">Loading...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthPageShell>
  );
}
