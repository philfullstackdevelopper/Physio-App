import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { AuthorAvatar } from "@/components/ContributorCredit";
import { contributorRanking, contributorTitle, nextContributorStep, type ContributorRank, type PublicationStatus } from "@/lib/exercise/kineExercises";

// Les kinés qui enrichissent la bibliothèque (Philippe, 2026-11-04) : un
// tableau sobre, comme la liste des contributeurs d'un dépôt GitHub ou un
// classement Strava — rang, kiné, exercices publiés. Les 10 premiers, plus
// la ligne du kiné connecté s'il est plus loin.
function Row({ r, rank, meId }: { r: ContributorRank; rank: number; meId: string }) {
  const me = r.authorId === meId;
  const title = contributorTitle(r.count);
  return (
    <tr className={`border-t border-line ${me ? "bg-brand-soft/60" : ""}`}>
      <td className={`w-10 py-2.5 pl-4 pr-2 text-right tabular-nums ${rank <= 3 ? "font-semibold text-ink" : "text-muted"}`}>{rank}</td>
      <td className="py-2.5 pr-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <AuthorAvatar label={r.label} size={28} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink">{me ? `${r.label} (vous)` : r.label}</span>
            {title && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                <BadgeCheck className="h-3 w-3 text-brand" strokeWidth={2} />
                {title}
              </span>
            )}
          </span>
        </span>
      </td>
      <td className="py-2.5 pl-2 pr-4 text-right text-sm tabular-nums text-ink">{r.count}</td>
    </tr>
  );
}

export default async function ContributeursPage() {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const { data } = await supabase
    .from("exercises")
    .select("created_by, publication_status, author_label")
    .not("created_by", "is", null)
    .eq("publication_status", "published");
  const rows = (data ?? []).map((r) => ({
    created_by: r.created_by as string | null,
    publication_status: r.publication_status as PublicationStatus,
    author_label: r.author_label as string | null,
  }));
  const ranking = contributorRanking(rows);
  const mineIndex = ranking.findIndex((r) => r.authorId === user.id);
  const mine = mineIndex >= 0 ? ranking[mineIndex] : null;
  const top = ranking.slice(0, 10);
  const myCount = mine?.count ?? 0;


  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-8 pt-2 sm:px-8 sm:py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">Contributeurs</h1>
        <Link href="/dashboard/exercises" className="text-sm font-medium text-brand hover:underline max-sm:hidden">
          ← Mes exercices
        </Link>
      </div>
      <p className="mt-1 max-w-[60ch] text-sm text-muted">
        Les kinés dont les exercices, vérifiés par EasyPhysio, enrichissent la bibliothèque de tous. À 5 exercices publiés, le titre
        « Contributeur EasyPhysio » s&apos;affiche sur leur profil.
      </p>

      <div className="mt-5 overflow-hidden rounded-xl border border-line bg-surface">
        {top.length === 0 ? (
          <p className="p-5 text-sm text-muted">
            Aucun exercice de kiné n&apos;est encore publié. Proposez les vôtres depuis « Mes exercices » en cochant « Rendre public pour
            tous ».
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
                <th className="py-2 pl-4 pr-2 text-right font-semibold">#</th>
                <th className="py-2 pr-3 font-semibold">Kiné</th>
                <th className="py-2 pl-2 pr-4 text-right font-semibold">Publiés</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r, i) => (
                <Row key={r.authorId} r={r} rank={i + 1} meId={user.id} />
              ))}
              {mine && mineIndex >= 10 && <Row r={mine} rank={mineIndex + 1} meId={user.id} />}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-3 text-xs text-muted">
        {mine
          ? `Vous avez ${myCount} exercice${myCount > 1 ? "s" : ""} publié${myCount > 1 ? "s" : ""}. ${nextContributorStep(myCount) ?? ""}`
          : "Vous n'avez pas encore d'exercice publié."}
      </p>
    </main>
  );
}
