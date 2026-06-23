"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

function useThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const toggle = () => setTheme(isDark ? "light" : "dark");

  return { mounted, isDark, toggle, resolvedTheme };
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { mounted, isDark, toggle, resolvedTheme } = useThemeToggle();

  if (!mounted) {
    return (
      <button
        type="button"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card",
          className
        )}
        aria-label="Toggle theme"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "btn-press flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition-all duration-300 hover:border-accent/40 hover:bg-card-hover hover:text-accent hover:shadow-md",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span key={resolvedTheme} className="inline-flex animate-fade-in-scale">
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
    </button>
  );
}

export function ThemeToggleWithLabel() {
  const { mounted, isDark, toggle, resolvedTheme } = useThemeToggle();

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn-press nav-link flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition-all hover:bg-card-hover hover:text-foreground"
    >
      <span key={resolvedTheme} className="inline-flex">
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}
