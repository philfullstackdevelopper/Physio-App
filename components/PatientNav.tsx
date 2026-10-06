"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { Home, CalendarDays, TrendingUp, MessageCircle, Settings, LogOut } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { initials } from "@/lib/format/initials";

const LINKS = [
  { href: "/patient", label: "Accueil", icon: Home, exact: true },
  { href: "/patient/programme", label: "Mon programme", icon: CalendarDays },
  { href: "/patient/progres", label: "Mes progrès", icon: TrendingUp },
  { href: "/patient/messages", label: "Messages", icon: MessageCircle },
  { href: "/patient/compte", label: "Paramètres", icon: Settings },
];

// Barre du bas sur téléphone : 4 onglets au lieu de 5 (Philippe, 2026-10-04 :
// « 5 tabs is too much »). « Mon programme » n'y figure plus : la grande carte
// de l'Accueil y mène, et sa page reste rattachée à l'onglet Accueil. Le menu
// latéral sur ordinateur garde ses 5 entrées, inchangé.
const MOBILE_LINKS: { href: string; label: string; icon: typeof Home; exact?: boolean; alsoActive?: string[] }[] = [
  { href: "/patient", label: "Accueil", icon: Home, exact: true, alsoActive: ["/patient/programme", "/patient/seance-du-jour"] },
  { href: "/patient/progres", label: "Progrès", icon: TrendingUp },
  { href: "/patient/messages", label: "Messages", icon: MessageCircle },
  { href: "/patient/compte", label: "Paramètres", icon: Settings },
];

// Same shell as DashboardSidebar (dark column on desktop, scrollable bar on
// mobile, same tokens/spacing) — Philippe, 2026-09-05: the patient ("client")
// interface should read as the same product as the kiné dashboard, not a
// visually distinct mobile app bolted onto it. Patients are still mobile-first
// day to day, so the desktop sidebar and the mobile bar carry the exact same
// five destinations, just laid out for the device.
export default function PatientNav({
  patientName,
  unreadCount,
  pathnameOverride,
}: {
  patientName: string | null;
  unreadCount: number;
  /** Page de prévisualisation (/prototypes/accueil-patient) : quel onglet montrer actif. */
  pathnameOverride?: string;
}) {
  const realPathname = usePathname();
  const pathname = pathnameOverride ?? realPathname;

  // The guided session is a full-focus, one-task flow with its own "Quitter"
  // link — a persistent nav here would compete with the in-session
  // "J'ai terminé" button for the same thumb zone.
  if (pathname.endsWith("/seance")) return null;

  // Every other destination redirects straight back to onboarding until the
  // profile is complete (see lib/patient/home-data.ts) — showing them as live
  // nav links would just bounce the patient back here, looking like a dead
  // button. Keep sign-out reachable so no one gets stuck.
  const onOnboarding = pathname === "/patient/onboarding";

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));
  const linkClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
      active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <>
      {/* Téléphone : en-tête fin en haut de chaque page — logo à gauche,
          initiales à droite qui mènent aux Paramètres (Philippe, 2026-10-06,
          maquette fournie). Même identité que le haut de la barre latérale
          ordinateur, rien de nouveau. Hauteur comptée dans --phone-chrome. */}
      <header
        className="sticky top-0 z-30 flex h-[calc(3.25rem+env(safe-area-inset-top))] items-center justify-between bg-phone-bg/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur sm:hidden"
      >
        <Link href="/patient" className="flex items-center gap-2">
          <LogoMark size={24} />
          <span className="text-lg font-semibold text-ink">EasyPhysio</span>
        </Link>
        {!onOnboarding && (
          <Link
            href="/patient/compte"
            aria-label="Paramètres"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
          >
            {initials(patientName)}
          </Link>
        )}
      </header>

      {/* Desktop */}
      <aside className="hidden w-56 shrink-0 flex-col bg-sidebar p-4 text-white sm:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2 py-1">
          <LogoMark size={26} />
          <span className="text-base font-semibold">EasyPhysio</span>
        </Link>
        {!onOnboarding && (
          <nav className="mt-6 flex flex-1 flex-col gap-1">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(isActive(link.href, link.exact))}>
                <link.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {link.label}
                {link.href === "/patient/messages" && unreadCount > 0 && (
                  <span className="ml-auto rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        )}
        <div className={`flex items-center gap-2.5 border-t border-white/10 px-2 pt-4 ${onOnboarding ? "mt-auto" : "mt-4"}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold">
            {initials(patientName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{patientName ?? "Patient"}</p>
            <p className="text-xs text-white/60">Patient</p>
          </div>
        </div>
        <SignOutButton redirectUrl="/login">
          <button type="button" className={`mt-2 w-full ${linkClass(false)}`}>
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Se déconnecter
          </button>
        </SignOutButton>
      </aside>

      {/* Mobile: fixed bottom tab bar, thumb-reachable, safe-area aware.
          Barre blanche, onglet actif en bleu (Philippe, 2026-10-06, maquette
          fournie) — mêmes onglets. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line/70 bg-surface/95 shadow-[0_-4px_16px_rgba(15,23,42,0.04)] backdrop-blur sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {!onOnboarding &&
          MOBILE_LINKS.map((link) => {
            const active = isActive(link.href, link.exact) || (link.alsoActive ?? []).some((h) => pathname.startsWith(h));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex h-20 flex-1 flex-col items-center justify-center gap-1 pb-1 text-xs transition ${
                  active ? "font-semibold text-brand" : "font-medium text-muted"
                }`}
              >
                <link.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.1 : 1.6} />
                {link.label}
                {link.href === "/patient/messages" && unreadCount > 0 && (
                  <span className="absolute right-[32%] top-2 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-surface" />
                )}
              </Link>
            );
          })}
        {onOnboarding && (
          <SignOutButton redirectUrl="/login">
            <button type="button" className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted">
              <LogOut className="h-5 w-5" strokeWidth={1.75} />
              Se déconnecter
            </button>
          </SignOutButton>
        )}
      </nav>
    </>
  );
}
