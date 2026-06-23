export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function getFrontendUrl(): string {
  return (
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

export function getAppUrl(): string {
  return (
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    `http://localhost:${process.env.PORT || 4000}`
  );
}

export function getBackendUrl(): string {
  return (
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    `http://localhost:${process.env.PORT || 4000}`
  );
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseFeatures(features: string): string[] {
  try {
    return JSON.parse(features) as string[];
  } catch {
    return features.split(",").map((f) => f.trim()).filter(Boolean);
  }
}
