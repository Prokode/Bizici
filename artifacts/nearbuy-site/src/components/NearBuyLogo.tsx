type Props = { size?: number };

/**
 * BizIci pin logo (kept under the legacy NearBuyLogo name as an internal
 * identifier — re-exported from existing pages without a refactor).
 */
export function NearBuyLogo({ size = 32 }: Props) {
  const w = size;
  const h = Math.round(size * 1.3);
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 130"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BizIci"
    >
      {/* Navy oval base shadow */}
      <ellipse cx="50" cy="120" rx="18" ry="5" fill="#1B2A5C" />
      {/* Orange teardrop pin */}
      <path
        d="M 50 6 C 26 6 8 24 8 47 C 8 75 50 118 50 118 C 50 118 92 75 92 47 C 92 24 74 6 50 6 Z"
        fill="#F58220"
      />
      {/* White window inside the pin */}
      <path
        d="M 50 16 C 32 16 18 30 18 47 C 18 64 32 78 50 78 C 68 78 82 64 82 47 C 82 30 68 16 50 16 Z"
        fill="#ffffff"
      />
      {/* Green awning + scallops */}
      <path
        d="M 28 31 H 72 V 38 Q 66.5 43 61 38 Q 55.5 43 50 38 Q 44.5 43 39 38 Q 33.5 43 28 38 Z"
        fill="#7FB927"
      />
      {/* Awning vertical stripes */}
      <rect x="33" y="31" width="6" height="7" fill="#8FCB2E" />
      <rect x="44" y="31" width="6" height="7" fill="#8FCB2E" />
      <rect x="55" y="31" width="6" height="7" fill="#8FCB2E" />
      <rect x="66" y="31" width="6" height="7" fill="#8FCB2E" />
      {/* Navy storefront body */}
      <path d="M 30 41 H 70 V 70 H 30 Z" fill="#1B2A5C" />
      {/* Navy door + green window */}
      <rect x="34" y="48" width="13" height="22" rx="1.2" fill="#0E1530" />
      <rect x="36" y="51" width="3" height="4" fill="#7FB927" />
      {/* Green shopping bag with handle */}
      <rect x="52" y="53" width="13" height="15" rx="1.5" fill="#7FB927" />
      <path
        d="M 55 53 Q 55 48 58.5 48 Q 62 48 62 53"
        stroke="#7FB927"
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
      />
      {/* Three sparks */}
      <g stroke="#7FB927" strokeWidth={2.4} strokeLinecap="round">
        <path d="M 14 24 L 6 18" />
        <path d="M 22 12 L 18 4" />
        <path d="M 33 10 L 33 2" />
      </g>
    </svg>
  );
}
