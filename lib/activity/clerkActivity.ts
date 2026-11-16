import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import type { SeenInfo } from "./activity";

// Dernière visite / dernière connexion de chaque compte, telles que Clerk les
// connaît (Clerk gère les connexions, CLAUDE.md §8). Rangé par e-mail en
// minuscules, pour le rapprocher des kinés et patients de la base. Clerk ne
// détient aucune donnée de santé : ce ne sont que des dates.
// En cas d'erreur (Clerk injoignable), la vue « Activité » s'affiche quand
// même, sans ces dates.

const PAGE = 500;
const MAX_PAGES = 20;

export async function lastSeenByEmail(): Promise<Map<string, SeenInfo>> {
  const out = new Map<string, SeenInfo>();
  try {
    const client = await clerkClient();
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data } = await client.users.getUserList({ limit: PAGE, offset: page * PAGE, orderBy: "-created_at" });
      for (const u of data) {
        const info: SeenInfo = {
          lastActiveAt: u.lastActiveAt ? new Date(u.lastActiveAt).toISOString() : null,
          lastSignInAt: u.lastSignInAt ? new Date(u.lastSignInAt).toISOString() : null,
        };
        for (const e of u.emailAddresses) out.set(e.emailAddress.trim().toLowerCase(), info);
      }
      if (data.length < PAGE) break;
    }
  } catch (e) {
    console.error("[admin] activité : dates de connexion Clerk indisponibles", e);
  }
  return out;
}
