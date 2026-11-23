"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Clipboard write with a fallback for browsers/contexts without the async API. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * `mailto:` links silently do nothing when the visitor has no mail app set up,
 * so email buttons also copy the address and show a short confirmation.
 */
export function useCopyEmail(email: string) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    const ok = await copyText(email);
    if (ok) {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2400);
    }
    return ok;
  }, [email]);

  return { copied, copy };
}
