"use client";

import { useState } from "react";
import { Button, Input, Textarea } from "./ui";
import { Plus } from "lucide-react";

export function CreateApiForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    baseUrl: "",
    version: "v1",
    priceMonthly: "",
    priceYearly: "",
    rateLimit: "1000",
    features: "",
    documentation: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/apis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          priceMonthly: parseFloat(form.priceMonthly),
          priceYearly: parseFloat(form.priceYearly),
          rateLimit: parseInt(form.rateLimit),
          features: form.features.split(",").map((f) => f.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create API");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add New API
      </Button>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="mb-4 text-lg font-semibold">Create New API Product</h3>
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        <Input
          label="API Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Weather Data API"
          required
        />
        <Input
          label="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          placeholder="Data & Analytics"
          required
        />
        <div className="md:col-span-2">
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe what this API does..."
            rows={3}
            required
          />
        </div>
        <Input
          label="Base URL"
          value={form.baseUrl}
          onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
          placeholder="https://api.example.com"
          required
        />
        <Input
          label="Version"
          value={form.version}
          onChange={(e) => setForm({ ...form, version: e.target.value })}
        />
        <Input
          label="Monthly Price ($)"
          type="number"
          step="0.01"
          value={form.priceMonthly}
          onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })}
          required
        />
        <Input
          label="Yearly Price ($)"
          type="number"
          step="0.01"
          value={form.priceYearly}
          onChange={(e) => setForm({ ...form, priceYearly: e.target.value })}
          required
        />
        <Input
          label="Rate Limit (req/hr)"
          type="number"
          value={form.rateLimit}
          onChange={(e) => setForm({ ...form, rateLimit: e.target.value })}
        />
        <Input
          label="Features (comma-separated)"
          value={form.features}
          onChange={(e) => setForm({ ...form, features: e.target.value })}
          placeholder="Real-time data, JSON response, 99.9% uptime"
          required
        />
        <div className="md:col-span-2">
          <Input
            label="Documentation URL (optional)"
            value={form.documentation}
            onChange={(e) => setForm({ ...form, documentation: e.target.value })}
            placeholder="https://docs.example.com"
          />
        </div>
        {error && (
          <p className="text-sm text-danger md:col-span-2">{error}</p>
        )}
        <div className="flex gap-3 md:col-span-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create API"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ToggleApiButton({
  apiId,
  isActive,
}: {
  apiId: string;
  isActive: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    await fetch(`/api/apis/${apiId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    window.location.reload();
  }

  return (
    <Button
      variant={isActive ? "danger" : "primary"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? "..." : isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
