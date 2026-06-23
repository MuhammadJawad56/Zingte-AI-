"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function DashboardNav({
  items,
}: {
  items: { href: string; label: string; icon: LucideIcon }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 p-4">
      {items.map((item, i) => {
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
            <item.icon
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
