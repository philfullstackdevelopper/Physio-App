import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAppPath, nativePlatformFromUserAgent } from "@/lib/app/nativeApp";
import { LOCALE_COOKIE, LOCALE_GUESSED_COOKIE, localeFromAcceptLanguage } from "@/i18n/locales";

// Next.js 16 renamed Middleware → Proxy (same job: runs before each request).
// clerkMiddleware() makes the Clerk session available to Server Components and
// Server Actions via auth()/currentUser(), and keeps session cookies fresh.
//
// Also stamps the current path onto a response header: Server Components have
// no built-in way to read the request pathname, and app/patient/layout.tsx
// needs it to gate incomplete-onboarding patients to /patient/onboarding
// without looping when they're already there.
// Adresse principale du site (Philippe, 2026-10-16 : domaines achetés chez
// OVH). Les variantes — www, et easy-physio.fr avec tiret, acheté pour éviter
// qu'un tiers ne l'utilise — renvoient définitivement (301) vers easyphysio.fr.
// La redirection est faite ici et pas avec le « domaine canonique » de
// Scalingo : celui-ci redirigerait aussi easyphysio.osc-fr1.scalingo.io, où
// Stripe envoie ses notifications de paiement, et Stripe ne suit pas les
// redirections.
const MAIN_HOST = "easyphysio.fr";
const ALIAS_HOSTS = new Set(["www.easyphysio.fr", "easy-physio.fr", "www.easy-physio.fr"]);

export default clerkMiddleware(async (auth, req) => {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (ALIAS_HOSTS.has(host)) {
    return NextResponse.redirect(`https://${MAIN_HOST}${req.nextUrl.pathname}${req.nextUrl.search}`, 301);
  }

  // Appli mobile (lib/app/nativeApp.ts) : pas de pages vitrine (accueil,
  // tarifs, démo) dans l'appli, on ouvre directement l'espace de la personne.
  // Seulement les pages (pas les vidéos, images ou appels de données).
  const isPage = (req.headers.get("accept") ?? "").includes("text/html");
  if (isPage && nativePlatformFromUserAgent(req.headers.get("user-agent")) && !isAppPath(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/apres-connexion", req.url));
  }

  // Already signed in and asking for the login page (any « Se connecter »
  // link): go straight to the app instead of flashing Clerk's <SignIn> while
  // it notices the session and forwards (Philippe, 2026-10-02 — confusing for
  // users). /dashboard itself sends patients on to /patient. Exact "/login"
  // only: Clerk's own sub-steps (/login/factor-one, /login/sso-callback…)
  // must keep working mid-sign-in.
  if (req.nextUrl.pathname === "/login") {
    const { userId } = await auth();
    if (userId) return NextResponse.redirect(new URL("/dashboard", req.url));
  }


  // Must be set on the *request* headers (not just the response) — only
  // request headers are forwarded into the Server Component render, which is
  // where app/patient/layout.tsx reads x-pathname via headers(). Setting it
  // only on the outgoing response (the previous version of this file) meant
  // that read always came back empty, so the onboarding gate could never
  // tell it was already on /patient/onboarding.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);

  // Première visite (pas encore de cookie de langue) : langue devinée depuis
  // le navigateur (i18n/locales.ts). Le cookie est posé sur la réponse pour
  // les visites suivantes, et ajouté à la requête en cours pour que cette
  // toute première page s'affiche déjà dans la bonne langue. Un choix fait
  // avec le sélecteur, ou enregistré sur le compte, l'emporte toujours.
  if (!req.cookies.get(LOCALE_COOKIE)) {
    const guessed = localeFromAcceptLanguage(req.headers.get("accept-language"));
    const existing = req.headers.get("cookie");
    requestHeaders.set("cookie", `${existing ? `${existing}; ` : ""}${LOCALE_COOKIE}=${guessed}`);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.cookies.set(LOCALE_COOKIE, guessed, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    res.cookies.set(LOCALE_GUESSED_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return res;
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - ingest (mesure d'audience PostHog, réécrite dans next.config.ts)
     * - image assets
     */
    "/((?!_next/static|_next/image|favicon.ico|ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
