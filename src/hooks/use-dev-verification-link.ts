"use client";

import { useState } from "react";

const DEV_LINK_KEY = "zingte_dev_verification_url";

export function saveDevVerificationUrl(url: string) {
  if (typeof window !== "undefined" && url) {
    sessionStorage.setItem(DEV_LINK_KEY, url);
  }
}

export function useDevVerificationUrl() {
  const [url] = useState(() => {
    if (typeof window === "undefined") return null;
    const stored = sessionStorage.getItem(DEV_LINK_KEY);
    if (stored) sessionStorage.removeItem(DEV_LINK_KEY);
    return stored;
  });
  return url;
}
