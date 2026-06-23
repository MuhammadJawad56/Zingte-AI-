import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Zap, Shield, Key, BarChart3, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  const features = [
    {
      icon: Shield,
      title: "Enterprise-Grade Security",
      description:
        "Token-based authentication with SHA-256 hashing and subscription validation on every request.",
    },
    {
      icon: Key,
      title: "API Token Management",
      description:
        "Generate, rotate, and revoke API tokens per product. Full visibility into token usage.",
    },
    {
      icon: BarChart3,
      title: "Subscription Billing",
      description:
        "Flexible monthly or yearly plans. Manage subscriptions and renewals from one dashboard.",
    },
  ];

  return (
    <div className="min-h-screen">
      <header className="glass animate-fade-in fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-md shadow-accent/25">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold">
              Zingte <span className="text-accent">API Hub</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="mesh-bg absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <h1 className="animate-slide-up text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            Zingte AI Platform
            <br />
            <span className="gradient-text">Complete API Catalog</span>
          </h1>
          <p className="animate-slide-up stagger-2 mx-auto mt-6 max-w-2xl text-lg text-muted">
            35+ fully trained, ready-to-go AI APIs — LLM, vision, generative media,
            automation, analytics, and more. Subscribe, get tokens, and integrate instantly.
          </p>
          <div className="animate-slide-up stagger-3 mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="btn-press inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-medium text-white shadow-md shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/30"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="btn-press inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium transition-all hover:bg-card-hover hover:border-accent/30"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`glass card-glow animate-fade-in stagger-${i + 1} rounded-xl p-6 transition-all`}
              style={{ opacity: 0 }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <feature.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        <p>&copy; {new Date().getFullYear()} Zingte API Hub. All rights reserved.</p>
      </footer>
    </div>
  );
}
