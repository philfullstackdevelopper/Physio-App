"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/shared/error";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { isAdminEmail } from "@/lib/admin";
import {
  createTestInstructor,
  createTestPatient,
  deleteTestAccount,
  testAccountMembers,
  type TestAccountMember,
} from "@/lib/db/admin";

// Comptes de test (Philippe, 2026-10-10) : un faux kiné et de faux patients,
// créés d'un clic depuis /admin, pour essayer l'application sans e-mail
// d'invitation. Les garde-fous d'isolation sont dans la base
// (supabase/migrations/0064_admin_test_accounts.sql) : adresse jamais déjà
// utilisée, patient de test rattaché à un kiné de test uniquement, suppression
// limitée aux comptes de test.
//
// Adresses « …+clerk_test@example.com » : format reconnu par Clerk, qui
// n'envoie jamais d'e-mail à ces adresses — et si Clerk demande un code de
// vérification à la connexion, c'est toujours 424242.

export type TestAccountResult =
  | { ok: true; kind: "kine" | "patient"; fullName: string; email: string; password: string }
  | { ok: false; error: string }
  | null;

async function requireAdmin() {
  const user = await requireUser(await createClient());
  if (!isAdminEmail(user.email)) redirect("/");
}

function slug(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "compte"
  );
}

function testEmail(kind: "kine" | "patient", name: string): string {
  return `test-${kind}-${slug(name)}-${randomBytes(2).toString("hex")}+clerk_test@example.com`;
}

// 16 caractères tirés au hasard : assez long pour Clerk, jamais réutilisé.
function testPassword(): string {
  return randomBytes(12).toString("base64url");
}

function dbErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("EMAIL_TAKEN")) return "Cette adresse est déjà utilisée. Réessayez.";
  if (msg.includes("NOT_A_TEST_KINE")) return "Un patient de test ne peut être rattaché qu'à un kiné de test.";
  if (msg.includes("NOT_A_TEST_ACCOUNT")) return "Ce compte n'est pas un compte de test.";
  if (msg.includes("HAS_OTHER_PATIENTS"))
    return "Ce kiné de test a encore des patients invités à la main : supprimez-les d'abord depuis son espace.";
  console.error("[admin] comptes de test :", e);
  if (msg.includes("does not exist"))
    return "La base n'est pas encore prête pour les comptes de test (migration 0064 non appliquée).";
  return "Erreur de base de données. Réessayez.";
}

// Crée l'identité Clerk (e-mail + mot de passe). En cas d'échec, le compte
// tout juste créé en base est retiré, pour ne pas laisser une fiche sans
// connexion possible.
async function createClerkUser(
  appId: string,
  email: string,
  password: string,
  fullName: string,
  role: "instructor" | "patient",
): Promise<string | null> {
  const [firstName, ...rest] = fullName.split(/\s+/);
  try {
    const client = await clerkClient();
    await client.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      lastName: rest.join(" ") || undefined,
      publicMetadata: { full_name: fullName, role, test_account: true },
    });
    return null;
  } catch (e) {
    const detail = isClerkAPIResponseError(e) ? e.errors.map((x) => x.code).join(", ") : "";
    console.error("[admin] compte de test : création Clerk en échec", isClerkAPIResponseError(e) ? e.errors : e);
    try {
      await deleteTestAccount(appId);
    } catch (cleanup) {
      console.error("[admin] compte de test : nettoyage après échec Clerk", cleanup);
    }
    return `Clerk a refusé de créer le compte${detail ? ` (${detail})` : ""}. Rien n'a été créé.`;
  }
}

export async function createTestKine(_prev: TestAccountResult, formData: FormData): Promise<TestAccountResult> {
  await requireAdmin();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { ok: false, error: "Donnez un nom au kiné de test." };

  const email = testEmail("kine", fullName);
  const password = testPassword();
  let appId: string;
  try {
    appId = await createTestInstructor(email, fullName);
  } catch (e) {
    return { ok: false, error: dbErrorMessage(e) };
  }
  const clerkError = await createClerkUser(appId, email, password, fullName, "instructor");
  if (clerkError) return { ok: false, error: clerkError };

  revalidatePath("/admin");
  return { ok: true, kind: "kine", fullName, email, password };
}

export async function createTestPatientAction(_prev: TestAccountResult, formData: FormData): Promise<TestAccountResult> {
  await requireAdmin();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const instructorId = String(formData.get("instructor_id") ?? "");
  const freeAccess = formData.get("free_access") === "on";
  if (!fullName) return { ok: false, error: "Donnez un nom au patient de test." };
  if (!instructorId) return { ok: false, error: "Choisissez un kiné de test." };

  const email = testEmail("patient", fullName);
  const password = testPassword();
  let appId: string;
  try {
    appId = await createTestPatient({ email, fullName, instructorId, freeAccess });
  } catch (e) {
    return { ok: false, error: dbErrorMessage(e) };
  }
  const clerkError = await createClerkUser(appId, email, password, fullName, "patient");
  if (clerkError) return { ok: false, error: clerkError };

  revalidatePath("/admin");
  return { ok: true, kind: "patient", fullName, email, password };
}

// Supprime un compte de test (et, pour un kiné, ses patients de test) :
// identités Clerk d'abord, données ensuite. Refusé tant qu'un abonnement
// Stripe est en cours ou que le kiné a des patients hors comptes de test.
export async function deleteTestAccountAction(formData: FormData) {
  await requireAdmin();
  const appId = String(formData.get("id") ?? "");
  if (!appId) return;

  let error: string | null = null;
  let members: TestAccountMember[] = [];
  try {
    members = await testAccountMembers(appId);
  } catch (e) {
    error = dbErrorMessage(e);
  }
  if (!error && members.some((m) => m.other_patients > 0)) error = dbErrorMessage(new Error("HAS_OTHER_PATIENTS"));
  if (!error && members.some((m) => m.has_subscription)) {
    error =
      "Un abonnement Stripe est encore en cours sur ce compte de test : résiliez-le d'abord depuis l'espace du patient.";
  }

  if (!error) {
    try {
      const client = await clerkClient();
      for (const m of members) {
        // Compte jamais connecté : pas encore de lien clerk_id, on retrouve
        // l'identité par l'e-mail — celui d'app_users, que personne ne peut
        // modifier, pour un compte dont on vient de vérifier qu'il est de test.
        const ids = m.clerk_id
          ? [m.clerk_id]
          : (await client.users.getUserList({ emailAddress: [m.email] })).data.map((u) => u.id);
        for (const id of ids) {
          try {
            await client.users.deleteUser(id);
          } catch (e) {
            // Déjà supprimé côté Clerk : on continue.
            if (!(isClerkAPIResponseError(e) && e.status === 404)) throw e;
          }
        }
      }
    } catch (e) {
      console.error("[admin] compte de test : suppression Clerk en échec", e);
      error = "Clerk n'a pas pu supprimer l'identité. Rien n'a été supprimé en base, réessayez.";
    }
  }

  if (!error) {
    try {
      await deleteTestAccount(appId);
    } catch (e) {
      error = dbErrorMessage(e);
    }
  }

  revalidatePath("/admin");
  redirect(error ? `/admin?error=${encodeURIComponent(error)}` : "/admin");
}
