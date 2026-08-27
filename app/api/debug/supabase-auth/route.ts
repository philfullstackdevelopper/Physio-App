import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

// TEMPORARY diagnostic route (dev only) — investigating why the onboarding
// "conditions" dropdown renders empty. Delete once root-caused.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const { userId, getToken } = await auth();
  const token = await getToken();

  const supabase = await createClient();
  const { data: conditions, error: conditionsError } = await supabase
    .from("conditions")
    .select("id, name");

  return NextResponse.json({
    clerkUserId: userId,
    hasToken: !!token,
    conditionsCount: conditions?.length ?? null,
    conditionsError: conditionsError
      ? { message: conditionsError.message, code: conditionsError.code, hint: conditionsError.hint }
      : null,
  });
}
