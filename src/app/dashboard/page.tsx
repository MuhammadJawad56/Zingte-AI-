import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, StatCard } from "@/components/ui";
import { Package, CreditCard, Key, TrendingUp } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function CustomerDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [subscriptions, tokens, apis] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId: session.id, status: "ACTIVE" },
      include: { apiProduct: true },
    }),
    prisma.apiToken.count({ where: { userId: session.id, isActive: true } }),
    prisma.apiProduct.count({ where: { isActive: true } }),
  ]);

  const monthlySpend = subscriptions.reduce((sum, s) => {
    return sum + (s.billingCycle === "MONTHLY" ? s.price : s.price / 12);
  }, 0);

  return (
    <DashboardLayout role="CUSTOMER">
      <PageHeader
        title={`Welcome, ${session.name}`}
        description="Manage your API subscriptions and access tokens"
      />

      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Subscriptions"
          value={subscriptions.length}
          icon={CreditCard}
          delay={0}
        />
        <StatCard
          title="API Tokens"
          value={tokens}
          icon={Key}
          delay={80}
        />
        <StatCard
          title="Available APIs"
          value={apis}
          icon={Package}
          delay={160}
        />
        <StatCard
          title="Monthly Spend"
          value={formatCurrency(monthlySpend)}
          icon={TrendingUp}
          delay={240}
        />
      </div>

      <div className="glass animate-fade-in stagger-5 rounded-xl p-6" style={{ opacity: 0 }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Subscriptions</h2>
          <Link
            href="/dashboard/apis"
            className="text-sm text-accent hover:underline"
          >
            Browse more APIs
          </Link>
        </div>

        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted">
            No active subscriptions yet.{" "}
            <Link href="/dashboard/apis" className="text-accent hover:underline">
              Browse our API catalog
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
              >
                <div>
                  <p className="font-medium">{sub.apiProduct.name}</p>
                  <p className="text-xs text-muted">
                    {sub.billingCycle === "MONTHLY" ? "Monthly" : "Yearly"} ·
                    Renews {formatDate(sub.expiresAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(sub.price)}</p>
                  <span className="text-xs text-success">Active</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
