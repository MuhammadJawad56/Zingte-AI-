import Link from "next/link";
import { getSession } from "@/lib/auth";
import { ThemeToggleWithLabel } from "@/components/theme-toggle";
import { DashboardNav } from "@/components/dashboard-nav";
import {
  Zap,
  LayoutDashboard,
  Package,
  Key,
  Users,
  LogOut,
  CreditCard,
} from "lucide-react";

const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/apis", label: "API Catalog", icon: Package },
  { href: "/admin/subscribers", label: "Subscribers", icon: Users },
];

const customerNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/apis", label: "Browse APIs", icon: Package },
  { href: "/dashboard/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/dashboard/tokens", label: "API Tokens", icon: Key },
];

export async function DashboardLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "ADMIN" | "CUSTOMER";
}) {
  const session = await getSession();
  const nav = role === "ADMIN" ? adminNav : customerNav;
  const homeHref = role === "ADMIN" ? "/admin" : "/dashboard";

  return (
    <div className="flex min-h-screen">
      <aside className="animate-slide-in-left fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-card/80 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-md shadow-accent/25 transition-transform duration-300 hover:scale-105">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <Link
            href={homeHref}
            className="text-lg font-semibold transition-colors hover:text-accent"
          >
            Zingte <span className="text-accent">API Hub</span>
          </Link>
        </div>

        <DashboardNav items={nav} />

        <div className="border-t border-border p-4">
          <div className="mb-3 rounded-lg bg-card-hover/50 px-3 py-2 transition-colors">
            <p className="text-sm font-medium">{session?.name}</p>
            <p className="text-xs text-muted">{session?.email}</p>
            {session?.company && (
              <p className="text-xs text-muted">{session.company}</p>
            )}
          </div>
          <div className="mb-2">
            <ThemeToggleWithLabel />
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="btn-press flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition-all hover:bg-danger/10 hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="ml-64 flex-1">
        <div className="page-enter p-8">{children}</div>
      </main>
    </div>
  );
}
