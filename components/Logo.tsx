import Link from "next/link";

/** Logo EasyPhysio — repris à l'identique de la maquette d'identité visuelle
 *  de Philippe (2026-10-07 : « exactement le même ») : public/brand/
 *  easyphysio-icon.png (icône carrée) et easyphysio-logo.png (silhouette +
 *  « EasyPhysio »), découpés dans la maquette. Pour une icône d'app en haute
 *  définition (512 px, stores), il faudra le fichier source du logo. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- petit PNG statique, aucun gain avec next/image
    <img src="/brand/easyphysio-icon.png" width={size} height={size} alt="" className="shrink-0" />
  );
}

/** Logo complet de la maquette (silhouette + « EasyPhysio »), sans la
 *  bordure Link — pour les en-têtes, menus et pieds de page. `tone="light"` :
 *  texte blanc, pour les fonds sombres (menus latéraux). Hauteur en px. */
export function LogoLockup({ height = 32, tone = "dark" }: { height?: number; tone?: "dark" | "light" }) {
  // Silhouette = image découpée dans la maquette (95 × 108) ; le mot
  // « EasyPhysio » est du vrai texte (Plus Jakarta Sans, --font-brand) pour
  // rester parfaitement net à toutes les tailles (Philippe : « il est un peu
  // flou… il faut que la qualité soit au rendez-vous »).
  const figureH = height;
  const figureW = Math.round((height * 95) / 108);
  return (
    <span className="inline-flex shrink-0 items-center" style={{ gap: Math.round(height * 0.22) }} aria-label="EasyPhysio" role="img">
      {/* eslint-disable-next-line @next/next/no-img-element -- PNG statique */}
      <img src="/brand/easyphysio-figure.png" width={figureW} height={figureH} alt="" />
      <span
        aria-hidden
        className="whitespace-nowrap leading-none tracking-[-0.02em]"
        style={{ fontFamily: "var(--font-brand)", fontSize: Math.round(height * 0.62) }}
      >
        <span className={`font-extrabold ${tone === "light" ? "text-white" : "text-[#0f2a5c]"}`}>Easy</span>
        <span className={`font-medium ${tone === "light" ? "text-white" : "text-[#0f2a5c]"}`}>Physio</span>
      </span>
    </span>
  );
}

export default function Logo({
  wordmark = true,
  size = 32,
  className = "",
}: {
  wordmark?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <Link href="/" aria-label="EasyPhysio — accueil" className={`flex items-center ${className}`}>
      {wordmark ? (
        <LogoLockup height={size} />
      ) : (
        <LogoMark size={size} />
      )}
    </Link>
  );
}
