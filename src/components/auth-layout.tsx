import { Zap } from "lucide-react";
import { AuthThemeToggle } from "@/components/auth-theme-toggle";

export function AuthPageShell({
  title,
  subtitle,
  children,
  footer,
  header,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  header?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <AuthThemeToggle />
      <div className="w-full max-w-md">
        {header ?? (
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
        )}
        {children}
        {footer}
      </div>
    </div>
  );
}
