import Link from "next/link";
import type { ReactNode } from "react";
import { CreditCard, Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { KINE_FOLLOW_UP_CENTS, eurosFR } from "@/lib/billing/patientPlans";
import type { Locale } from "@/i18n/locales";

// « Ajouter un patient » : invitation par e-mail, ou QR code à faire scanner
// au cabinet. Partagé par la vraie page (app/dashboard/patients/new) et la
// démo (/demo/kine?ecran=nouveau).
export default function NewPatientView({
  open,
  error,
  addPatientAction,
  qr,
  seanceGroups = [],
  connectMissing = false,
}: {
  /** Paiements Stripe du kiné pas encore actifs : petit rappel, non bloquant. */
  connectMissing?: boolean;
  /** Séances proposées pour démarrer, groupées par pathologie (facultatif). */
  seanceGroups?: { condition: string; seances: { id: string; label: string }[] }[];
  open: boolean;
  error?: string;
  addPatientAction: (formData: FormData) => void | Promise<void>;
  /** La carte « QR code » (components/JoinQrCard). */
  qr: ReactNode;
}) {
  const t = useTranslations("dashboard.newPatient");
  const locale = useLocale() as Locale;
  return (
    <main className="min-h-screen p-8 max-sm:min-h-0 max-sm:px-4 max-sm:pb-4 max-sm:pt-2">
      <div className="mx-auto max-w-sm">
        <Link
          href="/dashboard/patients"
          className="animate-[fadeInUp_0.6s_ease-out_both] text-sm text-muted hover:underline max-sm:hidden"
        >
          {t("back")}
        </Link>

        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-4 rounded-xl border border-line bg-surface p-8 max-sm:mt-1 max-sm:rounded-2xl max-sm:border-0 max-sm:p-5 max-sm:shadow-soft">
          <h1 className="mb-1 text-2xl font-semibold text-ink">
            {t("title")}
          </h1>
          <p className="mb-6 text-sm text-muted">
            {t("intro")}
          </p>

          {!open && (
            <p className="mb-4 flex items-start gap-2 rounded-lg bg-brand-soft p-3 text-sm text-ink">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
              <span>{t("invitationsClosed")}</span>
            </p>
          )}
          {/* Rappel sobre (audit du 2026-11-08) : vaut pour l'invitation par
              e-mail comme pour le QR code plus bas. N'empêche rien. */}
          {open && connectMissing && (
            <p className="mb-4 flex items-start gap-2 rounded-lg bg-warn-soft p-3 text-sm text-ink">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-warn" strokeWidth={1.75} />
              <span>
                {t("connectNotice", { amount: eurosFR(KINE_FOLLOW_UP_CENTS, locale) })}{" "}
                <Link href="/dashboard/facturation" className="font-medium text-brand hover:underline">
                  {t("connectLink")}
                </Link>
              </span>
            </p>
          )}
          {open && error && (
            <p className="mb-4 rounded-lg border-line bg-danger-soft p-3 text-sm text-danger">
              {error}
            </p>
          )}

          <form action={addPatientAction} className="space-y-4">
            <fieldset disabled={!open} className="space-y-4 disabled:opacity-50">
            <div>
              <label htmlFor="full_name" className="mb-1 block text-sm font-medium text-ink">
                {t("fullName")}
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
                {t("email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
              />
            </div>
            {/* Proposition 4 (Philippe, 2026-11-05) : la première séance se
                choisit pendant la consultation ; le patient la trouve dès
                sa première connexion. Facultatif. */}
            {seanceGroups.length > 0 && (
              <div>
                <label htmlFor="workout_id" className="mb-1 block text-sm font-medium text-ink">
                  {t("firstSession")} <span className="font-normal text-muted">{t("optional")}</span>
                </label>
                <select
                  id="workout_id"
                  name="workout_id"
                  defaultValue=""
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
                >
                  <option value="">{t("later")}</option>
                  {seanceGroups.map((g) => (
                    <optgroup key={g.condition} label={g.condition}>
                      {g.seances.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
            <button
              type="submit"
              className="w-full rounded-full bg-brand py-2.5 font-medium text-white transition-colors duration-150 hover:bg-brand-dark disabled:cursor-not-allowed"
            >
              {open ? t("send") : t("atLaunch")}
            </button>
            </fieldset>
          </form>
        </div>

        {/* QR code personnel (2026-11-04) : le patient rejoint ce kiné seul. */}
        {qr}
      </div>
    </main>
  );
}
