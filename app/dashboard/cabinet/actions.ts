"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import {
  cabinetErrorCode,
  createCabinet,
  decideCabinetRequest,
  leaveCabinet,
  removeCabinetMember,
  requestJoinCabinet,
  searchCabinets,
  type CabinetSearchResult,
} from "@/lib/db/cabinets";
import { splitPostalCity } from "@/lib/cabinet/address";

// Page « Mon cabinet » (migration 0085). Chaque action vérifie d'abord qui est
// connecté, puis passe SON id aux fonctions serveur : un formulaire ne peut
// jamais agir au nom d'un autre kiné. Les règles (un seul cabinet, accord d'un
// membre actif, retrait réservé au fondateur) sont vérifiées dans la base.

export type CabinetActionResult = { ok?: true; error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function me() {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  return user.id;
}

async function fail(e: unknown): Promise<CabinetActionResult> {
  const t = await getTranslations("dashboard.cabinet.errors");
  const code = cabinetErrorCode(e);
  if (code === "UNKNOWN") console.error("cabinet", e);
  return { error: t(code === "ALREADY_IN_CABINET" ? "alreadyIn" : code === "CABINET_NOT_FOUND" ? "notFound" : code === "NOT_ALLOWED" ? "notAllowed" : "unknown") };
}

function done(): CabinetActionResult {
  revalidatePath("/dashboard/cabinet");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function searchCabinetsAction(query: string): Promise<CabinetSearchResult[]> {
  await me();
  const q = String(query ?? "").trim();
  if (q.length < 2 || q.length > 80) return [];
  return searchCabinets(q).catch(() => []);
}

export async function createCabinetAction(formData: FormData): Promise<CabinetActionResult> {
  const id = await me();
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  if (name.length < 2) {
    const t = await getTranslations("dashboard.cabinet.errors");
    return { error: t("nameRequired") };
  }
  try {
    await createCabinet(id, { name, address, ...splitPostalCity(address) });
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function requestJoinAction(cabinetId: string): Promise<CabinetActionResult> {
  const id = await me();
  if (!UUID.test(String(cabinetId))) return fail(new Error("CABINET_NOT_FOUND"));
  try {
    await requestJoinCabinet(id, cabinetId);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function decideRequestAction(memberId: string, accept: boolean): Promise<CabinetActionResult> {
  const id = await me();
  if (!UUID.test(String(memberId))) return fail(new Error("NOT_ALLOWED"));
  try {
    await decideCabinetRequest(id, memberId, !!accept);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function removeMemberAction(memberId: string): Promise<CabinetActionResult> {
  const id = await me();
  if (!UUID.test(String(memberId))) return fail(new Error("NOT_ALLOWED"));
  try {
    await removeCabinetMember(id, memberId);
    return done();
  } catch (e) {
    return fail(e);
  }
}

/** Quitter son cabinet, ou annuler sa demande en attente. */
export async function leaveCabinetAction(): Promise<CabinetActionResult> {
  const id = await me();
  try {
    await leaveCabinet(id);
    return done();
  } catch (e) {
    return fail(e);
  }
}
