// =============================================================================
// POST /api/protocol — AI-assisted protocol generator (mock).
// -----------------------------------------------------------------------------
// The physio dashboard calls this with a condition + stage and receives a
// structured `ProtocolResponse` (predefined exercises + dosages) to review.
//
// AUTHORIZATION NOTE: because a Prisma/app-layer data model bypasses Supabase
// RLS, protected routes like this MUST verify the caller is an authenticated
// PHYSIO or ADMIN in code. The check below is a placeholder — wire it to your
// real session (Supabase auth.getUser() + role lookup) before shipping.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import {
  generateProtocol,
  type ProtocolRequest,
  type ProtocolResponse,
} from "@/lib/ai/protocol";

/** Minimal runtime validation of the incoming body. */
function parseBody(body: unknown): ProtocolRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.condition !== "string" || b.condition.trim() === "") return null;
  if (typeof b.stage !== "string" && typeof b.stage !== "number") return null;
  return {
    condition: b.condition,
    stage: b.stage as ProtocolRequest["stage"],
    patientContext:
      typeof b.patientContext === "object" && b.patientContext !== null
        ? (b.patientContext as ProtocolRequest["patientContext"])
        : undefined,
  };
}

export async function POST(request: NextRequest) {
  // TODO(auth): replace with real session check.
  //   const { data: { user } } = await createClient().auth.getUser();
  //   if (!user || (await roleOf(user.id)) !== "PHYSIO") return 403.

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
  }

  const req = parseBody(json);
  if (!req) {
    return NextResponse.json(
      { error: "Champs requis : `condition` (string) et `stage` (1-4 ou enum)." },
      { status: 400 },
    );
  }

  const protocol: ProtocolResponse = await generateProtocol(req);
  return NextResponse.json(protocol, { status: 200 });
}
