import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { CreateTokenForm } from "@/components/client-components";
import { formatDate } from "@/lib/utils";
import { RevokeTokenButton } from "@/components/cancel-button";

export default async function TokensPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [tokens, activeSubscriptions] = await Promise.all([
    prisma.apiToken.findMany({
      where: { userId: session.id },
      include: { apiProduct: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscription.findMany({
      where: {
        userId: session.id,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
      include: { apiProduct: { select: { name: true } } },
    }),
  ]);

  const subscriptionOptions = activeSubscriptions.map((s) => ({
    apiProductId: s.apiProductId,
    apiName: s.apiProduct.name,
  }));

  return (
    <DashboardLayout role="CUSTOMER">
      <PageHeader
        title="API Tokens"
        description="Generate and manage access tokens for your subscribed APIs"
      />

      <div className="mb-8">
        <CreateTokenForm subscriptions={subscriptionOptions} />
      </div>

      {tokens.length === 0 ? (
        <EmptyState
          title="No tokens yet"
          description="Subscribe to an API and generate a token to start making requests."
        />
      ) : (
        <div className="glass rounded-xl">
          <div className="border-b border-border px-6 py-4">
            <h3 className="font-semibold">Your Tokens</h3>
          </div>
          <div className="divide-y divide-border">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium">{token.name}</p>
                    <Badge variant={token.isActive ? "success" : "muted"}>
                      {token.isActive ? "Active" : "Revoked"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {token.apiProduct.name} ·{" "}
                    <code className="text-xs">{token.tokenPrefix}</code>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Created {formatDate(token.createdAt)}
                    {token.lastUsedAt &&
                      ` · Last used ${formatDate(token.lastUsedAt)}`}
                  </p>
                </div>
                {token.isActive && <RevokeTokenButton tokenId={token.id} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
