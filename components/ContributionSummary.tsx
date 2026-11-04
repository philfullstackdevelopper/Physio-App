// En-tête de « Mes exercices » (Philippe, 2026-11-04 : discret mais visible,
// « premium et pro ») : qui enrichit la bibliothèque (pile d'initiales, comme
// les contributeurs d'un dépôt GitHub), ce que le kiné a publié, et son titre
// « Contributeur EasyPhysio » à partir de 5 — sans barre ni trophée.
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { AuthorAvatar } from "@/components/ContributorCredit";
import { contributorTitle, nextContributorStep } from "@/lib/exercise/kineExercises";

export default function ContributionSummary({
  contributors,
  published,
  pending,
}: {
  /** Auteurs d'exercices publiés, du plus prolifique au moins. */
  contributors: { id: string; label: string }[];
  published: number;
  pending: number;
}) {
  const title = contributorTitle(published);
  const next = nextContributorStep(published);
  const shown = contributors.slice(0, 5);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <Link
        href="/dashboard/exercises/contributeurs"
        className="group flex items-center gap-2 rounded-md hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
      >
        {shown.length > 0 && (
          <span className="flex -space-x-1.5">
            {shown.map((c) => (
              <span key={c.id} className="rounded-full ring-2 ring-app-bg">
                <AuthorAvatar label={c.label} size={20} />
              </span>
            ))}
          </span>
        )}
        <span className="underline-offset-2 group-hover:underline">
          {contributors.length === 0
            ? "Contributeurs"
            : `Bibliothèque enrichie par ${contributors.length} kiné${contributors.length > 1 ? "s" : ""}`}
        </span>
      </Link>
      {(published > 0 || pending > 0) && (
        <span className="tabular-nums" title={next ?? undefined}>
          · {published} publié{published > 1 ? "s" : ""}
          {pending > 0 ? ` · ${pending} en vérification` : ""}
        </span>
      )}
      {title && (
        <span
          title={next ?? undefined}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-ink"
        >
          <BadgeCheck className="h-3.5 w-3.5 text-brand" strokeWidth={2} />
          {title}
        </span>
      )}
    </div>
  );
}
