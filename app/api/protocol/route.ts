// =============================================================================
// POST /api/protocol — AI-assisted protocol generator (mock).
// -----------------------------------------------------------------------------
// The physio dashboard calls this with a condition + stage and receives a
// structured `ProtocolResponse` (predefined exercises + dosages) to review.
//
// MAQUETTE (CLAUDE.md §7) : contenu clinique INVENTÉ, branché sur aucun
// écran. Réservé à l'administrateur (audit du 2026-11-10 — tout kiné validé
// pouvait encore l'appeler et recevoir ce contenu inventé) ; tout autre appel
// reçoit une 404, comme si elle n'existait pas.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { requireUser } from "@/lib/supabase/require-user";
import { isAdminEmail } from "@/lib/admin";
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
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

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
