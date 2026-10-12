"use client";

import { useRouter } from "next/navigation";
import NewSeanceModal from "@/components/NewSeanceModal";

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
  return <NewSeanceModal {...rest} createSeance={saveSeance} onClose={() => router.push("/dashboard/seances")} />;
}
