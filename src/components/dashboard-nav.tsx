"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Key,
  Users,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_CONFIG: Record<
  "ADMIN" | "CUSTOMER",
  { href: string; label: string; icon: LucideIcon }[]
> = {
  ADMIN: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/apis", label: "API Catalog", icon: Package },
    { href: "/admin/subscribers", label: "Subscribers", icon: Users },
  ],
  CUSTOMER: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/apis", label: "Browse APIs", icon: Package },
    { href: "/dashboard/subscriptions", label: "Subscriptions", icon: CreditCard },
    { href: "/dashboard/tokens", label: "API Tokens", icon: Key },
  ],
};

export function DashboardNav({ role }: { role: "ADMIN" | "CUSTOMER" }) {
  const pathname = usePathname();
  const items = NAV_CONFIG[role];

  return (
    <nav className="flex-1 space-y-1 p-4">
      {items.map((item, i) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" &&
            item.href !== "/admin" &&
            pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm animate-fade-in",
              `stagger-${Math.min(i + 1, 6)}`,
              isActive
                ? "nav-link-active"
                : "text-muted hover:bg-card-hover hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isActive && "text-accent"
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
