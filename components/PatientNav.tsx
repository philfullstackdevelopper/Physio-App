"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { Home, ClipboardList, History, LogOut } from "lucide-react";
import { LogoMark } from "@/components/Logo";

const LINKS = [
  { href: "/patient", label: "Accueil", icon: Home, exact: true },
  { href: "/patient/seance-du-jour", label: "Séance du jour", icon: ClipboardList },
  { href: "/patient/historique", label: "Historique", icon: History },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function InstructorBadge({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
        {initials(name)}
      </span>
      <span className="text-sm text-slate-600">
        Suivi par <span className="font-medium text-slate-900">{name}</span>
      </span>
    </span>
  );
}

// Patients are mobile-first (kinés work from a computer, patients from their
// phone), so the primary shape here is a fixed bottom tab bar — the reachable
// pattern for one-handed phone use — not the horizontal scroll strip
// DashboardSidebar uses for the kiné's desktop-first mobile fallback.
// Desktop gets a slim top bar with the same three destinations instead.
export default function PatientNav({ instructorName }: { instructorName: string | null }) {
  const pathname = usePathname();

  // The guided session itself is a full-focus, one-task flow with its own
  // "Quitter" link — a persistent nav (especially the fixed bottom bar) would
  // compete with the in-session "J'ai terminé" button for the same thumb zone.
  if (pathname.endsWith("/seance")) return null;

  // Every other destination redirects straight back here until the profile is
  // complete (see lib/patient/home-data.ts), so showing them as live nav links
  // just bounces the patient back to this same page — looking like a dead
  // button. Keep sign-out reachable so no one gets stuck.
  const onOnboarding = pathname === "/patient/onboarding";

  return (
    <>
      {/* Desktop: slim top bar */}
      <header className="hidden items-center justify-between border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur sm:flex">
        <Link href="/" className="font-display text-lg font-semibold text-slate-900 transition hover:text-blue-700">
          Physio-App
        </Link>
        <div className="flex items-center gap-4">
          {instructorName && <InstructorBadge name={instructorName} />}
          {!onOnboarding && (
            <nav className="flex gap-1">
              {LINKS.map((link) => {
                const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <link.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
          <SignOutButton redirectUrl="/login">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              Se déconnecter
            </button>
          </SignOutButton>
        </div>
      </header>

      {/* Mobile: fixed bottom tab bar, thumb-reachable, safe-area aware */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <Link
          href="/"
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium text-slate-500"
          aria-label="Retour au site Physio-App"
        >
          <LogoMark size={22} />
        </Link>
        {!onOnboarding &&
          LINKS.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition ${
                  active ? "text-blue-700" : "text-slate-500"
                }`}
              >
                <link.icon className="h-6 w-6" strokeWidth={active ? 2 : 1.75} />
                {link.label}
              </Link>
            );
          })}
        <SignOutButton redirectUrl="/login">
          <button
            type="button"
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium text-slate-500"
          >
            <LogOut className="h-6 w-6" strokeWidth={1.75} />
            Se déconnecter
          </button>
        </SignOutButton>
      </nav>
    </>
  );
}
