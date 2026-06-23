import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, StatCard } from "@/components/ui";
import { Package, Users, CreditCard, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");

  const [apiCount, customerCount, activeSubs, revenue] = await Promise.all([
    prisma.apiProduct.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.aggregate({
      where: { status: "ACTIVE" },
      _sum: { price: true },
    }),
  ]);

  const recentSubs = await prisma.subscription.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, company: true } },
      apiProduct: { select: { name: true } },
    },
  });

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Admin Overview"
        description="Monitor your API marketplace performance"
      />

      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total APIs" value={apiCount} icon={Package} delay={0} />
        <StatCard title="Customers" value={customerCount} icon={Users} delay={80} />
        <StatCard
          title="Active Subscriptions"
          value={activeSubs}
          icon={CreditCard}
          delay={160}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(revenue._sum.price || 0)}
          icon={DollarSign}
          delay={240}
        />
      </div>

      <div className="glass animate-fade-in stagger-5 rounded-xl p-6" style={{ opacity: 0 }}>
        <h2 className="mb-4 text-lg font-semibold">Recent Subscriptions</h2>
        {recentSubs.length === 0 ? (
          <p className="text-sm text-muted">No subscriptions yet.</p>
        ) : (
          <div className="space-y-3">
            {recentSubs.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
              >
                <div>
                  <p className="font-medium">
                    {sub.user.name}
                    {sub.user.company && (
                      <span className="text-muted"> · {sub.user.company}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {sub.apiProduct.name} · {formatDate(sub.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(sub.price)}</p>
                  <p className="text-xs text-success">{sub.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
