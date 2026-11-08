import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getInstructor } from "@/lib/dashboard/instructor";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { LOCALE_COOKIE, LOCALE_GUESSED_COOKIE, isLocale, type Locale } from "@/i18n/locales";
import { getUserLocale, setUserLocale } from "@/lib/db/locale";
import ClientRedirect from "./ClientRedirect";

// Langue du compte ↔ cookie de l'appareil, juste après la connexion :
// - le compte a déjà une langue → elle s'applique à cet appareil (le cookie
//   est réécrit côté navigateur par ClientRedirect) ;
// - pas encore de langue (premier passage après l'inscription) → on garde
//   celle choisie sur l'accueil / l'inscription (cookie), ou le français.
// Un échec (migration 0084 absente…) ne bloque jamais la connexion.
async function syncLocale(): Promise<Locale | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    const stored = await getUserLocale(userId);
    if (stored) return stored;
    const jar = await cookies();
    // Langue seulement devinée d'après le navigateur : elle reste valable sur
    // cet appareil, mais n'est pas enregistrée ; seul un choix fait avec le
    // sélecteur devient la langue du compte (sur tous ses appareils).
    if (jar.get(LOCALE_GUESSED_COOKIE)) return null;
    const fromCookie = jar.get(LOCALE_COOKIE)?.value;
    await setUserLocale(userId, isLocale(fromCookie) ? fromCookie : "fr");
    return null;
  } catch (e) {
    console.error("apres-connexion : langue non synchronisée", e);
    return null;
  }
}

// Single landing spot for the SignIn component's fallbackRedirectUrl — Clerk
// doesn't know the role before sign-in completes, so every login lands here
// first. The role is resolved server-side, but the actual navigation happens
// client-side (see ClientRedirect) rather than via redirect(): a redirect()
// thrown as the direct target of Clerk's post-sign-in push hangs the
// transition in this app's dev environment (Next 16 + Turbopack).
//
// requireUser() itself calls redirect() internally (e.g. to /login, or to
// /connection-error on a Clerk hiccup) — perfectly fine from every other
// page that uses it, but that internal redirect() is just as much "the
// direct target of Clerk's post-sign-in push" here as our own would be, so
// it hangs the exact same way (confirmed 2026-09-15 — this page went blank
// forever instead of the redirect happening, right after wiring up the
// /connection-error fallback below). Catching it and re-issuing it through
// ClientRedirect keeps requireUser()'s contract for every other caller intact
// while never letting an actual redirect() escape this one page's render.
export default async function AfterSignIn() {
  const supabase = await createClient();
  // La cible est calculée dans le try, le JSX rendu en dehors (règle React :
  // pas de JSX construit dans un try/catch) — même comportement qu'avant.
  let to: string;
  try {
    const user = await requireUser(supabase);
    // getInstructor() throws on a real query failure (PostgREST hiccup)
    // instead of silently returning null — right here, right after a fresh
    // sign-in, is exactly where that would otherwise misroute a real
    // instructor to /patient.
    const instructor = await getInstructor(supabase, user.id);
    to = instructor ? "/dashboard" : "/patient";
  } catch (err) {
    const digest = (err as { digest?: unknown })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      const parts = digest.split(";");
      to = parts.slice(2, -2).join(";") || "/login";
    } else {
      // Not a redirect — a genuine getInstructor() failure.
      to = "/connection-error?next=/apres-connexion";
    }
  }
  const locale = await syncLocale();
  return <ClientRedirect to={to} locale={locale} />;
}
