import type Stripe from "stripe";
import type { ApiProduct, User } from "@prisma/client";
import { prisma } from "./prisma";
import { stripe } from "./stripe";

export function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

export function getStripeSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  return {
    periodStart: item?.current_period_start ?? subscription.created,
    periodEnd: item?.current_period_end ?? subscription.billing_cycle_anchor,
  };
}

export async function getOrCreateStripeCustomer(user: User): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function ensureStripeProduct(api: ApiProduct): Promise<ApiProduct> {
  if (
    api.stripeProductId &&
    api.stripePriceMonthlyId &&
    api.stripePriceYearlyId
  ) {
    return api;
  }

  let productId = api.stripeProductId;

  if (!productId) {
    const product = await stripe.products.create({
      name: api.name,
      description: api.description.slice(0, 500),
      metadata: { apiProductId: api.id, slug: api.slug },
    });
    productId = product.id;
  }

  let monthlyPriceId = api.stripePriceMonthlyId;
  if (!monthlyPriceId) {
    const monthly = await stripe.prices.create({
      product: productId,
      unit_amount: Math.round(api.priceMonthly * 100),
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { apiProductId: api.id, billingCycle: "MONTHLY" },
    });
    monthlyPriceId = monthly.id;
  }

  let yearlyPriceId = api.stripePriceYearlyId;
  if (!yearlyPriceId) {
    const yearly = await stripe.prices.create({
      product: productId,
      unit_amount: Math.round(api.priceYearly * 100),
      currency: "usd",
      recurring: { interval: "year" },
      metadata: { apiProductId: api.id, billingCycle: "YEARLY" },
    });
    yearlyPriceId = yearly.id;
  }

  return prisma.apiProduct.update({
    where: { id: api.id },
    data: {
      stripeProductId: productId,
      stripePriceMonthlyId: monthlyPriceId,
      stripePriceYearlyId: yearlyPriceId,
    },
  });
}

export async function syncAllProductsToStripe() {
  const apis = await prisma.apiProduct.findMany({ where: { isActive: true } });
  let synced = 0;

  for (const api of apis) {
    await ensureStripeProduct(api);
    synced++;
  }

  return synced;
}

export async function activateSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription,
  userId: string,
  apiProductId: string,
  billingCycle: "MONTHLY" | "YEARLY"
) {
  const priceItem = stripeSubscription.items.data[0]?.price;
  const price = priceItem?.unit_amount ? priceItem.unit_amount / 100 : 0;
  const { periodStart, periodEnd } =
    getStripeSubscriptionPeriod(stripeSubscription);

  return prisma.subscription.upsert({
    where: {
      userId_apiProductId: { userId, apiProductId },
    },
    create: {
      userId,
      apiProductId,
      status: "ACTIVE",
      billingCycle,
      price,
      stripeSubscriptionId: stripeSubscription.id,
      expiresAt: new Date(periodEnd * 1000),
      startsAt: new Date(periodStart * 1000),
    },
    update: {
      status: "ACTIVE",
      billingCycle,
      price,
      stripeSubscriptionId: stripeSubscription.id,
      expiresAt: new Date(periodEnd * 1000),
      cancelledAt: null,
    },
  });
}

export async function cancelStripeSubscription(stripeSubscriptionId: string) {
  return stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
}
