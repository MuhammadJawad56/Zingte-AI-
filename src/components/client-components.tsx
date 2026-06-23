"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui";
import { formatCurrency } from "@/lib/utils";
import { Copy, Check, Eye, EyeOff } from "lucide-react";

export function CopyTokenButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
        <code className="flex-1 overflow-hidden text-ellipsis text-sm font-mono">
          {visible ? token : "•".repeat(40)}
        </code>
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="rounded p-1.5 text-muted hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <Button size="sm" variant="secondary" onClick={handleCopy}>
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs text-warning">
        Save this token now — it won&apos;t be shown again.
      </p>
    </div>
  );
}

export function ApiCard({
  name,
  description,
  category,
  priceMonthly,
  priceYearly,
  features,
  isSubscribed,
  action,
  index = 0,
}: {
  name: string;
  description: string;
  category: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  isSubscribed?: boolean;
  action?: React.ReactNode;
  index?: number;
}) {
  const stagger = Math.min((index % 6) + 1, 6);

  return (
    <div
      className={`glass card-glow animate-fade-in stagger-${stagger} flex flex-col rounded-xl p-6 transition-all`}
      style={{ opacity: 0 }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-accent">
            {category}
          </span>
          <h3 className="mt-1 text-lg font-semibold">{name}</h3>
        </div>
        {isSubscribed && (
          <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
            Subscribed
          </span>
        )}
      </div>
      <p className="mb-4 flex-1 text-sm text-muted line-clamp-3">{description}</p>
      <ul className="mb-4 space-y-1">
        {features.slice(0, 3).map((f, i) => (
          <li key={`${name}-feature-${i}`} className="flex items-center gap-2 text-xs text-muted">
            <span className="h-1 w-1 rounded-full bg-accent" />
            {f}
          </li>
        ))}
      </ul>
      <div className="flex items-end justify-between border-t border-border pt-4">
        <div>
          <p className="text-2xl font-bold">
            ${priceMonthly}
            <span className="text-sm font-normal text-muted">/mo</span>
          </p>
          <p className="text-xs text-muted">
            or ${priceYearly}/yr (save{" "}
            {Math.round((1 - priceYearly / (priceMonthly * 12)) * 100)}%)
          </p>
        </div>
        {action}
      </div>
    </div>
  );
}

export function SubscribeModal({
  apiId,
  apiName,
  priceMonthly,
  priceYearly,
  onClose,
}: {
  apiId: string;
  apiName: string;
  priceMonthly: number;
  priceYearly: number;
  onClose: () => void;
}) {
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  async function handleSubscribe() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiProductId: apiId, billingCycle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  const price = billingCycle === "MONTHLY" ? priceMonthly : priceYearly;

  const modal = (
    <div className="animate-modal-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
      <div className="animate-modal-content glass w-full max-w-md overflow-hidden rounded-xl p-6">
        <h2 className="text-xl font-bold leading-snug">
          Subscribe to {apiName}
        </h2>
        <p className="mt-2 text-sm text-muted">
          Choose your billing cycle. You&apos;ll be redirected to Stripe for
          secure payment.
        </p>

        <div className="mt-6 grid min-w-0 grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setBillingCycle("MONTHLY")}
            className={`min-w-0 rounded-lg border p-3 text-left transition-colors sm:p-4 ${
              billingCycle === "MONTHLY"
                ? "border-accent bg-accent/10"
                : "border-border hover:bg-card-hover"
            }`}
          >
            <p className="text-sm font-medium">Monthly</p>
            <p className="mt-1 truncate text-base font-bold sm:text-lg">
              {formatCurrency(priceMonthly)}
              <span className="text-sm font-normal text-muted">/mo</span>
            </p>
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("YEARLY")}
            className={`min-w-0 rounded-lg border p-3 text-left transition-colors sm:p-4 ${
              billingCycle === "YEARLY"
                ? "border-accent bg-accent/10"
                : "border-border hover:bg-card-hover"
            }`}
          >
            <p className="text-sm font-medium">Yearly</p>
            <p className="mt-1 truncate text-base font-bold sm:text-lg">
              {formatCurrency(priceYearly)}
              <span className="text-sm font-normal text-muted">/yr</span>
            </p>
          </button>
        </div>

        <div className="mt-6 rounded-lg bg-card p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">Total due today</span>
            <span className="shrink-0 font-bold">{formatCurrency(price)}</span>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" className="min-w-0" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="min-w-0 px-3"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? "Redirecting..." : "Pay with Stripe"}
          </Button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}

export function CreateTokenForm({
  subscriptions,
}: {
  subscriptions: { apiProductId: string; apiName: string }[];
}) {
  const [apiProductId, setApiProductId] = useState(subscriptions[0]?.apiProductId || "");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiProductId, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create token");
      setNewToken(data.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (subscriptions.length === 0) {
    return null;
  }

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold">Generate New Token</h3>
      {newToken ? (
        <div className="mt-4">
          <CopyTokenButton token={newToken} />
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              setNewToken(null);
              setName("");
              window.location.reload();
            }}
          >
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted">API</label>
            <select
              value={apiProductId}
              onChange={(e) => setApiProductId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
            >
              {subscriptions.map((s) => (
                <option key={s.apiProductId} value={s.apiProductId}>
                  {s.apiName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted">
              Token Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production, Staging"
              required
              className="mt-1.5 w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Generating..." : "Generate Token"}
          </Button>
        </form>
      )}
    </div>
  );
}

export function SubscribeButton({
  apiId,
  apiName,
  priceMonthly,
  priceYearly,
  isSubscribed,
}: {
  apiId: string;
  apiName: string;
  priceMonthly: number;
  priceYearly: number;
  isSubscribed: boolean;
}) {
  const [showModal, setShowModal] = useState(false);

  if (isSubscribed) {
    return (
      <Button variant="secondary" size="sm" disabled>
        Subscribed
      </Button>
    );
  }

  return (
    <div className="shrink-0">
      <Button size="sm" onClick={() => setShowModal(true)}>
        Subscribe
      </Button>
      {showModal && (
        <SubscribeModal
          apiId={apiId}
          apiName={apiName}
          priceMonthly={priceMonthly}
          priceYearly={priceYearly}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
