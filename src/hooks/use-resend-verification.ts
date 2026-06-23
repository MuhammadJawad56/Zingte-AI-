"use client";

import { useState } from "react";

export function useResendVerification(email: string) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function resend() {
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

  return { resend, message, error, loading };
}
