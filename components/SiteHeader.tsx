"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { LogoLockup } from "@/components/Logo";

// Un en-tête plein mais aéré (Philippe, 2026-10-07 : d'abord « too much
// information », puis « fill out the header a bit more ») : les 5 sections,
// sans le texte « Connecté·e en tant que … ».
const NAV_LINKS = [
  { href: "/#comment-ca-marche", label: "Comment ça marche" },
  { href: "/#cote-kine", label: "Praticiens" },
  { href: "/#comparaison", label: "Comparaison" },
  { href: "/#tarifs", label: "Tarifs" },
  { href: "/#faq", label: "FAQ" },
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  // The main header itself: visible only while actively scrolling down.
  // Scrolling up hides it immediately, and so does pausing — it's an
  // auto-hide toolbar, not a permanent fixture, once scrolled past the hero
  // (Philippe, 2026-09-09: "scrolling back up, or pausing, I want the bar to
  // disappear"). Always shown at the very top, where it's the page's own
  // full-width header rather than the floating pill.
  const [showHeader, setShowHeader] = useState(true);
  const lastY = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const delta = y - lastY.current;

      if (y < 24) {
        setShowHeader(true);
        clearTimeout(hideTimer.current);
      } else if (delta > 4) {
        setShowHeader(true);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setShowHeader(false), 900);
      } else if (delta < -4) {
        setShowHeader(false);
        clearTimeout(hideTimer.current);
      }

      if (Math.abs(delta) > 4) lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <>
      <motion.header
        animate={{ y: showHeader ? 0 : -80, opacity: showHeader ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        style={{
          pointerEvents: showHeader ? "auto" : "none",
          // Largeur en style direct (la classe arbitraire min()/calc() n'était
          // pas générée) : pleine largeur en haut de page, pastille de 1000 px
          // ensuite, avec une transition de largeur fluide (2026-10-07).
          width: scrolled ? "min(1000px, calc(100vw - 24px))" : "100%",
        }}
        className={`fixed left-1/2 z-50 -translate-x-1/2 transition-[top,width,border-radius,background-color,box-shadow,padding] duration-700 ease-[cubic-bezier(.22,1,.36,1)] ${
          scrolled
            ? "top-3 rounded-full border border-blue-100/70 bg-white/70 px-6 py-3 shadow-lg shadow-blue-900/5 backdrop-blur-xl"
            : "top-0 rounded-none border-b border-transparent bg-[#f6f8fd] px-6 py-4"
        }`}
      >
        {/* Pastille de 1000 px une fois défilé (au lieu de 1080 : trop de vide,
            Philippe 2026-10-07) — une largeur FIXE, pas « à la taille du
            contenu », pour que le passage pleine largeur → pastille reste un
            glissement fluide et non un saut brutal. */}
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            {/* Logo et mot « EasyPhysio » sur une ligne, à l'échelle du menu
                (Philippe, 2026-10-07 : le nom était trop grand par rapport
                au reste, comme sur aurascan.app). */}
            <LogoLockup height={30} />
          </Link>

          <nav className="hidden items-center gap-7 text-[15px] font-medium text-slate-600 lg:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="whitespace-nowrap transition hover:text-blue-700">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            {/* Always visible and always functional: signed out, « Se
                connecter » opens the Clerk login form; signed in, it becomes
                « Mon espace » and goes straight to /dashboard (which itself
                routes instructor vs. patient) — no login page flash on the
                way (Philippe, 2026-10-02; proxy.ts does the same for every
                other /login link).
                Téléphone (Philippe, 2026-10-10) : c'est le seul bouton, en
                bleu ; la création de compte se fait depuis le pied de la page
                de connexion (lien d'inscription de Clerk). */}
            <Link
              href={isLoaded && isSignedIn ? "/dashboard" : "/login"}
              className={`shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition active:scale-[0.97] ${
                isLoaded && isSignedIn
                  ? "inline-flex bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                  : "inline-flex max-sm:bg-blue-600 max-sm:text-white max-sm:shadow-sm sm:border sm:border-slate-300 sm:bg-white/60 sm:text-slate-700 sm:hover:border-blue-200 sm:hover:bg-white"
              }`}
            >
              {isLoaded && isSignedIn ? "Mon espace" : "Se connecter"}
            </Link>

            {isLoaded && !isSignedIn && (
              <Link
                href="/signup"
                className="hidden shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition active:scale-[0.97] hover:bg-blue-700 sm:inline-flex"
              >
                Créer un compte
              </Link>
            )}

            {isLoaded && isSignedIn && (
              <SignOutButton redirectUrl="/login">
                <button
                  type="button"
                  aria-label="Se déconnecter"
                  title="Se déconnecter"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white/60 text-slate-500 transition active:scale-[0.97] hover:border-blue-200 hover:text-slate-800"
                >
                  <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                </button>
              </SignOutButton>
            )}
          </div>
        </div>
      </motion.header>
    </>
  );
}
