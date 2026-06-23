import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CancelSubscriptionButton } from "@/components/cancel-button";
import {
  CheckoutSuccessHandler,
  BillingPortalButton,
} from "@/components/stripe-components";

export default async function SubscriptionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: session.id },
    include: { apiProduct: true },
    orderBy: { createdAt: "desc" },
  });

  const statusVariant = {
    ACTIVE: "success" as const,
    CANCELLED: "danger" as const,
    EXPIRED: "muted" as const,
    PENDING: "warning" as const,
  };

  const hasStripeBilling = subscriptions.some((s) => s.stripeSubscriptionId);

  return (
    <DashboardLayout role="CUSTOMER">
      <PageHeader
        title="Subscriptions"
        description="View and manage your API subscriptions"
        action={hasStripeBilling ? <BillingPortalButton /> : undefined}
      />

      <CheckoutSuccessHandler />

      {subscriptions.length === 0 ? (
        <EmptyState
          title="No subscriptions yet"
          description="Browse our API catalog and subscribe to get started."
          action={
            <a
              href="/dashboard/apis"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              Browse APIs
            </a>
          }
        />
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="glass flex items-center justify-between rounded-xl p-6"
            >
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{sub.apiProduct.name}</h3>
                  <Badge variant={statusVariant[sub.status]}>{sub.status}</Badge>
                  {sub.cancelledAt && sub.status === "ACTIVE" && (
                    <Badge variant="warning">Cancels soon</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {sub.apiProduct.category} ·{" "}
                  {sub.billingCycle === "MONTHLY" ? "Monthly" : "Yearly"} billing
                </p>
                <p className="mt-2 text-xs text-muted">
                  Started {formatDate(sub.startsAt)} ·{" "}
                  {sub.status === "ACTIVE"
                    ? sub.cancelledAt
                      ? `Access until ${formatDate(sub.expiresAt)}`
                      : `Renews ${formatDate(sub.expiresAt)}`
                    : sub.status === "PENDING"
                      ? "Awaiting payment"
                      : sub.cancelledAt
                        ? `Cancelled ${formatDate(sub.cancelledAt)}`
                        : `Expired ${formatDate(sub.expiresAt)}`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xl font-bold">{formatCurrency(sub.price)}</p>
                {sub.status === "ACTIVE" && !sub.cancelledAt && (
                  <CancelSubscriptionButton subscriptionId={sub.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
