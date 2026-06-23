import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/ui";
import { ApiCard, SubscribeButton } from "@/components/client-components";
import { parseFeatures } from "@/lib/utils";
import { activeSubscriptionWhere } from "@/lib/subscriptions";

export default async function BrowseApisPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [apis, subscriptions] = await Promise.all([
    prisma.apiProduct.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.subscription.findMany({
      where: { userId: session.id, ...activeSubscriptionWhere() },
      select: { apiProductId: true },
    }),
  ]);

  const subscribedIds = new Set(subscriptions.map((s) => s.apiProductId));

  return (
    <DashboardLayout role="CUSTOMER">
      <PageHeader
        title="API Catalog"
        description="Browse and subscribe to enterprise APIs"
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {apis.map((api, i) => (
          <ApiCard
            key={api.id}
            index={i}
            name={api.name}
            description={api.description}
            category={api.category}
            priceMonthly={api.priceMonthly}
            priceYearly={api.priceYearly}
            features={parseFeatures(api.features)}
            isSubscribed={subscribedIds.has(api.id)}
            action={
              <SubscribeButton
                key={api.id}
                apiId={api.id}
                apiName={api.name}
                priceMonthly={api.priceMonthly}
                priceYearly={api.priceYearly}
                isSubscribed={subscribedIds.has(api.id)}
              />
            }
          />
        ))}
      </div>
    </DashboardLayout>
  );
}
