import { ClientApp } from "@/components/ClientApp";
import { portfolio } from "@/data/portfolio";

/**
 * Server component. The interactive factory is client-only (loaded through
 * next/dynamic with ssr:false inside ClientApp), so this page also renders a
 * semantic text version for crawlers and visitors without JavaScript.
 */
export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <h1 className="sr-only">
        {portfolio.name} | {portfolio.title}
      </h1>
      <ClientApp />
      <noscript>
        <div className="mx-auto max-w-3xl space-y-6 p-8">
          <p className="font-display text-5xl font-extrabold uppercase">{portfolio.name}</p>
          <p className="font-mono text-sm uppercase tracking-widest">{portfolio.title}</p>
          <p>{portfolio.bio}</p>
          <h2 className="font-display text-2xl font-bold uppercase">Projects</h2>
          <ul className="list-disc pl-6">
            {portfolio.projects.map((p) => (
              <li key={p.id}>
                <strong>{p.title}</strong>: {p.tagline}
              </li>
            ))}
          </ul>
          <h2 className="font-display text-2xl font-bold uppercase">Experience</h2>
          <ul className="list-disc pl-6">
            {portfolio.experience.map((e) => (
              <li key={e.id}>
                {e.role} @ {e.company} ({e.start}–{e.end})
              </li>
            ))}
          </ul>
          <p>
            Contact: <a href={`mailto:${portfolio.contact.email}`}>{portfolio.contact.email}</a>
          </p>
        </div>
      </noscript>
    </main>
  );
}
