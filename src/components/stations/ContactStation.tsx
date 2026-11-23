"use client";

import { Check, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { portfolio } from "@/data/portfolio";
import { copyText, useCopyEmail } from "@/lib/useCopyEmail";
import { SocialIcon } from "../ui/icons";
import { SectionLabel } from "./shared";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; via: "form" | "mail" | "mail-copied" }
  | { kind: "error"; message: string };

const SENT_MESSAGE: Record<"form" | "mail" | "mail-copied", string> = {
  form: "✓ Message sent. I'll be in touch.",
  mail: `✓ Opening your mail app. If nothing opens, email ${portfolio.contact.email}.`,
  "mail-copied": `✓ Opening your mail app. If nothing opens, your message is copied: paste it into an email to ${portfolio.contact.email}.`,
};

const inputClass =
  "w-full border-2 border-charcoal/25 bg-white px-3 py-2 text-sm text-charcoal outline-none transition-colors placeholder:text-zinc-400 focus:border-charcoal focus:shadow-[0_0_0_3px_rgb(250_204_21_/_0.6)]";

export function ContactStation() {
  const { contact, socials } = portfolio;
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const { copied, copy } = useCopyEmail(contact.email);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    if (!name || !email || !message) {
      setStatus({ kind: "error", message: "All fields are required." });
      return;
    }

    if (!contact.formEndpoint) {
      const subject = `Work order from ${name}`;
      const body = `${message}\n\n${name} (${email})`;
      // If the visitor has no mail app, mailto: does nothing, so keep a copy on the clipboard too.
      const copiedMessage = await copyText(`To: ${contact.email}\nSubject: ${subject}\n\n${body}`);
      window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setStatus({ kind: "sent", via: copiedMessage ? "mail-copied" : "mail" });
      return;
    }

    setStatus({ kind: "sending" });
    try {
      const res = await fetch(contact.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      form.reset();
      setStatus({ kind: "sent", via: "form" });
    } catch {
      setStatus({ kind: "error", message: `Transmission failed. Email ${contact.email} directly.` });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 @2xl:grid-cols-[1.4fr_1fr]">
      <div className="animate-fade-up">
        <SectionLabel>SEND A MESSAGE</SectionLabel>
        <h3 className="font-display text-3xl font-extrabold uppercase leading-none text-charcoal">{contact.headline}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-700">{contact.blurb}</p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3" noValidate>
          <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] tracking-[0.2em] text-zinc-500">NAME</span>
              <input name="name" autoComplete="name" required placeholder="Ada Lovelace" className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] tracking-[0.2em] text-zinc-500">EMAIL</span>
              <input name="email" type="email" autoComplete="email" required placeholder="ada@example.com" className={inputClass} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] tracking-[0.2em] text-zinc-500">MESSAGE</span>
            <textarea name="message" required rows={5} placeholder="Tell me about the role, project or idea…" className={`${inputClass} resize-y`} />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={status.kind === "sending"}
              className="press-button inline-flex items-center gap-2 px-5 py-2.5 font-display text-lg font-extrabold tracking-[0.08em]"
            >
              <Send className="size-4" aria-hidden="true" />
              {status.kind === "sending" ? "SENDING…" : "SEND"}
            </button>
            <p role="status" aria-live="polite" className="min-w-0 flex-1 text-sm leading-snug">
              {status.kind === "sent" && <span className="text-emerald-700">{SENT_MESSAGE[status.via]}</span>}
              {status.kind === "error" && <span className="text-red-700">✕ {status.message}</span>}
            </p>
          </div>
        </form>
      </div>

      <aside className="animate-fade-up space-y-3" style={{ animationDelay: "160ms" }}>
        <SectionLabel>ELSEWHERE</SectionLabel>
        <a
          href={`mailto:${contact.email}`}
          onClick={() => void copy()}
          title="Click to email (the address is also copied)"
          className="flex items-center justify-between gap-2 border-2 border-charcoal bg-charcoal px-3 py-3 text-zinc-50 transition-colors hover:bg-zinc-800 focus-visible:outline-3 focus-visible:outline-signal"
        >
          <span className="min-w-0 truncate font-mono text-xs tracking-[0.1em]">{contact.email}</span>
          {copied ? (
            <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] tracking-[0.14em] text-emerald-400">
              <Check className="size-3.5" aria-hidden="true" />
              COPIED
            </span>
          ) : (
            <SocialIcon kind="email" className="size-4 shrink-0 text-safety" />
          )}
        </a>
        <p role="status" aria-live="polite" className="sr-only">
          {copied ? "Email address copied to clipboard" : ""}
        </p>
        <ul className="space-y-2">
          {socials
            .filter((s) => s.kind !== "email")
            .map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target={s.href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="flex items-center justify-between border border-charcoal/20 bg-white px-3 py-2.5 transition-colors hover:border-charcoal hover:bg-safety focus-visible:outline-3 focus-visible:outline-signal"
                >
                  <span className="font-display text-lg font-bold uppercase tracking-wide">{s.label}</span>
                  <SocialIcon kind={s.kind} className="size-4" />
                </a>
              </li>
            ))}
        </ul>
        <div className="border border-dashed border-charcoal/30 p-3 font-mono text-[10px] leading-relaxed tracking-[0.12em] text-zinc-500">
          STATUS: {portfolio.availability.toUpperCase()}
          <br />
          LOCATION: {portfolio.location.toUpperCase()}
        </div>
      </aside>
    </div>
  );
}
