import { getTranslations } from "next-intl/server";
import DemoShell from "@/components/DemoShell";
import AccueilPatientPrototype from "@/app/prototypes/accueil-patient/page";
import MessagesPatientPrototype from "@/app/prototypes/messages-patient/page";
import PatientEcransPrototype from "@/app/prototypes/patient-ecrans/page";

// Démo publique, espace patient : les écrans d'aperçu patient (vrais
// composants, données fictives), rendus navigables par DemoShell.
export async function generateMetadata() {
  const t = await getTranslations("demo.meta");
  return { title: t("patient") };
}
export const dynamic = "force-dynamic";

export default async function DemoPatientPage({ searchParams }: { searchParams: Promise<{ ecran?: string; depuis?: string }> }) {
  const { ecran = "accueil", depuis } = await searchParams;
  const screen =
    ecran === "accueil"
      ? await AccueilPatientPrototype()
      : ecran === "messages"
        ? await MessagesPatientPrototype()
        : await PatientEcransPrototype({ searchParams: Promise.resolve({ ecran, depuis }) });
  return <DemoShell side="patient">{screen}</DemoShell>;
}
