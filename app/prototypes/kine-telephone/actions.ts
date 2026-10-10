"use server";

// Actions factices de l'aperçu /prototypes/kine-telephone : elles ne touchent
// à aucune donnée, elles répondent juste « désactivé ».

export async function noopResult(): Promise<{ error: string }> {
  return { error: "Aperçu : action désactivée." };
}

export async function noopVoid(): Promise<void> {}
