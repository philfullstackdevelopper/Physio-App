"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { CheckCircle2, Smartphone, X } from "lucide-react";
import { isPhoneFormat } from "@/lib/phoneFormat";
import { APP_USER_AGENT_MARK } from "@/lib/app/nativeApp";
import { joinWaitlist, type WaitlistState } from "@/app/waitlistActions";

// « L'appli arrive bientôt » (Philippe, 2026-11-19) : une barre fine en haut de
// l'écran, sur TÉLÉPHONE seulement (même règle que le CSS, lib/phoneFormat.ts),
// jamais dans l'appli elle-même, et plus du tout dès que les liens des stores
// sont configurés (prop `enabled`, calculée dans app/layout.tsx). « Me
// prévenir » ajoute l'e-mail à la liste d'attente existante (internal.waitlist,
// visible et copiable dans /admin) : aucune base nouvelle. Posée par-dessus la
// page (position fixe) pour ne rien décaler des écrans « sans défilement ».
// Fermée ou inscrite : plus jamais affichée sur cet appareil.
const STORAGE_KEY = "app-coming-soon-dismissed";
const INITIAL: WaitlistState = { ok: false, error: null };

// Pas pendant une séance guidée (/patient/<id>), ni sur la page des stores,
// l'admin, les prototypes et la démo.
function hiddenOn(pathname: string): boolean {
  return (
    /^\/patient\/[0-9a-f-]{36}/i.test(pathname) ||
    pathname.startsWith("/patient/appli") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/prototypes") ||
    pathname.startsWith("/demo")
  );
}

function remember() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Stockage bloqué (navigation privée) : la barre reviendra, sans gravité.
  }
}

export default function AppComingSoonBanner({ enabled }: { enabled: boolean }) {
  const t = useTranslations("common.appSoon");
  const pathname = usePathname() ?? "/";
  const { user } = useUser();
  const [visible, setVisible] = useState(false);
  const [asking, setAsking] = useState(false);
  const [state, formAction, pending] = useActionState(joinWaitlist, INITIAL);

  useEffect(() => {
    if (!enabled || window.self !== window.top) return;
    if (navigator.userAgent.includes(APP_USER_AGENT_MARK) || !isPhoneFormat()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // Stockage illisible : on affiche quand même.
    }
    // Un minuteur plutôt que requestAnimationFrame : ce dernier ne part pas
    // tant que l'onglet n'est pas peint (onglet ouvert en arrière-plan).
    const id = window.setTimeout(() => setVisible(true), 0);
    return () => window.clearTimeout(id);
  }, [enabled]);

  // Inscrit : on remercie, puis la barre s'en va pour de bon.
  useEffect(() => {
    if (!state.ok) return;
    remember();
    const id = window.setTimeout(() => setVisible(false), 3500);
    return () => window.clearTimeout(id);
  }, [state.ok]);

  if (!visible || hiddenOn(pathname)) return null;

  const close = () => {
    remember();
    setVisible(false);
  };
  const role = pathname.startsWith("/patient") ? "patient" : "kine";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <div
      role="region"
      aria-label={t("label")}
      className="fixed inset-x-0 top-0 z-50 bg-ink px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-white shadow-lg"
    >
      {state.ok ? (
        <p className="flex items-center gap-2 py-1 text-xs" role="status">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" strokeWidth={2} />
          {t("thanks")}
        </p>
      ) : asking ? (
        <form action={formAction} className="flex items-center gap-2">
          <input type="hidden" name="role" value={role} />
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            defaultValue={email}
            autoFocus={!email}
            aria-label={t("emailLabel")}
            placeholder={t("placeholder")}
            className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
          >
            {pending ? t("sending") : t("submit")}
          </button>
          <button type="button" onClick={close} aria-label={t("close")} className="shrink-0 rounded-md p-1 text-white/70">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 shrink-0 text-white/80" strokeWidth={1.75} />
          <p className="min-w-0 flex-1 text-xs leading-snug">{t("text")}</p>
          <button type="button" onClick={() => setAsking(true)} className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-ink">
            {t("notify")}
          </button>
          <button type="button" onClick={close} aria-label={t("close")} className="shrink-0 rounded-md p-1 text-white/70">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      )}
      {state.error && !state.ok && <p className="mt-1 text-[11px] text-red-200">{state.error}</p>}
      {asking && !state.ok && <p className="mt-1 text-[10px] leading-snug text-white/60">{t("privacy")}</p>}
    </div>
  );
}
