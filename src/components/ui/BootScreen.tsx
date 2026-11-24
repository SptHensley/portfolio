"use client";

import { useLayoutEffect, useRef } from "react";
import { portfolio } from "@/data/portfolio";

/**
 * When the first boot screen's fill started (document timeline, ms). The
 * next/dynamic fallback and the one FactoryExperience renders replace each
 * other mid-load, so a later instance jumps its fill to the same point
 * instead of starting over from empty.
 */
const bootClock: { start: number | null } = { start: null };

const FILL_ANIMATIONS = new Set(["boot-fill", "boot-fill-counter"]);

function fillAnimations(root: HTMLElement) {
  return root
    .getAnimations({ subtree: true })
    .filter((a): a is CSSAnimation => a instanceof CSSAnimation && FILL_ANIMATIONS.has(a.animationName));
}

/** Glide an element from wherever its fill animation is now to fully open. */
function finishFill(el: HTMLElement, duration: number) {
  const tx = new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;
  el.style.animation = "none";
  el.style.transform = "none";
  el.animate([{ transform: `translateX(${tx}px)` }, { transform: "translateX(0px)" }], {
    duration,
    easing: "cubic-bezier(0.3, 0.7, 0.3, 1)",
  });
}

/** Shown while the client bundle / WebGL scene boots. */
export function BootScreen({ fading = false }: { fading?: boolean }) {
  const fill = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLDivElement>(null);

  // The fill runs as CSS transform animations (compositor thread), so it keeps
  // moving even while the main thread is busy parsing chunks or compiling shaders.
  useLayoutEffect(() => {
    const root = fill.current;
    if (!root) return;
    const anims = fillAnimations(root);
    const now = performance.now();
    if (bootClock.start === null) {
      const started = anims[0]?.startTime;
      bootClock.start = typeof started === "number" ? started : now;
    } else {
      for (const a of anims) a.currentTime = now - bootClock.start;
    }
  }, []);

  // Scene is ready: run the rest of the way before the screen fades.
  useLayoutEffect(() => {
    if (!fading || !fill.current || !counter.current) return;
    finishFill(fill.current, 300);
    finishFill(counter.current, 300);
  }, [fading]);

  return (
    <div
      aria-hidden={fading}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-factory transition-opacity duration-700 ${
        fading ? "pointer-events-none opacity-0 delay-300" : "opacity-100"
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
        <div
          role="progressbar"
          aria-label="Loading the 3D scene"
          className="relative mt-4 h-2.5 overflow-hidden border border-charcoal/30 bg-white/60"
        >
          {/* Fill slides in from the left; the counter layer cancels that slide so the stripes stay put. */}
          <div ref={fill} className="boot-bar absolute inset-0 overflow-hidden">
            <div ref={counter} className="boot-bar__counter absolute inset-0">
              <div className="boot-bar__stripes absolute inset-y-0 left-[-28px] right-0" />
            </div>
          </div>
        </div>
        <div className="mt-3 font-mono text-[10px] tracking-[0.2em] text-zinc-500">
          STARTING THE 3D SCENE
        </div>
      </div>
    </div>
  );
}
