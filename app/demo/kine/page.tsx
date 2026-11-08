import { getTranslations } from "next-intl/server";
import DemoShell from "@/components/DemoShell";
import KineTelephonePrototype from "@/app/prototypes/kine-telephone/page";

// Démo publique, espace kiné : les écrans de /prototypes/kine-telephone
// (vrais composants, données fictives), rendus navigables par DemoShell.
export async function generateMetadata() {
  const t = await getTranslations("demo.meta");
  return { title: t("kine") };
}
export const dynamic = "force-dynamic";

export default async function DemoKinePage({
  searchParams,
}: {
  searchParams: Promise<{ ecran?: string; nouvelle?: string; patient?: string; filtre?: string; seance?: string }>;
}) {
  const screen = await KineTelephonePrototype({ searchParams });
  return <DemoShell side="kine">{screen}</DemoShell>;
}
