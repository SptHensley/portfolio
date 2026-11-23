import { portfolio } from "@/data/portfolio";
import { SectionLabel, Tag, staggerStyle } from "./shared";

export function ExperienceStation() {
  const { experience, education } = portfolio;
  return (
    <div className="space-y-8">
      <div>
        <SectionLabel>WORK & LEADERSHIP</SectionLabel>
        <ol className="relative ml-2 border-l-2 border-charcoal/80">
          {experience.map((e, i) => {
            const current = e.end.toUpperCase() === "PRESENT";
            return (
              <li key={e.id} style={staggerStyle(i)} className="animate-fade-up relative pb-6 pl-6 last:pb-1">
                <span
                  aria-hidden="true"
                  className={`absolute -left-[9px] top-1 size-4 border-2 border-charcoal ${current ? "bg-safety" : "bg-white"}`}
                />
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-zinc-500">
                  <span className={current ? "bg-charcoal px-1.5 py-0.5 font-bold text-safety" : ""}>
                    {e.start} – {e.end}
                  </span>
                  {e.location && <span>· {e.location.toUpperCase()}</span>}
                </div>
                <h3 className="mt-1 font-display text-2xl font-bold uppercase leading-tight text-charcoal">{e.role}</h3>
                <p className="text-sm font-semibold text-zinc-600">{e.company}</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">{e.summary}</p>
                <ul className="mt-2 space-y-1.5">
                  {e.highlights.map((h) => (
                    <li key={h} className="flex gap-2 text-sm leading-snug text-zinc-800">
                      <span aria-hidden="true" className="mt-0.5 font-mono text-xs text-yellow-600">
                        ▸
                      </span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                {e.tech && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {e.tech.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {education.length > 0 && (
        <div>
          <SectionLabel>EDUCATION</SectionLabel>
          <ul className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
            {education.map((ed, i) => (
              <li
                key={ed.id}
                style={staggerStyle(experience.length + i)}
                className={`animate-fade-up border bg-white p-4 ${ed.current ? "border-charcoal shadow-[4px_4px_0_0_#FACC15]" : "border-charcoal/15"}`}
              >
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-zinc-500">
                  <span className={ed.current ? "bg-charcoal px-1.5 py-0.5 font-bold text-safety" : ""}>
                    {ed.start} – {ed.end}
                  </span>
                  {ed.location && <span>· {ed.location.toUpperCase()}</span>}
                </div>
                <h3 className="mt-1 font-display text-2xl font-bold uppercase leading-tight text-charcoal">{ed.school}</h3>
                <p className="text-sm font-semibold text-zinc-600">{ed.credential}</p>
                {ed.notes && (
                  <ul className="mt-2 space-y-1.5">
                    {ed.notes.map((n) => (
                      <li key={n} className="flex gap-2 text-sm leading-snug text-zinc-800">
                        <span aria-hidden="true" className="mt-0.5 font-mono text-xs text-yellow-600">
                          ▸
                        </span>
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
