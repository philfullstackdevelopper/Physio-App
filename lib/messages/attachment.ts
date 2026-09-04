// Pièces jointes des messages : conventions partagées entre l'upload côté
// navigateur (composant) et la validation côté serveur (actions).

export const ATTACHMENT_BUCKET = "message-attachments";
export const ATTACHMENT_MAX_MB = 20;

/** Chemin de stockage : "<patient_id>/<uuid>-<nom nettoyé>". */
export function attachmentPath(patientId: string, fileName: string): string {
  const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  return `${patientId}/${crypto.randomUUID()}-${safe}`;
}

/** Un chemin n'est acceptable que s'il vit sous le dossier du patient concerné. */
export function isAttachmentPathFor(path: string, patientId: string): boolean {
  return path.startsWith(`${patientId}/`) && !path.includes("..") && path.length > patientId.length + 1;
}
