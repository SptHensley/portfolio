import { ExternalLink } from "lucide-react";
import { portfolio } from "@/data/portfolio";
import { GitHubIcon } from "../ui/icons";
import { SectionLabel, Tag, staggerStyle } from "./shared";

export function ProjectsStation() {
  const { projects } = portfolio;
  return (
    <div>
      <SectionLabel>SELECTED WORK</SectionLabel>
      <ul className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
        {projects.map((p, i) => (
          <li
            key={p.id}
            style={staggerStyle(i)}
            className="animate-fade-up group relative flex flex-col border border-charcoal/15 bg-white p-4 transition-shadow hover:shadow-[0_0_0_2px_#18181B]"
          >
            <div className="flex items-center justify-between gap-2 font-mono text-[10px] tracking-[0.18em] text-zinc-500">
              <span>{p.year}</span>
              <span className="flex items-center gap-2">
                {p.status && <span className="bg-charcoal px-1.5 py-0.5 font-bold text-safety">{p.status}</span>}
              </span>
            </div>
            <h3 className="mt-2 font-display text-2xl font-bold uppercase leading-tight text-charcoal">{p.title}</h3>
            <p className="mt-0.5 text-sm font-semibold text-zinc-600">{p.tagline}</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">{p.description}</p>
            {p.highlights && p.highlights.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {p.highlights.map((h) => (
                  <li key={h} className="flex gap-2 text-sm leading-snug text-zinc-800">
                    <span aria-hidden="true" className="mt-0.5 font-mono text-xs text-yellow-600">
                      ▸
                    </span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-1">
              {p.tech.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
            {(p.liveUrl || p.githubUrl) && (
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {p.liveUrl && (
                  <a
                    href={p.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 border-2 border-charcoal bg-safety px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.14em] text-charcoal transition-transform hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-signal"
                  >
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                    LIVE
                  </a>
                )}
                {p.githubUrl && (
                  <a
                    href={p.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 border-2 border-charcoal bg-charcoal px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.14em] text-zinc-50 transition-transform hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-signal"
                  >
                    <GitHubIcon className="size-3.5" />
                    GITHUB
                  </a>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
