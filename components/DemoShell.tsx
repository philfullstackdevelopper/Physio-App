"use client";

// =============================================================================
// DemoShell — enveloppe de la démo publique (/demo/kine, /demo/patient).
//
// Philippe, 2026-10-16 (retour d'un premier lecteur : « j'aime bien pouvoir
// essayer l'app dans le navigateur ») : les vrais écrans de l'appli, remplis
// de données fictives (ceux de /prototypes), deviennent navigables sans
// compte. Cette enveloppe :
//  - garde le visiteur DANS la démo : un lien vers /dashboard/… ou /patient/…
//    est réécrit vers l'écran de démo correspondant ; un écran qui n'existe pas
//    en démo affiche un petit message au lieu d'envoyer vers la connexion ;
//  - bloque tout envoi de formulaire (rien n'est jamais enregistré) avec un
//    message ;
//  - affiche une pastille « Démo » (passer côté kiné / patient, quitter).
// Aucune donnée réelle, aucune requête vers la base.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, LogOut, Sparkles, X } from "lucide-react";
import { DemoHrefContext } from "@/components/DemoContext";

type Side = "kine" | "patient";

/** Écran de démo kiné correspondant à une adresse de l'appli, ou null. */
function kineScreen(url: URL): string | null {
  const p = url.pathname.replace(/\/$/, "");
  if (p === "/dashboard") return "accueil";
  if (p === "/dashboard/patients") return "patients";
  if (p === "/dashboard/patients/new") return null;
  if (p.startsWith("/dashboard/patients/")) return "fiche";
  if (p === "/dashboard/messages") return url.searchParams.get("patient") ? "conversation" : "messages";
  if (p === "/dashboard/informations") return "informations";
  if (p === "/dashboard/facturation") return "revenus";
  if (p === "/dashboard/seances") return url.searchParams.get("nouvelle") === "1" ? "seances&nouvelle=1" : "seances";
  if (p === "/dashboard/exercises") return "exercices";
  return null;
}

/** Écran de démo patient correspondant à une adresse de l'appli, ou null. */
function patientScreen(url: URL): string | null {
  const p = url.pathname.replace(/\/$/, "");
  const exact: Record<string, string> = {
    "/patient": "accueil",
    "/patient/programme": "programme",
    "/patient/progres": "progres",
    "/patient/messages": "messages",
    "/patient/compte": "compte",
    "/patient/compte/informations": "informations",
    "/patient/compte/changer-offre": "changer-offre",
    "/patient/historique": "historique",
    "/patient/seance-du-jour": "seance-du-jour",
    "/patient/abonnement": "abonnement",
    "/patient/onboarding": "onboarding",
  };
  if (exact[p]) return exact[p];
  if (p.startsWith("/patient/historique/")) return "historique-detail";
  if (/^\/patient\/[^/]+\/seance$/.test(p)) return "seance";
  return null;
}

/** Adresse de démo pour une adresse de l'appli, ou null si l'écran n'existe pas en démo. */
function demoHref(url: URL): string | null {
  const kine = url.pathname.startsWith("/dashboard") ? kineScreen(url) : null;
  if (kine) return `/demo/kine?ecran=${kine}`;
  const patient = url.pathname.startsWith("/patient") ? patientScreen(url) : null;
  return patient ? `/demo/patient?ecran=${patient}` : null;
}

const mapHref = (href: string) => {
  if (typeof window === "undefined") return href;
  return demoHref(new URL(href, window.location.href)) ?? href;
};

export default function DemoShell({ side, children }: { side: Side; children: React.ReactNode }) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>("Démo avec des données fictives : rien n'est enregistré.");
  const [menuOpen, setMenuOpen] = useState(false);
  const timer = useRef<number | null>(null);

  const show = (message: string) => {
    setToast(message);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    timer.current = window.setTimeout(() => setToast(null), 3800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    // Phase de capture sur window : on passe AVANT React et Next.js, qui
    // sinon suivraient le lien ou enverraient le formulaire.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank") return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const inApp = url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/patient");
      if (!inApp) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const target = demoHref(url);
      if (target) router.push(target);
      else show("Cet écran n'est pas disponible dans la démo.");
    };
    const onSubmit = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      show("Dans la démo, rien n'est enregistré.");
    };
    window.addEventListener("click", onClick, true);
    window.addEventListener("submit", onSubmit, true);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("submit", onSubmit, true);
    };
  }, [router]);

  const other: Side = side === "kine" ? "patient" : "kine";

  return (
    <DemoHrefContext.Provider value={mapHref}>
      {children}

      {/* Pastille « Démo » : en bas à droite, au-dessus de la barre d'onglets
          sur téléphone, pour ne rien masquer de l'en-tête. */}
      <div className="fixed bottom-4 right-4 z-[70] max-sm:bottom-[calc(5.75rem+env(safe-area-inset-bottom))] max-sm:right-3">
        {menuOpen && (
          <div className="mb-2 w-60 overflow-hidden rounded-2xl bg-surface text-sm shadow-xl ring-1 ring-line">
            <p className="border-b border-line px-4 py-3 text-xs leading-snug text-muted">
              Vous visitez l&apos;espace {side === "kine" ? "kiné" : "patient"} avec des données fictives. Rien n&apos;est enregistré.
            </p>
            <Link
              href={`/demo/${other}`}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-3 font-medium text-ink hover:bg-app-bg"
            >
              <ArrowLeftRight className="h-4 w-4 text-brand" strokeWidth={1.75} />
              Voir l&apos;espace {other === "kine" ? "kiné" : "patient"}
            </Link>
            <Link href="/" className="flex items-center gap-2.5 px-4 py-3 font-medium text-ink hover:bg-app-bg">
              <LogOut className="h-4 w-4 text-muted" strokeWidth={1.75} />
              Quitter la démo
            </Link>
          </div>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-white shadow-lg"
        >
          {menuOpen ? <X className="h-3.5 w-3.5" strokeWidth={2} /> : <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />}
          Démo · {side === "kine" ? "espace kiné" : "espace patient"}
        </button>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed left-1/2 top-4 z-[70] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-center text-xs font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </DemoHrefContext.Provider>
  );
}
