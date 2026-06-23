import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Badge } from "@/components/ui";
import { formatCurrency, parseFeatures } from "@/lib/utils";
import { CreateApiForm, ToggleApiButton } from "@/components/admin-forms";

export default async function AdminApisPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");

  const apis = await prisma.apiProduct.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { subscriptions: true, apiTokens: true } },
    },
  });

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="API Catalog"
        description="Create and manage your API products"
      />

      <div className="mb-8">
        <CreateApiForm />
      </div>

      <div className="glass rounded-xl">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold">All APIs ({apis.length})</h3>
        </div>
        <div className="divide-y divide-border">
          {apis.map((api) => (
            <div key={api.id} className="px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-semibold">{api.name}</h4>
                    <Badge variant={api.isActive ? "success" : "muted"}>
                      {api.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <span className="text-xs text-muted">{api.category}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{api.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {parseFeatures(api.features).map((f) => (
                      <span
                        key={f}
                        className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-6 text-xs text-muted">
                    <span>Base URL: {api.baseUrl}</span>
                    <span>Rate limit: {api.rateLimit}/hr</span>
                    <span>
                      {api._count.subscriptions} subs · {api._count.apiTokens}{" "}
                      tokens
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {formatCurrency(api.priceMonthly)}
                    <span className="text-sm font-normal text-muted">/mo</span>
                  </p>
                  <p className="text-xs text-muted">
                    {formatCurrency(api.priceYearly)}/yr
                  </p>
                  <div className="mt-3">
                    <ToggleApiButton apiId={api.id} isActive={api.isActive} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
