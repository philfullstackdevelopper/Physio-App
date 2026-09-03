"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { LayoutDashboard, UsersRound, Dumbbell, ListChecks, Wallet, LogOut } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { initials } from "@/lib/format/initials";

const LINKS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/patients", label: "Mes patients", icon: UsersRound },
  { href: "/dashboard/seances", label: "Mes séances", icon: Dumbbell },
  { href: "/dashboard/exercises", label: "Mes exercices", icon: ListChecks },
  { href: "/dashboard/facturation", label: "Tarif & paiements", icon: Wallet },
];

// Une seule barre de navigation pour tout /dashboard/* : colonne sombre à
// gauche sur desktop, barre horizontale défilable sur mobile. Les mêmes
// cinq destinations dans les deux cas.
export default function DashboardSidebar({ instructorName }: { instructorName: string | null }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  const linkClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
      active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-56 shrink-0 flex-col bg-sidebar p-4 text-white sm:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2 py-1">
          <LogoMark size={26} />
          <span className="text-base font-semibold">EasyPhysio</span>
        </Link>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(isActive(link.href, link.exact))}>
              <link.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex items-center gap-2.5 border-t border-white/10 px-2 pt-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold">
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

      {/* Mobile */}
      <nav className="flex items-center gap-1 overflow-x-auto bg-sidebar p-2 text-white sm:hidden">
        <Link href="/" className="flex shrink-0 items-center px-2 py-2" aria-label="Retour au site EasyPhysio">
          <LogoMark size={22} />
        </Link>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={`shrink-0 ${linkClass(isActive(link.href, link.exact))}`}>
            <link.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {link.label}
          </Link>
        ))}
        <SignOutButton redirectUrl="/login">
          <button type="button" className={`shrink-0 ${linkClass(false)}`}>
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Se déconnecter
          </button>
        </SignOutButton>
      </nav>
    </>
  );
}
