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
//  - affiche un guide (Philippe, 2026-10-17 : « faciliter davantage
//    l'utilisation de la démo ») : les écrans à visiter dans l'ordre, chacun
//    cliquable, l'écran en cours en évidence, plus « passer côté kiné /
//    patient » et « quitter ». Ouvert d'office sur ordinateur à l'arrivée,
//    replié en pastille sur téléphone (il masquerait l'écran).
// Aucune donnée réelle, aucune requête vers la base.
// =============================================================================

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, Check, LogOut, Sparkles, X } from "lucide-react";
import { DemoHrefContext, DemoModeContext } from "@/components/DemoContext";

type Side = "kine" | "patient";

// Parcours conseillé, dans l'ordre. `ecran` = paramètre de /demo/<side>.
const TOUR: Record<Side, { ecran: string; title: string; hint: string }[]> = {
  kine: [
    { ecran: "accueil", title: "Tableau de bord", hint: "Qui va bien, qui est à surveiller." },
    { ecran: "patients", title: "Mes patients", hint: "Toute votre patientèle, triée." },
    { ecran: "fiche", title: "La fiche d'un patient", hint: "Sa frise semaine par semaine. Essayez « Ajuster / changer la séance »." },
    { ecran: "revenus", title: "Suivi & facturation", hint: "Bilans du mois, votre tarif, vos documents, votre facture EasyPhysio." },
    { ecran: "seances", title: "Mes séances", hint: "Vos séances et la bibliothèque d'exercices." },
    { ecran: "messages", title: "Messages", hint: "Vos échanges avec les patients." },
  ],
  patient: [
    { ecran: "accueil", title: "Accueil", hint: "Le programme de la semaine en un coup d'œil." },
    { ecran: "seance-du-jour", title: "La séance du jour", hint: "Les exercices guidés, un par un." },
    { ecran: "progres", title: "Mes progrès", hint: "La frise et l'évolution de la douleur." },
    { ecran: "messages", title: "Messages", hint: "Écrire à son kiné." },
    { ecran: "suivi", title: "Le suivi mensuel", hint: "Accepter le tarif de son kiné, ses bilans et notes d'honoraires." },
  ],
};

/** Écran de démo kiné correspondant à une adresse de l'appli, ou null. Garde
 *  ce qui a été choisi (patient, filtre, séance) : sans ça, cliquer sur un
 *  autre patient rouvrait toujours la même conversation (Philippe, 2026-10-27). */
function kineScreen(url: URL): string | null {
  const p = url.pathname.replace(/\/$/, "");
  const q = (key: string) => {
    const v = url.searchParams.get(key);
    return v ? `&${key}=${encodeURIComponent(v)}` : "";
  };
  if (p === "/dashboard") return "accueil";
  if (p === "/dashboard/patients") return `patients${q("filtre")}`;
  if (p === "/dashboard/patients/new") return null;
  if (p.startsWith("/dashboard/patients/")) return `fiche&patient=${encodeURIComponent(p.split("/")[3])}`;
  if (p === "/dashboard/messages") return url.searchParams.get("patient") ? `conversation${q("patient")}` : "messages";
  if (p === "/dashboard/informations") return "informations";
  if (p === "/dashboard/facturation") return "revenus";
  if (p === "/dashboard/seances") return url.searchParams.get("nouvelle") === "1" ? "seances&nouvelle=1" : "seances";
  if (p.startsWith("/dashboard/seances/")) return `editeur&seance=${encodeURIComponent(p.split("/")[3])}`;
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
    "/patient/suivi": "suivi",
    "/patient/compte/informations": "informations",
    "/patient/compte/changer-offre": "compte",
    "/patient/historique": "historique",
    "/patient/seance-du-jour": "seance-du-jour",
    "/patient/abonnement": "suivi",
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

// « Dans un iframe ? » ne change jamais pendant la visite : rien à écouter.
const noSubscribe = () => () => {};

const mapHref = (href: string) => {
  if (typeof window === "undefined") return href;
  return demoHref(new URL(href, window.location.href)) ?? href;
};

export default function DemoShell({ side, children }: { side: Side; children: React.ReactNode }) {
  const router = useRouter();
  const current = useSearchParams().get("ecran") ?? "accueil";
  const [toast, setToast] = useState<string | null>("Démo avec des données fictives : rien n'est enregistré.");
  // Guide ouvert d'office sur ordinateur (≥ 640 px), une fois par espace et
  // par visite ; replié sur téléphone, où il cacherait l'écran.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const key = `demo-guide-vu-${side}`;
    try {
      if (window.matchMedia("(min-width: 640px)").matches && !sessionStorage.getItem(key)) setMenuOpen(true);
      sessionStorage.setItem(key, "1");
    } catch {
      /* stockage indisponible : guide replié */
    }
  }, [side]);
  // Démo affichée DANS le téléphone de l'accueil (iframe, components/
  // KinePhonePreview.tsx, Philippe 2026-10-26 : « que la démo se fasse DANS
  // l'appli ») : pas de pastille Guide (trop petit), et aucun lien ne sort
  // de la démo.
  const embedded = useSyncExternalStore(
    noSubscribe,
    () => window.self !== window.top,
    () => false,
  );
  const steps = TOUR[side];
  const stepIndex = steps.findIndex((s) => s.ecran === current);
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
      // « Quitter la démo » (SignOutOrExitDemo) : on laisse partir vers l'accueil.
      if (a.hasAttribute("data-demo-exit")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const inApp = url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/patient");
      if (!inApp) {
        if (window.self !== window.top && !url.pathname.startsWith("/demo")) {
          e.preventDefault();
          e.stopImmediatePropagation();
          show("Cet écran n'est pas disponible dans la démo.");
        }
        return;
      }
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
      <DemoModeContext.Provider value={true}>{children}</DemoModeContext.Provider>

      {/* Pastille « Démo » : en bas à droite, au-dessus de la barre d'onglets
          sur téléphone, pour ne rien masquer de l'en-tête. */}
      <div className={`fixed bottom-4 right-4 z-[70] max-sm:bottom-[calc(5.75rem+env(safe-area-inset-bottom))] max-sm:right-3 ${embedded ? "hidden" : ""}`}>
        {menuOpen && (
          <div className="mb-2 max-h-[calc(100dvh-5.5rem)] w-72 overflow-y-auto rounded-2xl bg-surface text-sm shadow-xl ring-1 ring-line max-sm:w-[calc(100vw-1.5rem)]">
            <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <p className="font-semibold text-ink">Guide de la démo</p>
                <p className="mt-0.5 text-xs leading-snug text-muted">
                  Espace {side === "kine" ? "kiné" : "patient"} · données fictives, rien n&apos;est enregistré.
                </p>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Replier le guide" className="rounded-full p-1 text-muted hover:bg-app-bg hover:text-ink">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <ol className="py-1">
              {steps.map((st, i) => {
                const here = st.ecran === current;
                const done = stepIndex > i;
                return (
                  <li key={st.ecran}>
                    <Link
                      href={`/demo/${side}?ecran=${st.ecran}`}
                      aria-current={here ? "step" : undefined}
                      className={`flex gap-3 px-4 py-2 transition-colors [@media(max-height:650px)]:py-1.5 ${here ? "bg-brand-soft" : "hover:bg-app-bg"}`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                          here ? "bg-brand text-white" : done ? "bg-ok-soft text-ok" : "bg-app-bg text-muted"
                        }`}
                      >
                        {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className={`block font-medium ${here ? "text-brand" : "text-ink"}`}>{st.title}</span>
                        <span className="block text-xs leading-snug text-muted [@media(max-height:650px)]:hidden">{st.hint}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
            {stepIndex >= 0 && stepIndex < steps.length - 1 && (
              <div className="px-4 pb-3">
                <Link
                  href={`/demo/${side}?ecran=${steps[stepIndex + 1].ecran}`}
                  className="flex w-full items-center justify-center rounded-full bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  Écran suivant : {steps[stepIndex + 1].title}
                </Link>
              </div>
            )}
            <div className="border-t border-line">
              <Link
                href={`/demo/${other}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 font-medium text-ink hover:bg-app-bg"
              >
                <ArrowLeftRight className="h-4 w-4 text-brand" strokeWidth={1.75} />
                Voir l&apos;espace {other === "kine" ? "kiné" : "patient"}
              </Link>
              <Link href="/" className="flex items-center gap-2.5 px-4 py-2.5 font-medium text-ink hover:bg-app-bg">
                <LogOut className="h-4 w-4 text-muted" strokeWidth={1.75} />
                Quitter la démo
              </Link>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-white shadow-lg"
        >
          {menuOpen ? <X className="h-3.5 w-3.5" strokeWidth={2} /> : <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />}
          {menuOpen ? "Fermer le guide" : `Guide de la démo · ${side === "kine" ? "kiné" : "patient"}`}
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
