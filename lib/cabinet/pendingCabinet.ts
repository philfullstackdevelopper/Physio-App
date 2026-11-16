// Contenu du cookie « pending_cabinet » posé par components/KineSignupFlow.tsx
// avant la création du compte, lu par app/signup/finalize. Deux cas
// (Philippe, 2026-11-08) :
//   - « create » : le kiné inscrit son cabinet (nom + adresse obligatoires) ;
//   - « join »   : il demande à rejoindre un cabinet existant (son id).
// Un ancien cookie sans « mode » (avant cette version) vaut « create ».
//
// Depuis le 2026-11-16 (Philippe) :
//   - firstName / lastName : le nom du kiné, demandé au même écran (Clerk ne
//     le demandait pas : le nom devenait le début de l'e-mail) ;
//   - inviteToken : arrivé par le lien d'invitation d'un collègue
//     (/cabinet/<code>, migration 0091) : il entre directement dans le cabinet.
export type PendingCabinet = {
  mode: "create" | "join";
  cabinetId: string | null;
  cabinetName: string;
  cabinetAddress: string;
  phone: string;
  rppsNumber: string | null;
  siret: string | null;
  firstName: string | null;
  lastName: string | null;
  inviteToken: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{32}$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** « Jean » + « Dupont » → « Jean Dupont » ; null si les deux sont vides. */
export function pendingFullName(c: Pick<PendingCabinet, "firstName" | "lastName"> | null): string | null {
  const name = [c?.firstName, c?.lastName].filter(Boolean).join(" ").trim();
  return name || null;
}

export function parsePendingCabinet(raw: unknown): PendingCabinet | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const mode = r.mode === "join" ? "join" : "create";
  const cabinetName = str(r.cabinetName, 120);
  const cabinetAddress = str(r.cabinetAddress, 300);
  const phone = str(r.phone, 40);
  const cabinetId = typeof r.cabinetId === "string" && UUID.test(r.cabinetId) ? r.cabinetId : null;
  const rpps = str(r.rppsNumber, 11).replace(/\s+/g, "");
  const siret = str(r.siret, 14).replace(/\s+/g, "");
  const firstName = str(r.firstName, 60) || null;
  const lastName = str(r.lastName, 60) || null;
  const inviteToken = typeof r.inviteToken === "string" && TOKEN.test(r.inviteToken) ? r.inviteToken : null;
  if (!cabinetName || !phone) return null;
  if (mode === "join" && !cabinetId) return null;
  if (mode === "create" && !cabinetAddress) return null;
  return {
    mode,
    cabinetId: mode === "join" ? cabinetId : null,
    cabinetName,
    cabinetAddress,
    phone,
    rppsNumber: /^\d{9,11}$/.test(rpps) ? rpps : null,
    siret: /^\d{14}$/.test(siret) ? siret : null,
    firstName,
    lastName,
    inviteToken: mode === "join" ? inviteToken : null,
  };
}
