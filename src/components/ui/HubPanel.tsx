"use client";

import { Check, MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { portfolio } from "@/data/portfolio";
import { dispatchCrate } from "@/lib/choreographer";
import { STATION_LIST } from "@/lib/layout";
import { sim } from "@/lib/sim";
import { ui, useUI } from "@/lib/store";
import { useCopyEmail } from "@/lib/useCopyEmail";
import { useLayoutMode } from "@/lib/useLayoutMode";
import { SocialIcon } from "./icons";

const email = portfolio.contact.email;

/**
 * Bio text in a height-capped scroll box. On tall screens it shows in full;
 * on short screens it scrolls, with a fade + hint while there is more below.
 */
function ScrollableBio({ wide }: { wide: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  const measure = useCallback(() => {
    const el = box.current;
    if (!el) return;
    setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 2);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // The text itself can reflow (web font swap, window resize) without the box changing size.
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div className="relative">
      <div
        ref={box}
        onScroll={measure}
        tabIndex={0}
        aria-label="Bio"
        className={`thin-scroll overflow-y-auto overscroll-contain pr-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${
          wide ? "max-h-[max(5.5rem,24vh)]" : "max-h-[5.4rem]"
        }`}
        style={more ? { maskImage: "linear-gradient(to bottom, #000 70%, transparent)" } : undefined}
      >
        <p
          className={`text-zinc-800 ${
            wide
              ? "text-[15px] leading-relaxed xl:text-base [@media(max-height:760px)]:text-sm"
              : "text-[13px] leading-snug"
          }`}
        >
          {portfolio.bio}
        </p>
      </div>
      {more && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-3 bg-zinc-50/90 px-1 font-mono text-[9px] tracking-[0.18em] text-zinc-500"
        >
          SCROLL ▾
        </span>
      )}
    </div>
  );
}

export function HubPanel() {
  const { copied, copy } = useCopyEmail(email);
  const phase = useUI((s) => s.phase);
  const busy = useUI((s) => s.busy);
  const hovered = useUI((s) => s.hovered);
  const mode = useLayoutMode();
  const atHub = !(phase === "CONVEYING_OUT" || phase === "AT_SECTION" || phase === "REVERSING");
  const wide = mode === "wide";
  const section = useRef<HTMLElement>(null);

  // Report where the panel ends so the stacked camera framing can use the space below it.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const report = () => {
      sim.layout.hubPanelBottom = el.getBoundingClientRect().bottom / window.innerHeight;
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    window.addEventListener("resize", report);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", report);
    };
  }, [mode]);

  return (
    <section
      ref={section}
      aria-label="Operator profile"
      aria-hidden={!atHub}
      inert={!atHub}
      className={`absolute z-20 transition-all duration-500 ease-out ${
        wide ? "right-[4vw] top-[max(4rem,13vh)] w-[min(41vw,600px)]" : "inset-x-3 top-14"
      } ${atHub ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"}`}
    >
      <div
        className={`mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-zinc-600 sm:text-[11px] ${
          wide ? "" : "[@media(max-height:720px)]:hidden"
        }`}
      >
        <span className="inline-block size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
        {`OPERATOR PROFILE // ${portfolio.callsign} // ONLINE`}
      </div>

      <p
        aria-hidden="true"
        className={`font-display font-extrabold uppercase leading-[0.86] tracking-[-0.01em] text-charcoal ${
          wide ? "text-[clamp(2.2rem,min(6vw,10.5vh),6.4rem)]" : "text-[clamp(2.1rem,10.5vw,3.4rem)]"
        }`}
      >
        {portfolio.name}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center bg-charcoal px-3 py-1 font-display font-bold uppercase tracking-[0.14em] text-safety ${
            wide ? "text-[clamp(0.85rem,min(1.4vw,2.4vh),1.25rem)]" : "text-sm"
          }`}
        >
          {portfolio.title}
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.16em] text-zinc-600 sm:text-[11px]">
          <MapPin className="size-3" aria-hidden="true" />
          {portfolio.location.toUpperCase()}
        </span>
      </div>

      <div className={`hmi-frame pointer-events-auto mt-4 ${wide ? "p-5 [@media(max-height:760px)]:p-3" : "p-3"}`}>
        <div className="mb-2 flex items-center justify-between gap-4 font-mono text-[10px] tracking-[0.2em] text-zinc-500">
          <span className="shrink-0">BIO.TXT</span>
          <span className="hidden truncate sm:inline">{portfolio.availability.toUpperCase()}</span>
        </div>
        <ScrollableBio wide={wide} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {portfolio.socials.map((s) => {
            const isEmail = s.kind === "email";
            const showCopied = isEmail && copied;
            return (
              <a
                key={s.kind + s.href}
                href={s.href}
                target={s.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                aria-label={isEmail ? `Email ${email} (also copies the address)` : s.label}
                title={isEmail ? `${email}: click to email or copy` : undefined}
                onClick={isEmail ? () => void copy() : undefined}
                className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-charcoal transition-colors hover:border-charcoal hover:bg-safety focus-visible:outline-2 focus-visible:outline-signal ${
                  showCopied ? "border-emerald-600 bg-emerald-50" : "border-charcoal/20 bg-white/70"
                }`}
              >
                {showCopied ? (
                  <Check className="size-3.5 text-emerald-700" aria-hidden="true" />
                ) : (
                  <SocialIcon kind={s.kind} className="size-3.5" />
                )}
                <span className={wide ? "" : "sr-only"}>{showCopied ? "COPIED" : s.label.toUpperCase()}</span>
              </a>
            );
          })}
        </div>
        <p role="status" aria-live="polite" className={copied ? "mt-2 font-mono text-[10px] tracking-[0.14em] text-emerald-700" : "sr-only"}>
          {copied ? `✓ ${email} COPIED TO CLIPBOARD` : ""}
        </p>
      </div>

      <div className="pointer-events-auto mt-4 [@media(max-height:500px)]:hidden">
        <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-[0.2em] text-zinc-600">
          <span>{wide ? "◄ CLICK A CRATE ON THE PALLET, OR DISPATCH:" : "TAP A CRATE OR DISPATCH:"}</span>
          {busy && <span className="animate-blink text-charcoal">CELL BUSY</span>}
        </div>
        <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-4">
          {STATION_LIST.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy || phase !== "IDLE"}
              onClick={() => dispatchCrate(s.id)}
              onMouseEnter={() => !busy && ui.set({ hovered: s.id })}
              onMouseLeave={() => ui.get().hovered === s.id && ui.set({ hovered: null })}
              onFocus={() => !busy && ui.set({ hovered: s.id })}
              onBlur={() => ui.get().hovered === s.id && ui.set({ hovered: null })}
              aria-label={`Dispatch crate ${s.code}: ${s.label}`}
              aria-keyshortcuts={String(s.index + 1)}
              className={`group flex items-center justify-between gap-1 border-2 border-charcoal px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-signal ${
                hovered === s.id ? "bg-safety" : "bg-white/75 hover:bg-safety"
              }`}
            >
              <span className="flex flex-col leading-none">
                <span className="font-mono text-[10px] text-zinc-600">{`${s.code} //`}</span>
                <span className="font-display text-sm font-bold tracking-wide">{s.label}</span>
              </span>
              <span aria-hidden="true" className="font-mono text-xs transition-transform group-hover:translate-x-0.5">
                ▸
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
