"use client";

import { useSyncExternalStore } from "react";
import { layoutFor, type LayoutMode } from "./framing";

function subscribe(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

/** Same breakpoint logic as the 3D camera framing, so HTML and 3D agree. */
export function useLayoutMode(): LayoutMode {
  return useSyncExternalStore(
    subscribe,
    () => layoutFor(window.innerWidth, window.innerHeight),
    () => "wide",
  );
}
