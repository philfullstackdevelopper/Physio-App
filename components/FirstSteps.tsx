"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, ChevronRight, X } from "lucide-react";

// « Premiers pas » du kiné (Philippe, 2026-11-16) : les 3 choses à faire après
// l'inscription — un patient, ses paiements, son cabinet. Sobre, sans barre de
// progression (pas d'interface « gamifiée ») : une coche quand c'est fait. La
// carte disparaît quand tout est fait, ou quand le kiné la ferme (cookie, un an).
export const FIRST_STEPS_COOKIE = "premiers_pas_ferme";

export type FirstStep = { key: "patient" | "payments" | "cabinet"; done: boolean; href: string; label: string; hint?: string | null };

export default function FirstSteps({ steps }: { steps: FirstStep[] }) {
  const t = useTranslations("dashboard.home.firstSteps");
  const [hidden, setHidden] = useState(false);
  if (hidden || steps.every((s) => s.done)) return null;

  const close = () => {
    document.cookie = `${FIRST_STEPS_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setHidden(true);
  };

  return (
    <section
      aria-labelledby="first-steps"
      className="animate-[fadeInUp_0.6s_ease-out_both] mt-4 rounded-xl border border-line bg-surface p-4 max-sm:rounded-2xl max-sm:border-0 max-sm:shadow-soft"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="first-steps" className="text-sm font-semibold text-ink">
          {t("title")}
        </h2>
        <button type="button" onClick={close} aria-label={t("close")} className="rounded-md p-1 text-muted hover:bg-app-bg hover:text-ink">
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      <ol className="mt-2 grid gap-2 sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition ${s.done ? "border-transparent bg-app-bg" : "border-line hover:border-brand/40 hover:bg-brand-soft/40"}`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-ok text-white" : "border border-line text-transparent"}`}
                aria-hidden
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-medium ${s.done ? "text-muted line-through decoration-muted/40" : "text-ink"}`}>
                  {s.label}
                  <span className="sr-only"> — {s.done ? t("done") : t("todo")}</span>
                </span>
                {s.hint && <span className="block truncate text-xs text-muted">{s.hint}</span>}
              </span>
              {!s.done && <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
