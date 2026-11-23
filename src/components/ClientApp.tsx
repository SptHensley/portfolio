"use client";

import dynamic from "next/dynamic";
import { BootScreen } from "./ui/BootScreen";

/**
 * Everything that touches Three.js, WebGL, Web Audio or `window` is loaded
 * client-side only. `ssr: false` must live in a Client Component (Next 16),
 * which is why this thin wrapper exists — it keeps `next build` free of
 * "window is not defined" errors on Vercel.
 */
const FactoryExperience = dynamic(() => import("./FactoryExperience"), {
  ssr: false,
  loading: () => <BootScreen />,
});

export function ClientApp() {
  return <FactoryExperience />;
}
