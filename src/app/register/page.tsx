"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input, Button } from "@/components/ui";
import { AuthPageShell } from "@/components/auth-layout";
import { saveDevVerificationUrl } from "@/hooks/use-dev-verification-link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.status === 409 && data.code === "EMAIL_NOT_VERIFIED") {
        router.push(
          `/verify-email/pending?email=${encodeURIComponent(data.email)}`
        );
        return;
      }

      if (!res.ok) throw new Error(data.error);

      if (data.devVerificationUrl) {
        saveDevVerificationUrl(data.devVerificationUrl);
      }

      router.push(
        `/verify-email/pending?email=${encodeURIComponent(data.email)}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      title="Create your account"
      subtitle="Register your company to access APIs"
      footer={
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="glass animate-fade-in-scale space-y-4 rounded-xl p-6">
        <Input
          label="Full Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="John Doe"
          required
        />
        <Input
          label="Company"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          placeholder="Acme Corp"
        />
        <Input
          label="Work Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@company.com"
          required
        />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Min. 8 chars, 1 uppercase, 1 number"
          required
          minLength={8}
        />
        <p className="text-xs text-muted">
          Password must be at least 8 characters with one uppercase letter and one number.
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthPageShell>
  );
}
