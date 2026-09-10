// Verifies a kiné's RPPS number against the French government's Annuaire
// Santé (RPPS/ADELI directory), via its free FHIR R4 API.
//   GET https://gateway.api.esante.gouv.fr/fhir/v2/Practitioner?identifier=<rpps>
//   header: ESANTE-API-KEY: <key>
// A match is a Bundle with total >= 1, entry[0].resource.active === true, and
// a qualification matching "masseur-kinésithérapeute". Any missing key,
// network failure, or non-match falls back to "unverified" — everything that
// calls this function (app/signup/onboarding/actions.ts) already treats that
// as a valid, expected outcome (manual admin verification takes over).
export type RppsVerification = { status: "verified"; verifiedAt: string } | { status: "unverified" };

type FhirPractitionerBundle = {
  total?: number;
  entry?: { resource?: { active?: boolean; qualification?: { code?: { coding?: { display?: string }[] } }[] } }[];
};

export async function verifyRpps(rppsNumber: string): Promise<RppsVerification> {
  const apiKey = process.env.ESANTE_API_KEY;
  if (!apiKey) return { status: "unverified" };

  try {
    const res = await fetch(
      `https://gateway.api.esante.gouv.fr/fhir/v2/Practitioner?identifier=${encodeURIComponent(rppsNumber)}`,
      { headers: { "ESANTE-API-KEY": apiKey } },
    );
    if (!res.ok) return { status: "unverified" };

    const bundle: FhirPractitionerBundle = await res.json();
    const practitioner = bundle.entry?.[0]?.resource;
    const isKine = practitioner?.qualification?.some((q) =>
      q.code?.coding?.some((c) => c.display?.toLowerCase().includes("masseur-kinésithérapeute")),
    );
    if ((bundle.total ?? 0) >= 1 && practitioner?.active && isKine) {
      return { status: "verified", verifiedAt: new Date().toISOString() };
    }
    return { status: "unverified" };
  } catch {
    return { status: "unverified" };
  }
}
