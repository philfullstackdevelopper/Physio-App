"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// A server-side redirect() thrown as the direct target of Clerk's
// post-sign-in client navigation hangs the transition (Next 16 + Turbopack
// dev, confirmed by isolation test — a plain rendered page works, a
// redirect() doesn't). Doing the navigation as an ordinary client-side
// router call instead avoids that code path entirely.
export default function ClientRedirect({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    // Firing router.replace() synchronously in this effect races Clerk's own
    // pending post-sign-in transition and hangs (confirmed by isolation
    // testing). Deferring to the next tick lets Clerk's transition settle
    // first.
    const id = setTimeout(() => router.replace(to), 0);
    return () => clearTimeout(id);
  }, [router, to]);

  return null;
}
