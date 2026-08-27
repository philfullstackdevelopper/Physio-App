"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { LayoutDashboard, UsersRound, Dumbbell, ListChecks, Wallet, LogOut } from "lucide-react";
import { LogoMark } from "@/components/Logo";

const LINKS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/patients", label: "Mes patients", icon: UsersRound },
  { href: "/dashboard/seances", label: "Mes séances", icon: Dumbbell },
  { href: "/dashboard/exercises", label: "Mes exercices", icon: ListChecks },
  { href: "/dashboard/facturation", label: "Tarif & paiements", icon: Wallet },
];

// Fewer clicks, one persistent place to jump between sections, instead of
// each page linking back to /dashboard to get anywhere else — the concrete
// change requested after discussing SaaS navigation patterns.
export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: fixed left column */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white/90 p-4 backdrop-blur sm:flex">
        <Link
          href="/"
          className="font-display px-2 text-lg font-semibold text-slate-900 transition hover:text-blue-700"
        >
          Physio-App
        </Link>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {LINKS.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
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
        <SignOutButton redirectUrl="/login">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Se déconnecter
          </button>
        </SignOutButton>
      </aside>

      {/* Mobile: horizontal scrollable bar instead of a hidden sidebar */}
      <nav className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white/90 p-2 backdrop-blur sm:hidden">
        <Link href="/" className="flex shrink-0 items-center px-2 py-2" aria-label="Retour au site Physio-App">
          <LogoMark size={22} />
        </Link>
        {LINKS.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                active ? "bg-blue-50 text-blue-700" : "text-slate-600"
              }`}
            >
              <link.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {link.label}
            </Link>
          );
        })}
        <SignOutButton redirectUrl="/login">
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Se déconnecter
          </button>
        </SignOutButton>
      </nav>
    </>
  );
}
