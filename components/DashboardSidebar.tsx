"use client";

import { useEffect, useRef, useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { LayoutDashboard, UsersRound, MessageCircle, Dumbbell, ListChecks, Wallet, LogOut, CircleUserRound, ChevronLeft } from "lucide-react";
import { LogoLockup } from "@/components/Logo";
import { initials } from "@/lib/format/initials";

const LINKS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/patients", label: "Mes patients", icon: UsersRound },
  { href: "/dashboard/messages", label: "Messages", icon: MessageCircle },
  { href: "/dashboard/seances", label: "Mes séances", icon: Dumbbell },
  { href: "/dashboard/exercises", label: "Mes exercices", icon: ListChecks },
  { href: "/dashboard/facturation", label: "Tarif & paiements", icon: Wallet },
];

// Téléphone : 4 onglets en bas, comme l'appli patient (5 = trop, Philippe
// 2026-10-04). Philippe, 2026-10-08 : Accueil · Patients · Messages ·
// « Mes informations » — ce dernier ouvre les cases Séances, Exercices et
// Revenus, et reste allumé sur ces trois pages. La déconnexion est dans la
// bulle du nom, en haut à droite. Les 6 entrées de la barre latérale
// ordinateur ne changent pas.
const MOBILE_LINKS: { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; alsoActive?: string[] }[] = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/patients", label: "Patients", icon: UsersRound },
  { href: "/dashboard/messages", label: "Messages", icon: MessageCircle },
  {
    href: "/dashboard/informations",
    label: "Mes informations",
    icon: CircleUserRound,
    alsoActive: ["/dashboard/seances", "/dashboard/exercises", "/dashboard/facturation"],
  },
];

// Bulle du nom (téléphone, en haut à droite de chaque écran) : qui est
// connecté, et la déconnexion.
function AccountMenu({ instructorName }: { instructorName: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Mon compte (${instructorName ?? "praticien"})`}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
      >
        {initials(instructorName)}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-2xl bg-surface shadow-soft ring-1 ring-line/70">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{instructorName ?? "Praticien"}</p>
            <p className="text-xs text-muted">Kinésithérapeute</p>
          </div>
          <SignOutButton redirectUrl="/login">
            <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-danger">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-soft">
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </span>
              Se déconnecter
            </button>
          </SignOutButton>
        </div>
      )}
    </div>
  );
}

type MobileLink = (typeof MOBILE_LINKS)[number];

// Contenu d'un onglet. useLinkStatus (Next 16) dit si la navigation lancée
// par CE lien est en cours : l'onglet touché s'allume tout de suite, avec un
// petit trait qui pulse, sans attendre que la page soit chargée — sinon le
// téléphone semble ne pas avoir pris l'appui.
function TabBody({ link, active, unreadCount }: { link: MobileLink; active: boolean; unreadCount: number }) {
  const { pending } = useLinkStatus();
  const lit = active || pending;
  return (
    <span
      className={`relative flex w-full flex-col items-center justify-start gap-1 px-1 pb-1 pt-3.5 text-center text-xs leading-tight transition-[color,transform] duration-150 group-active:scale-95 ${
        lit ? "font-semibold text-brand" : "font-medium text-muted"
      }`}
    >
      {/* Trait de l'onglet actif, en haut de la barre. */}
      <span
        aria-hidden
        className={`absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-brand transition-opacity duration-200 ${
          lit ? "opacity-100" : "opacity-0"
        } ${pending ? "animate-pulse" : ""}`}
      />
      <link.icon className="h-[22px] w-[22px]" strokeWidth={lit ? 2.1 : 1.6} />
      {link.label}
      {unreadCount > 0 && (
        <>
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-2 ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-surface"
          >
            {unreadCount}
          </span>
          <span className="sr-only">
            {" "}({unreadCount} non lu{unreadCount > 1 ? "s" : ""})
          </span>
        </>
      )}
    </span>
  );
}

// Téléphone : où ramène la flèche de retour de l'en-tête. La fiche patient
// et une conversation ouverte ont déjà leur propre flèche, à côté du nom.
function backTarget(pathname: string): { href: string; label: string } | null {
  if (pathname.startsWith("/dashboard/seances/") && pathname.length > "/dashboard/seances/".length) {
    return { href: "/dashboard/seances", label: "Mes séances" };
  }
  if (pathname === "/dashboard/patients/new") return { href: "/dashboard/patients", label: "Mes patients" };
  if (["/dashboard/seances", "/dashboard/exercises", "/dashboard/facturation"].some((p) => pathname.startsWith(p))) {
    return { href: "/dashboard/informations", label: "Mes informations" };
  }
  return null;
}

// Une seule barre de navigation pour tout /dashboard/* : colonne sombre à
// gauche sur ordinateur (six destinations), en-tête + onglets sur téléphone.
export default function DashboardSidebar({
  instructorName,
  unreadCount,
  pathnameOverride,
}: {
  instructorName: string | null;
  unreadCount: number;
  /** Page de prévisualisation (/prototypes/kine-telephone) : quel onglet montrer actif. */
  pathnameOverride?: string;
}) {
  const realPathname = usePathname();
  const pathname = pathnameOverride ?? realPathname;
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));
  const back = backTarget(pathname);

  const linkClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
      active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <>
      {/* Desktop — sticky : reste à sa place quel que soit le défilement
          (vertical ou horizontal) du contenu à côté. */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto bg-sidebar p-4 text-white sm:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2 py-1">
          <LogoLockup height={36} tone="light" />
        </Link>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(isActive(link.href, link.exact))}>
              <link.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {link.label}
              {link.href === "/dashboard/messages" && unreadCount > 0 && (
                <span className="ml-auto rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex items-center gap-2.5 border-t border-white/10 px-2 pt-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold">
            {initials(instructorName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{instructorName ?? "Praticien"}</p>
            <p className="text-xs text-white/60">Kinésithérapeute</p>
          </div>
        </div>
        <SignOutButton redirectUrl="/login">
          <button type="button" className={`mt-2 w-full ${linkClass(false)}`}>
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Se déconnecter
          </button>
        </SignOutButton>
      </aside>

      {/* Téléphone : même coquille que l'appli patient (PatientNav) — en-tête
          fin en haut (logo + initiales qui ouvrent le compte), barre
          d'onglets blanche en bas, onglet actif en bleu (Philippe,
          2026-10-07 : mêmes règles que la version patient). Hauteur des deux
          barres comptée dans --phone-chrome (app/globals.css). */}
      <header data-phone-topbar="" className="sticky top-0 z-30 flex h-[calc(3.25rem+env(safe-area-inset-top))] items-center justify-between bg-phone-bg/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur sm:hidden">
        <div className="flex min-w-0 items-center gap-1">
          {/* Sous-écran (Séances, Exercices, Revenus, éditeur de séance,
              nouveau patient) : une flèche de retour, toujours au même
              endroit, vers l'écran d'où l'on vient (Philippe, 2026-10-10 :
              un parcours « propre et agréable »). */}
          {back && (
            <Link
              href={back.href}
              aria-label={`Retour : ${back.label}`}
              className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-transform active:scale-90"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2} />
            </Link>
          )}
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Tableau de bord">
            <LogoLockup height={32} />
          </Link>
        </div>
        <AccountMenu instructorName={instructorName} />
      </header>

      <nav
        data-phone-tabbar=""
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line/70 bg-surface/95 shadow-[0_-4px_16px_rgba(15,23,42,0.04)] backdrop-blur sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {MOBILE_LINKS.map((link) => {
          const active = isActive(link.href, link.exact) || (link.alsoActive ?? []).some((h) => pathname.startsWith(h));
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className="group relative flex h-20 min-w-0 flex-1 select-none [-webkit-tap-highlight-color:transparent]"
            >
              <TabBody link={link} active={active} unreadCount={link.href === "/dashboard/messages" ? unreadCount : 0} />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
