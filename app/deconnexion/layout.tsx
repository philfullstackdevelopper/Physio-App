import ClerkShell from "@/components/ClerkShell";

// Clerk (connexion) chargé seulement dans les parties qui en ont besoin
// (audit vitesse du 2026-11-25, components/ClerkShell.tsx).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClerkShell>{children}</ClerkShell>;
}
