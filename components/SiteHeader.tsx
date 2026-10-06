"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { LogoMark } from "@/components/Logo";

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
  const { isLoaded, isSignedIn, user } = useUser();

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
        style={{ pointerEvents: showHeader ? "auto" : "none" }}
        className={`fixed left-1/2 z-50 -translate-x-1/2 transition-[top,width,border-radius,background-color,box-shadow,padding] duration-500 ease-in-out ${
          scrolled
            ? "top-3 w-[min(1080px,calc(100vw-24px))] rounded-full border border-blue-100/70 bg-white/70 px-6 py-3 shadow-lg shadow-blue-900/5 backdrop-blur-xl"
            : "top-0 w-full rounded-none border-b border-transparent bg-[#f6f8fd] px-6 py-4"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
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

          <div className="flex shrink-0 items-center gap-3">
            {/* Visible proof of connection state, not just a button whose
                behavior silently changes — someone already logged in should be
                able to tell at a glance, without clicking anything. */}
            {isLoaded && isSignedIn && !scrolled && (
              <span className="hidden max-w-[14rem] truncate text-sm text-slate-500 xl:inline">
                Connecté·e en tant que{" "}
                <span className="font-medium text-slate-700">
                  {user.primaryEmailAddress?.emailAddress ?? user.fullName ?? "vous"}
                </span>
              </span>
            )}

            {/* Always visible and always functional: signed out, « Se
                connecter » opens the Clerk login form; signed in, it becomes
                « Mon espace » and goes straight to /dashboard (which itself
                routes instructor vs. patient) — no login page flash on the
                way (Philippe, 2026-10-02; proxy.ts does the same for every
                other /login link). */}
            <Link
              href={isLoaded && isSignedIn ? "/dashboard" : "/login"}
              className={`hidden shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition active:scale-[0.97] sm:inline-flex ${
                scrolled
                  ? "border-slate-300 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50"
                  : "border-slate-300 bg-white/60 text-slate-700 hover:border-blue-200 hover:bg-white"
              }`}
            >
              {isLoaded && isSignedIn ? "Mon espace" : "Se connecter"}
            </Link>

            {isLoaded && !isSignedIn && (
              <Link
                href="/signup"
                className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition active:scale-[0.97] hover:bg-blue-700"
              >
                Créer un compte
              </Link>
            )}

            {isLoaded && isSignedIn && (
              <SignOutButton redirectUrl="/login">
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition active:scale-[0.97] hover:bg-blue-700"
                >
                  <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  Se déconnecter
                </button>
              </SignOutButton>
            )}
          </div>
        </div>
      </motion.header>
    </>
  );
}
