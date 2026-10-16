import DemoShell from "@/components/DemoShell";
import KineTelephonePrototype from "@/app/prototypes/kine-telephone/page";

// Démo publique, espace kiné : les écrans de /prototypes/kine-telephone
// (vrais composants, données fictives), rendus navigables par DemoShell.
export const metadata = { title: "Démo · espace kiné" };
export const dynamic = "force-dynamic";

export default async function DemoKinePage({ searchParams }: { searchParams: Promise<{ ecran?: string; nouvelle?: string }> }) {
  const screen = await KineTelephonePrototype({ searchParams });
  return <DemoShell side="kine">{screen}</DemoShell>;
}
