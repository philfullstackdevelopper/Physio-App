import "server-only";
import { getPool } from "@/lib/db/pool";

// Téléphones à notifier (migration 0083, table push_tokens) : uniquement par
// les fonctions internal.* — jamais depuis le navigateur.

export async function registerPushToken(appUserId: string, token: string, platform: "ios" | "android"): Promise<void> {
  await getPool().query("select internal.register_push_token($1, $2, $3)", [appUserId, token, platform]);
}

/** Jeton d'un téléphone qui s'est déconnecté, ou que le service refuse. */
export async function forgetPushTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  await getPool().query("select internal.forget_push_tokens($1)", [tokens]);
}

export async function pushTokensFor(appUserIds: string[]): Promise<string[]> {
  if (appUserIds.length === 0) return [];
  const { rows } = await getPool().query<{ token: string }>("select token from internal.push_tokens_for($1)", [appUserIds]);
  return rows.map((r) => r.token);
}

/** Patients à qui rappeler la séance du jour, avec leur identifiant (pour
 *  écrire le rappel dans leur langue). */
export async function reminderTargets(): Promise<{ appUserId: string; token: string }[]> {
  const { rows } = await getPool().query<{ app_user_id: string; token: string }>(
    "select app_user_id, token from internal.push_reminder_targets()",
  );
  return rows.map((r) => ({ appUserId: r.app_user_id, token: r.token }));
}
