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
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <span className="flex items-center gap-2 font-display text-lg font-semibold text-slate-900">
          <ShieldCheck className="h-5 w-5 text-blue-600" strokeWidth={1.75} />
          Physio-App — Admin
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
      <div className="mx-auto max-w-3xl p-6 sm:p-8">{children}</div>
    </div>
  );
}
