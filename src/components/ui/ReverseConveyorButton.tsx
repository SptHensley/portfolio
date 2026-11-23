"use client";

import { RotateCcw } from "lucide-react";
import { forwardRef } from "react";
import { returnToHub } from "@/lib/choreographer";
import { useUI } from "@/lib/store";

/** Big tactile push-button shown on every station. */
export const ReverseConveyorButton = forwardRef<HTMLButtonElement, { compact?: boolean }>(
  function ReverseConveyorButton({ compact = false }, ref) {
    const busy = useUI((s) => s.busy);
    const open = useUI((s) => s.panelOpen);
    return (
      <button
        ref={ref}
        type="button"
        onClick={returnToHub}
        disabled={busy || !open}
        aria-keyshortcuts="Escape"
        className={`press-button group flex w-full items-center gap-3 text-left ${compact ? "px-3 py-2" : "px-4 py-3"}`}
      >
        <span
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center rounded-full border-2 border-charcoal bg-charcoal text-safety transition-transform duration-300 group-hover:-rotate-90 ${
            compact ? "size-7" : "size-9"
          }`}
        >
          <RotateCcw className={compact ? "size-3.5" : "size-4"} strokeWidth={2.5} />
        </span>
        <span className="flex min-w-0 flex-col leading-none">
          <span className={`font-display font-extrabold tracking-[0.04em] ${compact ? "text-[15px]" : "text-lg sm:text-xl"}`}>
            ◄ REVERSE CONVEYOR · RETURN TO HUB
          </span>
          <span className="mt-1 font-mono text-[10px] tracking-[0.16em] text-charcoal/70">
            OR PRESS ESC
          </span>
        </span>
        <span aria-hidden="true" className="hazard-edge ml-auto hidden h-8 w-6 shrink-0 border border-charcoal sm:block" />
      </button>
    );
  },
);
