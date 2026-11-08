"use server";

import { getTranslations } from "next-intl/server";
import { getPool } from "@/lib/db/pool";

// Liste d'attente du lancement (Philippe, 2026-10-12) : formulaire public de
// la page d'accueil (components/WaitlistForm.tsx). Pas de session ici — un
// visiteur anonyme laisse son e-mail. L'écriture passe par
// internal.waitlist_add() (migration 0066), qui n'ajoute qu'une adresse, ne
// renvoie jamais la liste, et plafonne à 200 inscriptions par heure.

export type WaitlistState = { ok: boolean; error: string | null };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  // Champ piège invisible : un humain ne le remplit pas, un robot si. On
  // répond « merci » sans rien enregistrer, pour ne pas l'aider à s'adapter.
  if (String(formData.get("website") ?? "").trim() !== "") return { ok: true, error: null };

  const t = await getTranslations("home.waitlist.errors");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = formData.get("role") === "patient" ? "patient" : "kine";
  if (!EMAIL.test(email) || email.length > 254) {
    return { ok: false, error: t("invalidEmail") };
  }

  try {
    const { rows } = await getPool().query<{ r: string }>("select internal.waitlist_add($1, $2) as r", [email, role]);
    const r = rows[0]?.r;
    if (r === "ok") return { ok: true, error: null };
    if (r === "invalid") return { ok: false, error: t("invalidEmail") };
    return { ok: false, error: t("tooMany") };
  } catch (e) {
    console.error("[waitlist] inscription impossible", e);
    return { ok: false, error: t("failed") };
  }
}
