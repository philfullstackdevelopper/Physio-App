/**
 * Main qui salue, dessinée en SVG pour la carte « Bonjour » de l'accueil
 * patient (Philippe, 2026-10-01 : « jaune, comme les emojis de l'iPhone »).
 * Pas l'emoji 👋 lui-même : son rendu dépend du système (plat sous Windows,
 * différent sur Android) et les dessins d'Apple ne sont pas réutilisables —
 * celui-ci a le même rendu partout. Jaune emoji en dégradé (reflet en haut à
 * gauche, ombre en bas), contour fin, traits de mouvement de la référence.
 * Elle salue une fois à l'arrivée, puis à nouveau au survol de la carte
 * parente (`group`) — jamais si l'utilisateur a demandé moins d'animations.
 */
export default function WavingHand({ className = "" }: { className?: string }) {
  const fill = "url(#waving-hand-fill)";
  const stroke = "#E3A21A";
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="waving-hand-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE680" />
          <stop offset="45%" stopColor="#FFCC33" />
          <stop offset="100%" stopColor="#F5A623" />
        </linearGradient>
      </defs>

      {/* Traits de mouvement — fixes, seule la main bouge. */}
      <g fill="none" stroke="#5BC0C8" strokeWidth={2.5} strokeLinecap="round">
        <path d="M51 3 A16 16 0 0 1 62 16" />
        <path d="M50 10 A9 9 0 0 1 56 17" />
        <path d="M2 46 A16 16 0 0 0 13 60" />
        <path d="M8 46 A9 9 0 0 0 14 54" />
      </g>

      <g className="origin-[34px_58px] motion-safe:animate-[handWave_1.6s_ease-in-out_1] motion-safe:group-hover:animate-[handWaveAgain_1.6s_ease-in-out_1]">
        {/* Réduite et recentrée pour laisser de l'air aux traits de mouvement. */}
        <g transform="translate(8 7) scale(0.78) rotate(-18 34 36)" strokeWidth={2} strokeLinejoin="round">
          {/* Doigts (index, majeur, annulaire, auriculaire) puis pouce. */}
          <rect x="18" y="11" width="9" height="30" rx="4.5" fill={fill} stroke={stroke} />
          <rect x="28" y="7" width="9" height="32" rx="4.5" fill={fill} stroke={stroke} />
          <rect x="38" y="10" width="9" height="30" rx="4.5" fill={fill} stroke={stroke} />
          <rect x="47.5" y="17" width="8" height="24" rx="4" fill={fill} stroke={stroke} />
          <rect x="7" y="30" width="9" height="20" rx="4.5" fill={fill} stroke={stroke} transform="rotate(-38 11.5 40)" />
          {/* Paume par-dessus la base des doigts : remplissage sans contour
              en haut, contour seulement sur les côtés et le bas. */}
          <path d="M17.5 31 H55.5 V45 C55.5 54 48.5 60 39.5 60 H33 C24.5 60 17.5 54 17.5 46 Z" fill={fill} />
          <path
            d="M55.5 32 V45 C55.5 54 48.5 60 39.5 60 H33 C24.5 60 17.5 54 17.5 46 V40"
            fill="none"
            stroke={stroke}
          />
          {/* Reflets : la touche « brillante » des emojis iPhone. */}
          <g fill="#FFFFFF" opacity="0.45" stroke="none">
            <rect x="20.5" y="14" width="3" height="10" rx="1.5" />
            <rect x="30.5" y="10" width="3" height="10" rx="1.5" />
            <rect x="40.5" y="13" width="3" height="9" rx="1.5" />
            <ellipse cx="27" cy="40" rx="5" ry="3" />
          </g>
        </g>
      </g>
    </svg>
  );
}
