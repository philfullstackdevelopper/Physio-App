import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { ShieldCheck, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { isAdminEmail } from "@/lib/admin";

// Gate for every /admin/* route. Single-owner allowlist (ADMIN_EMAILS) rather
// than a roles table — see lib/admin.ts.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  if (!isAdminEmail(user.email)) redirect("/");

  return (
    // Une page = un écran (audit des formats, 2026-10-12) : l'en-tête reste
    // en place, seule la zone des listes défile.
    <div className="flex h-dvh flex-col bg-slate-50">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4 max-sm:px-4 max-sm:py-3 short:py-2.5">
        <span className="flex items-center gap-2 font-display text-lg font-semibold text-slate-900">
          <ShieldCheck className="h-5 w-5 text-blue-600" strokeWidth={1.75} />
          EasyPhysio — Admin
        </span>
        <SignOutButton redirectUrl="/login">
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Se déconnecter
          </button>
        </SignOutButton>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-3xl p-6 max-sm:p-4 sm:p-8 short:sm:py-5">{children}</div>
      </div>
    </div>
  );
}
