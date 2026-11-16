"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Pencil } from "lucide-react";

// « Votre nom » dans Mes informations (Philippe, 2026-11-16) : le nom que
// voient les patients et qui figure sur les notes d'honoraires. Avant, il
// n'était jamais demandé (il valait souvent le début de l'e-mail) et ne
// pouvait pas être corrigé.
export default function KineNameForm({
  fullName,
  action,
}: {
  fullName: string | null;
  action: (formData: FormData) => Promise<{ ok: true } | { error: string }>;
}) {
  const t = useTranslations("dashboard.infos.name");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const [first, ...rest] = (fullName ?? "").trim().split(/\s+/);
  const field =
    "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft";

  if (!editing) {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface px-5 py-3 shadow-soft">
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted">{t("label")}</span>
          <span className="block truncate font-medium text-ink">{fullName || t("empty")}</span>
        </span>
        {saved && <Check className="h-4 w-4 shrink-0 text-ok" strokeWidth={2} aria-label={t("saved")} />}
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setSaved(false);
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-brand hover:bg-brand-soft"
        >
          <Pencil className="h-4 w-4" strokeWidth={1.75} />
          {t("edit")}
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-3 rounded-2xl bg-surface px-5 py-4 shadow-soft"
      action={(formData) =>
        start(async () => {
          const res = await action(formData);
          if ("error" in res) {
            setError(res.error);
            return;
          }
          setError(null);
          setEditing(false);
          setSaved(true);
          router.refresh();
        })
      }
    >
      <p className="text-sm font-medium text-ink">{t("label")}</p>
      <p className="mt-0.5 text-xs text-muted">{t("help")}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-sm text-ink">
          {t("firstName")}
          <input name="first_name" defaultValue={first ?? ""} required autoComplete="given-name" className={field} />
        </label>
        <label className="text-sm text-ink">
          {t("lastName")}
          <input name="last_name" defaultValue={rest.join(" ")} required autoComplete="family-name" className={field} />
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
          {pending ? t("saving") : t("save")}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-app-bg">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
