"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, EllipsisVertical, Share, Smartphone, SquarePlus, X } from "lucide-react";
import { getInstallState, promptInstall, subscribeInstall, type InstallState } from "@/lib/pwa/installPrompt";

// Ligne « Installer l'appli » des paramètres du patient (téléphone), toujours
// disponible — l'écran /patient/appli n'apparaît qu'une fois, à la fin de
// l'inscription (Philippe, 2026-11-16 : « ça n'a pas ajouté le bouton »).
// - Android / Chrome : ouvre directement la fenêtre d'installation du téléphone.
// - iPhone : Apple n'autorise pas l'installation depuis un bouton ; on montre
//   les gestes à faire dans Safari (Partager → Sur l'écran d'accueil → Ajouter).
// - Autre navigateur : les gestes depuis le menu du navigateur.
// Rien ne s'affiche quand l'appli est déjà ouverte depuis l'écran d'accueil.
export default function InstallAppButton({
  className,
  iconClassName,
}: {
  className: string;
  iconClassName: string;
}) {
  const t = useTranslations("patient.appli");
  const state = useSyncExternalStore<InstallState | null>(subscribeInstall, getInstallState, () => null);
  const [help, setHelp] = useState<"ios" | "manual" | null>(null);

  if (state === null || state === "installed") return null;

  async function onClick() {
    if (state === "prompt" && (await promptInstall())) return;
    setHelp(state === "ios" ? "ios" : "manual");
  }

  const steps =
    help === "ios"
      ? [
          { icon: Share, text: t("iosStep1") },
          { icon: SquarePlus, text: t("iosStep2") },
          { icon: null, text: t("iosStep3") },
        ]
      : [
          { icon: EllipsisVertical, text: t("androidStep1") },
          { icon: SquarePlus, text: t("androidStep2") },
        ];

  return (
    <>
      <button type="button" onClick={onClick} className={className}>
        <span className={iconClassName}>
          <Smartphone className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <span className="flex-1 text-sm font-medium text-ink">{t("row")}</span>
        <ChevronRight className="h-4 w-4 text-muted" strokeWidth={2} />
      </button>

      {help && (
        <div
          // Au-dessus du bandeau cookies (z-50), qui reste en bas tant qu'il n'est pas fermé.
          className="fixed inset-0 z-[60] flex items-end bg-black/40"
          onClick={() => setHelp(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-title"
        >
          <div
            className="w-full rounded-t-3xl bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="install-title" className="text-base font-semibold text-ink">
                {t("installButton")}
              </h2>
              <button type="button" onClick={() => setHelp(null)} aria-label={t("close")} className="-m-1 p-1 text-muted">
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <p className="mt-1 text-sm text-muted">{t("installText")}</p>
            <ol className="mt-4 space-y-3">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-ink">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">
                    {s.text}
                    {s.icon && <s.icon className="ml-1.5 inline h-4 w-4 align-[-3px] text-brand" strokeWidth={2} aria-hidden />}
                  </span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => setHelp(null)}
              className="mt-5 w-full rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white"
            >
              {t("ok")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
