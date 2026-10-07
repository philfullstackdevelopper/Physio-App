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
        // Silhouette + « EasyPhysio », même mise en page que la maquette (370 × 115).
        // eslint-disable-next-line @next/next/no-img-element -- PNG statique
        <img src="/brand/easyphysio-logo.png" height={size} width={Math.round((size * 370) / 115)} alt="EasyPhysio" />
      ) : (
        <LogoMark size={size} />
      )}
    </Link>
  );
}
