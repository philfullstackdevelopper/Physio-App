"use client";

// Erreur imprévue dans cette partie du site : même écran « Réessayer » que
// app/error.tsx, affiché ici À L'INTÉRIEUR du cadre (menu toujours visible).
import AppError from "@/app/error";

export default function SegmentError(props: { error: unknown; retry: () => void }) {
  return <AppError {...props} />;
}
