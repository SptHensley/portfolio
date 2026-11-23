"use client";

import { useEffect, useRef } from "react";
import { sim } from "@/lib/sim";
import { useUI } from "@/lib/store";

const JOINTS = ["j1", "j2", "j3", "j4", "j5", "j6"] as const;
const DEG = 180 / Math.PI;

/**
 * Live telemetry strip. Values are written straight to the DOM at ~15 Hz from
 * a rAF loop (no React re-renders); only the phase/status come from the store.
 */
export function TelemetryHUD() {
  const phase = useUI((s) => s.phase);
  const status = useUI((s) => s.status);
  const jointRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const convRef = useRef<HTMLSpanElement>(null);
  const vacRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 66) return;
      last = now;
      JOINTS.forEach((k, i) => {
        const el = jointRefs.current[i];
        if (!el) return;
        const deg = sim.arm.joints[k] * DEG;
        el.textContent = `${deg >= 0 ? "+" : "−"}${Math.abs(deg).toFixed(1).padStart(5, "0")}°`;
      });
      if (convRef.current) {
        const v = sim.belt.velocity;
        convRef.current.textContent = `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)} m/s`;
        convRef.current.dataset.moving = Math.abs(v) > 0.02 ? "true" : "false";
      }
      if (vacRef.current) {
        const kpa = -sim.arm.suction * 78;
        vacRef.current.textContent = `${kpa.toFixed(0).padStart(3, " ")} kPa`;
        vacRef.current.dataset.on = sim.arm.suction > 0.5 ? "true" : "false";
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const busy = phase !== "IDLE" && phase !== "AT_SECTION";

  return (
    <footer
      aria-label="Cell telemetry"
      className="absolute inset-x-0 bottom-0 z-30 flex items-stretch overflow-hidden border-t border-safety/40 bg-charcoal/92 font-mono text-[10px] tracking-[0.12em] text-zinc-300 backdrop-blur sm:text-[11px]"
    >
      <div className="hazard-edge w-2 shrink-0" aria-hidden="true" />
      <div className="flex shrink-0 items-center gap-2 border-r border-white/10 px-3 py-2">
        <span
          className={`inline-block size-2 rounded-full ${busy ? "animate-blink bg-amber-400" : phase === "AT_SECTION" ? "bg-cyan-400" : "bg-emerald-400"}`}
        />
        <span className="font-bold text-safety">{phase.replace("_", " ")}</span>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
      <div className="flex min-w-0 flex-1 items-center gap-4 overflow-hidden px-3">
        {JOINTS.map((k, i) => (
          <span key={k} className={`whitespace-nowrap ${i >= 3 ? "hidden lg:inline" : ""}`}>
            <span className="text-zinc-500">{k.toUpperCase()}</span>{" "}
            <span ref={(el) => void (jointRefs.current[i] = el)} className="tabular-nums text-zinc-100">
              +000.0°
            </span>
          </span>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-3 border-l border-white/10 px-3">
        <span className="whitespace-nowrap">
          <span className="text-zinc-500">BELT</span>{" "}
          <span ref={convRef} className="tabular-nums text-zinc-100 data-[moving=true]:text-safety">
            +0.00 m/s
          </span>
        </span>
        <span className="hidden whitespace-nowrap sm:inline">
          <span className="text-zinc-500">VAC</span>{" "}
          <span ref={vacRef} className="tabular-nums text-zinc-100 data-[on=true]:text-signal">
            0 kPa
          </span>
        </span>
      </div>
    </footer>
  );
}
