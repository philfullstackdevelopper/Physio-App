// Verifies a kiné's RPPS number against the French government's Annuaire
// Santé (RPPS/ADELI directory), via its free FHIR R4 API.
//   GET https://gateway.api.esante.gouv.fr/fhir/v2/Practitioner?identifier=<rpps>
//   header: ESANTE-API-KEY: <key>
// "verified" requires ALL of: Bundle with total >= 1, entry[0].resource.active
// === true, a qualification matching "masseur-kinésithérapeute", AND the
// declared name matching the directory's name for that RPPS. The name check
// matters: an RPPS number is public (searchable on annuaire.sante.fr by
// anyone), so a valid-and-active RPPS alone doesn't prove the signer is that
// practitioner — callers use "verified" to auto-approve an instructor account
// (Philippe, 2026-09-10), so the name match is what keeps that safe against
// someone entering a real kiné's public RPPS number to get approved as them.
// Any missing key, network failure, RPPS mismatch, or name mismatch falls
// back to "unverified" — everything that calls this function already treats
// that as a valid, expected outcome (manual admin verification takes over).
export type RppsVerification = { status: "verified"; verifiedAt: string } | { status: "unverified" };

type FhirPractitionerBundle = {
  total?: number;
  entry?: {
    resource?: {
      active?: boolean;
      qualification?: { code?: { coding?: { display?: string }[] } }[];
      name?: { text?: string; family?: string; given?: string[] }[];
    };
  }[];
};

// Case/accent/word-order-insensitive: "Jean-Paul Belmondo" matches "BELMONDO
// Jean-Paul" or "belmondo jean paul", but not a different name entirely.
function normalizedNameTokens(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort();
}

function namesMatch(declaredName: string, directoryName: string): boolean {
  const declared = normalizedNameTokens(declaredName);
  const directory = normalizedNameTokens(directoryName);
  if (declared.length === 0 || directory.length === 0) return false;
  return declared.length === directory.length && declared.every((t, i) => t === directory[i]);
}

export async function verifyRpps(rppsNumber: string, declaredName: string): Promise<RppsVerification> {
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
    const directoryName = practitioner?.name?.[0];
    const directoryNameText =
      directoryName?.text ?? [directoryName?.given?.join(" "), directoryName?.family].filter(Boolean).join(" ");
    const isNameMatch = directoryNameText ? namesMatch(declaredName, directoryNameText) : false;

    if ((bundle.total ?? 0) >= 1 && practitioner?.active && isKine && isNameMatch) {
      return { status: "verified", verifiedAt: new Date().toISOString() };
    }
    return { status: "unverified" };
  } catch {
    return { status: "unverified" };
  }
}
