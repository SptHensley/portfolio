"use client";

import { useEffect, useRef } from "react";
import { STATIONS, type StationId } from "@/lib/layout";
import { useUI } from "@/lib/store";
import { useLayoutMode } from "@/lib/useLayoutMode";
import { ContactStation } from "../stations/ContactStation";
import { ExperienceStation } from "../stations/ExperienceStation";
import { ProjectsStation } from "../stations/ProjectsStation";
import { SkillsStation } from "../stations/SkillsStation";
import { ReverseConveyorButton } from "./ReverseConveyorButton";

const CONTENT: Record<StationId, () => React.ReactElement> = {
  projects: ProjectsStation,
  experience: ExperienceStation,
  skills: SkillsStation,
  contact: ContactStation,
};

/** HMI panel shown beside the parked crate once the camera arrives. */
export function StationOverlay() {
  const open = useUI((s) => s.panelOpen);
  const active = useUI((s) => s.activeStation);
  const mode = useLayoutMode();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) buttonRef.current?.focus({ preventScroll: true });
  }, [open, active]);

  if (!open || !active) return null;
  const station = STATIONS[active];
  const Content = CONTENT[active];
  const wide = mode === "wide";

  return (
    <section
      key={active}
      role="region"
      aria-labelledby="station-title"
      className={`pointer-events-auto absolute z-20 flex flex-col ${
        wide
          ? "animate-panel-in bottom-12 right-[2.5vw] top-16 w-[min(57vw,880px)]"
          : "animate-sheet-in inset-x-2 bottom-10 top-[35dvh]"
      }`}
    >
      <div className="hmi-frame flex min-h-0 flex-1 flex-col bg-zinc-50/90">
        <header className="border-b border-charcoal/15 px-4 pb-3 pt-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-zinc-500">
                <span className="inline-block size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                STATION {station.code} · CRATE DOCKED · SCAN COMPLETE
              </div>
              <h2
                id="station-title"
                className="mt-1 font-display text-3xl font-extrabold uppercase leading-none tracking-tight text-charcoal sm:text-5xl"
              >
                <span className="text-zinc-400">{`${station.code} //`}</span> {station.label}
              </h2>
            </div>
            <div className="hidden shrink-0 border-2 border-charcoal bg-safety px-2 py-1 font-mono text-[10px] font-bold tracking-[0.18em] sm:block">
              ST-{station.code}
            </div>
          </div>
          <div className="mt-3">
            <ReverseConveyorButton ref={buttonRef} compact={!wide} />
          </div>
        </header>
        <div className="thin-scroll @container min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <Content />
        </div>
      </div>
    </section>
  );
}
