import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type InstructorSummary = {
  status: string | null;
  full_name: string | null;
  cabinet_name: string | null;
};

/** Shared load for the instructor's own row: the dashboard layout (gates on
 *  `status`) and the dashboard home page (displays `full_name`) both need it
 *  on every /dashboard/* navigation. cache()-wrapped so they share one round
 *  trip against the same row instead of two near-identical queries. */
export const getInstructor = cache(
  async (supabase: SupabaseClient, userId: string): Promise<InstructorSummary | null> => {
    const { data, error } = await supabase
      .from("instructors")
      .select("status, full_name, cabinet_name")
      .eq("id", userId)
      .maybeSingle();
    // A query failure (PostgREST unreachable, network blip) used to look
    // identical to "this Clerk user really isn't an instructor" — silently
    // routing a real instructor to /patient instead of /dashboard. Surface
    // it instead of guessing.
    if (error) {
      throw new Error("Impossible de vérifier le profil kiné : " + error.message);
    }
    return data;
  },
);
