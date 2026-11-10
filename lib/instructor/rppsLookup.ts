// =============================================================================
// Recherche d'un kiné dans l'Annuaire Santé à partir de son numéro RPPS, pour
// PRÉ-REMPLIR le formulaire d'inscription (Philippe, 2026-11-02) : si le
// numéro est reconnu, le kiné voit son nom et son cabinet et peut cliquer
// pour remplir les champs. Ce n'est plus un contrôle : numéro inconnu, API
// indisponible ou clé absente → null, et il remplit simplement les champs.
//
// SERVEUR UNIQUEMENT (clé ESANTE_API_KEY).
// =============================================================================
import "server-only";

const BASE = "https://gateway.api.esante.gouv.fr/fhir/v2";

export type RppsMatch = {
  fullName: string;
  cabinetName: string | null;
  cabinetAddress: string | null;
  phone: string | null;
};

type FhirName = { text?: string; family?: string; given?: string[]; prefix?: string[] };
type FhirAddress = { text?: string; line?: string[]; postalCode?: string; city?: string };
type FhirTelecom = { system?: string; value?: string };
type FhirResource = {
  resourceType?: string;
  id?: string;
  active?: boolean;
  name?: FhirName[] | string;
  address?: FhirAddress[];
  telecom?: FhirTelecom[];
  organization?: { reference?: string };
};
type FhirBundle = { entry?: { resource?: FhirResource; search?: { mode?: string } }[] };

function nameText(n: FhirName | undefined): string {
  if (!n) return "";
  if (n.text) return n.text.trim();
  return [n.given?.join(" "), n.family].filter(Boolean).join(" ").trim();
}

function addressText(a: FhirAddress | undefined): string | null {
  if (!a) return null;
  if (a.text) return a.text.trim();
  const street = (a.line ?? []).filter(Boolean).join(" ").trim();
  const town = [a.postalCode, a.city].filter(Boolean).join(" ").trim();
  return [street, town].filter(Boolean).join(", ") || null;
}

async function getBundle(url: string, apiKey: string): Promise<FhirBundle | null> {
  // 5 secondes au plus : si l'Annuaire Santé ne répond pas, l'inscription ne
  // reste pas bloquée (l'erreur est rattrapée par lookupRpps → « introuvable »).
  const res = await fetch(url, { headers: { "ESANTE-API-KEY": apiKey }, cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  return (await res.json()) as FhirBundle;
}

export async function lookupRpps(rppsNumber: string): Promise<RppsMatch | null> {
  const apiKey = process.env.ESANTE_API_KEY;
  const rpps = rppsNumber.replace(/\s+/g, "");
  if (!apiKey || !/^\d{9,11}$/.test(rpps)) return null;

  try {
    const practitioners = await getBundle(`${BASE}/Practitioner?identifier=${encodeURIComponent(rpps)}`, apiKey);
    const practitioner = practitioners?.entry?.[0]?.resource;
    if (!practitioner?.id) return null;
    const fullName = nameText(Array.isArray(practitioner.name) ? practitioner.name[0] : undefined);
    if (!fullName) return null;

    // Son lieu d'exercice : la « situation d'exercice » (PractitionerRole) et
    // la structure (Organization) qui y est rattachée.
    const roles = await getBundle(
      `${BASE}/PractitionerRole?practitioner=${encodeURIComponent(practitioner.id)}&_include=PractitionerRole:organization`,
      apiKey,
    );
    const resources = (roles?.entry ?? []).map((e) => e.resource).filter((r): r is FhirResource => !!r);
    const role = resources.find((r) => r.resourceType === "PractitionerRole" && r.active !== false) ??
      resources.find((r) => r.resourceType === "PractitionerRole");
    const orgId = role?.organization?.reference?.split("/").pop();
    const org =
      resources.find((r) => r.resourceType === "Organization" && (!orgId || r.id === orgId)) ?? null;

    const phone =
      [...(role?.telecom ?? []), ...(org?.telecom ?? [])].find((t) => t.system === "phone" && t.value)?.value ?? null;

    return {
      fullName,
      cabinetName: typeof org?.name === "string" && org.name.trim() ? org.name.trim() : null,
      cabinetAddress: addressText(org?.address?.[0]),
      phone,
    };
  } catch {
    return null;
  }
}
