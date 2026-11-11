import { useReducedMotion } from "framer-motion";

// Drapeau de la scène, dans son propre repère (66 × 44, proportions 3:2 du vrai drapeau) :
// croissant = disque de rayon h/4 moins un disque de rayon h/5 décalé de h/16, étoile de rayon h/8.
const L = 66;
const H = 44;
const ETOILE_X = (490 / 900) * L;
const pointsEtoile = Array.from({ length: 10 }, (_, i) => {
  const rayon = i % 2 === 0 ? H / 8 : (H / 8) * 0.382;
  const angle = Math.PI + (i * Math.PI) / 5;
  return `${(ETOILE_X + rayon * Math.cos(angle)).toFixed(2)},${(H / 2 + rayon * Math.sin(angle)).toFixed(2)}`;
}).join(" ");
// Deux formes d'ondulation (mêmes commandes, pour pouvoir passer de l'une à l'autre).
const VAGUE_A = `M0 0 Q16.5 -5 33 0 T66 0 L66 ${H} Q49.5 ${H + 5} 33 ${H} T0 ${H} Z`;
const VAGUE_B = `M0 0 Q16.5 5 33 0 T66 0 L66 ${H} Q49.5 ${H - 5} 33 ${H} T0 ${H} Z`;

/**
 * Scène animée de la pilule du hero DjazAI : coucher de soleil sur les dunes du Sahara, drapeau de l'Algérie
 * penché qui flotte au bout d'un mât planté dans le soleil, points de données qui scintillent.
 * Dessin original, en SVG (aucune image à charger). Avec « réduire les animations », la scène reste fixe.
 */
export const ScenePilule = () => {
  const reduit = useReducedMotion();
  return (
  <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden focusable="false">
    <defs>
      <linearGradient id="djazai-ciel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0b3d2e" />
        <stop offset="38%" stopColor="#1f6b4a" />
        <stop offset="64%" stopColor="#e8a25a" />
        <stop offset="82%" stopColor="#f6c57f" />
        <stop offset="100%" stopColor="#f9dfae" />
      </linearGradient>
      <radialGradient id="djazai-halo" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#fff4d6" stopOpacity="0.95" />
        <stop offset="45%" stopColor="#ffd28a" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#ffb35c" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="djazai-dune-1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e9b06f" />
        <stop offset="100%" stopColor="#c9813f" />
      </linearGradient>
      <linearGradient id="djazai-dune-2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d8904a" />
        <stop offset="100%" stopColor="#a8622b" />
      </linearGradient>
      <linearGradient id="djazai-dune-3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#b86d32" />
        <stop offset="100%" stopColor="#7a431c" />
      </linearGradient>
      <clipPath id="djazai-vague">
        <path d={VAGUE_A}>
          {!reduit && <animate attributeName="d" dur="1.8s" repeatCount="indefinite" values={`${VAGUE_A};${VAGUE_B};${VAGUE_A}`} calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" />}
        </path>
      </clipPath>
      <mask id="djazai-croissant">
        <rect width={L} height={H} fill="white" />
        <circle cx={L / 2 + H / 16} cy={H / 2} r={H / 5} fill="black" />
      </mask>
      {/* Plis du tissu : bandes claires et sombres qui glissent le long du drapeau. */}
      <linearGradient id="djazai-plis" x1="0" y1="0" x2="1" y2="0" spreadMethod="repeat" gradientUnits="userSpaceOnUse" gradientTransform="scale(33 1)">
        <stop offset="0" stopColor="#000" stopOpacity="0.18" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0.16" />
        <stop offset="1" stopColor="#000" stopOpacity="0.18" />
      </linearGradient>
    </defs>

    <style>{`
      .djazai-defile-lent { animation: djazai-defile 38s linear infinite; }
      .djazai-defile-moyen { animation: djazai-defile 24s linear infinite; }
      .djazai-defile-rapide { animation: djazai-defile 15s linear infinite; }
      .djazai-soleil { animation: djazai-souffle 6s ease-in-out infinite; transform-origin: 200px 132px; transform-box: view-box; }
      .djazai-point { animation: djazai-scintille 3.2s ease-in-out infinite; }
      @keyframes djazai-defile { from { transform: translateX(0); } to { transform: translateX(-400px); } }
      @keyframes djazai-souffle { 0%, 100% { transform: scale(1); opacity: .95; } 50% { transform: scale(1.06); opacity: 1; } }
      @keyframes djazai-scintille { 0%, 100% { opacity: .15; } 50% { opacity: .9; } }
      @media (prefers-reduced-motion: reduce) {
        .djazai-defile-lent, .djazai-defile-moyen, .djazai-defile-rapide, .djazai-soleil, .djazai-point { animation: none; }
      }
    `}</style>

    <rect width="400" height="220" fill="url(#djazai-ciel)" />

    {/* Points de données qui scintillent dans le ciel. */}
    {[
      [38, 30, 0], [82, 52, 0.6], [128, 22, 1.2], [168, 46, 0.3], [214, 18, 1.8], [246, 40, 0.9],
      [352, 30, 1.5], [372, 70, 0.4], [60, 84, 2.1], [112, 74, 1.1], [362, 108, 2.4], [24, 112, 0.8],
    ].map(([x, y, delai]) => (
      <circle key={`${x}-${y}`} className="djazai-point" cx={x} cy={y} r="1.6" fill="#f3fff8" style={{ animationDelay: `${delai}s` }} />
    ))}

    {/* Mât planté dans le soleil (le disque, dessiné après, cache son pied). */}
    <line x1="200" y1="128" x2="214" y2="38" stroke="#3b2a1a" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="214" cy="37" r="2.4" fill="#f6d27a" />

    <g className="djazai-soleil">
      <circle cx="200" cy="132" r="64" fill="url(#djazai-halo)" />
      <circle cx="200" cy="132" r="26" fill="#fff1cf" />
    </g>

    {/* Drapeau penché qui flotte, accroché en haut du mât. */}
    <g transform="translate(214.6 39) rotate(9)">
      <g clipPath="url(#djazai-vague)">
        <rect width={L / 2} height={H + 6} y="-3" fill="#006233" />
        <rect x={L / 2} width={L / 2} height={H + 6} y="-3" fill="#ffffff" />
        <circle cx={L / 2} cy={H / 2} r={H / 4} fill="#d21034" mask="url(#djazai-croissant)" />
        <polygon points={pointsEtoile} fill="#d21034" />
        <rect x="-33" y="-3" width={L + 66} height={H + 6} fill="url(#djazai-plis)">
          {!reduit && <animateTransform attributeName="transform" type="translate" from="0 0" to="33 0" dur="1.8s" repeatCount="indefinite" />}
        </rect>
      </g>
    </g>

    {/* Trois rangées de dunes, chacune deux fois plus large que la vue pour défiler sans couture. */}
    <g className="djazai-defile-lent">
      <path fill="url(#djazai-dune-1)" d="M0 150 C 60 128 110 132 160 146 S 260 126 320 140 S 380 150 400 150 C 460 128 510 132 560 146 S 660 126 720 140 S 780 150 800 150 V220 H0 Z" />
    </g>
    <g className="djazai-defile-moyen">
      <path fill="url(#djazai-dune-2)" d="M0 172 C 40 156 90 150 140 166 S 230 182 280 162 S 360 150 400 172 C 440 156 490 150 540 166 S 630 182 680 162 S 760 150 800 172 V220 H0 Z" />
      <path fill="#f4c98a" opacity="0.35" d="M140 166 C 170 160 200 162 230 172 C 200 168 170 166 140 166 Z M540 166 C 570 160 600 162 630 172 C 600 168 570 166 540 166 Z" />
    </g>
    <g className="djazai-defile-rapide">
      <path fill="url(#djazai-dune-3)" d="M0 196 C 50 180 100 186 150 198 S 250 178 300 190 S 370 204 400 196 C 450 180 500 186 550 198 S 650 178 700 190 S 770 204 800 196 V220 H0 Z" />
    </g>

    {/* Bande verte et blanche en bas, discrète, comme le drapeau. */}
    <rect x="0" y="214" width="200" height="6" fill="#006233" />
    <rect x="200" y="214" width="200" height="6" fill="#ffffff" />
  </svg>
);
};
