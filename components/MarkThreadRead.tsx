"use client";

import { useEffect } from "react";

// Runs `markConversationRead` once, client-side, whenever the selected
// conversation changes — Next.js 16 forbids revalidatePath() during a server
// component's render (see app/dashboard/messages/actions.ts's comment), so
// this can no longer be a plain `await` inside MessagesPage's render body.
// Renders nothing; the effect is the whole point.
export default function MarkThreadRead({
  patientId,
  action,
}: {
  patientId: string;
  action: (patientId: string) => Promise<void>;
}) {
  useEffect(() => {
    action(patientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `action` is a stable server-action reference, only `patientId` should re-trigger this.
  }, [patientId]);

  return null;
}
