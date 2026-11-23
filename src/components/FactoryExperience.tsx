"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { dispatchCrate, initRouting, returnToHub } from "@/lib/choreographer";
import { STATION_LIST } from "@/lib/layout";
import { sim } from "@/lib/sim";
import { ui, useUI } from "@/lib/store";
import { cssFontFamily } from "@/lib/textures";
import { FactoryScene } from "./scene/FactoryScene";
import { BootScreen } from "./ui/BootScreen";
import { HubPanel } from "./ui/HubPanel";
import { StationOverlay } from "./ui/StationOverlay";
import { TelemetryHUD } from "./ui/TelemetryHUD";
import { TopBar } from "./ui/TopBar";

/** Waits (briefly) for the web fonts so canvas-drawn decals use them. */
function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    const display = cssFontFamily("--font-barlow-condensed", "sans-serif");
    const mono = cssFontFamily("--font-jetbrains-mono", "monospace");
    Promise.all([
      document.fonts.load(`800 64px ${display}`),
      document.fonts.load(`700 64px ${display}`),
      document.fonts.load(`600 32px ${mono}`),
    ])
      .catch(() => undefined)
      .finally(finish);
    const timer = window.setTimeout(finish, 2500);
    return () => window.clearTimeout(timer);
  }, []);
  return ready;
}

export default function FactoryExperience() {
  const fontsReady = useFontsReady();
  const ready = useUI((s) => s.ready);

  // URL ⇄ station sync (deep links, Back/Forward).
  useEffect(() => initRouting(), []);

  // Cursor tracking for the idle arm + camera parallax.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      sim.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      sim.mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onLeave = () => {
      sim.mouse.x = 0;
      sim.mouse.y = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // Keyboard: 1–4 dispatch a crate, Esc reverses the conveyor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        returnToHub();
        return;
      }
      const n = Number.parseInt(e.key, 10);
      if (n >= 1 && n <= STATION_LIST.length && ui.get().phase === "IDLE") {
        dispatchCrate(STATION_LIST[n - 1].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-factory">
      {fontsReady && (
        <Canvas
          className="!absolute inset-0"
          shadows="percentage"
          dpr={[1, 2]}
          gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, powerPreference: "high-performance" }}
          camera={{ fov: 30, near: 0.1, far: 120, position: [0, 3, 12] }}
          aria-label="Interactive 3D robotic work cell"
        >
          <FactoryScene />
        </Canvas>
      )}

      <div className="pointer-events-none absolute inset-0">
        <TopBar />
        <HubPanel />
        <StationOverlay />
        <TelemetryHUD />
      </div>

      <BootScreen fading={ready} />
    </div>
  );
}
