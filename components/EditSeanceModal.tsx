"use client";

import { useRouter } from "next/navigation";
import NewSeanceModal from "@/components/NewSeanceModal";
import { useAppHref } from "@/components/DemoContext";

// « Modifier la séance » (Philippe, 2026-10-12) : la même fenêtre que
// « Nouvelle séance » et « Ajuster la séance » — exercices de la séance à
// gauche, bibliothèque en blocs à droite — pré-remplie. Remplace l'ancienne
// page en liste de cases à cocher. Fermer ramène à « Mes séances ».
type Props = Omit<React.ComponentProps<typeof NewSeanceModal>, "onClose" | "createSeance" | "edit"> & {
  saveSeance: (formData: FormData) => void;
  edit: NonNullable<React.ComponentProps<typeof NewSeanceModal>["edit"]>;
};

export default function EditSeanceModal({ saveSeance, ...rest }: Props) {
  const router = useRouter();
  // Dans la démo publique, « Mes séances » est un écran de démo (DemoContext).
  const appHref = useAppHref();
  return <NewSeanceModal {...rest} createSeance={saveSeance} onClose={() => router.push(appHref("/dashboard/seances"))} />;
}
