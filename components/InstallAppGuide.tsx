"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { EllipsisVertical, Share, SquarePlus, Smartphone } from "lucide-react";
import { getInstallState, promptInstall, subscribeInstall, type InstallState } from "@/lib/pwa/installPrompt";

// Ajouter EasyPhysio à l'écran d'accueil du téléphone (Philippe, 2026-11-16),
// en attendant les applis App Store / Google Play : le site (app/manifest.ts)
// s'ouvre alors comme une appli, en plein écran, avec son icône.
// - iPhone : aucune installation automatique possible, on montre les gestes
//   (Partager → « Sur l'écran d'accueil » → Ajouter).
// - Android (Chrome) : le navigateur propose son bouton « Installer » quand il
//   le peut (évènement beforeinstallprompt) ; sinon, les gestes via le menu ⋮.
// - Déjà ouvert depuis l'écran d'accueil : rien à faire, direction le programme.

// L'offre « Installer » d'Android arrive souvent avant cet écran : elle est
// attrapée dès le chargement du site et partagée (lib/pwa/installPrompt.ts).
export default function InstallAppGuide({ phone }: { phone: "ios" | "android" }) {
  const t = useTranslations("patient.appli");
  const router = useRouter();
  const state = useSyncExternalStore<InstallState | null>(subscribeInstall, getInstallState, () => null);

  useEffect(() => {
    if (state === "installed") router.replace("/patient");
  }, [state, router]);

  const steps =
    phone === "ios"
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
    <main className="flex min-h-dvh items-center justify-center bg-app-bg p-6 max-sm:min-h-[calc(100dvh-var(--phone-chrome))]">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-soft">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Smartphone className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <h1 className="mt-4 text-center text-xl font-semibold text-ink">{t("title")}</h1>
        <p className="mt-2 text-center text-sm text-muted">{t("installText")}</p>

        {state === "prompt" ? (
          <button
            type="button"
            onClick={() => void promptInstall()}
            className="mt-5 w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            {t("installButton")}
          </button>
        ) : (
          <ol className="mt-5 space-y-3">
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
        )}

        <p className="mt-4 text-center text-xs text-muted">{t("installAfter")}</p>
        <Link
          href="/patient"
          className="mt-5 block rounded-full border border-line px-4 py-2.5 text-center text-sm font-medium text-ink hover:bg-app-bg"
        >
          {t("continueBrowser")}
        </Link>
      </div>
    </main>
  );
}
