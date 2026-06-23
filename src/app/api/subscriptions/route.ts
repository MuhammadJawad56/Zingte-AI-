import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { cancelStripeSubscription } from "@/lib/stripe-subscriptions";

const subscribeSchema = z.object({
  apiProductId: z.string(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where = session.role === "ADMIN" ? {} : { userId: session.id };

  const subscriptions = await prisma.subscription.findMany({
    where,
    include: {
      apiProduct: true,
      user: session.role === "ADMIN"
        ? { select: { id: true, name: true, email: true, company: true } }
        : false,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(subscriptions);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    subscribeSchema.parse(body);

    return NextResponse.json(
      {
        error: "Use Stripe checkout",
        redirect: "/api/stripe/checkout",
      },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }
}
