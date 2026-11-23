"use client";

import { Volume2, VolumeX } from "lucide-react";
import { portfolio } from "@/data/portfolio";
import { factoryAudio } from "@/lib/audio";
import { STATIONS } from "@/lib/layout";
import { ui, useUI } from "@/lib/store";

function SoundToggle() {
  const sound = useUI((s) => s.sound);
  const toggle = async () => {
    const next = !ui.get().sound;
    ui.set({ sound: next });
    await factoryAudio.setEnabled(next);
    if (next) factoryAudio.play("blip");
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={sound}
      aria-label={sound ? "Mute factory sound" : "Enable factory sound"}
      className={`pointer-events-auto flex items-center gap-2 border-2 border-charcoal px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.18em] transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-signal ${
        sound ? "bg-charcoal text-safety" : "bg-white/70 text-charcoal hover:bg-white"
      }`}
    >
      {sound ? <Volume2 className="size-3.5" aria-hidden="true" /> : <VolumeX className="size-3.5" aria-hidden="true" />}
      SOUND: {sound ? "ON" : "OFF"}
    </button>
  );
}

/** "SKILLS & LAB" → "Skills & Lab" */
function toTitle(label: string) {
  return label.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TopBar() {
  const active = useUI((s) => s.activeStation);
  const station = active ? STATIONS[active] : null;
  return (
    <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="border-2 border-charcoal bg-charcoal px-2 py-0.5 font-display text-sm font-extrabold tracking-wider text-safety">
          {portfolio.callsign}
        </div>
        <nav aria-label="Location" className="hidden min-w-0 truncate text-[13px] font-medium text-zinc-600 sm:block">
          <span className={station ? "" : "text-charcoal"}>Home</span>
          {station && (
            <>
              <span className="mx-2 text-zinc-400">/</span>
              <span className="text-charcoal">{toTitle(station.label)}</span>
            </>
          )}
        </nav>
      </div>
      <SoundToggle />
    </header>
  );
}
