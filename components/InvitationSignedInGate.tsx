"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { LogOut, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Affiché sur /invitation quand une session Clerk est DÉJÀ ouverte dans ce
 * navigateur (Philippe, 2026-10-01). Laisser le widget Clerk consommer le
 * ticket d'invitation par-dessus une session existante ouvrait une deuxième
 * session : navigateur et serveur ne voyaient plus la même, et le
 * router.refresh() que Clerk déclenche à chaque changement de session
 * repartait en boucle (écran blanc, onboarding qui se recharge sans fin).
 *
 * Deux sorties seulement : continuer avec la session actuelle, ou se
 * déconnecter puis revenir sur ce même lien (ticket compris) pour l'utiliser
 * dans une session propre.
 */
export default function InvitationSignedInGate({
  email,
  invitationUrl,
}: {
  email: string | null;
  invitationUrl: string;
}) {
  const t = useTranslations("auth.invitationGate");
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <UserCheck className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{t("title")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        {email ? (
          t.rich("sessionWith", { email, b: (c) => <span className="font-medium text-slate-700">{c}</span> })
        ) : (
          t("sessionOpen")
        )}{" "}
        {t("useOther")}
      </p>

      <Link
        href="/apres-connexion"
        className="mt-6 block w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
      >
        {t("continue")}
      </Link>
      <SignOutButton redirectUrl={invitationUrl}>
        <button
          type="button"
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          {t("signOutAndUse")}
        </button>
      </SignOutButton>
    </div>
  );
}
