import { portfolio } from "@/data/portfolio";
import { SectionLabel, staggerStyle } from "./shared";

const SEGMENTS = 20;

function SegmentBar({ level }: { level: number }) {
  const filled = Math.round((Math.max(0, Math.min(100, level)) / 100) * SEGMENTS);
  return (
    <div className="flex gap-[2px]" aria-hidden="true">
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 flex-1 ${i < filled ? (i >= SEGMENTS - 3 ? "bg-charcoal" : "bg-safety") : "bg-charcoal/10"}`}
        />
      ))}
    </div>
  );
}

export function SkillsStation() {
  const { skillGroups, lab, labTitle } = portfolio;
  const rated = skillGroups.some((g) => g.skills.some((s) => typeof s.level === "number"));
  const total = skillGroups.reduce((n, g) => n + g.skills.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel right={rated ? "LOAD %" : `${total} MODULES ONLINE`}>CAPABILITY MATRIX</SectionLabel>
        <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
          {skillGroups.map((g, gi) => (
            <section
              key={g.id}
              style={staggerStyle(gi)}
              aria-label={g.label}
              className={`animate-fade-up border border-charcoal/15 bg-white p-4 ${
                gi === skillGroups.length - 1 && skillGroups.length % 2 === 1 ? "@xl:col-span-2" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold uppercase text-charcoal">{g.label}</h3>
                <span className="font-mono text-[10px] tracking-[0.18em] text-zinc-400">
                  GRP-{String(gi + 1).padStart(2, "0")}
                </span>
              </div>
              <ul className={typeof g.skills[0]?.level === "number" ? "mt-3 space-y-2.5" : "mt-3 flex flex-wrap gap-1.5"}>
                {g.skills.map((s) =>
                  typeof s.level === "number" ? (
                    <li key={s.name}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                        <span className="font-semibold text-zinc-800">{s.name}</span>
                        <span className="font-mono text-[11px] tabular-nums text-zinc-500">{s.level}%</span>
                      </div>
                      <SegmentBar level={s.level} />
                    </li>
                  ) : (
                    <li
                      key={s.name}
                      className="flex items-center gap-2 border border-charcoal/20 bg-zinc-50 px-2.5 py-1.5 text-sm font-semibold text-zinc-800"
                    >
                      <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                      {s.name}
                    </li>
                  ),
                )}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {lab.length > 0 && (
        <div>
          <SectionLabel right={`${lab.length} ENTRIES`}>{labTitle}</SectionLabel>
          <div className="border border-charcoal/15 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-charcoal font-mono text-[10px] tracking-[0.18em] text-safety">
                  <th scope="col" className="px-3 py-2 font-bold">
                    ITEM
                  </th>
                  <th scope="col" className="px-3 py-2 font-bold">
                    DETAIL
                  </th>
                </tr>
              </thead>
              <tbody>
                {lab.map((item, i) => (
                  <tr key={item.name} className={i % 2 ? "bg-zinc-50" : ""}>
                    <td className="px-3 py-2 font-semibold text-zinc-800">{item.name}</td>
                    <td className="px-3 py-2 text-zinc-600">{item.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
