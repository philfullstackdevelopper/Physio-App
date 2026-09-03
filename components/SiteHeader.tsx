"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { LogoMark } from "@/components/Logo";

const NAV_LINKS = [
  { href: "/#comment-ca-marche", label: "Comment ça marche" },
  { href: "/praticiens", label: "Praticiens" },
  { href: "/#fonctionnalites", label: "Fonctionnalités" },
  { href: "/#comparaison", label: "Comparaison" },
  { href: "/#tarifs", label: "Tarifs" },
  { href: "/#faq", label: "FAQ" },
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed left-1/2 z-50 -translate-x-1/2 transition-all duration-500 ease-in-out ${
        scrolled
          ? "top-3 w-[min(1080px,calc(100vw-24px))] rounded-full border border-blue-100/70 bg-white/70 px-6 py-3 shadow-lg shadow-blue-900/5 backdrop-blur-xl"
          : "top-0 w-full rounded-none border-b border-transparent bg-[#f6f8fd] px-6 py-4"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={scrolled ? 32 : 34} />
          <span className="hidden font-display text-base font-semibold text-slate-900 sm:inline">
            EasyPhysio
          </span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="whitespace-nowrap transition hover:text-blue-700">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Visible proof of connection state, not just a button whose
              behavior silently changes — someone already logged in should be
              able to tell at a glance, without clicking anything. */}
          {isLoaded && isSignedIn && !scrolled && (
            <span className="hidden text-sm text-slate-500 sm:inline">
              Connecté·e en tant que{" "}
              <span className="font-medium text-slate-700">
                {user.primaryEmailAddress?.emailAddress ?? user.fullName ?? "vous"}
              </span>
            </span>
          )}

          {/* Always visible and always functional: signed out, it shows the
              Clerk login form; already signed in, Clerk forwards straight to
              /dashboard (which itself routes instructor vs. patient
              correctly) — either way this link takes you somewhere real. */}
          <Link
            href="/login"
            className={`hidden items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition active:scale-[0.97] sm:inline-flex ${
              scrolled
                ? "border-slate-300 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50"
                : "border-slate-300 bg-white/60 text-slate-700 hover:border-blue-200 hover:bg-white"
            }`}
          >
            Se connecter
          </Link>

          {isLoaded && !isSignedIn && (
            <Link
              href="/signup"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition active:scale-[0.97] hover:bg-blue-700"
            >
              Créer un compte
            </Link>
          )}

          {isLoaded && isSignedIn && (
            <SignOutButton redirectUrl="/login">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition active:scale-[0.97] hover:bg-blue-700"
              >
                <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                Se déconnecter
              </button>
            </SignOutButton>
          )}
        </div>
      </div>
    </header>
  );
}
