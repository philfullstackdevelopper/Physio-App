import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import ContributorsView from "@/components/ContributorsView";
import { contributorRanking, type PublicationStatus } from "@/lib/exercise/kineExercises";

// Les kinés qui enrichissent la bibliothèque (Philippe, 2026-11-04) :
// exercices de kinés publiés, comptés par auteur (components/ContributorsView).
export default async function ContributeursPage() {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const { data } = await supabase
    .from("exercises")
    .select("created_by, publication_status, author_label")
    .not("created_by", "is", null)
    .eq("publication_status", "published");
  const ranking = contributorRanking(
    (data ?? []).map((r) => ({
      created_by: r.created_by as string | null,
      publication_status: r.publication_status as PublicationStatus,
      author_label: r.author_label as string | null,
    })),
  );
  return <ContributorsView ranking={ranking} meId={user.id} />;
}
