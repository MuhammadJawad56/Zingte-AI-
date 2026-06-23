"use client";

import { useState } from "react";
import { Button } from "./ui";

export function CancelSubscriptionButton({
  subscriptionId,
}: {
  subscriptionId: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (
      !confirm(
        "Cancel this subscription? You'll keep access until the end of the current billing period."
      )
    )
      return;
    setLoading(true);
    await fetch(`/api/subscriptions/${subscriptionId}`, { method: "PATCH" });
    window.location.reload();
  }

  return (
    <Button variant="danger" size="sm" onClick={handleCancel} disabled={loading}>
      {loading ? "Cancelling..." : "Cancel"}
    </Button>
  );
}

export function RevokeTokenButton({ tokenId }: { tokenId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    if (!confirm("Revoke this token? It will stop working immediately.")) return;
    setLoading(true);
    await fetch(`/api/tokens/${tokenId}`, { method: "DELETE" });
    window.location.reload();
  }

  return (
    <Button variant="danger" size="sm" onClick={handleRevoke} disabled={loading}>
      {loading ? "Revoking..." : "Revoke"}
    </Button>
  );
}
