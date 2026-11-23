import { portfolio } from "@/data/portfolio";

/** Shown while the client bundle / WebGL scene boots. Server-renderable. */
export function BootScreen({ fading = false }: { fading?: boolean }) {
  return (
    <div
      aria-hidden={fading}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-factory transition-opacity duration-700 ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="w-[min(320px,80vw)]">
        <div className="mb-3 flex items-center justify-between font-mono text-[10px] tracking-[0.25em] text-zinc-500">
          <span>{portfolio.name.toUpperCase()}</span>
          <span>{portfolio.callsign}</span>
        </div>
        <div className="font-display text-3xl font-extrabold uppercase tracking-wide text-charcoal">
          Loading<span className="animate-blink">_</span>
        </div>
        <div className="relative mt-4 h-2 overflow-hidden border border-charcoal/30 bg-white/60">
          <div className="hazard-edge absolute inset-y-0 left-0 w-1/3 animate-[scan_1.4s_linear_infinite]" />
        </div>
        <div className="mt-3 font-mono text-[10px] tracking-[0.2em] text-zinc-500">
          STARTING THE 3D SCENE
        </div>
      </div>
    </div>
  );
}
