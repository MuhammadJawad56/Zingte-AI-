import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function AdminSubscribersPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: {
      subscriptions: {
        include: { apiProduct: { select: { name: true } } },
      },
      apiTokens: { where: { isActive: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Subscribers"
        description="View all B2B customers and their subscriptions"
      />

      {customers.length === 0 ? (
        <p className="text-sm text-muted">No customers registered yet.</p>
      ) : (
        <div className="space-y-4">
          {customers.map((customer) => (
            <div key={customer.id} className="glass rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{customer.name}</h3>
                  <p className="text-sm text-muted">{customer.email}</p>
                  {customer.company && (
                    <p className="text-sm text-muted">{customer.company}</p>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    Joined {formatDate(customer.createdAt)} ·{" "}
                    {customer.apiTokens.length} active tokens
                  </p>
                </div>
                <Badge variant="default">
                  {customer.subscriptions.filter((s) => s.status === "ACTIVE").length}{" "}
                  active subs
                </Badge>
              </div>

              {customer.subscriptions.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-border pt-4">
                  {customer.subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between rounded-lg bg-card p-3 text-sm"
                    >
                      <span>{sub.apiProduct.name}</span>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            sub.status === "ACTIVE" ? "success" : "muted"
                          }
                        >
                          {sub.status}
                        </Badge>
                        <span className="font-medium">
                          {formatCurrency(sub.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
