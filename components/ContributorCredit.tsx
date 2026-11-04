// Crédit d'un exercice proposé par un kiné (Philippe, 2026-11-04) : petites
// initiales + « Proposé par … », en gris, comme « by … » sur Figma Community
// ou l'auteur d'une extension Raycast. Rien de plus sur la carte.
import { authorInitials } from "@/lib/exercise/kineExercises";

export function AuthorAvatar({ label, size = 16 }: { label: string | null; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.42)) }}
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-app-bg font-semibold text-muted"
    >
      {authorInitials(label)}
    </span>
  );
}

export default function ContributorCredit({ label, className = "" }: { label: string | null; className?: string }) {
  return (
    <span className={`flex min-w-0 items-center gap-1.5 text-xs text-muted ${className}`}>
      <AuthorAvatar label={label} />
      <span className="truncate">Proposé par {label || "un kiné"}</span>
    </span>
  );
}
