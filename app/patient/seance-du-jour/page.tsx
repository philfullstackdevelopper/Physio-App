import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { loadPatientHome } from "@/lib/patient/home-data";
import SeanceDuJourView from "./SeanceDuJourView";

export default async function SeanceDuJourPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const home = await loadPatientHome(supabase, user.id);
  const { activeWorkout, doneToday, weekComplete } = home;

  return <SeanceDuJourView activeWorkout={activeWorkout} doneToday={doneToday} weekComplete={weekComplete} />;
}
