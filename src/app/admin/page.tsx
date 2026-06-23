import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, StatCard } from "@/components/ui";
import { Package, Users, CreditCard, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getAdminStats } from "@/lib/subscription-jobs";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");

  const stats = await getAdminStats();

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Admin Overview"
        description="Monitor your API marketplace performance"
      />

      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active APIs" value={stats.apis} icon={Package} delay={0} />
        <StatCard title="Customers" value={stats.customers} icon={Users} delay={80} />
        <StatCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions}
          icon={CreditCard}
          delay={160}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          delay={240}
        />
      </div>

      <div className="glass animate-fade-in stagger-5 rounded-xl p-6" style={{ opacity: 0 }}>
        <h2 className="mb-4 text-lg font-semibold">Recent Subscriptions</h2>
        {stats.recentSubscriptions.length === 0 ? (
          <p className="text-sm text-muted">No subscriptions yet.</p>
        ) : (
          <div className="space-y-3">
            {stats.recentSubscriptions.slice(0, 5).map((sub) => (
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
