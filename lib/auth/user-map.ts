import { getPool } from "@/lib/db/pool";

// Bridges Clerk identities to the UUIDs the database already uses.
//
// public.app_users is the single source of truth for that mapping:
//   app_id   (uuid)  – the id every table already references (instructors.id,
//                      patients.id, ...). For accounts migrated from Supabase,
//                      app_id EQUALS the old auth.users id, so no FK churn.
//   clerk_id (text)  – the Clerk user id ("user_2abc..."), set once we've seen
//                      that person log in through Clerk.
//   email    (text)  – unique, always lower-case; lets us pre-create a mapping
//                      before first login (patient invitations) and attach a
//                      Clerk id later.
//
// Sécurité (audit du 2026-10-07, migration 0061) : app_users n'a plus de
// politique ouverte — un utilisateur ne peut plus lire que sa propre ligne via
// PostgREST. La résolution, la création et la liaison passent donc par la
// connexion serveur directe (lib/db/pool.ts) et les fonctions
// internal.resolve_app_user / internal.precreate_app_user, jamais exposées
// au navigateur.

// Returns the internal uuid for a logged-in Clerk user, creating or linking the
// mapping row on first sight (all three cases handled inside the SQL function):
//  1. clerk_id already known  → return it.
//  2. email known (migrated Supabase account, or invited patient) → attach the
//     Clerk id to that existing row and return its uuid.
//  3. brand-new person → mint a new row + uuid.
export async function resolveAppUserId(clerkId: string, email: string): Promise<string> {
  try {
    const { rows } = await getPool().query<{ id: string }>("select internal.resolve_app_user($1, $2) as id", [
      clerkId,
      email.trim().toLowerCase(),
    ]);
    if (!rows[0]?.id) throw new Error("ligne absente");
    return String(rows[0].id);
  } catch (e) {
    // Une erreur (base injoignable…) n'est PAS « personne inconnue » : on
    // remonte l'erreur plutôt que de laisser croire à un compte vide.
    throw new Error("Lecture du compte interne impossible : " + (e instanceof Error ? e.message : String(e)));
  }
}

// Pre-creates the mapping row for someone who does not exist yet but WILL have
// an account (an invited patient). Returns the uuid to store in patients.id so
// it matches what resolveAppUserId hands back at their first login. Safe to
// call twice: returns the existing row's uuid instead of failing on the
// unique(email) constraint.
export async function precreateAppUserId(email: string): Promise<{ appId: string; isNew: boolean }> {
  const { rows } = await getPool().query<{ app_id: string; is_new: boolean }>(
    "select app_id, is_new from internal.precreate_app_user($1)",
    [email.trim().toLowerCase()],
  );
  if (!rows[0]?.app_id) throw new Error("Pré-création du compte interne impossible : ligne absente");
  return { appId: String(rows[0].app_id), isNew: !!rows[0].is_new };
}
