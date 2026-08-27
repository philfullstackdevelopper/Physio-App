import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type InstructorSummary = {
  status: string | null;
  full_name: string | null;
};

/** Shared load for the instructor's own row: the dashboard layout (gates on
 *  `status`) and the dashboard home page (displays `full_name`) both need it
 *  on every /dashboard/* navigation. cache()-wrapped so they share one round
 *  trip against the same row instead of two near-identical queries. */
export const getInstructor = cache(
  async (supabase: SupabaseClient, userId: string): Promise<InstructorSummary | null> => {
    const { data } = await supabase
      .from("instructors")
      .select("status, full_name")
      .eq("id", userId)
      .maybeSingle();
    return data;
  },
);
