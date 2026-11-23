import type { ReactNode } from "react";

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center border border-charcoal/20 bg-white px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-zinc-700">
      {children}
    </span>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3 font-mono text-[10px] tracking-[0.22em] text-zinc-500">
      <span className="shrink-0">{children}</span>
      <span className="h-px flex-1 bg-charcoal/15" />
      {right && <span className="shrink-0">{right}</span>}
    </div>
  );
}

export function staggerStyle(i: number) {
  return { animationDelay: `${120 + i * 70}ms` };
}
