import DashboardSidebar from "@/components/DashboardSidebar";
import { signout } from "./actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <DashboardSidebar signoutAction={signout} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
