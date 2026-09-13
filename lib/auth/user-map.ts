import { createClient } from "@/lib/supabase/server";

// Bridges Clerk identities to the UUIDs the database already uses.
//
// public.app_users is the single source of truth for that mapping:
//   app_id   (uuid)  – the id every table already references (instructors.id,
//                      patients.id, ...). For accounts migrated from Supabase,
//                      app_id EQUALS the old auth.users id, so no FK churn.
//   clerk_id (text)  – the Clerk user id ("user_2abc..."), set once we've seen
//                      that person log in through Clerk.
//   email    (text)  – unique; lets us pre-create a mapping before first login
//                      (patient invitations) and attach a Clerk id later.
//
// app_users has a deliberately open RLS policy (app_users_service, `using
// (true)`) since it's the identity-resolution table itself — nothing else
// can gate access to it by identity before identity is known.
async function findAppIdBy(field: "clerk_id" | "email", value: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_users")
    .select("app_id")
    .eq(field, value)
    .maybeSingle();
  return data?.app_id ? String(data.app_id) : null;
}

// Returns the internal uuid for a logged-in Clerk user, creating or linking the
// mapping row on first sight:
//  1. clerk_id already known  → return it.
//  2. email known (migrated Supabase account, or invited patient) → attach the
//     Clerk id to that existing row and return its uuid.
//  3. brand-new person → mint a new row + uuid.
export async function resolveAppUserId(clerkId: string, email: string): Promise<string> {
  const known = await findAppIdBy("clerk_id", clerkId);
  if (known) return known;

  const byEmail = await findAppIdBy("email", email);
  if (byEmail) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("app_users")
      .update({ clerk_id: clerkId })
      .is("clerk_id", null)
      .eq("email", email);
    if (error) {
      throw new Error("Liaison du compte Clerk impossible : " + error.message);
    }
    return byEmail;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_users")
    .insert({ clerk_id: clerkId, email })
    .select("app_id")
    .single();
  if (error || !data) {
    // Lost an insert race against another request for the same person — re-read.
    const retry = await findAppIdBy("clerk_id", clerkId) ?? await findAppIdBy("email", email);
    if (retry) return retry;
    throw new Error("Création du compte interne impossible : " + (error?.message ?? "ligne absente"));
  }
  return String(data.app_id);
}

// Pre-creates the mapping row for someone who does not exist yet but WILL have
// an account (an invited patient). Returns the uuid to store in patients.id so
// it matches what resolveAppUserId hands back at their first login. Safe to
// call twice: returns the existing row's uuid instead of failing on the
// unique(email) constraint.
export async function precreateAppUserId(email: string): Promise<{ appId: string; isNew: boolean }> {
  const existing = await findAppIdBy("email", email);
  if (existing) return { appId: existing, isNew: false };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_users")
    .insert({ email })
    .select("app_id")
    .single();
  if (error || !data) {
    const retry = await findAppIdBy("email", email);
    if (retry) return { appId: retry, isNew: false };
    throw new Error("Pré-création du compte interne impossible : " + (error?.message ?? "ligne absente"));
  }
  return { appId: String(data.app_id), isNew: true };
}
