import "server-only";
import { getPool } from "./pool";

// Cabinets (migration 0085, Philippe 2026-11-08) : les kinés d'un même cabinet
// se retrouvent et partagent leurs exercices. Toutes les écritures passent par
// les fonctions internal.cabinet_* (connexion serveur directe, jamais exposée
// au navigateur). L'appelant vérifie TOUJOURS l'identité avant (requireUser /
// requireApprovedInstructor) et passe l'id du kiné connecté, jamais un id venu
// du formulaire comme « acteur ».
//
// Tant que la migration 0085 n'est pas appliquée, les lectures renvoient
// « pas de cabinet » au lieu de casser les pages.

export type CabinetSearchResult = {
  id: string;
  name: string;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  members: number;
};

export type CabinetMember = {
  id: string;
  name: string | null;
  email: string | null;
  role: "owner" | "member";
  status: "pending" | "active";
  requested_at: string;
  joined_at: string | null;
};

export type CabinetView = {
  cabinet: { id: string; name: string; address: string | null; city: string | null; postal_code: string | null };
  me: { role: "owner" | "member"; status: "pending" | "active" };
  members: CabinetMember[];
};

/** Erreurs métier renvoyées par les fonctions SQL (raise exception '<CODE>'). */
export type CabinetErrorCode = "ALREADY_IN_CABINET" | "CABINET_NOT_FOUND" | "NOT_ALLOWED" | "UNKNOWN";

export function cabinetErrorCode(e: unknown): CabinetErrorCode {
  const msg = e instanceof Error ? e.message : String(e);
  for (const code of ["ALREADY_IN_CABINET", "CABINET_NOT_FOUND", "NOT_ALLOWED"] as const) {
    if (msg.includes(code)) return code;
  }
  return "UNKNOWN";
}

function missingMigration(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /does not exist/.test(msg) && /cabinet/.test(msg);
}

export async function searchCabinets(query: string): Promise<CabinetSearchResult[]> {
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  try {
    const { rows } = await getPool().query("select * from internal.cabinet_search($1)", [q]);
    return rows as CabinetSearchResult[];
  } catch (e) {
    if (missingMigration(e)) return [];
    throw e;
  }
}

export async function createCabinet(
  instructorId: string,
  c: { name: string; address?: string | null; city?: string | null; postalCode?: string | null },
): Promise<string> {
  const { rows } = await getPool().query("select internal.cabinet_create($1, $2, $3, $4, $5) as id", [
    instructorId,
    c.name.trim().slice(0, 120),
    c.address?.trim().slice(0, 300) || null,
    c.city?.trim().slice(0, 120) || null,
    c.postalCode?.trim().slice(0, 10) || null,
  ]);
  return rows[0].id as string;
}

export async function requestJoinCabinet(instructorId: string, cabinetId: string): Promise<void> {
  await getPool().query("select internal.cabinet_request_join($1, $2)", [instructorId, cabinetId]);
}

export async function decideCabinetRequest(actorId: string, memberId: string, accept: boolean): Promise<void> {
  await getPool().query("select internal.cabinet_decide($1, $2, $3)", [actorId, memberId, accept]);
}

/** Quitter son cabinet, ou annuler sa demande en attente. */
export async function leaveCabinet(actorId: string): Promise<void> {
  await getPool().query("select internal.cabinet_leave($1)", [actorId]);
}

export async function removeCabinetMember(actorId: string, memberId: string): Promise<void> {
  await getPool().query("select internal.cabinet_remove_member($1, $2)", [actorId, memberId]);
}

export async function cabinetView(instructorId: string): Promise<CabinetView | null> {
  try {
    const { rows } = await getPool().query("select internal.cabinet_team_view($1) as v", [instructorId]);
    return (rows[0]?.v as CabinetView | null) ?? null;
  } catch (e) {
    if (missingMigration(e)) return null;
    throw e;
  }
}

export type AdminCabinetRow = { id: string; name: string; city: string | null; members: number; pending: number; created_at: string };

export async function adminListCabinets(): Promise<AdminCabinetRow[]> {
  try {
    const { rows } = await getPool().query("select * from internal.admin_list_cabinets()");
    return rows as AdminCabinetRow[];
  } catch (e) {
    if (missingMigration(e)) return [];
    throw e;
  }
}
